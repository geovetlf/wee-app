import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommonActions, useNavigation, useNavigationState, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import CabeceraDeCreator from './CabeceraDeCreator';
import BarraLateralDeCreator from './BarraLateralDeCreator';
import HojaInferior from './HojaInferior';
import { AccionDeCabecera, AccionDeCabeceraContext } from './accionDeCabecera';
import { ConMarcoDeSeccion } from '../creator/MarcoDeSeccion';
import { EntradaDeCreator, RutaDeCreator, entradaEncendida } from '../../constants/creatorWorkspace';
import type { ResultadoDeBusqueda } from '../../hooks/useBusquedaDeCreator';

/** Dónde estamos dentro de Weë Creator: la ruta de su pila y sus parámetros. */
interface RutaInterna {
  readonly nombre: string | undefined;
  readonly params: Record<string, unknown> | undefined;
  /** La llave de la pila de Weë Creator, para reiniciarla desde fuera. */
  readonly pila: string | undefined;
}

const leerRutaInterna = (estado: any, clave: string): RutaInterna => {
  /* La ruta de Weë Creator por su llave: aunque otra pantalla de la pila principal la tape, sigue siendo esta. */
  const creator = estado?.routes?.find((r: any) => r.key === clave) ?? estado?.routes?.[estado?.index ?? 0];
  const pila = creator?.state;
  const ruta = pila?.routes?.[pila.index ?? 0];
  if (ruta) return { nombre: ruta.name, params: ruta.params, pila: pila.key };
  /* Recién llegados, la pila todavía no existe: lo que se pidió viene en los parámetros de la ruta. */
  return { nombre: creator?.params?.screen, params: creator?.params?.params, pila: undefined };
};

/**
 * EL MARCO DE WEË CREATOR: cabecera, barra lateral y el sitio donde va la pila.
 *
 * Se monta UNA vez alrededor de la pila de Weë Creator y no se vuelve a montar al
 * cambiar de pantalla: la barra y la cabecera se quedan quietas y solo cambia lo
 * de dentro, como en cualquier herramienta profesional.
 *
 *   escritorio  cabecera a lo ancho; debajo, barra lateral y el trabajo.
 *   tableta     lo mismo con la barra en iconos.
 *   teléfono    cabecera compacta; la barra se abre como una hoja desde el ☰.
 *
 * Y nunca la barra de abajo de la App: Weë y Weë Creator no mezclan su
 * navegación. La salida a Weë está siempre a mano, arriba a la izquierda y al pie
 * de la barra lateral.
 */
const ChromeDeCreator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const { isDesktop, isTablet } = useResponsive();
  const esta = useRoute();
  /*
   * Se lee en tres valores sueltos y primitivos: un objeto nuevo en cada lectura
   * haría creer a la navegación que el estado cambia sin parar.
   */
  const nombre = useNavigationState((estado) => leerRutaInterna(estado, esta.key).nombre);
  const pila = useNavigationState((estado) => leerRutaInterna(estado, esta.key).pila);
  const idDeParams = useNavigationState((estado) => {
    const p = leerRutaInterna(estado, esta.key).params;
    return typeof p?.id === 'string' ? p.id : typeof p?.experienceId === 'string' ? p.experienceId : '';
  });
  const ruta = useMemo(() => ({ nombre, pila, params: { id: idDeParams, experienceId: idDeParams } }), [nombre, pila, idDeParams]);
  const [accion, setAccion] = useState<AccionDeCabecera | null>(null);
  const [menu, setMenu] = useState(false);
  const encendida = entradaEncendida(ruta.nombre, ruta.params);

  /*
   * Ir a una sección desde la barra no es apilar pantallas: es cambiar de sitio
   * dentro del taller. La pila se reinicia con lo elegido, así que «atrás» no
   * recorre una por una todas las secciones visitadas.
   */
  const irA = useCallback((nombre: RutaDeCreator, params?: object) => {
    setMenu(false);
    if (ruta.pila) {
      navigation.dispatch({ ...CommonActions.reset({ index: 0, routes: [{ name: nombre, params }] }), target: ruta.pila });
    } else {
      navigation.navigate('Creator', { screen: nombre, params });
    }
  }, [navigation, ruta.pila]);

  const abrir = useCallback((e: EntradaDeCreator) => {
    const privada = e.ruta === 'CreatorProyectos' || e.ruta === 'MisCreaciones';
    if (privada && !user) {
      setMenu(false);
      navigation.navigate('Login');
      return;
    }
    irA(e.ruta, e.ruta === 'Specialist' ? { id: e.experienceId } : undefined);
  }, [irA, navigation, user]);

  const alResultado = useCallback((r: ResultadoDeBusqueda) => {
    if (r.tipo === 'produccion') navigation.navigate('Creator', { screen: 'Production', params: { productionId: r.id } });
    else if (r.tipo === 'proyecto') navigation.navigate('Creator', { screen: 'Project', params: { id: r.id } });
    else if (r.tipo === 'creacion') irA('MisCreaciones');
    else if (r.receta) navigation.navigate('Creator', { screen: 'CreatorInspira', params: { receta: r.receta.id } });
  }, [irA, navigation]);

  const volverAWee = useCallback(() => {
    setMenu(false);
    navigation.navigate('Main');
  }, [navigation]);
  const notificaciones = useCallback(() => navigation.navigate('Main', { screen: 'Home', params: { screen: 'Notifications' } }), [navigation]);
  const perfil = useCallback(() => navigation.navigate(user ? 'Main' : 'Login', user ? { screen: 'Profile' } : undefined), [navigation, user]);

  const contexto = useMemo(() => ({ poner: setAccion }), []);
  const escritorio = isDesktop || isTablet;

  return (
    <AccionDeCabeceraContext.Provider value={contexto}>
      <View style={[styles.raiz, { backgroundColor: theme.colors.background }]}>
        <CabeceraDeCreator
          forma={escritorio ? 'escritorio' : 'movil'}
          accion={accion}
          onVolverAWee={volverAWee}
          onMenu={() => setMenu(true)}
          onNotificaciones={notificaciones}
          onPerfil={perfil}
          onResultado={alResultado}
        />
        <View style={styles.cuerpo}>
          {escritorio && (
            <BarraLateralDeCreator
              encendida={encendida}
              onAbrir={abrir}
              onVolverAWee={volverAWee}
              forma={isDesktop ? 'completa' : 'compacta'}
            />
          )}
          {/*
            El saldo ya está en la cabecera de Weë Creator, a la vista en todas sus
            pantallas: las cabeceras de sección que viven aquí dentro —Weë Studio,
            Weë Design, Weë Chef— no lo repiten. Las que van dentro de
            `CreatorShell` lo saben por el marco de este.
          */}
          <View style={styles.trabajo}>
            <ConMarcoDeSeccion saldoALaVista aireLateral={0}>{children}</ConMarcoDeSeccion>
          </View>
        </View>
        {!escritorio && (
          <HojaInferior visible={menu} titulo={t('workspace.name')} subtitulo={t('workspace.menuSubtitle')} onCerrar={() => setMenu(false)}>
            <BarraLateralDeCreator encendida={encendida} onAbrir={abrir} onVolverAWee={volverAWee} forma="lista" />
          </HojaInferior>
        )}
      </View>
    </AccionDeCabeceraContext.Provider>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  cuerpo: { flex: 1, flexDirection: 'row', minHeight: 0 },
  trabajo: { flex: 1, minWidth: 0 },
});

export default ChromeDeCreator;
