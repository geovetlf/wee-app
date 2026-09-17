/*
 * COREANO — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체; los botones, en forma nominal corta (완료, 계속). El nombre, la
 * biografía y el país que elige la persona no entran aquí.
 *
 * PERFIL WEË SE ESCRIBE «Weë 프로필»: la marca se queda en alfabeto latino y solo
 * se traduce la palabra que la acompaña. Nada de 위, nada de 웨.
 *
 * El aviso legal del alta tampoco vive aquí: está en `auth` y se lee entero
 * «계정을 만들면 다음 내용에 동의하는 것으로 간주합니다: 이용약관 및 개인정보
 * 처리방침», en 합니다체, que es el registro que pide un texto jurídico.
 *
 * `weeNamePlaceholder` es un EJEMPLO que se lee: el alias inventado se traduce y
 * «Anon123» se queda, porque es un patrón y no una palabra.
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Weë에 오신 것을 환영해요',
  welcomeSubtitle: '어떤 분인지 알려 주세요. 그다음 Weë 프로필을 만들 수 있어요. AI로 창작할 때 쓰는 나만의 정체성이에요.',
  yourName: '이름',
  yourNameHint: '이 이름이 공개 프로필에 표시돼요.',
  yourNamePlaceholder: '이름을 입력하세요',
  birthDate: '생년월일',
  birthDateHint: 'Weë를 사용하려면 만 13세 이상이어야 해요.',
  gender: '성별',
  genderMale: '남성',
  genderFemale: '여성',
  genderOther: '기타',
  country: '국가',
  pickCountry: '국가를 선택하세요',
  searchCountry: '국가 검색...',
  customiseProfile: '프로필 꾸미기',
  yourAvatar: '아바타',
  yourAvatarHint: '탭해서 기본 아바타를 고르거나 내 사진을 올려 보세요',
  bioPlaceholder: '나에 대해 간단히 알려 주세요... (선택)',
  saving: '저장 중...',
  completed: '완료됐어요!',
  complete: '완료',
  continueStep: '계속',
  nameMissingTitle: '이름이 비어 있어요',
  nameMissing: '계속하려면 이름을 입력해 주세요.',
  nameShortTitle: '이름이 너무 짧아요',
  nameShort: '이름은 두 글자 이상이어야 해요.',
  birthMissingTitle: '생년월일이 비어 있어요',
  birthMissing: '연, 월, 일을 골라 주세요.',
  genderMissingTitle: '성별을 고르지 않았어요',
  genderMissing: '계속하려면 하나를 골라 주세요.',
  countryMissingTitle: '국가를 고르지 않았어요',
  countryMissing: '계속하려면 국가를 골라 주세요.',
  saveFailedTitle: '프로필을 저장하지 못했어요',
  saveFailed: '다시 시도해 주세요.',
  weeTitle: 'Weë 프로필 만들기',
  weeIntro: '이 프로필은 실제 신원과 별개예요. Weë 프로필로 올린 게시물과 활동은 기본 프로필과 연결되지 않아요.',
  weePhoto: '프로필 사진',
  weePhotoHint: '탭해서 사진을 고르거나 기본 아바타를 선택하세요',
  weeName: '익명 이름',
  weeNamePlaceholder: '예: 어둠의그림자, Anon123...',
  weeBioPlaceholder: '나의 또 다른 자아를 소개해 보세요...',
  weeCreatedTitle: 'Weë 프로필을 만들었어요',
  weeCreated: '익명 정체성이 준비됐어요. 헤더에서 프로필을 바꿀 수 있어요.',
  weeCreateFailed: 'Weë 프로필을 만들지 못했어요',
};
