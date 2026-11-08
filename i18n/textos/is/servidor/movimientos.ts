/*
 * ISLANDÉS (is · is-IS) — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Conceptos breves como rótulos, sin punto final. `{{experiencia}}` es marca y no se traduce. «Credits» nunca se
 * declina: donde el español dice «Credits de…», el islandés usa compuesto con guion («Velkomin-Credits» no; se
 * reformula: «Credits í móttökugjöf»). «Saldo» es «inneign»; «reembolso», «endurgreiðsla».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'Fyrri inneign',
  bienvenida: 'Credits í móttökugjöf',
  ajusteMenos: 'Leiðrétting: kostaði minna en tekið var frá',
  reembolsoFallida: 'Endurgreiðsla vegna misheppnaðrar gerðar',
  compra: 'Kaup á Credits',
  regalo: 'Credits að gjöf',
  recargaPrueba: 'Prufuáfylling',
  compraRestaurada: 'Endurheimt kaup',
  reembolsoAdmin: 'Endurgreiðsla frá stjórnanda',
  avatar: 'Weë-myndgervingur',
  fotoConAvatar: 'Mynd með Weë-myndgervingnum þínum',
  noSePudoTerminar: '{{base}} · tókst ekki að ljúka',
  brainBusqueda: 'Weë Brain · leit',
  brainRespuestas_one: 'Weë Brain · {{contador}} svar',
  brainRespuestas_other: 'Weë Brain · {{contador}} svör',
  brainNoPudo: 'Weë Brain · gat ekki svarað',
  brainMuestra: 'Weë Brain · sýnishorn af svari, ekki rukkað',
  studioVideo: 'Weë Studio · myndband',
  studioSinTiempo: 'Weë Studio · fyrri tilraun rann út á tíma',
  studioNoSePudo: 'Weë Studio · ekki tókst að búa til myndbandið',
  studioMundo: 'Weë Studio · þrívíddarheimur',
  studioMundoNoSePudo: 'Weë Studio · ekki tókst að búa til þrívíddarheiminn',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · aðgerðinni lauk ekki',
  servicioAiImageLite: 'Venjuleg mynd',
  servicioAiImageEnhanceLite: 'Venjuleg myndvinnsla',
  servicioAiImage: 'Myndgerð',
  servicioAiImageEnhance: 'Myndvinnsla',
  servicioAiImagePro: 'Mynd í hámarksnákvæmni',
  servicioAiTryon: 'Fatamátun',
  servicioAiVideoDraft: 'Forskoðunarmyndband',
  servicioAiVideo: 'Myndbandsgerð',
  servicioAiVideoHd: 'Myndband í miklum gæðum',
  servicioAiVideoAdvanced: 'Ítarlegt myndband',
  servicioAiVideoMax: 'Myndband í hámarksgæðum',
  servicioAiVideoEdit: 'Myndbandsklipping',
  servicioAiAudio: 'Raddgerð',
  servicioAiTranscribe: 'Uppskrift og skjátextar',
  servicioAiMusic: 'Tónlistargerð',
  servicioAiWorld: 'Gerð þrívíddarheims',
  servicioAiBrain: 'Svar frá Weë Brain',
  servicioAiText: 'Textagerð',
  servicioAiTranslate: 'Þýðing',
  servicioAiTextPro: 'Langur texti í hámarksgæðum',
  servicioAiSearch: 'Leit með gervigreind',
  servicioAiBook: 'Bókargerð',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  boostReserva: 'Boost á færslu',
  boostNoIniciado: 'Boost hófst ekki',
  boostSinEntregas: 'Boost án birtinga · allt endurgreitt',
};
