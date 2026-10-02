/*
 * EL GRAFO DE IMPORTS DE WEË — quién importa a quién, y si lo hace por VALOR o solo por tipos.
 *
 * Lo usan los detectores (higiene, módulos muertos, ciclos, aristas nuevas entre carpetas) y el selector
 * (importadores directos de lo que cambió). Se construye con el parser de TypeScript, archivo a archivo, sin
 * compilar el proyecto entero: así el repositorio completo cabe en segundos.
 *
 * Resolución (la de Metro y la de Node a la vez, sin alias porque Weë no los usa):
 *   - solo especificadores relativos (`./`, `../`); los paquetes no son del repositorio;
 *   - `./x` prueba la ruta exacta, luego `.js → .ts` (ESM de TypeScript), luego `x{,.web,.native,.ios,.android}.<ext>`
 *     y por último `x/index…`; dentro del primer nivel que encuentra algo se queda con TODAS las variantes de
 *     plataforma, porque Metro elige una en la web y otra en el teléfono y las dos están vivas;
 *   - lo que sale del build (`functions/lib/`, `dist/`) no se exige en git: lo produce el build.
 *
 * Imports de solo tipos: `import type`, `export type … from`, los especificadores `type` y —esto es lo que
 * importa para los ciclos— los imports normales cuyos nombres solo aparecen en posiciones de tipo (TypeScript y
 * Babel los borran al compilar). Lo que el análisis sintáctico no puede decidir (`export * from`, `export { X }
 * from`, un nombre importado que se reexporta) lo decide el COMPROBADOR DE TIPOS de TypeScript, en un programa
 * mínimo con solo los archivos del ciclo (`refinarConComprobador`).
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/* ── parseo ──────────────────────────────────────────────────────────────── */

export const tipoDeScript = (ruta) => {
  if (/\.tsx$/.test(ruta)) return ts.ScriptKind.TSX;
  if (/\.[cm]?ts$/.test(ruta)) return ts.ScriptKind.TS;
  if (/\.jsx$/.test(ruta)) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
};

export const parsear = (ruta, texto) => ts.createSourceFile(ruta, texto, ts.ScriptTarget.Latest, true, tipoDeScript(ruta));

export const lineaDe = (sf, nodo) => sf.getLineAndCharacterOfPosition(nodo.getStart(sf)).line + 1;

/** Quita paréntesis, `as`, `satisfies`, `!` y aserciones de tipo alrededor de una expresión. */
export const desenvolver = (e) => {
  while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)
    || ts.isTypeAssertionExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
  return e;
};

const textoDeEspecificador = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

/* ── imports de un archivo ───────────────────────────────────────────────── */

/**
 * Todos los imports de un archivo: `{ especificador, tipo, nodo, linea, nombres }`.
 * Tipos: 'import' (con nombres), 'tipo' (solo tipos, declarado), 'efecto' (`import './x'`), 'reexport'
 * (`export … from`), 'reexport-todo' (`export * from`), 'require', 'dinamico' (`import()`).
 */
