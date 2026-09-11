/*
 * LA NAVEGACIÓN INFERIOR DE WEË.
 *
 * Una sola barra para toda la aplicación, y su comportamiento al desplazarse:
 * al bajar se aparta, al subir vuelve. Aquí se vigilan las dos cosas.
 *
 * Se lee el código, que es lo único comprobable sin abrir la aplicación, y cada
 * grupo lleva controles para que un verde no pueda ser un verde vacío.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

console.log('\n── O · La navegación inferior, una sola para todo Weë ──');
{
  const barra = leer('components/BarraInferior.tsx');
  const global = leer('navigation/NavegacionGlobal.tsx');
  const pila = leer('navigation/MainStackNavigator.tsx');
  const pestanas = leer('navigation/TabNavigator.tsx');

  /* Cinco destinos, los de siempre, en el mismo orden. */
  const ids = [...barra.matchAll(/\{ id: '(\w+)', etiqueta: '([^']+)'/g)].map((m) => [m[1], m[2]]);
  check('132) son exactamente cinco destinos', ids.length === 5, ids.map(([, e]) => e).join(' · '));
  check('133) con las rutas de siempre',
    JSON.stringify(ids.map(([i]) => i)) === JSON.stringify(['Home', 'Search', 'Create', 'Inbox', 'Profile']));
  check('134) y los nombres de siempre',
    JSON.stringify(ids.map(([, e]) => e)) === JSON.stringify(['Inicio', 'Buscar', 'Crear', 'WeeTalk', 'Perfil']));
  /* Control: esas cinco rutas siguen declaradas en el navegador de pestañas. */
  const declaradas = ['Home', 'Search', 'Create', 'Inbox', 'Profile'].filter((r) =>
    new RegExp('<Tab\\.Screen\\s+name="' + r + '"').test(pestanas)
  );
  check('135) control: las cinco siguen existiendo como pestañas', declaradas.length === 5, declaradas.join(', '));

  /*
   * UNA SOLA INSTANCIA. Se monta en la pila principal, que es el único nivel
   * desde el que se ven todas las pantallas, y las pestañas dejaron de dibujar
   * la suya. Si alguna pantalla montara otra, habría dos.
   */
  check('136) se monta una sola vez, en la pila principal', (pila.match(/<NavegacionGlobal \/>/g) || []).length === 1);
  check('137) y las pestañas ya no dibujan la suya', /tabBar=\{\(\) => null\}/.test(pestanas));
  /*
   * Control: nadie más la monta. Se recorre TODA la aplicación, no una lista
   * escrita a mano — una lista se queda vieja en cuanto alguien añade una
   * pantalla.
   */
  const raiz = path.resolve(here, '../..');
  const recorrer = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
      const completo = path.join(dir, e.name);
      return e.isDirectory() ? recorrer(completo) : completo.endsWith('.tsx') ? [completo] : [];
    });
  const montan = recorrer(raiz).filter((f) => /<(NavegacionGlobal|BarraInferior)[\s/>]/.test(fs.readFileSync(f, 'utf8')));
  check('138) control: nadie más la monta', montan.length === 2,
    montan.map((f) => path.basename(f)).join(' · '));

  /*
   * QUÉ VA ENCENDIDO. Dentro de las pestañas, la pestaña; fuera, la ruta si se
   * conoce y si no Inicio, porque todo lo demás se alcanza desde ahí.
   */
  check('139) el activo sale de dónde estás', /pestanaPuesta\(estado\) \|\| DESTINO_DE_RUTA\[rutaRaiz\] \|\| 'Home'/.test(global));
  check('140) y se anuncia como tal', /accessibilityState=\{\{ selected: activo \}\}/.test(barra) && /aria-selected=\{activo\}/.test(barra));

  /* Las pantallas que de verdad piden pantalla completa se quedan sin barra. */
  ['Login', 'Register', 'Create', 'Reels', 'Settings'].forEach((r) => {
    if (!new RegExp("'" + r + "'").test(global.split('const DESTINO_DE_RUTA')[0])) {
      check(`141) excepción declarada: ${r}`, false);
    }
  });
  check('141) modales, autenticación y pantalla completa quedan fuera',
    /SIN_BARRA = new Set\(\[[\s\S]*?'Login',[\s\S]*?'Register',[\s\S]*?'Create',[\s\S]*?'Reels',[\s\S]*?'Settings',/.test(global));
  check('142) y una conversación abierta también', /ANIDADAS_SIN_BARRA = new Set\(\['Conversation'\]\)/.test(global));

  /*
   * SITIO Y ZONA SEGURA. La barra se aparta de los controles del sistema con
   * `insets.bottom`, y la pila reserva su alto en las pantallas que antes no
   * tenían barra —las de las pestañas ya dejaban hueco desde siempre—.
   */
  check('143) respeta la zona segura del sistema', /paddingBottom: insets\.bottom/.test(barra));
  /*
   * El sitio se reserva solo fuera de las pestañas —dentro ya lo dejaban ellas—
   * y desde que la barra se desliza, el hueco acompaña al movimiento en vez de
   * ser un número fijo. Lo que importa sigue siendo lo mismo: se reserva, y solo
   * donde hace falta.
   */
  check('144) y reserva su sitio donde antes no había barra',
    /barra\.visible && !barra\.enPestanas[\s\S]{0,200}ALTO_BARRA \+ insets\.bottom/.test(pila));
  /* Control: quieta abajo mientras el contenido se desplaza por detrás. */
  check('145) control: no se va con el scroll', /anclada: \{[\s\S]{0,160}position: 'absolute'[\s\S]{0,120}bottom: 0/.test(global));

  /*
   * ICONOS DE UNA SOLA FAMILIA, y los mismos en móvil y en navegador. Antes la
   * web enseñaba emojis y el teléfono iconos de línea.
   */
  check('146) todos los iconos son de la misma familia', (barra.match(/<Ionicons/g) || []).length >= 1 && !/TAB_EMOJIS|fontSize: 22/.test(barra));
  check('147) contorno en reposo y relleno cuando está puesto',
    /icono: '(\w+)-outline'/.test(barra) && /activo \? destino\.iconoPuesto : destino\.icono/.test(barra));
  /* El dibujo encoge; el sitio donde se toca, no. */
  check('148) el objetivo táctil no encoge', /minHeight: 44,/.test(barra));
}

console.log('\n── P · La barra se aparta al bajar y vuelve al subir ──');
{
  const hook = leer('hooks/useScrollDeBarra.ts');
  const global = leer('navigation/NavegacionGlobal.tsx');
  const pila = leer('navigation/MainStackNavigator.tsx');
  const contexto = leer('contexts/ScrollContext.tsx');

  /*
   * Se reutiliza el contexto de scroll que YA existía. Declaraba `scrollY` e
   * `isScrollingDown` desde antes de esta fase y no los escribía nadie: eran
   * andamio. Ahora los llena el hook, en vez de levantar un contexto paralelo.
   */
  check('149) usa la infraestructura de scroll que ya había',
    /isScrollingDown/.test(contexto) && /useScroll\(\)/.test(hook) && /setIsScrollingDown/.test(hook));

  /*
   * ─── LA CAUSA DE LOS ~2 SEGUNDOS, VIGILADA ─────────────────────────────────
   *
   * El hook escribía `scrollY` en el contexto en CADA evento de scroll. El
   * proveedor construye su valor como un objeto nuevo en cada render, así que
   * cada escritura repintaba a sus seis consumidores —entre ellos el muro
   * entero, con sus vídeos—, sesenta veces por segundo. El hilo de JavaScript se
   * quedaba sin aire y el cambio de dirección hacía cola detrás. No era la
   * animación ni el umbral: era la cola.
   *
   * Estas tres comprobaciones existen para que nadie lo reintroduzca sin darse
   * cuenta de lo que cuesta.
   */
  check('149b) no publica la posición del scroll en cada evento', !/setScrollY/.test(hook));
  /* Al contexto solo se le habla cuando el sentido CAMBIA, no por fotograma. */
  const escrituras = (hook.match(/setIsScrollingDown\(/g) || []).length;
  const guardadas = (hook.match(/if \(bajando\.current\) \{[\s\S]{0,80}setIsScrollingDown|&& !bajando\.current|&& bajando\.current/g) || []).length;
  check('149c) y solo cuando cambia el sentido', escrituras === 3 && guardadas === 3,
    `${escrituras} escrituras, las ${guardadas} protegidas por el estado actual`);
  /*
   * Control: la posición vive en una referencia, que no repinta. Si volviera a
   * un `useState`, cada evento de scroll repintaría otra vez.
   */
  check('149d) control: la posición vive en una referencia', /const ultimaY = useRef\(0\);/.test(hook) && !/useState/.test(hook));

  /* Y nada de esperas artificiales en el camino del gesto. */
  const caminoDelGesto = hook + global.split('const elegir')[0];
  check('149e) sin temporizadores ni esperas en el camino del gesto',
    !/setTimeout|setInterval|debounce|throttle\(/.test(caminoDelGesto));

  /*
   * MANDA EL CAMINO RECORRIDO, NO EL ÚLTIMO EVENTO. Un dedo suelta decenas de
   * eventos de dos píxeles en los dos sentidos; sin umbral la barra entraría y
   * saldría sin parar.
   */
  /*
   * Y NO CUESTAN LO MISMO LOS DOS GESTOS. Apartar la navegación es una
   * concesión y conviene pedir intención; recuperarla es una PETICIÓN, y ahí
   * esperar es lo que hace que una aplicación se sienta lenta.
   *
   * Con el umbral simétrico de antes hacían falta 12 px hacia arriba y un golpe
   * de rueda ronda los 10: casi siempre eran DOS eventos, y la barra parecía
   * pegada. Medido en el navegador con el umbral nuevo: un solo golpe hacia
   * arriba la pone en marcha (46,8 → 30,6 → 0).
   */
  const ocultar = /const UMBRAL_OCULTAR = (\d+);/.exec(hook);
  const mostrar = /const UMBRAL_MOSTRAR = (\d+);/.exec(hook);
  check('150) esconderla pide intención', !!ocultar && Number(ocultar[1]) >= 6, ocultar ? `${ocultar[1]} px` : 'sin umbral');
  check('150b) recuperarla responde al primer movimiento',
    !!mostrar && Number(mostrar[1]) > 0 && Number(mostrar[1]) <= 4, mostrar ? `${mostrar[1]} px` : 'sin umbral');
  check('150c) control: cuesta bastante menos volver que irse',
    !!ocultar && !!mostrar && Number(mostrar[1]) * 3 <= Number(ocultar[1]),
    ocultar && mostrar ? `${mostrar[1]} px para volver frente a ${ocultar[1]} para irse` : '');
  /* Y cada umbral se aplica en su rama: el de mostrar solo cuando está oculta. */
  check('150d) cada umbral en su sitio',
    /recorrido\.current > UMBRAL_OCULTAR && !bajando\.current/.test(hook) &&
      /recorrido\.current < -UMBRAL_MOSTRAR && bajando\.current/.test(hook));
  check('151) y cambiar de sentido reinicia la cuenta', /if \(dy > 0 !== recorrido\.current > 0\) recorrido\.current = 0;/.test(hook));
  /* Control: arriba del todo siempre se ve. Llegar a una pantalla sin navegación es raro. */
  check('152) control: arriba del todo siempre está', /if \(y <= ZONA_ALTA\)/.test(hook) && /setIsScrollingDown\(false\)/.test(hook));

  /*
   * SE DESLIZA, NO SE DIFUMINA. Y recorre su alto entero más la zona segura,
   * así que sale completa en vez de dejar media navegación asomando.
   */
  check('153) se mueve con translateY', /transform: \[\{ translateY: apartada\.interpolate/.test(global));
  check('154) y no con opacidad', !/opacity: apartada/.test(global));
  check('155) recorre su alto más la zona segura', /const salida = ALTO_BARRA \+ insets\.bottom;/.test(global));
  /*
   * Tampoco duran lo mismo. Irse puede tomarse su tiempo —nadie la espera—;
   * volver es la respuesta a un gesto, y a una respuesta se le mira el reloj.
   */
  const dOcultar = /const DURACION_OCULTAR = (\d+);/.exec(global);
  const dMostrar = /const DURACION_MOSTRAR = (\d+);/.exec(global);
  check('156) irse es suave', !!dOcultar && Number(dOcultar[1]) >= 150 && Number(dOcultar[1]) <= 240,
    dOcultar ? `${dOcultar[1]} ms` : 'sin duración');
  check('156b) volver es casi inmediato', !!dMostrar && Number(dMostrar[1]) >= 60 && Number(dMostrar[1]) <= 140,
    dMostrar ? `${dMostrar[1]} ms` : 'sin duración');
  /*
   * Control: hay recorrido, no un salto. Duración cero haría que la barra
   * apareciera de la nada y el ojo no entendería de dónde salió.
   */
  check('156c) control: volver tiene recorrido, no es un salto', !!dMostrar && Number(dMostrar[1]) > 0);
  check('156d) y cada duración se usa según el sentido',
    /duration: isScrollingDown \? DURACION_OCULTAR : DURACION_MOSTRAR/.test(global));

  /*
   * Y EL HUECO SE SUELTA CON ELLA: mientras está escondida el contenido llega
   * hasta abajo y no queda una franja vacía esperándola.
   */
  check('157) el hueco reservado se va con la barra',
    /paddingBottom:[\s\S]{0,120}apartada\.interpolate\(\{[\s\S]{0,120}outputRange: \[ALTO_BARRA \+ insets\.bottom, 0\]/.test(pila));
  /*
   * Control: un solo número mueve las dos cosas. Con un valor por componente
   * cada uno animaría por su cuenta y se verían desacompasados.
   */
  check('158) control: barra y hueco comparten el mismo número',
    /export const apartada = new Animated\.Value\(0\);/.test(global) && /apartada/.test(pila));

  /* Al cambiar de pantalla vuelve: nadie llega a un sitio nuevo sin navegación. */
  check('159) al cambiar de pantalla reaparece', /apartada\.setValue\(0\);/.test(global));

  /*
   * Enganchada donde de verdad se desplaza Weë: el muro del Home —nativo y web—
   * y el contenedor de TODAS las experiencias.
   */
  check('160) el Home nativo lo reporta', /reportarScroll\(event\);/.test(leer('screens/LandingScreen.tsx')));
  check('161) el Home web también', /onScroll=\{reportarScroll\}/.test(leer('screens/WebLandingScreen.tsx')));
  check('162) y todas las experiencias de Weë, de una vez',
    /\{\.\.\.scrollDeBarra\}/.test(leer('components/creator/CreatorShell.tsx')));
  /*
   * Control: el hook entiende las dos formas de desplazarse que hay en Weë —el
   * `ScrollView` de React Native y el contenedor del navegador—, así que el
   * enganche web no necesita un segundo hook.
   */
  check('163) control: entiende el scroll de móvil y el del navegador',
    /nativeEvent\?\.contentOffset\?\.y/.test(hook) && /currentTarget\?\.scrollTop/.test(hook));
}

console.log('\nNavegación: una sola barra, y se aparta cuando estorba');
if (failures > 0) {
  console.error(`\n${failures} comprobación(es) fallida(s)`);
  process.exit(1);
}
