/*
 * IRLANDÉS — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * «ton» y «guth» son masculinos: «le ton cairdiúil», «le guth baineann», sin mutar lo que entra por el hueco. El nombre
 * de idioma va entre paréntesis porque «go» pediría «h» delante de vocal («go hIodáilis»).
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Lorgóidh mé fíorluanna faoin ábhar agus tabharfaidh mé foinse gach ceann díobh duit, ionas gur féidir leat iad a sheiceáil.',
  writerPasoCitas: 'Na luanna agus a bhfoinsí a lorg',

  writerExplicaTraducir: 'Aistreoidh mé do théacs ({{idioma}}), agus coinneoidh mé an bhrí agus an ton.',
  writerPasoTraducir: 'Aistriúchán: {{idioma}}',
  writerDecisionIdiomaIngles: 'aistreoidh mé go Béarla é',
  writerIdiomaEn: 'Béarla',
  writerIdiomaPt: 'Portaingéilis',
  writerIdiomaFr: 'Fraincis',
  writerIdiomaIt: 'Iodáilis',

  writerExplicaResumir: 'Déanfaidh mé achoimre ar do théacs sna príomhsmaointe, i gcúpla líne.',
  writerPasoResumir: 'Achoimre a dhéanamh ar na príomhsmaointe',
  writerExplicaCorregir: 'Ceartóidh mé an litriú, an stíl agus an tsoiléireacht gan an rud a bhí i gceist agat a athrú.',
  writerPasoCorregir: 'An litriú, an stíl agus an tsoiléireacht a cheartú',
  writerExplicaIdeas: 'Molfaidh mé roinnt smaointe agus pointe tosaigh duit, ionas go mbeidh tú in ann scríobh gan bhac.',
  writerPasoIdeas: 'Smaointe scríbhneoireachta a mholadh duit',

  writerExplicaPortada: 'Sainfidh mé coincheap an chlúdaigh agus cruthóidh mé trí mholadh le go roghnóidh tú ceann.',
  writerPasoConceptoPortada: 'Coincheap an chlúdaigh a shainiú',
  writerPasoPropuestasPortada: '3 mholadh clúdaigh a chruthú',

  writerExplicaReescribir: 'Athscríobhfaidh mé do théacs le ton {{tono}}, agus coinneoidh mé an smaoineamh.',
  writerPasoReescribir: 'An téacs a athscríobh',
  writerExplicaCv: 'Scríobhfaidh mé do CV le ton {{tono}}, réidh le húsáid san eagarthóir agus le seoladh.',
  writerPasoCv: 'Do CV a scríobh',

  writerExplicaPublicacion: 'Scríobhfaidh mé an phostáil le ton {{tono}} agus ansin snasfaidh mé í go mbeidh sí réidh.',
  writerExplicaHistoria: 'Scríobhfaidh mé an scéal le ton {{tono}} agus ansin snasfaidh mé é go mbeidh sé réidh.',
  writerExplicaGuion: 'Scríobhfaidh mé an script le ton {{tono}} agus ansin snasfaidh mé í go mbeidh sí réidh.',
  writerExplicaArticulo: 'Scríobhfaidh mé an t-alt le ton {{tono}} agus ansin snasfaidh mé é go mbeidh sé réidh.',
  writerExplicaEmail: 'Scríobhfaidh mé an ríomhphost le ton {{tono}} agus ansin snasfaidh mé é go mbeidh sé réidh.',
  writerExplicaDocumento: 'Scríobhfaidh mé an doiciméad le ton {{tono}} agus ansin snasfaidh mé é go mbeidh sé réidh.',
  writerPasoPublicacion: 'An phostáil a scríobh',
  writerPasoHistoria: 'An scéal a scríobh',
  writerPasoGuion: 'An script a scríobh',
  writerPasoArticulo: 'An t-alt a scríobh',
  writerPasoEmail: 'An ríomhphost a scríobh',
  writerPasoDocumento: 'An doiciméad a scríobh',
  writerPasoPulir: 'An téacs a shnasú agus a chur réidh',

  writerDecisionEmpiezoPublicacion: 'tosóidh mé le postáil',
  writerDecisionTonoCercano: 'úsáidfidh mé ton cairdiúil',
  writerDecisionTonoProfesional: 'úsáidfidh mé ton gairmiúil',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Ullmhóidh mé an téacs agus taifeadfaidh mé é le guth {{voz}}.',
  musicExplicaVozCalida: 'Ullmhóidh mé an téacs agus taifeadfaidh mé é le guth te soiléir.',
  musicPasoTextoNarracion: 'Téacs na reacaireachta a ullmhú',
  musicPasoGrabarVoz: 'An guth a thaifeadadh',

  musicExplicaLetra: 'Scríobhfaidh mé na liricí iomlána (stíl: {{estilo}}).',
  musicPasoLetraCompleta: 'Na liricí iomlána a scríobh',

  musicExplicaMezcla: 'Éistfidh mé le d\'amhrán, agus déanfaidh mé é a mheascadh agus a mháistriú le go mbeidh fuaim ghairmiúil aige.',
  musicPasoAnotarMezcla: 'Éisteacht le d\'amhrán agus nótaí meascáin a dhéanamh',
  musicPasoMasterizar: 'Meascadh agus máistriú',

  musicExplicaVideoclip: 'Cruthóidh mé an t-amhrán ({{estilo}}, {{animo}}) agus na radhairc, agus cuirfidh mé d\'fhíseán ceoil iomlán le chéile. Ní gá duit Weë Music a fhágáil.',
  musicPasoIdeaYLetra: 'An smaoineamh agus na liricí a scríobh',
  musicPasoEscenas: 'Radhairc an fhíseáin cheoil a chruthú',
  musicPasoArmarVideoclip: 'An físeán ceoil a chur le chéile le d\'amhrán',

  musicExplicaJingle: 'Cruthóidh mé jingle gearr tarraingteach (stíl: {{estilo}}, giúmar: {{animo}}).',
  musicPasoFraseJingle: 'Frása an jingle a scríobh',
  musicPasoJingle: 'An jingle a chruthú',
  musicExplicaBeat: 'Cruthóidh mé beat (stíl: {{estilo}}, giúmar: {{animo}}).',
  musicPasoIdeaMusical: 'An smaoineamh ceoil a shainiú',
  musicPasoBeat: 'An beat a chruthú',

  musicExplicaCancion: 'Scríobhfaidh mé na liricí, cruthóidh mé an t-amhrán (stíl: {{estilo}}, giúmar: {{animo}}) agus dearfaidh mé a chlúdach.',
  musicPasoLetra: 'Na liricí a scríobh',
  musicPasoCancion: 'An t-amhrán a chruthú',
  musicPasoPortada: 'An clúdach a dhearadh',

  musicDecisionEmpiezoCancion: 'tosóidh mé le hamhrán',
  musicDecisionEstiloPop: 'roghnaigh mé stíl pop',
  musicDecisionAnimoAlegre: 'le giúmar áthasach',
  musicDecisionVozCalida: 'roghnaigh mé guth te soiléir',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Féachfaidh mé ar do ghrianghraf agus cuirfidh mé gnáthamh simplí cúraim craicinn le chéile, le táirgí atá furasta a fháil.',
  beautyPasoRutina: 'Do ghnáthamh cúraim a chur le chéile',

  beautyExplicaRostro: 'Féachfaidh mé ar d\'aghaidh, molfaidh mé na bearrthaí agus na stíleanna is fearr a fheileann duit, agus triailfidh mé dhá cheann díobh ar do ghrianghraf.',
  beautyPasoMirarRostro: 'Féachaint ar d\'aghaidh',
  beautyPasoRecomendar: 'Bearrthaí, spéaclaí agus stíleanna a mholadh duit',
  beautyPasoProbarDosEstilos: 'An dá stíl is fearr a fheileann duit a thriail',

  beautyExplicaProbar: 'Triailfidh mé {{cambio}} (ócáid: {{ocasion}}) i dhá leagan, agus coinneoidh mé d\'aghaidh, do chraiceann agus solas an ghrianghraif.',
  beautyPasoProbar: 'Triail: {{cambio}}, agus d\'aghaidh á coinneáil',
  beautyOcasionElDiaADia: 'gach lá',

  beautyDecisionCambioCompleto: 'molfaidh mé athrú cuma iomlán',
  beautyDecisionOcasionDiaADia: 'bheartaigh mé é don saol laethúil',
};
