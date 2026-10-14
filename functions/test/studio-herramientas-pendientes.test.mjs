/**
 * WEË STUDIO — LAS HERRAMIENTAS DEL CATÁLOGO QUE TODAVÍA NO TIENEN CAMINO (Frente F, 2026-10-14).
 *
 * «Más herramientas» y «Documentos» enseñaban herramientas —unir clips, cortar un vídeo, limpiar un audio, crear un
 * PDF, resumir un PDF subido…— que ningún plan del servidor sabe hacer. Elegirlas escribía su nombre en la caja y el
 * texto acababa en otro plan (un clip nuevo, un texto) que se cobraba. Ahora se ven apagadas con su motivo, igual que
 * «Videoclip» o «Varias escenas», y no abren nada.
 *
 *   A · El catálogo (cargado de verdad): cuáles están pendientes, con qué motivo, y que lo que sí tiene camino sigue abierto.
 *   B · Los textos: cada motivo existe y no está vacío en los dieciséis diccionarios (cargados de verdad).
 *   C · El panel pasa el motivo a la misma tarjeta de siempre (que ya no abre lo pendiente).
 *   D · La realidad del servidor que justifica cada motivo. Si un día aparece el camino, esta sección falla y avisa:
 *       hay que quitar el motivo y reabrir la herramienta, no dejarla apagada por inercia.
 *
 * Sin red, sin Firebase, sin emulador. $0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = (letra, fn) => {
  try { fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};

const cargar = crearCargador();
let T;

seccion('A', () => {
  T = cargar('constants/studioTools.ts');
  const grupo = (id) => T.GRUPOS_DE_HERRAMIENTAS.find((g) => g.id === id).herramientas;
  const motivo = (lista, id) => lista.find((h) => h.id === id)?.pendiente;

  const video = grupo('video');
  check('A1) todo el grupo Vídeo de «Más herramientas» está pendiente (no hay edición de un vídeo existente)',
    video.length === 10 && video.every((h) => typeof h.pendiente === 'string'), video.map((h) => `${h.id}:${h.pendiente}`).join(' '));
  check('A2) «Unir» dice lo mismo que «Varias escenas» (studio.pendCompose)', motivo(video, 'join') === 'studio.pendCompose');
  check('A3) el resto de Vídeo dice studio.pendVideoEdit',
    video.filter((h) => h.id !== 'join').every((h) => h.pendiente === 'studio.pendVideoEdit'));

  const audio = grupo('audio');
  check('A4) Audio: limpiar, ruido, mejorar, transcribir y extraer → studio.pendAudio',
    ['clean', 'noise', 'enhance', 'transcribe', 'extract'].every((id) => motivo(audio, id) === 'studio.pendAudio'));
  check('A5) Audio: «Texto a voz» sigue abierta (voice.tts tiene camino)', motivo(audio, 'tts') === undefined);

  check('A6) Imagen y Texto de «Más herramientas» siguen abiertas enteras',
    grupo('image').every((h) => !h.pendiente) && grupo('text').every((h) => !h.pendiente));

  const archivos = grupo('files');
  check('A7) Archivos: imagen a PDF y convertir → studio.pendFiles',
    motivo(archivos, 'imageToPdf') === 'studio.pendFiles' && motivo(archivos, 'convert') === 'studio.pendFiles');
  check('A8) Archivos: PDF a texto, resumir y preguntar → studio.pendReadFiles',
    ['pdfToText', 'summarize', 'ask'].every((id) => motivo(archivos, id) === 'studio.pendReadFiles'));

  const docs = T.HERRAMIENTAS_POR_AREA.documents;
  check('A9) Documentos: lo que es un ARCHIVO está pendiente con studio.pendFiles',
    ['pdf', 'ebook', 'deck', 'catalog', 'brochure', 'imageToPdf', 'toPdf'].every((id) => motivo(docs, id) === 'studio.pendFiles'));
  check('A10) Documentos: lo que LEE un archivo subido está pendiente con studio.pendReadFiles',
    ['pdfToText', 'summarize', 'ask', 'compare'].every((id) => motivo(docs, id) === 'studio.pendReadFiles'));
  check('A11) Documentos: documento, guía y manual (texto que escribe Weë Writer) siguen abiertas',
    ['document', 'guide', 'manual'].every((id) => docs.some((h) => h.id === id) && motivo(docs, id) === undefined));

  // Ninguna clave nueva se inventa fuera de estas cinco.
  const todas = [...T.GRUPOS_DE_HERRAMIENTAS.flatMap((g) => g.herramientas), ...Object.values(T.HERRAMIENTAS_POR_AREA).flat()];
  const motivos = new Set(todas.map((h) => h.pendiente).filter(Boolean));
  check('A12) solo cinco motivos, todos de studio.pend*',
    [...motivos].sort().join(',') === 'studio.pendAudio,studio.pendCompose,studio.pendFiles,studio.pendReadFiles,studio.pendVideoEdit',
    [...motivos].join(','));
});

seccion('B', () => {
  const idiomas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((d) => fs.existsSync(path.join(RAIZ, 'i18n/textos', d, 'studio.ts')));
  check('B1) son los dieciséis diccionarios', idiomas.length === 16, idiomas.join(' '));
  for (const l of idiomas) {
    const { studio } = cargar(`i18n/textos/${l}/studio.ts`);
    const faltan = ['pendVideoEdit', 'pendAudio', 'pendFiles', 'pendReadFiles', 'pendCompose']
      .filter((k) => typeof studio[k] !== 'string' || !studio[k].trim() || !studio[k].includes('Weë'));
    check(`B2) ${l}: los cinco motivos existen, no están vacíos y nombran «Weë»`, faltan.length === 0, faltan.join(' '));
  }
  const pt = cargar('i18n/textos/pt/studio.ts').studio;
  check('B3) pt es brasileño: «arquivos», nunca «ficheiros»',
    /arquivos/.test(pt.pendFiles) && /arquivos/.test(pt.pendReadFiles) && !/ficheiro/.test(pt.pendFiles + pt.pendReadFiles));
});

seccion('C', () => {
  const panel = sinComentarios(leer('components/studio/StudioPanel.tsx'));
  check('C1) las herramientas de «Más» pasan su motivo a la tarjeta',
    /grupo\.id \+ h\.id, \(\) => onElegir\(\{ entrada, herramienta: h, controles: \{\} \}\), h\.pendiente\)/.test(panel));
  check('C2) las de un área (Documentos) también',
    /tarjeta\(h\.clave, h\.icono, h\.id, \(\) => onElegir\(\{ entrada, herramienta: h, controles: \{\} \}\), h\.pendiente\)/.test(panel));
  check('C3) y la tarjeta no abre lo pendiente: cuenta el motivo',
    /onPress=\{pendiente \? \(\) => setExplicando\(pendiente\) : onPress\}/.test(panel));
});

seccion('D', () => {
  const registry = sinComentarios(leer('functions/src/engine/registry.ts'));
  for (const cap of ['video.compose', 'video.montage', 'video.vertical', 'doc.render']) {
    check(`D1) ${cap} sigue sin proveedor real (si lo tiene, reabrir sus herramientas)`,
      new RegExp(`'${cap.replace('.', '\\.')}': routing\\('${cap.replace('.', '\\.')}', \\[\\]`).test(registry));
  }
  const plantillas = sinComentarios(leer('functions/src/creator/templates.ts'));
  for (const cap of ['doc.read', 'audio.transcribe', 'video.vertical', 'video.montage', 'doc.render']) {
    check(`D2) ninguna plantilla usa ${cap} (si una lo usa, reabrir sus herramientas)`, !plantillas.includes(`'${cap}'`));
  }
  const studio = sinComentarios(leer('screens/StudioScreen.tsx'));
  check('D3) el Studio solo adjunta imágenes (ni audio, ni vídeo, ni documentos)',
    /mediaTypes: \['images'\]/.test(studio) && !/DocumentPicker|getDocumentAsync|mediaTypes: \['videos'|'audio'/.test(studio));
});

console.log(failures === 0 ? `\nStudio · herramientas pendientes: ${n}/${n} ✔` : `\n${failures} fallo(s) de ${n}`);
process.exit(failures === 0 ? 0 : 1);
