/*
 * LOS DETECTORES DEL REVISOR DE WEË — `ops/revision/detectores.mjs` (docs/REVISION.md, capa 2).
 *
 * Todo con FIXTURES: mini repositorios git en un directorio temporal, nunca conteos del repositorio real (que
 * cambia mientras otros trabajan). Se fija:
 *   1. cada regla dispara en su caso positivo y calla en el negativo;
 *   2. el id y la huella NO cambian al insertar líneas en blanco ni al mover la función (el ancla es un símbolo);
 *   3. un ciclo de solo tipos no cuenta y uno de valor sí (con el comprobador de TypeScript para lo dudoso);
 *   4. un import a un archivo que git no sigue es BLOQUEANTE;
 *   5. las reglas que comparan con la base (cruzar 1000 líneas, reglas de Firebase, frontera);
 *   6. el SARIF 2.1.0 lleva huella e id en `partialFingerprints`;
 *   7. SABOTAJE: con una copia de los detectores rota a propósito, las comprobaciones correspondientes FALLAN.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const temporales = [];

/* ── fixtures ───────────────────────────────────────────────────────────── */

const escribir = (dir, archivos) => {
  for (const [ruta, texto] of Object.entries(archivos)) {
    const abs = path.join(dir, ruta);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, texto);
  }
};

const crearRepo = (archivos) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-det-'));
  temporales.push(dir);
  const git = (...args) => {
    const r = spawnSync('git', ['-C', dir, '-c', 'core.autocrlf=false', '-c', 'user.email=revisor@wee.invalid', '-c', 'user.name=revisor', ...args], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  git('init', '-q');
  escribir(dir, archivos);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return { dir, git, escribir: (m) => escribir(dir, m), base: git('rev-parse', 'HEAD') };
};

const lineas = (n, prefijo = 'x') => Array.from({ length: n }, (_, i) => `export const ${prefijo}${i} = ${i};`).join('\n') + '\n';

/** Copia de ops/revision con cambios de sabotaje; node_modules por unión (junction) para resolver typescript. */
const copiaSaboteada = (cambios) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-sab-'));
  temporales.push(dir);
  const destino = path.join(dir, 'ops/revision');
  fs.mkdirSync(destino, { recursive: true });
  for (const f of fs.readdirSync(path.join(RAIZ, 'ops/revision'))) {
    if (f.endsWith('.mjs')) fs.copyFileSync(path.join(RAIZ, 'ops/revision', f), path.join(destino, f));
  }
  fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
  for (const [archivo, pares] of Object.entries(cambios)) {
    const f = path.join(destino, archivo);
    let t = fs.readFileSync(f, 'utf8');
    for (const [a, b] of pares) {
      if (!t.includes(a)) throw new Error(`el sabotaje no encontró en ${archivo}: ${a}`);
      t = t.replace(a, b);
    }
    fs.writeFileSync(f, t);
  }
  return dir;
};
const importarDe = (raiz, rel) => import(pathToFileURL(path.join(raiz, rel)).href);

/* ── repo A: reglas de archivo ──────────────────────────────────────────── */

