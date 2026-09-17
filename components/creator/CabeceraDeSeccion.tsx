import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import CreditsPill from '../CreditsPill';
import { useMarcoDeSeccion } from './MarcoDeSeccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LA W DE WEË, LA OFICIAL.
 *
 * Es el mismo archivo que usa la aplicación como icono —la piedra amarilla con
 * la W blanca—, no una copia ni una W escrita con una fuente. Si algún día
 * cambia el icono de la app, cambia también aquí sin tocar nada, que es justo
 * lo que tiene que pasar con un logo.
 *
 * El dibujo no ocupa el lienzo entero: trae aire transparente alrededor, como
 * cualquier icono de aplicación. Por eso la caja es algo mayor que lo que se ve
 * de la piedra; lo que importa es que la W se reconozca de un vistazo.
 */
const W_DE_WEE = require('../../assets/icon.png');

interface Props {
  /** Lo que va detrás de "Weë": Studio, Design, Chef, Travel… */
  nombre: string;
  /**
   * La frase de la sección, centrada y en grande: "Crea sin límites.". Llega
   * entera y se parte al pintar —primera palabra en el color del texto, resto en
   * amarillo—, porque el orden de las palabras cambia de un idioma a otro.
   */
  lema: string;
  /** Lo que cabe dentro, debajo del lema y en gris. Dos renglones cortos. */
  descripcion?: string;
  /**
   * Qué hace el volver. Por defecto, lo de siempre: atrás si hay atrás, y si no
   * al Home —nadie debe quedarse encerrado en una sección—.
   */
  onVolver?: () => void;
}

/**
 * LA CABECERA DE UNA SECCIÓN DE WEË AI.
 *
 * Nació en Weë Studio y desde el 2026-09-15 la llevan todas (decisión del
 * usuario): arriba de una sección no va nada más que esto.
 *
 * La W y el nombre en una fila, y debajo —alineado con el nombre, no con el
 * logo— el lema y lo que cabe dentro. Así el bloque de texto se lee como una
 * sola columna que empieza donde empieza la palabra, y el logo queda a su lado
 * como una firma, no encima de todo como un cartel.
 *
 * Sin Credits, sin notificaciones y sin tu cara: todo eso ya está a un toque, y
 * repetirlo aquí llenaría de ruido justo el sitio donde se empieza a pensar qué
 * crear. Tampoco hay adornos: ni círculos de fondo ni degradados. La presencia
 * la ponen la W amarilla y el tamaño del nombre.
 *
 * ── "WeëStudio", junto ───────────────────────────────────────────────────────
 *
 * Sin espacio, y con dos pesos: "Weë" pesa y "Studio" no. El peso marca dónde
 * termina la marca y empieza el sitio, que es lo que haría el espacio, sin
 * partir el nombre en dos palabras. Es marca y no pasa por el traductor.
 *
 * ── El lema, con el verbo delante ────────────────────────────────────────────
 *
 * "Crea sin límites." lleva la primera palabra más marcada. La frase llega
 * entera —el orden de las palabras cambia de un idioma a otro y dos trozos
 * pegados se rompen al traducir— y aquí se separa la primera palabra al pintar.
 * En español y en inglés esa palabra suele ser el verbo ("Crea", "Create"), que
 * es justo lo que se quiere marcar.
 */
/**
 * CUÁNTO MIDE EL NOMBRE. UNO SOLO, PARA TODAS LAS SECCIONES.
 *
 * Decisión del usuario (2026-09-15): la leyenda se achica lo justo para que
 * quepa con el saldo al lado, y ese tamaño lo llevan TODAS. Un tamaño por
 * sección —34 en Chef, 25 en Business— haría que la misma cabecera se leyera
 * distinta según dónde estés, que es justo lo contrario de lo que se busca.
 *
 * El 26 sale del peor caso, "WeëBusiness", en el teléfono más estrecho y con el
 * saldo puesto: es el número más grande en el que ese nombre todavía entra
 * entero. No se deja al sistema —`adjustsFontSizeToFit` no encoge un texto con
 * trozos de distinto peso dentro, y en Android se come la última letra sin
 * avisar—, porque un nombre a medias no dice dónde estás.
 */
