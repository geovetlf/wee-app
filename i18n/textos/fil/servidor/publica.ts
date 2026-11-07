/*
 * FILIPINO — La página pública de una publicación (`/post/<id>`), la que abre quien recibe un enlace sin tener Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `codigo` es `fil`, lo que va en `<html lang>` (el mismo que escribe `IdiomaContext` en la app, guía § 1), y
 * `locale`, `tl_PH`, la etiqueta de Open Graph (`og:locale`): Facebook nombra así el filipino (no tiene `fil_PH`), y
 * `Intl` la lee como `fil-PH` (CLDR trata `tl` como alias). No son frases: son datos de la página.
 *
 * Weë va detrás de «sa», el marcador de la plataforma, sin nada pegado (guía § 6): «{{nombre}} sa Weë», «Isang
 * larawan sa Weë.». Una publicación es «post» y una encuesta, «poll» (glosario § 11.3). Los enlaces del pie dicen lo
 * mismo que el menú ☰ (`menu.privacy`, `menu.terms`, `menu.help`): «Privacy», «Mga tuntunin» y «Tulong». «Explorar
 * Weë» es «I-explore ang Weë» (glosario § 11.1: la acción de EXPLORE). El reposteo es la MISMA frase que
 * `wall.repostedBy` («Nag-repost si {{nombre}}») y la insignia, «Weë profile», como en el menú (`menu.weeProfile`).
 * «Hecho con» es «Ginawa gamit ang», lo mismo que dice la app en la publicación (`wall.madeWith`). «y 3 más en Weë»,
 * debajo de las fotos que no caben, sigue a `wall.moreImages`: «at {{contador}} pa sa Weë», con la partícula «pa»
 * detrás de la cifra y por eso sin enlace (§ 8.3). `alguien` es «Isang user», la MISMA palabra de `common.someone` y
 * de `avisos.alguien`: es el autor sin nombre («Isang user sa Weë» y el nombre de la tarjeta). Detrás de «si» no va
 * nunca —«si» no admite un sustantivo común (guía § 12)—, así que el reposteo sin nombre tiene su propia frase,
 * `reposteoSinNombre`: «May nag-repost», la MISMA de `wall.repostedBySinNombre`.
 *
 * El lema dice «Artificial Intelligence» entero porque el español escribe «Inteligencia Artificial» entero, y sigue a
 * `settings.aboutBody` y `help.a1`: «mga taong lumilikha gamit ang Artificial Intelligence». Los tres verbos van en
 * imperativo sin objeto, foco en quien actúa: «Tumuklas, matuto at magbahagi.».
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'fil',
  locale: 'tl_PH',
  alguien: 'Isang user',
  tituloDelEnlace: '{{nombre}} sa Weë',
  descripcionWeel: 'Isang Weël sa Weë.',
  descripcionVideo: 'Isang video sa Weë.',
  descripcionImagen: 'Isang larawan sa Weë.',
  descripcionEncuesta: 'Isang poll sa Weë.',
  descripcionPublicacion: 'Isang post sa Weë.',
  explorar: 'I-explore ang Weë',
  privacidad: 'Privacy',
  terminos: 'Mga tuntunin',
  ayuda: 'Tulong',
  yaNoDisponible: 'Hindi na available ang post na ito.',
  noDisponible: 'Hindi available ang post na ito.',
  masEnWee: 'at {{contador}} pa sa Weë',
  hechoCon: 'Ginawa gamit ang',
  reposteo: 'Nag-repost si {{nombre}}',
  reposteoSinNombre: 'May nag-repost',
  perfilWee: 'Weë profile',
  estoEsWee: 'Ito ang Weë',
  lema: 'Ang network para sa mga taong lumilikha gamit ang Artificial Intelligence. Tumuklas, matuto at magbahagi.',
};
