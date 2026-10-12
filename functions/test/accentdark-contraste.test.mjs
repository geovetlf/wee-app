/*
 * EL DORADO OSCURO NO VUELVE A SER COLOR DE TEXTO EN WEË AI.
 *
 * `accentDark` (#E5A020) sobre la tarjeta blanca da 2,24:1: no llega ni a 3:1 y AA pide 4,5:1 en texto normal. Todo el
 * taller de Weë AI se pinta con el tema CLARO (`enTemaClaro`: el oscuro no se ve nunca ahí dentro), así que ese es el
 * contraste que importa. R7-Design (C) lo corrigió en el aviso de la creación y dejó medido el resto como F-12; la ronda
 * R8 (CON) recorrió los 31 usos de texto de toda la app (16 de Weë AI) y corrigió los 13 que no perdían significado.
 * Todo está medido y razonado en `docs/WEE-ACCENTDARK-AUDITORIA.md`.
 *
 * Esta suite es el candado, y se vigila lo siguiente:
 *
 *  A. EL DETECTOR: se prueba contra fragmentos de código conocidos antes de fiarse de él (texto, icono, borde, variable).
 *  B. NINGÚN USO NUEVO: todo `accentDark` que pinta TEXTO en una pieza de Weë AI está en la lista de pendientes (con su
 *     motivo) o es un falso positivo vigilado. Si aparece uno nuevo —o vuelve uno corregido— esto falla.
 *  C. SIN FANTASMAS: lo que la lista dice pendiente tiene que seguir existiendo; si se corrige, se quita de la lista.
 *  D. LO CORREGIDO SIGUE CORREGIDO: cada texto que pasó al color del texto sigue ahí y sigue pasando AA sobre su
 *     superficie, calculado con la fórmula de WCAG sobre los colores de `ThemeContext.tsx` (el mismo cálculo de C).
 *  E. SABOTAJE: devolver el dorado a cada texto corregido, en memoria, tiene que hacer caer el candado.
 *  F. LO QUE SE DIBUJA: los dos componentes cuya LÓGICA cambió (`Chip` de la producción, con sus cinco tonos, y `Pastilla` de
 *     Business, puesta y sin poner) se dibujan en proceso con los colores del tema claro, y se mira lo que pintan: el cambio
 *     del texto y que lo demás —los otros tonos, el borde, el icono, el fondo— sigue igual.
 *
 * El alcance de «Weë AI» es el de las demás suites de cierre: las carpetas de sus componentes y toda pantalla que se
 * monta sobre `CreatorShell` o se exporta con `enTemaClaro` —así una sección nueva entra sola en la vigilancia—.
 * Los iconos, bordes y fondos dorados NO se vigilan: el dorado es la identidad y ahí se queda (2,24:1 es insuficiente
 * para texto, no para un adorno). Lo que sí falla es un uso que el detector no sabe clasificar: no se deja pasar a ciegas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { temasDeLaApp, contraste, AA_TEXTO } from './_contraste-wcag.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const ts = createRequire(path.resolve(RAIZ, 'package.json'))('typescript');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const f2 = (x) => x.toFixed(2).replace('.', ',');
const unico = (x, i, todos) => todos.indexOf(x) === i;

/* ───────────────────────────── el detector ───────────────────────────── */
const ICONOS = /^(Ionicons|Feather|MaterialIcons|MaterialCommunityIcons|FontAwesome\d?|AntDesign|Entypo|Octicons|SimpleLineIcons|IconoWee)$/;
const TEXTOS = /^(Text|TextoEnMayusculas|Animated\.Text|TextInput)$/;
const MARCAS_DE_TEXTO = /^(MarcaDeWeeAi|MarcaDeCredits)$/; // componentes que pintan letras con la prop `color`
const POR_CLAVE = {
  backgroundColor: 'fondo', borderColor: 'borde', borderTopColor: 'borde', borderBottomColor: 'borde', borderLeftColor: 'borde', borderRightColor: 'borde',
  outlineColor: 'borde', shadowColor: 'sombra', textShadowColor: 'sombra', tintColor: 'icono',
};

/**
 * Lee un archivo TSX y devuelve:
 *  · `usos`: cada `X.accentDark` clasificado —texto | icono | indicador | borde | fondo | sombra | svg | otro—; los de
 *    TEXTO llevan su `huella` (archivo · etiqueta · hoja de estilo · lo que pinta), que no depende del número de línea.
 *  · `textos`: todos los `<Text>`/`<TextoEnMayusculas>` del archivo con su huella y los tokens del tema que usa su `color`.
 */
