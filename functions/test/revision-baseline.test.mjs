/*
 * LA BASELINE DEL REVISOR DE WEË — `ops/revision/baseline.mjs` + `clasificacion.mjs` (docs/REVISION.md, capa 3).
 *
 * Se fija, con hallazgos sintéticos y con un mini repositorio git temporal:
 *   1. los ocho estados: PREEXISTENTE, NUEVO, NUEVA REGLA (regla posterior y código viejo), CORREGIDO,
 *      REAPARECIDO, ACEPTADO COMO DEUDA, INCIERTO, FALSO POSITIVO; el «delta de any»; el emparejado por huella;
 *   2. lo de una AUDITORÍA no pasa solo a CORREGIDO;
 *   3. la puerta: NUEVO alto o bloqueante, REAPARECIDO o higiene → 1; si no → 0;
 *   4. el validador rechaza un ACEPTADO COMO DEUDA incompleto, un INCIERTO sin pregunta, un FALSO POSITIVO sin
 *      motivo y un estado sin decidir;
 *   5. la PROPUESTA: nunca sobre la baseline vigente, nunca con alcance parcial, y lo que pide decisión va a
 *      `pendientes` (no se cuela como PREEXISTENTE);
 *   6. SABOTAJE: con la clasificación rota a propósito, las comprobaciones FALLAN.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const temporales = [];
const importarDe = (raiz, rel) => import(pathToFileURL(path.join(raiz, rel)).href);
const K = await importarDe(RAIZ, 'ops/revision/clasificacion.mjs');
const { versionesDeReglas } = await importarDe(RAIZ, 'ops/revision/reglas.mjs');

/* ── hallazgos y baseline sintéticos ────────────────────────────────────── */

const huella = (s) => s.padEnd(64, '0').slice(0, 64);
const H = (regla, ruta, ancla, { severidad = 'media', h = huella(ancla), cuenta, relacionados } = {}) => ({
  id: `${regla}/${ruta}#${ancla}`, regla, severidad, mensaje: `${regla} en ${ruta}`, huella: h, ancla,
  evidencia: { ruta, linea: 3, fragmento: '…' }, ...(cuenta !== undefined ? { cuenta } : {}), ...(relacionados ? { relacionados } : {}),
});
const E = (hallazgo, estado, extra = {}) => ({
  id: hallazgo.id, regla: hallazgo.regla, estado, severidad: hallazgo.severidad, huella: hallazgo.huella, origen: 'detector',
  titulo: hallazgo.mensaje, desde: '2026-10-01', ...(hallazgo.cuenta !== undefined ? { cuenta: hallazgo.cuenta } : {}), ...extra,
});

const preexistente = H('errores/catch-traga', 'services/a.ts', 'f');
const corregido = H('errores/catch-traga', 'services/b.ts', 'g');
const reaparece = H('web/alert-con-botones', 'components/C.tsx', 'C', { severidad: 'alta' });
const deuda = H('escala/consulta-sin-limite', 'services/d.ts', 'todas');
const incierto = H('i18n/texto-a-mano-fuera-de-pantallas', 'utils/e.ts', 'avisar');
const falso = H('higiene/import-sin-seguimiento', 'scripts/f.mjs', '(modulo)', { severidad: 'bloqueante' });
const anyViejo = H('tipos/any', 'utils/t.ts', '(archivo)', { cuenta: 2 });
const renombrado = H('errores/catch-traga', 'services/h.ts', 'viejoNombre', { h: huella('mismo-fragmento') });
const auditoria = {
  id: 'auditoria/credits-doble-cobro/functions/src/credits/x.ts#reservar', regla: 'auditoria/credits-doble-cobro', estado: 'INCIERTO',
  severidad: 'alta', origen: 'auditoria-2026-10-01', titulo: 'posible doble cobro al reintentar', desde: '2026-10-01',
  pregunta: '¿el reintento reutiliza el requestId?',
};
const DEUDA = { motivo: 'colección pequeña por contrato', responsable: 'geovet', fecha: '2026-10-01', revisar_en: '2027-01-01', referencia: 'docs/CREDITS.md' };

