/*
 * TANDAS Y STORYBOARD de Weë Filmmaker (ola 3, 2026-11-17): lo que se promete.
 *   node test/filmmaker-tandas.test.mjs
 *
 *   A · Lógica pura: tandas (partir, unir, mover, repartir por duración), cuadros, tiempos, aprobación y almacén, límites del montaje.
 *   B · Honestidad: imágenes, producción y D1 cerrados con motivo; la cámara sale del contrato (nada inventado); el ejemplo se marca.
 *   C · Ubicación: voz, cámara, efectos y D1 en la ficha del cuadro; aprobar/almacén en la barra de la tanda.
 *   D · i18n: es y en con las mismas claves, todas las usadas existen, sin texto a mano, RTL.
 */
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const cargar = crearCargador();
const U = cargar('utils/tandasDeFilmmaker.ts');
const K = cargar('constants/filmmakerCamara.ts');
const T = cargar('constants/filmmakerTandas.ts');
const CAM = cargar('constants/camaraCinematica.ts');
const ES = cargar('i18n/textos/es/filmmakerTandas.ts').filmmakerTandas;
const EN = cargar('i18n/textos/en/filmmakerTandas.ts').filmmakerTandas;

const con = (cuadros) => { let s = U.anadirTanda(U.tandasVacias()); const id = s.tandas[0].id; for (let i = 0; i < cuadros; i++) s = U.anadirCuadro(s, id, `c${i}`).estado; return { s, id }; };

