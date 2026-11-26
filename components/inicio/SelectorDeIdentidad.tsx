import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { IconoWee } from '../icons/IconoWee';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { MENU_ITEM } from '../../constants/weeMenu';
import { FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import HojaDeAlterEgos from '../HojaDeAlterEgos';

/**
 * EL SELECTOR DE IDENTIDAD DEL MENÚ: [ Real | Weë ].
 *
 * Las dos caras a la vista; se toca la que se quiere. Sustituye a las dos filas
 * «Perfil Real» y «Perfil Weë» que tenía el menú.
 *
 * ESTE COMPONENTE NO CAMBIA NADA POR SU CUENTA. No guarda cuál es la identidad
 * activa, no la decide y no toca el tema: recibe cuál está puesta y avisa de
 * cuál se ha tocado. Quien lo monta —el cajón del ☰ y la barra lateral— llama a
 * la MISMA lógica de siempre: `switchIdentity()` de `UserProfileContext` y
 * `setThemeMode()` de `ThemeContext` (Perfil Real = app clara, Perfil Weë = app
 * oscura). Si la cuenta todavía no tiene Perfil Weë, el lado Weë lleva a
 * crearlo, como hacía la fila «Crear mi perfil Weë».
 *
 * CON VARIOS ALTER EGOS (2026-11-23): tocar el lado Weë cuando ya está puesto
 * abre la hoja «Cambiar de cara» (`HojaDeAlterEgos`) con todos los alter egos.
 *
 * El lado puesto se marca con el acento de interacción (violeta): es un estado,
 * no una acción. Cada lado dice el nombre de su perfil —«Perfil Real», «Perfil
 * Weë»—, que sale del diccionario como en el resto del menú.
 */
export type Identidad = 'real' | 'hidi';

interface Props {
  /** La identidad activa, leída del contexto por quien monta el selector. */
  activa: Identidad;
  /** false si la cuenta todavía no tiene Perfil Weë. */
  tieneWee: boolean;
  onElegir: (destino: Identidad) => void;
}

const LADOS: { id: Identidad; clave: string; icono: 'perfilReal' | 'perfilWee' }[] = [
  { id: 'real', clave: MENU_ITEM.realProfile.clave, icono: MENU_ITEM.realProfile.icono as 'perfilReal' },
  { id: 'hidi', clave: MENU_ITEM.weeProfile.clave, icono: MENU_ITEM.weeProfile.icono as 'perfilWee' },
];

const SelectorDeIdentidad: React.FC<Props> = ({ activa, tieneWee, onElegir }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const [hoja, setHoja] = useState(false);
  const tocar = (id: Identidad) => (id === 'hidi' && activa === 'hidi' && tieneWee ? setHoja(true) : onElegir(id));
  return (
    <>
    <View style={[styles.carril, dir.contenedor, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {LADOS.map((lado) => {
        const puesta = activa === lado.id;
        const porCrear = lado.id === 'hidi' && !tieneWee;
        const color = puesta ? theme.colors.text : theme.colors.textSecondary;
        return (
          <Pressable
            key={lado.id}
            onPress={() => tocar(lado.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: puesta }}
            aria-pressed={puesta}
            accessibilityLabel={porCrear ? t('menu.createWeeProfile') : t(puesta ? 'menu.profileActive' : 'menu.switchToProfile', { perfil: t(lado.clave) })}
            style={({ pressed }) => [
              styles.lado,
              puesta && { backgroundColor: theme.colors.interactionStrong, borderColor: theme.colors.interactionBorder },
              pressed && !puesta && styles.pulsado,
            ]}
          >
            <IconoWee name={lado.icono} size={scale(16)} color={color} />
            <Text style={[styles.texto, dir.texto, { color, fontWeight: puesta ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {t(lado.clave)}
            </Text>
          </Pressable>
        );
      })}
    </View>
    <HojaDeAlterEgos visible={hoja} onClose={() => setHoja(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  carril: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: scale(3),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: scale(2),
  },
  /* Cada lado, la mitad del carril y con alto para el dedo. */
  lado: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    minHeight: scale(38),
    /* Poco relleno a los lados: un nombre largo («リアルプロフィール», «Echtes Profil») cabe sin cortarse. */
    paddingHorizontal: scale(4),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  pulsado: { opacity: 0.7 },
  /* El texto se reduce (en nativo, hasta el 75 %) antes de cortarse; en la web, a 11 (nueve caracteres de katakana a 11 caben en el hueco de 390; a 12 no). */
  texto: { fontSize: Platform.OS === 'web' ? scale(11) : FONT_SIZE.sm, flexShrink: 1 },
});

export default SelectorDeIdentidad;
