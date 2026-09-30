/**
 * FILMMAKER ENGINE · FASE 32 — LA MATRIZ MAESTRA (filmmaker-capability-master).
 *
 *   M · la matriz de `docs/FILMMAKER-CAPABILITY-MASTER.md`: sus 17 columnas, ids completos y sin repetir, los estados
 *       A–H, el resumen que cuadra, las reglas de cada estado, las 96 filas de la Fase 31 con su categoría de entonces
 *       (salvo las dos que pasan a H, dichas) y ningún proveedor que Weë no usa;
 *   R · la tabla de riesgos contra el código: cada «abierto» sigue abierto y cada «cerrado» está cerrado, con el
 *       adaptador de verdad (lib) y sin red;
 *   S · lo que la matriz dice del adaptador de Seedance y de F1-A, contra el código;
 *   W · el workplace: cada fila en un sitio de Weë Studio, el mapa del encargo completo, y cada B que dice «falta»
 *       sigue faltando en la app (si alguien lo construye, su fila tiene que cambiar);
 *   I · la investigación: cada hallazgo con su clase, su WORKPLACE y su CONTROL, y su fila en la matriz;
 *   X · las guardas: la Fase 32 solo toca documentos y pruebas, y la marca se escribe «Weë».
 *
 * Solo lectura: ni Firestore, ni proveedores, ni red. El adaptador se construye (sin imágenes, que son lo único que
 * leería) y se mira el cuerpo que mandaría.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const sinCR = (s) => s.replace(/\r\n/g, '\n');
const leer = (p) => sinCR(fs.readFileSync(path.resolve(RAIZ, p), 'utf8'));
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const git = (args) => sinCR(execSync(`git ${args}`, { cwd: RAIZ, encoding: 'utf8' }));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ═══ El documento ═══════════════════════════════════════════════════════ */
const DOC = leer('docs/FILMMAKER-CAPABILITY-MASTER.md');
const seccion = (desde, hasta) => {
  const i = DOC.indexOf(desde);
  const j = hasta ? DOC.indexOf(hasta, i + desde.length) : -1;
  return i < 0 ? '' : DOC.slice(i, j < 0 ? undefined : j);
};
const celdas = (linea) => linea.trim().replace(/^\|\s?/, '').replace(/\s?\|$/, '').split(/\s\|\s/).map((c) => c.trim());
/** Las filas de la primera tabla de `texto` cuya cabecera empieza por `primera`. */
const tabla = (texto, primera) => {
  const lineas = texto.split('\n');
  const i = lineas.findIndex((l) => l.startsWith(`| ${primera} |`));
  if (i < 0) return { cabecera: [], filas: [] };
  const cabecera = celdas(lineas[i]);
  const filas = [];
  for (let k = i + 2; k < lineas.length && lineas[k].startsWith('|'); k++) filas.push(celdas(lineas[k]));
  return { cabecera, filas };
};

const MATRIZ = seccion('<!-- MATRIZ:INICIO -->', '<!-- MATRIZ:FIN -->');
const COLUMNAS = ['ID', 'CAPABILITY', 'ENGINE', 'ADAPTER', 'F1-A', 'SERVER', 'UX', 'WORKPLACE', 'STATUS', 'CANARY', 'CONTRACT', 'PROVIDER', 'COST', 'TEST', 'SABOTAGE', 'MOBILE', 'NOTES'];
const { cabecera, filas: crudas } = tabla(MATRIZ, 'ID');
const filas = crudas.map((c) => Object.fromEntries(COLUMNAS.map((k, i) => [k, c[i] ?? ''])));
const porId = new Map(filas.map((f) => [f.ID, f]));
const fila = (id) => porId.get(id) ?? {};
const ESTADOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/* ═══ M · la matriz ═══════════════════════════════════════════════════════ */
console.log('\n— M · la matriz —');
check('M1 el documento tiene las marcas de la matriz y la tabla sus 17 columnas, en orden',
  !!MATRIZ && JSON.stringify(cabecera) === JSON.stringify(COLUMNAS), cabecera.join(','));
check('M2 cada fila tiene exactamente 17 celdas', crudas.every((c) => c.length === 17),
  crudas.filter((c) => c.length !== 17).map((c) => c[0]).join(','));
