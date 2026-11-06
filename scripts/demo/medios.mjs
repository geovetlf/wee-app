/*
 * EL PLAN DE MEDIOS DE LA DEMO Y SU COSTE — puro.
 *
 * Dos cosas distintas, a propósito:
 *  · el PLAN (`planDeMedios`): qué ranura hace falta, cómo se pretende conseguir y qué se le pediría al motor;
 *  · el REGISTRO (`<carpeta>/registro.json`): qué archivo hay de verdad en cada ranura y cómo se hizo. Es lo único que
 *    lee el sembrador, así que «Cómo lo hice» cuenta lo que pasó, no lo que se planeó.
 *
 * Los archivos no se versionan (el repositorio es público) y no suben a ningún almacenamiento real.
 */
import { CREADORES, PUBLICACIONES, WEELS } from './datos.mjs';

/* Precios de lista del propio motor (functions/src/engine/imageModels.ts y providers/seedance.ts). */
export const MODELO_IMAGEN = 'gemini-3.1-flash-image';
export const USD_POR_IMAGEN = 0.067;
export const MODELO_VIDEO = 'dreamina-seedance-2-0-fast-260128';
export const USD_POR_SEGUNDO = 0.12;
/* 4 s es el mínimo del modelo. `weel-07` ya existe con 6 s y no se repite. */
export const SEGUNDOS_POR_WEEL = 4;

const DOS = (n) => String(n).padStart(2, '0');
const COLETILLA_PERSONA = 'Photorealistic, natural skin, candid expression. A fictional person who does not resemble any real individual. No text, no logos.';

/** Toda ranura de medio de la demo. */
export const planDeMedios = () => {
  const plan = [];
  for (const c of CREADORES) {
    plan.push({ id: `avatar-${DOS(c.n)}`, tipo: 'imagen', origen: 'ia', proporcion: '1:1', prompt: `Portrait photograph of a ${c.rasgos}. ${COLETILLA_PERSONA}` });
    plan.push({ id: `cover-${DOS(c.n)}`, tipo: 'imagen', origen: 'ia', proporcion: '16:9', prompt: `Wide atmospheric photograph evoking the world of a ${c.oficio} from ${c.pais}, no people, no text, natural colors, editorial style.` });
  }
  /* La galería de Weë Fashion (components/fashion/GaleriaDeFashion.tsx). */
  const SIN_MARCAS = 'Editorial fashion photography, natural light, elegant and modern. A fictional model who does not resemble any real individual. No text, no logos.';
  for (const [id, escena] of Object.entries({
    clothes: 'A woman wearing a tailored camel coat and wide trousers on a city street',
    shoes: 'Close-up of elegant leather ankle boots and clean white sneakers styled on a stone floor',
    hair: 'A woman with a modern glossy bob haircut in a bright salon, seen from the side',
    look: 'A man with a fresh modern look: sharp haircut, navy overshirt and light trousers',
    nails: 'Close-up of a hand with an elegant almond manicure in soft nude and gold tones',
    makeup: 'A woman with soft luminous makeup and a warm lip color, close portrait',
  })) { plan.push({ id: `fashion-${id}`, tipo: 'imagen', origen: 'ia', proporcion: '4:5', prompt: `${escena}. Black and white high-fashion editorial photograph, high contrast, modern. ${SIN_MARCAS}` });
    /* A color (decisión del dueño, 2026-11-02): son las que usa la portada de Weë Fashion. */
    plan.push({ id: `fashionc-${id}`, tipo: 'imagen', origen: 'ia', proporcion: '4:5', prompt: `${escena}. Vibrant full-color high-fashion editorial photograph, rich natural colors, modern. ${SIN_MARCAS}` }); }
  /* Las cabeceras de las secciones (components/creator/CabeceraDeSeccion.tsx). */
  for (const [id, escena] of Object.entries({
    studio: 'A modern creative video studio with cinema camera, soft lights and editing screens',
    design: 'A minimal design studio with material samples, product models and an architectural model on a clean desk',
    chef: 'A beautifully plated colorful healthy dish on a dark ceramic plate in a modern kitchen',
    music: 'A dark modern music studio with a mixing console, synthesizer and warm amber lights, no people',
    travel: 'A black and white photograph of a scenic coastal road seen from above with mountains and sea',
    fashion: 'A contemporary fashion atelier with elegant garments on a rail, fabric samples and soft daylight',
  })) plan.push({ id: `hero-${id}`, tipo: 'imagen', origen: 'ia', proporcion: '16:9', prompt: `${escena}. Cinematic, modern, editorial photography. No people, no text, no logos.` });
  /* Weë Design: la cabecera y «My creations» (constants/designTools.ts). Productos en 3D sobre negro, sin personas. */
  for (const [id, escena] of Object.entries({
    hero: 'A floating composition of a futuristic sneaker, a chrome electric guitar and a sculptural chair, levitating in a dark void with rim lighting and a golden glow',
    d5: 'A futuristic translucent sneaker with glowing gold details, floating at an angle',
    d6: 'A chrome and black electric guitar with liquid metal surfaces, floating at an angle',
    d1: 'A sculptural modern living room concept in matte black and warm gold light',
    d2: 'A futuristic glass and black steel house on a cliff at night with warm interior light',
    d3: 'A sleek futuristic black yacht concept on a mirror-like dark sea at dusk',
    d4: 'A parametric sculptural armchair in white and gold, floating',
  })) plan.push({ id: `design-${id}`, tipo: 'imagen', origen: 'ia', proporcion: id === 'hero' ? '16:9' : '4:3', prompt: `${escena}. High-end photorealistic 3D product render, Octane style, deep black studio background, dramatic lighting, ultra modern. No people, no text, no logos.` });
  for (const p of PUBLICACIONES) {
    if (p.medio) plan.push({ id: p.medio, tipo: 'imagen', origen: 'ia', proporcion: '4:5', prompt: p.prompt });
  }
  for (const w of WEELS) {
    if (w.origen === 'ia') {
      const primerFotograma = w.referencia || w.miniatura;
      plan.push({ id: primerFotograma, tipo: 'imagen', origen: 'ia', proporcion: '9:16', prompt: w.promptReferencia || `First frame: ${w.prompt}` });
      plan.push({ id: w.medio, tipo: 'video', origen: 'ia', proporcion: '9:16', segundos: SEGUNDOS_POR_WEEL, primerFotograma, prompt: w.prompt });
    } else {
      plan.push({ id: w.medio, tipo: 'video', origen: 'stock', proporcion: '9:16', busqueda: w.busqueda });
    }
  }
  return plan;
};

