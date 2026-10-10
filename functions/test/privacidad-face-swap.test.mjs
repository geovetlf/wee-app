/*
 * PRIVACIDAD DE FACE SWAP (línea P · H-2): la selfie ORIGINAL no se ve, no se publica y no sale con una dirección de
 * descarga. Pruebas unitarias: la puerta de la selfie y el reemplazo del servidor (con un almacén falso) y la decisión
 * de qué puede ser la foto de perfil y su retirada (utils/fotoDePerfil.ts, ejecutado tal cual).
 *
 *   node functions/test/privacidad-face-swap.test.mjs     (requiere `npm --prefix functions run build`)
 *
 * No necesita emuladores: el almacén es falso. La prueba con reglas reales está en privacidad-face-swap.emulator.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib/' + p));

/* El cubo de Weë, fijado por entorno (la puerta lo lee sin inicializar Firebase). */
process.env.STORAGE_BUCKET = 'demo-wee.appspot.com';
const CUBO = 'demo-wee.appspot.com';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── El servidor: la puerta de la selfie y el reemplazo ───────────────────────────────────────────────────── */
const avatar = lib('generateAvatar.js');
const { resolverOrigenDeSelfie, reemplazoDeAvatar } = avatar;

const rechazada = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
};
const TOKEN_ORIGINAL = '7c1d2e3f-0000-4000-8000-0123456789ab';
const URL_DE_LA_APP = (ruta, cubo = CUBO, token = TOKEN_ORIGINAL) =>
  `https://firebasestorage.googleapis.com/v0/b/${cubo}/o/${encodeURIComponent(ruta)}?alt=media&token=${token}`;

console.log('\n── S · La puerta de la selfie (generateAvatar.ts) ──');
{
  const propio = resolverOrigenDeSelfie('uAna', { selfiePath: 'users/uAna/face-swap/source_1700000000000-abc123.jpg' });
  check('S1) la dueña: su ruta de face-swap entra, y se lee por gs:// sin testigo',
    propio.path === 'users/uAna/face-swap/source_1700000000000-abc123.jpg'
    && propio.gs === `gs://${CUBO}/users/uAna/face-swap/source_1700000000000-abc123.jpg`, JSON.stringify(propio));

  const legado = resolverOrigenDeSelfie('uAna', { selfieUrl: URL_DE_LA_APP('users/uAna/face-swap/source_1700000000000-abc123.jpg') });
  check('S2) legado: una dirección de la propia cuenta se convierte a ruta, y su testigo no sale en el resultado',
    legado.path === 'users/uAna/face-swap/source_1700000000000-abc123.jpg' && !legado.gs.includes('token') && !legado.gs.includes(TOKEN_ORIGINAL),
    JSON.stringify(legado));

  const casos = [
    ['S3) ruta de OTRA cuenta', { selfiePath: 'users/uBea/face-swap/x.jpg' }],
    ['S4) ruta sin la carpeta de origen (creator-inputs)', { selfiePath: 'users/uAna/creator-inputs/x.jpg' }],
    ['S5) carpeta parecida (face-swapped)', { selfiePath: 'users/uAna/face-swapped/x.jpg' }],
    ['S6) recorrido «..»', { selfiePath: 'users/uAna/face-swap/../creator-inputs/x.jpg' }],
    ['S7) recorrido codificado «%2e%2e»', { selfiePath: 'users/uAna/face-swap/%2e%2e/x.jpg' }],
    ['S8) ruta absoluta', { selfiePath: '/users/uAna/face-swap/x.jpg' }],
    ['S9) barras invertidas', { selfiePath: 'users\\uAna\\face-swap\\x.jpg' }],
    ['S10) ruta vacía', { selfiePath: '   ' }],
    ['S11) tipo no válido', { selfiePath: 5 }],
    ['S12) sin nada', {}],
    ['S13) sin datos', undefined],
    ['S14) dirección ajena (otra cuenta) como legado', { selfieUrl: URL_DE_LA_APP('users/uBea/face-swap/x.jpg') }],
    ['S15) dirección de OTRO cubo como legado', { selfieUrl: URL_DE_LA_APP('users/uAna/face-swap/x.jpg', 'cubo-ajeno.appspot.com') }],
    ['S16) dirección de la propia cuenta, fuera de face-swap, como legado', { selfieUrl: URL_DE_LA_APP('users/uAna/creator-inputs/x.jpg') }],
    ['S17) dirección con un testigo que no es un UUID', { selfieUrl: `https://firebasestorage.googleapis.com/v0/b/${CUBO}/o/users%2FuAna%2Fface-swap%2Fx.jpg?alt=media&token=no-es-un-uuid!` }],
  ];
  for (const [nombre, datos] of casos) {
    const e = rechazada(() => resolverOrigenDeSelfie('uAna', datos));
    check(nombre, !!e && e.code === 'invalid-argument', e ? `${e.code}` : 'se aceptó y NO debía');
  }
}

