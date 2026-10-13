/**
 * QUÉ DE «MIS CREACIONES» SE PUEDE COMPARTIR EN UNA PUBLICACIÓN — puro, sin Firebase ni React.
 *
 * Lo usan el compositor del Wäll (`screens/CreateScreen.tsx`, botón «Creaciones») y «Crear Weël»
 * (`screens/CrearWeelScreen.tsx`, pestaña «Mis creaciones»). Las dos leen el material de la CUENTA con
 * `assetsService.listar` (solo lectura) y pasan lo leído por aquí.
 *
 * Qué entra (auditoría R9 · D, 2026-10-13):
 *   · imagen y vídeo: son lo único que una publicación sabe guardar (`imageUrls` + `assetIds`, `videoUrl` +
 *     `videoAssetId`) y lo único que el Wäll y Weëls pintan. Audio, texto, documento, modelo 3D y mundo no tienen campo
 *     en `posts` ni quien los pinte: no se ofrecen.
 *   · listo (`status: 'ready'`) y con URL de entrega: nada a medias, nada fallido, nada retirado.
 *   · HECHO CON WEË (con capacidad o derivado de otro material): lo que la persona subió como entrada no es una
 *     creación suya de Weë.
 *
 * Qué viaja al compositor: la URL de entrega que ya existe y el `assetId`, más lo que se ENSEÑA (nombre, herramienta
 * por su identificador, fecha, medidas). Ni el prompt interno, ni el proveedor, ni el modelo, ni el coste, ni el trabajo:
 * esos campos de la ficha no se copian nunca (el resultado es un objeto nuevo, no un recorte).
 */

export type TipoCompartible = 'image' | 'video';

export interface MaterialDeLaCuenta {
  assetId: string;
  kind: string;
  status: string;
  delivery?: { url?: string } | null;
  provenance?: { capability?: string; sourceAssetIds?: string[] } | null;
  durationSec?: number;
  width?: number;
  height?: number;
  name?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: number;
}

export interface CreacionCompartible {
  assetId: string;
  tipo: TipoCompartible;
  url: string;
  nombre?: string;
  /** Solo el identificador de la experiencia (`studio`, `chef`…): el nombre de marca lo pone quien pinta. */
  experienceId?: string;
  creadoEn?: number;
  segundos?: number;
  ancho?: number;
  alto?: number;
}

const hechoConWee = (a: MaterialDeLaCuenta): boolean =>
  !!a.provenance && ((typeof a.provenance.capability === 'string' && a.provenance.capability.length > 0)
    || (Array.isArray(a.provenance.sourceAssetIds) && a.provenance.sourceAssetIds.length > 0));

const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

export const creacionesCompartibles = (
  materiales: readonly MaterialDeLaCuenta[] | null | undefined,
  tipos: readonly TipoCompartible[] = ['image', 'video'],
): CreacionCompartible[] =>
  (materiales || [])
    .filter((a) => !!a && (tipos as readonly string[]).includes(a.kind) && a.status === 'ready'
      && typeof a.delivery?.url === 'string' && a.delivery.url.length > 0 && hechoConWee(a))
    .map((a) => {
      const exp = a.metadata?.experienceId;
      return {
        assetId: a.assetId,
        tipo: a.kind as TipoCompartible,
        url: a.delivery!.url as string,
        ...(typeof a.name === 'string' && a.name.trim() ? { nombre: a.name.trim() } : {}),
        ...(typeof exp === 'string' && /^[a-z]{2,20}$/.test(exp) ? { experienceId: exp } : {}),
        ...(numero(a.createdAt) ? { creadoEn: a.createdAt } : {}),
        ...(numero(a.durationSec) ? { segundos: a.durationSec } : {}),
        ...(numero(a.width) ? { ancho: a.width } : {}),
        ...(numero(a.height) ? { alto: a.height } : {}),
      };
    });

/**
 * Lo que cabe en la publicación al añadir creaciones, con las reglas de siempre del compositor: un vídeo va solo (ni
 * con fotos ni con encuesta) y las fotos no pasan del tope (diez, o una con encuesta). Devuelve lo que se añade y, si se
 * dejó algo fuera, por qué (`motivo`), para decirlo.
 */
export const queCabe = (
  elegidas: readonly CreacionCompartible[],
  ya: { fotos: number; video: boolean; encuesta: boolean; tope: number },
): { anadir: CreacionCompartible[]; motivo?: 'video_solo' | 'video_con_encuesta' | 'tope' } => {
  const videos = elegidas.filter((c) => c.tipo === 'video');
  const fotos = elegidas.filter((c) => c.tipo === 'image');
  if (videos.length > 0) {
    if (ya.encuesta) return { anadir: [], motivo: 'video_con_encuesta' };
    if (ya.fotos > 0 || ya.video || fotos.length > 0 || videos.length > 1) return { anadir: [], motivo: 'video_solo' };
    return { anadir: [videos[0]] };
  }
  if (ya.video) return { anadir: [], motivo: 'video_solo' };
  const sitio = Math.max(0, ya.tope - ya.fotos);
  return fotos.length > sitio ? { anadir: fotos.slice(0, sitio), motivo: 'tope' } : { anadir: fotos };
};
