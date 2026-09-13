import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import AvatarDisplay from '../avatars/AvatarDisplay';
import { destinosDisponibles, MURO_GENERAL } from '../../utils/sectionFeed';
import { getExperienceById } from '../../constants/weeExperiences';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * La puerta de publicar de Weë.
 *
 * Es la tarjeta que abre el compositor desde cualquier sitio: el Home y la
 * portada web. Nació dentro del muro que cada sección de Weë AI tenía, y se sacó
 * aquí para poder ponerla en más sitios sin copiarla; aquellos muros ya no
 * existen —Weë tiene uno solo— y la tarjeta se quedó, que era lo que valía.
 *
 * NO PUBLICA NADA. Ninguno de sus controles escribe: todos llaman a `onCompose`
 * y quien la puso decide a dónde lleva. Cámara, Foto o vídeo, ËContact,
 * Ubicación y Encuesta viven de verdad en `CreateScreen`; aquí son atajos que
 * abren esa pantalla, no una segunda copia de esas herramientas.
 *
 * ─── Sobre la fila de destinos ────────────────────────────────────────────────
 *
 * Enseña dónde va a parar lo que publiques, con los nombres que salen de
 * `destinosDisponibles()` y las caras del catálogo de Weë: una sola lista, la
 * misma que usa el compositor. NO es un segundo selector. Elegir destinos —uno,
 * varios o todos— se hace en `CreateScreen` y solo ahí; tener dos sitios donde
 * elegir lo mismo es exactamente lo que esta arquitectura evita. Aquí la fila
 * informa y, al tocarla, abre el compositor como el resto de la tarjeta.
 */

/*
 * Con qué intención se abre el compositor. La fuente única del tipo: quien
 * recibe un `onCompose` de esta tarjeta importa esto en vez de repetir la lista,
 * que era como `'poll'` podía quedarse fuera sin que nadie se enterara.
 *
 * `poll` abre la encuesta ya montada. No es una sección de Weë ni un tipo de
 * publicación aparte, y no es lo mismo que `question`, que sigue siendo una
 * pregunta escrita en texto —sin opciones ni votos—.
 */
export type ComposerKind = 'post' | 'image' | 'video' | 'question' | 'poll';

interface ComposerEntryProps {
  /** La frase del campo: "Comparte tu plato…", "¿Qué quieres compartir?"… */
  placeholder: string;
  onCompose: (kind: ComposerKind) => void;
  /**
   * Una sola fila (fase 2E-70). El atajo de foto se queda al lado del campo y
   * lo demás baja dentro de la pantalla de crear. Lo pide Weë Travel, donde el
   * muro es el producto y cada píxel de arriba es media foto.
   */
  compact?: boolean;
  /**
   * Desde qué sección se publica, solo para marcar su destino en la fila. Sin
   * ella —el Home— se marca el muro general. No decide nada: el destino real lo
   * elige la persona en el compositor.
   */
  seccion?: string;
  /**
   * Dónde está puesta la tarjeta. Solo cambia QUÉ SE VE a la izquierda del
   * campo, nada más:
   *
   * · `'muro'` (lo de siempre, y lo que sale si no se dice nada) — tu cara, que
   *   recuerda con qué perfil vas a publicar. Es lo correcto dentro de un muro
   *   de sección, donde tu avatar no está en ninguna otra parte de la pantalla.
   *
   * · `'home'` — un "+" amarillo. En el Home tu cara ya está dos dedos más
   *   arriba, en el saludo, así que repetirla no informaba de nada y sí quitaba
   *   sitio; el "+" dice lo único que faltaba por decir: aquí se crea.
   *
   * No cambia ninguna acción, ningún destino y nada de lo que se publica.
   */
  variante?: 'muro' | 'home';
  /**
   * Tocar la barra abre el compositor DIRECTAMENTE, sin desplegarse.
   *
   * Es lo que pide el Home: la barra es el "+" y la pregunta, nada más —sin
   * chevron, porque no hay nada que desplegar—, y tocar cualquiera de los dos
   * lleva a "Crear publicación". Ahí es donde de verdad están Cámara, Foto o
   * vídeo, ËContact, Ubicación y Encuesta; enseñarlas aquí antes era un segundo
   * compositor a medias creciendo dentro del Home.
   *
   * Los muros de sección no lo pasan y siguen desplegándose como siempre.
   */
  directo?: boolean;
}

