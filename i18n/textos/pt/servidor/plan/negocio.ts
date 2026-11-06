/*
 * PORTUGUÉS (pt-BR) — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición (`weeai.tripOneDay`, `tripSameMonth`, `tripRange`: «em 12 de outubro», «de 12 a
 * 22 de outubro»), así que va suelta detrás del verbo. `{{busca}}` puede ser un verbo o un nombre: entra detrás de dos
 * puntos para que sirvan los dos. `travelPasoItinerario_one` va en singular, a diferencia del español.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Vou entender seu negócio, escrever a publicação com um tom {{tono}} e criar a imagem que a acompanha.',
  businessExplicaCalendario: 'Vou montar seu calendário de publicações da semana, com dia, horário e rede para cada uma.',
  businessExplicaPublicar: 'Vou preparar a publicação e adaptá-la a cada rede, pronta para você copiar e publicar. O Weë ainda não está conectado às suas redes, então não publica por você.',
  businessExplicaRespuesta: 'Vou escrever uma resposta gentil e clara para o seu cliente, pronta para enviar.',
  businessExplicaResultados: 'Vou analisar seus resultados e contar o que funcionou e o que vale a pena fazer nesta semana.',
  businessExplicaCampana: 'Vou entender seu negócio, criar a campanha com um tom {{tono}} e criar a imagem principal dela.',
  businessExplicaCv: 'Vou entender sua experiência e escrever seu currículo com um tom {{tono}}, pronto para usar.',
  businessExplicaPresentacion: 'Primeiro entendo seu negócio e depois escrevo a apresentação, slide por slide, com um tom {{tono}}.',
  businessExplicaDocumento: 'Primeiro entendo seu negócio e depois escrevo o documento com um tom {{tono}}.',
  businessExplicaIdeas: 'Primeiro entendo seu negócio e depois sugiro ideias concretas e uma estratégia para crescer.',

  businessTonoProfesionalPeroCercano: 'profissional, mas amigável',

  businessDecisionTonoProfesionalPeroCercano: 'uso um tom profissional, mas amigável',
  businessDecisionTonoCercanoYProfesional: 'uso um tom amigável e profissional',
  businessDecisionTonoProfesional: 'uso um tom profissional',
  businessDecisionIdeasConcretas: 'começo por ideias concretas',

  businessPasoEntender: 'Entender seu negócio e seu objetivo',
  businessPasoImagenPublicacion: 'Criar a imagem para a publicação',
  businessPasoCalendario: 'Montar o calendário de publicações',
  businessPasoPrepararPublicacion: 'Preparar a publicação',
  businessPasoAdaptarACadaRed: 'Adaptá-la a cada rede',
  businessPasoRespuesta: 'Escrever a resposta para o seu cliente',
  businessPasoResultados: 'Analisar seus resultados e explicá-los',
  businessPasoCampana: 'Criar a campanha',
  businessPasoImagenCampana: 'Criar a imagem da campanha',
  businessPasoPresentacion: 'Escrever a apresentação (slide por slide)',
  businessPasoMercado: 'Ver como está o seu mercado agora',
  businessPasoIdeas: 'Sugerir ideias e uma estratégia',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Vou sugerir três destinos para viajar {{fechas}}, pensando no que você busca: {{busca}}. Com o que você escolher, preparo a viagem inteira.',
  travelExplicaDestinosDias_one: 'Vou sugerir três destinos para {{contador}} dia · {{lasNoches}}, pensando no que você busca: {{busca}}. Com o que você escolher, preparo a viagem inteira.',
  travelExplicaDestinosDias_other: 'Vou sugerir três destinos para {{contador}} dias · {{lasNoches}}, pensando no que você busca: {{busca}}. Com o que você escolher, preparo a viagem inteira.',
  travelExplicaDestinosDiasAviso_one: 'Vou sugerir três destinos para {{contador}} dia · {{lasNoches}}, pensando no que você busca: {{busca}}. Com o que você escolher, preparo a viagem inteira. Quando souber as datas, me diga e eu ajusto de acordo com a temporada.',
  travelExplicaDestinosDiasAviso_other: 'Vou sugerir três destinos para {{contador}} dias · {{lasNoches}}, pensando no que você busca: {{busca}}. Com o que você escolher, preparo a viagem inteira. Quando souber as datas, me diga e eu ajusto de acordo com a temporada.',
  travelExplicaDestinosTuViaje: 'Vou sugerir três destinos para a sua viagem, pensando no que você busca: {{busca}}. Com o que você escolher, preparo a viagem inteira.',
  travelExplicaDestinosTuViajeAviso: 'Vou sugerir três destinos para a sua viagem, pensando no que você busca: {{busca}}. Com o que você escolher, preparo a viagem inteira. Quando souber as datas, me diga e eu ajusto de acordo com a temporada.',

  travelBuscaSorpresa: 'algo que surpreenda você',

  travelExplicaItinerarioFechas_one: 'Vou preparar seu itinerário {{fechas}} ({{contador}} dia · {{lasNoches}}), dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioFechas_other: 'Vou preparar seu itinerário {{fechas}} ({{contador}} dias · {{lasNoches}}), dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioDias_one: 'Vou preparar seu itinerário de {{contador}} dia · {{lasNoches}}, dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioDias_other: 'Vou preparar seu itinerário de {{contador}} dias · {{lasNoches}}, dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioDiasAviso_one: 'Vou preparar seu itinerário de {{contador}} dia · {{lasNoches}}, dia a dia e com um orçamento aproximado. Quando souber as datas, me diga e eu ajusto de acordo com a temporada.',
  travelExplicaItinerarioDiasAviso_other: 'Vou preparar seu itinerário de {{contador}} dias · {{lasNoches}}, dia a dia e com um orçamento aproximado. Quando souber as datas, me diga e eu ajusto de acordo com a temporada.',
  travelExplicaItinerarioTuViaje: 'Vou preparar o itinerário da sua viagem, dia a dia e com um orçamento aproximado.',
  travelExplicaItinerarioTuViajeAviso: 'Vou preparar o itinerário da sua viagem, dia a dia e com um orçamento aproximado. Quando souber as datas, me diga e eu ajusto de acordo com a temporada.',

  travelExplicaQueHacer: 'Vou buscar o que vale a pena e onde comer, e deixo a fonte de cada coisa para você poder conferir.',
  travelExplicaMoverse: 'Vou buscar as formas de você se locomover, com quanto tempo levam e quanto custam, aproximadamente.',

  travelLasNoches_one: '{{contador}} noite',
  travelLasNoches_other: '{{contador}} noites',

  travelDecisionTresViajes: 'sugiro três viagens bem diferentes entre si',
  travelDecisionTresViajesAviso: 'sugiro três viagens bem diferentes entre si. Quando souber as datas, me diga e eu ajusto de acordo com a temporada',
  travelDecisionReparto: 'divido os dias entre o melhor de cada coisa',
  travelDecisionRepartoAviso: 'divido os dias entre o melhor de cada coisa. Quando souber as datas, me diga e eu ajusto de acordo com a temporada',

  travelPasoDestinos: 'Buscar três destinos que combinem',
  travelPasoQueHacer: 'Buscar o que vale a pena e onde comer',
  travelPasoMoverse: 'Buscar como se locomover',
  travelPasoItinerario_one: 'Preparar o itinerário de {{contador}} dia',
  travelPasoItinerario_other: 'Preparar o itinerário de {{contador}} dias',
  travelPasoItinerarioTuViaje: 'Preparar o itinerário da sua viagem',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Vou entender bem do que você precisa e preparar uma resposta clara, com os próximos passos.',
  brainDecisionPuntoDePartida: 'sugiro um ponto de partida e, se precisar, levo você ao especialista do Weë mais indicado',
  brainPasoEntender: 'Entender bem do que você precisa',
  brainPasoRespuesta: 'Preparar uma resposta clara com os próximos passos',
};
