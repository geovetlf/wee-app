/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra,
 * en coreano.
 *
 * Tipado contra el español: una clave que falte aquí no compila. Lo que
 * representa al negocio de la persona —sus arrobas, sus publicaciones, los
 * mensajes de sus clientes— nunca pasa por el traductor.
 *
 * MARCA Y MÓDULOS: Weë, Weë Business y Credits van en alfabeto latino dentro de
 * la frase en hangul, nunca transliterados («크레딧» rompe la marca). Los
 * nombres de los módulos —Business Plan, Business Coach, Pricing Assistant,
 * Brand Kit, Customer Insights, Business Ideas, Business Profile, SWOT— son
 * nombres de producto y se escriben igual en todos los idiomas, como en inglés
 * o en italiano. También se quedan como están las plataformas (TikTok,
 * Instagram Story, Facebook) y los formatos de archivo (Excel, CSV, PDF).
 *
 * DINERO: aquí hay precios, costes y márgenes. Primero la precisión: lo que es
 * una estimación se dice estimación (예상 비용, 예상 마진, 예상 수익), lo que
 * cuesta Credits se dice entero, y el descargo de `pricingNote` se conserva
 * completo —참고용 정보이며 회계나 세무 자문이 아니에요—.
 *
 * PLURALES: el coreano no los tiene. `productsCount_one` nunca se lee, así que
 * lleva el mismo texto que `_other`, con el contador 개, que no cambia.
 *
 * PARTÍCULAS: 은/는, 이/가, 을/를, 와/과 y (으)로 dependen de la letra anterior,
 * y detrás de un {{hueco}} esa letra es desconocida. Por eso ninguna va pegada a
 * un hueco: tras {{nombre}} se usa «님에게», tras {{red}} un «에서» o un espacio,
 * y donde hacía falta se reordena la frase.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: '내 소셜 계정',
  manageAccounts: '계정 관리',
  connected: '연결됨',
  /* Detrás del nombre de la red no se pega ninguna partícula: solo el estado. */
  networkConnected: '{{red}} 연결됨',
  connectAnother: '다른 계정 연결',
  allConnected: '모든 계정이 이미 연결되어 있어요.',
  simulatedConnection: '시뮬레이션 연결이에요. 각 플랫폼이 공식 권한을 열어 주면 Weë가 실제로 게시하고 답장해요.',
  postCalendar: '게시 일정',
  seeFullCalendar: '전체 일정 보기',
  calendarGoal: '이번 주 게시 일정을 보고 정리하기',
  /* 에 no cambia con la letra anterior, así que sí puede ir pegada al hueco. */
  scheduleGoal: '{{dia}} {{fecha}}에 올릴 게시물 예약하기: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: '고객 메시지',
  seeAllMessages: '전체 보기',
  messagesGoal: '고객 메시지에 답장하기',
  reply: '답장',
  replied: '답장 완료',
  /* 님 detrás del nombre y 에게, que tampoco varía. Nunca «{{nombre}}을(를)». */
  replyTo: '{{nombre}} 님에게 답장',
  repliedTo: '{{nombre}} 님에게 답장 완료',
  replyGoal: '{{red}}에서 {{nombre}} 님에게 답장하기: "{{mensaje}}"',
  resultsThisWeek: '이번 주 성과',
  statPosts: '게시물',
  statReach: '도달한 사람',
  statInteractions: '상호작용',
  statMessages: '받은 메시지',
  onTrack: '비즈니스가 잘 되고 있어요',
  onTrackNote: '이번 주 상호작용이 60% 늘었어요. 이대로 계속해요!',
  seeDetailedAnalysis: '자세한 분석 보기',
  analysisGoal: '이번 주 내 비즈니스 성과 분석하기',
  shortcutIdeas: '아이디어',
  shortcutIdeasGoal: '내 비즈니스를 키울 아이디어와 전략',
  shortcutMarketing: '마케팅',
  shortcutMarketingGoal: '내 비즈니스를 위한 마케팅 캠페인',
  shortcutSocial: '소셜 미디어',
  shortcutSocialGoal: '내 비즈니스 소셜 계정에 올릴 콘텐츠 만들기',
  shortcutAnalyze: '분석',
  shortcutAnalyzeGoal: '내 비즈니스 성과 분석하기',
  shortcutDocuments: '문서',
  shortcutDocumentsGoal: '내 비즈니스에 필요한 문서 작성하기',
  shortcutSell: '매출 늘리기',
  shortcutSellGoal: '이번 달 내 비즈니스 매출 늘리기',
  shortcutCareer: '일과 커리어',
  shortcutCareerGoal: '내 이력서와 커리어 프로필 다듬기',
  yesterday: '어제',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: '비즈니스를 만들고, 관리하고, 알리고, 키워요.',

  modMyBusinessHint: '비즈니스를 만들고 관리해요',
  modProductsHint: '내 제품과 가격',
  modCreateHint: 'AI로 콘텐츠 만들기',
  modSocialHint: '준비해서 어디에나 공유',
  modAnalyzeHint: '내 비즈니스 이해하기',
  modGrowHint: '기회를 찾아 성장하기',
  modProfileHint: 'Weë 안의 내 비즈니스',
  modPromoteHint: 'Weë에서 더 많은 사람에게',

  /* ── My Business ──────────────────────────────────────────────────────── */
  overview: '내 비즈니스 요약',
  overviewEmpty: '아직 비즈니스를 만들지 않았어요.',
  overviewEmptyHint: '"집에서 디저트를 팔아요"처럼 편하게 Weë에게 말해 주세요. 제가 형태를 잡도록 도와드릴게요.',
  createBusiness: '내 비즈니스 만들기',
  createBusinessGoal: '내 비즈니스를 처음부터 만들기: 이름, 무엇을 파는지, 누구에게, 얼마에',
  editBusiness: '내 비즈니스 수정',
  editBusinessGoal: '내 비즈니스 정보를 점검하고 다듬기',
  businessInfo: '비즈니스 정보',
  businessInfoGoal: '내 비즈니스 정보 정리하기: 무엇을 파는지, 누구에게, 무엇이 다른지',
  businessPlan: 'Business Plan',
  businessPlanGoal: '투자자에게 소개할 사업 계획서 쓰기',
  businessCoach: 'Business Coach',
  businessCoachGoal: '이번 주 내 비즈니스에서 무엇을 해야 할까요?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: '아직 등록한 제품이 없어요.',
  productsEmptyHint: '사진을 올리면 Weë가 이름, 설명, 판매 문구를 써 줘요.',
  addProduct: '제품 추가',
  addProductGoal: '제품 상세 정보 만들기: 이름, 설명, 특징, 판매 문구',
  improveImage: '사진 개선',
  improveImageGoal: '더 잘 팔리도록 제품 사진 개선하기',
  /* El coreano no pluraliza: `_one` no se lee nunca y dice lo mismo que `_other`. */
  productsCount_one: '제품 {{contador}}개',
  productsCount_other: '제품 {{contador}}개',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: '드는 비용을 입력하면 Weë가 참고 가격을 알려 줘요.',
  pricingMaterials: '재료비',
  pricingPackaging: '포장비',
  pricingDelivery: '배송비',
  pricingOther: '기타 비용',
  pricingMargin: '원하는 마진',
  /* Estimaciones: se dicen estimaciones, sin excepción. */
  pricingCost: '예상 비용',
  pricingSuggested: '추천 가격',
  pricingMarginResult: '예상 마진',
  pricingProfit: '예상 수익',
  pricingNote: '이 가격은 참고용 정보이며, 회계나 세무 자문이 아니에요.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: '내 콘텐츠가 언제나 나답게 보이게 해 주는 것들이에요.',
  brandLogo: '로고',
  brandColors: '색상',
  brandTypography: '서체',
  brandStyle: '비주얼 스타일',
  brandAvatar: '프로필 이미지',
  brandCover: '커버 이미지',
  brandTemplates: '콘텐츠 템플릿',
  brandGoal: '내 비즈니스 브랜드용 {{que}} 만들기',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: '무엇을 홍보하고 싶은지 알려 주면 제가 준비할게요.',
  createPlaceholder: '예: 어버이날에 이 케이크를 홍보하고 싶어요…',
  createTypes: '무엇을 만들까요?',
  typeImage: '이미지',
  typeImageHint: '홍보용 이미지',
  typeVideo: '비디오',
  typeVideoHint: '짧은 비디오',
  typePost: '게시물',
  typePostHint: '바로 올릴 수 있어요',
  typeCampaign: '캠페인',
  typeCampaignHint: '여러 콘텐츠를 한 번에',
  typeCopy: '문구',
  typeCopyHint: '설명, 해시태그, 행동 유도 문구',
  typeGoal: '내 비즈니스용 {{que}} 만들기: {{idea}}',
  formats: '형식을 골라 주세요',
  formatsHint: '크기는 Weë가 맞춰요. 어디에 올릴지만 고르면 돼요.',
  formatTikTok: 'TikTok',
  /* "Instagram 비디오" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma aquí. */
  formatReel: 'Instagram 비디오',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: '가로 비디오',

  askInvite: '편하게 말해 주면 제가 알아서 할게요.',
  askPlaceholder: '여기에 적어 주세요…',
  askSend: 'Weë에게 물어보기',

  productCreate: '콘텐츠 만들기',
  goalWithProduct: '{{idea}} — 제품: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: '한 번만 만들어요. 어디에나 공유해요.',
  share: '공유',
  shareHint: '휴대폰의 공유 창이 열려요. 원하는 앱을 고르세요.',
  shareToWee: 'Weë에 공유',
  shareWall: '내 Wäll',
  shareCommunities: '커뮤니티',
  shareProfile: 'Business Profile',
  shareNothing: '먼저 무언가를 만들면 여기에서 공유할 수 있어요.',
  shareText: 'Weë Business로 만들었어요',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: '내 데이터 올리기',
  analyzeUploadHint: '매출과 지출이 담긴 Excel, CSV 또는 PDF 파일이에요.',
  analyzeUploadGoal: '내 비즈니스의 매출·지출 파일 분석하기',
  analyzeInsights: '숫자에서 보이는 것',
  analyzeInsightsGoal: '내 비즈니스 매출에 무슨 일이 일어나고 있는지 설명하기',
  expenses: '지출',
  expensesHint: '돈이 어디로 나가는지 적어 두세요.',
  expensesEmpty: '아직 적어 둔 지출이 없어요.',
  addExpense: '지출 추가',
  expenseSupplies: '소모품',
  expenseMarketing: '마케팅',
  expenseDelivery: '배송',
  expenseStaff: '인건비',
  expenseServices: '서비스 이용료',
  expenseOther: '기타',
  expensesAsk: '어디에 너무 많이 쓰고 있을까요?',
  expensesAskGoal: '내 지출을 점검하고 어디에 너무 많이 쓰는지 알려 주기',
  swot: 'SWOT',
  swotHint: '강점, 약점, 기회, 위협이에요.',
  swotGoal: '내 비즈니스의 SWOT 분석하기',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: '성장을 도와주세요',
  helpMeGrowHint: 'Weë가 내 비즈니스를 살펴보고 무엇을 하면 좋을지 제안해요.',
  helpMeGrowGoal: '구체적인 단계가 담긴 내 비즈니스 성장 계획',
  opportunities: '기회',
  opportunitiesEmpty: '매출과 콘텐츠가 쌓이면 제가 찾은 기회가 여기에 나타나요.',
  createPromotion: '프로모션 만들기',
  customerInsights: 'Customer Insights',
  customerInsightsHint: '누구에게 팔고 있고 그 사람에게 무엇이 필요한지 알려 줘요.',
  customerInsightsGoal: '내 이상적인 고객과 그 고객에게 통하는 메시지 설명하기',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: '무엇을 더 팔 수 있을지, 어떻게 차별화할지 알려 줘요.',
  businessIdeasGoal: '내 비즈니스 아이디어와 차별화 방법 알려 주기',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: '아직 Weë에 비즈니스 페이지가 없어요.',
  profileEmptyHint: '비즈니스를 만들면 여기에 페이지가 생겨요. 내가 누구인지, 무엇을 파는지, 어떻게 연락하는지 담겨요.',
  profileAbout: '소개',
  profileProducts: '제품',
  profilePosts: '게시물',
  profileContact: '연락처',
  reviews: '리뷰',
  reviewsHint: '고객이 무엇을 말하는지, 무엇을 고치면 좋을지 알려 줘요.',
  reviewsGoal: '내 비즈니스 리뷰를 분석하고 무엇을 고치면 좋을지 알려 주기',
  reviewsRespond: '답글 쓰기',
  reviewsRespondGoal: '내 비즈니스 리뷰에 전문적인 답글 쓰기',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Weë Credits로 더 많은 사람에게 보여 주세요',
  promoteHint: '내 콘텐츠가 Weë 안에서 더 많은 사람에게 보여요. 쓰기 전에 얼마가 드는지 먼저 확인할 수 있어요.',
  promoteSoon: 'Weë 안에서 홍보하기는 아직 열리지 않았어요. 열리면 내 Credits로 결제하고 여기에서 확인할 수 있어요.',
  promoteCredits: '내 Credits 보기',
  sampleProductName: '제품 {{numero}}',
};
