/**
 * F12-C — COPIA DE SEGURIDAD Y RECUPERACIÓN. EL CONTRATO, EJECUTADO.
 *
 * Lo que se prueba aquí es lo que decide si una restauración vale: la
 * clasificación, la huella, la comparación, las relaciones y las reglas de «no
 * volver a ejecutar». La parte que habla con Firestore y con Cloud Storage vive
 * en `scripts/copias.mjs` y se probó contra producción de verdad
 * (docs/BACKUP.md § Prueba de restauración); esto es lo que se puede repetir
 * mil veces sin tocar nada.
 *
 *   A · Clasificar: nada se queda fuera por olvido.
 *   B · La huella: el mismo dato, siempre el mismo hash; otro dato, otro hash.
 *   C · Comparar: contar no es verificar.
 *   D · Relaciones: los huérfanos se ven.
 *   E · Restaurar no es volver a ejecutar.
 *   F · Lo que nunca se imprime.
 *   G · Estructura: el contrato es Core, y no hay dos formas de hacer esto.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const C = require(path.resolve(RAIZ, 'functions/lib/core/backup.js'));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

/* Un mundo mínimo con la forma real de Weë: cuenta, número, cara, perfil y un movimiento de Credits. */
const ts = (ms) => ({ __wee: 'ts', v: String(ms) });
const mundo = () => ({
  accounts: [{ ruta: 'accounts/cuentaA', datos: { accountId: 'cuentaA', accountNumber: '123456789', realProfileEntityId: 'ent_a', status: 'ACTIVE', createdAt: ts(1000) } }],
  accountNumbers: [{ ruta: 'accountNumbers/123456789', datos: { accountId: 'cuentaA', createdAt: ts(1000) } }],
  entities: [{ ruta: 'entities/ent_a', datos: { entityId: 'ent_a', ownerAccountId: 'cuentaA', entityType: 'REAL_PROFILE', entitySequence: 1 } }],
  users: [{ ruta: 'users/cuentaA', datos: { uid: 'cuentaA', entityId: 'ent_a', creditsBalance: 240 } }],
  creditTransactions: [{ ruta: 'creditTransactions/grant_1', datos: { userId: 'cuentaA', amount: 240, type: 'grant' } }],
});
const huellas = (m) => Object.entries(m).map(([ruta, docs]) => C.huellaDeColeccion(hash, ruta, docs));
const indiceDe = (m) => {
  const ids = {}, porCampo = {}, origenes = {};
  const campos = {};
  for (const r of C.RELACIONES) (campos[r.desde] ||= new Set()).add(r.campo);
  for (const [ruta, docs] of Object.entries(m)) {
    ids[ruta] = new Set(docs.map((d) => d.ruta.split('/').pop()));
    for (const r of C.RELACIONES) if (r.hacia === ruta && r.por !== 'id') (porCampo[ruta] ||= {})[r.por] = new Set(docs.map((d) => d.datos[r.por]).filter((x) => typeof x === 'string'));
    for (const d of docs) for (const c of campos[ruta] || []) ((origenes[ruta] ||= {})[d.ruta.split('/').pop()] ||= {})[c] = d.datos[c];
  }
  return { ids, porCampo, origenes };
};

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Clasificar: nada se queda fuera por olvido ──');
{
  const total = Object.keys(C.CLASIFICACION_DE_DATOS).length;
  check('1) hay una clasificación, y cubre bastante más que lo que hoy tiene datos', total >= 50, `${total} colecciones`);
  check('2) tres niveles y nada más', [...new Set(Object.values(C.CLASIFICACION_DE_DATOS).map((c) => c.criticidad))].sort().join() === 'CRITICAL,DERIVED,IMPORTANT');
  check('3) TODA clase dice por qué', Object.values(C.CLASIFICACION_DE_DATOS).every((c) => typeof c.porque === 'string' && c.porque.length > 15));
  check('4) LO DERIVADO dice desde qué se reconstruye, y solo lo derivado lo dice', C.clasificacionCoherente().length === 0, C.clasificacionCoherente().join(', '));

  const CRITICAS = ['accounts', 'accountNumbers', 'accounts/{accountId}/members', 'entities', 'users',
    'creditTransactions', 'creditStats', 'aiGenerations', 'posts', 'assets', 'reports', 'creatorProjects'];
  const mal = CRITICAS.filter((r) => C.clasificarColeccion(r).clase?.criticidad !== 'CRITICAL');
  check('5) el dinero, la identidad, la propiedad y la moderación son CRITICAL', mal.length === 0, mal.join(', '));
  check('6) una colección que nadie clasificó es un FALLO, no un «seguramente derivado»',
    C.clasificarColeccion('coleccionNueva').ok === false && C.clasificarColeccion('coleccionNueva').code === 'unclassified');
  /* El nombre del hueco no es parte de la ruta: si lo fuera, una subcolección se quedaría sin copia por una errata. */
  check('7) da igual cómo se llame el hueco de una subcolección',
    C.clasificarColeccion('accounts/{id}/members').ok && C.clasificarColeccion('accounts/{accountId}/members').ok
    && C.clasificarColeccion('accounts/loQueSea/members').ok && C.clasificarColeccion('users/{userId}/private').ok);
  /*
   * La tabla de dominios NO está en el Core: nombra empresas, y el Core no
   * nombra proveedores (lo comprueba `core-contracts` desde la Fase 0). Vive en
   * la herramienta; aquí se prueba la REGLA con una tabla de mentira.
   */
  const tabla = [
    { dominio: 'un-cubo-nuestro.example', recuperabilidad: 'RECOVERABLE', porque: 'es nuestro' },
    { dominio: 'medios-de-terceros.example', recuperabilidad: 'PARTIALLY_RECOVERABLE', porque: 'se bajan pero no se enumeran' },
    { dominio: 'fotos-ajenas.example', recuperabilidad: 'NOT_CURRENTLY_RECOVERABLE', porque: 'no son de Weë' },
  ];
  check('8) una URL guardada NO es una copia: la regla clasifica contra la tabla que le den',
    C.recuperabilidadDeUrl('https://medios-de-terceros.example/x.jpg', tabla).recuperabilidad === 'PARTIALLY_RECOVERABLE'
    && C.recuperabilidadDeUrl('https://fotos-ajenas.example/a', tabla).recuperabilidad === 'NOT_CURRENTLY_RECOVERABLE'
    && C.recuperabilidadDeUrl('https://un-cubo-nuestro.example/x', tabla).recuperabilidad === 'RECOVERABLE'
    && C.recuperabilidadDeUrl(7, tabla) === undefined);
  check('8b) y un almacén que nadie clasificó se DENUNCIA, no se da por recuperable',
    igual(C.dominiosSinClasificar(['un-cubo-nuestro.example', 'quien-sabe.example'], tabla), ['quien-sabe.example'])
    && C.dominiosSinClasificar(['un-cubo-nuestro.example'], tabla).length === 0
    && C.recuperabilidadDeUrl('https://quien-sabe.example/x', tabla) === undefined);
  check('8c) el Core NO trae dominios de nadie dentro: la tabla es de la herramienta',
    C.ALMACENES_DE_BYTES === undefined && !/cloudinary|googleusercontent|unsplash|dicebear/i.test(leer('functions/src/core/backup.ts'))
    && /cloudinary/.test(leer('scripts/copias.mjs')));
}

