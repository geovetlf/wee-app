/*
 * H5/H2 · EL MODELO PURO DEL ÍNDICE DE REFERENCIAS Y DEL CERROJO DEL OBJETO (`core/media/indice.ts`).
 *
 * Sin Firestore, sin Storage y sin red: la identidad de una fila, las filas que exige una ficha, cada transición del
 * cerrojo (válida y cada inválida, con su error tipado), cada guarda, la flag (cerrada por defecto y si falla), la
 * cobertura, los consumidores (D-G) y CADA motivo por el que la decisión de borrado físico protege. Y las clases de la
 * reconciliación del índice (`core/media/reconciliacion.ts`), una a una y sobre un estado limpio.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const LIB = process.env.WEE_LIB_ACTIVOS || path.resolve(here, '../lib');
const core = require(path.join(LIB, 'core/index.js'));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const {
  refIdDeFila, leerRefIdDeFila, filaDeReferenciaValida, filasEsperadasDeLaFicha, claveDelIndiceEsDeLaCuenta, claveDeUsuarioEsDeLaCuenta,
  registroDelIndiceValido, registroEsDeLaCuenta, objetoValido, referenciaDelObjeto, claveDelObjeto,
  leerFlagDelAlmacenDeActivos, flagAbiertaPara, marcaDeCobertura, coberturaVigente, naceCubierto, MARGEN_DE_RELOJ_DE_COBERTURA_MS,
  pasarACandidato, rescatar, reclamar, cerrar, devolver, comoCrearFilaViva, versionDe,
  REGISTRO_DE_CONSUMIDORES, resumirConsumidores, CONSUMIDORES_DE_MATERIAL,
  decidirBorradoFisico, POLITICA_DEL_BORRADO_INMEDIATO, POLITICA_DEL_BARRIDO_DEL_INDICE, GRACIA_DE_CANDIDATO_POR_DEFECTO_MS,
  vistaParaElBarrido, reconciliarIndiceDeCuenta, CLASES_DEL_INDICE, esPrecondicionFallida, sabeBorrarConGeneracion, CAPACIDADES_DE_MC1,
  ESTADOS_DEL_OBJETO,
} = core;

const huella = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const DIA = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;
const ANA = 'uAna';
const BETO = 'uBeto';
const A1 = 'asset_' + 'a'.repeat(32);
const A2 = 'asset_' + 'b'.repeat(32);

/* Un registro de objeto de Media Cloud (`accounts/`) o del Storage de Weë (`users/`), en el estado que se pida. */
const registro = (o = {}) => {
  const cuenta = o.cuenta ?? ANA;
  const objectKey = o.objectKey ?? claveDelObjeto(cuenta, o.assetId ?? 'mat1', 'original');
  const providerId = o.providerId ?? 'fake';
  const ref = { provider: providerId, ...(o.bucket ? { bucket: o.bucket } : {}), objectKey };
  return {
    objectRef: referenciaDelObjeto(huella, ref),
    providerId, accountId: o.accountId ?? cuenta, assetId: o.assetId ?? 'mat1', pieza: 'original',
    ...(o.bucket ? { bucket: o.bucket } : {}),
    objectKey, estado: 'guardado', createdAt: T0, updatedAt: T0,
    ...(o.extra ?? {}),
  };
};
const MARCA = T0 + 10;
const candidatoListo = (extra = {}) => registro({ extra: {
  estado: 'candidato', candidatoDesde: T0 + 100, version: 3, generacion: '77', cobertura: 'completa', coberturaEn: T0 + 50, ...extra,
} });
const SIN_USOS = { estado: 'sin_usos' };

/* ═══ A · LA IDENTIDAD DE UNA FILA ═══════════════════════════════════════════ */
console.log('\n── A · refId = <clase>_<assetId>_<pieza> ──');
{
  check('A1 material/original', refIdDeFila('material', A1, 'original') === `material_${A1}_original`);
  check('A2 version/original y variante/miniatura', refIdDeFila('version', A1, 'original') === `version_${A1}_original` && refIdDeFila('variante', A1, 'thumbnail') === `variante_${A1}_thumbnail`);
  check('A3 las cuatro variantes y el consumidor', ['thumbnail', 'poster', 'preview', 'transcoded'].every((p) => refIdDeFila('variante', A1, p))
    && refIdDeFila('consumidor', A1, 'original') && refIdDeFila('consumidor', A1, 'poster'));
  const malas = [['material', A1, 'thumbnail'], ['version', A1, 'poster'], ['variante', A1, 'original'], ['otra', A1, 'original'],
    ['material', A1, 'miniatura'], ['material', 'x', 'original'], ['material', 'a/b/c/d', 'original'], ['material', 'a'.repeat(129), 'original'],
    [undefined, A1, 'original'], ['material', 7, 'original'], ['material', A1, null]];
  check('A4 lo que no existe no tiene identidad (11 combinaciones rotas)', malas.every((m) => refIdDeFila(...m) === undefined));
  const validas = ['material/original', 'version/original', 'variante/thumbnail', 'variante/poster', 'variante/preview', 'variante/transcoded', 'consumidor/original'];
  check('A5 ida y vuelta exacta para todas las combinaciones válidas', validas.every((v) => {
    const [c, p] = v.split('/');
    const id = refIdDeFila(c, A1, p);
    const l = leerRefIdDeFila(id);
    return l && l.clase === c && l.assetId === A1 && l.pieza === p;
  }));
  check('A6 un refId mal formado no se lee', [`material_${A1}`, `material_${A1}_original_x`, `_${A1}_original`, 'material__original', 'nada', 7, null]
    .every((x) => leerRefIdDeFila(x) === undefined));
  check('A7 determinista: misma entrada, misma fila', refIdDeFila('variante', A2, 'poster') === refIdDeFila('variante', A2, 'poster'));
}

