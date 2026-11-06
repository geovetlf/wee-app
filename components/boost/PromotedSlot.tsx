/**
 * EL ESPACIO PROMOCIONADO DEL INICIO — la distribución real de Boost dentro de Weë (docs/BOOST.md §4).
 *
 * Al montarse pide al servidor (`boost` → `serve`) UNA publicación promocionada para esta cuenta. El servidor elige
 * entre las campañas activas de otras cuentas para las que esta sea público (todo Weë, sus ËContact, su comunidad,
 * su país declarado), registra la impresión —una por cuenta, campaña y día— y la devuelve. Si no hay ninguna, no se
 * pinta nada: ni hueco, ni relleno, ni anuncio de ejemplo.
 *
 * Va marcada como «Promocionado». Abrirla cuenta una apertura (`click`), que el servidor solo acepta si de verdad se
 * le sirvió a esta cuenta.
 *
 * Solo vive en la versión App (el Inicio social). Weë Creator no tiene muro y no la monta.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { boostService } from '../../services/boostService';
import type { Post } from '../../services/firestoreService';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  /** Cómo pinta la pantalla una publicación (la misma tarjeta del muro). `abrir` registra la apertura y navega. */
  pintar: (post: Post, abrir: () => void) => React.ReactNode;
}

const PromotedSlot: React.FC<Props> = ({ pintar }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const [servida, setServida] = useState<{ campaignId: string; post: Post } | null>(null);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    let vivo = true;
    boostService.servir().then((r) => {
      if (!vivo || !r) return;
      const crudo = r.post as Record<string, any>;
      const post = {
        ...crudo,
        createdAt: Timestamp.fromMillis(typeof crudo.createdAt === 'number' ? crudo.createdAt : Date.now()),
        updatedAt: Timestamp.fromMillis(typeof crudo.updatedAt === 'number' && crudo.updatedAt > 0 ? crudo.updatedAt : typeof crudo.createdAt === 'number' ? crudo.createdAt : Date.now()),
      } as unknown as Post;
      setServida({ campaignId: r.campaignId, post });
    }).catch(() => {
      /* Sin promoción no pasa nada: el muro sigue igual. */
    });
    return () => { vivo = false; };
  }, [user]);

  if (!servida) return null;
  const abrir = () => {
    boostService.clic(servida.campaignId).catch(() => undefined);
    navigation.navigate('PostDetail', { postId: servida.post.id, post: servida.post });
  };
  return (
    <View style={[st.caja, dir.contenedor]} accessibilityLabel={t('boost.promotedA11y')}>
      <View style={st.etiqueta}>
        <Ionicons name="rocket-outline" size={scale(14)} color={theme.colors.textSecondary} />
        <Text style={[st.etiquetaTexto, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.promoted')}</Text>
      </View>
      {pintar(servida.post, abrir)}
    </View>
  );
};

const st = StyleSheet.create({
  caja: { marginBottom: SPACING.lg },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs },
  etiquetaTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
});

export default PromotedSlot;
