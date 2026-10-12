/**
 * R7 · K · LA FOTO QUE ALGUIEN LE ENSEÑA A WEË BRAIN VIAJA AL ESPECIALISTA (B-10 · R-08 de docs/INTEGRACION-FLUJO-E2E.md).
 *
 * LO QUE PASABA. Weë Brain propone un especialista («te lo hace mejor Weë Design»), la persona lo toca y la pantalla navegaba a
 * `CreatorFlow` con `experienceId` y `goal` y nada más: la foto que había adjuntado a Brain se quedaba en la conversación y el
 * especialista volvía a pedirla. Pero la foto no tenía por qué perderse: `useBrainChat` ya la sube al Storage de Weë
 * (`users/<uid>/brain-attachments/…`), el servidor guarda en el mensaje esa dirección, `creatorChat` admite la carpeta (H lo
 * midió: era el UNKNOWN de R6) y `uploadCreatorImage` devuelve tal cual una dirección que ya está en el Storage.
 *
 * LO QUE ES AHORA. `goToSpecialist` lleva la foto del último mensaje DE LA PERSONA que tenga una, en el parámetro que ya existe
 * (`ContextoDeExperiencia.imageUri`). Solo cliente: ni servidor, ni Credits, ni rutas nuevas.
 *
 *   A · La derivación, leída: lleva la foto, de quién y con qué parámetro; y no sube nada desde aquí.
 *   B · La derivación, EJECUTADA: el código real de `goToSpecialist` contra conversaciones de verdad.
 *   C · El contrato de punta a punta: lo que Brain guarda, lo que el flujo sube y lo que el servidor admite.
 *   D · Lo que no cambia, y la cadena.
 *
 * Todo en memoria y sin red: la pantalla se lee y se ejecuta su función, no se monta; el cliente de subida se carga con dobles de
 * Storage; el servidor es `functions/lib` (compilado), sin Firebase.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(path.resolve(RAIZ, 'package.json'))('typescript');
const lib = (p) => require(path.resolve(here, '../lib/' + p));

const PANTALLA = 'screens/BrainChatScreen.tsx';
const pantalla = leer(PANTALLA);
const codigo = sinComentarios(pantalla);

/** El texto de `goToSpecialist`, de su `const` al `};` que lo cierra (dos espacios de sangría). */
const cuerpoDe = (src) => {
  const ini = src.indexOf('  const goToSpecialist = ');
  const fin = ini < 0 ? -1 : src.indexOf('\n  };', ini);
  return ini < 0 || fin < 0 ? '' : src.slice(ini, fin + '\n  };'.length);
};
const derivacion = cuerpoDe(pantalla);
const derivacionSinComentarios = cuerpoDe(codigo);

/* ═══ A · LA DERIVACIÓN, LEÍDA ═════════════════════════════════════════════ */
console.log('\n── A · La derivación al especialista lleva la foto ──');
check('A1) existe `goToSpecialist` y navega a `CreatorFlow` con la experiencia y lo que la persona dijo, como siempre',
  derivacion.length > 0 && /navigation\.navigate\('CreatorFlow', \{[^}]*experienceId: exp\.id[^}]*goal: lastUserText \|\| undefined/.test(derivacionSinComentarios), derivacionSinComentarios.slice(0, 160));
check('A2) y lleva la foto en `imageUri`, el parámetro que ya tiene la ruta', /imageUri/.test(derivacionSinComentarios)
  && /navigation\.navigate\('CreatorFlow', \{[\s\S]*imageUri[\s\S]*\}\)/.test(derivacionSinComentarios));
check('A3) la foto sale del ÚLTIMO mensaje de la persona que tenga una: ni de Weë, ni del primero',
  /\[\.\.\.bubbles\]\.reverse\(\)\.find\(\(b\) => b\.role === 'user' && !!b\.imageUrl\)/.test(derivacionSinComentarios));
check('A4) y la clave solo viaja si hay foto: quien no adjuntó nada navega exactamente como antes',
  /\.\.\.\(imageUri \? \{ imageUri \} : \{\}\)/.test(derivacionSinComentarios));