/* ═══ B · LA FILA ═══════════════════════════════════════════════════════════ */
console.log('\n── B · Una fila válida y las que no ──');
{
  const obj = registro().objectRef;
  const fila = { refId: `material_${A1}_original`, clase: 'material', assetId: A1, pieza: 'original', viva: true, ownerAccountId: ANA, objectRef: obj, desdeAt: T0, actualizadoAt: T0 };
  check('B1 una fila bien formada vale', filaDeReferenciaValida(fila));
  check('B2 su refId tiene que decir lo mismo que sus campos', !filaDeReferenciaValida({ ...fila, clase: 'version' }) && !filaDeReferenciaValida({ ...fila, assetId: A2 }) && !filaDeReferenciaValida({ ...fila, pieza: 'poster' }));
  check('B3 viva es un booleano, la cuenta y el objeto tienen forma, y hay fechas', !filaDeReferenciaValida({ ...fila, viva: 'si' })
    && !filaDeReferenciaValida({ ...fila, ownerAccountId: 'a/b' }) && !filaDeReferenciaValida({ ...fila, objectRef: 'x' }) && !filaDeReferenciaValida({ ...fila, desdeAt: NaN }));
  check('B4 y nada raro lanza', [undefined, null, 5, 'x', {}].every((v) => filaDeReferenciaValida(v) === false));
}

/* ═══ C · LAS FILAS QUE EXIGE UNA FICHA ════════════════════════════════════════ */
console.log('\n── C · filasEsperadasDeLaFicha ──');
{
  const ref = (k) => ({ provider: 'wee', bucket: 'cubo', objectKey: `users/${ANA}/x/${k}` });
  const todo = () => true;
  const ficha = { assetId: A1, ownerAccountId: ANA, status: 'ready', storageRef: ref('o.png'), variants: [{ kind: 'thumbnail', storageRef: ref('t.png') }, { kind: 'poster', storageRef: ref('p.png') }] };
  const e = filasEsperadasDeLaFicha(huella, ficha, todo);
  check('C1 el original como material y cada variante como variante', e.length === 3 && e.some((f) => f.refId === `material_${A1}_original`)
    && e.some((f) => f.refId === `variante_${A1}_thumbnail`) && e.some((f) => f.refId === `variante_${A1}_poster`));
  check('C2 el objectRef es la identidad derivada del sitio', e.every((f) => f.objectRef === referenciaDelObjeto(huella, f.ref)));
  check('C3 una versión exige una fila de clase version', filasEsperadasDeLaFicha(huella, { ...ficha, variants: [], previousVersionId: A2 }, todo)[0].clase === 'version');
  check('C4 retirada: filas apagadas; fallida: vivas (D-F)', filasEsperadasDeLaFicha(huella, { ...ficha, status: 'deleted' }, todo).every((f) => !f.viva)
    && filasEsperadasDeLaFicha(huella, { ...ficha, status: 'failed' }, todo).every((f) => f.viva)
    && filasEsperadasDeLaFicha(huella, { ...ficha, status: 'uploading' }, todo).every((f) => f.viva));
  check('C5 lo que no entra en el índice no tiene fila', filasEsperadasDeLaFicha(huella, ficha, (r) => r.objectKey.endsWith('o.png')).length === 1);
  check('C6 una variante con una pieza que no existe no tiene fila', filasEsperadasDeLaFicha(huella, { ...ficha, variants: [{ kind: 'original', storageRef: ref('z') }, { kind: 'raro', storageRef: ref('w') }] }, todo).length === 1);
  check('C7 una ficha sin dueño o sin id no exige nada', filasEsperadasDeLaFicha(huella, { ...ficha, ownerAccountId: '' }, todo).length === 0 && filasEsperadasDeLaFicha(huella, undefined, todo).length === 0);
  check('C8 el mismo objeto como original y como variante: dos filas sobre un objeto', (() => {
    const f = filasEsperadasDeLaFicha(huella, { ...ficha, variants: [{ kind: 'preview', storageRef: ref('o.png') }] }, todo);
    return f.length === 2 && f[0].objectRef === f[1].objectRef;
  })());
}

/* ═══ D · CLAVE DENTRO DE LA CUENTA, EN LOS DOS ESPACIOS ══════════════════════ */
console.log('\n── D · El aislamiento, sin relajar nada ──');
{
  check('D1 accounts/<cuenta>/ y users/<cuenta>/ son de la cuenta', claveDelIndiceEsDeLaCuenta(`accounts/${ANA}/assets/m/original`, ANA) && claveDelIndiceEsDeLaCuenta(`users/${ANA}/ai-generations/1.png`, ANA));
  check('D2 prefijo ENTERO: users/uAnaX/ no es de uAna, ni accounts/uAnaX/', !claveDelIndiceEsDeLaCuenta('users/uAnaX/1.png', ANA) && !claveDelIndiceEsDeLaCuenta('accounts/uAnaX/assets/m/original', ANA));
  check('D3 sin rutas raras: «..», segmentos vacíos o «.»', !claveDeUsuarioEsDeLaCuenta(`users/${ANA}/../${BETO}/x`, ANA) && !claveDeUsuarioEsDeLaCuenta(`users/${ANA}//x`, ANA) && !claveDeUsuarioEsDeLaCuenta(`users/${ANA}/./x`, ANA));
  check('D4 una cuenta con forma de ruta no tiene carpeta', !claveDelIndiceEsDeLaCuenta('users/a/b/x', 'a/b') && !claveDelIndiceEsDeLaCuenta('users//x', ''));
  const deUsuarios = registro({ providerId: 'wee', objectKey: `users/${ANA}/ai-generations/1.png` });
  check('D5 un registro del espacio heredado vale para el índice…', registroDelIndiceValido(huella, deUsuarios) && registroEsDeLaCuenta(deUsuarios, ANA));
  check('D6 …y NO para Media Cloud: objetoValido sigue exigiendo accounts/ (claveEsDeLaCuenta sin relajar)', !objetoValido(huella, deUsuarios));
  check('D7 ni para otra cuenta', !registroEsDeLaCuenta(deUsuarios, BETO) && !registroEsDeLaCuenta({ ...deUsuarios, accountId: BETO }, BETO));
}

