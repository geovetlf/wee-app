/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición (`weeai.tripOneDay`, `tripSameMonth`, `tripRange`: «a 12 de outubro», «de 12 a
 * 22 de outubro»), así que va suelta detrás del verbo. `{{busca}}` puede ser un verbo o un nombre: entra detrás de dos
 * puntos para que sirvan los dos. `travelPasoItinerario_one` va en singular, a diferencia del español.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Vou perceber o teu negócio, escrever a publicação com um tom {{tono}} e criar a imagem que a acompanha.',
  businessExplicaCalendario: 'Vou preparar o teu calendário de publicações da semana, com dia, hora e rede para cada uma.',
  businessExplicaPublicar: 'Vou preparar a publicação e adaptá-la a cada rede, pronta para copiares e publicares. O Weë ainda não está ligado às tuas redes, por isso não publica por ti.',
  businessExplicaRespuesta: 'Vou escrever uma resposta simpática e clara para o teu cliente, pronta a enviar.',
  businessExplicaResultados: 'Vou analisar os teus resultados e dizer-te o que funcionou e o que vale a pena fazer esta semana.',
  businessExplicaCampana: 'Vou perceber o teu negócio, criar a campanha com um tom {{tono}} e criar a sua imagem principal.',
  businessExplicaCv: 'Vou perceber a tua experiência e escrever o teu currículo com um tom {{tono}}, pronto a usar.',
  businessExplicaPresentacion: 'Primeiro percebo o teu negócio e depois escrevo a apresentação, diapositivo a diapositivo, com um tom {{tono}}.',
  businessExplicaDocumento: 'Primeiro percebo o teu negócio e depois escrevo o documento com um tom {{tono}}.',
  businessExplicaIdeas: 'Primeiro percebo o teu negócio e depois sugiro ideias concretas e uma estratégia para crescer.',

  businessTonoProfesionalPeroCercano: 'profissional, mas amigável',

  businessDecisionTonoProfesionalPeroCercano: 'uso um tom profissional, mas amigável',
  businessDecisionTonoCercanoYProfesional: 'uso um tom amigável e profissional',
  businessDecisionTonoProfesional: 'uso um tom profissional',
  businessDecisionIdeasConcretas: 'começo por ideias concretas',

  businessPasoEntender: 'Perceber o teu negócio e o teu objetivo',
  businessPasoImagenPublicacion: 'Criar a imagem para a publicação',
  businessPasoCalendario: 'Preparar o calendário de publicações',
  businessPasoPrepararPublicacion: 'Preparar a publicação',
  businessPasoAdaptarACadaRed: 'Adaptá-la a cada rede',
  businessPasoRespuesta: 'Escrever a resposta para o teu cliente',
  businessPasoResultados: 'Analisar os teus resultados e explicá-los',
  businessPasoCampana: 'Criar a campanha',
  businessPasoImagenCampana: 'Criar a imagem da campanha',
  businessPasoPresentacion: 'Escrever a apresentação (diapositivo a diapositivo)',
  businessPasoMercado: 'Ver como está o teu mercado neste momento',
  businessPasoIdeas: 'Sugerir ideias e uma estratégia',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Vou sugerir três destinos para viajares {{fechas}}, a pensar no que procuras: {{busca}}. Com o que escolheres, preparo a viagem inteira.',
  travelExplicaDestinosDias_one: 'Vou sugerir três destinos para {{contador}} dia · {{lasNoches}}, a pensar no que procuras: {{busca}}. Com o que escolheres, preparo a viagem inteira.',
  travelExplicaDestinosDias_other: 'Vou sugerir três destinos para {{contador}} dias · {{lasNoches}}, a pensar no que procuras: {{busca}}. Com o que escolheres, preparo a viagem inteira.',
  travelExplicaDestinosDiasAviso_one: 'Vou sugerir três destinos para {{contador}} dia · {{lasNoches}}, a pensar no que procuras: {{busca}}. Com o que escolheres, preparo a viagem inteira. Quando souberes as datas, diz-me e ajusto tudo à época do ano.',
  travelExplicaDestinosDiasAviso_other: 'Vou sugerir três destinos para {{contador}} dias · {{lasNoches}}, a pensar no que procuras: {{busca}}. Com o que escolheres, preparo a viagem inteira. Quando souberes as datas, diz-me e ajusto tudo à época do ano.',
  travelExplicaDestinosTuViaje: 'Vou sugerir três destinos para a tua viagem, a pensar no que procuras: {{busca}}. Com o que escolheres, preparo a viagem inteira.',
  travelExplicaDestinosTuViajeAviso: 'Vou sugerir três destinos para a tua viagem, a pensar no que procuras: {{busca}}. Com o que escolheres, preparo a viagem inteira. Quando souberes as datas, diz-me e ajusto tudo à época do ano.',

  travelBuscaSorpresa: 'algo que te surpreenda',

  travelExplicaItinerarioFechas_one: 'Vou preparar o teu itinerário {{fechas}} ({{contador}} dia · {{lasNoches}}), dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioFechas_other: 'Vou preparar o teu itinerário {{fechas}} ({{contador}} dias · {{lasNoches}}), dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioDias_one: 'Vou preparar o teu itinerário de {{contador}} dia · {{lasNoches}}, dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioDias_other: 'Vou preparar o teu itinerário de {{contador}} dias · {{lasNoches}}, dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioDiasAviso_one: 'Vou preparar o teu itinerário de {{contador}} dia · {{lasNoches}}, dia a dia e com um orçamento aproximado. Quando souberes as datas, diz-me e ajusto tudo à época do ano.',
  travelExplicaItinerarioDiasAviso_other: 'Vou preparar o teu itinerário de {{contador}} dias · {{lasNoches}}, dia a dia e com um orçamento aproximado. Quando souberes as datas, diz-me e ajusto tudo à época do ano.',
  travelExplicaItinerarioTuViaje: 'Vou preparar o itinerário da tua viagem, dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioTuViajeAviso: 'Vou preparar o itinerário da tua viagem, dia a dia e com um orçamento aproximado. Quando souberes as datas, diz-me e ajusto tudo à época do ano.',

  travelExplicaQueHacer: 'Vou procurar o que vale a pena e onde comer, e deixo-te a fonte de cada coisa para poderes confirmar.',
  travelExplicaMoverse: 'Vou procurar as formas de te deslocares, com quanto tempo demoram e quanto custam, aproximadamente.',

  travelLasNoches_one: '{{contador}} noite',
  travelLasNoches_other: '{{contador}} noites',

  travelDecisionTresViajes: 'sugiro três viagens bem diferentes entre si',
  travelDecisionTresViajesAviso: 'sugiro três viagens bem diferentes entre si. Quando souberes as datas, diz-me e ajusto tudo à época do ano',
  travelDecisionReparto: 'divido os dias pelo melhor de cada coisa',
  travelDecisionRepartoAviso: 'divido os dias pelo melhor de cada coisa. Quando souberes as datas, diz-me e ajusto tudo à época do ano',

  travelPasoDestinos: 'Procurar três destinos que combinem contigo',
  travelPasoQueHacer: 'Procurar o que vale a pena e onde comer',
  travelPasoMoverse: 'Procurar como te podes deslocar',
  travelPasoItinerario_one: 'Preparar o itinerário de {{contador}} dia',
  travelPasoItinerario_other: 'Preparar o itinerário de {{contador}} dias',
  travelPasoItinerarioTuViaje: 'Preparar o itinerário da tua viagem',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Vou perceber bem do que precisas e preparar uma resposta clara, com os próximos passos.',
  brainDecisionPuntoDePartida: 'sugiro um ponto de partida e, se for preciso, levo-te ao especialista do Weë mais indicado',
  brainPasoEntender: 'Perceber bem do que precisas',
  brainPasoRespuesta: 'Preparar uma resposta clara com os próximos passos',
};
