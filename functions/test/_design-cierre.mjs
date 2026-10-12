#!/usr/bin/env node
/*
 * WEË DESIGN — «TERMINADO», EJECUTABLE (cierre R7, 2026-10-11).
 *
 * `docs/WEE-DESIGN-CIERRE.md` dice cuándo está terminado Weë Design; este corredor lo comprueba. Cada criterio `CL-xx`
 * del documento es una función de aquí que LEE el código de la rama (o ejecuta lo compilado en `functions/lib`) y contesta
 * una de cuatro cosas, sin adivinar:
 *
 *   CUMPLIDO  la comprobación de máquina pasa (o, si es manual, está REGISTRADA en el documento);
 *   ABIERTO   la comprobación de máquina falla: falta código o una corrección;
 *   DECISION  la comprobación falla Y falta una decisión del dueño, escrita donde el corredor la lee (una fila de
 *             `docs/DESIGN.md` §4 o de `docs/WEE-DESIGN-UIUX-DECISIONS.md` que diga «DECIDIDA»): sin ella no hay qué construir;
 *   MANUAL    no se puede comprobar aquí (es pesado, o es del dueño o de la infraestructura): se dice el comando, y quien lo
 *             ejecuta lo anota en la tabla «Registro de cierre» del documento con la palabra REGISTRADO y la ruta de su log.
 *
 *   node functions/test/_design-cierre.mjs               # todos
 *   node functions/test/_design-cierre.mjs --solo CL-06  # uno (o varios, separados por coma)
 *
 * Sale con 0 SOLO si todos están CUMPLIDOS: esa es la definición de «Weë Design terminado» en lenguaje verificable.
 * Mientras tanto sale con 1, y eso es lo esperado: no está en la cadena de `npm test` (la cadena solo falla por
 * regresiones; esto mide lo que falta). No toca la red, ni Firebase, ni ningún emulador: es ligero.
 *
 * El nombre empieza por «_» como `_cadena.mjs` y `_emuladores.mjs`: es un corredor, no una suite. La suite
 * `design-cierre.test.mjs` (grupo C) vigila que el documento y este corredor digan lo mismo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';
import { temasDeLaApp, contraste, AA_TEXTO } from './_contraste-wcag.mjs';

const require = createRequire(import.meta.url);
const existe = (rel) => fs.existsSync(path.resolve(RAIZ, rel));
/** `archivo:línea` de la primera línea que cumple `re`, o `null`. */
const lineaDe = (rel, re) => {
  const i = leer(rel).split('\n').findIndex((l) => re.test(l));
  return i < 0 ? null : `${rel}:${i + 1}`;
};
/** Un módulo compilado de `functions/lib` (o `null` si no se ha compilado). */
const lib = (rel) => {
  try { return require(path.resolve(RAIZ, 'functions/lib', rel)); } catch { return null; }
};
const filaDe = (archivo, id) => (existe(archivo) ? leer(archivo) : '').split('\n').find((l) => new RegExp(`^\\|\\s*\\**${id}\\**\\s*\\|`).test(l)) || '';
/** Una decisión del dueño, escrita como `DECIDIDA` en su fila. Marca de la convención de `docs/FILMMAKER.md`. */
const decidida = (archivo, id) => /DECIDID[AO]/i.test(filaDe(archivo, id));
export const DESIGN_MD = 'docs/DESIGN.md';
export const DECISIONES_MD = 'docs/WEE-DESIGN-UIUX-DECISIONS.md';
export const CIERRE_MD = 'docs/WEE-DESIGN-CIERRE.md';
const Dn = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
/**
 * La fila de un criterio manual en la tabla «Registro de cierre» del documento (su última sección). Solo se mira ESA sección:
 * los mismos `CL-xx` salen también en la lista de cierre, y allí nunca dice REGISTRADO.
 */
export const filaDelRegistro = (id) => {
  if (!existe(CIERRE_MD)) return '';
  const doc = leer(CIERRE_MD);
  const desde = doc.search(/^##\s+\d+\.\s+Registro de cierre/m);
  if (desde < 0) return '';
  return doc.slice(desde).split('\n').find((l) => new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l)) || '';
};
/** Un criterio manual está cumplido cuando su fila del registro dice REGISTRADO (y trae la ruta de su log). */
const registrado = (id) => /REGISTRADO/.test(filaDelRegistro(id));

