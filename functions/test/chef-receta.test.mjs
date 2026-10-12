/*
 * WEË CHEF · LEER Y ESCALAR UNA RECETA (CHEF-04, ronda R8, 2026-10-12).
 *
 *   node test/chef-receta.test.mjs        (no usa `functions/lib`: carga el cliente con el cargador de pruebas)
 *
 * Prueba `utils/recetaDeChef.ts`: tres funciones PURAS del cliente —`leerReceta`, `escalarReceta` y `leerLista`— que
 * todavía no usa ninguna pantalla (las usará `RecetaCard`, CHEF-07, lote 2). Las pruebas salen de
 * `docs/WEE-CHEF-ESPECIFICACION.md` §2.5 (las reglas de escalado, ≈ :255-265) y de AC-15, AC-16 y AC-17 (≈ :425-427).
 *
 * ── Lo que esta suite NO afirma ───────────────────────────────────────────────────────────────────────────────
 *
 *  · Todos los textos de receta de abajo están ESCRITOS A MANO y NO SON SALIDA REAL DEL MODELO. Siguen el formato que el
 *    prompt de receta pide HOY (`functions/src/creator/prompts.ts`, `recipe`), pero qué escribe de verdad un modelo,
 *    con qué cabeceras y con qué unidades, solo lo mide un canary autorizado (CHEF-18). UNO de ellos (`E11`) es el texto
 *    que devuelve el adaptador de PRUEBA (modo demo, `functions/src/gateway/providers/mock.ts`): tampoco es de un modelo.
 *  · Las REGLAS CULINARIAS del escalado —los redondeos, los mínimos, qué se cuenta como «pieza»— siguen siendo `[P]`
 *    (propuesta) y están SIN REVISAR por alguien que cocine: esta suite fija que el código hace lo que la especificación
 *    propone, no que cocinar así salga bien. Su validez culinaria es UNKNOWN.
 *
 * ── Los grupos ────────────────────────────────────────────────────────────────────────────────────────────────
 *
 *  A. LEER (AC-15): título, porciones, tiempo, ingredientes y pasos de los textos de ejemplo.
 *  B. LO INTERNO NO SE ENSEÑA: la línea `IMAGEN:` y las demás marcas de máquina.
 *  C. FALLO CERRADO (AC-17): lo que no se entiende devuelve `null`; entradas raras sin lanzar nada.
 *  D. ESCALAR (AC-16): ×1, 4→6, 4→1, 4→2 con la tabla, lo que no se toca, el factor 0,25–10, sin base.
 *  E. CANTIDADES Y UNIDADES: fracciones, rangos, decimales, unidades, palabras, lo ambiguo y lo que no se adivina.
 *  F. REDONDEOS EN LOS LÍMITES: 10 y 100 en g/ml, el 0,05 de kg/l, el ¼ de cucharadas y tazas, las piezas.
 *  G. LISTA DE COMPRAS: `leerLista` agrupa por «SECCIÓN:».
 *  H. PUREZA: no muta, es determinista, no depende de nada de fuera.
 *  I. UN BARRIDO DETERMINISTA DE TEXTOS ROTOS: nunca lanza y todo lo que devuelve cumple el contrato.
 *
 * Cada detector lleva su CONTROL, y fuera de la suite se ha hecho un sabotaje (otro redondeo) para comprobar que alguna
 * comprobación cae (`docs/WEE-CHEF-TAREAS-LOTE-1.md`, CHEF-04).
 */
import assert from 'node:assert/strict';
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Igualdad profunda y estricta (distingue `{a: undefined}` de `{}`): la salida del módulo no deja claves vacías. */
const igual = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch { return false; } };
const diferencia = (a, b) => { try { assert.deepStrictEqual(a, b); return ''; } catch (e) { return String(e.message).replace(/\s+/g, ' ').slice(0, 260); } };
const checkIgual = (name, real, esperado, extra = '') => {
  const ok = igual(real, esperado);
  check(name, ok, ok ? extra : diferencia(real, esperado));
};
const lanza = (fn) => { try { fn(); return null; } catch (e) { return e; } };
const congelar = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) congelar(v); }
  return o;
};
const clon = (x) => JSON.parse(JSON.stringify(x));
const T = (...lineas) => lineas.join('\n');

/* ── Se carga el módulo de verdad (TS → CJS al vuelo, con sus imports relativos) ─────────────────────────────── */
const cargar = crearCargador();
let M;
try {
  M = cargar('utils/recetaDeChef.ts');
} catch (e) {
  check('el módulo utils/recetaDeChef.ts existe y se carga', false, String(e.message).slice(0, 200));
  console.log('\n✘ no hay nada que probar todavía (el rojo de CHEF-04: las funciones no existen)');
  process.exit(1);
}
const { leerReceta, escalarReceta, leerLista, factorDeEscala, pideRevisarTiempos } = M;
check('el módulo exporta leerReceta, escalarReceta, leerLista, factorDeEscala y pideRevisarTiempos',
  [leerReceta, escalarReceta, leerLista, factorDeEscala, pideRevisarTiempos].every((f) => typeof f === 'function'),
  Object.keys(M).sort().join(', '));

const ROTULO = 'texto de ejemplo escrito a mano: NO es salida real del modelo';

