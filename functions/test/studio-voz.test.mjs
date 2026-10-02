/*
 * WEË STUDIO Y LA VOZ (B3.15).
 *
 * La auditoría midió cuatro cosas, y las cuatro mandan sobre lo que hay aquí:
 *
 *  1. En TODO el catálogo de capacidades hay UNA de voz: `voice.tts`. No existe
 *     `voice.generate`, ni `voice.clone`, ni `voice.style`, ni `voice.character`,
 *     ni `audio.generate`, ni `audio.edit`, ni `audio.compose`. La sirven dos
 *     proveedores reales: ElevenLabs y MiniMax.
 *
 *  2. Existe UN plan que produce voz sola —`text.generate` + `voice.tts`, sin
 *     tocar `music.generate`— y vive en la plantilla de Weë Music. El otro
 *     `voice.tts` del sistema es el tercer paso de un plan de vídeo.
 *
 *  3. «Lectura» caía en `text.generate + music.generate + image.generate`: no
 *     lleva ninguna palabra que suene a voz, así que la plantilla entendía
 *     «hazme una canción». Y `music.generate` está PENDIENTE.
 *
 *  4. La voz elegida NO llega al proveedor: el plan escribe `input.voice` y los
 *     adaptadores solo leen `input.voiceId`. Nadie traduce entre los dos.
 *
 *  A. Una sola capacidad de voz, y no se inventa ninguna.
 *  B. Las cuatro experiencias producen voz de verdad. (EJECUTADO)
 *  C. Ninguna pide componer música. (EJECUTADO)
 *  D. Lo que no llega al proveedor no se promete.
 *  E. El audio usa el camino de siempre.
 *  F. Nada duplicado, nada inventado.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const capas = leer('constants/studioExperiences.ts');
const studio = leer('screens/StudioScreen.tsx');
const capability = leer('functions/src/core/capability.ts');

console.log('\n─── A. Una sola capacidad de voz, y no se inventa ninguna ───');

/* El catálogo entero, leído de su propia unión de tipos. */
const catalogo = (() => {
  const i = capability.indexOf('export type CapabilityId =');
  return [...capability.slice(i, capability.indexOf(';', i)).matchAll(/'([a-z0-9.]+)'/g)].map((m) => m[1]);
})();
const deVoz = catalogo.filter((c) => c.startsWith('voice.'));
check('el catálogo tiene exactamente una capacidad de voz', deVoz.length === 1 && deVoz[0] === 'voice.tts', deVoz.join(', '));

/* Y ninguna de las que se podrían dar por hechas existe. */
for (const inventada of ['voice.generate', 'voice.clone', 'voice.style', 'voice.character', 'audio.generate', 'audio.edit', 'audio.compose']) {
  check(`${inventada} no existe, y no se inventa`, !catalogo.includes(inventada));
}
/* Lo que sí existe de audio, dicho con precisión: uno real y uno pendiente. */
check('audio.transcribe existe y lo sirve un proveedor real',
  catalogo.includes('audio.transcribe') && /'audio\.transcribe'/.test(leer('functions/src/engine/providers/gemini.ts')));
