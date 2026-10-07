/*
 * WEË 3D MULTIPROVEEDOR — PREPARAR NO ES INTEGRAR (Línea B, 2026-10-07). docs/3D-MULTIPROVEEDOR.md.
 *
 * La arquitectura para que Tripo, Meshy, fal.ai y los que vengan atiendan las capacidades 3D de Weë es la que YA existe
 * —catálogo del Core, registro, elegibilidad, Router, conductor, Job Engine, Credit Engine, Content Core— y este
 * documento solo la extiende sobre el papel. Esta suite vigila cinco cosas, sin red, sin clave y sin proveedor ($0):
 *
 *   A · que lo preparado sigue APAGADO: ni adaptador, ni cadena, ni resolutor, ni clave, ni host, ni un nombre de Tripo
 *       o de Meshy fuera del registro de matrices pendientes; y la app no los nombra (la persona nunca elige proveedor);
 *   B · que el vocabulario que usa el documento es el del Core (`familia.verbo`): lo que existe existe, lo propuesto no
 *       existe todavía, y la única capacidad 3D enrutable sigue siendo `world.generate`;
 *   C · las PRECONDICIONES DE ACTIVACIÓN: pasan hoy y fallan el día que alguien enchufe un modelo 3D sin cerrar las
 *       brechas que el documento mide (servicio de Credits propio, suelo de coste en modo prueba, clase de material,
 *       modalidad, gobierno completo, nacer apagado, plazos);
 *   D · que el documento dice lo que el código dice (rutas que existen, mapa de capacidades, estado final, decisiones);
 *   E · los dos mapas, sin mezclarse: MAPA 1 (lo que Weë sabe hacer, sin proveedores) y MAPA 2 (quién puede ejecutar cada
 *       capacidad y con qué condiciones, según la investigación dedicada: una etiqueta de autorización por fila, nunca
 *       inventada; Tripo con autorización escrita, Meshy con Enterprise; lo que solo es web, NOT_ALLOWED; las exclusiones
 *       de Weë en su columna y no en la de los términos; y la selección A–E sin B).
 *
 * Cada regla tiene su CONTROL con una entrada saboteada (sección F): un detector que no ve nada no prueba nada.
 *
 *   node functions/test/multiproveedor-3d.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const lib = (p) => require(path.resolve(AQUI, '../lib/', p));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
const archivos = (dir, filtro) => (existe(dir) ? fs.readdirSync(path.join(RAIZ, dir), { recursive: true }) : [])
  .map((f) => `${dir}/${String(f).split(path.sep).join('/')}`)
  .filter((r) => !/(^|\/)node_modules\//.test(r) && filtro(r));

const reg = lib('engine/registry.js');
const { DECLARED } = lib('engine/verification.js');
const { datosDelRegistro } = lib('registry/index.js');
const { CAPABILITY_CATALOG } = lib('core/registry/capabilities.js');
const { modalityOf } = lib('engine/types.js');
const { tipoDeMaterialDe } = lib('runtime/materializacion.js');
const { PLAZOS_POR_CAPACIDAD, revisarPlazos } = lib('runtime/plazos.js');
const { creditsFor, estimateUsd } = lib('engine/pricing.js');
const { CREDIT_COSTS, serviceForCapability } = lib('credits/creditCosts.js');
const { usdToCredits } = lib('credits/aiPricing.js');
const { elegibleEnAlgunaJurisdiccion } = lib('engine/elegibilidad.js');
const secretos = lib('secrets.js');

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => {
  n++;
  if (cond) console.log(`✔ ${n}) ${name}`);
  else { failures++; console.log(`✘ ${n}) ${name}${detail ? ` — ${detail}` : ''}`); }
};
const seccion = (letra, fn) => {
  try { fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};

/* ── Lo que esta línea PREPARA y no integra ─────────────────────────────── */

/**
 * Los proveedores 3D que se preparan en esta misión. fal ya está integrado (apagado) y lo vigila `proveedor-fal`. Sloyd y
 * Seed3D entraron en el alcance el 2026-10-07 y están PENDING DEPENDENCY (sus investigaciones las hacen otros): apagados.
 */
const CANDIDATOS = ['tripo', 'meshy', 'sloyd', 'seed3d'];
/** Las matrices 3D que el registro puede declarar PENDING (dos en main; Meshy y World Labs, en `filmmaker/core`). */
const MATRICES_3D_PENDIENTES = ['tripo', 'meshy', 'sloyd', 'seed3d', 'hunyuan3d', 'worldlabs'];
/* Con límites de palabra: «tripOneDay» (i18n de Weë Travel) o «Trípoli» no son Tripo. */
const NOMBRE = /\b(tripo|tripo3d|meshy|sloyd|seed-?3d)\b/i;
const CLAVE = /\b(TRIPO|MESHY|SLOYD|SEED3D)_[A-Z0-9_]+\b/;
const HOST = /\b(?:[a-z0-9-]+\.)*(tripo3d\.ai|meshy\.ai)\b/i;
/** El único archivo de functions/src que puede nombrarlos hoy: el de las matrices PENDING (sin capacidades). */
const PUEDEN_NOMBRARLOS = new Set(['functions/src/registry/matrices.ts']);

/** Dónde aparece un candidato en el cableado del motor. Vacío es lo correcto. */
const integraciones = (r, declarados, candidatos = CANDIDATOS) => {
  const donde = [];
  for (const c of candidatos) {
    if (Object.prototype.hasOwnProperty.call(r.ADAPTERS, c)) donde.push(`ADAPTERS.${c}`);
    if (Object.prototype.hasOwnProperty.call(r.DEFAULT_PROVIDERS, c)) donde.push(`DEFAULT_PROVIDERS.${c}`);
    if (Object.prototype.hasOwnProperty.call(r.RESOLUTORES_DE_ESTADO, c)) donde.push(`RESOLUTORES_DE_ESTADO.${c}`);
    if (Object.prototype.hasOwnProperty.call(declarados, c)) donde.push(`DECLARED.${c}`);
    for (const [cap, ruta] of Object.entries(r.DEFAULT_ROUTING)) {
      if ((ruta.chain || []).some((l) => l.provider === c)) donde.push(`DEFAULT_ROUTING.${cap}→${c}`);
    }
    for (const a of Object.values(r.ADAPTERS)) {
      for (const m of a.models || []) if (String(m.provider).toLowerCase() === c || NOMBRE.test(String(m.id))) donde.push(`modelo ${a.id}/${m.id}`);
    }
  }
  return donde;
};

