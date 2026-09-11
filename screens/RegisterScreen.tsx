import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notify } from '../utils/notify';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import EspacioDeEscritura from '../components/EspacioDeEscritura';

const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { user, signUp, signInWithGoogle, signInAnonymously } = useAuth();
  const navigation = useNavigation<any>();

  // Cerrar la modal automáticamente cuando se detecte que el usuario inició sesión.
  useEffect(() => {
    if (user) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.getParent()?.goBack?.();
      }
    }
  }, [user, navigation]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const { email, password, confirmPassword } = formData;

    if (!email.trim()) {
      notify('Falta tu email', 'Escribe tu email para continuar.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      notify('Revisa tu email', 'Ese email no parece válido.');
      return false;
    }

    if (!password) {
      notify('Falta tu contraseña', 'Escribe una contraseña para continuar.');
      return false;
    }

    if (password.length < 6) {
      notify('Contraseña muy corta', 'Usa al menos 6 caracteres.');
      return false;
    }

    if (password !== confirmPassword) {
      notify('Las contraseñas no coinciden', 'Escribe la misma contraseña en los dos campos.');
      return false;
    }

    return true;
  };

  const handleEmailRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { email, password } = formData;
      await signUp(email, password);
      // La navegación se manejará automáticamente por el estado de autenticación
      // NO poner loading = false aquí, mantener el spinner hasta que la redirección ocurra
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);

      let errorMessage = 'Error al crear la cuenta';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Ya existe una cuenta con este email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Registro con email no permitido';
          break;
        default:
          errorMessage = error.message;
      }

      notify('No pudimos crear tu cuenta', errorMessage);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Login exitoso
    } catch (error: any) {
      notify('No pudimos continuar con Google', error.message);
    } finally {
      // Siempre resetear el loading
      setLoading(false);
    }
  };

  const handleAnonymousAccess = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
      // Login exitoso
    } catch (error: any) {
      notify('No pudimos entrar como invitado', error.message);
    } finally {
      // Siempre resetear el loading
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F5B731" />
        <Text style={styles.loadingText}>Creando cuenta...</Text>
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
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>Únete a la comunidad Weë</Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleEmailRegister}>
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O regístrate con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Register Button */}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleRegister}>
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.googleLogo}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Continuar con Google</Text>
            </TouchableOpacity>

            {/* Anonymous Access Button */}
            <TouchableOpacity style={styles.anonymousButton} onPress={handleAnonymousAccess}>
              <Ionicons name="person-outline" size={20} color="#1F2937" style={styles.anonymousIcon} />
              <Text style={styles.anonymousButtonText}>Entrar como invitado</Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Inicia sesión aquí</Text>
              </TouchableOpacity>
            </View>

            {/* Terms Notice */}
            <Text style={styles.termsText}>
              Al crear una cuenta, aceptas nuestros{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('Help' as never, { section: 'legal' } as never)}>Términos de servicio</Text>
              {' '}y{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('Help' as never, { section: 'legal' } as never)}>Política de privacidad</Text>
            </Text>
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
    paddingVertical: 16,
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
    marginTop: 10,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    padding: 10,
    fontSize: 13,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#F5B731',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#F5B731',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#6B7280',
    paddingHorizontal: 10,
    fontSize: 11,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  googleLogo: {
    width: 15,
    height: 15,
    marginRight: 8,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  anonymousButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  anonymousIcon: {
    marginRight: 8,
  },
  anonymousButtonText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  loginText: {
    color: '#6B7280',
    fontSize: 11,
  },
  loginLink: {
    color: '#F5B731',
    fontSize: 11,
    fontWeight: '600',
  },
  termsText: {
    color: '#6B7280',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  termsLink: {
    color: '#F5B731',
    fontWeight: '500',
  },
});

export default RegisterScreen;
