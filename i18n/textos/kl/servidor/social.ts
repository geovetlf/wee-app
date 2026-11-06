/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — lo que contestan las Functions sociales (ËContact y encuestas)
 * cuando algo no se puede hacer (ver `../../es/servidor/social.ts`).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés. «ËContact» es marca: sin sufijo nunca; va con «atorlugu» (usando ËContact) o como
 * objeto en absolutivo («ËContact atorniarukku»). Moldes: «Amigaataavoq: X» (falta X), «… iluatsinngilaq»,
 * «-reer-» (ya: «taaseereerputit» ya votaste). Encuesta = «apersuineq», solicitud = «qinnut» (glosario).
 * Casi todo «pendiente de confirmación nativa».
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Qinnut akuerisassaq peqanngilaq.',
  ecRelacionInvalida: 'Qinnut una atorsinnaanngilaq.',
  ecNoLaRecibiste: 'Qinnummik tigusisup kisimi akuerisinnaavaa.',
  ecYaSonContactos: 'ËContact atorlugu attaveqatigiireerpusi.',
  ecIdentidadInvalida: 'Profili una atorsinnaanngilaq.',
  ecIdentidadDesconocida: 'Profili taanna peqanngilaq.',
  ecIdentidadAjena: 'Profili taanna pigisarinngilat.',
  ecMismaPersona: 'Imminut attaveqarsinnaanngilatit.',
  ecYaExiste: 'Profilimut matumunnga attaveqareerputit.',
  ecIniciaSesion: 'ËContact atorniarukku iserit.',
  ecNoSeCompleto: 'Suliaq naammassineqarsinnaanngilaq. Misileqqiguk.',
  ecFaltaPerfilPropio: 'Amigaataavoq: profili sorleq atorlugu attaveqassanersutit.',
  ecFaltaPerfilAjeno: 'Amigaataavoq: profili sumut attaveqassanersutit.',
  ecFaltaPerfilQueAcepta: 'Amigaataavoq: profili sorleq atorlugu akuersissanersutit.',
  ecFaltaPerfilQueEnvia: 'Amigaataavoq: nassiussisup profilia.',
  encSinEncuesta: 'Saqqummiussaq una apersuineqanngilaq.',
  encInvalida: 'Apersuineq una atorsinnaanngilaq.',
  /* La marca va delante y sin sufijo (guía §3); pendiente de confirmación nativa. */
  encAntigua: 'Weë: apersuineq una nutarternermi siusinnerusumi pilersinneqarpoq, maannalu taasisoqarsinnaajunnaarpoq.',
  encOpcionInexistente: 'Periarfissaq taanna apersuinermi matumani peqanngilaq.',
  encCerrada: 'Apersuineq una naammassereerpoq.',
  encYaVotaste: 'Apersuinermi matumani taaseereerputit.',
  encPostNoExiste: 'Saqqummiussaq una peqarunnaarpoq.',
  encIniciaSesion: 'Taasiniaruit iserit.',
  encFaltaPublicacion: 'Amigaataavoq: saqqummiussaq.',
  encFaltaOpcion: 'Amigaataavoq: periarfissaq.',
  encNoSeRegistro: 'Taasinerit nalunaarsorneqarnera iluatsinngilaq. Misileqqiguk.',
};
