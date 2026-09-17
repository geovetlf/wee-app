/*
 * WEË STUDIO — el sitio donde se crea, en coreano.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Registro 해요체 para la interfaz y forma nominal corta en los botones
 * (만들기, 완료, 추가). Los formatos —PDF, MP4, 16:9— no cambian de idioma, y
 * "Weë Studio" y "Writer" son marca: van en alfabeto latino dentro de la frase
 * en hangul, nunca transliterados. Lo que sí es coreano son las unidades: los
 * segundos van con 초 pegado al número, sin espacio.
 *
 * PLURALES: el coreano no los tiene. `Intl.PluralRules('ko')` solo declara la
 * categoría `other`, así que la forma `_one` NUNCA se lee —ni con 1— y va con
 * el mismo texto que `_other`. La cantidad se dice con su contador (개, 장),
 * que no cambia con el número, y por eso no hace falta `ConPlurales`.
 *
 * PARTÍCULAS: 은/는, 이/가, 을/를, 와/과 y (으)로 cambian según la letra que
 * las precede, y detrás de un {{hueco}} no se sabe cuál vendrá. Aquí no hay
 * ninguna pegada a un hueco: donde el español encadenaba, el coreano
 * reestructura ("레퍼런스 {{contador}}장", "{{grupo}}: {{opcion}}").
 */
