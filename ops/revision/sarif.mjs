/*
 * SALIDA SARIF 2.1.0 DEL REVISOR DE WEË — para cualquier visor de SARIF (el de GitHub, el de VS Code).
 *
 * Cada hallazgo lleva `partialFingerprints` con su huella (`weeHuella/v1`) y su id estable (`weeId/v1`), y, si se
 * clasificó contra la baseline, `baselineState`: new (NUEVO, NUEVA REGLA, REAPARECIDO), unchanged (lo conocido),
 * updated (conocido con otra huella u otro id, o una cuenta de `any` que subió) y absent (lo que ya no aparece).
 * El estado de Weë va en `properties.estado`. Los disparadores de frontera van en `runs[0].properties`.
 */
import { pathToFileURL } from 'node:url';
import { REGLAS_DE_HALLAZGO } from './reglas.mjs';
import { rutaDeId } from './clasificacion.mjs';

const NIVEL = { bloqueante: 'error', alta: 'error', media: 'warning', baja: 'note' };

export const aSarif = (resultado, clasificacion = null) => {
  const indice = new Map(REGLAS_DE_HALLAZGO.map((r, i) => [r.id, i]));
  const estados = clasificacion ? new Map(clasificacion.resultados.map((r) => [r.id, r])) : null;
  const ubicacion = (ruta, linea) => [{
    physicalLocation: { artifactLocation: { uri: ruta, uriBaseId: '%SRCROOT%' }, region: { startLine: Math.max(1, linea || 1) } },
  }];
  const results = resultado.hallazgos.map((h) => {
    const c = estados?.get(h.id);
    return {
      ruleId: h.regla,
      ...(indice.has(h.regla) ? { ruleIndex: indice.get(h.regla) } : {}),
      level: NIVEL[h.severidad] || 'warning',
      message: { text: c ? `[${c.estado}] ${h.mensaje}` : h.mensaje },
      locations: ubicacion(h.evidencia.ruta, h.evidencia.linea),
      partialFingerprints: { 'weeHuella/v1': h.huella, 'weeId/v1': h.id },
      ...(c ? { baselineState: c.baselineState } : {}),
      properties: { id: h.id, severidad: h.severidad, ancla: h.ancla, ...(c ? { estado: c.estado, porque: c.porque } : {}), ...(h.cuenta !== undefined ? { cuenta: h.cuenta } : {}) },
    };
  });
  for (const a of clasificacion?.ausentes || []) {
    if (!a.nuevoCorregido) continue;
    const e = a.entrada;
    results.push({
      ruleId: e.regla,
      ...(indice.has(e.regla) ? { ruleIndex: indice.get(e.regla) } : {}),
      level: 'none',
      kind: 'pass',
      message: { text: `[CORREGIDO] ${e.titulo}` },
      locations: ubicacion(rutaDeId(e.id, e.regla), 1),
      partialFingerprints: { ...(e.huella ? { 'weeHuella/v1': e.huella } : {}), 'weeId/v1': e.id },
      baselineState: 'absent',
      properties: { id: e.id, severidad: e.severidad, estado: 'CORREGIDO' },
    });
  }
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'wee-revision',
          semanticVersion: `${resultado.version}.0.0`,
          rules: REGLAS_DE_HALLAZGO.map((r) => ({
            id: r.id,
            shortDescription: { text: r.descripcion },
            defaultConfiguration: { level: NIVEL[r.severidad] },
            properties: { severidad: r.severidad, version: r.version, desde: r.desde, zona: r.zona },
          })),
        },
      },
      originalUriBaseIds: { '%SRCROOT%': { uri: pathToFileURL(`${resultado.raiz.replace(/\\/g, '/')}/`).href } },
      columnKind: 'utf16CodeUnits',
      results,
      properties: { base: resultado.base, disparadores: resultado.disparadores, duracionMs: resultado.duracionMs },
    }],
  };
};
