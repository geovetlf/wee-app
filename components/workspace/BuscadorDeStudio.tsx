import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAlturaDelTeclado } from '../EspacioDeEscritura';
import HojaInferior from './HojaInferior';
import { ResultadoDeBusqueda, TipoDeResultado, useBusquedaDeStudio } from '../../hooks/useBusquedaDeStudio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

const GRUPOS: readonly { tipo: TipoDeResultado; clave: string }[] = [
  { tipo: 'produccion', clave: 'workspace.searchGroupProductions' },
  { tipo: 'proyecto', clave: 'workspace.searchGroupProjects' },
  { tipo: 'creacion', clave: 'workspace.searchGroupCreations' },
  { tipo: 'idea', clave: 'workspace.searchGroupIdeas' },
];

/** Los resultados, por grupos, con su cabecera. Lo mismo en el desplegable y en la hoja. */
const Resultados: React.FC<{
  texto: string;
  resultados: readonly ResultadoDeBusqueda[];
  cargando: boolean;
  onAbrir: (r: ResultadoDeBusqueda) => void;
}> = ({ texto, resultados, cargando, onAbrir }) => {
  const { theme } = useTheme();
  const t = useT();
  if (!texto.trim()) {
    return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('workspace.searchHint')}</Text>;
  }
  if (cargando) return <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />;
  if (!resultados.length) return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('workspace.searchNothing', { texto: texto.trim() })}</Text>;
  return (
    <View style={styles.grupos}>
      {GRUPOS.map((g) => {
        const suyos = resultados.filter((r) => r.tipo === g.tipo);
        if (!suyos.length) return null;
        return (
          <View key={g.tipo} style={styles.grupo}>
            <Text style={[styles.grupoTitulo, { color: theme.colors.textSecondary }]}>{t(g.clave)}</Text>
            {suyos.map((r) => (
              <TouchableOpacity
                key={`${r.tipo}-${r.id}`}
                onPress={() => onAbrir(r)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={t('workspace.searchOpen', { nombre: r.titulo })}
                style={[styles.resultado, isWeb && ({ cursor: 'pointer' } as object)]}
              >
                <View style={[styles.icono, { backgroundColor: theme.colors.card }]}>
                  <Ionicons name={r.icono as any} size={scale(16)} color={theme.colors.accent} />
                </View>
                <View style={styles.textos}>
                  <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>{r.titulo}</Text>
                  <Text style={[styles.detalle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{r.detalle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </View>
  );
};

/**
 * EL BUSCADOR DE WEË STUDIO.
 *
 * En escritorio es una caja en la cabecera y los resultados caen debajo; Ctrl/⌘+K
 * la enfoca, como en cualquier herramienta profesional. En el teléfono es una
 * lupa que abre una hoja. Busca en lo tuyo —producciones, proyectos,
 * creaciones— y en las ideas de Inspira; al elegir, quien lo monta decide a
 * dónde ir.
 */
const BuscadorDeStudio: React.FC<{
  forma: 'caja' | 'icono';
  onAbrir: (r: ResultadoDeBusqueda) => void;
}> = ({ forma, onAbrir }) => {
  const { theme } = useTheme();
  const t = useT();
  const { preparar, buscar, cargando } = useBusquedaDeStudio(t);
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const campo = useRef<TextInput>(null);
  const alturaTeclado = useAlturaDelTeclado();
  const resultados = useMemo(() => buscar(texto), [buscar, texto]);

  /* Ctrl/⌘+K enfoca la caja, solo en el navegador y solo si hay caja. */
  useEffect(() => {
    if (!isWeb || forma !== 'caja' || typeof window === 'undefined') return;
    const alPulsar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        campo.current?.focus();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [forma]);

  const elegir = (r: ResultadoDeBusqueda) => {
    setAbierto(false);
    setTexto('');
    onAbrir(r);
  };

  const caja = (
    <View style={[styles.caja, { backgroundColor: theme.colors.surface, borderColor: abierto ? theme.colors.accent : theme.colors.border }]}>
      <Ionicons name="search-outline" size={scale(16)} color={theme.colors.textSecondary} />
      <TextInput
        ref={campo}
        value={texto}
        onChangeText={setTexto}
        onFocus={() => { setAbierto(true); void preparar(); }}
        onBlur={() => { if (forma === 'caja') setTimeout(() => setAbierto(false), 180); }}
        placeholder={t('workspace.searchPlaceholder')}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={t('workspace.searchPlaceholder')}
        returnKeyType="search"
        style={[styles.campo, { color: theme.colors.text }, isWeb && ({ outlineStyle: 'none' } as object)]}
      />
      {!!texto && (
        <TouchableOpacity onPress={() => setTexto('')} accessibilityRole="button" accessibilityLabel={t('workspace.searchClear')}>
          <Ionicons name="close-circle" size={scale(16)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (forma === 'icono') {
    return (
      <>
        <TouchableOpacity
          onPress={() => { setAbierto(true); void preparar(); }}
          style={[styles.boton, { borderColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={t('workspace.searchPlaceholder')}
        >
          <Ionicons name="search-outline" size={scale(19)} color={theme.colors.text} />
        </TouchableOpacity>
        <HojaInferior visible={abierto} titulo={t('workspace.searchTitle')} onCerrar={() => setAbierto(false)}>
          {caja}
          <View style={{ paddingBottom: alturaTeclado }}>
            <Resultados texto={texto} resultados={resultados} cargando={cargando} onAbrir={elegir} />
          </View>
        </HojaInferior>
      </>
    );
  }

  return (
    <View style={styles.anclaje}>
      {caja}
      {abierto && !!texto.trim() && (
        <View style={[styles.desplegable, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <ScrollView style={styles.lista} keyboardShouldPersistTaps="handled">
            <Resultados texto={texto} resultados={resultados} cargando={cargando} onAbrir={elegir} />
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  anclaje: { flex: 1, maxWidth: scale(520), zIndex: 30 },
  caja: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, height: 40, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1,
  },
  campo: { flex: 1, fontSize: FONT_SIZE.sm, paddingVertical: 0, minWidth: 0 },
  desplegable: {
    position: 'absolute', top: 46, left: 0, right: 0, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  lista: { maxHeight: scale(420) },
  boton: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  nota: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45 },
  grupos: { gap: SPACING.md },
  grupo: { gap: 2 },
  grupoTitulo: { fontSize: scale(10), fontWeight: FONT_WEIGHT.bold as any, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SPACING.xs },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 44, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm },
  icono: { width: 32, height: 32, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  detalle: { fontSize: FONT_SIZE.xs },
});

export default BuscadorDeStudio;
