import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import type { AssetDoc } from '../../services/vistaDeAsset';
import { CLAVE_DE_TIPO } from '../../services/vistaDeAsset';
import { TarjetaTresD } from '../creator/TarjetaTresD';
import { CapacidadDeDesign, capacidadPorId } from '../../constants/designReferencia';
import { CLAVE_DE_LO_QUE_PRODUCE } from '../../utils/designReferencia';
import {
  CLAVE_DE_LA_RELACION, CLAVE_DEL_ESTADO_DE_TRABAJO, ESTADO_DESDE_CREATOR_JOB, EstadoDeLaCapacidad, SeleccionDeDesign,
  capacidadesDeLaBarraDelLienzo, salidaDeSeleccion, siguientesDe,
} from '../../utils/designReferencia';
import { BotonDeCapacidad, Insignia, Pista } from './piezas';
import CadenaDeDesign from './CadenaDeDesign';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  seleccion: SeleccionDeDesign;
  urlDe: (a: AssetDoc) => string | null;
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onCapacidad: (cap: CapacidadDeDesign) => void;
  onVerCreaciones: () => void;
  /** Abre el detalle de una capacidad (los eslabones de la cadena se recorren desde ahí). */
  onDetalle: (cap: CapacidadDeDesign) => void;
  /** Alto fijo en el teléfono y la tableta; en escritorio, el que deje la columna. */
  alto?: number;
}

const BARRA = capacidadesDeLaBarraDelLienzo();
const SUGERENCIAS = capacidadPorId('contextualSuggestions');
const esHttp = (u: string | undefined | null): u is string => !!u && /^https?:\/\//.test(u);

/**
 * EL LIENZO: lo que se está mirando, sus herramientas de vista y lo que viene después.
 *
 * Arriba, la barra del lienzo (girar y encuadrar, modos de vista, mover): todo
 * espera al visor 3D de Weë, que no está en `main` (DEC-09), y lo dice; ningún
 * visor de mentira. En el centro, lo elegido: una imagen se ve; un modelo o un
 * mundo, en la tarjeta 3D de siempre; un resultado SIMULADO, en un marco que dice
 * que nada se ha generado. Abajo, las acciones de lo elegido (C55): solo las que
 * tienen sentido para ese tipo de resultado.
 */
const nombreDe = (id: string | undefined, t: (k: string) => string): string => {
  const cap = id ? capacidadPorId(id) : undefined;
  return cap ? t(cap.clave) : '';
};

