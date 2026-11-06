/*
 * TURCO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Ningún sufijo sobre un hueco (guía § 4). `{{campo}}` va como etiqueta tras dos puntos y `{{archivo}}` delante de
 * «dosyası», que lleva el sufijo: «belge dosyası», «ses dosyası».
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'İsteğinde eksik bir şey var. Kontrol edip yeniden dene.',
  unauthorized: 'Weë ile oluşturmak için giriş yap.',
  providerError: 'Yapay zekâ bu kez içeriğini tamamlayamadı. Ücret alınmadı: birazdan yeniden dene.',
  generationFailed: 'İçeriğini tamamlayamadım. Ücret alınmadı: yeniden dene.',
  timeout: 'Çok uzun sürdü ve durdurdum. Ücret alınmadı: yeniden dene.',
  rateLimited: 'Art arda çok fazla içerik oluşturdun. Ücret alınmadı: biraz bekleyip yeniden dene.',
  duplicate: 'Bu içerik zaten oluşturuluyor.',
  notAvailable: 'Bu özellik henüz kullanılamıyor.',
  inputRejected: 'Fotoğraf ya da video oluşturmada kullanılamadı: gerçek yüzler ve bu tür içerikler kabul edilmiyor. Başka bir görsel ya da açıklama dene.',
  faltaCampo: 'Eksik: {{campo}}.',
  revisaCampo: 'Şunu kontrol et: {{campo}}. 1 ile {{max}} karakter arasında olmalı.',
  campoMensaje: 'mesajın',
  campoDescripcionVideo: 'video açıklaması',
  conversacionNoEncontrada: 'Bu sohbeti bulamadık.',
  sinPlan: 'Bu işin henüz planı yok.',
  sinUnPlan: 'Bu iş için henüz bir plan yok.',
  yaTienePlan: 'Bu işin zaten bir planı var.',
  subeFoto: 'Weë\'nin üzerinde çalışabilmesi için bir fotoğraf yükle.',
  trabajoNoEncontrado: 'Bu işi bulamadık.',
  trabajoAjeno: 'Bu iş senin değil.',
  experienciaDesconocida: 'Bilinmeyen uzman.',
  faltaTrabajo: 'İş belirtilmemiş.',
  intentoSinTiempo: 'Bu denemenin süresi doldu ve Credits iade edildi. Yeniden deneyebilirsin.',
  fotoDireccion: 'Fotoğrafın adresi geçersiz.',
  fotoSubir: 'Fotoğraf, kullanılmadan önce Weë\'ye yüklenmeli.',
  fotoAjena: 'Bu fotoğraf senin değil.',
  archivoSube: 'Weë\'nin okuyabilmesi için {{archivo}} dosyasını yükle.',
  archivoDireccion: '{{archivo}} dosyasının adresi geçersiz.',
  archivoSubir: '{{archivo}} dosyası, kullanılmadan önce Weë\'ye yüklenmeli.',
  archivoAjeno: 'Bu {{archivo}} dosyası senin değil.',
  archivoDocumento: 'belge',
  archivoAudio: 'ses',
  sinTiempoAntes: 'Başlamadan önce süre doldu. Ücret alınmadı.',
  sinProveedor: 'Şu anda bunun için kullanılabilecek bir yapay zekâ yok. Daha sonra yeniden dene.',
  noDisponibleActualmente: 'Bu özellik şu anda kullanılamıyor.',
  noDisponibleAhora: 'Bu özellik şu anda kullanılamıyor. Biraz sonra yeniden dene.',
  noDisponibleRegion: 'Bu özellik şu anda bölgende kullanılamıyor.',
  noDisponiblePais: 'Bu özelliği kullanmak için Gerçek profilinde ülkeni belirt.',
  noDisponibleOpciones: 'Bu özellik seçtiğin seçeneklerle kullanılamıyor. Başka seçenekler dene.',
  describeVideo: 'Nasıl bir video oluşturmak istediğini anlat.',
  creacionTerminada: 'Bu içerik zaten tamamlandı ve yeniden yapılmaz. Oluşturduklarım bölümünde bulabilirsin.',
  tomaInvalida: 'Bu çekimin biçimi geçerli değil.',
  planoInvalido: 'Bu planın biçimi geçerli değil.',
  produccionNoEncontrada: 'Bu yapımı bulamadık.',
  tomaNoGenerable: 'Bu çekim bu şekilde oluşturulamaz.',
  creacionNoEncontrada: 'Bu içeriği bulamadık.',
  debesIniciarSesion: 'Giriş yapmalısın',
};
