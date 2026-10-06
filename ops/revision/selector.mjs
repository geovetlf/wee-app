#!/usr/bin/env node
/*
 * EL SELECTOR DEL REVISOR DE WEË — qué hay que revisar con IA, con qué contexto y cuánto cuesta.
 *
 *   node ops/revision/selector.mjs [--base <commit>] [--raiz <dir>] [--plan <archivo>] [--presupuesto 300000]
 *                                  [--modelo <id>] [--detectores <json>] [--baseline <archivo>]
 *   node ops/revision/selector.mjs --registrar <plan.json> <resultados.json>
 *
 * Por diff (desde `--base`; por defecto el `corte` de la baseline), con la copia de trabajo y los `git add -N`:
 *   1. los archivos cambiados y sus importadores DIRECTOS (grafo inverso, profundidad 1);
 *   2. las zonas disparadas (las de `contexto/paquetes.json` + docs-solo, tests-solo, generados) y los
 *      disparadores de frontera de los detectores;
 *   3. qué revisor entra (seguridad, arquitectura, código) y con qué paquetes de contexto (documentos enteros o
 *      por secciones);
 *   4. la estimación de tokens (caracteres / 4) y el PRESUPUESTO: lo que no cabe se LISTA en
 *      `fueraDelPresupuesto` y en el resumen —nunca se recorta en silencio—;
 *   5. las claves de caché sha256(versión de rúbrica y reglas + hash del archivo + hash del paquete + modelo) y
 *      los aciertos en `ops/revision/.cache/` (ignorada por git): lo ya revisado con el mismo todo no se repite.
 *
 * `--registrar` guarda en la caché los hallazgos de una revisión ya hecha (uno por revisor y archivo del plan): cada
 * hallazgo va a la entrada de cada archivo que nombra su `evidencia` —una LISTA, rúbrica común §7: todos sus
 * elementos, no el primero—; los aciertos del plan no se reescriben, y lo que no nombra ningún archivo por registrar
 * no se guarda y se avisa.
 * Sin IA, sin red, sin tocar nada fuera de `--plan` y de la caché.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  RAIZ_POR_DEFECTO, archivosSeguidos, existeCommit, cambiosDesde, sha256, esCodigo, esTest, esGenerado, excluido,
  coincide, leerArgumentos, leerJson, escribirJson,
} from './comun.mjs';
import { ZONAS_ROJAS, versionesDeReglas } from './reglas.mjs';
import { parsear, importsDe, resolver, esRelativo } from './grafo.mjs';

export const VERSION = 1;
export const PRESUPUESTO_POR_DEFECTO = 300000;
export const RUTA_PAQUETES = 'ops/revision/contexto/paquetes.json';
export const DIR_CACHE = 'ops/revision/.cache';
const ORDEN_DE_REVISORES = ['revisor-seguridad', 'revisor-arquitectura', 'revisor-codigo'];

export const tokensDe = (texto) => Math.ceil((texto || '').length / 4);

/* ── documentos por secciones ────────────────────────────────────────────── */

/**
 * Las secciones de un Markdown cuyo encabezado (sin las #) empieza por alguno de los prefijos; cada una hasta el
 * siguiente encabezado de su nivel o superior. Devuelve { texto, encontradas, faltan }.
 */
