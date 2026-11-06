/*
 * COMUNIDADES POR IDENTIDAD — las decisiones puras y el cableado (docs/COMUNIDADES-IDENTIDAD.md).
 *
 *   node test/comunidades-identidad.test.mjs
 *
 * Lo que necesita Firestore de verdad (transacciones, reglas, contadores, aislamiento entre caras) está en
 * `comunidades-identidad.emulator.mjs`. Aquí: la tabla de permisos entera, que lo heredado nunca asciende a nadie, que
 * lo público no puede llevar una cuenta, y que la app y las reglas ya no tienen el camino directo de antes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const m = require(path.join(raiz, 'functions/lib/social/comunidades.js'));

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => { console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`); if (!cond) failures++; };

const PAPELES = ['owner', 'admin', 'moderator', 'member'];
const RANGO = { owner: 3, admin: 2, moderator: 1, member: 0 };
const ACTORES = [null, ...PAPELES];

console.log('── A · La tabla de permisos, entera ──');
{
  /* La especificación, escrita aparte del código: lo que el dueño aprobó. */
  const esperadoPapel = (actor, objetivo, nuevo, misma) => {
    if (!actor) return 'no-es-miembro';
    if (!PAPELES.includes(nuevo)) return 'datos-invalidos';
    if (nuevo === 'owner') return 'usa-transferencia';
    if (misma) return 'sin-permiso';
    if (!objetivo) return 'no-es-miembro';
    if (objetivo === 'owner') return 'no-al-dueno';
    if (actor === 'owner') return 'ok';
    if (actor === 'admin' && ['moderator', 'member'].includes(objetivo) && ['moderator', 'member'].includes(nuevo)) return 'ok';
    return 'sin-permiso';
  };
  const malos = [];
  for (const actor of ACTORES) for (const objetivo of ACTORES) for (const nuevo of [...PAPELES, 'superadmin', null]) for (const misma of [false, true]) {
    const d = m.decidirCambioDePapel({ actor, objetivo, nuevo, mismaIdentidad: misma });
    const got = d.ok ? 'ok' : d.motivo;
    if (got !== esperadoPapel(actor, objetivo, nuevo, misma)) malos.push(`${actor}->${objetivo}=${nuevo}${misma ? '(yo)' : ''}: ${got}`);
  }
  check('cambiar papeles: 300 combinaciones según la especificación (dueño todo salvo dueño; admin solo por debajo de admin; el resto nada)', malos.length === 0, malos.slice(0, 4).join(' · '));

  const esperadoExp = (actor, objetivo, misma) => {
    if (!actor) return 'no-es-miembro';
    if (misma) return 'usa-salir';
    if (!objetivo) return 'no-es-miembro';
    if (objetivo === 'owner') return 'no-al-dueno';
    return RANGO[actor] >= 1 && RANGO[actor] > RANGO[objetivo] ? 'ok' : 'sin-permiso';
  };
  const malosE = [];
  for (const actor of ACTORES) for (const objetivo of ACTORES) for (const misma of [false, true]) {
    const d = m.decidirExpulsion({ actor, objetivo, mismaIdentidad: misma });
    if ((d.ok ? 'ok' : d.motivo) !== esperadoExp(actor, objetivo, misma)) malosE.push(`${actor}->${objetivo}`);
  }
  check('expulsar: solo quien está por encima y como mínimo moderador; a la dueña nadie', malosE.length === 0, malosE.join(' · '));

  check('salir: todos menos la dueña, que transfiere antes', PAPELES.every((p) => m.decidirSalida(p).ok === (p !== 'owner')) && m.decidirSalida('owner').motivo === 'dueno-debe-transferir' && m.decidirSalida(null).ok);
  const malosT = [];
  for (const actor of ACTORES) for (const objetivo of ACTORES) for (const misma of [false, true]) {
    const d = m.decidirTransferencia({ actor, objetivo, mismaIdentidad: misma });
    const esperado = !actor ? 'no-es-miembro' : actor !== 'owner' ? 'sin-permiso' : misma ? 'ya-eres-dueno' : !objetivo ? 'no-es-miembro' : 'ok';
    if ((d.ok ? 'ok' : d.motivo) !== esperado) malosT.push(`${actor}->${objetivo}`);
  }
  check('transferir: solo la dueña, a otra identidad que ya es miembro', malosT.length === 0, malosT.join(' · '));
  check('editar: dueña y admin', ACTORES.every((a) => m.decidirEdicion(a).ok === (a === 'owner' || a === 'admin')));
  check('gobierno: oficial → de Weë; heredada → sin dueño por identidad hasta reclamarla; nueva → sí',
    m.decidirGobierno({ isOfficial: true, governance: 'identity' }).motivo === 'comunidad-oficial' && m.decidirGobierno({ createdBy: 'x' }).motivo === 'comunidad-heredada'
    && m.decidirGobierno({ governance: 'identity' }).ok && m.decidirGobierno(null).motivo === 'no-existe');
}