/* ═══ A · LEER ═════════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── A · leerReceta: los textos de ejemplo (todos escritos a mano; NO son salida real del modelo) ──');

const ZWJ_COCINERO = '\u{1F468}\u{200D}\u{1F373}';

const EJEMPLOS = [
  {
    id: 'E1', cual: 'con emoji y «Para 4 personas · 45 minutos», cabeceras, consejo e IMAGEN',
    texto: T(
      '🍝 Pasta cremosa de champiñones',
      'Para 4 personas · 45 minutos',
      '',
      'Ingredientes:',
      '• 400 g de pasta',
      '• 250 g de champiñones',
      '• 200 ml de nata para cocinar',
      '• 2 dientes de ajo',
      '• 1 cucharada de aceite de oliva',
      '• Sal y pimienta al gusto',
      '',
      'Pasos:',
      '1. Hierve la pasta en agua con sal.',
      '2. Saltea el ajo y los champiñones.',
      '3. Añade la nata y cocina 5 minutos.',
      '4. Mezcla con la pasta y sirve.',
      '',
      'Consejo: guarda un poco del agua de cocción para ligar la salsa.',
      'IMAGEN: creamy mushroom pasta in a white bowl, soft side light',
    ),
    esperado: {
      titulo: 'Pasta cremosa de champiñones', emoji: '🍝', porciones: 4, minutos: 45,
      ingredientes: [
        { texto: '400 g de pasta', cantidad: 400, unidad: 'g', nombre: 'pasta' },
        { texto: '250 g de champiñones', cantidad: 250, unidad: 'g', nombre: 'champiñones' },
        { texto: '200 ml de nata para cocinar', cantidad: 200, unidad: 'ml', nombre: 'nata para cocinar' },
        { texto: '2 dientes de ajo', cantidad: 2, nombre: 'dientes de ajo' },
        { texto: '1 cucharada de aceite de oliva', cantidad: 1, unidad: 'cucharada', nombre: 'aceite de oliva' },
        { texto: 'Sal y pimienta al gusto' },
      ],
      pasos: ['Hierve la pasta en agua con sal.', 'Saltea el ajo y los champiñones.', 'Añade la nata y cocina 5 minutos.', 'Mezcla con la pasta y sirve.'],
      consejo: 'guarda un poco del agua de cocción para ligar la salsa.',
    },
  },
  {
    id: 'E2', cual: 'sin tiempo (solo «Para 6 personas») y con «Preparación:»',
    texto: T(
      '🥔 Tortilla de patatas',
      'Para 6 personas',
      '',
      'Ingredientes:',
      '• 6 huevos',
      '• 1 kg de patatas',
      '• 1 cebolla',
      '• 150 ml de aceite de oliva',
      '• Sal',
      '',
      'Preparación:',
      '1. Pela y corta las patatas en láminas finas.',
      '2. Fríelas a fuego suave con la cebolla.',
      '3. Bate los huevos, mézclalos con las patatas y cuaja la tortilla.',
    ),
    esperado: {
      titulo: 'Tortilla de patatas', emoji: '🥔', porciones: 6,
      ingredientes: [
        { texto: '6 huevos', cantidad: 6, nombre: 'huevos' },
        { texto: '1 kg de patatas', cantidad: 1, unidad: 'kg', nombre: 'patatas' },
        { texto: '1 cebolla', cantidad: 1, nombre: 'cebolla' },
        { texto: '150 ml de aceite de oliva', cantidad: 150, unidad: 'ml', nombre: 'aceite de oliva' },
        { texto: 'Sal' },
      ],
      pasos: ['Pela y corta las patatas en láminas finas.', 'Fríelas a fuego suave con la cebolla.', 'Bate los huevos, mézclalos con las patatas y cuaja la tortilla.'],
    },
  },
  {
    id: 'E3', cual: 'sin porciones (solo «Tiempo total: 10 minutos»), sin cabeceras: viñetas y números',
    texto: T(
      '🍋 Limonada casera',
      'Tiempo total: 10 minutos',
      '',
      '• 6 limones',
      '• 1 l de agua fría',
      '• 100 g de azúcar',
      '• Hielo',
      '',
      '1. Exprime los limones.',
      '2. Mezcla con el azúcar y el agua.',
      '3. Sirve con hielo.',
    ),
    esperado: {
      titulo: 'Limonada casera', emoji: '🍋', minutos: 10,
      ingredientes: [
        { texto: '6 limones', cantidad: 6, nombre: 'limones' },
        { texto: '1 l de agua fría', cantidad: 1, unidad: 'l', nombre: 'agua fría' },
        { texto: '100 g de azúcar', cantidad: 100, unidad: 'g', nombre: 'azúcar' },
        { texto: 'Hielo' },
      ],
      pasos: ['Exprime los limones.', 'Mezcla con el azúcar y el agua.', 'Sirve con hielo.'],
    },
  },
  {
    id: 'E4', cual: 'con «½ taza», «1 1/2», «1½», «Rinde 4 porciones», cabeceras sin dos puntos y numeración «1)»',
    texto: T(
      '🥞 Panqueques esponjosos',
      'Rinde 4 porciones · 25 minutos',
      '',
      'Ingredientes',
      '• 1 1/2 tazas de harina',
      '• ½ taza de leche',
      '• 1½ cucharaditas de polvo de hornear',
      '• 2 huevos',
      '• 1 pizca de sal',
      '• Mantequilla para la sartén',
      '',
      'Pasos',
      '1) Mezcla los ingredientes secos.',
      '2) Añade la leche y los huevos.',
      '3) Cocina cada panqueque 2 minutos por lado.',
    ),
    esperado: {
      titulo: 'Panqueques esponjosos', emoji: '🥞', porciones: 4, minutos: 25,
      ingredientes: [
        { texto: '1 1/2 tazas de harina', cantidad: 1.5, unidad: 'taza', nombre: 'harina' },
        { texto: '½ taza de leche', cantidad: 0.5, unidad: 'taza', nombre: 'leche' },
        { texto: '1½ cucharaditas de polvo de hornear', cantidad: 1.5, unidad: 'cucharadita', nombre: 'polvo de hornear' },
        { texto: '2 huevos', cantidad: 2, nombre: 'huevos' },
        { texto: '1 pizca de sal', cantidad: 1, unidad: 'pizca', nombre: 'sal' },
        { texto: 'Mantequilla para la sartén' },
      ],
      pasos: ['Mezcla los ingredientes secos.', 'Añade la leche y los huevos.', 'Cocina cada panqueque 2 minutos por lado.'],
    },
  },
  {
    id: 'E5', cual: 'con «2–3», «1 h 15 min», viñetas «-» y una línea con OTRA cantidad dentro («de 1,5 kg»)',
    texto: T(
      '🍗 Pollo al horno con limón',
      'Para 4 personas · 1 h 15 min',
      '',
      'Ingredientes:',
      '- 1 pollo entero de 1,5 kg',
      '- 2–3 dientes de ajo',
      '- 2 limones',
      '- 3 cucharadas de aceite de oliva',
      '- 200 ml de caldo de pollo',
      '- Tomillo y romero al gusto',
      '',
      'Preparación:',
      '1. Precalienta el horno a 200 °C.',
      '2. Unta el pollo con aceite, ajo y limón.',
      '3. Hornea 1 hora y 15 minutos en un molde de 30 cm.',
    ),
    esperado: {
      titulo: 'Pollo al horno con limón', emoji: '🍗', porciones: 4, minutos: 75,
      ingredientes: [
        { texto: '1 pollo entero de 1,5 kg' },
        { texto: '2–3 dientes de ajo', cantidad: 2, hasta: 3, nombre: 'dientes de ajo' },
        { texto: '2 limones', cantidad: 2, nombre: 'limones' },
        { texto: '3 cucharadas de aceite de oliva', cantidad: 3, unidad: 'cucharada', nombre: 'aceite de oliva' },
        { texto: '200 ml de caldo de pollo', cantidad: 200, unidad: 'ml', nombre: 'caldo de pollo' },
        { texto: 'Tomillo y romero al gusto' },
      ],
      pasos: ['Precalienta el horno a 200 °C.', 'Unta el pollo con aceite, ajo y limón.', 'Hornea 1 hora y 15 minutos en un molde de 30 cm.'],
    },
  },
  {
    id: 'E6', cual: 'con «al gusto», «un chorrito» y «una pizca», y «1/2» escrito con barra',
    texto: T(
      '🥗 Ensalada fresca de tomate',
      'Para 2 personas · 10 minutos',
      '',
      'Ingredientes:',
      '• 4 tomates maduros',
      '• 1/2 cebolla morada',
      '• 2 cucharadas de aceite de oliva',
      '• Un chorrito de limón',
      '• Una pizca de orégano',
      '• Sal al gusto',
      '',
      'Pasos:',
      '1. Corta los tomates y la cebolla.',
      '2. Aliña con el aceite y el limón.',
      '3. Sazona y sirve.',
    ),
    esperado: {
      titulo: 'Ensalada fresca de tomate', emoji: '🥗', porciones: 2, minutos: 10,
      ingredientes: [
        { texto: '4 tomates maduros', cantidad: 4, nombre: 'tomates maduros' },
        { texto: '1/2 cebolla morada', cantidad: 0.5, nombre: 'cebolla morada' },
        { texto: '2 cucharadas de aceite de oliva', cantidad: 2, unidad: 'cucharada', nombre: 'aceite de oliva' },
        { texto: 'Un chorrito de limón' },
        { texto: 'Una pizca de orégano', cantidad: 1, unidad: 'pizca', nombre: 'orégano' },
        { texto: 'Sal al gusto' },
      ],
      pasos: ['Corta los tomates y la cebolla.', 'Aliña con el aceite y el limón.', 'Sazona y sirve.'],
    },
  },
  {
    id: 'E7', cual: 'con pasos de dos dígitos («10.», «11.») y «3 horas»',
    texto: T(
      '🍞 Pan casero sencillo',
      'Para 8 personas · 3 horas',
      '',
      'Ingredientes:',
      '• 500 g de harina de trigo',
      '• 10 g de sal',
      '• 7 g de levadura seca',
      '• 350 ml de agua tibia',
      '',
      'Pasos:',
      '1. Mezcla la harina con la sal.',
      '2. Disuelve la levadura en el agua.',
      '3. Une todo y amasa 10 minutos.',
      '4. Forma una bola.',
      '5. Déjala reposar 1 hora.',
      '6. Desgasifica la masa.',
      '7. Dale forma de barra.',
      '8. Déjala reposar otra hora.',
      '9. Precalienta el horno a 230 °C.',
      '10. Hornea 35 minutos.',
      '11. Deja enfriar sobre una rejilla.',
    ),
    esperado: {
      titulo: 'Pan casero sencillo', emoji: '🍞', porciones: 8, minutos: 180,
      ingredientes: [
        { texto: '500 g de harina de trigo', cantidad: 500, unidad: 'g', nombre: 'harina de trigo' },
        { texto: '10 g de sal', cantidad: 10, unidad: 'g', nombre: 'sal' },
        { texto: '7 g de levadura seca', cantidad: 7, unidad: 'g', nombre: 'levadura seca' },
        { texto: '350 ml de agua tibia', cantidad: 350, unidad: 'ml', nombre: 'agua tibia' },
      ],
      pasos: [
        'Mezcla la harina con la sal.', 'Disuelve la levadura en el agua.', 'Une todo y amasa 10 minutos.', 'Forma una bola.',
        'Déjala reposar 1 hora.', 'Desgasifica la masa.', 'Dale forma de barra.', 'Déjala reposar otra hora.',
        'Precalienta el horno a 230 °C.', 'Hornea 35 minutos.', 'Deja enfriar sobre una rejilla.',
      ],
    },
  },
  {
    id: 'E8', cual: 'con INGREDIENTES:, PASOS: y CONSEJO: en mayúsculas pegados (el formato que pedirá CHEF-07) y IMAGEN:',
    texto: T(
      '🍲 Lentejas estofadas',
      'Para 4 personas · 50 minutos',
      'INGREDIENTES:',
      '• 300 g de lentejas',
      '• 1 zanahoria',
      '• 2 cucharadas de aceite',
      'PASOS:',
      '1. Sofríe la verdura.',
      '2. Añade las lentejas y el agua.',
      'CONSEJO: déjalas reposar diez minutos antes de servir.',
      'IMAGEN: a rustic bowl of lentil stew',
    ),
    esperado: {
      titulo: 'Lentejas estofadas', emoji: '🍲', porciones: 4, minutos: 50,
      ingredientes: [
        { texto: '300 g de lentejas', cantidad: 300, unidad: 'g', nombre: 'lentejas' },
        { texto: '1 zanahoria', cantidad: 1, nombre: 'zanahoria' },
        { texto: '2 cucharadas de aceite', cantidad: 2, unidad: 'cucharada', nombre: 'aceite' },
      ],
      pasos: ['Sofríe la verdura.', 'Añade las lentejas y el agua.'],
      consejo: 'déjalas reposar diez minutos antes de servir.',
    },
  },
  {
    id: 'E9', cual: 'con la línea «- IMAGEN:» entre los ingredientes y los pasos, y «Para 1 persona»',
    texto: T(
      '🥑 Tostada de aguacate',
      'Para 1 persona · 5 minutos',
      '• 1 rebanada de pan',
      '• ½ aguacate',
      '- IMAGEN: avocado toast on a wooden board',
      '1. Tuesta el pan.',
      '2. Aplasta el aguacate y unta.',
    ),
    esperado: {
      titulo: 'Tostada de aguacate', emoji: '🥑', porciones: 1, minutos: 5,
      ingredientes: [
        { texto: '1 rebanada de pan', cantidad: 1, nombre: 'rebanada de pan' },
        { texto: '½ aguacate', cantidad: 0.5, nombre: 'aguacate' },
      ],
      pasos: ['Tuesta el pan.', 'Aplasta el aguacate y unta.'],
    },
  },
  {
    id: 'E10', cual: 'con viñetas «-», «•» y «*» mezcladas, «Paso 1:», «3)» y «4.»',
    texto: T(
      '🍳 Huevos revueltos con tomate',
      'Para 2 personas · 10 minutos',
      '',
      'Ingredientes',
      '- 4 huevos',
      '• 2 tomates maduros',
      '* 1 cucharada de aceite',
      '',
      'Paso 1: Calienta el aceite.',
      'Paso 2: Añade el tomate picado.',
      '3) Incorpora los huevos batidos.',
      '4. Remueve hasta cuajar.',
    ),
    esperado: {
      titulo: 'Huevos revueltos con tomate', emoji: '🍳', porciones: 2, minutos: 10,
      ingredientes: [
        { texto: '4 huevos', cantidad: 4, nombre: 'huevos' },
        { texto: '2 tomates maduros', cantidad: 2, nombre: 'tomates maduros' },
        { texto: '1 cucharada de aceite', cantidad: 1, unidad: 'cucharada', nombre: 'aceite' },
      ],
      pasos: ['Calienta el aceite.', 'Añade el tomate picado.', 'Incorpora los huevos batidos.', 'Remueve hasta cuajar.'],
    },
  },
  {
    id: 'E11', cual: 'el texto del ADAPTADOR DE PRUEBA (modo demo; copiado de gateway/providers/mock.ts): «Ingredientes (2 personas):», «Paso a paso:» y la nota final',
    texto: T(
      '🍽️ Algo rico para comer hoy',
      '',
      'Ingredientes (2 personas):',
      '• 2 tazas del ingrediente principal',
      '• 1 cebolla, 2 dientes de ajo',
      '• Aceite de oliva, sal y pimienta',
      '• Hierbas frescas para terminar',
      '',
      'Paso a paso:',
      '1. Sofríe la cebolla y el ajo 3 minutos.',
      '2. Agrega el ingrediente principal y cocina a fuego medio.',
      '3. Ajusta sal y pimienta; termina con las hierbas.',
      '4. Sirve caliente. Listo en unos 25 minutos.',
      '',
      'Resultado de muestra (modo demo). Cuando esta experiencia esté conectada a sus IA, aquí verás el contenido real, en tu tono y listo para usar.',
    ),
    esperado: {
      titulo: 'Algo rico para comer hoy', emoji: '🍽️', porciones: 2,
      ingredientes: [
        { texto: '2 tazas del ingrediente principal', cantidad: 2, unidad: 'taza', nombre: 'ingrediente principal' },
        { texto: '1 cebolla, 2 dientes de ajo' },
        { texto: 'Aceite de oliva, sal y pimienta' },
        { texto: 'Hierbas frescas para terminar' },
      ],
      pasos: [
        'Sofríe la cebolla y el ajo 3 minutos.', 'Agrega el ingrediente principal y cocina a fuego medio.',
        'Ajusta sal y pimienta; termina con las hierbas.', 'Sirve caliente. Listo en unos 25 minutos.',
      ],
      otras: ['Resultado de muestra (modo demo). Cuando esta experiencia esté conectada a sus IA, aquí verás el contenido real, en tu tono y listo para usar.'],
    },
  },
  {
    id: 'E12', cual: 'con markdown («##», «**») y saltos de línea de Windows (CRLF)',
    texto: T(
      '## 🍕 Pizza margarita',
      '**Para 4 personas** · **30 minutos**',
      '',
      '**Ingredientes:**',
      '- 300 g de harina',
      '- 200 ml de agua',
      '- 150 g de mozzarella',
      '',
      '**Preparación:**',
      '1. Amasa la harina con el agua.',
      '2. Cubre con mozzarella y hornea.',
    ).replace(/\n/g, '\r\n'),
    esperado: {
      titulo: 'Pizza margarita', emoji: '🍕', porciones: 4, minutos: 30,
      ingredientes: [
        { texto: '300 g de harina', cantidad: 300, unidad: 'g', nombre: 'harina' },
        { texto: '200 ml de agua', cantidad: 200, unidad: 'ml', nombre: 'agua' },
        { texto: '150 g de mozzarella', cantidad: 150, unidad: 'g', nombre: 'mozzarella' },
      ],
      pasos: ['Amasa la harina con el agua.', 'Cubre con mozzarella y hornea.'],
    },
  },
  {
    id: 'E13', cual: 'con una frase de cortesía antes (acaba en «:»: no es el título) y un emoji compuesto (cocinero)',
    texto: T(
      '¡Claro! Aquí tienes una receta para ti:',
      '',
      `${ZWJ_COCINERO} Risotto de setas`,
      'Para 4 personas · 40 minutos',
      '',
      'Ingredientes:',
      '• 300 g de arroz arborio',
      '• 250 g de setas variadas',
      '• 1 l de caldo de verduras',
      '',
      'Pasos:',
      '1. Sofríe las setas.',
      '2. Añade el arroz y el caldo poco a poco.',
    ),
    esperado: {
      titulo: 'Risotto de setas', emoji: ZWJ_COCINERO, porciones: 4, minutos: 40,
      ingredientes: [
        { texto: '300 g de arroz arborio', cantidad: 300, unidad: 'g', nombre: 'arroz arborio' },
        { texto: '250 g de setas variadas', cantidad: 250, unidad: 'g', nombre: 'setas variadas' },
        { texto: '1 l de caldo de verduras', cantidad: 1, unidad: 'l', nombre: 'caldo de verduras' },
      ],
      pasos: ['Sofríe las setas.', 'Añade el arroz y el caldo poco a poco.'],
      otras: ['¡Claro! Aquí tienes una receta para ti:'],
    },
  },
  {
    id: 'E14', cual: 'con «Consejo:» solo en su línea y el texto en la siguiente, y «para dos personas» con palabras',
    texto: T(
      '🥣 Gachas de avena',
      'Para dos personas · 10 minutos',
      '',
      'Ingredientes:',
      '• 100 g de copos de avena',
      '• 400 ml de leche',
      '',
      'Pasos:',
      '1. Calienta la leche.',
      '2. Añade la avena y remueve.',
      '',
      'Consejo:',
      'Añade canela o fruta fresca al final.',
    ),
    esperado: {
      titulo: 'Gachas de avena', emoji: '🥣', porciones: 2, minutos: 10,
      ingredientes: [
        { texto: '100 g de copos de avena', cantidad: 100, unidad: 'g', nombre: 'copos de avena' },
        { texto: '400 ml de leche', cantidad: 400, unidad: 'ml', nombre: 'leche' },
      ],
      pasos: ['Calienta la leche.', 'Añade la avena y remueve.'],
      consejo: 'Añade canela o fruta fresca al final.',
    },
  },
  {
    id: 'E15', cual: 'sin emoji en el título, con «Porciones: 4», «Tiempo: 1,5 horas» y los pasos con viñetas bajo «Pasos:»',
    texto: T(
      'Estofado de ternera',
      'Porciones: 4 | Tiempo: 1,5 horas',
      '',
      'Ingredientes:',
      '• 600 g de ternera en cubos',
      '• 2 zanahorias',
      '• 1 cebolla',
      '',
      'Pasos:',
      '- Dora la carne.',
      '- Añade la verdura y cubre con agua.',
      '- Cocina a fuego lento.',
    ),
    esperado: {
      titulo: 'Estofado de ternera', porciones: 4, minutos: 90,
      ingredientes: [
        { texto: '600 g de ternera en cubos', cantidad: 600, unidad: 'g', nombre: 'ternera en cubos' },
        { texto: '2 zanahorias', cantidad: 2, nombre: 'zanahorias' },
        { texto: '1 cebolla', cantidad: 1, nombre: 'cebolla' },
      ],
      pasos: ['Dora la carne.', 'Añade la verdura y cubre con agua.', 'Cocina a fuego lento.'],
    },
  },
];

let leidosBien = 0;
for (const e of EJEMPLOS) {
  const real = leerReceta(e.texto);
  const ok = igual(real, e.esperado);
  if (ok) leidosBien++;
  check(`AC-15 · ${e.id} · leerReceta ${e.cual}`, ok, ok ? ROTULO : diferencia(real, e.esperado));
}
check(`AC-15 · leerReceta: título, porciones, tiempo, ingredientes y pasos de los ${EJEMPLOS.length} textos de ejemplo (≥ 10)`,
  EJEMPLOS.length >= 10 && leidosBien === EJEMPLOS.length, `${leidosBien}/${EJEMPLOS.length} · ${ROTULO}`);

{
  /* Ningún campo opcional sobra: lo que el texto no dice no se inventa. */
  const e3 = leerReceta(EJEMPLOS.find((e) => e.id === 'E3').texto);
  const e2 = leerReceta(EJEMPLOS.find((e) => e.id === 'E2').texto);
  const e15 = leerReceta(EJEMPLOS.find((e) => e.id === 'E15').texto);
  check('lo que el texto no dice no se inventa: sin porciones no hay `porciones`; sin tiempo, no hay `minutos`; sin emoji, no hay `emoji`',
    e3.porciones === undefined && !('porciones' in e3) && e2.minutos === undefined && !('minutos' in e2) && e15.emoji === undefined && !('emoji' in e15) && !('consejo' in e2) && !('otras' in e2));
}

