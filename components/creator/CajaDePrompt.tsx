import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { useDireccion } from '../../hooks/useDireccion';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useEnEspacioProfesional } from '../../contexts/EspacioProfesionalContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useCajaQueCrece } from './CajaQueCrece';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { MARCA } from '../../constants/marca';
import { RellenoDeMarca } from '../GradienteDeMarca';

const isWeb = Platform.OS === 'web';

/** El alto de la caja vacía: una línea con aire, lista para escribir. */
const ALTO_MINIMO = scale(52);

export interface AccionDeLaCaja {
  /** Nombre del icono de Ionicons. */
  icono: string;
  /** Lo que se lee en voz alta y en el tooltip. */
  etiqueta: string;
  alPulsar: () => void;
  /** En Weë versión creator, con sitio: la palabra corta que se ve al lado del icono. */
  texto?: string;
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
  /**
   * En Weë versión creator, con sitio: la palabra que se lee en el botón de enviar
   * ("Crear", "Cocinar"). Sin ella —o en el teléfono, si no cabe— es la flecha.
   */
  textoEnviar?: string;
  /** Sin dorado: la caja de una sección en blanco y negro. El contorno y el botón de crear van con la tinta del tema. */
  monocromo?: boolean;
  /**
   * El traje de vitrina (referencia del dueño para Weë Chef, 2026-11-02): contorno dorado con halo, un destello a la
   * izquierda del texto, el de crear redondo a su derecha y los botones en una píldora debajo, separados por rayas.
   * Crece igual y sus botones no se van.
   */
  vitrina?: boolean;
  /** La frase de dentro solo en el traje de vitrina (Weë Chef la lleva vacía fuera de él). */
  textoDeVitrina?: string;
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
  valor, onCambiar, onEnviar, etiquetaEnviar, placeholder, etiqueta, acciones, accionesDerecha, ocupado, enviarConIntro, editable, sinMarco, textoEnviar, monocromo, vitrina, textoDeVitrina,
}) => {
  const { theme } = useTheme();
  const dir = useDireccion();
  const tono = monocromo ? theme.colors.text : theme.colors.accent;
  /*
   * LA MISMA CAJA, CON EL TRAJE DE WEË VERSIÓN CREATOR.
   * Crece igual y sus botones no se van. Solo cambia el dibujo: hairline y radio
   * 14 en vez de sombra, botones que dicen qué hacen si hay sitio para decirlo.
   */
  const pro = useEnEspacioProfesional();
  const { width } = useResponsive();
  const conPalabras = pro && width >= 600;
  const hayTexto = valor.trim().length > 0;
  /* Sin nada escrito, la caja vuelve a medir una línea. No se fía de la medida vieja. */
  const caja = useCajaQueCrece({ altoMinimo: ALTO_MINIMO, vacia: !hayTexto });
  const puedeEnviar = hayTexto && !ocupado && editable !== false;

  /*
   * LA CAJA RESPONDE. Al entrar a escribir se enciende su contorno y una luz la recorre por arriba; al haber algo
   * escrito, el botón de crear crece y se enciende. Solo en la caja del teléfono: la de creator es deliberadamente quieta.
   */
  const conLuz = !pro && !sinMarco && !vitrina;
  const [enfocada, setEnfocada] = useState(false);
  const [ancho, setAncho] = useState(0);
  const foco = useRef(new Animated.Value(0)).current;
  const recorrido = useRef(new Animated.Value(0)).current;
  const listo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(foco, { toValue: enfocada ? 1 : 0, duration: 220, useNativeDriver: true }).start();
    if (!enfocada || !conLuz) return;
    recorrido.setValue(0);
    const vuelta = Animated.loop(Animated.timing(recorrido, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    vuelta.start();
    return () => vuelta.stop();
  }, [enfocada, conLuz, foco, recorrido]);
  useEffect(() => {
    Animated.spring(listo, { toValue: puedeEnviar ? 1 : 0, speed: 22, bounciness: 9, useNativeDriver: true }).start();
  }, [puedeEnviar, listo]);

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
        pro && styles.cajaPro,
        /* Weë Brain la pide sin contorno también aquí: la define su relleno. */
        pro && sinMarco && styles.cajaSinMarco,
        vitrina && !pro && styles.cajaVitrina,
      ]}
    >
      {vitrina && !pro ? (
        <>
          <View style={styles.filaVitrina}>
            <Ionicons name="sparkles" size={scale(24)} color={theme.colors.accent} style={styles.destelloVitrina} />
            <TextInput
              {...caja.propsDelCampo}
              style={[styles.campo, styles.campoVitrina, { color: theme.colors.text, height: caja.altoDelTexto }, isWeb && ({ outlineStyle: 'none' } as any)]}
              value={valor}
              onChangeText={onCambiar}
              placeholder={textoDeVitrina ?? placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              editable={editable}
              accessibilityLabel={etiqueta ?? placeholder}
              {...(enviarConIntro ? { onSubmitEditing: enviar, blurOnSubmit: true, returnKeyType: 'send' as const } : null)}
            />
            <Animated.View style={{ transform: [{ scale: listo.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }] }}>
              <TouchableOpacity
                style={[styles.enviarVitrina, { backgroundColor: puedeEnviar ? theme.colors.accent : MARCA.velo(0.2) }]}
                onPress={enviar}
                disabled={!puedeEnviar}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={etiquetaEnviar}
                accessibilityState={{ disabled: !puedeEnviar }}
              >
                {puedeEnviar && <RellenoDeMarca radio={BORDER_RADIUS.full} />}
                {/* El avión de enviar señala hacia delante: en RTL se refleja, y su empujón óptico de 3 px cambia de lado con él. */}
                <IconoDireccional name="send" size={scale(22)} color={puedeEnviar ? MARCA.sobrePrimario : MARCA.primario} style={dir.esRTL ? { marginRight: 3 } : { marginLeft: 3 }} />
              </TouchableOpacity>
            </Animated.View>
          </View>
          <View style={[styles.barraVitrina, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {[...(acciones ?? []), ...(accionesDerecha ?? [])].map((accion, i) => (
              <React.Fragment key={accion.icono + '·' + accion.etiqueta}>
                {i > 0 && <View style={[styles.rayaVitrina, { backgroundColor: theme.colors.border }]} />}
                <TouchableOpacity style={styles.accionVitrina} onPress={accion.alPulsar} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={accion.etiqueta}>
                  <Ionicons name={accion.icono as any} size={scale(26)} color={theme.colors.text} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </>
      ) : (
      <>
      {conLuz && (
        <Animated.View pointerEvents="none" onLayout={(e) => setAncho(e.nativeEvent.layout.width)} style={[styles.luz, { borderColor: tono, opacity: foco }]}>
          <Animated.View style={[styles.destello, { transform: [{ translateX: recorrido.interpolate({ inputRange: [0, 1], outputRange: [-ancho * 0.5, ancho] }) }] }]}>
            <LinearGradient colors={['transparent', tono, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </Animated.View>
      )}
      <TextInput
        {...caja.propsDelCampo}
        onFocus={() => { caja.propsDelCampo.onFocus(); setEnfocada(true); }}
        onBlur={() => { caja.propsDelCampo.onBlur(); setEnfocada(false); }}
        style={[
          styles.campo,
          { color: theme.colors.text, height: caja.altoDelTexto },
          pro && styles.campoPro,
          /* Vacía, un texto de ejemplo largo no enseña barra de desplazamiento. */
          pro && !hayTexto && isWeb && ({ overflow: 'hidden' } as any),
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
      <View style={[styles.acciones, (acciones?.length ?? 0) + (accionesDerecha?.length ?? 0) >= 5 && styles.accionesJuntas, pro && styles.accionesPro]}>
        {(acciones ?? []).map((accion) => pro ? (
          <AccionDeCreator key={accion.icono + '·' + accion.etiqueta} accion={accion} conPalabras={conPalabras} />
        ) : (
          <TouchableOpacity
            /*
             * La clave lleva icono Y etiqueta. Con la etiqueta sola, dos botones
             * que se llaman igual —pasó en Weë Brain con "Adjuntar"— comparten
             * clave y React se queja en voz alta delante de la persona.
             */
            key={accion.icono + '·' + accion.etiqueta}
            style={styles.accion}
            onPress={accion.alPulsar}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
          >
            <Ionicons name={accion.icono as any} size={scale(22)} color={theme.colors.text} />
          </TouchableOpacity>
        ))}
        <View style={styles.empuje} />
        {(accionesDerecha ?? []).map((accion) => pro ? (
          <AccionDeCreator key={accion.icono + '·' + accion.etiqueta} accion={accion} conPalabras={conPalabras} />
        ) : (
          <TouchableOpacity
            key={accion.icono + '·' + accion.etiqueta}
            style={styles.accion}
            onPress={accion.alPulsar}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
          >
            <Ionicons name={accion.icono as any} size={scale(22)} color={theme.colors.text} />
          </TouchableOpacity>
        ))}
        {pro ? (
          <TouchableOpacity
            style={[
              styles.enviarPro,
              { backgroundColor: puedeEnviar ? theme.colors.accent : theme.colors.surface },
              isWeb && ({ cursor: puedeEnviar ? 'pointer' : 'default' } as any),
            ]}
            onPress={enviar}
            disabled={!puedeEnviar}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={etiquetaEnviar}
            accessibilityState={{ disabled: !puedeEnviar }}
          >
            {puedeEnviar && <RellenoDeMarca radio={999} />}
            {textoEnviar && (conPalabras || textoEnviar.length <= 12) ? (
              <Text style={[styles.enviarProTexto, { color: puedeEnviar ? '#1F2937' : theme.colors.textSecondary }]}>{textoEnviar}</Text>
            ) : (
              <Ionicons name="arrow-up" size={18} color={puedeEnviar ? '#1F2937' : theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        ) : (
        <Animated.View style={{ transform: [{ scale: listo.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] }}>
          <TouchableOpacity
            style={[styles.enviar, { backgroundColor: theme.colors.surface }]}
            onPress={enviar}
            disabled={!puedeEnviar}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={etiquetaEnviar}
            accessibilityState={{ disabled: !puedeEnviar }}
          >
            {puedeEnviar && (monocromo
              ? <LinearGradient colors={[tono, tono]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              : <RellenoDeMarca radio={BORDER_RADIUS.full} />)}
            <Ionicons name="arrow-up" size={scale(22)} color={!puedeEnviar ? theme.colors.textSecondary : monocromo ? theme.colors.background : '#1F2937'} />
          </TouchableOpacity>
        </Animated.View>
        )}
      </View>
      </>
      )}
    </View>
  );
};

/** Un botón de la fila, en creator: 36 de alto, y su palabra si hay sitio para ella. */
const AccionDeCreator: React.FC<{ accion: AccionDeLaCaja; conPalabras: boolean }> = ({ accion, conPalabras }) => {
  const { theme } = useTheme();
  const conTexto = conPalabras && !!accion.texto;
  return (
    <TouchableOpacity
      style={[styles.accionPro, conTexto && styles.accionProConTexto, { borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as any)]}
      onPress={accion.alPulsar}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accion.etiqueta}
    >
      <Ionicons name={accion.icono as any} size={17} color={theme.colors.textSecondary} />
      {conTexto && <Text style={[styles.accionProTexto, { color: theme.colors.text }]}>{accion.texto}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cajaPro: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  campoPro: { fontSize: 15, lineHeight: 22, paddingTop: 4 },
  accionesPro: { gap: 6 },
  accionPro: {
    minWidth: 36, height: 36, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  accionProConTexto: { paddingHorizontal: 12 },
  accionProTexto: { fontSize: 13, fontWeight: '500' },
  enviarPro: { minWidth: 40, height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  enviarProTexto: { fontSize: 13, fontWeight: '600' },
  /*
   * Una sola lámina para el texto y sus botones. Separarlos en dos tarjetas
   * hacía que los botones parecieran de la pantalla y no de lo que se escribe.
   */
  caja: {
    borderRadius: scale(28),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
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
  cajaVitrina: {
    borderWidth: 1.5, borderColor: MARCA.velo(0.75), paddingTop: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md,
    shadowColor: MARCA.primario, shadowOpacity: 0.45, shadowRadius: scale(18), shadowOffset: { width: 0, height: scale(6) }, elevation: 8,
  },
  filaVitrina: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  destelloVitrina: { marginTop: SPACING.sm },
  campoVitrina: { flex: 1, fontSize: scale(15), lineHeight: scale(22) },
  enviarVitrina: { width: scale(52), height: scale(52), borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', marginTop: scale(14) },
  barraVitrina: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth, height: scale(56), paddingHorizontal: SPACING.sm,
  },
  rayaVitrina: { width: StyleSheet.hairlineWidth, height: scale(24) },
  accionVitrina: { flex: 1, height: scale(48), alignItems: 'center', justifyContent: 'center' },
  luz: { ...StyleSheet.absoluteFillObject, margin: -StyleSheet.hairlineWidth, borderRadius: scale(28), borderWidth: 1.25, overflow: 'hidden' },
  destello: { position: 'absolute', top: 0, left: 0, width: '50%', height: 2 },
  campo: {
    fontSize: scale(17),
    lineHeight: scale(24),
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
    overflow: 'hidden',
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
