/*
 * LOS DATOS DEL MODO DEMO — puros y deterministas. Sin Firebase, sin red, sin reloj propio.
 *
 * Una red social creativa de mentira para grabar la presentación de Weë a Y Combinator, SOLO en los emuladores
 * (docs/WEE-DEMO.md). Las personas son ficticias; el contenido está en inglés porque lo ven los revisores de YC.
 *
 * Reglas que esta lista cumple y que `functions/test/demo-aislamiento.test.mjs` vigila:
 *  · todo documento lleva `isDemo: true`, y sus ids empiezan por `demo`;
 *  · un elemento cuyo medio no existe NO se crea: nunca una imagen haciéndose pasar por vídeo;
 *  · «Cómo lo hice» sale del REGISTRO de medios (`medios.mjs`), que dice cómo se hizo cada archivo de verdad: el
 *    prompt que se ve es el que se usó, y lo que viene de stock no presume de IA;
 *  · los recuentos que se pintan salen de los documentos sembrados, no se inventan aparte;
 *  · las fechas son relativas al momento de sembrar (`ahoraMs`).
 */

export const MARCA_DEMO = Object.freeze({ isDemo: true });
export const PREFIJO_DEMO = 'demo';

/** Las colecciones donde escribe el sembrador. */
export const COLECCIONES_DEMO = ['users', 'posts', 'comments', 'likes', 'votes', 'follows', 'econtacts', 'conversations', 'creatorJobs', 'creditTransactions', 'communities', 'pages', 'pageFollows'];

const HORA = 3600 * 1000;
const DOS = (n) => String(n).padStart(2, '0');

/** Sin `_`: es la forma de identidad que exige ËContact (functions/src/social/econtact.ts). */
export const idDeCreador = (n) => `demoCreator${DOS(n)}`;

/** Quien mira la demo. Solo existe en el emulador de Auth. */
export const ESPECTADOR = Object.freeze({
  uid: 'demoViewer',
  uidWee: 'hidi_demoViewer',
  correo: 'viewer@demo.wee.test',
  clave: 'wee-demo-viewer',
  nombre: 'Geovet',
  usuario: 'geovet',
});

export const CREADORES = [
  { n: 1, nombre: 'Maya Lindqvist', usuario: 'maya.frames', pais: 'Sweden', oficio: 'filmmaker', bio: 'Short films from Stockholm. Stories first, tools second.', intereses: ['AI filmmaking', 'storyboards'], rasgos: 'Scandinavian woman in her early 30s, short blond hair, wearing a charcoal jacket on a film set at dusk' },
  { n: 2, nombre: 'Tariq Haddad', usuario: 'tariq.cuts', pais: 'Jordan', oficio: 'filmmaker', bio: 'Documentary editor turned AI director. Amman ↔ Berlin.', intereses: ['documentary', 'color grading'], rasgos: 'Middle Eastern man in his late 30s, trimmed beard, olive overshirt, warm desert evening light' },
  { n: 3, nombre: 'Lucía Prado', usuario: 'lucia.draws', pais: 'Argentina', oficio: 'artist', bio: 'Digital painter. Buenos Aires light, in every palette.', intereses: ['digital art', 'illustration'], rasgos: 'Latin American woman in her late 20s, curly dark hair, paint-stained denim shirt, sunny studio' },
  { n: 4, nombre: 'Kenji Arakawa', usuario: 'kenji.ink', pais: 'Japan', oficio: 'artist', bio: 'Sumi-e roots, generative present. Kyoto.', intereses: ['generative art', 'ink'], rasgos: 'Japanese man in his 40s, round glasses, simple dark linen shirt, quiet workshop' },
  { n: 5, nombre: 'Amara Okafor', usuario: 'amara.sound', pais: 'Nigeria', oficio: 'musician', bio: 'Afrobeat producer. I score my own visuals.', intereses: ['music production', 'visuals'], rasgos: 'Nigerian woman in her early 30s, braided hair, headphones around the neck, music studio' },
  { n: 6, nombre: 'Leo Marchetti', usuario: 'leo.keys', pais: 'Italy', oficio: 'musician', bio: 'Pianist from Bologna exploring film music.', intereses: ['piano', 'film scores'], rasgos: 'Italian man in his mid 30s, dark wavy hair, navy sweater, beside a grand piano' },
  { n: 7, nombre: 'Sofía Quispe', usuario: 'sofia.cocina', pais: 'Peru', oficio: 'chef', bio: 'Andean ingredients, modern plates. Lima.', intereses: ['Peruvian cuisine', 'recipes'], rasgos: 'Peruvian woman in her 30s, hair tied back, white chef jacket, bright restaurant kitchen' },
  { n: 8, nombre: 'Daniel Osei', usuario: 'chef.daniel', pais: 'Ghana', oficio: 'chef', bio: 'West African home cooking for busy people.', intereses: ['home cooking', 'meal ideas'], rasgos: 'Ghanaian man in his 30s, friendly smile, green apron, home kitchen with morning light' },
  { n: 9, nombre: 'Elena Costa', usuario: 'elena.lens', pais: 'Portugal', oficio: 'photographer', bio: 'Portraits and coastlines. Lisbon-based.', intereses: ['photography', 'portraits'], rasgos: 'Portuguese woman in her late 30s, shoulder-length brown hair, holding a vintage camera, coastal light' },
  { n: 10, nombre: 'Ravi Menon', usuario: 'ravi.light', pais: 'India', oficio: 'photographer', bio: 'Street photographer. Kochi, monsoon, neon.', intereses: ['street photography', 'editing'], rasgos: 'Indian man in his early 30s, short black hair, rain jacket, city street after rain' },
  { n: 11, nombre: 'Inès Laurent', usuario: 'ines.atelier', pais: 'France', oficio: 'fashion', bio: 'Slow fashion designer. Paris atelier.', intereses: ['fashion design', 'textiles'], rasgos: 'French woman in her early 30s, dark bob haircut, cream blazer, atelier with fabric rolls' },
  { n: 12, nombre: 'Jae-won Park', usuario: 'jaewon.studio', pais: 'South Korea', oficio: 'fashion', bio: 'Seoul streetwear. Prototypes before patterns.', intereses: ['streetwear', 'prototyping'], rasgos: 'Korean man in his late 20s, styled black hair, oversized grey jacket, urban rooftop' },
  { n: 13, nombre: 'Noor Rahman', usuario: 'noor.roams', pais: 'Malaysia', oficio: 'traveler', bio: 'Slow travel, 41 countries, one backpack.', intereses: ['slow travel', 'itineraries'], rasgos: 'Malaysian woman in her early 30s, light headscarf, backpack, mountain viewpoint' },
  { n: 14, nombre: 'Tomás Rivas', usuario: 'tomas.routes', pais: 'Chile', oficio: 'traveler', bio: 'Patagonia guide. I plan trips the long way.', intereses: ['hiking', 'route planning'], rasgos: 'Chilean man in his 40s, weathered face, grey beard stubble, wind jacket, Patagonian landscape' },
  { n: 15, nombre: 'Grace Mwangi', usuario: 'grace.builds', pais: 'Kenya', oficio: 'entrepreneur', bio: 'Founder of a small coffee brand in Nairobi.', intereses: ['small business', 'branding'], rasgos: 'Kenyan woman in her 30s, confident smile, mustard blouse, modern coffee shop' },
  { n: 16, nombre: 'Marco Ibáñez', usuario: 'marco.founder', pais: 'Colombia', oficio: 'entrepreneur', bio: 'Two-person furniture studio in Medellín.', intereses: ['product design', 'startups'], rasgos: 'Colombian man in his mid 30s, short dark hair, rolled sleeves, woodworking studio' },
  { n: 17, nombre: 'Hannah Weiss', usuario: 'hannah.explains', pais: 'Germany', oficio: 'enthusiast', bio: 'Teacher. I explain AI to people who did not ask.', intereses: ['AI literacy', 'education'], rasgos: 'German woman in her 40s, glasses, light blue sweater, bright classroom' },
  { n: 18, nombre: 'Samir Benali', usuario: 'samir.tries', pais: 'Morocco', oficio: 'enthusiast', bio: 'Nurse by day. Weekend experiments with AI.', intereses: ['hobby projects', 'creative AI'], rasgos: 'Moroccan man in his early 30s, short curly hair, casual white shirt, sunny courtyard' },
].map((c) => ({ ...c, id: idDeCreador(c.n) }));