console.log('\n── B · La huella ──');
{
  const m = mundo();
  const a = C.huellaDeColeccion(hash, 'accounts', m.accounts);
  check('9) la misma colección da la misma huella, siempre', a.huella === C.huellaDeColeccion(hash, 'accounts', m.accounts).huella);
  /* El orden de las claves no es parte del dato: dos lecturas del mismo documento pueden traerlas distintas. */
  const alReves = [{ ruta: 'accounts/cuentaA', datos: Object.fromEntries(Object.entries(m.accounts[0].datos).reverse()) }];
  check('10) y el ORDEN de los campos no la cambia: esa trampa ya costó un falso positivo en la Fase 11.x-5B',
    C.huellaDeColeccion(hash, 'accounts', alReves).huella === a.huella);
  check('11) ni el orden en que se leyeron los documentos',
    C.huellaDeColeccion(hash, 'x', [m.users[0], m.accounts[0]]).huella === C.huellaDeColeccion(hash, 'x', [m.accounts[0], m.users[0]]).huella);
  const cambiado = [{ ruta: 'accounts/cuentaA', datos: { ...m.accounts[0].datos, status: 'SUSPENDED' } }];
  check('12) un solo campo distinto cambia la huella', C.huellaDeColeccion(hash, 'accounts', cambiado).huella !== a.huella);
  check('13) el MISMO dato en otra ruta es otro dato: la ruta entra en la huella',
    C.huellaDeDocumento(hash, m.accounts[0]) !== C.huellaDeDocumento(hash, { ruta: 'otra/cuentaA', datos: m.accounts[0].datos }));
  check('14) el texto «1» y el número 1 no dan la misma huella: una migración silenciosa se vería',
    C.canonizar({ a: 1 }) !== C.canonizar({ a: '1' }) && C.canonizar(null) !== C.canonizar('null') && C.canonizar(undefined) !== C.canonizar(null));
  check('15) los tipos que no son JSON viajan con su marca, así que no dependen del SDK',
    C.canonizar(ts(5)) === 'ts:5' && C.canonizar({ __wee: 'ref', v: 'a/b' }) === 'ref:a/b' && C.canonizar(ts(5)) !== C.canonizar('5'));
  check('16) y una marca falsificada no se confunde con una de verdad', C.esMarcaEspecial({ __wee: 'ts', v: '5' }) && !C.esMarcaEspecial({ __wee: 'ts' }) && !C.esMarcaEspecial('ts:5'));
  check('17) un ciclo o una profundidad absurda no tumban el cálculo', typeof C.canonizar({ a: { b: { c: {} } } }, 31) === 'string' && C.canonizar({}, 33) === 'x:profundidad');
  check('18) la huella dice CUÁL es cada documento, no solo que la colección cambió', Object.keys(a.porDocumento).length === 1 && !!a.porDocumento['accounts/cuentaA']);
}

