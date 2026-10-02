/*
 * LO QUE SE COMPARA CON LA BASE — la parte de los detectores que necesita `--base <commit>`.
 *
 *   - `tamano/cruza-mil-lineas`: 1000 líneas o menos en la base (o no existía) y más de 1000 ahora;
 *   - `reglas/cambio-peligroso`: en firestore.rules/storage.rules, escritura abierta añadida (`allow write… if
 *     true` o sin condición) o una condición de `request.auth` retirada que no vuelve en el mismo bloque ni en la
 *     función auxiliar que la sustituye;
 *   - `frontera/cambio` (DISPARADORES, no hallazgos): carpeta nueva en functions/src, arista nueva entre carpetas
 *     de primer nivel, exports de functions/src/index.ts cambiados, zonas rojas tocadas y dependencias.
 *
 * La base se lee con un solo `git cat-file --batch`; la copia de trabajo, del disco. Las aristas de la base son
 * las de hoy en los archivos que no cambiaron más las de la versión base de los que cambiaron.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  cambiosDesde, archivosEnBase, contenidosEnBase, diffCeroContexto, huellaDe, esCodigo, esDeclaracion, esTest,
  esServidor, esCliente, coincide, contarLineas, corto,
} from './comun.mjs';
import { reglaPorId, ZONAS_ROJAS, LIMITE_DE_LINEAS } from './reglas.mjs';
import { parsear, importsDe, resolver, esRelativo } from './grafo.mjs';

/* ── carpetas y exports ──────────────────────────────────────────────────── */

/** La carpeta de primer nivel: `functions/src/<x>` en el servidor, la de arriba en el resto. */
export const carpetaDe = (ruta) => {
  if (ruta.startsWith('functions/src/')) {
    const resto = ruta.slice('functions/src/'.length);
    const i = resto.indexOf('/');
    return i < 0 ? 'functions/src' : `functions/src/${resto.slice(0, i)}`;
  }
  const i = ruta.indexOf('/');
  return i < 0 ? '(raiz)' : ruta.slice(0, i);
};

const cuentaParaFrontera = (ruta) => esCliente(ruta) || (esServidor(ruta) && !esTest(ruta));

/** Los nombres que exporta un archivo en tiempo de ejecución (sin tipos). */
export const exportsDe = (sf) => {
  const res = new Set();
  const exportado = (st) => st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  for (const st of sf.statements) {
    if (ts.isVariableStatement(st) && exportado(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) res.add(d.name.text);
    } else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && exportado(st)) {
      res.add(st.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ? 'default' : st.name?.text || 'default');
    } else if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      const desde = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : null;
      if (!st.exportClause) res.add(`* from ${desde}`);
      else if (ts.isNamespaceExport(st.exportClause)) res.add(st.exportClause.name.text);
      else for (const e of st.exportClause.elements) if (!e.isTypeOnly) res.add(e.name.text);
    } else if (ts.isExportAssignment(st)) res.add('default');
  }
  return res;
};

const CAMPOS_DE_DEPENDENCIAS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'engines'];

export const cambiosDeDependencias = (antes, ahora) => {
  const leer = (t) => { try { return JSON.parse(t || '{}'); } catch { return {}; } };
  const a = leer(antes);
  const b = leer(ahora);
  const cambios = [];
  for (const campo of CAMPOS_DE_DEPENDENCIAS) {
    const x = a[campo] || {};
    const y = b[campo] || {};
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) cambios.push(`${campo}.${k}: ${x[k] === undefined ? '∅' : JSON.stringify(x[k])} → ${y[k] === undefined ? '∅' : JSON.stringify(y[k])}`);
    }
  }
  return cambios;
};

/* ── reglas de Firebase ──────────────────────────────────────────────────── */

/**
 * Las anclas de un archivo de reglas de Firebase, línea a línea (índice 1 = primera línea): la ruta de los
 * `match` que la contienen (`/databases/{database}/documents/users/{uid}`) y `:nombre` dentro de una función.
 */
