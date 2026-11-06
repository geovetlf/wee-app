/*
 * FINÉS — Configuración. Tipado contra el español: si allí hay una clave que
 * aquí falta, no compila.
 *
 * «Weë» no se declina: «Acerca de Weë» es «Tietoja Weë-sovelluksesta» y
 * «el idioma de Weë» es «Weë-sovelluksen kieli». El contador de comunidades
 * se dice «Jäsenenä {{contador}} yhteisössä»: en los casos locales el
 * sustantivo va en singular con cualquier número, así que `_one` y `_other`
 * coinciden a propósito. «Sembrar» (los valores por defecto) es «Luo».
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Asetukset',
  sectionContent: 'Sisältö',
  sectionPrivacy: 'Tietosuoja',
  sectionPreferences: 'Mieltymykset',
  sectionSupport: 'Ohje',
  myCommunities: 'Omat yhteisöt',
  communitiesJoined_one: 'Jäsenenä {{contador}} yhteisössä',
  communitiesJoined_other: 'Jäsenenä {{contador}} yhteisössä',
  privateReplies: 'Yksityiset vastaukset',
  privateRepliesHint: 'Salli muiden lähettää sinulle yksityisviestejä',
  pushNotifications: 'Push-ilmoitukset',
  language: 'Kieli',
  languageSubtitle: 'Valitse Weë-sovelluksen kieli',
  help: 'Ohje',
  privacyPolicy: 'Tietosuojakäytäntö',
  about: 'Tietoja Weë-sovelluksesta',
  signOut: 'Kirjaudu ulos',
  signOutFailed: 'Uloskirjautuminen ei onnistunut',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Luo oletusarvot',
  seedDefaultsConfirm: 'Kirjoittaa Firestore-tietokantaan ne oletuspalveluntarjoajat, -ketjut ja -asetukset, joita ei vielä ole. Ei poista mitään.',
  seed: 'Luo',
  sectionNotifications: 'Ilmoitukset',
  sectionInfo: 'Tiedot',
  sectionAccount: 'Tili',
  privacyPolicyHint: 'Mitä teemme tiedoillasi, selkokielellä',
  pushNotificationsHint: 'Saat ilmoituksia uusista viesteistä ja toiminnasta',
  aboutHint: 'Mikä Weë on ja mikä versio sinulla on käytössä',
  helpHint: 'Usein kysytyt kysymykset ja yhteystiedot',
  signOutHint: 'Poistu tililtäsi',
  aboutBody: 'Weë (World Encode Entity) on sosiaalinen verkosto ihmisille, jotka luovat tekoälyn avulla.\n\nVersio 1.0.0 · © {{anio}} Weë. Kaikki oikeudet pidätetään.\n\nMaantieteelliset tiedot: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Sijainti',
  locationLine: '{{estado}} Tarkkaa sijaintiasi ei koskaan näytetä julkisesti.',
  locationOff: 'Pois käytöstä. Anna Weë-sovelluksen käyttää likimääräistä sijaintiasi, niin se voi ehdottaa lähellä olevia paikkoja ja aluettasi, kun lisäät sijainnin julkaisuun. Tarkkaa sijaintiasi ei koskaan näytetä julkisesti.',
  locationUnavailable: 'Tämä laite ei voi antaa meille sijaintiasi.',
  locationDisabled: 'Sijainti on pois päältä laitteesi asetuksissa.',
  locationPermissionDenied: 'Et antanut lupaa järjestelmän kysyessä. Napauta tästä, niin voit muuttaa asian laitteesi asetuksissa.',
  locationPermissionNotDetermined: 'Weë pyytää lupaa, kun se tarvitsee sitä.',
  locationApproximate: 'Weë tietää alueesi, ei tarkkaa sijaintia.',
  locationPrecise: 'Weë voi käyttää tarkkaa sijaintiasi, kun jokin toiminto sitä tarvitsee.',
};
