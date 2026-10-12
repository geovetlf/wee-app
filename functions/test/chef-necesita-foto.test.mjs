/*
 * WEË CHEF · ¿PIDE FOTO ESTE FLUJO? (CHEF-03b, preparación pura; ronda R9, CHF3, 2026-10-12).
 *
 *   node test/chef-necesita-foto.test.mjs
 *
 * `utils/necesitaFoto.ts` es la regla `needsPhoto` de `CreatorFlowScreen` sacada a una función pura, SIN cambiarla. Esta
 * suite exige que las dos digan lo mismo en todas las combinaciones (experiencia × puerta × objetivo): mientras la pantalla
 * no la use, no pueden separarse. Y fija como `HOY` el defecto D-CHEF-2 (la frase empezada de «Sustituir ingredientes»
 * pide foto por la palabra «ingredientes»), que CHEF-03b arreglará en la función con una línea —espera a CHEF-03a, a D-1 y
 * a D-3—. Sin red, sin proveedores.
 */
import { crearCargador, leer } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const cargar = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
let necesitaFoto;
try {
  ({ necesitaFoto } = cargar('utils/necesitaFoto.ts'));
} catch (e) {
  check('el módulo utils/necesitaFoto.ts existe y se carga', false, String(e.message).slice(0, 160));
  process.exit(1);
}
check('el módulo exporta necesitaFoto', typeof necesitaFoto === 'function');

/* La regla de la pantalla, tal como está escrita hoy: se corta del fuente y se evalúa (no se copia a mano). */
const fuente = leer('screens/CreatorFlowScreen.tsx');
const desde = fuente.indexOf('const needsPhoto =');
const expresion = fuente.slice(desde + 'const needsPhoto ='.length, fuente.indexOf(';', desde));
const deLaPantalla = new Function('experience', 'params', `return (${expresion});`);
check('la regla de la pantalla se encuentra y se puede evaluar', desde > 0 && /experience\.id === 'chef'/.test(expresion));

const { crearTraductor } = cargar('i18n/traducir.ts');
const t = crearTraductor('es', { es: cargar('i18n/textos/es/index.ts').es, en: cargar('i18n/textos/en/index.ts').en }, {});
const CHEF = cargar('constants/chefTools.ts');
const { WEE_EXPERIENCES } = cargar('constants/weeExperiences.ts');

const EXPERIENCIAS = [...new Set([...(WEE_EXPERIENCES ?? []).map((e) => e.id), 'photo', 'home', 'beauty', 'studio', 'chef', 'brain'])];
const PUERTAS = [undefined, ...['cook', 'edit', 'animate', 'recipe', 'menu', 'swap', 'nutrition', 'shopping', 'otra'].map((optionId) => ({ questionId: 'what', optionId }))];
/* Las frases empezadas de los tres paneles, de VERDAD (las que deja la pantalla), y objetivos sueltos. */
const FRASES_DE_PANEL = Object.entries(CHEF.ENTRADAS_POR_PANEL ?? {}).flatMap(([panel, entradas]) =>
  entradas.map((e) => t('chef.panelStart', { panel: t({ nutrition: 'chef.nutritionTitle', swap: 'chef.swapTitle', shopping: 'chef.shoppingTitle' }[panel]), que: t(e.clave) })));
const OBJETIVOS = [undefined, '', 'Una cena para mis amigos', 'Cocinar con los ingredientes que tengo en casa', 'una foto de mi NEVERA', 'lo que hay en el refri', 'anima esta imagen', ...FRASES_DE_PANEL];

let combinaciones = 0;
const distintas = [];
for (const experienceId of EXPERIENCIAS) for (const preset of PUERTAS) for (const goal of OBJETIVOS) {
  combinaciones++;
  const a = necesitaFoto({ experienceId, preset, goal });
  const b = !!deLaPantalla({ id: experienceId }, { preset, goal });
  if (a !== b) distintas.push(`${experienceId}/${preset?.optionId ?? '-'}/${goal}`);
}
check('EQUIVALENCIA · la función y la pantalla dicen lo mismo en todas las combinaciones (experiencia × puerta × objetivo)',
  distintas.length === 0 && combinaciones > 500, `${combinaciones} combinaciones · ${distintas.length} distintas ${distintas.slice(0, 3).join(' | ')}`);
check('CONTROL · el barrido incluye las frases de los tres paneles de Chef', FRASES_DE_PANEL.length >= 9, `${FRASES_DE_PANEL.length} frases`);

/* Lo que la regla hace hoy, por casos con nombre. */
check('CONTRATO · Photo, Home y Beauty siempre piden foto', ['photo', 'home', 'beauty'].every((experienceId) => necesitaFoto({ experienceId })));
check('CONTRATO · Chef pide foto al entrar por `cook` (mirar ingredientes) y por `edit` (retocar el plato)',
  necesitaFoto({ experienceId: 'chef', preset: { questionId: 'what', optionId: 'cook' } }) && necesitaFoto({ experienceId: 'chef', preset: { questionId: 'what', optionId: 'edit' } }));
check('CONTRATO · una receta escrita sin palabras de foto no la pide', !necesitaFoto({ experienceId: 'chef', goal: 'Una lasaña para cuatro' }));
const sinLactosa = CHEF.ENTRADAS_POR_PANEL?.swap?.find((e) => /lactos/i.test(t(e.clave)));
const fraseSwap = sinLactosa && t('chef.panelStart', { panel: t('chef.swapTitle'), que: t(sinLactosa.clave) });
check('HOY · D-CHEF-2 · la frase empezada de «Sustituir ingredientes» pide foto por la palabra «ingredientes» (CHEF-03b lo arregla aquí, con una línea)',
  !!fraseSwap && necesitaFoto({ experienceId: 'chef', goal: `${fraseSwap}una lasaña` }), fraseSwap);
check('HOY · D-CHEF-2 · y aunque llegue la puerta `swap` (tras CHEF-03a/03b), hoy la seguiría pidiendo: las palabras no miran si hay puerta',
  !!fraseSwap && necesitaFoto({ experienceId: 'chef', preset: { questionId: 'what', optionId: 'swap' }, goal: `${fraseSwap}una lasaña` }));
check('CONTRATO · la pantalla todavía NO usa la función (se cablea con CHEF-03b): por eso existe la equivalencia de arriba',
  !/necesitaFoto/.test(fuente));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
