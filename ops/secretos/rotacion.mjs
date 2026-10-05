#!/usr/bin/env node
/*
 * LA ROTACIÓN DE LAS CLAVES EXPUESTAS — plan y comandos, SOLO IMPRESOS.
 *
 *   node ops/secretos/rotacion.mjs                         el orden, y por qué
 *   node ops/secretos/rotacion.mjs comandos <grupo> <N>    los comandos de un grupo con la versión nueva N
 *                                                          (grupos: r2, gemini, ark, bfl, deepseek)
 *
 * Este script no ejecuta nada ni lee ningún valor: imprime lo que el dueño
 * ejecuta, línea a línea, desde su terminal (docs/SECURITY.md §4 y §5). Quién
 * monta cada secreto sale del código COMPILADO (`functions/lib`), que es lo que
 * se despliega; functions/test/rotacion-secretos.test.mjs comprueba que coincide
 * con lo que la auditoría H0 vio vivo en producción. Las funciones que el código
 * monta pero AÚN NO se despliegan (ops/despliegue/grupos.json → no_se_despliegan,
 * p. ej. evalRun) NO son servicios de Cloud Run, así que la rotación no las toca:
 * `serviciosQueMontan` las aparta (si no, `gcloud run services update <esa>` fallaría).
 *
 * Por qué NO `firebase functions:secrets:set`: con un secreto que gestiona
 * Firebase pregunta si redesplegar y destruir la versión vieja, y por defecto es
 * Sí. Destruida, no hay marcha atrás. Aquí la versión vieja se conserva hasta
 * haber verificado, se deshabilita después (reversible) y se destruye la última.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PROYECTO = 'get-wee';
export const REGION = 'us-central1';
export const DIAS_ANTES_DE_DESTRUIR = 7;

/**
 * EL ORDEN. Primero lo más expuesto con el menor radio (valida el procedimiento
 * en un servicio que ninguna persona usa); después las claves con gasto, de la
 * más usada a la menos. Una a una: si algo falla, se sabe qué fue.
 */
export const ROTACIONES = [
  {
    grupo: 'r2',
    secretos: ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
    proveedor: 'Cloudflare (token de R2)',
    canario: 'mediaCanary',
    porque: 'El NOMBRE del token está en el registro de auditoría de Google Cloud (400 días, no se borra) y el Secret Access Key de R2 es el SHA-256 del token: quien vea el nombre puede calcularlo. Solo lo monta mediaCanary y ningún cliente usa R2: el radio más pequeño, así que valida el procedimiento sin tocar a nadie.',
    verificar: 'scripts/canary-medios.mjs subir … --ejecutar escribe un objeto de prueba en R2 (mira su cabecera).',
  },
  {
    grupo: 'gemini',
    secretos: ['GEMINI_API_KEY'],
    proveedor: 'Google AI Studio (Gemini)',
    canario: 'brainChat',
    porque: 'Estaba en functions/.env.local, que viajó en el zip de 30 funciones. Es la más usada (texto, búsqueda, visión, imagen, avatar) y su gasto va a la cuenta de facturación. Verificarla cuesta un mensaje.',
    verificar: 'Un mensaje a Weë Brain desde la app; en aiGenerations, provider gemini sin error; en AI Studio, uso de la clave NUEVA.',
  },
  {
    grupo: 'ark',
    secretos: ['ARK_API_KEY'],
    proveedor: 'BytePlus ModelArk (Seedance)',
    canario: 'generateVideo',
    porque: 'Estaba en el mismo zip. Es la más cara por llamada (vídeo). La monta también barridoDeLiquidacion, que solo CONSULTA tareas ya lanzadas.',
    verificar: 'Un vídeo, el más corto, desde Weë Studio; en ModelArk, uso de la clave NUEVA. El barrido se verifica solo en su siguiente pasada con tareas pendientes (sin errores 401 en sus logs).',
  },
  {
    grupo: 'bfl',
    secretos: ['BFL_API_KEY'],
    proveedor: 'Black Forest Labs (Flux)',
    canario: 'creatorRun',
    porque: 'Estaba en el mismo zip. Genera imágenes con gasto.',
    verificar: 'Una imagen desde Weë AI que el router mande a Flux (aiGenerations dice qué proveedor la hizo); en el panel de BFL, uso de la clave NUEVA.',
  },
  {
    grupo: 'deepseek',
    secretos: ['DEEPSEEK_API_KEY'],
    proveedor: 'DeepSeek',
    canario: 'brainChat',
    porque: 'Estaba en el mismo zip. Es la menos usada (texto, de respaldo). Es el secreto que gestiona Firebase: la trampa de secrets:set es justo aquí.',
    verificar: 'En el panel de DeepSeek, uso de la clave NUEVA cuando el router la elija; sin errores 401 en los logs.',
    aviso: 'Lo gestiona Firebase: NUNCA `firebase functions:secrets:set DEEPSEEK_API_KEY` (destruiría la versión vieja en el acto).',
  },
];

