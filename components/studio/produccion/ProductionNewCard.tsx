import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import { crearProduccion, nuevoIdDeProduccion } from '../../../hooks/useProducciones';
import ProductionFormatSelector from './ProductionFormatSelector';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import { borradorDesdeLaIdea } from '../../../utils/borradorDeProduccion';
import { fraseDelFallo } from '../../../utils/mensajesDeFilmmaker';
import { PRESETS_DE_FORMATO } from '../../../services/filmmaker/dominio';
import type { AspectRatio, FormatPresetId } from '../../../services/filmmaker/dominio';
import type { FalloDeProducciones } from '../../../services/filmmakerService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';

/**
 * UNA PRODUCCIÓN NUEVA, DESDE LO QUE SE ESCRIBIÓ EN WEË STUDIO.
 *
 * La caja donde se escribe es la del Studio y no hay otra: aquí la idea se lee,
 * no se edita, y para cambiarla se vuelve allí. Lo único que se pregunta es
 * dónde se va a ver. «Crear producción» la guarda con la callable de verdad; el
 * id se decide una vez, así que tocar dos veces no crea dos.
 */
const ProductionNewCard: React.FC<{
  idea: string;
  creativo?: Readonly<Record<string, string>>;
  onCreada: (productionId: string) => void;
}> = ({ idea, creativo, onCreada }) => {
  const { theme } = useTheme();
  const t = useT();
  const [productionId] = useState(nuevoIdDeProduccion);
  const [preset, setPreset] = useState<FormatPresetId | undefined>(undefined);
  const [proporcion, setProporcion] = useState<AspectRatio>('16:9');
  const [creando, setCreando] = useState(false);
  const [fallo, setFallo] = useState<FalloDeProducciones | null>(null);

  const crear = async () => {
    setCreando(true);
    setFallo(null);
    const r = await crearProduccion({
      productionId,
      production: borradorDesdeLaIdea({ productionId, idea, preset, aspectRatio: preset ? PRESETS_DE_FORMATO[preset].aspectRatio : proporcion, creativo }),
    });
    setCreando(false);
    if (r.ok) onCreada(r.valor.produccion.productionId);
    else setFallo(r.fallo);
  };

  return (
    <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
      <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('filmmaker.newProduction')}</Text>
      <Seccion titulo={t('filmmaker.yourIdea')}>
        <Text style={[styles.idea, { color: theme.colors.text }]}>{idea}</Text>
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.ideaFromStudio')}</Text>
      </Seccion>
      <Seccion titulo={t('filmmaker.whereWillItPlay')}>
        <ProductionFormatSelector
          aspectRatio={preset ? PRESETS_DE_FORMATO[preset].aspectRatio : proporcion}
          preset={preset}
          editable={!creando}
          onPreset={(p) => setPreset(p)}
          onProporcion={(r) => { setPreset(undefined); setProporcion(r); }}
        />
      </Seccion>
      {!!fallo && (
        <Text style={[styles.fallo, { color: theme.colors.error }]} accessibilityLiveRegion="polite">
          {t('filmmaker.problemAt', { donde: t('filmmaker.createError'), frase: fraseDelFallo(fallo, t) })}
        </Text>
      )}
      <BotonPequeno
        icono="film-outline"
        etiqueta={creando ? t('filmmaker.creatingProduction') : t('filmmaker.createProduction')}
        onPress={() => { void crear(); }}
        disabled={creando || !idea.trim()}
        conTexto
        principal
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1.5, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, gap: SPACING.lg },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  idea: { fontSize: FONT_SIZE.base, lineHeight: FONT_SIZE.base * 1.45 },
  nota: { fontSize: FONT_SIZE.xs },
  fallo: { fontSize: FONT_SIZE.sm },
});

export default ProductionNewCard;
