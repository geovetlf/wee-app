/*
 * PORTUGUÉS (pt-BR) — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). `{{lista}}` es el nombre de la agenda y
 * `{{nombre}}` el de una persona: las frases están escritas para que el hueco
 * caiga donde el portugués lo pide, sin pegar cadenas. En portugués el CERO cae
 * en la forma singular, por eso `count_one` lleva `{{contador}}` y no un 1
 * escrito a mano: con un 1 fijo, una agenda vacía diría "1 ËContacts".
 * Apóstrofo tipográfico ’ siempre.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Solicitações recebidas',
  requestsSent: 'Solicitações enviadas',
  yours: 'Seus {{lista}}',
  yoursWhenYouSignIn: 'Seus {{lista}}, quando você entrar',
  yoursWhenYouSignInSubtitle: '{{lista}} guarda suas conexões no Weë. Entre para vê-las.',
  noneYet: 'Você ainda não tem {{lista}}',
  noneYetSubtitle: 'Aqui vai ficar a sua gente no Weë. Uma conexão se faz a dois: uma pessoa propõe e a outra aceita.',
  noAgenda: 'Este perfil não tem agenda',
  noAgendaSubtitle: '{{lista}} é onde ficam suas conexões com outras pessoas. Mude para o seu Perfil Real ou para o seu Perfil Weë para vê-las.',
  wantsToConnect: '{{lista}} · quer se conectar com você',
  accept: 'Aceitar {{nombre}}',
  reject: 'Recusar {{nombre}}',
  withdraw: 'Retirar a solicitação para {{nombre}}',
  removeFrom: 'Remover {{nombre}} dos seus {{lista}}',
  openProfile: 'Abrir o {{etiqueta}} de {{nombre}}',
  rejectTitle: 'Recusar solicitação',
  rejectConfirm: 'Recusar a solicitação de {{nombre}}?',
  withdrawTitle: 'Retirar solicitação',
  withdrawConfirm: 'Retirar sua solicitação para {{nombre}}?',
  removeTitle: 'Remover {{lista}}',
  removeConfirm: 'Remover {{nombre}} dos seus {{lista}}?',
  failed: 'Não foi possível concluir',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'esta pessoa',
  acceptLabel: 'Aceitar {{lista}}',
  rejectRequestLabel: 'Recusar solicitação de {{lista}}',
  requestSent: 'Solicitação enviada',
};
