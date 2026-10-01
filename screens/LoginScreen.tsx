import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, googleSignInDisponible } from '../contexts/AuthContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useNavigation } from '@react-navigation/native';
import EspacioDeEscritura from '../components/EspacioDeEscritura';

const LoginScreen: React.FC = () => {
  const { t, idioma } = useIdioma();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { user, signIn, signInWithGoogle, signInAnonymously, resetPassword } = useAuth();
  /*
   * Un botón que no puede funcionar no se ofrece.
   *
   * Mientras Google no esté activado como proveedor en Firebase, el módulo nativo
   * se queda sin configurar y tocar el botón solo devolvía un error del SDK. Se
   * esconde, y quedan los dos caminos que sí funcionan: el correo y el invitado.
   */
  const conGoogle = googleSignInDisponible();
  const navigation = useNavigation<any>();

  // Cerrar la modal automáticamente cuando se detecte que el usuario inició sesión.
  // Más robusto que depender de navigation.goBack() post-await, que puede fallar
  // si el estado de auth se propaga después del return del signIn.
  useEffect(() => {
    if (user) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.getParent()?.goBack?.();
      }
    }
  }, [user, navigation]);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        alert(t('auth.fillAllFields'));
      } else {
        Alert.alert(t('common.error'), t('auth.fillAllFields'));
      }
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Login exitoso - cerrar el modal de login
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);

      let errorMessage = t('auth.signInFailed');

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = t('auth.errUserNotFound');
          break;
        case 'auth/wrong-password':
          errorMessage = t('auth.errWrongPassword');
          break;
        case 'auth/invalid-email':
          errorMessage = t('auth.errInvalidEmail');
          break;
        case 'auth/user-disabled':
          errorMessage = t('auth.errUserDisabled');
          break;
        /* El SDK actual contesta esto tanto a una contraseña mal como a un email que no existe. */
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
          errorMessage = t('auth.errWrongPassword');
          break;
        default:
          /* `error.message` es texto de máquina («Firebase: Error (auth/…)»): al registro, no a la persona. */
          console.warn('Inicio de sesión fallido:', error?.code || error);
          errorMessage = t('auth.signInFailed');
      }

      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert(t('auth.authErrorTitle'), errorMessage);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Login exitoso - cerrar el modal
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: any) {
      console.warn('Google Sign-In fallido:', error?.code || error);
      const message = t('auth.googleFailed');
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(t('common.error'), message);
      }
    } finally {
      // Siempre resetear el loading
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);

      console.warn('Acceso como invitado fallido:', error?.code || error);
      const message = t('auth.anonymousFailed');
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(t('common.error'), message);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      const message = t('auth.emailRequired');
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(t('auth.emailRequiredTitle'), message);
      }
      return;
    }

    try {
      /* El correo, en el idioma de la app (Firebase usa su plantilla de ese idioma). */
      await resetPassword(email, idioma);
      const message = t('auth.resetEmailSent');
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(t('auth.emailSentTitle'), message);
      }
    } catch (error: any) {
      console.warn('Restablecer contraseña fallido:', error?.code || error);
      const message = t('auth.resetFailed');
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(t('common.error'), message);
      }
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F5B731" />
        <Text style={styles.loadingText}>{t('auth.signingIn')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Handle bar para cerrar el modal */}
      <TouchableOpacity
        style={styles.handleBar}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.getParent()?.goBack();
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.handle} />
      </TouchableOpacity>
      <EspacioDeEscritura
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            {/* Logo y título */}
            <View style={styles.header}>
              <Image
                source={require('../assets/images/weelogo-vertical.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>{t('auth.welcome')}</Text>
              <Text style={styles.subtitle}>{t('auth.signInToContinue')}</Text>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('auth.password')}</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity style={styles.primaryButton} onPress={handleEmailLogin}>
                <Text style={styles.primaryButtonText}>{t('menu.signIn')}</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Login Button: solo si de verdad puede funcionar */}
              {conGoogle && (
                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                  <Image
                    source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                    style={styles.googleLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.googleButtonText}>{t('auth.continueWithGoogle')}</Text>
                </TouchableOpacity>
              )}

              {/* Anonymous Login Button */}
              <TouchableOpacity style={styles.anonymousButton} onPress={handleAnonymousLogin}>
                <Ionicons name="person-outline" size={20} color="#1F2937" style={styles.anonymousIcon} />
                <Text style={styles.anonymousButtonText}>{t('auth.enterAsGuest')}</Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>{t('auth.noAccount')}</Text>
                <TouchableOpacity onPress={navigateToRegister}>
                  <Text style={styles.registerLink}>{t('auth.registerHere')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </EspacioDeEscritura>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    maxWidth: 408,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#1F2937',
    marginTop: 14,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  eyeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#F5B731',
    fontSize: 12,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#F5B731',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#F5B731',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#6B7280',
    paddingHorizontal: 12,
    fontSize: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  googleLogo: {
    width: 17,
    height: 17,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  anonymousButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  anonymousIcon: {
    marginRight: 10,
  },
  anonymousButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  registerText: {
    color: '#6B7280',
    fontSize: 12,
  },
  registerLink: {
    color: '#F5B731',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginScreen;
