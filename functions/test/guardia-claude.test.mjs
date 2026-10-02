/*
 * LA GUARDIA DE CLAUDE — `.claude/hooks/guardia.mjs` y `.claude/settings.json`.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * El Harness da a Claude mucha autonomía en lo local (leer, editar, probar,
 * compilar, git local, emuladores demo-*) y le quita lo que no debe hacer solo:
 * desplegar desde el portátil, borrar en producción, leer secretos, cambiar
 * IAM, aprobarse despliegues, forzar pushes. Esta suite EJECUTA la lógica del
 * hook sobre una batería de comandos reales —incluidas las variantes que una
 * regla por texto no ve— y comprueba también el protocolo del hook (JSON por
 * stdin y por stdout) y las reglas de settings.json.
 *
 * Si añades una firma al hook, añade aquí el comando que la dispara y uno
 * parecido que NO debe dispararla.
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const HOOK = path.resolve(RAIZ, '.claude/hooks/guardia.mjs');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { analizarTexto, ordenes, palabras, sinPatron } = await import(pathToFileURL(HOOK).href);
const d = (herr, cmd) => analizarTexto(herr, cmd).decision || 'pasa';

/* ── A. Lo que Claude hace solo (nivel 0–1) ─────────────────────────────── */
const PASAN = [
  ['Bash', 'git status --short'],
  ['Bash', 'git add functions/src/credits/index.ts && git commit -q -F - <<\'EOF\'\nfix: no firebase deploy here, only words\nEOF'],
  ['Bash', 'git commit -m "explica por qué firebase deploy queda prohibido"'],
  ['Bash', 'npx tsc --noEmit'],
  ['Bash', 'npm --prefix functions run build && node functions/test/credits.test.mjs'],
  ['Bash', 'firebase emulators:exec --only firestore --project demo-wee "node functions/test/econtact-rules.emulator.mjs"'],
  ['Bash', 'gcloud.cmd functions list --project=get-wee --format=json'],
  ['PowerShell', 'gcloud.cmd run services get-iam-policy spendcredits --region=us-central1 --project=get-wee'],
  ['Bash', 'gh pr create --title "Harness" --body "x"'],
  ['Bash', 'gh api repos/geovetlf/wee-app/branches'],
  ['Bash', 'git log --oneline -5 && git diff --stat'],
  ['Bash', 'git switch -c harness/fase-2'],
  ['Bash', 'node scripts/web-demo.mjs'],
  /* El producto `run` (Cloud Run) no es un verbo: listar o describir servicios solo lee. */
  ['Bash', 'gcloud run services list --project=get-wee'],
  ['Bash', 'gcloud beta run services describe brainchat --region=us-central1'],
  ['Bash', 'gsutil ls gs://get-wee.firebasestorage.app/'],
  ['Bash', 'gcloud storage ls gs://get-wee.firebasestorage.app/'],
  ['Bash', 'vercel ls wee-app'],
  ['Bash', 'npx vercel inspect wee-app-git-main.vercel.app'],
  ['Bash', 'eas whoami'],
  ['Bash', 'npx eas-cli build:list --limit 5'],
  /* Buscar el TEXTO «.env.local» en la documentación no lee el archivo de claves. */
  ['Bash', 'grep -n "\\.env.local" README.md CLAUDE.md'],
  ['Bash', 'rg -n "env.local|secret.local" docs/'],
  ['Bash', 'git grep -n ".env.local" -- docs'],
  ['Bash', 'grep -A 2 -n "secret.local" .gitignore'],
  ['Bash', 'grep -rn "print-access-token" docs/'],
  ['PowerShell', "Select-String -Pattern '.env.local' -Path README.md"],
];
for (const [h, c] of PASAN) check(`pasa (${h}): ${c.split('\n')[0].slice(0, 70)}`, d(h, c) === 'pasa', d(h, c));

