import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../navigation/MainStackNavigator';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import CreatorShell from '../components/creator/CreatorShell';
import { CajaAnclada } from '../components/creator/CajaQueCrece';
import AjustesContextuales from '../components/creator/AjustesContextuales';
import ProjectPicker from '../components/creator/ProjectPicker';
import BarraDeComandos from '../components/designReferencia/BarraDeComandos';
import PanelDeBiblioteca, { Carga } from '../components/designReferencia/PanelDeBiblioteca';
import Lienzo from '../components/designReferencia/Lienzo';
import ComposerDeDesign from '../components/designReferencia/ComposerDeDesign';
import Inspector from '../components/designReferencia/Inspector';
import FranjaDeTrabajos from '../components/designReferencia/FranjaDeTrabajos';
import HojaDeCapacidad from '../components/designReferencia/HojaDeCapacidad';
import HojaDeCapacidades from '../components/designReferencia/HojaDeCapacidades';
import { Pestanas } from '../components/designReferencia/piezas';
import { siempreSePregunta } from '../constants/ajustesContextuales';
import { AJUSTES_DE_DESIGN } from '../constants/designTools';
import type { Adjunto } from '../constants/weeWorkspaces';
import {
  CLAVE_DE_LA_SUPERFICIE, DESIGN_REFERENCIA_EN_LA_APP, SUPERFICIES, CapacidadDeDesign, GrupoDeComandos, IntencionDeDesign,
  PestanaDeBiblioteca, SeccionDelInspector, Superficie, TipoDeIntegracion, capacidadPorId, esGrupoDeComandos,
} from '../constants/designReferencia';
import {
  DESTINO_DEL_GRUPO, FiltroDeBiblioteca, SeleccionDeDesign, contextoDeDesign, contextoParaAbrir, contextoParaCambiar,
  disposicionDelWorkspace, estadoDeLaCapacidad, resumenDeSeleccion, simularResultado, sonDeDesign, tipoDeSeleccion,
} from '../utils/designReferencia';
import { assetsService, AssetDoc } from '../services/assetsService';
import { creatorService, CreatorJob } from '../services/creatorService';
import { projectsService, WeeProject } from '../services/projectsService';
import { descargarCreacion } from '../services/assetDownload';
import { notify } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../constants/design';
import { scale } from '../utils/scale';

/** Los ajustes de Weë Design, con la misma forma que en su pantalla de siempre. */
const AJUSTES = siempreSePregunta(AJUSTES_DE_DESIGN);
const urlDe = (a: AssetDoc) => assetsService.urlDeEntrega(a);
const LADO = ['biblioteca', 'inspector', 'trabajos'] as const;
type Lado = typeof LADO[number];

/**
 * WEË DESIGN · REFERENCIA FUNCIONAL DEL ESPACIO DE TRABAJO (Línea C, 2026-10-07).
 *
 * NO es la pantalla de Weë Design: esa sigue siendo `DesignScreen`, intacta
 * (CLAUDE.md §5). Esto es la referencia funcional —qué hay, dónde vive y qué pasa
 * al pulsar cada cosa—, detrás de su puerta (`DESIGN_REFERENCIA_EN_LA_APP`,
 * cerrada) y con estética neutra: la identidad es otra misión, que no ha empezado.
 *
 * Lo que hace de verdad, con la puerta abierta y una cuenta: crear un concepto y
 * transformar un espacio (→ `CreatorFlow`, donde Weë Brain pregunta, el precio se
 * ve antes de crear y el Credit Engine reserva y cobra), leer las creaciones, los
 * trabajos y los proyectos de la cuenta, descargar, publicar una imagen y guardar
 * un trabajo en un proyecto. Todo lo demás se ve apagado con su motivo y se puede
 * RECORRER en simulación, sin ejecutar nada.
 */
