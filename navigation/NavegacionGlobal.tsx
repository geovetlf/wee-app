import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { abrirPortadaDeWeeAi, navegarEnLaRaiz, refNavegacion } from './refNavegacion';
import BarraInferior, { ALTO_BARRA, DestinoId } from '../components/BarraInferior';
import CreateSheet, { CreateKind } from '../components/CreateSheet';
import HojaDeAlterEgos from '../components/HojaDeAlterEgos';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, TemaOscuro } from '../contexts/ThemeContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { useResponsive } from '../hooks/useResponsive';
import { useSinLeer } from '../hooks/useConversaciones';

const isWeb = Platform.OS === 'web';

/**
 * LA BARRA, PUESTA UNA SOLA VEZ, ENCIMA DE TODO.
 *
 * Antes vivía dentro del navegador de pestañas, y ese navegador solo existe bajo
 * la ruta `Main`. Por eso la navegación desaparecía en cuanto entrabas en Weë
 * Travel, en una publicación o en una comunidad: esas pantallas son hermanas de
 * `Main`, no hijas suyas. Aquí se monta al nivel de la pila principal, que es el
 * único sitio desde el que se ven todas.
 *
 * Este componente es el que SÍ conoce el árbol: mira dónde estás, decide qué
 * destino va encendido, dice cuándo la barra sobra, y traduce un toque en una
 * navegación. La barra en sí no sabe nada de esto.
 */

/* Dónde la barra estorba: pantalla completa, modales y autenticación. */
const SIN_BARRA = new Set([
  'Login',
  'Register',
  'Create',
  'Reels',
  'Settings',
  'WeeProfileCreation',
  'CharacterSheet',
  'AiAvatar',
  'EliminarCuenta',
  'RetirarAlterEgo',
  'EspacioProfesional',
]);

/* Y una pantalla anidada: una conversación abierta ocupa todo (ya era así antes). */
const ANIDADAS_SIN_BARRA = new Set(['Conversation']);

/**
 * Qué destino corresponde a cada ruta suelta de la pila.
 *
 * Todo lo que es Weë AI enciende WeëAI: el centro creativo, cada experiencia,
 * el flujo guiado, los proyectos, las creaciones y el historial de trabajos.
 * Lo demás —una publicación, una comunidad, la búsqueda— se alcanza desde el
 * Home y enciende Inicio, como siempre.
 */
const DESTINO_DE_RUTA: Record<string, DestinoId> = {
  WeeCreator: 'WeeAI',
  CrearVideo: 'WeeAI',
  CrearPublicacion: 'WeeAI',
  Plantillas: 'WeeAI',
  Herramientas: 'WeeAI',
  Filmmaker: 'WeeAI',
  FilmmakerTandas: 'WeeAI',
  Specialist: 'WeeAI',
  CreatorFlow: 'WeeAI',
  Studio: 'WeeAI',
  Design: 'WeeAI',
  Travel: 'WeeAI',
  Production: 'WeeAI',
  Mundo3D: 'WeeAI',
  WriterEditor: 'WeeAI',
  Projects: 'WeeAI',
  Project: 'WeeAI',
  MisCreaciones: 'WeeAI',
  Historial: 'WeeAI',
};

/** Las pestañas que la barra dibuja. `Search` y `Create` siguen siendo pestañas, pero ya no tienen destino propio. */
const DESTINO_DE_PESTANA: Record<string, DestinoId> = {
  Home: 'Home',
  Inbox: 'Inbox',
  Profile: 'Profile',
};

/** El nombre de la ruta más profunda, sea cual sea la anidación. */
const rutaHonda = (estado: any): string | null => {
  if (!estado || typeof estado.index !== 'number') return null;
  const ruta = estado.routes?.[estado.index];
  if (!ruta) return null;
  return ruta.state ? rutaHonda(ruta.state) || ruta.name : ruta.name;
};

