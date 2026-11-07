/*
 * FILIPINO — Configuración (Mga setting): contenido, preferencias, privacidad, notificaciones,
 * información y cuenta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (`docs/I18N-FILIPINO.md` § 11): «Mga setting», «Mga notification»
 * y «Mga push notification» (el plural lo pone `mga`, nunca la «-s»), «Privacy» —la misma del pie del
 * menú ☰, porque el español dice «Privacidad» en los dos sitios— y «Patakaran sa privacy». La sección
 * de contenido y la de cuenta se quedan en «Content» y «Account» (§ 4: es lo que lee la gente en Android).
 * «Preferencias» es «Mga kagustuhan», como en Android en filipino. La ubicación es «lokasyon».
 *
 * LOS RÓTULOS DE SECCIÓN (la pantalla los pinta en versales) siguen una sola regla, la del § 4: palabra filipina
 * donde el glosario la da («MGA KAGUSTUHAN», «MGA NOTIFICATION», «IMPORMASYON») y préstamo donde el glosario fija el
 * préstamo («CONTENT», «PRIVACY», «ACCOUNT»: los tres están en la lista de lo que se queda en inglés del § 4, y son
 * los rótulos que un filipino ve en Facebook, YouTube y Android en filipino, que también mezclan «Display»,
 * «Storage» o «System» con secciones en filipino). «Nilalaman» se descarta para «Content» (glosario § 11.3, Android
 * 54 a 5): suena a índice de libro («Talaan ng nilalaman») y haría que el rótulo dijera otra palabra que el resto de
 * la app («content na ito», «Sekswal na content», «content ng ibang user»).
 *
 * La ubicación dice lo que de verdad hace: Weë usa la ubicación aproximada para sugerir lugares cercanos y
 * la zona («area», la palabra corriente) al agregar una ubicación a un post. «Tu ubicación exacta nunca se
 * muestra» es la frase del glosario (§ 11.8), en presente como el español: «Hindi kailanman ipinapakita…», la
 * misma que el aviso de permiso de iOS (`locales/fil.json`). `locationLine` empieza por el estado —una frase
 * que ya acaba en punto— y sigue con esa advertencia. `locationPermissionDenied` es el caso del § 12: dos frases cortas, verbo delante.
 *
 * El contador de comunidades es el del § 12: `{{contador}} komunidad na sinalihan` /
 * `{{contador}} na komunidad na sinalihan` (el enlace va tras la cifra, aunque luego haya otro `na`).
 * `signOutFailed` es el TÍTULO de un aviso: «Hindi natuloy ang pag-sign out», sin punto. Weë habla de sí
 * mismo con «namin» (exclusivo): «ang ginagawa namin sa data mo». «Todos los derechos reservados» es la
 * fórmula filipina «Nakalaan ang lahat ng karapatan». `aboutBody` conserva sus dos saltos dobles y
 * «Artificial Intelligence» entero, como el español; la frase va con el predicado delante y sin «ay».
 *
 * El panel del motor (solo administración) se llama «Weë AI Engine» en todos los idiomas: es el nombre
 * del producto (§ 6). Sembrar los valores por defecto es la fila de Administración del glosario
 * (§ 11.11): «I-seed ang mga default na value»; proveedor es «provider» y las cadenas, «chain». Borrar es
 * «I-delete» (nunca «Burahin»): «Walang ide-delete».
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Mga setting',
  sectionContent: 'Content',
  sectionPrivacy: 'Privacy',
  sectionPreferences: 'Mga kagustuhan',
  sectionSupport: 'Tulong',
  myCommunities: 'Mga komunidad ko',
  communitiesJoined_one: '{{contador}} komunidad na sinalihan',
  communitiesJoined_other: '{{contador}} na komunidad na sinalihan',
  privateReplies: 'Mga pribadong sagot',
  privateRepliesHint: 'Payagan ang iba na magpadala sa iyo ng mga pribadong mensahe',
  pushNotifications: 'Mga push notification',
  language: 'Wika',
  languageSubtitle: 'Piliin ang wika ng Weë',
  help: 'Tulong',
  privacyPolicy: 'Patakaran sa privacy',
  about: 'Tungkol sa Weë',
  signOut: 'Mag-sign out',
  signOutFailed: 'Hindi natuloy ang pag-sign out',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'I-seed ang mga default na value',
  seedDefaultsConfirm: 'Isusulat nito sa Firestore ang mga default na provider, chain at setting na wala pa. Walang ide-delete.',
  seed: 'I-seed',
  sectionNotifications: 'Mga notification',
  sectionInfo: 'Impormasyon',
  sectionAccount: 'Account',
  privacyPolicyHint: 'Kung ano ang ginagawa namin sa data mo, sa simpleng salita',
  pushNotificationsHint: 'Makatanggap ng notification tungkol sa mga bagong mensahe at aktibidad',
  aboutHint: 'Kung ano ang Weë at kung anong bersyon ang gamit mo',
  helpHint: 'Mga madalas itanong at paano makipag-ugnayan',
  signOutHint: 'Lumabas sa account mo',
  aboutBody: 'Ang Weë (World Encode Entity) ang social network para sa mga taong lumilikha gamit ang Artificial Intelligence.\n\nBersyon 1.0.0 · © {{anio}} Weë. Nakalaan ang lahat ng karapatan.\n\nHeograpikong data: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Lokasyon',
  locationLine: '{{estado}} Hindi kailanman ipinapakita sa publiko ang eksaktong lokasyon mo.',
  locationOff: 'Naka-off. Payagan ang Weë na gamitin ang tinatayang lokasyon mo para magmungkahi ng mga kalapit na lugar at ng area mo kapag nagdadagdag ka ng lokasyon sa isang post. Hindi kailanman ipinapakita sa publiko ang eksaktong lokasyon mo.',
  locationUnavailable: 'Hindi maibigay ng device na ito ang lokasyon mo.',
  locationDisabled: 'Naka-off ang lokasyon sa mga setting ng device mo.',
  locationPermissionDenied: 'Tumanggi ka sa system. I-tap dito para baguhin ito sa mga setting ng device mo.',
  locationPermissionNotDetermined: 'Hihingi ng pahintulot ang Weë kapag kailangan.',
  locationApproximate: 'Alam ng Weë ang area mo, pero hindi ang eksaktong puwesto.',
  locationPrecise: 'Puwedeng gamitin ng Weë ang detalyadong lokasyon mo kapag kailangan ito ng isang feature.',
};
