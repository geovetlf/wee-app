/*
 * QUÉ EXPERIENCIAS CONOCE WEË BRAIN, Y QUIÉN LO DECIDE.
 *
 * ── El fallo que esto impide que vuelva ─────────────────────────────────────
 *
 * `BRAIN_SPECIALISTS` era `Record<string, string>`. Cuando llegó Weë Travel —la
 * undécima experiencia— la tabla se quedó en las diez de entonces, el compilador
 * no tenía forma de verlo, y el resultado fue que Weë Brain no podía ni sugerir
 * Weë Travel ni derivar a ella: la marca [[WEE:travel]] se descartaba en
 * silencio y el prompt ni la mencionaba.
 *
 * No era el primer sitio donde pasaba. `creator/index.ts` tuvo el mismo desfase
 * y allí se resolvió DERIVANDO la lista de `TEMPLATES`. Aquí no se puede
 * derivar del todo —las frases con las que se le nombra cada especialista al
 * modelo no existen en ningún otro sitio—, así que lo que se hace es obligar al
 * tipo: el Record es TOTAL sobre `ExperienceId`, y quien añada una experiencia
 * nueva tiene que decir qué pasa con ella.
 *
 * ── Lo que se comprueba y lo que NO ─────────────────────────────────────────
 *
 * No se busca la palabra «travel» por el código: eso solo demostraría que
 * alguien la escribió. Lo que se comprueba es LA REGLA:
 *
 *   una experiencia entra en una proyección  ⟺  tiene descripción de
 *   especialista  ∧  todas las capacidades que su plantilla puede necesitar
 *   están ROUTABLE en el catálogo
 *
 * Esa regla se verifica sobre las ONCE, ejecutando las plantillas de verdad y
 * leyendo el catálogo de verdad. Si mañana entra una duodécima experiencia, o
 * si a alguien se le quita una capacidad, esto lo ve.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
/* Los comentarios no aprueban pruebas: se quitan antes de mirar el código. */
const soloCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '  ✔ ' : '  ✘ ') + n + ') ' + nombre + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const { TEMPLATES } = lib('creator/templates.js');
const { BRAIN_CHAT_SYSTEM } = lib('creator/prompts.js');
const { BRAIN_SPECIALISTS, EXPERIENCIAS_PARA_DERIVAR, EXPERIENCIAS_PARA_SUGERIR } = lib('creator/experiencias.js');
const { guessExperience } = lib('creator/brain.js');
const { CAPABILITY_CATALOG } = lib('core/index.js');

const TIPOS = leer('functions/src/creator/types.ts');
const PROMPTS = leer('functions/src/creator/prompts.ts');
const EXPS = leer('functions/src/creator/experiencias.ts');
const BRAIN = leer('functions/src/creator/brain.ts');
const MOCK = leer('functions/src/gateway/providers/mock.ts');

/* La autoridad se lee del fuente porque es un TIPO: en ejecución no existe, y
   eso es justamente lo que la hace autoridad —la comprueba el compilador—. */
const CANONICAS = (/export type ExperienceId =([\s\S]*?);/.exec(TIPOS)[1])
  .split('|').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);

const estado = (id) => (CAPABILITY_CATALOG.find((c) => c.id === id) || {}).status;

/* Todo lo que la plantilla de una experiencia puede llegar a pedir: se ejecuta
   `buildPlan` con cada respuesta posible, no se adivina leyendo. */
const capacidadesDe = (id) => {
  const t = TEMPLATES[id];
  const combos = [{}];
  for (const q of t.questions || []) for (const o of q.options || []) combos.push({ [q.id]: o.id });
  const vistas = new Set();
  for (const c of combos) for (const s of t.buildPlan(t.defaultGoal, c).steps) vistas.add(s.capability);
  return [...vistas];
};
const puedeTrabajar = (id) => capacidadesDe(id).every((c) => estado(c) === 'ROUTABLE');
const esEspecialista = (id) => BRAIN_SPECIALISTS[id] !== null;

console.log('\n── La autoridad ──');

check('F1) `travel` es miembro de `ExperienceId`, que es la autoridad',
  CANONICAS.includes('travel') && CANONICAS.length === 11,
  CANONICAS.length + ': ' + CANONICAS.join(', '));
check('F14) y no hay una segunda: las tablas del servidor son TOTALES sobre ese tipo',
  /BRAIN_SPECIALISTS: Record<ExperienceId, string \| null>/.test(EXPS)
  && /EMOJI: Record<ExperienceId, string>/.test(MOCK)
  && /KEYWORDS: Partial<Record<ExperienceId, readonly string\[\]>>/.test(BRAIN),
  'BRAIN_SPECIALISTS · EMOJI · KEYWORDS');
/*
 * Las proyecciones viven aparte del módulo de prompts, y no por gusto: dos
 * guardas que ya existían lo exigen. G18 no deja entrar nada de Legacy en
 * `prompts.ts` y G20 no deja escribir capacidades a mano donde se arma el
 * vocabulario. Ninguna de las dos se ha tocado; lo que se movió es el código.
 */
