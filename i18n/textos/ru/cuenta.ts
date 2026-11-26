/*
 * RUSO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Trato de «вы», como la ficha del personaje. «Аккаунт», como en auth.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from './plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'Удалить аккаунт',
  sectionDanger: 'Опасная зона',
  title: 'Удалить аккаунт',
  goesFaces: 'Все ваши профили: Реальный профиль и ваши альтер эго',
  goesCharacter: 'Ваш персонаж и его аватар',
  goesPosts: 'Ваши публикации, комментарии и реакции',
  goesMessages: 'Ваши сообщения в WeeTalk: они стираются, и в переписке собеседника их больше не будет',
  goesCreations: 'Ваши работы, проекты и разговоры в Weë AI',
  goesContacts: 'Ваши контакты, сообщества и сохранённое',
  goesCredits: 'Оставшиеся Credits: они сгорают и не возвращаются',
  whatStaysTitle: 'Что сохранится',
  staysRecords: 'Бухгалтерские записи о Credits и платежах. Они хранятся без вашего имени и данных профиля, потому что это бухгалтерия Weë.',
  confirmLabel: 'Для подтверждения введите «{{palabra}}»',
  confirmWord: 'УДАЛИТЬ',
  confirmPlaceholder: 'Введите слово здесь',
  dialogTitle: 'Удалить ваш аккаунт?',
  dialogConfirm: 'Удалить',
  doneTitle: 'Ваш аккаунт удалён',
  doneBody: 'Спасибо, что были частью Weë.',
  reauthTitle: 'Войдите снова',
  reauthBody: 'В целях безопасности удалить аккаунт можно только вскоре после входа. Выйдите, войдите снова и повторите эти шаги.',
  reauthButton: 'Выйти, чтобы войти снова',
  errorTitle: 'Не удалось завершить',
  errorBody: 'Что-то сбилось на полпути. Попробуйте снова: всё продолжится с того места, где остановилось.',
  retry: 'Попробовать снова',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Аккаунт отключается, а через 30 дней всё удаляется',
  introDesactivar: 'Ваш аккаунт отключится сейчас, и, если вы не вернётесь в течение 30 дней, всё будет удалено навсегда.',
  nowTitle: 'Что произойдёт сейчас',
  nowHidden: 'Ваш аккаунт перестанет быть виден: никто не увидит ваши профили и публикации',
  nowCharacterOff: 'Автономность вашего персонажа выключится, и списания прекратятся',
  nowComeBack_one: 'У вас есть {{contador}} день, чтобы вернуться: войдите снова и выберите «Активировать аккаунт»',
  nowComeBack_few: 'У вас есть {{contador}} дня, чтобы вернуться: войдите снова и выберите «Активировать аккаунт»',
  nowComeBack_many: 'У вас есть {{contador}} дней, чтобы вернуться: войдите снова и выберите «Активировать аккаунт»',
  nowComeBack_other: 'У вас есть {{contador}} дня, чтобы вернуться: войдите снова и выберите «Активировать аккаунт»',
  whatGoesLaterTitle: 'Что удалится, если вы не вернётесь',
  deactivateButton: 'Удалить мой аккаунт',
  dialogBodyDesactivar: 'Ваш аккаунт перестанет быть виден. Если вы не вернётесь в течение 30 дней, всё будет удалено и восстановить это будет нельзя.',
  deactivating: 'Отключаем ваш аккаунт…',
  deactivatedTitle: 'Ваш аккаунт отключён',
  deactivatedBody: 'Вернуться можно до {{fecha}}. После этого всё будет удалено навсегда.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Ваш аккаунт отключён',
  activarBody: 'Вы запросили удаление аккаунта. Пока он отключён, никто не видит ваши профили и публикации.',
  activarDaysLeft_one: 'До окончательного удаления остался {{contador}} день',
  activarDaysLeft_few: 'До окончательного удаления осталось {{contador}} дня',
  activarDaysLeft_many: 'До окончательного удаления осталось {{contador}} дней',
  activarDaysLeft_other: 'До окончательного удаления осталось {{contador}} дня',
  activarDate: 'Если вы его не активируете, он будет удалён навсегда {{fecha}}.',
  activarCharacterNote: 'Автономность вашего персонажа останется выключенной; вы сможете снова настроить её когда угодно.',
  activarButton: 'Активировать аккаунт',
  activating: 'Активируем ваш аккаунт…',
  activatedTitle: 'Ваш аккаунт снова активен',
  activarExpiredTitle: 'Срок для возвращения истёк',
  activarExpiredBody: 'Ваш аккаунт будет полностью удалён в ближайшие часы.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Оставшиеся {{creditos}} Credits: они сгорают и не возвращаются',
};
