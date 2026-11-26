/*
 * WEËTRAVEL — LOS DATOS DE DEMOSTRACIÓN (prototipo navegable, 2026-11-06).
 *
 * TODO lo de este archivo es DEMO: destinos, lugares, viajes, reservas, documentos, gastos, teléfonos y
 * conversaciones son de ejemplo, y cada pantalla que los enseña lo dice con la etiqueta DEMO. Nada de esto se lee de
 * Firestore ni de una API, y nada sale del teléfono: los cambios de la persona viven en su aparato
 * (services/travelDemoStore.ts).
 *
 * Como todo catálogo de `constants/` (CLAUDE.md §8), aquí se guardan CLAVES y no frases: se importa fuera de React,
 * donde no hay traductor. Quien pinta resuelve con `t()`. Los identificadores, iconos, números, códigos de país y
 * coordenadas se copian tal cual. Los nombres de los países salen de `Intl.DisplayNames` (i18n/formato.ts). Los
 * nombres propios de personas y proveedores de ejemplo son contenido, no interfaz, y no se traducen.
 */

export type FotoDeTravel = 'peru' | 'grecia' | 'japon' | 'francia' | 'mascota';
export type ModuloDeTravel = 'descubrir' | 'planear' | 'viajes' | 'explorar' | 'asistente' | 'comunidad';
export type Categoria =
  | 'playas' | 'naturaleza' | 'ciudades' | 'gastronomia' | 'aventura'
  | 'cultura' | 'historia' | 'nocturna' | 'arquitectura' | 'fauna';
export type Etiqueta = 'recomendado' | 'popular' | 'joya' | 'economico';
export type Clima = 'calido' | 'templado' | 'frio';
export type Distancia = 'cerca' | 'media' | 'lejos';

/* ── Los seis módulos del Workspace ─────────────────────────────────────── */

export interface ModuloDemo {
  id: ModuloDeTravel;
  icono: string;
  titulo: string;
  descripcion: string;
  foto: FotoDeTravel | null;
}

export const MODULOS: ModuloDemo[] = [
  { id: 'descubrir', icono: 'compass-outline', titulo: 'travel.modDiscover', descripcion: 'travel.modDiscoverSub', foto: 'peru' },
  { id: 'planear', icono: 'trail-sign-outline', titulo: 'travel.modPlan', descripcion: 'travel.modPlanSub', foto: 'grecia' },
  { id: 'viajes', icono: 'briefcase-outline', titulo: 'travel.modTrips', descripcion: 'travel.modTripsSub', foto: 'japon' },
  { id: 'explorar', icono: 'map-outline', titulo: 'travel.modExplore', descripcion: 'travel.modExploreSub', foto: 'francia' },
  { id: 'asistente', icono: 'chatbubble-ellipses-outline', titulo: 'travel.modAssistant', descripcion: 'travel.modAssistantSub', foto: 'mascota' },
  /* Sin foto propia todavía: tratamiento lila con icono (pendiente de foto definitiva). */
  { id: 'comunidad', icono: 'people-outline', titulo: 'travel.modCommunity', descripcion: 'travel.modCommunitySub', foto: null },
];

/* ── Las diez categorías de «Popular entre viajeros» ────────────────────── */

export const CATEGORIAS: { id: Categoria; icono: string; titulo: string }[] = [
  { id: 'playas', icono: 'umbrella-outline', titulo: 'travel.catBeaches' },
  { id: 'naturaleza', icono: 'leaf-outline', titulo: 'travel.catNature' },
  { id: 'ciudades', icono: 'business-outline', titulo: 'travel.catCities' },
  { id: 'gastronomia', icono: 'restaurant-outline', titulo: 'travel.catFood' },
  { id: 'aventura', icono: 'flag-outline', titulo: 'travel.catAdventure' },
  { id: 'cultura', icono: 'library-outline', titulo: 'travel.catCulture' },
  { id: 'historia', icono: 'hourglass-outline', titulo: 'travel.catHistory' },
  { id: 'nocturna', icono: 'moon-outline', titulo: 'travel.catNightlife' },
  { id: 'arquitectura', icono: 'cube-outline', titulo: 'travel.catArchitecture' },
  { id: 'fauna', icono: 'paw-outline', titulo: 'travel.catWildlife' },
];

