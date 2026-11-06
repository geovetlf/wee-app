/*
 * IRLANDÉS — Lo que contestan las Functions sociales: ËContact y encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana. Las marcas no mutan: «in ËContact».
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Níl iarratas ar bith le glacadh leis.',
  ecRelacionInvalida: 'Níl an t-iarratas seo bailí.',
  ecNoLaRecibiste: 'Ní féidir ach leis an duine a fuair an t-iarratas glacadh leis.',
  ecYaSonContactos: 'Is ËContacts sibh cheana.',
  ecIdentidadInvalida: 'Níl an phróifíl sin bailí.',
  ecIdentidadDesconocida: 'Níl an phróifíl sin ann.',
  ecIdentidadAjena: 'Ní leatsa an phróifíl sin.',
  ecMismaPersona: 'Ní féidir leat ceangal leat féin.',
  ecYaExiste: 'Tá caidreamh ann leis an bpróifíl seo cheana.',
  ecIniciaSesion: 'Logáil isteach chun ËContact a úsáid.',
  ecNoSeCompleto: 'Níorbh fhéidir an oibríocht a chríochnú. Bain triail eile as.',
  ecFaltaPerfilPropio: 'Níl sé luaite cén phróifíl lena gceanglaíonn tú.',
  ecFaltaPerfilAjeno: 'Tá an phróifíl le ceangal léi in easnamh.',
  ecFaltaPerfilQueAcepta: 'Níl sé luaite cén phróifíl lena nglacann tú leis.',
  ecFaltaPerfilQueEnvia: 'Tá próifíl an duine a sheol chugat é in easnamh.',
  encSinEncuesta: 'Níl pobalbhreith ag an bpostáil seo.',
  encInvalida: 'Níl an phobalbhreith seo bailí.',
  encAntigua: 'Is ó leagan níos sine de Weë an phobalbhreith seo agus ní ghlacann sí le vótaí a thuilleadh.',
  encOpcionInexistente: 'Níl an rogha sin sa phobalbhreith seo.',
  encCerrada: 'Tá an phobalbhreith seo thart.',
  encYaVotaste: 'Tá vóta caite agat sa phobalbhreith seo cheana.',
  encPostNoExiste: 'Níl an phostáil seo ann a thuilleadh.',
  encIniciaSesion: 'Ní mór duit logáil isteach chun vótáil.',
  encFaltaPublicacion: 'Tá an phostáil in easnamh.',
  encFaltaOpcion: 'Tá an rogha in easnamh.',
  encNoSeRegistro: 'Níorbh fhéidir do vóta a chlárú. Bain triail eile as.',
};
