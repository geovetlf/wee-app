import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TemaClaro, useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { EspacioProfesionalProvider } from '../contexts/EspacioProfesionalContext';
import MarcoProfesional from '../components/workspace/MarcoProfesional';
import ProInicioScreen from '../screens/ProInicioScreen';
import SpecialistScreen from '../screens/SpecialistScreen';
import FashionCreatorScreen from '../screens/FashionCreatorScreen';
import CreatorFlowScreen from '../screens/CreatorFlowScreen';
import WriterEditorScreen from '../screens/WriterEditorScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectScreen from '../screens/ProjectScreen';
import MisCreacionesScreen from '../screens/MisCreacionesScreen';
import AjustesCreatorScreen from '../screens/AjustesCreatorScreen';
import IdiomaScreen from '../screens/IdiomaScreen';
import HelpScreen from '../screens/HelpScreen';
import EngineAdminScreen from '../screens/EngineAdminScreen';
import WalletCreatorScreen from '../screens/WalletCreatorScreen';
import TravelScreen from '../screens/travel/TravelScreen';
import { conCuentaEnCreator } from '../components/workspace/ConCuentaEnCreator';
import RecuerdoDelPerfil from '../components/workspace/RecuerdoDelPerfil';
import { RUTA_DE_INICIO } from '../constants/espacioProfesional';

/**
 * WEË VERSIÓN CREATOR DE LA WEB.
 *
 * Las pantallas son las de siempre, registradas aquí con el MISMO nombre: cuando
 * una navega a `CreatorFlow` o a `Projects`, React Navigation resuelve en la pila
 * más cercana y la persona sigue dentro. Lo que solo existe en Weë sale a la pila
 * principal. Filmmaker y «Crear mundo 3D» siguen tras sus puertas cerradas.
 *
 * Weë es una sola aplicación con dos presentaciones: aquí cambian el marco y la
 * navegación, no el núcleo. Por eso entrar no toca nada de la persona: el perfil
 * que tenía puesto sigue puesto al volver a la versión app. Se pinta siempre clara
 * y no enseña lo social, que es de la versión app.
 */
const Pila = createStackNavigator<Record<string, object | undefined>>();

/*
 * LA SECCIÓN DENTRO DE CREATOR. Es la misma pantalla de la versión app salvo Weë
 * Fashion, que en creator tiene su adaptación propia (`FashionCreatorScreen`): así
 * creator no toca ninguna pantalla compartida con la versión app.
 */
const EspecialistaDeCreator: React.FC<any> = (props) => (
  props.route?.params?.id === 'business' ? <FashionCreatorScreen /> : <SpecialistScreen {...props} />
);

/*
 * LO QUE ES DE LA CUENTA, DENTRO DEL MARCO. Abierto por su dirección sin sesión,
 * pide iniciarla en vez de enseñarse vacío o quedarse pensando
 * (components/workspace/ConCuentaEnCreator.tsx). Las pantallas son las mismas.
 */
const FlujoDeCreator = conCuentaEnCreator(CreatorFlowScreen);
const ProyectosDeCreator = conCuentaEnCreator(ProjectsScreen);
const ProyectoDeCreator = conCuentaEnCreator(ProjectScreen);
const CreacionesDeCreator = conCuentaEnCreator(MisCreacionesScreen);
const BilleteraDeCreator = conCuentaEnCreator(WalletCreatorScreen);

/*
 * SIN TIENDA EN CREATOR. Las recargas están cerradas: quien pide la tienda
 * (el saldo de la cabecera, «Conseguir Credits» de un flujo) llega a la
 * billetera de creator —saldo e historial— y nunca a una compra.
 */
const SinTiendaEnCreator: React.FC<any> = ({ navigation }) => {
  useEffect(() => {
    const id = setTimeout(() => navigation.replace('Wallet'), 0);
    return () => clearTimeout(id);
  }, [navigation]);
  return null;
};

/*
 * LA CONFIGURACIÓN PROPIA DE CREATOR (`AjustesCreatorScreen`, sin nada social; la
 * de la versión app no se toca).
 *
 * ABIERTA POR SU DIRECCIÓN. «Atrás» —el del navegador, o el de Idioma y Ayuda— si la pila de
 * creator solo la tiene a ella (/creator/ajustes recién cargada), «atrás» subía a
 * la pila principal y salía a la versión app. Se deja el Inicio de creator
 * debajo, con la misma llave, así que la pantalla no se vuelve a montar.
 */
const AjustesDeCreator: React.FC<any> = (props) => {
  const { navigation, route } = props;
  useEffect(() => {
    /* Después del primer pintado: durante el montaje la pila todavía está aplicando el estado del enlace y lo descarta. */
    const id = setTimeout(() => {
      if (navigation.getState()?.routes?.length === 1) {
        navigation.reset({ index: 1, routes: [{ name: RUTA_DE_INICIO }, { key: route.key, name: route.name, params: route.params }] });
      }
    }, 0);
    return () => clearTimeout(id);
  }, [navigation, route.key, route.name, route.params]);
  return <AjustesCreatorScreen />;
};

/*
 * WEË STUDIO DESDE OTRA SECCIÓN. Algunas pantallas compartidas (los recuerdos de Weë Travel) piden la ruta
 * `Studio` de la versión app; dentro de creator Weë Studio es su sección, así que se abre ahí, en el marco, sin
 * tocar esas pantallas.
 */
const StudioEnCreator: React.FC<any> = ({ navigation }) => {
  useEffect(() => {
    const id = setTimeout(() => navigation.replace('Specialist', { id: 'studio' }), 0);
    return () => clearTimeout(id);
  }, [navigation]);
  return null;
};

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
      <Pila.Screen name="Specialist" component={EspecialistaDeCreator} />
      {/* Weë Travel completo: las pantallas de sus seis módulos (screens/travel), la misma ruta que en la versión app, dentro de este marco. */}
      <Pila.Screen name="Travel" component={TravelScreen} />
      <Pila.Screen name="Studio" component={StudioEnCreator} />
      <Pila.Screen name="CreatorFlow" component={FlujoDeCreator} />
      <Pila.Screen name="WriterEditor" component={WriterEditorScreen} />
      <Pila.Screen name="Projects" component={ProyectosDeCreator} />
      <Pila.Screen name="Project" component={ProyectoDeCreator} />
      <Pila.Screen name="MisCreaciones" component={CreacionesDeCreator} />
      {/* Configuración y la billetera son de la cuenta: dentro de creator se ven en su marco. */}
      <Pila.Screen name="Settings" component={AjustesDeCreator} />
      <Pila.Screen name="Wallet" component={BilleteraDeCreator} />
      <Pila.Screen name="CreditStore" component={SinTiendaEnCreator} />
      {/* Lo que se abre desde la configuración de creator, dentro de su marco: las mismas pantallas, sin nada social. */}
      <Pila.Screen name="Idioma" component={IdiomaScreen} />
      <Pila.Screen name="Help" component={HelpScreen} />
      <Pila.Screen name="EngineAdmin" component={EngineAdminScreen} />
    </Pila.Navigator>
  );
};

const EspacioProfesionalNavigator: React.FC = () => {
  return (
    <EspacioProfesionalProvider value>
      <TemaClaro>
        {/* Recargar en /creator conserva el perfil puesto (components/workspace/RecuerdoDelPerfil.tsx). */}
        <RecuerdoDelPerfil>
          <MarcoProfesional>
            <PilaProfesional />
          </MarcoProfesional>
        </RecuerdoDelPerfil>
      </TemaClaro>
    </EspacioProfesionalProvider>
  );
};

export default EspacioProfesionalNavigator;
