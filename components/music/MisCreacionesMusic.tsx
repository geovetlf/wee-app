import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { assetsService, AssetDoc, estadoVisible, CLAVE_DE_ESTADO } from '../../services/assetsService';
import { Boton, ChipDeEstado, Nota, Tarjeta, TituloDeBloque } from './piezas';
import { SPACING, FONT_SIZE } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  /** Cuántas canciones enseñar (la portada enseña pocas; la biblioteca, una página). */
  limite?: number;
  titulo?: string;
}

type Carga = 'cargando' | 'ok' | 'error' | 'sinCuenta';

/**
 * MIS CREACIONES DE MÚSICA — LA BIBLIOTECA DE SIEMPRE, FILTRADA POR AUDIO.
 *
 * No es una biblioteca independiente: lee `assets` por `assetsService.listar(cuenta, { kind: 'audio' })` (el material de la
 * CUENTA, igual desde las dos caras) y delega todo lo demás —abrir, descargar, eliminar con confirmación, proyectos— a
 * `MisCreacionesScreen` y a Proyectos. Aquí solo se listan: título, estado, duración y fecha cuando existen. Si no hay
 * ninguna, estado vacío; las «canciones recientes» de la portada salen de aquí y de ningún otro sitio (nunca datos de muestra).
 * Un archivo de voz de WeeTalk no es una canción: hoy `assets` no distingue música de otro audio, y lo decimos en
 * `docs/MUSIC.md` (limitación) en lugar de filtrar por un campo que no existe.
 */
const MisCreacionesMusic: React.FC<Props> = ({ limite = 6, titulo }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AssetDoc[]>([]);
  const [carga, setCarga] = useState<Carga>(user ? 'cargando' : 'sinCuenta');

  const cargar = useCallback(async () => {
    if (!user) { setCarga('sinCuenta'); return; }
    setCarga('cargando');
    try {
      const pagina = await assetsService.listar(user.uid, { kind: 'audio', orden: 'recent' });
      setItems(pagina.items.slice(0, limite));
      setCarga('ok');
    } catch {
      setCarga('error');
    }
  }, [user, limite]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <View style={s.raiz}>
      <TituloDeBloque>{titulo ?? t('music.libraryTitle')}</TituloDeBloque>
      {carga === 'cargando' && <ActivityIndicator color={theme.colors.accentDark} accessibilityLabel={t('music.libraryLoading')} />}
      {carga === 'sinCuenta' && <Nota>{t('music.librarySignIn')}</Nota>}
      {carga === 'error' && (
        <Tarjeta><ChipDeEstado estado="error" /><Nota>{t('music.libraryError')}</Nota><Boton texto={t('music.retry')} icono="refresh-outline" onPress={cargar} /></Tarjeta>
      )}
      {carga === 'ok' && items.length === 0 && <Tarjeta><ChipDeEstado estado="vacio" /><Nota>{t('music.libraryEmpty')}</Nota></Tarjeta>}
      {carga === 'ok' && items.map((a) => (
        <View key={a.assetId} style={[s.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <Ionicons name="musical-note-outline" size={scale(22)} color={theme.colors.accentDark} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[s.nombre, { color: theme.colors.text }]}>{a.name || t('music.libraryUntitled')}</Text>
            <Text style={[s.meta, { color: theme.colors.textSecondary }]}>{t(CLAVE_DE_ESTADO[estadoVisible(a.status)])} · {formato.fecha(a.createdAt)}</Text>
          </View>
        </View>
      ))}
      <View style={s.botones}>
        <Boton texto={t('music.libraryOpenAll')} icono="albums-outline" onPress={() => navigation.navigate('MisCreaciones')} />
        <Boton texto={t('music.libraryProjects')} icono="folder-open-outline" onPress={() => navigation.navigate('Projects')} />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: 12, padding: SPACING.md, minHeight: scale(56) },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: '600' },
  meta: { fontSize: FONT_SIZE.xs },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

export default MisCreacionesMusic;
