#!/usr/bin/env node
/*
 * LAS ALERTAS DE WEË — Weë Agent Harness, FASE 14 (docs/OBSERVABILITY.md).
 *
 * La auditoría H0 encontró CERO alertas: producción estuvo caída por
 * facturación de 12:33Z a 17:53Z sin que nadie se enterara. Aquí están las
 * pocas que valen la pena, baratas, y cada una apunta a un problema que el
 * dueño tiene que mirar:
 *
 *  · dinero sin cerrar: un reembolso o una liquidación de Credits falló;
 *  · IA no disponible: muchas peticiones sin proveedor (caída, claves, o el
 *    interruptor `iaDetenida` encendido);
 *  · tope de gasto diario alcanzado: la IA se detuvo sin cobrar porque llegó al
 *    `maxUsdPerDay` global o al de un proveedor (decisión: subirlo o esperar);
 *  · uso de IA anómalo: muchas más generaciones de lo normal en 15 minutos
 *    (abuso, un bucle, un cliente que reintenta sin parar);
 *  · barrido fallando: la reconciliación de tareas no termina;
 *  · errores 5xx en las Functions;
 *  · Weë caído: una comprobación externa cada 5 minutos (la caída de H0).
 *
 * SOLO IMPRIME los comandos que ejecuta el DUEÑO (Cloud Monitoring es de su
 * proyecto y de su correo). No ejecuta nada. Las políticas son datos de este
 * archivo; functions/test/observabilidad.test.mjs comprueba que cada filtro
 * apunta a un mensaje que el código de verdad escribe (si alguien cambia el
 * mensaje, la alerta no se queda ciega en silencio).
 *
 *   node ops/observabilidad/alertas.mjs              # imprime los comandos
 *   node ops/observabilidad/alertas.mjs --json <dir> # además escribe las políticas en <dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROYECTO = 'get-wee';

/** Un texto del log, buscado en las dos formas en que Cloud Logging guarda un console.*. */
const texto = (t) => `(textPayload:"${t}" OR jsonPayload.message:"${t}")`;

/** Los mensajes de log en los que se apoyan las alertas, y qué archivo los escribe (lo comprueba el test). */
export const MENSAJES = {
  'no se pudo reembolsar': ['functions/src/generateAvatar.ts', 'functions/src/creator/brain.ts', 'functions/src/creator/video.ts'],
  'no se pudo ajustar el trabajo': ['functions/src/creator/credits.ts'],
  'tampoco se pudo anotar la liquidación pendiente': ['functions/src/creator/credits.ts'],
  'WEË AI ENGINE: ningún proveedor disponible': ['functions/src/engine/router.ts'],
  'WEË RECONCILIACIÓN · la pasada no se pudo completar': ['functions/src/settlement/programado.ts'],
  'presupuesto_diario_agotado': ['functions/src/engine/router.ts'],
  'presupuesto diario del proveedor alcanzado': ['functions/src/engine/router.ts'],
  'WEË AI ENGINE: ': ['functions/src/engine/router.ts'],
  ' atendió ': ['functions/src/engine/router.ts'],
};

/** Métricas basadas en logs (contadores). */
export const METRICAS = [
  { nombre: 'wee_ia_no_disponible', descripcion: 'Peticiones de IA sin ningún proveedor disponible', filtro: `resource.type="cloud_run_revision" AND ${texto('WEË AI ENGINE: ningún proveedor disponible')}` },
  { nombre: 'wee_barrido_incompleto', descripcion: 'Pasadas de la reconciliación que no terminaron', filtro: `resource.type="cloud_run_revision" AND ${texto('WEË RECONCILIACIÓN · la pasada no se pudo completar')}` },
  { nombre: 'wee_ia_tope_diario', descripcion: 'Peticiones de IA paradas por el tope de gasto diario', filtro: `resource.type="cloud_run_revision" AND (${texto('presupuesto_diario_agotado')} OR ${texto('presupuesto diario del proveedor alcanzado')})` },
  { nombre: 'wee_ia_generaciones', descripcion: 'Generaciones de IA atendidas (una línea del motor por cada una)', filtro: `resource.type="cloud_run_revision" AND ${texto('WEË AI ENGINE: ')} AND ${texto(' atendió ')}` },
];

/** Generaciones en 15 minutos a partir de las cuales el uso se considera anómalo. Ajustable tras una semana de datos reales. */
export const UMBRAL_DE_USO_ANOMALO = 300;

const umbral = (nombre, metrica, valor, ventana, doc, extraFiltro = '') => ({
  displayName: nombre,
  documentation: { content: doc, mimeType: 'text/markdown' },
  combiner: 'OR',
  conditions: [{
    displayName: nombre,
    conditionThreshold: {
      filter: `metric.type="${metrica}"${extraFiltro}`,
      comparison: 'COMPARISON_GT',
      thresholdValue: valor,
      duration: '0s',
      aggregations: [{ alignmentPeriod: ventana, perSeriesAligner: 'ALIGN_SUM', crossSeriesReducer: 'REDUCE_SUM' }],
    },
  }],
  alertStrategy: { autoClose: '86400s' },
});

