import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { RellenoDeMarca } from '../GradienteDeMarca';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PALETA_BIBLIOTECA as P, SOMBRA_SUAVE } from './paleta';
import { FONT_WEIGHT } from '../../constants/design';

/**
 * LAS PIEZAS DE LA BIBLIOTECA — «Mis creaciones», «Mis proyectos» y un proyecto.
 *
 * La cabecera vive aparte (`CabeceraDeBiblioteca.tsx`), porque es la que dibuja el saldo.
 *
 * Son de estas tres pantallas y de nadie más: ninguna otra sección las importa.
 * Reciben los textos YA traducidos (quien pinta resuelve con `t()`), salvo lo
 * que es suyo de verdad —la etiqueta accesible de volver—. La marca «Weë AI»
 * no se traduce.
 *
 * Todo lo que señala un sentido (volver, seguir) pasa por `IconoDireccional`,
 * y los textos llevan la dirección del idioma: en árabe y en hebreo la
 * cabecera se lee de derecha a izquierda sin una línea más.
 */

/* ── La tarjeta informativa lavanda ─────────────────────────────────────── */

export const TarjetaDeAviso: React.FC<{ titulo?: string; texto?: string; icono?: keyof typeof Ionicons.glyphMap }> = ({ titulo, texto, icono = 'sparkles-outline' }) => {
  const dir = useDireccion();
  return (
    <View style={styles.aviso}>
      <View style={styles.avisoIcono}>
        <Ionicons name={icono} size={22} color={P.morado} />
      </View>
      <View style={styles.avisoTextos}>
        {!!titulo && <Text style={[styles.avisoTitulo, dir.texto]}>{titulo}</Text>}
        {!!texto && <Text style={[styles.avisoTexto, !titulo && styles.avisoTextoSolo, dir.texto]}>{texto}</Text>}
      </View>
    </View>
  );
};

/* ── Un filtro: contorno; elegido, degradado morado con texto blanco ────── */

export const ChipDeFiltro: React.FC<{ texto: string; activo: boolean; onPress: () => void; icono?: keyof typeof Ionicons.glyphMap }> = ({ texto, activo, onPress, icono }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.chip, activo ? styles.chipActivo : null]}
    accessibilityRole="tab"
    accessibilityState={{ selected: activo }}
  >
    {activo && (
      <LinearGradient
        pointerEvents="none"
        colors={P.degradadoMorado.colores}
        start={P.degradadoMorado.inicio}
        end={P.degradadoMorado.fin}
        style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
      />
    )}
    {!!icono && <Ionicons name={icono} size={16} color={activo ? '#FFFFFF' : P.texto} />}
    <Text style={[styles.chipTexto, { color: activo ? '#FFFFFF' : P.texto }]}>{texto}</Text>
  </TouchableOpacity>
);

/* ── El orden: una píldora con contorno que despliega sus opciones ──────── */

export interface OpcionDeOrden<T extends string> { id: T; texto: string }

