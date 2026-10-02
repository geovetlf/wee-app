#!/usr/bin/env node
/*
 * LOS DETECTORES DETERMINISTAS DEL REVISOR DE WEË — capa 2 del Quality Reviewer (docs/REVISION.md).
 *
 *   node ops/revision/detectores.mjs [--base <commit>] [--json <archivo>] [--sarif <archivo>]
 *                                    [--solo <reglas>] [--archivos a,b] [--raiz <dir>] [--baseline <archivo>]
 *
 * Lee los archivos que sigue git (incluidos los `git add -N`), salvo node_modules, functions/lib,
 * data/citiesWorld.ts y los espejos generados (cabecera «GENERADO»: en esos solo se mira la higiene de imports),
 * los parsea con TypeScript y aplica el catálogo de `reglas.mjs`. Sin IA, sin red, sin escribir en el repo salvo
 * los archivos de salida que se le pidan.
 *
 * Cada hallazgo tiene un `id` `<dominio>/<regla>/<ruta>#<ancla>`. El ancla es un SÍMBOLO del AST (la función,
 * método, clase o export que lo contiene; el `match` en las reglas de Firebase; `(archivo)` para lo que es del
 * archivo entero), NUNCA un número de línea: insertar líneas o mover la función no cambia el id. Si hay varios en
 * la misma ancla, se añade `@<huella corta>` (derivado del contenido) y solo si dos son idénticos, `~2`, `~3`.
 * La `huella` es el sha256 del fragmento sin comentarios ni espacios repetidos.
 *
 * Con `--base` se activan las reglas que comparan (cruzar las 1000 líneas, reglas de Firebase peligrosas) y los
 * DISPARADORES de frontera (no son hallazgos: avisan al selector de que alguien tiene que mirar).
 *
 * El detector no decide si algo bloquea: eso es la baseline (`baseline.mjs`). Sale con 0 salvo error (2).
 */
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import {
  RAIZ_POR_DEFECTO, archivosSeguidos, existeCommit, huellaDe, sha256, esCodigo, esDeclaracion, esTest, esServidor,
  esCliente, esSoloNativo, excluido, esGenerado, contarLineas, corto, leerArgumentos, lista, escribirJson,
} from './comun.mjs';
import { REGLAS, reglaPorId, dentroDeSolo, versionesDeReglas, LIMITE_DE_LINEAS } from './reglas.mjs';
import { compararConBase, anclasDeReglas, carpetaDe, exportsDe, leerDiff } from './frontera.mjs';
import { hostsDeProveedores, patronDeHosts, puedeNombrarProveedores, SDKS_DE_IA, HOSTS_DE_SDKS } from './hosts-de-proveedores.mjs';
import {
  parsear, importsDe, nombresUsadosComoValor, esDeValor, resolver, esRelativo, componentesFuertes, cicloDesde,
  refinarConComprobador, desenvolver, lineaDe,
} from './grafo.mjs';

export const VERSION = 1;
export { LIMITE_DE_LINEAS, contarLineas, anclasDeReglas, carpetaDe, exportsDe, leerDiff };

/* ── anclas ──────────────────────────────────────────────────────────────── */

const nombreDe = (n) => {
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return n.text;
  return n.getText().replace(/\s+/g, '');
};

const RE_ENVOLTORIO_DE_FUNCION = /^(React\.)?(memo|forwardRef|useCallback|useMemo)$|^with[A-Z]/;

/**
 * ¿La expresión es una función o clase (también envuelta: `memo(() => …)`, `useCallback(…)`, `withAlgo(…)`)?
 * Una llamada cualquiera con un callback (`setInterval(() => …)`) NO da nombre al ancla.
 */
const esFuncionOClase = (e) => {
  e = desenvolver(e);
  if (!e) return false;
  if (ts.isArrowFunction(e) || ts.isFunctionExpression(e) || ts.isClassExpression(e)) return true;
  if (ts.isCallExpression(e)) {
    const nombre = ts.isIdentifier(e.expression) || ts.isPropertyAccessExpression(e.expression) ? e.expression.getText() : '';
    return RE_ENVOLTORIO_DE_FUNCION.test(nombre) && e.arguments.some(esFuncionOClase);
  }
  return false;
};

const esDeModulo = (decl) => ts.isVariableDeclarationList(decl.parent) && ts.isVariableStatement(decl.parent.parent) && ts.isSourceFile(decl.parent.parent.parent);

/**
 * El símbolo estable que contiene a un nodo: `Clase.metodo`, `useAlgo`, `servicio.cargar`, `default`… o
 * `(modulo)` si está suelto en el archivo. Nunca una línea.
 */
