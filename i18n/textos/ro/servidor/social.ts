/*
 * RUMANO — Lo que contestan las Functions sociales cuando algo no se puede hacer (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Nu există nicio cerere de acceptat.',
  ecRelacionInvalida: 'Această cerere nu este validă.',
  ecNoLaRecibiste: 'Poate accepta doar cine a primit cererea.',
  ecYaSonContactos: 'Sunteți deja ËContacts.',
  ecIdentidadInvalida: 'Acest profil nu este valid.',
  ecIdentidadDesconocida: 'Acest profil nu există.',
  ecIdentidadAjena: 'Acest profil nu este al tău.',
  ecMismaPersona: 'Nu te poți conecta cu propriul profil.',
  ecYaExiste: 'Există deja o relație cu acest profil.',
  ecIniciaSesion: 'Conectează-te ca să folosești ËContact.',
  ecNoSeCompleto: 'Operațiunea nu a putut fi finalizată. Încearcă din nou.',
  ecFaltaPerfilPropio: 'Lipsește profilul cu care te conectezi.',
  ecFaltaPerfilAjeno: 'Lipsește profilul cu care vrei să te conectezi.',
  ecFaltaPerfilQueAcepta: 'Lipsește profilul cu care accepți.',
  ecFaltaPerfilQueEnvia: 'Lipsește profilul celui care ți-a trimis cererea.',
  encSinEncuesta: 'Această postare nu are un sondaj.',
  encInvalida: 'Acest sondaj nu este valid.',
  encAntigua: 'Acest sondaj este dintr-o versiune anterioară a Weë și nu mai acceptă voturi.',
  encOpcionInexistente: 'Această opțiune nu există în acest sondaj.',
  encCerrada: 'Acest sondaj s-a încheiat deja.',
  encYaVotaste: 'Ai votat deja în acest sondaj.',
  encPostNoExiste: 'Această postare nu mai există.',
  encIniciaSesion: 'Trebuie să te conectezi ca să votezi.',
  encFaltaPublicacion: 'Lipsește postarea.',
  encFaltaOpcion: 'Lipsește opțiunea.',
  encNoSeRegistro: 'Votul tău nu a putut fi înregistrat. Încearcă din nou.',
};
