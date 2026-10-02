#!/usr/bin/env node
/*
 * GUARDIA — el hook PreToolUse del Weë Agent Harness.
 *
 * ── Qué hace ───────────────────────────────────────────────────────────────
 *
 * Antes de cada comando de las herramientas Bash, PowerShell y Monitor, decide
 * si Claude lo puede ejecutar solo, si hay que preguntar al dueño o si no se
 * ejecuta nunca. Complementa a las reglas de `.claude/settings.json`: esas
 * reglas comparan el texto del comando y no ven las variantes (otro orden de
 * opciones, un `.cmd`, `npx`, `bash -c`, un subshell `(…)`, un `eval`, un
 * `node -e`, un `powershell -EncodedCommand`…). Aquí el comando se analiza de
 * forma ESTRUCTURAL: un tokenizador de shell POSIX (y otro para PowerShell)
 * parte el texto en órdenes simples a cualquier profundidad —respetando
 * comillas, escapes, `$( )`, backticks, `<( )`, subshells `( )`, grupos `{ }`,
 * palabras clave `if/then/for/while/…`, separadores y heredocs— y desenvuelve
 * los lanzadores e intérpretes (npx, env, timeout, xargs, find -exec, bash -c,
 * eval, node -e, python -c, Invoke-Expression, Start-Process, cmd /c…) para
 * mirar qué programa se ejecuta de verdad y con qué subcomando. Así un mensaje
 * de commit que MENCIONA `firebase deploy` no se bloquea, y un `(firebase
 * --project prod deploy)` metido en un subshell sí.
 *
 * Niveles (misión del Harness, §8):
 *  · 0–1 (leer, editar, probar, compilar, git local, emuladores demo-*): pasa.
 *  · 2 (push, PR, ajustes del repo, leer datos de personas): pregunta.
 *  · 3–4 (despliegue, IAM, secretos, borrar en producción, gastar): pregunta o
 *    se deniega. Lo que nunca debe hacer Claude se deniega: desplegar desde el
 *    portátil, borrar recursos de producción, leer VALORES de secretos o
 *    tokens, aprobarse a sí mismo un despliegue, forzar un push.
 *
 * La frontera de verdad es la credencial (Claude sin credenciales de Owner);
 * este hook es la segunda barrera, determinista y barata.
 *
 * ── Falla CERRADA ──────────────────────────────────────────────────────────
 *
 * Si algo aquí lanza (un comando retorcido que el analizador no entiende, una
 * entrada ilegible, un anidamiento desmedido con palabras sensibles), el hook
 * NO deja pasar: responde `deny` por el mismo canal y sale con código 2, que
 * Claude Code trata como bloqueo. Un anidamiento o un tamaño excesivos sin
 * ninguna palabra sensible sí pasan (no bloquear lo inocuo). El único límite
 * que no cubre: si `node` no arranca, el hook no corre y no decide nada; por
 * eso las reglas `permissions.deny` de settings.json son la segunda capa.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ── Límites (todo lineal y acotado) ───────────────────────────────────── */
const LIM_PROF = 30;          // profundidad de desenvolvimiento/anidación
const LIM_TAM = 200_000;      // tamaño de texto que se analiza de una vez
const LIM_CMDS = 6000;        // nº de órdenes simples extraídas

/* Palabras sensibles: solo con una de estas en el texto se bloquea lo que el
   analizador no puede resolver del todo (dinámico o fuera de límites). */
const SENSIBLE_TXT = (t) =>
  /(?:^|[^a-z])(deploy|secrets?|tokens?|credentials?|delete|destroy|purge)(?:[^a-z]|$)|--force/i.test(String(t));

/* ── Heredocs ───────────────────────────────────────────────────────────── */

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

/* ── Helpers heredados (los usan las pruebas del analizador) ─────────────── */

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

/* ── Tokenizador estructural ─────────────────────────────────────────────── */

/** Índice del carácter `close` que equilibra el que ya abrió (i apunta tras el delimitador de apertura). */
const capturar = (s, i, open, close, ps) => {
  let depth = 1;
  let q = null;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (q === '"' && ((ps && c === '`') || (!ps && c === '\\'))) { i += 2; continue; }
      if (c === q) q = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"') { q = c; i++; continue; }
    if (!ps && c === '\\') { i += 2; continue; }
    if (ps && c === '`') { i += 2; continue; }
    if (open !== close && c === open) { depth++; i++; continue; }
    if (c === close) { depth--; if (depth === 0) return i; i++; continue; }
    i++;
  }
  return i;
};

/** Backtick de bash (sustitución de orden), sin anidación. Devuelve el índice del backtick de cierre. */
const capturarBacktick = (s, i) => {
  while (i < s.length) {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === '`') return i;
    i++;
  }
  return i;
};

