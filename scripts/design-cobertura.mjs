/**
 * WEË DESIGN · EL MAPA MAESTRO Y LA MATRIZ DE COBERTURA, GENERADOS (Línea C, 2026-10-07).
 *
 *   node scripts/design-cobertura.mjs              → reescribe los dos documentos
 *   node scripts/design-cobertura.mjs --comprobar  → solo compara (lo mismo que la prueba)
 *
 * Una sola verdad: el registro de la referencia funcional (`constants/designReferencia.ts`) y su lógica
 * (`utils/designReferencia.ts`), ejecutados de verdad, más dos datos de documentación que la app no lee:
 *   docs/wee-design-capacidades.json  las descripciones (de los documentos, no de la interfaz)
 *   docs/wee-design-proveedores.json  la Matriz B: candidatos por capacidad (dato de la Línea B, MAPA 2)
 * Salen:
 *   docs/WEE-DESIGN-CAPABILITY-MAP.md   el mapa maestro (MAPA 1), por categorías A–L
 *   docs/WEE-DESIGN-COVERAGE-MATRIX.md  la matriz de cobertura (celdas YES / NO / N/A / PENDING), los diecinueve
 *                                       pasos, lo que falta, la Matriz B, la cadena y los inventarios de candidatos
 * `functions/test/design-referencia.mjs` falla si alguno de los dos no coincide con lo que sale de aquí.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { crearCargador } = await import(pathToFileURL(path.join(RAIZ, 'functions/test/filmmaker-cliente.mjs')).href);

export const DOCS = Object.freeze({
  mapa: 'docs/WEE-DESIGN-CAPABILITY-MAP.md',
  matriz: 'docs/WEE-DESIGN-COVERAGE-MATRIX.md',
});

const leerJson = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
const celda = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const fila = (cols) => `| ${cols.map(celda).join(' | ')} |`;
const tabla = (cabecera, filas) => [fila(cabecera), fila(cabecera.map(() => '---')), ...filas.map(fila)].join('\n');

/** Los textos en español de la app, leídos de sus diccionarios: los documentos dicen lo mismo que la pantalla. */
const crearTextos = (cargar) => {
  const cache = new Map();
  return (clave) => {
    const [modulo, k] = clave.split('.');
    if (!cache.has(modulo)) cache.set(modulo, cargar(`i18n/textos/es/${modulo}.ts`)[modulo]);
    const v = cache.get(modulo)?.[k];
    if (typeof v !== 'string') throw new Error(`sin texto en español: ${clave}`);
    return v;
  };
};

const PERFIL = Object.freeze({
  creatorFlow: 'CreatorFlow (Weë Brain pregunta, cotiza y crea)',
  trabajoExistente: 'Sobre un trabajo hecho (CreatorFlow)',
  abrirTrabajo: 'Abre un trabajo hecho',
  asincrono3d: 'Trabajo asíncrono (motor)',
  pasoDeImagen: 'Paso de imagen (motor)',
  local: 'Sin trabajo (Weë)',
  escena: 'Núcleo de escena (Weë)',
  visor: 'Visor 3D (Weë)',
  subida: 'Subida o captura (Weë)',
  plan: 'Plan de varios pasos (Weë Brain)',
  otraExperiencia: 'En otra experiencia de Weë',
  externo: 'Fuera de Weë (otro programa)',
  interna: 'Por dentro de otra capacidad',
  noAplica: '—',
});
const IMPACTO = Object.freeze({ nuevo: 'Nuevo', version: 'Versión', variante: 'Variante', derivado: 'Derivado', referencia: 'Referencia', ninguno: 'Ninguno' });
const EJECUTA = Object.freeze({ motor: 'Motor (el Router elige)', wee: 'Weë (sin IA)', externo: 'Otro programa', ninguno: '—' });
const MOVIL = Object.freeze({ completa: 'Completa', simplificada: 'Simplificada', escritorio: 'En escritorio (lo dice)', soloVer: 'Solo para ver', no_aplica: '—' });
const CANCELAR = Object.freeze({ no_existe: 'No existe', logica: 'Solo antes de empezar (lógica de Weë)', con_parada: 'Pedir parar (lo confirma el Job Engine)', no_aplica: '—' });
const SUPERFICIE_DE_LA_ENTRADA = Object.freeze({
  composer: 'Lienzo · caja', barraDelLienzo: 'Lienzo · barra', biblioteca: 'Biblioteca', inspector: 'Propiedades', franja: 'Trabajos',
  barraDeComandos: 'Barra de comandos', interna: '—', ninguna: '—',
});
const NOMBRE_DE_ORIGEN = Object.freeze({ wee: 'Weë', mundo: 'Weë (3D World de Weë Studio)' });