/*
 * Publicaciones del Wall. `medio` nombra su ranura en el registro de medios; `prompt` es lo que se le pide al motor y,
 * si el medio se genera así, lo que enseña «Cómo lo hice». `proceso` es el relato de los pasos.
 */
export const PUBLICACIONES = [
  { autor: 1, horas: 2, seccion: 'studio', herramienta: 'Weë Studio', texto: 'Six frames for my next short: a woman waits for a train that never comes. Every shot planned before generating a single second.', tags: ['AIfilm', 'storyboard'], prompt: 'Cinematic still, a woman alone on a snowy Swedish train platform at blue hour, sodium lamps, 35mm film grain, shallow depth of field', proceso: 'I wrote the story in three sentences, asked for one frame per sentence, then kept the two that felt lonely enough.' },
  { autor: 7, horas: 4, seccion: 'chef', herramienta: 'Weë Chef', texto: 'Ceviche for people who are scared of ceviche. Fifteen minutes, no special tools. Recipe in the comments.', tags: ['ceviche', 'recipes'], prompt: 'Overhead food photograph of Peruvian ceviche on a dark ceramic plate, red onion, sweet potato, lime, natural window light, editorial style', proceso: 'I told it what was in my fridge and how much time I had. It adapted the classic recipe and wrote a shopping list.' },
  { autor: 11, horas: 6, seccion: 'fashion', herramienta: 'Weë Fashion', texto: 'First look at the linen capsule. Testing silhouettes before cutting any fabric saves me weeks and a lot of waste.', tags: ['slowfashion', 'capsule'], prompt: 'Fashion editorial photograph, model in an oversized undyed linen coat, Paris courtyard in soft morning light, full body, natural pose', proceso: 'I sketched the coat by hand, described the fabric and asked for it on three body types before making a toile.' },
  { autor: 3, horas: 9, seccion: 'design', herramienta: 'Weë Design', texto: 'La Boca at 7pm. I keep trying to paint this exact orange.', tags: ['digitalart', 'buenosaires'], prompt: 'Digital painting of colorful La Boca houses in Buenos Aires at golden hour, loose expressive brushwork, orange and teal palette', proceso: 'Started from my own sketch, then explored palettes until one looked like the memory.' },
  { autor: 13, horas: 12, seccion: 'travel', herramienta: 'Weë Travel', texto: 'Five slow days in northern Vietnam. Weë built the route around trains and markets, not airports.', tags: ['slowtravel', 'vietnam'], prompt: 'Travel photograph of a misty rice terrace valley in northern Vietnam at sunrise, small figure walking on a path, documentary style', proceso: 'I gave it my budget and said I hate flying. It proposed the route, then I swapped two days by hand.' },
  { autor: 15, horas: 15, seccion: 'business', herramienta: 'Weë Business', texto: 'New packaging for our Nyeri single origin. We tested four directions with customers before printing anything.', tags: ['smallbusiness', 'coffee'], prompt: 'Product photograph of a matte kraft coffee bag with minimal typography on a wooden counter in a Nairobi café, soft daylight', proceso: 'I described our brand in plain words, picked two directions and asked regulars which bag they would pick up.' },
  { autor: 9, horas: 19, seccion: 'photo', herramienta: 'Weë Photo', texto: 'An old-world portrait study from Nazaré. I wanted the feeling of a photo my grandmother could have kept.', tags: ['portrait', 'blackandwhite'], prompt: 'Black and white portrait of an elderly Portuguese fisherwoman by the sea, vintage photograph look, fine detail, soft contrast, a fictional person', proceso: 'I described the light of the old family albums and asked to keep the grain and the imperfections.' },
  { autor: 4, horas: 24, seccion: 'design', herramienta: 'Weë Design', texto: 'Ink study #41. The rule: one breath, one stroke, then the machine answers.', tags: ['generativeart', 'sumie'], prompt: 'Minimal Japanese sumi-e ink painting of a heron in mist, generous negative space, washi paper texture', proceso: 'I paint one stroke by hand, photograph it and ask for a composition that respects it.' },
  { autor: 5, horas: 28, seccion: 'music', herramienta: 'Weë Studio', texto: 'Cover art for my next EP, "Harmattan". It had to feel like dust and heat, not like a poster.', tags: ['afrobeat', 'coverart'], prompt: 'Album cover art, abstract warm dust haze over Lagos skyline at dawn, grainy film texture, ochre and deep blue, no text', proceso: 'I described the sound with weather words instead of music words. That worked better.' },
  { autor: 16, horas: 33, seccion: 'design', herramienta: 'Weë Design', texto: 'Our new lounge chair in three woods. We used to pay for a prototype to learn this.', tags: ['furniture', 'productdesign'], prompt: 'Studio product photograph of a mid-century lounge chair in walnut wood and woven cane, soft grey background, realistic materials', proceso: 'From a pencil drawing to three material studies in an afternoon.' },
  { autor: 8, horas: 38, seccion: 'chef', herramienta: 'Weë Chef', texto: 'Jollof for one person on a Tuesday. Yes, it can be done. No, my mother does not approve.', tags: ['jollof', 'homecooking'], prompt: 'Warm food photograph of a single bowl of Ghanaian jollof rice with fried plantain on a wooden table, steam, natural light', proceso: 'I asked for a one-person version that keeps the smoky base. It adjusted every quantity and the timing.' },
  { autor: 10, horas: 44, seccion: 'photo', herramienta: 'Weë Photo', texto: 'Kochi after the rain. Same street I walk every day.', tags: ['streetphotography', 'monsoon'], prompt: 'Street photograph at night in Kochi India after monsoon rain, neon reflections on wet asphalt, person with umbrella, cinematic color', proceso: 'I described the street and how the light falls after the rain, then explored a few moods.' },
  { autor: 12, horas: 52, seccion: 'fashion', herramienta: 'Weë Fashion', texto: 'Drop 04 prototype. Which colorway should we sample first?', tags: ['streetwear', 'seoul'], prompt: 'Streetwear lookbook photograph, oversized technical jacket in slate grey, Seoul rooftop at dusk, confident pose, editorial lighting', proceso: 'I generated the colorways to compare them before sampling any fabric.' },
  { autor: 17, horas: 60, seccion: 'brain', herramienta: 'Weë Brain', texto: 'I asked my students to design a poster explaining what a language model is. Thirteen-year-olds explain it better than most articles.', tags: ['AIliteracy', 'education'], prompt: 'Bright classroom photograph of teenagers pinning colorful hand-made posters on a wall, candid moment, natural light', proceso: 'Weë Brain helped me turn the topic into three questions they could answer without any technical words.' },
  { autor: 14, horas: 68, seccion: 'travel', herramienta: 'Weë Travel', texto: 'Torres del Paine, the long way around. Eight days, every refuge booked in the right order.', tags: ['patagonia', 'hiking'], prompt: 'Landscape photograph of Torres del Paine granite towers at sunrise, turquoise lake, wind-bent trees, wide angle, natural colors', proceso: 'I gave it my pace and the season; it worked out the order of the refuges and flagged two river crossings.' },
  { autor: 2, horas: 76, seccion: 'studio', herramienta: 'Weë Studio', texto: 'Testing a look for a documentary about my father\'s bakery in Amman.', tags: ['documentary', 'colorgrade'], prompt: 'Cinematic documentary still of an old bakery in Amman at dawn, baker lifting bread from a stone oven, warm light, dust in the air', proceso: 'I described the memory and tried color palettes until one felt like the old home videos.' },
  { autor: 18, horas: 88, seccion: 'design', herramienta: 'Weë Design', texto: 'Nurse by day. This weekend I illustrated a bedtime story for my niece, and she has notes.', tags: ['bedtimestory', 'hobby'], prompt: 'Children\'s book illustration of a small fox reading under a lamp in a Moroccan courtyard at night, soft watercolor, gentle colors', proceso: 'She told me the story, I typed it word for word. The fox was her idea. The hat was also her idea.' },
  { autor: 6, horas: 96, seccion: 'music', herramienta: 'Weë Studio', texto: 'Scoring a scene I do not have yet. So I made the scene.', tags: ['filmscore', 'piano'], prompt: 'Moody photograph of a grand piano in an empty Bologna theatre, single spotlight, dust particles, cinematic composition', proceso: 'I needed an image to play to. I described the mood of the piece and improvised while looking at it.' },
  { autor: 7, horas: 110, seccion: 'chef', herramienta: 'Weë Chef', texto: 'Quinoa that does not taste like a punishment.', tags: ['andean', 'recipes'], prompt: 'Food photograph of a colorful Andean quinoa salad with roasted corn and herbs on a handmade ceramic plate, natural light', proceso: 'I asked for three versions of the recipe and picked the one with the least effort.' },
  { autor: 15, horas: 124, seccion: 'business', herramienta: 'Weë Business', texto: 'What I wish someone had told me before opening a second café: a thread, because three of you asked.', tags: ['founders', 'lessons'], prompt: 'Candid photograph of a small African coffee shop team preparing to open in the morning, warm light, natural and unposed', proceso: 'I dumped all my notes and asked for the structure. The lessons and the mistakes are all mine.' },
  { autor: 3, horas: 140, seccion: 'design', herramienta: 'Weë Design', texto: 'Portrait commission, no faces allowed. My favorite constraint this year.', tags: ['portrait', 'illustration'], prompt: 'Abstract digital portrait suggested by shapes only, no face, layered paper textures, terracotta, cream and deep blue', proceso: 'We worked only with colors and objects, never a face.' },
  { autor: 13, horas: 160, seccion: 'travel', herramienta: 'Weë Travel', texto: 'A train window is the best office I have ever had.', tags: ['slowtravel', 'remote'], prompt: 'Photograph through a train window of green tea hills in Sri Lanka, laptop on a small table in the foreground, soft afternoon light', proceso: 'I asked for rail routes that suit remote work and compared the options.' },
  { autor: 11, horas: 180, seccion: 'fashion', herramienta: 'Weë Fashion', texto: 'Natural dye tests: walnut, onion skin and indigo.', tags: ['naturaldye', 'textiles'], prompt: 'Close-up photograph of hand-dyed linen swatches in walnut, onion skin and indigo tones on a wooden table, tactile detail', proceso: 'I used it to preview how each dye could look on this linen before dyeing a batch.' },
  { autor: 1, horas: 205, seccion: 'studio', texto: 'For a one-minute short: voice-over or only music?', tags: ['AIfilm', 'question'],
    poll: { pregunta: 'What works better in a one-minute short?', opciones: [['voz', 'Voice-over', 7], ['musica', 'Only music', 11], ['ambas', 'Both', 4]], diasAbierta: 7 } },
  { autor: 17, horas: 230, texto: 'Serious question: how do you explain AI to your parents?', tags: ['AIliteracy', 'question'],
    poll: { pregunta: 'How do you explain it?', opciones: [['ejemplo', 'With a practical example', 9], ['analogia', 'With an analogy', 6], ['nolo', 'I don\'t even try', 3]], diasAbierta: 5 } },
  { autor: 18, horas: 260, texto: 'Honest beginner tip: describe what you want the way you would describe it to a friend. It took me months to stop writing like a robot.', tags: ['beginners', 'tips'] },
  { autor: 14, horas: 280, texto: 'Route planning rule I learned the hard way: never trust a river crossing until you have asked someone who lives nearby.', tags: ['patagonia', 'hiking'] },
].map((p, i) => ({ ...p, id: `demoPost${DOS(i + 1)}`, medio: p.prompt ? `post-${DOS(i + 1)}` : null }));

