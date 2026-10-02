import { esObjetoPlano, esTexto } from './gateway';
import { Huella } from './moderation';

/**
 * WEE CORE — COPIA DE SEGURIDAD Y RECUPERACIÓN. EL CONTRATO.
 *
 * ── La distinción que da sentido a todo el archivo ──────────────────────────
 *
 *     UNA COPIA QUE NUNCA SE HA RESTAURADO NO ES UNA ESTRATEGIA DE
 *     RECUPERACIÓN. ES UN ARCHIVO.
 *
 * Por eso aquí no hay nada que «haga una copia». Lo que hay es lo que permite
 * responder a la única pregunta que importa el día malo: **¿lo que se restauró
 * es lo que había?** Y eso son cuatro cosas, en este orden:
 *
 *     CLASIFICAR → HUELLA → COMPARAR → RELACIONES
 *
 * ── Qué es y qué no es ─────────────────────────────────────────────────────
 *
 * Es Core: puro, sin Firebase, sin red, sin reloj y sin dados. Recibe datos ya
 * leídos —por quien sepa leerlos— y dice si cuadran. Quien exporta, importa y
 * lee vive fuera (`scripts/copias.mjs`), porque hablar con Firestore, con
 * Cloud Storage y con la API de administración es infraestructura, y la
 * infraestructura cambia.
 *
 * No decide QUÉ se respalda: lo declara, que es distinto. Una colección que no
 * esté clasificada aquí no se trata como «seguramente derivada»; se trata como
 * un fallo, para que nadie pueda añadir una colección a Weë y dejarla fuera de
 * la copia sin enterarse.
 *
 * ── Fuente de verdad, copia, caché ─────────────────────────────────────────
 *
 *     FUENTE DE VERDAD ≠ COPIA ≠ CACHÉ ≠ ÍNDICE ≠ MODELO DE LECTURA
 *
 * Se respalda la fuente de verdad. Lo derivado se declara derivado y se
 * documenta CÓMO se reconstruye; si no se sabe reconstruirlo, entonces no era
 * derivado y hay que decirlo.
 */

export const BACKUP_CONTRACT_VERSION = '1.0' as const;

/* ── Clasificar ───────────────────────────────────────────────────────────── */

/**
 * CUÁNTO DUELE PERDERLO.
 *
 *   CRITICAL   se pierde dinero, identidad o propiedad. No hay forma de
 *              reconstruirlo desde ninguna otra cosa.
 *   IMPORTANT  se pierde el trabajo o la conversación de alguien. Duele, pero
 *              no rompe ni las cuentas ni el saldo.
 *   DERIVED    se puede volver a calcular desde algo que sí se respalda, y se
 *              dice desde qué. Si no se puede decir, NO es derivado.
 */
export type Criticidad = 'CRITICAL' | 'IMPORTANT' | 'DERIVED';

export interface ClaseDeDatos {
  criticidad: Criticidad;
  /** Por qué. En una frase, para que la clasificación se pueda discutir. */
  porque: string;
  /** Solo para DERIVED: desde qué se reconstruye. Obligatorio, y por eso el tipo lo separa. */
  seReconstruyeDesde?: string;
}

/**
 * TODAS LAS COLECCIONES DE WEË, CLASIFICADAS.
 *
 * Las subcolecciones van con su ruta de plantilla (`accounts/{id}/members`)
 * porque una subcolección puede ser más crítica que su padre: los costes
 * privados de un trabajo lo son.
 *
 * Están también las que hoy tienen CERO documentos pero que el código escribe.
 * Una colección vacía que se llena mañana tiene que nacer clasificada, no
 * descubrirse sin copia el día que importe.
 */
