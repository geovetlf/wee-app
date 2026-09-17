/*
 * LA VARIANTE OFICIAL DE CADA IDIOMA, Y QUE NADIE LA CAMBIE SIN QUERER.
 *
 * Un idioma no siempre es una sola norma. El portugués tiene dos bien distintas
 * y Weë tiene UN diccionario `pt`, así que hubo que elegir. La decisión del
 * usuario (2026-09-16) es firme y no provisional:
 *
 *   PORTUGUÉS = PORTUGUÉS BRASILEÑO (pt-BR).
 *
 * El motivo es de producto, no de lingüística: Brasil es el mercado
 * internacional más cercano de Weë, y la experiencia en portugués tiene que
 * estar optimizada para quien vive allí.
 *
 * ── Por qué esto es una prueba y no solo un comentario ───────────────────────
 *
 * Porque el riesgo no es que alguien decida cambiarlo: es que alguien lo cambie
 * SIN DARSE CUENTA. Quedan cinco idiomas por traducir y cada uno lo escribirá
 * alguien distinto; a quien venga a retocar una cadena de `pt` le puede salir
 * «ficheiro» en vez de «arquivo» sin pensarlo, y eso no lo ve nadie leyendo un
 * diff. Un comentario hay que leerlo; esto se ejecuta solo.
 *
 * ── Qué NO es esto ──────────────────────────────────────────────────────────
 *
 * No es un corrector de portugués ni una lista de palabras prohibidas. Solo
 * mira las diferencias donde Brasil y Portugal se separan DE VERDAD y donde la
 * forma europea sería un error de producto, no de estilo. Si mañana Weë quiere
 * ofrecer portugués europeo, será un diccionario `pt-PT` aparte: eso no
 * convierte este `pt` en europeo, y esta prueba seguirá vigilando el brasileño.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const TEXTOS = path.resolve(RAIZ, 'i18n/textos');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Los valores del diccionario, clave a clave. Los comentarios no cuentan. */
const RE = new RegExp("^  ([A-Za-z][A-Za-z0-9_]*):\\s*'((?:[^'\\\\]|\\\\.)*)',$", 'gm');
const valores = (idioma) => {
  const dir = path.join(TEXTOS, idioma);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && x !== 'index.ts')) {
    for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(RE)) {
      out.push([`${f.replace('.ts', '')}.${m[1]}`, m[2]]);
    }
  }
  return out;
};

/*
 * UNA PALABRA ENTERA, CON ACENTOS.
 *
 * `\b` de toda la vida es ASCII: para él la `ê` de «você» no es letra, así que
 * `\bvocê\b` NO CASA NUNCA y `\bóptimo\b` tampoco. Con acentos por todas partes
 * eso no es un detalle, es una prueba que dice «limpio» sin haber mirado. Aquí
 * la frontera se hace con `\p{L}`, que sí sabe de letras de verdad.
 */
const P = (cuerpo, banderas = 'iu') =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

/*
 * LAS DIFERENCIAS QUE IMPORTAN.
 *
 * Cada línea es una palabra que en Portugal es normal y en Brasil suena ajena o
 * significa otra cosa. No están las que se escriben igual a los dos lados, ni
 * las que son cuestión de gusto: solo las que delatan que alguien escribió en
 * la norma equivocada. La forma brasileña va al lado para que el fallo diga qué
 * poner, no solo qué quitar.
 */
const EUROPEO = [
  [P('palavra-passe'), 'senha'],
  [P('utilizador(?:es|a|as)?'), 'usuário'],
  [P('ficheiros?'), 'arquivo'],
  [P('ecrãs?'), 'tela'],
  [P('telemó(?:vel|veis)'), 'celular'],
  [P('moradas?'), 'endereço'],
  [P('partilhar'), 'compartilhar'],
  [P('carrinhas?'), 'van'],
  [P('autocarros?'), 'ônibus'],
  [P('comboios?'), 'trem'],
  [P('casa de banho'), 'banheiro'],
  [P('pequeno-almoço'), 'café da manhã'],
  [P('sumos?'), 'suco'],
  [P('raparigas?'), 'menina'],
  /*
   * «Registar» es la forma portuguesa y «registrar» la brasileña: la diferencia
   * es esa `r`. Como la frontera exige palabra entera, esto caza
   * «registe/regista/registo» sin tocar «registre/registra/registro».
   */
  [P('regist(?:o|os|ar|a|am|e|em|ei|ou|ado|ados|ada|adas)'), 'cadastrar / registrar'],
  /*
   * Grafías anteriores al Acuerdo Ortográfico que en Brasil no se escriben.
   * `contacto` es la trampa fácil, porque el español la escribe igual.
   */
  [P('contactos?'), 'contato'],
  [P('factos?'), 'fato'],
  [P('ópti(?:mo|ma|mos|mas)'), 'ótimo'],
  [P('ac(?:ção|ções)'), 'ação'],
  [P('(?:direc|colec|selec|correc|infec)(?:ção|ções)'), 'sin la c: direção, coleção…'],
  [P('act(?:ual|uais|ualmente|ivo|iva|ivos|ivas)'), 'sin la c: atual, ativo…'],
  [P('excep(?:to|ção)'), 'exceto, exceção'],
];

