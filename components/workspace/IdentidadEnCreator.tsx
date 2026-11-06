import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useDireccion } from '../../hooks/useDireccion';
import AvatarDisplay from '../avatars/AvatarDisplay';

const isWeb = Platform.OS === 'web';

type Identidad = 'real' | 'hidi';

/* Las dos caras de la cuenta. El identificador guardado del Perfil Weë sigue siendo el heredado (`hidi`). */
const CARAS: readonly { id: Identidad; clave: string }[] = [
  { id: 'real', clave: 'menu.realProfile' },
  { id: 'hidi', clave: 'menu.weeProfile' },
];

/**
 * LA IDENTIDAD ACTIVA, DENTRO DE WEË VERSIÓN CREATOR.
 *
 * El avatar de la cabecera dice con qué cara se está trabajando y, si la cuenta
 * tiene Perfil Weë, deja cambiarla aquí mismo. No es otra identidad ni otra
 * lógica: es el mismo `switchIdentity()` del contexto compartido y el mismo tema
 * de la app que usan el cajón y el selector de la cabecera de la versión app
 * (`components/Header.tsx`, `irAIdentidad`). Creator sigue clara (`TemaClaro`).
 *
 * Reglas que no se tocan:
 *   - ENTRAR en creator no cambia nada: esta pieza solo actúa cuando la persona
 *     toca una de las dos caras. Montarla no llama a nada.
 *   - Nunca crea perfiles. Sin Perfil Weë solo enseña la cara puesta.
 *   - Recargar /creator conserva lo elegido aquí por `RecuerdoDelPerfil`, que ya
 *     guarda la cara puesta mientras se está en creator y la olvida al salir.
 *   - Publicar es de la versión app: aquí no hay nada social.
 */
const IdentidadEnCreator: React.FC<{ onAjustes: () => void }> = ({ onAjustes }) => {
  const { theme, setThemeMode } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { userProfile, activeProfileType, hasWeeProfile, switchIdentity } = useUserProfile();
  const [abierto, setAbierto] = useState(false);

  /*
   * Un toque, un cambio (como el selector de la cabecera de la app): se recuerda
   * el destino pedido hasta que llega, para que dos toques seguidos no se anulen.
   */
  const pedida = useRef<Identidad | null>(null);
  useEffect(() => {
    if (pedida.current === activeProfileType) pedida.current = null;
  }, [activeProfileType]);

  const elegir = useCallback((destino: Identidad) => {
    const efectiva = pedida.current ?? activeProfileType;
    setAbierto(false);
    if (efectiva === destino) return;
    pedida.current = destino;
    switchIdentity();
    setThemeMode(destino === 'hidi' ? 'dark' : 'light');
  }, [activeProfileType, switchIdentity, setThemeMode]);

  if (!user) return null;

  const puesta = CARAS.find((c) => c.id === activeProfileType) ?? CARAS[0];
  const nombre = userProfile?.displayName || user.displayName || t(puesta.clave);
  const etiquetaPuesta = t('menu.profileActive', { perfil: t(puesta.clave) });

  const avatar = (tam: number) => (
    <AvatarDisplay
      size={tam}
      avatarType={userProfile?.avatarType || 'predefined'}
      avatarId={userProfile?.avatarId || 'male'}
      photoURL={userProfile?.photoURL}
      photoURLThumbnail={userProfile?.photoURLThumbnail}
      backgroundColor={theme.colors.accent}
      showBorder={false}
    />
  );

  return (
    <>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={etiquetaPuesta}
        hitSlop={6}
        style={[styles.boton, isWeb && ({ cursor: 'pointer' } as object)]}
      >
        {avatar(30)}
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.fondo} onPress={() => setAbierto(false)} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Pressable
            /* El panel no cierra al tocarlo: solo el fondo. */
            onPress={() => {}}
            style={[
              styles.panel,
              { top: insets.top + 52, backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              dir.esRTL ? { left: 12 } : { right: 12 },
            ]}
          >
            <View style={styles.quien}>
              {avatar(40)}
              <View style={styles.quienTextos}>
                <Text style={[styles.nombre, dir.texto, { color: theme.colors.text }]} numberOfLines={1}>{nombre}</Text>
                <Text style={[styles.detalle, dir.texto, { color: theme.colors.textSecondary }]} numberOfLines={1}>{etiquetaPuesta}</Text>
              </View>
            </View>
            {hasWeeProfile && (
              <View style={[styles.caras, { borderTopColor: theme.colors.border }]}>
                {CARAS.map((c) => {
                  const activa = c.id === activeProfileType;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => elegir(c.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activa }}
                      accessibilityLabel={t(activa ? 'menu.profileActive' : 'menu.switchToProfile', { perfil: t(c.clave) })}
                      style={(e: any) => [
                        styles.fila,
                        activa && { backgroundColor: theme.colors.glow },
                        !activa && e.hovered && { backgroundColor: theme.colors.surface },
                        isWeb && ({ cursor: 'pointer' } as object),
                      ] as any}
                    >
                      <Ionicons
                        name={activa ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={activa ? theme.colors.accentDark : theme.colors.textSecondary}
                      />
                      <Text style={[styles.filaTexto, dir.texto, { color: theme.colors.text }, activa && styles.filaActiva]}>{t(c.clave)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={[styles.caras, { borderTopColor: theme.colors.border }]}>
              <Pressable
                onPress={() => { setAbierto(false); onAjustes(); }}
                accessibilityRole="button"
                accessibilityLabel={t('menu.settings')}
                style={(e: any) => [styles.fila, e.hovered && { backgroundColor: theme.colors.surface }, isWeb && ({ cursor: 'pointer' } as object)] as any}
              >
                <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.filaTexto, dir.texto, { color: theme.colors.text }]}>{t('menu.settings')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  boton: { borderRadius: 999, flexShrink: 0 },
  fondo: { flex: 1 },
  panel: {
    position: 'absolute', width: 280, maxWidth: '92%', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  quien: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  quienTextos: { flex: 1, minWidth: 0, gap: 2 },
  nombre: { fontSize: 14.5, fontWeight: '600' },
  detalle: { fontSize: 12.5, lineHeight: 17 },
  caras: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4, paddingHorizontal: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingHorizontal: 8, borderRadius: 8 },
  filaTexto: { flex: 1, fontSize: 13.5 },
  filaActiva: { fontWeight: '600' },
});

export default IdentidadEnCreator;
