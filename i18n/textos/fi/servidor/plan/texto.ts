/*
 * FINÉS — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}` lleva el nombre del idioma en nominativo, así que va detrás de «kohdekieli:» o «kielelle:». `{{tono}}`,
 * `{{estilo}}`, `{{animo}}` y `{{voz}}` son adjetivos o nombres en nominativo y entran como etiqueta («äänensävy: …»).
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Etsin aiheesta todellisia lainauksia ja annan jokaisen lähteen, jotta voit tarkistaa ne.',
  writerPasoCitas: 'Lainausten ja niiden lähteiden etsiminen',

  writerExplicaTraducir: 'Käännän tekstisi säilyttäen merkityksen ja äänensävyn. Kohdekieli: {{idioma}}.',
  writerPasoTraducir: 'Kääntäminen kielelle: {{idioma}}',
  writerDecisionIdiomaIngles: 'käännän sen englanniksi',
  writerIdiomaEn: 'englanti',
  writerIdiomaPt: 'portugali',
  writerIdiomaFr: 'ranska',
  writerIdiomaIt: 'italia',

  writerExplicaResumir: 'Tiivistän tekstisi keskeiset ajatukset muutamalle riville.',
  writerPasoResumir: 'Tiivistäminen keskeisiksi ajatuksiksi',
  writerExplicaCorregir: 'Korjaan oikeinkirjoituksen, tyylin ja selkeyden muuttamatta sitä, mitä halusit sanoa.',
  writerPasoCorregir: 'Oikeinkirjoituksen, tyylin ja selkeyden korjaaminen',
  writerExplicaIdeas: 'Ehdotan useita ideoita ja lähtökohdan, jotta kirjoittaminen sujuu jumittamatta.',
  writerPasoIdeas: 'Kirjoitusideoiden ehdottaminen',

  writerExplicaPortada: 'Määritän kannen konseptin ja luon kolme ehdotusta, joista voit valita.',
  writerPasoConceptoPortada: 'Kannen konseptin määrittäminen',
  writerPasoPropuestasPortada: '3 kansiehdotuksen luominen',

  writerExplicaReescribir: 'Kirjoitan tekstisi uudelleen ajatuksen säilyttäen (äänensävy: {{tono}}).',
  writerPasoReescribir: 'Tekstin kirjoittaminen uudelleen',
  writerExplicaCv: 'Kirjoitan CV:si (äänensävy: {{tono}}) valmiiksi muokattavaksi ja lähetettäväksi.',
  writerPasoCv: 'CV:si kirjoittaminen',

  writerExplicaPublicacion: 'Kirjoitan julkaisun (äänensävy: {{tono}}) ja viimeistelen sen sitten valmiiksi.',
  writerExplicaHistoria: 'Kirjoitan tarinan (äänensävy: {{tono}}) ja viimeistelen sen sitten valmiiksi.',
  writerExplicaGuion: 'Kirjoitan käsikirjoituksen (äänensävy: {{tono}}) ja viimeistelen sen sitten valmiiksi.',
  writerExplicaArticulo: 'Kirjoitan artikkelin (äänensävy: {{tono}}) ja viimeistelen sen sitten valmiiksi.',
  writerExplicaEmail: 'Kirjoitan sähköpostin (äänensävy: {{tono}}) ja viimeistelen sen sitten valmiiksi.',
  writerExplicaDocumento: 'Laadin asiakirjan (äänensävy: {{tono}}) ja viimeistelen sen sitten valmiiksi.',
  writerPasoPublicacion: 'Julkaisun kirjoittaminen',
  writerPasoHistoria: 'Tarinan kirjoittaminen',
  writerPasoGuion: 'Käsikirjoituksen kirjoittaminen',
  writerPasoArticulo: 'Artikkelin kirjoittaminen',
  writerPasoEmail: 'Sähköpostin kirjoittaminen',
  writerPasoDocumento: 'Asiakirjan laatiminen',
  writerPasoPulir: 'Tekstin viimeistely valmiiksi',

  writerDecisionEmpiezoPublicacion: 'aloitan julkaisusta',
  writerDecisionTonoCercano: 'käytän lämmintä äänensävyä',
  writerDecisionTonoProfesional: 'käytän ammattimaista äänensävyä',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Valmistelen tekstin ja äänitän sen (ääni: {{voz}}).',
  musicExplicaVozCalida: 'Valmistelen tekstin ja äänitän sen lämpimällä ja selkeällä äänellä.',
  musicPasoTextoNarracion: 'Kerrontatekstin valmistelu',
  musicPasoGrabarVoz: 'Äänen äänittäminen',

  musicExplicaLetra: 'Kirjoitan kokonaisen sanoituksen (tyyli: {{estilo}}).',
  musicPasoLetraCompleta: 'Kokonaisen sanoituksen kirjoittaminen',

  musicExplicaMezcla: 'Kuuntelen kappaleesi, miksaan ja masteroin sen, jotta se kuulostaa ammattimaiselta.',
  musicPasoAnotarMezcla: 'Kappaleesi kuunteleminen ja miksausmuistiinpanot',
  musicPasoMasterizar: 'Miksaus ja masterointi',

  musicExplicaVideoclip: 'Luon kappaleen ({{estilo}}, {{animo}}) ja kohtaukset ja kokoan koko musiikkivideosi. Sinun ei tarvitse poistua Weë Music -osiosta.',
  musicPasoIdeaYLetra: 'Idean ja sanoituksen kirjoittaminen',
  musicPasoEscenas: 'Musiikkivideon kohtausten luominen',
  musicPasoArmarVideoclip: 'Musiikkivideon kokoaminen kappaleesi kanssa',

  musicExplicaJingle: 'Luon lyhyen ja tarttuvan jinglen (tyyli: {{estilo}}, tunnelma: {{animo}}).',
  musicPasoFraseJingle: 'Jinglen iskulauseen kirjoittaminen',
  musicPasoJingle: 'Jinglen luominen',
  musicExplicaBeat: 'Luon biitin (tyyli: {{estilo}}, tunnelma: {{animo}}).',
  musicPasoIdeaMusical: 'Musiikillisen idean määrittäminen',
  musicPasoBeat: 'Biitin luominen',

  musicExplicaCancion: 'Kirjoitan sanoituksen, luon kappaleen (tyyli: {{estilo}}, tunnelma: {{animo}}) ja suunnittelen sen kannen.',
  musicPasoLetra: 'Sanoituksen kirjoittaminen',
  musicPasoCancion: 'Kappaleen luominen',
  musicPasoPortada: 'Kannen suunnittelu',

  musicDecisionEmpiezoCancion: 'aloitan kappaleesta',
  musicDecisionEstiloPop: 'valitsin pop-tyylin',
  musicDecisionAnimoAlegre: 'valitsin iloisen tunnelman',
  musicDecisionVozCalida: 'valitsin lämpimän ja selkeän äänen',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Katson kuvasi ja kokoan yksinkertaisen ihonhoitorutiinin helposti saatavista tuotteista.',
  beautyPasoRutina: 'Hoitorutiinisi kokoaminen',

  beautyExplicaRostro: 'Katson kasvojasi, suosittelen sinulle parhaiten sopivia leikkauksia ja tyylejä ja kokeilen kahta niistä kuvassasi.',
  beautyPasoMirarRostro: 'Kasvojesi katsominen',
  beautyPasoRecomendar: 'Leikkausten, silmälasien ja tyylien suositteleminen',
  beautyPasoProbarDosEstilos: 'Kahden sinulle parhaiten sopivan tyylin kokeileminen',

  beautyExplicaProbar: 'Kokeilen kahta versiota: {{cambio}}, tilaisuus: {{ocasion}}. Kasvosi, ihosi ja kuvan valo säilyvät.',
  beautyPasoProbar: 'Kokeilu kasvosi säilyttäen: {{cambio}}',
  beautyOcasionElDiaADia: 'arki',

  beautyDecisionCambioCompleto: 'ehdotan täydellistä tyylimuutosta',
  beautyDecisionOcasionDiaADia: 'ajattelin arkea',
};
