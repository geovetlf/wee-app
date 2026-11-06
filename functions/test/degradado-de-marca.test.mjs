/*
 * TODO WEË CON EL MISMO DEGRADADO (decisión del dueño, 2026-11-06: «Sí, todo Weë con el mismo degradado en todas
 * las secciones»).
 *
 * El color de marca es UNO —`constants/marca.ts` + `components/GradienteDeMarca.tsx`, docs/COLOR-DE-MARCA.md— y
 * toda ACCIÓN PRINCIPAL de marca (botón primario, CTA, enviar de una caja, píldora o filtro elegido, saldo de
 * Credits, el +) se pinta con el degradado, no con un amarillo/naranja liso. Esta suite lee el código de
 * `components/`, `screens/` y `navigation/` y falla si aparece un relleno liso de marca que no lleve encima
 * `<RellenoDeMarca>` / `<GradienteDeMarca>` y que no esté en la lista de excepciones con su motivo.
 *
 * Cómo decide, sin ejecutar nada:
 *   1. Un «relleno de marca» es un `backgroundColor:` cuyo valor nombra el acento de marca SIN velo
 *      (`theme.colors.accent/primary…`, `MARCA.primario…`, `DORADO`, `TRAVEL.dorado`, los hex de la paleta). Los
 *      tintes (`accent + '26'`, `${accent}15`, `MARCA.velo(…)`) son fondos suaves y no cuentan.
 *   2. Cada relleno se identifica por su estilo (`archivo#nombreDelEstilo`), que no cambia al mover líneas.
 *   3. Está CUBIERTO si la lámina del degradado se monta dentro del mismo botón: desde la línea del relleno hasta la
 *      primera etiqueta que se cierra. Si el relleno vive en un StyleSheet, TODOS los botones que usan ese estilo
 *      tienen que llevarla.
 *   4. Si no está cubierto, tiene que estar en `EXCEPCIONES` con su porqué. Y una excepción que ya no existe en el
 *      código también falla: la lista no envejece.
 *
 * Los temas de chat de WeeTalk (`chatTheme.accent`), los tonos por módulo de Travel, el morado #7200FF, el verde
 * eléctrico del Perfil Weë y los colores semánticos no son marca: el detector ni siquiera los mira.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Lo que NO lleva degradado a propósito, con su motivo ── */
