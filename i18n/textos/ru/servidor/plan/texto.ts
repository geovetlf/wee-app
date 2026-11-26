/*
 * RUSO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}` va detrás de «на»: el acusativo de «английский» es igual al nominativo. `{{tono}}`, `{{voz}}`, `{{estilo}}`,
 * `{{animo}}`, `{{cambio}}` y `{{ocasion}}` entran detrás de su etiqueta («тон:», «настроение:»), en nominativo.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Найду настоящие цитаты по теме и укажу источник каждой, чтобы вы могли проверить.',
  writerPasoCitas: 'Найти цитаты и их источники',

  writerExplicaTraducir: 'Переведу ваш текст на {{idioma}}, сохранив смысл и тон.',
  writerPasoTraducir: 'Перевести на {{idioma}}',
  writerDecisionIdiomaIngles: 'переведу на английский',
  writerIdiomaEn: 'английский',
  writerIdiomaPt: 'португальский',
  writerIdiomaFr: 'французский',
  writerIdiomaIt: 'итальянский',

  writerExplicaResumir: 'Сокращу ваш текст до ключевых идей в нескольких строках.',
  writerPasoResumir: 'Сократить до ключевых идей',
  writerExplicaCorregir: 'Исправлю орфографию, стиль и ясность, не меняя того, что вы хотели сказать.',
  writerPasoCorregir: 'Исправить орфографию, стиль и ясность',
  writerExplicaIdeas: 'Предложу несколько идей и отправную точку, чтобы писать без ступора.',
  writerPasoIdeas: 'Предложить идеи для текста',

  writerExplicaPortada: 'Продумаю концепцию обложки и создам три варианта на выбор.',
  writerPasoConceptoPortada: 'Продумать концепцию обложки',
  writerPasoPropuestasPortada: 'Создать 3 варианта обложки',

  writerExplicaReescribir: 'Перепишу ваш текст (тон: {{tono}}), сохранив идею.',
  writerPasoReescribir: 'Переписать текст',
  writerExplicaCv: 'Напишу ваше резюме (тон: {{tono}}), готовое к работе в редакторе и к отправке.',
  writerPasoCv: 'Написать ваше резюме',

  writerExplicaPublicacion: 'Напишу публикацию (тон: {{tono}}), а затем доведу её до готовности.',
  writerExplicaHistoria: 'Напишу историю (тон: {{tono}}), а затем доведу её до готовности.',
  writerExplicaGuion: 'Напишу сценарий (тон: {{tono}}), а затем доведу его до готовности.',
  writerExplicaArticulo: 'Напишу статью (тон: {{tono}}), а затем доведу её до готовности.',
  writerExplicaEmail: 'Напишу письмо (тон: {{tono}}), а затем доведу его до готовности.',
  writerExplicaDocumento: 'Напишу документ (тон: {{tono}}), а затем доведу его до готовности.',
  writerPasoPublicacion: 'Написать публикацию',
  writerPasoHistoria: 'Написать историю',
  writerPasoGuion: 'Написать сценарий',
  writerPasoArticulo: 'Написать статью',
  writerPasoEmail: 'Написать письмо',
  writerPasoDocumento: 'Написать документ',
  writerPasoPulir: 'Довести текст до готовности',

  writerDecisionEmpiezoPublicacion: 'начну с публикации',
  writerDecisionTonoCercano: 'выбираю дружелюбный тон',
  writerDecisionTonoProfesional: 'выбираю профессиональный тон',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Подготовлю текст и запишу его (голос: {{voz}}).',
  musicExplicaVozCalida: 'Подготовлю текст и запишу его тёплым и чистым голосом.',
  musicPasoTextoNarracion: 'Подготовить текст озвучки',
  musicPasoGrabarVoz: 'Записать голос',

  musicExplicaLetra: 'Напишу полный текст песни (стиль: {{estilo}}).',
  musicPasoLetraCompleta: 'Написать полный текст песни',

  musicExplicaMezcla: 'Послушаю вашу песню, сведу и отмастерю её, чтобы она звучала профессионально.',
  musicPasoAnotarMezcla: 'Послушать вашу песню и отметить задачи для сведения',
  musicPasoMasterizar: 'Свести и отмастерить',

  musicExplicaVideoclip: 'Создам песню (стиль: {{estilo}}; настроение: {{animo}}), сцены и смонтирую весь клип. Покидать Weë Music не придётся.',
  musicPasoIdeaYLetra: 'Написать идею и текст',
  musicPasoEscenas: 'Создать сцены клипа',
  musicPasoArmarVideoclip: 'Смонтировать клип с вашей песней',

  musicExplicaJingle: 'Создам короткий и запоминающийся джингл (стиль: {{estilo}}; настроение: {{animo}}).',
  musicPasoFraseJingle: 'Написать фразу для джингла',
  musicPasoJingle: 'Создать джингл',
  musicExplicaBeat: 'Создам бит (стиль: {{estilo}}; настроение: {{animo}}).',
  musicPasoIdeaMusical: 'Продумать музыкальную идею',
  musicPasoBeat: 'Создать бит',

  musicExplicaCancion: 'Напишу текст, создам песню (стиль: {{estilo}}; настроение: {{animo}}) и разработаю обложку.',
  musicPasoLetra: 'Написать текст',
  musicPasoCancion: 'Создать песню',
  musicPasoPortada: 'Разработать обложку',

  musicDecisionEmpiezoCancion: 'начну с песни',
  musicDecisionEstiloPop: 'выбираю стиль поп',
  musicDecisionAnimoAlegre: 'с радостным настроением',
  musicDecisionVozCalida: 'выбираю тёплый и чистый голос',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Посмотрю на ваше фото и составлю простой уход за кожей со средствами, которые легко найти.',
  beautyPasoRutina: 'Составить ваш уход',

  beautyExplicaRostro: 'Посмотрю на ваше лицо, посоветую стрижки и стили, которые подходят вам больше всего, и примерю два из них на вашем фото.',
  beautyPasoMirarRostro: 'Посмотреть на ваше лицо',
  beautyPasoRecomendar: 'Посоветовать стрижки, очки и стили',
  beautyPasoProbarDosEstilos: 'Примерить два самых подходящих стиля',

  beautyExplicaProbar: 'Примерю на фото: {{cambio}} (случай: {{ocasion}}). Сделаю два варианта, сохранив ваше лицо, кожу и свет на снимке.',
  beautyPasoProbar: 'Примерить, сохранив ваше лицо: {{cambio}}',
  beautyOcasionElDiaADia: 'каждый день',

  beautyDecisionCambioCompleto: 'предлагаю полную смену образа',
  beautyDecisionOcasionDiaADia: 'рассчитываю на каждый день',
};
