/*
 * LOS NOMBRES DE WEË NO SE TRADUCEN. EN NINGÚN IDIOMA. NUNCA.
 *
 * Regla del usuario (2026-09-16), y ya estaba escrita en CLAUDE.md §8: Weë,
 * Wäll, Weëls, WeeTalk, ËContact, Credits y los nombres de las experiencias son
 * MARCA. Se escriben igual en español que en japonés: no se traducen, no se
 * adaptan, no se pluralizan, no se transliteran, no cambian de mayúsculas y no
 * pierden ni un diacrítico. Lo que se traduce es el texto que los rodea.
 *
 * ── Por qué esto es una prueba y no un párrafo ───────────────────────────────
 *
 * Porque un párrafo hay que leerlo y una prueba se ejecuta sola. Quedan siete
 * idiomas por traducir —it, pt, ru, ko, zh, ja, ar— y cada uno lo escribirá
 * alguien distinto en un momento distinto. Esto los vigila a todos sin que
 * nadie tenga que acordarse: el día que aparezca `i18n/textos/it/`, esta prueba
 * ya lo está mirando.
 *
 * ── Qué comprueba, y por qué en dos direcciones ──────────────────────────────
 *
 * A · QUE NO SE PIERDA. Si el español dice "Credits" en una clave, la
 *     traducción de esa clave tiene que decir "Credits". Coge los casos en los
 *     que alguien tradujo el nombre.
 *
 * B · QUE NO APAREZCA DEFORMADO. Busca las deformaciones típicas —"Crédits",
 *     "Kredite", "Wee" sin diéresis, "Wee Talk" separado— aunque el español no
 *     tuviera el nombre en esa clave. Coge los casos en los que alguien escribió
 *     la marca de memoria y le salió mal.
 *
 * La A sola no basta: una clave nueva que estrene "Crédits" pasaría limpia.
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

/*
 * LA LISTA OFICIAL, SACADA DEL PROYECTO Y NO ESCRITA A MANO AQUÍ.
 *
 * Sale de CLAUDE.md §8 (la regla) y de `constants/weeExperiences.ts` (los
 * nombres de las once experiencias). Así no hay dos listas que puedan
 * discrepar: si mañana nace "Weë Garden", entra sola en cuanto se declare.
 */
const deClaudeMd = (leer('CLAUDE.md').match(/los nombres de Weë \(([^)]*)\)/) || [, ''])[1]
  .split(',').map((s) => s.trim()).filter(Boolean);
const deExperiencias = [...new Set([...leer('constants/weeExperiences.ts').matchAll(/'(Weë [A-Za-z]+)'/g)].map((m) => m[1]))];
const OFICIALES = [...new Set([...deClaudeMd, ...deExperiencias])].sort((a, b) => b.length - a.length);

console.log('\n── La lista oficial ──');
check('1) se lee del proyecto, no de esta prueba', deClaudeMd.length >= 14 && deExperiencias.length >= 10,
  `CLAUDE.md: ${deClaudeMd.length} · weeExperiences: ${deExperiencias.length}`);
console.log('   ' + OFICIALES.join(' · '));

/* ── Lectura de los diccionarios ──────────────────────────────────────────── */
const RE = new RegExp("^  ([A-Za-z][A-Za-z0-9_]*):\\s*'((?:[^'\\\\]|\\\\.)*)',$", 'gm');
const idiomas = fs.readdirSync(TEXTOS).filter((d) => fs.statSync(path.join(TEXTOS, d)).isDirectory()).sort();
const modulos = fs.readdirSync(path.join(TEXTOS, 'es')).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
const claves = (idioma, modulo) => {
  const p = path.join(TEXTOS, idioma, modulo);
  if (!fs.existsSync(p)) return null;
  const o = {};
  for (const m of fs.readFileSync(p, 'utf8').matchAll(RE)) o[m[1]] = m[2];
  return o;
};

