/*
 * ISLANDÉS (is · is-IS) — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph. «en Weë» es «í Weë» (marca
 * invariable tras preposición, guía § 2); `{{nombre}}` en nominativo. Weël intacto.
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'is',
  locale: 'is_IS',
  alguien: 'Einhver',
  tituloDelEnlace: '{{nombre}} í Weë',
  descripcionWeel: 'Weël í Weë.',
  descripcionVideo: 'Myndband í Weë.',
  descripcionImagen: 'Mynd í Weë.',
  descripcionEncuesta: 'Könnun í Weë.',
  descripcionPublicacion: 'Færsla í Weë.',
  explorar: 'Kanna Weë',
  privacidad: 'Persónuvernd',
  terminos: 'Skilmálar',
  ayuda: 'Hjálp',
  yaNoDisponible: 'Þessi færsla er ekki lengur tiltæk.',
  noDisponible: 'Þessi færsla er ekki tiltæk.',
  masEnWee: 'og {{contador}} í viðbót í Weë',
  hechoCon: 'Gert með',
  reposteo: '{{nombre}} endurbirti',
  perfilWee: 'Weë-prófíll',
  estoEsWee: 'Þetta er Weë',
  lema: 'Samfélag þeirra sem skapa með gervigreind. Uppgötvaðu, lærðu og deildu.',
};