export const ETIQUETAS: Record<Etiqueta, string> = {
  recomendado: 'travel.tagRecommended',
  popular: 'travel.tagPopular',
  joya: 'travel.tagHiddenGem',
  economico: 'travel.tagBudget',
};

/* ── Destinos ───────────────────────────────────────────────────────────── */

export interface DestinoDemo {
  id: string;
  pais: string;
  nombre: string;
  descripcion: string;
  foto: FotoDeTravel | null;
  icono: string;
  categorias: Categoria[];
  etiquetas: Etiqueta[];
  /** Presupuesto orientativo por persona y día, en dólares (DEMO). */
  presupuestoDia: number;
  temperatura: number;
  clima: Clima;
  mejoresMeses: number[];
  /** 1 a 5 (DEMO, no es un dato oficial). */
  seguridad: number;
  duracion: number;
  distancia: Distancia;
  atracciones: [string, string, string];
  comida: [string, string];
  transporte: string;
}

const d = (id: string, pais: string, foto: FotoDeTravel | null, icono: string, resto: Omit<DestinoDemo, 'id' | 'pais' | 'foto' | 'icono' | 'nombre' | 'descripcion' | 'atracciones' | 'comida' | 'transporte'>): DestinoDemo => ({
  id, pais, foto, icono,
  nombre: `travel.${id}Name`,
  descripcion: `travel.${id}Desc`,
  atracciones: [`travel.${id}A1`, `travel.${id}A2`, `travel.${id}A3`],
  comida: [`travel.${id}F1`, `travel.${id}F2`],
  transporte: `travel.${id}Transport`,
  ...resto,
});