export const importsDe = (sf) => {
  const res = [];
  const anadir = (especificador, tipo, nodo, extra = {}) => res.push({ especificador, tipo, nodo, linea: lineaDe(sf, nodo), ...extra });
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const spec = textoDeEspecificador(st.moduleSpecifier);
      if (spec === null) continue;
      const clausula = st.importClause;
      if (!clausula) { anadir(spec, 'efecto', st); continue; }
      const nombres = [];
      if (clausula.name) nombres.push({ local: clausula.name.text, nodo: clausula.name });
      const nb = clausula.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) nombres.push({ local: nb.name.text, nodo: nb.name });
      if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) if (!el.isTypeOnly) nombres.push({ local: el.name.text, nodo: el.name });
      const soloTipo = clausula.isTypeOnly || nombres.length === 0;
      anadir(spec, soloTipo ? 'tipo' : 'import', st, { nombres });
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
      const spec = textoDeEspecificador(st.moduleSpecifier);
      if (spec === null) continue;
      const ec = st.exportClause;
      if (st.isTypeOnly || (ec && ts.isNamedExports(ec) && ec.elements.length > 0 && ec.elements.every((e) => e.isTypeOnly))) anadir(spec, 'tipo', st);
      else if (!ec) anadir(spec, 'reexport-todo', st);
      else anadir(spec, 'reexport', st);
    } else if (ts.isImportEqualsDeclaration(st) && ts.isExternalModuleReference(st.moduleReference)) {
      const spec = textoDeEspecificador(st.moduleReference.expression);
      if (spec !== null) anadir(spec, st.isTypeOnly ? 'tipo' : 'require', st);
    }
  }
  // `const require = createRequire(new URL('../functions/package.json', import.meta.url))`: ese `require`
  // resuelve desde OTRA carpeta. Se anota para resolver sus llamadas desde allí (`relativoA`).
  const requiresPropios = new Map();
  if (sf.text.includes('createRequire')) {
    const buscar = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isCallExpression(n.initializer)
        && ts.isIdentifier(n.initializer.expression) && n.initializer.expression.text === 'createRequire') {
        const arg = n.initializer.arguments[0];
        if (arg && ts.isNewExpression(arg) && ts.isIdentifier(arg.expression) && arg.expression.text === 'URL') {
          const lit = textoDeEspecificador(arg.arguments?.[0]);
          if (lit !== null) requiresPropios.set(n.name.text, path.posix.normalize(path.posix.join(path.posix.dirname(sf.fileName), lit)));
        } else if (arg && /import\.meta\.url|__filename/.test(arg.getText(sf))) requiresPropios.set(n.name.text, sf.fileName);
      }
      ts.forEachChild(n, buscar);
    };
    buscar(sf);
  }
  const visitar = (n) => {
    if (ts.isCallExpression(n) && n.arguments.length >= 1) {
      const spec = textoDeEspecificador(n.arguments[0]);
      if (spec !== null) {
        if (n.expression.kind === ts.SyntaxKind.ImportKeyword) anadir(spec, 'dinamico', n);
        else if (ts.isIdentifier(n.expression) && requiresPropios.has(n.expression.text)) anadir(spec, 'require', n, { relativoA: requiresPropios.get(n.expression.text) });
        else if (ts.isIdentifier(n.expression) && n.expression.text === 'require') anadir(spec, 'require', n);
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return res;
};

/* ── nombres usados como valor ───────────────────────────────────────────── */

/** ¿Este identificador es un nombre de propiedad o de declaración, y no una referencia? */
const noEsReferencia = (id) => {
  const p = id.parent;
  if (!p) return true;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return true;
  if (ts.isQualifiedName(p) && p.right === id) return true;
  if ((ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p) || ts.isPropertySignature(p)
    || ts.isMethodSignature(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p) || ts.isEnumMember(p)) && p.name === id) return true;
  if (ts.isBindingElement(p) && p.propertyName === id) return true;
  if ((ts.isVariableDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isParameter(p)
    || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isEnumDeclaration(p) || ts.isBindingElement(p)
    || ts.isFunctionExpression(p) || ts.isClassExpression(p) || ts.isTypeParameterDeclaration(p)) && p.name === id) return true;
  if (ts.isImportClause(p) || ts.isImportSpecifier(p) || ts.isNamespaceImport(p) || ts.isImportEqualsDeclaration(p)) return true;
  if (ts.isJsxAttribute(p) && p.name === id) return true;
  if (ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) return true;
  if (ts.isExportSpecifier(p) && p.parent?.parent && ts.isExportDeclaration(p.parent.parent) && p.parent.parent.moduleSpecifier) return true;
  return false;
};

/** ¿Está en posición de tipo (anotación, `typeof X` de tipo, `implements`, interfaz)? */
const enPosicionDeTipo = (id) => {
  let n = id;
  while (n.parent) {
    const p = n.parent;
    if (ts.isExpressionWithTypeArguments(p) && ts.isHeritageClause(p.parent)) {
      const h = p.parent;
      return h.token === ts.SyntaxKind.ImplementsKeyword || ts.isInterfaceDeclaration(h.parent);
    }
    if (ts.isTypeNode(p) && !ts.isExpressionWithTypeArguments(p)) return true;
    if (ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)) return true;
    if (ts.isStatement(p) || ts.isSourceFile(p) || ts.isBlock(p)) return false;
    n = p;
  }
  return false;
};

/** Los nombres que el archivo usa en posiciones de VALOR (una vez por archivo). */
export const nombresUsadosComoValor = (sf) => {
  const usados = new Set();
  const visitar = (n) => {
    if (ts.isIdentifier(n)) {
      if (!noEsReferencia(n) && !enPosicionDeTipo(n)) usados.add(n.text);
      return;
    }
    if (ts.isShorthandPropertyAssignment(n)) usados.add(n.name.text);
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return usados;
};

/** ¿Este import se queda en el JavaScript compilado? (sintáctico; lo dudoso lo decide el comprobador) */
export const esDeValor = (imp, usados) => {
  if (imp.tipo === 'tipo' || imp.tipo === 'dinamico') return false;
  if (imp.tipo !== 'import') return true; // efecto, require, reexport: se quedan (el comprobador afina los reexport)
  return imp.nombres.some((n) => usados.has(n.local));
};

/* ── resolución ──────────────────────────────────────────────────────────── */

export const EXTENSIONES = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.d.ts', '.json'];
export const PLATAFORMAS = ['', '.web', '.native', '.ios', '.android'];

/** Lo que sale del build: no se versiona, lo produce `npm run build` (o Expo). */
export const SALIDAS_DE_BUILD = ['functions/lib/', 'dist/', 'web-build/', '.expo/'];

export const esRelativo = (spec) => spec === '.' || spec === '..' || spec.startsWith('./') || spec.startsWith('../');

/** Los candidatos por niveles: el primero que encuentra algo manda. */
export const nivelesDeCandidatos = (desde, spec) => {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(desde), spec)).replace(/\/$/, '');
  const niveles = [[base]];
  const m = base.match(/\.(m|c)?js(x)?$/);
  if (m) {
    const sin = base.slice(0, -m[0].length);
    niveles.push([`${sin}.ts`, `${sin}.tsx`, `${sin}.mts`, `${sin}.cts`]);
  }
  niveles.push(EXTENSIONES.flatMap((ext) => PLATAFORMAS.map((p) => `${base}${p}${ext}`)));
  niveles.push(EXTENSIONES.flatMap((ext) => PLATAFORMAS.map((p) => `${base}/index${p}${ext}`)));
  return { base, niveles };
};