/*
 * Los cinco atajos, solo con su icono (fase 2E-78).
 *
 * Sin nombre debajo: cinco etiquetas en 375 puntos obligan a letra diminuta y
 * la fila se vuelve un muro de texto. El icono basta porque son los mismos
 * cinco de siempre y cada uno lleva su nombre en el lector de pantalla.
 *
 * Foto y vídeo comparten UNA pastilla y UN icono: es una sola puerta —el
 * selector acepta las dos cosas— y separarlas hacía creer que eran dos sitios
 * distintos. Y no hay "Pregunta": se escribe en el compositor como todo lo demás.
 */
const ATAJOS: { id: string; icon: string; etiqueta: string; kind: ComposerKind }[] = [
  { id: 'camara', icon: 'camera-outline', etiqueta: 'Cámara', kind: 'image' },
  { id: 'galeria', icon: 'image-outline', etiqueta: 'Foto o vídeo', kind: 'image' },
  { id: 'lugar', icon: 'location-outline', etiqueta: 'Ubicación', kind: 'post' },
  { id: 'contactos', icon: 'people-outline', etiqueta: 'ËContact', kind: 'post' },
  { id: 'encuesta', icon: 'bar-chart-outline', etiqueta: 'Encuesta', kind: 'poll' },
];

const ComposerEntry: React.FC<ComposerEntryProps> = ({ placeholder, onCompose, compact, seccion, variante = 'muro', directo = false }) => {
  const { theme } = useTheme();
  const { userProfile } = useUserProfile();
  const destinoActual = seccion || MURO_GENERAL;

  /*
   * El "+" se hunde un poco al tocarlo. Es la respuesta más barata que existe
   * —una escala, en el hilo nativo, sin librerías— y es la que convierte un
   * icono en un botón: sin ella el dedo no sabe si la pulsación entró.
   */
  const pulsacion = useRef(new Animated.Value(1)).current;
  const hundir = (hasta: number) =>
    Animated.spring(pulsacion, { toValue: hasta, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  /*
   * ─── Cerrada por defecto ──────────────────────────────────────────────────
   *
   * Abierta ocupa media pantalla antes del primer post, y lo primero que se ve
   * al llegar al Home debe ser gente, no un formulario esperando. Cerrada es una
   * fila: la pregunta y poco más. Todo lo demás está a un toque.
   *
   * Este estado es SOLO de apertura. No guarda destinos, ni texto, ni nada de lo
   * que se publica: eso sigue viviendo entero en `CreateScreen`.
   */
  const [abierta, setAbierta] = useState(false);
  const giro = useRef(new Animated.Value(0)).current;

  /* El chevron gira en los dos sentidos; cuenta el gesto sin cambiar de icono. */
  useEffect(() => {
    Animated.timing(giro, { toValue: abierta ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [abierta, giro]);

  /*
   * Se despliega si no es compacta y no es directa. En el Home es directa, y
   * con ella se va también el chevron: una flecha que no abre nada mentiría.
   */
  const desplegable = !compact && !directo;
  const chevron = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  /*
   * Cerrada, tocar la fila la abre. Abierta, el campo hace lo de siempre: llevar
   * al compositor. Así el bloque cerrado se comporta como una sola cosa y el
   * abierto no cambia en nada respecto a lo aprobado.
   */
  const tocarCampo = () => (desplegable && !abierta ? setAbierta(true) : onCompose('post'));

  return (
    <View style={[styles.composer, variante === 'home' && styles.composerHome, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.composerTop}>
        {variante === 'home' ? (
          <Animated.View style={{ transform: [{ scale: pulsacion }] }}>
            <TouchableOpacity
              onPress={() => onCompose('post')}
              onPressIn={() => hundir(0.92)}
              onPressOut={() => hundir(1)}
              activeOpacity={0.85}
              style={[styles.crear, { backgroundColor: theme.colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Crear una publicación"
            >
              <Ionicons name="add" size={scale(26)} color="#1F2937" />
            </TouchableOpacity>
          </Animated.View>
        ) : userProfile ? (
          <AvatarDisplay
            size={scale(40)}
            avatarType={userProfile.avatarType || 'predefined'}
            avatarId={userProfile.avatarId || 'male'}
            photoURL={userProfile.photoURL}
            photoURLThumbnail={userProfile.photoURLThumbnail}
            backgroundColor={theme.colors.accent}
            showBorder={false}
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="person-outline" size={scale(18)} color={theme.colors.textSecondary} />
          </View>
        )}
        <TouchableOpacity
          onPress={tocarCampo}
          activeOpacity={0.7}
          style={[styles.composerField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityState={desplegable ? { expanded: abierta } : undefined}
          accessibilityLabel={desplegable && !abierta ? `${placeholder} Abre las opciones de publicar.` : placeholder}
        >
          <Text style={[styles.composerPlaceholder, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {placeholder}
          </Text>
          {/*
            La carita decoraba el campo, y en un teléfono de 375 puntos le quitaba
            sitio a la única frase que tiene que leerse entera: "¿Qué quieres
            compartir?" se cortaba a media palabra. En el Home manda el texto.
            En los muros de sección la frase es más corta y la carita se queda.
          */}
          {!compact && variante !== 'home' && <Ionicons name="happy-outline" size={scale(19)} color={theme.colors.textSecondary} />}
        </TouchableOpacity>
        {/* Abrir y cerrar. Girar el chevron cuenta el gesto en los dos sentidos. */}
        {desplegable && (
          <TouchableOpacity
            onPress={() => setAbierta((estaba) => !estaba)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.pliegue}
            accessibilityRole="button"
            accessibilityState={{ expanded: abierta }}
            aria-expanded={abierta}
            accessibilityLabel={abierta ? 'Ocultar las opciones de publicar' : 'Mostrar las opciones de publicar'}
          >
            <Animated.View style={{ transform: [{ rotate: chevron }] }}>
              <Ionicons name="chevron-down" size={scale(20)} color={theme.colors.accentDark} />
            </Animated.View>
          </TouchableOpacity>
        )}
        {compact && (
          <TouchableOpacity
            onPress={() => onCompose('image')}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={styles.composerFotoCompacta}
            accessibilityRole="button"
            accessibilityLabel="Compartir una foto"
          >
            <Ionicons name="image-outline" size={scale(21)} color={theme.colors.accentDark} />
          </TouchableOpacity>
        )}
      </View>

      {/*
        Todo lo demás sale de golpe al abrir, no por partes: los cinco atajos,
        los destinos y Publicar son una sola idea —"con qué, dónde y ya"— y
        enseñarla a trozos haría pensar que falta algo.
      */}
      {desplegable && abierta && (
        <>
          {/* Los cinco atajos. Reparten el ancho a partes iguales y no se aplastan. */}
          <View style={styles.composerShortcuts}>
            {ATAJOS.map((atajo) => (
              <TouchableOpacity
                key={atajo.id}
                onPress={() => onCompose(atajo.kind)}
                activeOpacity={0.7}
                style={[styles.composerChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={atajo.etiqueta}
              >
                <Ionicons name={atajo.icon as any} size={scale(21)} color={theme.colors.accentDark} />
              </TouchableOpacity>
            ))}
          </View>

          {/*
            Dónde se va a leer. Los nombres y las caras salen de la fuente única
            —`destinosDisponibles()` y el catálogo de Weë—, así que añadir una
            sección allí la trae aquí sola. Se desliza porque son ocho y en 375
            puntos no caben; el que corresponde va primero y encendido.
          */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filaDestinos}
            contentContainerStyle={styles.destinos}
            keyboardShouldPersistTaps="handled"
            /* Que el dedo mande sobre la fila y no sobre lo que hay detrás. */
            directionalLockEnabled
            nestedScrollEnabled
          >
            {destinosDisponibles()
              .slice()
              .sort((a, b) => Number(b.id === destinoActual) - Number(a.id === destinoActual))
              .map((destino) => {
                const puesto = destino.id === destinoActual;
                const experiencia = getExperienceById(destino.id);
                return (
                  <TouchableOpacity
                    key={destino.id}
                    onPress={() => onCompose('post')}
                    activeOpacity={0.7}
                    style={[
                      styles.destino,
                      {
                        backgroundColor: puesto ? theme.colors.accent + '24' : theme.colors.surface,
                        borderColor: puesto ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={puesto ? `${destino.nombre}, destino actual` : destino.nombre}
                  >
                    {experiencia ? (
                      <Text style={styles.destinoEmoji}>{experiencia.emoji}</Text>
                    ) : (
                      <Ionicons name="globe-outline" size={scale(15)} color={theme.colors.accentDark} />
                    )}
                    <Text style={[styles.destinoTexto, { color: theme.colors.text }]} numberOfLines={1}>
                      {destino.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>

          {/* La acción principal de la tarjeta: ancha, dorada y sin competencia. */}
          <TouchableOpacity
            onPress={() => onCompose('post')}
            activeOpacity={0.85}
            style={[styles.publishButton, { backgroundColor: theme.colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Publicar"
          >
            <Ionicons name="paper-plane-outline" size={scale(18)} color="#1F2937" />
            <Text style={styles.publishText}>Publicar</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /* Tarjeta con esquinas generosas y una sombra que solo la despega del fondo. */
  composer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    gap: SPACING.md,
    shadowColor: '#1F2937',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  /*
   * En el Home la tarjeta ciñe: el "+" ya mide 44 y es lo más alto que hay
   * dentro, así que el aire de arriba y abajo puede ser el justo. Diez puntos
   * menos de tarjeta son diez puntos más de muro, y aquí arriba eso se nota.
   */
  composerHome: {
    paddingVertical: SPACING.sm,
  },
  composerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  /* El chevron de abrir y cerrar. 44 de lado con el hitSlop, sin escalar. */
  pliegue: {
    width: scale(28),
    height: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* 44 de lado, el mínimo táctil, sin escalar: lo que se toca no encoge. */
  composerFotoCompacta: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /*
   * El "+" del Home. 44 de lado sin escalar —lo que se toca no encoge en web— y
   * el único amarillo de la tarjeta cerrada: hay una sola acción principal aquí
   * y se ve de un vistazo cuál es.
   */
  crear: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    minHeight: scale(46),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  composerPlaceholder: {
    flex: 1,
    fontSize: FONT_SIZE.base,
  },
  /*
   * Los cinco reparten el ancho: `flex: 1` en vez de un ancho fijo, que a 375
   * puntos sería el único reparto que no deja a ninguno aplastado ni fuera.
   */
  composerShortcuts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  composerChip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  /*
   * ─── La fila de destinos, que se desliza ──────────────────────────────────
   *
   * Ocho destinos no caben en un móvil, y partirlos en dos filas encarece la
   * tarjeta. Se desliza, y aquí lo que importa es que SE NOTE que se desliza.
   *
   * El margen negativo la saca hasta los bordes de la tarjeta y el padding del
   * contenido le devuelve el aire a la primera y a la última. Así la pastilla
   * que sobra la corta el borde redondeado de la tarjeta —que se lee como "hay
   * más"— en vez de terminar en seco contra el padding interior, que parecía un
   * recorte. Es el único cambio de esta vuelta (fase 2E-79).
   */
  filaDestinos: {
    marginHorizontal: -SPACING.md,
  },
  destinos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: SPACING.md,
  },
  destino: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    minHeight: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  destinoEmoji: {
    fontSize: scale(14),
  },
  destinoTexto: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    minHeight: 48,
    borderRadius: BORDER_RADIUS.full,
  },
  publishText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default ComposerEntry;
