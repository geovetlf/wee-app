import {
  ClaseDeElemento, ElementoAGenerar, ErrorDeImagenes, FORMATOS_DE_IMAGEN, LIMITES, MODOS, MotivoDeEntrada, MotivoDeImagen,
  PeticionDeImagenes, ResultadoDeElemento, TIPOS_DE_PERSONAJE, TrabajoDeImagen,
} from './contrato';
import { limpiar, promptDeCuadro, promptDeLamina, promptDeLugar, promptDeObjeto, promptDeRetrato, proporcionDe } from './prompts';

/**
 * LA ORQUESTACIÓN de «generar imágenes de Filmmaker» (universo y storyboard), sin Firebase ni red: todo lo que toca el mundo
 * entra por `Deps`. Así el flujo entero —puerta, validar, cotizar, reservar, generar, cancelar, parcial, reembolso— se prueba
 * con simulaciones.
 *
 * Orden que importa:  puerta → reclamo → validar y planear (gratis) → precio → RESERVAR → generar → guardar → cobrar lo entregado.
 * Una petición inválida se rechaza ANTES de reservar: no cuesta nada. Se cobra solo lo ENTREGADO (parcial, DX-04): lo que no
 * salió o se canceló vuelve a la cuenta; si no salió nada, la reserva entera.
 */

export class ImagenesCerradas extends Error { constructor() { super('imagenes cerradas'); this.name = 'ImagenesCerradas'; } }
export class LoteDuplicado extends Error { constructor() { super('lote en marcha'); this.name = 'LoteDuplicado'; } }
export class PrecioCambiado extends Error { constructor(public readonly credits: number) { super('precio cambiado'); this.name = 'PrecioCambiado'; } }

/** Cómo se valida una dirección que llega de fuera: `subida` = solo lo que la persona sube (creator-inputs); `cualquiera` = también lo generado por Weë. */
export type ClaseDeDireccion = 'subida' | 'cualquiera';
export type ValidarUrl = (url: unknown, clase: ClaseDeDireccion) => string | null;

const idValido = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= LIMITES.idElemento && /^[\w.:-]+$/.test(id);

const entrada = (motivo: MotivoDeEntrada) => new ErrorDeImagenes(motivo, motivo);

export interface LotePlaneado {
  peticion: PeticionDeImagenes;
  trabajos: TrabajoDeImagen[];
  /** Elemento por id (ya limpio) para armar los prompts. */
  elementos: Map<string, ElementoAGenerar>;
}

const limpiarElemento = (e: unknown, validar: ValidarUrl): ElementoAGenerar => {
  const x = (e ?? {}) as Record<string, unknown>;
  if (!idValido(x.id)) throw entrada('elemento_no_valido');
  const clase = x.clase as ClaseDeElemento;
  if (!['personaje', 'lugar', 'objeto', 'cuadro'].includes(clase)) throw entrada('elemento_no_valido');
  const nombre = limpiar(x.nombre, LIMITES.nombre);
  const descripcion = limpiar(x.descripcion, LIMITES.descripcion);
  if (!nombre && !descripcion) throw entrada('elemento_no_valido');
  const out: ElementoAGenerar = { id: x.id, clase, nombre, descripcion };
  if (typeof x.tipo === 'string' && (TIPOS_DE_PERSONAJE as readonly string[]).includes(x.tipo)) out.tipo = x.tipo as ElementoAGenerar['tipo'];
  if (x.imagenUsuario !== undefined && x.imagenUsuario !== null && x.imagenUsuario !== '') {
    const url = validar(x.imagenUsuario, 'subida');
    if (!url) throw entrada('referencia_no_valida');
    out.imagenUsuario = url;
  }
  if (clase === 'cuadro') {
    out.encuadre = limpiar(x.encuadre, LIMITES.encuadre);
    out.camara = limpiar(x.camara, LIMITES.camara);
    out.dialogo = limpiar(x.dialogo, LIMITES.dialogo);
    out.personajes = (Array.isArray(x.personajes) ? x.personajes : []).filter(idValido).slice(0, LIMITES.personajesPorCuadro);
    if (idValido(x.lugar)) out.lugar = x.lugar;
  }
  if (x.conservar === true) out.conservar = true;
  if (x.reinterpretar === true) out.reinterpretar = true;
  return out;
};

