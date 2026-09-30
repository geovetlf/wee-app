/*
 * NI UN TEXTO DE INTERFAZ ESCRITO A MANO, TAMPOCO DENTRO DE UNA EXPRESIÓN.
 *
 * `i18n-phase6-migration` busca el texto entre dos etiquetas —`>Guardar<`— y en
 * unos pocos atributos. Se le escapaba todo lo que va dentro de una expresión:
 *
 *     {guardado ? '✓ Guardado' : 'Guardar'}
 *     {formatNumber(n)} Respuestas
 *     Alert.alert('Error', …)
 *     { title: '📸 Sube una foto de tu plato terminado' }
 *
 * Y así llegaron al japonés decenas de frases en español. Esta prueba no lee el
 * código con expresiones regulares: lo recorre con el ÁRBOL DE SINTAXIS de
 * TypeScript, y mira cada cadena donde de verdad se pinta —texto JSX, dentro
 * de `{…}`, en los atributos que se leen, en los avisos y en las propiedades
 * que acaban en pantalla—.
 *
 * Lo que queda fuera está en una lista CERRADA, cada cosa con su porqué:
 *   · los nombres de las rutas (`navigate('Create')`): son identificadores;
 *   · las marcas, que se escriben igual en todos los idiomas;
 *   · los archivos que no monta nadie: no llegan a ninguna pantalla;
 *   · `ErrorBoundary`, que tiene sus frases por diseño (una fila por
 *     diccionario, vigilada por `i18n.test.mjs`);
 *   · unas pocas cadenas que son DATOS y no interfaz, en `DATOS`.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Qué parece una frase en español para una persona ─────────────────────── */
