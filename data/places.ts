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

/**
 * Un resultado a medio hacer: su opción, lo bien que encaja con lo escrito y,
 * cuando se sabe, dónde está. Las coordenadas no se enseñan: sirven para que a
 * igualdad de encaje gane el que tienes al lado.
 */
interface Candidato {
  opcion: PlaceOption;
  peso: number;
  lat?: number;
  lon?: number;
  /**
   * Cuánto pesa un lugar por sí mismo, cuando ni el texto ni la cercanía
   * deciden. Sale de la POBLACIÓN que publica GeoNames —una sección de ciudad
   * hereda la de su metrópoli—, y menor es mejor: 0 un país, 3 millones de
   * habitantes, 5 decenas de miles. Estar en la lista escrita a mano no da
   * prioridad por sí solo: Barranca no puede ganarle a Barranco por el mero
   * hecho de que alguien la apuntó.
   */
  importancia: number;
}

/**
 * Del dígito de relevancia del catálogo a la importancia con la que se ordena.
 * Sin dígito —los escritos a mano sin gemelo en GeoNames— se asume un lugar
 * notable de tamaño desconocido, ni el primero ni el último.
 */
const importanciaDe = (rel?: number): number =>
  typeof rel === 'number' && rel === rel ? 9 - Math.min(9, Math.max(0, rel)) : 4;

/**
 * Desde dónde se busca, si se sabe. Sirve para ORDENAR, nunca para filtrar: un
 * resultado de la otra punta del mundo no se esconde, se pone después.
 */
