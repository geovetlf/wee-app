import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useIdentidadActiva } from '../hooks/useEContact';
import { useMyWees } from '../hooks/useMyWees';
import { crearAcceso, idDeAcceso } from '../utils/myWees';
import { pagesService, WeePage, claveDelError } from '../services/pagesService';
import { usersService } from '../services/firestoreService';
import { notify } from '../utils/notify';
import PlantillaDePagina from '../components/pages/PlantillaDePagina';
import type { PresentadorDePagina } from '../components/pages/CabeceraDePagina';
import { PALETA_WEEPAGE as P, RADIO_WEEPAGE, interfazWeePage } from '../constants/estiloWeePage';
import { RellenoDeMarca } from '../components/GradienteDeMarca';
import { useDireccion } from '../hooks/useDireccion';

/*
 * UNA WEË PAGE, VISTA DESDE FUERA — la plantilla negra de museo (boceto aprobado por el dueño, 2026-11-23).
 *
 * Portada a sangre, la etiqueta del tipo («Libro · Novela»), el título en EB Garamond, «Presentada por <cara>» (que abre
 * su perfil), Seguir y Compartir; debajo, el índice y las secciones del tipo. Es SIEMPRE negra, con el Perfil Real y con
 * el Perfil Weë, como WeëAI. Se sigue con la cara ACTIVA (Perfil Real o Perfil Weë): seguir es de cada identidad y no
 * toca su agenda (ËContact o ẄContact). Quien gestiona la página —su cuenta, desde cualquiera de sus caras— ve además
 * «Editar página» e «Impulsar».
 *
 * NADA SE VENDE DENTRO DE WEË (dueño, 2026-11-23): las tiendas son enlaces externos que se abren con un toque.
 *
 * ESCENAS DE LA HISTORIA. Una página puede enseñar escenas hechas con Weë AI que cualquiera abre y ve a pantalla
 * completa. Se crean con el Filmmaker de WeëStudio (el composer de siempre, «Añadir escena»), no con otro creador.
 *
 * IMPULSAR. Su dueño ve «Impulsar»: consumirá Credits de la cuenta por el Credit Engine. Hoy solo lo explica; no cobra
 * nada ni inventa un precio (CLAUDE.md §7).
 */