export const CLASIFICACION_DE_DATOS: Readonly<Record<string, ClaseDeDatos>> = Object.freeze({
  /* ── Identidad: sin esto, nadie es nadie ─────────────────────────────── */
  accounts: { criticidad: 'CRITICAL', porque: 'la cuenta Weë: propiedad y autoridad de todo lo demás' },
  accountNumbers: { criticidad: 'CRITICAL', porque: 'el índice que hace único un número de cuenta; sin él se repartirían dos veces' },
  'accounts/{accountId}/members': { criticidad: 'CRITICAL', porque: 'la membresía: quién manda en una cuenta' },
  'accounts/{accountId}/operations': { criticidad: 'CRITICAL', porque: 'la idempotencia de las operaciones de identidad' },
  entities: { criticidad: 'CRITICAL', porque: 'las caras y las Páginas: la identidad pública' },
  users: { criticidad: 'CRITICAL', porque: 'el perfil y su entityId; es lo que resuelve una URL pública' },
  'users/{uid}/private': { criticidad: 'CRITICAL', porque: 'datos privados de la cuenta' },

  /* ── Dinero: no se reconstruye, no se compensa, no se inventa ────────── */
  creditTransactions: { criticidad: 'CRITICAL', porque: 'el libro de Credits: cada movimiento, y es la única verdad del saldo' },
  creditStats: { criticidad: 'CRITICAL', porque: 'el circulante y los acumulados; perderlo descuadra la economía entera' },
  wallets: { criticidad: 'CRITICAL', porque: 'la billetera de la cuenta' },
  transactions: { criticidad: 'CRITICAL', porque: 'libro heredado; mientras exista un documento, es dinero' },
  payments: { criticidad: 'CRITICAL', porque: 'el libro de pagos: dinero de verdad' },
  refunds: { criticidad: 'CRITICAL', porque: 'el libro de devoluciones' },
  revenue: { criticidad: 'CRITICAL', porque: 'el libro de ingresos' },
  aiGenerations: { criticidad: 'CRITICAL', porque: 'el libro de coste de proveedor: qué se pagó por fuera y qué se cobró por dentro' },
  'creatorJobs/{jobId}/private': { criticidad: 'CRITICAL', porque: 'el coste real de un trabajo, separado de lo que ve la persona' },

  /* ── Contenido y propiedad ───────────────────────────────────────────── */
  posts: { criticidad: 'CRITICAL', porque: 'las publicaciones: es lo que la gente hizo, y no existe en ningún otro sitio' },
  assets: { criticidad: 'CRITICAL', porque: 'los metadatos del material: de quién es y dónde está el archivo' },
  contents: { criticidad: 'CRITICAL', porque: 'el modelo de contenido del Core' },
  publications: { criticidad: 'CRITICAL', porque: 'el modelo de publicación del Core' },
  creatorProjects: { criticidad: 'CRITICAL', porque: 'los proyectos de la cuenta: organizan trabajos y material' },

  /* ── Moderación ──────────────────────────────────────────────────────── */
  reports: { criticidad: 'CRITICAL', porque: 'una denuncia es una señal de alguien sobre algo, y no se puede volver a pedir' },
  'reports/{reportId}/history': { criticidad: 'CRITICAL', porque: 'la auditoría de una decisión de moderación' },
  moderationLimits: { criticidad: 'IMPORTANT', porque: 'el ritmo por cuenta; perderlo solo regala intentos' },

  /* ── Lo que la gente hizo ────────────────────────────────────────────── */
  comments: { criticidad: 'IMPORTANT', porque: 'lo que alguien escribió' },
  votes: { criticidad: 'IMPORTANT', porque: 'los votos de las encuestas' },
  commentVotes: { criticidad: 'IMPORTANT', porque: 'los votos de los comentarios' },
  'posts/{postId}/pollVotes': { criticidad: 'IMPORTANT', porque: 'el voto de cada persona en una encuesta' },
  likes: { criticidad: 'IMPORTANT', porque: 'las reacciones a una publicación: quién aplaudió qué' },
  follows: { criticidad: 'IMPORTANT', porque: 'el grafo social: quién sigue a quién, y con qué cara' },
  businessFollows: { criticidad: 'IMPORTANT', porque: 'el grafo de seguimiento de WeeBiz' },
  businesses: { criticidad: 'IMPORTANT', porque: 'los negocios de Weë Business' },
  communities: { criticidad: 'IMPORTANT', porque: 'las comunidades y su pertenencia' },
  econtacts: { criticidad: 'IMPORTANT', porque: 'las conexiones ËContact' },
  conversations: { criticidad: 'IMPORTANT', porque: 'las conversaciones de WeeTalk' },
  'conversations/{conversationId}/messages': { criticidad: 'IMPORTANT', porque: 'los mensajes: privados y no reconstruibles' },
  notifications: { criticidad: 'IMPORTANT', porque: 'los avisos ya entregados; rehacerlos sería volver a avisar' },
  'users/{uid}/bookmarks': { criticidad: 'IMPORTANT', porque: 'lo que alguien guardó' },

  /* ── Trabajo con IA ──────────────────────────────────────────────────── */
  creatorJobs: { criticidad: 'IMPORTANT', porque: 'los trabajos de Weë AI y sus resultados' },
  brainChats: { criticidad: 'IMPORTANT', porque: 'las conversaciones con Weë Brain' },
  'brainChats/{chatId}/messages': { criticidad: 'IMPORTANT', porque: 'lo que se habló con Weë Brain' },
  jobs: { criticidad: 'IMPORTANT', porque: 'el almacén del Job Engine del Core, cuando exista' },
  workflows: { criticidad: 'IMPORTANT', porque: 'los workflows del Core, cuando existan' },
  workflowRuns: { criticidad: 'IMPORTANT', porque: 'las ejecuciones de workflow, cuando existan' },
  outbox: { criticidad: 'IMPORTANT', porque: 'la bandeja de salida de eventos: se conserva como historial, NUNCA se reenvía' },
  events: { criticidad: 'IMPORTANT', porque: 'el historial de eventos: se conserva, no se vuelve a ejecutar' },

  /* ── Derivado: se dice desde qué, o no es derivado ───────────────────── */
  aiUsage: { criticidad: 'DERIVED', porque: 'consumo por día y proveedor', seReconstruyeDesde: 'aiGenerations, agregando por día y proveedor' },
  creatorUsage: { criticidad: 'DERIVED', porque: 'consumo por día y capacidad', seReconstruyeDesde: 'aiGenerations, agregando por día y capacidad' },
  brainUsage: { criticidad: 'DERIVED', porque: 'cuántas respuestas lleva alguien', seReconstruyeDesde: 'brainChats/{id}/messages, contando las respuestas' },
  'brainUsage/{uid}/respuestas': { criticidad: 'DERIVED', porque: 'el detalle del consumo de Brain', seReconstruyeDesde: 'brainChats/{id}/messages' },
  aiRateLimits: { criticidad: 'DERIVED', porque: 'contadores de ritmo; se rellenan solos', seReconstruyeDesde: 'nada: caducan y vuelven a empezar' },
  aiProviderVerification: { criticidad: 'DERIVED', porque: 'si un proveedor contestó de verdad alguna vez', seReconstruyeDesde: 'una llamada de verificación a cada proveedor' },
  contadores: { criticidad: 'DERIVED', porque: 'contadores agregados', seReconstruyeDesde: 'la colección que cuentan' },
  pushTokens: { criticidad: 'DERIVED', porque: 'los aparatos vuelven a registrarse al abrir la app', seReconstruyeDesde: 'el propio aparato, al arrancar' },

  /* ── Configuración: se puede volver a poner, pero hay que saber cuál era ── */
  aiProviders: { criticidad: 'IMPORTANT', porque: 'el interruptor de cada proveedor: sin él vuelven los valores por defecto' },
  aiRouting: { criticidad: 'IMPORTANT', porque: 'las cadenas de enrutado; sin ellas mandan las del código' },
  aiSettings: { criticidad: 'IMPORTANT', porque: 'los ajustes del motor' },
  creditCosts: { criticidad: 'IMPORTANT', porque: 'los precios en Credits; sin ellos mandan los del código' },
});