console.log('\n── S · El reemplazo con almacén falso: el original no sale ──');
{
  const origen = resolverOrigenDeSelfie('uAna', { selfiePath: 'users/uAna/face-swap/source_1700000000000-abc123.jpg' });
  const llamadas = { leer: [], reemplazar: [], guardar: [] };
  const almacen = {
    leerImagen: async (direccion) => {
      llamadas.leer.push(direccion);
      return { base64: direccion.includes('face-swap') ? 'SELFIE_BASE64' : 'AVATAR_BASE64', mimeType: 'image/png' };
    },
    reemplazar: async (sb, sm, ab, am) => {
      llamadas.reemplazar.push([sb, sm, ab, am]);
      return 'data:image/png;base64,RESULTADO_BASE64';
    },
    guardarResultado: async (dataUrl, ruta) => {
      llamadas.guardar.push({ dataUrl, ruta });
      return `https://firebasestorage.googleapis.com/v0/b/${CUBO}/o/${encodeURIComponent(ruta)}?alt=media&token=RESULTADO-TOKEN`;
    },
  };
  const salida = await reemplazoDeAvatar(almacen, 'uAna', origen, `gs://${CUBO}/users/uAna/ai-avatar/avatar_1.png`);
  check('S18) autorizado: el original se LEE por gs:// (sin testigo) y el avatar por su dirección',
    llamadas.leer[0] === origen.gs && llamadas.leer[1] === `gs://${CUBO}/users/uAna/ai-avatar/avatar_1.png`
    && !llamadas.leer[0].includes('token'), JSON.stringify(llamadas.leer));
  check('S19) la RESPUESTA solo lleva la dirección del resultado, sin la selfie ni su ruta ni su testigo',
    Object.keys(salida).length === 1 && salida.imageUrl.includes('RESULTADO-TOKEN')
    && !JSON.stringify(salida).includes('face-swap') && !JSON.stringify(salida).includes('SELFIE'), JSON.stringify(salida).slice(0, 120));
  check('S20) lo GUARDADO es el resultado en avatar-replacement; el original no aparece en ningún dato guardado',
    llamadas.guardar.length === 1 && llamadas.guardar[0].ruta.startsWith('users/uAna/avatar-replacement/')
    && !JSON.stringify(llamadas.guardar).includes('face-swap') && !JSON.stringify(llamadas.guardar).includes('SELFIE')
    && llamadas.guardar[0].dataUrl === 'data:image/png;base64,RESULTADO_BASE64', JSON.stringify(llamadas.guardar[0].ruta));
  check('S21) la selfie se pasa a Gemini (lectura), pero no se guarda en ningún sitio',
    llamadas.reemplazar.length === 1 && llamadas.reemplazar[0][0] === 'SELFIE_BASE64', JSON.stringify(llamadas.reemplazar[0]?.[0]));
}

console.log('\n── S · El callable rechaza ANTES de cobrar (sin requestId válido o con un original ajeno) ──');
{
  const callable = avatar.avatarReplacement;
  const r1 = await callable.run({ auth: { uid: 'uAna' }, data: { selfiePath: 'users/uBea/face-swap/x.jpg', avatarUrl: 'y', requestId: 'swap_prueba_1' } })
    .then(() => null, (e) => e);
  check('S22) original de otra cuenta → invalid-argument (no se llega a cobrar)',
    !!r1 && r1.code === 'invalid-argument' && r1.message === 'selfie_no_valida', r1 ? `${r1.code} ${r1.message}` : 'se aceptó');
  const r2 = await callable.run({ auth: { uid: 'uAna' }, data: { selfieUrl: 'x', avatarUrl: 'y' } }).then(() => null, (e) => e);
  check('S23) sin requestId la petición se rechaza antes de la puerta (como antes)',
    !!r2 && r2.code === 'invalid-argument' && r2.message === 'request_id_required', r2 ? `${r2.code} ${r2.message}` : 'se aceptó');
}

/* ── La decisión de la foto de perfil (utils/fotoDePerfil.ts, transpilado tal cual) ───────────────────────── */
console.log('\n── P · Qué puede ser la foto de perfil (utils/fotoDePerfil.ts) ──');
const ts = require('typescript');
const cargarPuro = (rel) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(RAIZ, rel), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', js)(modulo, modulo.exports);
  return modulo.exports;
};
const foto = cargarPuro('utils/fotoDePerfil.ts');
const d = foto.decidirFotoDePerfil;
const motivo = (decision) => (decision.ok ? 'OK' : decision.motivo);
const RESULTADO = `https://firebasestorage.googleapis.com/v0/b/${CUBO}/o/${encodeURIComponent('users/uAna/avatar-replacement/result_1.png')}?alt=media&token=R`;
const AVATAR = `https://firebasestorage.googleapis.com/v0/b/${CUBO}/o/${encodeURIComponent('users/uAna/ai-avatar/avatar_1.png')}?alt=media&token=A`;