/** Las matrices 3D del registro que prometen algo (capacidades, modelos, adaptador o credencial). Vacío es lo correcto. */
const matricesQuePrometen = (datos) => datos.providers
  .filter((p) => MATRICES_3D_PENDIENTES.includes(p.id))
  .filter((p) => p.status !== 'PENDING' || (p.capabilities || []).length > 0 || p.adapterId || p.credentialEnv
    || datos.models.some((m) => m.providerId === p.id))
  .map((p) => p.id);

/** Lo que un texto dice de un candidato: su nombre, su clave o su host. */
const nombra = (texto) => [NOMBRE, CLAVE, HOST].filter((re) => re.test(texto)).map((re) => texto.match(re)[0]);

/* ── El vocabulario: lo que el documento usa ────────────────────────────── */

/**
 * EL MAPA DEL DOCUMENTO (§ F): de la lista del dueño a las capacidades del Core. Las que ya existen en el catálogo, y
 * las que el documento PROPONE con la misma forma. Si cambia aquí, cambia en el documento (lo comprueba D).
 */
const MAPA = Object.freeze({
  TEXT_TO_3D: '3d.generate',
  IMAGE_TO_3D: '3d.generate',
  MULTI_IMAGE_TO_3D: '3d.generate',
  REMESH: '3d.retopology',
  RETEXTURE: '3d.texture',
  RIG: '3d.rig',
  ANIMATE: '3d.animate',
  CONVERT: '3d.convert',
  WORLD_GENERATE: 'world.generate',
  WORLD_EDIT: 'world.edit',
  SCENE_GENERATE: 'scene.generate',
});
const PROPUESTAS = Object.freeze(['3d.animate', 'world.edit']);
const FORMA_DE_CAPACIDAD = /^[a-z0-9]+\.[a-z0-9_]+$/;

const enCatalogo = (catalogo, id) => catalogo.some((e) => e.id === id);
/** Las capacidades 3D del catálogo: su categoría o su modalidad es 3D. */
const capacidades3D = (catalogo) => catalogo.filter((e) => e.category === '3d' || e.produces === '3d');

/* ── Las precondiciones de activación ───────────────────────────────────── */

/** Una capacidad es 3D si su modalidad en el motor lo es o si el catálogo la pone en la familia 3D. */
const es3D = (catalogo, cap) => modalityOf(cap) === '3d' || catalogo.some((e) => e.id === cap && (e.category === '3d' || e.produces === '3d'));

/** Cada modelo de cada adaptador que declara una capacidad 3D, con esa capacidad. */
const modelos3D = (adapters, catalogo) => Object.values(adapters).flatMap((a) =>
  (a.models || []).flatMap((m) => (m.capabilities || []).filter((c) => es3D(catalogo, c)).map((cap) => ({ adaptador: a, modelo: m, cap }))));

const AJUSTES = reg.DEFAULT_SETTINGS;
const EN_PRUEBA = { ...AJUSTES, pricingMode: 'simulated' };

/** Servicio de Credits propio: ni el de texto por defecto, ni uno que el catálogo no tenga. */
const sinServicioPropio = (adapters, catalogo, servicio = serviceForCapability, costes = CREDIT_COSTS) =>
  [...new Set(modelos3D(adapters, catalogo).map((x) => x.cap))]
    .filter((cap) => { const s = servicio(cap, {}); return s === 'ai_text' || s === 'ai_text_pro' || !Object.prototype.hasOwnProperty.call(costes, s); });

/** «Nunca por debajo del coste», también en el modo de PRUEBA (el de producción por defecto). */
const porDebajoDelCoste = (adapters, catalogo, credits = creditsFor) => modelos3D(adapters, catalogo).flatMap(({ adaptador, modelo, cap }) => {
  const usd = estimateUsd(modelo, cap, {}, {});
  const cobrado = credits(cap, usd, EN_PRUEBA, false, {});
  const coste = usdToCredits(usd, AJUSTES);
  return cobrado >= coste ? [] : [`${adaptador.id}/${modelo.id} en ${cap}: ${cobrado} Credits por un coste de ${coste}`];
});

const claseErronea = (adapters, catalogo, clase = tipoDeMaterialDe) => [...new Set(modelos3D(adapters, catalogo).map((x) => x.cap))]
  .filter((cap) => !['model3d', 'world'].includes(clase(cap))).map((cap) => `${cap} → ${clase(cap)}`);

const modalidadErronea = (adapters, catalogo, modalidad = modalityOf) => [...new Set(modelos3D(adapters, catalogo).map((x) => x.cap))]
  .filter((cap) => modalidad(cap) !== '3d').map((cap) => `${cap} → ${modalidad(cap)}`);

const CAMPOS_DEL_GOBIERNO = ['providerModelId', 'version', 'reviewStatus', 'active', 'commercialUseStatus', 'licenseStatus',
  'outputRightsStatus', 'attributionRequired', 'licencias', 'pricingMode', 'providerPricing', 'inputSchema', 'outputSchema',
  'fuentes', 'lastVerifiedAt', 'motivo'];
