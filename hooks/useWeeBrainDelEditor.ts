import { useCallback, useEffect, useRef, useState } from 'react';
import { useIdioma } from '../contexts/IdiomaContext';
import { brainService, newMessageId, type BrainBlock, type BrainQuote, type PropuestaDeWeeBrain } from '../services/brainService';
import { creditsShortfall, type CreditsShortfall } from '../services/creditsService';

/**
 * WEË FILMMAKER · FASE 20 · WEË BRAIN DENTRO DEL EDITOR DE UNA PRODUCCIÓN.
 *
 * La misma inteligencia de siempre, por la misma puerta (`brainChat`), con la
 * producción abierta como contexto (Fase 9 del motor): la persona le cuenta qué
 * quiere cambiar y Weë Brain contesta —y, si puede, PROPONE operaciones de F1-A
 * que el servidor ya comprobó en memoria sobre la producción guardada—. Aquí no
 * se aplica nada: aplicar lo decide la persona, con un gesto, por el controlador
 * de siempre y con la revisión en la que se comprobó.
 *
 * Una conversación por producción: el `chatId` que devuelve la primera respuesta
 * se reutiliza en las siguientes, y cambiar de producción empieza otra. Cada
 * mensaje lleva su id (idempotencia del cobro: repetirlo no cobra dos veces), y
 * lo que llega de una producción anterior no se pinta.
 *
 * Fase 22 del motor (arreglo R1 de la auditoría):
 *
 *   · EL PRECIO ANTES DE ENVIAR, como en el resto de Weë Brain: `cotizar` pregunta a `brainQuote` —con la producción,
 *     que el servidor cuenta en el precio— un momento después de la última tecla (la misma espera que el chat de Weë
 *     Brain), y la caja no envía sin saberlo;
 *   · la propuesta llega con el PORQUÉ de cada cambio, y con un id propio —el del mensaje que la pidió— para
 *     aplicarla: repetir la aplicación tras un corte usa el mismo y el servidor no la aplica dos veces;
 *   · si no alcanzan los Credits, se dice cuánto falta (la misma regla de Credits de toda la app).
 */

export type FaseDelBrainDelEditor = 'quieto' | 'pensando' | 'contesto' | 'error';

/** El precio del próximo mensaje: sin texto no hay nada que cotizar. */
export type Cotizacion =
  | { readonly estado: 'nada' }
  | { readonly estado: 'calculando' }
  | { readonly estado: 'lista'; readonly precio: BrainQuote }
  | { readonly estado: 'error' };

export interface WeeBrainDelEditor {
  readonly fase: FaseDelBrainDelEditor;
  /** Lo que contestó Weë Brain la última vez: es su texto, y se enseña tal cual. */
  readonly texto: string | null;
  /** La propuesta comprobada de la última respuesta, si la hubo y no se descartó. */
  readonly propuesta: PropuestaDeWeeBrain | null;
  /** El id con el que se aplica ESA propuesta (el mismo en cada intento). */
  readonly idDeLaPropuesta: string | null;
  /** Intentó proponer y no salió nada aplicable (el servidor dice por qué; aquí basta con saberlo). */
  readonly sinPropuesta: boolean;
  /** Lo que queda del bloque de respuestas, para decirlo como en el resto de Weë Brain. */
  readonly bloque: BrainBlock | null;
  /** Fase 22 · lo que costará el próximo mensaje. */
  readonly cotizacion: Cotizacion;
  /** Fase 22 · si el último envío no se hizo por falta de Credits, cuánto hacía falta y cuánto había. */
  readonly faltan: CreditsShortfall | null;
  readonly cotizar: (mensaje: string) => void;
  readonly enviar: (mensaje: string) => void;
  readonly descartar: () => void;
}

/** Lo que se espera tras la última tecla para pedir el precio: lo mismo que en el chat de Weë Brain. */
export const ESPERA_DEL_PRECIO_MS = 350;

/** El id de operación de una propuesta, con la forma que acepta `productions` (`[A-Za-z0-9_-]{8,128}`). */
export const idDeOperacionDeLaPropuesta = (messageId: string): string =>
  `wb_${messageId.replace(/[^A-Za-z0-9_-]/g, '_')}`.slice(0, 128);

