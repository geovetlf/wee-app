/*
 * WEË BRAIN ESTÁ VIVO, Y TIENE QUE SEGUIR SIENDO GRATIS.
 *
 * Decisión de producto (2026-09-16): el sitio de trabajo de Weë Brain enseña el
 * cerebro en el centro y las seis secciones de Weë AI a su alrededor, recibiendo
 * energía. El dibujo cuenta lo que Weë es —una sola inteligencia con muchas
 * puertas (CLAUDE.md §10)— y por eso no puede ser un adorno que se pague caro.
 *
 * Todo lo que se vigila aquí se rompe EN SILENCIO: nadie ve un error, la
 * aplicación simplemente empieza a calentar el teléfono, o la animación sigue
 * corriendo con la pantalla apagada, o alguien mete un GIF de tres megas. Por
 * eso hay seis grupos:
 *
 *  A. la composición: el cerebro, los seis satélites y de dónde salen;
 *  B. lo que NO se usa: ni video, ni GIF, ni canvas, ni motor de partículas;
 *  C. el coste: solo `transform` y `opacity`, y en el hilo nativo;
 *  D. cuándo se para: menos movimiento, segundo plano y otra pantalla;
 *  E. los textos: claves en los dos idiomas, nada escrito a mano;
 *  F. lo que no se toca: Credit Engine, precios, rutas y el resto de secciones.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { textosDe } from './i18n-ayuda.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const SISTEMA = 'components/brain/SistemaDeWeeBrain.tsx';
const CABECERA = 'components/brain/CabeceraDeWeeBrain.tsx';
const PANTALLA = 'screens/BrainChatScreen.tsx';
const sistema = leer(SISTEMA);
const cabecera = leer(CABECERA);
const pantalla = leer(PANTALLA);
const experiencias = leer('constants/weeExperiences.ts');

/*
 * Para lo que se PROHÍBE, se mira el código y no los comentarios: este archivo
 * explica por qué no hay un GIF, y nombrarlo no es usarlo.
 */
const BLOQUE = new RegExp('/\\*[\\s\\S]*?\\*/', 'g');
const LINEA = new RegExp('^\\s*//.*$', 'gm');
const sinComentarios = (src) => src.replace(BLOQUE, ' ').replace(LINEA, ' ');
const codigo = sinComentarios(sistema);

console.log('\n── A · El cerebro y sus seis satélites ──');

/*
 * Los seis son los que enseña el menú, menos el propio Brain. No una lista
 * escrita a mano: si mañana entra una sección nueva en `ORDEN_EN_EL_MENU`, esta
 * prueba avisa de que el dibujo se quedó con seis.
 */