const decisiones = [
  ['P1) resultado generado (avatar-replacement) de la propia cuenta', d({ referencia: RESULTADO, origen: 'resultado-generado', bucket: CUBO }), 'OK'],
  ['P2) resultado generado (ai-avatar) en forma gs://', d({ referencia: `gs://${CUBO}/users/uAna/ai-avatar/avatar_1.png`, origen: 'resultado-generado', bucket: CUBO }), 'OK'],
  ['P3) el ORIGINAL en forma de dirección con testigo', d({ referencia: URL_DE_LA_APP('users/uAna/face-swap/source_1.jpg'), origen: 'resultado-generado', bucket: CUBO }), 'original_privado'],
  ['P4) el ORIGINAL como ruta', d({ referencia: 'users/uAna/face-swap/source_1.jpg', origen: 'resultado-generado' }), 'original_privado'],
  ['P5) el ORIGINAL doblemente codificado', d({ referencia: `https://firebasestorage.googleapis.com/v0/b/${CUBO}/o/users%252FuAna%252Fface-swap%252Fx.jpg?alt=media`, origen: 'foto-publica' }), 'original_privado'],
  ['P6) el ORIGINAL aunque el origen sea «foto pública»', d({ referencia: 'users/uAna/face-swap/x.jpg', origen: 'foto-publica' }), 'original_privado'],
  ['P7) archivo local del móvil (no es Storage)', d({ referencia: 'file:///data/user/0/app/cache/photo.jpg', origen: 'resultado-generado' }), 'no_es_resultado_generado'],
  ['P8) foto de un catálogo externo', d({ referencia: 'https://images.unsplash.com/photo-1.jpg', origen: 'resultado-generado' }), 'no_es_resultado_generado'],
  ['P9) de OTRO cubo', d({ referencia: `gs://otro-cubo.appspot.com/users/uAna/ai-avatar/a.png`, origen: 'resultado-generado', bucket: CUBO }), 'bucket_ajeno'],
  ['P10) entrada privada de Creator (no es un resultado)', d({ referencia: `gs://${CUBO}/users/uAna/creator-inputs/a.jpg`, origen: 'resultado-generado', bucket: CUBO }), 'ruta_no_publica'],
  ['P11) foto pública de Cloudinary (origen explícito)', d({ referencia: 'https://res.cloudinary.com/wee/image/upload/v1/profile/uAna/avatars/a.jpg', origen: 'foto-publica' }), 'OK'],
  ['P12) un Storage de Weë como «foto pública»', d({ referencia: `gs://${CUBO}/users/uAna/ai-avatar/a.png`, origen: 'foto-publica' }), 'no_es_foto_publica'],
  ['P13) origen que no existe', d({ referencia: RESULTADO, origen: 'otro' }), 'origen_no_permitido'],
  ['P14) vacía', d({ referencia: '  ', origen: 'resultado-generado' }), 'vacia'],
  ['P15) no es una cadena', d({ referencia: undefined, origen: 'resultado-generado' }), 'vacia'],
];
for (const [nombre, decision, esperado] of decisiones) {
  check(nombre, motivo(decision) === esperado, `esperado ${esperado} · obtenido ${motivo(decision)}`);
}
check('P16) el resultado de AVATAR no se confunde con un original (las dos carpetas se distinguen)', foto.esRutaDeOriginal(AVATAR) === false);

console.log('\n── P · La retirada: el perfil deja de guardar y de mostrar el original ──');
{
  const ORIG = 'users/uAna/face-swap/source_1.jpg';
  const r1 = foto.retiradaDeOriginal({ photoURL: URL_DE_LA_APP(ORIG), photoURLThumbnail: URL_DE_LA_APP(ORIG), aiAvatarPortraitUrl: URL_DE_LA_APP(ORIG), avatarType: 'custom' });
  check('P17) si la foto que se veía era el original: se vacían los tres campos y vuelve el avatar predefinido',
    !!r1 && r1.photoURL === '' && r1.photoURLThumbnail === '' && r1.aiAvatarPortraitUrl === '' && r1.avatarType === 'predefined' && r1.avatarId === 'male',
    JSON.stringify(r1));
  const r2 = foto.retiradaDeOriginal({ photoURL: RESULTADO, photoURLThumbnail: RESULTADO, aiAvatarPortraitUrl: URL_DE_LA_APP(ORIG), avatarType: 'custom', avatarId: 'female' });
  check('P18) si la foto visible es un resultado y solo el retrato guarda el original: se vacía el retrato y la foto se conserva',
    !!r2 && r2.aiAvatarPortraitUrl === '' && r2.photoURL === undefined && r2.avatarType === undefined, JSON.stringify(r2));
  check('P19) sin original no hay nada que escribir (null)', foto.retiradaDeOriginal({ photoURL: RESULTADO, avatarType: 'custom' }) === null);
  check('P20) el avatar predefinido conservado se respeta (avatarId existente)',
    foto.retiradaDeOriginal({ photoURL: URL_DE_LA_APP(ORIG), avatarType: 'custom', avatarId: 'female' }).avatarId === 'female');
}

