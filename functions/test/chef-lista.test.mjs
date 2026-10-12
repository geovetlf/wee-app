/*
 * WEË CHEF · LA LISTA DE LA COMPRA, DE LA INSTRUCCIÓN A LA LECTURA (ronda R9, CHF3, 2026-10-12).
 *
 *   node test/chef-lista.test.mjs        (usa el compilado de `functions/lib`: `npm run build` antes)
 *
 * Ata las dos mitades de la lista de compras de Weë Chef que ya existen, cada una por su lado:
 *
 *   · CHEF-01 — la instrucción propia de Chef para `shopping` (`instruccionDe('chef', 'shopping')`, `creator/prompts.ts`),
 *               que reciben los pasos `prices` y `list` del menú por el camino de siempre (`stepInputFor` → `buildTextPrompt`).
 *   · CHEF-04 — `leerLista` (`utils/recetaDeChef.ts`), que leerá esa lista en el dispositivo (CHEF-08, lote 2).
 *
 * Lo que se prueba es lo que se PIDE y lo que se LEE, no lo que un modelo escribe: los textos de lista de abajo están
 * ESCRITOS A MANO y NO son salida real de ningún modelo. La calidad de la lista con un modelo real es NO VERIFICADO
 * (solo un canary autorizado la mide, CHEF-18). Esta suite no llama a ningún proveedor ni escribe en ninguna base.
 *
 *   A. LO QUE PIDE LA INSTRUCCIÓN: secciones, ingredientes repetidos juntos, cantidades con su unidad, sin tope.
 *   B. CÓMO VIAJA: el plan de menú real, `stepInputFor` real, con datos incompletos y en otros idiomas.
 *   C. LA INSTRUCCIÓN Y EL LECTOR HABLAN EL MISMO FORMATO: lo que enseña la instrucción, `leerLista` lo lee.
 *   D. `leerLista` CON LISTAS DE COMPRA: repetidos, cantidades sin unidad, líneas sin cantidad, nada se pierde.
 *
 * Las comprobaciones `HOY` fijan un hueco conocido (está en verde porque pasa lo que pasa hoy): cuando se arregle, se
 * invierten y pasan a `ARREGLADO`, como en `chef-caracterizacion.test.mjs`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearCargador } from './filmmaker-cliente.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const T = (...lineas) => lineas.join('\n');

const { KIND_INSTRUCTIONS, buildTextPrompt, instruccionDe } = lib('creator/prompts.js');
const { TEMPLATES } = lib('creator/templates.js');
const { stepInputFor } = lib('creator/inputs.js');
const { leerLista } = crearCargador()('utils/recetaDeChef.ts');

const INSTRUCCION = instruccionDe('chef', 'shopping') ?? '';

/* ═══ A · LO QUE PIDE LA INSTRUCCIÓN ═════════════════════════════════════════════════════════════════════════ */
console.log('\n── A · Lo que pide la instrucción de Chef para `shopping` ──');

/* El texto que revisa producto, byte a byte: cambiarlo tiene que ser una decisión, no un accidente. */
const TEXTO_EN_REVISION =
  'Escribe la lista de la compra del menú agrupada por secciones del supermercado (frutas y verduras, carnes y pescados, lácteos y huevos, panadería, despensa, congelados, otros), con una línea "SECCIÓN: <nombre>" delante de cada grupo. Junta en una sola línea el mismo ingrediente aunque salga en varias recetas y suma sus cantidades con su unidad. Sin tope de elementos: que no falte nada de lo que hay que comprar. Si la tarea es mirar precios, pon junto a cada línea el precio que encuentres con su fuente y, si no lo encuentras, dilo: nunca inventes un precio.';
check('CONTRATO · el texto de la instrucción es, byte a byte, el que está en revisión de producto (PENDIENTE DE DECISIÓN)',
  INSTRUCCION === TEXTO_EN_REVISION);
check('CHEF-01 · pide agrupar por secciones del supermercado, con la marca «SECCIÓN: <nombre>» delante de cada grupo',
  /agrupada por secciones del supermercado/.test(INSTRUCCION) && /"SECCIÓN: <nombre>" delante de cada grupo/.test(INSTRUCCION));
const SECCIONES_PEDIDAS = (/secciones del supermercado \(([^)]*)\)/.exec(INSTRUCCION)?.[1] ?? '').split(/\s*,\s*/).filter(Boolean);
check('CHEF-01 · nombra siete secciones y la última es «otros» (donde cae lo que no encaja)',
  SECCIONES_PEDIDAS.length === 7 && SECCIONES_PEDIDAS.at(-1) === 'otros', SECCIONES_PEDIDAS.join(' · '));
