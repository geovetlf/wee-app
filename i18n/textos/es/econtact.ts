/*
 * ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const econtact = {
  requestsReceived: 'Solicitudes recibidas',
  requestsSent: 'Solicitudes enviadas',
  yours: 'Tus {{lista}}',
  yoursWhenYouSignIn: 'Tus {{lista}}, cuando entres',
  yoursWhenYouSignInSubtitle: '{{lista}} guarda tus conexiones de Weë. Inicia sesión para verlas.',
  noneYet: 'Todavía no tienes {{lista}}',
  noneYetSubtitle: 'Aquí estará tu gente en Weë. Una conexión se hace entre dos: una persona la propone y la otra acepta.',
  noAgenda: 'Este perfil no tiene agenda',
  noAgendaSubtitle: '{{lista}} es donde están tus conexiones con otras personas. Cambia a tu Perfil Real o a tu Perfil Weë para verlas.',
  wantsToConnect: '{{lista}} · quiere conectar contigo',
  accept: 'Aceptar a {{nombre}}',
  reject: 'Rechazar a {{nombre}}',
  withdraw: 'Retirar la solicitud a {{nombre}}',
  removeFrom: 'Eliminar a {{nombre}} de tus {{lista}}',
  openProfile: 'Abrir el {{etiqueta}} de {{nombre}}',
  rejectTitle: 'Rechazar solicitud',
  rejectConfirm: '¿Rechazar la solicitud de {{nombre}}?',
  withdrawTitle: 'Retirar solicitud',
  withdrawConfirm: '¿Retirar tu solicitud a {{nombre}}?',
  removeTitle: 'Eliminar {{lista}}',
  removeConfirm: '¿Eliminar a {{nombre}} de tus {{lista}}?',
  failed: 'No se pudo completar',
  count_one: '1 {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'esta persona',
  acceptLabel: 'Aceptar {{lista}}',
  rejectRequestLabel: 'Rechazar solicitud de {{lista}}',
  requestSent: 'Solicitud enviada',
  errSignIn: 'Inicia sesión para usar ËContact.',
  errNotYours: 'Ese perfil no es tuyo.',
  errNotAPerson: 'Ese perfil no puede usar ËContact.',
  errOffline: 'No se pudo conectar con Weë.',
  errNoRequestToReject: 'No hay ninguna solicitud tuya que rechazar.',
  errNoPendingRequest: 'No tienes ninguna solicitud pendiente con este perfil.',
  errNotConnected: 'No estás conectado con este perfil.',
  errNoActiveProfile: 'No hay ningún perfil activo con el que hacer esto.',
};