/*
 * Weëls: vídeos verticales 9:16. `origen` es el PLAN: 'ia' se genera; 'stock' se busca con licencia con `busqueda`. Lo
 * que manda al sembrar es lo que dice el registro, no este plan.
 */
export const WEELS = [
  { autor: 1, horas: 1, tema: 'AI filmmaking', seccion: 'studio', herramienta: 'Weë Studio', origen: 'ia', texto: 'The train that never comes. First teaser.', referencia: 'weel-01-ref',
    promptReferencia: 'Cinematic vertical still of an empty snowy Swedish train platform at blue hour, sodium lamps, snow falling, distant lights on the tracks, 35mm film look. The platform is deserted. No people, no faces, no human silhouettes, no mannequins, no text, no logos.',
    prompt: 'Vertical cinematic shot, an empty snowy train platform at blue hour, distant lights slowly approach along the tracks, snow falling, 35mm film look, no people', proceso: 'I used an empty platform as the first frame and described only the movement.' },
  { autor: 2, horas: 5, tema: 'AI filmmaking', seccion: 'studio', herramienta: 'Weë Studio', origen: 'ia', texto: 'My father\'s bakery, as I remember it.', prompt: 'Vertical documentary shot, slow push-in on hands lifting fresh bread from a stone oven in an old bakery at dawn, warm light, flour in the air', proceso: 'One still, one sentence about the camera.' },
  { autor: 1, horas: 26, tema: 'AI filmmaking', seccion: 'studio', herramienta: 'Weë Studio', origen: 'ia', texto: 'Testing a slow reveal for the last scene.', prompt: 'Vertical cinematic shot, camera rises over a frozen lake at sunrise to reveal a lone wooden cabin, soft mist, muted colors', proceso: 'I asked for the camera to move as if someone were holding their breath.' },
  { autor: 7, horas: 3, tema: 'Food', seccion: 'chef', herramienta: 'Weë Chef', origen: 'ia', texto: 'Six seconds of pure lime.', prompt: 'Vertical close-up food video, lime juice poured over fresh ceviche on a dark plate, slow motion droplets, natural window light', proceso: 'I wanted the moment the lime hits the fish. That is the entire brief.' },
  { autor: 8, horas: 8, tema: 'Food', seccion: 'chef', herramienta: 'Weë Chef', origen: 'ia', texto: 'The smoky base is everything.', prompt: 'Vertical cooking video, tomato and pepper base sizzling in a black pot, steam rising, wooden spoon stirring, warm kitchen light', proceso: 'Show the base, because it is the only step that matters.' },
  { autor: 7, horas: 48, tema: 'Food', seccion: 'chef', herramienta: 'Weë Chef', origen: 'ia', texto: 'Plating quinoa like it matters.', prompt: 'Vertical overhead video, hands plating a colorful quinoa salad on a handmade ceramic plate, fresh herbs falling, soft natural light', proceso: 'I described the plate and how the hands move when nobody is in a hurry.' },
  /*
   * Sin personas: Seedance rechaza un primer fotograma con un rostro fotorrealista, aunque sea ficticio
   * (InputImageSensitiveContentDetected.PrivacyInformation). `referencia` es su propia ranura: la miniatura anterior se conserva.
   */
  { autor: 11, horas: 11, tema: 'Fashion', seccion: 'fashion', herramienta: 'Weë Fashion', origen: 'ia', texto: 'How the linen moves. That was the whole question.', referencia: 'weel-07-ref',
    promptReferencia: 'Cinematic editorial fashion photograph in vertical format: an oversized undyed linen coat on an elegant wooden hanger, suspended from a discreet thin black metal stand in a Parisian stone courtyard with cobblestones, soft morning light, the fabric gently lifted by a breeze. The coat hangs empty. No people, no faces, no human silhouettes, no mannequins, no text, no logos.',
    prompt: 'Vertical fashion video, an empty oversized undyed linen coat on an elegant wooden hanger in a Paris courtyard, the fabric moving gently in the wind, slow camera push-in, soft morning light, no people', proceso: 'Before cutting the fabric I needed to see how the linen catches the wind.' },
  { autor: 12, horas: 21, tema: 'Fashion', seccion: 'fashion', herramienta: 'Weë Fashion', origen: 'ia', texto: 'Drop 04, in motion.', referencia: 'weel-08-ref',
    promptReferencia: 'Cinematic vertical streetwear editorial photograph: an empty oversized slate grey technical jacket on a metal hanger, suspended from a discreet thin black stand on a Seoul rooftop at dusk, city lights behind. The jacket hangs empty. No people, no faces, no human silhouettes, no mannequins, no text, no logos.',
    prompt: 'Vertical streetwear video, an empty slate grey technical jacket on a hanger on a Seoul rooftop at dusk, the fabric moving in a gust of wind, city lights behind, dynamic camera, no people', proceso: 'The lookbook frame came first; then I asked for one gust of wind.' },
  { autor: 11, horas: 70, tema: 'Fashion', seccion: 'fashion', herramienta: 'Weë Fashion', origen: 'ia', texto: 'Indigo day.', prompt: 'Vertical close-up video, a linen cloth slowly lifted from an indigo dye vat, deep blue liquid dripping, natural workshop light', proceso: 'I wanted to preview the color before committing to a full batch.' },
  { autor: 3, horas: 14, tema: 'Digital art', seccion: 'design', herramienta: 'Weë Design', origen: 'ia', texto: 'Painting that will not stay still.', prompt: 'Vertical animation, colorful Buenos Aires houses painted in loose brushstrokes with paint slowly flowing and shifting, orange and teal', proceso: 'I gave it the painting as the first frame and asked for the paint to stay wet.' },
  { autor: 4, horas: 32, tema: 'Digital art', seccion: 'design', herramienta: 'Weë Design', origen: 'ia', texto: 'One stroke. Then the machine answers.', prompt: 'Vertical animation, a black ink stroke spreading through wet washi paper and slowly becoming a heron in mist, minimal composition', proceso: 'I described a single ink stroke and asked it to grow slowly.' },
  { autor: 3, horas: 90, tema: 'Digital art', seccion: 'design', herramienta: 'Weë Design', origen: 'ia', texto: 'Paper portrait, unfolding.', prompt: 'Vertical stop-motion style animation of layered paper shapes in terracotta and deep blue assembling into an abstract portrait', proceso: 'I described it as stop motion so it would feel handmade.' },
  { autor: 5, horas: 17, tema: 'Music', texto: 'Studio night, new EP.', origen: 'stock', busqueda: 'music producer studio night vertical' },
  { autor: 6, horas: 58, tema: 'Music', texto: 'Hands on keys, before the scene exists.', origen: 'stock', busqueda: 'pianist hands playing piano vertical' },
  { autor: 13, horas: 23, tema: 'Travel', texto: 'This is why you take the slow train.', origen: 'stock', busqueda: 'train window landscape vertical' },
  { autor: 14, horas: 40, tema: 'Travel', texto: 'Day six. Nobody else up here.', origen: 'stock', busqueda: 'mountain hiking aerial vertical' },
  { autor: 16, horas: 36, tema: 'Architecture', texto: 'Light as a building material.', origen: 'stock', busqueda: 'modern architecture interior light vertical' },
  { autor: 9, horas: 100, tema: 'Architecture', texto: 'Lisbon, looking up.', origen: 'stock', busqueda: 'old city building facade tilt vertical' },
  { autor: 17, horas: 64, tema: 'Technology', texto: 'What a data center actually looks like.', origen: 'stock', busqueda: 'data center server lights vertical' },
  { autor: 18, horas: 120, tema: 'Technology', texto: 'Weekend project: the robot arm finally moves.', origen: 'stock', busqueda: 'robotic arm workshop vertical' },
].map((w, i) => ({ ...w, id: `demoWeel${DOS(i + 1)}`, medio: `weel-${DOS(i + 1)}`, miniatura: `weel-${DOS(i + 1)}-thumb` }));

