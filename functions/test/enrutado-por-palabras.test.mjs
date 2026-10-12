/**
 * R7 · K · LA CAJA DEL STUDIO NO MANDA FRASES CORRIENTES A WEË BEAUTY (B-02 · R-01a de docs/INTEGRACION-FLUJO-E2E.md).
 *
 * LO QUE PASABA. `matchExperiences` (constants/weeExperiences.ts) compara lo escrito con las palabras clave del registro, y
 * para que el buscador de Weë AI complete mientras alguien teclea también encajaba una palabra que es el PRINCIPIO de una
 * clave («rec» → «receta»). Pero lo aplicaba a TODAS las palabras, no solo a la que se está tecleando: en «Una canción
 * relajante para estudiar» la palabra ya escrita «una» encajaba con la clave «unas» (uñas, de Beauty), y en «Make me a logo»
 * la palabra «make» con «makeup». Con `dentroDe: 'studio'` —la caja del Studio no sale del Studio— Beauty era la única
 * candidata, y la persona acababa en Weë Beauty sin haber pedido nada de belleza.
 *
 * LO QUE ES AHORA. Lo que se está TECLEANDO es el final del texto —la última palabra, o las últimas si la clave tiene varias
 * («color de ca»)— y solo eso completa el principio de una clave. Lo anterior ya está escrito: tiene que ser la clave entera
 * o empezar por ella («recetas»). El buscador sigue completando lo que se teclea; lo escrito deja de completarse.
 *
 * Y UN RESIDUO DE LA MISMA FAMILIA (aviso del coordinador, ronda R7): `q.includes(k)` dejaba que una clave de UNA palabra contara
 * por estar DENTRO de otra («unas» en «algunas», «ropa» en «europa», «cena» en «escena»). Ahora una clave de una palabra cuenta si
 * alguna palabra del texto ES la clave o EMPIEZA por ella; la de varias («color de cabello») sigue valiendo si el texto la lleva entera.
 *
 *   A · Las doce frases de la sonda de H, por la caja del Studio (tres iban a Beauty por error).
 *   B · Fuera del Studio (búsqueda libre) el destino es el de siempre.
 *   C · Lo que SÍ es de Beauty sigue yendo a Beauty, en los tres idiomas.
 *   D · Lo que se teclea sigue completando: el del buscador, el de la última palabra, el de las claves de varias y los de cada idioma.
 *   E · Una palabra ya escrita ya no completa una clave ajena.
 *   F · El arreglo solo QUITA, y solo lo escrito: nunca añade ni reordena (frente a la regla de antes, como referencia), lo que
 *       se teclea da lo de siempre y los ejemplos que la propia app enseña siguen llevando a su experiencia.
 *   G · Lo que no cambia: dónde vive el arreglo y que esta suite está en la cadena.
 *   H · Una clave de una palabra DENTRO de otra palabra no cuenta («algunas» no es «unas», «europa» no es «ropa»), y lo que sí cuenta
 *       —la clave entera, una palabra que empieza por ella, la de dos letras, la de varias palabras— sigue contando.
 *
 * Todo en memoria: el código REAL de la app (`constants/weeExperiences.ts`, `utils/destinoDeIntencion.ts`) cargado con el
 * cargador de las suites de la app. Sin red, sin emulador, sin Firebase.
 */
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const cargar = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'web' } } } });
const W = cargar('constants/weeExperiences.ts');
const D = cargar('utils/destinoDeIntencion.ts');

const idiomaDe = (idioma) => (idioma === 'es' ? undefined : idioma);
const ids = (q, idioma) => W.matchExperiences(q, idiomaDe(idioma)).map((e) => e.id);
/** Lo que hace `StudioScreen.alCrear` con una frase escrita SIN puerta elegida. */
const enElStudio = (texto, idioma = 'es') => D.destinoDeIntencion(texto, { dentroDe: 'studio', idioma })?.experienceId ?? null;
const libre = (texto, idioma = 'es') => D.destinoDeIntencion(texto, { idioma })?.experienceId ?? null;

