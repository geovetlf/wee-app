/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`. En ruso eso significa además que no se
 * transliteran: se escriben en alfabeto latino dentro de la frase en cirílico,
 * y traducir "Brain" sería tan incorrecto como escribirlo en cirílico.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Ваш умный помощник для всего',
  slogan: 'Придумать · Спросить · Создать · Связаться',
  description: 'Вся сила Weë — в одном разговоре.',
  systemLabel: 'Weë Brain, связан с остальными разделами Weë AI',
  goTo: 'Перейти в {{seccion}}',
  placeholder: 'Напишите здесь своё сообщение...',
  settingsHint: 'Каким должен быть ответ.',
  searchGroup: 'Поиск в интернете',
  imageLabel: 'Изображение',
  settingsLabel: 'Настройки',
  blockLeft: 'Осталось {{restantes}} из {{total}} ответов',
};
