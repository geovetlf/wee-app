/*
 * PORTUGUÉS (pt-BR) — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). Las etiquetas son cortas porque el menú es
 * estrecho y dicen lo mismo que la barra inferior (`nav`): Início, Buscar,
 * Criar, WeeTalk, Notificações. Lo legal va con el término exacto
 * ("Termos de Serviço", "Privacidade"). Apóstrofo tipográfico ’ siempre.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Início',
  realProfile: 'Perfil Real',
  weeProfile: 'Perfil Weë',
  createWeeProfile: 'Criar meu perfil Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  pages: 'Weë Pages',
  wcontact: 'ËContact',
  communities: 'Comunidades',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Meus projetos',
  saved: 'Salvos',
  settings: 'Configurações',
  help: 'Ajuda',
  sectionProfile: 'PERFIL',
  sectionExplore: 'EXPLORAR',
  activeReal: 'Perfil Real ativo',
  activeWee: 'Perfil Weë ativo',
  tapToSignIn: 'Toque para entrar',
  signOut: 'Sair',
  terms: 'Termos de Serviço',
  privacy: 'Privacidade',
  signOutFailed: 'Não conseguimos encerrar sua sessão',
  profileActive: '{{perfil}}, ativo',
  switchToProfile: 'Mudar para o {{perfil}}',
  signIn: 'Entrar',
  hideSpecialists: 'Ocultar especialistas',
  showSpecialists: 'Ver especialistas',
  signOutConfirm: 'Quer sair do Weë?',
  /* Rediseño del 2026-11-15: el menú nuevo. MyWeës es marca. Sin revisión nativa. */
  homeWall: 'Início / Wall',
  explore: 'Explorar',
  projectsTitle: 'Projetos',
  myWees: 'MyWeës',
  myWeesHint: 'Escolha e organize seus atalhos favoritos',
  customize: 'Personalizar',
  history: 'Histórico',
  helpSupport: 'Ajuda e suporte',
};
