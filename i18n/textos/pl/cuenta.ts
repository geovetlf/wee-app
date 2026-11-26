/*
 * POLACO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteo («ty»), «konto» como en auth; la postać es femenina, así que el registro habla en femenino.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from '../ru/plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'Usuń konto',
  sectionDanger: 'Strefa zagrożenia',
  title: 'Usuń konto',
  goesFaces: 'Wszystkie twoje profile: Prawdziwy profil i twoje alter ego',
  goesCharacter: 'Twoja postać i jej awatar',
  goesPosts: 'Twoje posty, komentarze i reakcje',
  goesMessages: 'Twoje wiadomości w WeeTalk: zostaną wyczyszczone, a w rozmowie drugiej osoby już ich nie będzie',
  goesCreations: 'Twoje dzieła, projekty i rozmowy w Weë AI',
  goesContacts: 'Twoje kontakty, społeczności i zapisane',
  goesCredits: 'Pozostałe Credits: przepadają i nie są zwracane',
  whatStaysTitle: 'Co zostaje',
  staysRecords: 'Zapisy księgowe dotyczące Credits i płatności. Są przechowywane bez twojego imienia i danych profilu, bo to księgowość Weë.',
  confirmLabel: 'Aby potwierdzić, wpisz „{{palabra}}”',
  confirmWord: 'USUŃ',
  confirmPlaceholder: 'Wpisz tutaj to słowo',
  dialogTitle: 'Usunąć twoje konto?',
  dialogConfirm: 'Usuń',
  doneTitle: 'Twoje konto zostało usunięte',
  doneBody: 'Dziękujemy za wspólny czas w Weë.',
  reauthTitle: 'Zaloguj się ponownie',
  reauthBody: 'Ze względów bezpieczeństwa konto można usunąć tylko krótko po zalogowaniu. Wyloguj się, zaloguj ponownie i powtórz te kroki.',
  reauthButton: 'Wyloguj się, aby zalogować się ponownie',
  errorTitle: 'Nie udało się dokończyć',
  errorBody: 'Coś się nie powiodło w połowie. Spróbuj jeszcze raz: proces wznowi się tam, gdzie się zatrzymał.',
  retry: 'Spróbuj jeszcze raz',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Konto zostaje dezaktywowane, a po 30 dniach wszystko jest usuwane',
  introDesactivar: 'Twoje konto zostanie teraz dezaktywowane, a jeśli nie wrócisz w ciągu 30 dni, wszystko zostanie usunięte na zawsze.',
  nowTitle: 'Co dzieje się teraz',
  nowHidden: 'Twoje konto przestaje być widoczne: nikt nie zobaczy twoich profili ani postów',
  nowCharacterOff: 'Samodzielność twojej postaci zostaje wyłączona i opłaty przestają być naliczane',
  nowComeBack_one: 'Masz {{contador}} dzień na powrót: zaloguj się ponownie i wybierz „Aktywuj konto”',
  nowComeBack_few: 'Masz {{contador}} dni na powrót: zaloguj się ponownie i wybierz „Aktywuj konto”',
  nowComeBack_many: 'Masz {{contador}} dni na powrót: zaloguj się ponownie i wybierz „Aktywuj konto”',
  nowComeBack_other: 'Masz {{contador}} dnia na powrót: zaloguj się ponownie i wybierz „Aktywuj konto”',
  whatGoesLaterTitle: 'Co zostanie usunięte, jeśli nie wrócisz',
  deactivateButton: 'Usuń moje konto',
  dialogBodyDesactivar: 'Twoje konto przestanie być widoczne. Jeśli nie wrócisz w ciągu 30 dni, wszystko zostanie usunięte i nie będzie można tego odzyskać.',
  deactivating: 'Dezaktywowanie konta…',
  deactivatedTitle: 'Twoje konto jest dezaktywowane',
  deactivatedBody: 'Masz czas do {{fecha}}, aby wrócić. Potem wszystko zostanie usunięte na zawsze.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Twoje konto jest dezaktywowane',
  activarBody: 'Złożono prośbę o usunięcie twojego konta. Dopóki jest dezaktywowane, nikt nie widzi twoich profili ani postów.',
  activarDaysLeft_one: 'Do trwałego usunięcia został {{contador}} dzień',
  activarDaysLeft_few: 'Do trwałego usunięcia zostały {{contador}} dni',
  activarDaysLeft_many: 'Do trwałego usunięcia zostało {{contador}} dni',
  activarDaysLeft_other: 'Do trwałego usunięcia zostało {{contador}} dnia',
  activarDate: 'Jeśli go nie aktywujesz, zostanie usunięte na zawsze {{fecha}}.',
  activarCharacterNote: 'Samodzielność twojej postaci pozostanie wyłączona; możesz ją ponownie zaplanować, kiedy zechcesz.',
  activarButton: 'Aktywuj konto',
  activating: 'Aktywowanie konta…',
  activatedTitle: 'Twoje konto jest znowu aktywne',
  activarExpiredTitle: 'Czas na powrót minął',
  activarExpiredBody: 'Twoje konto zostanie całkowicie usunięte w ciągu najbliższych godzin.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Pozostałe {{creditos}} Credits: przepadają i nie są zwracane',
};
