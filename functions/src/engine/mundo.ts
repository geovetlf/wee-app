/**
 * WEË AI ENGINE — EL CONTRATO DE `world.generate`, COMO LO VEN LOS ADAPTADORES.
 *
 * El contrato es del Core (`core/mundo3d.ts`) y uno solo para todo Weë: lo usan la app, la puerta del servidor y el
 * motor. Los adaptadores no importan del Core (lo vigila `gateway-autoridad`): lo leen por aquí, que es la capa que
 * les toca. Solo se reexporta; ni una regla nueva.
 *
 * Lo que un adaptador hace con esto es TRADUCIR —de la entrada de Weë a su esquema, con datos— y nunca al revés:
 * ningún nombre de campo de un proveedor sube de esta capa.
 */
export { leerEntradaDeMundo3D } from '../core/mundo3d';
export type { EntradaDeMundo3D, EspacioDelMundo, MotivoDeEntradaNoValida } from '../core/mundo3d';
