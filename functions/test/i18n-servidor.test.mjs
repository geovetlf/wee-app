/*
 * LO QUE ESCRIBE EL SERVIDOR, EN EL IDIOMA DE QUIEN MIRA.
 *
 * El servidor escribe en español las preguntas y el plan de Weë AI, el progreso, los errores, los conceptos del
 * historial de Credits, lo que contestan ËContact y las encuestas, los push y la página pública. La app los reconoce
 * contra el catálogo español (`i18n/textos/es/servidor/`) y los pinta en el idioma activo (`i18n/servidor.ts`); el
 * servidor escribe los push y la página con los mismos diccionarios.
 *
 * Esta prueba vigila las tres cosas que pueden romperse en silencio:
 *
 *  A · QUE EL CATÁLOGO DIGA LO QUE DICE EL SERVIDOR. Si alguien cambia una pregunta, un error o un concepto en el
 *      servidor y no aquí, la app dejaría de reconocerlo y lo enseñaría en español. Se compara con el servidor
 *      compilado y con su código, no con una copia.
 *  B · QUE TODO PLAN POSIBLE SE RECONOZCA ENTERO. Se arman los 1 403 planes que puede dar el servidor
 *      (`_planes.mjs`) y cada explicación y cada paso tiene que reconocerse; en español, además, tiene que volver
 *      IDÉNTICO —es la prueba de que el patrón y sus piezas dicen exactamente lo que dijo el servidor—, y en cada idioma
 *      que declara la sección no puede quedar nada sin traducir salvo lo que escribió la persona.
 *  C · QUE EL RECONOCEDOR HAGA LO QUE PROMETE: huecos, plurales, frases dentro de frases, fechas, y lo desconocido
 *      tal cual.
 *
 * Necesita `npm run build` (lee `functions/lib`).
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { todosLosPlanes, TEXTO_LIBRE, FECHAS } from './_planes.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const lib = (p) => require(path.join(raiz, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/* Con DETALLE=1 se ve la lista entera (la necesita quien completa el catálogo). */
const muestra = (lista, n = 6) =>
  (lista.length ? `${lista.length}: ${lista.slice(0, process.env.DETALLE ? Infinity : n).map((x) => JSON.stringify(x)).join(process.env.DETALLE ? '\n   ' : ' · ')}` : '');

/* ── El cargador de siempre: transpila y ejecuta, sin empaquetador. ── */
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const traducir = (await cargar('i18n/traducir.ts')).ns;
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const servidor = (await cargar('i18n/servidor.ts')).ns;
const ES = (await cargar('i18n/textos/es/servidor/index.ts')).ns.servidor;

/** Los idiomas que declaran los textos del servidor (además del español). */
const DECLARAN = Object.entries(DICCIONARIOS)
  .filter(([codigo, d]) => codigo !== 'es' && d && d.preguntas && !/-/.test(codigo))
  .map(([codigo]) => codigo);
const LOCALE = { es: 'es-ES', en: 'en-US', da: 'da-DK' };
const ctxDe = (codigo, experiencia) => {
  const locale = LOCALE[codigo] || codigo;
  return { t: traducir.crearTraductor(locale, DICCIONARIOS), locale, experiencia };
};

/* ── A · El catálogo español dice lo que dice el servidor ──────────────────────────────────────────── */

const { TEMPLATES } = lib('creator/templates.js');
{
  const faltan = [];
  let preguntas = 0;
  let opciones = 0;
  for (const [exp, plantilla] of Object.entries(TEMPLATES)) {
    const objetivo = servidor.claveObjetivo(exp).split('.')[1];
    if (ES.objetivos[objetivo] !== plantilla.defaultGoal) faltan.push(`objetivo ${exp}`);
    for (const q of plantilla.questions) {
      preguntas++;
      if (ES.preguntas[servidor.clavePregunta(exp, q.id).split('.')[1]] !== q.text) faltan.push(`${exp}.${q.id}`);
      for (const o of q.options) {
        opciones++;
        if (ES.opciones[servidor.claveOpcion(exp, q.id, o.id).split('.')[1]] !== o.label) faltan.push(`${exp}.${q.id}.${o.id}`);
      }
    }
  }
  check('1) el flujo guiado del catálogo es el del servidor, carácter por carácter (si falla: node scripts/i18n-guia-del-servidor.mjs)',
    faltan.length === 0, faltan.length ? muestra(faltan) : `${preguntas} preguntas · ${opciones} opciones · ${Object.keys(TEMPLATES).length} objetivos`);
  check('2) y no sobra nada: ni una pregunta ni una opción que el servidor ya no tenga',
    Object.keys(ES.preguntas).length === preguntas && Object.keys(ES.opciones).length === opciones && Object.keys(ES.objetivos).length === Object.keys(TEMPLATES).length);
}

