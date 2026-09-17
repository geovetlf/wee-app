/*
 * PORTUGUÉS (pt-BR) — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). El nombre, la biografía y el país que elige la
 * persona no entran aquí. El aviso legal del alta tampoco: vive en `auth`
 * (termsIntro + termsOfService + termsAnd + settings.privacyPolicy) y se lee
 * «Ao criar uma conta, você aceita nossos Termos de Serviço e nossa Política de
 * Privacidade.».
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Boas-vindas ao Weë',
  welcomeSubtitle: 'Conte para a gente quem você é. Depois você vai poder criar o seu Perfil Weë: a sua identidade para criar com IA.',
  yourName: 'O seu nome',
  yourNameHint: 'Este nome vai aparecer no seu perfil público.',
  yourNamePlaceholder: 'O seu nome completo',
  birthDate: 'Data de nascimento',
  birthDateHint: 'Você precisa ter pelo menos 13 anos para usar o Weë.',
  gender: 'Gênero',
  genderMale: 'Homem',
  genderFemale: 'Mulher',
  genderOther: 'Outro',
  country: 'País',
  pickCountry: 'Selecione o seu país',
  searchCountry: 'Buscar país...',
  customiseProfile: 'Personalize o seu perfil',
  yourAvatar: 'O seu avatar',
  yourAvatarHint: 'Toque para escolher um avatar pronto ou enviar a sua própria imagem',
  bioPlaceholder: 'Conte algo sobre você... (opcional)',
  saving: 'Salvando...',
  completed: 'Concluído!',
  complete: 'Concluir',
  continueStep: 'Continuar',
  nameMissingTitle: 'Falta o seu nome',
  nameMissing: 'Escreva o seu nome para continuar.',
  nameShortTitle: 'Nome muito curto',
  nameShort: 'O seu nome precisa ter pelo menos 2 letras.',
  birthMissingTitle: 'Falta a sua data de nascimento',
  birthMissing: 'Escolha dia, mês e ano.',
  genderMissingTitle: 'Falta o seu gênero',
  genderMissing: 'Escolha uma opção para continuar.',
  countryMissingTitle: 'Falta o seu país',
  countryMissing: 'Escolha o seu país para continuar.',
  saveFailedTitle: 'Não conseguimos salvar o seu perfil',
  saveFailed: 'Tente de novo.',
  weeTitle: 'Criar Perfil Weë',
  weeIntro: 'Este perfil é independente da sua identidade real. As publicações e as ações que você fizer com o Weë não ficarão vinculadas ao seu perfil principal.',
  weePhoto: 'Foto de perfil',
  weePhotoHint: 'Toque para escolher uma foto ou um avatar pronto',
  weeName: 'Nome anônimo',
  weeNamePlaceholder: 'Ex.: SombraEscura, Anon123...',
  weeBioPlaceholder: 'Descreva o seu alter ego...',
  weeCreatedTitle: 'Perfil Weë criado',
  weeCreated: 'A sua identidade anônima está pronta. Você pode alternar entre os perfis pelo header.',
  weeCreateFailed: 'Não foi possível criar o Perfil Weë',
};
