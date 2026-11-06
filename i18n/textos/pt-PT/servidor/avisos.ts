/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Novo gosto',
  likeCuerpo: '{{nombre}} gostou da tua publicação',
  comentarioTitulo: 'Novo comentário',
  comentarioCuerpo: '{{nombre}} comentou a tua publicação',
  seguidorTitulo: 'Novo seguidor',
  seguidorCuerpo: '{{nombre}} começou a seguir-te',
  solicitudTitulo: 'Novo pedido de ËContact',
  solicitudCuerpo: '{{nombre}} quer adicionar-te ao ËContact',
  aceptadaTitulo: 'Novo ËContact',
  aceptadaCuerpo: '{{nombre}} aceitou o teu pedido de ËContact',
  mencionTitulo: 'Nova menção',
  mencionCuerpo: '{{nombre}} mencionou-te numa publicação',
  repostTitulo: 'Nova partilha',
  repostCuerpo: '{{nombre}} partilhou a tua publicação',
  respuestaTitulo: 'Nova resposta',
  respuestaCuerpo: '{{nombre}} respondeu ao teu comentário',
  mensajeTitulo: 'Nova mensagem',
  mensajeCuerpo: '{{nombre}} enviou-te uma mensagem',
  alguien: 'Alguém',
  teEnvioUnMensaje: 'Enviou-te uma mensagem',
  fotoUnica: 'Foto única',
  imagen: '📷 Imagem',
  audio: '🎤 Mensagem de voz',
};