/** Lo que costaría generar lo que aún no existe, a precio de lista. Lo de stock no cuesta. */
export const presupuesto = (plan, registro = {}) => {
  const pendientes = plan.filter((m) => m.origen === 'ia' && !(registro[m.id] && registro[m.id].origen === 'ia'));
  const imagenes = pendientes.filter((m) => m.tipo === 'imagen');
  const videos = pendientes.filter((m) => m.tipo === 'video');
  const usdImagenes = imagenes.length * USD_POR_IMAGEN;
  const usdVideos = videos.reduce((suma, m) => suma + m.segundos * USD_POR_SEGUNDO, 0);
  return { imagenes: imagenes.length, videos: videos.length, usdImagenes, usdVideos, usd: usdImagenes + usdVideos };
};

/**
 * ¿Se puede generar? Pura. Sin autorización expresa con tope, no se llama a nadie.
 * @returns {{ ok: true, tope: number, proyecto: string } | { ok: false, motivo: string }}
 */
export const decidirGeneracion = ({ argv = [], env = {} } = {}) => {
  const valor = (b) => { const i = argv.indexOf(b); return i >= 0 ? argv[i + 1] : undefined; };
  const proyecto = valor('--project') || 'demo-wee-migracion';
  if (!proyecto.startsWith('demo-')) return { ok: false, motivo: `«${proyecto}» no es un proyecto demo-*.` };
  if (!env.FIREBASE_STORAGE_EMULATOR_HOST) return { ok: false, motivo: 'Falta FIREBASE_STORAGE_EMULATOR_HOST: lo generado pasa por el emulador, nunca por un Storage real.' };
  if (env.GOOGLE_APPLICATION_CREDENTIALS) return { ok: false, motivo: 'Hay credenciales de servicio en el entorno: quítalas.' };
  const tope = Number(valor('--autorizado-usd'));
  if (!Number.isFinite(tope) || tope <= 0) return { ok: false, motivo: 'Sin --autorizado-usd <tope> no se llama a ningún proveedor de pago.' };
  if (tope > TOPE_ABSOLUTO_USD) return { ok: false, motivo: `El dueño autorizó ${TOPE_ABSOLUTO_USD} USD como máximo absoluto: un tope mayor no se acepta.` };
  return { ok: true, tope, proyecto };
};

/** El máximo que autorizó el dueño (2026-11-01), reintentos incluidos. Subirlo exige su autorización. */
export const TOPE_ABSOLUTO_USD = 20;

/** Lo gastado o reservado en TODAS las ejecuciones: cada intento cuenta, también los que fallan. */
export const gastoAcumulado = (libro) => (libro?.intentos || []).reduce((suma, i) => suma + (Number.isFinite(i.usd) ? i.usd : 0), 0);

/** ¿Cabe otro intento? Se pregunta ANTES de llamar, con el coste previsto. */
export const cabeOtroIntento = (libro, previsto, tope) => gastoAcumulado(libro) + previsto <= Math.min(tope, TOPE_ABSOLUTO_USD);

/** El coste previsto de una ranura, a precio de lista. */
export const costePrevisto = (m) => (m.tipo === 'imagen' ? USD_POR_IMAGEN : m.segundos * USD_POR_SEGUNDO);

/** Quita de un texto cualquier valor secreto antes de escribirlo en un registro o en la pantalla. */
export const sinSecretos = (texto, secretos) => (secretos || []).filter((s) => s && s.length >= 8)
  .reduce((t, s) => t.split(s).join('[oculto]'), String(texto));