const reglas = versionesDeReglas();
delete reglas['react/intervalo-sin-limpieza']; // una regla que «entró después» de esta baseline
const baseline = {
  version: 1, corte: 'abc1234', generado: '2026-10-01T00:00:00Z', reglas,
  entradas: [
    E(preexistente, 'PREEXISTENTE'),
    E(corregido, 'PREEXISTENTE'),
    E(reaparece, 'CORREGIDO', { fecha: '2026-09-30' }),
    E(deuda, 'ACEPTADO COMO DEUDA', DEUDA),
    E(incierto, 'INCIERTO', { pregunta: '¿es un mensaje para la persona o un registro interno?' }),
    E(falso, 'FALSO POSITIVO', { motivo: 'lo genera el build' }),
    E(anyViejo, 'PREEXISTENTE'),
    E(renombrado, 'PREEXISTENTE'),
    auditoria,
  ],
};

const nuevoAlto = H('web/alert-con-botones', 'components/N.tsx', 'N', { severidad: 'alta' });
const nuevoMedio = H('errores/catch-traga', 'services/m.ts', 'm');
const codigoViejo = H('errores/catch-traga', 'services/viejo.ts', 'antiguo');
const reglaPosterior = H('react/intervalo-sin-limpieza', 'hooks/useN.ts', 'useN');
const higieneNueva = H('higiene/import-sin-seguimiento', 'utils/i.ts', '(modulo)', { severidad: 'bloqueante' });
const cicloPorOtro = H('ciclos/import-ciclico', 'src/a.ts', '(ciclo)', { relacionados: ['src/a.ts', 'src/b.ts'] });
const cambiados = new Set(['components/N.tsx', 'services/m.ts', 'hooks/useN.ts', 'utils/i.ts', 'utils/t.ts', 'src/b.ts']);

const hoy = [
  preexistente, reaparece, deuda, incierto, falso,
  { ...anyViejo, cuenta: 3 },
  { ...renombrado, id: 'errores/catch-traga/services/h.ts#nuevoNombre', ancla: 'nuevoNombre' },
  nuevoAlto, nuevoMedio, codigoViejo, reglaPosterior, higieneNueva, cicloPorOtro,
];

const estadosDe = (c) => Object.fromEntries(c.resultados.map((r) => [r.id, r.estado]));

/** Las comprobaciones como funciones del módulo de clasificación: el sabotaje las vuelve a correr. */
const pruebas = {
  reaparecido: (M) => estadosDe(M.clasificar(hoy, baseline, { cambiados }))[reaparece.id] === 'REAPARECIDO',
  auditoria: (M) => {
    const c = M.clasificar(hoy, baseline, { cambiados });
    const a = c.ausentes.find((x) => x.entrada.id === auditoria.id);
    return a && a.estado === 'INCIERTO' && a.nuevoCorregido === false;
  },
  aceptadoIncompleto: (M) => {
    const roto = structuredClone(baseline);
    delete roto.entradas.find((e) => e.estado === 'ACEPTADO COMO DEUDA').responsable;
    return M.validarBaseline(roto).some((e) => /ACEPTADO COMO DEUDA exige responsable/.test(e));
  },
  puertaHigiene: (M) => M.clasificar([higieneNueva], { ...baseline, entradas: [] }, { cambiados: new Set() }).puerta.codigo === 1,
};

const c = K.clasificar(hoy, baseline, { cambiados });
const est = estadosDe(c);
check('1) PREEXISTENTE: el id está en la baseline con ese estado', est[preexistente.id] === 'PREEXISTENTE');
check('2) CORREGIDO: lo que estaba y ya no aparece', c.ausentes.some((a) => a.entrada.id === corregido.id && a.estado === 'CORREGIDO' && a.nuevoCorregido));
check('3) REAPARECIDO: estaba CORREGIDO y ha vuelto', pruebas.reaparecido(K));
check('4) ACEPTADO COMO DEUDA, INCIERTO y FALSO POSITIVO se conservan',
  est[deuda.id] === 'ACEPTADO COMO DEUDA' && est[incierto.id] === 'INCIERTO' && est[falso.id] === 'FALSO POSITIVO');