const orden = (experiencias.match(/ORDEN_EN_EL_MENU[^=]*=\s*\[([^\]]*)\]/s) || [])[1] || '';
const enElMenu = [...orden.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const esperados = enElMenu.filter((id) => id !== 'brain');
const enElDibujo = [...(sistema.match(/\{ id: '([a-z]+)', angulo:/g) || [])].map((s) => s.match(/'([a-z]+)'/)[1]);

check('1) el menú de Weë AI sigue teniendo seis secciones además de Weë Brain', esperados.length === 6, esperados.join(', '));
check('2) y el dibujo tiene esas seis, ni una más ni una menos',
  esperados.length === enElDibujo.length && esperados.every((id) => enElDibujo.includes(id)),
  enElDibujo.join(', '));
check('3) los seis salen de la fuente real, no de nombres escritos a mano',
  /getExperienceById\(/.test(sistema) && /experiencia\.name/.test(sistema) && /experiencia\.emoji/.test(codigo));
check('4) el nombre de marca no pasa por el traductor',
  !/t\(['"`][^'"`]*Weë (Studio|Music|Design|Business|Chef|Travel)/.test(codigo));

/* El hexágono: arriba, abajo y dos a cada lado. Seis ángulos distintos. */
const angulos = [...sistema.matchAll(/angulo: (-?\d+)/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
check('5) están repartidos en hexágono', angulos.length === 6 && new Set(angulos).size === 6, angulos.join(' '));
check('6) uno arriba y uno abajo', angulos.includes(-90) && angulos.includes(90));
check('7) y dos a cada lado', [-30, 30, 150, 210].every((a) => angulos.includes(a)));

/* Escalonado: si todos salieran a la vez, el cerebro parpadearía como un adorno. */
const esperas = [...sistema.matchAll(/espera: (\d+)/g)].map((m) => Number(m[1]));
const viajes = [...sistema.matchAll(/viaje: (\d+)/g)].map((m) => Number(m[1]));
check('8) la energía sale escalonada, no de golpe', new Set(esperas).size === 6, esperas.join(' '));
/* Y los ciclos enteros tampoco coinciden: es lo que impide que se sincronicen. */
const ciclos = esperas.map((e, i) => e + viajes[i]);
check('8b) y los seis ciclos miden distinto', new Set(ciclos).size === 6, ciclos.join(' '));
/* Ni un `Animated.delay`: es siempre del hilo de JavaScript y arrastra la cadena. */
check('8c) la espera va dentro del timing, no en un Animated.delay',
  !/Animated\.delay\(/.test(codigo) && /delay: satelite\.espera/.test(codigo));
check('9) y los ciclos no miden lo mismo, para que nunca se sincronicen', new Set(viajes).size === 6, viajes.join(' '));

/* La respiración es casi imperceptible: si se nota el salto, sobra. */
const respiracion = (sistema.match(/outputRange: \[1, (1\.\d+)\]/) || [])[1];
check('10) el cerebro respira y no rebota', !!respiracion && Number(respiracion) <= 1.02, `1 → ${respiracion}`);

/*
 * EL CEREBRO ES EL QUE ELIGIÓ EL USUARIO (2026-09-16), y viaja dentro de la app.
 * Ni el emoji 🧠 —que sale rosa y distinto en cada sistema—, ni un dibujo hecho
 * a mano, ni una dirección de internet.
 */
const ASSET = 'assets/images/brain/cerebro-de-wee.webp';
check('10b) el cerebro es la imagen elegida', new RegExp(ASSET.replace(/[.]/g, '\\.')).test(codigo));
check('10c) y esa imagen existe de verdad', fs.existsSync(path.resolve(RAIZ, ASSET)));
/*
 * Y pesa lo que debe pesar. El original venía en 434 KB de JPG; al pasarlo a
 * WebP con transparencia se quedó en 93. Si alguien vuelve a meter el JPG, o un
 * PNG sin comprimir, esto lo dice antes de que viaje en la app.
 */
const pesoKb = Math.round(fs.statSync(path.resolve(RAIZ, ASSET)).size / 1024);
check('10c2) y no engorda la app', pesoKb <= 140, pesoKb + ' KB');
check('10d) ya no queda el emoji del cerebro en ninguna de las dos piezas',
  !/🧠/.test(sinComentarios(sistema)) && !/🧠/.test(sinComentarios(cabecera)));
/*
 * Y no se le pinta un resplandor detrás: la imagen trae el suyo, y uno de
 * código asomaría por fuera de la lámina con un canto recto.
 */
check('10e) sin resplandor dibujado bajo la lámina',
  !/resplandor|anilloDelCerebro/.test(codigo),
  'lo trae la propia imagen');

console.log('\n── B · Lo que NO se usa ──');

const prohibido = {
  'un GIF': /\.gif\b/i,
  'un video': /<Video\b|expo-av|react-native-video|\.mp4\b/,
  'Lottie': /lottie/i,
  'un canvas': /<Canvas\b|getContext\(/,
  'WebGL o Three.js': /three|webgl|gl-react/i,
  'un motor de partículas': /particle/i,
  'una imagen de fuera': /https?:\/\//,
};
for (const [que, patron] of Object.entries(prohibido)) {
  check(`11) el cerebro no usa ${que}`, !patron.test(codigo));
}
check('12) ni pide nada al servidor para animarse',
  !/fetch\(|httpsCallable|creatorService|brainService/.test(codigo));

console.log('\n── C · Lo que cuesta ──');

/*
 * En Android y en iOS esto significa que la animación entera corre en el hilo
 * nativo: el de JavaScript se queda libre y la batería no lo paga.
 */
const timings = sistema.match(/Animated\.timing\(/g) || [];
const nativos = sistema.match(/useNativeDriver: true/g) || [];
check('13) hay animaciones', timings.length >= 3, `${timings.length} timings`);
check('14) y TODAS van por el hilo nativo', nativos.length === timings.length,
  `${nativos.length} de ${timings.length}`);
check('15) ninguna va por el hilo de JavaScript', !/useNativeDriver: false/.test(codigo));

/* Solo `transform` y `opacity`: son las dos que no obligan a recalcular la página. */
const animados = [...sistema.matchAll(/(opacity|transform|width|height|left|top|backgroundColor|shadowRadius):\s*(viaje|respiro)\b/g)]
  .map((m) => m[1]);
check('16) solo se animan transform y opacity',
  animados.every((p) => p === 'opacity' || p === 'transform'),
  animados.join(', ') || 'ninguna otra');

/* Ni un bucle de JavaScript corriendo para siempre. */
check('17) sin requestAnimationFrame', !/requestAnimationFrame/.test(codigo));
check('18) sin setInterval', !/setInterval/.test(codigo));
check('19) sin oyentes sobre los valores animados', !/\.addListener\(/.test(codigo));

console.log('\n── D · Cuándo se para ──');

check('20) quien pidió menos movimiento no ve ninguno', /isReduceMotionEnabled/.test(codigo));
check('21) y si lo cambia, se entera', /reduceMotionChanged/.test(codigo));
check('22) en segundo plano no se anima', /AppState/.test(sistema) && /=== 'active'/.test(codigo));
check('23) en otra pantalla tampoco', /useIsFocused/.test(codigo));
check('24) las tres condiciones apagan la animación de verdad',
  /const animar = [^;]*enfocada[^;]*alFrente[^;]*menosMovimiento/.test(codigo));
check('25) y al pararse, el dibujo se queda entero y quieto',
  /respiro\.setValue\(0\)/.test(sistema) && /viajes\.forEach\(\(valor\) => valor\.setValue\(0\)\)/.test(codigo));
check('26) lo que se arrancó se para al salir',
  /\.stop\(\)/.test(sistema) && /return parar/.test(codigo));

console.log('\n── E · Los textos ──');

const es = textosDe('es').brain;
const en = textosDe('en').brain;
const clavesEs = Object.keys(es);
check('27) el diccionario de Weë Brain existe en español', clavesEs.length >= 5, clavesEs.join(', '));
check('28) y las mismas claves en inglés',
  clavesEs.length === Object.keys(en).length && clavesEs.every((k) => k in en));
check('29) traducido de verdad, no copiado',
  clavesEs.every((k) => es[k] !== en[k]),
  clavesEs.filter((k) => es[k] === en[k]).join(', ') || 'todas distintas');

for (const clave of ['tagline', 'slogan', 'description', 'placeholder', 'systemLabel', 'goTo']) {
  check(`30) ${clave} está`, clave in es && clave in en);
}

/*
 * Nada escrito a mano en las piezas nuevas: todo entra por `t()`. Con una
 * excepción, la de siempre: los nombres de Weë son MARCA y no pasan por el
 * traductor (CLAUDE.md §8). "Weë" y "Brain" están escritos en la cabecera a
 * propósito, y así tiene que seguir.
 */
const MARCA = /^(Weë|Brain|Weë Brain)\s*$/;
const sueltos = (src) =>
  [...src.matchAll(/<Text[^>]*>\s*([A-ZÁÉÍÓÚÑ][^<{}\n]{2,})/g)]
    .map((m) => m[1].trim())
    .filter((texto) => !MARCA.test(texto));
check('31) la cabecera no tiene textos a mano, salvo la marca', sueltos(cabecera).length === 0, sueltos(cabecera).join(' | '));
check('32) el dibujo tampoco', sueltos(sistema).length === 0, sueltos(sistema).join(' | '));
check('33) y la marca sigue escrita como marca, sin traductor',
  /<Text>Weë <\/Text>/.test(cabecera) && />Brain<\/Text>/.test(cabecera));
check('33) el sitio de trabajo lee sus textos del diccionario',
  /t\('brain\.slogan'\)|<CabeceraDeWeeBrain/.test(pantalla) && /t\('brain\.placeholder'\)/.test(pantalla));

console.log('\n── E2 · La caja, anclada y quieta con el teclado ──');

/*
 * El problema, tal cual se veía: con la caja DENTRO de la página, al tocarla
 * Android desplazaba la página para enseñar el cursor y, justo después, el
 * teclado encogía lo que se ve y la caja volvía a colocarse. Dos movimientos
 * seguidos —uno suave y otro seco— y eso era el salto.
 *
 * Anclada no hay ninguno: la caja está pegada abajo, lo que encoge es la página
 * de encima, y nadie llama a `scrollTo`.
 */
const shell = leer('components/creator/CreatorShell.tsx');
const crece = leer('components/creator/CajaQueCrece.tsx');

check('34) la caja de Weë Brain va anclada, no al final de la página',
  /pie=\{compositor\}/.test(pantalla) && /const compositor = \(/.test(pantalla));
check('35) el marco tiene sitio para una caja anclada', /pie\?: React\.ReactNode/.test(shell));
check('36) y esa caja vive FUERA de la página que se desplaza',
  /<CajaAnclada[\s\S]{0,400}?\{pie\}/.test(shell));
check('37) una caja anclada no pide a nadie que se desplace',
  /mantenerALaVista: noMoverNada/.test(crece) && /const noMoverNada = \(\) => \{\};/.test(crece));
check('38) pero sigue teniendo tope, así que sus botones no se van de la vista',
  /altoDisponible: alto > 0 \? alto : undefined/.test(crece) && /alto=\{topeDelPie\}/.test(shell));
/*
 * Con el teclado abierto la caja se apoya en él; sin teclado, sobre la barra de
 * Weë. Un solo relleno que cambia, y nada más.
 */
/*
 * UN SOLO AIRE DEBAJO, CON TECLADO Y SIN ÉL.
 *
 * Sin teclado la caja se apoya en la barra de Weë; con teclado,
 * `EspacioDeEscritura` sube la zona de escritura y la caja se apoya en el
 * teclado. Nada que medir ni que alternar.
 *
 * Se probaron las dos alternativas en el Z Flip3 y las dos dejaban franja
 * muerta: guardarle sitio a la barra siempre dejaba 60 puntos entre la caja y el
 * teclado; guardárselo solo sin teclado dejaba esos 60 puntos entre la caja y la
 * barra. La barra no flota encima: ocupa su sitio.
 */
check('39) un solo aire debajo de la caja anclada',
  /pie: \{\s*paddingHorizontal: SPACING\.lg,\s*paddingTop: SPACING\.sm,\s*paddingBottom: SPACING\.sm,/.test(shell)
  && !/pieConTeclado/.test(shell));
/* Y el acomodo es el de siempre: no hay un segundo sistema de teclado. */
/*
 * El acomodo del teclado es el de siempre, en la pieza de siempre. El marco ya
 * ni siquiera necesita medirlo: le basta con `EspacioDeEscritura`. Quien sí lo
 * mira es la cabecera de Weë Brain, para apartar el saludo mientras se escribe.
 */
check('40) reutiliza el acomodo de teclado que ya existe',
  /EspacioDeEscritura/.test(shell) && /useAlturaDelTeclado/.test(cabecera));
check('41) Weë Brain no monta su propio sistema de teclado',
  !/Keyboard\.addListener|KeyboardAvoidingView|visualViewport/.test(pantalla));
check('42) y el marco tampoco vigila nada en bucle',
  !/requestAnimationFrame|setInterval|visualViewport/.test(sinComentarios(shell)));

console.log('\n── E3 · Los tres ajustes finales de la caja ──');

/*
 * 1. LA LEYENDA, FUERA. Debajo de la caja no se lee nada mientras está vacía:
 * ni la frase ni su hueco (decisión del usuario, 2026-09-16). El precio vuelve
 * en cuanto hay algo escrito, que es cuando dice algo.
 */
check('43) la leyenda del costo ya no se dibuja con la caja vacía',
  !/weeai\.writeToKnowCost/.test(pantalla));
check('44) pero el precio sigue estando cuando hay mensaje',
  /!!chat\.quoteError \|\| !!draft\.trim\(\)/.test(pantalla) && /chat\.quote\.credits/.test(pantalla));
/* Y la leyenda sigue viva para quien la use: no se borró del diccionario. */
check('45) la clave sigue en el diccionario, por si otra sección la usa',
  'writeToKnowCost' in textosDe('es').weeai);

/*
 * 2. LA FILA. Imagen, adjuntar y ajustes a la izquierda; micrófono pegado al de
 * enviar. El globo se fue: buscar en internet vive en los ajustes.
 */
const izquierda = [...pantalla.matchAll(/icono: '([a-z-]+)'/g)].map((m) => m[1]);
check('46) a la izquierda: imagen, adjuntar y ajustes',
  izquierda.slice(0, 3).join(',') === 'image-outline,attach-outline,options-outline', izquierda.join(' '));
check('47) y el micrófono va al otro lado, con el de enviar',
  /accionesDerecha=\{\[\s*\{ icono: 'mic-outline'/.test(pantalla));
check('48) la caja común admite ese lado sin que cambie para nadie más',
  /accionesDerecha\?: AccionDeLaCaja\[\]/.test(leer('components/creator/CajaDePrompt.tsx')));
for (const rel of ['components/studio/StudioPromptComposer.tsx', 'screens/ChefScreen.tsx', 'screens/StudioScreen.tsx']) {
  check(`48) ${rel} no pasa ese lado: su fila es la de siempre`, !/accionesDerecha/.test(leer(rel)));
}

/*
 * 3. EL REPARTO CON EL TECLADO. La caja crece, pero no hasta comerse el cerebro:
 * se queda con poco menos de la mitad de lo que hay y la pantalla conserva su
 * composición.
 */
/*
 * Y con el teclado abierto la presentación deja su sitio al cerebro (decisión
 * del usuario, 2026-09-16). Sin esto no cabía: medido en el Z Flip3, el teclado
 * deja ~445 puntos, la cabecera se llevaba ~200 y el Composer ~115, así que al
 * sistema —que necesita ~300— le quedaban ~130.
 *
 * Lo que se va es el saludo: el lema y la descripción. El nombre, el cerebro
 * pequeño y el saldo no se van nunca, y al cerrar el teclado vuelve todo.
 */
check('48b) con teclado, el lema y la descripción dejan sitio al cerebro',
  /const conTeclado = useAlturaDelTeclado\(\) > 0;/.test(cabecera)
  && /\{!conTeclado && \(/.test(cabecera));
check('48c) pero el nombre y el saldo se quedan',
  !/conTeclado[\s\S]{0,200}styles\.identidad/.test(cabecera)
  && /<CreditsPill compact \/>/.test(cabecera));

/*
 * La caja anclada crece sin tope, como la de Weë Studio (decisión del usuario,
 * 2026-09-16): llena lo que se ve y ahí se para, que es la regla de CLAUDE.md §9
 * y no un reparto propio de Weë Brain. El aire se lee de donde vive, no se copia.
 */
check('49) la caja anclada crece hasta llenar lo que se ve, como en Weë Studio',
  /altoDeEscritura - 2 \* AIRE_DE_LA_CAJA/.test(shell) && !/PARTE_DE_LA_CAJA/.test(shell));
check('50) y aun así nunca baja de un tamaño usable',
  /Math\.max\(ALTO_MINIMO_DE_LA_CAJA, altoDeEscritura - 2 \* AIRE_DE_LA_CAJA\)/.test(shell));
check('50b) el aire es el mismo que dentro de la página',
  /export const AIRE_DE_LA_CAJA = AIRE;/.test(crece));

console.log('\n── F · Lo que no se toca ──');

/*
 * El dorado de lo que escribe la persona (decisión del usuario, 2026-09-16):
 * medido de su referencia. Vive en la pantalla, no en el tema: el amarillo de
 * la marca no se toca, y la burbuja de Weë Brain sigue siendo la tarjeta gris.
 */
check('33b) la burbuja de quien escribe es dorada, no el acento al 20%',
  /const DORADO_DE_QUIEN_ESCRIBE = '#FBD45A';/.test(pantalla)
  && !/accent \+ '33'/.test(pantalla));
/*
 * LIMPIO: SIN LÍNEAS NI CUADRADOS (decisión del usuario, 2026-09-16).
 * La conversación no va dentro de una tarjeta y ninguna burbuja lleva borde: lo
 * que las separa es el aire y el color. Y quien habla no es una inicial, es el
 * cerebro: el mismo dibujo del centro de la pantalla.
 */
check('33c) la burbuja de Weë Brain es lisa, sin borde',
  /mia \? styles\.bubbleMia : \{ backgroundColor: theme\.colors\.surface \}/.test(pantalla));
check('33e) la conversación no va metida en una tarjeta',
  /chat: \{\s*gap: SPACING\.lg,\s*\},/.test(pantalla));
check('33f) y no queda ni un borde en el chat', !/borderWidth: 1/.test(pantalla));
/*
 * Y la caja tampoco lleva contorno: su borde y su sombra eran lo último que
 * dibujaba un cuadro en la pantalla (medido en el teléfono: la raya de arriba a
 * 637 puntos y la de abajo a 772). Se apaga solo en Weë Brain, con una opción
 * de la caja común; las demás secciones la siguen llevando.
 */
const caja = leer('components/creator/CajaDePrompt.tsx');
check('33j) la caja de Weë Brain va sin contorno', /sinMarco\n/.test(pantalla) || /sinMarco$/m.test(pantalla));
check('33k) y esa opción apaga borde y sombra',
  /cajaSinMarco: \{\s*borderWidth: 0,\s*shadowOpacity: 0,/.test(caja));
for (const rel of ['components/studio/StudioPromptComposer.tsx', 'screens/ChefScreen.tsx', 'screens/StudioScreen.tsx']) {
  check(`33l) ${rel} conserva su contorno`, !/sinMarco/.test(leer(rel)));
}

/*
 * Y LA CONVERSACIÓN SIGUE, NO SE ESCONDE.
 *
 * Con la caja anclada abajo, un mensaje nuevo aparecía DETRÁS de ella si la
 * página se quedaba donde estaba: se veía asomar media burbuja y la
 * conversación dejaba de leerse como una conversación (visto en el teléfono,
 * 2026-09-16). Ahora la página baja hasta el final cada vez que llega algo.
 *
 * Una vez por mensaje, no en bucle, y sin relación con el teclado: abrir el
 * teclado sigue sin mover nada.
 */
check('33m) la página sigue a la conversación',
  /seguirAlFinal=\{`\$\{bubbles\.length\}:\$\{chat\.busy\}`\}/.test(pantalla)
  && /scrollToEnd\(\{ animated: suave \}\)/.test(shell));
/*
 * Y sigue bajando MIENTRAS la respuesta acaba de crecer: una contestación larga
 * se pinta y se mide después de existir, así que bajar una sola vez dejaba el
 * final medio tapado por la caja. Se abre una ventana corta y se cierra sola;
 * fuera de ella nadie mueve la página mientras lees hacia arriba.
 */
check('33n) y sigue bajando mientras la respuesta crece, pero solo un rato',
  /siguiendoHasta\.current = Date\.now\(\) \+ 600;/.test(shell)
  && /if \(Date\.now\(\) < siguiendoHasta\.current\) alFinal\(false\);/.test(shell));
check('33ñ) nada de esto vigila en bucle',
  /\}, \[seguirAlFinal\]\);/.test(shell) && !/setInterval|requestAnimationFrame/.test(sinComentarios(shell)));
check('33g) quien habla es el cerebro, no una W',
  /source=\{CEREBRO_DE_WEE\} style=\{styles\.avatarDibujo\}/.test(pantalla) && !/avatarText/.test(pantalla));
/* Y bajo cada mensaje, la hora del idioma activo; en lo tuyo, además, el acuse. */
check('33h) cada mensaje lleva su hora, con el formato del idioma',
  /formato\.hora\(cuando\)/.test(pantalla) && !/toLocaleTimeString/.test(pantalla));
check('33i) y lo tuyo dice si ya te contestaron',
  /bubble\.contestado \? 'checkmark-done' : 'checkmark'/.test(pantalla));
check('33d) el amarillo de la marca no se toca',
  !/accent: '#/.test(leer('contexts/ThemeContext.tsx').split('\n').filter((l) => l.includes('#FBD45A')).join('')));

check('34) el cerebro no sabe de Credits ni de precios',
  !/Credits|credit|precio|spend/i.test(codigo));
check('35) tocar un satélite usa la ruta de siempre',
  /navigation\.navigate\('Specialist', \{ id: exp\.id \}\)/.test(pantalla));
check('36) y la pantalla sigue pidiendo el precio antes de enviar',
  /refreshQuote\(/.test(pantalla) && /chat\.quote/.test(pantalla));
check('37) la caja es la común, no una copia',
  /<CajaDePrompt/.test(pantalla) && !/<TextInput\b/.test(pantalla));
check('38) la cabecera de Weë Brain es suya y no cambia la de las demás',
  /CabeceraDeWeeBrain/.test(pantalla) && !/CabeceraDeSeccion/.test(pantalla));
check('39) y la cabecera común sigue como estaba, con su lema partido en dos',
  /const corte = lema\.indexOf\(' '\)/.test(leer('components/creator/CabeceraDeSeccion.tsx')));

/*
 * ── La caja anclada está QUIETA, y volver vuelve al cerebro ──────────────────
 *
 * Dos cosas que se rompen sin que nadie vea un error, y las dos las encontró el
 * usuario en el teléfono (2026-09-16).
 */
console.log('\n── G · Nada se mueve solo ──');

/*
 * La barra de Weë se aparta al desplazarse hacia abajo, y al apartarse suelta el
 * hueco que la pila le reservaba. Con la caja anclada justo encima, ese hueco es
 * su suelo: soltarlo la baja 52 puntos y recuperarlo la sube. Peor aún, bajar
 * hasta un mensaje nuevo ES desplazarse hacia abajo, así que la caja se movía
 * sola con cada respuesta.
 */
const paginaConPie = (shell.match(/\{pie \? \([\s\S]*?<\/PaginaDeCajas>/) || [])[0] || '';
check('41) con la caja anclada, la página no manda apartar la barra',
  !!paginaConPie && !/\{\.\.\.scrollDeBarra\}/.test(paginaConPie));
check('42) y donde no hay caja anclada la barra sigue apartándose como siempre',
  /<PaginaDeCajas[^>]*\{\.\.\.scrollDeBarra\}/.test(shell));
/* CONTROL: si alguien se la devuelve al pie, 41 tiene que caer. */
check('43) control: devolvérsela al pie se detectaría',
  /\{\.\.\.scrollDeBarra\}/.test(paginaConPie.replace('keyboardShouldPersistTaps', '{...scrollDeBarra} keyboardShouldPersistTaps')));

/*
 * ── Weë Brain es UNA página, no dos vistas ──────────────────────────────────
 *
 * Decisión del usuario (2026-09-16): el cerebro vivo y sus satélites no se van
 * nunca. Antes la conversación los SUSTITUÍA al escribir, y como `useBrainChat`
 * retoma el hilo de las últimas 24 horas, al entrar ya había mensajes y el
 * cerebro no se veía nunca. Ahora el cerebro está arriba siempre y lo que se
 * habla sale debajo, en la misma página.
 */
check('44) el cerebro se pinta siempre, no solo cuando no hay conversación',
  /<SistemaDeWeeBrain estado=\{estadoDelCerebro\} onSatelite=\{irASatelite\} \/>/.test(pantalla)
  /* El `enBlanco ?` que queda es el texto de la caja, no un cambio de vista. */
  && !/\{enBlanco \? \(/.test(pantalla));
check('45) y la conversación va debajo, en la misma página',
  /\{\(!enBlanco \|\| !!chat\.error \|\| !!chat\.shortfall\) && \(\s*<View style=\{styles\.chat\}>/.test(pantalla));
/*
 * Si el PRIMER envío falla no se guarda ningún mensaje, así que contando solo
 * mensajes el aviso de Credits no se pintaba y Weë se quedaba callada.
 */
check('45b) y un fallo antes del primer mensaje se ve igual',
  /!enBlanco \|\| !!chat\.error \|\| !!chat\.shortfall/.test(pantalla)
  && /chat\.shortfall && \(/.test(pantalla));
check('46) sin sustituir nada: la página no cambia de vista al escribir',
  !/onVolver=\{volver\}/.test(pantalla) && !/beforeRemove/.test(pantalla));
/* Y sin escuchar al teléfono por nuestra cuenta ni dejar nada corriendo. */
check('47) nada de esto vigila en bucle',
  !/BackHandler|setInterval|requestAnimationFrame/.test(sinComentarios(pantalla)));
/* Retomar el hilo sigue existiendo: lo que ya no hace es decidir por dónde se entra. */
check('47b) y se sigue retomando la conversación reciente',
  /getLatestChat\(user\.uid\)/.test(leer('hooks/useBrainChat.ts')));

/* CONTROL: si alguien mete un GIF en el cerebro, esta prueba TIENE que caer. */
const control = sistema.replace('const DISCO', "const X = require('./cerebro.gif');\nconst DISCO");
check('40) control: un GIF en el cerebro se detectaría', /\.gif\b/i.test(control));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
