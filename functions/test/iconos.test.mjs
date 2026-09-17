/*
 * LOS ICONOS DEL BURGER.
 *
 * El menú pintaba emojis dentro de un `<Text>`. Ahora pinta SVG dibujados a
 * mano, todos con las mismas reglas. Lo que se vigila aquí es lo que puede
 * romperse sin que nadie se entere hasta abrir el cajón en un teléfono:
 *
 *  1. que ningún icono del menú se quede sin dibujo —un nombre suelto en un
 *     `Record` incompleto no lo caza TypeScript si alguien usa un `as`—;
 *  2. que cada dibujo produzca un SVG válido y una dirección `data:` que se
 *     pueda decodificar de vuelta, porque el base64 va escrito a mano;
 *  3. que el color entre de verdad en el trazo y no quede el marcador `%C%`,
 *     que daría un icono invisible;
 *  4. y que todos sigan siendo de la MISMA familia: mismo lienzo, mismo grosor,
 *     sin colores propios y sin rellenos, que es lo que los hace parecer un
 *     juego y no veintitrés dibujos sueltos.
 *
 * El módulo de los trazos no importa nada, así que se transpila y se ejecuta.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const js = ts.transpileModule(leer('components/icons/trazosDeWee.ts'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const iconos = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const nombres = Object.keys(iconos.TRAZOS);

console.log('\n── A · Todos dibujan algo, y algo válido ──');
{
  check('1) hay un dibujo por cada nombre del tipo', (() => {
    const fuente = leer('components/icons/trazosDeWee.ts');
    const declarados = [...fuente.matchAll(/^ {2}\| '([a-zA-Z]+)'/gm)].map((m) => m[1]);
    return declarados.length > 0 && declarados.every((n) => typeof iconos.TRAZOS[n] === 'string');
  })(), nombres.length + ' iconos');

  /* Un SVG sin viewBox no se puede escalar, y el decodificador de Android lo exige. */
  const malFormados = nombres.filter((n) => {
    const svg = iconos.svgDelIcono(n, '#1F2937');
    return !svg.startsWith('<svg ') || !svg.endsWith('</svg>')
      || !svg.includes('viewBox="0 0 24 24"')
      || (svg.match(/</g) || []).length !== (svg.match(/>/g) || []).length;
  });
  check('2) todos son SVG cerrados y con viewBox', malFormados.length === 0, malFormados.join(' '));

  /*
   * EL BASE64 VA ESCRITO A MANO, así que se comprueba contra el de Node. Glide
   * —quien baja la imagen en Android— solo acepta `data:` en base64, y un
   * carácter mal puesto daría un cuadrado roto en el menú y en ningún sitio más.
   */
  const svg = iconos.svgDelIcono('casa', '#1F2937');
  check('3) el base64 propio da lo mismo que el de Node',
    iconos.enBase64(svg) === Buffer.from(svg, 'ascii').toString('base64'));

  const idaYVuelta = nombres.filter((n) => {
    const uri = iconos.uriDelIcono(n, '#1F2937');
    if (!uri.startsWith('data:image/svg+xml;base64,')) return true;
    return Buffer.from(uri.split(',')[1], 'base64').toString('ascii') !== iconos.svgDelIcono(n, '#1F2937');
  });
  check('4) y cada dirección data: se decodifica de vuelta entera', idaYVuelta.length === 0, idaYVuelta.join(' '));
}

console.log('\n── B · El color entra en el trazo ──');
{
  /* Si quedara el marcador sin sustituir, el icono se pintaría invisible. */
  const conMarcador = nombres.filter((n) => iconos.svgDelIcono(n, '#F5B731').includes('%C%'));
  check('5) no queda ningún marcador de color sin sustituir', conMarcador.length === 0, conMarcador.join(' '));

  const sinColor = nombres.filter((n) => !iconos.svgDelIcono(n, '#F5B731').includes('stroke="#F5B731"'));
  check('6) el color pedido llega al trazo de todos', sinColor.length === 0, sinColor.join(' '));

  /* CONTROL: dos colores distintos dan dos direcciones distintas. Si la caché
   * ignorara el color, el menú se quedaría con el primero que se pintó. */
  check('7) control: cada color tiene su propia dirección',
    iconos.uriDelIcono('casa', '#1F2937') !== iconos.uriDelIcono('casa', '#F5B731')
    && iconos.uriDelIcono('casa', '#1F2937') === iconos.uriDelIcono('casa', '#1F2937'));
}