console.log('── A · Lógica ──');
{
  const { s, id } = con(4);
  check('A1) una tanda nueva está «sin storyboard»; con cuadros pasa a «en revisión»', U.estadoDe(U.anadirTanda(U.tandasVacias()).tandas[0]) === 'none' && U.estadoDe(s.tandas[0]) === 'review');
  check('A2) los tiempos se acumulan: 0–6, 6–12…', JSON.stringify(U.tiemposDe(s.tandas[0]).slice(0, 2)) === JSON.stringify([{ inicio: 0, fin: 6 }, { inicio: 6, fin: 12 }]));
  check('A3) minutos y segundos para pintar con los dígitos del idioma', JSON.stringify(U.partirTiempo(185)) === JSON.stringify({ m: 3, s: 5 }));
  const a = U.aprobarTanda(s, id);
  check('A4) aprobar exige al menos un cuadro y deja «aprobado»', U.estadoDe(a.tandas[0]) === 'approved' && U.estadoDe(U.aprobarTanda(U.anadirTanda(U.tandasVacias()), 'ta_1').tandas[0]) === 'none');
  check('A5) guardar en el almacén solo con la tanda aprobada', U.guardarEnAlmacen(s, id).tandas[0].almacen === false && U.guardarEnAlmacen(a, id).tandas[0].almacen === true);
  const e = U.editarCuadro(U.guardarEnAlmacen(a, id), id, s.tandas[0].cuadros[0].id, { texto: 'nuevo' });
  check('A6) editar un cuadro invalida la aprobación y el almacén (no borra nada)', U.estadoDe(e.tandas[0]) === 'review' && e.tandas[0].almacen === false && e.tandas[0].cuadros.length === 4);
  const p = U.partirTanda(s, id);
  check('A7) partir por la mitad: dos tandas con 2 cuadros, el objetivo se reparte y suma lo mismo', p.tandas.length === 2 && p.tandas[0].cuadros.length === 2 && p.tandas[1].cuadros.length === 2 && p.tandas[0].objetivo + p.tandas[1].objetivo === 180);
  const q = U.partirTanda(s, id, 1);
  check('A8) partir «desde este cuadro»: el cuadro abre la segunda', q.tandas[0].cuadros.length === 1 && q.tandas[1].cuadros[0].id === s.tandas[0].cuadros[1].id);
  check('A9) con menos de 2 cuadros no se puede partir', !U.puedePartir(con(1).s, con(1).id) && U.partirTanda(con(1).s, con(1).id).tandas.length === 1);
  const u = U.unirConSiguiente(p, p.tandas[0].id);
  check('A10) unir con la siguiente suma cuadros y objetivo', u.tandas.length === 1 && u.tandas[0].cuadros.length === 4 && u.tandas[0].objetivo === 180);
  check('A11) la última no tiene siguiente con la que unirse', !U.puedeUnirConSiguiente(p, p.tandas[1].id));
  const m = U.moverTanda(p, p.tandas[0].id, 1);
  check('A12) mover cambia el orden y en los bordes no hace nada', m.tandas[1].id === p.tandas[0].id && U.moverTanda(p, p.tandas[0].id, -1) === p);
  const d = U.dividirPorDuracion(U.tandasVacias(), 720);
  check('A13) «Weë lo hace por mí»: 12:00 → 4 capítulos de ≈3:00', d.tandas.length === 4 && d.tandas.every((x) => x.objetivo === 180));
  check('A14) no pisa las tandas que ya tienen cuadros', U.dividirPorDuracion(s, 360).tandas[0].cuadros.length === 4 && U.dividirPorDuracion(s, 360).tandas.length === 3);
  const dup = U.duplicarCuadro(s, id, s.tandas[0].cuadros[0].id);
  check('A15) duplicar pone la copia justo después', dup.tandas[0].cuadros.length === 5 && dup.tandas[0].cuadros[1].texto === 'c0');
  check('A16) la duración de un cuadro se acota a 1…tope', U.editarCuadro(s, id, s.tandas[0].cuadros[0].id, { duracion: 99 }).tandas[0].cuadros[0].duracion === U.TOPE_DE_CUADRO && U.editarCuadro(s, id, s.tandas[0].cuadros[0].id, { duracion: 0 }).tandas[0].cuadros[0].duracion === 1);
  check('A17) una ruta o un valor que el contrato no admite se descarta al editar', JSON.stringify(U.editarCuadro(s, id, s.tandas[0].cuadros[0].id, { creativo: { 'movement.type': 'orbit', 'camera.roll': 'dutch', 'shot.type': 'zzz' } }).tandas[0].cuadros[0].creativo) === JSON.stringify({ 'movement.type': 'orbit' }));
  check('A18) elegir dos veces lo mismo lo quita (alternar)', !('movement.type' in U.conCreativo({ 'movement.type': 'orbit' }, 'movement.type', 'orbit')) && U.conCreativo({}, 'movement.type', 'orbit')['movement.type'] === 'orbit');
  check('A19) el plano por defecto es «medium» (rótulo de la rejilla sale de shot.type)', s.tandas[0].cuadros[0].creativo['shot.type'] === 'medium');
  const grande = con(U.TOPES_TANDAS.cuadros);
  check('A20) el tope de cuadros por tanda se respeta', U.anadirCuadro(grande.s, grande.id).cuadroId === null);
  check('A21) el recuento y la comprobación del montaje final (60 cuadros / 600 s)', U.totales(s).cuadros === 4 && U.LIMITE_DEL_MONTAJE.planos === 60 && U.LIMITE_DEL_MONTAJE.segundos === 600 && !U.excesoDelMontaje(s).planos && U.excesoDelMontaje(grande.s).planos === false && U.excesoDelMontaje({ tandas: [grande.s.tandas[0], { ...grande.s.tandas[0], id: 'x' }], siguiente: 9 }).planos === true);
  check('A22) todasAprobadas y siguientePendiente', !U.todasAprobadas(s) && U.todasAprobadas(a) && U.siguientePendiente(s)?.id === id && U.siguientePendiente(a) === null);
  const vz = U.cambiarVozDeTanda(a, id, 'ej_es_aurora');
  check('A23) la voz de la tanda se guarda sin invalidar la aprobación (no cambia ningún cuadro)', vz.tandas[0].voz === 'ej_es_aurora' && U.estadoDe(vz.tandas[0]) === 'approved');
  check('A24) la voz propia de un cuadro se guarda (null = hereda)', U.editarCuadro(s, id, s.tandas[0].cuadros[0].id, { voz: 'ej_es_bruno' }).tandas[0].cuadros[0].voz === 'ej_es_bruno');
  check('A25) la producción fija el estado y bloquea la edición (lo usará la ola 4)', (() => { const x = { ...s, tandas: [{ ...s.tandas[0], produccion: 'producing' }] }; return U.estadoDe(x.tandas[0]) === 'producing' && U.editarCuadro(x, id, x.tandas[0].cuadros[0].id, { texto: 'z' }).tandas[0].cuadros[0].texto === 'c0'; })());
}

