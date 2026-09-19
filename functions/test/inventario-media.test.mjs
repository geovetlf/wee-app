/*
 * EL INVENTARIO SABE A QUIÉN PERTENECE CADA COSA (Fase 11, verificación).
 *
 * El dry-run de la migración marcó cinco materiales como «sin cuenta legible».
 * No lo eran: `cuentaDe()` leía `users/<identidad>`, dando por hecho que el id
 * del documento era el uid. En producción NINGÚN documento de `users` se llama
 * así —se crearon con `addDoc`, id automático, y el uid vive en un CAMPO—, así
 * que la búsqueda no encontraba nunca a un Perfil Weë y su material quedaba
 * marcado como ambiguo. Un falso positivo del inventario, no un dato roto.
 *
 * Aquí se comprueba, EJECUTANDO el resolutor contra un Firestore de mentira:
 *
 *   A · encuentra a la persona cuando `documentId !== uid`;
 *   B · sigue el camino uid → linkedAccountId, con el resolutor canónico;
 *   C · NO inventa una cuenta cuando no hay documento o no hay vínculo;
 *   D · dice POR QUÉ no la hay, con un motivo explícito, y detecta documentos
 *       duplicados que se contradicen (en `users` no hay unicidad);
 *   E · durante todo el inventario no se escribe NADA: el Firestore de mentira
 *       lanza si alguien intenta escribir, y la migración solo escribe tras las
 *       dos banderas de autorización.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { resolverCuenta, cuentaDe, MOTIVO } = await import(
  'file://' + path.resolve(here, '../../scripts/media-legacy.mjs').replace(/\\/g, '/')
);

/* ── Un Firestore de mentira que LANZA si alguien intenta escribir ───────── */
const PROHIBIDO = ['set', 'update', 'delete', 'create', 'add', 'commit', 'batch', 'bulkWriter', 'runTransaction'];
let intentosDeEscritura = 0;
const prohibirEscrituras = (obj) => {
  for (const m of PROHIBIDO) {
    obj[m] = () => { intentosDeEscritura++; throw new Error(`ESCRITURA PROHIBIDA: .${m}()`); };
  }
  return obj;
};

