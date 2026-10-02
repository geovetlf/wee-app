/*
 * HINDI — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las funciones que ya existían siguen en `catalogo` (chefAc…).
 *
 * Las palabras de la cocina son las del glosario (§ 11.6): रेसिपी (f), सामग्री
 * (los ingredientes, colectivo) y el verbo पकाएँ, que es también el botón de
 * enviar. La información nutricional es «पोषण की जानकारी»; «Sin X» es «बिना X»
 * (बिना ग्लूटेन, बिना अंडे, बिना चीनी), como se dice en cualquier cocina india, y
 * lo que alguien no puede o no quiere comer es परहेज़ («कोई परहेज़ नहीं», «जिससे
 * परहेज़ है»). «Vegetariano» es शाकाहारी, la palabra de cualquier carta en la
 * India; «frutos secos», मेवे; el pasillo del supermercado, सेक्शन.
 *
 * Los valores de los ajustes se leen también SOLOS, como fichas debajo de la caja,
 * y dentro de goalWith, unidos por Intl («पनीर टिक्का (2 लोगों के लिए, आधा घंटा, और
 * आसान)»): por eso cada uno dice qué es sin su título (2 लोगों के लिए, थोड़ा
 * मुश्किल, शेफ़ लेवल). Las cantidades van en cifras latinas (2, 15, 1), como pide
 * la guía para las cifras que escribe quien traduce.
 *
 * Lo que el español repite en otros módulos se dice igual: «¿Qué quieres hacer?» es
 * «क्या करना है?», como en `catalogo`; «Todo» es सभी, como los filtros de `home` y
 * `creaciones`; «Dictar», «बोलकर लिखें», como en `studio`; «Mis proyectos», «मेरे
 * प्रोजेक्ट». Salvo «Media», que aquí es la dificultad
 * media (थोड़ा मुश्किल) y en `profile` la pestaña de fotos y vídeos (मीडिया): en
 * español se escriben igual, pero no son la misma palabra.
 *
 * Ninguna frase depende del género de quien cocina: «क्या करना है?» (sin sujeto),
 * «आपने अभी तक … नहीं पकाया है» (ergativo), «यहाँ जो भी बनाएँ» (subjuntivo).
 * panelStart deja la frase empezada en la caja con el espacio final del español,
 * y la persona la termina.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'रेसिपी, मेन्यू और सामग्री.\nघर में जो है, उसी से.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'अपना आइडिया या सामग्री लिखें, या फ़ोटो इस्तेमाल करें',
  addLabel: 'फ़ोटो जोड़ें',
  cameraLabel: 'फ़ोटो लें',
  galleryLabel: 'गैलरी से फ़ोटो चुनें',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'फ़ोटो जोड़ी गई',
  settingsLabel: 'रेसिपी की सेटिंग',
  voiceLabel: 'बोलकर लिखें',
  sendLabel: 'पकाएँ',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'क्या करना है?',
  nutritionTitle: 'पोषण की जानकारी',
  nutritionSubtitle: 'कैलोरी, मैक्रो और एलर्जी',
  swapTitle: 'सामग्री बदलें',
  swapSubtitle: 'जो नहीं है या जिससे परहेज़ है, उसे बदलें',
  shoppingTitle: 'शॉपिंग लिस्ट',
  shoppingSubtitle: 'जो कुछ खरीदना है',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'कहाँ से शुरू करना है, यह चुनें और अपने शब्दों में वाक्य पूरा करें.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'कैलोरी',
  nuProtein: 'प्रोटीन',
  nuFat: 'फ़ैट',
  nuCarbs: 'कार्बोहाइड्रेट',
  nuSugar: 'चीनी',
  nuSodium: 'सोडियम',
  nuAllergens: 'एलर्जी',
  nuPortion: 'प्रति सर्विंग',
  nuAll: 'सभी',

  /* Sustituir ingredientes */
  swMissing: 'मेरे पास एक चीज़ नहीं है',
  swLactose: 'बिना लैक्टोज़',
  swGluten: 'बिना ग्लूटेन',
  swEgg: 'बिना अंडे',
  swNuts: 'बिना मेवे',
  swVegetarian: 'शाकाहारी',
  swVegan: 'वीगन',
  swSugar: 'बिना चीनी',
  swCheaper: 'कम खर्च में',
  swPantry: 'घर में जो है, उसी से',

  /* Lista de compras */
  shRecipe: 'किसी रेसिपी से',
  shMenu: 'किसी मेन्यू से',
  shWeek: 'हफ़्ते भर के लिए',
  shOccasion: 'किसी खास मौके के लिए',
  shPantry: 'किचन का ज़रूरी सामान',
  shAisles: 'सेक्शन के हिसाब से',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'इसे पकाने के लिए ज़रूरी बातें',
  optPeople: 'कितने लोग',
  optTime: 'समय',
  optDiet: 'खान-पान',
  optLevel: 'लेवल',
  valAnyone: 'कितने भी',
  valOne: 'सिर्फ़ मेरे लिए',
  valTwo: '2 लोगों के लिए',
  valFamily: 'परिवार के लिए',
  valMany: 'कई लोगों के लिए',
  valAnyTime: 'जितना लगे',
  valQuick: '15 मिनट',
  valHalfHour: 'आधा घंटा',
  valLong: '1 घंटा या ज़्यादा',
  valNoDiet: 'कोई परहेज़ नहीं',
  valVegetarian: 'शाकाहारी',
  valVegan: 'वीगन',
  valGlutenFree: 'बिना ग्लूटेन',
  valLactoseFree: 'बिना लैक्टोज़',
  valSugarFree: 'बिना चीनी',
  valAnyLevel: 'कोई भी',
  valEasy: 'आसान',
  valMedium: 'थोड़ा मुश्किल',
  valPro: 'शेफ़ लेवल',
  /* Lo elegido viaja con la idea, a la vista: "पनीर टिक्का (2 लोगों के लिए और आधा घंटा)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'मेरे प्रोजेक्ट',
  seeAll: 'सभी देखें',
  projectsEmpty: 'आपने अभी तक Weë के साथ कुछ नहीं पकाया है.',
  projectsEmptyHint: 'यहाँ जो भी बनाएँ, वह सेव हो जाता है और यहीं दिखता है.',
};
