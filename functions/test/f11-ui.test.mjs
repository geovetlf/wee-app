/*
 * FASE 11 — LO QUE SE VE: «Mis creaciones», la tarjeta de resultado y el
 * compositor, comprobados sobre el código que se envía.
 *
 *   A · «Mis creaciones» tiene sus estados —cargando, error, vacío, lista,
 *       más páginas— y es de la CUENTA: la misma lista desde las dos caras.
 *   B · La biblioteca pagina con cursor y pide uno de más para saber si hay
 *       otra página; no cuenta la colección entera.
 *   C · La tarjeta de resultado descarga el archivo tal cual y NO tiene un
 *       botón «Guardar» que cree una segunda copia: lo generado ya es material.
 *   D · Nada inventa progreso (C11) y nada enseña ids internos.
 *   E · El Weël cabe en el modelo: vídeo → material → contenido `weel` →
 *       publicación en `weels`, ejecutado con el Core de verdad.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const pantalla = leer('screens/MisCreacionesScreen.tsx');
const servicio = leer('services/assetsService.ts');
const rejilla = leer('components/creator/RejillaDeCreaciones.tsx');
const tarjeta = leer('components/creator/ResultCard.tsx');
const flujo = leer('screens/CreatorFlowScreen.tsx');
const progreso = leer('components/creator/JobProgress.tsx');
const crear = leer('screens/CreateScreen.tsx');
const descarga = leer('services/assetDownload.ts');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · «Mis creaciones»: sus estados, y de quién es ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) hay un estado por cada situación, y no un puñado de booleanos', /\| \{ fase: 'cargando' \}/.test(pantalla) && /\| \{ fase: 'error' \}/.test(pantalla) && /fase: 'lista'/.test(pantalla));
  check('2) cargando se enseña', /estado\.fase === 'cargando' \?/.test(pantalla) && /t\('creaciones\.loading'\)|ActivityIndicator/.test(pantalla));
  check('3) el error se enseña y se puede reintentar', /estado\.fase === 'error' \?/.test(pantalla) && /t\('creaciones\.loadFailed'\)/.test(pantalla) && /t\('creaciones\.retry'\)/.test(pantalla));
  check('4) el vacío distingue «nada» de «nada de este tipo»', /filtro === 'all' \? t\('creaciones\.emptyTitle'\) : t\('creaciones\.emptyFiltered'\)/.test(pantalla));
  check('5) la lista pinta la rejilla y ofrece más solo si hay más', /<RejillaDeCreaciones items=\{estado\.items\}/.test(pantalla) && /estado\.pagina\.hayMas && \(/.test(pantalla) && /t\('creaciones\.loadMore'\)/.test(pantalla));
  check('6) una respuesta tardía de una petición vieja se descarta', /const mia = \+\+peticion\.current;/.test(pantalla) && /if \(mia !== peticion\.current\) return;/.test(pantalla));
  check('7) es de la CUENTA: se pide con user.uid, nunca con la cara activa', /assetsService\.listar\(user\.uid,/.test(pantalla) && !/hidi_|weeProfile|activeUid/.test(sinComentarios(pantalla)));
  check('8) filtrar por tipo y ordenar vuelven a cargar desde el principio', /useEffect\(\(\) => \{ cargar\(\); \}, \[filtro, orden, cargar\]\);/.test(pantalla));
  check('9) borrar pide confirmación que funciona también en web', /confirmAction\(t\('creaciones\.delete'\), t\('creaciones\.deleteConfirm'\), t\('creaciones\.delete'\), true, t\)/.test(pantalla) && /assetsService\.eliminar\(asset\.assetId\)/.test(pantalla));
  check('10) abrir una creación vuelve a su trabajo, si lo tiene', /navigation\.navigate\('CreatorFlow', \{ experienceId, jobId: asset\.provenance\.jobId \}\)/.test(pantalla));
  check('11) vive dentro de Weë AI, con su entrada en el menú', /activeId="creations"/.test(pantalla) && /creations/.test(leer('constants/weeMenu.ts')));
  check('12) y todos sus textos pasan por i18n', !/(title|label)=["'][A-Za-zÁ-ú ]{4,}["']/.test(sinComentarios(pantalla).replace(/t\([^)]*\)/g, '')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · La biblioteca: cuenta, cursor y una de más ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('13) filtra por dueño (la cuenta) y por estados visibles', /where\('ownerAccountId', '==', accountUid\)/.test(servicio) && /where\('status', 'in', VISIBLES\)/.test(servicio));
  check('14) lo borrado no se lista', /VISIBLES: AssetStatus\[\] = \['ready', 'processing', 'failed', 'uploading'\]/.test(servicio));
  check('15) pagina con cursor y pide UNO DE MÁS para saber si hay otra página', /startAfter\(cursor\)/.test(servicio) && /limit\(CREACIONES_POR_PAGINA \+ 1\)/.test(servicio) && /const hayMas = docs\.length > CREACIONES_POR_PAGINA;/.test(servicio));
  check('16) sin contar la colección entera', !/getCountFromServer|\.count\(\)/.test(servicio));
  check('17) los índices de esa consulta están declarados', (() => {
    const idx = JSON.parse(leer('firestore.indexes.json')).indexes.filter((i) => i.collectionGroup === 'assets');
    const tiene = (campos) => idx.some((i) => JSON.stringify(i.fields.map((f) => f.fieldPath)) === JSON.stringify(campos));
    return tiene(['ownerAccountId', 'status', 'createdAt']) && tiene(['ownerAccountId', 'kind', 'status', 'createdAt']);
  })());
  check('18) la URL de entrega de algo borrado es null: no se sirve lo retirado', /urlDeEntrega: \(a: AssetDoc\): string \| null => \(a\.status === 'deleted' \? null : a\.delivery\?\.url \?\? null\)/.test(servicio));
  check('19) borrar es el callable del servidor, no un delete del cliente', /call\('deleteAsset', \{ assetId \}\)/.test(servicio) && !/deleteDoc\(/.test(servicio));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · La tarjeta de resultado: descargar, y «ya está guardada» ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('20) hay descarga del archivo, con el servicio de descargas', /descargarCreacion\(publicable\.uri, publicable\.type\)/.test(tarjeta) && /t\('creaciones\.download'\)/.test(tarjeta));
  check('21) y la constancia de que ya está en «Mis creaciones», que lleva allí', /publicable\.assetId && onOpenCreations && \(/.test(tarjeta) && /t\('creaciones\.savedInCreations'\)/.test(tarjeta) && /onOpenCreations=\{\(\) => navigation\.navigate\('MisCreaciones'\)\}/.test(flujo));
  check('22) NO hay un botón que guarde una segunda copia', !/t\('creaciones\.save'\)/.test(tarjeta) && !/crearMaterial|createAsset|saveAsset/.test(tarjeta));
  check('23) «Usar en proyecto» sigue siendo el selector de proyectos que ya existía', /onSaveToProject=\{\(\) => setPickerVisible\(true\)\}/.test(flujo) && /t\('weeai\.saveToProject'\)/.test(tarjeta));
  check('24) lo que pasa al descargar se dice con sus textos, no con un porcentaje', /notify\(t\('creaciones\.downloaded'\)\)/.test(tarjeta) && /notify\(t\('creaciones\.downloadPermission'\)\)/.test(tarjeta) && /notify\(t\('creaciones\.downloadFailed'\)\)/.test(tarjeta));
  check('25) la descarga no sube copias ni pone marca de agua', !/upload|watermark|marca de agua/i.test(sinComentarios(descarga)) && /MediaLibrary\.saveToLibraryAsync\(destino\)/.test(descarga) && /Sharing\.shareAsync\(destino/.test(descarga));
  check('26) y en la web descarga el navegador', /Platform\.OS === 'web'/.test(descarga) && /Linking\.openURL\(url\)/.test(descarga));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Sin progreso inventado, sin ids a la vista ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('27) el progreso de un trabajo se cuenta en pasos hechos, no en un porcentaje inventado', /t\('creaciones\.progressSteps', \{ hechos/.test(progreso) && !/\d+ ?%/.test(sinComentarios(progreso)));
  check('28) y su texto pasa por i18n (C12)', /useT\(\)/.test(progreso) && /t\('creaciones\.progressWorking'/.test(progreso) && /t\('creaciones\.progressFindLater'\)/.test(progreso));
  check('29) el compositor cuenta archivos, no porcentajes (C11)', /t\('composer\.uploadingFiles', \{ n: subida\.n, total: subida\.total \}\)/.test(crear) && !/uploadProgressFill|porcentaje/.test(sinComentarios(crear)));
  check('30) las subidas a Cloudinary avisan de empezar y terminar, y nada más', !/onProgress\?\.\(\d+\)/.test(leer('services/cloudinaryService.ts')) && /onEstado\?\.\('subiendo'\)/.test(leer('services/cloudinaryService.ts')) && /onEstado\?\.\('terminado'\)/.test(leer('services/cloudinaryService.ts')));
  /* El id solo puede aparecer como `key` de React, que no se pinta. */
  check('31) la rejilla no pinta ningún id', !/\{asset\.assetId\}|\{item\.assetId\}|\.jobId\}/.test(rejilla.replace(/key=\{[^}]*\}/g, '')) && /creaciones\.kind/.test(rejilla));
  /* `width: '100%'` es un estilo; lo que no puede haber es un porcentaje en un texto ni una barra de progreso. */
  check('32) ni un estado como porcentaje', !/progress|porcentaje|percent/i.test(sinComentarios(rejilla)) && !/>\s*[^<{]*\d+\s?%[^<]*</.test(rejilla));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · El Weël cabe en el modelo, ejecutado con el Core ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const core = lib('core/index.js');
  const t0 = 1_700_000_000_000;
  const video = {
    contract: core.CONTENT_CORE_CONTRACT_VERSION, assetId: 'asset_' + 'a'.repeat(32), kind: 'video', status: 'ready',
    ownerAccountId: 'uAna', storageRef: { provider: 'wee', bucket: 'b', objectKey: 'users/uAna/ai-generations/w.mp4' },
    mimeType: 'video/mp4', durationSec: 12, provenance: { createdAt: t0, generationId: 'g1', jobId: 'j1' }, createdAt: t0, updatedAt: t0,
  };
  const weel = {
    contract: core.CONTENT_CORE_CONTRACT_VERSION, contentId: 'content_weel_1', type: 'weel', status: 'ready', ownerAccountId: 'uAna',
    assetRefs: [{ assetId: video.assetId, role: 'primary', order: 0 }], createdAt: t0, updatedAt: t0,
  };
  const publicacion = {
    contract: core.CONTENT_CORE_CONTRACT_VERSION, publicationId: 'pub_weel_1', contentId: 'content_weel_1', ownerAccountId: 'uAna',
    publishedByEntityId: 'hidi_uAna', publishedByEntityType: 'WEE_PROFILE',
    target: { kind: 'weels' }, visibility: 'public', status: 'published', publishedAt: t0, createdAt: t0, updatedAt: t0,
  };
  check('33) un vídeo de 12 s es material válido', core.materialValido(video) === true);
  check('34) un contenido `weel` con ese vídeo como principal es válido', core.contenidoValido(weel) === true && core.usaElMaterial(weel, video.assetId) === true);
  check('35) y su publicación en «Weëls», firmada por el Perfil Weë de la MISMA cuenta, es válida', core.publicacionValida(publicacion) === true && core.publicacionEsDeLaCuenta(publicacion, 'uAna') === true);
  check('36) publicada y pública: visible para terceros', core.estaPublicada(publicacion) === true && core.visibleParaTerceros(publicacion) === true);
  check('37) otra cuenta no es su dueña, aunque la cara coincida en nombre', core.publicacionEsDeLaCuenta(publicacion, 'uBea') === false && core.materialEsDeLaCuenta(video, 'uBea') === false);
  check('38) el compositor lleva el material del vídeo al post (`videoAssetId`) y lo marca Weël', /\.\.\.\(videoAssetId \? \{ videoAssetId \} : \{\}\)/.test(crear) && /\.\.\.\(videoUrl && isWeel \? \{ isWeel: true \} : \{\}\)/.test(crear));
  check('39) y `Post` declara ambos enlaces', /assetIds\?: \(string \| null\)\[\];/.test(leer('services/firestoreService.ts')) && /videoAssetId\?: string;/.test(leer('services/firestoreService.ts')));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nFase 11 en pantalla: estados de verdad, material de la cuenta, y ningún número inventado');
process.exit(failures ? 1 : 0);
