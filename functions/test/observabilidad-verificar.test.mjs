/*
 * LA VERIFICACIÓN DE LA OBSERVABILIDAD — `ops/observabilidad/verificar.mjs`, y el panel.
 *
 * Sin red: (1) solo lee, (2) distingue lo activo y conectado de cada forma de que
 * una alerta no sirva —que falte, esté apagada, no avise a nadie, avise a un canal
 * sin verificar, o su métrica cuente otra cosa—, (3) vigila también www.wee.zone, y
 * (4) el panel usa solo métricas que existen o se crean aquí.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const a = await importar('ops/observabilidad/alertas.mjs');
const v = await importar('ops/observabilidad/verificar.mjs');
const fuente = fs.readFileSync(path.join(RAIZ, 'ops/observabilidad/verificar.mjs'), 'utf8');

const ordenes = Object.values(v.LECTURAS);
check('1) cada orden es un `list`, y ninguna escribe',
  ordenes.length === 5 && ordenes.every((o) => o.includes('list') || o.includes('list-configs'))
  && !/\b(create|delete|update|undelete|describe --format=value\(token)/.test(ordenes.flat().join(' ')));
check('2) un único spawnSync de gcloud con esas órdenes', (fuente.match(/spawnSync\(/g) || []).length === 1 && /spawnSync\('gcloud', args/.test(fuente) && !/execSync|execFile/.test(fuente));

/* ── Lo activo y conectado, construido desde alertas.mjs ─────────────────── */
const CANAL = 'projects/get-wee/notificationChannels/1';
const conforme = () => JSON.parse(JSON.stringify({
  metricas: a.METRICAS.map((m) => ({ name: `projects/get-wee/metrics/${m.nombre}`, filter: m.filtro })),
  comprobaciones: a.COMPROBACIONES.map((c) => ({ monitoredResource: { type: 'uptime_url', labels: { host: c.host } },
    httpCheck: { path: c.ruta, acceptedResponseStatusCodes: [{ statusValue: c.codigo }] } })),
  politicas: Object.values(a.POLITICAS).map((p) => ({ displayName: p.displayName, enabled: true, notificationChannels: [CANAL] })),
  canales: [{ name: CANAL, type: 'email', enabled: true, verificationStatus: 'VERIFIED' }],
  paneles: [{ displayName: a.PANEL.displayName }],
}));
const con = (f) => { const x = conforme(); f(x); return v.comparar(x); };

check('3) activado con los comandos de alertas.mjs, sale CONFORME', v.comparar(conforme()).length === 0, v.comparar(conforme()).join(' | '));
check('4) sin nada creado (hoy), dice qué falta y no se rompe',
  v.comparar({ metricas: [], comprobaciones: [], politicas: [], canales: [], paneles: [] }).length
    === a.METRICAS.length + a.COMPROBACIONES.length + 1 + Object.keys(a.POLITICAS).length + 1);
check('5) una alerta apagada, sin canal o con un canal sin verificar no sirve',
  con((x) => { x.politicas[0].enabled = false; }).length === 1
  && con((x) => { x.politicas[1].notificationChannels = []; }).length === 1
  && con((x) => { x.canales[0].verificationStatus = 'UNVERIFIED'; }).length === 1 + Object.keys(a.POLITICAS).length);
check('6) una métrica con el filtro cambiado en la consola ya no cuenta lo que dice: se detecta',
  con((x) => { x.metricas[0].filter = 'resource.type="cloud_run_revision"'; }).some((d) => /otro filtro/.test(d)));
check('7) una comprobación que mira otra ruta o espera otro código no vale',
  con((x) => { x.comprobaciones[0].httpCheck.path = '/'; }).length === 1
  && con((x) => { x.comprobaciones[1].httpCheck.acceptedResponseStatusCodes = [{ statusValue: 404 }]; }).length === 1);

/* ── wee.zone y el panel ─────────────────────────────────────────────────── */
const caido = a.POLITICAS['wee-caido'].conditions[0].conditionThreshold.filter;
check('8) la web pública también se vigila: www.wee.zone con 200, y la misma alerta «caído» cubre los dos hosts',
  a.SALUD_WEB.host === 'www.wee.zone' && a.SALUD_WEB.codigo === 200
  && a.COMPROBACIONES.every((c) => caido.includes(`resource.label.host="${c.host}"`))
  && a.comandos().filter((l) => l.startsWith('gcloud monitoring uptime create')).length === 2);
check('9) siguen siendo siete alertas: vigilar wee.zone no añade otra', Object.keys(a.POLITICAS).length === 7);
const filtros = a.PANEL.mosaicLayout.tiles.flatMap((t) => t.widget.xyChart.dataSets.map((d) => d.timeSeriesQuery.timeSeriesFilter.filter));
const usuario = filtros.map((f) => (f.match(/logging\.googleapis\.com\/user\/([a-z_]+)/) || [])[1]).filter(Boolean);
check('10) el panel solo usa métricas que existen (Cloud Run, comprobaciones) o que se crean aquí',
  filtros.length >= 6 && usuario.every((u) => a.METRICAS.some((m) => m.nombre === u))
  && filtros.every((f) => /run\.googleapis\.com\/request_count|uptime_check\/check_passed|logging\.googleapis\.com\/user\//.test(f)));
check('11) el panel cabe en su rejilla de 12 columnas sin solaparse',
  a.PANEL.mosaicLayout.tiles.every((t) => t.xPos + t.width <= 12)
  && new Set(a.PANEL.mosaicLayout.tiles.map((t) => `${t.xPos},${t.yPos}`)).size === a.PANEL.mosaicLayout.tiles.length);

const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'functions/package.json'), 'utf8'));
check('12) esta suite está en la cadena de `npm test`', /observabilidad-verificar\.test\.mjs/.test(pkg.scripts.test));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
