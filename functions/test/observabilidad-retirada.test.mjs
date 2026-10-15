/**
 * LA MARCHA ATRÁS DE LAS ALERTAS — `ops/observabilidad/aplicar.mjs --retirar` (Fase 1, 2026-10-14).
 *
 * Hasta aquí había un `--aplicar` y ningún camino de vuelta: quitar las alertas era borrar a mano. Aquí se prueba la retirada contra un
 * Google Cloud SIMULADO (un proyecto en memoria que entiende las órdenes de gcloud que usa el script), sin red y sin tocar nada real:
 *
 *   A  el ciclo: proyecto vacío → aplicar → todo «igual» → retirar → vacío → volver a aplicar → todo «igual» otra vez.
 *   B  la retirada no se pasa de lista: nunca borra un recurso ajeno (otra política, otra métrica, otra comprobación, otro panel, un
 *      canal de aviso) y, si algo se parece pero no es lo mismo, lo deja y lo dice.
 *   C  el orden: primero las políticas (usan las métricas), las métricas al final.
 *   D  las cerraduras: simula por defecto (solo `list`), ejecutar exige `--ejecutar` y el proyecto escrito otra vez, `--aplicar` y
 *      `--retirar` no se combinan, y si no se pudo leer lo que hay no se borra nada.
 *   E  los fallos: un borrado que falla da salida 1 y no esconde lo que sí se borró; repetir la retirada no hace nada.
 *   F  el código: el borrado solo vive en `ordenesDeRetirada`, que solo acepta acciones «retirar».
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const importar = (p) => import(pathToFileURL(path.join(RAIZ, p)).href);
let fallos = 0;
let n = 0;
const check = (nombre, ok, extra = '') => { n++; process.stdout.write(`${ok ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}\n`); if (!ok) fallos++; };

const A = await importar('ops/observabilidad/aplicar.mjs');
const { LECTURAS } = await importar('ops/observabilidad/verificar.mjs');
const { COMPROBACIONES, PANEL, PROYECTO, metricasDeseadas, politicasDeseadas } = await importar('ops/observabilidad/lanzamiento.mjs');
const CANAL = `projects/${PROYECTO}/notificationChannels/123`;
const json = (x) => JSON.stringify(x);

/* ── Un Google Cloud de mentira: entiende las órdenes que usa aplicar.mjs, guarda lo que se crea y lo devuelve en los `list` ───────── */
const proyectoSimulado = () => {
  const estado = { metricas: new Map(), politicas: new Map(), comprobaciones: new Map(), paneles: new Map() };
  let contador = 100;
  const ejecutadas = [];
  const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
  const error = (stderr) => ({ status: 1, stdout: '', stderr });
  const base = `projects/${PROYECTO}`;
  const archivo = (args, cwd, clave) => JSON.parse(fs.readFileSync(path.join(cwd, args.find((a) => a.startsWith(`--${clave}=`)).split('=')[1]), 'utf8'));
  const ejecutar = (args, cwd) => {
    ejecutadas.push(args);
    for (const [k, lectura] of Object.entries(LECTURAS)) if (json(lectura) === json(args)) return ok(json(k === 'canales' ? [{ name: CANAL, type: 'email', enabled: true, verificationStatus: 'VERIFIED' }] : [...estado[k].values()]));
    const orden = args.filter((a) => !a.startsWith('--')).join(' ');
    const flag = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
    if (/^logging metrics (create|update) /.test(orden)) { const nombre = args[3]; const c = archivo(args, cwd, 'config-from-file'); estado.metricas.set(nombre, { ...c, name: `${base}/metrics/${nombre}` }); return ok(); }
    if (/^logging metrics delete /.test(orden)) { const nombre = args[3]; return estado.metricas.delete(nombre) ? ok() : error(`NOT_FOUND: la métrica ${nombre} no existe`); }
    if (/^beta monitoring policies create/.test(orden)) { const c = archivo(args, cwd, 'policy-from-file'); const id = `${base}/alertPolicies/${++contador}`; estado.politicas.set(id, { ...c, name: id }); return ok(); }
    if (/^beta monitoring policies update /.test(orden)) { const c = archivo(args, cwd, 'policy-from-file'); estado.politicas.set(args[4], { ...c, name: args[4] }); return ok(); }
    if (/^beta monitoring policies delete /.test(orden)) { return estado.politicas.delete(args[4]) ? ok() : error(`NOT_FOUND: ${args[4]}`); }
    if (/^monitoring uptime create /.test(orden)) {
      const host = flag('resource-labels').split(',').find((x) => x.startsWith('host=')).slice(5);
      const id = `${base}/uptimeCheckConfigs/${args[3]}`;
      estado.comprobaciones.set(id, { name: id, displayName: args[3], monitoredResource: { labels: { host } }, httpCheck: { path: flag('path'), acceptedResponseStatusCodes: [{ statusValue: Number(flag('status-codes')) }] } });
      return ok();
    }
    if (/^monitoring uptime delete /.test(orden)) { return estado.comprobaciones.delete(args[3]) ? ok() : error(`NOT_FOUND: ${args[3]}`); }
    if (/^monitoring dashboards create/.test(orden)) { const c = archivo(args, cwd, 'config-from-file'); const id = `${base}/dashboards/${++contador}`; estado.paneles.set(id, { ...c, name: id }); return ok(); }
    if (/^monitoring dashboards delete /.test(orden)) { return estado.paneles.delete(args[3]) ? ok() : error(`NOT_FOUND: ${args[3]}`); }
    return error(`orden desconocida para el simulador: ${args.join(' ')}`);
  };
  const instantanea = () => Object.fromEntries(['metricas', 'politicas', 'comprobaciones', 'paneles'].map((k) => [k, [...estado[k].values()]]));
  const cuantos = () => Object.values(estado).reduce((s, m) => s + m.size, 0);
  return { estado, ejecutar, ejecutadas, instantanea, cuantos };
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wee-retirada-'));
const ejecutarCon = (argv, p, extra = {}) => { const log = []; const codigo = A.principal(argv, { ejecutar: p.ejecutar, log: (x) => log.push(x), dirTemporal: tmp(), ...extra }); return { codigo, salida: log.join('\n') }; };
const todoIgual = (p) => A.planificar(p.instantanea()).every((a) => a.accion === 'igual');
const TOTAL_DESEADO = metricasDeseadas().length + Object.keys(politicasDeseadas()).length + COMPROBACIONES.length + 1;
const APLICAR = ['--aplicar', '--confirmo-proyecto', PROYECTO, '--canal', CANAL];
const RETIRAR = ['--retirar', '--ejecutar', '--confirmo-proyecto', PROYECTO];
const esLista = (args) => Object.values(LECTURAS).some((l) => json(l) === json(args));
const esBorrado = (args) => args.includes('delete');

/* ══ A · el ciclo aplicar → retirar → aplicar ═════════════════════════════════════════════════════════════════════════════════════════ */
const p = proyectoSimulado();
check('A0 el simulador arranca vacío y el plan lo da todo por crear', p.cuantos() === 0 && A.planificar(p.instantanea()).every((a) => a.accion === 'crear'));
const aplicado = ejecutarCon(APLICAR, p);
check('A1 aplicar sobre un proyecto vacío sale 0 y crea todo lo versionado', aplicado.codigo === 0 && p.cuantos() === TOTAL_DESEADO, `${aplicado.codigo} recursos=${p.cuantos()}/${TOTAL_DESEADO}`);
check('A2 y después el plan lo da todo «igual» (el simulador es fiel: lo creado es lo que el plan espera)', todoIgual(p), json(A.planificar(p.instantanea()).filter((a) => a.accion !== 'igual').map((a) => `${a.recurso}:${a.nombre}:${a.accion}`)));

const simulada = ejecutarCon(['--retirar'], p);
check('A3 retirar SIN --ejecutar solo simula: sale 0, enseña los borrados y no cambia nada', simulada.codigo === 0 && /SIMULACIÓN DE LA RETIRADA/.test(simulada.salida) && /gcloud beta monitoring policies delete/.test(simulada.salida) && p.cuantos() === TOTAL_DESEADO);
const retirada = ejecutarCon(RETIRAR, p);
check('A4 retirar con --ejecutar y el proyecto confirmado sale 0 y deja el proyecto VACÍO', retirada.codigo === 0 && p.cuantos() === 0, `${retirada.codigo} recursos=${p.cuantos()}`);
check('A5 y el plan vuelve a darlo todo por crear (la marcha atrás deja el proyecto como estaba antes de aplicar)', A.planificar(p.instantanea()).every((a) => a.accion === 'crear'));
const reaplicado = ejecutarCon(APLICAR, p);
check('A6 volver a aplicar tras retirar funciona: todo «igual» otra vez (el ciclo es reversible)', reaplicado.codigo === 0 && todoIgual(p) && p.cuantos() === TOTAL_DESEADO);

/* ══ B · no se pasa de lista ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const q = proyectoSimulado();
ejecutarCon(APLICAR, q);
const ajenas = {
  metrica: { name: `projects/${PROYECTO}/metrics/metrica_de_otro_equipo`, filter: 'severity>=ERROR' },
  politica: { name: `projects/${PROYECTO}/alertPolicies/9001`, displayName: 'Política de otro equipo', conditions: [], combiner: 'OR' },
  comprobacion: { name: `projects/${PROYECTO}/uptimeCheckConfigs/ajena`, displayName: 'ajena', monitoredResource: { labels: { host: 'otro.example.com' } }, httpCheck: { path: '/salud', acceptedResponseStatusCodes: [{ statusValue: 200 }] } },
  panel: { name: `projects/${PROYECTO}/dashboards/9002`, displayName: 'Panel de otro equipo', mosaicLayout: { tiles: [] } },
};
q.estado.metricas.set('metrica_de_otro_equipo', ajenas.metrica);
q.estado.politicas.set(ajenas.politica.name, ajenas.politica);
q.estado.comprobaciones.set(ajenas.comprobacion.name, ajenas.comprobacion);
q.estado.paneles.set(ajenas.panel.name, ajenas.panel);
const antesAjenas = q.cuantos();
const borradosQ = ejecutarCon(RETIRAR, q);
check('B1 retirar borra SOLO lo versionado: lo ajeno (métrica, política, comprobación y panel de otro equipo) sigue ahí',
  borradosQ.codigo === 0 && q.cuantos() === 4 && q.estado.metricas.has('metrica_de_otro_equipo') && q.estado.politicas.has(ajenas.politica.name) && q.estado.comprobaciones.has(ajenas.comprobacion.name) && q.estado.paneles.has(ajenas.panel.name), `antes=${antesAjenas} despues=${q.cuantos()}`);
check('B2 ninguna orden de la retirada nombra un canal de aviso (no los creó este código)', !q.ejecutadas.some((a) => esBorrado(a) && a.some((x) => /notificationChannels|channels/.test(x))));

const r2 = proyectoSimulado();
ejecutarCon(APLICAR, r2);
const salud = COMPROBACIONES[0];
const idSalud = [...r2.estado.comprobaciones.keys()].find((k) => r2.estado.comprobaciones.get(k).monitoredResource.labels.host === salud.host);
r2.estado.comprobaciones.get(idSalud).httpCheck.path = '/otra-cosa';
const idPanel = [...r2.estado.paneles.keys()][0];
r2.estado.paneles.get(idPanel).mosaicLayout.tiles = r2.estado.paneles.get(idPanel).mosaicLayout.tiles.slice(0, 1);
const parecidas = ejecutarCon(RETIRAR, r2);
check('B3 una comprobación del mismo host que mira OTRA cosa, y un panel con otra forma, NO se borran: se dejan y se avisan «revisar-a-mano»',
  parecidas.codigo === 0 && r2.estado.comprobaciones.has(idSalud) && r2.estado.paneles.has(idPanel) && (parecidas.salida.match(/revisar-a-mano/g) || []).length >= 2, parecidas.salida.split('\n').filter((l) => /revisar-a-mano/.test(l)).join(' | '));
check('B4 …y todo lo demás sí se retiró (políticas y métricas a cero)', r2.estado.politicas.size === 0 && r2.estado.metricas.size === 0);

/* ══ C · el orden ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const s = proyectoSimulado();
ejecutarCon(APLICAR, s);
s.ejecutadas.length = 0;
ejecutarCon(RETIRAR, s);
const borrados = s.ejecutadas.filter(esBorrado);
const tipo = (a) => (a.includes('policies') ? 'politica' : a.includes('uptime') ? 'comprobacion' : a.includes('dashboards') ? 'panel' : 'metrica');
const orden = borrados.map(tipo);
const ultimaPolitica = orden.lastIndexOf('politica');
const primeraMetrica = orden.indexOf('metrica');
check('C1 las políticas se borran ANTES que las métricas que usan (una métrica borrada antes dejaría la política con una condición rota)', ultimaPolitica >= 0 && primeraMetrica >= 0 && ultimaPolitica < primeraMetrica, orden.join(','));
check('C2 todas las órdenes de borrado llevan --quiet y el proyecto (no preguntan y no se confunden de proyecto)', borrados.length === TOTAL_DESEADO && borrados.every((a) => a.includes('--quiet') && a.includes(`--project=${PROYECTO}`)));
check('C3 y entre las lecturas y los borrados no hay ninguna otra orden de escritura (nada de create/update durante la retirada)', !s.ejecutadas.some((a) => !esLista(a) && !esBorrado(a)));

/* ══ D · las cerraduras ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const d = proyectoSimulado();
ejecutarCon(APLICAR, d);
d.ejecutadas.length = 0;
const solo = ejecutarCon(['--retirar'], d);
check('D1 sin --ejecutar solo se ejecutan los `list` de verificar.mjs', solo.codigo === 0 && d.ejecutadas.length > 0 && d.ejecutadas.every(esLista) && d.cuantos() === TOTAL_DESEADO);
const sinConfirmar = ejecutarCon(['--retirar', '--ejecutar'], d);
check('D2 --ejecutar sin el proyecto escrito otra vez sale 2 y no borra nada', sinConfirmar.codigo === 2 && /Para retirar, escribe el proyecto otra vez/.test(sinConfirmar.salida) && d.cuantos() === TOTAL_DESEADO);
const otroProyecto = ejecutarCon(['--retirar', '--ejecutar', '--confirmo-proyecto', 'otro-proyecto'], d);
check('D3 con OTRO nombre de proyecto tampoco borra nada', otroProyecto.codigo === 2 && d.cuantos() === TOTAL_DESEADO);
d.ejecutadas.length = 0;
const mezcla = ejecutarCon(['--aplicar', '--retirar', ...RETIRAR.slice(1)], d);
check('D4 --aplicar y --retirar juntos: salida 2, sin ejecutar ni una orden', mezcla.codigo === 2 && /no se combinan/.test(mezcla.salida) && d.ejecutadas.length === 0);
const ciega = proyectoSimulado();
ejecutarCon(APLICAR, ciega);
const ejecutarSinLeer = (args, cwd) => (esLista(args) && json(args) === json(LECTURAS.politicas) ? { status: 1, stdout: '', stderr: 'PERMISSION_DENIED' } : ciega.ejecutar(args, cwd));
const sinLeer = ejecutarCon(RETIRAR, ciega, { ejecutar: ejecutarSinLeer });
check('D5 si no se pudo LEER una parte de lo que hay, no se borra NADA (el plan no sería fiable) y sale 2', sinLeer.codigo === 2 && /No se retira sin haber podido leer/.test(sinLeer.salida) && ciega.cuantos() === TOTAL_DESEADO, `${sinLeer.codigo} recursos=${ciega.cuantos()}`);
const sinLeerSim = ejecutarCon(['--retirar'], ciega, { ejecutar: ejecutarSinLeer });
check('D6 …y la simulación con lectura imposible también sale 2 (no «todo bien»)', sinLeerSim.codigo === 2);

/* ══ E · los fallos y la repetición ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
const e = proyectoSimulado();
ejecutarCon(APLICAR, e);
let fallada = false;
const ejecutarQueFalla = (args, cwd) => (!fallada && esBorrado(args) && args.includes('metrics') ? ((fallada = true), { status: 1, stdout: '', stderr: 'INTERNAL: fallo de prueba' }) : e.ejecutar(args, cwd));
const conFallo = ejecutarCon(RETIRAR, e, { ejecutar: ejecutarQueFalla });
check('E1 si un borrado falla, la salida es 1, se dice cuál y no se esconde lo que sí se borró', conFallo.codigo === 1 && /✘ gcloud logging metrics delete/.test(conFallo.salida) && /1 orden\(es\) fallaron/.test(conFallo.salida) && e.cuantos() === 1, `recursos=${e.cuantos()}`);
const reintento = ejecutarCon(RETIRAR, e);
check('E2 repetir la retirada acaba lo que faltaba (idempotente): proyecto vacío y salida 0', reintento.codigo === 0 && e.cuantos() === 0);
const antesDeLaTercera = e.ejecutadas.length;
const otraVez = ejecutarCon(RETIRAR, e);
const deEstaVez = e.ejecutadas.slice(antesDeLaTercera);
check('E3 y una retirada sobre un proyecto ya vacío no ejecuta NINGÚN borrado (solo lecturas): todo «ausente»',
  otraVez.codigo === 0 && deEstaVez.length > 0 && deEstaVez.every(esLista) && !deEstaVez.some(esBorrado) && /0 por retirar/.test(otraVez.salida) && !otraVez.salida.split('\n').some((l) => /^retirar\s/.test(l)), String(deEstaVez.length));

/* ══ F · el código ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
check('F1 ordenesDeRetirada solo acepta acciones «retirar»: cualquier otra lanza (nada «ausente», «revisar-a-mano» ni «desconocido» llega a un borrado)',
  ['ausente', 'revisar-a-mano', 'desconocido', 'crear', 'igual'].every((accion) => { try { A.ordenesDeRetirada([{ recurso: 'metrica', nombre: 'x', accion }]); return false; } catch { return true; } }));
const fuente = leer('ops/observabilidad/aplicar.mjs');
const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const lineasDeBorrado = sinComentarios.split('\n').filter((l) => /'delete'/.test(l));
check('F2 la palabra «delete» solo aparece en ordenesDeRetirada (cuatro órdenes: política, comprobación, panel y métrica)', lineasDeBorrado.length === 4 && lineasDeBorrado.every((l) => /--quiet/.test(l)), String(lineasDeBorrado.length));
check('F3 el ejecutor de la retirada exige --ejecutar y --confirmo-proyecto antes de la primera orden de escritura', /ejecutarDeVerdad/.test(fuente) && /Para retirar, escribe el proyecto otra vez/.test(fuente));
const pkg = JSON.parse(leer('functions/package.json'));
check('F4 esta suite está en la cadena de `npm test`', /observabilidad-retirada\.test\.mjs/.test(pkg.scripts.test));

process.stdout.write(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ todo bien: aplicar → retirar → aplicar es un ciclo, y la retirada no toca nada ajeno\n');
process.exit(fallos ? 1 : 0);
