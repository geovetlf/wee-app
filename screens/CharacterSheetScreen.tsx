import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { confirmAction, notify } from '../utils/notify';
import { formatearNumero } from '../i18n/formato';
import { characterService } from '../services/characterService';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import AutonomiaDelPersonaje from '../components/AutonomiaDelPersonaje';
import MaterialDelPersonaje from '../components/personaje/MaterialDelPersonaje';
import { ANCHO_MAXIMO, COLOR, ESPACIO, LINEA, TACTIL, TIPO } from '../components/personaje/estilo';
import Icono from '../components/personaje/Iconos';
import { Barra, Boton, Campo, GrupoDeOpciones, Opcion, Seccion, TarjetaDeOpcion } from '../components/personaje/Piezas';
import TarjetaDelPersonaje from '../components/personaje/TarjetaDelPersonaje';
import {
  ErrorDeFicha,
  FichaDePersonaje,
  HORAS_DE_CADUCIDAD_DE_APROBACION,
  LIMITES_DE_FICHA,
  NIVELES_DE_AUTONOMIA,
  NivelDeAutonomia,
  TONOS_DE_VOZ,
  TonoDeVoz,
  erroresDeFicha,
  fichaCompleta,
  fichaEnBlanco,
  normalizarFicha,
  recomendadosQueFaltan,
} from '../utils/personajeFicha';

/*
 * LA FICHA DEL PERSONAJE — paso 1 de la autonomía con IA.
 *
 * Aquí la persona le da personalidad a su personaje (Perfil Weë). La ficha se
 * guarda aquí; la autonomía (sección de abajo) solo se activa con la ficha
 * GUARDADA y completa, y la decide y la cobra el servidor. Todo texto de la
 * pantalla sale de `character.*`; lo que la persona escribe es contenido suyo y
 * no se traduce.
 *
 * Diseño: monocromo sobre carbón, como el workspace de Filmmaker. Tokens en
 * `components/personaje/estilo.ts`, iconos en `components/personaje/Iconos.tsx`.
 */

const CLAVE_DE_TONO: Record<TonoDeVoz, string> = {
  cercano: 'character.toneCercano', formal: 'character.toneFormal', humoristico: 'character.toneHumoristico',
  poetico: 'character.tonePoetico', directo: 'character.toneDirecto', misterioso: 'character.toneMisterioso',
};
const CLAVE_DE_NIVEL: Record<NivelDeAutonomia, { nombre: string; desc: string }> = {
  basico: { nombre: 'character.levelBasico', desc: 'character.levelBasicoDesc' },
  alto: { nombre: 'character.levelAlto', desc: 'character.levelAltoDesc' },
};
const CLAVE_DE_ERROR: Record<ErrorDeFicha, string> = {
  nombreVacio: 'character.errorNameEmpty', resumenVacio: 'character.errorSummaryEmpty',
  personalidadVacia: 'character.errorPersonalityEmpty', sinRasgos: 'character.errorNoTraits',
};
const ESENCIALES = Object.keys(CLAVE_DE_ERROR).length;

/** Lo que identifica una ficha para saber si hay cambios sin guardar (sin la hora de edición). */
const firma = (f: unknown): string => {
  const { actualizadoEn: _hora, ...resto } = normalizarFicha(f);
  return JSON.stringify(resto);
};

