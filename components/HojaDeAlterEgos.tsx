import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useDireccion } from '../hooks/useDireccion';
import { useAvisosDeLosPersonajes, avisoSinLeer } from '../hooks/useCampanita';
import { MAXIMO_DE_ALTER_EGOS } from '../services/alterEgosService';
import { UserProfile } from '../services/firestoreService';
import AvatarDisplay from './avatars/AvatarDisplay';
import { FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SPACING } from '../constants/design';
import { scale } from '../utils/scale';
import { navegarEnLaRaiz } from '../navigation/refNavegacion';

const isWeb = Platform.OS === 'web';

/**
 * LA HOJA DE ALTER EGOS: «Cambiar de cara» (plan de alter egos, F6, 2026-11-23).
 *
 * Una cuenta tiene un Perfil Real y hasta cinco alter egos (Jay Reeds, Lina
 * Shade…). Esta es la ÚNICA lista de caras de la app; la usan la píldora de la
 * cabecera, el ☰ («Tus caras»), la barra lateral de escritorio, el selector de
 * identidad, la identidad de Creator y la pestaña de la barra inferior.
 *
 *   · Perfil Real primero, con avatar CIRCULAR; cada alter ego con avatar
 *     CUADRADO redondeado (así se distinguen de un vistazo);
 *   · un punto rojo si ese personaje dejó avisos sin revisar —se ve sin cambiar
 *     de cara—, y ✓ en la cara puesta;
 *   · tocar una fila CAMBIA a esa cara (sin confirmación: cambiar no publica nada);
 *   · el engranaje de un alter ego lleva a gestionarlo (borrarlo);
 *   · «+ Crear alter ego», con los huecos que quedan, si quedan.
 *
 * Aquí no se decide ninguna identidad: se pide el cambio a su dueño,
 * `UserProfileContext.switchIdentity(id)`, y el tema sale del DESTINO —claro con
 * el Real, oscuro con cualquier alter ego—, como siempre.
 */

/** Lo que hace cada cosa de la hoja, igual desde todos los sitios. */
export function useCambioDeCara() {
  const { switchIdentity, activeIdentityId, activeProfileType, realProfile, alterEgos = [] } = useUserProfile();
  const { setThemeMode } = useTheme();

  /** Pone esa cara. Devuelve false si ya era la puesta. */
  const elegir = useCallback((id: string): boolean => {
    const aReal = id === 'real' || id === realProfile?.uid;
    if (aReal ? activeProfileType === 'real' : id === activeIdentityId) return false;
    if (aReal) {
      switchIdentity('real');
      setThemeMode('light');
    } else {
      switchIdentity(id);
      setThemeMode('dark');
    }
    return true;
  }, [switchIdentity, setThemeMode, realProfile?.uid, activeProfileType, activeIdentityId]);

  /* A la pila principal, desde donde se abra (la cabecera, el cajón o la barra inferior, que vive fuera de las pantallas). */
  const crear = useCallback(() => { navegarEnLaRaiz('WeeProfileCreation'); }, []);
  const gestionar = useCallback((perfilId: string) => { navegarEnLaRaiz('RetirarAlterEgo', { perfilId }); }, []);
  const quedan = Math.max(0, MAXIMO_DE_ALTER_EGOS - alterEgos.length);

  return { elegir, crear, gestionar, quedan };
}

interface ListaProps {
  /** El ☰ pliega la lista con más de cuatro alter egos: la cara puesta y las tres más recientes, y «Ver todos». */
  plegable?: boolean;
  /** Después de cambiar de cara (para cerrar la hoja o el cajón). */
  onCambiada?: () => void;
  /** Envuelve las navegaciones (el cajón se cierra antes de navegar). */
  antesDeIr?: (ir: () => void) => void;
  /** Solo cambiar de cara: sin crear ni gestionar (Creator, que no tiene esas pantallas en su pila). */
  soloCambiar?: boolean;
}

