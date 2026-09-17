import React, { useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useCajaQueCrece } from './CajaQueCrece';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** El alto de la caja vacía: una línea con aire, lista para escribir. */
const ALTO_MINIMO = scale(52);

export interface AccionDeLaCaja {
  /** Nombre del icono de Ionicons. */
  icono: string;
  /** Lo que se lee en voz alta y en el tooltip. */
  etiqueta: string;
  alPulsar: () => void;
}

interface Props {
  valor: string;
  onCambiar: (texto: string) => void;
  /** El botón amarillo. */
  onEnviar: () => void;
  etiquetaEnviar: string;
  placeholder: string;
  /** Los botones grises de la izquierda. Sin ellos, la fila lleva solo el amarillo. */
  acciones?: AccionDeLaCaja[];
  /**
   * Los que van pegados al de enviar, al otro lado del hueco.
   *
   * Casi ninguna sección los necesita: sus botones preparan la creación y viven
   * todos juntos a la izquierda. Weë Brain sí (decisión del usuario,
   * 2026-09-16): allí el micrófono es otra forma de DECIR lo mismo que se
   * escribe, así que va junto al de enviar y no con los de adjuntar.
   *
   * Sin esta lista la fila es exactamente la de siempre.
   */
  accionesDerecha?: AccionDeLaCaja[];
  /**
   * Cómo se llama el campo para quien no lo ve. Por defecto, lo que dice el
   * propio `placeholder`, que es lo normal. Se pasa aparte cuando la caja va
   * vacía a propósito —Weë Chef— y aun así tiene que poder anunciarse.
   */
  etiqueta?: string;
  /** Mientras se está creando, el botón no acepta otro toque. */
  ocupado?: boolean;
  /** Intro envía en vez de hacer salto de línea. Para las cajas que abren un flujo. */
  enviarConIntro?: boolean;
  editable?: boolean;
  /**
   * LA CAJA SIN CONTORNO: NI BORDE NI SOMBRA.
   *
   * Weë Brain la pide así (decisión del usuario, 2026-09-16): allí la
   * conversación tampoco lleva tarjeta ni bordes, y una raya alrededor de la
   * caja era lo único que quedaba dibujando un cuadro en la pantalla.
   *
   * Lo que la define entonces es su relleno, no su contorno: se apoya en el
   * mismo gris claro que las burbujas. Sin esto, la caja es la de siempre, y
   * ninguna otra sección se entera.
   */
  sinMarco?: boolean;
}

/**
 * LA CAJA DE WEË AI: UNA SOLA, LA MISMA EN TODAS LAS SECCIONES.
 *
 * Es la lámina de Weë Studio y Weë Design, y desde el 2026-09-15 es también la
 * de Weë Chef, Weë Music, Weë Business y Weë Travel (decisión del usuario: se
 * retiran los diseños antiguos —la píldora estrecha con el botón al lado—).
 * Weë Brain se pasará después.
 *
 * ── Qué es, y por qué así ────────────────────────────────────────────────────
 *
 * Una lámina con el texto arriba y una fila de botones abajo. El texto manda:
 * ocupa el ancho entero y crece con lo escrito. Los botones van debajo, en su
 * propia fila, y no se mueven de ahí: son pocos, siempre los mismos y siempre en
 * el mismo sitio, así que no hay que buscarlos.
 *
 * El amarillo en Weë significa crear, así que lo lleva el único que crea. Los
 * grises preparan la creación y compiten en cuanto se pintan del mismo color. El
 * de crear se apaga cuando no hay nada escrito, y eso se ve antes de tocarlo.
 *
 * ── Crece, y sus botones no se van ───────────────────────────────────────────
 *
 * Crece con el texto hasta llenar lo que se ve de la página; ahí se para y el
 * texto se desplaza dentro, para que la fila de botones siga a la vista por
 * largo que sea el prompt. Eso lo resuelve `useCajaQueCrece`.
 */
