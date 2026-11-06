/*
 * INDONESIO — La Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El contenido de la Ayuda es interfaz y se traduce entero; los emojis y los nombres de Weë se copian.
 * Cita botones de otros módulos con su texto exacto en indonesio: «Tidak tahu», «Salin prompt»,
 * «Cara saya membuatnya», «Simpan ke proyek». El plural solo tiene «other»: `a3_one` y `a3_other`
 * son idénticas y llevan `{{contador}}`. Los temas de comunidades de `a7` siguen el catálogo de
 * temáticas (Film & Animasi, Seni & Kreativitas, Bisnis & Kewirausahaan, Teknologi & AI).
 */
export const help: typeof import('../es/help').help = {
  title: 'Bantuan',
  intro: 'Di sini ada jawaban untuk hal-hal yang paling umum. Jika ada yang belum jelas, beri tahu kami: Weë berkembang bersama komunitas.',
  faqTitle: 'Pertanyaan umum',
  contact: 'Kontak',
  contactBody: 'Segera Anda akan punya saluran langsung ke tim Weë di sini. Sementara itu, bagikan ide dan masalah Anda dalam sebuah postingan: komunitas dan tim membacanya.',
  askQuestion: 'Ajukan pertanyaan',
  legalTitle: 'Ketentuan dan privasi',
  legalBody: 'Data Anda adalah milik Anda. Weë memakai email dan profil Anda hanya agar aplikasi berfungsi: masuk, menampilkan postingan, Credits, dan karya Anda. Kami tidak menjual informasi Anda.',
  legalPending: 'Ketentuan lengkap dan kebijakan privasi akan diterbitkan di wee.zone sebelum peluncuran. Weë masih dalam pembangunan: beberapa fitur memakai data uji coba dan kami menyatakannya dengan jelas di tempat hal itu terjadi.',
  footer: 'Weë · World Encode Entity · versi 1.0.0',
  q1: 'Apa itu Weë?',
  a1: 'Weë (World Encode Entity) adalah jejaring sosial bagi orang-orang yang berkarya dengan Kecerdasan Buatan: di sini Anda menemukan, belajar, berkarya, berbagi, dan terhubung. AI adalah mesinnya; komunitas adalah jantungnya.',
  q2: 'Apa bedanya Profil Asli dan Profil Weë?',
  a2: 'Profil Asli adalah identitas Anda sehari-hari, dan aplikasi tampil putih. Profil Weë adalah identitas Anda untuk berkarya dengan AI: avatar dan nama tersendiri untuk menerbitkan karya Anda, dan dengannya aplikasi berganti gelap agar Anda selalu tahu sebagai siapa Anda berpartisipasi. Anda berpindah dari satu ke yang lain lewat menu ☰ atau tombol di header.',
  q3: 'Bagaimana cara kerja Weë AI?',
  a3_one: 'Ceritakan kepada Weë apa yang ingin Anda capai dengan kata-kata Anda sendiri. Weë mengajukan beberapa pertanyaan sederhana (Anda selalu dapat menjawab "Tidak tahu"), menyusun rencana, dan membuat hasilnya. Anda memilih hasilnya; Weë memilih AI-nya. Weë AI memiliki {{contador}} spesialis: {{lista}}.',
  a3_other: 'Ceritakan kepada Weë apa yang ingin Anda capai dengan kata-kata Anda sendiri. Weë mengajukan beberapa pertanyaan sederhana (Anda selalu dapat menjawab "Tidak tahu"), menyusun rencana, dan membuat hasilnya. Anda memilih hasilnya; Weë memilih AI-nya. Weë AI memiliki {{contador}} spesialis: {{lista}}.',
  q4: 'Apa itu Credits?',
  a4: 'Setiap karya dengan Weë AI memakai Credits. Sebelum membuat, Anda melihat berapa biayanya dan, jika ada yang gagal, biayanya dikembalikan. Selama kami membangun Weë AI, harganya masih uji coba dan isi ulang tidak dipungut biaya: harga final akan hadir bersama AI sungguhan.',
  q5: 'Untuk apa proyek?',
  a5: 'Sebuah proyek mengelompokkan karya dari berbagai spesialis: logo, foto, iklan, video, dan musik "Restoran Saya", misalnya. Simpan setiap hasil ke proyeknya lewat "Simpan ke proyek".',
  q6: 'Apa itu Weëls?',
  a6: 'Video hingga 15 detik untuk menunjukkan apa yang Anda buat. Dapat dibagikan ke luar Weë dan membawa tanda kecil Weë. Anda membuatnya dari tombol + dengan memilih "Weël".',
  q7: 'Apa itu komunitas?',
  a7: 'Kelompok orang dengan minat yang sama: Film & Animasi, Seni & Kreativitas, Bisnis & Kewirausahaan, Teknologi & AI, dan lainnya. Bergabunglah dengan yang menarik bagi Anda dan posting di sana.',
  q8: 'Apa itu WeeTalk?',
  a8: 'Ini obrolan Weë: percakapan privat dengan orang lain di komunitas, dengan teks, foto, dan pesan suara.',
  q9: 'Apa itu "Cara saya membuatnya"?',
  a9: 'Saat menerbitkan, Anda dapat menceritakan alat yang dipakai, prompt, dan prosesnya. Dengan begitu orang lain belajar dari Anda, dan Anda dari mereka, cukup dengan satu ketukan di "Salin prompt".',
  heroTitle: 'Apa yang dapat kami bantu?',
  legalVisibility: 'Apa yang Anda terbitkan terlihat oleh komunitas; apa yang Anda buat di Weë AI bersifat privat sampai Anda memutuskan untuk menerbitkannya. Anda dapat menghapus postingan dan proyek Anda kapan saja.',
  askPrefill: 'Pertanyaan untuk Weë: ',
};