export const extraerSecciones = (texto, prefijos) => {
  const lineas = texto.split(/\r?\n/);
  const encabezados = [];
  let enBloque = false;
  lineas.forEach((l, i) => {
    if (/^\s*```/.test(l)) enBloque = !enBloque;
    const m = !enBloque && l.match(/^(#{1,6})\s+(.*)$/);
    if (m) encabezados.push({ i, nivel: m[1].length, texto: m[2].trim() });
  });
  const trozos = [];
  const encontradas = new Set();
  for (const [k, h] of encabezados.entries()) {
    const prefijo = prefijos.find((p) => h.texto.startsWith(p));
    if (!prefijo) continue;
    encontradas.add(prefijo);
    const fin = encabezados.slice(k + 1).find((x) => x.nivel <= h.nivel);
    trozos.push(lineas.slice(h.i, fin ? fin.i : lineas.length).join('\n'));
  }
  return { texto: trozos.join('\n\n'), encontradas: [...encontradas], faltan: prefijos.filter((p) => !encontradas.has(p)) };
};

/** Lee un documento de un paquete (entero o por secciones). `null` si no existe. */
export const leerDocumento = (raiz, doc) => {
  const abs = path.join(raiz, doc.ruta);
  if (!fs.existsSync(abs)) return null;
  const texto = fs.readFileSync(abs, 'utf8');
  if (!doc.secciones) return { texto, faltan: [] };
  const s = extraerSecciones(texto, doc.secciones);
  return { texto: s.texto, faltan: s.faltan };
};

/* ── importadores directos ───────────────────────────────────────────────── */

/**
 * Los archivos que importan DIRECTAMENTE alguno de `cambiados` (profundidad 1). Para no parsear el repositorio
 * entero, solo se parsean los archivos cuyo texto nombra el archivo cambiado (o su carpeta, si es un `index`).
 */
export const importadoresDirectos = (raiz, seguidos, cambiados) => {
  const objetivo = new Set(cambiados);
  const nombres = new Set();
  for (const r of cambiados) {
    const base = path.posix.basename(r).replace(/(\.(web|native|ios|android))?\.[cm]?[jt]sx?$/, '').replace(/\.d$/, '');
    nombres.add(base === 'index' ? path.posix.basename(path.posix.dirname(r)) : base);
  }
  const res = new Map();
  for (const ruta of seguidos) {
    if (!esCodigo(ruta) || excluido(ruta) || objetivo.has(ruta)) continue;
    let texto;
    try { texto = fs.readFileSync(path.join(raiz, ruta), 'utf8'); } catch { continue; }
    if (![...nombres].some((n) => n && texto.includes(n))) continue;
    for (const imp of importsDe(parsear(ruta, texto))) {
      if (!esRelativo(imp.especificador)) continue;
      for (const a of resolver(imp.relativoA || ruta, imp.especificador, seguidos, null).rutas) {
        if (!objetivo.has(a)) continue;
        if (!res.has(ruta)) res.set(ruta, new Set());
        res.get(ruta).add(a);
      }
    }
  }
  return [...res].map(([ruta, importa]) => ({ ruta, importa: [...importa].sort() })).sort((x, y) => (x.ruta < y.ruta ? -1 : 1));
};

/* ── el plan ─────────────────────────────────────────────────────────────── */

const esDoc = (r) => /\.(md|mdx|txt)$/i.test(r) || r.startsWith('docs/');

/**
 * Construye el plan de revisión. Opciones: raiz, base, presupuesto, modelo, paquetes (objeto ya leído; si no, se
 * lee de contexto/paquetes.json), detectores (resultado de `analizar` con base, para los disparadores).
 */
export const planificar = (opciones = {}) => {
  const raiz = path.resolve(opciones.raiz || RAIZ_POR_DEFECTO);
  const avisos = [];
  const presupuesto = Number(opciones.presupuesto || PRESUPUESTO_POR_DEFECTO);
  const modelo = opciones.modelo || process.env.WEE_REVISION_MODELO || 'sin-especificar';
  if (!opciones.paquetes && !fs.existsSync(path.join(raiz, RUTA_PAQUETES))) throw new Error(`falta ${RUTA_PAQUETES} en ${raiz}`);
  const paquetes = opciones.paquetes || leerJson(path.join(raiz, RUTA_PAQUETES));
  const base = opciones.base;
  if (!base || !existeCommit(raiz, base)) throw new Error(`base «${base}» no es un commit (usa --base o un corte en la baseline)`);

  const seguidos = new Set(archivosSeguidos(raiz));
  const cambios = cambiosDesde(raiz, base).filter((c) => !excluido(c.ruta));
  const vivos = cambios.filter((c) => c.estado !== 'D');

  // Zonas de cada archivo cambiado.
  const leer = (r) => { try { return fs.readFileSync(path.join(raiz, r), 'utf8'); } catch { return null; } };
  const cambiados = vivos.map(({ estado, ruta }) => {
    const texto = leer(ruta);
    const zonas = Object.entries(paquetes.zonas).filter(([, globs]) => coincide(ruta, globs)).map(([z]) => z);
    const noRevisable = (paquetes.noRevisables || []).find((n) => coincide(ruta, [n.glob]));
    return {
      ruta, estado, zonas, zonaRoja: coincide(ruta, ZONAS_ROJAS), generado: texto !== null && esCodigo(ruta) && esGenerado(texto),
      test: esTest(ruta), doc: esDoc(ruta), tokens: tokensDe(texto), hash: texto === null ? null : sha256(texto),
      ...(noRevisable ? { noRevisable: noRevisable.motivo } : {}),
    };
  });
  const borrados = cambios.filter((c) => c.estado === 'D').map((c) => c.ruta);

  const zonasDisparadas = new Set(cambiados.flatMap((c) => c.zonas));
  if (cambiados.length && cambiados.every((c) => c.doc)) zonasDisparadas.add('docs-solo');
  if (cambiados.length && cambiados.every((c) => c.test)) zonasDisparadas.add('tests-solo');
  if (cambiados.some((c) => c.generado)) zonasDisparadas.add('generados');
  const disparadores = opciones.detectores?.disparadores || [];
  if (disparadores.some((d) => ['carpeta-nueva', 'arista-nueva', 'exports-index'].includes(d.tipo))) zonasDisparadas.add('arquitectura');
  if (disparadores.some((d) => d.tipo === 'zona-roja' || d.tipo === 'dependencias')) zonasDisparadas.add('seguridad');
  if (!opciones.detectores) avisos.push('sin --detectores: los disparadores de frontera no entran en el plan (córrelo con --detectores <json de detectores.mjs --base>)');

  // Lo que se revisa con IA: código y configuración propia; no los generados, ni los documentos, ni lo que
  // `noRevisables` aparta con su motivo (catálogos de textos, bloqueos, binarios). Se dice en el plan, no se calla.
  const revisables = cambiados.filter((c) => !c.generado && !c.doc && !c.noRevisable);
  const importadores = importadoresDirectos(raiz, seguidos, revisables.filter((c) => esCodigo(c.ruta)).map((c) => c.ruta));

  // Documentos de contexto (una vez cada uno; se cuentan en cada revisor que los recibe).
  const cacheDocs = new Map();
  const documento = (doc) => {
    const k = `${doc.ruta}|${(doc.secciones || []).join('|')}`;
    if (!cacheDocs.has(k)) {
      const d = leerDocumento(raiz, doc);
      if (!d) avisos.push(`${doc.opcional ? 'documento opcional' : 'FALTA el documento'} ${doc.ruta}${doc.opcional ? ' (aún no existe: se sigue sin él)' : ''}`);
      else if (d.faltan.length) avisos.push(`${doc.ruta}: no se encontraron las secciones ${d.faltan.map((x) => JSON.stringify(x)).join(', ')}`);
      cacheDocs.set(k, d ? { ruta: doc.ruta, ...(doc.secciones ? { secciones: doc.secciones } : {}), texto: d.texto, tokens: tokensDe(d.texto) } : null);
    }
    return cacheDocs.get(k);
  };

  const guias = new Set();
  for (const c of cambiados) {
    const m = c.ruta.match(/^i18n\/(?:textos|revision)\/([a-z]{2})(?:[-/]|$)/);
    if (m && paquetes.guiasDeIdioma?.[m[1]]) guias.add(paquetes.guiasDeIdioma[m[1]]);
  }

  const versionDeReglas = sha256(JSON.stringify(versionesDeReglas())).slice(0, 16);
  const revisores = [];
  const unidades = [];
  const soloDocs = zonasDisparadas.has('docs-solo');
  for (const nombre of ORDEN_DE_REVISORES) {
    const def = paquetes.revisores?.[nombre];
    if (!def || soloDocs) continue;
    const todas = def.zonas.includes('*');
    const suyas = todas ? revisables : revisables.filter((c) => c.zonas.some((z) => def.zonas.includes(z)));
    const porDisparador = def.conDisparadores
      ? [...new Set(disparadores.filter((d) => ['carpeta-nueva', 'arista-nueva', 'exports-index'].includes(d.tipo)).flatMap((d) => d.rutas || []))]
        .filter((r) => !suyas.some((c) => c.ruta === r)).map((r) => revisables.find((c) => c.ruta === r)).filter(Boolean)
      : [];
    const archivos = [...suyas, ...porDisparador];
    if (!archivos.length) continue;
    const zonasDelRevisor = new Set(archivos.flatMap((c) => c.zonas));
    const docs = [...paquetes.siempre];
    const ids = [];
    for (const p of paquetes.paquetes) {
      if (def.soloPaquetes && !def.soloPaquetes.includes(p.id)) continue;
      if (p.zonas.some((z) => zonasDelRevisor.has(z))) { ids.push(p.id); docs.push(...p.documentos); }
    }
    if (zonasDelRevisor.has('i18n')) for (const g of guias) docs.push({ ruta: g });
    const rubricaRuta = def.rubrica;
    const rubricaTexto = leer(rubricaRuta);
    if (rubricaTexto === null) avisos.push(`FALTA la rúbrica ${rubricaRuta}`);
    const comunRuta = paquetes.rubricaComun || null;
    const comunTexto = comunRuta ? leer(comunRuta) : '';
    if (comunRuta && comunTexto === null) avisos.push(`FALTA la rúbrica común ${comunRuta}`);
    const versionRubrica = sha256(`${comunTexto || ''}|${rubricaTexto || ''}|${versionDeReglas}`).slice(0, 16);
    const leidos = docs.map(documento).filter(Boolean);
    const hashPaquete = sha256(leidos.map((d) => `${d.ruta}\n${d.texto}`).join('\n\u0000\n')).slice(0, 16);
    const importadoresDelRevisor = importadores.filter((i) => i.importa.some((a) => archivos.some((c) => c.ruta === a)));

    if (comunRuta) unidades.push({ revisor: nombre, tipo: 'rubrica', ruta: comunRuta, tokens: tokensDe(comunTexto), prioridad: 0 });
    unidades.push({ revisor: nombre, tipo: 'rubrica', ruta: rubricaRuta, tokens: tokensDe(rubricaTexto), prioridad: 0 });
    // Prioridades: rúbricas (0), lo de siempre (1), el paquete de la zona (2), archivos de zona roja (3), el resto
    // de archivos (4) e importadores directos (5). El contexto va antes que los archivos: revisar sin las reglas
    // de la zona es peor que no revisar, y lo que no cabe se lista.
    for (const d of leidos) unidades.push({ revisor: nombre, tipo: 'documento', ruta: d.ruta, ...(d.secciones ? { secciones: d.secciones } : {}), tokens: d.tokens, prioridad: paquetes.siempre.some((s) => s.ruta === d.ruta) ? 1 : 2 });
    for (const c of archivos) {
      const clave = sha256(`${versionRubrica}|${c.hash}|${hashPaquete}|${modelo}`);
      const prioridad = c.zonaRoja || c.zonas.includes('seguridad') || c.zonas.includes('dinero') ? 3 : 4;
      unidades.push({ revisor: nombre, tipo: 'archivo', ruta: c.ruta, estado: c.estado, tokens: c.tokens, prioridad, clave });
    }
    for (const i of importadoresDelRevisor) {
      const texto = leer(i.ruta);
      unidades.push({ revisor: nombre, tipo: 'importador', ruta: i.ruta, importa: i.importa, tokens: tokensDe(texto), prioridad: 5 });
    }
    revisores.push({ nombre, rubrica: rubricaRuta, ...(comunRuta ? { rubricaComun: comunRuta } : {}), versionRubrica, hashPaquete, zonas: [...zonasDelRevisor].sort(), paquetes: ids, archivos: archivos.map((c) => c.ruta) });
  }

  // Caché: lo ya revisado con la misma rúbrica, el mismo archivo, el mismo paquete y el mismo modelo.
  const dirCache = path.join(raiz, DIR_CACHE);
  let aciertos = 0;
  for (const u of unidades) {
    if (!u.clave) continue;
    const f = path.join(dirCache, `${u.clave}.json`);
    u.enCache = fs.existsSync(f);
    if (u.enCache) { aciertos++; u.tokensSinCache = u.tokens; u.tokens = 0; }
  }

  // Presupuesto: primero las rúbricas y lo de siempre de todos; después, revisor a revisor (seguridad,
  // arquitectura, código), su paquete y sus archivos de zona roja; luego el resto de archivos y por último los
  // importadores. Lo que no cabe se lista, nunca se recorta en silencio.
  const tramo = (u) => (u.prioridad <= 1 ? [0, u.prioridad, 0] : u.prioridad <= 3 ? [1, ORDEN_DE_REVISORES.indexOf(u.revisor), u.prioridad] : [u.prioridad - 2, ORDEN_DE_REVISORES.indexOf(u.revisor), 0]);
  const comparar = (a, b) => {
    const x = tramo(a.u);
    const y = tramo(b.u);
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || ORDEN_DE_REVISORES.indexOf(a.u.revisor) - ORDEN_DE_REVISORES.indexOf(b.u.revisor) || a.i - b.i;
  };
  const orden = unidades.map((u, i) => ({ u, i })).sort(comparar);
  let usados = 0;
  for (const { u } of orden) {
    u.dentro = usados + u.tokens <= presupuesto;
    if (u.dentro) usados += u.tokens;
  }
  const fuera = unidades.filter((u) => !u.dentro).map((u) => ({ revisor: u.revisor, tipo: u.tipo, ruta: u.ruta, tokens: u.tokens, motivo: `no cabe en el presupuesto (${presupuesto} tokens)` }));
  const total = unidades.reduce((s, u) => s + u.tokens, 0);
  for (const r of revisores) {
    r.tokens = unidades.filter((u) => u.revisor === r.nombre && u.dentro).reduce((s, u) => s + u.tokens, 0);
    r.unidadesFuera = unidades.filter((u) => u.revisor === r.nombre && !u.dentro).length;
  }

  return {
    herramienta: 'wee-revision/selector',
    version: VERSION,
    raiz,
    base,
    generado: new Date().toISOString(),
    modelo,
    presupuesto,
    cambiados: cambiados.map(({ hash, ...c }) => c),
    borrados,
    importadores,
    zonasDisparadas: [...zonasDisparadas].sort(),
    disparadores,
    revisores,
    unidades,
    fueraDelPresupuesto: fuera,
    tokens: { total, dentro: usados, fuera: total - usados, presupuesto },
    cache: { directorio: DIR_CACHE, aciertos, fallos: unidades.filter((u) => u.clave && !u.enCache).length },
    avisos,
  };
};

export const resumenDelPlan = (p) => {
  const l = [];
  l.push(`Selector de Weë — base ${p.base}: ${p.cambiados.length} cambiados, ${p.borrados.length} borrados, ${p.importadores.length} importadores directos`);
  l.push(`  zonas: ${p.zonasDisparadas.join(', ') || '—'}`);
  const gen = p.cambiados.filter((c) => c.generado).length;
  const docs = p.cambiados.filter((c) => c.doc).length;
  const apartados = p.cambiados.filter((c) => c.noRevisable && !c.generado && !c.doc).length;
  if (gen + docs + apartados) l.push(`  sin revisor de IA por diseño: ${gen} generados, ${docs} documentos, ${apartados} apartados por noRevisables (motivo en el plan)`);
  for (const r of p.revisores) l.push(`  ${r.nombre}: ${r.archivos.length} archivos, paquetes [${r.paquetes.join(', ')}], ${r.tokens} tokens${r.unidadesFuera ? `, ${r.unidadesFuera} unidades FUERA` : ''}`);
  if (!p.revisores.length) l.push('  ningún revisor de IA: no hay código que revisar (o solo documentos)');
  l.push(`  tokens: ${p.tokens.dentro} de ${p.tokens.total} estimados dentro del presupuesto de ${p.presupuesto}; caché: ${p.cache.aciertos} aciertos, ${p.cache.fallos} fallos`);
  if (p.fueraDelPresupuesto.length) {
    l.push(`  FUERA DEL PRESUPUESTO (${p.fueraDelPresupuesto.length}): no se revisan en esta pasada`);
    for (const f of p.fueraDelPresupuesto) l.push(`    · ${f.revisor} ${f.tipo} ${f.ruta} (${f.tokens} tokens)`);
  }
  for (const a of p.avisos) l.push(`  aviso: ${a}`);
  return l.join('\n');
};

/* ── la caché: los hallazgos de una revisión hecha ───────────────────────── */

/** Una ruta con la forma del plan (relativa a la raíz, con `/`), o '' si no es un texto con algo dentro. */
const normalizarRuta = (r) => (typeof r === 'string' ? r.trim().replace(/\\/g, '/').replace(/^(?:\.\/)+/, '') : '');

/**
 * Los archivos que nombra un hallazgo de un revisor IA, ordenados y sin repetir.
 *
 * El contrato es el de la rúbrica común §7: `evidencia` es una LISTA de `{ ruta, linea, fragmento }`. Se recorren
 * TODOS sus elementos —no solo el primero: un hallazgo puede tocar varios archivos y el orden de la lista no decide
 * nada—, y no todos señalan un archivo: uno con solo un símbolo, un mensaje o metadatos no aporta ruta, y nunca se
 * inventa una (tampoco a partir del id). Se aceptan las formas de antes para no perder hallazgos ya escritos:
 * `evidencia` como un objeto y una `ruta` arriba (el apaño que los revisores ponían a mano).
 * Los hallazgos de los DETECTORES no pasan por aquí: su `evidencia` es un objeto (`detectores.mjs`) y la leen
 * `clasificacion.mjs`, `sarif.mjs` y `baseline.mjs`.
 */
export const rutasDeHallazgo = (h) => {
  if (!h || typeof h !== 'object') return [];
  const evidencias = Array.isArray(h.evidencia) ? h.evidencia : [h.evidencia];
  const rutas = [...evidencias.map((e) => e?.ruta), h.ruta].map(normalizarRuta).filter(Boolean);
  return [...new Set(rutas)].sort();
};

/**
 * Reparte los hallazgos de una revisión entre las unidades del plan que se registran: las de tipo archivo, con
 * clave, dentro del presupuesto y que NO eran ya un acierto de la caché (el revisor no las vuelve a revisar, así que
 * su entrada se conserva; reescribirla la dejaría vacía). Cada unidad recibe los hallazgos de SU revisor que nombran
 * su archivo (`rutasDeHallazgo`): uno que nombra dos archivos va a los dos; uno que nombra el mismo varias veces, una
 * sola vez; varios resultados del mismo revisor se suman. Pura: no lee ni escribe.
 *
 * Lo que no cae en ninguna unidad sale en `sinEntrada`, con su motivo, y no se guarda: la caché nunca lo apunta en
 * un archivo inventado ni en el de otro, y quien registra lo ve. Un resultado que no es el JSON de un revisor (sin
 * su lista de `hallazgos`) se rechaza antes de escribir nada: no puede dejar entradas «revisado y limpio».
 */
export const repartirHallazgos = (plan, resultados) => {
  const lista = Array.isArray(resultados) ? resultados : [resultados];
  lista.forEach((r, i) => {
    if (!r || typeof r !== 'object' || !Array.isArray(r.hallazgos)) {
      throw new Error(`resultados[${i}]${r?.revisor ? ` (${r.revisor})` : ''} no es el JSON de un revisor: \`hallazgos\` tiene que ser una lista (rúbrica común §7)`);
    }
  });
  const colocados = new Set();
  const entradas = [];
  for (const u of plan.unidades.filter((x) => x.tipo === 'archivo' && x.clave && x.dentro && !x.enCache)) {
    const delRevisor = lista.filter((r) => r.revisor === u.revisor);
    if (!delRevisor.length) continue;
    const hallazgos = delRevisor.flatMap((r) => r.hallazgos).filter((h) => rutasDeHallazgo(h).includes(u.ruta));
    for (const h of hallazgos) colocados.add(h);
    entradas.push({ unidad: u, hallazgos });
  }
  const sinEntrada = lista.flatMap((r) => r.hallazgos.filter((h) => !colocados.has(h)).map((h) => {
    const rutas = rutasDeHallazgo(h);
    return {
      revisor: r.revisor ?? null, id: h?.id ?? null, rutas,
      motivo: rutas.length
        ? `ninguna de sus rutas (${rutas.join(', ')}) es un archivo de ${r.revisor || 'su revisor'} por registrar en este plan (fuera del plan, importador, fuera del presupuesto o ya en la caché)`
        : 'su evidencia no nombra ningún archivo: no se inventa uno',
    };
  }));
  return { entradas, sinEntrada };
};