const PALABRAS = /(?<![\p{L}])(el|la|los|las|de|del|para|con|una|un|que|por|más|sin|tu|tus|mi|mis|no|se|en|al|es|y|o|ya|hay|aquí|puedes|está|todo|todos|nuevo|nueva)(?![\p{L}])/iu;
const pareceEspanol = (s) => {
  const t = s.trim();
  if (t.length < 2) return false;
  /* Identificadores: en minúscula, o con signos de código. Una palabra con mayúscula («Crear») NO es un identificador. */
  if (/^(https?:|mailto:|rgba?\()/i.test(t) || /^#[0-9a-f]{3,8}$/i.test(t) || /^[a-z0-9_./:@#-]+$/.test(t) || /^[A-Za-z0-9]*[_./:@#][A-Za-z0-9_./:@#-]*$/.test(t)) return false;
  if (/^[\d\s.,:;%·•|/+\-–—()[\]{}<>=*!?¿¡"'`~^$€£₺¥￥→←↑↓✓✔✗×…]+$/.test(t)) return false;
  if (/[áéíóúñ¿¡ü]/i.test(t)) return true;
  if (/^[✓✔✨🤷📸 ]*[A-ZÁÉÍÓÚ][a-záéíóúñ]+$/.test(t) && t.replace(/[^\p{L}]/gu, '').length > 3) return true;
  /* Una frase de varias palabras que empieza con mayúscula —«Crear negocio», «Guardar cambios»— es texto, sea del idioma que sea. */
  if (/^[¡¿✓✔✨🤷📸 ]*[A-ZÁÉÍÓÚ][a-záéíóúñ]+( [a-záéíóúñ]+)+[.!?…:]?$/.test(t)) return true;
  return /[a-záéíóúñ]{2,} [a-záéíóúñ]{2,}/i.test(t) && PALABRAS.test(t);
};
const MARCA = /^(Weë|Weëls?|Wäll|WeeTalk|ËContacts?|ẄContacts?|Credits|Weë [A-Z][a-z]+|Weë AI Engine|WEË AI|World Encode Entity|OK|AI|IA|Studio|Brain|Design|Business|Chef|Travel|Music|Photo|Writer|Beauty|Biz|Flow|Aura)$/;

/*
 * Llamadas cuyo argumento es un IDENTIFICADOR y no una frase: navegación,
 * registro, estilos, expresiones regulares… y el propio traductor.
 */
/*
 * `new Error('…')` también: en la capa que se pinta, el mensaje de un error que
 * se lanza es para quien programa; lo que ve la persona lo decide quien lo
 * captura, con su clave (así lo hace, por ejemplo, `PostCard` con
 * `wall.shareFailed`).
 */
const LLAMADA_TECNICA = /^(console\.|require$|t$|tr$|traducir|crearTraductor|StyleSheet\.create|Platform\.select|RegExp$|new RegExp|.*\.navigate$|.*navigate[A-Z]\w*$|navigate[A-Z]?\w*$|goTab$|goHome$|isActive$|irARaiz$|renderItem$|.*\.includes$|.*\.startsWith$|.*\.endsWith$|.*\.getItem$|.*\.setItem$|.*\.removeItem$|.*\.push\(|useRoute$|.*\.addListener$|.*\.emit$|.*\.log$|.*\.warn$|.*\.error$|Error$)/;
const ATRIBUTO_TECNICO = /^(style|testID|nativeID|key|name|source|resizeMode|contentFit|keyboardType|autoCapitalize|autoComplete|textContentType|returnKeyType|accessibilityRole|pointerEvents|ellipsizeMode|behavior|mode|variant|icon|iconName|activeId|kind|tipo|cachePolicy|type|id|href|target|rel|dataSet|initialRouteName|nombre|breadcrumb|overline)$/;
const PROPIEDAD_TECNICA = /^(style|color|backgroundColor|borderColor|fontFamily|fontWeight|icon|iconName|id|key|name|screen|route|kind|tipo|type|variant|mode|clave|claveTipo|emoji|tono|url|uri|href|path|collection|codigo|locale|provider|model|capability|service|status|estado|origen|initialRouteName)$/i;

const contexto = (n) => {
  let p = n.parent; let hijo = n;
  for (let i = 0; i < 6 && p; i++, hijo = p, p = p.parent) {
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      const nombre = p.expression.getText();
      return LLAMADA_TECNICA.test(nombre) ? null : `llamada ${nombre}()`;
    }
    if (ts.isJsxAttribute(p)) return ATRIBUTO_TECNICO.test(p.name.getText()) ? null : `atributo ${p.name.getText()}`;
    if (ts.isJsxExpression(p) && hijo !== p) return 'JSX {…}';
    if (ts.isPropertyAssignment(p) && p.initializer === hijo) {
      const k = p.name.getText().replace(/['"]/g, '');
      return PROPIEDAD_TECNICA.test(k) ? null : `propiedad ${k}`;
    }
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isTypeNode(p) || ts.isCaseClause(p) || ts.isElementAccessExpression(p)) return null;
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return null;
  }
  return 'expresión';
};

/** Todas las cadenas sospechosas de un archivo: [línea, contexto, texto]. */
const sospechosas = (rel, fuente) => {
  const sf = ts.createSourceFile(rel, fuente, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hallados = [];
  const visitar = (n) => {
    let texto = null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) texto = n.text;
    else if (ts.isTemplateExpression(n)) texto = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join('{…}');
    else if (ts.isJsxText(n)) texto = n.text.trim() ? n.text : null;
    /* «{saldo} Credits» es una cifra y una marca: se compara con la marca sin el hueco. */
    if (texto !== null && pareceEspanol(texto.replace(/\{…\}/g, ' ')) && !MARCA.test(texto.replace(/\{…\}/g, '').trim())) {
      const ctx = ts.isJsxText(n) ? 'texto JSX' : contexto(n);
      if (ctx) hallados.push([sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, ctx, texto.replace(/\s+/g, ' ').trim()]);
    }
    if (texto !== null && !ts.isTemplateExpression(n)) return;
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return hallados;
};

/* ── Qué archivos llegan a una pantalla ────────────────────────────────────── */
const listar = (carpetas) => {
  const r = [];
  const andar = (d) => {
    const abs = path.resolve(RAIZ, d);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) andar(rel);
      else if (/\.tsx?$/.test(e.name)) r.push(rel);
    }
  };
  carpetas.forEach(andar);
  return r;
};
const CAPA = ['screens', 'components', 'navigation'];
const archivos = listar(CAPA);
/*
 * Un archivo que no importa nadie no se monta: su texto no lo ve ninguna
 * persona. Se calcula, no se escribe a mano: si mañana alguien lo importa,
 * esta prueba empieza a mirarlo sola.
 */
const todos = [...listar([...CAPA, 'hooks', 'contexts', 'utils', 'services', 'constants', 'i18n']), 'App.tsx'];
const importaciones = new Set();
for (const rel of todos) {
  if (!fs.existsSync(path.resolve(RAIZ, rel))) continue;
  const s = leer(rel);
  for (const [, ruta] of s.matchAll(/(?:from|import\()\s*['"](\.[^'"]+)['"]/g)) {
    importaciones.add(path.posix.normalize(path.posix.join(path.posix.dirname(rel), ruta)).replace(/\.(tsx?|js)$/, ''));
  }
}
const montado = (rel) => importaciones.has(rel.replace(/\.(tsx?)$/, '')) || importaciones.has(rel.replace(/\/index\.(tsx?)$/, ''));

/*
 * LOS NOMBRES DE LAS RUTAS son identificadores aunque parezcan palabras
 * («Create», «Home»). No se escriben aquí: se leen de las pantallas que declara
 * `navigation/`, así que una ruta nueva entra sola.
 */
const RUTAS = new Set(listar(['navigation']).flatMap((rel) =>
  [...leer(rel).matchAll(/name=["']([A-Za-z]+)["']|name: ["']([A-Za-z]+)["']/g)].map((m) => m[1] || m[2])));

/*
 * CADENAS QUE NO SON INTERFAZ, archivo por archivo y con su porqué. Lista
 * cerrada: añadir algo aquí exige escribir el motivo.
 */
const PERMITIDAS = new Map([
  ['screens/ConversationScreen.tsx', { cadenas: ['Foto única', '📷 Imagen', '🎤 Audio'],
    porque: 'marcas que se GUARDAN como contenido del último mensaje (una la exige firestore.rules); la bandeja las traduce al pintarlas con claveDeAvisoGuardado' }],
  ['screens/WeeBizProfileScreen.tsx', { cadenas: ['Usuario'],
    porque: 'nombre de respaldo que se GUARDA en participantsData de la conversación y en userName de la reseña: es dato, lo leen otras personas' }],
  ['components/avatars/AvatarPicker.tsx', { cadenas: ['Aria', 'Felix', 'Luna', 'Storm', 'Nova'],
    porque: 'nombres propios de los avatares predefinidos: se llaman igual en todos los idiomas' }],
  ['navigation/TabNavigator.tsx', { cadenas: ['Inicio', 'Buscar', 'Crear', 'Perfil'],
    porque: 'tabBarLabel de un navegador que no dibuja su barra (tabBar={() => null}); la barra que se ve es BarraInferior, que pide sus rótulos con t()' }],
  ['components/BarraInferior.tsx', { cadenas: ['Inicio', 'Buscar', 'Crear', 'Notificaciones'],
    porque: 'la propiedad `etiqueta` de DESTINOS no se pinta: el rótulo sale de t(destino.clave); las pruebas del Home la fijan como descripción interna' }],
  ['components/Header.tsx', { cadenas: ['Real'],
    porque: 'la píldora de identidad «Real | Weë» del encabezado: las pruebas del Home (69) y de accesibilidad (6) la fijan como nombre, igual que «Weë»; traducirla es una decisión de producto' }],
]);
const EXCLUIDOS = new Map([
  ['components/ErrorBoundary.tsx', 'sus frases viven en ella por diseño: tiene que sobrevivir a que reviente i18n (una fila por diccionario, prueba 41c de i18n.test.mjs)'],
]);

console.log('\n── A · El árbol de sintaxis encuentra lo que el ojo no ve ──');
{
  const CONTROL = `
    const A = () => (<View>
      <Text>{ok ? '✓ Guardado' : 'Guardar'}</Text>
      <Text>{formatNumber(n)} Respuestas</Text>
      <Boton titulo={'Crear negocio'} />
    </View>);
    Alert.alert('Error', 'No se pudo guardar el documento.');
    const x = { title: '📸 Sube una foto de tu plato terminado' };
    navigation.navigate('Create');
    const t2 = t('common.save');
    const marca = 'Weë Studio';`;
  const halladas = sospechosas('control.tsx', CONTROL).map(([, , texto]) => texto);
  const deben = ['✓ Guardado', 'Guardar', 'Respuestas', 'Crear negocio', 'Error', 'No se pudo guardar el documento.', '📸 Sube una foto de tu plato terminado'];
  const noDeben = ['Create', 'common.save', 'Weë Studio'];
  check('1) control: reconoce las siete formas en que se escondía el español',
    deben.every((d) => halladas.some((h) => h.includes(d.trim()))), halladas.join(' | '));
  check('2) control: y no confunde rutas, claves ni marcas con frases',
    noDeben.every((d) => !halladas.includes(d)), halladas.filter((h) => noDeben.includes(h)).join(' | ') || 'ninguna');
}

console.log('\n── B · La capa que se pinta, sin español escrito a mano ──');
{
  const noMontados = archivos.filter((rel) => !montado(rel) && !EXCLUIDOS.has(rel));
  const sueltos = [];
  for (const rel of archivos) {
    if (EXCLUIDOS.has(rel) || !montado(rel)) continue;
    const permitidas = PERMITIDAS.get(rel)?.cadenas || [];
    for (const [linea, ctx, texto] of sospechosas(rel, leer(rel))) {
      /*
       * Una ruta es un identificador… salvo donde se PINTA: «Home» también es el
       * nombre de una ruta, y por eso el cajón llegó a decir «Home» en japonés.
       */
      if (permitidas.includes(texto) || (RUTAS.has(texto) && !/^(texto JSX|atributo |llamada render)/.test(ctx))) continue;
      sueltos.push(`${rel}:${linea} [${ctx}] «${texto.slice(0, 60)}»`);
    }
  }
  check(`3) ninguna frase en español escrita a mano en ${archivos.length - noMontados.length} archivos montados`,
    sueltos.length === 0,
    sueltos.length ? `${sueltos.length} · ${sueltos.slice(0, 8).join(' | ')}` : 'limpio');
  console.log(`   (sin montar, no se miran: ${noMontados.join(', ') || 'ninguno'})`);
  check('4) las excepciones siguen existiendo y dicen por qué',
    [...EXCLUIDOS.keys(), ...PERMITIDAS.keys()].every((rel) => fs.existsSync(path.resolve(RAIZ, rel)))
    && [...EXCLUIDOS.values(), ...[...PERMITIDAS.values()].map((p) => p.porque)].every((porque) => porque.length > 20));
  check('5) los nombres de rutas se leen de la navegación, no de esta prueba', RUTAS.size > 10 && RUTAS.has('Create') && RUTAS.has('Main'),
    `${RUTAS.size} rutas`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