console.log('\n── A · Ningún nombre se pierde por el camino ──');
for (const idioma of idiomas.filter((l) => l !== 'es')) {
  const perdidos = [];
  for (const modulo of modulos) {
    const base = claves('es', modulo), otro = claves(idioma, modulo);
    if (!otro) continue;
    for (const [k, v] of Object.entries(base)) {
      if (!(k in otro)) continue;
      for (const nombre of OFICIALES) {
        /* "Weë" suelto se puede reformular ("con Weë" → "with it"); un nombre compuesto no. */
        if (nombre === 'Weë' || nombre === 'Credits') continue;
        if (v.includes(nombre) && !otro[k].includes(nombre)) perdidos.push(`${modulo.replace('.ts', '')}.${k} → falta "${nombre}"`);
      }
      /* Credits sí es duro: es la moneda, y traducirla cambia el producto. */
      if (v.includes('Credits') && !otro[k].includes('Credits')) perdidos.push(`${modulo.replace('.ts', '')}.${k} → falta "Credits"`);
    }
  }
  check(`2) ${idioma} conserva los nombres compuestos y Credits`, perdidos.length === 0,
    perdidos.length ? perdidos.slice(0, 6).join(' | ') : 'sin pérdidas');
}

console.log('\n── B · Ningún nombre aparece deformado ──');
/*
 * Las deformaciones que de verdad se escriben. No es una lista de ocurrencias:
 * cada una salió de traducir un nombre a un idioma concreto.
 */
