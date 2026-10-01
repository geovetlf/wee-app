#!/usr/bin/env node
/*
 * GUARDIA — el hook PreToolUse del Weë Agent Harness.
 *
 * ── Qué hace ───────────────────────────────────────────────────────────────
 *
 * Antes de cada comando de las herramientas Bash y PowerShell, decide si
 * Claude lo puede ejecutar solo, si hay que preguntar al dueño o si no se
 * ejecuta nunca. Complementa a las reglas de `.claude/settings.json`: esas
 * reglas comparan el texto del comando y no ven las variantes (otro orden de
 * opciones, un `.cmd`, `npx`, `bash -c`, `git -C . push`…). Aquí el comando se
 * parte en palabras de verdad —respetando comillas y heredocs— y se mira qué
 * programa se ejecuta y con qué subcomando. Así un mensaje de commit que
 * MENCIONA `firebase deploy` no se bloquea, y un `firebase --project prod
 * deploy` sí.
 *
 * Niveles (misión del Harness, §8):
 *  · 0–1 (leer, editar, probar, compilar, git local, emuladores demo-*): pasa.
 *  · 2 (push, PR, ajustes del repo): pregunta.
 *  · 3–4 (despliegue, IAM, secretos, borrar en producción, gastar): pregunta o
 *    se deniega. Lo que nunca debe hacer Claude se deniega: desplegar desde el
 *    portátil, borrar recursos de producción, leer valores de secretos,
 *    aprobarse a sí mismo un despliegue, forzar un push.
 *
 * La frontera de verdad es la credencial (Claude sin credenciales de Owner);
 * este hook es la segunda barrera, determinista y barata.
 *
 * Falla ABIERTA ante un error propio: si algo aquí lanza, el comando sigue el
 * flujo normal de permisos (las reglas deny de settings.json siguen activas).
 * Un hook que se rompe no debe dejar la sesión sin herramientas.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ── Partir un comando en órdenes y palabras ────────────────────────────── */

/** Quita los cuerpos de los heredocs (`<<'EOF' … EOF`): son texto, no órdenes. */
export const sinHeredocs = (texto) => {
  const lineas = String(texto).split(/\r?\n/);
  const fuera = [];
  let fin = null;
  for (const l of lineas) {
    if (fin !== null) {
      if (l.trim() === fin) fin = null;
      continue;
    }
    const m = l.match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (m) fin = m[2];
    fuera.push(l);
  }
  return fuera.join('\n');
};

/** Separa en órdenes por `&&`, `||`, `;`, `|` y saltos de línea, fuera de comillas. */
export const ordenes = (texto) => {
  const s = sinHeredocs(texto);
  const res = [];
  let actual = '';
  let comilla = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (comilla) {
      actual += c;
      if (c === '\\' && comilla === '"' && i + 1 < s.length) { actual += s[++i]; continue; }
      if (c === comilla) comilla = null;
      continue;
    }
    if (c === '"' || c === "'") { comilla = c; actual += c; continue; }
    const dos = s.slice(i, i + 2);
    if (dos === '&&' || dos === '||') { res.push(actual); actual = ''; i++; continue; }
    if (c === ';' || c === '|' || c === '\n') { res.push(actual); actual = ''; continue; }
    actual += c;
  }
  res.push(actual);
  return res.map((o) => o.trim()).filter(Boolean);
};

