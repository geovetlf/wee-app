/*
 * TURCO — Lo que describe cada experiencia de WEË AI y los ejemplos que se tocan
 * para empezar. Los nombres —Weë Design, Weë Studio…— son marca y viven en
 * constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las descripciones son listas cortas en singular, como se escriben en turco las
 * categorías («Logo, afiş, illüstrasyon…»). Los ejemplos hablan con la voz de la
 * persona, como el «No sé» del español: «Bugün ne pişirsem bilemedim», «Metnimi
 * düzelt». Se adaptan donde el calco no serviría: el «patio» es el balcón («Balkonumda
 * küçük bir bahçe»), que es lo que tiene quien vive en una ciudad turca; «música de
 * fondo» es «fon müziği» y el CV, «özgeçmiş». Los meses van en minúscula y sin
 * apóstrofo («Ekim ayında Japonya»). Un Weël es «Weëls videosu» (guía § 10.2).
 *
 * Las áreas se traducen porque se leen; la marca de delante no: «Weë Studio ·
 * Fotoğraflar», «Weë Studio · Güzellik» (el «Beauty» del español es el nombre del
 * área, no la marca Weë Beauty) y «Weë Design · Ev ve tasarım», con «ve» en lugar
 * de «&» (guía § 5). `tellTheSpecialist` no puede decir «cuéntale a {{especialista}}»
 * sin pegarle un sufijo al hueco, así que el especialista pasa a ser el sujeto de la
 * frase siguiente (guía § 4).
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'Logo, afiş, illüstrasyon ve sosyal medya görselleri',
  studio: 'Yapay zekâyla fotoğraf ve video oluştur, dönüştür.',
  photo: 'Fotoğraflarını iyileştir, restore et ve dönüştür',
  writer: 'Gönderi, hikâye, senaryo, e-posta ve kitap',
  music: 'Şarkı, enstrümantal müzik, vokal ve seslendirme',
  beauty: 'Makyaj, saç, sakal, kombin ve tarz değişikliği',
  chef: 'Kişisel şefin: tarifler, menüler ve bugün ne pişireceğin',
  home: 'Dekorasyon, iç mimari, tadilat ve bahçe',
  business: 'İş fikri, pazarlama, özgeçmiş, belge ve sunum',
  travel: 'Seyahatini planla: nereye gidilir, ne yapılır, nasıl dolaşılır',
  brain: 'Nerede arayacağını bilmiyor musun? Weë\'ye sor',
  designEx1: 'İşletmem için bir logo',
  designEx2: 'Instagram için bir gönderi',
  designEx3: 'Kitabımın kapağı',
  studioEx1: 'Restoranımı tanıtan bir video',
  studioEx2: 'Fotoğrafımı videoya dönüştür',
  studioEx3: 'Ürünüm için bir Weëls videosu',
  photoEx1: 'Bir fotoğrafın kalitesini artır',
  photoEx2: 'Fotoğraftaki fazlalığı kaldır',
  photoEx3: 'Fotoğrafımın arka planını değiştir',
  writerEx1: 'Videom için bir senaryo',
  writerEx2: 'Müşterime bir e-posta',
  writerEx3: 'Metnimi düzelt',
  musicEx1: 'Markam için bir jingle',
  musicEx2: 'Videom için fon müziği',
  musicEx3: 'Metnimi seslendir',
  beautyEx1: 'Uzun saçla nasıl görünürdüm',
  beautyEx2: 'Parti için bir görünüm',
  beautyEx3: 'Başka bir saç rengi dene',
  chefEx1: 'Evdeki malzemelerle bir tarif',
  chefEx2: 'Sağlıklı bir haftalık menü',
  chefEx3: 'Bugün ne pişirsem bilemedim',
  homeEx1: 'Salonum başka bir tarzda nasıl görünürdü',
  homeEx2: 'Odam için dekorasyon fikirleri',
  homeEx3: 'Balkonumda küçük bir bahçe',
  businessEx1: 'Girişimim için bir iş planı',
  businessEx2: 'Özgeçmişimi güncelle',
  businessEx3: 'Yatırımcılar için bir sunum',
  travelEx1: 'Ekim ayında Japonya',
  travelEx2: 'Sakin ve ucuz bir plaj istiyorum',
  travelEx3: 'Nereye gideceğime karar veremedim',
  brainEx1: 'Nereden başlayacağımı bilmiyorum',
  brainEx2: 'Bunu bana basitçe anlat',
  brainEx3: 'Bu metni çevir',
  areaStudioPhotos: 'Weë Studio · Fotoğraflar',
  areaStudioVideos: 'Weë Studio · Videolar',
  areaStudioBeauty: 'Weë Studio · Güzellik',
  areaDesignHome: 'Weë Design · Ev ve tasarım',
  areaHomeName: 'Ev ve tasarım',
  tellTheSpecialist: 'Ne istediğini anlat: {{especialista}} sana iki üç basit soru sorar ve gerisini halleder. Sonra doğrudan topluluğunda paylaşırsın.',
  exampleQuoted: '“{{ejemplo}}”',
};
