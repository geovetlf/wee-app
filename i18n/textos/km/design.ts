/*
 * JEMER — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Entre palabras va el ZWSP (U+200B); el espacio normal separa frases y rodea
 * marcas, huecos y cifras. «Weë Design» es marca y no está aquí; lo que se
 * comparte con Weë Studio vive en `studio`. «3D» se deja en latino; el render
 * se dice «រូប​បង្ហាញ» (imagen de presentación), la forma corriente en jemer.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'រចនា​ដោយ​គ្មាន​ដែនកំណត់។',
  description: 'លំហ ផលិតផល វត្ថុ និង​ច្រើនទៀត។\nផ្ដល់​រូបរាង​ដល់​គំនិត​របស់អ្នក។',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'ថ្ងៃនេះ​អ្នក​ចង់​រចនា​អ្វី?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'អ្នក​ចង់​ឱ្យ​វា​មើលទៅ​យ៉ាងណា',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'រុករក',
  allTitle: 'អ្វីៗ​ទាំងអស់​ដែល​អ្នក​អាច​រចនា​បាន',
  allHint: 'ទាំងនេះ​គ្រាន់តែ​ជា​ច្រកចូល​ប៉ុណ្ណោះ។ អ្នក​អាច​រចនា​អ្វី​ក៏បាន ដោយ​សរសេរ​វា​នៅ​ខាងលើ។',
  startWith: 'ចាប់ផ្ដើម​ជាមួយ',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'ផ្ទៃខាងក្នុង',
  interiorsHint: 'រចនា និង​មើលឃើញ​លំហ​ខាងក្នុង។',
  architectureTitle: 'ស្ថាបត្យកម្ម',
  architectureHint: 'បង្កើត និង​មើលឃើញ​គម្រោង​ស្ថាបត្យកម្ម។',
  spacesTitle: 'លំហ',
  spacesHint: 'រចនា​លំហ​ខាងក្រៅ ទីក្រុង និង​ពាណិជ្ជកម្ម។',
  furnitureTitle: 'គ្រឿងសង្ហារឹម',
  furnitureHint: 'បង្កើត និង​កែតម្រូវ​គ្រឿងសង្ហារឹម និង​ធាតុ​ផ្សេងៗ។',
  productTitle: 'ផលិតផល',
  productHint: 'រចនា​វត្ថុ ឬ ផលិតផល​ណា​ក៏បាន។',
  vehiclesTitle: 'យានយន្ត',
  vehiclesHint: 'រថយន្ត ម៉ូតូ ទូក យន្តហោះ និង​ច្រើនទៀត។',
  rendersTitle: 'រូប​បង្ហាញ និង 3D',
  rendersHint: 'មើលឃើញ​គំនិត​របស់អ្នក​ក្នុង​ភាព​ជាក់ស្ដែង​ខ្ពស់។',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'បន្ទប់​ទទួលភ្ញៀវ',
  inKitchen: 'ផ្ទះបាយ',
  inBedroom: 'បន្ទប់គេង',
  inBathroom: 'បន្ទប់ទឹក',
  inRemodel: 'កែលម្អ​លំហ​មួយ',
  arHouse: 'ផ្ទះ​ទំនើប',
  arFacade: 'ផ្នែក​ខាងមុខ​អគារ',
  arBuilding: 'អគារ',
  arCabin: 'ខ្ទម​ឈើ',
  arExtension: 'ការពង្រីក​អគារ',
  spGarden: 'សួនច្បារ',
  spTerrace: 'រានហាល',
  spShop: 'ហាង​ពាណិជ្ជកម្ម',
  spRestaurant: 'ភោជនីយដ្ឋាន',
  spPublic: 'លំហ​សាធារណៈ',
  fuChair: 'កៅអី',
  fuSofa: 'សាឡុង',
  fuTable: 'តុ',
  fuShelf: 'ធ្នើរ',
  fuLamp: 'ចង្កៀង',
  prEveryday: 'វត្ថុ​ប្រើប្រាស់​ប្រចាំថ្ងៃ',
  prPackaging: 'ការវេចខ្ចប់',
  prAccessory: 'គ្រឿង​តុបតែង',
  prGadget: 'ឧបករណ៍',
  prJewel: 'គ្រឿង​អលង្ការ',
  veCar: 'រថយន្ត',
  veMotorbike: 'ម៉ូតូ',
  veBoat: 'ទូក ឬ យ៉ត',
  vePlane: 'យន្តហោះ',
  veDrone: 'ដ្រូន',
  reRealistic: 'រូប​បង្ហាញ​បែប​ជាក់ស្ដែង',
  reModel: 'ម៉ូដែល 3D',
  reAerial: 'ទិដ្ឋភាព​ពីលើអាកាស',
  reWalkthrough: 'ការដើរ​ទស្សនា',
  reBeforeAfter: 'មុន និង​ក្រោយ',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'រចនាប័ទ្ម',
  optMaterials: 'សម្ភារៈ',
  optLighting: 'ពន្លឺ',
  valModern: 'ទំនើប',
  valMinimal: 'សាមញ្ញ',
  valClassic: 'បុរាណ',
  valIndustrial: 'ឧស្សាហកម្ម',
  valWood: 'ឈើ',
  valMetal: 'លោហៈ',
  valGlass: 'កញ្ចក់',
  valMixed: 'លាយ​ចម្រុះ',
  valNatural: 'ធម្មជាតិ',
  valWarm: 'កក់ក្ដៅ',
  valStudioLight: 'ស្ទូឌីយោ',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'ផ្ទៃខាងក្នុង',
  kindArchitecture: 'ស្ថាបត្យកម្ម',
  kindBoat: 'ទូក',
  kindFurniture: 'គ្រឿងសង្ហារឹម',
  sampleLivingRoom: 'បន្ទប់​ទទួលភ្ញៀវ​ភ្លឺ',
  samplePineHouse: 'ផ្ទះ​ក្នុង​ព្រៃ​ស្រល់',
  sampleYacht: 'យ៉ត​ប្រវែង 15 ម៉ែត្រ',
  sampleArmchair: 'កៅអី​ឈើ​មាន​ដៃ',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'ផលិតផល',
  sampleShoe: 'ស្បែកជើង​ប៉ាតា​ស្បែក',
  sampleGuitar: 'ហ្គីតា​អគ្គិសនី',
  heroLead: 'រចនា',
  heroAccent: 'គ្មាន​ដែនកំណត់។',
  brandingTitle: 'ម៉ាកយីហោ',
  objects3dTitle: 'វត្ថុ 3D',
  designStudioTitle: 'ស្ទូឌីយោ​រចនា',
  designStudioSub: 'បង្កើត កែសម្រួល និង​មើល​ការរចនា​អាជីព​ជាមួយ AI។',
  openStudio: 'បើក​ស្ទូឌីយោ',
  fashionHint: 'រចនា​សម្លៀកបំពាក់ កម្រងម៉ូដ និង​ច្រើន​ទៀត។',
};