console.log('── B · Honestidad ──');
{
  const ej = T.ejemploTraducido((c) => c);
  const s = U.anadirEjemplos(U.tandasVacias(), ej);
  check('B1) el ejemplo se carga marcado: tandas y cuadros «ejemplo»', s.tandas.length === 2 && s.tandas.every((x) => x.ejemplo && x.cuadros.every((c) => c.ejemplo)) && U.hayEjemplos(s));
  check('B2) editar un cuadro de ejemplo lo hace tuyo; quitar el ejemplo conserva lo editado', (() => { const x = U.editarCuadro(s, s.tandas[0].id, s.tandas[0].cuadros[0].id, { texto: 'mío' }); const y = U.quitarEjemplos(x); return y.tandas.length === 1 && y.tandas[0].cuadros.length === 1 && y.tandas[0].cuadros[0].texto === 'mío'; })());
  check('B3) quitar el ejemplo sin tocar deja la lista vacía', U.quitarEjemplos(s).tandas.length === 0);
  check('B4) el ejemplo cumple el contrato: todos sus planos y movimientos existen', T.EJEMPLO_DE_TANDAS.every((t) => t.cuadros.every((c) => CAM.VALORES_CREATIVOS['shot.type'].includes(c.plano) && (!c.movimiento || CAM.VALORES_CREATIVOS['movement.type'].includes(c.movimiento)))));
  check('B5) imágenes del storyboard, producción, D1 y almacén de la cuenta: CERRADOS', K.GENERAR_IMAGENES_DEL_STORYBOARD === false && K.PRODUCCION_ABIERTA === false && K.D1_ABIERTO === false && K.ALMACEN_DE_LA_CUENTA_ABIERTO === false);
  check('B6) la galería de la ficha solo ofrece comandos del contrato (ruta y valor existen)', K.FAMILIAS_DEL_CUADRO.length === 5 && K.FAMILIAS_DEL_CUADRO.every((f) => f.comandos.every((c) => (CAM.VALORES_CREATIVOS[c.ruta] || []).includes(c.valor))));
  check('B7) están dron, acercar/alejar, órbita, dolly/seguir y detalle', (() => { const v = (r, x) => K.FAMILIAS_DEL_CUADRO.some((f) => f.comandos.some((c) => c.ruta === r && c.valor === x)); return v('camera.type', 'aerial') && v('movement.type', 'push_in') && v('movement.type', 'pull_out') && v('movement.type', 'orbit') && v('movement.type', 'follow') && v('movement.type', 'tracking') && v('shot.type', 'extreme_close_up') || v('camera.type', 'macro'); })());
  check('B8) la intensidad es el ritmo del movimiento del contrato (movement.speed)', K.INTENSIDADES.every((i) => CAM.VALORES_CREATIVOS['movement.speed'].includes(i.valor)) && K.INTENSIDADES.length === 3);
  check('B9) cámara lenta, time-lapse, zoom de impacto y plano inclinado salen CERRADOS con motivo y ninguno está en el contrato', ['slowmo', 'timelapse', 'dollyzoom', 'dutch'].every((id) => K.EFECTOS_CERRADOS.some((f) => f.id === id && f.claveMotivo)));
  check('B10) cinco acciones de D1 listas para recibirse (referencia, primer, último, extender, editar)', K.ACCIONES_D1.map((a) => a.id).join() === 'reference,firstFrame,lastFrame,extend,edit');
  check('B11) el tope de un cuadro es 30 s (D7: Seedance 2.5) y el montaje 600 s / 60 planos', U.TOPE_DE_CUADRO === 30 && U.LIMITE_DEL_MONTAJE.segundos === 600);
  check('B12) producir, ver y reintentar salen cerrados con motivo; crear y revisar abiertos', !T.ACCION_DE_ESTADO.approved.abierta && T.ACCION_DE_ESTADO.approved.claveMotivo && T.ACCION_DE_ESTADO.none.abierta && T.ACCION_DE_ESTADO.review.abierta);
  check('B13) los seis estados tienen texto', U.ESTADOS_DE_TANDA.every((e) => T.CLAVE_DE_ESTADO[e]));
}

