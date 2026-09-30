/*
 * FRANCÉS — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). `{{lista}}` es el nombre de la agenda y `{{nombre}}`
 * el de una persona: las frases están escritas para que el hueco caiga donde el
 * francés lo pide, sin pegar cadenas. En francés el cero cae en la forma
 * singular, por eso `count_one` lleva `{{contador}}` y no un 1 escrito a mano.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Demandes reçues',
  requestsSent: 'Demandes envoyées',
  yours: 'Tes {{lista}}',
  yoursWhenYouSignIn: 'Tes {{lista}}, une fois connecté',
  yoursWhenYouSignInSubtitle: '{{lista}} garde tes connexions sur Weë. Connecte-toi pour les voir.',
  noneYet: 'Tu n’as pas encore de {{lista}}',
  noneYetSubtitle: 'C’est ici que seront tes gens sur Weë. Une connexion se fait à deux : une personne la propose et l’autre l’accepte.',
  noAgenda: 'Ce profil n’a pas de liste de contacts',
  noAgendaSubtitle: '{{lista}} est l’endroit où vivent tes connexions avec d’autres personnes. Passe à ton Profil Réel ou à ton Profil Weë pour les voir.',
  wantsToConnect: '{{lista}} · veut se connecter avec toi',
  accept: 'Accepter {{nombre}}',
  reject: 'Refuser {{nombre}}',
  withdraw: 'Retirer ta demande à {{nombre}}',
  removeFrom: 'Retirer {{nombre}} de tes {{lista}}',
  openProfile: 'Ouvrir le {{etiqueta}} de {{nombre}}',
  rejectTitle: 'Refuser la demande',
  rejectConfirm: 'Refuser la demande de {{nombre}} ?',
  withdrawTitle: 'Retirer la demande',
  withdrawConfirm: 'Retirer ta demande à {{nombre}} ?',
  removeTitle: 'Retirer {{lista}}',
  removeConfirm: 'Retirer {{nombre}} de tes {{lista}} ?',
  failed: 'Ça n’a pas fonctionné',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'cette personne',
  acceptLabel: 'Accepter {{lista}}',
  rejectRequestLabel: 'Refuser la demande {{lista}}',
  requestSent: 'Demande envoyée',
  errSignIn: 'Connecte-toi pour utiliser ËContact.',
  errNotYours: 'Ce profil n’est pas à toi.',
  errNotAPerson: 'Ce profil ne peut pas utiliser ËContact.',
  errOffline: 'Impossible de se connecter à Weë.',
  errNoRequestToReject: 'Il n’y a aucune demande à refuser.',
  errNoPendingRequest: 'Tu n’as aucune demande en attente avec ce profil.',
  errNotConnected: 'Tu n’es pas connecté à ce profil.',
  errNoActiveProfile: 'Aucun profil actif pour faire ça.',
};
