/*
 * CLOUD RUN (v2) POR REST — lo justo para el workflow de producción.
 *
 * Con el token de acceso que deja `google-github-actions/auth` (identidad de
 * despliegue sin claves, por Workload Identity Federation): no hace falta gcloud
 * en el runner. Cada función gen2 es un servicio de Cloud Run con su nombre en
 * minúsculas. Los errores nunca llevan el token.
 */
import { cuerpoDeTrafico } from './plan.mjs';

const BASE = 'https://run.googleapis.com/v2';

export const crearNube = ({ proyecto, region, token, fetch: pedirHttp = globalThis.fetch }) => {
  const url = (servicio) => `${BASE}/projects/${proyecto}/locations/${region}/services/${servicio}`;
  const pedir = async (destino, opciones = {}) => {
    const r = await pedirHttp(destino, {
      ...opciones,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    });
    const texto = await r.text();
    if (!r.ok) throw new Error(`Cloud Run respondió ${r.status} para ${destino.split('/services/')[1] || 'la petición'}`);
    return texto ? JSON.parse(texto) : {};
  };
  const ultimo = (nombre) => (nombre ? String(nombre).split('/').pop() : null);
  return {
    /** Revisión que sirve, la última creada, su URL y si está lista. */
    async servicio(servicio) {
      const d = await pedir(url(servicio));
      const lista = d.terminalCondition?.state === 'CONDITION_SUCCEEDED' && ultimo(d.latestReadyRevision) === ultimo(d.latestCreatedRevision);
      return { revision: ultimo(d.latestReadyRevision), creada: ultimo(d.latestCreatedRevision), uri: d.uri || null, lista };
    },
    /** Todo el tráfico a una revisión (la marcha atrás). */
    async traficoA(servicio, revision) {
      await pedir(`${url(servicio)}?updateMask=traffic`, { method: 'PATCH', body: JSON.stringify(cuerpoDeTrafico(revision)) });
    },
  };
};
