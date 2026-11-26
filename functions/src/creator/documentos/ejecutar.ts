import { DocumentoLeido, leerDocumento } from './formatos';
import { ContextoDeLectura, DossierDeDocumento, FormatoDeDocumento, LIMITES } from './contrato';
import { Leedor, leerDirecto, leerPorBloques, MAX_SALIDA_BLOQUE, MAX_SALIDA_CONSOLIDACION, MAX_SALIDA_DIRECTA, partirEnBloques } from './dossier';

/**
 * LA ORQUESTACIÓN de «leer un documento», sin Firebase ni red: todo lo que toca el mundo entra por `Deps`. Así el flujo
 * entero —cotizar, reservar, leer, respaldo, guardar, cobrar o reembolsar— se prueba con simulaciones.
 *
 * Orden que importa:  puerta → reclamo → validar el archivo (gratis) → precio → RESERVAR → leer → guardar → cobrar.
 * Un archivo inválido se rechaza ANTES de reservar: no cuesta nada. Cualquier fallo después de reservar devuelve la reserva.
 */

export class DocumentosCerrados extends Error { constructor() { super('documentos cerrados'); this.name = 'DocumentosCerrados'; } }
export class LecturaDuplicada extends Error { constructor() { super('lectura en marcha'); this.name = 'LecturaDuplicada'; } }
export class PrecioCambiado extends Error { constructor(public readonly credits: number) { super('precio cambiado'); this.name = 'PrecioCambiado'; } }

/** Lo que cuesta leer, descrito sin precios: quien sabe de tarifas (el servidor) lo convierte en Credits. */
export interface PlanDeLectura {
  formato: FormatoDeDocumento;
  caracteres?: number;
  paginas?: number;
  /** Páginas que cobra el parseo del proveedor principal (PDF y DOCX; el texto plano y el EPUB no se facturan). */
  paginasParseadas: number;
  /** Ruta principal: el documento entero en una pasada. */
  directo: { tokensEntrada: number; tokensSalida: number };
  /** Respaldo, si lo hay para este documento (texto: por bloques; PDF corto: nativo). */
  respaldo?: { llamadas: { tokensEntrada: number; tokensSalida: number }[] };
}

const POR_TOKEN = 3; // caracteres por token, a la baja a propósito: el precio es un techo
const TOKENS_POR_PAGINA_TEXTO = 800;
const TOKENS_POR_PAGINA_NATIVA = 258;
const PAGINAS_POR_CARACTERES = 1200;

export const planDe = (doc: DocumentoLeido): PlanDeLectura => {
  if (doc.formato === 'pdf') {
    const paginas = doc.paginas ?? LIMITES.paginasPdf;
    return {
      formato: 'pdf',
      ...(doc.paginas !== undefined ? { paginas: doc.paginas } : {}),
      paginasParseadas: paginas,
      directo: { tokensEntrada: paginas * TOKENS_POR_PAGINA_TEXTO, tokensSalida: MAX_SALIDA_DIRECTA },
      ...(doc.paginas !== undefined && doc.paginas <= LIMITES.paginasPdfNativo
        ? { respaldo: { llamadas: [{ tokensEntrada: doc.paginas * TOKENS_POR_PAGINA_NATIVA + 1500, tokensSalida: MAX_SALIDA_DIRECTA }] } }
        : {}),
    };
  }
  const bloques = partirEnBloques(doc.texto);
  const llamadas = bloques.map((b) => ({ tokensEntrada: Math.ceil(b.length / POR_TOKEN) + 1500, tokensSalida: MAX_SALIDA_BLOQUE }));
  /* La consolidación puede correr aunque haya un solo bloque (si la persona dio contexto): se cuenta siempre, es un techo. */
  llamadas.push({ tokensEntrada: bloques.length * 2500 + 1500, tokensSalida: MAX_SALIDA_CONSOLIDACION });
  return {
    formato: doc.formato,
    caracteres: doc.caracteres,
    paginasParseadas: doc.formato === 'docx' ? Math.min(LIMITES.paginasPdf, Math.ceil(doc.caracteres / PAGINAS_POR_CARACTERES)) : 0,
    directo: { tokensEntrada: Math.ceil(doc.caracteres / POR_TOKEN) + 1500, tokensSalida: MAX_SALIDA_DIRECTA },
    respaldo: { llamadas },
  };
};

export type ReclamoDeLectura = { estado: 'hecho'; dossier: DossierDeDocumento } | { estado: 'reclamado' };

