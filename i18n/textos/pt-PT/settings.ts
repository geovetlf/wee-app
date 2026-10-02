/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — Configuración: contenido, privacidad, preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» —«os teus dados», «as definições do teu
 * dispositivo»— y el gerundio va `estar a + infinitivo`. En Portugal esta
 * pantalla se llama DEFINIÇÕES, nunca «configurações», los valores de fábrica
 * son PREDEFINIDOS y de la cuenta se TERMINA SESSÃO.
 *
 * Lo legal se dice con el término exacto: "Política de Privacidade" —que se lee
 * pegada a `auth.termsIntro` + `auth.termsOfService` + `auth.termsAnd`— y no con
 * sinónimos bonitos. El emoji 📍 y los saltos de línea de `aboutBody` se copian
 * tal cual.
 *
 * EL CERO CAE EN PLURAL. `Intl.PluralRules` mete el 0 en `other` para `pt-PT`,
 * así que sin comunidades dirá «0 comunidades». Las dos formas llevan
 * `{{contador}}` y nunca un 1 escrito a mano. Apóstrofo tipográfico ’ siempre.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Definições',
  sectionContent: 'Conteúdo',
  sectionPrivacy: 'Privacidade',
  sectionPreferences: 'Preferências',
  sectionSupport: 'Ajuda',
  myCommunities: 'As minhas comunidades',
  communitiesJoined_one: '{{contador}} comunidade',
  communitiesJoined_other: '{{contador}} comunidades',
  privateReplies: 'Respostas privadas',
  privateRepliesHint: 'Permitir que outras pessoas te enviem mensagens privadas',
  pushNotifications: 'Notificações push',
  language: 'Idioma',
  languageSubtitle: 'Escolhe o idioma do Weë',
  help: 'Ajuda',
  privacyPolicy: 'Política de Privacidade',
  about: 'Sobre o Weë',
  signOut: 'Terminar sessão',
  signOutFailed: 'Não conseguimos terminar a tua sessão',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Inicializar os valores predefinidos',
  seedDefaultsConfirm: 'Grava no Firestore os fornecedores, as cadeias e as definições predefinidas que ainda não existem. Não apaga nada.',
  seed: 'Inicializar',
  sectionNotifications: 'Notificações',
  sectionInfo: 'Informações',
  sectionAccount: 'Conta',
  privacyPolicyHint: 'O que fazemos com os teus dados, em palavras simples',
  pushNotificationsHint: 'Recebe notificações de novas mensagens e de atividade',
  aboutHint: 'O que é o Weë e em que versão estás',
  helpHint: 'Perguntas frequentes e contacto',
  signOutHint: 'Sair da tua conta',
  aboutBody: 'Weë (World Encode Entity) é a rede social das pessoas que criam com Inteligência Artificial.\n\nVersão 1.0.0 · © {{anio}} Weë. Todos os direitos reservados.\n\nDados geográficos: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Localização',
  locationLine: '{{estado}} A tua localização exata nunca é mostrada publicamente.',
  locationOff: 'Desativada. Permite que o Weë use a tua localização aproximada para te sugerir lugares perto de ti e a tua zona quando adicionas uma localização a uma publicação. A tua localização exata nunca é mostrada publicamente.',
  locationUnavailable: 'Este dispositivo não consegue dar-nos a tua localização.',
  locationDisabled: 'A localização está desligada nas definições do teu dispositivo.',
  locationPermissionDenied: 'Disseste que não ao sistema. Toca aqui para mudar isso nas definições do teu dispositivo.',
  locationPermissionNotDetermined: 'O Weë vai pedir-te permissão quando precisar.',
  locationApproximate: 'O Weë sabe a tua zona, não o ponto exato.',
  locationPrecise: 'O Weë pode usar a tua localização ao pormenor quando uma funcionalidade precisar.',
};