/* ═══ E · LOS ESTADOS NUEVOS Y SUS CAMPOS, EN LA VALIDACIÓN ═══════════════════ */
console.log('\n── E · EstadoDelObjeto y objetoValido ──');
{
  check('E1 los cuatro estados, en orden', JSON.stringify(ESTADOS_DEL_OBJETO) === JSON.stringify(['guardado', 'candidato', 'borrando', 'borrado']));
  check('E2 un candidato con fecha y un borrando con concesión son fichas válidas', objetoValido(huella, registro({ extra: { estado: 'candidato', candidatoDesde: T0 } }))
    && objetoValido(huella, registro({ extra: { estado: 'borrando', concesion: { id: 'c1', hasta: T0 + 1 } } })));
  check('E3 un candidato sin fecha o un borrando sin concesión, no', !objetoValido(huella, registro({ extra: { estado: 'candidato' } })) && !objetoValido(huella, registro({ extra: { estado: 'borrando' } })));
  check('E4 los campos del índice, si están, con su forma', !objetoValido(huella, registro({ extra: { version: -1 } })) && !objetoValido(huella, registro({ extra: { version: 1.5 } }))
    && !objetoValido(huella, registro({ extra: { cobertura: 'casi' } })) && !objetoValido(huella, registro({ extra: { generacion: '' } }))
    && !objetoValido(huella, registro({ extra: { concesion: { id: 'a b', hasta: 1 } } })) && !objetoValido(huella, registro({ extra: { marcas: ['otra'] } }))
    && !objetoValido(huella, registro({ extra: { pendiente: { motivo: 'Frase con espacios', en: 1 } } })));
  check('E5 y sin ellos la ficha de siempre sigue valiendo, y un estado inventado no', objetoValido(huella, registro()) && !objetoValido(huella, registro({ extra: { estado: 'subiendo' } })));
}

/* ═══ F · LA FLAG ════════════════════════════════════════════════════════════ */
console.log('\n── F · aiSettings/almacenActivos: cerrada por defecto, y si falla, cerrada ──');
{
  const cerrada = (x) => !leerFlagDelAlmacenDeActivos(x).habilitado;
  check('F1 sin documento, vacío o con forma rara: CERRADA', [undefined, null, {}, [], 'si', 1, { habilitado: 'true', cuentas: [ANA] }].every(cerrada));
  check('F2 la lista de cuentas es OBLIGATORIA', cerrada({ habilitado: true }) && !flagAbiertaPara(leerFlagDelAlmacenDeActivos({ habilitado: true, cuentas: [] }), ANA));
  check('F3 una lista rota cierra la flag entera (sin comodín)', cerrada({ habilitado: true, cuentas: ['*'] }) && cerrada({ habilitado: true, cuentas: [ANA, 'a/b'] })
    && cerrada({ habilitado: true, cuentas: 'uAna' }) && cerrada({ habilitado: true, cuentas: new Array(257).fill(ANA) }));
  check('F4 coberturaDesde y la gracia con forma rara también cierran', cerrada({ habilitado: true, cuentas: [ANA], coberturaDesde: -1 })
    && cerrada({ habilitado: true, cuentas: [ANA], coberturaDesde: 'ayer' }) && cerrada({ habilitado: true, cuentas: [ANA], graciaDeCandidatoDias: -1 })
    && cerrada({ habilitado: true, cuentas: [ANA], graciaDeCandidatoDias: 400 }) && cerrada({ habilitado: true, cuentas: [ANA], graciaDeCandidatoDias: 'x' }));
  const ok = leerFlagDelAlmacenDeActivos({ habilitado: true, cuentas: [ANA], coberturaDesde: T0, graciaDeCandidatoDias: 2, otraCosa: 'se ignora' });
  check('F5 bien formada: abierta solo para SU lista, por igualdad exacta', flagAbiertaPara(ok, ANA) && !flagAbiertaPara(ok, BETO) && !flagAbiertaPara(ok, 'uana'));
  check('F6 la gracia por defecto es siete días y se puede configurar', leerFlagDelAlmacenDeActivos({ habilitado: true, cuentas: [ANA] }).graciaDeCandidatoMs === 7 * DIA && ok.graciaDeCandidatoMs === 2 * DIA);
  check('F7 habilitado:false manda sobre la lista', !flagAbiertaPara(leerFlagDelAlmacenDeActivos({ habilitado: false, cuentas: [ANA] }), ANA));
}

