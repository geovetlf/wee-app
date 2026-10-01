/**
 * F1-C · WEË FILMMAKER — «VARIAS ESCENAS» EN LOS ONCE DICCIONARIOS.
 *
 * El módulo `filmmaker` es el único sitio donde vive el texto de la producción: la
 * interfaz y una frase por cada código que dicen F1-A y F1-B. Aquí se demuestra
 * que está entero en todos los idiomas y que ningún texto se escapó al código.
 *
 *   A · Existe y está registrado en todos los idiomas de Weë (los once de F1-C y, desde la integración en main,
 *       japonés, turco, sueco e hindi).
 *   B · Las mismas claves, con sus huecos, y el plural de cada idioma.
 *   C · Cada código del dominio y de la persistencia tiene su frase.
 *   D · Cada clave que pide el código existe.
 *   E · Ni un texto escrito a mano, ni un idioma deducido.
 *   F · Las marcas, intactas.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const IDIOMAS = ['es', 'en', 'de', 'fr', 'it', 'pt', 'pt-PT', 'ru', 'ko', 'zh', 'zh-TW', 'ja', 'tr', 'sv', 'hi'];
const TODOS = `los ${IDIOMAS.length}`;
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));
/** Las claves y los valores de un archivo de textos, como los leen las demás suites de i18n: una por línea, comillas simples. */
const textos = (l) => {
  const s = leer(`i18n/textos/${l}/filmmaker.ts`);
  return new Map([...s.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm)].map((m) => [m[1], m[2]]));
};
const huecos = (v) => [...(v ?? '').matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');

/* ═══ A · EN LOS ONCE ══════════════════════════════════════════════════════ */
console.log(`\n── A · El módulo, en ${TODOS} diccionarios y registrado ──`);
const sinArchivo = IDIOMAS.filter((l) => !existe(`i18n/textos/${l}/filmmaker.ts`));
check(`A1) hay un \`filmmaker.ts\` en cada uno de ${TODOS} idiomas`, sinArchivo.length === 0, sinArchivo.join(', ') || TODOS);
const sinRegistro = IDIOMAS.filter((l) => {
  const s = leer(`i18n/textos/${l}/index.ts`);
  return !/^import \{ filmmaker \} from '\.\/filmmaker';$/m.test(s) || !/^ {2}filmmaker,$/m.test(s);
});
check('A2) y cada índice lo importa y lo entrega', sinRegistro.length === 0, sinRegistro.join(', ') || TODOS);
const sinTipo = IDIOMAS.filter((l) => l !== 'es' && !/export const filmmaker: (ConPlurales<)?typeof import\('\.\.\/es\/filmmaker'\)\.filmmaker>? = \{/.test(leer(`i18n/textos/${l}/filmmaker.ts`)));
check('A3) cada idioma se declara con el tipo del español: si falta una clave, no compila', sinTipo.length === 0, sinTipo.join(', ') || 'los diez');
const cargar = crearCargador();
const dicc = cargar('i18n/diccionarios.ts').DICCIONARIOS;
const enTiempoDeEjecucion = IDIOMAS.filter((l) => !dicc[l === 'pt-PT' ? 'pt-PT' : l]?.filmmaker?.sectionName);
check('A4) y al cargar los diccionarios de verdad, está en todos', enTiempoDeEjecucion.length === 0, enTiempoDeEjecucion.join(', ') || TODOS);

/* ═══ B · LAS MISMAS CLAVES ════════════════════════════════════════════════ */
console.log('\n── B · Las mismas claves, los mismos huecos y el plural de cada idioma ──');
const ES = textos('es');
const base = (k) => k.replace(/_(one|other|few|many|zero|two)$/, '');
const conPlural = [...ES.keys()].filter((k) => k.endsWith('_one')).map(base);
check('B1) el español tiene las claves de la producción', ES.size >= 250, `${ES.size} claves`);
for (const l of IDIOMAS.filter((x) => x !== 'es')) {
  const T = textos(l);
  const faltan = [...ES.keys()].filter((k) => !T.has(k));
  const sobran = [...T.keys()].filter((k) => !ES.has(k) && !(l === 'ru' && /_(few|many)$/.test(k) && conPlural.includes(base(k))));
  const vacias = [...T].filter(([, v]) => !v.trim()).map(([k]) => k);
  const otrosHuecos = [...T].filter(([k, v]) => huecos(v) !== huecos(ES.get(k) ?? ES.get(`${base(k)}_other`))).map(([k]) => k);
  check(`B2) ${l}: las ${ES.size} claves, ninguna vacía y con los mismos {{huecos}}`, !faltan.length && !sobran.length && !vacias.length && !otrosHuecos.length,
    [faltan.length && `faltan ${faltan.join(',')}`, sobran.length && `sobran ${sobran.join(',')}`, vacias.length && `vacías ${vacias.join(',')}`, otrosHuecos.length && `huecos ${otrosHuecos.join(',')}`].filter(Boolean).join(' · '));
}
const sinUno = IDIOMAS.filter((l) => conPlural.some((k) => !/\{\{contador\}\}/.test(textos(l).get(`${k}_one`) ?? '')));
check('B3) ningún `_one` escribe un número a pelo: en francés y portugués el 0 también es «one»', sinUno.length === 0, sinUno.join(', ') || `${conPlural.length} plurales`);
const sinPluralesRusos = conPlural.filter((k) => !textos('ru').has(`${k}_few`) || !textos('ru').has(`${k}_many`));
check('B4) el ruso tiene sus cuatro formas en cada plural', sinPluralesRusos.length === 0 && /ConPlurales<typeof import\('\.\.\/es\/filmmaker'\)\.filmmaker>/.test(leer('i18n/textos/ru/filmmaker.ts')),
  sinPluralesRusos.join(', ') || 'one, few, many y other');
for (const l of ['ko', 'zh', 'zh-TW', 'ja']) {
  const T = textos(l);
  const distintos = conPlural.filter((k) => T.get(`${k}_one`) !== T.get(`${k}_other`));
  check(`B5) ${l}: una sola forma de plural, así que _one y _other dicen lo mismo`, distintos.length === 0, distintos.join(', '));
}

/* ═══ C · CADA CÓDIGO, SU FRASE ════════════════════════════════════════════ */
console.log('\n── C · Cada código del dominio y de la persistencia tiene su frase ──');
const { claveDelMensaje } = cargar('utils/mensajesDeFilmmaker.ts');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const bloque = (archivo, desde) => { const s = leer(archivo); const i = s.indexOf(desde); return [...s.slice(i, s.indexOf(';', i)).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]); };
const CODIGOS = [
  ...bloque('functions/src/filmmaker/validacion.ts', 'export type ValidationCode').map((c) => `filmmaker.validation.${c}`),
  ...bloque('functions/src/filmmaker/operaciones.ts', 'export type OperationCode').map((c) => `filmmaker.operation.${c}`),
  ...bloque('functions/src/filmmaker/recomendaciones.ts', 'export type RecommendationCode').map((c) => `filmmaker.recommendation.${c}`),
  'filmmaker.requirement.capability_not_in_catalog',
  ...Object.keys(lib('productions/puerta.js').CODIGO_DE_CALLABLE).map((c) => `filmmaker.persistence.${c}`),
  ...['operation_unknown', 'session_required', 'account_not_found'].map((c) => `filmmaker.persistence.${c}`),
  ...['network', 'unavailable', 'unknown', 'response_invalid'].map((c) => `filmmaker.persistence.${c}`),
];
check('C1) los códigos son los de F1-A y F1-B, contados de su fuente: 22 de validación, 6 de operaciones, 9 recomendaciones, 1 requisito y 22 de persistencia, más la puerta y el cliente',
  CODIGOS.length === 22 + 6 + 9 + 1 + 22 + 3 + 4, `${CODIGOS.length}`);
const sinClave = CODIGOS.filter((c) => !claveDelMensaje(c));
check('C2) cada `messageKey` se lee como una clave plana de `filmmaker`', sinClave.length === 0, sinClave.join(', '));
const sinFrase = IDIOMAS.flatMap((l) => CODIGOS.filter((c) => !textos(l).has(String(claveDelMensaje(c)).replace('filmmaker.', ''))).map((c) => `${l}:${c}`));
check(`C3) y cada una tiene su frase en ${TODOS} idiomas`, sinFrase.length === 0, sinFrase.slice(0, 8).join(', '));
check('C4) la clave plana nunca acaba como un plural inventado (`…_many`)', CODIGOS.every((c) => !/_(one|other|few|many|zero|two)$/.test(String(claveDelMensaje(c)))));
check('C5) lo que no es de Filmmaker no se lee como si lo fuera', claveDelMensaje('moderation.errorOffline') === null && claveDelMensaje('filmmaker.persistence.Nada') === null);

/* ═══ D · CADA CLAVE QUE PIDE EL CÓDIGO EXISTE ═════════════════════════════ */
console.log('\n── D · Cada clave que pide el código existe ──');
const CODIGO = [
  ...fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => `components/studio/produccion/${f}`),
  'screens/ProductionScreen.tsx', 'components/creator/CampoQueCrece.tsx', 'constants/filmmaker.ts',
  'utils/mensajesDeFilmmaker.ts', 'utils/presentacionDeProduccion.ts', 'utils/borradorDeProduccion.ts',
];
const pedidas = [...new Set(CODIGO.flatMap((f) => [...leer(f).matchAll(/'filmmaker\.([A-Za-z][A-Za-z0-9_]*)'/g)].map((m) => m[1])))];
const sinTexto = pedidas.filter((k) => !ES.has(k) && !ES.has(`${k}_one`));
check(`D1) las ${pedidas.length} claves que el código pide literalmente están en el diccionario`, sinTexto.length === 0, sinTexto.join(', '));
const comunes = [...new Set(CODIGO.flatMap((f) => [...leer(f).matchAll(/t\('((common|studio)\.[A-Za-z0-9_]+)'/g)].map((m) => m[1])))];
const textosDe = (mod) => new Map([...leer(`i18n/textos/es/${mod}.ts`).matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm)].map((m) => [m[1], m[2]]));
const sinComun = comunes.filter((c) => { const [m, k] = c.split('.'); return !textosDe(m).has(k); });
check('D2) y las que reutiliza de `common` existen', sinComun.length === 0, comunes.join(', '));
const usadas = new Set([...pedidas, ...CODIGOS.map((c) => String(claveDelMensaje(c)).replace('filmmaker.', ''))]);
const sinUso = [...ES.keys()].map(base).filter((k, i, xs) => xs.indexOf(k) === i && !usadas.has(k));
check('D3) y no sobra ninguna: cada clave del módulo la usa alguien', sinUso.length === 0, sinUso.join(', '));

