/*
 * DANÉS — La página pública de una publicación (`/post/<id>`), la que abre quien recibe un enlace sin tener Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `codigo` es `da`, lo que va en `<html lang>` (así funciona también el guionado automático, guía § 7), y
 * `locale`, `da_DK`, la etiqueta de Open Graph (`og:locale`).
 *
 * Una publicación es «opslag» (et, invariable) y una encuesta, «afstemning» (glosario § 9.2); un Weël es «en
 * Weël» y Weë va detrás de «på», la preposición de la plataforma, sin declinar (guía § 4): «{{nombre}} på
 * Weë», «Et billede på Weë.». Los enlaces del pie dicen lo mismo que el menú: «Privatliv», «Vilkår» y
 * «Hjælp». «Explorar Weë» es el imperativo «Udforsk Weë», como la sección «UDFORSK» del menú. El reposteo es
 * la MISMA frase que `wall.repostedBy` («{{nombre}} delte igen») y la insignia, «Weë-profil», como en el menú.
 * «Hecho con» es «Lavet med», lo mismo que dice la app en la publicación (`wall.madeWith`, «Creado con»). «y 3 más en Weë», debajo de las fotos que no caben, sigue a
 * `wall.moreImages`: «og 3 til på Weë». `alguien` es «Nogen», la MISMA palabra de `avisos.alguien`.
 *
 * El lema dice «kunstig intelligens» entero porque el español escribe «Inteligencia Artificial» entero
 * (guía § 9.1), y sigue a `help.a1` y `settings.aboutBody`: «skaber med kunstig intelligens».
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'da',
  locale: 'da_DK',
  alguien: 'Nogen',
  tituloDelEnlace: '{{nombre}} på Weë',
  descripcionWeel: 'En Weël på Weë.',
  descripcionVideo: 'En video på Weë.',
  descripcionImagen: 'Et billede på Weë.',
  descripcionEncuesta: 'En afstemning på Weë.',
  descripcionPublicacion: 'Et opslag på Weë.',
  explorar: 'Udforsk Weë',
  privacidad: 'Privatliv',
  terminos: 'Vilkår',
  ayuda: 'Hjælp',
  yaNoDisponible: 'Dette opslag er ikke længere tilgængeligt.',
  noDisponible: 'Dette opslag er ikke tilgængeligt.',
  masEnWee: 'og {{contador}} til på Weë',
  hechoCon: 'Lavet med',
  reposteo: '{{nombre}} delte igen',
  perfilWee: 'Weë-profil',
  estoEsWee: 'Det her er Weë',
  lema: 'Netværket for dem, der skaber med kunstig intelligens. Opdag, lær og del.',
};
