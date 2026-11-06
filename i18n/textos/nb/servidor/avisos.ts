/*
 * NORUEGO BOKMÅL — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos son las mismas frases que la pantalla de Notificaciones (`../notifications.ts`). `fotoUnica` es el
 * `photoOnce` de WeeTalk.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nytt likerklikk',
  likeCuerpo: '{{nombre}} likte innlegget ditt',
  comentarioTitulo: 'Ny kommentar',
  comentarioCuerpo: '{{nombre}} kommenterte innlegget ditt',
  seguidorTitulo: 'Ny følger',
  seguidorCuerpo: '{{nombre}} begynte å følge deg',
  solicitudTitulo: 'Ny ËContact-forespørsel',
  solicitudCuerpo: '{{nombre}} vil legge deg til i ËContact',
  aceptadaTitulo: 'Ny ËContact',
  aceptadaCuerpo: '{{nombre}} godtok forespørselen din om ËContact',
  mencionTitulo: 'Du ble nevnt',
  mencionCuerpo: '{{nombre}} nevnte deg i et innlegg',
  repostTitulo: 'Ny deling',
  repostCuerpo: '{{nombre}} delte innlegget ditt',
  respuestaTitulo: 'Nytt svar',
  respuestaCuerpo: '{{nombre}} svarte på kommentaren din',
  mensajeTitulo: 'Ny melding',
  mensajeCuerpo: '{{nombre}} sendte deg en melding',
  alguien: 'Noen',
  teEnvioUnMensaje: 'Sendte deg en melding',
  fotoUnica: 'Engangsbilde',
  imagen: '📷 Bilde',
  audio: '🎤 Lyd',
};