const esArchivoEnDisco = (raiz, ruta) => {
  try { return fs.statSync(path.join(raiz, ruta)).isFile(); } catch { return false; }
};

/**
 * Resuelve un especificador relativo. Devuelve:
 *   { estado: 'ok', rutas }            — a archivos seguidos por git (todas las variantes de plataforma);
 *   { estado: 'build', rutas: [] }     — dentro de una salida de build;
 *   { estado: 'fuera', rutas: [] }     — sale de la raíz del repositorio;
 *   { estado: 'sin-seguimiento', rutas } — existe en disco pero git no lo sigue;
 *   { estado: 'inexistente', rutas: [] }.
 * `raiz` puede ser null (resolución en una base: solo cuenta `seguidos`).
 */
export const resolver = (desde, spec, seguidos, raiz) => {
  const { base, niveles } = nivelesDeCandidatos(desde, spec);
  if (base === '..' || base.startsWith('../')) return { estado: 'fuera', rutas: [] };
  if (SALIDAS_DE_BUILD.some((s) => base.startsWith(s))) return { estado: 'build', rutas: [] };
  for (const nivel of niveles) {
    const encontradas = nivel.filter((c) => seguidos.has(c));
    if (encontradas.length) return { estado: 'ok', rutas: encontradas };
  }
  if (raiz) {
    for (const nivel of niveles) {
      const enDisco = nivel.filter((c) => esArchivoEnDisco(raiz, c));
      if (enDisco.length) return { estado: 'sin-seguimiento', rutas: enDisco };
    }
  }
  return { estado: 'inexistente', rutas: [] };
};

/* ── componentes fuertemente conexos (Tarjan, iterativo) ─────────────────── */

/** `aristas`: Map nodo → Set de nodos. Devuelve los componentes con ciclo (tamaño > 1 o con autoarista). */
export const componentesFuertes = (aristas) => {
  const indice = new Map();
  const bajo = new Map();
  const enPila = new Set();
  const pila = [];
  const res = [];
  let contador = 0;
  const nodos = [...aristas.keys()].sort();
  for (const inicio of nodos) {
    if (indice.has(inicio)) continue;
    const trabajo = [{ v: inicio, hijos: [...(aristas.get(inicio) || [])].sort(), i: 0 }];
    indice.set(inicio, contador); bajo.set(inicio, contador); contador++;
    pila.push(inicio); enPila.add(inicio);
    while (trabajo.length) {
      const marco = trabajo[trabajo.length - 1];
      if (marco.i < marco.hijos.length) {
        const w = marco.hijos[marco.i++];
        if (!indice.has(w)) {
          indice.set(w, contador); bajo.set(w, contador); contador++;
          pila.push(w); enPila.add(w);
          trabajo.push({ v: w, hijos: [...(aristas.get(w) || [])].sort(), i: 0 });
        } else if (enPila.has(w)) bajo.set(marco.v, Math.min(bajo.get(marco.v), indice.get(w)));
      } else {
        trabajo.pop();
        if (trabajo.length) {
          const padre = trabajo[trabajo.length - 1].v;
          bajo.set(padre, Math.min(bajo.get(padre), bajo.get(marco.v)));
        }
        if (bajo.get(marco.v) === indice.get(marco.v)) {
          const comp = [];
          let w;
          do { w = pila.pop(); enPila.delete(w); comp.push(w); } while (w !== marco.v);
          if (comp.length > 1 || aristas.get(marco.v)?.has(marco.v)) res.push(comp.sort());
        }
      }
    }
  }
  return res;
};

