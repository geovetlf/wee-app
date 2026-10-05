/*
 * LAS FUENTES DEL BUILD GUARDIAN (F5), LEÍDAS — `ops/harness/guardian-fuentes.mjs`.
 *
 * Funciones PURAS (reciben texto o datos, no tocan git ni el disco) que leen lo que ya existe en el repositorio tal
 * como está escrito: la tabla de fronteras de docs/MAPA-DE-FRONTERAS.md, las decisiones de
 * docs/DECISIONES-DELIBERADAS.md, las cercas de cierre que viven en las suites (`git diff --numstat|--name-only <commit>`),
 * las rutas que protege .claude/settings.json y los nombres que citan los documentos. No deciden nada: las usa
 * ops/harness/guardian.mjs, que coordina. Lo fija functions/test/harness-guardian.test.mjs.
 */
import ts from 'typescript';
import { coincide } from '../revision/comun.mjs';
import { parsear, lineaDe } from '../revision/grafo.mjs';

export const recortar = (t, max = 240) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > max ? `${s.slice(0, max - 1)}…` : s; };
export const limpioMd = (t) => String(t || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
export const tokensDe = (t) => [...String(t || '').matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
export const unicos = (xs) => [...new Set(xs)].sort();

/** Las filas de la tabla «Las fronteras» de docs/MAPA-DE-FRONTERAS.md, con su línea. */
export const filasDelMapa = (texto) => {
  const lineas = String(texto || '').split(/\r?\n/);
  const filas = [];
  let col = null;
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i].trim();
    if (!l.startsWith('|')) { if (col && filas.length) break; continue; }
    const celdas = l.split('|').slice(1, -1).map((c) => c.trim());
    if (!col) {
      const k = (re) => celdas.findIndex((c) => re.test(c));
      if (k(/^Frontera$/) >= 0 && k(/^Suites/) >= 0) col = { frontera: k(/^Frontera$/), donde: k(/^Dónde vive$/), define: k(/^Qué la define$/), suites: k(/^Suites/), estado: k(/^Estado$/) };
      continue;
    }
    if (celdas.every((c) => /^:?-+:?$/.test(c))) continue;
    const nombre = limpioMd(celdas[col.frontera]);
    if (!nombre) continue;
    filas.push({
      nombre, linea: i + 1, cita: celdas[col.frontera], donde: tokensDe(celdas[col.donde]),
      define: unicos(tokensDe(celdas[col.define]).filter((t) => /^docs\/\S+\.md$/.test(t))), defineTexto: limpioMd(celdas[col.define]),
      suites: tokensDe(celdas[col.suites]).filter((t) => /^[a-z0-9][a-z0-9.-]*$/.test(t)), estado: limpioMd(celdas[col.estado]),
    });
  }
  return filas;
};

