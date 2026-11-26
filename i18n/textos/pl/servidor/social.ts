/*
 * POLACO — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin pasados de segunda persona, que marcarían el género de quien lee: «Twój głos jest już oddany».
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Nie ma żadnej prośby do zaakceptowania.',
  ecRelacionInvalida: 'Ta prośba jest nieprawidłowa.',
  ecNoLaRecibiste: 'Zaakceptować może tylko odbiorca prośby.',
  ecYaSonContactos: 'Jesteście już w swoich ËContact.',
  ecIdentidadInvalida: 'Ten profil jest nieprawidłowy.',
  ecIdentidadDesconocida: 'Ten profil nie istnieje.',
  ecIdentidadAjena: 'Ten profil nie należy do ciebie.',
  ecMismaPersona: 'Nie możesz połączyć się z własnym profilem.',
  ecYaExiste: 'Relacja z tym profilem już istnieje.',
  ecIniciaSesion: 'Zaloguj się, aby korzystać z ËContact.',
  ecNoSeCompleto: 'Nie udało się ukończyć operacji. Spróbuj ponownie.',
  ecFaltaPerfilPropio: 'Brakuje profilu, z którego chcesz się połączyć.',
  ecFaltaPerfilAjeno: 'Brakuje profilu, z którym chcesz się połączyć.',
  ecFaltaPerfilQueAcepta: 'Brakuje profilu, którym chcesz zaakceptować prośbę.',
  ecFaltaPerfilQueEnvia: 'Brakuje profilu osoby wysyłającej prośbę.',
  encSinEncuesta: 'Ten post nie ma ankiety.',
  encInvalida: 'Ta ankieta jest nieprawidłowa.',
  encAntigua: 'Ta ankieta pochodzi z wcześniejszej wersji Weë i nie przyjmuje już głosów.',
  encOpcionInexistente: 'Tej opcji nie ma w ankiecie.',
  encCerrada: 'Ta ankieta jest już zakończona.',
  encYaVotaste: 'Twój głos w tej ankiecie jest już oddany.',
  encPostNoExiste: 'Ten post już nie istnieje.',
  encIniciaSesion: 'Musisz się zalogować, aby zagłosować.',
  encFaltaPublicacion: 'Brakuje posta.',
  encFaltaOpcion: 'Brakuje opcji.',
  encNoSeRegistro: 'Nie udało się zapisać twojego głosu. Spróbuj ponownie.',
};
