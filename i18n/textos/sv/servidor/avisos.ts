/*
 * SUECO — Las notificaciones push (ver `../../es/servidor/avisos.ts`). El NOMBRE de quien la provoca entra como valor
 * y no se traduce. `fotoUnica`, `imagen` y `audio` dicen lo mismo que `weetalk.photoOnce`, `imagePreview` y `audioPreview`.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Ny gillamarkering',
  likeCuerpo: '{{nombre}} gillade ditt inlägg',
  comentarioTitulo: 'Ny kommentar',
  comentarioCuerpo: '{{nombre}} kommenterade ditt inlägg',
  seguidorTitulo: 'Ny följare',
  seguidorCuerpo: '{{nombre}} började följa dig',
  solicitudTitulo: 'Ny ËContact-förfrågan',
  solicitudCuerpo: '{{nombre}} vill lägga till dig i ËContact',
  aceptadaTitulo: 'Ny ËContact',
  aceptadaCuerpo: '{{nombre}} accepterade din ËContact-förfrågan',
  mencionTitulo: 'Någon nämnde dig',
  mencionCuerpo: '{{nombre}} nämnde dig i ett inlägg',
  repostTitulo: 'Ny återpublicering',
  repostCuerpo: '{{nombre}} återpublicerade ditt inlägg',
  respuestaTitulo: 'Nytt svar',
  respuestaCuerpo: '{{nombre}} svarade på din kommentar',
  mensajeTitulo: 'Nytt meddelande',
  mensajeCuerpo: '{{nombre}} skickade ett meddelande till dig',
  alguien: 'Någon',
  teEnvioUnMensaje: 'Du har fått ett meddelande',
  fotoUnica: 'Engångsfoto',
  imagen: '📷 Foto',
  audio: '🎤 Röstmeddelande',
};
