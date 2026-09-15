import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  BackHandler,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { weeBizService, Product } from '../services/weeBizService';
import { uploadImageToCloudinary, cloudinaryThumb } from '../services/cloudinaryService';
import EspacioDeEscritura from '../components/EspacioDeEscritura';

type RoutePropType = RouteProp<MainStackParamList, 'WeeBizProducts'>;
type NavProp = StackNavigationProp<MainStackParamList>;

const WeeBizProductsScreen: React.FC = () => {
  const t = useT();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();

  const { businessId, isOwner } = route.params;
  const activeUid = userProfile?.uid || user?.uid;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState('S/.');
  const [formImageUri, setFormImageUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => { navigation.goBack(); return true; };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  useEffect(() => {
    loadProducts();
  }, [businessId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const prods = await weeBizService.getProducts(businessId);
      setProducts(prods);
    } catch (e) {
      console.error('Error loading products:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormCurrency('S/.');
    setFormImageUri(null);
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDesc(product.description);
    setFormPrice(product.price > 0 ? product.price.toString() : '');
    setFormCurrency(product.currency || 'S/.');
    setFormImageUri(product.images?.[0] || null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('weebiz.permissionTitle'), t('weebiz.galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setFormImageUri(result.assets[0].uri);
    }
  };

  const handleSaveProduct = async () => {
    if (!formName.trim()) {
      Alert.alert(t('weebiz.requiredTitle'), t('weebiz.productNameRequired'));
      return;
    }
    try {
      setSaving(true);

      let imageUrl = '';
      if (formImageUri && !formImageUri.startsWith('http')) {
        imageUrl = await uploadImageToCloudinary(formImageUri, 'weebiz-products');
      } else if (formImageUri) {
        imageUrl = formImageUri;
      }

      const price = parseFloat(formPrice) || 0;
      const images = imageUrl ? [imageUrl] : (editingProduct?.images || []);

      if (editingProduct?.id) {
        await weeBizService.updateProduct(businessId, editingProduct.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          price,
          currency: formCurrency,
          images,
        });
      } else {
        await weeBizService.createProduct(businessId, {
          name: formName.trim(),
          description: formDesc.trim(),
          price,
          currency: formCurrency,
          images,
          order: products.length,
        });
      }

      setModalVisible(false);
      loadProducts();
    } catch (e) {
      console.error('Error saving product:', e);
      Alert.alert('Error', t('weebiz.productSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(t('weebiz.deleteProductTitle'), t('weebiz.deleteProductConfirm', { nombre: product.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await weeBizService.deleteProduct(businessId, product.id!);
            loadProducts();
          } catch (e) {
            console.error('Error deleting product:', e);
          }
        },
      },
    ]);
  };

  const handleToggleAvailable = async (product: Product) => {
    try {
      await weeBizService.updateProduct(businessId, product.id!, {
        available: !product.available,
      });
      loadProducts();
    } catch (e) {
      console.error('Error toggling availability:', e);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price <= 0) return 'Consultar';
    return `${currency} ${price.toFixed(2)}`;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const imgUrl = item.images?.[0] ? cloudinaryThumb(item.images[0], 300) : null;
    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => setDetailProduct(item)}
        activeOpacity={0.7}
      >
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: theme.colors.border }]}>
            <Ionicons name="cube-outline" size={scale(28)} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productPrice, { color: theme.colors.primary }]}>
            {formatPrice(item.price, item.currency)}
          </Text>
          {!item.available && (
            <Text style={[styles.unavailableTag, { color: theme.colors.error }]}>{t('weebiz.notAvailable')}</Text>
          )}
        </View>
        {isOwner && (
          <View style={styles.productActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
              <Ionicons name="create-outline" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteProduct(item)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={scale(18)} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="cube-outline" size={scale(48)} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          {t('weebiz.noProductsYet')}
        </Text>
        {isOwner && (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t('weebiz.addFirstProduct')}
          </Text>
        )}
      </View>
    );
  };

  // Product detail modal
  const renderDetailModal = () => {
    if (!detailProduct) return null;
    const imgUrl = detailProduct.images?.[0] || null;
    return (
      <Modal visible={!!detailProduct} animationType="slide" transparent onRequestClose={() => setDetailProduct(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.backdrop }]}>
          <View style={[styles.detailModal, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setDetailProduct(null)}>
              <Ionicons name="close" size={scale(24)} color={theme.colors.text} />
            </TouchableOpacity>
            {imgUrl ? (
              <Image source={{ uri: imgUrl }} style={styles.detailImage} />
            ) : (
              <View style={[styles.detailImagePlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="cube-outline" size={scale(48)} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.detailContent}>
              <Text style={[styles.detailName, { color: theme.colors.text }]}>{detailProduct.name}</Text>
              <Text style={[styles.detailPrice, { color: theme.colors.primary }]}>
                {formatPrice(detailProduct.price, detailProduct.currency)}
              </Text>
              {detailProduct.description ? (
                <Text style={[styles.detailDesc, { color: theme.colors.textSecondary }]}>
                  {detailProduct.description}
                </Text>
              ) : null}
              {!detailProduct.available && (
                <Text style={[styles.unavailableTag, { color: theme.colors.error, marginTop: SPACING.sm }]}>
                  {t('weebiz.notAvailable')}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Add/Edit modal
  const renderFormModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
      <EspacioDeEscritura
        style={[styles.modalOverlay, { backgroundColor: theme.colors.backdrop }]}
      >
        <View style={[styles.formModal, { backgroundColor: theme.colors.background }]}>
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={scale(24)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Image */}
            <TouchableOpacity
              style={[styles.formImagePicker, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={pickImage}
            >
              {formImageUri ? (
                <Image source={{ uri: formImageUri }} style={styles.formImagePreview} />
              ) : (
                <View style={styles.formImagePlaceholder}>
                  <Ionicons name="camera-outline" size={scale(28)} color={theme.colors.textSecondary} />
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: FONT_SIZE.xs }]}>{t('weebiz.addPhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name */}
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>{t('weebiz.nameRequired')}</Text>
            <TextInput
              style={[styles.formInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              value={formName}
              onChangeText={setFormName}
              placeholder={t('weebiz.namePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={80}
            />

            {/* Price */}
            <View style={styles.priceRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>{t('weebiz.price')}</Text>
                <TextInput
                  style={[styles.formInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: scale(80) }}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>{t('weebiz.currency')}</Text>
                <TextInput
                  style={[styles.formInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  value={formCurrency}
                  onChangeText={setFormCurrency}
                  placeholder="S/."
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>{t('weebiz.description')}</Text>
            <TextInput
              style={[styles.formTextArea, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              value={formDesc}
              onChangeText={setFormDesc}
              placeholder={t('weebiz.descriptionPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={300}
              textAlignVertical="top"
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.formSaveBtn, { backgroundColor: formName.trim() ? theme.colors.primary : theme.colors.border }]}
              onPress={handleSaveProduct}
              disabled={saving || !formName.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.formSaveBtnText}>
                  {editingProduct ? 'Guardar cambios' : t('weebiz.addProduct')}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </EspacioDeEscritura>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('weebiz.products')}</Text>
        {isOwner ? (
          <TouchableOpacity onPress={openAddModal} style={styles.backBtn}>
            <Ionicons name="add-circle-outline" size={scale(24)} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: scale(32) }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: scale(40) }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id!}
          renderItem={renderProduct}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
        />
      )}

      {renderFormModal()}
      {renderDetailModal()}
    </View>
  );
};

const CARD_GAP = SPACING.sm;

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
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    flexGrow: 1,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  // Product card (grid)
  productCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
  },
  productImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: SPACING.sm,
    gap: scale(2),
  },
  productName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  productPrice: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  unavailableTag: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  actionBtn: {
    padding: scale(4),
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(60),
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
  // Modals shared
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalClose: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    padding: SPACING.xs,
  },
  // Detail modal
  detailModal: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  detailImage: {
    width: '100%',
    aspectRatio: 1,
  },
  detailImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    padding: SPACING.lg,
  },
  detailName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold as any,
    marginBottom: SPACING.xs,
  },
  detailPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
    marginBottom: SPACING.md,
  },
  detailDesc: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(22),
  },
  // Form modal
  formModal: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
    padding: SPACING.lg,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  formImagePicker: {
    width: scale(120),
    height: scale(120),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  formImagePreview: {
    width: scale(120),
    height: scale(120),
    borderRadius: BORDER_RADIUS.md,
  },
  formImagePlaceholder: {
    alignItems: 'center',
    gap: scale(4),
  },
  formLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold as any,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  formInput: {
    height: scale(44),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  formTextArea: {
    minHeight: scale(80),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  priceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  formSaveBtn: {
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  formSaveBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold as any,
    color: '#FFF',
  },
});

export default WeeBizProductsScreen;
