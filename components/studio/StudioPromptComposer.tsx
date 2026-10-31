import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useT } from '../../contexts/IdiomaContext';
import { useEnEspacioProfesional } from '../../contexts/EspacioProfesionalContext';
import CajaDePrompt from '../creator/CajaDePrompt';
import { SPACING } from '../../constants/design';

interface Props {
  valor: string;
  onCambiar: (texto: string) => void;
  /* En creator, una sección sin ajustes o sin selector no los pasa: ahí no hay botón. */
  onAjustes?: () => void;
  onReferencia?: () => void;
  onVoz?: () => void;
  onCrear: () => void;
  /** Mientras se está "creando", el botón no acepta otro toque. */
  ocupado?: boolean;
  /**
   * La pregunta de la caja. Studio pregunta qué quieres crear; Weë Design, qué
   * quieres diseñar. Es la única diferencia, así que es la única que se pasa.
   */
  placeholder?: string;
}

/**
 * EL COMPOSITOR: EL CENTRO DE WEË STUDIO.
 *
 * Lo primero que se ve después del nombre, y a propósito: el Studio no empieza
 * eligiendo herramienta, empieza diciendo qué quieres. Las seis puertas de
 * abajo son el camino para quien prefiera ir por su cuenta, no el principal.
 *
 * La caja en sí es `CajaDePrompt`, la misma de todas las secciones de Weë AI:
 * crece con lo escrito hasta llenar lo que se ve y su fila de botones no se va
 * nunca de la vista. Aquí solo se dice QUÉ botones lleva el Studio.
 *
 * ── Los cinco botones ────────────────────────────────────────────────────────
 *
 * Cuatro en gris y uno en amarillo. El amarillo en Weë significa crear, así que
 * lo lleva el único que crea; los otros cuatro preparan la creación —añadir,
 * traer una referencia, ajustar, dictar— y compiten en cuanto se pintan del
 * mismo color.
 */
const StudioPromptComposer: React.FC<Props> = ({
  valor, onCambiar, onAjustes, onReferencia, onVoz, onCrear, ocupado, placeholder,
}) => {
  const t = useT();
  const pro = useEnEspacioProfesional();

  /*
   * EN WEË VERSIÓN CREATOR, CADA BOTÓN HACE UNA COSA.
   * El «+» y la imagen abren lo mismo, y dictar todavía no existe: dos botones que
   * no dicen la verdad. Quedan los que hacen algo, con su palabra al lado.
   */
  if (pro) {
    return (
      <CajaDePrompt
        valor={valor}
        onCambiar={onCambiar}
        onEnviar={onCrear}
        etiquetaEnviar={t('studio.sendLabel')}
        textoEnviar={t('studio.sendLabel')}
        placeholder={placeholder ?? t('studio.placeholder')}
        ocupado={ocupado}
        acciones={[
          ...(onReferencia ? [{ icono: 'image-outline', etiqueta: t('studio.referenceLabel'), texto: t('studio.reference'), alPulsar: onReferencia }] : []),
          ...(onAjustes ? [{ icono: 'options-outline', etiqueta: t('studio.settingsLabel'), texto: t('brain.settingsLabel'), alPulsar: onAjustes }] : []),
        ]}
      />
    );
  }

  return (
    <View style={styles.marco}>
      <CajaDePrompt
        valor={valor}
        onCambiar={onCambiar}
        onEnviar={onCrear}
        etiquetaEnviar={t('studio.sendLabel')}
        placeholder={placeholder ?? t('studio.placeholder')}
        ocupado={ocupado}
        acciones={[
          { icono: 'add', etiqueta: t('studio.addLabel'), alPulsar: onReferencia ?? (() => {}) },
          { icono: 'image-outline', etiqueta: t('studio.referenceLabel'), alPulsar: onReferencia ?? (() => {}) },
          { icono: 'options-outline', etiqueta: t('studio.settingsLabel'), alPulsar: onAjustes ?? (() => {}) },
          { icono: 'mic-outline', etiqueta: t('studio.voiceLabel'), alPulsar: onVoz ?? (() => {}) },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  marco: {
    paddingHorizontal: SPACING.lg,
  },
});

export default StudioPromptComposer;