/** El destino de la pestaña puesta, si es que estamos dentro de las pestañas. Sin estado todavía, Inicio. */
const pestanaPuesta = (estado: any): DestinoId | null => {
  const principal = estado?.routes?.[estado.index];
  if (!principal || principal.name !== 'Main') return null;
  const pestanas = principal.state;
  const nombre = pestanas?.routes?.[pestanas.index]?.name;
  return nombre ? DESTINO_DE_PESTANA[nombre] ?? 'Home' : 'Home';
};

/**
 * Dónde estamos, leído del contenedor.
 *
 * Los hooks de navegación solo valen DENTRO de un navegador y esta barra se
 * monta al lado de la pila —que es lo que le permite verlo todo—, así que se
 * escucha al contenedor: al montar se lee el estado y luego se refresca en cada
 * cambio.
 */
const useEstadoNavegacion = () => {
  const [estado, setEstado] = useState<any>(null);
  useEffect(() => {
    const leer = () => setEstado(refNavegacion.isReady() ? refNavegacion.getRootState() : null);
    leer();
    const cancelar = refNavegacion.addListener('state', leer);
    return () => cancelar();
  }, []);
  return estado;
};

/**
 * CUÁNTO ESTÁ APARTADA LA BARRA. 0 = en su sitio, 1 = fuera de la pantalla.
 *
 * Vive en el módulo, y no dentro de un componente, porque en Weë hay UNA barra y
 * dos sitios que necesitan el mismo número a la vez: la barra, para deslizarse,
 * y la pila, para soltar el hueco que le tenía reservado. Con un valor por
 * componente cada uno animaría por su cuenta y se verían desacompasados.
 *
 * Se anima por JavaScript a propósito: el hilo nativo no puede tocar el
 * `padding` de un contenedor, y esto no corre en cada fotograma del scroll —solo
 * cuando el dedo cambia de sentido—, así que el coste es nulo y a cambio los dos
 * se mueven pegados.
 */
export const apartada = new Animated.Value(0);

/*
 * Y tampoco duran lo mismo.
 *
 * Irse puede tomarse su tiempo: la barra se retira mientras la persona sigue
 * leyendo y nadie la está esperando. Volver, en cambio, es la respuesta a un
 * gesto, y a una respuesta se le mira el reloj.
 *
 * 110 ms es casi inmediato y aun así se ve el recorrido —que es lo que evita que
 * parezca un parpadeo—. No es duración cero a propósito: sin recorrido, el ojo
 * no entiende de dónde salió.
 *
 * Aviso para quien venga después: si la barra vuelve a sentirse lenta, NO es
 * aquí. Estos números se midieron y son los correctos; el retraso de verdad que
 * hubo una vez venía de repintar medio muro en cada evento de scroll, y está
 * explicado en `hooks/useScrollDeBarra.ts`.
 */
const DURACION_OCULTAR = 160;
const DURACION_MOSTRAR = 110;

/**
 * ¿Hay barra ahora mismo, y estamos dentro de las pestañas?
 *
 * Lo segundo importa para el sitio: las pantallas de las pestañas ya dejaban
 * hueco abajo desde siempre —la barra vivía dentro de ellas—, mientras que las
 * demás nunca tuvieron ninguna y hay que reservárselo. Sin esta distinción, o el
 * Home queda con un hueco muerto o WeëTravel acaba con el último vídeo tapado.
 */
export const useBarraInferior = () => {
  const estado = useEstadoNavegacion();
  const { isDesktop } = useResponsive();

  const rutaRaiz = estado?.routes?.[estado.index]?.name;
  const honda = rutaHonda(estado);
  const oculta =
    isDesktop || !rutaRaiz || SIN_BARRA.has(rutaRaiz) || (!!honda && ANIDADAS_SIN_BARRA.has(honda));

  return { estado, visible: !oculta, enPestanas: rutaRaiz === 'Main' };
};

