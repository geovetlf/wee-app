import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT, useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
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
import { crearProduccion, nuevoIdDeProduccion, useProducciones } from '../hooks/useProducciones';
import { tituloDesdeLaIdea } from '../utils/presentacionDeProduccion';
import { LIMITES } from '../services/filmmaker/dominio';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../constants/estiloWeeAi';
import { ALTURAS, CHIP_DE_MARCA_EN_COMPOSER, PILDORA_DE_FORMATO_VISIBLE, FORMATO_POR_DEFECTO, TIPOS_DE_PROYECTO, TipoDeProyecto } from '../constants/filmmakerCrear';
import { scale } from '../utils/scale';

const ALTO_DE_CABECERA = 56;
const HOLGURA = 16;

/**
 * FILMMAKER — «CREAR» (la primera capa, 2026-11-17): lo que se abre al pulsar «Filmmaker» en la portada de WeëAI. Pantalla FIJA: cabecera, pestañas,
 * hero (si hay altura), la caja común, el tipo de proyecto, «Empezar con», Directo/Guiado y Continuar. Todo lo que el contrato no admite hoy
 * (referencias, imagen, vídeo, audio, adjuntar) va CERRADO con su motivo; lo que sí admite (la idea, formato, duración, el preset `ads`) funciona.
 * Crear = la operación de siempre (`createProduction`, id idempotente) y se abre `Production`; no cobra nada en el cliente.
 * El tipo de proyecto NO viaja al servidor (el contrato de `create` no tiene ese campo): es una preselección de interfaz que fija formato y
 * duración sugeridos, y solo `ad` aporta el preset `ads`.
 */