const gobiernoIncompleto = (adapters, catalogo) => modelos3D(adapters, catalogo).flatMap(({ adaptador, modelo }) => {
  const g = modelo.gobierno;
  if (!g) return [`${adaptador.id}/${modelo.id}: sin gobierno`];
  const faltan = CAMPOS_DEL_GOBIERNO.filter((k) => g[k] === undefined || g[k] === null || g[k] === '');
  const licencias = Array.isArray(g.licencias) && g.licencias.length > 0 && g.licencias.every((l) => /^https:\/\//.test(String(l.url)));
  const principales = (g.outputSchema || []).filter((c) => c.tipo === 'file' && (c.papel ?? 'principal') === 'principal').length;
  const fuente = !!g.providerPricing && /^https:\/\//.test(String(g.providerPricing.fuente));
  return [
    ...(faltan.length ? [`${adaptador.id}/${modelo.id}: falta ${faltan.join(', ')}`] : []),
    ...(licencias ? [] : [`${adaptador.id}/${modelo.id}: licencias sin https`]),
    ...(principales === 1 ? [] : [`${adaptador.id}/${modelo.id}: ${principales} archivos principales`]),
    ...(fuente ? [] : [`${adaptador.id}/${modelo.id}: precio del proveedor sin fuente`]),
  ];
});

/** Nadie nace encendido: un modelo 3D ACTIVE sin revisión APPROVED, o elegible en alguna jurisdicción hoy. */
const encendidos = (adapters, catalogo) => modelos3D(adapters, catalogo).flatMap(({ adaptador, modelo }) => [
  ...(modelo.gobierno && modelo.gobierno.active === 'ACTIVE' && modelo.gobierno.reviewStatus !== 'APPROVED' ? [`${adaptador.id}/${modelo.id}: ACTIVE sin APPROVED`] : []),
  ...(elegibleEnAlgunaJurisdiccion(modelo, undefined) ? [`${adaptador.id}/${modelo.id}: elegible en alguna jurisdicción`] : []),
]);

/** Una capacidad 3D servida por un proveedor que acepta y suelta (tiene resolutor) necesita SUS relojes, coherentes. */
const sinPlazos = (adapters, catalogo, resolutores = reg.RESOLUTORES_DE_ESTADO, plazos = PLAZOS_POR_CAPACIDAD) =>
  [...new Set(modelos3D(adapters, catalogo).filter((x) => Object.prototype.hasOwnProperty.call(resolutores, x.adaptador.id)).map((x) => x.cap))]
    .flatMap((cap) => (!Object.prototype.hasOwnProperty.call(plazos, cap) ? [`${cap}: sin plazos`]
      : revisarPlazos(plazos[cap]).map((f) => `${cap}: ${f}`)));

/* ═══ A · LO PREPARADO SIGUE APAGADO ════════════════════════════════════════ */
console.log('\n── A · Tripo y Meshy: preparados, no integrados ──');
seccion('A', () => {
  const donde = integraciones(reg, DECLARED);
  check('A1) ni Tripo, ni Meshy, ni Sloyd, ni Seed3D están en el cableado del motor: sin adaptador, sin configuración, sin cadena, sin resolutor, sin ficha de verificación ni modelos',
    donde.length === 0, donde.join(', '));

  const datos = datosDelRegistro();
  const prometen = matricesQuePrometen(datos);
  check('A2) Tripo está declarado como matriz PENDING; ninguna matriz 3D pendiente (Tripo, Meshy, Hunyuan 3D, World Labs) promete capacidades, modelos, adaptador ni credencial',
    datos.providers.some((p) => p.id === 'tripo' && p.type === 'matrix' && p.status === 'PENDING') && prometen.length === 0, prometen.join(', '));

  const fuentes = archivos('functions/src', (r) => r.endsWith('.ts'));
  const conNombre = fuentes.filter((f) => !PUEDEN_NOMBRARLOS.has(f) && NOMBRE.test(leer(f)));
  const conClaveOHost = fuentes.filter((f) => CLAVE.test(leer(f)) || HOST.test(leer(f)));
  check('A3) en functions/src solo el registro de matrices pendientes nombra a Tripo, Meshy, Sloyd o Seed3D, y NINGÚN archivo lleva su clave ni su host (no hay con qué llamarlos)',
    fuentes.length > 100 && conNombre.length === 0 && conClaveOHost.length === 0, [...conNombre, ...conClaveOHost].join(', '));

  const llaveros = [...secretos.PROVIDER_SECRET_NAMES, ...secretos.MEDIA_SECRET_NAMES, ...secretos.FAL_SECRET_NAMES];
  check('A4) API keys NO: ningún llavero de Secret Manager declara una clave de Tripo, Meshy, Sloyd o Seed3D (su configuración futura solo está DISEÑADA)',
    llaveros.length >= 10 && !llaveros.some((s) => CLAVE.test(s)) && !CLAVE.test(leer('functions/src/secrets.ts')), llaveros.filter((s) => CLAVE.test(s)).join(', '));

  const configuracion = [
    ...archivos('.github/workflows', (r) => /\.ya?ml$/.test(r)),
    ...archivos('ops', (r) => r.endsWith('.json')),
    ...['firebase.json', 'app.json', 'eas.json'].filter(existe),
  ];
  const enConfiguracion = configuracion.filter((f) => CLAVE.test(leer(f)) || HOST.test(leer(f)));
  check('A5) ni la CI, ni el despliegue, ni la configuración montan una clave o un host de Tripo o de Meshy',
    configuracion.length > 3 && enConfiguracion.length === 0, enConfiguracion.join(', '));

  const app = [
    ...['services', 'hooks', 'utils', 'screens', 'components', 'constants', 'contexts', 'navigation']
      .flatMap((d) => archivos(d, (r) => /\.tsx?$/.test(r) && !r.startsWith('services/filmmaker/espejo/'))),
    ...archivos('i18n', (r) => r.endsWith('.ts')),
    ...['App.tsx'].filter(existe),
  ];
  const enLaApp = app.filter((f) => nombra(leer(f)).length > 0);
  check('A6) la app —pantallas, servicios, catálogos y los textos de todos los idiomas— no nombra a Tripo, Meshy, Sloyd ni Seed3D, ni su clave, ni su host: la persona nunca elige proveedor',
    app.length > 300 && enLaApp.length === 0, enLaApp.join(', '));
});

/* ═══ B · EL VOCABULARIO DEL CORE ══════════════════════════════════════════ */
console.log('\n── B · Las capacidades: las del Core, con su forma ──');
seccion('B', () => {
  const existentes = [...new Set(Object.values(MAPA))].filter((c) => !PROPUESTAS.includes(c));
  const faltan = existentes.filter((c) => !enCatalogo(CAPABILITY_CATALOG, c));
  check('B1) cada capacidad a la que el documento lleva la lista del dueño EXISTE en el catálogo del Core (no hay vocabulario paralelo)',
    existentes.length === 7 && faltan.length === 0, faltan.join(', '));
  const yaExisten = PROPUESTAS.filter((c) => enCatalogo(CAPABILITY_CATALOG, c));
  check('B2) y las que PROPONE (`3d.animate`, `world.edit`) todavía no existen: si alguien las añade, el documento deja de llamarlas propuestas',
    yaExisten.length === 0, yaExisten.join(', '));
  check('B3) todas con la forma `familia.verbo` del catálogo', Object.values(MAPA).every((c) => FORMA_DE_CAPACIDAD.test(c)));
  const enrutables = capacidades3D(CAPABILITY_CATALOG).filter((e) => e.status === 'ROUTABLE').map((e) => e.id);
  check('B4) la única capacidad 3D enrutable es `world.generate`: las `3d.*` siguen DECLARED, sin cadena ni proveedor',
    enrutables.length === 1 && enrutables[0] === 'world.generate'
    && capacidades3D(CAPABILITY_CATALOG).filter((e) => e.id.startsWith('3d.')).every((e) => e.status === 'DECLARED'), enrutables.join(', '));
  const declaradas = archivos('functions/src', (r) => r.endsWith('.ts'))
    .flatMap((f) => [...leer(f).matchAll(/const\s+CAPACIDAD_DEL_CANARY\s*(?::\s*\w+)?\s*=\s*'([^']+)'/g)].map((m) => m[1]));
  check('B5) ninguna puerta del conductor declara una capacidad `3d.*`: abrir una cuarta puerta para objetos 3D es una decisión del dueño (CLAUDE.md §10)',
    declaradas.length >= 3 && !declaradas.some((c) => c.startsWith('3d.')) && declaradas.filter((c) => es3D(CAPABILITY_CATALOG, c)).every((c) => c === 'world.generate'),
    declaradas.join(', '));
});

/* ═══ C · LAS PRECONDICIONES DE ACTIVACIÓN (pasan hoy) ═════════════════════ */
console.log('\n── C · Lo que tiene que ser verdad antes de que un modelo 3D atienda ──');
seccion('C', () => {
  const hoy = modelos3D(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C0) hoy hay exactamente un modelo 3D en los adaptadores (el de mundos, en fal) y atiende `world.generate`',
    hoy.length === 1 && hoy[0].adaptador.id === 'fal' && hoy[0].cap === 'world.generate', hoy.map((x) => `${x.adaptador.id}/${x.modelo.id}:${x.cap}`).join(', '));
  const s = sinServicioPropio(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C1) toda capacidad 3D con un modelo tiene su servicio de Credits propio (no el de texto por defecto)', s.length === 0, s.join(', '));
  const d = porDebajoDelCoste(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C2) y su precio, en el modo de PRUEBA, no queda por debajo del coste de ningún modelo que la atiende', d.length === 0, d.join(' | '));
  const c = claseErronea(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C3) lo que produce se guarda como material 3D (`model3d` o `world`), nunca como imagen ni como documento', c.length === 0, c.join(', '));
  const m = modalidadErronea(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C4) su modalidad en el motor es `3d` (plazos, cupo y libro de 3D)', m.length === 0, m.join(', '));
  const g = gobiernoIncompleto(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C5) todo modelo 3D —de un agregador o de una matriz— declara su gobierno completo: licencia, uso comercial, derechos del resultado, precio con fuente, esquemas y un solo archivo principal',
    g.length === 0, g.join(' | '));
  const e = encendidos(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C6) ninguno nace encendido y ninguno es elegible hoy en ninguna jurisdicción (World 3D OFF, Hunyuan OFF)', e.length === 0, e.join(' | '));
  const p = sinPlazos(reg.ADAPTERS, CAPABILITY_CATALOG);
  check('C7) una capacidad 3D asíncrona tiene sus relojes por capacidad, y se sostienen (proveedor < trabajo < horizonte)', p.length === 0, p.join(', '));
});