/* ═══ G · LA COBERTURA ══════════════════════════════════════════════════════ */
console.log('\n── G · La marca de cobertura y quién nace cubierto ──');
{
  const abierta = leerFlagDelAlmacenDeActivos({ habilitado: true, cuentas: [ANA], coberturaDesde: T0 });
  check('G1 sin flag abierta, sin coberturaDesde o sin instante de escritura: no hay marca', marcaDeCobertura(leerFlagDelAlmacenDeActivos(undefined), T0) === undefined
    && marcaDeCobertura(leerFlagDelAlmacenDeActivos({ habilitado: true, cuentas: [ANA] }), T0) === undefined && marcaDeCobertura(abierta, undefined) === undefined);
  check('G2 la marca es la más tardía entre coberturaDesde y la última escritura de la flag', marcaDeCobertura(abierta, T0 + 5) === T0 + 5 && marcaDeCobertura(abierta, T0 - 5) === T0);
  const conMarca = registro({ extra: { cobertura: 'completa', coberturaEn: T0 + 20 } });
  check('G3 vale si es completa y posterior a la marca', coberturaVigente(conMarca, T0 + 20) && !coberturaVigente(conMarca, T0 + 21));
  check('G4 pendiente, sin fecha o sin marca: no vale', !coberturaVigente(registro({ extra: { cobertura: 'pendiente', coberturaEn: T0 + 99 } }), T0)
    && !coberturaVigente(registro({ extra: { cobertura: 'completa' } }), T0) && !coberturaVigente(conMarca, undefined));
  check('G5 nace cubierto solo DESPUÉS de la marca más el margen de reloj', naceCubierto(T0 + MARGEN_DE_RELOJ_DE_COBERTURA_MS, T0)
    && !naceCubierto(T0 + MARGEN_DE_RELOJ_DE_COBERTURA_MS - 1, T0) && !naceCubierto(undefined, T0) && !naceCubierto(T0 + 9e9, undefined));
}

/* ═══ H · EL CERROJO: TRANSICIONES ══════════════════════════════════════════ */
console.log('\n── H · Cada transición, sus guardas y sus errores tipados ──');
{
  const g = registro({ extra: { version: 2, generacion: '77' } });
  const esp = (o) => ({ estado: o.estado, version: versionDe(o) });

  /* a candidato */
  const c = pasarACandidato(g, esp(g), { filasVivas: 0, at: T0 + 100, motivo: 'retirada' });
  check('H1 guardado → candidato sin filas vivas: versión +1, fecha y motivo', c.ok && c.siguiente.estado === 'candidato' && c.siguiente.version === 3
    && c.siguiente.candidatoDesde === T0 + 100 && c.siguiente.pendiente.motivo === 'retirada' && objetoValido(huella, c.siguiente));
  check('H2 con una fila viva: filas_vivas', pasarACandidato(g, esp(g), { filasVivas: 1, at: T0 }).fallo === 'filas_vivas');
  check('H3 estado o versión que no son los esperados: estado_inesperado / version_inesperada',
    pasarACandidato(g, { estado: 'candidato', version: 2 }, { filasVivas: 0, at: T0 }).fallo === 'estado_inesperado'
    && pasarACandidato(g, { estado: 'guardado', version: 1 }, { filasVivas: 0, at: T0 }).fallo === 'version_inesperada');
  check('H4 un número de filas que no se puede creer: entrada_invalida', [undefined, -1, 1.5, NaN, '0'].every((x) => pasarACandidato(g, esp(g), { filasVivas: x, at: T0 }).fallo === 'entrada_invalida'));
  check('H5 una ficha que no se entiende: registro_invalido', pasarACandidato(undefined, esp(g), { filasVivas: 0, at: T0 }).fallo === 'registro_invalido'
    && pasarACandidato({ ...g, objectRef: 'x' }, esp(g), { filasVivas: 0, at: T0 }).fallo === 'registro_invalido');

  /* reclamar */
  const cand = c.siguiente;
  const r = reclamar(cand, esp(cand), { filasVivas: 0, coberturaCompleta: true, concesion: { id: 'c-1', hasta: T0 + 500 }, at: T0 + 200 });
  check('H6 candidato → borrando con concesión, cobertura y cero filas', r.ok && r.siguiente.estado === 'borrando' && r.siguiente.concesion.id === 'c-1'
    && r.siguiente.version === 4 && objetoValido(huella, r.siguiente));
  check('H7 con fila viva: filas_vivas; sin cobertura: cobertura_incompleta', reclamar(cand, esp(cand), { filasVivas: 1, coberturaCompleta: true, concesion: { id: 'x', hasta: T0 + 500 }, at: T0 }).fallo === 'filas_vivas'
    && reclamar(cand, esp(cand), { filasVivas: 0, coberturaCompleta: false, concesion: { id: 'x', hasta: T0 + 500 }, at: T0 }).fallo === 'cobertura_incompleta');
  check('H8 una concesión ya caducada o sin id: entrada_invalida', reclamar(cand, esp(cand), { filasVivas: 0, coberturaCompleta: true, concesion: { id: 'x', hasta: T0 }, at: T0 }).fallo === 'entrada_invalida'
    && reclamar(cand, esp(cand), { filasVivas: 0, coberturaCompleta: true, concesion: { id: '', hasta: T0 + 9 }, at: T0 }).fallo === 'entrada_invalida');
  const borrando = r.siguiente;
  check('H9 un borrando con concesión vigente no se vuelve a reclamar: concesion_vigente',
    reclamar(borrando, esp(borrando), { filasVivas: 0, coberturaCompleta: true, concesion: { id: 'c-2', hasta: T0 + 900 }, at: T0 + 300 }).fallo === 'concesion_vigente');
  const re = reclamar(borrando, esp(borrando), { filasVivas: 0, coberturaCompleta: true, concesion: { id: 'c-2', hasta: T0 + 2000 }, at: T0 + 600 });
  check('H10 caducada, se reclama de nuevo tras revalidar: otra concesión', re.ok && re.siguiente.concesion.id === 'c-2' && re.siguiente.version === 5);
  check('H11 desde guardado no se reclama: estado_inesperado', reclamar(g, esp(g), { filasVivas: 0, coberturaCompleta: true, concesion: { id: 'x', hasta: T0 + 500 }, at: T0 }).fallo === 'estado_inesperado');

  /* cerrar */
  const cerrado = cerrar(borrando, esp(borrando), { concesionId: 'c-1', at: T0 + 250 });
  check('H12 borrando → borrado SOLO con la concesión propia', cerrado.ok && cerrado.siguiente.estado === 'borrado' && cerrado.siguiente.deletedAt === T0 + 250
    && cerrado.siguiente.concesion === undefined && objetoValido(huella, cerrado.siguiente));
  check('H13 con otra concesión: concesion_ajena; desde candidato: estado_inesperado', cerrar(borrando, esp(borrando), { concesionId: 'otra', at: T0 }).fallo === 'concesion_ajena'
    && cerrar(cand, esp(cand), { concesionId: 'c-1', at: T0 }).fallo === 'estado_inesperado');
  check('H14 si otro reclamó tras caducar, el cierre de la primera se descarta', cerrar(re.siguiente, esp(re.siguiente), { concesionId: 'c-1', at: T0 + 700 }).fallo === 'concesion_ajena');

  /* devolver */
  const dev = devolver(borrando, esp(borrando), { concesionId: 'c-1', at: T0 + 260, motivo: 'error_transitorio', contarIntento: true });
  check('H15 borrando → candidato (fallo del proveedor): motivo e intento contado', dev.ok && dev.siguiente.estado === 'candidato' && dev.siguiente.pendiente.motivo === 'error_transitorio'
    && dev.siguiente.intentosDeBorrado === 1 && dev.siguiente.ultimoIntentoDeBorradoEn === T0 + 260 && dev.siguiente.concesion === undefined && objetoValido(huella, dev.siguiente));
  const dev412 = devolver(borrando, esp(borrando), { concesionId: 'c-1', at: T0 + 260, motivo: 'generacion_distinta', contarIntento: false });
  check('H16 un 412 devuelve sin contar intento', dev412.ok && dev412.siguiente.intentosDeBorrado === undefined && dev412.siguiente.pendiente.motivo === 'generacion_distinta');
  check('H17 devolver con otra concesión o con un motivo que no es literal: concesion_ajena / entrada_invalida',
    devolver(borrando, esp(borrando), { concesionId: 'x', at: T0, motivo: 'error_transitorio', contarIntento: true }).fallo === 'concesion_ajena'
    && devolver(borrando, esp(borrando), { concesionId: 'c-1', at: T0, motivo: 'Una frase', contarIntento: true }).fallo === 'entrada_invalida');

  /* rescatar */
  const res = rescatar(cand, esp(cand), { presente: true, generacionObservada: '77', at: T0 + 300 });
  check('H18 candidato → guardado si el objeto sigue ahí con la misma generación', res.ok && res.siguiente.estado === 'guardado' && res.siguiente.candidatoDesde === undefined
    && res.siguiente.pendiente === undefined && res.siguiente.version === 4);
  check('H19 sin objeto: objeto_ausente; con otra generación: generacion_distinta', rescatar(cand, esp(cand), { presente: false, at: T0 }).fallo === 'objeto_ausente'
    && rescatar(cand, esp(cand), { presente: true, generacionObservada: '78', at: T0 }).fallo === 'generacion_distinta');
  const sinGen = registro({ extra: { estado: 'candidato', candidatoDesde: T0 } });
  check('H20 si no había generación registrada, el rescate adopta la que ve', rescatar(sinGen, esp(sinGen), { presente: true, generacionObservada: '5', at: T0 }).siguiente.generacion === '5');
  check('H21 desde guardado o borrando no se rescata: estado_inesperado', rescatar(g, esp(g), { presente: true, at: T0 }).fallo === 'estado_inesperado'
    && rescatar(borrando, esp(borrando), { presente: true, generacionObservada: '77', at: T0 }).fallo === 'estado_inesperado');

  /* crear filas */
  check('H22 ninguna fila viva nace sobre bytes que se van', comoCrearFilaViva(undefined) === 'crear_registro' && comoCrearFilaViva(g) === 'directo'
    && comoCrearFilaViva(cand) === 'rescatar' && comoCrearFilaViva(borrando) === 'no' && comoCrearFilaViva(cerrado.siguiente) === 'no');
  check('H23 una ficha anterior al índice cuenta como versión 0', versionDe(registro()) === 0 && versionDe(g) === 2);
}

