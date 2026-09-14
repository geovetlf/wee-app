/*
 * EL CATÁLOGO DE IDIOMAS DE WEË.
 *
 * Este archivo no importa nada y no decide nada: solo dice qué idiomas existen,
 * cómo se llaman en su propia lengua y en qué dirección se leen. Todo lo demás
 * —resolver, traducir, formatear, guardar— vive en módulos aparte que leen esto.
 *
 * TRES COSAS QUE NO SON LA MISMA Y QUE AQUÍ SE SEPARAN A PROPÓSITO:
 *
 *   IDIOMA   'es'      la lengua de la interfaz. Es lo que la persona elige.
 *   LOCALE   'es-PE'   idioma + región, y de ahí salen los FORMATOS: cómo se
 *                      escribe una fecha, un número o una moneda.
 *   UBICACIÓN          dónde está el teléfono. Vive en services/locationService
 *                      y NO PINTA NADA AQUÍ.
 *
 * La tercera es la importante. Alguien con la interfaz en inglés que viaja a
 * Japón sigue teniendo la interfaz en inglés: el GPS no elige el idioma de
 * nadie. Por eso este módulo no conoce `locationService` ni al revés.
 */

/** Los idiomas que Weë contempla. Añadir uno es añadirlo a esta lista. */
export type CodigoDeIdioma =
  | 'es' | 'en' | 'it' | 'fr' | 'de' | 'pt' | 'ja' | 'zh' | 'ko' | 'ru' | 'ar';

export interface Idioma {
  codigo: CodigoDeIdioma;
  /**
   * El nombre EN SU PROPIA LENGUA.
   *
   * "Deutsch", no "Alemán". Quien busca su idioma en una lista lo busca escrito
   * como lo escribiría él, y si no entiende la lengua en la que está la app
   * ahora mismo, un "Alemán" en español no le sirve de nada.
   */
  nombreNativo: string;
  /** 'rtl' solo para las lenguas que se leen de derecha a izquierda. */
  direccion: 'ltr' | 'rtl';
  /**
   * Si hay diccionario de verdad para este idioma.
   *
   * Los que están a `false` figuran en el catálogo pero NO se ofrecen todavía:
   * la arquitectura los admite y el día que llegue su diccionario basta con
   * cambiar este booleano. No se inventan traducciones para rellenar.
   */
  listo: boolean;
}

/*
 * El orden es el de la lista que se le enseña a la persona. Inglés y español
 * primero por ser los que hay; el resto, alfabético por su nombre nativo.
 */
export const IDIOMAS: readonly Idioma[] = [
  { codigo: 'en', nombreNativo: 'English', direccion: 'ltr', listo: true },
  { codigo: 'es', nombreNativo: 'Español', direccion: 'ltr', listo: true },
  { codigo: 'de', nombreNativo: 'Deutsch', direccion: 'ltr', listo: false },
  { codigo: 'fr', nombreNativo: 'Français', direccion: 'ltr', listo: false },
  { codigo: 'it', nombreNativo: 'Italiano', direccion: 'ltr', listo: false },
  { codigo: 'pt', nombreNativo: 'Português', direccion: 'ltr', listo: false },
  { codigo: 'ru', nombreNativo: 'Русский', direccion: 'ltr', listo: false },
  { codigo: 'ar', nombreNativo: 'العربية', direccion: 'rtl', listo: false },
  { codigo: 'ko', nombreNativo: '한국어', direccion: 'ltr', listo: false },
  { codigo: 'zh', nombreNativo: '中文', direccion: 'ltr', listo: false },
  { codigo: 'ja', nombreNativo: '日本語', direccion: 'ltr', listo: false },
];

/**
 * Cuando no hay nada mejor, inglés.
 *
 * No es una preferencia de producto: es el último escalón de la cadena de
 * respaldo, el que garantiza que la interfaz nunca se quede en blanco.
 */
export const IDIOMA_DE_RESERVA: CodigoDeIdioma = 'en';

/**
 * LOS LOCALES CONTEMPLADOS, que no es lo mismo que los idiomas.
 *
 * Un idioma tiene un diccionario; un locale tiene FORMATOS. `es-PE` y `es-ES`
 * comparten hasta la última palabra del diccionario y aun así escriben distinto
 * una fecha y una cantidad de dinero. Por eso son dos listas y no una.
 *
 * Esta lista no limita nada: `Intl` sabe formatear cualquier locale del mundo y
 * `formato.ts` le pasa el que haya. Está aquí para poder ofrecer una elección
 * de región el día que se ofrezca, y para que las pruebas comprueben que los
 * que nos importan se resuelven bien.
 */
export const LOCALES_CONTEMPLADOS: readonly string[] = [
  'es-PE', 'es-ES', 'es-MX',
  'en-US', 'en-GB',
  'it-IT',
  'fr-FR', 'fr-CA',
  'de-DE',
  'pt-BR', 'pt-PT',
  'ja-JP',
  'zh-CN', 'zh-TW',
  'ko-KR',
  'ru-RU',
  'ar-SA',
];

/** Los que se pueden elegir hoy. La pantalla de Idioma pinta exactamente esto. */
export const idiomasDisponibles = (): Idioma[] => IDIOMAS.filter((i) => i.listo);

/** Busca un idioma del catálogo. `undefined` si no está contemplado. */
export const idiomaDelCatalogo = (codigo: string): Idioma | undefined =>
  IDIOMAS.find((i) => i.codigo === codigo);

/** Cómo se lee un idioma. Lo que necesita la capa de RTL. */
export const direccionDe = (codigo: string): 'ltr' | 'rtl' =>
  idiomaDelCatalogo(codigo)?.direccion ?? 'ltr';