check('5) NUEVO: no estaba y su archivo cambió desde el corte', est[nuevoAlto.id] === 'NUEVO' && est[nuevoMedio.id] === 'NUEVO');
check('6) NUEVA REGLA: código anterior al corte que una regla conocida ve por primera vez', est[codigoViejo.id] === 'NUEVA REGLA');
check('7) NUEVA REGLA: la regla no estaba en `reglas` de la baseline (entró después), aunque el archivo cambió', est[reglaPosterior.id] === 'NUEVA REGLA');
check('8) un hallazgo entre varios archivos (un ciclo) es NUEVO si cambió cualquiera de sus archivos relacionados', est[cicloPorOtro.id] === 'NUEVO');
check('9) delta de any: con baseline, solo es NUEVO si la cuenta SUBE (2 → 3)', est[anyViejo.id] === 'NUEVO' && /de 2 a 3/.test(c.resultados.find((r) => r.id === anyViejo.id).porque));
const bajaAny = K.clasificar([{ ...anyViejo, cuenta: 1 }], baseline, { cambiados });
check('10) …y si baja o se queda, sigue con su estado (PREEXISTENTE)', bajaAny.resultados[0].estado === 'PREEXISTENTE');
const ren = c.resultados.find((r) => r.id === 'errores/catch-traga/services/h.ts#nuevoNombre');
check('11) si el id cambió pero la huella es la misma (misma regla y archivo), se empareja: estado de la baseline y baselineState «updated»',
  ren?.estado === 'PREEXISTENTE' && ren.baselineState === 'updated' && !c.ausentes.some((a) => a.entrada.id === renombrado.id && a.nuevoCorregido));
check('12) lo de AUDITORÍA no pasa solo a CORREGIDO: se queda con su estado y pide cierre explícito', pruebas.auditoria(K));
check('13) la puerta: NUEVO alto, REAPARECIDO e higiene → 1, con los motivos',
  c.puerta.codigo === 1 && c.puerta.motivos.some((m) => m.includes(nuevoAlto.id)) && c.puerta.motivos.some((m) => m.startsWith('REAPARECIDO'))
  && c.puerta.motivos.some((m) => m.includes(higieneNueva.id)) && !c.puerta.motivos.some((m) => m.includes(nuevoMedio.id)), c.puerta.motivos.join(' | '));
check('14) un FALSO POSITIVO decidido de higiene no bloquea; un NUEVO medio tampoco',
  !c.puerta.motivos.some((m) => m.includes(falso.id))
  && K.clasificar([nuevoMedio, falso], baseline, { cambiados }).puerta.codigo === 0);
check('15) la higiene bloquea en cualquier otro estado (también como NUEVA REGLA)', pruebas.puertaHigiene(K));
check('16) si no se sabe qué cambió desde el corte (corte inexistente), lo no conocido cuenta como NUEVO (conservador)',
  K.clasificar([codigoViejo], baseline, { cambiados: null }).resultados[0].estado === 'NUEVO');
const parcial = K.clasificar([preexistente], baseline, { cambiados, reglasActivas: new Set(['errores/catch-traga']), archivos: new Set(['services/a.ts']) });
check('17) una pasada parcial (--solo/--archivos) no da por corregido lo que no miró',
  parcial.ausentes.filter((a) => a.nuevoCorregido).length === 0 && parcial.ausentes.every((a) => a.estado === baseline.entradas.find((e) => e.id === a.entrada.id).estado));
check('18) el recuento por estado cubre los ocho estados', K.ESTADOS.length === 8 && K.ESTADOS.every((s) => typeof c.porEstado[s] === 'number') && c.porEstado.CORREGIDO >= 1);

/* ── el validador ───────────────────────────────────────────────────────── */