/* ═══ A · LAS DOCE FRASES DE LA SONDA ══════════════════════════════════════ */
console.log('\n── A · Las doce frases de la sonda de H, por la caja del Studio ──');
/*
 * [idioma, frase, a dónde debe ir desde el Studio]. `null` = ningún lugar del Studio la atiende (diseño, viajes y negocio
 * son otros lugares de trabajo, y «Hola…» no dice nada): la caja lo dice con su aviso en vez de inventar un destino. Que
 * ese `null` ofrezca Weë Brain (R-01b) es otra decisión y no se toca aquí.
 */
const DOCE = [
  ['es', 'Quiero un video de 10 segundos para mi cafetería', 'studio'],
  ['es', 'Hazme un logo para mi cafetería', null],
  ['es', 'Una canción relajante para estudiar', null],
  ['es', 'Una receta de pasta con lo que tengo en la nevera', null],
  ['es', 'Quiero mejorar esta foto de mi abuela', 'photo'],
  ['es', 'Escribe un poema sobre el mar', 'writer'],
  ['es', 'Planea un viaje a Cusco de cinco días', null],
  ['es', 'Un plan de negocio para vender velas', null],
  ['es', 'Hola, no sé qué quiero hacer', null],
  ['es', 'Una animación de mi gato bailando', 'studio'],
  ['en', 'I want a short video for my coffee shop', 'studio'],
  ['en', 'Make me a logo for my bakery', null],
];
DOCE.forEach(([idioma, frase, esperado], i) => {
  const real = enElStudio(frase, idioma);
  check(`A${i + 1}) [${idioma}] «${frase}» → ${esperado ?? 'ningún lugar del Studio'}`, real === esperado, `va a ${real}`);
});
const aBeauty = DOCE.filter(([idioma, frase]) => enElStudio(frase, idioma) === 'beauty').map(([, f]) => f);
check('A13) ninguna de las doce acaba en Weë Beauty', aBeauty.length === 0, aBeauty.join(' · '));

/* ═══ B · FUERA DEL STUDIO, EL DESTINO DE SIEMPRE ═════════════════════════ */
console.log('\n── B · Sin `dentroDe` (búsqueda libre), el destino es el de siempre ──');
check('B1) «Una canción relajante para estudiar» → Weë Music', libre('Una canción relajante para estudiar') === 'music', libre('Una canción relajante para estudiar'));
check('B2) «Una receta de pasta con lo que tengo en la nevera» → Weë Chef (Beauty iba antes que Chef en el registro)',
  libre('Una receta de pasta con lo que tengo en la nevera') === 'chef', libre('Una receta de pasta con lo que tengo en la nevera'));
check('B3) «Make me a logo for my bakery» → Weë Design', libre('Make me a logo for my bakery', 'en') === 'design', libre('Make me a logo for my bakery', 'en'));
check('B4) y la búsqueda ya no ofrece Beauty en ninguna de las tres', ['Una canción relajante para estudiar', 'Una receta de pasta con lo que tengo en la nevera']
  .every((f) => !ids(f).includes('beauty')) && !ids('Make me a logo for my bakery', 'en').includes('beauty'));

/* ═══ C · LO QUE SÍ ES DE BEAUTY SIGUE YENDO A BEAUTY ══════════════════════ */
console.log('\n── C · Lo que sí es de Beauty sigue yendo a Beauty ──');
const DE_BEAUTY = [
  ['es', 'maquillaje'], ['es', 'Quiero probar un maquillaje distinto'], ['es', 'cambiar el color de pelo'], ['es', 'Quiero cambiar el color de pelo'],
  ['es', 'Cómo me quedaría el cabello largo'], ['es', 'Probar otro color de cabello'], ['es', 'uñas'], ['es', 'Quiero arreglarme las uñas'],
  ['es', 'unas'], ['es', 'barba'], ['es', 'Me quiero dejar la barba'], ['es', 'Un look para una fiesta'], ['es', 'Un peinado para mi boda'],
  ['en', 'I want a new hairstyle'], ['en', 'makeup tips for tonight'], ['en', 'a beard style for me'], ['en', 'my hair is too long'],
  /* El ejemplo en inglés que la propia app enseña en Weë Beauty: solo llegaba por «hair» → «hairstyle» a mitad de frase. */
  ['en', 'Try a different hair colour'], ['en', 'Try a different hair color'],
  ['da', 'makeup til mig'], ['da', 'en ny frisure til festen'], ['da', 'skæg og briller'],
];
DE_BEAUTY.forEach(([idioma, frase], i) => {
  const real = enElStudio(frase, idioma);
  check(`C${i + 1}) [${idioma}] «${frase}» → Weë Beauty`, real === 'beauty', `va a ${real}`);
});