const DEFORMES = [
  [/Cr[ée]dits?\b(?<!Credits)/u, 'Credits traducido (Crédit/Créditos/Credito…)'],
  [/\bKredite?\b/iu, 'Credits en alemán'],
  [/\bGuthaben-Credits\b/iu, 'Credits mezclado'],
  [/\bWee\b(?! ?Talk)/u, 'Weë sin diéresis'],
  [/\bWee Talk\b/u, 'WeeTalk separado'],
  [/\bWeeTalks\b/u, 'WeeTalk pluralizado'],
  [/\bWall\b/u, 'Wäll sin diéresis'],
  [/\bWeels\b/u, 'Weëls sin diéresis'],
  [/\b[EÉ]Contact\b/u, 'ËContact con la E equivocada'],
  [/Weë (Cerveau|Gehirn|Cervello|Cérebro|Мозг|Brein)/u, 'Weë Brain traducido'],
  [/(Studio|Atelier|Estudio) Weë/u, 'Weë Studio reordenado'],
  [/Weë (Voyage|Reise|Viaggio|Viagem)/u, 'Weë Travel traducido'],
  [/Weë (Musique|Musik|Musica|Música)/u, 'Weë Music traducido'],
  [/Weë (Cuisinier|Koch|Cuoco|Cozinheiro)/u, 'Weë Chef traducido'],
  [/Weë (Affaires|Geschäft|Negócios|Negocios)/u, 'Weë Business traducido'],
  /*
   * RUSO. Aquí la tentación no es traducir: es TRANSLITERAR al cirílico, o
   * declinar la marca como si fuera una palabra rusa («нет Кредитов»). Las dos
   * cosas la rompen igual.
   *
   * Ojo con `\b` y con `\w`: los dos son ASCII, y para ellos ni la «К» ni la
   * «ю» son letras. `\bКредиты\b` no casaría NUNCA, y `Студи\w*` se quedaría
   * sin llegar a la «ю» de «Студию». Las dos versiones dirían «limpio» sin
   * haber mirado nada. Por eso aquí se usa `\p{L}`, que sí sabe de letras.
   */
  [/(?<![\p{L}\p{N}])Кредит(?:ы|ов|а|у|ам|ами|ах|е)?(?![\p{L}\p{N}])/u, 'Credits en ruso'],
  [/Weë (?:Студи|Дизайн|Музык|Повар|Бизнес|Путешестви|Писател|Красот)\p{L}*/u, 'experiencia de Weë traducida al ruso'],
  [/(?:Студи|Мозг|Дизайн)\p{L}* Weë/u, 'nombre de Weë reordenado en ruso'],
  /*
   * ËContact y ẄContact son DOS nombres, no dos grafías del mismo. La Ë (U+00CB)
   * es la agenda; la Ẅ (U+1E84) es la del Perfil Weë. Confundirlas no rompe
   * ninguna cadena ni ningún tipo, y por eso hace falta buscarlas: cualquier
   * otra letra delante de «Contact» está mal, y eso incluye la W a secas, la E
   * a secas, y las dos oficiales cambiadas de sitio o de caja.
   */
  [/(?<![\p{L}])(?![ËẄ])[A-Za-zÀ-ÿ]Contact\b/u, 'ËContact o ẄContact con la letra equivocada'],
  [/(?<![\p{L}])[ëẅ]Contact\b/u, 'ËContact o ẄContact en minúscula'],
  [/(?<![\p{L}])[ËẄ]contact\b/u, 'ËContact o ẄContact con la C en minúscula'],
  /*
   * COREANO. Otra vez transliteración: «크레딧» es como se escribiría «credits»
   * en hangul, y es justo lo que no puede pasar. No hacen falta fronteras: son
   * cadenas largas y distintivas que no aparecen dentro de otra palabra.
   */
  [/크레딧|크레디트/u, 'Credits en coreano'],
  [/Weë ?(?:브레인|스튜디오|디자인|뮤직|음악|셰프|요리사|비즈니스|여행|작가|뷰티)/u, 'experiencia de Weë traducida al coreano'],
  [/(?:브레인|스튜디오|디자인) Weë/u, 'nombre de Weë reordenado en coreano'],
  /*
   * JAPONÉS. La tentación es la misma que en coreano, y en japonés es todavía
   * más natural: todo nombre extranjero se escribe en katakana, así que «Weë»
   * saldría solo como ウィー y «Credits» como クレジット. Aquí la marca va en
   * latino, tal cual, y el katakana se queda para las palabras comunes.
   *
   * Las excepciones no son de cortesía: son palabras japonesas corrientes que
   * EMPIEZAN igual y que la interfaz sí usa. ウェーブ es el pelo ondulado de
   * Weë Beauty (`hairWavy`); クレジットカード, la tarjeta de crédito; ウィーク
   * y ウィーン, la semana y Viena. Sin ellas, esta guarda acusaría a traducciones
   * perfectas.
   */
  [/クレジット(?!カード)/u, 'Credits en katakana'],
  [/ウィー(?![クン])|ウイー|ウェー(?![ブル])/u, 'Weë (o Weëls, WeeTalk…) en katakana'],
  [/(?<!ファイア)ウォール(?!ペーパー)/u, 'Wäll en katakana'],
  [/Weë ?(?:スタジオ|ブレイン|デザイン|ミュージック|音楽|シェフ|料理人|ビジネス|トラベル|旅行|ライター|作家|ビューティー|美容|フォト|写真|ホーム)/u, 'experiencia de Weë traducida al japonés'],
  [/(?:スタジオ|ブレイン|デザイン|ミュージック) ?Weë/u, 'nombre de Weë reordenado en japonés'],
  /*
   * TURCO. Tres tentaciones. Traducir la moneda —«Kredi», «Krediniz»—, que es
   * la palabra común; «kredi kartı», la tarjeta, sí es turco corriente. Traducir
   * la experiencia —«Weë Stüdyo», «Weë Müzik»—, que en turco se escribe casi
   * igual y por eso cuela. Y pegarle una terminación a la marca sin apóstrofo:
   * el turco la escribe «Weë'de», con el apóstrofo que separa el nombre propio
   * de su sufijo; «Weëde» ya no es la marca.
   */
  [/(?<![\p{L}])[Kk]redi(?:ler\p{L}*|niz|n|ni|ye|den|de)?(?![\p{L}])(?! kart)/u, 'Credits en turco'],
  [/Weë (?:Stüdyo|Tasarım|Fotoğraf|Yazar|Müzik|Güzellik|Şef|Ev|İş|Seyahat|Gezi|Beyin|Zihin)(?![\p{L}])/u, 'experiencia de Weë traducida al turco'],
  [/(?:Weë|WeeTalk|Weëls|Wäll|ËContact|ẄContact|Credits)(?:de|da|te|ta|den|dan|ten|tan|ye|ya|yi|yı|nin|nın|in|ın|un|ün|yle|yla)(?![\p{L}])/u, 'marca con un sufijo turco pegado sin apóstrofo'],
  /*
   * SUECO. Traducir la moneda —«krediter»— o la experiencia —«Weë Musik»,
   * «Weë Resor»—; y declinar la marca como un nombre sueco: la forma definida
   * («WeeTalken», «Creditsen») o un genitivo pegado («Weës»). La marca va con
   * preposición («på Weë») o en un compuesto con guion («Weë-konto»).
   * «kreditkort», la tarjeta, sí es sueco corriente.
   */
  [/(?<![\p{L}])[Kk]redit(?:er|erna|en)(?![\p{L}])/u, 'Credits en sueco'],
  [/Weë (?:Musik|Resa|Resor|Kock|Företag|Hjärna|Skribent|Skönhet|Hem)(?![\p{L}])/u, 'experiencia de Weë traducida al sueco'],
  [/(?:WeeTalk|Credits|Wäll|ËContact|ẄContact)(?:en|et|s|ens|ets)(?![\p{L}])|(?<![\p{L}])Weës(?![\p{L}])/u, 'marca declinada en sueco'],
  /*
   * HINDI. Las marcas van en latino dentro de la frase: la tentación es
   * transliterarlas en devanagari —«क्रेडिट्स», «वीटॉक», «वील्स», «वी»— o
   * traducir la experiencia —«Weë संगीत», «Weë यात्रा»—. «क्रेडिट कार्ड», la
   * tarjeta, sí es hindi corriente, y «Weë प्रोफ़ाइल» es la marca seguida de un
   * sustantivo (como «Google खाता»), no una experiencia traducida. En devanagari
   * una matra es parte de la palabra: por eso las fronteras miran `\p{M}`.
   */
  [/क्रेडिट(?! कार्ड)/u, 'Credits en devanagari'],
  [/(?<![\p{L}\p{M}])(?:वी|वीई|वीटॉक|वी टॉक|वील|वील्स|वॉल|ईकॉन्टैक्ट|ईकॉन्टेक्ट|डब्ल्यूकॉन्टैक्ट)(?![\p{L}\p{M}])/u, 'marca de Weë en devanagari'],
  [/Weë (?:संगीत|म्यूज़िक|यात्रा|ट्रैवल|शेफ़|रसोइया|व्यापार|व्यवसाय|बिज़नेस|फ़ोटो|लेखक|राइटर|सौंदर्य|ब्यूटी|घर|होम|दिमाग|ब्रेन|स्टूडियो|डिज़ाइन)(?![\p{L}\p{M}])/u, 'experiencia de Weë traducida al hindi'],
];
for (const idioma of idiomas) {
  const hallados = [];
  for (const modulo of modulos) {
    const o = claves(idioma, modulo);
    if (!o) continue;
    for (const [k, v] of Object.entries(o)) {
      for (const [re, motivo] of DEFORMES) if (re.test(v)) hallados.push(`${modulo.replace('.ts', '')}.${k}: ${motivo} → «${v.slice(0, 48)}»`);
    }
  }
  check(`3) ${idioma} no deforma ningún nombre`, hallados.length === 0,
    hallados.length ? hallados.slice(0, 5).join(' | ') : 'limpio');
}

