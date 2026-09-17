/*
 * LAS DOS COSAS QUE SOLO PASAN EN COREANO.
 *
 * ── 1 · NO HAY PLURAL, Y ESO TIENE UNA CONSECUENCIA QUE NO SE VE ────────────
 *
 * `Intl.PluralRules('ko')` declara UNA sola categoría: `other`. Ni `one`. Así
 * que con 0, con 1 y con 100 el traductor pide siempre `clave_other`, y la
 * clave `clave_one` —que el español obliga a declarar— NO SE LEE JAMÁS.
 *
 * Eso convierte un error normal en un error invisible: si alguien escribe en
 * `_one` un texto distinto pensando que es el singular, ese texto no aparecerá
 * nunca en ninguna pantalla y nadie se dará cuenta. Aquí se exige que las dos
 * formas digan LO MISMO, que es la única manera de que el archivo no mienta
 * sobre lo que hace.
 *
 * ── 2 · LAS PARTÍCULAS NO PUEDEN IR DETRÁS DE UN HUECO ──────────────────────
 *
 * 은/는, 이/가, 을/를, 와/과 y (으)로 cambian según si la palabra anterior
 * termina en consonante (받침) o en vocal:
 *
 *     이름이 (consonante)   vs   친구가 (vocal)
 *     이름을 (consonante)   vs   친구를 (vocal)
 *
 * Detrás de `{{nombre}}` no se sabe qué va a venir —una persona, un proyecto,
 * «Weë Studio»—, así que cualquier elección estará mal la mitad de las veces.
 * La salida NO es el remiendo «{{nombre}}을(를)», que se lee fatal: es
 * reescribir la frase, que es lo que hace la interfaz coreana de verdad.
 *
 * Ojo: los CONTADORES (개, 명, 일, 초, 분, 표, 단어…) no son partículas y sí
 * van pegados al número. `{{contador}}개` está bien.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const TEXTOS = path.resolve(raiz, 'i18n/textos');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const RE = new RegExp("^  ([A-Za-z][A-Za-z0-9_]*):\\s*'((?:[^'\\\\]|\\\\.)*)',$", 'gm');
const claves = (idioma, modulo) => {
  const p = path.join(TEXTOS, idioma, modulo);
  if (!fs.existsSync(p)) return null;
  const o = {};
  for (const m of fs.readFileSync(p, 'utf8').matchAll(RE)) o[m[1]] = m[2];
  return o;
};
const modulos = fs.readdirSync(path.join(TEXTOS, 'es')).filter((f) => f.endsWith('.ts') && f !== 'index.ts');

console.log('\n── A · El coreano no distingue número ──');
{
  const r = new Intl.PluralRules('ko');
  check('1) `Intl` declara una sola categoría para el coreano',
    r.resolvedOptions().pluralCategories.join(',') === 'other',
    r.resolvedOptions().pluralCategories.join(','));
  check('2) y con 0, 1, 2 y 100 pide siempre la misma',
    [0, 1, 2, 5, 100].every((n) => r.select(n) === 'other'));

  /*
   * De ahí la regla: `_one` existe porque el español la exige, pero como nadie
   * la va a leer, tiene que decir exactamente lo mismo que `_other`. Si algún
   * día el coreano ganase un plural, esto avisaría de que hay que revisarlas.
   */
  const distintas = [];
  let pares = 0;
  for (const modulo of modulos) {
    const ko = claves('ko', modulo);
    if (!ko) continue;
    for (const k of Object.keys(ko)) {
      if (!k.endsWith('_one')) continue;
      const otra = k.replace(/_one$/, '_other');
      if (!(otra in ko)) continue;
      pares++;
      if (ko[k] !== ko[otra]) distintas.push(`${modulo.replace('.ts', '')}.${k.replace('_one', '')}: «${ko[k]}» ≠ «${ko[otra]}»`);
    }
  }
  check('3) `_one` y `_other` dicen lo mismo en todas las claves con cantidad',
    distintas.length === 0,
    distintas.length ? distintas.slice(0, 4).join(' | ') : `${pares} pares`);

  /* Y que nadie haya inventado formas que el coreano no tiene. */
  const inventadas = [];
  for (const modulo of modulos) {
    const ko = claves('ko', modulo);
    if (!ko) continue;
    for (const k of Object.keys(ko)) if (/_(few|many|zero|two)$/.test(k)) inventadas.push(`${modulo.replace('.ts', '')}.${k}`);
  }
  check('4) y no hay `_few` ni `_many` inventados', inventadas.length === 0,
    inventadas.join(' ') || 'ninguno');
}

