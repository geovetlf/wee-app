/*
 * Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Lenguaje simple y verdadero: qué se borra, qué se queda y que no se puede
 * deshacer. No se promete nada que el servidor no haga (ver
 * `functions/src/cuenta/borrado.ts`), y no se habla de leyes.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar: se
 * traduce, porque al servidor no viaja la palabra sino una constante.
 *
 * Este archivo es el MOLDE: añadir una clave aquí y olvidarla en inglés no compila.
 */
/*
 * 2026-11-22 · «30 días y luego se borra»: «Eliminar cuenta» ya no borra en el
 * acto, DESACTIVA; la persona tiene 30 días para volver con su contraseña y
 * después se borra todo. Las claves de esta ronda van al final. Las que ya no
 * se usaban (settingsRowHint, intro, whatGoesTitle, deleteButton, dialogBody,
 * deleting, deletingHint) se quitaron de los 42 idiomas el mismo día.
 */
export const cuenta = {
  settingsRow: 'Eliminar cuenta',
  sectionDanger: 'Zona de peligro',
  title: 'Eliminar cuenta',
  goesFaces: 'Todos tus perfiles: tu Perfil Real y tus alter egos',
  goesCharacter: 'Tu personaje y su avatar',
  goesPosts: 'Tus publicaciones, comentarios y reacciones',
  goesMessages: 'Tus mensajes de WeeTalk: se vacían, y la conversación de la otra persona se queda sin ellos',
  goesCreations: 'Tus creaciones, proyectos y conversaciones de Weë AI',
  goesContacts: 'Tus contactos, comunidades y guardados',
  goesCredits: 'Los Credits que te queden: se pierden y no se devuelven',
  whatStaysTitle: 'Qué se conserva',
  staysRecords: 'Los registros contables de Credits y pagos. Se guardan sin tu nombre ni los datos de tu perfil, porque son la contabilidad de Weë.',
  confirmLabel: 'Para confirmar, escribe «{{palabra}}»',
  confirmWord: 'ELIMINAR',
  confirmPlaceholder: 'Escribe la palabra aquí',
  dialogTitle: '¿Eliminar tu cuenta?',
  dialogConfirm: 'Eliminar',
  doneTitle: 'Tu cuenta se eliminó',
  doneBody: 'Gracias por haber sido parte de Weë.',
  reauthTitle: 'Vuelve a iniciar sesión',
  reauthBody: 'Por seguridad, para eliminar la cuenta tienes que haber entrado hace poco. Cierra sesión, vuelve a entrar y repite estos pasos.',
  reauthButton: 'Cerrar sesión para volver a entrar',
  errorTitle: 'No se pudo terminar',
  errorBody: 'Algo falló a mitad de camino. Vuelve a intentarlo: se retomará donde se quedó.',
  retry: 'Intentar de nuevo',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Se desactiva y, a los 30 días, se borra todo',
  introDesactivar: 'Tu cuenta se desactiva ahora y, si no vuelves en 30 días, se borra todo para siempre.',
  nowTitle: 'Qué pasa ahora',
  nowHidden: 'Tu cuenta deja de verse: nadie verá tus perfiles ni tus publicaciones',
  nowCharacterOff: 'La autonomía de tu personaje se apaga y deja de cobrar',
  nowComeBack_one: 'Tienes {{contador}} día para volver: inicia sesión de nuevo y elige «Activar cuenta»',
  nowComeBack_other: 'Tienes {{contador}} días para volver: inicia sesión de nuevo y elige «Activar cuenta»',
  whatGoesLaterTitle: 'Qué se borra si no vuelves',
  deactivateButton: 'Eliminar mi cuenta',
  dialogBodyDesactivar: 'Tu cuenta dejará de verse. Si no vuelves en 30 días, se borrará todo y no podrás recuperarlo.',
  deactivating: 'Desactivando tu cuenta…',
  deactivatedTitle: 'Tu cuenta está desactivada',
  deactivatedBody: 'Tienes hasta el {{fecha}} para volver. Después se borrará todo para siempre.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Tu cuenta está desactivada',
  activarBody: 'Pediste eliminar tu cuenta. Mientras esté desactivada, nadie ve tus perfiles ni tus publicaciones.',
  activarDaysLeft_one: 'Queda {{contador}} día para el borrado definitivo',
  activarDaysLeft_other: 'Quedan {{contador}} días para el borrado definitivo',
  activarDate: 'Si no la activas, se borrará para siempre el {{fecha}}.',
  activarCharacterNote: 'La autonomía de tu personaje seguirá apagada; puedes volver a programarla cuando quieras.',
  activarButton: 'Activar cuenta',
  activating: 'Activando tu cuenta…',
  activatedTitle: 'Tu cuenta vuelve a estar activa',
  activarExpiredTitle: 'El plazo para volver terminó',
  activarExpiredBody: 'Tu cuenta se borrará del todo en las próximas horas.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Los {{creditos}} Credits que te quedan: se pierden y no se devuelven',
};
