/*
 * RUSO — Lo que contestan las Functions sociales: ËContact y encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Нет заявки, которую можно принять.',
  ecRelacionInvalida: 'Эта заявка недействительна.',
  ecNoLaRecibiste: 'Принять заявку может только тот, кто её получил.',
  ecYaSonContactos: 'Вы уже связаны в ËContact.',
  ecIdentidadInvalida: 'Этот профиль недействителен.',
  ecIdentidadDesconocida: 'Такого профиля не существует.',
  ecIdentidadAjena: 'Этот профиль вам не принадлежит.',
  ecMismaPersona: 'Нельзя связаться с собственным профилем.',
  ecYaExiste: 'Связь с этим профилем уже существует.',
  ecIniciaSesion: 'Войдите, чтобы пользоваться ËContact.',
  ecNoSeCompleto: 'Не удалось завершить операцию. Попробуйте ещё раз.',
  ecFaltaPerfilPropio: 'Не указан профиль, с которого вы связываетесь.',
  ecFaltaPerfilAjeno: 'Не указан профиль, с которым нужно связаться.',
  ecFaltaPerfilQueAcepta: 'Не указан профиль, с которого вы принимаете заявку.',
  ecFaltaPerfilQueEnvia: 'Не указан профиль человека, отправившего заявку.',
  encSinEncuesta: 'В этой публикации нет опроса.',
  encInvalida: 'Этот опрос недействителен.',
  encAntigua: 'Этот опрос из предыдущей версии Weë и больше не принимает голоса.',
  encOpcionInexistente: 'В этом опросе нет такого варианта.',
  encCerrada: 'Этот опрос завершён.',
  encYaVotaste: 'Вы уже проголосовали в этом опросе.',
  encPostNoExiste: 'Этой публикации больше нет.',
  encIniciaSesion: 'Чтобы проголосовать, нужно войти в аккаунт.',
  encFaltaPublicacion: 'Не указана публикация.',
  encFaltaOpcion: 'Не указан вариант.',
  encNoSeRegistro: 'Не удалось учесть ваш голос. Попробуйте ещё раз.',
};
