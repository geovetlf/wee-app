#!/usr/bin/env node
/**
 * EL ESPEJO DE FILMMAKER EN EL CLIENTE — se GENERA, no se escribe (F1-C).
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El dominio de Weë Filmmaker (F1-A) vive en `functions/src/filmmaker/` y es la
 * fuente normativa: el modelo, la validación, las operaciones, lo pendiente, las
 * recomendaciones y los requisitos. La pantalla de producción necesita
 * exactamente eso —validar y aplicar una operación en local antes de guardarla,
 * enseñar las recomendaciones, la línea de tiempo y las tarjetas del
 * storyboard—, y `metro.config.js` deja `functions/` fuera del bundle de la app.
 *
 * Escribir una segunda versión a mano sería tener dos verdades. Esto no escribe
 * ninguna: IMPRIME el árbol sintáctico de cada archivo —con el compilador de
 * TypeScript, sin comentarios— en `services/filmmaker/espejo/`, con las mismas
 * rutas relativas, así que ningún `import` cambia. Es el mismo código.
 *
 * ── Qué copia ───────────────────────────────────────────────────────────────
 *
 * Los cinco archivos de `functions/src/filmmaker/` y lo que importan del Core:
 * contratos y vocabularios puros, sin Firebase, sin red y sin reloj. De
 * `core/gateway.ts`, que arrastraría el Gateway entero, solo el tipo
 * `ExecutionHints`: es lo único que `modelo.ts` toma de él.
 *
 * Y una segunda raíz, por la misma puerta y con las mismas reglas: el núcleo 3D
 * de Weë (`core/escena3d.ts`, el WEË 3D Engine). Es UNO para Weë Studio (3D
 * World), Weë Design (3D Design) y Filmmaker, y la app lo necesita igual que el
 * dominio de F1-A —construir y validar una escena en local con la misma regla
 * que el servidor—. Copiarlo a mano serían dos verdades; un segundo generador,
 * dos espejos. Se añade su raíz (`RAICES_DEL_NUCLEO_3D`) y su cierre en el Core
 * —contratos e identidad— ya estaba dentro. La app lo lee por su propia puerta,
 * `services/escena3d.ts`, que solo reexporta.
 *
 * ── Cómo se vigila ──────────────────────────────────────────────────────────
 *
 * `functions/test/filmmaker-espejo.test.mjs` lo vuelve a generar en memoria y
 * exige que coincida byte a byte con lo que hay en disco, y además carga las dos
 * versiones y comprueba que dicen y hacen lo mismo. Si F1-A cambia y nadie
 * regenera, o si alguien toca el espejo a mano, la cadena se pone en rojo.
 *
 *   node scripts/espejo-filmmaker.mjs            lo regenera
 *   node scripts/espejo-filmmaker.mjs --check    solo comprueba: sale con 1 si difiere
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

/** De dónde sale y a dónde va, relativos a la raíz del repositorio. */
export const ORIGEN_DEL_ESPEJO = 'functions/src';
export const DESTINO_DEL_ESPEJO = 'services/filmmaker/espejo';

/**
 * LAS RAÍCES DEL NÚCLEO 3D: lo que entra en el espejo por sí mismo, sin que F1-A
 * lo importe. Su cierre de importaciones (contratos e identidad) ya forma parte
 * del de F1-A; si algún día importara otro módulo del Core, la prueba del
 * espejo lo mediría y exigiría añadirlo aquí abajo.
 */
export const RAICES_DEL_NUCLEO_3D = Object.freeze(['core/escena3d.ts']);

/**
 * El dominio y su cierre en el Core, medido siguiendo sus `import`, más el
 * núcleo 3D. Si F1-A o el núcleo 3D empezaran a importar otro módulo, el espejo
 * no compilaría: la lista no se queda corta en silencio.
 */
export const ARCHIVOS_DEL_ESPEJO = Object.freeze([
  'filmmaker/modelo.ts',
  'filmmaker/validacion.ts',
  'filmmaker/operaciones.ts',
  'filmmaker/recomendaciones.ts',
  'filmmaker/requisitos.ts',
  'core/contracts.ts',
  'core/creative.ts',
  'core/continuity.ts',
  'core/shot.ts',
  'core/identity.ts',
  'core/capability.ts',
  'core/cost.ts',
  'core/language.ts',
  'core/content/asset.ts',
  'core/registry/capabilities.ts',
  ...RAICES_DEL_NUCLEO_3D,
]);

