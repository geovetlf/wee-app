/*
 * FILIPINO — Objetivos por defecto del flujo guiado de Weë AI (11): el título del trabajo cuando la persona empezó
 * una experiencia sin escribir nada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. La app solo pinta el filipino si el
 * objetivo del trabajo es exactamente el español por defecto; lo que escribió la persona se queda como lo escribió.
 *
 * Es la voz de la persona, igual que los «…Goal» de `catalogo`: donde el español pone un infinitivo, el filipino pone
 * el imperativo sin pronombre con el que se le pide algo a un asistente («Magdisenyo ng …», «Palaguin ang negosyo
 * ko»), y donde pone un nombre, un nombre («Maikling video para sa social media ko»). Cuando la frase española ya
 * está en `catalogo`, se escribe IGUAL que allí, para que el mismo encargo no tenga dos títulos: «Mejorar una foto»
 * es «Pagandahin ang isang larawan» (`photoAcIdkGoal`), «Un texto para publicar», «Text na ipo-post»
 * (`writerAcMoreGoal`), «Música para mi contenido», «Musika para sa content ko» (`musicAcIdkGoal`), «Probar un
 * cambio de look», «Subukan ang bagong look» (`studioAcBeautyGoal`), «Renovar un espacio de mi casa», «I-renovate ang
 * isang espasyo sa bahay ko» (`homeAcIdkGoal`), y el de Weë Brain, «Kailangan ko ng tulong at hindi ko alam kung
 * saan magsisimula» (`brainAcIdkGoal`). «Hacer crecer mi negocio» es «Palaguin ang negosyo ko», el verbo de
 * `businessAcStrategyGoal`; «rico» es «masarap», como en las tarjetas de Weë Chef; «redes», «social media»; diseñar,
 * «magdisenyo» (nunca «mag-design»); un viaje, «biyahe» (palabras de `catalogo`).
 */
export const objetivos: typeof import('../../es/servidor/objetivos').objetivos = {
  objDesign: 'Magdisenyo ng bagay na naiisip ko',
  objStudio: 'Maikling video para sa social media ko',
  objPhoto: 'Pagandahin ang isang larawan',
  objWriter: 'Text na ipo-post',
  objMusic: 'Musika para sa content ko',
  objBeauty: 'Subukan ang bagong look',
  objChef: 'Masarap na makakain ngayong araw',
  objHome: 'I-renovate ang isang espasyo sa bahay ko',
  objBusiness: 'Palaguin ang negosyo ko',
  objTravel: 'Biyaheng gusto kong gawin',
  objBrain: 'Kailangan ko ng tulong at hindi ko alam kung saan magsisimula',
};