/** Guarda en la caché los hallazgos de una revisión: una entrada por revisor y archivo del plan (`repartirHallazgos`). */
export const registrar = (raiz, plan, resultados) => {
  const { entradas } = repartirHallazgos(plan, resultados);
  const dir = path.join(raiz, DIR_CACHE);
  fs.mkdirSync(dir, { recursive: true });
  for (const { unidad: u, hallazgos } of entradas) {
    fs.writeFileSync(path.join(dir, `${u.clave}.json`), `${JSON.stringify({ clave: u.clave, revisor: u.revisor, ruta: u.ruta, modelo: plan.modelo, registrado: new Date().toISOString(), hallazgos }, null, 2)}\n`);
  }
  return entradas.length;
};

const principal = () => {
  const args = leerArgumentos(process.argv.slice(2));
  const raiz = path.resolve(args.raiz || RAIZ_POR_DEFECTO);
  if (args.registrar) {
    const plan = leerJson(args.registrar);
    const resultados = leerJson(args._[0]);
    const { sinEntrada } = repartirHallazgos(plan, resultados);
    const conservados = plan.unidades.filter((u) => u.tipo === 'archivo' && u.clave && u.dentro && u.enCache).length;
    console.log(`Caché: ${registrar(raiz, plan, resultados)} entradas escritas en ${DIR_CACHE}${conservados ? ` (${conservados} aciertos del plan se conservan sin tocar)` : ''}`);
    if (sinEntrada.length) {
      console.log(`  aviso: ${sinEntrada.length} ${sinEntrada.length === 1 ? 'hallazgo queda' : 'hallazgos quedan'} fuera de la caché (al informe, tal cual):`);
      for (const s of sinEntrada) console.log(`    · ${s.revisor || '(sin revisor)'} ${s.id || '(sin id)'}: ${s.motivo}`);
    }
    return 0;
  }
  let base = args.base;
  if (!base) {
    const rb = path.join(raiz, args.baseline || 'ops/revision/baseline.json');
    if (fs.existsSync(rb)) base = leerJson(rb).corte;
  }
  const plan = planificar({
    raiz, base, presupuesto: args.presupuesto, modelo: args.modelo,
    detectores: args.detectores ? leerJson(args.detectores) : null,
  });
  if (args.plan) escribirJson(args.plan, plan);
  console.log(resumenDelPlan(plan));
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = principal(); } catch (e) { console.error(`✘ ${e.message}`); process.exitCode = 2; }
}
