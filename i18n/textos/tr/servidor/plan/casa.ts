/*
 * TURCO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` ya trae su «için» («iki kişi için», «aile için»). `{{tiempo}}` y `{{duracion}}` van como etiqueta
 * entre paréntesis. `{{espacio}}` va sin sufijo, delante de «için» o de «fotoğrafına» («salon fotoğrafına»), y
 * `{{estilo}}` es un adjetivo delante de «tarzda».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Fotoğrafından yola çıkıp ışığı iyileştireceğim. Yemek olduğu gibi kalacak.',
  chefExplicaRetoqueFondo: 'Fotoğrafından yola çıkıp arka planı değiştireceğim. Yemek olduğu gibi kalacak.',
  chefExplicaRetoqueApetitoso: 'Fotoğrafından yola çıkıp daha iştah açıcı görünmesini sağlayacağım. Yemek olduğu gibi kalacak.',
  chefExplicaRetoqueRestaurante: 'Fotoğrafından yola çıkıp ona restoran fotoğrafı görünümü vereceğim. Yemek olduğu gibi kalacak.',
  chefExplicaRetoqueQuitar: 'Fotoğrafından yola çıkıp fazlalıkları kaldıracağım. Yemek olduğu gibi kalacak.',
  chefExplicaRetoqueNoSe: 'Fotoğrafından yola çıkıp yemeği değiştirmeden görünümünü iyileştireceğim. Yemek olduğu gibi kalacak.',
  chefExplicaRetoqueLibre: 'Fotoğrafından yola çıkıp yalnızca belirttiğin değişiklikleri uygulayacağım. Yemek olduğu gibi kalacak.',

  chefExplicaMenuTresDias: '{{comensales}} üç günlük bir menü hazırlayacağım ve alışveriş listesini de vereceğim.',
  chefExplicaMenuTodaLaSemana: '{{comensales}} tüm haftaya yetecek bir menü hazırlayacağım ve alışveriş listesini de vereceğim.',
  chefExplicaMenuParaLaSemana: '{{comensales}} haftalık bir menü hazırlayacağım ve alışveriş listesini de vereceğim.',
  chefExplicaMenu: '{{comensales}} bir menü hazırlayacağım (süre: {{duracion}}) ve alışveriş listesini de vereceğim.',

  chefExplicaRecetaEnTiempo: '{{comensales}} adım adım bir tarif hazırlayacağım (süre: {{tiempo}}) ve yemeğin nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',
  chefExplicaRecetaSinApuro: '{{comensales}} acele etmeden yapılacak, adım adım bir tarif hazırlayacağım ve yemeğin nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',
  chefExplicaConLoQueTienesEnTiempo: '{{comensales}} evde olanlarla bir tarif hazırlayacağım (süre: {{tiempo}}) ve yemeğin nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',
  chefExplicaConLoQueTienesSinApuro: '{{comensales}} evde olanlarla, acele etmeden yapılacak bir tarif hazırlayacağım ve yemeğin nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',
  chefExplicaSaludableEnTiempo: '{{comensales}} sağlıklı bir tarif hazırlayacağım (süre: {{tiempo}}) ve yemeğin nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',
  chefExplicaSaludableSinApuro: '{{comensales}} acele etmeden yapılacak, sağlıklı bir tarif hazırlayacağım ve yemeğin nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',
  chefExplicaPostreEnTiempo: '{{comensales}} bir tatlı hazırlayacağım (süre: {{tiempo}}) ve nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',
  chefExplicaPostreSinApuro: '{{comensales}} acele etmeden yapılacak bir tatlı hazırlayacağım ve nasıl göründüğünü gösteren bir fotoğraf oluşturacağım.',

  chefDecisionAlgoRico: 'evde genelde olanlarla lezzetli ve kolay bir şey öneriyorum',
  chefDecisionParaDos: 'iki kişi için düşündüm',
  chefDecisionSinApuro: 'acele etmeden yapılacak bir şey seçtim',
  chefDecisionTodaLaSemana: 'tüm hafta için hazırlıyorum',

  chefPasoMirarIngredientes: 'Elindeki malzemelere bakış',
  chefPasoEscribirReceta: 'Adım adım tarif yazımı',
  chefPasoFotoDelPlato: 'Yemek fotoğrafı oluşturma',
  chefPasoArmarMenu: 'Menü hazırlama',
  chefPasoPreciosIngredientes: 'Malzeme fiyatlarına bakış',
  chefPasoListaDeCompras: 'Alışveriş listesi hazırlama',
  chefPasoRetocarFoto: 'Yemek fotoğrafı rötuşu',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: '{{espacio}} fotoğrafına bakıp neyi değiştireceğimi (mobilya, renk, yerleşim) anlatacağım, sen de nereden başlayacağını seç. Henüz görsel oluşturmuyorum.',
  homeExplicaIdeas: '{{espacio}} için {{estilo}} tarzda üç fikir bulacağım ve bunları nasıl hayata geçireceğini anlatacağım.',
  homeExplicaDistribucion: '{{espacio}} fotoğrafına bakacağım, alanı daha iyi değerlendiren bir yerleşim önereceğim ve kendi mobilyalarınla nasıl görüneceğini göstereceğim.',
  homeExplicaRedisenar: '{{espacio}} için {{estilo}} tarzda yeni bir tasarım yapacağım: iki öneri, ayrıca değişiklik ve alışveriş listesi.',
  homeExplicaMuebles: '{{espacio}} için mobilyaları {{estilo}} tarzda değiştireceğim: iki öneri, ayrıca değişiklik ve alışveriş listesi.',
  homeExplicaColores: '{{espacio}} için stili ve renkleri {{estilo}} tarzda değiştireceğim: iki öneri, ayrıca değişiklik ve alışveriş listesi.',
  homeExplicaExterior: 'Dış mekânını {{estilo}} tarzda tasarlayacağım: iki öneri, ayrıca değişiklik ve alışveriş listesi.',

  homeDecisionEmpiezoPorLaSala: 'salonla başlıyorum',
  homeDecisionEstiloAcogedor: 'sıcacık bir stil seçtim',

  homePasoMirarFotoDelEspacio: 'Mekân fotoğrafı incelemesi',
  homePasoRedisenar: '{{espacio}} için {{estilo}} tarzda yeni tasarım',
  homePasoMuebles: '{{espacio}} için {{estilo}} tarzda mobilya değişimi',
  homePasoColores: '{{espacio}} için {{estilo}} tarzda stil ve renk değişimi',
  homePasoExterior: 'Dış mekân için {{estilo}} tarzda tasarım',
  homePasoListaDeCambios: 'Değişiklik ve alışveriş listesi hazırlama',
  homePasoProponerDistribucion: 'Daha iyi bir yerleşim önerisi',
  homePasoMostrarComoQuedaria: 'Sonucun nasıl görüneceği',
  homePasoBuscarIdeas: '{{espacio}} için fikir araması',
  homePasoExplicarComoLograrlo: 'Nasıl yapılacağının açıklaması',
  homePasoMirarFotoDeTuEspacio: 'Mekânının fotoğrafına bakış',
  homePasoContarQueVeo: 'Gördüklerim ve önerilerim',

  /* La opción se escribe con la voz de la persona; dentro de la frase de Weë, estas piezas hablan de ella. */
  chefComensalesSoloParaMi: 'sadece senin için',
  homeEspacioMiOficina: 'ofisin',
};
