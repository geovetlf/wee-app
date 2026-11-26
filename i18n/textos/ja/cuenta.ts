/*
 * JAPONÉS — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = 削除, la misma palabra que el botón «Eliminar» (common.delete); el japonés no tiene mayúsculas y se teclea con el IME en dos sílabas (さくじょ).
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'アカウントを削除',
  sectionDanger: '危険な操作',
  title: 'アカウントを削除',
  goesFaces: 'あなたのすべてのプロフィール：リアルプロフィールと分身',
  goesCharacter: 'キャラクターとそのアバター',
  goesPosts: '投稿、コメント、リアクション',
  goesMessages: 'WeeTalkのメッセージ：中身が消え、相手の会話にもそのメッセージは残りません',
  goesCreations: 'Weë AIの作品、プロジェクト、会話',
  goesContacts: '連絡先、コミュニティ、保存済み',
  goesCredits: '残っているCredits：失われ、返金されません',
  whatStaysTitle: '保持されるもの',
  staysRecords: 'Creditsと支払いの会計記録。これはWeëの会計帳簿であるため、あなたの名前やプロフィール情報を含まない形で保持されます。',
  confirmLabel: '確認のため、「{{palabra}}」と入力してください',
  confirmWord: '削除',
  confirmPlaceholder: 'ここに入力してください',
  dialogTitle: 'アカウントを削除しますか？',
  dialogConfirm: '削除',
  doneTitle: 'アカウントを削除しました',
  doneBody: 'Weëにご参加いただき、ありがとうございました。',
  reauthTitle: 'もう一度ログインしてください',
  reauthBody: 'セキュリティのため、アカウントを削除するには直前にログインしている必要があります。ログアウトしてもう一度ログインし、この手順をやり直してください。',
  reauthButton: 'ログアウトしてログインし直す',
  errorTitle: '完了できませんでした',
  errorBody: '途中で問題が発生しました。もう一度お試しください。中断したところから再開します。',
  retry: 'もう一度お試しください',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: '無効化され、30日後にすべて消去されます',
  introDesactivar: 'アカウントは今すぐ無効化され、30日以内に戻らなければ、すべてが完全に消去されます。',
  nowTitle: 'これからどうなるか',
  nowHidden: 'アカウントが表示されなくなります：誰もあなたのプロフィールや投稿を見られなくなります',
  nowCharacterOff: 'キャラクターの自律行動はオフになり、料金もかからなくなります',
  nowComeBack_one: '戻るまでの猶予は{{contador}}日です：もう一度ログインして「アカウントを有効化」を選んでください',
  nowComeBack_other: '戻るまでの猶予は{{contador}}日です：もう一度ログインして「アカウントを有効化」を選んでください',
  whatGoesLaterTitle: '戻らなかった場合に削除されるもの',
  deactivateButton: 'アカウントを削除する',
  dialogBodyDesactivar: 'アカウントは表示されなくなります。30日以内に戻らなければ、すべてが消去され、復元できません。',
  deactivating: 'アカウントを無効化しています…',
  deactivatedTitle: 'アカウントは無効化されています',
  deactivatedBody: '{{fecha}}まで戻ることができます。その後、すべてが完全に消去されます。',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'アカウントは無効化されています',
  activarBody: 'アカウントの削除をリクエストしました。無効化されている間、誰もあなたのプロフィールや投稿を見られません。',
  activarDaysLeft_one: '完全に削除されるまであと{{contador}}日',
  activarDaysLeft_other: '完全に削除されるまであと{{contador}}日',
  activarDate: '有効化しない場合、{{fecha}}に完全に消去されます。',
  activarCharacterNote: 'キャラクターの自律行動はオフのままです。いつでも設定し直せます。',
  activarButton: 'アカウントを有効化',
  activating: 'アカウントを有効化しています…',
  activatedTitle: 'アカウントが再び有効になりました',
  activarExpiredTitle: '戻れる期間が終了しました',
  activarExpiredBody: 'アカウントは数時間以内に完全に消去されます。',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '残っている{{creditos}} Credits：失われ、返金されません',
};
