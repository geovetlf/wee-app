import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useResponsive } from '../../hooks/useResponsive';
import HojaInferior from '../workspace/HojaInferior';
import PortadaDeIdea from './PortadaDeIdea';
import {
  CATEGORIAS_DE_INSPIRACION, CLAVE_DEL_DESTINO, CategoriaDeInspiracion, DestinoDeReceta, RECETAS, Receta,
} from '../../constants/inspiracion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** Los filtros de «Prompts y recetas»: a dónde lleva cada idea. */
const DESTINOS_FILTRABLES: readonly DestinoDeReceta[] = ['video', 'imagen', 'filmmaker', 'design', 'escribir'];

const CATEGORIA_DE: Readonly<Record<CategoriaDeInspiracion, string>> = Object.freeze(
  Object.fromEntries(CATEGORIAS_DE_INSPIRACION.map((c) => [c.id, c.clave])) as Record<CategoriaDeInspiracion, string>,
);

/** Una píldora de filtro. Encendida en dorado; el resto, sobre la superficie. */
const Pildora: React.FC<{ texto: string; activa: boolean; onPress: () => void }> = ({ texto, activa, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={texto}
      style={[styles.pildora, { backgroundColor: activa ? theme.colors.accent : theme.colors.card, borderColor: activa ? theme.colors.accent : theme.colors.border }]}
    >
      <Text style={[styles.pildoraTexto, { color: activa ? '#1F2937' : theme.colors.text }]}>{texto}</Text>
    </TouchableOpacity>
  );
};

/**
 * INSPIRA: LA BIBLIOTECA DE IDEAS LISTAS PARA USAR.
 *
 * Categorías arriba; «Ideas populares» en grande; y «Prompts y recetas», que se
 * filtran por lo que crean. Cada idea se abre para verla entera —su texto, su
 * formato, a dónde lleva— y se usa: al usarla, su idea y sus ajustes llegan
 * puestos a donde se crea, y ahí se personaliza antes de pedir nada. Mirar no
 * cuesta un Credit; crear lo dirá con su precio en su momento.
 *
 * La misma pieza vale en Weë (la pestaña Inspira) y en Weë Creator: quien la
 * monta dice qué hace «Usar».
 */