/* ═══ D · LO QUE SE TECLEA SIGUE COMPLETANDO ═══════════════════════════════ */
console.log('\n── D · Lo que se está tecleando sigue completándose ──');
const TECLEADO = [
  ['es', 'maq', 'beauty'], ['es', 'maqui', 'beauty'], ['es', 'rec', 'chef'], ['es', 'fot', 'photo'], ['es', 'dis', 'design'], ['es', 'vid', 'studio'],
  ['es', 'viaj', 'travel'], ['es', 'dec', 'home'], ['es', 'escr', 'writer'], ['es', 'mús', 'music'], ['es', 'bar', 'beauty'], ['es', 'color', 'beauty'],
  /* Una clave de varias palabras, mientras se escribe entera. */
  ['es', 'color de', 'beauty'], ['es', 'color de ca', 'beauty'], ['es', 'historia vis', 'studio'],
  ['da', 'opsk', 'chef'], ['da', 'make-', 'beauty'], ['en', 'recip', 'chef'], ['en', 'makeu', 'beauty'], ['en', 'hair', 'beauty'],
];
TECLEADO.forEach(([idioma, q, esperada], i) => {
  const r = ids(q, idioma);
  check(`D${i + 1}) [${idioma}] teclear «${q}» ofrece ${esperada}`, r.includes(esperada), r.join(','));
});
const ultima = [
  ['quiero ver una rec', 'chef'], ['Hazme una canción y una rec', 'chef'], ['Un video de mi perro y un viaj', 'travel'], ['quiero ver una rec ', 'chef'],
  ['quiero un logo con el color de ca', 'beauty'],
];
ultima.forEach(([q, esperada], i) => {
  check(`D${TECLEADO.length + i + 1}) lo ÚLTIMO de «${q}» se sigue completando → ${esperada}`, ids(q).includes(esperada), ids(q).join(','));
});
/* Exhaustivo: cada clave española y cada principio suyo de una palabra (3+ letras) llevan a su experiencia, como siempre. */
{
  const perdidas = [];
  let probadas = 0;
  for (const e of W.ALL_EXPERIENCES) {
    for (const k of e.keywords) {
      const primera = k.split(' ')[0];
      for (let largo = 3; largo <= primera.length; largo++) {
        const p = primera.slice(0, largo);
        if (!/^[\p{L}\p{N}]+$/u.test(p)) continue;
        probadas++;
        if (!ids(p).includes(e.id)) perdidas.push(`${p}→${e.id}`);
      }
    }
  }
  check(`D${TECLEADO.length + ultima.length + 1}) cada principio de cada clave española (${probadas}) sigue completando a su experiencia`, perdidas.length === 0, perdidas.slice(0, 8).join(' '));
}
/* Lo mismo con los diccionarios por idioma: una palabra, y sus principios desde 4 letras (la regla de PALABRAS_POR_IDIOMA). */
{
  const perdidas = [];
  let probadas = 0;
  for (const idioma of ['da', 'en']) {
    for (const [id, palabras] of Object.entries(W.PALABRAS_POR_IDIOMA[idioma])) {
      for (const k of palabras.filter((x) => !x.includes(' '))) {
        for (let largo = 4; largo <= k.length; largo++) {
          const p = k.slice(0, largo);
          if (!/^[\p{L}\p{N}]+$/u.test(p)) continue;
          probadas++;
          if (!ids(p, idioma).includes(id)) perdidas.push(`${idioma}:${p}→${id}`);
        }
      }
    }
  }
  check(`D${TECLEADO.length + ultima.length + 2}) cada principio (de 4+ letras) de cada palabra de da y en (${probadas}) sigue completando`, perdidas.length === 0, perdidas.slice(0, 8).join(' '));
}