/** Valida la petición entera y la convierte en la lista de piezas que el lote produce. Gratis, sin red. */
export const planDeLote = (bruta: unknown, validar: ValidarUrl): LotePlaneado => {
  const b = (bruta ?? {}) as Record<string, unknown>;
  if (!(MODOS as readonly string[]).includes(b.modo as string)) throw entrada('modo_desconocido');
  const estilo = limpiar(b.estilo, LIMITES.estilo);
  if (!estilo) throw entrada('sin_estilo');
  if (!Array.isArray(b.elementos) || b.elementos.length === 0) throw entrada('sin_elementos');
  if (b.elementos.length > LIMITES.elementosPorLote) throw entrada('demasiados_elementos');

  let referencia: string | undefined;
  if (b.referencia !== undefined && b.referencia !== null && b.referencia !== '') {
    const url = validar(b.referencia, 'subida');
    if (!url) throw entrada('referencia_no_valida');
    referencia = url;
  }
  const retratos: Record<string, string> = {};
  if (b.retratos && typeof b.retratos === 'object') {
    for (const [id, valor] of Object.entries(b.retratos as Record<string, unknown>).slice(0, 80)) {
      if (!idValido(id)) continue;
      const url = validar(valor, 'cualquiera');
      if (!url) throw entrada('referencia_no_valida');
      retratos[id] = url;
    }
  }
  const calidad = b.calidad === 'alta' || b.calidad === 'estandar' ? b.calidad : undefined;
  const formato = (FORMATOS_DE_IMAGEN as readonly string[]).includes(b.formato as string) ? (b.formato as PeticionDeImagenes['formato']) : undefined;
  const peticion: PeticionDeImagenes = {
    modo: b.modo as PeticionDeImagenes['modo'],
    estilo,
    ...(b.tipo ? { tipo: limpiar(b.tipo, LIMITES.tipo) } : {}),
    ...(referencia ? { referencia } : {}),
    ...(b.mundo ? { mundo: limpiar(b.mundo, LIMITES.mundo) } : {}),
    ...(calidad ? { calidad } : {}),
    ...(formato ? { formato } : {}),
    ...(b.lamina === false ? { lamina: false } : {}),
    ...(typeof b.proyectoId === 'string' && idValido(b.proyectoId) ? { proyectoId: b.proyectoId } : {}),
    elementos: [],
    ...(Object.keys(retratos).length ? { retratos } : {}),
  };
  const elementos = new Map<string, ElementoAGenerar>();
  for (const bruto of b.elementos) {
    const e = limpiarElemento(bruto, validar);
    if (elementos.has(e.id)) throw entrada('elemento_no_valido');
    elementos.set(e.id, e);
    peticion.elementos.push(e);
  }

  const trabajos: TrabajoDeImagen[] = [];
  const tope = LIMITES.referenciasPorImagen;

  if (peticion.modo === 'universo') {
    if (peticion.elementos.some((e) => e.clase === 'cuadro')) throw entrada('elemento_no_valido');
    const personajes = peticion.elementos.filter((e) => e.clase === 'personaje');
    /* El universo necesita UNA imagen madre: la referencia, o al menos la ficha de un personaje. */
    if (!referencia && !personajes.some((e) => e.imagenUsuario)) throw entrada('sin_referencia');
    for (const e of peticion.elementos) {
      const hecho = retratos[e.id];
      if (e.conservar) {
        if (!hecho) throw entrada('sin_retratos');
        trabajos.push({ id: e.id, clase: e.clase, referencias: [], retratosDe: [], usaLaDeLaPersona: true, urlYaHecha: hecho, origenYaHecho: e.imagenUsuario && hecho === e.imagenUsuario ? 'usuario' : 'weë', fase: 0 });
        continue;
      }
      if (e.imagenUsuario && !e.reinterpretar) {
        trabajos.push({ id: e.id, clase: e.clase, referencias: [], retratosDe: [], usaLaDeLaPersona: true, urlYaHecha: e.imagenUsuario, origenYaHecho: 'usuario', fase: 0 });
        continue;
      }
      /* Con ficha, la ficha manda (primera); la referencia del universo ancla el estilo. */
      const refs = [e.imagenUsuario, referencia].filter((u): u is string => !!u).slice(0, tope);
      trabajos.push({ id: e.id, clase: e.clase, referencias: refs, retratosDe: [], usaLaDeLaPersona: false, conFicha: !!e.imagenUsuario, fase: 0 });
    }
    if (peticion.lamina !== false && personajes.length >= 2) {
      const ids = personajes.slice(0, 12).map((e) => e.id);
      trabajos.push({ id: 'lamina', clase: 'lamina', referencias: referencia ? [referencia] : [], retratosDe: ids, usaLaDeLaPersona: false, fase: 1 });
    }
  } else {
    if (peticion.elementos.some((e) => e.clase !== 'cuadro')) throw entrada('elemento_no_valido');
    for (const e of peticion.elementos) {
      if (e.imagenUsuario) {
        trabajos.push({ id: e.id, clase: 'cuadro', referencias: [], retratosDe: [], usaLaDeLaPersona: true, urlYaHecha: e.imagenUsuario, origenYaHecho: 'usuario', fase: 0 });
        continue;
      }
      const deLosPersonajes = (e.personajes ?? []).map((id) => retratos[id]).filter((u): u is string => !!u);
      const deLugar = e.lugar && retratos[e.lugar] ? [retratos[e.lugar]] : [];
      let refs = [...deLosPersonajes.slice(0, LIMITES.personajesPorCuadro), ...deLugar];
      if (refs.length === 0 && referencia) refs = [referencia];
      const nombres = (e.personajes ?? []).filter((id) => retratos[id]).map((id) => elementos.get(id)?.nombre ?? '').filter(Boolean);
      trabajos.push({ id: e.id, clase: 'cuadro', referencias: [...new Set(refs)].slice(0, tope), retratosDe: [], usaLaDeLaPersona: false, nombres, fase: 0 });
    }
  }
  return { peticion, trabajos, elementos };
};

