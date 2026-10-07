import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import type { AssetDoc } from '../../services/vistaDeAsset';
import { CLAVE_DE_TIPO } from '../../services/vistaDeAsset';
import type { CreatorJob } from '../../services/creatorService';
import type { Adjunto } from '../../constants/weeWorkspaces';
import { PERFILES_DE_COMPOSICION } from '../../services/escena3d';
import {
  CLAVE_DE_LA_PESTANA, CLAVE_DEL_PAPEL, PESTANAS_DE_BIBLIOTECA, PestanaDeBiblioteca, CapacidadDeDesign, capacidadPorId,
} from '../../constants/designReferencia';
import {
  CLAVE_DEL_ESTADO_DE_TRABAJO, ESTADO_DESDE_CREATOR_JOB, EstadoDeLaCapacidad, FiltroDeBiblioteca, capacidadesDeLaPestana, filtrarCreaciones,
} from '../../utils/designReferencia';
import { BotonDeCapacidad, CURSOR, Insignia, Pestanas, Pista, nombreDeIcono } from './piezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';


export interface Carga<T> {
  estado: 'sinSesion' | 'cargando' | 'listo' | 'error';
  items: T[];
}

interface Props {
  pestana: PestanaDeBiblioteca;
  onPestana: (p: PestanaDeBiblioteca) => void;
  creaciones: Carga<AssetDoc>;
  filtro: FiltroDeBiblioteca;
  onFiltro: (f: FiltroDeBiblioteca) => void;
  urlDe: (a: AssetDoc) => string | null;
  elegidoId: string | null;
  onElegirMaterial: (a: AssetDoc) => void;
  proyecto: string | null;
  trabajosDelProyecto: Carga<CreatorJob>;
  onElegirTrabajo: (j: CreatorJob) => void;
  adjuntos: readonly Adjunto[];
  onQuitarAdjunto: (i: number) => void;
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onCapacidad: (cap: CapacidadDeDesign) => void;
  onReintentar: () => void;
  onIniciarSesion: () => void;
}

const PESTANAS = PESTANAS_DE_BIBLIOTECA.map((id) => ({ id, clave: CLAVE_DE_LA_PESTANA[id] }));
const FILTROS: { id: FiltroDeBiblioteca; clave: string }[] = [
  { id: 'todo', clave: 'creaciones.filterAll' },
  { id: 'image', clave: 'creaciones.filterImages' },
  { id: 'model3d', clave: 'creaciones.filterModel3d' },
  { id: 'world', clave: 'creaciones.filterWorlds' },
];
const ICONO_DE_CLASE: Record<string, string> = { image: 'image-outline', model3d: 'cube-outline', world: 'planet-outline' };
/** La referencia de estilo (C06) vive con las referencias: hoy, apagada con su motivo. */
const INSPIRACION = capacidadPorId('styleReference');

/**
 * LA BIBLIOTECA (panel izquierdo): con qué se trabaja.
 *
 *   Creaciones   el material de la CUENTA («Mis creaciones»), por clase. Filtrar es de
 *                verdad (C63); buscar (C62) y traer un modelo propio (C35) esperan.
 *   Proyecto     los trabajos del proyecto activo (C66) y lo que falta de un proyecto.
 *   Escena       los papeles del perfil `design` del núcleo 3D único y lo que se hará con ellos.
 *   Referencias  lo adjuntado en esta sesión, con su clase.
 */
