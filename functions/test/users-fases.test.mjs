/*
 * EL CIERRE DE `users` NO PUEDE ADELANTARSE (correcciones 1–5, 2026-10-07).
 *
 * Determinista, sin red ni credenciales. Fija que:
 *   A. `firestore.rules` es la FASE 1: deja la lectura de `users` como en producción (entre las marcas) y trae lo
 *      demás (publicProfiles, fecha 18+ fija, país fijo); la FASE 2 vive en ops/despliegue/reglas/ y se compone.
 *   B. `ops/permitido.mjs` (`decidir`, que usan el workflow de despliegue y el Guardian) BLOQUEA publicar unas reglas
 *      que cierren `users` mientras `ops/produccion.json` no demuestre el espejo desplegado, el relleno verificado y
 *      el cliente nuevo. Cada condición, por separado, basta para bloquear. Las de fase 1 pasan.
 *   C. el CLI lee las reglas DEL CANDIDATO (git show) y el Guardian se las pasa; el espejo se puede desplegar solo.
 *   D. la CI ejecuta las pruebas de emulador de la auditoría de edades y del relleno (las descubre sola) y
 *      `publicProfiles` está clasificada en core/backup.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const imp = (r) => import(pathToFileURL(path.join(RAIZ, r)).href);
const C = await imp('ops/despliegue/cierre-users.mjs');
const { decidir } = await imp('ops/permitido.mjs');
const plan = await imp('ops/despliegue/plan.mjs');
const { comandoDeSuite } = await imp('functions/test/_emuladores.mjs');

let ok = 0; let mal = 0;
const check = (n, c, extra = '') => { if (c) { ok++; console.log(`✔ ${n}`); } else { mal++; console.log(`✘ ${n} ${extra}`); } };

const fase1 = leer('firestore.rules');
const fase2 = C.componerFase2(fase1, leer(C.RUTA_FASE_2));
const manifiesto = JSON.parse(leer('ops/produccion.json'));
const siempre = () => true;
const SHA = 'a'.repeat(40);

/* ── A. Las dos fases ── */
check('1) firestore.rules (fase 1) deja leer users como en producción', C.lecturaDeUsersAbierta(fase1) === true);
check('2) …con el bloque marcado UNA sola vez', fase1.split(C.MARCA_INICIO).length === 2 && fase1.split(C.MARCA_FIN).length === 2);
check('3) la fase 2 compuesta cierra users (get/list del dueño) y no deja `allow read: if true` en su bloque',
  C.lecturaDeUsersAbierta(fase2) === false && /allow get: if isAuthenticated\(\) &&/.test(fase2) && /allow list: if isAuthenticated\(\) && esCaraDeLaCuenta/.test(fase2) && !fase2.includes(C.MARCA_INICIO));
check('4) fuera de ese bloque, las dos fases son idénticas (la fase 2 no trae nada más)',
  fase1.slice(0, fase1.indexOf(C.MARCA_INICIO)).trimEnd() === fase2.slice(0, fase1.indexOf(C.MARCA_INICIO)).trimEnd()
  && fase1.slice(fase1.indexOf(C.MARCA_FIN) + C.MARCA_FIN.length) === fase2.slice(fase2.length - (fase1.length - fase1.indexOf(C.MARCA_FIN) - C.MARCA_FIN.length)));
