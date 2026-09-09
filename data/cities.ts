/**
 * Las ciudades que Weë reconoce.
 *
 * No es un atlas ni pretende serlo. Es una lista corta y escogida a mano: las
 * capitales, las ciudades grandes y los sitios a los que la gente viaja, escribe
 * y publica. Cabe en un archivo, se lee de un vistazo y se corrige a mano cuando
 * haga falta. Weë no descarga bases de datos ni le pregunta a nadie dónde está
 * Lima.
 *
 * Cada ciudad tiene un identificador estable —`PE-LIM`— compuesto por el código
 * del país y tres letras. Es lo que hace que "Lima" signifique algo: dos
 * publicaciones que elijan PE-LIM hablan de la misma ciudad, y no de dos ciudades
 * que se escriben igual. Y sobrevive a todo lo demás: si mañana Weë habla inglés
 * y "Tokio" pasa a llamarse "Tokyo", el identificador `JP-TYO` no se mueve.
 *
 * Lo que NO hay aquí, y no por olvido:
 *
 *   · el nombre del país — ya está en `countries.ts`, y tenerlo dos veces sería
 *     tener dos sitios donde equivocarse;
 *   · la bandera — lo mismo;
 *   · latitud, longitud, huso horario, población, geohash, radio o distancia.
 *     Una ciudad aquí es una IDENTIDAD, no una posición. El día que Weë necesite
 *     saber dónde cae Lima en el mapa, será otra fase y otra conversación.
 *
 * Los homónimos son a propósito: Córdoba está en Argentina y en España, Valencia
 * en España y en Venezuela, Santiago en Chile y en la República Dominicana. El
 * identificador las separa y la interfaz enseña el país para que nadie dude.
 */

/**
 * Cómo de conocido es un lugar. No es una jerarquía geográfica: es lo que decide
 * qué se enseña antes cuando dos cosas encajan con lo que alguien está
 * escribiendo. Quien teclea "hua" en Perú probablemente busca Huancayo antes que
 * Huarmey, y quien teclea "Huarmey" busca Huarmey y punto.
 */
export type CityTier = 'major' | 'secondary';

/**
 * Qué clase de lugar es.
 *
 * Casi todos son ciudades. Pero Bali no es una ciudad —es una isla— y Santorini
 * tampoco, y sin embargo son de los sitios sobre los que más se publica. Estaban
 * en el catálogo llamándose ciudades, que es una mentira pequeña pero innecesaria:
 * ahora dicen lo que son. Un destino se elige, se enseña y se busca igual que una
 * ciudad; lo único que cambia es que Weë no lo llama ciudad.
 */
export type CityKind = 'city' | 'destination';

/** Un lugar del catálogo. Ningún campo es una coordenada. */
export interface City {
  /** `PAÍS-CIU`. Estable, legible y ajeno al idioma. */
  id: string;
  /** El código ISO del país, tal y como está en `countries.ts`. */
  countryCode: string;
  /** El nombre en español, que es el idioma de la interfaz. */
  name: string;
  /** Cuánto pesa al buscar. Sin decir nada, se entiende `major`. */
  tier?: CityTier;
  /** Qué es. Sin decir nada, se entiende `city`. */
  kind?: CityKind;
}

