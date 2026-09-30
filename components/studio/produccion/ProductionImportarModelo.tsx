import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { Aviso, BotonPequeno, Chip } from './ProductionPiezas';
import type { FaseDeImportacion, ImportacionDeModelo } from '../../../hooks/useImportarModelo3d';
import type { CreacionParaReferencia } from '../../../hooks/useCreacionesParaReferencia';
import { esFalloDelArchivo } from '../../../utils/modelo3d';
import type { FalloDeImportacion } from '../../../utils/modelo3d';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const FRASE_DEL_FALLO: Readonly<Record<FalloDeImportacion, string>> = {
  no_es_glb: 'filmmaker.wsImport3dErrNotGlb',
  version: 'filmmaker.wsImport3dErrVersion',
  incompleto: 'filmmaker.wsImport3dErrBroken',
  vacio: 'filmmaker.wsImport3dErrBroken',
  demasiado_grande: 'filmmaker.wsImport3dErrTooBig',
  cerrada: 'filmmaker.wsImport3dErrClosed',
  no_disponible: 'filmmaker.wsImport3dErrUnavailable',
  subida_cortada: 'filmmaker.wsImport3dErrUpload',
  sigue_llegando: 'filmmaker.wsImport3dErrArriving',
  sin_respuesta: 'filmmaker.wsImport3dErrNoAnswer',
};

const FRASE_DE_LA_FASE: Partial<Readonly<Record<FaseDeImportacion, string>>> = {
  comprobando: 'filmmaker.wsImport3dChecking',
  preparando: 'filmmaker.wsImport3dPreparing',
  terminando: 'filmmaker.wsImport3dFinishing',
};

const EN_MARCHA: ReadonlySet<FaseDeImportacion> = new Set<FaseDeImportacion>(['comprobando', 'preparando', 'subiendo', 'terminando']);

/**
 * 3D DENTRO DE FILMMAKER · IMPORTAR UN MODELO 3D, EN EL SITIO DE LA LISTA.
 *
 * No es una pantalla: es un paso de «Crear de otra forma», dentro de Reparto, Lugares u Objetos, con el nombre ya dado.
 * Enseña lo que pasa de verdad —comprobando el archivo, preparando, subiendo con su porcentaje, terminando— y, si algo
 * falla, por qué y qué hacer: elegir otro archivo (si el archivo no vale) o reintentar (si se cortó: la misma clave, no
 * se duplica nada). Cuando el modelo ya es material de la cuenta, se lo devuelve a la sección, que hace lo de siempre:
 * un Element que APUNTA a él y la ficha vinculada. La pieza no habla con el servidor: lo hace el hook.
 */
