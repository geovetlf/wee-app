/*
 * LA ROTACIÓN DE LAS CLAVES EXPUESTAS — `ops/secretos/rotacion.mjs` y docs/SECURITY.md §4–§5.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * La rotación la hace el dueño, con comandos que imprime el script. Si el
 * script se equivoca de servicio, una función se queda con la clave revocada;
 * si se salta el canario o destruye antes de verificar, no hay vuelta atrás.
 * Esta suite fija:
 *
 *  · quién monta cada secreto: el código compilado tiene que coincidir con lo
 *    que la auditoría H0 vio VIVO (si cambia un binding, hay que revisar la
 *    rotación antes de hacerla);
 *  · el orden y el porqué, el canario primero, revocar después de verificar,
 *    deshabilitar antes de destruir, y destruir lo último;
 *  · que el script solo imprime: ni ejecuta, ni lee valores, ni usa
 *    `firebase functions:secrets:set` (que destruye la versión vieja en el acto).
 */
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const require = createRequire(import.meta.url);

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const rot = await import(pathToFileURL(path.resolve(RAIZ, 'ops/secretos/rotacion.mjs')).href);
const compilado = require(path.resolve(RAIZ, 'functions/lib/index.js'));
const { PROVIDER_SECRET_NAMES, MEDIA_SECRET_NAMES } = require(path.resolve(RAIZ, 'functions/lib/secrets.js'));

/* ── A. Quién monta qué: el código contra lo vivo (H0, 2026-09-30) ──────── */
const NUEVE = ['avatarReplacement', 'brainChat', 'brainQuote', 'creatorChat', 'creatorQuote', 'creatorRun', 'engineAdmin', 'generateAvatarWithGemini', 'generateVideo'];
const VIVO_H0 = {
  ANTHROPIC_API_KEY: NUEVE, BFL_API_KEY: NUEVE, DEEPSEEK_API_KEY: NUEVE, ELEVENLABS_API_KEY: NUEVE, GEMINI_API_KEY: NUEVE, MINIMAX_API_KEY: NUEVE, OPENAI_API_KEY: NUEVE,
  ARK_API_KEY: [...NUEVE, 'barridoDeLiquidacion'].sort(),
  SEEDANCE_CALLBACK_TOKEN: [...NUEVE, 'seedanceCallback'].sort(),
  R2_ACCESS_KEY_ID: ['mediaCanary'], R2_SECRET_ACCESS_KEY: ['mediaCanary'],
};
/*
 * ── EL MAPA DEL CÓDIGO YA NO ES EL VIVO (cierre post-auditoría 2026-10-01, money/secretos-de-mas) ──
 *
 * Cada función monta ahora SOLO lo que lee (functions/src/secrets.ts): el avatar, solo Gemini
 * (`AVATAR_SECRETS`); las que llaman al Router sin crear vídeo, las ocho de modelo sin el token del
 * webhook (`MODEL_SECRETS`); y el token se queda en las dos que crean tareas de Seedance
 * (`creatorRun`, `generateVideo`) y en el webhook. VIVO_H0 sigue siendo lo que Cloud Run monta HOY;
 * cambiará en el próximo despliegue de esas funciones. Hasta entonces el mapa vivo es un SUPERCONJUNTO
 * del código: una rotación hecha ANTES de desplegar dejaría servicios montando la versión vieja de una
 * clave que su código ya no lista. Por eso (1) fija el mapa del código con la misma exactitud que antes
 * y (1b) fija que la diferencia con lo vivo es EXACTAMENTE la retirada prevista MÁS la única función nueva
 * aún sin desplegar (evalRun, F2-C1), que monta los ocho secretos de modelo; cualquier otra diferencia falla.
 *
 * F2-C1: `evalRun` —el corredor de evaluaciones del Model Router, de ADMINISTRACIÓN— monta los OCHO secretos
 * de modelo (`MODEL_SECRETS`) porque reutiliza el motor vivo. No crea vídeo (sin SEEDANCE_CALLBACK_TOKEN) ni
 * toca R2, y NO está desplegada (ops/despliegue/grupos.json → no_se_despliegan): no corre en producción, así
 * que una rotación no la deja con una versión vieja; por eso la añade al mapa del CÓDIGO y 1b la cuenta aparte.
 */
