/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — los errores controlados del servidor de Weë AI y Weë Brain
 * (ver `../../es/servidor/motor.ts`). Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés. Moldes de la guía (docs/I18N-GROENLANDES.md §2.5): «<acción>-neq iluatsinngilaq»,
 * «X nassaarineqanngilaq» (no encontramos X), «Amigaataavoq: X» (falta X), «Akiliisinneqanngilatit» (no te cobré),
 * «Misileqqiguk» (inténtalo de nuevo). Los huecos `{{campo}}` y `{{archivo}}` van en absolutivo como objeto
 * («{{archivo}} ikkuguk») o tras dos puntos, nunca con sufijo. «Weë» nunca lleva sufijo: va como sujeto de un
 * verbo intransitivo («Weë atuarsinnaassaaq») o con «atorlugu» (usando Weë). «AI» es sigla y admite sufijo con guion.
 * «Periarfissaq» = función/posibilidad. Casi todo «pendiente de confirmación nativa».
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Qinnutinni arlaat amigaataavoq. Misissoruk misileqqigullu.',
  unauthorized: 'Weë atorlugu pilersitsiniaruit iserit.',
  accountRequired: 'Weë AI atorlugu imarisanik pilersitsiniaruit iserit imaluunniit konto pilersiguk.',
  providerError: 'Maanna AI-p pilersitat naammassisinnaanngilaa. Akiliisinneqanngilatit: kinguninngua misileqqiguk.',
  generationFailed: 'Pilersitat naammassineqarnera iluatsinngilaq. Akiliisinneqanngilatit: misileqqiguk.',
  timeout: 'Sivisuallaarmat unitsippara. Akiliisinneqanngilatit: misileqqiguk.',
  rateLimited: 'Pilersitsinerit amerlavallaartut tulleriiaarlugit pilersippatit. Akiliisinneqanngilatit: utaqqikkallarit misileqqigullu.',
  duplicate: 'Pilersitaq taanna ingerlanneqareerpoq.',
  notAvailable: 'Periarfissaq una suli atorneqarsinnaanngilaq.',
  inputRejected: 'Assi videoluunniit pilersitsinermut atorneqarsinnaanngilaq: inuit piviusut kiinaat imarisaaluunniit taamaattoq akuerineqanngillat. Assi alla nassuiaalluunniit alla misiliguk.',
  faltaCampo: 'Amigaataavoq: {{campo}}.',
  revisaCampo: '{{campo}} misissoruk: naqinnerit minnerpaamik 1, annerpaamik {{max}}.',
  campoMensaje: 'oqariartuutit',
  campoDescripcionVideo: 'videop nassuiaataa',
  conversacionNoEncontrada: 'Oqaloqatigiinneq una nassaarineqanngilaq.',
  sinPlan: 'Suliaq una suli pilersaaruteqanngilaq.',
  sinUnPlan: 'Suliaq una suli pilersaarummik peqanngilaq.',
  yaTienePlan: 'Suliaq una pilersaaruteqareerpoq.',
  subeFoto: 'Assi ikkuguk, taava Weë suliaqarsinnaassaaq.',
  trabajoNoEncontrado: 'Suliaq una nassaarineqanngilaq.',
  trabajoAjeno: 'Suliaq una illit pigisarinngilat.',
  experienciaDesconocida: 'Misigisaq ilisimaneqanngitsoq.',
  faltaTrabajo: 'Amigaataavoq: suliaq.',
  intentoSinTiempo: 'Misiliinermi tassani piffissaq naammanngilaq, taamaammat Credits utertippakka. Misileqqissinnaavutit.',
  fotoDireccion: 'Assip najugaa atorsinnaanngilaq.',
  fotoSubir: 'Assi atortinnagu siullermik Weë atorlugu ikkuguk.',
  fotoAjena: 'Assi taanna illit pigisarinngilat.',
  archivoSube: '{{archivo}} ikkuguk, taava Weë atuarsinnaassaaq.',
  archivoDireccion: 'Najugaq atorsinnaanngilaq: {{archivo}}.',
  archivoSubir: '{{archivo}} atortinnagu siullermik Weë atorlugu ikkuguk.',
  archivoAjeno: 'Illit pigisarinngilat: {{archivo}}.',
  archivoDocumento: 'allakkiaq',
  archivoAudio: 'nipi',
  sinTiempoAntes: 'Aallartinnginnermi piffissaq naammanngilaq. Akiliisinneqanngilatit.',
  sinProveedor: 'Maanna AI tamatumunnga atorneqarsinnaasoq peqanngilaq. Kingusinnerusukkut misileqqiguk.',
  noDisponibleActualmente: 'Periarfissaq una maanna atorneqarsinnaanngilaq.',
  noDisponibleAhora: 'Periarfissaq una maannakkorpiaq atorneqarsinnaanngilaq. Kinguninngua misileqqiguk.',
  noDisponibleOpciones: 'Periarfissaq una periarfissanik toqqakkatinnik atorneqarsinnaanngilaq. Allat misilikkit.',
  describeVideo: 'Video qanoq ittoq pilersikkusunnerlugu oqaluttuarfiginga.',
  creacionTerminada: 'Pilersitaq taanna naammassereerpoq, pilersinneqaqqissanngilarlu. Pilersitanni ujaruk.',
  tomaInvalida: 'Immiussap matuma ilusaa atorsinnaanngilaq.',
  planoInvalido: 'Assiliinerup matuma ilusaa atorsinnaanngilaq.',
  produccionNoEncontrada: 'Filmiliorneq taanna nassaarineqanngilaq.',
  tomaNoGenerable: 'Immiussaq taanna taamatut pilersinneqarsinnaanngilaq.',
  creacionNoEncontrada: 'Pilersitaq taanna nassaarineqanngilaq.',
  debesIniciarSesion: 'Iserissaatit',
};
