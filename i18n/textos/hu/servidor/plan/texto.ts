/*
 * HÚNGARO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}`, `{{tono}}` y `{{voz}}` son adjetivos delante de «nyelvre», «hangnemben» y «hanggal». `{{estilo}}`,
 * `{{animo}}`, `{{cambio}}` y `{{ocasion}}` van detrás de dos puntos: no se les pega ningún sufijo.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Valódi idézeteket keresek a témában, és mindegyikhez megadom a forrást, hogy ellenőrizhesd.',
  writerPasoCitas: 'Az idézetek és forrásaik keresése',

  writerExplicaTraducir: 'Lefordítom a szövegedet {{idioma}} nyelvre, megőrizve az értelmét és a hangnemét.',
  writerPasoTraducir: 'Fordítás {{idioma}} nyelvre',
  writerDecisionIdiomaIngles: 'angolra fordítom',
  writerIdiomaEn: 'angol',
  writerIdiomaPt: 'portugál',
  writerIdiomaFr: 'francia',
  writerIdiomaIt: 'olasz',

  writerExplicaResumir: 'Néhány sorban összefoglalom a szöveged legfontosabb gondolatait.',
  writerPasoResumir: 'Összefoglalás a fő gondolatokban',
  writerExplicaCorregir: 'Javítom a helyesírást, a stílust és az érthetőséget anélkül, hogy megváltoztatnám, amit mondani akartál.',
  writerPasoCorregir: 'A helyesírás, a stílus és az érthetőség javítása',
  writerExplicaIdeas: 'Több ötletet és egy kiindulópontot javaslok, hogy elakadás nélkül írhass.',
  writerPasoIdeas: 'Ötletek javaslása az íráshoz',

  writerExplicaPortada: 'Meghatározom a borító koncepcióját, és készítek három javaslatot, hogy választhass.',
  writerPasoConceptoPortada: 'A borító koncepciójának meghatározása',
  writerPasoPropuestasPortada: '3 borítójavaslat készítése',

  writerExplicaReescribir: 'Átírom a szövegedet {{tono}} hangnemben, megőrizve a gondolatot.',
  writerPasoReescribir: 'A szöveg átírása',
  writerExplicaCv: 'Megírom az önéletrajzodat {{tono}} hangnemben, hogy kész legyen a szerkesztőben való használatra és az elküldésre.',
  writerPasoCv: 'Az önéletrajzod megírása',

  writerExplicaPublicacion: 'Megírom a bejegyzést {{tono}} hangnemben, aztán csiszolok rajta, hogy kész legyen.',
  writerExplicaHistoria: 'Megírom a történetet {{tono}} hangnemben, aztán csiszolok rajta, hogy kész legyen.',
  writerExplicaGuion: 'Megírom a forgatókönyvet {{tono}} hangnemben, aztán csiszolok rajta, hogy kész legyen.',
  writerExplicaArticulo: 'Megírom a cikket {{tono}} hangnemben, aztán csiszolok rajta, hogy kész legyen.',
  writerExplicaEmail: 'Megírom az e-mailt {{tono}} hangnemben, aztán csiszolok rajta, hogy kész legyen.',
  writerExplicaDocumento: 'Megírom a dokumentumot {{tono}} hangnemben, aztán csiszolok rajta, hogy kész legyen.',
  writerPasoPublicacion: 'A bejegyzés megírása',
  writerPasoHistoria: 'A történet megírása',
  writerPasoGuion: 'A forgatókönyv megírása',
  writerPasoArticulo: 'A cikk megírása',
  writerPasoEmail: 'Az e-mail megírása',
  writerPasoDocumento: 'A dokumentum megírása',
  writerPasoPulir: 'A szöveg csiszolása és véglegesítése',

  writerDecisionEmpiezoPublicacion: 'egy bejegyzéssel kezdem',
  writerDecisionTonoCercano: 'barátságos hangnemet használok',
  writerDecisionTonoProfesional: 'professzionális hangnemet használok',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Előkészítem a szöveget, és felveszem {{voz}} hanggal.',
  musicExplicaVozCalida: 'Előkészítem a szöveget, és felveszem meleg, tiszta hanggal.',
  musicPasoTextoNarracion: 'A narráció szövegének előkészítése',
  musicPasoGrabarVoz: 'A hang felvétele',

  musicExplicaLetra: 'Megírom a teljes dalszöveget (stílus: {{estilo}}).',
  musicPasoLetraCompleta: 'A teljes dalszöveg megírása',

  musicExplicaMezcla: 'Meghallgatom a dalodat, majd megkeverem és masterelem, hogy profin szóljon.',
  musicPasoAnotarMezcla: 'A dalod meghallgatása és a keverés megtervezése',
  musicPasoMasterizar: 'Keverés és masterelés',

  musicExplicaVideoclip: 'Elkészítem a dalt ({{estilo}}, {{animo}}), a jeleneteket és a teljes videoklipedet. Mindehhez maradhatsz a Weë Music felületén.',
  musicPasoIdeaYLetra: 'Az ötlet és a dalszöveg megírása',
  musicPasoEscenas: 'A videoklip jeleneteinek elkészítése',
  musicPasoArmarVideoclip: 'A videoklip összeállítása a daloddal',

  musicExplicaJingle: 'Készítek egy rövid, fülbemászó jingle-t (stílus: {{estilo}}; hangulat: {{animo}}).',
  musicPasoFraseJingle: 'A jingle szövegének megírása',
  musicPasoJingle: 'A jingle elkészítése',
  musicExplicaBeat: 'Készítek egy beatet (stílus: {{estilo}}; hangulat: {{animo}}).',
  musicPasoIdeaMusical: 'A zenei ötlet meghatározása',
  musicPasoBeat: 'A beat elkészítése',

  musicExplicaCancion: 'Megírom a dalszöveget, elkészítem a dalt (stílus: {{estilo}}; hangulat: {{animo}}), és megtervezem a borítóját.',
  musicPasoLetra: 'A dalszöveg megírása',
  musicPasoCancion: 'A dal elkészítése',
  musicPasoPortada: 'A borító megtervezése',

  musicDecisionEmpiezoCancion: 'egy dallal kezdem',
  musicDecisionEstiloPop: 'pop stílust választottam',
  musicDecisionAnimoAlegre: 'vidám hangulatot választottam',
  musicDecisionVozCalida: 'meleg, tiszta hangot választottam',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Megnézem a fotódat, és összeállítok egy egyszerű bőrápolási rutint, könnyen beszerezhető termékekkel.',
  beautyPasoRutina: 'Az ápolási rutinod összeállítása',

  beautyExplicaRostro: 'Megnézem az arcodat, javaslom a hozzád leginkább illő hajvágásokat és stílusokat, és kettőt kipróbálok a fotódon.',
  beautyPasoMirarRostro: 'Az arcod megtekintése',
  beautyPasoRecomendar: 'Hajvágások, szemüvegek és stílusok javaslása',
  beautyPasoProbarDosEstilos: 'A hozzád leginkább illő két stílus kipróbálása',

  beautyExplicaProbar: 'Két változatban kipróbálom ezt: {{cambio}} (alkalom: {{ocasion}}), megőrizve az arcodat, a bőrödet és a fotó fényeit.',
  beautyPasoProbar: 'Kipróbálás az arcod megőrzésével: {{cambio}}',
  beautyOcasionElDiaADia: 'a hétköznapok',

  beautyDecisionCambioCompleto: 'teljes külső megújulást javaslok',
  beautyDecisionOcasionDiaADia: 'a hétköznapokra terveztem',
};
