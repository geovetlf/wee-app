/*
 * LO QUE OYE UN LECTOR DE PANTALLA, Y LA HORA DE CADA COSA (fase 5A).
 *
 * Dos cierres pequeños y globales:
 *
 *   · las etiquetas de accesibilidad del muro y de la cabecera, que se habían
 *     quedado en español cuando todo lo demás ya cambiaba de idioma. Una
 *     etiqueta que no se lee con los ojos es igual de interfaz que un botón: si
 *     no se traduce, quien navega con lector de pantalla se queda en español;
 *
 *   · `getRelativeTime`, que decía "hace 2h" con la app en inglés y sacaba la
 *     fecha de `es-ES`. Ahora lo dice `Intl`, con el locale de quien mira.
 *
 * Se ejecuta lo que se puede ejecutar —la utilidad de tiempo y los diccionarios
 * se compilan e importan de verdad— y lo que no, se lee como código.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { textosDe } from './i18n-ayuda.mjs';

const require = createRequire(import.meta.url);
const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n]*/g, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const cargar = (ruta, arreglo = (x) => x) => {
  const js = ts.transpileModule(arreglo(leer(ruta)), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'));
};

const ES = textosDe('es');
const EN = textosDe('en');

/*
 * La utilidad de tiempo, con su formateador de verdad detrás.
 *
 * Se juntan los dos en un solo módulo —el de formatos, con su única dependencia
 * sustituida, y la función de `mockData` sin su import— porque un módulo cargado
 * desde una URL `data:` no puede resolver rutas relativas. Lo que se ejecuta es
 * el código real de los dos, sin imitaciones.
 */
const fuenteFormato = leer('i18n/formato.ts').replace(
  "import { partesDelLocale } from './resolver';",
  "const partesDelLocale = (l) => ({ region: (l.split('-')[1] || '').toUpperCase() || undefined });");
const fuenteTiempo = leer('data/mockData.ts')
  .split('\n')
  .filter((l) => !/from '\.\.\/i18n\/formato'/.test(l))
  .join('\n');
const JUNTOS = fuenteFormato + '\n' +
  fuenteTiempo.slice(fuenteTiempo.indexOf('export const getRelativeTime'));
const cargarFuente = (fuente) => {
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'));
};
const TIEMPO = await cargarFuente(JUNTOS);
const FORMATO = TIEMPO;

const MURO = 'components/PostCard.tsx';
const CABECERA = 'components/Header.tsx';
const C = { [MURO]: soloCodigo(leer(MURO)), [CABECERA]: soloCodigo(leer(CABECERA)) };

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Las etiquetas del muro ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ETIQUETAS = [
    ['wall.comment', 'Comentar'],
    ['wall.save', 'Guardar'],
    ['wall.unsave', 'Quitar de Guardados'],
    ['common.share', 'Compartir'],
    ['wall.viewFullVideoInWeels', 'Ver el vídeo completo en Weëls'],
  ];
  const faltan = ETIQUETAS.filter(([clave]) => !C[MURO].includes(`'${clave}'`));
  check('1) las ' + ETIQUETAS.length + ' etiquetas del muro piden su clave', faltan.length === 0, faltan.map((e) => e[0]).join(' '));

  const malDicho = ETIQUETAS.filter(([clave, texto]) => {
    const [mod, k] = clave.split('.');
    return ES[mod][k] !== texto;
  });
  check('1) y el diccionario español les pone la frase de siempre', malDicho.length === 0, malDicho.map((e) => e[0]).join(' '));

  /* Ninguna se quedó escrita a mano. */
  const CRUDAS = ['"Comentar"', "'Comentar'", '"Compartir"', "'Compartir'", "'Guardar'", "'Quitar de Guardados'", '"Ver el vídeo completo en Weëls"'];
  const vivas = CRUDAS.filter((c) => C[MURO].includes(c));
  check('2) y ninguna sigue escrita a mano en el muro', vivas.length === 0, vivas.join(' '));

  /* Y no se perdió accesibilidad por el camino. */
  const cuantas = (C[MURO].match(/accessibilityLabel=/g) || []).length;
  check('3) el muro sigue anunciando sus controles', cuantas >= 6, cuantas + ' etiquetas');
  check('3) ninguna quedó vacía', !/accessibilityLabel=(""|''|\{''\}|\{""\})/.test(C[MURO]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las etiquetas de la cabecera ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ETIQUETAS = [
    ['common.back', 'Volver'],
    ['home.openMenu', 'Abrir menú'],
    ['home.logoHome', 'Weë, ir al principio'],
    ['menu.profileActive', '{{perfil}}, activo'],
    ['menu.switchToProfile', 'Cambiar al {{perfil}}'],
  ];
  const faltan = ETIQUETAS.filter(([clave]) => !C[CABECERA].includes(`'${clave}'`));
  check('4) las ' + ETIQUETAS.length + ' etiquetas de la cabecera piden su clave', faltan.length === 0, faltan.map((e) => e[0]).join(' '));

  const malDicho = ETIQUETAS.filter(([clave, texto]) => {
    const [mod, k] = clave.split('.');
    return ES[mod][k] !== texto;
  });
  check('4) y dicen lo que decían', malDicho.length === 0, malDicho.map((e) => e[0]).join(' '));

  const CRUDAS = ['"Volver"', '"Abrir menú"', '"Weë, ir al principio"'];
  const vivas = CRUDAS.filter((c) => C[CABECERA].includes(c));
  check('5) y ninguna sigue escrita a mano en la cabecera', vivas.length === 0, vivas.join(' '));

  /*
   * El Perfil Biz se eliminó del producto: su etiqueta de accesibilidad se fue
   * con él, de los once diccionarios y de la cabecera.
   */
  check('5) y la etiqueta del Perfil Biz se fue con el Perfil Biz',
    !/bizActiveTap/.test(C[CABECERA]) && ES.menu.bizActiveTap === undefined
    && EN.menu.bizActiveTap === undefined);

  /* El nombre largo de cada identidad sale del menú, sin duplicar la traducción. */
  check('6) las dos identidades se nombran desde el menú, no otra vez',
    /clave: 'menu\.realProfile'/.test(C[CABECERA]) && /clave: 'menu\.weeProfile'/.test(C[CABECERA])
    && ES.menu.realProfile === 'Perfil Real' && ES.menu.weeProfile === 'Perfil Weë');
  check('6) y la etiqueta corta sigue siendo marca',
    /etiqueta: 'Real'/.test(C[CABECERA]) && /etiqueta: 'Weë'/.test(C[CABECERA]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Español e inglés, completos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* `home.back` pasó a ser `common.back` en la fase 5P: una sola para toda la app. */
  const NUEVAS = ['wall.comment', 'wall.viewFullVideoInWeels', 'common.back', 'home.logoHome',
    'menu.profileActive', 'menu.switchToProfile'];
  const sinEs = NUEVAS.filter((c) => { const [m, k] = c.split('.'); return typeof ES[m][k] !== 'string'; });
  const sinEn = NUEVAS.filter((c) => { const [m, k] = c.split('.'); return typeof EN[m][k] !== 'string'; });
  check('7) las ' + NUEVAS.length + ' claves nuevas existen en español', sinEs.length === 0, sinEs.join(' '));
  check('8) y en inglés', sinEn.length === 0, sinEn.join(' '));

  const vacias = NUEVAS.filter((c) => {
    const [m, k] = c.split('.');
    return !String(ES[m][k]).trim() || !String(EN[m][k]).trim();
  });
  check('9) ninguna está vacía', vacias.length === 0, vacias.join(' '));

  /* Los tres módulos siguen parejos. */
  const desparejos = ['wall', 'home', 'menu', 'common'].filter((m) =>
    Object.keys(ES[m]).sort().join() !== Object.keys(EN[m]).sort().join());
  check('10) wall, home, menu y common tienen las mismas claves en los dos', desparejos.length === 0, desparejos.join(' '));

  /* Los huecos, iguales. */
  const huecos = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const malHueco = NUEVAS.filter((c) => { const [m, k] = c.split('.'); return huecos(ES[m][k]) !== huecos(EN[m][k]); });
  check('11) y las interpolaciones coinciden', malHueco.length === 0, malHueco.join(' '));
  check('11) la identidad entra por hueco, no pegada',
    /t\(puesta \? 'menu\.profileActive' : 'menu\.switchToProfile', \{ perfil: t\(opcion\.clave\) \}\)/.test(C[CABECERA])
    && !/`\$\{opcion\.nombre\}, activo`/.test(C[CABECERA]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · La hora, en el idioma de quien mira ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const AHORA = Date.parse('2026-09-14T12:00:00Z');
  const hace = (ms) => new Date(AHORA - ms);
  const MIN = 60 * 1000, HORA = 60 * MIN, DIA = 24 * HORA;

  const es = (d) => TIEMPO.getRelativeTime(d, 'es', AHORA);
  const en = (d) => TIEMPO.getRelativeTime(d, 'en', AHORA);

  check('12) en español: ' + [es(hace(30 * 1000)), es(hace(5 * MIN)), es(hace(2 * HORA)), es(hace(DIA)), es(hace(3 * DIA))].join(' · '),
    es(hace(5 * MIN)).includes('5') && /hace/.test(es(hace(5 * MIN)))
    && /hace/.test(es(hace(2 * HORA))) && es(hace(DIA)) === 'ayer' && /hace 3/.test(es(hace(3 * DIA))));

  check('13) en inglés: ' + [en(hace(30 * 1000)), en(hace(5 * MIN)), en(hace(2 * HORA)), en(hace(DIA)), en(hace(3 * DIA))].join(' · '),
    /ago/.test(en(hace(5 * MIN))) && /ago/.test(en(hace(2 * HORA)))
    && en(hace(DIA)) === 'yesterday' && /3/.test(en(hace(3 * DIA))));

  /* CONTROL: los dos idiomas dicen cosas distintas. Si no, no está traduciendo. */
  check('14) control: cada idioma dice lo suyo',
    es(hace(5 * MIN)) !== en(hace(5 * MIN)) && es(hace(DIA)) !== en(hace(DIA)));

  /* Los dos tramos de siempre: relativo hasta una semana, fecha después. */
  check('15) a partir de una semana se dice la fecha, no "hace"',
    !/hace|ago/.test(es(hace(10 * DIA))) && !/hace|ago/.test(en(hace(10 * DIA))),
    es(hace(10 * DIA)) + ' / ' + en(hace(10 * DIA)));
  check('15) y esa fecha también cambia de idioma',
    es(hace(10 * DIA)) !== en(hace(10 * DIA)), es(hace(10 * DIA)) + ' / ' + en(hace(10 * DIA)));

  /* Y sigue siendo la forma corta: el muro la pinta en una línea estrecha. */
  check('16) la forma sigue siendo corta',
    es(hace(2 * HORA)).length <= 12 && en(hace(2 * HORA)).length <= 12,
    es(hace(2 * HORA)) + ' / ' + en(hace(2 * HORA)));

  /* Nada clavado al español, ni un `if` decidiendo el plural. */
  const fuente = leer('data/mockData.ts');
  check('17) ni un formato clavado al español',
    !/toLocale(String|DateString|TimeString)\('es/.test(fuente)
    && !/'es-ES'/.test(fuente));
  check('17) y las reglas de cada idioma las pone Intl',
    /formatearTiempoRelativo\(date, locale, ahora, \{ style: 'narrow' \}\)/.test(fuente)
    && /formatearFecha\(date, locale, \{ month: 'short', day: 'numeric' \}\)/.test(fuente)
    && !/hace \$\{/.test(fuente));

  /* El formateador conserva lo que hacía; el estilo es un añadido opcional. */
  check('18) formatearTiempoRelativo sin estilo se comporta como siempre',
    FORMATO.formatearTiempoRelativo(hace(5 * MIN), 'es', AHORA) === 'hace 5 minutos'
    && FORMATO.formatearTiempoRelativo(hace(5 * MIN), 'en', AHORA) === '5 minutes ago');

  /* Los seis sitios que la piden le pasan el locale. */
  const SITIOS = ['components/PostCard.tsx', 'components/CommentCard.tsx', 'screens/ChatScreen.tsx',
    'screens/PostDetailScreen.tsx', 'screens/ReelsScreen.tsx', 'screens/InboxScreen.tsx'];
  /* El argumento puede llevar paréntesis dentro —`post.createdAt.toDate()`—. */
  const sinLocale = SITIOS.filter((p) => !/getRelativeTime\([^;\n]*,\s*locale\)/.test(soloCodigo(leer(p))));
  check('19) los seis sitios que la piden le dan el locale', sinLocale.length === 0, sinLocale.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo que NO se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Las marcas, dentro de las frases traducidas. */
  check('20) "Weëls" sobrevive en la etiqueta inglesa',
    /Weëls/.test(EN.wall.viewFullVideoInWeels) && /Weëls/.test(ES.wall.viewFullVideoInWeels),
    EN.wall.viewFullVideoInWeels);
  check('20) y "Weë" en la del logo', /Weë/.test(EN.home.logoHome) && /Weë/.test(ES.home.logoHome), EN.home.logoHome);
  /* El Perfil Biz ya no es una identidad de Weë: no queda nada suyo que nombrar. */
  check('20) y del Perfil Biz no queda ni el nombre', !/\bBiz\b/.test(C[CABECERA]));

  /* Lo que escribe la persona se sigue pintando crudo. */
  check('21) el texto de una publicación no pasa por el traductor',
    !/t\(post\.content\)|t\(post\.text\)/.test(C[MURO]));
  check('21) ni el nombre de quien publica', !/t\(.*displayName\)/.test(C[MURO] + C[CABECERA]));

  /* Y el inglés está en inglés. */
  const NUEVAS_EN = [EN.wall.comment, EN.wall.viewFullVideoInWeels, EN.common.back, EN.home.logoHome,
    EN.menu.profileActive, EN.menu.switchToProfile];
  const conAcento = NUEVAS_EN.filter((v) => /[áéíóúñ¿¡]/i.test(String(v).replace(/Weë|Weël|Weëls/g, '')));
  check('22) ninguna frase inglesa nueva lleva tildes ni signos de apertura', conAcento.length === 0, conAcento.join(' | '));
  const copiadas = [['wall.comment', ES.wall.comment, EN.wall.comment], ['common.back', ES.common.back, EN.common.back]]
    .filter(([, a, b]) => a === b);
  check('22) y están traducidas de verdad', copiadas.length === 0, copiadas.map((c) => c[0]).join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · El idioma cambia sin reiniciar ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('23) ninguna etiqueta se congela en el estado',
    !/useState\([^)]*\bt\('/.test(C[MURO] + C[CABECERA])
    && !/useMemo\(\(\) => t\(/.test(C[MURO] + C[CABECERA]));
  /* CommentCard pide también t: su nombre de respaldo («Usuario») pasó a common.user al entrar el japonés. */
  check('23) y la hora se recalcula al pintar, con el locale del momento',
    /const \{ t, locale \} = useIdioma\(\)/.test(soloCodigo(leer('components/CommentCard.tsx')))
    && /const \{ t, locale \} = useIdioma\(\)/.test(C[MURO]));

  /* CONTROL: no se tocó nada de lo que esta fase no toca. */
  check('24) control: ni Composer, ni Credits, ni el motor de IA',
    !/CreateScreen|ComposerEntry|CreateSheet|spendCredits|aiRouter|engine\//.test(C[MURO] + C[CABECERA]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · La bandeja de WeeTalk dice la hora como los demás ──');
// ════════════════════════════════════════════════════════════════════════════
/*
 * WeeTalk tenía SU PROPIO reloj: una escalera de ifs con "Ahora", "5m", "2h" y
 * "3d" y, al final, una fecha clavada a es-ES. La misma que ya se había ido del
 * muro, copiada aquí. Dos relojes es uno de más, y el segundo no sabía inglés.
 *
 * Lo único que cambia es QUIÉN ESCRIBE EL TEXTO. Los datos, el orden de las
 * conversaciones, lo que cuenta como sin leer y el corte de los siete días son
 * los de siempre.
 */
{
  const BANDEJA = 'screens/InboxScreen.tsx';
  const bandeja = soloCodigo(leer(BANDEJA));

  /* El reloj de casa ya no está. */
  check('25) la bandeja ya no define su propio tiempo relativo',
    !/const getRelativeTime = /.test(bandeja)
    && !/diffMins|diffHours|diffDays/.test(bandeja));
  check('25) ni queda ninguna de sus frases escritas a mano', !/'Ahora'/.test(bandeja));

  /* Usa el de todos, importado, no copiado. */
  check('26) usa el getRelativeTime internacionalizado de siempre',
    /import \{ getRelativeTime \} from '\.\.\/data\/mockData'/.test(bandeja));
  check('26) y no duplica la lógica de fechas',
    !/toLocaleDateString|Intl\.(RelativeTimeFormat|DateTimeFormat)/.test(bandeja));

  /* Ni un idioma clavado. */
  check('27) no se fuerza el español en ninguna parte',
    !/'es-ES'|'es'|\bes_ES\b/.test(bandeja));

  /*
   * LA MISMA EXPRESIÓN QUE PINTA LA PANTALLA, EJECUTADA. Se saca del archivo en
   * vez de reescribirla aquí: si mañana alguien la cambia, esto se entera. El
   * dato que recibe es el de Firestore, un Timestamp con toDate().
   */
  const trozo = (leer(BANDEJA).match(/\{(last\.timestamp[^}]*)\}/) || [])[1];
  check('28) la hora sale de la expresión que hay en la pantalla', !!trozo, trozo || 'no encontrada');
  const pintar = new Function('last', 'locale', 'getRelativeTime', 'return ' + trozo);
  const sello = (fecha) => ({ toDate: () => fecha });
  const enBandeja = (fecha, locale) => pintar({ timestamp: sello(fecha) }, locale, TIEMPO.getRelativeTime);
  /*
   * La expresión de la pantalla no pasa un "ahora": usa el reloj, como siempre.
   * Así que aquí el reloj es el de verdad y las distancias se miden desde él.
   */
  const ahora = Date.now();
  const atras = (ms) => new Date(ahora - ms);
  const SEG = 1000, MINUTO = 60 * SEG, H = 60 * MINUTO, D = 24 * H;
  const fila = (locale) => [atras(30 * SEG), atras(5 * MINUTO), atras(2 * H), atras(D), atras(3 * D)]
    .map((d) => enBandeja(d, locale)).join(' · ');

  check('29) en español: hace 30 s · hace 5 min · hace 2 h · ayer · hace 3 d',
    fila('es') === 'hace 30 s · hace 5 min · hace 2 h · ayer · hace 3 d', fila('es'));
  check('30) en inglés: 30s ago · 5m ago · 2h ago · yesterday · 3d ago',
    fila('en') === '30s ago · 5m ago · 2h ago · yesterday · 3d ago', fila('en'));

  /*
   * El corte de los siete días es de producto y sigue donde estaba: pasada una
   * semana se dice la fecha. Y se compara contra lo que devuelve la función
   * compartida, que es justo lo que se quería: la bandeja DELEGA, no decide.
   */
  const vieja = atras(9 * D);
  check('30) y a partir de una semana, la fecha, también en los dos',
    !/hace|ago/.test(enBandeja(vieja, 'es')) && !/hace|ago/.test(enBandeja(vieja, 'en'))
    && enBandeja(vieja, 'es') !== enBandeja(vieja, 'en'),
    enBandeja(vieja, 'es') + ' / ' + enBandeja(vieja, 'en'));
  const puntos = [atras(30 * SEG), atras(5 * MINUTO), atras(2 * H), atras(D), atras(3 * D), vieja];
  const distintos = puntos.filter((d) => ['es', 'en']
    .some((l) => enBandeja(d, l) !== TIEMPO.getRelativeTime(d, l)));
  check('30) y la bandeja no decide nada: dice lo mismo que la función compartida',
    distintos.length === 0, distintos.length + ' fecha(s)');

  /* Sin sello todavía no se inventa una hora: se calla, como antes. */
  check('31) una conversación sin hora sigue sin decir nada',
    pintar({ timestamp: null }, 'es', TIEMPO.getRelativeTime) === '');

  /* El locale lo pone el contexto de siempre, así que cambia sin reiniciar. */
  check('32) el locale viene del contexto, no de un estado congelado',
    /const \{ t, locale \} = useIdioma\(\)/.test(bandeja)
    && !/useState\([^)]*locale/.test(bandeja));

  /*
   * CONTROL: de la bandeja no se tocó nada más. Las conversaciones se siguen
   * escuchando igual, el sin-leer se decide igual y el chat se abre igual.
   */
  check('33) control: la bandeja funciona como funcionaba',
    /messagesService\./.test(bandeja)
    && /const unread = last && !last\.read && last\.senderId !== activeUid;/.test(bandeja)
    && /const openChat = \(c: Conversation\) => \{/.test(bandeja)
    && /nav\.navigate\('Conversation'/.test(bandeja));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
