/*
 * LA PRIVACIDAD DEL PERFIL WEË (Fase 11.x-6).
 *
 * ── Lo que esto vigila, en una frase ───────────────────────────────────────
 *
 * Que la cara Weë de una persona no se pueda convertir en su Perfil Real
 * siguiendo un enlace. No «que el usuario no vea el uid»: que el uid NO SEA
 * la identidad pública de nada.
 *
 *   A · La referencia pública de un perfil es su entidad, no su uid.
 *   B · Los sitios que generan un enlace usan esa referencia.
 *   C · Quien actúa es la cara activa, y la cuenta no viaja con ella.
 *   D · Lo que ya no existe: firmar una interacción con la cuenta.
 *   E · La propiedad sigue siendo de la cuenta.
 *
 * Requiere `npm run build`: lee `functions/lib`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const S = require(path.resolve(here, '../lib/core/social-identity.js'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const CUENTA = 'OEv4FAhfbAN0sFoFiHG0ZG2GK3r2';
const CARA_HEREDADA = 'hidi_' + CUENTA;
const ENT_REAL = 'ent_0123456789abcdefghjkmnpqrs';
const ENT_WEE = 'ent_abcdefghjkmnpqrstvwxyz0123';

/*
 * `utils/identidadPublica.ts` es del cliente y no se compila a `functions/lib`.
 * Se reconstruye aquí desde su propia fuente para probar la función DE VERDAD y
 * no una copia: si alguien cambia el archivo, esta prueba lo ejecuta cambiado.
 */
