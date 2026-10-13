/*
 * SUECO — Mis creaciones (Mina skapelser): la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una creación es «skapelse» (en skapelse, pl. skapelser) y la biblioteca, «Mina skapelser»: la
 * misma palabra en todo el diccionario. La experiencia que trabaja entra por `{{nombre}}` y es
 * marca: va de sujeto («{{nombre}} arbetar») o detrás de «med» («Skapad med {{nombre}}»), nunca
 * con una terminación pegada. El orden es un conmutador que enseña el OTRO orden: «Äldst först» /
 * «Nyast först». Borrar una creación borra su ARCHIVO, así que aquí se dice «Radera» (la guía:
 * «Radera si destruye para siempre… un archivo»), no el «Ta bort» de `common.delete`; y el
 * estado y los avisos siguen el mismo verbo («Raderad», «Skapelsen har raderats»). «Audio» es
 * «Ljud» (glosario) y los vídeos, «videor». «Video», «Text» y «3D» se escriben igual que en
 * español o en inglés porque son las palabras suecas.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Mina skapelser',
  intro: 'Allt du har skapat med Weë AI, samlat på ett ställe. Det hör till ditt konto, så du ser samma sak från din riktiga profil som från din Weë-profil.',

  filterAll: 'Alla',
  filterImages: 'Bilder',
  filterVideos: 'Videor',
  filterAudio: 'Ljud',
  filterDocuments: 'Dokument',
  filterModel3d: '3D',
  filterLabel: 'Filtrera efter typ',

  sortRecent: 'Nyast först',
  sortOldest: 'Äldst först',
  sortLabel: 'Sortera',

  loading: 'Laddar dina skapelser…',
  loadFailed: 'Det gick inte att ladda dina skapelser.',
  retry: 'Försök igen',
  loadMore: 'Visa fler',
  emptyTitle: 'Inga skapelser ännu',
  emptyText: 'Allt du gör med Weë AI hamnar här, med bild, video eller ljud.',
  emptyAction: 'Skapa något med Weë AI',
  emptyFiltered: 'Inga skapelser av den här typen.',
  count_one: '{{contador}} skapelse',
  count_other: '{{contador}} skapelser',

  statusUploading: 'Laddar upp',
  statusProcessing: 'Bearbetas',
  statusReady: 'Klar',
  statusFailed: 'Misslyckades',
  statusDeleted: 'Raderad',
  pendingDeletion: 'Filen raderas inom kort.',

  kindImage: 'Bild',
  kindVideo: 'Video',
  kindAudio: 'Ljud',
  kindDocument: 'Dokument',
  kindModel3d: '3D',
  kindText: 'Text',

  open: 'Öppna',
  openCreation: 'Öppna skapelse: {{nombre}}',
  download: 'Ladda ner',
  downloaded: 'Sparat i galleriet.',
  downloadFailed: 'Det gick inte att ladda ner den. Försök igen.',
  downloadPermission: 'Weë behöver åtkomst till galleriet för att kunna spara.',
  savedInCreations: 'Sparad bland dina skapelser',
  save: 'Spara',
  saved: 'Sparad',
  useInProject: 'Använd i projekt',
  publish: 'Publicera',
  share: 'Dela',
  delete: 'Radera',
  deleteConfirm: 'Vill du radera den här skapelsen? Filen raderas. Det du redan har publicerat påverkas inte.',
  deleteConfirmWeb: 'Vill du radera den här skapelsen? Filen raderas. Det du redan har publicerat påverkas inte.',
  deleted: 'Skapelsen har raderats.',
  deleteFailed: 'Det gick inte att radera den. Försök igen.',
  createdWith: 'Skapad med {{nombre}}',
  createdOn: 'Skapad {{fecha}}',

  progressWorking: '{{nombre}} arbetar',
  progressStarting: 'Sätter igång…',
  progressSteps: '{{hechos}} av {{total}} steg klara',
  progressFindLater: 'Du kan lämna den här skärmen. Du hittar det i ”Mina skapelser” när det är klart.',

  /* Mundos 3D (misión mundo3d, 2026-10-05): su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer
     —nunca el nombre de la licencia, que nombra al modelo—. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: '3D-världar',
  kindWorld: '3D-värld',
  noViewer3d: 'Weë har ingen 3D-visare ännu. Ladda ner filen om du vill öppna den i en 3D-app.',
  rightsTitle: 'Så får du använda den',
  rightsProvenance: 'Skapad med AI i Weë med en tredjepartsmodell som har en egen licens.',
  rightsCommercialAllowed: 'Du får använda den kommersiellt.',
  rightsCommercialRestricted: 'Det finns villkor för kommersiell användning.',
  rightsCommercialUnclear: 'Det är ännu inte klart om den får användas kommersiellt.',
  rightsCommercialNotAllowed: 'Den får inte användas kommersiellt.',
  rightsAttribution: 'Licensen kräver att du anger källan.',
  rightsBlockedIn: 'Den får inte användas eller visas på följande platser: {{lugares}}.',

  /* Mis creaciones = lo que la persona DECIDIÓ conservar (R9): guardarlo, dónde está (ubicación, no estado) y volver a editarlo. */
  introKept: 'Resultaten som du har gjort klart och valt att behålla. De hör till ditt konto: du ser samma från din riktiga profil och din Weë-profil.',
  keep: 'Spara i Mina skapelser',
  keeping: 'Sparar…',
  keepPending: 'Det går inte att spara i Mina skapelser än. Ditt resultat finns kvar i sitt jobb.',
  keepFailed: 'Vi kunde inte spara den i Mina skapelser. Försök igen.',
  emptyKeepText: 'Här visas de resultat som du gör klart och väljer att behålla med ”{{accion}}”.',
  listPending: 'Vi kan inte visa Mina skapelser än. Dina resultat finns kvar i sina jobb.',
  locationLocal: 'På den här enheten',
  locationCloud: 'Synkroniserat med Weë Cloud',
  locationLegacy: 'Tidigare lagring',
  locationLabel: 'Var den finns: {{lugar}}',
  fromProject: 'Från projektet {{proyecto}}',
  savedAgo: 'Sparad {{cuando}}',
  editAgain: 'Redigera igen',
  editAgainOf: 'Redigera {{nombre}} igen',
  editAgainPending: 'Det går inte att redigera igen än.',
  editAgainFailed: 'Vi kunde inte öppna den för redigering. Försök igen.',

  /* «Sin decidir» (D-1 del dueño, 2026-10-12): el material anterior, aparte, sin migrar ni borrar. */
  undecidedTitle: 'Inte bestämt än',
  undecidedText: 'Material som du skapade innan du kunde välja vad du ville behålla. Inget har flyttats eller raderats: behåll det du vill som en skapelse.',
  undecidedFailed: 'Vi kunde inte ladda ditt material som inte är bestämt.',
  undecidedRetry: 'Försök ladda material som inte är bestämt igen',
  undecidedPending: 'Vi kan inte visa ditt material som inte är bestämt än. Inget har raderats.',
  undecidedEmpty: 'Du har inget material som inte är bestämt.',
  undecidedLoadMore: 'Ladda mer material som inte är bestämt',
  keepAsCreation: 'Behåll som skapelse',
  keepAsCreationOf: 'Behåll {{nombre}} som skapelse',

  /* Lo que dijo quien persistió («ya existía») y el reintento con la misma petición (R9). */
  alreadyKept: 'Den fanns redan bland dina skapelser',
  keepRetry: 'Försök spara i Mina skapelser igen',
};
