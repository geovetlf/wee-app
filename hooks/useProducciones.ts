import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EstadoDeProduccion, FalloDeProducciones, NuevaProduccion, ResumenDeProduccion, filmmakerService,
} from '../services/filmmakerService';

export type CargaDeLista = 'cargando' | 'lista' | 'error';

/**
 * TUS PRODUCCIONES (F1-C): las activas o las archivadas, las más recientes
 * primero, de verdad —la lista la da `productions`, no un catálogo de muestra—.
 * Página a página: `nextCursor` dice si hay más.
 */
export const useProducciones = (status: EstadoDeProduccion, activa = true) => {
  const [carga, setCarga] = useState<CargaDeLista>('cargando');
  const [producciones, setProducciones] = useState<readonly ResumenDeProduccion[]>([]);
  const [fallo, setFallo] = useState<FalloDeProducciones | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  /* Una petición vieja no pisa a una nueva: se contesta solo a la última. */
  const ultima = useRef(0);

  const recargar = useCallback(async () => {
    const yo = ++ultima.current;
    setCarga('cargando');
    setFallo(null);
    const r = await filmmakerService.listProductions({ status });
    if (yo !== ultima.current) return;
    if (r.ok) {
      setProducciones(r.valor.producciones);
      setCursor(r.valor.nextCursor);
      setCarga('lista');
    } else {
      setFallo(r.fallo);
      setCarga('error');
    }
  }, [status]);

  const cargarMas = useCallback(async () => {
    if (!cursor) return;
    const yo = ++ultima.current;
    const r = await filmmakerService.listProductions({ status, after: cursor });
    if (yo !== ultima.current) return;
    if (r.ok) {
      setProducciones((antes) => [...antes, ...r.valor.producciones.filter((p) => !antes.some((x) => x.productionId === p.productionId))]);
      setCursor(r.valor.nextCursor);
    } else {
      setFallo(r.fallo);
    }
  }, [cursor, status]);

  useEffect(() => {
    if (activa) void recargar();
  }, [activa, recargar]);

  /** Quitar de la lista lo que acaba de cambiar de estado, sin volver a pedirla entera. */
  const quitar = useCallback((productionId: string) => {
    setProducciones((antes) => antes.filter((p) => p.productionId !== productionId));
  }, []);

  return { carga, producciones, fallo, hayMas: !!cursor, recargar, cargarMas, quitar };
};

/**
 * CREAR UNA PRODUCCIÓN desde lo que la persona escribió en Weë Studio. El id lo
 * pone quien llama, una vez: repetir con el mismo id y lo mismo dentro devuelve
 * la que ya había, así que un doble toque no crea dos.
 */
export const crearProduccion = (p: NuevaProduccion) => filmmakerService.createProduction(p);

/** El id de una producción nueva: se decide una vez, antes de crearla, para que repetir no cree dos. */
export { nuevoIdDeProduccion } from '../services/filmmakerService';
