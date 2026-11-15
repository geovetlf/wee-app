/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» y el gerundio va `estar a + infinitivo`.
 * Las etiquetas son cortas porque el menú es estrecho y dicen lo mismo que la
 * barra inferior (`nav`): Início, Procurar, Criar, WeeTalk, Notificações. En
 * Portugal la app no se «configura», se ajusta en las «Definições», lo que se
 * salva se «guarda» («Guardados») y de una cuenta se «termina sessão».
 * Apóstrofo tipográfico ’ siempre.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Início',
  realProfile: 'Perfil Real',
  weeProfile: 'Perfil Weë',
  createWeeProfile: 'Criar o meu perfil Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  pages: 'Weë Pages',
  wcontact: 'ËContact',
  communities: 'Comunidades',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Os meus projetos',
  saved: 'Guardados',
  settings: 'Definições',
  help: 'Ajuda',
  sectionProfile: 'PERFIL',
  sectionExplore: 'EXPLORAR',
  activeReal: 'Perfil Real ativo',
  activeWee: 'Perfil Weë ativo',
  tapToSignIn: 'Toca para iniciar sessão',
  signOut: 'Terminar sessão',
  terms: 'Termos',
  privacy: 'Privacidade',
  signOutFailed: 'Não conseguimos terminar a sessão',
  profileActive: '{{perfil}}, ativo',
  switchToProfile: 'Mudar para o {{perfil}}',
  signIn: 'Iniciar sessão',
  hideSpecialists: 'Ocultar especialistas',
  showSpecialists: 'Ver especialistas',
  signOutConfirm: 'Queres sair do Weë?',
  /* Rediseño del 2026-11-15: el menú nuevo. MyWeës es marca. Sin revisión nativa. */
  homeWall: 'Início / Wall',
  explore: 'Explorar',
  projectsTitle: 'Projetos',
  myWees: 'MyWeës',
  myWeesHint: 'Escolhe e organiza os teus atalhos favoritos',
  customize: 'Personalizar',
  history: 'Histórico',
  helpSupport: 'Ajuda e suporte',
};
