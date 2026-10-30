import type { RutaDeConsola } from './vistas/Consola';

/*
 * EL CATÁLOGO DE DOMINIOS A–P. Cada dominio es una lista de funciones, y su estado sale de ellas: nadie lo escribe a mano.
 * Guarda CLAVES, no frases (`i18n/es.ts` → `admin.dominios`), y no pide nada al servidor: es la descripción de lo que hay.
 *
 *   · `operativo`: la lectura existe en el servidor, con su permiso, y se ha probado contra él. NO significa desplegada en
 *     producción: esta consola todavía solo se conecta a emuladores (`config/entorno.ts`).
 *   · `parcial`: hay algo real, pero no lo que el nombre promete.
 *   · `pendiente`: no hay fuente, o no hay operación. Tener pantalla no cambia esto.
 *
 * Documentado con sus dependencias en docs/admin-console/WEE_ADMIN_CONSOLE_DOMAIN_CATALOG.md: si cambia uno, cambia el otro.
 * La consola supervisa motores y operaciones: ningún dominio es una puerta para generar contenido.
 */
export type EstadoDeFuncion = 'operativo' | 'parcial' | 'pendiente';

export interface FuncionDeDominio {
  clave: string;
  estado: EstadoDeFuncion;
  /** Las acciones de `api/acciones.ts` de las que sale, si las hay. Nunca una que no exista. */
  fuente?: readonly string[];
}

export interface Dominio {
  id: string;
  /** Dónde se ve, si se ve en algún sitio. */
  rutas: readonly RutaDeConsola[];
  funciones: readonly FuncionDeDominio[];
}