const ids = filas.map((f) => f.ID);
check('M3 ningún id se repite', new Set(ids).size === ids.length);
const serie = (letra, hasta) => Array.from({ length: hasta }, (_, i) => `${letra}${String(i + 1).padStart(2, '0')}`);
/* 3D dentro de Filmmaker: T01–T12, lo que no existía (lo que ya tenía fila —I02, I11— se actualiza, no se repite). */
const ESPERADOS = [...serie('C', 76), ...serie('X', 20), ...serie('N', 31), ...serie('I', 20), ...serie('T', 12)];
check('M4 están C01–C76, X01–X20, N01–N31, I01–I20 y T01–T12, y nada más',
  ESPERADOS.every((id) => porId.has(id)) && ids.length === ESPERADOS.length,
  `faltan ${ESPERADOS.filter((id) => !porId.has(id)).join(',') || '—'}; sobran ${ids.filter((id) => !ESPERADOS.includes(id)).join(',') || '—'}`);
check('M5 cada STATUS es una de las ocho letras', filas.every((f) => ESTADOS.includes(f.STATUS)),
  filas.filter((f) => !ESTADOS.includes(f.STATUS)).map((f) => `${f.ID}:${f.STATUS}`).join(','));
const resumen = Object.fromEntries(tabla(MATRIZ, 'Estado').filas.map(([e, cuantas]) => [e.split(' ')[0], Number(cuantas)]));
const cuenta = Object.fromEntries(ESTADOS.map((e) => [e, filas.filter((f) => f.STATUS === e).length]));
check('M6 el resumen cuenta lo que hay en la tabla, estado a estado, y el total',
  ESTADOS.every((e) => resumen[e] === cuenta[e]) && resumen.Total === filas.length, JSON.stringify({ resumen, cuenta }));

const vacia = (v) => !v || v === '—';
const reglas = [
  ['M7 una A tiene control y la cubren una suite y una batería de sabotajes', (f) => f.STATUS !== 'A' || (f.UX !== '✘' && !vacia(f.TEST) && !vacia(f.SABOTAGE))],
  ['M8 una B dice en qué fase se le da su sitio', (f) => f.STATUS !== 'B' || /Fase (3[3-9]|40)/.test(f.NOTES)],
  ['M9 una C dice por qué no tiene efecto', (f) => f.STATUS !== 'C' || !vacia(f.NOTES)],
  ['M10 una D nombra lo que el adaptador sabe', (f) => f.STATUS !== 'D' || (!vacia(f.ADAPTER) && !f.ADAPTER.startsWith('✘'))],
  ['M11 una E dice qué canary le falta', (f) => f.STATUS !== 'E' || (f.CANARY !== 'no' && !vacia(f.CANARY))],
  ['M12 una F nombra el contrato exacto', (f) => f.STATUS !== 'F' || /^sí/.test(f.CONTRACT)],
  ['M13 una H dice por qué se excluye', (f) => f.STATUS !== 'H' || !vacia(f.NOTES)],
  ['M14 lo que se usa hoy y gasta dinero ya pasó su canary o espera tras su puerta', (f) => !(f.STATUS === 'A' && /^sí/.test(f.COST)) || f.CANARY !== 'sí'],
  ['M15 lo que se usa hoy tiene su control comprobado en el teléfono', (f) => f.STATUS !== 'A' || f.MOBILE.startsWith('✔')],
];
for (const [nombre, regla] of reglas) check(nombre, filas.every(regla), filas.filter((f) => !regla(f)).map((f) => f.ID).join(','));

/* Las 96 de la Fase 31, con la categoría de entonces: solo cambian las que se dicen. */
const CIERRE = leer('docs/CAPABILITY-WORKPLACE-CLOSURE.md');
const t31 = tabla(CIERRE, 'ID');
const iCat = t31.cabecera.indexOf('Cat.');
const cat31 = new Map(t31.filas.map((c) => [c[0], c[iCat]]));
const RECLASIFICADAS = { C44: 'H', C70: 'H' };
check('M16 las 96 filas de la Fase 31 están, con la misma categoría (C44 y C70 pasan a H: prompt interno y lienzo de nodos)',
  cat31.size === 96 && [...cat31].every(([id, c]) => fila(id).STATUS === (RECLASIFICADAS[id] ?? c)),
  [...cat31].filter(([id, c]) => fila(id).STATUS !== (RECLASIFICADAS[id] ?? c)).map(([id, c]) => `${id}:${c}→${fila(id).STATUS}`).join(','));
check('M17 las dos reclasificaciones están dichas en su fila (regla de producto y mapa aprobado)',
  /regla de producto/.test(fila('C44').CONTRACT) && /Fuera del mapa aprobado/.test(fila('C70').NOTES));
const FUERA = /replicate|fal\.ai|openrouter|together|hugging\s*face|kling|runway|veo\b|luma|pika|minimax|vidu|\bwan\b|ltx|sora|suno/i;
check('M18 ningún PROVIDER de la matriz es un intermediario ni otro motor de vídeo (vídeo solo Seedance)',
  filas.every((f) => !FUERA.test(f.PROVIDER)), filas.filter((f) => FUERA.test(f.PROVIDER)).map((f) => f.ID).join(','));

