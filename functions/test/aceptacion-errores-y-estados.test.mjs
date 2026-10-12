/**
 * ACEPTACIÓN · LO QUE LEE LA PERSONA CUANDO ALGO NO SALE, Y EN QUÉ PUNTO ESTÁ SU TRABAJO.
 *
 * Catálogo y numeración de escenarios: `docs/WEE-ACEPTACION.md` (cada comprobación lleva el id del suyo).
 *
 * ── Qué mide ────────────────────────────────────────────────────────────────
 *
 * Un error en Weë AI cruza tres capas: el servidor lo clasifica (`engine/errors.ts`: ocho códigos y su frase en
 * español), Firebase lo viste de `functions/<código>`, y la app lo convierte en una frase en el idioma de quien mira
 * (`humanizeCreatorError`, en `services/creatorService.ts`). Cada capa tiene sus pruebas; ninguna recorría las tres.
 * Aquí se hace EL RECORRIDO: se fabrica el error con el servidor de verdad, se le da la forma que le da el cliente de
 * Firebase, y se le pregunta a la app qué le diría a una persona en cada uno de los idiomas que Weë ofrece.
 *
 *   A · EL ESPAÑOL. Los ocho códigos del motor, los cinco motivos de «no disponible», el saldo que no alcanza, no
 *       haber entrado, no tener conexión y un error que nadie esperaba: cada uno una frase entera, distinta de las demás
 *       cuando la causa es distinta, y sin código, sin proveedor y sin traza.
 *   B · LOS IDIOMAS. Las mismas frases en cada diccionario propio (16): que existan en el suyo —no por el respaldo—, que
 *       no sean el español, y que no se les quede ningún hueco `{{…}}` ni ningún código por rellenar.
 *   C · EL SALDO. Lo que enseña el aviso de «no te alcanzan los Credits»: el saldo y el coste llegan a la pantalla en
 *       todos los idiomas, con el número dentro.
 *   D · LOS ESTADOS. Los seis estados del trabajo (preguntando, planificado, en marcha, hecho, fallido, cancelado) los
 *       dice el servidor y los pinta la app: mismos seis, cada uno con su texto en cada idioma y distintos entre sí.
 *   E · LO QUE ESCRIBE EL SERVIDOR MIENTRAS TRABAJA. El texto de progreso y el de «no te cobré» de cada capacidad:
 *       en español sin proveedor, y reconocido por la app para pintarlo en el idioma de quien mira.
 *
 * ── Lo que NO dice ─────────────────────────────────────────────────────────
 *
 * Que la traducción sea BUENA: solo hay revisión nativa del danés (`docs/I18N-REVISION.md`). Aquí se comprueba que
 * está, que es de ese idioma y que está entera. Y nada de red: lo que pasa cuando un teléfono pierde la conexión de
 * verdad lo prueba un dispositivo, no esta suite.
 *
 * Usa el compilado (`npm run build` antes). Carga los 16 diccionarios (unos 4 s de transpilado).
 */
import { lib } from './_firestore-en-memoria.mjs';
import { crearComprobador, PROVEEDORES_QUE_NO_SE_LEEN } from './_aceptacion.mjs';
import { crearCargador } from './filmmaker-cliente.mjs';

const { check, titulo, aviso, terminar } = crearComprobador();

const { EngineError, toEngineHttpsError, noDisponible, MOTIVOS_DE_NO_DISPONIBLE, ENGINE_MESSAGES } = lib('engine/errors.js');
const { friendlyFailure, progressTextFor } = lib('engine/humanize.js');
const { ESTADO_CANONICO } = lib('creator/types.js');
const { ADAPTERS } = lib('engine/registry.js');

const cargar = crearCargador({
  dobles: {
    'firebase/functions': { httpsCallable: () => { throw new Error('sin red'); } },
    'firebase/firestore': new Proxy({}, { get: () => () => { throw new Error('sin red'); } }),
    '../config/firebase': { db: {}, functions: {}, storage: {} },
  },
});
const CREATOR = cargar('services/creatorService.ts');
const SERVIDOR = cargar('i18n/servidor.ts');
const { crearTraductor } = cargar('i18n/traducir.ts');
const DICCIONARIOS = cargar('i18n/diccionarios.ts').DICCIONARIOS;
const textoDe = (d, clave) => clave.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), d);

/** Los dieciséis diccionarios PROPIOS (hay códigos que comparten uno: pt-PT, zh-Hant…). */
const UNICOS = [];
for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!UNICOS.some(([, otro]) => otro === d)) UNICOS.push([codigo, d]);
const faltas = new Set();
const traductorDe = (codigo) => crearTraductor(codigo, DICCIONARIOS, { alFaltarUnaClave: (clave, locale) => faltas.add(`${locale}:${clave}`) });

