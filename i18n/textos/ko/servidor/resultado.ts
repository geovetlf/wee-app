/*
 * COREANO — Textos del servidor: resultado (ver `../../es/servidor/resultado.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Ninguna partícula variable (은/는, 이/가, 을/를, 와/과, (으)로) va pegada a un hueco de texto: la frase se reordena o el hueco va detrás de dos puntos.
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: '{{numero}}일차',
  diaPalabra: '일차',
  presupuesto: '예산',
  presupuestoPalabra: '예산',
  escena: '장면 {{numero}}',
};
