/*
 * RUSO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` entra detrás de dos puntos, en nominativo. Las piezas `archivo…` («документ», «аудио») no cambian en
 * acusativo. Sin pasado en primera persona: marcaría género. «Toma» es «дубль», «plano» es «план» y «producción» es
 * «постановка», como en `filmmaker.ts`.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'В вашем запросе чего-то не хватает. Проверьте его и попробуйте ещё раз.',
  unauthorized: 'Войдите, чтобы создавать с Weë.',
  accountRequired: 'Чтобы создавать контент с Weë AI, войдите или создайте аккаунт.',
  providerError: 'На этот раз ИИ не смог завершить вашу работу. Ничего не списано: попробуйте ещё раз чуть позже.',
  generationFailed: 'Не удалось завершить вашу работу. Ничего не списано: попробуйте ещё раз.',
  timeout: 'Это заняло слишком много времени, поэтому процесс остановлен. Ничего не списано: попробуйте ещё раз.',
  rateLimited: 'Вы запустили слишком много работ подряд. Ничего не списано: подождите немного и попробуйте ещё раз.',
  duplicate: 'Эта работа уже создаётся.',
  notAvailable: 'Эта функция пока недоступна.',
  inputRejected: 'Это фото или видео нельзя использовать для генерации: реальные лица и такой контент не принимаются. Попробуйте другое изображение или описание.',
  faltaCampo: 'Не хватает: {{campo}}.',
  revisaCampo: 'Проверьте: {{campo}}. Нужно от 1 до {{max}} символов.',
  campoMensaje: 'ваше сообщение',
  campoDescripcionVideo: 'описание видео',
  conversacionNoEncontrada: 'Мы не нашли этот разговор.',
  sinPlan: 'У этой работы ещё нет плана.',
  sinUnPlan: 'У этой работы ещё нет готового плана.',
  yaTienePlan: 'У этой работы уже есть план.',
  subeFoto: 'Загрузите фото, чтобы Weë мог с ним работать.',
  trabajoNoEncontrado: 'Мы не нашли эту работу.',
  trabajoAjeno: 'Эта работа вам не принадлежит.',
  experienciaDesconocida: 'Неизвестный раздел.',
  faltaTrabajo: 'Не указана работа.',
  intentoSinTiempo: 'Время этой попытки истекло, ваши Credits возвращены. Можно попробовать ещё раз.',
  fotoDireccion: 'Адрес фото недействителен.',
  fotoSubir: 'Перед использованием фото нужно загрузить в Weë.',
  fotoAjena: 'Это фото вам не принадлежит.',
  archivoSube: 'Загрузите {{archivo}}, чтобы Weë мог его прочитать.',
  archivoDireccion: 'Недействительный адрес: {{archivo}}.',
  archivoSubir: 'Сначала загрузите {{archivo}} в Weë, чтобы его можно было использовать.',
  archivoAjeno: 'Этот файл вам не принадлежит: {{archivo}}.',
  archivoDocumento: 'документ',
  archivoAudio: 'аудио',
  sinTiempoAntes: 'Время истекло ещё до начала. Ничего не списано.',
  sinProveedor: 'Сейчас для этого нет доступного ИИ. Попробуйте позже.',
  noDisponibleActualmente: 'Сейчас эта функция недоступна.',
  noDisponibleAhora: 'В данный момент эта функция недоступна. Попробуйте чуть позже.',
  noDisponibleOpciones: 'Эта функция недоступна с выбранными вами параметрами. Попробуйте другие.',
  describeVideo: 'Расскажите, какое видео вы хотите создать.',
  creacionTerminada: 'Эта работа уже завершена и не будет создаваться заново. Найдите её в своих работах.',
  tomaInvalida: 'У этого дубля недопустимый формат.',
  planoInvalido: 'У этого плана недопустимый формат.',
  produccionNoEncontrada: 'Мы не нашли эту постановку.',
  tomaNoGenerable: 'Этот дубль нельзя сгенерировать таким образом.',
  creacionNoEncontrada: 'Мы не нашли эту работу.',
  debesIniciarSesion: 'Нужно войти в аккаунт',
};
