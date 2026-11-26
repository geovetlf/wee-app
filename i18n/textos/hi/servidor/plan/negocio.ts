/*
 * HINDI — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` sale de `weeai.trip…`, que en hindi no lleva posposición («12–22 अक्टूबर 2026»): la pone la frase, «… की
 * यात्रा के लिए». `{{busca}}` va como etiqueta, «आपकी पसंद: {{busca}}», sin suponer el género de quien busca. El itinerario
 * es «यात्रा प्लान» y el destino, «मंज़िल» (f), como en el glosario. `_one` vale para 0 y 1, sin «1» a pelo.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'मैं आपके बिज़नेस को समझूँगा, {{tono}} टोन में पोस्ट लिखूँगा और उसके लिए इमेज बनाऊँगा.',
  businessExplicaCalendario: 'मैं हफ़्ते का पोस्टिंग शेड्यूल बनाऊँगा, हर पोस्ट के दिन, समय और नेटवर्क के साथ.',
  businessExplicaPublicar: 'मैं पोस्ट तैयार करूँगा और उसे हर नेटवर्क के हिसाब से ढालूँगा, ताकि आप उसे कॉपी करके खुद पोस्ट कर सकें. Weë अभी आपके सोशल मीडिया से जुड़ा नहीं है, इसलिए वह आपकी ओर से पोस्ट नहीं करता.',
  businessExplicaRespuesta: 'मैं आपके ग्राहक के लिए एक विनम्र और साफ़ जवाब लिखूँगा, भेजने के लिए तैयार.',
  businessExplicaResultados: 'मैं आपके नतीजे देखूँगा और बताऊँगा कि क्या काम आया और इस हफ़्ते क्या करना फ़ायदेमंद रहेगा.',
  businessExplicaCampana: 'मैं आपके बिज़नेस को समझूँगा, {{tono}} टोन में कैंपेन डिज़ाइन करूँगा और उसकी मुख्य इमेज बनाऊँगा.',
  businessExplicaCv: 'मैं आपका अनुभव समझूँगा और {{tono}} टोन में आपका CV लिखूँगा, इस्तेमाल के लिए तैयार.',
  businessExplicaPresentacion: 'पहले मैं आपके बिज़नेस को समझूँगा, फिर {{tono}} टोन में स्लाइड-दर-स्लाइड प्रेज़ेंटेशन लिखूँगा.',
  businessExplicaDocumento: 'पहले मैं आपके बिज़नेस को समझूँगा, फिर {{tono}} टोन में दस्तावेज़ लिखूँगा.',
  businessExplicaIdeas: 'पहले मैं आपके बिज़नेस को समझूँगा, फिर आगे बढ़ने के लिए ठोस आइडिया और रणनीति सुझाऊँगा.',

  businessTonoProfesionalPeroCercano: 'प्रोफ़ेशनल पर दोस्ताना',

  businessDecisionTonoProfesionalPeroCercano: 'मैं प्रोफ़ेशनल पर दोस्ताना टोन रखूँगा',
  businessDecisionTonoCercanoYProfesional: 'मैं दोस्ताना और प्रोफ़ेशनल टोन रखूँगा',
  businessDecisionTonoProfesional: 'मैं प्रोफ़ेशनल टोन रखूँगा',
  businessDecisionIdeasConcretas: 'मैं ठोस आइडिया से शुरू करूँगा',

  businessPasoEntender: 'आपका बिज़नेस और लक्ष्य समझें',
  businessPasoImagenPublicacion: 'पोस्ट के लिए इमेज बनाएँ',
  businessPasoCalendario: 'पोस्टिंग शेड्यूल बनाएँ',
  businessPasoPrepararPublicacion: 'पोस्ट तैयार करें',
  businessPasoAdaptarACadaRed: 'इसे हर नेटवर्क के हिसाब से ढालें',
  businessPasoRespuesta: 'आपके ग्राहक के लिए जवाब लिखें',
  businessPasoResultados: 'आपके नतीजे देखें और समझाएँ',
  businessPasoCampana: 'कैंपेन डिज़ाइन करें',
  businessPasoImagenCampana: 'कैंपेन की इमेज बनाएँ',
  businessPasoPresentacion: 'प्रेज़ेंटेशन लिखें (स्लाइड-दर-स्लाइड)',
  businessPasoMercado: 'देखें कि अभी आपका बाज़ार कैसा चल रहा है',
  businessPasoIdeas: 'आइडिया और रणनीति सुझाएँ',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'मैं {{fechas}} की यात्रा के लिए तीन मंज़िलें सुझाऊँगा (आपकी पसंद: {{busca}}). एक चुनें और मैं पूरी यात्रा प्लान कर दूँगा.',
  travelExplicaDestinosDias_one: 'मैं {{contador}} दिन · {{lasNoches}} के लिए तीन मंज़िलें सुझाऊँगा (आपकी पसंद: {{busca}}). एक चुनें और मैं पूरी यात्रा प्लान कर दूँगा.',
  travelExplicaDestinosDias_other: 'मैं {{contador}} दिन · {{lasNoches}} के लिए तीन मंज़िलें सुझाऊँगा (आपकी पसंद: {{busca}}). एक चुनें और मैं पूरी यात्रा प्लान कर दूँगा.',
  travelExplicaDestinosDiasAviso_one: 'मैं {{contador}} दिन · {{lasNoches}} के लिए तीन मंज़िलें सुझाऊँगा (आपकी पसंद: {{busca}}). एक चुनें और मैं पूरी यात्रा प्लान कर दूँगा. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा.',
  travelExplicaDestinosDiasAviso_other: 'मैं {{contador}} दिन · {{lasNoches}} के लिए तीन मंज़िलें सुझाऊँगा (आपकी पसंद: {{busca}}). एक चुनें और मैं पूरी यात्रा प्लान कर दूँगा. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा.',
  travelExplicaDestinosTuViaje: 'मैं आपकी यात्रा के लिए तीन मंज़िलें सुझाऊँगा (आपकी पसंद: {{busca}}). एक चुनें और मैं पूरी यात्रा प्लान कर दूँगा.',
  travelExplicaDestinosTuViajeAviso: 'मैं आपकी यात्रा के लिए तीन मंज़िलें सुझाऊँगा (आपकी पसंद: {{busca}}). एक चुनें और मैं पूरी यात्रा प्लान कर दूँगा. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा.',

  travelBuscaSorpresa: 'कुछ ऐसा जो आपको चौंका दे',

  travelExplicaItinerarioFechas_one: 'मैं {{fechas}} ({{contador}} दिन · {{lasNoches}}) के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ.',
  travelExplicaItinerarioFechas_other: 'मैं {{fechas}} ({{contador}} दिन · {{lasNoches}}) के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ.',
  travelExplicaItinerarioDias_one: 'मैं {{contador}} दिन · {{lasNoches}} के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ.',
  travelExplicaItinerarioDias_other: 'मैं {{contador}} दिन · {{lasNoches}} के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ.',
  travelExplicaItinerarioDiasAviso_one: 'मैं {{contador}} दिन · {{lasNoches}} के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा.',
  travelExplicaItinerarioDiasAviso_other: 'मैं {{contador}} दिन · {{lasNoches}} के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा.',
  travelExplicaItinerarioTuViaje: 'मैं आपकी यात्रा के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ.',
  travelExplicaItinerarioTuViajeAviso: 'मैं आपकी यात्रा के लिए दिन-ब-दिन का यात्रा प्लान तैयार करूँगा, अनुमानित बजट के साथ. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा.',

  travelExplicaQueHacer: 'मैं खोजूँगा कि क्या देखने लायक है और कहाँ खाना अच्छा रहेगा, और हर एक का स्रोत दूँगा, ताकि आप उसे जाँच सकें.',
  travelExplicaMoverse: 'मैं घूमने-फिरने के तरीके खोजूँगा, और बताऊँगा कि हर एक में लगभग कितना समय और कितना खर्च लगता है.',

  travelLasNoches_one: '{{contador}} रात',
  travelLasNoches_other: '{{contador}} रातें',

  travelDecisionTresViajes: 'मैं तीन बिल्कुल अलग यात्राएँ सुझा रहा हूँ',
  travelDecisionTresViajesAviso: 'मैं तीन बिल्कुल अलग यात्राएँ सुझा रहा हूँ. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा',
  travelDecisionReparto: 'मैं दिनों को सबसे अच्छी चीज़ों में बाँट दूँगा',
  travelDecisionRepartoAviso: 'मैं दिनों को सबसे अच्छी चीज़ों में बाँट दूँगा. तारीखें पता चलने पर मुझे बताएँ, मैं प्लान को मौसम के हिसाब से ढाल दूँगा',

  travelPasoDestinos: 'तीन सही मंज़िलें खोजें',
  travelPasoQueHacer: 'खोजें कि क्या देखने लायक है और कहाँ खाएँ',
  travelPasoMoverse: 'घूमने-फिरने के तरीके खोजें',
  travelPasoItinerario_one: '{{contador}} दिन का यात्रा प्लान तैयार करें',
  travelPasoItinerario_other: '{{contador}} दिन का यात्रा प्लान तैयार करें',
  travelPasoItinerarioTuViaje: 'आपकी यात्रा का प्लान तैयार करें',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'मैं पक्का करूँगा कि आपकी ज़रूरत समझ गया हूँ, और अगले कदमों के साथ एक साफ़ जवाब तैयार करूँगा.',
  brainDecisionPuntoDePartida: 'मैं शुरुआत के लिए एक दिशा सुझा रहा हूँ और ज़रूरत हो तो आपको सही Weë एक्सपर्ट तक ले जाऊँगा',
  brainPasoEntender: 'ठीक-ठीक समझें कि आपको क्या चाहिए',
  brainPasoRespuesta: 'अगले कदमों के साथ एक साफ़ जवाब तैयार करें',
};