const A = crearRepo({
  'App.tsx': "import { Aviso } from './components/Aviso';\nexport default function App() { return Aviso; }\n",
  'components/Aviso.tsx': `import { Alert, Platform } from 'react-native';
export function Aviso() {
  Alert.alert('t', 'm', [{ text: 'ok', onPress: () => {} }]);
}
export function SoloNativo() {
  if (Platform.OS !== 'web') {
    Alert.alert('t', 'm', [{ text: 'ok' }]);
  }
}
export function ConSalida() {
  if (Platform.OS === 'web') { window.alert('x'); return; }
  Alert.alert('t', 'm', [{ text: 'ok' }]);
}
export function SinBotones() {
  Alert.alert('t', 'm');
}
`,
  'components/Aviso.native.tsx': "import { Alert } from 'react-native';\nexport function Aviso() { Alert.alert('t', 'm', [{ text: 'ok' }]); }\n",
  'components/Muerto.tsx': 'export const Muerto = 1;\n',
  'utils/tipos.ts': 'export const a: any = 1;\nexport const b = (globalThis as any).x;\n',
  'utils/sinAny.ts': 'export const c: number = 1;\n',
  'functions/package.json': JSON.stringify({ scripts: { test: 'node test/a.test.mjs' } }),
  'functions/src/engine/providers/falso.ts': "import OpenAI from 'openai';\nexport const URL_FALSA = 'https://api.proveedor-falso.ai/v1/generar';\nexport const cliente = OpenAI;\n",
  'functions/src/creator/llamada.ts': "import OpenAI from 'openai';\nexport const u = 'https://api.proveedor-falso.ai/v2';\nexport const o = OpenAI;\n",
  'functions/src/creator/limpio.ts': "export const u = 'https://firebasestorage.googleapis.com/x';\n",
  'services/catchs.ts': `export async function cargar(p: Promise<unknown>) {
  try { await p; } catch { }
  p.catch(() => {});
  p.then(() => 1).catch(() => null);
  try { await p; } catch (e) { console.error(e); }
}
`,
  'functions/src/servidor.ts': 'export function f(g: () => void) { try { g(); } catch (e) {} }\n',
  'services/consultas.ts': `import { getDocs, collection, query, limit, where } from 'firebase/firestore';
export async function todas(db: unknown) { return getDocs(collection(db, 'a')); }
export async function acotada(db: unknown) { return getDocs(query(collection(db, 'a'), where('x', '==', 1), limit(10))); }
export async function sinLimite(db: unknown) { return getDocs(query(collection(db, 'a'), where('x', '==', 1))); }
`,
  'functions/src/admin.ts': `export async function leer(db: { collection: (n: string) => any }) {
  const a = await db.collection('a').where('x', '==', 1).get();
  const b = await db.collection('a').limit(5).get();
  const c = await db.collection('a').doc('x').get();
  const d = await db.collection('a').count().get();
  return [a, b, c, d];
}
`,
  'hooks/useReloj.ts': `import { useEffect } from 'react';
export function useReloj() {
  useEffect(() => { const id = setInterval(() => {}, 1000); }, []);
}
export function useRelojLimpio() {
  useEffect(() => { const id = setInterval(() => {}, 1000); return () => clearInterval(id); }, []);
}
export function useRelojConRef(ref: { current: ReturnType<typeof setInterval> | null }) {
  useEffect(() => { ref.current = setInterval(() => {}, 1000); return () => detener(); }, []);
  function detener() { if (ref.current) clearInterval(ref.current); }
}
`,
  'services/textos.ts': `export function usar(setError: (s: string) => void, t: (k: string) => string, notify: (a: string) => void) {
  setError('No se pudo cargar la lista');
  setError(t('lista.error'));
  notify('Guardado con éxito');
  console.log('Esto es un registro interno');
  if (Math.random() > 2) throw new Error('Algo salió muy mal');
  setError('ok');
}
`,
  'screens/Pantalla.tsx': "export function P(setError: (s: string) => void) { setError('No se pudo cargar'); }\n",
  'functions/test/a.test.mjs': `let failures = 0;
const check = (n, c) => { if (!c) failures++; };
check('siempre', true);
try { JSON.parse('{}'); check('no lanza', true); } catch (e) { check('no lanza', false); }
check('o verdad', 1 === 2 || true);
const noLanza = (n, fn) => { fn(); check(n, true); };
if (failures) check('cond', true); else check('cond', false);
check('de verdad', failures === 0);
`,
  'functions/test/b.test.mjs': "console.log('huérfana');\n",
  'utils/importa.ts': "import { x } from './fantasma';\nimport { y } from './suelto';\nimport { z } from './nuevo';\nconst w = require('../functions/lib/compilado.js');\nexport const todo = [x, y, z, w];\n",
});
A.escribir({ 'utils/suelto.ts': 'export const y = 1;\n', 'utils/nuevo.ts': 'export const z = 1;\n' });
A.git('add', '-N', 'utils/nuevo.ts');

