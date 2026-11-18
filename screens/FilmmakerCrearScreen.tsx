import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT, useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
import { useWallet } from '../hooks/useWallet';
import CreatorShell from '../components/creator/CreatorShell';
import CajaDePrompt, { AccionDeLaCaja } from '../components/creator/CajaDePrompt';
import { CajaAnclada } from '../components/creator/CajaQueCrece';
import CreditsPill from '../components/CreditsPill';
import IconoDireccional from '../components/IconoDireccional';
import { IconoWee } from '../components/icons/IconoWee';
import { IsotipoWee } from '../components/weeai/CabeceraDePortada';
import { TarjetaDeTipo } from '../components/filmmaker/TarjetaDeTipo';
import { HeroDePortada } from '../components/weeai/HeroDePortada';
import { HojaDeTrabajo } from '../components/filmmaker/HojaDeTrabajo';
import { HojaDeAdjuntos } from '../components/filmmaker/HojaDeAdjuntos';
import { TallerDeIdea, ModoDelTaller, MensajeDelTaller } from '../components/filmmaker/TallerDeIdea';
import { crearProduccion, nuevoIdDeProduccion, useProducciones } from '../hooks/useProducciones';
import { tituloDesdeLaIdea } from '../utils/presentacionDeProduccion';
import { IdeaDelTaller, etiquetaAccesible, cambiarDeTipo, contestarPaso, esTipoConTaller, estaLista, ideaVacia, pasoActual, poner, sumarALaFrase, tituloDeLaIdea } from '../utils/ideaDeFilmmaker';
import { LIMITES } from '../services/filmmaker/dominio';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../constants/estiloWeeAi';
import { CHIP_DE_MARCA_EN_COMPOSER, PILDORA_DE_FORMATO_VISIBLE, FORMATO_POR_DEFECTO, TIPOS_DE_PROYECTO, TipoDeProyecto } from '../constants/filmmakerCrear';
import { EmpezarCon, TIPO_POR_DEFECTO_AL_ENVIAR, TipoDeTaller } from '../constants/filmmakerIdea';
import { scale } from '../utils/scale';

const ALTO_DE_CABECERA = 56;
const HOLGURA = 16;
/** Lo mínimo de mundo (tarjetas o hilo) que se deja ver encima de la caja cuando esta crece: el resto del alto es de la caja. */
const MUNDO_MINIMO = 220;
/** A partir de este ancho el taller se parte en dos zonas (hilo | tarjeta): tableta y escritorio. */
const ANCHO_DE_DOS_ZONAS = 840;

/**
 * FILMMAKER — LA PRIMERA CAPA Y EL TALLER DE IDEA (2026-11-17). Una sola pantalla con DOS capas y UNA caja:
 *   · ENTRADA: arco + «Crea tu producción» y las cinco tarjetas de tipo (rejilla 2+2+1). Tocar una tarjeta abre el taller; escribir y enviar también
 *     (sin tipo elegido empieza como Cortometraje y lo dice).
 *   · TALLER DE IDEA (etapa 1): las tarjetas se recogen en una etiqueta sobre la caja y arriba aparece el hilo (`TallerDeIdea`).
 * La caja común (`CajaDePrompt` portada) es el ANCLA: vive abajo, sobre la barra de Weë, crece hacia arriba y no cambia de sitio entre capas; lo que
 * cambia es el mundo de encima. Su «+» abre la hoja de adjuntos (Pegar texto abierto; Documento, Imagen y Audio cerrados con su motivo).
 * Todo lo que el contrato no admite hoy va CERRADO con su motivo. Crear = la operación de siempre (`createProduction`, id idempotente) y se abre
 * `Production`; no cobra nada en el cliente. El tipo de proyecto NO viaja al servidor (el contrato de `create` no tiene ese campo): solo `ad`
 * aporta el preset `ads`. El taller no llama a ninguna IA: el copiloto está cerrado hasta D5 (`COPILOTO_DEL_TALLER_ABIERTO`).
 */