const FilmmakerCrearScreen: React.FC = () => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  const [hoja, setHoja] = useState(false);
  const [texto, setTexto] = useState('');
  const [tipoId, setTipoId] = useState<TipoDeProyecto['id'] | null>(null);
  const [creando, setCreando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
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
  const verHero = alto >= ALTURAS.hero;
  /* Por debajo de 760 dp útiles todo se compacta (aviso, títulos, Directo/Guiado, Continuar). */
  const compacto = alto < 760;

  const atras = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'));
  const cerrado = (clave: string) => () => setAviso(t(clave));

  const crear = async () => {
    const idea = texto.trim();
    if (!idea || creando) return;
    if (!user) { navigation.navigate('Login'); return; }
    setCreando(true); setFallo(false); setAviso(null);
    const r = await crearProduccion({ productionId: idDeProduccion.current, title: tituloDesdeLaIdea(idea, LIMITES.nombre), ...(tipo?.preset ? { preset: tipo.preset } : {}) });
    setCreando(false);
    if (!r.ok) { setFallo(true); return; }
    idDeProduccion.current = nuevoIdDeProduccion();
    setTexto('');
    navigation.navigate('Production', { productionId: r.valor.produccion.productionId });
  };

  const acciones: AccionDeLaCaja[] = [{ icono: 'add', iconoWee: 'mas', etiqueta: `${t('studio.addLabel')}. ${t('filmmaker.hubRefsClosed')}`, alPulsar: () => {}, deshabilitada: true }];
  const accionesDerecha: AccionDeLaCaja[] = [
    { icono: 'image-outline', iconoWee: 'galeria', etiqueta: `${t('composer.kindImage')}. ${t('filmmaker.hubClosedContract')}`, alPulsar: () => {}, deshabilitada: true },
    { icono: 'videocam-outline', iconoWee: 'claqueta', etiqueta: `${t('composer.kindVideo')}. ${t('filmmaker.hubClosedContract')}`, alPulsar: () => {}, deshabilitada: true },
    { icono: 'pulse', iconoWee: 'ondas', etiqueta: `${t('creaciones.kindAudio')}. ${t('filmmaker.hubAudioClosed')}`, alPulsar: () => {}, deshabilitada: true },
  ];

  /*
   * EL REPARTO DE LA ALTURA. La sección de tipos es SIEMPRE la rejilla 2+2+1 de la referencia (nunca un carrusel). Lo fijo (cabecera, pestañas,
   * píldora, título de la sección, Directo/Guiado, Continuar y la holgura) se resta; de lo que queda se separa la caja vacía y, si hay altura, un
   * hero, y el resto son las tres filas: apaisadas 2:1 (la ancha, 4:1) y, si no cabe, más bajas hasta 60 dp. Si ni con 60 dp caben
   * (altura útil < MINIMO), la pantalla se desplaza en vertical con la sección entera: es el ÚLTIMO recurso.
   */
  /* La píldora de formato solo con altura (>= 700): en pantallas cortas cede su sitio a las tarjetas. Los 68 de más del compacto son lo medido en render. */
  const verPildora = PILDORA_DE_FORMATO_VISIBLE && alto >= 700;
  const verContinuar = !!reciente && alto >= 700;
  const fijo = (verContinuar ? 36 : 0) + (compacto ? ALTO_DE_CABECERA + (verPildora ? 30 : 0) + 46 + HOLGURA + 30 + 8 : ALTO_DE_CABECERA + 36 + (verPildora ? 38 : 0) + 54 + HOLGURA + 40);
  const anchoDeFila = ancho - SPACING.md * 2;
  const anchoMedia = Math.floor((anchoDeFila - 10) / 2);
  const conScroll = alto < fijo + 112 + 3 * 76 + 20;
  const heroReservado = alto >= 800 ? 96 : 0;
  const presupuestoDeTipos = alto - fijo - 112 - heroReservado;
  const altoDeFila = conScroll ? 80 : Math.max(76, Math.min(Math.floor(anchoMedia / 1.5), Math.floor((presupuestoDeTipos - 20) / 3)));
  const topeDeLaCaja = conScroll ? 200 : Math.max(120, alto - (fijo + 3 * altoDeFila + 20 + heroReservado));
  const TARJETAS = TIPOS_DE_PROYECTO.map((x) => {
    const elegido = tipoId === x.id;
    const abierta = x.estado !== 'cerrada';
    return { x, elegido, onPress: abierta ? () => { setTipoId(elegido ? null : x.id); setAviso(null); } : cerrado(x.claveMotivo as string) };
  });

  const cuerpoCrear = (
    <View style={[styles.crear, conScroll && { flex: undefined, flexGrow: 1 }]}>
      {verHero ? <HeroDePortada ancho={ancho} etiqueta={t('weeai.portadaEtiqueta')} titulo={t('filmmaker.hubTitle')} sub={alto >= 800 ? t('filmmaker.hubSub') : ' '} /> : <View style={styles.separador} />}

      <View style={styles.bloque}>
        {verContinuar && reciente ? (
          <TouchableOpacity onPress={() => navigation.navigate('Production', { productionId: reciente.productionId })} accessibilityRole="button" accessibilityLabel={etiquetaContinuar} style={[styles.continuar, dir.contenedor]} activeOpacity={0.8}>
            <IconoWee name="claqueta" size={16} color={P.tintaSecundaria} />
            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{t('filmmaker.hubContinue')}</Text>
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]} numberOfLines={1}>· {reciente.title}</Text>
            <IconoDireccional name="chevron-forward" size={14} color={P.tintaSecundaria} />
          </TouchableOpacity>
        ) : null}
        {/* La píldora de formato · duración · modelo (informativa) y, solo en la variante A, el chip de marca. */}
        {verPildora ? <View style={[styles.fila, dir.contenedor, { marginBottom: 10 }]}>
          <View style={[styles.pildora, dir.contenedor]} accessible accessibilityLabel={t('filmmaker.hubFormatLabel')}>
            <Text style={[textoPortada(12, '500'), { color: P.tinta }]}>{'⁦'}{pildora.formato}{'⁩'} · {t('filmmaker.hubSeconds', { n: formato.numero(pildora.segundos) })} · {t('filmmaker.hubAuto')}</Text>
          </View>
          {CHIP_DE_MARCA_EN_COMPOSER ? <View style={styles.pildora}><Text style={[textoPortada(12, '500'), { color: P.tintaSecundaria }]}>{t('filmmaker.hubBrain')}</Text></View> : null}
        </View> : null}
        <CajaAnclada alto={topeDeLaCaja}>
          <CajaDePrompt portada valor={texto} onCambiar={(v) => { setTexto(v); setFallo(false); }} onEnviar={crear} etiquetaEnviar={t('studio.sendLabel')} placeholder={t('filmmaker.hubPlaceholder')} acciones={acciones} accionesDerecha={accionesDerecha} ocupado={creando} />
        </CajaAnclada>
        {/* Los estados, en una línea con rol de estado: creando, error con Reintentar, sin sesión, sin saldo, o el motivo del control cerrado tocado. */}
        <View style={[styles.estado, compacto && { minHeight: 0, paddingTop: 2 }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {creando ? (
            <View style={[styles.fila, dir.contenedor]}><ActivityIndicator size="small" color={P.tintaSecundaria} /><Text style={[textoPortada(12), { color: P.tintaSecundaria }]}>{t('filmmaker.hubCreating')}</Text></View>
          ) : fallo ? (
            <View style={[styles.fila, dir.contenedor]}>
              <Text style={[textoPortada(12), dir.texto, { color: P.tinta, flexShrink: 1 }]} numberOfLines={2}>{t('filmmaker.hubCreateError')}</Text>
              <TouchableOpacity onPress={crear} accessibilityRole="button" style={styles.reintentar}><Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmaker.hubRetry')}</Text></TouchableOpacity>
            </View>
          ) : aviso ? (
            <Text style={[textoPortada(12), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={3}>{aviso}</Text>
          ) : !user ? (
            <Text style={[textoPortada(12), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{t('filmmaker.hubNeedSession')}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.bloque, { marginTop: compacto ? 4 : 10, paddingBottom: HOLGURA }]}>
        <Text style={[textoPortada(compacto ? 17 : 21, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header" numberOfLines={1}>{t('filmmaker.hubTypeSection')}</Text>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, marginTop: 2, marginBottom: 10 }]} numberOfLines={1}>{t('filmmaker.hubTypeSectionHint')}</Text>
        <View style={styles.rejilla}>
          {TARJETAS.map(({ x, elegido, onPress }, i) => <TarjetaDeTipo key={x.id} tipo={x} ancho={i === 4 ? anchoDeFila : anchoMedia} alto={altoDeFila} elegido={elegido} onPress={onPress} orden={i} />)}
        </View>
      </View>
    </View>
  );

  return (
    <CreatorShell activeId="creator" title={t('weeai.portadaFilmmaker')} breadcrumb={t('nav.weeAi')} fondo={P.fondo} sinFranjaSuperior fija contentStyle={styles.contenido}>
      <View style={styles.raiz} onLayout={(e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setMedida((a) => (Math.abs(a.ancho - width) > 1 || Math.abs(a.alto - height) > 1 ? { ancho: Math.round(width), alto: Math.round(height) } : a)); }}>
        <View style={[styles.cabecera, dir.contenedor]}>
          <TouchableOpacity onPress={atras} style={styles.boton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
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
        {conScroll ? <ScrollView style={styles.lista} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{cuerpoCrear}</ScrollView> : cuerpoCrear}
        <HojaDeTrabajo visible={hoja} onClose={() => setHoja(false)} onAbrirProduccion={(id) => navigation.navigate('Production', { productionId: id })} onAbrirCreaciones={() => navigation.navigate('MisCreaciones')} />
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
  crear: { flex: 1 },
  lista: { flex: 1 },
  separador: { flex: 1, minHeight: 4 },
  bloque: { paddingHorizontal: SPACING.md },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pildora: { minHeight: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: P.superficie, borderColor: P.bordeCapsula, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  estado: { minHeight: 10, justifyContent: 'center', paddingTop: 4 },
  reintentar: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderColor: P.bordeLuz, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipoCerrada: { borderStyle: 'dashed', opacity: 0.85 },
});

/* Filmmaker vive en el marco oscuro de WeëAI, con las dos caras. */
export default enTemaOscuro(FilmmakerCrearScreen);
