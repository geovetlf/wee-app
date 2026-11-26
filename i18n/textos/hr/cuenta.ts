/*
 * HRVATSKI — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteo («ti»), «račun» como en auth, «lik» para el personaje.
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
  goesMessages: 'Tvoje poruke u WeeTalk razgovorima: prazne se, a u razgovoru druge osobe ih više nema',
  goesCreations: 'Tvoje kreacije, projekti i razgovori u Weë AI',
  goesContacts: 'Tvoji kontakti, zajednice i spremljeno',
  goesCredits: 'Credits koji su ti ostali: gube se i ne vraćaju se',
  whatStaysTitle: 'Što ostaje',
  staysRecords: 'Računovodstveni zapisi o Credits i plaćanjima. Čuvaju se bez tvojeg imena i podataka s profila, jer su to poslovne knjige Weë.',
  confirmLabel: 'Za potvrdu upiši „{{palabra}}“',
  confirmWord: 'IZBRIŠI',
  confirmPlaceholder: 'Ovdje upiši riječ',
  dialogTitle: 'Izbrisati tvoj račun?',
  dialogConfirm: 'Izbriši',
  doneTitle: 'Tvoj račun je izbrisan',
  doneBody: 'Hvala ti na vremenu provedenom u Weë.',
  reauthTitle: 'Ponovno se prijavi',
  reauthBody: 'Zbog sigurnosti, račun se može izbrisati samo ubrzo nakon prijave. Odjavi se, ponovno se prijavi i ponovi ove korake.',
  reauthButton: 'Odjavi se za ponovnu prijavu',
  errorTitle: 'Nije se moglo dovršiti',
  errorBody: 'Nešto je zapelo na pola puta. Pokušaj ponovno: nastavit će se ondje gdje je stalo.',
  retry: 'Pokušaj ponovno',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Deaktivira se, a nakon 30 dana briše se sve',
  introDesactivar: 'Tvoj se račun sada deaktivira i, ako se ne vratiš u roku od 30 dana, sve se zauvijek briše.',
  nowTitle: 'Što se sada događa',
  nowHidden: 'Tvoj račun više nije vidljiv: nitko neće vidjeti tvoje profile ni objave',
  nowCharacterOff: 'Samostalnost tvojeg lika se isključuje i više se ništa ne naplaćuje',
  nowComeBack_one: 'Imaš {{contador}} dan za povratak: ponovno se prijavi i odaberi „Aktiviraj račun“',
  nowComeBack_few: 'Imaš {{contador}} dana za povratak: ponovno se prijavi i odaberi „Aktiviraj račun“',
  nowComeBack_other: 'Imaš {{contador}} dana za povratak: ponovno se prijavi i odaberi „Aktiviraj račun“',
  whatGoesLaterTitle: 'Što se briše ako se ne vratiš',
  deactivateButton: 'Izbriši moj račun',
  dialogBodyDesactivar: 'Tvoj račun više neće biti vidljiv. Ako se ne vratiš u roku od 30 dana, sve će biti izbrisano i nećeš ga moći vratiti.',
  deactivating: 'Deaktivacija tvojeg računa…',
  deactivatedTitle: 'Tvoj račun je deaktiviran',
  deactivatedBody: 'Imaš rok do {{fecha}} za povratak. Nakon toga sve će biti zauvijek izbrisano.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Tvoj račun je deaktiviran',
  activarBody: 'Zatraženo je brisanje tvojeg računa. Dok je deaktiviran, nitko ne vidi tvoje profile ni objave.',
  activarDaysLeft_one: 'Do trajnog brisanja ostao je {{contador}} dan',
  activarDaysLeft_few: 'Do trajnog brisanja ostala su {{contador}} dana',
  activarDaysLeft_other: 'Do trajnog brisanja ostalo je {{contador}} dana',
  activarDate: 'Ako ga ne aktiviraš, bit će zauvijek izbrisan {{fecha}}.',
  activarCharacterNote: 'Samostalnost tvojeg lika ostat će isključena; možeš je ponovno zakazati kad god želiš.',
  activarButton: 'Aktiviraj račun',
  activating: 'Aktivacija tvojeg računa…',
  activatedTitle: 'Tvoj račun ponovno je aktivan',
  activarExpiredTitle: 'Rok za povratak je istekao',
  activarExpiredBody: 'Tvoj račun bit će potpuno izbrisan u sljedećih nekoliko sati.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits koji su ti ostali: gube se i ne vraćaju se',
};
