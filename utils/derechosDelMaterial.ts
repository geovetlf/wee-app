/**
 * LO QUE UNA PERSONA PUEDE HACER CON UN MATERIAL QUE LLEVA LICENCIA AJENA, dicho por claves.
 *
 * Un mundo 3D nace con los derechos del modelo que lo hizo (`Asset.derechos`, copiados del gobierno del modelo en el
 * servidor). De ellos se cuenta solo lo VISIBLE —`DerechosVisibles`, el mismo recorte del Core que usa la puerta del
 * mundo—: si se puede usar con fines comerciales, si su licencia pide atribución y dónde no se puede usar ni mostrar.
 * Por eso valen igual los derechos enteros de un material (que los incluyen) que los visibles que cuenta la puerta.
 * El nombre y la dirección de la licencia no se enseñan: nombran al modelo, y la app no nombra ni proveedor ni modelo.
 *
 * Puro y sin React: devuelve CLAVES (CLAUDE.md §8) y, para los lugares, sus códigos; quien pinta los convierte en
 * nombres con `nombreDeLaRegion` y los une con `formatearLista`, en el idioma de quien mira.
 */
import type { DerechosDelMaterial, DerechosVisibles } from '../services/escena3d';

export interface FraseDeDerechos {
  readonly clave: string;
  /** Solo en la de los lugares: los códigos (ISO 3166-1 alfa-2, o un grupo como «EU») que quien pinta nombra. */
  readonly lugares?: readonly string[];
}

const CLAVE_DEL_USO_COMERCIAL: Readonly<Record<DerechosDelMaterial['usoComercial'], string>> = Object.freeze({
  ALLOWED: 'creaciones.rightsCommercialAllowed',
  RESTRICTED: 'creaciones.rightsCommercialRestricted',
  UNCLEAR: 'creaciones.rightsCommercialUnclear',
  NOT_ALLOWED: 'creaciones.rightsCommercialNotAllowed',
});

/**
 * Las frases, en orden: la PROCEDENCIA (hecho con IA en Weë, con un modelo de terceros que tiene su propia licencia:
 * explica de dónde salen las condiciones sin nombrar modelo ni proveedor), el uso comercial, la atribución (solo si la
 * pide de verdad; «UNKNOWN» no se convierte en nada) y los lugares. Sin derechos, ninguna: un material sin licencia
 * ajena no tiene nada que avisar. La revisión legal (`revision`) no se cuenta nunca: es gobierno interno de Weë.
 * Lo completo —licencias, revisión, proveedor y modelo— vive en el documento del material, que su dueño puede leer.
 */
export const frasesDeDerechos = (derechos: DerechosVisibles | undefined | null): FraseDeDerechos[] => {
  if (!derechos) return [];
  const visibles: DerechosVisibles = derechos;
  const frases: FraseDeDerechos[] = [{ clave: 'creaciones.rightsProvenance' }];
  const comercial = CLAVE_DEL_USO_COMERCIAL[visibles.usoComercial];
  if (comercial) frases.push({ clave: comercial });
  if (visibles.atribucion === true) frases.push({ clave: 'creaciones.rightsAttribution' });
  if (visibles.jurisdiccionesBloqueadas?.length) {
    frases.push({ clave: 'creaciones.rightsBlockedIn', lugares: [...visibles.jurisdiccionesBloqueadas] });
  }
  return frases;
};
