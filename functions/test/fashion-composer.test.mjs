/**
 * WEË FASHION v0 — LA SECCIÓN SEIS, SU COMPOSER Y LO QUE NO SE TOCÓ.
 *
 * Qué fija esta suite (todo local, sin red, sin proveedores, sin coste):
 *
 *   A  las seis secciones de Weë AI: Studio, Travel, Music, Chef, Design y Fashion. Business ya no es una; su id se
 *      resuelve a Fashion SOLO en el registro de experiencias.
 *   B  el directorio independiente de negocios (WeeBiz) sigue entero: archivos, rutas, reglas y servicio, sin una
 *      palabra «fashion» dentro y sin pasar por el alias.
 *   C  los seis modos del Composer, como datos: cada uno con su nombre, su descripción, sus materiales y sus
 *      opciones, todo en CLAVES de i18n que existen en los 16 idiomas.
 *   D  honestidad: la generación de imagen sigue cerrada (`FASHION_IMAGEN_VALIDADA = false`), el Composer no llama
 *      a ninguna API ni abre ningún flujo de imagen, y solo la orientación de texto sale por Weë Brain.
 *   E  la lógica pura (elecciones, intención estructurada, presets que el día de mañana abrirían el flujo de imagen
 *      con ids que EXISTEN en las plantillas del servidor, el brief y la puerta de Studio).
 *   F  el servidor: Brain deja de recomendar Weë Business; Beauty sigue con su id y se presenta como Weë Fashion.
 *   G  accesibilidad y textos: nada escrito a mano en los componentes, todo botón con rol, ninguna imagen remota.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` — ${evidencia}` : ''}\n`); };
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const cargarTs = async (rel) => {
  const js = ts.transpileModule(leer(rel), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};

const EXP = await cargarTs('constants/weeExperiences.ts');
const MODOS = await cargarTs('constants/fashionModes.ts');
const BRIEF = await cargarTs('utils/fashionBrief.ts');
const workspaces = leer('constants/weeWorkspaces.ts');

/* ── A · las seis secciones ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const lista = (workspaces.match(/export const WORKSPACES: readonly WorkspaceId\[\] = \[([^\]]*)\]/) || [, ''])[1].replace(/['\s]/g, '').split(',');
check('A1 los lugares de trabajo son exactamente seis: studio, design, travel, chef, fashion, music', lista.sort().join(',') === 'chef,design,fashion,music,studio,travel', lista.join(','));
check('A2 Business no es un lugar de trabajo de Weë AI', !/'business'/.test(sinComentarios(workspaces)));
const visibles = EXP.WEE_EXPERIENCES.map((e) => e.id);
check('A3 las secciones visibles de Weë AI (menú ☰ y barra lateral) son Brain y las seis; Fashion está y Business no',
  visibles.includes('fashion') && !visibles.includes('business') && visibles.filter((id) => id !== 'brain').sort().join(',') === 'chef,design,fashion,music,studio,travel', visibles.join(','));
const fashion = EXP.getExperienceById('fashion');
check('A4 Weë Fashion: nombre de marca sin traducir, emoji 👗, icono propio y descripción por clave', fashion?.name === 'Weë Fashion' && fashion.emoji === '👗' && fashion.icono === 'vestido' && fashion.claveDescripcion === 'creator.fashion');
check('A5 «business» se resuelve a Fashion (alias controlado) y los demás ids no cambian', EXP.getExperienceById('business')?.id === 'fashion' && EXP.getExperienceById('beauty')?.id === 'beauty' && EXP.getExperienceById('chef')?.id === 'chef');
check('A6 el alias está declarado en un solo sitio y dice a dónde va', JSON.stringify(EXP.EXPERIENCIAS_RETIRADAS) === '{"business":"fashion"}');
check('A7 Business no se puede buscar: «negocio» ya no lleva a ninguna sección de Weë AI y «ropa» sí lleva a Fashion',
  !EXP.matchExperiences('plan de negocio y marketing').some((e) => e.id === 'business') && EXP.matchExperiences('quiero ropa y un vestido').some((e) => e.id === 'fashion'));
check('A8 Beauty vive dentro de Fashion (mismo id, otro lugar) y no es una séptima sección',
  /beauty: 'fashion'/.test(workspaces) && !visibles.includes('beauty') && EXP.EXPERIENCE_AREA.beauty.section === 'fashion');
check('A9 el menú ☰ y la pastilla del muro leen «Weë Fashion» (id técnico del muro intacto)',
  /\{ id: 'business', label: 'Weë Fashion' \}/.test(leer('utils/feedFilters.ts')) && /business: 'Weë Fashion'/.test(leer('utils/sectionFeed.ts')) && /business: \['Weë Business'\]/.test(leer('utils/sectionFeed.ts')));

/* ── B · WeeBiz, el directorio independiente, intacto ───────────────────────────────────────────────────────────────────────── */
const WEEBIZ = ['screens/WeeBizScreen.tsx', 'screens/WeeBizProfileScreen.tsx', 'screens/WeeBizRegisterScreen.tsx', 'screens/WeeBizProductsScreen.tsx', 'screens/WeeBizCategoryScreen.tsx', 'services/weeBizService.ts', 'constants/weebizCategories.ts'];
check('B1 los cinco pantallas, el servicio y las categorías de WeeBiz siguen existiendo', WEEBIZ.every(existe), WEEBIZ.filter((f) => !existe(f)).join(', '));
check('B2 ninguno de ellos importa el registro de Weë AI ni el alias, y ninguno dice «fashion»',
  WEEBIZ.every((f) => { const c = sinComentarios(leer(f)); return !/EXPERIENCIAS_RETIRADAS|weeExperiences|fashionModes/.test(c) && !/fashion/i.test(c); }));