check('19) una baseline completa es válida', K.validarBaseline(baseline).length === 0, K.validarBaseline(baseline).join(' | '));
check('20) ACEPTADO COMO DEUDA sin responsable no valida', pruebas.aceptadoIncompleto(K));
const conCampoQueFalta = (estado, campo) => {
  const b = structuredClone(baseline);
  delete b.entradas.find((e) => e.estado === estado)[campo];
  return K.validarBaseline(b);
};
check('21) ACEPTADO COMO DEUDA exige también motivo, fecha, revisar_en y referencia',
  ['motivo', 'fecha', 'revisar_en', 'referencia'].every((campo) => conCampoQueFalta('ACEPTADO COMO DEUDA', campo).some((e) => e.includes(`exige ${campo}`))));
check('22) INCIERTO sin pregunta y FALSO POSITIVO sin motivo no validan',
  conCampoQueFalta('INCIERTO', 'pregunta').some((e) => /INCIERTO exige pregunta/.test(e)) && conCampoQueFalta('FALSO POSITIVO', 'motivo').some((e) => /FALSO POSITIVO exige motivo/.test(e)));
const sinDecidir = structuredClone(baseline);
sinDecidir.entradas.push({ ...E(nuevoAlto, 'NUEVO') });
const repetida = structuredClone(baseline);
repetida.entradas.push(structuredClone(repetida.entradas[0]));
const malOrigen = structuredClone(baseline);
malOrigen.entradas[0].origen = 'ia';
check('23) en la baseline solo viven estados DECIDIDOS; un id repetido o un origen desconocido tampoco valen',
  K.validarBaseline(sinDecidir).some((e) => /no es un estado decidido/.test(e)) && K.validarBaseline(repetida).some((e) => /id repetido/.test(e))
  && K.validarBaseline(malOrigen).some((e) => /origen/.test(e)));

/* ── la propuesta ───────────────────────────────────────────────────────── */

const propuesta = K.proponerBaseline(c, baseline, { hoy: '2026-10-02' });
const entrada = (id) => propuesta.entradas.find((e) => e.id === id);
const pendiente = (id) => propuesta.pendientes?.some((p) => p.id === id);
check('24) la propuesta es una baseline VÁLIDA', K.validarBaseline(propuesta).length === 0, K.validarBaseline(propuesta).join(' | '));
check('25) NUEVA REGLA y NUEVO medio → PREEXISTENTE (el medio con un motivo que dice cuándo entró)',
  entrada(codigoViejo.id)?.estado === 'PREEXISTENTE' && entrada(reglaPosterior.id)?.estado === 'PREEXISTENTE'
  && entrada(nuevoMedio.id)?.estado === 'PREEXISTENTE' && /NUEVO el 2026-10-02/.test(entrada(nuevoMedio.id)?.motivo || ''));
check('26) NUEVO alto, REAPARECIDO, higiene y una subida de any NO entran como PREEXISTENTE: van a `pendientes`',
  pendiente(nuevoAlto.id) && !entrada(nuevoAlto.id) && pendiente(reaparece.id) && entrada(reaparece.id)?.estado === 'CORREGIDO'
  && pendiente(higieneNueva.id) && !entrada(higieneNueva.id) && pendiente(anyViejo.id) && entrada(anyViejo.id)?.cuenta === 2);
check('27) lo que ya no aparece → CORREGIDO con fecha; lo de auditoría se queda como estaba',
  entrada(corregido.id)?.estado === 'CORREGIDO' && entrada(corregido.id)?.fecha === '2026-10-02' && entrada(auditoria.id)?.estado === 'INCIERTO');
check('28) las decisiones viajan: ACEPTADO COMO DEUDA conserva motivo, responsable, fecha, revisar_en y referencia',
  ['motivo', 'responsable', 'fecha', 'revisar_en', 'referencia'].every((k) => entrada(deuda.id)?.[k] === DEUDA[k]));
const inicial = K.proponerBaseline(c, baseline, { inicial: true, hoy: '2026-10-02' });
check('29) --inicial (la primera, en el corte): todo a PREEXISTENTE salvo la higiene, que sigue pendiente',
  inicial.entradas.find((e) => e.id === nuevoAlto.id)?.estado === 'PREEXISTENTE' && inicial.pendientes.some((p) => p.id === higieneNueva.id));

