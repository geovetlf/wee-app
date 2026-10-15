#!/usr/bin/env node
/*
 * LA COMPROBACIÓN DE ALCANCE DE LA FASE 1 — «WEË AI FUERA DE ALCANCE».
 *
 *   node scripts/alcance-wee-ai.mjs [--base <ref>] [--head <ref>] [--json] [--solo-directo]
 *
 * Lista los archivos que cambia `head` respecto de `base` (por defecto, HEAD contra `integracion/r9-local`) y los
 * clasifica. Sale con 1 si alguno es de Weë AI (o de lo compartido que Weë AI usa para cobrar), con 0 si no.
 *
 *   WEE_AI       el código, los contratos y la configuración de Weë AI: el servidor de la IA (creator, engine, gateway, runtime,
 *                planner, router, registry, evals, settlement), su interfaz (las pantallas de las experiencias, los componentes
 *                de creator y de chef, el servicio y los textos), y sus documentos de arquitectura.
 *   COMPARTIDO   lo que Weë AI usa pero no es suyo: el Core (core/), el Credit Engine (credits/) y las puertas de Weë Studio y Filmmaker
 *                (content, media, filmmaker, productions, shots, elements). Un cambio ahí puede cambiar lo que Weë AI genera, cobra o decide,
 *                así que también se avisa; `--solo-directo` lo deja pasar.
 *   PRUEBA       functions/test/**: se puede cambiar, porque probar Weë AI no lo cambia.
 *   OTRO         todo lo demás (operaciones, CI, scripts, documentos de lanzamiento…).
 *
 * La lista es CONSERVADORA a propósito: ante la duda, un archivo se marca. La fija functions/test/alcance-wee-ai.test.mjs,
 * para que nadie la encoja sin que se note.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const WEE_AI = Object.freeze([
  /* El servidor de Weë AI. */
  /^functions\/src\/(creator|engine|gateway|runtime|planner|router|registry|evals|settlement|brain|orchestrator|workflow|skills|music)\//,
  /* El avatar llama a su proveedor fuera del motor; secrets.ts declara las claves de los proveedores de IA. */
  /^functions\/src\/(generateAvatar|vertexAI|secrets)\.ts$/,
  /* Su interfaz: las pantallas, los componentes, los servicios, los hooks y las constantes de las experiencias. */
  /^screens\/(WeeCreatorScreen|SpecialistScreen|CreatorFlowScreen|BrainChatScreen|ProjectsScreen|ProjectScreen|MisCreacionesScreen|EngineAdminScreen|ChefScreen|BusinessScreen|TravelScreen|MusicScreen)\.tsx$/,
  /^components\/(creator|chef)\//,
  /^components\/(HowIMadeIt|CreditsPill)\.tsx$/,
  /^services\/(creatorService|brainService|creatorUploads|projectsService|assetsService|aiEngineService|creditsService)\.ts$/,
  /^hooks\/(useBrainChat|useCreatorJob|useEspecialista|useWallet)\.ts$/,
  /^constants\/(specialists|weeExperiences|studioExperiences|chefTools|businessMock|aiPrompts)\.ts$/,
  /* Sus textos. */
  /^i18n\/textos\/[^/]+\/(weeai|chef|creator|studio|brain)\.ts$/,
  /^i18n\/textos\/[^/]+\/servidor\/(motor|movimientos|creator)\.ts$/,
  /* Sus documentos de arquitectura. */
  /^docs\/(CREATOR|CREATOR-BUILD|AI-ENGINE|CAPABILITY-MAP|RUNTIME|CORE)\.md$/,
]);

export const COMPARTIDO = Object.freeze([
  /^functions\/src\/(core|credits|financial|job)\//,
  /* El índice declara qué funciones existen (entre ellas las de Weë AI): añadir o quitar una es cambiar Weë AI. */
  /^functions\/src\/index\.ts$/,
  /* Weë Studio y Filmmaker generan con la IA por estas puertas, y «Mis creaciones» guarda lo que sale de ella: no son de Weë AI, pero un cambio ahí puede cambiar lo que se genera, se guarda o se cobra. */
  /^functions\/src\/(content|media|filmmaker|productions|shots|elements)\//,
]);

export const PRUEBA = Object.freeze([/^functions\/test\//]);

/** PURA. La clase de una ruta (con `/` como separador). */
export const clasificar = (ruta) => {
  const r = String(ruta).replace(/\\/g, '/');
  if (WEE_AI.some((re) => re.test(r))) return 'WEE_AI';
  if (COMPARTIDO.some((re) => re.test(r))) return 'COMPARTIDO';
  if (PRUEBA.some((re) => re.test(r))) return 'PRUEBA';
  return 'OTRO';
};

/** PURA. Cuenta y lista por clase. */
export const resumir = (rutas) => {
  const por = { WEE_AI: [], COMPARTIDO: [], PRUEBA: [], OTRO: [] };
  for (const r of rutas) por[clasificar(r)].push(r);
  return por;
};

const git = (args) => spawnSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });

/** Los archivos que cambia `head` respecto de `base` (diff de tres puntos: lo que `head` añade desde su ancestro común). */
export const archivosCambiados = (base, head) => {
  const x = git(['diff', '--name-only', `${base}...${head}`]);
  if (x.status !== 0) throw new Error(`git diff ${base}...${head} falló: ${String(x.stderr).trim().slice(0, 200)}`);
  return String(x.stdout).split('\n').map((l) => l.trim()).filter(Boolean);
};

const esPrincipal = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esPrincipal) {
  const args = process.argv.slice(2);
  const opcion = (k, def) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : def; };
  const base = opcion('--base', 'integracion/r9-local');
  const head = opcion('--head', 'HEAD');
  const soloDirecto = args.includes('--solo-directo');
  let rutas;
  try { rutas = archivosCambiados(base, head); } catch (e) { console.error(`✘ ${e.message}`); process.exit(2); }
  const por = resumir(rutas);
  const prohibidos = [...por.WEE_AI, ...(soloDirecto ? [] : por.COMPARTIDO)];
  if (args.includes('--json')) {
    console.log(JSON.stringify({ base, head, total: rutas.length, ...Object.fromEntries(Object.entries(por).map(([k, v]) => [k, v])) }, null, 2));
  } else {
    console.log(`Alcance de ${head} frente a ${base}: ${rutas.length} archivo(s) · WEE_AI ${por.WEE_AI.length} · COMPARTIDO ${por.COMPARTIDO.length} · PRUEBA ${por.PRUEBA.length} · OTRO ${por.OTRO.length}`);
    for (const k of ['WEE_AI', 'COMPARTIDO']) for (const r of por[k]) console.log(`  ${k.padEnd(10)} ${r}`);
    console.log(prohibidos.length ? `\n✘ ${prohibidos.length} archivo(s) fuera de alcance: hace falta autorización explícita.` : '\n✔ ningún archivo de Weë AI' + (soloDirecto ? '' : ' ni de lo compartido') + ' cambia.');
  }
  process.exit(prohibidos.length ? 1 : 0);
}
