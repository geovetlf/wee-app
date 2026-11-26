/*
 * RUMANO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteo («tu»), «cont» como en auth, diacríticos con coma (ș ț).
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from '../ru/plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'Șterge contul',
  sectionDanger: 'Zonă periculoasă',
  title: 'Șterge contul',
  goesFaces: 'Toate profilurile tale: Profilul real și alter ego-urile tale',
  goesCharacter: 'Personajul tău și avatarul lui',
  goesPosts: 'Postările, comentariile și reacțiile tale',
  goesMessages: 'Mesajele tale din WeeTalk: se golesc, iar conversația celeilalte persoane rămâne fără ele',
  goesCreations: 'Creațiile, proiectele și conversațiile tale din Weë AI',
  goesContacts: 'Contactele, comunitățile și elementele tale salvate',
  goesCredits: 'Credits care ți-au rămas: se pierd și nu se rambursează',
  whatStaysTitle: 'Ce se păstrează',
  staysRecords: 'Înregistrările contabile despre Credits și plăți. Se păstrează fără numele tău și fără datele profilului, pentru că sunt contabilitatea Weë.',
  confirmLabel: 'Pentru confirmare, scrie „{{palabra}}”',
  confirmWord: 'ȘTERGE',
  confirmPlaceholder: 'Scrie cuvântul aici',
  dialogTitle: 'Îți ștergi contul?',
  dialogConfirm: 'Șterge',
  doneTitle: 'Contul tău a fost șters',
  doneBody: 'Îți mulțumim că ai făcut parte din Weë.',
  reauthTitle: 'Conectează-te din nou',
  reauthBody: 'Pentru siguranța ta, ca să îți ștergi contul trebuie să te fi conectat recent. Deconectează-te, conectează-te din nou și repetă acești pași.',
  reauthButton: 'Deconectează-te ca să te reconectezi',
  errorTitle: 'Nu s-a putut termina',
  errorBody: 'Ceva a eșuat la jumătatea drumului. Încearcă din nou: se va relua de unde a rămas.',
  retry: 'Încearcă din nou',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Se dezactivează și, după 30 de zile, se șterge totul',
  introDesactivar: 'Contul tău se dezactivează acum și, dacă nu revii în 30 de zile, totul se șterge definitiv.',
  nowTitle: 'Ce se întâmplă acum',
  nowHidden: 'Contul tău nu mai este vizibil: nimeni nu îți va vedea profilurile sau postările',
  nowCharacterOff: 'Autonomia personajului tău se oprește și nu se mai taxează nimic',
  nowComeBack_one: 'Ai {{contador}} zi ca să revii: conectează-te din nou și alege „Activează contul”',
  nowComeBack_few: 'Ai {{contador}} zile ca să revii: conectează-te din nou și alege „Activează contul”',
  nowComeBack_other: 'Ai {{contador}} de zile ca să revii: conectează-te din nou și alege „Activează contul”',
  whatGoesLaterTitle: 'Ce se șterge dacă nu revii',
  deactivateButton: 'Șterge-mi contul',
  dialogBodyDesactivar: 'Contul tău nu va mai fi vizibil. Dacă nu revii în 30 de zile, totul va fi șters și nu vei mai putea recupera nimic.',
  deactivating: 'Se dezactivează contul tău…',
  deactivatedTitle: 'Contul tău este dezactivat',
  deactivatedBody: 'Ai timp până pe {{fecha}} să revii. După aceea, totul va fi șters definitiv.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Contul tău este dezactivat',
  activarBody: 'Ai cerut ștergerea contului. Cât timp este dezactivat, nimeni nu îți vede profilurile sau postările.',
  activarDaysLeft_one: 'Mai rămâne {{contador}} zi până la ștergerea definitivă',
  activarDaysLeft_few: 'Mai rămân {{contador}} zile până la ștergerea definitivă',
  activarDaysLeft_other: 'Mai rămân {{contador}} de zile până la ștergerea definitivă',
  activarDate: 'Dacă nu îl activezi, va fi șters definitiv pe {{fecha}}.',
  activarCharacterNote: 'Autonomia personajului tău va rămâne oprită; o poți programa din nou oricând vrei.',
  activarButton: 'Activează contul',
  activating: 'Se activează contul tău…',
  activatedTitle: 'Contul tău este din nou activ',
  activarExpiredTitle: 'Termenul de revenire s-a încheiat',
  activarExpiredBody: 'Contul tău va fi șters complet în următoarele ore.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits care ți-au rămas: se pierd și nu se rambursează',
};