export function SelectorDeOrden<T extends string>({ opciones, valor, onChange, etiqueta, abierto, onAbrir }: {
  opciones: OpcionDeOrden<T>[];
  valor: T;
  onChange: (v: T) => void;
  /** Lo que se dice a quien no ve; por defecto, «Ordenar» (creaciones.sortLabel). */
  etiqueta?: string;
  abierto: boolean;
  onAbrir: (abierto: boolean) => void;
}) {
  const t = useT();
  const dir = useDireccion();
  const actual = opciones.find((o) => o.id === valor) ?? opciones[0];
  return (
    <View style={styles.orden}>
      <TouchableOpacity
        onPress={() => onAbrir(!abierto)}
        activeOpacity={0.8}
        style={styles.ordenBoton}
        accessibilityRole="button"
        accessibilityLabel={etiqueta ?? t('creaciones.sortLabel')}
        accessibilityValue={{ text: actual.texto }}
        accessibilityState={{ expanded: abierto }}
      >
        <Text style={styles.ordenTexto} numberOfLines={1}>{actual.texto}</Text>
        <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={16} color={P.texto} />
      </TouchableOpacity>
      {abierto && (
        <View style={[styles.ordenMenu, dir.alFinal(0)]} accessibilityRole="menu">
          {opciones.map((o) => {
            const elegida = o.id === valor;
            return (
              <TouchableOpacity
                key={o.id}
                onPress={() => { onChange(o.id); onAbrir(false); }}
                style={[styles.ordenOpcion, elegida && { backgroundColor: P.lavandaSuave }]}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: elegida }}
              >
                <Text style={[styles.ordenOpcionTexto, { color: elegida ? P.morado : P.texto }, dir.texto]} numberOfLines={1}>{o.texto}</Text>
                {elegida && <Ionicons name="checkmark" size={16} color={P.morado} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ── El botón principal: el degradado de marca, con el destello y la flecha ── */

export const BotonPrincipal: React.FC<{
  texto: string;
  onPress: () => void;
  icono?: keyof typeof Ionicons.glyphMap;
  conFlecha?: boolean;
  disabled?: boolean;
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ texto, onPress, icono = 'sparkles', conFlecha = false, disabled, compacto, style }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    style={[styles.principal, compacto && styles.principalCompacto, disabled && { opacity: 0.55 }, style]}
    accessibilityRole="button"
    accessibilityLabel={texto}
  >
    <RellenoDeMarca radio={999} />
    <Ionicons name={icono} size={compacto ? 16 : 18} color={P.texto} />
    <Text style={[styles.principalTexto, compacto && { fontSize: 14 }]} numberOfLines={compacto ? 1 : 2}>{texto}</Text>
    {conFlecha && <IconoDireccional name="arrow-forward" size={18} color={P.texto} />}
  </TouchableOpacity>
);

/* ── Un botón secundario: contorno, para «cargar más», «reintentar»… ───── */

export const BotonSecundario: React.FC<{ texto: string; onPress: () => void; icono?: keyof typeof Ionicons.glyphMap; disabled?: boolean; children?: React.ReactNode }> = ({ texto, onPress, icono, disabled, children }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8} style={styles.secundario} accessibilityRole="button" accessibilityLabel={texto}>
    {children ?? (
      <>
        {!!icono && <Ionicons name={icono} size={16} color={P.texto} />}
        <Text style={styles.secundarioTexto}>{texto}</Text>
      </>
    )}
  </TouchableOpacity>
);

/* ── El vacío: la ilustración morada, el título, el texto y su acción ───── */

export const VacioDeBiblioteca: React.FC<{
  titulo: string;
  texto?: string;
  icono?: keyof typeof Ionicons.glyphMap;
  accion?: string;
  onAccion?: () => void;
}> = ({ titulo, texto, icono = 'image', accion, onAccion }) => (
  <View style={styles.vacio}>
    <View style={styles.ilustracion} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.ilustracionDetras} />
      <LinearGradient
        colors={P.degradadoIlustracion.colores}
        start={P.degradadoIlustracion.inicio}
        end={P.degradadoIlustracion.fin}
        style={styles.ilustracionDelante}
      >
        <Ionicons name={icono} size={44} color="#FFFFFF" />
      </LinearGradient>
    </View>
    <Text style={styles.vacioTitulo}>{titulo}</Text>
    {!!texto && <Text style={styles.vacioTexto}>{texto}</Text>}
    {!!accion && !!onAccion && <BotonPrincipal texto={accion} onPress={onAccion} conFlecha style={{ marginTop: 8 }} />}
  </View>
);

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.bordeLavanda,
    backgroundColor: P.lavandaSuave,
  },
  avisoIcono: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.lavanda,
  },
  avisoTextos: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  avisoTitulo: {
    color: P.texto,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: FONT_WEIGHT.bold,
  },
  avisoTextoSolo: {
    color: P.texto,
    fontSize: 15,
    lineHeight: 22,
  },
  avisoTexto: {
    color: P.textoSuave,
    fontSize: 14,
    lineHeight: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.borde,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  chipActivo: {
    borderColor: 'transparent',
    backgroundColor: P.morado,
  },
  chipTexto: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
  },
  orden: {
    position: 'relative',
    zIndex: 20,
  },
  ordenBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.borde,
    backgroundColor: '#FFFFFF',
    maxWidth: 220,
  },
  ordenTexto: {
    color: P.texto,
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
    flexShrink: 1,
  },
  ordenMenu: {
    position: 'absolute',
    top: 46,
    minWidth: 200,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.borde,
    backgroundColor: '#FFFFFF',
    ...SOMBRA_SUAVE,
  },
  ordenOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  ordenOpcionTexto: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
    flexShrink: 1,
  },
  principal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFA51F',
    alignSelf: 'center',
    maxWidth: '100%',
    ...SOMBRA_SUAVE,
    shadowColor: '#FF850D',
  },
  principalCompacto: {
    minHeight: 40,
    paddingHorizontal: 16,
    alignSelf: 'auto',
  },
  principalTexto: {
    color: P.texto,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: FONT_WEIGHT.bold,
    flexShrink: 1,
  },
  secundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.borde,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
  },
  secundarioTexto: {
    color: P.texto,
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
  },
  vacio: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 36,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.borde,
    backgroundColor: '#FFFFFF',
  },
  ilustracion: {
    width: 132,
    height: 112,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ilustracionDetras: {
    position: 'absolute',
    width: 96,
    height: 80,
    borderRadius: 20,
    backgroundColor: P.lavanda,
    transform: [{ rotate: '8deg' }, { translateX: 14 }, { translateY: 8 }],
  },
  ilustracionDelante: {
    width: 96,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    ...SOMBRA_SUAVE,
    shadowOpacity: 0.22,
  },
  vacioTitulo: {
    color: P.texto,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  vacioTexto: {
    color: P.textoSuave,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 440,
  },
});
