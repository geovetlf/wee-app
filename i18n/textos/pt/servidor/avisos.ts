/*
 * PORTUGUÉS (pt-BR) — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nova curtida',
  likeCuerpo: '{{nombre}} curtiu sua publicação',
  comentarioTitulo: 'Novo comentário',
  comentarioCuerpo: '{{nombre}} comentou na sua publicação',
  seguidorTitulo: 'Novo seguidor',
  seguidorCuerpo: '{{nombre}} começou a seguir você',
  solicitudTitulo: 'Nova solicitação de ËContact',
  solicitudCuerpo: '{{nombre}} quer adicionar você ao ËContact',
  aceptadaTitulo: 'Novo ËContact',
  aceptadaCuerpo: '{{nombre}} aceitou sua solicitação de ËContact',
  mencionTitulo: 'Nova menção',
  mencionCuerpo: '{{nombre}} mencionou você em uma publicação',
  repostTitulo: 'Novo compartilhamento',
  repostCuerpo: '{{nombre}} compartilhou sua publicação',
  respuestaTitulo: 'Nova resposta',
  respuestaCuerpo: '{{nombre}} respondeu ao seu comentário',
  mensajeTitulo: 'Nova mensagem',
  mensajeCuerpo: '{{nombre}} enviou uma mensagem para você',
  alguien: 'Alguém',
  teEnvioUnMensaje: 'Enviou uma mensagem para você',
  fotoUnica: 'Foto única',
  imagen: '📷 Imagem',
  audio: '🎤 Áudio',
};
