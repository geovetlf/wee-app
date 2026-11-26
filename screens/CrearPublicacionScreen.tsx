import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useDireccion } from '../hooks/useDireccion';
import { useResponsive } from '../hooks/useResponsive';
import CreatorShell from '../components/creator/CreatorShell';
import CajaDePrompt from '../components/creator/CajaDePrompt';
import { IconoWee } from '../components/icons/IconoWee';
import HojaDePublicar from '../components/crear/HojaDePublicar';
import { Rotulo, TarjetaDeFormato, Chip, FilaDeChips, BotonPrincipal, BotonSecundario, TarjetaDePrecio, SelectorDeCara, Aviso } from '../components/crear/PiezasDeCrear';
import { useCrearPublicacion, ParametrosDeCreacion } from '../hooks/useCrearPublicacion';
import { descargarCreacion } from '../services/assetDownload';
import { tomarFotoPendiente } from '../utils/fotoPendiente';
import { ESTILOS, MAX_WEEL_SEC, claveDelTipo, duracionesDisponibles } from '../utils/publicacionDeWeeAi';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SP, NUMEROS_TABULARES } from '../constants/estiloWeeAi';

const ANCHO_MAXIMO = 600;

/**
 * WEËAI SENCILLO · CREAR PARA PUBLICAR (boceto aprobado por el dueño, 2026-11-23; pantallas 02–08, 10–12).
 *
 * Una sola pantalla para las tres puertas de la portada —Imagen, Video corto y Editar mi foto— con sus cuatro momentos:
 * elegir (idea, formato por DESTINO, estilo o duración, y el PRECIO antes de crear), creando, el resultado (una acción
 * principal según lo creado, quién publica, borradores) y el error («No se te cobró» primero).
 *
 * La caja donde se escribe es la común de Weë AI (`CajaDePrompt`, que crece sola: CLAUDE.md §9) y lo que se crea va por
 * Weë Brain y el WEË AI ENGINE de siempre (`useCrearPublicacion`): la persona nunca ve modelos ni proveedores, y la app
 * nunca calcula Credits. Sin claves de proveedor el resultado es la vista previa de demostración y se dice.
 */
const CrearPublicacionScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  /* La foto del «+» de la portada llega en memoria, no en la ruta (`utils/fotoPendiente.ts`). */
  const [fotoDelMas] = useState(tomarFotoPendiente);
  const params: ParametrosDeCreacion = { tipo: 'imagen', ...(route.params || {}), ...(fotoDelMas ? { fotoUri: fotoDelMas } : {}) };
  const { formato } = useIdioma();
  const dir = useDireccion();
  const { isDesktop } = useResponsive();
  const c = useCrearPublicacion(params);
  const { t, tipo, eleccion, setEleccion, precio, fase, resultado } = c;
  const [hoja, setHoja] = useState<null | 'weel' | 'wall'>(null);
  const [vista, setVista] = useState<'despues' | 'antes'>('despues');
  const [aviso, setAviso] = useState<string | null>(null);
  const [proporcion, setProporcion] = useState<number | undefined>(undefined);

  const n = (v: number) => formato.numero(v);
  const weel = tipo === 'video' && eleccion.formatoVideo === 'weel';

  /* ── Títulos ── */
  const titulo =
    fase === 'creando' ? t(tipo === 'imagen' ? 'publicar.creandoImagen' : tipo === 'editar' ? 'publicar.editandoFoto' : weel ? 'publicar.creandoWeel' : 'publicar.creandoVideo')
      : fase === 'resultado' ? t(tipo === 'imagen' ? 'publicar.tuImagen' : tipo === 'editar' ? 'publicar.tuFotoEditada' : weel ? 'publicar.tuWeel' : 'publicar.tuVideo')
        : t(tipo === 'imagen' ? 'publicar.puertaImagen' : tipo === 'editar' ? 'publicar.puertaEditar' : 'publicar.puertaVideo');

  const elegirFoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
      if (!r.canceled && r.assets?.[0]?.uri) void c.subirFoto(r.assets[0].uri);
    } catch {
      setAviso(t('publicar.errorSubirFoto'));
    }
  };

  const cifra = precio.estado === 'listo' && precio.credits != null ? t('publicar.precio', { credits: n(precio.credits) }) : null;
  const textoCrear = c.estiloDe ? t('publicar.crearMiVersion') : t(tipo === 'imagen' ? 'publicar.crearImagen' : tipo === 'editar' ? 'publicar.editarFoto' : 'publicar.crearVideo');

  /* ═════════════════════ ELEGIR ═════════════════════ */
  const renderEligiendo = () => (
    <>
      {tipo === 'editar' ? (
        <View>
          {c.foto.uri ? (
            <View style={styles.fotoGrande}>
              <Image source={{ uri: c.foto.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={t('publicar.subeTuFoto')} />
              {c.foto.subiendo ? (
                <View style={styles.velo}><ActivityIndicator color={P.tinta} /><Text style={[textoPortada(13, '500'), { color: P.tinta }]}>{t('publicar.subiendoFoto')}</Text></View>
              ) : null}
              <TouchableOpacity onPress={elegirFoto} style={[styles.pildoraSobre, dir.contenedor]} accessibilityRole="button" accessibilityLabel={t('publicar.cambiarFoto')}>
                <IconoWee name="recargar" size={15} color={P.tinta} />
                <Text style={[textoPortada(12, '600'), { color: P.tinta }]} numberOfLines={1}>{t('publicar.cambiarFoto')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={elegirFoto} style={styles.subir} accessibilityRole="button" accessibilityLabel={t('publicar.elegirFoto')}>
              <View style={styles.iconoSubir}><IconoWee name="galeria" size={30} color={P.icono} /></View>
              <Text style={[textoPortada(17, '600'), styles.centro, { color: P.tinta }]}>{t('publicar.subeTuFoto')}</Text>
              <Text style={[textoPortada(13, '400'), styles.centro, { color: P.tintaSecundaria }]}>{t('publicar.subeTuFotoHint')}</Text>
            </TouchableOpacity>
          )}
          {c.foto.error ? <Aviso texto={c.foto.error} /> : null}
        </View>
      ) : null}

      <Rotulo texto={tipo === 'editar' ? t('publicar.queCambiar') : t('publicar.tuIdea')} />
      {c.estiloDe ? (
        <View style={[styles.chapa, dir.contenedor]}>
          <IconoWee name="paleta" size={15} color={P.tinta} />
          <Text style={[textoPortada(13, '500'), styles.encoge, { color: P.tinta }]} numberOfLines={1}>{t('publicar.estiloDe', { nombre: c.estiloDe.nombre })}</Text>
          <TouchableOpacity onPress={c.quitarEstilo} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('publicar.quitarEstiloDe', { nombre: c.estiloDe.nombre })}>
            <IconoWee name="cerrar" size={15} color={P.tintaSecundaria} />
          </TouchableOpacity>
        </View>
      ) : null}
      <CajaDePrompt
        portada
        enviarDiscreto
        valor={c.idea}
        onCambiar={c.setIdea}
        onEnviar={c.crear}
        etiquetaEnviar={textoCrear}
        placeholder={tipo === 'editar' ? t('publicar.cambioPlaceholder') : t(tipo === 'imagen' ? 'publicar.ideaImagen' : 'publicar.ideaVideo')}
      />

      {tipo === 'editar' ? (
        <View style={styles.bloque}>
          <FilaDeChips>
            {['publicar.sugQuitarFondo', 'publicar.sugLuzEstudio', 'publicar.sugOtraRopa', 'publicar.sugIlustracion'].map((k) => (
              <Chip key={k} texto={t(k)} onPress={() => c.setIdea((x) => (x.trim() ? `${x.trim()}, ${t(k).toLowerCase()}` : t(k)))} />
            ))}
          </FilaDeChips>
        </View>
      ) : null}

      {tipo === 'imagen' ? (
        <>
          <Rotulo texto={t('publicar.dondePublicar')} />
          <View style={[styles.fila, dir.contenedor]} accessibilityRole="radiogroup" accessibilityLabel={t('publicar.dondePublicar')}>
            <TarjetaDeFormato nombre={t('publicar.formatoPublicacion')} desc={t('publicar.formatoCuadradaWall')} ancho={50} alto={50} puesta={eleccion.formatoImagen === 'post'} onPress={() => setEleccion((e) => ({ ...e, formatoImagen: 'post' }))} />
            <TarjetaDeFormato nombre={t('publicar.formatoVertical')} desc={t('publicar.formatoVerticalDesc')} ancho={34} alto={60} puesta={eleccion.formatoImagen === 'vertical'} onPress={() => setEleccion((e) => ({ ...e, formatoImagen: 'vertical' }))} />
          </View>
          <Rotulo texto={t('publicar.estilo')} />
          <FilaDeChips accesible={t('publicar.estilo')}>
            {ESTILOS.map((s) => (
              <Chip key={s.id} radio texto={t(s.clave)} icono={s.id === 'auto' ? 'chispas' : undefined} puesta={eleccion.estilo === s.id} onPress={() => setEleccion((e) => ({ ...e, estilo: s.id }))} />
            ))}
          </FilaDeChips>
        </>
      ) : null}

      {tipo === 'video' ? (
        <>
          <Rotulo texto={t('publicar.dondePublicar')} />
          <View style={[styles.fila, dir.contenedor]} accessibilityRole="radiogroup" accessibilityLabel={t('publicar.dondePublicar')}>
            <TarjetaDeFormato nombre={t('publicar.formatoWeel')} desc={t('publicar.formatoWeelDesc', { segundos: n(MAX_WEEL_SEC) })} ancho={34} alto={60} puesta={weel}
              onPress={() => setEleccion((e) => ({ ...e, formatoVideo: 'weel', duracion: typeof e.duracion === 'number' && e.duracion > MAX_WEEL_SEC ? 'auto' : e.duracion }))} />
            <TarjetaDeFormato nombre={t('publicar.formatoPublicacion')} desc={t('publicar.formatoCuadradoWall')} ancho={50} alto={50} puesta={!weel} onPress={() => setEleccion((e) => ({ ...e, formatoVideo: 'post' }))} />
          </View>
          <Rotulo texto={t('publicar.duracion')} />
          <FilaDeChips accesible={t('publicar.duracion')}>
            {duracionesDisponibles(weel).map((d) => (
              <Chip key={String(d)} radio texto={d === 'auto' ? t('publicar.queWeeElija') : t('publicar.segundos', { segundos: n(d) })} icono={d === 'auto' ? 'chispas' : undefined}
                puesta={eleccion.duracion === d} onPress={() => setEleccion((e) => ({ ...e, duracion: d }))} />
            ))}
          </FilaDeChips>
          <Rotulo texto={t('publicar.desdeUnaFoto')} extra={t('publicar.opcional')} />
          {c.foto.uri ? (
            <View style={[styles.filaFoto, dir.contenedor]}>
              <Image source={{ uri: c.foto.uri }} style={styles.miniatura} contentFit="cover" accessible={false} />
              <Text style={[textoPortada(14, '500'), styles.encoge, { color: P.tinta }]} numberOfLines={2}>{c.foto.subiendo ? t('publicar.subiendoFoto') : c.foto.error || t('publicar.desdeUnaFotoHint')}</Text>
              <TouchableOpacity onPress={c.quitarFoto} style={styles.quitar} accessibilityRole="button" accessibilityLabel={t('publicar.quitarFoto')}>
                <IconoWee name="cerrar" size={18} color={P.tintaSecundaria} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={elegirFoto} style={[styles.filaFoto, dir.contenedor]} accessibilityRole="button" accessibilityLabel={t('publicar.elegirFoto')}>
              <View style={styles.iconoFila}><IconoWee name="galeria" size={22} color={P.icono} /></View>
              <Text style={[textoPortada(14, '400'), styles.encoge, { color: P.tintaSecundaria }]} numberOfLines={2}>{t('publicar.desdeUnaFotoHint')}</Text>
            </TouchableOpacity>
          )}
        </>
      ) : null}

      <View style={styles.bloque}>
        {c.sinSaldo ? (
          <View style={styles.falta} accessibilityLiveRegion="polite">
            <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]}>{t('publicar.teFaltanCredits')}</Text>
            <View style={[styles.lineaFalta, dir.contenedor]}><Text style={[textoPortada(15, '400'), { color: P.tinta }]}>{t('publicar.estoCuesta')}</Text><Text style={[textoPortada(15, '600'), NUMEROS_TABULARES, { color: P.tinta }]}>{cifra}</Text></View>
            <View style={[styles.lineaFalta, dir.contenedor]}><Text style={[textoPortada(15, '400'), { color: P.tinta }]}>{t('publicar.tienesRotulo')}</Text><Text style={[textoPortada(15, '600'), NUMEROS_TABULARES, { color: P.tinta }]}>{t('publicar.credits', { credits: n(c.balance ?? 0) })}</Text></View>
            <View style={styles.separador} />
            <Text style={[textoPortada(13, '400', { lineHeight: 19 }), dir.texto, { color: P.tintaSecundaria }]}>{t('publicar.sinSaldoHint')}</Text>
            {precio.prueba ? <View style={[styles.prueba, dir.contenedor]}><Text style={[textoPortada(11, '600'), { color: P.tintaSecundaria }]}>{t('publicar.precioDePrueba')}</Text></View> : null}
          </View>
        ) : (
          <TarjetaDePrecio
            titulo={t('publicar.costara')}
            nota={tipo === 'video' ? t('publicar.masLargoMasCredits') : t('publicar.soloSiSaleBien')}
            cifra={cifra}
            calculando={precio.estado === 'calculando'}
            error={precio.estado === 'error' ? t('publicar.precioNoDisponible') : undefined}
            prueba={precio.prueba ? t('publicar.precioDePrueba') : undefined}
          />
        )}
      </View>
    </>
  );

  const pieEligiendo = (
    <View style={styles.pie}>
      {c.pideCuenta ? (
        <>
          <Aviso texto={t('weeai.errAccountRequired')} />
          <BotonPrincipal texto={t('auth.signInToContinue')} onPress={() => navigation.navigate('Login')} />
        </>
      ) : c.sinSaldo ? (
        <>
          <BotonPrincipal texto={t('publicar.comprarCredits')} icono="credits" onPress={() => navigation.navigate('CreditStore')} />
          <BotonSecundario plano texto={t('publicar.guardarComoBorrador')} icono="marcador" onPress={() => void c.guardarEnBorradores()} />
        </>
      ) : (
        <BotonPrincipal texto={textoCrear} icono="chispas" onPress={c.crear} deshabilitado={!c.puedeCrear && !(c.job?.status === 'planned')} />
      )}
      {c.aviso ? <Aviso texto={c.aviso} tono="ok" /> : null}
      {c.estiloDe ? <Aviso texto={t('publicar.seMencionara', { nombre: c.estiloDe.nombre })} /> : null}
      {tipo === 'editar' ? <Aviso texto={t('publicar.avisoPermiso')} /> : null}
      {c.balance != null && !c.sinSaldo ? <Aviso texto={t('publicar.tienes', { credits: n(c.balance) })} /> : null}
    </View>
  );

  /* ═════════════════════ CREANDO ═════════════════════ */
  const brillo = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (fase !== 'creando') return;
    const bucle = Animated.loop(Animated.sequence([
      Animated.timing(brillo, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(brillo, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    bucle.start();
    return () => bucle.stop();
  }, [fase, brillo]);

  const proporcionPrevista = tipo === 'video' ? (weel ? 9 / 16 : 1) : tipo === 'imagen' ? (eleccion.formatoImagen === 'vertical' ? 9 / 16 : 1) : 4 / 5;
  const paso = (texto: string, estado: 'hecho' | 'ahora' | 'luego') => (
    <View key={texto} style={[styles.paso, dir.contenedor]} accessibilityState={{ busy: estado === 'ahora' }}>
      <View style={[styles.punto, estado === 'hecho' ? styles.puntoHecho : estado === 'ahora' ? styles.puntoAhora : null]}>
        {estado === 'hecho' ? <IconoWee name="marca" size={13} color={P.sobreAccion} /> : estado === 'ahora' ? <View style={styles.puntoDentro} /> : null}
      </View>
      <Text style={[textoPortada(15, estado === 'ahora' ? '600' : '400'), { color: estado === 'luego' ? P.tintaSecundaria : P.tinta }]}>{texto}</Text>
    </View>
  );
  const renderCreando = () => (
    <View style={styles.creando} accessibilityLiveRegion="polite" accessibilityLabel={titulo}>
      <Animated.View style={[styles.lienzo, { aspectRatio: proporcionPrevista, opacity: brillo, width: proporcionPrevista < 1 ? 200 : 260 }]} />
      <View style={styles.pasos}>
        {paso(t('publicar.pasoEntendi'), 'hecho')}
        {paso(t('publicar.pasoCreando'), 'ahora')}
        {paso(t('publicar.pasoRetoques'), 'luego')}
      </View>
    </View>
  );
  const pieCreando = (
    <View style={styles.pie}>
      <Aviso texto={t('publicar.puedesSalir')} />
      <BotonSecundario texto={t('publicar.seguirNavegando')} onPress={() => navigation.navigate('Historial')} style={styles.ancho} />
    </View>
  );

  /* ═════════════════════ RESULTADO ═════════════════════ */
  const esVideo = resultado?.tipo === 'video';
  const accionPrincipal: 'weel' | 'wall' = esVideo && c.esWeelPosible ? 'weel' : 'wall';
  const renderResultado = () => {
    if (!resultado) return null;
    const antes = tipo === 'editar' && vista === 'antes' && c.foto.uri;
    return (
      <View style={styles.resultado}>
        {tipo === 'editar' && c.foto.uri ? (
          <View style={[styles.segmentos, dir.contenedor]} accessibilityRole="tablist">
            {(['antes', 'despues'] as const).map((v) => (
              <TouchableOpacity key={v} onPress={() => setVista(v)} accessibilityRole="tab" accessibilityState={{ selected: vista === v }} style={[styles.segmento, vista === v ? styles.segmentoPuesto : null]}>
                <Text style={[textoPortada(14, vista === v ? '600' : '500'), { color: vista === v ? P.tinta : P.tintaSecundaria }]}>{t(v === 'antes' ? 'publicar.antes' : 'publicar.despues')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <View style={[styles.medio, { aspectRatio: esVideo ? (weel ? 9 / 16 : 1) : proporcion || proporcionPrevista, width: esVideo && weel ? 230 : '100%', maxWidth: 420 }]}>
          {esVideo && !resultado.demo ? (
            <Video source={{ uri: resultado.url }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} useNativeControls shouldPlay={false} accessibilityLabel={titulo} />
          ) : (
            <Image
              source={{ uri: antes ? (c.foto.uri as string) : resultado.url }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              accessibilityLabel={titulo}
              onLoad={(e: any) => { const w = e?.source?.width; const h = e?.source?.height; if (!antes && w > 0 && h > 0) setProporcion(w / h); }}
            />
          )}
          {resultado.demo ? <View style={[styles.etiquetaDemo, dir.contenedor]}><Text style={[textoPortada(12, '600'), { color: P.tinta }]}>{t('weeai.previewDemo')}</Text></View> : null}
        </View>
        <View style={styles.ancho}>
          <SelectorDeCara caras={c.caras} puesta={c.cara} onElegir={c.setCara} etiqueta={t('publicar.quienPublica')} />
        </View>
        <FilaDeChips>
          <Chip texto={t('publicar.otraVersion')} icono="repetir" extra={cifra ? `≈ ${n(precio.credits as number)}` : undefined} onPress={c.otraVez} />
        </FilaDeChips>
        {resultado.demo ? <Aviso texto={t('publicar.demoNoPublicable')} /> : null}
        {esVideo && eleccion.formatoVideo === 'weel' && !c.esWeelPosible ? <Aviso texto={t('publicar.weelMuyLargo', { segundos: n(MAX_WEEL_SEC) })} /> : null}
      </View>
    );
  };
  const descargar = async () => {
    if (!resultado) return;
    const r = await descargarCreacion(resultado.url, resultado.tipo);
    setAviso(r === 'error' || r === 'sin_permiso' ? t('publicar.errorDescargar') : t('publicar.descargado'));
  };
  const pieResultado = resultado ? (
    <View style={styles.pie}>
      <BotonPrincipal
        texto={t(accionPrincipal === 'weel' ? 'publicar.publicarComoWeel' : 'publicar.publicarEnWall')}
        icono={accionPrincipal === 'weel' ? 'weels' : 'casa'}
        deshabilitado={resultado.demo}
        onPress={() => setHoja(accionPrincipal)}
      />
      <View style={[styles.fila, dir.contenedor]}>
        {accionPrincipal === 'weel'
          ? <BotonSecundario texto={t('publicar.enElWall')} icono="casa" onPress={() => setHoja('wall')} deshabilitado={resultado.demo} />
          : <BotonSecundario texto={t('publicar.descargar')} icono="chevronAbajo" onPress={descargar} deshabilitado={resultado.demo} />}
        {/* Compartir fuera lleva la marca de agua de Weë, y esa marca todavía no existe en ningún sitio: cerrado con su motivo. */}
        <BotonSecundario texto={t('publicar.compartirFuera')} icono="compartir" onPress={() => {}} deshabilitado etiqueta={t('publicar.compartirFueraPronto')} />
      </View>
      <BotonSecundario plano texto={t('publicar.guardarEnBorradores')} icono="marcador" onPress={() => void c.guardarEnBorradores()} />
      {c.aviso || aviso ? <Aviso texto={(c.aviso || aviso) as string} tono="ok" /> : null}
    </View>
  ) : null;

  /* ═════════════════════ ERROR ═════════════════════ */
  const renderError = () => (
    <View style={styles.estado} accessibilityLiveRegion="assertive">
      <View style={styles.circulo}><IconoWee name="alerta" size={30} color={P.icono} /></View>
      <Text style={[textoPortada(22, '600'), styles.centro, { color: P.tinta }]} accessibilityRole="header">{t('publicar.errorTitulo')}</Text>
      <Text style={[textoPortada(15, '400', { lineHeight: 22 }), styles.centro, { color: P.tintaSecundaria }]}>{c.error || t('publicar.errorTexto')}</Text>
      {/* Lo primero que preocupa: el servidor devuelve lo reservado cuando una creación falla (creatorRun → refund). */}
      <View style={[styles.noCobro, dir.contenedor]}><View style={styles.puntoOk} /><Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t('publicar.noSeTeCobro')}</Text></View>
    </View>
  );
  const pieError = (
    <View style={styles.pie}>
      <BotonPrincipal texto={t('publicar.intentarDeNuevo')} icono="repetir" onPress={() => { c.otraVez(); }} />
      <BotonSecundario texto={t('publicar.cambiarLaIdea')} onPress={c.otraVez} style={styles.ancho} />
    </View>
  );

  const contenido = fase === 'creando' ? renderCreando() : fase === 'resultado' ? renderResultado() : fase === 'error' ? renderError() : renderEligiendo();
  const pie = fase === 'creando' ? pieCreando : fase === 'resultado' ? pieResultado : fase === 'error' ? pieError : pieEligiendo;
  const lineaDeComo = [t(claveDelTipo(tipo)), esVideo && resultado?.durationSec ? t('publicar.segundos', { segundos: n(Math.round(resultado.durationSec)) }) : ''].filter(Boolean).join(' · ');

  return (
    <CreatorShell activeId="creator" title={titulo} breadcrumb={t('nav.weeAi')} fondo={P.fondo} contentStyle={styles.contenido} pie={<View style={[styles.columna, isDesktop ? styles.columnaEscritorio : null]}>{pie}</View>}>
      <View style={[styles.columna, isDesktop ? styles.columnaEscritorio : null]}>{contenido}</View>
      <HojaDePublicar
        visible={!!hoja}
        titulo={t(hoja === 'weel' ? 'publicar.publicarComoWeel' : 'publicar.publicarEnWall')}
        caras={c.caras}
        cara={c.cara}
        onCara={c.setCara}
        lineaDeComo={lineaDeComo}
        idea={c.idea}
        inspiradoEn={c.estiloDe ? t('publicar.inspiradoEn', { nombre: c.estiloDe.nombre }) : undefined}
        onCerrar={() => setHoja(null)}
        onPublicar={async (o) => {
          const postId = await c.publicar({ comoWeel: hoja === 'weel', texto: o.texto, mostrarIdea: o.mostrarIdea, proporcion });
          if (!postId) return false;
          setHoja(null);
          navigation.navigate('PostDetail', { postId });
          return true;
        }}
      />
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  contenido: { paddingBottom: SP.md },
  columna: { width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  columnaEscritorio: { paddingTop: SP.md },
  fila: { flexDirection: 'row', gap: SP.sm },
  bloque: { marginTop: SP.md },
  encoge: { flex: 1, minWidth: 0 },
  centro: { textAlign: 'center' },
  /* flexShrink, no `flex: 0`: en la web `flex: 0` deja la base en 0 y el selector de cara se encogía hasta pisar lo de debajo. */
  ancho: { alignSelf: 'stretch', flexShrink: 0 },
  chapa: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: P.superficieAlta, borderColor: P.bordeCapsula, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginBottom: SP.sm },
  fotoGrande: { height: 280, borderRadius: 22, overflow: 'hidden', backgroundColor: P.modulo, marginTop: SP.xs },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,6,8,0.55)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pildoraSobre: { position: 'absolute', top: 10, end: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, paddingHorizontal: 10, minHeight: 32 },
  subir: { minHeight: 200, borderRadius: 22, backgroundColor: P.modulo, borderColor: P.borde, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: SP.lg, marginTop: SP.xs },
  iconoSubir: { width: 64, height: 64, borderRadius: 20, backgroundColor: P.superficieAlta, borderColor: P.bordeCapsula, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  filaFoto: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.superficie, borderColor: P.bordeCapsula, borderWidth: 1, borderRadius: 20, padding: 10, minHeight: 64 },
  iconoFila: { width: 44, height: 44, borderRadius: 12, backgroundColor: P.superficieAlta, borderColor: P.bordeCapsula, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  miniatura: { width: 44, height: 44, borderRadius: 12 },
  quitar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  falta: { backgroundColor: P.superficie, borderColor: '#5A3434', borderWidth: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: SP.md, gap: 6 },
  lineaFalta: { flexDirection: 'row', justifyContent: 'space-between', gap: SP.sm },
  separador: { height: 1, backgroundColor: P.borde, marginVertical: 6 },
  prueba: { alignSelf: 'flex-start', borderColor: P.bordeCapsula, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  pie: { gap: SP.sm, paddingTop: SP.sm },
  creando: { alignItems: 'center', paddingTop: SP.sm, gap: SP.lg },
  lienzo: { borderRadius: 22, backgroundColor: P.superficieAlta, borderColor: P.borde, borderWidth: 1, maxWidth: '80%' },
  pasos: { alignSelf: 'stretch', gap: 12, paddingHorizontal: 6 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  punto: { width: 22, height: 22, borderRadius: 11, borderColor: P.bordeCapsula, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  puntoHecho: { backgroundColor: P.tinta, borderColor: P.tinta },
  puntoAhora: { borderColor: P.luz },
  puntoDentro: { width: 8, height: 8, borderRadius: 4, backgroundColor: P.luz },
  resultado: { alignItems: 'center', gap: 14 },
  segmentos: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: P.superficie, borderColor: P.borde, borderWidth: 1, borderRadius: 14, padding: 4, gap: 4 },
  segmento: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentoPuesto: { backgroundColor: P.superficieAlta },
  medio: { borderRadius: 22, overflow: 'hidden', backgroundColor: P.modulo },
  etiquetaDemo: { position: 'absolute', top: 10, start: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  estado: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: SP.lg, paddingTop: SP.xl },
  circulo: { width: 76, height: 76, borderRadius: 38, backgroundColor: P.superficie, borderColor: P.bordeCapsula, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: SP.sm },
  noCobro: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: SP.sm, backgroundColor: 'rgba(61,220,151,0.10)', borderColor: 'rgba(61,220,151,0.35)', borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  puntoOk: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3DDC97' },
});

/* WeëAI es siempre oscura, con las dos caras (decisión del dueño, 2026-11-16). */
export default enTemaOscuro(CrearPublicacionScreen);
