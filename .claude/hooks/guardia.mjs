#!/usr/bin/env node
/*
 * GUARDIA — el hook PreToolUse del Weë Agent Harness.
 *
 * ── Qué hace ───────────────────────────────────────────────────────────────
 *
 * Antes de cada comando de las herramientas Bash, PowerShell y Monitor, decide
 * si Claude lo puede ejecutar solo, si hay que preguntar al dueño o si no se
 * ejecuta nunca. Complementa a las reglas de `.claude/settings.json`: esas
 * reglas comparan el texto del comando y no ven las variantes (otro orden de
 * opciones, un `.cmd`, `npx`, `bash -c`, un subshell `(…)`, un `eval`, un
 * `node -e`, un `powershell -EncodedCommand`…). Aquí el comando se analiza de
 * forma ESTRUCTURAL: un tokenizador de shell POSIX (y otro para PowerShell)
 * parte el texto en órdenes simples a cualquier profundidad —respetando
 * comillas, escapes, `$( )`, backticks, `<( )`, subshells `( )`, grupos `{ }`,
 * palabras clave `if/then/for/while/…`, separadores y heredocs— y desenvuelve
 * los lanzadores e intérpretes (npx, env, timeout, xargs, find -exec, bash -c,
 * eval, node -e, python -c, Invoke-Expression, Start-Process, cmd /c…) para
 * mirar qué programa se ejecuta de verdad y con qué subcomando. Así un mensaje
 * de commit que MENCIONA `firebase deploy` no se bloquea, y un `(firebase
 * --project prod deploy)` metido en un subshell sí.
 *
 * Niveles (misión del Harness, §8):
 *  · 0–1 (leer, editar, probar, compilar, git local que no toca la historia
 *    —status, diff, log, add, ramas nuevas—, emuladores demo-*): pasa.
 *  · 2 (crear commits o mover ramas —commit, merge, rebase, cherry-pick, revert,
 *    am, pull, reset a otra revisión…—, push, PR, ajustes del repo, leer datos
 *    de personas): pregunta. Claude PROPONE el commit; el dueño lo AUTORIZA.
 *  · 3–4 (despliegue, IAM, secretos, borrar en producción, gastar): pregunta o
 *    se deniega. Lo que nunca debe hacer Claude se deniega: desplegar desde el
 *    portátil, borrar recursos de producción, leer VALORES de secretos o
 *    tokens, aprobarse a sí mismo un despliegue, forzar un push.
 *
 * La frontera de verdad es la credencial (Claude sin credenciales de Owner);
 * este hook es la segunda barrera, determinista y barata.
 *
 * ── Falla CERRADA ──────────────────────────────────────────────────────────
 *
 * Si algo aquí lanza (un comando retorcido que el analizador no entiende, una
 * entrada ilegible, un anidamiento desmedido con palabras sensibles), el hook
 * NO deja pasar: responde `deny` por el mismo canal y sale con código 2, que
 * Claude Code trata como bloqueo. Un anidamiento o un tamaño excesivos sin
 * ninguna palabra sensible sí pasan (no bloquear lo inocuo). El único límite
 * que no cubre: si `node` no arranca, el hook no corre y no decide nada; por
 * eso las reglas `permissions.deny` de settings.json son la segunda capa.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ── Límites (todo lineal y acotado) ───────────────────────────────────── */
const LIM_PROF = 30;          // profundidad de desenvolvimiento/anidación
const LIM_TAM = 200_000;      // tamaño de texto que se analiza de una vez
const LIM_CMDS = 6000;        // nº de órdenes simples extraídas
const LIM_CMD_SIN_C = 2;       // H7: reanálisis de `cmd` sin /c (la guardia anterior hacía hasta LIM_PROF=30; con 1 ya no hay órdenes menos estrictas en el corpus)
let NIVEL_CMD_SIN_C = 0;

/* H7: PRESUPUESTO de análisis. Las cotas de arriba acotan cada estructura por separado, pero no su producto (órdenes que se reanalizan por varios
   caminos —el modo legado de H4, las hipótesis de H6, la expansión de llaves— multiplican el trabajo por nivel de anidamiento). El hook tiene un
   plazo (settings.json: 10 s) y, si lo agota, Claude Code CONTINÚA sin bloquear: un análisis que no termina deja pasar. Por eso el análisis entero
   —de la orden de nivel 0 y de todo lo que de ella se desprende— tiene un presupuesto de pasos y de tiempo MUY inferior a ese plazo; si se agota,
   no hay decisión parcial: se DENIEGA con código 2 (nunca se permite por falta de análisis). Las env solo pueden BAJARlo (pruebas), nunca subirlo. */
const LIM_PASOS = 20_000;     // unidades de trabajo (órdenes, troceados, hipótesis y niveles analizados) por comando
const LIM_MS = 3_000;         // tiempo de pared del análisis de un comando, ≪ el plazo del hook
const topeEnv = (nombre, defecto) => { const v = Number(process.env[nombre]); return Number.isFinite(v) && v > 0 ? Math.min(defecto, v) : defecto; };
const PRESUP = { activos: 0, pasos: 0, hasta: 0, agotado: false, topePasos: LIM_PASOS };
const errorPresupuesto = () => { const e = new RangeError('presupuesto de análisis agotado'); e.presupuesto = true; return e; };
const arrancaPresupuesto = () => {
  PRESUP.pasos = 0; PRESUP.agotado = false;
  PRESUP.topePasos = topeEnv('GUARDIA_PRESUPUESTO_PASOS', LIM_PASOS);
  PRESUP.hasta = performance.now() + topeEnv('GUARDIA_PRESUPUESTO_MS', LIM_MS);
};
/** Una unidad de trabajo. Una vez agotado el presupuesto TODA llamada posterior lanza (aunque un `catch` intermedio se tragara el primer error). */
const gasta = () => {
  if (PRESUP.agotado) throw errorPresupuesto();
  PRESUP.pasos++;
  if (PRESUP.pasos > PRESUP.topePasos || performance.now() > PRESUP.hasta) { PRESUP.agotado = true; throw errorPresupuesto(); }
};

/* Palabras sensibles: solo con una de estas en el texto se bloquea lo que el
   analizador no puede resolver del todo (dinámico o fuera de límites). */
const SENSIBLE_TXT = (t) =>
  /(?:^|[^a-z])(deploy|secrets?|tokens?|credentials?|delete|destroy|purge)(?:[^a-z]|$)|--force/i.test(String(t));

/* ── Heredocs ───────────────────────────────────────────────────────────── */

/** Quita los cuerpos de los heredocs (`<<'EOF' … EOF`): son texto, no órdenes. */
export const sinHeredocs = (texto) => {
  const lineas = String(texto).split(/\r?\n/);
  const fuera = [];
  let fin = null;
  for (const l of lineas) {
    if (fin !== null) {
      if (l.trim() === fin) fin = null;
      continue;
    }
    /* `<<<` es un here-string, no un heredoc: sin el `(?<!<)…(?!<)`, `cat <<< 'EOF'` escondía las líneas siguientes. */
    const m = l.match(/(?<!<)<<(?!<)-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (m) fin = m[2];
    fuera.push(l);
  }
  return fuera.join('\n');
};

/* ── Helpers heredados (los usan las pruebas del analizador) ─────────────── */

/** Separa en órdenes por `&&`, `||`, `;`, `|` y saltos de línea, fuera de comillas. */
export const ordenes = (texto) => {
  const s = sinHeredocs(texto);
  const res = [];
  let actual = '';
  let comilla = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (comilla) {
      actual += c;
      if (c === '\\' && comilla === '"' && i + 1 < s.length) { actual += s[++i]; continue; }
      if (c === comilla) comilla = null;
      continue;
    }
    if (c === '"' || c === "'") { comilla = c; actual += c; continue; }
    const dos = s.slice(i, i + 2);
    if (dos === '&&' || dos === '||') { res.push(actual); actual = ''; i++; continue; }
    if (c === ';' || c === '|' || c === '\n') { res.push(actual); actual = ''; continue; }
    actual += c;
  }
  res.push(actual);
  return res.map((o) => o.trim()).filter(Boolean);
};

/** Palabras de una orden, quitando comillas (una palabra entre comillas sigue siendo UNA palabra). */
export const palabras = (orden) => {
  const res = [];
  let actual = '';
  let hay = false;
  let comilla = null;
  for (let i = 0; i < orden.length; i++) {
    const c = orden[i];
    if (comilla) {
      if (c === '\\' && comilla === '"' && i + 1 < orden.length && /["\\$`]/.test(orden[i + 1])) { actual += orden[++i]; continue; }
      if (c === comilla) { comilla = null; continue; }
      actual += c;
      continue;
    }
    if (c === '"' || c === "'") { comilla = c; hay = true; continue; }
    if (/\s/.test(c)) { if (hay) { res.push(actual); actual = ''; hay = false; } continue; }
    actual += c;
    hay = true;
  }
  if (hay) res.push(actual);
  return res;
};

/* ── Tokenizador estructural ─────────────────────────────────────────────── */

/** Índice del carácter `close` que equilibra el que ya abrió (i apunta tras el delimitador de apertura). */
const capturar = (s, i, open, close, ps) => {
  let depth = 1;
  let q = null;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (q === '"' && ((ps && c === '`') || (!ps && c === '\\'))) { i += 2; continue; }
      if (c === q) q = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"') { q = c; i++; continue; }
    if (!ps && c === '\\') { i += 2; continue; }
    if (ps && c === '`') { i += 2; continue; }
    if (open !== close && c === open) { depth++; i++; continue; }
    if (c === close) { depth--; if (depth === 0) return i; i++; continue; }
    i++;
  }
  return i;
};

/**
 * Índice de la comilla simple que CIERRA (i apunta tras la de apertura). Dentro de unas comillas simples no hay
 * escapes ni otras comillas; en PowerShell, `''` es una comilla literal. (Antes se usaba `capturar` con «'» de
 * apertura y de cierre, que tomaba la comilla de cierre por una NUEVA apertura y se tragaba el resto de la orden:
 * `echo 'hola' && firebase deploy` pasaba entero como una sola palabra.)
 */
const cierreSimple = (s, i, ps) => {
  while (i < s.length) {
    if (s[i] === "'") {
      if (ps && s[i + 1] === "'") { i += 2; continue; }
      return i;
    }
    i++;
  }
  return i;
};

/**
 * Una palabra de shell desde `i`, con sus comillas: `{ texto, fin, dinamica }`. La usan los here-strings, las
 * etiquetas de heredoc y el archivo de `< archivo`, que no son palabras de la orden sino lo que entra por ella.
 */
const palabraLiteral = (s, i, ps) => {
  let texto = '';
  let din = false;
  while (i < s.length) {
    const c = s[i];
    if (c === "'") { const j = cierreSimple(s, i + 1, ps); texto += s.slice(i + 1, j); i = j + 1; continue; }
    if (c === '"') {
      i++;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === '\\' && i + 1 < s.length) { texto += s[i + 1]; i += 2; continue; }
        if (s[i] === '$' || s[i] === '`') din = true;
        texto += s[i]; i++;
      }
      i++; continue;
    }
    if (/[\s;&|()<>]/.test(c)) break;
    if (c === '\\' && i + 1 < s.length) { texto += s[i + 1]; i += 2; continue; }
    if (c === '$' || c === '`') din = true;
    texto += c; i++;
  }
  return { texto, fin: i, dinamica: din };
};

/** Backtick de bash (sustitución de orden), sin anidación. Devuelve el índice del backtick de cierre. */
const capturarBacktick = (s, i) => {
  while (i < s.length) {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === '`') return i;
    i++;
  }
  return i;
};

const PALABRA_CLAVE = new Set(['if', 'then', 'elif', 'else', 'fi', 'for', 'while', 'until', 'do', 'done',
  'case', 'esac', 'select', 'function', 'in', 'time', '!', '{', '}', '[[', '[']);

/**
 * Extrae TODAS las órdenes simples de un texto, a cualquier profundidad.
 * `salida` recibe una lista de "tuberías"; cada tubería es una lista de etapas
 * `{ palabras, dinamica, crudo }`. Las órdenes dentro de subshells, grupos y
 * sustituciones (`$( )`, backticks, `<( )`) se añaden como tuberías propias.
 */
const errorLimite = (msg) => { const e = new RangeError(msg); e.limite = true; return e; };

/* H4: modo LEGADO del tokenizador. Lo activa `analizar` para repetir, ADEMÁS del análisis nuevo, el troceado que hacía la guardia anterior
   (toda palabra que empieza por `{` era un grupo). Así cualquier denegación que la guardia anterior daba por ese camino —acertada o
   accidental— se conserva: el análisis nuevo solo AÑADE decisiones, nunca quita. */
let MODO_LEGADO = false;

