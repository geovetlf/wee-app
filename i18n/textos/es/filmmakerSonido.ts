/*
 * WEË FILMMAKER — «Personalizar voz y sonidos»: voces predeterminadas, subida de un tono de voz (cerrada), música y efectos como capas
 * y la herencia personaje → escena → cuadro. Las voces del catálogo son DE EJEMPLO hasta que el servidor entregue el catálogo real.
 */
export const filmmakerSonido = {
  title: 'Personalizar voz y sonidos',
  subCharacter: 'Todas sus escenas usarán esta voz. Podrás cambiarla escena por escena.',
  subScene: 'Esta escena usa la voz del personaje. Cámbiala solo aquí si quieres.',
  subShot: 'Este cuadro usa la voz de su escena. Cámbiala solo aquí si quieres.',
  forName: 'Para {{nombre}}',

  layerVoice: 'Voz',
  layerMusic: 'Música',
  layerEffects: 'Efectos de sonido',

  voiceAuto: 'Voz por defecto',
  voiceAutoNote: 'Weë elige la voz que mejor le queda.',
  voiceInherit: 'Usar la voz de {{origen}}',
  voiceInheritNow: 'Ahora suena: {{voz}}',
  originCharacter: 'el personaje',
  originScene: 'la escena',
  originAuto: 'Weë',
  selected: 'Elegida',

  filterLanguage: 'Idioma',
  filterTone: 'Tono',
  filterAll: 'Todos',
  langEs: 'Español',
  langEn: 'Inglés',
  langPt: 'Portugués',
  langFr: 'Francés',
  toneWarm: 'Cálida',
  toneDeep: 'Grave',
  toneClear: 'Clara',
  toneSoft: 'Suave',
  toneNarrator: 'Narrador',
  voiceCount_one: '{{contador}} voz',
  voiceCount_other: '{{contador}} voces',
  noMatch: 'No hay ninguna voz con ese idioma y tono.',
  clearFilters: 'Quitar filtros',

  exampleTag: 'Ejemplo',
  exampleNote: 'Estas voces son de ejemplo: el catálogo real aún no llega a la app.',
  sampleListen: 'Escuchar muestra de {{voz}}',
  sampleClosed: 'Cerrado: escuchar una muestra consume Credits y su precio está por confirmar.',

  uploadTitle: 'Subir archivo con un tono de voz',
  uploadClosed: 'Cerrado hasta que se autorice subir audio y usar tu propia voz con consentimiento. Weë no clona voces por ahora.',
  musicClosed: 'Cerrado: Weë Music aún no está conectada.',
  effectsClosed: 'Cerrado: los efectos de sonido aún no tienen proveedor ni precio medido.',

  priceTitle: 'Precio',
  priceUnknown: 'Precio por confirmar',
  priceNote: 'El coste en Credits aparecerá aquí cuando esté medido.',
  done: 'Listo',
};
