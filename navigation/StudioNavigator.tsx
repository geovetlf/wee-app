import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { TemaStudio, useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import MarcoDeStudio from '../components/workspace/MarcoDeStudio';
import StudioScreen from '../screens/StudioScreen';
import InspiraScreen from '../screens/InspiraScreen';
import ProyectosScreen from '../screens/ProyectosScreen';
import StudioPerfilScreen from '../screens/StudioPerfilScreen';
import CrearVideoScreen from '../screens/CrearVideoScreen';
import ProductionScreen from '../screens/ProductionScreen';
import CreatorFlowScreen from '../screens/CreatorFlowScreen';
import ProjectScreen from '../screens/ProjectScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import MisCreacionesScreen from '../screens/MisCreacionesScreen';
import type { MainStackParamList } from './MainStackNavigator';
import type { ParamsDeCrearVideo } from '../hooks/useCaminosDeCreacion';
import type { EntradaDeStudio } from '../constants/studioExperiences';

/**
 * WEË STUDIO — EL WORKSPACE, CON SU PROPIA NAVEGACIÓN.
 *
 * Weë Studio es uno de los módulos de Weë AI (Brain, Studio, Design, Chef,
 * Music, Travel…) y el ÚNICO que tiene este workspace. En la web es un espacio
 * de trabajo profesional —cabecera, barra lateral con lo del Studio y el
 * trabajo—; en el teléfono, sus cuatro pestañas: Crear, Inspira, Proyectos y
 * Perfil. Weë —el Home, el muro, los Weëls, la navegación de siempre— no cambia
 * por esto, y su barra no entra aquí.
 *
 * Lo que ya existía no se copia: el inicio es la pantalla Weë Studio de siempre,
 * y CreatorFlow, Filmmaker, Mis creaciones y un proyecto son las mismas pantallas,
 * registradas aquí con el MISMO nombre: cuando una navega a `CreatorFlow` o a
 * `Production`, React Navigation resuelve en la pila más cercana y la persona
 * sigue dentro del Studio; lo que solo existe en Weë (publicar, tu perfil
 * social, otro módulo de Weë AI) sale a la pila principal. `TemaStudio` pinta el
 * workspace; fuera, el tema de siempre.
 */
export type StudioStackParamList = {
  /** `puerta`: la puerta del Studio que hay que abrir al llegar (Imágenes, Texto, Voz…). */
  StudioInicio: { puerta?: EntradaDeStudio } | undefined;
  /** `receta`: la idea que hay que enseñar abierta al llegar (desde el buscador). */
  StudioInspira: { receta?: string } | undefined;
  StudioProyectos: undefined;
  /* El Perfil del Studio: la cuenta, los Credits, los ajustes y la vuelta a Weë. */
  StudioPerfil: undefined;
  StudioVideo: ParamsDeCrearVideo | undefined;
  Production: MainStackParamList['Production'];
  CreatorFlow: MainStackParamList['CreatorFlow'];
  Project: MainStackParamList['Project'];
  Projects: undefined;
  MisCreaciones: undefined;
};

const Pila = createStackNavigator<StudioStackParamList>();

const PilaDeStudio: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <Pila.Navigator
      initialRouteName="StudioInicio"
      screenOptions={{
        headerShown: false,
        /* Lo que se lee en la pestaña del navegador: la marca, nunca el nombre interno de una ruta. */
        title: t('workspace.name'),
        cardStyle: { flex: 1, backgroundColor: theme.colors.background },
        /* Un workspace no se desliza: cambia lo de dentro y el marco se queda. */
        ...(Platform.OS === 'ios'
          ? null
          : { cardStyleInterpolator: ({ current }: { current: { progress: any } }) => ({ cardStyle: { opacity: current.progress } }) }),
      }}
    >
      <Pila.Screen name="StudioInicio" component={StudioScreen} />
      <Pila.Screen name="StudioInspira" component={InspiraScreen} />
      <Pila.Screen name="StudioProyectos" component={ProyectosScreen} />
      <Pila.Screen name="StudioPerfil" component={StudioPerfilScreen} />
      <Pila.Screen name="StudioVideo" component={CrearVideoScreen} />
      <Pila.Screen name="Production" component={ProductionScreen} />
      <Pila.Screen name="CreatorFlow" component={CreatorFlowScreen} />
      <Pila.Screen name="Project" component={ProjectScreen} />
      <Pila.Screen name="Projects" component={ProjectsScreen} />
      <Pila.Screen name="MisCreaciones" component={MisCreacionesScreen} />
    </Pila.Navigator>
  );
};

const StudioNavigator: React.FC = () => (
  <TemaStudio>
    <MarcoDeStudio>
      <PilaDeStudio />
    </MarcoDeStudio>
  </TemaStudio>
);

export default StudioNavigator;
