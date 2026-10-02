import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  BackHandler,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { getCategoryById } from '../constants/weebizCategories';
import { weeBizService, Business, Product, Review } from '../services/weeBizService';
import { messagesService, ParticipantData } from '../services/messagesService';
import { cloudinaryThumb } from '../services/cloudinaryService';
import { formatNumber } from '../utils/formatoCorto';

type RoutePropType = RouteProp<MainStackParamList, 'WeeBizProfile'>;
type NavProp = StackNavigationProp<MainStackParamList>;

// Follow para negocios: usa colección businessFollows con ID {userId}_{businessId}
import {
  doc,
  getDoc,
  increment,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { confirmAction, notify } from '../utils/notify';

const WeeBizProfileScreen: React.FC = () => {
  const { t, formato, locale } = useIdioma();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();

  const { businessId } = route.params;
  /*
   * Seguir un negocio, reseñarlo y ser su dueño son cosas de la CUENTA: las
   * tres reglas de Weë Business exigen `request.auth.uid`, así que con el
   * perfil activo se denegaban desde el Perfil Weë. Un negocio es una Página
   * del Account, no una cara. (Escribirle por WeeTalk sí es de la cara activa,
   * y por eso esa llamada usa su propio identificador.)
   */
  const activeUid = user?.uid;
  const identidadActiva = userProfile?.uid || user?.uid;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Android back
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => { navigation.goBack(); return true; };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  useEffect(() => {
    if (activeUid && businessId) {
      checkFollowStatus();
    }
  }, [activeUid, businessId]);

  const loadBusiness = async () => {
    try {
      setLoading(true);
      const [biz, prods, revs] = await Promise.all([
        weeBizService.getBusinessById(businessId),
        weeBizService.getProducts(businessId),
        weeBizService.getReviews(businessId, 10),
      ]);
      setBusiness(biz);
      setProducts(prods.slice(0, 4));
      setReviews(revs);
      // Check if current user already reviewed
      if (activeUid) {
        const myReview = revs.find(r => r.userId === activeUid);
        setUserReview(myReview || null);
      }
    } catch (e) {
      console.error('Error loading business:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!activeUid) return;
    try {
      const followId = `${activeUid}_biz_${businessId}`;
      const followDoc = await getDoc(doc(db, 'businessFollows', followId));
      setIsFollowing(followDoc.exists());
    } catch (e) {
      console.error('Error checking follow:', e);
    }
  };

  const handleToggleFollow = async () => {
    if (!activeUid || followLoading) return;
    try {
      setFollowLoading(true);
      const followId = `${activeUid}_biz_${businessId}`;
      const followRef = doc(db, 'businessFollows', followId);
      const negocioRef = doc(db, 'businesses', businessId);
      /*
       * SEGUIR Y SU CONTADOR, EN UNA SOLA ESCRITURA. Antes eran dos: el documento de `businessFollows` y, después,
       * `followersCount` del negocio. Si la segunda fallaba, el seguimiento quedaba hecho (o deshecho) con el contador
       * sin mover, y la pantalla ni siquiera se enteraba. Ahora van en un `writeBatch`: o las dos, o ninguna.
       * El contador se mueve de uno en uno, que es lo que exige `contadorSano('followersCount')` en firestore.rules,
       * y nunca baja de cero: con un contador ya en cero (un desfase heredado de cuando eran dos escrituras), dejar de
       * seguir borra el seguimiento sin restar, en vez de que la regla tumbe el lote entero y no se pueda dejar de seguir.
       */
      const lote = writeBatch(db);

      if (isFollowing) {
        lote.delete(followRef);
        if ((business?.followersCount ?? 0) > 0) lote.update(negocioRef, { followersCount: increment(-1) });
        await lote.commit();
        setIsFollowing(false);
        setBusiness(prev => prev ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1) } : prev);
      } else {
        lote.set(followRef, {
          userId: activeUid,
          businessId,
          createdAt: Timestamp.now(),
        });
        lote.update(negocioRef, { followersCount: increment(1) });
        await lote.commit();
        setIsFollowing(true);
        setBusiness(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : prev);
      }
    } catch (e) {
      console.error('Error toggling follow:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleContact = async () => {
    if (!identidadActiva || !business) return;

    try {
      // Obtener datos del dueño del negocio para crear/abrir conversación
      /* El nombre de respaldo NO pasa por t(): se GUARDA en `participantsData` de la conversación. Es dato. */
      const currentUserData: ParticipantData = {
        displayName: userProfile?.displayName || 'Usuario',
        avatarType: userProfile?.avatarType as any,
        avatarId: userProfile?.avatarId,
        photoURL: typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined,
      };

      const bizOwnerData: ParticipantData = {
        displayName: business.name,
        photoURL: business.logo,
      };

      const conversationId = await messagesService.getOrCreateConversation(
        identidadActiva,
        business.ownerId,
        currentUserData,
        bizOwnerData,
      );

      // Navigate to nested Conversation screen inside Inbox tab
      navigation.navigate('Main' as any, {
        screen: 'Inbox',
        params: {
          screen: 'Conversation',
          params: {
            conversationId,
            otherUserId: business.ownerId,
            otherUserData: bizOwnerData,
          },
        },
      });
    } catch (e) {
      console.error('Error opening conversation:', e);
      notify(t('common.error'), t('weebiz.chatFailed'));
    }
  };

  const handleExternalLink = () => {
    if (!business?.externalLink) return;
    let url = business.externalLink;
    if (!url.startsWith('http')) url = 'https://' + url;
    Linking.openURL(url).catch(() => {
      notify(t('common.error'), t('weebiz.linkFailed'));
    });
  };

  const handleSubmitReview = async () => {
    if (!activeUid || !business) return;
    if (!reviewText.trim()) {
      notify(t('weebiz.requiredTitle'), t('weebiz.opinionRequired'));
      return;
    }
    try {
      setSavingReview(true);
      /* Ídem: el nombre de respaldo se GUARDA en la reseña (`userName`), no se pinta desde aquí. */
      await weeBizService.createReview(businessId, {
        userId: activeUid,
        userName: userProfile?.displayName || 'Usuario',
        userAvatar: typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined,
        rating: reviewRating,
        text: reviewText.trim(),
      });
      setReviewModalVisible(false);
      setReviewText('');
      setReviewRating(5);
      // Reload
      const [revs, biz] = await Promise.all([
        weeBizService.getReviews(businessId, 10),
        weeBizService.getBusinessById(businessId),
      ]);
      setReviews(revs);
      setBusiness(biz);
      setUserReview(revs.find(r => r.userId === activeUid) || null);
    } catch (e) {
      console.error('Error submitting review:', e);
      notify(t('common.error'), t('weebiz.reviewFailed'));
    } finally {
      setSavingReview(false);
    }
  };

  /*
   * Borrar la reseña propia. Con `Alert.alert` el borrado vivía en el `onPress` de su botón, y en la web no salía ni
   * se llamaba nada. `confirmAction`: el mismo diálogo en el teléfono, `window.confirm` en la web.
   */
  const handleDeleteReview = async () => {
    if (!userReview?.id) return;
    const reviewId = userReview.id;
    if (!(await confirmAction(t('weebiz.deleteReviewTitle'), t('weebiz.deleteReviewConfirm'), t('common.delete'), true, t))) return;
    try {
      await weeBizService.deleteReview(businessId, reviewId);
      const [revs, biz] = await Promise.all([
        weeBizService.getReviews(businessId, 10),
        weeBizService.getBusinessById(businessId),
      ]);
      setReviews(revs);
      setBusiness(biz);
      setUserReview(null);
    } catch (e) {
      console.error('Error deleting review:', e);
    }
  };

  const renderStars = (rating: number, interactive = false, onSelect?: (r: number) => void) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity
          key={i}
          disabled={!interactive}
          onPress={() => onSelect?.(i)}
          activeOpacity={interactive ? 0.7 : 1}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={interactive ? scale(28) : scale(14)}
            color="#F5B731"
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  /* La fecha de una reseña la escribe Intl con el locale de quien mira, no clavada a es-ES. */
  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return formato.fecha(d, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: scale(40) }} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={scale(56)} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t('weebiz.notFound')}
          </Text>
        </View>
      </View>
    );
  }

  const category = getCategoryById(business.categoryId);
  const isOwner = activeUid === business.ownerId;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header nav */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {business.name}
        </Text>
        <View style={{ width: scale(32) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Cover / Logo section */}
        <View style={styles.profileHeader}>
          {/* Logo */}
          <View style={[styles.logoContainer, { backgroundColor: category?.color ? category.color + '15' : theme.colors.surface }]}>
            {business.logo ? (
              <Image source={{ uri: business.logo }} style={styles.logoImage} />
            ) : (
              <Ionicons
                name="storefront"
                size={scale(48)}
                color={category?.color || theme.colors.primary}
              />
            )}
          </View>

          {/* Name & Category */}
          <Text style={[styles.bizName, { color: theme.colors.text }]}>
            {business.name}
          </Text>

          {category && (
            <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={category.icon as any} size={scale(14)} color={category.color} />
              <Text style={[styles.categoryBadgeText, { color: category.color }]}>
                {t(category.clave)}
              </Text>
              {business.subcategory ? (
                <Text style={[styles.subcategoryText, { color: category.color }]}>
                  {' · '}{business.subcategory}
                </Text>
              ) : null}
            </View>
          )}

          {/* Aura & Location */}
          <View style={styles.metaRow}>
            {business.auraScore > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={scale(14)} color="#F5B731" />
                <Text style={[styles.metaText, { color: theme.colors.text }]}>
                  {formato.numero(business.auraScore, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Aura
                </Text>
              </View>
            )}
            {business.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={scale(14)} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {business.location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(business.followersCount, locale)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                {t('weebiz.followers')}
              </Text>
            </View>
            {business.reviewCount > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {formatNumber(business.reviewCount, locale)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  {t('weebiz.reviews')}
                </Text>
              </View>
            )}
          </View>

          {/* Verified badge */}
          {business.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: '#10B981' + '20' }]}>
              <Ionicons name="checkmark-circle" size={scale(16)} color="#10B981" />
              <Text style={[styles.verifiedText, { color: '#10B981' }]}>{t('weebiz.verified')}</Text>
            </View>
          )}

          {/* Action buttons */}
          {!isOwner && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  {
                    backgroundColor: isFollowing ? 'transparent' : (category?.color || theme.colors.primary),
                    borderColor: category?.color || theme.colors.primary,
                  },
                ]}
                onPress={handleToggleFollow}
                disabled={followLoading}
                activeOpacity={0.7}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? (category?.color || theme.colors.primary) : '#FFF'} />
                ) : (
                  <Text style={[
                    styles.followBtnText,
                    { color: isFollowing ? (category?.color || theme.colors.primary) : '#FFF' },
                  ]}>
                    {isFollowing ? t('weebiz.following') : t('weebiz.follow')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactBtn, { borderColor: theme.colors.border }]}
                onPress={handleContact}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={scale(18)} color={theme.colors.text} />
                <Text style={[styles.contactBtnText, { color: theme.colors.text }]}>
                  WeeTalk
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* External link */}
          {business.externalLink ? (
            <TouchableOpacity
              style={[styles.linkBtn, { borderColor: theme.colors.border }]}
              onPress={handleExternalLink}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={scale(16)} color={theme.colors.primary} />
              <Text style={[styles.linkText, { color: theme.colors.primary }]} numberOfLines={1}>
                {business.externalLink.replace(/^https?:\/\//, '')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Description */}
        {business.description ? (
          <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('weebiz.about')}</Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {business.description}
            </Text>
          </View>
        ) : null}

        {/* Products section */}
        <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('weebiz.products')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('WeeBizProducts', { businessId, isOwner })}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                {isOwner ? t('weebiz.manageProducts') : t('weebiz.seeAllProducts')}
              </Text>
            </TouchableOpacity>
          </View>
          {products.length > 0 ? (
            <View style={styles.productsGrid}>
              {products.map(prod => {
                const imgUrl = prod.images?.[0] ? cloudinaryThumb(prod.images[0], 200) : null;
                return (
                  <View key={prod.id} style={[styles.productMini, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {imgUrl ? (
                      <Image source={{ uri: imgUrl }} style={styles.productMiniImage} />
                    ) : (
                      <View style={[styles.productMiniPlaceholder, { backgroundColor: theme.colors.border }]}>
                        <Ionicons name="cube-outline" size={scale(20)} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.productMiniName, { color: theme.colors.text }]} numberOfLines={1}>{prod.name}</Text>
                    <Text style={[styles.productMiniPrice, { color: theme.colors.primary }]}>
                      {prod.price > 0 ? `${prod.currency} ${formato.numero(prod.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : t('weebiz.priceOnRequest')}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.placeholderSection}>
              <Ionicons name="cube-outline" size={scale(32)} color={theme.colors.textSecondary} />
              <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                {isOwner ? t('weebiz.addFirstProduct') : t('weebiz.noProductsYet')}
              </Text>
              {isOwner && (
                <TouchableOpacity
                  style={[styles.addProductBtn, { borderColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('WeeBizProducts', { businessId, isOwner: true })}
                >
                  <Ionicons name="add" size={scale(16)} color={theme.colors.primary} />
                  <Text style={[styles.addProductText, { color: theme.colors.primary }]}>{t('weebiz.addProduct')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Reviews section */}
        <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {reviews.length > 0 ? t('weebiz.reviewsCount', { cantidad: reviews.length }) : t('weebiz.reviews')}
            </Text>
            {!!(!isOwner && !userReview && activeUid) && (
              <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>{t('weebiz.writeReview')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {reviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {reviews.map(rev => (
                <View key={rev.id} style={[styles.reviewCard, { borderColor: theme.colors.border }]}>
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewUser, { color: theme.colors.text }]}>{rev.userName}</Text>
                    {renderStars(rev.rating)}
                    <Text style={[styles.reviewDate, { color: theme.colors.textSecondary }]}>{fmtDate(rev.createdAt)}</Text>
                  </View>
                  <Text style={[styles.reviewText, { color: theme.colors.textSecondary }]}>{rev.text}</Text>
                  {rev.userId === activeUid && (
                    <TouchableOpacity onPress={handleDeleteReview} style={styles.deleteReviewBtn}>
                      <Ionicons name="trash-outline" size={scale(14)} color={theme.colors.error} />
                      <Text style={[styles.deleteReviewText, { color: theme.colors.error }]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.placeholderSection}>
              <Ionicons name="chatbubbles-outline" size={scale(32)} color={theme.colors.textSecondary} />
              <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                {t('weebiz.noReviewsYet')}
              </Text>
              {!!(!isOwner && activeUid) && (
                <TouchableOpacity
                  style={[styles.addProductBtn, { borderColor: theme.colors.primary }]}
                  onPress={() => setReviewModalVisible(true)}
                >
                  <Ionicons name="star-outline" size={scale(16)} color={theme.colors.primary} />
                  <Text style={[styles.addProductText, { color: theme.colors.primary }]}>{t('weebiz.leaveReview')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Review modal */}
        <Modal visible={reviewModalVisible} animationType="slide" transparent onRequestClose={() => setReviewModalVisible(false)}>
          <EspacioDeEscritura
            style={[styles.reviewModalOverlay, { backgroundColor: theme.colors.backdrop }]}
          >
            <View style={[styles.reviewModal, { backgroundColor: theme.colors.background }]}>
              <View style={styles.reviewModalHeader}>
                <Text style={[styles.reviewModalTitle, { color: theme.colors.text }]}>{t('weebiz.yourReview')}</Text>
                <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                  <Ionicons name="close" size={scale(24)} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.reviewModalLabel, { color: theme.colors.text }]}>{t('weebiz.rating')}</Text>
              {renderStars(reviewRating, true, setReviewRating)}

              <Text style={[styles.reviewModalLabel, { color: theme.colors.text, marginTop: SPACING.lg }]}>{t('weebiz.yourOpinion')}</Text>
              <TextInput
                style={[styles.reviewModalInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder={t('weebiz.reviewPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.reviewSubmitBtn, { backgroundColor: reviewText.trim() ? theme.colors.primary : theme.colors.border }]}
                onPress={handleSubmitReview}
                disabled={savingReview || !reviewText.trim()}
              >
                {savingReview ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.reviewSubmitText}>{t('weebiz.sendReview')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </EspacioDeEscritura>
        </Modal>

        <View style={{ height: scale(40) }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
    textAlign: 'center',
    marginHorizontal: SPACING.md,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  logoContainer: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
  },
  bizName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold as any,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: scale(4),
    marginBottom: SPACING.md,
  },
  categoryBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  subcategoryText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular as any,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  metaText: {
    fontSize: FONT_SIZE.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxxl,
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  verifiedText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    width: '100%',
    paddingHorizontal: SPACING.xl,
  },
  followBtn: {
    flex: 1,
    height: scale(40),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  followBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold as any,
  },
  contactBtn: {
    flex: 1,
    height: scale(40),
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    gap: SPACING.xs,
  },
  contactBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  linkText: {
    fontSize: FONT_SIZE.sm,
    maxWidth: scale(200),
  },
  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  seeAllText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  // Products grid preview
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  productMini: {
    width: '47%' as any,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: '46%' as any,
  },
  productMiniImage: {
    width: '100%',
    aspectRatio: 1,
  },
  productMiniPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productMiniName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium as any,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  productMiniPrice: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold as any,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  addProductText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  // Reviews
  reviewsList: {
    gap: SPACING.sm,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  reviewUser: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold as any,
  },
  reviewDate: {
    fontSize: FONT_SIZE.xs,
    marginLeft: 'auto' as any,
  },
  reviewText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  starsRow: {
    flexDirection: 'row',
    gap: scale(2),
  },
  deleteReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: SPACING.sm,
  },
  deleteReviewText: {
    fontSize: FONT_SIZE.xs,
  },
  // Review modal
  reviewModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reviewModal: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  reviewModalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  reviewModalLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold as any,
    marginBottom: SPACING.sm,
  },
  reviewModalInput: {
    minHeight: scale(100),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  reviewSubmitBtn: {
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  reviewSubmitText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold as any,
    color: '#FFF',
  },
  description: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(22),
  },
  placeholderSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  placeholderText: {
    fontSize: FONT_SIZE.sm,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(80),
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
});

export default WeeBizProfileScreen;