/** Quién monta cada secreto, leído de los endpoints compilados (`__endpoint.secretEnvironmentVariables`). */
export const montajes = (compilado) => {
  const porSecreto = {};
  for (const [funcion, f] of Object.entries(compilado)) {
    for (const s of (f && f.__endpoint && f.__endpoint.secretEnvironmentVariables) || []) (porSecreto[s.key] ||= []).push(funcion);
  }
  for (const k of Object.keys(porSecreto)) porSecreto[k].sort();
  return porSecreto;
};

/** Las funciones que el código monta pero aún NO se despliegan (ops/despliegue/grupos.json): no son servicios de Cloud Run. */
const sinDesplegar = () => new Set(JSON.parse(fs.readFileSync(path.join(RAIZ, 'ops/despliegue/grupos.json'), 'utf8')).no_se_despliegan.map((n) => n.funcion));

/**
 * Los servicios VIVOS que montan unos secretos: lo que el código monta MENOS lo que aún no se despliega. La rotación
 * actualiza revisiones de Cloud Run, así que solo puede tocar funciones desplegadas; una que el código monta pero que
 * no está en producción (p. ej. evalRun, de F2-C1) haría fallar `gcloud run services update`.
 */
export const serviciosQueMontan = (mapa, secretos) => {
  const fuera = sinDesplegar();
  return [...new Set(secretos.flatMap((s) => mapa[s] || []))].filter((f) => !fuera.has(f)).sort();
};

const servicio = (funcion) => funcion.toLowerCase();
const dondeCorre = `--region ${REGION} --project ${PROYECTO}`;

/**
 * Los comandos de un grupo, por fases. El canario va primero y solo; el resto,
 * después de verificarlo. Revocar en el proveedor, después de verificar todo.
 * Deshabilitar, después de revocar. Destruir, lo último y tras días en verde.
 */
