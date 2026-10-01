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
check('si recibe basura, falla ABIERTO (exit 0, sin decisión) y lo dice por stderr',
  roto.status === 0 && roto.stdout.trim() === '' && /error interno/.test(roto.stderr));

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
check('el hook está enganchado a Bash y PowerShell', Boolean(hook)
  && hook.hooks.some((x) => x.type === 'command' && x.command === 'node' && (x.args || []).some((a) => a.endsWith('.claude/hooks/guardia.mjs'))));
const peligrosas = (perm.allow || []).filter((r) => /deploy|functions:delete|git push|powershell -Command|vercel|eas /i.test(r));
check('ningún allow preaprueba algo peligroso', peligrosas.length === 0, peligrosas.join(', '));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