const trocear = (herr, texto, salida, prof) => {
  gasta();
  if (prof > LIM_PROF) throw errorLimite('anidamiento excesivo');
  const ps = herr === 'PowerShell';
  const s = texto;
  const n = s.length;
  let i = 0;
  let tuberia = [];
  let pals = [];
  let pal = '';
  let hayPal = false;
  let dinPal = false;
  let dinEtapa = false;
  let crudoIni = 0;
  /* Lo que la orden recibe por su ENTRADA: un here-string (`<<< texto`), un archivo (`< archivo`) o un heredoc. */
  let entradaEtapa = null;
  let entradaArchivo = null;
  let heredocEtapa = false;
  /* Hasta qué posición ya se analizó el interior de una palabra que empieza por `{` (evita volver a analizarlo: coste lineal por nivel). */
  let interiorAnalizado = -1;
  /* S1 (Gran Motor, P0): lo que la REDIRECCIÓN deja en la orden. `salidasEtapa` = destinos de escritura (`> x`, `>> x`, `>| x`, `>& x`, `<> x`)
     con sus comillas y escapes ya resueltos por este mismo tokenizador (`> .gi''t/HEAD` es `.git/HEAD`); `redirEtapa` = posiciones, en `pals`,
     de las palabras que son de una redirección (su archivo y el número de descriptor pegado, `2>`), para analizar ADEMÁS la orden sin ellas
     (`bash -c > o 'orden'`: el `-c` de bash toma `'orden'`, no `o`). `pendRedir` = la próxima palabra es el archivo de una redirección. */
  let salidasEtapa = [];
  let redirEtapa = [];
  let pendRedir = null;

  const finPal = () => {
    if (hayPal) {
      if (pendRedir) { redirEtapa.push(pals.length); if (pendRedir === 'escribe') salidasEtapa.push(pal); }
      pals.push(pal); if (dinPal) dinEtapa = true;
      pendRedir = null;
    }
    pal = ''; hayPal = false; dinPal = false;
  };
  const finEtapa = (fin) => {
    finPal();
    if (pals.length) {
      tuberia.push({ palabras: pals, dinamica: dinEtapa, crudo: s.slice(crudoIni, fin).trim(), entrada: entradaEtapa, entradaArchivo, heredoc: heredocEtapa, salidas: salidasEtapa, redir: redirEtapa });
    }
    pals = []; dinEtapa = false; entradaEtapa = null; entradaArchivo = null; heredocEtapa = false; salidasEtapa = []; redirEtapa = []; pendRedir = null;
  };
  const finTuberia = (fin) => {
    finEtapa(fin);
    if (tuberia.length) salida.push(tuberia);
    tuberia = [];
  };
  const add = (t) => { if (t) { pal += t; hayPal = true; } };
  const marcaDin = () => { dinPal = true; hayPal = true; };

  /* Interior de unas comillas dobles: texto literal, pero `$var`/`$( )`/backtick expanden. */
  const dobles = () => {
    i++; // tras la "
    hayPal = true;
    while (i < n) {
      const c = s[i];
      if (c === '"') { i++; return; }
      if (ps && c === '`') { add(s[i + 1] || ''); i += 2; continue; }
      if (!ps && c === '\\') { add(s[i + 1] || ''); i += 2; continue; }
      if (c === '$' && s[i + 1] === '(') { marcaDin(); const j = capturar(s, i + 2, '(', ')', ps); trocear(herr, s.slice(i + 2, j), salida, prof + 1); add('$()'); i = j + 1; continue; }
      if (c === '$') { marcaDin(); add('$'); i++; while (i < n && /[A-Za-z0-9_{}:.]/.test(s[i])) { add(s[i]); i++; } continue; }
      if (!ps && c === '`') { marcaDin(); const j = capturarBacktick(s, i + 1); trocear(herr, s.slice(i + 1, j), salida, prof + 1); add('``'); i = j + 1; continue; }
      add(c); i++;
    }
  };

  while (i < n) {
    const c = s[i];
    const dos = s.slice(i, i + 2);

    /* Comentario (al inicio de palabra). */
    if (c === '#' && !hayPal && (i === 0 || /\s/.test(s[i - 1]))) { while (i < n && s[i] !== '\n') i++; continue; }

    if (c === '\n') { finTuberia(i); crudoIni = i + 1; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { finPal(); i++; continue; }

    if (c === "'") { hayPal = true; const j = cierreSimple(s, i + 1, ps); add(ps ? s.slice(i + 1, j).replace(/''/g, "'") : s.slice(i + 1, j)); i = j + 1; continue; }
    if (c === '"') { dobles(); continue; }

    if (!ps && c === '\\') { if (i + 1 < n) { add(s[i + 1]); i += 2; } else i++; continue; }
    if (ps && c === '`') { if (i + 1 < n) { add(s[i + 1]); i += 2; } else i++; continue; }

    /* Separadores. */
    if (dos === '&&' || dos === '||') { finTuberia(i); crudoIni = i + 2; i += 2; continue; }
    if (dos === '|&') { finEtapa(i); crudoIni = i + 2; i += 2; continue; }
    if (c === '|') { finEtapa(i); crudoIni = i + 1; i++; continue; }
    if (c === ';') { finTuberia(i); crudoIni = i + 1; i++; continue; }
    if (c === '&') { finTuberia(i); crudoIni = i + 1; i++; continue; }
    /* `)` suelto = terminador de patrón en `case … in patrón) orden ;;`: separa la orden del patrón. */
    if (c === ')') { finTuberia(i); crudoIni = i + 1; i++; continue; }

    /* Sustituciones y grupos (bajan a `salida` como tuberías propias). */
    if (c === '$' && s[i + 1] === '(') { marcaDin(); const j = capturar(s, i + 2, '(', ')', ps); trocear(herr, s.slice(i + 2, j), salida, prof + 1); add('$()'); i = j + 1; continue; }
    if (ps && c === '@' && s[i + 1] === '(') {
      const j = capturar(s, i + 2, '(', ')', ps);
      const interior = s.slice(i + 2, j);
      trocear(herr, interior, salida, prof + 1);
      /* Y sus elementos son ARGUMENTOS de la orden: `firebase @('deploy')` es `firebase deploy`. */
      finPal();
      for (const x of palabras(interior.replace(/,/g, ' '))) pals.push(x);
      if (/[$(`]/.test(interior)) dinEtapa = true;
      i = j + 1; continue;
    }
    /* Splatting de PowerShell (`firebase @args`): los argumentos llegan de una variable. */
    if (ps && c === '@' && !hayPal && /[A-Za-z_]/.test(s[i + 1] || '')) { marcaDin(); add('@'); i++; while (i < n && /[A-Za-z0-9_]/.test(s[i])) { add(s[i]); i++; } continue; }
    if ((c === '<' || c === '>') && s[i + 1] === '(') { const j = capturar(s, i + 2, '(', ')', ps); trocear(herr, s.slice(i + 2, j), salida, prof + 1); add(c + '()'); i = j + 1; continue; }
    /* Here-string (`<<< texto`): su texto es la ENTRADA de la orden (un intérprete lo ejecuta; xargs lo usa de argumentos). */
    if (!ps && s.startsWith('<<<', i)) {
      finPal(); i += 3;
      while (i < n && (s[i] === ' ' || s[i] === '\t')) i++;
      const r = palabraLiteral(s, i, ps);
      entradaEtapa = r.texto; if (r.dinamica) dinEtapa = true;
      i = r.fin; continue;
    }
    /* Heredoc (`<<ETIQUETA`, `<<-'ETIQUETA'`): la etiqueta no es una palabra; el cuerpo lo mira `heredocsInterpretados`. */
    if (!ps && dos === '<<') {
      finPal(); i += 2; if (s[i] === '-') i++;
      while (i < n && (s[i] === ' ' || s[i] === '\t')) i++;
      i = palabraLiteral(s, i, ps).fin; heredocEtapa = true; continue;
    }
    if (!ps && c === '`') { marcaDin(); const j = capturarBacktick(s, i + 1); trocear(herr, s.slice(i + 1, j), salida, prof + 1); add('``'); i = j + 1; continue; }

    if (c === '(') { finEtapa(i); const j = capturar(s, i + 1, '(', ')', ps); trocear(herr, s.slice(i + 1, j), salida, prof + 1); crudoIni = j + 1; i = j + 1; continue; }
    /* Grupo `{ órdenes; }` (la llave va seguida de un espacio). H4: la comprobación antigua era `/\s|\n|$/`, cuyo `$` casaba SIEMPRE, así que
       cualquier palabra que EMPEZABA por `{` (`{.env,x}`, `{git,push}`) se tragaba como grupo, cerraba la orden anterior y sus palabras
       desaparecían (`cat {a,b} <secreto>` pasaba). Ahora solo es grupo con espacio detrás; sin él es una palabra normal (expansión de llaves de
       bash), y su interior se sigue analizando UNA vez como órdenes (como antes: `{cat <secreto>;}` se sigue denegando). */
    if (c === '{' && !hayPal && (MODO_LEGADO || (i > interiorAnalizado && /\s/.test(s[i + 1] || '\n')))) { finEtapa(i); const j = capturar(s, i + 1, '{', '}', ps); trocear(herr, s.slice(i + 1, j), salida, prof + 1); crudoIni = j + 1; i = j + 1; continue; }
    if (c === '{' && !hayPal && !MODO_LEGADO && i > interiorAnalizado) { const j = capturar(s, i + 1, '{', '}', ps); trocear(herr, s.slice(i + 1, j), salida, prof + 1); interiorAnalizado = j; }

    /* Variable fuera de comillas. */
    if (c === '$') { marcaDin(); add('$'); i++; if (s[i] === '{') { const j = capturar(s, i + 1, '{', '}', ps); add('{' + s.slice(i + 1, j) + '}'); i = j + 1; } else { while (i < n && /[A-Za-z0-9_:.]/.test(s[i])) { add(s[i]); i++; } } continue; }

    /* Redirecciones: el operador se descarta (queda en `crudo` para el detector de escrituras). El archivo de `< archivo`
       sigue siendo una palabra (lo miran los detectores de secretos) y además se recuerda como ENTRADA de la orden. */
    if (c === '>' || c === '<') {
      const deArchivo = !ps && c === '<';
      /* S1: un número PEGADO al operador (`2>`, `1>>`) es el descriptor, no un argumento. */
      if (hayPal && !dinPal && /^\d+$/.test(pal)) redirEtapa.push(pals.length);
      finPal(); i++;
      const lecturaEscritura = c === '<' && s[i] === '>';   // `<>` abre el archivo también para ESCRIBIR
      if (s[i] === '>') i++; if (s[i] === '&') i++;
      if (deArchivo) {
        let k = i;
        while (k < n && (s[k] === ' ' || s[k] === '\t')) k++;
        const r = palabraLiteral(s, k, ps);
        if (r.texto) entradaArchivo = r.texto;
      }
      pendRedir = c === '>' || lecturaEscritura ? 'escribe' : 'lee';
      /* S1: `>|` (escribir aunque exista) — el `|` NO se consume (la orden se sigue partiendo igual que antes: ninguna decisión se pierde), pero
         el archivo que sigue al `|` se recuerda como destino de escritura de ESTA orden. (En PowerShell `>|` no es un operador válido; se trata
         igual por prudencia.) */
      if (c === '>' && s[i] === '|') {
        let k = i + 1;
        while (k < n && (s[k] === ' ' || s[k] === '\t')) k++;
        const r = palabraLiteral(s, k, ps);
        if (r.texto) salidasEtapa.push(r.texto);
        pendRedir = null;
      }
      continue;
    }

    add(c); i++;
  }
  finTuberia(n);
  if (salida.length > LIM_CMDS) throw errorLimite('demasiadas órdenes');
};

/* ── Programa real y desenvolvimiento ───────────────────────────────────── */

/** Nombre del programa sin ruta ni extensión, en minúsculas: `C:\…\firebase.cmd` → `firebase`. */
export const programa = (p) => path.basename(String(p).replace(/\\/g, '/')).toLowerCase().replace(/\.(cmd|exe|bat|ps1|js|mjs|cjs|py)$/, '');

const ENVOLTORIOS = new Set(['timeout', 'time', 'nice', 'nohup', 'stdbuf', 'command', 'builtin', 'noglob',
  'exec', 'call', 'setsid', 'ionice', 'chrt', 'sudo', 'doas', '&', '.']);
/* H5: opciones de envoltorio con valor SEPARADO (`sudo -u root cmd`). Solo las que no se confunden con un número o una señal (esas ya se saltan). */
const OPC_CON_VALOR_ENVOLTORIO = {
  time: ['-f', '-o', '--format', '--output'],
  exec: ['-a'],
  stdbuf: ['-i', '-o', '-e', '--input', '--output', '--error'],
  sudo: ['-u', '-g', '-h', '-p', '-r', '-t', '-C', '-D', '-R', '-T', '-U', '--user', '--group', '--host', '--prompt', '--role', '--type',
    '--chdir', '--chroot', '--close-from', '--command-timeout', '--other-user'],
  doas: ['-u', '-C'],
  ionice: ['-c', '-n', '-p', '-P', '-u'],
};
const OPC_CON_VALOR_ENV = new Set(['-u', '-C', '--unset', '--chdir']);
const OPC_CON_VALOR_XARGS = new Set(['-I', '-i', '-n', '-P', '-L', '-d', '-E', '-s', '-a',
  '--max-args', '--max-procs', '--max-lines', '--replace', '--delimiter', '--arg-file']);

/** ¿La palabra es dinámica (trae `$`, `$( )` o backtick sin resolver)? */
const dinamica = (w) => /\$|`/.test(String(w));

/**
 * Quita asignaciones iniciales, envoltorios (`timeout 30`, `env X=1`, `xargs`, `sudo`…),
 * palabras clave sueltas y resuelve `npx`/`node …firebase.js` hasta el programa real.
 * Devuelve `{ w, dinamica }` (dinámica = sus argumentos vienen de fuera, p. ej. de `xargs`).
 */
export const desenvolver = (ps0) => {
  let w = [...ps0];
  let din = false;
  /* H5: lo que se QUITA (envoltorios, sus opciones y los valores de opción que se saltan). Antes se perdía sin más y el operando que seguía
     al envoltorio (`. <archivo>`, `exec <archivo>`, `time -o <archivo> …`, `xargs -a <archivo> …`) pasaba a ser «el programa», que
     `tocaSecreto` y `escribeProtegido` no miran. Ahora se devuelve para que quien decide lo compruebe. */
  const quitadas = [];
  /* S4 (Gran Motor): las asignaciones de variables de entorno que preceden al programa (`GIT_PAGER=sh git log`, `env GIT_DIR=x git …`, `sudo X=1 …`).
     Solo se RECUERDAN aparte para `variablesGitS4`; no cambian `w`, `quitadas` ni nada de lo que ya se decidía con ellas. */
  const asignaciones = [];
  const quita = (n) => { quitadas.push(...w.slice(0, n)); w = w.slice(n); };
  for (let vueltas = 0; vueltas < LIM_PROF && w.length; vueltas++) {
    /* Las asignaciones iniciales (`X=valor orden`) NO se registran en `quitadas`: el valor de una variable no se lee como argumento (brecha conocida y documentada en guardia-rodeos). */
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) { asignaciones.push(w[0]); w = w.slice(1); continue; }
    const p = programa(w[0]);
    /* H5: `time` NO se trata como palabra clave suelta (quitaba solo `time` y dejaba su opción —`-p`, `-f %e`, `-o archivo`— como «el programa»):
       va por la rama de los envoltorios, que sí salta sus opciones y los valores de opción. */
    if (p !== 'time' && (PALABRA_CLAVE.has(w[0]) || PALABRA_CLAVE.has(p))) { quita(1); continue; }
    if (ENVOLTORIOS.has(p) || w[0] === '&' || w[0] === '.') {
      quita(1);
      while (w.length && (/^-/.test(w[0]) || /^\d+[smhd]?$/i.test(w[0]) || /^(sig)?[a-z]+$/i.test(w[0]) && p === 'timeout' && /^(sig)?(kill|term|int|hup|quit|stop|cont|usr1|usr2|9|15)$/i.test(w[0]))) {
        const opc = w[0];
        quita(1);
        /* H5: la opción de un envoltorio que lleva VALOR aparte (`exec -a nombre`, `sudo -u root`, `time -o archivo`, `stdbuf -o L`): el valor no es el
           programa. Pegado a la opción (`-uroot`, `--user=root`) no hay nada que saltar. Si una opción de la tabla se equivocara, el efecto es más
           análisis, nunca menos: el valor saltado queda en `quitadas`, que `tocaSecreto`/`escribeProtegido` comprueban. */
        if (w.length && (OPC_CON_VALOR_ENVOLTORIO[p] || []).includes(opc)) quita(1);
      }
      continue;
    }
    if (p === 'env') {
      quita(1);
      while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || /^-/.test(w[0]))) {
        const opc = w[0];
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(opc)) asignaciones.push(opc);   // S4
        quita(1);
        /* `env -S 'firebase deploy'`: el valor de -S ES la orden (se parte en palabras), no una opción que se salta. */
        if (opc === '-S' || opc === '--split-string') { if (w.length) w = [...palabras(w[0]), ...w.slice(1)]; break; }
        if (/^--split-string=/.test(opc)) { w = [...palabras(opc.slice('--split-string='.length)), ...w]; break; }
        if (/^-S./.test(opc)) { w = [...palabras(opc.slice(2)), ...w]; break; }
        /* H6: `-S` dentro de un grupo de opciones cortas (`env -iS 'firebase deploy'`, `env -i0S '…'`, `env -iSfirebase deploy`): el valor sigue siendo la orden. */
        const grupoS = opc.match(/^-[A-Za-z0-9]+S(.*)$/);
        if (grupoS) { if (grupoS[1]) w = [...palabras(grupoS[1]), ...w]; else if (w.length) w = [...palabras(w[0]), ...w.slice(1)]; break; }
        if (OPC_CON_VALOR_ENV.has(opc) && w.length) quita(1);
      }
      continue;
    }
    if (p === 'xargs') {
      quita(1);
      while (w.length && /^-/.test(w[0])) {
        const opc = w[0].split('=')[0];
        const juntos = /^-[IiNPLdEsa]\S/.test(w[0]) || w[0].includes('=');
        quita(1);
        if (!juntos && OPC_CON_VALOR_XARGS.has(opc) && w.length) quita(1);
      }
      din = true; // los argumentos reales entran por la entrada estándar
      continue;
    }
    if (p === 'npx' || p === 'pnpx' || p === 'bunx') {
      quita(1);
      while (w.length && w[0].startsWith('-')) quita(w[0] === '-p' || w[0] === '--package' ? 2 : 1);
      if (w.length && /^firebase-tools(@.*)?$/.test(w[0])) w = ['firebase', ...w.slice(1)];
      continue;
    }
    if ((p === 'npm' || p === 'pnpm' || p === 'bun' || p === 'yarn') && (w[1] === 'exec' || w[1] === 'x' || w[1] === 'dlx')) {
      quita(2);
      while (w.length && (w[0] === '--' || w[0].startsWith('-'))) quita(1);
      if (w.length && /^firebase-tools(@.*)?$/.test(w[0])) w = ['firebase', ...w.slice(1)];
      continue;
    }
    if (p === 'node' && w.length > 1 && /firebase-tools[\\/].*firebase\.js$|[\\/]bin[\\/]firebase(\.js)?$/i.test(w[1])) { w = ['firebase', ...w.slice(2)]; continue; }
    if ((p === 'python' || p === 'python3' || p === 'py') && w.length > 1 && /gcloud\.py$/i.test(w[1])) { w = ['gcloud', ...w.slice(2)]; continue; }
    break;
  }
  return { w, dinamica: din, quitadas, asignaciones };
};

/* ── Firmas ─────────────────────────────────────────────────────────────── */

const ARCHIVOS_SECRETOS = [
  '.env.local', '.secret.local', '.env.get-wee', '.env.prod', 'application_default_credentials',
  'legacy_credentials', 'access_tokens.db', 'credentials.db', 'service-account',
  'configstore/firebase-tools.json', 'firebase-tools.json', 'wee-claves-retiradas', 'gha-creds-',
];
const FIREBASE_NUNCA = new Set(['deploy', 'functions:delete', 'functions:secrets:set', 'functions:secrets:destroy',
  'functions:secrets:prune', 'functions:secrets:access', 'apphosting:secrets:access', 'hosting:disable',
  'hosting:channel:delete', 'firestore:delete', 'firestore:databases:delete',
  'database:remove', 'database:set', 'database:update', 'database:push', 'auth:import', 'login', 'login:add', 'login:use',
  'apphosting:backends:delete', 'remoteconfig:rollback', 'ext:uninstall', 'ext:install', 'ext:update']);
const FIREBASE_PREGUNTA = new Set(['use', 'apps:create', 'projects:create', 'projects:addfirebase', 'functions:config:set',
  'functions:config:unset', 'hosting:clone', 'hosting:sites:create', 'hosting:sites:delete', 'logout', 'init',
  'auth:export', 'functions:log', 'database:get', 'firestore:databases:restore']);
const GCLOUD_NUNCA = new Set(['delete', 'destroy', 'deploy', 'purge', 'rm']);
const GCLOUD_IAM = new Set(['set-iam-policy', 'add-iam-policy-binding', 'remove-iam-policy-binding']);
const GCLOUD_CAMBIA = new Set(['create', 'update', 'patch', 'enable', 'disable', 'add', 'import', 'export', 'restore', 'rollback',
  'cancel', 'set', 'unset', 'start', 'stop', 'reset', 'resume', 'pause', 'run', 'execute', 'migrate', 'move', 'undelete',
  'set-traffic', 'update-traffic', 'add-version', 'deploy-revision', 'activate-service-account', 'revoke', 'submit',
  'cp', 'mv', 'rsync']);
const GCLOUD_PISTAS = new Set(['alpha', 'beta', 'preview']);
const GSUTIL_NUNCA = new Set(['rm', 'rb']);
const GSUTIL_CAMBIA = new Set(['cp', 'mv', 'rsync', 'acl', 'defacl', 'iam', 'setmeta', 'lifecycle', 'retention', 'mb',
  'versioning', 'cors', 'web']);
const VERCEL_LEE = new Set(['ls', 'list', 'inspect', 'logs', 'whoami', 'help']);
const VERCEL_LOCAL = new Set(['link', 'build', 'dev', 'init']);
const EAS_LEE = new Set(['whoami', 'config', 'diagnostics', 'help', 'build:inspect']);
const GH_SENSIBLE = /pending_deployments|\/rulesets|\/environments|\/protection|\/actions\/(secrets|variables|permissions)|\/hooks|\/keys|\/collaborators|\/dependabot|secret-scanning|vulnerability-alerts|automated-security-fixes|\/branches\/[^/]+\/protection|\/actions\/oidc/;

/*
 * git: la HISTORIA es del dueño. Claude prepara el cambio (edita, `git add`, propone el mensaje) y el dueño
 * autoriza el commit: agente → propone → humano autoriza → commit (CLAUDE.md, «Commits y push solo cuando el
 * usuario lo pida»). Todo lo que crea commits o mueve una rama pregunta; leer, preparar y crear ramas nuevas, no.
 */
const GIT_GLOBAL_CON_VALOR = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env']);
/* Crean commits o mueven ramas siempre, con cualquier argumento. */
const GIT_SIEMPRE_HISTORIA = new Set(['commit', 'commit-tree', 'pull', 'update-ref', 'fast-import', 'mktag']);
/* Operaciones con estado: solo salir de ellas (`--abort`, `--quit`) o mirarlas no crea historia. */
const GIT_OPERACIONES = new Set(['merge', 'rebase', 'cherry-pick', 'revert', 'am']);
const GIT_SALIR_O_MIRAR = /^--(abort|quit|show-current-patch)$/;
/* Verbos con los que git cambia la historia o la publica (para un programa que llega de una variable). */
const GIT_VERBOS_DE_HISTORIA = new Set([...GIT_SIEMPRE_HISTORIA, ...GIT_OPERACIONES, 'push', 'reset', 'tag', 'branch', 'checkout',
  'switch', 'notes', 'replace', 'symbolic-ref', 'fetch', 'worktree', 'filter-branch', 'filter-repo', 'reflog']);
/* Subcomandos cuyos ARGUMENTOS, vengan de donde vengan, no crean commits ni mueven ramas (para `… | xargs git <sub>`). */
const GIT_ARGS_INOCUOS = new Set(['add', 'rm', 'mv', 'status', 'diff', 'log', 'show', 'grep', 'ls-files', 'ls-tree', 'cat-file',
  'rev-parse', 'rev-list', 'blame', 'annotate', 'check-ignore', 'check-attr', 'describe', 'name-rev', 'shortlog', 'whatchanged',
  'for-each-ref', 'show-ref', 'diff-tree', 'diff-index', 'diff-files', 'merge-base', 'count-objects', 'var', 'version', 'help', 'restore']);
/* Subcomandos de git conocidos. Uno que no esté aquí puede ser un alias (`git ci` = commit) y pregunta. */
const GIT_CONOCIDOS = new Set(['add', 'am', 'annotate', 'apply', 'archive', 'bisect', 'blame', 'branch', 'bundle',
  'cat-file', 'check-attr', 'check-ignore', 'check-mailmap', 'check-ref-format', 'checkout', 'checkout-index', 'cherry',
  'cherry-pick', 'clean', 'clone', 'column', 'commit', 'commit-graph', 'commit-tree', 'config', 'count-objects',
  'describe', 'diff', 'diff-files', 'diff-index', 'diff-tree', 'difftool', 'fast-export', 'fast-import', 'fetch',
  'filter-branch', 'filter-repo', 'for-each-ref', 'format-patch', 'fsck', 'gc', 'grep', 'hash-object', 'help', 'init',
  'interpret-trailers', 'log', 'ls-files', 'ls-remote', 'ls-tree', 'merge', 'merge-base', 'merge-file', 'merge-tree',
  'mergetool', 'mktag', 'mktree', 'mv', 'name-rev', 'notes', 'pack-refs', 'prune', 'pull', 'push', 'range-diff',
  'read-tree', 'rebase', 'reflog', 'remote', 'repack', 'replace', 'rerere', 'reset', 'restore', 'rev-list', 'rev-parse',
  'revert', 'rm', 'shortlog', 'show', 'show-branch', 'show-ref', 'sparse-checkout', 'stash', 'status', 'stripspace',
  'submodule', 'switch', 'symbolic-ref', 'tag', 'update-index', 'update-ref', 'var', 'verify-commit', 'verify-tag',
  'version', 'whatchanged', 'worktree', 'write-tree']);

/** ¿Define la orden un alias en sus opciones globales (`git -c alias.x=… x`, `--config-env=alias.x=…`)? */
const aliasEnLaOrden = (globales) => globales.some((x, k) =>
  (x === '-c' && /^alias\./i.test(globales[k + 1] || '')) || /^-calias\./i.test(x) || /^--config-env(=|$)alias\./i.test(x)
  || (x === '--config-env' && /^alias\./i.test(globales[k + 1] || '')));

/*
 * ══ S4 (Gran Motor) — opciones GLOBALES y variables de ENTORNO de git que ejecutan un programa o cambian el repositorio ══════════════════════
 *
 * CAUSA (demostrado en un repositorio desechable, con un programa que solo escribe un marcador): `git -c core.fsmonitor=<programa> status` y
 * `git -c diff.external=<programa> diff` EJECUTAN el programa, y la guardia los dejaba pasar porque solo miraba el subcomando (`status`, `diff`) y,
 * de las opciones globales, únicamente los alias (`aliasEnLaOrden`). Lo mismo con las variables de entorno: `desenvolver` quitaba `GIT_PAGER=…`,
 * `GIT_EXTERNAL_DIFF=…`, `GIT_DIR=…` delante del programa sin mirarlas (docs/GRAN-MOTOR-S4-GIT-OPCIONES.md, inventario con fuentes).
 *
 * REGLA (aditiva: solo puede convertir un «pasa» en «ask», nunca rebajar un ask/deny):
 *  · `-c clave[=valor]` y `--config-env=clave=VAR` ANTES del subcomando: pasa solo si la clave está en una LISTA BLANCA EXACTA de claves inertes
 *    (`S4_CLAVES_INERTES`, más los prefijos `color.`/`advice.`, cuyos valores son colores y booleanos); cualquier otra (core.fsmonitor, diff.external,
 *    core.pager, core.sshCommand, credential.helper, filter.*, diff.*.textconv, gpg.program, safe.directory, una clave desconocida…) → ask. Se
 *    decide por la clave COMPLETA, nunca por parecido. Excepciones de valor: `core.pager` = `cat`/vacío y `pager.<orden>` booleano.
 *  · `--exec-path=<ruta>` y `--bare` → ask (`--exec-path` sin valor solo imprime y pasa).
 *  · `--git-dir`/`--work-tree` → ask si apuntan FUERA del espacio de trabajo (`process.cwd()`), a un nombre protegido o de secreto, o no se pueden
 *    leer (dinámicas); `--git-dir` además debe nombrar un directorio `.git` (un directorio cualquiera puede traer su propio `config` con un
 *    `core.fsmonitor`). `-C <ruta>` NO cambia: equivale a un `cd`, que la guardia no restringe (pedir decisión solo empujaría a `cd x && git …`).
 *  · variables `GIT_*` (como prefijo, tras `env`/`sudo`…, con `export`/`declare`/`set`/`setx`, `$env:X=…`, `Set-Item env:X`,
 *    `[Environment]::SetEnvironmentVariable`) → ask salvo una lista blanca exacta de inertes (`S4_ENV_INERTES`) y las reglas de ruta/valor de
 *    GIT_DIR/GIT_COMMON_DIR/GIT_WORK_TREE/GIT_INDEX_FILE/GIT_OBJECT_DIRECTORY/GIT_PAGER/GIT_TRACE*. `PAGER`/`EDITOR`/`VISUAL`/`SSH_ASKPASS`
 *    (genéricas, las usa git y muchos otros programas) → ask solo como prefijo de la propia orden git.
 * Lo fija functions/test/guardia-git-opciones.test.mjs.
 */
const S4_CLAVES_INERTES = new Set([
  /* fin de línea, rutas y presentación: valores de texto o booleanos que git no ejecuta */
  'core.autocrlf', 'core.safecrlf', 'core.eol', 'core.quotepath', 'core.longpaths', 'core.abbrev', 'core.ignorecase', 'core.filemode',
  'core.precomposeunicode', 'core.whitespace', 'core.checkstat', 'core.trustctime', 'core.untrackedcache', 'core.preloadindex', 'core.fscache',
  'core.commentchar', 'core.commentstring',
  /* identidad (un commit ya pregunta por sí mismo) */
  'user.name', 'user.email', 'author.name', 'author.email', 'committer.name', 'committer.email',
  /* preferencias de subcomandos que no lanzan nada */
  'init.defaultbranch', 'push.default', 'pull.rebase', 'pull.ff', 'merge.conflictstyle', 'gc.auto', 'column.ui', 'branch.sort', 'tag.sort',
  'log.date', 'log.decorate', 'log.abbrevcommit', 'log.follow', 'i18n.logoutputencoding', 'i18n.commitencoding',
  'diff.renames', 'diff.renamelimit', 'diff.algorithm', 'diff.noprefix', 'diff.mnemonicprefix', 'diff.relative', 'diff.indentheuristic',
  'diff.colormoved', 'diff.context', 'diff.interhunkcontext', 'diff.ignoresubmodules', 'diff.submodule', 'diff.statgraphwidth',
  'status.showuntrackedfiles', 'status.short', 'status.branch', 'status.relativepaths', 'status.renames', 'status.renamelimit', 'status.aheadbehind',
  'grep.linenumber', 'grep.extendedregexp', 'grep.patterntype', 'grep.fullname',
]);
const S4_PREFIJOS_INERTES = ['color.', 'advice.'];
const S4_PAGINADOR_INERTE = /^(cat)?$/;
const S4_BOOLEANO = /^(true|false|yes|no|on|off|0|1)$/i;

/** S4: ¿`clave[=valor]` de un `-c` (o la clave de un `--config-env`) es inerte? Lo dinámico o desconocido NO lo es. */
export const claveGitInerteS4 = (asignacion) => {
  const s = String(asignacion);
  if (dinamica(s) || s.includes(DINAMICO)) return false;
  const k = s.indexOf('=');
  const clave = (k < 0 ? s : s.slice(0, k)).toLowerCase();
  const valor = k < 0 ? null : s.slice(k + 1);
  if (S4_CLAVES_INERTES.has(clave)) return true;
  if (S4_PREFIJOS_INERTES.some((p) => clave.startsWith(p) && clave.length > p.length)) return true;
  if (clave === 'core.pager') return valor !== null && S4_PAGINADOR_INERTE.test(valor);
  if (/^pager\.[a-z0-9-]+$/.test(clave)) return valor === null || valor === 'cat' || S4_BOOLEANO.test(valor);
  /* Valores que DESACTIVAN (los usan las propias suites del repo para aislar sus repositorios temporales): sin ganchos, sin firma. */
  if (clave === 'core.hookspath') return valor === '' || valor === '/dev/null';
  if (clave === 'commit.gpgsign' || clave === 'tag.gpgsign') return valor !== null && /^(false|no|off|0)$/i.test(valor);
  return false;
};

/** S4: nombre protegido o de secreto en una ruta (`.claude`, `.firebaserc`, `.ssh`, `.gnupg`, `.env*`, ARCHIVOS_SECRETOS). */
const s4Protegida = (v) => {
  const x = String(v).replace(/\\/g, '/').toLowerCase();
  return x.split('/').some((s) => ['.claude', '.firebaserc', '.ssh', '.gnupg'].includes(s) || s.startsWith('.env'))
    || ARCHIVOS_SECRETOS.some((sec) => x.includes(sec));
};
/** S4: la ruta resuelta dentro del espacio de trabajo (`process.cwd()`), o null si no se puede saber (vacía, dinámica, `~`). */
const s4Dentro = (v) => {
  const s = String(v);
  if (!s || dinamica(s) || s.includes(DINAMICO) || /^~/.test(s)) return null;
  const abs = path.resolve(process.cwd(), s.replace(/^\/([a-z])\//i, '$1:/'));
  const rel = path.relative(process.cwd(), abs);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)) ? abs : null;
};
/** S4: ¿esta ruta de repositorio es segura? `tipo`: 'gitdir' (debe nombrar un `.git`), 'arbol' o 'escritura' (git escribe ahí: ruta protegida completa). */
const s4RutaSegura = (v, tipo) => {
  if (v == null || s4Dentro(v) === null || s4Protegida(v)) return false;
  const x = String(v).replace(/\\/g, '/');
  if (tipo === 'gitdir') return x.toLowerCase().split('/').includes('.git');
  if (tipo === 'escritura') return !RUTAS_PROTEGIDAS.test(x);
  return true;
};

const MOTIVO_S4_OPCION = (o) => `\`git ${o}\`: una opción global que cambia la configuración, el ejecutable o el repositorio de git puede ejecutar un programa (core.fsmonitor, diff.external, core.pager…) o leer otro repositorio: lo autoriza el dueño.`;
const MOTIVO_S4_ENTORNO = (n) => `La variable de entorno \`${n}\` cambia el programa que ejecuta git, su configuración o el repositorio que lee: lo autoriza el dueño.`;

/** S4: decisión por las opciones GLOBALES de una orden git (las que van antes del subcomando), o null si todas son inertes. */
const opcionesGlobalesGitS4 = (globales) => {
  for (let k = 0; k < globales.length; k++) {
    const x = globales[k];
    let malo = null;
    if (x === '-c') { k++; if (!claveGitInerteS4(globales[k] ?? '')) malo = `-c ${globales[k] ?? ''}`; }
    else if (/^-c./.test(x)) { if (!claveGitInerteS4(x.slice(2))) malo = x; }
    else if (x === '--config-env') { k++; if (!claveGitInerteS4(String(globales[k] ?? '').split('=')[0])) malo = `--config-env ${globales[k] ?? ''}`; }
    else if (/^--config-env=/.test(x)) { if (!claveGitInerteS4(x.slice(13).split('=')[0])) malo = x; }
    else if (/^--exec-path=/.test(x) || x === '--bare') malo = x;
    else if (x === '--git-dir' || x === '--work-tree') { k++; if (!s4RutaSegura(globales[k], x === '--git-dir' ? 'gitdir' : 'arbol')) malo = `${x} ${globales[k] ?? ''}`; }
    else if (/^--(git-dir|work-tree)=/.test(x)) { const v = x.slice(x.indexOf('=') + 1); if (!s4RutaSegura(v, x.startsWith('--git-dir') ? 'gitdir' : 'arbol')) malo = x; }
    else if (GIT_GLOBAL_CON_VALOR.has(x)) k++;   // `-C <ruta>`, `--namespace <ns>`: sin cambio
    if (malo) return decision('ask', MOTIVO_S4_OPCION(malo));
  }
  return null;
};

const S4_ENV_INERTES = new Set(['GIT_OPTIONAL_LOCKS', 'GIT_CONFIG_NOSYSTEM', 'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_AUTHOR_DATE',
  'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'GIT_COMMITTER_DATE', 'GIT_TERMINAL_PROMPT', 'GIT_FLUSH', 'GIT_LITERAL_PATHSPECS', 'GIT_GLOB_PATHSPECS',
  'GIT_NOGLOB_PATHSPECS', 'GIT_ICASE_PATHSPECS', 'GIT_CEILING_DIRECTORIES', 'GIT_DISCOVERY_ACROSS_FILESYSTEM', 'GIT_NAMESPACE', 'GIT_MERGE_VERBOSITY',
  'GIT_MERGE_AUTOEDIT', 'GIT_DIFF_OPTS', 'GIT_ADVICE', 'GIT_DEFAULT_HASH', 'GIT_NO_REPLACE_OBJECTS', 'GIT_REFLOG_ACTION', 'GIT_PROGRESS_DELAY',
  'GIT_LFS_SKIP_SMUDGE']);

/** S4: ¿la variable `nombre`=`valor` exige decisión? `antesDeGit` = es prefijo de la propia orden git (para las genéricas). `valor` null = desconocido. */
export const variableGitS4 = (nombre, valor, antesDeGit) => {
  const n = String(nombre).toUpperCase();
  if (!/^GIT_/.test(n)) {
    if (!antesDeGit) return false;
    if (n === 'PAGER') return !(valor != null && S4_PAGINADOR_INERTE.test(valor));
    return ['EDITOR', 'VISUAL', 'SSH_ASKPASS'].includes(n);
  }
  if (S4_ENV_INERTES.has(n)) return false;
  if (n === 'GIT_PAGER') return !(valor != null && S4_PAGINADOR_INERTE.test(valor));
  if (/^GIT_TRACE/.test(n)) return !(valor != null && /^(|[0-9]|true|false|yes|no|on|off)$/i.test(valor));   // una RUTA = escribe un archivo
  /* Vacía, una variable de ruta no apunta a ningún sitio (git falla con «not a git repository»): no cambia el repositorio ni ejecuta nada. */
  if (['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY'].includes(n) && valor === '') return false;
  if (n === 'GIT_DIR' || n === 'GIT_COMMON_DIR') return !s4RutaSegura(valor, 'gitdir');
  if (n === 'GIT_WORK_TREE') return !s4RutaSegura(valor, 'arbol');
  if (n === 'GIT_INDEX_FILE' || n === 'GIT_OBJECT_DIRECTORY') return !s4RutaSegura(valor, 'escritura');
  return true;   // GIT_EXTERNAL_DIFF, GIT_EXEC_PATH, GIT_SSH(_COMMAND), GIT_ASKPASS, GIT_EDITOR, GIT_CONFIG_*, GIT_PROXY_COMMAND… y cualquier GIT_* desconocida
};

const S4_ITEM_PS = new Set(['set-item', 'si', 'new-item', 'ni', 'set-content', 'sc', 'add-content', 'ac', 'copy-item', 'cpi', 'move-item', 'mi', 'rename-item', 'rni']);
/** S4: decisión por las variables de entorno que FIJA esta etapa (prefijo, env, export/declare/set/setx, `$env:X=…`, `Set-Item env:X`), o null. */
const variablesGitS4 = (etapa) => {
  const { w, asignaciones } = desenvolver(etapa.palabras);
  const p = programa(w[0] || '');
  const parte = (a) => { const k = a.indexOf('='); return [a.slice(0, k), a.slice(k + 1)]; };
  const pide = (n, v, antes) => (variableGitS4(n, v, antes) ? decision('ask', MOTIVO_S4_ENTORNO(n)) : null);
  /* Una asignación SIN programa detrás (`GIT_PAGER=sh` suelta) no llega a ningún proceso hijo mientras no se exporte: solo cuenta si precede a una
     orden. Exportarla después (`export GIT_PAGER`) sí cuenta: lo mira el bloque de `export` de abajo, con el valor desconocido. */
  if (w.length) for (const a of asignaciones) { const [n, v] = parte(a); const r = pide(n, v, p === 'git'); if (r) return r; }
  const args = w.slice(1);
  if (['export', 'declare', 'typeset', 'readonly', 'local'].includes(p)) {
    for (const a of args) if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(a)) { const r = pide(a, null, false); if (r) return r; }
  }
  if (['export', 'declare', 'typeset', 'readonly', 'local', 'set'].includes(p)) {
    for (const a of args) if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(a)) { const [n, v] = parte(a); const r = pide(n, v, false); if (r) return r; }
  }
  if (p === 'setx') { const pos = args.filter((x) => !/^[-/]/.test(x)); if (pos[0]) { const r = pide(pos[0], pos[1] ?? null, false); if (r) return r; } }
  if (S4_ITEM_PS.has(p)) {
    for (const a of args) { const m = String(a).match(/^env:[\\/]?([A-Za-z_][A-Za-z0-9_]*)$/i); if (m) { const r = pide(m[1], null, false); if (r) return r; } }
  }
  const ps = etapa.palabras;
  const m = String(ps[0] || '').match(/^\$\{?env:([A-Za-z_][A-Za-z0-9_]*)\}?(?:(\+?=)([\s\S]*))?$/i);
  if (m) {
    const m2 = m[2] ? null : String(ps[1] || '').match(/^(\+?=)([\s\S]*)$/);
    if (m[2] || m2) {
      const op = m[2] || m2[1];
      const v = op === '+=' ? null : m[2] ? m[3] : (m2[2] || (ps[2] ?? ''));
      const r = pide(m[1], v, false); if (r) return r;
    }
  }
  return null;
};
/** S4: `[Environment]::SetEnvironmentVariable('GIT_…', …)` en el texto (PowerShell/.NET). Un nombre que no es literal pide decisión. */
const entornoDotnetS4 = (texto) => {
  for (const m of String(texto).matchAll(/\[(?:system\.)?environment\]::setenvironmentvariable\s*\(\s*(['"]?)([^'",)\s]*)/gi)) {
    if (!m[2] || dinamica(m[2]) || variableGitS4(m[2], null, false)) return decision('ask', MOTIVO_S4_ENTORNO(m[2] || '(nombre dinámico)'));
  }
  return null;
};

/**
 * ¿Esta orden de git crea commits, reescribe la historia o mueve una rama? Devuelve cómo nombrarla o null.
 * Exportada para las pruebas (`functions/test/guardia-claude.test.mjs`, sección M).
 */
export const cambiaHistoria = (sub, args) => {
  const tiene = (re) => args.some((x) => re.test(x));
  const posicionales = args.filter((x) => !x.startsWith('-'));
  if (GIT_SIEMPRE_HISTORIA.has(sub)) return sub;
  if (GIT_OPERACIONES.has(sub)) return args.length && args.every((x) => GIT_SALIR_O_MIRAR.test(x)) ? null : sub;
  if (sub === 'reset') {
    /* `git reset` y `git reset -- <rutas>` solo sacan del índice; un modo o una revisión mueven la rama. */
    const corte = args.indexOf('--');
    const antes = corte < 0 ? args : args.slice(0, corte);
    const modo = antes.find((x) => /^--(soft|mixed|hard|merge|keep)$/.test(x));
    if (modo) return `reset ${modo}`;
    return antes.some((x) => !x.startsWith('-')) ? 'reset <revisión>' : null;
  }
  /* Las opciones cortas se agrupan y llevan el valor pegado (`-qB main`, `-Bmain`, `-fM`): se mira la letra, no la palabra. */
  const MUEVE_RAMA = /^-[A-Za-z]*[fMCmc]|^--(force|move|copy)(=|$)/;
  if (sub === 'branch' && tiene(MUEVE_RAMA)) return 'branch ' + args.find((x) => MUEVE_RAMA.test(x));
  if (sub === 'checkout' && tiene(/^-[A-Za-z]*B/)) return 'checkout -B';
  if (sub === 'switch' && tiene(/^-[A-Za-z]*C|^--force-create(=|$)/)) return 'switch -C';
  if (sub === 'worktree' && (args[0] || '').toLowerCase() === 'add' && tiene(/^-[A-Za-z]*B/)) return 'worktree add -B';
  if (sub === 'tag') {
    if (tiene(/^(-l|--list|-v|--verify)$/) || tiene(/^--(contains|no-contains|merged|no-merged|points-at)(=|$)/)) return null;
    if (tiene(/^(-a|-s|-f|-m|-F|-u|--annotate|--sign|--force|--message|--file|--local-user)(=|$)/) || tiene(/^-[asfmFu]{2,}$/)) return 'tag';
    return posicionales.length ? 'tag' : null;
  }
  if (sub === 'notes') {
    const accion = (posicionales[0] || '').toLowerCase();
    return !accion || ['list', 'show', 'get-ref'].includes(accion) ? null : `notes ${accion}`;
  }
  if (sub === 'replace') return !posicionales.length || tiene(/^(-l|--list)$/) ? null : 'replace';
  if (sub === 'symbolic-ref') return tiene(/^(-d|--delete)$/) || posicionales.length >= 2 ? 'symbolic-ref' : null;
  /* `git fetch origen main:main` actualiza una rama LOCAL (con `+`, a la fuerza); una URL (`https://…`,
     `git@host:ruta`) o una ruta de Windows no son eso. Un destino con `@` (`main:x@y`) sigue siendo una ref. */
  const esURL = (x) => /^[a-z][a-z0-9+.-]*:\/\//i.test(x) || /^[^\s@:/]+@[^\s:]+:/.test(x) || /^[a-z]:[\\/]/i.test(x);
  if (sub === 'fetch' && posicionales.some((x) => x.includes(':') && !esURL(x))) return 'fetch <origen>:<destino>';
  return null;
};

/** Lo que un subcomando de git EJECUTA por dentro (`submodule foreach`, `bisect run`, `rebase --exec`), o null. */
const lanzadoPorGit = (sub, args) => {
  if (sub === 'submodule') {
    const k = args.findIndex((x) => x.toLowerCase() === 'foreach');
    if (k >= 0) return args.slice(k + 1).filter((x) => !/^(--recursive|--quiet|-q)$/.test(x)).join(' ') || null;
  }
  if (sub === 'bisect' && (args[0] || '').toLowerCase() === 'run') return args.slice(1).join(' ') || null;
  if (sub === 'rebase') {
    const lanzados = [];
    args.forEach((x, k) => {
      if ((x === '-x' || x === '--exec') && args[k + 1]) lanzados.push(args[k + 1]);
      else if (/^--exec=/.test(x)) lanzados.push(x.slice(7));
    });
    return lanzados.join('\n') || null;
  }
  return null;
};

/* Scripts propios que LEEN datos de personas en producción: los ejecuta el dueño. */
const SCRIPTS_DUENO = [/ops\/reconciliacion\/reservas-colgadas/, /scripts\/copias\.mjs/];
/* Banderas con las que un script propio escribe o toca producción. */
const BANDERAS_DUENO = new Set(['--ejecutar', '--confirmo-autorizacion', '--crear', '--confirmo-aislado']);

/* Rutas que settings.json protege con `ask` para Edit: escribirlas por Bash también pregunta.
   `.git/` es la historia: escribir una ref a mano es un commit sin `git commit`. */
const RUTAS_PROTEGIDAS = /(?:^|[\s'"=(,/\\])\.claude[/\\]|(?:^|[\s'"=(,/\\])\.git[/\\]|(?:^|[\s'"=(,/\\])\.firebaserc(?:[\s'")]|$)|functions[\\/]src[\\/]credits[\\/]creditengine\.ts|functions[\\/]src[\\/]core[\\/]financial[\\/]/i;
const ESCRITORES = new Set(['cp', 'mv', 'dd', 'tee', 'truncate', 'install', 'ln', 'rm', 'touch', 'mktemp', 'chmod', 'chown', 'rsync', 'shred', 'unlink',
  /* PowerShell (y sus alias): sin esto, `Set-Content .git/refs/heads/main` o `Set-Content .claude/settings.json` pasaban. */
  'set-content', 'sc', 'add-content', 'ac', 'out-file', 'new-item', 'ni', 'tee-object', 'copy-item', 'cpi', 'copy', 'move-item', 'mi',
  'move', 'remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir', 'rename-item', 'rni', 'ren', 'clear-content', 'clc', 'set-item', 'si']);
/* .NET desde PowerShell: `[IO.File]::WriteAllText('.git/…')`, `New-Object IO.StreamWriter(…)`. */
const ESCRITURA_DOTNET = /\[(?:system\.)?io\.(?:file|directory)\]::\s*(?:write|append|create|copy|move|delete|replace|open)|new-object\s+(?:-typename\s+)?(?:system\.)?io\.(?:streamwriter|filestream)/i;

/* Buscadores: su PATRÓN es texto, no un archivo. `grep -n "\.env.local" README.md` busca en README.md. */
const BUSCADORES = new Set(['grep', 'egrep', 'fgrep', 'rg', 'select-string', 'sls']);
/** Opciones que llevan un valor detrás (ese valor no es el patrón: se queda y se mira). */
const CON_VALOR = /^(-[ABCmdDgtTjM]|--(include|exclude|exclude-dir|glob|type|type-not|max-count|context|after-context|before-context|max-depth)|-(path|literalpath|include|exclude|encoding|context))$/i;

/** Las palabras de una orden sin el patrón de un buscador. Si el patrón se lee de un archivo (`-f`), no se quita nada. */
export const sinPatron = (p, w) => {
  const esGitGrep = p === 'git' && (w[1] || '').toLowerCase() === 'grep';
  if (!BUSCADORES.has(p) && !esGitGrep) return w;
  const desde = esGitGrep ? 2 : 1;
  if (w.slice(desde).some((x) => /^(-f|--file(=.*)?)$/.test(x) || /^-f\S/.test(x))) return w;
  const fuera = new Set();
  let hayPatron = false;
  for (let i = desde; i < w.length; i++) {
    const x = w[i];
    if (/^(-e|--regexp|-pattern)$/i.test(x)) { fuera.add(i + 1); i++; hayPatron = true; continue; }
    if (/^--regexp=/.test(x) || /^-e\S/.test(x)) { fuera.add(i); hayPatron = true; continue; }
    if (CON_VALOR.test(x)) { i++; continue; }
    if (x.startsWith('-')) continue;
    if (!hayPatron) { fuera.add(i); hayPatron = true; }
  }
  return w.filter((_, i) => !fuera.has(i));
};

/**
 * ¿Es un LISTADO DE REFERENCIAS de git, de solo lectura (`git branch --list 'guardian/*'`, `git tag -l "v*"`)? Sus patrones son nombres de
 * rama o de etiqueta que git compara con SUS referencias: `git branch` y `git tag` en modo lista no abren ningún archivo que se les pase, así que
 * un comodín como `guardian/*` no puede leer ni alcanzar `.env.local` (antes se leía como «toca .env.local» porque un último segmento `*`
 * encaja con cualquier nombre). Cambio MÍNIMO (Guardian, 2026-10-15): solo se exime del chequeo de COMODINES; el chequeo del NOMBRE literal de un
 * secreto sigue igual, y se exige una lista blanca de opciones de lectura: cualquier otra opción (-d, -D, -m, -f, -c, -u, --set-upstream-to,
 * --edit-description…), la ausencia de `--list`/`-l`, otro subcomando o un patrón con expansión dinámica NO se exime. Lo fija
 * functions/test/guardia-referencias-git.test.mjs.
 */
/*
 * S1 (Gran Motor, P1) — LA LISTA BLANCA DE LECTURA, en UNA sola definición explícita. Es lo único que decide qué opciones puede llevar un
 * `git branch|tag` en modo lista para eximirse del chequeo de COMODINES. Cualquier opción que NO esté aquí —las que mutan (-d -D -m -M -c -C -f
 * -u -t --track --set-upstream-to --unset-upstream --edit-description --create-reflog --delete --move --copy --force…) o una opción nueva de git—
 * deja la orden SIN exención y se decide como siempre (un comodín que alcanza un secreto se deniega; una que mueve ramas pregunta). Cada entrada es
 * una opción COMPLETA (se compila anclada con ^…$). Contenido idéntico al de R1 salvo la corrección del hallazgo H1 (revisión R1): en las dos
 * entradas numéricas se había perdido la barra (`--abbrev(=d+)?` y `-nd*` casaban una «d» literal: `--abbrev=7` y `-n3` no entraban y `--abbrev=d`
 * sí). No se amplía sin decisión del dueño: functions/test/guardia-lista-blanca-git.test.mjs fija esta lista entrada a entrada.
 */
export const LISTA_BLANCA_LECTURA_REFS_GIT = Object.freeze([
  /* el modo lista: una de las dos es OBLIGATORIA (lo exige `esListadoDeRefsGit`; esa línea se deja literal porque es el ancla del sabotaje E4 de guardia-referencias-git) */
  '--list', '-l',
  /* qué referencias: locales, remotas o todas */
  '-a', '--all', '-r', '--remotes',
  /* presentación de la salida */
  '-v', '-vv', '--verbose', '--no-color', '--color(=.*)?', '--column(=.*)?', '--no-column', '-i', '--ignore-case',
  '--abbrev(=\\d+)?', '--no-abbrev', '--show-current',
  /* filtros que solo LEEN el grafo de commits */
  '--merged(=.*)?', '--no-merged(=.*)?', '--contains(=.*)?', '--no-contains(=.*)?', '--points-at(=.*)?',
  /* orden y formato de la salida */
  '--sort(=.*)?', '--format(=.*)?',
  /* `git tag -l -n<núm>`: cuántas líneas de la anotación se muestran */
  '-n\\d*',
]);
const OPCIONES_DE_LISTA_GIT = new RegExp(`^(${LISTA_BLANCA_LECTURA_REFS_GIT.join('|')})$`);
/* Opciones GLOBALES de git que cambian lo que git ejecuta o sobre qué repositorio actúa: con una de ellas no hay exención (sí con `-C <dir>`). */
const GLOBALES_SIN_EXENCION_GIT = /^(-c|--config-env|--exec-path|--git-dir|--work-tree)/;
export const esListadoDeRefsGit = (p, w) => {
  if (p !== 'git') return false;
  const resto = w.slice(1);
  let i = 0;
  while (i < resto.length && resto[i].startsWith('-')) i += (GIT_GLOBAL_CON_VALOR.has(resto[i]) ? 2 : 1);
  const sub = (resto[i] || '').toLowerCase();
  if (sub !== 'branch' && sub !== 'tag') return false;
  /* Solo `-C <dir>`: un `-c clave=valor` (un alias, una configuración) cambia lo que git ejecuta y no se exime. */
  if (resto.slice(0, i).some((x) => GLOBALES_SIN_EXENCION_GIT.test(x))) return false;
  const args = resto.slice(i + 1);
  const opciones = args.filter((x) => x.startsWith('-'));
  if (!opciones.some((x) => /^(--list|-l)$/.test(x))) return false;
  if (!opciones.every((x) => OPCIONES_DE_LISTA_GIT.test(x))) return false;
  /* Un patrón con expansión dinámica (un `$(…)`, una variable, un backtick, la marca de lo dinámico) no es un patrón fijo. */
  return args.filter((x) => !x.startsWith('-')).every((x) => !/[$`]/.test(x) && !x.includes(DINAMICO));
};

/* ── Expansión de llaves de bash (Guardian H4) ──────────────────────────────
 *
 * CAUSA (H4): el tokenizador deja una palabra como `{.env.local,x}` ENTERA (la llave es un carácter más de la palabra), y `tocaSecreto`
 * comparaba esa palabra tal cual: ni `includes` ni el comodín (`aRegex` escapa `{`, `}` y no conoce la coma) la relacionaban con el
 * nombre del secreto, mientras que bash la expande ANTES de ejecutar a `.env.local x`. Lo mismo `.e{n,}v*` o `{.env,x}*`.
 *
 * ARREGLO: `expandirLlaves` replica la expansión de bash (listas con coma, secuencias `a..z`/`1..3[..paso]`, anidadas, con prefijo y
 * sufijo, varias en una palabra) y cada alternativa se analiza con las MISMAS reglas de siempre. Es una expansión ADITIVA: la palabra
 * original también se sigue comprobando. Cotas: LIM_LLAVES alternativas y LIM_PROF_LLAVES niveles; si se superan (o si el texto no se
 * puede analizar), se aplica la aproximación CONSERVADORA —cada grupo de llaves se sustituye por un comodín `*` (`[0-9-]*` si es una
 * secuencia numérica)— y la guardia decide con el comodín; NUNCA se deja pasar por falta de análisis. Las llaves entre comillas: el
 * tokenizador pierde esa información y bash no las expande, pero la guardia ya denegaba el nombre literal de un secreto aunque estuviera
 * entre comillas (`cat '{.env.local,x}'`), así que se mantiene el criterio conservador. */
const LIM_LLAVES = 256;
const LIM_PROF_LLAVES = 12;
const cierreLlave = (s, i) => {
  let d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === '{') d++;
    else if (s[k] === '}') { d--; if (d === 0) return k; }
  }
  return -1;
};
const partesLlave = (cuerpo) => {
  const partes = [];
  let d = 0; let ini = 0;
  for (let k = 0; k < cuerpo.length; k++) {
    const c = cuerpo[k];
    if (c === '{') d++;
    else if (c === '}') d--;
    else if (c === ',' && d === 0) { partes.push(cuerpo.slice(ini, k)); ini = k + 1; }
  }
  partes.push(cuerpo.slice(ini));
  return partes;
};
const SECUENCIA = /^(-?\d+|[A-Za-z])\.\.(-?\d+|[A-Za-z])(?:\.\.(-?\d+))?$/;
/** Alternativas de una llave: lista con coma, secuencia, o null si no es expansión (`{a}`, `{}`). `desborda()` avisa de que se pasó de las cotas. */
const alternativasLlave = (cuerpo, desborda) => {
  const m = cuerpo.match(SECUENCIA);
  if (m) {
    const numerica = /\d/.test(m[1]);
    if (numerica !== /\d/.test(m[2])) return null;   // `{a..3}` no es secuencia: bash la deja literal
    let paso = Math.abs(parseInt(m[3] || '1', 10)) || 1;
    if (numerica) {
      const a = parseInt(m[1], 10); const b = parseInt(m[2], 10);
      if (Math.floor(Math.abs(b - a) / paso) + 1 > LIM_LLAVES) { desborda(); return ['[0-9-]*']; }
      const ancho = /^-?0\d/.test(m[1]) || /^-?0\d/.test(m[2]) ? Math.max(m[1].length, m[2].length) : 0;
      const out = [];
      for (let v = a; a <= b ? v <= b : v >= b; v += a <= b ? paso : -paso) out.push(ancho ? String(v).padStart(ancho, '0') : String(v));
      return out;
    }
    const a = m[1].charCodeAt(0); const b = m[2].charCodeAt(0);
    const out = [];
    for (let v = a; a <= b ? v <= b : v >= b; v += a <= b ? paso : -paso) out.push(String.fromCharCode(v));
    return out;
  }
  const partes = partesLlave(cuerpo);
  return partes.length > 1 ? partes : null;
};
/** Sustituye cada grupo de llaves que bash expandiría por un comodín (la aproximación conservadora para lo que excede las cotas). */
const aproximarLlaves = (s) => {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') {
      const j = cierreLlave(s, i);
      if (j > i) {
        const cuerpo = s.slice(i + 1, j);
        const m = cuerpo.match(SECUENCIA);
        if ((m && /\d/.test(m[1]) === /\d/.test(m[2])) || partesLlave(cuerpo).length > 1) {
          out += m && /\d/.test(m[1]) ? '[0-9-]*' : '*';
          i = j; continue;
        }
      }
    }
    out += s[i];
  }
  /* Los comodines seguidos se funden (un `*` equivale a `**…*`): sin esto, miles de grupos darían un glob gigante que no compila y NO decidiría (fallaría abierto). */
  const fundido = out.replace(/\*{2,}/g, '*').replace(/(?:\[0-9-\]\*){2,}/g, '[0-9-]*');
  return fundido.length > 500 ? '*' : fundido;   // un glob desmedido no compila y no decidiría: el comodín total es el más conservador
};
/** Lo que bash hace con UNA palabra: `{ lista, aproximada }`. `aproximada` = se pasó de las cotas y `lista` es la aproximación con comodines. Nunca lanza. */
const expandirNucleo = (palabra) => {
  const s0 = String(palabra);
  if (!s0.includes('{')) return { lista: [s0], aproximada: false };
  let desbordado = false;
  const desborda = () => { desbordado = true; };
  const rec = (s, prof) => {
    if (prof > LIM_PROF_LLAVES) { desborda(); return [s]; }
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== '{') continue;
      const j = cierreLlave(s, i);
      if (j < 0) continue;
      const alts = alternativasLlave(s.slice(i + 1, j), desborda);
      if (!alts) continue;
      const pre = s.slice(0, i);
      const colas = rec(s.slice(j + 1), prof + 1);
      const res = [];
      for (const a of alts) {
        for (const x of rec(a, prof + 1)) {
          for (const y of colas) {
            res.push(pre + x + y);
            if (res.length > LIM_LLAVES) { desborda(); return [s]; }
          }
        }
      }
      return res;
    }
    return [s];
  };
  try {
    const r = rec(s0, 0);
    if (!desbordado) return { lista: r, aproximada: false };
  } catch { /* se aproxima */ }
  return { lista: [aproximarLlaves(s0)], aproximada: true };
};
/** Todas las palabras a las que bash expandiría `palabra` (la original SIEMPRE va incluida). Nunca lanza. */
export const expandirLlaves = (palabra) => [...new Set([String(palabra), ...expandirNucleo(palabra).lista])];
/** La lista de palabras de una orden tal y como la deja bash: cada palabra con llaves se reemplaza EN SU SITIO por sus alternativas
 *  (`{git,push} --force` → `git push --force`). Si el total supera 4000 palabras, se usa la aproximación 1:1 (una palabra por original). */
export const expandirPalabras = (palabras) => {
  const hechas = palabras.map(expandirNucleo);
  if (hechas.reduce((n, x) => n + x.lista.length, 0) <= 4000) return hechas.flatMap((x) => x.lista);
  return palabras.map((x) => aproximarLlaves(String(x)));
};

/** ¿Alguna palabra toca (o PUEDE expandirse a) un archivo de secretos? Devuelve el nombre o null. */
/**
 * H5: `quitadas` son las palabras que `desenvolver` quitó (envoltorios, opciones y valores de opción saltados). Y la palabra que queda en la
 * posición del PROGRAMA también se comprueba: tras `. `, `exec`, `time`, `command`, `builtin`, `nohup`, `sudo`, `env`, `xargs`… (y tras el `&` de
 * PowerShell, que el tokenizador trata como separador; allí el comodín del programa también se mira) ese operando es un ARCHIVO que el envoltorio lee o ejecuta, no un programa. Comprobar de más
 * solo puede endurecer: lo que se comprueba es el mismo nombre/patrón de secreto que ya se comprobaba en los argumentos.
 */
const tocaSecreto = (p, w, quitadas = [], enPowerShell = false) => {
  /* La palabra del PROGRAMA se comprueba si hay envoltorio delante (cualquier forma, comodines incluidos: `. .e*`) o si es un nombre literal. Sin
     envoltorio, un COMODÍN en la posición del programa (como `guardian/` seguido de un asterisco) no se lee como «toca un secreto»: eso sería un falso positivo nuevo. */
  const conPrograma = quitadas.length > 0 || enPowerShell || !/[*?[]/.test(String(w[0] || ''));
  const utiles = [...quitadas, ...(conPrograma ? sinPatron(p, w) : sinPatron(p, w).slice(1))];
  const soloRefs = esListadoDeRefsGit(p, w);
  const ultimo = (x) => x.slice(x.replace(/\\/g, '/').lastIndexOf('/') + 1);
  const desescapar = (x) => x.replace(/\\(.)/g, '$1').replace(/\\/g, '/').toLowerCase();
  const aRegex = (g) => '^' + g.replace(/[.+^${}()|]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\[!/g, '[^') + '$';
  /* H4: cada palabra se comprueba también por cada alternativa a la que bash la expandiría (`{.env.local,x}`, `.e{n,}v*`). */
  for (const plano of utiles.flatMap((a) => expandirLlaves(a)).map(desescapar)) {
    for (const sec of ARCHIVOS_SECRETOS) {
      if (plano.includes(sec)) return sec;
      /* La exención de un listado de referencias es SOLO para un último segmento hecho de asteriscos (`guardian/*`): `.env*`, `*creds*` o `.*` siguen comprobándose. */
      if (/[*?[]/.test(plano) && !(soloRefs && /^\*+$/.test(ultimo(plano)))) {
        try {
          const re = new RegExp(aRegex(ultimo(plano)), 'i');
          if (re.test(ultimo(sec)) || re.test(sec)) return sec;
        } catch { /* glob roto: se ignora */ }
      }
    }
  }
  return null;
};

/** ¿La orden ESCRIBE en una ruta protegida (redirección, cp/mv/sed -i, node fs.write…)? */
const escribeProtegido = (p, w, crudo, quitadas = [], salidas = []) => {
  const norm = String(crudo).replace(/\\/g, '/');
  const protegida = (x) => RUTAS_PROTEGIDAS.test(String(x).replace(/\\/g, '/'));
  /* H4: los argumentos también se miran ya expandidos (`rm {.claude,x}/settings.json`, `cp x .cl{a,}ude/settings.json`). */
  const args = w.slice(1).flatMap((x) => expandirLlaves(x));
  /* H5: lo que se quitó y la palabra que quedó en la posición del programa (solo si hubo envoltorio), también ya expandidos. */
  const delEnvoltorio = quitadas.length ? [...quitadas, w[0] || ''].flatMap((x) => expandirLlaves(x)) : [];
  /* S1 (P0): los DESTINOS de las redirecciones de escritura que recogió el tokenizador, ya sin comillas ni escapes y también expandidos. La regex
     sobre el texto crudo (abajo) no los veía si la ruta llevaba comillas partidas (`> .gi''t/HEAD`), llaves (`> .cl{a,}ude/…`) o el operador era
     `>|`/`>&`: el destino de una redirección se ESCRIBE, sea cual sea el programa. */
  const destinos = salidas.flatMap((x) => expandirLlaves(x));
  if (!RUTAS_PROTEGIDAS.test(norm) && !args.some(protegida) && !delEnvoltorio.some(protegida) && !destinos.some(protegida)) return false;
  /* H5: tras un envoltorio, un operando protegido en la posición del programa (`/usr/bin/time -o <ruta> …`, `nohup <ruta>`) o un argumento tras una
     opción que el envoltorio se salta (`time -o <ruta> …`: GNU time ESCRIBE ese archivo) no es un programa que se mire: pregunta el dueño. */
  if (delEnvoltorio.some(protegida)) return true;
  if (destinos.some(protegida)) return true;
  if (/>>?\s*["']?[^\s"'|&;]*(\.claude\/|\.git\/|\.firebaserc|creditengine\.ts|core\/financial\/)/i.test(norm)) return true;
  if (ESCRITORES.has(p) && args.some(protegida)) return true;
  if (p === 'sed' && args.some((x) => /^-i/.test(x)) && args.some(protegida)) return true;
  if ((p === 'node' || p === 'python' || p === 'python3' || p === 'py') &&
    /writefilesync|appendfilesync|writefile\b|\.write\(|unlinksync|rmsync|open\s*\([^)]*['"]w|>\s*open\(/i.test(norm) &&
    protegida(norm)) return true;
  return false;
};

const decision = (d, motivo, cerrado = false) => ({ decision: d, motivo, cerrado });
const MOTIVO_RUTA_PROTEGIDA = 'El comando escribe en una ruta protegida (.claude, .git, .firebaserc, el motor de Credits o el Financial Core): lo aprueba el dueño.';
const PASA = { decision: null, motivo: '', cerrado: false };

/* Lo que no es literal en un programa (node/python) que se lee: no puede ser el nombre de un alias de git. */
const DINAMICO = '‹dinámico›';

/* Programas "sensibles": si reciben un subcomando dinámico y el texto trae una palabra sensible, se deniegan. */
const esSensible = (p) => ['firebase', 'gcloud', 'gsutil', 'gh', 'vercel', 'eas', 'eas-cli', 'npm', 'pnpm', 'yarn'].includes(p);

/** Extrae y analiza las órdenes que lanzaría un `node -e`/`python -c` por dentro. */
const dentroDeCodigo = (herr, codigo, prof, raiz) => {
  const textos = [];
  /* El literal llega hasta SU comilla de cierre: uno entre comillas simples puede llevar comillas dobles dentro. */
  const reCP = /(?:exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*(?:,\s*(\[[^\]]*\]))?/g;
  const rePy = /(?:os\.system|os\.popen|subprocess\.(?:run|call|check_output|check_call|Popen|getoutput))\s*\(\s*(?:(['"])((?:\\.|(?!\1)[^\\])*)\1|(\[[^\]]*\]))/g;
  /*
   * En código solo se puede juzgar lo FIJO. Lo que no es literal —un elemento variable del array (`['-C', raiz, …]`),
   * lo interpolado de una plantilla (`git ${args}`)— se queda como `DINAMICO` en su sitio, para no descolocar los
   * argumentos: `git -C ‹dinámico› commit` sigue preguntando y `git ‹dinámico›` no es nada por sí solo.
   */
  const plantilla = (t) => t.replace(/\$\{[^}]*\}/g, DINAMICO);
  const desdeArray = (lit) => {
    if (!lit) return [];
    const out = [];
    for (const e of lit.slice(1, -1).matchAll(/\s*(?:(['"`])((?:\\.|(?!\1)[^\\])*)\1|([^,]+))\s*(?:,|$)/g)) {
      if (e[1]) out.push(e[1] === '`' ? plantilla(e[2]) : e[2]);
      else if (e[3] && e[3].trim()) out.push(DINAMICO);
    }
    return out;
  };
  let m;
  while ((m = reCP.exec(codigo))) textos.push([m[1] === '`' ? plantilla(m[2]) : m[2], ...desdeArray(m[3])].join(' '));
  while ((m = rePy.exec(codigo))) textos.push(m[3] ? desdeArray(m[3]).join(' ') : m[2]);
  let peor = PASA;
  for (const t of textos) {
    if (!t.trim()) continue;
    const r = analizarTexto(herr, t, prof + 1, raiz);
    if (r.decision === 'deny') return r;
    if (r.decision === 'ask' && !peor.decision) peor = r;
  }
  return peor;
};

/* ── Código que llega por otro camino: la entrada, un archivo, una variable ── */

const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const PYTHONS = new Set(['python', 'python3', 'py']);

/** Un «no se puede leer»: con palabra sensible se deniega; si no, lo autoriza el dueño. */
const sinLeer = (raiz, que) => (SENSIBLE_TXT(raiz)
  ? decision('deny', `${que}, y el texto trae una palabra sensible: Claude no lo ejecuta a ciegas.`)
  : decision('ask', `${que}: la guardia no puede revisarlo antes; lo autoriza el dueño.`));

/** ¿El código ENTERO viene de una variable o una sustitución (`"$X"`, `"$(cat x)"`, `` `…` ``)? Entonces no se puede leer. */
const soloDinamico = (t) => /^\s*(\$\(\)|``|\$\{?[A-Za-z_][\w:.]*\}?)\s*$/.test(String(t));

/** Si esta etapa lee su PROGRAMA de la entrada estándar, ¿en qué lenguaje? (null si la entrada son datos.) */
const leeCodigoDeLaEntrada = (p, w) => {
  const args = w.slice(1);
  const archivo = args.find((x) => !x.startsWith('-'));
  if (SHELLS.has(p)) {
    if (args.some((x) => /^-[a-z]*c$/i.test(x))) return null;
    return archivo && !args.includes('-s') ? null : 'Bash';
  }
  if (p === 'node') return args.some((x) => /^(-e|--eval|-p|--print)$/.test(x)) || (archivo && archivo !== '-') ? null : 'node';
  if (PYTHONS.has(p)) return args.some((x) => /^-[cm]$/.test(x)) || (archivo && archivo !== '-') ? null : 'python';
  if (p === 'invoke-expression' || p === 'iex') return args.length ? null : 'PowerShell';
  if (p === 'powershell' || p === 'pwsh') {
    const cc = args.findIndex((x) => /^-(c|command)$/i.test(x));
    if (cc >= 0) return args[cc + 1] === '-' ? 'PowerShell' : null;
    if (args.some((x) => /^-(f|file|e|ec|enc|encodedcommand)$/i.test(x))) return null;
    return 'PowerShell';
  }
  return null;
};

/** Analiza un programa en su lenguaje: shell y PowerShell como órdenes; node y python por sus llamadas a procesos. */
const analizarCodigo = (lenguaje, codigo, profundidad, raiz) => {
  if (!String(codigo).trim()) return PASA;
  if (lenguaje === 'Bash' || lenguaje === 'PowerShell') return analizarTexto(lenguaje, String(codigo), profundidad + 1, raiz);
  return dentroDeCodigo('Bash', String(codigo), profundidad, raiz);
};

/** Lee un archivo pequeño desde la carpeta de trabajo o desde cualquier `cd` de la orden (rutas de Git Bash incluidas). */
const leerArchivoPequeno = (ruta, raiz) => {
  if (!ruta || dinamica(ruta)) return null;
  const msys = (x) => String(x).replace(/^\/([a-z])\//i, '$1:/');
  const bases = [process.cwd(), ...[...String(raiz).matchAll(/(?:^|[\s;&|(])(?:cd|pushd|set-location|sl)\s+["']?([^\s"';&|)]+)/gi)]
    .map((m) => path.resolve(process.cwd(), msys(m[1])))];
  for (const base of bases) {
    try {
      const abs = path.resolve(base, msys(ruta));
      if (existsSync(abs) && statSync(abs).isFile() && statSync(abs).size < 400_000) return readFileSync(abs, 'utf8');
    } catch { /* la siguiente */ }
  }
  return null;
};

/** ¿La misma orden escribe ese archivo antes de ejecutarlo? (`printf … > x.sh && bash x.sh`) */
const seCreaEnLaMismaOrden = (ruta, raiz) => {
  const b = path.basename(String(ruta).replace(/\\/g, '/')).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!b) return false;
  return new RegExp(`(>>?|\\b(tee|cp|mv|copy-item|move-item|set-content|add-content|out-file|new-item)\\b[^|;&\\n]*)\\s*["']?[^\\s"'|;&]*${b}(?![\\w.-])`, 'i').test(String(raiz));
};

const SALIDA_DE_HEREDOC = Symbol('heredoc');

/** Lo que imprime la etapa anterior de una tubería, si se puede saber sin ejecutar nada (null si no). */
const salidaLiteral = (previa, raiz) => {
  if (!previa) return null;
  if (previa.heredoc) return SALIDA_DE_HEREDOC;
  const { w } = desenvolver(previa.palabras);
  const p = programa(w[0] || '');
  const args = w.slice(1);
  if (['cat', 'type', 'more'].includes(p) && previa.entrada != null) return previa.entrada;
  if (['echo', 'write-output', 'write-host'].includes(p)) return args.filter((x) => !/^-(n|e|E|nonewline)$/i.test(x)).join(' ');
  if (p === 'printf') return args.filter((x) => !x.startsWith('-')).join(' ').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  if (['cat', 'type', 'more', 'get-content', 'gc'].includes(p)) {
    const f = args.filter((x) => !x.startsWith('-'))[0] || previa.entradaArchivo;
    return f ? leerArchivoPequeno(f, raiz) : null;
  }
  /* PowerShell: un literal suelto (o un here-string `@'…'@`) es lo que sale por la tubería. */
  if (previa.palabras.length === 1 && /^@?['"]/.test(previa.crudo)) return previa.palabras[0].replace(/^@\r?\n?|\r?\n?@$/g, '');
  return null;
};

/** El script que ejecuta esta etapa, si lo ejecuta desde un archivo: `{ ruta, lenguaje }` o null. */
const scriptQueEjecuta = (p, w) => {
  const args = w.slice(1);
  const primero = args.find((x) => !x.startsWith('-'));
  if (/\.(sh|bash)$/i.test(w[0])) return { ruta: w[0], lenguaje: 'Bash' };
  if (/\.ps1$/i.test(w[0])) return { ruta: w[0], lenguaje: 'PowerShell' };
  if (/\.py$/i.test(w[0])) return { ruta: w[0], lenguaje: 'python' };
  if (SHELLS.has(p) && primero && !args.some((x) => /^-[a-z]*c$/i.test(x)) && !args.includes('-s')) return { ruta: primero, lenguaje: 'Bash' };
  if (p === 'node' && primero && primero !== '-' && !args.some((x) => /^(-e|--eval|-p|--print)$/.test(x))) return { ruta: primero, lenguaje: 'node' };
  if (PYTHONS.has(p) && primero && primero !== '-' && !args.some((x) => /^-[cm]$/.test(x))) return { ruta: primero, lenguaje: 'python' };
  if (p === 'powershell' || p === 'pwsh') {
    const f = args.findIndex((x) => /^-(f|file)$/i.test(x));
    if (f >= 0 && args[f + 1]) return { ruta: args[f + 1], lenguaje: 'PowerShell' };
  }
  return null;
};

/** Analiza UNA etapa ya partida en palabras. S4: si la etapa iba a pasar, deciden además las variables de entorno de git que fija (solo añade «ask»). */
const analizarOrden = (herramienta, etapa, previa, profundidad, raiz) => {
  const r = analizarOrdenBase(herramienta, etapa, previa, profundidad, raiz);
  return r.decision ? r : (variablesGitS4(etapa) || r);
};
const analizarOrdenBase = (herramienta, etapa, previa, profundidad, raiz) => {
  gasta();
  let { w, dinamica: desdeEntrada, quitadas } = desenvolver(etapa.palabras);
  if (!w.length) {
    /* H5: una orden que se queda sin programa (`xargs -a <secreto>`, `time -o <secreto>`) ya no suelta en silencio lo que se quitó: si nombra un secreto, se deniega. */
    const quitado = tocaSecreto('', [], quitadas);
    return quitado ? decision('deny', `El comando toca ${quitado}: los secretos y credenciales no se leen ni se mueven desde Claude (docs/SECURITY.md).`) : PASA;
  }
  /*
   * xargs: lo que llega por la entrada son ARGUMENTOS. Si se puede leer (here-string, echo/printf, un archivo), se
   * añaden y la orden se analiza entera (`echo commit | xargs git` = `git commit`). Si el último argumento es el `-c`
   * de un shell (o el `-e` de node), lo que llega es UN programa, no palabras sueltas.
   */
  if (desdeEntrada) {
    const llega = etapa.entrada != null ? etapa.entrada : salidaLiteral(previa, raiz);
    if (typeof llega === 'string') {
      const ultimo = w[w.length - 1] || '';
      const comoPrograma = /^-[a-z]*c$/i.test(ultimo) || /^(-e|--eval)$/.test(ultimo);
      const extra = comoPrograma ? [llega] : palabras(llega);
      w = w.includes('{}') ? w.flatMap((x) => (x === '{}' ? extra : [x])) : [...w, ...extra];
      desdeEntrada = false;
    }
  }
  const p = programa(w[0]);
  const resto = w.slice(1);
  const sinOpciones = resto.filter((x) => !x.startsWith('-'));
  /* S1 (P0): la ORDEN EXTERIOR de un intérprete también escribe. `bash -c "…" > .firebaserc`, `cmd /c echo x > .git/HEAD`, `wsl echo x > …`,
     `eval "…" > …`, `powershell -c|-EncodedCommand … > …`: la redirección es de la orden de FUERA, no entra en el texto interior que se reanaliza, y
     la rama de los intérpretes devolvía el resultado del interior ANTES de llegar a `escribeProtegido`. Ahora, si el interior no decidió nada, se mira
     la escritura de la orden exterior (con su texto crudo, lo que se quitó y los destinos de sus redirecciones). Un `deny` o un `ask` del interior se
     conservan tal cual: esto solo puede AÑADIR un `ask`, nunca rebajar. */
  const conEscrituraExterior = (r) => (r.decision ? r
    : escribeProtegido(p, w, etapa.crudo, quitadas, etapa.salidas) ? decision('ask', MOTIVO_RUTA_PROTEGIDA) : r);

  /* Intérpretes y lanzadores con un comando dentro: se analiza lo de dentro. */
  if (profundidad < LIM_PROF) {
    const idx = (re) => w.findIndex((x) => re.test(x));
    const tras = (i) => (i >= 0 && i + 1 < w.length ? w[i + 1] : null);
    let interior = null;
    if (['bash', 'sh', 'zsh', 'dash', 'ksh'].includes(p)) interior = tras(idx(/^-[a-z]*c$/i));
    else if (p === 'cmd') {
      /* H7: sin `/c` ni `/k` NO hay orden interior. `findIndex` daba -1 y el «interior» pasaba a ser la orden ENTERA (`slice(0)`): se reanalizaba a sí
         misma hasta LIM_PROF (30 niveles; con el modo legado de H4 y las llaves, ≈2^30 análisis: el hook no terminaba y fallaba abierto). Cada
         nivel de esa cadena volvía a trocear las MISMAS palabras unidas por espacios (sin comillas), y eso destapaba órdenes (`cmd "git push --force"`,
         `cmd echo "firebase deploy"`). Se conserva, pero acotado a LIM_CMD_SIN_C reanálisis (no 30): lineal, no exponencial. */
      const c = w.findIndex((x) => /^\/[ck]$/i.test(x));
      if (c >= 0) interior = w.slice(c + 1).join(' ') || null;
      else {
        if (NIVEL_CMD_SIN_C < LIM_CMD_SIN_C) {
          NIVEL_CMD_SIN_C++;
          try { const r = decidirPeor(analizarTexto(herramienta, w.join(' '), profundidad + 1, raiz)); if (r.decision) return r; } finally { NIVEL_CMD_SIN_C--; }
        }
      }
    }
    else if (p === 'wsl') interior = w.slice(1).join(' ') || null;
    else if (p === 'eval') interior = resto.join(' ') || null;
    else if (p === 'powershell' || p === 'pwsh') {
      const e = idx(/^-(e|ec|enc|encodedcommand)$/i);
      if (e >= 0 && tras(e)) {
        try { return conEscrituraExterior(decidirPeor(analizarTexto('PowerShell', Buffer.from(tras(e), 'base64').toString('utf16le'), profundidad + 1, raiz))); }
        catch { /* base64 ilegible */ }
      }
      const cc = idx(/^-(c|command)$/i);
      interior = cc >= 0 ? w.slice(cc + 1).join(' ') : null;
    } else if (p === 'invoke-expression' || p === 'iex') {
      const arg = resto.find(Boolean);
      if (arg && dinamica(arg) && SENSIBLE_TXT(raiz)) return decision('deny', 'Invoke-Expression construye y ejecuta un comando dinámico con contenido sensible: Claude no lo ejecuta a ciegas.');
      interior = arg || null;
    } else if (p === 'start-process' || p === 'saps') {
      const f = idx(/^-filepath$/i);
      const prog = f >= 0 ? tras(f) : resto.find((x) => !x.startsWith('-'));
      const a = idx(/^-argumentlist$/i);
      const args = a >= 0 ? w.slice(a + 1).filter((x) => !x.startsWith('-')) : [];
      interior = prog ? [prog, ...args].join(' ') : null;
    } else if (p === 'find') {
      const e = w.findIndex((x) => /^-(exec|execdir|ok)$/.test(x));
      if (e >= 0) {
        const fin = w.findIndex((x, k) => k > e && (x === ';' || x === '+' || x === '\\;'));
        interior = w.slice(e + 1, fin < 0 ? w.length : fin).join(' ') || null;
      }
    } else if (p === 'node' && resto.some((x) => /^(-e|--eval|-p|--print)$/.test(x))) {
      const e = resto.findIndex((x) => /^(-e|--eval|-p|--print)$/.test(x));
      if (soloDinamico(resto[e + 1] || '')) return sinLeer(raiz, '`node -e` ejecuta un programa que llega entero de una variable o una sustitución');
      const r = dentroDeCodigo('Bash', String(resto[e + 1] || ''), profundidad, raiz);
      if (r.decision) return r;
    } else if (PYTHONS.has(p) && resto.some((x) => x === '-c')) {
      const codigo = String(resto[resto.indexOf('-c') + 1] || '');
      if (soloDinamico(codigo)) return sinLeer(raiz, '`python -c` ejecuta un programa que llega entero de una variable o una sustitución');
      const r = dentroDeCodigo('Bash', codigo, profundidad, raiz);
      if (r.decision) return r;
    }
    /* `bash -c "$(cat x)"`, `eval "$CMD"`, `iex $codigo`: el programa entero viene de fuera y no se puede leer. */
    if (interior !== null && soloDinamico(interior)) return sinLeer(raiz, `\`${p}\` ejecuta un programa que llega entero de una variable o una sustitución`);
    if (interior) return conEscrituraExterior(decidirPeor(analizarTexto(herramienta, interior, profundidad + 1, raiz)));

    /*
     * Un intérprete que lee su PROGRAMA de la entrada: un here-string (`bash <<< '…'`), `< archivo`, o la tubería
     * (`echo … | sh`, `cat x | bash`, `'…' | iex`). Si se puede leer, se analiza en su lenguaje; si viene de algo que no
     * se puede leer (`curl … | bash`), lo autoriza el dueño. Los heredocs los analiza `heredocsInterpretados`.
     */
    const lenguaje = leeCodigoDeLaEntrada(p, w);
    if (lenguaje && !etapa.heredoc) {
      /* string = se puede leer · null = no se puede · undefined = no le llega nada · SALIDA_DE_HEREDOC = lo mira el heredoc. */
      const codigo = etapa.entrada != null ? etapa.entrada
        : etapa.entradaArchivo ? leerArchivoPequeno(etapa.entradaArchivo, raiz)
        : previa ? salidaLiteral(previa, raiz) : undefined;
      if (typeof codigo === 'string') {
        const r = analizarCodigo(lenguaje, codigo, profundidad, raiz);
        if (r.decision) return r;
      } else if (codigo === null) {
        return sinLeer(raiz, `\`${p}\` ejecuta un programa que le llega por la entrada y que no se puede leer`);
      }
    }

    /* Un script en un archivo (`bash x.sh`, `./x.sh`, `python x.py`, `pwsh -File x.ps1`, `node x.mjs`): se lee y se analiza. */
    const script = scriptQueEjecuta(p, w);
    if (script) {
      const contenido = leerArchivoPequeno(script.ruta, raiz);
      if (contenido != null) {
        const r = analizarCodigo(script.lenguaje, contenido, profundidad, raiz);
        if (r.decision) return r;
      } else if (seCreaEnLaMismaOrden(script.ruta, raiz)) {
        return decision('ask', `\`${script.ruta}\` se escribe y se ejecuta en la misma orden: la guardia no puede revisarlo antes; lo autoriza el dueño.`);
      }
    }
  }

  /* Escritura en rutas que el dueño protege: pregunta (nunca en silencio). */
  if (escribeProtegido(p, w, etapa.crudo, quitadas, etapa.salidas)) return decision('ask', MOTIVO_RUTA_PROTEGIDA);

  /* Archivos de secretos y credenciales: nunca se leen ni se tocan desde un comando (el patrón de un buscador no cuenta). */
  const secreto = tocaSecreto(p, w, quitadas, herramienta === 'PowerShell');
  if (secreto) return decision('deny', `El comando toca ${secreto}: los secretos y credenciales no se leen ni se mueven desde Claude (docs/SECURITY.md).`);

  const todo = sinPatron(p, w).join(' ').replace(/\\/g, '/').toLowerCase();
  if (p === 'gh' && resto[0] === 'auth' && (resto[1] === 'token' || (resto[1] === 'status' && resto.some((x) => /^(--show-token|-t)$/.test(x))))) {
    return decision('deny', '`gh auth token`/`gh auth status --show-token` imprime el token de GitHub.');
  }
  if (p === 'git' && (resto[0] === 'credential' || /^credential-/.test(resto[0] || ''))) {
    return decision('deny', '`git credential` imprime credenciales guardadas: Claude no las lee.');
  }
  if (/print-access-token|print-identity-token/.test(todo)) return decision('ask', 'Imprimir un token de acceso de Google necesita el visto bueno del dueño.');

  /* Node que lee un script propio del dueño. (Lo que un script lanza por dentro ya lo miró `scriptQueEjecuta`.) */
  if (p === 'node') {
    const archivo = resto.find((x) => !x.startsWith('-'));
    if (archivo && SCRIPTS_DUENO.some((re) => re.test(archivo.replace(/\\/g, '/')))) {
      return decision('ask', `\`node ${archivo}\` lee datos de personas en producción: lo ejecuta el dueño (docs/HARNESS.md).`);
    }
  }

  /* Scripts propios que escriben en producción: llevan banderas explícitas. */
  if (w.some((x) => BANDERAS_DUENO.has(x))) {
    return decision('ask', 'El script escribe o aísla producción (bandera --ejecutar/--confirmo-autorizacion/--crear/--confirmo-aislado): lo aprueba el dueño.');
  }

  /* Firebase CLI. */
  if (p === 'firebase') {
    const nunca = sinOpciones.find((x) => FIREBASE_NUNCA.has(x.toLowerCase()) || /:secrets:access$/.test(x.toLowerCase()));
    if (nunca) return decision('deny', `\`firebase ${nunca}\` no se ejecuta desde el portátil: despliegues y secretos solo por el workflow o el dueño (docs/DEPLOYMENT.md).`);
    const pregunta = sinOpciones.find((x) => FIREBASE_PREGUNTA.has(x.toLowerCase()));
    if (pregunta) return decision('ask', `\`firebase ${pregunta}\` cambia configuración o lee datos de producción: lo aprueba el dueño.`);
    if (sinOpciones[0] && /^emulators:/.test(sinOpciones[0])) {
      const i = resto.findIndex((x) => x === '--project' || x === '-P');
      const proy = i >= 0 ? resto[i + 1] : null;
      if (!proy || !/^demo-/.test(proy)) return decision('ask', 'Los emuladores se arrancan con un proyecto demo-* (npm run functions:emulator); otro proyecto podría tocar datos reales.');
    }
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* gcloud. */
  if (p === 'gcloud') {
    const todos = sinOpciones.map((x) => x.toLowerCase());
    const grupo = GCLOUD_PISTAS.has(todos[0]) ? todos.slice(1) : todos;
    const verbos = grupo.slice(1);
    if (todos.includes('versions') && todos.includes('access')) return decision('deny', 'Leer el VALOR de un secreto (`secrets versions access`) no lo hace Claude.');
    if (grupo[0] === 'auth' && ['login', 'application-default'].includes(verbos[0])) return decision('deny', 'Claude no inicia sesión en Google Cloud: usa su identidad de solo lectura.');
    const nunca = verbos.find((x) => GCLOUD_NUNCA.has(x));
    if (nunca) return decision('deny', `\`gcloud … ${nunca}\` borra o despliega en Google Cloud: no se hace desde Claude.`);
    const iam = verbos.find((x) => GCLOUD_IAM.has(x));
    if (iam) return decision('ask', `\`gcloud … ${iam}\` cambia permisos (IAM): necesita la aprobación del dueño.`);
    if (grupo[0] === 'config' && verbos[0] === 'set') return decision('ask', 'Cambiar la configuración de gcloud (proyecto o cuenta activos) lo aprueba el dueño.');
    const cambia = verbos.find((x) => GCLOUD_CAMBIA.has(x));
    if (cambia) return decision('ask', `\`gcloud … ${cambia}\` cambia o exporta algo en Google Cloud: necesita la aprobación del dueño.`);
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* gsutil (Cloud Storage). */
  if (p === 'gsutil') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (GSUTIL_NUNCA.has(sub)) return decision('deny', `\`gsutil ${sub}\` borra datos de Cloud Storage: no se hace desde Claude.`);
    if (GSUTIL_CAMBIA.has(sub)) return decision('ask', `\`gsutil ${sub}\` escribe o cambia permisos en Cloud Storage: lo aprueba el dueño.`);
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* Vercel CLI. */
  if (p === 'vercel') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (VERCEL_LEE.has(sub) || (!sub && resto.some((x) => /^(--version|-v|--help|-h)$/.test(x)))) return PASA;
    if (VERCEL_LOCAL.has(sub)) return decision('ask', `\`vercel ${sub}\` enlaza o construye contra el proyecto de Vercel: lo aprueba el dueño.`);
    return decision('deny', `\`vercel ${sub || '(sin subcomando)'}\` despliega o cambia el proyecto de Vercel: la web se publica por la integración de Git, no desde Claude.`);
  }

  /* EAS (Expo). */
  if (p === 'eas' || p === 'eas-cli') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    if (!sub || EAS_LEE.has(sub) || /:(list|view)$/.test(sub)) return PASA;
    if (sub === 'submit' || sub === 'update' || /^update:/.test(sub) || ['login', 'logout'].includes(sub) || /:delete$/.test(sub)) {
      return decision('deny', `\`eas ${sub}\` publica a las tiendas o a los teléfonos, borra o inicia sesión en Expo: no se hace desde Claude.`);
    }
    return decision('ask', `\`eas ${sub}\` usa la cuenta de Expo (compilaciones, credenciales, variables): lo aprueba el dueño.`);
  }

  /* GitHub CLI. */
  if (p === 'gh') {
    const sub = (sinOpciones[0] || '').toLowerCase();
    const acc = (sinOpciones[1] || '').toLowerCase();
    if (sub === 'api') {
      const i = resto.findIndex((x) => x === '-X' || x === '--method');
      const metodo = i >= 0 ? String(resto[i + 1] || '').toUpperCase() : (resto.some((x) => /^(-f|-F|--field|--raw-field|--input)$/.test(x)) ? 'POST' : 'GET');
      const ruta = sinOpciones.slice(1).find((x) => x.includes('/')) || '';
      if (metodo !== 'GET' && /pending_deployments/.test(ruta)) return decision('deny', 'Aprobar un despliegue pendiente es del dueño, nunca de Claude.');
      if (metodo !== 'GET' && GH_SENSIBLE.test(ruta)) return decision('ask', `\`gh api ${metodo} ${ruta}\` cambia ajustes de seguridad del repositorio: lo aprueba el dueño.`);
      if (metodo !== 'GET') return decision('ask', `\`gh api ${metodo}\` escribe en GitHub: lo aprueba el dueño.`);
      return PASA;
    }
    if (sub === 'repo' && ['delete', 'archive'].includes(acc)) return decision('deny', `\`gh repo ${acc}\` no lo hace Claude.`);
    /* `gh repo sync` mueve (o con --force reescribe) la rama local: es historia, como un pull. */
    if ((sub === 'repo' && ['edit', 'rename', 'sync'].includes(acc)) || ['secret', 'variable'].includes(sub)
      || (sub === 'release' && ['create', 'delete', 'edit', 'upload'].includes(acc))
      || (sub === 'workflow' && ['run', 'enable', 'disable'].includes(acc))
      || (sub === 'pr' && acc === 'merge') || (sub === 'auth' && ['login', 'logout', 'refresh', 'setup-git'].includes(acc))
      || (sub === 'ruleset' && !['list', 'view', 'check'].includes(acc))) {
      return decision('ask', `\`gh ${sub} ${acc}\` cambia el repositorio o sus ajustes: lo aprueba el dueño.`);
    }
    return PASA;
  }

  /* git. */
  if (p === 'git') {
    let i = 0;
    while (i < resto.length && resto[i].startsWith('-')) i += (GIT_GLOBAL_CON_VALOR.has(resto[i]) ? 2 : 1);
    const sub = (resto[i] || '').toLowerCase();
    const args = resto.slice(i + 1);
    if (aliasEnLaOrden(resto.slice(0, i))) {
      return decision('ask', 'Un alias de git definido en la propia orden (`-c alias.…`) puede esconder un commit, un merge o un push: lo autoriza el dueño.');
    }
    /* S4: la decisión por las opciones globales se calcula aquí y se devuelve SOLO donde la orden iba a pasar (nunca tapa un ask/deny de abajo). */
    const s4 = opcionesGlobalesGitS4(resto.slice(0, i));
    /* `… | xargs git …` con una entrada que no se puede leer: el subcomando o sus opciones llegan de fuera. */
    if (desdeEntrada && !GIT_ARGS_INOCUOS.has(sub)) {
      return sinLeer(raiz, `\`git ${sub || ''}\` recibe ${sub ? 'sus argumentos' : 'su subcomando'} por la entrada (xargs) y podría crear commits, mover ramas o hacer push`);
    }
    if (sub === 'push') {
      if (args.some((x) => /^(-f|--force|--force-with-lease.*|--force-if-includes|--mirror|--delete|-d|--prune)$/.test(x))
        || args.some((x) => /^\+/.test(x) || /^:/.test(x))) {
        return decision('deny', 'Un push forzado o que borra ramas remotas no lo hace Claude: se pierde historia.');
      }
      return decision('ask', 'Subir a GitHub publica el código (el repo es público) y puede disparar despliegues: lo aprueba el dueño.');
    }
    if ((sub === 'reset' && args.includes('--hard')) || (sub === 'clean' && args.some((x) => /^-[a-z]*f/i.test(x)))
      || (sub === 'branch' && args.some((x) => /^(-d|-D|--delete)$/.test(x))) || (sub === 'tag' && args.some((x) => /^(-d|--delete)$/.test(x)))
      || (sub === 'worktree' && ['remove', 'prune'].includes((args[0] || '').toLowerCase()))
      || (sub === 'stash' && ['drop', 'clear'].includes((args[0] || '').toLowerCase()))
      || (sub === 'update-ref' && args.includes('-d')) || (sub === 'reflog' && ['expire', 'delete'].includes(args[0] || ''))
      || (sub === 'gc' && args.some((x) => /^--prune/.test(x))) || sub === 'filter-branch' || sub === 'filter-repo') {
      return decision('ask', `\`git ${sub}\` puede borrar trabajo: no se pierde nada local sin el visto bueno del dueño.`);
    }
    /* Lanzadores dentro de git: lo que ejecutan se analiza como cualquier otra orden. */
    if (profundidad < LIM_PROF) {
      const lanzado = lanzadoPorGit(sub, args);
      if (lanzado) {
        const r = analizarTexto(herramienta, lanzado, profundidad + 1, raiz);
        if (r.decision === 'deny') return decidirPeor(r);
        if (sub !== 'rebase') return r.decision ? decidirPeor(r) : (s4 || r);   // S4: donde el interior pasaba, deciden las opciones globales
      }
    }
    const historia = cambiaHistoria(sub, args);
    if (historia) {
      return decision('ask', `\`git ${historia}\` cambia la historia de git: Claude lo PROPONE y el dueño lo AUTORIZA (agente → propone → humano autoriza → commit).`);
    }
    /* En código que se lee, un subcomando no literal no se puede saber (límite documentado en SECURITY.md). */
    if (sub && !GIT_CONOCIDOS.has(sub) && sub !== DINAMICO.toLowerCase()) {
      return decision('ask', `\`git ${sub}\` no es un subcomando conocido de git (puede ser un alias de commit, merge o push): lo autoriza el dueño.`);
    }
    return s4 || PASA;   // S4
  }

  /* npm: los scripts de despliegue y los que leen producción. */
  if (p === 'npm' || p === 'pnpm' || p === 'yarn') {
    const i = resto.findIndex((x) => x === 'run' || x === 'run-script');
    /* `npm version patch` crea un commit y un tag de git: es historia. Sin argumento solo enseña versiones. */
    const posNpm = resto.filter((x, k) => !x.startsWith('-') && !['--prefix', '-C', '--workspace', '-w'].includes(resto[k - 1]));
    if ((posNpm[0] || '').toLowerCase() === 'version' && posNpm.length > 1 && !resto.includes('--no-git-tag-version')) {
      return decision('ask', `\`${p} version ${posNpm[1]}\` crea un commit y un tag de git: lo autoriza el dueño.`);
    }
    const script = i >= 0 ? (resto[i + 1] || '') : (p === 'yarn' ? (sinOpciones[0] || '') : '');
    if (/deploy/i.test(script)) return decision('deny', `\`${p} run ${script}\` despliega desde el portátil: producción solo cambia por el workflow (docs/DEPLOYMENT.md).`);
    if (/^logs?$/i.test(script)) return decision('ask', `\`${p} run ${script}\` lee los registros de producción: lo ejecuta el dueño (docs/HARNESS.md).`);
    /*
     * Lo que ejecuta el script ES una orden: se lee de package.json (con sus `pre`/`post`) y se analiza, desde la
     * carpeta del paquete (`--prefix`, `-C` o un `cd` de la orden). Un script editado para hacer un commit pregunta.
     */
    const nombre = script || (['test', 't', 'start', 'stop', 'restart'].includes((posNpm[0] || '').toLowerCase()) ? ((posNpm[0] || '').toLowerCase() === 't' ? 'test' : posNpm[0].toLowerCase()) : '');
    if (nombre && profundidad < LIM_PROF) {
      const pre = resto.findIndex((x) => x === '--prefix' || x === '-C' || x === '--cwd' || x === '--dir');
      const carpeta = pre >= 0 ? resto[pre + 1] : '.';
      const pkg = leerArchivoPequeno(path.join(carpeta || '.', 'package.json'), raiz);
      let scripts = null;
      try { scripts = pkg ? JSON.parse(pkg).scripts || null : null; } catch { scripts = null; }
      for (const s of [`pre${nombre}`, nombre, `post${nombre}`]) {
        const cuerpo = scripts && typeof scripts[s] === 'string' ? scripts[s] : null;
        if (!cuerpo) continue;
        const r = analizarTexto('Bash', `cd "${carpeta}" && ${cuerpo}`, profundidad + 1, `${raiz}\ncd "${carpeta}"`);
        if (r.decision) return r;
      }
    }
    return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
  }

  /* (Un intérprete que recibe su programa por una tubería —`echo … | bash`— lo mira `leeCodigoDeLaEntrada`, arriba.) */
  return reglaDinamica(p, w, etapa, desdeEntrada, raiz);
};

/** Un "peor" (deny gana a ask gana a pasa) para combinar una llamada recursiva. */
const decidirPeor = (r) => r;

/**
 * H6 — ENVOLTORIOS NO MODELADOS. `desenvolver` solo conoce los envoltorios de su lista (ENVOLTORIOS, env, xargs, npx…) y de ellos sabe qué
 * opciones llevan valor. Cualquier OTRO programa que ejecuta una orden (`taskset 1 firebase deploy`, `flock x firebase deploy`, `numactl`, `unshare`,
 * `nsenter`, `chroot`, `runuser`, `su -c`, `watch`, `strace`, `gdb --args`, `systemd-run`, `script -c`, `parallel`, `ssh host …`, `wsl -e`, `start`…) se
 * veía como «un programa desconocido» y su orden real no se decidía; y de los ya conocidos, las opciones con valor que la tabla no recoge
 * (`timeout -s ABRT`, `env -iS 'firebase deploy'`, `timeout 1.5 …`) dejaban el valor como «el programa».
 *
 * CORRECCIÓN (aditiva, como H4): cuando la orden empieza por uno de estos programas (o `desenvolver` termina en uno), se analizan ADEMÁS TODAS las
 * hipótesis posibles de dónde empieza la orden real —cada SUFIJO de palabras que no sea una opción— y, en los envoltorios nuevos, cada palabra con
 * espacios que pueda ser una orden entre comillas (`su -c 'firebase deploy'`, `watch 'git push'`) como texto de shell. Si una opción «toma valor» o
 * no, o cuántos operandos posicionales lleva el envoltorio (`taskset MÁSCARA`, `flock ARCHIVO`, `chroot RAÍZ`), da igual: se mira cada punto de
 * arranque y se toma la PEOR decisión («analizar las dos hipótesis y tomar la peor»). Esto solo puede AÑADIR decisiones: la orden original se
 * analizó antes. Y solo cuenta lo que el sufijo añade por la identidad del programa (ver el comentario del bucle): lo que ya salía de los argumentos
 * (secretos, patrones) no se duplica, así que no hay falsos positivos nuevos con `sudo git branch --list 'guardian/*'`.
 *
 * Residuo documentado: un operando que coincide con una orden sensible tras uno de estos envoltorios (`strace -o git push`) se lee como la orden
 * (es el precio de no adivinar la estructura). No se analiza el interior de un `source script`/`. script` (ver el informe de H6).
 */
const ENVOLTORIOS_H6 = new Set([...ENVOLTORIOS, 'source', 'env', 'xargs', 'npx', 'pnpx', 'bunx',
  'taskset', 'flock', 'numactl', 'unshare', 'nsenter', 'chroot', 'runuser', 'su', 'sg', 'newgrp', 'setpriv', 'prlimit', 'pkexec',
  'watch', 'strace', 'ltrace', 'gdb', 'valgrind', 'perf', 'fakeroot', 'fakechroot', 'proot', 'systemd-run', 'dbus-run-session', 'script', 'cpulimit',
  'parallel', 'entr', 'xvfb-run', 'winpty', 'wsl', 'cmd', 'start', 'busybox', 'ssh', 'eatmydata', 'torsocks', 'proxychains', 'proxychains4',
  'dumb-init', 'tini', 'gosu', 'su-exec', 'sshpass', 'arch', 'unbuffer', 'chronic', 'ifne', 'caffeinate', 'tsp', 'cpulimit', 'nsjail', 'firejail', 'bwrap']);

/* Los de ENVOLTORIOS_H6 que `desenvolver` NO modela: solo en estos la cadena entre comillas se lee como orden (ver `porEnvoltorios`). */
const ENVOLTORIOS_H6_NUEVOS = new Set([...ENVOLTORIOS_H6].filter((x) => !ENVOLTORIOS.has(x) && !['env', 'xargs', 'npx', 'pnpx', 'bunx', 'source'].includes(x)));

/* Los que reciben la orden como UNA cadena que pasan a un shell (`watch 'cmd'`, `parallel 'cmd {}'`, `ssh host 'cmd'`): ahí la palabra con espacios es la orden aunque no lleve `-c`. */
const ENVOLTORIOS_H6_CADENA = new Map([['watch', 2], ['parallel', 2], ['ssh', 3], ['sshpass', 3]]); /* programa → hasta qué operando puede ser la cadena */

const porEnvoltorios = (herr, etapa, profundidad, raiz) => {
  gasta();
  let peor = PASA;
  if (profundidad >= LIM_PROF) return peor;
  const ps = etapa.palabras;
  const ini = ps.findIndex((x) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(x));
  if (ini < 0 || ini >= ps.length - 1) return peor;
  const p0 = programa(ps[ini]);
  const p1 = programa(desenvolver(ps).w[0] || '');
  const gestor = ['npm', 'pnpm', 'yarn', 'bun'].includes(p0) && ['exec', 'x', 'dlx'].includes(ps[ini + 1]);
  if (!(ENVOLTORIOS_H6.has(p0) || ENVOLTORIOS_H6.has(p1) || gestor)) return peor;
  const rk = (r) => (r.decision === 'deny' ? 2 : r.decision === 'ask' ? 1 : 0);
  const nuevo = ENVOLTORIOS_H6_NUEVOS.has(p0) || ENVOLTORIOS_H6_NUEVOS.has(p1);
  let posicional = 0;
  /* Con un envoltorio que `desenvolver` YA modela (sudo, nice, env…) el programa real está donde él lo dejó: lo que viene después son argumentos de ese
     programa (`sudo echo firebase deploy` no es un despliegue), así que solo se prueban los puntos de arranque HASTA ahí (por si una opción con valor no
     tabulada se tragó el programa). Con uno nuevo no se sabe dónde acaba el envoltorio y se prueban todos. */
  let hasta = (nuevo || ENVOLTORIOS_H6.has(p1)) ? ps.length : ps.length - desenvolver(ps).w.length;
  /* El «programa» que dejó `desenvolver` puede ser en realidad el VALOR de una opción que la tabla no recoge (`timeout -s ABRT 5 firebase deploy`: `ABRT`) o
     una duración que no reconoce (`timeout 1.5 …`): si va tras una opción, o es un número, se prueba también lo que sigue. Residuo: `sudo -E echo firebase deploy` se lee como un despliegue. */
  while (hasta < ps.length - 1 && (/^[\d.]+[smhd]?$/i.test(ps[hasta]) || /^-/.test(ps[hasta - 1] || ''))) hasta++;
  for (let k = ini + 1; k < ps.length && k <= hasta; k++) {
    const opcion = /^-/.test(ps[k]);
    if (!opcion) posicional++;
    /* Una palabra con espacios puede ser una ORDEN entre comillas (`su -c 'firebase deploy'`, `watch -n 5 'git push'`, `ssh host 'git push'`): se analiza como
       texto, pero SOLO en los envoltorios nuevos y solo si va tras una opción de «orden» (`-c`, `-e`, `--command`…) o es de los tres primeros operandos. Un
       mensaje (`git commit -m "firebase deploy"`) lleva su cadena más lejos y NO se lee como orden. */
    const ultima = k === ps.length - 1 || /^::::?$/.test(ps[k + 1]);
    if (nuevo && /\s/.test(ps[k]) && (/^(-[A-Za-z]*[ceS]|--(command|exec|eval|cmd))$/.test(ps[k - 1] || '') || (ultima && posicional <= Math.max(ENVOLTORIOS_H6_CADENA.get(p0) || 0, ENVOLTORIOS_H6_CADENA.get(p1) || 0)))) {
      const r = analizarTexto(herr, ps[k], profundidad + 1, raiz);
      if (r.decision === 'deny') return r;
      if (r.decision === 'ask' && !peor.decision) peor = r;
    }
    if (opcion) continue;
    const suf = ps.slice(k);
    const r = analizarOrden(herr, { ...etapa, palabras: suf, crudo: suf.join(' ') }, null, profundidad + 1, raiz);
    /* Una decisión que sale de los ARGUMENTOS (un comodín que parece un secreto, `print-access-token` en un patrón…) ya la dio el análisis de la orden
       entera: para saber si sale de la IDENTIDAD del programa se compara con la misma lista de palabras bajo un programa desconocido. Solo cuenta lo que
       añade. Sin esto, `sudo git branch --list 'guardian/*'` se leería como `branch --list …` y daría un falso positivo. */
    if (rk(r) === 0) continue;
    const sin = analizarOrden(herr, { ...etapa, palabras: ['__envoltorio__', ...suf], crudo: ['__envoltorio__', ...suf].join(' ') }, null, profundidad + 1, raiz);
    if (rk(r) <= rk(sin)) continue;
    if (r.decision === 'deny') return r;
    if (r.decision === 'ask' && !peor.decision) peor = r;
  }
  /* Un sufijo que EMPIEZA por otro envoltorio (`timeout -s ABRT 5 taskset 1 firebase deploy`) se mira también con sus propias hipótesis. */
  for (let k = ini + 1; k <= hasta && k < ps.length - 1; k++) {
    if (/^-/.test(ps[k]) || !ENVOLTORIOS_H6.has(programa(ps[k])) || k === ini) continue;
    const r = porEnvoltorios(herr, { ...etapa, palabras: ps.slice(k) }, profundidad + 1, raiz);
    if (r.decision === 'deny') return r;
    if (r.decision === 'ask' && !peor.decision) peor = r;
  }
  return peor;
};


/**
 * Backstop para lo dinámico: si un programa sensible recibe el SUBCOMANDO por una
 * variable/sustitución (o el programa mismo es dinámico), o sus argumentos vienen
 * de `xargs`, y el texto completo trae una palabra sensible → deny. No bloquea las
 * órdenes dinámicas corrientes (sin palabra sensible).
 */
function reglaDinamica(p, w, etapa, desdeEntrada, raiz) {
  /* El programa puede llegar de una variable tras un envoltorio (`& $g commit` en PowerShell): se mira también w[0]. */
  const progDin = dinamica(etapa.palabras[0] || '') || dinamica(w[0] || '');
  const subDin = dinamica(w[1] || '') || desdeEntrada;
  const sinSub = w.length < 2 && desdeEntrada;
  /* `g=git; $g commit`, `"$(which git)" commit`: un programa que no se sabe cuál es con un verbo de historia de git.
     Con palabra sensible (`$G push --force`) NO se rebaja a ask: decide el deny de abajo, como hacía la guardia anterior. */
  if (progDin && !SENSIBLE_TXT(raiz) && GIT_VERBOS_DE_HISTORIA.has(String(w[1] || '').toLowerCase())) {
    return decision('ask', `Un programa que llega de una variable recibe \`${w[1]}\`: si es git, cambia la historia; lo autoriza el dueño.`);
  }
  if (!SENSIBLE_TXT(raiz)) return PASA;
  if (progDin) return decision('deny', 'El programa se arma dinámicamente y el texto trae una palabra sensible (deploy/secrets/token/…): Claude no lo ejecuta a ciegas.');
  if (esSensible(p) && (subDin || sinSub)) return decision('deny', `\`${p}\` recibe su subcomando por una variable/entrada y el texto trae una palabra sensible: podría ser un despliegue o un borrado encubierto.`);
  return PASA;
}

/** Analiza el texto completo de un comando de Bash o de PowerShell. */
export const analizarTexto = (herramienta, texto, profundidad = 0, raiz) => {
  const base = raiz === undefined ? texto : raiz;
  const propia = PRESUP.activos === 0; // la llamada más externa es la dueña del presupuesto
  if (propia) arrancaPresupuesto();
  PRESUP.activos++;
  try {
    const r = analizar(herramienta, texto, profundidad, base);
    /* Un `catch` intermedio pudo tragarse el error del presupuesto: el análisis está incompleto, no se da por bueno. */
    if (propia && PRESUP.agotado) return decision('deny', MOTIVO_PRESUPUESTO, true);
    return r;
  } catch (e) {
    if (e && e.presupuesto && (propia || profundidad === 0)) return decision('deny', MOTIVO_PRESUPUESTO, true);
    if (profundidad > 0) throw e;
    /* Un exceso de anidamiento/tamaño SIN palabra sensible se deja pasar (no bloquear lo inocuo);
       con palabra sensible, o ante cualquier otro error, se FALLA CERRADO. */
    if (e && e.limite && !SENSIBLE_TXT(base)) return PASA;
    return decision('deny', 'la guardia no pudo analizar este comando; reformúlalo en órdenes simples y explícitas.', true);
  } finally { PRESUP.activos--; }
};
const MOTIVO_PRESUPUESTO = 'análisis demasiado complejo: la guardia no pudo terminar de revisar este comando a tiempo y no lo deja pasar sin revisar; divídelo en órdenes simples y explícitas.';

function analizar(herramienta, texto, profundidad, raiz) {
  gasta();
  if (process.env.GUARDIA_PRUEBA_FALLO === '1') throw new Error('punto de prueba: fallo forzado');
  const herr = herramienta === 'Monitor' ? 'Bash' : herramienta;

  /* La trampa de PowerShell 5.1 con los .cmd: un argumento entre comillas con > < | & vuelve a pasar por cmd.exe
     y se convierte en una redirección (así aparecieron ERROR y WARNING en la raíz del repo, dos veces). */
  if (herr === 'PowerShell' && /\.cmd\b/i.test(texto) && !/--%/.test(texto)
    && /"[^"]*[<>|&][^"]*"|'[^']*[<>|&][^']*'/.test(texto)) {
    return decision('deny', 'Un argumento con > < | & pasado a un .cmd desde PowerShell lo reinterpreta cmd.exe (crea archivos o rompe el comando). Usa --% o la herramienta Bash.');
  }

  if (profundidad > LIM_PROF || texto.length > LIM_TAM) {
    if (SENSIBLE_TXT(texto)) throw new RangeError('fuera de límites con contenido sensible');
    return PASA;
  }

  let peor = PASA;
  const sumar = (r) => { if (r.decision === 'ask' && !peor.decision) peor = r; return r.decision === 'deny'; };

  if (herr === 'PowerShell') {
    /* `& (Get-Command firebase) deploy`, `(gcm git).Source commit`: el programa es el que nombra Get-Command. */
    texto = texto.replace(/\(\s*(?:get-command|gcm)\s+(?:-name\s+)?(['"]?)([^\s'")]+)\1[^)]*\)(?:\.(?:source|path|definition))?/gi, '$2');
    /* Bloques de código que se crean desde un TEXTO y se ejecutan: el texto se analiza como PowerShell. */
    for (const m of texto.matchAll(/(?:\[scriptblock\]::create|\.invokescript|\.newscriptblock)\(\s*(['"])((?:(?!\1)[\s\S])*)\1/gi)) {
      const r = analizarTexto('PowerShell', m[2], profundidad + 1, raiz);
      if (sumar(r)) return r;
    }
    if (/(?:\[scriptblock\]::create|\.invokescript|\.newscriptblock)\(\s*[^\s'"]/i.test(texto)) {
      const r = sinLeer(raiz, 'Un bloque de código se crea desde una variable y se ejecuta');
      if (sumar(r)) return r;
    }
    /* `iex (Get-Content x.ps1 -Raw)`, `iex (algo)`: si es un archivo se lee; si no, no se puede revisar. */
    for (const m of texto.matchAll(/\b(?:iex|invoke-expression)\s+(?:-command\s+)?\(([^)]*)\)/gi)) {
      const f = m[1].match(/^\s*(?:get-content|gc|cat|type)\s+(?:-path\s+|-literalpath\s+)?(['"]?)([^\s'")]+)\1/i);
      const contenido = f ? leerArchivoPequeno(f[2], raiz) : null;
      const r = contenido != null ? analizarTexto('PowerShell', contenido, profundidad + 1, raiz) : sinLeer(raiz, 'Invoke-Expression ejecuta lo que devuelve una subexpresión');
      if (sumar(r)) return r;
    }
    /* Escrituras de .NET en rutas protegidas (`[IO.File]::WriteAllText('.git/refs/heads/main', …)`). */
    if (ESCRITURA_DOTNET.test(texto) && RUTAS_PROTEGIDAS.test(texto.replace(/\\/g, '/'))) {
      sumar(decision('ask', 'El comando escribe con .NET en una ruta protegida (.claude, .git, .firebaserc, el motor de Credits o el Financial Core): lo aprueba el dueño.'));
    }
  } else {
    /* Un heredoc que alimenta a un intérprete (`bash <<EOF`, `cat <<EOF | sh`, `node <<'EOF'`) es un PROGRAMA: se analiza. */
    const r = heredocsInterpretados(herr, texto, profundidad, raiz);
    if (sumar(r)) return r;
  }

  /* S4: `[Environment]::SetEnvironmentVariable('GIT_…', …)` (PowerShell/.NET) fija una variable de git sin pasar por una asignación de shell. */
  { const r = entornoDotnetS4(texto); if (r) sumar(r); }

  const fuera = [];
  trocear(herr, sinHeredocs(texto), fuera, 0);
  for (const tuberia of fuera) {
    for (let k = 0; k < tuberia.length; k++) {
      const r = analizarOrden(herr, tuberia[k], tuberia[k - 1] || null, profundidad, raiz);
      if (r.decision === 'deny') return r;
      if (r.decision === 'ask' && !peor.decision) peor = r;
      /* H4: la misma orden con sus llaves ya expandidas (`{git,push} --force` es `git push --force`; `{firebase,deploy}` es un despliegue).
         Es ADICIONAL: la orden original se analizó arriba, así que esto solo puede añadir decisiones. */
      if (tuberia[k].palabras.some((x) => x.includes('{'))) {
        const exp = expandirPalabras(tuberia[k].palabras);
        if (exp.length !== tuberia[k].palabras.length || exp.some((x, i) => x !== tuberia[k].palabras[i])) {
          const r2 = analizarOrden(herr, { ...tuberia[k], palabras: exp }, tuberia[k - 1] || null, profundidad, raiz);
          if (r2.decision === 'deny') return r2;
          if (r2.decision === 'ask' && !peor.decision) peor = r2;
        }
      }
      /* H6: los envoltorios que no modela `desenvolver` (y sus opciones con valor): se analiza cada punto de arranque posible de la orden real. Solo AÑADE decisiones. */
      for (const pals of (tuberia[k].palabras.some((x) => x.includes('{')) ? [tuberia[k].palabras, expandirPalabras(tuberia[k].palabras)] : [tuberia[k].palabras])) {
        const r3 = porEnvoltorios(herr, { ...tuberia[k], palabras: pals }, profundidad, raiz);
        if (r3.decision === 'deny') return r3;
        if (r3.decision === 'ask' && !peor.decision) peor = r3;
      }
      /* S1 (P0): la misma orden SIN las palabras de sus redirecciones (su archivo y el descriptor pegado). El tokenizador quita el operador pero deja el
         archivo entre las palabras, y eso descolocaba a quien mira posiciones: en `bash -c > o 'git push --force'` o `bash -c 2>/dev/null '…'` el «interior»
         era `o`/`2`, y en `echo '…' | bash > o` el archivo parecía el script que bash ejecuta. Es ADICIONAL (la orden original ya se analizó, con su crudo y
         sus destinos, que esta variante conserva): solo puede añadir decisiones. */
      const redir = tuberia[k].redir || [];
      if (redir.length) {
        const fuera = new Set(redir);
        const sinRedir = tuberia[k].palabras.filter((_, i) => !fuera.has(i));
        if (sinRedir.length) {
          const e = { ...tuberia[k], palabras: sinRedir };
          for (const r4 of [analizarOrden(herr, e, tuberia[k - 1] || null, profundidad, raiz), porEnvoltorios(herr, e, profundidad, raiz)]) {
            if (r4.decision === 'deny') return r4;
            if (r4.decision === 'ask' && !peor.decision) peor = r4;
          }
        }
      }
    }
  }
  /* H4: el troceado de la guardia anterior (ver MODO_LEGADO), solo si hay llaves: conserva todas sus decisiones. */
  if (sinHeredocs(texto).includes('{')) {
    const legado = [];
    MODO_LEGADO = true;
    try { trocear(herr, sinHeredocs(texto), legado, 0); } finally { MODO_LEGADO = false; }
    for (const tuberia of legado) {
      for (let k = 0; k < tuberia.length; k++) {
        const r = analizarOrden(herr, tuberia[k], tuberia[k - 1] || null, profundidad, raiz);
        if (r.decision === 'deny') return r;
        if (r.decision === 'ask' && !peor.decision) peor = r;
      }
    }
  }
  return peor;
}

/**
 * Los heredocs cuyo cuerpo EJECUTA un intérprete de su misma línea (`bash <<EOF`, `bash -s <<EOF`, `cat <<EOF | sh`,
 * `node <<'EOF'`, `python3 - <<'EOF'`): el cuerpo se analiza en el lenguaje de ese intérprete. El de `git commit -F -`
 * o el de `cat <<EOF > notas.md` es texto y no se mira (un mensaje que nombra `firebase deploy` no se bloquea).
 */
function heredocsInterpretados(herr, texto, profundidad, raiz) {
  const lineas = String(texto).split(/\r?\n/);
  let peor = PASA;
  for (let k = 0; k < lineas.length; k++) {
    const m = lineas[k].match(/(?<!<)<<(?!<)-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (!m) continue;
    const cuerpo = [];
    let j = k + 1;
    for (; j < lineas.length && lineas[j].trim() !== m[2]; j++) cuerpo.push(lineas[j]);
    const etapas = [];
    trocear(herr, lineas[k], etapas, 0);
    const lenguajes = new Set();
    for (const tuberia of etapas) {
      for (const etapa of tuberia) {
        const { w } = desenvolver(etapa.palabras);
        const l = w.length ? leeCodigoDeLaEntrada(programa(w[0]), w) : null;
        if (l) lenguajes.add(l);
      }
    }
    for (const l of lenguajes) {
      const r = analizarCodigo(l, cuerpo.join('\n'), profundidad, raiz);
      if (r.decision === 'deny') return r;
      if (r.decision === 'ask' && !peor.decision) peor = r;
    }
    k = j;
  }
  return peor;
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

const salida = (d, motivo) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: d, permissionDecisionReason: `Weë Harness: ${motivo}` },
  }));
};

const principal = async () => {
  let entrada = '';
  for await (const trozo of process.stdin) entrada += trozo;
  let datos;
  try { datos = JSON.parse(entrada || '{}'); }
  catch { salida('deny', 'la guardia recibió una entrada ilegible; no se ejecuta por seguridad.'); return 2; }
  const herramienta = datos.tool_name;
  const comando = datos.tool_input && datos.tool_input.command;
  if (!['Bash', 'PowerShell', 'Monitor'].includes(herramienta) || typeof comando !== 'string') return 0;
  let r;
  try { r = analizarTexto(herramienta, comando); }
  catch { salida('deny', 'la guardia no pudo analizar este comando; reformúlalo en órdenes simples y explícitas.'); return 2; }
  if (!r.decision) return 0;
  salida(r.decision, r.motivo);
  return r.cerrado ? 2 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().then(
    (codigo) => process.exit(codigo || 0),
    (e) => {
      try { salida('deny', 'la guardia falló de forma inesperada; no se ejecuta por seguridad.'); } catch { /* nada */ }
      process.stderr.write(`guardia: error interno, se bloquea por seguridad (${e && e.message})\n`);
      process.exit(2);
    },
  );
}

export const __dir = path.dirname(fileURLToPath(import.meta.url));