/* ── C · El cliente: lo que NO debe volver a aparecer (lectura estática de sus fuentes) ───────────────────── */
console.log('\n── C · El cliente: el original no recibe testigo y no se asigna al perfil ──');
{
  const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const svc = leer('services/avatarGenerationService.ts');
  const pantalla = leer('screens/AiAvatarScreen.tsx');
  const crear = leer('screens/CreateScreen.tsx');
  const contexto = leer('contexts/UserProfileContext.tsx');
  const cuerpo = (src, inicio, fin) => {
    const a = src.indexOf(inicio);
    const b = a < 0 ? -1 : src.indexOf(fin, a + inicio.length);
    return a < 0 || b < 0 ? '' : src.slice(a, b);
  };

  const subida = cuerpo(svc, 'export async function uploadImageForSwap', '\n}\n');
  check('C1) uploadImageForSwap devuelve la RUTA del original (sin dirección de descarga)',
    /return storagePath;/.test(subida) && !/getDownloadURL/.test(subida), subida.slice(-60).replace(/\s+/g, ' '));
  check('C2) el servicio de face-swap no pide NINGUNA dirección de descarga (getDownloadURL no aparece)',
    !/getDownloadURL/.test(svc));
  check('C3) el reemplazo manda la RUTA del original al callable (selfiePath), no una dirección',
    /\{ selfiePath, avatarUrl: comoDireccionDeWee\(avatarRef\), requestId \}/.test(svc) && !/selfieUrl/.test(svc));
  check('C4) la pantalla y la composición no piden direcciones de descarga del original',
    !/getDownloadURL/.test(pantalla) && !/getDownloadURL/.test(crear));

  const subirFoto = cuerpo(pantalla, 'const handleUploadAvatar = async () => {', 'const handleRegenerate');
  check('C5) «subir foto» NO escribe el perfil (ni foto, ni retrato, ni avatar) ni usa la dirección de la selfie',
    subirFoto.length > 0 && !/usersService\.update|updateLocalProfile|photoURL|aiAvatarPortraitUrl|uploadedUrl/.test(subirFoto),
    subirFoto.length ? 'sin escrituras de perfil' : 'no se encontró la función');
  check('C6) «subir foto» muestra la vista previa desde el URI LOCAL del picker',
    /setVistaPrevia\(asset\.uri\)/.test(subirFoto));
  check('C7) «usar como avatar» y «usar el intercambio como foto» comprueban la decisión antes de escribir',
    (pantalla.match(/decidirFotoDePerfil\(/g) || []).length >= 4
    && /if \(!decidirFotoDePerfil\(\{ referencia: generatedAvatarUrl[\s\S]{0,140}\)\.ok\) return;/.test(pantalla)
    && /if \(!decidirFotoDePerfil\(\{ referencia: swapResultUrl[\s\S]{0,140}\)\.ok\) return;/.test(pantalla));
  check('C8) el original ya no llega a ningún campo del perfil (no queda uploadedUrl en la pantalla)',
    !/uploadedUrl/.test(pantalla));
  check('C9) la retirada se aplica al perfil propio y al Perfil Weë (efectos aparte, sin tocar la carga)',
    /retiradaDeOriginal\(realProfile\)/.test(contexto) && /retiradaDeOriginal\(weeProfile\)/.test(contexto)
    && !/retiradaDeOriginal\([^)]*\)[\s\S]{0,40}\n\s*setRealProfile\(profile\)/.test(contexto));
  check('C10) la lista de ficheros que escriben en Storage no cambia (ya la fija privacidad y A2)',
    ['services/avatarGenerationService.ts', 'services/creatorUploads.ts', 'services/storageService.ts'].every((f) => /uploadBytes/.test(leer(f))));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ La selfie original no se ve, no se publica y no sale con una dirección de descarga');
process.exitCode = failures ? 1 : 0;
setTimeout(() => process.exit(process.exitCode), 5_000).unref();
