/*
 * PORTUGUÉS (pt-BR) — Configuración: contenido, privacidad, preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). Lo legal se dice con el término exacto:
 * "Política de Privacidade" —que se lee pegada a `auth.termsIntro` +
 * `auth.termsOfService` + `auth.termsAnd`— y "Termos de Serviço", no con
 * sinónimos bonitos. El emoji 📍 y los saltos de línea de `aboutBody` se copian
 * tal cual. En portugués el CERO cae en la forma singular, por eso
 * `communitiesJoined_one` lleva `{{contador}}` y nunca un 1 escrito a mano.
 * Apóstrofo tipográfico ’ siempre.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Configurações',
  sectionContent: 'Conteúdo',
  sectionPrivacy: 'Privacidade',
  sectionPreferences: 'Preferências',
  sectionSupport: 'Ajuda',
  myCommunities: 'Minhas comunidades',
  communitiesJoined_one: '{{contador}} comunidade',
  communitiesJoined_other: '{{contador}} comunidades',
  privateReplies: 'Respostas privadas',
  privateRepliesHint: 'Permitir que outras pessoas enviem mensagens privadas para você',
  pushNotifications: 'Notificações push',
  language: 'Idioma',
  languageSubtitle: 'Escolha o idioma do Weë',
  help: 'Ajuda',
  privacyPolicy: 'Política de Privacidade',
  about: 'Sobre o Weë',
  signOut: 'Sair',
  signOutFailed: 'Não conseguimos encerrar sua sessão',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Inicializar os valores padrão',
  seedDefaultsConfirm: 'Grava no Firestore os provedores, as cadeias e as configurações padrão que ainda não existem. Não apaga nada.',
  seed: 'Inicializar',
  sectionNotifications: 'Notificações',
  sectionInfo: 'Informações',
  sectionAccount: 'Conta',
  privacyPolicyHint: 'O que fazemos com os seus dados, em palavras simples',
  pushNotificationsHint: 'Receba notificações de novas mensagens e de atividade',
  aboutHint: 'O que é o Weë e em qual versão você está',
  helpHint: 'Perguntas frequentes e contato',
  signOutHint: 'Sair da sua conta',
  aboutBody: 'Weë (World Encode Entity) é a rede social das pessoas que criam com Inteligência Artificial.\n\nVersão 1.0.0 · © {{anio}} Weë. Todos os direitos reservados.\n\nDados geográficos: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Localização',
  locationLine: '{{estado}} Sua localização exata nunca é mostrada publicamente.',
  locationOff: 'Desativada. Permita que o Weë use sua localização aproximada para sugerir lugares perto de você e sua região quando você adicionar uma localização a uma publicação. Sua localização exata nunca é mostrada publicamente.',
  locationUnavailable: 'Este dispositivo não consegue nos dar sua localização.',
  locationDisabled: 'A localização está desligada nas configurações do seu dispositivo.',
  locationPermissionDenied: 'Você disse não ao sistema. Toque aqui para mudar isso nas configurações do seu dispositivo.',
  locationPermissionNotDetermined: 'O Weë vai pedir permissão quando precisar.',
  locationApproximate: 'O Weë sabe a sua região, não o ponto exato.',
  locationPrecise: 'O Weë pode usar sua localização detalhada quando um recurso precisar.',
};