/** Palabras de una orden, quitando comillas (una palabra entre comillas sigue siendo UNA palabra). */
export const palabras = (orden) => {
  const res = [];
  let actual = '';
  let hay = false;
  let comilla = null;
  for (let i = 0; i < orden.length; i++) {
    const c = orden[i];
    if (comilla) {
      if (c === '\\' && comilla === '"' && i + 1 < orden.length && /["\\$`]/.test(orden[i + 1])) { actual += orden[++i]; continue; }
      if (c === comilla) { comilla = null; continue; }
      actual += c;
      continue;
    }
    if (c === '"' || c === "'") { comilla = c; hay = true; continue; }
    if (/\s/.test(c)) { if (hay) { res.push(actual); actual = ''; hay = false; } continue; }
    actual += c;
    hay = true;
  }
  if (hay) res.push(actual);
  return res;
};

/** Nombre del programa sin ruta ni extensión, en minúsculas: `C:\…\firebase.cmd` → `firebase`. */
export const programa = (p) => path.basename(String(p).replace(/\\/g, '/')).toLowerCase().replace(/\.(cmd|exe|bat|ps1|js|mjs|cjs|py)$/, '');

const ENVOLTORIOS = new Set(['timeout', 'time', 'nice', 'nohup', 'stdbuf', 'command', 'builtin', 'noglob', 'exec', 'call', '&']);

/** Quita asignaciones iniciales (`A=b`), envoltorios (`timeout 30`, `&`) y resuelve `npx`/`node` hasta el programa real. */
export const desenvolver = (ps) => {
  let w = [...ps];
  for (let vueltas = 0; vueltas < 8 && w.length; vueltas++) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) { w = w.slice(1); continue; }
    const p = programa(w[0]);
    if (ENVOLTORIOS.has(p) || w[0] === '&') {
      w = w.slice(1);
      while (w.length && /^(-|\d+[smhd]?$)/.test(w[0])) w = w.slice(1);
      continue;
    }
    if (p === 'npx' || p === 'pnpx' || p === 'bunx') {
      w = w.slice(1);
      while (w.length && w[0].startsWith('-')) w = w.slice(w[0] === '-p' || w[0] === '--package' ? 2 : 1);
      if (w.length && /^firebase-tools(@.*)?$/.test(w[0])) w = ['firebase', ...w.slice(1)];
      continue;
    }
    if (p === 'node' && w.length > 1 && /firebase-tools[\\/].*firebase\.js$|[\\/]bin[\\/]firebase(\.js)?$/i.test(w[1])) { w = ['firebase', ...w.slice(2)]; continue; }
    if (p === 'python' || p === 'python3' || p === 'py') {
      if (w.length > 1 && /gcloud\.py$/i.test(w[1])) { w = ['gcloud', ...w.slice(2)]; continue; }
    }
    break;
  }
  return w;
};

/* ── Firmas ─────────────────────────────────────────────────────────────── */

const ARCHIVOS_SECRETOS = [
  '.env.local', '.secret.local', '.env.get-wee', '.env.prod', 'application_default_credentials',
  'configstore/firebase-tools.json', 'firebase-tools.json', 'wee-claves-retiradas', 'gha-creds-',
];
const FIREBASE_NUNCA = new Set(['deploy', 'functions:delete', 'functions:secrets:set', 'functions:secrets:destroy',
  'functions:secrets:prune', 'hosting:disable', 'hosting:channel:delete', 'firestore:delete', 'firestore:databases:delete',
  'database:remove', 'database:set', 'database:update', 'database:push', 'auth:import', 'login', 'login:add', 'login:use',
  'apphosting:backends:delete', 'remoteconfig:rollback', 'ext:uninstall', 'ext:install', 'ext:update']);
const FIREBASE_PREGUNTA = new Set(['use', 'apps:create', 'projects:create', 'projects:addfirebase', 'functions:config:set',
  'functions:config:unset', 'hosting:clone', 'hosting:sites:create', 'hosting:sites:delete', 'logout', 'init']);
const GCLOUD_NUNCA = new Set(['delete', 'destroy', 'deploy', 'purge', 'rm']);
const GCLOUD_IAM = new Set(['set-iam-policy', 'add-iam-policy-binding', 'remove-iam-policy-binding']);
const GCLOUD_CAMBIA = new Set(['create', 'update', 'patch', 'enable', 'disable', 'add', 'import', 'restore', 'rollback',
  'cancel', 'set', 'unset', 'start', 'stop', 'reset', 'resume', 'pause', 'run', 'execute', 'migrate', 'move', 'undelete',
  'set-traffic', 'update-traffic', 'add-version', 'deploy-revision', 'activate-service-account', 'revoke', 'submit',
  'cp', 'mv', 'rsync']);
const GCLOUD_PISTAS = new Set(['alpha', 'beta', 'preview']);
const GSUTIL_NUNCA = new Set(['rm', 'rb']);
const GSUTIL_CAMBIA = new Set(['cp', 'mv', 'rsync', 'acl', 'defacl', 'iam', 'setmeta', 'lifecycle', 'retention', 'mb',
  'versioning', 'cors', 'web']);
