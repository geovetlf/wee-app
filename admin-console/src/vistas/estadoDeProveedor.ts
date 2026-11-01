import type { ProveedorVista } from '../api/modelos';
import type { Tono } from '../componentes/Piezas';

/**
 * Qué decir de un proveedor con lo que informa `engineAdmin.status`, en el orden en que importa. «Listo» solo significa
 * con clave y habilitado: la salud que manda el servidor vive en la memoria de la instancia que contestó, no es un
 * histórico. Deshabilitado no pide atención: es una decisión de configuración.
 */
export type EstadoDeProveedor =
  | { clave: 'circuitoAbierto'; tono: Tono; hasta: number }
  | { clave: 'sinClave' | 'deshabilitado' | 'listo'; tono: Tono }
  | { clave: 'conFallos'; tono: Tono; fallos: number };

export const estadoDeProveedor = (p: ProveedorVista, ahora: number): EstadoDeProveedor => {
  if (p.abiertoHasta !== undefined && p.abiertoHasta > ahora) return { clave: 'circuitoAbierto', tono: 'atencion', hasta: p.abiertoHasta };
  if (!p.habilitado) return { clave: 'deshabilitado', tono: 'neutro' };
  if (!p.configurado) return { clave: 'sinClave', tono: 'atencion' };
  if (p.fallos !== undefined && p.fallos > 0) return { clave: 'conFallos', tono: 'atencion', fallos: p.fallos };
  return { clave: 'listo', tono: 'ok' };
};