console.log('\n── C · Comparar: contar no es verificar ──');
{
  const o = huellas(mundo());
  check('19) una copia idéntica sale idéntica', C.compararHuellas(o, huellas(mundo())).iguales);

  /* El caso que demostró el valor de todo esto: uno menos y uno de más dejan el TOTAL intacto. */
  const m = mundo();
  m.creditTransactions = [];
  m.posts = [{ ruta: 'posts/p1', datos: { userId: 'cuentaA' } }];
  const cmp = C.compararHuellas(o, huellas(m));
  check('20) UN documento borrado y OTRO añadido: el total cuadra y la comparación NO se deja engañar',
    cmp.resumen.documentosOriginal === cmp.resumen.documentosRestaurado && !cmp.iguales);
  check('21) y dice exactamente qué falta y qué sobra, por su ruta',
    cmp.colecciones.find((c) => c.ruta === 'creditTransactions').faltan.join() === 'creditTransactions/grant_1'
    && cmp.coleccionesNuevas.join() === 'posts');

  const cambiado = mundo();
  cambiado.users = [{ ruta: 'users/cuentaA', datos: { ...cambiado.users[0].datos, creditsBalance: 241 } }];
  const c2 = C.compararHuellas(o, huellas(cambiado));
  check('22) un saldo alterado en un documento aparece como CAMBIADO, no como ausente',
    !c2.iguales && c2.colecciones.find((c) => c.ruta === 'users').cambian.join() === 'users/cuentaA');
  const falta = mundo(); delete falta.entities;
  check('23) una colección entera que no llegó se ve como ausente', C.compararHuellas(o, huellas(falta)).coleccionesAusentes.join() === 'entities');
  check('24) la comparación NO enseña contenido: solo rutas', !JSON.stringify(c2).includes('241') && !JSON.stringify(c2).includes('240'));
}

