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
  const disponibleAlgunaVez = (c, estado = U.estadoDeLaCapacidad) => SELECCIONES.some((s) => estado(c, s).disponible || estado(c, s, TODO_ENRUTABLE).disponible);
  const bloqueadas = caps.filter((c) => BLOQUEO.has(c.elegibilidad));
  const mal = bloqueadas.filter((c) => disponibleAlgunaVez(c));
  check('I7) lo pendiente de autorización, en revisión o sin candidato nunca se ofrece como disponible (ni con todo el catálogo enrutable)',
    bloqueadas.length > 0 && mal.length === 0, mal.map((c) => c.id).join(', ') || `${bloqueadas.length} bloqueadas`);
  const propuestas = caps.filter((c) => c.variantePropuesta || c.capacidades.some((id) => C.CAPACIDADES_PROPUESTAS.includes(id)));
  check('I7) ni una propuesta (capacidad o variante que el Core todavía no tiene)', propuestas.length > 0 && propuestas.every((c) => !disponibleAlgunaVez(c)));
  const disponibles = caps.filter((c) => SELECCIONES.some((s) => U.estadoDeLaCapacidad(c, s).disponible));
  check('I7) lo disponible tiene manejador de verdad y es de Weë Design', disponibles.every((c) => c.enDesign && c.integracion.tipo !== 'ninguna'),
    disponibles.map((c) => c.id).join(', '));
  /* Una capacidad conectada de verdad que pasara a «pendiente de autorización»: la disponibilidad real la apaga; una que ignorase la elegibilidad, no. */
  const ignoraLaElegibilidad = (c, s, cat) => U.estadoDeLaCapacidad({ ...c, elegibilidad: 'cadena_de_wee' }, s, cat);
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
    && U.COLUMNAS_DE_COBERTURA.length === 12);
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
  check('I18) a Weë Brain se llega por CreatorFlow, con el destino de siempre (destinoDeIntencion), sin otro router',
    /destinoDeIntencion\(/.test(logica) && /navigation\.navigate\('CreatorFlow'/.test(pantalla) && !/brainService|useBrainChat|creatorChat\b/.test(CODIGO.map(leer).join('\n')));
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
      case 'EXISTING': return U.estadoDeLaCapacidad(c).disponible && e.falta.length === 0;
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
};
