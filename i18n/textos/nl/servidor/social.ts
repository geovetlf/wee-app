/*
 * NEERLANDÉS — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Er is geen verzoek om te accepteren.',
  ecRelacionInvalida: 'Dit verzoek is niet geldig.',
  ecNoLaRecibiste: 'Alleen wie het verzoek heeft ontvangen, kan het accepteren.',
  ecYaSonContactos: 'Jullie zijn al ËContacts.',
  ecIdentidadInvalida: 'Dat profiel is niet geldig.',
  ecIdentidadDesconocida: 'Dat profiel bestaat niet.',
  ecIdentidadAjena: 'Dat profiel is niet van jou.',
  ecMismaPersona: 'Je kunt geen connectie met jezelf maken.',
  ecYaExiste: 'Er is al een relatie met dit profiel.',
  ecIniciaSesion: 'Log in om ËContact te gebruiken.',
  ecNoSeCompleto: 'De bewerking kon niet worden voltooid. Probeer het opnieuw.',
  ecFaltaPerfilPropio: 'Het profiel waarmee je connectie maakt, ontbreekt.',
  ecFaltaPerfilAjeno: 'Het profiel waarmee je connectie wilt maken, ontbreekt.',
  ecFaltaPerfilQueAcepta: 'Het profiel waarmee je accepteert, ontbreekt.',
  ecFaltaPerfilQueEnvia: 'Het profiel van wie het je heeft gestuurd, ontbreekt.',
  encSinEncuesta: 'Dit bericht heeft geen poll.',
  encInvalida: 'Deze poll is niet geldig.',
  encAntigua: 'Deze poll komt uit een eerdere versie van Weë en neemt geen stemmen meer aan.',
  encOpcionInexistente: 'Die optie bestaat niet in deze poll.',
  encCerrada: 'Deze poll is afgelopen.',
  encYaVotaste: 'Je hebt al gestemd in deze poll.',
  encPostNoExiste: 'Dit bericht bestaat niet meer.',
  encIniciaSesion: 'Je moet ingelogd zijn om te stemmen.',
  encFaltaPublicacion: 'Het bericht ontbreekt.',
  encFaltaOpcion: 'De optie ontbreekt.',
  encNoSeRegistro: 'Je stem kon niet worden geregistreerd. Probeer het opnieuw.',
};
