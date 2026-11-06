/*
 * CATALÁN — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Las mismas formas que `../notifications.ts`. `likeCuerpo` pone el nombre detrás de «A» porque «agradar» pide dativo.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nou m\'agrada',
  likeCuerpo: 'A {{nombre}} li ha agradat la teva publicació',
  comentarioTitulo: 'Nou comentari',
  comentarioCuerpo: '{{nombre}} ha comentat la teva publicació',
  seguidorTitulo: 'Nou seguidor',
  seguidorCuerpo: '{{nombre}} ha començat a seguir-te',
  solicitudTitulo: 'Nova sol·licitud d\'ËContact',
  solicitudCuerpo: '{{nombre}} vol afegir-te a ËContact',
  aceptadaTitulo: 'Nou ËContact',
  aceptadaCuerpo: '{{nombre}} ha acceptat la teva sol·licitud d\'ËContact',
  mencionTitulo: 'T\'han mencionat',
  mencionCuerpo: '{{nombre}} t\'ha mencionat en una publicació',
  repostTitulo: 'Nova republicació',
  repostCuerpo: '{{nombre}} ha compartit la teva publicació',
  respuestaTitulo: 'Nova resposta',
  respuestaCuerpo: '{{nombre}} ha respost al teu comentari',
  mensajeTitulo: 'Nou missatge',
  mensajeCuerpo: '{{nombre}} t\'ha enviat un missatge',
  alguien: 'Algú',
  teEnvioUnMensaje: 'T\'ha enviat un missatge',
  fotoUnica: 'Foto única',
  imagen: '📷 Imatge',
  audio: '🎤 Àudio',
};