export const studio: typeof import('../es/studio').studio = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: '한계 없이 만들어요.',
  description: '이미지, 비디오, 음성, 텍스트까지.\n모두 한곳에서.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '오늘은 무엇을 만들까요?',
  addLabel: '추가',
  referenceLabel: '레퍼런스 이미지 추가',
  settingsLabel: '만들기 설정',
  voiceLabel: '음성 입력',
  sendLabel: '만들기',

  /* ── El editor a pantalla completa ────────────────────────────────────── */
  editorTitle: '내 아이디어',
  editorPlaceholder: '무엇을 만들고 싶은지 자세히 적어 주세요. 구체적일수록 결과가 좋아져요.',
  editorReferences: '레퍼런스',
  editorNoReferences: '아직 추가한 레퍼런스가 없어요',
  editorAddReference: '레퍼런스 추가',
  /* 자 es el contador de caracteres y va pegado al número, sin espacio. */
  editorCharacters: '{{contador}}자',
  create: '만들기',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  settingsTitle: '설정',
  settingsHint: '무엇을 만드는지에 따라 달라져요',
  settingsDone: '완료',
  optFormat: '형식',
  optQuality: '품질',
  optResolution: '해상도',
  optStyle: '스타일',
  optVariations: '변형',
  optReferences: '레퍼런스',
  /* Solo sale en video: es cuánto dura, no cuánto texto. */
  optDuration: '재생 시간',
  optMotion: '움직임',
  optLength: '분량',
  optTone: '톤',
  optLanguage: '언어',
  optType: '유형',
  optSize: '크기',
  valAuto: '자동',
  valSquare: '정사각형',
  valPortrait: '세로',
  valLandscape: '가로',
  valStandard: '표준',
  valHigh: '높음',
  valRealistic: '사실적',
  valIllustration: '일러스트',
  valMinimal: '미니멀',
  valSlow: '부드럽게',
  valDynamic: '역동적으로',
  valShort: '짧게',
  valMedium: '보통',
  valLong: '길게',
  valNeutral: '중립',
  valClose: '친근',
  valProfessional: '전문',
  /* Las duraciones que Weë sabe hacer: un Weël llega a quince segundos. */
  valSec5: '5초',
  valSec10: '10초',
  valSec15: '15초',
  valOne: '1개',
  valFour: '4개',
  /*
   * Cuántas referencias viajan con la creación. El coreano no distingue una de
   * varias: las dos formas dicen lo mismo porque `_one` no se lee nunca.
   */
  settingsReferences_one: '레퍼런스 {{contador}}장',
  settingsReferences_other: '레퍼런스 {{contador}}장',
  /* Lo que lee un lector de pantalla en cada píldora: "형식: 세로". */
  settingsOption: '{{grupo}}: {{opcion}}',

  /* ── Las seis puertas ─────────────────────────────────────────────────── */
  imagesTitle: '이미지',
  imagesHint: '만들고 편집하기',
  videosTitle: '비디오',
  videosHint: '최대 15초',
  voiceTitle: '음성',
  voiceHint: '내레이션과 더 많은 기능',
  writerHint: '어떤 글이든 쓰기',
  docsTitle: '문서',
  docsHint: 'PDF, 문서 등',
  moreTitle: '더 많은 도구',
  moreHint: '편집, 개선, 변환',

  /* ── Imágenes ─────────────────────────────────────────────────────────── */
  imgFromText: '텍스트로 이미지 만들기',
  imgFromImage: '이미지로 이미지 만들기',
  imgEdit: '이미지 편집',
  imgRemoveObject: '사물 지우기',
  imgAddObject: '사물 추가',
  imgChangeBackground: '배경 바꾸기',
  imgRemoveBackground: '배경 지우기',
  imgChangeStyle: '스타일 바꾸기',
  imgRelight: '조명 바꾸기',
  imgExpand: '이미지 확장',
  imgRestore: '복원',
  imgEnhance: '개선',
  imgUpscale: '해상도 높이기',
  imgVariations: '변형',
  imgCombine: '레퍼런스 합치기',
  imgCharacter: '캐릭터 유지',
  imgText: '이미지 속 텍스트',
  imgFormats: '형식 바꾸기',

  /* ── Videos ───────────────────────────────────────────────────────────── */
  vidFromText: '텍스트로 비디오 만들기',
  vidFromImage: '이미지로 비디오 만들기',
  vidFromImages: '여러 이미지로 비디오 만들기',
  vidFromVideo: '비디오로 비디오 만들기',
  vidScene: '장면 만들기',
  vidContinue: '장면 이어 가기',
  vidVariations: '변형',
  vidMotion: '움직임',
  vidCamera: '카메라',
  vidStyle: '스타일',
  vidLimit: '한 번에 최대 15초',

  /* ── Voz ──────────────────────────────────────────────────────────────── */
  voxFromText: '텍스트로 음성 만들기',
  voxNarration: '내레이션',
  voxPick: '목소리 고르기',
  voxLanguage: '언어',
  voxAccent: '억양',
  voxEmotion: '감정',
  voxTranscribe: '받아쓰기',
  voxSubtitles: '자막',
  voxExtract: '오디오 추출',
  voxEnhance: '목소리 개선',
  voxClean: '오디오 정리',

  /* ── Writer ───────────────────────────────────────────────────────────── */
  wrIdeas: '아이디어',
  wrPosts: '게시물',
  wrCaptions: '캡션',
  wrScripts: '대본',
  wrStories: '이야기',
  wrBooks: '책',
  wrArticles: '기사',
  wrBlogs: '블로그',
  wrEssays: '에세이',
  wrEmails: '이메일',
  wrLetters: '편지',
  wrCv: '이력서',
  wrDecks: '프레젠테이션',
  wrProposals: '제안서',
  wrReports: '보고서',
  wrDescriptions: '설명글',
  wrAds: '광고',
  wrVideoScripts: '비디오 대본',
  wrPodcasts: '팟캐스트',
  wrDialogue: '대화문',
  wrLyrics: '가사',
  wrSummaries: '요약',
  wrTranslate: '번역',
  wrRewrite: '다시 쓰기',
  wrProofread: '교정',
  wrBrainstorm: '브레인스토밍',

  /* ── Documentos ───────────────────────────────────────────────────────── */
  docPdf: 'PDF 만들기',
  docDocument: '문서 만들기',
  docEbook: '전자책 만들기',
  docGuide: '가이드 만들기',
  docManual: '매뉴얼 만들기',
  docDeck: '프레젠테이션 만들기',
  docCatalog: '카탈로그 만들기',
  docBrochure: '브로슈어 만들기',
  docImageToPdf: '이미지를 PDF로',
  docToPdf: '문서를 PDF로',
  docPdfToText: 'PDF를 텍스트로',
  docSummarize: 'PDF 요약하기',
  docAsk: 'PDF에 질문하기',
  docCompare: '문서 비교하기',

  /* ── Más herramientas ─────────────────────────────────────────────────── */
  grpImage: '이미지',
  grpVideo: '비디오',
  grpAudio: '오디오',
  grpText: '텍스트',
  grpFiles: '파일',
  tlCrop: '자르기와 크기 조정',
  tlRecolor: '색 바꾸기',
  tlVidEdit: '편집',
  tlVidCut: '자르기',
  tlVidJoin: '이어 붙이기',
  tlVidSubtitles: '자막',
  tlVidSilences: '무음 구간 삭제',
  tlVidEnhance: '개선',
  tlVidFormat: '형식 바꾸기',
  tlVidClips: '클립 추출',
  tlVidSpeed: '속도',
  tlVidBackground: '배경 지우기',
  tlAudClean: '오디오 정리',
  tlAudNoise: '노이즈 줄이기',
  tlTxtSummarize: '요약',
  tlTxtRewrite: '다시 쓰기',
  tlTxtProofread: '교정',
  tlTxtTranslate: '번역',
  tlTxtTone: '톤 바꾸기',
  tlTxtExpand: '내용 늘리기',
  tlTxtSimplify: '쉽게 바꾸기',
  tlTxtExtract: '정보 추출',
  tlFileConvert: '문서 변환',

  /* ── Mis creaciones ───────────────────────────────────────────────────── */
  creationsTitle: '내 작업물',
  seeAll: '전체 보기',
  creationsEmpty: '만든 것이 여기에 나타나요',
  kindImage: '이미지',
  kindVideo: '비디오',
  kindAudio: '오디오',
  kindDocument: '문서',
  creationOptions: '이 작업물의 옵션',

  /* ── El estado de una creación ────────────────────────────────────────── */
  creating: '만드는 중...',
  ready: '만들기 완료',
  readyHint: '지금은 데모예요. 아직 실제로 생성된 결과는 없어요.',
  dismiss: '확인',

  /* ── Lo que todavía no está conectado ─────────────────────────────────── */
  soon: '준비 중',
  soonHint: '이 도구는 자리를 잡았어요. 연결만 남았어요.',
};