check('B3 las rutas de WeeBiz siguen declaradas', ['WeeBizProfile', 'WeeBizRegister', 'WeeBizProducts'].every((r) => leer('navigation/MainStackNavigator.tsx').includes(r + ':')));
check('B4 las reglas de la colección businesses siguen en firestore.rules', /match \/businesses\/\{/.test(leer('firestore.rules')));
check('B5 el módulo de textos de WeeBiz sigue en los 16 idiomas', fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((l) => existe(`i18n/textos/${l}/index.ts`)).every((l) => existe(`i18n/textos/${l}/weebiz.ts`)));
check('B6 el atajo «mi negocio» del menú sigue llevando a WeeBiz', /weeBizService/.test(leer('components/DrawerMenu.tsx')));

/* ── C · los seis modos, como datos ─────────────────────────────────────────────────────────────────────────────────────────── */
const es = fs.readFileSync(path.join(RAIZ, 'i18n/textos/es/fashion.ts'), 'utf8');
const clavesEs = new Set([...es.matchAll(/^  (\w+): '/gm)].map((m) => m[1]));
const ids = MODOS.FASHION_MODOS.map((m) => m.id);
check('C1 son seis modos y son los acordados', ids.join(',') === 'tryOn,beautyHair,completeLook,designGarments,catalogCampaign,fashionContent', ids.join(','));
const clavesUsadas = new Set();
const tomar = (c) => { if (typeof c === 'string' && c.startsWith('fashion.')) clavesUsadas.add(c.slice(8)); };
for (const m of MODOS.FASHION_MODOS) {
  [m.claveTitulo, m.claveDescripcion, m.claveBrief].forEach(tomar);
  m.materiales.forEach((x) => { tomar(x.claveTitulo); tomar(x.claveAyuda); });
  m.grupos.forEach((g) => { tomar(g.claveTitulo); g.opciones.forEach((o) => tomar(o.clave)); });
  m.avisos.forEach((a) => tomar(`fashion.${a}`));
}
check('C2 cada texto de cada modo existe en el diccionario español', [...clavesUsadas].every((k) => clavesEs.has(k)), [...clavesUsadas].filter((k) => !clavesEs.has(k)).join(', '));
check('C3 cada modo tiene al menos un grupo de opciones, una referencia opcional como máximo por modo y ninguna opción repetida',
  MODOS.FASHION_MODOS.every((m) => m.grupos.length >= 1 && m.grupos.every((g) => new Set(g.opciones.map((o) => o.id)).size === g.opciones.length)));
check('C4 los modos de ropa y de belleza piden la foto de la persona; los de creación, no',
  ['tryOn', 'beautyHair', 'completeLook'].every((i) => MODOS.modoDeFashion(i).materiales.some((x) => x.id === 'persona' && x.obligatorio))
  && ['designGarments', 'catalogCampaign', 'fashionContent'].every((i) => !MODOS.modoDeFashion(i).materiales.some((x) => x.obligatorio)));
check('C5 probar ropa pide además la foto de la prenda', MODOS.modoDeFashion('tryOn').materiales.some((x) => x.id === 'prenda' && x.obligatorio));
/* En todos los idiomas, las mismas claves y los mismos huecos que el español. */
const idiomas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((l) => existe(`i18n/textos/${l}/fashion.ts`));
const huecos = (s) => (s.match(/\{\{\w+\}\}/g) || []).sort().join(',');
const valoresDe = (rel) => Object.fromEntries([...leer(rel).matchAll(/^  (\w+): '((?:[^'\\]|\\.)*)',$/gm)].map((m) => [m[1], m[2]]));
const vEs = valoresDe('i18n/textos/es/fashion.ts');
const malos = idiomas.flatMap((l) => { const v = valoresDe(`i18n/textos/${l}/fashion.ts`); return Object.keys(vEs).filter((k) => !(k in v) || huecos(v[k]) !== huecos(vEs[k]) || !v[k].trim()).map((k) => `${l}:${k}`); });
check(`C6 los ${idiomas.length} idiomas tienen todas las claves, ninguna vacía y con los mismos huecos`, idiomas.length === 16 && malos.length === 0, malos.slice(0, 5).join(', '));
check('C7 «Weë Fashion» no se traduce en ningún idioma (ni «Weë Moda», «Weë Mode», «Weë Mode»…)',
  idiomas.every((l) => !/Weë (Moda|Mode|Mode\b|Мода|ファッション|패션|时尚|時尚|फ़ैशन)/u.test(leer(`i18n/textos/${l}/fashion.ts`) + leer(`i18n/textos/${l}/creator.ts`))));
check('C8 la palabra «Reel» (marca ajena) no aparece en ningún idioma: los vídeos cortos de Weë son Weëls',
  idiomas.every((l) => !/\bReel\b/.test(leer(`i18n/textos/${l}/fashion.ts`))));

/* ── D · honestidad ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const composer = sinComentarios(leer('components/fashion/FashionComposer.tsx'));
const pantalla = sinComentarios(leer('screens/FashionScreen.tsx'));
check('D1 la generación de imagen sigue CERRADA: un solo interruptor, y vale false', MODOS.FASHION_IMAGEN_VALIDADA === false && (leer('constants/fashionModes.ts').match(/export const FASHION_IMAGEN_VALIDADA = /g) || []).length === 1);
check('D2 el Composer no abre ningún flujo de imagen: ni CreatorFlow, ni creatorService, ni generación', !/CreatorFlow|creatorService|creatorRun|creatorChat|generateVideo|generateImage|imageService/.test(composer + pantalla));
check('D3 ni habla con ninguna API ni lleva claves: ni fetch, ni axios, ni URLs, ni proveedores', !/\bfetch\(|axios|https?:\/\/|gemini|flux|seedream|seedance|elevenlabs|openai|anthropic|deepseek/i.test(composer + pantalla + sinComentarios(leer('components/fashion/SlotDeImagen.tsx')) + sinComentarios(leer('constants/fashionModes.ts'))));
check('D4 la orientación de texto es Weë Brain (el hook de siempre), con su aviso de demostración y su consumo de Credits',
  /useBrainChat\(\)/.test(composer) && /ultima\.demo/.test(composer) && /fashion\.statusDemo/.test(composer) && /fashion\.adviceFree/.test(composer) && /fashion\.adviceCost/.test(composer));
check('D5 el aviso «pendiente de validación» se pinta mientras el interruptor esté cerrado', /FASHION_IMAGEN_VALIDADA/.test(composer) && /fashion\.statusImageHelp/.test(composer));
check('D6 las imágenes elegidas no se suben ni se guardan: ni creatorUploads, ni Storage, ni AsyncStorage de URIs; el borrador solo lleva texto y elecciones',
  !/creatorUploads|uploadCreatorImage|firebase.storage|getStorage|uploadBytes/i.test(composer + sinComentarios(leer('components/fashion/SlotDeImagen.tsx')))
  && /JSON\.stringify\(\{ texto: texto\.trim\(\)\.slice\(0, 300\), sel \}\)/.test(composer));
check('D7 un resultado de muestra se muestra como Demostración y sin consumo: el texto, la prueba de Brain que ya cierra el cobro (brain-demo-no-cobra), están en la cadena',
  /brain-demo-no-cobra\.test\.mjs/.test(JSON.parse(leer('functions/package.json')).scripts.test) && existe('functions/test/brain-demo-no-cobra.test.mjs'));
check('D8 el Composer avisa de la identidad, del diseño y del consentimiento donde corresponde (fotos de terceros no se «autorizan»: se avisa)',
  MODOS.modoDeFashion('tryOn').avisos.includes('noteIdentity') && MODOS.modoDeFashion('tryOn').avisos.includes('noteConsent') && MODOS.modoDeFashion('designGarments').avisos.includes('noteDesign'));

/* ── E · lógica pura ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const { alternarOpcion, hayEleccion, SELECCION_VACIA, materialesQueFaltan, crearIntencion, presetsDeImagen, modoDeStudio, modoDeFashion } = MODOS;
let s = alternarOpcion(SELECCION_VACIA, 'garment', 'dress');
check('E1 elegir una opción la marca; otra del mismo grupo la sustituye; tocarla de nuevo la quita',
  s.elegidas.garment[0] === 'dress' && alternarOpcion(s, 'garment', 'shoes').elegidas.garment.join() === 'shoes' && !('garment' in alternarOpcion(s, 'garment', 'dress').elegidas));
check('E2 «No sé, ayúdame a elegir» cuenta como elección y no obliga a nada más', hayEleccion({ elegidas: {}, idk: true }) && !hayEleccion(SELECCION_VACIA));
check('E3 los materiales que faltan son los obligatorios sin imagen', materialesQueFaltan(modoDeFashion('tryOn'), { persona: true }).join() === 'prenda' && materialesQueFaltan(modoDeFashion('designGarments'), {}).length === 0);
const intencion = crearIntencion(modoDeFashion('tryOn'), s, '  un vestido negro  ', { persona: true });
check('E4 la intención es estructurada: modo, texto recortado, elecciones, materiales con su clase, experiencia de imagen futura y lugar «fashion»',
  intencion.modo === 'tryOn' && intencion.texto === 'un vestido negro' && intencion.materiales[0].clase === 'fotoDeLaPersona' && intencion.experienciaDeImagen === 'beauty' && intencion.workspace === 'fashion');
const plantillas = require(path.join(RAIZ, 'functions/lib/creator/templates.js')).TEMPLATES;
const existeEnServidor = (exp, p) => { const q = plantillas[exp].questions.find((x) => x.id === p.questionId); return !!q && (q.options || []).some((o) => o.id === p.optionId); };
const casos = [['tryOn', { garment: ['dress'], occasion: ['party'] }], ['beautyHair', { change: ['makeup'], occasion: ['work'] }], ['beautyHair', { change: ['hair'] }], ['completeLook', { occasion: ['date'] }],
  ['designGarments', { output: ['garment'], style: ['elegant'] }], ['designGarments', { style: ['casual'] }], ['catalogCampaign', { output: ['campaign'] }], ['catalogCampaign', { output: ['catalog'] }], ['fashionContent', { output: ['story'] }], ['fashionContent', { output: ['reel'] }]];
const sinSitio = casos.flatMap(([m, e]) => presetsDeImagen(m, e).filter((p) => !existeEnServidor(modoDeFashion(m).experienciaDeImagen, p)).map((p) => `${m}:${p.questionId}=${p.optionId}`));
check('E5 todo preset que abriría el flujo de imagen existe en la plantilla REAL del servidor (beauty o design): no se inventó ningún texto', sinSitio.length === 0, sinSitio.join(', '));
check('E6 los presets del modo de ropa piden un outfit y los del look completo, una transformación',
  presetsDeImagen('tryOn', {})[0].optionId === 'outfit' && presetsDeImagen('completeLook', {})[0].optionId === 'transform');
const estudio = fs.readFileSync(path.join(RAIZ, 'constants/studioExperiences.ts'), 'utf8');
const idsDe = (nombre) => [...((estudio.match(new RegExp(`export const ${nombre}[^=]*= \\[([\\s\\S]*?)\\n\\];`)) || [, ''])[1]).matchAll(/x\('(\w+)'/g)].map((m) => m[1]);
const deStudio = [...idsDe('EXPERIENCIAS_DE_BEAUTY'), ...idsDe('EXPERIENCIAS_DE_FASHION')];
const modosValidos = new Set(ids);
check('E7 cada experiencia de las puertas Beauty y Fashion de Studio abre un modo válido del Composer', deStudio.length === 8 && deStudio.every((e) => modosValidos.has(modoDeStudio(e, 'beauty'))), deStudio.join(','));
check('E8 el mapa de Studio es el esperado: maquillaje/cabello → beautyHair; outfit/probador → tryOn; look/estilismo → completeLook',
  modoDeStudio('makeup', 'beauty') === 'beautyHair' && modoDeStudio('tryOn', 'fashion') === 'tryOn' && modoDeStudio('styling', 'fashion') === 'completeLook' && modoDeStudio(undefined, 'beauty') === 'beautyHair' && modoDeStudio(undefined, 'fashion') === 'tryOn');
const fakeT = (clave, v = {}) => `${clave}|${Object.entries(v).map(([k, x]) => `${k}=${x}`).join(';')}`;
const brief = BRIEF.armarBrief({ t: fakeT, lista: (xs) => xs.join(' + ') }, modoDeFashion('tryOn'), s, 'algo elegante');
check('E9 el brief usa la frase del modo con el detalle interpolado: preferencias, la idea y nada pegado a mano', brief.startsWith('fashion.briefTryOn|detalle=') && /fashion\.briefPrefs/.test(brief) && /fashion\.briefIdea/.test(brief) && /garment|groupGarment/.test(brief));
check('E10 sin elegir nada ni escribir nada, el brief dice que no hay preferencias; con «No sé», pide ayuda para elegir',
  /fashion\.briefNoDetail/.test(BRIEF.armarBrief({ t: fakeT, lista: (x) => x.join() }, modoDeFashion('completeLook'), SELECCION_VACIA, '')) && /fashion\.briefIdk/.test(BRIEF.armarBrief({ t: fakeT, lista: (x) => x.join() }, modoDeFashion('completeLook'), { elegidas: {}, idk: true }, '')));

/* ── navegación real ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const specialist = leer('screens/SpecialistScreen.tsx');
check('N1 la puerta de las secciones entrega Fashion para «fashion» y para el id retirado «business», antes de leer ninguna ficha',
  /id === 'fashion' \|\| id === 'business'\) return <FashionScreen \/>/.test(specialist) && !/BusinessScreen/.test(sinComentarios(specialist)));
const studioScreen = leer('screens/StudioScreen.tsx');
check('N2 las puertas Beauty y Fashion de Studio abren el Composer en su modo (Studio no crea) y siguen declaradas por compatibilidad',
  /navigate\('Specialist', \{\s*id: 'fashion'/.test(studioScreen) && /ENTRADAS_DE_STUDIO_QUE_ABREN_FASHION/.test(studioScreen) && /'beauty'/.test(estudio) && /'fashion'/.test(estudio));
check('N3 la ruta Specialist admite modo, texto previo e imagen previa', /Specialist: \{ id: string; modo\?: string; goal\?: string; imageUri\?: string \}/.test(leer('navigation/MainStackNavigator.tsx')));
check('N4 la portada tiene dos accesos y seis tarjetas, y TODAS abren algo (cada una llama a onAbrir con su modo)',
  /MODOS?\.map|FASHION_MODOS\.map/.test(pantalla) && /onPress=\{\(\) => abrir\(FASHION_MODOS\[2\]\)\}/.test(pantalla) && /onPress=\{\(\) => abrir\(FASHION_MODOS\[0\]\)\}/.test(pantalla) && /onPress=\{\(\) => onAbrir\(modo\)\}/.test(sinComentarios(leer('components/fashion/TarjetaDeModo.tsx'))));

/* ── F · el servidor ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const exps = require(path.join(RAIZ, 'functions/lib/creator/experiencias.js'));
check('F1 Brain ya no recomienda Weë Business y Beauty se presenta como Weë Fashion', exps.BRAIN_SPECIALISTS.business === null && /Weë Fashion/.test(exps.BRAIN_SPECIALISTS.beauty));
check('F2 el id «beauty» y la plantilla de Business no se borraron (con el id viajan los trabajos guardados)', !!plantillas.beauty && !!plantillas.business);
check('F3 el prompt de Beauty habla como Weë Fashion y no promete ajuste exacto ni patrones', /Weë Fashion/.test(leer('functions/src/creator/prompts.ts')) && /sin prometer ajuste físico exacto ni patrones/.test(leer('functions/src/creator/prompts.ts')));

/* ── G · textos y accesibilidad ─────────────────────────────────────────────────────────────────────────────────────────────── */
const archivos = ['components/fashion/FashionComposer.tsx', 'components/fashion/SlotDeImagen.tsx', 'components/fashion/TarjetaDeModo.tsx', 'screens/FashionScreen.tsx'];
const usadasEnCodigo = new Set(archivos.flatMap((f) => [...sinComentarios(leer(f)).matchAll(/t\(['`]fashion\.(\w+)/g)].map((m) => m[1])));
check('G1 cada clave que pintan los componentes existe', [...usadasEnCodigo].every((k) => clavesEs.has(k)), [...usadasEnCodigo].filter((k) => !clavesEs.has(k)).join(', '));
check('G2 toda clave del diccionario se usa en algún sitio (código o datos): nada huérfano',
  [...clavesEs].every((k) => usadasEnCodigo.has(k) || clavesUsadas.has(k) || /^(briefPrefs|briefIdea|briefIdk|briefNoDetail|reviewLine)$/.test(k)), [...clavesEs].filter((k) => !usadasEnCodigo.has(k) && !clavesUsadas.has(k)).join(', '));
check('G3 todo botón tiene rol accesible', archivos.every((f) => { const c = sinComentarios(leer(f)); const n = (c.match(/<TouchableOpacity/g) || []).length; const r = (c.match(/accessibilityRole=/g) || []).length; return r >= n; }));
check('G4 los títulos de sección llevan rol de encabezado', /accessibilityRole="header"/.test(composer) && /accessibilityRole="header"/.test(pantalla));
check('G5 los estados cambiantes (cargando, error, respuesta) se anuncian (live region)', (composer.match(/accessibilityLiveRegion=/g) || []).length >= 3);
check('G6 ninguna imagen remota ni dependencia nueva: la portada usa el vestido dibujado de Weë',
  /IconoWee name="vestido"/.test(pantalla) && !/require\(['"]\.\.\/assets/.test(pantalla));
check('G7 ningún texto visible escrito a mano en los componentes: solo marca («Weë Fashion», «Fashion», «Weë AI»)',
  archivos.every((f) => { const c = sinComentarios(leer(f)); const textos = [...c.matchAll(/>\s*([^<>{}\n]*[A-Za-zÀ-ÿ]{3,}[^<>{}\n]*)\s*</g)].map((m) => m[1].trim()).filter((x) => x && !/[()?=;]/.test(x)); return textos.length === 0; }));

check('esta suite está en la cadena de `npm test`', /fashion-composer\.test\.mjs/.test(JSON.parse(leer('functions/package.json')).scripts.test));

process.stdout.write(fallo ? `\n✘ ${fallo} comprobación(es) fallaron\n` : '\n✔ Weë Fashion v0: seis secciones, WeeBiz intacto, Composer honesto y sin ninguna API\n');
process.exit(fallo ? 1 : 0);
