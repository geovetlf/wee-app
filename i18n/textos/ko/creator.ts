/*
 * COREANO — lo que describe cada experiencia de WEË AI. Los nombres —Weë Design, Weë Studio…— son marca y viven en constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ejemplos son lo que ESCRIBE la persona, así que suenan a lo que se diría en
 * voz alta: un sintagma nominal corto («내 가게 로고») o una frase en 해요체
 * cuando hay duda («어디로 여행 갈지 모르겠어요»). Nada de imperativos de manual.
 *
 * Las cinco claves `area*` llevan el nombre de la experiencia en alfabeto latino
 * y el separador `·` intacto; «Beauty» también es nombre y no se traduce.
 *
 * En `tellTheSpecialist` el hueco del especialista lleva detrás 에게, que es una
 * partícula invariable: no cambia con el 받침 y se puede pegar sin riesgo.
 */
export const creator: typeof import('../es/creator').creator = {
  design: '로고, 포스터, 일러스트, SNS에 올릴 이미지',
  studio: 'AI로 사진과 영상을 만들고 바꿔 보세요.',
  photo: '사진 보정, 복원, 변환',
  writer: '게시물, 이야기, 대본, 이메일, 책',
  music: '노래, 연주 음악, 목소리, 내레이션',
  beauty: '메이크업, 헤어, 수염, 옷차림, 스타일 변신',
  chef: '나만의 셰프: 오늘 뭘 요리할지, 레시피, 식단',
  home: '데코, 인테리어, 리모델링, 정원',
  business: '사업 아이디어, 마케팅, 이력서, 문서, 발표 자료',
  travel: '여행 준비: 어디로 갈지, 뭘 할지, 어떻게 다닐지',
  brain: '어디서 찾아야 할지 모르겠나요? Weë에게 물어보세요',
  designEx1: '내 가게 로고',
  designEx2: 'Instagram에 올릴 게시물',
  designEx3: '내 책 표지',
  studioEx1: '우리 식당을 홍보할 영상',
  studioEx2: '내 사진을 영상으로 만들기',
  studioEx3: '내 제품으로 만드는 Weël',
  photoEx1: '사진 화질 좋게 만들기',
  photoEx2: '사진에서 필요 없는 부분 지우기',
  photoEx3: '내 사진 배경 바꾸기',
  writerEx1: '내 영상에 쓸 대본',
  writerEx2: '고객에게 보낼 이메일',
  writerEx3: '내 글 다듬기',
  musicEx1: '우리 브랜드 징글',
  musicEx2: '내 영상에 깔 배경 음악',
  musicEx3: '내 글을 목소리로 바꾸기',
  beautyEx1: '머리를 기르면 어떻게 어울릴까',
  beautyEx2: '파티에 어울리는 스타일',
  beautyEx3: '다른 머리 색 해보기',
  chefEx1: '집에 있는 재료로 만드는 레시피',
  chefEx2: '건강한 일주일 식단',
  chefEx3: '오늘 뭘 해 먹을지 모르겠어요',
  homeEx1: '우리 거실을 다른 스타일로 바꾸면 어떨까',
  homeEx2: '내 방 꾸미는 아이디어',
  homeEx3: '우리 마당에 어울리는 작은 정원',
  businessEx1: '내 사업 계획',
  businessEx2: '업데이트한 내 이력서',
  businessEx3: '투자자에게 할 발표 자료',
  travelEx1: '10월의 일본',
  travelEx2: '조용하고 저렴한 해변에 가고 싶어요',
  travelEx3: '어디로 여행 갈지 모르겠어요',
  brainEx1: '어디서부터 시작할지 모르겠어요',
  brainEx2: '이거 쉽게 설명해 주세요',
  brainEx3: '이 글 번역해 주세요',
  areaStudioPhotos: 'Weë Studio · 사진',
  areaStudioVideos: 'Weë Studio · 영상',
  areaStudioBeauty: 'Weë Studio · Beauty',
  areaDesignHome: 'Weë Design · 홈 & 디자인',
  areaHomeName: '홈 & 디자인',
  tellTheSpecialist: '{{especialista}}에게 무엇을 만들고 싶은지 말해 보세요. 간단한 질문 두세 개만 하고 나머지는 알아서 해드려요. 그다음 바로 커뮤니티에 올릴 수 있어요.',
};
