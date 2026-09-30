import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import ProductionSelectorDeGuardados from './ProductionSelectorDeGuardados';
import ProductionSelectorDeCreaciones from './ProductionSelectorDeCreaciones';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import type { ElementoGuardado } from '../../../services/elementsService';
import type { CreacionParaReferencia } from '../../../hooks/useCreacionesParaReferencia';
import { CLASES_POR_FICHA } from '../../../constants/filmmaker';
import { capacidadesEn, type IdDeCreacion, type SitioDeCreacion } from '../../../constants/assetsDeFilmmaker';
import { LIMITES } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

type ClaseDeFicha = 'personaje' | 'lugar' | 'objeto';

const SITIO: Readonly<Record<ClaseDeFicha, SitioDeCreacion>> = { personaje: 'crear_personaje', lugar: 'crear_lugar', objeto: 'crear_objeto' };
const TITULO: Readonly<Record<ClaseDeFicha, string>> = {
  personaje: 'filmmaker.wsCreateCharacterTitle',
  lugar: 'filmmaker.wsCreatePlaceTitle',
  objeto: 'filmmaker.wsCreateObjectTitle',
};

/**
 * CREAR UN PERSONAJE, UN LUGAR O UN OBJETO DE OTRA FORMA (3D dentro de Filmmaker).
 *
 * No es una sección: se abre DENTRO de Reparto, Lugares u Objetos, en el sitio de la lista —como ya se abre
 * «Vincular con uno guardado»— y al terminar se vuelve a la lista con la ficha nueva abierta. Enseña las formas de
 * crear del mapa (`constants/assetsDeFilmmaker.ts`): las disponibles, con lo que hacen; las cerradas, apagadas y con su
 * porqué a la vista. No crea nada por su cuenta: devuelve lo elegido, y la sección hace las operaciones de F1-A de
 * siempre (añadir la ficha y vincularla a su Element). Ni una biblioteca nueva ni otro sistema de assets: lo guardado
 * es Elements y Mis creaciones es el Content Core.
 */
const ProductionCrearFicha: React.FC<{
  clase: ClaseDeFicha;
  espacio: EspacioDeFilmmaker;
  onDesdeGuardado: (e: ElementoGuardado) => void;
  onDesdeCreacion: (nombre: string, c: CreacionParaReferencia) => void;
  /** Guardando en la cuenta ahora (lo de Mis creaciones pasa por Elements), y lo que salió mal, ya dicho. */
  guardando: boolean;
  error: string | null;
  onVolver: () => void;
}> = ({ clase, espacio, onDesdeGuardado, onDesdeCreacion, guardando, error, onVolver }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const [modo, setModo] = useState<IdDeCreacion | null>(null);
  const [nombre, setNombre] = useState('');
  const { elementos, creaciones } = espacio;
  const cargar = elementos?.cargar;
  useEffect(() => { if (modo === 'desde_guardados' && cargar) cargar(CLASES_POR_FICHA[clase]); }, [modo, clase, cargar]);

  if (modo === 'desde_guardados' && elementos) {
    return <ProductionSelectorDeGuardados elementos={elementos} onElegir={onDesdeGuardado} onVolver={() => setModo(null)} />;
  }
  if (modo === 'desde_creaciones' && creaciones) {
    return (
      <Seccion titulo={t(TITULO[clase])}>
        {!nombre
          ? (
            <CampoQueCrece
              etiqueta={t('filmmaker.wsCreateNameFirst')}
              valor=""
              maximo={LIMITES.nombre}
              etiquetaGuardar={t('filmmaker.wsCreateNext')}
              onGuardar={(texto) => { if (texto.trim()) setNombre(texto.trim()); }}
            />
          )
          : (
            <>
              <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCreatePickFor', { nombre })}</Text>
              <ProductionSelectorDeCreaciones
                creaciones={creaciones}
                clases={['image', 'model3d']}
                titulo={t('filmmaker.wsCreateFromCreations')}
                claveDeUso={'filmmaker.wsCreateUse'}
                onElegirCreacion={(c) => { if (!guardando) onDesdeCreacion(nombre, c); }}
                onElegirGuardado={() => undefined}
                onVolver={() => { setNombre(''); setModo(null); }}
              />
            </>
          )}
        {guardando && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCreateSaving')}</Text>}
        {!!error && <Text style={[styles.nota, { color: theme.colors.error }]}>{error}</Text>}
      </Seccion>
    );
  }

  return (
    <Seccion titulo={t(TITULO[clase])}>
      {capacidadesEn(SITIO[clase]).map((c) => (
        <View key={c.id} style={[styles.forma, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <View style={styles.formaCabecera}>
            <Ionicons name={c.icono as any} size={scale(16)} color={c.disponible ? theme.colors.accent : theme.colors.textSecondary} />
            <View style={styles.formaTextos}>
              <Text style={[styles.formaNombre, { color: theme.colors.text }]}>{t(c.clave)}</Text>
              {!!c.explicacion && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(c.explicacion)}</Text>}
              {!c.disponible && !!c.porque && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(c.porque)}</Text>}
            </View>
          </View>
          <BotonPequeno
            icono={c.disponible ? 'arrow-forward' : 'lock-closed-outline'}
            etiqueta={t(c.clave)}
            onPress={() => setModo(c.id)}
            disabled={!c.disponible || !espacio.editable}
            porque={!c.disponible && c.porque ? t(c.porque) : undefined}
            conTexto
          />
        </View>
      ))}
      <BotonPequeno icono="arrow-back" etiqueta={t('common.back')} onPress={onVolver} conTexto />
    </Seccion>
  );
};

const styles = StyleSheet.create({
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  forma: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm, alignItems: 'flex-start' },
  formaCabecera: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', alignSelf: 'stretch' },
  formaTextos: { flex: 1, gap: 2, minWidth: 0 },
  formaNombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});

export default ProductionCrearFicha;