console.log('\n── A · El portugués de Weë es el de Brasil ──');
{
  const pt = valores('pt');
  check('1) el diccionario pt existe y está completo', pt.length > 2000, `${pt.length} claves`);

  const europeos = [];
  for (const [clave, v] of pt) {
    for (const [re, brasileno] of EUROPEO) {
      if (re.test(v)) europeos.push(`${clave}: «${v.slice(0, 40)}» → en Brasil, "${brasileno}"`);
    }
  }
  check('2) ninguna palabra es de la norma europea', europeos.length === 0,
    europeos.length ? europeos.slice(0, 6).join(' | ') : 'limpio');

  /*
   * Y al revés: que el brasileño esté de verdad ahí. Una prueba que solo
   * prohíbe no distingue «escrito en brasileño» de «escrito en cualquier cosa».
   */
  const todo = pt.map(([, v]) => v).join('\n');
  const tuteos = (todo.match(P('você', 'giu')) || []).length;
  check('3) se tutea con «você», que es el trato brasileño', tuteos >= 50, `${tuteos} veces`);
  check('4) el alta dice «Cadastre-se», no «Registe-se»',
    P('cadastre-se').test(todo) && !P('registe-se').test(todo));
  check('5) y la bienvenida dice «Boas-vindas»', P('boas-vindas').test(todo));
}

console.log('\n── CONTROL · Que esta prueba sepa fallar ──');
/*
 * Un guardia que nunca ha parado a nadie no demuestra que no pase nadie: puede
 * que esté dormido. Se le enseñan las formas europeas de verdad y tiene que
 * reconocerlas TODAS; y después las brasileñas, que no puede molestar.
 */
const TRAMPAS = [
  'Escreva a sua palavra-passe', 'Apagar o ficheiro', 'Toque no ecrã',
  'Abrir no telemóvel', 'O utilizador não existe', 'Registe-se aqui',
  'Partilhar no Wäll', 'Guardar o contacto', 'Está óptimo', 'Uma acção rápida',
];
const europea = (t) => EUROPEO.some(([re]) => re.test(t));
const escapadas = TRAMPAS.filter((t) => !europea(t));
check('6) control: reconoce las diez formas europeas', escapadas.length === 0,
  escapadas.join(' | ') || 'las diez');

const BRASILENAS = [
  'Escreva a sua senha', 'Apagar o arquivo', 'Toque na tela', 'Abrir no celular',
  'O usuário não existe', 'Cadastre-se aqui', 'Compartilhar no Wäll',
  'Salvar o contato', 'Está ótimo', 'Uma ação rápida', 'Boas-vindas ao Weë',
  'Registrar a sua conta', 'O registro da conta', 'Você registra o produto',
];
const falsosPositivos = BRASILENAS.filter((t) => europea(t));
check('7) control: y no molesta con el brasileño bien escrito', falsosPositivos.length === 0,
  falsosPositivos.join(' | ') || 'ninguna');

console.log('\n── B · La regla queda escrita donde se lee ──');
/*
 * En los cuatro sitios por los que pasa quien toca idiomas: el catálogo, la
 * puerta de los diccionarios, la cabecera del propio portugués y las
 * instrucciones del proyecto. Si desaparece de alguno, esto avisa.
 */
const SITIOS = [
  ['el catálogo de idiomas', 'i18n/idiomas.ts'],
  ['la puerta de los diccionarios', 'i18n/diccionarios.ts'],
  ['la cabecera del portugués', 'i18n/textos/pt/index.ts'],
  ['las instrucciones del proyecto', 'CLAUDE.md'],
];
for (const [donde, archivo] of SITIOS) {
  check(`8) ${donde} dice que el portugués es el de Brasil`,
    /brasile/i.test(leer(archivo)) && /pt-BR/.test(leer(archivo)), archivo);
}
/*
 * ESE DÍA LLEGÓ, Y FUE A PROPÓSITO (2026-09-17).
 *
 * Cuando se escribió esto, `pt-PT` no existía y la comprobación decía que no
 * debía existir: cualquier aparición habría sido un descuido. Ahora el europeo
 * es una VARIANTE declarada del mismo idioma, con su diccionario completo y sus
 * alias, así que lo que hay que vigilar cambia de signo.
 *
 * Lo que ya no puede pasar es lo contrario: que el europeo aparezca a medias
 * —unas claves sí y otras cayendo al brasileño— o que alguien lo confunda con
 * un idioma aparte. Las dos cosas las comprueba `i18n-portugues.test.mjs`;
 * aquí basta con asegurar que sigue siendo UN idioma con dos normas.
 */
check('9) el europeo existe como VARIANTE, no como idioma aparte',
  fs.existsSync(path.join(TEXTOS, 'pt-PT'))
  && !/codigo: 'pt-PT'/.test(leer('i18n/idiomas.ts'))
  && /locale: 'pt-PT'/.test(leer('i18n/idiomas.ts')),
  'pt-PT es variante de `pt`, no una fila más del catálogo');

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
