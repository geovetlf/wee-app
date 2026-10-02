/**
 * NINGÚN TEXTO SUELTO DENTRO DE UNA VISTA — EL AVISO «Unexpected text node».
 *
 *   node test/jsx-textos-sueltos.test.mjs          (DETALLE=1 lista cada sitio)
 *
 * La consola de la web decía «Unexpected text node: . A text node cannot be a child of a <View>». El punto es del
 * propio mensaje de react-native-web; el hijo era una CADENA VACÍA: `{texto && <Algo/>}` con `texto === ''` deja ''
 * dentro de un View. En la web es un aviso; en el teléfono, una cadena no vacía o un 0 en ese sitio hace caer la app
 * («Text strings must be rendered within a <Text> component»).
 *
 * Esta prueba usa el COMPROBADOR DE TIPOS de TypeScript sobre todas las pantallas y componentes: cada `x && <JSX>`
 * que es hijo de un elemento —salvo de un <Text>, donde un texto es lo normal— exige que `x` no pueda ser texto ni
 * número. Con `!!x`, `x !== ''` o `x ? … : null`, pasa.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const ts = require('typescript');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const listar = (d) => fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.tsx$/.test(e.name) ? [`${d}/${e.name}`] : []));
const ARCHIVOS = ['screens', 'components', 'navigation', 'contexts'].flatMap(listar).concat(['App.tsx']);
const tsconfig = ts.readConfigFile(path.resolve(raiz, 'tsconfig.json'), ts.sys.readFile).config;
const { options } = ts.parseJsonConfigFileContent(tsconfig, ts.sys, raiz);
const programa = ts.createProgram(ARCHIVOS.map((f) => path.resolve(raiz, f)), { ...options, noEmit: true, skipLibCheck: true });

/* ¿Puede ser texto o número? Recorre las uniones; `any` y los genéricos sin resolver no cuentan (no se sabe). */
const puedeSerTextoONumero = (tipo) => {
  if (tipo.isUnion()) return tipo.types.some(puedeSerTextoONumero);
  return !!(tipo.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike));
};
const TEXTO = /^(Text|Animated\.Text|TextoEnMayusculas|TextInput)$/;
/* EL DETECTOR, como función: lo usan la comprobación de la app y el control (que lo EJECUTA sobre un caso propio). */
const buscarSitios = (programa, archivos, base) => {
const checker = programa.getTypeChecker();
const sitios = [];
for (const archivo of archivos) {
  const src = programa.getSourceFile(path.resolve(base, archivo));
  if (!src) continue;
  const visitar = (n) => {
    if (ts.isJsxExpression(n) && n.expression && ts.isBinaryExpression(n.expression) && n.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      const padre = ts.isJsxElement(n.parent) ? n.parent.openingElement.tagName.getText(src) : 'Fragment';
      if (!TEXTO.test(padre)) {
        const izquierda = n.expression.left;
        if (puedeSerTextoONumero(checker.getTypeAtLocation(izquierda))) {
          const { line } = src.getLineAndCharacterOfPosition(n.getStart());
          sitios.push(`${archivo}:${line + 1} <${padre}> {${izquierda.getText(src).slice(0, 60)} && …}`);
        }
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(src);
}
return sitios;
};
const sitios = buscarSitios(programa, ARCHIVOS, raiz);

check(`1) ningún «x && <JSX>» deja un texto o un número suelto dentro de una vista (${ARCHIVOS.length} archivos)`, sitios.length === 0,
  sitios.length ? (process.env.DETALLE ? '\n  ' + sitios.join('\n  ') : `${sitios.length}: ${sitios.slice(0, 4).join(' · ')}`) : '');
/*
 * Control: el detector de verdad, EJECUTADO sobre un archivo propio en un directorio temporal (antes este control
 * miraba con una regex el texto que él mismo acababa de escribir, y no podía fallar). Tres casos: el del fallo, el
 * arreglo con `!!` y el que es legítimo dentro de un <Text>.
 */
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsx-control-'));
  try {
    const archivo = 'control.tsx';
    fs.writeFileSync(path.join(dir, archivo), [
      'declare const View: any; declare const Text: any; declare const q: string; declare const n: number; declare const b: boolean;',
      'export const malo = <View>{q.trim() && <View />}</View>;',
      'export const numero = <View>{n && <View />}</View>;',
      'export const arreglado = <View>{!!q.trim() && <View />}</View>;',
      'export const booleano = <View>{b && <View />}</View>;',
      'export const enTexto = <Text>{q && <Text />}</Text>;',
    ].join('\n'));
    const prog = ts.createProgram([path.join(dir, archivo)], { jsx: ts.JsxEmit.Preserve, noEmit: true, skipLibCheck: true, strict: true, target: ts.ScriptTarget.ES2022 });
    const vistos = buscarSitios(prog, [archivo], dir).map((x) => x.replace(/^control\.tsx:/, ''));
    check('2) control EJECUTADO: el detector ve el texto y el número sueltos, y no el `!!`, el booleano ni lo de dentro de <Text>',
      vistos.length === 2 && vistos.some((x) => /^2 /.test(x)) && vistos.some((x) => /^3 /.test(x)), vistos.join(' · '));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
check('3) el buscador ya no deja la cadena vacía: la causa del aviso', !/activeCategory === 'comunidades' && searchQuery\.trim\(\) && \(/.test(leer('screens/SearchScreen.tsx')));

check('esta suite está en la cadena de `npm test`', /jsx-textos-sueltos\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
