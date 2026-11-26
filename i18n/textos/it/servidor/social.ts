/*
 * ITALIANO — Lo que contestan las Functions sociales: ËContact y encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Non c’è nessuna richiesta da accettare.',
  ecRelacionInvalida: 'Questa richiesta non è valida.',
  ecNoLaRecibiste: 'Solo chi ha ricevuto la richiesta può accettarla.',
  ecYaSonContactos: 'Siete già ËContact.',
  ecIdentidadInvalida: 'Questo profilo non è valido.',
  ecIdentidadDesconocida: 'Questo profilo non esiste.',
  ecIdentidadAjena: 'Questo profilo non è tuo.',
  ecMismaPersona: 'Non puoi collegarti al tuo stesso profilo.',
  ecYaExiste: 'Esiste già una relazione con questo profilo.',
  ecIniciaSesion: 'Accedi per usare ËContact.',
  ecNoSeCompleto: 'Non è stato possibile completare l’operazione. Riprova.',
  ecFaltaPerfilPropio: 'Manca il profilo con cui ti colleghi.',
  ecFaltaPerfilAjeno: 'Manca il profilo a cui collegarti.',
  ecFaltaPerfilQueAcepta: 'Manca il profilo con cui accetti.',
  ecFaltaPerfilQueEnvia: 'Manca il profilo della persona che te l’ha inviata.',
  encSinEncuesta: 'Questo post non ha un sondaggio.',
  encInvalida: 'Questo sondaggio non è valido.',
  encAntigua: 'Questo sondaggio risale a una versione precedente di Weë e non accetta più voti.',
  encOpcionInexistente: 'Questa opzione non esiste in questo sondaggio.',
  encCerrada: 'Questo sondaggio è terminato.',
  encYaVotaste: 'Hai già votato in questo sondaggio.',
  encPostNoExiste: 'Questo post non esiste più.',
  encIniciaSesion: 'Devi accedere per votare.',
  encFaltaPublicacion: 'Manca il post.',
  encFaltaOpcion: 'Manca l’opzione.',
  encNoSeRegistro: 'Non è stato possibile registrare il tuo voto. Riprova.',
};