/** Cuántas referencias lleva de verdad una pieza (lo que se cotiza y lo que se manda: el MISMO número). */
export const cuentaDeReferencias = (t: TrabajoDeImagen): number =>
  Math.min(LIMITES.referenciasPorImagen, t.referencias.length + t.retratosDe.length);

export interface EntradaDeGeneracion {
  id: string;
  clase: ClaseDeElemento;
  prompt: string;
  referencias: string[];
  aspectRatio: string;
  calidad: 'estandar' | 'alta';
}

/** Calidad por defecto: lo que fija la identidad (universo) sale en alta; los cuadros, que son muchos, en estándar. */
export const calidadDe = (p: PeticionDeImagenes, t: TrabajoDeImagen): 'estandar' | 'alta' =>
  p.calidad ?? (t.clase === 'cuadro' ? 'estandar' : 'alta');

export interface Cotizacion { credits: number; imagenes: number; usanLasDeLaPersona: number; porElemento: Record<string, number> }

export type ReclamoDeLote =
  | { estado: 'hecho'; items: ResultadoDeElemento[]; credits: number; cancelado: boolean }
  | { estado: 'reclamado'; previos: ResultadoDeElemento[] };

export interface Deps {
  /** `aiSettings/filmmakerImagenes.abierto === true`. Cualquier otra cosa: cerrado. */
  abierto(): Promise<boolean>;
  /** Credits de UNA imagen con ese número de referencias y esa calidad. Lanza si falta algo para poner precio. */
  precio(clase: ClaseDeElemento, referencias: number, calidad: 'estandar' | 'alta', aspectRatio: string): number;
  almacen: {
    reclamar(): Promise<ReclamoDeLote>;
    /** Estado vivo por elemento (la app lo lee con `estado` mientras el lote corre). */
    progreso(items: ResultadoDeElemento[]): Promise<void>;
    terminar(items: ResultadoDeElemento[], meta: { credits: number; cancelado: boolean }): Promise<void>;
    soltar(): Promise<void>;
    /** `true` si la persona canceló el lote. */
    cancelado(): Promise<boolean>;
  };
  cobro: {
    reservar(credits: number, huella: string): Promise<void>;
    /** Cierra el cobro por lo entregado: `final` ≤ lo reservado (la diferencia vuelve a la cuenta). */
    completar(final: number): Promise<void>;
    reembolsar(): Promise<void>;
  };
  /** Genera UNA imagen por el engine. Devuelve la url y, si el resultado fue de muestra (demo), `demo: true` (no se cobra). */
  generar(entrada: EntradaDeGeneracion): Promise<{ url: string; demo?: boolean }>;
  /** Clasifica un fallo de proveedor en un motivo cerrado. */
  motivoDe(error: unknown): MotivoDeImagen;
  /** Enlaza el resultado a la cuenta («Mis creaciones»). Fallar aquí no estropea el lote. */
  registrar?(item: { id: string; clase: ClaseDeElemento; url: string; nombre: string }, peticion: PeticionDeImagenes): Promise<void>;
  ahora(): number;
  /** Instante (ms) a partir del cual ya no se arranca ninguna imagen nueva: deja tiempo para liquidar. */
  limiteParaEmpezar: number;
  /** Lo que tarda como mucho una imagen: no se arranca una si no cabe. */
  maximoPorImagen: number;
  huella(peticion: PeticionDeImagenes): string;
  /** Solo recuentos y motivos; jamás contenido. */
  log(mensaje: string): void;
}

