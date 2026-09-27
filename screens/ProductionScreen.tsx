import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { useProduccion, nuevoIdDeEscena, nuevoIdDePlano } from '../hooks/useProduccion';
import CreatorShell from '../components/creator/CreatorShell';
import ProductionHeader from '../components/studio/produccion/ProductionHeader';
import ProductionAvisos from '../components/studio/produccion/ProductionAvisos';
import ProductionStoryboard, { Seleccion } from '../components/studio/produccion/ProductionStoryboard';
import ProductionTimelinePreview from '../components/studio/produccion/ProductionTimelinePreview';
import ProductionDirectorPanel from '../components/studio/produccion/ProductionDirectorPanel';
import ProductionEmptyState from '../components/studio/produccion/ProductionEmptyState';
import ProductionList from '../components/studio/produccion/ProductionList';
import ProductionNewCard from '../components/studio/produccion/ProductionNewCard';
import type { MainStackParamList } from '../navigation/MainStackNavigator';
import type { FilmmakerOperation } from '../services/filmmaker/dominio';
import { LIMITES } from '../services/filmmaker/dominio';
import { esEditable, hayCambiosSinGuardar } from '../utils/produccionOptimista';
import { estadosDeLaProduccion, tituloDesdeLaIdea } from '../utils/presentacionDeProduccion';
import { fraseDelFallo } from '../utils/mensajesDeFilmmaker';
import { notify } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

type Ruta = RouteProp<MainStackParamList, 'Production'>;

/**
 * «VARIAS ESCENAS» — LA PRODUCCIÓN DE WEË FILMMAKER, DENTRO DE WEË STUDIO (F1-C).
 *
 * Dos caras en una ruta:
 *
 *   · con `productionId`, la producción abierta: su cabecera, el storyboard
 *     —escenas y planos—, la línea de tiempo y el panel Director;
 *   · sin él, lo que se escribió en Weë Studio a punto de convertirse en
 *     producción (si se escribió algo) y tus producciones de verdad.
 *
 * Todo pasa por el servicio (`services/filmmakerService.ts`) y el estado
 * optimista (`utils/produccionOptimista.ts`); aquí no hay reglas de producción
 * ni llamadas a la red. Y no se genera nada: ni vídeo, ni miniaturas, ni voz.
 */
const ProductionScreen: React.FC = () => {
  const route = useRoute<Ruta>();
  const productionId = route.params?.productionId;
  if (productionId) return <ProduccionAbierta key={productionId} productionId={productionId} />;
  return <InicioDeProducciones idea={route.params?.intencion} creativo={route.params?.creativo} />;
};

/* ── Sin producción abierta: la nueva, si la hay, y la lista ─────────────── */

const InicioDeProducciones: React.FC<{ idea?: string; creativo?: Readonly<Record<string, string>> }> = ({ idea, creativo }) => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const hayIdea = !!idea?.trim();
  const volver = useCallback(() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Studio')), [navigation]);
  return (
    <CreatorShell activeId="studio" overline={t('filmmaker.sectionName')} title={hayIdea ? t('filmmaker.newProduction') : t('filmmaker.myProductions')} breadcrumb="Weë Studio" onBack={volver}>
      <View style={styles.columna}>
        {hayIdea && (
          <ProductionNewCard
            idea={idea as string}
            creativo={creativo}
            onCreada={(id) => navigation.replace('Production', { productionId: id })}
          />
        )}
        {hayIdea && <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>{t('filmmaker.continueOne')}</Text>}
        <ProductionList
          onAbrir={(id) => navigation.push('Production', { productionId: id })}
          onIrAlStudio={() => navigation.navigate('Studio')}
        />
      </View>
    </CreatorShell>
  );
};

/* ── Una producción abierta ─────────────────────────────────────────────── */

