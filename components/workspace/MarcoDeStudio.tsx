import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommonActions, useNavigation, useNavigationState, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import CabeceraDeStudio from './CabeceraDeStudio';
import BarraLateralDeStudio from './BarraLateralDeStudio';
import PestanasDeStudio from './PestanasDeStudio';
import { AccionDeCabecera, AccionDeCabeceraContext } from './accionDeCabecera';
import { ConMarcoDeSeccion } from '../creator/MarcoDeSeccion';
import { EntradaDelMarco, PestanaDeStudio, RutaDeStudio, entradaEncendida, pestanaDeStudio } from '../../constants/studioWorkspace';
import type { ResultadoDeBusqueda } from '../../hooks/useBusquedaDeStudio';

/** Dónde estamos dentro de Weë Studio: la ruta de su pila y sus parámetros. */
interface RutaInterna {
  readonly nombre: string | undefined;
  readonly params: Record<string, unknown> | undefined;
  /** La llave de la pila de Weë Studio, para reiniciarla desde fuera. */
  readonly pila: string | undefined;
}

const leerRutaInterna = (estado: any, clave: string): RutaInterna => {
  /* La ruta de Weë Studio por su llave: aunque otra pantalla de la pila principal la tape, sigue siendo esta. */
  const studio = estado?.routes?.find((r: any) => r.key === clave) ?? estado?.routes?.[estado?.index ?? 0];
  const pila = studio?.state;
  const ruta = pila?.routes?.[pila.index ?? 0];
  if (ruta) return { nombre: ruta.name, params: ruta.params, pila: pila.key };
  /* Recién llegados, la pila todavía no existe: lo que se pidió viene en los parámetros de la ruta. */
  return { nombre: studio?.params?.screen, params: studio?.params?.params, pila: undefined };
};

/**
 * EL MARCO DE WEË STUDIO: cabecera, barra lateral y el sitio donde va la pila.
 *
 * Se monta UNA vez alrededor de la pila de Weë Studio y no se vuelve a montar al
 * cambiar de pantalla: la barra y la cabecera se quedan quietas y solo cambia lo
 * de dentro, como en cualquier herramienta profesional.
 *
 *   escritorio  cabecera a lo ancho; debajo, barra lateral y el trabajo.
 *   tableta     lo mismo con la barra en iconos.
 *   teléfono    cabecera compacta y, abajo, las cuatro pestañas del Studio:
 *               Crear · Inspira · Proyectos · Perfil.
 *
 * Y nunca la barra de abajo de la App: Weë y Weë Studio no mezclan su
 * navegación. La salida a Weë está siempre a mano, arriba a la izquierda y al pie
 * de la barra lateral.
 */
