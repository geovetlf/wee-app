/*
 * LO QUE SE LEE BAJO CADA NOMBRE EN WEETALK (fase 5E.1).
 *
 * La lista de conversaciones dice dos cosas por fila: quién es, y lo último que
 * pasó. Lo segundo tiene cuatro salidas y solo una NO es de Weë:
 *
 *   · "Modo efímero", cuando la conversación no guarda nada;
 *   · "Tú: " delante de lo que escribiste;
 *   · "No hay mensajes aún", cuando todavía no hay nada;
 *   · y EL MENSAJE, que lo escribió una persona y se pinta tal cual.
 *
 * Esa cuarta es la que importa defender: el mensaje entra por un hueco y sale
 * sin pasar por el traductor. "Tú: Hola" en español y "You: Hola" en inglés —el
 * "Hola" es suyo—.
 *
 * Y el diálogo de borrar, que tenía sus dos botones escritos a mano mientras su
 * título y su pregunta ya venían del diccionario.
 *
 * `utils/notify.ts` NO se toca aquí: sus "Sí" y "Cancelar" son infraestructura
 * transversal y tienen su propio bloque. Esta prueba lo vigila.
 *
 * Se usa el traductor de verdad de Weë, como en `i18n-polls.test.mjs`.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
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

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El diálogo de borrar una conversación ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) "Cancelar" sale de common.cancel',
    /\{ text: t\('common\.cancel'\), style: 'cancel' \}/.test(BANDEJA)
    && ES('common.cancel') === 'Cancelar' && EN('common.cancel') === 'Cancel',
    ES('common.cancel') + ' / ' + EN('common.cancel'));
  check('2) "Eliminar" sale de common.delete',
    /\{ text: t\('common\.delete'\), style: 'destructive'/.test(BANDEJA)
    && ES('common.delete') === 'Eliminar' && EN('common.delete') === 'Delete',
    ES('common.delete') + ' / ' + EN('common.delete'));
  check('3) ninguna de las dos sigue escrita a mano',
    !/text: 'Cancelar'/.test(BANDEJA) && !/text: 'Eliminar'/.test(BANDEJA));

  /* Y el diálogo hace exactamente lo que hacía. */
  check('3) control: borra la misma conversación, con el mismo estilo',
    /Alert\.alert\(t\('weetalk\.deleteConversation'\), t\('weetalk\.areYouSure'\)/.test(BANDEJA)
    && /onPress: \(\) => messagesService\.deleteConversation\(id\)\.catch\(console\.error\)/.test(BANDEJA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · La línea de debajo del nombre ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const CLAVES = ['ephemeralMode', 'noMessagesYet', 'youSaid'];

  check('4) "Modo efímero" viene de su clave',
    /t\('weetalk\.ephemeralMode'\)/.test(BANDEJA) && !/'Modo efímero'/.test(BANDEJA));
  check('5) "No hay mensajes aún", también',
    /t\('weetalk\.noMessagesYet'\)/.test(BANDEJA) && !/'No hay mensajes aún'/.test(BANDEJA));
  check('6) y el "Tú:" ya no se pega a mano',
    /t\('weetalk\.youSaid', \{ mensaje: last\.content \}\)/.test(BANDEJA)
    && !/'Tú: '/.test(BANDEJA) && !/\$\{last\.senderId === activeUid \? 'Tú/.test(BANDEJA));

  /* 7 y 8 · Lo que se lee en cada idioma. */
  check('7) en español: ' + [ES('weetalk.ephemeralMode'), ES('weetalk.noMessagesYet'),
    ES('weetalk.youSaid', { mensaje: 'Hola' })].join(' · '),
    ES('weetalk.ephemeralMode') === 'Modo efímero'
    && ES('weetalk.noMessagesYet') === 'No hay mensajes aún'
    && ES('weetalk.youSaid', { mensaje: 'Hola' }) === 'Tú: Hola');
  check('8) en inglés: ' + [EN('weetalk.ephemeralMode'), EN('weetalk.noMessagesYet'),
    EN('weetalk.youSaid', { mensaje: 'Hola' })].join(' · '),
    EN('weetalk.ephemeralMode') === 'Ephemeral mode'
    && EN('weetalk.noMessagesYet') === 'No messages yet'
    && EN('weetalk.youSaid', { mensaje: 'Hola' }) === 'You: Hola');

  /* 9 y 10 · Las tres existen en los dos idiomas y ninguna está vacía. */
  const faltan = CLAVES.filter((k) => !esT.weetalk?.[k] || !enT.weetalk?.[k]);
  check('9) las tres claves existen en español y en inglés', faltan.length === 0, faltan.join(' '));
  const vacias = CLAVES.filter((k) => !String(enT.weetalk[k] ?? '').trim() || !String(esT.weetalk[k] ?? '').trim());
  check('10) ninguna traducción está vacía', vacias.length === 0, vacias.join(' '));
  const copiadas = CLAVES.filter((k) => esT.weetalk[k] === enT.weetalk[k]);
  check('10) y las tres están traducidas de verdad', copiadas.length === 0, copiadas.join(' '));

  /* 11 · Sin duplicar: el diálogo reutiliza `common`, no se inventa gemelas. */
  check('11) no se crearon gemelas de common.cancel / common.delete',
    !esT.weetalk?.cancel && !esT.weetalk?.delete
    && !/weetalk\.cancel|weetalk\.delete'/.test(BANDEJA));
  check('11) y cada frase nueva existe una sola vez en todo el diccionario',
    ['Modo efímero', 'No hay mensajes aún', 'Tú: {{mensaje}}'].every((frase) =>
      Object.values(esT).filter((m) => Object.values(m).includes(frase)).length === 1));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El mensaje es de quien lo escribió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 12 · EL HUECO NO TOCA LO QUE LE METEN. Se prueba con lo que más podría
   * romperse: acentos, emojis, otro idioma, y hasta un hueco escrito dentro del
   * propio mensaje —que no se vuelve a sustituir—.
   */
  const MENSAJES = ['Hola', '¿Vienes?', 'See you tomorrow', '🎉 fiesta', '{{mensaje}}', 'Tú: trampa', '100% seguro'];
  const rotos = MENSAJES.filter((m) =>
    ES('weetalk.youSaid', { mensaje: m }) !== 'Tú: ' + m || EN('weetalk.youSaid', { mensaje: m }) !== 'You: ' + m);
  check('12) el mensaje sale exactamente como entró', rotos.length === 0, rotos.join(' | '));
  check('12) y el de otra persona se pinta crudo, sin prefijo ni traductor',
    /: last\.content\)/.test(BANDEJA) && !/t\(last\.content\)/.test(BANDEJA));

  /* 13 · El nombre tampoco pasa por el traductor. */
  check('13) el nombre de quien escribe se pinta crudo',
    /\{otherData\.displayName\}/.test(BANDEJA) && !/t\(otherData\.displayName\)/.test(BANDEJA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Nada más se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('14) control: las conversaciones se siguen escuchando igual',
    /messagesService\./.test(BANDEJA)
    && /const unread = last && !last\.read && last\.senderId !== activeUid;/.test(BANDEJA)
    && /const activeUid = userProfile\?\.uid \|\| user\?\.uid;/.test(BANDEJA));
  check('15) control: borrar sigue siendo el mismo camino',
    /const deleteChat = \(id: string\) => \{/.test(BANDEJA)
    && /onLongPress=\{\(\) => deleteChat\(item\.id!\)\}/.test(BANDEJA));
  check('16) control: la navegación al chat no cambió',
    /const openChat = \(c: Conversation\) => \{/.test(BANDEJA) && /nav\.navigate\('Conversation'/.test(BANDEJA));
  check('17) control: el buscador y el estado vacío siguen donde estaban',
    /const filtered = search\.trim\(\)/.test(BANDEJA)
    && /\{t\('weetalk\.noConversations'\)\}/.test(BANDEJA)
    && /\{t\('weetalk\.noConversationsHint'\)\}/.test(BANDEJA));
  check('17) y la hora de cada fila sigue viniendo de la función compartida',
    /getRelativeTime\(last\.timestamp\.toDate\(\), locale\)/.test(BANDEJA));

  /*
   * 18 · `utils/notify.ts` SE CERRÓ DESPUÉS, en la fase 5H, y con sus cinco
   * llamantes a la vez: traducir solo sus botones habría dejado diálogos a
   * medias. Lo que esta línea defendía —que la utilidad sigue siendo PURA, sin
   * React ni contexto dentro— sigue en pie y se comprueba igual; se le añade
   * que ya no escribe español y que el traductor entra por parámetro.
   */
  const aviso = leer('utils/notify.ts');
  check('18) utils/notify.ts sigue siendo una utilidad pura, y ya sin español',
    !/'Sí'|'Cancelar'/.test(aviso)
    && /t: Traducir,/.test(aviso) && /t\('common\.cancel'\)/.test(aviso)
    && !/useT\(|IdiomaContext|from 'react'/.test(aviso));

  /* Y esta fase no se montó nada paralelo. */
  check('18) sin sistemas paralelos de traducción',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'/.test(BANDEJA)
    && /import \{ useIdioma \} from '\.\.\/contexts\/IdiomaContext';/.test(leer('screens/InboxScreen.tsx')));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