const PanelDeBiblioteca: React.FC<Props> = (p) => {
  const { theme } = useTheme();
  const t = useT();
  const botones = (pestana: PestanaDeBiblioteca) => capacidadesDeLaPestana(pestana).map((cap) => (
    <BotonDeCapacidad key={cap.id} cap={cap} estado={p.estadoDe(cap)} onPress={p.onCapacidad} />
  ));

  const vacio = (clave: string) => <Pista clave={clave} />;
  const estadoDeCarga = (c: Carga<unknown>, claveVacio: string) => {
    if (c.estado === 'sinSesion') {
      return (
        <View style={estilos.bloque}>
          <Pista clave="designRef.signInToSee" />
          <BotonSimple clave="menu.signIn" onPress={p.onIniciarSesion} />
        </View>
      );
    }
    if (c.estado === 'cargando') return vacio('common.loading');
    if (c.estado === 'error') {
      return (
        <View style={estilos.bloque}>
          <Pista clave="designRef.loadFailed" />
          <BotonSimple clave="common.retry" onPress={p.onReintentar} />
        </View>
      );
    }
    return c.items.length === 0 ? vacio(claveVacio) : null;
  };

  return (
    <View style={estilos.panel}>
      <Pestanas opciones={PESTANAS} elegida={p.pestana} onElegir={p.onPestana} etiqueta={t('designRef.surfLibrary')} />
      <ScrollView contentContainerStyle={estilos.dentro} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {p.pestana === 'creaciones' && (
          <>
            <Pestanas opciones={FILTROS} elegida={p.filtro} onElegir={p.onFiltro} etiqueta={t('creaciones.filterLabel')} />
            {estadoDeCarga(p.creaciones, 'designRef.emptyCreations')}
            {filtrarCreaciones(p.creaciones.items, p.filtro).map((a) => {
              const url = a.kind === 'image' ? p.urlDe(a) : null;
              const elegido = a.assetId === p.elegidoId;
              return (
                <TouchableOpacity
                  key={a.assetId}
                  onPress={() => p.onElegirMaterial(a)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: elegido }}
                  accessibilityLabel={a.name || t(CLAVE_DE_TIPO[a.kind])}
                  style={[estilos.item, { borderColor: elegido ? theme.colors.text : theme.colors.border, backgroundColor: theme.colors.card }, CURSOR]}
                >
                  {url ? (
                    <Image source={{ uri: url }} style={estilos.miniatura} contentFit="cover" accessibilityIgnoresInvertColors />
                  ) : (
                    <View style={[estilos.miniatura, estilos.icono, { backgroundColor: theme.colors.surface }]}>
                      <Ionicons name={nombreDeIcono((ICONO_DE_CLASE[a.kind] ?? 'document-outline'))} size={scale(20)} color={theme.colors.text} />
                    </View>
                  )}
                  <View style={estilos.itemTexto}>
                    <Text style={[estilos.itemNombre, { color: theme.colors.text }]} numberOfLines={1}>{a.name || t(CLAVE_DE_TIPO[a.kind])}</Text>
                    <Insignia clave={CLAVE_DE_TIPO[a.kind]} />
                  </View>
                </TouchableOpacity>
              );
            })}
            {botones('creaciones')}
          </>
        )}

        {p.pestana === 'proyecto' && (
          <>
            <Text style={[estilos.titulo, { color: theme.colors.text }]} numberOfLines={2}>{p.proyecto ?? t('designRef.projectNone')}</Text>
            {p.proyecto ? (
              <>
                {estadoDeCarga(p.trabajosDelProyecto, 'designRef.emptyJobs')}
                {p.trabajosDelProyecto.items.map((j) => (
                  <TouchableOpacity
                    key={j.id}
                    onPress={() => p.onElegirTrabajo(j)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={j.goal}
                    style={[estilos.item, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }, CURSOR]}
                  >
                    <View style={estilos.itemTexto}>
                      <Text style={[estilos.itemNombre, { color: theme.colors.text }]} numberOfLines={2}>{j.goal}</Text>
                      <Insignia clave={CLAVE_DEL_ESTADO_DE_TRABAJO[ESTADO_DESDE_CREATOR_JOB[j.status]]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              vacio('designRef.emptyProject')
            )}
            {botones('proyecto')}
          </>
        )}

        {p.pestana === 'escena' && (
          <>
            <Pista clave="designRef.sceneHint" />
            {PERFILES_DE_COMPOSICION.design.map((papel) => (
              <View key={papel} style={[estilos.papel, { borderColor: theme.colors.border }]}>
                <Text style={[estilos.itemNombre, { color: theme.colors.text }]}>{t(CLAVE_DEL_PAPEL[papel])}</Text>
              </View>
            ))}
            {botones('escena')}
          </>
        )}

        {p.pestana === 'referencias' && (
          <>
            {p.adjuntos.length === 0 ? vacio('designRef.emptyReferences') : null}
            {p.adjuntos.map((a, i) => (
              <View key={`${a.uri}-${i}`} style={[estilos.item, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <Ionicons name="image-outline" size={scale(18)} color={theme.colors.text} />
                <Text style={[estilos.itemNombre, estilos.itemTexto, { color: theme.colors.text }]} numberOfLines={1}>{a.nombre ?? t('studio.reference')}</Text>
                <TouchableOpacity onPress={() => p.onQuitarAdjunto(i)} accessibilityRole="button" accessibilityLabel={t('studio.removeContext')} style={estilos.quitar}>
                  <Ionicons name="close" size={scale(18)} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            ))}
            {INSPIRACION ? <BotonDeCapacidad cap={INSPIRACION} estado={p.estadoDe(INSPIRACION)} onPress={p.onCapacidad} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const BotonSimple: React.FC<{ clave: string; onPress: () => void }> = ({ clave, onPress }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(clave)}
      style={[estilos.simple, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }, CURSOR]}
    >
      <Text style={[estilos.itemNombre, { color: theme.colors.text }]}>{t(clave)}</Text>
    </TouchableOpacity>
  );
};

const estilos = StyleSheet.create({
  panel: { flex: 1, gap: SPACING.xs },
  dentro: { gap: SPACING.sm, paddingBottom: SPACING.lg },
  bloque: { gap: SPACING.sm },
  titulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 52, padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth,
  },
  miniatura: { width: scale(44), height: scale(44), borderRadius: BORDER_RADIUS.sm },
  icono: { alignItems: 'center', justifyContent: 'center' },
  itemTexto: { flex: 1, minWidth: 0, gap: scale(4), alignItems: 'flex-start' },
  itemNombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  papel: { paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  quitar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  simple: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: SPACING.lg, justifyContent: 'center', borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
});

export default PanelDeBiblioteca;
