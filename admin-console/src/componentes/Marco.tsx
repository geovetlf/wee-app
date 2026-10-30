import { IDIOMAS_DE_LA_CONSOLA, useIdioma } from '../i18n/i18n';

/** Marca: el nombre de Weë no se traduce. */
const MARCA = 'Weë';

export const Marca = () => {
  const { t } = useIdioma();
  return (
    <div className="marca">
      <span className="marca-nombre">{MARCA}</span>
      <span className="marca-sub">{t('admin.app.titulo')}</span>
    </div>
  );
};

export const SelectorDeIdioma = () => {
  const { t, idioma, elegir } = useIdioma();
  return (
    <label className="selector-idioma">
      <span className="solo-lectores">{t('admin.idioma.etiqueta')}</span>
      <select value={idioma} onChange={(e) => elegir(e.target.value as (typeof IDIOMAS_DE_LA_CONSOLA)[number])}>
        {IDIOMAS_DE_LA_CONSOLA.map((i) => <option key={i} value={i}>{t(`admin.idioma.${i}`)}</option>)}
      </select>
    </label>
  );
};
