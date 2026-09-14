/*
 * WEË AI: un nombre visible, y los identificadores técnicos intactos.
 *
 * Lo que la persona veía como "Weë Creator" pasa a llamarse WEË AI. NO es un
 * producto nuevo ni una experiencia más: es la misma área, la misma pantalla y
 * la misma ruta, con otro nombre delante.
 *
 * Por eso esta prueba vigila las dos mitades del cambio:
 *
 *  · que el nombre VISIBLE sea WEË AI en todas partes —menú, marco de las
 *    pantallas, atajos, ayuda, Credits y mensajes de error—, y que ningún texto
 *    que lea una persona diga ya "Weë Creator";
 *  · que los IDENTIFICADORES sigan donde estaban —la ruta `WeeCreator`, el
 *    componente, el id `creator` del menú, las colecciones `creator*` y la
 *    carpeta del servidor—, porque son rutas, imports y datos ya guardados:
 *    renombrarlos no se vería y sí rompería cosas.
 *
 * El nombre viejo puede seguir apareciendo en comentarios y en identificadores;
 * lo que no puede es llegar a la pantalla.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ruta = (p) => path.resolve(here, '../../' + p);
const leer = (p) => fs.readFileSync(ruta(p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const NUEVO = 'WEË AI';
/*
 * El nombre viejo VISIBLE lleva espacio: "Weë Creator". Pegado —`WeeCreator`,
 * `WeeCreatorScreen`— es un identificador: la ruta, el import, el componente.
 * Esa diferencia es justo la que separa lo que hay que cambiar de lo que no.
 */
const NOMBRE_VIEJO = '(Weë|WEE|Wee) Creator';

/** Todo el código del cliente: lo que se ejecuta en el teléfono y en la web. */
const cliente = [];
for (const carpeta of ['screens', 'components', 'constants', 'navigation', 'hooks', 'contexts', 'utils', 'services']) {
  for (const nombre of fs.readdirSync(ruta(carpeta), { recursive: true })) {
    const archivo = carpeta + '/' + String(nombre).replace(/\\/g, '/');
    if (/\.tsx?$/.test(archivo)) cliente.push(archivo);
  }
}