console.log('\n── D · Relaciones: los huérfanos se ven ──');
{
  const m = mundo();
  check('25) un mundo coherente no tiene aristas rotas', C.verificarRelaciones(indiceDe(m)).length === 0);
  const sinEntidad = mundo(); sinEntidad.entities = [];
  const rotas = C.verificarRelaciones(indiceDe(sinEntidad));
  check('26) una cuenta cuyo Perfil Real no existe se detecta', rotas.some((r) => r.desde === 'accounts' && r.campo === 'realProfileEntityId'));
  const sinPerfil = mundo(); sinPerfil.users = [];
  check('27) un movimiento de Credits de alguien que no existe se detecta: es el huérfano real de producción',
    C.verificarRelaciones(indiceDe(sinPerfil)).some((r) => r.desde === 'creditTransactions' && r.campo === 'userId'));
  const sinCaraWee = mundo();
  check('28) lo OPCIONAL no se denuncia por estar ausente: una cuenta sin cara Weë es normal',
    C.verificarRelaciones(indiceDe(sinCaraWee)).every((r) => r.campo !== 'weeProfileEntityId'));
  const caraInventada = mundo();
  caraInventada.accounts = [{ ruta: 'accounts/cuentaA', datos: { ...caraInventada.accounts[0].datos, weeProfileEntityId: 'ent_que_no_existe' } }];
  check('29) pero si lo opcional APUNTA a algo que no está, eso sí es una arista rota',
    C.verificarRelaciones(indiceDe(caraInventada)).some((r) => r.campo === 'weeProfileEntityId'));
  check('30) toda relación declarada dice por qué existe', C.RELACIONES.every((r) => typeof r.porque === 'string' && r.porque.length > 10));
  check('31) y el informe de una arista rota NO lleva el valor: solo de dónde a dónde',
    C.verificarRelaciones(indiceDe(caraInventada)).every((r) => !JSON.stringify(r).includes('ent_que_no_existe')));
}

console.log('\n── E · Restaurar no es volver a ejecutar ──');
{
  check('32) lo terminado se restaura y no se toca', ['completed', 'failed', 'cancelled', 'timed_out', 'done'].every((e) => C.seguridadDeRestauracion({ estado: e }) === 'SAFE_TO_RESTORE'));
  check('33) lo que nunca salió se puede volver a poner en la cola', ['queued', 'planned', 'asking'].every((e) => C.seguridadDeRestauracion({ estado: e }) === 'SAFE_TO_RESTORE'));
  check('34) lo que estaba a medias necesita reconciliarse, no relanzarse', ['running', 'waiting', 'cancel_requested'].every((e) => C.seguridadDeRestauracion({ estado: e }) === 'NEEDS_RECONCILIATION'));
  check('35) y lo que SALIÓ hacia un proveedor sin respuesta NO se repite jamás: ese es el doble cobro',
    C.seguridadDeRestauracion({ estado: 'queued', salioSinRespuesta: true }) === 'NOT_REPLAYABLE'
    && C.seguridadDeRestauracion({ estado: 'completed', salioSinRespuesta: true }) === 'NOT_REPLAYABLE');
  check('36) un estado que nadie conoce no se da por seguro', C.seguridadDeRestauracion({ estado: 'loQueSea' }) === 'NEEDS_RECONCILIATION' && C.seguridadDeRestauracion({}) === 'NEEDS_RECONCILIATION');

  /* Si algo se ejecutó al restaurar, aparecerá un documento que la copia no traía. */
  const o = huellas(mundo());
  const conEfecto = mundo();
  conEfecto.notifications = [{ ruta: 'notifications/n1', datos: { userId: 'cuentaA' } }];
  conEfecto.users = [...conEfecto.users, { ruta: 'users/nuevo', datos: { uid: 'nuevo' } }];
  const efectos = C.efectosLaterales(C.compararHuellas(o, huellas(conEfecto)));
  check('37) un documento que aparece de la nada se ve como efecto lateral', efectos.find((e) => e.ruta === 'users')?.documentos.join() === 'users/nuevo');
  check('38) y están nombradas las colecciones que en producción tienen disparador, que son las que hay que mirar',
    C.COLECCIONES_CON_DISPARADOR.includes('users') && C.COLECCIONES_CON_DISPARADOR.includes('notifications') && C.COLECCIONES_CON_DISPARADOR.length === 3);
  check('39) sin efectos, la lista está vacía', C.efectosLaterales(C.compararHuellas(o, huellas(mundo()))).length === 0);
}

