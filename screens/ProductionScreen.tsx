import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, enTemaClaro, useEnCreator } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { useProduccion, nuevoIdDeEscena, nuevoIdDePlano, nuevoIdDeSonido, nuevoIdDeLinea } from '../hooks/useProduccion';
import { useTomaDePlano } from '../hooks/useTomaDePlano';
import { useVideosDeLaProduccion } from '../hooks/useVideosDeLaProduccion';
import CreatorShell from '../components/creator/CreatorShell';
import ProductionAvisos from '../components/studio/produccion/ProductionAvisos';
import type { Seleccion } from '../components/studio/produccion/ProductionStoryboard';
import ProductionWorkspace from '../components/studio/produccion/ProductionWorkspace';
import ProductionMobileEditor from '../components/studio/produccion/ProductionMobileEditor';
import type { EspacioDeFilmmaker } from '../components/studio/produccion/espacio';
import { useAccionDeCabecera } from '../components/workspace/accionDeCabecera';
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
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../constants/design';

type Ruta = RouteProp<MainStackParamList, 'Production'>;

/**
 * «VARIAS ESCENAS» — LA PRODUCCIÓN DE WEË FILMMAKER, EL WORKSPACE PROFESIONAL.
 *
 * Dos caras en una ruta:
 *
 *   · con `productionId`, la producción abierta: en escritorio, el workspace
 *     —proyecto, visor, Weë AI Director, línea de tiempo por pistas y
 *     propiedades del plano—; en el teléfono, el editor táctil;
 *   · sin él, lo que se escribió en Weë Studio a punto de convertirse en
 *     producción (si se escribió algo) y tus producciones de verdad.
 *
 * Filmmaker vive en Weë Creator (decisión del usuario, 2026-09-27): si se llega
 * desde Weë —el «Varias escenas» de Weë Studio, un enlace—, la misma ruta se
 * abre dentro del taller, con los mismos parámetros.
 *
 * Todo pasa por el servicio (`services/filmmakerService.ts`) y el estado
 * optimista (`utils/produccionOptimista.ts`); aquí no hay reglas de producción
 * ni llamadas a la red. Lo único que se genera (F1-D) es la toma de UNA unidad
 * elegida, y la lleva su hook (`hooks/useTomaDePlano.ts`) sobre lo GUARDADO:
 * ni la producción entera, ni miniaturas, ni voz.
 */
const ProductionScreen: React.FC = () => {
  const route = useRoute<Ruta>();
  const navigation = useNavigation<any>();
  const enCreator = useEnCreator();
  const productionId = route.params?.productionId;
  /* Fuera de Weë Creator, Filmmaker se abre dentro: la misma pantalla, en su taller. */
  useEffect(() => {
    if (!enCreator && typeof navigation.replace === 'function') navigation.replace('Creator', { screen: 'Production', params: route.params });
    // Solo al llegar: una vez dentro, ya no hay nada que mover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const [exportando, setExportando] = useState(false);
  const ids = useMemo(() => ({ escena: nuevoIdDeEscena, plano: nuevoIdDePlano }), []);
  /* Los ids de un sonido y de una línea nuevos, como los de una escena o un plano: los pone el cliente, una vez. */
  const idsDelMontaje = useMemo(() => ({ sonido: nuevoIdDeSonido, linea: nuevoIdDeLinea }), []);

  const vista = estado.vista;
  const editable = esEditable(estado);
  const hayCambios = hayCambiosSinGuardar(estado);
  const toma = useTomaDePlano(estado.confirmada, hayCambios, seleccion);
  /* El vídeo de cada plano, para su tarjeta. Se vuelve a preguntar cuando la toma del elegido pone uno nuevo. */
  const delStoryboard = useVideosDeLaProduccion(estado.confirmada?.productionId ?? null, toma.enElPlano?.assetId ?? null);
  /* Del plano elegido lo sabe también su toma, y más al día: lo que ella dice gana. */
  const videos = useMemo(() => {
    if (!seleccion || !toma.enElPlano) return delStoryboard;
    const conElElegido = new Map(delStoryboard);
    conElElegido.set(seleccion.id, toma.enElPlano);
    return conElElegido;
  }, [delStoryboard, seleccion, toma.enElPlano]);
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

  /* «Exportar», arriba a la derecha de Weë Creator, mientras la producción está abierta y cargada. */
  const accion = useMemo(() => (vista ? { etiqueta: t('filmmaker.wsExport'), icono: 'share-outline', onPress: () => setExportando(true) } : null), [vista, t]);
  useAccionDeCabecera(accion);

  const titulo = vista?.title ?? t('filmmaker.sectionName');

  let contenido: React.ReactNode;
  if (carga === 'cargando' && !vista) {
    contenido = <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />;
  } else if (carga === 'error' || !vista) {
    contenido = (
      <View style={styles.centrado}>
        <ProductionEmptyState
          icono="alert-circle-outline"
          tono="error"
          titulo={t('filmmaker.loadError')}
          texto={falloDeCarga ? fraseDelFallo(falloDeCarga, t) : undefined}
          accion={{ etiqueta: t('common.retry'), icono: 'refresh', onPress: () => { void controlador.cargar(); } }}
        />
      </View>
    );
  } else {
    /*
     * Todo lo que los paneles necesitan, junto una vez. Ningún panel habla con el
     * servidor: un gesto es una operación de F1-A y la guarda el controlador.
     */
    const espacio: EspacioDeFilmmaker = {
      produccion: vista,
      tarjetas: derivado?.tarjetas ?? [],
      linea: derivado?.linea,
      lista: derivado?.lista,
      recomendaciones: derivado?.recomendaciones ?? [],
      porRehacer: estado.porRehacer,
      estados,
      guardado: estado.guardado,
      fallo: estado.fallo,
      hayCambios,
      editable,
      ids,
      videos,
      toma,
      seleccion,
      rechazadas,
      onSeleccionar: setSeleccion,
      onGesto: gesto,
      onRechazar: (clave) => setRechazadas((antes) => new Set([...antes, clave])),
      onGuardarAhora: controlador.guardarAhora,
      onReintentar: controlador.reintentar,
      onDuplicar: () => { void alDuplicar(); },
      onArchivar: (archivar) => { void alArchivar(archivar); },
      onLista: aLaLista,
      onExportar: () => setExportando(true),
    };
    contenido = (
      <View style={styles.espacio}>
        <View style={styles.avisos}>
          <ProductionAvisos estado={estado} onVistos={controlador.vistos} onDesarchivar={() => { void alArchivar(false); }} />
        </View>
        {isDesktop
          ? <ProductionWorkspace espacio={espacio} exportando={exportando} onCerrarExportar={() => setExportando(false)} ids={idsDelMontaje} />
          : <ProductionMobileEditor espacio={espacio} exportando={exportando} onCerrarExportar={() => setExportando(false)} ids={idsDelMontaje} />}
      </View>
    );
  }

  return (
    <CreatorShell activeId="studio" overline={t('filmmaker.sectionName')} title={titulo} breadcrumb="Weë Studio" onBack={volver} espacioDeTrabajo>
      {contenido}
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  columna: { gap: SPACING.lg },
  subtitulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  /* La producción abierta ocupa todo el sitio que le da el marco: los paneles se reparten dentro. */
  espacio: { flex: 1, minHeight: 0 },
  avisos: { paddingHorizontal: SPACING.lg },
  centrado: { padding: SPACING.xl },
});

export default enTemaClaro(ProductionScreen);
