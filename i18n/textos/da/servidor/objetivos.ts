/*
 * DANÉS — Objetivos por defecto del flujo guiado de Weë AI (11): el título del trabajo cuando la persona empezó una
 * experiencia sin escribir nada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. La app solo pinta el danés si el
 * objetivo del trabajo es exactamente el español por defecto; lo que escribió la persona se queda como lo escribió.
 *
 * Es la voz de la persona, igual que los «…Goal» de `catalogo`: donde el español pone un infinitivo, el danés pone
 * el imperativo con que se le pide algo a un asistente («Design noget, jeg har i tankerne», «Prøv et nyt look»), y
 * donde pone un nombre, un nombre («En kort video til mine sociale medier»). Cuando la frase española ya está en
 * `catalogo`, se escribe igual que allí, para que el mismo encargo no tenga dos títulos: «Mejorar una foto» es «Gør
 * et foto bedre» (sin el imperativo «Forbedr», guía § 3), «Un texto para publicar», «En tekst til udgivelse»,
 * «Música para mi contenido», «Musik til mit indhold», «Probar un cambio de look», «Prøv et nyt look», «Renovar un
 * espacio de mi casa», «Forny et rum i mit hjem», y el de Weë Brain, «Jeg har brug for hjælp og ved ikke, hvor jeg
 * skal starte». «Hacer crecer mi negocio» es «Få min virksomhed til at vokse» (glosario: negocio, «virksomhed»;
 * `catalogo.businessIntro`); «rico» es «lækkert», como en las tarjetas de Weë Chef.
 */
export const objetivos: typeof import('../../es/servidor/objetivos').objetivos = {
  objDesign: 'Design noget, jeg har i tankerne',
  objStudio: 'En kort video til mine sociale medier',
  objPhoto: 'Gør et foto bedre',
  objWriter: 'En tekst til udgivelse',
  objMusic: 'Musik til mit indhold',
  objBeauty: 'Prøv et nyt look',
  objChef: 'Noget lækkert at spise i dag',
  objHome: 'Forny et rum i mit hjem',
  objBusiness: 'Få min virksomhed til at vokse',
  objTravel: 'En rejse, jeg gerne vil på',
  objBrain: 'Jeg har brug for hjælp og ved ikke, hvor jeg skal starte',
};
