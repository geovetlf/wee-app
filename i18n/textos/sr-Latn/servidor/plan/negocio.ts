/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica) — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los huecos que rellena una opción o lo que escribió la persona van detrás de dos puntos o entre paréntesis, donde el
 * nominativo no necesita caso; Weë habla en presente o futuro, sin marcar género.
 * Plural one / few / other: por eso `ConPlurales`.
 */
import { ConPlurales } from '../../../ru/plurales';

export const planNegocio: ConPlurales<typeof import('../../../es/servidor/plan/negocio').planNegocio> = {
  businessExplicaContenido: 'Razumeću tvoj posao, napisati objavu (ton: {{tono}}) i napraviti sliku koja je prati.',
  businessExplicaCalendario: 'Sastaviću tvoj raspored objava za nedelju, sa danom, satom i mrežom za svaku objavu.',
  businessExplicaPublicar: 'Pripremiću objavu i prilagoditi je svakoj mreži, spremnu da je kopiraš i objaviš. Weë još nije povezan sa tvojim mrežama, pa ne objavljuje umesto tebe.',
  businessExplicaRespuesta: 'Napisaću ljubazan i jasan odgovor za tvog klijenta, spreman za slanje.',
  businessExplicaResultados: 'Pregledaću tvoje rezultate i reći ti šta je uspelo i šta se isplati uraditi ove nedelje.',
  businessExplicaCampana: 'Razumeću tvoj posao, osmisliti kampanju (ton: {{tono}}) i napraviti njenu glavnu sliku.',
  businessExplicaCv: 'Razumeću tvoje iskustvo i sastaviti tvoj CV (ton: {{tono}}), spreman za upotrebu.',
  businessExplicaPresentacion: 'Prvo ću razumeti tvoj posao, a zatim napisati prezentaciju slajd po slajd (ton: {{tono}}).',
  businessExplicaDocumento: 'Prvo ću razumeti tvoj posao, a zatim sastaviti dokument (ton: {{tono}}).',
  businessExplicaIdeas: 'Prvo ću razumeti tvoj posao, a zatim ti predložiti konkretne ideje i strategiju rasta.',
  businessTonoProfesionalPeroCercano: 'profesionalan, ali prisan',
  businessDecisionTonoProfesionalPeroCercano: 'koristim profesionalan, ali prisan ton',
  businessDecisionTonoCercanoYProfesional: 'koristim prisan i profesionalan ton',
  businessDecisionTonoProfesional: 'koristim profesionalan ton',
  businessDecisionIdeasConcretas: 'počinjem konkretnim idejama',
  businessPasoEntender: 'Razumeti tvoj posao i cilj',
  businessPasoImagenPublicacion: 'Napraviti sliku za objavu',
  businessPasoCalendario: 'Sastaviti raspored objava',
  businessPasoPrepararPublicacion: 'Pripremiti objavu',
  businessPasoAdaptarACadaRed: 'Prilagoditi je svakoj mreži',
  businessPasoRespuesta: 'Napisati odgovor za tvog klijenta',
  businessPasoResultados: 'Pregledati i objasniti tvoje rezultate',
  businessPasoCampana: 'Osmisliti kampanju',
  businessPasoImagenCampana: 'Napraviti sliku kampanje',
  businessPasoPresentacion: 'Napisati prezentaciju (slajd po slajd)',
  businessPasoMercado: 'Proveriti kakvo je sada tvoje tržište',
  businessPasoIdeas: 'Predložiti ideje i strategiju',
  travelExplicaDestinosFechas: 'Predložiću ti tri destinacije ({{fechas}}). Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje.',
  travelExplicaDestinosDias_one: 'Predložiću ti tri destinacije za {{contador}} dan · {{lasNoches}}. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje.',
  travelExplicaDestinosDias_few: 'Predložiću ti tri destinacije za {{contador}} dana · {{lasNoches}}. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje.',
  travelExplicaDestinosDias_other: 'Predložiću ti tri destinacije za {{contador}} dana · {{lasNoches}}. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje.',
  travelExplicaDestinosDiasAviso_one: 'Predložiću ti tri destinacije za {{contador}} dan · {{lasNoches}}. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelExplicaDestinosDiasAviso_few: 'Predložiću ti tri destinacije za {{contador}} dana · {{lasNoches}}. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelExplicaDestinosDiasAviso_other: 'Predložiću ti tri destinacije za {{contador}} dana · {{lasNoches}}. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelExplicaDestinosTuViaje: 'Predložiću ti tri destinacije za tvoje putovanje. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje.',
  travelExplicaDestinosTuViajeAviso: 'Predložiću ti tri destinacije za tvoje putovanje. Tražiš: {{busca}}. Za onu koju izabereš pripremiću celo putovanje. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelBuscaSorpresa: 'nešto što će te iznenaditi',
  travelExplicaItinerarioFechas_one: 'Pripremiću ti plan putovanja ({{fechas}}; {{contador}} dan · {{lasNoches}}), dan po dan i sa okvirnim budžetom.',
  travelExplicaItinerarioFechas_few: 'Pripremiću ti plan putovanja ({{fechas}}; {{contador}} dana · {{lasNoches}}), dan po dan i sa okvirnim budžetom.',
  travelExplicaItinerarioFechas_other: 'Pripremiću ti plan putovanja ({{fechas}}; {{contador}} dana · {{lasNoches}}), dan po dan i sa okvirnim budžetom.',
  travelExplicaItinerarioDias_one: 'Pripremiću ti plan putovanja za {{contador}} dan · {{lasNoches}}, dan po dan i sa okvirnim budžetom.',
  travelExplicaItinerarioDias_few: 'Pripremiću ti plan putovanja za {{contador}} dana · {{lasNoches}}, dan po dan i sa okvirnim budžetom.',
  travelExplicaItinerarioDias_other: 'Pripremiću ti plan putovanja za {{contador}} dana · {{lasNoches}}, dan po dan i sa okvirnim budžetom.',
  travelExplicaItinerarioDiasAviso_one: 'Pripremiću ti plan putovanja za {{contador}} dan · {{lasNoches}}, dan po dan i sa okvirnim budžetom. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelExplicaItinerarioDiasAviso_few: 'Pripremiću ti plan putovanja za {{contador}} dana · {{lasNoches}}, dan po dan i sa okvirnim budžetom. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelExplicaItinerarioDiasAviso_other: 'Pripremiću ti plan putovanja za {{contador}} dana · {{lasNoches}}, dan po dan i sa okvirnim budžetom. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelExplicaItinerarioTuViaje: 'Pripremiću ti plan tvog putovanja, dan po dan i sa okvirnim budžetom.',
  travelExplicaItinerarioTuViajeAviso: 'Pripremiću ti plan tvog putovanja, dan po dan i sa okvirnim budžetom. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom.',
  travelExplicaQueHacer: 'Potražiću šta vredi videti i gde jesti, i navesti izvor za svaku stavku da možeš da je proveriš.',
  travelExplicaMoverse: 'Potražiću načine kretanja, sa trajanjem i okvirnom cenom.',
  travelLasNoches_one: '{{contador}} noć',
  travelLasNoches_few: '{{contador}} noći',
  travelLasNoches_other: '{{contador}} noći',
  travelDecisionTresViajes: 'predlažem tri međusobno različita putovanja',
  travelDecisionTresViajesAviso: 'predlažem tri međusobno različita putovanja. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom',
  travelDecisionReparto: 'raspoređujem dane na najbolje od svega',
  travelDecisionRepartoAviso: 'raspoređujem dane na najbolje od svega. Kad saznaš datume, reci mi pa ću to uskladiti sa sezonom',
  travelPasoDestinos: 'Potražiti tri destinacije koje odgovaraju',
  travelPasoQueHacer: 'Potražiti šta vredi videti i gde jesti',
  travelPasoMoverse: 'Potražiti kako se kretati',
  travelPasoItinerario_one: 'Pripremiti plan putovanja za {{contador}} dan',
  travelPasoItinerario_few: 'Pripremiti plan putovanja za {{contador}} dana',
  travelPasoItinerario_other: 'Pripremiti plan putovanja za {{contador}} dana',
  travelPasoItinerarioTuViaje: 'Pripremiti plan tvog putovanja',
  brainExplica: 'Dobro ću razumeti šta ti treba i pripremiti ti jasan odgovor sa sledećim koracima.',
  brainDecisionPuntoDePartida: 'predlažem polaznu tačku i, ako treba, vodim te do odgovarajućeg stručnjaka u aplikaciji Weë',
  brainPasoEntender: 'Dobro razumeti šta ti treba',
  brainPasoRespuesta: 'Pripremiti ti jasan odgovor sa sledećim koracima',
};
