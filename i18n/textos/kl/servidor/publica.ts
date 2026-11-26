/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — la página pública de una publicación (`/post/<id>`)
 * (ver `../../es/servidor/publica.ts`). Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 * Kalaallisut, NO danés. «Weë» nunca lleva sufijo: «en Weë» se dice con «Weë atorlugu» (usando Weë) o tras «·».
 * El hueco `{{nombre}}` va en absolutivo (sujeto de verbo intransitivo: «{{nombre}} saqqummiuteqqiivoq») o
 * antes de «·». «Profili Weë» = Perfil Weë (la palabra se traduce, la marca no).
 * Casi todo «pendiente de confirmación nativa».
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'kl',
  locale: 'kl_GL',
  alguien: 'Arlaat',
  tituloDelEnlace: '{{nombre}} · Weë',
  descripcionWeel: 'Weël, Weë atorlugu saqqummiussaq.',
  descripcionVideo: 'Video, Weë atorlugu saqqummiussaq.',
  descripcionImagen: 'Assi, Weë atorlugu saqqummiussaq.',
  descripcionEncuesta: 'Apersuineq, Weë atorlugu saqqummiussaq.',
  descripcionPublicacion: 'Saqqummiussaq, Weë atorlugu saqqummiunneqartoq.',
  explorar: 'Misissuigit: Weë',
  privacidad: 'Paasissutissanik illersuineq',
  terminos: 'Piumasaqaatit',
  ayuda: 'Ikiuineq',
  yaNoDisponible: 'Saqqummiussaq una atorneqarsinnaajunnaarpoq.',
  noDisponible: 'Saqqummiussaq una atorneqarsinnaanngilaq.',
  masEnWee: 'aammalu allat {{contador}} · Weë',
  hechoCon: 'Atorneqartut',
  reposteo: '{{nombre}} saqqummiuteqqiivoq',
  perfilWee: 'Profili Weë',
  estoEsWee: 'Tassa Weë',
  lema: 'AI atorlugu pilersitsisartut attaveqatigiiffiat. Nassaarit, ilinniarit siammarterillu.',
};