/* ═══ I · LOS CONSUMIDORES (D-G) ════════════════════════════════════════════ */
console.log('\n── I · Quién más puede necesitar los bytes ──');
{
  check('I1 el registro lleva los seis del Core y los que guardan una dirección o una ruta', CONSUMIDORES_DE_MATERIAL.every((t) => REGISTRO_DE_CONSUMIDORES.some((c) => c.tipo === t))
    && ['adjunto_de_brain', 'avatar', 'resultado_de_trabajo', 'publicacion', 'foto_unica', 'contexto_de_referencias'].every((t) => REGISTRO_DE_CONSUMIDORES.some((c) => c.tipo === t)));
  check('I2 ninguno está integrado todavía', REGISTRO_DE_CONSUMIDORES.every((c) => c.integrado === false));
  const prod = resumirConsumidores(REGISTRO_DE_CONSUMIDORES, []);
  check('I3 en producción la respuesta es «desconocido», con todos los tipos', prod.estado === 'desconocido' && prod.tipos.length === REGISTRO_DE_CONSUMIDORES.length);
  const integrados = [{ tipo: 'proyecto', integrado: true, referencia: 'assetId' }, { tipo: 'plano', integrado: true, referencia: 'assetId' }];
  check('I4 todos integrados y todos «sin usos»: sin_usos', resumirConsumidores(integrados, [{ tipo: 'proyecto', estado: 'sin_usos' }, { tipo: 'plano', estado: 'sin_usos' }]).estado === 'sin_usos');
  check('I5 uno con usos: con_usos (y manda sobre un desconocido)', resumirConsumidores(integrados, [{ tipo: 'proyecto', estado: 'con_usos' }]).estado === 'con_usos');
  check('I6 uno integrado que no contestó, o que contestó «desconocido»: desconocido', resumirConsumidores(integrados, [{ tipo: 'proyecto', estado: 'sin_usos' }]).estado === 'desconocido'
    && resumirConsumidores(integrados, [{ tipo: 'proyecto', estado: 'sin_usos' }, { tipo: 'plano', estado: 'desconocido' }]).estado === 'desconocido');
  check('I7 un tipo sin integrar es desconocido diga lo que diga', resumirConsumidores([{ tipo: 'avatar', integrado: false, referencia: 'direccion' }], [{ tipo: 'avatar', estado: 'sin_usos' }]).estado === 'desconocido');
}

