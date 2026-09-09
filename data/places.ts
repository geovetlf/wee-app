import { COUNTRIES, Country } from './countries';
import { CITIES, City } from './cities';

/**
 * Los lugares de Weë.
 *
 * Una publicación puede decir de qué lugar habla. Este archivo es el único sitio
 * donde Weë sabe qué lugares existen y cómo se buscan, para que ninguna pantalla
 * tenga que mantener su propia lista.
 *
 * Y no inventa ningún dato: el catálogo es la lista de países que Weë ya tenía
 * —la misma que usa el registro—, con sus códigos ISO, sus nombres y sus
 * banderas. Aquí solo se le da forma de lugar y se le añade una búsqueda.
 *
 * Hay dos clases de lugar, y la diferencia importa:
 *
 *   · del catálogo — "Perú". Tiene un identificador estable ('PE'), así que dos
 *     publicaciones que lo elijan hablan del mismo sitio con certeza.
 *   · escrito a mano — "París", "la playa de mi pueblo", "casa de mi abuela".
 *     Es exactamente lo que la persona escribió, y Weë no pretende saber dónde
 *     está: no lo convierte en coordenadas ni lo consulta con nadie.
 *
 * Lo que NO hay aquí, a propósito: coordenadas, GeoPoint, geohash, radios,
 * distancias, mapas, geocodificación y cualquier llamada a un servicio externo.
 * Un lugar es una identidad, no una posición.
 */

/** El lugar de una publicación. Pequeño y serializable tal cual a Firestore. */
export interface PostPlace {
  kind: 'catalog' | 'custom';
  /**
   * Solo en los del catálogo. Un país es su código ISO —'PE'—; una ciudad es su
   * código compuesto —'PE-LIM'—. Un identificador, nunca un nombre.
   */
  id?: string;
  /** Lo que se lee. En una ciudad, solo la ciudad: el país se resuelve al pintar. */
  label: string;
  /** Solo en las ciudades: a qué país pertenecen, para poder decirlo y enseñar su bandera. */
  countryCode?: string;
}

/** Un resultado de búsqueda: un país o una ciudad, listo para enseñar. */
export interface PlaceOption {
  id: string;
  label: string;
  flag: string;
  /** El país al que pertenece, cuando el resultado es una ciudad. */
  countryCode?: string;
  /** El nombre del país, para que "Lima" y "Lima" no se confundan al elegir. */
  sublabel?: string;
}

/** Quita acentos y baja a minúsculas, para buscar como escribe la gente. */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** El país de un código. Lo consultan la búsqueda, la bandera y la etiqueta. */
const paisDe = (codigo?: string): Country | undefined =>
  codigo ? COUNTRIES.find((c) => c.code === codigo) : undefined;

/**
 * Los acentos, quitados SIN mover un solo carácter de sitio.
 *
 * `normalize` usa NFD, que descompone "ú" en dos caracteres y por tanto ALARGA el
 * texto. Da igual para una palabra suelta, pero es fatal para el catálogo mundial:
 * la copia sin acentos se recorre con `indexOf` y luego se corta la línea sobre el
 * texto ORIGINAL, así que las dos cadenas tienen que medir exactamente lo mismo y
 * carácter a carácter. Este mapa cambia una letra por otra letra y nunca por dos.
 *
 * Lo que no es latino —cirílico, chino, árabe— se queda como está: no va a
 * coincidir con una búsqueda en español de todas formas.
 */
const SIN_TILDE: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a', å: 'a', ā: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e', ē: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i', ī: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o', ō: 'o', ø: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u', ū: 'u',
  ñ: 'n', ç: 'c', ý: 'y', ÿ: 'y', š: 's', ž: 'z', ć: 'c', č: 'c', đ: 'd', ł: 'l', ř: 'r', ș: 's', ț: 't',
};

/**
 * Hay letras cuya minúscula ocupa MÁS de un carácter —la "İ" del turco pasa a "i"
 * más un punto suelto— y eso rompería la alineación. Se cambian antes de bajar a
 * minúsculas, una por una.
 */