const PUNTO = 'indicador pequeño (punto, contador o insignia): sólido, regla 2 de docs/COLOR-DE-MARCA.md';
const PROGRESO = 'barra, onda o paso de progreso: relleno sólido de estado, no una acción (regla 2)';
const EXCEPCIONES = {
  // Indicadores pequeños: puntos de no leído, contadores, insignias, carruseles
  'components/BarraInferior.tsx#aviso': PUNTO,
  'components/HeroCarousel.tsx#dot': PUNTO,
  'components/DrawerMenu.tsx#tag': 'la etiqueta «Nuevo» junto a Crear Perfil Weë: insignia informativa, no botón (regla 2)',
  'components/avatars/AvatarPicker.tsx#editBadge': 'el lapicito sobre el avatar: insignia de 24 px pegada a la foto (regla 2)',
  'components/creator/PlanCard.tsx#stepDot': 'el número de cada paso del plan: indicador, no acción (regla 2)',
  'components/creator/RejillaDeCreaciones.tsx#statusBadge': 'insignia de estado de una creación (en curso / fallo): estado, no acción',
  'components/creator/ResultCard.tsx#variantTag': 'etiqueta de variante sobre una imagen: rótulo, no acción',
  'components/creator/ResultCard.tsx#pairTag': 'etiqueta «antes/después» sobre una imagen: rótulo, no acción',
  'screens/CreateScreen.tsx#accionInsignia': PUNTO,
  'screens/CreateScreen.tsx#destinoCheck': 'el círculo de marcado de un destino elegido: indicador de selección de 20 px (regla 2)',
  'screens/InboxScreen.tsx#dot': PUNTO,
  'screens/LandingScreen.tsx#carouselDot': PUNTO,
  'screens/NotificationsScreen.tsx#unreadDot': PUNTO,
  'screens/NotificationsScreen.tsx#unreadBadge': PUNTO,
  'screens/NotificationsScreen.tsx#filterIndicator': 'la rayita bajo el filtro activo de Notificaciones: indicador (regla 2)',
  'screens/SearchScreen.tsx#hashtagCount': PUNTO,
  'screens/WeePagesScreen.tsx#estado': 'insignia «publicada» de una WeëPage: estado, no acción',
  // Progreso, ondas y escalas
  'components/creator/ResultCard.tsx#waveBar': PROGRESO,
  'components/music/EstudioDeEjemplo.tsx#pico': 'picos de la forma de onda del estudio de ejemplo: dibujo, cada pista con su tinta',
  'components/music/EstudioDeEjemplo.tsx#barraRelleno': PROGRESO,
  'components/music/EstudioDeEjemplo.tsx#cursor': 'el cursor de reproducción de 1,5 px del estudio de ejemplo: línea, no relleno',
  'components/music/MelodiaDeReferencia.tsx#nivelRelleno': 'el medidor de nivel del micrófono: relleno de estado (regla 2)',
  'components/music/piezas.tsx#relleno': PROGRESO,
  'components/music/piezas.tsx#onda': PROGRESO,
  'components/tienda/CompraPorImporte.tsx#marca': 'las marcas de la regla de importes (US$5…100): escala, no botón; el botón Comprar sí lleva degradado',
  'components/studio/produccion/ProductionTimelinePreview.tsx#tramo': 'un tramo de la línea de tiempo de Producción: bloque de la escala temporal, no un botón',
  'screens/AiAvatarScreen.tsx#stepLineSegment': PROGRESO,
  'screens/AiAvatarScreen.tsx#stepDot': PROGRESO,
  'screens/OnboardingScreen.tsx#stepDot': PROGRESO,
  'screens/OnboardingScreen.tsx#stepLine': PROGRESO,
  'screens/LandingScreen.tsx#trendingProgressBar': PROGRESO,
  'screens/BusinessScreen.tsx#dayPost': 'casilla destacada del calendario de publicaciones de Weë Business: celda de calendario, no acción',
  // Avatares, iconos y trazos
  'components/PostCard.tsx#avatar': 'el círculo de iniciales de quien no tiene foto: avatar, no acción',
  'screens/PostDetailScreen.tsx#avatarPlaceholder': 'el círculo de iniciales de quien no tiene foto: avatar, no acción',
  'components/CreateSheet.tsx#creatorIcono': 'el icono cuadrado de Weë AI en la hoja Crear: icono de la fila; su botón «Abrir» sí lleva degradado',
  'components/HojaDeComentarios.tsx#vacioAcento': 'la rayita decorativa del estado vacío de comentarios: trazo, no relleno de botón',
  'components/creator/ui.tsx#handwrittenLine': 'el subrayado manuscrito bajo un título: trazo, no relleno de botón',
  'screens/CreateScreen.tsx#publishingIconCircle': 'el círculo del icono mientras se publica: ilustración de espera, no se puede pulsar',
  // Pantalla de emergencia
  'components/ErrorBoundary.tsx#button': 'la pantalla de error vive fuera de todos los proveedores y no depende de más módulos que react-native; se queda en sólido a propósito',
};

/* ── El detector ── */
const CARPETAS = ['components', 'screens', 'navigation'];
const FUERA = new Set(['components/GradienteDeMarca.tsx']);
const archivos = [];
for (const carpeta of CARPETAS) {
  const base = path.resolve(RAIZ, carpeta);
  if (!fs.existsSync(base)) continue;
  for (const f of fs.readdirSync(base, { recursive: true }).map(String)) {
    if (!/\.(tsx|ts)$/.test(f)) continue;
    const rel = `${carpeta}/${f.replace(/\\/g, '/')}`;
    if (!FUERA.has(rel)) archivos.push(rel);
  }
}