const pantalla = () => sinComentarios(leer('screens/DesignScreen.tsx'));
const hayTemporizadorDeDemo = (c) => /setTimeout\(\s*\(\)\s*=>\s*setEstado\('listo'\)/.test(c);
const manejadorDe = (c, propiedad) => ((c.match(new RegExp(`\\b${propiedad}=\\{([^}]+)\\}`)) || [])[1] || '').trim();
const sinLib = { ok: false, evidencia: 'falta `functions/lib` compilado: cd functions && npm run build (pesado, con candado)' };

/** Todo criterio: id, tipo, título, quién lo desbloquea, archivos y la comprobación. Va por orden de importancia. */
export const CRITERIOS = [
  /* ── Bloqueadores ───────────────────────────────────────────────────── */
  {
    id: 'CL-01', tipo: 'bloqueador', titulo: '«Crear» de la pantalla de Weë Design llega a CreatorFlow (no es un temporizador)',
    responsable: 'dueño (D1, D2, D7) y después la línea de Design',
    archivos: ['screens/DesignScreen.tsx', 'utils/contextoDeDesign.ts (nuevo: contextoDeDesign sale de utils/designReferencia.ts)', 'functions/test/design-referencia.mjs (I17)', 'functions/test/puente-design.test.mjs (nueva, molde de puente-studio)'],
    decision: ['D1', 'D2', 'D7'],
    comprueba: () => {
      const c = pantalla();
      const va = /navigation\.navigate\('CreatorFlow'/.test(c);
      const demo = hayTemporizadorDeDemo(c);
      return { ok: va && !demo, evidencia: va && !demo ? 'navega a CreatorFlow' : `${lineaDe('screens/DesignScreen.tsx', /setTimeout\(\(\) => setEstado\('listo'\)/) ?? 'sin temporizador'}: alCrear es ${demo ? 'un temporizador de demostración' : 'inexistente'} y no navega a CreatorFlow` };
    },
  },
  {
    id: 'CL-02', tipo: 'bloqueador', titulo: 'Hay una puerta desde Weë Design a Hogar & Diseño (`home`), la única vía para transformar la foto de un espacio',
    responsable: 'dueño (D2) y después la línea de Design', archivos: ['screens/DesignScreen.tsx', 'components/design/*', 'constants/designTools.ts'],
    decision: ['D2'],
    comprueba: () => {
      const fuentes = ['screens/DesignScreen.tsx', 'constants/designTools.ts', ...fs.readdirSync(path.resolve(RAIZ, 'components/design')).map((f) => `components/design/${f}`)];
      const con = fuentes.filter((f) => /['"]home['"]/.test(sinComentarios(leer(f))));
      return { ok: con.length > 0, evidencia: con.length ? con.join(', ') : 'ningún archivo de la pantalla lleva a `home`; la fila «Hogar & Diseño» de constants/specialists.ts:279 no se pinta porque SpecialistScreen.tsx:117 devuelve DesignScreen antes' };
    },
  },
  {
    id: 'CL-03', tipo: 'bloqueador', titulo: 'Lo que se eligió en la caja viaja con la petición: qué se diseña y los ajustes en palabras (no solo el texto)',
    responsable: 'línea de Design (con CL-01)', archivos: ['screens/DesignScreen.tsx', 'utils/contextoDeDesign.ts'],
    comprueba: () => {
      const ok = /contextoDeDesign\(|workspace: 'design'/.test(pantalla());
      return { ok, evidencia: ok ? 'la pantalla arma el contexto de Design' : 'DesignScreen guarda `ajustes` y `camino` pero no los manda a ninguna parte (solo el comienzo de una frase llega a la caja)' };
    },
  },
  {
    id: 'CL-04', tipo: 'bloqueador', titulo: '«Mis creaciones» de Weë Design enseña lo que la persona creó (con carga, vacío y error); las muestras, solo sin sesión o sin creaciones y rotuladas como ejemplos',
    responsable: 'línea de Design', archivos: ['screens/DesignScreen.tsx', 'components/creator/FilaDeCreaciones.tsx', 'i18n/textos/*/design.ts (clave nueva en los 16 idiomas)'],
    comprueba: () => {
      const ok = /getMyJobsDe|assetsService|useCreaciones/.test(pantalla());
      return { ok, evidencia: ok ? 'lee lo de la cuenta' : `${lineaDe('screens/DesignScreen.tsx', /creaciones=\{CREACIONES_DE_DESIGN\}/)}: la fila es siempre de las cuatro muestras, bajo el título «Mis creaciones»` };
    },
  },
  {
    id: 'CL-05', tipo: 'bloqueador', titulo: 'Las puertas prometen lo que el motor hace hoy (D1 y D7: maqueta, recorrido, antes y después, vehículos, mundos…)',
    responsable: 'dueño (D1, D7)', archivos: ['docs/DESIGN.md §4', 'constants/designTools.ts'], decision: ['D1', 'D7'],
    comprueba: () => ({ ok: decidida(DESIGN_MD, 'D1') && decidida(DESIGN_MD, 'D7'), evidencia: 'las puertas de Renders (maqueta, recorrido, antes y después) no tienen capacidad detrás: constants/designTools.ts:66' }),
  },

  /* ── Defectos ───────────────────────────────────────────────────────── */
  {
    id: 'CL-06', tipo: 'defecto', titulo: 'Los ajustes de Weë Design abren con «Automático» (no con «Moderno», «Madera», «Natural» ni «Estándar» como si fueran elegidos)',
    responsable: 'hecho (3da4a95)', archivos: ['constants/designTools.ts'],
    comprueba: () => {
      const { AJUSTES_DE_DESIGN } = crearCargador()('constants/designTools.ts');
      const sin = AJUSTES_DE_DESIGN.filter((g) => g.opciones[0].id !== 'auto').map((g) => g.id);
      return { ok: sin.length === 0, evidencia: sin.length ? `sin «Automático»: ${sin.join(' · ')}` : `${AJUSTES_DE_DESIGN.length} grupos, todos abren con «Automático»` };
    },
  },
  {
    id: 'CL-07', tipo: 'defecto', titulo: '«Dictar» no hace otra cosa que lo que dice (no añade una imagen de referencia de mentira)',
    responsable: 'hecho (407bd31); quitar el botón de verdad es una propuesta', archivos: ['screens/DesignScreen.tsx', 'components/studio/StudioPromptComposer.tsx (propuesta)'],
    comprueba: () => {
      const c = pantalla();
      const voz = manejadorDe(c, 'onVoz');
      return { ok: voz !== '' && voz !== manejadorDe(c, 'onReferencia'), evidencia: `onVoz={${voz}}` };
    },
  },
  {
    id: 'CL-08', tipo: 'defecto', titulo: 'Lo que se adjunta en la caja de Weë Design se puede quitar',
    responsable: 'hecho (99ef9bc)', archivos: ['screens/DesignScreen.tsx'],
    comprueba: () => {
      const fichas = (pantalla().match(/<FichaDeContexto\b[\s\S]*?\/>/g) || []).filter((f) => /icono="image-outline"/.test(f));
      const ok = fichas.length > 0 && fichas.every((f) => /onQuitar=\{/.test(f));
      return { ok, evidencia: `${fichas.length} ficha(s) de referencia, ${ok ? 'con aspa' : 'sin aspa'}` };
    },
  },
  {
    id: 'CL-09', tipo: 'defecto', titulo: 'Las referencias de la caja son reales (selector de fotos y `Adjunto` que viaja) o el botón no está: nunca un nombre de muestra',
    responsable: 'dueño (D6) y después la línea de Design', archivos: ['screens/DesignScreen.tsx', 'functions/src/creator/inputs.ts (IMAGE_INPUT_CAPS)'], decision: ['D6'],
    comprueba: () => {
      const falso = /`referencia-\$\{/.test(pantalla());
      return { ok: !falso, evidencia: falso ? `${lineaDe('screens/DesignScreen.tsx', /referencia-\$\{/)}: «Referencia» y «Añadir» siguen añadiendo nombres de muestra` : 'sin referencias de muestra' };
    },
  },
  {
    id: 'CL-10', tipo: 'defecto', titulo: 'Toda pregunta de `design` con opciones lleva «🤷 No sé» (H-2)',
    responsable: 'servidor (functions/src/creator/templates.ts)', archivos: ['functions/src/creator/templates.ts:352-450'],
    comprueba: () => {
      const m = lib('creator/templates.js');
      if (!m) return sinLib;
      const sin = m.TEMPLATES.design.questions.filter((q) => (q.options || []).length > 0 && !q.options.some((o) => o.id === 'idk')).map((q) => q.id);
      return { ok: sin.length === 0, evidencia: sin.length ? `sin «No sé»: ${sin.join(' · ')}` : 'todas lo llevan' };
    },
  },
  {
    id: 'CL-11', tipo: 'defecto', titulo: '«Un post para mi marca» se entiende como afiche y no como logo (H-6)',
    responsable: 'servidor (functions/src/creator/templates.ts)', archivos: ['functions/src/creator/templates.ts:451-475'],
    comprueba: () => {
      const m = lib('creator/templates.js');
      if (!m) return sinLib;
      const what = m.TEMPLATES.design.infer('Un post para mi marca').what;
      return { ok: what === 'poster', evidencia: `infer('Un post para mi marca').what = ${what}` };
    },
  },
  {
    id: 'CL-12', tipo: 'defecto', titulo: '«Intentar de nuevo» tras un fallo al cambiar de nivel vuelve a cotizar, no crea ni reserva Credits (H-3)',
    responsable: 'hecho (R7-Design, tarea C); pantalla compartida: la revisa el dueño de CreatorFlow', archivos: ['screens/CreatorFlowScreen.tsx:80-92, 295-312, 635-642'],
    comprueba: () => {
      /*
       * Mirada de texto: el reintento del cuadro de error pregunta de dónde viene el error ANTES de crear. Que de verdad
       * vuelva a cotizar —el mismo trabajo y el último nivel pedido, sin crear ni abrir otro— lo ejecuta
       * `weeai-cliente-cierre.test.mjs` (A).
       */
      const fuente = sinComentarios(leer('screens/CreatorFlowScreen.tsx'));
      const creaSiempre = /status === 'planned' \? handleCreate\(\)/.test(fuente);
      const distingue = /fallo\??\.cotizando\s*\?\s*handleQuality\(/.test(fuente);
      const roto = creaSiempre && !distingue;
      return { ok: !roto, evidencia: roto ? `${lineaDe('screens/CreatorFlowScreen.tsx', /status === 'planned' \? handleCreate\(\)/)}: el reintento del cuadro de error crea cuando el trabajo está planificado, venga el error de cotizar o de crear` : 'el reintento vuelve a cotizar si el error vino de cotizar (`fallo.cotizando`); ejecutado en weeai-cliente-cierre A' };
    },
  },
  {
    id: 'CL-13', tipo: 'defecto', titulo: 'Editar o pedir otra versión conserva las respuestas y deja linaje (H-4, D3)',
    responsable: 'dueño (D3) y servidor/CreatorFlow', archivos: ['screens/CreatorFlowScreen.tsx:335-363', 'functions/src/creator/index.ts:500-550 (materialesDeResultado)'], decision: ['D3'],
    comprueba: () => {
      const soloTravel = /CONSERVA_EL_CONTEXTO = experience\.id === 'travel'/.test(leer('screens/CreatorFlowScreen.tsx'));
      return { ok: !soloTravel, evidencia: soloTravel ? `${lineaDe('screens/CreatorFlowScreen.tsx', /CONSERVA_EL_CONTEXTO =/)}: solo Weë Travel conserva las respuestas al ajustar; el resto empieza de cero y sin linaje` : 'conserva el contexto' };
    },
  },

  /* ── Integración ────────────────────────────────────────────────────── */
  {
    id: 'CL-14', tipo: 'integración', titulo: 'El formato elegido (historia 9:16, cuadrado, horizontal) llega al paso de imagen como `aspectRatio` (D5, F1)',
    responsable: 'dueño (D5) y servidor', archivos: ['functions/src/creator/templates.ts:511-586', 'functions/src/engine/imageModels.ts:346-352'], decision: ['D5'],
    comprueba: () => {
      const m = lib('creator/templates.js');
      if (!m) return sinLib;
      const paso = m.TEMPLATES.design.buildPlan('x', { what: 'poster', message: 'promo', where: 'story' }).steps.find((s) => s.id === 'images');
      return { ok: typeof paso.input.aspectRatio === 'string', evidencia: `paso de imagen de «historia»: ${JSON.stringify(Object.keys(paso.input))}` };
    },
  },
  {
    id: 'CL-15', tipo: 'integración', titulo: 'Los afiches y los logos escriben su texto dentro de la imagen con un modelo que sabe hacerlo (D4, F3)',
    responsable: 'dueño (D4) y servidor', archivos: ['functions/src/creator/templates.ts:582', 'functions/src/engine/imageModels.ts:208'], decision: ['D4'],
    comprueba: () => {
      const m = lib('creator/templates.js');
      const im = lib('engine/imageModels.js');
      if (!m || !im) return sinLib;
      const kind = m.TEMPLATES.design.buildPlan('x', { what: 'poster', message: 'promo', where: 'feed' }).steps.find((s) => s.id === 'images').input.kind;
      const texto = im.imageRequirements({ capability: 'image.generate', kind }).text;
      return { ok: texto === true, evidencia: `un afiche pide kind «${kind}» → modelo que escribe texto: ${texto}` };
    },
  },
  {
    id: 'CL-16', tipo: 'integración', titulo: 'Una referencia de estilo que sube la persona se USA (no se sube y se ignora)',
    responsable: 'dueño (D6) y servidor', archivos: ['functions/src/creator/inputs.ts:14-23', 'functions/src/creator/templates.ts (design)'], decision: ['D6'],
    comprueba: () => {
      const i = lib('creator/inputs.js');
      if (!i) return sinLib;
      const ok = i.IMAGE_INPUT_CAPS.includes('image.reference') || i.IMAGE_INPUT_CAPS.includes('image.generate');
      return { ok, evidencia: `IMAGE_INPUT_CAPS = ${i.IMAGE_INPUT_CAPS.join(', ')}` };
    },
  },
  {
    id: 'CL-17', tipo: 'integración', titulo: 'Existe el dominio `design` del Eval Engine, a $0, con su dataset y su baseline (F0)',
    responsable: 'línea de Design (sin decisión pendiente)', archivos: ['ops/evals/dominios/design.mjs', 'ops/evals/dominios.mjs', 'ops/evals/datasets/design/', 'ops/evals/baseline/'],
    comprueba: () => ({ ok: existe('ops/evals/dominios/design.mjs'), evidencia: existe('ops/evals/dominios/design.mjs') ? 'existe' : `ops/evals/dominios/ solo tiene: ${fs.readdirSync(path.resolve(RAIZ, 'ops/evals/dominios')).join(', ')}` }),
  },
  {
    id: 'CL-18', tipo: 'integración', titulo: 'Una suite de emulador recorre creatorChat → creatorQuote → creatorRun de `design` y `home` con el adaptador `mock` (precio, reserva, cobro y reembolso)',
    responsable: 'infraestructura / almacenamiento (emuladores, candado pesado); solapa con la tarea J', archivos: ['functions/test/design-recorrido.emulator.mjs (nueva)'],
    comprueba: () => {
      const suites = fs.readdirSync(path.join(RAIZ, 'functions/test')).filter((f) => f.endsWith('.emulator.mjs'));
      const con = suites.filter((f) => /creatorRun/.test(leer(`functions/test/${f}`)) && /['"]design['"]|['"]home['"]/.test(leer(`functions/test/${f}`)));
      return { ok: con.length > 0, evidencia: con.length ? con.join(', ') : `ninguna de las ${suites.length} suites *.emulator.mjs recorre creatorRun de design ni de home` };
    },
  },
  {
    id: 'CL-19', tipo: 'integración', titulo: 'Se puede cancelar un trabajo de Weë Design con una regla clara para el dinero, y reintentar el MISMO trabajo (M29, M30)',
    responsable: 'servidor + dueño (H0 #6); sin decisión de Design', archivos: ['functions/src/creator/index.ts', 'services/creatorService.ts'],
    comprueba: () => {
      /* No basta con que la palabra exista: `cancelled` es un valor declarado de `JobStatus` y de `claveDelEstado`. Hace falta el método del cliente Y el callable del servidor. */
      const cliente = /^\s{2}cancel\w*\s*:\s*(async\s*)?\(/m.test(sinComentarios(leer('services/creatorService.ts')));
      const servidor = /export const \w*[Cc]ancel\w*\s*=\s*onCall/.test(sinComentarios(leer('functions/src/creator/index.ts')));
      return { ok: cliente && servidor, evidencia: `método del cliente: ${cliente ? 'sí' : 'no'} · callable del servidor: ${servidor ? 'sí' : 'no'} (functions/src/creator/types.ts:154-158: «'cancelled' no lo escribe nadie: no existe una forma de cancelar un trabajo»)` };
    },
  },
  {
    id: 'CL-20', tipo: 'integración', titulo: 'Crear desde dentro de un proyecto guarda el trabajo en ese proyecto (el servidor ya acepta `projectId` y el cliente lo manda en la primera llamada)',
    responsable: 'hecho (R7-Design, tarea C) en el cliente; conectar «Añadir» de un proyecto es la propuesta P11', archivos: ['services/creatorService.ts:263-277 (start)', 'screens/CreatorFlowScreen.tsx:105-123, 166-167, 406', 'constants/weeWorkspaces.ts:231', 'App.tsx:278 (parse de CreatorFlow)', 'screens/ProjectScreen.tsx:157'],
    comprueba: () => {
      /*
       * Mirada de texto, en tres puntas: el servicio manda la clave solo si hay proyecto, la pantalla se la pasa desde la ruta y
       * la ruta la declara. Que de verdad llegue a la carga del callable y que el servidor la guarde lo ejecuta
       * `weeai-cliente-cierre.test.mjs` (B). Y se cuenta quién la pasa hoy, para que un «cumplido» no esconda que nadie la manda.
       */
      const servicio = sinComentarios(leer('services/creatorService.ts'));
      const desde = servicio.indexOf('start:');
      const cuerpo = servicio.slice(desde, servicio.indexOf('answer:', desde));
      const manda = /call<ChatResponse>\('creatorChat',\s*\{[\s\S]*?\.\.\.\(projectId \? \{ projectId \} : \{\}\)/.test(cuerpo);
      const loPasa = /creatorService\.start\([^\n]*params\.projectId\)/.test(sinComentarios(leer('screens/CreatorFlowScreen.tsx')));
      const declarado = /export interface ContextoDeExperiencia \{[\s\S]*?\n  projectId\?: string;/.test(leer('constants/weeWorkspaces.ts'));
      const entradas = fs.readdirSync(path.resolve(RAIZ, 'screens')).filter((f) => /\.tsx$/.test(f) && f !== 'CreatorFlowScreen.tsx'
        && /(navigate|push)\('CreatorFlow',[^;]*projectId/.test(sinComentarios(leer(`screens/${f}`))));
      const ok = manda && loPasa && declarado;
      return { ok, evidencia: ok
        ? `creatorService.start manda projectId, CreatorFlowScreen se lo pasa desde la ruta y la ruta lo declara; ejecutado en weeai-cliente-cierre B. Lo pasan hoy: ${entradas.join(', ') || 'ninguna pantalla'} («Añadir» del proyecto no: P11)`
        : `creatorService.start ${manda ? 'manda' : 'NO manda'} projectId · CreatorFlowScreen ${loPasa ? 'se lo pasa' : 'NO se lo pasa'} · la ruta ${declarado ? 'lo declara' : 'NO lo declara'} (functions/src/creator/index.ts:329 lo acepta); un trabajo solo entra en un proyecto con assignJob al terminar` };
    },
  },
  {
    id: 'CL-21', tipo: 'integración', titulo: 'No quedan reservas de Credits colgadas de trabajos de Weë AI (informe de solo lectura que ejecuta el dueño con datos reales)',
    responsable: 'dueño (ejecuta con datos reales; H0 #15b)', archivos: ['ops/reconciliacion/reservas-colgadas.mjs', 'docs/DECISIONES-PENDIENTES.md'],
    manual: 'node ops/reconciliacion/reservas-colgadas.mjs   # lo ejecuta el dueño: lee datos reales; esperado: 0 reservas colgadas',
  },
  {
    id: 'CL-22', tipo: 'integración', titulo: 'El recorrido de imágenes ha corrido en `get-wee` con un canario gobernado antes de lanzar Weë Design a personas',
    responsable: 'dueño + infraestructura (producción, secretos y Credits de bienvenida)', archivos: ['docs/DESIGN.md «Antes de lanzar»', 'docs/DECISIONES-PENDIENTES.md', 'ops/produccion.json'],
    manual: 'Lo autoriza el dueño y lo ejecuta infraestructura con el runbook de canario; se anota aquí con la ruta de su log.',
  },

  /* ── Resto ──────────────────────────────────────────────────────────── */
  {
    id: 'CL-23', tipo: 'resto', titulo: 'Las decisiones D1–D9 de DESIGN.md y DEC-01, 02, 05 y 06 están registradas como DECIDIDAS',
    responsable: 'dueño', archivos: [DESIGN_MD, DECISIONES_MD], decision: ['D1–D9', 'DEC-01', 'DEC-02', 'DEC-05', 'DEC-06'],
    comprueba: () => {
      const faltan = decisionesSinTomar({ decision: ['D1–D9', 'DEC-01', 'DEC-02', 'DEC-05', 'DEC-06'] });
      return { ok: faltan.length === 0, evidencia: faltan.length ? `${faltan.length} de 13 sin registrar como DECIDIDA` : 'todas decididas' };
    },
  },
  {
    id: 'CL-24', tipo: 'resto', titulo: 'Accesibilidad compartida: el aviso de la creación se anuncia (región viva) y su texto de acción pasa el contraste AA en los dos temas (antes 2,24:1 en el claro)',
    responsable: 'hecho (R7-Design, tarea C); componente compartido con Weë Studio: avisar a su dueño', archivos: ['components/creator/AvisoDeCreacion.tsx:73-89', 'contexts/ThemeContext.tsx (solo se lee: no cambia ningún token)'],
    comprueba: () => {
      /*
       * Mirada de texto más una CUENTA: qué color del tema usa la acción del aviso («Entendido») y cuánto contrasta con el fondo
       * del aviso en cada tema —los colores se leen de `ThemeContext.tsx`, no se copian—. Lo que el componente de verdad
       * pinta, con todos sus textos y en los dos temas, lo ejecuta `weeai-cliente-cierre.test.mjs` (C).
       */
      const a = sinComentarios(leer('components/creator/AvisoDeCreacion.tsx'));
      const viva = /accessibilityLiveRegion|accessibilityRole="alert"|aria-live/.test(a);
      const colorDeLaAccion = (a.match(/styles\.avisoCerrar,\s*\{\s*color:\s*theme\.colors\.(\w+)/) || [])[1];
      const colorDelFondo = (a.match(/styles\.aviso,\s*\{[^}]*?backgroundColor:\s*theme\.colors\.(\w+)/) || [])[1];
      const temas = temasDeLaApp();
      const cuentas = Object.entries(temas).map(([tema, c]) => ({ tema, ratio: colorDeLaAccion && colorDelFondo && c[colorDeLaAccion] && c[colorDelFondo] ? contraste(c[colorDeLaAccion], c[colorDelFondo]) : 0 }));
      const pasa = cuentas.length === 2 && cuentas.every((x) => x.ratio >= AA_TEXTO);
      return { ok: viva && pasa, evidencia: `región viva: ${viva ? 'sí' : 'no'} · texto de acción en «${colorDeLaAccion ?? '?'}» sobre «${colorDelFondo ?? '?'}»: ${cuentas.map((x) => `${x.tema} ${x.ratio.toFixed(2)}:1`).join(' · ')} (AA = ${AA_TEXTO}:1)` };
    },
  },
  {
    id: 'CL-25', tipo: 'resto', titulo: 'Sin código ni comentarios que describan lo que ya no existe en Weë Design (muro propio, ficha de especialista, `SpecialistHero`)',
    responsable: 'línea de Design (archivos compartidos con specialists)', archivos: ['constants/specialists.ts:286,295-301', 'screens/SpecialistScreen.tsx:214-215', 'components/creator/SpecialistHero.tsx'],
    comprueba: () => {
      const restos = [];
      if (/estrena el muro social/.test(leer('constants/specialists.ts'))) restos.push('specialists.ts:286 «estrena el muro social»');
      if (/spec\.id === 'design'/.test(leer('screens/SpecialistScreen.tsx'))) restos.push('SpecialistScreen.tsx:214 rama de design inalcanzable');
      const importadores = ['screens', 'components', 'navigation'].flatMap((d) => fs.readdirSync(path.resolve(RAIZ, d), { recursive: true }).map((f) => `${d}/${String(f).split(path.sep).join('/')}`))
        .filter((f) => /\.tsx?$/.test(f) && f !== 'components/creator/SpecialistHero.tsx' && /SpecialistHero/.test(leer(f)));
      if (importadores.length === 0) restos.push('SpecialistHero.tsx sin ningún importador');
      return { ok: restos.length === 0, evidencia: restos.join(' · ') || 'limpio' };
    },
  },
  {
    id: 'CL-26', tipo: 'resto', titulo: 'Verificación visual de la pantalla en móvil (360–430), tableta (768–1023) y escritorio (≥1024): sin desbordes, con el aviso y la hoja de ajustes visibles',
    responsable: 'quien tenga web con emuladores de demostración (pesado: candado)', archivos: ['screens/DesignScreen.tsx', 'components/design/*'],
    manual: 'Web local (demo-wee) y, en cada ancho, recorrer: portada → una puerta → un punto de partida → ajustes → Crear → aviso. Captura de cada ancho en el log.',
  },
  {
    id: 'CL-27', tipo: 'resto', titulo: 'El chequeo de tipos de la app sigue en 0 errores',
    responsable: 'cualquiera que toque .ts/.tsx (pesado: con el candado de la ronda)', archivos: ['todo .ts/.tsx de la app'],
    manual: 'cd <raíz del worktree> && NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit   # 0 errores (línea base, CLAUDE.md «Forma de trabajar» 2)',
  },
  {
    id: 'CL-28', tipo: 'resto', titulo: 'La cadena entera de pruebas y las cercas siguen en verde',
    responsable: 'quien integre (pesado: con el candado de la ronda)', archivos: ['functions/package.json (scripts.test)', 'functions/test/puente-pre-f1d.test.mjs'],
    manual: 'node functions/test/_cadena.mjs   # 0 fallos;  y, ligera:  node functions/test/puente-pre-f1d.test.mjs',
  },
];

/** Las decisiones del dueño que un criterio necesita y todavía no están escritas como DECIDIDAS. */
export const decisionesSinTomar = (criterio) => (criterio.decision || []).flatMap((d) => {
  if (d === 'D1–D9') return Dn.filter((x) => !decidida(DESIGN_MD, x));
  if (/^D\d$/.test(d)) return decidida(DESIGN_MD, d) ? [] : [d];
  return decidida(DECISIONES_MD, d) ? [] : [d];
});

/** El estado de un criterio hoy. */
export const evaluar = (criterio) => {
  if (criterio.manual) {
    return registrado(criterio.id)
      ? { estado: 'CUMPLIDO', evidencia: `registrado en ${CIERRE_MD}: ${filaDelRegistro(criterio.id).replace(/\s+/g, ' ').slice(0, 160)}` }
      : { estado: 'MANUAL', evidencia: criterio.manual };
  }
  let r;
  try { r = criterio.comprueba(); } catch (e) { r = { ok: false, evidencia: `la comprobación falló: ${e.message}` }; }
  if (r.ok) return { estado: 'CUMPLIDO', evidencia: r.evidencia };
  const sinTomar = decisionesSinTomar(criterio);
  return sinTomar.length
    ? { estado: 'DECISION', evidencia: `${r.evidencia} · espera al dueño: ${sinTomar.join(', ')}` }
    : { estado: 'ABIERTO', evidencia: r.evidencia };
};

const TITULO_DEL_TIPO = { bloqueador: 'BLOQUEADORES', defecto: 'DEFECTOS', 'integración': 'INTEGRACIÓN', resto: 'RESTO' };

const main = () => {
  const solo = (process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : '').split(',').filter(Boolean);
  const lista = solo.length ? CRITERIOS.filter((c) => solo.includes(c.id)) : CRITERIOS;
  if (solo.length && lista.length !== solo.length) {
    console.error(`criterio desconocido: ${solo.filter((s) => !CRITERIOS.some((c) => c.id === s)).join(', ')}`);
    process.exit(2);
  }
  const cuenta = { CUMPLIDO: 0, ABIERTO: 0, DECISION: 0, MANUAL: 0 };
  let tipoActual = '';
  for (const c of lista) {
    const { estado, evidencia } = evaluar(c);
    cuenta[estado] += 1;
    if (c.tipo !== tipoActual) { tipoActual = c.tipo; console.log(`\n── ${TITULO_DEL_TIPO[tipoActual]} ──`); }
    console.log(`${estado.padEnd(9)} ${c.id}  ${c.titulo}`);
    console.log(`          ${evidencia}`);
  }
  const terminado = cuenta.ABIERTO + cuenta.DECISION + cuenta.MANUAL === 0;
  console.log(`\n${cuenta.CUMPLIDO} cumplidos · ${cuenta.ABIERTO} abiertos · ${cuenta.DECISION} esperan una decisión del dueño · ${cuenta.MANUAL} manuales (se comprueban con su comando y se registran)`);
  /* El veredicto es de la ejecución COMPLETA: con `--solo` solo se mira un trozo, y un trozo cumplido no es un Design terminado. */
  if (solo.length) console.log(`Ejecución parcial (${lista.length} de ${CRITERIOS.length}): el veredicto de «terminado» es el de la ejecución completa.`);
  else console.log(terminado ? 'Weë Design está TERMINADO: todos los criterios cumplidos.' : 'Weë Design NO está terminado: faltan criterios (ver arriba y docs/WEE-DESIGN-CIERRE.md).');
  process.exit(terminado ? 0 : 1);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