const VERCEL_LEE = new Set(['ls', 'list', 'inspect', 'logs', 'whoami', 'help']);
const VERCEL_LOCAL = new Set(['link', 'build', 'dev', 'init']);
const EAS_LEE = new Set(['whoami', 'config', 'diagnostics', 'help', 'build:inspect']);
const GH_SENSIBLE = /pending_deployments|\/rulesets|\/environments|\/protection|\/actions\/(secrets|variables|permissions)|\/hooks|\/keys|\/collaborators|\/dependabot|secret-scanning|vulnerability-alerts|automated-security-fixes|\/branches\/[^/]+\/protection|\/actions\/oidc/;

/* Buscadores: su PATRÓN es texto, no un archivo. `grep -n "\.env.local" README.md` busca en README.md. */
const BUSCADORES = new Set(['grep', 'egrep', 'fgrep', 'rg', 'select-string', 'sls']);
/** Opciones que llevan un valor detrás (ese valor no es el patrón: se queda y se mira). */
const CON_VALOR = /^(-[ABCmdDgtTjM]|--(include|exclude|exclude-dir|glob|type|type-not|max-count|context|after-context|before-context|max-depth)|-(path|literalpath|include|exclude|encoding|context))$/i;

/** Las palabras de una orden sin el patrón de un buscador. Si el patrón se lee de un archivo (`-f`), no se quita nada. */
export const sinPatron = (p, w) => {
  const esGitGrep = p === 'git' && (w[1] || '').toLowerCase() === 'grep';
  if (!BUSCADORES.has(p) && !esGitGrep) return w;
  const desde = esGitGrep ? 2 : 1;
  if (w.slice(desde).some((x) => /^(-f|--file(=.*)?)$/.test(x) || /^-f\S/.test(x))) return w;
  const fuera = new Set();
  let hayPatron = false;
  for (let i = desde; i < w.length; i++) {
    const x = w[i];
    if (/^(-e|--regexp|-pattern)$/i.test(x)) { fuera.add(i + 1); i++; hayPatron = true; continue; }
    if (/^--regexp=/.test(x) || /^-e\S/.test(x)) { fuera.add(i); hayPatron = true; continue; }
    if (CON_VALOR.test(x)) { i++; continue; }
    if (x.startsWith('-')) continue;
    if (!hayPatron) { fuera.add(i); hayPatron = true; }
  }
  return w.filter((_, i) => !fuera.has(i));
};

const decision = (d, motivo) => ({ decision: d, motivo });
const PASA = { decision: null, motivo: '' };

