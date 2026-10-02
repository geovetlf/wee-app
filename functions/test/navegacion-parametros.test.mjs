/**
 * LO QUE SE MANDA A UNA PANTALLA ES LO QUE ESA PANTALLA LEE.
 *
 *   node test/navegacion-parametros.test.mjs
 *
 * Dos rutas de la pila principal se habían separado de quien las usa:
 *
 *   · `Create` (el compositor). Desde una comunidad se abría con `{ communityId: … }` y un `(navigation as any)` que
 *     tapaba el error, pero el compositor solo lee `communitySlug` (CreateScreen, y la dirección /publicar); el botón
 *     del estado vacío ni siquiera mandaba la comunidad. Lo publicado desde una comunidad no quedaba en ella.
 *   · `CreatorFlow` (el flujo guiado de Weë AI). La ruta declaraba a mano una forma más pequeña que la que mandan las
 *     portadas y lee la pantalla —sin `editorDocId`, `creative`, `adjuntos` ni `workspace`—, y la pantalla lo tapaba
 *     con `(route.params || {}) as ContextoDeExperiencia`.
 *
 * Esta prueba usa el COMPROBADOR DE TIPOS de TypeScript: lee las claves que declara `MainStackParamList` para esas dos
 * rutas y mira, en TODA la app, cada llamada que las abre —`navigate`, `push`, `rootNavigate`, `irARaiz`, o
 * `navigate({ name, params })`—: ninguna puede mandar una clave que la ruta no declare, se escriba con `as any` o sin él.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const ts = require('typescript');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const listar = (d) => fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [`${d}/${e.name}`] : []));
const ARCHIVOS = ['screens', 'components', 'navigation', 'contexts', 'hooks', 'services', 'utils'].flatMap(listar).concat(['App.tsx']);
const tsconfig = ts.readConfigFile(path.resolve(raiz, 'tsconfig.json'), ts.sys.readFile).config;
const { options } = ts.parseJsonConfigFileContent(tsconfig, ts.sys, raiz);
const programa = ts.createProgram(ARCHIVOS.map((f) => path.resolve(raiz, f)), { ...options, noEmit: true, skipLibCheck: true });
const checker = programa.getTypeChecker();
const fuente = (rel) => programa.getSourceFile(path.resolve(raiz, rel));

/* ── Lo que declara la ruta ───────────────────────────────────────────────── */

const NAV = fuente('navigation/MainStackNavigator.tsx');
let lista = null;
ts.forEachChild(NAV, (n) => { if (ts.isTypeAliasDeclaration(n) && n.name.text === 'MainStackParamList') lista = n; });
const tipoLista = lista && checker.getTypeFromTypeNode(lista.type);
const declaradas = (ruta) => {
  const simbolo = tipoLista?.getProperty(ruta);
  if (!simbolo) return null;
  const tipo = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(simbolo, lista));
  return checker.getPropertiesOfType(tipo).map((s) => s.name);
};

/* ── Lo que se manda, llamada a llamada ──────────────────────────────────── */

