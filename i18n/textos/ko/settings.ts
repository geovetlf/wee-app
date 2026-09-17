/*
 * COREANO — Configuración: contenido, privacidad, preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── DOS REGISTROS EN UN MISMO ARCHIVO, A PROPÓSITO ─────────────────────────
 *
 * Las filas y los avisos normales van en 해요체, como el resto de la app. Lo
 * legal y lo de privacidad —la política, la ubicación, el «Acerca de»— va en
 * 합니다체, que es el registro con el que se escriben esas cosas en coreano.
 *
 * ── EL TÉRMINO LEGAL ES EL EXACTO ──────────────────────────────────────────
 *
 * `privacyPolicy` es «개인정보 처리방침», el nombre jurídico del documento y no
 * una paráfrasis: la pantalla del alta lo PEGA detrás de `auth.termsIntro` +
 * `auth.termsOfService` + `auth.termsAnd`, así que la frase entera tiene que
 * cerrar sola. Con «계정을 만들면 » + «이용약관» + « 및 » + esta clave sale
 * «계정을 만들면 이용약관 및 개인정보 처리방침에 동의하게 됩니다», que es
 * exactamente como se dice en coreano.
 *
 * `aboutBody` conserva sus dos `\n\n` y el símbolo ©, y el 📍 de `location` se
 * copia tal cual. Weë y Weë AI Engine son marca y no se transliteran.
 *
 * ── `communitiesJoined` NO TIENE PLURAL ────────────────────────────────────
 *
 * `Intl.PluralRules('ko')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO, con 개,
 * que es el contador que le toca a una comunidad.
 */
export const settings: typeof import('../es/settings').settings = {
  title: '설정',
  sectionContent: '콘텐츠',
  sectionPrivacy: '개인정보',
  sectionPreferences: '환경설정',
  sectionSupport: '도움말',
  myCommunities: '내 커뮤니티',
  communitiesJoined_one: '참여 중인 커뮤니티 {{contador}}개',
  communitiesJoined_other: '참여 중인 커뮤니티 {{contador}}개',
  privateReplies: '비공개 답장',
  privateRepliesHint: '다른 사람이 나에게 개인 메시지를 보낼 수 있도록 허용해요',
  pushNotifications: '푸시 알림',
  language: '언어',
  languageSubtitle: 'Weë에서 사용할 언어를 골라요',
  help: '도움말',
  privacyPolicy: '개인정보 처리방침',
  about: 'Weë 소개',
  signOut: '로그아웃',
  signOutFailed: '로그아웃하지 못했어요',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: '기본값 심기',
  seedDefaultsConfirm: '아직 없는 제공자, 체인, 기본 설정을 Firestore에 기록합니다. 아무것도 삭제하지 않습니다.',
  seed: '심기',
  sectionNotifications: '알림',
  sectionInfo: '정보',
  sectionAccount: '계정',
  privacyPolicyHint: '회원님의 데이터를 어떻게 다루는지 쉬운 말로 설명합니다',
  pushNotificationsHint: '새 메시지와 활동 알림을 받아요',
  aboutHint: 'Weë가 무엇이고 지금 어떤 버전인지',
  helpHint: '자주 묻는 질문과 문의',
  signOutHint: '내 계정에서 나가기',
  aboutBody: 'Weë(World Encode Entity)는 인공지능으로 창작하는 사람들의 소셜 네트워크입니다.\n\n버전 1.0.0 · © {{anio}} Weë. 모든 권리 보유.\n\n지리 데이터: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 위치',
  locationLine: '{{estado}} 정확한 위치는 공개적으로 표시되지 않습니다.',
  locationOff: '꺼짐. 가까운 콘텐츠와 경험을 보여 드릴 수 있도록 Weë가 대략적인 위치를 사용하도록 허용해 주세요. 정확한 위치는 공개적으로 표시되지 않습니다.',
  locationUnavailable: '이 기기에서는 위치를 확인할 수 없습니다.',
  locationDisabled: '기기 설정에서 위치가 꺼져 있습니다.',
  locationPermissionDenied: '시스템 요청을 거부하셨습니다. 여기를 눌러 기기 설정에서 변경하세요.',
  locationPermissionNotDetermined: '필요할 때 Weë가 권한을 요청합니다.',
  locationApproximate: 'Weë는 회원님의 지역만 알고, 정확한 지점은 알지 못합니다.',
  locationPrecise: '기능에 필요할 때 Weë가 상세한 위치를 사용할 수 있습니다.',
};