const aspectoDe = (p: PeticionDeImagenes, t: TrabajoDeImagen) => proporcionDe(t.clase, p.formato);

const preciosDe = (lote: LotePlaneado, deps: Deps): Cotizacion => {
  const porElemento: Record<string, number> = {};
  let credits = 0;
  let imagenes = 0;
  let usan = 0;
  for (const t of lote.trabajos) {
    if (t.usaLaDeLaPersona) { porElemento[t.id] = 0; usan += 1; continue; }
    const c = deps.precio(t.clase, cuentaDeReferencias(t), calidadDe(lote.peticion, t), aspectoDe(lote.peticion, t));
    if (!(Number.isFinite(c) && c >= 0)) throw new ImagenesCerradas();
    porElemento[t.id] = c;
    credits += c;
    imagenes += 1;
  }
  return { credits, imagenes, usanLasDeLaPersona: usan, porElemento };
};

export const cotizar = async (deps: Deps, bruta: unknown, validar: ValidarUrl): Promise<Cotizacion> => {
  if (!(await deps.abierto())) throw new ImagenesCerradas();
  return preciosDe(planDeLote(bruta, validar), deps);
};

const promptDe = (lote: LotePlaneado, t: TrabajoDeImagen): string => {
  const e = lote.elementos.get(t.id);
  const p = lote.peticion;
  const n = cuentaDeReferencias(t);
  if (t.clase === 'lamina') {
    const personajes = t.retratosDe.map((id) => lote.elementos.get(id)).filter((x): x is ElementoAGenerar => !!x);
    return promptDeLamina(personajes, p, n);
  }
  if (!e) return '';
  if (t.clase === 'cuadro') return promptDeCuadro(e, p, t.nombres ?? [], n);
  if (t.clase === 'lugar') return promptDeLugar(e, p, n);
  if (t.clase === 'objeto') return promptDeObjeto(e, p, n);
  return promptDeRetrato(e, p, n, !!t.conFicha);
};

export interface ResultadoDelLote { items: ResultadoDeElemento[]; credits: number; cancelado: boolean; duplicate: boolean }

