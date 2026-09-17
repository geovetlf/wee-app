/*
 * EL SALDO DE CREDITS SE VE EN TODO WEË AI, ES DE LA CUENTA Y SALE UNA SOLA VEZ.
 *
 * Decisión de producto (2026-09-15): dentro de Weë AI todo cuesta Credits, así
 * que cuántos quedan es parte de la cabecera de cada experiencia y no un dato
 * que haya que ir a buscar al menú. Empezó en Weë Chef y se extiende a todas.
 *
 * Tres cosas se rompen en silencio aquí —nadie ve un error, simplemente el
 * número miente— y por eso se vigilan con su control:
 *
 *  A. LA FUENTE: una sola, la cuenta de Firebase Auth. Ni el perfil, ni un
 *     estado local, ni un número escrito a mano.
 *  B. LA PIEZA: una sola, `CreditsPill`. Ni una copia por sección.
 *  C. EL INVENTARIO: ninguna pantalla de Weë AI se queda sin él.
 *  D. UNA SOLA VEZ: cuando el marco y la cabecera coinciden, no sale dos veces.
 *  E. LO QUE NO SE TOCA: Credit Engine, precios y consumo siguen donde estaban.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
/* El fuente sin comentarios: lo que se comenta no se ejecuta ni se lee en pantalla. */
const soloCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const PILDORA = 'components/CreditsPill.tsx';
const HOOK = 'hooks/useWallet.ts';
const MARCO = 'components/creator/CreatorShell.tsx';
const CABECERA = 'components/creator/CabeceraDeSeccion.tsx';

const pildora = leer(PILDORA);
const hook = leer(HOOK);
const marco = leer(MARCO);
const cabecera = leer(CABECERA);

console.log('\n─── A. La fuente: la cuenta, y una sola ───');

check('1) el saldo se escucha en tiempo real desde el Credit Engine',
  /creditsService\.subscribeToBalance\(accountUid, setAccount\)/.test(hook));
check('2) y el uid es el de Firebase Auth: la CUENTA manda sobre cualquier perfil',
  /const accountUid = user\?\.uid \|\| accountUidOf\(uid\)/.test(hook));
check('3) la píldora lo pide sin uid, para que no quepa pasarle el del perfil',
  /const \{ balance \} = useWallet\(\);/.test(soloCodigo(pildora)));
check('4) y no lee el perfil activo',
  !/useUserProfile|userProfile/.test(soloCodigo(pildora)),
  'un saldo por perfil serían dos monederos donde hay uno');
check('5) tampoco guarda el saldo en un estado propio',
  !/useState[^\n]*balance|balance.*=.*useState/i.test(soloCodigo(pildora)));

/*
 * CONTROL: si alguien volviera a pasarle el uid del perfil, la comprobación 3
 * tendría que caer. Se simula el cambio sobre el fuente leído.
 */
const falsaPildora = soloCodigo(pildora).replace('useWallet()', 'useWallet(userProfile?.uid)');
check('CONTROL: pasarle el uid del perfil sería detectado',
  !/const \{ balance \} = useWallet\(\);/.test(falsaPildora),
  'si esto pasara, el grupo A no protegería nada');

console.log('\n─── B. La pieza: una sola ───');

check('6) el número sale del formato del idioma activo, no de toLocaleString',
  /formato\.numero\(balance\)/.test(pildora) && !/toLocaleString/.test(pildora));
check('7) mientras carga no inventa un número', /balance === null \? '…'/.test(pildora));
check('8) y con saldo 0 enseña 0, sin caso especial',
  !/balance === 0|!balance\b/.test(soloCodigo(pildora)),
  'un 0 tiene que leerse como cualquier otro número');
check('9) su etiqueta accesible pasa por i18n, con el saldo interpolado',
  /accessibilityLabel=\{t\('credits\.youHaveLabel', \{ saldo: value \}\)\}/.test(pildora));
check('10) sin sesión no se dibuja', /if \(!user\) return null;/.test(pildora));