export const comandosDeRotacion = (rotacion, version, funciones) => {
  /* R2: las dos piezas de la credencial van juntas, y cada una tiene SU número de versión: no se adivina uno común. */
  if (rotacion.secretos.length > 1 && !Array.isArray(version)) throw new Error(`${rotacion.grupo} lleva una versión por secreto (${rotacion.secretos.join(', ')}): «4,3»`);
  const versiones = (Array.isArray(version) ? version : [version]).map(String);
  if (versiones.length !== rotacion.secretos.length || versiones.some((v) => !/^[1-9]\d*$/.test(v))) {
    throw new Error(`versión inválida: ${versiones.join(',')} (el número que te dio Secret Manager, uno por secreto)`);
  }
  if (!funciones.includes(rotacion.canario)) throw new Error(`el canario ${rotacion.canario} no monta ${rotacion.secretos.join(', ')}`);
  const actualizar = rotacion.secretos.map((s, i) => `${s}=${s}:${versiones[i]}`).join(',');
  const resto = funciones.filter((f) => f !== rotacion.canario);
  const fases = [];
  fases.push({ fase: '0 · Antes: anota la revisión que sirve y la versión que monta cada servicio (para volver)', lineas: funciones.map((f) =>
    `gcloud run services describe ${servicio(f)} ${dondeCorre} --format="value(status.traffic[0].revisionName,spec.template.spec.containers[0].env)"`) });
  fases.push({ fase: `1 · Crea la clave nueva en ${rotacion.proveedor} y añade la versión en la consola de Secret Manager (nunca en el chat ni en la línea de comandos)`, lineas: [
    `# Secret Manager → ${rotacion.secretos.join(' y ')} → Nueva versión. Anota el número: aquí, ${versiones.join(' y ')}.`] });
  fases.push({ fase: `2 · Solo el canario (${rotacion.canario}): misma imagen, revisión nueva con la versión ${versiones.join('/')}`, lineas: [
    `gcloud run services update ${servicio(rotacion.canario)} ${dondeCorre} --update-secrets ${actualizar}`] });
  fases.push({ fase: '3 · Verifica el canario antes de seguir', lineas: [`# ${rotacion.verificar}`,
    `gcloud run services describe ${servicio(rotacion.canario)} ${dondeCorre} --format="value(spec.template.spec.containers[0].env)"`] });
  if (resto.length) fases.push({ fase: `4 · El resto (${resto.length}), uno a uno`, lineas: resto.map((f) => `gcloud run services update ${servicio(f)} ${dondeCorre} --update-secrets ${actualizar}`) });
  fases.push({ fase: '5 · Verifica de nuevo y espera 24 h sin errores de autenticación del proveedor en los logs', lineas: [`# ${rotacion.verificar}`] });
  fases.push({ fase: `6 · Revoca la clave VIEJA en ${rotacion.proveedor}. Es lo que cierra la fuga: la vieja sigue en zips antiguos`, lineas: [
    '# En la consola del proveedor. Desde aquí, volver a una revisión de antes ya no sirve: arregla hacia delante con una versión nueva.'] });
  fases.push({ fase: '7 · Deshabilita la versión vieja (reversible: `versions enable` la recupera)', lineas: rotacion.secretos.map((s) =>
    `gcloud secrets versions disable <versión vieja de ${s}> --secret ${s} --project ${PROYECTO}`) });
  fases.push({ fase: `8 · Destrúyela tras ${DIAS_ANTES_DE_DESTRUIR} días sin incidencias. IRREVERSIBLE`, lineas: rotacion.secretos.map((s) =>
    `gcloud secrets versions destroy <versión vieja de ${s}> --secret ${s} --project ${PROYECTO}`) });
  fases.push({ fase: '9 · Actualiza ops/produccion.json en un PR con las revisiones nuevas', lineas: [
    '# Las revisiones de antes de la rotación montan la versión vieja: `marcha-atras --al-mapa` tiene que volver a revisiones POSTERIORES.'] });
  fases.push({ fase: 'Marcha atrás (solo antes de la fase 6): el tráfico a la revisión anotada en la fase 0', lineas: funciones.map((f) =>
    `gcloud run services update-traffic ${servicio(f)} ${dondeCorre} --to-revisions <revisión anotada de ${servicio(f)}>=100`) });
  return fases;
};

const imprimirPlan = () => {
  console.log('ROTACIÓN DE LAS CLAVES EXPUESTAS — en este orden, una a una (docs/SECURITY.md §4 y §5).\n');
  ROTACIONES.forEach((r, i) => {
    console.log(`${i + 1}. ${r.grupo.toUpperCase()} — ${r.secretos.join(' + ')} (${r.proveedor})`);
    console.log(`   Por qué aquí: ${r.porque}`);
    console.log(`   Canario: ${r.canario}. Verificar: ${r.verificar}`);
    if (r.aviso) console.log(`   ⚠ ${r.aviso}`);
    console.log('');
  });
  console.log('Comandos de cada una: node ops/secretos/rotacion.mjs comandos <grupo> <versión nueva>  (R2: dos versiones, «4,3»).');
  console.log('Lo que NO se rota: ELEVENLABS, ANTHROPIC, OPENAI, MINIMAX y SEEDANCE_CALLBACK_TOKEN no estaban en el portátil (H0): solo viven en Secret Manager.');
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [orden, grupo, version] = process.argv.slice(2);
  if (!orden) imprimirPlan();
  else if (orden === 'comandos') {
    const rotacion = ROTACIONES.find((r) => r.grupo === grupo);
    if (!rotacion) { console.log(`✘ grupo desconocido: ${grupo} (${ROTACIONES.map((r) => r.grupo).join(', ')})`); process.exit(1); }
    const require = createRequire(import.meta.url);
    const mapa = montajes(require(path.join(RAIZ, 'functions/lib/index.js')));
    const funciones = serviciosQueMontan(mapa, rotacion.secretos);
    const versiones = String(version || '').split(',');
    try {
      const fases = comandosDeRotacion(rotacion, versiones.length > 1 ? versiones : versiones[0], funciones);
      if (rotacion.aviso) console.log(`⚠ ${rotacion.aviso}\n`);
      for (const { fase, lineas } of fases) { console.log(`── ${fase}`); for (const l of lineas) console.log(l); console.log(''); }
    } catch (e) { console.log(`✘ ${e.message}`); process.exit(1); }
  } else { console.log(`✘ orden desconocida: ${orden}`); process.exit(1); }
}
