import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { useT } from '../contexts/IdiomaContext';
import { notify } from '../utils/notify';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { usersService } from '../services/firestoreService';
import { uploadProfileImageFromUri } from '../services/storageService';
import {
  alterEgosService, AVATAR_DE_ALTER_EGO, claveDeErrorDeAlterEgo, ErrorDeAlterEgo, MAXIMO_DE_ALTER_EGOS, nuevaClaveDeAlterEgo,
} from '../services/alterEgosService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import AvatarPicker, { isDiceBearUrl } from '../components/avatars/AvatarPicker';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

/*
 * CREAR UN ALTER EGO (plan de alter egos, F6, 2026-11-23).
 *
 * Una cuenta puede tener hasta cinco alter egos (D1) y crearlos es GRATIS (D3).
 * La app NO escribe `users`: lo crea el servidor con la callable `crearAlterEgo`
 * (`alterEgosService.crear`), idempotente por una clave de este intento —dos
 * toques crean uno—, y devuelve su identidad. Después, si la persona eligió una
 * foto suya, se sube a la carpeta DE ESE alter ego (nunca a la de la cuenta: la
 * dirección no puede delatar quién está detrás) y se guarda en su perfil.
 *
 * Al terminar, «Listo»: empezar como el alter ego nuevo (cambia de cara y pone el
 * tema oscuro) o volver al Perfil Real.
 */