export const anclaDe = (nodo) => {
  const partes = [];
  for (let n = nodo; n && !ts.isSourceFile(n); n = n.parent) {
    if ((ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n) || ts.isClassExpression(n) || ts.isFunctionExpression(n)) && n.name) partes.push(n.name.text);
    else if (ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isPropertyDeclaration(n)) partes.push(nombreDe(n.name));
    else if (ts.isConstructorDeclaration(n)) partes.push('constructor');
    else if (ts.isPropertyAssignment(n) && esFuncionOClase(n.initializer)) partes.push(nombreDe(n.name));
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && (esFuncionOClase(n.initializer) || esDeModulo(n))) partes.push(n.name.text);
    else if (ts.isExportAssignment(n)) partes.push('default');
  }
  return partes.length ? partes.reverse().join('.') : '(modulo)';
};

/* ── ayudantes de AST para las reglas ────────────────────────────────────── */

const esFuncion = (n) => n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n));

const nombreDeLlamada = (call, sf) => {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.getText(sf).replace(/\s+/g, '');
  return null;
};

const esGlobal = (call, nombre) => {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text === nombre;
  return ts.isPropertyAccessExpression(e) && e.name.text === nombre && ts.isIdentifier(e.expression)
    && ['window', 'global', 'globalThis'].includes(e.expression.text);
};

const normalizarObjetivo = (e, sf) => desenvolver(e).getText(sf).replace(/\s+/g, '').replace(/!/g, '').replace(/^this\./, '');

/** La cadena de métodos de una expresión, de dentro afuera: `db.collection('a').where().get` → [collection, where]. */
const cadenaDeMetodos = (expr) => {
  const nombres = [];
  let e = expr;
  for (;;) {
    e = desenvolver(e);
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) { nombres.push(e.expression.name.text); e = e.expression.expression; }
    else if (ts.isCallExpression(e)) e = e.expression;
    else if (ts.isPropertyAccessExpression(e)) e = e.expression;
    else if (ts.isAwaitExpression(e)) e = e.expression;
    else break;
  }
  return nombres.reverse();
};

/** «Frase»: al menos dos palabras con letras (dos letras seguidas cada una). */
export const esFrase = (texto) => String(texto).split(/\s+/).filter((p) => /\p{L}{2,}/u.test(p)).length >= 2;

const esLlamadaQueNoMuestra = (call, sf) => {
  const nombre = nombreDeLlamada(call, sf) || '';
  return /^(t|traducir\w*)$/.test(nombre) || /^console\./.test(nombre) || /\.t$/.test(nombre);
};

/** Las frases escritas a mano dentro de unos argumentos (sin entrar en `t(…)` ni en `console.*`). */
const frasesEn = (nodos, sf) => {
  const res = [];
  const visitar = (x) => {
    if (ts.isCallExpression(x) && esLlamadaQueNoMuestra(x, sf)) return;
    if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) { if (esFrase(x.text)) res.push(x.text); return; }
    if (ts.isTemplateExpression(x)) {
      const texto = [x.head.text, ...x.templateSpans.map((s) => s.literal.text)].join(' … ');
      if (esFrase(texto)) res.push(texto);
      for (const s of x.templateSpans) visitar(s.expression);
      return;
    }
    ts.forEachChild(x, visitar);
  };
  nodos.forEach(visitar);
  return res;
};

