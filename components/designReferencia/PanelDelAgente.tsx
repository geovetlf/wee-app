import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CLAVE_DE_LA_INTENCION, CapacidadDeDesign, IntencionDeDesign, QUE_SE_DISENA } from '../../constants/designReferencia';
import { EstadoDeLaCapacidad, SeleccionDeDesign, salidaDeSeleccion, siguientesDe } from '../../utils/designReferencia';
import { BotonDeAccion, BotonDeCapacidad, Panel, Pista, TituloDeBloque } from './piezas';
import { SPACING, FONT_SIZE } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  intencion: IntencionDeDesign;
  que: string | null;
  texto: string;
  ajustes: readonly string[];
  adjuntos: number;
  proyecto: string | null;
  seleccion: SeleccionDeDesign;
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onCapacidad: (cap: CapacidadDeDesign) => void;
  /** Seguir con Weë Brain: la misma entrada que la caja (CreatorFlow), sin otro cerebro. */
  onContinuar: () => void;
}

/**
 * EL DESIGN AGENT (C54), COMO PANEL CONTEXTUAL (Línea B).
 *
 * No es un asistente nuevo: es Weë Brain visto desde Weë Design (CLAUDE.md §10).
 * Enseña el BRIEF —lo que Weë ya sabe de lo que se está diseñando, para no
 * volver a preguntarlo— y las SUGERENCIAS de lo que sigue a lo elegido (del
 * registro). Seguir la conversación lleva a `CreatorFlow`, donde Weë Brain
 * pregunta, cotiza y ejecuta por la arquitectura de siempre. Aquí no hay campo
 * de texto propio: se escribe en la caja de todas.
 */
const PanelDelAgente: React.FC<Props> = (p) => {
  const { theme } = useTheme();
  const t = useT();
  const que = QUE_SE_DISENA.find((q) => q.id === p.que);
  const filas: { clave: string; valor: string }[] = [
    { clave: 'designRef.composerLabel', valor: t(CLAVE_DE_LA_INTENCION[p.intencion]) },
    { clave: 'catalogo.designGridTitle', valor: que ? t(que.clave) : t('designRef.wsBriefOpen') },
    { clave: 'designRef.libProject', valor: p.proyecto ?? t('designRef.wsBriefOpen') },
  ];
  if (p.ajustes.length > 0) filas.push({ clave: 'studio.settingsLabel', valor: p.ajustes.join(', ') });
  if (p.adjuntos > 0) filas.push({ clave: 'designRef.libReferences', valor: String(p.adjuntos) });
  const sugerencias = p.seleccion ? siguientesDe(salidaDeSeleccion(p.seleccion)).slice(0, 4) : [];

  return (
    <ScrollView contentContainerStyle={estilos.panel} nestedScrollEnabled>
      <Panel>
        <TituloDeBloque clave="designRef.wsBrief" />
        {filas.map((f) => (
          <View key={f.clave} style={estilos.fila}>
            <Text style={[estilos.etiqueta, { color: theme.colors.textSecondary }]}>{t(f.clave)}</Text>
            <Text style={[estilos.valor, { color: theme.colors.text }]} numberOfLines={2}>{f.valor}</Text>
          </View>
        ))}
        {p.texto.trim() ? <Text style={[estilos.valor, { color: theme.colors.text }]} numberOfLines={4}>{p.texto.trim()}</Text> : null}
      </Panel>
      <Panel>
        <TituloDeBloque clave="designRef.wsSuggestions" />
        {sugerencias.length === 0 ? <Pista clave="designRef.wsNoSuggestions" /> : sugerencias.map((cap) => (
          <BotonDeCapacidad key={cap.id} cap={cap} estado={p.estadoDe(cap)} onPress={p.onCapacidad} />
        ))}
      </Panel>
      <BotonDeAccion clave="designRef.wsContinueWithBrain" icono="chatbubbles-outline" onPress={p.onContinuar} principal />
      <Pista clave="designRef.wsAgentHint" />
    </ScrollView>
  );
};

const estilos = StyleSheet.create({
  panel: { gap: SPACING.sm },
  fila: { gap: scale(2) },
  etiqueta: { fontSize: FONT_SIZE.xs },
  valor: { fontSize: FONT_SIZE.sm },
});

export default PanelDelAgente;