const NavegacionGlobal: React.FC = () => {
  const { user } = useAuth();
  const { setThemeMode } = useTheme();
  const { switchIdentity, hasWeeProfile, activeProfileType } = useUserProfile();
  const { triggerScrollToTop, isScrollingDown } = useScroll();
  const insets = useSafeAreaInsets();
  const [hoja, setHoja] = useState(false);
  /* La hoja «Cambiar de cara»: la abre la pulsación larga en la pestaña de la cara (con varios alter egos). */
  const [hojaDeCaras, setHojaDeCaras] = useState(false);
  const { estado, visible } = useBarraInferior();

  const rutaRaiz = estado?.routes?.[estado.index]?.name;

  /*
   * BAJANDO SE VA, SUBIENDO VUELVE.
   *
   * Se desliza —`translateY`—, no se difumina: una barra medio transparente
   * encima del contenido es peor que no tenerla. Recorre su propio alto más la
   * zona segura, así que sale entera y no deja media navegación asomando.
   *
   * Y se queda donde la dejaron: mientras nadie vuelva a desplazarse, no
   * reaparece sola.
   */
  const salida = ALTO_BARRA + insets.bottom;
  useEffect(() => {
    Animated.timing(apartada, {
      toValue: isScrollingDown ? 1 : 0,
      duration: isScrollingDown ? DURACION_OCULTAR : DURACION_MOSTRAR,
      /*
       * `out` al irse —arranca y se va frenando, que es como se retira algo— y
       * `out` también al volver, porque lo que interesa es que el primer tramo
       * sea rápido: a mitad de camino ya casi ha llegado y el final solo asienta.
       */
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isScrollingDown]);

  /*
   * Al cambiar de pantalla, la barra vuelve. Llegar a un sitio nuevo heredando
   * el "escondida" de la pantalla anterior es desconcertante: no has hecho nada
   * y no hay navegación.
   */
  const anterior = useRef(rutaRaiz);
  useEffect(() => {
    if (anterior.current === rutaRaiz) return;
    anterior.current = rutaRaiz;
    apartada.stopAnimation();
    apartada.setValue(0);
  }, [rutaRaiz]);

  /*
   * Los no leídos de Mensajes (WeeTalk) salen de la MISMA suscripción que la bandeja
   * (Fase 11.x-6). Antes había dos oyentes sobre la misma consulta, y además
   * miraban identidades distintas: este contaba las de la cuenta y la bandeja
   * enseñaba las de la cara activa, así que con el Perfil Weë puesto el número
   * no correspondía con la lista. Una conversación es de la cara con la que se
   * habla, y ahora las dos miran lo mismo.
   */
  const sinLeer = useSinLeer();

  /*
   * En escritorio manda la barra lateral: repetir los mismos cinco destinos
   * abajo sería decir dos veces lo mismo. Es lo que ya hacía el navegador de
   * pestañas y no se cambia. Y en modales, autenticación y pantalla completa
   * la barra estorba: `useBarraInferior` ya lo ha decidido.
   */
  if (!visible) return null;

  /*
   * Qué va encendido. Dentro de las pestañas, la pestaña. Fuera, la ruta si la
   * conocemos y si no Inicio, porque todo lo demás —una publicación, una
   * comunidad, una experiencia de Weë— se alcanza desde ahí.
   */
  /*
   * Notificaciones y Buscar ya no son destinos de la barra (2026-11-15): se
   * abren desde la campana y la lupa de la cabecera del Home. Notificaciones
   * vive dentro de la pila del Home, así que allí sigue encendido Inicio.
   */
  const puesto: DestinoId | null = pestanaPuesta(estado) || DESTINO_DE_RUTA[rutaRaiz] || 'Home';

  const MarcoDeLaBarra: React.ComponentType<{ children: React.ReactNode }> = puesto === 'WeeAI' ? TemaOscuro : React.Fragment;

  /* Siempre a la pila principal: ver `navegarEnLaRaiz` (la pestaña «Create» se quedaba el compositor). */
  const irARaiz = (pantalla: string, params?: object) => {
    navegarEnLaRaiz(pantalla, params);
  };

  const elegir = (destino: DestinoId) => {
    /* Crear no es una pantalla: abre la hoja de siempre. */
    if (destino === 'Create') return setHoja(true);

    /*
     * WeëAI abre el centro creativo de siempre (`WeeCreator`), que es público
     * igual que lo era desde el atajo de la hoja Crear: mirar es libre y crear
     * pide cuenta dentro, donde ya se pedía.
     */
    if (destino === 'WeeAI') { abrirPortadaDeWeeAi(); return; }

    /* Weëls (2026-11-24): el visor de siempre, abierto desde el Home con los Weëls ya cargados, como «Weëls» del ☰. Mirar es libre. */
    if (destino === 'Weels') return irARaiz('Main', { screen: 'Home', params: { screen: 'Landing', params: { openWeels: true } } });

    /* Mensajes y el interruptor de cara son de una persona: piden cuenta. */
    if (destino !== 'Home' && !user) return irARaiz('Register');

    /*
     * LA ÚLTIMA PESTAÑA ES EL INTERRUPTOR DE CARA (decisión del dueño, 2026-11-16): con el Perfil Real activo dice «Weë» y cambia al
     * Perfil Weë; con el Perfil Weë activo dice «Real» y vuelve. Es EXACTAMENTE la lógica del selector de identidad del ☰
     * (`elegirIdentidad` de DrawerMenu y Sidebar): `switchIdentity()` cambia de cara y `setThemeMode()` viste la app, y sin Perfil
     * Weë el lado Weë lleva a crearlo. Después se pasa al Home de la cara nueva, con la pila de Inicio en su portada. WeëAI, el wallet y
     * Mis proyectos son de la cuenta y no dependen de la cara.
     */
    if (destino === 'Profile') {
      const aWee = activeProfileType !== 'hidi';
      if (aWee && !hasWeeProfile) return irARaiz('WeeProfileCreation');
      switchIdentity();
      setThemeMode(aWee ? 'dark' : 'light');
      return irARaiz('Main', { screen: 'Home', params: { screen: 'Landing' } });
    }

    /* Tocar Inicio estando ya en Inicio sube al principio, como siempre. */
    if (destino === 'Home' && puesto === 'Home' && rutaRaiz === 'Main') {
      triggerScrollToTop();
      return;
    }

    /* Inicio, Mensajes (`Inbox`) y Mi Weë (`Profile`) son pestañas: las de siempre. */
    irARaiz('Main', { screen: destino });
  };

  /* Mirar qué se puede crear es público; crear pide cuenta, y se pide aquí, al elegir. */
  const crear = (kind: CreateKind) => {
    setHoja(false);
    if (!user) return irARaiz('Register');
    setTimeout(() => irARaiz('Create', { kind }), isWeb ? 0 : 150);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.anclada,
          { transform: [{ translateY: apartada.interpolate({ inputRange: [0, 1], outputRange: [0, salida] }) }] },
        ]}
        pointerEvents="box-none"
      >
        {/* En WeëAI (de la cuenta, siempre oscura) la barra también va oscura; en el resto manda el perfil. */}
        <MarcoDeLaBarra>
          <BarraInferior puesto={puesto} onSelect={elegir} sinLeer={sinLeer} onMantener={() => setHojaDeCaras(true)} />
        </MarcoDeLaBarra>
      </Animated.View>
      {user && hasWeeProfile && <HojaDeAlterEgos visible={hojaDeCaras} onClose={() => setHojaDeCaras(false)} />}
      <CreateSheet
        visible={hoja}
        onClose={() => setHoja(false)}
        onSelect={crear}
        onOpenCreator={() => {
          setHoja(false);
          setTimeout(() => abrirPortadaDeWeeAi(), isWeb ? 0 : 150);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  /* Quieta abajo mientras el contenido se desplaza por detrás. */
  anclada: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
});

export default NavegacionGlobal;