// La web se pregunta con `Platform.OS` o con una constante `isWeb`/`esWeb` (utils/notify.ts, ProjectScreen).
const RE_NO_WEB = /Platform\.OS\s*!==?\s*['"]web['"]|^\s*!\s*(isWeb|esWeb|IS_WEB|ES_WEB)\s*$/;
const RE_NATIVO = /Platform\.OS\s*===?\s*['"](ios|android)['"]/;
const RE_WEB = /Platform\.OS\s*===?\s*['"]web['"]|^\s*(isWeb|esWeb|IS_WEB|ES_WEB)\s*$/;

const terminaSaliendo = (st) => {
  if (!st) return false;
  if (ts.isReturnStatement(st) || ts.isThrowStatement(st)) return true;
  return ts.isBlock(st) && st.statements.some((s) => ts.isReturnStatement(s) || ts.isThrowStatement(s));
};

/**
 * ¿Este nodo solo corre fuera de la web? Dentro de `if (Platform.OS !== 'web')`, de `if (Platform.OS === 'ios')`,
 * del `else` de `if (Platform.OS === 'web')`, de `Platform.OS !== 'web' && …`, o después de un
 * `if (Platform.OS === 'web') { …; return; }` en el mismo bloque o en uno que lo contiene.
 */
const soloFueraDeLaWeb = (nodo, sf) => {
  for (let n = nodo; n.parent && !ts.isSourceFile(n); n = n.parent) {
    const p = n.parent;
    if (ts.isIfStatement(p)) {
      const c = p.expression.getText(sf);
      if (n === p.thenStatement && (RE_NO_WEB.test(c) || RE_NATIVO.test(c))) return true;
      if (n === p.elseStatement && RE_WEB.test(c)) return true;
    }
    if (ts.isConditionalExpression(p)) {
      const c = p.condition.getText(sf);
      if (n === p.whenTrue && (RE_NO_WEB.test(c) || RE_NATIVO.test(c))) return true;
      if (n === p.whenFalse && RE_WEB.test(c)) return true;
    }
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && n === p.right) {
      const c = p.left.getText(sf);
      if (RE_NO_WEB.test(c) || RE_NATIVO.test(c)) return true;
    }
    if (ts.isBlock(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) {
      const hermanos = p.statements;
      const i = hermanos.indexOf(n);
      for (let k = 0; k < i; k++) {
        const s = hermanos[k];
        if (ts.isIfStatement(s) && !s.elseStatement && RE_WEB.test(s.expression.getText(sf)) && terminaSaliendo(s.thenStatement)) return true;
      }
    }
  }
  return false;
};

const RE_ENVOLTORIO = /^(noLanza|acepta|sinLanzar|noRechaza|resuelve)/i;

const nombreDeFuncion = (f) => {
  if (f.name && ts.isIdentifier(f.name)) return f.name.text;
  const p = f.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  return null;
};

/** ¿El `check(…, true)` está dentro de un envoltorio que decide (try, if/else, ?:, noLanza, acepta…)? */
const dentroDeEnvoltorio = (nodo, sf) => {
  for (let n = nodo; n.parent && !ts.isSourceFile(n); n = n.parent) {
    const p = n.parent;
    if (ts.isTryStatement(p) && n === p.tryBlock) return true;
    if (ts.isIfStatement(p) && p.elseStatement && (n === p.thenStatement || n === p.elseStatement)) return true;
    if (ts.isConditionalExpression(p) && (n === p.whenTrue || n === p.whenFalse)) return true;
    if (esFuncion(n)) {
      const nombre = nombreDeFuncion(n);
      if (nombre && RE_ENVOLTORIO.test(nombre)) return true;
      if (ts.isCallExpression(p) && p.arguments.includes(n) && RE_ENVOLTORIO.test(nombreDeLlamada(p, sf) || '')) return true;
    }
  }
  return false;
};

/** ¿La condición es una cadena de `||` con un `true` literal? */
const tieneOTrue = (e) => {
  e = desenvolver(e);
  if (!e || !ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.BarBarToken) return false;
  return desenvolver(e.right).kind === ts.SyntaxKind.TrueKeyword || desenvolver(e.left).kind === ts.SyntaxKind.TrueKeyword
    || tieneOTrue(e.left) || tieneOTrue(e.right);
};

/* ── las reglas de un archivo (un solo recorrido del AST) ────────────────── */

const crudo = (sf, ruta, regla, nodo, mensaje, extra = {}) => {
  const texto = nodo ? nodo.getText(sf) : '';
  return {
    regla,
    ruta,
    ancla: extra.ancla ?? (nodo ? anclaDe(nodo) : '(archivo)'),
    severidad: extra.severidad ?? reglaPorId.get(regla).severidad,
    mensaje,
    huella: extra.huella ?? huellaDe(extra.huellaTexto ?? texto, { codigo: extra.codigo ?? true }),
    linea: extra.linea ?? (nodo ? lineaDe(sf, nodo) : 1),
    fragmento: corto(extra.fragmento ?? texto),
    ...(extra.cuenta !== undefined ? { cuenta: extra.cuenta } : {}),
    ...(extra.relacionados ? { relacionados: extra.relacionados } : {}),
  };
};

const revisarArchivo = (sf, info, ctx) => {
  const { ruta } = info;
  const res = [];
  const anadir = (regla, nodo, mensaje, extra) => { if (ctx.activa(regla)) res.push(crudo(sf, ruta, regla, nodo, mensaje, extra)); };

  // Higiene: también en los generados (un espejo que importa algo que no está en git rompe igual).
  for (const imp of info.importsConNodo) {
    const r = imp.resolucion;
    if (!r || (r.estado !== 'sin-seguimiento' && r.estado !== 'inexistente')) continue;
    anadir('higiene/import-sin-seguimiento', imp.nodo, r.estado === 'inexistente'
      ? `«${imp.especificador}» no resuelve a ningún archivo`
      : `«${imp.especificador}» resuelve a ${r.rutas.join(', ')}, que git no sigue (falta \`git add\`)`);
  }
  if (info.generado) return res;

  const cliente = esCliente(ruta);
  const servidor = esServidor(ruta) && !esTest(ruta);
  const test = esTest(ruta);
  const esTs = /\.[cm]?tsx?$/.test(ruta) && !esDeclaracion(ruta);
  const zonaI18n = cliente && /^(hooks|contexts|services|utils)\//.test(ruta);
  const vigilaIa = !test && !ruta.startsWith('ops/revision/') && !puedeNombrarProveedores(ruta);

  if (info.lineas > LIMITE_DE_LINEAS && !esDeclaracion(ruta)) {
    anadir('tamano/archivo-mil-lineas', null, `${info.lineas} líneas (límite ${LIMITE_DE_LINEAS})`,
      { ancla: '(archivo)', huellaTexto: ruta, codigo: false, fragmento: `${info.lineas} líneas` });
  }

  if (vigilaIa) {
    for (const imp of info.importsConNodo) {
      if (SDKS_DE_IA.some((s) => imp.especificador === s || imp.especificador.startsWith(`${s}/`))) {
        anadir('ia/host-fuera-de-adaptador', imp.nodo, `importa el SDK de IA «${imp.especificador}» fuera de un adaptador`);
      }
    }
  }

  let anys = 0;
  const intervalos = [];
  const efectos = [];
  const limpiezasDelArchivo = new Set();
  const funcionesPorNombre = new Map();

  const visitar = (n) => {
    if (n.kind === ts.SyntaxKind.AnyKeyword) anys++;

    if (vigilaIa && ctx.reHosts && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n)
      || ts.isTemplateMiddle(n) || ts.isTemplateTail(n))
      && !(n.parent && (ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent)))) {
      const m = n.text.match(ctx.reHosts);
      if (m) anadir('ia/host-fuera-de-adaptador', n, `nombra el host de IA «${m[0]}» fuera de un adaptador`);
    }

    if (ts.isFunctionDeclaration(n) && n.name && n.body) funcionesPorNombre.set(n.name.text, n.body);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      let f = desenvolver(n.initializer);
      if (f && ts.isCallExpression(f)) f = f.arguments.map(desenvolver).find(esFuncion);
      if (f && esFuncion(f)) funcionesPorNombre.set(n.name.text, f.body);
    }

    if ((cliente || servidor) && ts.isCatchClause(n) && n.block.statements.length === 0) {
      const comentado = /\/\/|\/\*/.test(n.block.getText(sf));
      anadir('errores/catch-traga', n, `catch vacío${comentado ? ' (solo un comentario)' : ''}: el error desaparece`, { severidad: servidor ? 'media' : 'baja' });
    }

    if (zonaI18n && ts.isThrowStatement(n) && n.expression) {
      const e = desenvolver(n.expression);
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && /^(Error|TypeError|RangeError)$/.test(e.expression.text)) {
        for (const frase of frasesEn(e.arguments || [], sf)) {
          anadir('i18n/texto-a-mano-fuera-de-pantallas', n, `frase escrita a mano en throw new ${e.expression.text}: «${corto(frase, 60)}»`,
            { severidad: 'baja', huellaTexto: `throw|${frase}`, codigo: false, fragmento: `throw new ${e.expression.text}(${JSON.stringify(frase)})` });
        }
      }
    }

    if (ts.isCallExpression(n)) {
      const nombre = nombreDeLlamada(n, sf);

      if (cliente && !esSoloNativo(ruta) && nombre === 'Alert.alert' && n.arguments.length >= 3 && !soloFueraDeLaWeb(n, sf)) {
        anadir('web/alert-con-botones', n, 'Alert.alert con botones: en la web no muestra nada y los botones no corren (usar notify/confirmAction de utils/notify.ts)');
      }
      /* Sin lista de botones: no hay trabajo que se pierda, pero el aviso tampoco se ve en la web (cierre 2026-10-01). */
      if (cliente && !esSoloNativo(ruta) && nombre === 'Alert.alert' && n.arguments.length < 3 && !soloFueraDeLaWeb(n, sf)) {
        anadir('web/alert-sin-boton', n, 'Alert.alert sin manejadores: en la web es una función vacía y el aviso no se ve (usar notify de utils/notify.ts)');
      }

      if (zonaI18n && nombre && (/^set[A-Z]/.test(nombre) || nombre === 'Alert.alert' || nombre === 'notify')) {
        for (const frase of frasesEn(n.arguments, sf)) {
          anadir('i18n/texto-a-mano-fuera-de-pantallas', n, `frase escrita a mano en ${nombre}(…): «${corto(frase, 60)}»`,
            { severidad: 'media', huellaTexto: `${nombre}|${frase}`, codigo: false, fragmento: `${nombre}(${JSON.stringify(frase)})` });
        }
      }

      if ((cliente || servidor) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'catch' && n.arguments.length === 1) {
        const f = desenvolver(n.arguments[0]);
        if (f && (ts.isArrowFunction(f) || ts.isFunctionExpression(f))) {
          const cuerpo = ts.isBlock(f.body) ? null : desenvolver(f.body);
          const traga = ts.isBlock(f.body) ? f.body.statements.length === 0
            : (cuerpo.kind === ts.SyntaxKind.NullKeyword || ts.isVoidExpression(cuerpo) || (ts.isIdentifier(cuerpo) && cuerpo.text === 'undefined'));
          if (traga) {
            anadir('errores/catch-traga', n, `.catch(${corto(f.getText(sf), 40)}): el error desaparece`,
              { severidad: servidor ? 'media' : 'baja', fragmento: `….catch(${f.getText(sf)})` });
          }
        }
      }

      if (cliente && nombre === 'getDocs' && n.arguments[0]) {
        const a = desenvolver(n.arguments[0]);
        if (ts.isCallExpression(a) && ts.isIdentifier(a.expression)) {
          const que = a.expression.text;
          const conLimite = a.arguments.some((x) => {
            const y = desenvolver(x);
            return ts.isCallExpression(y) && ts.isIdentifier(y.expression) && /^limit(ToLast)?$/.test(y.expression.text);
          });
          if (que === 'collection' || que === 'collectionGroup' || (que === 'query' && !conLimite)) {
            anadir('escala/consulta-sin-limite', n, `getDocs(${que}(…)) sin limit(): lee la colección entera`);
          }
        }
      }

      if (servidor && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'get' && n.arguments.length === 0) {
        const cadena = cadenaDeMetodos(n.expression.expression);
        const i = Math.max(cadena.lastIndexOf('collection'), cadena.lastIndexOf('collectionGroup'));
        if (i >= 0) {
          const despues = cadena.slice(i + 1);
          if (!despues.includes('doc') && !despues.some((m) => /^(limit|limitToLast|count)$/.test(m))) {
            anadir('escala/consulta-sin-limite', n, `.${cadena[i]}(…)${despues.map((m) => `.${m}(…)`).join('')}.get() sin .limit(): lee la colección entera`,
              { fragmento: corto(n.getText(sf), 120) });
          }
        }
      }

      if (cliente && (nombre === 'useEffect' || nombre === 'useLayoutEffect' || nombre === 'React.useEffect' || nombre === 'React.useLayoutEffect')) {
        const cb = desenvolver(n.arguments[0]);
        if (cb && esFuncion(cb)) efectos.push(cb);
      }
      if (cliente && esGlobal(n, 'setInterval')) {
        let p = n.parent;
        while (p && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p))) p = p.parent;
        let objetivo = null;
        if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) objetivo = p.name.text;
        else if (p && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken) objetivo = normalizarObjetivo(p.left, sf);
        intervalos.push({ nodo: n, objetivo });
      }
      if (cliente && esGlobal(n, 'clearInterval') && n.arguments[0]) limpiezasDelArchivo.add(normalizarObjetivo(n.arguments[0], sf));

      if (test && ts.isIdentifier(n.expression) && n.expression.text === 'check' && n.arguments.length >= 2) {
        const cond = desenvolver(n.arguments[1]);
        if (cond.kind === ts.SyntaxKind.TrueKeyword && !dentroDeEnvoltorio(n, sf)) {
          anadir('tests/aserto-siempre-verdadero', n, 'check(…, true) con `true` literal: la comprobación no puede fallar');
        } else if (tieneOTrue(cond)) {
          anadir('tests/aserto-siempre-verdadero', n, '`|| true` en la condición de un check: la comprobación no puede fallar');
        }
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);

  if (esTs && anys > 0) {
    anadir('tipos/any', null, `${anys} \`any\` en el archivo`, { ancla: '(archivo)', cuenta: anys, huellaTexto: ruta, codigo: false, fragmento: `${anys} any` });
  }

  if (intervalos.length && ctx.activa('react/intervalo-sin-limpieza')) {
    // Las funciones de limpieza: lo que devuelve el callback de cada useEffect (y una función con nombre a la que
    // llama, hasta dos saltos), sin entrar en funciones anidadas que no son la devuelta. Por EFECTO: un `id`
    // limpiado en un efecto no tapa otro `id` que se queda sin limpiar en el efecto de al lado.
    const recoger = (cuerpo, profundidad, limpios) => {
      const v = (x) => {
        if (ts.isCallExpression(x)) {
          if (esGlobal(x, 'clearInterval') && x.arguments[0]) limpios.add(normalizarObjetivo(x.arguments[0], sf));
          else if (ts.isIdentifier(x.expression) && funcionesPorNombre.has(x.expression.text) && profundidad < 2) recoger(funcionesPorNombre.get(x.expression.text), profundidad + 1, limpios);
        }
        ts.forEachChild(x, v);
      };
      v(cuerpo);
    };
    const limpiosPorEfecto = new Map();
    const limpiosDeTodos = new Set();
    for (const cb of efectos) {
      const limpios = new Set();
      if (!ts.isBlock(cb.body)) {
        const e = desenvolver(cb.body);
        if (esFuncion(e)) recoger(e.body, 0, limpios);
      } else {
        const v = (x) => {
          if (x !== cb.body && esFuncion(x)) return;
          if (ts.isReturnStatement(x) && x.expression) {
            const e = desenvolver(x.expression);
            if (esFuncion(e)) recoger(e.body, 0, limpios);
            else if (ts.isIdentifier(e) && funcionesPorNombre.has(e.text)) recoger(funcionesPorNombre.get(e.text), 0, limpios);
          }
          ts.forEachChild(x, v);
        };
        v(cb.body);
      }
      limpiosPorEfecto.set(cb, limpios);
      for (const l of limpios) limpiosDeTodos.add(l);
    }
    const efectoQueContiene = (nodo) => {
      for (let n = nodo.parent; n && !ts.isSourceFile(n); n = n.parent) if (limpiosPorEfecto.has(n)) return n;
      return null;
    };
    const conEfectos = efectos.length > 0;
    for (const { nodo, objetivo } of intervalos) {
      const propio = efectoQueContiene(nodo);
      const limpios = propio ? limpiosPorEfecto.get(propio) : conEfectos ? limpiosDeTodos : limpiezasDelArchivo;
      const limpio = objetivo && limpios.has(objetivo);
      if (!limpio) {
        anadir('react/intervalo-sin-limpieza', nodo, objetivo
          ? `setInterval guardado en «${objetivo}» que no llega a clearInterval en la limpieza de un useEffect`
          : 'setInterval cuyo identificador no se guarda: nadie puede pararlo');
      }
    }
  }
  return res;
};