check('CHEF-01 · consolida: el mismo ingrediente de varias recetas va en UNA línea y sus cantidades se suman',
  /Junta en una sola línea el mismo ingrediente aunque salga en varias recetas/.test(INSTRUCCION) && /suma sus cantidades/.test(INSTRUCCION));
check('CHEF-01 · conserva las unidades: las cantidades se suman «con su unidad»',
  /suma sus cantidades con su unidad/.test(INSTRUCCION));
check('CHEF-01 · sin tope de elementos, y nada de la instrucción de Home («zona del espacio», «6–8», «nivel de gasto»)',
  /Sin tope de elementos/.test(INSTRUCCION) && !/zona del espacio|6–8|nivel de gasto/.test(INSTRUCCION));
check('CHEF-01 · con un dato que falta en precios, lo dice y no lo inventa',
  /si no lo encuentras, dilo/.test(INSTRUCCION) && /nunca inventes un precio/.test(INSTRUCCION));
/* Huecos del texto que NO decide esta suite: se fijan para que producto los vea (informe R9 · CHF, §2). */
check('HOY · OBSERVACIÓN · la instrucción no dice qué hacer si una cantidad no se conoce o si las unidades de un mismo ingrediente no se pueden sumar (200 g + 1 taza)',
  !/no (la|las) (conoces|sabes)|no se pueden sumar|unidades distintas/i.test(INSTRUCCION));
check('HOY · OBSERVACIÓN · la instrucción no fija el orden «cantidad, unidad, ingrediente» que `leerLista` necesita para leer la cantidad',
  !/cantidad delante|empieza(n)? por la cantidad|primero la cantidad/i.test(INSTRUCCION));
check('HOY · OBSERVACIÓN · la instrucción habla «del menú»: CHEF-03a (lista de un solo paso, sin menú) tendrá que revisarla',
  /lista de la compra del menú/.test(INSTRUCCION));

/* ═══ B · CÓMO VIAJA ═════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── B · El camino de siempre: plan de menú real, `stepInputFor` real ──');
{
  const plan = TEMPLATES.chef.buildPlan('Un menú vegetariano', { what: 'menu', people: '4', days: '7' });
  const precios = plan.steps.find((s) => s.id === 'prices');
  const lista = plan.steps.find((s) => s.id === 'list');
  const job = (locale) => ({ experienceId: 'chef', goal: plan.goal, locale });
  const veces = (texto, trozo) => texto.split(trozo).length - 1;
  for (const locale of [undefined, 'es', 'en', 'da']) {
    const deLista = stepInputFor(job(locale), { ...lista, status: 'pending' }, ['(el menú)', '(los precios)']);
    const dePrecios = stepInputFor(job(locale), { ...precios, status: 'pending' }, ['(el menú)']);
    check(`CHEF-01 · ${locale ?? 'sin idioma'} · los pasos \`list\` y \`prices\` del menú llevan la instrucción de Chef UNA vez, con el rol de Weë Chef`,
      veces(String(deLista.prompt), INSTRUCCION) === 1 && veces(String(dePrecios.prompt), INSTRUCCION) === 1
      && /Weë Chef/.test(String(deLista.system)) && precios.capability === 'text.search' && lista.capability === 'text.generate');
  }
  /* Datos incompletos: sin respuestas guiadas (solo «menú»), sin brief, sin material previo, sin idioma. */
  const incompleto = TEMPLATES.chef.buildPlan('menú', { what: 'menu' });
  const listaIncompleta = incompleto.steps.find((s) => s.id === 'list');
  const prompts = [
    stepInputFor({ experienceId: 'chef', goal: incompleto.goal }, { ...listaIncompleta, status: 'pending' }, []).prompt,
    buildTextPrompt('chef', 'shopping', '', 'menú', 'Hacer la lista de compras', []).prompt,
  ].map(String);
  check('CHEF-01 · datos incompletos · sin respuestas, sin brief y sin material previo el prompt sigue llevando la instrucción y no deja huecos («undefined», «null», «NaN», «""»)',
    prompts.every((p) => p.includes(INSTRUCCION) && !/undefined|null|NaN|""/.test(p)) && !prompts[1].includes('Lo que eligió') && !prompts[1].includes('Material de los pasos'),
    prompts[1].split('\n').filter(Boolean).length + ' bloques');
  check('CHEF-01 · datos incompletos · un objetivo vacío no rompe nada: la instrucción va igual y el objetivo sale entre comillas vacío (lo controla el servidor antes)',
    buildTextPrompt('chef', 'shopping', '', '', 'Hacer la lista de compras', []).prompt.includes(INSTRUCCION));
  /* Con otro idioma, el recordatorio final no nombra «SECCIÓN» entre las marcas que se copian: el modelo puede traducirla. */
  const enIngles = String(stepInputFor(job('en'), { ...lista, status: 'pending' }, []).prompt);
  check('HOY · RIESGO · en inglés o danés el recordatorio de idioma no pide copiar «SECCIÓN» tal cual (cambiarlo toca el prompt de todas las experiencias)',
    /IDIOMA DE LA RESPUESTA/.test(enIngles) && /se copian tal cual/.test(enIngles) && !/«SECCIÓN»/.test(enIngles));
  check('CONTRATO · la genérica (la de Home) no cambia y Home la sigue recibiendo',
    instruccionDe('home', 'shopping') === KIND_INSTRUCTIONS.shopping
    && String(buildTextPrompt('home', 'shopping', '', 'Mi sala', 'Lista', []).prompt).includes(KIND_INSTRUCTIONS.shopping));
}

