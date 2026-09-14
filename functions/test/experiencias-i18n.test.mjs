/*
 * LAS EXPERIENCIAS DE WEË, ENTERAS, EN DOS IDIOMAS (fase 2 · bloque 3C).
 *
 * El bloque 3B dejó el catálogo —lo que dice cada experiencia de sí misma— en
 * español e inglés. Lo que se cierra aquí es lo de alrededor: los rótulos de la
 * pantalla del especialista, Weë Brain, "Mis documentos", Weë Travel, la
 * cabecera de las áreas y Weë Business entero, que eran las últimas cosas que
 * se leían en español teniendo la app en inglés.
 *
 * Se ejecuta lo que se pueda ejecutar —los diccionarios y las constantes se
 * compilan y se importan de verdad— y lo que no —una pantalla de React
 * Native— se lee como código sin comentarios, para que una explicación escrita
 * al lado no pueda aprobar una prueba por su cuenta.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const cargar = (ruta, arreglo = (x) => x) => {
  const js = ts.transpileModule(arreglo(leer(ruta)), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'));
};

const ES = {}, EN = {};
for (const modulo of ['weeai', 'writer', 'creator', 'business', 'common']) {
  ES[modulo] = (await cargar('i18n/textos/es/' + modulo + '.ts'))[modulo];
  EN[modulo] = (await cargar('i18n/textos/en/' + modulo + '.ts', (s) =>
    s.replace(/: typeof import\([^)]*\)\.[A-Za-z]+/, '')))[modulo];
}
const EXP = await cargar('constants/weeExperiences.ts');
const MOCK = await cargar('constants/businessMock.ts', (s) =>
  s.replace("import { formatearFecha } from '../i18n/formato';",
    "const formatearFecha = (d, l, o) => new Intl.DateTimeFormat(l, o).format(d);"));

/* Las pantallas y las piezas que se revisaron en este bloque. */
const ALCANCE = [
  'screens/SpecialistScreen.tsx',
  'screens/BrainChatScreen.tsx',
  'screens/BusinessScreen.tsx',
  'components/creator/WriterDocuments.tsx',
  'components/creator/TravelLauncher.tsx',
  'components/creator/ui.tsx',
  'constants/weeExperiences.ts',
  'constants/businessMock.ts',
  'hooks/useBrainChat.ts',
  'services/creatorService.ts',
  'services/documentsService.ts',
];
const CODIGO = Object.fromEntries(ALCANCE.map((p) => [p, soloCodigo(leer(p))]));
const TODO = Object.values(CODIGO).join('\n');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ni una frase suelta en el alcance ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Se busca por dos vías: una frase con tilde o con signo de apertura, que solo
   * puede ser español; y las palabras concretas que este bloque vino a quitar.
   */
  const MARCAS = /Weë|Wäll|WeeTalk|ËContact|Credits|WEË AI|Weël/;
  const sospechosas = [];
  for (const [ruta, codigo] of Object.entries(CODIGO)) {
    codigo.split('\n').forEach((l, i) => {
      /* Un `console.warn` no lo lee nadie: es para quien programa. */
      if (/console\.(warn|error|log)/.test(l)) return;
      /* Ni las palabras con las que se BUSCA: se comparan, no se leen (prueba 23). */
      if (/^\s*keywords: \[/.test(l)) return;
      /* Ni `description`, que es documentación de la tabla y no se pinta (prueba 3b). */
      if (/^\s*description: '/.test(l)) return;
      /*
       * Ni lo que representa al NEGOCIO de la persona dentro de los datos
       * simulados de Weë Business: sus arrobas, los títulos de sus
       * publicaciones y los mensajes que le escriben sus clientes. Eso es
       * contenido —hoy simulado, mañana del servidor— y no se traduce nunca.
       * La prueba 22 comprueba, por el otro lado, que no está en el diccionario.
       */
      if (ruta.endsWith('businessMock.ts') && /\b(text|name|handle|title):\s*'/.test(l)) return;
      /*
       * Ni el título por defecto de un documento sin nombre: no es un rótulo,
       * es el VALOR que se guarda, y a partir de ahí es el nombre que tiene ese
       * documento. Traducirlo haría que el mismo documento se llamara distinto
       * según el idioma que hubiera puesto el día que se creó (prueba 22b).
       */
      if (ruta.endsWith('documentsService.ts') && /const titleOf/.test(l)) return;
      for (const m of l.matchAll(/(['"])([^'"\n]*[áéíóúñ¿¡][^'"\n]*)\1/g)) {
        if (MARCAS.test(m[2]) && !/[áéíóú¿¡]/.test(m[2].replace(MARCAS, ''))) continue;
        sospechosas.push(ruta.split('/').pop() + ':' + (i + 1) + ' ' + m[2].slice(0, 40));
      }
    });
  }
  check('1) no queda ni una frase en español escrita a mano en las ' + ALCANCE.length + ' piezas',
    sospechosas.length === 0, sospechosas.slice(0, 4).join(' | '));

  const FUGAS = ['Ver más', 'Mis creaciones', 'Ver todas', 'Seguir aquí', 'Adjuntar', 'Hablar',
    'Buscar en internet', 'Nueva conversación', 'Mis documentos', 'Nuevo documento',
    'Hogar & Diseño', 'Mis redes sociales', 'Mensajes de clientes', 'Resultados esta semana',
    'Calendario de publicaciones', 'Conectado', 'Respondido'];
  const vivas = FUGAS.filter((f) => new RegExp("['\"]" + f).test(TODO));
  check('2) y ninguna de las ' + FUGAS.length + ' fugas detectadas sigue viva', vivas.length === 0, vivas.join(' · '));

  /* CONTROL: el detector encuentra el español cuando lo hay de verdad. */
  check('3) control: el mismo detector sí ve el español del diccionario',
    Object.values(ES.business).filter((v) => /[áéíóúñ¿¡]/.test(v)).length > 5);

  /*
   * `description` se salta arriba porque NADIE la pinta: lo que se lee de cada
   * experiencia sale de `claveDescripcion`. Si algún día alguien la enseñara,
   * esto lo dice antes de que salga en español en una pantalla en inglés.
   */
  const pintan = ['screens/WeeCreatorScreen.tsx', 'components/DrawerMenu.tsx', 'components/Sidebar.tsx',
    'components/BarraInferior.tsx', 'screens/CreatorFlowScreen.tsx']
    .filter((p) => /\.description\b/.test(soloCodigo(leer(p))));
  check('3b) y `description` sigue siendo documentación: nadie la pinta',
    pintan.length === 0
    && EXP.ALL_EXPERIENCES.every((e) => e.claveDescripcion.startsWith('creator.')),
    pintan.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Español e inglés, completos y parejos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const modulos = ['weeai', 'writer', 'creator', 'business'];
  const desparejos = modulos.filter((m) => Object.keys(ES[m]).sort().join() !== Object.keys(EN[m]).sort().join());
  check('4) los cuatro módulos tienen exactamente las mismas claves en los dos idiomas',
    desparejos.length === 0, desparejos.join(' '));

  const vacias = modulos.flatMap((m) => Object.keys(ES[m])
    .filter((k) => !String(ES[m][k]).trim() || !String(EN[m][k] ?? '').trim()).map((k) => m + '.' + k));
  check('5) ninguna clave está vacía en ninguno de los dos', vacias.length === 0, vacias.slice(0, 5).join(' '));

  check('6) Weë Business estrena módulo propio y está dado de alta',
    Object.keys(ES.business).length >= 40
    && /import \{ business \} from '\.\/business';/.test(leer('i18n/textos/es/index.ts'))
    && /^  business,$/m.test(leer('i18n/textos/es/index.ts'))
    && /import \{ business \} from '\.\/business';/.test(leer('i18n/textos/en/index.ts'))
    && /^  business,$/m.test(leer('i18n/textos/en/index.ts')),
    Object.keys(ES.business).length + ' claves');

  /* Toda clave que se pide existe. Se recogen las llamadas literales del alcance. */
  const pedidas = [...TODO.matchAll(/t\('([a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+)'/g)].map((m) => m[1]);
  const resolver = (clave, dic) => {
    const [mod, k] = clave.split('.');
    return dic[mod] ? dic[mod][k] : undefined;
  };
  const rotas = [...new Set(pedidas)].filter((c) => {
    const [mod] = c.split('.');
    if (!ES[mod]) return false; /* módulo que esta prueba no cargó */
    return typeof resolver(c, ES) !== 'string' || typeof resolver(c, EN) !== 'string';
  });
  check('7) las ' + new Set(pedidas).size + ' claves que piden estas pantallas existen en los dos idiomas',
    rotas.length === 0, rotas.slice(0, 5).join(' '));
  /*
   * Y una clave no se enseña nunca tal cual. Se busca lo que la delataría: una
   * clave puesta como texto dentro del JSX, sin pasar por el traductor.
   */
  const crudas = [...TODO.matchAll(/>\s*\{?\s*'((?:weeai|business|writer|creator|common)\.[A-Za-z0-9_]+)'/g)].map((m) => m[1]);
  check('7) y ninguna clave se enseña tal cual', crudas.length === 0, crudas.slice(0, 4).join(' '));
  /* Guardarlas SÍ está bien: es lo que hacen los catálogos, con nombre de clave. */
  check('7) las que se guardan se llaman clave*, para que se vea que lo son',
    /claveEtiqueta: 'creator\./.test(CODIGO['constants/weeExperiences.ts'])
    && /claveObjetivo: 'business\./.test(CODIGO['constants/businessMock.ts'])
    && /claveDelEstado/.test(CODIGO['services/creatorService.ts']));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Nada en español dentro del inglés ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const PRESTAMOS = /Résumé|Façade/gi;
  const acentos = [];
  for (const m of ['weeai', 'writer', 'creator', 'business']) {
    for (const [k, v] of Object.entries(EN[m])) {
      if (/[áéíóúñ¿¡]/i.test(String(v).replace(PRESTAMOS, ''))) acentos.push(m + '.' + k + '=' + v);
    }
  }
  check('8) ninguna frase inglesa lleva tildes, eñes ni signos de apertura',
    acentos.length === 0, acentos.slice(0, 4).join(' | '));

  const PALABRAS = [' tu ', ' tus ', ' para ', ' una ', ' quiero', ' cuéntame', ' hacer ', ' los ', ' las ', ' mis ', ' negocio'];
  const castellano = [];
  for (const m of ['weeai', 'writer', 'creator', 'business']) {
    for (const [k, v] of Object.entries(EN[m])) {
      const texto = ' ' + String(v).toLowerCase() + ' ';
      if (PALABRAS.some((p) => texto.includes(p))) castellano.push(m + '.' + k + '=' + v);
    }
  }
  check('9) ni palabras sueltas en castellano', castellano.length === 0, castellano.slice(0, 4).join(' | '));

  /* CONTROL: el detector sí pilla el español, o no estaría detectando nada. */
  const pilla = Object.values(ES.business).filter((v) => /[áéíóúñ¿¡]/i.test(v)).length;
  check('10) control: el detector sí encuentra el español cuando lo hay', pilla > 5, String(pilla));

  /*
   * Y al revés: el español no se quedó a medias en inglés. Solo se libran dos
   * cosas: las palabras que se escriben igual en los dos idiomas, y las frases
   * que no tienen idioma porque son solo huecos —'{{dia}} {{fecha}}'—.
   */
  const IGUAL_OK = /^(Ideas|Marketing|Pop|Rock|Drama|demo|Instagram|Facebook|TikTok|YouTube)$/;
  const soloHuecos = (v) => !/[A-Za-zÀ-ÿ]/.test(String(v).replace(/\{\{[^}]*\}\}/g, ''));
  const iguales = Object.keys(ES.business).filter((k) => ES.business[k] === EN.business[k]
    && !IGUAL_OK.test(ES.business[k]) && !soloHuecos(ES.business[k]));
  check('11) Weë Business está traducido de verdad, no copiado',
    iguales.length === 0, iguales.map((k) => k + '=' + ES.business[k]).slice(0, 4).join(' | '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Interpolación y plurales ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const huecos = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const desparejos = [];
  for (const m of ['weeai', 'writer', 'creator', 'business']) {
    for (const k of Object.keys(ES[m])) {
      if (huecos(ES[m][k]) !== huecos(EN[m][k])) desparejos.push(m + '.' + k);
    }
  }
  check('12) los huecos de cada frase son los mismos en los dos idiomas',
    desparejos.length === 0, desparejos.slice(0, 5).join(' '));

  const conHuecos = ['weeai', 'business', 'writer', 'creator']
    .flatMap((m) => Object.keys(ES[m]).filter((k) => huecos(ES[m][k])).map((k) => m + '.' + k));
  check('13) hay ' + conHuecos.length + ' frases con interpolación y ninguna se arma pegando cadenas',
    conHuecos.length >= 12
    && !/`\$\{experienceLabel/.test(TODO)
    && !/Responder a \$\{/.test(TODO)
    && !/Programar una publicación/.test(TODO),
    String(conHuecos.length));

  /* Quien pide una frase con hueco le pasa el valor. */
  const llamadas = [...TODO.matchAll(/t\('((?:weeai|business|writer|creator)\.[A-Za-z0-9_]+)'(,\s*\{[^}]*\})?\)/g)];
  const sinValores = llamadas.filter(([, clave, valores]) => {
    const [mod, k] = clave.split('.');
    if (!ES[mod] || !ES[mod][k]) return false;
    return huecos(ES[mod][k]) && !valores;
  }).map((m) => m[1]);
  check('14) y cada llamada con hueco pasa sus valores', sinValores.length === 0, sinValores.join(' '));

  /* Los plurales los decide Intl, con las dos variantes escritas. */
  for (const base of ['openTravel', 'closeTravel']) {
    check('15) ' + base + ' tiene sus dos formas en los dos idiomas',
      !!ES.weeai[base + '_one'] && !!ES.weeai[base + '_other']
      && !!EN.weeai[base + '_one'] && !!EN.weeai[base + '_other']);
  }
  check('15) y se piden con contador, no con un if',
    /t\(open \? 'weeai\.closeTravel' : 'weeai\.openTravel', \{ titulo, contador: actions\.length \}\)/
      .test(CODIGO['components/creator/TravelLauncher.tsx']));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Fechas y números, por Intl ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('16) no queda ningún formato clavado al español en el alcance',
    !/toLocaleString\('es'\)|toLocaleDateString\('es'\)|toLocaleTimeString\('es'\)|(NumberFormat|DateTimeFormat)\('es'\)/.test(TODO));

  check('17) Weë Business ya no lleva los días y los meses escritos a mano',
    !/'Dom', 'Lun'|'ene', 'feb'/.test(CODIGO['constants/businessMock.ts'])
    && /formatearFecha\(date, locale, \{ weekday: 'short' \}\)/.test(CODIGO['constants/businessMock.ts']));

  /* Y el calendario cambia de verdad de idioma. */
  const lunes = new Date(Date.UTC(2026, 8, 14, 12));
  const es = MOCK.getBusinessCalendar('es', lunes);
  const en = MOCK.getBusinessCalendar('en', lunes);
  check('18) los siete días salen en el idioma que se pida',
    es.length === 7 && en.length === 7 && es[0].weekday !== en[0].weekday,
    es[0].weekday + ' / ' + en[0].weekday);
  check('18) y la fecha también', es[0].label !== en[0].label, es[0].label + ' / ' + en[0].label);

  check('19) "Editado hace dos días" lo dice Intl, no cuatro if',
    /formatearTiempoRelativo\(timestamp, locale, ahora\)/.test(CODIGO['services/documentsService.ts'])
    && !/Editado hoy|Hace 1 día|Hace \$\{/.test(CODIGO['services/documentsService.ts'])
    && /t\('writer\.editedWhen', \{ cuando: describeUpdated\(doc\.updatedAt, locale\) \}\)/
      .test(CODIGO['components/creator/WriterDocuments.tsx']));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Lo que NO se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Las marcas, iguales en los dos idiomas. */
  const conWee = Object.keys(ES.business).concat().filter((k) => /Weë/.test(ES.business[k]));
  const perdidas = conWee.filter((k) => !/Weë/.test(EN.business[k]));
  check('20) donde el español nombra a Weë, el inglés también', perdidas.length === 0, perdidas.join(' '));
  check('21) y los nombres de las once experiencias siguen sin traducir',
    EXP.ALL_EXPERIENCES.length === 11
    && EXP.ALL_EXPERIENCES.every((e) => /^Weë /.test(e.name))
    && !EXP.ALL_EXPERIENCES.some((e) => e.name.startsWith('creator.')));

  /* Lo que escribe una persona —o su negocio— no pasa por el traductor. */
  const enDiccionario = (texto) => ['weeai', 'writer', 'creator', 'business']
    .some((m) => Object.values(ES[m]).includes(texto) || Object.values(EN[m]).includes(texto));
  const contenido = [
    ...MOCK.BUSINESS_MESSAGES.map((m) => m.text),
    ...MOCK.BUSINESS_MESSAGES.map((m) => m.name),
    ...MOCK.BUSINESS_NETWORKS.map((n) => n.handle),
  ];
  const traducido = contenido.filter(enDiccionario);
  check('22) los mensajes de clientes y sus arrobas NO están en el diccionario',
    traducido.length === 0, traducido.join(' | '));
  check('22) ni las publicaciones programadas del negocio',
    MOCK.getBusinessCalendar('es', new Date(Date.UTC(2026, 8, 14, 12)))
      .every((d) => !enDiccionario(d.post.title) && !/^business\./.test(d.post.title)));

  /*
   * "Sin título" tampoco: no es un rótulo de la pantalla, es el nombre que se
   * GUARDA cuando alguien no le pone ninguno, y desde ese momento es el nombre
   * de ese documento. Si pasara por el traductor, el mismo documento se
   * llamaría distinto según el idioma del día en que se creó.
   */
  check('22b) el título por defecto de un documento se guarda, no se pinta',
    /const titleOf = [^\n]*'Sin título'/.test(CODIGO['services/documentsService.ts'])
    && !enDiccionario('Sin título')
    && !/const titleOf = \([^)]*\bt:/.test(CODIGO['services/documentsService.ts']));

  /* Las palabras con las que se busca no son interfaz: comparan, no se leen. */
  check('23) las palabras clave de la búsqueda siguen sin tocarse',
    EXP.ALL_EXPERIENCES.every((e) => e.keywords.length > 0 && !e.keywords.some((k) => k.startsWith('creator.')))
    && EXP.ALL_EXPERIENCES.find((e) => e.id === 'design').keywords.includes('logo'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Nada funcional se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('24) las once experiencias, con su identificador y su orden',
    EXP.ALL_EXPERIENCES.map((e) => e.id).join(',') === 'design,studio,photo,writer,music,beauty,chef,home,business,travel,brain',
    EXP.ALL_EXPERIENCES.map((e) => e.id).join(','));
  check('25) y las que entran por otra sección siguen entrando por la misma',
    Object.entries(EXP.EXPERIENCE_AREA).map(([id, a]) => id + '→' + a.section).join(' ')
      === 'photo→studio studio→studio beauty→studio home→design');
  check('26) el nombre del área se resuelve con el traductor y el propio no',
    EXP.experienceLabel({ id: 'home', name: 'Weë Home' }, (c) => '@' + c) === '@creator.areaHomeName'
    && EXP.experienceLabel({ id: 'chef', name: 'Weë Chef' }, (c) => '@' + c) === 'Weë Chef');

  check('27) los siete atajos de Weë Business no cambiaron de destino',
    MOCK.BUSINESS_SHORTCUTS.map((s) => s.id + ':' + s.optionId).join(' ')
      === 'ideas:idea marketing:marketing social:content analyze:analyze documents:plan sell:marketing career:cv',
    MOCK.BUSINESS_SHORTCUTS.map((s) => s.optionId).join(','));
  check('27) y todos llevan su clave y su meta',
    MOCK.BUSINESS_SHORTCUTS.every((s) => s.clave.startsWith('business.') && s.claveObjetivo.startsWith('business.') && s.icon.endsWith('-outline')));
  check('28) las cinco redes y las cuatro métricas siguen igual',
    MOCK.BUSINESS_NETWORKS.map((n) => n.id).join(',') === 'instagram,facebook,tiktok,youtube,whatsapp'
    && MOCK.BUSINESS_STATS.map((s) => s.id + '=' + s.value + s.delta).join(' ')
      === 'posts=24↑ 40% reach=125.4K↑ 60% interactions=2.8K↑ 35% messages=186↑ 70%');

  check('29) el estado de un trabajo son seis claves y se resuelven al pintar',
    /asking: 'weeai\.jobAsking'/.test(CODIGO['services/creatorService.ts'])
    && Object.keys(ES.weeai).filter((k) => k.startsWith('job')).length === 6
    && ['screens/SpecialistScreen.tsx', 'screens/WeeCreatorScreen.tsx', 'screens/ProjectScreen.tsx']
      .every((p) => /t\(claveDelEstado\[job\.status\]\)/.test(soloCodigo(leer(p)))));

  check('30) control: ni el motor de IA, ni los proveedores, ni los Credits',
    !/aiRouter|engine\/router|providers\/|spendCredits|creditCosts|gemini|seedance/i.test(TODO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · La interfaz aguanta un idioma más largo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * No se comprueba que el inglés quepa: se comprueba que NADIE le ha puesto
   * una talla fija. Un rótulo con ancho clavado o con la altura escrita a mano
   * se rompe en cuanto llega un idioma más largo que el español.
   */
  const pantallas = ['screens/SpecialistScreen.tsx', 'screens/BrainChatScreen.tsx', 'screens/BusinessScreen.tsx',
    'components/creator/WriterDocuments.tsx', 'components/creator/TravelLauncher.tsx', 'components/creator/ui.tsx'];
  const conAlturaFija = pantallas.filter((p) => /^\s+height: scale\(\d+\),$/m.test(soloCodigo(leer(p)))
    && /Text|title|label/i.test(soloCodigo(leer(p))));
  /* Las alturas que hay son de círculos y avatares, no de texto: se listan. */
  check('31) los rótulos no llevan ancho clavado',
    !/width: scale\(\d+\)[^}]*\n\s*fontSize/.test(pantallas.map((p) => leer(p)).join('\n')),
    conAlturaFija.length ? conAlturaFija.map((p) => p.split('/').pop()).join(' ') : '');

  check('32) y el texto que puede crecer se recorta con numberOfLines, no con una altura',
    (TODO.match(/numberOfLines=/g) || []).length >= 10);

  /*
   * Los dos idiomas miden distinto y eso es normal. Lo que se vigila es una
   * frase que se DISPARE: larga de por sí y además casi el doble que la
   * española, que es cuando un botón se parte o un título se recorta. Una
   * diferencia de diez letras en una frase corta no rompe nada.
   */
  const largas = [];
  for (const m of ['weeai', 'business', 'writer']) {
    for (const k of Object.keys(ES[m])) {
      const a = String(ES[m][k]).length, b = String(EN[m][k]).length;
      if (b > 40 && b > a * 1.8) largas.push(m + '.' + k + ' ' + a + '→' + b);
    }
  }
  check('33) ninguna frase inglesa es desproporcionadamente más larga que la española',
    largas.length === 0, largas.slice(0, 4).join(' | '));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