const WeePageScreen: React.FC = () => {
  const t = useT();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { identidad } = useIdentidadActiva();
  const { alInicio } = useDireccion();
  const pageId = route.params?.pageId as string;
  const [pagina, setPagina] = useState<WeePage | null | undefined>(undefined);
  const [presentador, setPresentador] = useState<PresentadorDePagina | null>(null);
  const [sigue, setSigue] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [escena, setEscena] = useState<{ title: string; videoURL: string; posterURL: string } | null>(null);
  const desplazable = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    let vivo = true;
    void (async () => {
      const p = await pagesService.leer(pageId).catch(() => null);
      if (!vivo) return;
      setPagina(p);
      if (p && identidad) setSigue(await pagesService.laSigue(pageId, identidad).catch(() => false));
    })();
    return () => { vivo = false; };
  }, [pageId, identidad]));

  /* «Presentada por»: la cara se lee por su referencia pública; la página nunca guarda la cuenta. */
  const presenterRef = pagina?.presenterRef;
  useEffect(() => {
    let vivo = true;
    setPresentador(null);
    if (!presenterRef) return;
    void usersService.getByPublicRef(presenterRef).then((perfil) => {
      if (vivo && perfil) setPresentador({ nombre: perfil.displayName || perfil.username || '', foto: perfil.photoURLThumbnail || perfil.photoURL });
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, [presenterRef]);

  const esMia = !!pagina && pagina.ownerAccountId === user?.uid;
  /*
   * MYWEËS. Quien tiene sesión puede guardar un acceso directo a esta página en su MyWeës —la del perfil activo—, sea
   * suya o de otra persona. Solo se guarda su identificador, en el dispositivo: no se copia la página, no cambia nada
   * de ella ni de sus permisos, y el acceso la abrirá aquí mismo, como la abre cualquiera.
   */
  const myWees = useMyWees();
  const enMyWees = !!pagina && myWees.tiene(idDeAcceso('pagina', pagina.id));
  const alternarMyWees = () => {
    if (!pagina) return;
    if (enMyWees) return myWees.quitar(idDeAcceso('pagina', pagina.id));
    myWees.anadir(crearAcceso('pagina', pagina.id, pagina.name || pagina.handle, Date.now()));
  };

  const alternarSeguir = async () => {
    if (!pagina || !identidad) return;
    setOcupado(true);
    try {
      const ahora = await pagesService.seguir(pagina.id, identidad, !sigue);
      setSigue(ahora);
      setPagina({ ...pagina, followersCount: Math.max(0, pagina.followersCount + (ahora ? 1 : -1)) });
    } catch (error) {
      notify(t(claveDelError(error)));
    } finally {
      setOcupado(false);
    }
  };

  const compartir = () => {
    if (!pagina) return;
    const mensaje = `${pagina.name} (@${pagina.handle}) · Weë`;
    void Share.share(Platform.OS === 'ios' ? { message: mensaje } : { message: mensaje }).catch(() => {});
  };

  if (pagina === undefined) {
    return <SafeAreaView style={[s.pantalla, s.centro]}><ActivityIndicator color={P.tinta} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      {!pagina ? (
        <>
          <View style={s.barra}>
            <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={s.circulo}>
              <IconoDireccional name="arrow-back" size={22} color={P.tinta} />
            </TouchableOpacity>
          </View>
          <View style={[s.centro, { flex: 1 }]}><Text style={[interfazWeePage(15), { color: P.t2 }]}>{t('pages.err_generic')}</Text></View>
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView ref={desplazable} contentContainerStyle={s.dentro}>
            <PlantillaDePagina
              pagina={pagina}
              presentador={presentador}
              alPulsarPresentador={presenterRef ? () => navigation.navigate('UserProfile', { userId: presenterRef }) : undefined}
              alAbrirEscena={setEscena}
              alIrA={(y) => desplazable.current?.scrollTo({ y, animated: true })}
              extraEscenas={esMia && (
                <TouchableOpacity onPress={() => navigation.navigate('Production', {})} accessibilityRole="button" style={s.escenaNueva}>
                  <Ionicons name="add-circle-outline" size={28} color={P.tinta} />
                  <Text style={[interfazWeePage(14, '600'), { color: P.tinta, textAlign: 'center' }]}>{t('pages.addScene')}</Text>
                </TouchableOpacity>
              )}
              acciones={(
                <View style={s.acciones}>
                  {esMia ? (
                    <TouchableOpacity onPress={() => navigation.navigate('WeePages', { editPageId: pagina.id })} style={[s.boton, s.botonTinta]} accessibilityRole="button">
                      <Ionicons name="create-outline" size={17} color={P.n0} />
                      <Text style={[interfazWeePage(14, '600'), { color: P.n0 }]} numberOfLines={1}>{t('pages.edit')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => void alternarSeguir()} disabled={ocupado || !identidad} style={[s.boton, sigue && s.botonSuperficie]} accessibilityRole="button" accessibilityState={{ selected: sigue }}>
                      {!sigue && <RellenoDeMarca radio={RADIO_WEEPAGE.pastilla} />}
                      {ocupado ? <ActivityIndicator color={sigue ? P.tinta : P.sobreMarca} /> : (
                        <Text style={[interfazWeePage(14, '600'), { color: sigue ? P.tinta : P.sobreMarca }]} numberOfLines={1}>{t(sigue ? 'pages.following' : 'pages.follow')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {esMia && (
                    <TouchableOpacity onPress={() => navigation.navigate('Boost', { tipo: 'page', id: pagina.id })} style={s.boton} accessibilityRole="button">
                      <RellenoDeMarca radio={RADIO_WEEPAGE.pastilla} />
                      <Ionicons name="rocket-outline" size={17} color={P.sobreMarca} />
                      <Text style={[interfazWeePage(14, '600'), { color: P.sobreMarca }]} numberOfLines={1}>{t('pages.boost')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={compartir} style={[s.botonIcono, s.botonSuperficie]} accessibilityRole="button" accessibilityLabel={t('pages.share')}>
                    <Ionicons name="share-outline" size={19} color={P.tinta} />
                  </TouchableOpacity>
                </View>
              )}
              debajoDeAcciones={myWees.disponible && !myWees.cargando ? (
                <TouchableOpacity
                  onPress={alternarMyWees}
                  style={[s.myWees, enMyWees && { backgroundColor: P.n2 }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: enMyWees }}
                  aria-pressed={enMyWees}
                >
                  <Ionicons name={enMyWees ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={P.t2} />
                  {/* «MyWeës» es marca; puesta, basta su nombre con el visto. Sin poner, «MyWeës · Añadir». */}
                  <Text style={[interfazWeePage(13, '500'), { color: P.t2, flexShrink: 1 }]} numberOfLines={2}>{enMyWees ? t('menu.myWees') : `${t('menu.myWees')} · ${t('mywees.add')}`}</Text>
                </TouchableOpacity>
              ) : null}
            />
          </ScrollView>
          {/* Atrás, flotando sobre la portada como en el boceto. */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={[s.circulo, s.flotante, alInicio(16)]}
          >
            <IconoDireccional name="arrow-back" size={22} color={P.tinta} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={!!escena} animationType="fade" onRequestClose={() => setEscena(null)} supportedOrientations={['portrait', 'landscape']}>
        <View style={s.visor}>
          {!!escena && (
            <Video source={{ uri: escena.videoURL }} posterSource={{ uri: escena.posterURL }} usePoster style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} shouldPlay isLooping />
          )}
          <SafeAreaView style={s.visorArriba} edges={['top']}>
            <Text style={[interfazWeePage(15, '600'), s.visorTitulo]} numberOfLines={2}>{escena?.title ?? ''}</Text>
            <TouchableOpacity onPress={() => setEscena(null)} accessibilityRole="button" accessibilityLabel={t('common.close')} style={s.circulo}>
              <Ionicons name="close" size={24} color={P.tinta} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: P.n0 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  dentro: { paddingBottom: 120 },
  circulo: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(5,5,5,0.55)', alignItems: 'center', justifyContent: 'center' },
  flotante: { position: 'absolute', top: 12 },
  acciones: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  boton: { flexGrow: 1, flexBasis: 140, minHeight: 46, borderRadius: RADIO_WEEPAGE.pastilla, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  botonTinta: { backgroundColor: P.tinta },
  botonSuperficie: { backgroundColor: P.n2 },
  botonIcono: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  /* «Añadir a MyWeës»: discreto, debajo de las acciones, con sitio para el dedo. */
  myWees: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, maxWidth: '100%', paddingHorizontal: 14, marginHorizontal: 20, marginTop: 12, borderRadius: RADIO_WEEPAGE.pastilla },
  escenaNueva: { width: 170, height: 240, borderRadius: RADIO_WEEPAGE.control, borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.n4, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  visor: { flex: 1, backgroundColor: '#000000' },
  visorArriba: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  visorTitulo: { flex: 1, color: P.tinta, paddingVertical: 8 },
});

export default WeePageScreen;
