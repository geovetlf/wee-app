/*
 * FILIPINO — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las encuestas.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las de `econtact.ts` y `wall.ts`: una solicitud es «request», aceptar «tanggapin» y una conexión
 * «koneksyon»; la encuesta es «poll», el voto «boto» y la opción «opsyon» (glosario § 11.3). Las frases que el
 * español repite en otros módulos son aquí las MISMAS: `ecIdentidadAjena` = `econtact.errNotYours`, `ecIniciaSesion`
 * = `econtact.errSignIn`, `encAntigua` = `wall.pollLegacy` y `encNoSeRegistro` = `wall.pollVoteFailed` más «Subukan
 * ulit.». Los errores siguen la guía (§ 3.4): «Hindi ma-…» / «Hindi wasto» y el paso siguiente, «Subukan ulit».
 *
 * ËContact no se declina ni lleva nada pegado (guía § 6). «Ya sois ËContacts» se dice desde la persona que lo lee,
 * «Nasa ËContact mo na ang profile na ito», porque el filipino no tiene otra forma de decir «vosotros» que «kayo»,
 * que la guía reserva (§ 2) y que aquí se leería como trato de usted. «Conectar contigo misma» va sin género, como
 * todo el filipino: «kumonekta sa sarili mo». «Ya hay una relación con este perfil» salta cuando ya existe una
 * solicitud O una conexión, así que lo dice: «request o koneksyon».
 *
 * Las `ecFalta…` y `encFalta…` dicen qué dato no llegó con el pedido: «Hindi tinukoy kung aling profile …» y «Walang
 * tinukoy na post.», la misma forma que `motor.faltaTrabajo`. «Debes iniciar sesión» es «Kailangan mong mag-sign in»
 * (glosario § 11.7).
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Walang request na tatanggapin.',
  ecRelacionInvalida: 'Hindi wasto ang request na ito.',
  ecNoLaRecibiste: 'Ang pinadalhan lang ng request ang puwedeng tumanggap nito.',
  ecYaSonContactos: 'Nasa ËContact mo na ang profile na ito.',
  ecIdentidadInvalida: 'Hindi wasto ang profile na iyan.',
  ecIdentidadDesconocida: 'Walang ganyang profile.',
  ecIdentidadAjena: 'Hindi sa iyo ang profile na iyan.',
  ecMismaPersona: 'Hindi ka puwedeng kumonekta sa sarili mo.',
  ecYaExiste: 'May request o koneksyon ka na sa profile na ito.',
  ecIniciaSesion: 'Mag-sign in para magamit ang ËContact.',
  ecNoSeCompleto: 'Hindi makumpleto ang aksyon. Subukan ulit.',
  ecFaltaPerfilPropio: 'Hindi tinukoy kung aling profile mo ang gagamitin sa pagkonekta.',
  ecFaltaPerfilAjeno: 'Hindi tinukoy kung aling profile ang kokonektahan.',
  ecFaltaPerfilQueAcepta: 'Hindi tinukoy kung aling profile mo ang tatanggap.',
  ecFaltaPerfilQueEnvia: 'Hindi tinukoy ang profile ng nagpadala sa iyo ng request.',
  encSinEncuesta: 'Walang poll ang post na ito.',
  encInvalida: 'Hindi wasto ang poll na ito.',
  encAntigua: 'Galing sa lumang bersyon ng Weë ang poll na ito, kaya hindi na ito tumatanggap ng boto.',
  encOpcionInexistente: 'Walang ganyang opsyon sa poll na ito.',
  encCerrada: 'Tapos na ang poll na ito.',
  encYaVotaste: 'Nakaboto ka na sa poll na ito.',
  encPostNoExiste: 'Wala na ang post na ito.',
  encIniciaSesion: 'Kailangan mong mag-sign in para makaboto.',
  encFaltaPublicacion: 'Walang tinukoy na post.',
  encFaltaOpcion: 'Walang tinukoy na opsyon.',
  encNoSeRegistro: 'Hindi maitala ang boto mo. Subukan ulit.',
};
