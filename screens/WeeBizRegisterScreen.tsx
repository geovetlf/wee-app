import React, { useState, useCallback } from 'react';
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

type RoutePropType = RouteProp<MainStackParamList, 'WeeBizRegister'>;
type NavProp = StackNavigationProp<MainStackParamList>;

const WeeBizRegisterScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, setBizProfile } = useUserProfile();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();

  const editBusiness = (route.params as any)?.business as Business | undefined;
  const isEditing = !!editBusiness;
  const activeUid = userProfile?.uid || user?.uid;

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
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
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
    if (!activeUid) {
      Alert.alert('Error', 'Debes iniciar sesión.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre de tu negocio.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Campo requerido', 'Selecciona una categoría.');
      return;
    }

    try {
      setSaving(true);

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
        Alert.alert('Listo', 'Tu negocio ha sido actualizado.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const bizId = await weeBizService.createBusiness({
          ownerId: activeUid,
          name: name.trim(),
          description: description.trim(),
          subcategory: subcategory.trim(),
          categoryId: selectedCategory,
          location: location.trim(),
          externalLink: externalLink.trim(),
          logo: logoUrl || undefined,
        });

        // Crear perfil de usuario para el negocio (identidad biz)
        try {
          await usersService.createBizProfile(activeUid, bizId, {
            displayName: name.trim(),
            photoURL: logoUrl || undefined,
          });
          // Cargar el perfil biz recién creado en el contexto
          const bizUserProfile = await usersService.getBizProfile(bizId);
          if (bizUserProfile) {
            setBizProfile(bizUserProfile);
          }
          console.log('🏢 Perfil BIZ creado para negocio:', bizId);
        } catch (bizProfileErr) {
          console.error('Error creando perfil BIZ:', bizProfileErr);
        }

        Alert.alert('Negocio creado', 'Tu negocio ya está en Weë Biz. Ahora puedes cambiar a tu perfil de negocio desde el menú.', [
          { text: 'Ver perfil', onPress: () => {
            navigation.goBack();
            navigation.navigate('WeeBizProfile', { businessId: bizId });
          }},
        ]);
      }
    } catch (e) {
      console.error('Error saving business:', e);
      Alert.alert('Error', 'No se pudo guardar el negocio.');
    } finally {
      setSaving(false);
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
          {cat.label}
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
          {isEditing ? 'Editar negocio' : 'Registrar negocio'}
        </Text>
        <View style={{ width: scale(32) }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Logo</Text>
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
                Agregar logo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Nombre del negocio *</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Café Central"
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={60}
        />

        {/* Category */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Categoría *</Text>
        <View style={styles.categoriesWrap}>
          {categoriesToShow.map(renderCategoryChip)}
        </View>
        {!showAllCategories && (
          <TouchableOpacity onPress={() => setShowAllCategories(true)} style={styles.showMoreLink}>
            <Text style={[styles.showMoreText, { color: theme.colors.primary }]}>
              Ver más categorías
            </Text>
            <Ionicons name="chevron-down" size={scale(14)} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {/* Subcategory (free text) */}
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Especialidad
        </Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={subcategory}
          onChangeText={setSubcategory}
          placeholder={selectedCategory ? `Ej: ${getSubcategoryHint(selectedCategory)}` : 'Selecciona categoría primero'}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={40}
        />

        {/* Description */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Descripción</Text>
        <TextInput
          style={[styles.textArea, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Cuéntale a la gente sobre tu negocio..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />

        {/* Location */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Ubicación</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={location}
          onChangeText={setLocation}
          placeholder="Ej: Lima, Perú"
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={80}
        />

        {/* External link */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Link externo</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={externalLink}
          onChangeText={setExternalLink}
          placeholder="Ej: www.minegocio.com"
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
          disabled={saving || !name.trim() || !selectedCategory}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Guardar cambios' : 'Crear negocio'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: scale(40) }} />
      </ScrollView>
    </EspacioDeEscritura>
  );
};

// Hint de subcategoría según la categoría seleccionada
function getSubcategoryHint(categoryId: string): string {
  const hints: Record<string, string> = {
    'servicios-profesionales': 'Consultoría, Coaching...',
    'tiendas': 'Ropa, Tecnología, Accesorios...',
    'comida-restaurantes': 'Sushi, Hamburguesas, Postres...',
    'belleza-estetica': 'Barbería, Spa, Maquillaje...',
    'salud-bienestar': 'Nutrición, Psicología, Gym...',
    'creadores-influencers': 'Streamer, Blogger, Educador...',
    'hogar-inmobiliaria': 'Alquiler, Decoración, Venta...',
    'tecnologia-digital': 'Desarrollo web, Marketing, IA...',
    'servicios-tecnicos': 'Electricista, Gasfitero...',
    'creativos-freelancers': 'Fotografía, Diseño, Video...',
    'empresas-corporativo': 'Startup, Agencia, Marca...',
    'automotriz': 'Taller, Repuestos, Lavado...',
    'educacion': 'Cursos, Academia, Profesor...',
    'viajes-turismo': 'Tours, Hotel, Guía...',
    'mascotas': 'Veterinaria, Cuidado, Adopción...',
    'eventos-entretenimiento': 'DJ, Shows, Animación...',
    'finanzas': 'Inversiones, Seguros, Cripto...',
    'legal': 'Asesoría legal, Estudio jurídico...',
    'espiritualidad': 'Tarot, Meditación, Coaching...',
    'otros': 'Describe tu negocio...',
  };
  return hints[categoryId] || 'Describe tu especialidad...';
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
