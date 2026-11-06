/*
 * POLACO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de la persona entra sin declinar, y el polaco declina. Para no
 * forzarlo se usa el sustantivo puente «użytkownika» («Zaakceptuj użytkownika
 * {{nombre}}»), que vale igual en acusativo y en genitivo. «Solicitud» se dice
 * «zaproszenie», que es la palabra que usan las redes sociales en polaco.
 * `count` lleva las cuatro formas, todas iguales porque {{lista}} es marca.
 */
import { ConPlurales } from '../ru/plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Otrzymane zaproszenia',
  requestsSent: 'Wysłane zaproszenia',
  yours: 'Twoje {{lista}}',
  yoursWhenYouSignIn: 'Twoje {{lista}}, gdy się zalogujesz',
  yoursWhenYouSignInSubtitle: '{{lista}} przechowuje twoje połączenia w Weë. Zaloguj się, aby je zobaczyć.',
  noneYet: 'Nie masz jeszcze {{lista}}',
  noneYetSubtitle: 'Tu będą twoi ludzie w Weë. Połączenie powstaje między dwiema osobami: jedna je proponuje, a druga akceptuje.',
  noAgenda: 'Ten profil nie ma listy kontaktów',
  noAgendaSubtitle: '{{lista}} to miejsce twoich połączeń z innymi osobami. Przełącz się na Prawdziwy profil lub Profil Weë, aby je zobaczyć.',
  wantsToConnect: '{{lista}} · chce się z tobą połączyć',
  accept: 'Zaakceptuj użytkownika {{nombre}}',
  reject: 'Odrzuć użytkownika {{nombre}}',
  withdraw: 'Wycofaj zaproszenie dla użytkownika {{nombre}}',
  removeFrom: 'Usuń użytkownika {{nombre}} ze swoich {{lista}}',
  openProfile: 'Otwórz {{etiqueta}} użytkownika {{nombre}}',
  rejectTitle: 'Odrzuć zaproszenie',
  rejectConfirm: 'Odrzucić zaproszenie od użytkownika {{nombre}}?',
  withdrawTitle: 'Wycofaj zaproszenie',
  withdrawConfirm: 'Wycofać zaproszenie dla użytkownika {{nombre}}?',
  removeTitle: 'Usuń {{lista}}',
  removeConfirm: 'Usunąć użytkownika {{nombre}} ze swoich {{lista}}?',
  failed: 'Nie udało się tego zrobić',
  count_one: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_many: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'ta osoba',
  acceptLabel: 'Zaakceptuj {{lista}}',
  rejectRequestLabel: 'Odrzuć zaproszenie do {{lista}}',
  requestSent: 'Zaproszenie wysłane',
  errSignIn: 'Zaloguj się, aby korzystać z ËContact.',
  errNotYours: 'Ten profil nie należy do ciebie.',
  errNotAPerson: 'Ten profil nie może korzystać z ËContact.',
  errSameProfile: 'Profil nie może połączyć się sam ze sobą.',
  errOffline: 'Nie udało się połączyć z Weë.',
  errNoRequestToReject: 'Nie ma zaproszenia do odrzucenia.',
  errNoPendingRequest: 'Nie masz oczekującego zaproszenia związanego z tym profilem.',
  errNotConnected: 'Nie masz połączenia z tym profilem.',
  errNoActiveProfile: 'Nie ma aktywnego profilu, z którym można to zrobić.',
};