check('A5) la pantalla no sube nada ni toca el Storage: la foto ya está subida',
  !/uploadCreatorImage|firebase\/storage|uploadBytes|getDownloadURL|services\/creatorUploads/.test(codigo));
check('A6) ni llama a un servicio de creación: sigue siendo solo navegación', !/creatorService|creatorChat|creatorRun/.test(derivacionSinComentarios));
const contexto = leer('constants/weeWorkspaces.ts');
check('A7) `imageUri` es un parámetro REAL de la ruta: `CreatorFlow` recibe un `ContextoDeExperiencia` y este lo declara',
  /CreatorFlow: ContextoDeExperiencia;/.test(leer('navigation/MainStackNavigator.tsx'))
  && /export interface ContextoDeExperiencia \{[\s\S]*?\n  imageUri\?: string;/.test(contexto));

/* ═══ B · LA DERIVACIÓN, EJECUTADA ═════════════════════════════════════════ */
console.log('\n── B · El código real de `goToSpecialist`, contra conversaciones de verdad ──');
/*
 * No se monta la pantalla (es de React Native): se toma el texto de la función tal como está en el archivo, se le quitan los
 * tipos con el compilador de TypeScript y se ejecuta con las tres cosas que lee de fuera: `bubbles`, `lastUserText` y
 * `navigation`. Si alguien cambia la función, esto ejecuta el cambio.
 */
const ejecutar = ({ bubbles, lastUserText }) => {
  const llamadas = [];
  const navigation = { navigate: (...args) => llamadas.push(args) };
  const js = ts.transpileModule(derivacion, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('bubbles', 'lastUserText', 'navigation', `${js}\ngoToSpecialist({ id: 'home' });`)(bubbles, lastUserText, navigation);
  return llamadas;
};
const ALMACEN = 'https://firebasestorage.googleapis.com/v0/b/demo-wee.appspot.com/o/users%2Fu1%2Fbrain-attachments%2F';
const SALA = `${ALMACEN}sala.jpg?alt=media&token=t1`;
const COCINA = `${ALMACEN}cocina.jpg?alt=media&token=t2`;
const persona = (key, text, imageUrl) => ({ key, role: 'user', text, ...(imageUrl ? { imageUrl } : {}) });
const weeDice = (key, text, extra = {}) => ({ key, role: 'wee', text, ...extra });

{
  const r = ejecutar({ lastUserText: 'mira mi sala', bubbles: [persona('1', 'mira mi sala', SALA), weeDice('2', 'Eso lo hace mejor Weë Design', { suggestedExperience: 'home' })] });
  check('B1) con una foto adjunta: navega a CreatorFlow con la experiencia, lo dicho Y la foto',
    r.length === 1 && r[0][0] === 'CreatorFlow' && r[0][1].experienceId === 'home' && r[0][1].goal === 'mira mi sala' && r[0][1].imageUri === SALA, JSON.stringify(r[0]?.[1]));
}
{
  const r = ejecutar({ lastUserText: 'ideas para mi negocio', bubbles: [persona('1', 'ideas para mi negocio'), weeDice('2', 'Weë Business te ayuda', { suggestedExperience: 'business' })] });
  const params = r[0]?.[1] ?? {};
  check('B2) sin foto: exactamente lo de antes —la experiencia y lo dicho—, sin la clave `imageUri`, ni siquiera vacía',
    r.length === 1 && JSON.stringify(Object.keys(params).sort()) === JSON.stringify(['experienceId', 'goal']) && !('imageUri' in params), JSON.stringify(params));
}
{
  const r = ejecutar({ lastUserText: 'y esta otra', bubbles: [persona('1', 'mira mi sala', SALA), weeDice('2', 'Vale'), persona('3', 'y esta otra', COCINA), weeDice('4', 'Eso, Design')] });
  check('B3) con varias fotos, la ÚLTIMA que la persona enseñó', r[0]?.[1].imageUri === COCINA, r[0]?.[1].imageUri);
}
{
  const r = ejecutar({ lastUserText: 'y qué puedo hacer con ella', bubbles: [persona('1', 'mira mi sala', SALA), weeDice('2', 'Es una sala bonita'), persona('3', 'y qué puedo hacer con ella'), weeDice('4', 'Eso, Design')] });
  check('B4) si el último mensaje no lleva foto pero uno anterior sí, la de ese: es la foto de la conversación',
    r[0]?.[1].imageUri === SALA && r[0]?.[1].goal === 'y qué puedo hacer con ella', JSON.stringify(r[0]?.[1]));
}
{
  const r = ejecutar({ lastUserText: 'hola', bubbles: [persona('1', 'hola'), weeDice('2', 'Mira esta imagen', { imageUrl: COCINA, suggestedExperience: 'design' })] });
  check('B5) una imagen que viene de Weë (no de la persona) no cuenta como «su foto»', !('imageUri' in (r[0]?.[1] ?? {})), JSON.stringify(r[0]?.[1]));
}
{
  const r = ejecutar({ lastUserText: '', bubbles: [persona('1', '', SALA), weeDice('2', 'Design')] });
  check('B6) sin texto, `goal` queda sin definir como siempre, y la foto viaja igual', r[0]?.[1].goal === undefined && r[0]?.[1].imageUri === SALA, JSON.stringify(r[0]?.[1]));
}
{
  const local = 'file:///data/user/0/com.wee/cache/ImagePicker/foto.jpg';
  const r = ejecutar({ lastUserText: 'mira', bubbles: [persona('1', 'mira', local)] });
  check('B7) la foto de un mensaje todavía en camino (dirección local) también viaja: CreatorFlow la sube con el mismo cuidado que cualquiera',
    r[0]?.[1].imageUri === local, r[0]?.[1].imageUri);
}
{
  const r = ejecutar({ lastUserText: '', bubbles: [] });
  check('B8) una conversación vacía no rompe nada', r.length === 1 && r[0][1].imageUri === undefined && !('imageUri' in r[0][1]));
}

/* ═══ C · EL CONTRATO DE PUNTA A PUNTA ═════════════════════════════════════ */
console.log('\n── C · Lo que Brain guarda, lo que el flujo sube y lo que el servidor admite ──');
const flujo = leer('screens/CreatorFlowScreen.tsx');
const flujoCodigo = sinComentarios(flujo);
check('C1) `CreatorFlow` arranca con la foto que le llega en la ruta', /useState<string \| undefined>\(params\.imageUri\)/.test(flujoCodigo));
check('C2) y la sube con `uploadCreatorImage` antes de crear el trabajo, que es lo que lleva su dirección al servidor',
  /const imageUrl = imageUri \? await uploadPhoto\(imageUri\) : undefined;/.test(flujoCodigo) && /uploadCreatorImage\(user\.uid, uri\)/.test(flujoCodigo));
const brainHook = sinComentarios(leer('hooks/useBrainChat.ts'));
check('C3) Brain sube la foto a SU carpeta del Storage de Weë antes de enviar, y al servidor solo le va la dirección',
  /uploadCreatorImage\(user\.uid, options\.imageUri, 'brain-attachments'\)/.test(brainHook) && /brainService\.send\(\{[^}]*imageUrl/.test(brainHook));
const brainServidor = sinComentarios(leer('functions/src/creator/brain.ts'));
check('C4) y el servidor guarda en el mensaje de la persona esa dirección, ya comprobada: es lo que la pantalla lee después',
  /const imageUrl = data\.imageUrl \? assertInputImageUrl\(data\.imageUrl, uid\) : undefined;/.test(brainServidor)
  && /messages\.doc\(messageId\)\.set\(stripUndefined\(\{ role: 'user', text: message, imageUrl,/.test(brainServidor));
{
  /* `uploadCreatorImage` de verdad, con el Storage de mentira: una dirección que ya es del Storage no se sube otra vez. */
  const subidas = [];
  const cargar = crearCargador({
    dobles: {
      'react-native': { Image: { getSize: (_uri, ok) => ok(800, 600) } },
      'firebase/storage': {
        ref: (_s, ruta) => ({ ruta }),
        uploadBytes: async (r) => { subidas.push(r.ruta); },
        getDownloadURL: async (r) => `https://firebasestorage.googleapis.com/v0/b/demo-wee.appspot.com/o/${encodeURIComponent(r.ruta)}?alt=media&token=nuevo`,
      },
      '../config/firebase': { storage: {} },
    },
  });
  const { uploadCreatorImage } = cargar('services/creatorUploads.ts');
  const devuelta = await uploadCreatorImage('u1', SALA, 'creator-inputs');
  check('C5) `uploadCreatorImage` devuelve tal cual la dirección de la foto de Brain y NO la sube otra vez', devuelta === SALA && subidas.length === 0, `${devuelta} · subidas ${subidas.length}`);
  const gs = await uploadCreatorImage('u1', 'gs://demo-wee.appspot.com/users/u1/brain-attachments/sala.jpg', 'creator-inputs');
  check('C6) y lo mismo con una dirección gs://', gs.startsWith('gs://') && subidas.length === 0);
  /* CONTROL: una foto local SÍ se sube (si no, C5 no probaría nada: es que la función distingue). */
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ blob: async () => ({ size: 1234, type: 'image/jpeg' }) });
  const nueva = await uploadCreatorImage('u1', 'file:///cache/foto.jpg', 'creator-inputs');
  globalThis.fetch = original;
  check('C7) CONTROL: una foto local sí se sube, a la carpeta que se pide', subidas.length === 1 && /^users\/u1\/creator-inputs\//.test(subidas[0]) && nueva.includes('nuevo'), subidas.join());
}
{
  /* Y el servidor, el compilado: la dirección que Brain guardó es admitida por `creatorChat` para el especialista (el UNKNOWN de R6). */
  process.env.STORAGE_BUCKET = 'demo-wee.appspot.com';
  const { assertInputImageUrl } = lib('creator/inputs.js');
  const intento = (url, uid) => { try { return { ok: true, url: assertInputImageUrl(url, uid) }; } catch (e) { return { ok: false, motivo: e?.details?.reason ?? e?.message }; } };
  const guardada = assertInputImageUrl(SALA, 'u1');
  check('C8) lo que Brain guarda de la foto es la dirección de la carpeta `brain-attachments` de la persona', /users%2Fu1%2Fbrain-attachments%2F/.test(guardada), guardada);
  const alEspecialista = intento(guardada, 'u1');
  check('C9) y `creatorChat` (la misma puerta, `assertInputImageUrl`) la admite para el especialista, sin cambiarla', alEspecialista.ok && alEspecialista.url === guardada, JSON.stringify(alEspecialista));
  check('C10) la foto de Brain de OTRA persona no vale (la puerta sigue siendo la de siempre)', !intento(SALA, 'u2').ok && intento(SALA, 'u2').motivo === 'bad_image_url', JSON.stringify(intento(SALA, 'u2')));
  check('C11) ni la de otro cubo, ni la de otro sitio de internet',
    !intento(SALA.replace('demo-wee.appspot.com', 'cubo-ajeno.appspot.com'), 'u1').ok && !intento('https://example.com/sala.jpg', 'u1').ok);
}

/* ═══ D · LO QUE NO CAMBIA ═════════════════════════════════════════════════ */
console.log('\n── D · Lo que no cambia, y la cadena ──');
check('D1) tocar un satélite sigue usando la ruta de siempre (`Specialist`), sin foto: no es una derivación',
  /const irASatelite = \(exp: WeeExperience\) => navigation\.navigate\('Specialist', \{ id: exp\.id \}\);/.test(codigo));
check('D2) la propuesta del servidor sigue mandando: `suggestion` sale de `suggestedExperience` y nunca es Weë Brain',
  /getExperienceById\(lastWee\.suggestedExperience\)/.test(codigo) && /exp && exp\.id !== 'brain' \? exp : null/.test(codigo));
check('D3) Weë Brain sigue sin saber de Credits ni de precios (lo vigila brain-vivo): la derivación no mete nada de eso', !/Credits|credit|precio|spend/i.test(derivacionSinComentarios));
check('D4) esta suite está en la cadena de `npm test`', /brain-foto-al-especialista\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ La foto de Weë Brain viaja al especialista (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
