import { getFirestore } from 'firebase-admin/firestore';
import { cuentaDeIdentidad, PerfilDeIdentidad } from '../social/econtact';
import { CODIGOS_DE_PAISES_DEL_CATALOGO } from '../shared/paisesDelCatalogo';

/**
 * DE DÓNDE SALE LA JURISDICCIÓN DE UNA OPERACIÓN (2026-10-05). No es un sistema nuevo: es el conector entre lo que
 * Weë YA guarda de una persona y `EngineContext.jurisdicciones`, que lee la regla común (`elegibilidad.ts`).
 *
 * Lo que Weë tiene, auditado:
 *  · el IDIOMA y sus formatos (`i18n/`, `contexts/IdiomaContext.tsx`) no miran la ubicación y no son una autoridad
 *    legal: aquí no se usan;
 *  · el PAÍS DECLARADO del Perfil Real (`users.country`, ISO 3166-1 alfa-2), obligatorio en el registro
 *    (`screens/OnboardingScreen.tsx`): es la única ubicación que Weë guarda de una persona, y es la que se lee;
 *  · el `country` del Financial Core (cuenta y cobros) es un contrato sin datos todavía: nadie abre esas cuentas.
 *
 * Se lee en el SERVIDOR, del perfil que el resolutor canónico (`cuentaDeIdentidad`) reconoce como Perfil Real de esa
 * cuenta —nunca deduciendo por el id del documento, nunca de lo que mande el cliente, ni de la IP, ni del
 * dispositivo—. Si la cuenta tiene más de un Perfil Real con países distintos, la operación los toca todos (cualquiera
 * bloquea). Sin un país válido no hay jurisdicción, y la regla común falla cerrado.
 *
 * Es una DECLARACIÓN de la persona, no una verificación. La política de Weë (decisión del dueño, 2026-10-06): el país
 * del Perfil Real es la fuente; si un modelo tiene una restricción territorial EXPLÍCITA para ese país, queda fuera; si
 * no, puede usarse según la política de Weë (su revisión legal y su activación siguen mandando). Nunca se le pregunta a
 * la persona nada legal ni técnico.
 *
 * SOLO CUENTA UN PAÍS DEL CATÁLOGO DE WEË: los mismos que ofrece el registro (`data/countries.ts`, copiados por
 * `scripts/paises-del-catalogo.mjs` a un archivo generado). Cualquier otro valor —aunque tenga forma de código: «UK»,
 * «EU», «ZZ», un territorio que el catálogo no ofrece— no es un país que Weë pueda determinar. Y basta UNO: si algún
 * Perfil Real de la cuenta declara algo que no es un país del catálogo, la cuenta entera queda sin jurisdicción —no se
 * elige el país de otro perfil—, y para un modelo con reglas territoriales eso es JURISDICTION_UNKNOWN: falla cerrado.
 * Un perfil que no declara nada (vacío) no cuenta: no es una declaración.
 */

/** Un país declarado válido: ISO 3166-1 alfa-2, en mayúsculas, y del catálogo de Weë. */
const CODIGO = /^[A-Z]{2}$/;
export const PAISES_DEL_CATALOGO: ReadonlySet<string> = new Set(CODIGOS_DE_PAISES_DEL_CATALOGO);
/** El mismo techo de perfiles por cuenta que usan el Credit Engine y el nacimiento de la cuenta. */
const PERFILES_POR_CUENTA = 10;

/**
 * Pura: los países que declaran los Perfiles Reales de esa cuenta, sin repetir y ordenados. `undefined` si ninguno
 * declara nada, o si ALGUNO declara algo que no es un país del catálogo (no se puede determinar el país de la cuenta).
 */
export const jurisdiccionesDeclaradas = (
  userId: string,
  perfiles: readonly (Record<string, unknown> | undefined)[],
): string[] | undefined => {
  const declarados = perfiles
    .filter((p): p is Record<string, unknown> => !!p && cuentaDeIdentidad(userId, p as PerfilDeIdentidad) === userId)
    .map((p) => p.country)
    .filter((c) => c !== undefined && c !== null && c !== '');
  const paisDelCatalogo = (c: unknown): c is string => typeof c === 'string' && CODIGO.test(c) && PAISES_DEL_CATALOGO.has(c);
  if (!declarados.length || !declarados.every(paisDelCatalogo)) return undefined;
  return [...new Set(declarados as string[])].sort();
};

/** La fuente de la cuenta, en Firestore. La compone `engine/index.ts`; el Router solo la consulta si hace falta. */
export const jurisdiccionesDeLaCuenta = async (userId: string): Promise<string[] | undefined> => {
  if (typeof userId !== 'string' || !userId || userId.includes('/')) return undefined;
  const snap = await getFirestore().collection('users').where('uid', '==', userId).limit(PERFILES_POR_CUENTA).get();
  return jurisdiccionesDeclaradas(userId, snap.docs.map((d) => d.data()));
};
