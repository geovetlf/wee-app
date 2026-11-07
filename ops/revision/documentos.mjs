/*
 * AUDITORÍA DE DOCUMENTACIÓN — un detector más del Revisor de Weë (capa 2, docs/REVISION.md), NO un segundo revisor.
 *
 * Los demás detectores parsean el AST de TypeScript; la documentación (`*.md`, incluido CLAUDE.md) no es código y
 * nadie la miraba. Este módulo la recorre y devuelve hallazgos CRUDOS al MISMO pipeline de `detectores.mjs`
 * (`crudos → asignarIds → baseline → G3 → CI`): reutiliza la forma del hallazgo, la baseline, la puerta y el
 * selector. No escribe nada, no usa red, no llama a IA. Determinista.
 *
 * Tres reglas, todas `media` y de dominio `doc/` (nunca `higiene/*`, así que no bloquean una fase por sí solas):
 *  · doc/enlace-roto          — un enlace Markdown `[texto](destino)` a un archivo del repo que no existe.
 *  · doc/referencia-inexistente — un `path` entre comillas simples (código en línea) con PINTA de archivo del
 *                                 repo (con extensión conocida o terminado en `/`) que no existe.
 *  · doc/comando-inexistente  — un `npm [run] <script>` documentado cuyo script no está en el package.json que toca.
 *
 * Diseñado para CERO falsos positivos sobre documentación válida: se descartan URLs, anclas, placeholders
 * (`<...>`, `{...}`), globs (`*`), rutas de Firestore sin extensión (`aiSettings/runtime`), nombres sueltos sin
 * `/`, y todo lo que no tenga forma inequívoca de archivo. Lo que no se puede decidir, no se marca.
 */
import fs from 'node:fs';
import path from 'node:path';
import { huellaDe, corto } from './comun.mjs';
import { reglaPorId } from './reglas.mjs';

/*
 * Extensiones que, entre comillas, delatan un archivo FUENTE del repo. A propósito NO están `.js`/`.jsx` (en Weë el
 * fuente es `.ts`/`.mjs`; un `.js` citado es casi siempre compilado de `functions/lib`, que git no sigue) ni assets
 * (`.png`…) ni dirs: eso evita marcar salida de build, colecciones de Firestore o carpetas de plataforma.
 */
const EXT_DE_ARCHIVO = new Set([
  '.ts', '.tsx', '.mts', '.cts', '.mjs', '.cjs', '.json', '.md', '.rules', '.yml', '.yaml', '.sh',
]);

/** ¿La ruta `.md` es documentación que auditamos? (toda `*.md` seguida por git; node_modules nunca está). */
export const esDocumento = (ruta) => ruta.endsWith('.md');