check('5) la fase 1 ya trae lo demás: publicProfiles (write false), fecha 18+ fija y país fijo',
  /match \/publicProfiles\/\{perfilId\} \{[\s\S]*?allow write: if false;/.test(fase1) && /function fechaDeNacimientoFija\(\)/.test(fase1)
  && /fechaDeNacimientoAdulta\(request\.resource\.data\.birthDate\)/.test(fase1) && /paisFijo\(\) &&/.test(fase1));
check('6) componer sin marcas (o con dos) falla: no se adivina dónde va el cierre',
  (() => { try { C.componerFase2('sin marcas', 'x'); return false; } catch { return true; } })()
  && (() => { try { C.componerFase2(`${C.MARCA_INICIO}\n${C.MARCA_FIN}\n${C.MARCA_INICIO}`, 'x'); return false; } catch { return true; } })());
check('7) lectura comentada, solo `get: if true`, o sin bloque users → se trata como CERRADA (falla cerrada)',
  !C.lecturaDeUsersAbierta('match /users/{userId} {\n // allow read: if true;\n}')
  && !C.lecturaDeUsersAbierta('match /users/{userId} {\n allow get: if true;\n}')
  && !C.lecturaDeUsersAbierta('match /posts/{p} { allow read: if true; }')
  && C.lecturaDeUsersAbierta('match /users/{userId} {\n allow get, list: if true;\n match /private/{d} { }\n}'));
check('8) una lectura abierta DENTRO de una subcolección no cuenta como lectura de users',
  !C.lecturaDeUsersAbierta('match /users/{userId} {\n allow get: if false;\n match /bookmarks/{b} { allow read: if true; }\n}'));

/* ── B. El bloqueo ── */
const conRules = (reglas, m = manifiesto, contiene = siempre) => decidir({ manifiesto: m, otros: ['firestore:rules'], contiene, candidato: 'HEAD', reglas });
const r1 = conRules(fase1);
check('9) las reglas de FASE 1 se pueden publicar hoy (no cierran users)', r1.permitido && !r1.bloqueos.some((b) => /users/.test(b)), JSON.stringify(r1));
const r2 = conRules(fase2);
check('10) las de FASE 2, con el mapa de HOY, quedan BLOQUEADAS por las tres condiciones',
  !r2.permitido && r2.bloqueos.filter((b) => /cierran la lectura de users/.test(b)).length === 3, r2.bloqueos.join(' | '));
const listo = JSON.parse(JSON.stringify(manifiesto));
listo.funciones.push({ funcion: 'espejoDelPerfilPublico', revision: 'espejodelperfilpublico-00001-abc', commit: SHA });
listo.cierreDeUsers = { relleno: { verificado: true, fecha: '2026-10-08', users: 15, publicProfiles: 15 }, cliente: { web: SHA, nativoMinimo: '1.4.0' } };
check('11) con las tres condiciones demostradas, la fase 2 se puede publicar', conRules(fase2, listo).permitido, JSON.stringify(conRules(fase2, listo).bloqueos));
const sin = (cambiar) => { const m = JSON.parse(JSON.stringify(listo)); cambiar(m); return conRules(fase2, m); };
check('12) sin el espejo desplegado → bloqueada', !sin((m) => { m.funciones = m.funciones.filter((f) => f.funcion !== 'espejoDelPerfilPublico'); }).permitido);
check('13) relleno no verificado, con recuentos distintos o vacío → bloqueada',
  !sin((m) => { m.cierreDeUsers.relleno.verificado = false; }).permitido
  && !sin((m) => { m.cierreDeUsers.relleno.publicProfiles = 14; }).permitido
  && !sin((m) => { m.cierreDeUsers.relleno = { verificado: true, fecha: 'x', users: 0, publicProfiles: 0 }; }).permitido);
check('14) sin cliente nuevo (web o versión nativa mínima) → bloqueada',
  !sin((m) => { delete m.cierreDeUsers.cliente.nativoMinimo; }).permitido && !sin((m) => { m.cierreDeUsers.cliente.web = 'abc'; }).permitido);
check('15) si el hosting web vivo no contiene el cliente nuevo → bloqueada', !conRules(fase2, listo, (a, b) => !(a === SHA)).permitido);
const r16 = decidir({ manifiesto, otros: ['firestore:rules'], contiene: siempre, candidato: 'HEAD' });
check('16) sin las reglas del candidato no se decide (desconocido, no permitido)', !r16.permitido && r16.desconocido.some((d) => /reglas del candidato/.test(d)));
check('17) los índices no se ven afectados por el cierre', decidir({ manifiesto, otros: ['firestore:indexes'], contiene: siempre, candidato: 'HEAD' }).permitido);

/* ── C. Quién lo aplica ── */
const permitido = leer('ops/permitido.mjs');
check('18) el CLI de permitido lee firestore.rules DEL CANDIDATO (git show <commit>:firestore.rules) y se lo pasa a decidir',
  /\['show', `\$\{candidato\}:firestore\.rules`\]/.test(permitido) && /candidato, reglas, grupos \}\)/.test(permitido));
