/*
 * HINDI — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = मिटाएँ, la misma palabra que el botón «Eliminar» (common.delete); el devanagari no tiene mayúsculas.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'खाता मिटाएँ',
  sectionDanger: 'खतरे का क्षेत्र',
  title: 'खाता मिटाएँ',
  goesFaces: 'आपकी सभी प्रोफ़ाइलें: आपकी असली प्रोफ़ाइल और आपके ऑल्टर ईगो',
  goesCharacter: 'आपका किरदार और उसका अवतार',
  goesPosts: 'आपकी पोस्ट, कमेंट और रिएक्शन',
  goesMessages: 'WeeTalk पर आपके मैसेज: वे खाली हो जाएँगे, और दूसरे व्यक्ति की बातचीत उनके बिना रह जाएगी',
  goesCreations: 'Weë AI में आपकी रचनाएँ, प्रोजेक्ट और बातचीत',
  goesContacts: 'आपके कॉन्टैक्ट, कम्यूनिटी और सेव की गई पोस्ट',
  goesCredits: 'आपके बचे हुए Credits: वे खत्म हो जाएँगे और वापस नहीं मिलेंगे',
  whatStaysTitle: 'क्या रखा जाएगा',
  staysRecords: 'Credits और भुगतानों के हिसाब-किताब के रिकॉर्ड. ये आपके नाम या प्रोफ़ाइल की जानकारी के बिना रखे जाते हैं, क्योंकि ये Weë का हिसाब-किताब हैं.',
  confirmLabel: 'पुष्टि करने के लिए “{{palabra}}” लिखें',
  confirmWord: 'मिटाएँ',
  confirmPlaceholder: 'शब्द यहाँ लिखें',
  dialogTitle: 'अपना खाता मिटाएँ?',
  dialogConfirm: 'मिटाएँ',
  doneTitle: 'आपका खाता मिट गया',
  doneBody: 'Weë का हिस्सा बनने के लिए धन्यवाद.',
  reauthTitle: 'फिर से साइन इन करें',
  reauthBody: 'आपकी सुरक्षा के लिए, खाता मिटाने के लिए ज़रूरी है कि आपने हाल ही में साइन इन किया हो. साइन आउट करें, फिर से साइन इन करें और ये कदम दोहराएँ.',
  reauthButton: 'फिर से साइन इन करने के लिए साइन आउट करें',
  errorTitle: 'पूरा नहीं हो सका',
  errorBody: 'बीच में कुछ गड़बड़ हो गई. फिर से कोशिश करें: यह वहीं से शुरू होगा जहाँ रुका था.',
  retry: 'फिर से कोशिश करें',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'खाता बंद हो जाता है और 30 दिन बाद सब कुछ मिट जाता है',
  introDesactivar: 'आपका खाता अभी बंद हो जाएगा, और अगर आप 30 दिन के भीतर नहीं लौटते, तो सब कुछ हमेशा के लिए मिट जाएगा.',
  nowTitle: 'अब क्या होगा',
  nowHidden: 'आपका खाता दिखना बंद हो जाएगा: कोई भी आपकी प्रोफ़ाइल या पोस्ट नहीं देख पाएगा',
  nowCharacterOff: 'आपके किरदार की स्वायत्तता बंद हो जाएगी और उसका शुल्क लगना रुक जाएगा',
  nowComeBack_one: 'लौटने के लिए आपके पास {{contador}} दिन है: फिर से साइन इन करें और “खाता चालू करें” चुनें',
  nowComeBack_other: 'लौटने के लिए आपके पास {{contador}} दिन हैं: फिर से साइन इन करें और “खाता चालू करें” चुनें',
  whatGoesLaterTitle: 'अगर आप नहीं लौटते, तो क्या मिटेगा',
  deactivateButton: 'मेरा खाता मिटाएँ',
  dialogBodyDesactivar: 'आपका खाता दिखना बंद हो जाएगा. अगर आप 30 दिन के भीतर नहीं लौटते, तो सब कुछ मिट जाएगा और आप उसे वापस नहीं पा सकेंगे.',
  deactivating: 'आपका खाता बंद किया जा रहा है…',
  deactivatedTitle: 'आपका खाता बंद है',
  deactivatedBody: 'लौटने के लिए आपके पास {{fecha}} तक का समय है. उसके बाद सब कुछ हमेशा के लिए मिट जाएगा.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'आपका खाता बंद है',
  activarBody: 'आपने अपना खाता मिटाने के लिए कहा था. जब तक यह बंद है, कोई भी आपकी प्रोफ़ाइल या पोस्ट नहीं देख सकता.',
  activarDaysLeft_one: 'हमेशा के लिए मिटने में {{contador}} दिन बाकी है',
  activarDaysLeft_other: 'हमेशा के लिए मिटने में {{contador}} दिन बाकी हैं',
  activarDate: 'अगर आप इसे चालू नहीं करते, तो यह {{fecha}} को हमेशा के लिए मिट जाएगा.',
  activarCharacterNote: 'आपके किरदार की स्वायत्तता बंद रहेगी; आप जब चाहें उसे फिर से शेड्यूल कर सकते हैं.',
  activarButton: 'खाता चालू करें',
  activating: 'आपका खाता चालू किया जा रहा है…',
  activatedTitle: 'आपका खाता फिर से चालू है',
  activarExpiredTitle: 'लौटने का समय खत्म हो गया',
  activarExpiredBody: 'अगले कुछ घंटों में आपका खाता पूरी तरह मिट जाएगा.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'आपके बचे हुए {{creditos}} Credits: वे खत्म हो जाएँगे और वापस नहीं मिलेंगे',
};
