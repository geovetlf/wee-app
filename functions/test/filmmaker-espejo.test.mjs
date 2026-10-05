/**
 * F1-C · WEË FILMMAKER — EL ESPEJO DEL CLIENTE, COMPROBADO.
 *
 * La app no puede importar `functions/src/filmmaker/` (Metro deja `functions/`
 * fuera del bundle), y la pantalla de producción necesita el dominio entero:
 * validar y aplicar una operación en local, lo pendiente, las recomendaciones,
 * la línea de tiempo y las tarjetas del storyboard. Escribirlo otra vez sería
 * tener dos verdades. `scripts/espejo-filmmaker.mjs` no lo escribe: lo IMPRIME
 * desde el árbol sintáctico de F1-A, sin comentarios, en
 * `services/filmmaker/espejo/`.
 *
 * Lo que se demuestra aquí es que ese espejo ES F1-A, y que nadie lo toca:
 *
 *   A · Generado, no escrito: regenerarlo da exactamente lo que hay en disco.
 *   B · Las estructuras: cada tipo exportado, campo a campo y con su opcionalidad.
 *   C · Los vocabularios cerrados y los límites, iguales en ejecución.
 *   D · Las operaciones: el mismo lenguaje, y aplicado da lo mismo.
 *   E · Cómo lo usa la app: una puerta por dominio, sin `functions/src`, sin red.
 *
 * El espejo lleva además una segunda raíz, el núcleo 3D del Core (`core/escena3d.ts`): uno para Weë Studio, Weë Design
 * y Filmmaker, con su propia puerta en la app (`services/escena3d.ts`). A lo vigila igual; E, que entra por su puerta
 * y que hace lo mismo que el del servidor.
 *
 * Sin red, sin Firebase y sin el compilado: se cargan los dos árboles de fuentes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/** Una sección que lanza no tumba la suite: su excepción es una comprobación fallida, con el motivo. */
const seccion = (letra, fn) => {
  try { fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 2).join(' · ')); }
};

const GEN = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/espejo-filmmaker.mjs')).href);
const DESTINO = GEN.DESTINO_DEL_ESPEJO;
const ts = createRequire(path.resolve(RAIZ, 'package.json'))('typescript');

/**
 * UN ÁRBOL DE FUENTES CARGADO TAL CUAL: cada `.ts` transpilado a CommonJS y
 * evaluado con un `require` que solo resuelve rutas relativas DENTRO del árbol.
 * Un import que se saliera —Firebase, la red, otro árbol— lanzaría aquí.
 */
