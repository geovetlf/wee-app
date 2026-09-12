import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useLocation } from '../contexts/LocationContext';
import { useResponsive } from '../hooks/useResponsive';
import { aPublica, type UbicacionPublica } from '../utils/locationPrivacy';
import {
  PlaceOption,
  PostPlace,
  buscarLugares,
  cargarMundo,
  distanciaAproximada,
  lugarDelCatalogo,
  lugarPropio,
  lugaresCercanos,
  lugaresDelPais,
} from '../data/places';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * AGREGAR UBICACIÓN.
 *
 * Dos cosas distintas conviven aquí, y la pantalla existe para que no se
 * confundan nunca:
 *
 *   · el LUGAR (`place`) es de lo que habla la publicación. Lo elige la persona
 *     del catálogo o lo escribe con sus palabras. Alguien en Lima puede publicar
 *     una foto de París y decir "París".
 *   · la UBICACIÓN (`ubicacion`) es desde qué trozo de mundo se publica. Sale del
 *     aparato, pasa por `aPublica()` y queda en zona, radio y precisión. Nunca en
 *     coordenadas.
 *
 * Se pueden poner las dos, una, o ninguna. Publicar no depende de ninguna.
 *
 * ─── Sin una sola imagen ────────────────────────────────────────────────────
 *
 * Ni fotos de lugares, ni miniaturas, ni mapas, ni proveedores externos. Un
 * catálogo de ochenta mil sitios con foto es una factura por cada vez que
 * alguien abre esta pantalla, y no hace falta para elegir dónde estás: un icono,
 * un nombre y su país bastan. Lo único que se dibuja de `assets` es el logo de
 * Weë, que ya viaja en la aplicación.
 *
 * ─── La ubicación es contexto, no una tarea ─────────────────────────────────
 *
 * Aquí NO hay ningún botón de "usar mi ubicación". Si Weë ya tiene permiso, se
 * lee al abrir y los lugares salen ordenados por cercanía sin que nadie pulse
 * nada; si no lo tiene, la pantalla funciona exactamente igual con el buscador y
 * los lugares del país. Compartir dónde estás no es una tarea que deba ocupar
 * media pantalla: es algo que Weë sabe o no sabe, y ya está.
 *
 * Y abrir esta pantalla NUNCA pide el permiso. `refrescar()` mira primero el
 * estado y solo lee si ya está concedido. El único sitio de Weë que abre el
 * diálogo del sistema sigue siendo Configuración.
 *
 * ─── "Cerca de ti" es cerca de verdad ───────────────────────────────────────
 *
 * El catálogo guarda las coordenadas DE LOS LUGARES —de GeoNames, importadas una
 * vez—, así que la distancia se calcula midiendo, no estimando. Cuando no hay
 * lectura, o es demasiado difusa para ordenar por cercanía, se dice lo que sí se
 * sabe: los lugares de tu país. Nunca una distancia que nadie ha medido.
 */

type NavProp = StackNavigationProp<MainStackParamList>;
type RutaProp = RouteProp<MainStackParamList, 'AgregarUbicacion'>;

const AgregarUbicacionScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const ruta = useRoute<RutaProp>();
  const { userProfile } = useUserProfile();
  const ubicacionDeWee = useLocation();
  /* En escritorio la lista no se estira de lado a lado: el mismo ancho que el compositor. */
  const { contentMaxWidth } = useResponsive();

  /* La zona que ya traía el compositor, para devolverla tal cual al elegir.
     El LUGAR no se guarda aquí: esta pantalla es para buscar y elegir, y lo
     elegido se enseña —y se quita o se cambia— en el compositor. */
  const [ubicacion, setUbicacion] = useState<UbicacionPublica | undefined>(ruta.params?.ubicacion);

  const [texto, setTexto] = useState('');
  const [mundoCargado, setMundoCargado] = useState(false);
  const [verTodos, setVerTodos] = useState(false);

  /*
   * El catálogo mundial son casi ochenta mil lugares. Se pide al abrir ESTA
   * pantalla —que es cuando alguien va a buscar de verdad— y no al abrir Weë.
   */
  useEffect(() => {
    let vivo = true;
    cargarMundo().finally(() => {
      if (vivo) setMundoCargado(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /*
   * LA UBICACIÓN, EN SILENCIO.
   *
   * Si Weë YA tiene permiso, se lee al abrir y los lugares salen ordenados por
   * cercanía sin que nadie pulse nada. Si no lo tiene, aquí no pasa nada: la
   * pantalla funciona igual con el buscador y los lugares del país.
   *
   * Esto NO pide permiso, y es importante: `refrescar()` comprueba primero el
   * estado y solo lee cuando ya está concedido —el único sitio de Weë que abre
   * el diálogo del sistema es Configuración, y así sigue siendo—. Abrir una
   * pantalla no puede convertirse en una petición de permiso.
   */
  const { disponible, lectura: lecturaActual, refrescar } = ubicacionDeWee;
  useEffect(() => {
    if (!disponible || lecturaActual) return;
    let vivo = true;
    refrescar()
      .then((nueva) => {
        /* La coordenada pasa por `aPublica` en el mismo gesto en que llega. */
        if (vivo && nueva) setUbicacion(aPublica(nueva));
      })
      .catch(() => {
        /* Sin ubicación se sigue igual: no hay nada que avisar. */
      });
    return () => {
      vivo = false;
    };
  }, [disponible, lecturaActual, refrescar]);

  /* Y si la lectura ya estaba en memoria, se aprovecha sin volver a leer. */
  useEffect(() => {
    if (lecturaActual && !ubicacion) setUbicacion(aPublica(lecturaActual));
    // Solo cuando llega una lectura: no debe reponerse lo que se acaba de quitar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecturaActual]);

  /*
   * La búsqueda, con contexto.
   *
   * El contexto NO filtra: ordena. Escribiendo "Barranc" hay dos sitios en el
   * Perú que empiezan igual —Barranco, en Lima, y Barranca, a 180 km—, y sin
   * saber dónde estás el que sale primero lo decide el orden del archivo. Con la
   * ubicación, gana el que tienes al lado; sin ella, el de tu país.
   *
   * Los resultados de otros países siguen saliendo: solo van después.
   */
  const contextoBusqueda = useMemo(
    () => ({ lat: lecturaActual?.latitude, lon: lecturaActual?.longitude, pais: userProfile?.country }),
    [lecturaActual?.latitude, lecturaActual?.longitude, userProfile?.country]
  );

  // `mundoCargado` entra a propósito: cuando el catálogo llega, lo ya escrito se
  // vuelve a buscar con él.
  const resultados = useMemo(
    () => buscarLugares(texto, 12, contextoBusqueda),
    [texto, mundoCargado, contextoBusqueda]
  );

  /* Los de tu país. Datos reales del catálogo, sin distancia inventada. */
  const delPais = useMemo(
    () => lugaresDelPais(userProfile?.country, verTodos ? 24 : 6),
    [userProfile?.country, verTodos]
  );

  /*
   * CERCA DE TI, de verdad.
   *
   * `lectura` vive en el contexto de ubicación, que es su sitio. De ahí sale
   * para comparar con las coordenadas del catálogo y NO se guarda aquí: esta
   * pantalla no tiene ningún estado con una latitud dentro.
   *
   * Si la lectura es demasiado difusa, ordenar por cercanía sería ordenar por
   * ruido. Entonces no se finge: se vuelve a la vista por país.
   */
  const PRECISION_MINIMA_M = 15000;
  const lectura = ubicacionDeWee.lectura;
  const fiable = !!lectura && (lectura.radioMetros === null || lectura.radioMetros <= PRECISION_MINIMA_M);

  const cercanos = useMemo(() => {
    if (!lectura || !fiable || !mundoCargado) return [];
    return lugaresCercanos(lectura.latitude, lectura.longitude, verTodos ? 24 : 6);
    // `mundoCargado` entra a propósito: sin catálogo no hay nada que medir, y
    // cuando termina de llegar hay que volver a mirar.
  }, [lectura, fiable, mundoCargado, verTodos]);

  /* Se enseña "cerca de ti" solo cuando de verdad hay algo cerca que enseñar. */
  const hayCercanos = !!ubicacion && cercanos.length > 0;

  const buscando = texto.trim().length >= 2;

  /**
   * Devuelve la elección al compositor SIN volver a montarlo.
   *
   * `merge` junta estos parámetros con los que la pantalla ya tenía y vuelve a
   * ella, en vez de abrir otra encima. Así lo que había escrito sigue escrito:
   * elegir un lugar no puede costarle a nadie el texto de su publicación.
   */
  const volverCon = (cambios: { place?: PostPlace | null; ubicacion?: UbicacionPublica | null }) => {
    navigation.navigate({
      name: 'Create',
      params: {
        lugarElegido: cambios.place === undefined ? undefined : cambios.place,
        ubicacionElegida: cambios.ubicacion === undefined ? undefined : cambios.ubicacion,
        /* Un sello distinto en cada vuelta: así el compositor distingue dos
           elecciones seguidas del mismo sitio y no se salta la segunda. */
        selloUbicacion: `${Date.now()}`,
      },
      merge: true,
    });
  };

  const elegir = (opcion: PlaceOption) => volverCon({ place: lugarDelCatalogo(opcion), ubicacion });
  const elegirEscrito = () => {
    const propio = lugarPropio(texto);
    if (propio) volverCon({ place: propio, ubicacion });
  };


  // ─── Piezas ───────────────────────────────────────────────────────────────

  /**
   * Una fila de lugar: una LÍNEA de una lista, no una tarjeta.
   *
   * Un icono pequeño en un círculo crema, el nombre en oscuro y su región y
   * país en gris debajo; entre una fila y la siguiente, un separador de un
   * pelo. Sin marco, sin fondo, sin flecha: la fila entera es lo que se toca
   * —56 de alto como mínimo— y tocarla hace exactamente lo de siempre, elegir
   * ese lugar y volver a la publicación. Nunca una foto.
   *
   * La distancia, cuando se ha medido de verdad, va al final de la línea, en
   * dorado y pequeña: es un dato, no un adorno.
   */
  const Fila: React.FC<{ opcion: PlaceOption; km?: number; ultima?: boolean }> = ({ opcion, km, ultima }) => {
    const esPais = !opcion.countryCode;
    return (
      <TouchableOpacity
        onPress={() => elegir(opcion)}
        activeOpacity={0.6}
        style={[styles.fila, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={opcion.sublabel ? `${opcion.label}, ${opcion.sublabel}` : opcion.label}
        accessibilityHint="Elige este lugar y vuelve a la publicación"
      >
        <View style={[styles.iconoCirculo, { backgroundColor: theme.colors.accent + '1A' }]}>
          <Ionicons
            name={esPais ? 'earth-outline' : 'location-outline'}
            size={scale(16)}
            color={theme.colors.accentDark}
          />
        </View>
        <View style={styles.filaDatos}>
          <Text style={[styles.filaNombre, { color: theme.colors.text }]} numberOfLines={1}>
            {opcion.label}
          </Text>
          {/*
            Texto limpio, sin bandera: "Lima, Perú". El emoji no añadía nada que
            el nombre del sitio no dijera ya, y ensuciaba la línea.
          */}
          <Text style={[styles.filaSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {opcion.sublabel || 'País'}
          </Text>
        </View>
        {/* La distancia solo cuando se ha podido calcular de verdad. */}
        {km !== undefined && (
          <Text style={[styles.filaDistancia, { color: theme.colors.accentDark }]} numberOfLines={1}>
            {distanciaAproximada(km)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  /* El rótulo de cada bloque: pequeño, en mayúsculas y gris, como "PUBLICAR EN". */
  const Seccion: React.FC<{ titulo: string; accion?: string; onAccion?: () => void }> = ({
    titulo,
    accion,
    onAccion,
  }) => (
    <View style={styles.seccion}>
      <Text style={[styles.seccionTitulo, { color: theme.colors.textSecondary }]} accessibilityRole="header">{titulo}</Text>
      {!!accion && (
        <TouchableOpacity onPress={onAccion} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={accion}>
          <Text style={[styles.seccionAccion, { color: theme.colors.accentDark }]}>{accion}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* 1 · Cabecera. Sin línea debajo: la pantalla es un solo flujo, como el compositor. */}
      <View style={styles.cabecera}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.cancelar}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          {/* "Back" es la etiqueta de volver en todo Weë: sale sin tocar nada. */}
          <Text style={[styles.cancelarTexto, { color: theme.colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.tituloCabecera, { color: theme.colors.text }]}>Agregar ubicación</Text>
        {/* El mismo ancho que "Back", para que el título quede centrado de
            verdad respecto a la pantalla y no respecto al hueco que le dejan. */}
        <View style={styles.cancelar} />
      </View>

      <EspacioDeEscritura style={styles.fill}>
        <ScrollView
          contentContainerStyle={[styles.contenido, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 2 · Marca. El logo y nada más: el buscador es lo que importa. */}
          <View style={styles.marca}>
            <Image
              source={theme.dark ? require('../assets/images/weelogo-dark.png') : require('../assets/images/weelogo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Weë"
            />
          </View>

          {/* 3 · Buscador */}
          <View style={[styles.buscador, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={scale(18)} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.buscadorCampo, { color: theme.colors.text }]}
              placeholder="Buscar un lugar, ciudad o país"
              placeholderTextColor={theme.colors.textSecondary}
              value={texto}
              onChangeText={setTexto}
              maxLength={60}
              returnKeyType="search"
              accessibilityLabel="Buscar un lugar, ciudad o país"
            />
            {texto.length > 0 && (
              <TouchableOpacity onPress={() => setTexto('')} activeOpacity={0.7} accessibilityLabel="Borrar la búsqueda">
                <Ionicons name="close-circle" size={scale(18)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>


          {/* 5 · Resultados o lugares de tu país: una lista plana, sin tarjetas. */}
          {buscando ? (
            <>
              <Seccion titulo="Resultados" />
              {resultados.map((o, i) => (
                <Fila key={o.id} opcion={o} ultima={i === resultados.length - 1} />
              ))}
              {/*
                Y si el catálogo no lo tiene, valen las palabras de la persona.
                Es la opción especial de la lista y se nota apenas: el icono de
                escribir, un fondo crema casi imperceptible y un poco de aire
                por encima. Ni tarjeta ni amarillo pesado.
              */}
              <TouchableOpacity
                onPress={elegirEscrito}
                activeOpacity={0.6}
                style={[styles.fila, styles.filaPropia, { backgroundColor: theme.colors.accent + '0F' }]}
                accessibilityRole="button"
                accessibilityLabel={`Usar "${texto.trim()}" tal cual`}
                accessibilityHint="Etiqueta la publicación con lo que escribiste y vuelve a ella"
              >
                <View style={[styles.iconoCirculo, { backgroundColor: theme.colors.accent + '1A' }]}>
                  <Ionicons name="create-outline" size={scale(16)} color={theme.colors.accentDark} />
                </View>
                <View style={styles.filaDatos}>
                  <Text style={[styles.filaNombre, { color: theme.colors.text }]} numberOfLines={1}>
                    Usar “{texto.trim()}”
                  </Text>
                  <Text style={[styles.filaSub, { color: theme.colors.textSecondary }]}>Tal y como lo escribiste</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : hayCercanos ? (
            <>
              {/*
                Ahora sí son cercanos: hay una lectura fiable y las coordenadas
                del catálogo dicen a qué distancia está cada sitio. El título
                cambia porque el dato que hay detrás ha cambiado.
              */}
              <Seccion
                titulo="📍 Lugares cerca de ti"
                accion={verTodos ? 'Ver menos' : 'Ver más'}
                onAccion={() => setVerTodos((v) => !v)}
              />
              {cercanos.map((c, i) => (
                <Fila key={c.opcion.id} opcion={c.opcion} km={c.km} ultima={i === cercanos.length - 1} />
              ))}
            </>
          ) : delPais.length > 0 ? (
            <>
              {/*
                Sin permiso —o con una lectura demasiado difusa para ordenar por
                cercanía— no se finge: son los de tu país, que es lo que Weë sabe
                de verdad. El título cuenta lo que hay, no lo que quedaría bien.
              */}
              <Seccion
                titulo={`📍 Lugares en ${userProfile?.countryName || 'tu país'}`}
                accion={verTodos ? 'Ver menos' : 'Ver más'}
                onAccion={() => setVerTodos((v) => !v)}
              />
              {delPais.map((o, i) => (
                <Fila key={o.id} opcion={o} ultima={i === delPais.length - 1} />
              ))}
            </>
          ) : (
            <Text style={[styles.aviso, { color: theme.colors.textSecondary }]}>
              Busca una ciudad o un país para etiquetar tu publicación.
            </Text>
          )}

          {/*
            Aquí NO hay botón de confirmar. Tocar un lugar ES elegirlo, y se
            vuelve al compositor en el mismo gesto: pedir un "Listo" después
            sería un paso de más para decir lo que ya se dijo al tocar.
            Para salir sin elegir está "Back", arriba.
          */}
        </ScrollView>
      </EspacioDeEscritura>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  fill: { flex: 1 },

  /* La cabecera, como la del compositor: sin línea, el título en el centro. */
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  cancelar: {
    width: scale(72),
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelarTexto: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  tituloCabecera: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },

  /* Sin `gap`: las filas se separan con su pelo, y los bloques con su margen. */
  contenido: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl * 2,
  },

  /* La marca, discreta y con aire: presente, no protagonista. */
  marca: {
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  logo: {
    width: scale(86),
    height: scale(30),
  },
  /* El buscador: blanco, borde de un punto, redondo, 48 de alto, sin sombra. */
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    minHeight: 48,
    marginBottom: SPACING.sm,
  },
  buscadorCampo: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: SPACING.md,
  },

  /* El círculo del icono: pequeño y crema, 32 de lado. */
  iconoCirculo: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
   * Una línea de la lista: sin marco, sin fondo, sin esquinas. 56 de alto como
   * mínimo para que se toque sin apuntar; el separador se lo pone cada fila
   * salvo la última.
   */
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    minHeight: 56,
  },
  /* "Usar lo que escribiste": un poco de aire encima y esquinas para su fondo. */
  filaPropia: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  filaDatos: { flex: 1, minWidth: 0 },
  /* El nombre manda; la región y el país acompañan en gris, más pequeños. */
  filaNombre: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  filaSub: {
    fontSize: FONT_SIZE.sm,
    marginTop: 1,
  },
  filaDistancia: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    fontVariant: ['tabular-nums'],
  },

  /* El rótulo de cada bloque, pequeño y en mayúsculas, con su acción a la derecha. */
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  seccionTitulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  seccionAccion: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },

  aviso: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },

});

export default AgregarUbicacionScreen;
