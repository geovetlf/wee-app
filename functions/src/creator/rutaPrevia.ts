/**
 * LA RUTA, ANTES DEL DINERO (simplificación definitiva de país/jurisdicción + routing, 2026-10-07).
 *
 * No es un router nuevo: es preguntarle al Router de siempre (`engine.route`, el mismo que usa `execute`) si hay
 * alguna ruta elegible para lo que se va a pedir, ANTES del cupo, de la reserva y del cobro. El Router ya hace todo
 * lo demás: consulta el registro de proveedores, lee la jurisdicción de la CUENTA en el servidor
 * (`engine/jurisdiccion.ts`, `users.country` del Perfil Real; nunca la del cliente, ni el idioma, ni la IP, ni el
 * dispositivo) y, si el proveedor A no es elegible, prueba B, C…
 *
 * Sin ninguna ruta → `NOT_AVAILABLE` con el motivo público de siempre (`motivoDeNoDisponible`), que ya no nombra
 * región ni país: 0 cupo, 0 reserva, 0 cargo y 0 reembolso. Con ruta → el flujo normal, que vuelve a enrutar al
 * ejecutar (la decisión de aquí no se guarda ni se impone: solo evita cobrar lo que se sabe que no puede salir).
 *
 * `rutaPrevia.decidir` es un objeto a propósito: las suites con proveedores sintéticos lo sustituyen.
 */
import { engine } from '../engine';
import { motivoDeNoDisponible, noDisponible } from '../engine/errors';
import { EngineRequest, RouteDecision } from '../engine/types';

export const rutaPrevia = {
  decidir: (peticion: EngineRequest): Promise<RouteDecision> => engine.route(peticion),
};

/** ¿Hay al menos un candidato? Si no, el NOT_AVAILABLE genérico, sin proveedor, modelo, país ni jurisdicción. */
export const exigirRuta = (decision: RouteDecision): void => {
  if (!decision.candidates.length) throw noDisponible(motivoDeNoDisponible(decision.skipped));
};

/** Todas las peticiones de una operación tienen ruta (un trabajo de varios pasos se mira entero antes de cobrar). */
export const exigirRutaElegible = async (peticiones: readonly EngineRequest[]): Promise<void> => {
  for (const peticion of peticiones) exigirRuta(await rutaPrevia.decidir(peticion));
};

/**
 * EL PRECIO ES EL DE LA RUTA ELEGIDA (multi-proveedor). Una puerta que sabe cotizar con la tarifa oficial de SUS
 * proveedores (hoy, el vídeo con la de Seedance: `priceVideoRequest`) la usa cuando el Router eligió a uno de ellos.
 * Si el Router eligió otro proveedor registrado —el segundo de vídeo, el día que exista—, el precio es la estimación
 * del Router para ESA ruta (`estimatedCredits`/`estimatedUsd`, de la tarifa que su adaptador declara en el registro):
 * nunca el precio de un proveedor que no va a atender. No inventa tarifas: sin ruta no hay precio.
 */
export const precioPorRuta = <P extends { credits: number; usd: number; model: string }>(
  precioPropio: P, ruta: RouteDecision, proveedoresConTarifaPropia: readonly string[],
): P => {
  const elegido = ruta.candidates[0];
  if (!elegido || proveedoresConTarifaPropia.includes(elegido.provider)) return precioPropio;
  return { ...precioPropio, credits: elegido.estimatedCredits, usd: elegido.estimatedUsd, model: elegido.model.id };
};