const D = await importarDe(RAIZ, 'ops/revision/detectores.mjs');
const { aSarif } = await importarDe(RAIZ, 'ops/revision/sarif.mjs');

const de = (r, regla) => r.hallazgos.filter((h) => h.regla === regla);
const rutasDe = (r, regla) => de(r, regla).map((h) => h.evidencia.ruta).sort();

/** Las comprobaciones, como funciones del módulo de detectores: así el sabotaje las puede volver a correr. */
const pruebasDeArchivo = {
  higiene: async (M) => {
    const r = M.analizar({ raiz: A.dir, solo: ['higiene'] });
    const hs = de(r, 'higiene/import-sin-seguimiento');
    const mensajes = hs.map((h) => h.mensaje).join(' | ');
    return hs.length === 2 && hs.every((h) => h.severidad === 'bloqueante') && /fantasma/.test(mensajes) && /suelto/.test(mensajes)
      && !/nuevo/.test(mensajes) && !/compilado/.test(mensajes);
  },
};

const rA = D.analizar({ raiz: A.dir });
check('1) la higiene es BLOQUEANTE: un import a un archivo que no existe y otro a uno que git no sigue', await pruebasDeArchivo.higiene(D),
  JSON.stringify(de(rA, 'higiene/import-sin-seguimiento').map((h) => h.mensaje)));
check('2) un archivo marcado con `git add -N` cuenta como seguido, y lo que sale del build (functions/lib) no se exige',
  !de(rA, 'higiene/import-sin-seguimiento').some((h) => /nuevo|compilado/.test(h.mensaje)));
check('3) web/alert-con-botones: solo el Alert con botones que corre en la web (no el nativo, ni el de Platform.OS, ni tras la salida web, ni sin botones)',
  JSON.stringify(de(rA, 'web/alert-con-botones').map((h) => h.id)) === JSON.stringify(['web/alert-con-botones/components/Aviso.tsx#Aviso']),
  JSON.stringify(de(rA, 'web/alert-con-botones').map((h) => h.id)));
/*
 * + cierre 2026-10-01: un aviso SIN manejadores tampoco se ve en la web (Alert.alert es una función vacía en
 * react-native-web). Lo caza su propia regla —la de botones habla de trabajo que no corre y no cambia de significado—,
 * con las mismas excepciones: el archivo .native, el `if (Platform.OS !== 'web')` y lo que va tras la salida web.
 */
const sinBoton = de(rA, 'web/alert-sin-boton').map((h) => h.id).sort();
check('3b) web/alert-sin-boton: el aviso sin botones que corre en la web; ni el nativo, ni el guardado, ni el que tiene botones',
  JSON.stringify(sinBoton) === JSON.stringify(['web/alert-sin-boton/components/Aviso.tsx#SinBotones']),
  JSON.stringify(sinBoton));
const anyTipos = de(rA, 'tipos/any');
const anyDe = (ruta) => anyTipos.find((h) => h.evidencia.ruta === ruta);
check('4) tipos/any cuenta por archivo (2 en utils/tipos.ts, 1 en functions/src/admin.ts) y no aparece en un archivo sin any',
  anyDe('utils/tipos.ts')?.cuenta === 2 && anyDe('utils/tipos.ts')?.id === 'tipos/any/utils/tipos.ts#(archivo)'
  && anyDe('functions/src/admin.ts')?.cuenta === 1 && !anyDe('utils/sinAny.ts') && anyTipos.length === 2,
  JSON.stringify(anyTipos.map((h) => `${h.id}:${h.cuenta}`)));
