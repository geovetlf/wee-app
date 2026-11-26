/*
 * TURCO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}` y `{{voz}}` son adjetivos delante de «bir tonla» y «sesle» (`Kadın`, `Erkek`, `Nötr`: «kadın sesiyle»).
 * `{{idioma}}` va como etiqueta. `{{cambio}}` llega indefinido y sin caso («bir makyaj deneyeceğim»), y `{{ocasion}}`
 * delante de «için». Un paso de `Weë Music` lleva `'ten`, la terminación admitida por la guía § 9.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Konuyla ilgili gerçek alıntılar bulacağım ve kontrol edebilmen için her birinin kaynağını ekleyeceğim.',
  writerPasoCitas: 'Alıntı ve kaynak araması',

  writerExplicaTraducir: 'Metnini anlamını ve tonunu koruyarak çevireceğim. Hedef dil: {{idioma}}.',
  writerPasoTraducir: 'Çeviri: {{idioma}}',
  writerDecisionIdiomaIngles: 'İngilizceye çeviriyorum',
  writerIdiomaEn: 'İngilizce',
  writerIdiomaPt: 'Portekizce',
  writerIdiomaFr: 'Fransızca',
  writerIdiomaIt: 'İtalyanca',

  writerExplicaResumir: 'Metnini birkaç satırda ana fikirleriyle özetleyeceğim.',
  writerPasoResumir: 'Ana fikirlerle özet',
  writerExplicaCorregir: 'Anlatmak istediğini değiştirmeden yazımı, üslubu ve anlaşılırlığı düzelteceğim.',
  writerPasoCorregir: 'Yazım, üslup ve anlaşılırlık düzeltmesi',
  writerExplicaIdeas: 'Tıkanmadan yazabilmen için birkaç fikir ve bir başlangıç noktası önereceğim.',
  writerPasoIdeas: 'Yazı fikirleri önerisi',

  writerExplicaPortada: 'Kapağın konseptini belirleyeceğim ve seçebilmen için üç öneri oluşturacağım.',
  writerPasoConceptoPortada: 'Kapak konsepti belirleme',
  writerPasoPropuestasPortada: '3 kapak önerisi oluşturma',

  writerExplicaReescribir: 'Metnini fikrini koruyarak {{tono}} bir tonla yeniden yazacağım.',
  writerPasoReescribir: 'Metni yeniden yazım',
  writerExplicaCv: 'CV\'ni {{tono}} bir tonla hazırlayacağım: editörde kullanmaya ve göndermeye hazır.',
  writerPasoCv: 'CV hazırlama',

  writerExplicaPublicacion: 'Gönderiyi {{tono}} bir tonla yazacağım, sonra hazır olması için son rötuşları yapacağım.',
  writerExplicaHistoria: 'Hikâyeyi {{tono}} bir tonla yazacağım, sonra hazır olması için son rötuşları yapacağım.',
  writerExplicaGuion: 'Senaryoyu {{tono}} bir tonla yazacağım, sonra hazır olması için son rötuşları yapacağım.',
  writerExplicaArticulo: 'Makaleyi {{tono}} bir tonla yazacağım, sonra hazır olması için son rötuşları yapacağım.',
  writerExplicaEmail: 'E-postayı {{tono}} bir tonla yazacağım, sonra hazır olması için son rötuşları yapacağım.',
  writerExplicaDocumento: 'Belgeyi {{tono}} bir tonla hazırlayacağım, sonra hazır olması için son rötuşları yapacağım.',
  writerPasoPublicacion: 'Gönderi yazımı',
  writerPasoHistoria: 'Hikâye yazımı',
  writerPasoGuion: 'Senaryo yazımı',
  writerPasoArticulo: 'Makale yazımı',
  writerPasoEmail: 'E-posta yazımı',
  writerPasoDocumento: 'Belge hazırlama',
  writerPasoPulir: 'Son rötuşlar',

  writerDecisionEmpiezoPublicacion: 'bir gönderiyle başlıyorum',
  writerDecisionTonoCercano: 'samimi bir ton kullanıyorum',
  writerDecisionTonoProfesional: 'profesyonel bir ton kullanıyorum',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Metni hazırlayıp {{voz}} sesiyle kaydedeceğim.',
  musicExplicaVozCalida: 'Metni hazırlayıp sıcak ve net bir sesle kaydedeceğim.',
  musicPasoTextoNarracion: 'Seslendirme metni hazırlama',
  musicPasoGrabarVoz: 'Ses kaydı',

  musicExplicaLetra: 'Şarkı sözlerinin tamamını yazacağım. Stil: {{estilo}}.',
  musicPasoLetraCompleta: 'Şarkı sözlerinin tamamının yazımı',

  musicExplicaMezcla: 'Şarkını dinleyeceğim, profesyonel bir ses için miks ve mastering yapacağım.',
  musicPasoAnotarMezcla: 'Şarkıyı dinleme ve miks notları',
  musicPasoMasterizar: 'Miks ve mastering',

  musicExplicaVideoclip: 'Şarkıyı ({{estilo}}, {{animo}}) ve sahneleri oluşturup klibini baştan sona hazırlayacağım. Weë Music\'ten çıkman gerekmiyor.',
  musicPasoIdeaYLetra: 'Fikir ve şarkı sözü yazımı',
  musicPasoEscenas: 'Klip sahneleri oluşturma',
  musicPasoArmarVideoclip: 'Şarkıyla klip kurgusu',

  musicExplicaJingle: 'Kısa ve akılda kalıcı bir jingle oluşturacağım. Stil: {{estilo}}, hava: {{animo}}.',
  musicPasoFraseJingle: 'Jingle sözü yazımı',
  musicPasoJingle: 'Jingle oluşturma',
  musicExplicaBeat: 'Bir beat oluşturacağım. Stil: {{estilo}}, hava: {{animo}}.',
  musicPasoIdeaMusical: 'Müzik fikri belirleme',
  musicPasoBeat: 'Beat oluşturma',

  musicExplicaCancion: 'Şarkı sözlerini yazacağım, şarkıyı oluşturacağım ve kapağını tasarlayacağım. Stil: {{estilo}}, hava: {{animo}}.',
  musicPasoLetra: 'Şarkı sözü yazımı',
  musicPasoCancion: 'Şarkı oluşturma',
  musicPasoPortada: 'Kapak tasarımı',

  musicDecisionEmpiezoCancion: 'bir şarkıyla başlıyorum',
  musicDecisionEstiloPop: 'pop stilini seçtim',
  musicDecisionAnimoAlegre: 'neşeli bir hava seçtim',
  musicDecisionVozCalida: 'sıcak ve net bir ses seçtim',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Fotoğrafına bakıp kolay bulunan ürünlerle sade bir cilt bakımı rutini hazırlayacağım.',
  beautyPasoRutina: 'Bakım rutini hazırlama',

  beautyExplicaRostro: 'Yüzüne bakacağım, sana en çok yakışan kesim ve stilleri önereceğim, ikisini fotoğrafında deneyeceğim.',
  beautyPasoMirarRostro: 'Yüz incelemesi',
  beautyPasoRecomendar: 'Kesim, gözlük ve stil önerileri',
  beautyPasoProbarDosEstilos: 'En çok yakışan iki stilin denenmesi',

  beautyExplicaProbar: '{{ocasion}} için {{cambio}} deneyeceğim: yüzünü, cildini ve fotoğrafın ışığını koruyarak iki versiyon.',
  beautyPasoProbar: '{{cambio}} denemesi (yüz korunarak)',
  beautyOcasionElDiaADia: 'günlük hayat',

  beautyDecisionCambioCompleto: 'baştan sona yeni bir görünüm öneriyorum',
  beautyDecisionOcasionDiaADia: 'günlük hayat için düşündüm',
};
