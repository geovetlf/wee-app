import React, { useState } from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import { PortadaWeeAi } from '../components/weeai/PortadaWeeAi';
import { SPACING } from '../constants/design';
import { usePlantillas } from '../hooks/usePlantillas';

/**
 * LA PORTADA DE WEËAI — lo que se ve al entrar (boceto v2 aprobado por el dueño, 2026-11-15).
 *
 * Dos puertas —Video y Herramientas— y debajo el muro «Plantillas para ti»: una plantilla se abre a pantalla completa,
 * «Recrear» lleva a la maqueta «Tu versión» y «Generar» al flujo de creación de siempre. La cabecera (flecha de volver, WeëAI y el
 * saldo) es la del marco de Weë AI: el saldo y la compra siguen siendo de `CreditsPill`. Todo está en
 * `components/weeai/`; esta pantalla solo la monta.
 *
 * Esta portada sustituye a la anterior (buscador por intención, las once tarjetas de especialistas, «Mis creaciones»,
 * «Disponible hoy» y la caja de Credits). Nada de eso se borró de la app: las pantallas de cada experiencia, Mis creaciones
 * (por Proyectos), el avatar (por Herramientas) y la compra de Credits (por el saldo) siguen donde estaban.
 *
 * Experiencias en la portada (`PORTADA_DE_WEEAI` en constants/weeExperiences.ts): Video (id `studio`), Imagen (`design`) y
 * Moda (`business`); Comida es una categoría de plantillas (`chef`), Travel está apagada y Music oculta.
 */
const WeeCreatorScreen: React.FC = () => {
  const t = useT();
  const { plantillas, estado, recargar } = usePlantillas();
  /* Tirar para refrescar: vuelve a leer las mismas plantillas (el muro general), sin nada nuevo en el servidor. */
  const [refrescando, setRefrescando] = useState(false);
  const refrescar = async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  };
  return (
    <CreatorShell activeId="creator" title={t('nav.weeAi')} breadcrumb={t('nav.weeAi')} contentStyle={styles.content} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}>
      <PortadaWeeAi plantillas={plantillas} estado={estado} recargar={recargar} />
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
  },
});

/* Como antes: la pantalla se pinta con el tema claro de Weë AI, también con el Perfil Weë. */
export default enTemaOscuro(WeeCreatorScreen);
