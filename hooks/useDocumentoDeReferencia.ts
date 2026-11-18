import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { LECTURA_DE_DOCUMENTOS_ABIERTA } from '../constants/filmmakerDocumentos';
import {
  ArchivoElegido,
  claveDeErrorDeDocumento,
  ContextoDeLectura,
  CotizacionDeDocumento,
  cotizarDocumento,
  DossierDeDocumento,
  ErrorDeDocumentoCliente,
  leerDocumento,
  subirDocumento,
} from '../services/documentosService';
import { CLAVE_ACTUALIZA_LA_APP, elegirDocumento, selectorDisponible } from '../services/selectorDeDocumentos';

/**
 * Un documento, guion o libro como REFERENCIA de Weë Brain: elegir → (subir y cotizar) → confirmar → leyendo → listo.
 *
 * API simple para quien pinte la fila del «+» (no pinta nada por sí mismo):
 *   abierta     la capacidad está abierta en la UI (constante `LECTURA_DE_DOCUMENTOS_ABIERTA`); si es false, la fila sale cerrada.
 *   estado      'vacio' | 'subiendo' | 'cotizado' | 'leyendo' | 'listo' | 'error'
 *   cotizacion  Credits que cuesta leerlo (solo en 'cotizado'); lo que se enseña es lo que se cobra.
 *   dossier     el resultado (solo en 'listo'): lo que alimenta el Universo y las Tandas.
 *   errorClave  clave de i18n del error (solo en 'error'): `t(errorClave)`.
 *   disponible  el selector de archivos existe en esta build (módulo nativo); si no, la fila sale cerrada con `filmmakerDocumentos.errUpdateApp`.
 *   seleccionar()  abre el selector y sigue solo hasta `cotizado`.   elegir(archivo)  igual, con un archivo ya elegido.
 *   confirmar(contexto?)  lee. `contexto` (opcional): tipo, estilo y personajes/mundo aportados; lo aportado manda, lo que falte lo propone Weë.
 *   quitar()   (reintentar = confirmar() de nuevo, o elegir otro archivo).
 *
 * Nada de lo técnico sale de aquí: ni bloques, ni modelos, ni proveedores.
 */
export type EstadoDeDocumento = 'vacio' | 'subiendo' | 'cotizado' | 'leyendo' | 'listo' | 'error';

const nuevaOperacion = (): string => `lec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function useDocumentoDeReferencia() {
  const { user } = useAuth();
  const { locale } = useIdioma();
  const [estado, setEstado] = useState<EstadoDeDocumento>('vacio');
  const [cotizacion, setCotizacion] = useState<CotizacionDeDocumento | null>(null);
  const [dossier, setDossier] = useState<DossierDeDocumento | null>(null);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const archivo = useRef<{ url: string; nombre: string } | null>(null);
  /* Cada gesto invalida a los anteriores: una respuesta tardía de un archivo ya quitado no pisa el estado. */
  const gesto = useRef(0);
  useEffect(() => () => { gesto.current += 1; }, []);

  const fallar = useCallback((error: unknown) => {
    setErrorClave(claveDeErrorDeDocumento(error));
    setEstado('error');
  }, []);

  const elegir = useCallback(
    async (elegido: ArchivoElegido) => {
      if (!LECTURA_DE_DOCUMENTOS_ABIERTA || !user?.uid) return;
      const mio = ++gesto.current;
      setDossier(null);
      setCotizacion(null);
      setErrorClave(null);
      setEstado('subiendo');
      try {
        const url = await subirDocumento(user.uid, elegido);
        const cotizada = await cotizarDocumento(url, elegido.name, locale);
        if (mio !== gesto.current) return;
        archivo.current = { url, nombre: elegido.name };
        setCotizacion(cotizada);
        setEstado('cotizado');
      } catch (error) {
        if (mio === gesto.current) fallar(error);
      }
    },
    [user?.uid, locale, fallar],
  );

  const confirmar = useCallback(async (contexto?: ContextoDeLectura) => {
    if (!archivo.current || !cotizacion) return;
    const mio = ++gesto.current;
    setErrorClave(null);
    setEstado('leyendo');
    try {
      /* Una operación NUEVA en cada intento: la anterior, si falló, quedó reembolsada y no se reutiliza. */
      const resultado = await leerDocumento({ url: archivo.current.url, nombre: archivo.current.nombre, requestId: nuevaOperacion(), creditosCotizados: cotizacion.credits, locale, contexto });
      if (mio !== gesto.current) return;
      setDossier(resultado);
      setEstado('listo');
    } catch (error) {
      if (mio !== gesto.current) return;
      /* El precio cambió: se enseña el nuevo y la persona vuelve a confirmar (no se reintenta solo). */
      if (error instanceof ErrorDeDocumentoCliente && typeof error.datos?.credits === 'number') {
        setCotizacion({ ...cotizacion, credits: error.datos.credits });
        setErrorClave(error.clave);
        setEstado('cotizado');
        return;
      }
      fallar(error);
    }
  }, [cotizacion, locale, fallar]);

  /** Abre el selector de archivos y sigue solo (subir y cotizar). Sin selector (build vieja) deja el motivo, sin romper nada. */
  const seleccionar = useCallback(async () => {
    if (!LECTURA_DE_DOCUMENTOS_ABIERTA) return;
    const r = await elegirDocumento();
    if (r.estado === 'no_disponible') {
      setErrorClave(CLAVE_ACTUALIZA_LA_APP);
      setEstado('error');
    } else if (r.estado === 'elegido') {
      await elegir(r.archivo);
    }
  }, [elegir]);

  const quitar = useCallback(() => {
    gesto.current += 1;
    archivo.current = null;
    setDossier(null);
    setCotizacion(null);
    setErrorClave(null);
    setEstado('vacio');
  }, []);

  /* `disponible`: el selector existe en esta build; si es false, la fila va cerrada con `filmmakerDocumentos.errUpdateApp`. */
  return { abierta: LECTURA_DE_DOCUMENTOS_ABIERTA, disponible: selectorDisponible(), estado, cotizacion, dossier, errorClave, seleccionar, elegir, confirmar, quitar };
}
