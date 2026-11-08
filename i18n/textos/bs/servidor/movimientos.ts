/*
 * BOSNIO — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Plural one / few / other: por eso `ConPlurales`.
 */
import { ConPlurales } from '../../ru/plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'Prethodno stanje',
  bienvenida: 'Credits dobrodošlice',
  ajusteMenos: 'Prilagođavanje: koštalo je manje od rezervisanog',
  reembolsoFallida: 'Povrat za neuspjelo generisanje',
  compra: 'Kupovina Credits',
  regalo: 'Credits na poklon',
  recargaPrueba: 'Probna dopuna',
  compraRestaurada: 'Vraćena kupovina',
  reembolsoAdmin: 'Povrat od administracije',
  avatar: 'Weë avatar',
  fotoConAvatar: 'Fotografija s tvojim Weë avatarom',
  noSePudoTerminar: '{{base}} · nije se moglo dovršiti',
  brainBusqueda: 'Weë Brain · pretraga',
  brainRespuestas_one: 'Weë Brain · {{contador}} odgovor',
  brainRespuestas_few: 'Weë Brain · {{contador}} odgovora',
  brainRespuestas_other: 'Weë Brain · {{contador}} odgovora',
  brainNoPudo: 'Weë Brain · odgovor nije bio moguć',
  brainMuestra: 'Weë Brain · primjer odgovora, bez naplate',
  studioVideo: 'Weë Studio · video',
  studioSinTiempo: 'Weë Studio · prethodnom pokušaju je isteklo vrijeme',
  studioNoSePudo: 'Weë Studio · video se nije mogao generisati',
  studioMundo: 'Weë Studio · 3D svijet',
  studioMundoNoSePudo: 'Weë Studio · 3D svijet se nije mogao kreirati',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · radnja nije dovršena',
  servicioAiImageLite: 'Standardna slika',
  servicioAiImageEnhanceLite: 'Standardno uređivanje',
  servicioAiImage: 'Generisanje slike',
  servicioAiImageEnhance: 'Uređivanje slike',
  servicioAiImagePro: 'Slika najveće preciznosti',
  servicioAiTryon: 'Isprobavanje odjeće',
  servicioAiVideoDraft: 'Video za pregled',
  servicioAiVideo: 'Generisanje videa',
  servicioAiVideoHd: 'Video visokog kvaliteta',
  servicioAiVideoAdvanced: 'Napredni video',
  servicioAiVideoMax: 'Video najvišeg kvaliteta',
  servicioAiVideoEdit: 'Montaža videa',
  servicioAiAudio: 'Generisanje glasa',
  servicioAiTranscribe: 'Transkripcija i titlovi',
  servicioAiMusic: 'Generisanje muzike',
  servicioAiWorld: 'Generisanje 3D svijeta',
  servicioAiBrain: 'Odgovor Weë Brain',
  servicioAiText: 'Generisanje teksta',
  servicioAiTranslate: 'Prijevod',
  servicioAiTextPro: 'Dugi tekst najvišeg kvaliteta',
  servicioAiSearch: 'Pretraga uz AI',
  servicioAiBook: 'Izrada knjige',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost objave',
  boostNoIniciado: 'Boost nije pokrenut',
  boostSinEntregas: 'Boost bez isporuka · sve je vraćeno',
};
