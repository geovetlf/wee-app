/**
 * SALIR DE UNA CONVERSACIÓN GRABANDO NO DEJA EL MICRÓFONO ABIERTO.
 *
 *   node test/weetalk-grabacion.test.mjs
 *
 * `startRecording` (screens/ConversationScreen.tsx) arranca un `setInterval` para el contador y guarda la grabación de
 * expo-av en `recordingRef`; solo `stopRecording`, que llama el botón, los soltaba. Quien salía de la conversación a
 * mitad de un audio dejaba el contador corriendo sobre una pantalla desmontada y el micrófono grabando.
 *
 * Esta prueba SACA de la pantalla, con el analizador de TypeScript, la limpieza del efecto que se ejecuta al desmontar
 * y la ejecuta con dobles: tiene que parar el contador, detener y descargar la grabación (`stopAndUnloadAsync`),
 * devolver el modo de audio a reproducir, y —si soltarla falla— registrarlo, no callarlo. Y como la limpieza y el
 * botón de enviar tocan la misma grabación, comprueba también la carrera: salir justo mientras se envía no corta el
 * envío ni detiene dos veces la misma grabación.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const ts = require('typescript');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const ARCHIVO = 'screens/ConversationScreen.tsx';
const src = ts.createSourceFile(ARCHIVO, leer(ARCHIVO), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/* La función que devuelve el callback de un `useEffect`: `() => () => {…}` o `() => { …; return () => {…}; }`. */
const limpiezaDe = (cb) => {
  if (!cb || !(ts.isArrowFunction(cb) || ts.isFunctionExpression(cb))) return null;
  if (ts.isArrowFunction(cb.body) || ts.isFunctionExpression(cb.body)) return cb.body;
  if (ts.isBlock(cb.body)) {
    const ret = cb.body.statements.find((s) => ts.isReturnStatement(s) && s.expression && (ts.isArrowFunction(s.expression) || ts.isFunctionExpression(s.expression)));
    return ret ? ret.expression : null;
  }
  return null;
};

/* Los efectos cuya limpieza suelta la grabación. */
const efectos = [];
const funciones = {};
const visitar = (n) => {
  if (ts.isCallExpression(n) && n.expression.getText(src) === 'useEffect') {
    const limpieza = limpiezaDe(n.arguments[0]);
    if (limpieza && /recordingRef/.test(limpieza.getText(src)) && /recordTimerRef/.test(limpieza.getText(src))) {
      efectos.push({ limpieza, deps: n.arguments[1] });
    }
  }
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isCallExpression(n.initializer)
    && n.initializer.expression.getText(src) === 'useCallback') {
    funciones[n.name.text] = n.initializer.arguments[0];
  }
  ts.forEachChild(n, visitar);
};
visitar(src);

