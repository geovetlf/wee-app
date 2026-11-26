import { useIdioma } from '../contexts/IdiomaContext';
import { varianteDelLocale } from '../i18n/idiomas';

/**
 * El idioma puesto, escrito en SU lengua («Español», «English», el árabe en árabe), tal como lo dice Configuración → Idioma:
 * la variante si el idioma tiene varias normas (portugués, chino) y, si no, el nombre de siempre. Es solo LECTURA de `IdiomaContext`: no hay otro
 * almacén de la preferencia, y el idioma jamás se deduce del lugar.
 */
export const useNombreDelIdioma = (): string => {
  const { idioma, locale, disponibles } = useIdioma();
  return varianteDelLocale(locale)?.nombreNativo ?? disponibles.find((i) => i.codigo === idioma)?.nombreNativo ?? '';
};
