/**
 * WEË DESIGN · LA REFERENCIA FUNCIONAL, VIGILADA (Línea C, 2026-10-07).
 *
 * Es un módulo, no una suite: lo ejecuta `foundation-de-experiencias.test.mjs` (grupo I), que ya está en la cadena de
 * `npm test`. Así no hay que tocar `functions/package.json` (de otra línea de trabajo) para que esto corra siempre.
 *
 * Ejecuta el código de verdad de la referencia —el registro (`constants/designReferencia.ts`) y su lógica
 * (`utils/designReferencia.ts`)— y lee la pantalla y sus piezas. Hace caer lo que el dueño pidió que cayera:
 *
 *   una capacidad sin punto de entrada · sin recorrido · una orden sin manejador · un resultado sin lo que sigue ·
 *   un proveedor a la vista sin autorización · un precio sin cotización (inventado) · un trabajo sin estado ·
 *   un material sin linaje · una entrega sin capacidad · una capacidad sin experiencia en el teléfono ·
 *   algo bloqueado presentado como disponible · una interfaz atada a un proveedor · un trabajo sin capacidad ·
 *   un resultado sin su trabajo · una versión sin su anterior
 *
 * y además: los documentos de cobertura generados al día, la elegibilidad igual a la de la Matriz B, las dos puertas
 * cerradas, Weë Design de siempre intacto, ningún segundo sistema, una sola caja y un solo Weë Brain, y la cadena
 * «de la imagen al objeto» coherente de punta a punta. Cada detector lleva su CONTROL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, crearCargador, archivosDeLaApp, leer, sinComentarios } from './filmmaker-cliente.mjs';

const existe = (rel) => fs.existsSync(path.resolve(RAIZ, rel));
const sinCR = (s) => s.replace(/\r\n/g, '\n');

/**
 * Los nombres de proveedores y modelos que la app no puede decir. Sin palabras corrientes del inglés o del español
 * («stability», «volcano», «runway», «veo»…), que darían falsos positivos en un texto cualquiera.
 */
export const PROVEEDOR = /\b(tripo3d|tripo|meshy|sloyd|seed3d|hunyuan|tencent|gemini|nano ?banana|gpt|openai|chatgpt|dall-e|midjourney|flux|seedream|seedance|elevenlabs|kling|rodin|hyper3d|hitem3d|kaedim|alpha3d|wavespeed|segmind|nvidia|huggingface|hugging face|volcengine|byteplus|bytedance|doubao|deepseek|minimax|anthropic|claude(?!\.md))\b|fal\.ai|fal-ai|FAL_KEY|stable fast 3d|spar3d|stability ai/i;
/** Parámetros propios de la API de un proveedor: si aparecen en la app, la interfaz está atada a él. */
export const PARAMETRO_DE_PROVEEDOR = /subdivision_?level|genStyleId|\bai_model\b|target_formats|texture_prompt|model_url|input_task_id|providerModelId|\bapiVersion\b|rig_task_id/;
/** Un precio escrito: una cifra con su moneda o con Credits. */
export const PRECIO = /\d[\d.,\s]*\s*(credits?|créditos?|crédits?|kredit\w*|usd|eur|cny|€|\$|¥)|[$€¥]\s*\d/i;

const BLOQUEO = new Set(['requiere_acuerdo', 'en_revision', 'sin_candidato']);

