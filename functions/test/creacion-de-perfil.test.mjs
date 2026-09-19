/*
 * LA CREACIÓN DEL PERFIL REAL ES IDEMPOTENTE (Fase 11.x).
 *
 * Lo que se prueba, en dos capas:
 *
 *   A · EL PROTOCOLO, ejecutado contra una base de datos de mentira que
 *       reproduce la concurrencia optimista de Firestore: una transacción lee,
 *       escribe al final y se repite si algo de lo leído cambió entre medias.
 *       1, 2, 5 y 10 peticiones a la vez → un solo perfil; fallo del primer
 *       intento y reintento; respuesta perdida tras el commit; segunda
 *       ejecución; usuario anónimo y con proveedor; registro simultáneo.
 *
 *   B · EL CABLEADO, leyendo el fuente: el contexto ya no crea por su cuenta,
 *       el servicio usa una transacción sobre `users/<uid>`, las reglas atan
 *       la creación del perfil real a ese id y hacen inmutable la identidad,
 *       y ningún otro sitio de la app crea documentos de `users`.
 *
 * La prueba con Firestore DE VERDAD, con reglas y sesiones reales, está en
 * `creacion-de-perfil.emulator.mjs` (necesita los emuladores de Auth y
 * Firestore, y por eso no entra en `npm test`).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const RAIZ = new URL('../../', import.meta.url);
const leer = (p) => fs.readFileSync(new URL(p, RAIZ), 'utf8');
const existe = (p) => fs.existsSync(new URL(p, RAIZ));
const soloCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* El protocolo, tal cual está escrito en TypeScript, transpilado al vuelo. */
const ts = createRequire(import.meta.url)('typescript');
const js = ts.transpileModule(leer('utils/perfilCanonico.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { asegurarPerfilReal, asegurarPerfilWee, conUnaSolaEnVuelo, idDelPerfilReal, idDelPerfilWee, esUidDeCuenta } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

// ─────────────────────────────────────────────────────────────────────────────
// La base de datos de mentira: documentos con versión y transacciones optimistas.
// ─────────────────────────────────────────────────────────────────────────────
const cede = () => new Promise((r) => setTimeout(r, Math.floor(Math.random() * 3)));

class FirestoreDeMentira {
  constructor() { this.docs = new Map(); this.versiones = new Map(); this.transacciones = 0; this.commits = 0; this.reintentos = 0; this.creaciones = 0; this.actualizaciones = 0; }
  documentosDe(uid) { return [...this.docs.entries()].filter(([, d]) => d.uid === uid); }
  async buscarPorUid(uid) {
    await cede();
    /* Como `where('uid', '==').limit(1)` sin orden: el de id más bajo. */
    const encontrados = this.documentosDe(uid).sort(([a], [b]) => a.localeCompare(b));
    return encontrados.length ? { id: encontrados[0][0], ...encontrados[0][1] } : null;
  }
  async enTransaccion(cuerpo) {
    for (let intento = 1; intento <= 5; intento++) {
      this.transacciones++;
      if (intento > 1) this.reintentos++;
      const leidos = new Map();
      const escrituras = [];
      const actualizaciones = [];
      const tx = {
        leer: async (id) => { await cede(); leidos.set(id, this.versiones.get(id) || 0); const d = this.docs.get(id); return d ? { id, ...d } : null; },
        crear: (id, datos) => { escrituras.push([id, datos]); },
        actualizar: (id, campos) => { actualizaciones.push([id, campos]); },
      };
      const resultado = await cuerpo(tx);
      await cede();
      /* Commit optimista: si algo leído cambió de versión, la transacción entera se repite. */
      let conflicto = false;
      for (const [id, v] of leidos) if ((this.versiones.get(id) || 0) !== v) conflicto = true;
      if (conflicto) continue;
      /* Como Firestore: un `update` sobre un documento que no existe tumba la transacción entera, sin escribir nada. */
      for (const [id] of actualizaciones) if (!this.docs.has(id)) throw new Error('NOT_FOUND: no hay documento que actualizar: ' + id);
      for (const [id, datos] of escrituras) {
        if (this.docs.has(id)) throw new Error('la base de datos de mentira no sobreescribe: ' + id);
        const { id: _i, ...resto } = datos;
        this.docs.set(id, resto);
        this.versiones.set(id, (this.versiones.get(id) || 0) + 1);
        this.creaciones++;
      }
      for (const [id, campos] of actualizaciones) {
        this.docs.set(id, { ...this.docs.get(id), ...campos });
        this.versiones.set(id, (this.versiones.get(id) || 0) + 1);
        this.actualizaciones++;
      }
      this.commits++;
      return resultado;
    }
    throw new Error('transacción abortada tras 5 intentos');
  }
}

/* Como el servicio: el perfil nuevo lleva su id determinista, `users/<uid>`. */
const perfilDe = (uid) => () => ({ id: idDelPerfilReal(uid), uid, displayName: 'Persona', profileType: 'real', createdAt: 1 });
const puertos = (bd) => ({ buscarPorUid: (u) => bd.buscarPorUid(u), enTransaccion: (c) => bd.enTransaccion(c) });

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Concurrencia sobre la base de datos de mentira ──');
// ════════════════════════════════════════════════════════════════════════════
{
  for (const n of [1, 2, 5, 10]) {
    let rondasBien = 0;
    const RONDAS = 25;
    for (let r = 0; r < RONDAS; r++) {
      const bd = new FirestoreDeMentira();
      const uid = 'cuenta' + r;
      const resultados = await Promise.all(Array.from({ length: n }, () => asegurarPerfilReal(puertos(bd), uid, perfilDe(uid))));
      const ids = new Set(resultados.map((x) => x.perfil.id));
      const creados = resultados.filter((x) => x.creado).length;
      if (bd.documentosDe(uid).length === 1 && ids.size === 1 && creados === 1 && bd.creaciones === 1 && [...ids][0] === idDelPerfilReal(uid)) rondasBien++;
    }
    check(`${n}) ${n} petición(es) a la vez, ${RONDAS} rondas: siempre UN perfil, todos ven el mismo, uno solo lo creó`, rondasBien === RONDAS, `${rondasBien}/${RONDAS}`);
  }

  /* Un perfil antiguo con id automático sigue siendo el de la cuenta: no se crea otro al lado. */
  {
    const bd = new FirestoreDeMentira();
    bd.docs.set('idAutomatico', { uid: 'cuentaAntigua', displayName: 'Antigua', profileType: 'real' });
    const r = await Promise.all(Array.from({ length: 10 }, () => asegurarPerfilReal(puertos(bd), 'cuentaAntigua', perfilDe('cuentaAntigua'))));
    check('11) un perfil antiguo con id automático se devuelve tal cual y no se crea `users/<uid>` al lado',
      r.every((x) => !x.creado && x.perfil.id === 'idAutomatico') && bd.documentosDe('cuentaAntigua').length === 1 && bd.creaciones === 0);
  }

  /* El primer intento falla —red, reglas— y el reintento crea uno solo. */
  {
    const bd = new FirestoreDeMentira();
    let fallosPendientes = 1;
    const p = { ...puertos(bd), enTransaccion: (c) => { if (fallosPendientes-- > 0) return Promise.reject(new Error('sin red')); return bd.enTransaccion(c); } };
    let error = null;
    try { await asegurarPerfilReal(p, 'cuentaX', perfilDe('cuentaX')); } catch (e) { error = e; }
    const reintento = await asegurarPerfilReal(p, 'cuentaX', perfilDe('cuentaX'));
    check('12) si el primer intento falla, no queda nada a medias y el reintento crea uno solo',
      error && error.message === 'sin red' && reintento.creado && bd.documentosDe('cuentaX').length === 1);
  }

  /* La respuesta se pierde DESPUÉS del commit: la siguiente ejecución encuentra el perfil y no crea otro. */
  {
    const bd = new FirestoreDeMentira();
    let perderRespuesta = true;
    const p = { ...puertos(bd), enTransaccion: async (c) => { const r = await bd.enTransaccion(c); if (perderRespuesta) { perderRespuesta = false; throw new Error('timeout'); } return r; } };
    let error = null;
    try { await asegurarPerfilReal(p, 'cuentaY', perfilDe('cuentaY')); } catch (e) { error = e; }
    const segunda = await asegurarPerfilReal(p, 'cuentaY', perfilDe('cuentaY'));
    check('13) respuesta perdida tras el commit: la segunda ejecución devuelve el mismo perfil sin crear otro',
      error && error.message === 'timeout' && !segunda.creado && segunda.perfil.id === idDelPerfilReal('cuentaY') && bd.documentosDe('cuentaY').length === 1 && bd.creaciones === 1);
  }

  /* Segunda ejecución en frío: idempotente y sin escribir. */
  {
    const bd = new FirestoreDeMentira();
    const primera = await asegurarPerfilReal(puertos(bd), 'cuentaZ', perfilDe('cuentaZ'));
    const commitsTrasCrear = bd.commits;
    const segunda = await asegurarPerfilReal(puertos(bd), 'cuentaZ', perfilDe('cuentaZ'));
    check('14) la segunda ejecución no escribe: mismo perfil, `creado: false`, ninguna transacción más',
      primera.creado && !segunda.creado && segunda.perfil.id === primera.perfil.id && bd.commits === commitsTrasCrear && bd.transacciones === 1);
  }

  /* Anónimo y con proveedor: el protocolo no distingue, porque la identidad es el uid de Auth en los dos casos. */
  {
    const bd = new FirestoreDeMentira();
    const anonimo = await Promise.all(Array.from({ length: 5 }, () => asegurarPerfilReal(puertos(bd), 'anonimo0000000000000000000001', () => ({ uid: 'anonimo0000000000000000000001', displayName: 'Usuario Anónimo', profileType: 'real' }))));
    const google = await Promise.all(Array.from({ length: 5 }, () => asegurarPerfilReal(puertos(bd), 'google00000000000000000000001', () => ({ uid: 'google00000000000000000000001', displayName: 'Con Google', profileType: 'real', photoURL: 'https://foto' }))));
    check('15) usuario anónimo y usuario con proveedor: un perfil cada uno, sin mezclarse',
      bd.documentosDe('anonimo0000000000000000000001').length === 1 && bd.documentosDe('google00000000000000000000001').length === 1
      && anonimo.filter((x) => x.creado).length === 1 && google.filter((x) => x.creado).length === 1 && bd.docs.size === 2);
  }

  /* Registro simultáneo: dos arranques y el onboarding actualizando el perfil que devuelven. */
  {
    const bd = new FirestoreDeMentira();
    const [a, b] = await Promise.all([asegurarPerfilReal(puertos(bd), 'cuentaW', perfilDe('cuentaW')), asegurarPerfilReal(puertos(bd), 'cuentaW', perfilDe('cuentaW'))]);
    /* El onboarding escribe sobre el id que le devolvieron: los dos apuntan al mismo. */
    bd.docs.set(a.perfil.id, { ...bd.docs.get(a.perfil.id), displayName: 'Nombre elegido', hasCompletedCommunityOnboarding: true });
    check('16) registro simultáneo: los dos arranques reciben el mismo id y el onboarding cae en un único documento',
      a.perfil.id === b.perfil.id && bd.documentosDe('cuentaW').length === 1 && bd.docs.get(b.perfil.id).hasCompletedCommunityOnboarding === true);
  }

  /* Coalescencia dentro del proceso: diez llamadas a la vez, una transacción. */
  {
    const bd = new FirestoreDeMentira();
    const asegurar = conUnaSolaEnVuelo((uid, nuevo) => asegurarPerfilReal(puertos(bd), uid, nuevo));
    const r = await Promise.all(Array.from({ length: 10 }, () => asegurar('cuentaV', perfilDe('cuentaV'))));
    check('17) dentro del mismo proceso, diez llamadas a la vez comparten UNA transacción', bd.transacciones === 1 && new Set(r.map((x) => x.perfil.id)).size === 1 && bd.documentosDe('cuentaV').length === 1);
    /* Y cuando termina se olvida: la siguiente llamada vuelve a preguntar (y no escribe). */
    const despues = await asegurar('cuentaV', perfilDe('cuentaV'));
    check('17) y al terminar se olvida: la siguiente llamada vuelve a mirar y no crea nada', !despues.creado && bd.creaciones === 1);
    /* Un fallo no se queda pegado: el siguiente intento vuelve a pasar. */
    let fallo = true;
    const asegurarQueFalla = conUnaSolaEnVuelo((uid, nuevo) => (fallo ? (fallo = false, Promise.reject(new Error('sin red'))) : asegurarPerfilReal(puertos(bd), uid, nuevo)));
    let e1 = null; try { await asegurarQueFalla('cuentaU', perfilDe('cuentaU')); } catch (e) { e1 = e; }
    const r2 = await asegurarQueFalla('cuentaU', perfilDe('cuentaU'));
    check('17) un fallo en vuelo no se queda pegado: el siguiente intento crea', e1 && e1.message === 'sin red' && r2.creado);
  }

  /* Lo que el protocolo rechaza antes de tocar nada. */
  {
    const bd = new FirestoreDeMentira();
    const rechaza = async (uid, nuevo) => { try { await asegurarPerfilReal(puertos(bd), uid, nuevo); return false; } catch { return true; } };
    check('18) un uid con la forma de una cara (`hidi_…`) no es una cuenta: se rechaza sin escribir',
      await rechaza('hidi_cuenta1', perfilDe('hidi_cuenta1')) && await rechaza('', perfilDe('')) && await rechaza('con/barra', perfilDe('con/barra')) && bd.docs.size === 0);
    check('18) y un perfil nuevo que no sea de esa cuenta tampoco entra',
      await rechaza('cuentaT', () => ({ uid: 'otraCuenta', profileType: 'real' })) && bd.docs.size === 0);
    check('19) el id del perfil real es la cuenta, y solo eso', idDelPerfilReal('cuentaT') === 'cuentaT' && esUidDeCuenta('cuentaT') && !esUidDeCuenta('hidi_cuentaT'));
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El Perfil Weë: una cara por cuenta, enlazada en la misma transacción ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* El identificador heredado de la cara, como DATO: en la app lo compone `identidadWeeDe`; aquí se escribe tal cual. */
  const caraDe = (cuenta) => 'hidi_' + cuenta;
  const weeDe = (cuenta) => () => ({ id: idDelPerfilWee(caraDe(cuenta)), uid: caraDe(cuenta), displayName: 'Cara', profileType: 'hidi', linkedAccountId: cuenta });
  const vinculoDe = (cuenta, idReal = idDelPerfilReal(cuenta)) => ({ cuenta, identidadWee: caraDe(cuenta), idDelPerfilReal: idReal });
  const conPerfilReal = async (cuenta) => { const bd = new FirestoreDeMentira(); await asegurarPerfilReal(puertos(bd), cuenta, perfilDe(cuenta)); return bd; };

  for (const n of [1, 2, 5, 10]) {
    let rondasBien = 0;
    const RONDAS = 25;
    for (let r = 0; r < RONDAS; r++) {
      const cuenta = 'cuentaConCara' + r;
      const bd = await conPerfilReal(cuenta);
      const resultados = await Promise.all(Array.from({ length: n }, () => asegurarPerfilWee(puertos(bd), vinculoDe(cuenta), weeDe(cuenta))));
      const caras = bd.documentosDe(caraDe(cuenta));
      const real = bd.docs.get(idDelPerfilReal(cuenta));
      if (caras.length === 1 && caras[0][0] === caraDe(cuenta) && new Set(resultados.map((x) => x.perfil.id)).size === 1 && resultados.filter((x) => x.creado).length === 1
        && real.linkedAccountId === caraDe(cuenta) && bd.actualizaciones === 1) rondasBien++;
    }
    check(`W${n}) ${n} petición(es) a la vez, ${RONDAS} rondas: UNA cara, enlazada UNA vez desde el Perfil Real, todos ven la misma`, rondasBien === RONDAS, `${rondasBien}/${RONDAS}`);
  }

  /* Una cara antigua con id automático —hay cuatro en producción— se devuelve y no se crea otra, ni se enlaza nada. */
  {
    const bd = await conPerfilReal('cuentaAntigua');
    bd.docs.set('idAutoWee', { uid: caraDe('cuentaAntigua'), displayName: 'Cara antigua', profileType: 'hidi', linkedAccountId: 'cuentaAntigua' });
    const r = await Promise.all(Array.from({ length: 10 }, () => asegurarPerfilWee(puertos(bd), vinculoDe('cuentaAntigua'), weeDe('cuentaAntigua'))));
    check('W11) una cara antigua con id automático se devuelve tal cual: ni otra cara, ni otro enlace',
      r.every((x) => !x.creado && x.perfil.id === 'idAutoWee') && bd.documentosDe(caraDe('cuentaAntigua')).length === 1 && bd.actualizaciones === 0);
  }

  /* Sin Perfil Real al que enlazar, no nace la cara: la transacción entera cae. */
  {
    const bd = new FirestoreDeMentira();
    let error = null;
    try { await asegurarPerfilWee(puertos(bd), vinculoDe('cuentaSinReal'), weeDe('cuentaSinReal')); } catch (e) { error = e; }
    check('W12) sin Perfil Real que enlazar no queda ninguna cara suelta: la transacción cae entera', error && /NOT_FOUND/.test(error.message) && bd.docs.size === 0);
  }

  /* Fallo del primer intento, respuesta perdida, segunda ejecución. */
  {
    const bd = await conPerfilReal('cuentaF');
    let fallos = 1;
    const p = { ...puertos(bd), enTransaccion: (c) => (fallos-- > 0 ? Promise.reject(new Error('sin red')) : bd.enTransaccion(c)) };
    let e1 = null; try { await asegurarPerfilWee(p, vinculoDe('cuentaF'), weeDe('cuentaF')); } catch (e) { e1 = e; }
    const reintento = await asegurarPerfilWee(p, vinculoDe('cuentaF'), weeDe('cuentaF'));
    check('W13) si el primer intento falla, el reintento crea una sola cara y un solo enlace', e1 && reintento.creado && bd.documentosDe(caraDe('cuentaF')).length === 1 && bd.actualizaciones === 1);
  }
  {
    const bd = await conPerfilReal('cuentaG');
    let perder = true;
    const p = { ...puertos(bd), enTransaccion: async (c) => { const r = await bd.enTransaccion(c); if (perder) { perder = false; throw new Error('timeout'); } return r; } };
    let e1 = null; try { await asegurarPerfilWee(p, vinculoDe('cuentaG'), weeDe('cuentaG')); } catch (e) { e1 = e; }
    const segunda = await asegurarPerfilWee(p, vinculoDe('cuentaG'), weeDe('cuentaG'));
    check('W14) respuesta perdida tras el commit: la segunda ejecución devuelve la misma cara sin crear ni enlazar otra vez',
      e1 && !segunda.creado && segunda.perfil.id === caraDe('cuentaG') && bd.documentosDe(caraDe('cuentaG')).length === 1 && bd.actualizaciones === 1);
  }
  {
    const bd = await conPerfilReal('cuentaH');
    const primera = await asegurarPerfilWee(puertos(bd), vinculoDe('cuentaH'), weeDe('cuentaH'));
    const commits = bd.commits;
    const segunda = await asegurarPerfilWee(puertos(bd), vinculoDe('cuentaH'), weeDe('cuentaH'));
    check('W15) la segunda ejecución no escribe nada', primera.creado && !segunda.creado && bd.commits === commits);
  }

  /* Lo que el protocolo no deja: una cara de otra cuenta, o que no declare la suya. */
  {
    const bd = await conPerfilReal('cuentaI');
    const rechaza = async (vinculo, nuevo) => { try { await asegurarPerfilWee(puertos(bd), vinculo, nuevo); return false; } catch { return true; } };
    check('W16) una cara que declara OTRA cuenta no entra, y no queda nada escrito',
      await rechaza(vinculoDe('cuentaI'), () => ({ ...weeDe('cuentaI')(), linkedAccountId: 'otraCuenta' })) && bd.documentosDe(caraDe('cuentaI')).length === 0 && bd.actualizaciones === 0);
    check('W17) ni una cara cuya identidad sea la propia cuenta, ni una cuenta con forma de cara, ni sin Perfil Real',
      await rechaza({ cuenta: 'cuentaI', identidadWee: 'cuentaI', idDelPerfilReal: 'cuentaI' }, weeDe('cuentaI'))
      && await rechaza(vinculoDe('hidi_cuentaI'), weeDe('hidi_cuentaI'))
      && await rechaza({ cuenta: 'cuentaI', identidadWee: caraDe('cuentaI'), idDelPerfilReal: '' }, weeDe('cuentaI')));
    check('W18) la identidad de la cara no es la cuenta: `esUidDeCuenta` la rechaza y `idDelPerfilWee` es su propio identificador', !esUidDeCuenta(caraDe('cuentaI')) && idDelPerfilWee(caraDe('cuentaI')) === caraDe('cuentaI'));
  }

  /* Coalescencia por cuenta dentro del proceso. */
  {
    const bd = await conPerfilReal('cuentaJ');
    const asegurar = conUnaSolaEnVuelo((cuenta, idReal, nuevo) => asegurarPerfilWee(puertos(bd), vinculoDe(cuenta, idReal), nuevo));
    const antes = bd.transacciones;
    const r = await Promise.all(Array.from({ length: 10 }, () => asegurar('cuentaJ', idDelPerfilReal('cuentaJ'), weeDe('cuentaJ'))));
    check('W19) diez llamadas a la vez desde el mismo proceso comparten UNA transacción', bd.transacciones === antes + 1 && new Set(r.map((x) => x.perfil.id)).size === 1);
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El cableado real: contexto, servicio, reglas y nadie más ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const contexto = soloCodigo(leer('contexts/UserProfileContext.tsx'));
  const servicio = leer('services/firestoreService.ts');
  const reglas = leer('firestore.rules');

  check('20) el contexto pide el perfil al servicio y ya no lee-y-crea por su cuenta',
    /usersService\.ensureRealProfile\(user\.uid, nuevoPerfilReal\)/.test(contexto) && !/usersService\.create\(/.test(contexto) && !/getByUid\(user\.uid\)/.test(contexto)
    && /console\.log\('📝 \[UserProfileContext\] Perfil real creado:', asegurado\.perfil\.id\)/.test(contexto));
  check('21) el servicio usa el protocolo con una transacción sobre users/<uid>',
    /ensureRealProfile: conUnaSolaEnVuelo/.test(servicio) && /asegurarPerfilReal<UserProfile>\(puertosDePerfiles, uid/.test(servicio)
    && /runTransaction\(db, \(tx\) => cuerpo\(/.test(servicio) && /tx\.get\(doc\(db, 'users', id\)\)/.test(servicio) && /tx\.set\(doc\(db, 'users', id\), campos\)/.test(servicio)
    && /tx\.update\(doc\(db, 'users', id\), campos/.test(servicio)
    && /buscarPorUid: perfilRealPorUid,/.test(servicio) && /getByUid: perfilRealPorUid,/.test(servicio));
  check('21) y `getByUid` sigue siendo el único resolutor: una lectura que falla lanza, nunca devuelve «no hay»',
    /console\.error\(`Error obteniendo documentos de \$\{collectionName\}:`, error\);\s*\n\s*throw error;/.test(servicio));
  check('22) las reglas atan la creación del perfil real a users/<uid> y la del Perfil Weë a users/<su identificador>',
    /request\.auth\.uid == request\.resource\.data\.uid && userId == request\.auth\.uid &&\s*\n\s*\(!\('profileType' in request\.resource\.data\) \|\| request\.resource\.data\.profileType == 'real'\)/.test(reglas)
    && /request\.resource\.data\.uid == \("hidi_" \+ request\.auth\.uid\) &&\s*\n\s*userId == request\.resource\.data\.uid &&\s*\n\s*request\.resource\.data\.profileType == 'hidi' &&\s*\n\s*request\.resource\.data\.linkedAccountId == request\.auth\.uid/.test(reglas));
  check('23) y hacen inmutable la identidad: uid y profileType no se reescriben, linkedAccountId solo a la propia cara',
    /function identityFields\(\) \{\s*\n\s*return \['uid', 'profileType'\];/.test(reglas)
    && /!touchesIdentityFields\(\) && linkedAccountIdValido\(\) &&/.test(reglas)
    && /request\.resource\.data\.linkedAccountId == \("hidi_" \+ request\.auth\.uid\)/.test(reglas));

  /* Nadie más crea documentos de `users`: ni pantallas, ni servicios, ni Weë AI por producto. */
  const carpetas = ['screens', 'services', 'contexts', 'hooks', 'components', 'utils', 'navigation'];
  const archivos = [];
  const recorrer = (dir) => { for (const f of fs.readdirSync(new URL(dir + '/', RAIZ))) { const ruta = dir + '/' + f; const url = new URL(ruta, RAIZ); if (fs.statSync(url).isDirectory()) recorrer(ruta); else if (/\.tsx?$/.test(f)) archivos.push(ruta); } };
  carpetas.forEach(recorrer);
  const creadores = archivos.filter((p) => { const s = soloCodigo(leer(p)); return /usersService\.create\(|addDoc\(collection\(db, 'users'\)|firestoreService\.create<UserProfile>\('users'/.test(s); });
  check('24) fuera del servicio nadie crea documentos de users: ni Studio, ni Design, ni Chef, ni Travel, ni Business',
    creadores.every((p) => p === 'services/firestoreService.ts'), creadores.join(', '));
  check('24) el hook antiguo que leía-y-creaba ya no existe', !existe('hooks/useUserProfile.ts'));
  const pantallaWee = soloCodigo(leer('screens/WeeProfileCreationScreen.tsx'));
  const modelo = leer('utils/econtactModel.ts');
  const reglasWee = /request\.resource\.data\.uid == \("hidi_" \+ request\.auth\.uid\) &&\s*\n\s*userId == request\.resource\.data\.uid &&\s*\n\s*request\.resource\.data\.profileType == 'hidi' &&\s*\n\s*request\.resource\.data\.linkedAccountId == request\.auth\.uid/;
  check('25) el Perfil Weë se crea con el mismo protocolo: su documento es su identificador, declara su cuenta y nace enlazado',
    /ensureWeeProfile: conUnaSolaEnVuelo\(/.test(servicio) && /asegurarPerfilWee<UserProfile>\(puertosDePerfiles, \{ cuenta, identidadWee, idDelPerfilReal \}/.test(servicio)
    && /profileType: 'hidi',\s*\n\s*linkedAccountId: cuenta,/.test(servicio) && !/createWeeProfile/.test(servicio)
    && /usersService\.ensureWeeProfile\(user\.uid, realProfile\.id, \{/.test(pantallaWee) && !/usersService\.update\(realProfile\.id/.test(pantallaWee) && !/usersService\.create\(/.test(pantallaWee));
  check('25) y las reglas atan la cara a users/<su identificador>, con su cuenta declarada', reglasWee.test(reglas));
  check('25) el identificador heredado de la cara se compone en UN sitio del cliente: econtactModel.identidadWeeDe',
    /export const identidadWeeDe = \(accountUid: string\): string => PREFIJO_PERFIL_WEE \+ accountUid;/.test(modelo)
    && !/`hidi_\$\{/.test(soloCodigo(servicio)) && !/`hidi_\$\{/.test(pantallaWee) && /identidadWeeDe\(cuenta\)/.test(servicio) && /identidadWeeDe\(realUid\)/.test(servicio));
  check('26) ningún código resuelve un perfil leyendo users/<uid> por id: la identidad sigue siendo el campo uid',
    archivos.every((p) => !/getDoc\(doc\(db, 'users', (user|userProfile|uid|userId)\b/.test(soloCodigo(leer(p)))));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
