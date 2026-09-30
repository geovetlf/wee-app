/**
 * FILMMAKER ENGINE · FASE 39 — CONTRATOS Y CANARIES, PREPARADOS (filmmaker-contratos-canaries).
 *
 * `docs/FILMMAKER-CONTRATOS-Y-CANARIES.md` dice qué falta, por qué no se construyó y cuánto costaría probarlo. Esta
 * suite lo ata al código: si alguien hace un contrato, cambia una tarifa o abre una puerta y el documento no, falla.
 *
 *   Z · por qué no se construyó ninguno: cada motivo del § 0, contra el código (la valla G12, el vocabulario del motor,
 *       el registro, la regla 10);
 *   C · los seis contratos: sus partes, y que lo que dicen de HOY es verdad;
 *   O · los demás cambios de contrato, con su fila de la matriz (y los dos de F1-A de la auditoría 38b);
 *   T · el 3D: lo que hay preparado en el Core y lo que falta, contra el código;
 *   K · los canaries: sus nueve campos más el riesgo; el resumen igual a los bloques; cada coste de vídeo con la
 *       fórmula oficial del adaptador y cada tarifa del motor con su constante; ningún proveedor fuera de Weë;
 *   X · las guardas: nada hecho ni abierto, solo documentos y pruebas, enlazado y sin duplicar, en la cadena.
 *
 * Solo lectura: el código compilado para las cuentas, sin red y sin Firestore.
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
  n++; console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const DOC = leer('docs/FILMMAKER-CONTRATOS-Y-CANARIES.md');
const MAESTRA = leer('docs/FILMMAKER-CAPABILITY-MASTER.md');
const TRES_D = leer('docs/FILMMAKER-3D.md');
/** Un trozo del documento: desde un título hasta el siguiente del mismo nivel o más alto. */
const seccion = (desde, hasta) => { const i = DOC.indexOf(desde); if (i < 0) return ''; const j = hasta ? DOC.indexOf(hasta, i + 1) : -1; return DOC.slice(i, j < 0 ? undefined : j); };
const filasDe = (texto) => texto.split('\n').filter((l) => /^\| (?!---)/.test(l)).slice(1).map((l) => l.replace(/^\|\s?/, '').replace(/\s?\|$/, '').split(' | '));

const plano = sinComentarios(leer('functions/src/creator/plano.ts'));
const video = sinComentarios(leer('functions/src/creator/video.ts'));
const toma = sinComentarios(leer('functions/src/creator/toma.ts'));
const modelo = sinComentarios(leer('services/filmmaker/espejo/filmmaker/modelo.ts'));
const opsF1A = sinComentarios(leer('functions/src/filmmaker/operaciones.ts'));
const OPS = lib('filmmaker/operaciones.js').OPERACIONES;