/* ═══ C · EL MISMO FORMATO EN LAS DOS PUNTAS ═════════════════════════════════════════════════════════════════ */
console.log('\n── C · Lo que enseña la instrucción, `leerLista` lo lee ──');
{
  /* Una lista con TODAS las secciones que nombra la instrucción, con la marca exacta que pide. Escrita a mano. */
  const conTodas = SECCIONES_PEDIDAS.map((s, i) => T(`SECCIÓN: ${s[0].toUpperCase()}${s.slice(1)}`, `• ${i + 1} kg de algo ${i}`)).join('\n\n');
  const leida = leerLista(conTodas);
  check('CHEF-01 ↔ CHEF-04 · las siete secciones que pide la instrucción se leen como siete secciones, con su nombre y en su orden',
    leida?.secciones.length === 7 && leida.secciones.every((s, i) => s.nombre.toLowerCase() === SECCIONES_PEDIDAS[i] && s.lineas.length === 1),
    leida?.secciones.map((s) => s.nombre).join(' · '));
  /* La instrucción escribe la marca ENTRE COMILLAS y con el marcador «<nombre>»: un modelo puede copiarla tal cual. */
  const copias = {
    'entre comillas': '"SECCIÓN: Frutas y verduras"',
    'con el marcador <…>': 'SECCIÓN: <Frutas y verduras>',
    'con comillas latinas': 'SECCIÓN: «Frutas y verduras»',
    'comillas solo en el nombre': 'SECCIÓN: "Frutas y verduras"',
  };
  for (const [como, linea] of Object.entries(copias)) {
    const l = leerLista(T(linea, '• 2 limones'));
    check(`CHEF-01 ↔ CHEF-04 · la marca copiada ${como} da el nombre limpio «Frutas y verduras»`,
      l?.secciones.length === 1 && l.secciones[0].nombre === 'Frutas y verduras', JSON.stringify(l?.secciones.map((s) => s.nombre)));
  }
  check('HOY · RIESGO · si el modelo traduce la marca («SECTION: Produce»), la línea se lee como título suelto con la palabra dentro: se ve, pero sucia',
    leerLista(T('SECTION: Produce', '• 2 lemons'))?.secciones[0].nombre === 'SECTION: Produce');
}