/* ── B. Lo que Claude nunca hace (deny) ─────────────────────────────────── */
const NUNCA = [
  ['Bash', 'firebase deploy --only functions'],
  ['Bash', 'firebase --project prod deploy --only functions:generateVideo'],
  ['Bash', '"$APPDATA/npm/firebase.cmd" deploy --only hosting:wee-app --project get-wee'],
  ['PowerShell', '& "C:\\Users\\Geovet\\AppData\\Roaming\\npm\\firebase.cmd" deploy --only firestore:rules'],
  ['Bash', 'npx firebase-tools deploy --only functions'],
  ['Bash', 'node ./node_modules/firebase-tools/lib/bin/firebase.js deploy'],
  ['Bash', 'cd functions && timeout 600 firebase deploy'],
  ['Bash', 'bash -c "firebase deploy --only functions"'],
  ['PowerShell', 'powershell -Command "firebase deploy --only hosting"'],
  ['Bash', 'firebase functions:delete productions --force'],
  ['Bash', 'firebase functions:secrets:set ARK_API_KEY'],
  ['Bash', 'npm run deploy:prod:functions'],
  ['Bash', 'npm --prefix functions run deploy'],
  ['Bash', 'gcloud functions delete generateVideo --region=us-central1'],
  ['PowerShell', 'gcloud.cmd run services delete spendcredits --region=us-central1'],
  ['Bash', 'gcloud secrets versions access latest --secret=ARK_API_KEY'],
  ['Bash', 'gcloud auth login'],
  ['Bash', 'cat functions/.env.local'],
  ['PowerShell', 'Get-Content functions/.env.local'],
  ['Bash', 'type C:/Users/Geovet/wee-claves-retiradas/functions.env.local.retirado-2026-09-30'],
  ['Bash', 'gh auth token'],
  ['Bash', 'gh api -X POST repos/geovetlf/wee-app/actions/runs/123/pending_deployments -f state=approved'],
  ['Bash', 'git push --force origin main'],
  ['Bash', 'git -C . push -f origin harness/fase-1'],
  ['Bash', 'git push origin +main'],
  ['Bash', 'git push origin :harness/vieja'],
  ['Bash', 'gh repo delete geovetlf/wee-app --yes'],
  ['PowerShell', 'gcloud.cmd logging read "severity>=ERROR" --project=get-wee'],
  ['Bash', 'gcloud beta run deploy brainchat --source=.'],
  ['Bash', 'gcloud storage rm gs://get-wee.firebasestorage.app/users/x/foto.jpg'],
  ['Bash', 'gsutil -m rm -r gs://get-wee.firebasestorage.app/users/'],
  ['Bash', 'gsutil rb gs://get-wee-backups'],
  /* La configuración heredada preaprobaba `vercel:*` y `npx eas:*`: el hook los cubre aunque una regla allow los deje pasar. */
  ['Bash', 'vercel'],
  ['Bash', 'vercel --prod'],
  ['Bash', 'vercel ./dist --yes'],
  ['Bash', 'npx vercel deploy --prebuilt'],
  ['Bash', 'vercel env pull .env.production.local'],
  ['Bash', 'vercel rollback'],
  ['Bash', 'eas submit -p android --latest'],
  ['Bash', 'npx eas-cli update --branch production'],
  ['Bash', 'eas env:delete --variable-name X'],
  /* …pero buscar DENTRO del archivo de claves, o leer los patrones DE él, sí lo lee. */
  ['Bash', 'grep -r ARK functions/.env.local'],
  ['Bash', 'grep -f functions/.env.local README.md'],
  ['Bash', 'grep -e x functions/.secret.local'],
  ['Bash', 'rg -A 2 ARK functions/.env.local'],
  ['Bash', 'git grep -n KEY -- functions/.env.local'],
  ['PowerShell', 'Select-String -Path functions/.env.local -Pattern KEY'],
];
for (const [h, c] of NUNCA) check(`deniega (${h}): ${c.slice(0, 70)}`, d(h, c) === 'deny', d(h, c));

