/*
 * COREANO — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * EL CONTENIDO DE LA AYUDA ES INTERFAZ, no algo que escriba una persona: por
 * eso vive aquí y se traduce entero. Los emojis, el símbolo ☰ y los nombres de
 * Weë y de los diez especialistas se copian tal cual, sin transliterar.
 *
 * ── DOS REGISTROS, COMO EN `settings` ──────────────────────────────────────
 *
 * Las preguntas y respuestas van en 해요체, porque aquí Weë habla con la
 * persona. El bloque legal —`legalBody`, `legalPending`— va en 합니다체, que es
 * el registro de lo jurídico en coreano, y usa los mismos términos exactos que
 * `settings` y `auth`: 이용약관 y 개인정보 처리방침.
 *
 * ── LAS PREGUNTAS USAN «~란/이란 무엇인가요?» ──────────────────────────────
 *
 * Es la forma estándar de un FAQ coreano y, de paso, resuelve la partícula
 * detrás de la marca: Weë, Credits y Weëls se leen acabados en vocal y llevan
 * 란; WeeTalk se lee acabado en consonante y lleva 이란.
 *
 * ── LO QUE SE CITA VIVE EN OTROS MÓDULOS ───────────────────────────────────
 *
 * `a5` cita `weeai.saveToProject` («프로젝트에 저장») y `q9` cita
 * `wall.howIMadeIt` («이렇게 만들었어요»). Si allí cambian las palabras, aquí
 * cambian también: la cita tiene que decir lo mismo que el botón.
 */
export const help: typeof import('../es/help').help = {
  title: '도움말',
  intro: '가장 많이 묻는 것들에 대한 답을 모았어요. 잘 모르겠는 게 있으면 알려 주세요. Weë는 커뮤니티와 함께 좋아져요.',
  faqTitle: '자주 묻는 질문',
  contact: '문의',
  contactBody: '곧 이곳에서 Weë 팀과 바로 이야기할 수 있게 돼요. 그때까지는 게시물로 아이디어와 문제를 나눠 주세요. 커뮤니티와 팀이 함께 읽고 있어요.',
  askQuestion: '질문하기',
  legalTitle: '이용약관 및 개인정보',
  legalBody: '회원님의 데이터는 회원님의 것입니다. Weë는 로그인, 게시물 표시, Credits와 창작물 표시처럼 앱이 동작하는 데에만 이메일과 프로필을 사용합니다. 회원님의 정보를 판매하지 않습니다.',
  legalPending: '전체 이용약관과 개인정보 처리방침은 출시 전에 wee.zone에 게시됩니다. Weë는 아직 만들어 가는 중이며, 일부 기능은 테스트 데이터를 사용합니다. 해당하는 곳에는 분명하게 표시합니다.',
  footer: 'Weë · World Encode Entity · 버전 1.0.0',
  q1: 'Weë란 무엇인가요?',
  a1: 'Weë(World Encode Entity)는 인공지능으로 창작하는 사람들의 소셜 네트워크예요. 여기서 발견하고, 배우고, 만들고, 나누고, 서로 연결돼요. AI는 엔진이고 커뮤니티는 심장이에요.',
  q2: '실제 프로필과 Weë 프로필은 어떻게 다른가요?',
  a2: '실제 프로필은 평소의 나이고, 앱은 밝은 화면으로 보여요. Weë 프로필은 AI로 창작하는 나예요. 나만의 아바타와 이름으로 창작물을 올리고, 그때는 앱이 어두운 화면으로 바뀌어서 지금 누구로 참여하고 있는지 늘 알 수 있어요. 메뉴 ☰ 또는 헤더의 버튼으로 둘 사이를 오가요.',
  q3: 'Weë AI는 어떻게 작동하나요?',
  a3: '무엇을 하고 싶은지 편한 말로 Weë에 이야기해 주세요. Weë가 쉬운 질문 몇 가지를 하고("모르겠어요"라고 답해도 괜찮아요) 계획을 세운 뒤 결과를 만들어요. 결과는 내가 고르고, AI는 Weë가 골라요. 전문가는 열 명이에요. Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business, Brain.',
  q4: 'Credits란 무엇인가요?',
  a4: 'Weë AI로 만드는 모든 창작에는 Credits가 들어요. 만들기 전에 얼마가 드는지 볼 수 있고, 문제가 생기면 돌려받아요. Weë AI를 만들어 가는 동안 가격은 테스트용이고 충전은 무료예요. 최종 가격은 실제 AI와 함께 정해져요.',
  q5: '프로젝트는 어디에 쓰나요?',
  a5: '하나의 프로젝트에 여러 전문가의 창작물을 모아요. 예를 들어 "내 레스토랑"의 로고, 사진, 광고, 영상, 음악을 함께 담는 거예요. 결과마다 "프로젝트에 저장"을 눌러 알맞은 프로젝트에 담아 두세요.',
  q6: 'Weëls란 무엇인가요?',
  a6: '내가 만든 것을 보여 주는 최대 15초짜리 영상이에요. Weë 밖에서도 공유할 수 있고 작은 Weë 마크가 붙어요. + 버튼에서 "Weël"을 골라 만들어요.',
  q7: '커뮤니티란 무엇인가요?',
  a7: '같은 관심사를 가진 사람들의 모임이에요. 영화 & 애니메이션, 예술 & 창작, 비즈니스 & 창업, 기술 & AI 등이 있어요. 마음에 드는 곳에 참여하고 그 안에 글을 올려 보세요.',
  q8: 'WeeTalk이란 무엇인가요?',
  a8: 'Weë의 채팅이에요. 커뮤니티의 다른 사람들과 글, 사진, 음성 메모로 나누는 비공개 대화예요.',
  q9: '"이렇게 만들었어요"란 무엇인가요?',
  a9: '게시물을 올릴 때 어떤 도구를 썼는지, 프롬프트와 과정이 어땠는지 함께 적을 수 있어요. 그래서 다른 사람이 나에게 배우고, 나도 그 사람들에게 배워요. "프롬프트 복사"를 한 번 누르면 끝이에요.',
};
