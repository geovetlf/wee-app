import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Audio, ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { textoDelServidor, textoDeObjetivo } from '../../i18n/servidor';
import { bloqueDelPresupuesto, palabrasDelItinerario, textoParaLeer, tituloDelDia } from '../../utils/textoDeResultado';
import { useResponsive } from '../../hooks/useResponsive';
import { CreatorJob } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { descargarCreacion } from '../../services/assetDownload';
import { notify } from '../../utils/notify';
import { TarjetaTresD } from './TarjetaTresD';

/** Forma de onda decorativa del reproductor. */
const WAVE = [8, 14, 20, 12, 26, 18, 10, 22, 16, 28, 12, 20, 9, 24, 14, 18, 26, 11, 17, 22, 13, 19, 8, 15];

/** Un archivo real (mp4, mp3) frente a la vista previa del modo demo (SVG en línea). */
const isRealMedia = (url?: string): boolean => !!url && /^https?:\/\//.test(url);

const formatDuration = (seconds?: number): string => {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/*
 * Un itinerario de diez días son varios miles de caracteres, y de un tirón no se
 * lee: se hace scroll hasta el final buscando el presupuesto. Así que los días se
 * pliegan —el primero abierto, para que se vea de qué va— y cada uno se abre
 * cuando toca.
 *
 * Solo se pliega lo que de verdad son días. Un texto sin bloques "DÍA n" pasa
 * entero, igual que siempre: esto no cambia ni una línea del resto de Weë.
 */
const LINEA_DIA = /^d[íi]a\s+\d+/i;
const LINEA_CIERRE = /^presupuesto\b/i;

/*
 * El día y el presupuesto se piden en español (son el contrato con el servidor, ver `utils/textoDeResultado.ts`),
 * pero si el modelo los escribiera en el idioma de la persona —«DAG 1 ·», «BUDGET:»— se reconocen también: llegan
 * en `palabras`, que es lo que dice el diccionario activo.
 */
const escaparPalabra = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const conPalabra = (base: RegExp, palabra: string | undefined, cola: string): RegExp =>
  palabra && palabra.trim() ? new RegExp(`^(?:${base.source.slice(1)}|${escaparPalabra(palabra.trim())}${cola})`, 'i') : base;

interface Dia {
  titulo: string;
  cuerpo: string;
}

export const partirEnDias = (
  texto: string,
  palabras?: { dia?: string; presupuesto?: string },
): { intro: string; dias: Dia[]; cierre: string } | null => {
  const lineaDia = conPalabra(LINEA_DIA, palabras?.dia, '\\s+\\d+');
  const lineaCierre = conPalabra(LINEA_CIERRE, palabras?.presupuesto, '\\b');
  const dias: Dia[] = [];
  const intro: string[] = [];
  const cierre: string[] = [];
  let actual: { titulo: string; cuerpo: string[] } | null = null;
  let cerrado = false;

  const guardar = () => {
    if (!actual) return;
    dias.push({ titulo: actual.titulo, cuerpo: actual.cuerpo.join('\n').trim() });
    actual = null;
  };

  for (const linea of texto.split('\n')) {
    const limpia = linea.trim();
    if (cerrado) {
      cierre.push(linea);
    } else if (lineaCierre.test(limpia)) {
      // El presupuesto no se pliega nunca: es lo primero que se busca.
      guardar();
      cerrado = true;
      cierre.push(linea);
    } else if (lineaDia.test(limpia)) {
      guardar();
      actual = { titulo: limpia, cuerpo: [] };
    } else if (actual) {
      actual.cuerpo.push(linea);
    } else {
      intro.push(linea);
    }
  }
  guardar();

  // Con un solo día no hay nada que plegar.
  if (dias.length < 2) return null;
  return { intro: intro.join('\n').trim(), dias, cierre: cierre.join('\n').trim() };
};

/** El texto de un resultado: entero, o por días cuando es un itinerario. */
const TextoDelResultado: React.FC<{ texto: string }> = ({ texto: crudo }) => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  /* Sin las marcas de la máquina y con las del texto en el idioma de quien mira (`utils/textoDeResultado.ts`). */
  const texto = React.useMemo(() => textoParaLeer(crudo, t, locale), [crudo, t, locale]);
  const partes = React.useMemo(() => partirEnDias(texto, palabrasDelItinerario(t)), [texto, t]);
  // El primero abierto: quien llega ve enseguida de qué va el viaje.
  const [abiertos, setAbiertos] = useState<Record<number, boolean>>({ 0: true });

  if (!partes) {
    return <Text selectable style={[styles.resultText, { color: theme.colors.text }]}>{texto}</Text>;
  }

  // Destino, fechas y duración: el primero grande, los otros dos debajo.
  const cabecera = partes.intro.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <View style={styles.dias}>
      {cabecera.length > 0 && (
        <View style={[styles.cabeceraViaje, { borderColor: theme.colors.accent }]}>
          <Text selectable style={[styles.destino, { color: theme.colors.text }]}>{cabecera[0]}</Text>
          {cabecera.slice(1).map((linea, indice) => (
            <Text
              key={linea + indice}
              selectable
              style={[indice === 0 ? styles.fechasViaje : styles.duracionViaje, { color: indice === 0 ? theme.colors.text : theme.colors.textSecondary }]}
            >
              {linea}
            </Text>
          ))}
        </View>
      )}
      {partes.dias.map((dia, indice) => {
        const abierto = !!abiertos[indice];
        return (
          <View key={dia.titulo + indice} style={[styles.dia, { borderColor: abierto ? theme.colors.accent : theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => setAbiertos((previo) => ({ ...previo, [indice]: !previo[indice] }))}
              activeOpacity={0.8}
              style={styles.diaHead}
              accessibilityRole="button"
              accessibilityState={{ expanded: abierto }}
              aria-expanded={abierto}
              accessibilityLabel={t(abierto ? 'weeai.dayCollapse' : 'weeai.dayExpand', { titulo: tituloDelDia(dia.titulo, t, locale) })}
            >
              <Text style={[styles.diaTitulo, { color: theme.colors.text }]}>{tituloDelDia(dia.titulo, t, locale)}</Text>
              <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={scale(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {abierto && !!dia.cuerpo && (
              <Text selectable style={[styles.resultText, { color: theme.colors.text }]}>{dia.cuerpo}</Text>
            )}
          </View>
        );
      })}
      {!!partes.cierre && <Text selectable style={[styles.resultText, { color: theme.colors.text }]}>{bloqueDelPresupuesto(partes.cierre, t, locale)}</Text>}
    </View>
  );
};

/**
 * Lo que sale de la tarjeta hacia el compositor: qué archivo, de qué tipo y
 * —cuando existe— qué material es. El id es lo que evita la copia.
 */
export interface PublicableMedia {
  uri: string;
  type: 'image' | 'video';
  assetId?: string;
}

interface ResultCardProps {
  experienceName: string;
  job: CreatorJob;
  busy: boolean;
  onAnotherVersion: () => void;
  onEdit: (instruction: string) => void;
  /**
   * Publicar lo que se está mirando. Recibe el material elegido —el que está
   * en grande—, con su tipo (imagen o vídeo) y, si el servidor ya lo convirtió
   * en material de la cuenta, su id: así el compositor lo referencia en vez de
   * volver a subirlo. Sin material real que publicar (modo demo) llega vacío.
   */
  onPublish: (media?: PublicableMedia) => void;
  /** Foto original de la persona: el resultado se muestra como antes / después. */
  beforeImageUri?: string;
  /** Weë Writer: llevar el texto al editor. */
  onOpenInEditor?: () => void;
  /**
   * Seguir por uno de los caminos propuestos, sin volver a empezar (fase 2E-60).
   * Solo aparece cuando Weë aconsejó en vez de generar: "No sé qué hacer".
   */
  onContinue?: (optionId: string) => void;
  /** Guardar en "Mis proyectos". */
  onSaveToProject?: () => void;
  /** Nombre del proyecto donde ya está guardada. */
  projectName?: string;
  /** Abrir «Mis creaciones», donde lo generado ya está guardado como material de la cuenta (Fase 11). */
  onOpenCreations?: () => void;
  /**
   * Lo que costaría volver a crear, en Credits. Es el mismo número que se vio
   * antes de crear la primera vez, porque el plan que se repite es el mismo.
   * Sin él, "Crear otra versión" y los retoques se pulsan a ciegas: vuelven a
   * generar y vuelven a cobrar sin haber avisado.
   */
  regenerateCredits?: number;
}

/**
 * "✨ Listo" + resultado + [Crear otra versión] [Publicar en mi comunidad]
 *
 * Los cambios se piden con las frases de un toque —"hazlo más realista",
 * "cambia el color"—, no escribiéndolos: la caja "¿Qué cambiamos?" se retiró.
 */
/**
 * Los tres caminos que Weë propone tras mirar el espacio. Los identificadores
 * son los de la plantilla: elegir uno lleva directo a ese plan (fase 2E-60).
 */
const CAMINOS_HOGAR: { optionId: string; clave: string }[] = [
  { optionId: 'design', clave: 'weeai.pathRedesign' },
  { optionId: 'colors', clave: 'weeai.pathColors' },
  { optionId: 'furniture', clave: 'weeai.pathFurniture' },
];

const ResultCard: React.FC<ResultCardProps> = ({ experienceName, job, busy, onAnotherVersion, onEdit, onPublish, beforeImageUri, onOpenInEditor, onContinue, onSaveToProject, projectName, onOpenCreations, regenerateCredits }) => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  /* El título de cada resultado es el paso del plan, escrito por el servidor: se pinta en el idioma de quien mira. */
  const titulo = (texto: string): string => textoDelServidor(texto, { t, locale, experiencia: job.experienceId });
  const { isDesktop, isTablet } = useResponsive();
  /*
   * En móvil, el antes y el después van uno encima de otro (fase 2E-63).
   *
   * Lado a lado en 375 px daban dos imágenes de 154 px: comparar era imposible,
   * y comparar es justo lo que se viene a hacer. Apiladas, cada una ocupa el
   * ancho entero. En pantallas grandes siguen juntas, que es donde funciona.
   */
  const apilar = !isDesktop && !isTablet;
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  /** La lista de cambios y compras empieza plegada: primero se decide, luego se lee. */
  const [verDetalle, setVerDetalle] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Audio real (voz de Weë): un solo reproductor a la vez
  const stopSound = async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {
        // ya estaba descargado
      }
    }
  };
  useEffect(() => () => {
    stopSound();
  }, []);
  const toggleAudio = async (stepId: string, url?: string) => {
    if (playingId === stepId) {
      await stopSound();
      setPlayingId(null);
      return;
    }
    await stopSound();
    setPlayingId(stepId);
    if (!isRealMedia(url)) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url as string }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId((current) => (current === stepId ? null : current));
          stopSound();
        }
      });
    } catch (error) {
      console.warn('No se pudo reproducir el audio:', error);
      setPlayingId(null);
    }
  };

  // Frases de edición en lenguaje humano (docs/CREATOR-BUILD.md §14)
  const quickEdits = [t('weeai.makeItRealistic'), t('weeai.changeItsColor'), t('weeai.simpler'), t('weeai.moreStriking')];

  /** "· ≈ 9 Credits" para pegar al botón que vuelve a gastar. Vacío si no se sabe. */
  const precio = regenerateCredits && regenerateCredits > 0 ? t('weeai.regeneratePriceSuffix', { credits: formato.numero(regenerateCredits) }) : '';

  /*
   * UN MUNDO O UN MODELO 3D NO ES UNA IMAGEN. Antes caían aquí y se pintaban —y se podían publicar— como fotos; ahora
   * van aparte, a su tarjeta (`TarjetaTresD`), que dice lo que son y no finge un visor.
   */
  const esTresD = (kind: string) => kind === 'world' || kind === 'model3d';
  const visuals = job.results.filter((r) => r.url && !esTresD(r.kind));
  const tresD = job.results.filter((r) => esTresD(r.kind));

  /*
   * ¿Esta imagen es de un espacio, y no de una persona o un producto?
   *
   * Se pregunta al plan, no a la sección: el paso que la produjo usa
   * `image.space_restyle`, que por definición trabaja sobre la foto de un lugar
   * conservando paredes, ventanas y proporciones. Es la única pregunta que
   * distingue este contenido, y de ella cuelgan las tres decisiones visuales que
   * NO valen para el resto: marco apaisado, comparación con el original y orden
   * del resultado. Un retrato de Weë Beauty o un plato de Weë Chef no pasan por
   * aquí y siguen exactamente igual que antes (fases 2E-59 y 2E-63).
   */
  const esEspacio = (stepId: string): boolean =>
    job.plan?.steps.some((s) => s.id === stepId && s.capability === 'image.space_restyle') === true;

  /** Además hay foto original: entonces se puede comparar el antes con el después. */
  const transformaTuFoto = (stepId: string): boolean => !!beforeImageUri && esEspacio(stepId);

  /** El trabajo entero es de un espacio: manda el orden de la pantalla. */
  const trabajoDeEspacio = job.plan?.steps.some((s) => s.capability === 'image.space_restyle') === true;

  /*
   * Qué imagen se publicaría: la elegida cuando hay varias propuestas, y la
   * única cuando solo hay una. Nunca la foto que trajo la persona —esa es suya y
   * ni siquiera está aquí— ni una propuesta que no eligió.
   *
   * En modo demo el resultado es un dibujo en línea, no un archivo: no hay nada
   * que publicar y se devuelve vacío en vez de inventar una dirección.
   */
  /*
   * EL VÍDEO TAMBIÉN SE PUBLICA. Este filtro decía `r.kind !== 'video'`, así
   * que un trabajo de Weë Studio cuyo único resultado era un vídeo mandaba al
   * compositor un texto suelto y el vídeo se quedaba atrás — aunque estuviera
   * reproduciéndose en esta misma tarjeta. Ahora viaja con su tipo y, si el
   * servidor ya lo convirtió en material, con su id: el compositor no vuelve a
   * descargarlo ni a subirlo, lo referencia (Fase 11).
   */
  const publicable: PublicableMedia | undefined = (() => {
    const visual = visuals.find((r) => isRealMedia(r.url) || (r.urls || []).some(isRealMedia));
    if (!visual) return undefined;
    const cual = chosen[visual.stepId] ?? 0;
    const varias = !!visual.urls && visual.urls.length > 1;
    const url = varias ? visual.urls![cual] : visual.url;
    if (!isRealMedia(url)) return undefined;
    const assetId = varias ? visual.assetIds?.[cual] : visual.assetIds?.[0];
    return { uri: url as string, type: visual.kind === 'video' ? 'video' : 'image', ...(assetId ? { assetId } : {}) };
  })();
  /*
   * ¿Weë aconsejó en vez de generar? Entonces esto no es un final: es el momento
   * de elegir camino. Se reconoce por el plan —el paso `advice`—, no por la
   * sección, y solo se ofrece si nadie generó ninguna imagen (fase 2E-60).
   */
  const aconsejo = !!onContinue && !visuals.length && job.plan?.steps.some((s) => s.id === 'advice') === true;

  /*
   * DESCARGAR Y «YA ESTÁ GUARDADA» (Fase 11, §23).
   *
   * Lo que Weë genera ya es material de la cuenta desde que existe: el
   * servidor lo guarda una vez, con su ficha y su id, y aparece en «Mis
   * creaciones». Por eso aquí no hay un botón «Guardar» que cree otra copia:
   * hay la constancia de que ya lo está —con el camino a la biblioteca— y
   * la descarga del archivo tal cual. Sin porcentaje: la descarga no lo da.
   */
  const [descargando, setDescargando] = useState(false);
  const descargar = async () => {
    if (!publicable || descargando) return;
    setDescargando(true);
    const resultado = await descargarCreacion(publicable.uri, publicable.type);
    setDescargando(false);
    if (resultado === 'guardado') notify(t('creaciones.downloaded'));
    else if (resultado === 'sin_permiso') notify(t('creaciones.downloadPermission'));
    else if (resultado === 'error') notify(t('creaciones.downloadFailed'));
  };

  const audios = job.results.filter((r) => r.kind === 'audio');
  /*
   * Mirar la foto es un paso, no un entregable (fase 2E-63).
   *
   * `vision.describe` escribe lo que ve para que el paso siguiente sepa sobre qué
   * trabaja. En un espacio, eso es describirle a alguien su propia cocina: dos mil
   * caracteres que no pidió, empujando hacia abajo las decisiones que sí importan.
   * La capacidad no se toca —el plan la sigue ejecutando y el paso siguiente la
   * sigue leyendo—; solo deja de mostrarse como resultado.
   */
  const narracionInterna = (stepId: string): boolean =>
    trabajoDeEspacio && job.plan?.steps.some((s) => s.id === stepId && s.capability === 'vision.describe') === true;

  const texts = job.results.filter((r) => r.content && r.kind !== 'audio' && !narracionInterna(r.stepId));

  /*
   * El orden de la pantalla lo decide de qué es el trabajo (fase 2E-63).
   *
   * En un espacio, la persona llega con una pregunta —"¿cuál me gusta más?"— y
   * antes se encontraba con dos mil caracteres de texto entre las propuestas y
   * los botones. Estos dos bloques son los mismos de siempre; lo único que
   * cambia es DÓNDE se pintan: guardar y la lista de compras bajan detrás de las
   * decisiones. En el resto de experiencias no se mueve nada.
   */
  const bloqueProyecto = onSaveToProject && (
    <TouchableOpacity
      onPress={onSaveToProject}
      disabled={busy}
      activeOpacity={0.8}
      style={[styles.projectRow, { backgroundColor: theme.colors.card, borderColor: projectName ? theme.colors.accent : theme.colors.border }]}
      accessibilityLabel={projectName ? t('weeai.savedIn', { proyecto: projectName }) : t('weeai.saveToProject')}
    >
      <Ionicons name={projectName ? 'folder-open' : 'folder-open-outline'} size={scale(18)} color={theme.colors.accentDark} />
      <Text style={[styles.projectText, { color: theme.colors.text }]}>
        {projectName ? t('weeai.savedIn', { proyecto: projectName }) : t('weeai.saveToProject')}
      </Text>
      <Text style={[styles.projectAction, { color: theme.colors.accentDark }]}>{projectName ? t('weeai.change') : t('weeai.choose')}</Text>
    </TouchableOpacity>
  );

  const bloqueTextos = (
    <>
    {texts
      .filter((r) => !r.url)
      .map((result) => (
        <View key={result.stepId} style={[styles.textCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
            {titulo(result.title)}
            {result.demo && !job.demo ? `  · ${t('weeai.sample')}` : ''}
          </Text>
          <TextoDelResultado texto={result.content || ''} />
          {!!result.sources?.length && (
            <View style={styles.sources}>
              {result.sources.map((source) => (
                <TouchableOpacity key={source.url} onPress={() => Linking.openURL(source.url)} activeOpacity={0.7} style={[styles.source, { borderColor: theme.colors.border }]} accessibilityLabel={source.title || source.url}>
                  <Ionicons name="link-outline" size={scale(12)} color={theme.colors.accentDark} />
                  <Text style={[styles.sourceText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{source.title || source.url}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>✨ {t('common.done')}</Text>
        {job.demo && (
          <View style={[styles.demoTag, { backgroundColor: theme.colors.accent + '33' }]}>
            <Text style={[styles.demoTagText, { color: theme.colors.accentDark }]}>{t('weeai.previewDemo')}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {t('weeai.finishedGoal', { nombre: experienceName, objetivo: textoDeObjetivo(t, job.experienceId, job.goal) })}
        {job.creditsCharged > 0
          ? t('weeai.youSpent', {
              credits: formato.numero(job.creditsCharged),
              nota: job.pricingMode === 'simulated' ? t('weeai.testPriceParenthesis') : '',
            })
          : t('weeai.spentNothing')}
      </Text>
      {!trabajoDeEspacio && bloqueProyecto}

      {visuals.map((result) => (
        <View key={result.stepId} style={[styles.visualCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {result.urls && result.urls.length > 1 ? (
            /*
             * Elegir tiene consecuencia: la elegida se ve en grande y las otras
             * quedan pequeñas debajo. Antes las tres se pintaban iguales y elegir
             * solo cambiaba un borde, así que la elección no significaba nada.
             */
            <View style={styles.variants}>
              {(() => {
                const elegida = chosen[result.stepId] ?? 0;
                const otras = result.urls!.map((uri, index) => ({ uri, index })).filter((x) => x.index !== elegida);
                const transforma = transformaTuFoto(result.stepId);
                // El marco lo decide el CONTENIDO, no si hay foto original: una imagen
                // de un espacio es apaisada aunque no haya con qué compararla.
                const espacio = esEspacio(result.stepId);
                return (
                  <>
                    <View style={[styles.chosenFrame, { borderColor: theme.colors.accent }, espacio && styles.chosenFrameWide]}>
                      <Image
                        source={{ uri: result.urls![elegida] }}
                        style={[styles.chosenImage, espacio && styles.chosenImageWide]}
                        contentFit={espacio ? 'contain' : 'cover'}
                        transition={200}
                      />
                      <View style={[styles.variantTag, { backgroundColor: theme.colors.accent }]}>
                        <Text style={[styles.variantTagText, { color: '#1F2937' }]}>{t('weeai.chosenProposal', { numero: elegida + 1 })}</Text>
                      </View>
                    </View>
                    <View style={styles.otherRow}>
                      {otras.map(({ uri, index }) => (
                        <TouchableOpacity
                          key={uri.slice(0, 40) + index}
                          onPress={() => setChosen((prev) => ({ ...prev, [result.stepId]: index }))}
                          activeOpacity={0.85}
                          style={[styles.variant, styles.otherVariant, espacio && styles.otherVariantSpace, { borderColor: theme.colors.border }]}
                          accessibilityLabel={t('weeai.chooseProposal', { numero: index + 1 })}
                        >
                          <Image source={{ uri }} style={[styles.variantImage, espacio && styles.variantImageWide]} contentFit={espacio ? 'contain' : 'cover'} transition={200} />
                          <View style={[styles.variantTag, { backgroundColor: theme.colors.card }]}>
                            <Text style={[styles.variantTagText, { color: '#1F2937' }]}>{t('weeai.proposalNumber', { numero: index + 1 })}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/*
                      Antes y después, con las dos propuestas puestas (fase 2E-59).
                      Cuando lo que se ve es una transformación de la foto de la
                      persona, comparar es el resultado: sin el "antes" al lado, dos
                      propuestas son dos habitaciones bonitas que podrían ser de
                      cualquiera. Cambia con la propuesta elegida.
                    */}
                    {!!(transforma && beforeImageUri) && (
                      <View style={[styles.pair, apilar && styles.pairStacked]}>
                        <View style={styles.pairItem}>
                          <Image source={{ uri: beforeImageUri }} style={[styles.pairImage, styles.pairImageWide]} contentFit="contain" />
                          <View style={[styles.pairTag, { backgroundColor: 'rgba(31,41,55,0.65)' }]}>
                            <Text style={styles.pairTagText}>{t('weeai.before')}</Text>
                          </View>
                        </View>
                        <View style={styles.pairItem}>
                          <Image source={{ uri: result.urls![elegida] }} style={[styles.pairImage, styles.pairImageWide]} contentFit="contain" transition={200} />
                          <View style={[styles.pairTag, { backgroundColor: theme.colors.accent }]}>
                            <Text style={[styles.pairTagText, { color: '#1F2937' }]}>{t('weeai.after')}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          ) : beforeImageUri ? (
            <View style={styles.pair}>
              <View style={styles.pairItem}>
                <Image source={{ uri: beforeImageUri }} style={styles.pairImage} contentFit="cover" />
                <View style={[styles.pairTag, { backgroundColor: 'rgba(31,41,55,0.65)' }]}>
                  <Text style={styles.pairTagText}>{t('weeai.before')}</Text>
                </View>
              </View>
              <View style={styles.pairItem}>
                <Image source={{ uri: result.url }} style={styles.pairImage} contentFit="cover" transition={200} />
                <View style={[styles.pairTag, { backgroundColor: theme.colors.accent }]}>
                  <Text style={[styles.pairTagText, { color: '#1F2937' }]}>{t('weeai.after')}</Text>
                </View>
              </View>
            </View>
          ) : result.kind === 'video' && isRealMedia(result.url) ? (
            <View>
              <Video source={{ uri: result.url as string }} style={styles.visual} resizeMode={ResizeMode.CONTAIN} useNativeControls accessibilityLabel={t('weeai.generatedVideo')} />
              {!!result.durationSec && (
                <View style={styles.durationTag}>
                  <Text style={styles.durationText}>{formatDuration(result.durationSec)}</Text>
                </View>
              )}
            </View>
          ) : result.kind === 'video' ? (
            <TouchableOpacity onPress={() => setPlayingId(playingId === result.stepId ? null : result.stepId)} activeOpacity={0.9} accessibilityLabel={t('weeai.playVideo')}>
              <Image source={{ uri: result.url }} style={styles.visual} contentFit="cover" transition={200} />
              <View style={styles.playOverlay}>
                <Ionicons name={playingId === result.stepId ? 'pause' : 'play'} size={scale(24)} color="#1F2937" style={playingId === result.stepId ? undefined : { marginLeft: 3 }} />
              </View>
              <View style={styles.durationTag}>
                <Text style={styles.durationText}>{playingId === result.stepId ? t('weeai.previewDemo') : '0:15'}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Image source={{ uri: result.url }} style={styles.visual} contentFit="cover" transition={200} />
          )}
          <View style={styles.visualCaption}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
              {titulo(result.title)}
              {result.demo && !job.demo ? `  · ${t('weeai.sample')}` : ''}
            </Text>
            {!!result.content && <Text style={[styles.resultNote, { color: theme.colors.textSecondary }]}>{result.content}</Text>}
          </View>
        </View>
      ))}

      {tresD.map((result) => (
        <TarjetaTresD
          key={result.stepId}
          tipo={result.kind === 'model3d' ? 'model3d' : 'world'}
          nombre={titulo(result.title)}
          url={isRealMedia(result.url) ? result.url : null}
        />
      ))}

      {audios.map((result) => {
        const playing = playingId === result.stepId;
        return (
          <View key={result.stepId} style={[styles.audioCard, { backgroundColor: theme.colors.text }]}>
            <TouchableOpacity
              onPress={() => toggleAudio(result.stepId, result.url)}
              style={[styles.playButton, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityLabel={playing ? t('weeai.pause') : t('weeai.play')}
            >
              <Ionicons name={playing ? 'pause' : 'play'} size={scale(20)} color="#1F2937" style={playing ? undefined : { marginLeft: 2 }} />
            </TouchableOpacity>
            <View style={styles.audioBody}>
              <Text style={styles.audioTitle} numberOfLines={1}>{titulo(result.title)}</Text>
              <View style={styles.waveform}>
                {WAVE.map((height, index) => (
                  <View
                    key={index}
                    style={[styles.waveBar, { height, backgroundColor: playing && index < 9 ? theme.colors.accent : 'rgba(255,255,255,0.45)' }]}
                  />
                ))}
              </View>
              <Text style={styles.audioMeta}>
                {isRealMedia(result.url)
                  ? playing ? t('weeai.playing') : result.durationSec ? t('weeai.weeVoiceDuration', { duracion: formatDuration(result.durationSec) }) : t('weeai.weeVoice')
                  : playing ? t('weeai.playingPreview') : t('weeai.previewWithDuration', { duracion: '0:32' })}
                {result.demo ? ` (${t('weeai.demo')})` : ''}
              </Text>
            </View>
          </View>
        );
      })}

      {!trabajoDeEspacio && bloqueTextos}

      {visuals.length > 0 && !!precio && (
        <Text style={[styles.regenerateHint, { color: theme.colors.textSecondary }]}>
          {t('weeai.eachChangeRecreates', { precio })}
        </Text>
      )}

      {/*
        Weë miró el espacio y propuso caminos: elegir uno sigue desde aquí, con
        la misma foto y las mismas respuestas. No es "empezar otra vez".
      */}
      {aconsejo && (
        <View style={styles.quickEdits}>
          {CAMINOS_HOGAR.map((camino) => (
            <TouchableOpacity
              key={camino.optionId}
              onPress={() => onContinue!(camino.optionId)}
              disabled={busy}
              activeOpacity={0.8}
              style={[styles.quickEdit, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}
              accessibilityLabel={t('weeai.continueVia', { camino: t(camino.clave) })}
            >
              <Text style={[styles.quickEditText, { color: theme.colors.text }]}>{t(camino.clave)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {visuals.length > 0 && (
        <View style={styles.quickEdits}>
          {quickEdits.map((phrase) => (
            <TouchableOpacity
              key={phrase}
              onPress={() => onEdit(phrase)}
              disabled={busy}
              activeOpacity={0.8}
              style={[styles.quickEdit, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.quickEditText, { color: theme.colors.text }]}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/*
        Aquí vivía "¿Qué cambiamos?", una caja para escribir el cambio a mano.
        Se retiró (decisión del usuario, 2026-09-15): los cambios se piden con
        las frases de arriba —"hazlo más realista", "cambia el color"— y quien
        quiera otra cosa vuelve a crear con su idea. Una pantalla de resultado
        es para mirar y decidir, no para volver a redactar.
      */}
      <View style={styles.actions}>
          {onOpenInEditor && (
            <TouchableOpacity
              onPress={onOpenInEditor}
              disabled={busy}
              style={[styles.actionButton, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={scale(18)} color="#1F2937" />
              <Text style={[styles.actionText, { color: '#1F2937' }]}>{t('wall.useInEditor')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onAnotherVersion}
            disabled={busy}
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={scale(18)} color={theme.colors.text} />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>{t('weeai.anotherVersion', { precio })}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onPublish(publicable)}
            disabled={busy}
            style={[styles.actionButton, styles.publishButton, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane" size={scale(18)} color="#1F2937" />
            <Text style={[styles.actionText, { color: '#1F2937' }]}>{t('wall.publishToCommunity')}</Text>
          </TouchableOpacity>
      </View>

      {publicable && (
        <View style={styles.creacionRow}>
          <TouchableOpacity
            onPress={descargar}
            disabled={busy || descargando}
            style={[styles.creacionBoton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('creaciones.download')}
          >
            <Ionicons name="download-outline" size={scale(16)} color={theme.colors.text} />
            <Text style={[styles.creacionTexto, { color: theme.colors.text }]}>{t('creaciones.download')}</Text>
          </TouchableOpacity>
          {!!(publicable.assetId && onOpenCreations) && (
            <TouchableOpacity
              onPress={onOpenCreations}
              disabled={busy}
              style={[styles.creacionBoton, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('creaciones.savedInCreations')}
            >
              <Ionicons name="checkmark-circle" size={scale(16)} color={theme.colors.accentDark} />
              <Text style={[styles.creacionTexto, { color: theme.colors.text }]}>{t('creaciones.savedInCreations')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/*
        Información secundaria: después de decidir, y plegada. La lista de
        cambios y compras sigue entera —no se pierde ninguna capacidad—, pero
        deja de competir con las propuestas por la atención (fase 2E-63).
      */}
      {trabajoDeEspacio && (
        <>
          {bloqueProyecto}
          {texts.filter((r) => !r.url).length > 0 && (
            <TouchableOpacity
              onPress={() => setVerDetalle((v) => !v)}
              activeOpacity={0.8}
              style={[styles.projectRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              accessibilityLabel={verDetalle ? t('weeai.hideChanges') : t('weeai.showChanges')}
            >
              <Ionicons name="list-outline" size={scale(18)} color={theme.colors.accentDark} />
              <Text style={[styles.projectText, { color: theme.colors.text }]}>{t('wall.changesAndPurchases')}</Text>
              <Ionicons name={verDetalle ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          {verDetalle && bloqueTextos}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: scale(24),
    fontWeight: FONT_WEIGHT.bold,
  },
  demoTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  demoTagText: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    marginTop: -SPACING.xs,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(44),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  projectText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  projectAction: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  visualCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  visual: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  visualCaption: {
    padding: SPACING.md,
    gap: scale(2),
  },
  variants: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  pair: {
    /*
     * A lo ancho de su fila (fase 2E-61.2).
     *
     * Desde 2E-59 el antes/después vive dentro de `variants`, que es una fila con
     * `flexWrap`. Sin anchura propia, ahí dentro se encogía a su contenido —22 px
     * medidos en pantalla— y sus dos mitades, que son `flex: 1`, salían a 0×0: el
     * bloque existía en el árbol y no se veía. Es la misma línea que `otherRow`
     * ya tenía y que hacía que las alternativas sí se pintaran.
     */
    width: '100%',
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  pairItem: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  pairImage: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  pairTag: {
    position: 'absolute',
    left: SPACING.sm,
    top: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  pairTagText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  variant: {
    minWidth: scale(96),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  chosenFrame: {
    width: '100%',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 3,
    overflow: 'hidden',
  },
  chosenImage: {
    width: '100%',
    aspectRatio: 1,
  },
  /*
   * Marco apaisado para lo que transforma una foto: una sala se fotografía a lo
   * ancho, y el cuadrado de siempre le cortaba media pared. Con `contain` no se
   * recorta nada sea cual sea la proporción real; el 4:3 solo elige el marco que
   * deja menos aire alrededor en el caso normal (fase 2E-59).
   */
  chosenFrameWide: {
    backgroundColor: '#0F172A',
  },
  /** Apilado: una debajo de otra, cada una a ancho completo. */
  pairStacked: {
    flexDirection: 'column',
  },
  /** Apaisado, como se fotografía un espacio. */
  pairImageWide: {
    aspectRatio: 4 / 3,
  },
  /*
   * La alternativa: MISMA proporción que la elegida, la mitad de tamaño.
   *
   * Con el marco vertical de siempre (4:5) una imagen apaisada quedaba
   * letterboxed y la tarjeta "pequeña" acababa siendo un 68 % MÁS ALTA que la
   * elegida: la jerarquía se invertía. Ahora las dos son 4:3, y la diferencia la
   * marca el ancho, que es lo que debía marcarla desde el principio (2E-63).
   */
  otherVariantSpace: {
    maxWidth: '50%',
  },
  variantImageWide: {
    aspectRatio: 4 / 3,
  },
  chosenImageWide: {
    aspectRatio: 4 / 3,
  },
  otherRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  otherVariant: {
    flex: 1,
    borderWidth: 1,
  },
  regenerateHint: {
    fontSize: FONT_SIZE.xs,
  },
  playOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -scale(26),
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationTag: {
    position: 'absolute',
    right: SPACING.sm,
    bottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(31,41,55,0.7)',
  },
  durationText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  variantImage: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  variantTag: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  variantTagText: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  quickEdits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickEdit: {
    minHeight: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  quickEditText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  textCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  playButton: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBody: {
    flex: 1,
    gap: scale(4),
  },
  audioTitle: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: scale(28),
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  audioMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZE.xs,
  },
  resultTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  resultNote: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(17),
  },
  resultText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(21),
  },
  dias: {
    gap: SPACING.sm,
  },
  cabeceraViaje: {
    borderLeftWidth: scale(3),
    paddingLeft: SPACING.md,
    paddingVertical: scale(2),
    gap: scale(2),
  },
  destino: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  fechasViaje: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  duracionViaje: {
    fontSize: FONT_SIZE.xs,
  },
  dia: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  diaHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  diaTitulo: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    maxWidth: '100%',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  sourceText: {
    fontSize: scale(11),
    maxWidth: scale(220),
  },
  actions: {
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: scale(48),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  publishButton: {},
  creacionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  creacionBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(40),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  creacionTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default ResultCard;
