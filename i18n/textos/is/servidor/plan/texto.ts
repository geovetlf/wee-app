/*
 * ISLANDÉS (is · is-IS) — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tono, estilo, ánimo, voz, cambio y ocasión entran en nominativo dentro de un paréntesis o tras dos puntos
 * («(tónn: vinalegur)», «(stíll: popp, stemning: glaðleg)»), porque la opción no puede declinarse. Los idiomas de
 * destino son piezas en dativo («á ensku»). Los pronombres siguen el género del texto: færsla, saga, grein → hún;
 * handrit, skjal → það; tölvupóstur → hann. Las `…Decision…` empiezan por el verbo (V2).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Ég leita að raunverulegum tilvitnunum um efnið og læt heimildina fylgja hverri þeirra svo þú getir sannreynt þær.',
  writerPasoCitas: 'Leita að tilvitnunum og heimildum þeirra',

  writerExplicaTraducir: 'Ég þýði textann þinn á {{idioma}} og held merkingunni og tóninum.',
  writerPasoTraducir: 'Þýða á {{idioma}}',
  writerDecisionIdiomaIngles: 'þýði ég hann á ensku',
  writerIdiomaEn: 'ensku',
  writerIdiomaPt: 'portúgölsku',
  writerIdiomaFr: 'frönsku',
  writerIdiomaIt: 'ítölsku',

  writerExplicaResumir: 'Ég dreg textann þinn saman í helstu atriðin, í fáeinum línum.',
  writerPasoResumir: 'Draga saman helstu atriðin',
  writerExplicaCorregir: 'Ég leiðrétti stafsetningu, stíl og skýrleika án þess að breyta því sem þú vildir segja.',
  writerPasoCorregir: 'Leiðrétta stafsetningu, stíl og skýrleika',
  writerExplicaIdeas: 'Ég sting upp á nokkrum hugmyndum og upphafspunkti svo þú getir skrifað án ritstíflu.',
  writerPasoIdeas: 'Stinga upp á hugmyndum til að skrifa',

  writerExplicaPortada: 'Ég móta hugmyndina að kápunni og bý til þrjár tillögur sem þú getur valið úr.',
  writerPasoConceptoPortada: 'Móta hugmyndina að kápunni',
  writerPasoPropuestasPortada: 'Búa til 3 tillögur að kápu',

  writerExplicaReescribir: 'Ég endurskrifa textann þinn (tónn: {{tono}}) og held hugmyndinni.',
  writerPasoReescribir: 'Endurskrifa textann',
  writerExplicaCv: 'Ég skrifa ferilskrána þína (tónn: {{tono}}), tilbúna til að nota í ritlinum og senda.',
  writerPasoCv: 'Skrifa ferilskrána þína',

  writerExplicaPublicacion: 'Ég skrifa færsluna (tónn: {{tono}}) og fínpússa hana svo hún verði tilbúin.',
  writerExplicaHistoria: 'Ég skrifa söguna (tónn: {{tono}}) og fínpússa hana svo hún verði tilbúin.',
  writerExplicaGuion: 'Ég skrifa handritið (tónn: {{tono}}) og fínpússa það svo það verði tilbúið.',
  writerExplicaArticulo: 'Ég skrifa greinina (tónn: {{tono}}) og fínpússa hana svo hún verði tilbúin.',
  writerExplicaEmail: 'Ég skrifa tölvupóstinn (tónn: {{tono}}) og fínpússa hann svo hann verði tilbúinn.',
  writerExplicaDocumento: 'Ég skrifa skjalið (tónn: {{tono}}) og fínpússa það svo það verði tilbúið.',
  writerPasoPublicacion: 'Skrifa færsluna',
  writerPasoHistoria: 'Skrifa söguna',
  writerPasoGuion: 'Skrifa handritið',
  writerPasoArticulo: 'Skrifa greinina',
  writerPasoEmail: 'Skrifa tölvupóstinn',
  writerPasoDocumento: 'Skrifa skjalið',
  writerPasoPulir: 'Fínpússa textann og gera hann tilbúinn',

  writerDecisionEmpiezoPublicacion: 'byrja ég á færslu',
  writerDecisionTonoCercano: 'nota ég vinalegan tón',
  writerDecisionTonoProfesional: 'nota ég faglegan tón',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Ég undirbý textann og tek hann upp (rödd: {{voz}}).',
  musicExplicaVozCalida: 'Ég undirbý textann og tek hann upp með hlýrri og skýrri rödd.',
  musicPasoTextoNarracion: 'Undirbúa texta frásagnarinnar',
  musicPasoGrabarVoz: 'Taka upp röddina',

  musicExplicaLetra: 'Ég skrifa allan söngtextann (stíll: {{estilo}}).',
  musicPasoLetraCompleta: 'Skrifa allan söngtextann',

  musicExplicaMezcla: 'Ég hlusta á lagið þitt, hljóðblanda það og fullvinn svo það hljómi fagmannlega.',
  musicPasoAnotarMezcla: 'Hlusta á lagið þitt og skrá athugasemdir um hljóðblöndunina',
  musicPasoMasterizar: 'Hljóðblanda og fullvinna',

  musicExplicaVideoclip: 'Ég bý til lagið ({{estilo}}, {{animo}}) og atriðin og set saman allt tónlistarmyndbandið þitt. Þú þarft ekki að fara út úr Weë Music.',
  musicPasoIdeaYLetra: 'Skrifa hugmyndina og söngtextann',
  musicPasoEscenas: 'Búa til atriði tónlistarmyndbandsins',
  musicPasoArmarVideoclip: 'Setja saman tónlistarmyndbandið með laginu þínu',

  musicExplicaJingle: 'Ég bý til stutt og grípandi auglýsingastef (stíll: {{estilo}}, stemning: {{animo}}).',
  musicPasoFraseJingle: 'Skrifa línu auglýsingastefsins',
  musicPasoJingle: 'Búa til auglýsingastefið',
  musicExplicaBeat: 'Ég bý til takt (stíll: {{estilo}}, stemning: {{animo}}).',
  musicPasoIdeaMusical: 'Móta tónlistarhugmyndina',
  musicPasoBeat: 'Búa til taktinn',

  musicExplicaCancion: 'Ég skrifa söngtextann, bý til lagið (stíll: {{estilo}}, stemning: {{animo}}) og hanna umslagið.',
  musicPasoLetra: 'Skrifa söngtextann',
  musicPasoCancion: 'Búa til lagið',
  musicPasoPortada: 'Hanna umslagið',

  musicDecisionEmpiezoCancion: 'byrja ég á lagi',
  musicDecisionEstiloPop: 'valdi ég popp',
  musicDecisionAnimoAlegre: 'hef ég stemninguna glaðlega',
  musicDecisionVozCalida: 'valdi ég hlýja og skýra rödd',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Ég skoða myndina þína og set saman einfalda húðumhirðurútínu með vörum sem auðvelt er að fá.',
  beautyPasoRutina: 'Setja saman húðumhirðurútínuna þína',

  beautyExplicaRostro: 'Ég skoða andlitið þitt, mæli með klippingum og stílum sem fara þér best og prófa tvo þeirra á myndinni þinni.',
  beautyPasoMirarRostro: 'Skoða andlitið þitt',
  beautyPasoRecomendar: 'Mæla með klippingum, gleraugum og stílum',
  beautyPasoProbarDosEstilos: 'Prófa þá tvo stíla sem fara þér best',

  beautyExplicaProbar: 'Ég prófa tvær útgáfur (breyting: {{cambio}}; tilefni: {{ocasion}}) og held andlitinu, húðinni og birtunni á myndinni.',
  beautyPasoProbar: 'Prófa breytinguna ({{cambio}}) og halda andlitinu þínu',
  beautyOcasionElDiaADia: 'hversdagslífið',

  beautyDecisionCambioCompleto: 'sting ég upp á algjörri útlitsbreytingu',
  beautyDecisionOcasionDiaADia: 'hugsaði ég það fyrir hversdagslífið',
};
