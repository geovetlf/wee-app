/*
 * IRLANDÉS — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'ga',
  locale: 'ga_IE',
  alguien: 'Duine éigin',
  tituloDelEnlace: '{{nombre}} ar Weë',
  descripcionWeel: 'Weël ar Weë.',
  descripcionVideo: 'Físeán ar Weë.',
  descripcionImagen: 'Íomhá ar Weë.',
  descripcionEncuesta: 'Pobalbhreith ar Weë.',
  descripcionPublicacion: 'Postáil ar Weë.',
  explorar: 'Fiosraigh Weë',
  privacidad: 'Príobháideachas',
  terminos: 'Téarmaí',
  ayuda: 'Cabhair',
  yaNoDisponible: 'Níl an phostáil seo ar fáil a thuilleadh.',
  noDisponible: 'Níl an phostáil seo ar fáil.',
  masEnWee: 'agus {{contador}} eile ar Weë',
  hechoCon: 'Déanta le',
  reposteo: 'D\'athphostáil {{nombre}}',
  perfilWee: 'Próifíl Weë',
  estoEsWee: 'Seo é Weë',
  lema: 'An líonra dóibh siúd a chruthaíonn leis an Intleacht Shaorga. Faigh amach, foghlaim agus roinn.',
};
