/*
 * ISLANDÉS (is · is-IS) — Los errores controlados del servidor de Weë AI y Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `{{campo}}` y `{{archivo}}` se rellenan con las piezas `campo…` y `archivo…`. Para que encajen sin flexionar el
 * hueco, las piezas van en forma definida y en ACUSATIVO, y las frases solo las ponen detrás de verbos o
 * preposiciones que rigen acusativo («Það vantar {{campo}}», «Athugaðu {{campo}}», «Slóðin á {{archivo}}»), o en
 * nominativo donde acusativo y nominativo coinciden: las dos piezas de archivo son neutras («skjalið», «hljóðið»).
 * «No te cobré» se dice impersonal y sin género: «Ekkert var rukkað».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Eitthvað vantar í beiðnina þína. Farðu yfir hana og reyndu aftur.',
  unauthorized: 'Skráðu þig inn til að búa til með Weë.',
  providerError: 'Gervigreindin náði ekki að ljúka verkinu í þetta sinn. Ekkert var rukkað: reyndu aftur eftir smástund.',
  generationFailed: 'Ekki tókst að ljúka verkinu. Ekkert var rukkað: reyndu aftur.',
  timeout: 'Þetta tók of langan tíma og ég stöðvaði það. Ekkert var rukkað: reyndu aftur.',
  rateLimited: 'Þú hefur búið til mikið í einu. Ekkert var rukkað: bíddu aðeins og reyndu aftur.',
  duplicate: 'Þetta sköpunarverk er þegar í vinnslu.',
  notAvailable: 'Þessi eiginleiki er ekki í boði enn.',
  inputRejected: 'Ekki var hægt að nota myndina eða myndbandið: raunveruleg andlit og efni af þessu tagi eru ekki leyfð. Prófaðu aðra mynd eða lýsingu.',
  faltaCampo: 'Það vantar {{campo}}.',
  revisaCampo: 'Athugaðu {{campo}}: lengdin þarf að vera 1 til {{max}} stafir.',
  campoMensaje: 'skilaboðin þín',
  campoDescripcionVideo: 'lýsingu myndbandsins',
  conversacionNoEncontrada: 'Við fundum ekki þetta samtal.',
  sinPlan: 'Þetta verk er ekki enn með áætlun.',
  sinUnPlan: 'Þetta verk hefur ekki enn fengið áætlun.',
  yaTienePlan: 'Þetta verk er þegar með áætlun.',
  subeFoto: 'Hladdu upp mynd svo Weë geti unnið með hana.',
  trabajoNoEncontrado: 'Við fundum ekki þetta verk.',
  trabajoAjeno: 'Þetta verk er ekki þitt.',
  experienciaDesconocida: 'Óþekkt upplifun.',
  faltaTrabajo: 'Verkið vantar.',
  intentoSinTiempo: 'Sú tilraun rann út á tíma og þú fékkst Credits til baka. Þú getur reynt aftur.',
  fotoDireccion: 'Slóð myndarinnar er ekki gild.',
  fotoSubir: 'Það þarf að hlaða myndinni upp í Weë áður en hún er notuð.',
  fotoAjena: 'Þessi mynd er ekki þín.',
  archivoSube: 'Það vantar {{archivo}}. Hladdu því upp svo Weë geti lesið það.',
  archivoDireccion: 'Slóðin á {{archivo}} er ekki gild.',
  archivoSubir: 'Áður en {{archivo}} er notað þarf að hlaða því upp í Weë.',
  archivoAjeno: 'Þú átt ekki {{archivo}}.',
  archivoDocumento: 'skjalið',
  archivoAudio: 'hljóðið',
  sinTiempoAntes: 'Þetta rann út á tíma áður en það hófst. Ekkert var rukkað.',
  sinProveedor: 'Engin gervigreind er tiltæk fyrir þetta í augnablikinu. Reyndu aftur síðar.',
  noDisponibleActualmente: 'Þessi eiginleiki er ekki í boði eins og er.',
  noDisponibleAhora: 'Þessi eiginleiki er ekki í boði í augnablikinu. Reyndu aftur eftir smástund.',
  noDisponibleRegion: 'Þessi eiginleiki er ekki í boði á þínu svæði eins og er.',
  noDisponiblePais: 'Til að nota þennan eiginleika skaltu tilgreina landið þitt í Raunprófílnum.',
  noDisponibleOpciones: 'Þessi eiginleiki er ekki í boði með þeim valkostum sem þú valdir. Prófaðu aðra.',
  describeVideo: 'Segðu mér hvaða myndband þú vilt búa til.',
  creacionTerminada: 'Þessu sköpunarverki er lokið og það er ekki gert aftur. Þú finnur það í sköpunarverkunum þínum.',
  tomaInvalida: 'Þessi taka er ekki á gildu formi.',
  planoInvalido: 'Þetta skot er ekki á gildu formi.',
  produccionNoEncontrada: 'Við fundum ekki þessa framleiðslu.',
  tomaNoGenerable: 'Ekki er hægt að búa þessa töku til á þennan hátt.',
  creacionNoEncontrada: 'Við fundum ekki þetta sköpunarverk.',
  debesIniciarSesion: 'Þú þarft að skrá þig inn',
};
