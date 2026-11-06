/*
 * RUSO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Días y noches cuentan y por eso llevan `_few`/`_many` (`ConPlurales`): «на 1 день», «на 2 дня», «на 5 дней». `{{fechas}}`
 * llega de `weeai.tripOneDay`, `tripSameMonth` y `tripRange`, a veces con «с … по» y a veces sin nada, así que entra
 * detrás de «даты:», donde sirven las dos. `{{busca}}` y `{{tono}}` entran en nominativo detrás de dos puntos.
 */
import { ConPlurales } from '../../plurales';

export const planNegocio: ConPlurales<typeof import('../../../es/servidor/plan/negocio').planNegocio> = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Разберусь в вашем бизнесе, напишу публикацию (тон: {{tono}}) и создам изображение к ней.',
  businessExplicaCalendario: 'Составлю календарь публикаций на неделю: день, время и соцсеть для каждой.',
  businessExplicaPublicar: 'Подготовлю публикацию и адаптирую её под каждую соцсеть: вам останется скопировать и опубликовать. Weë пока не подключён к вашим соцсетям, поэтому не публикует за вас.',
  businessExplicaRespuesta: 'Напишу вежливый и понятный ответ вашему клиенту, готовый к отправке.',
  businessExplicaResultados: 'Изучу ваши результаты, расскажу, что сработало и что лучше сделать на этой неделе.',
  businessExplicaCampana: 'Разберусь в вашем бизнесе, разработаю кампанию (тон: {{tono}}) и создам её главное изображение.',
  businessExplicaCv: 'Разберусь в вашем опыте и напишу резюме (тон: {{tono}}), готовое к использованию.',
  businessExplicaPresentacion: 'Сначала разберусь в вашем бизнесе, затем напишу презентацию слайд за слайдом (тон: {{tono}}).',
  businessExplicaDocumento: 'Сначала разберусь в вашем бизнесе, затем напишу документ (тон: {{tono}}).',
  businessExplicaIdeas: 'Сначала разберусь в вашем бизнесе, затем предложу конкретные идеи и стратегию роста.',

  businessTonoProfesionalPeroCercano: 'профессиональный, но дружелюбный',

  businessDecisionTonoProfesionalPeroCercano: 'выбираю профессиональный, но дружелюбный тон',
  businessDecisionTonoCercanoYProfesional: 'выбираю дружелюбный и профессиональный тон',
  businessDecisionTonoProfesional: 'выбираю профессиональный тон',
  businessDecisionIdeasConcretas: 'начну с конкретных идей',

  businessPasoEntender: 'Разобраться в вашем бизнесе и цели',
  businessPasoImagenPublicacion: 'Создать изображение для публикации',
  businessPasoCalendario: 'Составить календарь публикаций',
  businessPasoPrepararPublicacion: 'Подготовить публикацию',
  businessPasoAdaptarACadaRed: 'Адаптировать её под каждую соцсеть',
  businessPasoRespuesta: 'Написать ответ вашему клиенту',
  businessPasoResultados: 'Изучить ваши результаты и объяснить их',
  businessPasoCampana: 'Разработать кампанию',
  businessPasoImagenCampana: 'Создать изображение для кампании',
  businessPasoPresentacion: 'Написать презентацию (слайд за слайдом)',
  businessPasoMercado: 'Посмотреть, что сегодня происходит на вашем рынке',
  businessPasoIdeas: 'Предложить идеи и стратегию',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Предложу три направления для поездки (даты: {{fechas}}) с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку.',
  travelExplicaDestinosDias_one: 'Предложу три направления на {{contador}} день · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку.',
  travelExplicaDestinosDias_few: 'Предложу три направления на {{contador}} дня · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку.',
  travelExplicaDestinosDias_many: 'Предложу три направления на {{contador}} дней · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку.',
  travelExplicaDestinosDias_other: 'Предложу три направления на {{contador}} дня · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку.',
  travelExplicaDestinosDiasAviso_one: 'Предложу три направления на {{contador}} день · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaDestinosDiasAviso_few: 'Предложу три направления на {{contador}} дня · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaDestinosDiasAviso_many: 'Предложу три направления на {{contador}} дней · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaDestinosDiasAviso_other: 'Предложу три направления на {{contador}} дня · {{lasNoches}} с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaDestinosTuViaje: 'Предложу три направления для вашей поездки с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку.',
  travelExplicaDestinosTuViajeAviso: 'Предложу три направления для вашей поездки с учётом того, что вы ищете: {{busca}}. Выберите одно, и я подготовлю всю поездку. Когда узнаете даты, сообщите их, и я учту сезон.',

  travelBuscaSorpresa: 'что-нибудь неожиданное',

  travelExplicaItinerarioFechas_one: 'Подготовлю маршрут (даты: {{fechas}}; {{contador}} день · {{lasNoches}}) по дням и с примерным бюджетом.',
  travelExplicaItinerarioFechas_few: 'Подготовлю маршрут (даты: {{fechas}}; {{contador}} дня · {{lasNoches}}) по дням и с примерным бюджетом.',
  travelExplicaItinerarioFechas_many: 'Подготовлю маршрут (даты: {{fechas}}; {{contador}} дней · {{lasNoches}}) по дням и с примерным бюджетом.',
  travelExplicaItinerarioFechas_other: 'Подготовлю маршрут (даты: {{fechas}}; {{contador}} дня · {{lasNoches}}) по дням и с примерным бюджетом.',
  travelExplicaItinerarioDias_one: 'Подготовлю маршрут на {{contador}} день · {{lasNoches}} по дням и с примерным бюджетом.',
  travelExplicaItinerarioDias_few: 'Подготовлю маршрут на {{contador}} дня · {{lasNoches}} по дням и с примерным бюджетом.',
  travelExplicaItinerarioDias_many: 'Подготовлю маршрут на {{contador}} дней · {{lasNoches}} по дням и с примерным бюджетом.',
  travelExplicaItinerarioDias_other: 'Подготовлю маршрут на {{contador}} дня · {{lasNoches}} по дням и с примерным бюджетом.',
  travelExplicaItinerarioDiasAviso_one: 'Подготовлю маршрут на {{contador}} день · {{lasNoches}} по дням и с примерным бюджетом. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaItinerarioDiasAviso_few: 'Подготовлю маршрут на {{contador}} дня · {{lasNoches}} по дням и с примерным бюджетом. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaItinerarioDiasAviso_many: 'Подготовлю маршрут на {{contador}} дней · {{lasNoches}} по дням и с примерным бюджетом. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaItinerarioDiasAviso_other: 'Подготовлю маршрут на {{contador}} дня · {{lasNoches}} по дням и с примерным бюджетом. Когда узнаете даты, сообщите их, и я учту сезон.',
  travelExplicaItinerarioTuViaje: 'Подготовлю маршрут вашей поездки по дням и с примерным бюджетом.',
  travelExplicaItinerarioTuViajeAviso: 'Подготовлю маршрут вашей поездки по дням и с примерным бюджетом. Когда узнаете даты, сообщите их, и я учту сезон.',

  travelExplicaQueHacer: 'Найду, что стоит посмотреть и где поесть, и укажу источник для каждого пункта, чтобы вы могли проверить.',
  travelExplicaMoverse: 'Найду способы передвижения, сколько времени они занимают и примерно сколько стоят.',

  travelLasNoches_one: '{{contador}} ночь',
  travelLasNoches_few: '{{contador}} ночи',
  travelLasNoches_many: '{{contador}} ночей',
  travelLasNoches_other: '{{contador}} ночи',

  travelDecisionTresViajes: 'предложу три непохожие друг на друга поездки',
  travelDecisionTresViajesAviso: 'предложу три непохожие друг на друга поездки. Когда узнаете даты, сообщите их, и я учту сезон',
  travelDecisionReparto: 'распределю дни между самым интересным',
  travelDecisionRepartoAviso: 'распределю дни между самым интересным. Когда узнаете даты, сообщите их, и я учту сезон',

  travelPasoDestinos: 'Найти три подходящих вам направления',
  travelPasoQueHacer: 'Найти, что стоит посмотреть и где поесть',
  travelPasoMoverse: 'Найти, как передвигаться',
  travelPasoItinerario_one: 'Подготовить маршрут на {{contador}} день',
  travelPasoItinerario_few: 'Подготовить маршрут на {{contador}} дня',
  travelPasoItinerario_many: 'Подготовить маршрут на {{contador}} дней',
  travelPasoItinerario_other: 'Подготовить маршрут на {{contador}} дня',
  travelPasoItinerarioTuViaje: 'Подготовить маршрут вашей поездки',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Постараюсь точно понять, что вам нужно, и подготовлю понятный ответ со следующими шагами.',
  brainDecisionPuntoDePartida: 'предложу отправную точку и, если понадобится, направлю к нужному специалисту Weë',
  brainPasoEntender: 'Точно понять, что вам нужно',
  brainPasoRespuesta: 'Подготовить понятный ответ со следующими шагами',
};
