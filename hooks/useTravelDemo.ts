import { useMemo, useSyncExternalStore } from 'react';
import { travelDemoStore, EstadoTravelDemo } from '../services/travelDemoStore';
import type { DiaDemo, ViajeDemo } from '../constants/travelDemo';
import { nuevoId } from '../utils/travelItinerario';

/*
 * WEËTRAVEL — LO QUE LAS PANTALLAS PUEDEN HACER CON LOS DATOS DEMO.
 * Todo es local (services/travelDemoStore.ts): ninguna acción escribe en Firestore ni llama a la red.
 */
export const useTravelDemo = () => {
  const estado = useSyncExternalStore(travelDemoStore.suscribir, travelDemoStore.leer, travelDemoStore.leer);
  const acciones = useMemo(() => {
    const cambiar = travelDemoStore.cambiar;
    const conViaje = (id: string, receta: (v: ViajeDemo) => ViajeDemo) =>
      cambiar((e) => ({ ...e, viajes: e.viajes.map((v) => (v.id === id ? receta(v) : v)) }));
    const alternar = (lista: keyof Pick<EstadoTravelDemo, 'favoritos' | 'lugaresGuardados' | 'guardadosDeComunidad'>, id: string) =>
      cambiar((e) => ({ ...e, [lista]: e[lista].includes(id) ? e[lista].filter((x) => x !== id) : [...e[lista], id] }));
    return {
      alternarFavorito: (id: string) => alternar('favoritos', id),
      alternarLugar: (id: string) => alternar('lugaresGuardados', id),
      alternarGuardadoDeComunidad: (id: string) => alternar('guardadosDeComunidad', id),
      crearViaje: (v: ViajeDemo) => cambiar((e) => ({ ...e, viajes: [v, ...e.viajes] })),
      cambiarViaje: conViaje,
      borrarViaje: (id: string) => cambiar((e) => ({ ...e, viajes: e.viajes.filter((v) => v.id !== id), viajeActivo: e.viajeActivo === id ? null : e.viajeActivo })),
      elegirViajeActivo: (id: string | null) => cambiar((e) => ({ ...e, viajeActivo: id })),
      cambiarItinerario: (id: string, itinerario: DiaDemo[]) => conViaje(id, (v) => ({ ...v, itinerario })),
      guardarVersion: (id: string) => conViaje(id, (v) => ({ ...v, versiones: [{ id: nuevoId('ver'), creada: Date.now(), itinerario: v.itinerario }, ...v.versiones].slice(0, 6) })),
      escribirEnDiario: (viaje: string, fecha: string, texto: string) =>
        cambiar((e) => ({ ...e, diario: [{ id: nuevoId('j'), viaje, fecha, texto }, ...e.diario] })),
      borrarDelDiario: (id: string) => cambiar((e) => ({ ...e, diario: e.diario.filter((x) => x.id !== id) })),
      restablecer: travelDemoStore.restablecer,
    };
  }, []);
  const viajePorId = (id: string | undefined) => estado.viajes.find((v) => v.id === id);
  const viajeActivo = viajePorId(estado.viajeActivo ?? undefined) ?? null;
  return { ...estado, ...acciones, viajePorId, viajeActivoDatos: viajeActivo };
};
