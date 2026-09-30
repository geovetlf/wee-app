/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — el alta guiada y la creación del Perfil Weë:
 * quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * LO QUE NO ENTRA AQUÍ: el nombre, la biografía y el país que elige la persona.
 * El aviso legal del alta tampoco: vive en `auth` (termsIntro + termsOfService +
 * termsAnd + settings.privacyPolicy) y se lee entero «Ao criares uma conta,
 * aceitas os nossos Termos de Serviço e a nossa Política de Privacidade».
 *
 * ESTO NO ES EL BRASILEÑO CON OTRAS PALABRAS:
 *
 *   ESTAR A + INFINITIVO: "A guardar..." y no "Salvando...".
 *   TRATO DE "TU": "Conta-nos quem és", "o teu nome", "Podes alternar".
 *   "TENS DE" para la obligación, donde Brasil dice "Você precisa de".
 *   FUTURO DE SUBJUNTIVO vivo: "as ações que fizeres com o Weë".
 *   INFINITIVO PERSONAL: "para continuares".
 *
 * Y el vocabulario, término a término:
 *
 *   guardar (no salvar) · género (no gênero) · anónimo (no anônimo)
 *   procurar (no buscar) · predefinido (no pronto) · demasiado (no muito)
 *
 * MARCA: "Perfil Weë" se escribe igual en todos los idiomas, y "header" se queda
 * como en el resto de los diccionarios.
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Bem-vindo ao Weë',
  welcomeSubtitle: 'Conta-nos quem és. Depois vais poder criar o teu Perfil Weë: a tua identidade para criar com IA.',
  yourName: 'O teu nome',
  yourNameHint: 'Este nome vai aparecer no teu perfil público.',
  yourNamePlaceholder: 'O teu nome completo',
  birthDate: 'Data de nascimento',
  birthDateHint: 'Tens de ter pelo menos 13 anos para usar o Weë.',
  gender: 'Género',
  genderMale: 'Homem',
  genderFemale: 'Mulher',
  genderOther: 'Outro',
  country: 'País',
  pickCountry: 'Seleciona o teu país',
  searchCountry: 'Procurar país...',
  customiseProfile: 'Personaliza o teu perfil',
  yourAvatar: 'O teu avatar',
  yourAvatarHint: 'Toca para escolher um avatar predefinido ou enviar a tua própria imagem',
  bioPlaceholder: 'Conta algo sobre ti... (opcional)',
  saving: 'A guardar...',
  completed: 'Concluído!',
  complete: 'Concluir',
  continueStep: 'Continuar',
  nameMissingTitle: 'Falta o teu nome',
  nameMissing: 'Escreve o teu nome para continuares.',
  nameShortTitle: 'Nome demasiado curto',
  nameShort: 'O teu nome tem de ter pelo menos 2 letras.',
  birthMissingTitle: 'Falta a tua data de nascimento',
  birthMissing: 'Escolhe o dia, o mês e o ano.',
  genderMissingTitle: 'Falta o teu género',
  genderMissing: 'Escolhe uma opção para continuares.',
  countryMissingTitle: 'Falta o teu país',
  countryMissing: 'Escolhe o teu país para continuares.',
  saveFailedTitle: 'Não conseguimos guardar o teu perfil',
  saveFailed: 'Tenta novamente.',
  weeTitle: 'Criar Perfil Weë',
  weeIntro: 'Este perfil é independente da tua identidade real. As publicações e as ações que fizeres com o Weë não ficam associadas ao teu perfil principal.',
  weePhoto: 'Foto de perfil',
  weePhotoHint: 'Toca para escolher uma foto ou um avatar predefinido',
  weeName: 'Nome anónimo',
  weeNamePlaceholder: 'Ex.: SombraEscura, Anon123...',
  weeBioPlaceholder: 'Descreve o teu alter ego...',
  weeCreatedTitle: 'Perfil Weë criado',
  weeCreated: 'A tua identidade anónima está pronta. Podes alternar entre os perfis no header.',
  weeCreateFailed: 'Não foi possível criar o Perfil Weë',
  birthDay: 'Dia',
  birthMonth: 'Mês',
  birthYear: 'Ano',
  stepOf: 'Passo {{paso}} de {{total}}',
  customiseProfileHint: 'Escolhe um avatar e adiciona uma descrição (opcional)',
  bioLabel: 'Descrição (opcional)',
  weeNameCounter: '{{usados}}/{{maximo}} - Mínimo de {{minimo}} caracteres',
  weeBio: 'Bio (opcional)',
};