/* ═══ J · LA DECISIÓN DE BORRADO FÍSICO: cada motivo ══════════════════════════ */
console.log('\n── J · decidirBorradoFisico: todo a la vez, y cada protección con su motivo ──');
{
  const base = (o = {}, e = {}) => ({ objeto: candidatoListo(o), cuenta: ANA, marcaDeCobertura: MARCA, filasVivas: 0, operaciones: [], consumidores: SIN_USOS, ...e });
  const AT = T0 + 10 * DIA;
  const d = (o, e, pol = POLITICA_DEL_BORRADO_INMEDIATO, at = AT) => decidirBorradoFisico(base(o, e), pol, at);
  const motivo = (o, e, pol, at) => { const x = d(o, e, pol, at); return x.borrar ? 'BORRAR' : x.motivo; };
  check('J1 todo en orden: se puede borrar', d().borrar === true);
  check('J2 y con la política del barrido, cumplidas la gracia y la edad', d({}, {}, POLITICA_DEL_BARRIDO_DEL_INDICE).borrar === true);
  const casos = [
    ['ficha_invalida', motivo(undefined, { objeto: undefined })],
    ['ficha_invalida (objectRef)', motivo({ objectRef: 'mob_x' })],
    ['fuera_de_su_cuenta (otra cuenta)', motivo({}, { cuenta: BETO })],
    ['fuera_de_su_cuenta (clave ajena)', motivo({ objectKey: `accounts/${BETO}/assets/m/original` })],
    ['marcado', motivo({ marcas: ['generacion_distinta'] })],
    ['estado_no_reclamable (guardado)', motivo({ estado: 'guardado' })],
    ['estado_no_reclamable (borrado)', motivo({ estado: 'borrado' })],
    ['concesion_vigente', motivo({ estado: 'borrando', concesion: { id: 'c', hasta: AT + 1 } })],
    ['cobertura_incompleta (pendiente)', motivo({ cobertura: 'pendiente' })],
    ['cobertura_incompleta (anterior a la marca)', motivo({ coberturaEn: MARCA - 1 })],
    ['cobertura_incompleta (sin marca)', motivo({}, { marcaDeCobertura: undefined })],
    ['referencias_inciertas (no se supo)', motivo({}, { filasVivas: undefined })],
    ['referencias_inciertas (número raro)', motivo({}, { filasVivas: 1.5 })],
    ['referenciado', motivo({}, { filasVivas: 1 })],
    ['consumidores_activos', motivo({}, { consumidores: { estado: 'con_usos', tipos: ['proyecto'] } })],
    ['consumidores_no_verificados (no se supo)', motivo({}, { consumidores: undefined })],
    ['consumidores_no_verificados (producción)', motivo({}, { consumidores: resumirConsumidores(REGISTRO_DE_CONSUMIDORES, []) })],
    ['operaciones_inciertas', motivo({}, { operaciones: undefined })],
    ['operacion_en_curso', motivo({}, { operaciones: ['running'] })],
    ['sin_generacion', motivo({ generacion: undefined })],
    ['generacion_distinta', motivo({}, { generacionObservada: '78' })],
    ['en_gracia (barrido, candidato reciente)', motivo({ candidatoDesde: AT - 1000 }, {}, POLITICA_DEL_BARRIDO_DEL_INDICE)],
    ['demasiado_reciente (barrido, objeto joven)', motivo({ candidatoDesde: AT - 8 * DIA, createdAt: AT - DIA }, {}, POLITICA_DEL_BARRIDO_DEL_INDICE)],
    ['intentos_agotados', motivo({ intentosDeBorrado: 5 })],
    ['esperando_reintento', motivo({ intentosDeBorrado: 1, ultimoIntentoDeBorradoEn: AT - 1000 })],
  ];
  for (const [esperado, visto] of casos) check(`J· protege: ${esperado}`, visto === esperado.split(' ')[0], visto);
  check('J3 un borrando con la concesión caducada se puede reclamar otra vez', d({ estado: 'borrando', concesion: { id: 'c', hasta: AT - 1 } }).borrar === true);
  check('J4 sin fecha de candidato no hay gracia que contar: protege', motivo({ candidatoDesde: undefined }) === 'en_gracia');
  check('J5 un objeto del espacio heredado de la cuenta: la decisión es la misma (D-C lo aplica el barrido, no esto)',
    decidirBorradoFisico({ ...base(), objeto: { ...candidatoListo(), ...registro({ providerId: 'wee', objectKey: `users/${ANA}/a/1.png`, extra: { estado: 'candidato', candidatoDesde: T0, generacion: '1', cobertura: 'completa', coberturaEn: T0 + 50 } }) } }, POLITICA_DEL_BORRADO_INMEDIATO, AT).borrar === true);
  check('J6 la gracia por defecto del barrido son siete días', POLITICA_DEL_BARRIDO_DEL_INDICE.graciaDeCandidatoMs === GRACIA_DE_CANDIDATO_POR_DEFECTO_MS && GRACIA_DE_CANDIDATO_POR_DEFECTO_MS === 7 * DIA);
}