export type ClasificacionDeColeccion =
  | { ok: true; ruta: string; clase: ClaseDeDatos }
  | { ok: false; ruta: string; code: 'unclassified' };

/**
 * De una ruta REAL a su clase. Los identificadores se sustituyen por su
 * plantilla, porque `accounts/abc123/members` y `accounts/xyz/members` son la
 * misma cosa.
 */
export const plantillaDeRuta = (ruta: string): string => {
  const partes = ruta.split('/').filter(Boolean);
  if (partes.length % 2 === 0) return ruta; /* una ruta de colección tiene partes impares */
  return partes.map((p, i) => (i % 2 === 1 ? `{${partes[i - 1].replace(/s$/, '')}Id}` : p)).join('/');
};

/**
 * CÓMO SE LLAME EL HUECO NO ES PARTE DE LA RUTA.
 *
 * `accounts/{accountId}/members` y `accounts/{id}/members` son la MISMA
 * colección, y quien genera la plantilla no tiene por qué adivinar el nombre
 * que se le puso aquí. Se compara con los huecos vacíos, y así una subcolección
 * no se queda sin clasificar por una diferencia de vocabulario — que es
 * exactamente como algo se quedaría fuera de la copia sin que nadie lo notara.
 */
export const claveDeClasificacion = (ruta: string): string => ruta.replace(/\{[^}]*\}/g, '{}');

