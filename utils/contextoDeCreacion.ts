import { ContextoDeCreacion } from '../constants/ajustesContextuales';

/**
 * QUÉ ESTÁ CREANDO LA PERSONA, DEDUCIDO AQUÍ MISMO.
 *
 * Los ajustes cambian con el contexto, así que alguien tiene que decir cuál es.
 * Lo dice esta pieza, y lo dice EN EL TELÉFONO: sin llamadas, sin modelos y sin
 * gastar un Credit. Abrir los ajustes, tocar una píldora o escribir una palabra
 * son gestos de interfaz; cobrarlos sería absurdo.
 *
 * El día que Weë Brain entre a decidir de verdad, entrará por el mismo sitio
 * —`contextoDeCreacion`— y esto se quedará como lo que es: la respuesta rápida
 * mientras no hay otra.
 *
 * ── Dos fuentes, y una manda ─────────────────────────────────────────────────
 *
 * 1. LA PUERTA que se abrió (Imágenes, Videos, Voz…). Es un acto, no una
 *    interpretación: si alguien entró por Videos, está haciendo un video.
 * 2. LO ESCRITO, cuando no hay puerta. Unas cuantas palabras claras y nada más:
 *    "un video de diez segundos" es un video; "un cartel" es una imagen.
 *
 * Y si ninguna de las dos dice nada, el contexto es `general`: se preguntan solo
 * las cosas que valen para cualquier creación. Nunca se inventa un medio —jamás
 * aparece "Duración" solo por estar dentro del Studio—.
 */

/** La puerta del Studio, tal como la nombra su catálogo. */
type Puerta = 'images' | 'videos' | 'voice' | 'writer' | 'documents' | 'more';

const POR_PUERTA: Record<Puerta, ContextoDeCreacion> = {
  images: 'imagen',
  videos: 'video',
  voice: 'voz',
  writer: 'texto',
  documents: 'documento',
  /* "Más herramientas" es de todo un poco: no dice qué se está creando. */
  more: 'general',
};

/*
 * Las palabras que delatan cada medio. Lista corta a propósito: es mejor
 * quedarse en `general` —y preguntar solo lo común— que enseñar "Duración"
 * porque alguien escribió "grabar una idea".
 *
 * Se mira en este orden: el video primero, porque "un video de mi producto"
 * también nombra la foto y lo que manda es lo que se quiere OBTENER.
 */
const PISTAS: { contexto: ContextoDeCreacion; palabras: RegExp }[] = [
  { contexto: 'video', palabras: /\b(v[ií]deos?|clips?|we[eë]ls?|reels?|animaci[oó]n|animad[oa]s?|metraje|tr[aá]iler)\b/i },
  { contexto: 'imagen', palabras: /\b(im[aá]gen(?:es)?|fotos?|fotograf[ií]as?|ilustraci[oó]n|dibujos?|cartel(?:es)?|p[oó]ster|logo(?:tipo)?s?|miniaturas?)\b/i },
  { contexto: 'voz', palabras: /\b(voz|voces|narraci[oó]n|locuci[oó]n|audios?|podcasts?|doblaje)\b/i },
  { contexto: 'documento', palabras: /\b(pdf|documentos?|informes?|presentaci[oó]n|curr[ií]culum|cv|contratos?)\b/i },
  { contexto: 'texto', palabras: /\b(textos?|art[ií]culos?|gui[oó]n(?:es)?|posts?|correos?|cartas?|descripci[oó]n)\b/i },
];

/*
 * Las mismas pistas en el idioma de quien escribe. Se SUMAN a las de arriba —en español no cambia nada— y se miran en
 * el mismo orden de medios. Los límites de palabra son los de Unicode y no `\b`, que no sabe que «æ», «ø» y «å»
 * son letras.
 */
