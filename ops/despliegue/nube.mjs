/*
 * GOOGLE CLOUD POR REST — lo justo para el workflow de producción.
 *
 * Con el token de acceso que deja `google-github-actions/auth` (identidad de
 * despliegue sin claves, por Workload Identity Federation): no hace falta gcloud
 * en el runner. Cada función gen2 es un servicio de Cloud Run con su nombre en
 * minúsculas. Solo LEE, salvo `traficoA` (la marcha atrás). Los errores nunca
 * llevan el token: va en una cabecera y el mensaje solo nombra el servicio.
 */
import { consultaDe5xx, revisionQueSirve, servicioConTrafico, sumarSeries } from './plan.mjs';

/** El motivo que da la API en el cuerpo del error (`error.status: error.message`), en una línea y corto. */
const motivoDelError = (texto) => {
  let e;
  try { e = JSON.parse(texto)?.error; } catch { return ''; }
  const motivo = e && typeof e === 'object' ? [e.status, e.message].filter(Boolean).join(': ') : typeof e === 'string' ? e : '';
  return motivo.replace(/\s+/g, ' ').trim().slice(0, 300);
};

export const crearNube = ({ proyecto, region, token, fetch: pedirHttp = globalThis.fetch }) => {
  const url = (servicio) => `https://run.googleapis.com/v2/projects/${proyecto}/locations/${region}/services/${servicio}`;
  const urlV1 = (servicio) => `https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${proyecto}/services/${servicio}`;
  const pedir = async (destino, opciones = {}) => {
    const r = await pedirHttp(destino, {
      ...opciones,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    });
    const texto = await r.text();
    if (!r.ok) {
      /* El motivo real de la API (un 400 de una consulta mal formada no es un fallo de la aplicación), nunca el token. */
      const motivo = token ? motivoDelError(texto).split(token).join('[token]') : motivoDelError(texto);
      const error = new Error(`${new URL(destino).hostname} respondió ${r.status}${motivo ? ` (${motivo})` : ''} para ${destino.split('/services/')[1]?.split('?')[0] || destino.split('/revisions/')[1] || 'la petición'}`);
      error.status = r.status;
      throw error;
    }
    return texto ? JSON.parse(texto) : {};
  };
  const ultimo = (nombre) => (nombre ? String(nombre).split('/').pop() : null);
  return {
    /**
     * La revisión que SIRVE el tráfico (no la última lista), la última creada,
     * la URL, y si la última creada está lista Y es la que sirve: el humo tiene
     * que probar el código nuevo, no el viejo que sigue recibiendo el tráfico.
     */
    async servicio(servicio) {
      let d;
      try { d = await pedir(url(servicio)); } catch (e) {
        /* Una función nueva todavía no tiene servicio: no hay revisión de antes a la que volver. */
        if (e.status === 404) return { revision: null, reparto: null, creada: null, uri: null, lista: false, existe: false };
        throw e;
      }
      const { revision, reparto } = revisionQueSirve(d);
      const creada = ultimo(d.latestCreatedRevision);
      const lista = d.terminalCondition?.state === 'CONDITION_SUCCEEDED' && ultimo(d.latestReadyRevision) === creada && revision === creada;
      return { revision, reparto, creada, uri: d.uri || null, lista, existe: true };
    },
    /**
     * Todo el tráfico a una revisión (la marcha atrás), como `gcloud run services update-traffic`: se lee
     * el servicio entero por la API v1 y se reemplaza con la MISMA plantilla y solo el tráfico cambiado. Un
     * PATCH v2 con solo `traffic` lo rechaza Cloud Run en un servicio de Cloud Functions (ALREADY_EXISTS).
     */
    async traficoA(servicio, revision) {
      const actual = await pedir(urlV1(servicio));
      await pedir(urlV1(servicio), { method: 'PUT', body: JSON.stringify(servicioConTrafico(actual, revision)) });
    },
    /** El digest exacto de la imagen de una revisión: `status.imageDigest` de la API v1 (la v2 no lo da). */
    async digestDe(revision) {
      const d = await pedir(`https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${proyecto}/revisions/${revision}`);
      return d.status?.imageDigest || null;
    },
    /** Cuántas respuestas 5xx dieron unos servicios entre dos instantes (Cloud Monitoring): una consulta por servicio, sumadas. */
    async cuenta5xx(servicios, desdeIso, hastaIso) {
      let total = 0;
      for (const s of new Set(servicios)) {
        total += sumarSeries(await pedir(`https://monitoring.googleapis.com/v3/projects/${proyecto}/timeSeries?${consultaDe5xx(s, desdeIso, hastaIso)}`));
      }
      return total;
    },
    /** La versión que publica ahora un sitio de Hosting. */
    async versionDeHosting(sitio) {
      const d = await pedir(`https://firebasehosting.googleapis.com/v1beta1/sites/${sitio}/releases?pageSize=1`);
      return ultimo(d.releases?.[0]?.version?.name);
    },
  };
};