const POR_CLAVE: Readonly<Record<string, ClaseDeDatos>> = Object.freeze(
  Object.fromEntries(Object.entries(CLASIFICACION_DE_DATOS).map(([k, v]) => [claveDeClasificacion(k), v])),
);

export const clasificarColeccion = (ruta: string): ClasificacionDeColeccion => {
  const clase = POR_CLAVE[claveDeClasificacion(ruta)] ?? POR_CLAVE[claveDeClasificacion(plantillaDeRuta(ruta))];
  return clase ? { ok: true, ruta, clase } : { ok: false, ruta, code: 'unclassified' };
};

/** Lo derivado tiene que decir desde qué. Una prueba lo exige y por eso está aquí. */
export const clasificacionCoherente = (): readonly string[] =>
  Object.entries(CLASIFICACION_DE_DATOS)
    .filter(([, c]) => (c.criticidad === 'DERIVED') !== (typeof c.seReconstruyeDesde === 'string' && c.seReconstruyeDesde.length > 0))
    .map(([k]) => k);

/* ── Los bytes, que no están donde están los datos ───────────────────────── */

/**
 * DÓNDE VIVE UN ARCHIVO DE VERDAD, Y SI PODEMOS RECUPERARLO.
 *
 * Una URL no es una copia de seguridad. Guardar `https://…/foto.jpg` en
 * Firestore respalda la DIRECCIÓN de la foto, no la foto. Si quien la aloja la
 * pierde, la copia de Firestore restaura un enlace roto — y con toda la
 * apariencia de haber funcionado.
 */
export type Recuperabilidad = 'RECOVERABLE' | 'PARTIALLY_RECOVERABLE' | 'NOT_CURRENTLY_RECOVERABLE';

export interface AlmacenDeBytes {
  /** El dominio tal como aparece en los datos. Es lo que permite clasificar una URL guardada. */
  dominio: string;
  recuperabilidad: Recuperabilidad;
  porque: string;
}

/**
 * LA TABLA DE DOMINIOS NO ESTÁ AQUÍ, Y NO ES UN OLVIDO.
 *
 * El Core no nombra proveedores —es la misma regla que mantiene al Router y al
 * Gateway sin un solo `if` por empresa, y la que comprueba la Fase 0—. Qué
 * dominio es de quién cambia con los contratos comerciales; la FORMA de la
 * respuesta, no. Así que aquí vive el vocabulario y la regla, y la tabla la pone
 * quien compone: `scripts/copias.mjs`, con los dominios reales medidos en
 * producción (docs/BACKUP.md § 4).
 */
export type TablaDeAlmacenes = readonly AlmacenDeBytes[];

/** Clasifica una URL contra la tabla que le den. `undefined` = nadie la reconoce, y eso es un hallazgo. */
export const recuperabilidadDeUrl = (url: unknown, tabla: TablaDeAlmacenes): AlmacenDeBytes | undefined =>
  esTexto(url) ? tabla.find((a) => url.includes(a.dominio)) : undefined;

/**
 * Un almacén sin clasificar es material que nadie sabe si se puede recuperar.
 * Se devuelven los dominios que la tabla no reconoce para que se decidan, en vez
 * de darlos por recuperables — que es como se pierde algo creyendo tenerlo.
 */
export const dominiosSinClasificar = (dominios: readonly string[], tabla: TablaDeAlmacenes): readonly string[] =>
  Object.freeze(dominios.filter((d) => !tabla.some((a) => d.includes(a.dominio))).sort());

/* ── La huella ────────────────────────────────────────────────────────────── */

/**
 * LOS TIPOS DE FIRESTORE QUE NO SON JSON, YA TRADUCIDOS.
 *
 * El Core no importa Firestore, así que no puede reconocer un `Timestamp`. Lo
 * que hace es DECLARAR con qué forma quiere recibirlos, y quien lee los
 * convierte. Así la huella no depende de la versión del SDK: un `Timestamp` que
 * un día se serialice distinto sigue dando la misma huella.
 */
export interface MarcaEspecial {
  __wee: 'ts' | 'geo' | 'bytes' | 'ref';
  v: string;
}

export const esMarcaEspecial = (v: unknown): v is MarcaEspecial =>
  esObjetoPlano(v) && typeof (v as unknown as MarcaEspecial).__wee === 'string' && esTexto((v as unknown as MarcaEspecial).v);