/** La comprobación externa: un post que no existe → 404 = las Functions responden; 5xx o nada = caído. */
export const SALUD = { id: 'salud-get-wee', host: 'get-wee.web.app', ruta: '/post/salud-del-sistema', codigo: 404, periodoMin: 5 };

/** Y la web pública: www.wee.zone (Vercel) tiene que contestar 200. wee.zone sin www redirige aquí con un 308. */
export const SALUD_WEB = { id: 'salud-wee-zone', host: 'www.wee.zone', ruta: '/', codigo: 200, periodoMin: 5 };

export const COMPROBACIONES = [SALUD, SALUD_WEB];

/** Las políticas de alerta (Cloud Monitoring, API v3). */
export const POLITICAS = {
  'dinero-sin-cerrar': {
    displayName: 'Weë · dinero sin cerrar',
    documentation: {
      content: 'Un reembolso o una liquidación de Credits falló. Busca el trabajo (creatorJobs con `liquidacionPendiente`) o la operación (creditTransactions) y ciérrala: el Credit Engine es idempotente, repetir el ajuste no cobra ni devuelve dos veces. docs/OBSERVABILITY.md',
      mimeType: 'text/markdown',
    },
    combiner: 'OR',
    conditions: [{
      displayName: 'Reembolso o liquidación fallida',
      conditionMatchedLog: {
        filter: `resource.type="cloud_run_revision" AND severity>=ERROR AND (${texto('no se pudo reembolsar')} OR ${texto('no se pudo ajustar el trabajo')} OR ${texto('tampoco se pudo anotar la liquidación pendiente')})`,
      },
    }],
    alertStrategy: { notificationRateLimit: { period: '1800s' }, autoClose: '604800s' },
  },
  'ia-no-disponible': umbral('Weë · IA no disponible', 'logging.googleapis.com/user/wee_ia_no_disponible', 5, '600s',
    'Más de 5 peticiones de IA en 10 minutos sin proveedor: un proveedor caído, una clave mal rotada, el interruptor `aiSettings/global.iaDetenida` encendido o el tope de gasto diario `maxUsdPerDay` alcanzado. docs/AI-ENGINE.md § Límites.'),
  'tope-diario': umbral('Weë · tope de gasto diario de IA alcanzado', 'logging.googleapis.com/user/wee_ia_tope_diario', 0, '600s',
    'La IA se ha detenido sin cobrar porque llegó al `maxUsdPerDay` global o al de un proveedor (`aiSettings/global`, `aiProviders/{id}.limits`). Hasta medianoche UTC no vuelve sola. Decide si el gasto es legítimo (subir el tope con engineAdmin) o un abuso (mira `aiGenerations` de hoy). docs/COSTES.md.'),
  'uso-ia-anomalo': umbral('Weë · uso de IA anómalo', 'logging.googleapis.com/user/wee_ia_generaciones', UMBRAL_DE_USO_ANOMALO, '900s',
    `Más de ${UMBRAL_DE_USO_ANOMALO} generaciones de IA en 15 minutos. Puede ser abuso (cuentas nuevas, un cliente en bucle) o éxito: mira \`aiGenerations\` por persona y por proveedor. Si es abuso, el interruptor \`iaDetenida\` lo para todo sin cobrar. docs/COSTES.md.`),
  'barrido-fallando': umbral('Weë · el barrido no termina', 'logging.googleapis.com/user/wee_barrido_incompleto', 1, '900s',
    'Dos o más pasadas seguidas de la reconciliación (cada 5 min) sin terminar: el dinero de tareas ya lanzadas no se está cerrando. docs/RUNTIME.md.'),
  'errores-5xx': umbral('Weë · errores 5xx en las Functions', 'run.googleapis.com/request_count', 10, '600s',
    'Más de 10 respuestas 5xx en 10 minutos en los servicios de las Functions. Mira los logs del servicio y, si vino de un despliegue, la marcha atrás (docs/DEPLOYMENT.md §5).',
    ' AND resource.type="cloud_run_revision" AND metric.label.response_code_class="5xx"'),
  'wee-caido': {
    displayName: 'Weë · caído (comprobación externa)',
    documentation: {
      content: 'Una comprobación externa falla. Si es get-wee.web.app (/post/…), las Functions no responden: la caída de H0 (12:33Z–17:53Z) fue por facturación, mira primero la cuenta de facturación. Si es www.wee.zone, la web pública no carga: mira el despliegue que sirve Vercel (con el freno, un push no lo cambia solo). docs/OBSERVABILITY.md',
      mimeType: 'text/markdown',
    },
    combiner: 'OR',
    conditions: [{
      displayName: 'La comprobación de salud falla',
      conditionThreshold: {
        /* Por el host, no por check_id: el id de la comprobación lo genera Cloud Monitoring. */
        filter: `metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.type="uptime_url" AND (${COMPROBACIONES.map((c) => `resource.label.host="${c.host}"`).join(' OR ')})`,
        comparison: 'COMPARISON_GT',
        thresholdValue: 1,
        duration: '60s',
        aggregations: [{ alignmentPeriod: '1200s', perSeriesAligner: 'ALIGN_NEXT_OLDER', crossSeriesReducer: 'REDUCE_COUNT_FALSE', groupByFields: ['resource.label.host'] }],
      },
    }],
    alertStrategy: { autoClose: '86400s' },
  },
};

