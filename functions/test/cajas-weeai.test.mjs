/*
 * EN WEË AI, LA CAJA DONDE SE ESCRIBE CRECE SOLA Y NUNCA PIERDE SUS BOTONES.
 *
 * Decisión de producto (2026-09-15): en todas las secciones de Weë AI —las que
 * ya están y las que vengan— la caja donde se escribe un prompt crece con el
 * texto hasta llenar lo que se ve de la página; ahí deja de crecer, el texto se
 * desplaza dentro y su fila de botones (enviar, crear, adjuntar, ajustes…)
 * sigue siempre a la vista. No hay "Abrir editor" ni otra pantalla a la que ir
 * para terminar de escribir.
 *
 * La regla vive en una sola pieza, `components/creator/CajaQueCrece.tsx`:
 * `PaginaDeCajas` para la página y `useCajaQueCrece` para cada caja.
 *
 * Lo que se rompe aquí se rompe en silencio —nadie ve un error, simplemente la
 * caja de una sección nueva no crece o se come sus botones—, así que se vigilan
 * cuatro cosas, cada grupo con su control:
 *
 *  A. que la pieza haga lo que promete;
 *  B. que las páginas de Weë AI la usen, empezando por `CreatorShell`, que es
 *     la página de todas las secciones y de las que se monten mañana sobre él;
 *  C. el INVENTARIO: ningún campo de texto de Weë AI se queda fuera, salvo las
 *     excepciones listadas con su motivo;
 *  D. que "Abrir editor" no vuelva.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const PIEZA = 'components/creator/CajaQueCrece.tsx';

console.log('\n─── A. La pieza hace lo que promete ───');

const pieza = leer(PIEZA);
check('1) existen la página y el hook', /export const PaginaDeCajas\b/.test(pieza) && /export const useCajaQueCrece\b/.test(pieza));
check('2) el campo es de varias líneas', /multiline:\s*true/.test(pieza));
check('3) mientras cabe, crece; solo lleno se desplaza por dentro', /scrollEnabled:\s*llena/.test(pieza) && /const llena = altoContenido > tope/.test(pieza));
check('4) el tope es lo que se ve menos lo que la caja lleva además del texto', /altoDisponible - cromo/.test(pieza));
check('5) lo que la caja lleva además del texto se mide, no se suma a mano', /layout\.height - altoPintado\.current/.test(pieza));
check('6) la página baja hasta los botones midiendo en pantalla', /measureInWindow/.test(pieza) && /scrollTo\(\{ y: desplazado\.current \+ sobra/.test(pieza));
check('7) solo se mueve la página mientras se escribe en esa caja', /if \(enfocada\.current\) mantenerALaVista/.test(pieza));
check('8) la página respeta el onScroll de quien la usa (la barra que se esconde)', /onScroll\?\.\(e\)/.test(pieza) && /onLayout\?\.\(e\)/.test(pieza));

/* CONTROL: una versión con tope fijo y sin desplazamiento interno tiene que caer. */
const falsaPieza = pieza.replace(/scrollEnabled:\s*llena/, 'scrollEnabled: false').replace(/altoDisponible - cromo/, '120');
check('CONTROL: una caja con tope fijo sería detectada',
  !(/scrollEnabled:\s*llena/.test(falsaPieza) && /altoDisponible - cromo/.test(falsaPieza)),
  'si esto pasara, el grupo A no protegería nada');

console.log('\n─── B. Las páginas de Weë AI la usan ───');

const shell = leer('components/creator/CreatorShell.tsx');
/*
 * TRES, no dos, desde que Weë Brain ancla su caja abajo (2026-09-16): la de
 * escritorio, la de móvil sin pie y la de móvil con pie. Las tres son
 * `PaginaDeCajas`; ninguna es un ScrollView pelado.
 */
