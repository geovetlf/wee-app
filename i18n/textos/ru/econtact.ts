/*
 * RUSO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil
 * activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato con «вы» en minúscula. `{{lista}}` es el nombre de la agenda,
 * `{{nombre}}` el de una persona y `{{etiqueta}}` el del perfil: NINGUNO de los
 * tres se declina, así que las frases están escritas para que el hueco caiga
 * donde el ruso no pide caso —después de dos puntos, o en acusativo de animado,
 * que es donde `somePerson` («этого человека») encaja igual que un nombre—.
 *
 * ── POR QUÉ `count` NO LLEVA `_few` NI `_many` ──────────────────────────────
 *
 * Porque el sustantivo que se cuenta es `{{lista}}`, y `{{lista}}` es la MARCA
 * «ËContact»: no se declina ni en ruso ni en ningún idioma. Las cuatro formas
 * dirían exactamente lo mismo, así que `_one` y `_other` bastan. El español
 * escribía «1 {{lista}}» a pelo; en ruso el 21 y el 101 también caen en `_one`,
 * así que el número entra por hueco en las dos.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Полученные заявки',
  requestsSent: 'Отправленные заявки',
  yours: 'Ваши {{lista}}',
  yoursWhenYouSignIn: 'Ваши {{lista}} — после входа',
  yoursWhenYouSignInSubtitle: '{{lista}} хранит ваши связи в Weë. Войдите, чтобы увидеть их.',
  noneYet: 'У вас пока нет {{lista}}',
  noneYetSubtitle: 'Здесь будут ваши люди в Weë. Связь создаётся вдвоём: один предлагает, другой принимает.',
  noAgenda: 'У этого профиля нет списка контактов',
  noAgendaSubtitle: '{{lista}} — это место, где живут ваши связи с другими людьми. Переключитесь на Реальный профиль или на Профиль Weë, чтобы увидеть их.',
  wantsToConnect: '{{lista}} · хочет связаться с вами',
  accept: 'Принять {{nombre}}',
  reject: 'Отклонить {{nombre}}',
  withdraw: 'Отозвать заявку: {{nombre}}',
  removeFrom: 'Удалить {{nombre}} из ваших {{lista}}',
  openProfile: 'Открыть {{etiqueta}}: {{nombre}}',
  rejectTitle: 'Отклонить заявку',
  rejectConfirm: 'Отклонить заявку от {{nombre}}?',
  withdrawTitle: 'Отозвать заявку',
  withdrawConfirm: 'Отозвать вашу заявку: {{nombre}}?',
  removeTitle: 'Удалить {{lista}}',
  removeConfirm: 'Удалить {{nombre}} из ваших {{lista}}?',
  failed: 'Не удалось выполнить',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'этого человека',
  acceptLabel: 'Принять {{lista}}',
  rejectRequestLabel: 'Отклонить заявку {{lista}}',
  requestSent: 'Заявка отправлена',
  errSignIn: 'Войдите, чтобы пользоваться ËContact.',
  errNotYours: 'Это не ваш профиль.',
  errNotAPerson: 'Этот профиль не может пользоваться ËContact.',
  errSameProfile: 'Профиль не может связаться сам с собой.',
  errOffline: 'Не удалось связаться с Weë.',
  errNoRequestToReject: 'У вас нет заявки, которую можно отклонить.',
  errNoPendingRequest: 'У вас нет активной заявки к этому профилю.',
  errNotConnected: 'Вы не связаны с этим профилем.',
  errNoActiveProfile: 'Нет активного профиля, от имени которого можно это сделать.',
};