/* ── de punta a punta: un repositorio y la línea de órdenes ─────────────── */

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-base-'));
temporales.push(dir);
const git = (...args) => {
  const r = spawnSync('git', ['-C', dir, '-c', 'core.autocrlf=false', '-c', 'user.email=revisor@wee.invalid', '-c', 'user.name=revisor', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const escribir = (m) => { for (const [r, t] of Object.entries(m)) { fs.mkdirSync(path.dirname(path.join(dir, r)), { recursive: true }); fs.writeFileSync(path.join(dir, r), t); } };
escribir({
  'services/a.ts': 'export function f(g: () => void) { try { g(); } catch { } }\n',
  'components/Viejo.tsx': "import { Alert } from 'react-native';\nexport function Viejo() { Alert.alert('t', 'm', [{ text: 'ok' }]); }\n",
});
git('init', '-q');
git('add', '-A');
git('commit', '-q', '-m', 'corte');
const corte = git('rev-parse', 'HEAD');
const CLI = path.join(RAIZ, 'ops/revision/baseline.mjs');
const correr = (...args) => spawnSync(process.execPath, [CLI, '--raiz', dir, ...args], { encoding: 'utf8', timeout: 120000 });
const rutaBaseline = path.join(dir, 'ops/revision/baseline.json');

const p0 = correr('--proponer', path.join(dir, 'propuesta.json'), '--inicial', '--corte', corte);
check('30) la primera baseline se PROPONE (--inicial --corte) y la CLI no la aplica sola', p0.status === 0 && fs.existsSync(path.join(dir, 'propuesta.json')) && !fs.existsSync(rutaBaseline), p0.stderr || p0.stdout);
fs.mkdirSync(path.dirname(rutaBaseline), { recursive: true });
fs.copyFileSync(path.join(dir, 'propuesta.json'), rutaBaseline); // aquí, la «persona» que la aplica
check('31) --validar acepta la baseline aplicada', correr('--validar').status === 0);
check('32) sin cambios desde el corte, la puerta pasa (todo PREEXISTENTE)', correr().status === 0);

escribir({ 'components/Nuevo.tsx': "import { Alert } from 'react-native';\nexport function Nuevo() { Alert.alert('t', 'm', [{ text: 'ok' }]); }\n" });
git('add', '-N', 'components/Nuevo.tsx');
const salida = path.join(dir, 'salida.json');
const r1 = correr('--json', salida);
const j1 = JSON.parse(fs.readFileSync(salida, 'utf8'));
const estadoDe = (j, ruta, regla) => j.clasificacion.find((x) => x.evidencia.ruta === ruta && x.regla === regla)?.estado;
check('33) un Alert con botones en un archivo NUEVO (git add -N) es NUEVO alto → la puerta sale con 1; el viejo sigue PREEXISTENTE',
  r1.status === 1 && estadoDe(j1, 'components/Nuevo.tsx', 'web/alert-con-botones') === 'NUEVO' && estadoDe(j1, 'components/Viejo.tsx', 'web/alert-con-botones') === 'PREEXISTENTE',
  r1.stdout);

escribir({
  'components/Nuevo.tsx': "import { Alert } from 'react-native';\nexport function Nuevo() { Alert.alert('t', 'm'); }\n",
  'services/a.ts': 'export function f(g: () => void) { try { g(); } catch (e) { console.error(e); } }\n',
});
const r2 = correr('--json', salida);
const j2 = JSON.parse(fs.readFileSync(salida, 'utf8'));
check('34) corregido el Alert y el catch: la puerta pasa y el catch sale como CORREGIDO',
  r2.status === 0 && j2.porEstado.CORREGIDO === 1 && j2.ausentes.some((a) => a.entrada.regla === 'errores/catch-traga' && a.estado === 'CORREGIDO'), r2.stdout);
const r3 = correr('--proponer', path.join(dir, 'propuesta2.json'));
fs.copyFileSync(path.join(dir, 'propuesta2.json'), rutaBaseline);
escribir({ 'services/a.ts': 'export function f(g: () => void) { try { g(); } catch { } }\n' });
const r4 = correr('--json', salida);
const j4 = JSON.parse(fs.readFileSync(salida, 'utf8'));
check('35) aplicada la propuesta (CORREGIDO) y vuelto el catch vacío: REAPARECIDO y la puerta sale con 1',
  r3.status === 0 && r4.status === 1 && estadoDe(j4, 'services/a.ts', 'errores/catch-traga') === 'REAPARECIDO', r4.stdout);

const antes = fs.readFileSync(rutaBaseline, 'utf8');
const r5 = correr('--proponer', rutaBaseline);
check('36) --proponer se NIEGA a escribir sobre la baseline vigente (sale con 2 y no la toca)', r5.status === 2 && fs.readFileSync(rutaBaseline, 'utf8') === antes);
const r6 = correr('--proponer', path.join(dir, 'p3.json'), '--solo', 'tipos');
check('37) --proponer se niega con un alcance parcial', r6.status === 2 && !fs.existsSync(path.join(dir, 'p3.json')));
const rota = JSON.parse(antes);
rota.entradas.push({ id: 'tipos/any/x.ts#(archivo)', regla: 'tipos/any', estado: 'ACEPTADO COMO DEUDA', severidad: 'media', origen: 'detector', titulo: 'x', desde: '2026-10-01', motivo: 'm' });
fs.writeFileSync(rutaBaseline, JSON.stringify(rota));
check('38) con una baseline no válida (ACEPTADO incompleto), la CLI sale con 2', correr().status === 2 && correr('--validar').status === 2);
fs.writeFileSync(rutaBaseline, antes);

/* ── SABOTAJE ───────────────────────────────────────────────────────────── */

const copiaSaboteada = (archivo, pares) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-sab-'));
  temporales.push(d);
  const destino = path.join(d, 'ops/revision');
  fs.mkdirSync(destino, { recursive: true });
  for (const f of fs.readdirSync(path.join(RAIZ, 'ops/revision'))) if (f.endsWith('.mjs')) fs.copyFileSync(path.join(RAIZ, 'ops/revision', f), path.join(destino, f));
  fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(d, 'node_modules'), 'junction');
  let t = fs.readFileSync(path.join(destino, archivo), 'utf8');
  for (const [a, b] of pares) {
    if (!t.includes(a)) throw new Error(`el sabotaje no encontró: ${a}`);
    t = t.replace(a, b);
  }
  fs.writeFileSync(path.join(destino, archivo), t);
  return d;
};
const sabotajes = [
  ['REAPARECIDO deja de existir', [["if (e.estado === 'CORREGIDO') { estado = 'REAPARECIDO';", "if (false) { estado = 'REAPARECIDO';"]], pruebas.reaparecido],
  ['lo de auditoría pasa solo a CORREGIDO', [['else if (esDeAuditoria(e)) ausentes.push(', 'else if (false) ausentes.push(']], pruebas.auditoria],
  ['el validador deja pasar un ACEPTADO incompleto', [["if (e.estado === 'ACEPTADO COMO DEUDA') {", "if (false) {"]], pruebas.aceptadoIncompleto],
  ['la puerta olvida la higiene', [["if (r.regla.startsWith('higiene/') && r.estado !== 'FALSO POSITIVO')", "if (false)"]], pruebas.puertaHigiene],
];
for (const [nombre, pares, prueba] of sabotajes) {
  const M = await importarDe(copiaSaboteada('clasificacion.mjs', pares), 'ops/revision/clasificacion.mjs');
  let r;
  try { r = prueba(M); } catch { r = false; }
  check(`39) SABOTAJE «${nombre}»: la comprobación correspondiente FALLA`, !r);
}

for (const d of temporales) {
  try { fs.unlinkSync(path.join(d, 'node_modules')); } catch { /* no había unión */ }
  try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* Windows puede retener un archivo */ }
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