console.log('\n── A · El nombre visible es WEË AI ──');
{
  /* El menú ☰ y la barra lateral leen su etiqueta de una sola fuente. */
  const menu = leer('constants/weeMenu.ts');
  /*
   * En el MENÚ la entrada se llama "Weë AI", no "WEË AI".
   *
   * No es una excepción a la regla de la marca: es la misma regla. Las versales
   * son para cuando el área se anuncia como título —la miga de pan de sus
   * pantallas, el atajo de la hoja Crear—, y ahí siguen intactas, vigiladas por
   * las comprobaciones 2 y 3. En una lista de opciones, al lado de "Comunidades"
   * y "Guardados", es un destino más y se escribe como la marca.
   *
   * Entre el id y la etiqueta puede haber más campos —hoy el icono dibujado—.
   */
  check('1) la entrada del menú se llama Weë AI', /creator: \{ id: 'creator',[^}]*label: 'Weë AI' \}/.test(menu));
  /* Y no se ha colado el nombre viejo ni ninguna leyenda debajo. */
  check('1) sin la leyenda secundaria debajo del nombre',
    !/Tú eliges el resultado/.test(leer('components/DrawerMenu.tsx'))
    && !/creatorHint|creatorTitles/.test(leer('components/DrawerMenu.tsx')));
  check('1) y el ☰ y la barra lateral la usan tal cual', /label=\{MENU_ITEM\.creator\.label\}/.test(leer('components/Sidebar.tsx')) && /MENU_ITEM/.test(leer('components/DrawerMenu.tsx')));

  /* El marco de las pantallas: la miga de pan por defecto y el rótulo de arriba. */
  check('2) la miga de pan del marco dice WEË AI', new RegExp(`breadcrumb = '${NUEVO}'`).test(leer('components/creator/CreatorShell.tsx')));
  const conRotulo = ['screens/BrainChatScreen.tsx', 'screens/BusinessScreen.tsx', 'screens/CreatorFlowScreen.tsx', 'screens/ProjectsScreen.tsx', 'screens/WeeCreatorScreen.tsx', 'screens/WriterEditorScreen.tsx', 'screens/SpecialistScreen.tsx'];
  const sinRenombrar = conRotulo.filter((f) => !new RegExp(`🤖 ${NUEVO}`).test(leer(f)));
  check('2) y las pantallas que lo llevan encima, también', sinRenombrar.length === 0, sinRenombrar.join(' · '));

  /* Los atajos que llevan hasta ahí. */
  check('3) el atajo de la hoja Crear', new RegExp(`>${NUEVO} ›<`).test(leer('components/CreateSheet.tsx')));
  check('3) la tarjeta de la columna derecha, con su etiqueta para quien no ve',
    new RegExp(`accessibilityLabel="Abrir ${NUEVO}"`).test(leer('components/RightSidebar.tsx')) && new RegExp(`>Ir a ${NUEVO}<`).test(leer('components/RightSidebar.tsx')));
  check('3) y la barra lateral de las pantallas de IA', new RegExp(`'grid-outline', '${NUEVO}', goCreator`).test(leer('components/creator/CreatorSidebar.tsx')));

  /* Lo que se lee en Ayuda, en Credits, al fallar algo y en lo que se publica. */
  check('4) la Ayuda pregunta por WEË AI', new RegExp(`¿Cómo funciona ${NUEVO}\\?`).test(leer('screens/HelpScreen.tsx')));
  check('4) los Credits hablan de WEË AI', (leer('screens/CreditStoreScreen.tsx').match(new RegExp(NUEVO, 'g')) || []).length === 2);
  check('4) los errores del servicio, también', (leer('services/creatorService.ts').match(new RegExp(NUEVO, 'g')) || []).length === 2);
  check('4) y lo que queda escrito al publicar una creación', new RegExp(`Creado con \\$\\{nombre\\} en ${NUEVO}`).test(leer('screens/CreatorFlowScreen.tsx')));

  /* El servidor: el historial de Credits y cómo se presenta el asistente. */
  check('5) el apunte del historial de Credits dice WEË AI', new RegExp(`const description = \`${NUEVO} · `).test(leer('functions/src/creator/index.ts')));
  check('5) y el asistente no se presenta con el nombre viejo', new RegExp(`el asistente de ${NUEVO}`).test(leer('functions/src/creator/prompts.ts')));
}

console.log('\n── B · Ningún texto visible dice ya "Weë Creator" ──');
{
  /*
   * Se mira lo que puede llegar a una pantalla: cadenas entre comillas y texto
   * entre etiquetas. Los comentarios se saltan por su primera columna —hablan
   * del área, no de lo que se lee— y por eso esta prueba NO exige que el nombre
   * viejo desaparezca del código: exige que no se pinte.
   */
  const esComentario = (linea) => /^\s*(\/\/|\/\*|\*|\{\/\*|\*\/)/.test(linea);
  const VISIBLE = new RegExp(
    [`'[^']*${NOMBRE_VIEJO}[^']*'`, `"[^"]*${NOMBRE_VIEJO}[^"]*"`, '`[^`]*' + NOMBRE_VIEJO + '[^`]*`', `>[^<]*${NOMBRE_VIEJO}[^<]*<`].join('|')
  );
  const restos = [];
  for (const archivo of cliente) {
    leer(archivo).split('\n').forEach((linea, i) => {
      if (!esComentario(linea) && VISIBLE.test(linea)) restos.push(`${archivo}:${i + 1}`);
    });
  }
  check('6) ninguna pantalla, menú ni etiqueta del cliente lo dice', restos.length === 0, restos.join(' · '));

  /* Y lo mismo en lo que escribe el servidor y la persona acaba leyendo. */
  const servidor = ['functions/src/creator/index.ts', 'functions/src/creator/prompts.ts', 'functions/src/creator/templates.ts', 'functions/src/creator/brain.ts'];
  const enServidor = servidor.filter((f) => fs.existsSync(ruta(f))).filter((f) =>
    leer(f).split('\n').some((linea) => !esComentario(linea) && VISIBLE.test(linea))
  );
  check('7) ni lo que el servidor escribe para que se lea', enServidor.length === 0, enServidor.join(' · '));

  /*
   * Y el identificador tampoco se pinta. `WeeCreator` pegado vale como ruta y
   * como import —eso se queda—, pero no puede acabar leyéndose en una pantalla
   * ni anunciándose a quien no ve, así que se mira solo dónde se lee: el texto
   * entre etiquetas y las etiquetas de accesibilidad.
   */
  const PEGADO = /accessibilityLabel="[^"]*WeeCreator|accessibilityHint="[^"]*WeeCreator|>[^<{]*WeeCreator[^<]*</;
  const pintado = cliente.filter((f) => leer(f).split('\n').some((linea) => !esComentario(linea) && PEGADO.test(linea)));
  check('8) y `WeeCreator` no se pinta como texto de interfaz', pintado.length === 0, pintado.join(' · '));

  /*
   * CONTROL: la prueba sabría verlo. Si buscara mal, esta línea de mentira
   * pasaría desapercibida y el grupo entero sería decorativo.
   */
  check('8b) CONTROL: así detecta la prueba un nombre viejo visible, y no confunde la ruta con él',
    VISIBLE.test('        <Text style={styles.x}>Ir a Weë Creator</Text>') && VISIBLE.test("  label: 'Weë Creator',") &&
    !VISIBLE.test(' * Marco de las pantallas de Weë Creator.') && !VISIBLE.test("  navigation.navigate('WeeCreator');") &&
    PEGADO.test('        <Text style={styles.x}>WeeCreator</Text>') && !PEGADO.test("  navigation.navigate('WeeCreator');"));
}