export const DESTINOS: DestinoDemo[] = [
  d('cusco', 'PE', 'peru', 'trail-sign-outline', { categorias: ['naturaleza', 'aventura', 'cultura', 'historia', 'gastronomia'], etiquetas: ['recomendado', 'popular'], presupuestoDia: 70, temperatura: 14, clima: 'templado', mejoresMeses: [5, 6, 7, 8, 9], seguridad: 4, duracion: 6, distancia: 'media' }),
  d('santorini', 'GR', 'grecia', 'sunny-outline', { categorias: ['playas', 'arquitectura', 'gastronomia', 'nocturna'], etiquetas: ['popular'], presupuestoDia: 160, temperatura: 24, clima: 'calido', mejoresMeses: [5, 6, 9], seguridad: 5, duracion: 4, distancia: 'lejos' }),
  d('kyoto', 'JP', 'japon', 'flower-outline', { categorias: ['cultura', 'historia', 'gastronomia', 'arquitectura', 'naturaleza'], etiquetas: ['recomendado'], presupuestoDia: 120, temperatura: 16, clima: 'templado', mejoresMeses: [3, 4, 10, 11], seguridad: 5, duracion: 5, distancia: 'lejos' }),
  d('paris', 'FR', 'francia', 'business-outline', { categorias: ['ciudades', 'gastronomia', 'arquitectura', 'cultura', 'historia', 'nocturna'], etiquetas: ['popular'], presupuestoDia: 180, temperatura: 13, clima: 'templado', mejoresMeses: [4, 5, 6, 9], seguridad: 4, duracion: 4, distancia: 'lejos' }),
  d('oaxaca', 'MX', null, 'restaurant-outline', { categorias: ['gastronomia', 'cultura', 'historia'], etiquetas: ['joya', 'economico'], presupuestoDia: 55, temperatura: 21, clima: 'calido', mejoresMeses: [10, 11, 12, 1, 2, 3], seguridad: 4, duracion: 5, distancia: 'cerca' }),
  d('lisboa', 'PT', null, 'boat-outline', { categorias: ['ciudades', 'gastronomia', 'historia', 'nocturna'], etiquetas: ['recomendado', 'economico'], presupuestoDia: 90, temperatura: 18, clima: 'templado', mejoresMeses: [4, 5, 6, 9, 10], seguridad: 5, duracion: 4, distancia: 'media' }),
  d('islandia', 'IS', null, 'snow-outline', { categorias: ['naturaleza', 'aventura', 'fauna'], etiquetas: ['joya'], presupuestoDia: 200, temperatura: 6, clima: 'frio', mejoresMeses: [6, 7, 8], seguridad: 5, duracion: 7, distancia: 'lejos' }),
  d('marrakech', 'MA', null, 'color-palette-outline', { categorias: ['cultura', 'gastronomia', 'arquitectura', 'historia'], etiquetas: ['economico', 'joya'], presupuestoDia: 50, temperatura: 22, clima: 'calido', mejoresMeses: [3, 4, 10, 11], seguridad: 3, duracion: 4, distancia: 'media' }),
  d('bali', 'ID', null, 'water-outline', { categorias: ['playas', 'naturaleza', 'cultura', 'fauna'], etiquetas: ['economico'], presupuestoDia: 45, temperatura: 28, clima: 'calido', mejoresMeses: [5, 6, 7, 8, 9], seguridad: 4, duracion: 7, distancia: 'lejos' }),
  d('costaRica', 'CR', null, 'paw-outline', { categorias: ['fauna', 'naturaleza', 'aventura', 'playas'], etiquetas: ['recomendado'], presupuestoDia: 85, temperatura: 26, clima: 'calido', mejoresMeses: [12, 1, 2, 3, 4], seguridad: 4, duracion: 7, distancia: 'cerca' }),
];

export const destinoPorId = (id: string | undefined): DestinoDemo | undefined => DESTINOS.find((x) => x.id === id);

export const COLECCIONES: { id: string; titulo: string; descripcion: string; destinos: string[]; foto: FotoDeTravel | null; icono: string }[] = [
  { id: 'sabores', titulo: 'travel.colFood', descripcion: 'travel.colFoodSub', destinos: ['oaxaca', 'lisboa', 'kyoto', 'paris'], foto: 'japon', icono: 'restaurant-outline' },
  { id: 'calma', titulo: 'travel.colSlow', descripcion: 'travel.colSlowSub', destinos: ['santorini', 'lisboa', 'bali'], foto: 'grecia', icono: 'cafe-outline' },
  { id: 'salvaje', titulo: 'travel.colWild', descripcion: 'travel.colWildSub', destinos: ['islandia', 'costaRica', 'cusco'], foto: 'peru', icono: 'leaf-outline' },
  { id: 'primero', titulo: 'travel.colFirst', descripcion: 'travel.colFirstSub', destinos: ['paris', 'kyoto', 'lisboa'], foto: 'francia', icono: 'sparkles-outline' },
];

/* ── Explorar: el mapa DEMO (Kioto) ─────────────────────────────────────── */

export type CategoriaDeLugar =
  | 'atracciones' | 'restaurantes' | 'museos' | 'naturaleza' | 'parques' | 'playas'
  | 'compras' | 'nocturna' | 'transporte' | 'salud' | 'servicios';