check('9) CreatorShell usa PaginaDeCajas en todas sus ramas', (shell.match(/<PaginaDeCajas\b/g) || []).length === 3);
/*
 * Ningún ScrollView propio: todas son `PaginaDeCajas`. El tipo en un `useRef`
 * —`useRef<ScrollView>(null)`, para poder bajar la página al final— no es una
 * etiqueta, así que no cuenta: se quita antes de mirar.
 */
check('9) y no le queda ningún ScrollView propio',
  !/<ScrollView\b/.test(shell.replace(/useRef<ScrollView>/g, 'useRef<>')));
check('10) la de móvil sigue dentro de EspacioDeEscritura', /<EspacioDeEscritura[\s\S]{0,600}?<PaginaDeCajas/.test(shell));
check('10) y sigue avisando a la barra al desplazarse', /<PaginaDeCajas[^>]*\{\.\.\.scrollDeBarra\}/.test(shell));
for (const p of ['screens/StudioScreen.tsx', 'screens/DesignScreen.tsx']) {
  const src = leer(p);
  check(`11) ${p} usa PaginaDeCajas dentro de EspacioDeEscritura`,
    /<EspacioDeEscritura[^>]*>\s*<PaginaDeCajas/.test(src) && !/<ScrollView\b/.test(src));
}

console.log('\n─── C. Inventario: ningún campo de Weë AI se queda fuera ───');

/*
 * Las superficies de Weë AI: los componentes de sus carpetas y toda pantalla que
 * se monte sobre `CreatorShell` —así una sección nueva entra sola en la lista—,
 * más Weë Studio y Weë Design, que tienen página propia.
 */
const tsxDe = (dir) =>
  existe(dir) ? fs.readdirSync(path.resolve(RAIZ, dir)).filter((f) => f.endsWith('.tsx')).map((f) => `${dir}/${f}`) : [];