export const useWeeBrainDelEditor = (productionId: string | null, revision: number | null): WeeBrainDelEditor => {
  const { locale } = useIdioma();
  const [fase, setFase] = useState<FaseDelBrainDelEditor>('quieto');
  const [texto, setTexto] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<PropuestaDeWeeBrain | null>(null);
  const [idDeLaPropuesta, setIdDeLaPropuesta] = useState<string | null>(null);
  const [sinPropuesta, setSinPropuesta] = useState(false);
  const [bloque, setBloque] = useState<BrainBlock | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion>({ estado: 'nada' });
  const [faltan, setFaltan] = useState<CreditsShortfall | null>(null);
  const chat = useRef<string | null>(null);
  /* Cada producción abre una generación nueva: lo que llegue tarde de la anterior no cuenta. */
  const generacion = useRef(0);
  /* Cada cotización pedida tiene su turno: una que llega tarde no pisa a la última. */
  const turnoDeCotizar = useRef(0);
  /* La espera hasta pedir el precio: una tecla nueva la vuelve a empezar. */
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pararElReloj = () => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
  };
  useEffect(() => pararElReloj, []);

  useEffect(() => {
    generacion.current++;
    turnoDeCotizar.current++;
    pararElReloj();
    chat.current = null;
    setFase('quieto');
    setTexto(null);
    setPropuesta(null);
    setIdDeLaPropuesta(null);
    setSinPropuesta(false);
    setBloque(null);
    setCotizacion({ estado: 'nada' });
    setFaltan(null);
  }, [productionId]);

  const cotizar = useCallback((mensaje: string) => {
    pararElReloj();
    const limpio = mensaje.trim();
    const turno = ++turnoDeCotizar.current;
    if (!limpio || !productionId || revision === null) {
      setCotizacion({ estado: 'nada' });
      return;
    }
    const gen = generacion.current;
    setCotizacion({ estado: 'calculando' });
    reloj.current = setTimeout(() => {
      reloj.current = null;
      void (async () => {
        try {
          const precio = await brainService.quote({
            ...(chat.current ? { chatId: chat.current } : {}),
            message: limpio,
            locale,
            produccion: { productionId, revision },
          });
          if (gen !== generacion.current || turno !== turnoDeCotizar.current) return;
          setCotizacion({ estado: 'lista', precio });
          if (precio.bloque) setBloque(precio.bloque);
        } catch {
          if (gen !== generacion.current || turno !== turnoDeCotizar.current) return;
          setCotizacion({ estado: 'error' });
        }
      })();
    }, ESPERA_DEL_PRECIO_MS);
  }, [productionId, revision, locale]);

  const enviar = useCallback((mensaje: string) => {
    const limpio = mensaje.trim();
    if (!limpio || !productionId || revision === null || fase === 'pensando') return;
    const gen = generacion.current;
    const messageId = newMessageId();
    setFase('pensando');
    setPropuesta(null);
    setIdDeLaPropuesta(null);
    setSinPropuesta(false);
    setFaltan(null);
    void (async () => {
      try {
        const r = await brainService.send({
          ...(chat.current ? { chatId: chat.current } : {}),
          message: limpio,
          messageId,
          locale,
          produccion: { productionId, revision },
        });
        if (gen !== generacion.current) return;
        chat.current = r.chatId || chat.current;
        setTexto(r.text || null);
        setBloque(r.bloque ?? null);
        const suya = r.proposal && r.proposal.productionId === productionId ? r.proposal : null;
        setPropuesta(suya);
        setIdDeLaPropuesta(suya ? idDeOperacionDeLaPropuesta(messageId) : null);
        setSinPropuesta(!r.proposal && !!r.proposalIssue);
        setCotizacion({ estado: 'nada' });
        setFase('contesto');
      } catch (e) {
        if (gen !== generacion.current) return;
        setFaltan(creditsShortfall(e));
        setFase('error');
      }
    })();
  }, [productionId, revision, fase, locale]);

  const descartar = useCallback(() => {
    setPropuesta(null);
    setIdDeLaPropuesta(null);
    setSinPropuesta(false);
  }, []);

  return { fase, texto, propuesta, idDeLaPropuesta, sinPropuesta, bloque, cotizacion, faltan, cotizar, enviar, descartar };
};
