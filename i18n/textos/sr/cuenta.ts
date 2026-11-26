/*
 * SERBIO (cirílico) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteo («ти»), ekavica, «налог» como en auth, «лик» para el personaje. El latino se GENERA desde aquí
 * (scripts/i18n-sr-latn.mjs): «ОБРИШИ» sale «OBRIŠI».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from '../ru/plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'Обриши налог',
  sectionDanger: 'Опасна зона',
  title: 'Обриши налог',
  goesFaces: 'Сви твоји профили: Прави профил и твоји алтер его профили',
  goesCharacter: 'Твој лик и његов аватар',
  goesPosts: 'Твоје објаве, коментари и реакције',
  goesMessages: 'Твоје поруке у WeeTalk ћаскању: празне се, а у разговору друге особе их више нема',
  goesCreations: 'Твоје креације, пројекти и разговори у Weë AI',
  goesContacts: 'Твоји контакти, заједнице и сачувано',
  goesCredits: 'Credits који су ти остали: губе се и не враћају се',
  whatStaysTitle: 'Шта остаје',
  staysRecords: 'Рачуноводствени записи о Credits и плаћањима. Чувају се без твог имена и података са профила, јер су то књиге Weë.',
  confirmLabel: 'Да потврдиш, упиши „{{palabra}}“',
  confirmWord: 'ОБРИШИ',
  confirmPlaceholder: 'Упиши реч овде',
  dialogTitle: 'Обрисати твој налог?',
  dialogConfirm: 'Обриши',
  doneTitle: 'Твој налог је обрисан',
  doneBody: 'Хвала ти на времену проведеном у Weë.',
  reauthTitle: 'Пријави се поново',
  reauthBody: 'Ради безбедности, налог може да се обрише само убрзо после пријаве. Одјави се, пријави се поново и понови ове кораке.',
  reauthButton: 'Одјави се да се поново пријавиш',
  errorTitle: 'Није могло да се заврши',
  errorBody: 'Нешто је пошло наопако на пола пута. Покушај поново: наставиће се тамо где је стало.',
  retry: 'Покушај поново',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Деактивира се, а после 30 дана брише се све',
  introDesactivar: 'Твој налог се сада деактивира и, ако се не вратиш у року од 30 дана, све се заувек брише.',
  nowTitle: 'Шта се дешава сада',
  nowHidden: 'Твој налог више није видљив: нико неће видети твоје профиле ни објаве',
  nowCharacterOff: 'Самосталност твог лика се искључује и више се ништа не наплаћује',
  nowComeBack_one: 'Имаш {{contador}} дан да се вратиш: поново се пријави и изабери „Активирај налог“',
  nowComeBack_few: 'Имаш {{contador}} дана да се вратиш: поново се пријави и изабери „Активирај налог“',
  nowComeBack_other: 'Имаш {{contador}} дана да се вратиш: поново се пријави и изабери „Активирај налог“',
  whatGoesLaterTitle: 'Шта се брише ако се не вратиш',
  deactivateButton: 'Обриши мој налог',
  dialogBodyDesactivar: 'Твој налог више неће бити видљив. Ако се не вратиш у року од 30 дана, све ће бити обрисано и нећеш моћи да га вратиш.',
  deactivating: 'Налог се деактивира…',
  deactivatedTitle: 'Твој налог је деактивиран',
  deactivatedBody: 'Имаш рок до {{fecha}} да се вратиш. После тога све ће бити заувек обрисано.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Твој налог је деактивиран',
  activarBody: 'Затражено је брисање твог налога. Док је деактивиран, нико не види твоје профиле ни објаве.',
  activarDaysLeft_one: 'До трајног брисања остао је {{contador}} дан',
  activarDaysLeft_few: 'До трајног брисања остала су {{contador}} дана',
  activarDaysLeft_other: 'До трајног брисања остало је {{contador}} дана',
  activarDate: 'Ако га не активираш, биће заувек обрисан {{fecha}}.',
  activarCharacterNote: 'Самосталност твог лика остаје искључена; можеш поново да је подесиш кад год желиш.',
  activarButton: 'Активирај налог',
  activating: 'Налог се активира…',
  activatedTitle: 'Твој налог је поново активан',
  activarExpiredTitle: 'Рок за повратак је истекао',
  activarExpiredBody: 'Твој налог ће бити потпуно обрисан у наредних неколико сати.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits који су ти остали: губе се и не враћају се',
};
