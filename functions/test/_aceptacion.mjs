/**
 * EL COMPROBADOR DE LAS SUITES DE ACEPTACIÓN (`aceptacion-*.test.mjs`).
 *
 * Es un módulo, no una suite. Hace lo mismo que el `check` de cualquier otra suite del repositorio —línea ✔/✘ y salida
 * distinta de cero si algo falla— y añade UNA cosa: el hueco conocido.
 *
 * ── Qué es un hueco conocido ────────────────────────────────────────────────
 *
 * Un escenario de aceptación que HOY no se cumple y que alguien ya midió: una función que la persona espera y que el
 * código todavía no tiene, o un defecto reproducido que no se arregla en esta tarea. En vez de dejarlo fuera —y que el
 * documento diga una cosa y el código otra sin que nadie lo note—, la prueba lo escribe como lo que DEBERÍA pasar y
 * lo da por bueno MIENTRAS NO SE CUMPLA:
 *
 *   hueco('ACE-C-11', 'sustituir un ingrediente no pide la foto de la nevera', cumple)
 *
 *   · `cumple` falso → «⚠ HUECO CONOCIDO», la suite sigue en verde y el hueco queda a la vista en cada ejecución;
 *   · `cumple` verdadero → «✘ HUECO CERRADO»: la suite FALLA a propósito, porque alguien arregló lo que el catálogo
 *     (`docs/WEE-ACEPTACION.md`) da por roto. Se convierte en un `check()` normal, se marca PASA en el documento y
 *     la suite vuelve a verde. Es lo mismo que hace una cerca de integridad, pero para algo que mejora.
 *
 * Quien integra varias ramas a la vez y no quiere que un cierre le rompa la cadena puede ejecutar con
 * `ACEPTACION_TOLERA_CIERRES=1`: el cierre se avisa («✔ HUECO CERRADO») pero no falla. No es el valor por defecto.
 */
const salida = (s) => process.stdout.write(`${s}\n`);

export const crearComprobador = () => {
  let fallos = 0;
  let huecos = 0;
  let cierres = 0;
  let total = 0;
  const check = (nombre, cond, extra = '') => {
    total++;
    salida(`${cond ? '✔ ' : '✘ '}${nombre}${extra ? ` — ${extra}` : ''}`);
    if (!cond) fallos++;
  };
  const hueco = (id, nombre, cumple, extra = '') => {
    total++;
    if (!cumple) {
      huecos++;
      salida(`⚠ HUECO CONOCIDO [${id}] ${nombre}${extra ? ` — ${extra}` : ''}`);
      return;
    }
    cierres++;
    if (process.env.ACEPTACION_TOLERA_CIERRES === '1') {
      salida(`✔ HUECO CERRADO [${id}] ${nombre} (tolerado: ACEPTACION_TOLERA_CIERRES=1)`);
      return;
    }
    fallos++;
    salida(`✘ HUECO CERRADO [${id}] ${nombre} — ahora se cumple: conviértelo en check() aquí y márcalo PASA en docs/WEE-ACEPTACION.md`);
  };
  const titulo = (t) => salida(`\n── ${t} ──`);
  const aviso = (t) => salida(`  ${t}`);
  const terminar = () => {
    salida(fallos
      ? `\n✘ ${fallos} fallo(s) de ${total}`
      : `\n✔ todo bien (${total - huecos - cierres} comprobaciones${huecos ? ` y ${huecos} hueco(s) conocido(s): ver docs/WEE-ACEPTACION.md` : ''})`);
    process.exit(fallos ? 1 : 0);
  };
  return { check, hueco, titulo, aviso, terminar };
};

/**
 * Las esperas cortas del proveedor de prueba (600–1100 ms de «pensar») pasan a 0. Solo las menores de dos segundos: los
 * plazos de verdad —minutos— no se tocan, así que un trabajo no puede «vencer» por esto. Devuelve cómo deshacerlo.
 */
export const acelerarLasEsperasCortas = () => {
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...resto) => original(fn, typeof ms === 'number' && ms < 2000 ? 0 : ms, ...resto);
  return () => { globalThis.setTimeout = original; };
};

/**
 * El motor y el creador cuentan lo que hacen con `console.*` (una línea por paso). Aquí se apuntan en vez de pintarse,
 * para que la salida de la suite sea solo la suya, y se pueden consultar (`lineas`): hay pruebas que miran que un error
 * interno se REGISTRA en el servidor aunque no llegue a la persona. Devuelve cómo dejarlo como estaba.
 */
export const apuntarLaConsola = () => {
  const original = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  const lineas = [];
  const apuntar = (nivel) => (...partes) => { lineas.push({ nivel, texto: partes.map((p) => (p instanceof Error ? p.message : String(p))).join(' ') }); };
  console.log = apuntar('log');
  console.info = apuntar('info');
  console.warn = apuntar('warn');
  console.error = apuntar('error');
  return { lineas, restaurar: () => Object.assign(console, original) };
};

/**
 * Los nombres de proveedores y modelos que la persona nunca debe leer (CLAUDE.md: la persona elige el resultado, Weë
 * elige la IA). Sin palabras corrientes del español o del inglés —«imagen», «veo», «runway», «vertex»— que darían falsos
 * positivos en cualquier frase; es la misma disciplina del detector de `design-referencia.mjs`.
 */
export const PROVEEDORES_QUE_NO_SE_LEEN = /\b(gemini|nano ?banana|flux|seedream|seedance|bytedance|byteplus|modelark|elevenlabs|openai|chatgpt|gpt-?\d|deepseek|minimax|anthropic|claude|midjourney|kling|hunyuan|tripo|meshy|mock)\b|fal\.ai/i;