const ctxEs = ctxDe('es');
const reconocidaEnEspanol = (texto, experiencia) => {
  const l = servidor.leerDelServidor(texto, { ...ctxEs, experiencia });
  return l.reconocido && l.texto === texto;
};

{
  const { progressTextFor, friendlyFailure } = lib('engine/humanize.js');
  const { CAPABILITY_CATALOG } = lib('core/registry');
  const frases = new Set();
  for (const c of CAPABILITY_CATALOG) {
    frases.add(progressTextFor(c.id));
    frases.add(friendlyFailure(c.id));
  }
  const fuente = leer('functions/src/creator/index.ts');
  const fijas = [...fuente.matchAll(/progressText:\s*'([^']+)'/g)].map((m) => m[1]);
  for (const f of fijas) frases.add(f);
  const sinReconocer = [...frases].filter((f) => !reconocidaEnEspanol(f));
  check('3) todo lo que puede decir el progreso de un trabajo está en el catálogo', sinReconocer.length === 0,
    sinReconocer.length ? muestra(sinReconocer) : `${frases.size} frases (${fijas.length} fijas en creator/index.ts)`);
}

/*
 * Los mensajes de error, sacados del CÓDIGO con el árbol de TypeScript: el segundo argumento de cada `EngineError` y
 * cada `HttpsError` de los archivos cuya respuesta llega a una pantalla. Los huecos se rellenan con los valores que
 * el servidor mete de verdad (las etiquetas de `ATTACHMENT_KINDS`, los nombres que se le pasan a `assertText`).
 */
const mensajesDelCodigo = (archivos) => {
  const salida = [];
  for (const archivo of archivos) {
    const src = ts.createSourceFile(archivo, leer(archivo), ts.ScriptTarget.Latest, true);
    const visitar = (n) => {
      if (ts.isNewExpression(n) && /^(EngineError|HttpsError)$/.test(n.expression.getText(src)) && n.arguments?.length > 1) {
        const a = n.arguments[1];
        if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) salida.push({ archivo, texto: a.text, huecos: [] });
        else if (ts.isTemplateExpression(a)) {
          salida.push({ archivo, plantilla: [a.head.text, ...a.templateSpans.map((s) => s.literal.text)], huecos: a.templateSpans.map((s) => s.expression.getText(src)) });
        }
      }
      ts.forEachChild(n, visitar);
    };
    visitar(src);
  }
  return salida;
};
const rellenarCon = (m, valores) => {
  if (m.texto !== undefined) return [m.texto];
  const opciones = m.huecos.map((h) => valores[h] || [`<${h}>`]);
  const combinar = (i) => (i === opciones.length ? [''] : opciones[i].flatMap((v) => combinar(i + 1).map((r) => v + m.plantilla[i + 1] + r)));
  return combinar(0).map((r) => m.plantilla[0] + r);
};

