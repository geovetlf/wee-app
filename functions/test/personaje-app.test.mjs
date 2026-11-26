/*
 * LA AUTONOMÍA DEL PERSONAJE EN LA APP (paso 2C), leyendo el código:
 *
 *  A · la sección de autonomía no decide ni cobra: todo por la función del servidor;
 *  B · todos sus textos salen de `character.*` y existen en los once idiomas;
 *  C · la etiqueta «Personaje con IA» en WeeTalk y en comentarios, solo cuando el
 *      servidor marcó `autonomo`;
 *  D · la duración se escribe con el formateador del locale.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const comp = sinComentarios(leer('components/AutonomiaDelPersonaje.tsx'));
const serv = sinComentarios(leer('services/autonomyService.ts'));
const pantalla = sinComentarios(leer('screens/CharacterSheetScreen.tsx'));

console.log('\n── A · La app no decide ni cobra ──');
check('el servicio solo habla con la función `autonomiaPersonaje`', /httpsCallable<.*?>\(functions, 'autonomiaPersonaje'/.test(serv) && /accion: 'programar'/.test(serv) && /accion: 'apagar'/.test(serv) && /accion: 'estado'/.test(serv));
check('ni la app ni el componente escriben estado ni Credits', ![serv, comp].some((s) => /setDoc|updateDoc|addDoc|spendCredits|creditsBalance|characterAutonomy/.test(s)));
check('los avisos solo se LEEN (la bandeja la escribe el servidor)', /onSnapshot\(\s*query\(collection\(db, 'users', perfilId, 'characterInbox'\)/.test(serv));
/* 2026-11-22: subir el tope de encargos con el pase activo también pide confirmación (bajarlo no). */
check('activar, apagar, vaciar el registro y subir el tope de encargos piden confirmación', (comp.match(/confirmAction\(/g) || []).length === 4 && /if \(tope > topeActual\) \{\s*const ok = await confirmAction\(/.test(comp));
check('sin la ficha guardada y completa, el botón de activar está apagado', /disabled=\{ocupado \|\| !fichaLista\}/.test(comp) && /fichaLista=\{guardadaCompleta\}/.test(pantalla));
check('la pantalla de la ficha incluye la sección', /<AutonomiaDelPersonaje perfilId=\{perfilId\}/.test(pantalla));

/*
 * LA FICHA ES INTERNA DEL DUEÑO (decisión del dueño, 2026-11-23): quien visita el perfil de Jay Reeds —o de cualquier
 * alter ego— no ve la ficha, ni su botón, ni la autonomía. Es programación privada de quien tiene la cuenta.
 */
console.log('\n── A1b · La ficha solo la ve su dueño ──');
{
  const visita = sinComentarios(leer('screens/UserProfileScreen.tsx'));
  const propio = sinComentarios(leer('screens/ProfileScreen.tsx'));
  check('el perfil que ven los VISITANTES no enlaza la ficha ni la autonomía', !/CharacterSheet|character\.entry|AutonomiaDelPersonaje/.test(visita));
  check('el botón de la ficha solo sale en el perfil PROPIO y con el Perfil Weë puesto', /hasWeeProfile && activeProfileType === 'hidi' && \(\s*<TouchableOpacity[\s\S]{0,200}navigate\('CharacterSheet'\)/.test(propio));
  check('la ficha carga SIEMPRE el Perfil Weë de quien tiene la sesión, nunca uno que llegue por la ruta', /const perfilId = weeProfile\?\.id;/.test(pantalla) && !/route\.params/.test(pantalla));
  const reglas = leer('firestore.rules');
  const bloquePersonaje = reglas.slice(reglas.indexOf('match /character/{documento}'), reglas.indexOf('match /bookmarks/{postId}'));
  check('el servidor solo deja leer ficha, avisos, registro y material a su dueño', (bloquePersonaje.match(/allow read: if esDuenyoDelPersonaje\(userId\);/g) || []).length === 4);
}

console.log('\n── A2 · La bandeja de aprobaciones ──');
{
  const bandeja = sinComentarios(leer('components/personaje/BandejaDeAprobaciones.tsx'));
  /* El servidor NO marca 'caducado' al vencer: solo si alguien intenta aprobarlo
   * después. La app tiene que tratar como caducado todo pendiente ya vencido. */
  check('aprobar y rechazar van a la misma función, con el aviso', /aprobar: \(perfilId: string, avisoId: string\) => llamar\(\{ accion: 'aprobar', perfilId, avisoId \}\)/.test(serv) && /rechazar: \(perfilId: string, avisoId: string\) => llamar\(\{ accion: 'rechazar', perfilId, avisoId \}\)/.test(serv));
  check('los motivos nuevos del servidor son conocidos y tienen mensaje', ['avisoNoEncontrado', 'avisoCaducado', 'yaResuelto'].every((m) => serv.includes(`'${m}'`) && new RegExp(`${m}: 'character\\.`).test(comp)));
  check('un pendiente con caducaEn vencido se pinta como caducado', /typeof a\.caducaEn === 'number' && a\.caducaEn <= ahora\) return 'caducado'/.test(bandeja));
  check('«Por revisar» solo cuenta aprobaciones pendientes NO vencidas (estado visible, no el guardado)', /porRevisar = conEstado\s*\.filter\(\(x\) => x\.a\.tipo === 'aprobacion' && x\.estado === 'pendiente'\)/.test(bandeja) && /const pendientes = ordenados\.porRevisar\.length/.test(bandeja));
  check('los botones Aprobar/Rechazar solo salen si el aviso no está resuelto ni vencido', /const resuelto = estado !== 'pendiente'/.test(bandeja) && /\{esAprobacion && !resuelto \? \(\s*<View style=\{s\.botones\}>/.test(bandeja));
  check('control: la bandeja NO decide por el estado guardado a secas', !/a\.estado === 'pendiente'/.test(bandeja));
}

console.log('\n── B · Los textos ──');
const claves = (txt) => [...txt.matchAll(/^\s{2}([A-Za-z0-9]+):\s*['"`]/gm)].map((m) => m[1]);
const base = claves(leer('i18n/textos/es/character.ts'));
const usadas = [...new Set([...comp.matchAll(/'character\.([A-Za-z0-9]+)'/g)].map((m) => m[1]))];
check('todas las claves que usa la sección existen', usadas.length > 25 && usadas.every((c) => base.includes(c)), usadas.filter((c) => !base.includes(c)).join(','));
for (const l of ['en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW']) {
  const k = claves(leer(`i18n/textos/${l}/character.ts`));
  check(`${l}: tiene las mismas claves`, JSON.stringify([...k].sort()) === JSON.stringify([...base].sort()));
}
const frases = [...comp.matchAll(/>\s*([A-ZÁÉÍÓÚÑa-záéíóúñ][^<>{}\n]{6,})\s*</g)].map((m) => m[1]);
check('la sección no lleva frases escritas a mano', frases.length === 0, frases.join(' | '));
check('cada motivo del servidor tiene su mensaje (el desconocido cae al genérico)', /cobroNoDisponible: 'character\.autonomyClosed'/.test(comp) && /sinSaldo: 'character\.errorNoCredits'/.test(comp) && /'character\.errorGeneric'/.test(comp));

console.log('\n── C · La etiqueta «Personaje Weë» (decisión del dueño, 2026-11-22) ──');
const conv = sinComentarios(leer('screens/ConversationScreen.tsx'));
const cc = sinComentarios(leer('components/CommentCard.tsx'));
const pc = sinComentarios(leer('components/PostCard.tsx'));
check('WeeTalk la enseña solo en mensajes marcados por el servidor', /item\.autonomo \? \(/.test(conv) && /<EtiquetaPersonajeWee /.test(conv));
check('los comentarios y las publicaciones también', /comment\.autonomo \? <EtiquetaPersonajeWee/.test(cc) && /post\.autonomo \? <EtiquetaPersonajeWee/.test(pc));
const et = sinComentarios(leer('components/personaje/EtiquetaPersonajeWee.tsx'));
check('se ve «Personaje Weë» y al tocarla explica que lo escribió una IA (transparencia)', /t\('character\.badgeWee'\)/.test(et) && /notify\(t\('character\.badgeInfoTitle'\), t\('character\.badgeInfoBody'\)\)/.test(et) && /accessibilityLabel=\{t\('character\.badgeA11y'\)\}/.test(et));
check('la explicación dice que es IA', /IA/.test(leer('i18n/textos/es/character.ts').match(/badgeInfoBody: '([^']+)'/)?.[1] || '') && /IA/.test(leer('i18n/textos/es/character.ts').match(/badgeA11y: '([^']+)'/)?.[1] || ''));
check('los tipos de la app conocen la marca', /autonomo\?: boolean;/.test(leer('services/messagesService.ts')) && /autonomo\?: boolean;/.test(leer('services/firestoreService.ts')));
check('WeeTalk sigue sin tocar Credits', !/spendCredits|creditsService|useWallet/.test(sinComentarios(leer('services/messagesService.ts'))));

console.log('\n── D · La duración, con el locale ──');
const fmt = leer('i18n/formato.ts');
check('hay un formateador de duraciones con las unidades del locale', /export const formatearDuracion/.test(fmt) && /unit: 'hour'|'hour' \| 'minute'/.test(fmt));
check('la sección lo usa para el tiempo que queda', /formatearDuracion\(pase\.tiempoRestanteMs, locale\)/.test(comp));
check('esta suite está en la cadena de `npm test`', /personaje-app\.test\.mjs/.test(leer('functions/package.json')));

/*
 * E · LA CAMPANITA DEL DUEÑO (decisión del dueño, 2026-11-23): lo que el personaje deja en su bandeja enciende el
 * punto rojo de la campanita de Weë, agrupado en UNA notificación por personaje, y al tocarla se abre su ficha.
 */
console.log('\n── E · La campanita del dueño ──');
{
  const { createRequire } = await import('node:module');
  const C = createRequire(import.meta.url)('../lib/personajes/campanita.js');
  const ahora = { toMillis: () => 1 };
  check('solo lo nuevo y pendiente pide atención (aprobación, delicado, revisión)',
    C.pideAtencion({ estado: 'pendiente', tipo: 'aprobacion' }) && C.pideAtencion({ estado: 'pendiente', tipo: 'delicado' }) && C.pideAtencion({ estado: 'pendiente', tipo: 'revision' })
    && !C.pideAtencion({ estado: 'aprobado', tipo: 'aprobacion' }) && !C.pideAtencion({ estado: 'pendiente', tipo: 'otro' }) && !C.pideAtencion(undefined));
  const perfil = { displayName: 'Jay Reeds', linkedAccountId: 'cuenta1' };
  const primera = C.notificacionAgrupada('hidi_cuenta1', perfil, null, ahora);
  check('la primera es una notificación sin leer, de y para el Perfil Weë, con el nombre del personaje',
    primera.type === 'character_notice' && primera.recipientId === 'hidi_cuenta1' && primera.senderId === 'hidi_cuenta1' && primera.read === false
    && primera.senderName === 'Jay Reeds' && primera.pendientes === 1);
  // F5 (plan de alter egos): el aviso no lleva la cuenta de nadie, ni siquiera si el perfil heredado tiene vínculo.
  check('F5) el aviso del personaje NO lleva `recipientAccountId` (ni del heredado ni de un alter ego `ent_`)',
    !('recipientAccountId' in primera) && !('recipientAccountId' in C.notificacionAgrupada('ent_lina0001', { displayName: 'Lina' }, null, ahora))
    && !Object.values(primera).includes('cuenta1'));
  check('F5) un alter ego `ent_` tiene su campanita con el mismo id fijo por perfil', C.idDeNotificacion('ent_lina0001') === 'personaje_ent_lina0001' && C.notificacionAgrupada('ent_lina0001', { displayName: 'Lina' }, null, ahora).recipientId === 'ent_lina0001');
  check('F5) la campanita del personaje ya no lee `linkedAccountId`', !/linkedAccountId|recipientAccountId/.test(sinComentarios(leer('functions/src/personajes/campanita.ts'))));
  check('AGRUPA: con una sin leer, suma pendientes en la misma; si ya se leyó, empieza de nuevo',
    C.notificacionAgrupada('hidi_cuenta1', perfil, { read: false, pendientes: 2 }, ahora).pendientes === 3
    && C.notificacionAgrupada('hidi_cuenta1', perfil, { read: true, pendientes: 5 }, ahora).pendientes === 1);
  check('una por personaje: id fijo', C.idDeNotificacion('hidi_cuenta1') === 'personaje_hidi_cuenta1');
  const camp = sinComentarios(leer('functions/src/personajes/campanita.ts'));
  check('el disparador escucha la bandeja del personaje y escribe en una transacción', /document: 'users\/\{perfilId\}\/characterInbox\/\{avisoId\}'/.test(camp) && /runTransaction/.test(camp));
  check('la campanita no gasta: ni IA ni Credits', !/engine|spendCredits|generate\(/.test(camp));
  check('se exporta desde el índice', /export \{ campanitaDelPersonaje \} from '\.\/personajes\/campanita';/.test(leer('functions/src/index.ts')));
  const header = sinComentarios(leer('components/Header.tsx'));
  check('la campana enciende el punto rojo y lo dice al lector de pantalla', /useCampanita\(\)/.test(header) && /campanitaEncendida \? <View style=\{\[styles\.puntoDeCampanita/.test(header) && /campanitaEncendida \? t\('nav\.notificationsUnread'\)/.test(header));
  const lista = sinComentarios(leer('screens/NotificationsScreen.tsx'));
  check('tocar el aviso del personaje abre su ficha', /notification\.type === 'character_notice'\) \{\s*nav\.navigate\('CharacterSheet'\)/.test(lista) && /case 'character_notice': return 'notifications\.characterNotice'/.test(lista));
  check('con el Perfil Real puesto, el aviso del personaje propio también se ve y cuenta', /useAvisoDelPersonaje\(\)/.test(lista) && /subscribeToCharacterNotice\(perfilWee/.test(sinComentarios(leer('hooks/useCampanita.ts'))));
}

console.log('\nAutonomía en la app: sección, textos, etiqueta y formato');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