export interface Deps {
  /** `aiSettings/documentos.abierto === true`. Cualquier otra cosa: cerrado. */
  abierto(): Promise<boolean>;
  leerArchivo(): Promise<Buffer>;
  nombreDeArchivo: string;
  idioma: string;
  /** Tipo, estilo y lo que la persona ya aportó (opcional). */
  contexto?: ContextoDeLectura;
  /** Credits (y USD de techo, para el registro) de un plan. Lanza si falta algo para poner precio. */
  precio(plan: PlanDeLectura): { credits: number; usd: number };
  almacen: {
    reclamar(): Promise<ReclamoDeLectura>;
    terminar(dossier: DossierDeDocumento, meta: { credits: number; usd: number; ruta: 'directo' | 'respaldo' }): Promise<void>;
    soltar(estado: 'fallido'): Promise<void>;
  };
  cobro: {
    reservar(credits: number, huella: string): Promise<{ duplicate: boolean; status?: string }>;
    completar(): Promise<void>;
    reembolsar(): Promise<void>;
  };
  directo: {
    subir(buffer: Buffer, formato: FormatoDeDocumento): Promise<string>;
    borrar(id: string): Promise<void>;
    leedor(id: string): Leedor;
  };
  /** El leedor de respaldo (la cadena del engine sin el proveedor principal). `nativo`: lleva el PDF adjunto. */
  respaldo(nativo: boolean): Leedor;
  borrarOriginal(): Promise<void>;
  huella(buffer: Buffer): string;
  /** Solo recuentos y motivos; jamás contenido. */
  log(mensaje: string): void;
}

export interface Cotizacion { credits: number; formato: FormatoDeDocumento; paginas?: number; caracteres?: number }

const validar = async (deps: Deps): Promise<{ bytes: Buffer; doc: DocumentoLeido; plan: PlanDeLectura; credits: number; usd: number }> => {
  const bytes = await deps.leerArchivo();
  const doc = leerDocumento(bytes, deps.nombreDeArchivo);
  const plan = planDe(doc);
  const { credits, usd } = deps.precio(plan);
  return { bytes, doc, plan, credits, usd };
};

export const cotizar = async (deps: Deps): Promise<Cotizacion> => {
  if (!(await deps.abierto())) throw new DocumentosCerrados();
  const { plan, credits } = await validar(deps);
  return { credits, formato: plan.formato, ...(plan.paginas !== undefined ? { paginas: plan.paginas } : {}), ...(plan.caracteres !== undefined ? { caracteres: plan.caracteres } : {}) };
};

export const leer = async (deps: Deps, creditosCotizados: number): Promise<{ dossier: DossierDeDocumento; credits: number; duplicate: boolean }> => {
  if (!(await deps.abierto())) throw new DocumentosCerrados();
  const reclamo = await deps.almacen.reclamar();
  if (reclamo.estado === 'hecho') return { dossier: reclamo.dossier, credits: 0, duplicate: true };

  let reservado = false;
  try {
    const { bytes, doc, plan, credits, usd } = await validar(deps);
    if (Number(creditosCotizados) !== credits) throw new PrecioCambiado(credits);
    await deps.cobro.reservar(credits, deps.huella(bytes));
    reservado = true;

    const estadisticas = { ...(plan.caracteres !== undefined ? { caracteres: plan.caracteres } : {}), ...(plan.paginas !== undefined ? { paginas: plan.paginas } : {}) };
    let dossier: DossierDeDocumento;
    let ruta: 'directo' | 'respaldo' = 'directo';
    let fallo: unknown;
    let ficheroId: string | undefined;
    try {
      ficheroId = await deps.directo.subir(bytes, plan.formato);
      dossier = await leerDirecto(deps.directo.leedor(ficheroId), { idioma: deps.idioma, formato: plan.formato, estadisticas, contexto: deps.contexto });
    } catch (error) {
      fallo = error;
      dossier = undefined as unknown as DossierDeDocumento;
    } finally {
      /* El documento no se queda en el proveedor ni un minuto más de lo necesario (además de la expiración corta). */
      if (ficheroId) await deps.directo.borrar(ficheroId).catch(() => undefined);
    }
    if (fallo !== undefined) {
      deps.log(`documentos: ruta principal sin lectura (${fallo instanceof Error ? fallo.name : 'error'}), formato=${plan.formato}`);
      if (!plan.respaldo) throw fallo;
      ruta = 'respaldo';
      dossier = doc.formato === 'pdf'
        ? await leerDirecto(deps.respaldo(true), { idioma: deps.idioma, formato: 'pdf', estadisticas, contexto: deps.contexto })
        : await leerPorBloques(deps.respaldo(false), { texto: doc.texto, idioma: deps.idioma, formato: doc.formato, estadisticas, contexto: deps.contexto });
    }

    await deps.almacen.terminar(dossier, { credits, usd, ruta });
    /* El dossier ya es de la persona: si cerrar el cobro falla, no se le quita; queda registrado para cerrarlo. */
    await deps.cobro.completar().catch(() => deps.log('documentos: dossier entregado y cobro sin cerrar (sigue reservado)'));
    await deps.borrarOriginal().catch(() => deps.log('documentos: no se pudo borrar el original'));
    deps.log(`documentos: leido formato=${plan.formato} ruta=${ruta} capitulos=${dossier.capitulos.length} credits=${credits}`);
    return { dossier, credits, duplicate: false };
  } catch (error) {
    if (reservado) await deps.cobro.reembolsar().catch(() => deps.log('documentos: no se pudo reembolsar'));
    await deps.almacen.soltar('fallido').catch(() => undefined);
    throw error;
  }
};
