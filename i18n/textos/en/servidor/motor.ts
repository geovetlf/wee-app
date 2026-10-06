/*
 * ENGLISH — Los errores controlados que el servidor de Weë AI y de Weë Brain devuelve a la app. Ver
 * `../../es/servidor/motor.ts`.
 *
 * `{{campo}}` y `{{archivo}}` se rellenan con las piezas `campo…` y `archivo…` de este mismo archivo, ya traducidas:
 * por eso `campo…` lleva su determinante («your message») y `archivo…` no («document»), que lo pone la frase. Weë no
 * nombra proveedores: donde el servidor dice «el proveedor», aquí se dice sin nombrarlo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Something is missing from your request. Check it and try again.',
  unauthorized: 'Sign in to create with Weë.',
  providerError: 'The AI couldn’t complete your creation this time. You weren’t charged: try again in a moment.',
  generationFailed: 'I couldn’t finish your creation. You weren’t charged: try again.',
  timeout: 'It took too long so I stopped it. You weren’t charged: try again.',
  rateLimited: 'You’ve made a lot of creations in a row. You weren’t charged: wait a moment and try again.',
  duplicate: 'That creation is already under way.',
  notAvailable: 'This feature isn’t available yet.',
  inputRejected: 'The photo or video couldn’t be used to create this: real faces and that kind of content aren’t accepted. Try another image or description.',
  faltaCampo: 'Please add {{campo}}.',
  revisaCampo: 'Check {{campo}}: it must be between 1 and {{max}} characters long.',
  campoMensaje: 'your message',
  campoDescripcionVideo: 'the video description',
  conversacionNoEncontrada: 'We couldn’t find this conversation.',
  sinPlan: 'This job doesn’t have a plan yet.',
  sinUnPlan: 'This job doesn’t have a plan yet.',
  yaTienePlan: 'This job already has a plan.',
  subeFoto: 'Upload a photo so Weë can work with it.',
  trabajoNoEncontrado: 'We couldn’t find this job.',
  trabajoAjeno: 'This job isn’t yours.',
  experienciaDesconocida: 'Unknown experience.',
  faltaTrabajo: 'The job is missing.',
  intentoSinTiempo: 'That attempt ran out of time, so I refunded your Credits. You can try again.',
  fotoDireccion: 'The link to the photo isn’t valid.',
  fotoSubir: 'The photo must be uploaded to Weë before it can be used.',
  fotoAjena: 'That photo isn’t yours.',
  archivoSube: 'Upload the {{archivo}} so Weë can read it.',
  archivoDireccion: 'The link to the {{archivo}} isn’t valid.',
  archivoSubir: 'The {{archivo}} must be uploaded to Weë before it can be used.',
  archivoAjeno: 'That {{archivo}} isn’t yours.',
  archivoDocumento: 'document',
  archivoAudio: 'audio file',
  sinTiempoAntes: 'This ran out of time before it started. You weren’t charged.',
  sinProveedor: 'There’s no AI available for this right now. Please try again later.',
  noDisponibleActualmente: 'This feature isn’t currently available.',
  noDisponibleAhora: 'This feature isn’t available at the moment. Try again in a little while.',
  noDisponibleRegion: 'This feature isn’t available in your region.',
  noDisponiblePais: 'To use this feature, add your country to your Real profile.',
  noDisponibleOpciones: 'This feature isn’t available with the options you chose. Try different ones.',
  describeVideo: 'Tell me what video you want to create.',
  creacionTerminada: 'That creation is already finished and won’t be made again. You’ll find it in your creations.',
  tomaInvalida: 'That take isn’t valid.',
  planoInvalido: 'That shot isn’t valid.',
  produccionNoEncontrada: 'We couldn’t find that production.',
  tomaNoGenerable: 'That take can’t be generated like this.',
  creacionNoEncontrada: 'We couldn’t find that creation.',
  debesIniciarSesion: 'You need to sign in',
};