console.log('\n── C · Los identificadores técnicos siguen donde estaban ──');
{
  /*
   * Renombrarlos no cambiaría nada de lo que se ve y sí rompería la navegación,
   * los imports y los datos que ya existen. Se quedan.
   */
  const pila = leer('navigation/MainStackNavigator.tsx');
  check('9) la ruta sigue llamándose WeeCreator, y sigue siendo una', (pila.match(/name="WeeCreator"/g) || []).length === 1 && /WeeCreator: \{ category\?: string \} \| undefined;/.test(pila));
  check('9) y la monta la misma pantalla de siempre', /import WeeCreatorScreen from '\.\.\/screens\/WeeCreatorScreen'/.test(pila) && /component=\{WeeCreatorScreen\}/.test(pila));
  check('10) el id del menú sigue siendo `creator`', /creator: \{ id: 'creator'/.test(leer('constants/weeMenu.ts')));
  check('11) las colecciones y la ruta del Storage no se tocan',
    /creatorJobs/.test(leer('firestore.rules')) && /creatorProjects/.test(leer('firestore.rules')) && /creatorInterests/.test(leer('firestore.rules')) && /creator-inputs/.test(leer('storage.rules')));
  check('12) y el servidor sigue en functions/src/creator', fs.existsSync(ruta('functions/src/creator/index.ts')) && /creatorChat|creatorRun/.test(leer('functions/src/index.ts')));
}

console.log('\n── D · Una sola experiencia, sin duplicados ──');
{
  const pila = leer('navigation/MainStackNavigator.tsx');
  const menu = leer('constants/weeMenu.ts');
  check('13) una sola pantalla para esta área', fs.readdirSync(ruta('screens')).filter((f) => /^Wee.*Creator.*Screen\.tsx$|^WeeAi.*Screen\.tsx$|^WeeAI.*Screen\.tsx$/i.test(f)).length === 1);
  check('14) una sola ruta, y ninguna nueva con el nombre nuevo', (pila.match(/name="WeeCreator"/g) || []).length === 1 && !/name="WeeAi"|name="WeeAI"|name="WeeAiScreen"/i.test(pila));
  check('15) una sola entrada de menú para el área', (menu.match(/^\s*creator: \{ id: 'creator'/gm) || []).length === 1 && !/weeAi|wee_ai|weeai/i.test(menu));
  /* Y las once experiencias siguen siendo once: WEË AI no es una más. */
  const experiencias = leer('constants/weeExperiences.ts');
  const cuantas = (experiencias.match(/^ {4}id: '/gm) || []).length;
  check('16) las experiencias siguen siendo once', cuantas === 11, String(cuantas));
  check('16) y ninguna de ellas se llama WEË AI', !new RegExp(`name: '${NUEVO}'`).test(experiencias) && !/WEË AI/.test(experiencias));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWEË AI por delante; `creator` por detrás, intacto');
process.exit(failures ? 1 : 0);
