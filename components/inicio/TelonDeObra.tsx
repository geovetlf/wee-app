/*
 * EL TELÓN — una WeëPage en cartel arriba del Ẅall. Solo para la PRUEBA del Home con más impacto
 * (`screens/HomeImpactoScreen.tsx`, propuesta del 2026-11-24, idea 2); el Home de verdad no lo monta.
 *
 * Elige la página publicada más reciente que tenga portada. Sin ninguna, no se pinta: nada de huecos.
 * «Presentada por» lee la cara por su referencia pública; la página nunca dice de qué cuenta es.
 * Título de la obra en EB Garamond (la letra de la obra); la etiqueta, en la de la interfaz.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { pagesService, WeePage } from '../../services/pagesService';
import { usersService } from '../../services/firestoreService';
import { tipoDePagina } from '../../constants/pageTypes';
import { useFuenteDeObra } from '../../hooks/useFuenteDeObra';
import { MARCA } from '../../constants/marca';

const TelonDeObra: React.FC<{ onAbrir: (pageId: string) => void }> = ({ onAbrir }) => {
  const t = useT();
  const obra = useFuenteDeObra();
  const [pagina, setPagina] = useState<WeePage | null>(null);
  const [presenta, setPresenta] = useState<{ nombre: string; foto?: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    pagesService.publicadas(20).then((lista) => {
      const conPortada = lista.filter((p) => !!p.coverURL).sort((a, b) => (b.publishedAtMs ?? 0) - (a.publishedAtMs ?? 0));
      if (vivo) setPagina(conPortada[0] ?? null);
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    let vivo = true;
    if (!pagina?.presenterRef) return;
    usersService.getByPublicRef(pagina.presenterRef).then((perfil: any) => {
      if (vivo && perfil) setPresenta({ nombre: perfil.displayName || perfil.username || '', foto: perfil.photoURLThumbnail || perfil.photoURL });
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, [pagina?.presenterRef]);

  if (!pagina) return null;
  const tipo = tipoDePagina(pagina.type);

  return (
    <Pressable
      onPress={() => onAbrir(pagina.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.premiere')}: ${pagina.name}`}
      style={(e: any) => [s.cartel, e.pressed && { opacity: 0.92 }, Platform.OS === 'web' && ({ cursor: 'pointer' } as object)] as any}
    >
      <Image source={{ uri: pagina.coverURL }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
      <LinearGradient colors={['rgba(5,5,5,0.15)', 'rgba(5,5,5,0.35)', 'rgba(5,5,5,0.88)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={MARCA.degradado.colores} locations={MARCA.degradado.posiciones} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.filete} />
      <View style={s.pie}>
        <Text style={s.etiqueta}>{t('home.premiere')} · {t(tipo.claveTitulo)}</Text>
        <Text style={[s.titulo, obra(30, '500')]} numberOfLines={2}>{pagina.name}</Text>
        <View style={s.fila}>
          {presenta ? (
            <View style={s.presenta}>
              {presenta.foto ? <Image source={{ uri: presenta.foto }} style={s.mini} contentFit="cover" /> : null}
              <Text style={s.presentaTexto} numberOfLines={1}>{t('home.presentedBy', { nombre: presenta.nombre })}</Text>
            </View>
          ) : <View style={{ flex: 1 }} />}
          <View style={s.boton}>
            <Text style={s.botonTexto}>{t('home.viewPage')}</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  cartel: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, height: 220, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0A0A0A', justifyContent: 'flex-end' },
  filete: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  pie: { padding: 16, gap: 6 },
  etiqueta: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase' },
  titulo: { color: '#FFFFFF' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  presenta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  mini: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  presentaTexto: { color: 'rgba(255,255,255,0.9)', fontSize: 13, flexShrink: 1 },
  boton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  botonTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});

export default TelonDeObra;
