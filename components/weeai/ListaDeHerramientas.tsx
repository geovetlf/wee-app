import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IconoDireccional from '../IconoDireccional';
import { IconoWee } from '../icons/IconoWee';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useDireccion } from '../../hooks/useDireccion';
import { MUSICA_EN_LA_UI, PORTADA_DE_WEEAI, getExperienceById } from '../../constants/weeExperiences';
import { FASHION_MODOS } from '../../constants/fashionModes';
import { ESPACIO_WEEAI as SPACING, PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';

/* Moda es un GRUPO que reúne el ecosistema de Fashion (sus modos, las pantallas que ya existen) con el id interno de siempre, `business`, que no se movió. */
const ID_DE_MODA = 'business';
const HAY_MODA = (PORTADA_DE_WEEAI.puertas as readonly string[]).includes(ID_DE_MODA);

/**
 * LA LISTA DE HERRAMIENTAS DE WEËAI (la pantalla `Herramientas`, 2026-11-17): Weë Brain, Moda (grupo desplegable con los modos de Fashion),
 * WeëMusic tras su bandera y el avatar del Perfil Weë. Es la lista de siempre, sin cambios de lógica: antes vivía debajo de la portada y luego
 * en una hoja inferior; ahora es el contenido de su propia pantalla.
 */
export const ListaDeHerramientas: React.FC = () => {
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { hasWeeProfile } = useUserProfile();
  const [moda, setModa] = useState(false);

  const conCuenta = (fn: () => void) => () => (user ? fn() : navigation.navigate('Login'));
  const irA = (id: string) => navigation.navigate('Specialist', { id });
  const irAModa = (modo: string) => navigation.navigate('Specialist', { id: ID_DE_MODA, modo });
  const avatar = conCuenta(() => navigation.navigate(hasWeeProfile ? 'AiAvatar' : 'WeeProfileCreation'));

  const fila = (clave: string, icono: NombreDeIcono, onPress: () => void, texto?: string) => (
    <TouchableOpacity key={clave} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" style={[styles.herramienta, dir.contenedor]}>
      <IconoWee name={icono} size={scale(22)} color={P.tinta} />
      <Text style={[styles.texto, textoPortada(15, '500'), dir.texto, { color: P.tinta }]} numberOfLines={2}>{texto ?? t(clave)}</Text>
      <IconoDireccional name="chevron-forward" size={scale(16)} color={P.tintaSecundaria} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.lista}>
      {/* Weë Brain es marca: no se traduce. */}
      {fila('brain', 'cerebro', () => irA('brain'), 'Weë Brain')}
      {/* Moda: un grupo de una palabra que plega su ecosistema (los modos de Fashion, con sus pantallas de siempre). */}
      {HAY_MODA ? (
        <TouchableOpacity onPress={() => setModa((v) => !v)} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ expanded: moda }} aria-expanded={moda} style={[styles.herramienta, dir.contenedor]}>
          <IconoWee name="vestido" size={scale(22)} color={P.tinta} />
          <Text style={[styles.texto, textoPortada(15, '500'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t('weeai.filterFashion')}</Text>
          <IconoWee name={moda ? 'chevronArriba' : 'chevronAbajo'} size={scale(16)} color={P.tintaSecundaria} />
        </TouchableOpacity>
      ) : null}
      {HAY_MODA && moda ? FASHION_MODOS.map((f) => (
        <TouchableOpacity key={f.id} onPress={() => irAModa(f.id)} activeOpacity={0.7} accessibilityRole="button" style={[styles.herramienta, styles.subherramienta, dir.contenedor]}>
          <Text style={[styles.texto, textoPortada(15, '500'), dir.texto, { color: P.tinta }]} numberOfLines={2}>{t(f.claveTitulo)}</Text>
          <IconoDireccional name="chevron-forward" size={scale(16)} color={P.tintaSecundaria} />
        </TouchableOpacity>
      )) : null}
      {/* El nombre de WeëMusic es marca: sale de la experiencia, no se traduce. Detrás de la bandera MUSICA_EN_LA_UI (apagada por defecto). */}
      {MUSICA_EN_LA_UI ? fila('music', 'notas', () => irA('music'), getExperienceById('music')?.name) : null}
      {fila('weeai.avatarForWeeProfile', 'perfilWee', avatar)}
    </View>
  );
};

const styles = StyleSheet.create({
  lista: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: SPACING.sm },
  subherramienta: { marginStart: SPACING.lg },
  herramienta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 52, paddingHorizontal: SPACING.md, borderRadius: 14, backgroundColor: P.modulo },
  texto: { flex: 1, minWidth: 0 },
});