export const TAMANO_DEL_NOMBRE = 26;

/**
 * CUÁNTO MIDE EL LEMA, SEGÚN LO LARGO QUE SEA.
 *
 * Aquí sí cambia con el texto, y por una razón distinta a la del nombre: el
 * nombre es una palabra y el lema es una frase, y las frases de Weë AI no miden
 * lo mismo. "Crea sin límites." son diecisiete letras y a 31 ocupan un renglón;
 * "Tu equipo de marketing, ventas y estrategia en un solo lugar." son sesenta, y
 * al mismo tamaño llenarían media pantalla de amarillo.
 *
 * Lo que se mantiene igual en todas es el SITIO y el color —centrado, la primera
 * palabra oscura y el resto en amarillo—; lo que cede es el cuerpo, para que una
 * frase larga no se convierta en un cartel.
 */
export const tamanoDelLema = (lema: string): number => {
  if (lema.length <= 24) return 31;
  if (lema.length <= 44) return 25;
  return 21;
};

const CabeceraDeSeccion: React.FC<Props> = ({ nombre, lema, descripcion, onVolver }) => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  /*
   * Qué aporta el marco que la envuelve: si ya enseña el saldo —para no
   * repetirlo— y cuánto aire mete por los lados —para devolverlo—.
   */
  const marco = useMarcoDeSeccion();
  const tamano = scale(TAMANO_DEL_NOMBRE);
  const tamanoLema = scale(tamanoDelLema(lema));

  const volver = onVolver || (() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')));

  /*
   * El lema, partido en dos: la primera palabra en el color del texto y el resto
   * en amarillo. "Crea" + "sin límites." La frase llega entera del diccionario
   * —el orden de las palabras cambia de un idioma a otro y dos trozos pegados se
   * rompen al traducir— y se parte aquí al pintar.
   */
  const corte = lema.indexOf(' ');
  const primera = corte > 0 ? lema.slice(0, corte) : lema;
  const resto = corte > 0 ? lema.slice(corte) : '';

  const filaDeIdentidad = (
    <View style={styles.identidad}>
      {/*
        EL VOLVER, A LA IZQUIERDA DEL LOGO Y A SU ALTURA.
        En la misma fila, no encima: la cabecera es una sola línea de identidad
        —volver, marca, nombre— y el logo no baja para dejarle sitio, solo se
        corre un poco a la derecha. Se dibuja pequeño y se toca grande: el
        `hitSlop` le da los 44 de un pulgar sin robarle ancho al nombre.
      */}
      <TouchableOpacity
        onPress={volver}
        style={[styles.volver, isWeb && ({ cursor: 'pointer' } as any)]}
        activeOpacity={0.7}
        hitSlop={{ top: 14, bottom: 14, left: 12, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="arrow-back" size={scale(23)} color={theme.colors.text} />
      </TouchableOpacity>

      <Image
        source={W_DE_WEE}
        style={styles.logo}
        contentFit="contain"
        transition={0}
        /* La marca ya se lee en el nombre de al lado: leerla dos veces sobra. */
        accessible={false}
      />

      {/*
        EL NOMBRE ENTERO, SIEMPRE.
        Un nombre cortado —"WeëStu…"— no dice dónde estás, que es lo único que
        tiene que hacer. El tamaño es uno para todas: `TAMANO_DEL_NOMBRE`.
      */}
      <Text style={[styles.nombre, { fontSize: tamano, lineHeight: tamano * 1.18, color: theme.colors.text }]} numberOfLines={1}>
        <Text style={styles.nombreWee}>Weë</Text>
        <Text style={styles.nombreSeccion}>{nombre}</Text>
      </Text>

      {/* El hueco que empuja el saldo al otro extremo. No se toca ni se lee. */}
      <View style={styles.empuje} />

      {/*
        EL SALDO, AL FINAL DE LA FILA DE IDENTIDAD.
        Se lee de un vistazo al entrar —antes de pedir nada— y no se cruza con lo
        que viene debajo. Va en todas las secciones y no por una opción de cada
        pantalla (decisión del usuario, 2026-09-15): un saldo que aparece en unas
        sí y en otras no deja de ser un dato fiable y pasa a ser un adorno. Es de
        la CUENTA, así que no cambia al cambiar de perfil, y si no hay sesión la
        píldora no se dibuja sola.

        Y sale UNA vez: si el marco de la experiencia ya lo enseña —su franja en
        el teléfono, su barra lateral en escritorio—, aquí se calla.
      */}
      {!marco.saldoALaVista && <CreditsPill compact />}
    </View>
  );

  return (
    /*
      El aire que mete el marco se devuelve aquí. Sin esto, la MISMA cabecera
      tendría 32 puntos menos de ancho dentro del marco que fuera de él.
    */
    <View style={[styles.bloque, marco.aireLateral ? { marginHorizontal: -marco.aireLateral } : null]}>
      {filaDeIdentidad}

      {/*
        LA PRESENTACIÓN, CENTRADA (decisión del usuario, 2026-09-15).
        Arriba, a la izquierda, la identidad: dónde estás y cuánto te queda.
        Aquí en medio, lo que esta sección te ofrece, centrado y en grande, con
        la segunda mitad de la frase en amarillo —el color de Weë, el que
        significa crear—. Debajo, en gris, lo que cabe dentro.

        Sin adornos: hubo una rayita amarilla debajo y se quitó a la media hora
        (decisión del usuario, 2026-09-15). Lo que separa de la caja es el aire,
        no una línea.
      */}
      <View style={styles.presentacion}>
        <Text style={[styles.lema, { fontSize: tamanoLema, lineHeight: tamanoLema * 1.22, color: theme.colors.text }]}>
          <Text>{primera}</Text>
          {!!resto && <Text style={{ color: theme.colors.accent }}>{resto}</Text>}
        </Text>

        {!!descripcion && (
          <Text style={[styles.descripcion, { color: theme.colors.textSecondary }]}>{descripcion}</Text>
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /*
   * La cabecera entera: arriba la fila de identidad, debajo la presentación.
   * Poco aire abajo, porque lo que viene después es la caja donde se escribe,
   * que es a lo que se entra.
   */
  bloque: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  /* Volver · W · nombre · saldo, todo en una línea y pegado arriba. */
  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empuje: { flex: 1 },
  /*
   * Se dibuja en 32 y se toca en 44: los doce que faltan los pone el `hitSlop`.
   * Así el pulgar tiene su sitio sin que la flecha se coma el del nombre. El
   * margen de arriba lo deja a la altura de la W, no del borde de su caja.
   */
  volver: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /*
   * 52 de caja para una piedra de unos 42 de ancho: una insignia al lado del
   * nombre, no un cartel. El dibujo trae aire transparente alrededor, así que la
   * caja es mayor que lo que se ve.
   */
  logo: {
    width: scale(52),
    height: scale(52),
    marginLeft: scale(2),
    marginRight: SPACING.xs,
  },
  /* El tamaño y su interlínea los pone `TAMANO_DEL_NOMBRE`. */
  nombre: {
    letterSpacing: scale(-1),
    /* Con saldo al lado, el nombre cede ancho antes que salirse de la pantalla. */
    flexShrink: 1,
  },
  nombreWee: { fontWeight: FONT_WEIGHT.bold },
  nombreSeccion: { fontWeight: FONT_WEIGHT.regular },
  /* Todo centrado, con su propio aire: es la presentación de la sección. */
  presentacion: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  /*
   * El lema manda en la pantalla: más grande que el nombre y en negrita. El
   * nombre dice DÓNDE estás —y ya lo dice el logo de al lado—; esto dice qué
   * puedes hacer, que es a lo que se viene.
   */
  lema: {
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.6),
    textAlign: 'center',
  },
  /*
   * La descripción lleva su propio salto de línea en el diccionario: son dos
   * ideas —qué puedes hacer, y que no hace falta ir a otro sitio— y partidas se
   * leen mejor. Si en un teléfono estrecho una no cabe, se parte sola.
   */
  descripcion: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: scale(23),
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});

export default CabeceraDeSeccion;
