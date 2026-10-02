/*
 * DANÉS — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las encuestas.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las de `econtact.ts` y `wall.ts`: una solicitud es «anmodning», aceptar «acceptere» y una
 * conexión, «forbindelse» (glosario § 9.6); la encuesta es «afstemning», el voto «stemme» y la opción
 * «valgmulighed» (glosario § 9.2). Las frases que el español repite en otros módulos son aquí las MISMAS:
 * `ecIdentidadAjena` = `econtact.errNotYours`, `ecIniciaSesion` = `econtact.errSignIn`, `encInvalida` =
 * `composer.pollErrInvalid` y `encAntigua` = `wall.pollLegacy`. Los errores siguen el patrón de la guía (§ 8):
 * «… kunne ikke … Prøv igen.».
 *
 * ËContact no se declina ni lleva terminación pegada (guía § 4): «Ya sois ËContacts» es «I er allerede
 * forbundet i ËContact», sin la «s» del plural. «Conectar contigo misma» va sin género, como todo el danés:
 * «oprette forbindelse til dig selv». «Ya hay una relación con este perfil» salta cuando ya existe una
 * solicitud O una conexión, así que lo dice: «en anmodning eller forbindelse».
 *
 * Las `ecFalta…` y `encFalta…` dicen qué dato no llegó: «Der mangler den profil, …» y «Opslaget mangler.», como
 * `filmmaker.valRelationMissing` («Der mangler en relation …»). «Debes iniciar sesión» es «Du skal logge ind»
 * (glosario § 9.3: Log ind).
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Der er ingen anmodning at acceptere.',
  ecRelacionInvalida: 'Denne anmodning er ikke gyldig.',
  ecNoLaRecibiste: 'Kun den, der har modtaget anmodningen, kan acceptere den.',
  ecYaSonContactos: 'I er allerede forbundet i ËContact.',
  ecIdentidadInvalida: 'Den profil er ikke gyldig.',
  ecIdentidadDesconocida: 'Den profil findes ikke.',
  ecIdentidadAjena: 'Den profil er ikke din.',
  ecMismaPersona: 'Du kan ikke oprette forbindelse til dig selv.',
  ecYaExiste: 'Der er allerede en anmodning eller forbindelse til denne profil.',
  ecIniciaSesion: 'Log ind for at bruge ËContact.',
  ecNoSeCompleto: 'Handlingen kunne ikke gennemføres. Prøv igen.',
  ecFaltaPerfilPropio: 'Der mangler den profil, du opretter forbindelse fra.',
  ecFaltaPerfilAjeno: 'Der mangler den profil, du vil oprette forbindelse til.',
  ecFaltaPerfilQueAcepta: 'Der mangler den profil, du accepterer med.',
  ecFaltaPerfilQueEnvia: 'Der mangler profilen på den, der sendte dig anmodningen.',
  encSinEncuesta: 'Dette opslag har ingen afstemning.',
  encInvalida: 'Afstemningen er ikke gyldig.',
  encAntigua: 'Denne afstemning er fra en tidligere version af Weë og kan ikke længere modtage stemmer.',
  encOpcionInexistente: 'Den valgmulighed findes ikke i denne afstemning.',
  encCerrada: 'Denne afstemning er allerede afsluttet.',
  encYaVotaste: 'Du har allerede stemt i denne afstemning.',
  encPostNoExiste: 'Dette opslag findes ikke længere.',
  encIniciaSesion: 'Du skal logge ind for at stemme.',
  encFaltaPublicacion: 'Opslaget mangler.',
  encFaltaOpcion: 'Valgmuligheden mangler.',
  encNoSeRegistro: 'Din stemme kunne ikke registreres. Prøv igen.',
};
