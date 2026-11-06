import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { TIPOS_DE_PAGINA, TipoDePagina, tipoDePagina } from '../constants/pageTypes';
import { pagesService, WeePage, BorradorDePagina, claveDelError } from '../services/pagesService';
import { uploadCreatorImage } from '../services/creatorUploads';
import { notify } from '../utils/notify';
import CabeceraDePagina from '../components/pages/CabeceraDePagina';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { ALTO_BARRA } from '../components/BarraInferior';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { useDireccion } from '../hooks/useDireccion';

/*
 * WEËPAGES — crear y gestionar las Páginas de la cuenta.
 *
 * Lo primero que se ve es el composer («¿Qué tipo de página quieres crear?»); debajo, las Páginas que ya gestiona la
 * cuenta. Crear va en tres pasos —tipo, datos, vista previa— y los datos se abren poco a poco: lo común arriba y lo
 * propio del tipo en «Más detalles». Guardar y publicar pasan por `savePage`; esta pantalla no escribe en Firestore.
 *
 * Una Página es de la CUENTA: se ve igual desde el Perfil Real y desde el Perfil Weë, y no es una tercera cara.
 */
const MARCA = 'WeëPages';
/*
 * EL TIPO ELEGIDO, EN MORADO ELÉCTRICO SOBRE BLANCO (decisión del dueño, 2026-11-05). Solo el filete, el icono y la
 * marca de elegido van en morado; la tarjeta sigue blanca. Es de esta pantalla: no es un token global.
 */
const MORADO_ELECTRICO = '#7200FF';

const VACIA: BorradorDePagina = { type: 'character', name: '', handle: '', shortDescription: '', about: '', website: '', location: '', contact: '', logoURL: '', coverURL: '', details: {} };
type Paso = 'tipo' | 'datos' | 'vista';

const WeePagesScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { alFinal } = useDireccion();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [paginas, setPaginas] = useState<WeePage[] | null>(null);
  const [otras, setOtras] = useState<WeePage[]>([]);
  const [paso, setPaso] = useState<Paso>('tipo');
  const [borrador, setBorrador] = useState<BorradorDePagina>(VACIA);
  const [editando, setEditando] = useState<string | undefined>(undefined);
  const [masDetalles, setMasDetalles] = useState(false);
  const [ocupado, setOcupado] = useState<'draft' | 'publish' | 'logo' | 'cover' | null>(null);

  const cargar = useCallback(async () => {
    /* Sin sesión no hay páginas propias: lista vacía, no la rueda para siempre (W — App final, 2026-11-06). */
    if (!user) { setPaginas([]); return; }
    try { setPaginas(await pagesService.mias(user.uid)); } catch { setPaginas([]); }
    try { setOtras((await pagesService.publicadas()).filter((p) => p.ownerAccountId !== user.uid)); } catch { setOtras([]); }
  }, [user]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  /* «Editar página» desde la gestión o desde la propia página: llega con su id. */
  useEffect(() => {
    const id = route.params?.editPageId as string | undefined;
    if (!id) return;
    let vivo = true;
    void pagesService.leer(id).then((p) => {
      if (!p || !vivo) return;
      const { id: _id, status: _s, ownerAccountId: _o, followersCount: _f, featured: _ft, scenes: _sc, updatedAtMs: _u, ...datos } = p;
      setBorrador(datos);
      setEditando(p.id);
      setPaso('datos');
    });
    return () => { vivo = false; };
  }, [route.params?.editPageId]);

  const tipo = tipoDePagina(borrador.type);
  const pantallaBaja = useWindowDimensions().height < 760;
  const poner = (campo: keyof BorradorDePagina, valor: string) => setBorrador((b) => ({ ...b, [campo]: valor }));
  const ponerDetalle = (campo: string, valor: string) => setBorrador((b) => ({ ...b, details: { ...b.details, [campo]: valor } }));

  const elegirImagen = async (cual: 'logo' | 'cover') => {
    if (!user) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: cual === 'logo' ? [1, 1] : [16, 9] });
    const uri = r.canceled ? null : r.assets?.[0]?.uri;
    if (!uri) return;
    setOcupado(cual);
    try {
      const url = await uploadCreatorImage(user.uid, uri);
      poner(cual === 'logo' ? 'logoURL' : 'coverURL', url);
    } catch {
      notify(t('pages.err_generic'));
    } finally {
      setOcupado(null);
    }
  };

  const guardar = async (publicar: boolean) => {
    setOcupado(publicar ? 'publish' : 'draft');
    try {
      const r = await pagesService.guardar(borrador, { pageId: editando, publish: publicar });
      notify(t(publicar ? 'pages.pagePublished' : 'pages.draftSaved'));
      setBorrador(VACIA); setEditando(undefined); setPaso('tipo'); setMasDetalles(false);
      await cargar();
      if (publicar) navigation.navigate('WeePage', { pageId: r.pageId });
    } catch (error) {
      notify(t(claveDelError(error)));
    } finally {
      setOcupado(null);
    }
  };

  const campoDeTexto = (etiqueta: string, valor: string, alCambiar: (v: string) => void, opts: { largo?: boolean; opcional?: boolean; prefijo?: string } = {}) => (
    <View style={s.campo} key={etiqueta}>
      <Text style={[s.etiqueta, { color: theme.colors.textSecondary }]}>
        {etiqueta}{opts.opcional ? ` · ${t('pages.optional')}` : ''}
      </Text>
      <View style={[s.entrada, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
        {!!opts.prefijo && <Text style={[s.prefijo, { color: theme.colors.textSecondary }]}>{opts.prefijo}</Text>}
        <TextInput
          value={valor}
          onChangeText={alCambiar}
          accessibilityLabel={etiqueta}
          multiline={opts.largo}
          autoCapitalize={opts.prefijo ? 'none' : 'sentences'}
          style={[s.texto, { color: theme.colors.text }, opts.largo && s.textoLargo, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        />
      </View>
    </View>
  );

  const selectorDeImagen = (cual: 'logo' | 'cover') => {
    const url = cual === 'logo' ? borrador.logoURL : borrador.coverURL;
    return (
      <TouchableOpacity
        onPress={() => void elegirImagen(cual)}
        accessibilityRole="button"
        accessibilityLabel={t(cual === 'logo' ? 'pages.f_logo' : 'pages.f_cover')}
        style={[cual === 'logo' ? s.logoPick : s.coverPick, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        activeOpacity={0.85}
      >
        {url ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        {ocupado === cual ? <ActivityIndicator color={theme.colors.text} /> : !url && (
          <View style={s.pickDentro}>
            <Ionicons name={cual === 'logo' ? 'person-circle-outline' : 'image-outline'} size={scale(22)} color={theme.colors.textSecondary} />
            {cual === 'cover' && <Text style={[s.pickTexto, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('pages.f_cover')}</Text>}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const boton = (texto: string, alPulsar: () => void, opts: { principal?: boolean; cargando?: boolean; desactivado?: boolean } = {}) => (
    <TouchableOpacity
      onPress={alPulsar}
      disabled={opts.desactivado || !!ocupado}
      accessibilityRole="button"
      style={[s.boton, opts.principal ? { backgroundColor: theme.colors.text } : { borderColor: theme.colors.text, borderWidth: 1 }, (opts.desactivado) && { opacity: 0.4 }]}
      activeOpacity={0.85}
    >
      {opts.cargando ? <ActivityIndicator color={opts.principal ? theme.colors.background : theme.colors.text} /> : (
        <Text style={[s.botonTexto, { color: opts.principal ? theme.colors.background : theme.colors.text }]}>{texto}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[s.barra, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => (paso === 'tipo' ? navigation.goBack() : setPaso(paso === 'vista' ? 'datos' : 'tipo'))} accessibilityLabel={t('common.back')} style={s.atras}>
          <IconoDireccional name="arrow-back" size={scale(23)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.barraTitulo, { color: theme.colors.text }]}>{MARCA}</Text>
      </View>

      {/* Con el teclado abierto, lo que se escribe no queda debajo de él. */}
      <EspacioDeEscritura style={s.pantalla} descuento={ALTO_BARRA}>
      <ScrollView contentContainerStyle={s.dentro} keyboardShouldPersistTaps="handled">
        {paso === 'tipo' && (
          <>
            <View style={s.cabecera}>
              <Text style={[s.titulo, { color: theme.colors.text }]}>{t('pages.subtitle')}</Text>
              {!pantallaBaja && <Text style={[s.explica, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t('pages.explainer')}</Text>}
            </View>

            <View style={[s.composer, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
              <View style={s.composerCabeza}>
                <Ionicons name="add-circle" size={scale(22)} color={theme.colors.accent} />
                <Text style={[s.composerTitulo, { color: theme.colors.text }]}>{t('pages.create')}</Text>
              </View>
              <Text style={[s.pregunta, { color: theme.colors.text }]}>{t('pages.stepType')}</Text>
              <View style={s.tipos}>
                {TIPOS_DE_PAGINA.map((d) => {
                  const elegido = borrador.type === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => setBorrador((b) => ({ ...b, type: d.id as TipoDePagina, details: {} }))}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: elegido }}
                      accessibilityLabel={t(d.claveTitulo)}
                      style={[s.tipo, { borderColor: elegido ? MORADO_ELECTRICO : theme.colors.border, borderWidth: elegido ? 2 : 1, backgroundColor: theme.colors.background }]}
                      activeOpacity={0.85}
                    >
                      <View style={[s.tipoIcono, { backgroundColor: elegido ? theme.colors.background : theme.colors.surface }, elegido && { borderWidth: 1, borderColor: `${MORADO_ELECTRICO}33` }]}>
                        <Ionicons name={d.icono as any} size={scale(17)} color={elegido ? MORADO_ELECTRICO : theme.colors.textSecondary} />
                      </View>
                      <Text style={[s.tipoTitulo, { color: theme.colors.text }]} numberOfLines={1}>{t(d.claveTitulo)}</Text>
                      <Text style={[s.tipoDesc, { color: theme.colors.textSecondary }]} numberOfLines={pantallaBaja ? 2 : 3}>{t(d.claveDescripcion)}</Text>
                      {elegido && <Ionicons name="checkmark-circle" size={scale(18)} color={MORADO_ELECTRICO} style={[s.check, alFinal(SPACING.sm)]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {boton(t('pages.next'), () => setPaso('datos'), { principal: true })}
            </View>

            <Text style={[s.seccion, { color: theme.colors.text }]}>{t('pages.myPages')}</Text>
            {paginas === null ? <ActivityIndicator color={theme.colors.accent} /> : paginas.length === 0 ? (
              <Text style={[s.explica, { color: theme.colors.textSecondary }]}>{t('pages.emptyTitle')}</Text>
            ) : paginas.map((p) => (
              <View key={p.id} style={[s.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <View style={s.filaArriba}>
                  <View style={[s.filaLogo, { backgroundColor: theme.colors.surface }]}>
                    {p.logoURL ? <Image source={{ uri: p.logoURL }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name={tipoDePagina(p.type).icono as any} size={scale(20)} color={theme.colors.text} />}
                  </View>
                  <View style={s.filaTextos}>
                    <Text style={[s.filaNombre, { color: theme.colors.text }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[s.filaMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {[t(tipoDePagina(p.type).claveTitulo), t('pages.followers', { contador: p.followersCount })].join(' · ')}
                    </Text>
                  </View>
                  <View style={[s.estado, { backgroundColor: p.status === 'published' ? theme.colors.accent : theme.colors.surface }]}>
                    <Text style={[s.estadoTexto, { color: p.status === 'published' ? '#1F2937' : theme.colors.textSecondary }]}>{t(`pages.status_${p.status}`)}</Text>
                  </View>
                </View>
                <View style={s.acciones}>
                  {([
                    ['eye-outline', 'pages.view', () => navigation.navigate('WeePage', { pageId: p.id })],
                    ['create-outline', 'pages.edit', () => navigation.setParams({ editPageId: p.id })],
                    ['albums-outline', 'pages.manage', () => navigation.navigate('WeePage', { pageId: p.id })],
                    ['settings-outline', 'pages.settings', () => navigation.setParams({ editPageId: p.id })],
                  ] as const).map(([icono, clave, alPulsar]) => (
                    <TouchableOpacity key={clave} onPress={alPulsar} style={s.accion} accessibilityRole="button" accessibilityLabel={t(clave)}>
                      <Ionicons name={icono} size={scale(18)} color={theme.colors.text} />
                      <Text style={[s.accionTexto, { color: theme.colors.text }]} numberOfLines={1}>{t(clave)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <Text style={[s.nota, { color: theme.colors.textSecondary }]}>{t('pages.ownedBy')}</Text>

            {otras.length > 0 && (
              <>
                <Text style={[s.seccion, { color: theme.colors.text }]}>{t('pages.discover')}</Text>
                {otras.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => navigation.navigate('WeePage', { pageId: p.id })} accessibilityRole="button" accessibilityLabel={p.name} style={[s.fila, s.filaArriba, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                    <View style={[s.filaLogo, { backgroundColor: theme.colors.surface }]}>
                      {p.logoURL ? <Image source={{ uri: p.logoURL }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name={tipoDePagina(p.type).icono as any} size={scale(20)} color={theme.colors.text} />}
                    </View>
                    <View style={s.filaTextos}>
                      <Text style={[s.filaNombre, { color: theme.colors.text }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[s.filaMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{[t(tipoDePagina(p.type).claveTitulo), t('pages.followers', { contador: p.followersCount })].join(' · ')}</Text>
                    </View>
                    <IconoDireccional name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

        {paso === 'datos' && (
          <View style={s.formulario}>
            <View style={s.tipoElegido}>
              <Ionicons name={tipo.icono as any} size={scale(18)} color={theme.colors.text} />
              <Text style={[s.tipoTitulo, { color: theme.colors.text }]}>{t(tipo.claveTitulo)}</Text>
            </View>
            <Text style={[s.pregunta, { color: theme.colors.text }]}>{t('pages.stepDetails')}</Text>
            <View style={s.imagenes}>
              {selectorDeImagen('cover')}
              {selectorDeImagen('logo')}
            </View>
            {campoDeTexto(t('pages.f_name'), borrador.name, (v) => poner('name', v))}
            {campoDeTexto(t('pages.f_handle'), borrador.handle, (v) => poner('handle', v.replace(/\s/g, '').toLocaleLowerCase('en-US')), { prefijo: '@' })}
            {campoDeTexto(t('pages.f_short'), borrador.shortDescription, (v) => poner('shortDescription', v))}

            <TouchableOpacity onPress={() => setMasDetalles((v) => !v)} style={s.mas} accessibilityRole="button" accessibilityState={{ expanded: masDetalles }}>
              <Text style={[s.masTexto, { color: theme.colors.text }]}>{t('pages.moreDetails')}</Text>
              <Ionicons name={masDetalles ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.text} />
            </TouchableOpacity>
            {masDetalles && (
              <>
                {tipo.campos.map((c) => c.opciones ? (
                  <View style={s.campo} key={c.id}>
                    <Text style={[s.etiqueta, { color: theme.colors.textSecondary }]}>{t(c.clave)}</Text>
                    <View style={s.opciones}>
                      {c.opciones.map((o) => {
                        const activa = borrador.details[c.id] === o.id;
                        return (
                          <TouchableOpacity key={o.id} onPress={() => ponerDetalle(c.id, o.id)} accessibilityRole="radio" accessibilityState={{ selected: activa }} style={[s.opcion, { borderColor: activa ? theme.colors.text : theme.colors.border, backgroundColor: activa ? theme.colors.text : 'transparent' }]}>
                            <Text style={{ color: activa ? theme.colors.background : theme.colors.text, fontWeight: FONT_WEIGHT.semibold }}>{t(o.clave)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : campoDeTexto(t(c.clave), borrador.details[c.id] ?? '', (v) => ponerDetalle(c.id, v), { largo: c.largo }))}
                {campoDeTexto(t('pages.f_about'), borrador.about, (v) => poner('about', v), { largo: true, opcional: true })}
                {campoDeTexto(t('pages.f_website'), borrador.website, (v) => poner('website', v), { opcional: true })}
                {campoDeTexto(t('pages.f_location'), borrador.location, (v) => poner('location', v), { opcional: true })}
                {campoDeTexto(t('pages.f_contact'), borrador.contact, (v) => poner('contact', v), { opcional: true })}
              </>
            )}
            <View style={s.pie}>
              {boton(t('common.back'), () => setPaso('tipo'))}
              {boton(t('pages.preview'), () => setPaso('vista'), { principal: true, desactivado: !borrador.name.trim() || borrador.handle.length < 3 })}
            </View>
          </View>
        )}

        {paso === 'vista' && (
          <View style={s.formulario}>
            <Text style={[s.pregunta, { color: theme.colors.text }]}>{t('pages.preview')}</Text>
            <View style={[s.vista, { borderColor: theme.colors.border }]}>
              <CabeceraDePagina pagina={{ ...borrador, followersCount: 0 }} />
            </View>
            <View style={s.pie}>
              {boton(t('common.back'), () => setPaso('datos'))}
              {boton(t('pages.saveDraft'), () => void guardar(false), { cargando: ocupado === 'draft' })}
            </View>
            {boton(t('pages.publish'), () => void guardar(true), { principal: true, cargando: ocupado === 'publish' })}
          </View>
        )}
      </ScrollView>
      </EspacioDeEscritura>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  atras: { padding: SPACING.xs },
  barraTitulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  dentro: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm, paddingBottom: scale(120), width: '100%', maxWidth: 760, alignSelf: 'center' },
  cabecera: { gap: 2 },
  titulo: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  explica: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  composer: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  composerCabeza: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  composerTitulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  pregunta: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: scale(8) },
  tipo: { width: '48.5%', borderRadius: BORDER_RADIUS.md, paddingHorizontal: scale(10), paddingVertical: scale(9), gap: 3, minHeight: scale(88) },
  tipoIcono: { width: scale(30), height: scale(30), borderRadius: scale(15), alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  tipoTitulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  tipoDesc: { fontSize: FONT_SIZE.xs, lineHeight: scale(15) },
  check: { position: 'absolute', top: SPACING.sm },
  boton: { minHeight: scale(46), borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, flexGrow: 1 },
  botonTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm },
  fila: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, gap: SPACING.sm },
  filaArriba: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  filaLogo: { width: scale(48), height: scale(48), borderRadius: scale(24), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  filaTextos: { flex: 1 },
  filaNombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  filaMeta: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  estado: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  estadoTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  acciones: { flexDirection: 'row', justifyContent: 'space-between' },
  accion: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: SPACING.xs },
  accionTexto: { fontSize: scale(10.5) },
  nota: { fontSize: FONT_SIZE.xs, textAlign: 'center', marginTop: SPACING.sm },
  formulario: { gap: SPACING.md },
  tipoElegido: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  imagenes: { height: scale(150) },
  coverPick: { ...StyleSheet.absoluteFillObject, bottom: scale(30), borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoPick: { position: 'absolute', left: SPACING.md, bottom: 0, width: scale(72), height: scale(72), borderRadius: scale(36), borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pickDentro: { alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  pickTexto: { fontSize: scale(10), textAlign: 'center' },
  campo: { gap: 6 },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  entrada: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm },
  prefijo: { fontSize: FONT_SIZE.base, marginRight: 2 },
  texto: { flex: 1, fontSize: FONT_SIZE.base, paddingVertical: SPACING.sm },
  textoLargo: { minHeight: scale(84), textAlignVertical: 'top' },
  mas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  masTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  opciones: { flexDirection: 'row', gap: SPACING.sm },
  opcion: { borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  pie: { flexDirection: 'row', gap: SPACING.sm },
  vista: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
});

export default WeePagesScreen;