export const DOMINIOS: readonly Dominio[] = [
  { id: 'a', rutas: ['panorama'], funciones: [
    { clave: 'indicadores', estado: 'operativo', fuente: ['engineAdmin.status', 'creditsAdmin.stats', 'moderationAdmin.list', 'opsAdmin.usoIa', 'opsAdmin.cola', 'opsAdmin.atascados', 'opsAdmin.creacionesAtascadas'] },
    { clave: 'totales', estado: 'pendiente' },
    { clave: 'incidentes', estado: 'pendiente' },
  ] },
  { id: 'b', rutas: ['cuentas'], funciones: [
    { clave: 'consulta', estado: 'operativo', fuente: ['accountsAdmin.buscar'] },
    { clave: 'totales', estado: 'pendiente' },
    { clave: 'actividad', estado: 'pendiente' },
    { clave: 'restricciones', estado: 'pendiente' },
  ] },
  { id: 'c', rutas: ['credits'], funciones: [
    { clave: 'totales', estado: 'operativo', fuente: ['creditsAdmin.stats'] },
    { clave: 'cuenta', estado: 'operativo', fuente: ['creditsAdmin.balance', 'creditsAdmin.userHistory'] },
    { clave: 'reembolsadas', estado: 'operativo', fuente: ['creditsAdmin.failed'] },
    { clave: 'costes', estado: 'operativo', fuente: ['creditsAdmin.costs'] },
    { clave: 'reservas', estado: 'operativo', fuente: ['opsAdmin.reservas'] },
    { clave: 'recargas', estado: 'pendiente' },
    { clave: 'movimientos', estado: 'pendiente' },
  ] },
  { id: 'd', rutas: ['resumen'], funciones: [
    { clave: 'estado', estado: 'operativo', fuente: ['engineAdmin.status'] },
    { clave: 'uso', estado: 'operativo', fuente: ['opsAdmin.usoIa', 'opsAdmin.generaciones'] },
    { clave: 'salud', estado: 'parcial', fuente: ['engineAdmin.status'] },
    { clave: 'historico', estado: 'pendiente' },
    { clave: 'cambios', estado: 'pendiente' },
  ] },
  { id: 'e', rutas: ['operaciones'], funciones: [
    { clave: 'creaciones', estado: 'operativo', fuente: ['opsAdmin.creaciones', 'opsAdmin.creacionesAtascadas'] },
    { clave: 'generaciones', estado: 'operativo', fuente: ['opsAdmin.generaciones'] },
    { clave: 'linea', estado: 'pendiente' },
    { clave: 'acciones', estado: 'pendiente' },
  ] },
  { id: 'f', rutas: ['operaciones'], funciones: [
    { clave: 'producciones', estado: 'operativo', fuente: ['opsAdmin.producciones'] },
    { clave: 'tomas', estado: 'pendiente' },
  ] },
  { id: 'g', rutas: [], funciones: [{ clave: 'operaciones', estado: 'pendiente' }] },
  { id: 'h', rutas: [], funciones: [{ clave: 'operaciones', estado: 'pendiente' }] },
  { id: 'i', rutas: ['operaciones'], funciones: [
    { clave: 'creaciones', estado: 'operativo', fuente: ['opsAdmin.creaciones'] },
    { clave: 'propias', estado: 'pendiente' },
  ] },
  { id: 'j', rutas: ['operaciones'], funciones: [
    { clave: 'creaciones', estado: 'operativo', fuente: ['opsAdmin.creaciones'] },
    { clave: 'propias', estado: 'pendiente' },
  ] },
  { id: 'k', rutas: ['moderacion'], funciones: [
    { clave: 'cola', estado: 'operativo', fuente: ['moderationAdmin.list', 'moderationAdmin.history'] },
    { clave: 'revisar', estado: 'pendiente' },
    { clave: 'publicaciones', estado: 'pendiente' },
    { clave: 'comunidades', estado: 'pendiente' },
  ] },
  { id: 'l', rutas: ['auditoria'], funciones: [
    { clave: 'sesion', estado: 'operativo', fuente: ['opsAdmin.quienSoy'] },
    { clave: 'auditoria', estado: 'operativo', fuente: ['opsAdmin.auditoria'] },
    { clave: 'roles', estado: 'pendiente' },
    { clave: 'aprobador', estado: 'pendiente' },
  ] },
  { id: 'm', rutas: [], funciones: [{ clave: 'diagnostico', estado: 'pendiente' }] },
  { id: 'n', rutas: [], funciones: [{ clave: 'preguntas', estado: 'pendiente' }] },
  { id: 'o', rutas: ['operaciones'], funciones: [
    { clave: 'cola', estado: 'operativo', fuente: ['opsAdmin.trabajos', 'opsAdmin.atascados', 'opsAdmin.cola'] },
    { clave: 'fallos', estado: 'parcial', fuente: ['opsAdmin.usoIa'] },
    { clave: 'noDisponible', estado: 'operativo', fuente: ['opsAdmin.capacidades'] },
    { clave: 'incidentes', estado: 'pendiente' },
    { clave: 'barrido', estado: 'pendiente' },
    { clave: 'alertas', estado: 'pendiente' },
  ] },
  { id: 'p', rutas: ['resumen'], funciones: [
    { clave: 'ajustes', estado: 'parcial', fuente: ['engineAdmin.status'] },
    { clave: 'puertas', estado: 'pendiente' },
    { clave: 'historial', estado: 'pendiente' },
    { clave: 'cambios', estado: 'pendiente' },
  ] },
];

/** Todas operativas: operativo. Ninguna con algo real: pendiente. Lo demás: parcial. */
export const estadoDeDominio = (d: Dominio): EstadoDeFuncion => {
  if (d.funciones.every((f) => f.estado === 'operativo')) return 'operativo';
  if (d.funciones.every((f) => f.estado === 'pendiente')) return 'pendiente';
  return 'parcial';
};

export const dominioPorId = (id: string): Dominio | undefined => DOMINIOS.find((d) => d.id === id);

export const TONO_DE_ESTADO = { operativo: 'ok', parcial: 'parcial', pendiente: 'noIntegrada' } as const;