const Lienzo: React.FC<Props> = ({ seleccion, urlDe, estadoDe, onCapacidad, onVerCreaciones, onDetalle, alto }) => {
  const { theme } = useTheme();
  const t = useT();
  const siguientes = siguientesDe(salidaDeSeleccion(seleccion));

  const contenido = () => {
    if (!seleccion) {
      return (
        <View style={estilos.centro}>
          <Ionicons name="color-palette-outline" size={scale(36)} color={theme.colors.textSecondary} />
          <Pista clave="designRef.canvasEmpty" />
        </View>
      );
    }
    if (seleccion.tipo === 'simulada') {
      const padre = seleccion.linaje.length > 1 ? seleccion.linaje[seleccion.linaje.length - 2] : undefined;
      return (
        <View style={[estilos.centro, estilos.simulado, { borderColor: theme.colors.warning }]}>
          <Insignia clave="designRef.simulatedBadge" tono="aviso" />
          <Text style={[estilos.grande, { color: theme.colors.text }]}>{t(CLAVE_DE_LO_QUE_PRODUCE[seleccion.salida])}</Text>
          <Text style={[estilos.objetivo, { color: theme.colors.text }]}>
            {t(CLAVE_DE_LA_RELACION[seleccion.relacion], { origen: nombreDe(padre?.capacidadId, t) })}
          </Text>
          {seleccion.linaje.length > 1 ? (
            <Text style={[estilos.linaje, { color: theme.colors.textSecondary }]} accessibilityLabel={t('designRef.propLineage')}>
              {seleccion.linaje.map((p) => nombreDe(p.capacidadId, t)).join(' › ')}
            </Text>
          ) : null}
          {seleccion.padreId ? <Pista clave="designRef.handoffByReference" /> : null}
          <Pista clave="designRef.canvasSimulated" />
        </View>
      );
    }
    if (seleccion.tipo === 'trabajo') {
      const job = seleccion.job;
      const imagen = job.results.find((r) => r.kind === 'image' && esHttp(r.url ?? r.urls?.[0]));
      const url = imagen ? (imagen.url ?? imagen.urls?.[0]) : undefined;
      return (
        <View style={estilos.centro}>
          {esHttp(url) ? <Image source={{ uri: url }} style={estilos.imagen} contentFit="contain" accessibilityIgnoresInvertColors /> : null}
          <Text style={[estilos.objetivo, { color: theme.colors.text }]} numberOfLines={3}>{job.goal}</Text>
          <Insignia clave={CLAVE_DEL_ESTADO_DE_TRABAJO[ESTADO_DESDE_CREATOR_JOB[job.status]]} />
        </View>
      );
    }
    const a = seleccion.asset;
    const url = urlDe(a);
    if (a.kind === 'image' && url) {
      return <Image source={{ uri: url }} style={estilos.imagen} contentFit="contain" accessibilityLabel={a.name || t(CLAVE_DE_TIPO[a.kind])} />;
    }
    if (a.kind === 'model3d' || a.kind === 'world') {
      return (
        <ScrollView contentContainerStyle={estilos.tarjeta}>
          <TarjetaTresD tipo={a.kind} nombre={a.name} derechos={a.derechos} url={url} mimeType={a.mimeType} onVerCreaciones={onVerCreaciones} />
        </ScrollView>
      );
    }
    return (
      <View style={estilos.centro}>
        <Ionicons name="document-outline" size={scale(32)} color={theme.colors.textSecondary} />
        <Text style={[estilos.objetivo, { color: theme.colors.text }]}>{a.name || t(CLAVE_DE_TIPO[a.kind])}</Text>
      </View>
    );
  };

  return (
    <View style={[estilos.lienzo, alto ? { height: alto } : estilos.flex]}>
      <CadenaDeDesign seleccion={seleccion} onAbrir={onDetalle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.fila} contentContainerStyle={estilos.barra} accessibilityLabel={t('designRef.canvasBar')}>
        {BARRA.map((cap) => <BotonDeCapacidad key={cap.id} cap={cap} estado={estadoDe(cap)} onPress={onCapacidad} compacto />)}
      </ScrollView>
      <View style={[estilos.marco, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{contenido()}</View>
      {siguientes.length > 0 && SUGERENCIAS ? (
        <View style={estilos.acciones}>
          <Text style={[estilos.accionesTitulo, { color: theme.colors.textSecondary }]}>{t('designRef.stepNext')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.fila} contentContainerStyle={estilos.barra} accessibilityLabel={t(SUGERENCIAS.clave)}>
            {siguientes.map((cap) => <BotonDeCapacidad key={cap.id} cap={cap} estado={estadoDe(cap)} onPress={onCapacidad} compacto />)}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const estilos = StyleSheet.create({
  lienzo: { gap: SPACING.xs, minHeight: scale(240) },
  /* Con la caja debajo: crece si sobra sitio y nunca encoge por debajo de lo suyo (la columna se desplaza); así no desborda sobre la caja. */
  flex: { flexGrow: 1, flexShrink: 0 },
  barra: { gap: SPACING.xs, paddingVertical: scale(2), alignItems: 'center' },
  fila: { flexGrow: 0, flexShrink: 0 },
  marco: { flex: 1, borderRadius: BORDER_RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', minHeight: scale(112) },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.lg },
  simulado: { margin: SPACING.md, borderWidth: 1, borderStyle: 'dashed', borderRadius: BORDER_RADIUS.md },
  grande: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  imagen: { flex: 1, width: '100%', minHeight: scale(160) },
  objetivo: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
  linaje: { fontSize: FONT_SIZE.xs, textAlign: 'center' },
  tarjeta: { padding: SPACING.md },
  acciones: { gap: scale(2) },
  accionesTitulo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
});

export default Lienzo;
