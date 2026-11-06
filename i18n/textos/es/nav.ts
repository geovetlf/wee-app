/*
 * Los cinco destinos de la barra inferior.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const nav = {
  home: 'Inicio',
  search: 'Buscar',
  create: 'Crear',
  talk: 'WeeTalk',
  notifications: 'Notificaciones',
  current: 'sección actual',
  goTo: 'Ir a {{nombre}}',
  weeNavigation: 'Navegación de Weë',
  goHome: 'Ir al inicio',
  myProfile: 'Ir a mi perfil',
  openWeeAi: 'Abrir Weë AI',
  goToWeeAi: 'Ir a Weë AI',
  weeAiQuestion: '¿Qué quieres crear hoy?',
  weeAiPitch: 'Cuéntale a Weë lo que quieres. Weë se encarga de la IA.',
  /*
   * El eslogan de Weë, en la lengua de la interfaz (decisión del dueño, 2026-11-04: se localiza).
   * «Weë» no va dentro: es marca. Tres imperativos separados por « · ». Lo usan la firma del Home
   * (`components/Header.tsx`) y el título de la pestaña, que lo recibe por interpolación.
   * No confundir con `brain.slogan`, que es la frase de Weë Brain y va aparte.
   */
  brandSlogan: 'Imagina · Crea · Conecta',
  documentTitle: 'Weë - {{eslogan}}',
};
