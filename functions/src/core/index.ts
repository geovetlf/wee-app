/**
 * WEE CORE — la puerta única.
 *
 * ── Qué es el Core ──────────────────────────────────────────────────────────
 *
 * Los CONTRATOS sobre los que se entienden las piezas de Weë. Nada más. Aquí no
 * hay Firebase, no hay proveedores, no hay red y no hay estado: solo tipos y
 * funciones puras. Esa restricción no es estética — es lo que permite probar el
 * Core con una tabla de casos y lo que impide que se convierta, otra vez, en un
 * sitio donde vive la lógica de alguien concreto.
 *
 * Si algún día hace falta importar `firebase-admin` aquí dentro, la respuesta
 * correcta casi siempre es que eso pertenece a otra capa.
 *
 * ── Qué NO sustituye ────────────────────────────────────────────────────────
 *
 * Nada. El WEË AI ENGINE, el Credit Engine, Weë Creator y Weë Brain siguen
 * funcionando exactamente igual. El Core les da un vocabulario común y les
 * quita de encima una dependencia que estaba del revés: hasta hoy el motor
 * importaba `CapabilityId` de la capa de experiencia.
 *
 * ── Cómo crece ──────────────────────────────────────────────────────────────
 *
 * Añadiendo campos opcionales y subiendo el número menor del contrato. Lo que
 * obligue a cambiar algo que ya funciona es un cambio mayor y se piensa dos
 * veces. El Core tiene que poder durar años.
 */

export * from './contracts';
export * from './identity';
export * from './account-identity';
export * from './social-identity';
export * from './events';
export * from './capability';
export * from './language';
export * from './errors';
export * from './cost';
export * from './workflow';
export * from './workplace';
export * from './provider';
export * from './content';
export * from './media';
export * from './project';
export * from './observability';
export * from './registry';
export * from './gateway';
export * from './brain';
export * from './creative';
export * from './element';
export * from './visual-context';
export * from './continuity';
export * from './shot';
export * from './escena3d';
export * from './mundo3d';
export * from './continuity-check';
export * from './continuity-intent';
export * from './skill';
export * from './planner';
/*
 * EL ALGORITHM ENGINE NO SE REEXPORTA AQUÍ, Y ES DELIBERADO.
 *
 * Tiene su propia puerta —`core/algorithm/index.ts`— y quien lo use la abre.
 * Tres motivos, en orden de importancia:
 *
 *   · Es una capa que HOY no consume nadie. Meterla en la puerta única haría
 *     que todo el que importa un contrato del Core cargase además diecinueve
 *     módulos que no va a usar.
 *   · La dirección de la dependencia es al revés que la del resto: el
 *     Algorithm Engine importa DEL Core (`planner`, `cost`, `workflow`,
 *     `observability`), no al contrario. Exportarlo desde aquí convertiría la
 *     puerta en algo que apunta hacia dentro y hacia fuera a la vez.
 *   · Y lo medido: el arnés que incrusta cada módulo dentro de sus
 *     dependientes —`core-gateway`, `core-planner`— se quedaba sin memoria al
 *     añadir los módulos de A4. Ese arnés exagera un crecimiento que en
 *     producción no existe, pero exagerarlo es justo para lo que sirve: avisa
 *     de que la puerta estaba engordando sin que nadie lo pidiera.
 *
 * El día que una ruta de producción use el Algorithm Engine, lo importará por
 * su puerta, que es lo que hacen ya sus pruebas.
 */
export * from './orchestrator';
export * from './router';
export * from './job';
export * from './job-queue';
export * from './financial';
export * from './moderation';
export * from './backup';