/* ── C. Lo que necesita al dueño (ask) ──────────────────────────────────── */
const PREGUNTA = [
  ['Bash', 'git push origin harness/fase-1'],
  ['Bash', 'git push -u origin main'],
  ['PowerShell', 'gcloud.cmd run services remove-iam-policy-binding spendcredits --member=allUsers --role=roles/run.invoker'],
  ['Bash', 'gcloud iam workload-identity-pools create github --location=global'],
  ['Bash', 'gcloud secrets versions disable 1 --secret=DEEPSEEK_API_KEY'],
  ['Bash', 'gcloud services enable firebaseappcheck.googleapis.com'],
  ['Bash', 'gcloud config set project get-wee'],
  ['Bash', 'gcloud auth print-access-token'],
  ['Bash', 'gh api -X PUT repos/geovetlf/wee-app/branches/main/protection --input reglas.json'],
  ['Bash', 'gh api repos/geovetlf/wee-app/rulesets -f name=main'],
  ['Bash', 'gh pr merge 12 --squash'],
  ['Bash', 'gh workflow run deploy.yml -f tag=prod/2026-10-01.1'],
  ['Bash', 'gh secret set VERCEL_TOKEN'],
  ['Bash', 'node scripts/canary-medios.mjs --ejecutar'],
  ['Bash', 'firebase use prod'],
  ['Bash', 'firebase emulators:start --only functions'],
  ['Bash', 'git branch -D i18n/ja-jp'],
  ['Bash', 'git worktree remove ../fm/wt2'],
  ['Bash', 'git reset --hard HEAD~1'],
  ['Bash', 'git tag -d prod/functions/x'],
  ['Bash', 'gcloud scheduler jobs run barridoDeLiquidacion --location=us-central1'],
  ['Bash', 'gcloud builds submit --tag gcr.io/get-wee/x'],
  ['Bash', 'gsutil cp foto.jpg gs://get-wee.firebasestorage.app/'],
  ['Bash', 'gcloud storage cp foto.jpg gs://get-wee.firebasestorage.app/'],
  ['Bash', 'vercel link --yes'],
  ['Bash', 'npx eas build -p android --profile preview'],
  ['Bash', 'eas credentials'],
  ['Bash', 'eas env:create --name X --value y'],
];
for (const [h, c] of PREGUNTA) check(`pregunta (${h}): ${c.slice(0, 70)}`, d(h, c) === 'ask', d(h, c));

/* ── D. Las piezas del analizador ───────────────────────────────────────── */
check('el heredoc no cuenta como orden', ordenes("git commit -F - <<'EOF'\nfirebase deploy\nEOF").length === 1);
check('una frase entre comillas es UNA palabra', palabras('git commit -m "firebase deploy ya no"').length === 4);
check('separa órdenes por && || ; | y saltos de línea', ordenes('a && b || c ; d | e\nf').length === 6);
check('el patrón de un buscador se aparta; dónde busca, no',
  sinPatron('grep', palabras('grep -n "\\.env.local" README.md')).join(' ') === 'grep -n README.md');

/* ── E. El protocolo del hook, de verdad: JSON por stdin, JSON por stdout ─ */
const correr = (entrada) => spawnSync(process.execPath, [HOOK], { input: JSON.stringify(entrada), encoding: 'utf8', timeout: 15000 });
const denegado = correr({ tool_name: 'Bash', tool_input: { command: 'firebase deploy' } });
let salida = null;
try { salida = JSON.parse(denegado.stdout); } catch { salida = null; }
check('el hook devuelve una decisión deny en el formato de Claude Code',
  denegado.status === 0 && salida && salida.hookSpecificOutput && salida.hookSpecificOutput.hookEventName === 'PreToolUse'
  && salida.hookSpecificOutput.permissionDecision === 'deny' && /Weë Harness/.test(salida.hookSpecificOutput.permissionDecisionReason),
  denegado.stdout.slice(0, 120));
