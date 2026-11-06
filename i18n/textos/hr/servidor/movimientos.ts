/*
 * CROATA — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Plural one / few / other: por eso `ConPlurales`.
 */
import { ConPlurales } from '../../ru/plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'Prethodni saldo',
  bienvenida: 'Credits dobrodošlice',
  ajusteMenos: 'Prilagodba: koštalo je manje od rezerviranog',
  reembolsoFallida: 'Povrat za neuspjelo generiranje',
  compra: 'Kupnja Credits',
  regalo: 'Credits na dar',
  recargaPrueba: 'Probna nadoplata',
  compraRestaurada: 'Vraćena kupnja',
  reembolsoAdmin: 'Povrat od strane administracije',
  avatar: 'Weë avatar',
  fotoConAvatar: 'Fotografija s tvojim Weë avatarom',
  noSePudoTerminar: '{{base}} · nije se moglo dovršiti',
  brainBusqueda: 'Weë Brain · pretraživanje',
  brainRespuestas_one: 'Weë Brain · {{contador}} odgovor',
  brainRespuestas_few: 'Weë Brain · {{contador}} odgovora',
  brainRespuestas_other: 'Weë Brain · {{contador}} odgovora',
  brainNoPudo: 'Weë Brain · odgovor nije bio moguć',
  studioVideo: 'Weë Studio · video',
  studioSinTiempo: 'Weë Studio · prethodnom je pokušaju isteklo vrijeme',
  studioNoSePudo: 'Weë Studio · video se nije mogao generirati',
  studioMundo: 'Weë Studio · 3D svijet',
  studioMundoNoSePudo: 'Weë Studio · 3D svijet nije se mogao stvoriti',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · radnja nije dovršena',
  servicioAiImageLite: 'Standardna slika',
  servicioAiImageEnhanceLite: 'Standardno uređivanje',
  servicioAiImage: 'Generiranje slike',
  servicioAiImageEnhance: 'Uređivanje slike',
  servicioAiImagePro: 'Slika najveće preciznosti',
  servicioAiTryon: 'Isprobavanje odjeće',
  servicioAiVideoDraft: 'Video za pregled',
  servicioAiVideo: 'Generiranje videa',
  servicioAiVideoHd: 'Video visoke kvalitete',
  servicioAiVideoAdvanced: 'Napredni video',
  servicioAiVideoMax: 'Video najviše kvalitete',
  servicioAiVideoEdit: 'Montaža videa',
  servicioAiAudio: 'Generiranje glasa',
  servicioAiTranscribe: 'Transkripcija i titlovi',
  servicioAiMusic: 'Generiranje glazbe',
  servicioAiWorld: 'Generiranje 3D svijeta',
  servicioAiBrain: 'Odgovor Weë Brain',
  servicioAiText: 'Generiranje teksta',
  servicioAiTextPro: 'Dugi tekst najviše kvalitete',
  servicioAiSearch: 'Pretraživanje uz AI',
  servicioAiBook: 'Izrada knjige',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost objave',
  boostNoIniciado: 'Boost nije pokrenut',
  boostSinEntregas: 'Boost bez isporuka · sve je vraćeno',
};
