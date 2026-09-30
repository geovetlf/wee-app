/*
 * HINDI — Mis proyectos (मेरे प्रोजेक्ट): la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Un proyecto es «प्रोजेक्ट» (m, invariable), una creación, «रचना» (como en `creaciones`) y un
 * especialista, «एक्सपर्ट» (glosario § 11.1 y § 11.7). El nombre del proyecto es de la persona:
 * entra por `{{nombre}}`, entre “…” y sin nada pegado; en la confirmación larga lleva «प्रोजेक्ट»
 * detrás para que el verbo concuerde («“{{nombre}}” प्रोजेक्ट मिटाना है?»), y en la corta el verbo
 * va en masculino, el del proyecto. `{{accion}}` es el botón «प्रोजेक्ट में सेव करें» de weeai y va
 * entre “…”. El proyecto de ejemplo, «मेरा रेस्टोरेंट», es el mismo que cita la Ayuda, y va tras
 * «जैसे:», como los ejemplos cortos de los campos de nombre (`communities`, `weebiz`); «उदाहरण:»
 * queda para las frases de ejemplo enteras (`catalogo`). Borrar un
 * proyecto no borra ninguna creación: «आपकी रचनाएँ नहीं मिटेंगी». `emojiLabel` solo lo oye el lector
 * de pantalla: «{{emoji}} इमोजी», igual que `weeai.emojiLabel`. Las listas escritas a mano van sin
 * coma antes de «और» / «या» (guía § 7). El contador cambia la palabra y lleva la cifra en las dos
 * formas: «{{contador}} रचना» / «{{contador}} रचनाएँ» (el 0 también cae en `_one`).
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'आपकी रचनाएँ, प्रोजेक्ट के हिसाब से',
  introText: 'एक प्रोजेक्ट में लोगो, फ़ोटो, विज्ञापन, वीडियो, संगीत और दस्तावेज़ हो सकते हैं. “{{accion}}” पर टैप करके, हर नतीजे को उसके सही प्रोजेक्ट में रखें.',
  sectionTitle: 'प्रोजेक्ट',
  emojiLabel: '{{emoji}} इमोजी',
  namePlaceholder: 'जैसे: मेरा रेस्टोरेंट',
  emptyTitle: 'अभी तक कोई प्रोजेक्ट नहीं है',
  emptyText: 'पहला प्रोजेक्ट बनाएँ या कोई भी नतीजा सीधे किसी प्रोजेक्ट में सेव करें.',
  emptyAction: 'अपना पहला प्रोजेक्ट बनाएँ',
  open: 'खोलें',
  fallbackTitle: 'प्रोजेक्ट',
  notFound: 'यह प्रोजेक्ट नहीं मिला.',
  saveName: 'नाम सेव करें',
  rename: 'नाम बदलें',
  deleteProject: 'प्रोजेक्ट मिटाएँ',
  deleteConfirmWeb: 'क्या आपको “{{nombre}}” प्रोजेक्ट मिटाना है? आपकी रचनाएँ नहीं मिटेंगी.',
  deleteConfirm: 'क्या आपको “{{nombre}}” मिटाना है? आपकी रचनाएँ नहीं मिटेंगी.',
  creations_one: '{{contador}} रचना',
  creations_other: '{{contador}} रचनाएँ',
  creationsTitle: 'रचनाएँ',
  add: 'जोड़ें',
  noCreations: 'यहाँ अभी तक कोई रचना नहीं है. किसी भी एक्सपर्ट के साथ कुछ बनाएँ और उसे इस प्रोजेक्ट में सेव करें.',
  whatIsMissing: 'इस प्रोजेक्ट में और क्या चाहिए?',
  whatIsMissingNote: 'लोगो, फ़ोटो, विज्ञापन, वीडियो, संगीत या कोई दस्तावेज़: Weë का कोई भी एक्सपर्ट यहाँ कुछ जोड़ सकता है.',
  createSomethingNew: 'कुछ नया बनाएँ',
};