/* ═══ D · EL DOCUMENTO DICE LO QUE DICE EL CÓDIGO ═══════════════════════════ */
console.log('\n── D · docs/3D-MULTIPROVEEDOR.md ──');
const DOC = 'docs/3D-MULTIPROVEEDOR.md';
/** Rutas que el documento PROPONE (no existen todavía, a propósito). Cualquier otra ruta que cite tiene que existir. */
const RUTAS_PROPUESTAS = Object.freeze([
  'functions/src/core/modelo3d.ts',
  'functions/src/engine/modelo3d.ts',
  'functions/src/engine/providers/tripo.ts',
  'functions/src/engine/providers/tripo-modelos.ts',
  'functions/src/engine/providers/meshy.ts',
  'functions/src/engine/providers/meshy-modelos.ts',
  'functions/src/creator/modelo3d.ts',
  'utils/crearModelo3D.ts',
  'services/modelo3dService.ts',
  'ops/evals/datasets/router/modelo3d-v1.json',
  'ops/evals/baseline/router-modelo3d.json',
]);
const rutasCitadas = (texto) => [...new Set([...texto.matchAll(/`((?:functions|docs|ops|utils|services|screens|components|constants|hooks|scripts)\/[A-Za-z0-9_./-]+\.(?:ts|tsx|mjs|md|json))`/g)].map((m) => m[1]))];
seccion('D', () => {
  check('D1) el documento existe', existe(DOC));
  const doc = existe(DOC) ? leer(DOC) : '';
  const citadas = rutasCitadas(doc);
  const inventadas = citadas.filter((r) => !RUTAS_PROPUESTAS.includes(r) && !existe(r));
  check(`D2) cada ruta que cita (${citadas.length}) existe en el repositorio, salvo las que declara PROPUESTAS`, citadas.length >= 40 && inventadas.length === 0, inventadas.join(', '));
  const propuestasSinMarcar = RUTAS_PROPUESTAS.filter((r) => existe(r));
  check('D3) y ninguna ruta propuesta existe ya (si existe, ya no es una propuesta: hay que actualizar el documento)', propuestasSinMarcar.length === 0, propuestasSinMarcar.join(', '));
  const filas = Object.entries(MAPA).filter(([k, v]) => !new RegExp(`\\|\\s*\`${k}\`\\s*\\|[^\\n]*\`${v.replace('.', '\\.')}\``).test(doc)).map(([k]) => k);
  check('D4) el mapa de capacidades del documento es el de esta suite, fila a fila', filas.length === 0, filas.join(', '));
  const estado = ['Algorithm Engine CONTINÚA EN SU MISIÓN — NO INTERFERIDO', 'Tripo OFF', 'Meshy OFF', 'fal.ai OFF', 'Hunyuan OFF', 'World 3D OFF',
    'API keys NO', 'Real calls NO', 'Production deploy NO', 'Real spend NO'];
  const sinEstado = estado.filter((x) => !doc.includes(x));
  check('D5) declara el estado final obligatorio, entero', sinEstado.length === 0, sinEstado.join(', '));
  const decisiones = [...doc.matchAll(/\bD3D-(\d+)\b/g)].map((m) => Number(m[1]));
  const brechas = [...doc.matchAll(/\bG3D-(\d+)\b/g)].map((m) => Number(m[1]));
  check('D6) lista sus decisiones pendientes (D3D-n) y sus brechas medidas (G3D-n), numeradas sin huecos',
    decisiones.length > 0 && brechas.length > 0
    && [...new Set(decisiones)].sort((a, b) => a - b).every((v, i) => v === i + 1) && [...new Set(brechas)].sort((a, b) => a - b).every((v, i) => v === i + 1));
  check('D7) y sus dependencias con la Línea A (el Algorithm Engine), para moverlas al integrar', /Dependencias con la L[ií]nea A/i.test(doc) && /DECISIONES-PENDIENTES\.md/.test(doc));
  check('D8) esta suite está en la cadena de `npm test`', /multiproveedor-3d\.test\.mjs/.test(leer('functions/package.json')));
});