/*
 * Lo que aparece en el perfil de quien mira. Se reasigna, no se copia: el muro no repite contenido, y ningún creador se
 * queda sin publicaciones.
 */
/* Lo que quien mira ha guardado mientras navegaba: publicaciones de OTROS creadores. */
export const GUARDADAS = Object.freeze(['demoPost07', 'demoPost12', 'demoPost17', 'demoPost10', 'demoPost18', 'demoPost08']);

/* Comunidades creadas por la gente sobre cualquier tema (no son las secciones de Weë). Portada: una publicación ya generada. */
export const COMUNIDADES = Object.freeze([
  { slug: 'street-photography-after-dark', nombre: 'Street Photography After Dark', descripcion: 'Night streets, neon and rain. Share the shot and how you lit it.', icono: 'camera-outline', portada: 'post-12', miembros: 2140, autor: 10 },
  { slug: 'home-cooks', nombre: 'Home Cooks', descripcion: 'Real kitchens, real weeknights. Recipes that fit a Tuesday.', icono: 'restaurant-outline', portada: 'post-11', miembros: 3420, autor: 8 },
  { slug: 'slow-travel', nombre: 'Slow Travel', descripcion: 'Trains over planes, markets over malls. Routes, budgets and stories.', icono: 'train-outline', portada: 'post-05', miembros: 1860, autor: 13 },
  { slug: 'childrens-book-illustrators', nombre: 'Children\'s Book Illustrators', descripcion: 'Bedtime stories, picture books and the kids who give the notes.', icono: 'book-outline', portada: 'post-17', miembros: 1210, autor: 18 },
  { slug: 'ink-and-brush', nombre: 'Ink & Brush', descripcion: 'Sumi-e, calligraphy and the space between strokes.', icono: 'brush-outline', portada: 'post-08', miembros: 980, autor: 4 },
  { slug: 'film-scores', nombre: 'Film Scores & Soundtracks', descripcion: 'Music for scenes that do not exist yet.', icono: 'musical-notes-outline', portada: 'post-18', miembros: 760, autor: 6 },
  { slug: 'small-coffee-roasters', nombre: 'Small Coffee Roasters', descripcion: 'Packaging, pricing and the second café nobody warned you about.', icono: 'cafe-outline', portada: 'post-06', miembros: 540, autor: 15 },
  { slug: 'natural-dyes', nombre: 'Natural Dyes & Textiles', descripcion: 'Walnut, onion skin, indigo. Swatches before batches.', icono: 'color-palette-outline', portada: 'post-23', miembros: 430, autor: 11 },
]);