/* ═══ R · los riesgos contra el código ════════════════════════════════════ */
console.log('\n— R · los riesgos contra el código —');
const seedance = lib('engine/providers/seedance.js');
const video = lib('engine/video.js');
const plano = lib('creator/plano.js');
const creative = lib('core/creative.js');
const M = seedance.SEEDANCE_MODEL_IDS;
const cuerpo = async (modelId, input, capability = 'video.reference') =>
  (await seedance.buildSeedanceBody({ capability, input, model: { id: modelId }, prefs: {} })).body;
const intento = async (fn) => { try { return { ok: true, valor: await fn() } } catch (error) { return { ok: false, error } } };

const RIESGOS = new Map(tabla(seccion('**Estado de los riesgos.**', '### 2.3'), 'Riesgo').filas.map(([id, estado, que]) => [id, { estado, que }]));
const ESTADOS_DE_RIESGO = /^(abierto|cerrado \(Fase \d+\)|contrato|decisión|se queda)$/;
check('R1 la tabla de riesgos tiene R2, R3, R4, R5, R8, R9, R15 y R18–R26, cada uno con un estado válido',
  ['R2', 'R3', 'R4', 'R5', 'R8', 'R9', 'R15', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24', 'R25', 'R26'].every((r) => RIESGOS.has(r) && ESTADOS_DE_RIESGO.test(RIESGOS.get(r).estado)),
  [...RIESGOS].map(([id, r]) => `${id}:${r.estado}`).join(','));

/* Cada sonda dice si el defecto SIGUE en el código. «abierto» ⇔ sigue; «cerrado (Fase N)» ⇔ ya no. */
const conDefecto = {
  R2: async () => (await cuerpo(M.SEEDANCE_2_0_FAST, { prompt: 'Un faro de noche --dur 30 --rs 1080p', aspectRatio: '16:9' }, 'video.generate')).content[0].text.includes('--'),
  R15: async () => !/outcome:\s*'reconciling'/.test(sinComentarios(leer('functions/src/creator/video.ts'))),
  R18: async () => seedance.seedanceTokens('720p', '1:1', 5) !== 108000 || seedance.seedanceTokens('720p', '21:9', 5) !== Math.round((5 * 1470 * 630 * 24) / 1024),
  R19: async () => {
    const pedido = video.normalizeVideoRequest({ prompt: 'Extiende el faro', references: { videos: ['https://x/v.mp4'] }, mode: 'extend', model: 'SEEDANCE_2_5' });
    const extender = await cuerpo(M.SEEDANCE_2_5, { prompt: 'Extiende el faro', referenceVideos: ['https://x/v.mp4'], taskType: 'extend', aspectRatio: pedido.input.aspectRatio });
    const en20 = await cuerpo(M.SEEDANCE_2_0, { prompt: 'Un faro', referenceVideos: ['https://x/v.mp4'] });
    return extender.ratio !== 'adaptive' || en20.omni_reference_task_type !== undefined;
  },
  R20: async () => {
    const seis = await cuerpo(M.SEEDANCE_2_0, { prompt: 'Un faro', referenceVideos: ['https://x/a.mp4', 'https://x/b.mp4', 'https://x/c.mp4'], referenceAudios: ['https://x/1.mp3', 'https://x/2.mp3', 'https://x/3.mp3'] });
    const soloAudio = await intento(() => cuerpo(M.SEEDANCE_2_0, { prompt: 'Solo sonido', referenceAudios: ['https://x/1.mp3'] }));
    return seis.content.filter((c) => c.role === 'reference_audio').length !== 3 || soloAudio.ok;
  },
  /* R22 (Fase 33): `-1` se cotizaba como 5 s y los segundos de entrada los declaraba el cliente. */
  R22: async () => {
    const menos1 = seedance.seedanceCostUsd({ modelId: M.SEEDANCE_2_0, resolution: '720p', durationSec: -1, ratio: '16:9' }).tokens;
    const maximo = seedance.seedanceCostUsd({ modelId: M.SEEDANCE_2_0, resolution: '720p', durationSec: 15, ratio: '16:9' }).tokens;
    return menos1 !== maximo || /videoSeconds:/.test(sinComentarios(leer('functions/src/creator/video.ts')));
  },
};
for (const [id, sonda] of Object.entries(conDefecto)) {
  const r = RIESGOS.get(id);
  const sigue = await sonda().catch(() => null);
  const dice = r?.estado === 'abierto' ? true : /^cerrado/.test(r?.estado ?? '') ? false : null;
  check(`R${Object.keys(conDefecto).indexOf(id) + 2} ${id}: la tabla dice «${r?.estado}» y el código ${sigue ? 'todavía tiene' : 'ya no tiene'} el defecto`,
    sigue !== null && dice === sigue, r?.que ?? 'sin fila');
}
/*
 * R23–R26 (Fase 40, el cierre): hallados el 2026-09-29 en lo desplegado y comprobados en la rama el 2026-09-30.
 * Abiertos en los dos, y se arreglan con autorización. Cada sonda dice si el defecto SIGUE en el código: el día que se
 * arregle uno, la tabla tiene que decirlo, o esto falla.
 */
const enLoDesplegado = {
  /* El camino antiguo del vídeo devuelve los Credits ante CUALQUIER error, también con el desenlace desconocido. */
  R23: async () => {
    const v = sinComentarios(leer('functions/src/creator/video.ts'));
    const i = v.lastIndexOf('await videoEngine.generate(');
    return i >= 0 && /\} catch \(error\) \{\s*await creditEngine\.refundCredits\(/.test(v.slice(i));
  },
  /* Sin `chatId`, un chat nuevo en cada llamada, y el duplicado solo se busca dentro de él. */
  R24: async () => {
    const b = sinComentarios(leer('functions/src/creator/brain.ts'));
    return /chatRef = db\.collection\('brainChats'\)\.doc\(\);/.test(b) && /const existing = await messages\.doc\(`\$\{messageId\}_wee`\)\.get\(\);/.test(b) && !/collectionGroup\(/.test(b);
  },
  /* Una dirección de otro host y otro bucket pasa, porque solo se mira la ruta. */
  R25: async () => {
    const ajena = lib('engine/http.js').parseStorageUrl('https://otro.example.com/v0/b/otro-bucket/o/users%2Fu1%2Ffoto.jpg');
    const inputs = sinComentarios(leer('functions/src/creator/inputs.ts'));
    const asercion = inputs.slice(inputs.indexOf('export const assertInputImageUrl'), inputs.indexOf('export const needsInputImage'));
    return !!ajena && ajena.bucket === 'otro-bucket' && asercion.length > 0 && !/bucket/.test(asercion);
  },
  /* Ningún callable pide App Check, y la bienvenida da Credits a toda cuenta nueva. */
  R26: async () => {
    const fuentes = [];
    const andar = (d) => {
      for (const e of fs.readdirSync(path.resolve(RAIZ, d), { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        /* Sin comentarios: que una línea que HABLE de App Check no cuente como pedirlo. */
        if (e.isDirectory()) andar(p); else if (p.endsWith('.ts')) fuentes.push(sinComentarios(leer(p)));
      }
    };
    andar('functions/src');
    return fuentes.length > 100 && !fuentes.some((s) => /enforceAppCheck/.test(s)) && lib('credits/creditCosts.js').WELCOME_CREDITS > 0;
  },
};
for (const [id, sonda] of Object.entries(enLoDesplegado)) {
  const r = RIESGOS.get(id);
  const sigue = await sonda().catch(() => null);
  check(`R8 ${id}: la tabla dice «${r?.estado}» y el código ${sigue ? 'todavía tiene' : 'ya no tiene'} el defecto (en producción y en la rama)`,
    sigue !== null && (r?.estado === 'abierto') === sigue, r?.que ?? 'sin fila');
}
const src = sinComentarios(leer('functions/src/engine/providers/seedance.ts'));
const deLaToma = (() => {
  const v = sinComentarios(leer('functions/src/creator/video.ts'));
  const i = v.indexOf('peticion: {');
  const j = v.indexOf("model: 'auto'", i);
  return i < 0 || j < 0 ? null : v.slice(i, j);
})();
check('R7 R21 «se queda»: el adaptador sigue cableando `seed` y `camera_fixed`, y la petición de la toma no los pone',
  RIESGOS.get('R21')?.estado === 'se queda' && /body\.seed\s*=/.test(src) && /camera_fixed\s*=\s*true/.test(src)
    && deLaToma !== null && /prompt: componerPromptDePlano/.test(deLaToma) && !/seed|cameraFixed/.test(deLaToma));

/* ═══ S · lo que la matriz dice de Seedance y de F1-A ═════════════════════ */
console.log('\n— S · Seedance y F1-A, contra el código —');
const ausente = (clave) => !new RegExp(`\\b${clave}\\b`).test(src);
check('S1 N22: el adaptador no pide `return_last_frame` ni lee `last_frame_url` (y la matriz dice ✘)',
  ausente('return_last_frame') && ausente('last_frame_url') && fila('N22').ADAPTER.startsWith('✘') && fila('N22').STATUS === 'F');
check('S2 N23: el adaptador no conoce el borrador (`draft`, `draft_task`)', ausente('draft') && ausente('draft_task') && fila('N23').ADAPTER.startsWith('✘'));
check('S3 N26, N29, N30: ni `output_format`, ni `priority`, ni `safety_identifier`',
  ausente('output_format') && ausente('priority') && ausente('safety_identifier')
    && ['N26', 'N29', 'N30'].every((id) => fila(id).ADAPTER.startsWith('✘')));
const RATIOS = (src.match(/const RATIOS = new Set\(\[([^\]]*)\]\)/)?.[1] ?? '').match(/'[^']+'/g)?.map((x) => x.slice(1, -1)) ?? [];
check('S4 N20: el adaptador admite 3:4, F1-A y la toma no (D, con el contrato dicho)',
  RATIOS.includes('3:4') && !creative.PROPORCIONES.includes('3:4') && !plano.LIMITES_DE_PLANO.proporciones.includes('3:4')
    && fila('N20').STATUS === 'D' && /PROPORCIONES/.test(fila('N20').CONTRACT));
check('S5 C66: F1-A ofrece 4:5 y ningún modelo de Seedance la genera (G)',
  creative.PROPORCIONES.includes('4:5') && !RATIOS.includes('4:5') && fila('C66').STATUS === 'G');
check('S6 N21: la toma se queda en 15 s y Seedance 2.5 llega a 30 (F, contrato de LIMITES_DE_PLANO)',
  plano.LIMITES_DE_PLANO.duracionMaximaSec === 15 && seedance.specOf(M.SEEDANCE_2_5).maxDurationSec === 30
    && fila('N21').STATUS === 'F' && /LIMITES_DE_PLANO/.test(fila('N21').CONTRACT));
const plantilla = sinComentarios(leer('functions/src/creator/plano.ts'));
check('S7 N19: «Quieta» (`static`) es un movimiento de F1-A y el movimiento llega al texto de la toma (A)',
  /'static'/.test(sinComentarios(leer('functions/src/core/creative.ts'))) && /movement \$\{palabra\(c\.movement\.type\)\}/.test(plantilla)
    && leer('i18n/textos/es/studio.ts').includes("mvStatic: 'Quieta'") && fila('N19').STATUS === 'A');
check('S8 los cuatro modelos del adaptador son los oficiales que cita la sección 3.1',
  Object.values(M).length === 4 && Object.values(M).every((id) => DOC.includes(id)));
const validados = sinComentarios(leer('functions/src/creator/video.ts')).match(/MODELOS_VALIDADOS_PARA_TOMAS[^=]*=\s*[^;]*;/)?.[0] ?? '';
check('S9 la toma usa solo Seedance 2.0 fast, como dice el documento',
  /SEEDANCE_2_0_FAST/.test(validados) && !/SEEDANCE_2_5|SEEDANCE_2_0\b(?!_)/.test(validados.replace('SEEDANCE_2_0_FAST', '')) && DOC.includes('usa hoy solo 2.0 fast'), validados.slice(0, 120));
check('S10 C60: F1-D rechaza el diálogo a cámara (`dialogue_not_supported`), como dice la fila',
  /dialogue_not_supported/.test(plantilla) && /dialogue_not_supported/.test(fila('C60').NOTES + fila('C60').ENGINE));

/* ═══ W · el workplace ════════════════════════════════════════════════════ */
console.log('\n— W · el workplace —');
const SITIOS = ['Proyecto', 'Historia', 'Story', 'Plano', 'Weë AI Director', 'Línea de tiempo', 'Visor', 'Exportar / Publicar', 'Weë Studio', 'Montaje'];
const conSitio = (f) => vacia(f.WORKPLACE) || SITIOS.some((s) => f.WORKPLACE.startsWith(s));
check('W1 cada WORKPLACE es un sitio de Weë Studio', filas.every(conSitio), filas.filter((f) => !conSitio(f)).map((f) => `${f.ID}:${f.WORKPLACE}`).join(','));
check('W2 solo H y G pueden quedarse sin sitio: lo demás tiene su lugar natural',
  filas.every((f) => ['G', 'H'].includes(f.STATUS) || !vacia(f.WORKPLACE)),
  filas.filter((f) => !['G', 'H'].includes(f.STATUS) && vacia(f.WORKPLACE)).map((f) => f.ID).join(','));
const MAPA = seccion('### 2.10', '## 3.');
const PEDIDOS = ['Proyecto › Brief', 'Proyecto › Dirección', 'Proyecto › Reparto', 'Proyecto › Lugares', 'Proyecto › Objetos', 'Proyecto › Referencias', 'Proyecto › Versiones',
  'Historia › Storyboard', 'Historia › Guion', 'Historia › Escenas', 'Historia › Continuidad',
  'Qué pasa', 'Sujeto', 'Personaje', 'Lugar', 'Objetos', 'Estado', 'Cámara', 'Lente', 'Movimiento', 'Composición', 'Luz', 'Estilo', 'Ánimo', 'Audio', 'Diálogo',
  'Plano › Referencias', 'Plano › Continuidad', 'Plano › Prompt avanzado', 'Plano › Generar',
  'Analizar', 'Proponer cambios', 'Proponer escenas', 'Proponer planos', 'Explicar', 'Precio', 'Aplicar', 'Descartar',
  'Línea de tiempo', 'Visor', 'Exportar / Publicar'];
check('W3 el mapa del encargo está entero, sitio a sitio (sección 2.10)', PEDIDOS.every((p) => MAPA.includes(p)), PEDIDOS.filter((p) => !MAPA.includes(p)).join(','));

/* Cada B dice «falta»: se comprueba que sigue faltando. El día que se construya, la fila tiene que cambiar. */
const app = (p) => sinComentarios(leer(p));
const faltan = [
  ['N12', 'la pista de diálogo sigue fuera del teléfono', () => /PISTAS_DEL_TELEFONO[^=]*=\s*\[[^\]]*\]/.test(app('components/studio/produccion/ProductionTimeline.tsx')) && !/PISTAS_DEL_TELEFONO[^=]*=\s*\[[^\]]*'personajes'/.test(app('components/studio/produccion/ProductionTimeline.tsx'))],
  ['N13', '«Propiedades del plano» todavía no tiene su «Generar»', () => !app('components/studio/produccion/ProductionShotProperties.tsx').includes('ProductionShotGeneration')],
  /* Fase 35 del motor: las vistas de Historia en el teléfono; se mira que cada una esté (si no, «ya existe» sería gratis). */
  ['N10', 'Historia no tiene la vista de escenas', () => !/historia === 'escenas' && <ProductionEscenas/.test(app('components/studio/produccion/ProductionMobileEditor.tsx'))],
  ['N11', 'la continuidad plano a plano no es todavía una vista de Historia', () => !/historia === 'continuidad' && <ProductionContinuidadPlanoAPlano/.test(app('components/studio/produccion/ProductionMobileEditor.tsx'))],
  /* Fase 34 del motor: las puertas rápidas viven en utils/atajosDelDirector.ts; se mira que cada una esté allí. */
  ['N06', 'Weë AI Director no tiene «Proponer planos»', () => !/clave: 'filmmaker\.wsBrainQuickShots'/.test(app('utils/atajosDelDirector.ts'))],
  ['N07', '… ni «Explicar»', () => !/clave: 'filmmaker\.wsBrainQuickExplain'/.test(app('utils/atajosDelDirector.ts'))],
  ['I01', '… ni «Cobertura de este plano»', () => !/clave: 'filmmaker\.wsBrainQuickCoverage'/.test(app('utils/atajosDelDirector.ts'))],
  ['I05', '… ni «Convertir mi guion en escenas»', () => !/clave: 'filmmaker\.wsBrainQuickScript'/.test(app('utils/atajosDelDirector.ts'))],
  ['N14', 'la ficha de una referencia no enseña su miniatura', () => !/\bImage\b|Miniatura|uri:/.test(app('components/studio/produccion/ProductionReferencias.tsx'))],
  /* Reanclada en la Fase 37: los sonidos se editan en la herramienta «Audio» (ProductionTools), no en su resumen. */
  ['N16', 'la duración de un sonido no tiene control', () => !/wsCueDurationOf/.test(app('components/studio/produccion/ProductionTools.tsx'))],
  ['N02', 'los montajes anteriores se cargan y no se guardan para enseñarlos', () => /montajesDeLaProduccion/.test(app('hooks/useMontajeFinal.ts')) && !/anteriores|setMontajes|montajesAnteriores/.test(app('hooks/useMontajeFinal.ts'))],
];
for (const [id, que, sigueFaltando] of faltan) {
  const falta = (() => { try { return sigueFaltando(); } catch { return null; } })();
  check(`W4 ${id} es B y ${que}`, fila(id).STATUS === 'B' ? falta === true : falta === false, `STATUS ${fila(id).STATUS}`);
}

/* ═══ I · la investigación ════════════════════════════════════════════════ */
console.log('\n— I · la investigación —');
const INV = seccion('## 3. La investigación externa', '## 4. La matriz');
const CLASES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const hallazgos = ['### 3.1', '### 3.2', '### 3.3', '### 3.4'].flatMap((h) => {
  const trozo = INV.slice(INV.indexOf(h));
  const { cabecera: cab, filas: fs_ } = tabla(trozo.slice(0, trozo.indexOf('\n### ', 5) > 0 ? trozo.indexOf('\n### ', 5) : undefined), 'Hallazgo');
  return fs_.map((c) => ({ h, ...Object.fromEntries(cab.map((k, i) => [k, c[i] ?? ''])) }));
});
check('I1 las cuatro fuentes tienen su tabla de hallazgos (Seedance, Higgsfield, OiiOii, otros motores)',
  ['### 3.1', '### 3.2', '### 3.3', '### 3.4'].every((h) => hallazgos.some((x) => x.h === h)) && hallazgos.length >= 70, `${hallazgos.length} hallazgos`);
check('I2 cada hallazgo tiene una clase A–G', hallazgos.every((x) => CLASES.includes(x.Clase)),
  hallazgos.filter((x) => !CLASES.includes(x.Clase)).map((x) => x.Hallazgo).join(' · '));
const explicado = (v) => !!v && (v !== '—' || false) || /^— \(/.test(v ?? '');
check('I3 lo que existe o puede existir (A–E) tiene su WORKPLACE y su CONTROL (o dice que es interno)',
  hallazgos.filter((x) => ['A', 'B', 'C', 'D', 'E'].includes(x.Clase)).every((x) => explicado(x.WORKPLACE) && explicado(x.CONTROL)),
  hallazgos.filter((x) => ['A', 'B', 'C', 'D', 'E'].includes(x.Clase) && !(explicado(x.WORKPLACE) && explicado(x.CONTROL))).map((x) => x.Hallazgo).join(' · '));
const refs = hallazgos.flatMap((x) => (x.Fila ?? '').split(/,\s*/).filter((r) => r && r !== '—'));
check('I4 cada «Fila» citada existe en la matriz', refs.every((r) => porId.has(r)), refs.filter((r) => !porId.has(r)).join(','));
check('I5 cada fila nueva (N, I) sale de algún sitio: el repaso (sección 2) o la investigación (sección 3)',
  filas.filter((f) => /^[NI]/.test(f.ID)).every((f) => DOC.slice(0, DOC.indexOf('<!-- MATRIZ:INICIO -->')).includes(f.ID)),
  filas.filter((f) => /^[NI]/.test(f.ID) && !DOC.slice(0, DOC.indexOf('<!-- MATRIZ:INICIO -->')).includes(f.ID)).map((f) => f.ID).join(','));
const CONCEPTOS = ['Director', 'Storyboard', 'Control del plano', 'Personajes y referencias', 'Cámara', 'Varios planos', 'Continuidad de escena', 'Editar', 'Extender', 'Primer y último fotograma', 'Sonido nativo', 'Labios sincronizados', 'Historia generada', 'Planos automáticos'];
const conceptos = tabla(seccion('### 3.5', '## 4.'), 'Concepto').filas.map((c) => c[0]);
check('I6 los catorce conceptos de producto están, cada uno con lo que Weë tiene y lo que falta', CONCEPTOS.every((c) => conceptos.includes(c)), CONCEPTOS.filter((c) => !conceptos.includes(c)).join(','));
check('I7 lo que Weë no hace a propósito se clasifica G, no se propone: varios modelos, varios agentes, piloto automático',
  ['Muchos modelos a elegir, plano a plano', 'Agentes con roles y memoria', 'Piloto automático de una pulsación'].every((h) => hallazgos.find((x) => x.Hallazgo === h)?.Clase === 'G'));
check('I8 Sora se dice cerrado, con fecha', /Sora ya no cuenta: OpenAI cerró la app el 2026-04-26 y la API el 2026-09-24/.test(INV.replace(/\s+/g, ' ')));

/* ═══ F · el cierre (Fase 40) ═════════════════════════════════════════════ */
console.log('\n— F · el cierre (Fase 40): dónde queda cada cosa, contra la matriz y contra git —');
{
  const CIERRE = seccion('## 7. El cierre (Fase 40)');
  const estados = tabla(CIERRE.slice(CIERRE.indexOf('**La matriz al cierre')), 'Estado').filas;
  const dice = Object.fromEntries(estados.map(([e, n]) => [e.split(' · ')[0], Number(n)]));
  const hay = Object.fromEntries(['A', 'C', 'D', 'E', 'F', 'G', 'H'].map((c) => [c, filas.filter((f) => f.STATUS === c).length]));
  check('F1 el recuento del cierre es el de la matriz, estado a estado, y suma todas sus filas',
    CIERRE.length > 0 && Object.keys(hay).every((c) => dice[c] === hay[c]) && Object.values(dice).reduce((s, x) => s + x, 0) === filas.length
    && CIERRE.includes(`**La matriz al cierre: ${filas.length} capacidades.**`), JSON.stringify({ dice, hay, total: filas.length }));
  const ronda = tabla(CIERRE.slice(CIERRE.indexOf('**La ronda del cierre')), 'Commit').filas.map(([c]) => (c.match(/^`([0-9a-f]{7})`$/) ?? [])[1]).filter(Boolean);
  const existe = (h) => { try { git(`merge-base --is-ancestor ${h} HEAD`); return true; } catch { return false; } };
  check('F2 cada commit de la ronda existe y es de esta rama (antecesor de HEAD), en su orden',
    ronda.length === 8 && ronda.every(existe) && ronda.every((h, i) => i === 0 || existe(`${ronda[i - 1]}`) && git(`rev-list --count ${ronda[i - 1]}..${h}`).trim() !== '0'), ronda.join(' '));
  const plan = seccion('## 5. Las fases que siguen', '## 6.');
  check('F3 las Fases 39 y 40, hechas en el plan', /\| 39 \| Contratos y canaries preparados \|[^\n]*\*\*Hecha\*\*/.test(plan) && /\| 40 \| Cierre de la ronda \|[^\n]*\*\*Hecha\*\*/.test(plan));
  const decisiones = seccion('## 6.', '## 7.');
  check('F4 lo que espera tu decisión dice las cinco propuestas de disposición de la 38b, y R23-R26 con su estado en el código',
    ['(1) de 1024 a 1279 px', '(2) quitar los controles que se repiten', '(3) la pestaña «Velocidad»', '(4) en el teléfono', '(5) «Añadir plano o escena después de este»'].every((p) => decisiones.includes(p))
    && /R23-R26[^\n]*Abiertos en producción y en la rama/.test(decisiones));
  check('F5 y el cierre dice lo que no se hizo, y qué queda para las pruebas finales',
    /sin push, merge ni deploy;[\s\S]*sin gasto;[\s\S]*ninguna puerta abierta\./.test(CIERRE) && /Quedan sin tocar `main`[\s\S]*`hotfix\/r22-generatevideo`/.test(CIERRE)
    && /\*\*Lo que queda para las pruebas finales\.\*\*/.test(CIERRE) && /\*\*Lo que pide tu autorización, en un sitio\.\*\*/.test(CIERRE));
}

/* ═══ X · las guardas ═════════════════════════════════════════════════════ */
console.log('\n— X · las guardas —');
check('X1 la marca se escribe «Weë»: ni «Wee» suelto ni «WEE» en el documento',
  !/(^|[^A-Za-z`_])Wee(?![ëA-Za-z_])/m.test(DOC) && !/\bWEE\b/.test(DOC.replace(/WEË/g, '')));
check('X2 la cabecera dice lo que no se hizo: push, merge, deploy, dinero, canary, puertas y contratos',
  /No se hizo push, merge ni deploy, no se gastó dinero, no se ejecutó ningún canary y no se abrió ninguna puerta\. No se tocó ningún contrato cerrado\./.test(DOC));
const HASTA = git('log --format=%H -n 1 --grep "Phase 32: capability master matrix"').trim();
const tocados = HASTA
  ? git(`show --name-only --format= ${HASTA}`).trim().split('\n').filter(Boolean)
  : git('status --porcelain').split('\n').filter(Boolean).map((l) => l.slice(3)).filter((p) => !p.startsWith('functions/lib/'));
const PERMITIDOS = /^(docs\/|functions\/test\/|functions\/package\.json$)/;
check(`X3 la Fase 32 ${HASTA ? '(su commit)' : '(sin commit todavía)'} solo toca documentos, pruebas y la lista de suites`,
  tocados.every((p) => PERMITIDOS.test(p)), tocados.filter((p) => !PERMITIDOS.test(p)).join(','));
check('X4 la suite está en la cadena, justo después de capability-workplace-closure',
  /capability-workplace-closure\.test\.mjs && node test\/filmmaker-capability-master\.test\.mjs/.test(leer('functions/package.json')));

console.log(`\n${failures ? '✘' : '✔'} filmmaker-capability-master: ${n - failures}/${n}`);
process.exit(failures ? 1 : 0);