const libre = correr({ tool_name: 'Bash', tool_input: { command: 'git status' } });
check('un comando normal no produce salida (sigue el flujo normal)', libre.status === 0 && libre.stdout.trim() === '');
const otraHerramienta = correr({ tool_name: 'Read', tool_input: { file_path: 'x' } });
check('ignora herramientas que no son Bash ni PowerShell', otraHerramienta.status === 0 && otraHerramienta.stdout.trim() === '');
const roto = spawnSync(process.execPath, [HOOK], { input: '{esto no es json', encoding: 'utf8', timeout: 15000 });
let salidaRoto = null;
try { salidaRoto = JSON.parse(roto.stdout); } catch { salidaRoto = null; }
/* CAMBIO EXPLÍCITO (endurecimiento): antes esto fallaba ABIERTO (exit 0, sin decisión). Era la
   puerta de atrás: un comando construido para romper el analizador se ejecutaba igual. Ahora la
   guardia FALLA CERRADA: una entrada ilegible se deniega y sale con código 2 (bloqueo en Claude Code). */
check('si recibe basura, falla CERRADO (deny + exit 2)',
  roto.status === 2 && salidaRoto && salidaRoto.hookSpecificOutput
  && salidaRoto.hookSpecificOutput.permissionDecision === 'deny',
  `status=${roto.status} out=${roto.stdout.slice(0, 80)}`);

/* ── F. settings.json ───────────────────────────────────────────────────── */
const settings = JSON.parse(fs.readFileSync(path.resolve(RAIZ, '.claude/settings.json'), 'utf8'));
const perm = settings.permissions || {};
const tiene = (lista, r) => (perm[lista] || []).includes(r);
check('settings.json deniega desplegar con firebase (Bash y PowerShell)', tiene('deny', 'Bash(firebase deploy *)') && tiene('deny', 'PowerShell(firebase deploy *)'));
check('settings.json deniega leer las claves y credenciales locales',
  ['Read(**/.env.local)', 'Read(**/.secret.local)', 'Read(**/.env.get-wee)'].every((r) => tiene('deny', r)));
check('settings.json pregunta antes de un push', tiene('ask', 'Bash(git push *)'));
check('settings.json pregunta antes de tocar la guardia de Claude o el motor de Credits',
  tiene('ask', 'Edit(/.claude/**)') && tiene('ask', 'Edit(/functions/src/credits/creditEngine.ts)'));
const hook = ((settings.hooks || {}).PreToolUse || []).find((h) => /Bash/.test(h.matcher) && /PowerShell/.test(h.matcher));
check('el hook está enganchado a Bash, PowerShell y Monitor', Boolean(hook)
  && /Monitor/.test(hook.matcher)
  && hook.hooks.some((x) => x.type === 'command' && x.command === 'node' && (x.args || []).some((a) => a.endsWith('.claude/hooks/guardia.mjs'))));
const peligrosas = (perm.allow || []).filter((r) => /deploy|functions:delete|git push|powershell -Command|vercel|eas /i.test(r));
check('ningún allow preaprueba algo peligroso', peligrosas.length === 0, peligrosas.join(', '));
check('settings.json deniega imprimir secretos/tokens (segunda capa nativa)',
  ['Bash(firebase functions:secrets:access *)', 'PowerShell(firebase functions:secrets:access *)',
    'Bash(firebase apphosting:secrets:access *)', 'Bash(git credential *)',
    'Bash(gh auth status --show-token*)'].every((r) => tiene('deny', r)));
check('settings.json deniega leer los nuevos archivos de credenciales',
  ['Read(**/legacy_credentials/**)', 'Read(**/access_tokens.db)', 'Read(**/credentials.db)'].every((r) => tiene('deny', r)));

/* ── G. Análisis ESTRUCTURAL y lanzadores: casos nuevos (deny) ───────────── */
/* Cada uno es una variante que una regla por texto no ve y que la guardia ANTERIOR dejaba pasar
   (o, en los marcados, trataba de forma más débil). La sección I lo demuestra contra cb8d7e6. */
