import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import CreditsPill from '../CreditsPill';
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
  /** La frase de la sección. Su primera palabra va marcada. */
  lema: string;
  /** Lo que cabe dentro, cuando la sección lo cuenta. */
  descripcion?: string;
  /**
   * Qué hace el volver. Por defecto, lo de siempre: atrás si hay atrás, y si no
   * al Home —nadie debe quedarse encerrado en una sección—.
   */
  onVolver?: () => void;
  /**
   * El saldo, arriba a la derecha. Lo llevan las secciones donde crear cuesta
   * Credits y conviene saber cuántos quedan ANTES de empezar a pedir —hoy Weë
   * Chef—; las que todavía no cobran nada no lo enseñan, para no poner un número
   * al lado de algo que no lo gasta.
   */
  credits?: boolean;
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
const CabeceraDeSeccion: React.FC<Props> = ({ nombre, lema, descripcion, onVolver, credits }) => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();

  const corte = lema.indexOf(' ');
  const primera = corte > 0 ? lema.slice(0, corte) : lema;
  const resto = corte > 0 ? lema.slice(corte) : '';

  const volver = onVolver || (() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')));

  return (
    <View style={styles.bloque}>
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

      <View style={styles.textos}>
        <View style={styles.filaDelNombre}>
          <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>
            <Text style={styles.nombreWee}>Weë</Text>
            <Text style={styles.nombreSeccion}>{nombre}</Text>
          </Text>

          {/*
            EL SALDO, A LA ALTURA DEL NOMBRE.
            En la misma línea y al otro extremo: se lee de un vistazo al entrar
            —antes de pedir nada— y no se cruza con el lema ni con la frase de
            abajo. Si no hay sesión, la píldora no se dibuja sola.
          */}
          {credits && (
            <View style={styles.saldo}>
              <CreditsPill compact />
            </View>
          )}
        </View>

        <Text style={[styles.lema, { color: theme.colors.text }]}>
          <Text style={styles.lemaVerbo}>{primera}</Text>
          {resto}
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
   * La fila de la identidad: volver · W · nombre. El aire de los lados es menor
   * que antes porque ahora hay tres cosas en la misma línea, y el nombre —que es
   * lo que dice dónde estás— no puede quedarse sin ancho en un teléfono de 360.
   */
  bloque: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
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
    marginTop: scale(8),
  },
  /*
   * 72 de caja para una piedra de unos 58 de ancho: lo bastante grande para que
   * la W se reconozca sola, sin comerse el sitio del nombre en un teléfono de
   * 360. Se sube un poco para que su centro caiga a la altura del nombre.
   */
  logo: {
    width: scale(72),
    height: scale(72),
    marginTop: -scale(10),
    marginLeft: scale(2),
    marginRight: SPACING.sm,
  },
  /* `flex: 1` + `minWidth: 0`: la columna se reparte lo que queda y parte líneas en vez de desbordar. */
  textos: {
    flex: 1,
    minWidth: 0,
    gap: scale(2),
  },
  filaDelNombre: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  /* La píldora baja lo justo para que su centro caiga a la altura del nombre. */
  saldo: { marginTop: scale(7) },
  nombre: {
    fontSize: scale(34),
    letterSpacing: scale(-1),
    lineHeight: scale(40),
    /* Con saldo al lado, el nombre cede ancho antes que salirse de la pantalla. */
    flexShrink: 1,
  },
  nombreWee: { fontWeight: FONT_WEIGHT.bold },
  nombreSeccion: { fontWeight: FONT_WEIGHT.regular },
  lema: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(-0.3),
    lineHeight: scale(27),
    marginTop: SPACING.xs,
  },
  lemaVerbo: { fontWeight: FONT_WEIGHT.semibold },
  /*
   * La descripción lleva su propio salto de línea en el diccionario: son dos
   * ideas —qué puedes hacer, y que no hace falta ir a otro sitio— y partidas se
   * leen mejor. Si en un teléfono estrecho la primera no cabe, se parte sola.
   */
  descripcion: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: scale(22),
    marginTop: SPACING.sm,
  },
});

export default CabeceraDeSeccion;