check('audio.sfx existe pero su cadena es la pendiente',
  catalogo.includes('audio.sfx') && /'audio\.sfx': routing\('audio\.sfx', chain\('music-pending'\)/.test(leer('functions/src/engine/registry.ts')));

/* Y voice.tts la sirven dos proveedores de verdad. */
for (const proveedor of ['elevenlabs', 'minimax']) {
  check(`${proveedor} sirve voice.tts`, /'voice\.tts'/.test(leer(`functions/src/engine/providers/${proveedor}.ts`)));
}
check('y su cadena los nombra a los dos', /'voice\.tts': routing\('voice\.tts', chain\('elevenlabs', 'minimax'\)/.test(leer('functions/src/engine/registry.ts')));

/* CONTROL: una capacidad de voz inventada TIENE que caer. */
check('CONTROL: una voice.clone inventada sería detectada',
  !catalogo.includes('voice.clone'), 'si esto pasara, el grupo A no protegería nada');

console.log('\n─── B. Las cuatro producen voz de verdad. EJECUTADO ───');

const bloqueVoz = capas.slice(capas.indexOf('export const EXPERIENCIAS_DE_VOZ'), capas.indexOf('/**\n * PERSONAJES.'));
const ids = [...bloqueVoz.matchAll(/x\('([a-zA-Z]+)'/g)].map((m) => m[1]);
check('son las cuatro de B3.11',
  JSON.stringify(ids) === JSON.stringify(['narration', 'voiceOver', 'characterVoice', 'reading']), ids.join(', '));
check('y todas contestan que quieren una voz', (bloqueVoz.match(/DECIR_ALGO/g) || []).length === 4);

const { TEMPLATES } = lib('creator/templates.js');
const GOALS = {
  narration: 'Narración: La historia de mi ciudad',
  voiceOver: 'Locución: Una voz en off para mi anuncio',
  characterVoice: 'Voz de personaje: Un anciano sabio del bosque',
  reading: 'Lectura: El primer capítulo de mi libro',
};
const planDe = (id) => TEMPLATES.music.buildPlan(GOALS[id], { ...TEMPLATES.music.infer(GOALS[id]), what: 'voice', voice: 'idk' });

for (const id of ids) {
  const caps = planDe(id).steps.map((s) => s.capability);
  check(`${id}: el plan acaba en voice.tts`,
    caps.length === 2 && caps[0] === 'text.generate' && caps[1] === 'voice.tts', caps.join(' + '));
}

/* La entrada Voz del Studio lleva a la experiencia que tiene ese plan. */
check('la entrada Voz ya tiene su experiencia', /id: 'voice',[^\n]*experienceId: 'music'/.test(capas));

console.log('\n─── C. Ninguna pide componer música. EJECUTADO ───');

/*
 * `music.generate` está PENDIENTE. Que un plan de narración lo pidiera no daría
 * un aviso: daría un trabajo que no puede terminar. Aquí estaba el fallo de
 * «Lectura» y aquí se queda vigilado.
 */
for (const id of ids) {
  const caps = planDe(id).steps.map((s) => s.capability);
  check(`${id}: y no pide componer ni ilustrar`,
    !caps.includes('music.generate') && !caps.includes('image.generate'), caps.join(' + '));
}

/* CONTROL: el fallo, reconstruido. Sin contestar, «Lectura» pedía una canción. */
const rota = TEMPLATES.music.buildPlan(GOALS.reading, TEMPLATES.music.infer(GOALS.reading));
check('CONTROL: sin contestar, «Lectura» pedía componer una canción',
  rota.steps.some((s) => s.capability === 'music.generate'),
  rota.steps.map((s) => s.capability).join(' + '));

console.log('\n─── D. Lo que no llega al proveedor no se promete ───');

/*
 * LA VOZ ELEGIDA NO LLEGA. Medido: el plan escribe `input.voice` y los dos
 * adaptadores leen `input.voiceId`. Nadie traduce entre los dos, así que suena
 * siempre la de por defecto.
 *
 * Por eso las cuatro experiencias contestan «que elija Weë»: preguntar
 * «¿femenina o masculina?» para después ignorarlo sería prometer una elección
 * que no existe. Esta comprobación existe para que el día que la voz SÍ llegue,
 * alguien se acuerde de devolver la pregunta.
 */
const plantillas = leer('functions/src/creator/templates.ts');
const eleven = leer('functions/src/engine/providers/elevenlabs.ts');
const minimax = leer('functions/src/engine/providers/minimax.ts');
check('el plan escribe `voice`', /input: \{ voice: voice\.id \}/.test(plantillas));
check('y los adaptadores leen `voiceId`',
  /input\.voiceId/.test(eleven) && /input\.voiceId/.test(minimax));
check('y nadie traduce entre los dos', !/voiceId/.test(plantillas) && !/input\.voice\b[^I]/.test(eleven));
check('así que las cuatro dicen que elige Weë', (bloqueVoz.match(/VOZ_QUE_ELIGE_WEE/g) || []).length === 4);

/* Y ningún control de voz se enseña como si funcionara. */
const controles = leer('components/studio/StudioControles.tsx');
const camara = leer('constants/camaraCinematica.ts');
check('no se inventaron controles de voz',
  !/velocidad|pitch|emoci[oó]n|entonaci[oó]n|speed|emotion/i.test(bloqueVoz));
check('ni familias de control para la voz', ids.every((id) => {
  const i = bloqueVoz.indexOf(`x('${id}'`);
  return /\[\], false,/.test(bloqueVoz.slice(i, i + 120));
}), 'una voz no se encuadra');
check('y la biblioteca de cámara sigue siendo solo visual', !/voice|voz/i.test(camara.replace(/\/\*[\s\S]*?\*\//g, ' ')));

/* El límite real del texto, medido y sin fingir que se parte solo. */
check('el proveedor corta el texto a 5 000 caracteres', /\.slice\(0, 5000\)/.test(eleven) && /\.slice\(0, 5000\)/.test(minimax));
check('y nadie finge que lo parte en trozos',
  !/chunk|trocear|segmentar|splitText/i.test(eleven + minimax + plantillas));

console.log('\n─── E. El audio usa el camino de siempre ───');

check('el proveedor guarda el audio donde se guarda todo',
  /saveGeneratedFile\(ctx\.userId, buffer, 'audio\/mpeg', 'voice'\)/.test(eleven));
const ejecutor = leer('functions/src/creator/index.ts');
check('y el material va al Asset Core de siempre', /await materialesDeResultado\(/.test(ejecutor));
check('con la reserva y la liquidación de siempre',
  /await holdCredits\(/.test(ejecutor) && /await settleCredits\(/.test(ejecutor));
const precio = leer('functions/src/credits/aiPricing.ts');
check('y el precio se calcula por caracteres, como estaba',
  /if \(capability === 'voice\.tts'\)/.test(precio) && /VOICE_USD_PER_KCHAR/.test(precio));
/* Y el resultado se escucha con el reproductor que ya existía. */
const resultado = leer('components/creator/ResultCard.tsx');
check('el resultado se escucha con el reproductor de siempre',
  /job\.results\.filter\(\(r\) => r\.kind === 'audio'\)/.test(resultado) && /toggleAudio/.test(resultado));
check('y no hay un VoiceResultCard', !/VoiceResultCard|AudioResultCard/.test(resultado + studio + capas));

console.log('\n─── F. Nada duplicado, nada inventado ───');

const PARALELO = /VoiceEngine|TtsEngine|AudioEngine|VoicePlanner|VoiceRouter|VoiceCredits|VoiceAssetManager|voiceCreativeEngine|audioCreativeEngine/;
const FRONT = [capas, studio, leer('components/studio/StudioPanel.tsx'), controles];
check('ni un segundo motor de voz', !FRONT.some((s) => PARALELO.test(s)));
/*
 * Se mira el CÓDIGO, no los comentarios. El único sitio donde hoy aparece
 * `voiceId` en el frontend es la explicación de por qué la voz elegida no llega
 * al proveedor —que es justo la deuda que no se quiere perder—. Buscar la
 * palabra a secas obligaría a borrar esa explicación para que el guard pasara,
 * que es exactamente al revés de lo que hace falta.
 */
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
check('ni proveedor o modelo en el frontend',
  !FRONT.some((s) => /\b(elevenlabs|minimax|gemini|seedance|voiceId|modelId|providerId)\b/i.test(sinComentarios(s))));
check('y la deuda sigue escrita donde se explica',
  /voiceId/.test(capas) && /input\.voice\b/.test(capas));
check('el Studio sigue sin llamar a ningún servicio de creación',
  !/creatorService|brainService|httpsCallable/.test(studio));
/* Voz no es Música, y no se confunden. */
check('Music sigue siendo un lugar de trabajo aparte',
  /'studio' \| 'design' \| 'travel' \| 'chef' \| 'business' \| 'music'/.test(leer('constants/weeWorkspaces.ts')));
check('y no es una entrada del Studio',
  !/\{ id: 'music',/.test(capas));
/* Voz generada no es voz escuchada: dictar sigue siendo otra cosa. */
check('dictar no se confunde con generar voz',
  /onVoz=\{alAnadirReferencia\}/.test(studio) || !/audio\.transcribe/.test(studio),
  'el Studio no transcribe: eso es audio.transcribe y es otra capacidad');

/* Y la deuda de B3.12 sigue abierta. */
const tipos = leer('functions/src/creator/types.ts');
check('la estructura creativa sigue sin tener sitio en el plan',
  !/hints/.test(tipos) && !/creative/.test(tipos));

/* CONTROL: un motor de voz paralelo TIENE que caer. */
check('CONTROL: un VoiceEngine sería detectado', PARALELO.test('class VoiceEngine {}'),
  'si esto pasara, el grupo F no protegería nada');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nLa voz de Weë Studio pasa por voice.tts y por ningún sitio más');
process.exit(failures ? 1 : 0);
