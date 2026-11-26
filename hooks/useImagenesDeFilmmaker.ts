import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IMAGENES_DE_FILMMAKER_ABIERTAS } from '../constants/filmmakerImagenes';
import { uploadCreatorImage } from '../services/creatorUploads';
import {
  cancelarImagenes,
  claveDeErrorDeImagenes,
  CotizacionDeImagenes,
  cotizarImagenes,
  ErrorDeImagenesCliente,
  estadoDeImagenes,
  generarImagenes,
  PeticionDeImagenes,
  ResultadoDeElemento,
} from '../services/filmmakerImagenesService';

/**
 * Las imágenes del universo y del storyboard de una producción (Filmmaker): cotizar → confirmar → generando → listo.
 *
 * API simple para quien pinte las filas «crear imágenes» (no pinta nada por sí mismo):
 *   abierta        la capacidad está abierta en la UI (constante `IMAGENES_DE_FILMMAKER_ABIERTAS`); si es false, la fila sale cerrada con `filmmakerImagenes.errClosed`.
 *   estado         'vacio' | 'cotizando' | 'cotizado' | 'generando' | 'listo' | 'error'
 *   cotizacion     Credits del lote («≈ N»), imágenes que cuesta y cuántas son de la persona; lo que se enseña es lo que se cobra.
 *   items          estado por elemento (pendiente | generando | lista | error | cancelada), con `url`, `origen` y `motivo` (`claveDeMotivoDeImagen(motivo)`).
 *   porId          lo mismo, por id de personaje/lugar/cuadro (la lámina del reparto es `porId.lamina`).
 *   progreso       { hechas, total } para «Creando 3 de 8…».
 *   errorClave     clave de i18n del error del lote (solo en 'error'): `t(errorClave)`.
 *   credits        Credits que se cobraron al terminar (solo lo entregado).
 *
 *   cotizar(peticion)          valida y cotiza. Siempre antes de generar: lo que se cobra es lo cotizado.
 *   generarUniverso(peticion)  retratos + lámina del reparto (modo `universo`).     Necesita haber cotizado ESA petición.
 *   generarCuadros(peticion)   un cuadro por plano con los retratos como referencia (modo `cuadros`).
 *   regenerar(peticion)        lo mismo para un lote de uno (regenerar un cuadro o un retrato): cotizar y luego esto.
 *   reintentarFallidos()       cotiza un lote nuevo solo con lo que no salió (lo ya hecho viaja como retrato conservado); luego `confirmar()`.
 *   confirmar()                lanza el lote de la última cotización (la persona vio «≈ N Credits» y aceptó).
 *   cancelar()                 no arranca más; lo entregado se cobra y el resto vuelve a la cuenta.
 *   subirImagen(uri)           sube una imagen de la persona (referencia, ficha o cuadro) a creator-inputs y devuelve su dirección.
 *   quitar()                   vuelve a 'vacio'.
 *
 * Nada técnico sale de aquí: ni modelos, ni proveedores, ni prompts.
 */
export type EstadoDeImagenes = 'vacio' | 'cotizando' | 'cotizado' | 'generando' | 'listo' | 'error';

