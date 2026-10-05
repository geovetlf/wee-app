/**
 * WEË 3D ENGINE · EL NÚCLEO DE COMPOSICIÓN, COMO LO VE LA APP.
 *
 * La única puerta de la app al núcleo 3D del Core (`functions/src/core/escena3d.ts`), impreso en el espejo generado
 * (`./filmmaker/espejo/`, que sale de `scripts/espejo-filmmaker.mjs`). Aquí no hay ni una regla: solo se reexporta.
 *
 * Es UNO para todo Weë: Weë Studio (3D World), Weë Design (3D Design) y Filmmaker son perfiles del mismo núcleo
 * (`modo`), no motores distintos. Construir o validar una escena en la app es el MISMO código que en el servidor,
 * impreso otra vez porque `metro.config.js` deja `functions/` fuera del bundle.
 *
 * Quien compone o pinta importa de aquí y de ningún otro sitio: ni de `./filmmaker/espejo/` ni de `functions/src`.
 * Lo vigila `functions/test/filmmaker-espejo.test.mjs`.
 */
export * from './filmmaker/espejo/core/escena3d';

/* Del Core, lo que una escena 3D nombra: la capacidad que la llena, la forma de un id de material y el catálogo. */
export type { CapabilityId } from './filmmaker/espejo/core/capability';
export { FORMA_DE_ID_DE_MATERIAL } from './filmmaker/espejo/core/content/asset';
export type { AssetKind } from './filmmaker/espejo/core/content/asset';
export { CAPABILITY_CATALOG } from './filmmaker/espejo/core/registry/capabilities';
export type { CatalogEntry } from './filmmaker/espejo/core/registry/capabilities';