const PISTAS_POR_IDIOMA: Readonly<Record<'da' | 'en', Partial<Record<ContextoDeCreacion, RegExp>>>> = {
  da: {
    video: /(?<!\p{L})(videoer?|videoen|klip|we[eë]ls?|reels?|animation(?:er)?|animeret|optagelser?|trailer(?:e|en)?)(?!\p{L})/iu,
    imagen: /(?<!\p{L})(billeder?|billedet|fotos?|fotografi(?:er)?|illustration(?:er)?|tegning(?:er)?|plakat(?:er)?|logo(?:er|et)?|thumbnails?|miniaturer?)(?!\p{L})/iu,
    voz: /(?<!\p{L})(stemmer?|speak|voiceover|fortælling|oplæsning|lydfil(?:er)?|podcasts?|dubbing)(?!\p{L})/iu,
    documento: /(?<!\p{L})(pdf|dokument(?:er|et)?|rapport(?:er)?|præsentation(?:er)?|cv|ansøgning(?:er)?|kontrakt(?:er)?)(?!\p{L})/iu,
    texto: /(?<!\p{L})(tekst(?:er)?|artikel|artikler|manuskript(?:er)?|opslag|e-?mails?|breve?|beskrivelse(?:r)?)(?!\p{L})/iu,
  },
  en: {
    video: /(?<!\p{L})(videos?|clips?|we[eë]ls?|reels?|animation|animated|footage|trailers?)(?!\p{L})/iu,
    imagen: /(?<!\p{L})(images?|pictures?|photos?|photographs?|illustrations?|drawings?|posters?|logos?|thumbnails?)(?!\p{L})/iu,
    voz: /(?<!\p{L})(voices?|voice-?over|narration|audio|podcasts?|dubbing)(?!\p{L})/iu,
    documento: /(?<!\p{L})(pdf|documents?|reports?|presentations?|résumé|resume|cv|contracts?)(?!\p{L})/iu,
    texto: /(?<!\p{L})(texts?|articles?|scripts?|posts?|e-?mails?|letters?|descriptions?)(?!\p{L})/iu,
  },
};

const baseDe = (idioma?: string): 'da' | 'en' | undefined => {
  if (/^da(?:-|$)/i.test(idioma ?? '')) return 'da';
  if (/^en(?:-|$)/i.test(idioma ?? '')) return 'en';
  return undefined;
};

/**
 * El contexto de lo que se está creando. `general` mientras no se sepa.
 *
 * `puerta` es lo que se eligió en el Studio; `texto`, lo que se lleva escrito; `idioma`, el de la app, para
 * reconocer también lo que se escribe en él.
 */
export const contextoDeCreacion = (
  puerta?: string | null,
  texto?: string,
  idioma?: string
): ContextoDeCreacion => {
  if (puerta && puerta in POR_PUERTA) {
    const porPuerta = POR_PUERTA[puerta as Puerta];
    if (porPuerta !== 'general') return porPuerta;
  }
  const escrito = texto?.trim();
  if (escrito) {
    const base = baseDe(idioma);
    const suyas = base ? PISTAS_POR_IDIOMA[base] : undefined;
    for (const pista of PISTAS) {
      if (pista.palabras.test(escrito) || suyas?.[pista.contexto]?.test(escrito)) return pista.contexto;
    }
  }
  return 'general';
};

/** Las duraciones que Weë sabe hacer hoy. Un Weël llega a quince segundos. */
const DURACIONES = [5, 10, 15];

/**
 * "Quiero un video de 10 segundos" → `10s`.
 *
 * Es una sugerencia, no una decisión: se enseña marcada mientras nadie toque esa
 * fila, y en cuanto alguien elige, manda su elección. Un número entre medias se
 * lleva a la duración más cercana de las que hay —y a la mayor cuando queda
 * justo en el medio, porque cortar un video sobra y estirarlo no se puede—.
 *
 * Solo tiene sentido preguntarlo cuando ya se sabe que es un video; quien llama
 * lo comprueba antes.
 */
export const duracionEnElTexto = (texto?: string, idioma?: string): string | null => {
  /* «10 sek», «10 sekunder», «a 10-second video»: lo mismo dicho en el idioma de la app. */
  const otra = baseDe(idioma) === 'da' ? /(\d{1,3})[\s-]*sek(?:\.|under|unders)?(?!\p{L})/iu
    : baseDe(idioma) === 'en' ? /(\d{1,3})[\s-]*sec(?:s|onds?)?(?!\p{L})/iu
    : undefined;
  const encontrado = texto?.match(/(\d{1,3})\s*(?:s\b|segs?\b|segundos?\b)/i) ?? (otra ? texto?.match(otra) : null);
  if (!encontrado) return null;
  const numero = Number(encontrado[1]);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  /* `<=` y no `<`: en un empate gana la mayor, que es la última de la lista. */
  const cerca = DURACIONES.reduce((mejor, actual) =>
    Math.abs(actual - numero) <= Math.abs(mejor - numero) ? actual : mejor
  );
  return `${cerca}s`;
};
