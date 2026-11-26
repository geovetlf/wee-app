/*
 * HÚNGARO — Lo que contestan ËContact y las encuestas cuando algo no se puede hacer (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Nincs elfogadható kérés.',
  ecRelacionInvalida: 'Ez a kérés érvénytelen.',
  ecNoLaRecibiste: 'Csak az fogadhatja el, aki a kérést kapta.',
  ecYaSonContactos: 'Már ËContact-kapcsolatban vagytok.',
  ecIdentidadInvalida: 'Ez a profil érvénytelen.',
  ecIdentidadDesconocida: 'Ez a profil nem létezik.',
  ecIdentidadAjena: 'Ez a profil nem a tiéd.',
  ecMismaPersona: 'Saját magaddal nem kapcsolódhatsz.',
  ecYaExiste: 'Ezzel a profillal már van kapcsolat.',
  ecIniciaSesion: 'Jelentkezz be az ËContact használatához.',
  ecNoSeCompleto: 'A műveletet nem sikerült befejezni. Próbáld újra.',
  ecFaltaPerfilPropio: 'Hiányzik, melyik profiloddal kapcsolódsz.',
  ecFaltaPerfilAjeno: 'Hiányzik a profil, amellyel kapcsolódnál.',
  ecFaltaPerfilQueAcepta: 'Hiányzik, melyik profiloddal fogadod el.',
  ecFaltaPerfilQueEnvia: 'Hiányzik annak a profilja, aki a kérést küldte.',
  encSinEncuesta: 'Ehhez a bejegyzéshez nem tartozik szavazás.',
  encInvalida: 'Ez a szavazás érvénytelen.',
  encAntigua: 'Ez a szavazás a Weë egy korábbi verziójából származik, és már nem lehet rá szavazni.',
  encOpcionInexistente: 'Ez a lehetőség nem szerepel ebben a szavazásban.',
  encCerrada: 'Ez a szavazás már lezárult.',
  encYaVotaste: 'Ebben a szavazásban már szavaztál.',
  encPostNoExiste: 'Ez a bejegyzés már nem létezik.',
  encIniciaSesion: 'A szavazáshoz be kell jelentkezned.',
  encFaltaPublicacion: 'Hiányzik a bejegyzés.',
  encFaltaOpcion: 'Hiányzik a választott lehetőség.',
  encNoSeRegistro: 'Nem sikerült rögzíteni a szavazatodat. Próbáld újra.',
};
