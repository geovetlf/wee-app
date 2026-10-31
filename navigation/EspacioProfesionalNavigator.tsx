import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TemaClaro, useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { EspacioProfesionalProvider } from '../contexts/EspacioProfesionalContext';
import MarcoProfesional from '../components/workspace/MarcoProfesional';
import ProInicioScreen from '../screens/ProInicioScreen';
import SpecialistScreen from '../screens/SpecialistScreen';
import CreatorFlowScreen from '../screens/CreatorFlowScreen';
import WriterEditorScreen from '../screens/WriterEditorScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectScreen from '../screens/ProjectScreen';
import MisCreacionesScreen from '../screens/MisCreacionesScreen';
import { RUTA_DE_INICIO } from '../constants/espacioProfesional';

/**
 * WEË VERSIÓN CREATOR DE LA WEB.
 *
 * Las pantallas son las de siempre, registradas aquí con el MISMO nombre: cuando
 * una navega a `CreatorFlow` o a `Projects`, React Navigation resuelve en la pila
 * más cercana y la persona sigue dentro. Lo que solo existe en Weë sale a la pila
 * principal. Filmmaker y «Crear mundo 3D» siguen tras sus puertas cerradas.
 *
 * Es del Perfil Real, y por eso siempre clara: si se entra con el Perfil Weë
 * puesto, se vuelve al Real, igual que al cambiarlo desde el menú.
 */
const Pila = createStackNavigator<Record<string, object | undefined>>();

const PilaProfesional: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <Pila.Navigator
      initialRouteName={RUTA_DE_INICIO}
      screenOptions={{
        headerShown: false,
        title: t('profesional.name'),
        cardStyle: { flex: 1, backgroundColor: theme.colors.background },
        cardStyleInterpolator: ({ current }: { current: { progress: any } }) => ({ cardStyle: { opacity: current.progress } }),
      }}
    >
      <Pila.Screen name={RUTA_DE_INICIO} component={ProInicioScreen} />
      <Pila.Screen name="Specialist" component={SpecialistScreen} />
      <Pila.Screen name="CreatorFlow" component={CreatorFlowScreen} />
      <Pila.Screen name="WriterEditor" component={WriterEditorScreen} />
      <Pila.Screen name="Projects" component={ProjectsScreen} />
      <Pila.Screen name="Project" component={ProjectScreen} />
      <Pila.Screen name="MisCreaciones" component={MisCreacionesScreen} />
    </Pila.Navigator>
  );
};

const EspacioProfesionalNavigator: React.FC = () => {
  const { activeProfileType, switchIdentity } = useUserProfile();
  const { setThemeMode } = useTheme();

  useEffect(() => {
    if (activeProfileType !== 'hidi') return;
    switchIdentity();
    setThemeMode('light');
  }, [activeProfileType, switchIdentity, setThemeMode]);

  return (
    <EspacioProfesionalProvider value>
      <TemaClaro>
        <MarcoProfesional>
          <PilaProfesional />
        </MarcoProfesional>
      </TemaClaro>
    </EspacioProfesionalProvider>
  );
};

export default EspacioProfesionalNavigator;