const NUEVO_DENY = [
  /* 1) órdenes dentro de subshells, grupos, bucles y fondo */
  ['Bash', '(firebase deploy)'],
  ['Bash', '{ firebase deploy; }'],
  ['Bash', 'if true; then firebase deploy; fi'],
  ['Bash', 'for i in 1; do firebase deploy; done'],
  ['Bash', 'while true; do firebase deploy; done'],
  ['Bash', 'until false; do firebase deploy; done'],
  ['Bash', 'sleep 1 & firebase deploy'],
  ['Bash', '(git push --force origin main)'],
  ['Bash', 'case x in x) firebase deploy ;; esac'],
  /* 2) comandos que imprimen secretos o tokens */
  ['Bash', 'firebase functions:secrets:access GEMINI_API_KEY'],
  ['Bash', 'firebase apphosting:secrets:access ARK_API_KEY'],
  ['PowerShell', 'firebase functions:secrets:access GEMINI_API_KEY'],
  ['Bash', 'gh auth status --show-token'],
  ['Bash', 'gh auth status -t'],
  ['Bash', 'git credential fill'],
  /* 3) lanzadores e intérpretes */
  ['Bash', 'npm exec -- firebase deploy'],
  ['Bash', 'npm x firebase-tools deploy'],
  ['Bash', 'pnpm dlx firebase-tools deploy'],
  ['Bash', 'yarn dlx firebase-tools deploy'],
  ['Bash', 'env firebase deploy'],
  ['Bash', 'env GITHUB_TOKEN=x firebase deploy'],
  ['Bash', 'env X=1 firebase deploy'],
  ['Bash', 'eval "firebase deploy"'],
  ['Bash', 'X=deploy; firebase $X'],
  ['Bash', 'f(){ firebase deploy; }; f'],
  ['Bash', 'timeout -s KILL 600 firebase deploy'],
  ['Bash', 'setsid firebase deploy'],
  ['Bash', 'find . -maxdepth 1 -exec firebase deploy \\;'],
  ['Bash', 'xargs firebase <<< deploy'],
  ['Bash', 'echo deploy | xargs firebase'],
  ['Bash', 'echo "firebase deploy" | bash'],
  ['Bash', 'printf "firebase deploy" | sh'],
  ['Bash', 'node -e "require(\'child_process\').execSync(\'firebase deploy\')"'],
  ['Bash', 'python -c "import os; os.system(\'firebase deploy\')"'],
  ['Bash', 'python3 -c "import subprocess; subprocess.run([\'firebase\',\'deploy\'])"'],
  ['Bash', '`firebase deploy`'],
  ['Bash', '$(firebase deploy)'],
  ['PowerShell', 'Start-Process firebase -ArgumentList deploy'],
  ['PowerShell', 'Invoke-Expression "firebase deploy"'],
  ['PowerShell', 'iex "firebase deploy"'],
  ['PowerShell', 'powershell -EncodedCommand ' + Buffer.from('firebase deploy', 'utf16le').toString('base64')],
  /* 4) archivos de secretos con comodines, escapes y nombres nuevos */
  ['Bash', 'cat functions/.env.loc*'],
  ['Bash', 'cat functions/.env.l?cal'],
  ['Bash', 'cat functions/.env\\.local'],
  ['Bash', 'cat creds/service-account-prod.json'],
  ['Bash', 'cat ~/.config/gcloud/legacy_credentials/x/adc.json'],
  ['Bash', 'sqlite3 ~/.config/gcloud/access_tokens.db .dump'],
  ['Bash', 'cat ~/.config/gcloud/credentials.db'],
];
for (const [h, c] of NUEVO_DENY) check(`NUEVO deny (${h}): ${c.slice(0, 64)}`, d(h, c) === 'deny', d(h, c));

/* Endurecido de ASK a DENY: el `node -e` con spawnSync que la guardia anterior solo «preguntaba». */
const NUEVO_DENY_DESDE_ASK = [
  ['Bash', 'node -e "require(\'child_process\').spawnSync(\'firebase\',[\'deploy\'])"'],
];
for (const [h, c] of NUEVO_DENY_DESDE_ASK) check(`endurecido a deny (${h}): ${c.slice(0, 54)}`, d(h, c) === 'deny', d(h, c));

/* Regresión: envoltorios e intérpretes que la guardia anterior YA cubría. Deben seguir en deny
   (el rediseño estructural no debe perder lo que la versión por listas ya detectaba). */