const fakeDb = (usuarios) => {
  const doc = (d) => ({
    id: d.documentId,
    exists: true,
    ref: { path: `users/${d.documentId}` },
    get: (campo) => d[campo],
  });
  const coleccion = (nombre) => prohibirEscrituras({
    where: (campo, op, valor) => prohibirEscrituras({
      get: async () => {
        if (nombre !== 'users' || op !== '==') return { docs: [], size: 0, empty: true };
        const docs = usuarios.filter((u) => u[campo] === valor).map(doc);
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    }),
    doc: (id) => prohibirEscrituras({
      get: async () => {
        const u = usuarios.find((x) => x.documentId === id);
        return u ? doc(u) : { exists: false, id, ref: { path: `users/${id}` }, get: () => undefined };
      },
    }),
  });
  return prohibirEscrituras({ collection: coleccion, collectionGroup: coleccion });
};

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Encuentra a la persona aunque el documento no se llame como ella ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* La forma REAL de producción: id automático, uid en un campo. */
  const db = fakeDb([
    { documentId: 'xDgQeF24KUvie6j8Jc4x', uid: 'hidi_aaa', profileType: 'hidi', linkedAccountId: 'aaa' },
    { documentId: 'eC7BZTO17aJzUp0w5HeE', uid: 'aaa', profileType: 'real', linkedAccountId: 'hidi_aaa' },
  ]);
  const r = await resolverCuenta(db, 'hidi_aaa');
  check('1) la identidad Weë se resuelve con documentId !== uid', r.cuenta === 'aaa', `cuenta=${r.cuenta} motivo=${r.motivo}`);
  check('2) y el motivo dice que fue por el vínculo', r.motivo === MOTIVO.PUENTE);
  check('3) el envoltorio de siempre devuelve lo mismo', (await cuentaDe(db, 'hidi_aaa')) === 'aaa');
  check('4) el documento encontrado se reporta entero, para poder auditarlo',
    r.documentos.length === 1 && r.documentos[0].documentId === 'xDgQeF24KUvie6j8Jc4x' && r.documentos[0].linkedAccountId === 'aaa');
  /* Antes de la corrección esto daba null: no existía `users/hidi_aaa`. */
  check('5) la búsqueda por id de documento sola habría fallado',
    !(await fakeDb([{ documentId: 'xDgQeF24KUvie6j8Jc4x', uid: 'hidi_aaa', profileType: 'hidi', linkedAccountId: 'aaa' }])
      .collection('users').doc('hidi_aaa').get()).exists);

  /* Y si algún día un documento SÍ se llama como su uid, también vale. */
  const dbPorId = fakeDb([{ documentId: 'hidi_bbb', uid: 'hidi_bbb', profileType: 'hidi', linkedAccountId: 'bbb' }]);
  check('6) un documento nombrado por su uid sigue encontrándose', (await resolverCuenta(dbPorId, 'hidi_bbb')).cuenta === 'bbb');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El camino es uid → linkedAccountId, con el resolutor canónico ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const db = fakeDb([{ documentId: 'auto1', uid: 'hidi_ccc', profileType: 'hidi', linkedAccountId: 'ccc' }]);
  check('7) el vínculo se LEE del documento', (await resolverCuenta(db, 'hidi_ccc')).cuenta === 'ccc');

  /* La cuenta NO se deduce quitando el prefijo: sin vínculo escrito, no hay cuenta. */
  const sinVinculo = fakeDb([{ documentId: 'auto2', uid: 'hidi_ddd', profileType: 'hidi' }]);
  const r = await resolverCuenta(sinVinculo, 'hidi_ddd');
  check('8) sin `linkedAccountId` NO se deduce la cuenta quitando el prefijo', r.cuenta === null, `cuenta=${r.cuenta}`);

  /* El resolutor canónico exige que el prefijo y el vínculo cuenten lo mismo. */
  const incoherente = fakeDb([{ documentId: 'auto3', uid: 'hidi_eee', profileType: 'hidi', linkedAccountId: 'otra-cuenta' }]);
  check('9) un vínculo que no cuadra con el prefijo no vale', (await resolverCuenta(incoherente, 'hidi_eee')).cuenta === null);

  const tipoRaro = fakeDb([{ documentId: 'auto4', uid: 'hidi_fff', profileType: 'biz', linkedAccountId: 'fff' }]);
  check('10) un profileType que el modelo no reconoce tampoco', (await resolverCuenta(tipoRaro, 'hidi_fff')).cuenta === null);

  /* Una identidad real ES su cuenta; no hace falta consultar nada. */
  const r2 = await resolverCuenta(fakeDb([]), 'cuentaReal123');
  check('11) una identidad real es su propia cuenta, sin consultar `users`', r2.cuenta === 'cuentaReal123' && r2.motivo === MOTIVO.DIRECTA);
  check('12) la regla la pone el servidor, no el script',
    /require\('\.\/lib\/social\/econtact\.js'\)/.test(leer('scripts/media-legacy.mjs'))
    && /econtact\.cuentaDeIdentidad\(id, c\)/.test(leer('scripts/media-legacy.mjs')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · No inventa cuentas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const vacio = fakeDb([]);
  const r = await resolverCuenta(vacio, 'hidi_ggg');
  check('13) sin documento no hay cuenta', r.cuenta === null && r.documentos.length === 0);
  check('14) y se dice que lo que falta es el documento', r.motivo === MOTIVO.SIN_USUARIO, r.motivo);

  const otro = fakeDb([{ documentId: 'auto5', uid: 'hidi_OTRO', profileType: 'hidi', linkedAccountId: 'OTRO' }]);
  check('15) el documento de otra identidad no sirve', (await resolverCuenta(otro, 'hidi_hhh')).cuenta === null);
  check('16) ni se acepta un id inválido', (await resolverCuenta(vacio, 'con/barra')).motivo === MOTIVO.ID_INVALIDO);
  check('16) ni vacío', (await resolverCuenta(vacio, '')).motivo === MOTIVO.ID_INVALIDO && (await resolverCuenta(vacio, null)).motivo === MOTIVO.ID_INVALIDO);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Lo ambiguo se dice, con su motivo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const sinPuente = fakeDb([{ documentId: 'auto6', uid: 'hidi_iii', profileType: 'hidi' }]);
  const r1 = await resolverCuenta(sinPuente, 'hidi_iii');
  check('17) documento sin vínculo válido → motivo propio', r1.motivo === MOTIVO.SIN_PUENTE && r1.cuenta === null, r1.motivo);
  check('18) y el documento se adjunta para poder mirarlo a mano', r1.documentos.length === 1 && r1.documentos[0].linkedAccountId === null);

  /*
   * `users` no tiene unicidad: la misma identidad puede tener varios documentos.
   * Si dicen lo mismo, hay cuenta; si se contradicen, NO se elige uno al azar.
   */
  const duplicadoCoherente = fakeDb([
    { documentId: 'auto7', uid: 'hidi_jjj', profileType: 'hidi', linkedAccountId: 'jjj' },
    { documentId: 'auto8', uid: 'hidi_jjj', profileType: 'hidi', linkedAccountId: 'jjj' },
  ]);
  check('19) dos documentos que dicen lo mismo: hay cuenta', (await resolverCuenta(duplicadoCoherente, 'hidi_jjj')).cuenta === 'jjj');

  const duplicadoRoto = fakeDb([
    { documentId: 'auto9', uid: 'hidi_kkk', profileType: 'hidi', linkedAccountId: 'kkk' },
    { documentId: 'auto10', uid: 'hidi_kkk', profileType: 'hidi', linkedAccountId: 'kkk2' },
  ]);
  const r2 = await resolverCuenta(duplicadoRoto, 'hidi_kkk');
  /* El segundo vínculo es incoherente con el prefijo, así que el canónico lo descarta: queda uno. */
  check('20) dos documentos que se contradicen: solo cuenta el coherente', r2.cuenta === 'kkk' && r2.documentos.length === 2);

  const dosCoherentes = fakeDb([
    { documentId: 'auto11', uid: 'hidi_lll', profileType: 'hidi', linkedAccountId: 'lll' },
    { documentId: 'auto12', uid: 'hidi_lll', profileType: 'hidi', linkedAccountId: 'lll' },
  ]);
  check('21) y nunca se elige un documento al azar', (await resolverCuenta(dosCoherentes, 'hidi_lll')).documentos.every((d) => d.cuenta === 'lll'));

  check('22) los motivos son un catálogo cerrado, no cadenas sueltas',
    Object.isFrozen(MOTIVO) && Object.values(MOTIVO).length === 6 && new Set(Object.values(MOTIVO)).size === 6);
  check('23) y la migración los reporta tal cual', /causa: r\.motivo \?\? null/.test(leer('scripts/migrar-media.mjs')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Durante el inventario no se escribe nada ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Si el resolutor intentara escribir, el Firestore de mentira ya habría lanzado. */
  check('24) resolver identidades no intentó ni una escritura', intentosDeEscritura === 0, `intentos=${intentosDeEscritura}`);

  const inventario = leer('scripts/inventario-media.mjs');
  check('25) el inventario lo dice y lo cumple: ninguna escritura a Firestore ni a Storage',
    /ESTE SCRIPT NO HA MODIFICADO NADA/.test(inventario)
    && !/\bdb\.[A-Za-z(). ']*\.(set|update|create|delete)\(/.test(inventario)
    && !/\.(save|upload|makePublic|deleteFiles)\(/.test(inventario));

  const migrar = leer('scripts/migrar-media.mjs');
  check('26) la migración exige LAS DOS banderas para escribir',
    /const EJECUTAR = bandera\('--ejecutar'\) && bandera\('--confirmo-autorizacion'\);/.test(migrar));
  const cuerpo = migrar.slice(migrar.indexOf('if (EJECUTAR) {'));
  check('27) y sus únicas escrituras viven dentro de esa guarda',
    /\.create\(a\)/.test(cuerpo) && /\.update\(e\.enlaces\)/.test(cuerpo)
    && !/\.create\(a\)|\.update\(e\.enlaces\)/.test(migrar.slice(0, migrar.indexOf('if (EJECUTAR) {'))));
  check('28) sin banderas, lo dice y no escribe', /DRY-RUN: NO SE HA ESCRITO NADA/.test(cuerpo));
  check('29) nadie borra nada, en ningún caso', !/\.delete\(\)|deleteFiles|destroy\(/.test(migrar) && !/borrar|destruir/i.test(cuerpo.replace(/\/\*[\s\S]*?\*\//g, '')));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nInventario: la identidad se resuelve donde vive, y nada se escribe');
process.exit(failures ? 1 : 0);
