/*
 * FINÉS — El panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo
 * administración. Tipado contra el español: si allí hay una clave que aquí
 * falta, no compila.
 *
 * Los identificadores del motor —ids de proveedor y de modelo, capacidades
 * como `text.generate`, colecciones de Firestore, el callable `engineAdmin`—
 * se copian tal cual. «Fallback» se queda en inglés, como en el español y el
 * inglés («fallback-ketjut»). «Política de {{capacidad}}» lleva el caso en la
 * palabra anterior («Käytäntö kyvylle {{capacidad}}»), nunca pegado al hueco.
 * «{{precios}}» se rellena con «testi»/«oikeat» tras «Hinnat:».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Päivitä',
  statusFailed: 'En saanut luettua moottorin tilaa. Onko palvelin käynnissä?',
  changeFailed: 'Muutosta ei voitu ottaa käyttöön',

  adminOnly: 'Vain ylläpidolle',
  adminOnlyNote: 'Tämä paneeli on Weë-tiimille. Jos kuulut tiimiin, pyydä, että tilisi lisätään ylläpitäjäksi.',

  settingsTitle: 'Asetukset',
  settingsLine: 'Hinnat: {{precios}} · {{credits}} Credits per USD · kate {{margen}} % · käytäntö {{politica}} · demotila viimeisenä keinona: {{demo}}',
  pricesTest: 'testi',
  pricesReal: 'oikeat',
  yes: 'kyllä',
  no: 'ei',
  configFrom: 'Asetukset luettu lähteestä: {{origen}}.',
  sourceDefaults: 'koodin oletusarvot',
  resetHealth: 'Nollaa kunto',
  healthReset: 'Kunto nollattu.',
  seedDone: 'Oletusarvot tallennettu Firestore-tietokantaan.',

  providers: 'Palveluntarjoajat',
  priority: 'prioriteetti {{numero}}',
  enable: 'Ota {{proveedor}} käyttöön',
  disable: 'Poista {{proveedor}} käytöstä',
  withKey: 'avaimella',
  withoutKey: 'ilman avainta',
  active: 'käytössä',
  inactive: 'ei käytössä',
  pausedByFailures: 'tauolla virheiden vuoksi',
  recentFailures_one: '{{contador}} tuore virhe',
  recentFailures_other: '{{contador}} tuoretta virhettä',
  modelLine: '• {{id}} · laatu {{calidad}}/5 · nopeus {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · enintään {{segundos}} s',
  pendingVerification: ' · odottaa vahvistusta',

  chains: 'Fallback-ketjut',
  policyLabel: 'Käytäntö kyvylle {{capacidad}}: {{politica}}',
  onlyDemo: 'vain demotila (ei vielä oikeaa palveluntarjoajaa)',
  editNote: 'Jos haluat muuttaa ketjun järjestystä tai kiinnittää mallin, muokkaa aiRouting/{{capacidad}} Firestoressa tai käytä engineAdmin · setRouting.',

  policyQualityFirst: 'Laatu ensin',
  policyBalanced: 'Tasapainoinen',
  policyCostFirst: 'Kustannus ensin',

  modalityText: 'teksti',
  modalityVision: 'näkö',
  modalityImage: 'kuva',
  modalityVideo: 'video',
  modalityVoice: 'ääni',
  modalityMusic: 'musiikki',
  modalityDoc: 'asiakirjat',
  rowSubtitle: 'Palveluntarjoajat, fallback-ketjut ja asetukset (vain ylläpidolle)',
};
