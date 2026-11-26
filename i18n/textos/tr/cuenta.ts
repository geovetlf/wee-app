/*
 * TURCO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Senli hitap («sen»), «hesap» como en auth, «karakter» para el personaje; los sufijos van tras apóstrofo, nunca pegados a una marca.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Hesabı sil',
  sectionDanger: 'Tehlikeli bölge',
  title: 'Hesabı sil',
  goesFaces: 'Tüm profillerin: Gerçek profilin ve alter egoların',
  goesCharacter: 'Karakterin ve avatarı',
  goesPosts: 'Gönderilerin, yorumların ve tepkilerin',
  goesMessages: 'WeeTalk mesajların: içleri boşaltılır ve karşı tarafın sohbetinde artık görünmezler',
  goesCreations: 'Weë AI\'daki oluşturdukların, projelerin ve sohbetlerin',
  goesContacts: 'Kişilerin, toplulukların ve kaydettiklerin',
  goesCredits: 'Kalan Credits: kaybolur ve iade edilmez',
  whatStaysTitle: 'Neler saklanır',
  staysRecords: 'Credits ve ödemelerin muhasebe kayıtları. Adın ve profil bilgilerin olmadan saklanır, çünkü bunlar Weë\'nin muhasebesidir.',
  confirmLabel: 'Onaylamak için “{{palabra}}” yaz',
  confirmWord: 'SİL',
  confirmPlaceholder: 'Kelimeyi buraya yaz',
  dialogTitle: 'Hesabın silinsin mi?',
  dialogConfirm: 'Sil',
  doneTitle: 'Hesabın silindi',
  doneBody: 'Weë\'nin bir parçası olduğun için teşekkürler.',
  reauthTitle: 'Yeniden giriş yap',
  reauthBody: 'Güvenliğin için hesabını silmeden önce yakın zamanda giriş yapmış olman gerekir. Çıkış yap, yeniden giriş yap ve bu adımları tekrarla.',
  reauthButton: 'Yeniden girmek için çıkış yap',
  errorTitle: 'Tamamlanamadı',
  errorBody: 'Yarı yolda bir şey ters gitti. Yeniden dene: kaldığı yerden devam edecek.',
  retry: 'Yeniden dene',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Devre dışı bırakılır ve 30 gün sonra her şey silinir',
  introDesactivar: 'Hesabın şimdi devre dışı bırakılır ve 30 gün içinde geri dönmezsen her şey kalıcı olarak silinir.',
  nowTitle: 'Şimdi ne olacak',
  nowHidden: 'Hesabın artık görünmez: kimse profillerini ya da gönderilerini görmez',
  nowCharacterOff: 'Karakterinin özerkliği kapanır ve ücret alınması durur',
  nowComeBack_one: 'Geri dönmek için {{contador}} günün var: yeniden giriş yap ve “Hesabı etkinleştir” seçeneğini seç',
  nowComeBack_other: 'Geri dönmek için {{contador}} günün var: yeniden giriş yap ve “Hesabı etkinleştir” seçeneğini seç',
  whatGoesLaterTitle: 'Geri dönmezsen neler silinir',
  deactivateButton: 'Hesabımı sil',
  dialogBodyDesactivar: 'Hesabın artık görünmeyecek. 30 gün içinde geri dönmezsen her şey silinecek ve geri getiremeyeceksin.',
  deactivating: 'Hesabın devre dışı bırakılıyor…',
  deactivatedTitle: 'Hesabın devre dışı',
  deactivatedBody: 'Geri dönmek için son tarih: {{fecha}}. Sonrasında her şey kalıcı olarak silinecek.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Hesabın devre dışı',
  activarBody: 'Hesabının silinmesini istedin. Devre dışı olduğu sürece kimse profillerini ya da gönderilerini görmez.',
  activarDaysLeft_one: 'Kalıcı silinmeye {{contador}} gün kaldı',
  activarDaysLeft_other: 'Kalıcı silinmeye {{contador}} gün kaldı',
  activarDate: 'Etkinleştirmezsen şu tarihte kalıcı olarak silinecek: {{fecha}}.',
  activarCharacterNote: 'Karakterinin özerkliği kapalı kalacak; istediğin zaman yeniden planlayabilirsin.',
  activarButton: 'Hesabı etkinleştir',
  activating: 'Hesabın etkinleştiriliyor…',
  activatedTitle: 'Hesabın yeniden etkin',
  activarExpiredTitle: 'Geri dönme süresi doldu',
  activarExpiredBody: 'Hesabın önümüzdeki saatlerde tamamen silinecek.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Kalan {{creditos}} Credits: kaybolur ve iade edilmez',
};
