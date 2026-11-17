import React from 'react';
import { StyleSheet } from 'react-native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import { PortadaWeeAi } from '../components/weeai/PortadaWeeAi';
import { SPACING } from '../constants/design';
import { PORTADA_WEEAI } from '../constants/estiloWeeAi';

/**
 * LA PORTADA DE WEËAI — lo que se ve al entrar (v2, 2026-11-17: referencia del dueño, pantalla FIJA).
 *
 * Cabecera, hero, la caja común y una rejilla de módulos —Imagen, Video, Audio, Filmmaker, Texto, 3D, Plantillas y Herramientas—
 * que caben en una sola pantalla sin desplazarse. Las plantillas viven en su pantalla (`Plantillas`, módulo «Plantillas»);
 * Herramientas abre una hoja con Weë Brain, Moda y el avatar. La cabecera es la propia de la portada (volver, WeëAI y el
 * saldo de `CreditsPill`). Todo está en `components/weeai/`; esta pantalla solo la monta.
 *
 * Nada de lo anterior se borró de la app: las pantallas de cada experiencia, Mis creaciones (por Proyectos), el avatar (por
 * Herramientas) y la compra de Credits (por el saldo) siguen donde estaban.
 */
const WeeCreatorScreen: React.FC = () => {
  const t = useT();
  return (
    <CreatorShell activeId="creator" title={t('nav.weeAi')} breadcrumb={t('nav.weeAi')} fondo={PORTADA_WEEAI.fondo} sinFranjaSuperior fija contentStyle={styles.content}>
      <PortadaWeeAi />
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
  },
});

/* WeëAI es siempre oscura: la pantalla se pinta con el tema oscuro de Weë AI, también con el Perfil Real. */
export default enTemaOscuro(WeeCreatorScreen);
