/*
 * GRIEGO — Weë Chef: el sitio donde se cocina. Tipado contra el español.
 *
 * Los valores de ajuste concuerdan con su opción: dieta (δίαιτα) y dificultad
 * (δυσκολία) en femenino. «Vegano» es «βίγκαν» (invariable). «Macros» se
 * explicita como «μακροθρεπτικά».
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Συνταγές, μενού και υλικά.\nΜε ό,τι έχεις ήδη στο σπίτι.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Γράψε την ιδέα σου, τα υλικά σου ή χρησιμοποίησε μια φωτογραφία',
  addLabel: 'Προσθήκη φωτογραφίας',
  cameraLabel: 'Λήψη φωτογραφίας',
  galleryLabel: 'Επιλογή φωτογραφίας από τη συλλογή',
  photoReady: 'Η φωτογραφία προστέθηκε',
  settingsLabel: 'Ρυθμίσεις συνταγής',
  voiceLabel: 'Υπαγόρευση',
  sendLabel: 'Μαγείρεμα',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Τι θέλεις να κάνεις;',
  nutritionTitle: 'Διατροφικές πληροφορίες',
  nutritionSubtitle: 'Θερμίδες, μακροθρεπτικά και αλλεργιογόνα',
  swapTitle: 'Αντικατάσταση υλικών',
  swapSubtitle: 'Άλλαξε ό,τι δεν έχεις ή δεν μπορείς να φας',
  shoppingTitle: 'Λίστα αγορών',
  shoppingSubtitle: 'Ό,τι χρειάζεται να αγοράσεις',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Διάλεξε από πού θα ξεκινήσεις και ολοκλήρωσε τη φράση με δικά σου λόγια.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Θερμίδες',
  nuProtein: 'Πρωτεΐνες',
  nuFat: 'Λιπαρά',
  nuCarbs: 'Υδατάνθρακες',
  nuSugar: 'Ζάχαρη',
  nuSodium: 'Νάτριο',
  nuAllergens: 'Αλλεργιογόνα',
  nuPortion: 'Ανά μερίδα',
  nuAll: 'Όλα',

  /* Sustituir ingredientes */
  swMissing: 'Μου λείπει ένα υλικό',
  swLactose: 'Χωρίς λακτόζη',
  swGluten: 'Χωρίς γλουτένη',
  swEgg: 'Χωρίς αυγό',
  swNuts: 'Χωρίς ξηρούς καρπούς',
  swVegetarian: 'Χορτοφαγικό',
  swVegan: 'Βίγκαν',
  swSugar: 'Χωρίς ζάχαρη',
  swCheaper: 'Πιο οικονομικό',
  swPantry: 'Με ό,τι έχω',

  /* Lista de compras */
  shRecipe: 'Από μια συνταγή',
  shMenu: 'Από ένα μενού',
  shWeek: 'Για την εβδομάδα',
  shOccasion: 'Για μια περίσταση',
  shPantry: 'Τα βασικά του ντουλαπιού',
  shAisles: 'Ταξινομημένη ανά διάδρομο',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Ό,τι χρειάζεται να ξέρουμε για να το μαγειρέψουμε',
  optPeople: 'Άτομα',
  optTime: 'Χρόνος',
  optDiet: 'Δίαιτα',
  optLevel: 'Δυσκολία',
  valAnyone: 'Όσα άτομα θέλεις',
  valOne: 'Για μένα',
  valTwo: 'Για δύο',
  valFamily: 'Για την οικογένεια',
  valMany: 'Για πολλούς',
  valAnyTime: 'Όσος χρειαστεί',
  valQuick: '15 λεπτά',
  valHalfHour: 'Μισή ώρα',
  valLong: 'Μία ώρα ή περισσότερο',
  valNoDiet: 'Χωρίς περιορισμούς',
  valVegetarian: 'Χορτοφαγική',
  valVegan: 'Βίγκαν',
  valGlutenFree: 'Χωρίς γλουτένη',
  valLactoseFree: 'Χωρίς λακτόζη',
  valSugarFree: 'Χωρίς ζάχαρη',
  valAnyLevel: 'Οποιαδήποτε',
  valEasy: 'Εύκολη',
  valMedium: 'Μέτρια',
  valPro: 'Επιπέδου σεφ',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Τα έργα μου',
  seeAll: 'Προβολή όλων',
  projectsEmpty: 'Δεν έχεις μαγειρέψει ακόμα τίποτα με το Weë.',
  projectsEmptyHint: 'Ό,τι δημιουργείς εδώ αποθηκεύεται και το ξαναβρίσκεις σε αυτή τη σειρά.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Πες μου τι θέλεις να μαγειρέψεις…',
  heroLead: 'Ο σεφ σου με AI,',
  heroAccent: 'πάντα μαζί σου',
  chipRecipes: 'Συνταγές',
  chipMenus: 'Μενού',
  chipHealthy: 'Υγιεινά',
  chipQuick: 'Γρήγορα',
};
