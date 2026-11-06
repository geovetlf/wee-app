/*
 * INDONESIO — el alta guiada y la creación del Perfil Weë: quién eres, y quién
 * eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Perfil Weë» es «Profil Weë» (guía § 4). El día del selector de fecha es
 * «Tanggal», que es como lo etiquetan los formularios indonesios («Hari» sería
 * el día de la semana). El ejemplo inventado de nombre anónimo se traduce como
 * ejemplo («BayanganGelap»); «Anon123» se queda. El nombre, la biografía y el
 * país que elige la persona no están aquí.
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Selamat datang di Weë',
  welcomeSubtitle: 'Ceritakan siapa Anda. Setelah itu Anda bisa membuat Profil Weë: identitas Anda untuk berkarya dengan AI.',
  yourName: 'Nama Anda',
  yourNameHint: 'Nama ini akan ditampilkan di profil publik Anda.',
  yourNamePlaceholder: 'Nama lengkap Anda',
  birthDate: 'Tanggal lahir',
  birthDateHint: 'Anda harus berusia minimal 13 tahun untuk menggunakan Weë.',
  gender: 'Jenis kelamin',
  genderMale: 'Laki-laki',
  genderFemale: 'Perempuan',
  genderOther: 'Lainnya',
  country: 'Negara',
  pickCountry: 'Pilih negara Anda',
  searchCountry: 'Cari negara...',
  customiseProfile: 'Sesuaikan profil Anda',
  yourAvatar: 'Avatar Anda',
  yourAvatarHint: 'Ketuk untuk memilih avatar bawaan atau mengunggah gambar Anda sendiri',
  bioPlaceholder: 'Ceritakan sedikit tentang Anda... (opsional)',
  saving: 'Menyimpan...',
  completed: 'Selesai!',
  complete: 'Selesaikan',
  continueStep: 'Lanjutkan',
  nameMissingTitle: 'Nama Anda belum diisi',
  nameMissing: 'Tulis nama Anda untuk melanjutkan.',
  nameShortTitle: 'Nama terlalu pendek',
  nameShort: 'Nama Anda harus terdiri dari minimal 2 huruf.',
  birthMissingTitle: 'Tanggal lahir belum diisi',
  birthMissing: 'Pilih tanggal, bulan, dan tahun.',
  genderMissingTitle: 'Jenis kelamin belum diisi',
  genderMissing: 'Pilih salah satu opsi untuk melanjutkan.',
  countryMissingTitle: 'Negara belum diisi',
  countryMissing: 'Pilih negara Anda untuk melanjutkan.',
  saveFailedTitle: 'Kami tidak dapat menyimpan profil Anda',
  saveFailed: 'Coba lagi.',
  weeTitle: 'Buat Profil Weë',
  weeIntro: 'Profil ini terpisah dari identitas asli Anda. Postingan dan tindakan yang Anda lakukan dengan Weë tidak akan terhubung ke profil utama Anda.',
  weePhoto: 'Foto profil',
  weePhotoHint: 'Ketuk untuk memilih foto atau avatar bawaan',
  weeName: 'Nama anonim',
  weeNamePlaceholder: 'Mis.: BayanganGelap, Anon123...',
  weeBioPlaceholder: 'Gambarkan alter ego Anda...',
  weeCreatedTitle: 'Profil Weë dibuat',
  weeCreated: 'Identitas anonim Anda sudah siap. Anda bisa berganti profil dari header.',
  weeCreateFailed: 'Profil Weë tidak dapat dibuat',
  birthDay: 'Tanggal',
  birthMonth: 'Bulan',
  birthYear: 'Tahun',
  stepOf: 'Langkah {{paso}} dari {{total}}',
  customiseProfileHint: 'Pilih avatar dan tambahkan deskripsi (opsional)',
  bioLabel: 'Deskripsi (opsional)',
  weeNameCounter: '{{usados}}/{{maximo}} - Minimal {{minimo}} karakter',
  weeBio: 'Bio (opsional)',
};