console.log('\n── C · Una sola familia ──');
{
  const fuente = leer('components/icons/trazosDeWee.ts');
  /* Un grosor escrito una vez: es lo que hace que veintitrés formas distintas
   * parezcan el mismo juego. */
  check('8) el grosor del trazo está en un solo sitio',
    /export const GROSOR_DEL_TRAZO = [\d.]+;/.test(fuente)
    && (fuente.match(/stroke-width=/g) || []).length === 1);

  /* Ninguno trae color propio ni relleno decorativo: solo contorno. */
  const conColorPropio = nombres.filter((n) => /(#[0-9A-Fa-f]{3,8}|rgb\(|url\(|gradient)/.test(iconos.TRAZOS[n]));
  check('9) ninguno lleva color, degradado ni sombra propios', conColorPropio.length === 0, conColorPropio.join(' '));

  /* Los únicos rellenos son ojos, puntos y el del signo de interrogación, y van
   * siempre con el color del icono, nunca con uno fijo. */
  const rellenoRaro = nombres.filter((n) => (iconos.TRAZOS[n].match(/fill="(?!%C%)/g) || []).length > 0);
  check('10) y los pocos rellenos usan el color del icono', rellenoRaro.length === 0, rellenoRaro.join(' '));

  check('11) todos caben en el mismo lienzo de 24',
    nombres.every((n) => iconos.svgDelIcono(n, '#000').includes('viewBox="0 0 24 24"')));
}

console.log('\n── D · Enchufados en el Burger ──');
{
  const cajon = leer('components/DrawerMenu.tsx');
  const menu = leer('constants/weeMenu.ts');
  const experiencias = leer('constants/weeExperiences.ts');

  /* Ni una fila del cajón pinta ya un emoji. */
  check('12) el cajón ya no pinta emojis en sus filas',
    !/styles\.rowEmoji|styles\.subRowEmoji/.test(cajon.replace(/\/\*[\s\S]*?\*\//g, ''))
    && /<IconoWee/.test(cajon));

  /* Cada opción del menú y cada experiencia tienen su icono, y existe. */
  const delMenu = [...menu.matchAll(/icono: '([a-zA-Z]+)'/g)].map((m) => m[1]);
  const deLasExperiencias = [...experiencias.matchAll(/icono: '([a-zA-Z]+)'/g)].map((m) => m[1]);
  check('13) las doce opciones del menú tienen icono', delMenu.length === 12, String(delMenu.length));
  check('14) y las once experiencias también', deLasExperiencias.length === 11, String(deLasExperiencias.length));
  const inventados = [...delMenu, ...deLasExperiencias].filter((n) => !nombres.includes(n));
  check('15) y ninguno apunta a un dibujo que no existe', inventados.length === 0, inventados.join(' '));

  /*
   * EL COLOR DE LOS DIBUJOS SE DECIDE UNA VEZ, Y LO LLEVAN TODOS.
   *
   * Con el Perfil Real sale del tema —así el cajón claro los ve oscuros y el
   * oscuro claros—; con el Perfil Weë, todos se encienden en verde. No es el
   * adorno de una opción: es el estado de la sesión, así que o lo llevan todas
   * o no lo lleva ninguna, y eso es justo lo que se fija aquí.
   */
  check('16) el color de los iconos se decide en un solo sitio, y lo decide isWee',
    /const colorDeLosIconos = isWee \? VERDE_DEL_PERFIL_WEE : theme\.colors\.text;/.test(cajon));
  check('16b) la fila corriente lo usa, sin perder el rojo de las peligrosas',
    /color=\{opts\.danger \? theme\.colors\.error : colorDeLosIconos\}/.test(cajon));
  /*
   * Y NINGÚN DIBUJO SE QUEDA FUERA. Se cuentan los \<IconoWee\> del archivo y los
   * que reciben ese color: si alguien añade uno con un color propio, o se olvida
   * de pasárselo, los números dejan de cuadrar y esto salta.
   */
  /*
   * La marca de los Credits —"ẄC", que sustituyó a su dibujo el 2026-09-15—
   * cuenta como uno más: ocupa el hueco de un icono y tiene que tomar el mismo
   * color, o en el Perfil Weë se quedaría negra sobre un menú oscuro.
   */
  /*
   * Y desde el 2026-09-16, la de Weë AI —"ẄAI"— cuenta igual: sustituyó al
   * cerebro, que era de Weë Brain y aparecía dos renglones seguidos diciendo
   * dos cosas distintas.
   */
  const dibujos = (cajon.match(/<IconoWee|<MarcaDeCredits|<MarcaDeWeeAi/g) || []).length;
  const teñidos = (cajon.match(/color=\{[^}]*colorDeLosIconos[^}]*\}/g) || []).length;
  check('16c) todos los IconoWee del cajón reciben ese color', dibujos > 0 && dibujos === teñidos, teñidos + ' de ' + dibujos);
  /* Y ya no queda forma de que una fila suelta se pinte por su cuenta. */
  check('16d) ninguna fila puede pedir un color propio', !/colorIcono/.test(cajon));
  /* El verde vive con su nombre y se escribe una vez; a ningún dibujo se le pasa un color a pelo. */
  check('16e) el verde es una constante con nombre, no un literal suelto en el JSX',
    /const VERDE_DEL_PERFIL_WEE = '#39FF14';/.test(cajon)
    && (cajon.match(/#39FF14/g) || []).length === 1
    && !/<IconoWee[\s\S]{0,220}color=\{?'#/.test(cajon));
  /* Los NOMBRES no se tiñen: el verde es de los dibujos y de nadie más. */
  check('16f) los textos siguen tomando su color de siempre',
    /\{ color: opts\.danger \? theme\.colors\.error : theme\.colors\.text \}/.test(cajon)
    && !/styles\.rowText[\s\S]{0,120}colorDeLosIconos/.test(cajon));

  /*
   * CONTROL: el Burger sigue siendo el mismo. Ni el orden de las secciones, ni
   * los nombres, ni las rutas: esto solo cambió los dibujos.
   */
  check('17) control: el menú conserva sus secciones y su orden',
    /renderSectionLabel\(t\('menu\.sectionProfile'\)\)/.test(cajon)
    && /renderSectionLabel\(t\('menu\.sectionExplore'\)\)/.test(cajon)
    && cajon.indexOf("menu.sectionProfile") < cajon.indexOf("menu.sectionExplore"));
  /*
   * Las opciones siguen llamándose igual, pero el texto vive ya en el
   * diccionario. Se comprueba ahí, que es donde está, y además que la tabla
   * sigue apuntando a las claves correctas.
   */
  const textosMenu = leer('i18n/textos/es/menu.ts');
  check('18) control: y sus opciones siguen llamándose igual',
    /realProfile: 'Perfil Real'/.test(textosMenu) && /weeProfile: 'Perfil Weë'/.test(textosMenu)
    && /saved: 'Guardados'/.test(textosMenu) && /settings: 'Configuración'/.test(textosMenu)
    && /help: 'Ayuda'/.test(textosMenu)
    && /clave: 'menu\.realProfile'/.test(menu) && /clave: 'menu\.settings'/.test(menu));
  /*
   * LA BARRA DE ESCRITORIO YA NO SE QUEDA ATRÁS.
   *
   * Cuando se dibujaron los iconos solo entró el cajón, y la barra siguió
   * pintando el emoji del catálogo: por debajo de 1024 puntos se veían los
   * dibujos y por encima los emojis. Es la misma discrepancia que el catálogo
   * único vino a cerrar, solo que en otro campo. Ahora las dos leen "icono",
   * así que no pueden volver a enseñar cosas distintas para la misma opción.
   *
   * El campo "emoji" se queda en el catálogo —puede quedar código que lo lea—,
   * pero ya no lo lee ninguno de los dos menús, y eso es lo que se vigila.
   */
  const barra = leer('components/Sidebar.tsx');
  check('19) el catálogo conserva el campo emoji para quien aún lo use', /emoji: string;/.test(menu));
  check('19b) y los DOS menús sacan el dibujo del mismo campo',
    /MENU_ITEM\[id\]\.icono/.test(cajon) && /MENU_ITEM\[id\]\.icono/.test(barra));
  check('19c) ninguno de los dos pinta ya el emoji del catálogo',
    ![cajon, barra].some((f) => /MENU_ITEM\[id\]\.emoji|MENU_ITEM\.\w+\.emoji|\bexp\.emoji\b/.test(f)));
  check('19d) y la barra pinta con IconoWee, el mismo componente que el cajón',
    /from '\.\/icons\/IconoWee'/.test(barra) && /<IconoWee/.test(barra)
    && /MENU_ITEM\.creator\.icono/.test(barra) && /\bexp\.icono\b/.test(barra));
  /*
   * La única fila que sigue con emoji es Buscar, y no es un olvido: solo existe
   * en escritorio —en el móvil la da la barra inferior— y trazosDeWee no tiene
   * lupa. Se fija aquí para que, el día que se dibuje, esto salte y se cambie
   * también.
   */
  check('19e) y la única excepción sigue siendo Buscar, que no tiene dibujo',
    /emoji="🔍" label={t\('nav\.search'\)}/.test(barra)
    && !/'lupa'|'buscar'/.test(leer('components/icons/trazosDeWee.ts')));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