const cargarArbol = (raizAbs) => {
  const cache = new Map();
  const cargar = (abs) => {
    if (cache.has(abs)) return cache.get(abs).exports;
    const js = ts.transpileModule(fs.readFileSync(abs, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const modulo = { exports: {} };
    cache.set(abs, modulo);
    const requerir = (spec) => {
      if (!spec.startsWith('.')) throw new Error(`import fuera del árbol: ${spec} (${path.relative(RAIZ, abs)})`);
      const d = path.resolve(path.dirname(abs), spec);
      const f = fs.existsSync(`${d}.ts`) ? `${d}.ts` : path.join(d, 'index.ts');
      if (!f.startsWith(raizAbs)) throw new Error(`import fuera del árbol: ${spec}`);
      return cargar(f);
    };
    new Function('exports', 'require', 'module', js)(modulo.exports, requerir, modulo);
    return modulo.exports;
  };
  return (rel) => cargar(path.resolve(raizAbs, rel));
};
const servidor = cargarArbol(path.resolve(RAIZ, GEN.ORIGEN_DEL_ESPEJO));
const cliente = cargarArbol(path.resolve(RAIZ, DESTINO));

const DOMINIO = ['modelo', 'validacion', 'operaciones', 'recomendaciones', 'requisitos'];
const S = Object.fromEntries(DOMINIO.map((m) => [m, servidor(`filmmaker/${m}.ts`)]));
const C = Object.fromEntries(DOMINIO.map((m) => [m, cliente(`filmmaker/${m}.ts`)]));
const canonico = S.modelo.canonico;
const iguales = (a, b) => canonico(a) === canonico(b);
const clon = (x) => JSON.parse(JSON.stringify(x));

/* ═══ A · GENERADO, NO ESCRITO ═════════════════════════════════════════════ */
console.log('\n── A · Generado, no escrito ──');
seccion('A', () => {
  const esperado = GEN.generarEspejo(RAIZ);
  const actual = GEN.leerEspejo(RAIZ);
  const distintos = [...new Set([...esperado.keys(), ...actual.keys()])].filter((r) => esperado.get(r) !== actual.get(r)).sort();
  check('A1) regenerar el espejo da EXACTAMENTE lo que hay en disco, byte a byte', distintos.length === 0,
    distintos.length ? `difiere: ${distintos.join(', ')} — node scripts/espejo-filmmaker.mjs` : `${esperado.size} archivos`);
  check('A2) son los cinco archivos del dominio, su cierre en el Core, el núcleo 3D y el tipo del Gateway: ni uno más',
    esperado.size === GEN.ARCHIVOS_DEL_ESPEJO.length + 1 && GEN.ARCHIVOS_DEL_ESPEJO.filter((r) => r.startsWith('filmmaker/')).length === 5
    && [...actual.keys()].every((r) => esperado.has(r)), [...actual.keys()].filter((r) => !esperado.has(r)).join(', ') || `${actual.size} archivos`);
  check('A3) cada archivo dice que es generado y de dónde sale',
    [...actual].every(([r, s]) => s.startsWith(`// GENERADO por scripts/espejo-filmmaker.mjs desde ${GEN.ORIGEN_DEL_ESPEJO}/${r}: no se edita a mano, se regenera.\n`)));
  /*
   * El cierre se mide, no se supone: los `import` de F1-A —y los del núcleo 3D, la segunda raíz del espejo—, seguidos
   * hasta el final, son exactamente estos.
   */
  const cierre = new Set();
  const cola = [...DOMINIO.map((m) => `filmmaker/${m}.ts`), ...GEN.RAICES_DEL_NUCLEO_3D];
  while (cola.length) {
    const r = cola.shift();
    if (cierre.has(r)) continue;
    cierre.add(r);
    for (const m of leer(`${GEN.ORIGEN_DEL_ESPEJO}/${r}`).matchAll(/from '(\.{1,2}\/[^']+)'/g)) {
      const d = path.posix.normalize(path.posix.join(path.posix.dirname(r), m[1]));
      const f = fs.existsSync(path.resolve(RAIZ, GEN.ORIGEN_DEL_ESPEJO, `${d}.ts`)) ? `${d}.ts` : `${d}/index.ts`;
      if (f !== 'core/gateway.ts') cola.push(f);
    }
  }
  check('A4) la lista del generador ES el cierre de importaciones de F1-A y del núcleo 3D, medido', iguales([...cierre].sort(), [...GEN.ARCHIVOS_DEL_ESPEJO].sort()),
    [...cierre].filter((r) => !GEN.ARCHIVOS_DEL_ESPEJO.includes(r)).join(', ') || `${cierre.size} archivos`);
  check('A4b) el núcleo 3D es UNA raíz —el WEË 3D Engine del Core— y su cierre no añade nada que F1-A no tuviera',
    iguales([...GEN.RAICES_DEL_NUCLEO_3D], ['core/escena3d.ts'])
    && [...leer(`${GEN.ORIGEN_DEL_ESPEJO}/core/escena3d.ts`).matchAll(/from '(\.{1,2}\/[^']+)'/g)].every((m) => ['./contracts', './identity'].includes(m[1])));
  check('A5) de `core/gateway.ts` solo entra `ExecutionHints`, como en F1-A', iguales([...GEN.TIPOS_DEL_GATEWAY], ['ExecutionHints'])
    && /^import type \{ ExecutionHints \} from '\.\.\/core\/gateway';$/m.test(leer(`${GEN.ORIGEN_DEL_ESPEJO}/filmmaker/modelo.ts`))
    && !/export (const|function|class) /.test(actual.get('core/gateway.ts') ?? ''));
  /* CONTROL: tocar el espejo a mano TIENE que verse. */
  const tocado = new Map(actual);
  tocado.set('filmmaker/recomendaciones.ts', (tocado.get('filmmaker/recomendaciones.ts') ?? '').replace('segundosMinimosPorEscena: 2', 'segundosMinimosPorEscena: 3'));
  check('CONTROL: un umbral cambiado a mano en el espejo sería detectado',
    [...esperado.keys()].some((r) => esperado.get(r) !== tocado.get(r)), 'si esto pasara, A1 no protegería nada');
});

/* ═══ B · LAS ESTRUCTURAS ══════════════════════════════════════════════════ */
console.log('\n── B · Las estructuras: tipo a tipo, campo a campo ──');
seccion('B', () => {
  const origen = (m) => path.resolve(RAIZ, GEN.ORIGEN_DEL_ESPEJO, `filmmaker/${m}.ts`);
  const espejo = (m) => path.resolve(RAIZ, DESTINO, `filmmaker/${m}.ts`);
  const programa = ts.createProgram([...DOMINIO.map(origen), ...DOMINIO.map(espejo)], {
    strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
  });
  const tc = programa.getTypeChecker();
  const F = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType;
  const limpiar = (s) => s.replace(/import\("[^"]+"\)\./g, '');
  /** La firma de cada exportación: qué es, sus campos con su opcionalidad y su tipo, o su tipo entero. */
  const firmas = (archivo) => {
    const sf = programa.getSourceFile(archivo);
    const mod = tc.getSymbolAtLocation(sf);
    const salida = {};
    for (const sim of tc.getExportsOfModule(mod)) {
      const s = sim.flags & ts.SymbolFlags.Alias ? tc.getAliasedSymbol(sim) : sim;
      if (s.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
        const tipo = tc.getDeclaredTypeOfSymbol(s);
        const campos = tipo.getProperties().map((p) => {
          const decl = p.valueDeclaration ?? p.declarations?.[0];
          const t = decl ? tc.getTypeOfSymbolAtLocation(p, decl) : tc.getTypeOfSymbol(p);
          return `${p.name}${p.flags & ts.SymbolFlags.Optional ? '?' : ''}: ${limpiar(tc.typeToString(t, undefined, F))}`;
        }).sort();
        salida[sim.name] = { tipo: limpiar(tc.typeToString(tipo, undefined, F)), campos };
      } else {
        const decl = s.valueDeclaration ?? s.declarations?.[0];
        salida[sim.name] = { valor: limpiar(tc.typeToString(tc.getTypeOfSymbolAtLocation(s, decl), undefined, F)) };
      }
    }
    return salida;
  };
  const diagnosticos = ts.getPreEmitDiagnostics(programa).filter((d) => d.category === ts.DiagnosticCategory.Error);
  check('B1) los dos árboles compilan, cada uno con lo suyo', diagnosticos.length === 0,
    diagnosticos.slice(0, 3).map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join(' | '));
  for (const m of DOMINIO) {
    const a = firmas(origen(m));
    const b = firmas(espejo(m));
    const nombres = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const distintas = nombres.filter((k) => canonico(a[k]) !== canonico(b[k]));
    check(`B2) ${m}: las mismas exportaciones, y cada una con la misma forma (${Object.keys(a).length})`, distintas.length === 0, distintas.join(', '));
  }
  /* Lo que el encargo nombra, uno por uno: que existe, y con qué campos obligatorios. */
  const modelo = firmas(espejo('modelo'));
  const obligatorios = (k) => (modelo[k]?.campos ?? []).filter((c) => !/^\w+\?:/.test(c)).map((c) => c.split(':')[0]).sort();
  const ESPERADOS = {
    FilmmakerProduction: ['audio', 'characters', 'creativeDirection', 'duration', 'editPlan', 'exportPlan', 'format', 'generation', 'intent', 'locations', 'metadata', 'objects', 'references', 'scenes', 'title', 'version'],
    ProductionScene: ['id', 'order', 'shots'],
    ProductionShot: ['id', 'order'],
    ProductionCharacter: ['id', 'name'],
    ProductionLocation: ['id', 'name'],
    ProductionObject: ['id', 'name'],
    ProductionReference: ['id', 'kind'],
    AudioPlan: ['cues'],
    AudioCue: ['description', 'id', 'kind', 'target'],
    EditPlan: [],
    ExportPlan: ['targets'],
    ProductionMetadata: ['revision'],
  };
  for (const [tipo, campos] of Object.entries(ESPERADOS)) {
    check(`B3) ${tipo}: sus campos obligatorios son los de F1-A`, iguales(obligatorios(tipo), campos) && iguales(firmas(origen('modelo'))[tipo], modelo[tipo]),
      obligatorios(tipo).join(', '));
  }
  check('B4) la continuidad y las operaciones también tienen su tipo en el espejo',
    ['ContinuityRule'].every((k) => modelo[k]) && ['FilmmakerOperation', 'PendingRegeneration', 'OperationResult'].every((k) => firmas(espejo('operaciones'))[k]));
});

/* ═══ C · LOS VOCABULARIOS CERRADOS ════════════════════════════════════════ */
console.log('\n── C · Los vocabularios cerrados y los límites, en ejecución ──');
seccion('C', () => {
  const VOCABULARIOS = ['FILMMAKER_MODEL_VERSION', 'TIPOS_DE_PRODUCCION', 'PRIORIDADES', 'RITMOS', 'MOMENTOS_DEL_DIA', 'CLIMAS',
    'PROPOSITOS_NARRATIVOS', 'ENFOQUES', 'TIPOS_DE_LINEA', 'TIPOS_DE_SONIDO', 'PAPELES_DE_REFERENCIA', 'TIPOS_DE_OBJETO', 'AMBIENTES',
    'RESOLUCIONES', 'MODOS_DE_SUBTITULO', 'POSICIONES_DE_SUBTITULO', 'ESTILOS_DE_SUBTITULO', 'PISTAS', 'PROPOSITOS_DE_EXPORTACION',
    'PREVISUALIZACIONES', 'CALIDADES', 'RELACIONES_ENTRE_PERSONAJES', 'RASGOS', 'TIPOS_DE_RESTRICCION', 'PRESETS', 'PRESETS_DE_FORMATO',
    'LIMITES', 'RITMO_DE_HABLA'];
  const distintos = VOCABULARIOS.filter((k) => C.modelo[k] === undefined || !iguales(S.modelo[k], C.modelo[k]));
  check(`C1) los ${VOCABULARIOS.length} vocabularios y límites del modelo son los mismos`, distintos.length === 0, distintos.join(', '));
  check('C2) la forma de un id es la misma', String(S.modelo.FORMA_DE_ID) === String(C.modelo.FORMA_DE_ID));
  check('C3) los presets siguen siendo seis, y el de anuncios sigue en 4:5', C.modelo.PRESETS.length === 6 && C.modelo.PRESETS_DE_FORMATO.ads.aspectRatio === '4:5');
  check('C4) los códigos de integridad de la validación son los mismos', iguales([...S.validacion.CODIGOS_DE_INTEGRIDAD].sort(), [...C.validacion.CODIGOS_DE_INTEGRIDAD].sort()));
  check('C5) los umbrales de las recomendaciones son los mismos', iguales(S.recomendaciones.HEURISTICAS, C.recomendaciones.HEURISTICAS));
  const creativoS = servidor('core/creative.ts');
  const creativoC = cliente('core/creative.ts');
  check('C6) el vocabulario creativo del Core es el mismo: rutas y proporciones',
    iguales(creativoS.RUTAS_CREATIVAS, creativoC.RUTAS_CREATIVAS) && iguales(creativoS.PROPORCIONES, creativoC.PROPORCIONES));
});

/* ═══ D · LAS OPERACIONES ══════════════════════════════════════════════════ */
console.log('\n── D · Las operaciones: el mismo lenguaje, y hacen lo mismo ──');
seccion('D', () => {
  check('D1) el lenguaje de operaciones es el mismo, en el mismo orden', iguales(S.operaciones.OPERACIONES, C.operaciones.OPERACIONES),
    `${C.operaciones.OPERACIONES.length} operaciones`);
  const base = () => clon({
    ...S.modelo.produccionVacia({ title: 'Anuncio de zapatilla', aspectRatio: '4:5', resolution: '1080p' }),
    ...S.modelo.configuracionDePreset('ads'),
    intent: { freeText: 'Un anuncio de 15 segundos', requestedDurationSec: 15 },
    creativeDirection: { pacing: 'fast', cinematography: { version: 1, lighting: { type: 'night' } } },
    characters: [{ id: 'char-luna', name: 'Luna', continuity: { locked: ['wardrobe'] } }],
    locations: [{ id: 'loc-city', name: 'Ciudad', setting: 'exterior' }],
    audio: { cues: [{ id: 'cue-musica', kind: 'music', description: 'ritmo', target: { scope: 'production' }, durationSec: 40 }] },
    editPlan: { markers: [{ id: 'mk-1', atShotId: 'sh-0102' }] },
    exportPlan: { targets: [{ id: 'exp-1', aspectRatio: '9:16' }] },
    metadata: { revision: 0, locale: 'es' },
    scenes: [
      { id: 'sc-0001', order: 0, title: 'Salida', locationId: 'loc-city', timeOfDay: 'night', characterIds: ['char-luna'],
        characterStates: [{ characterId: 'char-luna', wardrobe: 'roja' }],
        shots: [
          { id: 'sh-0101', order: 0, durationSec: 5, description: 'Se ata la zapatilla', actions: ['atar', 'mirar', 'levantarse'] },
          { id: 'sh-0102', order: 1, durationSec: 1, description: 'Sale corriendo', dependsOn: ['sh-0101'],
            dialogue: [{ id: 'ln-1', kind: 'dialogue', characterId: 'char-luna', text: 'Hoy no me para nadie, ni la lluvia ni el frío ni el cansancio' }] },
        ] },
      { id: 'sc-0002', order: 1, title: 'Llegada', timeOfDay: 'dawn', dependsOn: ['sc-0001'], shots: [] , durationSec: 3 },
      { id: 'sc-0003', order: 2, title: 'Meta', shots: [{ id: 'sh-0301', order: 0, durationSec: 4, description: 'Cruza la meta' }] },
    ],
  });
  const p = base();
  check('D2) la producción de prueba es válida para los dos, y los dos dicen lo mismo de ella',
    S.validacion.validarProduccion(p).valid && iguales(S.validacion.validarProduccion(p, { stage: 'ready' }), C.validacion.validarProduccion(p, { stage: 'ready' })));
  const LOTES = [
    [{ op: 'reorder_scene', sceneId: 'sc-0003', toOrder: 0 }],
    [{ op: 'reorder_shot', shotId: 'sh-0102', toOrder: 0 }],
    [{ op: 'duplicate_scene', sceneId: 'sc-0001' }],
    [{ op: 'duplicate_shot', shotId: 'sh-0101', newShotId: 'sh-copia' }],
    [{ op: 'split_scene', sceneId: 'sc-0001', atShotOrder: 1, newSceneId: 'sc-partida' }],
    [{ op: 'split_shot', shotId: 'sh-0101', atSec: 2.5, newShotId: 'sh-mitad' }],
    [{ op: 'merge_scenes', sceneId: 'sc-0002', withSceneId: 'sc-0003' }],
    [{ op: 'merge_shots', shotId: 'sh-0101', withShotId: 'sh-0102' }],
    [{ op: 'extend_duration', target: { shotId: 'sh-0102' }, bySec: 1.5 }],
    [{ op: 'shorten_duration', target: { sceneId: 'sc-0002' }, bySec: 1 }],
    [{ op: 'change_target_duration', targetSec: 20, strict: false }],
    [{ op: 'change_camera', target: { scope: 'scene', sceneId: 'sc-0001' }, shotType: 'close_up', cameraType: 'handheld' }],
    [{ op: 'change_movement', target: { scope: 'shot', shotId: 'sh-0301' }, movement: 'push_in', speed: 'slow' }],
    [{ op: 'change_lighting', target: { scope: 'production' }, lighting: 'golden_hour' }],
    [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }],
    [{ op: 'change_time_of_day', sceneId: 'sc-0002', timeOfDay: 'night' }],
    [{ op: 'edit_text', target: { sceneId: 'sc-0003' }, title: 'La meta', description: 'El final' }],
    [{ op: 'edit_text', target: { shotId: 'sh-0301' }, description: 'Cruza la meta de noche' }],
    [{ op: 'add_scene', scene: { id: 'sc-nueva', title: 'Nueva', shots: [{ id: 'sh-nuevo', durationSec: 3 }] }, atOrder: 1 }],
    [{ op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-otro', durationSec: 2, description: 'Amanece' } }],
    [{ op: 'remove_shot', shotId: 'sh-0102', cascade: true }],
    [{ op: 'remove_scene', sceneId: 'sc-0003' }],
    [{ op: 'change_format', preset: 'youtube_shorts' }],
    [{ op: 'change_format', aspectRatio: '4:5' }],
    [{ op: 'change_export', change: { action: 'remove', targetId: 'exp-1' } }],
    [{ op: 'reorder_scene', sceneId: 'sc-0001', toOrder: 9 }],
    [{ op: 'split_shot', shotId: 'sh-0102', atSec: 0.2 }],
    [{ op: 'merge_scenes', sceneId: 'sc-0001', withSceneId: 'sc-0003' }],
    [{ op: 'edit_text', target: { shotId: 'sh-0101' }, title: 'Los planos no tienen título' }],
    [{ op: 'remove_shot', shotId: 'sh-0102' }],
    [{ op: 'inventada', sceneId: 'sc-0001' }],
  ];
  const distintas = LOTES.map((ops, i) => [i, ops]).filter(([, ops]) => !iguales(S.operaciones.aplicarOperaciones(clon(p), ops), C.operaciones.aplicarOperaciones(clon(p), ops)));
  const bien = LOTES.filter((ops) => C.operaciones.aplicarOperaciones(clon(p), ops).ok).length;
  check(`D3) ${LOTES.length} lotes —los que valen y los que no— dan lo mismo en los dos: producción, pendiente, revisión y problemas`,
    distintas.length === 0, distintas.map(([i, ops]) => `${i}:${ops[0].op}`).join(', ') || `${bien} se aplican, ${LOTES.length - bien} se rechazan con sus códigos`);
  check('D4) y la prueba cubre las que la pantalla usa y también rechazos: no es trivial', bien >= 20 && LOTES.length - bien >= 5);
  const todo = S.operaciones.aplicarOperaciones(clon(p), LOTES.slice(0, 3).flat());
  check('D5) un lote entero, todo o nada, da lo mismo', todo.ok && iguales(todo, C.operaciones.aplicarOperaciones(clon(p), LOTES.slice(0, 3).flat())));
  check('D6) lo pendiente entre dos versiones cualesquiera es el mismo cálculo',
    iguales(S.operaciones.pendientesEntre(p, todo.production), C.operaciones.pendientesEntre(p, todo.production)));
  const rs = S.recomendaciones.recomendar(p);
  check('D7) las recomendaciones son las mismas, con sus propuestas', rs.length >= 5 && iguales(rs, C.recomendaciones.recomendar(p)),
    `${rs.length}: ${[...new Set(rs.map((r) => r.code))].join(', ')}`);
  check('D8) la línea de tiempo y las tarjetas del storyboard son las mismas',
    iguales(S.requisitos.lineaDeTiempo(p), C.requisitos.lineaDeTiempo(p)) && iguales(S.requisitos.tarjetasDeStoryboard(p), C.requisitos.tarjetasDeStoryboard(p))
    && C.requisitos.tarjetasDeStoryboard(p).length === 4);
  check('D9) y los requisitos, también cuando la producción no está lista', iguales(S.requisitos.requisitosDeProduccion(p), C.requisitos.requisitosDeProduccion(p)));
});

/* ═══ E · CÓMO LO USA LA APP ═══════════════════════════════════════════════ */
console.log('\n── E · Una puerta por dominio, sin `functions/src` y sin red ──');
seccion('E', () => {
  const FACHADA = 'services/filmmaker/dominio.ts';
  /* La segunda puerta: la del núcleo 3D, que no es de Filmmaker sino de todo Weë (Studio, Design y Filmmaker). */
  const FACHADA_3D = 'services/escena3d.ts';
  const CLIENTE = ['services', 'hooks', 'utils', 'screens', 'components', 'constants', 'contexts', 'navigation'];
  const archivos = CLIENTE.flatMap((d) => fs.readdirSync(path.resolve(RAIZ, d), { recursive: true })
    .map((f) => `${d}/${String(f).split(path.sep).join('/')}`)).filter((r) => /\.tsx?$/.test(r) && !r.startsWith(`${DESTINO}/`));
  const alEspejo = archivos.filter((r) => /from '[^']*filmmaker\/espejo\//.test(leer(r)) || /from '\.\/espejo\//.test(leer(r)));
  check('E1) solo las dos fachadas importan el espejo: el dominio de Filmmaker y el núcleo 3D, cada uno por su puerta',
    iguales([...alEspejo].sort(), [FACHADA_3D, FACHADA].sort()), alEspejo.join(', '));
  const alServidor = archivos.filter((r) => /from '[^']*functions\/(src|lib)/.test(leer(r)));
  check('E2) nada de la app importa `functions/src` ni `functions/lib`', alServidor.length === 0, alServidor.join(', '));
  const fachada = sinComentarios(leer(FACHADA)).replace(/\s+/g, ' ').trim();
  check('E3) la fachada no tiene ni una regla: solo reexporta', /^(export (\*|type \{[^}]*\}|\{[^}]*\}) from '\.\/espejo\/[^']+'; ?)+$/.test(fachada));
  const fachada3d = sinComentarios(leer(FACHADA_3D)).replace(/\s+/g, ' ').trim();
  check('E3b) la del núcleo 3D tampoco: solo reexporta del espejo, y el núcleo entero',
    /^(export (\*|type \{[^}]*\}|\{[^}]*\}) from '\.\/filmmaker\/espejo\/[^']+'; ?)+$/.test(fachada3d)
    && fachada3d.includes("export * from './filmmaker/espejo/core/escena3d';"));
  /* Y lo que reexporta la puerta 3D es el núcleo del servidor, en ejecución: la misma escena, la misma validación. */
  const nucleoS = servidor('core/escena3d.ts');
  const nucleoC = cliente('core/escena3d.ts');
  const datos = { sceneId: 'mundo-1', modo: 'world', ownerAccountId: 'cuenta-a', projectId: 'proyecto_1', ahora: 7, entorno: { worldAssetId: 'asset_mundo' } };
  const malos = [{ ...datos, modo: 'videojuego' }, { ...datos, entorno: { worldAssetId: 'https://cdn.ejemplo/x.glb' } }, { ...datos, sceneId: '' }];
  const lanza = (f) => { try { f(); return null; } catch (e) { return String(e.message); } };
  check('E3c) el núcleo 3D del espejo hace lo mismo que el del servidor: crear, validar, rechazar y no ampliar',
    iguales(nucleoS.crearEscena3D(datos), nucleoC.crearEscena3D(datos))
    && malos.every((m) => lanza(() => nucleoS.crearEscena3D(m)) === lanza(() => nucleoC.crearEscena3D(m)) && lanza(() => nucleoC.crearEscena3D(m)) !== null)
    && iguales(nucleoS.PERFILES_DE_COMPOSICION, nucleoC.PERFILES_DE_COMPOSICION)
    && nucleoC.puedeAmpliarse(nucleoC.crearEscena3D(datos), ['world.generate']) === false);
  const espejo = [...GEN.leerEspejo(RAIZ)].map(([r, s]) => [r, s]);
  check('E4) el espejo no importa nada de fuera de sí mismo', espejo.every(([, s]) => [...s.matchAll(/from '([^']+)'/g)].every((m) => m[1].startsWith('.'))));
  check('E5) sin Firebase, sin red, sin disco, sin reloj y sin azar', espejo.every(([, s]) =>
    !/firebase|firestore|fetch\(|axios|XMLHttpRequest|['"]node:|\brequire\(|Date\.now\(|new Date\(|Math\.random\(/.test(s)));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'anthropic', 'elevenlabs', 'minimax', 'flux',
    'kling', 'runway', 'veo', 'suno', 'bytedance', 'byteplus', 'replicate', 'openrouter', 'huggingface'];
  const nombran = espejo.filter(([, s]) => PROVEEDORES.some((pr) => new RegExp(`(?<![a-z])${pr}(?![a-z])`, 'i').test(s)));
  check('E6) ni un proveedor nombrado en lo que viaja a la app', nombran.length === 0, nombran.map(([r]) => r).join(', '));
  check('E7) ni cobra ni pone precio', espejo.every(([, s]) => !/spendCredits|refundCredits|completeCredits|creditsBalance|creditCosts|aiPricing/.test(s)));
  check('E8) el generador es el que dice el espejo, y está documentado', fs.existsSync(path.resolve(RAIZ, 'scripts/espejo-filmmaker.mjs'))
    && /espejo-filmmaker\.mjs/.test(leer('docs/FILMMAKER.md')));
  check('E9) esta suite está en la cadena de `npm test`', /filmmaker-espejo\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Filmmaker F1-C: el espejo del cliente es F1-A (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
