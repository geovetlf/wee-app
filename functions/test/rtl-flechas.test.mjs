/*
 * LAS FLECHAS EN RTL (árabe, hebreo, persa) — fase E de la integración de idiomas, 2026-11-05. Sin emuladores: fuentes.
 *
 * Complementa la sección F de `rtl-y-enlaces.test.mjs` (flechas, cheurones y triángulos) con lo que faltaba:
 *
 *  A · el icono común (`components/IconoDireccional.tsx`) distingue, con una lista EXPLÍCITA, lo que señala un sentido
 *      de lectura (se refleja en RTL) de lo que tiene orientación fija (reproducir, vertical, circular, simétrico,
 *      pictogramas): y en LTR no añade nada;
 *  B · todo icono que señala —también `send`, `arrow-undo/redo`, `log-in/out`— pasa por él o por `dir.espejo`, y los
 *      componentes compartidos que reciben el nombre en una variable (BotonPequeno, avisos) pintan con él;
 *  C · no hay doble inversión: nadie combina el icono común con otro reflejo, ni escribe `scaleX: -1` a mano;
 *  D · las flechas ESCRITAS: en código salen de `dir.flecha`; en los diccionarios RTL apuntan a la izquierda y en los
 *      LTR a la derecha (solo se leen: esta suite no toca ningún diccionario).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const require = createRequire(import.meta.url);
const ts = require('typescript');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`);
};
const transpilar = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;

// El hook puro, en los dos sentidos.
const dirMod = { exports: {} };
new Function('module', 'exports', 'require', transpilar(leer('hooks/useDireccion.ts')))(dirMod, dirMod.exports, (m) => (m.includes('IdiomaContext') ? { useIdioma: () => ({ direccion: 'ltr' }) } : require(m)));
const LTR = dirMod.exports.estilosDeDireccion('ltr');
const RTL = dirMod.exports.estilosDeDireccion('rtl');

// El icono común, con React de mentira: devuelve las props con que pintaría el Ionicons de verdad.
const icoSrc = leer('components/IconoDireccional.tsx');
const cargarIcono = (dir) => {
  const mod = { exports: {} };
  const React = { createElement: (_tipo, props) => props };
  React.default = React;
  new Function('module', 'exports', 'require', transpilar(icoSrc))(mod, mod.exports, (m) => (m === 'react' ? React : m.includes('useDireccion') ? { useDireccion: () => dir } : { Ionicons: 'Ionicons' }));
  return mod.exports;
};
const enRTL = cargarIcono(RTL);
const enLTR = cargarIcono(LTR);
const esDir = enRTL.esIconoDireccional;

console.log('\n── A · Qué señala y qué no (lista explícita) ──');
const SENALAN = [
  'arrow-back', 'arrow-forward', 'arrow-back-outline', 'arrow-forward-sharp', 'arrow-back-circle', 'arrow-forward-circle-outline',
  'chevron-back', 'chevron-forward', 'chevron-back-outline', 'chevron-forward-circle', 'caret-back', 'caret-forward-outline',
  'send', 'send-outline', 'send-sharp', 'arrow-undo', 'arrow-undo-outline', 'arrow-redo', 'arrow-redo-outline', 'arrow-undo-circle',
  'log-in', 'log-in-outline', 'log-out', 'log-out-outline', 'enter-outline', 'exit-outline', 'return-up-back', 'return-down-forward-outline',
];
// Orientación fija, cada grupo con su porqué.
const FIJOS = {
  reproduccion: ['play', 'play-forward', 'play-back', 'play-forward-outline', 'play-skip-forward', 'play-skip-back-outline', 'play-circle'], // el tiempo de un medio no cambia de sentido
  vertical: ['chevron-up', 'chevron-down', 'arrow-up', 'arrow-down', 'caret-down', 'arrow-up-circle', 'chevron-down-outline', 'download-outline', 'cloud-upload-outline', 'share-outline'], // arriba/abajo no depende de la lectura
  expandir: ['expand', 'contract', 'expand-outline', 'resize'], // simétricos
  circular: ['refresh', 'refresh-outline', 'repeat', 'repeat-outline', 'sync-outline', 'reload'], // giran, no señalan
  simetrico: ['swap-horizontal', 'swap-horizontal-outline', 'swap-vertical'],
  pictogramas: ['paper-plane', 'paper-plane-outline', 'share-social-outline', 'navigate', 'navigate-outline', 'trending-up', 'trending-up-outline', 'trending-down-outline', 'airplane', 'heart', 'checkmark', 'flag'],
  noNombres: [undefined, null, 42, '', 'arrow-backwards', 'sendx', 'xsend', 'chevron-back-up'],
};
check(`1) refleja los ${SENALAN.length} nombres que señalan un sentido de lectura`, SENALAN.every(esDir), SENALAN.filter((n) => !esDir(n)).join(', '));
for (const [grupo, nombres] of Object.entries(FIJOS)) {
  check(`2) conserva la orientación: ${grupo}`, !nombres.some(esDir), nombres.filter(esDir).join(', '));
}

console.log('\n── B · El icono común en los dos sentidos ──');
const estilo = { opacity: 0.5 };
const rtlSend = enRTL.default({ name: 'send', style: estilo });
const ltrSend = enLTR.default({ name: 'send', style: estilo });
const rtlPlay = enRTL.default({ name: 'play-forward', style: estilo });
check('3) en RTL, `send` lleva el espejo del hook delante del estilo propio', Array.isArray(rtlSend.style) && rtlSend.style[0] === RTL.espejo && rtlSend.style[1] === estilo && RTL.espejo.transform[0].scaleX === -1);
check('4) en LTR, el MISMO estilo que se le pasó (ni un objeto más): LTR no cambia', ltrSend.style === estilo && enLTR.default({ name: 'arrow-back' }).style === undefined);
check('5) en RTL, lo que no señala pasa intacto (play-forward)', rtlPlay.style === estilo);
check('6) el resto de props llega tal cual al Ionicons', rtlSend.name === 'send' && enRTL.default({ name: 'chevron-forward', size: 18, color: '#fff' }).size === 18);

console.log('\n── C · Toda la app: las flechas pasan por la utilidad ──');
const CARPETAS = ['components', 'screens', 'navigation', 'constants', 'hooks', 'utils'];
const fuentes = ['App.tsx'];
const recorrer = (rel) => {
  for (const e of fs.readdirSync(path.join(RAIZ, rel), { withFileTypes: true })) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) recorrer(r);
    else if (/\.tsx?$/.test(e.name)) fuentes.push(r);
  }
};
CARPETAS.forEach(recorrer);
// Los nombres que esta fase añadió (los de flechas/cheurones ya los barre la sección F de rtl-y-enlaces).
const NOMBRE_NUEVO = /['"](?:send|arrow-(?:undo|redo)(?:-circle)?|log-(?:in|out)|enter|exit|return-(?:up|down)-(?:back|forward))(?:-outline|-sharp)?['"]/;
const NOMBRE_CUALQUIERA = /['"](?:(?:arrow|chevron|caret)-(?:back|forward|left|right)(?:-circle)?|send|arrow-(?:undo|redo)(?:-circle)?|log-(?:in|out)|enter|exit|return-(?:up|down)-(?:back|forward))(?:-outline|-sharp)?['"]/;
// Literales fuera de una etiqueta de icono, con su porqué (y comprobado en 9).
const PERMITIDOS = {
  'constants/camaraCinematica.ts': 'push-in / pull-out describen un movimiento de cámara, no un sentido de lectura: StudioControles los pinta con Ionicons fijo',
  'screens/NotificationsScreen.tsx': 'arrow-undo de «respuesta» viaja en getNotificationIcon() y se pinta con IconoDireccional',
  'components/studio/produccion/ProductionHeader.tsx': 'va a BotonPequeno, que pinta con IconoDireccional',
  'components/studio/produccion/ProductionAvisos.tsx': 'va a BotonPequeno, que pinta con IconoDireccional',
};
const sinReflejo = [];
const sueltos = [];
const doble = [];
const scaleXManual = [];
let usos = 0;
for (const rel of fuentes) {
  if (rel === 'components/IconoDireccional.tsx') continue;
  const src = sinComentarios(leer(rel)).replace(/returnKeyType: 'send'/g, '');
  for (const tag of src.match(/<Ionicons\b[\s\S]*?\/>/g) || []) {
    if (NOMBRE_CUALQUIERA.test(tag) && !/dir\.espejo/.test(tag)) sinReflejo.push(`${rel}: ${tag.replace(/\s+/g, ' ').slice(0, 70)}`);
  }
  for (const tag of src.match(/<IconoDireccional\b[\s\S]*?\/>/g) || []) {
    usos++;
    if (/espejo|scaleX|rotate/.test(tag)) doble.push(`${rel}: ${tag.replace(/\s+/g, ' ').slice(0, 70)}`);
  }
  const fuera = src.replace(/<(?:Ionicons|IconoDireccional)\b[\s\S]*?\/>/g, '');
  if (NOMBRE_NUEVO.test(fuera) && !PERMITIDOS[rel]) sueltos.push(rel);
  if (/scaleX:\s*-1/.test(src) && rel !== 'hooks/useDireccion.ts') scaleXManual.push(rel);
}
check('7) ningún icono que señala pintado con Ionicons sin reflejo (send, undo/redo, log-in/out incluidos)', sinReflejo.length === 0, sinReflejo.join(' | '));
check('8) ningún nombre que señala suelto fuera de los permitidos con motivo', sueltos.length === 0, sueltos.join(', '));
const notif = sinComentarios(leer('screens/NotificationsScreen.tsx'));
const piezas = sinComentarios(leer('components/studio/produccion/ProductionPiezas.tsx'));
const controles = sinComentarios(leer('components/studio/StudioControles.tsx'));
check('9) los permitidos cumplen su motivo',
  /<IconoDireccional name=\{icon\.name as any\}/.test(notif)
  && /<IconoDireccional name=\{icono as any\} size=\{scale\(16\)\}/.test(piezas)
  && !/IconoDireccional/.test(controles) && /<Ionicons[\s\S]{0,40}name=\{comando\.icono as any\}/.test(controles));
check(`10) las flechas usan el icono común (${usos} usos; suelo 87 tras la fase E)`, usos >= 87);

console.log('\n── D · Sin doble inversión ──');
check('11) ningún IconoDireccional lleva además espejo, scaleX ni rotate', doble.length === 0, doble.join(' | '));
check('12) nadie escribe `scaleX: -1` a mano: el reflejo sale solo de `espejo` (useDireccion)', scaleXManual.length === 0, scaleXManual.join(', '));
check('13) el icono común no tiene transform propio: usa el `espejo` del hook, y solo en RTL', !/scaleX/.test(sinComentarios(icoSrc)) && /dir\.esRTL && esIconoDireccional\(resto\.name\)/.test(icoSrc));
// Hubo un segundo reflejo (components/Ionicons.tsx + hooks/useLayoutRTL.ts, del proyecto i18n global): se retiró en E2
// (2026-11-05). Que no vuelva: ni esos archivos, ni otro envoltorio de Ionicons que se refleje por su cuenta.
const retirados = ['components/Ionicons.tsx', 'hooks/useLayoutRTL.ts'].filter((r) => fs.existsSync(path.join(RAIZ, r)));
// Un envoltorio = reenvía todas sus props a un Ionicons (`<Ionicons {...props}` o un alias) y decide un reflejo.
const envoltorios = fuentes.filter((r) => {
  if (r === 'components/IconoDireccional.tsx') return false;
  const src = sinComentarios(leer(r));
  return /from '@expo\/vector-icons'/.test(src) && /<Ionicons\w*\s+\{\.\.\.\w+\}/.test(src) && /\b(?:scaleX|espejo|esRTL|isRTL)\b/.test(src);
});
check('14) el segundo reflejo ya no existe y nadie crea otro envoltorio que espeje Ionicons', retirados.length === 0 && envoltorios.length === 0, [...retirados, ...envoltorios].join(', '));
check('14b) la avioneta (paper-plane) queda fija en todos los idiomas: representa compartir, no un sentido', !esDir('paper-plane') && !esDir('paper-plane-outline') && !esDir('paper-plane-sharp'));
const caja = sinComentarios(leer('components/creator/CajaDePrompt.tsx'));
check('15) Caja de prompt: el avión de enviar se refleja y su empujón óptico cambia de lado (LTR intacto: marginLeft 3)', /<IconoDireccional name="send"[^>]*style=\{dir\.esRTL \? \{ marginRight: 3 \} : \{ marginLeft: 3 \}\}/.test(caja));

console.log('\n── E · Las flechas escritas ──');
check('16) el hook da → › en LTR y ← ‹ en RTL', LTR.flecha.adelante === '→' && LTR.flecha.siguiente === '›' && RTL.flecha.adelante === '←' && RTL.flecha.siguiente === '‹');
// En código, una flecha escrita solo vive en el hook, en el ← del Header web (que se refleja) o entre identificadores
// del motor en el panel de administración: «gemini → openai → demo» son nombres latinos que el algoritmo bidi deja
// de izquierda a derecha también en RTL, así que la flecha debe seguir siendo →.
const FLECHA = /[→←›‹]/;
const FLECHA_PERMITIDA = {
  'hooks/useDireccion.ts': 'la fuente de dir.flecha',
  'components/Header.tsx': '← con dir.espejo (y el mapa WEB_ICONS de respaldo)',
  'screens/EngineAdminScreen.tsx': 'cadena de identificadores latinos: bidi la deja LTR',
};
const conFlecha = fuentes.filter((r) => FLECHA.test(sinComentarios(leer(r)).replace(/\{\/\*[\s\S]*?\*\/\}/g, '')) && !FLECHA_PERMITIDA[r]);
check('17) ninguna flecha escrita en código fuera de las permitidas con motivo', conFlecha.length === 0, conFlecha.join(', '));
const DIC = path.join(RAIZ, 'i18n/textos');
const valoresCon = (idioma, re) => {
  const hallados = [];
  const ir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) ir(p); else if (/\.ts$/.test(e.name)) sinComentarios(fs.readFileSync(p, 'utf8')).split('\n').forEach((l) => { if (re.test(l)) hallados.push(`${path.relative(DIC, p)}: ${l.trim().slice(0, 60)}`); }); } };
  ir(path.join(DIC, idioma));
  return hallados;
};
for (const l of ['ar', 'he', 'fa']) {
  const mal = valoresCon(l, /[→›]/);
  const bien = valoresCon(l, /←/);
  check(`18) ${l}: las flechas de «Ver todos / historial / comprar» apuntan a la izquierda`, mal.length === 0 && bien.length >= 4, mal.join(' | '));
}
for (const l of ['es', 'en']) {
  const mal = valoresCon(l, /[←‹]/);
  check(`19) ${l}: ninguna flecha a la izquierda en un diccionario LTR`, mal.length === 0, mal.join(' | '));
}

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