export const CATEGORIAS_DE_LUGAR: { id: CategoriaDeLugar; icono: string; titulo: string; descripcion: string }[] = [
  { id: 'atracciones', icono: 'star-outline', titulo: 'travel.pcAttractions', descripcion: 'travel.pcAttractionsDesc' },
  { id: 'restaurantes', icono: 'restaurant-outline', titulo: 'travel.pcRestaurants', descripcion: 'travel.pcRestaurantsDesc' },
  { id: 'museos', icono: 'library-outline', titulo: 'travel.pcMuseums', descripcion: 'travel.pcMuseumsDesc' },
  { id: 'naturaleza', icono: 'leaf-outline', titulo: 'travel.pcNature', descripcion: 'travel.pcNatureDesc' },
  { id: 'parques', icono: 'flower-outline', titulo: 'travel.pcParks', descripcion: 'travel.pcParksDesc' },
  { id: 'playas', icono: 'umbrella-outline', titulo: 'travel.pcBeaches', descripcion: 'travel.pcBeachesDesc' },
  { id: 'compras', icono: 'bag-handle-outline', titulo: 'travel.pcShopping', descripcion: 'travel.pcShoppingDesc' },
  { id: 'nocturna', icono: 'moon-outline', titulo: 'travel.pcNightlife', descripcion: 'travel.pcNightlifeDesc' },
  { id: 'transporte', icono: 'bus-outline', titulo: 'travel.pcTransport', descripcion: 'travel.pcTransportDesc' },
  { id: 'salud', icono: 'medkit-outline', titulo: 'travel.pcHealth', descripcion: 'travel.pcHealthDesc' },
  { id: 'servicios', icono: 'information-circle-outline', titulo: 'travel.pcServices', descripcion: 'travel.pcServicesDesc' },
];

export interface LugarDemo {
  id: string;
  nombre: string;
  categoria: CategoriaDeLugar;
  /** Posición en el mapa DEMO, de 0 a 100. */
  x: number;
  y: number;
  valoracion: number;
  abierto: boolean;
  precio: 0 | 1 | 2 | 3;
  foto: FotoDeTravel | null;
  minutos: number;
}

export const LUGARES: LugarDemo[] = [
  { id: 'kinkaku', nombre: 'travel.kyotoA1', categoria: 'atracciones', x: 22, y: 18, valoracion: 4.8, abierto: true, precio: 1, foto: 'japon', minutos: 60 },
  { id: 'fushimi', nombre: 'travel.kyotoA2', categoria: 'atracciones', x: 70, y: 82, valoracion: 4.9, abierto: true, precio: 0, foto: null, minutos: 120 },
  { id: 'arashiyama', nombre: 'travel.kyotoA3', categoria: 'naturaleza', x: 8, y: 48, valoracion: 4.7, abierto: true, precio: 0, foto: null, minutos: 90 },
  { id: 'gion', nombre: 'travel.placeGion', categoria: 'atracciones', x: 64, y: 50, valoracion: 4.6, abierto: true, precio: 0, foto: null, minutos: 75 },
  { id: 'nishiki', nombre: 'travel.placeNishiki', categoria: 'compras', x: 52, y: 46, valoracion: 4.5, abierto: true, precio: 1, foto: null, minutos: 60 },
  { id: 'museo', nombre: 'travel.placeMuseum', categoria: 'museos', x: 66, y: 64, valoracion: 4.4, abierto: false, precio: 1, foto: null, minutos: 90 },
  { id: 'maruyama', nombre: 'travel.placeMaruyama', categoria: 'parques', x: 74, y: 44, valoracion: 4.5, abierto: true, precio: 0, foto: null, minutos: 45 },
  { id: 'kamo', nombre: 'travel.placeKamo', categoria: 'naturaleza', x: 58, y: 30, valoracion: 4.6, abierto: true, precio: 0, foto: null, minutos: 40 },
  { id: 'ramen', nombre: 'travel.placeRamen', categoria: 'restaurantes', x: 46, y: 58, valoracion: 4.6, abierto: true, precio: 1, foto: null, minutos: 45 },
  { id: 'teahouse', nombre: 'travel.placeTeahouse', categoria: 'restaurantes', x: 68, y: 40, valoracion: 4.7, abierto: true, precio: 2, foto: null, minutos: 50 },
  { id: 'kaiseki', nombre: 'travel.kyotoF1', categoria: 'restaurantes', x: 60, y: 54, valoracion: 4.8, abierto: false, precio: 3, foto: null, minutos: 90 },
  { id: 'pontocho', nombre: 'travel.placePontocho', categoria: 'nocturna', x: 57, y: 50, valoracion: 4.5, abierto: true, precio: 2, foto: null, minutos: 90 },
  { id: 'estacion', nombre: 'travel.placeStation', categoria: 'transporte', x: 50, y: 74, valoracion: 4.3, abierto: true, precio: 0, foto: null, minutos: 15 },
  { id: 'clinica', nombre: 'travel.placeClinic', categoria: 'salud', x: 40, y: 40, valoracion: 4.2, abierto: true, precio: 0, foto: null, minutos: 20 },
  { id: 'farmacia', nombre: 'travel.placePharmacy', categoria: 'salud', x: 48, y: 52, valoracion: 4.1, abierto: true, precio: 0, foto: null, minutos: 10 },
  { id: 'info', nombre: 'travel.placeInfo', categoria: 'servicios', x: 52, y: 70, valoracion: 4.4, abierto: true, precio: 0, foto: null, minutos: 15 },
  { id: 'artesania', nombre: 'travel.placeCrafts', categoria: 'compras', x: 62, y: 46, valoracion: 4.3, abierto: true, precio: 2, foto: null, minutos: 40 },
];

