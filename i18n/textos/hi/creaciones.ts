/*
 * HINDI — Mis creaciones (मेरी रचनाएँ): la biblioteca de material de la CUENTA y el progreso de un
 * trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una creación es «रचना» (f; pl. «रचनाएँ») y la biblioteca, «मेरी रचनाएँ» (glosario § 11.7, a
 * validar por el revisor nativo): la misma palabra en todo el diccionario. Los tipos son los del
 * glosario: «इमेज», «वीडियो», «ऑडियो», «दस्तावेज़», «टेक्स्ट»; «3D» es sigla. La experiencia que
 * trabaja entra por `{{nombre}}` y es marca: va de sujeto en masculino, como Weë y sus productos
 * («{{nombre}} काम कर रहा है»), o delante de «से» («{{nombre}} से बनाया गया»); la fecha, con el
 * patrón de etiqueta de la guía («बनाने की तारीख: {{fecha}}»). Los pasos se cuentan con «तैयार»,
 * que es invariable y vale igual con 1 que con 3. El orden es un conmutador que enseña el OTRO
 * orden: «सबसे नई» / «सबसे पुरानी», en femenino porque habla de las रचनाएँ. Los estados de una
 * creación concuerdan con ella («मिटाई गई», «सेव हो गई»); «Listo» es «तैयार», la forma del glosario
 * para una creación (el botón «Listo» de `common` es «हो गया»). «Publicar» es «पोस्ट करें» y
 * «Eliminar», «मिटाएँ»: se borra el archivo. La persona nunca recibe género: ergativo («आपने …
 * पोस्ट किया है»), subjuntivo («आप जो भी बनाएँ») o imperativo («चाहें तो … छोड़ दें»).
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'मेरी रचनाएँ',
  intro: 'Weë AI से बनाई गई आपकी सारी रचनाएँ, एक ही जगह पर. ये आपके खाते की हैं, इसलिए असली प्रोफ़ाइल और Weë प्रोफ़ाइल, दोनों में आपको यही रचनाएँ दिखती हैं.',

  filterAll: 'सभी',
  filterImages: 'इमेज',
  filterVideos: 'वीडियो',
  filterAudio: 'ऑडियो',
  filterDocuments: 'दस्तावेज़',
  filterModel3d: '3D',
  filterLabel: 'प्रकार के हिसाब से फ़िल्टर करें',

  sortRecent: 'सबसे नई',
  sortOldest: 'सबसे पुरानी',
  sortLabel: 'क्रम से लगाएँ',

  loading: 'आपकी रचनाएँ लोड हो रही हैं…',
  loadFailed: 'आपकी रचनाएँ लोड नहीं की जा सकीं.',
  retry: 'फिर से कोशिश करें',
  loadMore: 'और लोड करें',
  emptyTitle: 'अभी तक कोई रचना नहीं है',
  emptyText: 'Weë AI से आप जो भी बनाएँ, वह अपनी इमेज, वीडियो या ऑडियो के साथ यहाँ दिखेगा.',
  emptyAction: 'Weë AI से कुछ बनाएँ',
  emptyFiltered: 'इस प्रकार की कोई रचना नहीं है',
  count_one: '{{contador}} रचना',
  count_other: '{{contador}} रचनाएँ',

  statusUploading: 'अपलोड हो रहा है',
  statusProcessing: 'प्रोसेस हो रहा है',
  statusReady: 'तैयार',
  statusFailed: 'ठीक से नहीं बना',
  statusDeleted: 'मिटाई गई',
  pendingDeletion: 'फ़ाइल जल्द ही हटा दी जाएगी.',

  kindImage: 'इमेज',
  kindVideo: 'वीडियो',
  kindAudio: 'ऑडियो',
  kindDocument: 'दस्तावेज़',
  kindModel3d: '3D',
  kindText: 'टेक्स्ट',

  open: 'खोलें',
  openCreation: 'रचना खोलें: {{nombre}}',
  download: 'डाउनलोड करें',
  downloaded: 'आपकी गैलरी में सेव हो गया.',
  downloadFailed: 'इसे डाउनलोड नहीं किया जा सका. फिर से कोशिश करें.',
  downloadPermission: 'आपकी गैलरी में सेव करने के लिए, Weë को अनुमति चाहिए.',
  savedInCreations: 'आपकी रचनाओं में सेव हो गई',
  save: 'सेव करें',
  saved: 'सेव हो गई',
  useInProject: 'प्रोजेक्ट में इस्तेमाल करें',
  publish: 'पोस्ट करें',
  share: 'शेयर करें',
  delete: 'मिटाएँ',
  deleteConfirm: 'क्या आपको यह रचना मिटानी है? इसकी फ़ाइल मिट जाएगी. आपने जो पहले ही पोस्ट किया है, वह नहीं बदलेगा.',
  deleteConfirmWeb: 'क्या आपको यह रचना मिटानी है? इसकी फ़ाइल मिट जाएगी. आपने जो पहले ही पोस्ट किया है, वह नहीं बदलेगा.',
  deleted: 'रचना मिटा दी गई.',
  deleteFailed: 'इसे मिटाया नहीं जा सका. फिर से कोशिश करें.',
  createdWith: '{{nombre}} से बनाया गया',
  createdOn: 'बनाने की तारीख: {{fecha}}',

  progressWorking: '{{nombre}} काम कर रहा है',
  progressStarting: 'शुरू हो रहा है…',
  progressSteps: '{{total}} में से {{hechos}} चरण तैयार',
  progressFindLater: 'चाहें तो यह स्क्रीन छोड़ दें. तैयार होने पर यह आपको “मेरी रचनाएँ” में मिल जाएगा.',
};