console.log('\n── CONTROL · Que esta prueba sepa fallar ──');
/*
 * Un auditor que nunca ha encontrado nada no demuestra que esté limpio: puede
 * que no sepa mirar. Se le enseñan las deformaciones de verdad, una por idioma
 * futuro, y TIENE que reconocerlas todas.
 */
const TRAMPAS = [
  ['Tu as 12 Crédits', 'francés'],
  ['Du hast 12 Kredite', 'alemán'],
  ['Apri Studio Weë', 'italiano'],
  ['Abra o Weë Cérebro', 'portugués'],
  ['Открой Weë Мозг', 'ruso'],
  ['У вас 12 Кредитов', 'ruso · marca declinada'],
  ['Откройте Студию Weë', 'ruso · marca reordenada'],
  ['크레딧 12개가 남았어요', 'coreano · moneda transliterada'],
  ['Weë 브레인 열기', 'coreano · experiencia transliterada'],
  ['Abre tu WContact', 'Ẅ perdida'],
  ['Abre tu EContact', 'Ë perdida'],
  ['Abre tu ëContact', 'Ë en minúscula'],
  ['Abre tu Ẅcontact', 'C en minúscula'],
  ['Wee Talk で話す', 'japonés'],
  ['クレジットが 12 残っています', 'japonés · moneda en katakana'],
  ['ウィーへようこそ', 'japonés · Weë en katakana'],
  ['ウィールズを見る', 'japonés · Weëls en katakana'],
  ['ウィートークで話す', 'japonés · WeeTalk en katakana'],
  ['ウォールに投稿', 'japonés · Wäll en katakana'],
  ['Weë スタジオを開く', 'japonés · experiencia en katakana'],
  ['Weë 旅行で計画する', 'japonés · experiencia traducida'],
  ['查看 Weels', 'chino'],
  ['EContact 열기', 'coreano'],
  ['Bienvenue sur Wee', 'sin diéresis'],
  ['12 Krediniz kaldı', 'turco · moneda traducida'],
  ['Weë Stüdyo ile oluştur', 'turco · experiencia traducida'],
  ['Weëde paylaş', 'turco · sufijo sin apóstrofo'],
  ['WeeTalkta yaz', 'turco · sufijo sin apóstrofo'],
  ['Du har 12 krediter kvar', 'sueco · moneda traducida'],
  ['Öppna Weë Musik', 'sueco · experiencia traducida'],
  ['Skriv i WeeTalken', 'sueco · marca en forma definida'],
  ['Läs Weës villkor', 'sueco · genitivo pegado a la marca'],
  ['आपके पास 12 क्रेडिट्स बचे हैं', 'hindi · moneda transliterada'],
  ['वीटॉक में लिखें', 'hindi · WeeTalk transliterado'],
  ['वील्स देखें', 'hindi · Weëls transliterado'],
  ['वी में आपका स्वागत है', 'hindi · Weë transliterado'],
  ['Weë संगीत खोलें', 'hindi · experiencia traducida'],
  ['Weë यात्रा से प्लान बनाएँ', 'hindi · experiencia traducida'],
];
const pillada = (texto) => DEFORMES.some(([re]) => re.test(texto));
const escapadas = TRAMPAS.filter(([t]) => !pillada(t));
check(`6) control: reconoce las ${TRAMPAS.length} deformaciones típicas`, escapadas.length === 0,
  escapadas.length ? escapadas.map(([t, l]) => `${l}: «${t}»`).join(' | ') : `las ${TRAMPAS.length}`);