{
  const { ATTACHMENT_KINDS } = lib('creator/inputs.js');
  const { ENGINE_MESSAGES } = lib('engine/errors.js');
  const nombres = [...new Set(['functions/src/creator/brain.ts', 'functions/src/creator/video.ts']
    .flatMap((a) => [...leer(a).matchAll(/assertText\([^,]+,\s*'([^']+)'/g)].map((m) => m[1])))];
  const valores = {
    label: Object.values(ATTACHMENT_KINDS).map((k) => k.label),
    name: nombres,
    max: ['4000', '3000'],
  };
  const archivos = ['creator/index.ts', 'creator/inputs.ts', 'creator/brain.ts', 'creator/video.ts', 'engine/errors.ts', 'engine/router.ts', 'engine/video.ts', 'content/index.ts']
    .map((a) => `functions/src/${a}`);
  const mensajes = [...Object.values(ENGINE_MESSAGES), ...mensajesDelCodigo(archivos).flatMap((m) => rellenarCon(m, valores))]
    // Lo que no es una frase para una persona (códigos, mensajes en inglés de diagnóstico).
    .filter((t) => /\s/.test(t) && /[áéíóúñ¿¡]|\b(el|la|de|no|tu|que|esta|este|ese|esa|para)\b/i.test(t));
  const sinReconocer = [...new Set(mensajes)].filter((t) => !reconocidaEnEspanol(t));
  check('4) cada error de Weë AI y de Weë Brain que llega a la pantalla está en el catálogo, sacado del código', sinReconocer.length === 0,
    sinReconocer.length ? muestra(sinReconocer) : `${new Set(mensajes).size} mensajes`);
}

{
  const ec = lib('social/econtact.js');
  const po = lib('social/polls.js');
  const mensajes = [...Object.values(ec.MENSAJES), ...Object.values(po.MENSAJES), new po.PostNoEncontrado().message,
    ...mensajesDelCodigo(['functions/src/social/econtact.ts', 'functions/src/social/polls.ts']).flatMap((m) => rellenarCon(m, {}))]
    .filter((t) => /\s/.test(t));
  const sinReconocer = [...new Set(mensajes)].filter((t) => !reconocidaEnEspanol(t));
  check('5) lo que contestan ËContact y las encuestas está en el catálogo', sinReconocer.length === 0,
    sinReconocer.length ? muestra(sinReconocer) : `${new Set(mensajes).size} mensajes`);
}

/* ── B · Todos los planes posibles ─────────────────────────────────────────────────────────────────── */

const planes = await todosLosPlanes();
const textosDePlan = [];
for (const { experienceId, plan } of planes) {
  textosDePlan.push({ experiencia: experienceId, texto: plan.explainToUser, que: 'explicación' });
  for (const s of plan.steps) textosDePlan.push({ experiencia: experienceId, texto: s.purpose, que: 'paso' });
}
/*
 * Lo que puede quedar sin traducir es lo que escribió la persona. Hay dos maneras de que llegue: entero, o como pieza
 * de una frase —a veces dos respuestas libres seguidas, «X, Y»—. Y una tercera que es un fallo del servidor y no de
 * la app, apuntado para que nadie lo tome por traducción pendiente: en Writer · «Traducir», a un idioma escrito a mano
 * el servidor le quita la primera palabra (`language.label.replace(/^\S+\s+/, '')` sobre un texto que no lleva emoji),
 * y «Texto libre de prueba» llega como «libre de prueba».
 */
const unicos = [...new Map(textosDePlan.map((x) => [`${x.experiencia}|${x.texto}`, x])).values()];
const RECORTE_DEL_SERVIDOR = 'libre de prueba';
const PERMITIDOS = new Set([TEXTO_LIBRE, TEXTO_LIBRE.toLowerCase(), RECORTE_DEL_SERVIDOR, ...FECHAS]);
const esDeLaPersona = (crudo) => crudo.split(', ').every((parte) => PERMITIDOS.has(parte));
{
  /*
   * La excepción son las coletillas del «No sé» (`<experiencia>Decision…`): esas no se buscan por todo el catálogo
   * sino entre las de la experiencia del trabajo, así que dos experiencias pueden decir lo mismo con su propia clave.
   */
  const repetidos = [];
  const vistos = new Map();
  for (const seccion of ['objetivos', 'plan', 'progreso', 'motor', 'movimientos', 'social']) {
    for (const [clave, valor] of Object.entries(ES[seccion])) {
      const base = clave.replace(/_(one|other)$/, '');
      const forma = /Decision/.test(base) ? `${base.split('Decision')[0]}|${valor}` : valor.replace(/\{\{\s*\w+\s*\}\}/g, '{{}}');
      if (vistos.has(forma) && vistos.get(forma) !== base) repetidos.push(`${seccion}.${clave} = ${vistos.get(forma)}`);
      else vistos.set(forma, base);
    }
  }
  check('5b) ningún texto del servidor tiene dos claves: la segunda no se usaría nunca', repetidos.length === 0, muestra(repetidos));
}
{
  const malos = unicos.filter(({ experiencia, texto }) => texto && !esDeLaPersona(texto) && !reconocidaEnEspanol(texto, experiencia));
  check(`6) los ${planes.length} planes posibles se reconocen enteros y vuelven idénticos en español`, malos.length === 0,
    malos.length ? muestra(malos.map((m) => `${m.experiencia}: ${m.texto}`), 8) : `${unicos.length} textos distintos`);
}
for (const codigo of DECLARAN) {
  const malos = [];
  for (const { experiencia, texto } of unicos) {
    if (!texto || esDeLaPersona(texto)) continue;
    const l = servidor.leerDelServidor(texto, ctxDe(codigo, experiencia));
    const ajenos = l.crudos.filter((c) => !esDeLaPersona(c));
    if (!l.reconocido || ajenos.length) malos.push(`${experiencia}: ${texto}${ajenos.length ? ` [sin traducir: ${ajenos.join(' | ')}]` : ''}`);
  }
  check(`7) en ${codigo} no queda nada del plan sin traducir, salvo lo que escribió la persona`, malos.length === 0, muestra(malos, 6));
}

/* ── C · El reconocedor ────────────────────────────────────────────────────────────────────────────── */

{
  const t = (clave, valores) => `[${clave}${valores ? ' ' + JSON.stringify(valores) : ''}]`;
  const ctx = { t, locale: 'xx' };
  check('8) una frase fija se reconoce por su clave', servidor.textoDelServidor('Creando tu imagen…', ctx) === '[progreso.creandoImagen]');
  check('9) lo desconocido se devuelve tal cual', servidor.textoDelServidor('Algo que nadie dijo nunca', ctx) === 'Algo que nadie dijo nunca');
  check('10) un número en su hueco llega como número, y el plural lo elige t',
    servidor.textoDelServidor('Weë Brain · 12 respuestas', ctx) === '[movimientos.brainRespuestas {"contador":12}]');
  check('11) una frase dentro de otra se reconoce también',
    servidor.textoDelServidor('Weë Brain · búsqueda · no se pudo terminar', ctx) === '[movimientos.noSePudoTerminar {"base":"[movimientos.brainBusqueda]"}]',
    servidor.textoDelServidor('Weë Brain · búsqueda · no se pudo terminar', ctx));
  check('12) una pieza de su hueco: «Falta tu mensaje.» → faltaCampo con campoMensaje',
    servidor.textoDelServidor('Falta tu mensaje.', ctx) === '[motor.faltaCampo {"campo":"[motor.campoMensaje]"}]', servidor.textoDelServidor('Falta tu mensaje.', ctx));
  const sinClave = (clave) => (clave.startsWith('weeai.') ? clave : traducir.textoDeEmergencia(clave));
  check('13) si ningún diccionario tiene la clave, se ve el texto del servidor y no un hueco',
    servidor.textoDelServidor('Creando tu imagen…', { t: sinClave, locale: 'xx' }) === 'Creando tu imagen…');
  const fechas = servidor.leerFraseDeFechas('del 28 de octubre de 2026 al 3 de noviembre de 2026');
  check('14) las fechas del encargo se leen: del 28 de octubre al 3 de noviembre de 2026',
    !!fechas && fechas.salida.toISOString().startsWith('2026-10-28') && fechas.regreso.toISOString().startsWith('2026-11-03'));
  check('15) y una que no es del encargo no se lee', servidor.leerFraseDeFechas('next week') === null);
  const { frasedeFechas } = lib('creator/templates.js');
  const ida = new Date(Date.UTC(2026, 9, 12, 12));
  const vuelta = new Date(Date.UTC(2026, 9, 22, 12));
  const ronda = servidor.leerFraseDeFechas(frasedeFechas(ida, vuelta));
  check('16) la frase que escribe el servidor es la que lee la app (ida y vuelta)',
    !!ronda && ronda.salida.getTime() === ida.getTime() && ronda.regreso.getTime() === vuelta.getTime(), frasedeFechas(ida, vuelta));
  const tEs = traducir.crearTraductor('es-ES', DICCIONARIOS);
  check('17) la pregunta por id: la del servidor se traduce; una que cambió, no',
    servidor.textoDePregunta(tEs, 'design', { id: 'what', text: TEMPLATES.design.questions[0].text }) === TEMPLATES.design.questions[0].text
    && servidor.textoDePregunta(t, 'design', { id: 'what', text: TEMPLATES.design.questions[0].text }) === '[preguntas.designWhat]'
    && servidor.textoDePregunta(t, 'design', { id: 'what', text: 'Otra cosa' }) === 'Otra cosa');
  check('18) el objetivo por defecto se traduce; el que escribió la persona, no',
    servidor.textoDeObjetivo(t, 'chef', TEMPLATES.chef.defaultGoal) === '[objetivos.objChef]' && servidor.textoDeObjetivo(t, 'chef', 'Pizza') === 'Pizza');

  /*
   * LO QUE EL SERVIDOR DECÍA ANTES (`anteriores.ts`). Un trabajo guardado con la frase de antes se pinta con la frase
   * de HOY, en cada idioma —también en español—. Y cada frase de antes tiene que ser de verdad de antes: si siguiera en
   * el catálogo, la línea sobraría.
   */
  const { ANTERIORES } = (await cargar('i18n/textos/es/servidor/anteriores.ts')).ns;
  const viejas = Object.entries(ANTERIORES).flatMap(([clave, lista]) => lista.map((vieja) => [clave, vieja]));
  const tDa = traducir.crearTraductor('da-DK', DICCIONARIOS);
  /* Dónde vive cada opción del flujo guiado: su experiencia, su pregunta y su id, sacados del servidor de verdad. */
  const dondeVive = new Map(Object.entries(TEMPLATES).flatMap(([exp, plantilla]) => plantilla.questions.flatMap((q) =>
    q.options.map((o) => [servidor.claveOpcion(exp, q.id, o.id), { exp, q: q.id, o: o.id }]))));
  const hoy = (clave) => { const [s, n] = clave.split('.'); return ES[s]?.[n]; };
  const noReconocidas = viejas.filter(([clave, vieja]) => {
    const sitio = dondeVive.get(clave);
    if (clave.startsWith('opciones.')) {
      return !sitio
        || servidor.textoDeOpcion(tDa, sitio.exp, sitio.q, { id: sitio.o, label: vieja }) !== tDa(clave)
        || servidor.textoDeOpcion(tEs, sitio.exp, sitio.q, { id: sitio.o, label: vieja }) !== hoy(clave);
    }
    const experiencia = Object.keys(TEMPLATES).find((e) => clave.startsWith(`plan.${e}`));
    return servidor.textoDelServidor(vieja, { t: tDa, locale: 'da-DK', experiencia }) !== tDa(clave)
      || servidor.textoDelServidor(vieja, { ...ctxEs, experiencia }) !== hoy(clave);
  });
  check('20) lo que el servidor escribió con palabras de antes se sigue reconociendo', viejas.length > 0 && noReconocidas.length === 0,
    muestra(noReconocidas.map(([c]) => c)));
  const siguen = viejas.filter(([clave, vieja]) => {
    const [seccion, nombre] = clave.split('.');
    return ES[seccion]?.[nombre] === vieja || typeof ES[seccion]?.[nombre] !== 'string';
  });
  check('20) y cada frase de antes es de antes, de una clave que existe hoy', siguen.length === 0, muestra(siguen.map(([c]) => c)));
  const planesDeHoy = JSON.stringify(TEMPLATES.business);
  check('20) el servidor ya no promete publicar en las redes de nadie',
    !viejas.some(([, vieja]) => planesDeHoy.includes(vieja)) && !/Publicar en mis redes|dejarla lista en tus redes/i.test(leer('functions/src/creator/templates.ts')));
}

/* ── D · La sección es opcional, pero quien la declara la declara entera ──────────────────────────── */

for (const codigo of DECLARAN) {
  const d = DICCIONARIOS[codigo];
  const faltan = [];
  for (const [seccion, claves] of Object.entries(ES)) {
    for (const clave of Object.keys(claves)) if (typeof d[seccion]?.[clave] !== 'string') faltan.push(`${seccion}.${clave}`);
  }
  check(`19) ${codigo} declara los textos del servidor enteros`, faltan.length === 0, muestra(faltan));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