/* ═══ E · UNA PALABRA YA ESCRITA YA NO COMPLETA UNA CLAVE AJENA ════════════ */
console.log('\n── E · Lo escrito no se completa ──');
const sin = (q, quien, idioma) => !ids(q, idioma).includes(quien);
check('E1) «una canción relajante»: «una» no es «unas» (Beauty), y Music sigue ahí', sin('una canción relajante', 'beauty') && ids('una canción relajante').includes('music'), ids('una canción relajante').join(','));
check('E2) «Quiero ver mi canción terminada»: «ver» no es «verme» (Beauty)', sin('Quiero ver mi canción terminada', 'beauty'), ids('Quiero ver mi canción terminada').join(','));
check('E3) «Un logo de color azul»: «color» no es «color de cabello» (Beauty), y Design sigue ahí', sin('Un logo de color azul para mi cafetería', 'beauty') && ids('Un logo de color azul para mi cafetería').includes('design'));
check('E4) «Una canción para mi bar favorito»: «bar» no es «barba» (Beauty)', sin('Una canción para mi bar favorito', 'beauty'), ids('Una canción para mi bar favorito').join(','));
check('E5) «Escribe una historia sobre mi abuela»: «historia» no es «historia visual» (Studio), y Writer sigue ahí',
  sin('Escribe una historia sobre mi abuela', 'studio') && ids('Escribe una historia sobre mi abuela').includes('writer'), ids('Escribe una historia sobre mi abuela').join(','));
check('E6) «Una foto con mi mascota»: «con» no es «consejo» (Brain), y Photo sigue ahí', sin('Una foto con mi mascota', 'brain') && ids('Una foto con mi mascota').includes('photo'), ids('Una foto con mi mascota').join(','));
check('E7) «Escribe un poema por favor»: «por» no es «portada» (Design)', sin('Escribe un poema por favor', 'design') && ids('Escribe un poema por favor').includes('writer'), ids('Escribe un poema por favor').join(','));
check('E8) en inglés, «make a video of my dog»: «make» no es «makeup» (Beauty), y Studio sigue ahí',
  sin('make a video of my dog', 'beauty', 'en') && ids('make a video of my dog', 'en').includes('studio'), ids('make a video of my dog', 'en').join(','));
check('E9) en danés, «en skøn sang til min mor»: «skøn» no es «skønhed» (Beauty), y Music sigue ahí',
  sin('en skøn sang til min mor', 'beauty', 'da') && ids('en skøn sang til min mor', 'da').includes('music'), ids('en skøn sang til min mor', 'da').join(','));
check('E10) un punto final cierra la última palabra: «Escribe una historia.» no completa «historia visual»',
  sin('Escribe una historia.', 'studio') && ids('Escribe una historia.').includes('writer'), ids('Escribe una historia.').join(','));
check('E11) y la clave ENTERA, o una palabra que empieza por ella, sigue encajando donde sea del texto: «recetas» y «fotos»',
  ids('quiero recetas para mi cena').includes('chef') && ids('quiero fotos de mi gato para mi perfil').includes('photo'));
check('E12) una clave de varias palabras, a mitad de frase, no completa por su primera palabra: «el color de mi marca» no es «color de cabello»',
  sin('Un logo del color de mi marca', 'beauty') && ids('Un logo del color de mi marca').includes('design'), ids('Un logo del color de mi marca').join(','));

