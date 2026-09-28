import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { TemaCreator, useTheme } from '../contexts/ThemeContext';
import ChromeDeCreator from '../components/workspace/ChromeDeCreator';
import CreatorInicioScreen from '../screens/CreatorInicioScreen';
import InspiraScreen from '../screens/InspiraScreen';
import ProyectosScreen from '../screens/ProyectosScreen';
import CrearVideoScreen from '../screens/CrearVideoScreen';
import ProductionScreen from '../screens/ProductionScreen';
import SpecialistScreen from '../screens/SpecialistScreen';
import CreatorFlowScreen from '../screens/CreatorFlowScreen';
import ProjectScreen from '../screens/ProjectScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import MisCreacionesScreen from '../screens/MisCreacionesScreen';
import type { MainStackParamList } from './MainStackNavigator';
import type { ParamsDeCrearVideo } from '../hooks/useCaminosDeCreacion';

/**
 * WEË CREATOR — EL TALLER PROFESIONAL, CON SU PROPIA NAVEGACIÓN.
 *
 * Weë (la App, en web y en el teléfono) y Weë Creator son dos experiencias de
 * interfaz distintas y no se mezclan (decisión del usuario, 2026-09-27): aquí no
 * hay barra de abajo, ni muro, ni Weëls; hay una cabecera, una barra lateral y el
 * trabajo. Por eso Weë Creator es una pila PROPIA, dentro de la principal.
 *
 * Lo que ya existía no se copia: las pantallas de Weë AI —un especialista,
 * CreatorFlow, Filmmaker, Mis creaciones, un proyecto— son las mismas, y se
 * registran aquí con el MISMO nombre. Así, cuando una de ellas navega a
 * `CreatorFlow` o a `Production`, React Navigation resuelve en la pila más
 * cercana y la persona sigue dentro del taller; y cuando va a algo que solo
 * existe en Weë (publicar, su perfil), sale a la pila principal. Quién pinta el
 * marco lo decide `TemaCreator`: dentro, el de Weë Creator; fuera, el de siempre.
 */
export type CreatorStackParamList = {
  CreatorInicio: undefined;
  /** `receta`: la idea que hay que enseñar abierta al llegar (desde el buscador). */
  CreatorInspira: { receta?: string } | undefined;
  CreatorProyectos: undefined;
  CreatorVideo: ParamsDeCrearVideo | undefined;
  Production: MainStackParamList['Production'];
  Specialist: MainStackParamList['Specialist'];
  CreatorFlow: MainStackParamList['CreatorFlow'];
  Project: MainStackParamList['Project'];
  Projects: undefined;
  MisCreaciones: undefined;
};

const Pila = createStackNavigator<CreatorStackParamList>();

const PilaDeCreator: React.FC = () => {
  const { theme } = useTheme();
  return (
    <Pila.Navigator
      initialRouteName="CreatorInicio"
      screenOptions={{
        headerShown: false,
        cardStyle: { flex: 1, backgroundColor: theme.colors.background },
        /* Un taller no se desliza: cambia lo de dentro y el marco se queda. */
        ...(Platform.OS === 'ios'
          ? null
          : { cardStyleInterpolator: ({ current }: { current: { progress: any } }) => ({ cardStyle: { opacity: current.progress } }) }),
      }}
    >
      <Pila.Screen name="CreatorInicio" component={CreatorInicioScreen} />
      <Pila.Screen name="CreatorInspira" component={InspiraScreen} />
      <Pila.Screen name="CreatorProyectos" component={ProyectosScreen} />
      <Pila.Screen name="CreatorVideo" component={CrearVideoScreen} />
      <Pila.Screen name="Production" component={ProductionScreen} />
      <Pila.Screen name="Specialist" component={SpecialistScreen} />
      <Pila.Screen name="CreatorFlow" component={CreatorFlowScreen} />
      <Pila.Screen name="Project" component={ProjectScreen} />
      <Pila.Screen name="Projects" component={ProjectsScreen} />
      <Pila.Screen name="MisCreaciones" component={MisCreacionesScreen} />
    </Pila.Navigator>
  );
};

const CreatorNavigator: React.FC = () => (
  <TemaCreator>
    <ChromeDeCreator>
      <PilaDeCreator />
    </ChromeDeCreator>
  </TemaCreator>
);

export default CreatorNavigator;