const WeeProfileCreationScreen: React.FC = () => {
  const t = useT();
  const { theme, setThemeMode } = useTheme();
  const { user } = useAuth();
  const { realProfile, setWeeProfile, switchIdentity, alterEgos = [] } = useUserProfile();
  const navigation = useNavigation();
  /* Una clave por intento: si la red corta y se vuelve a tocar, el servidor devuelve el mismo alter ego. */
  const claveDelIntento = useRef(nuevaClaveDeAlterEgo());
  const [creado, setCreado] = useState<{ uid: string; nombre: string } | null>(null);
  const lleno = alterEgos.length >= MAXIMO_DE_ALTER_EGOS && !creado;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedAvatarId, setSelectedAvatarId] = useState('ghost');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const canCreate = displayName.trim().length >= 3 && !isCreating && !lleno;

  const handleAvatarSelect = (avatarData: {
    type: 'predefined' | 'custom';
    uri?: string;
    avatarId?: string;
  }) => {
    setSelectedAvatarType(avatarData.type);
    if (avatarData.type === 'predefined' && avatarData.avatarId) {
      setSelectedAvatarId(avatarData.avatarId);
      setCustomAvatarUri(null);
    } else if (avatarData.type === 'custom' && avatarData.uri) {
      setCustomAvatarUri(avatarData.uri);
      setSelectedAvatarId('');
    }
  };

  const handleCreate = async () => {
    if (!canCreate || !user || !realProfile?.id) return;

    setIsCreating(true);
    try {
      const nombre = displayName.trim();
      /* 1 · El servidor crea el alter ego (perfil, entidad y hueco), con un avatar predefinido de la app. */
      const { uid } = await alterEgosService.crear({
        clave: claveDelIntento.current,
        displayName: nombre,
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        avatar: selectedAvatarType === 'predefined' && selectedAvatarId ? selectedAvatarId : AVATAR_DE_ALTER_EGO,
      });

      /* 2 · Su foto propia, si la hay: a SU carpeta (`profile/<alter ego>`), y luego a su perfil. */
      if (selectedAvatarType === 'custom' && customAvatarUri) {
        try {
          const foto = isDiceBearUrl(customAvatarUri)
            ? { fullSize: customAvatarUri, thumbnail: customAvatarUri }
            : await uploadProfileImageFromUri(customAvatarUri, uid);
          await usersService.update(uid, { avatarType: 'custom', photoURL: foto.fullSize, photoURLThumbnail: foto.thumbnail });
        } catch (fotoError) {
          console.error('❌ La foto del alter ego no se pudo subir:', fotoError);
          notify(t('common.error'), t('alterEgo.photoUploadFailed'));
        }
      }

      /* 3 · Su perfil, tal como quedó en el servidor, entra en la lista de caras. */
      const [perfil] = await usersService.getManyByUids([uid]).catch(() => []);
      if (perfil) setWeeProfile(perfil);
      setCreado({ uid, nombre: perfil?.displayName || nombre });
    } catch (error: any) {
      console.error('❌ Error creando el alter ego:', error?.message ?? error);
      /* Título traducido y frase de Weë: el detalle técnico se queda en el registro. */
      const motivo = error instanceof ErrorDeAlterEgo ? error.motivo : 'reintentar';
      notify(t('common.error'), t(claveDeErrorDeAlterEgo(motivo)));
    } finally {
      setIsCreating(false);
    }
  };

  /* «Empezar como Lina»: cambia a esa cara y viste la app de oscuro, como cualquier alter ego. */
  const empezarComo = () => {
    if (!creado) return;
    switchIdentity(creado.uid);
    setThemeMode('dark');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconoDireccional name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>{t('alterEgo.createTitle')}</Text>
        <View style={{ width: scale(24) }} />
      </View>

      {creado ? (
        <ScrollView contentContainerStyle={styles.listo}>
          <AvatarDisplay size={scale(88)} cuadrado avatarType={selectedAvatarType} avatarId={selectedAvatarType === 'predefined' ? selectedAvatarId : AVATAR_DE_ALTER_EGO} photoURL={selectedAvatarType === 'custom' && customAvatarUri ? customAvatarUri : undefined} backgroundColor={theme.colors.accent} />
          <Text style={[styles.listoTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('alterEgo.createdTitle', { nombre: creado.nombre })}</Text>
          <Text style={[styles.listoTexto, { color: theme.colors.textSecondary }]}>{t('alterEgo.createdBody')}</Text>
          <TouchableOpacity style={[styles.createButton, styles.listoBoton, { backgroundColor: theme.colors.accent }]} onPress={empezarComo} activeOpacity={0.8} accessibilityRole="button">
            <RellenoDeMarca radio={BORDER_RADIUS.md} />
            <Text style={styles.createButtonText} numberOfLines={2}>{t('alterEgo.startAs', { nombre: creado.nombre })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secundario, { borderColor: theme.colors.border }]} onPress={() => navigation.goBack()} activeOpacity={0.8} accessibilityRole="button">
            <Text style={[styles.secundarioTexto, { color: theme.colors.text }]} numberOfLines={2}>{t('alterEgo.backToReal')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
      <EspacioDeEscritura
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: theme.colors.accent + '15' }]}>
          <Ionicons name="shield-checkmark" size={scale(24)} color={theme.colors.accent} />
          <Text style={[styles.disclaimerText, { color: theme.colors.text }]}>
            {t('alterEgo.createIntro')} {t('alterEgo.privacyNote')}
          </Text>
        </View>
        {lleno ? (
          <Text style={[styles.limite, { color: theme.colors.error }]} accessibilityLiveRegion="polite">{t('alterEgo.limitReached', { maximo: MAXIMO_DE_ALTER_EGOS })}</Text>
        ) : null}

        {/* Avatar Selection */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('onboarding.weePhoto')}</Text>
        <View style={styles.avatarPickerContainer}>
          <AvatarPicker
            currentAvatar={customAvatarUri || undefined}
            currentAvatarType={selectedAvatarType}
            currentAvatarId={selectedAvatarId}
            onAvatarSelect={handleAvatarSelect}
            size={100}
          />
        </View>
        <Text style={[styles.avatarHint, { color: theme.colors.textSecondary }]}>
          {t('onboarding.weePhotoHint')}
        </Text>

        {/* Display Name */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('onboarding.weeName')}</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder={t('onboarding.weeNamePlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={20}
          autoCapitalize="none"
        />
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          {t('onboarding.weeNameCounter', { usados: displayName.length, maximo: 20, minimo: 3 })}
        </Text>

        {/* Bio */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('onboarding.weeBio')}</Text>
        <TextInput
          style={[styles.input, styles.bioInput, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder={t('onboarding.weeBioPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          maxLength={100}
          multiline
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 150);
          }}
        />
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          {t('profile.charCount', { usados: bio.length, maximo: 100 })}
        </Text>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, {
            backgroundColor: theme.colors.accent,
            opacity: canCreate ? 1 : 0.4,
          }]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.8}
        >
          <RellenoDeMarca radio={BORDER_RADIUS.md} />
          {isCreating ? (
            <ActivityIndicator color="#1F2937" />
          ) : (
            <>
              <Ionicons name="eye-off" size={scale(20)} color="#1F2937" />
              <Text style={styles.createButtonText}>{t('alterEgo.create')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Espacio extra para que el teclado no tape el contenido */}
        <View style={{ height: scale(120) }} />
      </ScrollView>
      </EspacioDeEscritura>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xl * 2,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  sectionLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
  },
  avatarPickerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarHint: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    marginBottom: SPACING.xs,
  },
  bioInput: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'right',
    marginBottom: SPACING.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  createButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
    flexShrink: 1,
  },
  limite: {
    fontSize: FONT_SIZE.sm,
    marginTop: -SPACING.md,
    marginBottom: SPACING.lg,
  },
  /* «Listo»: el avatar cuadrado, el nombre y los dos caminos. */
  listo: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  listoTitulo: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  listoTexto: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  listoBoton: {
    alignSelf: 'stretch',
    paddingHorizontal: SPACING.lg,
    overflow: 'hidden',
  },
  secundario: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  secundarioTexto: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
});

export default WeeProfileCreationScreen;