/* No hay una píldora por sección: la lista de archivos que la dibujan es corta y conocida. */
const conPildora = fs.readdirSync(path.resolve(RAIZ, 'components'), { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.tsx') && f !== 'CreditsPill.tsx')
  /* `<CreditsPill ` o `<CreditsPill/`: el tipo `React.FC<CreditsPillProps>` no cuenta. */
  .filter((f) => /<CreditsPill[\s/>]/.test(leer(path.join('components', f))));
/*
 * Tres, y las tres son cabeceras: el marco de Weë AI, la cabecera que llevan
 * seis secciones y la de Weë Brain, que desde el 2026-09-16 tiene la suya
 * (decisión del usuario, por su referencia de diseño). No son tres saldos: cada
 * pantalla dibuja UNA de ellas, y todas leen el mismo `useWallet()` de la
 * cuenta, que es lo que protege el grupo A.
 */
check('11) solo las cabeceras la dibujan: el marco de Weë AI y las dos de sección',
  conPildora.length === 3 && conPildora.every((f) => /CreatorShell|CabeceraDeSeccion|CabeceraDeWeeBrain/.test(f)),
  conPildora.join(' · '));
/* Y ninguna pantalla se pone dos: la de Weë Brain sustituye a la común, no se suma. */
const brain = leer('screens/BrainChatScreen.tsx');
check('11b) Weë Brain lleva una cabecera, no dos',
  /CabeceraDeWeeBrain/.test(brain) && !/CabeceraDeSeccion/.test(brain) && !/<CreditsPill[\s/>]/.test(brain));
const copias = fs.readdirSync(path.resolve(RAIZ, 'components'), { recursive: true })
  .filter((f) => typeof f === 'string' && /Credit/i.test(f) && f !== 'CreditsPill.tsx');
check('12) y no hay una copia por experiencia', copias.length === 0, copias.join(' · '));

console.log('\n─── C. El inventario: ninguna experiencia sin él ───');

/*
 * Todas las pantallas de Weë AI. Cada una tiene que enseñar el saldo por uno de
 * los dos caminos: el marco (`CreatorShell`) o la cabecera de sección
 * (`CabeceraDeSeccion`). Una pantalla nueva que no use ninguno cae aquí.
 */
const PANTALLAS = {
  'screens/WeeCreatorScreen.tsx': 'Weë AI',
  'screens/StudioScreen.tsx': 'Weë Studio',
  'screens/DesignScreen.tsx': 'Weë Design',
  'screens/ChefScreen.tsx': 'Weë Chef',
  'screens/BusinessScreen.tsx': 'Weë Business',
  'screens/SpecialistScreen.tsx': 'Writer · Music · Travel · Photo · Beauty · Home',
  'screens/BrainChatScreen.tsx': 'Weë Brain',
  'screens/WriterEditorScreen.tsx': 'el editor de Writer',
  'screens/CreatorFlowScreen.tsx': 'la creación y su resultado',
  'screens/ProjectsScreen.tsx': 'Mis proyectos',
  'screens/ProjectScreen.tsx': 'un proyecto',
};
/*
 * `StudioHeader` es la cabecera de sección con las claves ya resueltas: Weë
 * Studio y Weë Design entran por ahí, y por debajo es `CabeceraDeSeccion`.
 */
check('12b) la cabecera de Studio y Design es la de todos, no una copia',
  /<CabeceraDeSeccion/.test(leer('components/studio/StudioHeader.tsx')));
const sinSaldo = Object.entries(PANTALLAS).filter(([ruta]) => {
  const s = soloCodigo(leer(ruta));
  return !/<CreatorShell|<CabeceraDeSeccion|<StudioHeader/.test(s);
});
check('13) las ' + Object.keys(PANTALLAS).length + ' pantallas de Weë AI enseñan el saldo',
  sinSaldo.length === 0, sinSaldo.map(([, q]) => q).join(' · '));

/* Y ninguna se lo inventa por su cuenta. */
const inventado = Object.keys(PANTALLAS).filter((ruta) => {
  const s = soloCodigo(leer(ruta));
  return /useWallet\([^)]+\)/.test(s) || /\bbalance\s*=\s*\d/.test(s);
});
check('14) ninguna pide el saldo con un uid propio ni lo escribe a mano',
  inventado.length === 0, inventado.join(' · '));

/* CONTROL: una pantalla sin ninguno de los dos caminos tendría que caer. */
check('CONTROL: una pantalla sin marco ni cabecera sería detectada',
  !/<CreatorShell/.test('const X = () => <View />;') && !/<CabeceraDeSeccion/.test('const X = () => <View />;'),
  'si esto pasara, el grupo C no protegería nada');

console.log('\n─── D. Una sola vez por pantalla ───');

const contexto = leer('components/creator/MarcoDeSeccion.tsx');
check('15) el marco dice si ya lo está enseñando', /<ConMarcoDeSeccion/.test(marco));
check('16) con franja arriba, la enseña él; sin franja, la cabecera',
  /<ConMarcoDeSeccion saldoALaVista=\{!sinFranjaSuperior\}/.test(marco));
check('17) en escritorio lo enseña la barra lateral, así que la cabecera se calla',
  /<ConMarcoDeSeccion saldoALaVista aireLateral/.test(marco));
check('18) y la cabecera de sección obedece',
  /const marco = useMarcoDeSeccion\(\)/.test(cabecera) && /!marco\.saldoALaVista &&/.test(cabecera));
check('19) fuera de Weë AI nadie lo dice, así que la cabecera lo enseña',
  /saldoALaVista: false/.test(contexto),
  'Weë Studio, Weë Design y Weë Chef no viven dentro del marco');

/* CONTROL: sin el aviso, el saldo saldría dos veces en las que tienen las dos cosas. */
check('CONTROL: quitar el aviso dejaría dos saldos',
  /useMarcoDeSeccion/.test(cabecera),
  'si esto pasara, el grupo D no protegería nada');

console.log('\n─── D2. La cabecera se lee igual en todas ───');

/* Sin comentarios: aquí se mira lo que se EJECUTA, y los comentarios explican el porqué. */
const codigoCabecera = soloCodigo(cabecera);
check('19b) un solo tamaño de nombre para todas las secciones',
  /export const TAMANO_DEL_NOMBRE = \d+;/.test(codigoCabecera)
  && !/tamanoDelNombre|largo <= /.test(codigoCabecera),
  'un tamaño por sección haría que la misma cabecera se leyera distinta según dónde estés');
check('19c) y el mismo ancho: el aire del marco se devuelve',
  /marginHorizontal: -marco\.aireLateral/.test(cabecera)
  && /aireLateral=\{SPACING\.lg\}/.test(marco) && /aireLateral=\{SPACING\.xl\}/.test(marco),
  'sin esto el nombre cabría en unas secciones y en otras no');
check('19d) el nombre no se corta ni se deja al azar',
  /numberOfLines=\{1\}/.test(codigoCabecera) && !/adjustsFontSizeToFit/.test(codigoCabecera),
  'adjustsFontSizeToFit no encoge texto con pesos mezclados y en Android come la última letra');

console.log('\n─── E. Lo que no se toca ───');

check('20) la píldora no suma, resta ni cobra: solo mira',
  !/(spendCredits|refundCredits|completeCredits|creditCosts)/.test(pildora + cabecera + marco));
check('21) ni escribe un precio a mano', !/\b\d+\s*Credits\b/.test(soloCodigo(pildora)));
check('22) el motor de Credits sigue siendo del servidor',
  fs.existsSync(path.resolve(RAIZ, 'functions/src/credits')));
check('23) y el saldo se lee de la cuenta, no del documento del Perfil Weë',
  /uid\.replace\(\/\^hidi_\//.test(leer('services/creditsService.ts')),
  'el prefijo heredado se resuelve a la cuenta antes de preguntar');

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