const CharacterSheetScreen: React.FC = () => {
  const t = useT();
  const { locale } = useIdioma();
  const navigation = useNavigation();
  const { isDesktop, isTablet } = useResponsive();
  const { weeProfile, loading: cargandoPerfil } = useUserProfile();
  const perfilId = weeProfile?.id;

  const [ficha, setFicha] = useState<FichaDePersonaje>(() => fichaEnBlanco(weeProfile?.displayName || ''));
  const [rasgos, setRasgos] = useState('');
  const [temas, setTemas] = useState('');
  const [cargando, setCargando] = useState(!!perfilId);
  const [guardando, setGuardando] = useState(false);
  /* La autonomía se activa con la ficha GUARDADA y completa (el servidor la vuelve a comprobar). */
  const [guardadaCompleta, setGuardadaCompleta] = useState(false);
  /* Si hay un pase vivo, el nivel nuevo llega al pase cuando se guarda la ficha (lo sincroniza el servidor). */
  const [paseVivo, setPaseVivo] = useState(false);
  const [firmaGuardada, setFirmaGuardada] = useState(() => firma({ ...fichaEnBlanco(weeProfile?.displayName || ''), rasgos: '', temas: '' }));

  const aplicar = (f: FichaDePersonaje) => {
    setFicha(f); setRasgos(f.rasgos.join(', ')); setTemas(f.temas.join(', '));
    setGuardadaCompleta(fichaCompleta(f)); setFirmaGuardada(firma(f));
  };

  useEffect(() => {
    let vivo = true;
    if (!perfilId) { setCargando(false); return; }
    /* El Perfil Weë puede llegar después del primer pintado: se espera a la ficha antes de enseñar el formulario, para no pisar lo escrito. */
    setCargando(true);
    characterService.getFicha(perfilId)
      .then((f) => { if (vivo && f) aplicar(f); })
      .catch(() => { if (vivo) notify(t('common.error'), t('character.loadFailed')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilId]);

  const set = useCallback(<K extends keyof FichaDePersonaje>(k: K, v: FichaDePersonaje[K]) => setFicha((f) => ({ ...f, [k]: v })), []);

  // Lo que se valida y se guarda es la ficha ya normalizada con las dos listas escritas a mano.
  const actual = useMemo(() => normalizarFicha({ ...ficha, rasgos, temas }), [ficha, rasgos, temas]);
  const errores = useMemo(() => erroresDeFicha(actual), [actual]);
  const faltan = useMemo(() => recomendadosQueFaltan(actual), [actual]);
  const sinGuardar = useMemo(() => firma(actual) !== firmaGuardada, [actual, firmaGuardada]);
  const hechos = ESENCIALES - errores.length;
  const hayCambios = !!perfilId && !cargando && sinGuardar;

  /*
   * Salir con cambios sin guardar pregunta antes (volver, gesto o cerrar la
   * pestaña). `saliendo` deja pasar la salida ya confirmada o la de después de guardar.
   */
  const hayCambiosRef = useRef(hayCambios);
  hayCambiosRef.current = hayCambios;
  const saliendo = useRef(false);
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (!hayCambiosRef.current || saliendo.current) return;
    e.preventDefault();
    confirmAction(t('character.unsaved'), t('character.unsavedLeaveBody'), t('character.unsavedLeaveConfirm'), true, t).then((ok) => {
      if (!ok) return;
      saliendo.current = true;
      navigation.dispatch(e.data.action);
    });
  }), [navigation, t]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  const guardar = async () => {
    if (!perfilId || guardando) return;
    setGuardando(true);
    try {
      aplicar(await characterService.saveFicha(perfilId, actual));
      notify(t('character.title'), t('character.saved'));
    } catch {
      notify(t('common.error'), t('character.saveFailed'));
    } finally {
      setGuardando(false);
    }
  };

  const numero = (n: number) => formatearNumero(n, locale, { minimumIntegerDigits: 2 });
  const lateral = isDesktop || isTablet ? ESPACIO.xxl : ESPACIO.lg + ESPACIO.xs;

  return (
    <SafeAreaView style={s.pantalla} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLOR.fondo} />
      <View style={[s.barra, { paddingHorizontal: lateral - ESPACIO.sm }]}>
        <View style={s.lado}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [s.atras, pressed && s.atrasPulsado]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={6}
          >
            <Icono nombre="atras" tamano={22} color={COLOR.texto} />
          </Pressable>
        </View>
        <Text style={s.barraTitulo} numberOfLines={1} accessibilityRole="header">{t('character.title')}</Text>
        <View style={[s.lado, s.ladoFinal]}>
          {hayCambios ? (
            <Text style={s.sinGuardarCorto} numberOfLines={1} accessibilityLabel={t('character.unsaved')}>{t('character.unsavedShort')}</Text>
          ) : null}
        </View>
      </View>

      {!perfilId && cargandoPerfil ? (
        <View style={s.centro}><ActivityIndicator color={COLOR.blanco} accessibilityLabel={t('common.loading')} /></View>
      ) : !perfilId ? (
        <View style={s.centro}>
          <Icono nombre="personaje" tamano={40} color={COLOR.textoTenue} />
          <Text style={s.aviso}>{t('character.noWeeProfile')}</Text>
        </View>
      ) : cargando ? (
        <View style={s.centro}><ActivityIndicator color={COLOR.blanco} accessibilityLabel={t('common.loading')} /></View>
      ) : (
        <EspacioDeEscritura style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.interior, { paddingHorizontal: lateral }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.columna}>
              <View style={s.portada}>
                <Text style={s.rotulo}>{t('character.eyebrow')}</Text>
                <Text style={s.portadaTitulo}>{t('character.subtitle')}</Text>
                <Text style={s.portadaTexto}>{t('character.intro')}</Text>
              </View>

              <TarjetaDelPersonaje
                vistaPrevia={t('character.previewLabel')}
                nombre={actual.nombre}
                nombreVacio={t('character.previewUnnamed')}
                resumen={actual.resumen}
                resumenVacio={t('character.summaryPlaceholder')}
                rasgos={actual.rasgos}
                meta={[t(CLAVE_DE_TONO[actual.tono]), t(CLAVE_DE_NIVEL[actual.nivel].nombre)]}
              />

              <View style={s.progreso}>
                <View style={s.progresoFila}>
                  <Text style={s.progresoTexto}>{t('character.progressEssentials', { hechos: formatearNumero(hechos, locale), total: formatearNumero(ESENCIALES, locale) })}</Text>
                  <Icono nombre={errores.length ? 'incompleto' : 'completo'} tamano={16} color={errores.length ? COLOR.textoTenue : COLOR.blanco} />
                </View>
                <Barra valor={hechos / ESENCIALES} etiqueta={t('character.progressEssentials', { hechos: formatearNumero(hechos, locale), total: formatearNumero(ESENCIALES, locale) })} />
              </View>

              <Seccion numero={numero(1)} titulo={t('character.sectionIdentity')} icono="identidad">
                <Campo obligatorio etiqueta={t('character.nameLabel')} valor={ficha.nombre} onCambio={(v) => set('nombre', v)} marcador={t('character.namePlaceholder')} max={LIMITES_DE_FICHA.nombre} />
                <Campo obligatorio multilinea etiqueta={t('character.summaryLabel')} valor={ficha.resumen} onCambio={(v) => set('resumen', v)} marcador={t('character.summaryPlaceholder')} max={LIMITES_DE_FICHA.resumen} />
              </Seccion>

              <Seccion numero={numero(2)} titulo={t('character.sectionCharacter')} icono="caracter">
                <Campo obligatorio multilinea etiqueta={t('character.personalityLabel')} valor={ficha.personalidad} onCambio={(v) => set('personalidad', v)} marcador={t('character.personalityPlaceholder')} max={LIMITES_DE_FICHA.personalidad} />
                <Campo obligatorio etiqueta={t('character.traitsLabel')} valor={rasgos} onCambio={setRasgos} marcador={t('character.traitsPlaceholder')} max={200} />
                <View>
                  <Text style={s.etiqueta}>{t('character.toneLabel')}</Text>
                  <GrupoDeOpciones etiqueta={t('character.toneLabel')}>
                    {TONOS_DE_VOZ.map((tono) => (
                      <Opcion key={tono} texto={t(CLAVE_DE_TONO[tono])} activa={ficha.tono === tono} onPress={() => set('tono', tono)} />
                    ))}
                  </GrupoDeOpciones>
                </View>
              </Seccion>

              <Seccion numero={numero(3)} titulo={t('character.sectionWorld')} icono="mundo">
                <Campo multilinea etiqueta={t('character.backgroundLabel')} valor={ficha.trasfondo} onCambio={(v) => set('trasfondo', v)} marcador={t('character.backgroundPlaceholder')} max={LIMITES_DE_FICHA.trasfondo} />
                <Campo etiqueta={t('character.topicsLabel')} valor={temas} onCambio={setTemas} marcador={t('character.topicsPlaceholder')} max={240} />
              </Seccion>

              <Seccion numero={numero(4)} titulo={t('character.sectionVoice')} icono="voz">
                <Campo multilinea etiqueta={t('character.voiceLabel')} valor={ficha.ejemploDeVoz} onCambio={(v) => set('ejemploDeVoz', v)} marcador={t('character.voicePlaceholder')} max={LIMITES_DE_FICHA.ejemploDeVoz} />
                <Campo multilinea etiqueta={t('character.greetingLabel')} valor={ficha.saludo} onCambio={(v) => set('saludo', v)} marcador={t('character.greetingPlaceholder')} max={LIMITES_DE_FICHA.saludo} />
              </Seccion>

              <Seccion numero={numero(5)} titulo={t('character.sectionLimits')} icono="limites">
                <Campo multilinea etiqueta={t('character.limitsLabel')} valor={ficha.limites} onCambio={(v) => set('limites', v)} marcador={t('character.limitsPlaceholder')} max={LIMITES_DE_FICHA.limites} />
              </Seccion>

              <Seccion numero={numero(6)} titulo={t('character.levelLabel')} icono="nivel" pista={t('character.levelHint')}>
                <View style={s.niveles} accessibilityRole="radiogroup" accessibilityLabel={t('character.levelLabel')}>
                  {NIVELES_DE_AUTONOMIA.map((nivel) => (
                    <TarjetaDeOpcion
                      key={nivel}
                      titulo={t(CLAVE_DE_NIVEL[nivel].nombre)}
                      descripcion={t(CLAVE_DE_NIVEL[nivel].desc)}
                      activa={ficha.nivel === nivel}
                      onPress={() => set('nivel', nivel)}
                    />
                  ))}
                </View>
                {paseVivo ? <Text style={s.notaNivel} accessibilityLiveRegion="polite">{t('character.levelAppliesOnSave')}</Text> : null}
                <Text style={s.pista}>{t('character.approvalNote', { horas: formatearNumero(HORAS_DE_CADUCIDAD_DE_APROBACION, locale) })}</Text>
              </Seccion>

              <View style={s.cierre}>
                <View style={s.estadoFila}>
                  <Icono nombre={errores.length ? 'incompleto' : 'completo'} tamano={18} color={errores.length ? COLOR.textoSecundario : COLOR.blanco} />
                  <Text style={s.estadoTexto} accessibilityLiveRegion="polite">{errores.length ? t('character.incomplete') : t('character.complete')}</Text>
                </View>
                {errores.length ? (
                  <View style={s.faltas}>
                    {errores.map((e) => (
                      <View key={e} style={s.falta}>
                        <View style={s.faltaPunto} />
                        <Text style={s.pista}>{t(CLAVE_DE_ERROR[e])}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {errores.length === 0 && faltan.length > 0 ? <Text style={s.pista}>{t('character.recommendedHint')}</Text> : null}
                {sinGuardar ? <Text style={s.sinGuardar}>{t('character.unsaved')}</Text> : null}
                <Boton
                  texto={guardando ? t('character.saving') : t('character.save')}
                  icono="guardar"
                  onPress={guardar}
                  cargando={guardando}
                />
              </View>

              {/* El material (libro, biografía…): gratis, se guarda solo, aparte del botón de la ficha. */}
              <MaterialDelPersonaje perfilId={perfilId} numero={numero(7)} />

              <AutonomiaDelPersonaje perfilId={perfilId} fichaLista={guardadaCompleta} onPaseVivo={setPaseVivo} />
              <View style={{ height: ESPACIO.xxxl * 2 }} />
            </View>
          </ScrollView>
        </EspacioDeEscritura>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLOR.fondo },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ESPACIO.sm,
    paddingVertical: ESPACIO.sm, borderBottomWidth: LINEA, borderBottomColor: COLOR.linea, backgroundColor: COLOR.fondo,
  },
  /* Los dos lados ocupan lo mismo para que el título quede centrado aunque a la derecha diga «Sin guardar». */
  lado: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: TACTIL },
  ladoFinal: { justifyContent: 'flex-end' },
  atras: { width: TACTIL, height: TACTIL, borderRadius: TACTIL / 2, alignItems: 'center', justifyContent: 'center' },
  atrasPulsado: { backgroundColor: COLOR.velo },
  barraTitulo: { ...TIPO.pequenoFuerte, color: COLOR.texto, flexShrink: 1, textAlign: 'center' },
  sinGuardarCorto: { ...TIPO.pequeno, color: COLOR.textoSecundario, paddingHorizontal: ESPACIO.sm, flexShrink: 1 },
  notaNivel: { ...TIPO.pequenoFuerte, color: COLOR.texto },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESPACIO.xxl, gap: ESPACIO.lg },
  aviso: { ...TIPO.cuerpo, color: COLOR.textoSecundario, textAlign: 'center', maxWidth: 360 },
  interior: { paddingTop: ESPACIO.xxl, alignItems: 'center' },
  columna: { width: '100%', maxWidth: ANCHO_MAXIMO, gap: ESPACIO.xl },
  portada: { gap: ESPACIO.sm, paddingTop: ESPACIO.sm },
  rotulo: { ...TIPO.rotulo, color: COLOR.textoTenue },
  portadaTitulo: { ...TIPO.display, color: COLOR.blanco },
  portadaTexto: { ...TIPO.cuerpo, color: COLOR.textoSecundario, maxWidth: 560 },
  progreso: { gap: ESPACIO.sm, paddingBottom: ESPACIO.sm },
  progresoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ESPACIO.sm },
  progresoTexto: { ...TIPO.pequenoFuerte, color: COLOR.textoSecundario, flexShrink: 1 },
  etiqueta: { ...TIPO.pequenoFuerte, color: COLOR.texto, marginBottom: ESPACIO.sm },
  niveles: { gap: ESPACIO.sm },
  pista: { ...TIPO.pequeno, color: COLOR.textoSecundario, flexShrink: 1 },
  cierre: { gap: ESPACIO.md, paddingTop: ESPACIO.xl, borderTopWidth: LINEA, borderTopColor: COLOR.linea },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.sm },
  estadoTexto: { ...TIPO.seccion, color: COLOR.texto },
  faltas: { gap: ESPACIO.xs },
  falta: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.sm },
  faltaPunto: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLOR.textoTenue },
  sinGuardar: { ...TIPO.pequenoFuerte, color: COLOR.texto },
});

export default CharacterSheetScreen;
