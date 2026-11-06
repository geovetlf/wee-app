/*
 * RUMANO — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * «Credits» es marca, sin artículo pegado. `brainRespuestas` lleva las tres formas del rumano: por eso `ConPlurales`.
 */
import { ConPlurales } from '../../ru/plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'Sold anterior',
  bienvenida: 'Credits de bun venit',
  ajusteMenos: 'Ajustare: a costat mai puțin decât suma rezervată',
  reembolsoFallida: 'Rambursare pentru o generare eșuată',
  compra: 'Cumpărare de Credits',
  regalo: 'Credits cadou',
  recargaPrueba: 'Reîncărcare de probă',
  compraRestaurada: 'Cumpărare restabilită',
  reembolsoAdmin: 'Rambursare din partea administrației',
  avatar: 'Avatar Weë',
  fotoConAvatar: 'Fotografie cu avatarul tău Weë',
  noSePudoTerminar: '{{base}} · nu a putut fi finalizat',
  brainBusqueda: 'Weë Brain · căutare',
  brainRespuestas_one: 'Weë Brain · {{contador}} răspuns',
  brainRespuestas_few: 'Weë Brain · {{contador}} răspunsuri',
  brainRespuestas_other: 'Weë Brain · {{contador}} de răspunsuri',
  brainNoPudo: 'Weë Brain · nu a putut răspunde',
  studioVideo: 'Weë Studio · videoclip',
  studioSinTiempo: 'Weë Studio · la încercarea anterioară a expirat timpul',
  studioNoSePudo: 'Weë Studio · videoclipul nu a putut fi generat',
  studioMundo: 'Weë Studio · lume 3D',
  studioMundoNoSePudo: 'Weë Studio · lumea 3D nu a putut fi creată',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · operațiunea nu s-a finalizat',
  servicioAiImageLite: 'Imagine standard',
  servicioAiImageEnhanceLite: 'Editare standard',
  servicioAiImage: 'Generare de imagine',
  servicioAiImageEnhance: 'Editare de imagine',
  servicioAiImagePro: 'Imagine de precizie maximă',
  servicioAiTryon: 'Probă de haine',
  servicioAiVideoDraft: 'Videoclip de previzualizare',
  servicioAiVideo: 'Generare de videoclip',
  servicioAiVideoHd: 'Videoclip de calitate înaltă',
  servicioAiVideoAdvanced: 'Videoclip avansat',
  servicioAiVideoMax: 'Videoclip de calitate maximă',
  servicioAiVideoEdit: 'Montaj video',
  servicioAiAudio: 'Generare de voce',
  servicioAiTranscribe: 'Transcriere și subtitrări',
  servicioAiMusic: 'Generare de muzică',
  servicioAiWorld: 'Generare de lume 3D',
  servicioAiBrain: 'Răspuns de la Weë Brain',
  servicioAiText: 'Generare de text',
  servicioAiTextPro: 'Text lung de calitate maximă',
  servicioAiSearch: 'Căutare cu IA',
  servicioAiBook: 'Creare de carte',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost pentru o postare',
  boostNoIniciado: 'Boost neînceput',
  boostSinEntregas: 'Boost fără afișări · s-a returnat tot',
};
