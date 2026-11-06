/*
 * HINDI — Las notificaciones push (ver `../../es/servidor/avisos.ts`). El NOMBRE de quien la provoca entra como valor
 * y no se traduce; cada aviso es un ergativo con «ने» para no suponer su género (docs/I18N-HINDI.md § 5.2).
 * `fotoUnica`, `imagen` y `audio` dicen lo mismo que `weetalk.photoOnce`, `imagePreview` y `audioPreview`.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'आपकी पोस्ट किसी को पसंद आई',
  likeCuerpo: '{{nombre}} ने आपकी पोस्ट पसंद की',
  comentarioTitulo: 'नई टिप्पणी',
  comentarioCuerpo: '{{nombre}} ने आपकी पोस्ट पर टिप्पणी की',
  seguidorTitulo: 'नया फ़ॉलोअर',
  seguidorCuerpo: '{{nombre}} ने आपको फ़ॉलो करना शुरू किया',
  solicitudTitulo: 'नया ËContact अनुरोध',
  solicitudCuerpo: '{{nombre}} ने आपको ËContact में जोड़ने का अनुरोध भेजा है',
  aceptadaTitulo: 'नया ËContact',
  aceptadaCuerpo: '{{nombre}} ने आपका ËContact अनुरोध स्वीकार किया',
  mencionTitulo: 'किसी ने आपको मेंशन किया',
  mencionCuerpo: '{{nombre}} ने एक पोस्ट में आपको मेंशन किया',
  repostTitulo: 'नया रीपोस्ट',
  repostCuerpo: '{{nombre}} ने आपकी पोस्ट रीपोस्ट की',
  respuestaTitulo: 'नया जवाब',
  respuestaCuerpo: '{{nombre}} ने आपकी टिप्पणी का जवाब दिया',
  mensajeTitulo: 'नया मैसेज',
  mensajeCuerpo: '{{nombre}} ने आपको एक मैसेज भेजा',
  alguien: 'कोई',
  teEnvioUnMensaje: 'आपको एक मैसेज मिला है',
  fotoUnica: 'एक बार देखने वाली फ़ोटो',
  imagen: '📷 फ़ोटो',
  audio: '🎤 वॉइस मैसेज',
};