check('14) y `prompts.ts` sigue limpio: ni Legacy, ni capacidades a mano',
  !/creator\/templates|TEMPLATES|buildPlan/.test(PROMPTS)
  && !/music\.generate/.test(PROMPTS),
  'las guardas de G18 y G20 siguen mandando sobre ese archivo');
check('F16) `TEMPLATES` sigue siendo `Record<ExperienceId, …>` y cubre las once',
  /TEMPLATES: Record<ExperienceId, ExperienceTemplate>/.test(leer('functions/src/creator/templates.ts'))
  && igual(Object.keys(TEMPLATES).sort(), [...CANONICAS].sort()));
check('F17) `EXPERIENCE_ROLE` sigue protegido por `ExperienceId`',
  /EXPERIENCE_ROLE: Record<ExperienceId, string>/.test(PROMPTS));
check('F18) `STYLE_WORDS` sigue protegido por `ExperienceId`',
  /STYLE_WORDS: Record<ExperienceId, string>/.test(PROMPTS));
check('18) y `EXPERIENCES` se sigue DERIVANDO de `TEMPLATES`, no escribiéndose',
  /const EXPERIENCES = new Set<string>\(Object\.keys\(TEMPLATES\)\)/.test(leer('functions/src/creator/index.ts')));

console.log('\n── LA REGLA, sobre las once ──');

/*
 * Ni una sola comprobación textual aquí. Se mira si la pertenencia a cada
 * proyección COINCIDE con la regla, experiencia por experiencia. Una tabla
 * escrita a mano que acertara por casualidad seguiría fallando en cuanto la
 * realidad —el catálogo, una plantilla— se moviera un milímetro.
 */
const desviadas = CANONICAS.filter((id) => {
  const debe = esEspecialista(id) && puedeTrabajar(id);
  return EXPERIENCIAS_PARA_DERIVAR.includes(id) !== debe || EXPERIENCIAS_PARA_SUGERIR.includes(id) !== debe;
});
check('F13) la pertenencia a las proyecciones SIGUE LA REGLA en las once',
  desviadas.length === 0,
  desviadas.length ? 'se desvían: ' + desviadas.join(', ')
    : CANONICAS.map((id) => id + (EXPERIENCIAS_PARA_DERIVAR.includes(id) ? '✓' : '✗')).join(' '));

check('F2/F3) `travel` cumple las DOS condiciones, así que entra en las dos proyecciones',
  esEspecialista('travel') && puedeTrabajar('travel')
  && EXPERIENCIAS_PARA_DERIVAR.includes('travel') && EXPERIENCIAS_PARA_SUGERIR.includes('travel'),
  'capacidades: ' + capacidadesDe('travel').map((c) => c + '[' + estado(c) + ']').join(' '));
check('3) y el modelo la ve: aparece nombrada y su id está en la lista del prompt',
  /Weë Travel/.test(BRAIN_CHAT_SYSTEM)
  && /usando el id del especialista \([^)]*\btravel\b[^)]*\)/.test(BRAIN_CHAT_SYSTEM),
  'antes el prompt ni la mencionaba');

console.log('\n── Music: existe, y su exclusión tiene causa medible ──');

check('F4) `music` sigue siendo `ExperienceId` y sigue teniendo plantilla',
  CANONICAS.includes('music') && !!TEMPLATES.music,
  'nada de esto la borra');
check('F5) y NO se la excluye por no ser especialista: tiene su descripción',
  typeof BRAIN_SPECIALISTS.music === 'string' && BRAIN_SPECIALISTS.music.length > 0,
  'la exclusión histórica era una omisión; ahora es una lectura del catálogo');
const faltanAMusic = capacidadesDe('music').filter((c) => estado(c) !== 'ROUTABLE');
check('F6) queda fuera por una razón técnica verificable: su plantilla pide algo no enrutable',
  faltanAMusic.length > 0
  && !EXPERIENCIAS_PARA_DERIVAR.includes('music') && !EXPERIENCIAS_PARA_SUGERIR.includes('music'),
  faltanAMusic.map((c) => c + '[' + estado(c) + ']').join(' '));
check('6) y es la ÚNICA a la que le falta algo: nadie más se cae por esta regla',
  CANONICAS.filter((id) => !puedeTrabajar(id)).join(',') === 'music',
  'medido ejecutando las once plantillas contra el catálogo');

console.log('\n── Brain: fuera por lo que ES, y dicho en su sitio ──');

check('F7/F8) `brain` está declarado `null`: la exclusión es explícita, no un olvido',
  BRAIN_SPECIALISTS.brain === null
  && !EXPERIENCIAS_PARA_DERIVAR.includes('brain') && !EXPERIENCIAS_PARA_SUGERIR.includes('brain'),
  'y sigue siendo ExperienceId: ' + CANONICAS.includes('brain'));
