/*
 * RUMANO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición. `{{busca}}` va detrás de dos puntos, porque la opción es un sustantivo («odihnă»).
 * Los días y las noches llevan las tres formas del rumano («1 zi», «3 zile», «20 de zile»): por eso `ConPlurales`.
 */
import { ConPlurales } from '../../../ru/plurales';

export const planNegocio: ConPlurales<typeof import('../../../es/servidor/plan/negocio').planNegocio> = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Îți înțeleg afacerea, scriu postarea cu un ton {{tono}} și creez imaginea care o însoțește.',
  businessExplicaCalendario: 'Îți alcătuiesc calendarul de postări al săptămânii, cu zi, oră și rețea pentru fiecare.',
  businessExplicaPublicar: 'Pregătesc postarea și o adaptez pentru fiecare rețea, gata să o copiezi și să o publici tu. Weë nu este încă conectat la rețelele tale, așa că nu publică în locul tău.',
  businessExplicaRespuesta: 'Scriu un răspuns amabil și clar pentru clientul tău, gata de trimis.',
  businessExplicaResultados: 'Îți analizez rezultatele, îți spun ce a funcționat și ce merită făcut săptămâna aceasta.',
  businessExplicaCampana: 'Îți înțeleg afacerea, proiectez campania cu un ton {{tono}} și creez imaginea ei principală.',
  businessExplicaCv: 'Îți înțeleg experiența și îți redactez CV-ul cu un ton {{tono}}, gata de folosit.',
  businessExplicaPresentacion: 'Mai întâi îți înțeleg afacerea și apoi scriu prezentarea, diapozitiv cu diapozitiv, cu un ton {{tono}}.',
  businessExplicaDocumento: 'Mai întâi îți înțeleg afacerea și apoi redactez documentul cu un ton {{tono}}.',
  businessExplicaIdeas: 'Mai întâi îți înțeleg afacerea și apoi îți propun idei concrete și o strategie de creștere.',

  businessTonoProfesionalPeroCercano: 'profesional, dar apropiat',

  businessDecisionTonoProfesionalPeroCercano: 'folosesc un ton profesional, dar apropiat',
  businessDecisionTonoCercanoYProfesional: 'folosesc un ton apropiat și profesional',
  businessDecisionTonoProfesional: 'folosesc un ton profesional',
  businessDecisionIdeasConcretas: 'încep cu idei concrete',

  businessPasoEntender: 'Înțelegerea afacerii și a obiectivului tău',
  businessPasoImagenPublicacion: 'Crearea imaginii pentru postare',
  businessPasoCalendario: 'Alcătuirea calendarului de postări',
  businessPasoPrepararPublicacion: 'Pregătirea postării',
  businessPasoAdaptarACadaRed: 'Adaptarea pentru fiecare rețea',
  businessPasoRespuesta: 'Scrierea răspunsului pentru clientul tău',
  businessPasoResultados: 'Analizarea și explicarea rezultatelor tale',
  businessPasoCampana: 'Proiectarea campaniei',
  businessPasoImagenCampana: 'Crearea imaginii campaniei',
  businessPasoPresentacion: 'Scrierea prezentării (diapozitiv cu diapozitiv)',
  businessPasoMercado: 'Căutarea informațiilor despre situația actuală a pieței tale',
  businessPasoIdeas: 'Propunerea de idei și a unei strategii',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Îți propun trei destinații {{fechas}}, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria.',
  travelExplicaDestinosDias_one: 'Îți propun trei destinații pentru {{contador}} zi · {{lasNoches}}, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria.',
  travelExplicaDestinosDias_few: 'Îți propun trei destinații pentru {{contador}} zile · {{lasNoches}}, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria.',
  travelExplicaDestinosDias_other: 'Îți propun trei destinații pentru {{contador}} de zile · {{lasNoches}}, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria.',
  travelExplicaDestinosDiasAviso_one: 'Îți propun trei destinații pentru {{contador}} zi · {{lasNoches}}, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',
  travelExplicaDestinosDiasAviso_few: 'Îți propun trei destinații pentru {{contador}} zile · {{lasNoches}}, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',
  travelExplicaDestinosDiasAviso_other: 'Îți propun trei destinații pentru {{contador}} de zile · {{lasNoches}}, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',
  travelExplicaDestinosTuViaje: 'Îți propun trei destinații pentru călătoria ta, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria.',
  travelExplicaDestinosTuViajeAviso: 'Îți propun trei destinații pentru călătoria ta, ținând cont de ce cauți: {{busca}}. Pe baza celei alese, îți pregătesc toată călătoria. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',

  travelBuscaSorpresa: 'ceva care să te surprindă',

  travelExplicaItinerarioFechas_one: 'Îți pregătesc itinerarul {{fechas}} ({{contador}} zi · {{lasNoches}}), zi cu zi și cu un buget aproximativ.',
  travelExplicaItinerarioFechas_few: 'Îți pregătesc itinerarul {{fechas}} ({{contador}} zile · {{lasNoches}}), zi cu zi și cu un buget aproximativ.',
  travelExplicaItinerarioFechas_other: 'Îți pregătesc itinerarul {{fechas}} ({{contador}} de zile · {{lasNoches}}), zi cu zi și cu un buget aproximativ.',
  travelExplicaItinerarioDias_one: 'Îți pregătesc itinerarul pentru {{contador}} zi · {{lasNoches}}, zi cu zi și cu un buget aproximativ.',
  travelExplicaItinerarioDias_few: 'Îți pregătesc itinerarul pentru {{contador}} zile · {{lasNoches}}, zi cu zi și cu un buget aproximativ.',
  travelExplicaItinerarioDias_other: 'Îți pregătesc itinerarul pentru {{contador}} de zile · {{lasNoches}}, zi cu zi și cu un buget aproximativ.',
  travelExplicaItinerarioDiasAviso_one: 'Îți pregătesc itinerarul pentru {{contador}} zi · {{lasNoches}}, zi cu zi și cu un buget aproximativ. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',
  travelExplicaItinerarioDiasAviso_few: 'Îți pregătesc itinerarul pentru {{contador}} zile · {{lasNoches}}, zi cu zi și cu un buget aproximativ. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',
  travelExplicaItinerarioDiasAviso_other: 'Îți pregătesc itinerarul pentru {{contador}} de zile · {{lasNoches}}, zi cu zi și cu un buget aproximativ. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',
  travelExplicaItinerarioTuViaje: 'Îți pregătesc itinerarul călătoriei tale, zi cu zi și cu un buget aproximativ.',
  travelExplicaItinerarioTuViajeAviso: 'Îți pregătesc itinerarul călătoriei tale, zi cu zi și cu un buget aproximativ. Când știi datele, spune-mi-le și potrivesc totul cu sezonul.',

  travelExplicaQueHacer: 'Caut ce merită văzut și unde să mănânci și îți las sursa fiecărei informații, ca să o poți verifica.',
  travelExplicaMoverse: 'Caut modalitățile de deplasare, cu durata și costul lor aproximativ.',

  travelLasNoches_one: '{{contador}} noapte',
  travelLasNoches_few: '{{contador}} nopți',
  travelLasNoches_other: '{{contador}} de nopți',

  travelDecisionTresViajes: 'îți propun trei călătorii diferite între ele',
  travelDecisionTresViajesAviso: 'îți propun trei călătorii diferite între ele. Când știi datele, spune-mi-le și potrivesc totul cu sezonul',
  travelDecisionReparto: 'împart zilele între ce e mai bun din fiecare',
  travelDecisionRepartoAviso: 'împart zilele între ce e mai bun din fiecare. Când știi datele, spune-mi-le și potrivesc totul cu sezonul',

  travelPasoDestinos: 'Căutarea a trei destinații potrivite',
  travelPasoQueHacer: 'Căutarea a ce merită văzut și a locurilor unde să mănânci',
  travelPasoMoverse: 'Căutarea modalităților de deplasare',
  travelPasoItinerario_one: 'Pregătirea itinerarului pentru {{contador}} zi',
  travelPasoItinerario_few: 'Pregătirea itinerarului pentru {{contador}} zile',
  travelPasoItinerario_other: 'Pregătirea itinerarului pentru {{contador}} de zile',
  travelPasoItinerarioTuViaje: 'Pregătirea itinerarului călătoriei tale',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Înțeleg bine de ce ai nevoie și îți pregătesc un răspuns clar, cu pașii următori.',
  brainDecisionPuntoDePartida: 'îți propun un punct de plecare și, dacă e nevoie, te duc la specialistul potrivit din Weë',
  brainPasoEntender: 'Înțelegerea a ceea ce ai nevoie',
  brainPasoRespuesta: 'Pregătirea unui răspuns clar, cu pașii următori',
};
