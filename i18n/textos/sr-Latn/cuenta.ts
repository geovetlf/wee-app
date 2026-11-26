/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (cirílico) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteo («ti»), ekavica, «nalog» como en auth, «lik» para el personaje. El latino se GENERA desde aquí
 * (scripts/i18n-sr-latn.mjs): «OBRIŠI» sale «OBRIŠI».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from '../ru/plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'Obriši nalog',
  sectionDanger: 'Opasna zona',
  title: 'Obriši nalog',
  goesFaces: 'Svi tvoji profili: Pravi profil i tvoji alter ego profili',
  goesCharacter: 'Tvoj lik i njegov avatar',
  goesPosts: 'Tvoje objave, komentari i reakcije',
  goesMessages: 'Tvoje poruke u WeeTalk ćaskanju: prazne se, a u razgovoru druge osobe ih više nema',
  goesCreations: 'Tvoje kreacije, projekti i razgovori u Weë AI',
  goesContacts: 'Tvoji kontakti, zajednice i sačuvano',
  goesCredits: 'Credits koji su ti ostali: gube se i ne vraćaju se',
  whatStaysTitle: 'Šta ostaje',
  staysRecords: 'Računovodstveni zapisi o Credits i plaćanjima. Čuvaju se bez tvog imena i podataka sa profila, jer su to knjige Weë.',
  confirmLabel: 'Da potvrdiš, upiši „{{palabra}}“',
  confirmWord: 'OBRIŠI',
  confirmPlaceholder: 'Upiši reč ovde',
  dialogTitle: 'Obrisati tvoj nalog?',
  dialogConfirm: 'Obriši',
  doneTitle: 'Tvoj nalog je obrisan',
  doneBody: 'Hvala ti na vremenu provedenom u Weë.',
  reauthTitle: 'Prijavi se ponovo',
  reauthBody: 'Radi bezbednosti, nalog može da se obriše samo ubrzo posle prijave. Odjavi se, prijavi se ponovo i ponovi ove korake.',
  reauthButton: 'Odjavi se da se ponovo prijaviš',
  errorTitle: 'Nije moglo da se završi',
  errorBody: 'Nešto je pošlo naopako na pola puta. Pokušaj ponovo: nastaviće se tamo gde je stalo.',
  retry: 'Pokušaj ponovo',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Deaktivira se, a posle 30 dana briše se sve',
  introDesactivar: 'Tvoj nalog se sada deaktivira i, ako se ne vratiš u roku od 30 dana, sve se zauvek briše.',
  nowTitle: 'Šta se dešava sada',
  nowHidden: 'Tvoj nalog više nije vidljiv: niko neće videti tvoje profile ni objave',
  nowCharacterOff: 'Samostalnost tvog lika se isključuje i više se ništa ne naplaćuje',
  nowComeBack_one: 'Imaš {{contador}} dan da se vratiš: ponovo se prijavi i izaberi „Aktiviraj nalog“',
  nowComeBack_few: 'Imaš {{contador}} dana da se vratiš: ponovo se prijavi i izaberi „Aktiviraj nalog“',
  nowComeBack_other: 'Imaš {{contador}} dana da se vratiš: ponovo se prijavi i izaberi „Aktiviraj nalog“',
  whatGoesLaterTitle: 'Šta se briše ako se ne vratiš',
  deactivateButton: 'Obriši moj nalog',
  dialogBodyDesactivar: 'Tvoj nalog više neće biti vidljiv. Ako se ne vratiš u roku od 30 dana, sve će biti obrisano i nećeš moći da ga vratiš.',
  deactivating: 'Nalog se deaktivira…',
  deactivatedTitle: 'Tvoj nalog je deaktiviran',
  deactivatedBody: 'Imaš rok do {{fecha}} da se vratiš. Posle toga sve će biti zauvek obrisano.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Tvoj nalog je deaktiviran',
  activarBody: 'Zatraženo je brisanje tvog naloga. Dok je deaktiviran, niko ne vidi tvoje profile ni objave.',
  activarDaysLeft_one: 'Do trajnog brisanja ostao je {{contador}} dan',
  activarDaysLeft_few: 'Do trajnog brisanja ostala su {{contador}} dana',
  activarDaysLeft_other: 'Do trajnog brisanja ostalo je {{contador}} dana',
  activarDate: 'Ako ga ne aktiviraš, biće zauvek obrisan {{fecha}}.',
  activarCharacterNote: 'Samostalnost tvog lika ostaje isključena; možeš ponovo da je podesiš kad god želiš.',
  activarButton: 'Aktiviraj nalog',
  activating: 'Nalog se aktivira…',
  activatedTitle: 'Tvoj nalog je ponovo aktivan',
  activarExpiredTitle: 'Rok za povratak je istekao',
  activarExpiredBody: 'Tvoj nalog će biti potpuno obrisan u narednih nekoliko sati.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits koji su ti ostali: gube se i ne vraćaju se',
};
