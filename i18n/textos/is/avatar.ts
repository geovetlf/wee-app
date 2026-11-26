/*
 * ISLANDÉS (is · is-IS) — el selector de avatar, el mismo en cuatro pantallas.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar» = «myndgervingur» (pl. «myndgervingar»), término de Íðorðabankinn; pendiente de confirmación
 * nativa frente al préstamo «avatar». Botones en infinitivo («Taka mynd», «Velja mynd»). Los estilos son
 * nombres de colecciones de dibujos: «Ævintýrafólk», «Vélmenni», «Bros», «Fólk».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Velja myndgerving',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Mannlegur myndgervingur með gervigreind',
  aiTitle: 'Búa til mannlegan myndgerving',
  aiSubtitle: 'Búðu til tilbúið andlit með gervigreind',

  photoSection: 'Eigin mynd',
  takePhoto: 'Taka mynd',
  pickImage: 'Velja mynd',
  fromGallery: 'Úr myndasafni',

  avatarsSection: 'Myndgervingar',
  processing: 'Vinnur úr mynd…',

  galleryPermission: 'Við þurfum aðgang að myndasafninu þínu til að velja mynd',
  cameraPermission: 'Við þurfum aðgang að myndavélinni þinni til að taka mynd',
  pickFailed: 'Ekki tókst að velja myndina. Reyndu aftur.',
  photoFailed: 'Ekki tókst að taka myndina',
  styleAdventurer: 'Ævintýrafólk',
  styleRobots: 'Vélmenni',
  styleSmile: 'Bros',
  stylePeople: 'Fólk',
};
