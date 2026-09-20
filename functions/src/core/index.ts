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
export * from './project';
export * from './observability';
export * from './registry';
export * from './gateway';
export * from './brain';
export * from './planner';
export * from './orchestrator';
export * from './router';
export * from './job';
export * from './job-queue';
export * from './financial';
export * from './moderation';
