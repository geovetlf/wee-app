import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDireccion } from '../../hooks/useDireccion';
import { MARCA } from '../../constants/marca';
import { RellenoDeMarca } from '../GradienteDeMarca';

/**
 * LO QUE ES DE LA CUENTA, DENTRO DE WEË VERSIÓN CREATOR.
 *
 * Proyectos, creaciones, un trabajo de Weë AI y la billetera son de una cuenta.
 * Desde la navegación de creator, sin sesión ya llevan a iniciarla; pero abiertos
 * por su dirección (`/creator/proyectos`, `/creator/weeai/design`…) se veían como si
 * la cuenta estuviera vacía —«Crear mi primer proyecto»— o se quedaban «pensando»
 * para siempre. Aquí se dice lo que pasa y se ofrece la salida, dentro del marco.
 *
 * Mientras Firebase no ha contestado nadie es invitado: se espera, sin montar la
 * pantalla, para que una persona con sesión que recarga no vea el inicio de
 * sesión un instante (el flujo guiado lo pedía al montarse sin `user`).
 *
 * Es un envoltorio de creator: la pantalla de dentro es la misma de la versión
 * app y no cambia.
 */
export const PideCuentaEnCreator: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  return (
    <View style={[styles.centro, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="person-circle-outline" size={36} color={theme.colors.textSecondary} />
        <Text style={[styles.texto, dir.texto, { color: theme.colors.text }]}>{t('auth.signInToContinue')}</Text>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          style={[styles.boton, { backgroundColor: theme.colors.accent }, Platform.OS === 'web' && ({ cursor: 'pointer' } as object)]}
        >
          {/* Acción principal: el degradado de marca (docs/COLOR-DE-MARCA.md); el acento sólido queda debajo como respaldo. */}
          <RellenoDeMarca radio={999} />
          <Text style={styles.botonTexto}>{t('menu.signIn')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const Esperando: React.FC = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.centro, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator color={theme.colors.textSecondary} />
    </View>
  );
};

/** Envuelve una pantalla de la cuenta: espera a la sesión y, sin ella, pide iniciarla. */
export const conCuentaEnCreator = <P extends object>(Pantalla: React.ComponentType<P>): React.FC<P> => {
  const ConCuenta: React.FC<P> = (props) => {
    const { user, loading } = useAuth();
    if (loading) return <Esperando />;
    if (!user) return <PideCuentaEnCreator />;
    return <Pantalla {...props} />;
  };
  return ConCuenta;
};

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  tarjeta: {
    width: '100%', maxWidth: 420, alignItems: 'center', gap: 14, paddingVertical: 28, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  texto: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  boton: { minHeight: 40, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { color: MARCA.sobrePrimario, fontSize: 14, fontWeight: '600' },
});