console.log('\n── F · Lo que nunca se imprime ──');
{
  const PROHIBIDOS = ['passwordHash', 'passwordSalt', 'apiKey', 'token', 'refreshToken', 'secret', 'password', 'cvv', 'email', 'phoneNumber'];
  check('40) contraseñas, claves, tokens y datos personales no se imprimen nunca', PROHIBIDOS.every((c) => !C.sePuedeImprimir(c)));
  check('41) da igual cómo se escriban', !C.sePuedeImprimir('APIKEY') && !C.sePuedeImprimir('Email') && !C.sePuedeImprimir('PasswordHash'));
  check('42) y lo que sí se puede imprimir se puede imprimir', ['accountId', 'entityId', 'status', 'createdAt'].every((c) => C.sePuedeImprimir(c)));
}

console.log('\n── G · Estructura ──');
{
  const CORE = 'functions/src/core/backup.ts';
  const codigo = sinComentarios(leer(CORE));
  /* Los dominios de `ALMACENES_DE_BYTES` son DATOS —`firebasestorage.app`, `res.cloudinary.com`—, no dependencias: se miran los imports y las llamadas. */
  const codigoSinDominios = codigo.replace(/dominio: '[^']*'/g, "dominio: ''");
  check('43) el contrato es Core: ni Firebase, ni red, ni disco, ni reloj, ni dados',
    !/from ['"](firebase|@google|node:)|require\(|fetch\(|axios/.test(codigoSinDominios) && !/Date\.now\(|Math\.random\(|new Date\(/.test(codigo));
  check('44) ni sabe de cubos, ni de proyectos, ni de regiones: eso es infraestructura y cambia', !/gs:\/\/|bucket|gcloud|us-central|nam5|projects\//i.test(codigoSinDominios));
  check('44b) y el fuente sigue siendo TEXTO: ni un byte de control crudo, que rompe git y grep',
    ![...leer(CORE)].some((ch) => { const n = ch.charCodeAt(0); return (n < 32 && n !== 9 && n !== 10 && n !== 13) || n === 127; }));
  check('45) y solo importa del propio Core', [...codigo.matchAll(/from ['"]([^'"]+)['"]/g)].every(([, d]) => d.startsWith('./')));
  check('46) la huella la calcula quien tenga criptografía: el Core recibe el puerto, no lo implementa',
    /hash: Huella/.test(leer(CORE)) && !/sha256|createHash|md5/.test(codigo));
  check('47) reutiliza el MISMO puerto de hash que la moderación: dos formas de pedir un hash serían dos algoritmos',
    /import \{ Huella \} from '\.\/moderation';/.test(leer(CORE)));
  const herramienta = sinComentarios(leer('scripts/copias.mjs'));
  check('48) la herramienta NO puede restaurar sobre producción: está escrito, y dos veces',
    /if \(proyecto === PRODUCCION\) PARAR/.test(herramienta) && /DESTINOS_PROHIBIDOS\.has/.test(herramienta)
    && /baseId === '\(default\)'/.test(herramienta));
  check('49) tampoco escribe en producción al verificar: leer y comparar es todo lo que hace',
    !/\.set\(|\.update\(|\.delete\(/.test(herramienta.split("if (orden === 'romper')")[0].split("if (orden === 'huella')")[1] || ''));
  check('50) y no es parte de la aplicación: ninguna Function la importa',
    !/wee-backup/.test(leer('functions/src/index.ts')) && !fs.readdirSync(path.resolve(RAIZ, 'functions/src')).some((f) => f === 'backup'));
  check('51) la documentación existe y NO promete lo que no se midió',
    fs.existsSync(path.resolve(RAIZ, 'docs/BACKUP.md')) && !/zero data loss|instant recovery|near zero|pérdida cero/i.test(leer('docs/BACKUP.md')));
  check('52) esta suite está en la cadena de `npm test`', leer('functions/package.json').includes('node test/backup.test.mjs'));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
