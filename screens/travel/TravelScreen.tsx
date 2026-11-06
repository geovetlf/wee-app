import React from 'react';
import { useRoute } from '@react-navigation/native';
import { enTemaClaro } from '../../contexts/ThemeContext';
import { PantallaDeTravel, esPantallaDeTravel } from './rutas';
import { BuscarScreen, ColeccionScreen, DescubrirScreen } from './Descubrir';
import { CompararScreen, DestinoScreen, SorpresaScreen } from './Destino';
import { CrearViajeScreen, GenerarScreen, PlanearScreen } from './Planear';
import { EditorScreen, ItinerarioScreen, ReplanearScreen } from './Itinerario';
import { PresupuestoScreen, VersionesScreen } from './Presupuesto';
import { CalendarioScreen, ViajeScreen, ViajesScreen } from './Viajes';
import { CompartirScreen, DocumentosScreen, GastosScreen, ReservasScreen } from './Organizar';
import { CercaScreen, ExplorarScreen, LugarScreen, RutaScreen } from './Explorar';
import { EmergenciaScreen, SeguridadScreen } from './Seguridad';
import { AsistenteScreen, ChatScreen, ContextoScreen, LocalScreen, SaberScreen } from './Asistente';
import { TraductorScreen, VisionScreen, VozScreen } from './Herramientas';
import { CompartidoScreen, ComunidadScreen, RecuerdosScreen } from './Comunidad';

/*
 * WEËTRAVEL — EL WORKSPACE (prototipo navegable con datos DEMO, 2026-11-06).
 *
 * Una sola ruta de la pila principal (`Travel`, dirección /travel/<pantalla>/<id>) que entrega cada pantalla de los
 * seis módulos: Descubrir, Planear, Mis viajes, Explorar, Asistente de viaje y Comunidad y recuerdos. La portada sigue
 * siendo la de siempre (`Specialist` con id 'travel'); dentro de Weë Creator (`pro`) Travel no cambia.
 */
const PANTALLAS: Record<PantallaDeTravel, React.FC<{ id?: string }>> = {
  descubrir: DescubrirScreen, buscar: BuscarScreen, destino: DestinoScreen, sorpresa: SorpresaScreen, comparar: CompararScreen, coleccion: ColeccionScreen,
  planear: PlanearScreen, crear: CrearViajeScreen, generar: GenerarScreen, itinerario: ItinerarioScreen, editor: EditorScreen, replanear: ReplanearScreen,
  presupuesto: PresupuestoScreen, versiones: VersionesScreen,
  viajes: ViajesScreen, viaje: ViajeScreen, calendario: CalendarioScreen, reservas: ReservasScreen, documentos: DocumentosScreen, gastos: GastosScreen, compartir: CompartirScreen,
  explorar: ExplorarScreen, cerca: CercaScreen, lugar: LugarScreen, ruta: RutaScreen, seguridad: SeguridadScreen, emergencia: EmergenciaScreen,
  asistente: AsistenteScreen, chat: ChatScreen, voz: VozScreen, vision: VisionScreen, traductor: TraductorScreen, local: LocalScreen, saber: SaberScreen, contexto: ContextoScreen,
  comunidad: ComunidadScreen, compartido: CompartidoScreen, recuerdos: RecuerdosScreen,
};

const TravelScreen: React.FC = () => {
  const route = useRoute<any>();
  const pantalla: PantallaDeTravel = esPantallaDeTravel(route.params?.pantalla) ? route.params.pantalla : 'descubrir';
  const id = typeof route.params?.id === 'string' ? route.params.id : undefined;
  const Pantalla = PANTALLAS[pantalla];
  return <Pantalla id={id} />;
};

export default enTemaClaro(TravelScreen);
