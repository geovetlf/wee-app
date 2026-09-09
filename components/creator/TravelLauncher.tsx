import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SpecialistAction, SpecialistConfig } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { objetivoDe } from './IdeaBox';
import TravelMark from './TravelMark';

/*
 * ─── La entrada de Weë Travel, en una sola tarjeta ──────────────────────────
 *
 * Antes esto eran tres bloques apilados: una cabecera grande que repetía el
 * nombre de la sección, una caja para escribir y una franja plegable con las
 * cuatro funciones. Entre los tres empujaban el muro casi media pantalla hacia
 * abajo, y al entrar en Travel lo primero que se veía eran herramientas, no
 * gente (fase 2E-69).
 *
 * Ahora es una tarjeta. Arriba, la frase —que sigue siendo la puerta principal:
 * un viaje se cuenta hablando, y esa frase ya trae destino, fechas y gustos—.
 * Abajo, una fila que despliega las cuatro funciones para quien prefiere elegir.
 * Cerrada por defecto, siempre: lo primero que se ve al llegar es el muro.
 *
 * Lo que NO hace: cambiar nada de lo que pasa después. Escribir manda la misma
 * frase que mandaba la caja de antes, y cada función abre exactamente el mismo
 * flujo con el mismo `preset`. Esta pieza solo cambia por dónde se entra.
 */

/** El mínimo que hay que poder tocar sin fallar. No se escala con la pantalla. */
const TOQUE = 44;

interface TravelLauncherProps {
  idea: SpecialistConfig['idea'];
  actions: SpecialistAction[];
  /** Rótulo de la fila que despliega las funciones. */
  title: string;
  open: boolean;
  onToggle: () => void;
  onSubmit: (text: string) => void;
  onAction: (action: SpecialistAction) => void;
}

const TravelLauncher: React.FC<TravelLauncherProps> = ({ idea, actions, title, open, onToggle, onSubmit, onAction }) => {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const entrada = useRef(new Animated.Value(0)).current;
  const giro = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!open) {
      entrada.setValue(0);
      return;
    }
    Animated.timing(entrada, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [open, entrada]);

  /*
   * El chevron gira, no se cambia por otro. Cambiarlo era un salto seco de un
   * icono a otro; girarlo cuenta el gesto —esto se abre desde aquí— y cuesta lo
   * mismo. Va en los dos sentidos, también al cerrar.
   */
  React.useEffect(() => {
    Animated.timing(giro, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [open, giro]);

  const enviar = () => {
    const valor = text.trim();
    if (!valor) return;
    setText('');
    onSubmit(valor);
  };

  const listo = !!text.trim();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: open ? theme.colors.accent : theme.colors.border }]}>
      <View style={styles.cabecera}>
        <TravelMark size={38} />
        <Text style={[styles.pregunta, { color: theme.colors.text }]} numberOfLines={1}>{idea.title.replace(/^[^\p{L}¿]+/u, '')}</Text>
      </View>

      <View style={[styles.filaEntrada, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
        <TextInput
          style={[styles.entrada, { color: theme.colors.text }]}
          placeholder={idea.placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={enviar}
          returnKeyType="send"
          accessibilityLabel={idea.placeholder}
        />
        <TouchableOpacity
          onPress={enviar}
          disabled={!listo}
          activeOpacity={0.85}
          style={[styles.enviar, { backgroundColor: listo ? theme.colors.accent : theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Contarle el viaje a Weë"
          accessibilityState={{ disabled: !listo }}
        >
          <Ionicons name="arrow-forward" size={scale(18)} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/*
        Los ejemplos van en una fila que se desliza, no envueltos. Envueltos
        ocupaban TRES líneas —son frases, no etiquetas— y esas tres líneas eran
        114 px que le quitaba al muro. En una fila ocupan 38 y se sigue llegando
        a los tres: deslizar es el gesto natural para una tira de sugerencias.
      */}
      {idea.chips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.ejemplos}
        >
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

      {/*
        La otra puerta. Una fila, no una cuadrícula: quien ya sabe lo que quiere
        la abre, elige y sigue; quien no, ni la mira y el muro empieza antes.
      */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={[styles.disparador, { borderTopColor: theme.colors.border }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        accessibilityLabel={`${title}. ${open ? 'Ocultar' : 'Ver'} las ${actions.length} formas de empezar`}
      >
        <Text style={[styles.disparadorTexto, { color: theme.colors.accentDark }]}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={scale(18)} color={theme.colors.accentDark} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <Animated.View
          style={[
            styles.funciones,
            { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [scale(-6), 0] }) }] },
          ]}
        >
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
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    overflow: 'hidden',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pregunta: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
  },
  filaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: SPACING.md,
    paddingRight: scale(5),
    paddingVertical: scale(5),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  entrada: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    minHeight: scale(38),
  },
  /*
   * Los tamaños de lo que se toca van SIN `scale()`. `scale()` encoge un 10% en
   * web, y un objetivo táctil no se encoge porque la pantalla sea otra: 44 es 44
   * en los dos sitios. Es la misma regla que sigue el calendario de fechas.
   */
  enviar: {
    width: TOQUE,
    height: TOQUE,
    borderRadius: TOQUE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ejemplos: {
    flexDirection: 'row',
    gap: scale(6),
    paddingRight: SPACING.md,
  },
  /*
   * El ejemplo se ve de 32 —una pastilla, no un botón— pero se toca en 44: los
   * 6 de arriba y abajo los pone `hitSlop`, que agranda el área sin agrandar el
   * dibujo. Es la forma de cumplir el mínimo sin que la tarjeta engorde.
   */
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
  disparador: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOQUE + 4,
    marginTop: scale(2),
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disparadorTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  funciones: {
    gap: scale(6),
    paddingBottom: SPACING.md,
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