export const DEL_ESPECTADOR = Object.freeze(['demoPost04', 'demoPost13', 'demoPost19', 'demoPost22', 'demoPost23', 'demoWeel03']);
/*
 * De esos trabajos de la cuenta, estos se publicaron desde el Perfil Weë (Jay Reeds) y no desde el Real: lo creado es de la
 * cuenta (Mis creaciones y Mis proyectos son los mismos desde las dos caras), pero cada cara publica lo que quiere.
 */
export const DEL_PERFIL_WEE = Object.freeze(['demoPost04', 'demoPost13', 'demoWeel03']);
const autorDe = (e) => (DEL_PERFIL_WEE.includes(e.id) ? ESPECTADOR.uidWee : DEL_ESPECTADOR.includes(e.id) ? ESPECTADOR.uid : idDeCreador(e.autor));

/* Una conversación de WeeTalk entre quien mira y una creadora. Quién habla: 'e' espectador, 'c' creadora. */
export const CONVERSACION = Object.freeze({
  id: 'demoConversation01',
  creadora: 1,
  mensajes: [
    ['c', 'Hi Geovet! I saw your lake Weël. The light on the ice is beautiful.', 26],
    ['e', 'Thank you, Maya! Your train teaser is what made me try it.', 25.5],
    ['c', 'That means a lot. Did you start from an image or just a description?', 25],
    ['e', 'A single still, then one sentence about how the camera should move.', 24.5],
    ['c', 'Same here. Less direction, better shots. Want to make a short together?', 3],
    ['e', 'Yes! Your story and my locations. Should we start in Weë Studio?', 2.5],
    ['c', 'Perfect. I will share the storyboard tonight.', 2],
  ],
});

/* «Mis proyectos» de Weë Chef: platos ya generados para la demo. Se reutilizan: no se genera nada para esto. */
export const PROYECTOS_DE_CHEF = Object.freeze([
  { medio: 'post-02', objetivo: 'Ceviche for four with what I have at home', horas: 5 },
  { medio: 'post-19', objetivo: 'A healthy quinoa salad for the week', horas: 30 },
  { medio: 'weel-06-thumb', objetivo: 'Light lunch with fresh vegetables', horas: 54 },
  { medio: 'post-11', objetivo: 'One-person jollof for a weeknight', horas: 80 },
]);

const COMENTARIOS = {
  general: ['This is beautiful. How long did it take you?', 'Saving this one.', 'The light here is perfect.', 'Would you share the first version too?', 'This made my morning.', 'I tried something like this and failed. Any tips?'],
  respuestas: ['Thank you! About an afternoon, most of it deciding what to cut.', 'Happy to. I will post the first draft tomorrow.', 'Describe it like you would to a friend. That changed everything for me.', 'Same here, it took me a lot of attempts.'],
};

/* Los medios y la base: una URL de un servidor de desarrollo local, nunca un almacenamiento. */
const IP_PRIVADA = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./];

/**
 * ¿Es `base` un servidor de desarrollo local? http(s), sin credenciales, sin query, a localhost o a una IP privada.
 * @returns {{ ok: true, base: string } | { ok: false, motivo: string }}
 */
export const validarBaseMedios = (base) => {
  if (typeof base !== 'string' || !base.trim()) return { ok: false, motivo: 'falta --base-medios (p. ej. http://192.168.0.39:8096)' };
  let u;
  try { u = new URL(base.trim()); } catch { return { ok: false, motivo: `«${base}» no es una URL` }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, motivo: 'la base de medios tiene que ser http(s)' };
  if (u.username || u.password) return { ok: false, motivo: 'la base de medios no lleva credenciales' };
  if (u.search || u.hash) return { ok: false, motivo: 'la base de medios no lleva query ni fragmento' };
  const h = u.hostname.replace(/^\[|\]$/g, '');
  const local = h === 'localhost' || h === '::1' || IP_PRIVADA.some((r) => r.test(h));
  if (!local) return { ok: false, motivo: `«${h}» no es localhost ni una IP privada: los medios demo solo se sirven en la red local` };
  return { ok: true, base: u.href.replace(/\/+$/, '') };
};

/*
 * A qué sección va cada publicación: las píldoras del Home leen `destinations` (utils/sectionFeed.ts). El id de la sección
 * que se pinta como Weë Fashion es 'business'. Lo de negocios, fotografía y Brain no tiene píldora y va solo al muro general.
 */
const SECCION_CON_PILDORA = { studio: 'studio', travel: 'travel', music: 'music', chef: 'chef', design: 'design', fashion: 'business' };
export const seccionDe = (seccion) => {
  const id = SECCION_CON_PILDORA[seccion];
  return id ? { sourceSection: id, destinations: ['general', id] } : { destinations: ['general'] };
};

/** Un generador congruencial con semilla fija: el mismo reparto en cada siembra. */
const aleatorio = (semilla) => {
  let s = semilla >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
};

/**
 * «CÓMO LO HICE» — pura. Solo cuenta lo que el registro dice que pasó.
 *  · generado con IA: la herramienta, el prompt real y el proceso;
 *  · stock: nada de IA;
 *  · provisional (ensayo técnico): lo dice, sin atribuirse herramientas.
 */
