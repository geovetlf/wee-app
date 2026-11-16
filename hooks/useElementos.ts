import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ElementoPropio, EstadoDeElementos, ESTADO_VACIO, TipoDePropio, elementosStore } from '../services/elementosStore';

/**
 * LOS ELEMENTOS PROPIOS DE LA CUENTA (personajes, escenarios, ropa) y los favoritos, desde el almacén local. Los mismos desde la
 * hoja de elementos, la pantalla de video y «Mis creaciones»: una sola fuente. Local, sin sincronizar.
 */
export const useElementos = () => {
  const { user } = useAuth();
  const cuenta = user?.uid ?? null;
  const [estado, setEstado] = useState<EstadoDeElementos>(ESTADO_VACIO);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setListo(false);
    elementosStore.leer(cuenta).then((e) => {
      if (vivo) {
        setEstado(e);
        setListo(true);
      }
    });
    return () => {
      vivo = false;
    };
  }, [cuenta]);

  const aplicar = useCallback(
    (siguiente: (e: EstadoDeElementos) => EstadoDeElementos) => {
      setEstado((actual) => {
        const nuevo = siguiente(actual);
        void elementosStore.guardar(cuenta, nuevo);
        return nuevo;
      });
    },
    [cuenta],
  );

  const crear = useCallback(
    (tipo: TipoDePropio, datos: { nombre: string; uris: string[]; clase?: ElementoPropio['clase'] }): ElementoPropio => {
      const nuevo: ElementoPropio = { id: `mio-${tipo}-${Date.now().toString(36)}`, tipo, nombre: datos.nombre.trim(), uris: datos.uris.slice(0, 5), clase: datos.clase, creado: Date.now() };
      aplicar((e) => ({ ...e, propios: [nuevo, ...e.propios] }));
      return nuevo;
    },
    [aplicar],
  );
  const renombrar = useCallback((id: string, nombre: string) => aplicar((e) => ({ ...e, propios: e.propios.map((p) => (p.id === id ? { ...p, nombre: nombre.trim() || p.nombre } : p)) })), [aplicar]);
  const borrar = useCallback((id: string) => aplicar((e) => ({ ...e, propios: e.propios.filter((p) => p.id !== id), favoritos: e.favoritos.filter((f) => f !== id) })), [aplicar]);
  const alternarFavorito = useCallback((id: string) => aplicar((e) => ({ ...e, favoritos: e.favoritos.includes(id) ? e.favoritos.filter((f) => f !== id) : [...e.favoritos, id] })), [aplicar]);

  return { propios: estado.propios, favoritos: estado.favoritos, listo, crear, renombrar, borrar, alternarFavorito };
};
