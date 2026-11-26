/*
 * HINDI — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` trae su «के लिए». `{{tiempo}}` («आधा घंटा») no puede ir delante de «में», que pediría el oblicuo: va
 * como etiqueta, «(समय: {{tiempo}})». El espacio de Weë Home admite «का/में» sin cambiar («लिविंग रूम का»), y el estilo
 * va delante de «स्टाइल». El plato es «डिश» (f), la lista de compras «खरीदारी की लिस्ट», los ingredientes «सामग्री».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'मैं आपकी फ़ोटो से शुरू करूँगा और रोशनी बेहतर करूँगा. डिश बिल्कुल वैसी ही रहेगी.',
  chefExplicaRetoqueFondo: 'मैं आपकी फ़ोटो से शुरू करूँगा और बैकग्राउंड बदलूँगा. डिश बिल्कुल वैसी ही रहेगी.',
  chefExplicaRetoqueApetitoso: 'मैं आपकी फ़ोटो से शुरू करूँगा और उसे ज़्यादा लज़ीज़ दिखाऊँगा. डिश बिल्कुल वैसी ही रहेगी.',
  chefExplicaRetoqueRestaurante: 'मैं आपकी फ़ोटो से शुरू करूँगा और उसे रेस्टोरेंट की फ़ोटो जैसा दिखाऊँगा. डिश बिल्कुल वैसी ही रहेगी.',
  chefExplicaRetoqueQuitar: 'मैं आपकी फ़ोटो से शुरू करूँगा और वह हटाऊँगा जो आपको नहीं चाहिए. डिश बिल्कुल वैसी ही रहेगी.',
  chefExplicaRetoqueNoSe: 'मैं आपकी फ़ोटो से शुरू करूँगा और डिश बदले बिना उसे बेहतर दिखाऊँगा. डिश बिल्कुल वैसी ही रहेगी.',
  chefExplicaRetoqueLibre: 'मैं आपकी फ़ोटो से शुरू करूँगा और सिर्फ़ वही बदलाव करूँगा जो आपने कहे हैं. डिश बिल्कुल वैसी ही रहेगी.',

  chefExplicaMenuTresDias: 'मैं तीन दिनों का मेन्यू बनाऊँगा, {{comensales}}, और खरीदारी की लिस्ट दूँगा.',
  chefExplicaMenuTodaLaSemana: 'मैं पूरे हफ़्ते का मेन्यू बनाऊँगा, {{comensales}}, और खरीदारी की लिस्ट दूँगा.',
  chefExplicaMenuParaLaSemana: 'मैं हफ़्ते भर का मेन्यू बनाऊँगा, {{comensales}}, और खरीदारी की लिस्ट दूँगा.',
  chefExplicaMenu: 'मैं एक मेन्यू बनाऊँगा (अवधि: {{duracion}}), {{comensales}}, और खरीदारी की लिस्ट दूँगा.',

  chefExplicaRecetaEnTiempo: 'मैं {{comensales}} स्टेप-बाय-स्टेप रेसिपी तैयार करूँगा (समय: {{tiempo}}), साथ में डिश की एक फ़ोटो भी.',
  chefExplicaRecetaSinApuro: 'मैं {{comensales}} स्टेप-बाय-स्टेप रेसिपी तैयार करूँगा, बिना किसी समय सीमा के, साथ में डिश की एक फ़ोटो भी.',
  chefExplicaConLoQueTienesEnTiempo: 'घर में जो है, उससे मैं {{comensales}} रेसिपी तैयार करूँगा (समय: {{tiempo}}), साथ में डिश की एक फ़ोटो भी.',
  chefExplicaConLoQueTienesSinApuro: 'घर में जो है, उससे मैं {{comensales}} रेसिपी तैयार करूँगा, बिना किसी समय सीमा के, साथ में डिश की एक फ़ोटो भी.',
  chefExplicaSaludableEnTiempo: 'मैं {{comensales}} एक सेहतमंद रेसिपी तैयार करूँगा (समय: {{tiempo}}), साथ में डिश की एक फ़ोटो भी.',
  chefExplicaSaludableSinApuro: 'मैं {{comensales}} एक सेहतमंद रेसिपी तैयार करूँगा, बिना किसी समय सीमा के, साथ में डिश की एक फ़ोटो भी.',
  chefExplicaPostreEnTiempo: 'मैं {{comensales}} एक डेज़र्ट तैयार करूँगा (समय: {{tiempo}}), साथ में उसकी एक फ़ोटो भी.',
  chefExplicaPostreSinApuro: 'मैं {{comensales}} एक डेज़र्ट तैयार करूँगा, बिना किसी समय सीमा के, साथ में उसकी एक फ़ोटो भी.',

  chefDecisionAlgoRico: 'मेरा सुझाव है कि घर में आम तौर पर मौजूद चीज़ों से कुछ स्वादिष्ट और आसान बनाया जाए',
  chefDecisionParaDos: 'मैंने इसे दो लोगों के लिए सोचा',
  chefDecisionSinApuro: 'मैंने कोई समय सीमा नहीं रखी',
  chefDecisionTodaLaSemana: 'मैं इसे पूरे हफ़्ते के लिए बनाऊँगा',

  chefPasoMirarIngredientes: 'देखें कि आपके पास कौन-सी सामग्री है',
  chefPasoEscribirReceta: 'स्टेप-बाय-स्टेप रेसिपी लिखें',
  chefPasoFotoDelPlato: 'डिश की फ़ोटो बनाएँ',
  chefPasoArmarMenu: 'मेन्यू बनाएँ',
  chefPasoPreciosIngredientes: 'देखें कि सामग्री की कीमत कितनी है',
  chefPasoListaDeCompras: 'खरीदारी की लिस्ट बनाएँ',
  chefPasoRetocarFoto: 'आपकी डिश की फ़ोटो रीटच करें',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'मैं {{espacio}} देखूँगा और बताऊँगा कि मैं क्या बदलूँगा (फ़र्नीचर, रंग, लेआउट), ताकि आप चुन सकें कि शुरुआत कहाँ से करें. अभी कोई इमेज नहीं बनाऊँगा.',
  homeExplicaIdeas: 'मैं {{espacio}} के लिए {{estilo}} स्टाइल में तीन आइडिया खोजूँगा और बताऊँगा कि उन्हें कैसे पूरा करें.',
  homeExplicaDistribucion: 'मैं {{espacio}} देखूँगा, जगह का बेहतर इस्तेमाल करने वाला लेआउट सुझाऊँगा और दिखाऊँगा कि आपके अपने फ़र्नीचर के साथ वह कैसा लगेगा.',
  homeExplicaRedisenar: 'मैं {{espacio}} को {{estilo}} स्टाइल में नया डिज़ाइन दूँगा, दो वर्शन में, और बदलावों और खरीदने की चीज़ों की लिस्ट दूँगा.',
  homeExplicaMuebles: 'मैं {{espacio}} का फ़र्नीचर {{estilo}} स्टाइल में बदलूँगा, दो वर्शन में, और बदलावों और खरीदने की चीज़ों की लिस्ट दूँगा.',
  homeExplicaColores: 'मैं {{espacio}} का लुक और रंग {{estilo}} स्टाइल में बदलूँगा, दो वर्शन में, और बदलावों और खरीदने की चीज़ों की लिस्ट दूँगा.',
  homeExplicaExterior: 'मैं आपकी बाहर की जगह को {{estilo}} स्टाइल में डिज़ाइन करूँगा, दो वर्शन में, और बदलावों और खरीदने की चीज़ों की लिस्ट दूँगा.',

  homeDecisionEmpiezoPorLaSala: 'मैं लिविंग रूम से शुरू करूँगा',
  homeDecisionEstiloAcogedor: 'मैंने आरामदायक स्टाइल चुना',

  homePasoMirarFotoDelEspacio: 'जगह की फ़ोटो देखें',
  homePasoRedisenar: '{{espacio}} को {{estilo}} स्टाइल में नया डिज़ाइन दें',
  homePasoMuebles: '{{espacio}} का फ़र्नीचर {{estilo}} स्टाइल में बदलें',
  homePasoColores: '{{espacio}} का लुक और रंग {{estilo}} स्टाइल में बदलें',
  homePasoExterior: 'आपकी बाहर की जगह को {{estilo}} स्टाइल में डिज़ाइन करें',
  homePasoListaDeCambios: 'बदलावों और खरीदने की चीज़ों की लिस्ट बनाएँ',
  homePasoProponerDistribucion: 'बेहतर लेआउट सुझाएँ',
  homePasoMostrarComoQuedaria: 'दिखाएँ कि यह कैसा लगेगा',
  homePasoBuscarIdeas: '{{espacio}} के लिए आइडिया खोजें',
  homePasoExplicarComoLograrlo: 'बताएँ कि इसे कैसे पूरा करें',
  homePasoMirarFotoDeTuEspacio: 'आपकी जगह की फ़ोटो देखें',
  homePasoContarQueVeo: 'बताएँ कि क्या दिख रहा है और क्या किया जा सकता है',

  /* La voz de quien habla: Weë dice «आपके लिए», no «मेरे लिए» (ver el catálogo español). */
  chefComensalesSoloParaMi: 'सिर्फ़ आपके लिए',
  homeEspacioMiOficina: 'आपका ऑफ़िस',
};