const propiedadesDelTipo = (tipo) => {
  const t = checker.getNonNullableType(tipo);
  if (t.isUnion()) return [...new Set(t.types.flatMap(propiedadesDelTipo))];
  return checker.getPropertiesOfType(t).map((s) => s.name);
};
const clavesDe = (expr, src) => {
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr)) return clavesDe(expr.expression, src);
  if (!ts.isObjectLiteralExpression(expr)) return propiedadesDelTipo(checker.getTypeAtLocation(expr));
  return expr.properties.flatMap((p) => {
    if (ts.isSpreadAssignment(p)) return propiedadesDelTipo(checker.getTypeAtLocation(p.expression));
    return p.name ? [p.name.getText(src).replace(/^['"]|['"]$/g, '')] : [];
  });
};
const textoLiteral = (e) => (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : null);

/** Cada llamada de la app que abre `ruta`, con lo que manda. */
const llamadasA = (ruta) => {
  const halladas = [];
  for (const rel of ARCHIVOS) {
    const src = fuente(rel);
    if (!src) continue;
    const visitar = (n) => {
      if (ts.isCallExpression(n) && n.arguments.length) {
        const [primero, segundo] = n.arguments;
        const sitio = `${rel}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
        /* navigate('Ruta', params), push(…), rootNavigate(…), irARaiz(…) */
        if (textoLiteral(primero) === ruta) halladas.push({ sitio, rel, nodo: n, params: segundo, src });
        /* navigate({ name: 'Ruta', params }) */
        if (ts.isObjectLiteralExpression(primero)) {
          const nombre = primero.properties.find((p) => p.name && p.name.getText(src) === 'name');
          if (nombre && ts.isPropertyAssignment(nombre) && textoLiteral(nombre.initializer) === ruta) {
            const params = primero.properties.find((p) => p.name && p.name.getText(src) === 'params');
            halladas.push({ sitio, rel, nodo: n, params: params && ts.isPropertyAssignment(params) ? params.initializer : undefined, src });
          }
        }
      }
      ts.forEachChild(n, visitar);
    };
    visitar(src);
  }
  return halladas;
};

const sobrantes = (ruta) => {
  const permitidas = new Set(declaradas(ruta) || []);
  const llamadas = llamadasA(ruta);
  const malas = llamadas.flatMap(({ sitio, params, src }) => (params ? clavesDe(params, src) : [])
    .filter((k) => !permitidas.has(k)).map((k) => `${sitio} «${k}»`));
  return { llamadas, malas };
};

console.log('\n── A · El compositor (Create) ──');
{
  const permitidas = declaradas('Create');
  check('1) MainStackParamList declara la ruta Create', !!permitidas && permitidas.includes('communitySlug'), (permitidas || []).join(', '));
  const { llamadas, malas } = sobrantes('Create');
  check(`2) ninguna de las ${llamadas.length} llamadas que abren Create manda una clave que la ruta no declare`,
    llamadas.length >= 10 && malas.length === 0, malas.join(' · '));

  const desdeComunidad = llamadas.filter((l) => l.rel === 'screens/CommunityScreen.tsx');
  check('3) la comunidad abre el compositor desde sus dos botones', desdeComunidad.length === 2, String(desdeComunidad.length));
  check('4) y los dos mandan su communitySlug',
    desdeComunidad.length === 2 && desdeComunidad.every((l) => l.params && clavesDe(l.params, l.src).includes('communitySlug')),
    desdeComunidad.map((l) => `${l.sitio} ${l.params ? l.params.getText(l.src) : '(sin parámetros)'}`).join(' · '));
  const conAny = desdeComunidad.filter((l) => {
    const llamado = l.nodo.expression;
    const objeto = ts.isPropertyAccessExpression(llamado) ? llamado.expression : null;
    return !objeto || !ts.isIdentifier(objeto) || !!(checker.getTypeAtLocation(objeto).flags & ts.TypeFlags.Any);
  });
  check('5) sin `as any`: el compilador comprueba lo que manda la comunidad contra MainStackParamList',
    conAny.length === 0, conAny.map((l) => l.sitio).join(' · '));
  const errores = programa.getSemanticDiagnostics(fuente('screens/CommunityScreen.tsx'));
  check('6) y CommunityScreen compila sin errores', errores.length === 0,
    errores.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).slice(0, 2).join(' · '));

  /* Las dos puntas: el compositor lee esa clave, y la dirección web la sabe leer. */
  check('7) el compositor lee communitySlug', /routeParams\.communitySlug/.test(leer('screens/CreateScreen.tsx')));
  check('8) y la dirección /publicar también', /communitySlug: \(v: string\) =>/.test(leer('App.tsx').slice(leer('App.tsx').indexOf("path: 'publicar'"))));
}

console.log('\n── B · El flujo guiado de Weë AI (CreatorFlow) ──');
{
  const permitidas = declaradas('CreatorFlow');
  /* La forma declarada ES el contexto de las portadas: las mismas claves, ni una más ni una menos. */
  let contexto = null;
  ts.forEachChild(fuente('constants/weeWorkspaces.ts'), (n) => { if (ts.isInterfaceDeclaration(n) && n.name.text === 'ContextoDeExperiencia') contexto = n; });
  const delContexto = contexto ? checker.getPropertiesOfType(checker.getTypeAtLocation(contexto.name)).map((s) => s.name).sort() : [];
  check('9) la ruta CreatorFlow declara exactamente ContextoDeExperiencia',
    !!permitidas && delContexto.length > 0 && JSON.stringify([...permitidas].sort()) === JSON.stringify(delContexto),
    `${(permitidas || []).length} / ${delContexto.length}`);
  const { llamadas, malas } = sobrantes('CreatorFlow');
  check(`10) ninguna de las ${llamadas.length} llamadas que abren CreatorFlow manda una clave que la ruta no declare`,
    llamadas.length >= 8 && malas.length === 0, malas.join(' · '));

  const flujo = fuente('screens/CreatorFlowScreen.tsx');
  let conAs = 0;
  const visitar = (n) => {
    if ((ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) && /route\.params/.test(n.expression.getText(flujo))) conAs++;
    ts.forEachChild(n, visitar);
  };
  visitar(flujo);
  check('11) CreatorFlowScreen lee sus parámetros sin `as`', conAs === 0, String(conAs));
  /* Lo que la pantalla usa existe en lo declarado: sin el `as`, el compilador lo comprueba. */
  const usadas = [...new Set([...flujo.getFullText().matchAll(/\bparams\.([A-Za-z]+)/g)].map((m) => m[1]))];
  const noDeclaradas = usadas.filter((k) => !(permitidas || []).includes(k));
  check('12) todo lo que lee (params.…) está declarado en la ruta', usadas.length >= 6 && noDeclaradas.length === 0,
    `${usadas.join(', ')}${noDeclaradas.length ? ' — faltan: ' + noDeclaradas.join(', ') : ''}`);
  const errores = programa.getSemanticDiagnostics(flujo);
  check('13) y CreatorFlowScreen compila sin errores', errores.length === 0,
    errores.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).slice(0, 2).join(' · '));
}

/* CONTROL: la guarda ve el fallo. Una clave que la ruta no declara, aunque vaya con `as any`, se detecta. */
{
  const permitidas = new Set(declaradas('Create') || []);
  const control = ts.createSourceFile('c.tsx', "(navigation as any).navigate('Create', { communityId: 'x' });", ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let params = null;
  ts.forEachChild(control, function v(n) { if (!params && ts.isCallExpression(n) && textoLiteral(n.arguments[0]) === 'Create') params = n.arguments[1]; ts.forEachChild(n, v); });
  check('14) control: `{ communityId }` hacia Create se detecta aunque vaya con `as any`',
    !!params && clavesDe(params, control).some((k) => !permitidas.has(k)));
}

check('esta suite está en la cadena de `npm test`', /navegacion-parametros\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
