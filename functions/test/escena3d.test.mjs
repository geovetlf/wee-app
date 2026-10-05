/*
 * WEË 3D ENGINE — EL NÚCLEO DE COMPOSICIÓN (`functions/src/core/escena3d.ts`).
 *
 * Uno solo para todo Weë: Weë Studio (3D World), Weë Design (3D Design) y, después, Weë Filmmaker son PERFILES del
 * mismo núcleo, no motores distintos. Se prueba que la escena es una sola forma con sus reglas (ids, papeles por modo,
 * referencias por id y nunca URL, números finitos), que las operaciones son puras y nunca dejan una escena inválida,
 * que los materiales se pueden reutilizar entre escenas, que no se promete ampliar un mundo sin una capacidad que lo
 * haga, y que el núcleo no sabe de proveedores: añadir uno no lo toca. $0.
 *
 *   node functions/test/escena3d.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const E = require(path.join(RAIZ, 'functions/lib/core/escena3d.js'));
const core = require(path.join(RAIZ, 'functions/lib/core/index.js'));

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const lanza = (f) => { try { f(); return null; } catch (e) { return e.message; } };
const T = E.TRANSFORMACION_NEUTRA;

/* ── A · Una forma, tres compositores ────────────────────────────────────── */
const mundo = E.crearEscena3D({ sceneId: 'mundo-1', modo: 'world', ownerAccountId: 'cuenta-a', ahora: 1, entorno: { worldAssetId: 'asset_mundo', previewAssetId: 'asset_vista' } });
const diseno = E.crearEscena3D({ sceneId: 'salon-1', modo: 'design', ownerAccountId: 'cuenta-a', projectId: 'proyecto-1', ahora: 1 });
check('A1) el mismo núcleo crea un mundo (Studio) y una escena de diseño (Design): misma forma y mismo contrato',
  mundo.contract === diseno.contract && mundo.contract === '1.0' && Object.keys(mundo).filter((k) => k !== 'entorno').sort().join() === Object.keys(diseno).filter((k) => k !== 'projectId').sort().join());
check('A2) los tres modos son perfiles del mismo núcleo: comparten vocabulario y solo cambia qué papeles admite cada uno',
  E.MODOS_DE_COMPOSICION.join() === 'world,design,filmmaker' && E.PERFILES_DE_COMPOSICION.filmmaker.includes('character')
  && !E.PERFILES_DE_COMPOSICION.world.includes('character') && E.PERFILES_DE_COMPOSICION.design.every((p) => E.PERFILES_DE_COMPOSICION.filmmaker.includes(p)));
check('A3) el núcleo se exporta desde el Core (una sola puerta) y su contrato está versionado', core.crearEscena3D === E.crearEscena3D && core.ESCENA3D_CONTRACT_VERSION === '1.0');

/* ── B · Operaciones puras que nunca dejan una escena inválida ───────────── */
const conSofa = E.agregarNodo3D(diseno, { nodeId: 'sofa', papel: 'object', assetId: 'asset_sofa', transform: T }, 2);
check('B1) añadir un nodo devuelve una escena NUEVA (la anterior no cambia) con su fecha de cambio', diseno.nodos.length === 0 && conSofa.nodos.length === 1 && conSofa.updatedAt === 2 && conSofa !== diseno);
const movido = E.moverNodo3D(conSofa, 'sofa', { posicion: [1, 0, 2], rotacion: [0, 0, 0, 1], escala: [1, 1, 1] }, 3);
check('B2) mover y quitar un nodo, y fijar una cámara, también son puros', movido.nodos[0].transform.posicion[0] === 1 && conSofa.nodos[0].transform.posicion[0] === 0
  && E.quitarNodo3D(movido, 'sofa', 4).nodos.length === 0 && E.fijarCamara3D(movido, { cameraId: 'c1', posicion: [0, 1, 5], objetivo: [0, 0, 0], fovGrados: 60 }, 5).camaras.length === 1);
