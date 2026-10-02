/**
 * LO QUE EL SERVIDOR LE PUEDE DECIR A UNA PERSONA, SACADO DEL CÓDIGO — Y QUE NADA SE ESCAPE SIN CATÁLOGO.
 *
 *   node test/i18n-servidor-fuentes.test.mjs          (DETALLE=1 para ver cada frase)
 *
 * `i18n-servidor.test.mjs` comprueba que el catálogo reconoce lo que ya se sabe que el servidor escribe. Esta prueba
 * da la vuelta a la pregunta: recorre TODO `functions/src` con el árbol de TypeScript, saca cada frase que puede
 * llegar a una pantalla y exige que esté en el catálogo español (y por tanto en cada idioma que declara la sección
 * del servidor). Si alguien añade un `HttpsError` con una frase nueva, un progreso nuevo o un concepto de Credits nuevo
 * y no lo pone en `i18n/textos/es/servidor/` —y en `en` y `da`—, esto falla y dice cuál.
 *
 * Las frases que NO necesitan catálogo están en una lista cerrada, por archivo, con su porqué y con la EVIDENCIA de
 * que la app no las enseña: las de administración, las que la app traduce por su código (Filmmaker, moderación) y las
 * que la app nunca pinta. Una entrada que ya no corresponde a nada también falla: la lista no guarda restos.
 *
 * Y del otro lado, la app: ningún componente pinta el `error.message` de una llamada (salvo la administración), y el
 * idioma es OBLIGATORIO en cada llamada a Weë AI, a Weë Brain y al guardar el token de push.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const lib = (p) => require(path.join(raiz, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const DETALLE = !!process.env.DETALLE;

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const muestra = (lista, n = 6) => (DETALLE ? lista : lista.slice(0, n)).join(' · ') + (!DETALLE && lista.length > n ? ` … (+${lista.length - n})` : '');

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
  const resultado = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, resultado);
  return resultado;
};
const traducir = (await cargar('i18n/traducir.ts')).ns;
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const servidor = (await cargar('i18n/servidor.ts')).ns;
const tEs = traducir.crearTraductor('es-ES', DICCIONARIOS, { modoDesarrollo: false });
const reconoce = (texto) => servidor.leerDelServidor(texto, { t: tEs, locale: 'es-ES' }).reconocido;

/* ── Del código: cada frase de cada sumidero ──────────────────────────────────────────────────────────── */