/** Analiza UNA orden ya partida en palabras. */
const analizarOrden = (herramienta, crudo, w0, profundidad) => {
  const w = desenvolver(w0);
  if (!w.length) return PASA;
  const p = programa(w[0]);
  const resto = w.slice(1);
  const sinOpciones = resto.filter((x) => !x.startsWith('-'));

  /* Intérpretes con un comando dentro: se analiza lo de dentro. */
  if (profundidad < 3) {
    const dentroDe = (i) => (i >= 0 && i + 1 < w.length ? w[i + 1] : null);
    let interior = null;
    if (['bash', 'sh', 'zsh', 'dash'].includes(p)) interior = dentroDe(w.indexOf('-c'));
    else if (p === 'cmd') interior = w.slice(w.findIndex((x) => /^\/[ck]$/i.test(x)) + 1).join(' ') || null;
    else if (p === 'powershell' || p === 'pwsh') {
      const i = w.findIndex((x) => /^-(c|command)$/i.test(x));
      interior = i >= 0 ? w.slice(i + 1).join(' ') : null;
    } else if (p === 'wsl') interior = w.slice(1).join(' ');
    if (interior) return analizarTexto(herramienta, interior, profundidad + 1);
  }

  /* Archivos de secretos y credenciales: nunca se leen ni se tocan desde un comando (el patrón de un buscador no cuenta). */
  const todo = sinPatron(p, w).join(' ').replace(/\\/g, '/').toLowerCase();
  const secreto = ARCHIVOS_SECRETOS.find((a) => todo.includes(a));
  if (secreto) return decision('deny', `El comando toca ${secreto}: los secretos y credenciales no se leen ni se mueven desde Claude (docs/SECURITY.md).`);
  if (p === 'gh' && resto[0] === 'auth' && resto[1] === 'token') return decision('deny', '`gh auth token` imprime el token de GitHub.');
  if (/print-access-token|print-identity-token/.test(todo)) return decision('ask', 'Imprimir un token de acceso de Google necesita el visto bueno del dueño.');

  /* Firebase CLI. */
  if (p === 'firebase') {
    const nunca = sinOpciones.find((x) => FIREBASE_NUNCA.has(x.toLowerCase()));
    if (nunca) return decision('deny', `\`firebase ${nunca}\` no se ejecuta desde el portátil: producción solo cambia por el workflow de despliegue (docs/DEPLOYMENT.md).`);
    const pregunta = sinOpciones.find((x) => FIREBASE_PREGUNTA.has(x.toLowerCase()));
    if (pregunta) return decision('ask', `\`firebase ${pregunta}\` cambia configuración del proyecto o de la CLI: lo aprueba el dueño.`);
    if (sinOpciones[0] && /^emulators:/.test(sinOpciones[0])) {
      const i = resto.findIndex((x) => x === '--project' || x === '-P');
      const proy = i >= 0 ? resto[i + 1] : null;
      if (!proy || !/^demo-/.test(proy)) return decision('ask', 'Los emuladores se arrancan con un proyecto demo-* (npm run functions:emulator); otro proyecto podría tocar datos reales.');
    }
    return PASA;
  }

  /* gcloud. */
  if (p === 'gcloud') {
    const todos = sinOpciones.map((x) => x.toLowerCase());
    /* La primera palabra (tras alpha/beta) es el PRODUCTO, no el verbo: `gcloud run services list` solo lee. */
    const grupo = GCLOUD_PISTAS.has(todos[0]) ? todos.slice(1) : todos;
    const verbos = grupo.slice(1);
    if (todos.includes('versions') && todos.includes('access')) return decision('deny', 'Leer el VALOR de un secreto (`secrets versions access`) no lo hace Claude.');
    if (grupo[0] === 'auth' && ['login', 'application-default'].includes(verbos[0])) return decision('deny', 'Claude no inicia sesión en Google Cloud: usa su identidad de solo lectura.');
    const nunca = verbos.find((x) => GCLOUD_NUNCA.has(x));
    if (nunca) return decision('deny', `\`gcloud … ${nunca}\` borra o despliega en Google Cloud: no se hace desde Claude.`);
    const iam = verbos.find((x) => GCLOUD_IAM.has(x));
    if (iam) return decision('ask', `\`gcloud … ${iam}\` cambia permisos (IAM): necesita la aprobación del dueño.`);
    if (grupo[0] === 'config' && verbos[0] === 'set') return decision('ask', 'Cambiar la configuración de gcloud (proyecto o cuenta activos) lo aprueba el dueño.');
    const cambia = verbos.find((x) => GCLOUD_CAMBIA.has(x));
    if (cambia) return decision('ask', `\`gcloud … ${cambia}\` cambia algo en Google Cloud: necesita la aprobación del dueño.`);
    return PASA;
  }

  /* gsutil (Cloud Storage): borrar objetos o buckets no lo hace Claude; escribir o cambiar permisos, con el dueño. */
  if (p === 'gsutil') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (GSUTIL_NUNCA.has(sub)) return decision('deny', `\`gsutil ${sub}\` borra datos de Cloud Storage: no se hace desde Claude.`);
    if (GSUTIL_CAMBIA.has(sub)) return decision('ask', `\`gsutil ${sub}\` escribe o cambia permisos en Cloud Storage: lo aprueba el dueño.`);
    return PASA;
  }

  /* Vercel CLI: cualquier primer argumento que no sea un subcomando de lectura DESPLIEGA (`vercel`, `vercel ./dist`,
     `vercel --prod`), así que aquí se invierte la lógica: pasa lo que solo lee, se pregunta lo local, y el resto se
     deniega. La web de producción se publica por la integración de Git, nunca desde el portátil. */
  if (p === 'vercel') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (VERCEL_LEE.has(sub) || (!sub && resto.some((x) => /^(--version|-v|--help|-h)$/.test(x)))) return PASA;
    if (VERCEL_LOCAL.has(sub)) return decision('ask', `\`vercel ${sub}\` enlaza o construye contra el proyecto de Vercel: lo aprueba el dueño.`);
    return decision('deny', `\`vercel ${sub || '(sin subcomando)'}\` despliega o cambia el proyecto de Vercel: la web se publica por la integración de Git, no desde Claude.`);
  }

  /* EAS (Expo): publicar en las tiendas o a los teléfonos no lo hace Claude; compilar o tocar credenciales, con el dueño. */
  if (p === 'eas' || p === 'eas-cli') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (!sub || EAS_LEE.has(sub) || /:(list|view)$/.test(sub)) return PASA;
    if (sub === 'submit' || sub === 'update' || /^update:/.test(sub) || ['login', 'logout'].includes(sub) || /:delete$/.test(sub)) {
      return decision('deny', `\`eas ${sub}\` publica a las tiendas o a los teléfonos, borra o inicia sesión en Expo: no se hace desde Claude.`);
    }
    return decision('ask', `\`eas ${sub}\` usa la cuenta de Expo (compilaciones, credenciales, variables): lo aprueba el dueño.`);
  }

  /* GitHub CLI. */
  if (p === 'gh') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    const acc = (sinOpciones[1] || '').toLowerCase();
    if (sub === 'api') {
      const i = resto.findIndex((x) => x === '-X' || x === '--method');
      const metodo = i >= 0 ? String(resto[i + 1] || '').toUpperCase() : (resto.some((x) => /^(-f|-F|--field|--raw-field|--input)$/.test(x)) ? 'POST' : 'GET');
      const ruta = sinOpciones.slice(1).find((x) => x.includes('/')) || '';
      if (metodo !== 'GET' && /pending_deployments/.test(ruta)) return decision('deny', 'Aprobar un despliegue pendiente es del dueño, nunca de Claude.');
      if (metodo !== 'GET' && GH_SENSIBLE.test(ruta)) return decision('ask', `\`gh api ${metodo} ${ruta}\` cambia ajustes de seguridad del repositorio: lo aprueba el dueño.`);
      if (metodo !== 'GET') return decision('ask', `\`gh api ${metodo}\` escribe en GitHub: lo aprueba el dueño.`);
      return PASA;
    }
    if (sub === 'repo' && ['delete', 'archive'].includes(acc)) return decision('deny', `\`gh repo ${acc}\` no lo hace Claude.`);
    if ((sub === 'repo' && ['edit', 'rename'].includes(acc)) || ['secret', 'variable'].includes(sub)
      || (sub === 'release' && ['create', 'delete', 'edit', 'upload'].includes(acc))
      || (sub === 'workflow' && ['run', 'enable', 'disable'].includes(acc))
      || (sub === 'pr' && acc === 'merge') || (sub === 'auth' && ['login', 'logout', 'refresh', 'setup-git'].includes(acc))
      || (sub === 'ruleset' && !['list', 'view', 'check'].includes(acc))) {
      return decision('ask', `\`gh ${sub} ${acc}\` cambia el repositorio o sus ajustes: lo aprueba el dueño.`);
    }
    return PASA;
  }

  /* git. */
  if (p === 'git') {
    let i = 0;
    while (i < resto.length && resto[i].startsWith('-')) i += (['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(resto[i]) ? 2 : 1);
    const sub = (resto[i] || '').toLowerCase();
    const args = resto.slice(i + 1);
    if (sub === 'push') {
      if (args.some((x) => /^(-f|--force|--force-with-lease.*|--force-if-includes|--mirror|--delete|-d|--prune)$/.test(x))
        || args.some((x) => /^\+/.test(x) || /^:/.test(x))) {
        return decision('deny', 'Un push forzado o que borra ramas remotas no lo hace Claude: se pierde historia.');
      }
      return decision('ask', 'Subir a GitHub publica el código (el repo es público) y puede disparar despliegues: lo aprueba el dueño.');
    }
    if ((sub === 'reset' && args.includes('--hard')) || (sub === 'clean' && args.some((x) => /^-[a-z]*f/i.test(x)))
      || (sub === 'branch' && args.some((x) => /^(-d|-D|--delete)$/.test(x))) || (sub === 'tag' && args.some((x) => /^(-d|--delete)$/.test(x)))
      || (sub === 'worktree' && ['remove', 'prune'].includes((args[0] || '').toLowerCase()))
      || (sub === 'stash' && ['drop', 'clear'].includes((args[0] || '').toLowerCase()))
      || (sub === 'update-ref' && args.includes('-d')) || (sub === 'reflog' && (args[0] || '') === 'expire')
      || (sub === 'gc' && args.some((x) => /^--prune/.test(x))) || sub === 'filter-branch' || sub === 'filter-repo') {
      return decision('ask', `\`git ${sub}\` puede borrar trabajo: no se pierde nada local sin el visto bueno del dueño.`);
    }
    return PASA;
  }

  /* npm: los scripts de despliegue del portátil. */
  if (p === 'npm' || p === 'pnpm' || p === 'yarn') {
    const i = resto.findIndex((x) => x === 'run' || x === 'run-script');
    const script = i >= 0 ? (resto[i + 1] || '') : (p === 'yarn' ? (sinOpciones[0] || '') : '');
    if (/deploy/i.test(script)) return decision('deny', `\`${p} run ${script}\` despliega desde el portátil: producción solo cambia por el workflow (docs/DEPLOYMENT.md).`);
    return PASA;
  }

  /* Scripts propios que escriben en producción: llevan banderas explícitas. */
  if (w.some((x) => x === '--ejecutar' || x === '--confirmo-autorizacion')) {
    return decision('ask', 'El script escribe en producción (bandera --ejecutar/--confirmo-autorizacion): lo aprueba el dueño.');
  }

  /* node -e / un script que lanza firebase deploy por dentro. */
  if (p === 'node') {
    const e = resto.findIndex((x) => x === '-e' || x === '--eval' || x === '-p' || x === '--print');
    const codigo = e >= 0 ? String(resto[e + 1] || '') : '';
    const archivo = e < 0 ? resto.find((x) => !x.startsWith('-')) : null;
    let fuente = codigo;
    if (archivo) {
      try {
        const abs = path.resolve(process.cwd(), archivo);
        if (existsSync(abs) && statSync(abs).isFile() && statSync(abs).size < 400_000) fuente = readFileSync(abs, 'utf8');
      } catch { /* sin archivo legible: nada que mirar */ }
    }
    if (/(spawn|exec)(Sync|File)?\s*\([\s\S]{0,240}firebase[\s\S]{0,240}['"`]deploy['"`]/.test(fuente)) {
      return decision('ask', 'El script lanza `firebase deploy` por dentro: lo aprueba el dueño.');
    }
    return PASA;
  }
  return PASA;
};

/** Analiza el texto completo de un comando de Bash o de PowerShell. */
export const analizarTexto = (herramienta, texto, profundidad = 0) => {
  /* La trampa de PowerShell 5.1 con los .cmd: un argumento entre comillas con > < | & vuelve a pasar por cmd.exe
     y se convierte en una redirección (así aparecieron ERROR y WARNING en la raíz del repo, dos veces). */
  if (herramienta === 'PowerShell' && /\.cmd\b/i.test(texto) && !/--%/.test(texto)
    && /"[^"]*[<>|&][^"]*"|'[^']*[<>|&][^']*'/.test(texto)) {
    return decision('deny', 'Un argumento con > < | & pasado a un .cmd desde PowerShell lo reinterpreta cmd.exe (crea archivos o rompe el comando). Usa --% o la herramienta Bash.');
  }
  let peor = PASA;
  for (const o of ordenes(texto)) {
    const r = analizarOrden(herramienta, o, palabras(o), profundidad);
    if (r.decision === 'deny') return r;
    if (r.decision === 'ask' && !peor.decision) peor = r;
  }
  return peor;
};

/* ── Hook ───────────────────────────────────────────────────────────────── */

const principal = async () => {
  let entrada = '';
  for await (const trozo of process.stdin) entrada += trozo;
  const datos = JSON.parse(entrada || '{}');
  const herramienta = datos.tool_name;
  const comando = datos.tool_input && datos.tool_input.command;
  if (!['Bash', 'PowerShell'].includes(herramienta) || typeof comando !== 'string') return;
  const r = analizarTexto(herramienta, comando);
  if (!r.decision) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: r.decision, permissionDecisionReason: `Weë Harness: ${r.motivo}` },
  }));
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().then(() => process.exit(0), (e) => {
    process.stderr.write(`guardia: error interno, el comando sigue el flujo normal de permisos (${e && e.message})\n`);
    process.exit(0);
  });
}

export const __dir = path.dirname(fileURLToPath(import.meta.url));
