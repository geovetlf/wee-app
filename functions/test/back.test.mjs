/*
 * "Back" es la etiqueta de volver en todo Weë.
 *
 * La decisión de producto: cuando un control saca de una pantalla o de un
 * selector y devuelve a la anterior, dice "Back". "Cancelar" se queda solo
 * donde de verdad cancela algo —una operación, un permiso, una confirmación,
 * un formulario—. Aquí se vigilan las dos mitades: que los controles de volver
 * digan Back, y que ningún "Cancelar" nuevo se cuele haciendo de Back.
 *
 * Se recorre TODO el cliente, no una lista de archivos: un "Cancelar" pegado a
 * un `goBack()` en una pantalla nueva tiene que fallar aquí sin que nadie
 * tenga que acordarse de añadirla.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { comoSeLee } from './i18n-ayuda.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ruta = (p) => path.resolve(here, '../../' + p);
/*
 * El fuente se lee ya RESUELTO: cada `t('modulo.clave')` sale como la frase que
 * le pone el diccionario español. Lo que se comprueba aquí sigue siendo lo que
 * se comprobaba —las palabras que ve la persona—, y de paso queda comprobado
 * que la clave existe y que dice lo que tiene que decir.
 */
const leer = (p) => comoSeLee(fs.readFileSync(ruta(p), 'utf8'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/** El código sin comentarios: lo que se prueba es lo que se ejecuta. */
const soloCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** Todos los .tsx del cliente, con su ruta relativa. */
const cliente = [];
for (const carpeta of ['screens', 'components', 'navigation']) {
  for (const nombre of fs.readdirSync(ruta(carpeta), { recursive: true })) {
    const archivo = carpeta + '/' + String(nombre).replace(/\\/g, '/');
    if (/\.tsx$/.test(archivo)) cliente.push(archivo);
  }
}

/*
 * ── A · TODOS LOS CONTROLES DE VOLVER DICEN LO MISMO ─────────────────────────
 *
 * Hasta la fase 5P decían "Back" escrito a mano, en inglés, dentro de una
 * interfaz en español. Ahora los tres piden la MISMA clave —`common.back`, la
 * única de toda la aplicación— y `comoSeLee` la resuelve a la palabra aprobada.
 * Así esto comprueba DOS cosas donde antes comprobaba una: que el control pide
 * la clave correcta y que el diccionario le pone "Volver".
 */
console.log('\n── A · Los controles de volver dicen todos lo mismo ──');
{
  const ubic = leer('screens/AgregarUbicacionScreen.tsx');
  check('1) Agregar ubicación: Back a la izquierda, con el mismo goBack de siempre',
    /onPress=\{\(\) => navigation\.goBack\(\)\}[\s\S]{0,200}accessibilityLabel="Volver"[\s\S]{0,200}>Volver<\/Text>/.test(ubic) && /Agregar ubicación<\/Text>/.test(ubic));
  check('1) y allí ya no queda ningún Cancelar', !/Cancelar/.test(soloCodigo(ubic)));

  const avatar = leer('components/avatars/AvatarPicker.tsx');
  check('2) el selector de avatar sale por el volver, y lo dice también al lector de pantalla',
    /onPress=\{\(\) => setShowPicker\(false\)\} accessibilityRole="button" accessibilityLabel="Volver">[\s\S]{0,160}Volver\s*<\/Text>/.test(avatar) && !/Cancelar/.test(soloCodigo(avatar)));

  /* Crear publicación: el diseño aprobado usa el aspa, etiquetada Back, con el mismo cierre. */
  const crear = leer('screens/CreateScreen.tsx');
  check('3) Crear publicación: el control de salir es el volver y cierra con handleClose',
    /const handleClose = \(\) => \{\s*navigation\.goBack\(\);/.test(crear) && /onPress=\{handleClose\}[\s\S]{0,300}(accessibilityLabel="Volver"|>Volver<\/Text>)/.test(crear) && !/>Cancelar<\/Text>/.test(crear));

  /*
   * Y LOS TRES PIDEN LA MISMA CLAVE. Antes había tres palabras escritas a mano
   * en tres archivos; ahora hay una, y esto lo caza si alguien copia otra.
   */
  const crudos = ['screens/AgregarUbicacionScreen.tsx', 'components/avatars/AvatarPicker.tsx', 'screens/CreateScreen.tsx']
    .map((f) => fs.readFileSync(ruta(f), 'utf8'));
  check('4) los tres piden la misma clave, common.back',
    crudos.every((f) => /accessibilityLabel=\{t\('common\.back'\)\}/.test(f)));
  check('4) y ninguno se inventó una suya',
    crudos.every((f) => !/t\('(profile|settings|auth|home|weeai)\.back'\)/.test(f)));
}

console.log('\n── B · Ningún "Cancelar" hace de Back ──');
{
  /*
   * Un "Cancelar" visible o anunciado, con un `goBack()` a menos de 400
   * caracteres por delante, es un botón de volver mal etiquetado. Se mira el
   * código sin comentarios para que una explicación no dispare la alarma.
   */
  /*
   * Se cuentan las FORMAS DE CÓDIGO —`'Cancelar'`, `"Cancelar"`, `>Cancelar<`—
   * sobre el fuente crudo: `soloCodigo` se atraganta con `CreateScreen.tsx`
   * (un falso `/*` le hace tragarse bloques enteros) y las comillas dejan fuera
   * la palabra suelta de un comentario.
   */
  /*
   * Y desde que la interfaz va por i18n, un "Cancelar" también se escribe
   * `t('common.cancel')`. Cuenta igual: lo que se vigila es el botón, no cómo
   * se deletrea. Las dos formas conviven mientras dura la migración.
   */
  const FORMAS = /'Cancelar'|"Cancelar"|>\s*Cancelar\s*<|'common\.cancel'/g;
  const sospechosos = [];
  for (const archivo of cliente) {
    const codigo = leer(archivo);
    for (const m of codigo.matchAll(FORMAS)) {
      const antes = codigo.slice(Math.max(0, m.index - 400), m.index);
      if (/goBack\(\)/.test(antes)) sospechosos.push(archivo);
    }
  }
  check('4) ningún Cancelar está pegado a un goBack()', sospechosos.length === 0, sospechosos.join(' · '));

  /*
   * Y los que quedan son cancelaciones DE VERDAD, cada uno con su motivo. La
   * lista es cerrada a propósito: un "Cancelar" nuevo en una pantalla tiene que
   * venir aquí a explicarse —o llamarse Back—.
   */
  const CONSERVADOS = {
    'components/avatars/AvatarPicker.tsx': 0,
    'components/ChatCamera.tsx': 1, // declina el permiso de cámara y cierra: es el "no" de un permiso
    'components/CommunitySelector.tsx': 1, // confirma antes de unirse a una comunidad sin filtro
    'components/creator/ResultCard.tsx': 1, // descarta la instrucción de edición de un resultado
    'components/PostCard.tsx': 2, // alertas: eliminar y reportar una publicación
    'screens/CommunitiesManagementScreen.tsx': 1, // alerta: salir de una comunidad
    'screens/CreateScreen.tsx': 2, // alertas de permisos de galería y cámara
    'screens/InboxScreen.tsx': 1, // alerta: eliminar una conversación
    'screens/ProjectScreen.tsx': 1, // alerta: eliminar un proyecto
    'screens/ProjectsScreen.tsx': 1, // cierra el formulario de proyecto nuevo (acción de SectionTitle)
    'screens/WeeBizProductsScreen.tsx': 1, // alerta: eliminar un producto
    'screens/WeeBizProfileScreen.tsx': 1, // alerta: eliminar una reseña
  };
  const encontrados = {};
  for (const archivo of cliente) {
    const n = (leer(archivo).match(FORMAS) || []).length;
    if (n > 0) encontrados[archivo] = n;
  }
  const fueraDeLista = Object.keys(encontrados).filter((a) => !(a in CONSERVADOS));
  const cambiaron = Object.entries(CONSERVADOS).filter(([a, n]) => n > 0 && encontrados[a] !== n).map(([a, n]) => `${a} (${encontrados[a] || 0}≠${n})`);
  check('5) cada Cancelar que queda está en la lista de cancelaciones reales', fueraDeLista.length === 0, fueraDeLista.join(' · '));
  check('5) y ninguno se multiplicó ni desapareció sin avisar', cambiaron.length === 0, cambiaron.join(' · '));
  /* El botón sigue siendo el de una alerta, se escriba en español o por clave. */
  check('5) los de las alertas siguen siendo botones de alerta', Object.keys(encontrados).filter((a) => /Screen\.tsx$|PostCard/.test(a) && !/ProjectsScreen/.test(a)).every((a) => /text: (?:'Cancelar'|t\('common\.cancel'\)),?\s*(style: 'cancel')?/.test(leer(a))));
  /* La confirmación común de Weë también cancela de verdad: devuelve `false`. */
  check('6) confirmAction conserva su Cancelar, que devuelve false', /\{ text: 'Cancelar', style: 'cancel', onPress: \(\) => resolve\(false\) \}/.test(leer('utils/notify.ts')));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nBack es volver en todo Weë; Cancelar, solo cancelar');
process.exit(failures ? 1 : 0);
