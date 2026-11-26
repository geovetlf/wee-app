/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — El selector de avatar (el mismo en cuatro pantallas).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. «Avatar» como imagen de perfil = «profilimut assi»; el avatar humano con IA = «inuusaq» (§4.14),
 * formación propia pendiente de confirmación nativa. Permisos con el molde «Akuersissut
 * pisariaqarpoq: <cosa>». El motivo del sistema ({{motivo}}) no pasa por aquí.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Profilimut assi toqqaruk',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Inuusaq inuttut isikkulik (AI)',
  aiTitle: 'Inuusara inuttut isikkulik pilersiguk',
  aiSubtitle: 'AI atorlugu kiinaq piviusuunngitsoq pilersiguk',

  photoSection: 'Assi namminermeersoq',
  takePhoto: 'Assiliigit',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Assi toqqaruk',
  fromGallery: 'Assinut toqqorsivimmit',

  avatarsSection: 'Profilimut assit',
  processing: 'Assi suliarineqarpoq…',

  galleryPermission: 'Akuersissut pisariaqarpoq: assinut toqqorsivik. Taamaalilluni assi toqqarsinnaavat.',
  cameraPermission: 'Akuersissut pisariaqarpoq: assiliut. Taamaalilluni assiliisinnaavutit.',
  pickFailed: 'Assip toqqarnera iluatsinngilaq. Misileqqiguk.',
  photoFailed: 'Assiliineq iluatsinngilaq',
  styleAdventurer: 'Misigisassarsiortoq',
  styleRobots: 'Robottit',
  styleSmile: 'Qungujulaarneq',
  stylePeople: 'Inuit',
};
