/*
 * FINÉS — Los errores de ËContact y de las encuestas (ver `../../es/servidor/social.ts`).
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Hyväksyttäviä pyyntöjä ei ole.',
  ecRelacionInvalida: 'Tämä pyyntö ei kelpaa.',
  ecNoLaRecibiste: 'Vain pyynnön saanut voi hyväksyä sen.',
  ecYaSonContactos: 'Olette jo ËContact-yhteyksiä.',
  ecIdentidadInvalida: 'Tämä profiili ei kelpaa.',
  ecIdentidadDesconocida: 'Tätä profiilia ei ole olemassa.',
  ecIdentidadAjena: 'Tämä profiili ei ole sinun.',
  ecMismaPersona: 'Et voi muodostaa yhteyttä itseesi.',
  ecYaExiste: 'Sinulla on jo yhteys tähän profiiliin.',
  ecIniciaSesion: 'Kirjaudu sisään, niin voit käyttää ËContact-toimintoa.',
  ecNoSeCompleto: 'Toimintoa ei voitu suorittaa loppuun. Yritä uudelleen.',
  ecFaltaPerfilPropio: 'Puuttuu profiili, jolla muodostat yhteyden.',
  ecFaltaPerfilAjeno: 'Puuttuu profiili, johon yhteys muodostetaan.',
  ecFaltaPerfilQueAcepta: 'Puuttuu profiili, jolla hyväksyt pyynnön.',
  ecFaltaPerfilQueEnvia: 'Puuttuu pyynnön lähettäjän profiili.',
  encSinEncuesta: 'Tässä julkaisussa ei ole kyselyä.',
  encInvalida: 'Tämä kysely ei kelpaa.',
  encAntigua: 'Tämä kysely on Weë-sovelluksen vanhasta versiosta, eikä siihen voi enää äänestää.',
  encOpcionInexistente: 'Tätä vaihtoehtoa ei ole tässä kyselyssä.',
  encCerrada: 'Tämä kysely on jo päättynyt.',
  encYaVotaste: 'Olet jo äänestänyt tässä kyselyssä.',
  encPostNoExiste: 'Tätä julkaisua ei enää ole.',
  encIniciaSesion: 'Sinun on kirjauduttava sisään, jotta voit äänestää.',
  encFaltaPublicacion: 'Julkaisu puuttuu.',
  encFaltaOpcion: 'Vaihtoehto puuttuu.',
  encNoSeRegistro: 'Ääntäsi ei voitu tallentaa. Yritä uudelleen.',
};