const PALABRA_CLAVE = new Set(['if', 'then', 'elif', 'else', 'fi', 'for', 'while', 'until', 'do', 'done',
  'case', 'esac', 'select', 'function', 'in', 'time', '!', '{', '}', '[[', '[']);

/**
 * Extrae TODAS las órdenes simples de un texto, a cualquier profundidad.
 * `salida` recibe una lista de "tuberías"; cada tubería es una lista de etapas
 * `{ palabras, dinamica, crudo }`. Las órdenes dentro de subshells, grupos y
 * sustituciones (`$( )`, backticks, `<( )`) se añaden como tuberías propias.
 */
const errorLimite = (msg) => { const e = new RangeError(msg); e.limite = true; return e; };

const trocear = (herr, texto, salida, prof) => {
  if (prof > LIM_PROF) throw errorLimite('anidamiento excesivo');
  const ps = herr === 'PowerShell';
  const s = texto;
  const n = s.length;
  let i = 0;
  let tuberia = [];
  let pals = [];
  let pal = '';
  let hayPal = false;
  let dinPal = false;
  let dinEtapa = false;
  let crudoIni = 0;

  const finPal = () => {
    if (hayPal) { pals.push(pal); if (dinPal) dinEtapa = true; }
    pal = ''; hayPal = false; dinPal = false;
  };
  const finEtapa = (fin) => {
    finPal();
    if (pals.length) tuberia.push({ palabras: pals, dinamica: dinEtapa, crudo: s.slice(crudoIni, fin).trim() });
    pals = []; dinEtapa = false;
  };
  const finTuberia = (fin) => {
    finEtapa(fin);
    if (tuberia.length) salida.push(tuberia);
    tuberia = [];
  };
  const add = (t) => { if (t) { pal += t; hayPal = true; } };
  const marcaDin = () => { dinPal = true; hayPal = true; };

  /* Interior de unas comillas dobles: texto literal, pero `$var`/`$( )`/backtick expanden. */
  const dobles = () => {
    i++; // tras la "
    hayPal = true;
    while (i < n) {
      const c = s[i];
      if (c === '"') { i++; return; }
      if (ps && c === '`') { add(s[i + 1] || ''); i += 2; continue; }
      if (!ps && c === '\\') { add(s[i + 1] || ''); i += 2; continue; }
      if (c === '$' && s[i + 1] === '(') { marcaDin(); const j = capturar(s, i + 2, '(', ')', ps); trocear(herr, s.slice(i + 2, j), salida, prof + 1); add('$()'); i = j + 1; continue; }
      if (c === '$') { marcaDin(); add('$'); i++; while (i < n && /[A-Za-z0-9_{}:.]/.test(s[i])) { add(s[i]); i++; } continue; }
      if (!ps && c === '`') { marcaDin(); const j = capturarBacktick(s, i + 1); trocear(herr, s.slice(i + 1, j), salida, prof + 1); add('``'); i = j + 1; continue; }
      add(c); i++;
    }
  };

  while (i < n) {
    const c = s[i];
    const dos = s.slice(i, i + 2);

    /* Comentario (al inicio de palabra). */
    if (c === '#' && !hayPal && (i === 0 || /\s/.test(s[i - 1]))) { while (i < n && s[i] !== '\n') i++; continue; }

    if (c === '\n') { finTuberia(i); crudoIni = i + 1; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { finPal(); i++; continue; }

    if (c === "'") { hayPal = true; const j = capturar(s, i + 1, "'", "'", false); add(s.slice(i + 1, j)); i = j + 1; continue; }
    if (c === '"') { dobles(); continue; }

    if (!ps && c === '\\') { if (i + 1 < n) { add(s[i + 1]); i += 2; } else i++; continue; }
    if (ps && c === '`') { if (i + 1 < n) { add(s[i + 1]); i += 2; } else i++; continue; }

    /* Separadores. */
    if (dos === '&&' || dos === '||') { finTuberia(i); crudoIni = i + 2; i += 2; continue; }
    if (dos === '|&') { finEtapa(i); crudoIni = i + 2; i += 2; continue; }
    if (c === '|') { finEtapa(i); crudoIni = i + 1; i++; continue; }
    if (c === ';') { finTuberia(i); crudoIni = i + 1; i++; continue; }
    if (c === '&') { finTuberia(i); crudoIni = i + 1; i++; continue; }
    /* `)` suelto = terminador de patrón en `case … in patrón) orden ;;`: separa la orden del patrón. */
    if (c === ')') { finTuberia(i); crudoIni = i + 1; i++; continue; }

    /* Sustituciones y grupos (bajan a `salida` como tuberías propias). */
    if (c === '$' && s[i + 1] === '(') { marcaDin(); const j = capturar(s, i + 2, '(', ')', ps); trocear(herr, s.slice(i + 2, j), salida, prof + 1); add('$()'); i = j + 1; continue; }
    if (ps && c === '@' && s[i + 1] === '(') { const j = capturar(s, i + 2, '(', ')', ps); trocear(herr, s.slice(i + 2, j), salida, prof + 1); i = j + 1; continue; }
    if ((c === '<' || c === '>') && s[i + 1] === '(') { const j = capturar(s, i + 2, '(', ')', ps); trocear(herr, s.slice(i + 2, j), salida, prof + 1); add(c + '()'); i = j + 1; continue; }
    if (!ps && c === '`') { marcaDin(); const j = capturarBacktick(s, i + 1); trocear(herr, s.slice(i + 1, j), salida, prof + 1); add('``'); i = j + 1; continue; }

    if (c === '(') { finEtapa(i); const j = capturar(s, i + 1, '(', ')', ps); trocear(herr, s.slice(i + 1, j), salida, prof + 1); crudoIni = j + 1; i = j + 1; continue; }
    if (c === '{' && /\s|\n|$/.test(s[i + 1] || '\n') && !hayPal) { finEtapa(i); const j = capturar(s, i + 1, '{', '}', ps); trocear(herr, s.slice(i + 1, j), salida, prof + 1); crudoIni = j + 1; i = j + 1; continue; }

    /* Variable fuera de comillas. */
    if (c === '$') { marcaDin(); add('$'); i++; if (s[i] === '{') { const j = capturar(s, i + 1, '{', '}', ps); add('{' + s.slice(i + 1, j) + '}'); i = j + 1; } else { while (i < n && /[A-Za-z0-9_:.]/.test(s[i])) { add(s[i]); i++; } } continue; }

    /* Redirecciones: el operador se descarta (queda en `crudo` para el detector de escrituras). */
    if (c === '>' || c === '<') { finPal(); i++; if (s[i] === '>') i++; if (s[i] === '&') i++; continue; }

    add(c); i++;
  }
  finTuberia(n);
  if (salida.length > LIM_CMDS) throw errorLimite('demasiadas órdenes');
};

/* ── Programa real y desenvolvimiento ───────────────────────────────────── */

/** Nombre del programa sin ruta ni extensión, en minúsculas: `C:\…\firebase.cmd` → `firebase`. */
export const programa = (p) => path.basename(String(p).replace(/\\/g, '/')).toLowerCase().replace(/\.(cmd|exe|bat|ps1|js|mjs|cjs|py)$/, '');

const ENVOLTORIOS = new Set(['timeout', 'time', 'nice', 'nohup', 'stdbuf', 'command', 'builtin', 'noglob',
  'exec', 'call', 'setsid', 'ionice', 'chrt', 'sudo', 'doas', '&', '.']);
const OPC_CON_VALOR_ENV = new Set(['-u', '-C', '-S', '--unset', '--chdir']);
const OPC_CON_VALOR_XARGS = new Set(['-I', '-i', '-n', '-P', '-L', '-d', '-E', '-s', '-a',
  '--max-args', '--max-procs', '--max-lines', '--replace', '--delimiter', '--arg-file']);

/** ¿La palabra es dinámica (trae `$`, `$( )` o backtick sin resolver)? */
const dinamica = (w) => /\$|`/.test(String(w));

/**
 * Quita asignaciones iniciales, envoltorios (`timeout 30`, `env X=1`, `xargs`, `sudo`…),
 * palabras clave sueltas y resuelve `npx`/`node …firebase.js` hasta el programa real.
 * Devuelve `{ w, dinamica }` (dinámica = sus argumentos vienen de fuera, p. ej. de `xargs`).
 */
export const desenvolver = (ps0) => {
  let w = [...ps0];
  let din = false;
  for (let vueltas = 0; vueltas < LIM_PROF && w.length; vueltas++) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) { w = w.slice(1); continue; }
    const p = programa(w[0]);
    if (PALABRA_CLAVE.has(w[0]) || PALABRA_CLAVE.has(p)) { w = w.slice(1); continue; }
    if (ENVOLTORIOS.has(p) || w[0] === '&' || w[0] === '.') {
      w = w.slice(1);
      while (w.length && (/^-/.test(w[0]) || /^\d+[smhd]?$/i.test(w[0]) || /^(sig)?[a-z]+$/i.test(w[0]) && /^(timeout|time)$/.test(p) && /^(sig)?(kill|term|int|hup|quit|stop|cont|usr1|usr2|9|15)$/i.test(w[0]))) {
        w = w.slice(1);
      }
      continue;
    }
    if (p === 'env') {
      w = w.slice(1);
      while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || /^-/.test(w[0]))) {
        const opc = w[0];
        w = w.slice(1);
        if (OPC_CON_VALOR_ENV.has(opc) && w.length) w = w.slice(1);
      }
      continue;
    }
    if (p === 'xargs') {
      w = w.slice(1);
      while (w.length && /^-/.test(w[0])) {
        const opc = w[0].split('=')[0];
        const juntos = /^-[IiNPLdEsa]\S/.test(w[0]) || w[0].includes('=');
        w = w.slice(1);
        if (!juntos && OPC_CON_VALOR_XARGS.has(opc) && w.length) w = w.slice(1);
      }
      din = true; // los argumentos reales entran por la entrada estándar
      continue;
    }
    if (p === 'npx' || p === 'pnpx' || p === 'bunx') {
      w = w.slice(1);
      while (w.length && w[0].startsWith('-')) w = w.slice(w[0] === '-p' || w[0] === '--package' ? 2 : 1);
      if (w.length && /^firebase-tools(@.*)?$/.test(w[0])) w = ['firebase', ...w.slice(1)];
      continue;
    }
    if ((p === 'npm' || p === 'pnpm' || p === 'bun' || p === 'yarn') && (w[1] === 'exec' || w[1] === 'x' || w[1] === 'dlx')) {
      w = w.slice(2);
      while (w.length && (w[0] === '--' || w[0].startsWith('-'))) w = w.slice(1);
      if (w.length && /^firebase-tools(@.*)?$/.test(w[0])) w = ['firebase', ...w.slice(1)];
      continue;
    }
    if (p === 'node' && w.length > 1 && /firebase-tools[\\/].*firebase\.js$|[\\/]bin[\\/]firebase(\.js)?$/i.test(w[1])) { w = ['firebase', ...w.slice(2)]; continue; }
    if ((p === 'python' || p === 'python3' || p === 'py') && w.length > 1 && /gcloud\.py$/i.test(w[1])) { w = ['gcloud', ...w.slice(2)]; continue; }
    break;
  }
  return { w, dinamica: din };
};

/* ── Firmas ─────────────────────────────────────────────────────────────── */

const ARCHIVOS_SECRETOS = [
  '.env.local', '.secret.local', '.env.get-wee', '.env.prod', 'application_default_credentials',
  'legacy_credentials', 'access_tokens.db', 'credentials.db', 'service-account',
  'configstore/firebase-tools.json', 'firebase-tools.json', 'wee-claves-retiradas', 'gha-creds-',
];
const FIREBASE_NUNCA = new Set(['deploy', 'functions:delete', 'functions:secrets:set', 'functions:secrets:destroy',
  'functions:secrets:prune', 'functions:secrets:access', 'apphosting:secrets:access', 'hosting:disable',
  'hosting:channel:delete', 'firestore:delete', 'firestore:databases:delete',
  'database:remove', 'database:set', 'database:update', 'database:push', 'auth:import', 'login', 'login:add', 'login:use',
  'apphosting:backends:delete', 'remoteconfig:rollback', 'ext:uninstall', 'ext:install', 'ext:update']);
const FIREBASE_PREGUNTA = new Set(['use', 'apps:create', 'projects:create', 'projects:addfirebase', 'functions:config:set',
  'functions:config:unset', 'hosting:clone', 'hosting:sites:create', 'hosting:sites:delete', 'logout', 'init',
  'auth:export', 'functions:log', 'database:get', 'firestore:databases:restore']);
const GCLOUD_NUNCA = new Set(['delete', 'destroy', 'deploy', 'purge', 'rm']);
const GCLOUD_IAM = new Set(['set-iam-policy', 'add-iam-policy-binding', 'remove-iam-policy-binding']);
const GCLOUD_CAMBIA = new Set(['create', 'update', 'patch', 'enable', 'disable', 'add', 'import', 'export', 'restore', 'rollback',
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

/* Scripts propios que LEEN datos de personas en producción: los ejecuta el dueño. */
const SCRIPTS_DUENO = [/ops\/reconciliacion\/reservas-colgadas/, /scripts\/copias\.mjs/];
/* Banderas con las que un script propio escribe o toca producción. */
const BANDERAS_DUENO = new Set(['--ejecutar', '--confirmo-autorizacion', '--crear', '--confirmo-aislado']);

/* Rutas que settings.json protege con `ask` para Edit: escribirlas por Bash también pregunta. */
const RUTAS_PROTEGIDAS = /(?:^|[\s'"=(,/\\])\.claude[/\\]|(?:^|[\s'"=(,/\\])\.firebaserc(?:[\s'")]|$)|functions[\\/]src[\\/]credits[\\/]creditengine\.ts|functions[\\/]src[\\/]core[\\/]financial[\\/]/i;
const ESCRITORES = new Set(['cp', 'mv', 'dd', 'tee', 'truncate', 'install', 'ln', 'rm', 'touch', 'mktemp', 'chmod', 'chown', 'rsync', 'shred', 'unlink']);

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

/** ¿Alguna palabra toca (o PUEDE expandirse a) un archivo de secretos? Devuelve el nombre o null. */
const tocaSecreto = (p, w) => {
  const utiles = sinPatron(p, w).slice(1);
  const ultimo = (x) => x.slice(x.replace(/\\/g, '/').lastIndexOf('/') + 1);
  const desescapar = (x) => x.replace(/\\(.)/g, '$1').replace(/\\/g, '/').toLowerCase();
  const aRegex = (g) => '^' + g.replace(/[.+^${}()|]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\[!/g, '[^') + '$';
  for (const a of utiles) {
    const plano = desescapar(a);
    for (const sec of ARCHIVOS_SECRETOS) {
      if (plano.includes(sec)) return sec;
      if (/[*?[]/.test(plano)) {
        try {
          const re = new RegExp(aRegex(ultimo(plano)), 'i');
          if (re.test(ultimo(sec)) || re.test(sec)) return sec;
        } catch { /* glob roto: se ignora */ }
      }
    }
  }
  return null;
};

/** ¿La orden ESCRIBE en una ruta protegida (redirección, cp/mv/sed -i, node fs.write…)? */
const escribeProtegido = (p, w, crudo) => {
  const norm = String(crudo).replace(/\\/g, '/');
  if (!RUTAS_PROTEGIDAS.test(norm)) return false;
  if (/>>?\s*["']?[^\s"'|&;]*(\.claude\/|\.firebaserc|creditengine\.ts|core\/financial\/)/i.test(norm)) return true;
  const args = w.slice(1);
  const protegida = (x) => RUTAS_PROTEGIDAS.test(String(x).replace(/\\/g, '/'));
  if (ESCRITORES.has(p) && args.some(protegida)) return true;
  if (p === 'sed' && args.some((x) => /^-i/.test(x)) && args.some(protegida)) return true;
  if ((p === 'node' || p === 'python' || p === 'python3' || p === 'py') &&
    /writefilesync|appendfilesync|writefile\b|\.write\(|unlinksync|rmsync|open\s*\([^)]*['"]w|>\s*open\(/i.test(norm) &&
    protegida(norm)) return true;
  return false;
};

const decision = (d, motivo, cerrado = false) => ({ decision: d, motivo, cerrado });
const PASA = { decision: null, motivo: '', cerrado: false };

/* Programas "sensibles": si reciben un subcomando dinámico y el texto trae una palabra sensible, se deniegan. */
const esSensible = (p) => ['firebase', 'gcloud', 'gsutil', 'gh', 'vercel', 'eas', 'eas-cli', 'npm', 'pnpm', 'yarn'].includes(p);

/** Extrae y analiza las órdenes que lanzaría un `node -e`/`python -c` por dentro. */
const dentroDeCodigo = (herr, codigo, prof, raiz) => {
  const textos = [];
  const reCP = /(?:exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(\s*(['"`])([^'"`]*)\1\s*(?:,\s*(\[[^\]]*\]))?/g;
  const rePy = /(?:os\.system|os\.popen|subprocess\.(?:run|call|check_output|check_call|Popen|getoutput))\s*\(\s*(?:(['"])([^'"]*)\1|(\[[^\]]*\]))/g;
  const desdeArray = (lit) => (lit ? [...lit.matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]) : []);
  let m;
  while ((m = reCP.exec(codigo))) textos.push([m[2], ...desdeArray(m[3])].join(' '));
  while ((m = rePy.exec(codigo))) textos.push(m[3] ? desdeArray(m[3]).join(' ') : m[2]);
  let peor = PASA;
  for (const t of textos) {
    if (!t.trim()) continue;
    const r = analizarTexto(herr, t, prof + 1, raiz);
    if (r.decision === 'deny') return r;
    if (r.decision === 'ask' && !peor.decision) peor = r;
  }
  return peor;
};

/** Analiza UNA etapa ya partida en palabras. */
const analizarOrden = (herramienta, etapa, previa, profundidad, raiz) => {
  const { w, dinamica: desdeEntrada } = desenvolver(etapa.palabras);
  if (!w.length) return PASA;
  const p = programa(w[0]);
  const resto = w.slice(1);
  const sinOpciones = resto.filter((x) => !x.startsWith('-'));

  /* Intérpretes y lanzadores con un comando dentro: se analiza lo de dentro. */
  if (profundidad < LIM_PROF) {
    const idx = (re) => w.findIndex((x) => re.test(x));
    const tras = (i) => (i >= 0 && i + 1 < w.length ? w[i + 1] : null);
    let interior = null;
    if (['bash', 'sh', 'zsh', 'dash', 'ksh'].includes(p)) interior = tras(idx(/^-[a-z]*c$/i));
    else if (p === 'cmd') interior = w.slice(w.findIndex((x) => /^\/[ck]$/i.test(x)) + 1).join(' ') || null;
    else if (p === 'wsl') interior = w.slice(1).join(' ') || null;
    else if (p === 'eval') interior = resto.join(' ') || null;
    else if (p === 'powershell' || p === 'pwsh') {
      const e = idx(/^-(e|ec|enc|encodedcommand)$/i);
      if (e >= 0 && tras(e)) {
        try { return decidirPeor(analizarTexto('PowerShell', Buffer.from(tras(e), 'base64').toString('utf16le'), profundidad + 1, raiz)); }
        catch { /* base64 ilegible */ }
      }
      const cc = idx(/^-(c|command)$/i);
      interior = cc >= 0 ? w.slice(cc + 1).join(' ') : null;
    } else if (p === 'invoke-expression' || p === 'iex') {
      const arg = resto.find(Boolean);
      if (arg && dinamica(arg)) { if (SENSIBLE_TXT(raiz)) return decision('deny', 'Invoke-Expression construye y ejecuta un comando dinámico con contenido sensible: Claude no lo ejecuta a ciegas.'); }
      else interior = arg;
    } else if (p === 'start-process' || p === 'saps') {
      const f = idx(/^-filepath$/i);
      const prog = f >= 0 ? tras(f) : resto.find((x) => !x.startsWith('-'));
      const a = idx(/^-argumentlist$/i);
      const args = a >= 0 ? w.slice(a + 1).filter((x) => !x.startsWith('-')) : [];
      interior = prog ? [prog, ...args].join(' ') : null;
    } else if (p === 'find') {
      const e = w.findIndex((x) => /^-(exec|execdir|ok)$/.test(x));
      if (e >= 0) {
        const fin = w.findIndex((x, k) => k > e && (x === ';' || x === '+' || x === '\\;'));
        interior = w.slice(e + 1, fin < 0 ? w.length : fin).join(' ') || null;
      }
    } else if (p === 'node' && resto.some((x) => /^(-e|--eval|-p|--print)$/.test(x))) {
      const e = resto.findIndex((x) => /^(-e|--eval|-p|--print)$/.test(x));
      const r = dentroDeCodigo('Bash', String(resto[e + 1] || ''), profundidad, raiz);
      if (r.decision) return r;
    } else if ((p === 'python' || p === 'python3' || p === 'py') && resto.some((x) => x === '-c')) {
      const r = dentroDeCodigo('Bash', String(resto[resto.indexOf('-c') + 1] || ''), profundidad, raiz);
      if (r.decision) return r;
    }
    if (interior) return decidirPeor(analizarTexto(herramienta, interior, profundidad + 1, raiz));
  }

  /* Escritura en rutas que el dueño protege: pregunta (nunca en silencio). */
  if (escribeProtegido(p, w, etapa.crudo)) return decision('ask', 'El comando escribe en una ruta protegida (.claude, .firebaserc, el motor de Credits o el Financial Core): lo aprueba el dueño.');

  /* Archivos de secretos y credenciales: nunca se leen ni se tocan desde un comando (el patrón de un buscador no cuenta). */
  const secreto = tocaSecreto(p, w);
  if (secreto) return decision('deny', `El comando toca ${secreto}: los secretos y credenciales no se leen ni se mueven desde Claude (docs/SECURITY.md).`);

  const todo = sinPatron(p, w).join(' ').replace(/\\/g, '/').toLowerCase();
  if (p === 'gh' && resto[0] === 'auth' && (resto[1] === 'token' || (resto[1] === 'status' && resto.some((x) => /^(--show-token|-t)$/.test(x))))) {
    return decision('deny', '`gh auth token`/`gh auth status --show-token` imprime el token de GitHub.');
  }
  if (p === 'git' && (resto[0] === 'credential' || /^credential-/.test(resto[0] || ''))) {
    return decision('deny', '`git credential` imprime credenciales guardadas: Claude no las lee.');
  }
  if (/print-access-token|print-identity-token/.test(todo)) return decision('ask', 'Imprimir un token de acceso de Google necesita el visto bueno del dueño.');

  /* Node que lee un script propio del dueño o lanza algo por dentro. */
  if (p === 'node') {
    const archivo = resto.find((x) => !x.startsWith('-'));
    if (archivo) {
      const norm = archivo.replace(/\\/g, '/');
      if (SCRIPTS_DUENO.some((re) => re.test(norm))) return decision('ask', `\`node ${archivo}\` lee datos de personas en producción: lo ejecuta el dueño (docs/HARNESS.md).`);
      try {
        const abs = path.resolve(process.cwd(), archivo);
        if (existsSync(abs) && statSync(abs).isFile() && statSync(abs).size < 400_000) {
          const r = dentroDeCodigo('Bash', readFileSync(abs, 'utf8'), profundidad, raiz);
          if (r.decision) return r;
        }
      } catch { /* sin archivo legible: nada que mirar */ }
    }
  }

  /* Scripts propios que escriben en producción: llevan banderas explícitas. */
  if (w.some((x) => BANDERAS_DUENO.has(x))) {
    return decision('ask', 'El script escribe o aísla producción (bandera --ejecutar/--confirmo-autorizacion/--crear/--confirmo-aislado): lo aprueba el dueño.');
  }

  /* Firebase CLI. */
  if (p === 'firebase') {
    const nunca = sinOpciones.find((x) => FIREBASE_NUNCA.has(x.toLowerCase()) || /:secrets:access$/.test(x.toLowerCase()));
    if (nunca) return decision('deny', `\`firebase ${nunca}\` no se ejecuta desde el portátil: despliegues y secretos solo por el workflow o el dueño (docs/DEPLOYMENT.md).`);
    const pregunta = sinOpciones.find((x) => FIREBASE_PREGUNTA.has(x.toLowerCase()));
    if (pregunta) return decision('ask', `\`firebase ${pregunta}\` cambia configuración o lee datos de producción: lo aprueba el dueño.`);
    if (sinOpciones[0] && /^emulators:/.test(sinOpciones[0])) {
      const i = resto.findIndex((x) => x === '--project' || x === '-P');
      const proy = i >= 0 ? resto[i + 1] : null;
      if (!proy || !/^demo-/.test(proy)) return decision('ask', 'Los emuladores se arrancan con un proyecto demo-* (npm run functions:emulator); otro proyecto podría tocar datos reales.');
    }
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* gcloud. */
  if (p === 'gcloud') {
    const todos = sinOpciones.map((x) => x.toLowerCase());
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
    if (cambia) return decision('ask', `\`gcloud … ${cambia}\` cambia o exporta algo en Google Cloud: necesita la aprobación del dueño.`);
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* gsutil (Cloud Storage). */
  if (p === 'gsutil') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (GSUTIL_NUNCA.has(sub)) return decision('deny', `\`gsutil ${sub}\` borra datos de Cloud Storage: no se hace desde Claude.`);
    if (GSUTIL_CAMBIA.has(sub)) return decision('ask', `\`gsutil ${sub}\` escribe o cambia permisos en Cloud Storage: lo aprueba el dueño.`);
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* Vercel CLI. */
  if (p === 'vercel') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (VERCEL_LEE.has(sub) || (!sub && resto.some((x) => /^(--version|-v|--help|-h)$/.test(x)))) return PASA;
    if (VERCEL_LOCAL.has(sub)) return decision('ask', `\`vercel ${sub}\` enlaza o construye contra el proyecto de Vercel: lo aprueba el dueño.`);
    return decision('deny', `\`vercel ${sub || '(sin subcomando)'}\` despliega o cambia el proyecto de Vercel: la web se publica por la integración de Git, no desde Claude.`);
  }

  /* EAS (Expo). */
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

  /* npm: los scripts de despliegue y los que leen producción. */
  if (p === 'npm' || p === 'pnpm' || p === 'yarn') {
    const i = resto.findIndex((x) => x === 'run' || x === 'run-script');
    const script = i >= 0 ? (resto[i + 1] || '') : (p === 'yarn' ? (sinOpciones[0] || '') : '');
    if (/deploy/i.test(script)) return decision('deny', `\`${p} run ${script}\` despliega desde el portátil: producción solo cambia por el workflow (docs/DEPLOYMENT.md).`);
    if (/^logs?$/i.test(script)) return decision('ask', `\`${p} run ${script}\` lee los registros de producción: lo ejecuta el dueño (docs/HARNESS.md).`);
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* Un intérprete que recibe su programa por una tubería desde un `echo`/`printf`. */
  if (['bash', 'sh', 'zsh', 'dash', 'ksh', 'node', 'python', 'python3', 'py'].includes(p) && previa) {
    const pp = programa((previa.palabras || [])[0] || '');
    if ((pp === 'echo' || pp === 'printf') && profundidad < LIM_PROF) {
      const texto = previa.palabras.slice(1).filter((x) => !x.startsWith('-')).join(' ');
      if (texto) return decidirPeor(analizarTexto('Bash', texto, profundidad + 1, raiz));
    }
  }

  return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
};

/** Un "peor" (deny gana a ask gana a pasa) para combinar una llamada recursiva. */
const decidirPeor = (r) => r;

/**
 * Backstop para lo dinámico: si un programa sensible recibe el SUBCOMANDO por una
 * variable/sustitución (o el programa mismo es dinámico), o sus argumentos vienen
 * de `xargs`, y el texto completo trae una palabra sensible → deny. No bloquea las
 * órdenes dinámicas corrientes (sin palabra sensible).
 */
function reglaDinamica(p, w, etapa, desdeEntrada, raiz) {
  const progDin = dinamica(etapa.palabras[0] || '');
  const subDin = dinamica(w[1] || '') || desdeEntrada;
  const sinSub = w.length < 2 && desdeEntrada;
  if (!SENSIBLE_TXT(raiz)) return PASA;
  if (progDin) return decision('deny', 'El programa se arma dinámicamente y el texto trae una palabra sensible (deploy/secrets/token/…): Claude no lo ejecuta a ciegas.');
  if (esSensible(p) && (subDin || sinSub)) return decision('deny', `\`${p}\` recibe su subcomando por una variable/entrada y el texto trae una palabra sensible: podría ser un despliegue o un borrado encubierto.`);
  return PASA;
}

/** Analiza el texto completo de un comando de Bash o de PowerShell. */
export const analizarTexto = (herramienta, texto, profundidad = 0, raiz) => {
  const base = raiz === undefined ? texto : raiz;
  try {
    return analizar(herramienta, texto, profundidad, base);
  } catch (e) {
    if (profundidad > 0) throw e;
    /* Un exceso de anidamiento/tamaño SIN palabra sensible se deja pasar (no bloquear lo inocuo);
       con palabra sensible, o ante cualquier otro error, se FALLA CERRADO. */
    if (e && e.limite && !SENSIBLE_TXT(base)) return PASA;
    return decision('deny', 'la guardia no pudo analizar este comando; reformúlalo en órdenes simples y explícitas.', true);
  }
};

function analizar(herramienta, texto, profundidad, raiz) {
  if (process.env.GUARDIA_PRUEBA_FALLO === '1') throw new Error('punto de prueba: fallo forzado');
  const herr = herramienta === 'Monitor' ? 'Bash' : herramienta;

  /* La trampa de PowerShell 5.1 con los .cmd: un argumento entre comillas con > < | & vuelve a pasar por cmd.exe
     y se convierte en una redirección (así aparecieron ERROR y WARNING en la raíz del repo, dos veces). */
  if (herr === 'PowerShell' && /\.cmd\b/i.test(texto) && !/--%/.test(texto)
    && /"[^"]*[<>|&][^"]*"|'[^']*[<>|&][^']*'/.test(texto)) {
    return decision('deny', 'Un argumento con > < | & pasado a un .cmd desde PowerShell lo reinterpreta cmd.exe (crea archivos o rompe el comando). Usa --% o la herramienta Bash.');
  }

  if (profundidad > LIM_PROF || texto.length > LIM_TAM) {
    if (SENSIBLE_TXT(texto)) throw new RangeError('fuera de límites con contenido sensible');
    return PASA;
  }

  const fuera = [];
  trocear(herr, sinHeredocs(texto), fuera, 0);
  let peor = PASA;
  for (const tuberia of fuera) {
    for (let k = 0; k < tuberia.length; k++) {
      const r = analizarOrden(herr, tuberia[k], tuberia[k - 1] || null, profundidad, raiz);
      if (r.decision === 'deny') return r;
      if (r.decision === 'ask' && !peor.decision) peor = r;
    }
  }
  return peor;
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

const salida = (d, motivo) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: d, permissionDecisionReason: `Weë Harness: ${motivo}` },
  }));
};

const principal = async () => {
  let entrada = '';
  for await (const trozo of process.stdin) entrada += trozo;
  let datos;
  try { datos = JSON.parse(entrada || '{}'); }
  catch { salida('deny', 'la guardia recibió una entrada ilegible; no se ejecuta por seguridad.'); return 2; }
  const herramienta = datos.tool_name;
  const comando = datos.tool_input && datos.tool_input.command;
  if (!['Bash', 'PowerShell', 'Monitor'].includes(herramienta) || typeof comando !== 'string') return 0;
  let r;
  try { r = analizarTexto(herramienta, comando); }
  catch { salida('deny', 'la guardia no pudo analizar este comando; reformúlalo en órdenes simples y explícitas.'); return 2; }
  if (!r.decision) return 0;
  salida(r.decision, r.motivo);
  return r.cerrado ? 2 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().then(
    (codigo) => process.exit(codigo || 0),
    (e) => {
      try { salida('deny', 'la guardia falló de forma inesperada; no se ejecuta por seguridad.'); } catch { /* nada */ }
      process.stderr.write(`guardia: error interno, se bloquea por seguridad (${e && e.message})\n`);
      process.exit(2);
    },
  );
}

export const __dir = path.dirname(fileURLToPath(import.meta.url));
