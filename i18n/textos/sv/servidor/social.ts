/*
 * SUECO — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las encuestas (ver
 * `../../es/servidor/social.ts`). «ËContact» es marca y no se declina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Det finns ingen förfrågan att acceptera.',
  ecRelacionInvalida: 'Den här förfrågan är inte giltig.',
  ecNoLaRecibiste: 'Bara den som fick förfrågan kan acceptera den.',
  ecYaSonContactos: 'Ni är redan kontakter i ËContact.',
  ecIdentidadInvalida: 'Den profilen är inte giltig.',
  ecIdentidadDesconocida: 'Den profilen finns inte.',
  ecIdentidadAjena: 'Den profilen är inte din.',
  ecMismaPersona: 'Du kan inte koppla ihop dig med dig själv.',
  ecYaExiste: 'Det finns redan en koppling till den här profilen.',
  ecIniciaSesion: 'Logga in för att använda ËContact.',
  ecNoSeCompleto: 'Det gick inte att slutföra åtgärden. Försök igen.',
  ecFaltaPerfilPropio: 'Profilen du kopplar från saknas.',
  ecFaltaPerfilAjeno: 'Profilen du vill koppla till saknas.',
  ecFaltaPerfilQueAcepta: 'Profilen du accepterar med saknas.',
  ecFaltaPerfilQueEnvia: 'Profilen som skickade förfrågan saknas.',
  encSinEncuesta: 'Det här inlägget har ingen omröstning.',
  encInvalida: 'Den här omröstningen är inte giltig.',
  encAntigua: 'Den här omröstningen är från en äldre version av Weë och tar inte längre emot röster.',
  encOpcionInexistente: 'Det alternativet finns inte i den här omröstningen.',
  encCerrada: 'Den här omröstningen är avslutad.',
  encYaVotaste: 'Du har redan röstat i den här omröstningen.',
  encPostNoExiste: 'Det här inlägget finns inte längre.',
  encIniciaSesion: 'Du måste logga in för att rösta.',
  encFaltaPublicacion: 'Inlägget saknas.',
  encFaltaOpcion: 'Alternativet saknas.',
  encNoSeRegistro: 'Det gick inte att registrera din röst. Försök igen.',
};
