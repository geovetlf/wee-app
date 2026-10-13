import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { notify } from '../../utils/notify';
import { esNoDisponible, peticionDeConservar, peticionDeLocal, peticionDeTexto } from './conservar';
import type { ReferenciaLocal, CreacionesLocales } from '../../services/cicloDeTrabajo';
import { finalizarCreacion, guardarTextoFinal } from '../../services/cicloDeTrabajo';
import { FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * «GUARDAR EN MIS CREACIONES» — un solo botón para el resultado (`ResultCard`) y para el proyecto (`ProjectScreen`) (R9).
 *
 * Mis creaciones = lo que la persona DECIDIÓ conservar. Este botón toma esa decisión con el contrato
 * (`finalizarCreacion`), que referencia los materiales y no copia ningún archivo, y:
 *
 *   · es idempotente: el `requestId` sale del trabajo y de lo elegido (`peticionDeConservar`), así que el doble toque, el
 *     reintento o guardarlo desde el proyecto y desde el resultado son la misma petición; y mientras confirma está ocupado
 *     («Guardando…») y un segundo toque no sale;
 *   · cuando queda guardada lo dice —y lleva a la biblioteca si se le da cómo—; si se elige otra propuesta, la petición es
 *     otra y vuelve a ofrecerse;
 *   · un TEXTO final (Chef, Business, Travel… D-3) se guarda con `guardarTextoFinal`, que crea su asset de texto y la
 *     creación; nunca se guarda solo: es la persona quien pulsa;
 *   · una creación SOLO LOCAL (D-4) se guarda en el archivo de creaciones del dispositivo (`CreacionesLocales.finalizar`):
 *     no llama al servidor ni sube bytes;
 *   · lo que se enseña al terminar es lo que dijo quien persistió: «Guardada» o, si ya existía, «Ya estaba guardada»;
 *   · si el guardado falla, no hay éxito falso: el botón pasa a «Reintentar», que repite la MISMA petición;
 *   · si el contrato dice que todavía no existe (`pendiente` / `no_disponible`) lo dice con honestidad; un fallo de verdad
 *     se dice con su texto. Nunca finge que quedó guardada.
 */
/** Lo que se conserva: materiales que ya existen, o el texto final de un trabajo (D-3). */
export type ContenidoAConservar =
  | { tipo: 'materiales'; assetIds: string[] }
  | { tipo: 'texto'; texto: string; herramienta: string }
  /** D-4: un resultado que solo está en el dispositivo. Quien lo pinta entrega su archivo de creaciones locales. */
  | { tipo: 'local'; referencias: ReferenciaLocal[]; tipoDeRecurso: string; herramienta?: string | null; locales: Pick<CreacionesLocales, 'finalizar'> };

interface Props {
  jobId: string;
  contenido: ContenidoAConservar;
  proyectoOrigenId?: string | null;
  /** Abrir «Mis creaciones» cuando ya está guardada. Sin él, la constancia se ve pero no es un botón. */
  onOpenCreations?: () => void;
  /** Otra cosa está en marcha en la pantalla (p. ej. una nueva versión). */
  disabled?: boolean;
  /** `relleno`: el botón dorado de la fila de acciones del resultado. `suave`: la píldora de una fila de proyecto. */
  variante?: 'relleno' | 'suave';
  style?: StyleProp<ViewStyle>;
}

const BotonConservar: React.FC<Props> = ({ jobId, contenido, proyectoOrigenId, onOpenCreations, disabled, variante = 'relleno', style }) => {
  const { theme } = useTheme();
  const t = useT();
  const peticion = contenido.tipo === 'materiales'
    ? peticionDeConservar(jobId, contenido.assetIds)
    : contenido.tipo === 'texto'
      ? peticionDeTexto(jobId, contenido.texto)
      : peticionDeLocal(jobId, contenido.referencias);
  /* Lo que contestó quien persistió, para ESTA petición: si otra propuesta cambia la petición, vuelve a ofrecerse. */
  const [conservada, setConservada] = useState<{ peticion: string; yaExistia: boolean } | null>(null);
  /* La petición que falló de verdad (no un «todavía no»): el botón dice «Reintentar» y repite la misma. */
  const [fallida, setFallida] = useState<string | null>(null);
  const [conservando, setConservando] = useState(false);
  const enCurso = useRef(false);
  const yaConservada = conservada?.peticion === peticion;
  const reintentar = fallida === peticion;

  const conservar = async () => {
    if (enCurso.current || yaConservada) return;
    enCurso.current = true;
    setConservando(true);
    try {
      const origen = proyectoOrigenId ?? null;
      const r = contenido.tipo === 'materiales'
        ? await finalizarCreacion({ assetIds: contenido.assetIds, proyectoOrigenId: origen, requestId: peticion })
        : contenido.tipo === 'texto'
          ? await guardarTextoFinal({ texto: contenido.texto, herramienta: contenido.herramienta, proyectoOrigenId: origen, requestId: peticion })
          : await contenido.locales.finalizar({ referencias: contenido.referencias, tipo: contenido.tipoDeRecurso, herramienta: contenido.herramienta ?? null, proyectoOrigenId: origen, requestId: peticion });
      setFallida(null);
      setConservada({ peticion, yaExistia: r?.yaExistia === true });
    } catch (error) {
      if (esNoDisponible(error)) notify(t('creaciones.keepPending'));
      else {
        setFallida(peticion);
        console.warn('No se pudo guardar en Mis creaciones:', error);
        notify(t('creaciones.keepFailed'));
      }
    } finally {
      enCurso.current = false;
      setConservando(false);
    }
  };

  const borde = { borderColor: theme.colors.accent };
  if (yaConservada) {
    const constancia = conservada?.yaExistia ? t('creaciones.alreadyKept') : t('creaciones.savedInCreations');
    const contenido = (
      <>
        <Ionicons name="checkmark-circle" size={scale(16)} color={theme.colors.accentDark} />
        <Text style={[styles.texto, { color: theme.colors.text }]}>{constancia}</Text>
      </>
    );
    return onOpenCreations ? (
      <TouchableOpacity
        onPress={onOpenCreations}
        disabled={disabled}
        style={[styles.boton, borde, { backgroundColor: theme.colors.card }, style]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={constancia}
      >
        {contenido}
      </TouchableOpacity>
    ) : (
      <View style={[styles.boton, borde, { backgroundColor: theme.colors.card }, style]}>{contenido}</View>
    );
  }

  const relleno = variante === 'relleno';
  const tinta = relleno ? '#1F2937' : theme.colors.text;
  return (
    <TouchableOpacity
      onPress={conservar}
      disabled={disabled || conservando}
      style={[styles.boton, borde, { backgroundColor: relleno ? theme.colors.accent : theme.colors.accent + '1A' }, style]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={reintentar ? t('creaciones.keepRetry') : t('creaciones.keep')}
      accessibilityState={{ busy: conservando, disabled: !!disabled || conservando }}
    >
      <Ionicons name={reintentar ? 'refresh' : 'bookmark-outline'} size={scale(16)} color={tinta} />
      <Text style={[styles.texto, { color: tinta }]}>{conservando ? t('creaciones.keeping') : reintentar ? t('creaciones.retry') : t('creaciones.keep')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    minHeight: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  texto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default BotonConservar;
