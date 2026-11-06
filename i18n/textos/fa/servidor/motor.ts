/*
 * PERSA — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los mismos giros que `../weeai.ts`. `{{campo}}` y `{{archivo}}` son piezas de este archivo: entran delante de «را» o
 * tras la ezafe, sin sufijo pegado al hueco.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'چیزی در درخواست شما کم است. آن را بررسی کنید و دوباره تلاش کنید.',
  unauthorized: 'برای ساختن با Weë وارد شوید.',
  providerError: 'این بار هوش مصنوعی نتوانست اثر شما را کامل کند. هزینه‌ای کسر نکردم: چند لحظهٔ دیگر دوباره تلاش کنید.',
  generationFailed: 'نتوانستم اثر شما را تمام کنم. هزینه‌ای کسر نکردم: دوباره تلاش کنید.',
  timeout: 'خیلی طول کشید و متوقفش کردم. هزینه‌ای کسر نکردم: دوباره تلاش کنید.',
  rateLimited: 'پشت سر هم آثار زیادی ساخته‌اید. هزینه‌ای کسر نکردم: کمی صبر کنید و دوباره تلاش کنید.',
  duplicate: 'آن اثر از قبل در حال ساخت است.',
  notAvailable: 'این قابلیت هنوز در دسترس نیست.',
  inputRejected: 'نشد از این عکس یا ویدیو برای ساخت استفاده کرد: چهرهٔ واقعی و چنین محتوایی پذیرفته نمی‌شود. تصویر یا توضیح دیگری را امتحان کنید.',
  faltaCampo: '{{campo}} کم است.',
  revisaCampo: '{{campo}} را بررسی کنید: باید بین 1 تا {{max}} نویسه باشد.',
  campoMensaje: 'پیام شما',
  campoDescripcionVideo: 'توضیح ویدیو',
  conversacionNoEncontrada: 'این گفتگو را پیدا نکردیم.',
  sinPlan: 'این کار هنوز برنامه ندارد.',
  sinUnPlan: 'این کار هنوز هیچ برنامه‌ای ندارد.',
  yaTienePlan: 'این کار از قبل برنامه دارد.',
  subeFoto: 'یک عکس بارگذاری کنید تا Weë بتواند با آن کار کند.',
  trabajoNoEncontrado: 'این کار را پیدا نکردیم.',
  trabajoAjeno: 'این کار متعلق به شما نیست.',
  experienciaDesconocida: 'تجربهٔ ناشناخته.',
  faltaTrabajo: 'کار مشخص نشده است.',
  intentoSinTiempo: 'زمان آن تلاش تمام شد و Credits شما را برگرداندم. می‌توانید دوباره تلاش کنید.',
  fotoDireccion: 'نشانی عکس معتبر نیست.',
  fotoSubir: 'عکس باید پیش از استفاده در Weë بارگذاری شود.',
  fotoAjena: 'آن عکس متعلق به شما نیست.',
  archivoSube: '{{archivo}} را بارگذاری کنید تا Weë بتواند آن را بخواند.',
  archivoDireccion: 'نشانی {{archivo}} معتبر نیست.',
  archivoSubir: '{{archivo}} باید پیش از استفاده در Weë بارگذاری شود.',
  archivoAjeno: 'آن {{archivo}} متعلق به شما نیست.',
  archivoDocumento: 'سند',
  archivoAudio: 'فایل صوتی',
  sinTiempoAntes: 'زمان پیش از شروع تمام شد. هزینه‌ای کسر نکردم.',
  sinProveedor: 'در حال حاضر هوش مصنوعی‌ای برای این کار در دسترس نیست. بعداً دوباره تلاش کنید.',
  noDisponibleActualmente: 'این قابلیت در حال حاضر در دسترس نیست.',
  noDisponibleAhora: 'این قابلیت در این لحظه در دسترس نیست. کمی بعد دوباره تلاش کنید.',
  noDisponibleRegion: 'این قابلیت در حال حاضر در منطقهٔ شما در دسترس نیست.',
  noDisponiblePais: 'برای استفاده از این قابلیت، کشورتان را در پروفایل واقعی خود مشخص کنید.',
  noDisponibleOpciones: 'این قابلیت با گزینه‌هایی که انتخاب کردید در دسترس نیست. گزینه‌های دیگری را امتحان کنید.',
  describeVideo: 'بگویید چه ویدیویی می‌خواهید بسازید.',
  creacionTerminada: 'آن اثر تمام شده و دوباره ساخته نمی‌شود. آن را در آثارتان پیدا کنید.',
  tomaInvalida: 'این برداشت ساختار معتبری ندارد.',
  planoInvalido: 'این نما ساختار معتبری ندارد.',
  produccionNoEncontrada: 'آن تولید را پیدا نکردیم.',
  tomaNoGenerable: 'این برداشت را نمی‌شود این‌طور ساخت.',
  creacionNoEncontrada: 'آن اثر را پیدا نکردیم.',
  debesIniciarSesion: 'باید وارد شوید',
};
