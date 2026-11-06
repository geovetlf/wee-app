/*
 * GRIEGO — Weë Design: diseñar y visualizar casi cualquier cosa física.
 * Tipado contra el español.
 *
 * «Render» se queda en latino, como lo usan los diseñadores en Grecia. Los
 * valores de ajuste concuerdan con su opción: estilo (στυλ, neutro), materiales
 * (υλικά, neutro plural) e iluminación (φωτισμός, masculino).
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Σχεδίασε χωρίς όρια.',
  description: 'Χώροι, προϊόντα, αντικείμενα και πολλά άλλα.\nΔώσε μορφή στις ιδέες σου.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Τι θέλεις να σχεδιάσεις σήμερα;',
  settingsHint: 'Πώς θέλεις να φαίνεται',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Εξερεύνηση',
  allTitle: 'Όλα όσα μπορείς να σχεδιάσεις',
  allHint: 'Είναι μόνο σημεία εκκίνησης. Μπορείς να σχεδιάσεις οτιδήποτε γράφοντάς το παραπάνω.',
  startWith: 'Ξεκίνα με',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Εσωτερικοί χώροι',
  interiorsHint: 'Σχεδίασε και οπτικοποίησε εσωτερικούς χώρους.',
  architectureTitle: 'Αρχιτεκτονική',
  architectureHint: 'Δημιούργησε και οπτικοποίησε αρχιτεκτονικά έργα.',
  spacesTitle: 'Χώροι',
  spacesHint: 'Σχεδίασε εξωτερικούς, αστικούς και εμπορικούς χώρους.',
  furnitureTitle: 'Έπιπλα',
  furnitureHint: 'Δημιούργησε και προσάρμοσε έπιπλα και στοιχεία.',
  productTitle: 'Προϊόν',
  productHint: 'Σχεδίασε οποιοδήποτε αντικείμενο ή προϊόν.',
  vehiclesTitle: 'Οχήματα',
  vehiclesHint: 'Αυτοκίνητα, μοτοσικλέτες, σκάφη, αεροπλάνα και άλλα.',
  rendersTitle: 'Renders και 3D',
  rendersHint: 'Δες τις ιδέες σου με υψηλό ρεαλισμό.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Ένα σαλόνι',
  inKitchen: 'Μια κουζίνα',
  inBedroom: 'Ένα υπνοδωμάτιο',
  inBathroom: 'Ένα μπάνιο',
  inRemodel: 'Ανακαίνιση ενός χώρου',
  arHouse: 'Ένα μοντέρνο σπίτι',
  arFacade: 'Μια πρόσοψη',
  arBuilding: 'Ένα κτίριο',
  arCabin: 'Μια καλύβα',
  arExtension: 'Μια επέκταση',
  spGarden: 'Ένας κήπος',
  spTerrace: 'Μια βεράντα',
  spShop: 'Ένα κατάστημα',
  spRestaurant: 'Ένα εστιατόριο',
  spPublic: 'Ένας δημόσιος χώρος',
  fuChair: 'Μια καρέκλα',
  fuSofa: 'Ένας καναπές',
  fuTable: 'Ένα τραπέζι',
  fuShelf: 'Μια βιβλιοθήκη',
  fuLamp: 'Ένα φωτιστικό',
  prEveryday: 'Ένα καθημερινό αντικείμενο',
  prPackaging: 'Μια συσκευασία',
  prAccessory: 'Ένα αξεσουάρ',
  prGadget: 'Μια συσκευή',
  prJewel: 'Ένα κόσμημα',
  veCar: 'Ένα αυτοκίνητο',
  veMotorbike: 'Μια μοτοσικλέτα',
  veBoat: 'Ένα σκάφος ή ένα γιοτ',
  vePlane: 'Ένα αεροπλάνο',
  veDrone: 'Ένα drone',
  reRealistic: 'Ένα ρεαλιστικό render',
  reModel: 'Ένα μοντέλο 3D',
  reAerial: 'Μια αεροφωτογραφία',
  reWalkthrough: 'Μια εικονική περιήγηση',
  reBeforeAfter: 'Ένα πριν και μετά',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Στιλ',
  optMaterials: 'Υλικά',
  optLighting: 'Φωτισμός',
  valModern: 'Μοντέρνο',
  valMinimal: 'Μινιμαλιστικό',
  valClassic: 'Κλασικό',
  valIndustrial: 'Βιομηχανικό',
  valWood: 'Ξύλο',
  valMetal: 'Μέταλλο',
  valGlass: 'Γυαλί',
  valMixed: 'Μεικτά',
  valNatural: 'Φυσικός',
  valWarm: 'Ζεστός',
  valStudioLight: 'Στούντιο',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Εσωτερικός χώρος',
  kindArchitecture: 'Αρχιτεκτονική',
  kindBoat: 'Σκάφος',
  kindFurniture: 'Έπιπλα',
  sampleLivingRoom: 'Φωτεινό σαλόνι',
  samplePineHouse: 'Σπίτι ανάμεσα στα πεύκα',
  sampleYacht: 'Γιοτ 15 μέτρων',
  sampleArmchair: 'Ξύλινη πολυθρόνα',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Προϊόν',
  sampleShoe: 'Δερμάτινο αθλητικό παπούτσι',
  sampleGuitar: 'Ηλεκτρική κιθάρα',
  heroLead: 'Σχεδίασε',
  heroAccent: 'χωρίς όρια.',
  brandingTitle: 'Branding',
  objects3dTitle: 'Αντικείμενα 3D',
  designStudioTitle: 'Στούντιο σχεδιασμού',
  designStudioSub: 'Δημιούργησε, επεξεργάσου και οπτικοποίησε επαγγελματικά σχέδια με AI.',
  openStudio: 'Άνοιγμα στούντιο',
  fashionHint: 'Σχεδίασε ρούχα, συλλογές και άλλα.',
};