/**
 * CANONIZAR: el mismo dato, siempre el mismo texto.
 *
 * Las claves van ordenadas porque el orden en que Firestore devuelve los campos
 * no es parte del dato, y dos lecturas del MISMO documento pueden traerlas
 * distintas. Esa trampa ya costó un falso positivo de 190 documentos
 * «modificados» en la Fase 11.x-5B.
 *
 * Los tipos van con su marca —`s:`, `n:`, `b:`— para que el texto `1` y el
 * número 1 no den la misma huella: si un día una migración convierte un número
 * en texto, esto tiene que notarlo.
 */
export const canonizar = (valor: unknown, profundidad = 0): string => {
  if (profundidad > 32) return 'x:profundidad';
  if (valor === null) return 'z:null';
  if (valor === undefined) return 'z:undef';
  if (esMarcaEspecial(valor)) return `${valor.__wee}:${valor.v}`;
  if (Array.isArray(valor)) return `a:[${valor.map((v) => canonizar(v, profundidad + 1)).join(',')}]`;
  if (esObjetoPlano(valor)) {
    const claves = Object.keys(valor).sort();
    return `o:{${claves.map((k) => `${JSON.stringify(k)}=${canonizar(valor[k], profundidad + 1)}`).join(',')}}`;
  }
  if (typeof valor === 'boolean') return `b:${valor}`;
  if (typeof valor === 'number') return Number.isNaN(valor) ? 'n:nan' : `n:${Object.is(valor, -0) ? '0' : String(valor)}`;
  if (esTexto(valor)) return `s:${JSON.stringify(valor)}`;
  return `x:${typeof valor}`;
};

/*
 * La huella la calcula quien tenga criptografía; el Core no importa `crypto`.
 * Es el MISMO puerto con el que la moderación deduplica un reporte
 * (`core/moderation.ts`), reutilizado a propósito: dos formas distintas de
 * pedir «dame un hash» acabarían siendo dos algoritmos distintos.
 */

export interface DocumentoParaHuella {
  /** La ruta completa, que es parte de la identidad: el mismo dato en otro sitio es otro dato. */
  ruta: string;
  datos: Readonly<Record<string, unknown>>;
}

export interface HuellaDeColeccion {
  ruta: string;
  documentos: number;
  /** La huella de la colección entera. Cambia si cambia un byte de cualquier documento. */
  huella: string;
  /** Ruta → huella del documento. Es lo que permite decir CUÁL cambió, no solo que algo cambió. */
  porDocumento: Readonly<Record<string, string>>;
}

/**
 * El separador entre la ruta y el contenido: un carácter que no puede aparecer
 * dentro de ninguno de los dos. Se construye en tiempo de ejecución a propósito:
 * escrito como escape se convierte en un byte crudo dentro del fuente, y un
 * fuente con bytes de control deja de ser texto para git y para `grep`.
 */
const SEPARADOR = String.fromCharCode(0);

export const huellaDeDocumento = (hash: Huella, doc: DocumentoParaHuella): string =>
  hash(`${doc.ruta}${SEPARADOR}${canonizar(doc.datos)}`);

/**
 * La huella de una colección: las de sus documentos, ORDENADAS y encadenadas.
 * Ordenadas porque el orden de lectura no es parte del dato; encadenadas porque
 * sumar hashes deja que dos cambios se anulen entre sí.
 */
export const huellaDeColeccion = (hash: Huella, ruta: string, docs: readonly DocumentoParaHuella[]): HuellaDeColeccion => {
  const porDocumento: Record<string, string> = {};
  for (const d of docs) porDocumento[d.ruta] = huellaDeDocumento(hash, d);
  const ordenadas = Object.keys(porDocumento).sort().map((r) => `${r}:${porDocumento[r]}`);
  return Object.freeze({
    ruta,
    documentos: docs.length,
    huella: hash(`${BACKUP_CONTRACT_VERSION}${SEPARADOR}${ruta}${SEPARADOR}${ordenadas.join('\n')}`),
    porDocumento: Object.freeze(porDocumento),
  });
};

/* ── Comparar ─────────────────────────────────────────────────────────────── */

export interface DiferenciaDeColeccion {
  ruta: string;
  iguales: boolean;
  documentosOriginal: number;
  documentosRestaurado: number;
  /** Rutas, nunca contenido: decir QUÉ documento cambió no obliga a enseñar lo que dice. */
  faltan: readonly string[];
  sobran: readonly string[];
  cambian: readonly string[];
}

