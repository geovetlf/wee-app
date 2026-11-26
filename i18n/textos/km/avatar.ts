/*
 * JEMER — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «រូបតំណាង» = avatar; el motivo del sistema llega por {{motivo}} y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'ជ្រើសរើស​រូបតំណាង',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'រូបតំណាង​មនុស្ស AI',
  aiTitle: 'បង្កើត​រូបតំណាង​មនុស្ស​របស់ខ្ញុំ',
  aiSubtitle: 'បង្កើត​មុខ​ប្រឌិត​ជាមួយ AI',

  photoSection: 'រូបថត​ផ្ទាល់ខ្លួន',
  takePhoto: 'ថតរូប',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'ជ្រើសរើស​រូបភាព',
  fromGallery: 'ពី​វិចិត្រសាល',

  avatarsSection: 'រូបតំណាង',
  processing: 'កំពុង​ដំណើរការ​រូបភាព...',

  galleryPermission: 'យើង​ត្រូវការ​ចូលប្រើ​វិចិត្រសាល​របស់អ្នក​ដើម្បី​ជ្រើសរើស​រូបថត',
  cameraPermission: 'យើង​ត្រូវការ​ចូលប្រើ​កាមេរ៉ា​របស់អ្នក​ដើម្បី​ថតរូប',
  pickFailed: 'មិនអាច​ជ្រើសរើស​រូបភាព​បានទេ។ សូម​ព្យាយាម​ម្តងទៀត។',
  photoFailed: 'មិនអាច​ថតរូប​បានទេ',
  styleAdventurer: 'អ្នកផ្សងព្រេង',
  styleRobots: 'មនុស្សយន្ត',
  styleSmile: 'ស្នាមញញឹម',
  stylePeople: 'មនុស្ស',
};