console.log('\n── B · Lo heredado y lo público ──');
{
  check('un miembro heredado (sin `role`) es `member`, nunca dueño', m.papelDelMiembro({ userId: 'x' }) === 'member' && m.papelDelMiembro({ userId: 'x', role: 'god' }) === 'member'
    && m.papelDelMiembro(null) === null && m.papelDelMiembro({ role: 'owner' }) === 'owner');
  check('la referencia pública es la entidad o nada: el uid NUNCA',
    m.referenciaPublicaSegura({ entityId: 'ent_0000000000000000000000000a', uid: 'abc' }) === 'ent_0000000000000000000000000a'
    && m.referenciaPublicaSegura({ uid: 'abc' }) === null && m.referenciaPublicaSegura({ entityId: 'hidi_abc' }) === null && m.referenciaPublicaSegura({ entityId: 'abc' }) === null);
  const k1 = m.claveDeOperacion('cuentaUno', 'peticion-1234');
  check('la clave de una operación no lleva ni la cuenta ni la petición, y es de la cuenta', /^[0-9a-f]{64}$/.test(k1) && !k1.includes('cuentaUno') && k1 !== m.claveDeOperacion('cuentaDos', 'peticion-1234') && k1 === m.claveDeOperacion('cuentaUno', 'peticion-1234'));
  check('el slug sale igual que antes en la app', m.slugDe('Cine & Animación!') === 'cine-animacion' && m.slugDe('  Ñandú  Club ') === 'nandu-club');
  const limpia = m.validarComunidad({ name: '  Club  ', description: 'x', rules: ['uno', '', 'dos'] });
  check('validar: recorta, numera las normas y pone el icono por defecto', limpia.name === 'Club' && limpia.icon === 'people' && limpia.rules.length === 2 && limpia.rules[1].order === 2);
  const lanza = (f) => { try { f(); return false; } catch (e) { return e.motivo === 'datos-invalidos'; } };
  check('validar: rechaza nombre vacío o largo, normas de más, icono raro, tipos raros',
    lanza(() => m.validarComunidad({ name: '' })) && lanza(() => m.validarComunidad({ name: 'x'.repeat(61) })) && lanza(() => m.validarComunidad({ name: 'a', rules: Array(11).fill('r') }))
    && lanza(() => m.validarComunidad({ name: 'a', icon: 'a b' })) && lanza(() => m.validarComunidad({ name: 7 })) && lanza(() => m.validarComunidad({ name: '!!!' })));
  const reglas = leer('firestore.rules');
  const enReglas = [...((reglas.match(/function slugsOficiales\(\) \{\s*return \[([^\]]*)\];/) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  check('los slugs reservados del servidor son los de las reglas', JSON.stringify([...m.SLUGS_OFICIALES].sort()) === JSON.stringify(enReglas), enReglas.join(','));
}

console.log('\n── C · El servidor: patrón de ËContact, sin Credits ni IA ──');
{
  const fuente = leer('functions/src/social/comunidades.ts');
  const codigo = sinComentarios(fuente);
  const callables = [...codigo.matchAll(/export const (\w+) = onCall\(OPTS, async \(request\) => \{\s*\n\s*const cuentaDeLaSesion = laCuentaDe\(request\);/g)].map((x) => x[1]);
  const esperadas = ['createCommunity', 'joinCommunity', 'leaveCommunity', 'setCommunityRole', 'removeCommunityMember', 'transferCommunityOwnership', 'updateCommunity', 'claimLegacyCommunity', 'listMyCommunities'];
  check('nueve callables, y cada una empieza por la cuenta de la sesión', JSON.stringify(callables) === JSON.stringify(esperadas) && (codigo.match(/= onCall\(/g) || []).length === 9, callables.join(','));
  const indice = leer('functions/src/index.ts');
  check('todas exportadas en index.ts', esperadas.every((c) => new RegExp(`\\b${c}\\b`).test(indice.slice(indice.indexOf("from './social/comunidades'") - 400, indice.indexOf("from './social/comunidades'")))));
  check('la identidad se comprueba con `users` (cuentaDeIdentidad / decidirIdentidad de ËContact), no con el prefijo',
    /import \{ cuentaDeIdentidad, decidirIdentidad,[^}]*\} from '\.\/econtact';/.test(fuente) && !/startsWith\('hidi_'\)|'hidi_' \+|`hidi_\$\{/.test(codigo));
  check('cada escritura va en una transacción (ninguna fuera)', (codigo.match(/runTransaction\(/g) || []).length === 8 && !/\.(set|update|delete)\(/.test(codigo.replace(/tx\.(set|update|delete|create)\(/g, '').replace(/createHash\('sha256'\)\.update\(/g, '')));
  check('Firestore inyectado (createComunidadesEngine) y la instancia de producción aparte', /export const createComunidadesEngine = \(deps: ComunidadesDeps\)/.test(codigo) && /db: \(\) => getFirestore\(\)/.test(codigo));
  check('los errores viajan como CÓDIGO (sin frases que traducir en el servidor)', [...codigo.matchAll(/new HttpsError\([^,]+,\s*([^,)]+)/g)].every((x) => /^(error\.motivo|'[a-z-]+')$/.test(x[1].trim())));
  check('ni Credits ni IA', !/credit|gemini|provider|engine\/|spend/i.test((fuente.match(/^import .*$/gm) || []).join('\n')));
  check('lo público no lleva `createdBy` ni uids en `moderators`', !/createdBy:/.test(codigo.slice(codigo.indexOf('tx.create(comunidadRef'), codigo.indexOf('tx.create(r.propiedad'))) && /moderators: \[\],/.test(codigo));
}

console.log('\n── D · La app: con la cara activa y por el servidor ──');
{
  const app = ['screens', 'components', 'hooks', 'contexts', 'utils', 'navigation'].flatMap(function listar(d) {
    const abs = path.join(raiz, d);
    if (!fs.existsSync(abs)) return [];
    return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.(ts|tsx)$/.test(e.name) ? [`${d}/${e.name}`] : []));
  });
  const directos = app.filter((f) => /communityService\.(joinCommunity|leaveCommunity|createCommunity|incrementPostCount|decrementPostCount)\(/.test(sinComentarios(leer(f))));
  check('ninguna pantalla ni hook escribe comunidades directamente (join/leave/create del servicio antiguo)', directos.length === 0, directos.join(', '));
  const hook = sinComentarios(leer('hooks/useCommunities.ts'));
  check('el hook se une y sale con la identidad que recibe (la cara activa), por el servidor', /comunidadesService\.unirse\(userId, communityId\)/.test(hook) && /comunidadesService\.salir\(userId, communityId\)/.test(hook));
  const pantalla = sinComentarios(leer('screens/CommunitiesManagementScreen.tsx'));
  check('la pantalla actúa con `userProfile?.uid` (la cara activa), no con la cuenta', /const identidad = userProfile\?\.uid;/.test(pantalla)
    && /comunidadesService\.unirse\(identidad,/.test(pantalla) && /comunidadesService\.salir\(identidad,/.test(pantalla) && /comunidadesService\.crear\(identidad,/.test(pantalla)
    && !/user\.uid, community/.test(pantalla) && !/createdBy: user\.uid/.test(pantalla));
  check('crear ya no se une otra vez después (el fallo de los 3 miembros)', !/joinCommunity/.test(pantalla) && /peticionDeCreacion/.test(pantalla));
  check('«Mis comunidades» = donde la cara activa es dueña (o la heredada que esta cara creó)', /papeles\[c\.id\] === 'owner' \|\| \(c as any\)\.createdBy === myUid/.test(pantalla) && /comunidadesService\.misComunidades\(identidad\)/.test(pantalla));
  check('al cambiar de cara se vacían los papeles y se descarta la respuesta tardía de la otra', /setPapeles\(\{\}\);/.test(pantalla) && /if \(vigente\) setPapeles\(/.test(pantalla) && /\}, \[identidad\]\);/.test(pantalla));
  const cliente = leer('services/comunidadesService.ts');
  const llamadas = [...cliente.matchAll(/llamar<[^>]*>\('(\w+)'/g)].map((x) => x[1]);
  check('el cliente llama a callables que existen', llamadas.length === 7 && llamadas.every((c) => fs.readFileSync(path.join(raiz, 'functions/src/social/comunidades.ts'), 'utf8').includes(`export const ${c} = onCall`)), llamadas.join(','));
  const pintar = leer('utils/comunidadesDeWee.ts');
  check('una comunidad con autor por identidad no se pinta como muestra de Weë', /!c\.createdBy && !c\.creatorProfile && c\.governance !== 'identity'/.test(pintar));
}

console.log('\n── E · Las reglas: sin caminos directos ──');
{
  const reglas = leer('firestore.rules');
  const ini = reglas.indexOf('match /communities/{communityId}');
  const bloque = reglas.slice(ini, reglas.indexOf('// === POSTS ===', ini));
  check('crear: solo administración (las oficiales)', /allow create: if isAuthenticated\(\) && comunidadOficialDeAdministracion\(\);/.test(bloque) && !/comunidadDeUsuario/.test(bloque));
  check('actualizar: solo `postCount` de uno en uno; ni memberCount, ni moderadores, ni dueño',
    /allow update: if isAuthenticated\(\) &&\s*\n\s*request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['postCount', 'updatedAt'\]\) &&\s*\n\s*contadorSano\('postCount'\);/.test(bloque)
    && !/memberCount/.test(sinComentarios(bloque).replace(/\/\/.*$/gm, '')));
  check('miembros, propiedad privada y cualquier otra subcolección: cerradas', /match \/members\/\{memberId\} \{\s*\n\s*allow read, write: if false;/.test(bloque) && /match \/private\/\{documento\} \{\s*\n\s*allow read, write: if false;/.test(bloque) && /match \/\{sub=\*\*\} \{\s*\n\s*allow read, write: if false;/.test(bloque));
  check('reservas de slug y operaciones: solo el servidor', /match \/communitySlugs\/\{slug\} \{\s*\n\s*allow read, write: if false;/.test(reglas) && /match \/communityOperations\/\{clave\} \{\s*\n\s*allow read, write: if false;/.test(reglas));
  check('la lista de comunidades de un perfil no la cambia el cliente', /!touchesCommunityFields\(\)/.test(reglas) && /function touchesCommunityFields\(\) \{\s*\n\s*return request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasAny\(\['joinedCommunities'\]\);/.test(reglas));
}

console.log(failures ? `\n✘ ${failures} fallos de ${n - 1}` : `\n✔ comunidades por identidad: ${n - 1} comprobaciones`);
process.exit(failures ? 1 : 0);
