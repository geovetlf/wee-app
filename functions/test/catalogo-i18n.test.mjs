/*
 * EL CATÁLOGO DE LAS ONCE EXPERIENCIAS, EN DOS IDIOMAS (fase 2 · bloque 3B).
 *
 * Lo que se defiende aquí no es que existan unas claves: es que la pantalla de
 * Weë AI se lee entera en el idioma de la persona y que, al traducirla, no se
 * movió NADA de lo que decide a dónde lleva cada botón.
 *
 * Se ejecuta de verdad. `constants/specialists.ts`, `i18n/textos/es/catalogo.ts`
 * y `i18n/textos/en/catalogo.ts` se compilan y se importan, así que lo que se
 * comprueba son los objetos reales y no un texto que se le parece. Solo se lee
 * como texto lo que no se puede ejecutar —las pantallas de React Native—, y
 * entonces se mira el código sin comentarios: una explicación escrita al lado
 * no puede aprobar una prueba por su cuenta.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Compilar un .ts y traérselo como módulo. `specialists.ts` importa las
 * experiencias solo para `getSpecialist`, que aquí no hace falta: se sustituye
 * por un doble mínimo para poder cargar el archivo suelto. */
const ts = require('typescript');
const cargar = (ruta, arreglo = (x) => x) => {
  const js = ts.transpileModule(arreglo(leer(ruta)), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'));
};

const CAT = await cargar('constants/specialists.ts', (s) =>
  s.replace("import { WeeExperience, getExperienceById } from './weeExperiences';",
    'const getExperienceById = (id) => ({ id, name: id });'));
const ES = (await cargar('i18n/textos/es/catalogo.ts')).catalogo;
const EN = (await cargar('i18n/textos/en/catalogo.ts')).catalogo;

const { SPECIALISTS, SPECIALIST_ORDER, traducirEspecialista } = CAT;
const IDS = Object.keys(SPECIALISTS);

/* Todas las propiedades de texto de una configuración, con su valor. */
const textosDe = (spec) => {
  const fuera = [];
  const mete = (v) => { if (typeof v === 'string') fuera.push(v); };
  mete(spec.headline); mete(spec.intro); mete(spec.note); mete(spec.gridTitle);
  if (spec.gridHint) mete(spec.gridHint);
  spec.chips.forEach(mete);
  spec.actions.forEach((a) => { mete(a.title); mete(a.subtitle); mete(a.goal); });
  mete(spec.idea.title); mete(spec.idea.subtitle); mete(spec.idea.placeholder);
  spec.idea.chips.forEach(mete);
  if (spec.idea.button) mete(spec.idea.button);
  if (spec.upload) { mete(spec.upload.title); mete(spec.upload.subtitle); mete(spec.upload.hint); if (spec.upload.button) mete(spec.upload.button); }
  if (spec.examplesTitle) mete(spec.examplesTitle);
  (spec.examples || []).forEach((e) => { mete(e.title); if (e.subtitle) mete(e.subtitle); if (e.meta) mete(e.meta); });
  if (spec.closing) { mete(spec.closing.title); mete(spec.closing.subtitle); mete(spec.closing.button); }
  return fuera;
};

const TODAS = IDS.flatMap((id) => textosDe(SPECIALISTS[id]));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El catálogo guarda claves, no frases ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Una clave es un identificador: letras y números, sin espacios ni acentos. */
  const esClave = (s) => /^[a-z][A-Za-z0-9]*$/.test(s);
  const frases = TODAS.filter((s) => !esClave(s));
  check('1) las ' + TODAS.length + ' cadenas visibles del catálogo son claves',
    frases.length === 0, frases.slice(0, 4).join(' | '));

  /* Ni una letra de un idioma humano en el archivo de configuración. */
  const codigo = soloCodigo(leer('constants/specialists.ts'));
  /* Solo el objeto del catálogo: ni las interfaces de arriba ni el traductor de
   * abajo, que sí llama a `t` porque para eso está. */
  const cuerpo = codigo.slice(codigo.indexOf('export const SPECIALISTS'), codigo.indexOf('export const SPECIALIST_ORDER'));
  const conAcento = [...cuerpo.matchAll(/'([^']*[áéíóúñ¿¡üÁÉÍÓÚÑ][^']*)'/g)].map((m) => m[1]);
  check('2) y en el cuerpo del catálogo no queda ni una palabra con tilde',
    conAcento.length === 0, conAcento.slice(0, 3).join(' | '));

  /* El catálogo NO llama al traductor: se importa fuera de React y ahí no hay. */
  check('3) el catálogo no llama a t() ni importa el contexto de idioma',
    !/\bt\(/.test(cuerpo) && !/IdiomaContext|useT|i18n\//.test(codigo));

  /* Cada experiencia tiene su prefijo: las claves no se cruzan entre secciones. */
  const cruzadas = IDS.filter((id) => textosDe(SPECIALISTS[id]).some((k) => !k.startsWith(id)));
  check('4) cada clave lleva el prefijo de su experiencia', cruzadas.length === 0, cruzadas.join(','));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Español e inglés: completos y sin sobras ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const sinEs = TODAS.filter((k) => typeof ES[k] !== 'string');
  const sinEn = TODAS.filter((k) => typeof EN[k] !== 'string');
  check('5) las ' + TODAS.length + ' claves existen en español', sinEs.length === 0, sinEs.slice(0, 5).join(' '));
  check('6) y las ' + TODAS.length + ' existen en inglés', sinEn.length === 0, sinEn.slice(0, 5).join(' '));

  const vaciasEs = TODAS.filter((k) => !(ES[k] || '').trim());
  const vaciasEn = TODAS.filter((k) => !(EN[k] || '').trim());
  check('7) ninguna está vacía en ninguno de los dos', vaciasEs.length === 0 && vaciasEn.length === 0,
    vaciasEs.concat(vaciasEn).slice(0, 5).join(' '));

  const usadas = new Set(TODAS);
  const sobranEs = Object.keys(ES).filter((k) => !usadas.has(k));
  const sobranEn = Object.keys(EN).filter((k) => !usadas.has(k));
  check('8) el diccionario no arrastra claves que ya nadie usa',
    sobranEs.length === 0 && sobranEn.length === 0, sobranEs.concat(sobranEn).slice(0, 5).join(' '));

  check('9) español e inglés tienen exactamente las mismas claves',
    Object.keys(ES).sort().join() === Object.keys(EN).sort().join());

  check('10) y el módulo está dado de alta en los dos índices',
    /import \{ catalogo \} from '\.\/catalogo';/.test(leer('i18n/textos/es/index.ts'))
    && /^  catalogo,$/m.test(leer('i18n/textos/es/index.ts'))
    && /import \{ catalogo \} from '\.\/catalogo';/.test(leer('i18n/textos/en/index.ts'))
    && /^  catalogo,$/m.test(leer('i18n/textos/en/index.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Nada en español dentro del inglés ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * El fallo que se quiere hacer imposible: la pantalla en inglés enseñando
   * "Describe tu idea con el mayor detalle posible". Se busca por tres vías
   * independientes, porque una sola se le escapa a la siguiente frase.
   */
  /* El inglés también tiene préstamos con acento; son estos dos y están aquí
   * escritos para que se vean, no escondidos detrás de una expresión más laxa. */
  const PRESTAMOS = /Résumé|Façade/gi;
  const acentos = TODAS.filter((k) => /[áéíóúñ¿¡]/i.test(EN[k].replace(PRESTAMOS, '')));
  check('11) ninguna frase inglesa lleva tildes, eñes ni signos de apertura',
    acentos.length === 0, acentos.slice(0, 4).map((k) => k + '=' + EN[k]).join(' | '));

  const PALABRAS = ['tu ', 'tus ', 'para ', 'con ', 'una ', 'unos ', 'quiero', 'crear', 'cuéntame',
    'cuentame', 'hacer', 'foto ', 'fotos', 'video de', 'ideas para', 'que puedes', 'mejor', 'desde'];
  const castellano = TODAS.filter((k) => {
    const v = ' ' + EN[k].toLowerCase() + ' ';
    return PALABRAS.some((p) => v.includes(' ' + p));
  });
  check('12) ni palabras sueltas en castellano',
    castellano.length === 0, castellano.slice(0, 4).map((k) => k + '=' + EN[k]).join(' | '));

  /* Control: el mismo detector SÍ pilla el español, o no estaría detectando nada. */
  const pillaEs = TODAS.filter((k) => /[áéíóúñ¿¡]/i.test(ES[k])).length;
  check('13) control: el detector sí encuentra el español cuando lo hay', pillaEs > 40, String(pillaEs));

  /* Y el caso concreto que se reportó. */
  check('14) "Describe tu idea con el mayor detalle posible." sigue en español',
    ES.designIdeaSubtitle === 'Describe tu idea con el mayor detalle posible.');
  check('14) y en inglés se lee en inglés',
    EN.designIdeaSubtitle === 'Describe your idea in as much detail as you can.');

  /* Ninguna frase se quedó sin traducir: idénticas solo donde debe (números). */
  const iguales = TODAS.filter((k) => ES[k] === EN[k]);
  /* Cifras, duraciones y porcentajes no son idioma. */
  const NUMERO = /^[\d.,:KM↑↓%\s]+$|^\d+ min$/;
  /* Y estas palabras se escriben igual en los dos: nombres de sección dentro
   * del selector de Studio, géneros musicales, un plato peruano y una palabra
   * que el español tomó prestada tal cual. */
  const MISMA = /^(Videos|Beauty|Writer|Pop|Rock|Drama|Ideas|Lomo saltado)$/;
  const sospechosas = iguales.filter((k) => !NUMERO.test(ES[k]) && !MISMA.test(ES[k]));
  check('15) solo coinciden las dos versiones donde no hay idioma que traducir',
    sospechosas.length === 0, sospechosas.map((k) => k + '=' + ES[k]).slice(0, 5).join(' | '));
  check('15) y las 33 que coinciden están todas justificadas', iguales.length === 33, String(iguales.length));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Las marcas no se traducen ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Donde el español nombra a Weë, el inglés la nombra igual. */
  const conWee = TODAS.filter((k) => /Weë/.test(ES[k]));
  const perdidas = conWee.filter((k) => !/Weë/.test(EN[k]));
  check('16) las ' + conWee.length + ' frases que nombran a Weë la siguen nombrando en inglés',
    perdidas.length === 0, perdidas.join(' '));

  /* Y nunca escrita de otra manera. */
  const malEscrita = TODAS.filter((k) => /\b(Wee|WEE|Weé|Wëe)\b/.test(ES[k] + ' ' + EN[k]));
  check('17) y siempre con diéresis, en los dos idiomas', malEscrita.length === 0, malEscrita.join(' '));

  /* Los nombres propios de las secciones dentro del selector de Studio. */
  check('18) Beauty y Writer se llaman igual en los dos',
    ES.studioAcBeautyTitle === 'Beauty' && EN.studioAcBeautyTitle === 'Beauty'
    && ES.studioAcWriterTitle === 'Writer' && EN.studioAcWriterTitle === 'Writer');

  /* Nada de traducir "IA" dejándolo en español dentro del inglés. */
  const conIA = TODAS.filter((k) => /\bIA\b/.test(EN[k]));
  check('19) en inglés se dice AI, nunca IA', conIA.length === 0, conIA.join(' '));
  check('19) y en español se sigue diciendo IA',
    TODAS.some((k) => /\bIA\b/.test(ES[k])) && !TODAS.some((k) => /\bAI\b/.test(ES[k])));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo funcional no se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('20) siguen siendo las once experiencias',
    IDS.join(',') === 'brain,design,photo,music,studio,business,chef,home,beauty,writer,travel', IDS.join(','));
  check('21) y el orden de la barra lateral es el mismo',
    SPECIALIST_ORDER.join(',') === 'brain,design,music,studio,business,chef,travel', SPECIALIST_ORDER.join(','));

  /* Los identificadores de cada función: es lo que viaja al servidor y lo que
   * tienen dentro los trabajos que la gente ya guardó. */
  const ESPERADOS = {
    brain: 'idea,know,document,learn,research,problem,idk',
    design: 'brand,social,product,machine,place,home,character,idk',
    photo: 'enhance,remove,background,restore,transform,retouch,style,colorize,generate,idk',
    music: 'song,musicvideo,voice,beat,lyrics,mix,clip,idk',
    studio: 'photos,videos,beauty,writer',
    business: 'content,schedule,publish,reply,analyze,strategy',
    chef: 'recipe,ingredients,menu,healthy,dessert,edit,idk',
    home: 'design,furniture,colors,layout,garden,ideas,idk',
    beauty: 'makeup,hair,haircolor,beard,outfit,nails,transform,skin,face,accessories',
    writer: 'cover,story,script,article,social,email,document,cv,translate,summary,ideas,fix,rewrite,citations,more',
    travel: 'plan,where,doing,moving',
  };
  const movidas = IDS.filter((id) => SPECIALISTS[id].actions.map((a) => a.id).join(',') !== ESPERADOS[id]);
  check('22) las funciones de cada sección, con su identificador y su orden',
    movidas.length === 0, movidas.map((id) => id + ': ' + SPECIALISTS[id].actions.map((a) => a.id).join(',')).join(' | '));

  /* Las respuestas ya contestadas: `optionId` decide plantilla, plan y coste. */
  const presets = IDS.flatMap((id) => SPECIALISTS[id].actions.filter((a) => a.preset)
    .map((a) => id + '.' + a.id + '=' + a.preset.questionId + ':' + a.preset.optionId));
  check('23) las ' + presets.length + ' respuestas preseleccionadas siguen ahí', presets.length === 80, String(presets.length));
  check('23) y ninguna cambió de pregunta',
    presets.every((p) => /=(what|action):/.test(p)), presets.filter((p) => !/=(what|action):/.test(p)).join(' '));

  /* Las que abren otra experiencia y la que abre una pantalla. */
  const abren = IDS.flatMap((id) => SPECIALISTS[id].actions.filter((a) => a.opens)
    .map((a) => id + '.' + a.id + '→' + a.opens + (a.opensSection ? ' (pantalla)' : '')));
  check('24) las cinco puertas a otra experiencia no se movieron',
    abren.join(' | ') === 'design.home→home | studio.photos→photo | studio.videos→studio | studio.beauty→beauty | studio.writer→writer (pantalla)',
    abren.join(' | '));

  /* Modos de entrada, disposición, banderas y tonos: nada de eso es idioma. */
  check('25) los modos de entrada de cada sección siguen declarados',
    IDS.every((id) => Array.isArray(SPECIALISTS[id].inputs) && SPECIALISTS[id].inputs.length > 0)
    && SPECIALISTS.chef.inputs.join(',') === 'text,upload,camera,voice');
  check('26) la disposición de cada cuadrícula es la de siempre',
    IDS.map((id) => SPECIALISTS[id].actionLayout).join(',') === 'tiles,compact,tiles,tiles,compact,tiles,compact,wide,images,tiles,compact');
  check('27) Weë Travel sigue siendo la única que escribe primero',
    IDS.filter((id) => SPECIALISTS[id].ideaFirst).join(',') === 'travel');
  check('28) las cajas de subida siguen donde estaban',
    IDS.filter((id) => SPECIALISTS[id].upload).join(',') === 'photo,home,beauty');
  check('29) y los emojis de cada función no pasaron por el traductor',
    IDS.every((id) => SPECIALISTS[id].actions.every((a) => a.emoji && !/[a-zA-Z]/.test(a.emoji)))
    && IDS.every((id) => SPECIALISTS[id].actions.every((a) => /-outline$|^logo-/.test(a.icon))));

  /* Nada del motor de IA ni de los Credits se coló en el catálogo. */
  check('30) control: el catálogo no sabe de proveedores, modelos ni Credits',
    !/aiRouter|engine\/|providers\/|spendCredits|creditCosts|gemini|seedance|elevenlabs/i.test(leer('constants/specialists.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · El traductor solo toca las palabras ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Un traductor de mentira: devuelve la clave marcada. Así se ve de un vistazo
   * qué pasó por él y qué no. */
  const marcar = (clave) => '@' + clave;

  const sinTraducir = [];
  const traducidas = [];
  for (const id of IDS) {
    const antes = SPECIALISTS[id];
    const dsp = traducirEspecialista(antes, marcar);

    /* Lo que decide a dónde lleva algo: idéntico, campo por campo. */
    const igual = dsp.id === antes.id
      && dsp.heroEmoji === antes.heroEmoji
      && dsp.actionLayout === antes.actionLayout
      && dsp.inputs.join(',') === antes.inputs.join(',')
      && dsp.ideaFirst === antes.ideaFirst
      && dsp.actions.length === antes.actions.length
      && dsp.actions.every((a, i) => {
        const b = antes.actions[i];
        return a.id === b.id && a.icon === b.icon && a.emoji === b.emoji
          && a.idk === b.idk && a.opens === b.opens && a.secondary === b.secondary
          && a.opensSection === b.opensSection
          && JSON.stringify(a.preset) === JSON.stringify(b.preset);
      })
      && (dsp.examples || []).every((e, i) => {
        const f = (antes.examples || [])[i];
        return e.kind === f.kind && e.emoji === f.emoji && e.tone.join() === f.tone.join();
      });
    if (!igual) sinTraducir.push(id);

    /* Y lo que se lee: todo pasó por el traductor, ni una se quedó fuera. */
    const textos = textosDe(dsp);
    if (textos.every((s) => s.startsWith('@catalogo.'))) traducidas.push(id);
  }
  check('31) traducir no cambia ni un identificador, icono, emoji, preset ni bandera',
    sinTraducir.length === 0, sinTraducir.join(','));
  check('32) y las once secciones salen con TODAS sus frases resueltas',
    traducidas.length === IDS.length, IDS.filter((id) => !traducidas.includes(id)).join(','));

  /* Las claves se piden con su módulo delante: 'catalogo.<clave>'. */
  const pedidas = [];
  traducirEspecialista(SPECIALISTS.chef, (k) => { pedidas.push(k); return k; });
  check('33) se piden al diccionario como catalogo.<clave>',
    pedidas.length > 40 && pedidas.every((k) => k.startsWith('catalogo.')), String(pedidas.length));

  /* Una sección sin caja de subida, sin ejemplos y sin franja final no revienta. */
  const travel = traducirEspecialista(SPECIALISTS.travel, marcar);
  check('34) las secciones sin subida, sin ejemplos y sin franja final se traducen igual',
    travel.upload === undefined && travel.examples === undefined && travel.closing === undefined
    && travel.gridHint === '@catalogo.travelGridHint');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Las pantallas piden el catálogo ya traducido ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const hook = soloCodigo(leer('hooks/useEspecialista.ts'));
  check('35) hay un solo sitio que convierte claves en palabras',
    /traducirEspecialista\(spec, t\)/.test(hook) && /useT\(\)/.test(hook));
  check('36) y se rehace solo al cambiar de sección o de idioma',
    /useMemo\(/.test(hook) && /\}, \[id, t\]\)/.test(hook));

  const PANTALLAS = ['screens/SpecialistScreen.tsx', 'screens/BusinessScreen.tsx', 'screens/BrainChatScreen.tsx'];
  const crudas = PANTALLAS.filter((p) => /getSpecialist\(/.test(soloCodigo(leer(p))));
  check('37) las tres pantallas usan el catálogo traducido, no el crudo',
    crudas.length === 0 && PANTALLAS.every((p) => /useEspecialista\(/.test(soloCodigo(leer(p)))), crudas.join(' '));

  /* Y nadie más lee el catálogo por su cuenta saltándose la traducción. */
  const sospechosos = ['components/creator/ActionGrid.tsx', 'components/creator/ExamplesRow.tsx',
    'components/creator/IdeaBox.tsx', 'components/creator/SpecialistHero.tsx',
    'components/creator/UploadBox.tsx', 'components/creator/TravelLauncher.tsx']
    .filter((p) => /getSpecialist\(|SPECIALISTS\[/.test(soloCodigo(leer(p))));
  check('38) las piezas compartidas reciben el texto, no van a buscarlo',
    sospechosos.length === 0, sospechosos.join(' '));

  /* Los componentes tampoco vuelven a traducir lo que ya les llega traducido. */
  const rehacen = ['components/creator/ActionGrid.tsx', 'components/creator/SpecialistHero.tsx',
    'components/creator/ExamplesRow.tsx']
    .filter((p) => /t\((action|spec|example|config)\./.test(soloCodigo(leer(p))));
  check('39) y no lo traducen dos veces', rehacen.length === 0, rehacen.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Traducir la meta no cambia ningún camino ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * `screens/CreatorFlowScreen.tsx` decide si hay que pedir una foto. Para
   * Studio y Chef mira primero el `optionId` y, como red, el texto de la meta.
   * Ese texto ahora se traduce, así que hay que asegurar que la red no es lo
   * que sostiene a ninguna función del catálogo: cada una que la activaría ya
   * está cubierta por su identificador o por la experiencia que abre.
   */
  const flujo = soloCodigo(leer('screens/CreatorFlowScreen.tsx'));
  check('40) la decisión sigue apoyada en el identificador de la respuesta',
    /preset\?\.optionId === 'animate'/.test(flujo)
    && /preset\?\.optionId === 'cook'/.test(flujo)
    && /preset\?\.optionId === 'edit'/.test(flujo)
    && /\['photo', 'home', 'beauty'\]\.includes\(experience\.id\)/.test(flujo));

  const RED = { studio: /foto|imagen/i, chef: /ingredientes|nevera|refri|foto/i };
  const CUBIERTO = { studio: ['animate'], chef: ['cook', 'edit'] };
  const colgando = [];
  for (const id of ['studio', 'chef']) {
    for (const a of SPECIALISTS[id].actions) {
      if (!RED[id].test(ES[a.goal] || '')) continue;
      const cubierta = a.opens || (a.preset && CUBIERTO[id].includes(a.preset.optionId));
      if (!cubierta) colgando.push(id + '.' + a.id);
    }
    /* Los chips de la caja de idea también se convierten en meta. */
    for (const c of SPECIALISTS[id].idea.chips) {
      if (RED[id].test(ES[c] || '')) colgando.push(id + '.chip:' + c);
    }
    /* Y los ejemplos, que arrancan el flujo con «título · subtítulo». */
    for (const e of SPECIALISTS[id].examples || []) {
      const texto = e.subtitle ? ES[e.title] + ' · ' + ES[e.subtitle] : ES[e.title];
      if (RED[id].test(texto || '')) colgando.push(id + '.ej:' + e.title);
    }
  }
  check('41) ninguna función del catálogo depende del texto español para pedir la foto',
    colgando.length === 0, colgando.join(' '));

  /* Control: el detector funciona —hay metas que SÍ pegan con la expresión. */
  const pegan = SPECIALISTS.chef.actions.filter((a) => RED.chef.test(ES[a.goal] || '')).map((a) => a.id);
  check('41) control: y sí hay metas que la expresión reconoce', pegan.length >= 2, pegan.join(','));

  /* La meta se traduce a propósito: es lo que la persona lee luego en su historial. */
  check('42) la meta viaja traducida porque acaba siendo el título del trabajo',
    /title: job\.goal/.test(flujo) && EN.chefAcRecipeGoal === 'I want a recipe' && ES.chefAcRecipeGoal === 'Quiero una receta');
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