export const CITIES: City[] = [
  // ── América del Sur ──────────────────────────────────────────────────────
  { id: 'AR-BUE', countryCode: 'AR', name: 'Buenos Aires' },
  { id: 'AR-COR', countryCode: 'AR', name: 'Córdoba' },
  { id: 'AR-MDZ', countryCode: 'AR', name: 'Mendoza' },
  { id: 'AR-ROS', countryCode: 'AR', name: 'Rosario' },
  { id: 'AR-USH', countryCode: 'AR', name: 'Ushuaia' },
  { id: 'BO-LPB', countryCode: 'BO', name: 'La Paz' },
  { id: 'BO-SRZ', countryCode: 'BO', name: 'Santa Cruz de la Sierra' },
  { id: 'BR-SAO', countryCode: 'BR', name: 'São Paulo' },
  { id: 'BR-RIO', countryCode: 'BR', name: 'Río de Janeiro' },
  { id: 'BR-BSB', countryCode: 'BR', name: 'Brasilia' },
  { id: 'BR-SSA', countryCode: 'BR', name: 'Salvador de Bahía' },
  { id: 'BR-MAO', countryCode: 'BR', name: 'Manaos' },
  { id: 'CL-SCL', countryCode: 'CL', name: 'Santiago' },
  { id: 'CL-VAP', countryCode: 'CL', name: 'Valparaíso' },
  { id: 'CO-BOG', countryCode: 'CO', name: 'Bogotá' },
  { id: 'CO-MDE', countryCode: 'CO', name: 'Medellín' },
  { id: 'CO-CTG', countryCode: 'CO', name: 'Cartagena de Indias' },
  { id: 'CO-CLO', countryCode: 'CO', name: 'Cali' },
  { id: 'EC-UIO', countryCode: 'EC', name: 'Quito' },
  { id: 'EC-GYE', countryCode: 'EC', name: 'Guayaquil' },
  /*
   * Perú va completo a propósito: es el ejemplo trabajado de cómo debe quedar
   * cada país cuando llegue el catálogo mundial. Las capitales de región como
   * `major`, las ciudades y capitales de provincia como `secondary`. Todos los
   * nombres y su existencia están comprobados contra GeoNames (fase 2E-63C.3),
   * ninguno se ha escrito de memoria.
   */
  { id: 'PE-LIM', countryCode: 'PE', name: 'Lima' },
  { id: 'PE-CUZ', countryCode: 'PE', name: 'Cusco' },
  { id: 'PE-AQP', countryCode: 'PE', name: 'Arequipa' },
  { id: 'PE-TRU', countryCode: 'PE', name: 'Trujillo' },
  { id: 'PE-IQT', countryCode: 'PE', name: 'Iquitos' },
  { id: 'PE-CIX', countryCode: 'PE', name: 'Chiclayo' },
  { id: 'PE-PIU', countryCode: 'PE', name: 'Piura' },
  { id: 'PE-HYO', countryCode: 'PE', name: 'Huancayo' },
  { id: 'PE-PCL', countryCode: 'PE', name: 'Pucallpa' },
  { id: 'PE-TCQ', countryCode: 'PE', name: 'Tacna' },
  { id: 'PE-ICA', countryCode: 'PE', name: 'Ica' },
  { id: 'PE-CJA', countryCode: 'PE', name: 'Cajamarca' },
  { id: 'PE-AYP', countryCode: 'PE', name: 'Ayacucho' },
  { id: 'PE-PUN', countryCode: 'PE', name: 'Puno' },
  { id: 'PE-HUZ', countryCode: 'PE', name: 'Huaraz' },
  { id: 'PE-CHM', countryCode: 'PE', name: 'Chimbote', tier: 'secondary' },
  { id: 'PE-JUL', countryCode: 'PE', name: 'Juliaca', tier: 'secondary' },
  { id: 'PE-SUL', countryCode: 'PE', name: 'Sullana', tier: 'secondary' },
  { id: 'PE-TBP', countryCode: 'PE', name: 'Tumbes', tier: 'secondary' },
  { id: 'PE-TPP', countryCode: 'PE', name: 'Tarapoto', tier: 'secondary' },
  { id: 'PE-TYL', countryCode: 'PE', name: 'Talara', tier: 'secondary' },
  { id: 'PE-MQG', countryCode: 'PE', name: 'Moquegua', tier: 'secondary' },
  { id: 'PE-HRL', countryCode: 'PE', name: 'Huaral', tier: 'secondary' },
  { id: 'PE-HCO', countryCode: 'PE', name: 'Huacho', tier: 'secondary' },
  { id: 'PE-BAR', countryCode: 'PE', name: 'Barranca', tier: 'secondary' },
  { id: 'PE-CHY', countryCode: 'PE', name: 'Chancay', tier: 'secondary' },
  { id: 'PE-HRM', countryCode: 'PE', name: 'Huarmey', tier: 'secondary' },
  { id: 'PE-CAS', countryCode: 'PE', name: 'Casma', tier: 'secondary' },
  { id: 'PY-ASU', countryCode: 'PY', name: 'Asunción' },
  { id: 'UY-MVD', countryCode: 'UY', name: 'Montevideo' },
  { id: 'VE-CCS', countryCode: 'VE', name: 'Caracas' },
  { id: 'VE-VLN', countryCode: 'VE', name: 'Valencia' },

  // ── América del Norte y Central ──────────────────────────────────────────
  { id: 'CA-YTO', countryCode: 'CA', name: 'Toronto' },
  { id: 'CA-YVR', countryCode: 'CA', name: 'Vancouver' },
  { id: 'CA-YMQ', countryCode: 'CA', name: 'Montreal' },
  { id: 'CA-YOW', countryCode: 'CA', name: 'Ottawa' },
  { id: 'CR-SJO', countryCode: 'CR', name: 'San José' },
  { id: 'CU-HAV', countryCode: 'CU', name: 'La Habana' },
  { id: 'DO-SDQ', countryCode: 'DO', name: 'Santo Domingo' },
  { id: 'DO-STI', countryCode: 'DO', name: 'Santiago' },
  { id: 'GT-GUA', countryCode: 'GT', name: 'Ciudad de Guatemala' },
  { id: 'MX-MEX', countryCode: 'MX', name: 'Ciudad de México' },
  { id: 'MX-GDL', countryCode: 'MX', name: 'Guadalajara' },
  { id: 'MX-MTY', countryCode: 'MX', name: 'Monterrey' },
  { id: 'MX-CUN', countryCode: 'MX', name: 'Cancún' },
  { id: 'MX-OAX', countryCode: 'MX', name: 'Oaxaca' },
  { id: 'MX-PBC', countryCode: 'MX', name: 'Puebla' },
  { id: 'PA-PTY', countryCode: 'PA', name: 'Ciudad de Panamá' },
  { id: 'PR-SJU', countryCode: 'PR', name: 'San Juan' },
  { id: 'US-NYC', countryCode: 'US', name: 'Nueva York' },
  { id: 'US-LAX', countryCode: 'US', name: 'Los Ángeles' },
  { id: 'US-CHI', countryCode: 'US', name: 'Chicago' },
  { id: 'US-SFO', countryCode: 'US', name: 'San Francisco' },
  { id: 'US-MIA', countryCode: 'US', name: 'Miami' },
  { id: 'US-WAS', countryCode: 'US', name: 'Washington D. C.' },
  { id: 'US-BOS', countryCode: 'US', name: 'Boston' },
  { id: 'US-SEA', countryCode: 'US', name: 'Seattle' },
  { id: 'US-AUS', countryCode: 'US', name: 'Austin' },
  { id: 'US-LAS', countryCode: 'US', name: 'Las Vegas' },
  { id: 'US-DEN', countryCode: 'US', name: 'Denver' },
  { id: 'US-NOL', countryCode: 'US', name: 'Nueva Orleans' },
  { id: 'US-SAN', countryCode: 'US', name: 'San Diego' },
  { id: 'US-PHL', countryCode: 'US', name: 'Filadelfia' },
  { id: 'US-ATL', countryCode: 'US', name: 'Atlanta' },
  { id: 'US-HNL', countryCode: 'US', name: 'Honolulu' },

  // ── Europa ───────────────────────────────────────────────────────────────
  { id: 'AT-VIE', countryCode: 'AT', name: 'Viena' },
  { id: 'BE-BRU', countryCode: 'BE', name: 'Bruselas' },
  { id: 'CH-ZRH', countryCode: 'CH', name: 'Zúrich' },
  { id: 'CH-GVA', countryCode: 'CH', name: 'Ginebra' },
  { id: 'CZ-PRG', countryCode: 'CZ', name: 'Praga' },
  { id: 'DE-BER', countryCode: 'DE', name: 'Berlín' },
  { id: 'DE-MUC', countryCode: 'DE', name: 'Múnich' },
  { id: 'DE-HAM', countryCode: 'DE', name: 'Hamburgo' },
  { id: 'DE-FRA', countryCode: 'DE', name: 'Fráncfort' },
  { id: 'DK-CPH', countryCode: 'DK', name: 'Copenhague' },
  { id: 'ES-MAD', countryCode: 'ES', name: 'Madrid' },
  { id: 'ES-BCN', countryCode: 'ES', name: 'Barcelona' },
  { id: 'ES-VLC', countryCode: 'ES', name: 'Valencia' },
  { id: 'ES-SVQ', countryCode: 'ES', name: 'Sevilla' },
  { id: 'ES-BIO', countryCode: 'ES', name: 'Bilbao' },
  { id: 'ES-AGP', countryCode: 'ES', name: 'Málaga' },
  { id: 'ES-ODB', countryCode: 'ES', name: 'Córdoba' },
  { id: 'ES-GRX', countryCode: 'ES', name: 'Granada' },
  { id: 'ES-PMI', countryCode: 'ES', name: 'Palma de Mallorca' },
  { id: 'ES-LPA', countryCode: 'ES', name: 'Las Palmas de Gran Canaria' },
  { id: 'FI-HEL', countryCode: 'FI', name: 'Helsinki' },
  { id: 'FR-PAR', countryCode: 'FR', name: 'París' },
  { id: 'FR-LYS', countryCode: 'FR', name: 'Lyon' },
  { id: 'FR-MRS', countryCode: 'FR', name: 'Marsella' },
  { id: 'FR-NCE', countryCode: 'FR', name: 'Niza' },
  { id: 'FR-BOD', countryCode: 'FR', name: 'Burdeos' },
  { id: 'GB-LON', countryCode: 'GB', name: 'Londres' },
  { id: 'GB-MAN', countryCode: 'GB', name: 'Mánchester' },
  { id: 'GB-EDI', countryCode: 'GB', name: 'Edimburgo' },
  { id: 'GR-ATH', countryCode: 'GR', name: 'Atenas' },
  { id: 'GR-JTR', countryCode: 'GR', name: 'Santorini', kind: 'destination' },
  { id: 'HR-DBV', countryCode: 'HR', name: 'Dubrovnik' },
  { id: 'HU-BUD', countryCode: 'HU', name: 'Budapest' },
  { id: 'IE-DUB', countryCode: 'IE', name: 'Dublín' },
  { id: 'IS-REK', countryCode: 'IS', name: 'Reikiavik' },
  { id: 'IT-ROM', countryCode: 'IT', name: 'Roma' },
  { id: 'IT-MIL', countryCode: 'IT', name: 'Milán' },
  { id: 'IT-VCE', countryCode: 'IT', name: 'Venecia' },
  { id: 'IT-FLR', countryCode: 'IT', name: 'Florencia' },
  { id: 'IT-NAP', countryCode: 'IT', name: 'Nápoles' },
  { id: 'IT-TRN', countryCode: 'IT', name: 'Turín' },
  { id: 'NL-AMS', countryCode: 'NL', name: 'Ámsterdam' },
  { id: 'NL-RTM', countryCode: 'NL', name: 'Róterdam' },
  { id: 'NO-OSL', countryCode: 'NO', name: 'Oslo' },
  { id: 'PL-WAW', countryCode: 'PL', name: 'Varsovia' },
  { id: 'PL-KRK', countryCode: 'PL', name: 'Cracovia' },
  { id: 'PT-LIS', countryCode: 'PT', name: 'Lisboa' },
  { id: 'PT-OPO', countryCode: 'PT', name: 'Oporto' },
  { id: 'RO-BUH', countryCode: 'RO', name: 'Bucarest' },
  { id: 'RS-BEG', countryCode: 'RS', name: 'Belgrado' },
  { id: 'SE-STO', countryCode: 'SE', name: 'Estocolmo' },
  { id: 'TR-IST', countryCode: 'TR', name: 'Estambul' },
  { id: 'TR-ANK', countryCode: 'TR', name: 'Ankara' },
  { id: 'UA-IEV', countryCode: 'UA', name: 'Kiev' },

  // ── África y Oriente Medio ───────────────────────────────────────────────
  { id: 'AE-DXB', countryCode: 'AE', name: 'Dubái' },
  { id: 'AE-AUH', countryCode: 'AE', name: 'Abu Dabi' },
  { id: 'EG-CAI', countryCode: 'EG', name: 'El Cairo' },
  { id: 'ET-ADD', countryCode: 'ET', name: 'Adís Abeba' },
  { id: 'GH-ACC', countryCode: 'GH', name: 'Acra' },
  { id: 'IL-TLV', countryCode: 'IL', name: 'Tel Aviv' },
  { id: 'JO-AMM', countryCode: 'JO', name: 'Amán' },
  { id: 'KE-NBO', countryCode: 'KE', name: 'Nairobi' },
  { id: 'MA-CAS', countryCode: 'MA', name: 'Casablanca' },
  { id: 'MA-RAK', countryCode: 'MA', name: 'Marrakech' },
  { id: 'NG-LOS', countryCode: 'NG', name: 'Lagos' },
  { id: 'QA-DOH', countryCode: 'QA', name: 'Doha' },
  { id: 'SA-RUH', countryCode: 'SA', name: 'Riad' },
  { id: 'SN-DKR', countryCode: 'SN', name: 'Dakar' },
  { id: 'TN-TUN', countryCode: 'TN', name: 'Túnez' },
  { id: 'ZA-CPT', countryCode: 'ZA', name: 'Ciudad del Cabo' },
  { id: 'ZA-JNB', countryCode: 'ZA', name: 'Johannesburgo' },

  // ── Asia ─────────────────────────────────────────────────────────────────
  { id: 'CN-PEK', countryCode: 'CN', name: 'Pekín' },
  { id: 'CN-SHA', countryCode: 'CN', name: 'Shanghái' },
  { id: 'CN-CAN', countryCode: 'CN', name: 'Cantón' },
  { id: 'CN-SZX', countryCode: 'CN', name: 'Shenzhen' },
  { id: 'ID-JKT', countryCode: 'ID', name: 'Yakarta' },
  { id: 'ID-DPS', countryCode: 'ID', name: 'Bali', kind: 'destination' },
  { id: 'IN-DEL', countryCode: 'IN', name: 'Nueva Delhi' },
  { id: 'IN-BOM', countryCode: 'IN', name: 'Bombay' },
  { id: 'IN-BLR', countryCode: 'IN', name: 'Bangalore' },
  { id: 'IN-JAI', countryCode: 'IN', name: 'Jaipur' },
  { id: 'JP-TYO', countryCode: 'JP', name: 'Tokio' },
  { id: 'JP-KYO', countryCode: 'JP', name: 'Kioto' },
  { id: 'JP-OSA', countryCode: 'JP', name: 'Osaka' },
  { id: 'JP-SPK', countryCode: 'JP', name: 'Sapporo' },
  { id: 'KR-SEL', countryCode: 'KR', name: 'Seúl' },
  { id: 'KR-PUS', countryCode: 'KR', name: 'Busán' },
  { id: 'LK-CMB', countryCode: 'LK', name: 'Colombo' },
  { id: 'MY-KUL', countryCode: 'MY', name: 'Kuala Lumpur' },
  { id: 'NP-KTM', countryCode: 'NP', name: 'Katmandú' },
  { id: 'PH-MNL', countryCode: 'PH', name: 'Manila' },
  { id: 'SG-SIN', countryCode: 'SG', name: 'Singapur' },
  { id: 'TH-BKK', countryCode: 'TH', name: 'Bangkok' },
  { id: 'TH-HKT', countryCode: 'TH', name: 'Phuket' },
  { id: 'TH-CNX', countryCode: 'TH', name: 'Chiang Mai' },
  { id: 'TW-TPE', countryCode: 'TW', name: 'Taipéi' },
  { id: 'VN-HAN', countryCode: 'VN', name: 'Hanói' },
  { id: 'VN-SGN', countryCode: 'VN', name: 'Ciudad Ho Chi Minh' },

  // ── Oceanía ──────────────────────────────────────────────────────────────
  { id: 'AU-SYD', countryCode: 'AU', name: 'Sídney' },
  { id: 'AU-MEL', countryCode: 'AU', name: 'Melbourne' },
  { id: 'AU-BNE', countryCode: 'AU', name: 'Brisbane' },
  { id: 'AU-PER', countryCode: 'AU', name: 'Perth' },
  { id: 'NZ-AKL', countryCode: 'NZ', name: 'Auckland' },
  { id: 'NZ-WLG', countryCode: 'NZ', name: 'Wellington' },
];
