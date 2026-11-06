/*
 * GENERAR LOS MEDIOS DE IA DE LA DEMO — cuesta dinero, y por eso no hace nada sin un tope autorizado.
 *
 *   node scripts/demo/generar-medios.mjs --medios <carpeta>                       → PRESUPUESTO (no llama a nadie)
 *   node scripts/demo/entorno.mjs generar 20 [avatar-01,post-02]                  → genera, hasta ese tope
 *
 * Pasa por los ADAPTADORES del motor (functions/lib/engine/providers), nunca por una API directa. Lo generado se guarda
 * a través del emulador de Storage (FIREBASE_STORAGE_EMULATOR_HOST obligatoria) y se copia a la carpeta de medios.
 *
 * Claves: se piden sin eco en la terminal, solo si hacen falta, y viven en la memoria de este proceso. No se aceptan
 * por argumento, y todo lo que se imprime o se guarda pasa antes por `sinSecretos`.
 *
 * Dinero: `gasto.json` lleva cada intento de TODAS las ejecuciones. El coste previsto se apunta ANTES de llamar y, si
 * termina bien, se cambia por el que mide el adaptador; un intento que falla se queda contado a precio previsto, aunque
 * el proveedor no lo cobre. No hay reintentos automáticos. Lo ya generado no se vuelve a pagar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  MODELO_IMAGEN, MODELO_VIDEO, TOPE_ABSOLUTO_USD, cabeOtroIntento, costePrevisto, decidirGeneracion, gastoAcumulado, planDeMedios, presupuesto, sinSecretos,
} from './medios.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const valor = (argv, b) => { const i = argv.indexOf(b); return i >= 0 ? argv[i + 1] : undefined; };
const EXTENSION = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm' };
const TIMEOUT_MS = 10 * 60 * 1000;
const FALLOS_SEGUIDOS_MAXIMOS = 3;
const CLAVES = { imagen: 'GEMINI_API_KEY', video: 'ARK_API_KEY' };

/* Lee una línea sin enseñarla. */
const pedirSinEco = (pregunta) => new Promise((resolver, rechazar) => {
  if (!process.stdin.isTTY) { rechazar(new Error('Las claves se piden en una terminal.')); return; }
  process.stdout.write(pregunta);
  let texto = '';
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  const alLeer = (trozo) => {
    for (const c of trozo) {
      if (c === '\u0003') { process.stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130); }
      if (c === '\r' || c === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', alLeer);
        process.stdout.write('\n');
        resolver(texto.trim());
        return;
      }
      if (c === '\u007f' || c === '\b') texto = texto.slice(0, -1); else texto += c;
    }
  };
  process.stdin.on('data', alLeer);
});

