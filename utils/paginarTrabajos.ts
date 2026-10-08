/**
 * BUSCAR LOS TRABAJOS DE UNA EXPERIENCIA SIN PERDERLOS (DEC-05, 2026-10-08).
 *
 * `creatorService.getMyJobs` trae los últimos N trabajos de TODAS las experiencias y solo después se filtra por
 * experiencia. Si esos N son de otras experiencias, los de la consultada no aparecen aunque existan más atrás.
 *
 * Esto pagina por el mismo orden del índice que ya existe (userId ASC, createdAt DESC) hasta reunir lo pedido o
 * agotar la lista, y se detiene siempre: por un límite de páginas, para que nunca lea sin fin.
 *
 * Es puro: no sabe de Firestore. Quien llama pone `pedirPagina` (creatorService lo hace con `startAfter`). El cursor
 * es opaco: lo que `pedirPagina` devuelve como `cursor` se le entrega tal cual en la página siguiente.
 */

/**
 * Trabajos por página cuando quien llama no indica el suyo. Ningún consumidor actual lo usa: Chef y Especialista pasan
 * 20, y la franja de Design pasa 30 (creatorService.getMyJobsDe).
 */
export const TAMANO_DE_PAGINA_DE_TRABAJOS = 20;

/** Límite de seguridad: páginas leídas como máximo por búsqueda (con el tamaño por defecto, 120 documentos). */
export const MAX_PAGINAS_DE_TRABAJOS = 6;

export interface PaginaDeTrabajos<T> {
  /** Los trabajos de esta página, en el orden del índice (createdAt descendente). */
  trabajos: readonly T[];
  /** Lo que hace falta para pedir la página siguiente: el último documento de esta página. */
  cursor: unknown;
}

export interface BusquedaDeTrabajos<T> {
  /** Los trabajos que cumplen `pertenece`, en el orden del índice, sin repetir y sin pasarse de `cantidad`. */
  items: T[];
  /** Páginas leídas. */
  paginas: number;
  /** Documentos leídos en total. */
  leidos: number;
  /** true si se llegó al final de la lista; false si se paró por el límite de páginas o por `cantidad`. */
  agotado: boolean;
}

export const buscarTrabajos = async <T extends { id: string }>(opciones: {
  pedirPagina: (cursor: unknown, tamano: number) => Promise<PaginaDeTrabajos<T>>;
  pertenece: (trabajo: T) => boolean;
  cantidad: number;
  tamano?: number;
  maxPaginas?: number;
}): Promise<BusquedaDeTrabajos<T>> => {
  const { pedirPagina, pertenece, cantidad } = opciones;
  const tamano = opciones.tamano ?? TAMANO_DE_PAGINA_DE_TRABAJOS;
  const maxPaginas = opciones.maxPaginas ?? MAX_PAGINAS_DE_TRABAJOS;
  const items: T[] = [];
  const vistos = new Set<string>();
  let cursor: unknown = undefined;
  let paginas = 0;
  let leidos = 0;
  let agotado = false;

  while (items.length < cantidad && paginas < maxPaginas) {
    const pagina = await pedirPagina(cursor, tamano);
    paginas += 1;
    leidos += pagina.trabajos.length;
    for (const trabajo of pagina.trabajos) {
      if (items.length >= cantidad) break;
      if (vistos.has(trabajo.id)) continue;
      vistos.add(trabajo.id);
      if (pertenece(trabajo)) items.push(trabajo);
    }
    // Una página corta es el final de la lista: no hace falta pedir otra.
    if (pagina.trabajos.length < tamano) {
      agotado = true;
      break;
    }
    cursor = pagina.cursor;
  }

  return { items, paginas, leidos, agotado };
};
