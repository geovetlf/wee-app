/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» —«os teus {{lista}}», «Ainda não tens»— y el
 * gerundio va `estar a + infinitivo`. Una petición de conexión es un PEDIDO, no
 * una «solicitação», y lo que une a dos personas es una LIGAÇÃO, la palabra que
 * en Portugal se usa para las conexiones de una red. `{{lista}}` es el nombre de
 * la agenda y `{{nombre}}` el de una persona: las frases están escritas para que
 * el hueco caiga donde el portugués lo pide, sin pegar cadenas.
 *
 * EL CERO CAE EN PLURAL. `Intl.PluralRules` mete el 0 en `other` para `pt-PT`,
 * así que una agenda vacía dirá «0 ËContacts». Aun así las DOS formas llevan
 * `{{contador}}`: con un 1 escrito a mano, cualquier cambio de esa regla
 * volvería a producir el «1 ËContacts» de una agenda vacía.
 * Apóstrofo tipográfico ’ siempre.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Pedidos recebidos',
  requestsSent: 'Pedidos enviados',
  yours: 'Os teus {{lista}}',
  yoursWhenYouSignIn: 'Os teus {{lista}}, quando iniciares sessão',
  yoursWhenYouSignInSubtitle: '{{lista}} guarda as tuas ligações no Weë. Inicia sessão para as veres.',
  noneYet: 'Ainda não tens {{lista}}',
  noneYetSubtitle: 'Aqui vai ficar a tua gente no Weë. Uma ligação faz-se a dois: uma pessoa propõe e a outra aceita.',
  noAgenda: 'Este perfil não tem agenda',
  noAgendaSubtitle: '{{lista}} é onde ficam as tuas ligações com outras pessoas. Muda para o teu Perfil Real ou para o teu Perfil Weë para as veres.',
  wantsToConnect: '{{lista}} · quer ligar-se a ti',
  accept: 'Aceitar {{nombre}}',
  reject: 'Recusar {{nombre}}',
  withdraw: 'Retirar o pedido a {{nombre}}',
  removeFrom: 'Remover {{nombre}} dos teus {{lista}}',
  openProfile: 'Abrir o {{etiqueta}} de {{nombre}}',
  rejectTitle: 'Recusar pedido',
  rejectConfirm: 'Recusar o pedido de {{nombre}}?',
  withdrawTitle: 'Retirar pedido',
  withdrawConfirm: 'Retirar o teu pedido a {{nombre}}?',
  removeTitle: 'Remover {{lista}}',
  removeConfirm: 'Remover {{nombre}} dos teus {{lista}}?',
  failed: 'Não foi possível concluir',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'esta pessoa',
  acceptLabel: 'Aceitar {{lista}}',
  rejectRequestLabel: 'Recusar pedido de {{lista}}',
  requestSent: 'Pedido enviado',
  errSignIn: 'Inicia sessão para usares o ËContact.',
  errNotYours: 'Esse perfil não é teu.',
  errNotAPerson: 'Esse perfil não pode usar o ËContact.',
  errOffline: 'Não foi possível estabelecer ligação com o Weë.',
  errNoRequestToReject: 'Não tens nenhum pedido para recusar.',
  errNoPendingRequest: 'Não tens nenhum pedido pendente com este perfil.',
  errNotConnected: 'Não estás ligado a este perfil.',
  errNoActiveProfile: 'Não há nenhum perfil ativo com que fazer isto.',
};