const BibliotecaDeInspiracion: React.FC<{
  onUsar: (receta: Receta) => void;
  /** Abre esta idea al llegar (el buscador de Weë Creator). */
  recetaInicial?: string;
}> = ({ onUsar, recetaInicial }) => {
  const { theme } = useTheme();
  const t = useT();
  const { isMobile, isDesktop } = useResponsive();
  const [categoria, setCategoria] = useState<CategoriaDeInspiracion | null>(null);
  const [destino, setDestino] = useState<DestinoDeReceta | null>(null);
  const [abierta, setAbierta] = useState<Receta | null>(null);

  useEffect(() => {
    if (recetaInicial) setAbierta(RECETAS.find((r) => r.id === recetaInicial) ?? null);
  }, [recetaInicial]);

  const deLaCategoria = useMemo(() => RECETAS.filter((r) => !categoria || r.categoria === categoria), [categoria]);
  const populares = useMemo(() => {
    const suyas = deLaCategoria.filter((r) => r.popular);
    return suyas.length ? suyas : deLaCategoria.slice(0, 2);
  }, [deLaCategoria]);
  const lista = useMemo(() => deLaCategoria.filter((r) => !destino || r.destino === destino), [deLaCategoria, destino]);
  const anchoPopular = isMobile ? scale(220) : isDesktop ? scale(280) : scale(250);

  const usar = (r: Receta) => {
    setAbierta(null);
    onUsar(r);
  };

  return (
    <View style={styles.raiz}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        <Pildora texto={t('inspira.catAll')} activa={!categoria} onPress={() => setCategoria(null)} />
        {CATEGORIAS_DE_INSPIRACION.map((c) => (
          <Pildora key={c.id} texto={t(c.clave)} activa={categoria === c.id} onPress={() => setCategoria(c.id)} />
        ))}
      </ScrollView>

      <View style={styles.seccion}>
        <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('inspira.popularTitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
          {populares.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setAbierta(r)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('inspira.openIdea', { nombre: t(r.clave) })}
              style={[styles.popular, { width: anchoPopular, backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
            >
              <PortadaDeIdea receta={r} alto={Math.round(anchoPopular * 0.62)} etiqueta={t(CLAVE_DEL_DESTINO[r.destino])} />
              <Text style={[styles.popularTitulo, { color: theme.colors.text }]} numberOfLines={1}>{t(r.clave)}</Text>
              <Text style={[styles.popularDetalle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t(r.claveDescripcion)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.seccion}>
        <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('inspira.recipesTitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
          <Pildora texto={t('inspira.catAll')} activa={!destino} onPress={() => setDestino(null)} />
          {DESTINOS_FILTRABLES.map((d) => (
            <Pildora key={d} texto={t(CLAVE_DEL_DESTINO[d])} activa={destino === d} onPress={() => setDestino(d)} />
          ))}
        </ScrollView>
        <View style={[styles.lista, !isMobile && styles.listaAncha]}>
          {lista.length === 0 && <Text style={[styles.vacio, { color: theme.colors.textSecondary }]}>{t('inspira.emptyFilter')}</Text>}
          {lista.map((r) => (
            <View key={r.id} style={[styles.receta, !isMobile && styles.recetaAncha, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TouchableOpacity
                onPress={() => setAbierta(r)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('inspira.openIdea', { nombre: t(r.clave) })}
                style={[styles.recetaCuerpo, isWeb && ({ cursor: 'pointer' } as object)]}
              >
                <PortadaDeIdea receta={r} alto={scale(64)} estilo={styles.miniatura} />
                <View style={styles.recetaTextos}>
                  <Text style={[styles.recetaTitulo, { color: theme.colors.text }]} numberOfLines={1}>{t(r.clave)}</Text>
                  <Text style={[styles.recetaDetalle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t(r.claveDescripcion)}</Text>
                  <View style={[styles.etiqueta, { backgroundColor: theme.colors.glow }]}>
                    <Text style={[styles.etiquetaTexto, { color: theme.colors.accent }]}>{t(CATEGORIA_DE[r.categoria])}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => usar(r)}
                style={[styles.usar, { backgroundColor: theme.colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel={t('inspira.useIdea', { nombre: t(r.clave) })}
              >
                <Ionicons name="add" size={scale(22)} color="#1F2937" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <HojaInferior
        visible={!!abierta}
        titulo={abierta ? t(abierta.clave) : ''}
        subtitulo={abierta ? t(abierta.claveDescripcion) : undefined}
        onCerrar={() => setAbierta(null)}
        pie={abierta ? (
          <TouchableOpacity
            onPress={() => usar(abierta)}
            style={[styles.botonUsar, { backgroundColor: theme.colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel={t('inspira.useThisIdea')}
          >
            <Ionicons name="sparkles" size={scale(18)} color="#1F2937" />
            <Text style={styles.botonUsarTexto}>{t('inspira.useThisIdea')}</Text>
          </TouchableOpacity>
        ) : undefined}
      >
        {abierta && (
          <>
            <PortadaDeIdea receta={abierta} alto={scale(160)} etiqueta={t(CLAVE_DEL_DESTINO[abierta.destino])} />
            <View style={styles.detalleBloque}>
              <Text style={[styles.detalleEtiqueta, { color: theme.colors.textSecondary }]}>{t('inspira.promptLabel')}</Text>
              <Text style={[styles.detallePrompt, { color: theme.colors.text, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} selectable>
                {t(abierta.clavePrompt)}
              </Text>
              <Text style={[styles.detalleNota, { color: theme.colors.textSecondary }]}>{t('inspira.useNote')}</Text>
            </View>
          </>
        )}
      </HojaInferior>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { gap: SPACING.xl },
  fila: { gap: SPACING.sm, paddingRight: SPACING.lg },
  pildora: { minHeight: 36, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, borderWidth: 1, justifyContent: 'center' },
  pildoraTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  seccion: { gap: SPACING.md },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  popular: { borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, gap: SPACING.xs },
  popularTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any, marginTop: SPACING.xs },
  popularDetalle: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
  lista: { gap: SPACING.sm },
  listaAncha: { flexDirection: 'row', flexWrap: 'wrap' },
  receta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  recetaAncha: { flexBasis: '48%', flexGrow: 1 },
  recetaCuerpo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minWidth: 0 },
  miniatura: { width: scale(64) },
  recetaTextos: { flex: 1, gap: 2, minWidth: 0 },
  recetaTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  recetaDetalle: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
  etiqueta: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.full, marginTop: 2 },
  etiquetaTexto: { fontSize: scale(10), fontWeight: FONT_WEIGHT.bold as any },
  usar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  vacio: { fontSize: FONT_SIZE.sm },
  detalleBloque: { gap: SPACING.sm },
  detalleEtiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold as any, textTransform: 'uppercase', letterSpacing: 0.6 },
  detallePrompt: { fontSize: FONT_SIZE.base, lineHeight: FONT_SIZE.base * 1.5, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  detalleNota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
  botonUsar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 50, borderRadius: BORDER_RADIUS.md },
  botonUsarTexto: { color: '#1F2937', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
});

export default BibliotecaDeInspiracion;
