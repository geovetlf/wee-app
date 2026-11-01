import type { EstadoDeCarga } from '../hooks';
import { useIdioma } from '../i18n/i18n';

/** «Fuente: … · leído: …» junto a cada bloque con datos: de dónde sale y lo fresco que es. */
export const Procedencia = ({ fuente, estado }: { fuente: string; estado: EstadoDeCarga<unknown> }) => {
  const { t, fecha } = useIdioma();
  if (estado.fase !== 'ok') return null;
  return <p className="procedencia">{t('admin.panorama.procedencia', { fuente, hora: fecha(estado.leidoEn) })}</p>;
};