const ia = de(rA, 'ia/host-fuera-de-adaptador');
check('5) ia/host-fuera-de-adaptador: el host leído del adaptador y el SDK fuera de providers, sí; dentro del adaptador o un host que no es de IA, no',
  ia.length === 2 && ia.every((h) => h.evidencia.ruta === 'functions/src/creator/llamada.ts') && ia.some((h) => /openai/.test(h.mensaje)) && ia.some((h) => /proveedor-falso/.test(h.mensaje)),
  JSON.stringify(ia.map((h) => h.id)));
const catchs = de(rA, 'errores/catch-traga');
check('6) errores/catch-traga: catch vacío y .catch(() => {}|null), baja en el cliente y media en functions/src; no un catch que registra',
  catchs.filter((h) => h.evidencia.ruta === 'services/catchs.ts').length === 3 && catchs.filter((h) => h.evidencia.ruta === 'services/catchs.ts').every((h) => h.severidad === 'baja')
  && catchs.filter((h) => h.evidencia.ruta === 'functions/src/servidor.ts').length === 1 && catchs.find((h) => h.evidencia.ruta === 'functions/src/servidor.ts').severidad === 'media',
  JSON.stringify(catchs.map((h) => `${h.id}:${h.severidad}`)));
const consultas = de(rA, 'escala/consulta-sin-limite');
check('7) escala/consulta-sin-limite: getDocs(collection) y getDocs(query sin limit) en el cliente; .where().get() en el servidor; no con limit, doc ni count',
  JSON.stringify(consultas.map((h) => h.id).sort()) === JSON.stringify([
    'escala/consulta-sin-limite/functions/src/admin.ts#leer',
    'escala/consulta-sin-limite/services/consultas.ts#sinLimite',
    'escala/consulta-sin-limite/services/consultas.ts#todas',
  ]), JSON.stringify(consultas.map((h) => h.id)));
const intervalos = de(rA, 'react/intervalo-sin-limpieza');
check('8) react/intervalo-sin-limpieza: el efecto sin limpieza, sí (aunque otro efecto limpie un `id` con el mismo nombre); con clearInterval directo o por una función auxiliar, no',
  intervalos.length === 1 && intervalos[0].id === 'react/intervalo-sin-limpieza/hooks/useReloj.ts#useReloj', JSON.stringify(intervalos.map((h) => h.id)));
const textos = de(rA, 'i18n/texto-a-mano-fuera-de-pantallas');
check('9) i18n/texto-a-mano: frases en setters y notify (media) y en throw (baja) en services/; no t(), ni console, ni una palabra suelta, ni screens/',
  textos.length === 3 && textos.filter((h) => h.severidad === 'media').length === 2 && textos.filter((h) => h.severidad === 'baja').length === 1
  && textos.every((h) => h.evidencia.ruta === 'services/textos.ts'), JSON.stringify(textos.map((h) => `${h.mensaje}:${h.severidad}`)));
check('10) tests/suite-huerfana: la suite que no está en scripts.test, sí; la que está, no',
  JSON.stringify(rutasDe(rA, 'tests/suite-huerfana')) === JSON.stringify(['functions/test/b.test.mjs']));
const asertos = de(rA, 'tests/aserto-siempre-verdadero');
check('11) tests/aserto-siempre-verdadero: check(x, true) suelto y `|| true`, sí; dentro de try, de noLanza o de un if/else, no',
  asertos.length === 2 && asertos.some((h) => /'siempre'/.test(h.evidencia.fragmento)) && asertos.some((h) => /o verdad/.test(h.evidencia.fragmento)),
  JSON.stringify(asertos.map((h) => h.evidencia.fragmento)));
check('12) muerto/modulo-sin-importador: un componente al que no llega App.tsx, sí; el que importa App.tsx, no',
  rutasDe(rA, 'muerto/modulo-sin-importador').includes('components/Muerto.tsx') && !rutasDe(rA, 'muerto/modulo-sin-importador').includes('components/Aviso.tsx')
  && de(rA, 'muerto/modulo-sin-importador').every((h) => h.severidad === 'baja'));