/*
 * EL PANEL «Weë · producción» (Cloud Monitoring; los paneles no cuestan): lo que se mira en la
 * observación de un despliegue y cuando salta una alerta. Cada gráfico usa una métrica que ya existe
 * (Cloud Run, comprobaciones externas) o que se crea aquí (METRICAS): nada nuevo.
 */
const grafico = (titulo, conjuntos, x, y) => ({
  xPos: x, yPos: y, width: 6, height: 4,
  widget: { title: titulo, xyChart: { dataSets: conjuntos.map(([filtro, alineador, reductor, agrupar]) => ({
    plotType: 'LINE',
    timeSeriesQuery: { timeSeriesFilter: { filter: filtro, aggregation: { alignmentPeriod: '300s', perSeriesAligner: alineador, crossSeriesReducer: reductor, ...(agrupar ? { groupByFields: agrupar } : {}) } } },
  })) } },
});
const contador = (nombre) => [`metric.type="logging.googleapis.com/user/${nombre}"`, 'ALIGN_SUM', 'REDUCE_SUM'];
export const PANEL = {
  displayName: 'Weë · producción',
  mosaicLayout: {
    columns: 12,
    tiles: [
      grafico('Errores 5xx por función', [['metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND metric.label.response_code_class="5xx"', 'ALIGN_SUM', 'REDUCE_SUM', ['resource.label.service_name']]], 0, 0),
      grafico('Peticiones por función', [['metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision"', 'ALIGN_SUM', 'REDUCE_SUM', ['resource.label.service_name']]], 6, 0),
      grafico('Generaciones de IA', [contador('wee_ia_generaciones')], 0, 4),
      grafico('IA sin proveedor y tope diario', [contador('wee_ia_no_disponible'), contador('wee_ia_tope_diario')], 6, 4),
      grafico('Reconciliación sin terminar', [contador('wee_barrido_incompleto')], 0, 8),
      grafico('Salud: comprobaciones correctas', [['metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.type="uptime_url"', 'ALIGN_FRACTION_TRUE', 'REDUCE_MEAN', ['resource.label.host']]], 6, 8),
    ],
  },
};


export const comandos = (dir = '<carpeta-con-las-politicas>') => [
  '# 0 · Canal de aviso por correo (pon tu correo; queda en tu proyecto, no en el repositorio)',
  `gcloud beta monitoring channels create --project=${PROYECTO} --display-name="Dueño de Weë" --type=email --channel-labels=email_address=<TU_CORREO>`,
  `gcloud beta monitoring channels list --project=${PROYECTO} --format="value(name)"   # copia el nombre del canal: projects/${PROYECTO}/notificationChannels/<ID>`,
  '',
  '# 1 · Métricas basadas en logs (contadores)',
  ...METRICAS.map((m) => `gcloud logging metrics create ${m.nombre} --project=${PROYECTO} --description="${m.descripcion}" --log-filter='${m.filtro}'`),
  '',
  '# 2 · Comprobaciones externas de salud, cada 5 min: get-wee.web.app (un 404 = las Functions responden) y www.wee.zone (200)',
  ...COMPROBACIONES.map((c) => `gcloud monitoring uptime create ${c.id} --project=${PROYECTO} --resource-type=uptime-url --resource-labels=host=${c.host},project_id=${PROYECTO} --path=${c.ruta} --protocol=https --status-codes=${c.codigo} --period=${c.periodoMin}`),
  '',
  `# 3 · Políticas de alerta (los JSON los escribe: node ops/observabilidad/alertas.mjs --json ${dir})`,
  ...Object.keys(POLITICAS).map((n) => `gcloud beta monitoring policies create --project=${PROYECTO} --policy-from-file=${dir}/${n}.json --notification-channels=<CANAL>`),
  '',
  '',
  `# 4 · El panel «${PANEL.displayName}» (gratis): lo que se mira tras un despliegue o cuando salta una alerta`,
  `gcloud monitoring dashboards create --project=${PROYECTO} --config-from-file=${dir}/panel.json`,
  '',
  '# 5 · Presupuesto: además del aviso que ya existe (100 PEN, solo correo), umbrales al 50 %, 90 % y 100 % en la consola de facturación.',
  '',
  '# 6 · Comprueba que todo existe y que cada alerta avisa a alguien (solo lectura): node ops/observabilidad/verificar.mjs',
];

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const i = process.argv.indexOf('--json');
  const dir = i >= 0 ? process.argv[i + 1] : null;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    for (const [n, p] of Object.entries(POLITICAS)) fs.writeFileSync(path.join(dir, `${n}.json`), JSON.stringify(p, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'panel.json'), JSON.stringify(PANEL, null, 2) + '\n');
  }
  console.log('# Weë · alertas. LO EJECUTA EL DUEÑO; este script no ejecuta nada en Google Cloud.\n');
  for (const l of comandos(dir || undefined)) console.log(l);
}