export const generar = async (deps: Deps, bruta: unknown, creditosCotizados: number, validar: ValidarUrl): Promise<ResultadoDelLote> => {
  if (!(await deps.abierto())) throw new ImagenesCerradas();
  const reclamo = await deps.almacen.reclamar();
  if (reclamo.estado === 'hecho') return { items: reclamo.items, credits: reclamo.credits, cancelado: reclamo.cancelado, duplicate: true };

  let reservado = false;
  try {
    const lote = planDeLote(bruta, validar);
    const cotizacion = preciosDe(lote, deps);
    if (Number(creditosCotizados) !== cotizacion.credits) throw new PrecioCambiado(cotizacion.credits);
    if (cotizacion.credits > 0) {
      await deps.cobro.reservar(cotizacion.credits, deps.huella(lote.peticion));
      reservado = true;
    }

    /* Lo que ya salió en un intento anterior del mismo lote (el proceso murió a medias) no se vuelve a hacer ni a pagar dos veces. */
    const previos = new Map(reclamo.previos.filter((r) => r.estado === 'lista').map((r) => [r.id, r]));
    const items: ResultadoDeElemento[] = lote.trabajos.map((t): ResultadoDeElemento => {
      const previo = previos.get(t.id);
      if (previo) return previo;
      if (t.usaLaDeLaPersona) return { id: t.id, clase: t.clase, estado: 'lista', origen: t.origenYaHecho ?? 'usuario', url: t.urlYaHecha, credits: 0 };
      return { id: t.id, clase: t.clase, estado: 'pendiente', credits: 0 };
    });
    const porId = new Map(items.map((i) => [i.id, i]));
    await deps.almacen.progreso(items);

    let cancelado = false;
    const hechos = (): Record<string, string> => {
      const m: Record<string, string> = { ...(lote.peticion.retratos ?? {}) };
      for (const i of items) if (i.estado === 'lista' && i.url) m[i.id] = i.url;
      return m;
    };

    const hacer = async (t: TrabajoDeImagen) => {
      const item = porId.get(t.id)!;
      if (item.estado === 'lista') return;
      if (cancelado || (await deps.almacen.cancelado())) {
        cancelado = true;
        item.estado = 'cancelada';
        return;
      }
      if (deps.ahora() + deps.maximoPorImagen > deps.limiteParaEmpezar) {
        item.estado = 'error';
        item.motivo = 'sin_tiempo';
        await deps.almacen.progreso(items);
        return;
      }
      item.estado = 'generando';
      await deps.almacen.progreso(items);
      try {
        const conocidos = hechos();
        const extra = t.retratosDe.map((id) => conocidos[id]).filter((u): u is string => !!u);
        const referencias = [...t.referencias, ...extra].slice(0, LIMITES.referenciasPorImagen);
        const r = await deps.generar({
          id: t.id,
          clase: t.clase,
          prompt: promptDe(lote, t),
          referencias,
          aspectRatio: aspectoDe(lote.peticion, t),
          calidad: calidadDe(lote.peticion, t),
        });
        item.estado = 'lista';
        item.origen = 'weë';
        item.url = r.url;
        /* Lo de muestra no se cobra, en ningún modo. */
        item.credits = r.demo ? 0 : cotizacion.porElemento[t.id] ?? 0;
        delete item.motivo;
        if (deps.registrar) {
          const nombre = lote.elementos.get(t.id)?.nombre || t.id;
          await deps.registrar({ id: t.id, clase: t.clase, url: r.url, nombre }, lote.peticion).catch(() => deps.log('imagenes: no se pudo enlazar un resultado a la cuenta'));
        }
      } catch (error) {
        item.estado = 'error';
        item.motivo = deps.motivoDe(error);
        deps.log(`imagenes: fallo clase=${t.clase} motivo=${item.motivo}`);
      }
      await deps.almacen.progreso(items);
    };

    /* Fase 0 (retratos, lugares, cuadros) con tope de paralelismo; fase 1 (la lámina) cuando ya hay retratos. */
    for (const fase of [0, 1] as const) {
      const cola = lote.trabajos.filter((t) => t.fase === fase && !t.usaLaDeLaPersona);
      const trabajadores = Array.from({ length: Math.min(LIMITES.imagenesEnParalelo, cola.length) }, async () => {
        for (let t = cola.shift(); t; t = cola.shift()) await hacer(t);
      });
      await Promise.all(trabajadores);
    }

    const aCobrar = Math.min(cotizacion.credits, items.reduce((s, i) => s + (i.estado === 'lista' && i.origen === 'weë' ? i.credits : 0), 0));
    await deps.almacen.terminar(items, { credits: aCobrar, cancelado });
    if (reservado) {
      /* Las imágenes ya son de la persona: si cerrar el cobro falla, no se le quitan; queda registrado para cerrarlo. */
      if (aCobrar === 0) await deps.cobro.reembolsar().catch(() => deps.log('imagenes: no se pudo reembolsar'));
      else await deps.cobro.completar(aCobrar).catch(() => deps.log('imagenes: lote entregado y cobro sin cerrar (sigue reservado)'));
    }
    const listas = items.filter((i) => i.estado === 'lista').length;
    deps.log(`imagenes: lote modo=${lote.peticion.modo} listas=${listas}/${items.length} credits=${aCobrar} cancelado=${cancelado}`);
    return { items, credits: aCobrar, cancelado, duplicate: false };
  } catch (error) {
    if (reservado) await deps.cobro.reembolsar().catch(() => deps.log('imagenes: no se pudo reembolsar'));
    await deps.almacen.soltar().catch(() => undefined);
    throw error;
  }
};