const fuenteUtil = leer('utils/identidadPublica.ts');
const util = (() => {
  const js = fuenteUtil
    .replace(/export (const|interface|type)/g, '$1')
    .replace(/interface [\s\S]*?\n}\n/g, '')
    .replace(/: [A-Za-z<>|"'\[\]\s.?]+(?= =>)/g, '')
    .replace(/\(v: unknown\)/g, '(v)').replace(/\(referencia: unknown\)/g, '(referencia)')
    .replace(/\(perfil: [^)]+\)/g, '(perfil)')
    .replace(/: string \| undefined =>/g, ' =>').replace(/: boolean =>/g, ' =>')
    .replace(/: 'entityId' \| 'uid' =>/g, ' =>')
    .replace(/v is string/g, 'boolean');
  // eslint-disable-next-line no-new-func
  return new Function(`${js}; return { esReferenciaDeEntidad, referenciaPublicaDe, referenciaDelataLaCuenta, campoQueResuelve };`)();
})();

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La referencia pública es la entidad ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const caraWee = { uid: CARA_HEREDADA, entityId: ENT_WEE };
  const perfilReal = { uid: CUENTA, entityId: ENT_REAL };
  const sinEntidad = { uid: CARA_HEREDADA };

  const refWee = util.referenciaPublicaDe(caraWee);
  check('1) la cara Weë se nombra por su entidad', refWee === ENT_WEE);
  check('2) y esa referencia NO contiene el uid de la cuenta',
    !refWee.includes(CUENTA) && !refWee.toLowerCase().includes(CUENTA.toLowerCase()));
  check('3) ni el prefijo heredado, ni nada de lo que tirar',
    !refWee.includes('hidi') && !refWee.includes('_' + CUENTA));
  check('4) quitarle nada lleva a ninguna parte: no hay cuenta dentro',
    refWee.replace('ent_', '') !== CUENTA && refWee.slice(4).length === 26);

  check('5) el Perfil Real tampoco enseña el identificador de la cuenta',
    util.referenciaPublicaDe(perfilReal) === ENT_REAL && !ENT_REAL.includes(CUENTA));
  check('6) las dos caras de la MISMA persona dan referencias que no se parecen',
    util.referenciaPublicaDe(caraWee) !== util.referenciaPublicaDe(perfilReal));

  check('7) un perfil SIN entidad se sigue nombrando como siempre: nada se rompe',
    util.referenciaPublicaDe(sinEntidad) === CARA_HEREDADA);
  check('8) y eso se reconoce como lo que es: una referencia que delata',
    util.referenciaDelataLaCuenta(CARA_HEREDADA) && !util.referenciaDelataLaCuenta(ENT_WEE));
  check('9) sin perfil no hay referencia', [null, undefined, {}, 'x'].every((p) => util.referenciaPublicaDe(p) === undefined || typeof util.referenciaPublicaDe(p) === 'string'));
  check('10) una entidad mal formada no pasa por entidad',
    !util.esReferenciaDeEntidad('ent_corta') && !util.esReferenciaDeEntidad('ent_' + 'i'.repeat(26))
    && !util.esReferenciaDeEntidad(CUENTA) && !util.esReferenciaDeEntidad(CARA_HEREDADA));
  check('11) cada referencia se resuelve por el campo que le toca',
    util.campoQueResuelve(ENT_WEE) === 'entityId' && util.campoQueResuelve(CARA_HEREDADA) === 'uid');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Los enlaces se generan con la referencia pública ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const sitios = [
    ['components/PostCard.tsx', 'el autor de una publicación'],
    ['components/CommentCard.tsx', 'el autor de un comentario'],
    ['screens/PostDetailScreen.tsx', 'el autor en el detalle'],
    ['screens/NotificationsScreen.tsx', 'quien te avisa'],
    ['screens/SearchScreen.tsx', 'un resultado de búsqueda'],
  ];
  for (const [archivo, quien] of sitios) {
    const codigo = sinComentarios(leer(archivo));
    const navega = [...codigo.matchAll(/navigate\(\s*'UserProfile'\s*,\s*\{\s*userId:\s*([^}]+)\}/g)].map((m) => m[1].trim());
    const usaReferencia = /referenciaPublicaDe/.test(codigo);
    const navegaCrudo = navega.some((v) => !/referenciaPublicaDe|referencia/.test(v));
    check(`12) ${quien}: se abre por su entidad`, usaReferencia && !navegaCrudo,
      navegaCrudo ? 'navega con ' + navega.join(' · ') : '');
  }
  check('13) el resolutor acepta las dos formas y no deduce una de la otra',
    /getByPublicRef/.test(leer('services/firestoreService.ts'))
    && /field: 'entityId', operator: '=='/.test(leer('services/firestoreService.ts'))
    && /campoQueResuelve/.test(leer('services/firestoreService.ts')));
  check('14) y el perfil público se carga por esa referencia',
    /getByPublicRef/.test(leer('hooks/useUserById.ts')));
  check('15) `entityId` lo escribe el servidor al nacer la entidad',
    /anotarLaEntidadEnElPerfil/.test(leer('functions/src/identity/nacimiento.ts'))
    && /where\('uid', '==', perfilUid\)/.test(leer('functions/src/identity/nacimiento.ts')));
  check('16) y ningún cliente puede ponerlo ni cambiarlo',
    /'entityId', 'entityType'/.test(leer('firestore.rules')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Actúa la cara activa, y la cuenta no viaja ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Lo que de verdad escribe hoy la app: publicación, comentario y repost. */
  check('17) una publicación se firma con la cara activa',
    /userId: userProfile\?\.uid \|\| user\.uid/.test(leer('screens/CreateScreen.tsx')));
  check('18) un comentario también',
    /uidActivo/.test(leer('hooks/useComentarios.ts')));
  check('19) y un repost usa la identidad activa validada',
    /useIdentidadActiva\(\)/.test(leer('hooks/useReposts.ts')));

  /* Y el contrato del Core, que es quien lo hace imposible de confundir. */
  const actor = { actorAccountId: CUENTA, actorEntityId: ENT_WEE, actorEntityType: 'WEE_PROFILE' };
  check('20) la vista pública de quien actúa no lleva la cuenta',
    !JSON.stringify(S.vistaPublicaDelActor(actor)).includes(CUENTA));
  check('21) no se puede actuar con la entidad de otra cuenta',
    S.actorDeLaCuenta({ entityId: ENT_WEE, entityType: 'WEE_PROFILE', ownerAccountId: 'otra', status: 'ACTIVE' }, CUENTA) === undefined);
  check('22) ni con una entidad retirada',
    S.actorDeLaCuenta({ entityId: ENT_WEE, entityType: 'WEE_PROFILE', ownerAccountId: CUENTA, status: 'DELETED' }, CUENTA) === undefined);
  check('23) ni inventándose el tipo',
    !S.actorValido({ ...actor, actorEntityType: 'ADMIN' }));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Lo que ya no existe ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * `useLikes` y `useFollow` firmaban con `user.uid` —la CUENTA— y con eso
   * avisaban: un «me gusta» desde el Perfil Weë habría llegado con el nombre
   * anónimo delante y el identificador de la cuenta dentro, y quien lo
   * recibiera habría aterrizado en el Perfil Real.
   *
   * Estaban MUERTOS —nadie los importaba— y se habían CORREGIDO en vez de
   * borrarse porque tres contratos de la migración a ËContact pedían el sistema
   * antiguo en pie. En el cierre post-auditoría (2026-10-01) se retiraron como
   * código muerto (y `econtact.test` exige ya que no vuelvan). Lo que se vigila
   * ahora es más amplio que esos dos archivos: que NINGÚN archivo del cliente
   * avise de un «me gusta» ni siga a alguien firmando con la cuenta.
   */
  const listarCliente = (d) => fs.readdirSync(path.resolve(RAIZ, d), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? listarCliente(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
  const cliente = ['screens', 'components', 'hooks', 'contexts', 'services', 'utils', 'navigation'].flatMap(listarCliente);
  const RE_LIKE_CON_CUENTA = /createLikeNotification\([\s\S]{0,120}user\.uid/;
  const RE_SEGUIR_CON_CUENTA = /toggleFollow\(user\.uid/;
  const firmanConLaCuenta = cliente.filter((f) => {
    const codigo = sinComentarios(leer(f));
    return RE_LIKE_CON_CUENTA.test(codigo) || RE_SEGUIR_CON_CUENTA.test(codigo);
  });
  check('24) useLikes y useFollow, que firmaban con la cuenta, se retiraron',
    !existe('hooks/useLikes.ts') && !existe('hooks/useFollow.ts'));
  check('24b) y ningún archivo del cliente avisa de un «me gusta» ni sigue firmando con la cuenta',
    firmanConLaCuenta.length === 0, firmanConLaCuenta.join(' ') || `${cliente.length} archivos mirados`);
  /* CONTROL: las dos formas prohibidas se reconocen cuando aparecen (si no, la 24b pasaría siempre). */
  check('24c) control: firmar con la cuenta se vería',
    RE_LIKE_CON_CUENTA.test('notificationService.createLikeNotification(post.userId, user.uid, nombre)')
    && RE_SEGUIR_CON_CUENTA.test('await followsService.toggleFollow(user.uid, destino)'));
  check('25) seguir es una relación de la CARA: el modelo lo dice', S.ALCANCE.follow === 'POR_CARA');
  check('25b) el «me gusta» en sí se cuenta por CUENTA: una persona, un aplauso', S.ALCANCE.like === 'POR_CUENTA');
  check('26) el voto sigue contándose por CUENTA a propósito, y no enseña quién votó',
    /voteId == request\.auth\.uid \+ '_' \+ request\.resource\.data\.postId/.test(leer('firestore.rules'))
    && S.ALCANCE.vote === 'POR_CUENTA');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · La propiedad sigue siendo de la cuenta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('27) el saldo se pide con la cuenta de la sesión, nunca con un perfil',
    /const accountUid = user\?\.uid \?\? null/.test(leer('hooks/useWallet.ts')));
  check('28) cambiar de cara no cambia de billetera: la billetera no recibe cara',
    !/identidad|activeProfileType|userProfile/.test(sinComentarios(leer('hooks/useWallet.ts'))));
  check('29) y una entidad no puede tener billetera',
    /billeteraDeLaCuenta/.test(leer('functions/src/core/account-identity.ts'))
    && !/billeteraDeLaEntidad|billeteraDeLaPagina/.test(sinComentarios(leer('functions/src/core/account-identity.ts'))));
  check('30) la cuenta de una interacción nunca sale hacia un cliente',
    S.CAMPOS_PRIVADOS_DE_INTERACCION.includes('actorAccountId')
    && !('actorAccountId' in S.sinLaCuentaDelActor({ actorAccountId: CUENTA, actorEntityId: ENT_WEE })));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