export const principal = async (argv = process.argv.slice(2), env = process.env, dependencias = {}) => {
  const carpeta = valor(argv, '--medios');
  if (!carpeta) { console.error('✘ Falta --medios <carpeta>.'); return 2; }
  fs.mkdirSync(carpeta, { recursive: true });
  const rutaRegistro = path.join(carpeta, 'registro.json');
  const rutaLibro = path.join(carpeta, 'gasto.json');
  const registro = fs.existsSync(rutaRegistro) ? JSON.parse(fs.readFileSync(rutaRegistro, 'utf8')) : {};
  const libro = fs.existsSync(rutaLibro) ? JSON.parse(fs.readFileSync(rutaLibro, 'utf8')) : { intentos: [] };
  const plan = planDeMedios();
  const coste = presupuesto(plan, registro);
  console.log(`Pendiente: ${coste.imagenes} imágenes (${coste.usdImagenes.toFixed(2)} USD) · ${coste.videos} vídeos (${coste.usdVideos.toFixed(2)} USD) · total ${coste.usd.toFixed(2)} USD a precio de lista.`);
  console.log(`Gastado o reservado hasta ahora: ${gastoAcumulado(libro).toFixed(2)} de ${TOPE_ABSOLUTO_USD} USD.`);
  if (!argv.includes('--ejecutar')) { console.log('PRESUPUESTO: no se ha llamado a ningún proveedor.'); return 0; }

  const decision = decidirGeneracion({ argv, env });
  if (!decision.ok) { console.error(`✘ ${decision.motivo}`); return 2; }

  /* `--solo imagenes` no deja pasar ningún vídeo; si no, una lista de ranuras. */
  const soloImagenes = valor(argv, '--solo') === 'imagenes';
  const solo = valor(argv, '--solo') && !soloImagenes ? new Set(valor(argv, '--solo').split(',').map((s) => s.trim()).filter(Boolean)) : null;
  /* Primero las imágenes: los vídeos parten de su miniatura. */
  const pendientes = plan
    .filter((m) => m.origen === 'ia' && !(registro[m.id] && registro[m.id].origen === 'ia') && (!solo || solo.has(m.id)) && (!soloImagenes || m.tipo === 'imagen'))
    .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'imagen' ? -1 : 1));
  if (!pendientes.length) { console.log('Nada que generar.'); return 0; }

  /* Las claves: solo las que hacen falta, sin eco. */
  const secretos = [];
  for (const tipo of new Set(pendientes.map((m) => m.tipo))) {
    const nombre = CLAVES[tipo];
    if (!process.env[nombre]) process.env[nombre] = await (dependencias.pedir || pedirSinEco)(`${nombre} (no se verá al escribir): `);
    if (!process.env[nombre]) { console.error(`✘ Falta ${nombre}.`); return 2; }
    secretos.push(process.env[nombre]);
  }
  const limpio = (t) => sinSecretos(t, secretos);

  const require = createRequire(path.join(RAIZ, 'functions/package.json'));
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ projectId: decision.proyecto, storageBucket: `${decision.proyecto}.appspot.com` });
  const { geminiAdapter } = require(path.join(RAIZ, 'functions/lib/engine/providers/gemini.js'));
  const { seedanceAdapter } = require(path.join(RAIZ, 'functions/lib/engine/providers/seedance.js'));
  const modeloDe = (adaptador, id) => {
    const m = adaptador.models.find((x) => x.id === id);
    if (!m) throw new Error(`El motor no tiene el modelo ${id}`);
    return m;
  };
  const guardarLibro = () => fs.writeFileSync(rutaLibro, JSON.stringify(libro, null, 2));

  const guardarMedio = async (m, url, tipoPorDefecto, modelo) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`No se pudo leer el resultado de ${m.id}: ${r.status}`);
    const tipo = (r.headers.get('content-type') || tipoPorDefecto).split(';')[0];
    const archivo = `${m.id}${EXTENSION[tipo] || (m.tipo === 'video' ? '.mp4' : '.png')}`;
    fs.writeFileSync(path.join(carpeta, archivo), Buffer.from(await r.arrayBuffer()));
    const [ancho, alto] = m.proporcion.split(':').map(Number);
    registro[m.id] = { archivo, origen: 'ia', proveedor: m.tipo === 'imagen' ? 'Google Gemini' : 'BytePlus ModelArk', modelo, prompt: m.prompt, ancho, alto, generadoEn: new Date().toISOString() };
    fs.writeFileSync(rutaRegistro, JSON.stringify(registro, null, 2));
  };
  /* El primer fotograma viaja desde el archivo local: el emulador de Storage no conserva nada entre arranques. */
  const comoDataUrl = (m) => {
    const r = registro[m.primerFotograma];
    if (!r || r.origen !== 'ia') return null;
    const datos = fs.readFileSync(path.join(carpeta, r.archivo));
    const tipo = Object.entries(EXTENSION).find(([, e]) => e === path.extname(r.archivo))?.[0] || 'image/png';
    return `data:${tipo};base64,${datos.toString('base64')}`;
  };

  /* Un límite propio para esta ejecución, además del acumulado. Sin él, solo manda el acumulado. */
  const topeEjecucion = valor(argv, '--tope-ejecucion') === undefined ? Infinity : Number(valor(argv, '--tope-ejecucion'));
  if (Number.isNaN(topeEjecucion)) { console.error('✘ --tope-ejecucion no es un número.'); return 2; }
  const yaGastado = gastoAcumulado(libro);

  let fallos = 0;
  let fallosSeguidos = 0;
  for (const m of pendientes) {
    const previsto = costePrevisto(m);
    if (gastoAcumulado(libro) - yaGastado + previsto > topeEjecucion) {
      console.log(`Tope de esta ejecución: ${m.id} costaría ${previsto.toFixed(3)} USD y no cabe en ${topeEjecucion}. Se detiene.`);
      break;
    }
    if (!cabeOtroIntento(libro, previsto, decision.tope)) {
      console.log(`Tope: ${gastoAcumulado(libro).toFixed(2)} USD acumulados; ${m.id} costaría ${previsto.toFixed(2)} y no cabe en ${decision.tope}. Se detiene.`);
      break;
    }
    const primerFotograma = m.tipo === 'video' ? comoDataUrl(m) : null;
    if (m.tipo === 'video' && !primerFotograma) { console.warn(`  ! ${m.id}: falta su primer fotograma generado, se omite`); continue; }

    const intento = { id: m.id, tipo: m.tipo, modelo: m.tipo === 'imagen' ? MODELO_IMAGEN : MODELO_VIDEO, usd: previsto, estado: 'reservado', fecha: new Date().toISOString() };
    libro.intentos.push(intento);
    guardarLibro();
    try {
      const ctx = { userId: 'demoGenerator', service: 'demo', requestId: `demo:${m.id}:${libro.intentos.length}`, experienceId: 'demo' };
      const resultado = m.tipo === 'imagen'
        ? await geminiAdapter.run({ capability: 'image.generate', model: modeloDe(geminiAdapter, MODELO_IMAGEN), input: { prompt: m.prompt, aspectRatio: m.proporcion, resolution: '1K' }, ctx, prefs: {}, timeoutMs: TIMEOUT_MS })
        : await seedanceAdapter.run({ capability: 'video.image_to_video', model: modeloDe(seedanceAdapter, MODELO_VIDEO), input: { prompt: m.prompt, imageUrl: primerFotograma, resolution: '720p', durationSec: m.segundos }, ctx, prefs: { durationSec: m.segundos }, timeoutMs: TIMEOUT_MS, onStatus: async (_estado, datos) => { if (datos?.providerTaskId) { intento.tareaDelProveedor = String(datos.providerTaskId); guardarLibro(); } } });
      await guardarMedio(m, resultado.output.url, m.tipo === 'imagen' ? 'image/png' : 'video/mp4', intento.modelo);
      if (Number.isFinite(resultado.costUSD) && resultado.costUSD > 0) { intento.usd = resultado.costUSD; intento.medidoPorElAdaptador = true; }
      intento.estado = 'hecho';
      guardarLibro();
      registro[m.id].usd = intento.usd;
      fs.writeFileSync(rutaRegistro, JSON.stringify(registro, null, 2));
      fallosSeguidos = 0;
      console.log(`  ✓ ${m.id} · ${intento.usd.toFixed(3)} USD · acumulado ${gastoAcumulado(libro).toFixed(2)} USD`);
    } catch (error) {
      fallos++;
      fallosSeguidos++;
      intento.estado = 'fallo';
      intento.motivo = limpio(error?.message || error).slice(0, 300);
      guardarLibro();
      console.error(`  ✘ ${m.id}: ${intento.motivo}`);
      /* Una clave mala o un límite del proveedor fallarían igual en todo lo que queda: no se sigue gastando presupuesto. */
      if (fallosSeguidos >= FALLOS_SEGUIDOS_MAXIMOS) {
        console.error(`Se detiene: ${fallosSeguidos} fallos seguidos. Revisa el motivo antes de volver a lanzarlo.`);
        break;
      }
    }
  }
  console.log(`\nAcumulado: ${gastoAcumulado(libro).toFixed(2)} de ${TOPE_ABSOLUTO_USD} USD · fallos en esta ejecución: ${fallos}.`);
  return fallos ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await principal());
}