const REGRESION_DENY = [
  ['Bash', 'bunx firebase-tools deploy'],
  ['Bash', 'nohup firebase deploy'],
  ['Bash', 'nice -n 10 firebase deploy'],
  ['Bash', 'command firebase deploy'],
  ['Bash', 'exec firebase deploy'],
  ['Bash', 'stdbuf -oL firebase deploy'],
  ['Bash', 'time firebase deploy'],
];
for (const [h, c] of REGRESION_DENY) check(`regresión deny (${h}): ${c.slice(0, 54)}`, d(h, c) === 'deny', d(h, c));

/* ── H. Casos nuevos que PREGUNTAN (ask) ────────────────────────────────── */
const NUEVO_ASK = [
  /* escrituras por Bash en rutas que settings.json protege con `ask` para Edit */
  ['Bash', "node -e \"fs.writeFileSync('.claude/settings.json','x')\""],
  ['Bash', 'cp /dev/null .claude/hooks/guardia.mjs'],
  ['Bash', 'echo x > .firebaserc'],
  ['Bash', 'sed -i s/a/b/ functions/src/credits/creditEngine.ts'],
  ['Bash', 'tee functions/src/core/financial/libro.ts < nuevo.ts'],
  /* lecturas de datos de personas que docs/HARNESS.md asigna al dueño */
  ['Bash', 'firebase auth:export users.json'],
  ['Bash', 'firebase functions:log'],
  ['Bash', 'npm --prefix functions run logs'],
  ['Bash', 'node ops/reconciliacion/reservas-colgadas.mjs'],
  ['Bash', 'gcloud firestore export gs://get-wee-backups/x'],
  ['Bash', 'node scripts/copias.mjs cubo --crear'],
  ['Bash', 'node scripts/copias.mjs diaria --confirmo-aislado'],
];
for (const [h, c] of NUEVO_ASK) check(`NUEVO ask (${h}): ${c.slice(0, 64)}`, d(h, c) === 'ask', d(h, c));

/* ── I. Casos legítimos que NO se deben bloquear (quedan en 'pasa') ──────── */
const NUEVO_LEGIT = [
  ['Bash', 'git commit -m "explica por qué firebase deploy queda prohibido"'],
  ['Bash', 'grep -rn "firebase deploy" docs'],
  ['Bash', "rg 'secrets:access' functions/src"],
  ['Bash', 'echo "firebase deploy"'],
  ['Bash', 'cat docs/SECURITY.md'],
  ['Bash', 'for f in a b c; do echo $f; done'],
  ['Bash', 'git commit -m "$(date)"'],
  ['Bash', 'firebase projects:list --format=$FORMAT'],
  ['Bash', 'firebase emulators:exec --only firestore --project demo-wee "node functions/test/x.emulator.mjs"'],
  ['Bash', 'echo hola | cat'],
  ['Bash', 'xargs firebase'],
];
for (const [h, c] of NUEVO_LEGIT) check(`NUEVO pasa (${h}): ${c.slice(0, 64)}`, d(h, c) === 'pasa', d(h, c));

/* ── J. SABOTAJE persistente: la guardia ANTERIOR (cb8d7e6) dejaba pasar lo nuevo ─ */
/* Se escribe la versión de cb8d7e6 en un temporal, se importa y se compara: demuestra que cada
   caso nuevo es REAL (la anterior no lo bloqueaba) y que la nueva sí. Si alguien revierte el
   endurecimiento, este bloque falla. */
