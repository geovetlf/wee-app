/*
 * WEË AI EVALUATION ENGINE — CONTRATO. El contrato común (versión, dimensiones, veredictos, hash canónico y la
 * validación de un dataset) es el del motor (functions/src/evals/motor/contrato.ts): aquí solo se reexporta.
 *
 * Un caso del Router evalúa PROPIEDADES de la decisión del router (`expected.*`), y sólo la elección proveedor/modelo
 * —que es estructurada y determinista— se compara como GOLDEN (`expected.chosen`). Nada de datos sensibles: el
 * «mundo» de un caso es configuración sintética de proveedores/cadenas/uso, no datos de personas.
 */
import { motor } from './motor.mjs';

export const { VERSION_CONTRATO, VEREDICTOS, DIMENSIONES, hashCanonico, validarDataset } = motor('contrato');

/* Qué dimensión mide cada grader DEL DOMINIO ROUTER (lo usan sus graders, `graders.mjs`). El motor no lo lee: puntúa por
 * la dimensión que trae cada resultado, así que un dominio nuevo trae la suya sin tocar este archivo. */
export const DIMENSION_DE_GRADER = {
  'router/eleccion': 'QUALITY',
  'router/orden': 'QUALITY',
  'router/politica': 'QUALITY',
  'router/descarte': 'RELIABILITY',
  'router/disponibilidad': 'RELIABILITY',
  'router/sin-demo-con-real': 'RELIABILITY',
  'router/coste': 'COST',
  'router/latencia': 'LATENCY',
};