/* ═══ E · NI UN TEXTO A MANO ═══════════════════════════════════════════════ */
console.log('\n── E · Ni un texto escrito a mano, ni un idioma deducido ──');
const TSX = CODIGO.filter((f) => f.endsWith('.tsx'));
const limpio = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const MARCA = /^(Weë|Weë Studio|Director|OK)$/;
const textoSuelto = TSX.flatMap((f) => [...limpio(leer(f)).matchAll(/>\s*([A-Za-zÀ-ÿ¿¡][^<>{}();=]{0,80})\s*</g)].map((m) => m[1].trim()).filter((x) => x && !MARCA.test(x)).map((x) => `${f}: ${x}`));
check('E1) ningún texto entre etiquetas: todo pasa por `t()`', textoSuelto.length === 0, textoSuelto.slice(0, 5).join(' | '));
const atributos = TSX.flatMap((f) => [...leer(f).matchAll(/(placeholder|accessibilityLabel|accessibilityHint|title|etiqueta|texto|titulo)=(?:"([^"]*)"|\{'([^']*)'\}|\{`([^`]*)`\})/g)]
  .filter((m) => !/^Weë Studio$/.test(m[2] ?? m[3] ?? m[4] ?? '')).map((m) => `${f}: ${m[0]}`));
check('E2) ni en una etiqueta de accesibilidad, un marcador o un título', atributos.length === 0, atributos.slice(0, 5).join(' | '));
const idiomaDeducido = CODIGO.filter((f) => /(idioma|locale|lang)\s*===?\s*'(es|en|pt)/.test(sinComentarios(leer(f))) || /toLocaleString\(\s*['"]/.test(leer(f)));
check('E3) ni un «if locale === es» ni un `toLocaleString(\'es\')`: los formatos salen de `i18n/formato.ts`', idiomaDeducido.length === 0, idiomaDeducido.join(', '));
const paralelo = CODIGO.filter((f) => /i18next|react-intl|formatjs|lingui|const (TEXTOS|TRADUCCIONES|STRINGS|LABELS|DICCIONARIO) = \{/.test(leer(f)));
check('E4) ni otra librería ni otro diccionario', paralelo.length === 0, paralelo.join(', '));
const constantes = leer('constants/filmmaker.ts');
check('E5) el catálogo guarda claves, no frases', !/clave: '(?!filmmaker\.)/.test(constantes) && !/[áéíóúñ¿¡]'/.test(sinComentarios(constantes).replace(/'[^']*'/g, (s) => (s.startsWith("'filmmaker.") ? "''" : s))));
const dominio = ['services/filmmakerService.ts', 'utils/produccionOptimista.ts', 'utils/controladorDeProduccion.ts', 'utils/mensajesDeFilmmaker.ts'];
const conFrases = dominio.filter((f) => /['`][^'`\n]*\b(No se pudo|Guardando|Guardado|Sin conexión|Escena \d)\b/.test(sinComentarios(leer(f))));
check('E6) el servicio, el estado y los mensajes no llevan frases: códigos y claves', conFrases.length === 0, conFrases.join(', '));

/* ═══ F · LAS MARCAS ═══════════════════════════════════════════════════════ */
console.log('\n── F · Las marcas, intactas ──');
const conStudio = [...ES].filter(([, v]) => v.includes('Weë Studio')).map(([k]) => k);
const sinStudio = IDIOMAS.flatMap((l) => conStudio.filter((k) => !textos(l).get(k)?.includes('Weë Studio')).map((k) => `${l}:${k}`));
check('F1) «Weë Studio» sigue siendo «Weë Studio» en todos los idiomas', sinStudio.length === 0, sinStudio.join(', ') || `${conStudio.length} claves`);
const prohibidas = IDIOMAS.flatMap((l) => [...textos(l)].filter(([, v]) => /\bReels?\b|\bWee\b(?! ?Talk)|(?<![\p{L}])[Cc]r[ée]ditos?(?![\p{L}])|Кредит|크레딧/u.test(v)).map(([k]) => `${l}:${k}`));
check('F2) ni «Reels», ni «Wee» sin diéresis, ni los Credits traducidos', prohibidas.length === 0, prohibidas.join(', '));
const nombre = IDIOMAS.filter((l) => textos(l).get('sectionName') !== new Map([...leer(`i18n/textos/${l}/studio.ts`).matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm)].map((m) => [m[1], m[2]])).get('xpMultiScene'));
check('F3) «Varias escenas» se llama igual que la experiencia del Studio en cada idioma', nombre.length === 0, nombre.join(', ') || TODOS);
check('F4) esta suite está en la cadena de `npm test`', /filmmaker-i18n\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Filmmaker F1-C: «Varias escenas» en ${TODOS} diccionarios (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