/** Un error como lo ve la app: el del servidor, con el prefijo que le pone el cliente de Firebase. */
const comoLoVeLaApp = (errorDelServidor) => {
  const h = toEngineHttpsError(errorDelServidor);
  return { code: `functions/${h.code}`, message: h.message, details: h.details };
};

/* Los errores de una persona, uno por causa. */
const CASOS = [
  ...Object.keys(ENGINE_MESSAGES).filter((c) => c !== 'NOT_AVAILABLE').map((codigo) => ({ id: codigo, error: comoLoVeLaApp(new EngineError(codigo)) })),
  ...MOTIVOS_DE_NO_DISPONIBLE.map((m) => ({ id: `NOT_AVAILABLE/${m}`, error: comoLoVeLaApp(noDisponible(m)) })),
  {
    id: 'INSUFFICIENT_CREDITS',
    /* Tal como lo manda el Credit Engine al reservar (credits.toHttpsError): código, y cuánto hace falta y cuánto hay. */
    error: { code: 'functions/failed-precondition', message: 'INSUFFICIENT_CREDITS', details: { code: 'INSUFFICIENT_CREDITS', required: 12, available: 3, service: 'ai_image' } },
  },
  { id: 'SIN_SESION', error: { code: 'functions/unauthenticated', message: 'unauthenticated', details: undefined } },
  { id: 'SIN_CONEXION', error: { code: 'functions/unavailable', message: 'Failed to fetch' } },
  { id: 'IMPREVISTO', error: new Error('TypeError: Cannot read properties of undefined (reading \'x\') at C:\\secreto\\clave-sk-123.js:9:3') },
];