/** Donde está la persona en el mapa DEMO. Cien unidades del mapa son seis kilómetros. */
export const POSICION_DEMO = { x: 50, y: 56 };
export const METROS_POR_UNIDAD = 60;
export const lugarPorId = (id: string | undefined): LugarDemo | undefined => LUGARES.find((x) => x.id === id);
export const metrosEntre = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.round(Math.hypot(a.x - b.x, a.y - b.y) * METROS_POR_UNIDAD);

/* ── Travel Safe (DEMO: ni los teléfonos ni los sitios son reales) ──────── */

export type TipoDeAyuda = 'emergencias' | 'hospital' | 'farmacia' | 'policia' | 'bomberos' | 'embajada' | 'consulado';

export const AYUDA: { id: string; tipo: TipoDeAyuda; icono: string; titulo: string; telefono: string; metros: number }[] = [
  { id: 'emergencias', tipo: 'emergencias', icono: 'alert-circle-outline', titulo: 'travel.safeEmergency', telefono: '000', metros: 0 },
  { id: 'policia', tipo: 'policia', icono: 'shield-outline', titulo: 'travel.safePolice', telefono: '000 1', metros: 650 },
  { id: 'bomberos', tipo: 'bomberos', icono: 'flame-outline', titulo: 'travel.safeFire', telefono: '000 2', metros: 1200 },
  { id: 'hospital', tipo: 'hospital', icono: 'medkit-outline', titulo: 'travel.safeHospital', telefono: '000 3', metros: 900 },
  { id: 'farmacia', tipo: 'farmacia', icono: 'bandage-outline', titulo: 'travel.safePharmacy', telefono: '000 4', metros: 300 },
  { id: 'embajada', tipo: 'embajada', icono: 'flag-outline', titulo: 'travel.safeEmbassy', telefono: '000 5', metros: 4800 },
  { id: 'consulado', tipo: 'consulado', icono: 'document-text-outline', titulo: 'travel.safeConsulate', telefono: '000 6', metros: 3100 },
];

export const CONSEJOS_DE_SEGURIDAD = ['travel.safeTip1', 'travel.safeTip2', 'travel.safeTip3', 'travel.safeTip4'];

/* ── Viajes de ejemplo ──────────────────────────────────────────────────── */

export type EstiloDeViaje =
  | 'relajado' | 'aventura' | 'cultural' | 'gastronomico' | 'lujo'
  | 'mochilero' | 'romantico' | 'familiar' | 'naturaleza' | 'fiesta';