/* ── ids estables ────────────────────────────────────────────────────────── */

const asignarIds = (crudos) => {
  const grupos = new Map();
  for (const h of crudos) {
    const base = `${h.regla}/${h.ruta}#${h.ancla}`;
    if (!grupos.has(base)) grupos.set(base, []);
    grupos.get(base).push(h);
  }
  const res = [];
  for (const [base, hs] of grupos) {
    if (hs.length === 1) { hs[0].id = base; res.push(hs[0]); continue; }
    hs.sort((a, b) => a.linea - b.linea);
    const vistos = new Map();
    for (const h of hs) {
      const corta = h.huella.slice(0, 10);
      const n = (vistos.get(corta) || 0) + 1;
      vistos.set(corta, n);
      h.id = `${base}@${corta}${n > 1 ? `~${n}` : ''}`;
      res.push(h);
    }
  }
  return res
    .map((h) => ({
      id: h.id, regla: h.regla, severidad: h.severidad, mensaje: h.mensaje, huella: h.huella, ancla: h.ancla,
      evidencia: { ruta: h.ruta, linea: h.linea, fragmento: h.fragmento },
      ...(h.cuenta !== undefined ? { cuenta: h.cuenta } : {}),
      ...(h.relacionados ? { relacionados: h.relacionados } : {}),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
};

/* ── el análisis completo ────────────────────────────────────────────────── */

const GRAFO = ['muerto/modulo-sin-importador', 'ciclos/import-ciclico'];

/**
 * Analiza el repositorio. Opciones: `raiz`, `base` (commit), `solo` (lista de reglas o dominios), `archivos`
 * (lista de rutas: solo se informa de esas; el grafo se construye entero si alguna regla lo necesita).
 */
export const analizar = (opciones = {}) => {
  const inicio = performance.now();
  const raiz = path.resolve(opciones.raiz || RAIZ_POR_DEFECTO);
  const base = opciones.base || null;
  const solo = opciones.solo || null;
  const foco = opciones.archivos ? new Set(opciones.archivos.map((r) => r.replace(/\\/g, '/'))) : null;
  const activa = (id) => dentroDeSolo(id, solo);
  const avisos = [];
  if (base && !existeCommit(raiz, base)) throw new Error(`la base «${base}» no es un commit de ${raiz}`);

  const seguidos = new Set(archivosSeguidos(raiz));
  let hosts;
  try { hosts = hostsDeProveedores(raiz); } catch {
    hosts = [...HOSTS_DE_SDKS];
    avisos.push('no hay carpeta de adaptadores (functions/src/engine/providers): solo se vigilan los hosts de los SDK');
  }
  const ctx = { raiz, activa, foco, reHosts: hosts.length ? patronDeHosts(hosts) : null };

  const conBase = Boolean(base);
  const necesitaGrafo = GRAFO.some(activa) || (conBase && activa('frontera/cambio'));
  const codigo = [...seguidos].filter((r) => esCodigo(r) && !excluido(r)).sort();
  const aLeer = necesitaGrafo || !foco ? codigo : codigo.filter((r) => foco.has(r));

  const infos = new Map();
  const crudos = [];
  for (const ruta of aLeer) {
    let texto;
    try { texto = fs.readFileSync(path.join(raiz, ruta), 'utf8'); } catch { continue; } // seguido, pero borrado en la copia de trabajo
    const sf = parsear(ruta, texto);
    const generado = esGenerado(texto);
    const usados = nombresUsadosComoValor(sf);
    const importsConNodo = importsDe(sf).map((imp) => ({
      ...imp,
      resolucion: esRelativo(imp.especificador) ? resolver(imp.relativoA || ruta, imp.especificador, seguidos, raiz) : null,
    }));
    const info = {
      ruta, generado, lineas: contarLineas(texto), importsConNodo,
    };
    if (!foco || foco.has(ruta)) crudos.push(...revisarArchivo(sf, info, ctx));
    // Lo que se guarda del archivo es un resumen sin AST: el grafo no necesita más.
    infos.set(ruta, {
      ruta, generado, lineas: info.lineas,
      imports: importsConNodo.map((imp) => ({
        especificador: imp.especificador, tipo: imp.tipo, pos: imp.nodo.pos, linea: imp.linea, resolucion: imp.resolucion,
        valor: esDeValor(imp, usados), nombresValor: (imp.nombres || []).map((n) => n.local).filter((l) => usados.has(l)),
      })),
    });
  }

  // Suites huérfanas.
  if (activa('tests/suite-huerfana')) {
    let script = null;
    try { script = JSON.parse(fs.readFileSync(path.join(raiz, 'functions/package.json'), 'utf8')).scripts?.test || ''; } catch {
      avisos.push('functions/package.json no se pudo leer: tests/suite-huerfana no se evaluó');
    }
    if (script !== null) {
      const piezas = new Set(script.split(/[\s"'&;|()]+/));
      for (const r of seguidos) {
        if (!/^functions\/test\/[^/]+\.test\.mjs$/.test(r) || (foco && !foco.has(r)) || !fs.existsSync(path.join(raiz, r))) continue;
        if (piezas.has(r.slice('functions/'.length))) continue;
        crudos.push({
          regla: 'tests/suite-huerfana', ruta: r, ancla: '(archivo)', severidad: reglaPorId.get('tests/suite-huerfana').severidad,
          mensaje: `${r.slice('functions/'.length)} no está en scripts.test de functions/package.json: nadie la ejecuta`,
          huella: huellaDe(r, { codigo: false }), linea: 1, fragmento: r.slice('functions/'.length), relacionados: ['functions/package.json'],
        });
      }
    }
  }

  // Grafo: aristas resueltas.
  const aristasTodas = new Map(); // ruta → Set (todas las clases de import: alcanzabilidad y frontera)
  const aristasValor = new Map(); // ruta → Set (solo valor, sin import(): ciclos)
  for (const [ruta, info] of infos) {
    if (!aristasTodas.has(ruta)) aristasTodas.set(ruta, new Set());
    if (!aristasValor.has(ruta)) aristasValor.set(ruta, new Set());
    for (const imp of info.imports) {
      if (imp.resolucion?.estado !== 'ok') continue;
      for (const destino of imp.resolucion.rutas) {
        aristasTodas.get(ruta).add(destino);
        if (imp.valor && infos.has(destino)) aristasValor.get(ruta).add(destino);
      }
    }
  }

  // Módulos sin importador.
  if (activa('muerto/modulo-sin-importador')) {
    const raicesCliente = ['App.tsx', 'App.ts', 'App.js', 'index.ts', 'index.js', 'index.tsx'].filter((r) => infos.has(r));
    const raicesServidor = ['functions/src/index.ts'].filter((r) => infos.has(r));
    const alcanzados = new Set();
    const cola = [...raicesCliente, ...raicesServidor];
    for (const r of cola) alcanzados.add(r);
    for (let i = 0; i < cola.length; i++) {
      for (const w of aristasTodas.get(cola[i]) || []) if (!alcanzados.has(w)) { alcanzados.add(w); cola.push(w); }
    }
    for (const [ruta, info] of infos) {
      if (alcanzados.has(ruta) || info.generado || esDeclaracion(ruta) || (foco && !foco.has(ruta))) continue;
      const lado = esCliente(ruta) ? (raicesCliente.length ? 'cliente' : null) : esServidor(ruta) && !esTest(ruta) ? (raicesServidor.length ? 'servidor' : null) : null;
      if (!lado) continue;
      crudos.push({
        regla: 'muerto/modulo-sin-importador', ruta, ancla: '(archivo)', severidad: reglaPorId.get('muerto/modulo-sin-importador').severidad,
        mensaje: `nadie llega a este módulo desde ${lado === 'cliente' ? raicesCliente.join(' / ') : raicesServidor.join(' / ')}`,
        huella: huellaDe(ruta, { codigo: false }), linea: 1, fragmento: ruta,
      });
    }
  }

  // Ciclos de valor (el comprobador de tipos decide lo dudoso).
  let ciclosSinRefinar = 0;
  if (activa('ciclos/import-ciclico')) {
    const resolverPrimero = (desde, spec) => (esRelativo(spec) ? resolver(desde, spec, seguidos, null).rutas[0] || null : null);
    let componentes = componentesFuertes(aristasValor);
    ciclosSinRefinar = componentes.length;
    if (componentes.length) {
      const miembros = [...new Set(componentes.flat())];
      const enComponente = new Map();
      componentes.forEach((c, i) => c.forEach((r) => enComponente.set(r, i)));
      const candidatas = [];
      for (const de of miembros) {
        for (const imp of infos.get(de).imports) {
          if (!imp.valor || !['import', 'reexport', 'reexport-todo'].includes(imp.tipo) || imp.resolucion?.estado !== 'ok') continue;
          for (const a of imp.resolucion.rutas) if (enComponente.get(a) === enComponente.get(de)) candidatas.push({ de, a, imp });
        }
      }
      const soloTipos = candidatas.length ? refinarConComprobador(raiz, miembros, candidatas, resolverPrimero) : new Set();
      // Una arista se va solo si TODOS los imports de valor que la forman resultaron ser de tipos.
      for (const de of miembros) {
        const quedan = new Set();
        for (const imp of infos.get(de).imports) {
          if (!imp.valor || imp.resolucion?.estado !== 'ok') continue;
          for (const a of imp.resolucion.rutas) if (infos.has(a) && !soloTipos.has(`${de}→${a}@${imp.pos}`)) quedan.add(a);
        }
        aristasValor.set(de, quedan);
      }
      componentes = componentesFuertes(aristasValor);
    }
    for (const comp of componentes) {
      const propios = comp.filter((r) => !infos.get(r).generado);
      if (!propios.length || (foco && !comp.some((r) => foco.has(r)))) continue;
      const ancla = propios[0];
      const ciclo = cicloDesde(ancla, comp, aristasValor);
      crudos.push({
        regla: 'ciclos/import-ciclico', ruta: ancla, ancla: '(ciclo)', severidad: reglaPorId.get('ciclos/import-ciclico').severidad,
        mensaje: `ciclo de imports de valor entre ${comp.length} módulo(s): ${ciclo.join(' → ')}`,
        huella: sha256(comp.join('\n')), linea: 1, fragmento: corto(ciclo.join(' → '), 200), relacionados: comp,
      });
    }
  }

  // Lo que compara con la base: cruzar las 1000 líneas, reglas de Firebase y disparadores de frontera.
  let disparadores = [];
  let cambios = [];
  if (conBase) {
    const r = compararConBase({ raiz, base, seguidos, infos, aristasTodas, activa, foco });
    crudos.push(...r.crudos);
    disparadores = r.disparadores;
    cambios = r.cambios;
  }

  const hallazgos = asignarIds(crudos.filter((h) => activa(h.regla)));
  const recuento = {};
  for (const r of REGLAS) if (r.tipo !== 'disparador' && activa(r.id)) recuento[r.id] = 0;
  for (const h of hallazgos) recuento[h.regla] = (recuento[h.regla] || 0) + 1;
  for (const r of REGLAS) if (r.requiereBase && !conBase && recuento[r.id] === 0) delete recuento[r.id];

  return {
    herramienta: 'wee-revision/detectores',
    version: VERSION,
    raiz,
    base,
    generado: new Date().toISOString(),
    duracionMs: Math.round(performance.now() - inicio),
    archivosAnalizados: infos.size,
    // Las reglas que de verdad corrieron (las que comparan con la base solo si hubo base): la baseline no da por
    // corregido lo que una regla que no corrió no pudo ver.
    reglas: Object.fromEntries(REGLAS.filter((r) => activa(r.id) && r.tipo !== 'disparador' && (!r.requiereBase || conBase)).map((r) => [r.id, r.version])),
    alcance: { solo, archivos: foco ? [...foco].sort() : null },
    recuento,
    hallazgos,
    disparadores,
    cambios,
    ciclosAntesDelComprobador: ciclosSinRefinar,
    avisos,
  };
};

/* ── línea de órdenes ────────────────────────────────────────────────────── */

const resumen = (r, clasificacion) => {
  const lineas = [];
  lineas.push(`Detectores de Weë — ${r.archivosAnalizados} archivos en ${(r.duracionMs / 1000).toFixed(1)} s${r.base ? ` (base ${r.base})` : ''}`);
  for (const [id, n] of Object.entries(r.recuento)) lineas.push(`  ${String(n).padStart(5)}  ${id}`);
  if (r.disparadores.length) {
    lineas.push(`Disparadores (${r.disparadores.length}):`);
    for (const d of r.disparadores) lineas.push(`  · ${d.tipo}: ${d.detalle}`);
  }
  if (clasificacion) lineas.push(`Baseline: ${Object.entries(clasificacion.porEstado).map(([e, n]) => `${e} ${n}`).join(' · ')}`);
  for (const a of r.avisos) lineas.push(`  aviso: ${a}`);
  return lineas.join('\n');
};

const principal = async () => {
  const args = leerArgumentos(process.argv.slice(2));
  const resultado = analizar({ raiz: args.raiz, base: args.base, solo: lista(args.solo), archivos: lista(args.archivos) });
  let clasificacion = null;
  const rutaBaseline = args.baseline ? path.resolve(args.baseline) : path.join(resultado.raiz, 'ops/revision/baseline.json');
  if (fs.existsSync(rutaBaseline)) {
    const { clasificarContraBaseline } = await import('./clasificacion.mjs');
    clasificacion = clasificarContraBaseline(resultado, rutaBaseline);
  }
  const salida = clasificacion ? { ...resultado, clasificacion: clasificacion.resultados.map(({ entradaBaseline, ...r }) => r) } : resultado;
  // `--json -` escribe el JSON en la salida estándar y nada más: así lo usan los revisores de solo lectura.
  if (args.json === '-') { console.log(JSON.stringify(salida, null, 2)); return; }
  if (args.json) escribirJson(args.json, salida);
  if (args.sarif) {
    const { aSarif } = await import('./sarif.mjs');
    escribirJson(args.sarif, aSarif(resultado, clasificacion));
  }
  console.log(resumen(resultado, clasificacion));
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => { console.error(`✘ ${e.message}`); process.exitCode = 2; });
}

export { versionesDeReglas };
