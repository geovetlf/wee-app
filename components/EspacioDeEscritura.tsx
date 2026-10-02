import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleProp, View, ViewStyle } from 'react-native';

/**
 * DONDE SE ESCRIBE EN WEË, EL TECLADO NO TAPA.
 *
 * Envuelve cualquier pantalla o bloque con campos de texto. Se usa igual que un
 * `KeyboardAvoidingView`, pero funciona en Android, que es donde el de React
 * Native no hace nada.
 *
 * ─── Por qué el KeyboardAvoidingView no sirve en Android ─────────────────────
 *
 * Weë se dibuja de borde a borde (`edgeToEdgeEnabled=true` en
 * `android/gradle.properties`), así que React Native llama a
 * `setDecorFitsSystemWindows(false)` al arrancar la actividad. A partir de ahí
 * el `android:windowSoftInputMode="adjustResize"` del manifiesto queda inerte:
 * **la ventana ya no se encoge** cuando sale el teclado. Es el comportamiento
 * de Android 15, no un fallo de configuración.
 *
 * El teclado sí se anuncia —`ReactRootView` lo detecta por
 * `WindowInsets.Type.ime()` y manda `keyboardDidShow` con la altura correcta—,
 * pero manda además un `screenY` medido sobre la ventana entera, que ya no se
 * encogió. Y `KeyboardAvoidingView` calcula justo eso:
 *
 *     Math.max(frame.y + frame.height - keyboardY, 0)
 *
 * Con `keyboardY` en el borde inferior de la pantalla, cualquier contenedor que
 * llegue abajo da cero. Cero relleno. La interfaz no se mueve y el teclado tapa
 * el campo. En iOS ese mismo `screenY` sí marca el borde superior del teclado,
 * y por eso allí el cálculo es correcto.
 *
 * De ahí la regla:
 *
 *   iOS      → KeyboardAvoidingView, que mide bien
 *   Android  → el relleno lo ponemos nosotros, con la altura que sí es fiable
 *   Web      → nada, el navegador ya se encarga
 *
 * Tres pantallas de Weë ya lo habían resuelto a mano, cada una a su manera
 * (`ConversationScreen`, `PostDetailScreen` y el antiguo `ChatScreen`, retirado). Esta pieza recoge
 * ese patrón ya probado en teléfono y lo deja en un solo sitio.
 */

/**
 * La altura del teclado en pantalla, o 0 si está cerrado.
 *
 * Útil cuando una pantalla ancla una barra abajo y necesita recoger su propio
 * `insets.bottom` mientras el teclado está abierto: la altura que reporta
 * Android ya viene sin la barra de navegación, así que ese hueco sobra.
 */
export const useAlturaDelTeclado = (): number => {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    /* `keyboardWillShow` solo existe en iOS; en Android hay que esperar al Did. */
    const abre = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const cierra = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const mostrar = Keyboard.addListener(abre, (e) => setAltura(e.endCoordinates.height));
    const ocultar = Keyboard.addListener(cierra, () => setAltura(0));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  return altura;
};

interface EspacioDeEscrituraProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Lo que ya ocupa una cabecera fija por encima. Solo cuenta en iOS: es el
   * `keyboardVerticalOffset` de siempre.
   */
  desplazamientoIos?: number;
  /**
   * Permite apagar el acomodo sin desmontar nada (por ejemplo, mientras una
   * hoja está cerrada). Por defecto está encendido.
   */
  activo?: boolean;
  /**
   * Lo que la pantalla YA tiene reservado por debajo y el teclado tapa igual.
   *
   * Las pantallas que no son pestañas llevan guardado el sitio de la barra
   * inferior (`ALTO_BARRA`): cuando sale el teclado, ese hueco queda debajo de
   * él y ya no hay nada que proteger ahí. Sin descontarlo, el relleno sumaba dos
   * veces y el contenido se quedaba flotando muy por encima del teclado.
   *
   * Solo cuenta en Android, que es donde el relleno lo ponemos nosotros.
   */
  descuento?: number;
}

const EspacioDeEscritura: React.FC<EspacioDeEscrituraProps> = ({
  children,
  style,
  desplazamientoIos = 0,
  activo = true,
  descuento = 0,
}) => {
  const alturaTeclado = useAlturaDelTeclado();

  /* iOS mide bien solo: le dejamos el componente de la plataforma. */
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={style}
        behavior="padding"
        enabled={activo}
        keyboardVerticalOffset={desplazamientoIos}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  /* Android: el relleno lo ponemos nosotros. Web: `alturaTeclado` siempre es 0,
     así que esto es un View normal y el navegador hace lo suyo. */
  const relleno = Math.max(alturaTeclado - descuento, 0);
  return (
    <View style={[style, activo && relleno > 0 ? { paddingBottom: relleno } : null]}>
      {children}
    </View>
  );
};

export default EspacioDeEscritura;