console.log('\n── B · Ninguna partícula variable pegada a un hueco ──');
{
  /*
   * Solo las que CAMBIAN con el 받침. Las invariables —에, 에서, 의, 도, 만—
   * se pueden pegar sin problema y no se buscan aquí.
   *
   * Se mira la partícula seguida de final de palabra o de un espacio: así
   * `{{nombre}}은` cae, pero `{{nombre}}은행` —«banco», que empieza por 은— no,
   * porque ahí el 은 es parte de otra palabra.
   */
  const PEGADA = /\}\}(은|는|이|가|을|를|와|과|으로|로)(?=$|[\s.,!?·:;)」』】…])/u;
  const REMIENDO = /\}\}[을를이가은는와과]\s*\([을를이가은는와과]\)/u;
  const pegadas = [], remiendos = [];
  for (const modulo of modulos) {
    const ko = claves('ko', modulo);
    if (!ko) continue;
    for (const [k, v] of Object.entries(ko)) {
      const m = v.match(PEGADA);
      if (m) pegadas.push(`${modulo.replace('.ts', '')}.${k}: «…${m[0]}» en «${v.slice(0, 44)}»`);
      if (REMIENDO.test(v)) remiendos.push(`${modulo.replace('.ts', '')}.${k}`);
    }
  }
  check('5) ninguna 은/는·이/가·을/를·와/과·(으)로 detrás de un {{hueco}}',
    pegadas.length === 0, pegadas.length ? pegadas.slice(0, 5).join(' | ') : 'limpio');
  check('6) ni el remiendo «{{x}}을(를)»', remiendos.length === 0,
    remiendos.join(' ') || 'ninguno');

  /* CONTROL: que esta prueba sepa reconocer el error que busca. */
  const TRAMPAS = ['{{nombre}}을 삭제할까요?', '{{titulo}}이 저장됐어요', '{{lista}}와 함께', '{{perfil}}로 이동'];
  const BUENAS = ['{{contador}}개', '{{nombre}} 삭제할까요?', '이름: {{nombre}}', '{{lugar}}에서 만든 사진', '{{nombre}}은행 계좌'];
  check('7) control: reconoce las cuatro formas mal pegadas',
    TRAMPAS.every((t) => PEGADA.test(t)), TRAMPAS.filter((t) => !PEGADA.test(t)).join(' | ') || 'las cuatro');
  check('8) control: y no molesta con los contadores ni con lo bien escrito',
    BUENAS.every((t) => !PEGADA.test(t)), BUENAS.filter((t) => PEGADA.test(t)).join(' | ') || 'ninguna');

  /*
   * DETRÁS DE UNA MARCA SÍ PUEDE IR PARTÍCULA, Y DEBE SER SIEMPRE LA MISMA.
   *
   * Lo de arriba prohíbe la partícula detrás de un HUECO, porque lo que salga
   * de él no se sabe. Detrás de un nombre propio FIJO no hay ningún misterio:
   * el coreano las pega con normalidad —«Instagram을»— y la marca no se toca,
   * porque la partícula es otra palabra pegada, no una deformación.
   *
   * Pero la serie la fija cómo se LEE la marca, y eso no cambia de una frase a
   * otra: «Credits» se lee 크레디츠 y acaba en vocal, así que le toca la serie
   * 가/는/를/와/로 SIEMPRE; «WeeTalk» se lee 위톡 y acaba en consonante, así que
   * le toca 이/은/을/과/으로 SIEMPRE. Mezclarlas es el error, y es de los que no
   * se ven leyendo un archivo de dos mil líneas.
   */
  const VOCAL = { 는: 1, 가: 1, 를: 1, 와: 1, 로: 1 };
  const CONSONANTE = { 은: 1, 이: 1, 을: 1, 과: 1, 으로: 1 };
  const MARCAS = /(Weë Brain|Weë AI|Weë Studio|Weë Travel|Weë Business|Weë Credits|WeeTalk|ËContact|Weëls|Credits|Weë)(은|는|이|가|을|를|와|과|으로|로)/gu;
  const series = new Map();
  for (const modulo of modulos) {
    const ko = claves('ko', modulo);
    if (!ko) continue;
    for (const v of Object.values(ko)) {
      for (const [, marca, part] of v.matchAll(MARCAS)) {
        const serie = VOCAL[part] ? 'vocal' : CONSONANTE[part] ? 'consonante' : '?';
        if (!series.has(marca)) series.set(marca, new Map());
        const m = series.get(marca);
        m.set(serie, (m.get(serie) || 0) + 1);
      }
    }
  }
  const mezcladas = [...series].filter(([, m]) => m.size > 1)
    .map(([marca, m]) => `${marca}: ${[...m].map(([s, n]) => `${s}×${n}`).join(' y ')}`);
  check('9) cada marca usa siempre la misma serie de partículas',
    mezcladas.length === 0,
    mezcladas.length ? mezcladas.join(' | ')
      : [...series].map(([m, s]) => `${m}→${[...s.keys()][0]}`).join(' · ') || 'ninguna lleva partícula');
}