const pantallas = fs
  .readdirSync(path.resolve(RAIZ, 'screens'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => `screens/${f}`)
  .filter((p) => /<CreatorShell\b/.test(leer(p)));
const superficies = [
  ...tsxDe('components/creator'),
  ...tsxDe('components/studio'),
  ...tsxDe('components/design'),
  ...pantallas,
  'screens/StudioScreen.tsx',
  'screens/DesignScreen.tsx',
]
  .filter((p, i, todas) => todas.indexOf(p) === i && p !== PIEZA)
  .map((rel) => ({ rel, src: leer(rel) }))
  .filter((x) => /<TextInput\b/.test(x.src));

/* Campos que NO son una caja de prompt. Cada uno con su motivo. */
const NO_SON_PROMPT = {
  'components/creator/ProjectPicker.tsx': 'nombre de un proyecto nuevo: una línea, no un prompt',
  'screens/ProjectsScreen.tsx': 'nombre de un proyecto nuevo: una línea, no un prompt',
  'screens/ProjectScreen.tsx': 'renombrar un proyecto: una línea, no un prompt',
  'screens/WeeCreatorScreen.tsx': 'buscador de la portada de Weë AI: filtra experiencias mientras se escribe',
  'screens/WriterEditorScreen.tsx': 'editor de documentos de Weë Writer: el documento ya es la pantalla entera',
  // `components/studio/PromptEditor.tsx` estaba aquí como «editor a pantalla completa retirado: no se monta en ninguna
  // pantalla». Retirado del todo como código muerto en el cierre post-auditoría (2026-10-01): sin archivo no hay campo
  // que eximir, y la 18 sigue impidiendo que una pantalla vuelva a montar un editor así (CLAUDE.md §9).
};

/* La caja del diseño común, o el hook entero para quien todavía pinta la suya. */
const usaElDisenoComun = (src) => /<CajaDePrompt\b/.test(src);
const usaElHookEntero = (src) =>
  /useCajaQueCrece\(/.test(src) &&
  /ref=\{\s*\w+\.refCaja\s*\}/.test(src) &&
  /onLayout=\{\s*\w+\.alMedirCaja\s*\}/.test(src) &&
  /\{\.\.\.\w+\.propsDelCampo\}/.test(src) &&
  /height:\s*\w+\.altoDelTexto/.test(src);
const usaLaPieza = (src) => usaElDisenoComun(src) || usaElHookEntero(src);

check('12) el inventario encuentra las cajas de hoy', superficies.length >= 6, `${superficies.length} superficies con campos`);

const fuera = superficies.filter((x) => !usaLaPieza(x.src) && !(x.rel in NO_SON_PROMPT));
check('13) toda caja de prompt de Weë AI crece y guarda sus botones', fuera.length === 0,
  fuera.length ? fuera.map((x) => x.rel).join(', ') : 'todas');

/*
 * Un solo diseño para todas: la lámina de Weë Studio y Weë Design es también la
 * de Weë Chef, Weë Music, Weë Business (las tres comparten `IdeaBox`) y Weë
 * Travel (decisión del usuario, 2026-09-15). Y desde el 2026-09-16, también la
 * de Weë Brain, que era la última que pintaba la suya: ya no queda ninguna
 * fuera (CLAUDE.md §10).
 */
check('14) la caja del diseño usa el hook entero', usaElHookEntero(leer('components/creator/CajaDePrompt.tsx')));
for (const rel of [
  'components/creator/IdeaBox.tsx',
  'components/creator/TravelLauncher.tsx',
  'components/studio/StudioPromptComposer.tsx',
  'screens/BrainChatScreen.tsx',
]) {
  check(`14) ${rel} usa la caja del diseño común`, usaElDisenoComun(leer(rel)));
}
/* Y Weë Brain ya no tiene su propio campo: la caja es la de todas. */
check('14) screens/BrainChatScreen.tsx ya no pinta su caja', !/<TextInput\b/.test(leer('screens/BrainChatScreen.tsx')));

/*
 * Y los diseños antiguos no vuelven: ninguna de las dos vuelve a pintarse su
 * propio campo ni su píldora de una línea con el botón al lado (`filaEntrada` en
 * Travel, `inputRow` en la caja de idea).
 */
for (const rel of ['components/creator/IdeaBox.tsx', 'components/creator/TravelLauncher.tsx']) {
  const src = leer(rel);
  check(`14) ${rel} ya no tiene su caja antigua`, !/<TextInput\b/.test(src) && !/\b(filaEntrada|inputRow)\b/.test(src));
}

/*
 * Y dentro de una creación ya no se escribe: las dos cajas que había —la
 * respuesta con palabras propias y "¿Qué cambiamos?"— se retiraron (decisión
 * del usuario, 2026-09-15). Se contesta eligiendo y se ajusta con un toque.
 */
for (const rel of ['components/creator/GuidedQuestion.tsx', 'components/creator/ResultCard.tsx']) {
  check(`14) ${rel} ya no tiene caja de texto`, !/<TextInput\b/.test(leer(rel)));
}

/* Las excepciones tienen que seguir existiendo y seguir teniendo campo: si no, sobran. */
const fantasmas = Object.keys(NO_SON_PROMPT).filter((rel) => !superficies.some((x) => x.rel === rel));
check('15) la lista de excepciones no tiene fantasmas', fantasmas.length === 0, fantasmas.join(', ') || 'todas siguen ahí');

/* CONTROL: una sección nueva con un campo suelto TIENE que caer. */
const nueva = { rel: 'screens/SeccionNuevaDeWeeAI.tsx', src: '<CreatorShell><TextInput value={x} /></CreatorShell>' };
check('CONTROL: una sección nueva con un campo suelto sería detectada',
  !usaLaPieza(nueva.src) && !(nueva.rel in NO_SON_PROMPT),
  'si esto pasara, el inventario no protegería nada');

console.log('\n─── D. "Abrir editor" no vuelve ───');

const compositor = leer('components/studio/StudioPromptComposer.tsx');
check('16) la caja de Studio y Design no ofrece editor', !/onAbrirEditor|openEditor|Abrir editor/.test(compositor));
for (const idioma of ['es', 'en']) {
  check(`17) no quedan textos de "Abrir editor" en ${idioma}`, !/openEditor/.test(leer(`i18n/textos/${idioma}/studio.ts`)));
}
const pantallasQueMontanElEditor = fs
  .readdirSync(path.resolve(RAIZ, 'screens'))
  .filter((f) => f.endsWith('.tsx') && /import PromptEditor\b/.test(leer(`screens/${f}`)));
check('18) ninguna pantalla monta el editor a pantalla completa', pantallasQueMontanElEditor.length === 0,
  pantallasQueMontanElEditor.join(', ') || 'ninguna');

/* CONTROL: si el enlace volviera, se vería. */
check('CONTROL: un "Abrir editor" de vuelta sería detectado', /onAbrirEditor/.test(compositor + '\n onAbrirEditor={abrir}'));

console.log('\n─── E. El teclado, el volver y el aire ───');

/*
 * Cuatro decisiones de trato (2026-09-15), cada una porque se vio fallar en un
 * teléfono de verdad: el botón de una hoja debajo de la barra del sistema, el
 * gesto de atrás saliéndose de la sección con lo escrito dentro, el aviso de
 * "Creando…" detrás del teclado y la caja pegada a él.
 */
/*
 * La hoja de ajustes es UNA (B3.10): `AjustesContextuales`. Había dos —esta y
 * `studio/PromptSettings`, que era la misma hoja con otro catálogo— y para usar
 * la segunda Weë Design tenía que decir que estaba en el área "imágenes" del
 * Studio, que no es verdad. Se quedó la que ya sabía de contextos, de lo
 * sugerido y de cuántas referencias viajan.
 */
const ajustes = leer('components/creator/AjustesContextuales.tsx');
check('19) la hoja de ajustes reserva la zona segura, como la hoja de Crear',
  /Math\.max\(insets\.bottom, SPACING\.lg\)/.test(ajustes) && /useSafeAreaInsets/.test(ajustes));
check('19) y la de Crear sigue siendo el patrón que copia',
  /Math\.max\(insets\.bottom, SPACING\.lg\)/.test(leer('components/CreateSheet.tsx')));

const espacio = leer('components/EspacioDeEscritura.tsx');
check('20) el acomodo del teclado sabe descontar lo que la pantalla ya reserva',
  /descuento = 0/.test(espacio) && /Math\.max\(alturaTeclado - descuento, 0\)/.test(espacio));
/*
 * Y cada página descuenta lo que YA tiene reservado abajo: el sitio de la barra
 * inferior. Al salir el teclado ese hueco queda debajo de él y ya no protege
 * nada, así que se descuenta y el contenido acaba justo sobre el teclado.
 *
 * Vale igual con la caja dentro de la página y con la caja anclada —Weë Brain—:
 * allí quien guarda el sitio de la barra es el pie, y por eso el pie lo suelta
 * mientras hay teclado. Probado en teléfono el 2026-09-16: con el descuento a 0
 * quedaban 60 puntos de franja muerta entre la caja y el teclado.
 */
check('20) y las páginas de Weë AI descuentan la barra inferior',
  /descuento=\{ALTO_BARRA\}/.test(leer('components/creator/CreatorShell.tsx'))
  && ['screens/StudioScreen.tsx', 'screens/DesignScreen.tsx'].every((p) => /descuento=\{isDesktop \? 0 : ALTO_BARRA\}/.test(leer(p))));
/*
 * Y el pie anclado no le guarda sitio a la barra de abajo: esa barra no flota
 * encima, ocupa el suyo, y lo que le queda a la sección termina donde empieza
 * ella. Reservárselo dejaba la caja flotando con una franja blanca debajo
 * (visto en el teléfono, 2026-09-16).
 */
check('20b) el pie anclado no le guarda sitio a la barra de abajo',
  /pie: \{\s*paddingHorizontal: SPACING\.lg,\s*paddingTop: SPACING\.sm,\s*paddingBottom: SPACING\.sm,/
    .test(leer('components/creator/CreatorShell.tsx')));

/* Atrás deshace un paso dentro de la sección; nunca se lleva lo escrito. */
const atrasDevuelveTrue = (src) => /BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{[\s\S]{0,200}return true;/.test(src);
const studio = leer('screens/StudioScreen.tsx');
const design = leer('screens/DesignScreen.tsx');
const especialista = leer('screens/SpecialistScreen.tsx');
check('21) en el Studio, atrás cierra el panel', atrasDevuelveTrue(studio) && /setPanel\(null\);\s*\n\s*return true;/.test(studio));
check('21) en Design, atrás deshace un paso del camino', atrasDevuelveTrue(design) && /volver\(\);\s*\n\s*return true;/.test(design));
check('21) y Design recuerda por dónde se entró', /const \[camino, setCamino\]/.test(design) && /onVolver=\{volver\}/.test(design) && /onAbrirCategoria=\{abrir\}/.test(design));
check('21) en Weë Travel, atrás pliega las herramientas antes de salir',
  atrasDevuelveTrue(especialista) && /setHerramientasAbiertas\(false\);\s*\n\s*return true;/.test(especialista));
check('21) y ninguno reinicia lo escrito al volver',
  !/setPrompt\(''\)/.test(studio) && !/setPrompt\(''\)/.test(design));

/* Y hay un volver a la vista, en el mismo sitio, en todas las secciones. */
const cabecera = leer('components/creator/CabeceraDeSeccion.tsx');
check('22) la cabecera de sección lleva su volver, con la clave de siempre',
  /accessibilityLabel=\{t\('common\.back'\)\}/.test(cabecera) && /name="arrow-back"/.test(cabecera));
check('22) y no deja a nadie encerrado si no hay atrás',
  /navigation\.canGoBack\(\) \? navigation\.goBack\(\) : navigation\.navigate\('Main'\)/.test(cabecera));

/* El estado de la creación se ve siempre: sube con el teclado, que además se va al enviar. */
for (const [rel, src] of [['screens/StudioScreen.tsx', studio], ['screens/DesignScreen.tsx', design]]) {
  check(`23) ${rel} sube el aviso con el teclado`,
    /<AvisoDeCreacion[\s\S]{0,120}bottom=\{SITIO_DE_LA_BARRA \+ alturaTeclado\}/.test(src) && /useAlturaDelTeclado/.test(src));
}
/*
 * El aviso también es UNO desde B3.10 (`components/creator/AvisoDeCreacion.tsx`):
 * antes estaba copiado renglón por renglón en las dos pantallas. Así que la
 * comprobación se parte en dos mitades, que juntas dicen lo mismo que antes
 * decía una: que cada pantalla le pasa la altura con el teclado sumado, y que
 * el aviso de verdad flota encima en lugar de ir dentro de la lista.
 */
const aviso = leer('components/creator/AvisoDeCreacion.tsx');
check('23) y el aviso flota encima, a la altura que le dan',
  /position: 'absolute'/.test(aviso) && /borderColor: theme\.colors\.border, bottom \}/.test(aviso));
/* Y no deja de decir que todavía no hay nada generado de verdad. */
check('23) y sigue avisando de que es una demostración',
  /clavePista = 'studio\.readyHint'/.test(aviso));
check('23) y al enviar el teclado se retira', /Keyboard\.dismiss\(\);\s*\n\s*onEnviar\(\);/.test(leer('components/creator/CajaDePrompt.tsx')));

/* CONTROL: sin el `return true`, atrás volvería a llevarse la sección. */
check('CONTROL: un atrás que no se queda el gesto sería detectado',
  !atrasDevuelveTrue("BackHandler.addEventListener('hardwareBackPress', () => { setPanel(null); return false; })"),
  'si esto pasara, el grupo E no protegería nada');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nLas cajas de Weë AI crecen solas y sus botones no se van');
process.exit(failures ? 1 : 0);