/** Las decisiones `### DD-NN · …` de docs/DECISIONES-DELIBERADAS.md: línea, estado, «sería defecto si» y lo que citan. */
export const decisionesDelTexto = (texto) => {
  const res = [];
  let actual = null;
  String(texto || '').split(/\r?\n/).forEach((l, i) => {
    const m = l.match(/^###\s+(DD-\d+)\s*·\s*(.+)$/);
    if (m) { actual = { id: m[1], titulo: limpioMd(m[2]), linea: i + 1, cita: `### ${m[1]}`, tokens: tokensDe(m[2]), estado: null, seriaDefecto: null }; res.push(actual); return; }
    if (/^#{1,3}\s/.test(l)) { actual = null; return; }
    if (!actual) return;
    actual.tokens.push(...tokensDe(l));
    const e = l.match(/^\s*-\s*\*\*Estado:\*\*\s*(.+)$/);
    if (e) actual.estado = limpioMd(e[1]).replace(/\.$/, '');
    const d = l.match(/^\s*-\s*\*\*Sería defecto si:\*\*\s*(.+)$/);
    if (d) actual.seriaDefecto = limpioMd(d[1]);
  });
  return res;
};

/**
 * Las CERCAS de una suite: cada `git diff --numstat|--name-only <commit> -- <rutas>` que compara el árbol con un
 * commit fijo (las de F1-D, docs/INTEGRACION-PRODUCCION.md §4 c, y la de job-queue). Con el AST: el commit sale de
 * la constante que nombra la plantilla (`${RUTA}` → 'b023f24') y la etiqueta, del `check('XX) …')` que la contiene.
 */
export const cercasDeSuite = (ruta, texto) => {
  const sf = parsear(ruta, texto);
  const constantes = new Map();
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.initializer && (ts.isStringLiteral(d.initializer) || ts.isNoSubstitutionTemplateLiteral(d.initializer))) constantes.set(d.name.text, d.initializer.text);
    }
  }
  const textoDe = (n) => {
    if (!n) return null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (!ts.isTemplateExpression(n)) return null;
    let s = n.head.text;
    for (const sp of n.templateSpans) {
      if (!ts.isIdentifier(sp.expression) || !constantes.has(sp.expression.text)) return null;
      s += constantes.get(sp.expression.text) + sp.literal.text;
    }
    return s;
  };
  /* La etiqueta, tal como está ESCRITA en la suite (el texto crudo del literal): una fuente que se puede buscar. */
  const etiquetaDe = (n) => {
    for (let p = n.parent; p && !ts.isSourceFile(p); p = p.parent) {
      if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'check' && p.arguments[0]) {
        const crudo = p.arguments[0].getText(sf).slice(1, -1);
        const m = crudo.match(/^([A-Za-z0-9]{1,8}\))/);
        return m ? m[1] : crudo.slice(0, 40).trimEnd();
      }
      if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return `const ${p.name.text}`;
    }
    return null;
  };
  const res = [];
  const visitar = (n) => {
    if (ts.isCallExpression(n) && n.arguments.length) {
      const s = textoDe(n.arguments[0]);
      const m = s && s.trim().match(/^(?:git\s+)?diff\s+--(numstat|name-only)\s+([0-9a-f]{7,40})\s+--\s+(.+)$/);
      const rutas = m ? m[3].trim().split(/\s+/) : [];
      if (m && rutas.length && rutas.every((x) => /^[A-Za-z0-9._/-]+$/.test(x))) {
        res.push({
          suite: ruta, linea: lineaDe(sf, n), tipo: m[1], ref: m[2], rutas: rutas.map((x) => x.replace(/\/+$/, '')), etiqueta: etiquetaDe(n),
          orden: `git diff --${m[1]} ${m[2]} -- ${rutas.join(' ')}`, cita: `diff --${m[1]}`,
        });
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return res;
};

/** Las rutas que settings.json protege para Read/Edit/Write (las de órdenes de shell las mira la guardia). */
export const permisosDeSettings = (settings) => {
  const res = [];
  for (const lista of ['deny', 'ask']) {
    (settings?.permissions?.[lista] || []).forEach((valor, i) => {
      const m = String(valor).match(/^(Read|Edit|Write|MultiEdit|NotebookEdit)\((.+)\)$/);
      if (!m || m[2].startsWith('//') || m[2].startsWith('~')) return;
      res.push({ lista, indice: i, valor, glob: m[2].replace(/^\.?\//, '') });
    });
  }
  return res;
};

/** Carpetas raíz del código: citarlas («ningún archivo de `functions/src`…») no delimita ninguna frontera. */
const RAICES = ['functions/', 'functions/src/', 'functions/test/', 'functions/lib/'];

/**
 * Un nombre citado en un documento → la ruta del repositorio a la que se refiere, o null. Los documentos nombran el
 * cliente desde la raíz y el servidor sin `functions/src/` (`engine/router.ts`): se prueba lo uno y lo otro, y SOLO
 * vale si existe exactamente uno. `index.ts` o `public/` existen en los dos sitios: ambiguos, no se atribuyen. Un
 * nombre sin barra solo vale como ARCHIVO (`assets` es una colección, no la carpeta de imágenes), y una carpeta raíz
 * no vale nunca: mejor callar que atribuir de más.
 */
export const resolverToken = (token, { existeArchivo, hayBajo, hayGlob }) => {
  const t = String(token || '').trim().replace(/^\.\//, '');
  if (!/^[A-Za-z0-9._@*+/-]+$/.test(t) || t.startsWith('/') || t.split('/').includes('..') || !/[A-Za-z]/.test(t)) return null;
  const candidatos = t.startsWith('functions/') ? [t] : [t, `functions/src/${t}`];
  const vale = (c) => (c.includes('*') ? hayGlob(c) : c.endsWith('/') ? hayBajo(c) : existeArchivo(c) || hayBajo(`${c}/`));
  const validos = candidatos.filter(vale);
  if (validos.length !== 1) return null;
  const c = validos[0];
  if (c.includes('*')) return { tipo: 'glob', patron: c, token };
  if (c.endsWith('/') || !existeArchivo(c)) {
    const carpeta = c.endsWith('/') ? c : `${c}/`;
    return t.includes('/') && !RAICES.includes(carpeta) ? { tipo: 'carpeta', patron: carpeta, token } : null;
  }
  return { tipo: 'archivo', patron: c, token };
};
export const casa = (ruta, x) => (x.tipo === 'archivo' ? ruta === x.patron : x.tipo === 'carpeta' ? ruta.startsWith(x.patron) : coincide(ruta, [x.patron]));
