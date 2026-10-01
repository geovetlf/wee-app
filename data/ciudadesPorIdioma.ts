/**
 * Cómo se llaman las ciudades de Weë en otros idiomas.
 *
 * `cities.ts` guarda UN nombre por ciudad, el español, y no va a guardar más:
 * es el nombre canónico del catálogo, el que se lee de un vistazo y se corrige a
 * mano. Pero lo que hace que una ciudad sea esa ciudad no es el nombre, es el
 * identificador. `DK-CPH` es la misma ciudad para quien la llama Copenhague, para
 * quien la llama København y para quien la llama Copenhagen, y por eso esta tabla
 * cuelga del identificador y no del nombre.
 *
 * Aquí está cómo se llama cada ciudad en danés (`da`) y en inglés (`en`). El
 * inglés hace además de respaldo: un idioma que no tenga su propia entrada enseña
 * el nombre inglés. Los nombres son los que usaría hoy un periódico danés
 * (Politiken, DR) y un atlas en inglés; donde el danés usa la forma inglesa o la
 * del propio país, se escribe así, sin inventar un exónimo que nadie usa.
 *
 * Solo están las DIFERENCIAS. Lima se llama Lima en los tres idiomas, así que
 * Lima no está. Y dentro de cada ciudad, solo el idioma que cambia: Sevilla es
 * Sevilla en danés y Seville en inglés, así que su entrada solo dice `en`.
 *
 * Una ciudad que no está aquí, o un idioma que no está en su entrada, se enseña
 * tal y como está escrita en `cities.ts`. Esto no es un segundo catálogo: no
 * añade ciudades ni quita ninguna, no cambia identificadores y no guarda nada que
 * no sea un nombre. El orden es el de `cities.ts`, para que se puedan leer los
 * dos archivos uno al lado del otro.
 */
export const CIUDADES_POR_IDIOMA: Readonly<
  Record<string, Readonly<Partial<Record<'da' | 'en', string>>>>
