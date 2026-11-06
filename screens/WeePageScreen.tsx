import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useIdentidadActiva } from '../hooks/useEContact';
import { tipoDePagina } from '../constants/pageTypes';
import { pagesService, WeePage, claveDelError } from '../services/pagesService';
import { notify } from '../utils/notify';
import CabeceraDePagina from '../components/pages/CabeceraDePagina';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { MARCA } from '../constants/marca';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

/*
 * UNA PÁGINA, VISTA DESDE FUERA (WeëPages).
 *
 * Portada, logo, nombre, tipo, Seguir y Compartir; debajo, la información, lo destacado y el muro de la página.
 * Se sigue con la cara ACTIVA (Perfil Real o Perfil Weë): seguir es de cada identidad y no toca su agenda (ËContact o
 * ẄContact). Quien gestiona la página —su cuenta, desde cualquiera de las dos caras— ve además «Editar página».
 *
 * ESCENAS DE LA HISTORIA. Una página puede enseñar escenas hechas con Weë AI que cualquiera abre y ve a pantalla
 * completa. Se crean con el Filmmaker de Weë Studio (el composer de siempre, «Añadir escena»), no con otro creador.
 *
 * IMPULSAR. Su dueño ve «Impulsar»: consumirá Credits de la cuenta por el Credit Engine. Hoy solo lo explica; no cobra
 * nada ni inventa un precio (CLAUDE.md §7).
 */
const WeePageScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { identidad } = useIdentidadActiva();
  const pageId = route.params?.pageId as string;
  const [pagina, setPagina] = useState<WeePage | null | undefined>(undefined);
  const [sigue, setSigue] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [escena, setEscena] = useState<{ title: string; videoURL: string; posterURL: string } | null>(null);

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

  const esMia = !!pagina && pagina.ownerAccountId === user?.uid;

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
    return <SafeAreaView style={[s.pantalla, s.centro, { backgroundColor: theme.colors.background }]}><ActivityIndicator color={theme.colors.accent} /></SafeAreaView>;
  }

  const tipo = pagina ? tipoDePagina(pagina.type) : null;
  const info: [string, string][] = pagina ? [
    ...tipo!.campos.filter((c) => pagina.details[c.id]).map((c): [string, string] => [t(c.clave), c.opciones ? t(c.opciones.find((o) => o.id === pagina.details[c.id])?.clave ?? '') : pagina.details[c.id]]),
    ...(pagina.location ? [[t('pages.f_location'), pagina.location] as [string, string]] : []),
    ...(pagina.contact ? [[t('pages.f_contact'), pagina.contact] as [string, string]] : []),
  ] : [];

  return (
    <SafeAreaView style={[s.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[s.barra, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel={t('common.back')} style={s.atras}>
          <IconoDireccional name="arrow-back" size={scale(23)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.barraTitulo, { color: theme.colors.text }]} numberOfLines={1}>{pagina?.name ?? ''}</Text>
      </View>
      {!pagina ? (
        <View style={[s.centro, { flex: 1 }]}><Text style={{ color: theme.colors.textSecondary }}>{t('pages.err_generic')}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={s.dentro}>
          <CabeceraDePagina
            pagina={pagina}
            acciones={(
              <View style={s.acciones}>
                {esMia ? (
                  <TouchableOpacity onPress={() => navigation.navigate('WeePages', { editPageId: pagina.id })} style={[s.boton, { backgroundColor: theme.colors.text }]} accessibilityRole="button">
                    <Ionicons name="create-outline" size={scale(17)} color={theme.colors.background} />
                    <Text style={[s.botonTexto, { color: theme.colors.background }]}>{t('pages.edit')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => void alternarSeguir()} disabled={ocupado || !identidad} style={[s.boton, sigue ? { borderWidth: 1, borderColor: theme.colors.text } : { backgroundColor: theme.colors.accent }]} accessibilityRole="button" accessibilityState={{ selected: sigue }}>
                    <RellenoDeMarca radio={BORDER_RADIUS.full} apagada={sigue} />
                    {ocupado ? <ActivityIndicator color={theme.colors.text} /> : (
                      <Text style={[s.botonTexto, { color: sigue ? theme.colors.text : '#1F2937' }]}>{t(sigue ? 'pages.following' : 'pages.follow')}</Text>
                    )}
                  </TouchableOpacity>
                )}
                {esMia && (
                  <TouchableOpacity onPress={() => navigation.navigate('Boost', { tipo: 'page', id: pagina.id })} style={[s.boton, { backgroundColor: theme.colors.accent }]} accessibilityRole="button">
                    <RellenoDeMarca radio={BORDER_RADIUS.full} />
                    <Ionicons name="rocket-outline" size={scale(17)} color="#1F2937" />
                    <Text style={[s.botonTexto, { color: '#1F2937' }]}>{t('pages.boost')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={compartir} style={[s.boton, { borderWidth: 1, borderColor: theme.colors.border }]} accessibilityRole="button">
                  <Ionicons name="share-outline" size={scale(17)} color={theme.colors.text} />
                  <Text style={[s.botonTexto, { color: theme.colors.text }]}>{t('pages.share')}</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {(!!pagina.scenes?.length || esMia) && (
            <View style={s.seccion}>
              <View style={{ paddingHorizontal: SPACING.lg, gap: 2 }}>
                <Text style={[s.bloqueTitulo, { color: theme.colors.text }]}>{t('pages.scenes')}</Text>
                <Text style={[s.parrafo, { color: theme.colors.textSecondary }]}>{t('pages.scenesHint')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.destacados}>
                {(pagina.scenes ?? []).map((e) => (
                  <TouchableOpacity key={e.videoURL} onPress={() => setEscena(e)} accessibilityRole="button" accessibilityLabel={e.title} activeOpacity={0.9} style={[s.escena, { backgroundColor: theme.colors.surface }]}>
                    <Image source={{ uri: e.posterURL }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <View style={s.escenaVelo} />
                    <View style={s.escenaPlay}><Ionicons name="play" size={scale(20)} color="#0A0A0A" style={{ marginLeft: 2 }} /></View>
                    <Text style={s.escenaTitulo} numberOfLines={2}>{e.title}</Text>
                    {/*
                      PUBLICARLA TAMBIÉN EN EL MURO (2026-11-02). Abre el compositor de siempre con la escena puesta: ahí se
                      elige el Wäll general, las secciones o las dos cosas, y publica la cara activa —quien firma se ve arriba—.
                    */}
                    {esMia && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Create', { kind: 'video', sourceSection: 'studio', prefill: { content: `${e.title} · ${pagina.name}`, aiTools: ['Weë Studio'], media: [{ type: 'video', uri: e.videoURL }] } })}
                        accessibilityRole="button"
                        accessibilityLabel={t('composer.publish')}
                        hitSlop={8}
                        style={s.escenaPublicar}
                      >
                        <RellenoDeMarca radio={scale(17)} />
                        <Ionicons name="paper-plane" size={scale(15)} color="#1F2937" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
                {esMia && (
                  <TouchableOpacity onPress={() => navigation.navigate('Production', {})} accessibilityRole="button" style={[s.escena, s.escenaNueva, { borderColor: theme.colors.border }]}>
                    <Ionicons name="add-circle-outline" size={scale(28)} color={theme.colors.text} />
                    <Text style={[s.botonTexto, { color: theme.colors.text, textAlign: 'center' }]}>{t('pages.addScene')}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          )}

          {(!!pagina.about || info.length > 0) && (
            <View style={[s.bloque, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
              <Text style={[s.bloqueTitulo, { color: theme.colors.text }]}>{t('pages.about')}</Text>
              {!!pagina.about && <Text style={[s.parrafo, { color: theme.colors.text }]}>{pagina.about}</Text>}
              {info.map(([k, v]) => (
                <View key={k} style={s.dato}>
                  <Text style={[s.datoK, { color: theme.colors.textSecondary }]}>{k}</Text>
                  <Text style={[s.datoV, { color: theme.colors.text }]}>{v}</Text>
                </View>
              ))}
            </View>
          )}

          {!!pagina.featured?.length && (
            <View style={s.seccion}>
              <Text style={[s.bloqueTitulo, { color: theme.colors.text, paddingHorizontal: SPACING.lg }]}>{t('pages.featured')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.destacados}>
                {pagina.featured.map((url) => (
                  <Image key={url} source={{ uri: url }} style={[s.destacado, { backgroundColor: theme.colors.surface }]} contentFit="cover" />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[s.bloque, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Text style={[s.bloqueTitulo, { color: theme.colors.text }]}>{t('pages.wall')}</Text>
            <View style={s.vacio}>
              <Ionicons name="newspaper-outline" size={scale(28)} color={theme.colors.textSecondary} />
              <Text style={[s.parrafo, { color: theme.colors.textSecondary, textAlign: 'center' }]}>{t('pages.wallSoon')}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={!!escena} animationType="fade" onRequestClose={() => setEscena(null)} supportedOrientations={['portrait', 'landscape']}>
        <View style={s.visor}>
          {!!escena && (
            <Video source={{ uri: escena.videoURL }} posterSource={{ uri: escena.posterURL }} usePoster style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} shouldPlay isLooping />
          )}
          <SafeAreaView style={s.visorArriba} edges={['top']}>
            <Text style={s.visorTitulo} numberOfLines={2}>{escena?.title ?? ''}</Text>
            <TouchableOpacity onPress={() => setEscena(null)} accessibilityRole="button" accessibilityLabel={t('common.close')} style={s.visorCerrar}>
              <Ionicons name="close" size={scale(24)} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  atras: { padding: SPACING.xs },
  barraTitulo: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  dentro: { paddingBottom: scale(120), gap: SPACING.md, width: '100%', maxWidth: 760, alignSelf: 'center' },
  acciones: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  boton: { flex: 1, minHeight: scale(42), borderRadius: BORDER_RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  botonTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  bloque: { marginHorizontal: SPACING.lg, borderWidth: StyleSheet.hairlineWidth, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  bloqueTitulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  parrafo: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  dato: { gap: 2 },
  datoK: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  datoV: { fontSize: FONT_SIZE.sm },
  seccion: { gap: SPACING.sm },
  destacados: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  destacado: { width: scale(150), height: scale(190), borderRadius: BORDER_RADIUS.md },
  vacio: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  escena: { width: scale(170), height: scale(240), borderRadius: BORDER_RADIUS.md, overflow: 'hidden', justifyContent: 'flex-end', padding: SPACING.sm },
  escenaVelo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  escenaPlay: { position: 'absolute', top: '40%', alignSelf: 'center', width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  escenaPublicar: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: scale(34), height: scale(34), borderRadius: scale(17), backgroundColor: MARCA.primario, alignItems: 'center', justifyContent: 'center' },
  escenaTitulo: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  escenaNueva: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  visor: { flex: 1, backgroundColor: '#000000' },
  visorArriba: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  visorTitulo: { flex: 1, color: '#FFFFFF', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, paddingVertical: SPACING.sm },
  visorCerrar: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
});

export default WeePageScreen;
