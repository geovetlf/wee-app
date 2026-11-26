/*
 * HINDI — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * El tono entra delante de «टोन», el género delante de «स्टाइल», el ánimo delante de «मूड» y la voz delante de «आवाज़»:
 * las etiquetas son invariables y no piden caso. Lo que se prueba en Beauty va detrás de dos puntos. El videoclip es
 * «गाने का वीडियो» y la letra, «बोल» (m pl), como en `catalogo`.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'मैं इस विषय पर असली उद्धरण खोजूँगा और हर एक का स्रोत दूँगा, ताकि आप उन्हें जाँच सकें.',
  writerPasoCitas: 'उद्धरण और उनके स्रोत खोजें',

  writerExplicaTraducir: 'मैं आपके टेक्स्ट का {{idioma}} में अनुवाद करूँगा, उसका मतलब और टोन वैसा ही रखते हुए.',
  writerPasoTraducir: '{{idioma}} में अनुवाद करें',
  writerDecisionIdiomaIngles: 'मैं इसका अंग्रेज़ी में अनुवाद करूँगा',
  writerIdiomaEn: 'अंग्रेज़ी',
  writerIdiomaPt: 'पुर्तगाली',
  writerIdiomaFr: 'फ़्रेंच',
  writerIdiomaIt: 'इतालवी',

  writerExplicaResumir: 'मैं आपके टेक्स्ट की मुख्य बातों का कुछ ही पंक्तियों में सारांश बनाऊँगा.',
  writerPasoResumir: 'मुख्य बातों का सारांश बनाएँ',
  writerExplicaCorregir: 'मैं वर्तनी सुधारूँगा और स्टाइल और स्पष्टता बेहतर करूँगा, आपकी बात को बदले बिना.',
  writerPasoCorregir: 'वर्तनी, स्टाइल और स्पष्टता सुधारें',
  writerExplicaIdeas: 'मैं कुछ आइडिया और शुरुआत के लिए एक दिशा सुझाऊँगा, ताकि लिखते समय आप अटकें नहीं.',
  writerPasoIdeas: 'आपके लेखन के लिए आइडिया सुझाएँ',

  writerExplicaPortada: 'मैं कवर का कॉन्सेप्ट तय करूँगा और तीन डिज़ाइन बनाऊँगा, ताकि आप उनमें से चुन सकें.',
  writerPasoConceptoPortada: 'कवर का कॉन्सेप्ट तय करें',
  writerPasoPropuestasPortada: 'कवर के 3 डिज़ाइन बनाएँ',

  writerExplicaReescribir: 'मैं आपका टेक्स्ट {{tono}} टोन में दोबारा लिखूँगा, उसका आइडिया वैसा ही रखते हुए.',
  writerPasoReescribir: 'टेक्स्ट दोबारा लिखें',
  writerExplicaCv: 'मैं आपका CV {{tono}} टोन में लिखूँगा, एडिटर में खोलने और भेजने के लिए तैयार.',
  writerPasoCv: 'आपका CV लिखें',

  writerExplicaPublicacion: 'मैं पोस्ट {{tono}} टोन में लिखूँगा और फिर उसे निखारकर तैयार करूँगा.',
  writerExplicaHistoria: 'मैं कहानी {{tono}} टोन में लिखूँगा और फिर उसे निखारकर तैयार करूँगा.',
  writerExplicaGuion: 'मैं स्क्रिप्ट {{tono}} टोन में लिखूँगा और फिर उसे निखारकर तैयार करूँगा.',
  writerExplicaArticulo: 'मैं लेख {{tono}} टोन में लिखूँगा और फिर उसे निखारकर तैयार करूँगा.',
  writerExplicaEmail: 'मैं ईमेल {{tono}} टोन में लिखूँगा और फिर उसे निखारकर तैयार करूँगा.',
  writerExplicaDocumento: 'मैं दस्तावेज़ {{tono}} टोन में लिखूँगा और फिर उसे निखारकर तैयार करूँगा.',
  writerPasoPublicacion: 'पोस्ट लिखें',
  writerPasoHistoria: 'कहानी लिखें',
  writerPasoGuion: 'स्क्रिप्ट लिखें',
  writerPasoArticulo: 'लेख लिखें',
  writerPasoEmail: 'ईमेल लिखें',
  writerPasoDocumento: 'दस्तावेज़ लिखें',
  writerPasoPulir: 'टेक्स्ट निखारकर तैयार करें',

  writerDecisionEmpiezoPublicacion: 'मैं एक पोस्ट से शुरू करूँगा',
  writerDecisionTonoCercano: 'मैं दोस्ताना टोन रखूँगा',
  writerDecisionTonoProfesional: 'मैं प्रोफ़ेशनल टोन रखूँगा',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'मैं टेक्स्ट तैयार करूँगा और उसे {{voz}} आवाज़ में रिकॉर्ड करूँगा.',
  musicExplicaVozCalida: 'मैं टेक्स्ट तैयार करूँगा और उसे गर्मजोशी भरी, साफ़ आवाज़ में रिकॉर्ड करूँगा.',
  musicPasoTextoNarracion: 'नरेशन का टेक्स्ट तैयार करें',
  musicPasoGrabarVoz: 'आवाज़ रिकॉर्ड करें',

  musicExplicaLetra: 'मैं {{estilo}} स्टाइल में गाने के पूरे बोल लिखूँगा.',
  musicPasoLetraCompleta: 'गाने के पूरे बोल लिखें',

  musicExplicaMezcla: 'मैं आपका गाना सुनूँगा, फिर उसकी मिक्सिंग और मास्टरिंग करूँगा, ताकि वह प्रोफ़ेशनल लगे.',
  musicPasoAnotarMezcla: 'आपका गाना सुनकर मिक्सिंग प्लान करें',
  musicPasoMasterizar: 'मिक्सिंग और मास्टरिंग करें',

  musicExplicaVideoclip: 'मैं गाना ({{estilo}}, {{animo}}) और उसके सीन बनाऊँगा और गाने का पूरा वीडियो तैयार करूँगा. आपको Weë Music से बाहर नहीं जाना होगा.',
  musicPasoIdeaYLetra: 'आइडिया और बोल लिखें',
  musicPasoEscenas: 'गाने के वीडियो के सीन बनाएँ',
  musicPasoArmarVideoclip: 'आपके गाने के साथ वीडियो तैयार करें',

  musicExplicaJingle: 'मैं {{estilo}} स्टाइल और {{animo}} मूड में एक छोटा, ज़बान पर चढ़ने वाला जिंगल बनाऊँगा.',
  musicPasoFraseJingle: 'जिंगल की मुख्य लाइन लिखें',
  musicPasoJingle: 'जिंगल बनाएँ',
  musicExplicaBeat: 'मैं {{estilo}} स्टाइल और {{animo}} मूड में एक बीट बनाऊँगा.',
  musicPasoIdeaMusical: 'संगीत का आइडिया तय करें',
  musicPasoBeat: 'बीट बनाएँ',

  musicExplicaCancion: 'मैं बोल लिखूँगा, {{estilo}} स्टाइल और {{animo}} मूड में गाना बनाऊँगा और उसका कवर डिज़ाइन करूँगा.',
  musicPasoLetra: 'बोल लिखें',
  musicPasoCancion: 'गाना बनाएँ',
  musicPasoPortada: 'कवर डिज़ाइन करें',

  musicDecisionEmpiezoCancion: 'मैं एक गाने से शुरू करूँगा',
  musicDecisionEstiloPop: 'मैंने पॉप चुना',
  musicDecisionAnimoAlegre: 'मैंने खुशनुमा मूड चुना',
  musicDecisionVozCalida: 'मैंने गर्मजोशी भरी, साफ़ आवाज़ चुनी',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'मैं आपकी फ़ोटो देखूँगा और त्वचा की देखभाल का एक आसान रूटीन बनाऊँगा, ऐसे प्रोडक्ट के साथ जो आसानी से मिल जाएँ.',
  beautyPasoRutina: 'त्वचा की देखभाल का आपका रूटीन बनाएँ',

  beautyExplicaRostro: 'मैं आपका चेहरा देखूँगा, आप पर सबसे अच्छे लगने वाले हेयरकट और स्टाइल बताऊँगा और उनमें से दो आपकी फ़ोटो पर आज़माऊँगा.',
  beautyPasoMirarRostro: 'आपका चेहरा देखें',
  beautyPasoRecomendar: 'हेयरकट, चश्मे और स्टाइल सुझाएँ',
  beautyPasoProbarDosEstilos: 'आप पर सबसे अच्छे लगने वाले दो स्टाइल आज़माएँ',

  beautyExplicaProbar: 'मैं इसे दो वर्शन में आज़माऊँगा: {{cambio}} (मौका: {{ocasion}}). आपका चेहरा, आपकी त्वचा और फ़ोटो की रोशनी वैसी ही रहेगी.',
  beautyPasoProbar: 'यह आज़माएँ: {{cambio}}. चेहरा वैसा ही रहेगा',
  beautyOcasionElDiaADia: 'रोज़मर्रा की ज़िंदगी',

  beautyDecisionCambioCompleto: 'मेरा सुझाव है: पूरी तरह नया लुक',
  beautyDecisionOcasionDiaADia: 'मैंने इसे रोज़मर्रा के लिए सोचा',
};
