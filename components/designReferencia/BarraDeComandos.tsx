import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CLAVE_DEL_GRUPO, GRUPOS_DE_COMANDOS, GrupoDeComandos } from '../../constants/designReferencia';
import { CURSOR, Insignia, Pestanas } from './piezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';


interface Props {
  /** El nombre del proyecto activo: contenido de la persona, no se traduce. */
  proyecto: string | null;
  grupo: GrupoDeComandos;
  onGrupo: (g: GrupoDeComandos) => void;
  onProyecto: () => void;
  onDescubrir: () => void;
}

const OPCIONES = GRUPOS_DE_COMANDOS.map((id) => ({ id, clave: CLAVE_DEL_GRUPO[id] }));

/**
 * LA BARRA DE COMANDOS: dónde estoy, en qué proyecto y qué puedo hacer.
 *
 * Los grupos son VERBOS (crear, transformar, editar, materiales, animar, escena,
 * imprimir, entregar), no herramientas ni módulos de nadie: cada uno lleva al sitio
 * donde viven sus comandos (`DESTINO_DEL_GRUPO`). El sello dice que esto es una
 * referencia funcional y no el diseño final. El saldo no va aquí: lo pone el marco
 * de Weë AI (`CreatorShell`), como en todas las secciones.
 */
const BarraDeComandos: React.FC<Props> = ({ proyecto, grupo, onGrupo, onProyecto, onDescubrir }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={[estilos.barra, { borderBottomColor: theme.colors.border }]} accessibilityLabel={t('designRef.commandBarLabel')}>
      <View style={estilos.fila}>
        <Insignia clave="designRef.badge" tono="aviso" />
        <Text style={[estilos.pista, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('designRef.badgeHint')}</Text>
        <View style={estilos.empuje} />
        <TouchableOpacity
          onPress={onProyecto}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t('designRef.capSwitchProject')}
          style={[estilos.proyecto, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }, CURSOR]}
        >
          <Ionicons name="folder-open-outline" size={scale(16)} color={theme.colors.text} />
          <Text style={[estilos.proyectoTexto, { color: theme.colors.text }]} numberOfLines={1}>
            {proyecto ? t('designRef.projectLabel', { nombre: proyecto }) : t('designRef.projectNone')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDescubrir}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t('designRef.capCapabilityDiscovery')}
          style={[estilos.icono, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }, CURSOR]}
        >
          <Ionicons name="compass-outline" size={scale(18)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <Pestanas opciones={OPCIONES} elegida={grupo} onElegir={onGrupo} etiqueta={t('designRef.commandBarLabel')} />
    </View>
  );
};

const estilos = StyleSheet.create({
  barra: { gap: SPACING.xs, paddingBottom: SPACING.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  pista: { fontSize: FONT_SIZE.xs, flexShrink: 1 },
  empuje: { flex: 1 },
  proyecto: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 40, maxWidth: scale(260),
    paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, borderWidth: StyleSheet.hairlineWidth,
  },
  proyectoTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, flexShrink: 1 },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});

export default BarraDeComandos;