const AVATAR = ['avatarReplacement', 'generateAvatarWithGemini'];
const SIETE = NUEVE.filter((f) => !AVATAR.includes(f));
const conEval = (l) => [...l, 'evalRun'].sort();
const CODIGO = {
  ANTHROPIC_API_KEY: conEval(SIETE), BFL_API_KEY: conEval(SIETE), DEEPSEEK_API_KEY: conEval(SIETE), ELEVENLABS_API_KEY: conEval(SIETE), MINIMAX_API_KEY: conEval(SIETE), OPENAI_API_KEY: conEval(SIETE),
  GEMINI_API_KEY: conEval(NUEVE),
  ARK_API_KEY: conEval([...SIETE, 'barridoDeLiquidacion']),
  SEEDANCE_CALLBACK_TOKEN: ['creatorRun', 'generateVideo', 'seedanceCallback'],
  R2_ACCESS_KEY_ID: ['mediaCanary'], R2_SECRET_ACCESS_KEY: ['mediaCanary'],
};
const montajes = rot.montajes(compilado);
const distintos = Object.keys({ ...CODIGO, ...montajes }).filter((k) => JSON.stringify(montajes[k] || []) !== JSON.stringify(CODIGO[k] || []));
check('1) quién monta cada secreto en el código compilado es exactamente el mapa previsto (si cambia, revisa la rotación antes de hacerla)',
  distintos.length === 0, distintos.map((k) => `${k}: ${JSON.stringify(montajes[k] || [])}`).join(' | ') || `${Object.keys(montajes).length} secretos`);
const retirados = Object.fromEntries(Object.keys(VIVO_H0).map((k) => [k, VIVO_H0[k].filter((f) => !(CODIGO[k] || []).includes(f))]).filter(([, l]) => l.length));
const anadidos = Object.keys(CODIGO).flatMap((k) => CODIGO[k].filter((f) => !(VIVO_H0[k] || []).includes(f)).map((f) => `${k}→${f}`));
/* F2-C1: lo único añadido frente a H0 es evalRun en los ocho secretos de modelo, y tiene que estar SIN desplegar. */
const MODELO = ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'GEMINI_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY'];
const noDesplegadas = JSON.parse(leer('ops/despliegue/grupos.json')).no_se_despliegan.map((n) => n.funcion);
check('1b) frente a lo vivo (H0): se RETIRA lo previsto (el token de las cinco que no crean vídeo; el avatar se queda con Gemini) y se AÑADE solo evalRun, en los ocho secretos de modelo y SIN desplegar',
  anadidos.sort().join(',') === MODELO.map((k) => `${k}→evalRun`).sort().join(',')
  && noDesplegadas.includes('evalRun')
  && JSON.stringify(retirados.SEEDANCE_CALLBACK_TOKEN) === JSON.stringify(['avatarReplacement', 'brainChat', 'brainQuote', 'creatorChat', 'creatorQuote', 'engineAdmin', 'generateAvatarWithGemini'])
  && ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY'].every((k) => JSON.stringify(retirados[k]) === JSON.stringify(AVATAR))
  && Object.keys(retirados).length === 8,
  JSON.stringify({ retirados, anadidos }));
/* F2-C1: evalRun monta los secretos de modelo en el CÓDIGO, pero no es un servicio de Cloud Run; la rotación lo aparta. */
const geminiVivas = rot.serviciosQueMontan(montajes, ['GEMINI_API_KEY']);
check('1c) y esa función nueva (evalRun) NO es un servicio de Cloud Run: la rotación la aparta, aunque el código la monte',
  montajes.GEMINI_API_KEY.includes('evalRun') && !geminiVivas.includes('evalRun') && geminiVivas.length === NUEVE.length,
  geminiVivas.join(', '));