const MAYUSCULAS_TRAICIONERAS = /[İIÌÍÎÏĨĪ]/g;

const ACENTOS = /[áàäâãåāéèëêēíìïîīóòöôõōøúùüûūñçýÿšžćčđłřșț]/g;

/**
 * Dos pasadas nativas y ninguna concatenación en bucle: sobre dos megas de texto
 * la diferencia entre esto y recorrerlo carácter a carácter es de casi medio
 * segundo y de bastantes megas de basura.
 */
const normalizarAlineado = (texto: string): string => {
  const bajo = texto.replace(MAYUSCULAS_TRAICIONERAS, 'i').toLowerCase();
  const limpio = bajo.replace(ACENTOS, (c) => SIN_TILDE[c] || c);
  // Si aun así algo se torciera, mejor perder los acentos que devolver basura.
  return limpio.length === texto.length ? limpio : texto;
};

const comoOpcion = (pais: Country): PlaceOption => ({ id: pais.code, label: pais.name, flag: pais.flag });

// ─── El catálogo mundial ────────────────────────────────────────────────────

/**
 * Los setenta y ocho mil lugares del mundo NO se cargan al abrir Weë.
 *
 * Quien entra a mirar el muro no debería pagar por un catálogo que quizá nunca
 * use: el archivo se pide la primera vez que alguien abre el selector de lugar, y
 * no antes. Hasta entonces esto vale `null` y la búsqueda funciona igual con los
 * lugares escritos a mano, que son pocos y están siempre.
 *
 * Y cuando se carga, se guarda como lo que es —una cadena— más una segunda copia
 * normalizada para poder buscar sin acentos. Dos cadenas de dos megas, no ochenta
 * mil objetos: la diferencia entre unos megas de memoria y unas cuantas decenas.
 */
let mundo: string | null = null;
let mundoNormalizado: string | null = null;
let cargando: Promise<void> | null = null;

/** ¿Está ya el catálogo mundial en memoria? */
export const mundoListo = (): boolean => mundo !== null;

/**
 * Trae el catálogo mundial. Se puede llamar tantas veces como se quiera: la
 * primera lo carga y las demás esperan a esa misma.
 */
export const cargarMundo = async (): Promise<void> => {
  if (mundo !== null) return;
  if (cargando) return cargando;
  cargando = (async () => {
    try {
      /*
       * `require` dentro de la función, no `import` arriba ni `import()` dinámico.
       *
       * Arriba haría que el catálogo se leyera al abrir Weë, que es justo lo que
       * hay que evitar. Y el import dinámico, en React Native, no ahorra nada:
       * no hay división de código, así que los bytes viajan en el paquete de
       * todas formas —y en web Metro se pone a servirlos aparte por HTTP, que es
       * más lento y una cosa más que puede fallar—.
       *
       * Así el módulo se evalúa la primera vez que alguien abre el selector de
       * lugar, sin pedirle nada a la red y sin nada que pueda caerse.
       */
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const modulo = require('./citiesWorld') as { WORLD_PLACES: string };
      mundo = modulo.WORLD_PLACES;
      // Alineada carácter a carácter con la original: de eso depende poder cortar
      // la línea correcta después de encontrar una coincidencia.
      mundoNormalizado = normalizarAlineado(mundo);
    } catch (error) {
      // Si no se puede cargar, Weë sigue funcionando con lo escrito a mano.
      console.warn('No se pudo cargar el catálogo mundial de lugares:', error);
    } finally {
      cargando = null;
    }
  })();
  return cargando;
};

/**
 * Cuántas coincidencias del catálogo mundial se miran antes de parar.
 *
 * Buscar "san" en ochenta mil lugares encuentra miles; recorrerlos todos para
 * enseñar seis sería tirar el tiempo. Se cogen las primeras que aparecen, se
 * ordenan bien entre ellas y se para. El orden dentro del catálogo es por país y
 * dentro de cada país por identificador, así que el corte no favorece a nadie.
 */
