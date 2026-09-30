/*
 * HINDI — lo que describe cada experiencia de WEË AI y los ejemplos que se tocan
 * para empezar. Los nombres —Weë Design, Weë Studio…— son marca y viven en
 * constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las descripciones son listas cortas con los préstamos de las herramientas de
 * creación (लोगो, पोस्टर, स्क्रिप्ट, मेकअप, आउटफ़िट) y las palabras del glosario
 * (रेसिपी, संगीत, यात्रा, बिज़नेस, दस्तावेज़; «IA» es «AI»). Los ejemplos hablan
 * con la voz de la persona y sin género: el imperativo de «आप» («मेरी फ़ोटो को
 * वीडियो में बदलें»), un sustantivo («मेरे बिज़नेस के लिए एक लोगो» y «ग्राहक के
 * लिए एक ईमेल», del glosario) o el subjuntivo («पता नहीं आज क्या पकाएँ», también
 * del glosario; «पता नहीं कहाँ घूमने जाएँ» y «पता नहीं कहाँ से शुरू करें» siguen
 * la misma forma). «Cómo me quedaría el cabello largo» no puede decir «कैसी/कैसा
 * लगूँगी»: el verbo concuerda con el pelo, «लंबे बाल मुझ पर कैसे लगेंगे». El CV
 * se queda en sigla latina («CV», guía § 3 c), como en studio, business y catalogo; la «sala» es el «लिविंग रूम», el «patio», el «आँगन»,
 * y «Quitar algo que sobra en la foto» es «फ़ोटो से कोई अनचाही चीज़ हटाएँ».
 *
 * Las áreas se traducen porque se leen; la marca de delante no: «Weë Studio ·
 * फ़ोटो», «Weë Studio · ब्यूटी» (el «Beauty» del español es el nombre del área,
 * no la marca Weë Beauty) y «Weë Design · घर और डिज़ाइन», con «और» en lugar de
 * «&» (guía § 7). `areaHomeName` firma también las burbujas de la conversación.
 * En `tellTheSpecialist` el especialista es una marca, así que la posposición va
 * separada («{{especialista}} को बताएँ») y, cuando actúa, concuerda en masculino
 * singular como todo producto de Weë (guía § 5.3): «पूछेगा», «संभाल लेगा». Lo que
 * quiere la persona va en dativo, «आपको क्या चाहिए», como en el glosario (§ 11.7).
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'लोगो, पोस्टर, इलस्ट्रेशन और सोशल मीडिया के लिए कॉन्टेंट',
  studio: 'AI से फ़ोटो और वीडियो बनाएँ और बदलें.',
  photo: 'अपनी फ़ोटो बेहतर बनाएँ, ठीक करें और बदलें',
  writer: 'पोस्ट, कहानियाँ, स्क्रिप्ट, ईमेल और किताबें',
  music: 'गाने, इंस्ट्रूमेंटल संगीत, आवाज़ें और नैरेशन',
  beauty: 'मेकअप, बाल, दाढ़ी, आउटफ़िट और नया लुक',
  chef: 'आपका अपना शेफ़: क्या पकाएँ, रेसिपी और मेन्यू',
  home: 'सजावट, इंटीरियर डिज़ाइन, रेनोवेशन और बगीचे',
  business: 'बिज़नेस आइडिया, मार्केटिंग, CV, दस्तावेज़ और प्रेज़ेंटेशन',
  travel: 'अपनी यात्रा की तैयारी करें: कहाँ जाएँ, क्या करें और कैसे घूमें',
  brain: 'पता नहीं कहाँ खोजें? Weë से पूछें',
  designEx1: 'मेरे बिज़नेस के लिए एक लोगो',
  designEx2: 'Instagram के लिए एक पोस्ट',
  designEx3: 'मेरी किताब का कवर',
  studioEx1: 'मेरे रेस्टोरेंट के प्रमोशन के लिए एक वीडियो',
  studioEx2: 'मेरी फ़ोटो को वीडियो में बदलें',
  studioEx3: 'मेरे प्रोडक्ट के साथ एक Weël',
  photoEx1: 'फ़ोटो की क्वालिटी बेहतर करें',
  photoEx2: 'फ़ोटो से कोई अनचाही चीज़ हटाएँ',
  photoEx3: 'मेरी फ़ोटो का बैकग्राउंड बदलें',
  writerEx1: 'मेरे वीडियो के लिए स्क्रिप्ट',
  writerEx2: 'ग्राहक के लिए एक ईमेल',
  writerEx3: 'मेरे टेक्स्ट की गलतियाँ ठीक करें',
  musicEx1: 'मेरे ब्रांड के लिए एक जिंगल',
  musicEx2: 'मेरे वीडियो के लिए बैकग्राउंड संगीत',
  musicEx3: 'मेरे टेक्स्ट को आवाज़ में बदलें',
  beautyEx1: 'लंबे बाल मुझ पर कैसे लगेंगे',
  beautyEx2: 'पार्टी के लिए एक लुक',
  beautyEx3: 'बालों का कोई दूसरा रंग आज़माएँ',
  chefEx1: 'घर में मौजूद चीज़ों से एक रेसिपी',
  chefEx2: 'हफ़्ते भर का सेहतमंद मेन्यू',
  chefEx3: 'पता नहीं आज क्या पकाएँ',
  homeEx1: 'किसी और स्टाइल में मेरा लिविंग रूम कैसा दिखेगा',
  homeEx2: 'मेरा कमरा सजाने के आइडिया',
  homeEx3: 'मेरे आँगन के लिए एक छोटा बगीचा',
  businessEx1: 'मेरे नए बिज़नेस के लिए एक प्लान',
  businessEx2: 'मेरा CV अपडेट करें',
  businessEx3: 'निवेशकों के लिए एक प्रेज़ेंटेशन',
  travelEx1: 'अक्टूबर में जापान',
  travelEx2: 'मुझे कोई शांत और सस्ता बीच चाहिए',
  travelEx3: 'पता नहीं कहाँ घूमने जाएँ',
  brainEx1: 'पता नहीं कहाँ से शुरू करें',
  brainEx2: 'मुझे यह आसान भाषा में समझाएँ',
  brainEx3: 'इस टेक्स्ट का अनुवाद करें',
  areaStudioPhotos: 'Weë Studio · फ़ोटो',
  areaStudioVideos: 'Weë Studio · वीडियो',
  areaStudioBeauty: 'Weë Studio · ब्यूटी',
  areaDesignHome: 'Weë Design · घर और डिज़ाइन',
  areaHomeName: 'घर और डिज़ाइन',
  tellTheSpecialist: '{{especialista}} को बताएँ कि आपको क्या चाहिए: वह आपसे दो-तीन आसान सवाल पूछेगा और बाकी सब खुद संभाल लेगा. फिर सीधे अपनी कम्यूनिटी में पोस्ट करें.',
  exampleQuoted: '“{{ejemplo}}”',
};
