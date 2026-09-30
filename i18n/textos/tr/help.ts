/*
 * TURCO — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La Ayuda CITA botones y opciones de otras pantallas, entre “…”, y tiene que decir lo mismo que
 * ellos: «Nasıl yaptım» (`wall.howIMadeIt`), «Promptu kopyala» (`wall.copyPrompt`), «Projeye
 * kaydet» (`weeai.saveToProject`), «Weëls» (`composer.kindWeel`: el singular «Weël» no se puede
 * escribir en turco sin que parezca Weë con un sufijo pegado) y «Bilmiyorum» (la opción 🤷 que
 * ofrece Weë Brain). El proyecto de ejemplo, «Restoranım», es el mismo que `projects.namePlaceholder`. Detrás de una cita el sufijo lo lleva un sustantivo, nunca las comillas:
 * «“Promptu kopyala” düğmesine». Las temáticas de comunidad (Cine & Animación…) aún no tienen
 * claves —viven en constants/communityCategories.ts— y van entre comillas, con «ve» en lugar de «&»
 * (guía § 5). Los especialistas se nombran como en el español, sin el prefijo Weë y sin traducir.
 * Las marcas solo llevan las terminaciones de la tabla de la guía (Weë'ye, Weë'nin, Weë AI'da) y
 * «Credits» ninguna: «Credits bakiyen». `askPrefill` conserva el espacio final: se pega delante de
 * lo que escriba la persona.
 */
export const help: typeof import('../es/help').help = {
  title: 'Yardım',
  intro: 'En sık sorulan soruların yanıtları burada. Anlaşılmayan bir şey olursa bize anlat: Weë, topluluğuyla birlikte gelişiyor.',
  faqTitle: 'Sık sorulan sorular',
  contact: 'İletişim',
  contactBody: 'Çok yakında buradan Weë ekibine doğrudan ulaşabileceksin. O zamana kadar fikirlerini ve yaşadığın sorunları bir gönderiyle paylaş: topluluk da ekip de okuyor.',
  askQuestion: 'Soru sor',
  legalTitle: 'Koşullar ve gizlilik',
  legalBody: 'Verilerin sana aittir. Weë, e-posta adresini ve profilini yalnızca uygulamanın çalışması için kullanır: giriş yapabilmen ve gönderilerini, Credits bakiyeni ve oluşturduklarını görebilmen için. Bilgilerini satmayız.',
  legalPending: 'Kullanım koşullarının tamamı ve gizlilik politikası, lansmandan önce wee.zone adresinde yayımlanacak. Weë hâlâ yapım aşamasında: bazı özellikler test verileriyle çalışıyor ve bunu, olduğu her yerde açıkça belirtiyoruz.',
  footer: 'Weë · World Encode Entity · sürüm 1.0.0',
  q1: 'Weë nedir?',
  a1: 'Weë (World Encode Entity), yapay zekâ ile bir şeyler oluşturan insanların sosyal ağıdır: burada keşfeder, öğrenir, oluşturur, paylaşır ve bağlantı kurarsın. Yapay zekâ işin motoru, topluluk ise kalbidir.',
  q2: 'Gerçek profil ile Weë profili arasındaki fark nedir?',
  a2: 'Gerçek profilin, her zamanki kimliğindir; onu kullanırken uygulama beyaz görünür. Weë profilin ise yapay zekâ ile oluşturmak için kullandığın kimliktir: oluşturduklarını paylaşmak için kendine ait bir avatarı ve adı vardır. Onu kullanırken uygulama koyu renge bürünür; böylece hangi kimlikle katıldığını her zaman bilirsin. İkisi arasında ☰ menüsünden ya da ekranın üstündeki düğmeden geçiş yapabilirsin.',
  q3: 'Weë AI nasıl çalışır?',
  a3: 'Ne elde etmek istediğini kendi kelimelerinle Weë\'ye anlat. Weë sana birkaç basit soru sorar (her zaman “Bilmiyorum” diyebilirsin), bir plan hazırlar ve sonucu oluşturur. Sonucu sen seçersin; yapay zekâyı Weë seçer. On uzman var: Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business ve Brain.',
  q4: 'Credits nedir?',
  a4: 'Weë AI ile oluşturduğun her içerik Credits harcar. Oluşturmadan önce ne kadar tutacağını görürsün; bir sorun çıkarsa Credits iade edilir. Weë AI geliştirme aşamasındayken fiyatlar test amaçlıdır ve bakiye yüklemek ücretsizdir: kesin fiyatlar, gerçek yapay zekâ modelleri devreye girdiğinde belli olacak.',
  q5: 'Projeler ne işe yarar?',
  a5: 'Bir proje, farklı uzmanlarla oluşturduğun içerikleri bir araya getirir: örneğin “Restoranım” için logo, fotoğraflar, reklam, video ve müzik. Her sonucu “Projeye kaydet” seçeneğiyle kendi projesine ekleyebilirsin.',
  q6: 'Weëls nedir?',
  a6: 'Oluşturduklarını göstermek için en fazla 15 saniyelik videolar. Weë dışında da paylaşılabilir ve üzerlerinde küçük bir Weë filigranı bulunur. + düğmesine dokunup “Weëls” seçeneğiyle oluşturabilirsin.',
  q7: 'Topluluklar nedir?',
  a7: 'Aynı ilgi alanını paylaşan insanların grupları: “Sinema ve animasyon”, “Sanat ve yaratıcılık”, “İş ve girişimcilik”, “Teknoloji ve yapay zekâ” ve daha fazlası. İlgini çekenlere katıl ve gönderilerini orada paylaş.',
  q8: 'WeeTalk nedir?',
  a8: 'Weë\'nin sohbet bölümüdür: topluluktaki diğer kişilerle yazı, fotoğraf ve sesli mesajla özel olarak sohbet edebilirsin.',
  q9: '“Nasıl yaptım” nedir?',
  a9: 'Paylaşım yaparken hangi araçları kullandığını, promptu ve süreci anlatabilirsin. Böylece “Promptu kopyala” düğmesine tek bir dokunuşla başkaları senden, sen de onlardan öğrenirsin.',
  heroTitle: 'Sana nasıl yardımcı olabiliriz?',
  legalVisibility: 'Paylaştıklarını topluluk görebilir; Weë AI\'da oluşturdukların ise sen paylaşmaya karar verene kadar gizli kalır. Gönderilerini ve projelerini istediğin zaman silebilirsin.',
  askPrefill: 'Weë\'ye bir sorum var: ',
};
