/*
 * BOSANSKI — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteo («ti»), ijekavica, «račun» como en auth, «lik» para el personaje.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from '../ru/plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'Izbriši račun',
  sectionDanger: 'Opasna zona',
  title: 'Izbriši račun',
  goesFaces: 'Svi tvoji profili: Pravi profil i tvoji alter ego profili',
  goesCharacter: 'Tvoj lik i njegov avatar',
  goesPosts: 'Tvoje objave, komentari i reakcije',
  goesMessages: 'Tvoje WeeTalk poruke: prazne se, a u razgovoru druge osobe ih više nema',
  goesCreations: 'Tvoje kreacije, projekti i razgovori u Weë AI',
  goesContacts: 'Tvoji kontakti, zajednice i sačuvano',
  goesCredits: 'Credits koji su ti ostali: gube se i ne vraćaju se',
  whatStaysTitle: 'Šta ostaje',
  staysRecords: 'Računovodstveni zapisi o Credits i plaćanjima. Čuvaju se bez tvog imena i podataka s profila, jer su to knjige Weë.',
  confirmLabel: 'Za potvrdu upiši „{{palabra}}“',
  confirmWord: 'IZBRIŠI',
  confirmPlaceholder: 'Upiši riječ ovdje',
  dialogTitle: 'Izbrisati tvoj račun?',
  dialogConfirm: 'Izbriši',
  doneTitle: 'Tvoj račun je izbrisan',
  doneBody: 'Hvala ti na vremenu provedenom u Weë.',
  reauthTitle: 'Prijavi se ponovo',
  reauthBody: 'Zbog sigurnosti, račun se može izbrisati samo ubrzo nakon prijave. Odjavi se, prijavi se ponovo i ponovi ove korake.',
  reauthButton: 'Odjavi se da se ponovo prijaviš',
  errorTitle: 'Nije se moglo završiti',
  errorBody: 'Nešto je zapelo na pola puta. Pokušaj ponovo: nastavit će se tamo gdje je stalo.',
  retry: 'Pokušaj ponovo',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Deaktivira se, a nakon 30 dana briše se sve',
  introDesactivar: 'Tvoj račun se sada deaktivira i, ako se ne vratiš u roku od 30 dana, sve se zauvijek briše.',
  nowTitle: 'Šta se dešava sada',
  nowHidden: 'Tvoj račun više nije vidljiv: niko neće vidjeti tvoje profile ni objave',
  nowCharacterOff: 'Samostalnost tvog lika se isključuje i više se ništa ne naplaćuje',
  nowComeBack_one: 'Imaš {{contador}} dan da se vratiš: ponovo se prijavi i izaberi „Aktiviraj račun“',
  nowComeBack_few: 'Imaš {{contador}} dana da se vratiš: ponovo se prijavi i izaberi „Aktiviraj račun“',
  nowComeBack_other: 'Imaš {{contador}} dana da se vratiš: ponovo se prijavi i izaberi „Aktiviraj račun“',
  whatGoesLaterTitle: 'Šta se briše ako se ne vratiš',
  deactivateButton: 'Izbriši moj račun',
  dialogBodyDesactivar: 'Tvoj račun više neće biti vidljiv. Ako se ne vratiš u roku od 30 dana, sve će biti izbrisano i nećeš ga moći vratiti.',
  deactivating: 'Račun se deaktivira…',
  deactivatedTitle: 'Tvoj račun je deaktiviran',
  deactivatedBody: 'Imaš rok do {{fecha}} da se vratiš. Nakon toga sve će biti zauvijek izbrisano.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Tvoj račun je deaktiviran',
  activarBody: 'Zatraženo je brisanje tvog računa. Dok je deaktiviran, niko ne vidi tvoje profile ni objave.',
  activarDaysLeft_one: 'Do trajnog brisanja ostao je {{contador}} dan',
  activarDaysLeft_few: 'Do trajnog brisanja ostala su {{contador}} dana',
  activarDaysLeft_other: 'Do trajnog brisanja ostalo je {{contador}} dana',
  activarDate: 'Ako ga ne aktiviraš, bit će zauvijek izbrisan {{fecha}}.',
  activarCharacterNote: 'Samostalnost tvog lika ostaje isključena; možeš je ponovo podesiti kad god želiš.',
  activarButton: 'Aktiviraj račun',
  activating: 'Račun se aktivira…',
  activatedTitle: 'Tvoj račun je ponovo aktivan',
  activarExpiredTitle: 'Rok za povratak je istekao',
  activarExpiredBody: 'Tvoj račun će biti potpuno izbrisan u narednih nekoliko sati.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits koji su ti ostali: gube se i ne vraćaju se',
};
