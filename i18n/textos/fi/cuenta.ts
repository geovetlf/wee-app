/*
 * SUOMI (fi) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «hahmo» con «se»; las marcas no se declinan («Weë AI -palvelu», «Weë-palvelu», «WeeTalk-viestit»); confirmWord «POISTA» = common.delete.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Poista tili',
  sectionDanger: 'Vaaravyöhyke',
  title: 'Poista tili',
  goesFaces: 'Kaikki profiilisi: oikea profiilisi ja alter egosi',
  goesCharacter: 'Hahmosi ja sen avatar',
  goesPosts: 'Julkaisusi, kommenttisi ja reaktiosi',
  goesMessages: 'WeeTalk-viestisi: ne tyhjennetään, ja toisen henkilön keskustelu jää ilman niitä',
  goesCreations: 'Luomuksesi, projektisi ja keskustelusi Weë AI -palvelussa',
  goesContacts: 'Yhteystietosi, yhteisösi ja tallennetut',
  goesCredits: 'Jäljellä olevat Credits: ne menetetään eikä niitä hyvitetä',
  whatStaysTitle: 'Mitä säilytetään',
  staysRecords: 'Credits-saldon ja maksujen kirjanpitotiedot. Ne säilytetään ilman nimeäsi ja profiilisi tietoja, koska ne ovat Weë-palvelun kirjanpitoa.',
  confirmLabel: 'Vahvista kirjoittamalla ”{{palabra}}”',
  confirmWord: 'POISTA',
  confirmPlaceholder: 'Kirjoita sana tähän',
  dialogTitle: 'Poistetaanko tilisi?',
  dialogConfirm: 'Poista',
  doneTitle: 'Tilisi on poistettu',
  doneBody: 'Kiitos, että olit osa Weë-yhteisöä.',
  reauthTitle: 'Kirjaudu uudelleen sisään',
  reauthBody: 'Turvallisuussyistä tilin poistaminen edellyttää, että olet kirjautunut sisään äskettäin. Kirjaudu ulos, kirjaudu takaisin sisään ja toista nämä vaiheet.',
  reauthButton: 'Kirjaudu ulos ja takaisin sisään',
  errorTitle: 'Poistoa ei saatu valmiiksi',
  errorBody: 'Jokin meni vikaan kesken. Yritä uudelleen: poisto jatkuu siitä, mihin se jäi.',
  retry: 'Yritä uudelleen',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Tili poistetaan käytöstä, ja 30 päivän kuluttua kaikki poistetaan',
  introDesactivar: 'Tilisi poistetaan nyt käytöstä, ja jos et palaa 30 päivän kuluessa, kaikki poistetaan lopullisesti.',
  nowTitle: 'Mitä nyt tapahtuu',
  nowHidden: 'Tilisi ei enää näy: kukaan ei näe profiilejasi eikä julkaisujasi',
  nowCharacterOff: 'Hahmosi autonomia kytketään pois päältä, eikä siitä enää veloiteta',
  nowComeBack_one: 'Sinulla on {{contador}} päivä aikaa palata: kirjaudu uudelleen sisään ja valitse ”Aktivoi tili”',
  nowComeBack_other: 'Sinulla on {{contador}} päivää aikaa palata: kirjaudu uudelleen sisään ja valitse ”Aktivoi tili”',
  whatGoesLaterTitle: 'Mitä poistetaan, jos et palaa',
  deactivateButton: 'Poista tilini',
  dialogBodyDesactivar: 'Tilisi ei enää näy. Jos et palaa 30 päivän kuluessa, kaikki poistetaan, etkä voi saada sitä takaisin.',
  deactivating: 'Tiliäsi poistetaan käytöstä…',
  deactivatedTitle: 'Tilisi on poistettu käytöstä',
  deactivatedBody: 'Voit palata {{fecha}} asti. Sen jälkeen kaikki poistetaan lopullisesti.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Tilisi on poistettu käytöstä',
  activarBody: 'Pyysit tilisi poistamista. Niin kauan kuin se on poistettu käytöstä, kukaan ei näe profiilejasi eikä julkaisujasi.',
  activarDaysLeft_one: 'Lopulliseen poistoon on {{contador}} päivä',
  activarDaysLeft_other: 'Lopulliseen poistoon on {{contador}} päivää',
  activarDate: 'Jos et aktivoi sitä, se poistetaan lopullisesti {{fecha}}.',
  activarCharacterNote: 'Hahmosi autonomia pysyy pois päältä; voit ajastaa sen uudelleen milloin haluat.',
  activarButton: 'Aktivoi tili',
  activating: 'Tiliäsi aktivoidaan…',
  activatedTitle: 'Tilisi on taas aktiivinen',
  activarExpiredTitle: 'Palaamisen määräaika päättyi',
  activarExpiredBody: 'Tilisi poistetaan kokonaan seuraavien tuntien aikana.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Jäljellä olevat {{creditos}} Credits: ne menetetään eikä niitä hyvitetä',
};
