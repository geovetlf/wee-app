/*
 * COREANO — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se
 * traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체 y etiquetas cortas, porque el menú es estrecho. Dicen LAS
 * MISMAS palabras que la barra inferior (`nav`): 홈, 검색, 만들기, WeeTalk, 알림.
 *
 * EN COREANO LA MARCA NO SE TRANSLITERA, que es más que no traducirla: Credits,
 * ËContact, WeeTalk, Weëls y Weë AI se quedan en alfabeto latino dentro del
 * hangul, sin pasarlos a sílabas coreanas y sin cambiarlos por la palabra común
 * que significan. «Biz» también es marca del tercer perfil y viaja igual.
 *
 * `switchToProfile` dice «{{perfil}} 전환» y no «{{perfil}}(으)로 전환»: (으)로
 * cambia con la última letra de lo que traiga el hueco, así que no se pega.
 *
 * Lo legal va con el término exacto —이용약관, 개인정보—, el mismo que usan
 * `settings` y `auth`, porque la frase del alta se arma pegando tres de ellos.
 */
export const menu: typeof import('../es/menu').menu = {
  home: '홈',
  realProfile: '실제 프로필',
  weeProfile: 'Weë 프로필',
  createWeeProfile: '내 Weë 프로필 만들기',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: '커뮤니티',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: '내 프로젝트',
  saved: '저장됨',
  settings: '설정',
  help: '도움말',
  sectionProfile: '프로필',
  sectionExplore: '둘러보기',
  activeReal: '실제 프로필 사용 중',
  activeWee: 'Weë 프로필 사용 중',
  activeBiz: 'Biz 프로필 사용 중',
  tapToSignIn: '탭하여 로그인',
  signOut: '로그아웃',
  terms: '이용약관',
  privacy: '개인정보',
  signOutFailed: '로그아웃하지 못했어요',
  bizActiveTap: 'Biz 프로필 사용 중. 탭하면 실제 프로필로 돌아가요',
  profileActive: '{{perfil}}, 사용 중',
  switchToProfile: '{{perfil}} 전환',
  signIn: '로그인',
  hideSpecialists: '전문가 숨기기',
  showSpecialists: '전문가 보기',
  signOutConfirm: 'Weë에서 로그아웃할까요?',
};
