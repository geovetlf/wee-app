/*
 * DOS FRASES QUE SE QUEDARON EN ESPAÑOL (fase 5E).
 *
 * Son de sitios muy distintos y por eso se habían salvado de las fases
 * anteriores, cada una por su lado:
 *
 *   · LA BANDEJA VACÍA DE WEETALK. Debajo de "Sin conversaciones" —que sí
 *     estaba migrado— venía la explicación de cómo se empieza una, escrita a
 *     mano y con un salto de línea puesto en mitad de la oración;
 *
 *   · EL AVISO DE QUE UN VOTO NO LLEGÓ. La fase de encuestas cerró todo lo que
 *     se lee mientras se mira una —los votos, el tiempo, el estado— y dejó
 *     fuera el aviso de error, que es de otra familia.
 *
 * LO QUE NO CAMBIA, Y AQUÍ SE DEFIENDE: cómo se vota, quién puede votar, lo que
 * dice el servidor cuando falla —que se sigue enseñando tal cual, sin traducir,
 * porque es información técnica y no una frase de Weë— y las conversaciones.
 *
 * Se usa el traductor de verdad de Weë, como en `i18n-polls.test.mjs`.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ES = await traductorDe('es');
const EN = await traductorDe('en');
const esT = textosDe('es');
const enT = textosDe('en');

const BANDEJA = soloCodigo(leer('screens/InboxScreen.tsx'));
const ENCUESTA = soloCodigo(leer('components/Poll.tsx'));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La bandeja vacía de WeeTalk ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 1 · La frase escrita a mano ya no está. */
  check('1) la bandeja ya no escribe la explicación en español',
    !/Toca "Privado"/.test(BANDEJA) && !/conversación anónima/.test(BANDEJA));
  check('1) y el salto de línea puesto a mano se fue con ella',
    !/publicación\{'\\n'\}/.test(BANDEJA));

  /* 2 y 3 · La clave existe en los dos idiomas. */
  check('2) la clave existe en español', !!esT.weetalk?.noConversationsHint);
  check('3) y en inglés', !!enT.weetalk?.noConversationsHint);
  check('3) ninguna de las dos está vacía',
    !!String(esT.weetalk?.noConversationsHint ?? '').trim() && !!String(enT.weetalk?.noConversationsHint ?? '').trim());

  /*
   * 4 y 5 · Y dicen lo que tienen que decir: el botón que EXISTE. La pista citaba un botón «Privado» que no está en
   * ninguna pantalla; ahora el nombre del botón entra por hueco, `{{boton}}` = `wall.sendByWeeTalk`, el del menú de
   * una publicación que abre la conversación con quien la publicó. Y es «privada», como `conversationStart`: sale con
   * la cara activa, no es anónima.
   */
  const pista = (t) => t('weetalk.noConversationsHint', { boton: t('wall.sendByWeeTalk') });
  check('4) en español: ' + pista(ES),
    pista(ES) === 'Abre el menú de cualquier publicación y toca "Enviar por WeeTalk" para iniciar una conversación privada');
  check('5) en inglés: ' + pista(EN),
    pista(EN) === 'Open the menu on any post and tap "Send via WeeTalk" to start a private conversation');

  /*
   * 6 · "PRIVADO" NO ERA UN CONTROL, Y NINGÚN IDIOMA LO NOMBRA YA.
   *
   * En toda la interfaz de Weë no hay ningún control que se llame así. En cada idioma, lo único entrecomillado de la
   * pista es el nombre de su botón `wall.sendByWeeTalk`, y ese botón existe: es la opción del menú de la publicación.
   */
  const conControl = ['components/PostCard.tsx', 'components/CommentCard.tsx', 'components/CreateSheet.tsx']
    .filter((p) => /'Privado'|"Privado"|>Privado</.test(leer(p)));
  check('6) no existe ningún control llamado "Privado"', conControl.length === 0, conControl.join(' '));
  const TARJETA = leer('components/PostCard.tsx');
  check('6) el botón que cita la pista existe: es la opción del menú de la publicación',
    /onPress=\{enviarDesdeElMenu\}/.test(TARJETA) && /\{t\('wall\.sendByWeeTalk'\)\}<\/Text>/.test(TARJETA));
  const ENTRECOMILLADO = /"([^"]+)"|“([^”]+)”|”([^”]+)”|«([^»]+)»|「([^」]+)」/g;
  const citasDe = (frase) => [...frase.matchAll(ENTRECOMILLADO)].map((m) => m.slice(1).find(Boolean));
  const IDIOMAS = fs.readdirSync(new URL('../../i18n/textos/', import.meta.url)).filter((n) => !n.includes('.'));
  const mal = [];
  for (const codigo of IDIOMAS) {
    const t = await traductorDe(codigo);
    const citas = citasDe(pista(t));
    const huecos = (textosDe(codigo).weetalk.noConversationsHint.match(/\{\{boton\}\}/g) || []).length;
    if (huecos !== 1 || citas.length !== 1 || citas[0] !== t('wall.sendByWeeTalk')) mal.push(`${codigo}: ${pista(t)}`);
  }
  check(`6) en los ${IDIOMAS.length} idiomas, la pista cita solo el botón que existe, por su hueco`,
    IDIOMAS.length >= 17 && mal.length === 0, mal.slice(0, 3).join(' | '));
  /* SABOTAJE: la pista de antes, con su «Privado» escrito a mano, no pasaría. */
  check('6) SABOTAJE: la pista de antes, con «Privado» escrito, no pasaría',
    citasDe('Toca "Privado" en cualquier publicación para iniciar una conversación anónima')[0] !== ES('wall.sendByWeeTalk'));

  /* 7 · Lo que escribe la gente se sigue pintando crudo. */
  check('7) los mensajes y los nombres no pasan por el traductor',
    /\{otherData\.displayName \|\| t\('common\.user'\)\}/.test(BANDEJA)
    && !/t\(last\.content\)|t\(otherData\.displayName\)|t\(item\.lastMessage/.test(BANDEJA));

  /* 8, 9 y 10 · CONTROL: la bandeja funciona como funcionaba. */
  check('8) control: las conversaciones se siguen escuchando igual',
    /messagesService\./.test(BANDEJA)
    && /const unread = last && !last\.read && last\.senderId !== activeUid;/.test(BANDEJA));
  check('9) control: la navegación al chat no cambió',
    /const openChat = \(c: Conversation\) => \{/.test(BANDEJA) && /nav\.navigate\('Conversation'/.test(BANDEJA));
  check('10) control: borrar y buscar siguen donde estaban',
    /messagesService\.deleteConversation\(id\)/.test(BANDEJA) && /const filtered = search\.trim\(\)/.test(BANDEJA));
  check('10) y el título del estado vacío sigue saliendo de su clave de siempre',
    /\{t\('weetalk\.noConversations'\)\}/.test(BANDEJA)
    && /\{t\('weetalk\.noConversationsHint', \{ boton: t\('wall\.sendByWeeTalk'\) \}\)\}/.test(BANDEJA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El voto que no llegó ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 11 · La frase escrita a mano ya no está. */
  check('11) la encuesta ya no escribe el aviso en español',
    !/'No se pudo registrar tu voto'/.test(ENCUESTA));

  /* 12 y 13 · La clave existe en los dos idiomas y ninguna está vacía. */
  check('12) la clave existe en español', !!esT.wall?.pollVoteFailed);
  check('13) y en inglés', !!enT.wall?.pollVoteFailed);
  check('13) ninguna de las dos está vacía',
    !!String(esT.wall?.pollVoteFailed ?? '').trim() && !!String(enT.wall?.pollVoteFailed ?? '').trim());

  /* 14 y 15 · Y dicen lo que tienen que decir. */
  check('14) en español: ' + ES('wall.pollVoteFailed'), ES('wall.pollVoteFailed') === 'No se pudo registrar tu voto');
  check('15) en inglés: ' + EN('wall.pollVoteFailed'),
    EN('wall.pollVoteFailed') === 'Your vote could not be registered');

  /*
   * 16 · `notify` SE SIGUE USANDO IGUAL, con sus dos mitades.
   *
   * El titular lo pone Weë y ahora viene del diccionario. El detalle que va
   * detrás es el mensaje del error tal cual: NO se traduce, porque es lo que
   * dijo el servidor y traducirlo sería inventárselo.
   */
  /* El detalle es el del servidor, reconocido y en el idioma de quien vota (`mensajeDelServidor`); lo que no reconoce, tal cual. */
  check('16) notify sigue recibiendo el titular y el detalle',
    /notify\(t\('wall\.pollVoteFailed'\), mensajeDelServidor\(error, \{ t, locale \}\)\);/.test(ENCUESTA));
  check('16) y el detalle del servidor no pasa por el traductor',
    !/t\(error\.message\)|t\(String\(error/.test(ENCUESTA));
  check('16) sin sistemas de aviso paralelos', /from '\.\.\/utils\/notify'/.test(leer('components/Poll.tsx'))
    && !/window\.alert|Alert\.alert/.test(ENCUESTA));

  /* 17, 18 y 19 · CONTROL: votar sigue siendo exactamente lo que era. */
  check('17) control: el voto lo confirma el servidor y se revierte si falla',
    /const confirmado = await postsService\.voteInPollById\(postId!, optionId\);/.test(ENCUESTA)
    && /setConteos\(confirmado\.counts \|\| \{\}\);/.test(ENCUESTA)
    && /setConteos\(antes\.conteos\);/.test(ENCUESTA) && /setMiVoto\(antes\.miVoto\);/.test(ENCUESTA));
  check('17) y cambiar de voto sigue sin sumar al total',
    /setTotal\(antes\.miVoto \? antes\.total : antes\.total \+ 1\)/.test(ENCUESTA));
  check('18) control: el cliente no escribe contadores ni toca Firestore',
    !/updateDoc|setDoc|runTransaction|writeBatch|'poll\.counts'|'poll\.totalVotes'/.test(ENCUESTA));
  check('19) control: quién puede votar no cambió',
    /const permiteCambio = poll\.allowChange !== false;/.test(ENCUESTA)
    && /const pulsable = /.test(ENCUESTA) && /onRequireAuth\?\.\(\)/.test(ENCUESTA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Sin sistemas paralelos, sin idiomas clavados ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const CLAVES = [['weetalk', 'noConversationsHint'], ['wall', 'pollVoteFailed']];

  /* 20 · Ningún catálogo de errores nuevo, ni contexto, ni librería. */
  check('20) no se montó un sistema de errores propio',
    !/i18next|react-intl|ERRORES\s*=|MENSAJES_DE_ERROR/.test(BANDEJA + ENCUESTA)
    && /from '\.\.\/contexts\/IdiomaContext'/.test(leer('screens/InboxScreen.tsx'))
    && /from '\.\.\/contexts\/IdiomaContext'/.test(leer('components/Poll.tsx')));

  /* 21 · El traductor de estas pruebas es el de la aplicación. */
  check('21) las pruebas usan el crearTraductor de Weë',
    /crearTraductor/.test(leer('functions/test/i18n-ayuda.mjs'))
    && /i18n\/traducir\.ts/.test(leer('functions/test/i18n-ayuda.mjs')));

  /* 22 · Ninguna inglesa vacía, y traducidas de verdad. */
  const copiadas = CLAVES.filter(([m, k]) => esT[m][k] === enT[m][k]).map(([m, k]) => m + '.' + k);
  check('22) las dos están traducidas de verdad', copiadas.length === 0, copiadas.join(' '));
  const conAcento = CLAVES.filter(([m, k]) => /[áéíóúñ¿¡]/i.test(String(enT[m][k]).replace(/Weë/g, '')))
    .map(([m, k]) => m + '.' + k);
  check('22) y la inglesa está en inglés', conAcento.length === 0, conAcento.join(' '));

  /*
   * 23 · SIN DUPLICAR. `weetalk` ya traía dos claves de estado vacío que no usa
   * nadie —`empty` y `emptyHint`— con otra redacción. No se reutilizan: dirían
   * otra cosa. Quedan anotadas como código muerto, que es otro asunto.
   */
  const repetidas = Object.entries(esT)
    .filter(([, m]) => Object.values(m).includes('No se pudo registrar tu voto')).length;
  check('23) el aviso del voto existe una sola vez en todo el diccionario', repetidas === 1, String(repetidas));
  check('23) y la explicación de la bandeja, también',
    Object.entries(esT).filter(([, m]) =>
      Object.values(m).some((v) => /toca "\{\{boton\}\}"/.test(String(v)))).length === 1);

  /* 24 · Ni un idioma clavado en ninguno de los dos archivos. */
  check('24) no se fuerza ningún idioma',
    !/'es-ES'|'es'\s*[,)]|locale === 'es'|idioma === 'es'/.test(BANDEJA + ENCUESTA));

  /* 25 y 26 · El viaje de ida y de vuelta. */
  const ida = CLAVES.filter(([m, k]) => ES(`${m}.${k}`) === EN(`${m}.${k}`)).map(([m, k]) => m + '.' + k);
  check('25) ES → EN mueve las dos', ida.length === 0, ida.join(' '));
  check('26) y EN → ES las devuelve',
    CLAVES.every(([m, k]) => ES(`${m}.${k}`) === esT[m][k] && EN(`${m}.${k}`) === enT[m][k]));

  /* CONTROL de fase: no se tocó nada de lo ya cerrado. */
  check('26) control: ni el tiempo relativo, ni pollView, ni la marca',
    /getRelativeTime\(last\.timestamp\.toDate\(\), locale\)/.test(BANDEJA)
    && /textoVotos\(total, t\)/.test(ENCUESTA) && /tiempoRestante\(poll, Date\.now\(\), t\)/.test(ENCUESTA));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