const malos = [
  ['un personaje en Design', () => E.agregarNodo3D(diseno, { nodeId: 'p', papel: 'character', assetId: 'asset_p', transform: T }, 2), /no es del modo design/],
  ['un id repetido', () => E.agregarNodo3D(conSofa, { nodeId: 'sofa', papel: 'object', assetId: 'asset_x', transform: T }, 2), /repetido/],
  ['una URL en vez de un id', () => E.agregarNodo3D(diseno, { nodeId: 'u', papel: 'object', assetId: 'https://cdn.ejemplo/x.glb', transform: T }, 2), /un id, nunca una URL/],
  ['un objeto sin material ni Element', () => E.agregarNodo3D(diseno, { nodeId: 'v', papel: 'object', transform: T }, 2), /sin material ni Element/],
  ['una escala nula', () => E.agregarNodo3D(diseno, { nodeId: 'w', papel: 'object', assetId: 'asset_w', transform: { ...T, escala: [0, 1, 1] } }, 2), /escala/],
  ['un número no finito', () => E.agregarNodo3D(diseno, { nodeId: 'z', papel: 'object', assetId: 'asset_z', transform: { ...T, posicion: [NaN, 0, 0] } }, 2), /posición/],
  ['una zona generada sin material', () => E.agregarZona3D(mundo, { zoneId: 'z1', estado: 'generada' }, 2), /generada sin material/],
  ['un nodo en una zona que no existe', () => E.agregarNodo3D(mundo, { nodeId: 'n', papel: 'object', assetId: 'asset_n', zoneId: 'nada', transform: T }, 2), /zona desconocida/],
  ['una cámara con campo de visión imposible', () => E.fijarCamara3D(mundo, { cameraId: 'c', posicion: [0, 0, 0], objetivo: [0, 0, 1], fovGrados: 200 }, 2), /campo de visión/],
  ['un modo inventado', () => E.crearEscena3D({ sceneId: 's', modo: 'videojuego', ownerAccountId: 'a', ahora: 1 }), /modo desconocido/],
];
const noFallan = malos.filter(([, f, re]) => !re.test(lanza(f) || '')).map(([nombre]) => nombre);
check('B3) nunca deja una escena inválida (10 formas): papel ajeno al modo, id repetido, URL, sin referencia, escala, NaN, zona, cámara, modo', noFallan.length === 0, noFallan.join(', '));

/* ── C · Materiales reutilizables, mundos que no se amplían solos ────────── */
const conZona = E.agregarZona3D(mundo, { zoneId: 'z1', estado: 'generada', worldAssetId: 'asset_zona' }, 2);
const conObjeto = E.agregarNodo3D(conZona, { nodeId: 'faro', papel: 'object', assetId: 'asset_sofa', zoneId: 'z1', transform: T }, 3);
check('C1) los materiales de una escena salen por id, sin duplicados, para reutilizarlos en otra escena o experiencia',
  JSON.stringify(E.materialesDeLaEscena3D(conObjeto)) === JSON.stringify(['asset_mundo', 'asset_sofa', 'asset_vista', 'asset_zona'])
  && E.materialesDeLaEscena3D(conSofa).includes('asset_sofa'));
check('C2) ampliar un mundo NO se promete: solo si existe la capacidad world.expand (hoy no está en el catálogo)',
  E.puedeAmpliarse(mundo, ['world.generate']) === false && E.puedeAmpliarse(mundo, ['world.generate', 'world.expand']) === true
  && E.puedeAmpliarse(diseno, ['world.expand']) === false && !/'world\.expand'/.test(leer('functions/src/core/registry/capabilities.ts')));

/* ── D · El núcleo no sabe de proveedores ────────────────────────────────── */
const fuente = leer('functions/src/core/escena3d.ts');
const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
check('D1) el compositor no conoce proveedores, modelos, endpoints ni claves: no importa el motor ni nombra a nadie',
  !/from '\.\.\/engine|from '\.\.\/\.\.\/engine|providers\//.test(fuente) && !/\bfal\b|hunyuan|tencent|replicate|tripo|https?:\/\//i.test(sinComentarios)
  && (fuente.match(/^import .*$/gm) || []).every((l) => /from '\.\/(contracts|identity)'/.test(l)));
check('D2) un solo núcleo 3D: no hay otro grafo de escena ni otro compositor en el código del servidor',
  fs.readdirSync(path.join(RAIZ, 'functions/src/core')).filter((f) => /escena3d|scene3d|composer|compositor/i.test(f)).join() === 'escena3d.ts');
check('esta suite está en la cadena de `npm test`', /escena3d\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ núcleo 3D: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
