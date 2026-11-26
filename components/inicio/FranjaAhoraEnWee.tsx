/*
 * «AHORA EN WEË» — la fila de caras de la PRUEBA del Home con más impacto (propuesta del 2026-11-24, idea 1).
 *
 * Solo la usa `screens/HomeImpactoScreen.tsx`, la pantalla aparte para mirar la propuesta; el Home de verdad no la
 * monta. Los autores salen de las publicaciones que el Home YA cargó (un hueco por autor, en orden de llegada): no
 * hay consulta nueva. Círculo = persona (Perfil Real), cuadrado redondeado = alter ego; el tipo se LEE del perfil
 * (`profileType`), nunca del prefijo del identificador. Las caras propias de la cuenta no salen nunca.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AvatarDisplay from '../avatars/AvatarDisplay';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useUserById } from '../../hooks/useUserById';
import { MARCA } from '../../constants/marca';
import type { Post } from '../../services/firestoreService';

const LADO = 60;
const ARO = 3;

/** Un aro con el degradado de la marca alrededor de la cara; círculo o cuadrado según quién es. */
const Aro: React.FC<{ cuadrado: boolean; vivo: boolean; fondo: string; children: React.ReactNode }> = ({ cuadrado, vivo, fondo, children }) => {
  const radio = cuadrado ? 18 : (LADO + ARO * 2) / 2;
  const dentro = (
    <View style={[s.hueco, { borderRadius: cuadrado ? 15 : LADO / 2 + 1, backgroundColor: fondo }]}>{children}</View>
  );
  return vivo ? (
    <LinearGradient colors={MARCA.degradado.colores} locations={MARCA.degradado.posiciones} start={MARCA.degradado.inicio} end={MARCA.degradado.fin} style={[s.aro, { borderRadius: radio }]}>
      {dentro}
    </LinearGradient>
  ) : (
    <View style={[s.aro, { borderRadius: radio }]}>{dentro}</View>
  );
};

/* `nuevo`: de los que acaban de publicar (los primeros del muro, que llega por fecha). */
const Cara: React.FC<{ post: Post; nuevo: boolean; onPress: (p: Post) => void }> = ({ post, nuevo, onPress }) => {
  const { theme } = useTheme();
  const { userProfile: autor } = useUserById(post.userId);
  const cuadrado = autor?.profileType === 'hidi';
  const nombre = autor?.displayName || autor?.username || '';
  return (
    <Pressable onPress={() => onPress(post)} accessibilityRole="button" accessibilityLabel={nombre} style={(e: any) => [s.celda, e.pressed && { opacity: 0.7 }, Platform.OS === 'web' && ({ cursor: 'pointer' } as object)] as any}>
      <Aro cuadrado={cuadrado} vivo={nuevo} fondo={theme.colors.background}>
        <AvatarDisplay
          size={LADO - 4}
          cuadrado={cuadrado}
          avatarType={autor?.avatarType || 'predefined'}
          avatarId={autor?.avatarId || (cuadrado ? 'ghost' : 'male')}
          photoURL={typeof autor?.photoURL === 'string' ? autor.photoURL : undefined}
          photoURLThumbnail={typeof autor?.photoURLThumbnail === 'string' ? autor.photoURLThumbnail : undefined}
          backgroundColor={theme.colors.surface}
        />
      </Aro>
      <Text style={[s.nombre, { color: theme.colors.text }]} numberOfLines={1}>{nombre}</Text>
    </Pressable>
  );
};

interface Props {
  posts: Post[];
  /** Los uid de TODAS las caras de la cuenta que mira: ninguna sale en la fila. */
  propias: Set<string>;
  /** La cara activa de quien mira, para el hueco «Tú +». Sin sesión no hay hueco. */
  yo?: { foto?: string; avatarType?: any; avatarId?: string; cuadrado: boolean } | null;
  onPost: (p: Post) => void;
  onCrear: () => void;
}

/** Cuántos autores hacen falta para pintar la fila; con menos, quien la usa vuelve a los atajos. */
export const MINIMO_DE_CARAS = 4;

export const autoresDeLaFranja = (posts: Post[], propias: Set<string>): Post[] => {
  const vistos = new Set<string>();
  const salida: Post[] = [];
  for (const p of posts) {
    if (!p.userId || propias.has(p.userId) || vistos.has(p.userId) || p.autonomo) continue;
    vistos.add(p.userId);
    salida.push(p);
    if (salida.length >= 15) break;
  }
  return salida;
};

const FranjaAhoraEnWee: React.FC<Props> = ({ posts, propias, yo, onPost, onCrear }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const autores = autoresDeLaFranja(posts, propias);
  return (
    <View style={[s.franja, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
      <Text style={[s.titulo, { color: theme.colors.textSecondary }]}>{t('home.nowOnWee')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fila}>
        {yo ? (
          <Pressable onPress={onCrear} accessibilityRole="button" accessibilityLabel={t('home.you')} style={(e: any) => [s.celda, e.pressed && { opacity: 0.7 }, Platform.OS === 'web' && ({ cursor: 'pointer' } as object)] as any}>
            <View>
              <View style={[s.aro, { borderRadius: yo.cuadrado ? 18 : (LADO + ARO * 2) / 2, borderWidth: 1.5, borderColor: theme.colors.border, padding: ARO - 1.5 }]}>
                <View style={[s.hueco, { borderRadius: yo.cuadrado ? 15 : LADO / 2 + 1, backgroundColor: theme.colors.background }]}>
                  <AvatarDisplay size={LADO - 4} cuadrado={yo.cuadrado} avatarType={yo.avatarType || 'predefined'} avatarId={yo.avatarId || 'male'} photoURL={yo.foto} backgroundColor={theme.colors.surface} />
                </View>
              </View>
              <View style={[s.mas, { borderColor: theme.colors.background }]}>
                <LinearGradient colors={MARCA.degradado.colores} locations={MARCA.degradado.posiciones} start={MARCA.degradado.inicio} end={MARCA.degradado.fin} style={StyleSheet.absoluteFill} />
                <Ionicons name="add" size={14} color={MARCA.sobrePrimario} />
              </View>
            </View>
            <Text style={[s.nombre, { color: theme.colors.text }]} numberOfLines={1}>{t('home.you')}</Text>
          </Pressable>
        ) : null}
        {autores.map((p, i) => <Cara key={p.userId} post={p} nuevo={i < 6} onPress={onPost} />)}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  franja: { paddingTop: 6, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  titulo: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 8 },
  fila: { paddingHorizontal: 12, gap: 6 },
  celda: { width: LADO + 14, alignItems: 'center' },
  aro: { padding: ARO },
  hueco: { padding: 2, overflow: 'hidden' },
  nombre: { fontSize: 11, marginTop: 5, maxWidth: LADO + 12, textAlign: 'center' },
  mas: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});

export default FranjaAhoraEnWee;
