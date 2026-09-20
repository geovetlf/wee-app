/**
 * WEE MEDIA & ASSET LAYER — LOS CONTRATOS.
 *
 * Todo lo de este directorio es PURO: sin red, sin Firestore, sin reloj propio
 * y sin un solo nombre de proveedor dentro. Quien conoce un proveedor es su
 * adaptador, que vive fuera del Core (`functions/src/media/`), y es el único
 * sitio donde puede aparecer.
 *
 *     Asset (Fase 11)  →  QUÉ tiene Weë y de quién es   ← fuente de verdad
 *     MediaObject      →  DÓNDE están sus bytes
 *     PuertoDeAlmacenamiento → cómo se guardan y se borran esos bytes
 *     Registro         →  qué proveedores hay y qué saben hacer
 *
 * La Fase 11 no cambia. `StorageRef` es el suyo y se reutiliza tal cual: ya
 * decía lo que hacía falta —proveedor opaco, contenedor, clave, versión— y
 * hasta valida el largo de clave que resulta ser exactamente el límite de R2.
 */

export * from './puerto';
export * from './objeto';
export * from './registro';
