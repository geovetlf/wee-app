import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import * as ImagePicker from 'expo-image-picker';
import { generateAvatarWithGemini, saveGeneratedAvatar, performAvatarReplacement, uploadImageForSwap, saveFaceSwapResult } from '../services/avatarGenerationService';
import { usersService } from '../services/firestoreService';
import { creditsService, creditsShortfall } from '../services/creditsService';
import { useWallet } from '../hooks/useWallet';

// --- Option data ---
const GENDER_OPTIONS = [
  { id: 'male', clave: 'aiAvatar.genderMale' },
  { id: 'female', clave: 'aiAvatar.genderFemale' },
  { id: 'other', clave: 'aiAvatar.genderOther' },
];

const SKIN_TONES = [
  { id: 'tone1', color: '#FDDBB4' },
  { id: 'tone2', color: '#E8B98D' },
  { id: 'tone3', color: '#D09B6F' },
  { id: 'tone4', color: '#AE7B4E' },
  { id: 'tone5', color: '#7C5139' },
  { id: 'tone6', color: '#4A2F1E' },
];

const HAIR_STYLES = [
  { id: 'short', clave: 'aiAvatar.hairShort' },
  { id: 'medium', clave: 'aiAvatar.hairMedium' },
  { id: 'long', clave: 'aiAvatar.hairLong' },
  { id: 'curly', clave: 'aiAvatar.hairCurly' },
  { id: 'wavy', clave: 'aiAvatar.hairWavy' },
  { id: 'bald', clave: 'aiAvatar.hairBald' },
];

const AGE_RANGES = [
  { id: 'young', label: '18-30' },
  { id: 'adult', label: '30-50' },
  { id: 'senior', label: '50+' },
];

const EYE_COLOR_OPTIONS = [
  { id: 'brown', clave: 'aiAvatar.eyeBrown' },
  { id: 'blue', clave: 'aiAvatar.eyeBlue' },
  { id: 'green', clave: 'aiAvatar.eyeGreen' },
  { id: 'hazel', clave: 'aiAvatar.eyeHazel' },
  { id: 'black', clave: 'aiAvatar.eyeBlack' },
  { id: 'gray', clave: 'aiAvatar.eyeGray' },
];

const FACE_SHAPE_OPTIONS = [
  { id: 'oval', clave: 'aiAvatar.faceOval' },
  { id: 'round', clave: 'aiAvatar.faceRound' },
  { id: 'angular', clave: 'aiAvatar.faceAngular' },
  { id: 'long', clave: 'aiAvatar.faceLong' },
  { id: 'square', clave: 'aiAvatar.faceSquare' },
];

const FACIAL_HAIR_OPTIONS = [
  { id: 'none', clave: 'aiAvatar.hairNone' },
  { id: 'stubble', clave: 'aiAvatar.hairStubble' },
  { id: 'full_beard', clave: 'aiAvatar.hairFullBeard' },
  { id: 'mustache', clave: 'aiAvatar.hairMustache' },
  { id: 'goatee', clave: 'aiAvatar.hairGoatee' },
];

const ACCESSORIES_OPTIONS = [
  { id: 'none', clave: 'aiAvatar.accNone' },
  { id: 'glasses', clave: 'aiAvatar.accGlasses' },
  { id: 'sunglasses', clave: 'aiAvatar.accSunglasses' },
  { id: 'earrings', clave: 'aiAvatar.accEarrings' },
  { id: 'cap', clave: 'aiAvatar.accCap' },
  { id: 'headscarf', clave: 'aiAvatar.accHeadscarf' },
  { id: 'piercing', clave: 'aiAvatar.accPiercing' },
];

const EXPRESSION_OPTIONS = [
  { id: 'smile', clave: 'aiAvatar.expSmile' },
  { id: 'serious', clave: 'aiAvatar.expSerious' },
  { id: 'relaxed', clave: 'aiAvatar.expRelaxed' },
  { id: 'confident', clave: 'aiAvatar.expConfident' },
  { id: 'mysterious', clave: 'aiAvatar.expMysterious' },
];