check('19) el workflow de despliegue verifica con permitido.mjs (cli.mjs verificar) y el Guardian le pasa las reglas',
  /ops\/permitido\.mjs/.test(leer('ops/despliegue/cli.mjs')) && /cli\.mjs verificar/.test(leer('.github/workflows/despliegue.yml'))
  && /reglas: ctx\.leer\('firestore\.rules'\)/.test(leer('ops/harness/guardian.mjs')));
const gruposDespliegue = JSON.parse(leer('ops/despliegue/grupos.json'));
const espejo = decidir({ manifiesto, funciones: ['espejoDelPerfilPublico'], contiene: siempre, candidato: 'HEAD', grupos: gruposDespliegue });
check('20) el espejo es desplegable SOLO como su primer despliegue declarado (f2-1-espejo, paso 1) y el aviso dice el paso siguiente',
  plan.leerObjetivo('functions:espejoDelPerfilPublico').errores.length === 0 && espejo.permitido && espejo.avisos.some((a) => /primera vez/.test(a))
  && espejo.avisos.some((a) => /f2-1-espejo .*paso 1\)\. Después: 2\. Verificar el espejo/.test(a)));
const g20 = gruposDespliegue.primeros_despliegues.find((g) => g.id === 'f2-1-espejo');
check('20b) mezclado con otra función, con las reglas o con el Hosting, el primer despliegue del espejo se BLOQUEA',
  !decidir({ manifiesto, funciones: ['espejoDelPerfilPublico', 'votePoll'], contiene: siempre, candidato: 'HEAD', grupos: gruposDespliegue }).permitido
  && !decidir({ manifiesto, funciones: ['espejoDelPerfilPublico'], otros: ['firestore:rules'], reglas: fase1, contiene: siempre, candidato: 'HEAD', grupos: gruposDespliegue }).permitido
  && !decidir({ manifiesto, funciones: ['espejoDelPerfilPublico'], otros: ['hosting:wee-app'], contiene: siempre, candidato: 'HEAD', grupos: gruposDespliegue }).permitido);
check('20c) la secuencia de la fase 2 está escrita en orden (espejo → verificar → relleno autorizado → users == publicProfiles → clientes → tres condiciones → cierre)',
  g20.secuencia.length === 7 && [/^1\. Desplegar el espejo/, /^2\. Verificar el espejo/, /^3\. Relleno con autorización EXPLÍCITA/, /^4\. Verificar users == publicProfiles > 0/, /^5\. Publicar los clientes/, /^6\. Comprobar las tres condiciones/, /^7\. Solo entonces .*users-cierre\.fase2\.rules/]
    .every((re, i) => re.test(g20.secuencia[i])));
check('21) el mapa de HOY no declara el cierre (nadie ha afirmado espejo, relleno ni cliente)', !manifiesto.cierreDeUsers
  && !manifiesto.funciones.some((f) => f.funcion === 'espejoDelPerfilPublico'));

/* ── E. Notas LOW de la ronda 2: comentarios de bloque y el orden en decidir ── */
const U = (cuerpo) => `service cloud.firestore {\n match /databases/{database}/documents {\n  match /users/{userId} {\n${cuerpo}\n  }\n }\n}`;
check('N1-A) un `allow read: if true;` REAL en el bloque users → abierta', C.estadoDeLecturaDeUsers(U('   allow read: if true;')).estado === 'abierta');
check('N1-B) dentro de `//` no engaña (cerrada)', C.estadoDeLecturaDeUsers(U('   // allow read: if true;\n   allow read: if isOwner(userId);')).estado === 'cerrada');
check('N1-C) dentro de `/* */` (en una línea o en varias) no engaña (cerrada)',
  C.estadoDeLecturaDeUsers(U('   /* allow read: if true; */\n   allow read: if isOwner(userId);')).estado === 'cerrada'
  && C.estadoDeLecturaDeUsers(U('   /*\n    allow read: if true;\n   */\n   allow get: if false;')).estado === 'cerrada');
