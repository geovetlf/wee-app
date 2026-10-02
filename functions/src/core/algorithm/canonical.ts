/**
 * WEE ALGORITHM ENGINE — LA FORMA CANÓNICA DE UN VALOR (S2-A · R2).
 *
 * ── Para qué sirve, y para qué no ───────────────────────────────────────────
 *
 * Para DESEMPATAR por contenido cuando todo lo que significa algo ya empató:
 * dos señales iguales en procedencia, fecha, muestra, valor y confianza
 * (`resolverSenales`), o dos fotos del mismo acumulador de A7 con la misma
 * fecha y la misma muestra (A8). Lo que decide entonces no puede ser el orden
 * en que llegaron. Es una CLAVE DE ORDEN: no se guarda, no identifica nada, no
 * es un criterio de calidad y nadie la lee como texto.
 *
 * ── Por qué es un archivo ────────────────────────────────────────────────────
 *
 * La primera versión de S2-A vivía en `signals.ts` y, al pasar de ocho niveles,
 * se quedaba en `JSON.stringify`: un ciclo la hacía lanzar, un BigInt también, y
 * un campo de 200 000 elementos costaba 106 ms en un desempate. Lo que se mira
 * aquí puede haberlo construido cualquiera —lo mismo que dice `violacionesEn`—.
 *
 * El Core ya tiene una forma canónica endurecida, la de la huella de una
 * operación del Job Engine (`core/job.ts`), pero es local a esa función y esta
 * capa no puede importar al Job Engine. Se toma su CRITERIO —topes de
 * profundidad y de anchura, un marcador en vez de una excepción— y no su
 * código; y es de esta capa porque solo esta capa desempata así.
 *
 * ── Lo que garantiza ─────────────────────────────────────────────────────────
 *
 *   DETERMINISTA   el mismo valor da la misma forma. El orden de las claves de
 *                  un objeto no cuenta; el de un array, sí.
 *   TOTAL          no lanza con nada: ni un ciclo, ni un BigInt, ni un getter o
 *                  un proxy que revientan —eso se escribe `e`—.
 *   ACOTADA        `LIMITES_DE_FORMA_CANONICA`. Un array, un texto o un BigInt se
 *                  leen hasta su tope y ni un elemento más. Un objeto hay que
 *                  ENUMERARLO para saber qué claves tiene —en V8 no hay otra
 *                  forma, y medido: cortar un `for…in` no la ahorra—, así que se
 *                  enumera UNA vez por objeto y por llamada, y si tiene más claves
 *                  que la anchura se resume con su número, sin ordenar ni escribir
 *                  ninguna. La recursión nunca baja de `profundidad`.
 *   EXACTA DENTRO  dos valores distintos que caben en los topes dan formas
 *   DE LOS TOPES   distintas: cada texto lleva su longitud y cada contenedor su
 *                  tamaño, así que nada se confunde con otra cosa por lo que
 *                  contiene. Más allá, lo que no se mira se resume, y dos valores
 *                  que SOLO difieren ahí comparten forma. Para lo que se usa no
 *                  importa: de una señal, todo lo que entra en una decisión —clave,
 *                  sujeto, valor, fuente, fecha, muestra, confianza— es corto por
 *                  contrato (`senalValida`) y cabe entero.
 *
 * ── La forma ─────────────────────────────────────────────────────────────────
 *
 *   u                undefined
 *   n                null
 *   b1 · b0          booleano
 *   d<número>        número; `-0`, `NaN`, `Infinity` y `-Infinity`, cada uno el suyo
 *   s<n>:<texto>     texto de longitud n; si pasa de `texto`, su principio y «…»
 *   i<dígitos>       BigInt, exacto mientras quepa en `texto` dígitos
 *   i±~<hex>         BigInt mayor: su signo y sus 4·`texto` bits bajos, sin pasar por Number
 *   y<texto>         símbolo, por su descripción
 *   f                función: su código no se mira
 *   v<bytes>         vista de un ArrayBuffer —un array tipado—: su tamaño
 *   a<n>[…]          array de n elementos: los primeros `anchura`, y «…» si hay más
 *   o<n>{k=v,…}      objeto plano con n claves propias, en orden; `x` si no es plano
 *   o<n>{…}          objeto con más claves que `anchura`; `o{…}` bajo `profundidad`
 *   ^<k>             el antepasado k niveles más arriba: así se escribe un ciclo, y
 *                    dos estructuras con el mismo ciclo dan la misma forma
 *   !                se acabó el presupuesto de nodos o de salida
 *   e                no se pudo leer
 */

/** Los topes de la forma canónica. Explícitos, congelados y los mismos para todos. */
export interface LimitesDeFormaCanonica {
  /** Niveles que se bajan. Un contenedor más hondo se resume: su tipo y, si es un array, su longitud. */
  readonly profundidad: number;
  /** Elementos de un array, o claves de un objeto, que se escriben como mucho. */
  readonly anchura: number;
  /** Valores que se visitan en total, cada hoja y cada contenedor. */
  readonly nodos: number;
  /** Caracteres de un texto —o dígitos de un BigInt— que entran tal cual. */
  readonly texto: number;
  /** Caracteres de salida: al llegar aquí no se escribe nada más que el cierre. */
  readonly salida: number;
}

