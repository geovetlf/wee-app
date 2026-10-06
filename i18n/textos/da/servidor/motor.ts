/*
 * DANÉS — Los errores controlados que el servidor de Weë AI y de Weë Brain devuelve a la app.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las frases que el español repite en otros módulos se dicen aquí con las MISMAS palabras danesas:
 * `unauthorized`, `timeout` y `duplicate` son `weeai.errSignIn`, `errTimeout` y `errDuplicate`; `subeFoto`
 * es `weeai.uploadToWork`. Los errores siguen la guía (§ 2 y § 8): frase completa, sin culpar, y el paso
 * siguiente, «Prøv igen». El dinero, como en `weeai.ts`: «No te cobré» es «Der er ikke trukket nogen
 * Credits», «te devolví los Credits» es «du har fået dine Credits tilbage», y «se quedó sin tiempo», «tiden
 * løb ud». «No encontramos…» es «Vi kunne ikke finde …», como `filmmaker.perProductionNotFound` y
 * `wall.postNotFound`.
 *
 * Un trabajo de Weë AI es «opgave» (como en `weeai.errNotEnoughCredits`: «til denne opgave»); una
 * experiencia, «oplevelse»; una creación, «kreation» (glosario § 9.1). En Weë Filmmaker la toma es
 * «version» y el plano, «klip» (glosario § 9.6). La «dirección» de un archivo es su URL: «link».
 *
 * EL PROVEEDOR NO SE NOMBRA. Weë nunca le enseña a la persona quién genera por debajo, así que
 * `providerError` habla de «AI-tjenesten» (el servicio de IA, sin nombre ni artículo pegado a la sigla),
 * `sinProveedor` dice que no hay ninguna AI disponible, e `inputRejected` cuenta en pasiva que los rostros
 * reales y ese contenido «no se aceptan», sin decir quién no los acepta ni inventar detalles.
 *
 * HUECOS QUE SE RELLENAN CON PIEZAS DE ESTE MISMO MÓDULO. `{{campo}}` recibe `campoMensaje` («din besked») o
 * `campoDescripcionVideo` («beskrivelsen af videoen»), y `{{archivo}}`, `archivoDocumento` («dokumentet») o
 * `archivoAudio` («lydfilen»): siempre en forma definida, que funciona en mitad de cualquier frase. Por eso
 * ninguna frase empieza por el hueco (quedaría en minúscula) y ninguna le pega un pronombre o un adjetivo
 * que dependa del género: «dokumentet» es neutro y «lydfilen» común, así que «så Weë kan læse indholdet» en
 * vez de «læse det/den», y «Du ejer ikke {{archivo}}» en vez de «er ikke dit/din» (guía § 2).
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Der mangler noget. Tjek det, du har bedt om, og prøv igen.',
  unauthorized: 'Log ind for at skabe med Weë.',
  providerError: 'AI-tjenesten kunne ikke gøre din kreation færdig denne gang. Der er ikke trukket nogen Credits. Prøv igen om et øjeblik.',
  generationFailed: 'Jeg kunne ikke gøre din kreation færdig. Der er ikke trukket nogen Credits. Prøv igen.',
  timeout: 'Det tog for lang tid, så jeg stoppede det. Der er ikke trukket nogen Credits. Prøv igen.',
  rateLimited: 'Du har lavet mange kreationer i træk. Der er ikke trukket nogen Credits. Vent et øjeblik, og prøv igen.',
  duplicate: 'Den kreation er allerede i gang.',
  notAvailable: 'Denne funktion er ikke tilgængelig endnu.',
  inputRejected: 'Fotoet eller videoen kunne ikke bruges, fordi ægte ansigter og den slags indhold ikke accepteres. Prøv med et andet billede eller en anden beskrivelse.',
  faltaCampo: 'Du mangler at skrive {{campo}}.',
  revisaCampo: 'Tjek {{campo}}: Der skal være mellem 1 og {{max}} tegn.',
  campoMensaje: 'din besked',
  campoDescripcionVideo: 'beskrivelsen af videoen',
  conversacionNoEncontrada: 'Vi kunne ikke finde denne samtale.',
  sinPlan: 'Denne opgave har ingen plan endnu.',
  sinUnPlan: 'Denne opgave har ikke fået en plan endnu.',
  yaTienePlan: 'Denne opgave har allerede en plan.',
  subeFoto: 'Upload et foto, så Weë kan arbejde med det.',
  trabajoNoEncontrado: 'Vi kunne ikke finde denne opgave.',
  trabajoAjeno: 'Denne opgave er ikke din.',
  experienciaDesconocida: 'Ukendt oplevelse.',
  faltaTrabajo: 'Opgaven mangler.',
  intentoSinTiempo: 'Tiden løb ud for det forsøg, og du har fået dine Credits tilbage. Du kan prøve igen.',
  fotoDireccion: 'Linket til fotoet er ikke gyldigt.',
  fotoSubir: 'Du skal først uploade fotoet til Weë.',
  fotoAjena: 'Det foto er ikke dit.',
  archivoSube: 'Upload {{archivo}}, så Weë kan læse indholdet.',
  archivoDireccion: 'Linket til {{archivo}} er ikke gyldigt.',
  archivoSubir: 'Du skal først uploade {{archivo}} til Weë.',
  archivoAjeno: 'Du ejer ikke {{archivo}}.',
  archivoDocumento: 'dokumentet',
  archivoAudio: 'lydfilen',
  sinTiempoAntes: 'Tiden løb ud, før det gik i gang. Der er ikke trukket nogen Credits.',
  sinProveedor: 'Lige nu er der ingen tilgængelig AI til det her. Prøv igen senere.',
  noDisponibleActualmente: 'Denne funktion er ikke tilgængelig i øjeblikket.',
  noDisponibleAhora: 'Denne funktion er ikke tilgængelig lige nu. Prøv igen om lidt.',
  noDisponibleRegion: 'Denne funktion er i øjeblikket ikke tilgængelig i din region.',
  noDisponiblePais: 'For at bruge denne funktion skal du angive dit land i din Ægte profil.',
  noDisponibleOpciones: 'Denne funktion er ikke tilgængelig med de valg, du har truffet. Prøv nogle andre.',
  describeVideo: 'Fortæl mig, hvilken video du vil lave.',
  creacionTerminada: 'Den kreation er allerede færdig og bliver ikke lavet igen. Du finder den i ”Mine kreationer”.',
  tomaInvalida: 'Den version er ikke gyldig.',
  planoInvalido: 'Det klip er ikke gyldigt.',
  produccionNoEncontrada: 'Vi kunne ikke finde den produktion.',
  tomaNoGenerable: 'Den version kan ikke genereres på den måde.',
  creacionNoEncontrada: 'Vi kunne ikke finde den kreation.',
  debesIniciarSesion: 'Du skal logge ind',
};