/* ═══ K · LA VISTA DEL BARRIDO ═════════════════════════════════════════════ */
console.log('\n── K · Lo que MC-5 sabe decidir ──');
{
  check('K1 candidato y borrando caducado se ven como guardado', vistaParaElBarrido(candidatoListo(), T0).estado === 'guardado'
    && vistaParaElBarrido(candidatoListo({ estado: 'borrando', concesion: { id: 'c', hasta: T0 } }), T0 + 1).estado === 'guardado');
  check('K2 borrando vigente, guardado y borrado no tienen vista', vistaParaElBarrido(candidatoListo({ estado: 'borrando', concesion: { id: 'c', hasta: T0 + 9 } }), T0) === undefined
    && vistaParaElBarrido(registro(), T0) === undefined && vistaParaElBarrido(registro({ extra: { estado: 'borrado' } }), T0) === undefined);
}

/* ═══ L · LAS CLASES DE LA RECONCILIACIÓN DEL ÍNDICE ═════════════════════════ */
console.log('\n── L · reconciliarIndiceDeCuenta: cada clase, y ninguna en limpio ──');
{
  const ref = { provider: 'wee', bucket: 'cubo', objectKey: `users/${ANA}/x/o.png` };
  const objRef = referenciaDelObjeto(huella, ref);
  const ficha = (o = {}) => ({ assetId: A1, ownerAccountId: ANA, status: 'ready', storageRef: ref, ...o });
  const esperadas = (f = ficha()) => filasEsperadasDeLaFicha(huella, f, () => true);
  const fila = (o = {}) => ({ refId: `material_${A1}_original`, clase: 'material', assetId: A1, pieza: 'original', viva: true, ownerAccountId: ANA, objectRef: objRef, desdeAt: T0, actualizadoAt: T0, ...o });
  const reg = (o = {}) => ({ objectRef: objRef, providerId: 'wee', accountId: ANA, assetId: A1, pieza: 'original', bucket: 'cubo', objectKey: ref.objectKey,
    estado: 'guardado', createdAt: T0, updatedAt: T0, generacion: '9', cobertura: 'completa', coberturaEn: T0 + 50, ...o });
  const cruzar = (o = {}) => reconciliarIndiceDeCuenta({
    accountId: ANA, esperadas: o.esperadas ?? esperadas(), estadoDeFichas: o.estadoDeFichas ?? { [A1]: 'viva' },
    objetos: o.objetos ?? [{ objectRef: objRef, registro: reg(o.reg), filas: o.filas ?? [fila()], filasCompletas: o.filasCompletas ?? true, fisico: o.fisico ?? { existe: true, generacion: '9' }, referenciasAjenas: 'ajenas' in o ? o.ajenas : 0 }],
    completo: o.completo ?? true, marcaDeCobertura: o.marca === undefined ? MARCA : o.marca, graciaDeHuerfanoMs: 7 * DIA,
  }, T0 + 30 * DIA);
  const limpio = cruzar();
  check('L1 estado limpio: CERO hallazgos (ni un falso positivo)', limpio.hallazgos.length === 0, JSON.stringify(limpio.porClase));
  check('L2 y el objeto limpio se puede verificar', limpio.coberturaVerificable.includes(objRef));
  const clase = (r, c) => r.hallazgos.filter((h) => h.clase === c);
  const ausente = cruzar({ filas: [] });
  check('L3 fila_ausente → crear_fila', clase(ausente, 'fila_ausente').length === 1 && clase(ausente, 'fila_ausente')[0].reparacion === 'crear_fila');
  const sinBytes = cruzar({ filas: [], fisico: { existe: false } });
  check('L4 fila_ausente sin bytes → marcar_ficha (datos_incompletos), y ficha_sin_bytes', clase(sinBytes, 'fila_ausente')[0].reparacion === 'marcar_ficha' && clase(sinBytes, 'ficha_sin_bytes').length === 1);
  const huerfana = cruzar({ esperadas: esperadas(ficha({ status: 'deleted' })), estadoDeFichas: { [A1]: 'retirada' } });
  check('L5 fila_huerfana (ficha retirada) → apagar_fila', clase(huerfana, 'fila_huerfana').length === 1 && clase(huerfana, 'fila_huerfana')[0].reparacion === 'apagar_fila');
  const dup = cruzar({ filas: [fila(), fila({ refId: `version_${A1}_original`, clase: 'version' })] });
  check('L6 fila_duplicada → marcar, y bloquea la cobertura', clase(dup, 'fila_duplicada').length === 1 && clase(dup, 'fila_duplicada')[0].marca === 'fila_duplicada' && !dup.coberturaVerificable.includes(objRef));
  const huerfano = cruzar({ esperadas: [], estadoDeFichas: {}, filas: [] });
  check('L7 objeto_huerfano (sin uso vivo, cobertura vigente, con edad) → a_candidato', clase(huerfano, 'objeto_huerfano').length === 1 && clase(huerfano, 'objeto_huerfano')[0].reparacion === 'a_candidato');
  const imposible = cruzar({ reg: { estado: 'borrando', concesion: { id: 'c', hasta: T0 } } });
  check('L8 estado_imposible (borrando con fila viva) → marcar', clase(imposible, 'estado_imposible')[0]?.marca === 'estado_imposible');
  const rescate = cruzar({ reg: { estado: 'candidato', candidatoDesde: T0 } });
  check('L9 un candidato con uso vivo y los mismos bytes → rescatar', clase(rescate, 'estado_imposible')[0]?.reparacion === 'rescatar');
  const gen = cruzar({ fisico: { existe: true, generacion: '10' } });
  check('L10 generacion_distinta → marcar', clase(gen, 'generacion_distinta')[0]?.marca === 'generacion_distinta');
  const otra = cruzar({ ajenas: 1 });
  check('L11 de_otra_cuenta (ficha viva de otra cuenta con la clave) → marcar, y bloquea', clase(otra, 'de_otra_cuenta').length === 1 && !otra.coberturaVerificable.includes(objRef));
  const otraReg = cruzar({ reg: { accountId: BETO } });
  check('L12 de_otra_cuenta (registro ajeno) → ninguna: no se toca', clase(otraReg, 'de_otra_cuenta')[0]?.reparacion === 'ninguna' && otraReg.hallazgos.length === 1);
  const otraFila = cruzar({ filas: [fila(), fila({ refId: `material_${A2}_original`, assetId: A2, ownerAccountId: BETO })] });
  check('L13 de_otra_cuenta (fila de otra cuenta) → marcar', clase(otraFila, 'de_otra_cuenta').length === 1);
  const pendiente = cruzar({ reg: { cobertura: 'pendiente' } });
  check('L14 cobertura_pendiente → ninguna, y el objeto se puede verificar', clase(pendiente, 'cobertura_pendiente').length === 1 && pendiente.coberturaVerificable.includes(objRef));
  check('L15 una pasada incompleta no verifica nada ni concluye huérfanas', cruzar({ completo: false }).coberturaVerificable.length === 0
    && clase(cruzar({ completo: false, esperadas: [], estadoDeFichas: {} }), 'fila_huerfana').length === 0);
  check('L16 filas cortadas o fichas ajenas que no se supieron: no se verifica', cruzar({ filasCompletas: false }).coberturaVerificable.length === 0
    && cruzar({ ajenas: undefined }).coberturaVerificable.length === 0);
  check('L17 sin marca de cobertura no se verifica nada', cruzar({ marca: null }).coberturaVerificable.length === 0);
  check('L18 las nueve clases del diseño, ni una más', CLASES_DEL_INDICE.length === 9);
}