const HEX = '#(?:F5B731|FFC928|FFD12A|FFA51F|FFB817|FF850D|F47700|FFB51B|E5A020|FFC94D|FF910F)';
const TOKEN = new RegExp(
  String.raw`(?:\bcolors\.(?:accent|primary|accentLight|primaryLight|accentDark|primaryDark)\b|\bMARCA\.(?:primario|primarioClaro|primarioOscuro|activo)\b|\bDORADO\b|\bTRAVEL\.dorado\b|'${HEX}'|"${HEX}")`,
  'gi',
);
/** ¿El token es un velo? `accent + '26'`, `${accent}15`. */
const esVelo = (expr, fin) => /^\s*\+\s*['"`]/.test(expr.slice(fin)) || /^\}[0-9A-Fa-f]{2}/.test(expr.slice(fin));
const LAMINA = /<(?:RellenoDeMarca|GradienteDeMarca)\b/;

/** El nombre del estilo al que pertenece el relleno de la línea i, y si es una entrada de StyleSheet. */
const nombreDelEstilo = (lineas, i) => {
  for (let k = i; k >= Math.max(0, i - 20); k--) {
    const l = lineas[k];
    if (k < i && /^\s*\}/.test(l)) break;
    const usos = [...l.slice(0, k === i ? l.indexOf('backgroundColor') : undefined).matchAll(/\b(?:styles|[a-z])\.([A-Za-z_]\w*)/g)];
    if (usos.length) return { nombre: usos[usos.length - 1][1], entrada: false };
    const entrada = l.match(/^\s*([A-Za-z_]\w*):\s*\{/);
    if (entrada) return { nombre: entrada[1], entrada: true };
  }
  return { nombre: null, entrada: false };
};

const encontrados = [];
for (const rel of archivos) {
  const fuente = leer(rel);
  if (!/backgroundColor/.test(fuente)) continue;
  const lineas = fuente.split(/\r?\n/);
  /*
   * La lámina va como PRIMER hijo del botón: se busca desde la línea del relleno hacia abajo y solo hasta la
   * primera etiqueta que se cierra (`</…>`), para que la lámina del botón de al lado no cubra a este.
   */
  const cubiertaJunto = (i) => {
    for (let k = Math.max(0, i - 1); k <= Math.min(lineas.length - 1, i + 60); k++) {
      if (LAMINA.test(lineas[k])) return true;
      if (k > i && /<\/[A-Za-z.]+>/.test(lineas[k])) return false;
    }
    return false;
  };
  lineas.forEach((linea, i) => {
    const t = linea.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
    for (const m of linea.matchAll(/backgroundColor:\s*([^,}\n]+(?:\}[0-9A-Fa-f]{2}[^,}\n]*)?)/g)) {
      const expr = m[1];
      const marca = [...expr.matchAll(TOKEN)].some((tk) => !esVelo(expr, tk.index + tk[0].length));
      if (!marca) continue;
      const { nombre, entrada } = nombreDelEstilo(lineas, i);
      const clave = `${rel}#${nombre ?? `L${i + 1}`}`;
      /* Un estilo de StyleSheet está cubierto si TODOS los sitios que lo usan como estilo llevan la lámina. */
      const usos = entrada
        ? lineas.map((l, k) => (new RegExp(String.raw`\.${nombre}\b(?!\.)`).test(l) ? k : -1)).filter((k) => k >= 0)
        : [];
      const cubierto = entrada ? usos.length > 0 && usos.every(cubiertaJunto) : cubiertaJunto(i);
      encontrados.push({ clave, linea: i + 1, cubierto, expr: expr.trim() });
    }
  });
}

