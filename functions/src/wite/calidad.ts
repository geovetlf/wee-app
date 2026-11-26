/**
 * WITE · ADAPTIVE QUALITY CONTROLLER (decisión del dueño, 2026-11-26: calidad social adaptativa 360p / 480p).
 *
 * Decide UNA resolución antes del render —nunca dos renders automáticos para el mismo trabajo—. El producto quiere
 * empezar por 360p y subir a 480p solo si 360p no puede quedar convincente en un teléfono. Pero manda lo que el
 * proveedor ofrece de verdad: Seedance no tiene 360p (su mínimo es 480p, `SEEDANCE_SPECS`), así que con Seedance la
 * respuesta honesta es siempre 480p, con el motivo «minimo_del_proveedor». El día que un proveedor ofrezca 360p, la
 * misma regla lo usará sin tocar la app.
 *
 * Puro: sin red ni Firebase. Recibe lo que se midió del vídeo (FFmpeg) y lo que el modelo admite.
 */
export type ResolucionSocial = '360p' | '480p';
export const RESOLUCIONES_DEL_PRODUCTO: readonly ResolucionSocial[] = ['360p', '480p'];

export interface RasgosDelVideo {
  ancho?: number;
  alto?: number;
  fps?: number;
  duracionSec?: number;
  /** Cambios bruscos de imagen por segundo (filtro `scene` de FFmpeg): movimiento y complejidad. */
  cambiosPorSegundo?: number;
  /** Fracción del cuadro que ocupa el protagonista (0–1), cuando haya detección. Hoy no la hay: undefined. */
  areaDelProtagonista?: number;
  /** Personas en escena, cuando haya detección. */
  personas?: number;
}

export interface DecisionDeCalidad {
  resolucion: string;
  /** La que habría elegido el producto si el proveedor no limitara. */
  preferidaPorElProducto: ResolucionSocial;
  motivos: string[];
  /** La resolución siguiente que se podría pedir después (con su coste aparte), o null si no hay ninguna. */
  siguiente: string | null;
}

/** Umbrales: por debajo de esto, 360p no da detalle suficiente para que el personaje se reconozca en un teléfono. */
export const UMBRALES = Object.freeze({
  areaMinimaDelProtagonista: 0.12,
  personasParaSubir: 3,
  cambiosPorSegundoParaSubir: 0.6,
  ladoCortoMinimoDelOriginal: 360,
});

const orden = (r: string): number => ({ '360p': 360, '480p': 480, '720p': 720, '1080p': 1080, '4k': 2160 } as Record<string, number>)[r] ?? Infinity;

/**
 * La regla:
 *   1. el producto prefiere 360p;
 *   2. sube a 480p si el protagonista es pequeño, hay muchas personas o mucho movimiento, o si no se sabe (sin
 *      detección no se puede afirmar que 360p baste para la identidad: se sube, no se arriesga);
 *   3. nunca por encima de lo que el original tiene;
 *   4. y se ajusta a lo que el MODELO ofrece: la más baja disponible que sea ≥ la elegida.
 */
export const decidirResolucion = (rasgos: RasgosDelVideo, delModelo: readonly string[]): DecisionDeCalidad => {
  const motivos: string[] = [];
  let preferida: ResolucionSocial = '360p';
  if (rasgos.areaDelProtagonista === undefined) { preferida = '480p'; motivos.push('sin_deteccion_del_protagonista'); }
  else if (rasgos.areaDelProtagonista < UMBRALES.areaMinimaDelProtagonista) { preferida = '480p'; motivos.push('protagonista_pequeno'); }
  if ((rasgos.personas ?? 1) >= UMBRALES.personasParaSubir) { preferida = '480p'; motivos.push('muchas_personas'); }
  if ((rasgos.cambiosPorSegundo ?? 0) >= UMBRALES.cambiosPorSegundoParaSubir) { preferida = '480p'; motivos.push('mucho_movimiento'); }
  const ladoCorto = rasgos.ancho && rasgos.alto ? Math.min(rasgos.ancho, rasgos.alto) : undefined;
  if (ladoCorto !== undefined && ladoCorto < 480 && preferida === '480p') { preferida = '360p'; motivos.push('original_de_baja_resolucion'); }
  if (!motivos.length) motivos.push('360p_suficiente');

  const disponibles = [...delModelo].sort((a, b) => orden(a) - orden(b));
  const elegida = disponibles.find((r) => orden(r) >= orden(preferida)) ?? disponibles[disponibles.length - 1] ?? preferida;
  if (orden(elegida) > orden(preferida)) motivos.push('minimo_del_proveedor');
  const tope = orden(RESOLUCIONES_DEL_PRODUCTO[RESOLUCIONES_DEL_PRODUCTO.length - 1]);
  const siguiente = disponibles.find((r) => orden(r) > orden(elegida) && orden(r) <= tope) ?? null;
  return { resolucion: elegida, preferidaPorElProducto: preferida, motivos, siguiente };
};

/** Los fps del flujo de vídeo, de lo que escribe `ffmpeg -i`. */
export const leerFps = (stderr: string): number | undefined => {
  const m = /Video: [^\n]*?, (\d+(?:\.\d+)?) fps/.exec(stderr);
  return m ? Number(m[1]) : undefined;
};