export const comoLoHice = (elemento, registro) => {
  if (!registro || registro.origen === 'stock') return {};
  if (registro.origen === 'provisional') {
    return { aiProcess: 'Placeholder media for a technical rehearsal. Creation details appear once the final media exists.' };
  }
  if (registro.origen !== 'ia') return {};
  return {
    ...(elemento.herramienta ? { aiTools: [elemento.herramienta] } : {}),
    aiPrompt: registro.prompt,
    ...(elemento.proceso ? { aiProcess: elemento.proceso } : {}),
  };
};

/**
 * TODOS LOS DOCUMENTOS DEMO — pura.
 *
 * @param {{ ahoraMs: number, baseMedios: string, registro: Record<string, { archivo: string, origen: string, prompt?: string, modelo?: string, licencia?: string, fuente?: string, autor?: string, ancho?: number, alto?: number }>, sello?: (ms: number) => unknown }} p
 * @returns {{ documentos: { coleccion: string, id: string, datos: object }[], omitidos: { id: string, medio: string }[] }}
 */
export const construirDocumentos = ({ ahoraMs, baseMedios, registro = {}, sello = (ms) => ms }) => {
  if (!Number.isFinite(ahoraMs)) throw new Error('ahoraMs');
  const base = validarBaseMedios(baseMedios);
  if (!base.ok) throw new Error(base.motivo);
  /* Lo que se ve es la copia ligera, si existe (`optimizar-medios.mjs`); `medioDemo.archivo` sigue nombrando el original. */
  const urlDe = (archivo) => `${base.base}/${encodeURIComponent(archivo)}`;
  const url = (id) => (registro[id] ? urlDe(registro[id].ligero || registro[id].archivo) : null);
  const urlMini = (id) => (registro[id] ? urlDe(registro[id].mini || registro[id].ligero || registro[id].archivo) : null);
  const hace = (horas) => sello(ahoraMs - horas * HORA);
  const documentos = [];
  const omitidos = [];
  const poner = (coleccion, id, datos) => documentos.push({ coleccion, id, datos: { ...datos, ...MARCA_DEMO } });
  const procedencia = (id) => {
    const r = registro[id];
    return { medioDemo: { id, archivo: r.archivo, origen: r.origen, ...(r.modelo ? { modelo: r.modelo } : {}), ...(r.licencia ? { licencia: r.licencia, fuente: r.fuente, autor: r.autor } : {}) } };
  };

  /* Lo que no tiene su medio no existe. */
  const elementos = [];
  for (const p of PUBLICACIONES) {
    if (p.medio && !registro[p.medio]) { omitidos.push({ id: p.id, medio: p.medio }); continue; }
    elementos.push({ ...p, kind: 'post' });
  }
  for (const w of WEELS) {
    if (!registro[w.medio]) { omitidos.push({ id: w.id, medio: w.medio }); continue; }
    elementos.push({ ...w, kind: 'weel' });
  }

  /* Reacciones y comentarios entre creadores, con reparto fijo. */
  const azar = aleatorio(20261101);
  const ids = CREADORES.map((c) => c.id);
  let nComentario = 0;
  const conInteracciones = elementos.map((e) => {
    const otros = ids.filter((id) => id !== autorDe(e));
    const desde = Math.floor(azar() * otros.length);
    const quien = (k) => otros[(desde + k) % otros.length];
    const acuerdos = Array.from({ length: 4 + Math.floor(azar() * 12) }, (_, k) => quien(k));
    const cuantos = 1 + Math.floor(azar() * 4);
    const comentarios = [];
    for (let k = 0; k < cuantos; k++) {
      nComentario++;
      const id = `demoComment${String(nComentario).padStart(3, '0')}`;
      const hora = Math.max(0.5, e.horas - (k + 1) * 0.4);
      comentarios.push({ id, userId: quien(k + 2), content: COMENTARIOS.general[nComentario % COMENTARIOS.general.length], hora });
      if (k === 0) {
        nComentario++;
        comentarios.push({
          id: `demoComment${String(nComentario).padStart(3, '0')}`,
          userId: autorDe(e),
          content: COMENTARIOS.respuestas[nComentario % COMENTARIOS.respuestas.length],
          hora: Math.max(0.25, hora - 0.2),
          parentCommentId: id,
        });
      }
    }
    return { ...e, acuerdos, comentarios };
  });

  /* Seguir: cada creador sigue a los cinco siguientes. ËContact aceptado: con los dos siguientes. */
  const follows = [];
  const contactos = [];
  CREADORES.forEach((c, i) => {
    for (let k = 1; k <= 5; k++) follows.push([c.id, CREADORES[(i + k) % CREADORES.length].id]);
    for (let k = 1; k <= 2; k++) contactos.push([c.id, CREADORES[(i + k) % CREADORES.length].id, 'accepted']);
  });

  for (const c of CREADORES) {
    const avatar = `avatar-${DOS(c.n)}`;
    const portada = `cover-${DOS(c.n)}`;
    poner('users', c.id, {
      uid: c.id,
      displayName: c.nombre,
      username: c.usuario,
      bio: c.bio,
      country: c.pais,
      interests: c.intereses,
      ...(url(avatar)
        ? { photoURL: url(avatar), photoURLThumbnail: urlMini(avatar), avatarType: 'custom' }
        : { avatarType: 'predefined', avatarId: 'robot' }),
      ...(url(portada) ? { bannerURL: url(portada), coverPhotoURL: url(portada) } : {}),
      profileType: 'real',
      followers: follows.filter(([, b]) => b === c.id).length,
      following: follows.filter(([a]) => a === c.id).length,
      posts: conInteracciones.filter((e) => autorDe(e) === c.id).length,
      joinedCommunities: [],
      createdAt: hace(24 * 60),
      updatedAt: hace(24 * 60),
    });
  }

  /* Quien mira: una cuenta con sus dos caras, conectada con dos creadores y con una solicitud por contestar. */
  poner('users', ESPECTADOR.uid, {
    /* `language`: la demo es en inglés aunque el aparato esté en otro idioma (components/SincronizarIdioma.tsx). */
    uid: ESPECTADOR.uid, displayName: ESPECTADOR.nombre, username: ESPECTADOR.usuario, email: ESPECTADOR.correo, language: 'en', bio: 'Exploring what people make with AI.',
    /*
     * La cuenta queda sembrada YA INICIALIZADA y con saldo 0: sin bono de bienvenida (decisión del dueño,
     * 2026-11-04). Inicializada para que el Credit Engine no la «abra» otra vez al primer vistazo.
     */
    creditsBalance: 0, creditsLifetimeEarned: 0, creditsLifetimeSpent: 0, creditsInitializedAt: hace(24 * 7),
    ...(url('perfil-geovet') ? { photoURL: url('perfil-geovet'), photoURLThumbnail: urlMini('perfil-geovet'), avatarType: 'custom' } : { avatarType: 'predefined', avatarId: 'male' }), profileType: 'real', linkedAccountId: ESPECTADOR.uidWee,
    followers: 2, following: 2, posts: conInteracciones.filter((e) => autorDe(e) === ESPECTADOR.uid).length, joinedCommunities: [], createdAt: hace(24 * 7), updatedAt: hace(24 * 7),
  });
  poner('users', ESPECTADOR.uidWee, {
    /* El alter ego: la portada de Jay Reeds que entregó el dueño (avatar y banner recortados de ella). */
    uid: ESPECTADOR.uidWee, displayName: 'Jay Reeds', username: 'jay.reeds', bio: 'Space westerns, night colors and short films. My other side.',
    avatarType: 'custom', photoURL: urlDe('l-jayreeds.webp'), photoURLThumbnail: urlDe('m-jayreeds.webp'), bannerURL: urlDe('l-jayreeds-cover.webp'), coverPhotoURL: urlDe('l-jayreeds-cover.webp'),
    profileType: 'hidi', linkedAccountId: ESPECTADOR.uid, followers: 0, following: 0, posts: conInteracciones.filter((e) => autorDe(e) === ESPECTADOR.uidWee).length, joinedCommunities: [], createdAt: hace(24 * 7), updatedAt: hace(24 * 7),
  });
  contactos.push([idDeCreador(1), ESPECTADOR.uid, 'accepted'], [idDeCreador(7), ESPECTADOR.uid, 'accepted'], [idDeCreador(11), ESPECTADOR.uid, 'pending']);

  /* ẄContact (la agenda del Perfil Weë): seis creadores tienen su cara Weë y están conectados con la del espectador. */
  const CARAS_WEE = [
    [1, 'Frame Ghost', 'ninja'], [3, 'Pixel Muse', 'lorelei'], [5, 'Bassline Fox', 'fun-emoji'],
    [9, 'Night Lens', 'masked'], [12, 'Neon Tailor', 'bottts'], [13, 'Map Drifter', 'adventurer'],
  ];
  CARAS_WEE.forEach(([n, alias, avatarId], i) => {
    const id = `hidi_${idDeCreador(n)}`;
    poner('users', id, {
      uid: id, displayName: alias, username: alias.toLowerCase().replace(' ', '.'), bio: '', avatarType: 'predefined', avatarId,
      profileType: 'hidi', linkedAccountId: idDeCreador(n), followers: 0, following: 0, posts: 0, joinedCommunities: [], createdAt: hace(24 * 10), updatedAt: hace(24 * 10),
    });
    contactos.push([id, ESPECTADOR.uidWee, i === 5 ? 'pending' : 'accepted']);
  });
  /*
   * Las dos agendas son independientes y cruzan tipos (functions/src/social/econtact.ts no restringe el tipo, solo que
   * no te conectes contigo): el Perfil Real tiene una cara Weë como ËContact y el Perfil Weë, una persona Real como ẄContact.
   */
  contactos.push([`hidi_${idDeCreador(12)}`, ESPECTADOR.uid, 'accepted'], [idDeCreador(15), ESPECTADOR.uidWee, 'accepted']);

  /*
   * WeëPages (functions/src/social/pages.ts): Páginas de la CUENTA del espectador, no caras. Una publicada (el personaje
   * Jay Reeds) y un borrador. La siguen identidades de los dos tipos, y seguirla no la mete en ninguna agenda.
   */
  const PAGINAS = [
    { id: 'demoPage01', type: 'character', name: 'Jay Reeds and the Heart of Etter', handle: 'jayreeds.saga', status: 'published',
      shortDescription: 'A space western saga. Gunslinger, frontier moons, one stolen heart.',
      about: 'The official page of Jay Reeds, a lone gunslinger crossing the frontier moons of Etter. Chapters, concept art and short films made with Weë AI.',
      details: { characterType: 'Space western gunslinger', nature: 'fictional', biography: 'Former marshal of the Etter rim. Rides alone, talks less.', origin: 'The frontier moons of Etter' },
      logo: 'l-jayreeds.webp', cover: 'l-jayreeds-cover.webp', destacados: ['post-04', 'post-13', 'weel-03-thumb'],
      escenas: [['Chapter 1 · The last train to Etter', 'weel-01', 'weel-01-ref'], ['Chapter 2 · The reveal', 'weel-03', 'weel-03-thumb'], ['Chapter 3 · What the marshal left', 'weel-02', 'weel-02-thumb']],
      seguidores: [idDeCreador(1), `hidi_${idDeCreador(5)}`, idDeCreador(9), `hidi_${idDeCreador(12)}`] },
    { id: 'demoPage02', type: 'company', name: 'Andes Light Studio', handle: 'andeslight', status: 'draft',
      shortDescription: 'Travel films and photography from the Andes.', about: '', details: { industry: 'Photography and film' },
      logo: null, cover: 'l-post-22.webp', destacados: [], seguidores: [] },
    /* Una página que NO es del espectador, para seguirla desde su Perfil Real o su Perfil Weë. */
    { id: 'demoPage03', type: 'company', name: 'Qhapaq Kitchen', handle: 'qhapaq.kitchen', status: 'published', dueño: idDeCreador(7),
      shortDescription: 'Andean ingredients, modern plates. Lima.', about: 'A small Lima kitchen cooking quinoa, corn and ají the way grandmothers did, plated for today.',
      details: { industry: 'Restaurants', businessDescription: 'Tasting menus and cooking classes.' },
      logo: 'l-avatar-07.webp', cover: 'l-post-19.webp', destacados: ['post-02', 'post-19', 'post-11'], seguidores: [idDeCreador(8), `hidi_${idDeCreador(13)}`] },
  ];
  for (const p of PAGINAS) {
    poner('pages', p.id, {
      type: p.type, name: p.name, handle: p.handle, shortDescription: p.shortDescription, about: p.about, website: '', location: '', contact: '',
      logoURL: p.logo ? urlDe(p.logo) : '', coverURL: p.cover ? urlDe(p.cover) : '', details: p.details, status: p.status,
      ownerAccountId: p.dueño || ESPECTADOR.uid, followersCount: p.seguidores.length,
      featured: p.destacados.map((m) => url(m) || urlDe(`l-${m}.webp`)).filter(Boolean),
      ...(p.escenas ? { scenes: p.escenas.map(([title, video, poster]) => ({ title, videoURL: url(video) || urlDe(`r-${video}.mp4`), posterURL: url(poster) || urlDe(`l-${poster}.webp`) })) } : {}),
      createdAt: hace(24 * 6), updatedAt: hace(p.status === 'published' ? 20 : 3), ...(p.status === 'published' ? { publishedAt: hace(24 * 5) } : {}),
    });
    for (const quien of p.seguidores) poner('pageFollows', `${p.id}_${quien}`, { pageId: p.id, identity: quien, createdAt: hace(24 * 4) });
  }

  for (const e of conInteracciones) {
    const miniatura = e.kind === 'weel' ? (e.referencia || e.miniatura) : e.medio;
    const conMiniatura = miniatura && registro[miniatura];
    poner('posts', e.id, {
      userId: autorDe(e),
      content: e.texto,
      ...(e.kind === 'weel'
        ? { videoUrl: url(e.medio), isWeel: true, imageUrls: [], imageUrlsThumbnails: conMiniatura ? [urlMini(miniatura)] : [] }
        : e.medio
          ? { imageUrls: [url(e.medio)], imageUrlsThumbnails: [urlMini(e.medio)], imageAspectRatios: [registro[e.medio].ancho && registro[e.medio].alto ? registro[e.medio].ancho / registro[e.medio].alto : 4 / 5] }
          : { imageUrls: [], imageUrlsThumbnails: [] }),
      ...(e.medio ? procedencia(e.medio) : {}),
      ...(e.medio ? comoLoHice(e, registro[e.medio]) : {}),
      ...seccionDe(e.seccion),
      tags: e.tags || [],
      hashtags: e.tags || [],
      likes: e.acuerdos.length,
      agreementCount: e.acuerdos.length,
      disagreementCount: 0,
      comments: e.comentarios.length,
      shares: 0,
      reposts: 0,
      views: e.acuerdos.length * 6,
      isPrivate: false,
      createdAt: hace(e.horas),
      updatedAt: hace(e.horas),
      ...(e.poll
        ? (() => {
          const counts = Object.fromEntries(e.poll.opciones.map(([id, , v]) => [id, v]));
          return {
            poll: {
              question: e.poll.pregunta,
              options: e.poll.opciones.map(([id, text]) => ({ id, text })),
              counts,
              totalVotes: Object.values(counts).reduce((a, b) => a + b, 0),
              endsAt: sello(ahoraMs + e.poll.diasAbierta * 24 * HORA),
              allowChange: true,
            },
          };
        })()
        : {}),
    });
    for (const uid of e.acuerdos) {
      const id = `${uid}_${e.id}`;
      poner('likes', id, { userId: uid, postId: e.id, createdAt: hace(Math.max(0.25, e.horas - 1)) });
      poner('votes', id, { userId: uid, postId: e.id, type: 'agree', createdAt: hace(Math.max(0.25, e.horas - 1)) });
    }
    for (const c of e.comentarios) {
      poner('comments', c.id, {
        postId: e.id, userId: c.userId, content: c.content, likes: 0, agreementCount: 0, disagreementCount: 0, createdAt: hace(c.hora),
        ...(c.parentCommentId ? { parentCommentId: c.parentCommentId } : {}),
      });
    }
  }

  /* Sin movimiento de bienvenida: no hay bono (2026-11-04). El historial empieza con la primera compra. */

  GUARDADAS.forEach((postId, i) => {
    poner(`users/${ESPECTADOR.uid}/bookmarks`, postId, { postId, createdAt: hace(2 + i * 5) });
  });

  COMUNIDADES.filter((m) => registro[m.portada]).forEach((m, i) => {
    poner('communities', `demoCommunity${DOS(i + 1)}`, {
      name: m.nombre, slug: m.slug, description: m.descripcion, icon: m.icono, rules: [], memberCount: m.miembros, postCount: 0,
      imageUrl: url(m.portada), imageThumbnailUrl: urlMini(m.portada), isOfficial: false, moderators: [idDeCreador(m.autor)], createdBy: idDeCreador(m.autor),
      status: 'active', createdAt: hace(24 * (30 + i * 9)), updatedAt: hace(24 * (2 + i)),
    });
  });

  PROYECTOS_DE_CHEF.filter((p) => registro[p.medio]).forEach((p, i) => {
    poner('creatorJobs', `demoJobChef${DOS(i + 1)}`, {
      userId: ESPECTADOR.uid, experienceId: 'chef', goal: p.objetivo, questions: [], answers: [], plan: null, steps: [],
      results: [{ stepId: 'demo', kind: 'image', title: p.objetivo, url: urlMini(p.medio), demo: true }],
      status: 'done', progressText: '', creditsEstimated: 0, creditsCharged: 0, demo: true, createdAt: hace(p.horas), updatedAt: hace(p.horas), finishedAt: hace(p.horas),
    });
  });

  const creadora = CREADORES.find((c) => c.n === CONVERSACION.creadora);
  const participante = (nombre, foto, mini) => ({ displayName: nombre, ...(foto ? { avatarType: 'custom', photoURL: foto, photoURLThumbnail: mini } : {}) });
  const quienHabla = (q) => (q === 'e' ? ESPECTADOR.uid : creadora.id);
  const ultimo = CONVERSACION.mensajes[CONVERSACION.mensajes.length - 1];
  poner('conversations', CONVERSACION.id, {
    participants: [ESPECTADOR.uid, creadora.id],
    participantsData: {
      [ESPECTADOR.uid]: participante(ESPECTADOR.nombre, url('perfil-geovet'), urlMini('perfil-geovet')),
      [creadora.id]: participante(creadora.nombre, url(`avatar-${DOS(creadora.n)}`), urlMini(`avatar-${DOS(creadora.n)}`)),
    },
    lastMessage: { content: ultimo[1], senderId: quienHabla(ultimo[0]), timestamp: hace(ultimo[2]), read: false },
    createdAt: hace(CONVERSACION.mensajes[0][2]),
    updatedAt: hace(ultimo[2]),
  });
  CONVERSACION.mensajes.forEach(([q, texto, horas], i) => {
    poner(`conversations/${CONVERSACION.id}/messages`, `demoMessage${DOS(i + 1)}`, {
      conversationId: CONVERSACION.id, senderId: quienHabla(q), content: texto, timestamp: hace(horas), read: i < CONVERSACION.mensajes.length - 1, type: 'text',
    });
  });

  for (const [a, b] of follows) poner('follows', `${a}_${b}`, { followerId: a, followingId: b, createdAt: hace(24 * 30) });
  for (const [a, b, status] of contactos) {
    const users = a < b ? [a, b] : [b, a];
    poner('econtacts', `${users[0]}_${users[1]}`, {
      users, status, requestedBy: a, requestedTo: b, createdAt: hace(24 * 20),
      ...(status === 'accepted' ? { respondedAt: hace(24 * 19) } : {}),
    });
  }

  return { documentos, omitidos };
};

/** Recuentos por tipo, para el resumen del sembrador y las pruebas. */
export const recontar = (documentos) => {
  const r = { perfiles: 0, publicaciones: 0, weels: 0, encuestas: 0, comoLoHice: 0, comentarios: 0, respuestas: 0, likes: 0, acuerdos: 0, seguimientos: 0, econtacts: 0, total: documentos.length };
  for (const d of documentos) {
    if (d.coleccion === 'users') r.perfiles++;
    else if (d.coleccion === 'posts') {
      if (d.datos.isWeel) r.weels++; else r.publicaciones++;
      if (d.datos.poll) r.encuestas++;
      if (d.datos.aiPrompt || d.datos.aiProcess) r.comoLoHice++;
    } else if (d.coleccion === 'comments') { r.comentarios++; if (d.datos.parentCommentId) r.respuestas++; }
    else if (d.coleccion === 'likes') r.likes++;
    else if (d.coleccion === 'votes') r.acuerdos++;
    else if (d.coleccion === 'follows') r.seguimientos++;
    else if (d.coleccion === 'econtacts') r.econtacts++;
  }
  return r;
};