export const ESTILOS: { id: EstiloDeViaje; icono: string; titulo: string }[] = [
  { id: 'relajado', icono: 'cafe-outline', titulo: 'travel.styleRelaxed' },
  { id: 'aventura', icono: 'flag-outline', titulo: 'travel.styleAdventure' },
  { id: 'cultural', icono: 'library-outline', titulo: 'travel.styleCultural' },
  { id: 'gastronomico', icono: 'restaurant-outline', titulo: 'travel.styleFoodie' },
  { id: 'lujo', icono: 'diamond-outline', titulo: 'travel.styleLuxury' },
  { id: 'mochilero', icono: 'walk-outline', titulo: 'travel.styleBackpacker' },
  { id: 'romantico', icono: 'heart-outline', titulo: 'travel.styleRomantic' },
  { id: 'familiar', icono: 'people-outline', titulo: 'travel.styleFamily' },
  { id: 'naturaleza', icono: 'leaf-outline', titulo: 'travel.styleNature' },
  { id: 'fiesta', icono: 'musical-notes-outline', titulo: 'travel.styleNightlife' },
];

export const PREFERENCIAS: { id: string; icono: string; titulo: string }[] = [
  { id: 'museos', icono: 'library-outline', titulo: 'travel.prefMuseums' },
  { id: 'miradores', icono: 'eye-outline', titulo: 'travel.prefViewpoints' },
  { id: 'mercados', icono: 'basket-outline', titulo: 'travel.prefMarkets' },
  { id: 'senderismo', icono: 'walk-outline', titulo: 'travel.prefHiking' },
  { id: 'fotografia', icono: 'camera-outline', titulo: 'travel.prefPhotography' },
  { id: 'compras', icono: 'bag-handle-outline', titulo: 'travel.prefShopping' },
];

export const MOVILIDAD: { id: string; icono: string; titulo: string }[] = [
  { id: 'caminar', icono: 'walk-outline', titulo: 'travel.mobWalk' },
  { id: 'transporte', icono: 'bus-outline', titulo: 'travel.mobTransit' },
  { id: 'coche', icono: 'car-outline', titulo: 'travel.mobCar' },
  { id: 'bici', icono: 'bicycle-outline', titulo: 'travel.mobBike' },
];

export const ESPECIALES: { id: string; icono: string; titulo: string }[] = [
  { id: 'accesible', icono: 'accessibility-outline', titulo: 'travel.specAccessible' },
  { id: 'ritmo', icono: 'time-outline', titulo: 'travel.specSlowPace' },
  { id: 'dieta', icono: 'nutrition-outline', titulo: 'travel.specDietary' },
  { id: 'mascota', icono: 'paw-outline', titulo: 'travel.specPet' },
];

export const NIVELES_DE_PRESUPUESTO: { id: 'bajo' | 'medio' | 'alto' | 'propio'; titulo: string; porDia: number }[] = [
  { id: 'bajo', titulo: 'travel.budgetLow', porDia: 60 },
  { id: 'medio', titulo: 'travel.budgetMid', porDia: 130 },
  { id: 'alto', titulo: 'travel.budgetHigh', porDia: 260 },
  { id: 'propio', titulo: 'travel.budgetCustom', porDia: 0 },
];

export const MONEDAS = ['USD', 'EUR', 'MXN', 'PEN', 'JPY', 'GBP', 'BRL', 'COP', 'ARS', 'CLP'];

export type TipoDeActividad = 'visita' | 'comida' | 'traslado' | 'descanso';

export interface ActividadDemo {
  id: string;
  tipo: TipoDeActividad;
  /** Clave del diccionario, para las actividades de ejemplo. */
  clave?: string;
  /** Lo que escribió la persona, para las suyas (contenido: no se traduce). */
  texto?: string;
  inicio: number;
  duracion: number;
  coste: number;
  distanciaKm: number;
  bloqueada?: boolean;
  nota?: string;
  foto?: FotoDeTravel | null;
}

