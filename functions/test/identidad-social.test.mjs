/*
 * WEE CORE — CON QUÉ CARA SE ACTÚA EN SOCIEDAD (Fase 11.x-6).
 *
 * Lo que esto vigila, en una frase: que la cuenta nunca sea la identidad
 * pública de una interacción, y que la cara nunca sea la que autoriza.
 *
 *   A · El actor: dos niveles que no se mezclan.
 *   B · La vista pública no puede llevar la cuenta ni queriendo.
 *   C · Actuar con una cara exige que esa cara sea de esa cuenta.
 *   D · Deduplicar: una persona no aplaude dos veces por tener dos caras.
 *   E · Lo heredado se lee como lo que es, sin inventarle un actor.
 *   F · El Core sigue siendo puro.
 *
 * Requiere `npm run build`: lee `functions/lib`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const S = require(path.resolve(here, '../lib/core/social-identity.js'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const CUENTA = 'OEv4FAhfbAN0sFoFiHG0ZG2GK3r2';
const OTRA = 'ZZv4FAhfbAN0sFoFiHG0ZG2GK3r9';
const CARA_REAL = 'ent_0123456789abcdefghjkmnpqrs';
const CARA_WEE = 'ent_abcdefghjkmnpqrstvwxyz0123';
const PAGINA = 'ent_9876543210zyxwvtsrqpnmkjhg';

const entidad = (extra = {}) => ({
  entityId: CARA_WEE, entityType: 'WEE_PROFILE', ownerAccountId: CUENTA, status: 'ACTIVE', ...extra,
});
const actor = (extra = {}) => ({
  actorAccountId: CUENTA, actorEntityId: CARA_WEE, actorEntityType: 'WEE_PROFILE', ...extra,
});

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El actor: dos niveles que no se mezclan ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) un actor completo vale', S.actorValido(actor()));
  check('2) sin cuenta no hay actor: no se podría deduplicar ni autorizar',
    !S.actorValido({ actorEntityId: CARA_WEE, actorEntityType: 'WEE_PROFILE' }));
  check('3) sin cara tampoco: no se podría enseñar quién actuó sin delatar la cuenta',
    !S.actorValido({ actorAccountId: CUENTA, actorEntityType: 'WEE_PROFILE' }));
  check('4) sin tipo tampoco: el tipo se guarda, no se deduce',
    !S.actorValido({ actorAccountId: CUENTA, actorEntityId: CARA_WEE }));
  check('5) la cuenta no puede ir donde va la cara, ni al revés',
    !S.actorValido(actor({ actorEntityId: CUENTA })) && !S.actorValido(actor({ actorAccountId: CARA_WEE })));
  check('6) un tipo inventado no pasa',
    !S.actorValido(actor({ actorEntityType: 'BIZ_PROFILE' })) && !S.actorValido(actor({ actorEntityType: 'hidi' })));
  check('7) ni un identificador con la forma heredada',
    !S.actorValido(actor({ actorEntityId: 'hidi_' + CUENTA })));
  check('8) ni nada que no sea un objeto', [null, undefined, 'x', 42, []].every((v) => !S.actorValido(v)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · La vista pública no lleva la cuenta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const publica = S.vistaPublicaDelActor(actor());
  check('9) la vista pública lleva la cara y su clase',
    publica.actorEntityId === CARA_WEE && publica.actorEntityType === 'WEE_PROFILE');
  check('10) y NO lleva la cuenta, ni como campo ni escondida en otro',
    !('actorAccountId' in publica) && !JSON.stringify(publica).includes(CUENTA));
  check('11) tiene exactamente dos campos: no hay sitio donde colarla',
    Object.keys(publica).length === 2);

  /* Y el colador para un documento que ya se tenía cargado. */
  const doc = { ...actor(), postId: 'p1', createdAt: 1 };
  const limpio = S.sinLaCuentaDelActor(doc);
  check('12) quitar la cuenta de un documento deja todo lo demás',
    !('actorAccountId' in limpio) && limpio.actorEntityId === CARA_WEE && limpio.postId === 'p1' && limpio.createdAt === 1);
  check('13) y no toca el original', 'actorAccountId' in doc);
  check('14) la lista de campos privados nombra la cuenta y solo la cuenta',
    S.CAMPOS_PRIVADOS_DE_INTERACCION.length === 1 && S.CAMPOS_PRIVADOS_DE_INTERACCION[0] === 'actorAccountId');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Actuar con una cara exige que sea tuya ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('15) con una entidad propia y activa sale un actor',
    S.actorValido(S.actorDeLaCuenta(entidad(), CUENTA)));
  check('16) la entidad de OTRA cuenta no sirve, aunque la pidas con tu cuenta',
    S.actorDeLaCuenta(entidad({ ownerAccountId: OTRA }), CUENTA) === undefined);
  check('17) ni la tuya pidiéndola como otra cuenta',
    S.actorDeLaCuenta(entidad(), OTRA) === undefined);
  check('18) una entidad suspendida o borrada no puede actuar',
    S.actorDeLaCuenta(entidad({ status: 'SUSPENDED' }), CUENTA) === undefined
    && S.actorDeLaCuenta(entidad({ status: 'DELETED' }), CUENTA) === undefined);
  check('19) una entidad sin dueño no es de nadie',
    S.actorDeLaCuenta(entidad({ ownerAccountId: '' }), CUENTA) === undefined
    && S.actorDeLaCuenta(entidad({ ownerAccountId: undefined }), CUENTA) === undefined);
  check('20) y sin cuenta no se puede actuar en absoluto',
    [null, undefined, '', 'hidi_x'].every((c) => S.actorDeLaCuenta(entidad(), c) === undefined));
  check('21) el actor que sale conserva el tipo GUARDADO de la entidad', (() => {
    const a = S.actorDeLaCuenta(entidad({ entityId: PAGINA, entityType: 'PAGE' }), CUENTA);
    return a.actorEntityType === 'PAGE' && a.actorEntityId === PAGINA;
  })());
  check('22) una entidad que no existe no produce actor',
    S.actorDeLaCuenta(null, CUENTA) === undefined && S.actorDeLaCuenta(undefined, CUENTA) === undefined);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Una persona no aplaude dos veces por tener dos caras ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const real = actor({ actorEntityId: CARA_REAL, actorEntityType: 'REAL_PROFILE' });
  const wee = actor();

  check('23) el «me gusta», el voto y el repost se cuentan POR CUENTA',
    S.ALCANCE.like === 'POR_CUENTA' && S.ALCANCE.vote === 'POR_CUENTA' && S.ALCANCE.repost === 'POR_CUENTA');
  check('24) el seguimiento se cuenta POR CARA', S.ALCANCE.follow === 'POR_CARA');

  const kReal = S.claveDeInteraccion('POR_CUENTA', real, 'post1');
  const kWee = S.claveDeInteraccion('POR_CUENTA', wee, 'post1');
  check('25) las dos caras de una persona dan la MISMA clave de «me gusta»: un aplauso, no dos',
    kReal === kWee && kReal === `${CUENTA}_post1`);
  check('26) pero la interacción sigue sabiendo con qué cara se hizo',
    real.actorEntityId !== wee.actorEntityId);

  const sReal = S.claveDeInteraccion('POR_CARA', real, 'otra');
  const sWee = S.claveDeInteraccion('POR_CARA', wee, 'otra');
  check('27) en cambio seguir con una cara y con la otra son DOS relaciones',
    sReal !== sWee && sReal === `${CARA_REAL}_otra` && sWee === `${CARA_WEE}_otra`);
  check('28) y la clave por cara no lleva la cuenta dentro',
    !sWee.includes(CUENTA) && !sReal.includes(CUENTA));

  check('29) otra cuenta da otra clave', S.claveDeInteraccion('POR_CUENTA', actor({ actorAccountId: OTRA }), 'post1') !== kReal);
  check('30) la misma entrada da siempre la misma clave',
    S.claveDeInteraccion('POR_CUENTA', real, 'post1') === S.claveDeInteraccion('POR_CUENTA', real, 'post1'));
  check('31) sin actor válido no hay clave: antes nada que una clave a medias',
    S.claveDeInteraccion('POR_CUENTA', { actorAccountId: CUENTA }, 'post1') === undefined);
  check('32) ni con un objeto que traiga barras o esté vacío',
    S.claveDeInteraccion('POR_CUENTA', real, 'a/b') === undefined
    && S.claveDeInteraccion('POR_CUENTA', real, '') === undefined
    && S.claveDeInteraccion('POR_CUENTA', real, undefined) === undefined);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo heredado se lee como lo que es ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('33) una interacción con actor se lee entera', S.actorValido(S.actorDeLoGuardado(actor())));
  check('34) una interacción ANTIGUA no tiene actor, y no se le inventa uno',
    S.actorDeLoGuardado({ userId: CUENTA, postId: 'p1' }) === undefined
    && S.actorDeLoGuardado({ senderId: 'hidi_' + CUENTA }) === undefined);
  check('35) ni media: si falta un campo, no hay actor',
    S.actorDeLoGuardado({ actorAccountId: CUENTA, actorEntityId: CARA_WEE }) === undefined);
  check('36) `tieneActor` distingue lo nuevo de lo heredado',
    S.tieneActor(actor()) && !S.tieneActor({ userId: CUENTA }) && !S.tieneActor(null));

  /*
   * Y lo que de verdad importa: de una interacción heredada NO se puede sacar
   * una cara. El `userId` de un «me gusta» antiguo es la cuenta, y creerle
   * sería volver a enseñar el Perfil Real donde hubo un Perfil Weë.
   */
  check('37) de lo heredado no sale una cara por ningún camino',
    S.actorDeLoGuardado({ userId: CUENTA }) === undefined
    && S.actorDeLoGuardado({ actorAccountId: CUENTA, actorEntityId: CUENTA, actorEntityType: 'REAL_PROFILE' }) === undefined);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · El Core sigue siendo el Core ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const fuente = leer('functions/src/core/social-identity.ts');
  const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('38) sin Firebase, sin reloj y sin azar',
    !/firebase|firestore|Date\.now\(|Math\.random\(|new Date\(|fetch\(/i.test(codigo));
  check('39) no nombra la identidad heredada en el código', !/hidi/i.test(codigo));
  check('40) y solo importa del propio Core',
    [...codigo.matchAll(/from '([^']+)'/g)].every((m) => m[1].startsWith('./')));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