/** Un ciclo concreto dentro de un componente, empezando y acabando en `inicio` (BFS). */
export const cicloDesde = (inicio, miembros, aristas) => {
  const dentro = new Set(miembros);
  const previo = new Map();
  const cola = [...(aristas.get(inicio) || [])].filter((w) => dentro.has(w)).sort();
  for (const w of cola) previo.set(w, inicio);
  for (let k = 0; k < cola.length; k++) {
    const v = cola[k];
    if (v === inicio) break;
    for (const w of [...(aristas.get(v) || [])].sort()) {
      if (!dentro.has(w) || previo.has(w)) continue;
      previo.set(w, v);
      cola.push(w);
    }
  }
  if (!previo.has(inicio)) return [inicio];
  const camino = [inicio];
  for (let v = previo.get(inicio); v !== inicio; v = previo.get(v)) camino.push(v);
  camino.push(inicio);
  return camino.reverse();
};

/* ── el comprobador de tipos, solo donde hace falta ──────────────────────── */

const extensionDe = (ruta) => {
  for (const e of ['.d.ts', '.d.mts', '.d.cts', '.tsx', '.ts', '.mts', '.cts', '.jsx', '.js', '.mjs', '.cjs', '.json']) if (ruta.endsWith(e)) return e;
  return '.ts';
};

/**
 * Decide con el comprobador de tipos qué aristas candidatas son de verdad de VALOR.
 *
 * `archivos`: rutas relativas (los miembros de los ciclos). `aristas`: [{ de, a, imp }] con `imp` = el resumen
 * de un import (`especificador`, `tipo`, `pos`, `nombresValor`: los nombres que el archivo usa como valor); aquí
 * se vuelve a localizar por posición en el programa. `resolverPrimero(desde, spec)` → ruta relativa o null.
 *
 * Programa mínimo: solo esos archivos como raíces, `noResolve` (no se carga nada más), sin lib. Un símbolo que
 * no se puede resolver cuenta como valor (conservador: mejor un ciclo de más que uno escondido).
 * Devuelve un Set con las claves `de→a@pos` de los imports que son solo de tipos.
 */
export const refinarConComprobador = (raiz, archivos, aristas, resolverPrimero) => {
  const abs = (r) => path.join(raiz, r).replace(/\\/g, '/');
  const rel = (a) => path.relative(raiz, a).replace(/\\/g, '/');
  const opciones = {
    noResolve: true, noLib: true, allowJs: true, checkJs: false, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext, skipLibCheck: true, types: [], noEmit: true, resolveJsonModule: true, esModuleInterop: true,
  };
  const host = ts.createCompilerHost(opciones, true);
  host.resolveModuleNameLiterals = (literales, contenedor) => literales.map((lit) => {
    const destino = resolverPrimero(rel(contenedor), lit.text);
    return destino ? { resolvedModule: { resolvedFileName: abs(destino), extension: extensionDe(destino), isExternalLibraryImport: false } } : { resolvedModule: undefined };
  });
  const programa = ts.createProgram({ rootNames: archivos.map(abs), options: opciones, host });
  const comprobador = programa.getTypeChecker();
  const esValor = (simbolo) => {
    if (!simbolo) return true;
    let s = simbolo;
    if (s.flags & ts.SymbolFlags.Alias) {
      try { s = comprobador.getAliasedSymbol(s); } catch { return true; }
    }
    if (!s || s.flags === ts.SymbolFlags.None || (s.flags & ts.SymbolFlags.Alias)) return true; // sin resolver: conservador
    return (s.flags & ts.SymbolFlags.Value) !== 0;
  };
  const soloTipos = new Set();
  for (const { de, a, imp } of aristas) {
    const sf = programa.getSourceFile(abs(de));
    if (!sf) continue;
    // El mismo nodo en el programa: el import cuyo especificador y posición coinciden.
    const enPrograma = importsDe(sf).find((x) => x.especificador === imp.especificador && x.nodo.pos === imp.pos);
    if (!enPrograma) continue;
    const st = enPrograma.nodo;
    let valor = true;
    if (enPrograma.tipo === 'import') {
      const candidatos = enPrograma.nombres.filter((n) => (imp.nombresValor || []).includes(n.local));
      valor = candidatos.some((n) => {
        const s = comprobador.getSymbolAtLocation(n.nodo);
        // Un import de espacio de nombres usado como valor es valor.
        if (ts.isNamespaceImport(n.nodo.parent)) return true;
        return esValor(s);
      });
    } else if (enPrograma.tipo === 'reexport' && ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      valor = st.exportClause.elements.filter((e) => !e.isTypeOnly).some((e) => esValor(comprobador.getSymbolAtLocation(e.propertyName || e.name)));
    } else if (enPrograma.tipo === 'reexport-todo') {
      const modulo = comprobador.getSymbolAtLocation(st.moduleSpecifier);
      if (modulo) valor = comprobador.getExportsOfModule(modulo).some((s) => esValor(s));
    }
    if (!valor) soloTipos.add(`${de}→${a}@${imp.pos}`);
  }
  return soloTipos;
};
