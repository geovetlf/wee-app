/**
 * FILMMAKER ENGINE · 3D DENTRO DE FILMMAKER · LO QUE SE PUEDE CREAR, Y DÓNDE.
 *
 * «3D vive dentro de Filmmaker, no Filmmaker dentro de 3D.» No hay una sección 3D ni una biblioteca aparte: Weë tiene
 * UN sistema de assets —el material (Content Core, que ya conoce `model3d`) y lo que es (Elements, de la cuenta)— y
 * cada forma de crear un personaje, un lugar o un objeto aparece DENTRO de la sección donde ya se trabaja con él:
 * Reparto, Lugares, Objetos, cada ficha, Referencias, el plano y Weë AI Director.
 *
 * Esta lista es la única verdad de qué se enseña, dónde y en qué estado. Una capacidad DISPONIBLE funciona hoy con lo
 * que ya existe. Una CERRADA se enseña igual, apagada, con su porqué —el patrón de siempre en Filmmaker—, porque existe
 * en el catálogo del Core o en la arquitectura y le falta una pieza concreta:
 *
 *   proveedor    no hay matriz con API oficial integrada para ella (el catálogo la tiene `DECLARED`);
 *   autorizacion pasar por la puerta de Filmmaker una capacidad más pide el permiso expreso del usuario (regla 10);
 *   activacion   el servidor la tiene preparada y apagada (la subida directa de Media Cloud);
 *   editor       le falta el editor en el workplace y su contrato en F1-A (la puesta en escena).
 *
 * No se enseña nada que no exista en ninguna parte: eso no es una capacidad cerrada, es una promesa.
 *
 * `catalogo`: de qué capacidades del catálogo del Core depende. Una prueba compara: si el Core pasa una a `ROUTABLE`,
 * la entrada que aquí sigue cerrada tiene que abrirse (y al revés: nada se abre aquí sin que el Core pueda servirla).
 */

/** Dónde aparece: siempre dentro de algo que ya existe en el workplace aprobado. */
export type SitioDeCreacion =
  | 'crear_personaje' | 'crear_lugar' | 'crear_objeto'
  | 'ficha'
  | 'ficha_lugar'
  | 'referencias'
  | 'plano'
  | 'director';

export type BloqueoDeCreacion = 'proveedor' | 'autorizacion' | 'activacion' | 'editor';

export type IdDeCreacion =
  | 'desde_guardados'
  | 'desde_creaciones'
  | 'guardar_para_reutilizar'
  | 'imagen_con_ia'
  | 'crear_en_3d'
  | 'importar_modelo_3d'
  | 'escena_3d'
  | 'referencia_3d'
  | 'plano_desde_guardados'
  | 'detectar_reparto';

export interface CapacidadDeCreacion {
  readonly id: IdDeCreacion;
  readonly sitios: readonly SitioDeCreacion[];
  readonly disponible: boolean;
  /** La etiqueta, y la frase que la explica debajo (solo donde se enseña con su explicación: la hoja de crear). */
  readonly clave: string;
  readonly explicacion?: string;
  readonly icono: string;
  /** Solo si está cerrada: qué le falta, y la frase que lo dice. */
  readonly bloqueo?: BloqueoDeCreacion;
  readonly porque?: string;
  /** Las capacidades del catálogo del Core de las que depende (si depende de alguna). */
  readonly catalogo?: readonly string[];
  /**
   * La puerta del SERVIDOR que puede abrirla para una cuenta sin cambiar la app (cerrada por defecto). Mientras el
   * servidor no diga que sí, se enseña cerrada con su porqué; si dice que sí, se abre para esa cuenta: así se hace el
   * canary sin publicar otra versión de la app.
   */
  readonly puerta?: 'modelos3d';
}

const CREAR: readonly SitioDeCreacion[] = ['crear_personaje', 'crear_lugar', 'crear_objeto'];