/* ═══ Z · POR QUÉ NO SE CONSTRUYÓ NINGUNO ═══════════════════════════════════ */
console.log('\n── Z · Ningún contrato se podía hacer sin tocar uno cerrado: cada motivo, contra el código ──');
{
  const cero = seccion('## 0. ', '## 1. ');
  check('Z1) el § 0 lo dice y lo razona fila a fila (contratos 1-6, N05, los menores y el 3D)',
    /\*\*ninguno cumple esa condición\*\*/.test(cero) && filasDe(cero.slice(0, cero.indexOf('Lo que sí se podía'))).length === 7);
  const req = leer('functions/src/creator/requisitoDelServidor.ts');
  check('Z2) N05 choca con la valla G12: F1-A entra al servidor solo por el requisito y por `productions`, y la puerta del vídeo solo cotiza lo guardado',
    /F1-A entra al servidor por aquí y por `productions\/puerta\.ts`, y por\s+\* ningún otro sitio \(valla G12, ampliada con autorización\)/.test(req)
    && /cause: 'requirement_mismatch'/.test(video) && cero.includes('la valla G12'));
  const capacidad = leer('functions/src/core/capability.ts');
  const union = capacidad.slice(capacidad.indexOf('export type CapabilityId ='), capacidad.indexOf(';', capacidad.indexOf('export type CapabilityId =')));
  const R = lib('engine/registry.js');
  check('Z3) generar en 3D choca con el vocabulario del motor: `CapabilityId` no tiene 3D y `DEFAULT_ROUTING` es un Record total',
    !/'3d\./.test(union) && /export const DEFAULT_ROUTING: Record<CapabilityId, CapabilityRouting> = \{/.test(leer('functions/src/engine/registry.ts'))
    && Object.keys(R.DEFAULT_ROUTING).length === 28 && !Object.keys(R.DEFAULT_ROUTING).some((k) => k.startsWith('3d.')));
  check('Z4) y la versión del contrato de capacidades que subiría es la que el documento dice',
    /export const CAPABILITY_CONTRACT_VERSION = '1\.0' as const;/.test(leer('functions/src/core/contracts.ts')) && DOC.includes('Sube `CAPABILITY_CONTRACT_VERSION` (hoy `1.0`)'));
  const brain = sinComentarios(leer('functions/src/creator/brain.ts'));
  check('Z5) la regla 10: cada puerta declara UNA capacidad para el Core, y son las dos del canary',
    /const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/.test(video) && /const CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate';/.test(brain));
  const vallas = leer('functions/test/core-registry.test.mjs');
  check('Z6) y las vallas del registro que el 3D cambiaría a propósito siguen ahí (20-22 y 27)',
    /check\('20\) ninguna matriz sin integrar declara capacidades'/.test(vallas) && /check\('22\) y las seis están en PENDING'/.test(vallas)
    && /reg\.getCapabilityImplementations\('3d\.generate'\)\.length === 0/.test(vallas) && DOC.includes('las vallas 20-22 y 27 de `core-registry`'));
}

/* ═══ C · LOS SEIS CONTRATOS ═══════════════════════════════════════════════ */
console.log('\n── C · Los seis contratos: sus partes, y que lo que dicen de hoy es verdad ──');
{
  const CONTRATOS = [
    ['1', 'Generar con primer y último fotograma'], ['2', 'Editar y extender'], ['3', 'Volver a una toma anterior'],
    ['4', 'La voz de Weë de un personaje'], ['5', 'Emoción, postura y posición'], ['6', 'Diálogo a cámara'],
  ];
  const bloques = CONTRATOS.map(([k]) => seccion(`### Contrato ${k} · `, k === '6' ? '## 2.' : `### Contrato ${Number(k) + 1} · `));
  check('C1) los seis, cada uno con su sección', CONTRATOS.every(([, titulo], i) => bloques[i] && bloques[i].includes(titulo)), CONTRATOS.filter((_, i) => !bloques[i]).map(([k]) => k).join(','));
  const PARTES = ['**Hoy.**', '**Cambio mínimo.**', '**Campo exacto.**', '**Consumidores.**', '**Pruebas.**', '**Migración y compatibilidad.**'];
  check('C2) cada uno dice lo de hoy, el cambio mínimo, el campo exacto, quién lo consume, las pruebas y la migración',
    bloques.every((b) => PARTES.every((p) => b.includes(p))),
    bloques.map((b, i) => `${i + 1}:${PARTES.filter((p) => !b.includes(p)).join('')}`).filter((x) => !/:$/.test(x)).join(' '));
  const refs = leer('functions/src/creator/referenciasDeElementos.ts');
  check('C3) contrato 1, verdad: F1-D rechaza fotogramas y referencias, la puerta solo manda `video.generate` y la Fase 18 está cerrada (lista vacía)',
    /no\('capability_not_supported'/.test(plano) && /no\('references_not_supported'\)/.test(plano)
    && /export const PUERTA_DE_REFERENCIAS = 'aiSettings\/referencias';/.test(refs)
    && /export const MODELOS_VALIDADOS_CON_REFERENCIAS: readonly string\[\] = Object\.freeze\(\[\]\);/.test(refs) && bloques[0].includes('`MODELOS_VALIDADOS_CON_REFERENCIAS`'));
  check('C4) contrato 2: ni la operación ni el campo existen todavía', !OPS.includes('revise_take') && !/revision\?: \{ mode/.test(modelo));
  check('C5) contrato 3: `take_superseded` sigue impidiendo volver a una toma anterior', /motivo: 'take_superseded'/.test(toma));
  const voces = leer('functions/src/creator/vocesDeDialogo.ts');
  check('C6) contrato 4: `VoiceReference` no tiene `voiceId`, el catálogo está vacío y sus ids son `wv_…`',
    /export interface VoiceReference \{[^}]*\}/.test(modelo) && !/export interface VoiceReference \{[^}]*voiceId[^}]*\}/.test(modelo)
    && /export const CATALOGO_DE_VOCES: readonly VozDelCatalogo\[\] = Object\.freeze\(\[\]\);/.test(voces) && /export const FORMA_DE_VOZ = \/\^wv_/.test(voces)
    && /export const PUERTA_DE_VOCES = 'aiSettings\/voces';/.test(voces));
  check('C7) contrato 5: `CharacterState` solo tiene vestuario y «cómo está»',
    /export interface CharacterState \{\s*readonly characterId: string;\s*readonly wardrobe\?: string;\s*readonly appearanceNotes\?: string;\s*\}/.test(modelo));
  check('C8) contrato 6: F1-D rechaza el diálogo a cámara', /no\('dialogue_not_supported'\)/.test(plano));
  check('C9) nada de lo propuesto existe en el código', !OPS.includes('use_take') && !/'fm-plano-3'/.test(plano) && !/locationState\?:|objectStates\?:|posture\?:/.test(modelo));
}

/* ═══ O · LOS DEMÁS CAMBIOS ═══════════════════════════════════════════════ */
console.log('\n── O · Los demás cambios de contrato, cada uno con su fila ──');
{
  const otros = filasDe(seccion('## 2.', '## 3.'));
  check('O1) cada uno con su contrato, su cambio mínimo y su fila', otros.length >= 20 && otros.every((c) => c.length === 4 && c.every((x) => x.trim())), `${otros.length}`);
  const ids = new Set([...MAESTRA.matchAll(/^\| ([CXNIT]\d\d) \|/gm)].map((m) => m[1]));
  const citadas = otros.flatMap((c) => c[3].split(/,\s*/)).map((x) => x.trim()).filter((x) => /^[CXNIT]\d\d$/.test(x));
  check('O2) cada fila citada existe en la matriz maestra', citadas.length > 12 && citadas.every((id) => ids.has(id)), citadas.filter((id) => !ids.has(id)).join(','));
  check('O3) R3, R4, R5 y R8 están, con lo que tocan', ['R5 ·', 'R8 ·', 'R3 ·', 'R4 ·'].every((r) => otros.some((c) => c[0].includes(r))));
  const alargar = opsF1A.slice(opsF1A.indexOf("const signo = op.op === 'extend_duration'"), opsF1A.indexOf("const signo = op.op === 'extend_duration'") + 400);
  check('O4) los dos de F1-A de la 38b siguen como dice «hoy»: alargar sin duración responde `needs_duration` y `DirectionChanges` admite `mood`',
    /if \(actual === undefined\) return falla\('operation_not_applicable', 'target', \{ reason: 'needs_duration' \}\);/.test(alargar)
    && /export type DirectionChanges = Cambios<CreativeDirection, 'mood' \| 'tone'/.test(opsF1A)
    && otros.some((c) => c[1] === 'F1-A `extend_duration`') && otros.some((c) => c[1] === 'F1-A `DirectionChanges`'));
  const { PROPORCIONES } = lib('core/creative.js');
  const { LIMITES_DE_PLANO } = lib('creator/plano.js');
  check('O5) N20 y N21, verdad: el Core admite 4:5 y no 3:4, la toma no genera ninguna de las dos, y el tope es 15 s para todas',
    PROPORCIONES.includes('4:5') && !PROPORCIONES.includes('3:4') && !LIMITES_DE_PLANO.proporciones.includes('4:5')
    && !LIMITES_DE_PLANO.proporciones.includes('3:4') && LIMITES_DE_PLANO.duracionMaximaSec === 15);
}

/* ═══ T · EL 3D ═══════════════════════════════════════════════════════════ */
console.log('\n── T · El 3D: lo preparado en el Core y lo que falta, contra el código ──');
{
  const { CAPABILITY_CATALOG } = lib('core/registry/capabilities.js');
  const tresD = CAPABILITY_CATALOG.filter((c) => String(c.id).startsWith('3d.'));
  check('T1) el catálogo declara las ocho capacidades 3D, todas DECLARED (sin cadena ni adaptador)',
    tresD.length === 8 && tresD.every((c) => c.status === 'DECLARED' && c.category === '3d')
    && ['3d.generate', '3d.edit', '3d.analyze', '3d.texture', '3d.retopology', '3d.rig', '3d.convert', '3d.export'].every((id) => DOC.includes(`\`${id}\``)));
  const { MATRICES_PENDIENTES } = lib('registry/matrices.js');
  const cand = ['tripo', 'hunyuan3d', 'meshy', 'worldlabs'].map((id) => MATRICES_PENDIENTES.find((p) => p.id === id));
  check('T2) Tripo, Hunyuan 3D, Meshy y World Labs: PENDING, sin capacidades y matrices originales', cand.every((p) => p && p.status === 'PENDING' && p.capabilities.length === 0 && p.type === 'matrix'));
  check('T3) el runtime ya guarda una salida 3D como `model3d`', /'3d': 'model3d'/.test(leer('functions/src/runtime/materializacion.ts')));
  const indice = sinComentarios(leer('functions/src/index.ts'));
  check('T4) la puerta de importar está construida y NO exportada, con su puerta de configuración',
    !/models3d/.test(indice) && /export const PUERTA_DE_MODELOS_3D = 'aiSettings\/modelos3d';/.test(leer('functions/src/models3d/index.ts')));
  const t31 = seccion('### 3.1 ', '### 3.2 ');
  check('T5) lo que falta para generar va en orden y completo: proveedor, vocabulario, adaptador, registro, puerta, precio, app, Weë Brain y canaries',
    ['**Elegir proveedor**', '**El vocabulario del motor.**', '**El adaptador**', '**El registro.**', '**La puerta.**', '**El precio.**', '**La app.**', '**Weë Brain.**', '**Los canaries 3D-1 a 3D-6**']
      .every((p, i, a) => t31.indexOf(p) >= 0 && (i === 0 || t31.indexOf(p) > t31.indexOf(a[i - 1]))));
  check('T6) nunca un intermediario, tampoco la «3D» de BytePlus que revende', /ni la «3D» de BytePlus ModelArk, que revende Rodin e Hitem3d/.test(t31));
  check('T7) y el 3D de siempre no se repite: el documento del 3D apunta aquí', TRES_D.includes('FILMMAKER-CONTRATOS-Y-CANARIES.md'));
}

/* ═══ K · LOS CANARIES ══════════════════════════════════════════════════════ */
console.log('\n── K · Los canaries: nueve campos y su riesgo, y cada coste con la fórmula o la tarifa del código ──');
const CAMPOS = ['Objetivo', 'Capacidad', 'Proveedor', 'Modelo', 'Entrada', 'Salida esperada', 'Coste estimado', 'Criterio de éxito', 'Condición de activación', 'Riesgo'];
const uno = seccion('### 4.3 ', '## 5. ');
const cabeceras = [...uno.matchAll(/^#### ([A-Z0-9]+(?:-\d)?) · (.+)$/gm)];
const bloques = cabeceras.map((m, i) => {
  const texto = uno.slice(m.index, i + 1 < cabeceras.length ? cabeceras[i + 1].index : undefined);
  const campos = Object.fromEntries(CAMPOS.map((c) => [c, (texto.match(new RegExp(`^- \\*\\*${c}\\.\\*\\* (.+)$`, 'm')) ?? [])[1]]));
  return { id: m[1], titulo: m[2], campos, texto };
});
const deId = (id) => bloques.find((b) => b.id === id);
{
  const esperados = [...Array.from({ length: 18 }, (_, i) => `K${i + 1}`), 'IMG-1', 'IMG-2', 'VOZ-1', 'VIS-1', 'BRN-1', '3D-1', '3D-2', '3D-3', '3D-4', '3D-5', '3D-6', 'INF-1', 'INF-2', 'INF-3', 'INF-4'];
  check('K1) los treinta y tres, en su orden: la toma (K1-K18), imagen, voz, visión, Weë Brain, 3D e infraestructura',
    JSON.stringify(bloques.map((b) => b.id)) === JSON.stringify(esperados), bloques.map((b) => b.id).join(' '));
  const incompletos = bloques.filter((b) => CAMPOS.some((c) => !b.campos[c] || !b.campos[c].trim())).map((b) => `${b.id}:${CAMPOS.filter((c) => !b.campos[c]).join('/')}`);
  check('K2) cada uno con los nueve campos que pide el encargo, más su riesgo', incompletos.length === 0, incompletos.join(' '));
  const resumen = filasDe(seccion('### 4.2 ', '### 4.3 ').split('**Totales.**')[0]);
  check('K3) el resumen tiene una fila por canary, en el mismo orden', JSON.stringify(resumen.map((f) => f[0])) === JSON.stringify(bloques.map((b) => b.id)), resumen.map((f) => f[0]).join(' '));
  const capDe = (s) => (s.match(/`([a-z0-9]+\.[a-z_]+)`/) ?? [])[1];
  const capDistinta = resumen.filter((f) => {
    const b = deId(f[0]);
    if (!b) return true;
    return f[0].startsWith('INF-') ? !(f[1].startsWith('—') && b.campos.Capacidad.startsWith('Ninguna de IA')) : capDe(f[1]) !== capDe(b.campos.Capacidad);
  }).map((f) => f[0]);
  check('K4) la capacidad del resumen es la de cada bloque (la infraestructura, sin capacidad de IA)', capDistinta.length === 0, capDistinta.join(' '));
  const numeros = (s) => [...s.matchAll(/(\d+\.\d+)/g)].map((m) => m[1]);
  const costeDistinto = resumen.filter((f) => {
    const b = deId(f[0]);
    if (!b) return true;
    if (/sin proveedor/.test(f[3])) return !/^Sin proveedor/.test(b.campos['Coste estimado']);
    return !numeros(f[3]).every((x) => numeros(b.campos['Coste estimado']).includes(x));
  }).map((f) => f[0]);
  check('K5) y su coste también', costeDistinto.length === 0, costeDistinto.join(' '));

  /* Cada canary de Seedance: el coste, los tokens y la tarifa, con la fórmula oficial del adaptador. */
  const S = lib('engine/providers/seedance.js');
  const MODELOS = new Set(Object.values(S.SEEDANCE_MODEL_IDS));
  const desglose = (b) => {
    const m = b.campos.Modelo;
    const modelId = (m.match(/`(dreamina-[a-z0-9-]+)`/) ?? [])[1];
    const resolution = ((m.match(/(480p|720p|1080p|4K)/) ?? [])[1] ?? '').toLowerCase();
    const durationSec = Number((m.match(/, (\d+) s(?:,|$)/) ?? [])[1]);
    const ratio = /`adaptive`/.test(m) ? 'adaptive' : (m.match(/, (16:9|9:16|1:1|4:3|3:4|21:9)(?:,|$)/) ?? [])[1];
    const inputVideoSec = Number((m.match(/con (\d+) s de vídeo de entrada/) ?? [])[1] ?? 0);
    return { modelId, resolution, durationSec, ratio, inputVideoSec };
  };
  const ks = bloques.filter((b) => /^K\d+$/.test(b.id));
  check('K6) cada canary de toma nombra un modelo Seedance que existe, con su resolución, su duración y su proporción',
    ks.every((b) => { const d = desglose(b); return MODELOS.has(d.modelId) && d.resolution && d.durationSec > 0 && d.ratio; }),
    ks.filter((b) => { const d = desglose(b); return !(MODELOS.has(d.modelId) && d.resolution && d.durationSec > 0 && d.ratio); }).map((b) => b.id).join(' '));
  const miles = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const tasa = (x) => String(Number(x.toFixed(2))).replace('.', ',');
  const malos = [];
  let totalK1aK17 = 0;
  for (const b of ks) {
    const d = desglose(b);
    const c = S.seedanceCostUsd(d);
    if (b.id !== 'K18') totalK1aK17 += c.usd;
    const coste = b.campos['Coste estimado'];
    const ok = b.id === 'K18'
      ? coste.startsWith(`Hasta USD ${c.usd.toFixed(3)},`)
      : coste.startsWith(`USD ${c.usd.toFixed(3)} (${miles(c.tokens)} tokens a ${tasa(c.ratePerMillion)} USD por millón`);
    if (!ok) malos.push(`${b.id}: doc «${coste.slice(0, 60)}» ≠ USD ${c.usd.toFixed(3)} (${miles(c.tokens)} tokens a ${tasa(c.ratePerMillion)})`);
  }
  check('K7) cada coste de toma es el de la fórmula oficial del adaptador: el dinero, los tokens y la tarifa por millón', malos.length === 0, malos.join(' · '));
  const treinta1080 = S.seedanceCostUsd({ modelId: S.SEEDANCE_MODEL_IDS.SEEDANCE_2_5, resolution: '1080p', durationSec: 30, ratio: '16:9' }).usd;
  check('K8) y lo que K13 dice de 30 s a 1080p, también', deId('K13').campos['Coste estimado'].includes(`A 1080p serían USD ${treinta1080.toFixed(3)}`));
  const totales = seccion('**Totales.**', '### 4.3 ');
  check('K9) el total de la batería de toma (K1-K17) es la suma exacta de sus costes', totales.includes(`**USD ${totalK1aK17.toFixed(3)}**`), totalK1aK17.toFixed(3));
  const tres = resumen.filter((f) => f[0].startsWith('3D-')).reduce((s, f) => s + Number(numeros(f[3])[0]), 0);
  check('K10) y el del 3D con Tripo y World Labs, la suma de sus tarifas', totales.includes(`**USD ${tres.toFixed(2)}**`), tres.toFixed(2));

  /* Imagen, voz, visión y Weë Brain: la tarifa que usa el motor para cobrar, no una estimación a ojo. */
  const IM = lib('engine/imageModels.js');
  const AP = lib('credits/aiPricing.js');
  const REG = lib('engine/registry.js');
  const barato = AP.priceImage({ capability: 'image.generate' }, REG.DEFAULT_SETTINGS);
  const maximo = AP.priceImage({ capability: 'image.generate', quality: 'max' }, REG.DEFAULT_SETTINGS);
  check('K11) imagen: hoy el motor elige FLUX.2 [klein] 9B para crear y Nano Banana Pro para la máxima, a las tarifas que dice el documento',
    barato.model === 'flux-2-klein-9b' && maximo.model === 'gemini-3-pro-image'
    && deId('IMG-1').campos['Coste estimado'].startsWith(`USD ${IM.imageModelOf('flux-2-klein-9b').usd['1K'].toFixed(3)} `)
    && deId('IMG-2').campos['Coste estimado'].startsWith(`USD ${IM.imageModelOf('gemini-3-pro-image').usd['1K'].toFixed(3)} `)
    && deId('IMG-1').campos.Modelo.includes('`flux-2-klein-9b`') && deId('IMG-2').campos.Modelo.includes('`gemini-3-pro-image`'),
    `${barato.model} ${maximo.model}`);
  const voz = (200 / 1000) * AP.VOICE_USD_PER_KCHAR;
  check('K12) voz: 200 caracteres a la tarifa del motor', deId('VOZ-1').campos['Coste estimado'].startsWith(`USD ${voz.toFixed(3)} `) && deId('VOZ-1').campos.Entrada.includes('200 caracteres'));
  const vision = (4 * AP.TOKENS.perImage * AP.MULTIMODAL_RATE.input + AP.DEFAULT_MAX_OUTPUT_TOKENS * AP.MULTIMODAL_RATE.output) / 1e6;
  check('K13) visión: cuatro fotogramas y la salida máxima, a la tarifa multimodal del motor', deId('VIS-1').campos['Coste estimado'].startsWith(`USD ${vision.toFixed(3)}:`), vision.toFixed(5));
  const texto = (4000 * AP.TEXT_RATES.standard.input + AP.DEFAULT_MAX_OUTPUT_TOKENS * AP.TEXT_RATES.standard.output) / 1e6;
  check('K14) Weë Brain: una respuesta con la tarifa estándar del motor', deId('BRN-1').campos['Coste estimado'].startsWith(`Unos USD ${texto.toFixed(3)} por respuesta`), texto.toFixed(5));
  check('K15) el 3D dice de dónde sale su tarifa (la oficial publicada) y que el modelo lo fija su adaptador',
    bloques.filter((b) => b.id.startsWith('3D-')).every((b) => /según su tarifa oficial publicada/.test(b.campos['Coste estimado']) && /Marble|fijado en (su|el) adaptador/.test(b.campos.Modelo)));

  const FUERA = /replicate|fal\.ai|openrouter|together|hugging\s*face|kling|runway|\bveo\b|luma|pika|minimax|vidu|\bwan\b|ltx|sora|suno|rodin|hitem/i;
  check('K16) ningún proveedor fuera de Weë ni un intermediario: el vídeo, solo Seedance',
    bloques.every((b) => !FUERA.test(`${b.campos.Proveedor} ${b.campos.Modelo}`)) && ks.every((b) => /BytePlus ModelArk \(Seedance, API oficial\)/.test(b.campos.Proveedor)));
  const PUERTAS = {
    'aiSettings/render': /doc\('render'\)/.test(leer('functions/src/creator/render.ts')),
    'aiSettings/referencias': /PUERTA_DE_REFERENCIAS = 'aiSettings\/referencias'/.test(leer('functions/src/creator/referenciasDeElementos.ts')),
    'aiSettings/voces': /PUERTA_DE_VOCES = 'aiSettings\/voces'/.test(leer('functions/src/creator/vocesDeDialogo.ts')),
    'aiSettings/cancelacion': /doc\('cancelacion'\)/.test(leer('functions/src/creator/cancelacionDeToma.ts')),
    'aiSettings/runtime': /DOCUMENTO_DE_LA_PUERTA = 'runtime'/.test(leer('functions/src/runtime/configuracion.ts')),
    'aiSettings/modelos3d': /PUERTA_DE_MODELOS_3D = 'aiSettings\/modelos3d'/.test(leer('functions/src/models3d/index.ts')),
  };
  check('K17) las puertas que nombra existen en el código, con ese nombre', Object.values(PUERTAS).every(Boolean) && Object.keys(PUERTAS).every((p) => DOC.includes(`\`${p}\``)), JSON.stringify(PUERTAS));
  const comun = seccion('### 4.1 ', '### 4.2 ');
  check('K18) cómo se hace cualquiera: con tu «sí», dónde, la consola de BytePlus, el criterio común y lo que deja escrito (como el del 2026-09-28)',
    /\*\*Nada se ejecuta sin tu «sí» para ESE canary\.\*\*/.test(comun) && /En producción/.test(comun) && /Desde los emuladores locales/.test(comun)
    && /`ModelNotOpen`/.test(comun) && /\*\*Criterio común de éxito\*\*/.test(comun)
    && /la cuenta de prueba[\s\S]*el asiento del libro[\s\S]*el cierre de la puerta/.test(comun) && /usage\.completion_tokens/.test(comun));
  check('K19) el vídeo nuevo llega con su condición: los modelos se validan en `MODELOS_VALIDADOS_PARA_TOMAS`, que hoy solo tiene 2.0 fast',
    /const MODELOS_VALIDADOS_PARA_TOMAS: ReadonlySet<string> = new Set\(\[SEEDANCE_MODEL_IDS\.SEEDANCE_2_0_FAST\]\);/.test(video)
    && ['K9', 'K12'].every((id) => deId(id).campos['Condición de activación'].includes('`MODELOS_VALIDADOS_PARA_TOMAS`')));
  /* Cierre de R18 (2026-09-30): K7 va en 1:1 para validar también la tabla de píxeles contra la factura. */
  const tablaDeProduccion = Math.round((5 * 720 * 720 * 24) / 1024);
  check('K20) K7 valida también R18: en 1:1 la tabla oficial da 108 000 tokens, y la que sigue en producción, los 60 750 que dice',
    desglose(deId('K7')).ratio === '1:1' && S.seedanceTokens('720p', '1:1', 5, 0, S.SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST) === 108000
    && tablaDeProduccion === 60750 && deId('K7').campos['Criterio de éxito'].includes('108 000 tokens') && deId('K7').campos['Criterio de éxito'].includes('60 750'));
}

/* ═══ X · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── X · Nada hecho ni abierto; enlazado y sin duplicar; en la cadena ──');
{
  check('X1) la cabecera dice que nada de esto está hecho ni abierto', /\*\*Nada de lo que hay aquí está hecho ni abierto\*\*/.test(DOC) && /no se ejecutó ningún canary y\s+> no se abrió ninguna puerta/.test(DOC));
  const BASE = git('log --format=%H -n 1 --grep "Workplace fixes that keep the approved layout"').trim();
  const HASTA = git('log --format=%H -n 1 --grep "Phase 39: contracts and canaries prepared"').trim();
  const tramo = HASTA ? `${BASE} ${HASTA}` : BASE;
  const tocados = git(`diff --name-only ${tramo}`).trim().split('\n').filter(Boolean).filter((p) => !p.startsWith('functions/lib/'));
  const fuera = tocados.filter((p) => !/^(docs\/|functions\/test\/|functions\/package\.json$)/.test(p));
  check('X2) la Fase 39 solo toca documentos, pruebas y la lista de suites: ningún código, ninguna puerta', BASE && fuera.length === 0, fuera.join(','));
  check('X3) la matriz maestra la enlaza desde su plan de fases y desde lo que necesita una decisión',
    /\| 39 \| Contratos y canaries preparados \|[^\n]*`docs\/FILMMAKER-CONTRATOS-Y-CANARIES\.md`/.test(MAESTRA)
    && MAESTRA.slice(MAESTRA.indexOf('## 6. ')).includes('FILMMAKER-CONTRATOS-Y-CANARIES.md'));
  check('X4) R18 no se repite aquí: se enlaza su documento', /## 5\. R18[\s\S]*`docs\/FILMMAKER-R18-TABLA-DE-PIXELES\.md`/.test(DOC) && fs.existsSync(path.resolve(RAIZ, 'docs/FILMMAKER-R18-TABLA-DE-PIXELES.md')));
  check('X5) la marca se escribe «Weë»', !/(^|[^A-Za-z`_/-])Wee(?![ëA-Za-z_])/m.test(DOC));
  check('X6) en la cadena de `npm test`, detrás de los arreglos del workplace',
    /filmmaker-workplace-arreglos\.test\.mjs && node test\/filmmaker-contratos-canaries\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ filmmaker-contratos-canaries: ${n - failures}/${n}` : `\n✔ filmmaker-contratos-canaries: ${n}/${n}`);
if (failures) process.exit(1);
