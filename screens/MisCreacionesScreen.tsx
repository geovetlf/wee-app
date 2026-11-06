import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useEnEspacioProfesional } from '../contexts/EspacioProfesionalContext';
import { useResponsive } from '../hooks/useResponsive';
import { assetsService, AssetDoc, AssetKind, OrdenDeCreaciones, PaginaDeCreaciones } from '../services/assetsService';
import { CLAVE_DE_ESTADO, CLAVE_DE_TIPO, vistaDeAsset } from '../services/vistaDeAsset';
import { descargarCreacion } from '../services/assetDownload';
import { frasesDeDerechos } from '../utils/derechosDelMaterial';
import { formatearLista, nombreDeLaRegion } from '../i18n/formato';
import CreatorShell from '../components/creator/CreatorShell';
import { SectionTitle, Chip } from '../components/creator/ui';
import { RejillaDeCreaciones } from '../components/creator/RejillaDeCreaciones';
import { GaleriaDeCreaciones } from '../components/biblioteca/GaleriaDeCreaciones';
import {
  TarjetaDeAviso, ChipDeFiltro, SelectorDeOrden, VacioDeBiblioteca, BotonSecundario,
} from '../components/biblioteca/PiezasDeBiblioteca';
import { CabeceraDeBiblioteca } from '../components/biblioteca/CabeceraDeBiblioteca';
import { PALETA_BIBLIOTECA } from '../components/biblioteca/paleta';
import { useDireccion } from '../hooks/useDireccion';
import { Ionicons } from '@expo/vector-icons';
import { confirmAction, notify } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

/**
 * MIS CREACIONES — la biblioteca de material de la CUENTA.
 *
 * ── De la cuenta, y de nadie más ───────────────────────────────────────────
 *
 * Se lee por `user.uid`, no por el perfil activo. El Perfil Real y el Perfil
 * Weë ven exactamente lo mismo porque lo que se genera es de la cuenta. Y se
 * ve en claro con las dos caras, como todo el taller de Weë AI.
 *
 * ── Lo que esta pantalla NO hereda de las que había ────────────────────────
 *
 * Las cuatro listas de cosas propias que existían disfrazaban un fallo de
 * carga de «todavía no tienes nada». Aquí un fallo es un fallo, con su botón
 * de reintentar; vacío es vacío, y son dos pantallas distintas.
 *
 * Tampoco se carga todo: cada página trae el cursor de la siguiente, el filtro
 * va en la consulta y «cargar más» pide justo la siguiente página.
 *
 * Y no hay porcentajes: «procesando» dice lo que se sabe.
 */

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'lista'; pagina: PaginaDeCreaciones; items: AssetDoc[]; cargandoMas: boolean };

const FILTROS: { id: AssetKind | 'all'; clave: string }[] = [
  { id: 'all', clave: 'creaciones.filterAll' },
  { id: 'image', clave: 'creaciones.filterImages' },
  { id: 'video', clave: 'creaciones.filterVideos' },
  { id: 'audio', clave: 'creaciones.filterAudio' },
  { id: 'document', clave: 'creaciones.filterDocuments' },
  { id: 'model3d', clave: 'creaciones.filterModel3d' },
  { id: 'world', clave: 'creaciones.filterWorlds' },
];

/* El icono de línea de cada filtro en la versión App («Todo» va sin icono). */
const ICONO_DE_FILTRO: Partial<Record<AssetKind | 'all', keyof typeof Ionicons.glyphMap>> = {
  image: 'image-outline',
  video: 'play-circle-outline',
  audio: 'musical-notes-outline',
  document: 'document-text-outline',
  model3d: 'cube-outline',
  world: 'globe-outline',
};

const MisCreacionesScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { locale } = useIdioma();
  const pro = useEnEspacioProfesional();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isDesktop, isTablet } = useResponsive();
  const dir = useDireccion();
  const [ordenAbierto, setOrdenAbierto] = useState(false);

  const [filtro, setFiltro] = useState<AssetKind | 'all'>('all');
  const [orden, setOrden] = useState<OrdenDeCreaciones>('recent');
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  /* Una petición que llega tarde no pisa a la que la persona pidió después. */
  const peticion = useRef(0);

  const cargar = useCallback(async () => {
    if (!user) {
      setEstado({ fase: 'lista', pagina: { items: [], cursor: null, hayMas: false }, items: [], cargandoMas: false });
      return;
    }
    const mia = ++peticion.current;
    setEstado({ fase: 'cargando' });
    try {
      const pagina = await assetsService.listar(user.uid, { kind: filtro === 'all' ? undefined : filtro, orden });
      if (mia !== peticion.current) return;
      setEstado({ fase: 'lista', pagina, items: pagina.items, cargandoMas: false });
    } catch (error) {
      console.warn('Mis creaciones: no se pudo cargar', error);
      if (mia === peticion.current) setEstado({ fase: 'error' });
    }
  }, [user, filtro, orden]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  useEffect(() => { cargar(); }, [filtro, orden, cargar]);

  const cargarMas = async () => {
    if (!user || estado.fase !== 'lista' || !estado.pagina.hayMas || estado.cargandoMas) return;
    const anterior = estado;
    setEstado({ ...anterior, cargandoMas: true });
    try {
      const pagina = await assetsService.listar(user.uid, { kind: filtro === 'all' ? undefined : filtro, orden }, anterior.pagina.cursor);
      setEstado({ fase: 'lista', pagina, items: [...anterior.items, ...pagina.items], cargandoMas: false });
    } catch (error) {
      console.warn('Mis creaciones: no se pudo cargar más', error);
      setEstado({ ...anterior, cargandoMas: false });
      notify(t('creaciones.loadFailed'));
    }
  };

  /*
   * Abrir una creación: si sabemos de qué trabajo salió, se abre ahí, que es
   * donde ya se enseña con su reproductor, sus variantes y sus acciones. Si no
   * —un material sin trabajo, o anterior—, se abre el archivo tal cual.
   */
  const abrir = (asset: AssetDoc) => {
    const experienceId = typeof asset.metadata?.experienceId === 'string' ? asset.metadata.experienceId : undefined;
    if (asset.provenance.jobId && experienceId) {
      navigation.navigate('CreatorFlow', { experienceId, jobId: asset.provenance.jobId });
      return;
    }
    const url = assetsService.urlDeEntrega(asset);
    /*
     * UN ARCHIVO 3D NO SE ABRE COMO UNA PÁGINA. Weë todavía no tiene un visor 3D: se dice, con lo que su licencia deja
     * hacer, y se ofrece descargarlo para abrirlo en una app 3D. Ni un visor de mentira ni una imagen que no es el mundo.
     */
    if (url && (asset.kind === 'world' || asset.kind === 'model3d')) {
      void abrirTresD(asset, asset.kind, url);
      return;
    }
    if (url) {
      Linking.openURL(url).catch(() => notify(t('creaciones.loadFailed')));
      return;
    }
    /*
     * Sin dirección no hay nada que abrir, y un toque que no hace nada se lee
     * como una avería. Se dice en qué estado está —procesando, subiendo, no
     * salió bien—, que es la razón por la que todavía no se puede ver.
     */
    const vista = vistaDeAsset(asset);
    const claveDeEstado = vista.estado === 'disponible'
      ? 'creaciones.loadFailed'
      : CLAVE_DE_ESTADO[vista.estado];
    notify(vista.nombre || t('creaciones.title'), t(claveDeEstado));
  };

  const abrirTresD = async (asset: AssetDoc, tipo: 'world' | 'model3d', url: string) => {
    const derechos = frasesDeDerechos(asset.derechos).map((f) => (f.lugares
      ? t(f.clave, { lugares: formatearLista(f.lugares.map((c) => nombreDeLaRegion(c, locale)), locale) })
      : t(f.clave)));
    const titulo = asset.name || t(CLAVE_DE_TIPO[tipo]);
    const ok = await confirmAction(titulo, [t('creaciones.noViewer3d'), ...derechos].join('\n'), t('creaciones.download'), false, t);
    if (!ok) return;
    const resultado = await descargarCreacion(url, tipo, asset.mimeType);
    if (resultado === 'guardado') notify(t('creaciones.downloaded'));
    else if (resultado === 'sin_permiso') notify(t('creaciones.downloadPermission'));
    else if (resultado === 'error') notify(t('creaciones.downloadFailed'));
  };

  /*
   * DESCARGAR DESDE LA TARJETA (versión App). El mismo servicio de descargas que
   * la tarjeta de resultado; un archivo 3D pasa antes por lo que su licencia
   * deja hacer, igual que al abrirlo.
   */
  const descargar = async (asset: AssetDoc) => {
    const url = assetsService.urlDeEntrega(asset);
    if (!url) return;
    if (asset.kind === 'world' || asset.kind === 'model3d') {
      void abrirTresD(asset, asset.kind, url);
      return;
    }
    const resultado = await descargarCreacion(url, asset.kind, asset.mimeType);
    if (resultado === 'guardado') notify(t('creaciones.downloaded'));
    else if (resultado === 'sin_permiso') notify(t('creaciones.downloadPermission'));
    else if (resultado === 'error') notify(t('creaciones.downloadFailed'));
  };

  const eliminar = async (asset: AssetDoc) => {
    const ok = await confirmAction(t('creaciones.delete'), t('creaciones.deleteConfirm'), t('creaciones.delete'), true, t);
    if (!ok || estado.fase !== 'lista') return;
    try {
      const r = await assetsService.eliminar(asset.assetId);
      setEstado({ ...estado, items: estado.items.filter((a) => a.assetId !== asset.assetId) });
      notify(t('creaciones.deleted'), r.pendingPhysicalDeletion ? t('creaciones.pendingDeletion') : undefined);
    } catch (error) {
      console.warn('Mis creaciones: no se pudo eliminar', error);
      notify(t('creaciones.deleteFailed'));
    }
  };

  const columnas: 2 | 3 | 4 = isDesktop ? 4 : isTablet ? 3 : 2;

  /*
   * ── WEË CREATOR: la pantalla de siempre ──────────────────────────────────
   *
   * Dentro de Weë Creator «Mis creaciones» se queda como estaba —su marco, su
   * rejilla (`RejillaDeCreaciones`, la misma de su Inicio)— y no habla de los
   * dos perfiles, que son de la versión App. El rediseño de la biblioteca
   * (2026-11-05) es solo de la App: va más abajo.
   */
  if (pro) {
  return (
    <CreatorShell activeId="creations" overline="🤖 Weë AI" title={`🖼️ ${t('creaciones.title')}`} breadcrumb="Weë AI">

      <View style={styles.section}>
        <SectionTitle
          title={estado.fase === 'lista' ? t('creaciones.count', { contador: estado.items.length }) : t('creaciones.title')}
          action={t(orden === 'recent' ? 'creaciones.sortOldest' : 'creaciones.sortRecent')}
          onAction={() => setOrden((o) => (o === 'recent' ? 'oldest' : 'recent'))}
        />

        <View style={styles.filtros} accessibilityRole="tablist" accessibilityLabel={t('creaciones.filterLabel')}>
          {FILTROS.map((f) => (
            <Chip key={f.id} label={t(f.clave)} active={filtro === f.id} onPress={() => setFiltro(f.id)} />
          ))}
        </View>

        {estado.fase === 'cargando' ? (
          <View style={styles.centro}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.centroText, { color: theme.colors.textSecondary }]}>{t('creaciones.loading')}</Text>
          </View>
        ) : estado.fase === 'error' ? (
          <View style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.error }]}>
            <Text style={[styles.boxTitle, { color: theme.colors.text }]}>{t('creaciones.loadFailed')}</Text>
            <TouchableOpacity onPress={cargar} style={[styles.button, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85}>
              <RellenoDeMarca radio={BORDER_RADIUS.full} />
              <Text style={styles.buttonText}>{t('creaciones.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : estado.items.length === 0 ? (
          <View style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.emptyEmoji}>🖼️</Text>
            <Text style={[styles.boxTitle, { color: theme.colors.text }]}>
              {filtro === 'all' ? t('creaciones.emptyTitle') : t('creaciones.emptyFiltered')}
            </Text>
            {filtro === 'all' && (
              <>
                <Text style={[styles.boxText, { color: theme.colors.textSecondary }]}>{t('creaciones.emptyText')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('WeeCreator')} style={[styles.button, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85}>
                  <RellenoDeMarca radio={BORDER_RADIUS.full} />
                  <Text style={styles.buttonText}>{t('creaciones.emptyAction')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <>
            <RejillaDeCreaciones items={estado.items} columnas={columnas} onOpen={abrir} onDelete={eliminar} />
            {estado.pagina.hayMas && (
              <TouchableOpacity
                onPress={cargarMas}
                disabled={estado.cargandoMas}
                style={[styles.more, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                activeOpacity={0.8}
              >
                {estado.cargandoMas ? (
                  <ActivityIndicator color={theme.colors.accent} />
                ) : (
                  <Text style={[styles.moreText, { color: theme.colors.text }]}>{t('creaciones.loadMore')}</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </CreatorShell>
  );
  }

  /* ── LA APP: la biblioteca rediseñada ──────────────────────────────────── */
  const ORDENES = [
    { id: 'recent' as const, texto: t('creaciones.sortRecent') },
    { id: 'oldest' as const, texto: t('creaciones.sortOldest') },
  ];
  return (
    <CreatorShell activeId="creations" title={t('creaciones.title')} breadcrumb="Weë AI" sinFranjaSuperior>
      <View style={[styles.app, dir.contenedor]}>
        <CabeceraDeBiblioteca titulo={t('creaciones.title')} />

        {/* Habla de los dos perfiles: es de la CUENTA, y se ve igual desde el Perfil Real y el Perfil Weë. */}
        <TarjetaDeAviso texto={t('creaciones.intro')} />

        <View style={styles.appSeccion}>
          <View style={styles.appFilaTitulo}>
            <Text style={[styles.appContador, dir.texto]} numberOfLines={1} accessibilityRole="header">
              {estado.fase === 'lista' ? t('creaciones.count', { contador: estado.items.length }) : t('creaciones.title')}
            </Text>
            <SelectorDeOrden
              opciones={ORDENES}
              valor={orden}
              onChange={setOrden}
              etiqueta={t('creaciones.sortLabel')}
              abierto={ordenAbierto}
              onAbrir={setOrdenAbierto}
            />
          </View>

          <View style={styles.appFiltros} accessibilityRole="tablist" accessibilityLabel={t('creaciones.filterLabel')}>
            {FILTROS.map((f) => (
              <ChipDeFiltro
                key={f.id}
                texto={t(f.clave)}
                icono={ICONO_DE_FILTRO[f.id]}
                activo={filtro === f.id}
                onPress={() => { setOrdenAbierto(false); setFiltro(f.id); }}
              />
            ))}
          </View>

          {estado.fase === 'cargando' ? (
            <View style={styles.centro}>
              <ActivityIndicator color={PALETA_BIBLIOTECA.morado} />
              <Text style={[styles.centroText, { color: theme.colors.textSecondary }]}>{t('creaciones.loading')}</Text>
            </View>
          ) : estado.fase === 'error' ? (
            <VacioDeBiblioteca icono="cloud-offline-outline" titulo={t('creaciones.loadFailed')} accion={t('creaciones.retry')} onAccion={cargar} />
          ) : estado.items.length === 0 ? (
            filtro === 'all' ? (
              <VacioDeBiblioteca
                titulo={t('creaciones.emptyTitle')}
                texto={t('creaciones.emptyText')}
                accion={t('creaciones.emptyAction')}
                onAccion={() => navigation.navigate('WeeCreator')}
              />
            ) : (
              <VacioDeBiblioteca icono={ICONO_DE_FILTRO[filtro] ?? 'image-outline'} titulo={t('creaciones.emptyFiltered')} />
            )
          ) : (
            <>
              <GaleriaDeCreaciones items={estado.items} columnas={columnas} onOpen={abrir} onDelete={eliminar} onDownload={descargar} />
              {estado.pagina.hayMas && (
                <BotonSecundario texto={t('creaciones.loadMore')} onPress={cargarMas} disabled={estado.cargandoMas}>
                  {estado.cargandoMas ? <ActivityIndicator color={PALETA_BIBLIOTECA.morado} /> : undefined}
                </BotonSecundario>
              )}
            </>
          )}
        </View>
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  app: {
    gap: 22,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  appSeccion: {
    gap: 16,
  },
  appFilaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 20,
  },
  appFiltros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  appContador: {
    flex: 1,
    color: PALETA_BIBLIOTECA.texto,
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.4,
  },
  intro: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  introText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  section: {
    gap: SPACING.md,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  centro: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  centroText: {
    fontSize: FONT_SIZE.sm,
  },
  box: {
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  emptyEmoji: {
    fontSize: scale(40),
  },
  boxTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  boxText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  button: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    height: scale(44),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1F2937',
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  more: {
    height: scale(44),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  moreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

/* Weë AI es de la cuenta, no de un perfil: el taller se ve claro con las dos caras. */
export default enTemaClaro(MisCreacionesScreen);
