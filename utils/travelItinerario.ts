import {
  ActividadDemo, CategoriaDeGasto, DESTINOS, DiaDemo, ViajeDemo, destinoPorId,
} from '../constants/travelDemo';

/*
 * WEËTRAVEL — LA LÓGICA LOCAL DEL PROTOTIPO (DEMO).
 *
 * Aquí no hay inteligencia artificial: se arma un itinerario de EJEMPLO a partir de los datos de demostración, para
 * que la navegación, el editor y el replanificador se puedan tocar. Planear de verdad es cosa de Weë Brain, por la
 * conversación de siempre (CreatorFlow, experienceId 'travel'); ninguna pantalla finge que esto lo es.
 */

let contador = 0;
export const nuevoId = (prefijo: string): string => `${prefijo}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

const factor = (presupuestoDia: number): number => Math.max(0.5, presupuestoDia / 100);

/** Un día de ejemplo en un destino: mañana de visita, comida, tarde, descanso y cena. */
const diaDeEjemplo = (destinoId: string, n: number, escala: number): DiaDemo => {
  const dest = destinoPorId(destinoId) ?? DESTINOS[0];
  const k = factor(dest.presupuestoDia) * escala;
  const a: ActividadDemo[] = [
    { id: nuevoId('a'), tipo: 'visita', clave: dest.atracciones[n % 3], inicio: 9 * 60, duracion: 150, coste: Math.round(18 * k), distanciaKm: 0, foto: n % 3 === 0 ? dest.foto : null },
    { id: nuevoId('a'), tipo: 'traslado', clave: 'travel.actTransfer', inicio: 11 * 60 + 30, duracion: 25, coste: Math.round(3 * k), distanciaKm: 2.4 + (n % 2) },
    { id: nuevoId('a'), tipo: 'comida', clave: dest.comida[n % 2], inicio: 12 * 60 + 30, duracion: 75, coste: Math.round(16 * k), distanciaKm: 0.4 },
    { id: nuevoId('a'), tipo: 'visita', clave: dest.atracciones[(n + 1) % 3], inicio: 14 * 60 + 30, duracion: 120, coste: Math.round(12 * k), distanciaKm: 1.8 },
    { id: nuevoId('a'), tipo: 'descanso', clave: 'travel.actBreak', inicio: 17 * 60, duracion: 60, coste: 0, distanciaKm: 0.6 },
    { id: nuevoId('a'), tipo: 'comida', clave: dest.comida[(n + 1) % 2], inicio: 19 * 60 + 30, duracion: 90, coste: Math.round(24 * k), distanciaKm: 1.1 },
  ];
  return { id: nuevoId('d'), destino: dest.id, actividades: a };
};

/** Reparte los días entre los destinos elegidos, en orden. */
export const generarItinerario = (destinos: string[], dias: number, escala = 1): DiaDemo[] => {
  const lista = destinos.length ? destinos : [DESTINOS[0].id];
  return Array.from({ length: Math.max(1, dias) }, (_, i) => {
    const tramo = Math.min(lista.length - 1, Math.floor((i * lista.length) / Math.max(1, dias)));
    return diaDeEjemplo(lista[tramo], i, escala);
  });
};

export const costeDelDia = (dia: DiaDemo): number => dia.actividades.reduce((s, a) => s + a.coste, 0);
export const costeTotal = (itinerario: DiaDemo[]): number => itinerario.reduce((s, dia) => s + costeDelDia(dia), 0);
export const kmTotales = (itinerario: DiaDemo[]): number => Math.round(itinerario.reduce((s, dia) => s + dia.actividades.reduce((x, a) => x + a.distanciaKm, 0), 0) * 10) / 10;
export const minutosLibres = (dia: DiaDemo): number => {
  const ocupado = dia.actividades.reduce((s, a) => s + a.duracion, 0);
  return Math.max(0, 14 * 60 - ocupado);
};

/** Las actividades se leen siempre ordenadas por hora. */
export const ordenar = (dia: DiaDemo): DiaDemo => ({ ...dia, actividades: [...dia.actividades].sort((x, y) => x.inicio - y.inicio) });

/* ── Fechas ─────────────────────────────────────────────────────────────── */

export const isoDeHoyMas = (dias: number): string => {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};
export const fechaDeIso = (iso: string, masDias = 0): Date => {
  const [y, m, dd] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, (dd || 1) + masDias, 12);
};

export type EstadoDeViaje = 'proximo' | 'activo' | 'pasado' | 'borrador';

export const estadoDe = (v: ViajeDemo): EstadoDeViaje => {
  if (v.borrador || !v.inicio) return 'borrador';
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const inicio = fechaDeIso(v.inicio);
  const fin = fechaDeIso(v.inicio, v.dias - 1);
  if (hoy < inicio) return 'proximo';
  if (hoy > fin) return 'pasado';
  return 'activo';
};

export const diasHasta = (iso: string): number => {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  return Math.round((fechaDeIso(iso).getTime() - hoy.getTime()) / 86400000);
};

/* ── Los viajes de ejemplo con los que arranca el prototipo ─────────────── */

const repartoDe = (total: number): Record<CategoriaDeGasto, number> => ({
  alojamiento: Math.round(total * 0.38), comida: Math.round(total * 0.22), transporte: Math.round(total * 0.14),
  actividades: Math.round(total * 0.16), compras: Math.round(total * 0.06), otros: Math.round(total * 0.04),
});

const viaje = (id: string, destinos: string[], inicio: string, dias: number, resto: Partial<ViajeDemo>): ViajeDemo => {
  const itinerario = generarItinerario(destinos, dias);
  const presupuesto = resto.presupuesto ?? 1500;
  return {
    id, destinos, inicio, dias, flexible: !inicio, borrador: false, compartido: false,
    adultos: 2, ninos: 0, edades: [], presupuesto, moneda: 'USD', estilos: ['cultural'], preferencias: [], movilidad: ['caminar'], especiales: [],
    itinerario, versiones: [], gastos: [], reservas: [], documentos: [], participantes: [], propuestas: [], notas: '',
    reparto: repartoDe(presupuesto),
    ...resto,
  };
};

export const viajesDeEjemplo = (): ViajeDemo[] => [
  viaje('demo-peru', ['cusco'], isoDeHoyMas(24), 6, {
    presupuesto: 1800, estilos: ['aventura', 'cultural'],
    documentos: [{ id: 'doc-1', tipo: 'pasaporte', titulo: 'travel.docPassport', protegido: true, fecha: isoDeHoyMas(-200) }],
  }),
  viaje('demo-japon', ['kyoto'], isoDeHoyMas(-2), 5, {
    presupuesto: 420000, moneda: 'JPY', estilos: ['cultural', 'gastronomico'], compartido: true,
    gastos: [
      { id: 'g1', categoria: 'alojamiento', monto: 64000, moneda: 'JPY', fecha: isoDeHoyMas(-2), descripcion: 'Hanami Ryokan' },
      { id: 'g2', categoria: 'comida', monto: 5400, moneda: 'JPY', fecha: isoDeHoyMas(-1), descripcion: 'Ramen' },
      { id: 'g3', categoria: 'transporte', monto: 2300, moneda: 'JPY', fecha: isoDeHoyMas(-1), descripcion: 'Kyoto Bus' },
      { id: 'g4', categoria: 'actividades', monto: 1000, moneda: 'JPY', fecha: isoDeHoyMas(0), descripcion: 'Kinkaku-ji' },
    ],
    reservas: [
      { id: 'r1', tipo: 'hotel', proveedor: 'Hanami Ryokan', direccion: 'Higashiyama, Kyoto', fecha: isoDeHoyMas(-2), monto: 64000, moneda: 'JPY', confirmacion: 'HNM-48213', documentos: 1 },
      { id: 'r2', tipo: 'tren', proveedor: 'Kansai Rail', direccion: 'Kyoto Station', fecha: isoDeHoyMas(3), monto: 13900, moneda: 'JPY', confirmacion: 'KR-7731', documentos: 0 },
    ],
    documentos: [
      { id: 'doc-2', tipo: 'pasaporte', titulo: 'travel.docPassport', protegido: true, fecha: isoDeHoyMas(-200) },
      { id: 'doc-3', tipo: 'seguro', titulo: 'travel.docInsurance', protegido: false, fecha: isoDeHoyMas(-10) },
      { id: 'doc-4', tipo: 'confirmacion', titulo: 'travel.docConfirmation', protegido: false, fecha: isoDeHoyMas(-9) },
    ],
    participantes: [
      { id: 'p1', nombre: 'Kenji', permiso: 'editar' },
      { id: 'p2', nombre: 'Ana', permiso: 'sugerir' },
    ],
    propuestas: [
      { id: 'pr1', autor: 'Ana', clave: 'travel.placeTeahouse', dia: 2, estado: 'pendiente' },
      { id: 'pr2', autor: 'Kenji', clave: 'travel.placePontocho', dia: 3, estado: 'pendiente' },
    ],
  }),
  viaje('demo-grecia', ['santorini'], isoDeHoyMas(-120), 4, { presupuesto: 2200, estilos: ['romantico', 'relajado'], compartido: true }),
  viaje('demo-francia', ['paris'], '', 4, { presupuesto: 2600, borrador: true, estilos: ['gastronomico'] }),
];

/* ── Replanificar (DEMO): cambios deterministas que se pueden previsualizar ── */

export type PeticionDeReplan = 'relajar' | 'comida' | 'lluvia' | 'tarde';

/**
 * Aplica una petición a un día. Las actividades bloqueadas no se tocan NUNCA: ni se mueven, ni se cambian, ni se
 * quitan. Devuelve el día nuevo y qué actividades cambiaron, para enseñar la vista previa antes de aceptar.
 */
export const replanificar = (dia: DiaDemo, peticion: PeticionDeReplan): { dia: DiaDemo; cambiadas: string[] } => {
  const cambiadas: string[] = [];
  let actividades = dia.actividades.map((a) => ({ ...a }));
  if (peticion === 'relajar') {
    const quitable = actividades.filter((a) => !a.bloqueada && a.tipo === 'visita').pop();
    if (quitable) {
      actividades = actividades.map((a) => (a.id === quitable.id ? { ...a, tipo: 'descanso' as const, clave: 'travel.actFreeTime', coste: 0, foto: null } : a));
      cambiadas.push(quitable.id);
    }
  } else if (peticion === 'comida') {
    actividades = actividades.map((a) => {
      if (a.bloqueada || a.tipo !== 'descanso') return a;
      cambiadas.push(a.id);
      return { ...a, tipo: 'comida' as const, clave: 'travel.actFoodTour', coste: a.coste + 15 };
    });
  } else if (peticion === 'lluvia') {
    actividades = actividades.map((a) => {
      if (a.bloqueada || a.tipo !== 'visita') return a;
      cambiadas.push(a.id);
      return { ...a, clave: 'travel.actIndoor', foto: null };
    });
  } else {
    actividades = actividades.map((a) => {
      if (a.bloqueada) return a;
      cambiadas.push(a.id);
      return { ...a, inicio: a.inicio + 60 };
    });
  }
  return { dia: ordenar({ ...dia, actividades }), cambiadas };
};

/* ── Rutas (DEMO): distancia y tiempo sobre el mapa de ejemplo ──────────── */

export type ModoDeRuta = 'pie' | 'transporte' | 'coche' | 'bici';
const VELOCIDAD_KMH: Record<ModoDeRuta, number> = { pie: 4.5, transporte: 18, coche: 26, bici: 13 };
export const minutosDeRuta = (metros: number, modo: ModoDeRuta): number => Math.max(1, Math.round((metros / 1000 / VELOCIDAD_KMH[modo]) * 60));

/** Ordena las paradas por cercanía, empezando por el origen (vecino más próximo). */
export const optimizarParadas = <T extends { x: number; y: number }>(origen: { x: number; y: number }, paradas: T[]): T[] => {
  const quedan = [...paradas];
  const orden: T[] = [];
  let actual: { x: number; y: number } = origen;
  while (quedan.length) {
    let mejor = 0;
    quedan.forEach((p, i) => {
      if (Math.hypot(p.x - actual.x, p.y - actual.y) < Math.hypot(quedan[mejor].x - actual.x, quedan[mejor].y - actual.y)) mejor = i;
    });
    actual = quedan[mejor];
    orden.push(quedan.splice(mejor, 1)[0]);
  }
  return orden;
};