check('N1-C2) unas reglas que cierran users con la lectura abierta escondida en /* */ quedan BLOQUEADAS sin las condiciones',
  !conRules(U('   /* allow read: if true; */\n   allow read: if false;')).permitido);
check('N1-D) multilínea mezclado: comentarios de bloque y de línea entre reglas reales se leen bien',
  C.estadoDeLecturaDeUsers(U('   /* cabecera\n      de varias líneas */\n   allow create: if false; // nota\n   allow get, /* x */ list: if true;\n   match /private/{d} { /* */ allow read: if true; }')).estado === 'abierta'
  && C.estadoDeLecturaDeUsers(U('   allow get: if true; /* allow list: if true; */\n   // allow list: if true;\n   allow list: if false;')).estado === 'cerrada');
check('N1-D2) un `//` o un `/*` DENTRO de una cadena no abre comentario (la regla que sigue cuenta)',
  C.estadoDeLecturaDeUsers(U("   allow update: if request.resource.data.web.matches('https?://.*/*');\n   allow read: if true;")).estado === 'abierta'
  && C.estadoDeLecturaDeUsers(U('   allow update: if request.resource.data.x == "//";\n   allow read: if true;')).estado === 'abierta');
const malformadas = [
  ['comentario de bloque sin cerrar', U('   /* allow read: if false;\n   allow read: if true;')],
  ['apertura anidada', U('   /* a /* b */ allow read: if true; */')],
  ['cierre suelto', U('   allow read: if true; */')],
  ['cadena sin cerrar', U("   allow update: if x == 'abc;\n   allow read: if true;")],
  ['llaves desequilibradas', `${U('   allow read: if true;')}\n}`],
  ['L1: users anidado en otra colección, sin users de primer nivel', 'service cloud.firestore {\n match /databases/{database}/documents {\n  match /groups/{g} { match /users/{userId} { allow read: if true; } }\n }\n}'],
  ['L1: users anidado en otra colección + users de primer nivel cerrado', 'service cloud.firestore {\n match /databases/{database}/documents {\n  match /users/{userId} { allow read: if false; }\n  match /groups/{g} { match /users/{userId} { allow read: if true; } }\n }\n}'],
  ['L1: anidado tras una cadena con llaves en el match padre', "service cloud.firestore {\n match /databases/{database}/documents {\n  match /groups/{g} {\n   allow read: if resource.data.x == '}{';\n   match /users/{userId} { allow get, list: if true; }\n  }\n }\n}"],
  ['L1: users dentro de un segundo envoltorio documents', 'service cloud.firestore {\n match /databases/{database}/documents {\n  match /databases/{database}/documents {\n   match /users/{userId} { allow read: if true; }\n  }\n }\n}'],
  ['dos bloques users (ambiguo)', `${U('   allow read: if true;')}\nmatch /users/{userId} { allow read: if false; }`],
];
check('N1-E) malformado o ambiguo → «malformada», nunca abierta', malformadas.every(([, r]) => C.estadoDeLecturaDeUsers(r).estado === 'malformada' && !C.lecturaDeUsersAbierta(r)),
  malformadas.filter(([, r]) => C.estadoDeLecturaDeUsers(r).estado !== 'malformada').map(([x]) => x).join(','));
check('N1-E2) y se BLOQUEA aunque el mapa demuestre las tres condiciones (fail-closed)',
  malformadas.every(([, r]) => { const d = conRules(r, listo); return !d.permitido && d.bloqueos.some((b) => /no se pueden interpretar las reglas/.test(b)); }));
check('N1-F) las reglas reales de fase 1 y fase 2 se interpretan sin ambigüedad',
  C.normalizarReglas(fase1).ok && C.normalizarReglas(fase2).ok && C.estadoDeLecturaDeUsers(fase1).estado === 'abierta' && C.estadoDeLecturaDeUsers(fase2).estado === 'cerrada');