check('7) el motivo es comprobable: la app ya descarta esa sugerencia',
  /exp && exp\.id !== 'brain' \? exp : null/.test(soloCodigo(leer('screens/BrainChatScreen.tsx'))),
  'derivar el chat a sí mismo no lleva a ninguna parte');

console.log('\n── Las dos proyecciones ──');

check('F20) son dos expresiones distintas sobre la MISMA tabla: pueden diferir',
  /EXPERIENCIAS_PARA_DERIVAR: readonly ExperienceId\[\] =\s*TODAS\.filter/.test(soloCodigo(EXPS))
  && /EXPERIENCIAS_PARA_SUGERIR: readonly ExperienceId\[\] =\s*TODAS\.filter/.test(soloCodigo(EXPS))
  && !/EXPERIENCIAS_PARA_(DERIVAR|SUGERIR)[^=]*=\s*\[/.test(soloCodigo(EXPS)),
  'ninguna es una lista literal');
check('20) hoy coinciden, y se dice por qué: los dos motivos valen para las dos',
  igual([...EXPERIENCIAS_PARA_DERIVAR], [...EXPERIENCIAS_PARA_SUGERIR]),
  EXPERIENCIAS_PARA_DERIVAR.length + ' cada una: ' + EXPERIENCIAS_PARA_DERIVAR.join(', '));
check('20) y las nueve son exactamente las ocho de antes más Weë Travel',
  igual([...EXPERIENCIAS_PARA_DERIVAR].sort(),
    ['design', 'studio', 'photo', 'writer', 'beauty', 'chef', 'home', 'business', 'travel'].sort()),
  'la corrección añade una; no quita ninguna');

console.log('\n── Las costuras que consumen el vocabulario ──');

check('9) `brainChat` alimenta al Core con la proyección, no con la tabla',
  /crearBrainDeWee\(\{ pensador, experiences: EXPERIENCIAS_PARA_DERIVAR \}\)/.test(soloCodigo(BRAIN))
  && !/experiences: Object\.keys\(BRAIN_SPECIALISTS\)/.test(soloCodigo(BRAIN)));
check('9) y el respaldo por palabras clave tampoco puede proponer fuera del vocabulario',
  /\.filter\(\(\[id\]\) => EXPERIENCIAS_PARA_DERIVAR\.includes\(id\)\)/.test(soloCodigo(BRAIN)),
  'era el segundo productor de `suggestedExperience` y no lo validaba nadie');
const bloqueKeywords = /KEYWORDS: Partial<Record<ExperienceId, readonly string\[\]>> = \{([\s\S]*?)\n\};/.exec(BRAIN)[1];
const clavesKeywords = [...bloqueKeywords.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
check('F9) ninguna clave de KEYWORDS es una experiencia inexistente',
  clavesKeywords.length > 0 && clavesKeywords.every((k) => CANONICAS.includes(k)),
  clavesKeywords.length + ' claves: ' + clavesKeywords.join(', '));
const palabrasKeywords = [...bloqueKeywords.matchAll(/'([^']*)'/g)].map((m) => m[1]);
check('9) y su contenido sigue intacto: se protegieron las claves, no se inventaron palabras',
  igual(clavesKeywords, ['design', 'studio', 'photo', 'writer', 'beauty', 'chef', 'home', 'business'])
  && palabrasKeywords.length === 79,
  palabrasKeywords.length + ' palabras, las mismas de siempre');
check('9) y sigue acertando lo de siempre',
  guessExperience('quiero una receta de cena') === 'chef'
  && guessExperience('hazme un logo') === 'design'
  && guessExperience('buenos días') === undefined);
check('F10) `EMOJI` cubre las once y ya no se le escapa Weë Travel',
  /travel: '✈️'/.test(MOCK) && !/EMOJI: Record<string, string>/.test(MOCK),
  'el `?? "✨"` tapaba la ausencia');

console.log('\n── La frontera del Plan no se movió ──');

const PLANNER = soloCodigo(leer('functions/src/planner/index.ts')) + soloCodigo(leer('functions/src/core/planner.ts'));
check('F15) el Core Planner no sabe nada de experiencias, ni de estas listas',
  !/experience/i.test(PLANNER)
  && !/BRAIN_SPECIALISTS|KEYWORDS|EMOJI|EXPERIENCIAS_PARA_/.test(PLANNER));
check('F19) y `suggestedExperience` sigue sin autoridad sobre el plan',
  !/suggestedExperience/.test(leer('functions/src/core/planner.ts'))
  && !/suggestedExperience/.test(leer('functions/src/planner/index.ts')),
  'sugerencia del Brain ≠ autoridad del Core Plan');

console.log(failures
  ? `\n${failures} comprobación(es) fallaron`
  : `\nVocabulario de experiencias: una autoridad, dos proyecciones y ${n} comprobaciones sin buscar la palabra «travel»`);
process.exit(failures ? 1 : 0);