export const generar = () => {
  const cargar = crearCargador();
  const C = cargar('constants/designReferencia.ts');
  const U = cargar('utils/designReferencia.ts');
  const D3 = cargar('constants/design3d.ts');
  const texto = crearTextos(cargar);
  const descripciones = leerJson('docs/wee-design-capacidades.json').descripciones;
  const P = leerJson('docs/wee-design-proveedores.json');
  const caps = C.CAPACIDADES_DE_DESIGN;
  const nombre = (cap) => texto(cap.clave);
  const etiquetaDe = (origen) => {
    const o = P.origenes[origen];
    if (!o) throw new Error(`origen desconocido: ${origen}`);
    return origen === 'wee' || origen === 'mundo' ? NOMBRE_DE_ORIGEN[origen] : `${o.nombre} (${o.estado})`;
  };
  const listas = (id) => ({
    candidatos: P.candidatos[id] ?? [],
    web: P.soloEnLaWeb[id] ?? [],
    pronto: P.proximamente[id] ?? [],
    investigacion: P.investigacion[id] ?? [],
  });
  const origenDe = (cap) => {
    const l = listas(cap.id);
    const nombres = new Set();
    if (['EXISTING', 'PARTIAL', 'PLANNED', 'BACKEND_REQUIRED'].includes(cap.estado) || cap.ejecutaPor === 'wee' || l.candidatos.includes('wee')) nombres.add('Weë');
    const excluidos = P.excluidos?.[cap.id]?.origenes ?? [];
    for (const o of [...l.candidatos, ...excluidos, ...l.web, ...l.pronto, ...l.investigacion]) nombres.add(o === 'wee' || o === 'mundo' ? 'Weë' : P.origenes[o].nombre);
    return nombres.size ? [...nombres].join(', ') : 'Weë (propuesta)';
  };
  const dondeVive = (cap) => {
    const partes = [texto(C.CLAVE_DE_LA_ENTRADA[cap.entrada])];
    if (cap.intencion) partes.push(texto(C.CLAVE_DE_LA_INTENCION[cap.intencion]));
    if (cap.pestana) partes.push(texto(C.CLAVE_DE_LA_PESTANA[cap.pestana]));
    if (cap.seccion) partes.push(texto(C.CLAVE_DE_LA_SECCION[cap.seccion]));
    if (cap.padre) partes.push(`dentro de ${C.capacidadPorId(cap.padre)?.fila ?? cap.padre}`);
    return partes.join(' · ');
  };
  const panelDe = (cap) => {
    if (cap.entrada === 'biblioteca' && cap.pestana) return `Biblioteca · ${texto(C.CLAVE_DE_LA_PESTANA[cap.pestana])}`;
    if (cap.entrada === 'inspector' && cap.seccion) return `Propiedades · ${texto(C.CLAVE_DE_LA_SECCION[cap.seccion])}`;
    return SUPERFICIE_DE_LA_ENTRADA[cap.entrada];
  };
  const candidatosDe = (cap) => {
    const l = listas(cap.id);
    const partes = [];
    if (l.candidatos.length) partes.push(l.candidatos.map(etiquetaDe).join(', '));
    if (l.web.length) partes.push(`solo en su web: ${l.web.map((o) => P.origenes[o].nombre).join(', ')}`);
    if (l.pronto.length) partes.push(`próximamente: ${l.pronto.map((o) => P.origenes[o].nombre).join(', ')}`);
    if (l.investigacion.length) partes.push(`investigación: ${l.investigacion.map((o) => P.origenes[o].nombre).join(', ')}`);
    const ex = P.excluidos?.[cap.id];
    if (ex) partes.push(`no cuentan (${ex.motivo}): ${ex.origenes.map((o) => P.origenes[o].nombre).join(', ')}`);
    return partes.join(' · ') || '—';
  };
  const estadoHoy = (cap) => {
    const e = U.estadoDeLaCapacidad(cap);
    const nivel = texto(U.CLAVE_DEL_NIVEL[e.nivel]);
    return e.motivo ? `${nivel}: ${texto(e.motivo)}` : nivel;
  };
  const backendDe = (cap) => (cap.requiere.length ? cap.requiere.map((r) => texto(C.CLAVE_DEL_REQUISITO[r])).join(', ') : '—');
  const idDe = (cap) => `${cap.fila} · \`${cap.id}\``;

  const contar = (lista, f) => lista.reduce((o, x) => { const k = f(x); o[k] = (o[k] ?? 0) + 1; return o; }, {});
  const resumen = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ');
  const CABECERA = [
    '<!-- GENERADO por scripts/design-cobertura.mjs: no se edita a mano. -->',
  ];
  const fuentes = 'Sale de `constants/designReferencia.ts` y `utils/designReferencia.ts` (ejecutados), `docs/wee-design-capacidades.json` y '
    + '`docs/wee-design-proveedores.json`. Se regenera con `node scripts/design-cobertura.mjs`; `functions/test/design-referencia.mjs` '
    + 'falla si este documento no coincide.';

  /* ── El mapa maestro ─────────────────────────────────────────────────── */
  const mapa = [
    ...CABECERA,
    '# Weë Design — mapa maestro de capacidades (MAPA 1)',
    '',
    `> ${fuentes}`,
    '',
    'Las capacidades son de **Weë**; los proveedores son **candidatos** (Matriz B, dato de la Línea B). Ningún comando de Weë Design lleva '
      + 'el nombre de un proveedor, y lo que hoy nadie puede ejecutar se queda en el mapa, apagado y con su motivo. «Estado en Weë hoy» es '
      + 'lo que la referencia funcional dice al pulsarla, sin nada elegido.',
    '',
    `**${caps.length} capacidades.** Por estado: ${resumen(contar(caps, (c) => c.estado))}.`,
    `Por quién la ejecuta: ${resumen(contar(caps, (c) => EJECUTA[c.ejecutaPor]))}. Fuera de Weë Design: ${caps.filter((c) => !c.enDesign).length}.`,
    '',
    ...C.CATEGORIAS.flatMap((cat) => {
      const deLaCategoria = caps.filter((c) => c.categoria === cat);
      if (!deLaCategoria.length) return [];
      return [
        `## ${cat} · ${texto(C.CLAVE_DE_LA_CATEGORIA[cat])}`,
        '',
        tabla(
          ['ID', 'Capacidad', 'Descripción', 'Origen', 'Estado en Weë hoy', 'Entrada', 'Panel', 'Trabajo', 'Salida', 'Material', 'Ejecuta',
            'Candidatos', 'Elegibilidad', 'Jurisdicción', 'Credits', 'Le falta', 'Estado'],
          deLaCategoria.map((c) => [
            idDe(c),
            c.enDesign ? nombre(c) : `${nombre(c)} (fuera de Weë Design)`,
            descripciones[c.id],
            origenDe(c),
            estadoHoy(c),
            dondeVive(c),
            panelDe(c),
            PERFIL[c.perfil],
            texto(C.CLAVE_DE_LA_SALIDA[c.salida]),
            IMPACTO[c.impacto],
            EJECUTA[c.ejecutaPor],
            candidatosDe(c),
            `${texto(C.CLAVE_DE_LA_ELEGIBILIDAD[c.elegibilidad])} (\`${c.elegibilidad}\`)`,
            c.jurisdiccion ? 'Sí' : 'No',
            c.ejecutaPor === 'motor' ? 'Sí: precio del Credit Engine al cotizar' : 'No',
            backendDe(c),
            `**${c.estado}**`,
          ]),
        ),
        '',
      ];
    }),
  ].join('\n');

  /* ── La matriz de cobertura ──────────────────────────────────────────── */
  const COLS = U.COLUMNAS_DE_COBERTURA;
  const matrizA = caps.map((c) => ({ c, f: U.coberturaDe(c) }));
  const totales = COLS.map((col) => {
    const o = contar(matrizA, (x) => x.f[col]);
    return `${col}: ${['YES', 'PENDING', 'N/A', 'NO'].map((k) => `${k} ${o[k] ?? 0}`).join(' · ')}`;
  });
  const falta = U.loQueFalta();
  const faltaPorColumna = COLS.map((col) => {
    const ids = falta.filter((x) => x.columna === col);
    return ids.length ? `- **${col}** (${ids.length}): ${ids.map((x) => `\`${x.id}\`${x.estado === 'NO' ? ' (NO)' : ''}`).join(', ')}` : `- **${col}**: nada`;
  });
  const nombresDeOrigen = ['wee', 'tripo', 'meshy', 'sloyd', 'seed3d', 'mundo'];
  const matrizB = caps.map((c) => {
    const l = listas(c.id);
    const marca = (o) => (l.candidatos.includes(o) ? 'API' : l.web.includes(o) ? 'solo web' : l.pronto.includes(o) ? 'próximamente'
      : l.investigacion.includes(o) ? 'investigación' : '—');
    const otros = l.candidatos.filter((o) => !nombresDeOrigen.includes(o)).map((o) => P.origenes[o].nombre).join(', ') || '—';
    const autoalojables = (P.autoalojables?.[c.id] ?? []).join(', ') || '—';
    return [idDe(c), EJECUTA[c.ejecutaPor], `\`${c.elegibilidad}\``, ...nombresDeOrigen.map(marca), otros, autoalojables, P.notas?.[c.id] ?? ''];
  });
  const cadena = C.CADENA_DE_DESIGN.map((e) => [
    texto(e.clave),
    `\`${e.capacidad}\``,
    e.alternativas.map((a) => `\`${a}\``).join(', ') || '—',
    e.entra === 'texto' ? 'Palabras' : texto(C.CLAVE_DE_LA_SALIDA[e.entra]),
    texto(C.CLAVE_DE_LA_SALIDA[e.sale]),
    `\`${e.operacion}\``,
    e.opcional ? 'Sí' : 'No',
    `**${e.clase}**`,
    e.falta.map((f) => texto(C.CLAVE_DE_LO_QUE_FALTA[f])).join('; ') || '—',
  ]);
  const recorrida = U.recorrerCadena();
  const det = U.detecciones();
  const NOMBRE_DE_DETECCION = Object.freeze({
    ui_sin_backend: 'UI sin backend (se ve y se pulsa; el trabajo no existe todavía)',
    backend_sin_ui: 'Backend sin UI (hay trabajo y nadie lo abre)',
    capacidad_sin_trabajo: 'Capacidad del motor sin Job',
    trabajo_sin_resultado: 'Job sin resultado',
    resultado_sin_material: 'Resultado sin Asset',
    material_sin_version: 'Asset sin Version',
    error_sin_ui: 'Error sin UI',
    sin_reintento: 'Sin retry',
    sin_cancelacion: 'Sin cancelación (hay trabajo y no se puede pedir parar)',
    cancelacion_sin_confirmacion: 'Cancelación pedida sin confirmación del Job Engine',
    version_sin_backend: 'Operación de versión sin backend',
  });
  const tres = D3.capacidades3D();
  const contratos = D3.CONTRATOS_3D.map((k) => D3.contrato3D(k));
  const PASOS = U.PASOS;

  const matriz = [
    ...CABECERA,
    '# Weë Design — matriz de cobertura',
    '',
    `> ${fuentes}`,
    '',
    'Una capacidad está **cubierta** cuando tiene todo el recorrido: CAPACIDAD → ORDEN → PUNTO DE ENTRADA → PANEL → OPCIONES → PRECIO → '
      + 'TRABAJO → PROGRESO → RESULTADO → LO QUE SIGUE → MATERIAL / PROYECTO / VERSIÓN. Cada celda es exactamente una de cuatro:',
    '',
    '- **YES**: hay una pieza de verdad (código o servidor que funciona hoy).',
    '- **PENDING**: está diseñado y representado en la referencia (apagado con su motivo, o recorrible en simulación marcada), y espera algo: '
      + 'servidor, proveedor autorizado, visor, linaje o una decisión.',
    '- **N/A**: no aplica a esa capacidad, dicho a propósito.',
    '- **NO**: falta y nadie lo ha diseñado.',
    '',
    '## 1. Matriz A — cobertura por capacidad',
    '',
    tabla(['Capability', ...COLS], matrizA.map(({ c, f }) => [idDe(c), ...COLS.map((col) => f[col])])),
    '',
    'Totales por columna:',
    '',
    ...totales.map((t) => `- ${t}`),
    '',
    '## 2. Los diecinueve pasos de cada capacidad',
    '',
    tabla(['Capability', ...PASOS.map((p) => texto(U.CLAVE_DEL_PASO[p]))], caps.map((c) => {
      const r = U.recorridoDe(c);
      return [idDe(c), ...PASOS.map((p) => r[p])];
    })),
    '',
    `## 3. Lo que falta (${falta.length} celdas NO o PENDING en la Matriz A)`,
    '',
    ...faltaPorColumna,
    '',
    '## 3b. Detecciones automáticas',
    '',
    'Cruces de columnas de la Matriz A (`deteccionesDe`), sin opinión: YES y PENDING cuentan como «hay»; NO y N/A como «no hay». '
      + 'Error, Retry, Cancel Request y Cancelled son columnas propias: **CANCEL REQUEST ≠ CANCELLED** (pedir parar no es haber parado; '
      + 'solo el Job Engine confirma la parada).',
    '',
    tabla(['Detección', 'Capacidades', 'Cuáles'], U.DETECCIONES.map((k) => [NOMBRE_DE_DETECCION[k], String(det[k].length),
      det[k].map((id) => `\`${id}\``).join(', ') || '—'])),
    '',
    '## 4. Matriz B — elegibilidad de proveedor (dato de la Línea B; no decide nada)',
    '',
    'La capacidad es de Weë; esta tabla solo dice quién PODRÍA servirla y cómo: **API** (candidato con API), **solo web** (no integrable: '
      + 'NOT_ALLOWED como integración), **próximamente** y **investigación** (no son candidatos hoy). La columna «Agregada» es la que viaja a la app '
      + '(sin un solo nombre), y la prueba exige que coincida con esta tabla. Estados de cada candidato: '
      + `${Object.entries(P.origenes).map(([k, o]) => `${o.nombre} → ${o.estado}`).join(' · ')}.`,
    '',
    tabla(['Capability', 'Ejecuta', 'Agregada', 'Weë', 'Tripo', 'Meshy', 'Sloyd', 'Seed3D', 'Mundo (Weë Studio)', 'Otros con API (r3–r5)', 'Autoalojables (r4, no candidatos hoy)', 'Nota'], matrizB),
    '',
    '## 5. MODEL-AGNOSTIC CHAINING — de la imagen al objeto sin salir de Weë Design',
    '',
    'Lo que sale de un eslabón entra en el siguiente como MATERIAL de Weë, por referencia y con su linaje; nunca como un archivo descargado y '
      + 'vuelto a subir. La imagen es la capacidad de imagen que Weë ya tiene (el WEË AI ENGINE elige el modelo); ningún eslabón nombra a nadie. '
      + 'Detalle: `docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md` §11.',
    '',
    tabla(['Eslabón', 'Capacidad', 'Alternativas', 'Entra', 'Sale', 'Operación (Content Core)', 'Opcional', 'Clase hoy', 'Le falta para encadenarse'], cadena),
    '',
    'La cadena, simulada de punta a punta (`recorrerCadena`): cada resultado entra en el siguiente y queda en su linaje.',
    '',
    tabla(['Paso', 'Material', 'Trabajo', 'Viene de', 'Relación', 'Linaje'], recorrida.map((r, i) => [
      String(i + 1), `\`${r.materialId}\``, `\`${r.trabajoId}\``, r.padreId ? `\`${r.padreId}\`` : '—', r.relacion,
      r.linaje.map((p) => p.capacidadId).join(' › '),
    ])),
    '',
    '## 5b. Capacidades 3D — una sola fuente',
    '',
    'Las del catálogo del Core de categoría `3d` (filtradas de `CAPABILITY_CATALOG`, no copiadas) más las propuestas del registro de Design. '
      + 'La clase se DERIVA del estado del catálogo y de las filas que la usan (`clasificar3D`). La lista tipada del Core (`CapabilityId`) '
      + 'solo nombra `world.generate`: las `3d.*` no se añaden porque las haría enrutables sin adaptador (cambiaría producción).',
    '',
    tabla(['Capacidad', 'En el catálogo', 'Clase', 'Filas de Design'], tres.map((x) => [`\`${x.id}\``,
      x.enElCatalogo ? x.enElCatalogo.status : 'no (propuesta)', `**${x.clase}**`, x.usadaPor.map((id) => `\`${id}\``).join(', ') || '—'])),
    '',
    'Capacidades distintas, no alias (`SEMANTICA_3D`): '
      + Object.entries(D3.SEMANTICA_3D).map(([k, v]) => `\`${k}\` = ${v}`).join(' · ')
      + `. No son capacidades (atributo de la fila): ${D3.ATRIBUTOS_NO_CAPACIDAD.map((a) => `\`${a}\``).join(', ')}. `
      + `Composiciones (cadena, no alias): ${D3.COMPOSICIONES_3D.map((x) => `\`${x.fila}\` = ${x.capacidades.join(' → ')}`).join(', ')}.`,
    '',
    tabla(['Capacidad', 'Catalogada', 'Implementada', 'Enrutable'], tres.map((x) => {
      const e = D3.tresEstados3D(String(x.id));
      return [`\`${x.id}\``, e.catalogada ? 'Sí' : 'No', e.implementada ? 'Sí (apagada)' : 'No', e.enrutable ? 'Sí' : 'No'];
    })),
    '',
    '## 5c. Contrato 3D de Design',
    '',
    'Design Capability → parámetros → capacidad del Core → Job → resultado → Asset → Version. Sin APIs externas; nada marcado como implementado. '
      + `Exportación GLB/USDZ: **${D3.EXPORTACION_3D.estado}** (sin exportador en el Core; se reutiliza \`${D3.EXPORTACION_3D.reutiliza}\`).`,
    '',
    tabla(['Contrato', 'Fila', 'Capacidad del Core', 'Parámetros', 'Job', 'Resultado', 'Asset', 'Version', 'Clase'], contratos.map((e) => [
      e.contrato, `\`${e.fila}\``, e.capacidadDelCore ? `\`${e.capacidadDelCore}\`` : '— (Weë, sin IA)', e.parametros.join(', '), PERFIL[e.trabajo],
      texto(C.CLAVE_DE_LA_SALIDA[e.resultado]), IMPACTO[e.material], e.version, `**${e.clase}**`])),
    '',
    '## 6. Seed3D 2.0 — inventario funcional → capacidades de Weë',
    '',
    `Fuente: \`scratchpad/linea-b/seed3d.md\` §2 (Línea B). Estado del candidato: ${P.seed3d.estado}. Ciclo: ${P.seed3d.ciclo}`,
    '',
    tabla(['#', 'Capacidad (fuente)', 'Clase', 'Capacidades de Weë'], P.seed3d.inventario.map((x) => [x.id, x.capacidad, `**${x.clase}**`,
      x.wee.map((w) => `\`${w}\``).join(', ') || '—'])),
    '',
    '## 7. Sloyd — inventario funcional → capacidades de Weë',
    '',
    `Fuente: \`scratchpad/linea-b/sloyd.md\` §3 y §10 (Línea B). Estado del candidato: ${P.sloyd.estado}. Ciclo: ${P.sloyd.ciclo}`,
    '',
    tabla(['#', 'Capacidad (fuente)', 'API', 'Capacidades de Weë'], P.sloyd.inventario.map((x) => [x.id, x.capacidad, x.api,
      x.wee.map((w) => `\`${w}\``).join(', ') || '—'])),
    '',
  ].join('\n');

  return { [DOCS.mapa]: `${mapa.trimEnd()}\n`, [DOCS.matriz]: `${matriz.trimEnd()}\n` };
};

const esElPrincipal = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esElPrincipal) {
  const docs = generar();
  if (process.argv.includes('--comprobar')) {
    const distintos = Object.entries(docs).filter(([rel, contenido]) => {
      const p = path.join(RAIZ, rel);
      return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== contenido;
    }).map(([rel]) => rel);
    console.log(distintos.length ? `no coinciden: ${distintos.join(', ')}` : 'los documentos de cobertura están al día');
    process.exit(distintos.length ? 1 : 0);
  }
  for (const [rel, contenido] of Object.entries(docs)) {
    fs.writeFileSync(path.join(RAIZ, rel), contenido);
    console.log(`${rel}: ${contenido.split('\n').length} líneas`);
  }
}
