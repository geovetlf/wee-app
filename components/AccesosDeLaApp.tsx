import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { refNavegacion } from '../navigation/refNavegacion';
import { useSinLeer } from '../hooks/useConversaciones';
import { FONT_WEIGHT } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * BUSCAR, WEETALK Y NOTIFICACIONES, ARRIBA A LA DERECHA.
 *
 * Con las cuatro pestañas de Weë —Crear, Inspira, Proyectos y Perfil (decisión
 * del usuario, 2026-09-27)— estos tres dejaron la barra de abajo, pero no la
 * aplicación: son la parte social de todos los días y siguen a un toque, en el
 * mismo sitio en las cuatro pestañas. Abren las MISMAS pantallas de siempre, por
 * los mismos caminos; ninguna ruta nueva.
 *
 * Los no leídos de WeeTalk salen de la suscripción que ya existía
 * (`useSinLeer`), la misma que usaba la barra.
 */
/**
 * `sobreImagen`: encima de una foto —la portada de tu perfil—, los iconos van en
 * blanco sobre un círculo oscuro, como los demás botones que flotan ahí.
 */
const AccesosDeLaApp: React.FC<{ sobreImagen?: boolean }> = ({ sobreImagen }) => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const sinLeer = useSinLeer();

  const ir = (pantalla: string, params?: object) => {
    if (!refNavegacion.isReady()) return;
    if (!user) {
      (refNavegacion as any).navigate('Register');
      return;
    }
    (refNavegacion as any).navigate(pantalla, params);
  };

  const boton = (icono: string, etiqueta: string, alPulsar: () => void, aviso = 0) => (
    <TouchableOpacity
      onPress={alPulsar}
      style={[styles.boton, sobreImagen && styles.sobreImagen]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Ionicons name={icono as any} size={scale(sobreImagen ? 19 : 22)} color={sobreImagen ? '#FFFFFF' : theme.colors.text} />
      {aviso > 0 && (
        <View style={[styles.aviso, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.avisoTexto} numberOfLines={1}>{aviso > 99 ? '99+' : aviso}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.fila}>
      {boton('search-outline', t('nav.search'), () => ir('Search'))}
      {boton('chatbubble-outline', t('nav.talk'), () => ir('Main', { screen: 'Inbox' }), sinLeer)}
      {boton('notifications-outline', t('nav.notifications'), () => ir('Main', { screen: 'Home', params: { screen: 'Notifications' } }))}
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  boton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sobreImagen: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', marginLeft: 6 },
  aviso: {
    position: 'absolute', top: 6, right: 4, minWidth: scale(17), height: scale(17), borderRadius: scale(9),
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(4),
  },
  avisoTexto: { color: '#1F2937', fontSize: scale(10), fontWeight: FONT_WEIGHT.semibold },
});

export default AccesosDeLaApp;
