/*
 * HINDI — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Weë Design comparte con Weë Studio —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"— vive en `studio` y se lee de allí.
 *
 * «Diseñar» es डिज़ाइन करें, como en Canva, y «espacio» es जगह (f; pl. जगहें), la
 * palabra de todos los días. «Interiores», «Arquitectura», «Producto», «Mobiliario»
 * y «Renders» son los préstamos con los que se habla de diseño en la India
 * (इंटीरियर, आर्किटेक्चर, प्रोडक्ट, फ़र्नीचर, रेंडर). «Visualizar» se dice con la
 * झलक del glosario («… उनकी झलक देखें»), e «idea», आइडिया (m, invariable).
 *
 * Los puntos de partida (inLiving, arHouse…) son las filas del panel y, al
 * elegirlos, se escriben en la caja seguidos de un espacio para que la persona
 * termine la idea: van como sustantivos sueltos, sin un «एक» que hiciera de
 * artículo (लिविंग रूम, मॉडर्न घर, सार्वजनिक जगह), porque el hindi no lo necesita
 * y la persona sigue escribiendo detrás. «La cocina» es किचन, como pide el
 * glosario; «una fachada», «फ़्रंट एलिवेशन», que es como se llama en la India la
 * cara de una casa que se diseña; «un yate», यॉट (ऑ por la /ɒ/ inglesa).
 *
 * La luz habla como en `studio`, porque es el mismo taller: el grupo es लाइटिंग y
 * las tres luces dicen que son luz (नैचुरल लाइट, वॉर्म लाइट, स्टूडियो लाइट), porque
 * también se oyen sueltas en la etiqueta del lector de pantalla. También de
 * `studio`: «Minimalista» es मिनिमलिस्ट, «una vista aérea», एरियल व्यू, y «un antes y
 * después», पहले और बाद. Los materiales son मटीरियल, como en `business`, y no
 * सामग्री, que en Weë Chef son los ingredientes. Los títulos de los grupos de
 * ajustes y «Empieza por» se pintan con `textTransform`, que no cambia el
 * devanagari.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'बिना किसी सीमा के डिज़ाइन करें.',
  description: 'जगहें, प्रोडक्ट, चीज़ें और बहुत कुछ.\nअपने आइडिया को आकार दें.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'आज क्या डिज़ाइन करना है?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'यह कैसा दिखना चाहिए',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'एक्सप्लोर',
  allTitle: 'क्या-क्या डिज़ाइन किया जा सकता है',
  allHint: 'ये बस शुरुआत करने के कुछ तरीके हैं. जो भी डिज़ाइन करना हो, उसे ऊपर लिखें.',
  startWith: 'यहाँ से शुरू करें',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'इंटीरियर',
  interiorsHint: 'कमरे और अंदर की जगहें डिज़ाइन करें और उनकी झलक देखें.',
  architectureTitle: 'आर्किटेक्चर',
  architectureHint: 'इमारतों के प्रोजेक्ट बनाएँ और उनकी झलक देखें.',
  spacesTitle: 'जगहें',
  spacesHint: 'बाहरी, शहरी और कमर्शियल जगहें डिज़ाइन करें.',
  furnitureTitle: 'फ़र्नीचर',
  furnitureHint: 'फ़र्नीचर और सजावट की चीज़ें अपने हिसाब से बनाएँ.',
  productTitle: 'प्रोडक्ट',
  productHint: 'कोई भी चीज़ या प्रोडक्ट डिज़ाइन करें.',
  vehiclesTitle: 'वाहन',
  vehiclesHint: 'कार, बाइक, नाव, हवाई जहाज़ और बहुत कुछ.',
  rendersTitle: 'रेंडर और 3D',
  rendersHint: 'अपने आइडिया को बिल्कुल असली जैसा देखें.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'लिविंग रूम',
  inKitchen: 'किचन',
  inBedroom: 'बेडरूम',
  inBathroom: 'बाथरूम',
  inRemodel: 'किसी जगह का मेकओवर',
  arHouse: 'मॉडर्न घर',
  arFacade: 'फ़्रंट एलिवेशन',
  arBuilding: 'इमारत',
  arCabin: 'कॉटेज',
  arExtension: 'घर में नया हिस्सा',
  spGarden: 'बगीचा',
  spTerrace: 'टैरेस',
  spShop: 'दुकान',
  spRestaurant: 'रेस्टोरेंट',
  spPublic: 'सार्वजनिक जगह',
  fuChair: 'कुर्सी',
  fuSofa: 'सोफ़ा',
  fuTable: 'टेबल',
  fuShelf: 'शेल्फ़',
  fuLamp: 'लैंप',
  prEveryday: 'रोज़मर्रा की कोई चीज़',
  prPackaging: 'पैकेजिंग',
  prAccessory: 'एक्सेसरी',
  prGadget: 'गैजेट',
  prJewel: 'गहना',
  veCar: 'कार',
  veMotorbike: 'बाइक',
  veBoat: 'नाव या यॉट',
  vePlane: 'हवाई जहाज़',
  veDrone: 'ड्रोन',
  reRealistic: 'असली जैसा रेंडर',
  reModel: '3D मॉडल',
  reAerial: 'एरियल व्यू',
  reWalkthrough: 'वर्चुअल टूर',
  reBeforeAfter: 'पहले और बाद',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'स्टाइल',
  optMaterials: 'मटीरियल',
  optLighting: 'लाइटिंग',
  valModern: 'मॉडर्न',
  valMinimal: 'मिनिमलिस्ट',
  valClassic: 'क्लासिक',
  valIndustrial: 'इंडस्ट्रियल',
  valWood: 'लकड़ी',
  valMetal: 'मेटल',
  valGlass: 'काँच',
  valMixed: 'मिले-जुले',
  valNatural: 'नैचुरल लाइट',
  valWarm: 'वॉर्म लाइट',
  valStudioLight: 'स्टूडियो लाइट',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'इंटीरियर',
  kindArchitecture: 'आर्किटेक्चर',
  kindBoat: 'नाव',
  kindFurniture: 'फ़र्नीचर',
  sampleLivingRoom: 'रोशनी से भरा लिविंग रूम',
  samplePineHouse: 'चीड़ के पेड़ों के बीच घर',
  sampleYacht: '15 मीटर यॉट',
  sampleArmchair: 'लकड़ी की आरामकुर्सी',
};