export interface ComparacionDeCopia {
  iguales: boolean;
  colecciones: readonly DiferenciaDeColeccion[];
  /** Colecciones que estaban en el original y ni siquiera aparecen en la copia. */
  coleccionesAusentes: readonly string[];
  coleccionesNuevas: readonly string[];
  resumen: { colecciones: number; documentosOriginal: number; documentosRestaurado: number; conDiferencias: number };
}

const MAX_RUTAS = 50;

/**
 * ¿ES LO MISMO? Y si no, exactamente qué.
 *
 * Contar documentos no es verificar. Dos colecciones con 19 documentos cada una
 * pueden no tener ni uno en común. Lo que se compara es la huella de cada
 * documento, por su ruta.
 */
export const compararHuellas = (
  original: readonly HuellaDeColeccion[],
  restaurado: readonly HuellaDeColeccion[],
): ComparacionDeCopia => {
  const porRutaR = new Map(restaurado.map((c) => [c.ruta, c]));
  const porRutaO = new Map(original.map((c) => [c.ruta, c]));
  const colecciones: DiferenciaDeColeccion[] = [];

  for (const o of original) {
    const r = porRutaR.get(o.ruta);
    const faltan: string[] = [];
    const cambian: string[] = [];
    for (const [ruta, h] of Object.entries(o.porDocumento)) {
      const otro = r?.porDocumento[ruta];
      if (otro === undefined) faltan.push(ruta);
      else if (otro !== h) cambian.push(ruta);
    }
    const sobran = r ? Object.keys(r.porDocumento).filter((ruta) => o.porDocumento[ruta] === undefined) : [];
    colecciones.push(Object.freeze({
      ruta: o.ruta,
      iguales: !!r && r.huella === o.huella && faltan.length === 0 && sobran.length === 0 && cambian.length === 0,
      documentosOriginal: o.documentos,
      documentosRestaurado: r?.documentos ?? 0,
      faltan: Object.freeze(faltan.sort().slice(0, MAX_RUTAS)),
      sobran: Object.freeze(sobran.sort().slice(0, MAX_RUTAS)),
      cambian: Object.freeze(cambian.sort().slice(0, MAX_RUTAS)),
    }));
  }

  const coleccionesNuevas = restaurado.filter((r) => !porRutaO.has(r.ruta)).map((r) => r.ruta).sort();
  const coleccionesAusentes = original.filter((o) => !porRutaR.has(o.ruta)).map((o) => o.ruta).sort();
  const conDiferencias = colecciones.filter((c) => !c.iguales).length;

  return Object.freeze({
    iguales: conDiferencias === 0 && coleccionesNuevas.length === 0 && coleccionesAusentes.length === 0,
    colecciones: Object.freeze(colecciones),
    coleccionesAusentes: Object.freeze(coleccionesAusentes),
    coleccionesNuevas: Object.freeze(coleccionesNuevas),
    resumen: Object.freeze({
      colecciones: colecciones.length,
      documentosOriginal: original.reduce((a, c) => a + c.documentos, 0),
      documentosRestaurado: restaurado.reduce((a, c) => a + c.documentos, 0),
      conDiferencias,
    }),
  });
};

/* ── Relaciones ───────────────────────────────────────────────────────────── */

/**
 * LAS ARISTAS QUE NO PUEDEN ROMPERSE.
 *
 * Una copia puede tener el número correcto de documentos y estar rota igual: un
 * `accounts` completo y un `entities` al que le falta uno deja una cuenta que
 * cree tener una cara que no existe. Contar no lo ve; esto sí.
 *
 * `opcional` marca la arista que puede no apuntar a nada por diseño —una Página
 * recién creada todavía no tiene perfil—. Lo que nunca se admite es que apunte
 * a algo que NO ESTÁ.
 */
export interface Relacion {
  desde: string;
  campo: string;
  hacia: string;
  /** Con qué se busca en el destino: su identificador de documento o un campo suyo. */
  por: 'id' | string;
  opcional?: boolean;
  porque: string;
}

