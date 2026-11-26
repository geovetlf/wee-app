/*
 * FILIPINO — Preguntas del flujo guiado de Weë AI (43): lo que Weë le pregunta a la persona, en su burbuja.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. La app solo las pinta en filipino si el
 * servidor sigue diciendo exactamente la frase española (`i18n/servidor.ts`).
 *
 * Habla Weë, de tú a tú: «ka», «mo», «kita», nunca «po» (guía § 2); frases cortas, el verbo o el interrogativo
 * delante y el signo de interrogación solo al final (la de Design que en español es una invitación tampoco lo lleva
 * aquí). «Qué» + sustantivo es «Anong …?» («Anong tono?», «Anong istilo?»), la forma de todos los días; «¿Qué
 * quieres crear?» es «Ano ang gusto mong likhain?», como el glosario § 11.10; «¿En qué te ayudo?», «Saan kita
 * matutulungan?»; «¿Qué hacemos con tu foto?» y «¿Qué escribimos?» invitan a hacerlo juntos, con «natin» (guía § 2:
 * «tayo» incluye a la persona). «Publicar» es «i-post» («Saan mo ito ipo-post?», contemplativo con guion, § 3.3).
 *
 * Las preguntas se escriben pensando en sus botones (`opciones`): «¿Qué quieres que transmita tu marca?» es «Anong
 * dating ang gusto mo para sa brand mo?» («dating», la impresión que causa algo), que se contesta con los adjetivos de
 * las opciones («Seryoso at mapagkakatiwalaan»); «¿Es un espacio interior o exterior?» es «Titingnan ba natin ito
 * mula sa labas o mula sa loob?», en el orden de sus botones («Mula sa labas», «Mula sa loob», «Malawak na tanaw»);
 * «¿De qué época?», «Anong panahon?» («Hinaharap», «Kasalukuyan», «Klasiko», «Sci-fi»); «¿Qué tan formal?», «Gaano
 * kapormal ang tono?»; «¿A qué idioma?», «Sa anong wika ito isasalin?», entera porque la corta quedaría ambigua;
 * «¿Cuánto tiempo tienes?», «Gaano katagal ka puwedeng magluto?», que se contesta con minutos u horas; «¿Qué ánimo?»,
 * «Anong mood?», la palabra con que se habla de música; «¿A qué ritmo?», «Anong takbo ng biyahe ang gusto mo?»
 * («takbo», el ritmo de un viaje; «Sa anong bilis?» sonaba a velocidad), que se contesta con «Relaks…»,
 * «Katamtaman» o «Puspusan…». «Espacio» es «espasyo», «personaje» «karakter» y «escenario» «tagpuan» (`catalogo`).
 */
export const preguntas: typeof import('../../es/servidor/preguntas').preguntas = {
  designWhat: 'Sabihin mo kung ano ang kailangan mo at magmumungkahi ako kung saan magsisimula',
  designName: 'Anong pangalan o text ang gusto mong lumabas sa logo?',
  designFeel: 'Anong dating ang gusto mo para sa brand mo?',
  designMessage: 'Ano ang gusto mong ipaalam?',
  designWhere: 'Saan mo ito ipo-post?',
  designItem: 'Anong produkto ang gusto mong idisenyo?',
  designLook: 'Anong itsura ang naiisip mo?',
  designMachine: 'Anong sasakyan o makina ang naiisip mo?',
  designEra: 'Anong panahon?',
  designPlace: 'Anong lugar o tagpuan ang gusto mong likhain?',
  designInout: 'Titingnan ba natin ito mula sa labas o mula sa loob?',
  designWho: 'Sino o anong karakter ang gusto mong likhain?',
  designDraw: 'Anong visual na istilo ang gusto mo?',
  studioType: 'Anong klaseng video?',
  studioStyle: 'Anong istilo ang gusto mo?',
  studioWhere: 'Saan mo ito ipo-post?',
  photoAction: 'Ano ang gagawin natin sa larawan mo?',
  photoDetail: 'Paano mo ito gusto?',
  writerWhat: 'Ano ang isusulat natin?',
  writerTone: 'Anong tono?',
  writerLanguage: 'Sa anong wika ito isasalin?',
  musicWhat: 'Ano ang gusto mong likhain?',
  musicStyle: 'Anong istilo?',
  musicMood: 'Anong mood?',
  musicVoice: 'Anong boses?',
  beautyWhat: 'Ano ang gusto mong subukan?',
  beautyOccasion: 'Para sa anong okasyon?',
  chefWhat: 'Ano ang gusto mong gawin?',
  chefChange: 'Ano ang gusto mong baguhin sa larawan?',
  chefPeople: 'Para sa ilang tao?',
  chefTime: 'Gaano katagal ka puwedeng magluto?',
  chefDays: 'Para sa ilang araw?',
  homeWhat: 'Ano ang gusto mong gawin?',
  homeSpace: 'Anong espasyo?',
  homeStyle: 'Anong istilo?',
  businessWhat: 'Saan kita matutulungan?',
  businessTone: 'Gaano kapormal ang tono?',
  travelWhat: 'Ano ang kailangan mo?',
  travelVibe: 'Ano ang hinahanap mo sa biyaheng ito?',
  travelDates: 'Kailan ka bibiyahe?',
  travelInterest: 'Ano ang pinakagusto mo?',
  travelPace: 'Anong takbo ng biyahe ang gusto mo?',
  brainWhat: 'Saan kita matutulungan?',
};
