/*
 * HINDI — la Ayuda (मदद): las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La Ayuda CITA botones y opciones de otras pantallas, entre “…”, y tiene que decir lo mismo que
 * ellos, con las formas del glosario: «मैंने इसे कैसे बनाया» (`wall.howIMadeIt`), «प्रॉम्प्ट कॉपी
 * करें» (`wall.copyPrompt`), «प्रोजेक्ट में सेव करें» (`weeai.saveToProject`), «Weël»
 * (`composer.kindWeel`) y «पता नहीं» (la opción 🤷 que ofrece Weë Brain). El proyecto de ejemplo,
 * «मेरा रेस्टोरेंट», es el mismo que `projects.namePlaceholder`. Las temáticas de comunidad (Cine &
 * Animación…) aún no tienen claves —viven en constants/communityCategories.ts—: aquí van en hindi
 * y con «और» en lugar de «&» (guía § 7). Los especialistas se nombran como en el español, sin el
 * prefijo Weë y sin traducir; un especialista es «एक्सपर्ट» (glosario § 11.7), y la cifra se
 * escribe con dígitos («10 एक्सपर्ट», guía § 8). «Tú eliges el resultado; Weë elige la IA» es la
 * frase del glosario, «नतीजा आप चुनें. AI Weë चुनेगा.». Weë y Weë AI van en masculino («Weë …
 * इस्तेमाल करता है», «Weë AI कैसे काम करता है?»); Credits, en masculino plural («Credits लगते हैं»);
 * «ऐप» no concuerda con nada (guía § 5.4): lo que cambia es «ऐप का रंग».
 * La persona nunca recibe género: donde el español dice «descubres, aprendes, creas…», el hindi
 * invita con imperativos («खोजें, सीखें, बनाएँ…»); lo demás va en pasiva, en subjuntivo («जब तक आप
 * उन्हें पोस्ट न करें») o con «आपको». «Perfil Real» y «Perfil Weë» dentro de una frase son «आपकी
 * असली प्रोफ़ाइल» y «आपकी Weë प्रोफ़ाइल». `askPrefill` conserva el espacio final: se pega delante de
 * lo que escriba la persona.
 */
