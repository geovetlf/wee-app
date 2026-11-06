/*
 * NORUEGO BOKMÅL — Lo que contestan las Functions sociales: ËContact y encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana. «conectar» entre personas es «knytte kontakt» (glosario).
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Det finnes ingen forespørsel å godta.',
  ecRelacionInvalida: 'Denne forespørselen er ikke gyldig.',
  ecNoLaRecibiste: 'Bare den som mottok forespørselen, kan godta den.',
  ecYaSonContactos: 'Dere er allerede ËContacts.',
  ecIdentidadInvalida: 'Den profilen er ikke gyldig.',
  ecIdentidadDesconocida: 'Den profilen finnes ikke.',
  ecIdentidadAjena: 'Den profilen er ikke din.',
  ecMismaPersona: 'Du kan ikke knytte kontakt med deg selv.',
  ecYaExiste: 'Det finnes allerede en forbindelse med denne profilen.',
  ecIniciaSesion: 'Logg inn for å bruke ËContact.',
  ecNoSeCompleto: 'Operasjonen kunne ikke fullføres. Prøv igjen.',
  ecFaltaPerfilPropio: 'Det mangler hvilken profil du knytter kontakt med.',
  ecFaltaPerfilAjeno: 'Det mangler hvilken profil du vil knytte kontakt med.',
  ecFaltaPerfilQueAcepta: 'Det mangler hvilken profil du godtar med.',
  ecFaltaPerfilQueEnvia: 'Det mangler profilen til den som sendte den til deg.',
  encSinEncuesta: 'Dette innlegget har ingen avstemning.',
  encInvalida: 'Denne avstemningen er ikke gyldig.',
  encAntigua: 'Denne avstemningen er fra en tidligere versjon av Weë og tar ikke lenger imot stemmer.',
  encOpcionInexistente: 'Det alternativet finnes ikke i denne avstemningen.',
  encCerrada: 'Denne avstemningen er avsluttet.',
  encYaVotaste: 'Du har allerede stemt i denne avstemningen.',
  encPostNoExiste: 'Dette innlegget finnes ikke lenger.',
  encIniciaSesion: 'Du må logge inn for å stemme.',
  encFaltaPublicacion: 'Innlegget mangler.',
  encFaltaOpcion: 'Alternativet mangler.',
  encNoSeRegistro: 'Stemmen din kunne ikke registreres. Prøv igjen.',
};