/* ═══ E · MAPA 1 Y MAPA 2: LA CAPACIDAD ES DE WEË ═══════════════════════════ */
console.log('\n── E · MAPA 1 (lo que Weë sabe hacer) y MAPA 2 (quién puede ejecutarlo, y con qué condiciones) ──');
/** Las siete etiquetas de autorización comercial o de terceros (decisión del dueño, 2026-10-07). Una por fila. */
const ETIQUETAS = Object.freeze(['APPROVED / AVAILABLE', 'REQUIRES ENTERPRISE', 'REQUIRES WRITTEN AUTHORIZATION', 'REQUIRES PARTNER AGREEMENT',
  'REVIEW_REQUIRED', 'NOT_ALLOWED', 'UNKNOWN']);
/** Quién puede elegir el proveedor: A (el Router, por defecto) · B (la persona) · C (solo Weë) · D (Enterprise o socio) · E (nadie). */
const SELECCIONES = Object.freeze(['A', 'B', 'C', 'D', 'E']);
const PROVEEDOR_EN_TEXTO = /\b(tripo|meshy|fal|hunyuan|tencent|world ?labs)\b/i;
const celdas = (linea) => linea.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.replace(/[`*]/g, '').trim());
const entre = (texto, desde, hasta) => { const i = texto.indexOf(desde); const j = i < 0 ? -1 : texto.indexOf(hasta, i + desde.length); return i < 0 ? '' : texto.slice(i, j < 0 ? undefined : j); };
/** Las filas de la tabla cuya cabecera tiene todas estas columnas, como objetos por nombre de columna. */
const tablaCon = (texto, columnas) => {
  const lineas = texto.split(/\r?\n/);
  const i = lineas.findIndex((l) => l.startsWith('|') && columnas.every((c) => l.includes(c)));
  if (i < 0) return [];
  const cabecera = celdas(lineas[i]);
  const filas = [];
  for (let j = i + 2; j < lineas.length && lineas[j].startsWith('|'); j++) filas.push(Object.fromEntries(celdas(lineas[j]).map((v, k) => [cabecera[k], v])));
  return filas;
};
const COLUMNAS_DEL_MAPA_2 = ['Proveedor', 'Capacidad (MAPA 1)', 'Disponibilidad en la API', 'Uso en Weë', 'Autorización comercial', 'Selección'];
const mapa2 = (doc) => tablaCon(entre(doc, '### 5.2 MAPA 2', '### 5.3'), COLUMNAS_DEL_MAPA_2);
const mapa1 = (doc) => entre(doc, '### 5.1 MAPA 1', '### 5.2 MAPA 2');
const etiquetaUnica = (filas) => filas.filter((f) => !ETIQUETAS.includes(f['Autorización comercial'])).map((f) => `${f.Proveedor} ${f['Endpoint / modelo']}: «${f['Autorización comercial']}»`);
/** Nunca se inventa una autorización: ni Tripo, ni Meshy, ni fal tienen hoy un contrato que diga APPROVED / AVAILABLE. */
const autorizacionInventada = (filas) => filas
  .filter((f) => /^(Tripo|Meshy|fal)$/.test(f.Proveedor) && f['Autorización comercial'] === 'APPROVED / AVAILABLE')
  .map((f) => `${f.Proveedor} ${f['Endpoint / modelo']}`);
const generacionDe = (filas, proveedor) => filas.filter((f) => f.Proveedor === proveedor && /3d\.generate/.test(f['Capacidad (MAPA 1)']));
/**
 * Revender modelos de terceros (la imagen 2D de Tripo y de Meshy) lo excluye WEË, por su regla de matrices: eso va en
 * «uso en Weë» (DESCARTADO) y en la selección (E). La columna de autorización dice solo lo que dicen los términos del
 * proveedor y de los terceros —según la investigación del MAPA 2, REVIEW_REQUIRED—: las dos dimensiones no se funden.
 */
const revendidosMalEtiquetados = (filas) => filas
  .filter((f) => /revende modelos de terceros/i.test(f['Uso en Weë']))
  .filter((f) => !/^DESCARTADO/.test(f['Uso en Weë']) || f.Selección !== 'E' || f['Autorización comercial'] !== 'REVIEW_REQUIRED')
  .map((f) => `${f.Proveedor} ${f['Endpoint / modelo']}`);
/** Lo que solo existe en la web del proveedor no se integra: sin API, automatizarla o compartir cuenta está prohibido. */
const soloWebMalEtiquetado = (filas) => filas
  .filter((f) => /solo web/i.test(f['Disponibilidad en la API']))
  .filter((f) => f['Autorización comercial'] !== 'NOT_ALLOWED' || f.Selección !== 'E')
  .map((f) => `${f.Proveedor} ${f['Endpoint / modelo']}`);
const seleccionNoValida = (filas) => filas.filter((f) => !SELECCIONES.includes(f.Selección) || f.Selección === 'B').map((f) => `${f.Proveedor} ${f['Endpoint / modelo']}: ${f.Selección}`);
/** El MAPA 2 no inventa capacidades: cada una existe en el catálogo del Core o es de las propuestas, o es «—». */
/**
 * UN CANDIDATO QUE ENTRÓ EN EL ALCANCE SIN SU INVESTIGACIÓN (Sloyd, Seed3D): o tiene sus filas en el MAPA 2, o el documento
 * lo marca PENDING DEPENDENCY en su sección. Las dos a la vez o ninguna es un estado a medias.
 */
const PENDIENTES = Object.freeze([
  { nombre: 'Sloyd', marca: /^## 4b\. Sloyd — PENDING DEPENDENCY$/m },
  { nombre: 'Seed3D', marca: /^## 4c\. Seed3D 2\.0 \(ByteDance Seed\) — CANDIDATO 3D, PENDING PROVIDER ELIGIBILITY · PENDING DEPENDENCY$/m },
]);
const estadoDelCandidato = (doc, filas, { nombre, marca }) => {
  const conFilas = filas.some((f) => f.Proveedor === nombre);
  const marcado = marca.test(doc);
  return conFilas && !marcado ? 'con_filas' : !conFilas && marcado ? 'pendiente' : conFilas ? 'a_medias: filas y marca' : 'olvidado: ni filas ni marca';
};
const capacidadesAjenas = (filas, catalogo = CAPABILITY_CATALOG) => filas.flatMap((f) =>
  [...String(f['Capacidad (MAPA 1)']).matchAll(/\b(?:3d|world|scene|image|video|text)\.[a-z_]+\b/g)].map((m) => m[0])
    .filter((c) => !enCatalogo(catalogo, c) && !PROPUESTAS.includes(c)).map((c) => `${f.Proveedor}: ${c}`));
seccion('E', () => {
  const doc = existe(DOC) ? leer(DOC) : '';
  const filas = mapa2(doc);
  const proveedores = [...new Set(filas.map((f) => f.Proveedor))].sort();
  check('E1) el MAPA 2 existe con sus cuatro dimensiones separadas (capacidad, disponibilidad en la API, uso en Weë, autorización) y la selección, y cubre Tripo, Meshy y fal —también lo que no es 3D (imagen, multivista, impresión, agente, splats)—',
    filas.length >= 25 && ['Meshy', 'Tripo', 'fal'].every((p) => proveedores.includes(p))
    && filas.some((f) => /image\.generate/.test(f['Capacidad (MAPA 1)'])) && filas.some((f) => f['Capacidad (MAPA 1)'].startsWith('—'))
    && ['print', 'splat', 'multiview', 'MCP'].every((x) => filas.some((f) => f['Endpoint / modelo'].toLowerCase().includes(x.toLowerCase()))),
    `${filas.length} filas · ${proveedores.join(', ')}`);
  const sinEtiqueta = etiquetaUnica(filas);
  check('E2) cada fila lleva EXACTAMENTE una de las siete etiquetas de autorización', filas.length > 0 && sinEtiqueta.length === 0, sinEtiqueta.join(' | '));
  const inventadas = autorizacionInventada(filas);
  check('E3) «hay API» no es «Weë puede ofrecerlo»: ninguna fila de Tripo, Meshy o fal está APPROVED / AVAILABLE', inventadas.length === 0, inventadas.join(', '));
  const tripo = generacionDe(filas, 'Tripo');
  const meshy = generacionDe(filas, 'Meshy');
  check('E4) Tripo genera solo con autorización escrita previa (Terms §3.2) y Meshy solo con Enterprise (§1.2 uso interno, §2.1, §2.6): los dos, OFF',
    tripo.length >= 3 && tripo.every((f) => f['Autorización comercial'] === 'REQUIRES WRITTEN AUTHORIZATION')
    && meshy.length >= 3 && meshy.every((f) => f['Autorización comercial'] === 'REQUIRES ENTERPRISE'),
    `Tripo ${tripo.map((f) => f['Autorización comercial']).join(',')} · Meshy ${meshy.map((f) => f['Autorización comercial']).join(',')}`);
  const revendidos = revendidosMalEtiquetados(filas);
  check('E5) lo que revende modelos de terceros (la imagen 2D de Tripo y de Meshy) lo descarta Weë —uso DESCARTADO, selección E— y su autorización sigue siendo la de los términos (REVIEW_REQUIRED): las dimensiones no se funden',
    filas.filter((f) => /revende modelos de terceros/i.test(f['Uso en Weë'])).length >= 2 && revendidos.length === 0, revendidos.join(', '));
  const seleccion = seleccionNoValida(filas);
  check('E6) la selección de proveedor es A–E y NINGUNA fila tiene B (la persona no elige proveedor por defecto; B es la decisión D3D-17)',
    seleccion.length === 0 && /D3D-17[^\n]*persona elegir proveedor/i.test(doc), seleccion.join(', '));
  const ajenas = capacidadesAjenas(filas);
  check('E7) la capacidad es de Weë: el MAPA 2 no inventa ninguna (todas existen en el catálogo o son las propuestas)', ajenas.length === 0, ajenas.join(', '));
  const m1 = mapa1(doc);
  check('E8) y el MAPA 1 no nombra ningún proveedor: los dos mapas nunca se mezclan', m1.length > 500 && !PROVEEDOR_EN_TEXTO.test(m1), (m1.match(PROVEEDOR_EN_TEXTO) || [''])[0]);
  const soloWeb = soloWebMalEtiquetado(filas);
  check('E9) lo que solo existe en la web del proveedor (sin API) es NOT_ALLOWED y nadie lo elige (E)',
    filas.filter((f) => /solo web/i.test(f['Disponibilidad en la API'])).length >= 4 && soloWeb.length === 0, soloWeb.join(', '));
  const pendientes = PENDIENTES.map((c) => `${c.nombre}: ${estadoDelCandidato(doc, filas, c)}`);
  check('E10) Sloyd y Seed3D (en el alcance desde el 2026-10-07): cada uno, o con sus filas en el MAPA 2, o marcado PENDING DEPENDENCY — una de las dos, nunca ninguna ni las dos',
    pendientes.every((p) => /: (pendiente|con_filas)$/.test(p)), pendientes.join(' · '));
});

/* ═══ F · CONTROLES: cada detector, con una entrada saboteada ══════════════ */
console.log('\n── F · Controles (sabotajes en línea) ──');
seccion('F', () => {
  const conTripo = { ...reg, ADAPTERS: { ...reg.ADAPTERS, tripo: { id: 'tripo', models: [] } } };
  check('F1) CONTROL A1: un adaptador de Tripo en el mapa se ve', integraciones(conTripo, DECLARED).includes('ADAPTERS.tripo'));
  const conCadena = { ...reg, DEFAULT_ROUTING: { ...reg.DEFAULT_ROUTING, 'world.generate': { chain: [{ provider: 'meshy' }] } } };
  check('F2) CONTROL A1: Meshy en una cadena de enrutado se ve', integraciones(conCadena, DECLARED).some((x) => x.includes('→meshy')));
  const datos = datosDelRegistro();
  const conPromesa = { ...datos, providers: datos.providers.map((p) => (p.id === 'tripo' ? { ...p, capabilities: ['3d.generate'] } : p)) };
  check('F3) CONTROL A2: una matriz 3D pendiente que promete una capacidad se ve', matricesQuePrometen(conPromesa).includes('tripo'));
  check('F4) CONTROL A3–A6: el nombre, la clave y el host se ven; «tripOneDay» y «Trípoli» no son Tripo',
    nombra('lo hace Tripo').length === 1 && nombra("process.env.MESHY_API_KEY").length === 1 && nombra('https://api.tripo3d.ai/v2/openapi/task').length > 0
    && nombra('https://api.meshy.ai/openapi/v2/text-to-3d').length > 0 && nombra("t('weeai.tripOneDay')").length === 0 && nombra('Trípoli, Libia').length === 0);

  const catalogoConAnimar = [...CAPABILITY_CATALOG, { id: '3d.animate', category: '3d', status: 'DECLARED', accepts: [], produces: '3d' }];
  check('F5) CONTROL B2: una propuesta que aparece en el catálogo se ve', PROPUESTAS.some((c) => enCatalogo(catalogoConAnimar, c)));
  check('F6) CONTROL B3: un id con otra forma no pasa', !FORMA_DE_CAPACIDAD.test('TEXT_TO_3D') && !FORMA_DE_CAPACIDAD.test('3d-generate'));

  /* Un objeto 3D enchufado «a lo rápido»: sin servicio, sin gobierno, por un proveedor asíncrono sin relojes. */
  const objeto = { id: 'falso/objeto', provider: 'falso', capabilities: ['3d.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.3 } };
  const conObjeto = { ...reg.ADAPTERS, falso: { id: 'falso', models: [objeto] } };
  check('F7) CONTROL C1: `3d.generate` hoy caería en el servicio de texto (2 Credits por algo que cuesta 0,30 USD), y se ve',
    sinServicioPropio(conObjeto, CAPABILITY_CATALOG).includes('3d.generate') && serviceForCapability('3d.generate', {}) === 'ai_text');
  check('F8) CONTROL C2: cobrarlo por debajo del coste en modo prueba se ve', porDebajoDelCoste(conObjeto, CAPABILITY_CATALOG).some((x) => x.includes('falso/objeto en 3d.generate')));
  const mundoCaro = { ...reg.ADAPTERS, falso: { id: 'falso', models: [{ id: 'falso/mundo', provider: 'falso', capabilities: ['world.generate'], quality: 4, speed: 2, cost: { unit: 'call', usd: 0.6 } }] } };
  check('F9) CONTROL C2: un segundo proveedor de mundos más caro que el precio de catálogo (39) se ve', porDebajoDelCoste(mundoCaro, CAPABILITY_CATALOG).some((x) => x.includes('falso/mundo en world.generate')));
  check('F10) CONTROL C3: hoy `3d.generate` se guardaría como imagen (el catálogo dice `produces: image`), y se ve',
    claseErronea(conObjeto, CAPABILITY_CATALOG).some((x) => x.startsWith('3d.generate')) && tipoDeMaterialDe('3d.generate') === 'image');
  const escena = { ...reg.ADAPTERS, falso: { id: 'falso', models: [{ ...objeto, id: 'falso/escena', capabilities: ['scene.generate'] }] } };
  check('F11) CONTROL C4: `scene.generate` hereda la modalidad de texto de `scene.split` y no se detecta como 3D… salvo por su catálogo: se ve si alguien la enruta como 3D',
    modalityOf('scene.generate') === 'text' && modalidadErronea(escena, [...CAPABILITY_CATALOG.filter((e) => e.id !== 'scene.generate'), { id: 'scene.generate', category: '3d', status: 'DECLARED', accepts: [], produces: '3d' }]).some((x) => x.startsWith('scene.generate')));
  check('F12) CONTROL C5: un modelo 3D sin gobierno se ve', gobiernoIncompleto(conObjeto, CAPABILITY_CATALOG).some((x) => x.includes('sin gobierno')));
  const hw = reg.ADAPTERS.fal.models[0];
  const sinPrincipal = { ...reg.ADAPTERS, falso: { id: 'falso', models: [{ ...hw, id: 'falso/m', gobierno: { ...hw.gobierno, outputSchema: [] } }] } };
  check('F13) CONTROL C5: un gobierno sin archivo principal se ve', gobiernoIncompleto(sinPrincipal, CAPABILITY_CATALOG).some((x) => x.includes('0 archivos principales')));
  const activo = { ...reg.ADAPTERS, falso: { id: 'falso', models: [{ ...hw, id: 'falso/m', gobierno: { ...hw.gobierno, active: 'ACTIVE' } }] } };
  check('F14) CONTROL C6: un modelo 3D ACTIVE sin revisión aprobada se ve', encendidos(activo, CAPABILITY_CATALOG).some((x) => x.includes('ACTIVE sin APPROVED')));
  const sinTerritorio = { ...reg.ADAPTERS, falso: { id: 'falso', models: [{ ...hw, id: 'falso/m', territorio: undefined, gobierno: { ...hw.gobierno, reviewStatus: 'APPROVED', active: 'ACTIVE' } }] } };
  check('F15) CONTROL C6: un modelo 3D elegible se ve', encendidos(sinTerritorio, CAPABILITY_CATALOG).some((x) => x.includes('elegible')));
  check('F16) CONTROL C7: una capacidad 3D asíncrona sin relojes se ve, y unos relojes incoherentes también',
    sinPlazos(conObjeto, CAPABILITY_CATALOG, { falso: {} }).includes('3d.generate: sin plazos')
    && sinPlazos(conObjeto, CAPABILITY_CATALOG, { falso: {} }, { '3d.generate': { ...PLAZOS_POR_CAPACIDAD['world.generate'], vidaEnElProveedorMs: 10 * 60 * 60 * 1000 } }).some((x) => x.startsWith('3d.generate: ')));
  check('F17) CONTROL D2: una ruta inventada se ve', rutasCitadas('mira `functions/src/engine/providers/inventado.ts`').filter((r) => !RUTAS_PROPUESTAS.includes(r) && !existe(r)).length === 1);
  const fila = (p, endpoint, cap, uso, etiqueta, sel) => ({ Proveedor: p, 'Endpoint / modelo': endpoint, 'Capacidad (MAPA 1)': cap, 'Uso en Weë': uso, 'Autorización comercial': etiqueta, Selección: sel });
  check('F18) CONTROL E2: una fila con dos etiquetas, o con una que no existe, se ve',
    etiquetaUnica([fila('Tripo', 'x', '3d.generate', 'PREPARADO', 'REVIEW_REQUIRED, UNKNOWN', 'A'), fila('Meshy', 'y', '3d.rig', 'PREPARADO', 'APROBADO', 'A')]).length === 2);
  check('F19) CONTROL E3: una autorización inventada para Tripo se ve', autorizacionInventada([fila('Tripo', 'image-to-model', '3d.generate · imagen', 'PREPARADO', 'APPROVED / AVAILABLE', 'A')]).length === 1);
  check('F20) CONTROL E5: un modelo revendido que alguien puede elegir, o cuya autorización mezcla la regla de Weë con los términos, se ve',
    revendidosMalEtiquetados([fila('Meshy', 'text-to-image', 'image.generate', 'DESCARTADO: revende modelos de terceros', 'REVIEW_REQUIRED', 'A'),
      fila('Tripo', 'text-to-image', 'image.generate', 'DESCARTADO: revende modelos de terceros', 'NOT_ALLOWED', 'E')]).length === 2
    && revendidosMalEtiquetados([fila('Tripo', 'text-to-image', 'image.generate', 'DESCARTADO: revende modelos de terceros', 'REVIEW_REQUIRED', 'E')]).length === 0);
  check('F21) CONTROL E6: una fila con la selección B (la persona elige) se ve, y una que no es A–E también',
    seleccionNoValida([fila('Tripo', 'x', '3d.generate', 'PREPARADO', 'REQUIRES WRITTEN AUTHORIZATION', 'B'), fila('fal', 'y', 'world.generate', 'INTEGRADO', 'REVIEW_REQUIRED', 'AUTO')]).length === 2);
  check('F22) CONTROL E7: una capacidad que el MAPA 2 se inventa se ve', capacidadesAjenas([fila('Tripo', 'x', '3d.inventada', 'PREPARADO', 'REQUIRES WRITTEN AUTHORIZATION', 'A')]).length === 1);
  check('F23) CONTROL E8: un MAPA 1 que nombra a un proveedor se ve', PROVEEDOR_EN_TEXTO.test('| 3d.generate | lo hace Tripo |') && !PROVEEDOR_EN_TEXTO.test('| 3d.generate | falta tu país |'));
  const web = (etiqueta, sel) => ({ ...fila('Meshy', 'Scene Compose', 'scene.generate', 'DESCARTADO', etiqueta, sel), 'Disponibilidad en la API': 'NO (solo web)' });
  check('F24) CONTROL E9: una función solo web con otra etiqueta, o que alguien puede elegir, se ve',
    soloWebMalEtiquetado([web('REQUIRES ENTERPRISE', 'E'), web('NOT_ALLOWED', 'A')]).length === 2 && soloWebMalEtiquetado([web('NOT_ALLOWED', 'E')]).length === 0);
  const [sloyd] = PENDIENTES;
  const filaSloyd = [fila('Sloyd', 'x', '3d.generate', 'PREPARADO', 'UNKNOWN', 'A')];
  check('F25) CONTROL E10: un candidato olvidado (ni filas ni marca) o a medias (las dos) se ve; con una sola, no',
    estadoDelCandidato('sin nada', [], sloyd).startsWith('olvidado') && estadoDelCandidato('## 4b. Sloyd — PENDING DEPENDENCY', filaSloyd, sloyd).startsWith('a_medias')
    && estadoDelCandidato('## 4b. Sloyd — PENDING DEPENDENCY', [], sloyd) === 'pendiente' && estadoDelCandidato('', filaSloyd, sloyd) === 'con_filas');
  check('F26) CONTROL A3–A6: Seed3D y Sloyd, con y sin guion, se ven', nombra('lo hace Seed3D').length === 1 && nombra('seed-3d').length === 1 && nombra('SEED3D_API_KEY').length >= 1 && nombra('Sloyd').length === 1);
});

console.log(failures ? `\n✘ ${failures} de ${n} comprobaciones fallaron` : `\n✔ 3D multiproveedor: preparado, apagado y medido (${n} comprobaciones, $0)`);
process.exit(failures ? 1 : 0);