const ProduccionAbierta: React.FC<{ productionId: string }> = ({ productionId }) => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();
  const { controlador, carga, falloDeCarga, estado, derivado, duplicar } = useProduccion(productionId);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [rechazadas, setRechazadas] = useState<ReadonlySet<string>>(new Set());
  const [vistaMovil, setVistaMovil] = useState<'storyboard' | 'director'>('storyboard');
  const ids = useMemo(() => ({ escena: nuevoIdDeEscena, plano: nuevoIdDePlano }), []);

  const vista = estado.vista;
  const editable = esEditable(estado);
  const hayCambios = hayCambiosSinGuardar(estado);
  const estados = estadosDeLaProduccion(estado, derivado?.lista, derivado?.tarjetas ?? []);
  const gesto = useCallback((ops: readonly FilmmakerOperation[]) => controlador.gesto(ops), [controlador]);
  const volver = useCallback(() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Production')), [navigation]);
  const aLaLista = useCallback(() => navigation.push('Production', {}), [navigation]);

  const alDuplicar = useCallback(async () => {
    if (!vista) return;
    const r = await duplicar(tituloDesdeLaIdea(t('filmmaker.duplicateTitle', { titulo: vista.title }), LIMITES.nombre));
    if (!r) { notify(t('filmmaker.saveFirst')); return; }
    if (!r.ok) { notify(t('filmmaker.saveError'), fraseDelFallo(r.fallo, t)); return; }
    notify(t('filmmaker.duplicatedDone'));
    navigation.push('Production', { productionId: r.valor.produccion.productionId });
  }, [vista, duplicar, t, navigation]);

  const alArchivar = useCallback(async (archivar: boolean) => {
    const r = await controlador.archivar(archivar);
    if (r.ok) { notify(archivar ? t('filmmaker.archivedDone') : t('filmmaker.unarchivedDone')); return; }
    notify(r.motivo === 'cambios_sin_guardar' ? t('filmmaker.saveFirst') : t('filmmaker.saveError'), r.motivo === 'fallo' && r.fallo ? fraseDelFallo(r.fallo, t) : undefined);
  }, [controlador, t]);

  const titulo = vista?.title ?? t('filmmaker.sectionName');

  let contenido: React.ReactNode;
  if (carga === 'cargando' && !vista) {
    contenido = <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />;
  } else if (carga === 'error' || !vista) {
    contenido = (
      <ProductionEmptyState
        icono="alert-circle-outline"
        tono="error"
        titulo={t('filmmaker.loadError')}
        texto={falloDeCarga ? fraseDelFallo(falloDeCarga, t) : undefined}
        accion={{ etiqueta: t('common.retry'), icono: 'refresh', onPress: () => { void controlador.cargar(); } }}
      />
    );
  } else {
    const storyboard = (
      <View style={styles.columna}>
        <ProductionTimelinePreview
          produccion={vista}
          linea={derivado?.linea}
          seleccion={seleccion}
          porRehacer={estado.porRehacer.shots}
          onSeleccionar={setSeleccion}
        />
        <ProductionStoryboard
          produccion={vista}
          tarjetas={derivado?.tarjetas ?? []}
          seleccion={seleccion}
          porRehacer={[...estado.porRehacer.shots, ...estado.porRehacer.scenes]}
          editable={editable}
          ids={ids}
          onSeleccionar={(s) => { setSeleccion(s); }}
          onGesto={gesto}
        />
      </View>
    );
    const director = (
      <ProductionDirectorPanel
        produccion={vista}
        seleccion={seleccion}
        recomendaciones={derivado?.recomendaciones ?? []}
        lista={derivado?.lista}
        porRehacer={estado.porRehacer}
        rechazadas={rechazadas}
        editable={editable}
        onGesto={gesto}
        onRechazar={(clave) => setRechazadas((antes) => new Set([...antes, clave]))}
      />
    );
    contenido = (
      <View style={styles.columna}>
        <ProductionHeader
          titulo={vista.title}
          estados={estados}
          guardado={estado.guardado}
          fallo={estado.fallo}
          hayCambios={hayCambios}
          onGuardarAhora={controlador.guardarAhora}
          onReintentar={controlador.reintentar}
          onDuplicar={() => { void alDuplicar(); }}
          onArchivar={() => { void alArchivar(true); }}
          onDesarchivar={() => { void alArchivar(false); }}
          onLista={aLaLista}
        />
        <ProductionAvisos estado={estado} onVistos={controlador.vistos} onDesarchivar={() => { void alArchivar(false); }} />
        {isDesktop ? (
          <View style={styles.dosColumnas}>
            <View style={styles.principal}>{storyboard}</View>
            <View style={[styles.lateral, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>{director}</View>
          </View>
        ) : (
          <>
            <View style={styles.pestanas} accessibilityRole="tablist">
              {(['storyboard', 'director'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setVistaMovil(v)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: vistaMovil === v }}
                  accessibilityLabel={v === 'storyboard' ? t('filmmaker.storyboard') : t('filmmaker.director')}
                  style={[styles.pestana, { backgroundColor: vistaMovil === v ? theme.colors.accent : theme.colors.card, borderColor: vistaMovil === v ? theme.colors.accent : theme.colors.border }]}
                >
                  <Text style={[styles.pestanaTexto, { color: vistaMovil === v ? '#1F2937' : theme.colors.text }]}>
                    {v === 'storyboard' ? t('filmmaker.storyboard') : t('filmmaker.director')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {vistaMovil === 'storyboard' ? storyboard : director}
          </>
        )}
      </View>
    );
  }

  return (
    <CreatorShell activeId="studio" overline={t('filmmaker.sectionName')} title={titulo} breadcrumb="Weë Studio" onBack={volver}>
      {contenido}
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  columna: { gap: SPACING.lg },
  subtitulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  dosColumnas: { flexDirection: 'row', gap: SPACING.xl, alignItems: 'flex-start' },
  principal: { flex: 1, minWidth: 0 },
  lateral: { width: 380, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },
  pestanas: { flexDirection: 'row', gap: SPACING.sm },
  pestana: { flex: 1, minHeight: 40, borderRadius: BORDER_RADIUS.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pestanaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});

export default enTemaClaro(ProductionScreen);
