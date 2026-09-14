/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra.
 *
 * QUÉ NO ENTRA AQUÍ: lo que representa al negocio de la persona —el nombre de
 * sus redes, sus arrobas, los títulos de sus publicaciones programadas y los
 * mensajes que le escriben sus clientes—. Eso es contenido, aunque hoy sea
 * simulado, y el día que sea real llegará del servidor sin pasar por el
 * traductor. Aquí solo están los rótulos que pone Weë.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const business = {
  mySocialAccounts: 'Mis redes sociales',
  manageAccounts: 'Gestionar cuentas',
  connected: 'Conectado',
  networkConnected: '{{red}} conectado',
  connectAnother: 'Conectar otra red',
  allConnected: 'Ya tienes todas tus redes conectadas.',
  simulatedConnection: 'Conexión simulada: Weë publicará y responderá de verdad cuando las redes habiliten sus permisos oficiales.',
  postCalendar: 'Calendario de publicaciones',
  seeFullCalendar: 'Ver calendario completo',
  calendarGoal: 'Ver y organizar mi calendario de publicaciones de la semana',
  scheduleGoal: 'Programar una publicación para el {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Mensajes de clientes',
  seeAllMessages: 'Ver todos',
  messagesGoal: 'Responder a los mensajes de mis clientes',
  reply: 'Responder',
  replied: 'Respondido',
  replyTo: 'Responder a {{nombre}}',
  repliedTo: 'Respondido a {{nombre}}',
  replyGoal: 'Responder a {{nombre}} en {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Resultados esta semana',
  statPosts: 'Publicaciones',
  statReach: 'Personas alcanzadas',
  statInteractions: 'Interacciones',
  statMessages: 'Mensajes recibidos',
  onTrack: 'Tu negocio va por buen camino',
  onTrackNote: 'Las interacciones aumentaron un 60% esta semana. ¡Sigue así!',
  seeDetailedAnalysis: 'Ver análisis detallado',
  analysisGoal: 'Analizar los resultados de mi negocio esta semana',
  shortcutIdeas: 'Ideas',
  shortcutIdeasGoal: 'Ideas y estrategia para hacer crecer mi negocio',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Una campaña de marketing para mi negocio',
  shortcutSocial: 'Redes sociales',
  shortcutSocialGoal: 'Crear contenido para las redes de mi negocio',
  shortcutAnalyze: 'Analizar',
  shortcutAnalyzeGoal: 'Analizar los resultados de mi negocio',
  shortcutDocuments: 'Documentos',
  shortcutDocumentsGoal: 'Redactar un documento para mi negocio',
  shortcutSell: 'Vender más',
  shortcutSellGoal: 'Vender más este mes en mi negocio',
  shortcutCareer: 'Trabajo y carrera',
  shortcutCareerGoal: 'Mejorar mi CV y mi perfil profesional',
  yesterday: 'Ayer',
};