export const LIMITES_DE_FORMA_CANONICA: Readonly<LimitesDeFormaCanonica> = Object.freeze({
  /* El de `violacionesEn` y el de la huella del Job Engine. */
  profundidad: 8,
  /* El de la huella del Job Engine. */
  anchura: 256,
  /* El de `violacionesEn`. */
  nodos: 4096,
  texto: 256,
  salida: 65_536,
});

/** Por debajo de 10^texto un BigInt se escribe entero; por encima, sus bits bajos. */
const MAYOR_ENTERO_EXACTO = BigInt(10) ** BigInt(LIMITES_DE_FORMA_CANONICA.texto);

const esPlano = (o: object): boolean => {
  const p = Object.getPrototypeOf(o);
  return p === Object.prototype || p === null;
};

export const formaCanonica = (valor: unknown): string => {
  const L = LIMITES_DE_FORMA_CANONICA;
  const partes: string[] = [];
  let caracteres = 0;
  let nodos = 0;
  /* Una enumeración por objeto y por llamada: un objeto ancho referenciado cien veces se lee una. */
  const clavesDe = new Map<object, readonly string[]>();
  /* Los contenedores abiertos, del de fuera al de dentro: con ellos se ve un ciclo. */
  const ancestros: object[] = [];

  const escribir = (s: string): void => { partes.push(s); caracteres += s.length; };
  const agotado = (): boolean => nodos >= L.nodos || caracteres >= L.salida;
  const texto = (t: string): string => `s${t.length}:${t.length > L.texto ? `${t.slice(0, L.texto)}…` : t}`;
  const entero = (v: bigint): string => (v < MAYOR_ENTERO_EXACTO && v > -MAYOR_ENTERO_EXACTO
    ? `i${v.toString()}`
    : `i${v < BigInt(0) ? '-' : '+'}~${BigInt.asUintN(4 * L.texto, v).toString(16)}`);

  const ver = (v: unknown, nivel: number): void => {
    if (agotado()) { escribir('!'); return; }
    nodos++;
    switch (typeof v) {
      case 'undefined': escribir('u'); return;
      case 'boolean': escribir(v ? 'b1' : 'b0'); return;
      case 'number': escribir(`d${Object.is(v, -0) ? '-0' : String(v)}`); return;
      case 'string': escribir(texto(v)); return;
      case 'bigint': escribir(entero(v)); return;
      case 'symbol': escribir(`y${texto(String(v))}`); return;
      case 'function': escribir('f'); return;
      default: break;
    }
    if (v === null) { escribir('n'); return; }
    const o = v as object;
    const atras = ancestros.lastIndexOf(o);
    if (atras >= 0) { escribir(`^${ancestros.length - atras}`); return; }

    /* Todo lo que puede reventar —un proxy, un getter, un prototipo raro— se pregunta ANTES de escribir. */
    let clase: 'vista' | 'array' | 'objeto';
    let cabeza = '';
    let largo = 0;
    let claves: readonly string[] = [];
    try {
      if (ArrayBuffer.isView(o)) {
        clase = 'vista';
        cabeza = `v${(o as ArrayBufferView).byteLength}`;
      } else if (Array.isArray(o)) {
        clase = 'array';
        /* Se lee una sola vez: un proxy podría contestar otra cosa, o reventar, la segunda. */
        largo = (o as readonly unknown[]).length;
        cabeza = `a${largo}`;
      } else {
        clase = 'objeto';
        cabeza = esPlano(o) ? 'o' : 'x';
        if (nivel < L.profundidad) {
          const vistas = clavesDe.get(o);
          claves = vistas ?? Object.keys(o);
          if (!vistas) clavesDe.set(o, claves);
        }
      }
    } catch {
      escribir('e');
      return;
    }

    if (clase === 'vista') { escribir(cabeza); return; }
    if (nivel >= L.profundidad) { escribir(clase === 'array' ? `${cabeza}[…]` : `${cabeza}{…}`); return; }

    if (clase === 'array') {
      const arr = o as readonly unknown[];
      const hasta = Math.min(largo, L.anchura);
      escribir(`${cabeza}[`);
      ancestros.push(o);
      try {
        for (let i = 0; i < hasta; i++) {
          if (i > 0) escribir(',');
          if (agotado()) { escribir('!'); break; }
          let hijo: unknown;
          try { hijo = arr[i]; } catch { escribir('e'); continue; }
          ver(hijo, nivel + 1);
        }
      } finally {
        ancestros.pop();
      }
      escribir(largo > hasta ? ',…]' : ']');
      return;
    }

    /* Un objeto más ancho que la anchura: su número de claves y ninguna más. */
    if (claves.length > L.anchura) { escribir(`${cabeza}${claves.length}{…}`); return; }
    const ordenadas = [...claves].sort();
    escribir(`${cabeza}${ordenadas.length}{`);
    ancestros.push(o);
    try {
      for (let i = 0; i < ordenadas.length; i++) {
        if (i > 0) escribir(',');
        if (agotado()) { escribir('!'); break; }
        escribir(`${texto(ordenadas[i])}=`);
        let hijo: unknown;
        try { hijo = (o as Record<string, unknown>)[ordenadas[i]]; } catch { escribir('e'); continue; }
        ver(hijo, nivel + 1);
      }
    } finally {
      ancestros.pop();
    }
    escribir('}');
  };

  ver(valor, 0);
  return partes.join('');
};