/** Lo único que se toma de `core/gateway.ts`. */
export const TIPOS_DEL_GATEWAY = Object.freeze(['ExecutionHints']);

const cabecera = (ruta) =>
  `// GENERADO por scripts/espejo-filmmaker.mjs desde ${ORIGEN_DEL_ESPEJO}/${ruta}: no se edita a mano, se regenera.\n`;

/** El TypeScript de la app, siempre el mismo: la impresión depende de su versión. */
const typescriptDe = (raiz) => createRequire(path.join(raiz, 'package.json'))('typescript');

/**
 * EL ESPEJO ENTERO, EN MEMORIA: ruta dentro de `DESTINO_DEL_ESPEJO` → contenido.
 * Sin escribir nada; quien llama decide si lo guarda o lo compara.
 */
export const generarEspejo = (raiz) => {
  const ts = typescriptDe(raiz);
  const impresora = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const leer = (ruta) => fs.readFileSync(path.join(raiz, ORIGEN_DEL_ESPEJO, ruta), 'utf8');
  const analizar = (ruta) => ts.createSourceFile(ruta, leer(ruta), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const salida = new Map();

  for (const ruta of ARCHIVOS_DEL_ESPEJO) salida.set(ruta, cabecera(ruta) + impresora.printFile(analizar(ruta)));

  /* De core/gateway.ts, el tipo y los `import type` que ese tipo necesita. Nada más. */
  const gateway = analizar('core/gateway.ts');
  const declaraciones = gateway.statements.filter((s) => ts.isInterfaceDeclaration(s) && TIPOS_DEL_GATEWAY.includes(s.name.text));
  if (declaraciones.length !== TIPOS_DEL_GATEWAY.length) throw new Error('core/gateway.ts ya no declara ExecutionHints como interfaz');
  const usados = new Set();
  const andar = (n) => { if (ts.isTypeReferenceNode(n) && ts.isIdentifier(n.typeName)) usados.add(n.typeName.text); ts.forEachChild(n, andar); };
  declaraciones.forEach(andar);
  const porModulo = new Map();
  for (const s of gateway.statements) {
    if (!ts.isImportDeclaration(s) || !s.importClause?.namedBindings || !ts.isNamedImports(s.importClause.namedBindings)) continue;
    for (const e of s.importClause.namedBindings.elements) {
      if (!usados.has(e.name.text)) continue;
      const modulo = s.moduleSpecifier.text;
      porModulo.set(modulo, [...(porModulo.get(modulo) ?? []), e.name.text].sort());
    }
  }
  const imports = [...porModulo].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([modulo, nombres]) => `import type { ${nombres.join(', ')} } from '${modulo}';\n`).join('');
  const cuerpo = declaraciones.map((d) => impresora.printNode(ts.EmitHint.Unspecified, d, gateway)).join('\n');
  salida.set('core/gateway.ts', cabecera('core/gateway.ts') + imports + cuerpo + '\n');
  return salida;
};

/** Lo que hay en disco ahora, con la misma forma. Solo los `.ts`. */
export const leerEspejo = (raiz) => {
  const base = path.join(raiz, DESTINO_DEL_ESPEJO);
  const salida = new Map();
  if (!fs.existsSync(base)) return salida;
  for (const nombre of fs.readdirSync(base, { recursive: true })) {
    const rel = String(nombre).split(path.sep).join('/');
    const abs = path.join(base, rel);
    if (fs.statSync(abs).isFile()) salida.set(rel, fs.readFileSync(abs, 'utf8'));
  }
  return salida;
};

const principal = () => {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const esperado = generarEspejo(raiz);
  const actual = leerEspejo(raiz);
  const distintos = [...new Set([...esperado.keys(), ...actual.keys()])].filter((r) => esperado.get(r) !== actual.get(r)).sort();
  if (process.argv.includes('--check')) {
    console.log(distintos.length ? `el espejo difiere en: ${distintos.join(', ')}` : `el espejo está al día (${esperado.size} archivos)`);
    process.exit(distintos.length ? 1 : 0);
  }
  const base = path.join(raiz, DESTINO_DEL_ESPEJO);
  for (const rel of actual.keys()) if (!esperado.has(rel)) fs.rmSync(path.join(base, rel));
  for (const [rel, contenido] of esperado) {
    fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true });
    fs.writeFileSync(path.join(base, rel), contenido);
  }
  console.log(`espejo regenerado: ${esperado.size} archivos en ${DESTINO_DEL_ESPEJO}${distintos.length ? ` (cambiaron ${distintos.length})` : ' (sin cambios)'}`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
