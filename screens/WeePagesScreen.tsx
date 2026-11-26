import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import {
  TIPOS_DE_PAGINA, GRUPOS_DE_PAGINA, SECCIONES_DE_PAGINA, COLORES_DE_OBRA, MAX_IMAGENES_DE_OBRA, MAX_ENLACES_DE_OBRA,
  tipoDePagina, seccionesPorDefecto, seccionesDeLaPagina, type TipoDePagina, type SeccionElegida,
} from '../constants/pageTypes';
import { pagesService, WeePage, BorradorDePagina, claveDelError } from '../services/pagesService';
import { notify } from '../utils/notify';
import { referenciaPublicaDe } from '../utils/identidadPublica';
import { normalizarEnlaceDeObra } from '../utils/enlaceDeObra';
import PlantillaDePagina from '../components/pages/PlantillaDePagina';
import type { PresentadorDePagina } from '../components/pages/CabeceraDePagina';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { ALTO_BARRA } from '../components/BarraInferior';
import { RellenoDeMarca } from '../components/GradienteDeMarca';
import { MARCA } from '../constants/marca';
import { PALETA_WEEPAGE as P, ETIQUETA_WEEPAGE, RADIO_WEEPAGE, interfazWeePage } from '../constants/estiloWeePage';
import { useFuenteDeObra } from '../hooks/useFuenteDeObra';

/*
 * WEË PAGES — crear y gestionar las páginas de la cuenta (boceto aprobado por el dueño, 2026-11-23).
 *
 * Crear va en CUATRO pasos, como el boceto:
 *   1. ¿Qué tipo de página es? — rejilla agrupada (Obras · Arte y oficio · Personajes y creadores · Negocios y marcas ·
 *      Otra), con icono y una línea. Pedido del dueño: «al crear tiene que salir qué tipo de página sería».
 *   2. Portada, título y archivos — portada (2:3 para un libro o un cómic), la línea de la obra, el texto de la obra,
 *      imágenes, enlaces a tiendas (solo https, nada se vende dentro de Weë) y la ficha del tipo. El PDF del libro está
 *      PREPARADO y apagado hasta que exista su subida (pendiente).
 *   3. Secciones — las del tipo, que se reordenan o se apagan, y el color de obra.
 *   4. ¿Quién la presenta? — el Perfil Real, uno de los alter egos o nadie; el @usuario; la casilla de derechos; publicar.
 * La vista previa es la página REAL (`PlantillaDePagina`), la misma pieza que verá el público: en escritorio va al lado,
 * en vivo; en el teléfono, con «Vista previa».
 *
 * Las fotos suben a la carpeta de la PÁGINA (`pages/<pageId>/`) tras `savePage({ prepare: true })`; guardar y publicar
 * pasan por `savePage`. Esta pantalla no escribe en Firestore. Una página es de la CUENTA: se ve igual desde cualquiera
 * de sus caras, y no es una tercera cara.
 *
 * SIEMPRE NEGRA, como la página que crea y como WeëAI, con el Perfil Real y con el Perfil Weë.
 */
const MARCA_PAGINAS = 'WeëPages';

const VACIA: BorradorDePagina = {
  type: 'book', name: '', handle: '', shortDescription: '', about: '', website: '', location: '', contact: '', logoURL: '', coverURL: '',
  details: {}, sections: seccionesPorDefecto('book'), links: [], gallery: [], workColor: 'amber', presenter: '',
};
type Paso = 'inicio' | 1 | 2 | 3 | 4 | 'vista';
type Ocupado = 'draft' | 'publish' | 'cover' | 'gallery' | null;