/* ── A2 · Las porciones y el tiempo, en todas sus formas (y lo que NO se toma por ellos) ─────────────────────── */
console.log('\n── A2 · Porciones y tiempo: lo que se lee, lo que no se adivina y lo que no se pierde ──');
{
  /* Una receta mínima con UNA línea de datos tras el título: [porciones, minutos, otras]. */
  const con = (...lineas) => leerReceta(T('🍲 Guiso', ...lineas, 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Mezcla.'));
  const datos = (r) => (r ? [r.porciones, r.minutos, r.otras] : 'NULL');
  const PORCIONES = [
    ['Para 4 personas', 4], ['para 4 personas', 4], ['Para dos personas', 2], ['Para ocho personas', 8], ['Para una persona', 1], ['4 porciones', 4],
    ['8 raciones', 8], ['Rinde 6 porciones', 6], ['Rinde: 6', 6], ['Porciones: 4', 4], ['Personas: 2', 2], ['Comensales: 3', 3], ['Sirve a 4 personas', 4],
    ['Para 12 personas', 12], ['👥 4 personas', 4], ['**Para 4 personas**', 4],
  ];
  for (const [linea, esperado] of PORCIONES) check(`porciones · «${linea}» → ${esperado}`, igual(datos(con(linea)), [esperado, undefined, undefined]), JSON.stringify(datos(con(linea))));
  const TIEMPOS = [
    ['45 minutos', 45], ['45 min', 45], ['Tiempo total: 45 minutos', 45], ['Tiempo: 30 min', 30], ['Duración: 20 minutos', 20], ['Listo en 20 minutos', 20], ['Total: 5 minutos', 5],
    ['2 horas', 120], ['2 h', 120], ['1h30', 90], ['1 h 15 min', 75], ['1 hora y 15 minutos', 75], ['1,5 horas', 90], ['1.5 h', 90], ['media hora', 30], ['una hora', 60],
    ['hora y media', 90], ['2 horas y media', 150], ['una hora y media', 90], ['⏱️ 45 min', 45], ['90 min', 90],
  ];
  for (const [linea, esperado] of TIEMPOS) check(`tiempo · «${linea}» → ${esperado} min`, igual(datos(con(linea)), [undefined, esperado, undefined]), JSON.stringify(datos(con(linea))));

  const JUNTOS = [
    ['Para 4 personas · 45 minutos', [4, 45]], ['Para 4 personas | 45 min', [4, 45]], ['Para 4 personas, 45 minutos', [4, 45]], ['Para 4 personas - 45 minutos', [4, 45]],
    ['Para 4 personas. Tiempo total: 45 minutos.', [4, 45]], ['⏱️ 45 min · 👥 4 personas', [4, 45]], ['Tiempo: 1,5 horas; Porciones: 6', [6, 90]],
  ];
  for (const [linea, [p, m]] of JUNTOS) check(`porciones y tiempo en una línea · «${linea}»`, igual(datos(con(linea)), [p, m, undefined]), JSON.stringify(datos(con(linea))));
  check('…y en dos líneas: «Para 4 personas» y «Tiempo total: 45 minutos»', igual(datos(con('Para 4 personas', 'Tiempo total: 45 minutos')), [4, 45, undefined]));

  /* Lo que no está claro NO se elige, y tampoco se pierde: la línea va a `otras`. */
  const NO_CLARO = [
    ['Para 4-6 personas', 'un rango de porciones'], ['Para 4 a 6 personas', 'un rango de porciones'], ['Tiempo: 30-40 minutos', 'un rango de tiempo'],
    ['Tiempo de preparación: 15 minutos', 'solo la preparación, no el total'], ['Tiempo de cocción: 30 minutos', 'solo la cocción, no el total'],
    ['Preparación: 10 min', 'solo la preparación'], ['Reposo: 1 hora', 'solo el reposo'],
  ];
  for (const [linea, porque] of NO_CLARO) {
    const d = datos(con(linea));
    check(`no se elige entre dos: «${linea}» (${porque}) no da porciones ni tiempo y la línea se conserva en \`otras\``,
      Array.isArray(d) && d[0] === undefined && d[1] === undefined && Array.isArray(d[2]) && d[2].length === 1, JSON.stringify(d));
  }
  check('el tiempo parcial no se suma: preparación 15 + cocción 30 no inventa «45 minutos»',
    igual(datos(con('Tiempo de preparación: 15 minutos', 'Tiempo de cocción: 30 minutos')), [undefined, undefined, ['Tiempo de preparación: 15 minutos', 'Tiempo de cocción: 30 minutos']]));
  check('lo que acompaña a las porciones y no es ni porciones ni tiempo se conserva: «Dificultad: Fácil · Para 4 personas» → 4 y «Dificultad: Fácil» en `otras`',
    igual(datos(con('Dificultad: Fácil · Para 4 personas')), [4, undefined, ['Dificultad: Fácil']]));
  check('si el texto dice dos veces las porciones y no coinciden, manda la primera y la segunda línea no se pierde',
    igual(datos(con('Para 4 personas', 'Rinde 6 porciones')), [4, undefined, ['Rinde 6 porciones']]));
  check('si las dice dos veces igual, no se duplica nada', igual(datos(con('Para 4 personas', 'Rinde 4 porciones')), [4, undefined, undefined]));
  check('«Para 100 personas», «Para 0 personas» y «Para 4,5 personas» no son porciones que se lean',
    ['Para 100 personas', 'Para 0 personas', 'Para 4,5 personas'].every((l) => { const d = datos(con(l)); return Array.isArray(d) && d[0] === undefined; }));
  check('un tiempo de 0 minutos o de más de tres días no se lee', ['0 minutos', '5000 minutos', '100 horas'].every((l) => { const d = datos(con(l)); return Array.isArray(d) && d[1] === undefined; }));

  /* La cabecera de ingredientes puede traer las porciones. */
  const cab = (encabezado) => leerReceta(T('🍲 Guiso', encabezado, '• 2 huevos', 'Pasos:', '1. Mezcla.'));
  for (const [e, p] of [['Ingredientes (4 personas):', 4], ['Ingredientes (para 6 personas)', 6], ['Ingredientes para 4 personas:', 4], ['**Ingredientes** (2 porciones):', 2], ['Ingredientes [8 raciones]', 8]]) {
    check(`cabecera con porciones · «${e}» → ${p}`, cab(e) !== null && cab(e).porciones === p && !('otras' in cab(e)), JSON.stringify(cab(e)));
  }
  check('una frase que EMPIEZA con «Ingredientes» pero no es una cabecera no abre la lista de ingredientes: «Ingredientes frescos y de temporada»',
    (() => { const r = leerReceta(T('🍲 Guiso', 'Ingredientes frescos y de temporada', '• 2 huevos', 'Pasos:', '1. Mezcla.')); return r !== null && igual(r.otras, ['Ingredientes frescos y de temporada']) && r.ingredientes.length === 1; })());
  check('«Paso a paso», «Preparación», «Elaboración», «Instrucciones» y «Modo de preparación» abren los pasos (y «Pasos a seguir» no)',
    ['Paso a paso:', 'Preparación:', 'Elaboración', 'Instrucciones:', 'Modo de preparación:', 'Procedimiento:'].every((e) => {
      const r = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', e, '- Mezcla.', '- Sirve.'));
      return r !== null && igual(r.pasos, ['Mezcla.', 'Sirve.']);
    }) && (() => { const r = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos a seguir', '1. Mezcla.')); return r !== null && igual(r.otras, ['Pasos a seguir']); })());
}

/* ── A3 · La estructura: dónde va cada línea ──────────────────────────────────────────────────────────────── */
console.log('\n── A3 · La estructura: cabeceras, viñetas bajo «Pasos:», notas y consejos ──');
{
  const r1 = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos:', '- Bate.', '• Cuaja.', '* Sirve.'));
  check('bajo «Pasos:» las viñetas son pasos (con «-», «•» y «*»)', r1 !== null && igual(r1.pasos, ['Bate.', 'Cuaja.', 'Sirve.']) && r1.ingredientes.length === 1);
  const r2 = leerReceta(T('🍲 Guiso', '• 2 huevos', '1. Bate.', '2. Cuaja.', '• Una nota suelta tras los pasos'));
  check('sin cabeceras, una viñeta DESPUÉS de los pasos no es un ingrediente: va a `otras`', r2 !== null && r2.ingredientes.length === 1 && igual(r2.otras, ['Una nota suelta tras los pasos']));
  const r3 = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.', 'Consejos:', '• Usa huevos del día.', '• No batas de más.'));
  check('bajo «Consejos:» las viñetas se unen al consejo (no son ingredientes ni pasos)', r3 !== null && r3.consejo === 'Usa huevos del día. No batas de más.' && r3.pasos.length === 1 && r3.ingredientes.length === 1, r3 ? JSON.stringify(r3.consejo) : 'null');
  const r4 = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', '400 g de harina', 'Sal y pimienta', 'Para la salsa:', '• 1 tomate', 'Pasos:', '1. Bate.'));
  check('bajo la cabecera, una línea SIN viñeta que empieza con una cantidad también es ingrediente; las que no («Sal y pimienta», «Para la salsa:») van a `otras`',
    r4 !== null && igual(r4.ingredientes.map((x) => x.texto), ['2 huevos', '400 g de harina', '1 tomate']) && igual(r4.otras, ['Sal y pimienta', 'Para la salsa:']), r4 ? JSON.stringify(r4.otras) : 'null');
  const r5 = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', '1. Bate.', 'Aquí termina la receta.', '¡Buen provecho!'));
  check('lo que no es nada va a `otras`, en su orden y tal cual (no se pierde ni se inventa)', r5 !== null && igual(r5.otras, ['Aquí termina la receta.', '¡Buen provecho!']));
  const r6 = leerReceta(T('🍲 Guiso', 'Ingredientes:', '1. Bate.'));
  check('un número bajo «Ingredientes:» abre los pasos; sin ingredientes, null', r6 === null);
  const r7 = leerReceta(T('Guiso', '', '🍲', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.'));
  check('una línea que es solo un emoji no es el título ni la inventa de emoji: el título es la línea con letras', r7 !== null && r7.titulo === 'Guiso' && !('emoji' in r7) && igual(r7.otras, ['🍲']));
  const r8 = leerReceta(T('🍲🍅 Guiso doble', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.'));
  check('varios emojis juntos delante del título se guardan juntos', r8 !== null && r8.emoji === '🍲🍅' && r8.titulo === 'Guiso doble');
  const largoDelTitulo = 'x'.repeat(121);
  const r9 = leerReceta(T(largoDelTitulo, 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.'));
  check('un «título» de más de 120 caracteres no es un título: sin título, null', r9 === null);
  const r9b = leerReceta(T('x'.repeat(120), 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.'));
  check('CONTROL · uno de exactamente 120 caracteres sí lo es', r9b !== null && r9b.titulo.length === 120);
  const rc1 = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.', 'Consejo:', '', 'Lo que viene tras una línea en blanco no es el consejo.'));
  check('«Consejo:» solo en su línea y el texto tras una línea EN BLANCO: no se une (no se adivina) y el texto se conserva en `otras`',
    rc1 !== null && rc1.consejo === undefined && igual(rc1.otras, ['Lo que viene tras una línea en blanco no es el consejo.']), rc1 ? JSON.stringify(rc1) : 'null');
  const r10 = leerReceta(T('Receta con dos puntos:', 'Guiso de la abuela', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.'));
  check('una primera línea que acaba en «:» no es el título (es la presentación): el título es la siguiente', r10 !== null && r10.titulo === 'Guiso de la abuela' && igual(r10.otras, ['Receta con dos puntos:']));
  check('«Consejo del chef:», «Truco:», «Tip:» y «CONSEJO FINAL:» son consejos',
    ['Consejo del chef: a', 'Truco: a', 'Tip: a', 'CONSEJO FINAL: a', '💡 Consejo: a', '**Consejo:** a'].every((e) => { const r = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.', e)); return r !== null && r.consejo === 'a'; }));
  const rr = leerReceta(T('---', '🍲 Guiso', '***', 'Ingredientes:', '• 2 huevos', '-', '•', 'Pasos:', '1. Bate.', '___', '–'));
  check('las rayas y las viñetas vacías («---», «***», «•», «-») no son nada: ni ingredientes, ni pasos, ni `otras`', rr !== null && rr.ingredientes.length === 1 && rr.pasos.length === 1 && !('otras' in rr));
  /* Un texto con acentos DESCOMPUESTOS (la «o» y su tilde por separado, como los escriben algunos teclados y modelos) se lee igual que uno compuesto. */
  const descompuesto = (s) => s.normalize('NFD');
  const rd = leerReceta(T('🍲 Guiso de cocción lenta', 'Para 4 personas · 1 hora', 'Ingredientes:', '• 2 huevos', descompuesto('Preparación:'), '1. Bate.', descompuesto('Consejo: déjalo reposar')));
  check('acentos descompuestos («Preparación:», «Consejo: déjalo») se reconocen igual (NFC): los pasos se leen y el consejo también',
    rd !== null && rd.pasos.length === 1 && rd.consejo === 'déjalo reposar'.normalize('NFC') && rd.titulo === 'Guiso de cocción lenta', rd ? JSON.stringify(rd.consejo) : 'null');
  check('…y la marca de sección descompuesta de una lista («SECCIÓN:») también', (() => { const l = leerLista(T(descompuesto('SECCIÓN: Panadería'), '• 1 barra de pan')); return l !== null && l.secciones[0].nombre === 'Panadería'; })());
  check('«Nota:» no es un consejo (no se adivina): va a `otras`', (() => { const r = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.', 'Nota: a')); return r !== null && r.consejo === undefined && igual(r.otras, ['Nota: a']); })());
}

/* ── A4 · Líneas desmedidas y entradas hostiles: acotadas en tiempo y sin leerse a ciegas ───────────────────── */
console.log('\n── A4 · Líneas desmedidas y entradas hostiles ──');
{
  const parrafo = `Esta receta viene de mi abuela. ${'Se hace despacio y con cariño. '.repeat(40)}`;
  check('el párrafo de más de 800 caracteres se conserva en `otras` y no impide leer la receta',
    (() => { const r = leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.', parrafo.trim())); return parrafo.length > 800 && r !== null && r.otras.length === 1 && r.otras[0] === parrafo.trim() && r.pasos.length === 1; })());
  const larga = (marca) => `${marca}${'x'.repeat(900)}`;
  for (const [marca, que] of [['• ', 'una viñeta'], ['- ', 'un guion'], ['1. ', 'un número de paso'], ['2 ', 'una cantidad'], ['[ ] ', 'una casilla']]) {
    check(`una línea desmedida que empieza como un elemento de lista (${que}) no se analiza y el texto entero NO se lee: null`,
      leerReceta(T('🍲 Guiso', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.', larga(marca))) === null && leerLista(T('SECCIÓN: A', '• 2 limones', larga(marca))) === null);
  }
  const exacta = (n) => `• 2 ${'x'.repeat(n - 4)}`;
  check('el tope es exacto: una viñeta de 800 caracteres se lee como ingrediente y una de 801 anula la lectura',
    (() => { const a = leerReceta(T('🍲 Guiso', 'Ingredientes:', exacta(800), 'Pasos:', '1. Bate.')); return exacta(800).length === 800 && a !== null && a.ingredientes[0].cantidad === 2 && leerReceta(T('🍲 Guiso', 'Ingredientes:', exacta(801), 'Pasos:', '1. Bate.')) === null; })());
  check('leerLista: un párrafo desmedido va a `otras` y no impide leer la lista',
    (() => { const l = leerLista(T('SECCIÓN: A', '• 2 limones', parrafo.trim())); return l !== null && l.otras.length === 1 && l.secciones[0].lineas.length === 1; })());

  const base = (linea) => T('🍝 Pasta', 'Para 4 personas', 'Ingredientes:', `• ${linea}`, 'Pasos:', '1. Mezcla.');
  const HOSTILES = {
    'una línea de 19 000 espacios y una letra': `${' '.repeat(19000)}x`,
    'una palabra, 19 000 espacios y otra': `a${' '.repeat(19000)}b`,
    '19 000 espacios Unicode anchos': `${String.fromCodePoint(0x3000).repeat(19000)}x`,
    'una viñeta, 19 000 espacios y «IMAGEN»': `• ${' '.repeat(19000)}IMAGEN`,
    '19 000 dígitos en un ingrediente': base(`2 a${'1'.repeat(19000)}`),
    'una unidad y 19 000 dígitos pegados': base(`2 g de a${'1'.repeat(19000)}`),
    '19 000 dígitos sueltos': '1'.repeat(19000),
    '19 000 asteriscos': '*'.repeat(19000),
    'a, 19 000 asteriscos y b': `a${'*'.repeat(19000)}b`,
    'a, 19 000 puntos y b': `a${'.'.repeat(19000)}b`,
    '9 000 emojis': '🍝'.repeat(9000),
    '4 000 comas con espacio': ', '.repeat(4000),
    'un número con 19 000 decimales': base(`1,${'5'.repeat(19000)} g de sal`),
    '1 500 cabeceras': 'Ingredientes:\n'.repeat(1500),
    '6 000 líneas de dos caracteres': Array.from({ length: 6000 }, () => '1 ').join('\n'),
  };
  const lentos = [];
  for (const [nombre, texto] of Object.entries(HOSTILES)) {
    const t0 = Date.now();
    let error = '';
    try { const r = leerReceta(texto); leerLista(texto); if (r && r.porciones) escalarReceta(r, 8); } catch (e) { error = ` LANZÓ ${e.message}`; }
    const ms = Date.now() - t0;
    if (ms > 700 || error) lentos.push(`${nombre}: ${ms} ms${error}`);
  }
  check('entradas hostiles (tiras de espacios, de dígitos, de asteriscos, de emojis, miles de líneas): ninguna tarda más de 0,7 s ni lanza (sin retroceso cuadrático)',
    lentos.length === 0, lentos.join(' | '));
}

/* ═══ B · LO INTERNO NO SE ENSEÑA ══════════════════════════════════════════════════════════════════════════════ */
console.log('\n── B · La línea IMAGEN: y las demás marcas internas no salen ──');
{
  const con = (...marcas) => T(
    '🍰 Bizcocho de yogur', 'Para 8 personas · 50 minutos', '', 'Ingredientes:', '• 1 yogur natural', '• 3 huevos', '',
    'Pasos:', '1. Mezcla todo.', '2. Hornea.', ...marcas,
  );
  const sinMarca = leerReceta(con());
  for (const marca of ['IMAGEN: a golden yogurt cake on a plate, soft light', '- IMAGEN: yogurt cake', '• IMAGEN: yogurt cake', '**IMAGEN:** yogurt cake', 'imagen: yogurt cake', 'PROBAR: otra cosa', 'NARRACIÓN: texto para leer en voz alta']) {
    const r = leerReceta(con(marca));
    check(`AC-15 · descarta la línea «${marca.slice(0, 22)}»: no sale en ningún campo y la receta es la misma que sin ella`,
      r !== null && igual(r, sinMarca) && !/IMAGEN|PROBAR|NARRACI/i.test(JSON.stringify(r)));
  }
  const alMedio = leerReceta(T('🍰 Bizcocho', 'IMAGEN: cake', 'Para 8 personas', 'Ingredientes:', '• 3 huevos', 'PROBAR: x', 'Pasos:', '1. Mezcla.'));
  check('AC-15 · descarta IMAGEN: aunque esté entre el título y los ingredientes', alMedio !== null && alMedio.titulo === 'Bizcocho' && !/IMAGEN|PROBAR/i.test(JSON.stringify(alMedio)) && alMedio.porciones === 8);
  const soloMarca = leerReceta('IMAGEN: a plate of food');
  check('un texto que solo trae la marca interna no es una receta: null', soloMarca === null);
}

/* ═══ C · FALLO CERRADO ════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── C · AC-17 · si no se pudo leer, null (y entradas raras sin lanzar nada) ──');
{
  const NO_RECETAS = [
    ['una respuesta de conversación', 'Claro, con gusto te ayudo. ¿Qué te gustaría cocinar hoy? Dime si tienes alguna alergia y lo tengo en cuenta.'],
    ['un menú (el del adaptador de prueba)', T('📋 Menú para: una semana de cenas', '', 'Lunes · Ensalada tibia con pollo', 'Martes · Pasta con verduras asadas', 'Miércoles · Sopa de lentejas y pan', 'Jueves · Tacos de pescado')],
    ['una lista de la compra (viñetas y ningún paso)', T('🛒 Lista de compras', '• 2 limones', '• 500 g de tomates', '• 1 l de leche')],
    ['pasos sin ingredientes', T('🍳 Huevo frito', '1. Calienta el aceite.', '2. Casca el huevo.', '3. Sirve.')],
    ['ingredientes sin pasos', T('🍳 Huevo frito', 'Ingredientes:', '• 1 huevo', '• Aceite')],
    ['ingredientes y pasos sin título', T('Ingredientes:', '• 2 huevos', 'Pasos:', '1. Bate.')],
    ['solo un título con porciones y tiempo', T('🍝 Pasta', 'Para 4 personas · 20 minutos')],
    ['un texto vacío', ''],
    ['solo espacios y saltos de línea', '   \n\n \t \r\n  '],
    ['solo líneas de separación', T('---', '***', '___')],
    ['una viñeta vacía y un número suelto', T('•', '1.', '-')],
  ];
  for (const [que, texto] of NO_RECETAS) {
    check(`AC-17 · ${que}: leerReceta devuelve null (el texto sale tal cual)`, leerReceta(texto) === null);
  }
  check('AC-17 · un texto que no es una receta → null', leerReceta(NO_RECETAS[0][1]) === null);

  const MUDAS = [undefined, null, 0, 42, NaN, true, false, {}, [], ['🍝 Pasta'], () => 'x', Symbol('x'), 10n, new Date(0), /x/, { toString: () => '🍝 Pasta' }];
  const excepciones = [];
  for (const entrada of MUDAS) {
    for (const [nombre, f] of [['leerReceta', leerReceta], ['leerLista', leerLista]]) {
      try { if (f(entrada) !== null) excepciones.push(`${nombre}(${String(typeof entrada)}) no dio null`); } catch (e) { excepciones.push(`${nombre} lanzó con ${typeof entrada}: ${e.message}`); }
    }
  }
  check('AC-17 · texto no cadena (undefined, null, números, objetos, símbolo…): leerReceta y leerLista devuelven null y NUNCA lanzan',
    excepciones.length === 0, excepciones.join(' | '));

  const enorme = `🍝 Pasta\n${'• 2 huevos\n'.repeat(5000)}1. Mezcla.`;
  const t0 = Date.now();
  const rEnorme = leerReceta(enorme);
  check('un texto desmedido (más de 20 000 caracteres) no se lee: null, y rápido', rEnorme === null && Date.now() - t0 < 1500, `${enorme.length} caracteres`);
  const cercaDelTope = `🍝 Pasta\nIngredientes:\n• 2 huevos\nPasos:\n1. Mezcla.\n${'x'.repeat(19000)}`;
  check('CONTROL · justo debajo del tope sí se lee', leerReceta(cercaDelTope) !== null);

  /* En otro idioma: v1 solo conoce las palabras en español. Lo seguro es no escalar, nunca inventar la base. */
  const EN = T('🍝 Creamy mushroom pasta', 'Serves 4 · 45 minutes', '', 'Ingredients:', '• 400 g pasta', '• 2 cloves garlic', '', 'Steps:', '1. Boil the pasta.', '2. Mix and serve.');
  const rEn = leerReceta(EN);
  check('en otro idioma (inglés): o null, o una lectura SIN porciones base, que no se puede escalar (nunca una base inventada)',
    rEn === null || (rEn.porciones === undefined && escalarReceta(rEn, 6) === null));
}

/* ═══ D · ESCALAR ══════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── D · AC-16 · escalarReceta ──');

const TABLA = T(
  '🧪 Receta de la tabla de escalado',
  'Para 4 personas · 30 minutos',
  '',
  'Ingredientes:',
  '• 400 g de harina',
  '• 250 ml de nata',
  '• 60 g de mantequilla',
  '• 6 g de levadura',
  '• 1 kg de patatas',
  '• 1,5 l de caldo',
  '• 2 cucharadas de aceite',
  '• 1 cucharadita de sal',
  '• ½ taza de leche',
  '• 3 huevos',
  '• 2 dientes de ajo',
  '• 2–3 ramas de apio',
  '• 1 pizca de nuez moscada',
  '• Sal al gusto',
  '• Un chorrito de limón',
  '• 1 molde de 22 cm',
  '• 250 ml de agua a 40 °C',
  '• 1 taza (240 ml) de agua',
  '• 2 dl de vino',
  '• Una docena de aceitunas',
  '',
  'Pasos:',
  '1. Precalienta el horno a 180 °C.',
  '2. Hornea 45 minutos en un molde de 22 cm.',
  '3. Deja reposar 10 minutos.',
  '',
  'Consejo: sirve templado.',
);
const BASE = leerReceta(TABLA);
const NOMBRES = ['harina', 'nata', 'mantequilla', 'levadura', 'patatas', 'caldo', 'aceite', 'sal (cdta)', 'leche', 'huevos', 'ajo', 'apio', 'pizca', 'sal al gusto', 'chorrito', 'molde', 'agua a 40 °C', 'taza (240 ml)', 'dl', 'docena'];

check('la receta de la tabla se lee entera (20 ingredientes, 3 pasos, base de 4 personas)',
  BASE !== null && BASE.ingredientes.length === 20 && BASE.pasos.length === 3 && BASE.porciones === 4 && BASE.minutos === 30 && BASE.consejo === 'sirve templado.');
check('lo que NO se entiende al leer queda sin cantidad: «1 molde de 22 cm», «1 taza (240 ml)», «2 dl», «una docena» (se conservan tal cual)',
  [15, 17, 18, 19].every((i) => igual(BASE.ingredientes[i], { texto: BASE.ingredientes[i].texto })), BASE.ingredientes.filter((_, i) => [15, 17, 18, 19].includes(i)).map((x) => x.texto).join(' | '));
check('«250 ml de agua a 40 °C» sí se lee: la temperatura no es una cantidad que escalar',
  igual(BASE.ingredientes[16], { texto: '250 ml de agua a 40 °C', cantidad: 250, unidad: 'ml', nombre: 'agua a 40 °C' }));

const ing = (r, i) => r.ingredientes[i];
const SIN_TOCAR = [12, 13, 14, 15]; // pizca, al gusto, chorrito, molde: intactos por regla
const SIN_ENTENDER = [17, 18, 19]; // conservados y avisados

/* Lo que se espera de cada línea que SÍ se escala: [cantidad, hasta, aproximado], escrito a mano con la tabla de §2.5. */
const ESPERADO = {
  '4→6': { porciones: 6, lineas: {
    0: [600], 1: [375], 2: [90], 3: [9], 4: [1.5], 5: [2.25], 6: [3], 7: [1.5], 8: [0.75], 9: [5, undefined, true], 10: [3], 11: [3, 5, true], 16: [375],
  } },
  '4→1': { porciones: 1, lineas: {
    0: [100], 1: [63, undefined, true], 2: [15], 3: [1.5], 4: [0.25], 5: [0.4, undefined, true], 6: [0.5], 7: [0.25], 8: [0.25, undefined, true], 9: [1, undefined, true],
    10: [1, undefined, true], 11: [1, undefined, true], 16: [63, undefined, true],
  } },
  '4→2': { porciones: 2, lineas: {
    0: [200], 1: [125], 2: [30], 3: [3], 4: [0.5], 5: [0.75], 6: [1], 7: [0.5], 8: [0.25], 9: [2, undefined, true], 10: [1], 11: [1, 2, true], 16: [125],
  } },
};
const ESCALADAS = {};
for (const [etiqueta, { porciones, lineas }] of Object.entries(ESPERADO)) {
  const r = escalarReceta(congelar(clon(BASE)), porciones);
  ESCALADAS[etiqueta] = r;
  check(`AC-16 · escalarReceta ${etiqueta}: devuelve una receta`, r !== null);
  if (!r) continue;
  for (const [i, e] of Object.entries(lineas)) {
    const real = ing(r, Number(i));
    const obtenido = { cantidad: real.cantidad, hasta: real.hasta, aproximado: real.aproximado };
    const ok = igual(obtenido, { cantidad: e[0], hasta: e[1], aproximado: e[2] });
    check(`AC-16 · ${etiqueta} con la tabla · ${NOMBRES[Number(i)]}: ${BASE.ingredientes[Number(i)].texto} → ${e[0]}${e[1] ? '–' + e[1] : ''}${e[2] ? ' ≈' : ''}`, ok, ok ? '' : JSON.stringify(obtenido));
  }
}
const x15 = ESCALADAS['4→6']; const x025 = ESCALADAS['4→1']; const x05 = ESCALADAS['4→2'];

for (const [etiqueta, { porciones }] of Object.entries(ESPERADO)) {
  const r = ESCALADAS[etiqueta];
  if (!r) continue;
  check(`«al gusto» y «una pizca» no se tocan (${etiqueta}): la pizca, «sal al gusto», «un chorrito» y el molde salen idénticos y sin avisos`,
    SIN_TOCAR.every((i) => igual(ing(r, i), BASE.ingredientes[i])));
  check(`la línea que no se entiende se conserva y no se escala (${etiqueta}): «1 taza (240 ml)», «2 dl» y «una docena» salen con su texto y el aviso \`sinEscalar\``,
    SIN_ENTENDER.every((i) => igual(ing(r, i), { texto: BASE.ingredientes[i].texto, sinEscalar: true })), SIN_ENTENDER.map((i) => JSON.stringify(ing(r, i))).join(' ; '));
  check(`tiempos y temperaturas no se escalan (${etiqueta}): los pasos (180 °C, 45 minutos, molde de 22 cm), los minutos, el consejo, el título y el emoji son los mismos`,
    igual(r.pasos, BASE.pasos) && r.minutos === 30 && r.consejo === 'sirve templado.' && r.titulo === BASE.titulo && r.emoji === BASE.emoji
    && r.pasos[0].includes('180 °C') && r.pasos[1].includes('45 minutos') && r.pasos[1].includes('22 cm'));
  check(`la temperatura de un ingrediente («agua a 40 °C») tampoco se escala, y el texto original de cada línea no se reescribe (${etiqueta})`,
    ing(r, 16).nombre === 'agua a 40 °C' && r.ingredientes.every((x, i) => x.texto === BASE.ingredientes[i].texto));
  check(`las porciones de la receta escalada son las pedidas (${etiqueta}: ${porciones})`, r.porciones === porciones);
}

/* Diez cocinas de la tabla de §2.5 con números a mano, independientes del código: */
check('4→6 con la tabla de §2.5 · números a mano: 400 g → 600 g, 250 ml → 375 ml, 60 g → 90 g, 6 g → 9 g, 1 kg → 1,5 kg',
  x15 !== null && [0, 1, 2, 3, 4].map((i) => ing(x15, i).cantidad).join() === '600,375,90,9,1.5');
check('4→1 con la tabla de §2.5 · 400 g → 100 g; 250 ml → 63 ml (≈, mitad hacia arriba); 3 huevos → 1 (≈, al entero)',
  x025 !== null && ing(x025, 0).cantidad === 100 && ing(x025, 1).cantidad === 63 && ing(x025, 1).aproximado === true && ing(x025, 9).cantidad === 1 && ing(x025, 9).aproximado === true);
check('4→2 con la tabla de §2.5 · 400 g → 200 g, 2 cucharadas → 1, ½ taza → ¼ taza, 3 huevos → 2 (≈)',
  x05 !== null && ing(x05, 0).cantidad === 200 && ing(x05, 6).cantidad === 1 && ing(x05, 8).cantidad === 0.25 && ing(x05, 9).cantidad === 2 && ing(x05, 9).aproximado === true);

/* ×1 */
{
  const r = leerReceta(TABLA);
  const mismo = escalarReceta(congelar(clon(r)), 4);
  check('AC-16 · escalarReceta ×1 devuelve lo mismo (igual, con TODOS los redondeos sin aplicar: «123 g» sigue siendo 123 g)',
    igual(mismo, r) && mismo !== r);
  const raro = { titulo: 'x', porciones: 2, ingredientes: [{ texto: '123 g de sal', cantidad: 123, unidad: 'g', nombre: 'sal' }, { texto: '1 huevo', cantidad: 1, nombre: 'huevo' }], pasos: ['p'] };
  const m2 = escalarReceta(congelar(clon(raro)), 2);
  check('AC-16 · ×1 no redondea: 123 g, 1,1 cucharadas y 7 huevos se quedan como estaban',
    igual(m2, raro) && m2.ingredientes[0].cantidad === 123);
  const nueva = escalarReceta(r, 4);
  check('×1 devuelve copias nuevas, no los mismos objetos ni los mismos arreglos',
    nueva.ingredientes !== r.ingredientes && nueva.pasos !== r.pasos && nueva.ingredientes[0] !== r.ingredientes[0]);
}

/* El factor 0,25–10 y la base */
{
  const r = clon(BASE);
  check('factor fuera de 0,25–10 → null: 4→0,9 (×0,225) y 4→41 (×10,25) se rechazan',
    escalarReceta(r, 0.9) === null && escalarReceta(r, 41) === null && escalarReceta(r, 0.99) === null);
  check('los extremos del factor SÍ se aceptan: 4→1 (×0,25) y 4→40 (×10)', escalarReceta(r, 1) !== null && escalarReceta(r, 40) !== null);
  const dez = escalarReceta(r, 40);
  check('×10: 400 g → 4000 g, 3 huevos → 30, 2–3 ramas → 20–30', ing(dez, 0).cantidad === 4000 && ing(dez, 9).cantidad === 30 && ing(dez, 11).cantidad === 20 && ing(dez, 11).hasta === 30);
  check('factorDeEscala: 4→6 = 1,5; 4→1 = 0,25; 4→40 = 10; fuera de rango y datos malos → null',
    factorDeEscala(4, 6) === 1.5 && factorDeEscala(4, 1) === 0.25 && factorDeEscala(4, 40) === 10 && factorDeEscala(4, 0.9) === null && factorDeEscala(4, 41) === null
    && factorDeEscala(0, 4) === null && factorDeEscala(4, 0) === null && factorDeEscala(-4, 4) === null && factorDeEscala(NaN, 4) === null && factorDeEscala(4, Infinity) === null && factorDeEscala('4', 6) === null);
  check('pideRevisarTiempos (el aviso «revisa los tiempos y el molde» lo escribe la tarjeta; aquí solo la condición): > 2 o < 0,5, no en los bordes',
    pideRevisarTiempos(2.0001) === true && pideRevisarTiempos(2) === false && pideRevisarTiempos(1) === false && pideRevisarTiempos(0.5) === false && pideRevisarTiempos(0.4999) === true
    && pideRevisarTiempos(factorDeEscala(4, 6)) === false && pideRevisarTiempos(factorDeEscala(4, 1)) === true && pideRevisarTiempos(factorDeEscala(4, 9)) === true);

  const sinBase = leerReceta(EJEMPLOS.find((e) => e.id === 'E3').texto);
  check('sin porciones base → null: la limonada («sin porciones») no se escala, tampoco con ×1', sinBase !== null && escalarReceta(sinBase, 4) === null && escalarReceta(sinBase, 6) === null);
  const hecha = (porciones) => ({ titulo: 't', porciones, ingredientes: [{ texto: '2 huevos', cantidad: 2, nombre: 'huevos' }], pasos: ['p'] });
  check('sin porciones base → null también con una base mala: 0, negativa, NaN, texto o infinita',
    [0, -4, NaN, '4', Infinity, null, undefined].every((p) => escalarReceta(hecha(p), 6) === null));
  check('escalar a unas porciones malas → null: 0, negativas, NaN, infinito, texto, null, undefined, objeto',
    [0, -1, NaN, Infinity, -Infinity, '6', null, undefined, {}, [], true].every((p) => escalarReceta(hecha(4), p) === null));
  check('CONTROL · con base y porciones buenas la misma receta sí se escala', escalarReceta(hecha(4), 6) !== null && ing(escalarReceta(hecha(4), 6), 0).cantidad === 3);
}

/* La receta de entrada tiene que ser una receta */
{
  const raras = [null, undefined, 0, 'receta', [], {}, { porciones: 4 }, { titulo: 'x', porciones: 4 },
    { titulo: 'x', porciones: 4, ingredientes: 'no', pasos: [] }, { titulo: 'x', porciones: 4, ingredientes: [], pasos: [] },
    { titulo: 'x', porciones: 4, ingredientes: [null], pasos: [] }, { titulo: 'x', porciones: 4, ingredientes: [{ cantidad: 2 }], pasos: [] },
    { titulo: 'x', porciones: 4, ingredientes: [{ texto: '2 huevos', cantidad: 2, nombre: 'huevos' }], pasos: 'no' },
    { titulo: 7, porciones: 4, ingredientes: [{ texto: '2 huevos', cantidad: 2, nombre: 'huevos' }], pasos: [] }];
  const fallos = [];
  for (const r of raras) { try { if (escalarReceta(r, 6) !== null) fallos.push(JSON.stringify(r)); } catch (e) { fallos.push(`lanzó ${e.message}`); } }
  check('AC-17 · escalarReceta con algo que no es una receta leída → null, sin lanzar', fallos.length === 0, fallos.join(' | '));
}

/* Sin nada que escalar → null; una receta ya escalada no se vuelve a escalar */
{
  const todoIntacto = { titulo: 't', porciones: 4, ingredientes: [{ texto: 'Sal al gusto' }, { texto: '1 pizca de sal', cantidad: 1, unidad: 'pizca', nombre: 'sal' }, { texto: 'Pimienta' }], pasos: ['p'] };
  check('si ninguna línea se puede escalar (todo es «al gusto», «una pizca» o no se entiende) → null: nunca «6 porciones» con las cantidades de 4',
    escalarReceta(todoIntacto, 6) === null);
  const ningunaEntendida = { titulo: 't', porciones: 4, ingredientes: [{ texto: '2 dl de leche' }, { texto: '1 lata (400 g) de atún' }], pasos: ['p'] };
  check('lo mismo con líneas con cantidades que no se entendieron: null', escalarReceta(ningunaEntendida, 6) === null);
  const seis = escalarReceta(clon(BASE), 6);
  check('una receta YA escalada con redondeos (≈) no se vuelve a escalar: null; se escala siempre desde la leída (los redondeos no se acumulan)',
    escalarReceta(seis, 3) === null && escalarReceta(clon(BASE), 3) !== null);
  check('…pero pedirle sus mismas porciones sí devuelve lo mismo (×1)', igual(escalarReceta(seis, 6), seis));
  const exacta = escalarReceta(clon({ ...BASE, ingredientes: BASE.ingredientes.filter((_, i) => [0, 1, 2].includes(i)) }), 8);
  check('CONTROL · una receta escalada SIN redondeos puede volver a escalarse', exacta !== null && escalarReceta(exacta, 4) !== null);
}

/* Líneas mal formadas a mano dentro de una receta buena */
{
  const malas = [
    { texto: '0 g de sal', cantidad: 0, unidad: 'g', nombre: 'sal' },
    { texto: '-5 g de sal', cantidad: -5, unidad: 'g', nombre: 'sal' },
    { texto: 'NaN g', cantidad: NaN, unidad: 'g', nombre: 'x' },
    { texto: '3 g de nada', cantidad: 3, unidad: 'g' },
    { texto: '2 galones de agua', cantidad: 2, unidad: 'galon', nombre: 'agua' },
    { texto: '2–1 huevos', cantidad: 2, hasta: 1, nombre: 'huevos' },
    { texto: '2 huevos', cantidad: '2', nombre: 'huevos' },
  ];
  const r = { titulo: 't', porciones: 4, ingredientes: [{ texto: '2 huevos', cantidad: 2, nombre: 'huevos' }, ...malas], pasos: ['p'] };
  const out = escalarReceta(congelar(r), 6);
  check('una línea con cantidad no válida (0, negativa, NaN, texto), sin nombre, con una unidad que no existe o con un rango al revés se conserva SIN escalar y avisada (la buena sí se escala)',
    out !== null && ing(out, 0).cantidad === 3 && out.ingredientes.slice(1).every((x, i) => x.sinEscalar === true && x.texto === malas[i].texto && Object.is(x.cantidad, malas[i].cantidad)),
    out ? out.ingredientes.slice(1).map((x) => JSON.stringify(x)).join(' ; ') : 'null');
}

/* ═══ E · CANTIDADES Y UNIDADES ════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── E · Cantidades y unidades: lo que se lee y lo que no se adivina ──');
{
  /* Se lee SOLO la línea de ingrediente, dentro de una receta mínima. */
  const linea = (s) => {
    const r = leerReceta(T('Prueba', 'Para 2 personas', 'Ingredientes:', `• ${s}`, 'Pasos:', '1. Mezcla.'));
    return r ? r.ingredientes[0] : 'NULL';
  };
  const casos = [
    // fracciones
    ['½ taza de leche', { cantidad: 0.5, unidad: 'taza', nombre: 'leche' }],
    ['¼ de taza de azúcar', { cantidad: 0.25, unidad: 'taza', nombre: 'azúcar' }],
    ['¾ taza de harina', { cantidad: 0.75, unidad: 'taza', nombre: 'harina' }],
    ['1/2 taza de leche', { cantidad: 0.5, unidad: 'taza', nombre: 'leche' }],
    ['1 1/2 tazas de leche', { cantidad: 1.5, unidad: 'taza', nombre: 'leche' }],
    ['1½ tazas de leche', { cantidad: 1.5, unidad: 'taza', nombre: 'leche' }],
    ['1 ½ tazas de leche', { cantidad: 1.5, unidad: 'taza', nombre: 'leche' }],
    ['2 y 1/2 tazas de leche', { cantidad: 2.5, unidad: 'taza', nombre: 'leche' }],
    ['3/4 de taza de nata', { cantidad: 0.75, unidad: 'taza', nombre: 'nata' }],
    ['⅓ taza de aceite', { cantidad: 1 / 3, unidad: 'taza', nombre: 'aceite' }],
    // decimales
    ['1,5 kg de patatas', { cantidad: 1.5, unidad: 'kg', nombre: 'patatas' }],
    ['1.5 kg de patatas', { cantidad: 1.5, unidad: 'kg', nombre: 'patatas' }],
    ['0,25 l de leche', { cantidad: 0.25, unidad: 'l', nombre: 'leche' }],
    ['0,125 kg de queso', { cantidad: 0.125, unidad: 'kg', nombre: 'queso' }],
    ['2.5 cucharadas de miel', { cantidad: 2.5, unidad: 'cucharada', nombre: 'miel' }],
    // rangos
    ['2–3 dientes de ajo', { cantidad: 2, hasta: 3, nombre: 'dientes de ajo' }],
    ['2-3 dientes de ajo', { cantidad: 2, hasta: 3, nombre: 'dientes de ajo' }],
    ['2 - 3 dientes de ajo', { cantidad: 2, hasta: 3, nombre: 'dientes de ajo' }],
    ['2 a 3 dientes de ajo', { cantidad: 2, hasta: 3, nombre: 'dientes de ajo' }],
    ['200—300 g de harina', { cantidad: 200, hasta: 300, unidad: 'g', nombre: 'harina' }],
    ['1-2 cucharadas de salsa de soja', { cantidad: 1, hasta: 2, unidad: 'cucharada', nombre: 'salsa de soja' }],
    // unidades, abreviadas y escritas, sin espacio y con punto
    ['250g de harina', { cantidad: 250, unidad: 'g', nombre: 'harina' }],
    ['250 gr de harina', { cantidad: 250, unidad: 'g', nombre: 'harina' }],
    ['250 gramos de harina', { cantidad: 250, unidad: 'g', nombre: 'harina' }],
    ['2 kilos de arroz', { cantidad: 2, unidad: 'kg', nombre: 'arroz' }],
    ['500ml de leche', { cantidad: 500, unidad: 'ml', nombre: 'leche' }],
    ['2 litros de agua', { cantidad: 2, unidad: 'l', nombre: 'agua' }],
    ['1 lt de agua', { cantidad: 1, unidad: 'l', nombre: 'agua' }],
    ['3 cdas de aceite', { cantidad: 3, unidad: 'cucharada', nombre: 'aceite' }],
    ['3 cdas. de aceite', { cantidad: 3, unidad: 'cucharada', nombre: 'aceite' }],
    ['2 cdtas de sal', { cantidad: 2, unidad: 'cucharadita', nombre: 'sal' }],
    ['1 cucharadita de canela', { cantidad: 1, unidad: 'cucharadita', nombre: 'canela' }],
    ['2 vasos de agua', { cantidad: 2, unidad: 'vaso', nombre: 'agua' }],
    ['2 pizcas de sal', { cantidad: 2, unidad: 'pizca', nombre: 'sal' }],
    ['250 g harina', { cantidad: 250, unidad: 'g', nombre: 'harina' }],
    ['250 g de harina de trigo integral', { cantidad: 250, unidad: 'g', nombre: 'harina de trigo integral' }],
    // palabras
    ['una cebolla grande', { cantidad: 1, nombre: 'cebolla grande' }],
    ['dos huevos', { cantidad: 2, nombre: 'huevos' }],
    ['media taza de leche', { cantidad: 0.5, unidad: 'taza', nombre: 'leche' }],
    ['medio kilo de harina', { cantidad: 0.5, unidad: 'kg', nombre: 'harina' }],
    ['Un limón', { cantidad: 1, nombre: 'limón' }],
    ['tres cucharadas de azúcar', { cantidad: 3, unidad: 'cucharada', nombre: 'azúcar' }],
    // espacios duros (muy comunes en el texto de un modelo)
    ['250\u{A0}g de harina', { cantidad: 250, unidad: 'g', nombre: 'harina' }],
    ['2\u{202F}cucharadas de aceite', { cantidad: 2, unidad: 'cucharada', nombre: 'aceite' }],
    // con casillas, mayúsculas
    ['2 CUCHARADAS DE ACEITE', { cantidad: 2, unidad: 'cucharada', nombre: 'ACEITE' }],
    // el nombre lleva una temperatura, una medida de corte o un porcentaje: NO es otra cantidad
    ['250 ml de agua a 40 °C', { cantidad: 250, unidad: 'ml', nombre: 'agua a 40 °C' }],
    ['1 kg de patatas cortadas en cubos de 2 cm', { cantidad: 1, unidad: 'kg', nombre: 'patatas cortadas en cubos de 2 cm' }],
    ['200 g de chocolate negro al 70%', { cantidad: 200, unidad: 'g', nombre: 'chocolate negro al 70%' }],
  ];
  for (const [entrada, esperado] of casos) {
    const real = linea(entrada);
    checkIgual(`leer «${entrada.replace(/\u{A0}/gu, '·nbsp·').replace(/\u{202F}/gu, '·nnbsp·')}»`, real, { texto: entrada.replace(/[\u{A0}\u{202F}]/gu, ' '), ...esperado });
  }

  /* Lo que no se entiende NO se adivina: se conserva la línea y no hay cantidad. */
  const NO_SE_ENTIENDE = [
    ['1.000 g de arroz', 'un punto con tres cifras detrás puede ser un millar o un decimal'],
    ['1,500 kg de patatas', 'una coma con tres cifras detrás: igual de ambiguo'],
    ['2 dl de leche', 'una unidad que v1 no conoce (dl) no se toma por una pieza'],
    ['3 cl de ron', 'cl'],
    ['2 oz de queso', 'onzas'],
    ['1 lb de carne', 'libras'],
    ['2 cups of flour', 'tazas en inglés'],
    ['Una docena de huevos', 'una docena no es «1 pieza»'],
    ['Un par de huevos', 'un par tampoco'],
    ['Tres cuartos de taza de leche', '«cuartos» no es una pieza'],
    ['1 taza (240 ml) de leche', 'lleva otra cantidad dentro'],
    ['2 latas de 400 g de tomate', 'lleva otra cantidad dentro'],
    ['2 x 400 g de tomate triturado', 'un producto de cantidades'],
    ['1 cebolla, 2 dientes de ajo', 'son dos ingredientes en una línea'],
    ['2 o 3 dientes de ajo', '«o» no es un rango que se lea'],
    ['unos 200 g de harina', 'aproximado: no se adivina'],
    ['aprox. 200 g de harina', 'aproximado: no se adivina'],
    ['1 cucharada rasa de sal', 'el calificativo no se descarta en silencio'],
    ['3huevos', 'pegado: no es una unidad'],
    ['0 g de sal', 'cero no es una cantidad'],
    ['1/0 de taza', 'denominador cero'],
    ['1 molde de 22 cm', 'un utensilio no es un ingrediente que escalar'],
    ['2 sartenes grandes', 'un utensilio'],
    /* Una cantidad que sigue después de la unidad («y media») no se lee a medias: escalar «1» daría «2 y media» en vez de 3. */
    ['1 taza y media de leche', 'la cantidad sigue en «y media»: leer «1 taza» y escalarla daría 2 y media, no 3'],
    ['una taza y media de caldo', 'igual, con «una»'],
    ['2 cucharadas y media de azúcar', 'igual'],
    ['1 kg y medio de papas', 'igual'],
    ['1 y medio kilo de harina', 'la cantidad sigue en «y medio»: no es «1 pieza»'],
    ['2 de los tomates', 'un artículo no es el nombre de una pieza'],
    ['3 a la plancha', 'una preposición no es el nombre de una pieza'],
    ['3–2 huevos', 'un rango al revés'],
    ['2–2 huevos', 'un rango de un solo valor'],
    ['1-0 cucharadas de sal', 'un rango que acaba en cero'],
  ];
  for (const [entrada, porque] of NO_SE_ENTIENDE) {
    const real = linea(entrada);
    checkIgual(`no se adivina: «${entrada}» se conserva sin cantidad (${porque})`, real, { texto: entrada });
  }

  {
    const continuan = ['1 taza y media de leche', '1 y medio kilo de harina', '2 cucharadas y media de azúcar', '1 kg y medio de papas', '2 de los tomates'];
    const rc = leerReceta(T('🍲 Guiso', 'Para 2 personas', 'Ingredientes:', '• 100 g de arroz', ...continuan.map((x) => `• ${x}`), 'Pasos:', '1. Mezcla.'));
    const dc = rc && escalarReceta(rc, 4);
    check('…y al escalar ×2 esas líneas salen SIN escalar y avisadas (nunca «2 y media» donde son 3) mientras el arroz sí se duplica',
      !!dc && dc.ingredientes[0].cantidad === 200 && continuan.every((x, i) => igual(dc.ingredientes[i + 1], { texto: x, sinEscalar: true })),
      dc ? dc.ingredientes.slice(1).map((x) => JSON.stringify(x)).join(' ; ') : 'null');
  }

  /* Lo que va «al gusto» o es vago: se lee sin inventar una cantidad. */
  for (const entrada of ['Sal al gusto', 'Pimienta', 'Un chorrito de aceite', 'Un poco de pimienta', 'Un puñado de nueces', 'Aceite de oliva, sal y pimienta']) {
    checkIgual(`sin cantidad inventada: «${entrada}»`, linea(entrada), { texto: entrada });
  }
  checkIgual('«1 pizca de sal» es la unidad «pizca» (v1 la lee, y al escalar no se toca)', linea('1 pizca de sal'), { texto: '1 pizca de sal', cantidad: 1, unidad: 'pizca', nombre: 'sal' });
  check('una línea con casilla o checkbox («[ ] 2 huevos», «☐ 2 huevos») se lee sin la casilla',
    igual(linea('[ ] 2 huevos'), { texto: '2 huevos', cantidad: 2, nombre: 'huevos' }) && igual(linea('☐ 2 huevos'), { texto: '2 huevos', cantidad: 2, nombre: 'huevos' }));
}

/* ── E2 · Los vocabularios cerrados, uno a uno (un error en una tabla no puede pasar desapercibido) ────────────── */
console.log('\n── E2 · Fracciones, palabras, unidades y separadores de línea, uno a uno ──');
{
  const linea = (s) => { const r = leerReceta(T('Prueba', 'Para 2 personas', 'Ingredientes:', `• ${s}`, 'Pasos:', '1. Mezcla.')); return r ? r.ingredientes[0] : 'NULL'; };
  const FRACCIONES = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8 };
  check('las 15 fracciones de un solo carácter valen lo que dicen (½ ⅓ ⅔ ¼ ¾ ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅛ ⅜ ⅝ ⅞), solas y detrás de un entero («2⅔»)',
    Object.entries(FRACCIONES).every(([c, v]) => linea(`${c} taza de leche`).cantidad === v && linea(`2${c} tazas de leche`).cantidad === 2 + v),
    Object.entries(FRACCIONES).filter(([c, v]) => linea(`${c} taza de leche`).cantidad !== v).map(([c]) => c).join(' '));
  const PALABRAS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, medio: 0.5, media: 0.5 };
  check('los números en palabras valen lo que dicen, de «un» a «doce» y «medio/media» (también con mayúscula inicial)',
    Object.entries(PALABRAS).every(([p, v]) => linea(`${p} huevos`).cantidad === v && linea(`${p[0].toUpperCase()}${p.slice(1)} huevos`).cantidad === v),
    Object.entries(PALABRAS).filter(([p, v]) => linea(`${p} huevos`).cantidad !== v).map(([p]) => p).join(' '));
  const conPorciones = (palabra) => { const r = leerReceta(T('Prueba', `Para ${palabra} personas`, 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Mezcla.')); return r && r.porciones; };
  check('las porciones en palabras valen lo que dicen: de «una» a «doce»',
    Object.entries({ un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 }).every(([p, v]) => conPorciones(p) === v),
    ['un', 'uno', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'].filter((p) => !conPorciones(p)).join(' '));

  const UNIDADES = {
    g: ['g', 'gr', 'grs', 'gramo', 'gramos'], kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'], ml: ['ml', 'mls', 'mililitro', 'mililitros'],
    l: ['l', 'lt', 'lts', 'litro', 'litros'], cucharadita: ['cucharadita', 'cucharaditas', 'cdita', 'cditas', 'cdta', 'cdtas'], cucharada: ['cucharada', 'cucharadas', 'cda', 'cdas'],
    taza: ['taza', 'tazas'], vaso: ['vaso', 'vasos'], pizca: ['pizca', 'pizcas'],
  };
  /* Las abreviaturas («cdas.», «gr.») admiten un punto detrás; las palabras enteras no. «2g» y «2cucharadas» pegados valen. */
  const ABREVIATURAS = new Set(['g', 'gr', 'grs', 'kg', 'kgs', 'ml', 'mls', 'l', 'lt', 'lts', 'cdita', 'cditas', 'cdta', 'cdtas', 'cda', 'cdas']);
  const malas = [];
  for (const [id, alias] of Object.entries(UNIDADES)) for (const a of alias) {
    for (const forma of [`2 ${a} de sal`, `2${a} de sal`, ...(ABREVIATURAS.has(a) ? [`2 ${a}. de sal`] : [])]) {
      const x = linea(forma);
      if (x.unidad !== id || x.cantidad !== 2 || x.nombre !== 'sal') malas.push(`${forma} → ${JSON.stringify(x)}`);
    }
    if (['taza', 'tazas', 'vaso', 'vasos', 'pizca', 'pizcas'].includes(a)) {
      const conPunto = linea(`2 ${a}. de sal`);
      if (!igual(conPunto, { texto: `2 ${a}. de sal` })) malas.push(`2 ${a}. de sal debería conservarse tal cual → ${JSON.stringify(conPunto)}`);
    }
  }
  check(`cada alias de cada unidad (${Object.values(UNIDADES).flat().length}) se reconoce con su identificador: con espacio y pegado al número, y las abreviaturas también con punto; una palabra entera con punto («2 tazas. de sal») no se lee`,
    malas.length === 0, malas.slice(0, 3).join(' | '));
  check('una palabra que EMPIEZA como una unidad pero no lo es no se toma por ella: «2 gramola», «2 litografías», «2 lonchas», «2 cdrom», «2 tazones», «2 vasijas», «2 pizcarras»',
    ['2 gramola', '2 litografías', '2 lonchas', '2 cdrom', '2 tazones', '2 vasijas', '2 pizcarras', '2 grandes tomates', '2 kilométricos'].every((s) => { const x = linea(s); return x.unidad === undefined; }),
    ['2 gramola', '2 litografías', '2 lonchas', '2 cdrom', '2 tazones', '2 vasijas', '2 pizcarras', '2 grandes tomates', '2 kilométricos'].map((s) => `${s}: ${linea(s).unidad}`).join(' | '));
  check('una cantidad descomunal (más de 100 000) no se lee: un error de escritura no es una receta; el tope mismo sí',
    igual(linea('100001 g de sal'), { texto: '100001 g de sal' }) && linea('100000 g de sal').cantidad === 100000);

  /* Separadores de línea que no son «\n»: «\r» suelto, «\r\n», U+2028, U+2029 y U+0085. */
  const lineasSueltas = ['🍝 Pasta', 'Para 4 personas', 'Ingredientes:', '• 2 huevos', 'Pasos:', '1. Mezcla.'];
  for (const [sep, nombre] of [['\r', 'un «\\r» suelto'], ['\r\n', 'CRLF'], ['\u{2028}', 'U+2028'], ['\u{2029}', 'U+2029'], ['\u{85}', 'U+0085']]) {
    const r = leerReceta(lineasSueltas.join(sep));
    check(`las líneas pueden separarse con ${nombre}: se lee la misma receta`, r !== null && r.titulo === 'Pasta' && r.porciones === 4 && r.ingredientes.length === 1 && igual(r.pasos, ['Mezcla.']), r ? '' : 'null');
  }

  /* Lo que se deja intacto por REGLA, aunque llegue con otra forma (la guarda mira la estructura y también el texto). */
  const dura = (...ingredientes) => escalarReceta({ titulo: 't', porciones: 2, ingredientes: [{ texto: '2 huevos', cantidad: 2, nombre: 'huevos' }, ...ingredientes], pasos: ['p'] }, 4);
  const pizcaAtras = { texto: 'Sal (1 pizca)', cantidad: 1, unidad: 'pizca', nombre: 'sal' };
  const gustoConCantidad = { texto: '2 cucharadas de sal, al gusto', cantidad: 2, unidad: 'cucharada', nombre: 'sal, al gusto' };
  const gustoSuelto = { texto: 'Pimienta: 1 cucharadita o al gusto', cantidad: 1, unidad: 'cucharadita', nombre: 'pimienta: o al gusto' };
  const molde = { texto: '1 molde de 22 cm', cantidad: 1, nombre: 'molde de 22 cm' };
  const chorro = { texto: 'Un chorrito de aceite', cantidad: 1, nombre: 'chorrito de aceite' };
  const intactos = dura(pizcaAtras, gustoConCantidad, gustoSuelto, molde, chorro);
  check('una pizca se deja intacta por su UNIDAD aunque el texto no empiece por ella; «al gusto» también aunque traiga cantidad; un molde y «un chorrito» aunque vengan estructurados',
    intactos !== null && intactos.ingredientes[0].cantidad === 4 && [pizcaAtras, gustoConCantidad, gustoSuelto, molde, chorro].every((x, i) => igual(intactos.ingredientes[i + 1], x)),
    intactos ? intactos.ingredientes.slice(1).map((x) => JSON.stringify(x)).join(' ; ') : 'null');
  check('una línea que lleva «al gusto» y una cantidad leída sale igual que entró, sin `aproximado` ni `sinEscalar`',
    leerReceta(T('t', 'Para 2 personas', 'Ingredientes:', '• 2 huevos', '• 2 cucharadas de sal, al gusto', 'Pasos:', '1. p')).ingredientes[1].cantidad === 2
    && igual(escalarReceta(leerReceta(T('t', 'Para 2 personas', 'Ingredientes:', '• 2 huevos', '• 2 cucharadas de sal, al gusto', 'Pasos:', '1. p')), 4).ingredientes[1].cantidad, 2));
}

/* Unidades mezcladas en una sola receta y en una sola línea */
{
  const mezcla = leerReceta(T(
    '🍲 Mezcla', 'Para 2 personas', 'Ingredientes:',
    '• 200 g de arroz', '• 500 ml de caldo', '• 1 kg de verdura', '• 1 l de agua', '• 2 cucharadas de aceite', '• ½ taza de vino', '• 3 dientes de ajo', '• 1 pizca de sal',
    'Pasos:', '1. Cocina.',
  ));
  const x3 = escalarReceta(mezcla, 6); // ×3
  check('unidades mezcladas (g, ml, kg, l, cucharadas, tazas, piezas, pizca) se escalan cada una con SU regla en la misma receta (×3)',
    x3 !== null && x3.ingredientes.map((x) => x.cantidad).join() === '600,1500,3,3,6,1.5,9,1' && x3.ingredientes.every((x) => x.aproximado === undefined && x.sinEscalar === undefined),
    x3 ? x3.ingredientes.map((x) => x.cantidad).join() : 'null');
  const mitad = escalarReceta(mezcla, 1); // ×0,5
  check('…y a la mitad (×0,5): 100 g, 250 ml, 0,5 kg, 0,5 l, 1 cucharada, ¼ taza, 2 dientes (≈: 1,5), la pizca igual',
    mitad !== null && mitad.ingredientes.map((x) => x.cantidad).join() === '100,250,0.5,0.5,1,0.25,2,1' && mitad.ingredientes[6].aproximado === true && mitad.ingredientes[5].aproximado === undefined);
}

/* ═══ F · REDONDEOS EN LOS LÍMITES ═════════════════════════════════════════════════════════════════════════════ */
console.log('\n── F · Redondeos en los límites (reglas [P] de §2.5, SIN REVISAR por alguien que cocine) ──');
{
  /* Receta de 1 porción con UN ingrediente: el factor es directamente las porciones pedidas. */
  const una = (cantidad, unidad, porciones) => escalarReceta(
    { titulo: 't', porciones: 1, ingredientes: [{ texto: 'x', cantidad, ...(unidad ? { unidad } : {}), nombre: 'n' }], pasos: ['p'] }, porciones);
  const dato = (cantidad, unidad, porciones) => { const r = una(cantidad, unidad, porciones); return r ? [r.ingredientes[0].cantidad, r.ingredientes[0].aproximado === true] : null; };
  const TABLA_DE_LIMITES = [
    // g y ml: a 0,5 por debajo de 10; a 1 desde 10; a 5 desde 100 (la regla se aplica a lo que SALE, mitades hacia arriba)
    ['g', 4.7, 2, 9.5, true, '9,4 → 9,5'],
    ['g', 4.95, 2, 10, true, '9,9 → 10'],
    ['g', 5, 2, 10, false, '10 exacto: sin ≈'],
    ['g', 5.2, 2, 10, true, '10,4 → 10'],
    ['g', 5.25, 2, 11, true, '10,5 → 11 (mitad arriba)'],
    ['g', 49.7, 2, 99, true, '99,4 → 99'],
    ['g', 49.75, 2, 100, true, '99,5 → 100'],
    ['g', 50, 2, 100, false, '100 exacto: sin ≈'],
    ['g', 51.2, 2, 100, true, '102,4 → 100 (de 5 en 5)'],
    ['g', 51.25, 2, 105, true, '102,5 → 105 (mitad arriba)'],
    ['g', 52.4, 2, 105, true, '104,8 → 105'],
    ['ml', 62.5, 2, 125, false, 'ml igual que g'],
    ['ml', 0.2, 2, 0.5, true, '0,4 → 0,5 (a medio por debajo de 10)'],
    ['ml', 0.1, 2, 0.5, true, '0,2 → el mínimo: nunca 0'],
    ['g', 1, 10, 10, false, '×10'],
    // kg y l: a 0,05
    ['kg', 0.125, 2, 0.25, false, '0,25 exacto'],
    ['kg', 0.12, 2, 0.25, true, '0,24 → 0,25'],
    ['kg', 0.0125, 2, 0.05, true, '0,025 → 0,05 (mitad arriba y mínimo)'],
    ['l', 0.01, 2, 0.05, true, '0,02 → el mínimo: nunca 0'],
    ['l', 0.375, 2, 0.75, false, '0,75 exacto'],
    ['kg', 1.5, 0.25 * 1, 0.4, true, '×0,25 de 1,5 → 0,375 → 0,4'],
    // cucharadas, cucharaditas, tazas, vasos: a ¼
    ['cucharada', 0.125, 2, 0.25, false, '¼ exacto'],
    ['cucharada', 0.1, 2, 0.25, true, '0,2 → ¼'],
    ['cucharada', 0.06, 2, 0.25, true, '0,12 → el mínimo (¼): nunca 0'],
    ['cucharadita', 0.625, 2, 1.25, false, '1¼ exacto'],
    ['cucharadita', 1.1, 2, 2.25, true, '2,2 → 2¼'],
    ['taza', 0.5, 0.25, 0.25, true, '½ taza ×0,25 = 0,125 → ¼ (mitad arriba)'],
    ['taza', 1, 1.5, 1.5, false, '1½ exacto'],
    ['vaso', 0.6, 2, 1.25, true, '1,2 → 1¼'],
    // piezas: al entero más cercano, mitades hacia arriba, mínimo 1
    [undefined, 1, 2, 2, false, 'entero exacto'],
    [undefined, 1.2, 2, 2, true, '2,4 → 2'],
    [undefined, 1.25, 2, 3, true, '2,5 → 3 (mitad arriba)'],
    [undefined, 1.3, 2, 3, true, '2,6 → 3'],
    [undefined, 0.2, 2, 1, true, '0,4 → el mínimo (1): nunca 0'],
    [undefined, 3, 1.5, 5, true, '4,5 → 5'],
    [undefined, 3, 0.25, 1, true, '0,75 → 1'],
    [undefined, 4, 0.25, 1, false, '1 exacto'],
  ];
  for (const [unidad, cantidad, porciones, cuanto, aprox, nota] of TABLA_DE_LIMITES) {
    const d = dato(cantidad, unidad, porciones);
    check(`límite · ${cantidad} ${unidad ?? '(pieza)'} ×${porciones} → ${cuanto}${aprox ? ' ≈' : ''}  [${nota}]`,
      d !== null && d[0] === cuanto && d[1] === aprox, JSON.stringify(d));
  }
  /* Ningún redondeo da un número con ruido de coma flotante. */
  const limpio = [];
  for (const unidad of ['g', 'ml', 'kg', 'l', 'cucharada', 'cucharadita', 'taza', 'vaso', undefined]) {
    for (const c of [0.1, 0.3, 0.7, 1.1, 2.3, 3.3, 7.7, 12.3, 99.9, 150.1]) {
      for (const f of [0.25, 0.5, 0.75, 1.5, 2, 2.5, 3, 5, 7.5, 10]) {
        const d = dato(c, unidad, f);
        if (!d || !Number.isFinite(d[0]) || d[0] <= 0 || String(d[0]).replace(/^\d+\.?/, '').length > 2) limpio.push(`${c} ${unidad} ×${f} → ${d && d[0]}`);
      }
    }
  }
  check('ningún redondeo sale con ruido de coma flotante (como 0,15000000000000002), ni a cero ni negativo: 900 combinaciones de unidad, cantidad y factor', limpio.length === 0, limpio.slice(0, 5).join(' | '));
  /* Un rango que se aprieta en un solo número deja de ser un rango. */
  const rango = escalarReceta({ titulo: 't', porciones: 4, ingredientes: [{ texto: '2–3 ramas de apio', cantidad: 2, hasta: 3, nombre: 'ramas de apio' }], pasos: ['p'] }, 1);
  check('un rango que se aprieta en un solo número deja de ser un rango: «2–3» ×0,25 → «1» (≈), sin `hasta`',
    rango !== null && igual(rango.ingredientes[0], { texto: '2–3 ramas de apio', cantidad: 1, nombre: 'ramas de apio', aproximado: true }), rango ? JSON.stringify(rango.ingredientes[0]) : 'null');
}

/* ═══ G · LISTA DE COMPRAS ═════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── G · leerLista ──');
{
  const LISTA = T(
    'SECCIÓN: Frutas y verduras',
    '• 2 limones',
    '• 500 g de tomates',
    '• 1 manojo de perejil',
    '',
    'SECCIÓN: Lácteos y huevos',
    '• 1 l de leche',
    '• 12 huevos',
    '',
    'SECCIÓN: Despensa',
    '• 400 g de pasta',
    '• Sal',
    'IMAGEN: a shopping basket',
  );
  const l = leerLista(LISTA);
  checkIgual('leerLista agrupa por «SECCIÓN:»: tres secciones, con sus líneas y sus cantidades', l, {
    secciones: [
      { nombre: 'Frutas y verduras', lineas: [
        { texto: '2 limones', cantidad: 2, nombre: 'limones' },
        { texto: '500 g de tomates', cantidad: 500, unidad: 'g', nombre: 'tomates' },
        { texto: '1 manojo de perejil', cantidad: 1, nombre: 'manojo de perejil' },
      ] },
      { nombre: 'Lácteos y huevos', lineas: [
        { texto: '1 l de leche', cantidad: 1, unidad: 'l', nombre: 'leche' },
        { texto: '12 huevos', cantidad: 12, nombre: 'huevos' },
      ] },
      { nombre: 'Despensa', lineas: [
        { texto: '400 g de pasta', cantidad: 400, unidad: 'g', nombre: 'pasta' },
        { texto: 'Sal' },
      ] },
    ],
  });
  check('leerLista descarta IMAGEN: y no deja `otras` si no sobra nada', l !== null && !('otras' in l) && !/IMAGEN/.test(JSON.stringify(l)));

  const sinTilde = leerLista(T('SECCION: Carnes', '• 1 kg de pollo', 'Sección: Pescados', '• 300 g de merluza', 'sección:   Panadería  ', '• 1 barra de pan'));
  check('«SECCION:» sin tilde, «Sección:» y «sección:» con espacios también agrupan',
    sinTilde !== null && sinTilde.secciones.map((s) => s.nombre).join('|') === 'Carnes|Pescados|Panadería' && sinTilde.secciones.every((s) => s.lineas.length === 1));

  const titulos = leerLista(T('🛒 Lista de la compra', '', '🥬 Frutas y verduras:', '- 2 limones', '- 3 tomates', '', '**Lácteos**', '- 1 l de leche', '', 'Total aproximado: depende de la tienda.'));
  check('sin la marca «SECCIÓN:», una línea suelta seguida de viñetas también abre una sección (con su emoji, sus dos puntos y su negrita quitados)',
    titulos !== null && igual(titulos.secciones.map((s) => [s.nombre, s.lineas.length]), [['Frutas y verduras', 2], ['Lácteos', 1]]), titulos ? JSON.stringify(titulos) : 'null');
  check('…y lo que no es ni sección ni línea (el título de arriba, la prosa de abajo) va a `otras`, en su orden y tal cual: nunca se pierde',
    titulos !== null && igual(titulos.otras, ['🛒 Lista de la compra', 'Total aproximado: depende de la tienda.']), titulos ? JSON.stringify(titulos.otras) : 'null');

  const sinSecciones = leerLista(T('• 2 limones', '• 3 tomates', '2. 1 l de leche'));
  check('viñetas sin ninguna sección: una sola sección sin nombre (nombre vacío), con todas las líneas',
    sinSecciones !== null && sinSecciones.secciones.length === 1 && sinSecciones.secciones[0].nombre === '' && sinSecciones.secciones[0].lineas.length === 3
    && sinSecciones.secciones[0].lineas[2].texto === '1 l de leche');

  const larga = leerLista(T('Esto es una frase muy larga para ser un título de sección de nada', '• 2 limones'));
  check('una línea suelta de MÁS de 7 palabras con viñetas debajo no es un título de sección: va a `otras` y las viñetas quedan en una sección sin nombre',
    larga !== null && larga.secciones.length === 1 && larga.secciones[0].nombre === '' && igual(larga.otras, ['Esto es una frase muy larga para ser un título de sección de nada']), larga ? JSON.stringify(larga) : 'null');
  const siete = leerLista(T('Grupo de siete palabras en total hoy', '• 2 limones'));
  const ocho = leerLista(T('Grupo de ocho palabras en total aquí hoy', '• 2 limones'));
  const ancha = leerLista(T('Supercalifragilisticoespialidoso Supercalifragilisticoespialidoso', '• 2 limones'));
  check('el límite de un título de sección: siete palabras sí; ocho no; y más de 60 caracteres tampoco aunque sean pocas palabras',
    siete !== null && siete.secciones[0].nombre === 'Grupo de siete palabras en total hoy'
    && ocho !== null && ocho.secciones[0].nombre === '' && igual(ocho.otras, ['Grupo de ocho palabras en total aquí hoy'])
    && ancha !== null && ancha.secciones[0].nombre === '' && ancha.otras.length === 1 && ancha.otras[0].length > 60);
  const conPunto = leerLista(T('Compra esto hoy.', '• 2 limones'));
  check('…ni una línea corta que acaba en punto («Compra esto hoy.»)', conPunto !== null && conPunto.secciones[0].nombre === '' && igual(conPunto.otras, ['Compra esto hoy.']));
  const sinViñetas = leerLista(T('SECCIÓN: Fruta', '2 limones', '3 tomates', 'media docena de huevos', 'Sal'));
  check('en una lista, las líneas SIN viñeta que empiezan con una cantidad también son líneas; la que no («Sal») va a `otras`',
    sinViñetas !== null && igual(sinViñetas.secciones[0].lineas.map((x) => x.texto), ['2 limones', '3 tomates', 'media docena de huevos']) && igual(sinViñetas.otras, ['Sal']), sinViñetas ? JSON.stringify(sinViñetas) : 'null');
  const rayas = leerLista(T('SECCIÓN: Fruta', '---', '• 2 limones', '***', '•', '-', '• 3 peras'));
  check('en una lista, las rayas y las viñetas vacías no son nada: ni líneas ni `otras`', rayas !== null && rayas.secciones[0].lineas.length === 2 && !('otras' in rayas));

  const vacias = leerLista(T('SECCIÓN: Vacía', 'SECCIÓN: Con algo', '• 2 limones'));
  check('una sección sin líneas no sale', vacias !== null && vacias.secciones.length === 1 && vacias.secciones[0].nombre === 'Con algo');

  const casillas = leerLista(T('SECCIÓN: Fruta', '[ ] 2 limones', '[x] 3 peras', '☐ 1 melón', '☑ 4 kiwis'));
  check('las casillas («[ ]», «[x]», «☐», «☑») no entran en el texto de la línea', casillas !== null && casillas.secciones[0].lineas.map((x) => x.texto).join('|') === '2 limones|3 peras|1 melón|4 kiwis');

  const regalo = leerLista(T('SECCIÓN: Fruta', '• 2–3 limones', '• ½ kg de fresas', '• 2 dl de zumo'));
  check('las cantidades de la lista se leen igual que las de una receta: rango, fracción y lo que no se entiende (sin cantidad)',
    igual(regalo.secciones[0].lineas, [
      { texto: '2–3 limones', cantidad: 2, hasta: 3, nombre: 'limones' },
      { texto: '½ kg de fresas', cantidad: 0.5, unidad: 'kg', nombre: 'fresas' },
      { texto: '2 dl de zumo' },
    ]));

  for (const [que, texto] of [['un texto sin viñetas ni secciones', 'Necesitas limones, tomates y un poco de leche para esta semana.'], ['un título y nada más', 'SECCIÓN: Fruta'], ['vacío', ''], ['solo la marca interna', 'IMAGEN: a basket']]) {
    check(`AC-17 · leerLista de ${que}: null`, leerLista(texto) === null);
  }
}

/* ═══ H · PUREZA ═══════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── H · Funciones puras: no mutan, son deterministas y no dependen de nada de fuera ──');
{
  /* CONTROL: este detector de mutación de verdad detecta una mutación. */
  const mutadora = (r) => { r.ingredientes[0].cantidad = 999; return r; };
  const ctl = lanza(() => mutadora(congelar(clon(BASE))));
  check('CONTROL · una función que MUTARA una entrada congelada lanzaría (el detector de inmutabilidad funciona)', ctl instanceof TypeError);

  const entrada = congelar(clon(BASE));
  const foto = JSON.stringify(entrada);
  let error = null; let salida = null;
  try { salida = escalarReceta(entrada, 6); } catch (e) { error = e; }
  check('escalarReceta con la receta CONGELADA (profunda) no lanza: no muta nada', error === null && salida !== null, error ? error.message : '');
  check('…y la entrada queda byte a byte como estaba', JSON.stringify(entrada) === foto);
  check('…y la salida no comparte ningún objeto ni arreglo con la entrada',
    salida.ingredientes !== entrada.ingredientes && salida.pasos !== entrada.pasos && salida.ingredientes.every((x) => !entrada.ingredientes.includes(x))
    && (!salida.otras || salida.otras !== entrada.otras));

  const conOtras = congelar(clon({ ...BASE, otras: ['una nota'] }));
  const s2 = escalarReceta(conOtras, 8);
  check('con `otras` también: se copia y la entrada no cambia', s2 !== null && igual(s2.otras, ['una nota']) && s2.otras !== conOtras.otras);

  /* Determinismo: la misma entrada, doce veces, la misma salida. */
  const docena = (f) => Array.from({ length: 12 }, () => JSON.stringify(f()));
  const iguales = (xs) => xs.every((x) => x === xs[0]);
  check('determinismo: leerReceta da lo mismo en 12 corridas (los 15 textos de ejemplo)', EJEMPLOS.every((e) => iguales(docena(() => leerReceta(e.texto)))));
  check('determinismo: escalarReceta da lo mismo en 12 corridas (4→6, 4→1, 4→2)', [6, 1, 2].every((p) => iguales(docena(() => escalarReceta(clon(BASE), p)))));
  check('determinismo: leerLista da lo mismo en 12 corridas', iguales(docena(() => leerLista(T('SECCIÓN: A', '• 2 limones', 'SECCIÓN: B', '• 1 l de leche')))));
  check('el orden en que se llama no importa (sin estado oculto): leer, escalar y leer otra vez dan lo mismo',
    (() => { const a = leerReceta(TABLA); escalarReceta(a, 6); escalarReceta(a, 1); return igual(a, leerReceta(TABLA)); })());
  check('una expresión regular global compartida no deja «memoria» entre llamadas: la misma línea, 30 veces, siempre igual',
    (() => { const uno = leerReceta(EJEMPLOS[3].texto); for (let i = 0; i < 30; i++) if (!igual(leerReceta(EJEMPLOS[3].texto), uno)) return false; return true; })());

  /* Por fuera: el código fuente no toca nada del entorno. */
  const fuente = leer('utils/recetaDeChef.ts');
  const codigo = sinComentarios(fuente);
  const PROHIBIDO = /\b(?:Date|Math\.random|toLocale\w*|Intl|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|AsyncStorage|process\.|require\(|import\(|useState|useEffect|useRef|useT\b|useMemo|React|firebase|setTimeout|setInterval|Promise|async|await|console\.|window|document|navigator|globalThis|structuredClone|eval)\b/;
  const detectado = PROHIBIDO.exec(codigo);
  check('puro: sin Date, Math.random, toLocale*, Intl, red, almacenamiento, React, traductor, promesas ni consola', detectado === null, detectado ? `aparece «${detectado[0]}»` : '');
  const imports = [...fuente.matchAll(/^\s*import\s+(?:type\s+)?[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  check('solo importa `./textoDeResultado` (para `sinMarcasInternas`): ni i18n, ni constantes, ni servicios', imports.length === 1 && imports[0] === './textoDeResultado', imports.join(', '));
  check('reutiliza `sinMarcasInternas` y NO copia la expresión de IMAGEN:/PROBAR:/NARRACIÓN: en el código', /sinMarcasInternas\(/.test(codigo) && !/IMAGEN|PROBAR|NARRACI/i.test(codigo));
  check('rotula en el propio código que las reglas culinarias del escalado están sin revisar por alguien que cocine (UNKNOWN)', /sin revisar/i.test(fuente) && /UNKNOWN/.test(fuente) && /\[P\]/.test(fuente));
  check('no escribe textos de interfaz ni precios: ni «Credits», ni «€», ni un traductor `t(…)`', !/credits|€|\buseT\b|(?<![\p{L}\p{N}_.])t\(/iu.test(codigo));
  check('CONTROL · el detector de pureza detecta lo que debe: una función con Date, Math.random o toLocaleString daría rojo',
    ['const a = new Date()', 'const b = Math.random()', 'x.toLocaleString("es")', 'useState(0)', 'await fetch(u)'].every((s) => PROHIBIDO.test(s)));
}

/* ═══ I · UN BARRIDO DETERMINISTA DE TEXTOS ROTOS ══════════════════════════════════════════════════════════════ */
console.log('\n── I · Barrido determinista de textos rotos: nunca lanza y todo lo que devuelve cumple el contrato ──');
{
  /* Un generador congruencial fijo: la misma semilla, la mismas 600 «recetas rotas» en cualquier máquina. */
  let semilla = 20261012;
  const azar = () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla / 4294967296; };
  const elige = (xs) => xs[Math.floor(azar() * xs.length)];
  const TROZOS = [
    '🍝 Pasta al pesto', '🥗 Ensalada', 'Receta rápida', 'Para 4 personas · 30 minutos', 'Rinde 6 porciones', 'Tiempo total: 1 h 20 min', 'Para 2-3 personas', 'Porciones: 4',
    'Ingredientes:', 'Ingredientes (4 personas):', 'INGREDIENTES:', 'Pasos:', 'Preparación:', 'Paso a paso:', 'Consejo: no lo muevas', 'CONSEJO:', 'IMAGEN: a bowl', 'PROBAR: otra',
    '• 2 huevos', '• 250 g de harina', '- 1/2 taza de leche', '* 1½ cucharadas de miel', '• 2–3 dientes de ajo', '• 1.000 g de arroz', '• 1,5 kg de papas', '• 2 dl de vino',
    '• 1 taza (240 ml) de agua', '• Una docena de huevos', '• Sal al gusto', '• Un chorrito de aceite', '• 1 pizca de sal', '• 3 x 400 g de tomate', '• 1 cebolla, 2 ajos',
    '• 0 g de sal', '• 1/0 taza', '• ', '•', '-', '1. Mezcla.', '2) Hornea 20 minutos a 180 °C.', 'Paso 3: Sirve.', '10. Fin', '11) otra', '12.', 'texto suelto sin sentido',
    '', '', '   ', '---', '**negrita**', '## Título', '¡Claro! Aquí tienes:', '👨‍🍳 Chef', '[ ] 2 limones', 'SECCIÓN: Frutas', 'SECCION:', '9999999999999999999999 g de sal', '• 1e5 g de sal',
    '• ½', '• ¼ de', '• 2–', '• –3 huevos', '• 3–2 huevos', '• 2 – 3 – 4 huevos', '• \u0000 2 huevos', '• 2\u{200B} huevos', '• 𝟐 huevos', '• ٢ huevos',
  ];
  const RUIDO = ['\u{301}', '\u{A0}', '\u{200B}', '·', '\t', '€', '%', '(', ')', ':', '.', ',', '…'];
  const textos = [];
  for (let i = 0; i < 600; i++) {
    const n = 2 + Math.floor(azar() * 13);
    let t = Array.from({ length: n }, () => elige(TROZOS)).join(azar() < 0.1 ? '\r\n' : '\n');
    if (azar() < 0.3) { const p = Math.floor(azar() * t.length); t = t.slice(0, p) + elige(RUIDO) + t.slice(p); }
    textos.push(t);
  }
  /* Y cinco recetas buenas mezcladas con ruido, para que el barrido no sea vacío. */
  for (const e of EJEMPLOS.slice(0, 8)) textos.push(e.texto, `${elige(TROZOS)}\n${e.texto}\n${elige(TROZOS)}`);

  const UNIDADES = new Set(['g', 'kg', 'ml', 'l', 'cucharada', 'cucharadita', 'taza', 'vaso', 'pizca']);
  const cadenaLlena = (s) => typeof s === 'string' && s.length > 0 && s === s.trim();
  const numeroBueno = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0;
  const validaLinea = (x, escalada) => {
    if (!x || !cadenaLlena(x.texto)) return 'texto';
    if (x.cantidad !== undefined && !numeroBueno(x.cantidad)) return `cantidad ${x.cantidad}`;
    if (x.hasta !== undefined && !(numeroBueno(x.hasta) && x.hasta > x.cantidad)) return `hasta ${x.hasta}`;
    if (x.unidad !== undefined && !UNIDADES.has(x.unidad)) return `unidad ${x.unidad}`;
    if (x.cantidad !== undefined && !cadenaLlena(x.nombre)) return 'cantidad sin nombre';
    if (x.nombre !== undefined && !cadenaLlena(x.nombre)) return 'nombre';
    if ((x.hasta !== undefined || x.unidad !== undefined) && x.cantidad === undefined) return 'hasta/unidad sin cantidad';
    for (const marca of ['aproximado', 'sinEscalar']) if (x[marca] !== undefined && x[marca] !== true) return marca;
    if (!escalada && (x.aproximado !== undefined || x.sinEscalar !== undefined)) return 'aviso al leer';
    if (Object.values(x).some((v) => v === undefined)) return 'clave vacía';
    return '';
  };
  const validaReceta = (r, escalada = false) => {
    if (!r || typeof r !== 'object') return 'no es objeto';
    if (!cadenaLlena(r.titulo)) return 'título';
    if (r.emoji !== undefined && !cadenaLlena(r.emoji)) return 'emoji';
    if (r.porciones !== undefined && !(numeroBueno(r.porciones) && (escalada || (Number.isInteger(r.porciones) && r.porciones <= 99)))) return `porciones ${r.porciones}`;
    if (r.minutos !== undefined && !(Number.isInteger(r.minutos) && r.minutos > 0)) return `minutos ${r.minutos}`;
    if (!Array.isArray(r.ingredientes) || r.ingredientes.length === 0) return 'ingredientes';
    if (!Array.isArray(r.pasos) || r.pasos.length === 0 || !r.pasos.every(cadenaLlena)) return 'pasos';
    if (r.consejo !== undefined && !cadenaLlena(r.consejo)) return 'consejo';
    if (r.otras !== undefined && !(Array.isArray(r.otras) && r.otras.length > 0 && r.otras.every(cadenaLlena))) return 'otras';
    for (const x of r.ingredientes) { const m = validaLinea(x, escalada); if (m) return `ingrediente: ${m} ${JSON.stringify(x)}`; }
    const MARCA_INTERNA = /^\s*(?:[-•*]\s*)?\**\s*(?:IMAGEN|PROBAR|NARRACI[ÓO]N)\s*\**\s*:/i;
    if ([r.titulo, ...r.pasos, r.consejo ?? '', ...(r.otras ?? []), ...r.ingredientes.map((x) => x.texto)].some((s) => MARCA_INTERNA.test(s))) return 'marca interna';
    if (Object.values(r).some((v) => v === undefined)) return 'clave vacía';
    return '';
  };
  const validaLista = (l) => {
    if (!l || !Array.isArray(l.secciones) || l.secciones.length === 0) return 'secciones';
    for (const s of l.secciones) {
      if (typeof s.nombre !== 'string' || s.nombre !== s.nombre.trim()) return 'nombre de sección';
      if (!Array.isArray(s.lineas) || s.lineas.length === 0) return 'sección vacía';
      for (const x of s.lineas) { const m = validaLinea(x, false); if (m) return `línea: ${m}`; }
    }
    if (l.otras !== undefined && !(Array.isArray(l.otras) && l.otras.length > 0 && l.otras.every(cadenaLlena))) return 'otras';
    return '';
  };

  let lanzadas = 0; let recetas = 0; let escaladas = 0; let listas = 0; const malas = [];
  for (const t of textos) {
    try {
      const r = leerReceta(t);
      if (r) {
        recetas++;
        const m = validaReceta(r); if (m) malas.push(`leerReceta: ${m}`);
        if (r.porciones !== undefined) {
          for (const p of [1, 2, 3, 6, 8, 12, 40, 100]) {
            const e = escalarReceta(congelar(clon(r)), p);
            if (e) {
              escaladas++;
              const me = validaReceta(e, true); if (me) malas.push(`escalarReceta ${p}: ${me}`);
              if (e.porciones !== p || !igual(e.pasos, r.pasos) || e.minutos !== r.minutos || e.titulo !== r.titulo || e.consejo !== r.consejo || !igual(e.otras, r.otras)) malas.push(`escalarReceta ${p}: cambió lo que no se escala`);
              if (e.ingredientes.length !== r.ingredientes.length || e.ingredientes.some((x, i) => x.texto !== r.ingredientes[i].texto)) malas.push(`escalarReceta ${p}: cambió la lista`);
            }
          }
        }
      }
      const l = leerLista(t);
      if (l) { listas++; const m = validaLista(l); if (m) malas.push(`leerLista: ${m}`); }
    } catch (e) {
      lanzadas++;
      if (malas.length < 8) malas.push(`LANZÓ ${e && e.message} con ${JSON.stringify(t).slice(0, 120)}`);
    }
  }
  check(`${textos.length} textos rotos: ni leerReceta, ni escalarReceta ni leerLista lanzan una sola excepción`, lanzadas === 0, `${lanzadas} excepciones`);
  check('todo lo que devuelven cumple el contrato (título, ingredientes y pasos no vacíos; números buenos; unidades de la lista; sin claves vacías; sin marcas internas)', malas.length === 0, malas.slice(0, 4).join(' | '));
  check('CONTROL · el barrido no es vacío: se leyeron recetas, se escalaron y se leyeron listas', recetas >= 20 && escaladas >= 50 && listas >= 100, `${recetas} recetas · ${escaladas} escaladas · ${listas} listas`);
  check('CONTROL · el validador del barrido detecta una receta rota (una cantidad negativa y una clave vacía)',
    validaReceta({ titulo: 't', ingredientes: [{ texto: 'x', cantidad: -1, nombre: 'n' }], pasos: ['p'] }) !== ''
    && validaReceta({ titulo: 't', minutos: undefined, ingredientes: [{ texto: 'x' }], pasos: ['p'] }) !== ''
    && validaReceta({ titulo: 't', ingredientes: [{ texto: 'x' }], pasos: ['p'] }) === '');
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
