/*
 * LAS TREINTA Y NUEVE ÁREAS QUE FALTABAN (fase 6).
 *
 * La auditoría posterior a la 5P encontró 276 textos de interfaz en español
 * escritos a mano, repartidos en pantallas que nunca habían entrado en una
 * fase: el avatar con IA, el alta guiada, Weë Biz entero, Buscar, la Ayuda, la
 * comunidad, el perfil ajeno, la publicación, el chat y una veintena más.
 *
 * ESTA PRUEBA NO ES UNA LISTA DE FRASES. Recorre el cliente entero y exige que
 * no quede NINGUNA, con dos cuidados que la 5P enseñó por las malas:
 *
 *   · `input.accept = 'image/*'` NO es un comentario. Los de bloque se quitan
 *     solo cuando abren la línea; si no, se traga doscientas líneas y da un
 *     falso verde —fue exactamente lo que pasó con el selector de avatar—;
 *
 *   · `Promise<void>` NO es texto de pantalla. Lo que va entre un mayor y un
 *     menor con paréntesis, punto y coma o igual es código, no algo que se lea.
 *
 * Lo que queda fuera está en una lista CERRADA y explicada: la marca, lo
 * técnico, y las cuatro excepciones que el producto autorizó.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const RAIZ = new URL('../../', import.meta.url);
const leer = (p) => fs.readFileSync(new URL(p, RAIZ), 'utf8');

/* El código sin comentarios, con el ancla que evita el falso verde de la 5P. */
const soloCodigo = (t) => t
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/console\.(log|error|warn|info|debug)\([^;]*\);/g, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ES = await traductorDe('es');
const EN = await traductorDe('en');
const esT = textosDe('es');
const enT = textosDe('en');