const WeePagesScreen: React.FC = () => {
  const { t, formato } = useIdioma();
  const obra = useFuenteDeObra();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { realProfile, alterEgos } = useUserProfile();
  const { width } = useWindowDimensions();
  const amplio = width >= 1024;
  const [paginas, setPaginas] = useState<WeePage[] | null>(null);
  const [otras, setOtras] = useState<WeePage[]>([]);
  const [paso, setPaso] = useState<Paso>('inicio');
  const [antesDeVista, setAntesDeVista] = useState<Paso>(4);
  const [borrador, setBorrador] = useState<BorradorDePagina>(VACIA);
  const [editando, setEditando] = useState<string | undefined>(undefined);
  const [masDetalles, setMasDetalles] = useState(false);
  const [derechos, setDerechos] = useState(false);
  const [enlaceMal, setEnlaceMal] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<Ocupado>(null);

  const cargar = useCallback(async () => {
    /* Sin sesión no hay páginas propias: lista vacía, no la rueda para siempre (W — App final, 2026-11-06). */
    if (!user) { setPaginas([]); return; }
    /* «Otras» = publicadas que no son de la cuenta. El documento público ya no dice de quién es: se excluyen las propias por id. */
    let propias: WeePage[] = [];
    try { propias = await pagesService.mias(user.uid); } catch { propias = []; }
    setPaginas(propias);
    const idsPropios = new Set(propias.map((p) => p.id));
    try { setOtras((await pagesService.publicadas()).filter((p) => !idsPropios.has(p.id) && p.ownerAccountId !== user.uid)); } catch { setOtras([]); }
  }, [user]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  /* Las caras que pueden presentarla: el Perfil Real y los alter egos de la cuenta. */
  const caras = useMemo(() => [
    ...(realProfile ? [{ uid: realProfile.uid, perfil: realProfile, real: true }] : []),
    ...alterEgos.filter((a) => a.uid).map((a) => ({ uid: a.uid, perfil: a, real: false })),
  ], [realProfile, alterEgos]);

  /* «Editar página» desde la gestión o desde la propia página: llega con su id. */
  useEffect(() => {
    const id = route.params?.editPageId as string | undefined;
    if (!id) return;
    let vivo = true;
    void pagesService.leer(id).then((p) => {
      if (!p || !vivo) return;
      const { id: _id, status: _s, ownerAccountId: _o, followersCount: _f, featured: _ft, scenes: _sc, updatedAtMs: _u, publishedAtMs: _pu, presenterRef, ...datos } = p;
      const cara = caras.find((c) => referenciaPublicaDe(c.perfil) === presenterRef || c.uid === presenterRef);
      setBorrador({ ...datos, sections: seccionesDeLaPagina(datos.type, datos.sections), presenter: cara?.uid ?? '' });
      setEditando(p.id);
      setDerechos(false);
      setPaso(2);
    });
    return () => { vivo = false; };
    // Las caras llegan antes que la edición; no se vuelve a leer si cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.editPageId]);

  const tipo = tipoDePagina(borrador.type);
  const seccionDeTexto = tipo.secciones.map((id) => SECCIONES_DE_PAGINA[id]).find((d) => d.fuente === 'texto');
  const poner = <K extends keyof BorradorDePagina>(campo: K, valor: BorradorDePagina[K]) => setBorrador((b) => ({ ...b, [campo]: valor }));
  const ponerDetalle = (campo: string, valor: string) => setBorrador((b) => ({ ...b, details: { ...b.details, [campo]: valor } }));
  const elegirTipo = (id: TipoDePagina) => setBorrador((b) => (b.type === id ? b : { ...b, type: id, details: {}, sections: seccionesPorDefecto(id) }));

  const empezar = () => {
    setBorrador(VACIA); setEditando(undefined); setDerechos(false); setMasDetalles(false); setEnlaceMal(null);
    navigation.setParams({ editPageId: undefined });
    setPaso(1);
  };

  const elegirImagen = async (cual: 'cover' | 'gallery') => {
    if (!user) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85,
      ...(cual === 'cover' ? { allowsEditing: true, aspect: tipo.portadaVertical ? [2, 3] as [number, number] : [4, 3] as [number, number] } : {}),
    });
    const uri = r.canceled ? null : r.assets?.[0]?.uri;
    if (!uri) return;
    setOcupado(cual);
    try {
      /*
       * A la carpeta de la PÁGINA, no a la de la cuenta (F1, 2026-11-23): la URL de la foto es pública y la de la
       * cuenta la delataba. El servidor prepara primero la propiedad (y da el id si la Página aún no existe).
       */
      const pageId = await pagesService.prepararFotos(editando);
      if (pageId !== editando) setEditando(pageId);
      const url = await pagesService.subirFoto(pageId, uri, cual);
      if (cual === 'cover') poner('coverURL', url);
      else setBorrador((b) => ({ ...b, gallery: [...b.gallery, url].slice(0, MAX_IMAGENES_DE_OBRA) }));
    } catch {
      notify(t('pages.err_generic'));
    } finally {
      setOcupado(null);
    }
  };

  const guardar = async (publicar: boolean) => {
    /* Los enlaces van ya completos (https://…); uno que no vale no se manda. */
    const links = borrador.links.map((e) => ({ label: e.label.trim(), url: normalizarEnlaceDeObra(e.url) ?? '' }));
    const mal = links.findIndex((e) => !e.url);
    if (mal >= 0) { setEnlaceMal(mal); setPaso(2); notify(t('pages.err_enlace')); return; }
    setOcupado(publicar ? 'publish' : 'draft');
    try {
      const r = await pagesService.guardar({ ...borrador, links }, { pageId: editando, publish: publicar });
      notify(t(publicar ? 'pages.pagePublished' : 'pages.draftSaved'));
      setBorrador(VACIA); setEditando(undefined); setPaso('inicio'); setMasDetalles(false); setDerechos(false);
      navigation.setParams({ editPageId: undefined });
      await cargar();
      if (publicar) navigation.navigate('WeePage', { pageId: r.pageId });
    } catch (error) {
      notify(t(claveDelError(error)));
    } finally {
      setOcupado(null);
    }
  };

  const atras = () => {
    if (paso === 'inicio') return navigation.goBack();
    if (paso === 'vista') return setPaso(antesDeVista);
    if (paso === 1 || (paso === 2 && editando)) return setPaso('inicio');
    setPaso((paso - 1) as Paso);
  };

  /* ── Piezas ─────────────────────────────────────────────────────────── */

  const campoDeTexto = (etiqueta: string, valor: string, alCambiar: (v: string) => void, opts: { largo?: boolean; opcional?: boolean; prefijo?: string; serif?: boolean; alSalir?: () => void; error?: string } = {}) => (
    <View style={s.campo} key={etiqueta}>
      <Text style={ETIQUETA_WEEPAGE}>{etiqueta}{opts.opcional ? ` · ${t('pages.optional')}` : ''}</Text>
      <View style={[s.entrada, !!opts.error && s.entradaMal]}>
        {!!opts.prefijo && <Text style={[interfazWeePage(15), { color: P.t3 }]}>{opts.prefijo}</Text>}
        <TextInput
          value={valor}
          onChangeText={alCambiar}
          onBlur={opts.alSalir}
          accessibilityLabel={etiqueta}
          multiline={opts.largo}
          autoCapitalize={opts.prefijo ? 'none' : 'sentences'}
          style={[opts.serif ? obra(18) : interfazWeePage(15), s.texto, opts.largo && s.textoLargo, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        />
      </View>
      {!!opts.error && <Text style={[interfazWeePage(12), { color: P.error }]}>{opts.error}</Text>}
    </View>
  );

  const boton = (texto: string, alPulsar: () => void, opts: { tipo?: 'tinta' | 'marca' | 'suave'; cargando?: boolean; desactivado?: boolean } = {}) => {
    const clase = opts.tipo ?? 'suave';
    const color = clase === 'tinta' ? P.n0 : clase === 'marca' ? P.sobreMarca : P.tinta;
    return (
      <TouchableOpacity
        onPress={alPulsar}
        disabled={opts.desactivado || !!ocupado}
        accessibilityRole="button"
        accessibilityLabel={texto}
        accessibilityState={{ disabled: !!opts.desactivado, busy: !!opts.cargando }}
        style={[s.boton, clase === 'tinta' && { backgroundColor: P.tinta }, clase === 'suave' && { backgroundColor: P.n2 }, opts.desactivado && { opacity: 0.4 }]}
        activeOpacity={0.85}
      >
        {clase === 'marca' && <RellenoDeMarca radio={RADIO_WEEPAGE.pastilla} apagada={opts.desactivado} />}
        {opts.cargando ? <ActivityIndicator color={color} /> : <Text style={[interfazWeePage(15, '600'), { color }]} numberOfLines={1}>{texto}</Text>}
      </TouchableOpacity>
    );
  };

  const titulo = (clave: string, pista?: string) => (
    <View style={s.cabeza}>
      <Text style={[obra(amplio ? 36 : 30), { color: P.tinta, lineHeight: Math.round((amplio ? 36 : 30) * 1.12) }]} accessibilityRole="header">{t(clave)}</Text>
      {!!pista && <Text style={[interfazWeePage(14), { color: P.t2 }]}>{t(pista)}</Text>}
    </View>
  );

  const presentadorElegido: PresentadorDePagina | null = useMemo(() => {
    const cara = caras.find((c) => c.uid === borrador.presenter);
    return cara ? { nombre: cara.perfil.displayName || '', foto: cara.perfil.photoURLThumbnail || cara.perfil.photoURL } : null;
  }, [caras, borrador.presenter]);
  const vistaPrevia = (
    <PlantillaDePagina pagina={{ ...borrador, followersCount: 0 }} presentador={presentadorElegido} />
  );

  /* ── Paso 1: ¿qué tipo de página es? ── */
  const paso1 = (
    <View style={s.bloque}>
      {titulo('pages.stepType', 'pages.stepTypeHint')}
      {GRUPOS_DE_PAGINA.map((g) => {
        const delGrupo = TIPOS_DE_PAGINA.filter((d) => d.grupo === g.id);
        return (
          <View key={g.id} style={s.grupo}>
            {!!g.clave && <Text style={ETIQUETA_WEEPAGE}>{t(g.clave)}</Text>}
            <View style={s.tipos} accessibilityRole="radiogroup">
              {delGrupo.map((d) => {
                const elegido = borrador.type === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => elegirTipo(d.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={t(d.claveTitulo)}
                    accessibilityHint={t(d.claveDescripcion)}
                    accessibilityState={{ checked: elegido }}
                    style={[s.tipo, { width: amplio ? '23.8%' : '48.5%', backgroundColor: elegido ? P.tinta : P.n2 }]}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={d.icono as any} size={20} color={elegido ? P.n0 : P.t2} />
                    <Text style={[obra(19), { color: elegido ? P.n0 : P.tinta, lineHeight: 23 }]}>{t(d.claveTitulo)}</Text>
                    <Text style={[interfazWeePage(12), { color: elegido ? P.sobreTintaSuave : P.t3 }]}>{t(d.claveDescripcion)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
      <View style={s.pie}>{boton(t('pages.next'), () => setPaso(2), { tipo: 'tinta' })}</View>
    </View>
  );

  /* ── Paso 2: portada, título y archivos ── */
  const paso2 = (
    <View style={s.bloque}>
      <View style={s.tipoElegido}>
        <Ionicons name={tipo.icono as any} size={16} color={P.t2} />
        <Text style={[interfazWeePage(13, '500'), { color: P.t2 }]}>{t(tipo.claveTitulo)}</Text>
      </View>
      {titulo('pages.stepFiles')}
      {campoDeTexto(t('pages.f_title'), borrador.name, (v) => poner('name', v), { serif: true })}

      <View style={s.portadaFila}>
        <TouchableOpacity
          onPress={() => void elegirImagen('cover')}
          accessibilityRole="button"
          accessibilityLabel={t('pages.f_cover')}
          style={[s.portada, tipo.portadaVertical ? s.portadaVertical : s.portadaApaisada]}
          activeOpacity={0.85}
        >
          {borrador.coverURL ? <Image source={{ uri: borrador.coverURL }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          {ocupado === 'cover' ? <ActivityIndicator color={P.tinta} /> : !borrador.coverURL && <Ionicons name="image-outline" size={24} color={P.t3} />}
        </TouchableOpacity>
        <View style={s.portadaTextos}>
          <Text style={[interfazWeePage(14, '600'), { color: P.tinta }]}>{t('pages.f_cover')}</Text>
          <Text style={[interfazWeePage(12), { color: P.t3 }]}>{t('pages.coverHint')}</Text>
          <TouchableOpacity onPress={() => void elegirImagen('cover')} accessibilityRole="button" style={s.chip}>
            <Text style={[interfazWeePage(13, '500'), { color: P.tinta }]}>{t('pages.pickImage')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {campoDeTexto(t('pages.f_short'), borrador.shortDescription, (v) => poner('shortDescription', v), { serif: true })}
      {!!seccionDeTexto && campoDeTexto(t(seccionDeTexto.clave), borrador.about, (v) => poner('about', v), { largo: true, serif: true })}

      {/* Imágenes de la obra */}
      <View style={s.campo}>
        <Text style={ETIQUETA_WEEPAGE}>{t('pages.f_gallery')}</Text>
        <Text style={[interfazWeePage(12), { color: P.t3 }]}>{t('pages.galleryHint', { max: formato.numero(MAX_IMAGENES_DE_OBRA) })}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galeria}>
          {borrador.gallery.map((u) => (
            <View key={u} style={s.miniatura}>
              <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <TouchableOpacity onPress={() => poner('gallery', borrador.gallery.filter((x) => x !== u))} accessibilityRole="button" accessibilityLabel={t('pages.removeImage')} style={s.quitar} hitSlop={6}>
                <Ionicons name="close" size={14} color={P.tinta} />
              </TouchableOpacity>
            </View>
          ))}
          {borrador.gallery.length < MAX_IMAGENES_DE_OBRA && (
            <TouchableOpacity onPress={() => void elegirImagen('gallery')} accessibilityRole="button" accessibilityLabel={t('pages.addImage')} style={[s.miniatura, s.miniaturaNueva]}>
              {ocupado === 'gallery' ? <ActivityIndicator color={P.tinta} /> : <Ionicons name="add" size={24} color={P.t2} />}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* El PDF del libro: preparado, todavía sin subida (pendiente). Nunca de pago. */}
      {(borrador.type === 'book' || borrador.type === 'comic') && (
        <View style={[s.tarjeta, { opacity: 0.75 }]}>
          <View style={s.filaPdf}>
            <View style={s.iconoPdf}><Ionicons name="document-text-outline" size={18} color={P.t2} /></View>
            <Text style={[interfazWeePage(14, '600'), { color: P.tinta, flex: 1 }]}>{t('pages.pdfTitle')}</Text>
            <Text style={[interfazWeePage(12, '500'), { color: P.t3 }]}>{t('pages.soon')}</Text>
          </View>
          <Text style={[interfazWeePage(12), { color: P.t3 }]}>{t('pages.pdfSoon')}</Text>
        </View>
      )}

      {/* Enlaces a tiendas externas: lo único que vende una página, y fuera de Weë. */}
      <View style={s.campo}>
        <Text style={ETIQUETA_WEEPAGE}>{t('pages.f_links')}</Text>
        <Text style={[interfazWeePage(12), { color: P.t3 }]}>{t('pages.linksHint')}</Text>
        {borrador.links.map((e, i) => (
          <View key={i} style={s.tarjeta}>
            <View style={s.filaEnlace}>
              <View style={{ flex: 1 }}>
                {campoDeTexto(t('pages.f_linkLabel'), e.label, (v) => poner('links', borrador.links.map((x, k) => (k === i ? { ...x, label: v } : x))))}
              </View>
              <TouchableOpacity onPress={() => { poner('links', borrador.links.filter((_, k) => k !== i)); setEnlaceMal(null); }} accessibilityRole="button" accessibilityLabel={t('pages.removeLink')} style={s.quitarEnlace} hitSlop={6}>
                <Ionicons name="trash-outline" size={18} color={P.t2} />
              </TouchableOpacity>
            </View>
            {campoDeTexto(t('pages.f_linkUrl'), e.url, (v) => { poner('links', borrador.links.map((x, k) => (k === i ? { ...x, url: v.trim() } : x))); if (enlaceMal === i) setEnlaceMal(null); }, {
              error: enlaceMal === i ? t('pages.err_enlace') : undefined,
              /* Un toque menos: «amazon.com/…» se completa a https:// al salir del campo. */
              alSalir: () => {
                if (!e.url) return;
                const listo = normalizarEnlaceDeObra(e.url);
                if (listo) poner('links', borrador.links.map((x, k) => (k === i ? { ...x, url: listo } : x)));
                else setEnlaceMal(i);
              },
            })}
          </View>
        ))}
        {borrador.links.length < MAX_ENLACES_DE_OBRA && (
          <TouchableOpacity onPress={() => poner('links', [...borrador.links, { label: '', url: '' }])} accessibilityRole="button" style={s.anadir}>
            <Ionicons name="add" size={18} color={P.t2} />
            <Text style={[interfazWeePage(14, '500'), { color: P.t2 }]}>{t('pages.addLink')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={() => setMasDetalles((v) => !v)} style={s.mas} accessibilityRole="button" accessibilityState={{ expanded: masDetalles }}>
        <Text style={[interfazWeePage(15, '600'), { color: P.tinta }]}>{t('pages.moreDetails')}</Text>
        <Ionicons name={masDetalles ? 'chevron-up' : 'chevron-down'} size={18} color={P.tinta} />
      </TouchableOpacity>
      {masDetalles && (
        <>
          {tipo.campos.map((c) => c.opciones ? (
            <View style={s.campo} key={c.id}>
              <Text style={ETIQUETA_WEEPAGE}>{t(c.clave)}</Text>
              <View style={s.opciones}>
                {c.opciones.map((o) => {
                  const activa = borrador.details[c.id] === o.id;
                  return (
                    <TouchableOpacity key={o.id} onPress={() => ponerDetalle(c.id, o.id)} accessibilityRole="radio" accessibilityLabel={t(o.clave)} accessibilityState={{ checked: activa }} style={[s.opcion, { backgroundColor: activa ? P.tinta : P.n2 }]}>
                      <Text style={[interfazWeePage(14, '600'), { color: activa ? P.n0 : P.tinta }]}>{t(o.clave)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : campoDeTexto(t(c.clave), borrador.details[c.id] ?? '', (v) => ponerDetalle(c.id, v), { largo: c.largo }))}
          {campoDeTexto(t('pages.f_website'), borrador.website, (v) => poner('website', v), { opcional: true })}
          {campoDeTexto(t('pages.f_location'), borrador.location, (v) => poner('location', v), { opcional: true })}
          {campoDeTexto(t('pages.f_contact'), borrador.contact, (v) => poner('contact', v), { opcional: true })}
        </>
      )}
      <View style={s.pie}>{boton(t('pages.next'), () => setPaso(3), { tipo: 'tinta', desactivado: !borrador.name.trim() })}</View>
    </View>
  );

  /* ── Paso 3: secciones y color de obra ── */
  const llena = (id: SeccionElegida['id']): boolean => {
    const f = SECCIONES_DE_PAGINA[id].fuente;
    if (f === 'texto') return !!borrador.about.trim();
    if (f === 'galeria') return borrador.gallery.length > 0;
    if (f === 'enlaces') return borrador.links.length > 0 || !!borrador.website.trim();
    if (f === 'ficha') return Object.values(borrador.details).some(Boolean) || !!borrador.location.trim();
    if (f === 'contacto') return !!borrador.contact.trim();
    if (f === 'muestra') return false;
    return true; // escenas y novedades se llenan solas
  };
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= borrador.sections.length) return;
    const lista = [...borrador.sections];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    poner('sections', lista);
  };
  const paso3 = (
    <View style={s.bloque}>
      {titulo('pages.stepSections', 'pages.stepSectionsHint')}
      <View style={s.campo}>
        <Text style={ETIQUETA_WEEPAGE}>{t('pages.workColor')}</Text>
        <View style={s.colores} accessibilityRole="radiogroup">
          {COLORES_DE_OBRA.map((c) => {
            const elegido = (borrador.workColor || 'amber') === c.id;
            return (
              <TouchableOpacity key={c.id} onPress={() => poner('workColor', c.id)} accessibilityRole="radio" accessibilityLabel={t(c.clave)} accessibilityState={{ checked: elegido }} style={[s.color, elegido && { borderColor: P.tinta }]}>
                <View style={[s.colorDentro, { backgroundColor: c.valor }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.fila}>
        <Ionicons name="lock-closed-outline" size={16} color={P.t3} />
        <View style={s.filaTextos}>
          <Text style={[interfazWeePage(14, '600'), { color: P.tinta }]}>{t('pages.fixedCover')}</Text>
          <Text style={[interfazWeePage(12), { color: P.t3 }]}>{t('pages.fixedCoverHint')}</Text>
        </View>
      </View>
      {borrador.sections.map((sec, i) => {
        const d = SECCIONES_DE_PAGINA[sec.id];
        const nombre = t(d.clave);
        const pista = d.fuente === 'muestra' ? t('pages.soon') : llena(sec.id) ? '' : t('pages.sectionEmpty');
        return (
          <View key={sec.id} style={s.fila}>
            <View style={s.flechas}>
              <TouchableOpacity onPress={() => mover(i, -1)} disabled={i === 0} accessibilityRole="button" accessibilityLabel={t('pages.moveUp', { seccion: nombre })} hitSlop={4} style={i === 0 && { opacity: 0.25 }}>
                <Ionicons name="chevron-up" size={18} color={P.t2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mover(i, 1)} disabled={i === borrador.sections.length - 1} accessibilityRole="button" accessibilityLabel={t('pages.moveDown', { seccion: nombre })} hitSlop={4} style={i === borrador.sections.length - 1 && { opacity: 0.25 }}>
                <Ionicons name="chevron-down" size={18} color={P.t2} />
              </TouchableOpacity>
            </View>
            <View style={s.filaTextos}>
              <Text style={[interfazWeePage(14, '600'), { color: sec.enabled ? P.tinta : P.t3 }]}>{nombre}</Text>
              {!!pista && <Text style={[interfazWeePage(12), { color: P.t3 }]}>{pista}</Text>}
            </View>
            <Switch
              value={sec.enabled}
              onValueChange={(v) => poner('sections', borrador.sections.map((x, k) => (k === i ? { ...x, enabled: v } : x)))}
              accessibilityLabel={nombre}
              trackColor={{ false: P.n4, true: P.tinta }}
              thumbColor={sec.enabled ? P.n0 : P.t2}
              {...(Platform.OS === 'web' ? ({ activeThumbColor: P.n0 } as any) : {})}
            />
          </View>
        );
      })}
      <View style={s.pie}>{boton(t('pages.next'), () => setPaso(4), { tipo: 'tinta' })}</View>
    </View>
  );

  /* ── Paso 4: quién la presenta, @usuario, derechos y publicar ── */
  const opcion = (clave: string, nombre: string, pista: string, foto: string | undefined, elegida: boolean, alElegir: () => void) => (
    <TouchableOpacity key={clave} onPress={alElegir} accessibilityRole="radio" accessibilityLabel={nombre} accessibilityHint={pista} accessibilityState={{ checked: elegida }} style={[s.fila, elegida && { backgroundColor: P.tinta }]} activeOpacity={0.85}>
      <View style={s.avatar}>
        {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={[obra(15), { color: P.t2 }]}>{nombre.trim().charAt(0).toLocaleUpperCase() || '—'}</Text>}
      </View>
      <View style={s.filaTextos}>
        <Text style={[interfazWeePage(14, '600'), { color: elegida ? P.n0 : P.tinta }]} numberOfLines={1}>{nombre}</Text>
        <Text style={[interfazWeePage(12), { color: elegida ? P.sobreTintaSuave : P.t3 }]} numberOfLines={2}>{pista}</Text>
      </View>
      <View style={[s.radio, elegida && { borderColor: P.n0, borderWidth: 6 }]} />
    </TouchableOpacity>
  );
  const listoParaPublicar = !!borrador.name.trim() && borrador.handle.length >= 3 && derechos;
  const paso4 = (
    <View style={s.bloque}>
      {titulo('pages.stepPresenter')}
      <View style={s.lista} accessibilityRole="radiogroup">
        {caras.map((c) => opcion(c.uid, c.real ? t('pages.presenterReal') : (c.perfil.displayName || ''), c.real ? t('pages.presenterRealHint') : t('pages.presenterAlter'),
          c.perfil.photoURLThumbnail || c.perfil.photoURL, borrador.presenter === c.uid, () => poner('presenter', c.uid)))}
        {opcion('nadie', t('pages.presenterNone'), t('pages.presenterNoneHint'), undefined, !borrador.presenter, () => poner('presenter', ''))}
      </View>
      <View style={s.privacidad}>
        <Ionicons name="lock-closed-outline" size={15} color={P.t3} style={{ marginTop: 2 }} />
        <Text style={[interfazWeePage(12), { color: P.t3, flex: 1 }]}>{t('pages.presenterPrivacy')}</Text>
      </View>
      {campoDeTexto(t('pages.f_handle'), borrador.handle, (v) => poner('handle', v.replace(/\s/g, '').toLocaleLowerCase('en-US')), { prefijo: '@' })}
      <TouchableOpacity onPress={() => setDerechos((v) => !v)} accessibilityRole="checkbox" accessibilityLabel={t('pages.rights')} accessibilityState={{ checked: derechos }} style={s.derechos} activeOpacity={0.8}>
        <View style={[s.casilla, derechos && { backgroundColor: P.tinta }]}>
          {derechos && <Ionicons name="checkmark" size={14} color={P.n0} />}
        </View>
        <Text style={[interfazWeePage(13), { color: P.t2, flex: 1 }]}>{t('pages.rights')}</Text>
      </TouchableOpacity>
      <View style={s.pieColumna}>
        {boton(t('pages.publish'), () => void guardar(true), { tipo: 'marca', cargando: ocupado === 'publish', desactivado: !listoParaPublicar })}
        {boton(t('pages.saveDraft'), () => void guardar(false), { cargando: ocupado === 'draft', desactivado: !borrador.name.trim() || borrador.handle.length < 3 })}
        {!amplio && boton(t('pages.preview'), () => { setAntesDeVista(4); setPaso('vista'); })}
      </View>
    </View>
  );

  /* ── Inicio: crear y las páginas de la cuenta ── */
  const fila = (p: WeePage, propia: boolean) => (
    <TouchableOpacity key={p.id} onPress={() => navigation.navigate('WeePage', { pageId: p.id })} accessibilityRole="button" style={s.fila} activeOpacity={0.85}>
      <View style={s.miniPortada}>
        {p.coverURL || p.logoURL ? <Image source={{ uri: p.coverURL || p.logoURL }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name={tipoDePagina(p.type).icono as any} size={20} color={P.t2} />}
      </View>
      <View style={s.filaTextos}>
        <Text style={[obra(18), { color: P.tinta }]} numberOfLines={1}>{p.name}</Text>
        <Text style={[interfazWeePage(12), { color: P.t3 }]} numberOfLines={1}>{[t(tipoDePagina(p.type).claveTitulo), t('pages.followers', { contador: p.followersCount })].join(' · ')}</Text>
      </View>
      {propia ? (
        <>
          <View style={[s.estado, { backgroundColor: p.status === 'published' ? MARCA.primario : P.n3 }]}>
            <Text style={[interfazWeePage(11, '600'), { color: p.status === 'published' ? P.sobreMarca : P.t2 }]}>{t(`pages.status_${p.status}`)}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.setParams({ editPageId: p.id })} accessibilityRole="button" accessibilityLabel={t('pages.edit')} hitSlop={8} style={s.editar}>
            <Ionicons name="create-outline" size={19} color={P.tinta} />
          </TouchableOpacity>
        </>
      ) : <IconoDireccional name="chevron-forward" size={18} color={P.t3} />}
    </TouchableOpacity>
  );
  const inicio = (
    <View style={s.bloque}>
      <View style={s.cabeza}>
        <Text style={[obra(amplio ? 44 : 34), { color: P.tinta, lineHeight: Math.round((amplio ? 44 : 34) * 1.1) }]} accessibilityRole="header">{t('pages.subtitle')}</Text>
        <Text style={[interfazWeePage(14), { color: P.t2 }]}>{t('pages.explainer')}</Text>
      </View>
      {boton(t('pages.create'), empezar, { tipo: 'marca' })}
      <Text style={[ETIQUETA_WEEPAGE, { marginTop: 12 }]}>{t('pages.myPages')}</Text>
      {paginas === null ? <ActivityIndicator color={P.tinta} /> : paginas.length === 0 ? (
        <Text style={[interfazWeePage(14), { color: P.t3 }]}>{t('pages.emptyTitle')}</Text>
      ) : <View style={s.lista}>{paginas.map((p) => fila(p, true))}</View>}
      <Text style={[interfazWeePage(12), { color: P.t3 }]}>{t('pages.ownedBy')}</Text>
      {otras.length > 0 && (
        <>
          <Text style={[ETIQUETA_WEEPAGE, { marginTop: 12 }]}>{t('pages.discover')}</Text>
          <View style={s.lista}>{otras.map((p) => fila(p, false))}</View>
        </>
      )}
    </View>
  );

  const numero = typeof paso === 'number' ? paso : null;
  const formulario = paso === 'inicio' ? inicio : paso === 1 ? paso1 : paso === 2 ? paso2 : paso === 3 ? paso3 : paso === 4 ? paso4 : null;
  const conVistaAlLado = amplio && numero !== null && numero >= 2;

  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      <View style={s.barra}>
        <TouchableOpacity onPress={atras} accessibilityRole="button" accessibilityLabel={t('common.back')} style={s.atras}>
          <IconoDireccional name="arrow-back" size={22} color={P.tinta} />
        </TouchableOpacity>
        <Text style={[interfazWeePage(13, numero ? '400' : '600'), s.barraTitulo, { color: numero ? P.t2 : P.tinta }]} numberOfLines={1}>
          {numero ? t('pages.stepOf', { paso: numero, total: 4 }) : paso === 'vista' ? t('pages.preview') : MARCA_PAGINAS}
        </Text>
        {numero !== null && numero >= 2 && !amplio ? (
          <TouchableOpacity onPress={() => { setAntesDeVista(paso); setPaso('vista'); }} accessibilityRole="button" accessibilityLabel={t('pages.preview')} style={s.atras}>
            <Ionicons name="eye-outline" size={21} color={P.t2} />
          </TouchableOpacity>
        ) : <View style={s.atras} />}
      </View>
      {numero !== null && <View style={s.progreso}><View style={[s.progresoRelleno, { width: `${numero * 25}%` }]} /></View>}

      {paso === 'vista' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>{vistaPrevia}</ScrollView>
      ) : (
        /* Con el teclado abierto, lo que se escribe no queda debajo de él. */
        <EspacioDeEscritura style={s.pantalla} descuento={ALTO_BARRA}>
          <View style={[s.cuerpo, conVistaAlLado && s.cuerpoAncho]}>
            <ScrollView style={conVistaAlLado ? s.columnaFormulario : undefined} contentContainerStyle={[s.dentro, !conVistaAlLado && { maxWidth: paso === 1 && amplio ? 1100 : 640 }]} keyboardShouldPersistTaps="handled">
              {formulario}
            </ScrollView>
            {conVistaAlLado && (
              <ScrollView style={s.columnaVista} contentContainerStyle={s.vistaDentro}>
                <View style={s.marcoVista}>{vistaPrevia}</View>
              </ScrollView>
            )}
          </View>
        </EspacioDeEscritura>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: P.n0 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 52 },
  atras: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barraTitulo: { flex: 1, textAlign: 'center' },
  progreso: { height: 2, marginHorizontal: 20, backgroundColor: P.n3, borderRadius: 2, overflow: 'hidden' },
  progresoRelleno: { height: 2, backgroundColor: P.tinta },
  cuerpo: { flex: 1 },
  cuerpoAncho: { flexDirection: 'row' },
  columnaFormulario: { width: 520, flexGrow: 0, flexShrink: 0, borderEndWidth: StyleSheet.hairlineWidth, borderEndColor: P.linea },
  columnaVista: { flex: 1, backgroundColor: P.n1 },
  vistaDentro: { padding: 32 },
  marcoVista: { borderRadius: RADIO_WEEPAGE.tarjeta, overflow: 'hidden', backgroundColor: P.n0 },
  dentro: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 140, width: '100%', alignSelf: 'center' },
  bloque: { gap: 18 },
  cabeza: { gap: 8 },
  grupo: { gap: 10, marginTop: 6 },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tipo: { borderRadius: RADIO_WEEPAGE.tarjeta, padding: 14, gap: 6, minHeight: 118 },
  tipoElegido: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pie: { marginTop: 8 },
  pieColumna: { gap: 10, marginTop: 8 },
  boton: { minHeight: 50, borderRadius: RADIO_WEEPAGE.pastilla, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  campo: { gap: 8 },
  entrada: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: RADIO_WEEPAGE.control, backgroundColor: P.n2, paddingHorizontal: 14 },
  entradaMal: { borderWidth: 1, borderColor: P.error },
  texto: { flex: 1, color: P.tinta, paddingVertical: 12 },
  textoLargo: { minHeight: 120, textAlignVertical: 'top' },
  portadaFila: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  portada: { borderRadius: 6, backgroundColor: P.n2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  portadaVertical: { width: 104, height: 156 },
  portadaApaisada: { width: 160, height: 120 },
  portadaTextos: { flex: 1, gap: 6 },
  chip: { alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 14, borderRadius: RADIO_WEEPAGE.pastilla, backgroundColor: P.n3, justifyContent: 'center' },
  galeria: { gap: 8, paddingVertical: 4 },
  miniatura: { width: 84, height: 112, borderRadius: 8, overflow: 'hidden', backgroundColor: P.n2 },
  miniaturaNueva: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.n4 },
  quitar: { position: 'absolute', top: 6, end: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(5,5,5,0.7)', alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: RADIO_WEEPAGE.tarjeta, backgroundColor: P.n1, padding: 14, gap: 10 },
  filaPdf: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconoPdf: { width: 34, height: 42, borderRadius: 6, backgroundColor: P.n3, alignItems: 'center', justifyContent: 'center' },
  filaEnlace: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  quitarEnlace: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  anadir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: RADIO_WEEPAGE.tarjeta, borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.n4 },
  mas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  opciones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  opcion: { borderRadius: RADIO_WEEPAGE.pastilla, paddingHorizontal: 16, minHeight: 40, justifyContent: 'center' },
  colores: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  color: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  colorDentro: { width: 28, height: 28, borderRadius: 14 },
  lista: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderRadius: RADIO_WEEPAGE.tarjeta, backgroundColor: P.n2, paddingHorizontal: 14, paddingVertical: 10 },
  filaTextos: { flex: 1, minWidth: 0, gap: 2 },
  flechas: { gap: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: P.n3 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: P.t3 },
  privacidad: { flexDirection: 'row', gap: 8 },
  derechos: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  casilla: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: P.t3, alignItems: 'center', justifyContent: 'center' },
  miniPortada: { width: 44, height: 56, borderRadius: 6, overflow: 'hidden', backgroundColor: P.n3, alignItems: 'center', justifyContent: 'center' },
  estado: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIO_WEEPAGE.pastilla },
  editar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

export default WeePagesScreen;
