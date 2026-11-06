import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ViajeDemo } from '../constants/travelDemo';
import { viajesDeEjemplo } from '../utils/travelItinerario';

/*
 * WEËTRAVEL — EL ALMACÉN LOCAL DEL PROTOTIPO (DEMO).
 *
 * Favoritos, viajes creados o editados, gastos, reservas apuntadas, documentos de ejemplo, diario y viaje activo
 * viven SOLO en este aparato (AsyncStorage). No hay Firestore, ni Storage, ni red: es un prototipo navegable y nada
 * de lo que se toca aquí sale del teléfono. Cuando WeëTravel tenga backend, este archivo es lo que se sustituye; las
 * pantallas solo hablan con `useTravelDemo`.
 */

export interface EntradaDeDiario { id: string; viaje: string; fecha: string; texto: string }

export interface EstadoTravelDemo {
  favoritos: string[];
  lugaresGuardados: string[];
  viajes: ViajeDemo[];
  viajeActivo: string | null;
  diario: EntradaDeDiario[];
  guardadosDeComunidad: string[];
}

const CLAVE = 'wee.travel.demo.v1';

const inicial = (): EstadoTravelDemo => ({
  favoritos: ['kyoto'],
  lugaresGuardados: [],
  viajes: viajesDeEjemplo(),
  viajeActivo: 'demo-japon',
  diario: [],
  guardadosDeComunidad: [],
});

let estado: EstadoTravelDemo = inicial();
let cargado = false;
const oyentes = new Set<() => void>();

const avisar = () => oyentes.forEach((o) => o());

const guardar = () => {
  AsyncStorage.setItem(CLAVE, JSON.stringify(estado)).catch((e) => console.warn('WeëTravel demo: no se pudo guardar', e));
};

const cargar = () => {
  if (cargado) return;
  cargado = true;
  AsyncStorage.getItem(CLAVE)
    .then((texto) => {
      if (!texto) return;
      const leido = JSON.parse(texto) as Partial<EstadoTravelDemo>;
      if (!Array.isArray(leido.viajes)) return;
      estado = { ...inicial(), ...leido } as EstadoTravelDemo;
      avisar();
    })
    .catch((e) => console.warn('WeëTravel demo: no se pudo leer', e));
};

export const travelDemoStore = {
  suscribir(oyente: () => void) {
    cargar();
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  },
  leer: (): EstadoTravelDemo => estado,
  cambiar(receta: (antes: EstadoTravelDemo) => EstadoTravelDemo) {
    estado = receta(estado);
    avisar();
    guardar();
  },
  /** Vuelve a los datos de ejemplo (botón «Restablecer demo»). */
  restablecer() {
    estado = inicial();
    avisar();
    guardar();
  },
};