export interface ContextoDeBusqueda {
  lat?: number;
  lon?: number;
  /** El país de quien busca, que Weë sabe desde el registro. */
  pais?: string | null;
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
/** Las coordenadas de los lugares escritos a mano. Llegan con el mundo. */
let mundoCoords: string | null = null;
/** De 'PE.15' a 'Lima'. Lo que distingue las cinco Miraflores del Perú. */
let regiones: Map<string, string> | null = null;
let cargando: Promise<void> | null = null;

/**
 * Cómo se lee el sitio de un lugar: "Lima, Perú" cuando se sabe la región, y
 * solo "Perú" cuando no. Sin región, cinco Miraflores se leen igual y elegir es
 * adivinar.
 */
const sitioDe = (pais: Country, cc?: string, adm1?: string): string => {
  const region = cc && adm1 && regiones ? regiones.get(`${cc}.${adm1}`) : undefined;
  return region ? `${region}, ${pais.name}` : pais.name;
};

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
      const modulo = require('./citiesWorld') as { WORLD_PLACES: string; HAND_COORDS: string; REGIONS: string };
      mundo = modulo.WORLD_PLACES;
      mundoCoords = modulo.HAND_COORDS || '';
      regiones = new Map(
        (modulo.REGIONS || '')
          .split('\n')
          .filter(Boolean)
          .map((linea) => {
            const corte = linea.indexOf('|');
            return [linea.slice(0, corte), linea.slice(corte + 1)] as [string, string];
          })
      );
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
const buscarEnElMundo = (q: string): Candidato[] => {
  if (!mundo || !mundoNormalizado) return [];
  const encontrados: Candidato[] = [];
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
    const [cc, sufijo, nombre, , alias, lat, lon, adm1, rel] = campos;
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
    const peso = exacto ? 0 : empieza ? 1 : 2;

    encontrados.push({
      // Se enseña el nombre en español cuando existe: "Múnich", no "Munich".
      opcion: { id: cc + '-' + sufijo, label: alias || nombre, flag: pais.flag, countryCode: cc, sublabel: sitioDe(pais, cc, adm1) },
      peso,
      lat: Number(lat),
      lon: Number(lon),
      importancia: importanciaDe(Number(rel)),
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
export const buscarLugares = (texto: string, limite = 6, contexto?: ContextoDeBusqueda): PlaceOption[] => {
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
  const resultados: Candidato[] = [];

  /*
   * El peso es SOLO el texto: exacto, empieza por, contiene. Nada más entra en
   * esta capa. Antes las ciudades "principales" se colaban aquí por delante de
   * las "secundarias", y eso decidía antes de tiempo lo que le corresponde
   * decidir a la cercanía y a la importancia.
   */
  for (const ciudad of CITIES) {
    const nombre = normalize(ciudad.name);
    if (!nombre.includes(q) && normalize(ciudad.id) !== q) continue;
    const opcion = ciudadComoOpcion(ciudad);
    if (!opcion) continue;
    const peso = nombre === q ? 0 : nombre.startsWith(q) ? 1 : 2;
    const propias = coordenadasAMano().get(ciudad.id);
    resultados.push({ opcion, peso, lat: propias?.[0], lon: propias?.[1], importancia: importanciaDe(propias?.[2]) });
  }

  /*
   * Un país pesa como una ciudad grande —ni más ni menos—. No tenemos su
   * población y no se inventa: es la regla de siempre expresada en esta capa.
   * Escribiendo "par", París va antes que Paraguay y Paraguay antes que un
   * pueblo; escribiendo "peru" entero, Perú es exacto y va el primero.
   */
  const IMPORTANCIA_DE_UN_PAIS = 4;
  for (const pais of COUNTRIES) {
    const nombre = normalize(pais.name);
    const exacto = nombre === q || normalize(pais.code) === q;
    if (!exacto && !nombre.includes(q)) continue;
    resultados.push({
      opcion: comoOpcion(pais),
      peso: exacto ? 0 : nombre.startsWith(q) ? 1 : 2,
      importancia: IMPORTANCIA_DE_UN_PAIS,
    });
  }

  // Y el mundo entero, si ya está cargado. Va después de lo escrito a mano a
  // igualdad de peso: Lima la de siempre antes que cualquier Lima importada.
  resultados.push(...buscarEnElMundo(q));

  /*
   * EL ORDEN, por capas:
   *
   *   1. lo bien que encaja con lo escrito (exacto, empieza por, contiene);
   *   2. a igualdad, lo que tienes en tu zona —si Weë sabe dónde estás—;
   *   3. a igualdad, tu país;
   *   4. a igualdad, la importancia del lugar, que sale de su población;
   *   5. a igualdad, el orden del catálogo, que es estable.
   *
   * Las capas 2 a 4 solo DESEMPATAN: nunca adelantan a un encaje mejor ni
   * esconden un resultado de otro país. Escribiendo "Barranc" hay dos sitios en
   * el Perú que empiezan igual —Barranco, un distrito de Lima, y Barranca, un
   * pueblo a 180 km—: con ubicación gana el que tienes al lado; sin ella, los
   * dos son de tu país y decide la importancia, que también es Barranco.
   */
  const hayPunto = typeof contexto?.lat === 'number' && typeof contexto?.lon === 'number';
  const distancia = (c: Candidato): number => {
    if (!hayPunto || typeof c.lat !== 'number' || typeof c.lon !== 'number') return Infinity;
    if (c.lat !== c.lat || c.lon !== c.lon) return Infinity; // NaN
    return kmEntre(contexto!.lat!, contexto!.lon!, c.lat, c.lon);
  };
  /* Un país como resultado no lleva `countryCode`: su identificador ES el código.
     Sin esto, "Perú" nunca contaba como tu país para alguien del Perú. */
  const paisDeLaOpcion = (c: Candidato): string | undefined => c.opcion.countryCode || c.opcion.id;
  const deTuPais = (c: Candidato): number => (contexto?.pais && paisDeLaOpcion(c) === contexto.pais ? 0 : 1);

  /*
   * La cercanía desempata SOLO cuando algo está de verdad en tu zona.
   *
   * Con la distancia cruda pasaba esto: alguien en Lima escribe "Madrid" y le
   * sale primero un Madrid de Colombia, porque está a 1.900 km y el de España a
   * 10.000. Los dos están lejísimos; entre dos sitios lejanos la distancia no
   * dice cuál buscabas, y lo que sí lo dice es cuál es más importante.
   *
   * Por debajo de este radio la cercanía manda —"Barranc" desde Lima da Barranco,
   * a 500 m, y no Barranca, a 180 km—. Por encima, deja paso a la importancia.
   */
  const RADIO_TU_ZONA_KM = 100;
  const enTuZona = (km: number): number => (km <= RADIO_TU_ZONA_KM ? 0 : 1);

  return resultados
    .map((r, i) => ({ ...r, i, km: distancia(r) }))
    .sort(
      (a, b) =>
        a.peso - b.peso ||
        enTuZona(a.km) - enTuZona(b.km) ||
        (enTuZona(a.km) === 0 ? a.km - b.km : 0) ||
        deTuPais(a) - deTuPais(b) ||
        a.importancia - b.importancia ||
        a.i - b.i
    )
    .slice(0, limite)
    .map((r) => r.opcion);
};

// ─── Cerca de ti ────────────────────────────────────────────────────────────

/**
 * LA CERCANÍA SE CALCULA AQUÍ, Y AQUÍ SE QUEDA.
 *
 * Conviene decir por qué esto no contradice a `utils/locationPrivacy.ts`, que
 * guarda con celo las distancias y solo deja salir bandas.
 *
 * Aquel archivo protege la distancia entre DOS PERSONAS: con tres de esas
 * distancias se triangula una casa, y por eso de allí solo sale "a 1–5 km".
 * Esto es otra cosa: la distancia de quien mira a un SITIO PÚBLICO cuya posición
 * está en cualquier atlas. Se calcula en el teléfono, se enseña en el teléfono y
 * no se guarda, no se manda y no entra en ninguna publicación. Nadie al otro
 * lado ve un número.
 *
 * Por eso el cálculo vive aquí —esto va de lugares— y `locationPrivacy` se queda
 * exactamente como estaba.
 */

const RADIO_TIERRA_KM = 6371;
const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

/** Distancia en kilómetros sobre la esfera. Pura: no toca red, disco ni estado. */
const kmEntre = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const dLat = aRadianes(bLat - aLat);
  const dLon = aRadianes(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(aLat)) * Math.cos(aRadianes(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Hasta dónde se considera "cerca". Más allá, el sitio ya no es tu barrio. */
const RADIO_CERCANIA_KM = 60;

export interface LugarCercano {
  opcion: PlaceOption;
  /** Kilómetros de verdad, calculados. Para ordenar; no se enseña crudo. */
  km: number;
}

/**
 * Cómo se dice una distancia sin fingir una precisión que no se tiene.
 *
 * El catálogo guarda tres decimales —unos 110 m— y la ubicación de quien mira es
 * aproximada por definición. Con eso se puede decir "a 4 km" con la cabeza alta;
 * decir "a 4,17 km" sería inventarse dos cifras.
 */
export const distanciaAproximada = (km: number): string => {
  if (km < 1) return 'A menos de 1 km';
  if (km < 10) return `≈ ${Math.round(km)} km`;
  if (km <= RADIO_CERCANIA_KM) return `≈ ${Math.round(km / 5) * 5} km`;
  return `A más de ${RADIO_CERCANIA_KM} km`;
};

/**
 * Las coordenadas —y la relevancia— de los escritos a mano, leídas una sola vez.
 * Cada entrada es [latitud, longitud, relevancia]; la relevancia falta en los
 * que no tienen gemelo en GeoNames.
 */
let coordsAMano: Map<string, [number, number, number?]> | null = null;
const coordenadasAMano = (): Map<string, [number, number, number?]> => {
  if (!coordsAMano) coordsAMano = leerCoordsAMano(mundoCoords || '');
  return coordsAMano;
};
const leerCoordsAMano = (crudo: string): Map<string, [number, number, number?]> => {
  const mapa = new Map<string, [number, number, number?]>();
  for (const linea of crudo.split('\n')) {
    if (!linea) continue;
    const [id, lat, lon, rel] = linea.split('|');
    const la = Number(lat);
    const lo = Number(lon);
    const re = rel === undefined || rel === '' ? undefined : Number(rel);
    if (id && Number.isFinite(la) && Number.isFinite(lo)) mapa.set(id, [la, lo, re]);
  }
  return mapa;
};

/**
 * Los lugares más cercanos a un punto, ordenados por distancia.
 *
 * Recorre el catálogo UNA vez y solo mira la cola de cada línea, que es donde
 * están las coordenadas: la última barra separa la región, y las dos anteriores
 * la longitud y la latitud. Antes de la trigonometría hay un descarte por caja:
 * si un sitio está a más de medio grado de latitud, no hace falta la raíz
 * cuadrada para saber que no es tu barrio. Con eso, de ochenta mil líneas se
 * calculan de verdad unas pocas docenas.
 *
 * El punto que entra es de quien mira, y no sale de aquí: se usa para comparar y
 * se olvida. Lo que vuelve son lugares y kilómetros, nunca la posición.
 */
export const lugaresCercanos = (lat: number, lon: number, limite = 8): LugarCercano[] => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  const cerca: { cc: string; sufijo: string; nombre: string; alias: string; adm1: string; km: number }[] = [];

  /* La caja: medio grado de latitud son unos 55 km; la longitud se estrecha
     según te acercas a los polos, y el coseno lo tiene en cuenta. */
  const margenLat = RADIO_CERCANIA_KM / 111;
  const cosLat = Math.max(0.01, Math.cos(aRadianes(lat)));
  const margenLon = RADIO_CERCANIA_KM / (111 * cosLat);

  if (mundo) {
    let inicio = 0;
    while (inicio < mundo.length) {
      let fin = mundo.indexOf('\n', inicio);
      if (fin < 0) fin = mundo.length;

      /* Solo la cola: partir la línea entera ochenta mil veces costaría mucho
         más que buscar cuatro barras desde el final. De atrás hacia delante:
         relevancia, región, longitud, latitud. */
      const corteRel = mundo.lastIndexOf('|', fin - 1);
      const corteAdm1 = corteRel > inicio ? mundo.lastIndexOf('|', corteRel - 1) : -1;
      const corteLon = corteAdm1 > inicio ? mundo.lastIndexOf('|', corteAdm1 - 1) : -1;
      const corteLat = corteLon > inicio ? mundo.lastIndexOf('|', corteLon - 1) : -1;
      if (corteLat > inicio) {
        const laLat = +mundo.slice(corteLat + 1, corteLon);
        const laLon = +mundo.slice(corteLon + 1, corteAdm1);
        if (
          laLat === laLat && // descarta NaN sin llamar a isNaN
          laLon === laLon &&
          Math.abs(laLat - lat) <= margenLat &&
          Math.abs(laLon - lon) <= margenLon
        ) {
          const km = kmEntre(lat, lon, laLat, laLon);
          if (km <= RADIO_CERCANIA_KM) {
            const campos = mundo.slice(inicio, corteLat).split('|');
            cerca.push({
              cc: campos[0],
              sufijo: campos[1],
              nombre: campos[2],
              alias: campos[4] || '',
              adm1: mundo.slice(corteAdm1 + 1, corteRel),
              km,
            });
          }
        }
      }
      inicio = fin + 1;
    }
  }

  /* Y los escritos a mano, que no están en la cadena de arriba. Son 123, así que
     se recorren enteros sin más ceremonia. */
  if (mundoCoords) {
    for (const [id, [laLat, laLon]] of coordenadasAMano()) {
      if (Math.abs(laLat - lat) > margenLat || Math.abs(laLon - lon) > margenLon) continue;
      const km = kmEntre(lat, lon, laLat, laLon);
      if (km > RADIO_CERCANIA_KM) continue;
      const ciudad = CITIES.find((c) => c.id === id);
      if (!ciudad) continue;
      cerca.push({ cc: ciudad.countryCode, sufijo: '', nombre: ciudad.name, alias: '', adm1: '', km });
    }
  }

  const resultado: LugarCercano[] = [];
  for (const c of cerca.sort((a, b) => a.km - b.km)) {
    if (resultado.length >= limite) break;
    const pais = paisDe(c.cc);
    if (!pais) continue; // Un lugar sin país no se enseña: sería un lugar a medias.
    const id = c.sufijo
      ? `${c.cc}-${c.sufijo}`
      : CITIES.find((x) => x.name === c.nombre && x.countryCode === c.cc)?.id;
    if (!id) continue;
    resultado.push({
      opcion: { id, label: c.alias || c.nombre, flag: pais.flag, countryCode: c.cc, sublabel: sitioDe(pais, c.cc, c.adm1) },
      km: c.km,
    });
  }
  return resultado;
};

/**
 * Los lugares de un país, para ofrecer algo antes de que nadie escriba.
 *
 * ─── Por qué NO es "lo que tienes cerca" de verdad ──────────────────────────
 *
 * Aquí no hay coordenadas —ni las va a haber: un lugar es una identidad, no una
 * posición—, así que no existe forma de medir qué ciudad te pilla más cerca. Lo
 * que sí se sabe de verdad es en qué país estás, porque lo dijiste tú al
 * registrarte, y con eso se puede ofrecer algo REAL en vez de algo inventado.
 *
 * Por eso esta función no promete proximidad: devuelve los lugares de un país,
 * las principales primero, y quien la use decide cómo lo cuenta. Poner un "a 1,2
 * km" al lado sería un número que nadie ha medido.
 */
export const lugaresDelPais = (countryCode?: string | null, limite = 8): PlaceOption[] => {
  if (!countryCode) return [];
  const ciudades = CITIES.filter((c) => c.countryCode === countryCode);
  return ciudades
    .map((ciudad, i) => ({ ciudad, i }))
    /* Las principales delante; a igualdad, el orden del catálogo, que es estable. */
    .sort((a, b) => Number(a.ciudad.tier === 'secondary') - Number(b.ciudad.tier === 'secondary') || a.i - b.i)
    .map((c) => ciudadComoOpcion(c.ciudad))
    .filter((o): o is PlaceOption => !!o)
    .slice(0, limite);
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
