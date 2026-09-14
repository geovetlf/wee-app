/*
 * LO QUE DICE UNA ENCUESTA MIENTRAS SE MIRA (fase 5B).
 *
 * Una encuesta tiene dos clases de texto, y solo una es interfaz:
 *
 *   · LO QUE ESCRIBIÓ UNA PERSONA —la pregunta y sus opciones— se pinta tal
 *     cual, en el idioma en que se escribió. "¿Cuál prefieres?" sigue diciendo
 *     "¿Cuál prefieres?" con la aplicación en inglés. Traducirlo sería cambiar
 *     lo que alguien preguntó;
 *
 *   · LO QUE DICE WEË —"Sin votos todavía", "1 voto", "2 días restantes",
 *     "Encuesta finalizada"— es interfaz, y estaba escrito a mano en español
 *     dentro de `utils/pollView.ts`, con una "s" pegada cuando el número era
 *     mayor que uno. Esa es la regla del español y de nadie más.
 *
 * Aquí se EJECUTA el ayudante de verdad, compilado del archivo y leído CRUDO
 * —no "como se lee", que sustituiría las claves por su frase española y el
 * traductor no llegaría a llamarse—, con el traductor de verdad de Weë y sus
 * diccionarios. Lo que se comprueba es la salida, no una promesa.
 *
 * Esta fase NO toca cómo se vota, ni quién puede votar, ni las cuentas.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const require = createRequire(import.meta.url);
const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ts = require('typescript');

/* El ayudante, compilado del fuente crudo y ejecutado. */
const VISTA_RUTA = 'utils/pollView.ts';
const FUENTE = leer(VISTA_RUTA);
const jsVista = ts.transpileModule(FUENTE, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const VISTA = await import('data:text/javascript;base64,' + Buffer.from(jsVista).toString('base64'));

const ES = await traductorDe('es');
const EN = await traductorDe('en');
const esT = textosDe('es');
const enT = textosDe('en');
const CODIGO = soloCodigo(FUENTE);
const COMPONENTE = soloCodigo(leer('components/Poll.tsx'));

const CLAVES = ['pollNoVotesYet', 'pollVotes_one', 'pollVotes_other', 'pollVoted', 'pollClosed',
  'pollDaysLeft_one', 'pollDaysLeft_other', 'pollHoursLeft_one', 'pollHoursLeft_other',
  'pollLessThanAnHour', 'pollLegacy'];

const HORA = 60 * 60 * 1000, DIA = 24 * HORA;
const AHORA = Date.parse('2026-09-14T12:00:00Z');
/* Una encuesta cualquiera. Lo que escribió la persona va en español a propósito. */
const encuesta = (extra = {}) => ({
  question: '¿Cuál prefieres?',
  options: [{ id: 'a', text: 'Flores' }, { id: 'b', text: 'Comida' }],
  counts: { a: 1, b: 1 },
  totalVotes: 2,
  endsAt: AHORA + 2 * DIA,
  ...extra,
});

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El ayudante ya no escribe español ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const FRASES = ['Sin votos todavía', 'Encuesta finalizada', 'Menos de 1 hora', 'restante'];
  const quedan = FRASES.filter((f) => CODIGO.includes(f));
  check('1) pollView no lleva ninguna frase escrita a mano', quedan.length === 0, quedan.join(' | '));

  /* Ni la "s" del plural pegada a mano, que solo sabe español. */
  check('2) ni pega la "s" del plural por su cuenta',
    !/\?\s*'s'\s*:\s*''/.test(CODIGO) && !/voto\$\{/.test(CODIGO));
  check('2) ni decide el plural con un === 1', !/total === 1/.test(CODIGO) && !/dias > 1|horas > 1/.test(CODIGO));

  /* Ni un idioma clavado, ni un formateador propio. */
  check('3) no se fuerza el español en ninguna parte',
    !/'es-ES'|'es'|toLocaleDateString|toLocaleString/.test(CODIGO));

  /* Sigue siendo puro: recibe el traductor, no importa React. */
  check('4) sigue siendo un ayudante puro, sin React',
    !/useT|useIdioma|from 'react'|useState|useEffect/.test(CODIGO));
  check('4) y recibe el traductor por parámetro',
    /type Traducir = \(clave: string, valores\?: Record<string, string \| number>\) => string;/.test(CODIGO)
    && /textoVotos = \(total: number, t: Traducir\)/.test(CODIGO)
    && /tiempoRestante = \(poll: PostPoll \| null \| undefined, ahoraMs: number, t: Traducir\)/.test(CODIGO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las claves, en los dos idiomas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const faltanEs = CLAVES.filter((k) => !esT.wall?.[k]);
  check('5) las 11 claves nuevas existen en español', faltanEs.length === 0, faltanEs.join(' '));
  const faltanEn = CLAVES.filter((k) => !enT.wall?.[k]);
  check('6) y en inglés', faltanEn.length === 0, faltanEn.join(' '));

  const vacias = CLAVES.filter((k) => !String(enT.wall?.[k] ?? '').trim() || !String(esT.wall?.[k] ?? '').trim());
  check('7) ninguna está vacía', vacias.length === 0, vacias.join(' '));

  /* Y están traducidas de verdad, no copiadas. */
  const copiadas = CLAVES.filter((k) => esT.wall[k] === enT.wall[k]);
  check('8) ninguna se quedó en español en el diccionario inglés', copiadas.length === 0, copiadas.join(' '));

  /* El hueco del número es el mismo en los dos: si no, uno de los dos pierde la cifra. */
  const sinHueco = CLAVES.filter((k) => /\{\{contador\}\}/.test(esT.wall[k]) !== /\{\{contador\}\}/.test(enT.wall[k]));
  check('9) el hueco {{contador}} está en los dos o en ninguno', sinHueco.length === 0, sinHueco.join(' '));

  /* Las marcas no se traducen ni dentro de una frase. */
  check('10) "Weë" sobrevive en la nota inglesa de las encuestas antiguas',
    /Weë/.test(enT.wall.pollLegacy), enT.wall.pollLegacy);

  /* Y el inglés está en inglés. */
  const conAcento = CLAVES.filter((k) => /[áéíóúñ¿¡]/i.test(String(enT.wall[k]).replace(/Weë/g, '')));
  check('11) ninguna frase inglesa lleva tildes ni signos de apertura', conAcento.length === 0, conAcento.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Los votos, contados como los cuenta cada idioma ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { textoVotos } = VISTA;

  /*
   * EL CERO ES UN ESTADO, NO UN NÚMERO. Esa decisión de producto se conserva:
   * una encuesta sin votos dice que espera, no "0 votos".
   */
  check('12) sin votos se dice que no los hay, no un 0',
    textoVotos(0, ES) === 'Sin votos todavía' && textoVotos(0, EN) === 'No votes yet',
    textoVotos(0, ES) + ' / ' + textoVotos(0, EN));
  check('12) y un total negativo se trata igual, no rompe',
    textoVotos(-3, ES) === 'Sin votos todavía' && textoVotos(-3, EN) === 'No votes yet');

  check('13) un voto es singular en los dos',
    textoVotos(1, ES) === '1 voto' && textoVotos(1, EN) === '1 vote',
    textoVotos(1, ES) + ' / ' + textoVotos(1, EN));

  check('14) dos y más, plural en los dos',
    textoVotos(2, ES) === '2 votos' && textoVotos(2, EN) === '2 votes'
    && textoVotos(21, ES) === '21 votos' && textoVotos(21, EN) === '21 votes',
    textoVotos(21, ES) + ' / ' + textoVotos(21, EN));

  /* Ninguna cifra se queda sin su hueco relleno ni enseña la clave. */
  const rotos = [0, 1, 2, 3, 11, 21, 100, 1000]
    .flatMap((n) => [textoVotos(n, ES), textoVotos(n, EN)])
    .filter((s) => /\{\{|wall\./.test(s) || !s.trim());
  check('15) de 0 a 1000 no se escapa ninguna clave ni ningún hueco', rotos.length === 0, rotos.join(' | '));

  /*
   * QUIEN ELIGE LA FORMA ES `Intl.PluralRules`, NO UN `if`. El día que llegue un
   * idioma con tres formas —o seis— esto seguirá funcionando sin tocar una línea.
   */
  const motor = leer('i18n/traducir.ts');
  check('16) el plural lo decide Intl.PluralRules',
    /new Intl\.PluralRules\(locale\)\.select\(cantidad\)/.test(motor)
    && /_\$\{categoriaDePlural\(locale, cantidad\)\}/.test(motor));
  check('16) y el ayudante solo pasa el contador',
    /t\('wall\.pollVotes', \{ contador: total \}\)/.test(CODIGO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Cuánto queda, y cuándo se acabó ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { tiempoRestante } = VISTA;
  const queda = (ms, t) => tiempoRestante(encuesta({ endsAt: AHORA + ms }), AHORA, t);

  check('17) cerrada se dice con palabras, en los dos',
    tiempoRestante(encuesta({ endsAt: AHORA - HORA }), AHORA, ES) === 'Encuesta finalizada'
    && tiempoRestante(encuesta({ endsAt: AHORA - HORA }), AHORA, EN) === 'Poll ended');

  check('18) los días, en singular y en plural',
    queda(DIA + HORA, ES) === '1 día restante' && queda(3 * DIA, ES) === '3 días restantes'
    && queda(DIA + HORA, EN) === '1 day left' && queda(3 * DIA, EN) === '3 days left',
    queda(DIA + HORA, ES) + ' / ' + queda(3 * DIA, EN));

  check('19) las horas, igual',
    queda(HORA + 60000, ES) === '1 hora restante' && queda(5 * HORA, ES) === '5 horas restantes'
    && queda(HORA + 60000, EN) === '1 hour left' && queda(5 * HORA, EN) === '5 hours left',
    queda(5 * HORA, ES) + ' / ' + queda(5 * HORA, EN));

  check('20) y por debajo de una hora se dice eso, no "0 horas"',
    queda(20 * 60000, ES) === 'Menos de 1 hora' && queda(20 * 60000, EN) === 'Less than 1 hour');

  /* LOS TRAMOS NO CAMBIARON: días mientras queden días, después horas. */
  check('21) control: los tramos son los de siempre',
    /if \(dias > 0\) return t\('wall\.pollDaysLeft'/.test(CODIGO)
    && /if \(horas > 0\) return t\('wall\.pollHoursLeft'/.test(CODIGO)
    && queda(2 * DIA + 5 * HORA, ES) === '2 días restantes');

  /* Una fecha que no se entiende sigue cerrando la encuesta, nunca abriéndola. */
  check('22) control: una fecha ilegible sigue cerrando',
    tiempoRestante(encuesta({ endsAt: 'mañana' }), AHORA, ES) === 'Encuesta finalizada'
    && VISTA.estaCerrada(encuesta({ endsAt: 'mañana' }), AHORA) === true);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo que escribió una persona no se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const r = VISTA.resultadosDe(encuesta());
  check('23) la pregunta y las opciones salen tal cual',
    r.filas.map((f) => f.text).join('|') === 'Flores|Comida');
  check('23) y el ayudante no toca la pregunta',
    !/t\(poll\.question\)|t\(opt\.text\)|t\(fila\.text\)/.test(CODIGO));
  check('24) el componente tampoco: la pregunta y el texto se pintan crudos',
    /\{poll\.question\}/.test(COMPONENTE) && /\{fila\.text\}/.test(COMPONENTE)
    && !/t\(poll\.question\)|t\(fila\.text\)/.test(COMPONENTE));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Ni los datos, ni el voto, ni los Credits ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Los ids de opción viajan al servidor: se copian, no se traducen. */
  const r = VISTA.resultadosDe(encuesta());
  check('25) los ids de las opciones se copian tal cual', r.filas.map((f) => f.id).join('|') === 'a|b');
  check('25) y el total sigue saliendo de totalVotes, no de sumar', r.total === 2);
  check('26) los porcentajes siguen sumando 100', r.filas.reduce((a, f) => a + f.porcentaje, 0) === 100);

  /* Una encuesta antigua se sigue detectando igual: si no, se podría votar en ella. */
  check('27) el formato antiguo se sigue detectando igual',
    VISTA.esHistorica({ options: [{ text: 'A', votes: 2 }] }) === true
    && VISTA.esHistorica(encuesta()) === false);

  /* Nada de esta fase escribe: aquí solo se lee lo que ya hay. */
  check('28) el ayudante no escribe nada',
    !/votePoll|voteInPollById|updateDoc|setDoc|addDoc|runTransaction|writeBatch/.test(CODIGO)
    /* `counts` se LEE para pintar; nunca se le asigna. */
    && !/counts\[[^\]]*\]\s*=[^=]/.test(CODIGO) && !/poll\.counts\s*=[^=]/.test(CODIGO));
  check('29) el voto lo sigue confirmando el servidor',
    /const confirmado = await postsService\.voteInPollById\(postId!, optionId\);/.test(COMPONENTE)
    && /setConteos\(confirmado\.counts \|\| \{\}\);/.test(COMPONENTE));
  check('30) y quién puede tocar no cambió',
    /const permiteCambio = poll\.allowChange !== false;/.test(COMPONENTE)
    && /const pulsable = /.test(COMPONENTE));

  /* Una encuesta no gasta Credits ni llama a ninguna IA. */
  check('31) sigue sin Credits y sin IA',
    !/spendCredits|creditsService|creditEngine|gemini|aiEngine/i.test(CODIGO + COMPONENTE));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · El idioma llega desde donde se pinta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* El traductor sale del contexto de siempre, en cada render: cambia sin reiniciar. */
  check('32) la encuesta pide el traductor al contexto',
    /import \{ useT \} from '\.\.\/contexts\/IdiomaContext';/.test(COMPONENTE)
    && (COMPONENTE.match(/const t = useT\(\);/g) || []).length === 2);
  check('32) y se lo pasa al ayudante en los tres sitios',
    /textoVotos\(fila\.votos, t\)/.test(COMPONENTE)
    && /textoVotos\(total, t\)/.test(COMPONENTE)
    && /tiempoRestante\(poll, Date\.now\(\), t\)/.test(COMPONENTE));
  check('33) ninguna frase se congela en el estado',
    !/useState\([^)]*\bt\('/.test(COMPONENTE) && !/useMemo\(\(\) => t\(/.test(COMPONENTE));

  /* Y el pie de la encuesta ya no lleva ninguna frase escrita a mano. */
  check('34) el pie se arma con claves, no con frases',
    /votada \? t\('wall\.pollVoted'\) : null/.test(COMPONENTE)
    && /cerrada \? t\('wall\.pollClosed'\)/.test(COMPONENTE)
    && /\{t\('wall\.pollLegacy'\)\}/.test(COMPONENTE));

  /* CONTROL: esta fase no tocó nada de lo que no le toca. */
  check('35) control: ni Composer, ni cabecera, ni el tiempo relativo',
    !/CreateScreen|ComposerEntry|CreateSheet|pollDraft|getRelativeTime/.test(CODIGO + COMPONENTE));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
