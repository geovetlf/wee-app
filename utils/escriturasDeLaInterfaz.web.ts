import { Asset } from 'expo-asset';

/**
 * LAS ESCRITURAS QUE INTER NO TIENE, Y EL SENTIDO DE LA PÁGINA. Solo web.
 *
 * Inter es la identidad de Weë y cubre latino, griego, cirílico y vietnamita. Medido sobre los diccionarios reales, le
 * faltan el árabe, el hebreo, el jemer y el devanagari; ahí el navegador elegía una fuente al azar, con negrita falsa.
 *
 * El truco es de CSS y no toca ningún componente: se declaran más caras con el MISMO nombre de familia que ya pide cada
 * `Text` (`Inter_600SemiBold`…) y un `unicode-range`. Un texto latino sigue en Inter tal cual, y el archivo de una escritura
 * solo se descarga si aparece un carácter suyo: nadie paga por un idioma que no usa.
 *
 * Vazirmatn para el árabe y el persa, porque su «۰» mide 2,2 veces el punto (Noto Sans Arabic, 1,3 veces, y se confunde
 * con él) y sus métricas son más cercanas a Inter. CJK va con la fuente del sistema: un archivo por peso pesaría varios MB.
 * Licencias OFL 1.1 junto a los archivos, en `assets/fonts/multiescritura/`. Criterio en `docs/I18N-RTL-Y-ESCRITURAS.md`.
 *
 * En nativo no hace falta nada de esto: el sistema resuelve el carácter que la fuente no tiene (`.ts` hermano, vacío).
 */
const CARAS = {
  arabe: {
    rango: 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200D,U+FB50-FDFF,U+FE70-FEFF',
    Inter_400Regular: require('../assets/fonts/multiescritura/Vazirmatn_400Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/multiescritura/Vazirmatn_500Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/multiescritura/Vazirmatn_600SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/multiescritura/Vazirmatn_700Bold.ttf'),
  },
  hebreo: {
    rango: 'U+0590-05FF,U+FB1D-FB4F',
    Inter_400Regular: require('../assets/fonts/multiescritura/NotoSansHebrew_400Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/multiescritura/NotoSansHebrew_500Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/multiescritura/NotoSansHebrew_600SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/multiescritura/NotoSansHebrew_700Bold.ttf'),
  },
  jemer: {
    rango: 'U+1780-17FF,U+19E0-19FF',
    Inter_400Regular: require('../assets/fonts/multiescritura/NotoSansKhmer_400Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/multiescritura/NotoSansKhmer_500Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/multiescritura/NotoSansKhmer_600SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/multiescritura/NotoSansKhmer_700Bold.ttf'),
  },
  devanagari: {
    rango: 'U+0900-097F,U+A8E0-A8FF',
    Inter_400Regular: require('../assets/fonts/multiescritura/NotoSansDevanagari_400Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/multiescritura/NotoSansDevanagari_500Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/multiescritura/NotoSansDevanagari_600SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/multiescritura/NotoSansDevanagari_700Bold.ttf'),
  },
};

const PESOS = ['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold'] as const;

/*
 * React Native Web pone `dir="auto"` en cada `Text` raíz, y el navegador decide el sentido por la PRIMERA letra fuerte. En
 * una interfaz persa, «Credits در دسترس» empieza por latín: toma base LTR, se desordena y se alinea a la izquierda. Una
 * marca sola («Weëls») tampoco se alinea con su columna. Por eso, con la página en RTL, el texto de INTERFAZ recibe el
 * sentido de la página. Las marcas siguen siendo un tramo LTR intacto dentro de él: el algoritmo bidi no cambia sus letras.
 *
 * Lo que escribe una persona conserva `dir="auto"` (`TEXTO_DE_PERSONA`): un comentario en inglés dentro de Weë en árabe
 * sigue siendo LTR. Los campos, igual: se orientan por lo que se escribe, y solo el texto de ayuda sigue a la página.
 *
 * `font-synthesis: none`: esas caras ya traen su peso real, y sin esto el navegador las engordaba otra vez. Se limita a
 * los idiomas que usan estas caras: Inter en LTR se queda exactamente como estaba.
 */
const REGLAS = `
html[dir="rtl"] div[dir="auto"]:not([data-contenido]),
html[dir="rtl"] span[dir="auto"]:not([data-contenido]) { direction: rtl; }
html[dir="rtl"] input[dir="auto"]:placeholder-shown,
html[dir="rtl"] textarea[dir="auto"]:placeholder-shown { direction: rtl; }
html[dir="rtl"], html:lang(km), html:lang(hi) { font-synthesis: none; }
`;

const caras = (): string =>
  Object.values(CARAS)
    .flatMap((escritura) =>
      PESOS.map(
        (familia) =>
          `@font-face{font-family:'${familia}';src:url('${Asset.fromModule(escritura[familia]).uri}') format('truetype');unicode-range:${escritura.rango};font-display:swap;}`,
      ),
    )
    .join('\n');

if (typeof document !== 'undefined' && !document.getElementById('wee-escrituras')) {
  const estilo = document.createElement('style');
  estilo.id = 'wee-escrituras';
  estilo.textContent = `${caras()}\n${REGLAS}`;
  document.head.appendChild(estilo);
}

export {};