// Límite temporal de generaciones de avatar IA
const MAX_AI_AVATAR_GENERATIONS = 2;

const AiAvatarScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const { userProfile, updateLocalProfile } = useUserProfile();
  const navigation = useNavigation();

  // Sin Credits suficientes: aviso con saldo, costo y acceso a la tienda (docs/CREDITS.md)
  const showGenerationError = (error: unknown, fallback: string) => {
    const short = creditsShortfall(error);
    if (!short) {
      Alert.alert(t('common.error'), fallback);
      return;
    }
    const message = t('aiAvatar.creditsDetail', { saldo: formato.numero(short.available), coste: formato.numero(short.required) });
    if (Platform.OS === 'web') {
      if (window.confirm(t('aiAvatar.notEnoughWeb', { detalle: message }))) (navigation as any).navigate('CreditStore');
      return;
    }
    Alert.alert(t('aiAvatar.notEnoughTitle'), message, [
      { text: t('aiAvatar.notNow'), style: 'cancel' },
      { text: t('aiAvatar.getCredits'), onPress: () => (navigation as any).navigate('CreditStore') },
    ]);
  };

  // Contador de generaciones
  const generationCount = userProfile?.aiAvatarGenerationCount || 0;
  const hasReachedLimit = generationCount >= MAX_AI_AVATAR_GENERATIONS;

  // Whether the user already has an AI avatar
  const [showWizard, setShowWizard] = useState(false);
  const hasAiAvatar = !!userProfile?.aiAvatarPortraitUrl && !showWizard;

  // Wizard step
  const [step, setStep] = useState<1 | 2>(1);

  // Selection state — Step 1 (Rostro base)
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedSkinTone, setSelectedSkinTone] = useState<string | null>(null);
  const [selectedHairStyle, setSelectedHairStyle] = useState<string | null>(null);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);

  // Selection state — Step 2 (Detalles del rostro)
  const [selectedEyeColor, setSelectedEyeColor] = useState<string | null>(null);
  const [selectedFaceShape, setSelectedFaceShape] = useState<string | null>(null);
  const [selectedFacialHair, setSelectedFacialHair] = useState<string | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<string | null>(null);

  // Selection state — Step 2 (continued)
  const [selectedExpression, setSelectedExpression] = useState<string | null>(null);

  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Generated URL from Gemini (single image)
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);

  const step1Complete = selectedGender && selectedSkinTone && selectedHairStyle && selectedAgeRange;
  const step2Complete = selectedEyeColor && selectedFaceShape && selectedExpression;

  const getSelections = () => ({
    gender: selectedGender!,
    skinTone: selectedSkinTone!,
    hairStyle: selectedHairStyle!,
    ageRange: selectedAgeRange!,
    eyeColor: selectedEyeColor!,
    faceShape: selectedFaceShape!,
    facialHair: selectedFacialHair || 'none',
    accessories: selectedAccessories || 'none',
    expression: selectedExpression!,
  });

  // Precio del avatar: lo dice el Credit Engine (getCreditCost), nunca la pantalla.
  const wallet = useWallet();
  const walletBalance = typeof wallet.balance === 'number' ? wallet.balance : null;
  const [avatarCost, setAvatarCost] = useState<number | null>(null);
  const [avatarCostError, setAvatarCostError] = useState(false);
  useEffect(() => {
    let alive = true;
    creditsService
      .getCost('wee_avatar')
      .then((credits) => { if (alive) { setAvatarCost(credits); setAvatarCostError(false); } })
      .catch(() => { if (alive) { setAvatarCost(null); setAvatarCostError(true); } });
    return () => { alive = false; };
  }, []);
  // No se genera sin saber lo que cuesta
  const canGenerate = step2Complete && avatarCost !== null && !avatarCostError;

  const handleNextStep = () => {
    if (step === 1 && step1Complete) setStep(2);
  };

  const handleGenerate = async () => {
    if (!step1Complete || !step2Complete) return;
    if (!user?.uid) {
      Alert.alert(t('common.error'), t('aiAvatar.signInFirst'));
      return;
    }

    // Verificar límite de generaciones
    if (hasReachedLimit) {
      Alert.alert(
        t('aiAvatar.limitTitle'),
        t('aiAvatar.limitBody', { contador: MAX_AI_AVATAR_GENERATIONS }),
        [{ text: t('aiAvatar.understood') }]
      );
      return;
    }

    const selections = getSelections();

    setLoading(true);
    setLoadingMessage(t('aiAvatar.creatingAvatar'));
    try {
      const imageUrl = await generateAvatarWithGemini(selections);
      setGeneratedAvatarUrl(imageUrl);
      setGenerated(true);

      // Incrementar contador de generaciones
      const newCount = generationCount + 1;
      if (userProfile?.id) {
        await usersService.update(userProfile.id, { aiAvatarGenerationCount: newCount });
        updateLocalProfile({ aiAvatarGenerationCount: newCount });
      }
    } catch (error: any) {
      console.error('Error generating avatar:', error);
      showGenerationError(error, t('aiAvatar.generateFailed'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleStartRegenerate = () => {
    // Verificar límite antes de mostrar el wizard
    if (hasReachedLimit) {
      Alert.alert(
        t('aiAvatar.limitTitle'),
        t('aiAvatar.limitBody', { contador: MAX_AI_AVATAR_GENERATIONS }),
        [{ text: t('aiAvatar.understood') }]
      );
      return;
    }
    setGenerated(false);
    setGeneratedAvatarUrl(null);
    setStep(1);
    setShowWizard(true);
  };

  // Upload a custom photo as avatar
  const handleUploadAvatar = async () => {
    if (!user?.uid || !userProfile?.id) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('aiAvatar.permissionTitle'), t('aiAvatar.galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setLoading(true);
    setLoadingMessage(t('aiAvatar.uploadingPhoto'));
    try {
      const uploadedUrl = await uploadImageForSwap(user.uid, asset.uri, asset.base64);
      await usersService.update(userProfile.id, {
        photoURL: uploadedUrl,
        photoURLThumbnail: uploadedUrl,
        aiAvatarPortraitUrl: uploadedUrl,
      });
      updateLocalProfile({
        photoURL: uploadedUrl,
        photoURLThumbnail: uploadedUrl,
        aiAvatarPortraitUrl: uploadedUrl,
        avatarType: 'custom',
      });
      setGeneratedAvatarUrl(uploadedUrl);
      setGenerated(true);
      setShowWizard(false);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert(t('common.error'), t('aiAvatar.uploadFailed'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRegenerate = async () => {
    if (!step1Complete || !step2Complete) {
      setGenerated(false);
      setGeneratedAvatarUrl(null);
      setStep(1);
      return;
    }

    // Verificar límite de generaciones
    if (hasReachedLimit) {
      Alert.alert(
        t('aiAvatar.limitTitle'),
        t('aiAvatar.limitBody', { contador: MAX_AI_AVATAR_GENERATIONS }),
        [{ text: t('aiAvatar.understood') }]
      );
      return;
    }

    setLoading(true);
    setLoadingMessage(t('aiAvatar.creatingAnother'));
    try {
      const imageUrl = await generateAvatarWithGemini(getSelections());
      setGeneratedAvatarUrl(imageUrl);
      setGenerated(true);

      // Incrementar contador de generaciones
      const newCount = generationCount + 1;
      if (userProfile?.id) {
        await usersService.update(userProfile.id, { aiAvatarGenerationCount: newCount });
        updateLocalProfile({ aiAvatarGenerationCount: newCount });
      }
    } catch (error: any) {
      console.error('Error regenerating avatar:', error);
      showGenerationError(error, t('aiAvatar.regenerateFailed'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleUseAsAvatar = async () => {
    if (!generatedAvatarUrl || !user?.uid || !userProfile?.id) return;

    setLoading(true);
    setLoadingMessage(t('aiAvatar.savingAvatar'));
    try {
      const { avatarUrl } = await saveGeneratedAvatar(
        user.uid,
        userProfile.id,
        generatedAvatarUrl,
        getSelections(),
      );
      // Also set as profile photo when skipping face swap
      await usersService.update(userProfile.id, { photoURL: avatarUrl, photoURLThumbnail: avatarUrl });
      updateLocalProfile({
        photoURL: avatarUrl,
        photoURLThumbnail: avatarUrl,
        aiAvatarPortraitUrl: avatarUrl,
        aiAvatarSelections: getSelections(),
        avatarType: 'custom',
      });
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving avatar:', error);
      Alert.alert(t('common.error'), t('aiAvatar.saveAvatarFailed'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // --- Face Swap ---
  const [swapResultUrl, setSwapResultUrl] = useState<string | null>(null);

  // Pick image and do avatar replacement using Gemini
  const pickImageForSwap = async (fromCamera: boolean, avatarUrl: string) => {
    if (!user?.uid) return;

    let result;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('aiAvatar.permissionTitle'), t('aiAvatar.cameraPermission'));
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
        aspect: [3, 4],
        base64: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('aiAvatar.permissionTitle'), t('aiAvatar.galleryPermission'));
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
        aspect: [3, 4],
        base64: true,
      });
    }

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setLoading(true);
    setLoadingMessage(t('aiAvatar.uploadingPhoto'));
    try {
      const uploadedUrl = await uploadImageForSwap(user.uid, asset.uri, asset.base64);
      setLoadingMessage(t('aiAvatar.swapping'));
      const generatedImageUrl = await performAvatarReplacement(uploadedUrl, avatarUrl);
      setLoadingMessage(t('aiAvatar.savingResult'));
      const savedUrl = await saveFaceSwapResult(user.uid, generatedImageUrl);
      setSwapResultUrl(savedUrl);
    } catch (error: any) {
      console.error('Error avatar replacement:', error);
      showGenerationError(error, t('aiAvatar.replaceFailed'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Save the swapped photo as profile photo + save avatar selections
  const handleUseSwapAsProfile = async () => {
    if (!swapResultUrl || !user?.uid || !userProfile?.id || !generatedAvatarUrl) return;

    setLoading(true);
    setLoadingMessage(t('aiAvatar.savingProfilePhoto'));
    try {
      // Save avatar to Firebase
      const { avatarUrl } = await saveGeneratedAvatar(
        user.uid,
        userProfile.id,
        generatedAvatarUrl,
        getSelections(),
      );
      // Update profile with the swap result as photoURL
      await usersService.update(userProfile.id, {
        photoURL: swapResultUrl,
        photoURLThumbnail: swapResultUrl,
      });
      updateLocalProfile({
        photoURL: swapResultUrl,
        photoURLThumbnail: swapResultUrl,
        aiAvatarPortraitUrl: avatarUrl,
        aiAvatarSelections: getSelections(),
        avatarType: 'custom',
      });
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert(t('common.error'), t('aiAvatar.saveFailed'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const STEP_LABELS = [t('aiAvatar.stepBase'), t('aiAvatar.stepDetails')];

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2].map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && (
            <View
              style={[
                styles.stepLineSegment,
                { backgroundColor: step >= s ? theme.colors.accent : theme.colors.border },
              ]}
            />
          )}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: step >= s ? theme.colors.accent : 'transparent',
                  borderColor: step >= s ? theme.colors.accent : theme.colors.border,
                },
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                { color: step >= s ? theme.colors.accent : theme.colors.textSecondary },
              ]}
            >
              {STEP_LABELS[i]}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );

  // --- Chip helper ---
  const renderChip = (
    id: string,
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? '#FFFFFF' : theme.colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // --- State B: already has AI avatar ---
  const renderExistingAvatar = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Current AI avatar */}
      <View style={styles.existingAvatarContainer}>
        {userProfile?.aiAvatarPortraitUrl ? (
          <Image
            source={{ uri: userProfile.aiAvatarPortraitUrl }}
            style={styles.existingAvatarImageCircle}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.existingAvatarPlaceholder,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="person-outline" size={scale(80)} color={theme.colors.textSecondary} />
            <Text style={[styles.placeholderLabel, { color: theme.colors.textSecondary }]}>
              {t('aiAvatar.currentAvatar')}
            </Text>
          </View>
        )}
      </View>

      {/* Face Swap */}
      <View style={[styles.sectionBlock, { marginTop: SPACING.xxl }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('aiAvatar.swapTitle')}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
          {t('aiAvatar.swapSubtitle')}
        </Text>

        <View style={styles.swapButtonsRow}>
          <TouchableOpacity
            style={[styles.swapButton, { backgroundColor: theme.colors.accent }]}
            activeOpacity={0.8}
            onPress={() => userProfile?.aiAvatarPortraitUrl && pickImageForSwap(true, userProfile.aiAvatarPortraitUrl)}
          >
            <Ionicons name="camera" size={scale(22)} color="#FFFFFF" />
            <Text style={styles.swapButtonText}>{t('aiAvatar.takePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swapButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
            activeOpacity={0.8}
            onPress={() => userProfile?.aiAvatarPortraitUrl && pickImageForSwap(false, userProfile.aiAvatarPortraitUrl)}
          >
            <Ionicons name="images" size={scale(22)} color={theme.colors.accent} />
            <Text style={[styles.swapButtonText, { color: theme.colors.accent }]}>{t('aiAvatar.gallery')}</Text>
          </TouchableOpacity>
        </View>

        {swapResultUrl && (
          <View style={styles.swapPreviewContainer}>
            <Image source={{ uri: swapResultUrl }} style={styles.swapResultImage} resizeMode="contain" />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.accent, marginTop: SPACING.md }]}
              onPress={async () => {
                if (!swapResultUrl || !userProfile?.id) return;
                setLoading(true);
                setLoadingMessage(t('aiAvatar.updatingProfilePhoto'));
                try {
                  await usersService.update(userProfile.id, { photoURL: swapResultUrl, photoURLThumbnail: swapResultUrl });
                  updateLocalProfile({ photoURL: swapResultUrl, photoURLThumbnail: swapResultUrl });
                  setSwapResultUrl(null);
                  Alert.alert(t('aiAvatar.doneTitle'), t('aiAvatar.photoUpdated'));
                } catch (e: any) {
                  Alert.alert(t('common.error'), t('aiAvatar.photoUpdateFailed'));
                } finally {
                  setLoading(false);
                  setLoadingMessage('');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={scale(18)} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{t('aiAvatar.useAsProfilePhoto')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: SPACING.lg }]}
        activeOpacity={0.7}
        onPress={handleUploadAvatar}
      >
        <Ionicons name="image-outline" size={scale(18)} color={theme.colors.text} />
        <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{t('aiAvatar.uploadAnotherPhoto')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, {
          borderColor: hasReachedLimit ? theme.colors.border : theme.colors.border,
          backgroundColor: theme.colors.surface,
          marginTop: SPACING.sm,
          opacity: hasReachedLimit ? 0.5 : 1,
        }]}
        activeOpacity={0.7}
        onPress={handleStartRegenerate}
      >
        <Ionicons name="refresh" size={scale(18)} color={hasReachedLimit ? theme.colors.textSecondary : theme.colors.text} />
        <Text style={[styles.secondaryButtonText, { color: hasReachedLimit ? theme.colors.textSecondary : theme.colors.text }]}>
          {hasReachedLimit
            ? t('aiAvatar.limitReachedCount', { usadas: generationCount, maximo: MAX_AI_AVATAR_GENERATIONS })
            : t('aiAvatar.regenerateWithAi')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // --- State A: no AI avatar yet ---
  const renderCreation = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Disclaimer banner */}
      <View style={[styles.disclaimerBanner, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
        <Ionicons name="information-circle-outline" size={scale(20)} color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.disclaimerText, { color: theme.colors.text }]}>
            {t('aiAvatar.intro')}
          </Text>
          <Text style={[styles.disclaimerText, { color: hasReachedLimit ? theme.colors.error : theme.colors.textSecondary, marginTop: SPACING.xs }]}>
            {hasReachedLimit
              ? t('aiAvatar.allGenerationsUsed', { contador: MAX_AI_AVATAR_GENERATIONS })
              : t('aiAvatar.generationsCount', { usadas: generationCount, maximo: MAX_AI_AVATAR_GENERATIONS })
            }
          </Text>
        </View>
      </View>

      {/* Upload custom photo option */}
      {!generated && (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: SPACING.xxl }]}
          activeOpacity={0.7}
          onPress={handleUploadAvatar}
        >
          <Ionicons name="image-outline" size={scale(18)} color={theme.colors.text} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{t('aiAvatar.uploadPhotoAsAvatar')}</Text>
        </TouchableOpacity>
      )}

      {/* Step indicator */}
      {!generated && renderStepIndicator()}

      {!generated ? (
        <>
          {step === 1 && (
            <>
              {/* Gender */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.gender')}</Text>
                <View style={styles.chipRow}>
                  {GENDER_OPTIONS.map((opt) =>
                    renderChip(opt.id, t(opt.clave), selectedGender === opt.id, () =>
                      setSelectedGender(opt.id),
                    ),
                  )}
                </View>
              </View>

              {/* Skin tone */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.skinTone')}</Text>
                <View style={styles.skinToneRow}>
                  {SKIN_TONES.map((tone) => (
                    <TouchableOpacity
                      key={tone.id}
                      style={[
                        styles.skinToneCircle,
                        { backgroundColor: tone.color },
                        selectedSkinTone === tone.id && {
                          borderColor: theme.colors.accent,
                          borderWidth: scale(3),
                        },
                      ]}
                      onPress={() => setSelectedSkinTone(tone.id)}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>
              </View>

              {/* Hair style */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.hairStyle')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {HAIR_STYLES.map((opt) =>
                    renderChip(opt.id, t(opt.clave), selectedHairStyle === opt.id, () =>
                      setSelectedHairStyle(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Age range */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.ageRange')}</Text>
                <View style={styles.chipRow}>
                  {/* Los rangos son cifras —18-30, 50+—: se leen igual en todos los idiomas. */}
                  {AGE_RANGES.map((opt) =>
                    renderChip(opt.id, opt.label, selectedAgeRange === opt.id, () =>
                      setSelectedAgeRange(opt.id),
                    ),
                  )}
                </View>
              </View>

              {/* Next button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: step1Complete ? theme.colors.accent : theme.colors.surface, opacity: step1Complete ? 1 : 0.5 }]}
                onPress={handleNextStep}
                disabled={!step1Complete}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: step1Complete ? '#FFFFFF' : theme.colors.textSecondary }]}>
                  {t('aiAvatar.nextStep')}
                </Text>
                <Ionicons name="arrow-forward" size={scale(18)} color={step1Complete ? '#FFFFFF' : theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              {/* Eye color */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.eyeColor')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {EYE_COLOR_OPTIONS.map((opt) =>
                    renderChip(opt.id, t(opt.clave), selectedEyeColor === opt.id, () =>
                      setSelectedEyeColor(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Face shape */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.faceShape')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {FACE_SHAPE_OPTIONS.map((opt) =>
                    renderChip(opt.id, t(opt.clave), selectedFaceShape === opt.id, () =>
                      setSelectedFaceShape(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Facial hair (show for male/other) */}
              {selectedGender !== 'female' && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.facialHair')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {FACIAL_HAIR_OPTIONS.map((opt) =>
                      renderChip(opt.id, t(opt.clave), selectedFacialHair === opt.id, () =>
                        setSelectedFacialHair(opt.id),
                      ),
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Accessories */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.accessories')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {ACCESSORIES_OPTIONS.map((opt) =>
                    renderChip(opt.id, t(opt.clave), selectedAccessories === opt.id, () =>
                      setSelectedAccessories(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Expression */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('aiAvatar.expression')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {EXPRESSION_OPTIONS.map((opt) =>
                    renderChip(opt.id, t(opt.clave), selectedExpression === opt.id, () =>
                      setSelectedExpression(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Back link */}
              <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={scale(16)} color={theme.colors.accent} />
                <Text style={[styles.backLinkText, { color: theme.colors.accent }]}>{t('aiAvatar.previousStep')}</Text>
              </TouchableOpacity>

              {/* Costo antes de generar: Weë nunca cobra sin decir cuánto */}
              <Text style={[styles.costNotice, { color: avatarCostError ? theme.colors.error : theme.colors.textSecondary }]}>
                {avatarCostError
                  ? t('weeai.costFailed')
                  : avatarCost === null
                    ? t('weeai.calculatingTheCost')
                    : t('weeai.avatarCost', {
                        credits: formato.numero(avatarCost),
                        saldo: walletBalance !== null ? ' · ' + t('weeai.youHaveLeft', { saldo: formato.numero(walletBalance) }) : '',
                      })}
              </Text>

              {/* Generate button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: canGenerate ? theme.colors.accent : theme.colors.surface, opacity: canGenerate ? 1 : 0.5 }]}
                onPress={handleGenerate}
                disabled={!canGenerate}
                activeOpacity={0.8}
                accessibilityLabel={avatarCost === null
                  ? t('weeai.calculatingTheCost')
                  : t('aiAvatar.generateForCredits', { credits: formato.numero(avatarCost) })}
              >
                <Ionicons name="sparkles" size={scale(18)} color={canGenerate ? '#FFFFFF' : theme.colors.textSecondary} />
                <Text style={[styles.primaryButtonText, { color: canGenerate ? '#FFFFFF' : theme.colors.textSecondary }]}>
                  {avatarCost === null
                    ? t('weeai.calculatingTheCost')
                    : t('aiAvatar.generateButton', { credits: formato.numero(avatarCost) })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <>
          {!swapResultUrl ? (
            <>
              {/* Avatar preview - single image from Gemini */}
              <View style={styles.previewContainer}>
                {generatedAvatarUrl && (
                  <Image
                    source={{ uri: generatedAvatarUrl }}
                    style={styles.previewImagePortrait}
                    resizeMode="cover"
                  />
                )}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text, textAlign: 'center', marginBottom: SPACING.sm }]}>
                {t('aiAvatar.generatedWithGemini')}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                {t('aiAvatar.nowTakeAPhoto')}
              </Text>

              {/* Take photo / gallery buttons */}
              <View style={styles.swapButtonsRow}>
                <TouchableOpacity
                  style={[styles.swapButton, { backgroundColor: theme.colors.accent }]}
                  activeOpacity={0.8}
                  onPress={() => generatedAvatarUrl && pickImageForSwap(true, generatedAvatarUrl)}
                >
                  <Ionicons name="camera" size={scale(22)} color="#FFFFFF" />
                  <Text style={styles.swapButtonText}>{t('aiAvatar.takePhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swapButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                  activeOpacity={0.8}
                  onPress={() => generatedAvatarUrl && pickImageForSwap(false, generatedAvatarUrl)}
                >
                  <Ionicons name="images" size={scale(22)} color={theme.colors.accent} />
                  <Text style={[styles.swapButtonText, { color: theme.colors.accent }]}>{t('aiAvatar.gallery')}</Text>
                </TouchableOpacity>
              </View>

              {/* Skip face swap — use avatar directly */}
              <TouchableOpacity
                style={[styles.skipLink]}
                onPress={handleUseAsAvatar}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipLinkText, { color: theme.colors.textSecondary }]}>
                  {t('aiAvatar.skipAndUse')}
                </Text>
              </TouchableOpacity>

              {/* Regenerate */}
              <TouchableOpacity
                style={[styles.backLink, { justifyContent: 'center', marginTop: SPACING.md }]}
                onPress={handleRegenerate}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={scale(16)} color={theme.colors.accent} />
                <Text style={[styles.backLinkText, { color: theme.colors.accent }]}>{t('aiAvatar.regenerate')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Face swap result */}
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: swapResultUrl }}
                  style={styles.swapResultImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text, textAlign: 'center', marginBottom: SPACING.lg }]}>
                {t('aiAvatar.swapResult')}
              </Text>

              {/* Action buttons */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleUseSwapAsProfile}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={scale(18)} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>{t('aiAvatar.useAsProfilePhoto')}</Text>
              </TouchableOpacity>

              <View style={[styles.previewActions, { marginTop: SPACING.md }]}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flex: 1 }]}
                  onPress={() => {
                    setSwapResultUrl(null);
                    if (generatedAvatarUrl) pickImageForSwap(true, generatedAvatarUrl);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={scale(16)} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{t('aiAvatar.anotherPhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flex: 1 }]}
                  onPress={() => {
                    setSwapResultUrl(null);
                    handleRegenerate();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={scale(16)} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{t('aiAvatar.newAvatar')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('aiAvatar.humanAvatar')}</Text>
        <View style={styles.headerRight} />
      </View>

      {hasAiAvatar ? renderExistingAvatar() : renderCreation()}

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingBox, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              {loadingMessage}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
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
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: scale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: scale(40),
  },
  // Disclaimer
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xxl,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    position: 'relative',
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: SPACING.xl,
  },
  stepDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    borderWidth: 2,
    marginBottom: SPACING.xs,
  },
  stepLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  stepLine: {
    position: 'absolute',
    top: scale(6),
    left: '35%',
    right: '35%',
    height: scale(2),
    zIndex: 0,
  },
  stepLineSegment: {
    width: scale(30),
    height: scale(2),
    marginTop: scale(-10),
    alignSelf: 'center',
  },
  // Sections
  sectionBlock: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Skin tones
  skinToneRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  skinToneCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: scale(2),
    borderColor: 'transparent',
  },
  // Buttons
  costNotice: {
    fontSize: scale(12),
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  primaryButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Back link
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  backLinkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  skipLinkText: {
    fontSize: FONT_SIZE.sm,
    textDecorationLine: 'underline',
  },
  // Preview — full body rectangular
  previewContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  previewImage: {
    width: scale(200),
    height: scale(300),
    borderRadius: BORDER_RADIUS.lg,
  },
  previewImagePortrait: {
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
  },
  previewPlaceholder: {
    width: scale(200),
    height: scale(300),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  placeholderLabel: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  // State B: existing avatar — full body rectangular
  existingAvatarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  existingAvatarPlaceholder: {
    width: scale(180),
    height: scale(270),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  // Existing avatar image
  existingAvatarImage: {
    width: scale(180),
    height: scale(270),
    borderRadius: BORDER_RADIUS.lg,
  },
  existingAvatarImageCircle: {
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
  },
  // Section subtitle
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    marginBottom: SPACING.lg,
  },
  // Face Swap
  swapButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  swapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  swapButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#FFFFFF',
  },
  swapPreviewContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  swapPreviewImage: {
    width: scale(280),
    height: scale(280),
    borderRadius: BORDER_RADIUS.lg,
  },
  swapResultImage: {
    width: scale(260),
    height: scale(400),
    borderRadius: BORDER_RADIUS.lg,
  },
  swapPreviewClose: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingBox: {
    padding: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
});

export default AiAvatarScreen;