/* Y al revés: que no marque como deforme lo que está bien escrito. */
const BUENAS = ['Tu as 12 Credits', 'Öffne Weë Studio', 'ËContact', 'Weëls', 'Wäll', 'WeeTalk', 'Weë Brain',
  'У вас 12 Credits', 'Откройте Weë Studio', 'Weë Brain отвечает', 'фотостудия и свет',
  'Credits 12개가 남았어요', 'Weë Brain 열기', 'Weë Studio에서 만들기', '사진 스튜디오 조명',
  /* Japonés: las marcas en latino, y las palabras corrientes que empiezan igual. */
  '残り 12 Credits', 'Weë へようこそ', 'Weë Studio で作成', 'Wäll に投稿', 'Weëls を見る', 'WeeTalk で話す',
  'クレジットカードで支払う', 'ウェーブヘア', '今週の予定', '写真スタジオの照明',
  /* Los dos nombres bien escritos, y uno que solo ACABA en «contact» sin serlo. */
  'Abre tu ËContact', 'Abre tu ẄContact', '打开你的 ËContact', '你的 ẄContact 通訊錄',
  /* Turco: la marca con su apóstrofo, y las palabras corrientes que se le parecen. */
  '12 Credits kaldı', "Weë'de paylaş", "WeeTalk'ta yaz", 'Kredi kartıyla öde', 'Weë Studio ile oluştur', 'fotoğraf stüdyosu',
  /* Sueco: la marca con preposición o en un compuesto con guion, y la tarjeta de crédito. */
  'Du har 12 Credits kvar', 'Öppna Weë Music', 'Skriv i WeeTalk', 'Villkor för Weë', 'ditt Weë-konto', 'Betala med kreditkort',
  /* Hindi: la marca en latino con su posposición, y las palabras corrientes que empiezan igual. */
  'आपके पास 12 Credits बचे हैं', 'WeeTalk में लिखें', 'Weëls देखें', 'Weë में आपका स्वागत है', 'Weë Music खोलें',
  'आपकी Weë प्रोफ़ाइल', 'क्रेडिट कार्ड से भुगतान करें', 'वीडियो देखें', 'वॉलपेपर बदलें'];
const falsosPositivos = BUENAS.filter((t) => pillada(t));
check('7) control: y no molesta con los nombres bien escritos', falsosPositivos.length === 0,
  falsosPositivos.join(' | ') || 'ninguno');

console.log('\n── C · La regla queda escrita donde se lee ──');
check('4) CLAUDE.md §8 sigue nombrando las marcas que no se traducen',
  /los nombres de Weë \(Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits/.test(leer('CLAUDE.md')));
check('5) y cada diccionario lo recuerda en su cabecera',
  idiomas.every((l) => /no entra nunca en estos archivos/i.test(leer(`i18n/textos/${l}/index.ts`))),
  idiomas.join(', '));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