/* ═══ F · EL ARREGLO SOLO QUITA, Y SOLO LO ESCRITO ═════════════════════════ */
console.log('\n── F · Solo quita falsos positivos de lo escrito: nunca añade ni reordena, y lo que se teclea da lo de siempre ──');
/*
 * LA REGLA DE ANTES, tal cual estaba en d867774 (constants/weeExperiences.ts: `matchExperiences` + `encajaEnSuIdioma`). Se
 * conserva aquí como REFERENCIA y como CONTROL: aplicada a las tres frases de A, las manda a Beauty (F1). Si la regla nueva
 * diera un resultado que la de antes no daba, o los diera en otro orden, F lo diría. (Se comprobó, antes del arreglo, que
 * esta copia da EXACTAMENTE lo mismo que el código de entonces en 6 741 consultas.)
 */
const matchAntes = (query, idioma) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  const encaja = (k) => q.includes(k) || words.some((w) => k.startsWith(w) || w.startsWith(k));
  const frase = (k) => new RegExp(`(?<![\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
  const encajaEnSuIdioma = (k) => (k.includes(' ')
    ? frase(k).test(q)
    : words.some((w) => w.startsWith(k) || (w.length >= 4 && k.startsWith(w))) || (k.length >= 4 && q.includes(k)));
  const base = /^(da|en)(?:-|$)/i.exec(idioma ?? '')?.[1];
  const suyas = base ? W.PALABRAS_POR_IDIOMA[/^en$/i.test(base) ? 'en' : 'da'] : undefined;
  return W.ALL_EXPERIENCES.filter((e) => e.name.toLowerCase().includes(q) || e.keywords.some(encaja) || !!suyas?.[e.id]?.some(encajaEnSuIdioma)).map((e) => e.id);
};
check('F1) CONTROL: la regla de antes encajaba con Beauty «Una canción relajante…», «Una receta de pasta…» y «Make me a logo…»',
  ['Una canción relajante para estudiar', 'Una receta de pasta con lo que tengo en la nevera', 'Make me a logo for my bakery'].every((f) => matchAntes(f, f.startsWith('Make') ? 'en' : undefined).includes('beauty')));
/* Un corpus grande y fijo: las doce, cada clave y cada principio suyo dentro de una frase (en medio y al final), y las palabras de da y en. */
const corpus = [];
for (const [idioma, frase] of DOCE) corpus.push([frase, idiomaDe(idioma)]);
for (const e of W.ALL_EXPERIENCES) {
  for (const k of e.keywords) {
    corpus.push([k, undefined], [`quiero ${k} para mi negocio`, undefined], [`una cosa para ${k}`, undefined]);
    for (let largo = 3; largo < k.length; largo++) {
      const p = k.slice(0, largo);
      corpus.push([p, undefined], [`${p} canción bonita`, undefined], [`una canción para ${p}`, undefined], [`una canción para ${p}.`, undefined]);
    }
  }
}
for (const idioma of ['da', 'en']) {
  for (const palabras of Object.values(W.PALABRAS_POR_IDIOMA[idioma])) {
    for (const k of palabras) corpus.push([k, idioma], [`jeg vil have ${k} til mig`, idioma], [`${k.slice(0, 4)} og en sang`, idioma]);
  }
}
const subsecuencia = (corta, larga) => { let i = 0; for (const x of larga) if (x === corta[i]) i++; return i === corta.length; };
const queAnaden = corpus.filter(([q, idioma]) => !subsecuencia(ids(q, idioma), matchAntes(q, idiomaDe(idioma))));
check(`F2) en ${corpus.length} frases, el resultado de ahora es siempre una parte del de antes, en su mismo orden`, queAnaden.length === 0, queAnaden.slice(0, 4).map(([q]) => q).join(' | '));
/* Lo que se teclea: cada principio (3+ letras) de cada clave española —también de las de varias palabras— y de cada palabra de da y en (4+ letras). */
const tecleados = [];
for (const e of W.ALL_EXPERIENCES) for (const k of e.keywords) for (let largo = 3; largo <= k.length; largo++) tecleados.push([k.slice(0, largo), undefined]);
for (const idioma of ['da', 'en']) {
  for (const palabras of Object.values(W.PALABRAS_POR_IDIOMA[idioma])) {
    for (const k of palabras.filter((x) => !x.includes(' '))) for (let largo = 4; largo <= k.length; largo++) tecleados.push([k.slice(0, largo), idioma]);
  }
}
const queCambian = tecleados.filter(([q, idioma]) => ids(q, idioma).join() !== matchAntes(q, idiomaDe(idioma)).join());
check(`F3) y con lo que se TECLEA (${tecleados.length} principios de claves, de una palabra o de varias) el resultado es idéntico al de antes`, queCambian.length === 0, queCambian.slice(0, 6).map(([q]) => q).join(' | '));
const quitadas = corpus.filter(([q, idioma]) => ids(q, idioma).length < matchAntes(q, idiomaDe(idioma)).length).length;
check(`F4) y de verdad quita algo: en ${quitadas} de esas frases ya no sale un resultado que antes salía por una palabra a medias`, quitadas > 0);
/* Los ejemplos que la propia app enseña bajo cada experiencia (3 por experiencia y por idioma): los que llevaban a la suya, siguen. */
{
  const ejemplos = [];
  for (const idioma of ['es', 'en', 'da']) {
    const textos = cargar(`i18n/textos/${idioma}/creator.ts`).creator;
    for (const e of W.ALL_EXPERIENCES) for (const i of [1, 2, 3]) if (textos[`${e.id}Ex${i}`]) ejemplos.push([idioma, e.id, textos[`${e.id}Ex${i}`]]);
  }
  const perdidos = ejemplos.filter(([idioma, id, texto]) => matchAntes(texto, idiomaDe(idioma)).includes(id) && !ids(texto, idioma).includes(id));
  const llevan = ejemplos.filter(([idioma, id, texto]) => ids(texto, idioma).includes(id)).length;
  check(`F5) de los ${ejemplos.length} ejemplos de la app, ninguno que llevaba a su experiencia deja de llevar (${llevan} la encuentran)`, ejemplos.length === 99 && perdidos.length === 0, perdidos.map(([i, id, t]) => `${i}/${id}: ${t}`).join(' | '));
}

/* ═══ G · LO QUE NO CAMBIA ═════════════════════════════════════════════════ */
console.log('\n── G · Dónde vive el arreglo, y la cadena ──');
const exp = leer('constants/weeExperiences.ts');
const destino = leer('utils/destinoDeIntencion.ts');
check('G1) el arreglo vive en el buscador que ya existe: el destino sigue llamando a `matchExperiences(goal, idioma)`, sin palabras clave propias ni otro resolutor',
  /matchExperiences\(goal, idioma\)\.filter\(\(e\) => cabeEn\(e\.id, dentroDe\)\)/.test(destino) && !/keywords\s*[:=]\s*\[/.test(sinComentarios(destino)));
check('G2) `matchExperiences` sigue buscando entre TODAS las experiencias, no solo entre las visibles',
  /matchExperiences[\s\S]{0,400}ALL_EXPERIENCES\.filter/.test(exp));
check('G3) las palabras clave españolas no se tocaron: «unas» sigue siendo clave de Beauty (la teclea quien escribe «unas» sin eñe) junto a «uñas»',
  W.ALL_EXPERIENCES.find((e) => e.id === 'beauty').keywords.includes('unas') && W.ALL_EXPERIENCES.find((e) => e.id === 'beauty').keywords.includes('uñas'));
check('G4) esta suite está en la cadena de `npm test`', /enrutado-por-palabras\.test\.mjs/.test(leer('functions/package.json')));

/* ═══ H · UNA CLAVE DE UNA PALABRA DENTRO DE OTRA PALABRA NO CUENTA ═══════════════════════════════════════ */
console.log('\n── H · Una clave de una palabra DENTRO de otra palabra no cuenta ──');
/*
 * El residuo que avisó el coordinador: `matchExperiences` conservaba `q.includes(k)` para las claves de UNA palabra, así que «unas»
 * (uñas) estaba «dentro» de «algunas», «ropa» dentro de «europa», «cena» dentro de «escena», «arte» dentro de «comparte» y «visa»
 * dentro de «revisa». Medido: 39 de las 2 508 palabras de los textos españoles de la app llevan una clave dentro sin empezar por ella.
 * Una clave de una palabra cuenta si alguna palabra del texto ES la clave o EMPIEZA por ella («recetas»); la de varias («color de
 * cabello») sigue valiendo si el texto la lleva entera.
 *
 * [frase, la experiencia que NO debe encajar, la que SÍ debe seguir encajando (o null)].
 */
const DENTRO = [
  ['dame algunas ideas', 'beauty', 'writer'],
  ['cómo hacer un viaje a europa', 'beauty', 'travel'],
  ['cuéntame algunas cosas de europa', 'beauty', null],
  ['una escena de película', 'chef', 'studio'],
  ['comparte esto con tu familia', 'design', null],
  ['la parte de arriba de mi casa', 'design', 'home'],
  ['revisa mi texto antes de enviarlo', 'travel', 'writer'],
  ['el diálogo de mi guion', 'design', 'writer'],
  ['un catálogo de productos', 'design', null],
  ['la ensalada de mi abuela', 'home', null],
  ['un post para facebook', 'writer', 'design'],
  ['hace un descuento por mi cumpleaños', 'writer', null],
  ['no puedo moverme', 'beauty', null],
  ['un paseo urbano', 'home', null],
];
DENTRO.forEach(([frase, espuria, legitima], i) => {
  const r = ids(frase);
  check(`H${i + 1}) «${frase}»: ya no encaja ${espuria}${legitima ? ` y sigue encajando ${legitima}` : ''}`, !r.includes(espuria) && (!legitima || r.includes(legitima)), r.join(',') || '(nada)');
});
check('H15) en la caja del Studio, «cómo hacer un viaje a europa» y «cuéntame algunas cosas de europa» ya no van a Weë Beauty (iban por «ropa» en «europa»)',
  enElStudio('cómo hacer un viaje a europa') === null && enElStudio('cuéntame algunas cosas de europa') === null,
  `${enElStudio('cómo hacer un viaje a europa')} · ${enElStudio('cuéntame algunas cosas de europa')}`);
check('H16) y «dame algunas ideas» va a Weë Writer, sin Beauty por «unas» en «algunas»', enElStudio('dame algunas ideas') === 'writer', String(enElStudio('dame algunas ideas')));
/* CONTROLES: lo que sí es de Beauty, la clave de dos letras y lo que empieza por la clave siguen encajando. */
check('H17) CONTROL: «ropa para una boda» y «maquillaje de noche» SIGUEN yendo a Weë Beauty',
  enElStudio('ropa para una boda') === 'beauty' && enElStudio('maquillaje de noche') === 'beauty', `${enElStudio('ropa para una boda')} · ${enElStudio('maquillaje de noche')}`);
check('H18) CONTROL: una clave de DOS letras sigue siendo una palabra: «cv» en «Mi CV actualizado» lleva a Weë Business',
  ids('Mi CV actualizado').includes('business') && ids('mi cv').includes('business') && ids('cv').includes('business'));
check('H19) CONTROL: una palabra que EMPIEZA por la clave sigue valiendo: «videoclip» (video), «recetas» (receta), «fotos» (foto), «logos» (logo)',
  ids('quiero un videoclip').includes('studio') && ids('unas recetas buenas').includes('chef') && ids('quiero fotos de mi gato').includes('photo') && ids('mis logos nuevos').includes('design'));
check('H20) CONTROL: la clave ENTERA en mitad de una frase sigue valiendo, aunque dentro de otras palabras haya otra: «una cena romántica» lleva a Weë Chef',
  ids('una cena romántica').includes('chef') && ids('para la cena de hoy').includes('chef'));
check('H21) CONTROL: una clave de varias palabras, entera en mitad de una frase, sigue valiendo: «color de cabello» y «historia visual»',
  ids('quiero probar un color de cabello nuevo').includes('beauty') && ids('quiero una historia visual de mi viaje').includes('studio'));
check('H21b) y es la regla de quien usa Weë en español, con o sin región: «dame algunas ideas» tampoco da Beauty con `es`, `es-PE` ni `es-419`',
  ['es', 'es-PE', 'es-419'].every((i) => !ids('dame algunas ideas', i).includes('beauty') && !ids('cómo hacer un viaje a europa', i).includes('beauty')));
/*
 * LOS IDIOMAS QUE PEGAN PALABRAS CONSERVAN LA REGLA DE SIEMPRE: la clave española, que es su préstamo, vale también DENTRO de otra
 * palabra. Con la regla estricta para todos, «Et festlook» —el ejemplo en danés que la propia app enseña bajo Weë Beauty— dejaba de
 * llevar a Beauty (solo llegaba por «look» dentro de «festlook»); y el alemán, el sueco y el japonés, medidos sobre sus propios
 * textos de interfaz, perdían aciertos de verdad: «Profilfoto» (foto), «musikvideo» (video), «affärsplan» (plan), «Weëls» pegado a
 * la partícula japonesa. En el resto —español, inglés, francés, italiano, portugués, turco…— una clave dentro de otra palabra es
 * casi siempre un accidente («started» lleva «arte»; «impostare», «post»; «hesaplanıyor», «plan»).
 */
const PEGADAS = [
  ['da', 'Et festlook', 'beauty'], ['da-DK', 'Et festlook', 'beauty'], ['sv', 'Generera en hel musikvideo', 'studio'], ['sv-SE', 'Skriv en affärsplan', 'business'],
  ['de', 'Als Profilfoto verwenden', 'photo'], ['de-DE', 'ein Firmenlogo', 'design'], ['de_AT', 'Hochzeitsfoto', 'photo'],
  ['ja', '商品を紹介するWeëls', 'studio'], ['ja-JP', 'どんなWeëlsを作る', 'studio'], ['zh', '设计logo', 'design'], ['zh-TW', '設計logo', 'design'],
];
const sinPegar = [
  ['en', 'Not started', 'design'], ['en-US', 'Strengths and weaknesses', 'travel'], ['fr', 'Facebook', 'writer'],
  ['it', 'Inserisci la tua e-mail per reimpostare la password', 'design'], ['pt-BR', 'Revisar minhas despesas', 'travel'], ['pt-PT', 'Revisar as minhas despesas', 'travel'],
  ['tr', 'Fiyat hesaplanıyor', 'business'], ['ru', 'Facebook Story', 'writer'], ['hi', 'Facebook पोस्ट', 'writer'],
];
const malasPegadas = PEGADAS.filter(([idioma, frase, debe]) => !ids(frase, idioma).includes(debe));
check(`H23) CONTROL: en los idiomas que pegan palabras (danés, sueco, alemán, japonés, chino) se conserva la regla de siempre: ${PEGADAS.length} frases —«Et festlook», «musikvideo», «Firmenlogo»…— siguen llevando a su experiencia`,
  malasPegadas.length === 0, malasPegadas.map(([i, f, d]) => `${i}: ${f} (${d})`).join(' | '));
const malasSinPegar = sinPegar.filter(([idioma, frase, espuria]) => ids(frase, idioma).includes(espuria));
check(`H24) y en los demás idiomas (inglés, francés, italiano, portugués, turco, ruso, hindi) la clave DENTRO de otra palabra tampoco cuenta: ${sinPegar.length} frases ya no encajan lo que no es`,
  malasSinPegar.length === 0, malasSinPegar.map(([i, f, d]) => `${i}: ${f} (${d})`).join(' | '));
{
  /* Exhaustivo: cada clave española —de una o de varias palabras—, escrita entera en mitad de una frase, lleva a su experiencia. */
  const perdidas = [];
  let probadas = 0;
  for (const e of W.ALL_EXPERIENCES) {
    for (const k of e.keywords) {
      probadas++;
      if (!ids(`quiero ${k} para mi negocio`).includes(e.id)) perdidas.push(`${k}→${e.id}`);
    }
  }
  check(`H25) CONTROL: cada una de las ${probadas} claves españolas, escrita entera en mitad de una frase, sigue llevando a su experiencia`, perdidas.length === 0, perdidas.slice(0, 8).join(' '));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ El enrutado por palabras de la caja del Studio no manda frases corrientes a Weë Beauty (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