const seguridad = leer('docs/SECURITY.md');
const servicios = [...new Set(Object.values(VIVO_H0).flat())].map((f) => f.toLowerCase());
check('2) docs/SECURITY.md §2 nombra los 12 servicios que montan secretos', servicios.length === 12 && servicios.every((s) => seguridad.includes(s)),
  servicios.filter((s) => !seguridad.includes(s)).join(', ') || '12');

/* ── B. El orden y lo que no se rota ─────────────────────────────────────── */
const grupos = rot.ROTACIONES.map((r) => r.grupo);
check('3) el orden: primero R2 (lo más expuesto, el radio más pequeño), luego las claves con gasto de la más usada a la menos',
  JSON.stringify(grupos) === JSON.stringify(['r2', 'gemini', 'ark', 'bfl', 'deepseek']), grupos.join(' → '));
const rotados = rot.ROTACIONES.flatMap((r) => r.secretos);
check('4) cada secreto que se rota existe en functions/src/secrets.ts', rotados.every((s) => PROVIDER_SECRET_NAMES.includes(s) || MEDIA_SECRET_NAMES.includes(s)), rotados.join(', '));
const noRotados = [...PROVIDER_SECRET_NAMES, ...MEDIA_SECRET_NAMES].filter((s) => !rotados.includes(s)).sort();
check('5) lo que no se rota es exactamente lo que nunca estuvo en el portátil (H0), y el script lo dice',
  JSON.stringify(noRotados) === JSON.stringify(['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'SEEDANCE_CALLBACK_TOKEN'])
  && /ELEVENLABS, ANTHROPIC, OPENAI, MINIMAX y SEEDANCE_CALLBACK_TOKEN/.test(leer('ops/secretos/rotacion.mjs')), noRotados.join(', '));
check('6) cada rotación tiene su porqué, su verificación, y un canario que de verdad monta sus secretos',
  rot.ROTACIONES.every((r) => r.porque.length > 40 && r.verificar.length > 20 && r.secretos.every((s) => (montajes[s] || []).includes(r.canario))));
check('7) DeepSeek, el secreto que gestiona Firebase, lleva el aviso de secrets:set', /NUNCA `firebase functions:secrets:set/.test(rot.ROTACIONES.find((r) => r.grupo === 'deepseek').aviso || ''));

/* ── C. Los comandos ─────────────────────────────────────────────────────── */
const gemini = rot.ROTACIONES.find((r) => r.grupo === 'gemini');
/* Los servicios VIVOS que montan GEMINI (sin evalRun, que no está desplegada): lo que la rotación de verdad toca. */
const fases = rot.comandosDeRotacion(gemini, 2, geminiVivas);
const lineas = fases.flatMap((f) => f.lineas);
const titulos = fases.map((f) => f.fase);
const posDe = (re) => titulos.findIndex((t) => re.test(t));
const actualizaciones = lineas.filter((l) => /^gcloud run services update /.test(l));
check('8) el canario se actualiza primero y solo; después, uno a uno, los otros 8; todos con la versión nueva fijada',
  actualizaciones.length === 9 && actualizaciones[0].startsWith('gcloud run services update brainchat ')
  && actualizaciones.every((l) => l.endsWith('--update-secrets GEMINI_API_KEY=GEMINI_API_KEY:2')) && posDe(/^2 · Solo el canario/) < posDe(/^4 · El resto/));
check('9) verificar va antes de revocar, revocar antes de deshabilitar, y deshabilitar antes de destruir (lo último, irreversible, tras 7 días)',
  posDe(/^3 · Verifica el canario/) < posDe(/^4 /) && posDe(/^5 · Verifica de nuevo/) < posDe(/^6 · Revoca/) && posDe(/^6 /) < posDe(/^7 · Deshabilita/)
  && posDe(/^7 /) < posDe(/^8 · Destrúyela tras 7 días.*IRREVERSIBLE/) && rot.DIAS_ANTES_DE_DESTRUIR === 7);
check('10) la marcha atrás vuelve a la revisión anotada ANTES, y solo vale antes de revocar',
  posDe(/^0 · Antes: anota la revisión/) === 0 && /solo antes de la fase 6/.test(titulos.at(-1))
  && fases.at(-1).lineas.length === 9 && fases.at(-1).lineas.every((l) => /^gcloud run services update-traffic \S+ .*--to-revisions <revisión anotada de \S+>=100$/.test(l)));
check('11) recuerda actualizar ops/produccion.json: las revisiones de antes montan la clave vieja', posDe(/^9 · Actualiza ops\/produccion\.json/) > posDe(/^8 /));
const gclouds = lineas.filter((l) => l.startsWith('gcloud '));
check('12) todo va a get-wee y us-central1 (los secretos, al proyecto)',
  gclouds.length > 20 && gclouds.every((l) => /--project get-wee/.test(l)) && gclouds.filter((l) => /^gcloud run /.test(l)).every((l) => /--region us-central1/.test(l)));
check('13) ningún comando pone un valor en la línea de comandos, lo lee, ni usa secrets:set o deploy',
  !lineas.some((l) => /secrets:set|functions:secrets|firebase deploy|versions access|--data-file|echo .*\|/.test(l)));
const r2 = rot.ROTACIONES.find((r) => r.grupo === 'r2');
const conR2 = rot.comandosDeRotacion(r2, ['4', '3'], montajes.R2_ACCESS_KEY_ID).flatMap((f) => f.lineas);
check('14) R2: las dos piezas de la credencial, juntas y cada una con SU versión, solo en mediacanary',
  conR2.filter((l) => /^gcloud run services update /.test(l)).join('\n')
    === 'gcloud run services update mediacanary --region us-central1 --project get-wee --update-secrets R2_ACCESS_KEY_ID=R2_ACCESS_KEY_ID:4,R2_SECRET_ACCESS_KEY=R2_SECRET_ACCESS_KEY:3');
const lanza = (f) => { try { f(); return null; } catch (e) { return e.message; } };
check('15) no se adivina: R2 con una sola versión, una versión rara o un canario que no monta el secreto, se niegan',
  /una versión por secreto/.test(lanza(() => rot.comandosDeRotacion(r2, '4', montajes.R2_ACCESS_KEY_ID)) || '')
  && /versión inválida/.test(lanza(() => rot.comandosDeRotacion(gemini, '2; rm -rf', montajes.GEMINI_API_KEY)) || '')
  && /versión inválida/.test(lanza(() => rot.comandosDeRotacion(gemini, 0, montajes.GEMINI_API_KEY)) || '')
  && /no monta/.test(lanza(() => rot.comandosDeRotacion(gemini, 2, ['creatorRun'])) || ''));

/* ── D. Solo imprime ─────────────────────────────────────────────────────── */
const fuente = leer('ops/secretos/rotacion.mjs');
check('16) el script no ejecuta nada ni llama a la red', !/child_process|execSync|spawn|execFile|fetch\(/.test(fuente));
const cli = spawnSync(process.execPath, [path.resolve(RAIZ, 'ops/secretos/rotacion.mjs'), 'comandos', 'gemini', '2'], { cwd: RAIZ, encoding: 'utf8' });
const mal = spawnSync(process.execPath, [path.resolve(RAIZ, 'ops/secretos/rotacion.mjs'), 'comandos', 'r2', '4'], { cwd: RAIZ, encoding: 'utf8' });
const plan = spawnSync(process.execPath, [path.resolve(RAIZ, 'ops/secretos/rotacion.mjs')], { cwd: RAIZ, encoding: 'utf8' });
check('17) por línea de comandos: imprime el plan y los comandos, y se niega a lo que no cuadra',
  cli.status === 0 && cli.stdout.includes('gcloud run services update brainchat --region us-central1 --project get-wee --update-secrets GEMINI_API_KEY=GEMINI_API_KEY:2')
  && mal.status === 1 && plan.status === 0 && /1\. R2 —[\s\S]*5\. DEEPSEEK —/.test(plan.stdout));

/* ── E. Documentado y en la cadena ───────────────────────────────────────── */
check('18) docs/SECURITY.md explica el orden y apunta al script', /ops\/secretos\/rotacion\.mjs/.test(seguridad) && /En qué orden/.test(seguridad));
check('19) esta suite está en la cadena de `npm test`', /rotacion-secretos\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