console.log('\n── C · El coreano se vale solo ──');
{
  /* El mismo cargador diminuto que usa `i18n.test.mjs`. */
  const ts = require('typescript');
  const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
  const cargados = new Map();
  const cargar = async (ruta) => {
    if (cargados.has(ruta)) return cargados.get(ruta);
    let js = ts.transpileModule(leer(ruta), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
    for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
      const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
      js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
    }
    const url = comoModulo(js);
    const resultado = { url, ns: await import(url) };
    cargados.set(ruta, resultado);
    return resultado;
  };

  const traducir = (await cargar('i18n/traducir.ts')).ns;
  const ko = (await cargar('i18n/textos/ko/index.ts')).ns.ko;
  const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
  const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

  /*
   * Un diccionario incompleto no se nota: la cadena de respaldo tapa el hueco
   * con inglés y la pantalla parece correcta. Se monta uno SIN respaldo.
   */
  const solo = traducir.crearTraductor('ko-KR', { ko });
  const conRespaldo = traducir.crearTraductor('ko-KR', { ko, es, en });
  const MUESTRA = ['nav.home', 'menu.settings', 'credits.title', 'auth.password', 'wall.pollVotes',
    'settings.privacyPolicy', 'brain.placeholder', 'weeai.title', 'help.title', 'common.cancel'];
  const distintas = MUESTRA.filter((c) => solo(c, { contador: 2 }) !== conRespaldo(c, { contador: 2 }));
  check('10) quitando español e inglés, el coreano dice exactamente lo mismo',
    distintas.length === 0, distintas.join(' ') || `${MUESTRA.length} claves`);

  const hangul = MUESTRA.filter((c) => /[가-힯]/.test(solo(c, { contador: 2 })));
  check('11) y lo que sale está en hangul', hangul.length >= 8,
    `${hangul.length} de ${MUESTRA.length} (las marcas como Credits van en latino a propósito)`);

  /* Y que el número no cambie el texto, que es lo que dice la sección A. */
  const cambian = [];
  for (const modulo of modulos) {
    const m = claves('ko', modulo);
    if (!m) continue;
    for (const k of Object.keys(m)) {
      if (!k.endsWith('_one')) continue;
      const clave = `${modulo.replace('.ts', '')}.${k.replace('_one', '')}`;
      const uno = solo(clave, { contador: 1, titulo: 'T', lista: 'L' });
      const varios = solo(clave, { contador: 7, titulo: 'T', lista: 'L' });
      if (uno.replace(/\d+/g, '#') !== varios.replace(/\d+/g, '#')) cambian.push(`${clave}: «${uno}» vs «${varios}»`);
    }
  }
  check('12) y con 1 o con 7 sale la misma frase, solo cambia la cifra',
    cambian.length === 0, cambian.slice(0, 3).join(' | ') || 'todas iguales');
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
