/*
 * HÚNGARO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tegezés («te»), «fiók» como en auth, «karakter» para el personaje.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Fiók törlése',
  sectionDanger: 'Veszélyzóna',
  title: 'Fiók törlése',
  goesFaces: 'Az összes profilod: a Valódi profilod és az alteregóid',
  goesCharacter: 'A karaktered és az avatárja',
  goesPosts: 'A bejegyzéseid, hozzászólásaid és reakcióid',
  goesMessages: 'A WeeTalk-üzeneteid: kiürülnek, és a másik fél beszélgetéséből is eltűnnek',
  goesCreations: 'Az alkotásaid, projektjeid és beszélgetéseid a Weë AI-ban',
  goesContacts: 'A kapcsolataid, közösségeid és mentett elemeid',
  goesCredits: 'A megmaradt Credits: elvesznek, és nem kapod vissza őket',
  whatStaysTitle: 'Mi marad meg',
  staysRecords: 'A Credits és a fizetések könyvelési adatai. A neved és a profilod adatai nélkül őrizzük meg őket, mert ezek a Weë könyvelése.',
  confirmLabel: 'A megerősítéshez írd be: „{{palabra}}”',
  confirmWord: 'TÖRLÉS',
  confirmPlaceholder: 'Írd ide a szót',
  dialogTitle: 'Törlöd a fiókodat?',
  dialogConfirm: 'Törlés',
  doneTitle: 'A fiókodat töröltük',
  doneBody: 'Köszönjük, hogy a Weë része voltál.',
  reauthTitle: 'Jelentkezz be újra',
  reauthBody: 'Biztonsági okból a fiók törléséhez nemrég be kell jelentkezned. Jelentkezz ki, jelentkezz be újra, és ismételd meg ezeket a lépéseket.',
  reauthButton: 'Kijelentkezés az újbóli belépéshez',
  errorTitle: 'Nem sikerült befejezni',
  errorBody: 'Félúton hiba történt. Próbáld újra: onnan folytatódik, ahol abbamaradt.',
  retry: 'Próbáld újra',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Inaktiválódik, és 30 nap után minden törlődik',
  introDesactivar: 'A fiókod most inaktiválódik, és ha 30 napon belül nem térsz vissza, minden végleg törlődik.',
  nowTitle: 'Mi történik most',
  nowHidden: 'A fiókod nem lesz látható: senki sem látja a profiljaidat és a bejegyzéseidet',
  nowCharacterOff: 'A karaktered önállósága kikapcsol, és nem von le több díjat',
  nowComeBack_one: 'Még {{contador}} napod van visszatérni: jelentkezz be újra, és válaszd a „Fiók aktiválása” lehetőséget',
  nowComeBack_other: 'Még {{contador}} napod van visszatérni: jelentkezz be újra, és válaszd a „Fiók aktiválása” lehetőséget',
  whatGoesLaterTitle: 'Mi törlődik, ha nem térsz vissza',
  deactivateButton: 'Fiókom törlése',
  dialogBodyDesactivar: 'A fiókod nem lesz látható. Ha 30 napon belül nem térsz vissza, minden törlődik, és nem tudod visszaállítani.',
  deactivating: 'A fiókod inaktiválása folyamatban…',
  deactivatedTitle: 'A fiókod inaktív',
  deactivatedBody: 'Eddig térhetsz vissza: {{fecha}}. Utána minden végleg törlődik.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'A fiókod inaktív',
  activarBody: 'Kérted a fiókod törlését. Amíg inaktív, senki sem látja a profiljaidat és a bejegyzéseidet.',
  activarDaysLeft_one: 'A végleges törlésig {{contador}} nap van hátra',
  activarDaysLeft_other: 'A végleges törlésig {{contador}} nap van hátra',
  activarDate: 'Ha nem aktiválod, végleg törlődik ekkor: {{fecha}}.',
  activarCharacterNote: 'A karaktered önállósága kikapcsolva marad; bármikor újra beütemezheted.',
  activarButton: 'Fiók aktiválása',
  activating: 'A fiókod aktiválása folyamatban…',
  activatedTitle: 'A fiókod újra aktív',
  activarExpiredTitle: 'A visszatérési határidő lejárt',
  activarExpiredBody: 'A fiókod a következő órákban véglegesen törlődik.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'A megmaradt {{creditos}} Credits: elvesznek, és nem kapod vissza őket',
};
