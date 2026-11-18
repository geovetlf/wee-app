import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { LECTURA_DE_DOCUMENTOS_ABIERTA } from '../constants/filmmakerDocumentos';
import {
  ArchivoElegido,
  claveDeErrorDeDocumento,
  CotizacionDeDocumento,
  cotizarDocumento,
  DossierDeDocumento,
  ErrorDeDocumentoCliente,
  leerDocumento,
  subirDocumento,
} from '../services/documentosService';

/**
 * Un documento, guion o libro como REFERENCIA de Weë Brain: elegir → (subir y cotizar) → confirmar → leyendo → listo.
 *
 * API simple para quien pinte la fila del «+» (no pinta nada por sí mismo):
 *   abierta     la capacidad está abierta en la UI (constante `LECTURA_DE_DOCUMENTOS_ABIERTA`); si es false, la fila sale cerrada.
 *   estado      'vacio' | 'subiendo' | 'cotizado' | 'leyendo' | 'listo' | 'error'
 *   cotizacion  Credits que cuesta leerlo (solo en 'cotizado'); lo que se enseña es lo que se cobra.
 *   dossier     el resultado (solo en 'listo'): lo que alimenta el Universo y las Tandas.
 *   errorClave  clave de i18n del error (solo en 'error'): `t(errorClave)`.
 *   elegir(archivo) · confirmar() · quitar()   (reintentar = confirmar() de nuevo, o elegir otro archivo).
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

  const confirmar = useCallback(async () => {
    if (!archivo.current || !cotizacion) return;
    const mio = ++gesto.current;
    setErrorClave(null);
    setEstado('leyendo');
    try {
      /* Una operación NUEVA en cada intento: la anterior, si falló, quedó reembolsada y no se reutiliza. */
      const resultado = await leerDocumento({ url: archivo.current.url, nombre: archivo.current.nombre, requestId: nuevaOperacion(), creditosCotizados: cotizacion.credits, locale });
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

  const quitar = useCallback(() => {
    gesto.current += 1;
    archivo.current = null;
    setDossier(null);
    setCotizacion(null);
    setErrorClave(null);
    setEstado('vacio');
  }, []);

  return { abierta: LECTURA_DE_DOCUMENTOS_ABIERTA, estado, cotizacion, dossier, errorClave, elegir, confirmar, quitar };
}