/* ═══ M · EL PUERTO ════════════════════════════════════════════════════════ */
console.log('\n── M · El borrado con generación, en el puerto ──');
{
  check('M1 un 412 se reconoce y nada más', esPrecondicionFallida({ ok: false, error: { code: 'PROVIDER_ERROR', source: 's', details: { reason: 'precondicion_fallida' } } })
    && !esPrecondicionFallida({ ok: false, error: { code: 'PROVIDER_ERROR', source: 's', details: { reason: 'proveedor_no_disponible' } } }) && !esPrecondicionFallida({ ok: true, yaNoEstaba: false }));
  check('M2 sabe borrar con generación solo quien lo declara', sabeBorrarConGeneracion({ capacidades: ['object.delete', 'object.conditionalDelete'] })
    && !sabeBorrarConGeneracion({ capacidades: ['object.delete'] }) && !sabeBorrarConGeneracion(undefined));
  check('M3 las capacidades de MC-1 siguen siendo tres', CAPACIDADES_DE_MC1.length === 3);
  check('M4 el puerto conserva el borrado de siempre y lo extiende', /borrar\(ref: StorageRef\): Promise<DesenlaceDeBorrado>;/.test(leer('functions/src/core/media/puerto.ts'))
    && /borrar\(ref: StorageRef, opciones: OpcionesDeBorrado\)/.test(leer('functions/src/core/media/puerto.ts')));
}

/* ═══ N · SIGUE SIENDO CORE ═════════════════════════════════════════════════ */
console.log('\n── N · Puro, agnóstico y sin relajar el aislamiento ──');
{
  const SRC = leer('functions/src/core/media/indice.ts');
  const CODIGO = sinComentarios(SRC);
  check('N1 sin reloj, sin azar, sin red, sin Firestore', !/Date\.now|Math\.random|fetch\(|firebase|firestore|require\(/i.test(CODIGO));
  check('N2 solo importa de dentro del Core', [...SRC.matchAll(/from '([^']+)'/g)].every((m) => m[1].startsWith('.') && !m[1].includes('../../')));
  check('N3 ningún nombre de proveedor', !/(?<![a-z0-9])(r2|s3|aws|cloudflare|cloudinary|gcs|azure)(?![a-z0-9])/i.test(CODIGO));
  check('N4 las palabras que vigilan otras suites del Core de medios no aparecen', !/[Ee]lement|VisualContext|[Cc]reative|lifecycle|multipart|directUpload/.test(SRC));
  check('N5 claveEsDeLaCuenta y objetoEsDeLaCuenta no se tocaron', /export const claveEsDeLaCuenta = \(objectKey: unknown, accountId: unknown\): boolean =>\s*typeof objectKey === 'string' && typeof accountId === 'string'\s*&& FORMA_DE_SEGMENTO\.test\(accountId\)\s*&& objectKey\.startsWith\(`\$\{RAIZ_DE_CUENTAS\}\/\$\{accountId\}\/`\);/.test(leer('functions/src/core/media/objeto.ts'))
    && /o\.accountId === accountId && claveEsDeLaCuenta\(o\.objectKey, accountId\)/.test(leer('functions/src/core/media/objeto.ts')));
  check('N6 objetoValido sigue preguntando con claveEsDeLaCuenta', /export const objetoValido = \(huella: Huella, o: MediaObject \| undefined\): boolean =>\s*objetoValidoCon\(huella, o, claveEsDeLaCuenta\);/.test(leer('functions/src/core/media/objeto.ts')));
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