export const RELACIONES: readonly Relacion[] = Object.freeze([
  { desde: 'accounts', campo: 'realProfileEntityId', hacia: 'entities', por: 'id', porque: 'toda cuenta tiene su Perfil Real' },
  { desde: 'accounts', campo: 'weeProfileEntityId', hacia: 'entities', por: 'id', opcional: true, porque: 'la cara Weë existe solo si se creó' },
  { desde: 'accounts', campo: 'accountNumber', hacia: 'accountNumbers', por: 'id', porque: 'el número tiene que estar reservado en el índice' },
  { desde: 'accountNumbers', campo: 'accountId', hacia: 'accounts', por: 'id', porque: 'un número reservado apunta a una cuenta que existe' },
  { desde: 'entities', campo: 'ownerAccountId', hacia: 'accounts', por: 'id', porque: 'toda cara es de una cuenta' },
  { desde: 'users', campo: 'entityId', hacia: 'entities', por: 'entityId', opcional: true, porque: 'la referencia pública del perfil; las copias históricas no la tienen' },
  { desde: 'creditTransactions', campo: 'userId', hacia: 'users', por: 'uid', porque: 'un movimiento de Credits es de alguien' },
  { desde: 'reports', campo: 'reporterAccountId', hacia: 'accounts', por: 'id', porque: 'una denuncia la hace una cuenta' },
  { desde: 'reports', campo: 'targetOwnerAccountId', hacia: 'accounts', por: 'id', opcional: true, porque: 'de quién era lo denunciado, cuando se pudo leer' },
  { desde: 'assets', campo: 'ownerAccountId', hacia: 'accounts', por: 'id', porque: 'el material es de una cuenta' },
  { desde: 'comments', campo: 'postId', hacia: 'posts', por: 'id', porque: 'un comentario cuelga de una publicación' },
]);

export interface IndiceDeDocumentos {
  /** Colección → identificadores de documento presentes. */
  ids: Readonly<Record<string, ReadonlySet<string>>>;
  /** Colección → campo → valores presentes. Para las aristas que no buscan por id. */
  porCampo: Readonly<Record<string, Readonly<Record<string, ReadonlySet<string>>>>>;
  /** Colección → id → los valores de los campos que son origen de alguna arista. */
  origenes: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, unknown>>>>>>;
}

export interface AristaRota {
  desde: string;
  documento: string;
  campo: string;
  hacia: string;
  porque: string;
}

/**
 * Recorre las aristas declaradas y devuelve las que apuntan al vacío. Devuelve
 * rutas y nombres de campo: nunca el valor, que podría ser un identificador de
 * alguien.
 */
export const verificarRelaciones = (indice: IndiceDeDocumentos, relaciones: readonly Relacion[] = RELACIONES): readonly AristaRota[] => {
  const rotas: AristaRota[] = [];
  for (const r of relaciones) {
    const origen = indice.origenes[r.desde];
    if (!origen) continue; /* la colección no existe en estos datos: no hay nada que comprobar */
    const destino = r.por === 'id' ? indice.ids[r.hacia] : indice.porCampo[r.hacia]?.[r.por];
    for (const [id, campos] of Object.entries(origen)) {
      const valor = campos[r.campo];
      if (valor === undefined || valor === null || valor === '') { if (!r.opcional) rotas.push({ desde: r.desde, documento: id, campo: r.campo, hacia: r.hacia, porque: 'falta el campo' }); continue; }
      if (!esTexto(valor)) { rotas.push({ desde: r.desde, documento: id, campo: r.campo, hacia: r.hacia, porque: 'el campo no es un identificador' }); continue; }
      if (!destino || !destino.has(valor)) rotas.push({ desde: r.desde, documento: id, campo: r.campo, hacia: r.hacia, porque: 'apunta a algo que no está' });
    }
  }
  return Object.freeze(rotas);
};

/* ── Restaurar sin que pase nada ─────────────────────────────────────────── */

/**
 * RESTAURAR NO ES VOLVER A EJECUTAR.
 *
 * Un trabajo restaurado no puede salir otra vez hacia un proveedor, un aviso
 * restaurado no puede volver a sonar, y un movimiento de Credits restaurado no
 * puede volver a cobrarse. Esta lista es lo que hay que comprobar que NO pasó
 * después de una restauración: si el documento existe, tiene que estar donde
 * estaba, no haberse vuelto a producir.
 */
export type SeguridadDeRestauracion = 'SAFE_TO_RESTORE' | 'NEEDS_RECONCILIATION' | 'NOT_REPLAYABLE';

export interface EstadoDeTrabajoRestaurado {
  /** El estado guardado del trabajo, sea del Job Engine del Core o de `creatorJobs`. */
  estado: string;
  /** ¿Salió algo hacia el proveedor y no se sabe cómo acabó? */
  salioSinRespuesta?: boolean;
}

/**
 * Qué se puede hacer con un trabajo que sale de una copia.
 *
 * Lo terminado se restaura y no se toca. Lo que estaba en la cola se puede
 * volver a poner en la cola, porque nunca llegó a salir. Lo que estaba
 * ejecutándose —o lo que salió y no contestó— NO se relanza: eso es el problema
 * del desenlace desconocido del Job Engine, y repetirlo puede pagar dos veces.
 */
