/*
 * HINDI — Weë Writer, dentro de Weë Studio: el editor y las herramientas que
 * trabajan el texto de la persona. Ese texto NUNCA pasa por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los «…Goal» son la petición que viaja a Weë Brain, y el código les pega
 * `: "extracto"` detrás: van en imperativo de आप («इस टेक्स्ट का अनुवाद करें») y
 * sin punto. «Documento» es दस्तावेज़ (m, glosario § 11.1) y «Mis documentos»,
 * «मेरे दस्तावेज़», como «मेरे प्रोजेक्ट»; «texto» es टेक्स्ट y «título», टाइटल,
 * como en Android. Acortar y alargar son la pareja «छोटा करें» / «लंबा करें», y
 * «Corregir» es «गलतियाँ सुधारें»: un सुधारें suelo se confundiría con «Mejorar»
 * (बेहतर बनाएँ), porque सुधार es también mejora.
 *
 * «Editado {{cuando}}» va como etiqueta —«एडिट किया गया: {{cuando}}»— porque
 * {{cuando}} lo escribe Intl («कल», «3 दिन पहले», «पिछला सप्ताह») y, delante del
 * verbo, algunas de esas formas tendrían que cambiar de caso. «शब्द» no cambia
 * con la cifra: «1 शब्द», «3 शब्द». Weë va en masculino singular («Weë … काम
 * करेगा») y la persona no concuerda con nada: «आपने जो लिखा है», «जब चाहें»,
 * «ताकि आप … कर सकें».
 *
 * «Weë lo trabaja contigo.» (weeWorksWithYou) es el cuerpo del aviso que se
 * titula «पहले कुछ लिखें» (writeSomethingFirst): por eso sigue esa frase con
 * «फिर Weë … करेगा.», que es también la segunda mitad de writeSomethingHint, el
 * mismo aviso en la web.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Weë से मदद लें',
  writeSomethingFirst: 'पहले कुछ लिखें',
  writeSomethingHint: 'पहले कुछ लिखें, फिर Weë आपके साथ उस पर काम करेगा.',
  save: 'सेव करें',
  saving: 'सेव हो रहा है…',
  deleteDocument: 'दस्तावेज़ मिटाएँ',
  improve: 'बेहतर बनाएँ',
  improveGoal: 'इस टेक्स्ट को बेहतर बनाएँ',
  shorten: 'छोटा करें',
  shortenGoal: 'ज़रूरी बातें रखते हुए इस टेक्स्ट को छोटा करें',
  expand: 'लंबा करें',
  expandGoal: 'इस टेक्स्ट को और विस्तार से लिखें',
  fix: 'गलतियाँ सुधारें',
  fixGoal: 'इस टेक्स्ट की स्पेलिंग और स्टाइल की गलतियाँ सुधारें',
  tone: 'टोन बदलें',
  toneGoal: 'इस टेक्स्ट को अलग टोन में फिर से लिखें',
  summarize: 'सारांश बनाएँ',
  summarizeGoal: 'इस टेक्स्ट की मुख्य बातें बताएँ',
  translate: 'अनुवाद करें',
  translateGoal: 'इस टेक्स्ट का अनुवाद करें',
  words_one: '{{contador}} शब्द',
  words_other: '{{contador}} शब्द',
  savedInDocuments: ' · मेरे दस्तावेज़ में सेव किया गया',
  couldNotSaveToDocuments: 'मेरे दस्तावेज़ में सेव नहीं किया जा सका',
  myDocuments: 'मेरे दस्तावेज़',
  newDocument: 'नया दस्तावेज़',
  noDocumentsYet: 'अभी तक कोई दस्तावेज़ नहीं है. नया दस्तावेज़ लिखें या Weë से कहें कि वह आपके लिए शुरुआत करे.',
  editedWhen: 'एडिट किया गया: {{cuando}}',
  titleLabel: 'दस्तावेज़ का टाइटल',
  bodyLabel: 'दस्तावेज़ का टेक्स्ट',
  editorTitle: '✍️ एडिटर',
  docTitlePlaceholder: 'दस्तावेज़ का टाइटल',
  bodyPlaceholder: 'यहाँ लिखें. जब चाहें, Weë से इसे बेहतर बनाने, इसकी गलतियाँ सुधारने या इसका अनुवाद करने को कहें.',
  resultHint: 'आपने जो लिखा है, Weë उस पर काम करता है और नतीजा यहीं दिखाता है, ताकि आप आगे एडिट कर सकें.',
  weeWorksWithYou: 'फिर Weë आपके साथ उस पर काम करेगा.',
  saved: '✓ सेव हो गया',
};
