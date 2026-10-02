import { useEffect, useState } from 'react';
import { messagesService, Conversation } from '../services/messagesService';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';

/**
 * LAS CONVERSACIONES DE LA CARA ACTIVA, ESCUCHADAS UNA SOLA VEZ (Fase 11.x-6).
 *
 * ── El fallo que corrige ──────────────────────────────────────────────────
 *
 * Había DOS oyentes en tiempo real sobre exactamente la misma consulta
 * —`conversations` donde participas—: uno en la bandeja, para la lista, y otro
 * en la navegación, para el número de no leídos. Dos suscripciones, dos veces
 * el mismo conjunto de documentos, y las dos reentregándolo entero en cada
 * cambio. Con la app abierta todo el día eso se paga dos veces.
 *
 * Y había algo peor que la repetición: **contaban cosas distintas**. La lista
 * usaba la cara ACTIVA y el contador la cuenta, así que con el Perfil Weë
 * puesto el número del icono no correspondía a lo que la bandeja enseñaba. Una
 * conversación es de la CARA con la que se habla —esa es la razón de tener dos
 * caras—, así que ahora las dos miran lo mismo.
 *
 * ── El patrón ─────────────────────────────────────────────────────────────
 *
 * El mismo que `hooks/useBookmarks.ts`, que ya lo resolvió para los guardados:
 * el estado y la suscripción viven en el MÓDULO, y cada consumidor solo se
 * apunta y se desapunta de un conjunto de oyentes. N componentes montados = 1
 * suscripción. Cambiar de cara cierra la anterior y abre la nueva; desmontar
 * el último consumidor NO la cierra, para no re-suscribirse en cada
 * navegación.
 *
 * ── Lo que falta y por qué no está ────────────────────────────────────────
 *
 * La consulta sigue SIN `orderBy` ni `limit`, y ordena en el cliente. Ponerle
 * `orderBy('updatedAt','desc')` exige un índice compuesto con
 * `participants array-contains`, y ese índice no está desplegado: añadirlo al
 * código antes que a producción rompería la bandeja de todo el mundo. El
 * índice está definido en `firestore.indexes.json` y, en cuanto se despliegue,
 * el `limit` entra aquí en una línea.
 */
type Oyente = (estado: EstadoDeConversaciones) => void;

export interface EstadoDeConversaciones {
  conversaciones: Conversation[];
  sinLeer: number;
  cargando: boolean;
}

const VACIO: EstadoDeConversaciones = { conversaciones: [], sinLeer: 0, cargando: true };

let identidadActual: string | null = null;
let estado: EstadoDeConversaciones = VACIO;
let cancelar: (() => void) | null = null;
const oyentes = new Set<Oyente>();

const avisar = () => oyentes.forEach((o) => o(estado));

/** Cuántas de estas conversaciones tienen algo sin leer PARA esta identidad. */
const contarSinLeer = (conversaciones: Conversation[], identidad: string): number =>
  conversaciones.reduce((n, c) => {
    const ultimo: any = (c as any).lastMessage;
    return n + (ultimo && !ultimo.read && ultimo.senderId !== identidad ? 1 : 0);
  }, 0);

const asegurarSuscripcion = (identidad: string | null) => {
  if (identidad === identidadActual) return;
  if (cancelar) { cancelar(); cancelar = null; }
  identidadActual = identidad;
  estado = { ...VACIO, cargando: !!identidad };
  avisar();
  if (!identidad) { estado = { conversaciones: [], sinLeer: 0, cargando: false }; avisar(); return; }
  try {
    cancelar = messagesService.subscribeToConversations(identidad, (conversaciones) => {
      estado = { conversaciones, sinLeer: contarSinLeer(conversaciones, identidad), cargando: false };
      avisar();
    });
  } catch {
    /* Un fallo al suscribirse deja la bandeja vacía y sin rueda, no colgada. */
    estado = { conversaciones: [], sinLeer: 0, cargando: false };
    avisar();
  }
};

/**
 * La bandeja y el número de no leídos, de la cara activa, con UNA suscripción
 * para toda la aplicación.
 */
export const useConversaciones = (): EstadoDeConversaciones => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  /* La conversación es de la cara con la que se habla, no de la cuenta. */
  const identidad = userProfile?.uid || user?.uid || null;
  const [actual, setActual] = useState<EstadoDeConversaciones>(estado);

  useEffect(() => {
    asegurarSuscripcion(identidad);
    oyentes.add(setActual);
    setActual(estado);
    return () => { oyentes.delete(setActual); };
  }, [identidad]);

  return actual;
};

/** Solo el número, para quien únicamente pinta el punto rojo. */
export const useSinLeer = (): number => useConversaciones().sinLeer;