export const seguridadDeRestauracion = (job: EstadoDeTrabajoRestaurado): SeguridadDeRestauracion => {
  const estado = esTexto(job?.estado) ? job.estado.toLowerCase() : '';
  if (job?.salioSinRespuesta) return 'NOT_REPLAYABLE';
  if (['completed', 'failed', 'cancelled', 'timed_out', 'done'].includes(estado)) return 'SAFE_TO_RESTORE';
  if (['queued', 'planned', 'asking', 'created'].includes(estado)) return 'SAFE_TO_RESTORE';
  if (['running', 'waiting', 'dispatched', 'cancel_requested'].includes(estado)) return 'NEEDS_RECONCILIATION';
  return 'NEEDS_RECONCILIATION';
};

/**
 * LO QUE UNA RESTAURACIÓN NO PUEDE PROVOCAR.
 *
 * En Weë hay tres disparadores `onDocumentCreated` en producción
 * —`nacimientoDeCuenta` sobre `users`, y los dos de avisos sobre
 * `notifications` y los mensajes—, así que estas colecciones son justo las que
 * hay que mirar después de restaurar: si aparece en ellas un documento que la
 * copia no traía, algo se ejecutó.
 */
export const COLECCIONES_CON_DISPARADOR: readonly string[] = Object.freeze([
  'users', 'notifications', 'conversations/{conversationId}/messages',
]);

export interface EfectoLateral {
  ruta: string;
  documentos: readonly string[];
}

/**
 * ¿Apareció algo que la copia no traía? Es la comprobación de «no se volvió a
 * ejecutar nada», y se hace con la misma comparación de huellas: lo que sobra
 * en el destino y no estaba en el origen.
 */
export const efectosLaterales = (comparacion: ComparacionDeCopia): readonly EfectoLateral[] =>
  Object.freeze(comparacion.colecciones
    .filter((c) => c.sobran.length > 0)
    .map((c) => Object.freeze({ ruta: c.ruta, documentos: c.sobran })));

/* ── Lo que nunca se imprime ─────────────────────────────────────────────── */

/**
 * Una huella es un hash y no enseña nada, pero una herramienta de copia acaba
 * imprimiendo cosas para que alguien las lea. Esta lista es la que NUNCA.
 */
export const CAMPOS_QUE_NO_SE_IMPRIMEN: readonly string[] = Object.freeze([
  'passwordHash', 'passwordSalt', 'apiKey', 'api_key', 'authorization', 'token', 'refreshToken',
  'secret', 'password', 'credential', 'credentials', 'cardNumber', 'cvv', 'cvc', 'pin',
  'email', 'phoneNumber', 'photoURL',
]);

export const sePuedeImprimir = (clave: string): boolean =>
  !CAMPOS_QUE_NO_SE_IMPRIMEN.some((c) => c.toLowerCase() === String(clave).toLowerCase());

/* ── El veredicto ────────────────────────────────────────────────────────── */

export interface ResumenFinanciero {
  creditTransactions: number;
  sumaDeSaldos: number;
  circulating: number | null;
  documentosDeCreditStats: number;
}

export interface ResumenDeIdentidad {
  accounts: number;
  accountNumbers: number;
  entities: number;
  memberships: number;
  users: number;
  /** Identificador de entidad → su tipo y secuencia guardados. Ni se deducen ni se recalculan. */
  tiposDeEntidad: Readonly<Record<string, string>>;
}

export interface VeredictoDeRecuperacion {
  copiaCreada: boolean;
  restauracionHecha: boolean;
  integridad: boolean;
  identidad: boolean;
  financiero: boolean;
  relaciones: boolean;
  sinEfectosLaterales: boolean;
  produccionIntacta: boolean;
}

/**
 * VERIFIED solo si TODO se cumple. No hay verificación parcial: una copia que
 * restaura ocho cosas de nueve no es una estrategia de recuperación, es una
 * estrategia de recuperación de ocho cosas — y el día malo no se sabe cuál era
 * la novena.
 */
export const estaVerificado = (v: VeredictoDeRecuperacion): boolean =>
  Object.values(v).every((x) => x === true);

export const loQueFalla = (v: VeredictoDeRecuperacion): readonly string[] =>
  Object.freeze(Object.entries(v).filter(([, x]) => x !== true).map(([k]) => k));
