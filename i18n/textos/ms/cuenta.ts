/*
 * BAHASA MELAYU — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Sapaan «anda» (huruf kecil), seperti seluruh kamus. «encargo» = «permintaan».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Padam akaun',
  sectionDanger: 'Zon bahaya',
  title: 'Padam akaun',
  goesFaces: 'Semua profil anda: Profil Sebenar dan alter ego anda',
  goesCharacter: 'Watak anda dan avatarnya',
  goesPosts: 'Siaran, ulasan dan reaksi anda',
  goesMessages: 'Mesej WeeTalk anda: kandungannya dikosongkan, dan perbualan orang lain kekal tanpanya',
  goesCreations: 'Ciptaan, projek dan perbualan Weë AI anda',
  goesContacts: 'Kenalan, komuniti dan simpanan anda',
  goesCredits: 'Baki Credits anda: hilang dan tidak dikembalikan',
  whatStaysTitle: 'Apa yang disimpan',
  staysRecords: 'Rekod perakaunan Credits dan pembayaran. Ia disimpan tanpa nama anda atau butiran profil anda, kerana ia adalah perakaunan Weë.',
  confirmLabel: 'Untuk mengesahkan, taip "{{palabra}}"',
  confirmWord: 'PADAM',
  confirmPlaceholder: 'Taip perkataan di sini',
  dialogTitle: 'Padam akaun anda?',
  dialogConfirm: 'Padam',
  doneTitle: 'Akaun anda telah dipadam',
  doneBody: 'Terima kasih kerana pernah menjadi sebahagian daripada Weë.',
  reauthTitle: 'Log masuk semula',
  reauthBody: 'Demi keselamatan, untuk memadam akaun anda mesti log masuk baru-baru ini. Log keluar, log masuk semula dan ulang langkah ini.',
  reauthButton: 'Log keluar untuk log masuk semula',
  errorTitle: 'Tidak dapat diselesaikan',
  errorBody: 'Sesuatu gagal di pertengahan jalan. Cuba lagi: ia akan disambung dari tempat ia berhenti.',
  retry: 'Cuba lagi',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Akaun dinyahaktifkan dan, selepas 30 hari, semuanya dipadam',
  introDesactivar: 'Akaun anda dinyahaktifkan sekarang dan, jika anda tidak kembali dalam 30 hari, semuanya dipadam buat selama-lamanya.',
  nowTitle: 'Apa yang berlaku sekarang',
  nowHidden: 'Akaun anda tidak lagi kelihatan: tiada sesiapa akan melihat profil atau siaran anda',
  nowCharacterOff: 'Autonomi watak anda dimatikan dan tidak lagi dicaj',
  nowComeBack_one: 'Anda ada {{contador}} hari untuk kembali: log masuk semula dan pilih "Aktifkan akaun"',
  nowComeBack_other: 'Anda ada {{contador}} hari untuk kembali: log masuk semula dan pilih "Aktifkan akaun"',
  whatGoesLaterTitle: 'Apa yang dipadam jika anda tidak kembali',
  deactivateButton: 'Padam akaun saya',
  dialogBodyDesactivar: 'Akaun anda tidak akan kelihatan lagi. Jika anda tidak kembali dalam 30 hari, semuanya akan dipadam dan anda tidak dapat mendapatkannya semula.',
  deactivating: 'Menyahaktifkan akaun anda…',
  deactivatedTitle: 'Akaun anda telah dinyahaktifkan',
  deactivatedBody: 'Anda ada masa sehingga {{fecha}} untuk kembali. Selepas itu, semuanya akan dipadam buat selama-lamanya.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Akaun anda telah dinyahaktifkan',
  activarBody: 'Anda meminta untuk memadam akaun anda. Selagi ia dinyahaktifkan, tiada sesiapa dapat melihat profil atau siaran anda.',
  activarDaysLeft_one: 'Tinggal {{contador}} hari sebelum pemadaman kekal',
  activarDaysLeft_other: 'Tinggal {{contador}} hari sebelum pemadaman kekal',
  activarDate: 'Jika anda tidak mengaktifkannya, ia akan dipadam buat selama-lamanya pada {{fecha}}.',
  activarCharacterNote: 'Autonomi watak anda akan kekal dimatikan; anda boleh menjadualkannya semula bila-bila masa.',
  activarButton: 'Aktifkan akaun',
  activating: 'Mengaktifkan akaun anda…',
  activatedTitle: 'Akaun anda aktif semula',
  activarExpiredTitle: 'Tempoh untuk kembali telah tamat',
  activarExpiredBody: 'Akaun anda akan dipadam sepenuhnya dalam beberapa jam akan datang.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Baki {{creditos}} Credits anda: hilang dan tidak dikembalikan',
};
