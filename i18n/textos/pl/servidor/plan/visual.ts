/*
 * POLACO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Los huecos con opciones van detrás de dos puntos o entre paréntesis, en nominativo. Donde el español queda cojo
 * («generar para promocionar algo»), la frase se escribe entera y bien, como pide su cabecera. Los segundos van como
 * «{{segundos}} s», que no necesita concordancia.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Stworzę {{numero}} logo dla „{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Stworzę {{numero}} logo dla „{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'w poważnym i budzącym zaufanie klimacie',
  designAlmaModern: 'w nowoczesnym klimacie',
  designAlmaClose: 'w przyjaznym i zabawnym klimacie',
  designAlmaLuxury: 'w luksusowym klimacie',
  designAlmaNatural: 'w naturalnym klimacie',

  designExplicaAnuncio: 'Stworzę {{numero}} propozycje ogłoszenia. Temat: {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Stworzę {{numero}} propozycje ogłoszenia. Temat: {{anuncio}}, {{donde}}.',
  designDondeFeed: 'w formacie kwadratowym, na Instagram lub Facebooka',
  designDondeStory: 'w pionie, na relację',
  designDondeWhatsapp: 'w formacie łatwym do udostępnienia na WhatsAppie',
  designDondePrint: 'w formacie A4, gotowe do druku',

  designExplicaPropuestas: 'Stworzę {{numero}} propozycje. Temat: {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Stworzę {{numero}} propozycje. Temat: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'o nowoczesnym i czystym wyglądzie',
  designMatizLookNatural: 'o naturalnym wyglądzie',
  designMatizLookLuxury: 'o luksusowym wyglądzie',
  designMatizLookFun: 'o zabawnym i kolorowym wyglądzie',
  designMatizLookIndustrial: 'o industrialnym wyglądzie',
  designMatizEraFuture: 'z przyszłości',
  designMatizEraNow: 'z dzisiejszych czasów',
  designMatizEraClassic: 'w klasycznym stylu',
  designMatizEraScifi: 'w stylu science fiction',
  designMatizInoutOutside: 'z zewnątrz',
  designMatizInoutInside: 'od środka',
  designMatizInoutWide: 'w szerokim ujęciu',
  designMatizDrawCartoon: 'w stylu kreskówki',
  designMatizDrawReal: 'w realistycznym stylu',
  designMatizDrawGame: 'w estetyce gry wideo',
  designMatizDrawPencil: 'w formie rysunku ołówkiem',
  designMatizDrawCute: 'w uroczym klimacie',

  designPasoConcepto: 'Określanie koncepcji',
  designPasoLogos: 'Tworzenie logo ({{numero}})',
  designPasoPropuestas: 'Tworzenie propozycji ({{numero}})',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Obejrzę twoje zdjęcie i ożywię je (styl: {{estilo}}). Powstanie klip o długości {{segundos}} s, gotowy do udostępnienia.',

  studioExplicaVideo: 'Napiszę krótki scenariusz, wygeneruję film ({{video}}; {{segundos}} s, {{formato}}, styl: {{estilo}}) i nagram narrację.',
  studioExplicaVideoPromo: 'Napiszę krótki scenariusz, wygeneruję film promocyjny ({{segundos}} s, {{formato}}, styl: {{estilo}}) i nagram narrację.',
  studioExplicaVideoMisRedes: 'Napiszę krótki scenariusz, wygeneruję film do twoich mediów społecznościowych ({{segundos}} s, {{formato}}, styl: {{estilo}}) i nagram narrację.',
  studioVideoRedes: 'do twoich mediów społecznościowych',
  studioEstiloRitmo: 'przyjazny i dynamiczny',
  studioFormatoVertical: 'w pionie na Instagram i TikToka',
  studioFormatoHorizontal: 'w poziomie na YouTube',
  studioFormatoCuadrado: 'w kwadracie na WhatsAppa i Facebooka',
  studioDecisionRedes: 'przygotuję to do twoich mediów społecznościowych',
  studioDecisionEstilo: 'wybieram przyjazny i dynamiczny styl',
  studioDecisionVertical: 'robię format pionowy, który pasuje do Instagrama i TikToka',

  studioPasoMirarFoto: 'Oglądanie twojego zdjęcia',
  studioPasoMovimiento: 'Ożywianie zdjęcia',
  studioPasoGuion: 'Pisanie scenariusza (liczba scen: {{numero}})',
  studioPasoVideo: 'Generowanie filmu',
  studioPasoNarracion: 'Nagrywanie narracji',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Stworzę {{numero}} obrazy na podstawie tego, co mi opowiesz: {{como}}.',

  photoExplicaMejorarCalidad: 'Najpierw obejrzę twoje zdjęcie, a potem poprawię jakość i rozdzielczość, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaQuitarAlgo: 'Najpierw obejrzę twoje zdjęcie, a potem usunę to, co zbędne, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaFondo: 'Najpierw obejrzę twoje zdjęcie, a potem zmienię lub usunę tło, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaRestaurar: 'Najpierw obejrzę twoje stare zdjęcie, a potem je odnowię, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaRetoque: 'Najpierw obejrzę twoje zdjęcie, a potem naturalnie wyretuszuję twarz, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaColorizar: 'Najpierw obejrzę twoje czarno-białe zdjęcie, a potem je pokoloruję, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaTransformar: 'Najpierw obejrzę twoje zdjęcie, a potem przekształcę je w wybranym stylu, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaSinAccion: 'Najpierw obejrzę twoje zdjęcie, a potem poprawię jego jakość, {{como}}. Całą resztę zostawię bez zmian.',
  photoExplicaAccion: 'Najpierw obejrzę twoje zdjęcie, a potem zajmę się tym: {{accion}}, {{como}}. Całą resztę zostawię bez zmian.',
  photoComoNatural: 'jak najbardziej naturalnie',
  photoDecisionCalidad: 'zaczynam od poprawy jakości',
  photoDecisionNatural: 'robię to jak najbardziej naturalnie',
  photoDecisionNaturales: 'tworzę je jak najbardziej naturalne',

  photoPasoMirarFoto: 'Oglądanie zdjęcia, żeby zrozumieć, co na nim jest',
  photoPasoImagenes: 'Tworzenie obrazów ({{numero}})',
  photoPasoMejorarFoto: 'Poprawianie zdjęcia',
  photoPasoMejorarCalidad: 'Poprawianie jakości i rozdzielczości',
  photoPasoQuitarAlgo: 'Usuwanie tego, co zbędne',
  photoPasoFondo: 'Zmiana lub usunięcie tła',
  photoPasoRestaurar: 'Odnawianie starego zdjęcia',
  photoPasoRetoque: 'Naturalny retusz twarzy',
  photoPasoColorizar: 'Kolorowanie czarno-białego zdjęcia',
  photoPasoTransformar: 'Przekształcanie w wybranym stylu',

  /* LA VOZ DE QUIEN HABLA: Weë habla de «ti», no de «mí». */
  designCosaMascota: 'maskotka twojej marki',
};
