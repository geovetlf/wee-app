import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import type { CreatorJob } from '../../services/creatorService';
import { CapacidadDeDesign, capacidadPorId } from '../../constants/designReferencia';
import { CLAVE_DEL_ESTADO_DE_TRABAJO, ESTADO_DESDE_CREATOR_JOB, EstadoDeLaCapacidad, fallidoSinReintento } from '../../utils/designReferencia';
import type { Carga } from './PanelDeBiblioteca';
import { CLAVE_DE_LA_FASE, faseVisible } from '../../constants/designWorkspace';
import { BotonDeCapacidad, CURSOR, Insignia, Pestanas, Pista } from './piezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';


type Pestana = 'trabajos' | 'versiones';
const PESTANAS: { id: Pestana; clave: string }[] = [
  { id: 'trabajos', clave: 'designRef.surfJobs' },
  { id: 'versiones', clave: 'designRef.capVersions' },
];
const VERSIONES = capacidadPorId('versions');

/** La etiqueta de un trabajo: su fase visible (QUEUED…CANCELLED) si está en el ciclo; si no, su estado del registro. */
const claveDelTrabajo = (j: CreatorJob): string => {
  const estado = ESTADO_DESDE_CREATOR_JOB[j.status];
  const fase = faseVisible(estado, j.steps.some((s) => s.status === 'done'));
  return fase ? CLAVE_DE_LA_FASE[fase] : CLAVE_DEL_ESTADO_DE_TRABAJO[estado];
};

interface Props {
  trabajos: Carga<CreatorJob>;
  elegidoId: string | null;
  onElegirTrabajo: (j: CreatorJob) => void;
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onCapacidad: (cap: CapacidadDeDesign) => void;
  onReintentar: () => void;
  /** En escritorio, una franja que se desplaza en horizontal; en el teléfono, una lista. */
  horizontal?: boolean;
}

/**
 * LO QUE ESTÁ PASANDO Y LO QUE PASÓ: los trabajos de Weë Design (y Hogar & Diseño),
 * cada uno con su estado unificado (de `creatorJobs.status` a los estados del
 * dueño), y sus versiones —que esperan a que el linaje se escriba (C36)—.
 * Un trabajo nunca va sin capacidad: los de la franja son de `concept` o de
 * `restyleSpace`, por su experiencia.
 */
const FranjaDeTrabajos: React.FC<Props> = ({ trabajos, elegidoId, onElegirTrabajo, estadoDe, onCapacidad, onReintentar, horizontal }) => {
  const { theme } = useTheme();
  const t = useT();
  const [pestana, setPestana] = useState<Pestana>('trabajos');

  const lista = () => {
    if (trabajos.estado === 'sinSesion') return <Pista clave="designRef.signInToSee" />;
    if (trabajos.estado === 'cargando') return <Pista clave="common.loading" />;
    if (trabajos.estado === 'error') {
      return (
        <TouchableOpacity onPress={onReintentar} accessibilityRole="button" accessibilityLabel={t('common.retry')} style={estilos.reintentar}>
          <Pista clave="designRef.loadFailed" />
        </TouchableOpacity>
      );
    }
    if (trabajos.items.length === 0) return <Pista clave="designRef.emptyJobs" />;
    return trabajos.items.map((j) => {
      const elegido = j.id === elegidoId;
      return (
        <TouchableOpacity
          key={j.id}
          onPress={() => onElegirTrabajo(j)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: elegido }}
          accessibilityLabel={j.goal}
          style={[
            horizontal ? estilos.ficha : estilos.fila,
            { borderColor: elegido ? theme.colors.text : theme.colors.border, backgroundColor: theme.colors.card },
            CURSOR,
          ]}
        >
          <Text style={[estilos.objetivo, { color: theme.colors.text }]} numberOfLines={2}>{j.goal}</Text>
          <Insignia clave={claveDelTrabajo(j)} tono={j.status === 'done' ? 'activo' : j.status === 'failed' ? 'aviso' : 'apagado'} />
          {fallidoSinReintento(j) ? <Pista clave="designRef.wsRetryUnavailable" /> : null}
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={estilos.franja}>
      <Pestanas opciones={PESTANAS} elegida={pestana} onElegir={setPestana} etiqueta={t('designRef.entStrip')} />
      {pestana === 'trabajos' ? (
        <ScrollView horizontal={!!horizontal} showsHorizontalScrollIndicator={false} contentContainerStyle={horizontal ? estilos.filaH : estilos.columna} nestedScrollEnabled>
          {lista()}
        </ScrollView>
      ) : VERSIONES ? (
        <View style={estilos.columna}>
          <BotonDeCapacidad cap={VERSIONES} estado={estadoDe(VERSIONES)} onPress={onCapacidad} />
          <Pista clave="designRef.versionsHint" />
        </View>
      ) : null}
    </View>
  );
};

const estilos = StyleSheet.create({
  franja: { gap: SPACING.xs },
  filaH: { gap: SPACING.sm, paddingVertical: scale(2) },
  columna: { gap: SPACING.sm },
  ficha: { width: scale(220), padding: SPACING.sm, gap: scale(6), borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth },
  fila: { padding: SPACING.sm, gap: scale(6), borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth, minHeight: 52 },
  objetivo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  reintentar: { minHeight: 44, justifyContent: 'center' },
});

export default FranjaDeTrabajos;
