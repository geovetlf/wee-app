import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SpecialistAction, SpecialistConfig } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { objetivoDe } from './IdeaBox';
import TravelMark from './TravelMark';
import CajaDePrompt from './CajaDePrompt';

/*
 * ─── Weë Travel, plegado en una fila ────────────────────────────────────────
 *
 * Todo lo que Travel sabe hacer cabe detrás de una sola fila: el nombre de la
 * sección, la frase para contarle un viaje a Weë, los ejemplos y las cuatro
 * funciones. Cerrado ocupa ~62 px. Abierto lo enseña todo.
 *
 * Por qué cerrado: Weë es una red social y Travel es un contexto dentro de ella,
 * no una aplicación de viajes. Quien entra tiene que ver a gente, no un panel de
 * herramientas. Las herramientas están a un toque, que es exactamente donde
 * deben estar: disponibles, no impuestas (fase 2E-73).
 *
 * Lo que NO hace: cambiar nada de lo que ocurre después. Escribir manda la misma
 * frase que mandaba la caja original y cada función abre el mismo flujo con el
 * mismo `preset`. Esta pieza solo decide por dónde se entra y cuánto ocupa.
 */

/** El mínimo que hay que poder tocar sin fallar. No se escala con la pantalla. */
const TOQUE = 44;

interface TravelLauncherProps {
  idea: SpecialistConfig['idea'];
  actions: SpecialistAction[];
  /** Frase corta bajo el título cuando está cerrado ("Planifica, descubre, explora…"). */
  hint?: string;
  open: boolean;
  onToggle: () => void;
  onSubmit: (text: string) => void;
  onAction: (action: SpecialistAction) => void;
}

const TravelLauncher: React.FC<TravelLauncherProps> = ({ idea, actions, hint, open, onToggle, onSubmit, onAction }) => {
  const { theme } = useTheme();
  const t = useT();
  const [text, setText] = useState('');
  const entrada = useRef(new Animated.Value(0)).current;
  const giro = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!open) {
      entrada.setValue(0);
      return;
    }
    Animated.timing(entrada, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [open, entrada]);

  /*
   * El chevron gira, no se cambia por otro icono. Girarlo cuenta el gesto —esto
   * se despliega desde aquí— y va en los dos sentidos, también al cerrar.
   */
  React.useEffect(() => {
    Animated.timing(giro, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [open, giro]);

  const enviar = () => {
    const valor = text.trim();
    if (!valor) return;
    setText('');
    onSubmit(valor);
  };

  /* El emoji vive en la configuración pero aquí lo dice el distintivo dibujado. */
  const titulo = idea.title.replace(/^[^\p{L}¿]+/u, '');

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: open ? theme.colors.accent : theme.colors.border }]}>
      {/* La fila. Cerrada, esto es TODO lo que ocupa Travel en la pantalla. */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={styles.fila}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        accessibilityLabel={t(open ? 'weeai.closeTravel' : 'weeai.openTravel', { titulo, contador: actions.length })}
      >
        <TravelMark size={38} />
        <View style={styles.filaTextos}>
          <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>{titulo}</Text>
          {!!hint && (
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]} numberOfLines={1}>{hint}</Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={scale(20)} color={theme.colors.accentDark} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <Animated.View
          style={[
            styles.cuerpo,
            { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [scale(-6), 0] }) }] },
          ]}
        >
          {/*
            La misma caja que Weë Studio y Weë Design (decisión del usuario,
            2026-09-15). Antes era una píldora de una línea con el botón al lado;
            un viaje se cuenta en varias líneas, y ahora la caja crece con ellas.
          */}
          <CajaDePrompt
            valor={text}
            onCambiar={setText}
            onEnviar={enviar}
            etiquetaEnviar={t('weeai.tellWeeTheTrip')}
            placeholder={idea.placeholder}
            /* Esta caja empieza el viaje: Intro lo empieza, como cuando era de una línea. */
            enviarConIntro
          />

          {/*
            Los ejemplos se deslizan en vez de envolverse: son frases, y envueltas
            ocupaban tres líneas para decir tres cosas.
          */}
          {idea.chips.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.ejemplos}>
              {idea.chips.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  onPress={() => onSubmit(objetivoDe(chip))}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
                  style={[styles.ejemplo, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  accessibilityRole="button"
                  accessibilityLabel={objetivoDe(chip)}
                >
                  <Text style={[styles.ejemploTexto, { color: theme.colors.textSecondary }]} numberOfLines={1}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Las cuatro funciones: filas, no una cuadrícula de tarjetas grandes. */}
          <View style={[styles.funciones, { borderTopColor: theme.colors.border }]}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => onAction(action)}
                activeOpacity={0.7}
                style={[styles.funcion, { borderColor: theme.colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`${action.title}. ${action.subtitle ?? ''}`}
              >
                <View style={[styles.funcionIcono, { backgroundColor: theme.colors.accent + '24' }]}>
                  <Ionicons name={action.icon as any} size={scale(19)} color={theme.colors.accentDark} />
                </View>
                <View style={styles.funcionTextos}>
                  <Text style={[styles.funcionTitulo, { color: theme.colors.text }]} numberOfLines={1}>{action.title}</Text>
                  {!!action.subtitle && (
                    <Text style={[styles.funcionSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>{action.subtitle}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={scale(16)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: TOQUE + 18,
    paddingHorizontal: SPACING.md,
    paddingVertical: scale(10),
  },
  filaTextos: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
  cuerpo: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  ejemplos: {
    flexDirection: 'row',
    gap: scale(6),
    paddingRight: SPACING.md,
  },
  /* Se ve de 32 y se toca en 44: los 6 de arriba y abajo los pone `hitSlop`. */
  ejemplo: {
    paddingHorizontal: SPACING.md,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  ejemploTexto: {
    fontSize: FONT_SIZE.xs,
  },
  funciones: {
    gap: scale(6),
    paddingTop: SPACING.sm,
    marginTop: scale(2),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  funcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: TOQUE + 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: scale(8),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  funcionIcono: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  funcionTextos: {
    flex: 1,
    minWidth: 0,
  },
  funcionTitulo: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  funcionSub: {
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
});

export default TravelLauncher;