const MAXIMO_CANDIDATOS = 400;

/**
 * Los lugares del catálogo mundial que encajan.
 *
 * Busca sobre la copia normalizada con `indexOf`, que lo resuelve el motor en
 * código nativo, y solo construye un objeto para las líneas que de verdad
 * coinciden. Nunca se materializa el catálogo entero.
 */
const buscarEnElMundo = (q: string): { opcion: PlaceOption; peso: number }[] => {
  if (!mundo || !mundoNormalizado) return [];
  const encontrados: { opcion: PlaceOption; peso: number }[] = [];
  let desde = 0;

  while (encontrados.length < MAXIMO_CANDIDATOS) {
    const golpe = mundoNormalizado.indexOf(q, desde);
    if (golpe < 0) break;

    // Los bordes de la línea donde ha caído la coincidencia.
    const inicio = mundoNormalizado.lastIndexOf('\n', golpe) + 1;
    let fin = mundoNormalizado.indexOf('\n', golpe);
    if (fin < 0) fin = mundo.length;
    desde = fin + 1;

    const campos = mundo.slice(inicio, fin).split('|');
    if (campos.length < 4) continue;
    const [cc, sufijo, nombre, nivel, alias] = campos;
    const pais = paisDe(cc);
    if (!pais) continue;

    // La coincidencia puede haber caído en el país o en el identificador; lo que
    // cuenta es que encaje con el nombre o con su alias en español.
    const n = normalize(nombre);
    const a = alias ? normalize(alias) : '';
    const enNombre = n.includes(q);
    const enAlias = a ? a.includes(q) : false;
    if (!enNombre && !enAlias) continue;

    const exacto = n === q || a === q;
    const empieza = n.startsWith(q) || (a ? a.startsWith(q) : false);
    const secundaria = nivel === 's';
    const peso = exacto ? 0 : empieza ? (secundaria ? 3 : 1) : 4;

    encontrados.push({
      // Se enseña el nombre en español cuando existe: "Múnich", no "Munich".
      opcion: { id: cc + '-' + sufijo, label: alias || nombre, flag: pais.flag, countryCode: cc, sublabel: pais.name },
      peso,
    });
  }
  return encontrados;
};

/** Una ciudad como resultado: su nombre delante y su país detrás, para no dudar. */
const ciudadComoOpcion = (ciudad: City): PlaceOption | undefined => {
  const pais = paisDe(ciudad.countryCode);
  if (!pais) return undefined; // Una ciudad sin país no se enseña: sería un lugar a medias.
  return { id: ciudad.id, label: ciudad.name, flag: pais.flag, countryCode: pais.code, sublabel: pais.name };
};

/**
 * Los lugares del catálogo que encajan con lo que se está escribiendo.
 *
 * La búsqueda es local y se acabó: el texto que escribe la persona no sale del
 * teléfono. Nada de proveedores de lugares, nada de autocompletado remoto, nada
 * de mandarle a nadie lo que alguien está tecleando.
 *
 * Ordena por dónde encaja —los que empiezan por lo escrito antes que los que solo
 * lo contienen—, porque quien escribe "per" está buscando Perú y no Chipre.
 */
