/*
 * POLACO — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo. Donde el español pone a Weë como sujeto de un verbo en pasado, el
 * polaco se reformula («Pozwól aplikacji Weë używać…») porque la marca no se
 * declina ni tiene género. `communitiesJoined` lleva las cuatro formas del
 * plural polaco con `ConPlurales`.
 */
import { ConPlurales } from '../ru/plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Ustawienia',
  sectionContent: 'Treści',
  sectionPrivacy: 'Prywatność',
  sectionPreferences: 'Preferencje',
  sectionSupport: 'Pomoc',
  myCommunities: 'Moje społeczności',
  communitiesJoined_one: 'Należysz do {{contador}} społeczności',
  communitiesJoined_few: 'Należysz do {{contador}} społeczności',
  communitiesJoined_many: 'Należysz do {{contador}} społeczności',
  communitiesJoined_other: 'Należysz do {{contador}} społeczności',
  privateReplies: 'Prywatne odpowiedzi',
  privateRepliesHint: 'Pozwól innym wysyłać ci prywatne wiadomości',
  pushNotifications: 'Powiadomienia push',
  language: 'Język',
  languageSubtitle: 'Wybierz język aplikacji Weë',
  help: 'Pomoc',
  privacyPolicy: 'Polityka prywatności',
  about: 'O aplikacji Weë',
  signOut: 'Wyloguj się',
  signOutFailed: 'Nie udało nam się cię wylogować',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Zainicjuj wartości domyślne',
  seedDefaultsConfirm: 'Zapisuje w Firestore domyślnych dostawców, łańcuchy i ustawienia, których jeszcze nie ma. Niczego nie usuwa.',
  seed: 'Zainicjuj',
  sectionNotifications: 'Powiadomienia',
  sectionInfo: 'Informacje',
  sectionAccount: 'Konto',
  privacyPolicyHint: 'Co robimy z twoimi danymi, prostymi słowami',
  pushNotificationsHint: 'Otrzymuj powiadomienia o nowych wiadomościach i aktywności',
  aboutHint: 'Czym jest Weë i jakiej wersji używasz',
  helpHint: 'Najczęstsze pytania i kontakt',
  signOutHint: 'Wyloguj się ze swojego konta',
  aboutBody: 'Weë (World Encode Entity) to sieć społecznościowa dla osób, które tworzą ze sztuczną inteligencją.\n\nWersja 1.0.0 · © {{anio}} Weë. Wszelkie prawa zastrzeżone.\n\nDane geograficzne: GeoNames (geonames.org), CC BY 4.0.',
  location: 'Lokalizacja',
  locationLine: '{{estado}} Twoja dokładna lokalizacja nigdy nie jest pokazywana publicznie.',
  locationOff: 'Wyłączona. Pozwól aplikacji Weë używać twojej przybliżonej lokalizacji, aby podpowiadać ci pobliskie miejsca i twoją okolicę, gdy dodajesz lokalizację do posta. Twoja dokładna lokalizacja nigdy nie jest pokazywana publicznie.',
  locationUnavailable: 'To urządzenie nie może podać nam twojej lokalizacji.',
  locationDisabled: 'Lokalizacja jest wyłączona w ustawieniach twojego urządzenia.',
  locationPermissionDenied: 'Zgoda została odrzucona w systemie. Dotknij tutaj, aby zmienić to w ustawieniach urządzenia.',
  locationPermissionNotDetermined: 'Weë poprosi cię o zgodę, gdy będzie jej potrzebować.',
  locationApproximate: 'Weë zna twoją okolicę, a nie dokładny punkt.',
  locationPrecise: 'Weë może używać twojej dokładnej lokalizacji, gdy jakaś funkcja tego potrzebuje.',
};
