/**
 * POR QUÉ NO ESTÁ DISPONIBLE, en el idioma de quien mira.
 *
 * El servidor manda un MOTIVO cerrado en los detalles de un NOT_AVAILABLE (`functions/src/engine/errors.ts`,
 * `MOTIVOS_DE_NO_DISPONIBLE`) y nunca el proveedor, el modelo ni la jurisdicción. «Inténtalo más tarde» solo se dice
 * cuando el motivo es pasajero; lo demás —en tu región, falta tu país, con estas opciones— se explica tal cual, y un
 * motivo que esta app no conozca se dice como «no disponible», sin más.
 *
 * Puro y sin imports: lo usan el servicio de Weë AI (`humanizeCreatorError`) y el compositor de «Crear mundo 3D», que
 * no puede cargar Firebase. Como todo lo de fuera de React, devuelve CLAVES (CLAUDE.md §8).
 */
export const CLAVE_DE_NO_DISPONIBLE: Readonly<Record<string, string>> = Object.freeze({
  ahora_no: 'weeai.errNotAvailableNow',
  en_tu_region: 'weeai.errNotAvailableRegion',
  falta_tu_pais: 'weeai.errNotAvailableCountry',
  con_estas_opciones: 'weeai.errNotAvailableOptions',
  no_disponible: 'weeai.errNotAvailable',
});

/** El motivo de un NOT_AVAILABLE, si el servidor dijo uno de los que existen: donde lo deja el SDK web y el nativo. */
export const motivoDeNoDisponible = (error: unknown): string | null => {
  const e = (error ?? {}) as { details?: { reason?: unknown }; customData?: { details?: { reason?: unknown } } };
  const motivo = String((e.details || e.customData?.details || {}).reason || '');
  return Object.prototype.hasOwnProperty.call(CLAVE_DE_NO_DISPONIBLE, motivo) ? motivo : null;
};

export const claveDeNoDisponible = (error: unknown): string => CLAVE_DE_NO_DISPONIBLE[motivoDeNoDisponible(error) ?? 'no_disponible'];