const ejecutable = (nodo, alcance) => {
  const js = ts.transpileModule(`(${nodo.getText(src)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  }).outputText.replace(/^"use strict";\s*/, '').replace(/^export \{\};\s*$/m, '').trim().replace(/;$/, '');
  const caja = new Proxy(alcance, { has: (o, k) => k in o });
  // eslint-disable-next-line no-new-func
  return new Function('__caja', `with (__caja) { return (${js}); }`)(caja);
};
const espia = (impl = () => undefined) => {
  const f = (...a) => { f.llamadas.push(a); return impl(...a); };
  f.llamadas = [];
  return f;
};
const ticks = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const sinCapturar = [];
process.on('unhandledRejection', (e) => sinCapturar.push(e));

console.log('\n── A · El efecto existe y solo corre al desmontar ──');
check('1) hay un efecto que, al desmontar, suelta el contador y la grabación', efectos.length === 1, String(efectos.length));
const efecto = efectos[0];
check('2) sus dependencias están vacías: no corta un audio en curso al cambiar nada',
  !!efecto && !!efecto.deps && ts.isArrayLiteralExpression(efecto.deps) && efecto.deps.elements.length === 0,
  efecto?.deps ? efecto.deps.getText(src) : '(sin dependencias: correría en cada render)');

/* Lo que la limpieza suelta es lo que `startRecording` crea. */
const inicio = funciones.startRecording ? funciones.startRecording.getText(src) : '';
check('3) startRecording sigue guardando la grabación y el contador donde la limpieza los busca',
  /recordingRef\.current = rec;/.test(inicio) && /recordTimerRef\.current = setInterval\(/.test(inicio));

console.log('\n── B · Lo que hace la limpieza ──');
if (efecto) {
  const correr = async ({ grabando = true, contador = 42, falla = null } = {}) => {
    const rec = { stopAndUnloadAsync: espia(async () => { if (falla) throw falla; }) };
    const alcance = {
      recordTimerRef: { current: contador },
      recordingRef: { current: grabando ? rec : null },
      clearInterval: espia(),
      Audio: { setAudioModeAsync: espia(async () => {}) },
      console: { error: espia(), warn: espia(), log() {} },
    };
    const limpiar = ejecutable(efecto.limpieza, alcance);
    let lanzo = null;
    try { limpiar(); } catch (e) { lanzo = e; }
    await ticks();
    return { ...alcance, rec, lanzo };
  };

  {
    const r = await correr();
    check('4) para el contador', r.clearInterval.llamadas.length === 1 && r.clearInterval.llamadas[0][0] === 42 && r.recordTimerRef.current === null);
    check('5) detiene y descarga la grabación, una vez', r.rec.stopAndUnloadAsync.llamadas.length === 1 && r.recordingRef.current === null);
    check('6) y deja el audio en modo reproducir', r.Audio.setAudioModeAsync.llamadas.length === 1
      && r.Audio.setAudioModeAsync.llamadas[0][0]?.allowsRecordingIOS === false);
    check('7) sin errores', !r.lanzo && r.console.error.llamadas.length === 0);
  }
  {
    const fallo = new Error('Recorder does not exist');
    const r = await correr({ falla: fallo });
    check('8) si soltar la grabación falla, se registra (console.error con el error), no se calla',
      r.console.error.llamadas.length === 1 && r.console.error.llamadas[0].includes(fallo) && !r.lanzo);
    check('9) y no queda una promesa rechazada sin recoger', sinCapturar.length === 0, sinCapturar.map(String).join(' · '));
  }
  {
    const r = await correr({ grabando: false, contador: null });
    check('10) sin grabación ni contador, no hace nada', r.clearInterval.llamadas.length === 0 && r.rec.stopAndUnloadAsync.llamadas.length === 0
      && r.Audio.setAudioModeAsync.llamadas.length === 0 && !r.lanzo);
  }
}

console.log('\n── C · Salir mientras se envía no corta el envío ──');
if (efecto && funciones.stopRecording) {
  /* Pulsar enviar y salir antes de que la grabación termine de detenerse. */
  /* Una sola detención en curso: todas las llamadas esperan a la misma, como en expo-av. */
  let soltarDetencion;
  const detenida = new Promise((r) => { soltarDetencion = r; });
  const rec = {
    stopAndUnloadAsync: espia(() => detenida),
    getURI: () => 'file:///audio.m4a',
  };
  const compartido = {
    recordTimerRef: { current: 7 },
    recordingRef: { current: rec },
    clearInterval: espia(),
    Audio: { setAudioModeAsync: espia(async () => {}) },
    console: { error: espia(), warn() {}, log() {} },
  };
  const messagesService = { sendMessage: espia(async () => {}) };
  const enviar = ejecutable(funciones.stopRecording, {
    ...compartido, convId: 'conv-1', myUid: 'u1', setRecording: espia(), setRecordDuration: espia(),
    pulseAnim: { stopAnimation() {}, setValue() {} }, recordStartTime: { current: Date.now() - 5000 }, setSending: espia(),
    uploadAudioToCloudinary: espia(async () => 'https://audio'), messagesService,
  });
  const limpiar = ejecutable(efecto.limpieza, compartido);
  const envio = enviar();
  await ticks(1);
  limpiar(); // la persona sale
  soltarDetencion();
  /* Con un tope: si el envío se quedara colgado, la prueba lo dice en vez de quedarse esperando. */
  await Promise.race([envio, new Promise((r) => setTimeout(r, 2000))]);
  await ticks();
  check('11) la grabación se detiene una sola vez', rec.stopAndUnloadAsync.llamadas.length === 1, String(rec.stopAndUnloadAsync.llamadas.length));
  check('12) y el audio se envía igual', messagesService.sendMessage.llamadas.length === 1
    && messagesService.sendMessage.llamadas[0][4] === 'https://audio', compartido.console.error.llamadas.map((a) => String(a[1])).join(' · '));
}

/* CONTROL: la prueba ve el fallo. Sin el efecto —la pantalla de antes— no hay nada que suelte la grabación. */
{
  const control = ts.createSourceFile('c.tsx', 'const X = () => { const recordingRef = useRef(null); useEffect(() => { cargar(); }, []); };', ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hallados = 0;
  ts.forEachChild(control, function v(n) {
    if (ts.isCallExpression(n) && n.expression.getText(control) === 'useEffect' && limpiezaDe(n.arguments[0])) hallados++;
    ts.forEachChild(n, v);
  });
  check('13) control: un efecto sin limpieza no cuenta como limpieza', hallados === 0);
}

check('esta suite está en la cadena de `npm test`', /weetalk-grabacion\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