const sinFirestore = (m) => { const x = JSON.parse(JSON.stringify(m)); x.otros = (x.otros || []).filter((o) => o.desplegable !== 'firestore'); return x; };
const n2a = conRules(fase2);
check('N2-A) firestore presente + condiciones no cumplidas → BLOQUEADO', !n2a.permitido && n2a.bloqueos.some((b) => /cierran la lectura de users/.test(b)));
const n2b = conRules(fase2, sinFirestore(listo));
check('N2-B) entrada firestore AUSENTE → BLOQUEADO (antes: aviso + continue), incluso con fase 1 y con las condiciones',
  !n2b.permitido && n2b.bloqueos.some((b) => /no trae la entrada de firestore/.test(b))
  && !conRules(fase1, sinFirestore(manifiesto)).permitido
  && !n2b.avisos.some((a) => /firestore:rules: no está en el mapa/.test(a)));
const n2c = conRules(fase2, sinFirestore(manifiesto));
check('N2-C) mapa incompleto (sin firestore y sin cierreDeUsers) o ilegible → BLOQUEADO, y el cierre se evalúa igualmente',
  !n2c.permitido && n2c.bloqueos.filter((b) => /cierran la lectura de users/.test(b)).length === 3
  && !conRules(fase2, { otros: [] }).permitido && !conRules(fase1, null).permitido && !conRules(fase1, []).permitido);
const n2d = decidir({ manifiesto: sinFirestore(listo), otros: ['firestore:rules'], contiene: siempre, candidato: 'HEAD' });
check('N2-D) reglas ilegibles (o ininterpretables) → no permitido, con o sin la entrada firestore',
  !n2d.permitido && n2d.desconocido.length > 0 && !conRules(malformadas[0][1], listo).permitido && !conRules(malformadas[0][1], sinFirestore(listo)).permitido);
check('N2-E) todo cumplido (entrada viva + espejo + relleno + cliente) → PERMITIDO', conRules(fase2, listo).permitido);
check('N2-F) el espejo solo sigue permitido por su regla de primer despliegue', espejo.permitido);
check('N2-G) espejo + otra función sigue BLOQUEADO',
  !decidir({ manifiesto, funciones: ['espejoDelPerfilPublico', 'votePoll'], contiene: siempre, candidato: 'HEAD', grupos: gruposDespliegue }).permitido);
const viva = manifiesto.funciones[0].funcion;
const n2h = decidir({ manifiesto, funciones: [viva], otros: ['firestore:indexes', 'storage'], contiene: siempre, candidato: 'HEAD', grupos: gruposDespliegue });
const n2h2 = decidir({ manifiesto: sinFirestore(manifiesto), otros: ['firestore:indexes'], contiene: siempre, candidato: 'HEAD' });
check('N2-H) los grupos normales no cambian: función viva + índices + storage permitido; índices sin entrada = solo aviso (como antes)',
  n2h.permitido && n2h2.permitido && n2h2.avisos.some((a) => /firestore:indexes: no está en el mapa/.test(a)), JSON.stringify(n2h.bloqueos));

/* ── D. CI y copia ── */
for (const [n, suite] of [['22', 'auditoria-edades.emulator.mjs'], ['23', 'relleno-perfiles.emulator.mjs'], ['24', 'users-privado.emulator.mjs']]) {
  const cmd = comandoDeSuite(leer(`functions/test/${suite}`));
  check(`${n}) la CI (y ci-local, que lee ci.yml) ejecuta ${suite}: _emuladores.mjs la descubre y su cabecera es lanzable en demo-*`,
    !cmd.error && cmd.proyecto.startsWith('demo-') && /node functions\/test\/_emuladores\.mjs/.test(leer('.github/workflows/ci.yml')), JSON.stringify(cmd));
}
const backup = require(path.join(RAIZ, 'functions/lib/core/backup.js'));
const clase = backup.CLASIFICACION_DE_DATOS.publicProfiles;
check('25) publicProfiles está clasificada en core/backup.ts como DERIVED, reconstruible desde users con el relleno',
  clase?.criticidad === 'DERIVED' && /users/.test(clase.seReconstruyeDesde || '') && /rellenar-perfiles-publicos/.test(clase.seReconstruyeDesde || ''));

console.log(`\n${ok} ✔ · ${mal} ✘`);
process.exitCode = mal ? 1 : 0;
