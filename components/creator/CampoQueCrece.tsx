import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCajaQueCrece } from './CajaQueCrece';
import TextoEnMayusculas from '../TextoEnMayusculas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  /** El nombre del campo, ya traducido: se ve encima y es lo que oye un lector de pantalla. */
  etiqueta: string;
  /** Lo que hay guardado ahora. Si cambia desde fuera y aquí no se está escribiendo, se toma. */
  valor: string;
  placeholder?: string;
  maximo: number;
  /** El texto del botón que guarda, ya traducido. */
  etiquetaGuardar: string;
  /** Se llama solo si el texto cambió. */
  onGuardar: (texto: string) => void;
  editable?: boolean;
}

/**
 * UN CAMPO PARA CAMBIAR UN TEXTO QUE YA EXISTE, EN UNA PÁGINA DE WEË AI.
 *
 * No es una caja de prompt —no se le pide nada a nadie, se corrige un título o
 * una descripción—, pero crece igual que ellas (CLAUDE.md §9): con lo escrito,
 * hasta llenar lo que se ve, y con su botón siempre a la vista. Lo hace con la
 * misma pieza, `useCajaQueCrece`, sin copiarla.
 *
 * Vive dentro de `CreatorShell`, que ya acomoda el teclado para toda la página.
 * Lo que se escribe no viaja a ningún sitio hasta que se toca «Guardar»: un
 * cambio por decisión, no uno por tecla.
 */
const CampoQueCrece: React.FC<Props> = ({ etiqueta, valor, placeholder, maximo, etiquetaGuardar, onGuardar, editable = true }) => {
  const { theme } = useTheme();
  const [texto, setTexto] = useState(valor);
  const escribiendo = useRef(false);
  const caja = useCajaQueCrece({ altoMinimo: scale(40), vacia: texto.length === 0 });

  /* Lo guardado manda mientras no se esté escribiendo encima. */
  useEffect(() => {
    if (!escribiendo.current) setTexto(valor);
  }, [valor]);

  const cambiado = texto.trim() !== valor.trim();
  const guardar = () => {
    escribiendo.current = false;
    if (cambiado) onGuardar(texto.trim());
  };

  return (
    <View style={styles.bloque}>
      <TextoEnMayusculas style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{etiqueta}</TextoEnMayusculas>
      <View
        ref={caja.refCaja}
        onLayout={caja.alMedirCaja}
        style={[styles.caja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        <TextInput
          {...caja.propsDelCampo}
          style={[styles.campo, { color: theme.colors.text, height: caja.altoDelTexto }, isWeb && ({ outlineStyle: 'none' } as any)]}
          value={texto}
          onChangeText={(v) => { escribiendo.current = true; setTexto(v); }}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={maximo}
          editable={editable}
          accessibilityLabel={etiqueta}
        />
        <View style={styles.fila}>
          <Text style={[styles.cuenta, { color: theme.colors.textSecondary }]}>{`${Array.from(texto).length}/${maximo}`}</Text>
          <TouchableOpacity
            onPress={guardar}
            disabled={!cambiado || !editable}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={etiquetaGuardar}
            accessibilityState={{ disabled: !cambiado || !editable }}
            style={[styles.guardar, { backgroundColor: cambiado && editable ? theme.colors.accent : theme.colors.surface }]}
          >
            <Text style={[styles.guardarTexto, { color: cambiado && editable ? '#1F2937' : theme.colors.textSecondary }]}>{etiquetaGuardar}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.xs },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, letterSpacing: 0.4 },
  caja: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.sm, gap: SPACING.xs },
  campo: { fontSize: FONT_SIZE.base, lineHeight: FONT_SIZE.base * 1.4, padding: 0 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cuenta: { fontSize: FONT_SIZE.xs, fontVariant: ['tabular-nums'] },
  guardar: { minHeight: 36, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  guardarTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});

export default CampoQueCrece;