const ProductionImportarModelo: React.FC<{
  nombre: string;
  importacion: ImportacionDeModelo;
  /** Guardando en la cuenta lo importado (el Element), y lo que salió mal al hacerlo, ya dicho. */
  guardando: boolean;
  error: string | null;
  onListo: (c: CreacionParaReferencia) => void;
  onVolver: () => void;
}> = ({ nombre, importacion, guardando, error, onListo, onVolver }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [listo, setListo] = useState<CreacionParaReferencia | null>(null);
  const { fase, fallo, archivo, progreso } = importacion;
  const enMarcha = EN_MARCHA.has(fase);

  const empezar = async (reintento: boolean) => {
    const c = reintento ? await importacion.reintentar(nombre) : await importacion.importar(nombre);
    if (c) {
      setListo(c);
      onListo(c);
    }
  };

  /* Lo que pesa, en la unidad que se lee (kilobytes o megabytes, del sistema internacional), con el formato del idioma. */
  const peso = (bytes: number) => (bytes >= 1_000_000
    ? formato.numero(bytes / 1_000_000, { style: 'unit', unit: 'megabyte', unitDisplay: 'short', maximumFractionDigits: 1 })
    : formato.numero(Math.max(1, Math.round(bytes / 1_000)), { style: 'unit', unit: 'kilobyte', unitDisplay: 'short' }));
  const piezas = archivo ? [
    archivo.piezas.mallas !== undefined ? t('filmmaker.wsImport3dMeshes', { contador: archivo.piezas.mallas }) : null,
    archivo.piezas.materiales !== undefined ? t('filmmaker.wsImport3dMaterials', { contador: archivo.piezas.materiales }) : null,
    archivo.piezas.animaciones ? t('filmmaker.wsImport3dAnimations', { contador: archivo.piezas.animaciones }) : null,
  ].filter((p): p is string => !!p) : [];
  const porcentaje = formato.numero(progreso, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <View style={[styles.tarjeta, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <View style={styles.cabecera}>
        <Ionicons name="cube-outline" size={scale(18)} color={theme.colors.accent} />
        <View style={styles.textos}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>{t('filmmaker.wsImport3d')}</Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsImport3dFor', { nombre })}</Text>
        </View>
      </View>

      {fase === 'lista' && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsImport3dFormats')}</Text>}

      {!!archivo && (
        <View style={styles.fila}>
          <Chip texto={archivo.nombre} icono="document-outline" />
          <Chip texto={peso(archivo.bytes)} />
          {piezas.map((p) => <Chip key={p} texto={p} />)}
        </View>
      )}

      {enMarcha && (
        <View style={styles.progreso} accessibilityLiveRegion="polite">
          {fase === 'subiendo' ? (
            <>
              <View
                style={[styles.barra, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progreso * 100) }}
              >
                <View style={[styles.relleno, { width: `${Math.round(progreso * 100)}%`, backgroundColor: theme.colors.accent }]} />
              </View>
              <Text style={[styles.nota, { color: theme.colors.text }]}>{t('filmmaker.wsImport3dUploading', { porcentaje })}</Text>
            </>
          ) : (
            <View style={styles.fila}>
              <ActivityIndicator size="small" color={theme.colors.accent} accessibilityLabel={t(FRASE_DE_LA_FASE[fase] ?? 'filmmaker.wsImport3dChecking')} />
              <Text style={[styles.nota, { color: theme.colors.text }]}>{t(FRASE_DE_LA_FASE[fase] ?? 'filmmaker.wsImport3dChecking')}</Text>
            </View>
          )}
        </View>
      )}

      {fase === 'hecha' && guardando && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCreateSaving')}</Text>}
      {fase === 'fallida' && !!fallo && <Aviso texto={t(FRASE_DEL_FALLO[fallo])} tono="error" />}
      {!!error && <Aviso texto={error} tono="error" />}

      <View style={styles.acciones}>
        {fase === 'lista' && (
          <BotonPequeno
            icono="folder-open-outline"
            etiqueta={t('filmmaker.wsImport3dPick')}
            onPress={() => { void empezar(false); }}
            disabled={!importacion.puedeElegir}
            porque={importacion.puedeElegir ? undefined : t('filmmaker.wsImport3dWhyDevice')}
            principal
            conTexto
          />
        )}
        {fase === 'subiendo' && <BotonPequeno icono="close" etiqueta={t('filmmaker.wsImport3dCancel')} onPress={importacion.cancelar} conTexto />}
        {fase === 'fallida' && !!fallo && !esFalloDelArchivo(fallo) && fallo !== 'cerrada' && (
          <BotonPequeno icono="refresh" etiqueta={t('filmmaker.wsImport3dRetry')} onPress={() => { void empezar(true); }} principal conTexto />
        )}
        {fase === 'fallida' && fallo !== 'cerrada' && (
          <BotonPequeno icono="folder-open-outline" etiqueta={t('filmmaker.wsImport3dOther')} onPress={() => { void empezar(false); }} conTexto />
        )}
        {/* Importado, pero guardarlo en la cuenta falló: se reintenta ESO, sin volver a subir nada. */}
        {fase === 'hecha' && !guardando && !!error && !!listo && (
          <BotonPequeno icono="refresh" etiqueta={t('filmmaker.wsImport3dRetry')} onPress={() => onListo(listo)} principal conTexto />
        )}
        {!enMarcha && !guardando && <BotonPequeno icono="arrow-back" etiqueta={t('common.back')} onPress={onVolver} conTexto />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.xs },
  progreso: { gap: SPACING.xs },
  barra: { height: scale(8), borderRadius: BORDER_RADIUS.full, borderWidth: 1, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: BORDER_RADIUS.full },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

export default ProductionImportarModelo;