/** Todos los .tsx del cliente. */
const pantallas = [];
const recorrer = (dir) => {
  for (const e of fs.readdirSync(new URL(dir + '/', RAIZ), { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    if (e.isDirectory()) recorrer(dir + '/' + e.name);
    else if (e.name.endsWith('.tsx')) pantallas.push(dir + '/' + e.name);
  }
};
for (const d of ['screens', 'components', 'navigation']) recorrer(d);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ni un texto de interfaz escrito a mano ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * LO QUE SE QUEDA, Y POR QUÉ. Marca: se escribe igual en todos los idiomas.
   * Técnico: un hueco numérico y un símbolo de moneda. Y las dos excepciones
   * que el producto autorizó: `ErrorBoundary` es una clase y no puede usar
   * hooks —se pinta cuando el árbol ya se rompió—, y `HomeGreeting` tiene
   * cambios locales que no se tocan.
   */
  const MARCA = /^(Weë|Weël|Weëls|Wäll|WeeTalk|ËContact|ËContacts|ẄContact|ẄContacts|Credits|Weë AI|Weë AI ›|Weë AI Engine|Weë Biz|Weë Studio|Studio|Weë Design|Design|Writer|WEE|Biz|Flow|Media|Reposts|Likes|Email|Avatares|OK|IA|AI|Weë v1\.0\.0|World Encode Entity)$/;
  const TECNICO = /^(0\.00|S\/\.|https?:\/\/)/;
  const EXCEPCIONES = ['components/ErrorBoundary.tsx', 'components/HomeGreeting.tsx'];
  const RUIDO = /^(Promise|void|string|number|boolean|T|C|any|unknown|Post|View|Text|React|null|undefined|Props|Record|Partial)$/;

  const sueltos = [];
  for (const p of pantallas) {
    if (EXCEPCIONES.includes(p)) continue;
    const s = soloCodigo(leer(p));
    /* a) texto entre etiquetas: sin paréntesis, punto y coma ni igual */
    for (const m of s.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}();=]{1,80})\s*</g)) {
      const v = m[1].trim();
      if (!v || RUIDO.test(v) || MARCA.test(v) || TECNICO.test(v) || /^[\s\d./%·—-]+$/.test(v)) continue;
      sueltos.push(p + ' → ' + v);
    }
    /* b) lo que se lee en un atributo */
    for (const m of s.matchAll(/(placeholder|accessibilityLabel|accessibilityHint|accessibilityValue)=(?:"([^"]*)"|\{'([^']*)'\})/g)) {
      const v = m[2] ?? m[3];
      if (v && v.length > 1 && !MARCA.test(v) && !TECNICO.test(v)) sueltos.push(p + ' → ' + m[1] + '="' + v + '"');
    }
    /* c) una frase dentro de un aviso */
    for (const m of s.matchAll(/(Alert\.alert|notify|window\.confirm|confirmAction)\(([\s\S]{0,320}?)\)\s*;/g)) {
      for (const c of m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
        const v = c[1];
        if (v.length > 3 && /[a-záéíóúñ] [a-záéíóúñ]|[áéíóúñ¿¡]/i.test(v)) sueltos.push(p + ' → aviso: ' + v);
      }
    }
  }
  check('1) no queda ningún texto de interfaz escrito a mano', sueltos.length === 0,
    sueltos.slice(0, 12).join(' | ') + (sueltos.length > 12 ? ' … y ' + (sueltos.length - 12) + ' más' : ''));

  /* 2 · Y el parser no se está tragando nada: se comprueba con el caso que falló. */
  const AVATAR = leer('components/avatars/AvatarPicker.tsx');
  check('2) el parser no confunde una cadena con un comentario',
    /input\.accept = 'image\/\*'/.test(AVATAR)
    && /Alert\.alert\(t\('common\.error'\), t\('avatar\.pickFailed'/.test(soloCodigo(AVATAR)));
  check('2) ni un genérico de TypeScript con un texto',
    !/Promise/.test([...soloCodigo(leer('screens/PostDetailScreen.tsx'))
      .matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}();=]{1,80})\s*</g)].map((m) => m[1]).join(' ')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las once áreas grandes, una por una ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const AREAS = [
    ['el avatar con IA', 'screens/AiAvatarScreen.tsx', /t\('aiAvatar\./],
    ['el alta guiada', 'screens/OnboardingScreen.tsx', /t\('onboarding\./],
    ['el Perfil Weë', 'screens/WeeProfileCreationScreen.tsx', /t\('onboarding\.wee/],
    ['el directorio Biz', 'screens/WeeBizScreen.tsx', /t\('weebiz\./],
    ['una categoría Biz', 'screens/WeeBizCategoryScreen.tsx', /t\('weebiz\./],
    ['un perfil Biz', 'screens/WeeBizProfileScreen.tsx', /t\('weebiz\./],
    ['los productos Biz', 'screens/WeeBizProductsScreen.tsx', /t\('weebiz\./],
    ['el alta Biz', 'screens/WeeBizRegisterScreen.tsx', /t\('weebiz\./],
    ['Buscar', 'screens/SearchScreen.tsx', /t\('search\./],
    ['la comunidad', 'screens/CommunityScreen.tsx', /t\('communities\./],
    ['el perfil ajeno', 'screens/UserProfileScreen.tsx', /t\('profile\./],
    ['la publicación', 'screens/PostDetailScreen.tsx', /t\('wall\./],
    ['el Home', 'screens/LandingScreen.tsx', /t\('home\./],
    ['la Ayuda', 'screens/HelpScreen.tsx', /t\('help\./],
    ['el chat', 'screens/ChatScreen.tsx', /t\('weetalk\./],
    ['el editor', 'screens/WriterEditorScreen.tsx', /t\('writer\./],
  ];
  for (const [nombre, ruta, patron] of AREAS) {
    check('3) ' + nombre + ' pide sus claves', patron.test(leer(ruta)) && /useT\(\)|useIdioma\(\)/.test(leer(ruta)));
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Los catálogos guardan claves, no frases ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Un catálogo se importa FUERA de React, donde no hay traductor: si guardara
   * la frase, se congelaría el idioma del arranque. Guarda la clave y la
   * resuelve quien pinta. Y el identificador NO se toca: es lo que viaja al
   * servidor y lo que ya está guardado en los perfiles.
   */
  const AVATAR = leer('screens/AiAvatarScreen.tsx');
  check('4) los nueve catálogos del avatar guardan clave',
    (AVATAR.match(/clave: 'aiAvatar\./g) || []).length >= 35);
  check('4) y sus identificadores no se movieron',
    ["{ id: 'male'", "{ id: 'tone1'", "{ id: 'goatee'", "{ id: 'smile'", "{ id: 'oval'"]
      .every((i) => AVATAR.includes(i)));
  check('4) lo que viaja al servidor sigue siendo el identificador',
    /gender: selectedGender!/.test(AVATAR) && /expression: selectedExpression!/.test(AVATAR));
  check('4) y los rangos de edad siguen siendo cifras, no palabras',
    /\{ id: 'young', label: '18-30' \}/.test(AVATAR) && /renderChip\(opt\.id, opt\.label,/.test(AVATAR));

  const AYUDA = leer('screens/HelpScreen.tsx');
  check('5) las nueve preguntas de la Ayuda guardan clave',
    (AYUDA.match(/question: 'help\.q\d'/g) || []).length === 9
    && (AYUDA.match(/answer: 'help\.a\d'/g) || []).length === 9);
  check('5) y quien pinta las resuelve',
    /\{t\(item\.question\)\}/.test(AYUDA) && /\{t\(item\.answer\)\}/.test(AYUDA));
  check('5) el emoji de cada pregunta se copia tal cual', /\{item\.emoji\} \{t\(item\.question\)\}/.test(AYUDA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Lo que NO se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const BIZ = leer('screens/WeeBizProfileScreen.tsx') + leer('screens/WeeBizProductsScreen.tsx');
  check('6) el nombre de un negocio y el de un producto se pintan crudos',
    !/t\(\s*business\.|t\(\s*product\./.test(BIZ));
  check('6) y cuando una frase los nombra, entran por hueco',
    /t\('weebiz\.deleteProductConfirm', \{ nombre: product\.name \}\)/.test(BIZ)
    && /\{\{nombre\}\}/.test(esT.weebiz.deleteProductConfirm) && /\{\{nombre\}\}/.test(enT.weebiz.deleteProductConfirm));

  const BUSCAR = leer('screens/SearchScreen.tsx');
  check('7) lo que se escribe en el buscador no pasa por el traductor',
    !/t\(\s*(query|searchQuery|termino)/.test(BUSCAR));

  const AJENO = leer('screens/UserProfileScreen.tsx');
  check('8) el nombre y la biografía de quien miras se pintan crudos',
    !/t\([^)]*userProfile[?.]*\.(displayName|bio|username)/.test(AJENO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Los números y los plurales, como los dejó la 5O ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('9) el límite del avatar entra por hueco, no pegado',
    /t\('aiAvatar\.limitBody', \{ contador: MAX_AI_AVATAR_GENERATIONS \}\)/.test(leer('screens/AiAvatarScreen.tsx')));
  check('9) y el saldo pasa por el formato de Weë',
    /t\('aiAvatar\.creditsDetail', \{ saldo: formato\.numero\(short\.available\), coste: formato\.numero\(short\.required\) \}\)/
      .test(leer('screens/AiAvatarScreen.tsx')));
  check('10) los números siguen respetando el locale',
    ES('communities.members', { contador: 12400 }) === '12.400 miembros'
    && EN('communities.members', { contador: 12400 }) === '12,400 members');
  check('10) y los plurales siguen siendo de Intl.PluralRules',
    ES('wall.pollVotes', { contador: 1 }) === '1 voto' && EN('wall.pollVotes', { contador: 0 }) === '0 votes');
  const conLocale = pantallas.filter((p) => /toLocaleString\('e[sn]'\)/.test(leer(p)));
  check('11) ninguna pantalla clava el idioma en toLocaleString', conLocale.length === 0, conLocale.join(' · '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Ni un sistema paralelo, ni un término prohibido ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const todo = pantallas.map((p) => soloCodigo(leer(p))).join('\n');
  check('12) ningún ternario de idioma', !/(idioma|locale) === '(es|en)'\s*\?/.test(todo));
  check('12) ninguna otra librería de traducción', !/i18next|react-intl|formatjs|lingui/.test(pantallas.map(leer).join('\n')));
  check('12) ningún diccionario dentro de un componente', !/const (TEXTOS|TRADUCCIONES|STRINGS|LABELS|DICCIONARIO) = \{/.test(todo));

  /* 13 · Reels, hidi y WEË AI no pueden asomar: ni en el diccionario ni suelto. */
  const enDiccionario = [];
  for (const T of [esT, enT]) {
    for (const [m, ks] of Object.entries(T)) {
      for (const [k, v] of Object.entries(ks)) {
        if (/\bReels?\b|\bhidi\b|WEË AI/.test(v)) enDiccionario.push(m + '.' + k);
      }
    }
  }
  check('13) el diccionario no los enseña', enDiccionario.length === 0, enDiccionario.join(' · '));
  const enTexto = [];
  for (const p of pantallas) {
    for (const m of soloCodigo(leer(p)).matchAll(/>\s*([^<>{}();=]{2,80})\s*</g)) {
      if (/\bReels?\b|\bhidi\b|WEË AI/.test(m[1])) enTexto.push(p + ' → ' + m[1].trim());
    }
  }
  check('13) ni el texto suelto de ninguna pantalla', enTexto.length === 0, enTexto.join(' | '));
  check('14) y la marca correcta sí está donde toca',
    ES('menu.creator') === 'Weë AI' && EN('menu.creator') === 'Weë AI'
    && leer('utils/feedFilters.ts').includes("label: 'Weë Studio' }"));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · El diccionario, cuadrado de punta a punta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const modEs = Object.keys(esT).sort();
  const modEn = Object.keys(enT).sort();
  check('15) los mismos módulos en los dos idiomas — ' + modEs.length,
    JSON.stringify(modEs) === JSON.stringify(modEn));

  const descuadradas = [];
  let total = 0;
  for (const m of modEs) {
    for (const k of Object.keys(esT[m])) { total++; if (enT[m]?.[k] === undefined) descuadradas.push(m + '.' + k + ' (falta en inglés)'); }
    for (const k of Object.keys(enT[m] || {})) if (esT[m]?.[k] === undefined) descuadradas.push(m + '.' + k + ' (sobra en inglés)');
  }
  check('15) y las mismas claves — ' + total, descuadradas.length === 0, descuadradas.join(' · '));

  /* 16 · Todas las claves que el cliente pide existen. */
  const pedidas = new Set();
  for (const p of pantallas) {
    for (const m of soloCodigo(leer(p)).matchAll(/'([a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+)'/g)) {
      const [mod] = m[1].split('.');
      if (esT[mod]) pedidas.add(m[1]);
    }
  }
  const faltan = [...pedidas].filter((c) => {
    const [m, k] = c.split('.');
    return esT[m][k] === undefined && esT[m][k + '_one'] === undefined && esT[m][k + '_other'] === undefined;
  });
  check('16) todas las que pide el cliente existen — ' + pedidas.size, faltan.length === 0, faltan.join(' · '));

  /* 17 · Los cinco módulos nuevos, registrados en los dos índices. */
  for (const modulo of ['aiAvatar', 'onboarding', 'weebiz', 'search', 'help']) {
    for (const idioma of ['es', 'en']) {
      const indice = leer('i18n/textos/' + idioma + '/index.ts');
      check('17) ' + modulo + ' registrado en ' + idioma,
        new RegExp("import \\{ " + modulo + " \\} from './" + modulo + "';").test(indice)
        && new RegExp('^ {2}' + modulo + ',$', 'm').test(indice));
    }
  }

  /* 18 · Ninguna inglesa vacía, y ninguna con acentos que no sean marca. */
  const vacias = [];
  const conAcento = [];
  for (const m of modEn) {
    for (const [k, v] of Object.entries(enT[m])) {
      if (!String(v).trim()) vacias.push(m + '.' + k);
      const sinMarcas = String(v).replace(/Weë|Weël|Weëls|Wäll|ËContacts?|ẄContacts?|Résumé|café/g, '');
      if (/[áéíóúñ¿¡]/.test(sinMarcas)) conAcento.push(m + '.' + k + ' = ' + v);
    }
  }
  check('18) ninguna traducción inglesa está vacía', vacias.length === 0, vacias.join(' · '));
  check('18) y la inglesa está en inglés', conAcento.length === 0, conAcento.join(' · '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Control: lo cerrado antes sigue cerrado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('19) el perfil propio, Configuración y comunidades siguen igual',
    ES('profile.addCover') === 'Agregar portada' && EN('profile.addCover') === 'Add cover'
    && ES('settings.myCommunities') === 'Mis comunidades' && EN('communities.join') === 'Join');
  check('19) el acceso y el alta también',
    ES('auth.welcome') === 'Bienvenido a Weë' && EN('auth.createAccount') === 'Create your account');
  check('20) y sigue habiendo una sola clave de volver',
    Object.entries(esT).filter(([, m]) => typeof m.back === 'string').length === 1 && ES('common.back') === 'Volver');
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