export const buscarLugares = (texto: string, limite = 6): PlaceOption[] => {
  const q = normalize(texto);
  if (q.length < 2) return [];

  /*
   * Los resultados se ordenan por lo bien que encajan, no por el orden del
   * archivo. La escala, de más a menos:
   *
   *   0  el nombre exacto            "Casma" → Casma, y no otra cosa
   *   1  una ciudad principal que empieza por lo escrito
   *   2  un país que empieza por lo escrito
   *   3  una ciudad secundaria que empieza por lo escrito
   *   4  cualquier cosa que solo lo contenga
   *
   * Lo importante del 0: una ciudad pequeña NUNCA queda tapada por una grande si
   * alguien escribe su nombre entero. Buscar "Casma" da Casma, aunque Casma sea
   * secundaria y aunque haya diez ciudades principales que empiecen por "Cas".
   * Y dentro de "empieza por", las principales van antes, porque quien escribe
   * tres letras suele buscar la grande.
   */
  const resultados: { opcion: PlaceOption; peso: number }[] = [];

  for (const ciudad of CITIES) {
    const nombre = normalize(ciudad.name);
    if (!nombre.includes(q) && normalize(ciudad.id) !== q) continue;
    const opcion = ciudadComoOpcion(ciudad);
    if (!opcion) continue;
    const secundaria = ciudad.tier === 'secondary';
    const peso = nombre === q ? 0 : nombre.startsWith(q) ? (secundaria ? 3 : 1) : 4;
    resultados.push({ opcion, peso });
  }

  for (const pais of COUNTRIES) {
    const nombre = normalize(pais.name);
    const exacto = nombre === q || normalize(pais.code) === q;
    if (!exacto && !nombre.includes(q)) continue;
    resultados.push({ opcion: comoOpcion(pais), peso: exacto ? 0 : nombre.startsWith(q) ? 2 : 4 });
  }

  // Y el mundo entero, si ya está cargado. Va después de lo escrito a mano a
  // igualdad de peso: Lima la de siempre antes que cualquier Lima importada.
  resultados.push(...buscarEnElMundo(q));

  // Un orden estable: a igual peso, el del catálogo. Así la lista no baila entre
  // pulsaciones y quien ya vio un resultado lo vuelve a encontrar donde estaba.
  return resultados
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => a.peso - b.peso || a.i - b.i)
    .slice(0, limite)
    .map((r) => r.opcion);
};

/**
 * Un lugar del catálogo, con su identificador estable. Sirve igual para un país
 * —'PE'— que para una ciudad —'PE-LIM'—: lo único que cambia es que la ciudad se
 * lleva además su país, para poder decir "Lima, Perú" al enseñarla.
 */
export const lugarDelCatalogo = (opcion: PlaceOption): PostPlace => ({
  kind: 'catalog',
  id: opcion.id,
  label: opcion.label,
  ...(opcion.countryCode ? { countryCode: opcion.countryCode } : {}),
});

/**
 * Un lugar con las palabras de quien publica. Se guarda tal cual, recortado a lo
 * que cabe en una etiqueta; no se interpreta, no se corrige y no se busca.
 */
export const lugarPropio = (texto: string): PostPlace | undefined => {
  const limpio = texto.trim().slice(0, 60);
  return limpio ? { kind: 'custom', label: limpio } : undefined;
};

/**
 * La bandera del lugar. Una ciudad enseña la de su país; un país, la suya. Un
 * lugar escrito a mano no tiene bandera, porque Weë no sabe dónde está.
 */
export const banderaDe = (place?: PostPlace): string | undefined => {
  if (place?.kind !== 'catalog') return undefined;
  return paisDe(place.countryCode || place.id)?.flag;
};

/**
 * Lo que se lee en una publicación.
 *
 * El lugar estructurado manda; `placeLabel` es lo que traen las publicaciones
 * anteriores a esta fase, que no se van a migrar y siguen enseñándose igual. Una
 * publicación nueva escribe solo lo primero, así que las dos cosas no coexisten y
 * no hay ninguna contradicción que resolver.
 */
export const etiquetaDeLugar = (post: { place?: PostPlace; placeLabel?: string }): string | undefined => {
  const place = post.place;
  if (!place) return post.placeLabel || undefined;

  /*
   * Una ciudad se lee con su país detrás —"Lima, Perú"—, porque hay dos Valencias
   * y dos Córdobas y la que se ve tiene que ser la que se eligió. El nombre del
   * país no se guarda en la publicación: se resuelve aquí, desde el catálogo, que
   * es el único sitio donde vive.
   */
  const pais = place.countryCode ? paisDe(place.countryCode) : undefined;
  return pais ? `${place.label}, ${pais.name}` : place.label || undefined;
};
