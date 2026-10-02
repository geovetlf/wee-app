import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
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
import {
  WEEBIZ_CATEGORIES,
  WEEBIZ_MAIN_CATEGORIES,
  WEEBIZ_EXTRA_CATEGORIES,
  WeeBizCategory,
} from '../constants/weebizCategories';
import { weeBizService, Business } from '../services/weeBizService';
import { usersService } from '../services/firestoreService';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { notify } from '../utils/notify';

type RoutePropType = RouteProp<MainStackParamList, 'WeeBizRegister'>;
type NavProp = StackNavigationProp<MainStackParamList>;

const WeeBizRegisterScreen: React.FC = () => {
  const t = useT();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();

  const editBusiness = (route.params as any)?.business as Business | undefined;
  const isEditing = !!editBusiness;
  /*
   * UN NEGOCIO ES DE LA CUENTA, NO DE UNA CARA.
   *
   * Escribía `ownerId` con el perfil activo, y la regla de `businesses` exige
   * `== request.auth.uid`: desde el Perfil Weë la escritura se DENEGABA y
   * registrar un negocio era imposible. Y si hubiera pasado, el negocio habría
   * quedado con `ownerId: hidi_…` y su dueño no habría vuelto a poder editarlo.
   *
   * Arreglarlo por el otro lado —ensanchar la regla— sería el error: un negocio
   * es una Página del Account, y una Página no es una cara de la persona.
   */
  const activeUid = user?.uid;

  // Form state
  const [name, setName] = useState(editBusiness?.name || '');
  const [description, setDescription] = useState(editBusiness?.description || '');
  const [subcategory, setSubcategory] = useState(editBusiness?.subcategory || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(editBusiness?.categoryId || '');
  const [location, setLocation] = useState(editBusiness?.location || '');
  const [externalLink, setExternalLink] = useState(editBusiness?.externalLink || '');
  const [logoUri, setLogoUri] = useState<string | null>(editBusiness?.logo || null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  /*
   * UN TOQUE, UN NEGOCIO.
   *
   * `createBusiness` es un `addDoc`: cada llamada es un negocio nuevo. La navegación vivía en el botón de un
   * `Alert.alert`, que en la web no se pinta, así que la persona se quedaba en el formulario y un segundo toque creaba
   * OTRO. Ahora se navega sin esperar a ningún aviso, y la ref cierra la puerta en cuanto empieza el guardado —el
   * segundo toque puede llegar antes de que se pinte el botón deshabilitado— y la deja cerrada tras el éxito.
   */
  const guardando = useRef(false);
  const [guardado, setGuardado] = useState(false);

  // Android back
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => { navigation.goBack(); return true; };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      notify(t('weebiz.permissionTitle'), t('weebiz.galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (guardando.current) return;
    if (!activeUid) {
      notify(t('common.error'), t('weebiz.signInFirst'));
      return;
    }
    if (!name.trim()) {
      notify(t('weebiz.requiredTitle'), t('weebiz.businessNameMissing'));
      return;
    }
    if (!selectedCategory) {
      notify(t('weebiz.requiredTitle'), t('weebiz.categoryMissing'));
      return;
    }

    guardando.current = true;
    setSaving(true);
    /* El id del negocio recién creado; `null` si lo que se guardó fue una edición. */
    let creado: string | null = null;
    try {
      // Upload logo if it's a local URI (not already a URL)
      let logoUrl = editBusiness?.logo || '';
      if (logoUri && !logoUri.startsWith('http')) {
        logoUrl = await uploadImageToCloudinary(logoUri, 'weebiz-logos');
      } else if (logoUri) {
        logoUrl = logoUri;
      }

      if (isEditing && editBusiness?.id) {
        await weeBizService.updateBusiness(editBusiness.id, {
          name: name.trim(),
          description: description.trim(),
          subcategory: subcategory.trim(),
          categoryId: selectedCategory,
          location: location.trim(),
          externalLink: externalLink.trim(),
          logo: logoUrl || undefined,
        });
      } else {
        creado = await weeBizService.createBusiness({
          ownerId: activeUid,
          name: name.trim(),
          description: description.trim(),
          subcategory: subcategory.trim(),
          categoryId: selectedCategory,
          location: location.trim(),
          externalLink: externalLink.trim(),
          logo: logoUrl || undefined,
        });
      }
    } catch (e) {
      console.error('Error saving business:', e);
      notify(t('common.error'), t('weebiz.saveFailed'));
      /* No se guardó nada: se puede volver a intentar. */
      guardando.current = false;
      setSaving(false);
      return;
    }

    /* Guardado. La ref se queda echada: este formulario ya hizo su trabajo y no vuelve a escribir. */
    setSaving(false);
    setGuardado(true);
    if (creado !== null) {
      /*
       * Aquí se creaba además una IDENTIDAD para el negocio —un documento
       * `users/biz_<negocio>`— y se activaba como una tercera cara de la
       * cuenta. Ya no: el negocio queda guardado como negocio, que es lo que
       * es. La entidad que lo representará será una Página de la cuenta, y
       * las Páginas no son perfiles.
       */
      notify(t('weebiz.createdTitle'), t('weebiz.created'));
      navigation.goBack();
      navigation.navigate('WeeBizProfile', { businessId: creado });
    } else {
      notify(t('common.done'), t('weebiz.updated'));
      navigation.goBack();
    }
  };

  const categoriesToShow = showAllCategories ? WEEBIZ_CATEGORIES : WEEBIZ_MAIN_CATEGORIES;
  const getCat = (id: string) => WEEBIZ_CATEGORIES.find(c => c.id === id);

  const renderCategoryChip = (cat: WeeBizCategory) => {
    const isSelected = selectedCategory === cat.id;
    return (
      <TouchableOpacity
        key={cat.id}
        style={[
          styles.categoryChip,
          {
            backgroundColor: isSelected ? cat.color + '25' : theme.colors.surface,
            borderColor: isSelected ? cat.color : theme.colors.border,
          },
        ]}
        onPress={() => setSelectedCategory(cat.id)}
        activeOpacity={0.7}
      >
        <Ionicons name={cat.icon as any} size={scale(16)} color={isSelected ? cat.color : theme.colors.textSecondary} />
        <Text style={[
          styles.categoryChipText,
          { color: isSelected ? cat.color : theme.colors.text },
        ]}>
          {t(cat.clave)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <EspacioDeEscritura
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isEditing ? t('weebiz.editBusinessTitle') : t('weebiz.registerBusinessTitle')}
        </Text>
        <View style={{ width: scale(32) }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <Text style={[styles.label, { color: theme.colors.text }]}>{t('weebiz.logo')}</Text>
        <TouchableOpacity
          style={[styles.logoPicker, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={pickLogo}
          activeOpacity={0.7}
        >
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="camera-outline" size={scale(32)} color={theme.colors.textSecondary} />
              <Text style={[styles.logoPlaceholderText, { color: theme.colors.textSecondary }]}>
                {t('weebiz.addLogo')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text style={[styles.label, { color: theme.colors.text }]}>{t('weebiz.businessNameRequired')}</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder={t('weebiz.businessNamePlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={60}
        />

        {/* Category */}
        <Text style={[styles.label, { color: theme.colors.text }]}>{t('weebiz.categoryRequired')}</Text>
        <View style={styles.categoriesWrap}>
          {categoriesToShow.map(renderCategoryChip)}
        </View>
        {!showAllCategories && (
          <TouchableOpacity onPress={() => setShowAllCategories(true)} style={styles.showMoreLink}>
            <Text style={[styles.showMoreText, { color: theme.colors.primary }]}>
              {t('weebiz.moreCategories')}
            </Text>
            <Ionicons name="chevron-down" size={scale(14)} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {/* Subcategory (free text) */}
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t('weebiz.speciality')}
        </Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={subcategory}
          onChangeText={setSubcategory}
          placeholder={selectedCategory
            ? t('weebiz.specialityPlaceholder', { ejemplos: t(getSubcategoryHint(selectedCategory)) })
            : t('weebiz.specialityNeedsCategory')}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={40}
        />

        {/* Description */}
        <Text style={[styles.label, { color: theme.colors.text }]}>{t('weebiz.description')}</Text>
        <TextInput
          style={[styles.textArea, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('weebiz.businessDescriptionPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />

        {/* Location */}
        <Text style={[styles.label, { color: theme.colors.text }]}>{t('weebiz.location')}</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={location}
          onChangeText={setLocation}
          placeholder={t('weebiz.locationPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={80}
        />

        {/* External link */}
        <Text style={[styles.label, { color: theme.colors.text }]}>{t('weebiz.externalLink')}</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={externalLink}
          onChangeText={setExternalLink}
          placeholder={t('weebiz.externalLinkPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
          maxLength={120}
        />

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: (name.trim() && selectedCategory) ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={handleSave}
          disabled={saving || guardado || !name.trim() || !selectedCategory}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEditing ? t('weebiz.saveChanges') : t('weebiz.createBusiness')}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: scale(40) }} />
      </ScrollView>
    </EspacioDeEscritura>
  );
};

/*
 * Hint de subcategoría según la categoría seleccionada.
 *
 * Devuelve la CLAVE, no la frase: esto vive fuera del componente, donde no hay
 * traductor. La resuelve quien pinta, con `t()`, y entra por hueco en el
 * «Ej: …» del campo. El id de la categoría se queda como está: es lo que se
 * guarda en el negocio.
 */
function getSubcategoryHint(categoryId: string): string {
  const hints: Record<string, string> = {
    'servicios-profesionales': 'weebiz.specialityHintProfessionalServices',
    'tiendas': 'weebiz.specialityHintStores',
    'comida-restaurantes': 'weebiz.specialityHintFood',
    'belleza-estetica': 'weebiz.specialityHintBeauty',
    'salud-bienestar': 'weebiz.specialityHintHealth',
    'creadores-influencers': 'weebiz.specialityHintCreators',
    'hogar-inmobiliaria': 'weebiz.specialityHintHome',
    'tecnologia-digital': 'weebiz.specialityHintTech',
    'servicios-tecnicos': 'weebiz.specialityHintTechnicalServices',
    'creativos-freelancers': 'weebiz.specialityHintCreatives',
    'empresas-corporativo': 'weebiz.specialityHintCompanies',
    'automotriz': 'weebiz.specialityHintAutomotive',
    'educacion': 'weebiz.specialityHintEducation',
    'viajes-turismo': 'weebiz.specialityHintTravel',
    'mascotas': 'weebiz.specialityHintPets',
    'eventos-entretenimiento': 'weebiz.specialityHintEvents',
    'finanzas': 'weebiz.specialityHintFinance',
    'legal': 'weebiz.specialityHintLegal',
    'espiritualidad': 'weebiz.specialityHintSpirituality',
    'otros': 'weebiz.specialityHintOther',
  };
  return hints[categoryId] || 'weebiz.specialityHintDefault';
}

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
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  // Labels
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold as any,
    marginBottom: SPACING.xs,
    marginTop: SPACING.lg,
  },
  // Logo picker
  logoPicker: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  logoPreview: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
  },
  logoPlaceholder: {
    alignItems: 'center',
    gap: scale(4),
  },
  logoPlaceholderText: {
    fontSize: FONT_SIZE.xs,
  },
  // Inputs
  input: {
    height: scale(44),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  textArea: {
    minHeight: scale(100),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  // Categories
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  showMoreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: SPACING.sm,
  },
  showMoreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium as any,
  },
  // Save
  saveBtn: {
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  saveBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold as any,
    color: '#FFF',
  },
});

export default WeeBizRegisterScreen;
