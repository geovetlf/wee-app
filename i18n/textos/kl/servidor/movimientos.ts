/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — el concepto de cada movimiento del historial de Credits
 * (ver `../../es/servidor/movimientos.ts`). Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés. «Credits» es marca: nunca se traduce ni lleva sufijo; va en absolutivo con un
 * modificador detrás («Credits tunissutit», Credits de regalo). Las marcas de Weë (Weë Brain, Weë Studio,
 * WEË AI) quedan intactas y separadas por «·». Los conceptos son sustantivos de acción en -neq
 * («…mik pilersitsineq» generación de …). Saldo = «sinneruttut»; reembolso = «akiliutip utertinnera»
 * (glosario, baja-pendiente). «3D» es sigla y admite sufijo con guion. Casi todo «pendiente de confirmación nativa».
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'Siornatigut sinneruttut',
  bienvenida: 'Credits tikilluaqqusiutit',
  ajusteMenos: 'Aaqqiineq: akia immikkoortitamit annikinnerusoq',
  reembolsoFallida: 'Akiliutip utertinnera: pilersitsineq iluatsinngitsoq',
  compra: 'Credits pisiarineqartut',
  regalo: 'Credits tunissutit',
  recargaPrueba: 'Misiligutitut amerlisaaneq',
  compraRestaurada: 'Pisineq uteqqitaq',
  reembolsoAdmin: 'Akiliutip utertinnera: aqutsisut',
  avatar: 'Inuusaq Weë',
  fotoConAvatar: 'Assi, inuusat Weë atorlugu',
  noSePudoTerminar: '{{base}} · naammassineq iluatsinngilaq',
  brainBusqueda: 'Weë Brain · ujarlerneq',
  brainRespuestas_one: 'Weë Brain · {{contador}} akissut',
  brainRespuestas_other: 'Weë Brain · {{contador}} akissutit',
  brainNoPudo: 'Weë Brain · akisinnaanngilaq',
  brainMuestra: 'Weë Brain · akissut assersuut, akiliisitsinani',
  studioVideo: 'Weë Studio · videoliorneq',
  studioSinTiempo: 'Weë Studio · misiliinermi kingullermi piffissaq naammanngilaq',
  studioNoSePudo: 'Weë Studio · videoliorneq iluatsinngilaq',
  studioMundo: 'Weë Studio · silarsuaq 3D-mik',
  studioMundoNoSePudo: 'Weë Studio · silarsuarmik 3D-mik pilersitsineq iluatsinngilaq',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · suliaq naammassineqanngilaq',
  servicioAiImageLite: 'Assi nalinginnaasoq',
  servicioAiImageEnhanceLite: 'Aaqqissuineq nalinginnaasoq',
  servicioAiImage: 'Assimik pilersitsineq',
  servicioAiImageEnhance: 'Assip aaqqissuunnera',
  servicioAiImagePro: 'Assi eqqoqqissaarnerpaaq',
  servicioAiTryon: 'Atisanik misiliineq',
  servicioAiVideoDraft: 'Video siumut takusassaq',
  servicioAiVideo: 'Videomik pilersitsineq',
  servicioAiVideoHd: 'Video pitsaassusia qaffasissoq',
  servicioAiVideoAdvanced: 'Video siuarsimasoq',
  servicioAiVideoMax: 'Video pitsaanerpaaq',
  servicioAiVideoEdit: 'Videop aaqqissuunnera',
  servicioAiAudio: 'Nipimik pilersitsineq',
  servicioAiTranscribe: 'Oqaatsit allanneqarnerat ataanilu allagaq',
  servicioAiMusic: 'Nipilersornermik pilersitsineq',
  servicioAiWorld: 'Silarsuarmik 3D-mik pilersitsineq',
  servicioAiBrain: 'Akissut: Weë Brain',
  servicioAiText: 'Allagamik pilersitsineq',
  servicioAiTextPro: 'Allagaq takisoq pitsaanerpaaq',
  servicioAiSearch: 'AI atorlugu ujarlerneq',
  servicioAiBook: 'Atuagaliorneq',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  boostReserva: 'Boost: saqqummiussaq',
  boostNoIniciado: 'Boost aallartinneqanngilaq',
  boostSinEntregas: 'Boost takutinneqanngilaq · tamarmi utertinneqarpoq',
};