/* Un destino que NO es una referencia a un archivo del repo: URL, ancla, placeholder, absoluto de sitio. */
const noEsRutaLocal = (d) =>
  !d
  || /^(https?:|mailto:|tel:|ftp:|data:|#|\/\/)/i.test(d)
  || d.includes('://')
  || d.startsWith('/')
  || /[\s<>{}$*`|]/.test(d)
  || d.includes('{{');

/** Conjunto de todos los directorios que existen según git (prefijos de las rutas seguidas). */
const directoriosDe = (seguidos) => {
  const dirs = new Set();
  for (const r of seguidos) {
    let i = r.indexOf('/');
    while (i !== -1) { dirs.add(r.slice(0, i)); i = r.indexOf('/', i + 1); }
  }
  return dirs;
};

/**
 * Recorre la documentación y devuelve hallazgos crudos. `seguidos` es el Set de archivos que sigue git; `foco`
 * (si viene) limita a esas rutas; `activa(regla)` respeta `--solo`. Empuja avisos no fatales a `avisos`.
 */
export const revisarDocumentos = ({ raiz, seguidos, foco = null, activa = () => true, avisos = [] }) => {
  const crudos = [];
  const dirs = directoriosDe(seguidos);
  const existe = (rel) => {
    const limpio = rel.replace(/\/+$/, '');
    if (!limpio) return true;
    if (seguidos.has(limpio) || dirs.has(limpio)) return true;
    try { return fs.existsSync(path.join(raiz, limpio)); } catch { return false; }
  };
  /*
   * Los documentos citan los archivos por SUFIJO: `creator/brain.ts` significa `functions/src/creator/brain.ts`
   * (el prefijo se da antes en la prosa), `providers/gemini.ts` = `functions/src/engine/providers/gemini.ts`. Un
   * conjunto con TODOS los sufijos de cada ruta seguida deja decidir «existe por sufijo» en O(1) y sin falsos
   * positivos por esas referencias parciales, que son la forma normal de escribir en estos docs.
   */
  const sufijos = new Set();
  for (const p of seguidos) { const seg = p.split('/'); for (let k = 0; k < seg.length; k++) sufijos.add(seg.slice(k).join('/')); }
  for (const d of dirs) { const seg = d.split('/'); for (let k = 0; k < seg.length; k++) sufijos.add(seg.slice(k).join('/')); }
  /* Un segmento TODO-MAYÚSCULAS (`FECHA-FASE`, `FASE`) es un hueco de plantilla, no un archivo: no se marca. */
  const esPlantilla = (t) => t.split('/').some((seg) => { const base = seg.replace(/\.[\w.]+$/, ''); return base.length >= 2 && /^[A-Z0-9][A-Z0-9_-]*$/.test(base); });
  /* package.json que toca un `npm [--prefix X] …`: el de la raíz o el del prefijo. `scripts` cacheado. */
  const cacheScripts = new Map();
  const scriptsDe = (prefijo) => {
    const rel = prefijo ? `${prefijo.replace(/\/+$/, '')}/package.json` : 'package.json';
    if (cacheScripts.has(rel)) return cacheScripts.get(rel);
    let scripts = null;
    try { scripts = JSON.parse(fs.readFileSync(path.join(raiz, rel), 'utf8')).scripts || {}; } catch { scripts = null; }
    cacheScripts.set(rel, scripts);
    return scripts;
  };

  const quiere = {
    enlace: activa('doc/enlace-roto'),
    ref: activa('doc/referencia-inexistente'),
    cmd: activa('doc/comando-inexistente'),
  };
  if (!quiere.enlace && !quiere.ref && !quiere.cmd) return crudos;

  const docs = [...seguidos].filter((r) => esDocumento(r) && (!foco || foco.has(r))).sort();
  for (const ruta of docs) {
    let texto;
    try { texto = fs.readFileSync(path.join(raiz, ruta), 'utf8'); } catch { continue; }
    const dirDoc = path.posix.dirname(ruta);
    // Un enlace Markdown es relativo al DIRECTORIO del propio documento (convención Markdown estándar):
    // CLAUDE.md (dir «.») + `docs/CREATOR.md` → docs/CREATOR.md; docs/HARNESS.md + `DEPLOYMENT.md` → docs/DEPLOYMENT.md.
    const resolver = (destino) => {
      const d = destino.replace(/[?#].*$/, '').replace(/^<|>$/g, '').trim();
      if (!d) return null;
      return path.posix.normalize(path.posix.join(dirDoc, d));
    };
    const lineas = texto.split(/\r?\n/);
    let enValla = false; // dentro de un bloque ``` ... ```
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      const nLinea = i + 1;
      const vallaAqui = /^\s*(```|~~~)/.test(linea);
      if (vallaAqui) { enValla = !enValla; }

      // 3) `npm [run] <script>` — se mira DENTRO y FUERA de las vallas (los comandos viven en bloques ```bash```).
      if (quiere.cmd) {
        const re = /\bnpm\s+(?:--prefix\s+(\S+)\s+)?(?:(run|run-script)\s+([\w:.@/-]+)|(test|start)\b)/g;
        let m;
        while ((m = re.exec(linea))) {
          const prefijo = m[1] && !/[<>${}*]/.test(m[1]) ? m[1].replace(/\/+$/, '') : null;
          const script = m[3] || m[4];
          if (!script || /[<>${}*]/.test(script) || /[:._/-]$/.test(script) || script.length < 2) continue; // placeholder/recorte: no se decide
          /*
           * Con `--prefix X` el package.json es ese; sin prefijo, el comando podría correrse desde la raíz o desde
           * functions/, así que solo es «inexistente» si NO está en NINGUNO de los dos package.json reales.
           */
          const candidatos = prefijo ? [prefijo] : ['', 'functions'];
          const mapas = candidatos.map(scriptsDe);
          if (mapas.some((s) => s === null)) continue; // algún package.json no se pudo leer: no se decide
          if (mapas.some((s) => script in s)) continue; // existe en alguno de los aplicables
          const donde = prefijo ? `${prefijo}/package.json` : 'package.json ni functions/package.json';
          crudos.push({
            regla: 'doc/comando-inexistente', ruta, ancla: `npm:${prefijo ? `${prefijo}:` : ''}${script}`,
            severidad: reglaPorId.get('doc/comando-inexistente').severidad,
            mensaje: `el documento usa \`npm ${prefijo ? `--prefix ${prefijo} ` : ''}${m[2] ? `${m[2]} ` : ''}${script}\` pero «${script}» no es un script de ${donde}`,
            huella: huellaDe(`${ruta}:${prefijo}:${script}`, { codigo: false }), linea: nLinea, fragmento: corto(linea.trim()),
            relacionados: [prefijo ? `${prefijo}/package.json` : 'package.json'],
          });
        }
      }

      if (enValla || vallaAqui) continue; // enlaces y refs: solo fuera de los bloques de código

      // 1) enlaces Markdown [texto](destino) y definiciones de referencia [id]: destino
      if (quiere.enlace) {
        // El código en línea (`…`) no renderiza enlaces: un `[texto](destino)` dentro de comillas es un EJEMPLO de
        // sintaxis, no un enlace vivo. Se quita antes de buscar, para no marcar la documentación que enseña el formato.
        const sinCodigo = linea.replace(/`[^`]*`/g, ' ');
        const enlaces = [];
        // El destino puede traer un título: `](ruta "Título")`. Nos quedamos con el primer token (la ruta).
        for (const m of sinCodigo.matchAll(/\[(?:[^\]]*)\]\(\s*([^)]+?)\s*\)/g)) enlaces.push(m[1].trim().split(/\s+/)[0]);
        const def = sinCodigo.match(/^\s*\[[^\]]+\]:\s*(\S+)/);
        if (def) enlaces.push(def[1].trim());
        for (const destino of enlaces) {
          if (noEsRutaLocal(destino)) continue;
          const rel = resolver(destino);
          if (!rel || rel.startsWith('..')) continue; // fuera del repo: no se decide
          if (!existe(rel)) {
            crudos.push({
              regla: 'doc/enlace-roto', ruta, ancla: destino.replace(/[?#].*$/, ''),
              severidad: reglaPorId.get('doc/enlace-roto').severidad,
              mensaje: `enlace a «${destino}» → no existe ${rel}`,
              huella: huellaDe(`${ruta}:${destino}`, { codigo: false }), linea: nLinea, fragmento: corto(linea.trim()),
              relacionados: [rel],
            });
          }
        }
      }

      // 2) `path` entre comillas simples con pinta inequívoca de archivo del repo
      if (quiere.ref) {
        for (const m of linea.matchAll(/`([^`\n]+)`/g)) {
          const tok = m[1].trim();
          if (!tok.includes('/') || noEsRutaLocal(tok) || /[\s,'"()]/.test(tok)) continue;
          if (tok.includes('node_modules') || tok.includes('\u2026')) continue; // … (ellipsis) = recorte, no un archivo
          if (/^([A-Za-z]:|~)/.test(tok)) continue; // ruta absoluta del sistema (C:/…), no del repo
          if (/(^|[^.])\.\.(?![/])/.test(tok)) continue; // patrón tipo `slide-1..4.jpg`, no un `../` real
          if (tok.endsWith('.local.json')) continue; // override local, ignorado por git a propósito
          const seg0 = tok.replace(/^\.\.?\//, '').split('/')[0];
          if (seg0.includes('.') && !seg0.startsWith('.')) continue; // primer segmento con punto = dominio (openapi.vercel.sh/…)
          const ext = path.posix.extname(tok).toLowerCase();
          if (!EXT_DE_ARCHIVO.has(ext)) continue; // solo archivos fuente con extensión conocida (no dirs, no compilado)
          if (esPlantilla(tok)) continue; // hueco de plantilla (FECHA-FASE…), no un archivo
          const relativo = /^\.\.?\//.test(tok);
          const rel = (relativo ? resolver(tok) : path.posix.normalize(tok)).replace(/\/+$/, '');
          if (!rel || rel.startsWith('..')) continue;
          // Existe si la ruta exacta existe (desde la raíz o desde el doc) O si es sufijo de una ruta seguida.
          if (existe(rel) || (!relativo && sufijos.has(rel))) continue;
          crudos.push({
            regla: 'doc/referencia-inexistente', ruta, ancla: tok.replace(/\/+$/, ''),
            severidad: reglaPorId.get('doc/referencia-inexistente').severidad,
            mensaje: `referencia a «${tok}» → no existe en el repo (ni como ruta ni como sufijo de una ruta seguida)`,
            huella: huellaDe(`${ruta}:${tok}`, { codigo: false }), linea: nLinea, fragmento: corto(linea.trim()),
            relacionados: [rel],
          });
        }
      }
    }
  }
  return crudos;
};