const analizar = (rel, texto) => {
  const sf = ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const txt = (n) => n.getText(sf);
  const linea = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const esElemento = (e) => e && (ts.isJsxOpeningElement(e) || ts.isJsxSelfClosingElement(e));

  const atributo = (el, nombre) => el.attributes.properties.find((p) => ts.isJsxAttribute(p) && txt(p.name) === nombre);
  const estiloDe = (el) => { const a = atributo(el, 'style'); return a?.initializer && ts.isJsxExpression(a.initializer) ? a.initializer.expression : null; };
  const hojaDe = (expr) => {
    let r = null;
    const v = (n) => {
      if (r) return;
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && /^(styles|estilos)$/.test(n.expression.text)) { r = n.name.text; return; }
      ts.forEachChild(n, v);
    };
    if (expr) v(expr);
    return r ?? '(inline)';
  };
  const hijosDe = (el) => {
    const padre = ts.isJsxOpeningElement(el) ? el.parent : null;
    if (!padre || !ts.isJsxElement(padre)) return '';
    const crudo = padre.children.map(txt).join(' ').replace(/\s+/g, ' ').trim();
    const claves = [...crudo.matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)].map((m) => m[1]);
    return claves.length ? claves.join('|') : crudo.slice(0, 60);
  };
  const huellaDe = (el) => `${rel} · ${txt(el.tagName)} · ${hojaDe(estiloDe(el))} · ${hijosDe(el)}`;

  /** El nodo `color: …` del primer objeto en línea del estilo de un texto, y los tokens del tema que menciona. */
  const colorDeTexto = (el) => {
    const expr = estiloDe(el);
    let nodo = null;
    const v = (n) => {
      if (nodo) return;
      if (ts.isPropertyAssignment(n) && txt(n.name) === 'color' && n.parent && ts.isObjectLiteralExpression(n.parent)) { nodo = n; return; }
      ts.forEachChild(n, v);
    };
    if (expr) v(expr);
    if (!nodo) return { nodo: null, tokens: [], variables: [] };
    const tokens = []; const variables = [];
    const w = (n) => {
      if (ts.isPropertyAccessExpression(n) && /colors$/.test(txt(n.expression))) tokens.push(n.name.text);
      else if (ts.isIdentifier(n) && !ts.isPropertyAccessExpression(n.parent) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) variables.push(n.text);
      ts.forEachChild(n, w);
    };
    w(nodo.initializer);
    return { nodo, tokens: tokens.filter(unico), variables: variables.filter(unico) };
  };

  const elementoDeAtributo = (attr) => { const e = attr.parent?.parent; return esElemento(e) ? e : null; };
  const atributoDeEstilo = (n) => {
    for (let x = n; x; x = x.parent) {
      const p = x.parent;
      if (!p) return null;
      if (ts.isJsxAttribute(p)) return p;
      if (!(ts.isArrayLiteralExpression(p) || ts.isJsxExpression(p) || ts.isConditionalExpression(p) || ts.isParenthesizedExpression(p)
        || ts.isBinaryExpression(p) || ts.isSpreadElement(p))) return null;
    }
    return null;
  };

  const clasificar = (nodo, profundidad = 0) => {
    let n = nodo;
    const sube = (p) => ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p)
      || (ts.isConditionalExpression(p) && p.condition !== n)
      || (ts.isBinaryExpression(p) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(p.operatorToken.kind));
    while (n.parent && sube(n.parent)) n = n.parent;
    const p = n.parent;
    const base = { linea: linea(nodo) };
    // <Ionicons color={…} />
    if (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)) {
      const attr = p.parent; const el = elementoDeAtributo(attr); const tag = el ? txt(el.tagName) : '?'; const nombre = txt(attr.name);
      if (nombre === 'color' && ICONOS.test(tag)) return { ...base, tipo: 'icono', tag };
      if (nombre === 'color' && tag === 'ActivityIndicator') return { ...base, tipo: 'indicador', tag };
      if (nombre === 'color' && MARCAS_DE_TEXTO.test(tag)) return { ...base, tipo: 'texto', tag, huella: `${rel} · ${tag} · ${hojaDe(estiloDe(el))} · ` };
      if (nombre === 'fill' || nombre === 'stroke') return { ...base, tipo: 'svg', tag };
      return { ...base, tipo: 'otro', tag, nota: `prop «${nombre}» de <${tag}>: no sé si pinta texto` };
    }
    // { color: …, borderColor: … } dentro del estilo de un elemento (también la forma abreviada `{ color }`)
    if ((ts.isPropertyAssignment(p) && p.initializer === n) || (ts.isShorthandPropertyAssignment(p) && p.name === n)) {
      const k = txt(p.name);
      const attr = atributoDeEstilo(p.parent); const el = attr ? elementoDeAtributo(attr) : null;
      if (k === 'color') {
        if (!el) return { ...base, tipo: 'otro', nota: 'color suelto o en una hoja de estilos: no sé a qué elemento se aplica' };
        const tag = txt(el.tagName);
        return TEXTOS.test(tag) ? { ...base, tipo: 'texto', tag, huella: huellaDe(el) } : { ...base, tipo: 'otro', tag, nota: `color en el estilo de <${tag}>` };
      }
      if (POR_CLAVE[k]) return { ...base, tipo: POR_CLAVE[k] };
      return { ...base, tipo: 'otro', nota: `propiedad «${k}»` };
    }
    // const x = cond ? theme.colors.accentDark : …   → se siguen los usos de x
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && profundidad < 2) {
      let ambito = p; while (ambito && !ts.isFunctionLike(ambito) && !ts.isSourceFile(ambito)) ambito = ambito.parent;
      const refs = [];
      const v = (m) => {
        if (ts.isIdentifier(m) && m.text === p.name.text && m !== p.name && !(ts.isPropertyAccessExpression(m.parent) && m.parent.name === m)
          && !(ts.isPropertyAssignment(m.parent) && m.parent.name === m) && !(ts.isJsxAttribute(m.parent) && m.parent.name === m)) refs.push(m);
        ts.forEachChild(m, v);
      };
      v(ambito);
      return { ...base, tipo: 'variable', variable: p.name.text, usos: refs.map((r) => ({ ...clasificar(r, profundidad + 1), via: `variable «${p.name.text}»` })) };
    }
    return { ...base, tipo: 'otro', nota: `contexto ${ts.SyntaxKind[p.kind]}` };
  };

  const usos = []; const textos = [];
  const visita = (n) => {
    if (ts.isPropertyAccessExpression(n) && n.name.text === 'accentDark' && !/ThemeContext/.test(rel)) usos.push(clasificar(n));
    // formas que el detector no sabe seguir: se anotan como «otro» y hacen fallar el candado en vez de pasar a ciegas
    if (!/ThemeContext/.test(rel)) {
      if (ts.isBindingElement(n) && (n.propertyName ? txt(n.propertyName) : txt(n.name)) === 'accentDark') usos.push({ linea: linea(n), tipo: 'otro', nota: 'accentDark desestructurado (`const { accentDark } = …`): úsalo como theme.colors.accentDark para que el candado lo siga' });
      if (ts.isElementAccessExpression(n) && /^['"`]accentDark['"`]$/.test(txt(n.argumentExpression))) usos.push({ linea: linea(n), tipo: 'otro', nota: 'colors[\'accentDark\']: úsalo como theme.colors.accentDark para que el candado lo siga' });
    }
    if (esElemento(n) && TEXTOS.test(txt(n.tagName))) { const c = colorDeTexto(n); textos.push({ huella: huellaDe(n), tokens: c.tokens, variables: c.variables, nodo: c.nodo, linea: linea(n) }); }
    ts.forEachChild(n, visita);
  };
  visita(sf);
  // las variables se aplanan: cada uso de la variable es un uso del dorado
  const planos = usos.flatMap((u) => (u.tipo === 'variable' ? u.usos : [u]));
  return { usos: planos, textos, fuente: texto };
};

/* ───────────────────────────── A. el detector, contra código conocido ───────────────────────────── */
console.log('\n─── A. El detector clasifica bien (antes de fiarse de él) ───');
{
  const caso = (cuerpo) => analizar('components/creator/Prueba.tsx', `const X = () => { const { theme } = useTheme(); return (${cuerpo}); };`).usos;
  const unTexto = caso('<Text style={[styles.titulo, { color: theme.colors.accentDark }]}>{t("a.b")}</Text>');
  check('A1) un <Text> con color accentDark es TEXTO, con su huella sin número de línea',
    unTexto.length === 1 && unTexto[0].tipo === 'texto' && unTexto[0].huella === 'components/creator/Prueba.tsx · Text · titulo · a.b', JSON.stringify(unTexto[0]));
  const unTernario = caso('<Text style={{ color: puesta ? theme.colors.accentDark : theme.colors.text }}>{etiqueta}</Text>');
  check('A2) también cuando el dorado va en un ternario (lo que se le escapó al grep de C)', unTernario.length === 1 && unTernario[0].tipo === 'texto');
  const unMayus = caso('<TextoEnMayusculas style={[styles.who, { color: theme.colors.accentDark }]}>{nombre}</TextoEnMayusculas>');
  check('A3) y en <TextoEnMayusculas>', unMayus.length === 1 && unMayus[0].tipo === 'texto' && /TextoEnMayusculas · who · \{nombre\}$/.test(unMayus[0].huella));
  const unIcono = caso('<Ionicons name="x" size={18} color={theme.colors.accentDark} />');
  check('A4) el dorado de un icono NO es texto (el dorado se queda en los adornos)', unIcono.length === 1 && unIcono[0].tipo === 'icono');
  const unBorde = caso('<View style={[styles.a, { borderColor: active ? theme.colors.accentDark : theme.colors.border }]} />');
  check('A5) ni el de un borde', unBorde.length === 1 && unBorde[0].tipo === 'borde');
  const unFondo = caso('<View style={{ backgroundColor: theme.colors.accentDark }} />');
  check('A6) ni el de un fondo', unFondo.length === 1 && unFondo[0].tipo === 'fondo');
  const unaVariable = analizar('components/creator/Prueba.tsx',
    'const X = () => { const { theme } = useTheme(); const color = on ? theme.colors.accentDark : theme.colors.text; return (<View><Ionicons name="x" color={color} /><Text style={{ color }}>{t("a.b")}</Text></View>); };').usos;
  check('A7) un color guardado en una variable se sigue hasta donde se pinta: icono y texto',
    unaVariable.length === 2 && unaVariable.some((u) => u.tipo === 'icono') && unaVariable.some((u) => u.tipo === 'texto' && u.via), JSON.stringify(unaVariable.map((u) => u.tipo)));
  const desconocido = caso('<Etiqueta color={theme.colors.accentDark} />');
  check('A8) un componente que el detector no conoce NO se deja pasar: es «otro» y hará fallar el candado', desconocido.length === 1 && desconocido[0].tipo === 'otro');
  const marca = caso('<MarcaDeWeeAi size={13} color={theme.colors.accentDark} />');
  check('A9) las marcas ẄAI/ẄC pintan letras: cuentan como texto', marca.length === 1 && marca[0].tipo === 'texto');
  const sinDorado = caso('<Text style={[styles.titulo, { color: theme.colors.text }]}>{t("a.b")}</Text>');
  check('A10) un texto en el color del texto no es un uso del dorado', sinDorado.length === 0);
  const destructurado = analizar('components/creator/Prueba.tsx', 'const X = () => { const { accentDark } = useTheme().theme.colors; return (<Text style={{ color: accentDark }}>{t("a.b")}</Text>); };').usos;
  check('A12) el dorado desestructurado (`const { accentDark } = …`) no se esconde: se anota como «otro» y hará fallar el candado', destructurado.some((u) => u.tipo === 'otro'), JSON.stringify(destructurado.map((u) => u.tipo)));
  const porIndice = caso('<Text style={{ color: theme.colors[\'accentDark\'] }}>{t("a.b")}</Text>');
  check('A13) ni el escrito como theme.colors[\'accentDark\']', porIndice.some((u) => u.tipo === 'otro'), JSON.stringify(porIndice.map((u) => u.tipo)));
  const aTexto = analizar('components/creator/Prueba.tsx', 'const X = () => (<Text style={[styles.a, { color: theme.colors.text }]}>{t("a.b")}</Text>);').textos;
  check('A11) y el inventario de textos sí lo ve, con el token que usa', aTexto.length === 1 && aTexto[0].tokens.join() === 'text', JSON.stringify(aTexto.map((x) => x.tokens)));
}

/* ───────────────────────────── el alcance: Weë AI ───────────────────────────── */
console.log('\n─── B. Ningún texto dorado nuevo en Weë AI ───');
const tsxDe = (dir) => (fs.existsSync(path.resolve(RAIZ, dir))
  ? fs.readdirSync(path.resolve(RAIZ, dir), { recursive: true }).map(String).filter((f) => /\.tsx$/.test(f)).map((f) => `${dir}/${f.split(path.sep).join('/')}`)
  : []);
const CARPETAS = ['components/creator', 'components/studio', 'components/business', 'components/design', 'components/designReferencia', 'components/chef', 'components/brain'];
const PANTALLAS = fs.readdirSync(path.resolve(RAIZ, 'screens')).filter((f) => f.endsWith('.tsx')).map((f) => `screens/${f}`)
  .filter((p) => { const s = leer(p); return /\benTemaClaro\(/.test(s) || /<CreatorShell\b/.test(s) || /<TemaClaro\b/.test(s); });
const ALCANCE = [...CARPETAS.flatMap(tsxDe), ...PANTALLAS].filter(unico);
const NOMBRADAS = ['CreatorFlow', 'Chef', 'Business', 'BrainChat', 'WeeCreator', 'Studio', 'Project', 'Specialist'].map((n) => `screens/${n}Screen.tsx`);
check('B1) el alcance encuentra Weë AI: sus carpetas de componentes y sus pantallas', ALCANCE.length >= 60 && CARPETAS.every((c) => ALCANCE.some((f) => f.startsWith(`${c}/`))),
  `${ALCANCE.length} piezas (${PANTALLAS.length} pantallas)`);
check('B2) y están las ocho pantallas que nombra el encargo (CreatorFlow, Chef, Business, BrainChat, WeeCreator, Studio, Project, Specialist)',
  NOMBRADAS.every((p) => PANTALLAS.includes(p)), NOMBRADAS.filter((p) => !PANTALLAS.includes(p)).join(', ') || 'todas');
check('B3) y se pintan siempre en claro (enTemaClaro): dentro de Weë AI el tema oscuro no se ve, y por eso lo que cuenta es el contraste del claro',
  NOMBRADAS.every((p) => /\benTemaClaro\(/.test(leer(p))), NOMBRADAS.filter((p) => !/\benTemaClaro\(/.test(leer(p))).join(', ') || 'las ocho');

const { claro } = temasDeLaApp();
const fuenteTema = leer('contexts/ThemeContext.tsx');
const glowClaro = (() => {
  const i = fuenteTema.indexOf('const lightTheme: Theme ='); const j = fuenteTema.indexOf('const darkTheme: Theme =');
  const m = fuenteTema.slice(i, j).match(/glow:\s*'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)'/);
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alfa: Number(m[4]) };
})();
check('B4) la premisa del candado sigue siendo verdad: el dorado oscuro NO llega a AA sobre la tarjeta del tema claro',
  contraste(claro.accentDark, claro.card) < AA_TEXTO, `${claro.accentDark} sobre ${claro.card} = ${f2(contraste(claro.accentDark, claro.card))}:1 (AA pide ${AA_TEXTO}:1)`);

/* La LISTA de lo que queda, cada uno con su motivo. Es lo único que puede pintar `accentDark` como texto en Weë AI. */
const PENDIENTES = [
  {
    huella: 'screens/CreatorFlowScreen.tsx · Text · attachmentText · weeai.preferWords', cuantos: 1, sup: ['background', 'surface'],
    motivo: 'Enlace de texto SOLO («Prefiero contarlo con palabras»), centrado bajo la caja de la foto: el dorado es la única señal de que se puede tocar; '
      + 'con el color del texto parecería una frase más y la salida para quien no tiene foto dejaría de verse. Necesita el token de «texto sobre dorado» (§ Propuesta de sistema del documento).',
  },
  {
    huella: 'screens/CreatorFlowScreen.tsx · Text · attachmentText · weeai.change', cuantos: 1, sup: ['card'],
    motivo: 'Acción «Cambiar» de la foto del espacio, en la barra del título «Tu espacio»: el título tiene la MISMA tipografía (negrita de 13 px, color del texto) '
      + 'y sin el dorado no habría nada que las distinguiera. (El «Cambiar» del adjunto normal, tras el texto gris «Foto lista», sí se corrigió: ahí queda el color y el peso.)',
  },
  {
    huella: 'components/creator/ResultCard.tsx · Text · projectAction · weeai.change|weeai.choose', cuantos: 1, sup: ['card'],
    motivo: 'Acción «Cambiar»/«Elegir» al final de la fila del proyecto: la frase de al lado va en semibold del color del texto y la acción en bold de 12 px; '
      + 'sin el dorado solo las separarían un punto de tamaño y un escalón de peso.',
  },
];
/* Lo que el detector marca pero NO es un texto dorado: se vigila con una expresión que prueba por qué. */
const FALSOS_POSITIVOS = [
  {
    huella: 'components/studio/produccion/ProductionPiezas.tsx · Text · chipTexto · {texto}', cuantos: 1,
    archivo: 'components/studio/produccion/ProductionPiezas.tsx',
    vigila: /color: tono === 'neutro' \|\| tono === 'acento' \? theme\.colors\.text : color\b/,
    motivo: 'El chip guarda en `color` el tono del borde y del icono (en «acento», el dorado) y el texto lo usa en los tonos aviso/error/ok; en «acento» '
      + 'el texto ya va en `text`, y eso es lo que prueba la expresión vigilada. El detector sigue la variable sin evaluar la condición.',
  },
];

const detectados = ALCANCE.flatMap((rel) => {
  const fuente = leer(rel);
  return fuente.includes('accentDark') ? analizar(rel, fuente).usos.map((u) => ({ ...u, rel })) : [];
});
const comoTexto = detectados.filter((u) => u.tipo === 'texto');
const sinClasificar = detectados.filter((u) => u.tipo === 'otro');
const contar = (lista, clave) => lista.reduce((m, x) => m.set(x[clave], (m.get(x[clave]) ?? 0) + 1), new Map());
const porHuella = contar(comoTexto, 'huella');
const permitidos = new Map([...PENDIENTES, ...FALSOS_POSITIVOS].map((e) => [e.huella, e.cuantos]));

const sobrantes = [...porHuella].filter(([h, n]) => n > (permitidos.get(h) ?? 0)).map(([h, n]) => `${h} ×${n - (permitidos.get(h) ?? 0)} de más`);
check('B5) NINGÚN texto de Weë AI usa accentDark fuera de la lista de pendientes (ni uno nuevo ni uno corregido que haya vuelto)',
  sobrantes.length === 0,
  sobrantes.length
    ? `${sobrantes.join(' · ')} → usa theme.colors.text (${f2(contraste(claro.text, claro.card))}:1 sobre la tarjeta) o, si perdería significado, añádelo a PENDIENTES con su motivo; ver docs/WEE-ACCENTDARK-AUDITORIA.md`
    : `${comoTexto.length} usos detectados, todos listados`);
check('B6) ningún uso de accentDark en Weë AI se queda sin clasificar (un componente nuevo con color=… no se deja pasar a ciegas)',
  sinClasificar.length === 0, sinClasificar.map((u) => `${u.rel}:${u.linea} ${u.nota ?? ''}`).join(' · ') || 'todos clasificados');
const tipos = contar(detectados, 'tipo');
check('B7) el recuento de lo que queda está a la vista: los iconos y bordes dorados no se tocan', true,
  `texto ${tipos.get('texto') ?? 0} · icono ${tipos.get('icono') ?? 0} · borde ${tipos.get('borde') ?? 0} · fondo ${tipos.get('fondo') ?? 0} · indicador ${tipos.get('indicador') ?? 0} · otro ${tipos.get('otro') ?? 0}`);

console.log('\n─── C. La lista de pendientes no tiene fantasmas ───');
for (const e of PENDIENTES) {
  const hay = porHuella.get(e.huella) ?? 0;
  check(`C1) pendiente «${e.huella.replace(/^.*\/(.+?) · /, '$1 · ')}» sigue existiendo (${e.cuantos})`, hay === e.cuantos,
    hay === e.cuantos ? 'sigue pintando el dorado' : hay < e.cuantos ? `ya no existe o se corrigió (${hay}): quítalo de PENDIENTES` : `hay ${hay}: más de los listados`);
  check('C2) y trae su motivo', typeof e.motivo === 'string' && e.motivo.length > 60);
}
for (const e of FALSOS_POSITIVOS) {
  check(`C3) el falso positivo de ${path.basename(e.archivo)} sigue siendo uno: el texto del chip «acento» va en el color del texto`,
    e.vigila.test(leer(e.archivo)) && (porHuella.get(e.huella) ?? 0) <= e.cuantos, e.vigila.source);
}

/* ───────────────────────────── los textos corregidos ───────────────────────────── */
console.log('\n─── D. Lo corregido sigue corregido y pasa AA ───');
const FONDOS = {
  card: () => claro.card, background: () => claro.background, surface: () => claro.surface,
};
const componer = (rgb, alfa, base) => {
  const b = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16));
  return `#${rgb.map((c, i) => Math.round(c * alfa + b[i] * (1 - alfa)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};
const acentoRgb = [1, 3, 5].map((i) => parseInt(claro.accent.slice(i, i + 2), 16));
const fondo = (spec) => {
  if (typeof spec === 'string') return FONDOS[spec]();
  if (spec.glow) return componer(glowClaro.rgb, glowClaro.alfa, fondo(spec.sobre));
  return componer(acentoRgb, spec.accent, fondo(spec.sobre));
};
const PAGINA = ['background', 'surface']; // móvil / escritorio: lo que hay detrás de lo que no está en una tarjeta (CreatorShell)
const tinte = (hex2, bases) => bases.map((b) => ({ accent: parseInt(hex2, 16) / 255, sobre: b }));
const brillo = (bases) => bases.map((b) => ({ glow: true, sobre: b }));

const CORREGIDOS = [
  { huella: 'components/creator/CreatorShell.tsx · Text · overline · {overline}', sup: ['background'] },
  { huella: 'components/creator/JobProgress.tsx · TextoEnMayusculas · who · creaciones.progressWorking', sup: ['card'] },
  { huella: 'components/creator/PlanCard.tsx · TextoEnMayusculas · who · {experienceName}', sup: tinte('1A', PAGINA) },
  { huella: 'components/creator/PlanCard.tsx · Text · linkText · weeai.changeSomething', sup: tinte('1A', PAGINA) },
  { huella: 'components/creator/ResultCard.tsx · Text · demoTagText · weeai.previewDemo', sup: tinte('33', PAGINA) },
  { huella: 'components/creator/AjustesContextuales.tsx · Text · opcionTexto · {t(opcion.clave)}', sup: brillo(['card']) },
  { huella: 'components/business/BusinessPanel.tsx · Text · pastillaTexto · {etiqueta}', sup: brillo(PAGINA) },
  { huella: 'screens/BusinessScreen.tsx · Text · fichaTexto · {producto}', sup: brillo(PAGINA) },
  { huella: 'screens/ChefScreen.tsx · Text · fichaTexto · {t(clave)}', sup: brillo(['background']) },
  { huella: 'components/studio/produccion/ProductionSceneCard.tsx · TextoEnMayusculas · numero · {nombre}', sup: ['surface'] },
  { huella: 'screens/WeeCreatorScreen.tsx · Text · detailLinkText · weeai.willNotifyYou|weeai.notifyMeReal', sup: tinte('1A', PAGINA) },
  { huella: 'screens/CreatorFlowScreen.tsx · Text · attachmentText · weeai.change', sup: ['card'] },
];
const rel = (h) => h.split(' · ')[0];
const cache = new Map();
const deArchivo = (r) => { if (!cache.has(r)) cache.set(r, analizar(r, leer(r))); return cache.get(r); };

for (const c of CORREGIDOS) {
  const textos = deArchivo(rel(c.huella)).textos.filter((t) => t.huella === c.huella);
  const conText = textos.filter((t) => t.tokens.length === 1 && t.tokens[0] === 'text' && t.variables.length === 0);
  const conDorado = textos.filter((t) => t.tokens.includes('accentDark'));
  const quedan = (PENDIENTES.find((p) => p.huella === c.huella)?.cuantos) ?? 0;
  check(`D1) ${c.huella.replace(/^.*\/(.+?) · /, '$1 · ')} pinta el color del texto`, conText.length === 1 && conDorado.length === quedan,
    `${conText.length} con theme.colors.text, ${conDorado.length} con el dorado (pendientes: ${quedan})`);
  const peor = Math.min(...c.sup.map((s) => contraste(claro.text, fondo(s))));
  const antes = Math.min(...c.sup.map((s) => contraste(claro.accentDark, fondo(s))));
  check('D2) y eso pasa AA sobre su superficie, donde el dorado no pasaba', peor >= AA_TEXTO && antes < AA_TEXTO,
    `text ${f2(peor)}:1 (peor superficie) frente a accentDark ${f2(antes)}:1`);
}
{
  const piezas = leer('components/studio/produccion/ProductionPiezas.tsx');
  const fp = FALSOS_POSITIVOS[0];
  check('D1) components/studio/produccion/ProductionPiezas.tsx · el chip «acento» pinta su texto con el color del texto (borde e icono siguen dorados)',
    fp.vigila.test(piezas) && /tono === 'acento' \? theme\.colors\.accentDark/.test(piezas));
  const peor = contraste(claro.text, claro.surface); const antes = contraste(claro.accentDark, claro.surface);
  check('D2) y eso pasa AA sobre su superficie (surface), donde el dorado no pasaba', peor >= AA_TEXTO && antes < AA_TEXTO, `text ${f2(peor)}:1 frente a accentDark ${f2(antes)}:1`);
}
for (const p of PENDIENTES) {
  const peor = Math.min(...p.sup.map((s) => contraste(claro.accentDark, fondo(s))));
  check(`D3) lo pendiente sigue siendo un fallo medido de verdad (si el token pasara AA, este candado ya no haría falta): ${p.huella.replace(/^.*\/(.+?) · /, '$1 · ')}`,
    peor < AA_TEXTO, `accentDark ${f2(peor)}:1 sobre ${p.sup.map((s) => (typeof s === 'string' ? s : JSON.stringify(s))).join(' / ')}`);
}

/* ───────────────────────────── E. el sabotaje ───────────────────────────── */
console.log('\n─── E. Sabotaje: devolver el dorado a un texto corregido hace caer el candado ───');
const sinListar = (usos) => {
  const c = contar(usos.filter((u) => u.tipo === 'texto'), 'huella');
  return [...c].filter(([h, n]) => n > (permitidos.get(h) ?? 0)).map(([h]) => h);
};
for (const c of CORREGIDOS) {
  const r = rel(c.huella);
  const a = deArchivo(r);
  const t = a.textos.find((x) => x.huella === c.huella && x.tokens.join() === 'text');
  if (!t?.nodo) { check(`E1) ${c.huella}: se puede sabotear`, false, 'no encuentro el color corregido'); continue; }
  const ini = t.nodo.initializer.getStart(); const fin = t.nodo.initializer.getEnd();
  const mutado = `${a.fuente.slice(0, ini)}theme.colors.accentDark${a.fuente.slice(fin)}`;
  const cae = sinListar(analizar(r, mutado).usos);
  check(`E1) devolver accentDark a ${c.huella.replace(/^.*\/(.+?) · /, '$1 · ')} hace fallar B5`, cae.includes(c.huella), cae.length ? 'detectado' : 'NO detectado');
}
{
  const piezas = leer('components/studio/produccion/ProductionPiezas.tsx');
  const mutado = piezas.replace("tono === 'neutro' || tono === 'acento' ? theme.colors.text : color", "tono === 'neutro' ? theme.colors.text : color");
  check('E1) y devolver el dorado al chip «acento» (quitar la guarda) hace fallar el falso positivo vigilado', mutado !== piezas && !FALSOS_POSITIVOS[0].vigila.test(mutado));
}
{
  // un texto dorado NUEVO en una pieza de Weë AI también cae
  const r = 'components/creator/JobProgress.tsx';
  const mutado = `${leer(r)}\nconst Nuevo = () => { const { theme } = useTheme(); return (<Text style={{ color: theme.colors.accentDark }}>{t('x.nuevo')}</Text>); };\n`;
  check('E2) un texto dorado NUEVO en una pieza de Weë AI también hace fallar B5', sinListar(analizar(r, mutado).usos).length === 1);
}

/* ───────────────────────────── F. lo que se dibuja de verdad ───────────────────────────── */
console.log('\n─── F. Lo que se DIBUJA: los dos componentes cuya lógica cambió, con lo que pintan en el tema claro ───');
/*
 * Los demás cambios son un color por otro; estos dos tocaron una CONDICIÓN (`Chip`: la guarda del color del texto; `Pastilla`:
 * un ternario que se quita). Se dibujan tal como están, con los colores del tema claro leídos de `ThemeContext.tsx`, y se mira
 * lo que sale: el color de su texto, de su borde y de su icono. Solo se sustituye React Native por piezas que dejan ver el estilo.
 */
const { React, h } = await import('./_pantallas.mjs');
const { renderToStaticMarkup } = createRequire(path.resolve(RAIZ, 'package.json'))('react-dom/server');
const { crearCargador } = await import('./filmmaker-cliente.mjs');
const aplanarEstilo = (s) => (Array.isArray(s) ? Object.assign({}, ...s.map(aplanarEstilo)) : (s && typeof s === 'object' ? s : {}));
const textoDe = (c) => (Array.isArray(c) ? c.map(textoDe).join('') : typeof c === 'string' || typeof c === 'number' ? String(c) : '');
const glowTexto = `rgba(${glowClaro.rgb.join(', ')}, ${glowClaro.alfa})`;
const dibujarPieza = (archivo, exportada, props, rutas) => {
  const visto = { textos: [], vistas: [], iconos: [] };
  const colores = { ...claro, glow: glowTexto };
  const cargar = crearCargador({
    dobles: {
      react: React,
      'react-native': {
        View: (p) => { visto.vistas.push(aplanarEstilo(p.style)); return h('div', null, p.children); },
        Text: (p) => { visto.textos.push({ texto: textoDe(p.children), ...aplanarEstilo(p.style) }); return h('span', null, p.children); },
        TouchableOpacity: (p) => { visto.vistas.push(aplanarEstilo(p.style)); return h('button', null, p.children); },
        StyleSheet: { create: (s) => s, hairlineWidth: 1 },
        Platform: { OS: 'android', select: (o) => o.android ?? o.default },
      },
      '@expo/vector-icons': { Ionicons: (p) => { visto.iconos.push({ nombre: p.name, color: p.color }); return h('i'); } },
      [rutas.tema]: { useTheme: () => ({ theme: { colors: colores } }) },
      ...(rutas.extra ?? {}),
    },
  });
  const Pieza = cargar(archivo)[exportada];
  renderToStaticMarkup(h(Pieza, props));
  return visto;
};

{
  const chip = (tono) => dibujarPieza('components/studio/produccion/ProductionPiezas.tsx', 'Chip', { texto: 'Borrador', icono: 'create-outline', tono }, {
    tema: '../../../contexts/ThemeContext',
    extra: { '../../TextoEnMayusculas': { default: (p) => h('span', null, p.children) } },
  });
  /* tono → [color del texto, del borde, del icono] que debe pintar */
  const ESPERADO = {
    acento: [claro.text, claro.accentDark, claro.accentDark],
    neutro: [claro.text, claro.border, claro.textSecondary],
    aviso: [claro.warning, claro.warning, claro.warning],
    error: [claro.error, claro.error, claro.error],
    ok: [claro.success, claro.success, claro.success],
  };
  for (const [tono, [texto, borde, icono]] of Object.entries(ESPERADO)) {
    const v = chip(tono);
    const pintado = [v.textos[0]?.color, v.vistas[0]?.borderColor, v.iconos[0]?.color];
    check(`F1) Chip «${tono}»: texto ${texto}, borde ${borde}, icono ${icono}`, pintado.join() === [texto, borde, icono].join(), `pinta ${pintado.join(' · ')}`);
  }
  const acento = chip('acento');
  const fondoDelChip = acento.vistas[0]?.backgroundColor;
  check('F1) y el texto del chip «acento» pasa AA sobre el fondo con que el chip se pinta de verdad (no el que se supone)',
    fondoDelChip === claro.surface && contraste(acento.textos[0].color, fondoDelChip) >= AA_TEXTO, `${acento.textos[0].color} sobre ${fondoDelChip} = ${f2(contraste(acento.textos[0].color, fondoDelChip))}:1`);
  check('F1) CONTROL: el chip «acento» con el dorado en el texto NO pasaría (el candado no está dibujando un verde vacío)',
    contraste(claro.accentDark, fondoDelChip) < AA_TEXTO, `${f2(contraste(claro.accentDark, fondoDelChip))}:1`);
}
{
  const pastilla = (puesta) => dibujarPieza('components/business/BusinessPanel.tsx', 'Pastilla', { etiqueta: 'Instagram', icono: 'logo-instagram', puesta, onPress: () => {} }, {
    tema: '../../contexts/ThemeContext',
    extra: { '../../contexts/IdiomaContext': { useT: () => (k) => k } },
  });
  const puesta = pastilla(true);
  const sin = pastilla(false);
  check('F2) Pastilla puesta: el texto va en el color del texto y el estado sigue marcado por el fondo teñido, el borde dorado, el icono dorado y el semibold',
    puesta.textos[0]?.color === claro.text && puesta.vistas[0]?.backgroundColor === glowTexto && puesta.vistas[0]?.borderColor === claro.accent
    && puesta.iconos[0]?.color === claro.accentDark && String(puesta.textos[0]?.fontWeight) === '600',
    `texto ${puesta.textos[0]?.color} · fondo ${puesta.vistas[0]?.backgroundColor} · borde ${puesta.vistas[0]?.borderColor} · icono ${puesta.iconos[0]?.color} · peso ${puesta.textos[0]?.fontWeight}`);
  check('F2) Pastilla sin poner: no cambia nada (texto, fondo de tarjeta, borde gris, icono del texto, sin semibold)',
    sin.textos[0]?.color === claro.text && sin.vistas[0]?.backgroundColor === claro.card && sin.vistas[0]?.borderColor === claro.border
    && sin.iconos[0]?.color === claro.text && sin.textos[0]?.fontWeight === undefined,
    `texto ${sin.textos[0]?.color} · fondo ${sin.vistas[0]?.backgroundColor} · borde ${sin.vistas[0]?.borderColor} · icono ${sin.iconos[0]?.color}`);
  const peor = Math.min(...PAGINA.map((p) => contraste(puesta.textos[0].color, componer(glowClaro.rgb, glowClaro.alfa, FONDOS[p]()))));
  const antes = Math.min(...PAGINA.map((p) => contraste(claro.accentDark, componer(glowClaro.rgb, glowClaro.alfa, FONDOS[p]()))));
  check('F2) y el texto de la pastilla puesta pasa AA sobre el fondo teñido que se pinta, en las dos páginas de Weë AI, donde el dorado no pasaba',
    peor >= AA_TEXTO && antes < AA_TEXTO, `lo que pinta ${f2(peor)}:1 frente a accentDark ${f2(antes)}:1`);
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nEl dorado oscuro no vuelve a ser texto en Weë AI: lo corregido sigue pasando AA y lo que queda está listado con su motivo');
process.exit(failures ? 1 : 0);