/** Las caras, en fila: el cuerpo de la hoja y el bloque «Tus caras» del ☰ y de la barra lateral. */
export const ListaDeCaras: React.FC<ListaProps> = ({ plegable = false, onCambiada, antesDeIr, soloCambiar = false }) => {
  const t = useT();
  const { theme } = useTheme();
  const dir = useDireccion();
  const { user } = useAuth();
  const { realProfile, alterEgos = [], activeIdentityId, activeProfileType } = useUserProfile();
  const avisos = useAvisosDeLosPersonajes();
  const { elegir, crear, gestionar, quedan } = useCambioDeCara();
  const [todos, setTodos] = useState(false);
  const ir = (fn: () => void) => (antesDeIr ? antesDeIr(fn) : fn());

  if (!user) return null;

  const tocar = (id: string) => {
    elegir(id);
    onCambiada?.();
  };

  /* Más de cuatro: la puesta y las tres más recientes (las últimas en nacer). */
  const plegada = plegable && !todos && alterEgos.length > 4;
  const visibles: UserProfile[] = plegada
    ? alterEgos.filter((a, i) => a.uid === activeIdentityId || i >= alterEgos.length - 3)
    : alterEgos;

  const fila = (perfil: UserProfile | null, esReal: boolean) => {
    const id = esReal ? (realProfile?.uid ?? user.uid) : perfil!.uid;
    const puesta = esReal ? activeProfileType === 'real' : id === activeIdentityId;
    const nombre = perfil?.displayName || user.displayName || t(esReal ? 'menu.realProfile' : 'menu.weeProfile');
    const aviso = esReal ? null : avisos[id];
    const conAviso = avisoSinLeer(aviso);
    const pendientes = conAviso && typeof (aviso as { pendientes?: unknown })?.pendientes === 'number' ? (aviso as { pendientes: number }).pendientes : 0;
    const linea = esReal
      ? t('menu.realProfile')
      : conAviso ? t('alterEgo.toReviewCount', { contador: Math.max(1, pendientes) }) : t('menu.weeProfile');
    return (
      <View key={id} style={[styles.fila, dir.contenedor, puesta && { backgroundColor: theme.colors.interactionSoft }]}>
        <Pressable
          onPress={() => tocar(id)}
          accessibilityRole="button"
          accessibilityState={{ selected: puesta }}
          aria-selected={puesta}
          accessibilityLabel={puesta ? t('menu.profileActive', { perfil: nombre }) : t('alterEgo.switchTo', { nombre })}
          accessibilityHint={conAviso ? t('alterEgo.hasNotices') : undefined}
          style={(e: any) => [styles.filaToque, dir.contenedor, e.hovered && !puesta && { opacity: 0.85 }, isWeb && ({ cursor: 'pointer' } as object)] as any}
        >
          <View>
            <AvatarDisplay
              size={scale(36)}
              cuadrado={!esReal}
              avatarType={perfil?.avatarType || 'predefined'}
              avatarId={perfil?.avatarId || (esReal ? 'male' : 'ghost')}
              photoURL={typeof perfil?.photoURL === 'string' ? perfil.photoURL : undefined}
              photoURLThumbnail={typeof perfil?.photoURLThumbnail === 'string' ? perfil.photoURLThumbnail : undefined}
              backgroundColor={theme.colors.accent}
            />
            {conAviso ? <View style={[styles.punto, { borderColor: theme.colors.background }]} /> : null}
          </View>
          <View style={styles.textos}>
            <Text style={[styles.nombre, dir.texto, { color: theme.colors.text }, puesta && styles.nombrePuesto]} numberOfLines={1}>{nombre}</Text>
            <Text style={[styles.linea, dir.texto, { color: conAviso ? theme.colors.error : theme.colors.textSecondary }]} numberOfLines={1}>{linea}</Text>
          </View>
          {puesta ? <Ionicons name="checkmark" size={scale(18)} color={theme.colors.interaction} accessible={false} /> : null}
        </Pressable>
        {!esReal && !soloCambiar ? (
          <Pressable
            onPress={() => ir(() => gestionar(id))}
            accessibilityRole="button"
            accessibilityLabel={t('alterEgo.manage', { nombre })}
            hitSlop={8}
            style={[styles.gestionar, isWeb && ({ cursor: 'pointer' } as object)]}
          >
            <Ionicons name="settings-outline" size={scale(17)} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.lista}>
      {fila(realProfile, true)}
      {alterEgos.length === 0 && soloCambiar ? null : alterEgos.length === 0 ? (
        /* Ninguno: una invitación en lugar de la lista. */
        <View style={[styles.invitacion, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.invitacionTitulo, dir.texto, { color: theme.colors.text }]}>{t('alterEgo.firstTitle')}</Text>
          <Text style={[styles.invitacionTexto, dir.texto, { color: theme.colors.textSecondary }]}>{t('alterEgo.firstBody')}</Text>
          <Pressable
            onPress={() => ir(crear)}
            accessibilityRole="button"
            style={[styles.invitacionBoton, { backgroundColor: theme.colors.interactionStrong, borderColor: theme.colors.interactionBorder }]}
          >
            <Ionicons name="add" size={scale(16)} color={theme.colors.text} />
            <Text style={[styles.crearTexto, { color: theme.colors.text }]} numberOfLines={1}>{t('alterEgo.create')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {visibles.map((a) => fila(a, false))}
          {plegable && alterEgos.length > 4 ? (
            <Pressable onPress={() => setTodos(!todos)} accessibilityRole="button" accessibilityState={{ expanded: todos }} style={[styles.verTodos, dir.contenedor]}>
              <Text style={[styles.verTodosTexto, { color: theme.colors.textSecondary }]}>
                {todos ? t('alterEgo.seeLess') : t('alterEgo.seeAll', { contador: alterEgos.length })}
              </Text>
            </Pressable>
          ) : null}
          {soloCambiar ? null : quedan > 0 ? (
            <Pressable
              onPress={() => ir(crear)}
              accessibilityRole="button"
              style={[styles.crear, dir.contenedor, { borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
            >
              <Ionicons name="add" size={scale(18)} color={theme.colors.text} />
              <Text style={[styles.crearTexto, dir.texto, { color: theme.colors.text }]} numberOfLines={1}>{t('alterEgo.create')}</Text>
              <Text style={[styles.quedan, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('alterEgo.remaining', { contador: quedan })}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.lleno, dir.texto, { color: theme.colors.textSecondary }]}>{t('alterEgo.limitReached', { maximo: MAXIMO_DE_ALTER_EGOS })}</Text>
          )}
        </>
      )}
    </View>
  );
};

interface HojaProps {
  visible: boolean;
  onClose: () => void;
}

/** La hoja inferior «Cambiar de cara». */
const HojaDeAlterEgos: React.FC<HojaProps> = ({ visible, onClose }) => {
  const t = useT();
  const { theme } = useTheme();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.fondo, { backgroundColor: theme.colors.backdrop }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <Pressable
          onPress={() => {}}
          accessibilityViewIsModal
          style={[styles.hoja, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingBottom: insets.bottom + SPACING.md }]}
        >
          <View style={[styles.cabecera, dir.contenedor]}>
            <Text style={[styles.titulo, dir.texto, { color: theme.colors.text }]} accessibilityRole="header">{t('alterEgo.switchFace')}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} style={styles.cerrar}>
              <Ionicons name="close" size={scale(22)} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.cuerpo} contentContainerStyle={{ paddingBottom: SPACING.sm }}>
            {/* Cambiar de cara cierra la hoja; ir a crear o gestionar, también. */}
            <ListaDeCaras onCambiada={onClose} antesDeIr={(ir) => { onClose(); setTimeout(ir, 0); }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  lista: { gap: scale(2) },
  fila: { flexDirection: 'row', alignItems: 'center', borderRadius: BORDER_RADIUS.md, paddingEnd: scale(4) },
  filaToque: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: scale(10), minHeight: scale(52), paddingHorizontal: scale(8) },
  textos: { flex: 1, minWidth: 0, gap: scale(1) },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  nombrePuesto: { fontWeight: FONT_WEIGHT.semibold },
  linea: { fontSize: FONT_SIZE.xs },
  punto: { position: 'absolute', top: -2, end: -2, width: scale(11), height: scale(11), borderRadius: scale(6), backgroundColor: '#EF4444', borderWidth: 2 },
  gestionar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  crear: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8), minHeight: scale(46), paddingHorizontal: scale(12),
    marginTop: scale(4), borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderStyle: 'dashed',
  },
  crearTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, flexShrink: 1 },
  quedan: { marginStart: 'auto', fontSize: FONT_SIZE.xs, flexShrink: 0 },
  lleno: { fontSize: FONT_SIZE.xs, paddingHorizontal: scale(8), paddingTop: scale(6) },
  verTodos: { minHeight: 40, alignItems: 'center', paddingHorizontal: scale(8) },
  verTodosTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  invitacion: { marginTop: scale(6), padding: scale(12), borderRadius: BORDER_RADIUS.lg, borderWidth: 1, gap: scale(6) },
  invitacionTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  invitacionTexto: { fontSize: FONT_SIZE.sm, lineHeight: scale(19) },
  invitacionBoton: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: scale(6), minHeight: 40,
    paddingHorizontal: scale(14), borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginTop: scale(4), maxWidth: '100%',
  },
  fondo: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  hoja: {
    width: '100%', maxWidth: 480, maxHeight: '85%', borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, flexShrink: 1 },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flexGrow: 0 },
});

export default HojaDeAlterEgos;