/* ── 1. Ningún relleno liso de marca sin degradado ni excepción ── */
const sinCubrir = encontrados.filter((e) => !e.cubierto && !EXCEPCIONES[e.clave]);
if (process.env.DEGRADADO_LISTAR) for (const e of encontrados.filter((x) => !x.cubierto)) console.log(`   ${e.clave} (L${e.linea}): ${e.expr}`);
check(
  `ningún relleno liso de marca sin degradado (${encontrados.length} rellenos de marca, ${encontrados.filter((e) => e.cubierto).length} con degradado, ${Object.keys(EXCEPCIONES).length} excepciones)`,
  sinCubrir.length === 0,
  sinCubrir.map((e) => `${e.clave} L${e.linea}`).join(' · '),
);

/* ── 2. Las excepciones existen y tienen motivo ── */
const claves = new Set(encontrados.map((e) => e.clave));
const huerfanas = Object.keys(EXCEPCIONES).filter((k) => !claves.has(k));
check('cada excepción sigue existiendo en el código', huerfanas.length === 0, huerfanas.join(' · '));
check('cada excepción dice por qué', Object.values(EXCEPCIONES).every((m) => typeof m === 'string' && m.length >= 12));
const cubiertasYExcepcion = encontrados.filter((e) => e.cubierto && EXCEPCIONES[e.clave]).map((e) => e.clave);
check('ninguna excepción tiene ya degradado (sobraría)', cubiertasYExcepcion.length === 0, [...new Set(cubiertasYExcepcion)].join(' · '));

/* ── 3. Las piezas que no pasan por `backgroundColor:` literal y que el dueño nombró ── */
const soloCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/.*$/gm, '');
const boton = soloCodigo(leer('components/travel/Piezas.tsx'));
const bloqueBoton = boton.slice(boton.indexOf('export const Boton'), boton.indexOf('export const Chip'));
check('Travel · el Boton «dorado» (lo que es de Weë) lleva el degradado de marca',
  /<RellenoDeMarca\b[^>]*apagada=\{variante !== 'dorado'\}/.test(bloqueBoton));
check('Travel · los demás Boton siguen con el tono de su módulo (morado = tono.fuerte)',
  /morado:\s*tono\.fuerte/.test(bloqueBoton) && /suave:\s*tono\.suave/.test(bloqueBoton));
const tema = leer('components/travel/tema.ts');
check('Travel · los seis tonos por módulo y el morado #7200FF no cambian',
  ["morado: '#7200FF'", "planear: { fuerte: '#2F5BEA'", "viajes: { fuerte: '#0E8F86'", "explorar: { fuerte: '#1F8F4E'", "asistente: { fuerte: '#B21FC9'", "comunidad: { fuerte: '#D9480F'"].every((x) => tema.includes(x)));
const portada = soloCodigo(leer('components/sectores/PortadaTravel.tsx'));
check('Travel · el CTA «Plan with AI» de la portada lleva el degradado',
  /style=\{h\.cta\}[^>]*>\s*<RellenoDeMarca\b/.test(portada));
check('Travel · «Preguntar a Weë Brain» del marco de cada módulo lleva el degradado',
  /style=\{m\.brain\}[^>]*>\s*<RellenoDeMarca\b/.test(soloCodigo(leer('components/travel/MarcoDeTravel.tsx'))));
const caja = soloCodigo(leer('components/creator/CajaDePrompt.tsx'));
check('Cajas de Weë AI · el enviar por defecto usa el degradado de marca, no uno propio (#FFD766)',
  !/#FFD766/i.test(caja) && (caja.match(/<RellenoDeMarca\b/g) || []).length >= 3);
check('Cajas de Weë AI · el avión de enviar sobre el degradado va oscuro (sobrePrimario), no blanco',
  /name="send"[^>]*color=\{puedeEnviar \? MARCA\.sobrePrimario/.test(caja));

process.exit(failures ? 1 : 0);