/* ═══ D · `leerLista` CON LISTAS DE LA COMPRA ════════════════════════════════════════════════════════════════ */
console.log('\n── D · `leerLista`: repetidos, cantidades sin unidad, datos incompletos (textos escritos a mano, NO salida real) ──');
{
  const LISTA = T(
    '🛒 Lista de la compra para 4 personas',
    '',
    'SECCIÓN: Frutas y verduras',
    '• 6 tomates',
    '• 2 cebollas',
    '• 3 dientes de ajo',
    '• 1/2 kg de calabacín',
    '',
    'SECCIÓN: Lácteos y huevos',
    '• 12 huevos',
    '• 1,5 l de leche',
    '',
    'SECCIÓN: Despensa',
    '• 2 cucharadas de aceite de oliva',
    '• ½ taza de azúcar',
    '• sal al gusto',
    '• arroz',
    '',
    'SECCIÓN: Panadería',
    '- 2 barras de pan',
  );
  const l = leerLista(LISTA);
  const linea = (texto) => l?.secciones.flatMap((s) => s.lineas).find((x) => x.texto === texto);
  check('CHEF-04 · cuatro secciones con su nombre, en su orden; el título va a `otras`, no se tira',
    l?.secciones.map((s) => s.nombre).join('|') === 'Frutas y verduras|Lácteos y huevos|Despensa|Panadería'
    && l.otras?.length === 1 && l.otras[0] === '🛒 Lista de la compra para 4 personas');
  check('CHEF-04 · cantidades SIN unidad (piezas): «6 tomates» → 6 · sin unidad · «tomates»; «3 dientes de ajo» → 3 · «dientes de ajo»',
    linea('6 tomates')?.cantidad === 6 && linea('6 tomates')?.unidad === undefined && linea('6 tomates')?.nombre === 'tomates'
    && linea('3 dientes de ajo')?.cantidad === 3 && linea('3 dientes de ajo')?.nombre === 'dientes de ajo'
    && linea('2 barras de pan')?.cantidad === 2 && linea('2 barras de pan')?.unidad === undefined);
  check('CHEF-04 · cantidades CON unidad, también decimales y fracciones: 1,5 l · ½ taza · 1/2 kg · 2 cucharadas',
    linea('1,5 l de leche')?.cantidad === 1.5 && linea('1,5 l de leche')?.unidad === 'l'
    && linea('½ taza de azúcar')?.cantidad === 0.5 && linea('½ taza de azúcar')?.unidad === 'taza'
    && linea('1/2 kg de calabacín')?.cantidad === 0.5 && linea('1/2 kg de calabacín')?.unidad === 'kg'
    && linea('2 cucharadas de aceite de oliva')?.unidad === 'cucharada');
  check('CHEF-04 · datos incompletos: una línea sin cantidad («arroz», «sal al gusto») se conserva tal cual, sin cantidad inventada',
    linea('arroz') && linea('arroz').cantidad === undefined && linea('sal al gusto') && linea('sal al gusto').cantidad === undefined);
  const todas = LISTA.split('\n').filter((x) => /^[•-] /.test(x)).map((x) => x.slice(2));
  check('CHEF-04 · nada se pierde: cada línea con viñeta aparece, con su texto exacto, en alguna sección',
    todas.every((t) => linea(t)), `${todas.length} líneas`);

  /* Si el modelo NO consolida, `leerLista` no lo arregla por su cuenta: lee las dos líneas. Juntar es de la instrucción. */
  const repetidos = leerLista(T('SECCIÓN: Frutas y verduras', '• 2 tomates', '• 3 tomates', '• 200 g de cebolla', '• 1 cebolla'));
  const rl = repetidos?.secciones[0].lineas ?? [];
  check('CHEF-04 · repetidos: el mismo ingrediente dos veces son dos líneas, cada una con su cantidad (no suma ni descarta; juntar es de la instrucción)',
    rl.length === 4 && rl[0].cantidad === 2 && rl[1].cantidad === 3 && rl[0].nombre === rl[1].nombre
    && rl[2].unidad === 'g' && rl[3].unidad === undefined && rl[2].nombre === rl[3].nombre);
  /* Una línea ya consolidada con la suma escrita no se lee como una cantidad: dos números → fallo cerrado. */
  const suma = leerLista(T('SECCIÓN: Lácteos y huevos', '• 6 + 6 huevos (12 en total)'))?.secciones[0].lineas[0];
  check('CHEF-04 · una suma escrita («6 + 6 huevos (12 en total)») se conserva sin cantidad: no se adivina cuál de los números es',
    suma?.texto === '6 + 6 huevos (12 en total)' && suma.cantidad === undefined);
  const nombreDelante = leerLista(T('SECCIÓN: Frutas y verduras', '• Tomates: 6', '• Cebolla — 200 g'))?.secciones[0].lineas ?? [];
  check('CHEF-04 · con el ingrediente delante («Tomates: 6») la línea se conserva sin cantidad (fallo cerrado; ver la observación de A)',
    nombreDelante.length === 2 && nombreDelante.every((x) => x.cantidad === undefined));
  const conPrecio = leerLista(T('SECCIÓN: Despensa', '• 1 kg de arroz — 1,80 € (fuente: un supermercado)'))?.secciones[0].lineas[0];
  check('CHEF-04 · una línea con precio (salida del paso `prices`) no se lee como cantidad: hay otro número; el texto queda entero',
    conPrecio?.texto === '1 kg de arroz — 1,80 € (fuente: un supermercado)' && conPrecio.cantidad === undefined);
  check('CHEF-04 · secciones vacías no cuentan; una lista sin ninguna línea es `null` (la tarjeta enseña el texto tal cual)',
    leerLista(T('SECCIÓN: Despensa', '', 'SECCIÓN: Otros')) === null
    && leerLista(T('SECCIÓN: Despensa', '', 'SECCIÓN: Otros', '• 1 rollo de papel'))?.secciones.length === 1);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