export const anclasDeReglas = (texto) => {
  const pila = [];
  let profundidad = 0;
  const res = [null];
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.replace(/\/\/.*$/, '');
    let resto = limpia;
    const m = limpia.match(/^\s*match\s+(\S+)\s*\{/);
    const f = !m && limpia.match(/^\s*function\s+([A-Za-z_]\w*)\s*\(/);
    if (m) {
      pila.push({ parte: m[1], profundidad: profundidad + 1 });
      resto = limpia.slice(limpia.indexOf(m[1]) + m[1].length);
    } else if (f) pila.push({ parte: `:${f[1]}`, profundidad: profundidad + 1 });
    res.push(pila.map((p) => p.parte).join('') || '(raiz)');
    for (const c of resto) {
      if (c === '{') profundidad++;
      else if (c === '}') {
        profundidad--;
        while (pila.length && pila[pila.length - 1].profundidad > profundidad) pila.pop();
      }
    }
  }
  return res;
};

/** Lee un diff `-U0` y devuelve, por archivo, las líneas añadidas (nº nuevo) y retiradas (nº viejo). */
export const leerDiff = (diff) => {
  const porArchivo = new Map();
  let actual = null;
  let viejo = 0;
  let nuevo = 0;
  for (const l of diff.split(/\r?\n/)) {
    const f = l.match(/^\+\+\+ b\/(.+)$/);
    if (f) { actual = { anadidas: [], retiradas: [] }; porArchivo.set(f[1], actual); continue; }
    if (l.startsWith('--- ') || l.startsWith('diff --git') || l.startsWith('index ')) continue;
    const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (h) { viejo = Number(h[1]); nuevo = Number(h[2]); continue; }
    if (!actual) continue;
    if (l.startsWith('+')) actual.anadidas.push({ linea: nuevo++, texto: l.slice(1) });
    else if (l.startsWith('-')) actual.retiradas.push({ linea: viejo++, texto: l.slice(1) });
  }
  return porArchivo;
};

const RE_AUTH = /request\.auth(?:\.[A-Za-z_][\w.]*)?(?:\s*(?:!=|==)\s*(?:null|[A-Za-z_][\w.]*))?/g;
const RE_ESCRITURA = /\b(write|create|update|delete)\b/;

/** `reglas/cambio-peligroso` sobre las líneas añadidas y retiradas desde la base. */
export const revisarReglasDeFirebase = ({ raiz, base, textosBase, cambiados, foco }) => {
  const res = [];
  const rutas = ['firestore.rules', 'storage.rules'].filter((r) => cambiados.has(r) && (!foco || foco.has(r)));
  if (!rutas.length) return res;
  const diff = leerDiff(diffCeroContexto(raiz, base, rutas));
  for (const ruta of rutas) {
    const d = diff.get(ruta);
    if (!d) continue;
    let ahora = '';
    try { ahora = fs.readFileSync(path.join(raiz, ruta), 'utf8'); } catch { ahora = ''; }
    const anclasAhora = anclasDeReglas(ahora);
    const anclasAntes = anclasDeReglas(textosBase.get(ruta) || '');
    const hallazgo = (ancla, linea, texto, severidad, mensaje, huellaTexto) => ({
      regla: 'reglas/cambio-peligroso', ruta, ancla, severidad, mensaje, linea,
      huella: huellaDe(huellaTexto, { codigo: false }), fragmento: corto(texto),
    });
    for (const { linea, texto } of d.anadidas) {
      const m = texto.match(/^\s*allow\s+([^:;]+?)\s*(?::\s*if\s+(.+?))?\s*;/);
      if (!m || !RE_ESCRITURA.test(m[1])) continue;
      const condicion = m[2]?.trim();
      if (condicion === undefined || condicion === 'true') {
        res.push(hallazgo(anclasAhora[linea] || '(raiz)', linea, texto, 'bloqueante',
          condicion === undefined ? `allow ${m[1].trim()} sin condición: escritura abierta a cualquiera` : `allow ${m[1].trim()}: if true — escritura abierta a cualquiera`,
          `abierta|${texto}`));
      }
    }
    // Condiciones de auth retiradas que no vuelven en el mismo bloque.
    const contar = (lineas, anclas) => {
      const m = new Map();
      for (const { linea, texto } of lineas) {
        const ancla = anclas[linea] || '(raiz)';
        for (const a of texto.replace(/\/\/.*$/, '').match(RE_AUTH) || []) {
          const k = `${ancla}\u0000${a.replace(/\s+/g, ' ')}`;
          m.set(k, (m.get(k) || []).concat([{ linea, texto }]));
        }
      }
      return m;
    };
    const retiradas = contar(d.retiradas, anclasAntes);
    const anadidas = contar(d.anadidas, anclasAhora);
    // Una condición que pasa a una función auxiliar (`return esAdministracion() && …`) no se ha retirado: el
    // cuerpo de cada función del archivo actual, para ver si la función llamada en su lugar la contiene.
    const cuerpos = new Map();
    ahora.split(/\r?\n/).forEach((texto, i) => {
      const m = (anclasAhora[i + 1] || '').match(/:([A-Za-z_]\w*)$/);
      if (m) cuerpos.set(m[1], `${cuerpos.get(m[1]) || ''}\n${texto}`);
    });
    const lineasAnadidasEn = (ancla) => d.anadidas.filter((x) => (anclasAhora[x.linea] || '(raiz)') === ancla).map((x) => x.texto).join('\n');
    for (const [k, ocurrencias] of retiradas) {
      const sobran = ocurrencias.length - (anadidas.get(k)?.length || 0);
      if (sobran <= 0) continue;
      const [ancla, atomo] = k.split('\u0000');
      const llamadas = [...lineasAnadidasEn(ancla).matchAll(/\b([A-Za-z_]\w*)\s*\(/g)].map((m) => m[1]);
      if (llamadas.some((f) => (cuerpos.get(f) || '').replace(/\s+/g, ' ').includes(atomo))) continue;
      res.push(hallazgo(ancla, ocurrencias[0].linea, ocurrencias[0].texto, 'alta',
        `condición de auth retirada (${atomo}${sobran > 1 ? ` ×${sobran}` : ''}) en ${ancla}: revisar que no abre nada`,
        `auth|${ancla}|${atomo}`));
    }
  }
  return res;
};

/* ── todo lo que compara con la base ─────────────────────────────────────── */

/**
 * Compara con `base`. Recibe lo que los detectores ya calcularon (`infos`: ruta → { lineas, generado };
 * `aristasTodas`: ruta → Set de destinos) y devuelve { crudos, disparadores, cambios }.
 */
export const compararConBase = ({ raiz, base, seguidos, infos, aristasTodas, activa, foco }) => {
  const crudos = [];
  const disparadores = [];
  const cambios = cambiosDesde(raiz, base);
  const cambiados = new Set(cambios.map((c) => c.ruta));
  const modificadosOBorrados = cambios.filter((c) => c.estado !== 'A').map((c) => c.ruta);
  const necesariosEnBase = modificadosOBorrados.filter((r) => esCodigo(r) || /\.rules$/.test(r) || /(^|\/)package\.json$/.test(r));
  const textosBase = contenidosEnBase(raiz, base, necesariosEnBase);

  if (activa('tamano/cruza-mil-lineas')) {
    for (const { estado, ruta } of cambios) {
      const info = infos.get(ruta);
      if (estado === 'D' || !info || info.generado || esDeclaracion(ruta) || (foco && !foco.has(ruta))) continue;
      const antes = estado === 'A' ? 0 : contarLineas(textosBase.get(ruta) || '');
      if (antes <= LIMITE_DE_LINEAS && info.lineas > LIMITE_DE_LINEAS) {
        crudos.push({
          regla: 'tamano/cruza-mil-lineas', ruta, ancla: '(archivo)', severidad: reglaPorId.get('tamano/cruza-mil-lineas').severidad,
          mensaje: `pasa de ${antes} a ${info.lineas} líneas: cruza las ${LIMITE_DE_LINEAS} en esta fase`,
          huella: huellaDe(`cruza|${ruta}`, { codigo: false }), linea: 1, fragmento: `${antes} → ${info.lineas} líneas`,
        });
      }
    }
  }

  if (activa('reglas/cambio-peligroso')) crudos.push(...revisarReglasDeFirebase({ raiz, base, textosBase, cambiados, foco }));

  if (activa('frontera/cambio')) {
    const enBase = new Set(archivosEnBase(raiz, base));
    // Carpetas nuevas en functions/src.
    const carpetasDe = (rutas) => new Set([...rutas].filter((r) => r.startsWith('functions/src/') && r.slice('functions/src/'.length).includes('/')).map(carpetaDe));
    const antes = carpetasDe(enBase);
    const ahora = carpetasDe([...seguidos].filter((r) => fs.existsSync(path.join(raiz, r))));
    for (const c of [...ahora].filter((x) => !antes.has(x)).sort()) {
      disparadores.push({ tipo: 'carpeta-nueva', detalle: c, rutas: [...seguidos].filter((r) => r.startsWith(`${c}/`)).sort() });
    }
    // Aristas nuevas entre carpetas de primer nivel (la app y functions/src; las pruebas y herramientas no cuentan).
    const pares = (de, destinos, mapa) => {
      if (!cuentaParaFrontera(de)) return;
      for (const a of destinos) {
        if (!cuentaParaFrontera(a) || carpetaDe(de) === carpetaDe(a)) continue;
        const k = `${carpetaDe(de)} → ${carpetaDe(a)}`;
        if (!mapa.has(k)) mapa.set(k, new Set());
        mapa.get(k).add(de);
      }
    };
    const paresAhora = new Map();
    for (const [de, destinos] of aristasTodas) pares(de, destinos, paresAhora);
    const paresAntes = new Map();
    for (const [de, destinos] of aristasTodas) if (!cambiados.has(de)) pares(de, destinos, paresAntes);
    for (const de of modificadosOBorrados) {
      const texto = textosBase.get(de);
      if (texto === undefined || !esCodigo(de)) continue;
      const destinos = new Set();
      for (const imp of importsDe(parsear(de, texto))) {
        if (!esRelativo(imp.especificador)) continue;
        for (const a of resolver(imp.relativoA || de, imp.especificador, enBase, null).rutas) destinos.add(a);
      }
      pares(de, destinos, paresAntes);
    }
    for (const [k, origen] of [...paresAhora].sort()) {
      if (!paresAntes.has(k)) disparadores.push({ tipo: 'arista-nueva', detalle: k, rutas: [...origen].sort() });
    }
    // Exports de functions/src/index.ts.
    const indice = 'functions/src/index.ts';
    if (cambiados.has(indice)) {
      const leer = (t) => (t === undefined ? new Set() : exportsDe(parsear(indice, t)));
      let actual;
      try { actual = fs.readFileSync(path.join(raiz, indice), 'utf8'); } catch { actual = undefined; }
      const a = leer(textosBase.get(indice));
      const b = leer(actual);
      const anadidos = [...b].filter((x) => !a.has(x)).sort();
      const retirados = [...a].filter((x) => !b.has(x)).sort();
      if (anadidos.length || retirados.length) {
        disparadores.push({ tipo: 'exports-index', detalle: [...anadidos.map((x) => `+${x}`), ...retirados.map((x) => `-${x}`)].join(', '), anadidos, retirados, rutas: [indice] });
      }
    }
    // Zonas rojas tocadas.
    for (const glob of ZONAS_ROJAS) {
      const tocadas = [...cambiados].filter((r) => coincide(r, [glob])).sort();
      if (tocadas.length) disparadores.push({ tipo: 'zona-roja', detalle: glob, rutas: tocadas });
    }
    // Dependencias.
    for (const pkg of ['package.json', 'functions/package.json']) {
      if (!cambiados.has(pkg)) continue;
      let actual = '';
      try { actual = fs.readFileSync(path.join(raiz, pkg), 'utf8'); } catch { actual = ''; }
      const c = cambiosDeDependencias(textosBase.get(pkg), actual);
      if (c.length) disparadores.push({ tipo: 'dependencias', detalle: pkg, cambios: c, rutas: [pkg] });
    }
    for (const lock of ['package-lock.json', 'functions/package-lock.json']) {
      if (cambiados.has(lock)) disparadores.push({ tipo: 'dependencias', detalle: lock, rutas: [lock] });
    }
  }
  return { crudos, disparadores, cambios };
};