export const comprobarLaReferenciaDeDesign = async (check) => {
  const cargar = crearCargador();
  const C = cargar('constants/designReferencia.ts');
  const U = cargar('utils/designReferencia.ts');
  const { CAPABILITY_CATALOG } = cargar('services/escena3d.ts');
  const caps = C.CAPACIDADES_DE_DESIGN;
  const enDesign = caps.filter((c) => c.enDesign);
  const porIdDelCore = new Map(CAPABILITY_CATALOG.map((e) => [String(e.id), e]));

  const COMPONENTES = fs.readdirSync(path.resolve(RAIZ, 'components/designReferencia')).filter((f) => f.endsWith('.tsx'))
    .map((f) => `components/designReferencia/${f}`);
  const CODIGO = ['constants/designReferencia.ts', 'utils/designReferencia.ts', 'screens/DesignReferenciaScreen.tsx', ...COMPONENTES];
  const LOCALES = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((d) => fs.statSync(path.resolve(RAIZ, 'i18n/textos', d)).isDirectory()).sort();
  const DICCIONARIOS = LOCALES.map((l) => `i18n/textos/${l}/designRef.ts`);
  const registro = leer('constants/designReferencia.ts');
  const logica = leer('utils/designReferencia.ts');
  const pantalla = leer('screens/DesignReferenciaScreen.tsx');
  const hoja = leer('components/designReferencia/HojaDeCapacidad.tsx');
  const fuenteDe = (rel) => leer(rel);

  /* ── I1 · El registro ─────────────────────────────────────────────────── */
  const ids = caps.map((c) => c.id);
  check('I1) cada capacidad tiene un id y una fila únicos, con su forma', new Set(ids).size === ids.length
    && new Set(caps.map((c) => c.fila)).size === caps.length && caps.every((c) => /^C\d{2,3}$/.test(c.fila) && /^[a-z][A-Za-z0-9]*$/.test(c.id)),
    `${caps.length} capacidades`);
  check('I1) y cada campo es de su vocabulario (categoría, estado, recorrido, salida, material, orden, elegibilidad, quién la ejecuta)',
    caps.every((c) => C.CATEGORIAS.includes(c.categoria) && C.ESTADOS_DEL_MAPA.includes(c.estado) && c.perfil in U.RECORRIDO_POR_PERFIL
      && c.salida in C.CLAVE_DE_LA_SALIDA && c.impacto in C.CLAVE_DEL_IMPACTO && C.TIPOS_DE_INTEGRACION.includes(c.integracion.tipo)
      && c.elegibilidad in C.CLAVE_DE_LA_ELEGIBILIDAD && C.QUIEN_EJECUTA.includes(c.ejecutaPor) && c.requiere.every((r) => r in C.CLAVE_DEL_REQUISITO)));
  check('I1) las doce categorías (A–L) tienen capacidades', C.CATEGORIAS.every((cat) => caps.some((c) => c.categoria === cat)));
  check('I1) lo que no es de Weë Design lo dice: sin entrada, sin recorrido, NOT_APPLICABLE y con su motivo',
    caps.filter((c) => !c.enDesign).every((c) => c.entrada === 'ninguna' && c.perfil === 'noAplica' && c.estado === 'NOT_APPLICABLE' && typeof c.motivoFuera === 'string'));

  /* ── I2 · Cada capacidad, con su punto de entrada ─────────────────────── */
  const franja = fuenteDe('components/designReferencia/FranjaDeTrabajos.tsx');
  const barra = fuenteDe('components/designReferencia/BarraDeComandos.tsx');
  const lienzo = fuenteDe('components/designReferencia/Lienzo.tsx');
  const panel = fuenteDe('components/designReferencia/PanelDeBiblioteca.tsx');
  const seccionesVisibles = new Set(Object.values(U.SECCIONES_POR_SELECCION).flat());
  const alcanzable = (c) => {
    switch (c.entrada) {
      case 'composer': return !!c.intencion && U.capacidadesDeLaIntencion(c.intencion).includes(c);
      case 'barraDelLienzo': return c.integracion.tipo === 'sugerencias'
        ? lienzo.includes(`capacidadPorId('${c.id}')`) : U.capacidadesDeLaBarraDelLienzo().includes(c);
      case 'biblioteca': return !!c.pestana && U.capacidadesDeLaPestana(c.pestana).includes(c) && panel.includes(`botones('${c.pestana}')`);
      case 'inspector': return !!c.seccion && U.capacidadesDeLaSeccion(c.seccion).includes(c) && seccionesVisibles.has(c.seccion);
      case 'franja': return franja.includes(`capacidadPorId('${c.id}')`);
      case 'barraDeComandos': return (c.integracion.tipo === 'proyecto' && /onProyecto/.test(barra)) || (c.integracion.tipo === 'explicar' && /onDescubrir/.test(barra));
      case 'interna': { const p = c.padre ? C.capacidadPorId(c.padre) : undefined; return !!p && p.enDesign && p.entrada !== 'interna'; }
      default: return false;
    }
  };
  const sinEntrada = enDesign.filter((c) => !alcanzable(c));
  check('I2) ninguna capacidad de Weë Design se queda sin punto de entrada, y cada una se ve donde dice', sinEntrada.length === 0,
    sinEntrada.map((c) => c.id).join(', ') || `${enDesign.length} alcanzables`);
  check('I2) CONTROL: una capacidad sin entrada se caza', !alcanzable({ ...enDesign[0], entrada: 'inspector', seccion: undefined }));

  /* ── I3 · Cada capacidad, con su recorrido ────────────────────────────── */
  const VALORES = new Set(['YES', 'NO', 'N/A', 'PENDING']);
  const sinRecorrido = enDesign.filter((c) => {
    const r = U.recorridoDe(c);
    return U.PASOS.some((p) => !VALORES.has(r[p])) || U.PASOS.every((p) => r[p] === 'N/A');
  });
  check('I3) cada capacidad de Weë Design tiene sus diecinueve pasos, cada uno YES, NO, N/A o PENDING', U.PASOS.length === 19 && sinRecorrido.length === 0,
    sinRecorrido.map((c) => c.id).join(', '));
  check('I3) y donde se pide existe de verdad (YES) en todas las que se ven', enDesign.filter((c) => c.entrada !== 'interna').every((c) => U.recorridoDe(c).entrada === 'YES'));
  check('I3) ninguna celda NO: lo que falta está diseñado (PENDING) o no aplica (N/A)', caps.every((c) => U.PASOS.every((p) => U.recorridoDe(c)[p] !== 'NO')));

  /* ── I4 · Cada orden, con su manejador ────────────────────────────────── */
  const inicio = pantalla.indexOf('const manejadores: Record<TipoDeIntegracion, (cap: CapacidadDeDesign) => void> = {');
  const bloque = inicio < 0 ? '' : pantalla.slice(inicio, pantalla.indexOf('\n  };', inicio));
  const conManejador = [...bloque.matchAll(/^ {4}([a-zA-Z]+):/gm)].map((m) => m[1]);
  const sinManejador = C.TIPOS_DE_INTEGRACION.filter((t) => !conManejador.includes(t));
  check('I4) cada tipo de orden tiene su manejador en la pantalla (un Record total: uno que falte no compila)', inicio >= 0 && sinManejador.length === 0,
    sinManejador.join(', ') || `${conManejador.length} manejadores`);
  check('I4) los tipos que usa el registro son todos conocidos', caps.every((c) => C.TIPOS_DE_INTEGRACION.includes(c.integracion.tipo)));
  check('I4) y pulsar nunca es mudo: lo que no se puede usar, se explica',
    /if \(estadoDe\(cap\)\.disponible\) manejadores\[cap\.integracion\.tipo\]\(cap\);\s*else abrirDetalle\(cap\);/.test(pantalla) && /ninguna: abrirDetalle,/.test(bloque));

  /* ── I5 · Cada resultado, con lo que sigue ────────────────────────────── */
  const VISIBLES = ['image', 'model3d', 'world', 'scene', 'video', 'informe'];
  check('I5) cada resultado que se ve tiene lo que sigue', VISIBLES.every((s) => U.siguientesDe(s).length > 0));
  check('I5) un archivo entregado o «sin resultado» lo dicen ([]), no lo callan',
    C.SIGUIENTES_POR_RESULTADO.file.length === 0 && C.SIGUIENTES_POR_RESULTADO.none.length === 0);
  check('I5) todo lo que sigue existe y es de Weë Design', Object.values(C.SIGUIENTES_POR_RESULTADO).flat().every((id) => C.capacidadPorId(id)?.enDesign));
  check('I5) y toda capacidad que produce algo visible tiene lo que sigue', enDesign.filter((c) => VISIBLES.includes(c.salida)).every((c) => U.siguientesDe(c.salida).length > 0));

  /* ── I6 · Ningún proveedor a la vista, ninguna interfaz atada a uno ───── */
  const nombran = [...CODIGO, ...DICCIONARIOS].filter((f) => PROVEEDOR.test(leer(f)));
  check('I6) ni el código ni los dieciséis diccionarios de la referencia, comentarios incluidos, nombran un proveedor o un modelo',
    nombran.length === 0, nombran.join(', ') || `${CODIGO.length + DICCIONARIOS.length} archivos`);
  const atadas = CODIGO.filter((f) => PARAMETRO_DE_PROVEEDOR.test(leer(f)));
  check('I6) ni usan un parámetro propio de la API de un proveedor (la interfaz no está atada a nadie)', atadas.length === 0, atadas.join(', '));
  check('I6) CONTROL: el detector ve un proveedor, un modelo y un parámetro suyo, y no confunde palabras corrientes',
    PROVEEDOR.test('lo hace Tripo') && PROVEEDOR.test('con Nano Banana Pro') && PROVEEDOR.test('Seed3D 2.0') && PARAMETRO_DE_PROVEEDOR.test('subdivision_level')
    && !PROVEEDOR.test('un trío de vistas, la estabilidad y el volcán') && !PROVEEDOR.test('Modello 3D dalle parole') && !PROVEEDOR.test('Weë Brain elige (CLAUDE.md §10)'));

  /* ── I7 · Nada bloqueado se presenta como disponible ──────────────────── */
  const TODO_ENRUTABLE = CAPABILITY_CATALOG.map((e) => ({ ...e, status: 'ROUTABLE' }));
  const SELECCIONES = [U.SIN_SELECCION, { hayTrabajo: true, hayTrabajoDeMaterial: true, hayEntrega: true, esImagen: true }];
  const disponibleAlgunaVez = (c, estado = (cap, sel, cat) => U.estadoDeLaCapacidad(cap, sel, cat, () => true)) => SELECCIONES.some((s) => estado(c, s).disponible || estado(c, s, TODO_ENRUTABLE).disponible);
  const bloqueadas = caps.filter((c) => BLOQUEO.has(c.elegibilidad));
  const mal = bloqueadas.filter((c) => disponibleAlgunaVez(c));
  check('I7) lo pendiente de autorización, en revisión o sin candidato nunca se ofrece como disponible (ni con todo el catálogo enrutable)',
    bloqueadas.length > 0 && mal.length === 0, mal.map((c) => c.id).join(', ') || `${bloqueadas.length} bloqueadas`);
  const propuestas = caps.filter((c) => c.variantePropuesta || c.capacidades.some((id) => C.CAPACIDADES_PROPUESTAS.includes(id)));
  check('I7) ni una propuesta (capacidad o variante que el Core todavía no tiene)', propuestas.length > 0 && propuestas.every((c) => !disponibleAlgunaVez(c)));
  const disponibles = caps.filter((c) => SELECCIONES.some((s) => U.estadoDeLaCapacidad(c, s, undefined, () => true).disponible));
  check('I7) lo disponible tiene manejador de verdad y es de Weë Design', disponibles.every((c) => c.enDesign && c.integracion.tipo !== 'ninguna'),
    disponibles.map((c) => c.id).join(', '));
  /* Una capacidad conectada de verdad que pasara a «pendiente de autorización»: la disponibilidad real la apaga; una que ignorase la elegibilidad, no. */
  const ignoraLaElegibilidad = (c, s, cat) => U.estadoDeLaCapacidad({ ...c, elegibilidad: 'cadena_de_wee' }, s, cat, () => true);
  const sinAutorizar = { ...C.capacidadPorId('concept'), elegibilidad: 'requiere_acuerdo' };
  check('I7) CONTROL: una disponibilidad que ignorase la elegibilidad se caza',
    !disponibleAlgunaVez(sinAutorizar) && disponibleAlgunaVez(sinAutorizar, ignoraLaElegibilidad));
  check('I7) elegir quién lo hace es una puerta de gobierno cerrada, apagada aunque se abra, y no sabe ningún nombre',
    C.ELEGIR_QUIEN_LO_HACE_EN_LA_APP === false && /export const ELEGIR_QUIEN_LO_HACE_EN_LA_APP = false;/.test(registro)
    && /accessibilityState=\{\{ checked: false, disabled: true \}\}/.test(hoja) && /\{ELEGIR_QUIEN_LO_HACE_EN_LA_APP && <EleccionDeGobierno \/>\}/.test(hoja));

  /* ── I8 · Ningún precio inventado ─────────────────────────────────────── */
  const conPrecio = DICCIONARIOS.filter((f) => PRECIO.test(leer(f)));
  check('I8) ningún texto de la referencia, en ningún idioma, escribe un precio', conPrecio.length === 0, conPrecio.join(', '));
  const codigoSinComentarios = CODIGO.map((f) => sinComentarios(leer(f))).join('\n');
  check('I8) ni el registro, ni la lógica, ni la pantalla llevan un número de precio: lo da el Credit Engine al cotizar',
    !/(credits?|precio|price|coste|cost)\w*\s*[:=]\s*\d/i.test(codigoSinComentarios));
  check('I8) el detalle habla de dinero solo con sus dos claves, y dice «pendiente» si el paso del precio no existe de verdad',
    /const precioReal = pasos\.cotizacion === 'YES';/.test(hoja) && /precioReal \? 'designRef\.priceBeforeCreate' : 'designRef\.pricePending'/.test(hoja)
    && JSON.stringify(U.CLAVES_DE_PRECIO) === JSON.stringify(['designRef.priceBeforeCreate', 'designRef.pricePending']));
  check('I8) CONTROL: el detector ve un precio inventado', PRECIO.test("pricePending: 'Cuesta 20 Credits'") && PRECIO.test('2,40 CNY') && PRECIO.test('$0.33')
    && !PRECIO.test('Verás el precio en Credits antes de crear.') && !PRECIO.test('Modelo 3D, 360° y 19 pasos'));

  /* ── I9 · Ningún trabajo sin estado ───────────────────────────────────── */
  check('I9) cada estado de un trabajo de CreatorFlow tiene su estado unificado',
    Object.keys(U.ESTADO_DESDE_CREATOR_JOB).sort().join() === 'asking,cancelled,done,failed,planned,running'
    && Object.values(U.ESTADO_DESDE_CREATOR_JOB).every((e) => U.ESTADOS_DE_TRABAJO.includes(e)));
  check('I9) y cada estado del trabajo asíncrono 3D que ya existe (el del mundo)', Object.keys(U.ESTADO_DESDE_TRABAJO_3D).length === 6
    && Object.values(U.ESTADO_DESDE_TRABAJO_3D).every((e) => U.ESTADOS_DE_TRABAJO.includes(e)));
  check('I9) cada estado tiene su texto y sus salidas, todas a estados que existen', U.ESTADOS_DE_TRABAJO.length === 15
    && U.ESTADOS_DE_TRABAJO.every((e) => U.CLAVE_DEL_ESTADO_DE_TRABAJO[e] && Array.isArray(U.TRANSICIONES_DE_TRABAJO[e])
      && U.TRANSICIONES_DE_TRABAJO[e].every((x) => U.ESTADOS_DE_TRABAJO.includes(x))));
  check('I9) a la cola solo se llega confirmando el precio, reintentando o (lo que no cuesta) tras comprobar',
    U.ESTADOS_DE_TRABAJO.filter((e) => U.puedePasar(e, 'QUEUED')).sort().join() === 'RETRYING,VALIDATING,WAITING_FOR_CONFIRMATION');
  const pagadas = enDesign.filter((c) => c.ejecutaPor === 'motor' && U.recorridoDe(c).trabajo !== 'N/A');
  check('I9) y toda capacidad que pasa por el motor pasa por el precio antes de la cola (también en la simulación)',
    pagadas.length > 0 && pagadas.every((c) => {
      const s = U.estadosSimulados(c);
      return U.recorridoDe(c).cotizacion !== 'N/A' && s.includes('QUOTING') && s.indexOf('WAITING_FOR_CONFIRMATION') < s.indexOf('QUEUED') && s.indexOf('QUOTING') >= 0;
    }), `${pagadas.length} con precio`);
  check('I9) cada paso de cada simulación es una transición permitida', enDesign.every((c) => {
    const s = U.estadosSimulados(c);
    return s[0] === 'IDLE' && s.at(-1) === 'COMPLETED' && s.every((e, i) => i === 0 || U.puedePasar(s[i - 1], e));
  }));
  check('I9) pedir parar no es haber parado, y un final que no se sabe se reconcilia',
    U.puedePasar('PROCESSING', 'CANCEL_REQUESTED') && !U.puedePasar('PROCESSING', 'CANCELLED') && U.puedePasar('CANCEL_REQUESTED', 'RECONCILING')
    && U.puedePasar('PROCESSING', 'RECONCILING') && !U.puedePasar('IDLE', 'QUEUED'));
  const cancelacionHonesta = (fn) => enDesign.every((c) => U.ESTADOS_DE_TRABAJO.every((e) => {
    const r = fn(c, e);
    if (r === 'logica') return c.cancelar === 'logica' && e === 'QUEUED';
    if (r === 'con_parada') return c.cancelar === 'con_parada' && (e === 'QUEUED' || e === 'PROCESSING');
    return r === 'ninguna';
  }));
  check('I9) cancelar no promete de más: «que no empiece» solo en cola; parar de verdad solo donde el Job Engine lo confirma',
    cancelacionHonesta(U.cancelacionEn) && enDesign.some((c) => U.cancelacionEn(c, 'QUEUED') === 'logica'));
  check('I9) CONTROL: una cancelación que prometiera parar lo que ya trabaja se caza',
    !cancelacionHonesta((c, e) => (c.cancelar === 'logica' && e === 'PROCESSING' ? 'logica' : U.cancelacionEn(c, e))));

  /* ── I10 · Ningún material sin linaje, ningún resultado sin su trabajo ── */
  const linajeValido = (r) => !!r && typeof r.trabajoId === 'string' && r.trabajoId.length > 0 && typeof r.materialId === 'string' && r.materialId.length > 0
    && !!C.capacidadPorId(r.capacidadId) && Array.isArray(r.linaje) && r.linaje.length >= 1 && r.linaje.at(-1).materialId === r.materialId
    && (r.relacion === 'nuevo' ? r.padreId === null && r.linaje.length === 1 : r.padreId !== null && r.padreId === r.linaje.at(-2)?.materialId);
  const cadena = U.recorrerCadena();
  check('I10) la cadena se recorre entera: cada resultado con su trabajo, su material, su capacidad y su linaje',
    cadena.length === C.CADENA_DE_DESIGN.length && cadena.every(linajeValido), cadena.map((r) => `${r.capacidadId}:${r.relacion}`).join(' › '));
  check('I10) y cada paso entra en el siguiente por referencia: viene del material de antes',
    cadena.every((r, i) => (i === 0 ? r.padreId === null : r.padreId === cadena[i - 1].materialId && r.linaje.length === i + 1)));
  const muestras = [null, ...cadena];
  check('I10) una versión nunca va sin su anterior, y lo que sale de algo nunca es «nuevo» (todas las capacidades, con y sin entrada)',
    enDesign.every((c) => muestras.every((m, i) => linajeValido(U.simularResultado(c, m, i + 1)))));
  check('I10) CONTROL: una versión sin anterior se caza, y un resultado sin trabajo también',
    !linajeValido({ ...cadena[1], padreId: null }) && !linajeValido({ ...cadena[0], trabajoId: '' }) && !linajeValido({ ...cadena[2], linaje: cadena[2].linaje.slice(0, -1) }) && !linajeValido({ ...cadena[0], padreId: 'sim-otro-1' }));
  check('I10) un resultado simulado no se confunde con uno de verdad: no habilita nada real',
    cadena.every((r) => r.materialId.startsWith('sim-') && r.trabajoId.startsWith('sim-job-'))
    && JSON.stringify(U.resumenDeSeleccion(cadena[0], () => 'https://x')) === JSON.stringify(U.SIN_SELECCION));

  /* ── I11 · Ninguna entrega sin capacidad ──────────────────────────────── */
  check('I11) cada destino de entrega lleva a una capacidad que existe y es de Weë Design', C.DESTINOS_DE_ENTREGA.every((d) => C.capacidadPorId(d.capacidad)?.enDesign));
  check('I11) entregar es de Weë: sus ajustes (formato, escala y unidades, ejes, origen, detalle, texturas) no dependen de quién hizo el modelo',
    ['formato', 'escala', 'ejes', 'origen', 'detalle', 'texturas'].every((id) => C.AJUSTES_DE_ENTREGA.some((a) => a.id === id))
    && C.FORMATOS_DE_ENTREGA.every((f) => /^[A-Z0-9]{3,4}$/.test(f)));
  const ultimo = C.CADENA_DE_DESIGN.at(-1);
  check('I11) y la cadena termina en una entrega que es una VARIANTE del modelo, sin tocarlo',
    ultimo.operacion === 'convertir_formato' && C.capacidadPorId(ultimo.capacidad)?.impacto === 'variante' && ultimo.sale === 'file');

  /* ── I12 · Nada sin experiencia en el teléfono ────────────────────────── */
  check('I12) cada capacidad de Weë Design que se ve dice qué pasa en el teléfono (lo interno no tiene pantalla propia)',
    enDesign.every((c) => (c.entrada === 'interna') === (c.movil === 'no_aplica')));
  check('I12) en el teléfono se llega a las cuatro superficies y la caja va anclada abajo',
    C.SUPERFICIES.length === 4 && /opciones=\{SUPERFICIES\.map/.test(pantalla) && /const pie = !isDesktop/.test(pantalla) && /pie=\{pie\}/.test(pantalla));

  /* ── I13 · Ningún trabajo sin capacidad ───────────────────────────────── */
  check('I13) cada trabajo de la franja es de una capacidad que existe, por su experiencia',
    Object.entries(U.CAPACIDAD_DE_LA_EXPERIENCIA).every(([exp, id]) => {
      const c = C.capacidadPorId(id);
      return !!c && c.integracion.tipo === 'flujo' && c.integracion.experienceId === exp;
    }) && JSON.stringify([...U.EXPERIENCIAS_DE_DESIGN].sort()) === JSON.stringify(['design', 'home']));

  /* ── I14 · Las claves, en los dieciséis idiomas ───────────────────────── */
  const CLAVE_RE = /'((?:designRef|weeai|creaciones|studio|design|catalogo|common|menu)\.[A-Za-z0-9_]+)'/g;
  const claves = new Set([
    ...caps.map((c) => c.clave),
    ...caps.filter((c) => c.motivoFuera).map((c) => c.motivoFuera),
    ...CODIGO.flatMap((f) => [...sinComentarios(leer(f)).matchAll(CLAVE_RE)].map((m) => m[1])),
    ...CODIGO.flatMap((f) => [...sinComentarios(leer(f)).matchAll(/"((?:designRef|creaciones|studio|common)\.[A-Za-z0-9_]+)"/g)].map((m) => m[1])),
  ]);
  const tiene = new Map();
  const tieneLaClave = (locale, clave) => {
    const [modulo, k] = clave.split('.');
    const rel = `i18n/textos/${locale}/${modulo}.ts`;
    if (!tiene.has(rel)) tiene.set(rel, existe(rel) ? new Set([...leer(rel).matchAll(/^\s+([A-Za-z][A-Za-z0-9_]*)\s*:/gm)].map((m) => m[1])) : new Set());
    return tiene.get(rel).has(k);
  };
  const faltan = LOCALES.flatMap((l) => [...claves].filter((k) => !tieneLaClave(l, k)).map((k) => `${l}:${k}`));
  check(`I14) cada clave que pinta la referencia (${claves.size}) existe en los ${LOCALES.length} idiomas`, LOCALES.length === 16 && faltan.length === 0,
    faltan.slice(0, 6).join(', '));
  const registrados = LOCALES.filter((l) => /import \{ designRef \} from '\.\/designRef';/.test(leer(`i18n/textos/${l}/index.ts`))
    && /^ {2}designRef,$/m.test(leer(`i18n/textos/${l}/index.ts`)));
  check('I14) y el módulo está registrado en los dieciséis diccionarios', registrados.length === 16, LOCALES.filter((l) => !registrados.includes(l)).join(', '));
  const provisionales = DICCIONARIOS.filter((f) => /PROVISIONAL/.test(leer(f)));
  check('I14) ningún idioma se quedó con la copia provisional del inglés', provisionales.length === 0, provisionales.join(', '));

  /* ── I15 · Los documentos de cobertura, al día ───────────────────────── */
  const { generar } = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/design-cobertura.mjs')).href);
  const docs = generar();
  const distintos = Object.entries(docs).filter(([rel, contenido]) => !existe(rel) || sinCR(leer(rel)) !== contenido).map(([rel]) => rel);
  check('I15) el mapa maestro y la matriz de cobertura son los que salen del registro (node scripts/design-cobertura.mjs)', distintos.length === 0,
    distintos.join(', ') || Object.keys(docs).join(', '));
  check('I15) cada celda de la matriz es YES, NO, N/A o PENDING', caps.every((c) => Object.values(U.coberturaDe(c)).every((v) => VALORES.has(v)))
    && U.COLUMNAS_DE_COBERTURA.length === 16);
  const descripciones = JSON.parse(leer('docs/wee-design-capacidades.json')).descripciones;
  check('I15) cada capacidad tiene su descripción en los documentos, y ninguna sobra',
    ids.every((id) => typeof descripciones[id] === 'string' && descripciones[id].length > 20) && Object.keys(descripciones).every((id) => ids.includes(id)));

  /* ── I16 · La elegibilidad es la de la Matriz B (dato de la Línea B) ──── */
  const B = JSON.parse(leer('docs/wee-design-proveedores.json'));
  const ORDEN = { cadena_de_wee: 0, en_revision: 1, requiere_acuerdo: 2 };
  const agregada = (c) => {
    if (c.ejecutaPor !== 'motor' || !Object.prototype.hasOwnProperty.call(B.candidatos, c.id)) return c.ejecutaPor === 'motor' ? undefined : 'no_aplica';
    const e = B.candidatos[c.id].map((o) => B.estados[B.origenes[o]?.estado]?.elegibilidad).sort((a, b) => ORDEN[a] - ORDEN[b]);
    return e.length ? e[0] : 'sin_candidato';
  };
  const distinta = caps.filter((c) => agregada(c) !== c.elegibilidad);
  check('I16) la elegibilidad de cada capacidad es la que sale de la Matriz B (sin un solo nombre en la app)', distinta.length === 0,
    distinta.map((c) => `${c.id}: ${c.elegibilidad} ≠ ${agregada(c)}`).join(', '));
  const listas = ['candidatos', 'soloEnLaWeb', 'proximamente', 'investigacion', 'excluidos'];
  const idsDeB = listas.flatMap((l) => Object.keys(B[l] ?? {}));
  const origenesDeB = listas.flatMap((l) => Object.values(B[l] ?? {}).flatMap((v) => (Array.isArray(v) ? v : v.origenes)));
  check('I16) y la Matriz B solo habla de capacidades que existen y de candidatos que conoce',
    idsDeB.every((id) => ids.includes(id)) && origenesDeB.every((o) => o in B.origenes)
    && [...B.seed3d.inventario, ...B.sloyd.inventario].every((x) => x.wee.every((id) => ids.includes(id))));

  /* ── I17 · Las puertas, cerradas; Weë Design de siempre, intacto ─────── */
  const cerrada = pantalla.slice(pantalla.indexOf('const ReferenciaCerrada'), pantalla.indexOf('const EspacioDeTrabajo'));
  check('I17) la puerta de la referencia es una constante del código, cerrada', C.DESIGN_REFERENCIA_EN_LA_APP === false
    && /export const DESIGN_REFERENCIA_EN_LA_APP = false;/.test(registro));
  check('I17) cerrada, la pantalla no monta el espacio de trabajo: ni lee la cuenta ni llama a nada',
    /if \(!DESIGN_REFERENCIA_EN_LA_APP\) return <ReferenciaCerrada \/>;/.test(pantalla) && cerrada.length > 0
    && !/assetsService|creatorService|projectsService|useAuth|navigate\(/.test(cerrada));
  check('I17) sin puerta no hay enlace, y la ruta vive en la pila junto a Weë Design, sin sustituirla',
    /\.\.\.\(DESIGN_REFERENCIA_EN_LA_APP \? \{ DesignReferencia: \{ path: 'design\/referencia\/:grupo\?'/.test(leer('App.tsx'))
    && /<Stack\.Screen name="DesignReferencia" component=\{DesignReferenciaScreen\} \/>/.test(leer('navigation/MainStackNavigator.tsx'))
    && /<Stack\.Screen name="Design" component=\{DesignScreen\} \/>/.test(leer('navigation/MainStackNavigator.tsx')));
  const llevan = archivosDeLaApp().filter((f) => !CODIGO.includes(f) && /navigate\(\s*'DesignReferencia'/.test(leer(f)));
  check('I17) ningún botón de la app lleva a la referencia', llevan.length === 0, llevan.join(', '));
  check('I17) la pantalla de siempre de Weë Design no sabe que la referencia existe', !/designReferencia|DesignReferencia/.test(leer('screens/DesignScreen.tsx')));

  /* ── I18 · Ningún segundo sistema; una caja y un Weë Brain ───────────── */
  const SEGUNDO = /Design(Router|Gateway|Credits|JobEngine|Jobs|AssetLayer|Assets|Providers?|Registry|Brain)\b/;
  const enArchivos = [...archivosDeLaApp(), ...fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { recursive: true }).map((f) => `functions/src/${String(f)}`)]
    .filter((f) => SEGUNDO.test(path.basename(f)));
  const enCodigo = CODIGO.filter((f) => /export (const|class|function|interface|type) Design(Router|Gateway|Credits|JobEngine|AssetLayer)\b/.test(leer(f)));
  check('I18) ni DesignRouter, ni DesignGateway, ni DesignCredits, ni DesignJobEngine, ni DesignAssetLayer: ningún segundo sistema',
    enArchivos.length === 0 && enCodigo.length === 0, [...enArchivos, ...enCodigo].join(', '));
  const llamaPorSuCuenta = CODIGO.filter((f) => /from 'firebase\/|httpsCallable|spendCredits|completeCredits|refundCredits|getFunctions\(/.test(leer(f)));
  check('I18) la referencia no llama a Firebase ni a ninguna función por su cuenta: usa los servicios de siempre', llamaPorSuCuenta.length === 0,
    llamaPorSuCuenta.join(', '));
  const composer = leer('components/designReferencia/ComposerDeDesign.tsx');
  const conCampo = CODIGO.filter((f) => /<TextInput\b/.test(leer(f)));
  check('I18) la caja es la de todas (CajaDePrompt, el mismo Weë Brain) y no hay ningún campo propio', /<CajaDePrompt\b/.test(composer) && conCampo.length === 0,
    conCampo.join(', '));
  check('I18) y crece como todas: anclada en la columna en escritorio, en el pie de CreatorShell en el teléfono (CLAUDE.md §9)',
    /<CajaAnclada alto=\{topeDeLaCaja\}>\{composer\}<\/CajaAnclada>/.test(pantalla) && /<CreatorShell\b/.test(pantalla));
  /*
   * `contextoDeDesign` vive ahora en `utils/contextoDeDesign.ts` (R7-Design, puente de la pantalla montada): la referencia lo
   * re-exporta con su catálogo, así que el destino de siempre se busca en el módulo neutro además de en la lógica de la referencia.
   */
  check('I18) a Weë Brain se llega por CreatorFlow, con el destino de siempre (destinoDeIntencion), sin otro router',
    /destinoDeIntencion\(/.test(logica + leer('utils/contextoDeDesign.ts')) && /navigation\.navigate\('CreatorFlow'/.test(pantalla) && !/brainService|useBrainChat|creatorChat\b/.test(CODIGO.map(leer).join('\n')));
  check('I18) y no toca el motor de algoritmos ni la sombra', !/core\/algorithm|sombra|algorithm/i.test(CODIGO.map((f) => sinComentarios(leer(f))).join('\n')));

  /* ── I19 · De la imagen al objeto: la cadena, agnóstica de modelo ─────── */
  const E = C.CADENA_DE_DESIGN;
  const capDe = (e) => C.capacidadPorId(e.capacidad);
  check('I19) seis eslabones, cada uno con su capacidad (y sus alternativas) de Weë Design',
    E.length === 6 && E.every((e) => capDe(e)?.enDesign && e.alternativas.every((a) => C.capacidadPorId(a)?.enDesign)));
  const obligatorios = E.filter((e) => !e.opcional);
  check('I19) lo que sale de un eslabón es lo que entra en el siguiente, también saltando los opcionales',
    E.every((e, i) => i === 0 || E[i - 1].sale === e.entra) && obligatorios.every((e, i) => i === 0 || obligatorios[i - 1].sale === e.entra)
    && E.every((e) => capDe(e).salida === e.sale));
  const DE_IMAGEN = E.filter((e) => e.sale === 'image');
  check('I19) los eslabones de imagen son la capacidad de imagen que Weë ya tiene: capacidades image.* del Core, enrutables, con la cadena de Weë',
    DE_IMAGEN.length === 3 && DE_IMAGEN.every((e) => {
      const c = capDe(e);
      return c.elegibilidad === 'cadena_de_wee' && c.capacidades.every((id) => /^(image|text)\./.test(id) && porIdDelCore.get(id)?.status === 'ROUTABLE');
    }));
  const OPERACION = { crear: 'nuevo', editar: 'version', derivar: 'derivado', convertir_formato: 'variante' };
  check('I19) la operación de cada eslabón es la del Content Core (crear → nuevo, editar → versión, derivar → derivado, convertir → variante)',
    E.every((e) => OPERACION[e.operacion] === capDe(e).impacto));
  const claseCuadra = (e) => {
    const c = capDe(e);
    switch (e.clase) {
      case 'EXISTING': return U.estadoDeLaCapacidad(c, undefined, undefined, () => true).disponible && e.falta.length === 0;
      case 'PARTIAL': return c.estado === 'PARTIAL';
      case 'BACKEND_REQUIRED': return c.requiere.includes('servidor') && !['requiere_acuerdo', 'en_revision'].includes(c.elegibilidad);
      case 'PROVIDER_REQUIRED': return BLOQUEO.has(c.elegibilidad) && c.requiere.includes('proveedor');
      default: return true;
    }
  };
  check('I19) la clase de cada eslabón cuadra con su capacidad, y el que no funciona dice qué le falta',
    E.every(claseCuadra) && E.filter((e) => e.clase !== 'EXISTING').every((e) => e.falta.length > 0), E.map((e) => `${e.id}:${e.clase}`).join(' '));
  check('I19) los atajos entre pasos: el siguiente y, si se puede saltar, el primero que no',
    U.pasosDesde(null).siguiente?.id === 'imagen' && U.pasosDesde('imagen').siguiente?.id === 'editar' && U.pasosDesde('imagen').salto?.id === 'modelo'
    && U.pasosDesde('modelo').salto?.id === 'entregar' && U.pasosDesde('entregar').siguiente === null);
  check('I19) el lienzo enseña la cadena y la recorre desde el detalle de cada eslabón',
    /<CadenaDeDesign seleccion=\{seleccion\} onAbrir=\{onDetalle\} \/>/.test(lienzo) && /simularResultado\(cap, antes, n\)/.test(pantalla));

  /* ── I20 · Quién ejecuta: lo que tiene que ser agnóstico ─────────────── */
  check('I20) lo que pasa por el motor nombra capacidades del Core (o propuestas con su marca), nunca a quién',
    caps.filter((c) => c.ejecutaPor === 'motor').every((c) => c.capacidades.length > 0
      && c.capacidades.every((id) => porIdDelCore.has(id) || C.CAPACIDADES_PROPUESTAS.includes(id))));
  check('I20) lo de Weë sin IA no pasa por el motor ni tiene proveedor; lo que va a otro programa, tampoco',
    caps.filter((c) => c.ejecutaPor === 'wee').every((c) => c.capacidades.length === 0 && c.elegibilidad === 'no_aplica')
    && caps.filter((c) => c.ejecutaPor === 'externo').every((c) => c.perfil === 'externo' && c.elegibilidad === 'no_aplica'));
  check('I20) la matriz solo pide proveedor a lo que pasa por el motor',
    caps.filter((c) => c.ejecutaPor !== 'motor').every((c) => U.coberturaDe(c).Provider === 'N/A'));
  /* ── I21 · Línea B: el espacio de trabajo (regiones, Composer, agente, trabajos, 3D Design) ── */
  const W = cargar('constants/designWorkspace.ts');
  const ws = leer('constants/designWorkspace.ts');
  const piezasDe = Object.values(W.REGIONES_DEL_WORKSPACE).flatMap((r) => r.piezas);
  const faltanPiezas = piezasDe.filter((p) => !existe(`components/designReferencia/${p}.tsx`));
  check('I21) las cinco regiones (arriba, izquierda, centro, derecha, barra contextual) y cada pieza existe',
    W.REGIONES.length === 5 && faltanPiezas.length === 0, faltanPiezas.join(', '));
  const malAcc = W.ACCIONES_DEL_COMPOSER.filter((a) => { const c = C.capacidadPorId(a.capacidad); return !c || !c.enDesign || c.grupo !== a.grupo; });
  check('I21) cada acción del Composer (12 verbos, con el mundo 3D) va a una capacidad del registro, de Weë Design y de su grupo',
    W.ACCIONES_DEL_COMPOSER.length === 12 && malAcc.length === 0 && new Set(W.ACCIONES_DEL_COMPOSER.map((a) => a.id)).size === 12, malAcc.map((a) => a.id).join(', '));
  const acciones = leer('components/designReferencia/AccionesDelComposer.tsx');
  check('I21) pulsar una acción usa o explica (onCapacidad), nunca nada; y la barra va dentro de la caja anclada',
    acciones.includes('onPress={() => onCapacidad(cap)}') && pantalla.includes('<AccionesDelComposer estadoDe={estadoDe} onCapacidad={pulsar} />'));
  const agente = leer('components/designReferencia/PanelDelAgente.tsx');
  check('I21) el Design Agent no es otro cerebro: sin campo propio ni brainService, y sigue por la caja de siempre (enviar → CreatorFlow)',
    !/<TextInput|brainService|useBrainChat|httpsCallable/.test(agente) && /const continuarConBrain = \(\) => \{[\s\S]*?enviar\(\);/.test(pantalla)
    && pantalla.includes('onContinuar={continuarConBrain}'));
  const FASES = ['QUEUED', 'RUNNING', 'PROGRESS', 'CANCEL_REQUESTED', 'COMPLETED', 'FAILED', 'CANCELLED'];
  check('I21) las siete fases visibles se derivan de los estados del registro; PROGRESS solo con avance informado',
    FASES.every((x) => W.CLAVE_DE_LA_FASE[x]) && W.faseVisible('PROCESSING') === 'RUNNING' && W.faseVisible('PROCESSING', true) === 'PROGRESS'
    && W.faseVisible('CANCEL_REQUESTED') === 'CANCEL_REQUESTED' && W.faseVisible('RECONCILING') === 'RUNNING' && W.faseVisible('QUEUED') === 'QUEUED' && W.faseVisible('IDLE') === null
    && U.ESTADOS_DE_TRABAJO.every((e) => W.faseVisible(e) === null || FASES.includes(W.faseVisible(e)))
    && leer('components/designReferencia/FranjaDeTrabajos.tsx').includes('faseVisible(estado, j.steps.some'));
  check('I21) del JobState del Core: pedir parar es CANCEL_REQUESTED (no CANCELLED), y nada cae fuera de las siete fases',
    W.FASE_DESDE_JOB_DEL_CORE.cancel_requested === 'CANCEL_REQUESTED' && Object.values(W.FASE_DESDE_JOB_DEL_CORE).every((x) => FASES.includes(x)));
  check('I21) el contrato del espacio de trabajo no nombra proveedores ni precios ni llama a nada',
    !PROVEEDOR.test(sinComentarios(ws)) && !PRECIO.test(sinComentarios(ws)) && !/from 'firebase|httpsCallable|Service'/.test(ws));
  check('I21) el teléfono es la misma pantalla: cada región tiene su sitio, sin segunda app',
    W.REGIONES.every((r) => ['pestana', 'pie', 'cabecera'].includes(W.MOVIL_COMPANERO[r])) && W.MOVIL_COMPANERO.barraContextual === 'pie');
  const clavesWs = [...Object.values(W.REGIONES_DEL_WORKSPACE).map((r) => r.clave), ...W.ACCIONES_DEL_COMPOSER.map((a) => a.clave),
    ...Object.values(W.CLAVE_DE_LA_FASE), ...W.PANELES_IZQUIERDOS.map((p) => p.clave),
    'designRef.wsBrief', 'designRef.wsBriefOpen', 'designRef.wsSuggestions', 'designRef.wsNoSuggestions', 'designRef.wsContinueWithBrain',
    'designRef.wsAgentHint', 'designRef.wsWriteFirst'].map((k) => k.slice('designRef.'.length));
  const sinTraducir = DICCIONARIOS.flatMap((d) => clavesWs.filter((k) => !new RegExp(`\\b${k}:`).test(leer(d))).map((k) => `${d}:${k}`));
  check('I21) todas las claves del espacio de trabajo existen en los dieciséis diccionarios', sinTraducir.length === 0, sinTraducir.slice(0, 5).join(', '));

  /* ── I22 · Bloque 3D: fuente única, world.generate, cobertura, versiones, estados del Job ── */
  const D3 = cargar('constants/design3d.ts');
  const X3 = cargar('utils/design3d.ts');
  const tres = D3.capacidades3D();
  const del3dEnElCore = CAPABILITY_CATALOG.filter((e) => e.category === '3d').map((e) => String(e.id));
  check('I22) las capacidades 3D son las del catálogo del Core (filtradas, no copiadas) más las propuestas; ninguna fila copiada',
    del3dEnElCore.every((id) => tres.some((x) => x.id === id && x.enElCatalogo && x.enElCatalogo === porIdDelCore.get(id)))
    && tres.filter((x) => !x.enElCatalogo).map((x) => x.id).sort().join() === [...C.CAPACIDADES_PROPUESTAS].sort().join()
    && !/e\('3d\.|status: 'DECLARED'|status: 'ROUTABLE'/.test(sinComentarios(leer('constants/design3d.ts'))), tres.map((x) => x.id).join(', '));
  check('I22) la clasificación usa solo los siete estados del dueño y nadie está IMPLEMENTADA sin una fila EXISTING',
    tres.every((x) => D3.CLASES_3D.includes(x.clase))
    && tres.filter((x) => x.clase === 'IMPLEMENTADA').every((x) => x.usadaPor.some((id) => C.capacidadPorId(id).estado === 'EXISTING')));
  check('I22) world.generate es PARCIAL (enrutable y apagado); 3d.export/3d.convert PENDING_BACKEND; las propuestas CANDIDATA',
    D3.clasificar3D('world.generate') === 'PARCIAL' && D3.clasificar3D('3d.export') === 'PENDING_BACKEND' && D3.clasificar3D('3d.convert') === 'PENDING_BACKEND'
    && D3.clasificar3D('3d.segment') === 'CANDIDATA' && D3.clasificar3D('3d.generate') === 'PENDING_PROVIDER');
  /* CONTROL: la clase se mueve con el catálogo: sin la entrada → CANDIDATA; sin filas → PLANEADA. */
  const catalogoFalso = CAPABILITY_CATALOG.filter((e) => String(e.id) !== '3d.rig');
  check('I22) CONTROL: la clase se mueve con el catálogo (sin la entrada → CANDIDATA; sin filas → PLANEADA)',
    D3.clasificar3D('3d.rig', catalogoFalso) === 'CANDIDATA' && D3.clasificar3D('render.scene') === 'PLANEADA');
  const capacidadTipada = leer('functions/src/core/capability.ts');
  check('I22) la lista tipada del Core NO se amplía con 3d.* (cambiaría el Router de producción): solo world.generate',
    /\| 'world\.generate'/.test(capacidadTipada) && !/'3d\.[a-z]+'/.test(sinComentarios(capacidadTipada)));
  const catalogados = new Set(CAPABILITY_CATALOG.map((e) => String(e.id)));
  check('I22) 3d.convert (representación) y 3d.export (salida externa) son dos capacidades distintas del catálogo, ninguna enrutable',
    D3.SEMANTICA_3D['3d.convert'] === 'representacion' && D3.SEMANTICA_3D['3d.export'] === 'salida_externa'
    && catalogados.has('3d.convert') && catalogados.has('3d.export')
    && !D3.tresEstados3D('3d.convert').enrutable && !D3.tresEstados3D('3d.export').enrutable
    && D3.COMPOSICIONES_3D.every((x) => C.capacidadPorId(x.fila).capacidades.join() === x.capacidades.join()));
  const variantesDeGenerar = CAPABILITY_CATALOG.find((e) => String(e.id) === '3d.generate')?.variants ?? [];
  check('I22) 3d.generate ≠ 3d.segment: segment divide lo existente y es propuesta; «parts» no es modalidad del contrato real',
    D3.SEMANTICA_3D['3d.generate'] === 'recurso_nuevo' && D3.SEMANTICA_3D['3d.segment'] === 'dividir_existente'
    && !catalogados.has('3d.segment') && C.CAPACIDADES_PROPUESTAS.includes('3d.segment')
    && !variantesDeGenerar.some((v) => v.key === 'parts') && C.capacidadPorId('generateInParts').variantePropuesta === 'parts'
    && C.capacidadPorId('splitParts').capacidades.join() === '3d.segment');
  check('I22) CAD no es una capacidad: ni en el catálogo ni en las propuestas; solo variante propuesta de sus filas',
    ![...catalogados, ...C.CAPACIDADES_PROPUESTAS].some((id) => /cad/i.test(id)) && D3.ATRIBUTOS_NO_CAPACIDAD.includes('cad')
    && ['cadFromText', 'cadFromImage', 'meshToCad'].every((id) => C.capacidadPorId(id).variantePropuesta === 'cad'));
  check('I22) catalogada ≠ implementada ≠ enrutable: ninguna 3d.* enrutable ni implementada; el mundo implementado pero gobernado',
    tres.filter((x) => String(x.id).startsWith('3d.')).every((x) => { const e = D3.tresEstados3D(String(x.id)); return !e.enrutable && !e.implementada; })
    && D3.tresEstados3D('3d.segment').catalogada === false && D3.tresEstados3D('world.generate').implementada === true
    && !/design\.generateWorld/.test(archivosDeLaApp().map((r) => leer(r)).join('\n')));
  const contratos = D3.CONTRATOS_3D.map((k) => D3.contrato3D(k));
  check('I22) el contrato 3D de Design cubre los nueve casos, cada uno con fila, Job, resultado, Asset y Version, sin nada implementado',
    contratos.length === 9 && contratos.every((e) => C.capacidadPorId(e.fila) && e.trabajo && e.resultado && e.material && e.version && e.clase !== 'IMPLEMENTADA')
    && contratos.every((e) => !e.capacidadDelCore || porIdDelCore.has(e.capacidadDelCore)) && !PROVEEDOR.test(sinComentarios(leer('constants/design3d.ts'))));
  check('I22) exportar GLB/USDZ es PENDING_BACKEND y reutiliza la descarga que existe; no hay exportador paralelo',
    D3.EXPORTACION_3D.estado === 'PENDING_BACKEND' && C.capacidadPorId(D3.EXPORTACION_3D.reutiliza)?.integracion.tipo === 'descargar'
    && !/USDZExporter|GLTFExporter|gltfExporter|toUsdz/.test(archivosDeLaApp().map((r) => leer(r)).join('\n')));
  /* world.generate desde Design */
  const mundo = X3.estadoDelMundoEnDesign();
  check('I22) world.generate desde Design: la misma capacidad (environment), el mismo lector del contrato, apagado y con su motivo real',
    X3.CONTEXTO_DEL_MUNDO_EN_DESIGN.capacidad === 'world.generate' && C.capacidadPorId('environment').capacidades.includes('world.generate')
    && W.ACCIONES_DEL_COMPOSER.some((a) => a.id === 'mundo' && a.capacidad === 'environment')
    && mundo.disponible === false && mundo.enrutable === true && mundo.motivos.includes('gobernado_por_el_servidor') && mundo.motivos.includes('referencia_cerrada')
    && X3.estadoDelMundoEnDesign(true, []).motivos.join() === 'no_enrutable'
    && /peticionDelMundo3D\(entrada, cuenta\)/.test(leer('utils/design3d.ts')) && !/httpsCallable|mundoService|'generateWorld'/.test(sinComentarios(leer('utils/design3d.ts')))
    && X3.destinoDelMundoDesdeDesign(' casa ', null).pantalla === 'Mundo3D' && X3.destinoDelMundoDesdeDesign(' casa ').params.descripcion === 'casa');
  check('I22) la hoja de la capacidad dice el estado real del mundo (motivos por clave)',
    leer('components/designReferencia/HojaDeCapacidad.tsx').includes('estadoDelMundoEnDesign().motivos.map'));
  /* Cobertura: error, reintento y cancelación; detecciones automáticas */
  const filaDe = (id) => U.coberturaDe(C.capacidadPorId(id));
  check('I22) la matriz tiene Error, Retry, Cancel Request y Cancelled; pedir parar ≠ cancelado; N/A sin trabajo',
    ['Error', 'Retry', 'Cancel Request', 'Cancelled'].every((k) => U.COLUMNAS_DE_COBERTURA.includes(k))
    && filaDe('concept')['Cancel Request'] === 'NO' && filaDe('download')['Cancel Request'] === 'N/A' && filaDe('environment')['Cancel Request'] === 'PENDING',
    `${filaDe('concept')['Cancel Request']} ${filaDe('download')['Cancel Request']} ${filaDe('environment')['Cancel Request']}`);
  const det = U.detecciones();
  check('I22) las once detecciones automáticas existen y solo nombran capacidades de Weë Design',
    U.DETECCIONES.length === 11 && U.DETECCIONES.every((k) => Array.isArray(det[k]) && det[k].every((id) => C.capacidadPorId(id)?.enDesign)));
  /* CONTROL: con trabajo y sin error ni resultado ni parada, se detecta; sin trabajo en el motor, también. */
  const dFalsa = U.deteccionesDe({ ...C.capacidadPorId('concept'), pasos: { error: 'NO', resultado: 'NO' } });
  const sinTrabajo = U.deteccionesDe({ ...C.capacidadPorId('concept'), pasos: { trabajo: 'NO' } });
  check('I22) CONTROL: las detecciones saltan (error sin UI, Job sin resultado, sin cancelación, capacidad sin Job)',
    dFalsa.includes('error_sin_ui') && dFalsa.includes('trabajo_sin_resultado') && dFalsa.includes('sin_cancelacion') && sinTrabajo.includes('capacidad_sin_trabajo')
    && U.deteccionesDe(C.capacidadPorId('model3dFromText')).includes('cancelacion_sin_confirmacion')
    && !U.deteccionesDe(C.capacidadPorId('environment')).includes('cancelacion_sin_confirmacion')
    && U.deteccionesDe(C.capacidadPorId('versions')).includes('version_sin_backend'),
    `${dFalsa.join(', ')} | ${sinTrabajo.join(', ')}`);
  /* Estados del Job: derivados del Core, CANCEL_REQUESTED ≠ CANCELLED */
  const jobCore = leer('functions/src/core/job.ts');
  const estadosDelCore = [...(jobCore.match(/export type JobState =([\s\S]*?);/)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  check('I22) todos los estados del Job Engine (core/job.ts) tienen fase visible, y ninguna sobra',
    estadosDelCore.length === 8 && estadosDelCore.every((e) => W.FASE_DESDE_JOB_DEL_CORE[e])
    && Object.keys(W.FASE_DESDE_JOB_DEL_CORE).every((e) => estadosDelCore.includes(e)), estadosDelCore.join(', '));
  const P = (f) => W.presentacionDeLaFase(f);
  check('I22) cada fase dice cargando/progreso/error/reintento/pedir parar/resultado/final, y solo lo suyo',
    W.FASES_VISIBLES.length === 7 && P('PROGRESS').progreso && !P('RUNNING').progreso && P('FAILED').reintento && P('FAILED').error
    && P('CANCEL_REQUESTED').cargando && !P('CANCEL_REQUESTED').pedirParar && !P('CANCEL_REQUESTED').final && P('COMPLETED').resultado
    && W.FASES_VISIBLES.filter((f) => P(f).final).sort().join() === 'CANCELLED,COMPLETED,FAILED');
  check('I22) CANCEL_REQUESTED solo pasa a CANCELLED si el Job Engine lo confirma; un final no se reabre; un estado desconocido no mueve nada',
    W.faseTrasElJobEngine('CANCEL_REQUESTED', 'running') === 'CANCEL_REQUESTED' && W.faseTrasElJobEngine('CANCEL_REQUESTED', 'waiting') === 'CANCEL_REQUESTED'
    && W.faseTrasElJobEngine('CANCEL_REQUESTED', 'cancelled') === 'CANCELLED' && W.faseTrasElJobEngine('CANCEL_REQUESTED', 'completed') === 'COMPLETED'
    && W.faseTrasElJobEngine('CANCELLED', 'running') === 'CANCELLED' && W.faseTrasElJobEngine('RUNNING', 'inventado') === 'RUNNING'
    && W.faseTrasElJobEngine('RUNNING', 'cancel_requested') === 'CANCEL_REQUESTED');
  /* Versiones: sin camino legítimo al linaje del Core, NO DISPONIBLES; nunca un éxito local */
  const x3 = leer('utils/design3d.ts');
  check('I22) versiones, restaurar y derivar: no disponibles, con la dependencia dicha; sin recorrer previousVersionId (no hay segundo sistema)',
    Object.values(X3.OPERACIONES_DE_VERSION).every((v) => v === 'no_disponible') && X3.DEPENDENCIA_DE_VERSIONES.restaurar.startsWith('servidor:')
    && !/previousVersionId/.test(sinComentarios(x3)) && !/lineaDeVersiones|derivadosDe/.test(sinComentarios(x3))
    && !/lineaDeVersiones|linaje/.test(leer('services/escena3d.ts'))
    && /<PanelDeVersiones \/>/.test(leer('components/designReferencia/Inspector.tsx'))
    && !/onPress|setSeleccion|notify/.test(leer('components/designReferencia/PanelDeVersiones.tsx')));
  check('I22) el espejo de Filmmaker no se amplió: sigue sin el linaje',
    !existe('services/filmmaker/espejo/core/content/linaje.ts') && !/linaje/.test(leer('scripts/espejo-filmmaker.mjs')));
  /* Cancelar en CreatorFlow: contrato y puerta, sin backend; nada se marca cancelado desde React */
  const reactDesign = COMPONENTES.map((r) => leer(r)).join('\n') + pantalla;
  check('I22) cancelar CreatorFlow: no disponible (falta creator/index.ts), y ningún componente escribe CANCELLED ni cancelled',
    W.CANCELAR_CREATORFLOW.disponible === false && W.CANCELAR_CREATORFLOW.dependencia === 'functions/src/creator/index.ts'
    && !/(status|estado|fase)\s*[:=]\s*'(cancelled|CANCELLED)'|set\w*\(\s*'(cancelled|CANCELLED)'/.test(reactDesign)
    && C.capacidadPorId('concept').cancelar === 'no_existe');
  const claves3d = ['actWorld', 'worldGateClosed', 'worldNotRoutable', 'worldGoverned', 'verTitle', 'verUnavailable', 'verRestorePending', 'verDeriveHint'];
  const faltan3d = DICCIONARIOS.flatMap((d) => claves3d.filter((k) => !new RegExp(`\\b${k}:`).test(leer(d))).map((k) => `${d}:${k}`));
  check('I22) las claves del bloque 3D existen en los dieciséis diccionarios', DICCIONARIOS.length === 16 && faltan3d.length === 0, faltan3d.slice(0, 5).join(', '));

  /* ── I23 · Corrección de UX tras la captura (sin backend) ── */
  const piezas = leer('components/designReferencia/piezas.tsx');
  check('I23) las pestañas son una fila que no crece en alto (sin óvalos): flexGrow 0, alto fijo y objetivo táctil',
    /style=\{estilos\.filaDePestanas\}/.test(piezas) && /filaDePestanas: \{ flexGrow: 0, flexShrink: 0 \}/.test(piezas)
    && /pestana: \{ height: 36, minHeight: 36, minWidth: 44/.test(piezas));
  const lienzoSrc = leer('components/designReferencia/Lienzo.tsx');
  check('I23) el lienzo y la caja van en flujo (el lienzo no encoge por debajo de lo suyo y la columna se desplaza) y no usa posición absoluta ni zIndex para la caja',
    /flex: \{ flexGrow: 1, flexShrink: 0 \}/.test(lienzoSrc) && (pantalla.match(/<ScrollView style=\{estilos\.centro\} contentContainerStyle=\{estilos\.centroDentro\}/g) ?? []).length === 2 && /minHeight: scale\(112\)/.test(lienzoSrc)
    && !/zIndex|position: 'absolute'/.test(sinComentarios(lienzoSrc)) && !/zIndex|marginTop: -/.test(sinComentarios(pantalla)));
  const accionesSrc = leer('components/designReferencia/AccionesDelComposer.tsx');
  check('I23) a 800 px las acciones se alcanzan: fila desplazable con indicador visible, sin crecer en alto, todas renderizadas',
    /showsHorizontalScrollIndicator style=\{estilos\.contenedor\}/.test(accionesSrc) && /contenedor: \{ flexGrow: 0, flexShrink: 0 \}/.test(accionesSrc)
    && /ACCIONES_DEL_COMPOSER\.map/.test(accionesSrc) && !/slice\(/.test(accionesSrc));
  const hojaSrc = leer('components/designReferencia/HojaDeCapacidad.tsx');
  check('I23) la hoja enseña el NOMBRE de lo que usa, nunca el id del Core (world.generate no se pinta)',
    !/cap\.capacidades\.join/.test(hojaSrc) && /clavesDeLoQueUsa\(cap\.capacidades\)/.test(hojaSrc)
    && U.clavesDeLoQueUsa(['world.generate']).join() === 'creaciones.kindWorld'
    && U.clavesDeLoQueUsa(['3d.generate', '3d.edit', 'image.generate']).join() === 'designRef.famModel3d,creaciones.kindImage'
    && C.CAPACIDADES_DE_DESIGN.every((c) => U.clavesDeLoQueUsa(c.capacidades).length === new Set(c.capacidades.map((x) => String(x).split('.')[0])).size)
    && DICCIONARIOS.every((d) => !/world\.generate/.test(leer(d))));
  check('I23) world.generate sigue sin poder ejecutarse desde Design (enrutable en el catálogo, apagado y gobernado aquí)',
    X3.estadoDelMundoEnDesign(true).disponible === false && X3.estadoDelMundoEnDesign(true).motivos.join() === 'gobernado_por_el_servidor');
  const es = leer('i18n/textos/es/designRef.ts');
  check('I23) la simulación se dice antes de pulsar: insignia «Simulado» + «no se genera nada, no se cobra nada y no se llama a nadie»',
    /<Insignia clave="designRef\.simulatedBadge" tono="aviso" \/>\s*<Pista clave="designRef\.simBanner" \/>/.test(hojaSrc)
    && /simBanner: 'Simulación: no se genera nada, no se cobra nada y no se llama a nadie\.'/.test(es)
    && !/simulate: '[^']*(crear|generar)/i.test(es));
  const franjaSrc = leer('components/designReferencia/FranjaDeTrabajos.tsx');
  const F = U;
  check('I23) trabajo fallido: claramente fallido, «Reintentar: aún no disponible» y ningún botón que finja reintentar',
    W.REINTENTAR_CREATORFLOW.disponible === false && F.fallidoSinReintento({ status: 'failed' }) && !F.fallidoSinReintento({ status: 'done' })
    && /j\.status === 'failed' \? 'aviso'/.test(franjaSrc) && !/onPress=\{[^}]*reintentar[^}]*\}[^<]*wsRetryUnavailable/i.test(franjaSrc)
    && !/<BotonDeTexto[^>]*wsRetry/.test(reactDesign) && U.deteccionesDe(C.capacidadPorId('concept')).includes('sin_cancelacion'));
  check('I23) ningún componente de React escribe cancelled/CANCELLED (tras la corrección)',
    !/(status|estado|fase)\s*[:=]\s*'(cancelled|CANCELLED)'|set\w*\(\s*'(cancelled|CANCELLED)'/.test(COMPONENTES.map((r) => leer(r)).join('\n') + pantalla));
  const clavesUx = ['famVision', 'sheetUses', 'wsRetryUnavailable'];
  const faltanUx = DICCIONARIOS.flatMap((d) => clavesUx.filter((k) => !new RegExp(`\\b${k}:`).test(leer(d))).map((k) => `${d}:${k}`));
  check('I23) las claves de la corrección existen en los dieciséis diccionarios, y sheetCore (el id) ya no', faltanUx.length === 0
    && DICCIONARIOS.every((d) => !/\bsheetCore:/.test(leer(d))), faltanUx.slice(0, 5).join(', '));

  /* ── I24 · Corrección final: pie a 800 px, D7, familia 3D, tableta ── */
  const dsrc = leer('screens/DesignReferenciaScreen.tsx');
  check('I24) a 800 px el lienzo tiene su alto completo y la página se desplaza (sin altura fija ni scroll anidado en columnas)',
    !/altoDelLienzo \+ scale\(120\)/.test(dsrc) && /lienzo\(altoDelLienzo\)/.test(dsrc));
  check('I24) D7 no se enseña: la hoja muestra el estado en palabras, nunca los ids de decisión',
    !/cap\.decisiones\.join/.test(leer('components/designReferencia/HojaDeCapacidad.tsx')) && /sheetDecisionOpen/.test(leer('components/designReferencia/HojaDeCapacidad.tsx')));
  check('I24) la familia 3D tiene nombre de producto (Modelo 3D), y el id interno no cambia',
    U.clavesDeLoQueUsa(['3d.generate']).join() === 'designRef.famModel3d' && C.capacidadPorId('model3dFromText').capacidades.includes('3d.generate'));
  const claves24 = ['sheetDecisionOpen', 'famModel3d'];
  const faltan24 = DICCIONARIOS.flatMap((d) => claves24.filter((k) => !new RegExp(`\\b${k}:`).test(leer(d))).map((k) => `${d}:${k}`));
  check('I24) las claves nuevas existen en los dieciséis diccionarios', faltan24.length === 0, faltan24.slice(0, 5).join(', '));
  check('I24) «qué produce» de la familia 3D se nombra igual que la familia («Modelo 3D»), sin tocar el registro',
    U.CLAVE_DE_LO_QUE_PRODUCE.model3d === 'designRef.famModel3d' && U.CLAVE_DE_LO_QUE_PRODUCE.world === C.CLAVE_DE_LA_SALIDA.world
    && !/CLAVE_DE_LA_SALIDA\[/.test(leer('components/designReferencia/HojaDeCapacidad.tsx') + leer('components/designReferencia/Lienzo.tsx') + leer('components/designReferencia/Inspector.tsx')));
  /* ── I25 · Micro-fix de tableta: las pestañas de la columna lateral estrecha bajan de línea, nada más ── */
  const pz = leer('components/designReferencia/piezas.tsx');
  const pb = leer('components/designReferencia/PanelDeBiblioteca.tsx');
  check('I25) Pestanas: «envolver» es opcional y por defecto sigue siendo la fila que se desplaza (escritorio sin cambios)',
    /envolver = false/.test(pz) && /\bif \(envolver\)/.test(pz) && /flexWrap: 'wrap'/.test(pz) && /horizontal showsHorizontalScrollIndicator=\{false\} style=\{estilos\.filaDePestanas\}/.test(pz));
  check('I25) la biblioteca pasa la opción a sus dos filas de pestañas, y no a otra cosa',
    /envolver=\{p\.envolverPestanas\}/.test(pb) && (pb.match(/envolver=\{p\.envolverPestanas\}/g) ?? []).length === 2);
  check('I25) la pantalla la activa solo en la columna lateral estrecha (dos columnas y no escritorio): la tableta',
    /const lateralEstrecha = disposicion === 'dosColumnas' && !isDesktop;/.test(dsrc)
    && (dsrc.match(/envolver=\{lateralEstrecha\}/g) ?? []).length === 2 && (dsrc.match(/envolverPestanas=\{lateralEstrecha\}/g) ?? []).length === 1);
  check('I25) sin estrechez, las pestañas no cambian: ningún «envolver» fijo a true ni en la pantalla ni en la biblioteca',
    !/envolver(Pestanas)?=\{true\}/.test(dsrc + pb) && !/envolver = true/.test(pz));

  /* ── I26 · DEC-05: la franja busca sus trabajos paginando por createdAt, y no pierde los de su experiencia ── */
  const PT = cargar('utils/paginarTrabajos.ts');
  const CS = leer('services/creatorService.ts');
  const trabajo = (id, createdAt, experienceId) => ({ id, createdAt, experienceId });
  /* Un índice de Firestore en miniatura: userId fijo, createdAt descendente, desempate por id. El cursor es el documento. */
  const indiceFalso = (trabajos) => {
    const orden = [...trabajos].sort((a, b) => (b.createdAt - a.createdAt) || (a.id < b.id ? 1 : -1));
    const lecturas = [];
    const pedirPagina = async (cursor, tamano) => {
      let desde = 0;
      if (cursor !== undefined) {
        const i = orden.findIndex((t) => t.id === cursor.id);
        if (i < 0) throw new Error('cursor desconocido');
        desde = i + 1;
      }
      const pagina = orden.slice(desde, desde + tamano);
      lecturas.push({ desde, cursor: cursor?.id ?? null });
      return { trabajos: pagina, cursor: pagina[pagina.length - 1] };
    };
    return { pedirPagina, lecturas, orden };
  };
  const propia = (t) => t.experienceId === 'design';
  const ajenosYPropios = (ajenos, propios) => [
    ...Array.from({ length: ajenos }, (_, i) => trabajo(`a${i}`, 10000 - i, 'chef')),
    ...Array.from({ length: propios }, (_, i) => trabajo(`p${i}`, 100 - i, 'design')),
  ];
  const enOrden = (items) => items.every((t, i) => i === 0 || items[i - 1].createdAt >= t.createdAt);
  const sinRepetir = (items) => new Set(items.map((t) => t.id)).size === items.length;

  /* El caso del bug, tal cual: 60 ajenos más recientes que los 3 propios. */
  const caso = indiceFalso(ajenosYPropios(60, 3));
  const antes = caso.orden.slice(0, 30).filter(propia);
  const despues = await PT.buscarTrabajos({ pedirPagina: caso.pedirPagina, pertenece: propia, cantidad: 30, tamano: 30 });
  check('I26) CONTROL: con 60 ajenos delante, la consulta de siempre (30 y filtrar) no encuentra ninguno de los 3 propios',
    antes.length === 0);
  check('I26) 60 ajenos + 3 propios: se devuelven los 3 propios, en orden, y ningún ajeno',
    despues.items.map((t) => t.id).join() === 'p0,p1,p2' && despues.items.every(propia));
  check('I26) el caso 60 + 3 atraviesa páginas con cursor real: la segunda lectura parte del último documento de la primera',
    despues.paginas === 3 && caso.lecturas[1].desde === 30 && caso.lecturas[1].cursor === 'a29' && despues.agotado === true);

  /* Casos mínimos de la matriz: cero, menos de una página, exactamente una, mezclados entre páginas, ausencia total. */
  const vacio = await PT.buscarTrabajos({ pedirPagina: indiceFalso([]).pedirPagina, pertenece: propia, cantidad: 30, tamano: 30 });
  check('I26) cero trabajos: lista vacía, una sola lectura y agotada', vacio.items.length === 0 && vacio.paginas === 1 && vacio.agotado === true);
  const pocos = await PT.buscarTrabajos({ pedirPagina: indiceFalso(ajenosYPropios(3, 2)).pedirPagina, pertenece: propia, cantidad: 30, tamano: 30 });
  check('I26) menos de una página: devuelve los propios y no pide más', pocos.items.map((t) => t.id).join() === 'p0,p1' && pocos.paginas === 1 && pocos.agotado === true);
  const justa = await PT.buscarTrabajos({ pedirPagina: indiceFalso(ajenosYPropios(26, 4)).pedirPagina, pertenece: propia, cantidad: 30, tamano: 30 });
  check('I26) exactamente una página llena: devuelve los 4 propios, sin repetirlos, y la página vacía que sigue marca el final',
    justa.items.length === 4 && sinRepetir(justa.items) && justa.paginas === 2 && justa.agotado === true);
  const repartidos = indiceFalso(Array.from({ length: 100 }, (_, i) => trabajo(`d${i}`, 1000 - i, [5, 40, 75].includes(i) ? 'design' : 'chef')));
  const mezclados = await PT.buscarTrabajos({ pedirPagina: repartidos.pedirPagina, pertenece: propia, cantidad: 30, tamano: 30 });
  check('I26) propios repartidos entre páginas: se recogen todos, en orden, sin repetir',
    mezclados.items.map((t) => t.id).join() === 'd5,d40,d75' && sinRepetir(mezclados.items) && mezclados.paginas === 4 && enOrden(mezclados.items));
  const ausente = await PT.buscarTrabajos({ pedirPagina: indiceFalso(ajenosYPropios(200, 0)).pedirPagina, pertenece: propia, cantidad: 5, tamano: 30, maxPaginas: 6 });
  check('I26) ausencia total: devuelve lista vacía y se para en el límite de páginas (sin leer sin fin)',
    ausente.items.length === 0 && ausente.paginas === 6 && ausente.leidos === 180 && ausente.agotado === false);
  const colmado = indiceFalso(Array.from({ length: 60 }, (_, i) => trabajo(`d${i}`, 1000 - i, 'design')));
  const parada = await PT.buscarTrabajos({ pedirPagina: colmado.pedirPagina, pertenece: propia, cantidad: 8, tamano: 30 });
  check('I26) al reunir lo pedido se detiene: 8 de 8 en una sola lectura, sin pedir la página siguiente',
    parada.items.map((t) => t.id).join() === 'd0,d1,d2,d3,d4,d5,d6,d7' && parada.paginas === 1 && parada.agotado === false);
  const repetidor = await PT.buscarTrabajos({
    pedirPagina: async () => ({ trabajos: colmado.orden.slice(0, 30), cursor: colmado.orden[29] }), pertenece: propia, cantidad: 50, tamano: 30, maxPaginas: 3,
  });
  check('I26) CONTROL: si una página se repite, no hay duplicados y la búsqueda termina por su límite',
    sinRepetir(repetidor.items) && repetidor.items.length === 30 && repetidor.paginas === 3);
  check('I26) el límite de seguridad es finito y razonable (páginas y tamaño acotados)',
    Number.isInteger(PT.MAX_PAGINAS_DE_TRABAJOS) && PT.MAX_PAGINAS_DE_TRABAJOS >= 1 && PT.MAX_PAGINAS_DE_TRABAJOS <= 10
    && Number.isInteger(PT.TAMANO_DE_PAGINA_DE_TRABAJOS) && PT.TAMANO_DE_PAGINA_DE_TRABAJOS >= 1 && PT.TAMANO_DE_PAGINA_DE_TRABAJOS <= 50);

  /* Chef, Especialista y Design: en el caso normal, la misma lista que antes en una sola lectura; y donde antes faltaban, ahora están. */
  const mezcla = () => indiceFalso(Array.from({ length: 50 }, (_, i) => trabajo(`m${i}`, 5000 - i, ['chef', 'design', 'home', 'otra'][i % 4])));
  /* Chef: aquí hay 10 de los 20 primeros, así que el caso normal es el que se pinta. */
  const mezclaDensa = () => indiceFalso(Array.from({ length: 50 }, (_, i) => trabajo(`m${i}`, 5000 - i, ['chef', 'chef', 'design', 'otra'][i % 4])));
  const chefAntes = mezclaDensa().orden.slice(0, 20).filter((t) => t.experienceId === 'chef').slice(0, 8);
  const chefAhora = await PT.buscarTrabajos({ pedirPagina: mezclaDensa().pedirPagina, pertenece: (t) => t.experienceId === 'chef', cantidad: 8, tamano: 20 });
  check('I26) Chef: en el caso normal, los mismos 8 trabajos y en una sola lectura de 20',
    JSON.stringify(chefAhora.items.map((t) => t.id)) === JSON.stringify(chefAntes.map((t) => t.id)) && chefAhora.paginas === 1);
  const otraAntes = mezcla().orden.slice(0, 20).filter((t) => t.experienceId === 'otra').slice(0, 4);
  const otraAhora = await PT.buscarTrabajos({ pedirPagina: mezcla().pedirPagina, pertenece: (t) => t.experienceId === 'otra', cantidad: 4, tamano: 20 });
  check('I26) Especialista: en el caso normal, los mismos 4 trabajos y en una sola lectura de 20',
    JSON.stringify(otraAhora.items.map((t) => t.id)) === JSON.stringify(otraAntes.map((t) => t.id)) && otraAhora.paginas === 1);
  const disenoAntes = mezcla().orden.slice(0, 30).filter(U.esDeDesign);
  const disenoAhora = await PT.buscarTrabajos({ pedirPagina: mezcla().pedirPagina, pertenece: U.esDeDesign, cantidad: 30, tamano: 30 });
  const prefijo = disenoAhora.items.length >= disenoAntes.length && disenoAntes.every((t, i) => disenoAhora.items[i].id === t.id);
  check('I26) Design: lo que se veía antes es el principio de la lista nueva, en el mismo orden, y ahora aparecen los que faltaban',
    prefijo && disenoAhora.items.length > disenoAntes.length && disenoAhora.items.length <= 30);

  /* Estáticas: la consulta usa el índice que ya existe, no añade ningún where por experiencia, y las pantallas están cableadas. */
  check('I26) creatorService: búsqueda por userId + createdAt con startAfter, sin where por experiencia (no hay índice nuevo)',
    /getMyJobsDe:/.test(CS) && /where\('userId', '==', uid\)/.test(CS) && /orderBy\('createdAt', 'desc'\)/.test(CS)
    && /startAfter\(cursor as DocumentSnapshot\)/.test(CS) && !/where\('experienceId'/.test(CS));
  check('I26) getMyJobs se queda como estaba: la usa WeeCreatorScreen, que no filtra por experiencia',
    /getMyJobs: async \(uid: string, max = 10\)/.test(CS) && /limit\(max\)/.test(leer('services/creatorService.ts'))
    && /creatorService\s*\.getMyJobs\(user\.uid, 6\)/.test(leer('screens/WeeCreatorScreen.tsx')));
  const consumidores = [leer('screens/ChefScreen.tsx'), leer('screens/SpecialistScreen.tsx'), pantalla];
  check('I26) Chef, Especialista y Design usan la misma búsqueda y ya no filtran después de un límite fijo',
    consumidores.every((s) => /getMyJobsDe\(/.test(s) && !/getMyJobs\(user\.uid, (20|30)\)/.test(s) && !/\.filter\(\(job\) => job\.experienceId/.test(s)));
  check('I26) Design pide 30 trabajos como antes (el límite visual de la franja) y su predicado es el de siempre (design y home)',
    /getMyJobsDe\(user\.uid, esDeDesign, 30, 30\)/.test(pantalla) && U.EXPERIENCIAS_DE_DESIGN.length === 2 && typeof U.esDeDesign === 'function' && !('sonDeDesign' in U));

  /* Ampliación autorizada: las rutas que no pintan la lista no consultan trabajos (Brain, business, studio, design, chef y sin especialista). */
  const ESP = leer('screens/SpecialistScreen.tsx');
  const definicion = (ESP.match(/const sinListaDeTrabajos = ([^;]+);/) || [])[1] || '';
  const terminosDeLaGuarda = definicion.split('||').map((s) => s.trim());
  const salidasAnticipadas = [...ESP.matchAll(/^  if \(([^)]*)\) return </gm)].map((m) => m[1].trim());
  check('I26) Especialista: la guarda cubre exactamente las rutas que no pintan la lista (sin especialista y cada salida anticipada), y ninguna más',
    terminosDeLaGuarda[0] === '!spec' && terminosDeLaGuarda.length === salidasAnticipadas.length + 1
    && salidasAnticipadas.every((s) => terminosDeLaGuarda.includes(s)) && salidasAnticipadas.length === 5);
  check('I26) Especialista: la guarda va ANTES de getMyJobsDe y es la única que decide si se consulta',
    ESP.includes('if (!user || sinListaDeTrabajos) {') && ESP.indexOf('if (!user || sinListaDeTrabajos)') < ESP.indexOf('getMyJobsDe(user.uid'));
  check('I26) Especialista: las rutas con lista siguen consultando con su experiencia, cuatro trabajos y página de veinte',
    /getMyJobsDe\(user\.uid, \(job\) => job\.experienceId === id, 4, 20\)/.test(ESP) && /if \(!cancelled\) setMyJobs\(jobs\);/.test(ESP));
  check('I26) Chef: su consulta propia sigue (ocho trabajos, página de veinte) y Especialista no la duplica para «chef»',
    /getMyJobsDe\(user\.uid, \(job\) => job\.experienceId === 'chef', 8, 20\)/.test(leer('screens/ChefScreen.tsx')) && terminosDeLaGuarda.includes("id === 'chef'"));
  const hookEsp = leer('hooks/useEspecialista.ts');
  check('I26) el especialista se resuelve de forma síncrona (useMemo, sin efectos ni async): «!spec» es fijo para cada id y no llega tarde',
    /useMemo/.test(hookEsp) && !/useEffect|async|await/.test(hookEsp));
  /* La guarda, evaluada de verdad sobre el catálogo real: cada id de especialista, y uno que no existe. */
  const catalogo = leer('constants/specialists.ts');
  const cuerpoDelCatalogo = catalogo.slice(catalogo.indexOf('export const SPECIALISTS'), catalogo.indexOf('export const SPECIALIST_ORDER'));
  const idsDelCatalogo = [...cuerpoDelCatalogo.matchAll(/^  ([a-z]+): \{/gm)].map((m) => m[1]);
  const saleAntes = (spec, id) => new Function('spec', 'isBrain', 'id', `return ${definicion};`)(spec, id === 'brain', id);
  const excluidos = idsDelCatalogo.filter((id) => saleAntes({}, id)).sort();
  const conLista = idsDelCatalogo.filter((id) => !saleAntes({}, id)).sort();
  check('I26) guarda sobre el catálogo real: se leen los once especialistas (sin atajos que den una lista vacía)', idsDelCatalogo.length === 11);
  check('I26) guarda sobre el catálogo real: sale antes de consultar exactamente brain, business, studio, design y chef',
    JSON.stringify(excluidos) === JSON.stringify(['brain', 'business', 'chef', 'design', 'studio']));
  check('I26) guarda sobre el catálogo real: photo, music, home, beauty, writer y travel (las que pintan la lista) llegan a getMyJobsDe',
    JSON.stringify(conLista) === JSON.stringify(['beauty', 'home', 'music', 'photo', 'travel', 'writer']));
  check('I26) sin especialista (id que no existe, spec nulo) también sale antes de consultar', saleAntes(null, 'inexistente') === true);
  check('I26) Especialista tiene una sola llamada a getMyJobsDe, y va después de la guarda (ninguna consulta antes de un early return)',
    ESP.split('getMyJobsDe(user.uid').length - 1 === 1 && ESP.indexOf('getMyJobsDe(user.uid') > ESP.indexOf('if (!user || sinListaDeTrabajos)'));

  /* ── I27 · DEC-06: la disponibilidad la dice el SERVIDOR, por cuenta; el catálogo ya no decide ─────────────── */
  const SERVIDOR_SI = () => true;
  const SERVIDOR_NO = () => false;
  const sinCapacidad = (c) => ({ ...c, capacidades: [] });
  const conCapacidadOk = caps.find((c) => c.capacidades.length > 0 && U.estadoDeLaCapacidad(sinCapacidad(c), U.SIN_SELECCION).disponible);
  check('I27) hay al menos una fila con capacidad del servidor que lo estático deja disponible (para verificar lo demás)', !!conCapacidadOk);
  if (conCapacidadOk) {
    check('I27) sin respuesta del servidor, cierra: una fila con capacidad no está disponible por defecto',
      U.estadoDeLaCapacidad(conCapacidadOk, U.SIN_SELECCION).disponible === false);
    check('I27) con el servidor confirmando, queda disponible; con el servidor negando, no, y el motivo es el público, no un proveedor',
      U.estadoDeLaCapacidad(conCapacidadOk, U.SIN_SELECCION, undefined, SERVIDOR_SI).disponible === true
      && U.estadoDeLaCapacidad(conCapacidadOk, U.SIN_SELECCION, undefined, SERVIDOR_NO).motivo === 'weeai.errNotAvailable');
    check('I27) el catálogo ROUTABLE ya no decide: con todo el catálogo enrutable y el servidor negando, no está disponible',
      U.estadoDeLaCapacidad(conCapacidadOk, U.SIN_SELECCION, TODO_ENRUTABLE, SERVIDOR_NO).disponible === false);
  }
  const sinCapacidadDelServidor = caps.filter((c) => c.capacidades.length === 0);
  check('I27) las filas sin capacidad del servidor siguen sus reglas estáticas, y no dependen del servidor',
    sinCapacidadDelServidor.length > 0 && sinCapacidadDelServidor.every((c) =>
      U.estadoDeLaCapacidad(c, U.SIN_SELECCION, undefined, SERVIDOR_NO).disponible === U.estadoDeLaCapacidad(c, U.SIN_SELECCION, undefined, SERVIDOR_SI).disponible));
  const consulta = U.capacidadesQueConsultaDesign();
  check('I27) la lista que se pide al servidor es la de las filas de Design: sin repetidos y con text.generate (la de Generar)',
    consulta.length > 0 && new Set(consulta).size === consulta.length && consulta.includes('text.generate'));
  check('I27) la pantalla consulta al servidor en el espacio de trabajo (no en la vista cerrada) y pasa la respuesta a la estructura',
    /disponibilidadService\s*\.consultar\(capacidadesQueConsultaDesign\(\)\)/.test(pantalla)
    && /estadoDeLaCapacidad\(cap, resumenDeSeleccion\(seleccion, urlDe\), undefined, disponibleEnServidor\)/.test(pantalla)
    && !/disponibilidadService/.test(pantalla.slice(pantalla.indexOf('const ReferenciaCerrada'), pantalla.indexOf('const EspacioDeTrabajo'))));
  const servicio = leer('services/disponibilidadService.ts');
  check('I27) el servicio llama al callable del servidor por su nombre, y solo lee (sin escrituras)',
    /httpsCallable[\s\S]*'disponibilidadDeCapacidades'/.test(servicio) && !/\.(set|update|add|delete)\(/.test(servicio));
  check('I27) el callable está exportado por el índice de Functions con ese nombre',
    /export \{ disponibilidadDeCapacidades \} from '\.\/engine\/disponibilidad';/.test(leer('functions/src/index.ts')));
  const faltaWeeai = DICCIONARIOS.filter((d) => !/errNotAvailable:/.test(leer(d.replace('designRef', 'weeai'))));
  check('I27) la frase pública de «no disponible» existe en los dieciséis idiomas (weeai.errNotAvailable)', faltaWeeai.length === 0, faltaWeeai.slice(0, 3).join(', '));
};