export interface DiaDemo {
  id: string;
  destino: string;
  actividades: ActividadDemo[];
}

export type CategoriaDeGasto = 'alojamiento' | 'comida' | 'transporte' | 'actividades' | 'compras' | 'otros';

export const CATEGORIAS_DE_GASTO: { id: CategoriaDeGasto; icono: string; titulo: string }[] = [
  { id: 'alojamiento', icono: 'bed-outline', titulo: 'travel.expLodging' },
  { id: 'comida', icono: 'restaurant-outline', titulo: 'travel.expFood' },
  { id: 'transporte', icono: 'bus-outline', titulo: 'travel.expTransport' },
  { id: 'actividades', icono: 'ticket-outline', titulo: 'travel.expActivities' },
  { id: 'compras', icono: 'bag-handle-outline', titulo: 'travel.expShopping' },
  { id: 'otros', icono: 'ellipsis-horizontal-circle-outline', titulo: 'travel.expOther' },
];

export interface GastoDemo { id: string; categoria: CategoriaDeGasto; monto: number; moneda: string; fecha: string; descripcion: string }

export type TipoDeReserva = 'vuelo' | 'hotel' | 'tren' | 'bus' | 'restaurante' | 'actividad' | 'alquiler';

export const TIPOS_DE_RESERVA: { id: TipoDeReserva; icono: string; titulo: string }[] = [
  { id: 'vuelo', icono: 'airplane-outline', titulo: 'travel.bkFlight' },
  { id: 'hotel', icono: 'bed-outline', titulo: 'travel.bkHotel' },
  { id: 'tren', icono: 'train-outline', titulo: 'travel.bkTrain' },
  { id: 'bus', icono: 'bus-outline', titulo: 'travel.bkBus' },
  { id: 'restaurante', icono: 'restaurant-outline', titulo: 'travel.bkRestaurant' },
  { id: 'actividad', icono: 'ticket-outline', titulo: 'travel.bkActivity' },
  { id: 'alquiler', icono: 'car-outline', titulo: 'travel.bkRental' },
];

export interface ReservaDemo { id: string; tipo: TipoDeReserva; proveedor: string; direccion: string; fecha: string; monto: number; moneda: string; confirmacion: string; documentos: number }

export type TipoDeDocumento = 'pasaporte' | 'visado' | 'seguro' | 'embarque' | 'confirmacion' | 'entrada';

export const TIPOS_DE_DOCUMENTO: { id: TipoDeDocumento; icono: string; titulo: string }[] = [
  { id: 'pasaporte', icono: 'id-card-outline', titulo: 'travel.docPassport' },
  { id: 'visado', icono: 'document-text-outline', titulo: 'travel.docVisa' },
  { id: 'seguro', icono: 'shield-checkmark-outline', titulo: 'travel.docInsurance' },
  { id: 'embarque', icono: 'qr-code-outline', titulo: 'travel.docBoarding' },
  { id: 'confirmacion', icono: 'checkmark-done-outline', titulo: 'travel.docConfirmation' },
  { id: 'entrada', icono: 'ticket-outline', titulo: 'travel.docTicket' },
];

export interface DocumentoDemo { id: string; tipo: TipoDeDocumento; titulo: string; protegido: boolean; fecha: string }

export type Permiso = 'ver' | 'sugerir' | 'editar';
export const PERMISOS: Record<Permiso, string> = { ver: 'travel.permView', sugerir: 'travel.permSuggest', editar: 'travel.permEdit' };
export interface ParticipanteDemo { id: string; nombre: string; permiso: Permiso; pendiente?: boolean }
export interface PropuestaDemo { id: string; autor: string; clave: string; dia: number; estado: 'pendiente' | 'aprobada' | 'rechazada' }