const viejoSrc = spawnSync('git', ['show', 'cb8d7e6:.claude/hooks/guardia.mjs'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
if (viejoSrc.status !== 0 || !viejoSrc.stdout) {
  check('sabotaje: se pudo leer la guardia anterior (git show cb8d7e6)', false, (viejoSrc.stderr || '').slice(0, 120));
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardia-vieja-'));
  const archivoViejo = path.join(dir, 'guardia-cb8d7e6.mjs');
  fs.writeFileSync(archivoViejo, viejoSrc.stdout);
  const vieja = await import(pathToFileURL(archivoViejo).href);
  const dV = (h, c) => vieja.analizarTexto(h, c).decision || 'pasa';

  /* La anterior DEJABA PASAR (null) estos casos que ahora se bloquean. */
  let colados = 0; let bloqueadosNuevo = 0;
  for (const [h, c] of [...NUEVO_DENY, ...NUEVO_ASK]) {
    if (dV(h, c) === 'pasa') colados++;
    if (d(h, c) !== 'pasa') bloqueadosNuevo++;
  }
  const total = NUEVO_DENY.length + NUEVO_ASK.length;
  check(`sabotaje: la guardia anterior dejaba pasar los casos nuevos (${colados}/${total})`, colados === total,
    `colados=${colados}, total=${total}`);
  check(`sabotaje: la guardia nueva bloquea los casos nuevos (${bloqueadosNuevo}/${total})`, bloqueadosNuevo === total);

  /* El `node -e`+spawnSync: la anterior NO lo denegaba (lo preguntaba); la nueva sí. */
  for (const [h, c] of NUEVO_DENY_DESDE_ASK) {
    check(`sabotaje: antes ≠ deny, ahora = deny (${c.slice(0, 44)})`, dV(h, c) !== 'deny' && d(h, c) === 'deny',
      `antes=${dV(h, c)} ahora=${d(h, c)}`);
  }

  /* Regresión: lo que la anterior YA bloqueaba sigue bloqueado en las dos. */
  let regOk = 0;
  for (const [h, c] of REGRESION_DENY) if (dV(h, c) === 'deny' && d(h, c) === 'deny') regOk++;
  check(`sabotaje: los envoltorios que la anterior ya cubría siguen en deny (${regOk}/${REGRESION_DENY.length})`,
    regOk === REGRESION_DENY.length);

  /* Las DOS versiones permiten los legítimos (el endurecimiento no rompe el trabajo diario). */
  let okViejo = 0; let okNuevo = 0;
  for (const [h, c] of NUEVO_LEGIT) {
    if (dV(h, c) === 'pasa') okViejo++;
    if (d(h, c) === 'pasa') okNuevo++;
  }
  check(`sabotaje: las dos versiones permiten los legítimos (vieja ${okViejo}/${NUEVO_LEGIT.length}, nueva ${okNuevo}/${NUEVO_LEGIT.length})`,
    okViejo === NUEVO_LEGIT.length && okNuevo === NUEVO_LEGIT.length);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* da igual */ }
}

/* ── K. Falla CERRADA ante una excepción interna ────────────────────────── */
const conFallo = spawnSync(process.execPath, [HOOK], {
  input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }),
  encoding: 'utf8', timeout: 15000, env: { ...process.env, GUARDIA_PRUEBA_FALLO: '1' },
});
let salidaFallo = null;
try { salidaFallo = JSON.parse(conFallo.stdout); } catch { salidaFallo = null; }
check('ante una excepción interna, la guardia DENIEGA y sale con código 2',
  conFallo.status === 2 && salidaFallo && salidaFallo.hookSpecificOutput
  && salidaFallo.hookSpecificOutput.permissionDecision === 'deny',
  `status=${conFallo.status} out=${conFallo.stdout.slice(0, 80)}`);
check('la función pura también falla cerrada (deny) ante un error',
  (() => { const g = { ...process.env }; process.env.GUARDIA_PRUEBA_FALLO = '1';
    const r = analizarTexto('Bash', 'git status'); process.env = g; return r.decision === 'deny'; })());

/* ── L. La herramienta Monitor se analiza como Bash ─────────────────────── */
const monDeny = correr({ tool_name: 'Monitor', tool_input: { command: 'firebase deploy --only functions', description: 'x', timeout_ms: 1000 } });
let salidaMon = null;
try { salidaMon = JSON.parse(monDeny.stdout); } catch { salidaMon = null; }
check('Monitor con un despliegue dentro se deniega',
  monDeny.status === 0 && salidaMon && salidaMon.hookSpecificOutput
  && salidaMon.hookSpecificOutput.permissionDecision === 'deny', monDeny.stdout.slice(0, 80));
const monLibre = correr({ tool_name: 'Monitor', tool_input: { command: 'npm --prefix functions run build', description: 'x' } });
check('Monitor con un comando normal no produce salida', monLibre.status === 0 && monLibre.stdout.trim() === '');

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
