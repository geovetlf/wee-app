/*
 * FRANCÉS — Configuración: contenido, privacidad, preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Lo legal se dice con el término exacto:
 * "Conditions d’utilisation" y "Politique de confidentialité", no con sinónimos
 * bonitos. El emoji 📍 y los saltos de línea de `aboutBody` se copian tal cual.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Réglages',
  sectionContent: 'Contenu',
  sectionPrivacy: 'Confidentialité',
  sectionPreferences: 'Préférences',
  sectionSupport: 'Aide',
  myCommunities: 'Mes communautés',
  communitiesJoined_one: '{{contador}} communauté rejointe',
  communitiesJoined_other: '{{contador}} communautés rejointes',
  privateReplies: 'Réponses privées',
  privateRepliesHint: 'Autoriser les autres à t’envoyer des messages privés',
  pushNotifications: 'Notifications push',
  language: 'Langue',
  languageSubtitle: 'Choisis la langue de Weë',
  help: 'Aide',
  privacyPolicy: 'Politique de confidentialité',
  about: 'À propos de Weë',
  signOut: 'Se déconnecter',
  signOutFailed: 'Nous n’avons pas pu te déconnecter',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Initialiser les valeurs par défaut',
  seedDefaultsConfirm: 'Écrit dans Firestore les fournisseurs, les chaînes et les réglages par défaut qui n’existent pas encore. Rien n’est supprimé.',
  seed: 'Initialiser',
  sectionNotifications: 'Notifications',
  sectionInfo: 'Informations',
  sectionAccount: 'Compte',
  privacyPolicyHint: 'Ce que nous faisons de tes données, en mots simples',
  pushNotificationsHint: 'Reçois des notifications pour les nouveaux messages et l’activité',
  aboutHint: 'Ce qu’est Weë et la version que tu utilises',
  helpHint: 'Questions fréquentes et contact',
  signOutHint: 'Quitter ton compte',
  aboutBody: 'Weë (World Encode Entity) est le réseau social des personnes qui créent avec l’Intelligence Artificielle.\n\nVersion 1.0.0 · © {{anio}} Weë. Tous droits réservés.\n\nDonnées géographiques : GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Localisation',
  locationLine: '{{estado}} Ta localisation exacte n’est jamais affichée publiquement.',
  locationOff: 'Désactivée. Autorise Weë à utiliser ta localisation approximative pour te suggérer des lieux près de toi ainsi que ta zone quand tu ajoutes un lieu à une publication. Ta localisation exacte n’est jamais affichée publiquement.',
  locationUnavailable: 'Cet appareil ne peut pas nous donner ta localisation.',
  locationDisabled: 'La localisation est désactivée dans les réglages de ton appareil.',
  locationPermissionDenied: 'Tu as dit non au système. Appuie ici pour le changer dans les réglages de ton appareil.',
  locationPermissionNotDetermined: 'Weë te demandera l’autorisation quand ce sera nécessaire.',
  locationApproximate: 'Weë connaît ta zone, pas le point exact.',
  locationPrecise: 'Weë peut utiliser ta localisation précise quand une fonctionnalité en a besoin.',
};