const CajaDePrompt: React.FC<Props> = ({
  valor, onCambiar, onEnviar, etiquetaEnviar, placeholder, etiqueta, acciones, accionesDerecha, ocupado, enviarConIntro, editable, sinMarco,
}) => {
  const { theme } = useTheme();
  const hayTexto = valor.trim().length > 0;
  /* Sin nada escrito, la caja vuelve a medir una línea. No se fía de la medida vieja. */
  const caja = useCajaQueCrece({ altoMinimo: ALTO_MINIMO, vacia: !hayTexto });
  const puedeEnviar = hayTexto && !ocupado && editable !== false;

  /*
   * Al enviar, el teclado se retira.
   *
   * Lo que sigue —"Creando…", el resultado, la siguiente pantalla— es para
   * mirarlo, no para seguir escribiendo, y con el teclado delante la mitad de
   * eso queda tapado. Además deja claro que la petición entró: algo pasó.
   */
  const enviar = useCallback(() => {
    Keyboard.dismiss();
    onEnviar();
  }, [onEnviar]);

  return (
    <View
      ref={caja.refCaja}
      onLayout={caja.alMedirCaja}
      style={[
        styles.caja,
        sinMarco
          ? { backgroundColor: theme.colors.surface }
          : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        sinMarco && styles.cajaSinMarco,
      ]}
    >
      <TextInput
        {...caja.propsDelCampo}
        style={[
          styles.campo,
          { color: theme.colors.text, height: caja.altoDelTexto },
          isWeb && ({ outlineStyle: 'none' } as any),
        ]}
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        editable={editable}
        accessibilityLabel={etiqueta ?? placeholder}
        /* Donde escribir es el principio de algo, Intro lo empieza; donde es redactar, hace salto de línea. */
        {...(enviarConIntro ? { onSubmitEditing: enviar, blurOnSubmit: true, returnKeyType: 'send' as const } : null)}
      />

      {/*
        EL AIRE DE LA FILA SE ESTRECHA CUANDO HAY MUCHOS BOTONES.
        Con cuatro grises y el amarillo sobra sitio hasta en un teléfono de 360;
        con cinco —Weë Chef, que además lleva cámara— la fila se salía por doce
        puntos. Lo que se encoge es el hueco ENTRE botones, nunca el botón: el
        dedo sigue teniendo sus 42 y sus 50, que es lo que no se puede tocar.
      */}
      <View style={[styles.acciones, (acciones?.length ?? 0) + (accionesDerecha?.length ?? 0) >= 5 && styles.accionesJuntas]}>
        {(acciones ?? []).map((accion) => (
          <TouchableOpacity
            /*
             * La clave lleva icono Y etiqueta. Con la etiqueta sola, dos botones
             * que se llaman igual —pasó en Weë Brain con "Adjuntar"— comparten
             * clave y React se queja en voz alta delante de la persona.
             */
            key={accion.icono + '·' + accion.etiqueta}
            style={[styles.accion, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={accion.alPulsar}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
          >
            <Ionicons name={accion.icono as any} size={scale(20)} color={theme.colors.text} />
          </TouchableOpacity>
        ))}
        <View style={styles.empuje} />
        {(accionesDerecha ?? []).map((accion) => (
          <TouchableOpacity
            key={accion.icono + '·' + accion.etiqueta}
            style={[styles.accion, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={accion.alPulsar}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
          >
            <Ionicons name={accion.icono as any} size={scale(20)} color={theme.colors.text} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.enviar, { backgroundColor: puedeEnviar ? theme.colors.accent : theme.colors.surface }]}
          onPress={enviar}
          disabled={!puedeEnviar}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={etiquetaEnviar}
        >
          <Ionicons name="arrow-up" size={scale(22)} color={puedeEnviar ? '#1F2937' : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /*
   * Una sola lámina para el texto y sus botones. Separarlos en dos tarjetas
   * hacía que los botones parecieran de la pantalla y no de lo que se escribe.
   */
  caja: {
    borderRadius: scale(26),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    /* Sombra muy suave: levanta la caja del fondo sin dibujar una caja encima. */
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: scale(14),
    shadowOffset: { width: 0, height: scale(4) },
    elevation: 2,
  },
  /* Sin contorno: la define su relleno. Ni raya ni sombra que dibujen un cuadro. */
  cajaSinMarco: {
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  campo: {
    fontSize: FONT_SIZE.md,
    lineHeight: scale(22),
    paddingTop: SPACING.sm,
    paddingBottom: 0,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  accionesJuntas: { gap: SPACING.xs },
  accion: {
    width: scale(42),
    height: scale(42),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empuje: {
    flex: 1,
  },
  /* 50 con `scale()` son 45 en web: sigue por encima del mínimo para el pulgar. */
  enviar: {
    width: scale(50),
    height: scale(50),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CajaDePrompt;

/** Para quien necesite el alto de la caja vacía (una línea con su aire). */
export const ALTO_MINIMO_DE_LA_CAJA = ALTO_MINIMO;

/**
 * La invitación de la sección, encima de su caja: "Cuéntame, ¿qué te gustaría
 * cocinar hoy?".
 *
 * Una línea y nada más. El nombre de la sección ya lo dice la cabecera, justo
 * encima, y repetirlo —"¡Hola! Soy Weë Chef"— era decir dos veces lo mismo en
 * dos dedos de pantalla.
 */
export const InvitacionDeLaCaja: React.FC<{ texto: string }> = ({ texto }) => {
  const { theme } = useTheme();
  return <Text style={[estilosDeLaInvitacion.texto, { color: theme.colors.textSecondary }]}>{texto}</Text>;
};

const estilosDeLaInvitacion = StyleSheet.create({
  texto: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(21),
    paddingHorizontal: SPACING.xs,
  },
});
