/*
 * HÚNGARO — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Új kedvelés',
  likeCuerpo: '{{nombre}} kedvelte a bejegyzésedet',
  comentarioTitulo: 'Új hozzászólás',
  comentarioCuerpo: '{{nombre}} hozzászólt a bejegyzésedhez',
  seguidorTitulo: 'Új követő',
  seguidorCuerpo: '{{nombre}} elkezdett követni',
  solicitudTitulo: 'Új ËContact-kérés',
  solicitudCuerpo: '{{nombre}} ËContact-kérést küldött neked',
  aceptadaTitulo: 'Új ËContact',
  aceptadaCuerpo: '{{nombre}} elfogadta az ËContact-kérésedet',
  mencionTitulo: 'Megemlítettek',
  mencionCuerpo: '{{nombre}} megemlített egy bejegyzésben',
  repostTitulo: 'Új újraosztás',
  repostCuerpo: '{{nombre}} újraosztotta a bejegyzésedet',
  respuestaTitulo: 'Új válasz',
  respuestaCuerpo: '{{nombre}} válaszolt a hozzászólásodra',
  mensajeTitulo: 'Új üzenet',
  mensajeCuerpo: '{{nombre}} üzenetet küldött neked',
  alguien: 'Valaki',
  teEnvioUnMensaje: 'Üzenetet küldött neked',
  fotoUnica: 'Egyszer megtekinthető fotó',
  imagen: '📷 Kép',
  audio: '🎤 Hang',
};