const MarcoDeStudio: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isDesktop, isTablet } = useResponsive();
  const esta = useRoute();
  /*
   * Se lee en tres valores sueltos y primitivos: un objeto nuevo en cada lectura
   * haría creer a la navegación que el estado cambia sin parar.
   */
  const nombre = useNavigationState((estado) => leerRutaInterna(estado, esta.key).nombre);
  const pila = useNavigationState((estado) => leerRutaInterna(estado, esta.key).pila);
  /* La puerta del inicio o la experiencia de un trabajo en curso: lo que dice qué herramienta va encendida. */
  const puerta = useNavigationState((estado) => {
    const p = leerRutaInterna(estado, esta.key).params;
    return typeof p?.puerta === 'string' ? p.puerta : '';
  });
  const experiencia = useNavigationState((estado) => {
    const p = leerRutaInterna(estado, esta.key).params;
    return typeof p?.experienceId === 'string' ? p.experienceId : '';
  });
  const ruta = useMemo(() => ({ nombre, pila, params: { puerta, experienceId: experiencia } }), [nombre, pila, puerta, experiencia]);
  const [accion, setAccion] = useState<AccionDeCabecera | null>(null);
  const encendida = entradaEncendida(ruta.nombre, ruta.params);

  /*
   * Ir a una sección desde la barra no es apilar pantallas: es cambiar de sitio
   * dentro del taller. La pila se reinicia con lo elegido, así que «atrás» no
   * recorre una por una todas las secciones visitadas.
   */
  const irA = useCallback((nombre: RutaDeStudio, params?: object) => {
    if (ruta.pila) {
      navigation.dispatch({ ...CommonActions.reset({ index: 0, routes: [{ name: nombre, params }] }), target: ruta.pila });
    } else {
      navigation.navigate('Studio', { screen: nombre, params });
    }
  }, [navigation, ruta.pila]);

  const abrir = useCallback((e: EntradaDelMarco) => {
    const privada = e.ruta === 'StudioProyectos' || e.ruta === 'MisCreaciones';
    if (privada && !user) {
      navigation.navigate('Login');
      return;
    }
    irA(e.ruta, e.params);
  }, [irA, navigation, user]);

  const alResultado = useCallback((r: ResultadoDeBusqueda) => {
    if (r.tipo === 'produccion') navigation.navigate('Studio', { screen: 'Production', params: { productionId: r.id } });
    else if (r.tipo === 'proyecto') navigation.navigate('Studio', { screen: 'Project', params: { id: r.id } });
    else if (r.tipo === 'creacion') irA('MisCreaciones');
    else if (r.receta) navigation.navigate('Studio', { screen: 'StudioInspira', params: { receta: r.receta.id } });
  }, [irA, navigation]);

  const volverAWee = useCallback(() => navigation.navigate('Main'), [navigation]);
  const notificaciones = useCallback(() => navigation.navigate('Main', { screen: 'Home', params: { screen: 'Notifications' } }), [navigation]);
  /* Tu avatar abre el Perfil del Studio: la cuenta, los Credits y la vuelta a Weë. Tu perfil social sigue en Weë. */
  const perfil = useCallback(() => irA('StudioPerfil'), [irA]);
  const elegirPestana = useCallback((p: PestanaDeStudio) => irA(p.ruta), [irA]);

  const contexto = useMemo(() => ({ poner: setAccion }), []);
  const escritorio = isDesktop || isTablet;

  return (
    <AccionDeCabeceraContext.Provider value={contexto}>
      <View style={[styles.raiz, { backgroundColor: theme.colors.background }]}>
        <CabeceraDeStudio
          forma={escritorio ? 'escritorio' : 'movil'}
          accion={accion}
          onVolverAWee={volverAWee}
          onNotificaciones={notificaciones}
          onPerfil={perfil}
          onResultado={alResultado}
        />
        <View style={styles.cuerpo}>
          {escritorio && (
            <BarraLateralDeStudio
              encendida={encendida}
              onAbrir={abrir}
              onVolverAWee={volverAWee}
              forma={isDesktop ? 'completa' : 'compacta'}
            />
          )}
          {/*
            El saldo ya está en la cabecera de Weë Studio, a la vista en todas sus
            pantallas: las cabeceras de sección que viven aquí dentro —Weë Studio,
            Weë Design, Weë Chef— no lo repiten. Las que van dentro de
            `CreatorShell` lo saben por el marco de este.
          */}
          <View style={styles.trabajo}>
            <ConMarcoDeSeccion saldoALaVista aireLateral={0}>{children}</ConMarcoDeSeccion>
          </View>
        </View>
        {/* En el teléfono, las cuatro pestañas del Studio (su referencia móvil). Son del taller: la barra de Weë no entra aquí. */}
        {!escritorio && <PestanasDeStudio puesta={pestanaDeStudio(ruta.nombre)} onElegir={elegirPestana} />}
      </View>
    </AccionDeCabeceraContext.Provider>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  cuerpo: { flex: 1, flexDirection: 'row', minHeight: 0 },
  trabajo: { flex: 1, minWidth: 0 },
});

export default MarcoDeStudio;