/* ═══ A · EL ESPAÑOL ══════════════════════════════════════════════════════ */
titulo('A · Lo que lee una persona en español, por cada causa');
{
  const t = traductorDe('es');
  const frases = new Map(CASOS.map((c) => [c.id, CREATOR.humanizeCreatorError(c.error, t, 'es')]));
  const lista = [...frases.entries()];
  check(`ACE-T-02 · ACE-D-21 · las ${CASOS.length} causas se convierten en una frase entera, sin espacios sobrantes`,
    lista.every(([, f]) => typeof f === 'string' && f.trim() === f && f.length >= 12), lista.filter(([, f]) => !f || f.length < 12).map(([id]) => id).join());
  const CODIGO = /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b|functions\/|undefined|\[object|\{\{|\bat\s+\S+:\d+|\bTypeError\b|sk-123|secreto|Failed to fetch/;
  check('ACE-T-02 · ninguna deja escapar un código, una traza, un secreto, un hueco sin rellenar ni el texto en inglés de la red',
    lista.every(([, f]) => !CODIGO.test(f)), lista.filter(([, f]) => CODIGO.test(f)).map(([id, f]) => `${id}: ${f}`).join(' | '));
  check('ACE-T-02 · ninguna nombra a un proveedor ni a un modelo', lista.every(([, f]) => !PROVEEDORES_QUE_NO_SE_LEEN.test(f)));
  const distintas = (...ids) => new Set(ids.map((id) => frases.get(id))).size === ids.length;
  check('ACE-T-02 · las causas que piden un gesto distinto dicen cosas distintas: esperar, volver a intentar, entrar, conseguir Credits, no disponible',
    distintas('RATE_LIMITED', 'TIMEOUT', 'PROVIDER_ERROR', 'DUPLICATE_REQUEST', 'UNAUTHORIZED', 'INSUFFICIENT_CREDITS', 'SIN_CONEXION', 'IMPREVISTO', 'INVALID_REQUEST'));
  check('ACE-T-02 · lo que pasó DESPUÉS de cobrar promete «no te cobré»: el proveedor que falla, lo que no se pudo terminar, el tiempo agotado y el cupo',
    ['PROVIDER_ERROR', 'GENERATION_FAILED', 'TIMEOUT', 'RATE_LIMITED'].every((id) => /No te cobré/.test(frases.get(id))), ['PROVIDER_ERROR', 'GENERATION_FAILED', 'TIMEOUT', 'RATE_LIMITED'].map((id) => frases.get(id)).join(' | '));
  check('ACE-T-02 · y lo que pasó ANTES de cobrar no lo promete en falso: «ya está en marcha» y «no disponible» no hablan de dinero',
    !/cobr/i.test(frases.get('DUPLICATE_REQUEST')) && MOTIVOS_DE_NO_DISPONIBLE.every((m) => !/cobr/i.test(frases.get(`NOT_AVAILABLE/${m}`))));
  check('ACE-D-11 · «no te alcanzan los Credits» es una frase propia (no «algo salió mal») y la conversación sigue pudiendo ofrecer la tienda',
    frases.get('INSUFFICIENT_CREDITS') === t('weeai.errNotEnoughCredits') && !/errGeneric/.test(frases.get('INSUFFICIENT_CREDITS')) && frases.get('INSUFFICIENT_CREDITS') !== frases.get('IMPREVISTO'));
  check('ACE-T-02 · «no disponible» se dice por su MOTIVO (esperar, tu región, tu país, otras opciones, ahora no): cinco frases distintas',
    new Set(MOTIVOS_DE_NO_DISPONIBLE.map((m) => frases.get(`NOT_AVAILABLE/${m}`))).size === 5);
  check('ACE-T-05 · si la app se cansa de esperar la respuesta (15 min) NO es un error de la persona: el trabajo sigue en el servidor y llega por Firestore',
    CREATOR.isClientTimeout({ code: 'functions/deadline-exceeded', message: 'deadline-exceeded' }) === true
    && CREATOR.isClientTimeout({ code: 'functions/deadline-exceeded', details: { code: 'TIMEOUT' } }) === false
    && CREATOR.creatorErrorCode(comoLoVeLaApp(new EngineError('RATE_LIMITED'))) === 'RATE_LIMITED');
}

/* ═══ B · LOS IDIOMAS ═════════════════════════════════════════════════════ */
titulo(`B · Las mismas causas en los ${UNICOS.length} diccionarios propios`);
{
  const es = traductorDe('es');
  const enEspanol = new Map(CASOS.map((c) => [c.id, CREATOR.humanizeCreatorError(c.error, es, 'es')]));
  check(`ACE-T-06 · hay dieciséis diccionarios propios y el español es uno`, UNICOS.length === 16 && UNICOS.some(([c]) => c === 'es'), UNICOS.map(([c]) => c).join(' '));
  const CODIGO = /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b|functions\/|undefined|\[object|\{\{|\bTypeError\b|sk-123|secreto/;
  const malos = [];
  const iguales = [];
  for (const [codigo] of UNICOS) {
    const t = traductorDe(codigo);
    for (const c of CASOS) {
      const f = CREATOR.humanizeCreatorError(c.error, t, codigo);
      if (typeof f !== 'string' || f.trim() !== f || f.length < 6 || CODIGO.test(f) || PROVEEDORES_QUE_NO_SE_LEEN.test(f)) malos.push(`${codigo}/${c.id}: «${f}»`);
      /* Solo el español puede decir lo del español: en otro idioma, que sea otra frase y no el respaldo. */
      if (codigo !== 'es' && f === enEspanol.get(c.id)) iguales.push(`${codigo}/${c.id}`);
    }
  }
  check(`ACE-T-06 · ${CASOS.length} causas × ${UNICOS.length} idiomas: todas entregan una frase, sin código, sin hueco, sin traza y sin proveedor`, malos.length === 0, malos.slice(0, 4).join(' | '));
  check('ACE-T-06 · y fuera del español ninguna es la frase en español (no se cae al respaldo sin que nadie lo vea)', iguales.length === 0, iguales.slice(0, 6).join(' '));
  const sinClave = [...faltas].filter((f) => /weeai\.err|motor\./.test(f));
  check('ACE-T-06 · el traductor no tuvo que inventar ninguna clave de error al resolverlas', sinClave.length === 0, sinClave.slice(0, 5).join(' '));
  const clavesDeError = ['weeai.errNotEnoughCredits', 'weeai.errRateLimited', 'weeai.errTimeout', 'weeai.errDuplicate', 'weeai.errNoAccount', 'weeai.errSignIn', 'weeai.errOffline', 'weeai.errGeneric'];
  const sinPropia = UNICOS.flatMap(([codigo, d]) => clavesDeError.filter((k) => typeof textoDe(d, k) !== 'string' || !textoDe(d, k).trim()).map((k) => `${codigo}:${k}`));
  check('ACE-T-06 · cada idioma tiene en SU diccionario las ocho frases de error de Weë AI (no por el respaldo)', sinPropia.length === 0, sinPropia.slice(0, 6).join(' '));
}

/* ═══ C · EL SALDO ════════════════════════════════════════════════════════ */
titulo('C · El aviso de «no te alcanzan los Credits»: el saldo y el coste llegan con su número');
{
  const faltan = [];
  for (const [codigo] of UNICOS) {
    const t = traductorDe(codigo);
    const saldo = t('weeai.creditsAvailable', { saldo: '7351' });
    const coste = t('weeai.costLine', { coste: '9482' });
    if (!/7351|7[.,\s ]?351/.test(saldo)) faltan.push(`${codigo}:saldo`);
    if (!/9482|9[.,\s ]?482/.test(coste)) faltan.push(`${codigo}:coste`);
    for (const k of ['weeai.notEnoughCredits', 'weeai.getCredits']) if (typeof textoDe(DICCIONARIOS[codigo], k) !== 'string' || !textoDe(DICCIONARIOS[codigo], k).trim()) faltan.push(`${codigo}:${k}`);
  }
  check('ACE-D-11 · en los 16 idiomas el aviso dice cuánto hay y cuánto hace falta (el número se pinta) y tiene su título y su botón de conseguir Credits', faltan.length === 0, faltan.slice(0, 6).join(' '));
}

/* ═══ D · LOS ESTADOS ═════════════════════════════════════════════════════ */
titulo('D · Los seis estados de un trabajo: los mismos en el servidor y en la app');
{
  const delServidor = Object.keys(ESTADO_CANONICO).sort().join();
  const delCliente = Object.keys(CREATOR.claveDelEstado).sort().join();
  check('ACE-T-03 · el servidor y la app hablan de los mismos seis estados (si uno añade uno, la prueba cae)', delServidor === delCliente && delServidor.split(',').length === 6, `${delServidor} | ${delCliente}`);
  const sinTexto = [];
  const repetidos = [];
  for (const [codigo, d] of UNICOS) {
    const textos = Object.values(CREATOR.claveDelEstado).map((k) => textoDe(d, k));
    if (textos.some((x) => typeof x !== 'string' || !x.trim())) sinTexto.push(codigo);
    if (new Set(textos).size !== textos.length) repetidos.push(codigo);
  }
  check('ACE-T-03 · cada estado tiene texto propio en cada uno de los 16 idiomas, y no hay dos estados con el mismo texto', sinTexto.length === 0 && repetidos.length === 0, `sin texto: ${sinTexto} · repetidos: ${repetidos}`);
  const es = traductorDe('es');
  aviso(`los seis, en español: ${Object.entries(CREATOR.claveDelEstado).map(([e, k]) => `${e}→«${es(k)}»`).join(' · ')}`);
  check('ACE-D-13 · «cancelado» existe como estado que se PINTA, pero el servidor no lo escribe nunca (ver el hueco ACE-D-13 de aceptacion-recorrido-servidor)',
    ESTADO_CANONICO.cancelled === 'cancelled' && CREATOR.claveDelEstado.cancelled === 'weeai.jobCancelled');
}

/* ═══ E · LO QUE ESCRIBE EL SERVIDOR MIENTRAS TRABAJA ═════════════════════ */
titulo('E · El progreso y el «no te cobré» que escribe el servidor, para cada capacidad');
{
  const capacidades = ADAPTERS.mock.models[0].capabilities;
  check('ACE-D-09 · (hay veintiocho capacidades que el servidor sabe narrar)', capacidades.length >= 25, String(capacidades.length));
  const progreso = capacidades.map((c) => [c, progressTextFor(c, 'Definir el concepto')]);
  const fallo = capacidades.map((c) => [c, friendlyFailure(c)]);
  check('ACE-D-09 · el texto de progreso de cada capacidad es una frase en español, sin proveedor ni código',
    progreso.every(([, f]) => typeof f === 'string' && f.length > 5 && !PROVEEDORES_QUE_NO_SE_LEEN.test(f) && !/undefined|_/.test(f)), progreso.filter(([, f]) => !f || /undefined|_/.test(f)).map(([c]) => c).join());
  check('ACE-D-10 · el texto de «salió mal» de cada capacidad dice «No te cobré» y invita a volver a intentarlo, sin proveedor',
    fallo.every(([, f]) => /No te cobré/.test(f) && /inténtalo de nuevo/.test(f) && !PROVEEDORES_QUE_NO_SE_LEEN.test(f)));
  /* Lo que la app guarda de un trabajo fallido se pinta en el idioma de quien mira: se reconoce y se traduce. */
  const sinTraducir = [];
  for (const [codigo] of UNICOS.filter(([c]) => c !== 'es')) {
    const t = traductorDe(codigo);
    for (const f of new Set(fallo.map(([, x]) => x))) {
      const visto = SERVIDOR.textoDelServidor(f, { t, locale: codigo, experiencia: 'design' });
      if (visto === f) sinTraducir.push(`${codigo}: «${f.slice(0, 40)}…»`);
    }
  }
  check('ACE-D-10 · y esas tres frases de fallo se reconocen y se pintan en cada idioma que no es el español (no se le enseña español a quien no lo lee)', sinTraducir.length === 0, sinTraducir.slice(0, 3).join(' | '));
}

terminar();
