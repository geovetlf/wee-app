/*
 * HINDI — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`). `{{proposito}}` es el
 * paso en curso, que llega ya traducido. El progresivo concuerda con la cosa, no con quien habla.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'शुरू हो रहा है…',
  ajustandoVertical: 'आपका Weël वर्टिकल फ़ॉर्मैट में ढाला जा रहा है…',
  montando: 'आपका Weël तैयार किया जा रहा है…',
  generandoWeel: 'आपका Weël जनरेट हो रहा है…',
  creandoImagen: 'आपकी इमेज बन रही है…',
  grabandoVoz: 'आवाज़ रिकॉर्ड हो रही है…',
  efectosDeSonido: 'साउंड इफ़ेक्ट जोड़े जा रहे हैं…',
  componiendo: 'संगीत बन रहा है…',
  mirandoFoto: 'आपकी फ़ोटो देखी जा रही है…',
  preparandoDocumento: 'आपका दस्तावेज़ तैयार हो रहा है…',
  escribiendoGuion: 'स्क्रिप्ट लिखी जा रही है…',
  dividiendoEscenas: 'कहानी को सीन में बाँटा जा रहा है…',
  creandoSubtitulos: 'सबटाइटल बन रहे हैं…',
  escribiendo: 'लिखा जा रहा है…',
  paso: '{{proposito}}…',
  sinTiempo: 'समय खत्म हो गया. आपके Credits वापस कर दिए गए.',
  listo: '✨ तैयार है',
  fallaVideo: 'इस बार वीडियो जनरेट नहीं हो सका. आपके Credits नहीं काटे गए. थोड़ी देर बाद फिर से कोशिश करें.',
  fallaImagen: 'इस बार इमेज नहीं बन सकी. आपके Credits नहीं काटे गए. थोड़ी देर बाद फिर से कोशिश करें.',
  fallaGeneral: 'इस बार यह नहीं हो सका. आपके Credits नहीं काटे गए. थोड़ी देर बाद फिर से कोशिश करें.',
  fallaCorta: 'यह नहीं हो सका. आपके Credits नहीं काटे गए.',
};