> = {
  // ── América del Sur ──────────────────────────────────────────────────────
  'BR-RIO': { da: 'Rio de Janeiro', en: 'Rio de Janeiro' },
  'BR-BSB': { da: 'Brasília', en: 'Brasília' },
  'BR-SSA': { da: 'Salvador', en: 'Salvador' },
  'BR-MAO': { da: 'Manaus', en: 'Manaus' },
  'CO-CTG': { da: 'Cartagena', en: 'Cartagena' },

  // ── América del Norte y Central ──────────────────────────────────────────
  'CU-HAV': { da: 'Havana', en: 'Havana' },
  'GT-GUA': { da: 'Guatemala City', en: 'Guatemala City' },
  'MX-MEX': { da: 'Mexico City', en: 'Mexico City' },
  'PA-PTY': { da: 'Panama City', en: 'Panama City' },
  'US-NYC': { da: 'New York', en: 'New York' },
  'US-LAX': { da: 'Los Angeles', en: 'Los Angeles' },
  'US-WAS': { da: 'Washington D.C.', en: 'Washington, D.C.' },
  'US-NOL': { da: 'New Orleans', en: 'New Orleans' },
  'US-PHL': { da: 'Philadelphia', en: 'Philadelphia' },

  // ── Europa ───────────────────────────────────────────────────────────────
  'AT-VIE': { da: 'Wien', en: 'Vienna' },
  'BE-BRU': { da: 'Bruxelles', en: 'Brussels' },
  'CH-ZRH': { da: 'Zürich', en: 'Zurich' },
  'CH-GVA': { da: 'Genève', en: 'Geneva' },
  'CZ-PRG': { da: 'Prag', en: 'Prague' },
  'DE-BER': { da: 'Berlin', en: 'Berlin' },
  'DE-MUC': { da: 'München', en: 'Munich' },
  'DE-HAM': { da: 'Hamborg', en: 'Hamburg' },
  'DE-FRA': { da: 'Frankfurt', en: 'Frankfurt' },
  'DK-CPH': { da: 'København', en: 'Copenhagen' },
  'ES-SVQ': { en: 'Seville' },
  'FR-PAR': { da: 'Paris', en: 'Paris' },
  'FR-MRS': { da: 'Marseille', en: 'Marseille' },
  'FR-NCE': { da: 'Nice', en: 'Nice' },
  'FR-BOD': { da: 'Bordeaux', en: 'Bordeaux' },
  'GB-LON': { da: 'London', en: 'London' },
  'GB-MAN': { da: 'Manchester', en: 'Manchester' },
  'GB-EDI': { da: 'Edinburgh', en: 'Edinburgh' },
  'GR-ATH': { da: 'Athen', en: 'Athens' },
  'IE-DUB': { da: 'Dublin', en: 'Dublin' },
  'IS-REK': { da: 'Reykjavík', en: 'Reykjavík' },
  'IT-ROM': { da: 'Rom', en: 'Rome' },
  'IT-MIL': { da: 'Milano', en: 'Milan' },
  'IT-VCE': { da: 'Venedig', en: 'Venice' },
  'IT-FLR': { da: 'Firenze', en: 'Florence' },
  'IT-NAP': { da: 'Napoli', en: 'Naples' },
  'IT-TRN': { da: 'Torino', en: 'Turin' },
  'NL-AMS': { da: 'Amsterdam', en: 'Amsterdam' },
  'NL-RTM': { da: 'Rotterdam', en: 'Rotterdam' },
  'PL-WAW': { da: 'Warszawa', en: 'Warsaw' },
  'PL-KRK': { da: 'Kraków', en: 'Kraków' },
  'PT-LIS': { da: 'Lissabon', en: 'Lisbon' },
  'PT-OPO': { da: 'Porto', en: 'Porto' },
  'RO-BUH': { da: 'Bukarest', en: 'Bucharest' },
  'RS-BEG': { da: 'Beograd', en: 'Belgrade' },
  'SE-STO': { da: 'Stockholm', en: 'Stockholm' },
  'TR-IST': { da: 'Istanbul', en: 'Istanbul' },
  'UA-IEV': { da: 'Kyiv', en: 'Kyiv' },

  // ── África y Oriente Medio ───────────────────────────────────────────────
  'AE-DXB': { da: 'Dubai', en: 'Dubai' },
  'AE-AUH': { da: 'Abu Dhabi', en: 'Abu Dhabi' },
  'EG-CAI': { da: 'Kairo', en: 'Cairo' },
  'ET-ADD': { da: 'Addis Abeba', en: 'Addis Ababa' },
  'GH-ACC': { da: 'Accra', en: 'Accra' },
  'JO-AMM': { da: 'Amman', en: 'Amman' },
  'SA-RUH': { da: 'Riyadh', en: 'Riyadh' },
  'TN-TUN': { da: 'Tunis', en: 'Tunis' },
  'ZA-CPT': { da: 'Kapstaden', en: 'Cape Town' },
  'ZA-JNB': { da: 'Johannesburg', en: 'Johannesburg' },

  // ── Asia ─────────────────────────────────────────────────────────────────
  'CN-PEK': { da: 'Beijing', en: 'Beijing' },
  'CN-SHA': { da: 'Shanghai', en: 'Shanghai' },
  'CN-CAN': { da: 'Guangzhou', en: 'Guangzhou' },
  'ID-JKT': { da: 'Jakarta', en: 'Jakarta' },
  'IN-DEL': { da: 'New Delhi', en: 'New Delhi' },
  'IN-BOM': { da: 'Mumbai', en: 'Mumbai' },
  'JP-TYO': { da: 'Tokyo', en: 'Tokyo' },
  'JP-KYO': { da: 'Kyoto', en: 'Kyoto' },
  'KR-SEL': { da: 'Seoul', en: 'Seoul' },
  'KR-PUS': { da: 'Busan', en: 'Busan' },
  'NP-KTM': { da: 'Kathmandu', en: 'Kathmandu' },
  'SG-SIN': { da: 'Singapore', en: 'Singapore' },
  'TW-TPE': { da: 'Taipei', en: 'Taipei' },
  'VN-HAN': { da: 'Hanoi', en: 'Hanoi' },
  'VN-SGN': { da: 'Ho Chi Minh-byen', en: 'Ho Chi Minh City' },

  // ── Oceanía ──────────────────────────────────────────────────────────────
  'AU-SYD': { da: 'Sydney', en: 'Sydney' },
};