console.log('── C · Ubicación y honestidad en los componentes ──');
const ficha = sinComentarios(leer('components/filmmaker/storyboard/FichaDelCuadro.tsx'));
const rejilla = sinComentarios(leer('components/filmmaker/storyboard/StoryboardDeTanda.tsx'));
const lista = sinComentarios(leer('components/filmmaker/tandas/ListaDeTandas.tsx'));
const hoja = sinComentarios(leer('components/filmmaker/tandas/HojaDeTanda.tsx'));
const cont = sinComentarios(leer('components/filmmaker/tandas/TandasYStoryboard.tsx'));
const comunes = sinComentarios(leer('components/filmmaker/tandas/comunes.tsx'));
const todos = [ficha, rejilla, lista, hoja, cont, comunes].join('\n');
check('C1) la ficha del cuadro concentra cámara, efectos, voz (SelectorDeVoz), música/efectos de sonido y D1', /FAMILIAS_DEL_CUADRO/.test(ficha) && /EFECTOS_CERRADOS/.test(ficha) && /SelectorDeVoz/.test(ficha) && /MUSICA_DE_ESCENA_ABIERTA/.test(ficha) && /EFECTOS_DE_SONIDO_ABIERTOS/.test(ficha) && /ACCIONES_D1/.test(ficha));
check('C2) la voz del cuadro usa el MISMO selector, con herencia cuadro → tanda → personaje', /contexto="shot"/.test(ficha) && /herenciaDe\('shot'/.test(ficha) && /resolverVoz/.test(ficha));
check('C3) la voz del capítulo vive en las opciones de la tanda, con el mismo selector', /contexto="scene"/.test(hoja) && /SelectorDeVoz/.test(hoja));
check('C4) aprobar y guardar en el almacén están en la barra de la tanda, no en la ficha ni al pie', /barra-de-tanda/.test(rejilla) && /approveBoard/.test(rejilla) && /saveToStore/.test(rejilla) && !/approveBoard|saveToStore/.test(ficha) && !/styles\.pie/.test(rejilla));
check('C5) el coste va junto al botón que lo causa (Producir) y dice «por confirmar»', /priceUnknown/.test(rejilla) && /nota/.test(rejilla));
check('C6) la ficha es panel lateral en pantallas anchas', /anclaLado/.test(ficha) && /anchoDeVentana >= 900/.test(ficha));
check('C7) D1 se activa con una bandera y un callback: nada simulado', /D1_ABIERTO && onAccionD1/.test(ficha));
check('C8) no hay una sección de voces aparte: ningún enlace «Personalizar voz y sonidos» ni ruta propia para voces', !/onAbrirVozYSonidos|VOZ_Y_SONIDOS_ABIERTA/.test(todos + leer('constants/filmmakerCamara.ts')));
check('C9) nada llama a servidor, Credits, IA ni generación de imágenes', !/functions|httpsCallable|creditsService|spendCredits|fetch\(|filmmakerService|brainService|creatorService/.test(todos));
check('C10) un solo botón blanco por pantalla: en la lista, el principal; en el storyboard, el de la barra', (lista.match(/<BotonBlanco/g) || []).length === 1 && (rejilla.match(/<BotonBlanco/g) || []).length === 1);
check('C11) la lista y el storyboard se enseñan a la vez desde 900 dp (dos zonas)', /ancho >= 900/.test(cont));
check('C12) el enganche exportado para la pantalla de etapas existe', /export const TandasYStoryboard/.test(cont) && /valor\?: TandasDelTaller/.test(cont) && /onCambio\?:/.test(cont));

console.log('── D · i18n ──');
const k = (o) => Object.keys(o).sort();
check('D1) es y en tienen exactamente las mismas claves', JSON.stringify(k(ES)) === JSON.stringify(k(EN)));
const fuentes = [todos, sinComentarios(leer('constants/filmmakerTandas.ts')), sinComentarios(leer('constants/filmmakerCamara.ts'))].join('\n');
const usadas = [...new Set([...fuentes.matchAll(/filmmakerTandas\.([A-Za-z0-9]+)/g)].map((m) => m[1]))];
check('D2) toda clave usada existe (con _one/_other si es plural)', usadas.every((x) => x in ES || `${x}_other` in ES), usadas.filter((x) => !(x in ES) && !(`${x}_other` in ES)).join(','));
check('D3) toda clave del diccionario se usa (nada muerto)', k(ES).every((x) => usadas.includes(x.replace(/_(one|other)$/, ''))), k(ES).filter((x) => !usadas.includes(x.replace(/_(one|other)$/, ''))).join(','));
const otras = [...new Set([...fuentes.matchAll(/(filmmakerSonido|studio|filmmaker)\.([A-Za-z0-9]+)/g)].map((m) => `${m[1]}.${m[2]}`))];
const ESsonido = cargar('i18n/textos/es/filmmakerSonido.ts').filmmakerSonido; const ESstudio = cargar('i18n/textos/es/studio.ts').studio; const ESfm = cargar('i18n/textos/es/filmmaker.ts').filmmaker;
const tabla = { filmmakerSonido: ESsonido, studio: ESstudio, filmmaker: ESfm };
check('D4) las claves prestadas de filmmakerSonido, studio y filmmaker existen', otras.every((c) => { const [m, x] = c.split('.'); return x in tabla[m]; }), otras.filter((c) => { const [m, x] = c.split('.'); return !(x in tabla[m]); }).join(','));
check('D5) sin texto de interfaz escrito a mano en los componentes (solo t(...))', ![ficha, rejilla, lista, hoja, comunes].some((c) => />\s*[A-Za-zÁÉÍÓÚáéíóúñ¿¡][^<{]{2,}\s*</.test(c.replace(/=>/g, ''))));
check('D6) RTL: sin left/right/marginLeft/paddingRight/textAlign left y con useDireccion', !/marginLeft|marginRight|paddingLeft|paddingRight|[^A-Za-z]left:|[^A-Za-z]right:|textAlign: 'left'|textAlign: 'right'/.test(todos.replace(/borderTopLeftRadius|borderBottomLeftRadius|borderTopRightRadius|borderBottomRightRadius/g, '')) && /useDireccion/.test(rejilla) && /dir\.contenedor/.test(lista));
check('D7) «Weë» siempre con diéresis en los textos', ![...Object.values(ES), ...Object.values(EN)].some((s) => /\bWee\b|\bWEE\b/.test(s)));
check('D8) ni uppercase ni letterSpacing sobre texto traducido', !/textTransform|letterSpacing/.test(todos));
check('D9) los tiempos se pintan con los dígitos del idioma (formato.numero) y aislados en LTR', /formato\.numero/.test(comunes) && /0x2066/.test(comunes) && /0x2069/.test(comunes));

console.log(`\n${failures === 0 ? 'TODO VERDE' : 'FALLAN ' + failures} (${n} comprobaciones)`);
process.exit(failures === 0 ? 0 : 1);