check('13) sin --base no corren las reglas que comparan (ni aparecen en `reglas` del resultado)',
  !('tamano/cruza-mil-lineas' in rA.reglas) && !('reglas/cambio-peligroso' in rA.reglas) && rA.disparadores.length === 0);
check('14) ningún id lleva un número de línea: el ancla es un símbolo o (archivo)/(modulo)/(ciclo)',
  rA.hallazgos.every((h) => !/#L?\d+$/.test(h.id) && !/:\d+$/.test(h.id)) && rA.hallazgos.every((h) => /^[0-9a-f]{64}$/.test(h.huella)));

/* ── tamaño: 1000 líneas ───────────────────────────────────────────────── */

const B = crearRepo({
  'functions/src/grande.ts': lineas(999),
  'functions/src/enorme.ts': lineas(1001),
  'functions/src/justo.ts': lineas(1000),
  'functions/src/index.ts': "export { hola } from './saludo/hola';\n",
  'functions/src/saludo/hola.ts': "export const hola = () => 'hola';\n",
  'functions/src/otra/b.ts': 'export const b = 1;\n',
  'firestore.rules': `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function esAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    match /notas/{id} {
      allow write: if request.auth != null;
    }
    match /oficiales/{id} {
      allow create: if request.auth.token.admin == true;
    }
  }
}
`,
});
B.escribir({
  'functions/src/grande.ts': lineas(1002),
  'functions/src/enorme.ts': lineas(1100),
  'functions/src/nueva/n.ts': "import { b } from '../otra/b';\nexport const n = b;\n",
  'functions/src/index.ts': "export { hola } from './saludo/hola';\nexport { n } from './nueva/n';\n",
  'firestore.rules': `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function esAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    match /notas/{id} {
      allow write: if true;
    }
    match /oficiales/{id} {
      allow create: if esAdmin();
    }
  }
}
`,
});
B.git('add', '-N', 'functions/src/nueva/n.ts');
const rB = D.analizar({ raiz: B.dir, base: B.base });
check('15) tamano/archivo-mil-lineas: 1001 y más, sí; exactamente 1000, no',
  JSON.stringify(rutasDe(rB, 'tamano/archivo-mil-lineas')) === JSON.stringify(['functions/src/enorme.ts', 'functions/src/grande.ts']));
check('16) tamano/cruza-mil-lineas (con base): de 999 a 1002, sí; de 1001 a 1100 (ya estaba por encima), no',
  JSON.stringify(rutasDe(rB, 'tamano/cruza-mil-lineas')) === JSON.stringify(['functions/src/grande.ts']));
const peligro = de(rB, 'reglas/cambio-peligroso');
check('17) reglas/cambio-peligroso: `allow write: if true` añadido es BLOQUEANTE, anclado en su match',
  peligro.some((h) => h.severidad === 'bloqueante' && h.id === 'reglas/cambio-peligroso/firestore.rules#/databases/{database}/documents/notas/{id}@' + h.huella.slice(0, 10) && /if true/.test(h.mensaje)),
  JSON.stringify(peligro.map((h) => `${h.id}:${h.severidad}`)));
check('18) …y la condición de auth retirada de ese bloque es ALTA; pasarla a una función auxiliar que la contiene (esAdmin) no cuenta',
  peligro.some((h) => h.severidad === 'alta' && /notas/.test(h.id) && /request\.auth != null/.test(h.mensaje)) && !peligro.some((h) => /oficiales/.test(h.id)),
  JSON.stringify(peligro.map((h) => h.mensaje)));
const tipos = (t) => rB.disparadores.filter((d) => d.tipo === t);
check('19) frontera: carpeta nueva en functions/src, arista nueva entre carpetas y exports de index.ts cambiados (DISPARADORES, no hallazgos)',
  tipos('carpeta-nueva').some((d) => d.detalle === 'functions/src/nueva')
  && tipos('arista-nueva').some((d) => d.detalle === 'functions/src/nueva → functions/src/otra')
  && tipos('exports-index').some((d) => JSON.stringify(d.anadidos) === '["n"]' && d.retirados.length === 0)
  && !rB.hallazgos.some((h) => h.regla === 'frontera/cambio'), JSON.stringify(rB.disparadores.map((d) => `${d.tipo}:${d.detalle}`)));
check('20) frontera: tocar firestore.rules y functions/src/index.ts dispara sus zonas rojas',
  tipos('zona-roja').some((d) => d.detalle === 'firestore.rules') && tipos('zona-roja').some((d) => d.detalle === 'functions/src/index.ts'));

/* ── ids y huellas estables ─────────────────────────────────────────────── */

const C = crearRepo({
  'services/estable.ts': `export function primera() { return 1; }
export async function segunda(p: Promise<unknown>) {
  p.catch(() => {});
  p.then(() => 1).catch(() => {});
}
export const objeto = {
  cargar: (p: Promise<unknown>) => { p.catch(() => {}); },
};
`,
});
const pruebaEstabilidad = async (M) => {
  C.escribir({
    'services/estable.ts': `export function primera() { return 1; }
export async function segunda(p: Promise<unknown>) {
  p.catch(() => {});
  p.then(() => 1).catch(() => {});
}
export const objeto = {
  cargar: (p: Promise<unknown>) => { p.catch(() => {}); },
};
`,
  });
  const antes = M.analizar({ raiz: C.dir, solo: ['errores'] }).hallazgos.map((h) => `${h.id}|${h.huella}`).sort();
  C.escribir({
    'services/estable.ts': `

// un comentario nuevo arriba


export const objeto = {
  cargar: (p: Promise<unknown>) => {
    p.catch(() => {});
  },
};
export async function segunda(p: Promise<unknown>) {

  p.catch(() => {   });

  p.then(() => 1)
    .catch(() => {});
}


export function primera() { return 1; }
`,
  });
  const despues = M.analizar({ raiz: C.dir, solo: ['errores'] }).hallazgos.map((h) => `${h.id}|${h.huella}`).sort();
  return { antes, despues, ok: antes.length === 3 && JSON.stringify(antes) === JSON.stringify(despues) };
};
const est = await pruebaEstabilidad(D);
check('21) id y huella ESTABLES al insertar líneas en blanco, comentarios y espacios, y al mover las funciones', est.ok, `${est.antes.join(' ; ')} ≠ ${est.despues.join(' ; ')}`);
check('22) dos hallazgos en la misma ancla llevan un sufijo derivado del contenido (no del orden), distinto entre ellos',
  est.antes.filter((x) => x.includes('#segunda@')).length === 2 && new Set(est.antes.map((x) => x.split('|')[0])).size === 3
  && est.antes.some((x) => x.startsWith('errores/catch-traga/services/estable.ts#objeto.cargar|')), est.antes.join(' ; '));

/* ── ciclos: valor sí, tipos no ─────────────────────────────────────────── */

const E = crearRepo({
  'src/a.ts': "import { b } from './b';\nexport const a = () => b();\n",
  'src/b.ts': "import { a } from './a';\nexport const b = () => a();\n",
  'src/c.ts': "import { D } from './d';\nexport const c = (x: D) => x;\n",
  'src/d.ts': "import { c } from './c';\nexport interface D { n: number }\nexport const d = c;\n",
  'src/e.ts': "import type { F } from './f';\nexport const e = 1;\nexport type E = F;\n",
  'src/f.ts': "import { e } from './e';\nexport type F = number;\nexport const f = e;\n",
  'src/g.ts': "export * from './h';\nexport const g = 1;\n",
  'src/h.ts': "import { g } from './g';\nexport const usaG = () => g;\n",
  'src/i.ts': "export * from './j';\nexport const i = 1;\n",
  'src/j.ts': "import { i } from './i';\nconst interno = i;\nexport interface J { x: typeof interno }\n",
  'src/k.ts': "export { K } from './l';\nexport const k = 1;\n",
  'src/l.ts': "import { k } from './k';\nconst usado = k;\nexport interface K { v: typeof usado }\n",
});
const pruebaCiclos = (M) => {
  const r = M.analizar({ raiz: E.dir, solo: ['ciclos'] });
  const ids = de(r, 'ciclos/import-ciclico').map((h) => h.id).sort();
  return { r, ids, ok: JSON.stringify(ids) === JSON.stringify(['ciclos/import-ciclico/src/a.ts#(ciclo)', 'ciclos/import-ciclico/src/g.ts#(ciclo)']) };
};
const ciclos = pruebaCiclos(D);
check('23) un ciclo de VALOR cuenta (a↔b, y g↔h por `export *` de un módulo con valores); uno de solo tipos no (import type, nombre usado solo como tipo)',
  ciclos.ok, JSON.stringify(ciclos.ids));
check('24) el comprobador de tipos decide lo dudoso: `export *` y `export { K }` de módulos con solo tipos no forman ciclo (4 candidatos → 2 ciclos)',
  ciclos.r.ciclosAntesDelComprobador === 4 && ciclos.ids.length === 2, `antes ${ciclos.r.ciclosAntesDelComprobador}`);
check('25) el mensaje del ciclo da un camino concreto y la huella es la del conjunto de módulos',
  de(ciclos.r, 'ciclos/import-ciclico').some((h) => /src\/a\.ts → src\/b\.ts → src\/a\.ts/.test(h.mensaje)));

/* ── SARIF ──────────────────────────────────────────────────────────────── */

const sarif = aSarif(rA, null);
const run = sarif.runs?.[0];
check('26) SARIF 2.1.0: una entrada por hallazgo, con la huella y el id en partialFingerprints y la regla en el catálogo',
  sarif.version === '2.1.0' && run.results.length === rA.hallazgos.length
  && run.results.every((x, i) => x.partialFingerprints['weeHuella/v1'] === rA.hallazgos[i].huella && x.partialFingerprints['weeId/v1'] === rA.hallazgos[i].id)
  && run.results.every((x) => run.tool.driver.rules[x.ruleIndex]?.id === x.ruleId));
const { clasificar } = await importarDe(RAIZ, 'ops/revision/clasificacion.mjs');
const conBaseline = aSarif(rA, clasificar(rA.hallazgos, { version: 1, corte: A.base, reglas: {}, entradas: [{ id: 'tipos/any/utils/viejo.ts#(archivo)', regla: 'tipos/any', estado: 'PREEXISTENTE', severidad: 'media', origen: 'detector', titulo: 'x', desde: '2026-10-01' }] }, { cambiados: new Set() }));
check('27) con baseline, cada resultado lleva baselineState (new/unchanged/updated/absent) y lo que desapareció sale como absent',
  conBaseline.runs[0].results.every((x) => ['new', 'unchanged', 'updated', 'absent'].includes(x.baselineState))
  && conBaseline.runs[0].results.some((x) => x.baselineState === 'absent' && x.properties.id === 'tipos/any/utils/viejo.ts#(archivo)'));

/* ── la línea de órdenes ────────────────────────────────────────────────── */

const salidaJson = path.join(A.dir, 'salida.json');
const cli = spawnSync(process.execPath, [path.join(RAIZ, 'ops/revision/detectores.mjs'), '--raiz', A.dir, '--json', salidaJson, '--solo', 'higiene,tipos'], { encoding: 'utf8', timeout: 120000 });
const leido = fs.existsSync(salidaJson) ? JSON.parse(fs.readFileSync(salidaJson, 'utf8')) : null;
check('28) la CLI escribe el JSON pedido, respeta --solo y sale con 0 (el detector no decide la puerta)',
  cli.status === 0 && leido && Object.keys(leido.recuento).sort().join() === 'higiene/import-sin-seguimiento,tipos/any', cli.stderr || cli.stdout);
const aStdout = spawnSync(process.execPath, [path.join(RAIZ, 'ops/revision/detectores.mjs'), '--raiz', A.dir, '--json', '-', '--solo', 'tipos'], { encoding: 'utf8', timeout: 120000 });
let porStdout = null;
try { porStdout = JSON.parse(aStdout.stdout); } catch { porStdout = null; }
check('29) `--json -` imprime el JSON (y nada más) en la salida estándar: así lo usan los revisores de solo lectura',
  aStdout.status === 0 && porStdout && porStdout.hallazgos.length === 2 && porStdout.hallazgos.every((h) => h.regla === 'tipos/any'), aStdout.stderr);

/* ── SABOTAJE ───────────────────────────────────────────────────────────── */

const sabotajes = [
  {
    nombre: 'la higiene deja de mirar lo que no está en git',
    cambios: { 'detectores.mjs': [["if (!r || (r.estado !== 'sin-seguimiento' && r.estado !== 'inexistente')) continue;", 'continue;']] },
    prueba: async (M) => pruebasDeArchivo.higiene(M),
  },
  {
    nombre: 'un `import type` pasa a contar como valor',
    cambios: { 'grafo.mjs': [["if (imp.tipo === 'tipo' || imp.tipo === 'dinamico') return false;", "if (imp.tipo === 'dinamico') return false;\n  if (imp.tipo === 'tipo') return true;"]] },
    prueba: async (M) => pruebaCiclos(M).ok,
  },
  {
    nombre: 'ni el análisis sintáctico ni el comprobador separan los nombres usados solo como tipo',
    cambios: {
      'grafo.mjs': [['return imp.nombres.some((n) => usados.has(n.local));', 'return true;']],
      'detectores.mjs': [['const soloTipos = candidatas.length ? refinarConComprobador(raiz, miembros, candidatas, resolverPrimero) : new Set();', 'const soloTipos = new Set();']],
    },
    prueba: async (M) => pruebaCiclos(M).ok,
  },
  {
    nombre: 'se apaga el comprobador de tipos',
    cambios: { 'detectores.mjs': [['const soloTipos = candidatas.length ? refinarConComprobador(raiz, miembros, candidatas, resolverPrimero) : new Set();', 'const soloTipos = new Set();']] },
    prueba: async (M) => pruebaCiclos(M).ok,
  },
  {
    nombre: 'el ancla pasa a ser el número de línea',
    cambios: { 'detectores.mjs': [["ancla: extra.ancla ?? (nodo ? anclaDe(nodo) : '(archivo)'),", "ancla: extra.ancla ?? (nodo ? `L${lineaDe(sf, nodo)}` : '(archivo)'),"]] },
    prueba: async (M) => (await pruebaEstabilidad(M)).ok,
  },
];
for (const s of sabotajes) {
  const dir = copiaSaboteada(s.cambios);
  const M = await importarDe(dir, 'ops/revision/detectores.mjs');
  let resultado;
  try { resultado = await s.prueba(M); } catch { resultado = false; }
  check(`30) SABOTAJE «${s.nombre}»: la comprobación correspondiente FALLA`, resultado === false);
}
// Y la prueba de estabilidad, con los detectores buenos, sigue pasando después de los sabotajes (el fixture no quedó tocado).
check('31) tras los sabotajes, los detectores buenos siguen pasando la estabilidad', (await pruebaEstabilidad(D)).ok);

/* ── el repositorio real: solo informativo, sin aserciones de conteo ───── */

const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'functions/package.json'), 'utf8'));
if (!/revision-detectores\.test\.mjs/.test(pkg.scripts?.test || '')) console.log('· aviso: esta suite aún no está en scripts.test de functions/package.json');

for (const dir of temporales) {
  try { fs.unlinkSync(path.join(dir, 'node_modules')); } catch { /* no había unión */ }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* Windows puede retener un archivo: se queda en el temporal */ }
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
