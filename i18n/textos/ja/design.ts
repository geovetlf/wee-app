/*
 * JAPONÉS — Weë Design: la cabecera, la caja, las categorías con sus puntos de partida, los ajustes y de qué es cada creación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los puntos de partida (inLiving, arHouse…) se escriben en la caja, seguidos de un espacio, para que la persona
 * termine la idea: van como sustantivos, sin el artículo del español (リビング, モダンな家). «Explora» es 発見, la
 * palabra del glosario; «Producto» es 商品, como en studio y en Weë Business. La luz sigue el glosario
 * (ライティング) y sus valores son los de studio: 自然光, スタジオ照明. «Materiales» de un diseño es 素材 (de
 * qué está hecho); el 材料費 de Weë Business es otra cosa, un coste.
 */
export const design: typeof import('../es/design').design = {
  slogan: '思いのままにデザイン。',
  description: '空間や商品、身の回りのモノまで。\nアイデアを形にしましょう。',

  placeholder: '今日は何をデザインしますか？',
  settingsHint: 'どんな見た目にしたいか',

  exploreTitle: '発見',
  allTitle: 'デザインできるもの',
  allHint: 'ここにあるのはほんの一例です。上の入力欄に書けば、どんなものでもデザインできます。',
  startWith: 'まずはここから',

  interiorsTitle: 'インテリア',
  interiorsHint: '室内空間をデザインして、完成イメージを確認できます。',
  architectureTitle: '建築',
  architectureHint: '建築プランを作って、完成イメージを確認できます。',
  spacesTitle: '空間',
  spacesHint: '屋外や街なか、店舗の空間をデザインできます。',
  furnitureTitle: '家具',
  furnitureHint: '家具やインテリア小物を作って、好みに合わせてカスタマイズできます。',
  productTitle: '商品',
  productHint: 'どんなモノや商品もデザインできます。',
  vehiclesTitle: '乗り物',
  vehiclesHint: '車、バイク、船、飛行機などをデザインできます。',
  rendersTitle: 'レンダリングと3D',
  rendersHint: 'アイデアを、写真のようなリアルさで表現できます。',

  inLiving: 'リビング',
  inKitchen: 'キッチン',
  inBedroom: '寝室',
  inBathroom: 'バスルーム',
  inRemodel: '空間をリフォーム',
  arHouse: 'モダンな家',
  arFacade: '外観',
  arBuilding: '建物',
  arCabin: 'コテージ',
  arExtension: '増築',
  spGarden: '庭',
  spTerrace: 'テラス',
  spShop: '店舗',
  spRestaurant: 'レストラン',
  spPublic: '公共スペース',
  fuChair: '椅子',
  fuSofa: 'ソファ',
  fuTable: 'テーブル',
  fuShelf: '棚',
  fuLamp: 'ランプ',
  prEveryday: '日用品',
  prPackaging: 'パッケージ',
  prAccessory: 'アクセサリー',
  prGadget: 'ガジェット',
  prJewel: 'ジュエリー',
  veCar: '車',
  veMotorbike: 'バイク',
  veBoat: '船・ヨット',
  vePlane: '飛行機',
  veDrone: 'ドローン',
  reRealistic: 'リアルなレンダリング',
  reModel: '3Dモデル',
  reAerial: '空からの眺め',
  reWalkthrough: 'ウォークスルー動画',
  reBeforeAfter: 'ビフォーアフター',

  optStyle: 'スタイル',
  optMaterials: '素材',
  optLighting: 'ライティング',
  valModern: 'モダン',
  valMinimal: 'ミニマル',
  valClassic: 'クラシック',
  valIndustrial: 'インダストリアル',
  valWood: '木材',
  valMetal: '金属',
  valGlass: 'ガラス',
  valMixed: 'ミックス',
  valNatural: '自然光',
  valWarm: '暖かい光',
  valStudioLight: 'スタジオ照明',

  kindInterior: 'インテリア',
  kindArchitecture: '建築',
  kindBoat: '船',
  kindFurniture: '家具',
  sampleLivingRoom: '明るいリビング',
  samplePineHouse: '松林の家',
  sampleYacht: '15メートルのヨット',
  sampleArmchair: '木製のアームチェア',
};
