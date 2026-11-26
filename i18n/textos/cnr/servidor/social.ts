/*
 * MONTENEGRINO (ijekaviano, latino) — Lo que contestan las Functions sociales (ver `../../es/servidor/social.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Nema zahtjeva za prihvatanje.',
  ecRelacionInvalida: 'Ovaj zahtjev nije važeći.',
  ecNoLaRecibiste: 'Zahtjev može da prihvati samo osoba koja ga je primila.',
  ecYaSonContactos: 'Već ste ËContacts.',
  ecIdentidadInvalida: 'Taj profil nije važeći.',
  ecIdentidadDesconocida: 'Taj profil ne postoji.',
  ecIdentidadAjena: 'Taj profil nije tvoj.',
  ecMismaPersona: 'Ne možeš da se povežeš sa sobom.',
  ecYaExiste: 'Već postoji veza s ovim profilom.',
  ecIniciaSesion: 'Prijavi se da koristiš ËContact.',
  ecNoSeCompleto: 'Radnja nije mogla da se dovrši. Pokušaj ponovo.',
  ecFaltaPerfilPropio: 'Nedostaje profil kojim se povezuješ.',
  ecFaltaPerfilAjeno: 'Nedostaje profil s kojim se povezuješ.',
  ecFaltaPerfilQueAcepta: 'Nedostaje profil kojim prihvataš.',
  ecFaltaPerfilQueEnvia: 'Nedostaje profil osobe koja ti ga je poslala.',
  encSinEncuesta: 'Ova objava nema anketu.',
  encInvalida: 'Ova anketa nije važeća.',
  encAntigua: 'Ova anketa je iz starije verzije aplikacije Weë i više ne prima glasove.',
  encOpcionInexistente: 'Ta opcija ne postoji u ovoj anketi.',
  encCerrada: 'Ova anketa je završena.',
  encYaVotaste: 'Tvoj glas je već zabilježen u ovoj anketi.',
  encPostNoExiste: 'Ova objava više ne postoji.',
  encIniciaSesion: 'Prijavi se za glasanje.',
  encFaltaPublicacion: 'Nedostaje objava.',
  encFaltaOpcion: 'Nedostaje opcija.',
  encNoSeRegistro: 'Tvoj glas nije mogao da se zabilježi. Pokušaj ponovo.',
};
