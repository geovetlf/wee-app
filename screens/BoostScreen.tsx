import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useDireccion } from '../hooks/useDireccion';
import { nombreDeLaRegion } from '../i18n/formato';
import { COUNTRIES } from '../data/countries';
import {
  boostService,
  BoostablePost,
  BoostEstimate,
  BoostObjective,
  BoostOptions,
  BoostRequest,
  BoostSegment,
  motivoDeError,
  nuevoRequestId,
} from '../services/boostService';
import MarcoDeBoost from '../components/boost/MarcoDeBoost';
import { useAlturaDelTeclado } from '../components/EspacioDeEscritura';
import { Aviso, Boton, claveDeError, DORADO, Fila, Opcion, Pildora, Tarjeta, VistaDePublicacion } from '../components/boost/PiezasDeBoost';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * BOOST — IMPULSAR UNA PUBLICACIÓN PROPIA (docs/BOOST.md).
 *
 * Una sola página: qué se impulsa → objetivo → público (y país si aplica) → duración → presupuesto → estimación →
 * resumen → «Revisar y confirmar» → confirmación → reserva. Lo que hace y lo que NO:
 *  · No calcula precios ni toca Credits. Manda lo elegido a la callable `boost`; el servidor valida todo, RESERVA el
 *    presupuesto en el Credit Engine y abre la campaña. Antes de confirmar no se reserva nada.
 *  · No inventa cifras. La estimación es el número de cuentas que HOY cumplen el público (servidor, datos reales); si
 *    no hay, lo dice. No hay alcance prometido.
 *  · Si Boost está cerrado (`boostSettings/config.enabled`) o falta el servicio en el Credit Engine, se puede preparar
 *    y revisar, pero el botón de confirmar no reserva nada y la pantalla lo dice.
 *
 * Ruta: `Boost { tipo: 'post' | 'page', id }`. `id: 'elegir'` abre el selector de publicaciones. Las Páginas todavía
 * no se pueden impulsar (no hay distribución de páginas): la pantalla lo dice y ofrece las publicaciones.
 */

const OBJETIVOS: { id: BoostObjective; icono: string; clave: string; pista: string }[] = [
  { id: 'reach', icono: 'eye-outline', clave: 'boost.objReach', pista: 'boost.objReachHint' },
  { id: 'interaction', icono: 'hand-left-outline', clave: 'boost.objInteraction', pista: 'boost.objInteractionHint' },
];
const SEGMENTOS: { id: BoostSegment; icono: string; clave: string; pista: string }[] = [
  { id: 'everyone', icono: 'globe-outline', clave: 'boost.segEveryone', pista: 'boost.segEveryoneHint' },
  { id: 'contacts', icono: 'people-outline', clave: 'boost.segContacts', pista: 'boost.segContactsHint' },
  { id: 'community', icono: 'chatbubbles-outline', clave: 'boost.segCommunity', pista: 'boost.segCommunityHint' },
];

const BoostScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  /* El buscador de país abre el teclado: el marco suma su alto abajo para que el campo no quede tapado. */
  const alturaTeclado = useAlturaDelTeclado();
  const tipo: 'page' | 'post' = route.params?.tipo === 'page' ? 'page' : 'post';
  const idPedido: string | undefined = tipo === 'post' && route.params?.id && route.params.id !== 'elegir' ? String(route.params.id) : undefined;

  const [opciones, setOpciones] = useState<BoostOptions | null>(null);
  const [posts, setPosts] = useState<BoostablePost[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [post, setPost] = useState<BoostablePost | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [objetivo, setObjetivo] = useState<BoostObjective>('reach');
  const [segmento, setSegmento] = useState<BoostSegment>('everyone');
  const [pais, setPais] = useState<string | null>(null);
  const [buscandoPais, setBuscandoPais] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [dias, setDias] = useState<number | null>(null);
  const [presupuesto, setPresupuesto] = useState<number | null>(null);
  const [estimacion, setEstimacion] = useState<BoostEstimate | null | 'cargando'>(null);
  const [fase, setFase] = useState<'form' | 'confirm'>('form');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    try {
      const [o, p] = await Promise.all([boostService.opciones(), boostService.misPublicaciones()]);
      setOpciones(o);
      setPosts(p);
      setDias((d) => d ?? (o.durations.includes(3) ? 3 : o.durations[0]));
      setPresupuesto((b) => b ?? o.budgets[Math.min(1, o.budgets.length - 1)] ?? null);
      if (idPedido) {
        const elegido = p.find((x) => x.id === idPedido) ?? null;
        setPost(elegido);
        setEligiendo(!elegido);
      } else {
        setEligiendo(true);
      }
    } catch (e) {
      setErrorCarga(motivoDeError(e));
    }
  }, [idPedido]);

  useEffect(() => {
    if (tipo === 'post') cargar();
  }, [tipo, cargar]);

  /* El país solo aplica a algunos públicos; con los contactos se quita. La comunidad, solo si la publicación tiene. */
  const conPais = !!opciones?.segmentsWithCountry.includes(segmento);
  useEffect(() => {
    if (!conPais) setPais(null);
  }, [conPais]);
  useEffect(() => {
    if (segmento === 'community' && post && !post.hasCommunity) setSegmento('everyone');
  }, [post, segmento]);

  const peticion: BoostRequest | null = post && dias && presupuesto
    ? { postId: post.id, objective: objetivo, segment: segmento, country: conPais ? pais : null, budgetCredits: presupuesto, durationDays: dias }
    : null;
  const clavePeticion = peticion ? JSON.stringify(peticion) : '';

  /* UN requestId POR PETICIÓN: reintentar lo mismo usa el mismo (el servidor no cobra dos veces); cambiar algo, otro. */
  const requestIds = useRef(new Map<string, string>());
  const requestIdDe = (clave: string) => {
    if (!requestIds.current.has(clave)) requestIds.current.set(clave, nuevoRequestId());
    return requestIds.current.get(clave)!;
  };

  useEffect(() => {
    if (!peticion) return;
    let vivo = true;
    setEstimacion('cargando');
    const h = setTimeout(async () => {
      try {
        const r = await boostService.estimar(peticion);
        if (vivo) setEstimacion(r);
      } catch {
        if (vivo) setEstimacion(null);
      }
    }, 350);
    return () => { vivo = false; clearTimeout(h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePeticion]);

  const paises = useMemo(() => {
    const lista = COUNTRIES.map((c) => ({ code: c.code, nombre: nombreDeLaRegion(c.code, locale) }));
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre, locale));
    return lista;
  }, [locale]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase(locale);
    return q ? paises.filter((p) => p.nombre.toLocaleLowerCase(locale).includes(q) || p.code.toLocaleLowerCase(locale) === q) : paises;
  }, [busqueda, paises, locale]);

  const creditos = (n: number) => t('boost.credits', { cantidad: formato.numero(n) });
  const sinSaldo = !!(opciones && opciones.balance !== null && presupuesto !== null && presupuesto > opciones.balance);
  const sePuedeContratar = !!(opciones?.enabled && opciones.serviceReady);

  const confirmar = async () => {
    if (!peticion || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await boostService.crear(peticion, requestIdDe(clavePeticion));
      navigation.replace('BoostCampaign', { campaignId: r.campaign.id });
    } catch (e) {
      setError(motivoDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const accionHistorial = { texto: t('boost.myPromotions'), icono: 'list-outline', onPress: () => navigation.navigate('BoostCampaigns') };

  /* ── Páginas: todavía no ── */
  if (tipo === 'page') {
    return (
      <MarcoDeBoost titulo={t('boost.title')} accion={accionHistorial}>
        <Aviso texto={t('boost.pageNotAvailable')} />
        <Boton texto={t('boost.newPromotion')} icono="rocket-outline" onPress={() => navigation.replace('Boost', { tipo: 'post', id: 'elegir' })} />
      </MarcoDeBoost>
    );
  }

  if (errorCarga) {
    return (
      <MarcoDeBoost titulo={t('boost.title')} accion={accionHistorial}>
        <Aviso tono="error" titulo={t('boost.errTitle')} texto={t(claveDeError(errorCarga))} />
        <Boton texto={t('common.retry')} secundario onPress={cargar} />
      </MarcoDeBoost>
    );
  }

  if (!opciones || !posts) {
    return (
      <MarcoDeBoost titulo={t('boost.title')} accion={accionHistorial}>
        <View style={st.cargando} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={DORADO} />
        </View>
      </MarcoDeBoost>
    );
  }

  const objetivoElegido = OBJETIVOS.find((o) => o.id === objetivo)!;
  const segmentoElegido = SEGMENTOS.find((x) => x.id === segmento)!;
  const etiquetaDeCara = (p: BoostablePost) => (p.identityKind === 'wee' ? t('boost.fromWee') : t('boost.fromReal'));

  const avisoDeApertura = !opciones.enabled
    ? <Aviso titulo={t('boost.closedTitle')} texto={t('boost.closedBody')} />
    : !opciones.serviceReady
      ? <Aviso titulo={t('boost.closedTitle')} texto={t('boost.pendingServiceBody')} />
      : null;

  /* ── Confirmación ── */
  if (fase === 'confirm' && peticion && post) {
    return (
      <MarcoDeBoost titulo={t('boost.confirmTitle')} accion={accionHistorial}>
        {avisoDeApertura}
        <Tarjeta titulo={t('boost.stepSummary')} rol="summary">
          <VistaDePublicacion texto={post.text} imagen={post.image} video={post.video} etiqueta={etiquetaDeCara(post)} />
          <Fila clave={t('boost.stepObjective')} valor={t(objetivoElegido.clave)} />
          <Fila clave={t('boost.stepAudience')} valor={t(segmentoElegido.clave)} />
          {conPais ? <Fila clave={t('boost.stepCountry')} valor={pais ? nombreDeLaRegion(pais, locale) : t('boost.countryAny')} /> : null}
          <Fila clave={t('boost.stepDuration')} valor={t('boost.days', { contador: peticion.durationDays })} />
          <Fila clave={t('boost.stepBudget')} valor={creditos(peticion.budgetCredits)} fuerte />
        </Tarjeta>
        <Tarjeta>
          <Text style={[st.regla, dir.texto, { color: theme.colors.text }]}>{t('boost.confirmReserve', { cantidad: formato.numero(peticion.budgetCredits) })}</Text>
          <Text style={[st.regla, dir.texto, { color: theme.colors.text }]}>{t('boost.confirmRule')}</Text>
          <Text style={[st.regla, dir.texto, { color: theme.colors.text }]}>{t('boost.confirmCancel')}</Text>
          {opciones.balance !== null ? <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.balance', { cantidad: formato.numero(opciones.balance) })}</Text> : null}
        </Tarjeta>
        {error ? <Aviso tono="error" titulo={t('boost.errTitle')} texto={t(claveDeError(error))} /> : null}
        <Boton
          texto={enviando ? t('boost.confirming') : t('boost.confirmButton', { cantidad: formato.numero(peticion.budgetCredits) })}
          icono="rocket-outline"
          onPress={confirmar}
          cargando={enviando}
          deshabilitado={!sePuedeContratar || sinSaldo}
        />
        <Boton texto={t('common.back')} secundario onPress={() => { setFase('form'); setError(null); }} />
      </MarcoDeBoost>
    );
  }

  /* ── Formulario ── */
  return (
    <MarcoDeBoost titulo={t('boost.title')} accion={accionHistorial} espacioDelTeclado={alturaTeclado}>
      <Text style={[st.subtitulo, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.subtitle')}</Text>
      {avisoDeApertura}

      <Tarjeta titulo={t('boost.stepPost')}>
        {idPedido && !posts.some((p) => p.id === idPedido) ? <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.postNotFound')}</Text> : null}
        {post && !eligiendo ? (
          <View style={st.filaPost}>
            <View style={st.flex}>
              <VistaDePublicacion texto={post.text} imagen={post.image} video={post.video} etiqueta={etiquetaDeCara(post)} />
            </View>
            {posts.length > 1 ? (
              <TouchableOpacity onPress={() => setEligiendo(true)} style={st.cambiar} accessibilityRole="button" accessibilityLabel={t('boost.changePost')}>
                <Text style={[st.cambiarTexto, { color: theme.colors.text }]}>{t('boost.changePost')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : posts.length === 0 ? (
          <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.noPosts')}</Text>
        ) : (
          <View style={st.lista} accessibilityRole="radiogroup" accessibilityLabel={t('boost.choosePost')}>
            <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.choosePost')}</Text>
            {posts.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => { setPost(p); setEligiendo(false); }}
                style={[st.itemPost, { borderColor: post?.id === p.id ? DORADO : theme.colors.border }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null]}
                accessibilityRole="radio"
                accessibilityState={{ checked: post?.id === p.id }}
              >
                <VistaDePublicacion texto={p.text} imagen={p.image} video={p.video} etiqueta={`${etiquetaDeCara(p)} · ${formato.fecha(p.createdAt, { day: 'numeric', month: 'short' })}`} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Tarjeta>

      {post ? (
        <>
          <Tarjeta titulo={t('boost.stepObjective')} rol="radiogroup">
            {OBJETIVOS.map((o) => (
              <Opcion key={o.id} activa={objetivo === o.id} onPress={() => setObjetivo(o.id)} etiqueta={t(o.clave)} pista={t(o.pista)} icono={o.icono} />
            ))}
            <Text style={[st.nota, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.objectiveNote')}</Text>
          </Tarjeta>

          <Tarjeta titulo={t('boost.stepAudience')} rol="radiogroup">
            {SEGMENTOS.map((x) => {
              const sinComunidad = x.id === 'community' && !post.hasCommunity;
              return (
                <Opcion
                  key={x.id}
                  activa={segmento === x.id}
                  onPress={() => setSegmento(x.id)}
                  etiqueta={t(x.clave)}
                  pista={sinComunidad ? t('boost.segCommunityUnavailable') : t(x.pista)}
                  icono={x.icono}
                  deshabilitada={sinComunidad}
                />
              );
            })}
          </Tarjeta>

          <Tarjeta titulo={t('boost.stepCountry')}>
            {conPais ? (
              <>
                <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.countryHint')}</Text>
                <View style={st.pildoras}>
                  <Pildora activa={!pais} onPress={() => { setPais(null); setBuscandoPais(false); }} texto={t('boost.countryAny')} />
                  {pais ? <Pildora activa onPress={() => setBuscandoPais(true)} texto={nombreDeLaRegion(pais, locale)} /> : null}
                  <TouchableOpacity onPress={() => setBuscandoPais((v) => !v)} style={st.cambiar} accessibilityRole="button" accessibilityLabel={t('boost.countrySearch')}>
                    <Ionicons name="search-outline" size={scale(16)} color={theme.colors.text} />
                    <Text style={[st.cambiarTexto, { color: theme.colors.text }]}>{t('boost.countrySearch')}</Text>
                  </TouchableOpacity>
                </View>
                {buscandoPais ? (
                  <View style={[st.buscador, { borderColor: theme.colors.border }]}>
                    <TextInput
                      value={busqueda}
                      onChangeText={setBusqueda}
                      placeholder={t('boost.countrySearch')}
                      placeholderTextColor={theme.colors.textSecondary}
                      style={[st.entrada, dir.texto, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                      accessibilityLabel={t('boost.countrySearch')}
                      autoCorrect={false}
                    />
                    <ScrollView style={st.paises} nestedScrollEnabled>
                      {filtrados.map((p) => (
                        <TouchableOpacity
                          key={p.code}
                          onPress={() => { setPais(p.code); setBuscandoPais(false); setBusqueda(''); }}
                          style={st.pais}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: pais === p.code }}
                        >
                          <Text style={[st.paisTexto, dir.texto, { color: theme.colors.text, fontWeight: pais === p.code ? FONT_WEIGHT.bold : FONT_WEIGHT.regular }]}>{p.nombre}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.countryNotApplicable')}</Text>
            )}
          </Tarjeta>

          <Tarjeta titulo={t('boost.stepDuration')} rol="radiogroup">
            <View style={st.pildoras}>
              {opciones.durations.map((d) => (
                <Pildora key={d} activa={dias === d} onPress={() => setDias(d)} texto={t('boost.days', { contador: d })} />
              ))}
            </View>
          </Tarjeta>

          <Tarjeta titulo={t('boost.stepBudget')} rol="radiogroup">
            <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.budgetHint')}</Text>
            <View style={st.pildoras}>
              {opciones.budgets.map((n) => (
                <Pildora key={n} activa={presupuesto === n} onPress={() => setPresupuesto(n)} texto={creditos(n)} />
              ))}
            </View>
            <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>
              {opciones.balance !== null ? t('boost.balance', { cantidad: formato.numero(opciones.balance) }) : t('boost.balanceUnknown')}
            </Text>
            {sinSaldo ? (
              <Aviso tono="error" texto={t('boost.notEnough')}>
                <TouchableOpacity onPress={() => navigation.navigate('CreditStore')} accessibilityRole="link" style={st.enlace}>
                  <Text style={[st.enlaceTexto, dir.texto]}>{t('boost.buyCredits')}</Text>
                </TouchableOpacity>
              </Aviso>
            ) : null}
          </Tarjeta>

          <Tarjeta titulo={t('boost.stepEstimate')}>
            <Text style={[st.etiquetaEstimacion, dir.texto]}>{t('boost.estimateLabel')}</Text>
            {estimacion === 'cargando' ? (
              <ActivityIndicator color={DORADO} accessibilityLabel={t('common.loading')} />
            ) : estimacion && estimacion.audience.cuentas !== null ? (
              <>
                <Text style={[st.estimacion, dir.texto, { color: theme.colors.text }]}>
                  {estimacion.audience.cuentas === 0
                    ? t('boost.estimateZero')
                    : estimacion.audience.tope
                      ? t('boost.estimateAudienceCapped', { cantidad: formato.numero(estimacion.audience.cuentas) })
                      : t('boost.estimateAudience', { contador: estimacion.audience.cuentas })}
                </Text>
                <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.dailyMax', { cantidad: formato.numero(estimacion.dailyCredits) })}</Text>
              </>
            ) : (
              <Text style={[st.estimacion, dir.texto, { color: theme.colors.text }]}>{t('boost.estimateNone')}</Text>
            )}
            <Text style={[st.nota, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.estimateExplain')}</Text>
          </Tarjeta>

          <Tarjeta titulo={t('boost.stepSummary')} rol="summary">
            <Fila clave={t('boost.stepObjective')} valor={t(objetivoElegido.clave)} />
            <Fila clave={t('boost.stepAudience')} valor={t(segmentoElegido.clave)} />
            {conPais ? <Fila clave={t('boost.stepCountry')} valor={pais ? nombreDeLaRegion(pais, locale) : t('boost.countryAny')} /> : null}
            {dias ? <Fila clave={t('boost.stepDuration')} valor={t('boost.days', { contador: dias })} /> : null}
            {presupuesto ? <Fila clave={t('boost.stepBudget')} valor={creditos(presupuesto)} fuerte /> : null}
          </Tarjeta>

          <Boton texto={t('boost.review')} icono="checkmark-circle-outline" onPress={() => setFase('confirm')} deshabilitado={!peticion} />
        </>
      ) : null}
    </MarcoDeBoost>
  );
};

const st = StyleSheet.create({
  cargando: { paddingVertical: scale(40), alignItems: 'center' },
  flex: { flex: 1, minWidth: 0 },
  subtitulo: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  pista: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: scale(17), fontStyle: 'italic' },
  regla: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  filaPost: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cambiar: { flexDirection: 'row', alignItems: 'center', gap: scale(4), minHeight: 40, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.full },
  cambiarTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, textDecorationLine: 'underline' },
  lista: { gap: SPACING.sm },
  itemPost: { borderWidth: 1.5, borderRadius: scale(14), padding: SPACING.sm },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
  buscador: { borderWidth: 1, borderRadius: scale(14), overflow: 'hidden' },
  entrada: { minHeight: 44, paddingHorizontal: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, fontSize: FONT_SIZE.sm },
  paises: { maxHeight: scale(240) },
  pais: { minHeight: 40, justifyContent: 'center', paddingHorizontal: SPACING.md },
  paisTexto: { fontSize: FONT_SIZE.sm },
  enlace: { marginTop: SPACING.xs, minHeight: 32, justifyContent: 'center' },
  enlaceTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#8A6408', textDecorationLine: 'underline' },
  etiquetaEstimacion: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: '#8A6408' },
  estimacion: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, lineHeight: scale(22) },
});

export default BoostScreen;