export interface ViajeDemo {
  id: string;
  destinos: string[];
  /** AAAA-MM-DD; vacío si las fechas son flexibles. */
  inicio: string;
  dias: number;
  flexible: boolean;
  borrador: boolean;
  compartido: boolean;
  adultos: number;
  ninos: number;
  edades: number[];
  presupuesto: number;
  moneda: string;
  estilos: EstiloDeViaje[];
  preferencias: string[];
  movilidad: string[];
  especiales: string[];
  itinerario: DiaDemo[];
  versiones: { id: string; creada: number; itinerario: DiaDemo[] }[];
  gastos: GastoDemo[];
  reservas: ReservaDemo[];
  documentos: DocumentoDemo[];
  participantes: ParticipanteDemo[];
  propuestas: PropuestaDemo[];
  notas: string;
  reparto: Record<CategoriaDeGasto, number>;
}

/* ── El asistente: conversaciones y temas de ejemplo ────────────────────── */

export const CONVERSACIONES_DEMO = [
  { id: 'c1', titulo: 'travel.convFood', destino: 'kyoto', mensajes: ['travel.chatQ1', 'travel.chatA1', 'travel.chatQ2', 'travel.chatA2'] },
  { id: 'c2', titulo: 'travel.convRain', destino: 'kyoto', mensajes: ['travel.chatQ3', 'travel.chatA3'] },
  { id: 'c3', titulo: 'travel.convAltitude', destino: 'cusco', mensajes: ['travel.chatQ4', 'travel.chatA4'] },
];

export const SUGERENCIAS_DEL_ASISTENTE = ['travel.sugg1', 'travel.sugg2', 'travel.sugg3', 'travel.sugg4'];

export const TEMAS_DE_SABER: { id: string; icono: string; titulo: string; texto: string }[] = [
  { id: 'cultura', icono: 'people-outline', titulo: 'travel.knEtiquette', texto: 'travel.knEtiquetteText' },
  { id: 'propinas', icono: 'cash-outline', titulo: 'travel.knTipping', texto: 'travel.knTippingText' },
  { id: 'dinero', icono: 'card-outline', titulo: 'travel.knMoney', texto: 'travel.knMoneyText' },
  { id: 'conexion', icono: 'wifi-outline', titulo: 'travel.knConnectivity', texto: 'travel.knConnectivityText' },
  { id: 'transporte', icono: 'bus-outline', titulo: 'travel.knTransport', texto: 'travel.knTransportText' },
  { id: 'idioma', icono: 'language-outline', titulo: 'travel.knLanguage', texto: 'travel.knLanguageText' },
];

/** Los idiomas que ofrece el traductor (los nombres salen de Intl.DisplayNames). */
export const IDIOMAS_DEL_TRADUCTOR = ['es', 'en', 'ja', 'fr', 'pt', 'it', 'de', 'zh', 'ko', 'ar'];

export const RESULTADOS_DE_VISION = [
  { id: 'v1', icono: 'business-outline', titulo: 'travel.visionPlace', texto: 'travel.visionPlaceText' },
  { id: 'v2', icono: 'restaurant-outline', titulo: 'travel.visionDish', texto: 'travel.visionDishText' },
  { id: 'v3', icono: 'text-outline', titulo: 'travel.visionSign', texto: 'travel.visionSignText' },
];

/* ── Comunidad ──────────────────────────────────────────────────────────── */

export const ITINERARIOS_COMPARTIDOS = [
  { id: 's1', autor: 'Lucía', destino: 'cusco', dias: 5, guardados: 1240 },
  { id: 's2', autor: 'Kenji', destino: 'kyoto', dias: 4, guardados: 980 },
  { id: 's3', autor: 'Amélie', destino: 'paris', dias: 3, guardados: 1530 },
  { id: 's4', autor: 'Rafa', destino: 'oaxaca', dias: 4, guardados: 610 },
];
