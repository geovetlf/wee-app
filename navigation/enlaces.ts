/**
 * LO QUE VIAJA POR LA BARRA DE DIRECCIONES: FORMA ESTABLE, LECTURA VALIDADA, Y NADA QUE NO DEBA.
 *
 * En la web, React Navigation escribe los parámetros de la pantalla en la URL. Lo que no es texto lo escribe con
 * `String(valor)`: un objeto se convertía en «[object Object]», y al recargar volvía ESO —una cadena— en lugar del
 * objeto. CreatorFlow perdía la respuesta ya elegida, el compositor el lugar, y una publicación abierta desde el muro
 * se recargaba con `post: "[object Object]"` y se rompía.
 *
 * La regla, para cada pantalla con dirección propia (la configuración de enlaces de `App.tsx`):
 *  · lo pequeño y público viaja como JSON (`escribirJson`) y vuelve validado (`leerJson` + su comprobador): si no
 *    tiene la forma, no vuelve, y la pantalla sigue como si no lo hubiera;
 *  · lo privado o lo que caduca NO viaja nunca (`nuncaEnLaUrl`): fotos (`blob:` o con su token de descarga), la
 *    zona de la ubicación, el texto que escribió la persona, publicaciones enteras de otros;
 *  · y una red de seguridad (`sinObjetosSueltos`) quita de la URL cualquier objeto que su pantalla no sepa escribir,
 *    también en pantallas sin dirección propia: ningún «[object Object]» vuelve a salir.
 *
 * Funciones puras: las usa `App.tsx` y las ejecuta `functions/test/navegacion-enlaces.test.mjs`.
 */

/** Un identificador: id de trabajo, de documento, slug, código de pregunta u opción. */
export const ID = /^[A-Za-z0-9_-]{1,128}$/;
export const esId = (v: unknown): v is string => typeof v === 'string' && ID.test(v);

export const escribirJson = (v: unknown): string => JSON.stringify(v);

/** JSON de la URL → valor, solo si tiene la forma esperada. Lo demás (también el «[object Object]» de antes): undefined. */
export const leerJson = <T>(texto: unknown, valido: (v: unknown) => v is T): T | undefined => {
  if (typeof texto !== 'string' || texto.length > 4000) return undefined;
  try {
    const v = JSON.parse(texto);
    return valido(v) ? v : undefined;
  } catch {
    return undefined;
  }
};

/** Para `stringify`: este parámetro no se escribe en la dirección. React Navigation omite la clave. */
export const nuncaEnLaUrl = (): string => undefined as unknown as string;

/* ── Las formas que viajan ─────────────────────────────────────────────────────────────────────────────────── */

export interface RespuestaElegida {
  questionId: string;
  optionId: string;
}
export const esRespuesta = (v: unknown): v is RespuestaElegida =>
  !!v && typeof v === 'object' && !Array.isArray(v) && esId((v as RespuestaElegida).questionId) && esId((v as RespuestaElegida).optionId)
  && Object.keys(v as object).length === 2;
export const esRespuestas = (v: unknown): v is RespuestaElegida[] => Array.isArray(v) && v.length > 0 && v.length <= 20 && v.every(esRespuesta);

/** Las elecciones creativas del Studio: rutas cortas a valores cortos (constants/camaraCinematica.ts). */
export const esCreativo = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length <= 40
  && Object.entries(v as Record<string, unknown>).every(([k, x]) => /^[A-Za-z0-9_.-]{1,64}$/.test(k) && typeof x === 'string' && x.length <= 120);

/** Un lugar de una publicación (data/places.ts → PostPlace). Es público: es lo que se lee en la publicación. */
export const esLugar = (v: unknown): v is { kind: 'catalog' | 'custom'; label: string; id?: string; countryCode?: string } => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const l = v as Record<string, unknown>;
  return (l.kind === 'catalog' || l.kind === 'custom') && typeof l.label === 'string' && l.label.trim().length > 0 && l.label.length <= 120
    && (l.id === undefined || (typeof l.id === 'string' && l.id.length <= 64))
    && (l.countryCode === undefined || (typeof l.countryCode === 'string' && /^[A-Z]{2}$/.test(l.countryCode)))
    && Object.keys(l).every((k) => ['kind', 'label', 'id', 'countryCode'].includes(k));
};

/** Una publicación de verdad (un objeto con su id), no la cadena que dejaba una recarga. */
export const esPublicacion = (v: unknown): v is { id: string } =>
  !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as { id?: unknown }).id === 'string' && (v as { id: string }).id.length > 0;

export const TIPOS_DE_PUBLICACION = ['post', 'weel', 'image', 'video', 'text', 'question'] as const;

/* ── La red de seguridad ───────────────────────────────────────────────────────────────────────────────────── */

interface ConfigDePantalla {
  screens?: Record<string, unknown>;
  stringify?: Record<string, unknown>;
}
interface EstadoDeNavegacion {
  routes: { name: string; params?: object; state?: EstadoDeNavegacion }[];
  index?: number;
}
const primitivo = (v: unknown): boolean => v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v);

/**
 * El estado, sin los parámetros que la URL no sabe escribir: objetos o listas de una pantalla que no declara cómo
 * (`stringify`). Lo que se quita sigue en memoria —atrás y adelante en la misma sesión lo conservan—; solo no sale a
 * la dirección. Devuelve también qué se quitó, para avisar en desarrollo.
 */
export const sinObjetosSueltos = <S extends EstadoDeNavegacion>(estado: S, pantallas: Record<string, unknown> | undefined): { estado: S; quitados: string[] } => {
  const quitados: string[] = [];
  const limpiar = (e: EstadoDeNavegacion, config: Record<string, unknown> | undefined): EstadoDeNavegacion => ({
    ...e,
    routes: e.routes.map((r) => {
      const suya = (config?.[r.name] && typeof config[r.name] === 'object' ? config[r.name] : {}) as ConfigDePantalla;
      const declarados = suya.stringify || {};
      const params = r.params
        ? Object.fromEntries(Object.entries(r.params).filter(([k, v]) => {
          const queda = primitivo(v) || k in declarados;
          if (!queda) quitados.push(`${r.name}.${k}`);
          return queda;
        }))
        : r.params;
      return { ...r, params, ...(r.state ? { state: limpiar(r.state, suya.screens as Record<string, unknown> | undefined) } : {}) };
    }),
  });
  return { estado: limpiar(estado, pantallas) as S, quitados };
};
