/*
 * INFRAESTRUCTURA PRESERVADA, SIN CONECTAR (decisión del dueño, 2026-11-06, T). Este componente NO se importa en
 * ningún sitio y así debe seguir hasta una fase aparte con permiso explícito del dueño. Qué aporta, qué duplica del
 * sistema de idiomas y cómo conectarlo: docs/RTL-INFRAESTRUCTURA-PRESERVADA.md. Su prueba es
 * functions/test-L5/rtl-y-escrituras.test.mjs, aparcada fuera de la cadena; sus fallos A3/A4 son esperables mientras
 * no se conecte. Hoy `<html dir>` lo escribe contexts/IdiomaContext.tsx (no tocar dos sitios a la vez).
 */
import React, { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { useIdioma } from '../contexts/IdiomaContext';

/**
 * EL ÚNICO SITIO QUE CAMBIA EL SENTIDO GLOBAL DE LA INTERFAZ.
 *
 * La dirección es un dato del idioma (`i18n/idiomas.ts`), no se escribe a mano por idioma.
 *
 * WEB, dos piezas y hacen falta las dos:
 *  - `<html dir>`: las filas se invierten solas, y también lo que vive fuera del árbol de React.
 *  - un `View` con `dir` en la raíz: React Native Web compila `marginEnd` o `start` a `margin-right` o `left` según la
 *    dirección que recibe por SU contexto, que no lee del `<html>`. Sin esto, las propiedades lógicas no se reflejan.
 * Cambiar de idioma se aplica al instante, sin recargar. Con un idioma LTR, las reglas que resultan son las de siempre.
 *
 * NATIVO: `I18nManager` guarda la preferencia, pero el layout de React Native se fija al arrancar: el cambio se ve en el
 * SIGUIENTE arranque (`expo-updates` está desactivado y `DevSettings.reload` solo existe en desarrollo). Hasta entonces
 * los iconos siguen a `I18nManager.isRTL`, para no contradecir el layout real. Sin verificar en un aparato todavía.
 */
export const SentidoDeLaPagina: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { direccion } = useIdioma();
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') document.documentElement.dir = direccion;
      return;
    }
    const quiereRTL = direccion === 'rtl';
    if (I18nManager.isRTL !== quiereRTL) {
      I18nManager.allowRTL(quiereRTL);
      I18nManager.forceRTL(quiereRTL);
    }
  }, [direccion]);
  if (Platform.OS !== 'web') return <>{children}</>;
  const propsDeSentido = { dir: direccion } as object;
  return (
    <View {...propsDeSentido} style={{ flex: 1 }}>
      {children}
    </View>
  );
};
