/*
 * FILIPINO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Taglish ng diksiyonaryo («I-delete», «Mag-sign in»). Ang confirmWord ay «I-DELETE», ang common.delete ng glosaryo sa malalaking titik («Burahin» ay itinapon ng rebisyon).
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'I-delete ang account',
  sectionDanger: 'Mapanganib na bahagi',
  title: 'I-delete ang account',
  goesFaces: 'Lahat ng profile mo: ang Tunay na profile mo at ang mga alter ego mo',
  goesCharacter: 'Ang karakter mo at ang avatar niya',
  goesPosts: 'Ang mga post, comment at reaksyon mo',
  goesMessages: 'Ang mga mensahe mo sa WeeTalk: mabubura ang laman nito, at mananatili ang usapan ng kausap mo nang wala ang mga ito',
  goesCreations: 'Ang mga likha, proyekto at usapan mo sa Weë AI',
  goesContacts: 'Ang mga contact, komunidad at naka-save mo',
  goesCredits: 'Ang natitira mong Credits: mawawala ang mga ito at hindi ibabalik',
  whatStaysTitle: 'Ang mananatili',
  staysRecords: 'Ang mga talaang pampinansiyal ng Credits at mga bayad. Itinatago ang mga ito nang wala ang pangalan mo o ang detalye ng profile mo, dahil bahagi ito ng pananalapi ng Weë.',
  confirmLabel: 'Para kumpirmahin, i-type ang “{{palabra}}”',
  confirmWord: 'I-DELETE',
  confirmPlaceholder: 'I-type dito ang salita',
  dialogTitle: 'I-delete ang account mo?',
  dialogConfirm: 'I-delete',
  doneTitle: 'Na-delete na ang account mo',
  doneBody: 'Salamat sa pagiging bahagi ng Weë.',
  reauthTitle: 'Mag-sign in ulit',
  reauthBody: 'Para sa seguridad, kailangang kaka-sign in mo lang para ma-delete ang account. Mag-sign out, mag-sign in ulit at ulitin ang mga hakbang na ito.',
  reauthButton: 'Mag-sign out para mag-sign in ulit',
  errorTitle: 'Hindi ito natapos',
  errorBody: 'May pumalya sa kalagitnaan. Subukan ulit: itutuloy ito kung saan ito huminto.',
  retry: 'Subukan ulit',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Ide-deactivate ito at, pagkalipas ng 30 araw, buburahin ang lahat',
  introDesactivar: 'Ide-deactivate na ngayon ang account mo at, kung hindi ka babalik sa loob ng 30 araw, tuluyang buburahin ang lahat.',
  nowTitle: 'Ang mangyayari ngayon',
  nowHidden: 'Hindi na makikita ang account mo: walang makakakita sa mga profile o post mo',
  nowCharacterOff: 'Mamamatay ang autonomy ng karakter mo at hihinto na ang paniningil',
  nowComeBack_one: 'May {{contador}} araw ka para bumalik: mag-sign in ulit at piliin ang “I-activate ang account”',
  nowComeBack_other: 'May {{contador}} na araw ka para bumalik: mag-sign in ulit at piliin ang “I-activate ang account”',
  whatGoesLaterTitle: 'Ang mabubura kapag hindi ka bumalik',
  deactivateButton: 'I-delete ang account ko',
  dialogBodyDesactivar: 'Hindi na makikita ang account mo. Kung hindi ka babalik sa loob ng 30 araw, mabubura ang lahat at hindi mo na ito mababawi.',
  deactivating: 'Dine-deactivate ang account mo…',
  deactivatedTitle: 'Naka-deactivate ang account mo',
  deactivatedBody: 'Hanggang {{fecha}} ka puwedeng bumalik. Pagkatapos noon, tuluyang mabubura ang lahat.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Naka-deactivate ang account mo',
  activarBody: 'Hiniling mong i-delete ang account mo. Habang naka-deactivate ito, walang nakakakita sa mga profile o post mo.',
  activarDaysLeft_one: '{{contador}} araw na lang bago ang tuluyang pagbura',
  activarDaysLeft_other: '{{contador}} na araw na lang bago ang tuluyang pagbura',
  activarDate: 'Kung hindi mo ito ia-activate, tuluyan itong mabubura sa {{fecha}}.',
  activarCharacterNote: 'Mananatiling patay ang autonomy ng karakter mo; puwede mo itong i-iskedyul ulit kahit kailan.',
  activarButton: 'I-activate ang account',
  activating: 'Ina-activate ang account mo…',
  activatedTitle: 'Aktibo na ulit ang account mo',
  activarExpiredTitle: 'Tapos na ang palugit para bumalik',
  activarExpiredBody: 'Tuluyang mabubura ang account mo sa susunod na ilang oras.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Ang natitira mong {{creditos}} Credits: mawawala ang mga ito at hindi ibabalik',
};