const FilmmakerCrearScreen: React.FC = () => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { balance } = useWallet();
  const { width: anchoDePantalla } = useWindowDimensions();
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  const [altoMundo, setAltoMundo] = useState(0);
  const [hoja, setHoja] = useState(false);
  const [adjuntos, setAdjuntos] = useState(false);
  const [texto, setTexto] = useState('');
  const [capa, setCapa] = useState<'entrada' | 'taller'>('entrada');
  const [tipoId, setTipoId] = useState<TipoDeTaller | null>(null);
  const [idea, setIdea] = useState<IdeaDelTaller>(() => ideaVacia('short'));
  const [modo, setModo] = useState<ModoDelTaller>('guiado');
  const [empezarCon, setEmpezarCon] = useState<EmpezarCon>('idea');
  const [mensajes, setMensajes] = useState<MensajeDelTaller[]>([]);
  const [creando, setCreando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const siguienteMensaje = useRef(1);
  /* Un solo id por intento: repetir con el mismo no crea dos producciones. */
  const idDeProduccion = useRef(nuevoIdDeProduccion());

  /* Solo si ya hay producciones activas: «Continuar tu producción» con la más reciente. Sin datos (o con error) no se muestra nada. */
  const { carga, producciones } = useProducciones('active', !!user);
  const reciente = carga === 'lista' ? producciones[0] ?? null : null;
  const etiquetaContinuar = reciente ? `${t('filmmaker.hubContinue')}. ${reciente.title}` : '';
  const etiquetaCarpeta = `${t('filmmaker.myProductions')} · ${t('weeai.myCreations')}`;
  const ancho = medida.ancho || 390;
  const alto = medida.alto || 700;
  const tipo = TIPOS_DE_PROYECTO.find((x) => x.id === tipoId) ?? null;
  const pildora = tipo ? { formato: tipo.formato, segundos: tipo.segundos } : FORMATO_POR_DEFECTO;
  /* Por debajo de 760 dp útiles todo se compacta. */
  const compacto = alto < 760;
  const enTaller = capa === 'taller';
  const dosZonas = enTaller && anchoDePantalla >= ANCHO_DE_DOS_ZONAS;
  const pasoDeTexto = enTaller && modo === 'guiado' ? pasoActual(idea) : null;

  const volverALasTarjetas = () => { setCapa('entrada'); setAviso(null); };
  const atras = () => {
    if (enTaller) { volverALasTarjetas(); return; }
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main');
  };
  const cerrado = (clave: string) => () => setAviso(t(clave));
  const mensaje = (m: Omit<MensajeDelTaller, 'id'>) => ({ ...m, id: siguienteMensaje.current++ });

  /** Entra al taller con un tipo: conserva lo ya escrito y, si no hay idea, arranca el modo Guiado por la sensación. */
  const entrarAlTaller = (id: TipoDeProyecto['id'], base: IdeaDelTaller = idea) => {
    if (!esTipoConTaller(id)) return;
    setTipoId(id);
    setIdea(cambiarDeTipo(base, id));
    setCapa('taller');
    setAviso(null);
  };

  /** Lo que se escribe en la caja: en la entrada abre el taller con esa frase; dentro, contesta la pregunta de texto o suma a la frase. */
  const enviar = () => {
    const dicho = texto.trim();
    if (!dicho) return;
    if (!enTaller) {
      const id = tipoId ?? TIPO_POR_DEFECTO_AL_ENVIAR;
      const deducido = !tipoId;
      setModo('directo');
      setMensajes([
        mensaje({ rol: 'tu', texto: dicho }),
        mensaje({ rol: 'wee', clave: 'filmmaker.ideaNoted' }),
        ...(deducido ? [mensaje({ rol: 'wee', clave: 'filmmaker.ideaTypeDeduced' })] : []),
      ]);
      entrarAlTaller(id, sumarALaFrase(cambiarDeTipo(idea, id), dicho));
    } else {
      const primera = !idea.valores.idea && !idea.valores.script;
      setMensajes((m) => [...m, mensaje({ rol: 'tu', texto: dicho }), ...(primera && !pasoDeTexto ? [mensaje({ rol: 'wee', clave: 'filmmaker.ideaNoted' })] : [])]);
      setIdea(pasoDeTexto?.clase === 'text' ? contestarPaso(idea, { valor: dicho }) : sumarALaFrase(idea, dicho));
    }
    setTexto('');
  };

  /** «Pegar texto»: el guion pegado se guarda en su campo (hasta 12 000 caracteres) y el taller se abre con «Guion» marcado. */
  const usarTextoPegado = (pegado: string) => {
    const id = tipoId ?? TIPO_POR_DEFECTO_AL_ENVIAR;
    const base = poner(cambiarDeTipo(idea, id), 'script', pegado);
    setEmpezarCon('script');
    setMensajes((m) => [...m, mensaje({ rol: 'wee', clave: 'filmmaker.ideaScriptLoaded' }), ...(tipoId ? [] : [mensaje({ rol: 'wee', clave: 'filmmaker.ideaTypeDeduced' })])]);
    if (!enTaller) setModo('directo');
    setIdea(base);
    if (!enTaller) entrarAlTaller(id, base);
  };

  const continuar = async () => {
    if (!estaLista(idea) || creando) return;
    if (!user) { navigation.navigate('Login'); return; }
    setCreando(true); setFallo(false); setAviso(null);
    const r = await crearProduccion({ productionId: idDeProduccion.current, title: tituloDeLaIdea(idea, (f, max) => tituloDesdeLaIdea(f, Math.min(max, LIMITES.nombre))), ...(idea.tipo === 'ad' ? { preset: 'ads' as const } : {}) });
    setCreando(false);
    if (!r.ok) { setFallo(true); return; }
    idDeProduccion.current = nuevoIdDeProduccion();
    navigation.navigate('Production', { productionId: r.valor.produccion.productionId });
  };

  /* El «+» abre la hoja de adjuntos; el resto de lo que antes eran iconos cerrados vive ahora dentro de ella, con su motivo. */
  const acciones: AccionDeLaCaja[] = [{ icono: 'add', iconoWee: 'mas', etiqueta: t('filmmaker.attachTitle'), alPulsar: () => setAdjuntos(true) }];

  /*
   * EL REPARTO DE LA ALTURA EN LA ENTRADA. La sección de tipos es SIEMPRE la rejilla 2+2+1 de la referencia (nunca un carrusel). Del alto del
   * mundo (lo de encima de la caja) se resta lo fijo —título de la sección, huecos— y el resto son las tres filas: apaisadas 2:1 (la ancha, 4:1)
   * y, si no cabe, más bajas hasta 64 dp. Si ni con 64 dp caben, el mundo se desplaza en vertical: es el ÚLTIMO recurso. Con altura de sobra, el
   * hero (el arco y «Crea tu producción») ocupa lo que queda.
   */
  const anchoDeFila = Math.min(ancho, 760) - SPACING.md * 2;
  const anchoMedia = Math.floor((anchoDeFila - 10) / 2);
  const tituloDeSeccion = compacto ? 44 : 62;
  const heroMinimo = 150;
  const cabeHero = altoMundo - (tituloDeSeccion + 3 * 76 + 20 + HOLGURA) >= heroMinimo;
  const conScroll = altoMundo > 0 && altoMundo < tituloDeSeccion + 3 * 64 + 20 + HOLGURA;
  const presupuesto = altoMundo - tituloDeSeccion - 20 - HOLGURA - (cabeHero ? heroMinimo : 0);
  const altoDeFila = conScroll ? 76 : Math.max(64, Math.min(Math.floor(anchoMedia / 1.5), Math.floor(presupuesto / 3)));
  const topeDeLaCaja = Math.max(120, alto - ALTO_DE_CABECERA - MUNDO_MINIMO);
  const verHero = cabeHero && !conScroll;
  const TARJETAS = TIPOS_DE_PROYECTO.map((x) => {
    const elegido = tipoId === x.id;
    const abierta = x.estado !== 'cerrada';
    return { x, elegido, onPress: abierta ? () => entrarAlTaller(x.id) : cerrado(x.claveMotivo as string) };
  });

  const verContinuar = !!reciente && altoMundo >= 520;
  const entrada = (
    <View style={[styles.entrada, conScroll && { flex: undefined, flexGrow: 1 }]}>
      {verHero ? <HeroDePortada ancho={ancho} etiqueta={t('weeai.portadaEtiqueta')} titulo={t('filmmaker.hubTitle')} sub={altoMundo >= 560 ? t('filmmaker.hubSub') : ' '} /> : <View style={styles.separador} />}
      {verContinuar && reciente ? (
        <View style={styles.bloque}>
          <TouchableOpacity onPress={() => navigation.navigate('Production', { productionId: reciente.productionId })} accessibilityRole="button" accessibilityLabel={etiquetaContinuar} style={[styles.continuar, dir.contenedor]} activeOpacity={0.8}>
            <IconoWee name="claqueta" size={16} color={P.tintaSecundaria} />
            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{t('filmmaker.hubContinue')}</Text>
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]} numberOfLines={1}>· {reciente.title}</Text>
            <IconoDireccional name="chevron-forward" size={14} color={P.tintaSecundaria} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={[styles.bloque, { marginTop: compacto ? 4 : 10, paddingBottom: HOLGURA }]}>
        <Text style={[textoPortada(compacto ? 17 : 21, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header" numberOfLines={1}>{t('filmmaker.hubTypeSection')}</Text>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, marginTop: 2, marginBottom: 10 }]} numberOfLines={1}>{t('filmmaker.hubTypeSectionHint')}</Text>
        <View style={styles.rejilla}>
          {TARJETAS.map(({ x, elegido, onPress }, i) => <TarjetaDeTipo key={x.id} tipo={x} ancho={i === 4 ? anchoDeFila : anchoMedia} alto={altoDeFila} elegido={elegido} onPress={onPress} orden={i} />)}
        </View>
      </View>
    </View>
  );

  const etiquetaDelTipo = tipo ? t(tipo.clave) : '';
  const placeholder = pasoDeTexto?.clase === 'text' ? t(pasoDeTexto.clavePlaceholder) : enTaller ? t('filmmaker.ideaPlaceholder') : t('filmmaker.hubPlaceholder');
  const sinSaldo = !!user && balance === 0;

  return (
    <CreatorShell activeId="creator" title={t('weeai.portadaFilmmaker')} breadcrumb={t('nav.weeAi')} fondo={P.fondo} sinFranjaSuperior fija contentStyle={styles.contenido}>
      <View style={[styles.raiz, dosZonas && { maxWidth: 1040 }]} onLayout={(e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setMedida((a) => (Math.abs(a.ancho - width) > 1 || Math.abs(a.alto - height) > 1 ? { ancho: Math.round(width), alto: Math.round(height) } : a)); }}>
        <View style={[styles.cabecera, dir.contenedor]}>
          <TouchableOpacity onPress={atras} style={styles.boton} accessibilityRole="button" accessibilityLabel={enTaller ? t('filmmaker.ideaBackToTypes') : t('common.back')}>
            <IconoDireccional name="arrow-back" size={scale(24)} color={P.tinta} />
          </TouchableOpacity>
          <View style={[styles.marcaDeCabecera, dir.contenedor]}>
            <IsotipoWee alto={28} />
            <Text style={[textoPortada(scale(22), '600'), { color: P.tinta }]} numberOfLines={1} accessibilityRole="header">{t('weeai.portadaFilmmaker')}</Text>
          </View>
          <TouchableOpacity onPress={() => setHoja(true)} style={styles.boton} accessibilityRole="button" accessibilityLabel={etiquetaCarpeta}>
            <IconoWee name="carpeta" size={scale(22)} color={P.tinta} />
          </TouchableOpacity>
          <CreditsPill compact sobria />
        </View>

        {/* EL MUNDO de encima de la caja: las tarjetas de tipo, o el hilo del taller de Idea. */}
        <View style={styles.mundo} onLayout={(e: LayoutChangeEvent) => { const h = Math.round(e.nativeEvent.layout.height); setAltoMundo((a) => (Math.abs(a - h) > 1 ? h : a)); }}>
          {enTaller ? (
            <TallerDeIdea
              idea={idea} onIdea={setIdea} modo={modo} onModo={setModo} empezarCon={empezarCon} onEmpezarCon={setEmpezarCon}
              mensajes={mensajes} dosZonas={dosZonas} compacto={compacto} onAviso={(clave) => setAviso(t(clave))}
              creando={creando} fallo={fallo} sinSaldo={sinSaldo} onContinuar={continuar}
            />
          ) : conScroll ? <ScrollView style={styles.lista} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{entrada}</ScrollView> : entrada}
        </View>

        {/* LA CAJA, ANCLADA ABAJO: no cambia de sitio entre capas. Encima, una línea de estado y la etiqueta del tipo. */}
        <View style={[styles.abajo, { maxWidth: 760 }]}>
          <View style={[styles.estado, compacto && { minHeight: 0, paddingTop: 2 }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {aviso ? (
              <Text style={[textoPortada(12), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={3}>{aviso}</Text>
            ) : !user && !enTaller ? (
              <Text style={[textoPortada(12), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{t('filmmaker.hubNeedSession')}</Text>
            ) : null}
          </View>
          {/* La píldora de formato · duración · modelo (informativa; apagada por `PILDORA_DE_FORMATO_VISIBLE`) y, solo en la variante A, el chip de marca. */}
          {PILDORA_DE_FORMATO_VISIBLE && alto >= 700 ? <View style={[styles.fila, dir.contenedor, { marginBottom: 10 }]}>
            <View style={[styles.pildora, dir.contenedor]} accessible accessibilityLabel={t('filmmaker.hubFormatLabel')}>
              <Text style={[textoPortada(12, '500'), { color: P.tinta }]}>{'⁦'}{pildora.formato}{'⁩'} · {t('filmmaker.hubSeconds', { n: formato.numero(pildora.segundos) })} · {t('filmmaker.hubAuto')}</Text>
            </View>
            {CHIP_DE_MARCA_EN_COMPOSER ? <View style={styles.pildora}><Text style={[textoPortada(12, '500'), { color: P.tintaSecundaria }]}>{t('filmmaker.hubBrain')}</Text></View> : null}
          </View> : null}
          {enTaller && tipo ? (
            <TouchableOpacity onPress={volverALasTarjetas} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(etiquetaDelTipo, t('filmmaker.ideaChangeType'))} hitSlop={{ top: 4, bottom: 4 }} style={[styles.etiqueta, compacto && { minHeight: 36 }, dir.contenedor]}>
              <IconoWee name="claqueta" size={14} color={P.tinta} />
              <Text style={[textoPortada(13, '600'), { color: P.tinta }]} numberOfLines={1}>{etiquetaDelTipo}</Text>
              <IconoWee name="cerrar" size={12} color={P.tintaSecundaria} />
            </TouchableOpacity>
          ) : null}
          <CajaAnclada alto={topeDeLaCaja}>
            <CajaDePrompt portada enviarDiscreto={enTaller} valor={texto} onCambiar={setTexto} onEnviar={enviar} etiquetaEnviar={t('studio.sendLabel')} placeholder={placeholder} acciones={acciones} />
          </CajaAnclada>
        </View>

        <HojaDeTrabajo visible={hoja} onClose={() => setHoja(false)} onAbrirProduccion={(id) => navigation.navigate('Production', { productionId: id })} onAbrirCreaciones={() => navigation.navigate('MisCreaciones')} />
        <HojaDeAdjuntos visible={adjuntos} onClose={() => setAdjuntos(false)} onUsarTexto={usarTextoPegado} />
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  contenido: { padding: 0, gap: 0, paddingBottom: 0 },
  raiz: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: ALTO_DE_CABECERA, paddingHorizontal: SPACING.sm },
  boton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  marcaDeCabecera: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  continuar: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, marginBottom: 4 },
  mundo: { flex: 1, minHeight: 0 },
  entrada: { flex: 1 },
  lista: { flex: 1 },
  separador: { flex: 1, minHeight: 4 },
  bloque: { paddingHorizontal: SPACING.md },
  abajo: { width: '100%', alignSelf: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  etiqueta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie, marginBottom: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pildora: { minHeight: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: P.superficie, borderColor: P.bordeCapsula, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  estado: { minHeight: 10, justifyContent: 'center', paddingTop: 4, paddingBottom: 4 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});

/* Filmmaker vive en el marco oscuro de WeëAI, con las dos caras. */
export default enTemaOscuro(FilmmakerCrearScreen);