const nuevaOperacion = (): string => `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const CADA_MS = 3000;

/** Dos peticiones son «la misma» si piden lo mismo: así lo cotizado vale para lo que se genera. */
const clave = (p: PeticionDeImagenes): string => JSON.stringify(p);

export function useImagenesDeFilmmaker() {
  const { user } = useAuth();
  const [estado, setEstado] = useState<EstadoDeImagenes>('vacio');
  const [cotizacion, setCotizacion] = useState<CotizacionDeImagenes | null>(null);
  const [items, setItems] = useState<ResultadoDeElemento[]>([]);
  const [credits, setCredits] = useState(0);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const cotizada = useRef<{ clave: string; peticion: PeticionDeImagenes } | null>(null);
  const ultima = useRef<PeticionDeImagenes | null>(null);
  const operacion = useRef<string | null>(null);
  /* Cada gesto invalida a los anteriores: una respuesta tardía de un lote ya quitado no pisa el estado. */
  const gesto = useRef(0);
  useEffect(() => () => { gesto.current += 1; }, []);

  const fallar = useCallback((error: unknown) => {
    setErrorClave(claveDeErrorDeImagenes(error));
    setEstado('error');
  }, []);

  const cotizar = useCallback(async (peticion: PeticionDeImagenes): Promise<CotizacionDeImagenes | null> => {
    if (!IMAGENES_DE_FILMMAKER_ABIERTAS || !user?.uid) return null;
    const mio = ++gesto.current;
    setErrorClave(null);
    setEstado('cotizando');
    try {
      const c = await cotizarImagenes(peticion);
      if (mio !== gesto.current) return null;
      cotizada.current = { clave: clave(peticion), peticion };
      setCotizacion(c);
      setEstado('cotizado');
      return c;
    } catch (error) {
      if (mio === gesto.current) fallar(error);
      return null;
    }
  }, [user?.uid, fallar]);

  /* Mientras el lote corre, el estado vivo por elemento llega del servidor cada pocos segundos. */
  const sondear = useCallback((mio: number, id: string) => {
    const timer = setInterval(async () => {
      if (mio !== gesto.current) { clearInterval(timer); return; }
      try {
        const e = await estadoDeImagenes(id);
        if (mio === gesto.current && e.items.length) setItems(e.items);
      } catch { /* el siguiente sondeo lo vuelve a intentar */ }
    }, CADA_MS);
    return () => clearInterval(timer);
  }, []);

  const lanzar = useCallback(async (peticion: PeticionDeImagenes) => {
    if (!IMAGENES_DE_FILMMAKER_ABIERTAS || !user?.uid) return;
    const previa = cotizada.current;
    /* Sin cotización de ESTA petición no se cobra nada: se cotiza y la persona confirma el precio con un segundo toque. */
    if (!previa || previa.clave !== clave(peticion) || !cotizacion) {
      const c = await cotizar(peticion);
      if (c) setErrorClave('filmmakerImagenes.errPriceChanged');
      return;
    }
    const mio = ++gesto.current;
    const id = nuevaOperacion();
    operacion.current = id;
    ultima.current = peticion;
    setErrorClave(null);
    setItems([]);
    setEstado('generando');
    const parar = sondear(mio, id);
    try {
      const r = await generarImagenes({ peticion, requestId: id, creditosCotizados: cotizacion.credits });
      if (mio !== gesto.current) return;
      setItems(r.items);
      setCredits(r.credits);
      setEstado('listo');
    } catch (error) {
      if (mio !== gesto.current) return;
      /* El precio cambió: se enseña el nuevo y la persona vuelve a confirmar (no se reintenta solo). */
      if (error instanceof ErrorDeImagenesCliente && typeof error.datos?.credits === 'number') {
        setCotizacion({ ...cotizacion, credits: error.datos.credits });
        cotizada.current = null;
        setErrorClave(error.clave);
        setEstado('cotizado');
        return;
      }
      /* Si la respuesta se perdió pero el lote siguió, el estado del servidor manda. */
      try {
        const e = await estadoDeImagenes(id);
        if (mio === gesto.current && e.terminado) { setItems(e.items); setCredits(e.credits); setEstado('listo'); return; }
      } catch { /* sin estado: es un error de verdad */ }
      fallar(error);
    } finally {
      parar();
    }
  }, [user?.uid, cotizacion, cotizar, sondear, fallar]);

  const generarUniverso = useCallback((peticion: PeticionDeImagenes) => lanzar({ ...peticion, modo: 'universo' }), [lanzar]);
  const generarCuadros = useCallback((peticion: PeticionDeImagenes) => lanzar({ ...peticion, modo: 'cuadros' }), [lanzar]);
  const regenerar = useCallback((peticion: PeticionDeImagenes) => lanzar(peticion), [lanzar]);

  /** Lote nuevo solo con lo que no salió. Lo ya hecho viaja como retrato conservado (para la lámina y la consistencia). */
  const peticionDeReintento = useCallback((): PeticionDeImagenes | null => {
    const p = ultima.current;
    if (!p) return null;
    const fallidos = new Set(items.filter((i) => i.estado === 'error' || i.estado === 'cancelada').map((i) => i.id));
    if (fallidos.size === 0) return null;
    if (p.modo === 'cuadros') return { ...p, elementos: p.elementos.filter((e) => fallidos.has(e.id)) };
    const hechos: Record<string, string> = { ...(p.retratos ?? {}) };
    for (const i of items) if (i.estado === 'lista' && i.url && i.clase !== 'lamina') hechos[i.id] = i.url;
    return {
      ...p,
      retratos: hechos,
      lamina: fallidos.has('lamina'),
      elementos: p.elementos.map((e) => (fallidos.has(e.id) ? { ...e, conservar: false } : hechos[e.id] ? { ...e, conservar: true } : e)),
    };
  }, [items]);

  const reintentarFallidos = useCallback(async () => {
    const p = peticionDeReintento();
    if (p) await cotizar(p);
  }, [peticionDeReintento, cotizar]);

  /** Confirma la última cotización (la de un reintento, por ejemplo) y lanza ese lote. */
  const confirmar = useCallback(async () => {
    if (cotizada.current) await lanzar(cotizada.current.peticion);
  }, [lanzar]);

  const cancelar = useCallback(async () => {
    if (operacion.current && estado === 'generando') await cancelarImagenes(operacion.current).catch(() => undefined);
  }, [estado]);

  const subirImagen = useCallback(async (uri: string): Promise<string> => {
    if (!user?.uid) throw new ErrorDeImagenesCliente('filmmakerImagenes.errGeneric');
    return uploadCreatorImage(user.uid, uri, 'creator-inputs');
  }, [user?.uid]);

  const quitar = useCallback(() => {
    gesto.current += 1;
    cotizada.current = null;
    ultima.current = null;
    operacion.current = null;
    setCotizacion(null);
    setItems([]);
    setCredits(0);
    setErrorClave(null);
    setEstado('vacio');
  }, []);

  const porId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])) as Record<string, ResultadoDeElemento>, [items]);
  const progreso = useMemo(() => ({ hechas: items.filter((i) => i.estado === 'lista').length, total: items.length }), [items]);

  return {
    abierta: IMAGENES_DE_FILMMAKER_ABIERTAS,
    estado,
    cotizacion,
    items,
    porId,
    progreso,
    errorClave,
    credits,
    cotizar,
    generarUniverso,
    generarCuadros,
    regenerar,
    reintentarFallidos,
    confirmar,
    cancelar,
    subirImagen,
    quitar,
  };
}