const ReferenciaCerrada: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <CreatorShell activeId="design" overline={t('designRef.badge')} title="Weë Design" breadcrumb="Weë Design">
      <View style={estilos.cerrada}>
        <Text style={[estilos.cerradaTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('designRef.closedTitle')}</Text>
        <Text style={[estilos.cerradaTexto, { color: theme.colors.textSecondary }]}>{t('designRef.closedBody')}</Text>
      </View>
    </CreatorShell>
  );
};

const EspacioDeTrabajo: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'DesignReferencia'>>();
  const { user } = useAuth();
  const { isDesktop, height } = useResponsive();

  const grupoPedido = esGrupoDeComandos(route.params?.grupo) ? route.params.grupo : 'crear';
  const [grupo, setGrupo] = useState<GrupoDeComandos>(grupoPedido);
  const [superficie, setSuperficie] = useState<Superficie>('lienzo');
  const [lado, setLado] = useState<Lado>('biblioteca');
  const [pestana, setPestana] = useState<PestanaDeBiblioteca>('creaciones');
  const [seccion, setSeccion] = useState<SeccionDelInspector | null>(null);
  const [intencion, setIntencion] = useState<IntencionDeDesign>('crear');
  const [que, setQue] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [seleccion, setSeleccion] = useState<SeleccionDeDesign>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [descubrir, setDescubrir] = useState(false);
  const [picker, setPicker] = useState<'cambiar' | 'guardar' | null>(null);
  const [proyecto, setProyecto] = useState<WeeProject | null>(null);
  const [filtro, setFiltro] = useState<FiltroDeBiblioteca>('todo');
  const [creaciones, setCreaciones] = useState<Carga<AssetDoc>>({ estado: 'cargando', items: [] });
  const [trabajos, setTrabajos] = useState<Carga<CreatorJob>>({ estado: 'cargando', items: [] });
  const [delProyecto, setDelProyecto] = useState<Carga<CreatorJob>>({ estado: 'listo', items: [] });
  const [recarga, setRecarga] = useState(0);
  const [ancho, setAncho] = useState(0);
  const [altoColumna, setAltoColumna] = useState(0);
  /* Numera los resultados simulados (`sim-<capacidad>-<n>`): sin reloj ni azar. */
  const simulados = useRef(0);

  /* ── Lo que se lee de la cuenta: creaciones, trabajos y los del proyecto ── */
  useEffect(() => {
    if (!user) {
      setCreaciones({ estado: 'sinSesion', items: [] });
      setTrabajos({ estado: 'sinSesion', items: [] });
      return undefined;
    }
    let vivo = true;
    setCreaciones({ estado: 'cargando', items: [] });
    setTrabajos({ estado: 'cargando', items: [] });
    assetsService.listar(user.uid, {})
      .then((pagina) => { if (vivo) setCreaciones({ estado: 'listo', items: pagina.items }); })
      .catch((error) => { console.warn('Referencia de Weë Design: creaciones', error); if (vivo) setCreaciones({ estado: 'error', items: [] }); });
    creatorService.getMyJobs(user.uid, 30)
      .then((jobs) => { if (vivo) setTrabajos({ estado: 'listo', items: sonDeDesign(jobs) }); })
      .catch((error) => { console.warn('Referencia de Weë Design: trabajos', error); if (vivo) setTrabajos({ estado: 'error', items: [] }); });
    return () => { vivo = false; };
  }, [user, recarga]);

  useEffect(() => {
    if (!user || !proyecto) {
      setDelProyecto({ estado: user ? 'listo' : 'sinSesion', items: [] });
      return undefined;
    }
    let vivo = true;
    setDelProyecto({ estado: 'cargando', items: [] });
    projectsService.jobsForProject(user.uid, proyecto.id)
      .then((jobs) => { if (vivo) setDelProyecto({ estado: 'listo', items: jobs }); })
      .catch((error) => { console.warn('Referencia de Weë Design: proyecto', error); if (vivo) setDelProyecto({ estado: 'error', items: [] }); });
    return () => { vivo = false; };
  }, [user, proyecto, recarga]);

  /* ── La disposición: por el ancho que de verdad queda ─────────────────── */
  const disposicion = ancho > 0
    ? disposicionDelWorkspace(ancho, { biblioteca: scale(280), inspector: scale(320), lienzoMinimo: scale(400) })
    : isDesktop ? 'tresColumnas' : 'unaSuperficie';
  const altoEscritorio = Math.max(scale(560), height - scale(64) - SPACING.xl * 2);
  /* La cadena, la barra y las acciones viven dentro del lienzo: necesita sitio también en el teléfono. */
  const altoDelLienzo = Math.min(scale(680), Math.max(scale(460), height * 0.62));

  /** Llevar a una superficie: en el teléfono la cambia; con columnas, abre ese panel lateral. */
  const mostrar = useCallback((s: Superficie) => {
    setSuperficie(s);
    if (s !== 'lienzo') setLado(s);
  }, []);

  const irAlGrupo = useCallback((g: GrupoDeComandos) => {
    setGrupo(g);
    const d = DESTINO_DEL_GRUPO[g];
    if (d.intencion) setIntencion(d.intencion);
    if (d.seccion) setSeccion(d.seccion);
    if (d.pestana) setPestana(d.pestana);
    mostrar(d.superficie);
  }, [mostrar]);

  /* El grupo que trae la dirección (`/design/referencia/<grupo>`), una vez. */
  useEffect(() => { irAlGrupo(grupoPedido); }, [grupoPedido, irAlGrupo]);

  const estadoDe = useCallback(
    (cap: CapacidadDeDesign) => estadoDeLaCapacidad(cap, resumenDeSeleccion(seleccion, urlDe)),
    [seleccion],
  );

  const palabras = useMemo(() => Object.entries(ajustes).flatMap(([grupoDeAjuste, opcion]) => {
    if (opcion === 'auto') return [];
    const g = AJUSTES_DE_DESIGN.find((x) => x.id === grupoDeAjuste);
    const o = g?.opciones.find((x) => x.id === opcion);
    return o ? [t(o.clave)] : [];
  }), [ajustes, t]);

  /* ── Qué hace cada comando: un manejador por tipo, y ninguno mudo ──────── */
  const abrirDetalle = useCallback((cap: CapacidadDeDesign) => setAbierta(cap.id), []);

  const descargar = useCallback(async () => {
    if (seleccion?.tipo !== 'material') return;
    const a = seleccion.asset;
    const url = urlDe(a);
    if (!url) return;
    const r = await descargarCreacion(url, a.kind, a.mimeType);
    if (r === 'guardado') notify(t('creaciones.downloaded'));
    else if (r === 'sin_permiso') notify(t('creaciones.downloadPermission'));
    else if (r === 'error') notify(t('creaciones.downloadFailed'));
  }, [seleccion, t]);

  const manejadores: Record<TipoDeIntegracion, (cap: CapacidadDeDesign) => void> = {
    flujo: (cap) => { if (cap.intencion) setIntencion(cap.intencion); mostrar('lienzo'); },
    cambiarTrabajo: () => { setIntencion('editar'); mostrar('lienzo'); },
    abrirTrabajo: () => {
      if (seleccion?.tipo === 'trabajo') {
        navigation.navigate('CreatorFlow', contextoParaAbrir({ experienceId: seleccion.job.experienceId, jobId: seleccion.job.id }));
      } else if (seleccion?.tipo === 'material') {
        const experiencia = seleccion.asset.metadata?.experienceId;
        const jobId = seleccion.asset.provenance.jobId;
        if (jobId && typeof experiencia === 'string') navigation.navigate('CreatorFlow', contextoParaAbrir({ experienceId: experiencia, jobId }));
      }
    },
    descargar: () => { void descargar(); },
    publicar: () => {
      if (seleccion?.tipo !== 'material') return;
      const url = urlDe(seleccion.asset);
      if (!url) return;
      navigation.navigate('Create', { kind: 'image', sourceSection: 'design', prefill: { media: [{ type: 'image', uri: url, assetId: seleccion.asset.assetId }] } });
    },
    guardarEnProyecto: () => setPicker('guardar'),
    proyecto: () => setPicker('cambiar'),
    biblioteca: () => { setPestana('creaciones'); mostrar('biblioteca'); },
    filtrar: () => { setPestana('creaciones'); mostrar('biblioteca'); },
    historial: () => { setPestana('proyecto'); mostrar('biblioteca'); },
    propiedades: () => { setSeccion('objeto'); mostrar('inspector'); },
    sugerencias: () => mostrar('lienzo'),
    explicar: () => setDescubrir(true),
    ninguna: abrirDetalle,
  };

  /** Pulsar una capacidad: se usa si se puede; si no, se explica. Nunca nada. */
  const pulsar = (cap: CapacidadDeDesign) => {
    if (estadoDe(cap).disponible) manejadores[cap.integracion.tipo](cap);
    else abrirDetalle(cap);
  };

  const enviar = () => {
    if (!user) { navigation.navigate('Login'); return; }
    if (intencion === 'editar') {
      if (seleccion?.tipo !== 'trabajo' || !texto.trim()) return;
      const objetivo = t('weeai.goalWithChange', { objetivo: seleccion.job.goal, cambio: texto.trim() });
      navigation.navigate('CreatorFlow', contextoParaCambiar({ experienceId: seleccion.job.experienceId }, objetivo));
      return;
    }
    const contexto = contextoDeDesign({ intencion, texto, que, ajustesEnPalabras: palabras.join(', '), adjuntos });
    if (contexto) navigation.navigate('CreatorFlow', contexto);
  };

  const adjuntar = async () => {
    if (intencion === 'crear') {
      const inspiracion = capacidadPorId('styleReference');
      if (inspiracion) pulsar(inspiracion);
      return;
    }
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const elegido = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const foto = elegido.canceled ? null : elegido.assets?.[0];
    if (!foto?.uri) return;
    setAdjuntos((antes) => [...antes, { clase: 'fotoDeUnEspacio', uri: foto.uri, nombre: foto.fileName ?? undefined }]);
  };

  const elegirMaterial = (asset: AssetDoc) => { setSeleccion({ tipo: 'material', asset }); setSeccion('objeto'); if (disposicion === 'unaSuperficie') mostrar('lienzo'); };
  const elegirTrabajo = (job: CreatorJob) => { setSeleccion({ tipo: 'trabajo', job }); setSeccion('objeto'); if (disposicion === 'unaSuperficie') mostrar('lienzo'); };

  const alElegirProyecto = (p: WeeProject) => {
    const modo = picker;
    setPicker(null);
    setProyecto(p);
    if (modo === 'guardar' && seleccion?.tipo === 'trabajo') {
      projectsService.assignJob(seleccion.job.id, p.id)
        .then(() => notify(t('weeai.savedIn', { proyecto: p.name })))
        .catch((error) => { console.warn('Referencia de Weë Design: guardar en proyecto', error); notify(t('weeai.couldNotSave'), t('weeai.couldNotSaveToProject')); });
      return;
    }
    setPestana('proyecto');
    mostrar('biblioteca');
  };

  const tipo = tipoDeSeleccion(seleccion);
  const capAbierta = abierta ? capacidadPorId(abierta) ?? null : null;
  const puedeEscribir = intencion !== 'editar' || seleccion?.tipo === 'trabajo';

  /* ── Las piezas ──────────────────────────────────────────────────────── */
  const barra = (
    <BarraDeComandos proyecto={proyecto?.name ?? null} grupo={grupo} onGrupo={irAlGrupo} onProyecto={() => setPicker('cambiar')} onDescubrir={() => setDescubrir(true)} />
  );
  const biblioteca = (
    <PanelDeBiblioteca
      pestana={pestana} onPestana={setPestana} creaciones={creaciones} filtro={filtro} onFiltro={setFiltro} urlDe={urlDe}
      elegidoId={seleccion?.tipo === 'material' ? seleccion.asset.assetId : null} onElegirMaterial={elegirMaterial}
      proyecto={proyecto?.name ?? null} trabajosDelProyecto={delProyecto} onElegirTrabajo={elegirTrabajo}
      adjuntos={adjuntos} onQuitarAdjunto={(i) => setAdjuntos((antes) => antes.filter((_, j) => j !== i))}
      estadoDe={estadoDe} onCapacidad={pulsar} onReintentar={() => setRecarga((n) => n + 1)} onIniciarSesion={() => navigation.navigate('Login')}
    />
  );
  const lienzo = (alto?: number) => (
    <Lienzo
      seleccion={seleccion} urlDe={urlDe} estadoDe={estadoDe} onCapacidad={pulsar} onDetalle={abrirDetalle}
      onVerCreaciones={() => navigation.navigate('MisCreaciones')} alto={alto}
    />
  );
  const composer = (
    <ComposerDeDesign
      intencion={intencion} onIntencion={setIntencion} que={que} onQue={setQue} texto={texto} onTexto={setTexto}
      adjuntos={adjuntos} onQuitarAdjunto={(i) => setAdjuntos((antes) => antes.filter((_, j) => j !== i))}
      ajustes={palabras} onAjustes={() => setAjustesAbiertos(true)} onAdjuntar={() => { void adjuntar(); }} onEnviar={enviar}
      puedeEscribir={puedeEscribir} estadoDe={estadoDe} onCapacidad={pulsar}
    />
  );
  const inspector = (
    <Inspector seleccion={seleccion} tipo={tipo} seccion={seccion} onSeccion={setSeccion} estadoDe={estadoDe} onCapacidad={pulsar} />
  );
  const franja = (horizontal: boolean) => (
    <FranjaDeTrabajos
      trabajos={trabajos} elegidoId={seleccion?.tipo === 'trabajo' ? seleccion.job.id : null} onElegirTrabajo={elegirTrabajo}
      estadoDe={estadoDe} onCapacidad={pulsar} onReintentar={() => setRecarga((n) => n + 1)} horizontal={horizontal}
    />
  );
  const panelLateral = (l: Lado) => (l === 'biblioteca' ? biblioteca : l === 'inspector' ? inspector : franja(false));

  const medir = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setAncho((antes) => (Math.abs(antes - w) > 1 ? w : antes));
  };
  const medirColumna = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setAltoColumna((antes) => (Math.abs(antes - h) > 1 ? h : antes));
  };
  /* La caja crece hasta el 45 % de la columna: el lienzo nunca desaparece del todo. */
  const topeDeLaCaja = altoColumna > 0 ? Math.max(scale(150), altoColumna * 0.45) : 0;

  let cuerpo: React.ReactNode;
  if (disposicion === 'tresColumnas') {
    cuerpo = (
      <View style={[estilos.espacio, { height: altoEscritorio }]}>
        {barra}
        <View style={estilos.columnas}>
          <View style={[estilos.lateral, { width: scale(280) }]}>{biblioteca}</View>
          <View style={estilos.centro} onLayout={medirColumna}>
            {lienzo()}
            <CajaAnclada alto={topeDeLaCaja}>{composer}</CajaAnclada>
          </View>
          <View style={[estilos.lateral, { width: scale(320) }]}>{inspector}</View>
        </View>
        <View style={{ height: scale(132) }}>{franja(true)}</View>
      </View>
    );
  } else if (disposicion === 'dosColumnas') {
    cuerpo = (
      <View style={[estilos.espacio, isDesktop ? { height: altoEscritorio } : null]}>
        {barra}
        <View style={[estilos.columnas, !isDesktop ? { height: altoDelLienzo + scale(120) } : null]}>
          <View style={estilos.centro} onLayout={medirColumna}>
            {lienzo()}
            {isDesktop ? <CajaAnclada alto={topeDeLaCaja}>{composer}</CajaAnclada> : null}
          </View>
          <View style={[estilos.lateral, { width: scale(320) }]}>
            <Pestanas opciones={LADO.map((id) => ({ id, clave: CLAVE_DE_LA_SUPERFICIE[id] }))} elegida={lado} onElegir={setLado} etiqueta={t('designRef.surfacePicker')} />
            {panelLateral(lado)}
          </View>
        </View>
      </View>
    );
  } else {
    cuerpo = (
      <View style={estilos.espacio}>
        {barra}
        <Pestanas opciones={SUPERFICIES.map((id) => ({ id, clave: CLAVE_DE_LA_SUPERFICIE[id] }))} elegida={superficie} onElegir={setSuperficie} etiqueta={t('designRef.surfacePicker')} />
        {superficie === 'lienzo' ? lienzo(altoDelLienzo) : <View style={{ minHeight: altoDelLienzo }}>{panelLateral(superficie)}</View>}
      </View>
    );
  }

  /* En el teléfono y la tableta la caja va anclada abajo, como la de Weë Brain; en el teléfono, solo con el lienzo. */
  const pie = !isDesktop && (disposicion === 'dosColumnas' || superficie === 'lienzo') ? composer : undefined;

  return (
    <>
      <CreatorShell
        activeId="design"
        overline={t('designRef.badge')}
        title="Weë Design"
        breadcrumb="Weë Design"
        contentStyle={isDesktop ? estilos.contenidoEscritorio : undefined}
        pie={pie}
      >
        <View onLayout={medir}>{cuerpo}</View>
      </CreatorShell>

      <HojaDeCapacidad
        cap={capAbierta}
        estado={capAbierta ? estadoDe(capAbierta) : null}
        onCerrar={() => setAbierta(null)}
        onUsar={(cap) => { setAbierta(null); manejadores[cap.integracion.tipo](cap); }}
        onAbrirCapacidad={(id) => setAbierta(id)}
        onVerSimulado={(cap) => {
          setAbierta(null);
          simulados.current += 1;
          const n = simulados.current;
          /* Si lo de antes le sirve de entrada, entra POR REFERENCIA y queda en su linaje. */
          setSeleccion((antes) => simularResultado(cap, antes, n));
          setSeccion('objeto');
          mostrar('lienzo');
        }}
      />
      <HojaDeCapacidades visible={descubrir} estadoDe={estadoDe} onElegir={(cap) => { setDescubrir(false); setAbierta(cap.id); }} onCerrar={() => setDescubrir(false)} />
      <AjustesContextuales
        visible={ajustesAbiertos}
        contexto="imagen"
        grupos={AJUSTES}
        pista={t('design.settingsHint')}
        referencias={adjuntos.length}
        elegido={ajustes}
        onElegir={(g, o) => setAjustes((antes) => ({ ...antes, [g]: o }))}
        onCerrar={() => setAjustesAbiertos(false)}
      />
      <ProjectPicker
        visible={picker !== null}
        goal={seleccion?.tipo === 'trabajo' ? seleccion.job.goal : texto}
        onClose={() => setPicker(null)}
        onPick={alElegirProyecto}
      />
    </>
  );
};

/** Con la puerta cerrada no se monta el espacio de trabajo: ni lee la cuenta ni llama a nada. */
const DesignReferenciaScreen: React.FC = () => {
  if (!DESIGN_REFERENCIA_EN_LA_APP) return <ReferenciaCerrada />;
  return <EspacioDeTrabajo />;
};

const estilos = StyleSheet.create({
  cerrada: { gap: SPACING.sm, paddingVertical: SPACING.xl },
  cerradaTitulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  cerradaTexto: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  contenidoEscritorio: { maxWidth: '100%', paddingBottom: SPACING.xl },
  espacio: { gap: SPACING.sm },
  columnas: { flex: 1, flexDirection: 'row', gap: SPACING.md, minHeight: 0 },
  lateral: { gap: SPACING.xs },
  centro: { flex: 1, minWidth: 0, gap: SPACING.sm },
});

/* La referencia es de la CUENTA, como el resto del taller: se ve clara con las dos caras. */
export default enTemaClaro(DesignReferenciaScreen);