export const CAPACIDADES_DE_CREACION: readonly CapacidadDeCreacion[] = Object.freeze([
  {
    id: 'desde_guardados', sitios: CREAR, disponible: true, icono: 'bookmark-outline',
    clave: 'filmmaker.wsCreateFromSaved', explicacion: 'filmmaker.wsCreateFromSavedText',
  },
  {
    id: 'desde_creaciones', sitios: CREAR, disponible: true, icono: 'images-outline',
    clave: 'filmmaker.wsCreateFromCreations', explicacion: 'filmmaker.wsCreateFromCreationsText',
  },
  {
    id: 'imagen_con_ia', sitios: CREAR, disponible: false, icono: 'sparkles-outline',
    clave: 'filmmaker.wsCreateWithImage', explicacion: 'filmmaker.wsCreateWithImageText',
    bloqueo: 'autorizacion', porque: 'filmmaker.wsCreateWithImageWhy', catalogo: ['image.generate'],
  },
  {
    id: 'crear_en_3d', sitios: [...CREAR, 'ficha'], disponible: false, icono: 'cube-outline',
    clave: 'filmmaker.wsCreateIn3d', explicacion: 'filmmaker.wsCreateIn3dText',
    bloqueo: 'proveedor', porque: 'filmmaker.wsCreateIn3dWhy', catalogo: ['3d.generate'],
  },
  {
    id: 'importar_modelo_3d', sitios: CREAR, disponible: false, icono: 'cloud-upload-outline',
    clave: 'filmmaker.wsImport3d', explicacion: 'filmmaker.wsImport3dText',
    bloqueo: 'activacion', porque: 'filmmaker.wsImport3dWhy', puerta: 'modelos3d',
  },
  {
    id: 'guardar_para_reutilizar', sitios: ['ficha'], disponible: true, icono: 'bookmark-outline',
    clave: 'filmmaker.wsSaveForReuse',
  },
  {
    id: 'escena_3d', sitios: ['ficha_lugar', 'plano'], disponible: false, icono: 'git-network-outline',
    clave: 'filmmaker.wsScene3d',
    bloqueo: 'editor', porque: 'filmmaker.wsScene3dWhy',
  },
  {
    id: 'referencia_3d', sitios: ['referencias'], disponible: false, icono: 'cube-outline',
    clave: 'filmmaker.wsReference3d',
    bloqueo: 'editor', porque: 'filmmaker.wsReference3dWhy',
  },
  {
    id: 'plano_desde_guardados', sitios: ['plano'], disponible: true, icono: 'bookmark-outline',
    clave: 'filmmaker.wsShotFromSaved',
  },
  {
    id: 'detectar_reparto', sitios: ['director'], disponible: true, icono: 'people-outline',
    clave: 'filmmaker.wsBrainQuickCast', explicacion: 'filmmaker.wsBrainQuickCastText',
  },
] as const);

export const capacidadDeCreacion = (id: IdDeCreacion): CapacidadDeCreacion => {
  const c = CAPACIDADES_DE_CREACION.find((x) => x.id === id);
  if (!c) throw new Error(`capacidad de creación desconocida: ${id}`);
  return c;
};

export const capacidadesEn = (sitio: SitioDeCreacion): readonly CapacidadDeCreacion[] =>
  CAPACIDADES_DE_CREACION.filter((c) => c.sitios.includes(sitio));

/** La clase del Core con la que se guarda una ficha de cada sección (las que la puerta `productions` acepta al vincular). */
export const TIPO_DEL_CORE_POR_FICHA: Readonly<Record<'personaje' | 'lugar' | 'objeto', string>> = Object.freeze({
  personaje: 'character',
  lugar: 'place',
  objeto: 'object',
});

/** Un objeto que la producción dice que es un producto o una marca se guarda como tal: así lo encuentra Weë Design. */
export const tipoDelCoreParaObjeto = (kind: string | undefined): string =>
  kind === 'product' ? 'product' : kind === 'brand' ? 'brand' : 'object';
