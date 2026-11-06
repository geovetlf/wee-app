/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Weë Design: diseñar y visualizar casi cualquier cosa física.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Diseñar = «ilusilersorpaa» (2sg: «ilusilersoruk», pl.
 * «ilusilersukkit»), render = «takussutissiaq», 3D queda como sigla. Préstamos ya integrados
 * con ortografía groenlandesa: «biili», «sikkili». Los objetos de ejemplo van en absolutivo
 * singular sin artículo (el groenlandés no tiene artículos). «Weë Design» no pasa por aquí.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Killeqanngitsumik ilusilersuigit.',
  description: 'Inissat, nioqqutissiat, atortut allarpassuillu.\nIsumassarsiatit ilusilersukkit.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Ullumi suna ilusilersorusuppiuk?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Qanoq isikkoqarnissaa kissaatigisat',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Misissuigit',
  allTitle: 'Ilusilersorsinnaasatit tamarmik',
  allHint: 'Isaariaannaapput. Sunaluunniit qulaani allallugu ilusilersorsinnaavat.',
  startWith: 'Uannga aallartigit',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Illup iluani',
  interiorsHint: 'Inissat iluini ilusilersukkit takussutissiorlugillu.',
  architectureTitle: 'Illussanik ilusilersuineq',
  architectureHint: 'Illussanik suliniutit pilersikkit takussutissiorlugillu.',
  spacesTitle: 'Inissat',
  spacesHint: 'Silami, illoqarfimmi niuertarfinnilu inissat ilusilersukkit.',
  furnitureTitle: 'Pequtit',
  furnitureHint: 'Pequtit atortullu pilersikkit nammineq piumasannullu naleqqussakkit.',
  productTitle: 'Nioqqutissiaq',
  productHint: 'Atortoq nioqqutissiarluunniit sunaluunniit ilusilersoruk.',
  vehiclesTitle: 'Angallatit',
  vehiclesHint: 'Biilit, sikkilit motoorillit, umiatsiat, timmisartut allallu.',
  rendersTitle: 'Takussutissiat 3D-llu',
  rendersHint: 'Isumassarsiatit piviusorpalaartumik takukkit.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Ini angisooq',
  inKitchen: 'Igaffik',
  inBedroom: 'Sinittarfik',
  inBathroom: 'Uffarfik',
  inRemodel: 'Inissaq nutarteruk',
  arHouse: 'Illu nutaaliaq',
  arFacade: 'Illup saava',
  arBuilding: 'Illorsuaq',
  arCabin: 'Illunnguaq',
  arExtension: 'Illup annertusarnera',
  spGarden: 'Naatsiivik',
  spTerrace: 'Silami issiavik',
  spShop: 'Niuertarfik',
  spRestaurant: 'Neriniartarfik',
  spPublic: 'Inissaq tamanut ammasoq',
  fuChair: 'Issiavik',
  fuSofa: 'Issiavissuaq',
  fuTable: 'Nerrivik',
  fuShelf: 'Ilioraavik',
  fuLamp: 'Qulleq',
  prEveryday: 'Atortoq ulluinnarni atugaq',
  prPackaging: 'Poortuut',
  prAccessory: 'Ilassut',
  prGadget: 'Atortorissaarut',
  prJewel: 'Pinnersaat',
  veCar: 'Biili',
  veMotorbike: 'Sikkili motoorilik',
  veBoat: 'Umiatsiaq imaluunniit angallat nuannaarutigisaq',
  vePlane: 'Timmisartoq',
  veDrone: 'Timmisartunnguaq inuqanngitsoq',
  reRealistic: 'Takussutissiaq piviusorpalaartoq',
  reModel: 'Ilusaata assinga 3D',
  reAerial: 'Qulaanit isikkoq',
  reWalkthrough: 'Iluani ingerlaarneq',
  reBeforeAfter: 'Siornatigut kingornalu',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Isikkoq',
  optMaterials: 'Atortussat',
  optLighting: 'Qaammarsaaneq',
  valModern: 'Nutaaliaq',
  valMinimal: 'Pisariitsoq',
  valClassic: 'Nalinginnaasoq',
  valIndustrial: 'Suliffissuarnisut',
  valWood: 'Qisuk',
  valMetal: 'Saviminiq',
  valGlass: 'Igalaaminiq',
  valMixed: 'Akuleriit',
  valNatural: 'Pinngortitamit',
  valWarm: 'Kissartoq',
  valStudioLight: 'Assiliisarfimmisut',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Illup iluani',
  kindArchitecture: 'Illussanik ilusilersuineq',
  kindBoat: 'Umiatsiaq',
  kindFurniture: 'Pequtit',
  sampleLivingRoom: 'Ini angisooq qaamasoq',
  samplePineHouse: 'Illu orpippassuit akornanni',
  sampleYacht: 'Angallat nuannaarutigisaq, takissusia 15 m',
  sampleArmchair: 'Issiavik qisummik sanaaq',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  kindProduct: 'Nioqqutissiaq',
  sampleShoe: 'Kamiusaq amermeersoq',
  sampleGuitar: 'Guitari innaallagissamik ingerlasoq',
  heroLead: 'Ilusilersuigit',
  heroAccent: 'killeqanngitsumik.',
  brandingTitle: 'Ilisarnaasersuineq',
  objects3dTitle: '3D-mik ilusillit',
  designStudioTitle: 'Ilusilersuiffik',
  designStudioSub: 'Ilusilersukkat suliffimmi atugassat AI atorlugu pilersikkit, aaqqissukkit takullugillu.',
  openStudio: 'Ilusilersuiffik ammaruk',
  fashionHint: 'Atisat, atisat katersat allallu ilusilersukkit.',
};