const listar = (d, r = []) => {
  for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
    const rel = `${d}/${e.name}`;
    if (e.isDirectory()) listar(rel, r); else if (/\.ts$/.test(e.name)) r.push(rel);
  }
  return r;
};
const FUENTES = listar('functions/src');
/* Una frase para una persona: con espacios y con algo de español (letras con tilde, ¿¡, o palabras funcionales). */
const ES_FRASE = (t) => /\s/.test(t) && (/[áéíóúñ¿¡]/.test(t) || /(?<![\p{L}])(el|la|los|las|de|no|tu|tus|que|esta|este|para|una|un|se|ya|por|con|Weë)(?![\p{L}])/iu.test(t));
/* Lo que se escribe con plantilla se prueba con los valores que el servidor mete de verdad. */
const { ATTACHMENT_KINDS } = lib('creator/inputs.js');
const { TEMPLATES } = lib('creator/templates.js');
const MUESTRAS = {
  label: Object.values(ATTACHMENT_KINDS).map((k) => k.label),
  'TEMPLATES[job.experienceId].name': Object.values(TEMPLATES).map((p) => p.name),
  RESPUESTAS_POR_CREDIT: ['12'],
  /* «… · no se pudo terminar» envuelve el concepto del cobro que se devuelve. */
  description: Object.values(TEMPLATES).map((p) => `WEË AI · ${p.name}`),
  reason: ['Avatar Weë', 'Foto con tu avatar Weë'],
};
const textosDe = (nodo, src) => {
  if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) return [nodo.text];
  if (ts.isTemplateExpression(nodo)) {
    const opciones = nodo.templateSpans.map((s) => MUESTRAS[s.expression.getText(src)] || [`‹${s.expression.getText(src)}›`]);
    const partes = [nodo.head.text, ...nodo.templateSpans.map((s) => s.literal.text)];
    const combinar = (i) => (i === opciones.length ? [''] : opciones[i].flatMap((v) => combinar(i + 1).map((r) => v + partes[i + 1] + r)));
    return combinar(0).map((r) => partes[0] + r);
  }
  /* Una condición elige entre frases: se miran todas. */
  if (ts.isConditionalExpression(nodo)) return [...textosDe(nodo.whenTrue, src), ...textosDe(nodo.whenFalse, src)];
  if (ts.isParenthesizedExpression(nodo)) return textosDe(nodo.expression, src);
  return [];
};
const llamaACredits = (texto) => /creditEngine\.|refundCredits\(|grantCredits\(|spendCredits\(|holdCredits\(/.test(texto);
const frases = [];
for (const archivo of FUENTES) {
  const texto = leer(archivo);
  const src = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true);
  const corto = archivo.replace('functions/src/', '');
  const anotar = (sumidero, nodo, valores) => {
    const linea = src.getLineAndCharacterOfPosition(nodo.getStart()).line + 1;
    for (const v of valores) if (ES_FRASE(v)) frases.push({ archivo: corto, linea, sumidero, texto: v });
  };
  const visitar = (n) => {
    /* 1 · Errores que viajan a la app. */
    if (ts.isNewExpression(n) && /^(EngineError|HttpsError)$/.test(n.expression.getText(src)) && n.arguments?.length > 1) anotar('error', n, textosDe(n.arguments[1], src));
    /* 2 · El progreso de un trabajo. */
    if (ts.isPropertyAssignment(n) && n.name.getText(src) === 'progressText') anotar('progreso', n, textosDe(n.initializer, src));
    /* 3 · El concepto de un movimiento de Credits (en los archivos que cobran, devuelven o regalan). */
    if (ts.isPropertyAssignment(n) && n.name.getText(src) === 'reason' && (llamaACredits(texto) || /^(credits|payments)\//.test(corto)) && !/^(core|engine)\//.test(corto)) {
      anotar('credits', n, textosDe(n.initializer, src));
    }
    if (ts.isVariableDeclaration(n) && n.name.getText(src) === 'description' && n.initializer && /holdCredits\(/.test(texto)) anotar('credits', n, textosDe(n.initializer, src));
    ts.forEachChild(n, visitar);
  };
  visitar(src);
}
/* 4 · Lo que el servidor guarda por tabla: los nombres de los servicios de Credits, los errores del motor y el progreso de cada capacidad. */
const { SERVICE_LABEL } = lib('credits/creditCosts.js');
for (const v of Object.values(SERVICE_LABEL)) frases.push({ archivo: 'credits/creditCosts.ts', linea: 0, sumidero: 'credits', texto: v });
const { ENGINE_MESSAGES } = lib('engine/errors.js');
for (const v of Object.values(ENGINE_MESSAGES)) if (ES_FRASE(v)) frases.push({ archivo: 'engine/errors.ts', linea: 0, sumidero: 'error', texto: v });
const { progressTextFor, friendlyFailure } = lib('engine/humanize.js');
const { CAPABILITY_CATALOG } = lib('core/registry');
for (const c of CAPABILITY_CATALOG) for (const v of [progressTextFor(c.id), friendlyFailure(c.id)]) frases.push({ archivo: 'engine/humanize.ts', linea: 0, sumidero: 'progreso', texto: v });

/*
 * LO QUE NO NECESITA CATÁLOGO, CON SU PORQUÉ Y SU EVIDENCIA.
 *  · administración: solo lo ve quien administra (claim `admin` o WEE_ADMIN_UIDS), en un panel en español a propósito.
 *  · por código: la app no enseña la frase; traduce el CÓDIGO del error con su propio diccionario.
 *  · no se enseña: la app no lo pinta nunca (lo anota en el registro).
 */
const CLASIFICADOS = [
  { archivo: 'engine/admin.ts', tipo: 'administración', porque: 'callable engineAdmin: panel del WEË AI ENGINE', evidencia: () => /assertAdmin|esAdmin|requireAdmin/.test(leer('functions/src/engine/admin.ts')) },
  /*
   * Evidencias de verdad (revisión post-auditoría 2026-10-01, tests/evidencia-vacia): antes la de canary aceptaba la
   * palabra `admin` —que casa con el import de `firebase-admin`— y la de shared/admin era `() => true`. Ahora cada una
   * exige la llamada que hace la puerta y quién la usa.
   */
  { archivo: 'media/canary.ts', tipo: 'administración', porque: 'canario del Media Cloud, solo administración', evidencia: () => /import \{ assertAdmin \} from '\.\.\/shared\/admin';/.test(leer('functions/src/media/canary.ts')) && /^\s*assertAdmin\(request\.auth\);/m.test(leer('functions/src/media/canary.ts')) },
  { archivo: 'shared/admin.ts', tipo: 'administración', porque: 'la guarda de administración misma: sus frases solo llegan a quien llama a una callable de administración', evidencia: () => /export const assertAdmin = /.test(leer('functions/src/shared/admin.ts')) && ['credits/index.ts', 'engine/admin.ts', 'media/canary.ts', 'moderation/index.ts'].every((f) => /assertAdmin\(/.test(leer(`functions/src/${f}`))) },
  { archivo: 'credits/index.ts', textos: ['credits inválido', 'Acción desconocida: ‹data.action›'], tipo: 'administración', porque: 'creditsAdmin (setCost y acción desconocida)', evidencia: () => /export const creditsAdmin = onCall\(OPTS, async \(request\) =>\s*\n?[\s\S]{0,120}assertAdmin/.test(leer('functions/src/credits/index.ts')) },
  { archivo: 'elements/puerta.ts', tipo: 'por código', porque: 'Elements de Filmmaker: la app traduce el código (utils/mensajesDeFilmmaker.ts)', evidencia: () => fs.existsSync(path.resolve(raiz, 'utils/mensajesDeFilmmaker.ts')) },
  { archivo: 'shots/puerta.ts', tipo: 'por código', porque: 'tomas de Filmmaker: la app traduce el código (utils/mensajesDeFilmmaker.ts)', evidencia: () => fs.existsSync(path.resolve(raiz, 'utils/mensajesDeFilmmaker.ts')) },
  { archivo: 'moderation/index.ts', tipo: 'por código', porque: 'Denunciar: viaja el motivo en details.reason y ReportSheet escribe la frase', evidencia: () => /details/.test(leer('services/moderationService.ts')) && /t\('moderation\./.test(leer('components/ReportSheet.tsx')) },
  { archivo: 'credits/aiPricing.ts', textos: ['lo eligió la persona'], tipo: 'no se enseña', porque: 'motivo interno de la elección del modelo de imagen; no es un concepto del historial', evidencia: () => !/creditEngine\.|refundCredits\(|grantCredits\(|spendCredits\(/.test(leer('functions/src/credits/aiPricing.ts')) },
  { archivo: 'social/weetalk.ts', tipo: 'no se enseña', porque: 'burnViewOnce: la app solo lo anota en el registro', evidencia: () => /'burnViewOnce'[\s\S]{0,120}\} catch \(error\) \{\s*\n\s*console\.error/.test(leer('services/messagesService.ts')) },
];
const clasificacionDe = (f) => CLASIFICADOS.find((c) => c.archivo === f.archivo && (!c.textos || c.textos.some((t) => f.texto === t || (t.includes('‹') && f.texto.startsWith(t.split('‹')[0])))));

console.log('\n── A · Del código del servidor a la pantalla: todo con catálogo o clasificado ──');
{
  const sinPlantilla = frases.filter((f) => /‹/.test(f.texto) && !clasificacionDe(f));
  check('1) cada hueco de una frase para una persona tiene sus valores de muestra (si no, no se puede comprobar)', sinPlantilla.length === 0,
    muestra(sinPlantilla.map((f) => `${f.archivo}:${f.linea} ${f.texto}`)));
  const huerfanas = frases.filter((f) => !/‹/.test(f.texto) && !clasificacionDe(f) && !reconoce(f.texto));
  const porSumidero = (s) => frases.filter((f) => f.sumidero === s && !clasificacionDe(f)).length;
  check('2) toda frase del servidor que llega a una pantalla está en el catálogo español (y por tanto en cada idioma que lo declara)',
    huerfanas.length === 0,
    huerfanas.length ? muestra(huerfanas.map((f) => `${f.archivo}:${f.linea} [${f.sumidero}] «${f.texto}»`))
      : `${porSumidero('error')} errores · ${porSumidero('progreso')} progresos · ${porSumidero('credits')} conceptos de Credits`);
  const usadas = new Set(frases.map(clasificacionDe).filter(Boolean));
  const restos = CLASIFICADOS.filter((c) => !usadas.has(c));
  check('3) la lista de lo que no necesita catálogo no guarda restos', restos.length === 0, muestra(restos.map((c) => c.archivo)));
  const sinEvidencia = CLASIFICADOS.filter((c) => !c.evidencia());
  check('4) y cada excepción tiene su evidencia en el código de hoy', sinEvidencia.length === 0, muestra(sinEvidencia.map((c) => `${c.archivo} (${c.tipo})`)));
  const archivosConFrases = new Set(frases.map((f) => f.archivo));
  check('5) control: el recorrido ve los sumideros que tiene que ver',
    ['creator/index.ts', 'creator/inputs.ts', 'credits/creditEngine.ts', 'creator/brain.ts', 'social/econtact.ts', 'engine/humanize.ts'].every((a) => archivosConFrases.has(a))
    && frases.some((f) => f.sumidero === 'progreso') && frases.some((f) => f.sumidero === 'credits'),
    `${frases.length} frases en ${archivosConFrases.size} archivos` + (DETALLE ? ` [${[...archivosConFrases].join(', ')}]` : ''));
  /* Control negativo: una frase nueva, inventada, no se reconoce. */
  check('6) control: una frase nueva sin catálogo NO pasa', !reconoce('Tu creación se ha guardado en la nube de Weë.'));
}

console.log('\n── B · En la app: nada del servidor se enseña sin pasar por el catálogo ──');
{
  const listarApp = (d) => (fs.existsSync(path.resolve(raiz, d)) ? listar(d).concat(listarTsx(d)) : []);
  const listarTsx = (d, r = []) => {
    for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) listarTsx(rel, r); else if (/\.tsx$/.test(e.name)) r.push(rel);
    }
    return r;
  };
  const app = [...new Set(['screens', 'components', 'hooks', 'contexts', 'services', 'utils'].flatMap(listarApp))];
  /* Las que leen el mensaje para RECONOCERLO o para leer un código, sin enseñarlo; y la administración. */
  const PERMITIDOS = {
    'services/creatorService.ts': 'lee la frase para reconocerla en el catálogo (humanizeCreatorError), no la enseña',
    'services/creditsService.ts': 'busca el código INSUFFICIENT_CREDITS dentro del mensaje',
    'screens/EngineAdminScreen.tsx': 'panel de administración del motor: el detalle técnico es para quien administra',
  };
  const quitarComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const conMensaje = app.filter((f) => {
    if (PERMITIDOS[f]) return false;
    const codigo = quitarComentarios(leer(f)).split('\n').filter((l) => !/console\.(log|warn|error|info|debug)\(/.test(l)).join('\n');
    return /\b(?:e|err|error|fallo)\??\.message\b/.test(codigo);
  });
  check('7) ningún componente, pantalla o servicio enseña el `error.message` de una llamada', conMensaje.length === 0, muestra(conMensaje));
  const restos = Object.keys(PERMITIDOS).filter((f) => !/\.message\b/.test(leer(f)));
  check('8) y la lista de permitidos no guarda restos', restos.length === 0, muestra(restos));

  const fuenteCreator = leer('services/creatorService.ts');
  check('9) el idioma es obligatorio al traducir un error de Weë AI (sin él se enseñaba el español del servidor)',
    /export const humanizeCreatorError = \(error: unknown, t: .*?, locale: string\): string =>/.test(fuenteCreator) && !/if \(!locale\) return message/.test(fuenteCreator));
  check('10) y en cada llamada a Weë AI: crear, contestar y ejecutar llevan el idioma, siempre',
    /start: \([^)]*locale: string\) =>/.test(fuenteCreator) && /answer: \([^)]*locale: string\) =>/.test(fuenteCreator) && /run: \(jobId: string, locale: string\) =>/.test(fuenteCreator)
    && !/\.\.\.\(locale \? \{ locale \} : \{\}\)/.test(fuenteCreator));
  check('11) y en cada mensaje a Weë Brain', (leer('services/brainService.ts').match(/locale: string \}\): Promise</g) || []).length === 2);
  check('12) y al traducir lo que contesta ËContact', /export const mensajeDeEContact = \(error: unknown, t: .*?, locale: string\)/.test(leer('services/econtactService.ts'))
    && !/error instanceof Error \? error\.message/.test(leer('services/econtactService.ts')));
  const llamadas = app.flatMap((f) => [...leer(f).matchAll(/creatorService\.(start|answer|run)\(([^;]*?)\);/g)].map((m) => ({ f, m: m[0] })));
  /*
   * Eran seis llamadas: las tres del flujo guiado y otras tres en `hooks/useCreatorJob.ts`, que no importaba nadie y
   * se retiró como código muerto en el cierre post-auditoría (2026-10-01). Quedan las tres del flujo —crear, contestar
   * y ejecutar—, y se exige que estén las tres, no solo un número.
   */
  const delFlujo = llamadas.filter(({ f }) => f === 'screens/CreatorFlowScreen.tsx').map(({ m }) => m.match(/creatorService\.(\w+)/)[1]);
  check('13) control: cada llamada de la app a Weë AI pasa el idioma', llamadas.length >= 3
    && ['start', 'answer', 'run'].every((n) => delFlujo.includes(n)) && llamadas.every(({ m }) => /locale\)/.test(m)),
    muestra(llamadas.filter(({ m }) => !/locale\)/.test(m)).map(({ f }) => f)) || `${llamadas.length} llamadas: ${delFlujo.join(', ')}`);
}

console.log('\n── C · El servidor recibe y usa el idioma ──');
{
  const creator = leer('functions/src/creator/index.ts');
  check('14) creatorChat y creatorRun leen el idioma de la llamada, solo si tiene forma de idioma',
    /const idiomaDeLaApp = etiquetaDeIdioma\(data\.locale\);/.test(creator) && /const idiomaDeLaLlamada = etiquetaDeIdioma\(\(request\.data \|\| \{\}\)\.locale\);/.test(creator));
  check('15) y los pasos de texto lo reciben', /buildTextPrompt\([^)]*job\.locale\)/.test(leer('functions/src/creator/inputs.ts')));
  check('16) Weë Brain lo recibe en cada mensaje', /instruccionDeIdioma\(locale\)/.test(leer('functions/src/creator/brain.ts')));
  const indice = leer('functions/src/index.ts');
  check('17) el push: el idioma elegido en la cuenta y, si no hay, el de la app del aparato que lo recibe',
    /* Desde la revisión post-auditoría, token e idioma salen de UNA lectura de pushTokens (`destinoDelPush`). */
    /const elegido = \(await perfilDeIdentidad\(cuenta\)\)\?\.data\(\)\?\.language;\s*if \(typeof elegido === 'string' && elegido\) return \{ token, idioma: elegido \};/.test(indice)
    && /const datos = \(await db\.collection\('pushTokens'\)\.doc\(cuenta\)\.get\(\)\)\.data\(\);/.test(indice)
    && /idioma: typeof datos\?\.locale === 'string' && datos\.locale \? datos\.locale : null/.test(indice));
  check('18) y la app guarda ese idioma con el token, y lo vuelve a guardar si cambia',
    /savePushToken: async \(accountUid: string, token: string, locale: string\)/.test(leer('services/pushNotificationService.ts'))
    && /savePushToken\(user\.uid, token, locale\)/.test(leer('contexts/PushNotificationContext.tsx'))
    && /\}, \[user\?\.uid, locale\]\);/.test(leer('contexts/PushNotificationContext.tsx')));
  check('19) la página pública elige por el enlace (?hl=) o por el navegador', /consulta\?\.hl/.test(leer('functions/src/public/postPage.ts')) && /hl=/.test(leer('utils/compartirFuera.ts')));
}

console.log('\n── D · Ningún respaldo accidental al español, en ningún idioma ──');
{
  const SERVIDOR_ES = (await cargar('i18n/textos/es/servidor/index.ts')).ns.servidor;
  const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? aplanar(v, pre + k + '.') : [[pre + k, v]]));
  const claves = aplanar(SERVIDOR_ES).map(([k]) => k.replace(/_(zero|one|two|few|many|other)$/, ''));
  const EN = traducir.crearTraductor('en-US', DICCIONARIOS, { modoDesarrollo: false });
  const valores = new Proxy({}, { get: (_, p) => (typeof p === 'string' ? (/contador|numero|dias|noches|cantidad|segundos|max/.test(p) ? 2 : 'X') : undefined), has: () => true });
  const enEspanol = [];
  for (const codigo of Object.keys(DICCIONARIOS)) {
    if (/^es(-|$)/.test(codigo)) continue;
    const t = traducir.crearTraductor(codigo, DICCIONARIOS, { modoDesarrollo: false });
    for (const k of new Set(claves)) {
      const suyo = t(k, valores);
      if (suyo === tEs(k, valores) && suyo !== EN(k, valores)) enEspanol.push(`${codigo}:${k}`);
    }
  }
  check('20) ningún idioma —declare o no la sección del servidor— cae al español en un texto del servidor', enEspanol.length === 0, muestra(enEspanol));
  const cadena = (await cargar('i18n/resolver.ts')).ns;
  const conEspanol = Object.keys(DICCIONARIOS).filter((c) => !/^es(-|$)/.test(c) && cadena.cadenaDeRespaldo(c).some((x) => /^es(-|$)/.test(x)));
  check('21) y la cadena de respaldo de ningún idioma pasa por el español', conEspanol.length === 0, muestra(conEspanol));
}

check('esta suite está en la cadena de `npm test`', /i18n-servidor-fuentes\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