export const help: typeof import('../es/help').help = {
  title: 'मदद',
  intro: 'यहाँ सबसे आम सवालों के जवाब हैं. अगर कुछ साफ़ न हो, तो हमें बताएँ: Weë अपनी कम्यूनिटी के साथ बेहतर होता है.',
  faqTitle: 'अक्सर पूछे जाने वाले सवाल',
  contact: 'संपर्क',
  contactBody: 'जल्द ही आपको यहाँ Weë की टीम से सीधे बात करने का तरीका मिलेगा. तब तक, अपने आइडिया और परेशानियाँ किसी पोस्ट में शेयर करें: कम्यूनिटी और टीम, दोनों उन्हें पढ़ती हैं.',
  askQuestion: 'सवाल पूछें',
  legalTitle: 'शर्तें और निजता',
  legalBody: 'आपका डेटा आपका है. Weë आपका ईमेल और आपकी प्रोफ़ाइल सिर्फ़ ऐप चलाने के लिए इस्तेमाल करता है: ताकि आप साइन इन कर सकें और आपको अपनी पोस्ट, अपने Credits और अपनी रचनाएँ दिखें. हम आपकी जानकारी नहीं बेचते.',
  legalPending: 'पूरी शर्तें और निजता नीति लॉन्च से पहले wee.zone पर उपलब्ध होंगी. Weë अभी बन रहा है: कुछ सुविधाएँ टेस्ट डेटा इस्तेमाल करती हैं, और जहाँ भी ऐसा होता है, हम वहाँ साफ़-साफ़ बताते हैं.',
  footer: 'Weë · World Encode Entity · वर्शन 1.0.0',
  q1: 'Weë क्या है?',
  a1: 'Weë (World Encode Entity) उन लोगों का सोशल नेटवर्क है जो AI से कुछ बनाते हैं: यहाँ नई चीज़ें खोजें, सीखें, बनाएँ, शेयर करें और लोगों से जुड़ें. AI इसका इंजन है और कम्यूनिटी इसका दिल.',
  q2: 'असली प्रोफ़ाइल और Weë प्रोफ़ाइल में क्या फ़र्क है?',
  a2: 'आपकी असली प्रोफ़ाइल आपकी रोज़मर्रा की पहचान है, और इसके साथ ऐप का रंग सफ़ेद होता है. आपकी Weë प्रोफ़ाइल AI से कुछ बनाने के लिए आपकी पहचान है: अपनी रचनाएँ पोस्ट करने के लिए एक अलग अवतार और एक अलग नाम. इसके साथ ऐप का रंग गहरा हो जाता है, ताकि आपको हमेशा पता रहे कि अभी कौन-सी प्रोफ़ाइल सक्रिय है. एक से दूसरी प्रोफ़ाइल पर स्विच करने के लिए, ☰ मेन्यू या सबसे ऊपर वाला बटन इस्तेमाल करें.',
  q3: 'Weë AI कैसे काम करता है?',
  a3: 'अपने शब्दों में Weë को बताएँ कि आपको क्या हासिल करना है. Weë आपसे कुछ आसान सवाल पूछता है (जवाब में हमेशा “पता नहीं” भी चुना जा सकता है), एक प्लान बनाता है और नतीजा तैयार करता है. नतीजा आप चुनें. AI Weë चुनेगा. Weë AI में 10 एक्सपर्ट हैं: Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business और Brain.',
  q4: 'Credits क्या हैं?',
  a4: 'Weë AI से कुछ भी बनाने में Credits लगते हैं. बनाने से पहले ही आपको दिख जाता है कि कितने Credits लगेंगे, और अगर कुछ गड़बड़ हो जाए, तो वे वापस मिल जाते हैं. जब तक Weë AI तैयार हो रहा है, कीमतें सिर्फ़ टेस्ट के लिए हैं और Credits जोड़ना मुफ़्त है: पक्की कीमतें असली AI के साथ आएँगी.',
  q5: 'प्रोजेक्ट किस काम आते हैं?',
  a5: 'एक प्रोजेक्ट में अलग-अलग एक्सपर्ट की रचनाएँ एक साथ रहती हैं, जैसे “मेरा रेस्टोरेंट” के लिए लोगो, फ़ोटो, विज्ञापन, वीडियो और संगीत. “प्रोजेक्ट में सेव करें” पर टैप करके, हर नतीजे को उसके सही प्रोजेक्ट में रखें.',
  q6: 'Weëls क्या हैं?',
  a6: 'अपनी रचनाएँ दिखाने के लिए 15 सेकंड तक के वीडियो. इन्हें Weë के बाहर भी शेयर किया जा सकता है, और इन पर Weë का एक छोटा-सा वॉटरमार्क होता है. इन्हें बनाने के लिए, + बटन पर टैप करें और “Weël” चुनें.',
  q7: 'कम्यूनिटी क्या हैं?',
  a7: 'एक जैसी दिलचस्पी वाले लोगों के ग्रुप: फ़िल्म और ऐनिमेशन, कला और रचनात्मकता, बिज़नेस और उद्यमिता, टेक्नोलॉजी और AI वगैरह. जो कम्यूनिटी आपको पसंद आएँ, उनमें शामिल हों और वहाँ पोस्ट करें.',
  q8: 'WeeTalk क्या है?',
  a8: 'यह Weë की चैट है: कम्यूनिटी के दूसरे लोगों के साथ निजी बातचीत, जिसमें टेक्स्ट, फ़ोटो और वॉइस मैसेज भेजे जा सकते हैं.',
  q9: '“मैंने इसे कैसे बनाया” क्या है?',
  a9: 'पोस्ट करते समय, चाहें तो यह भी बताएँ कि आपने कौन-से टूल इस्तेमाल किए, कौन-सा प्रॉम्प्ट लिखा और काम कैसे किया. इस तरह, “प्रॉम्प्ट कॉपी करें” पर बस एक टैप से, एक-दूसरे से सीखना आसान हो जाता है.',
  heroTitle: 'हम आपकी क्या मदद करें?',
  legalVisibility: 'आपकी पोस्ट कम्यूनिटी को दिखती हैं; Weë AI में बनाई गई आपकी रचनाएँ तब तक निजी रहती हैं, जब तक आप उन्हें पोस्ट न करें. आपकी पोस्ट और आपके प्रोजेक्ट, जब चाहें तब मिटाए जा सकते हैं.',
  askPrefill: 'Weë से एक सवाल: ',
};
