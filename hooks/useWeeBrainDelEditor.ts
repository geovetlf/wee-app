import { useCallback, useEffect, useRef, useState } from 'react';
import { useIdioma } from '../contexts/IdiomaContext';
import { brainService, newMessageId, type BrainBlock, type PropuestaDeWeeBrain } from '../services/brainService';

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
 */

export type FaseDelBrainDelEditor = 'quieto' | 'pensando' | 'contesto' | 'error';

export interface WeeBrainDelEditor {
  readonly fase: FaseDelBrainDelEditor;
  /** Lo que contestó Weë Brain la última vez: es su texto, y se enseña tal cual. */
  readonly texto: string | null;
  /** La propuesta comprobada de la última respuesta, si la hubo y no se descartó. */
  readonly propuesta: PropuestaDeWeeBrain | null;
  /** Intentó proponer y no salió nada aplicable (el servidor dice por qué; aquí basta con saberlo). */
  readonly sinPropuesta: boolean;
  /** Lo que queda del bloque de respuestas, para decirlo como en el resto de Weë Brain. */
  readonly bloque: BrainBlock | null;
  readonly enviar: (mensaje: string) => void;
  readonly descartar: () => void;
}

export const useWeeBrainDelEditor = (productionId: string | null, revision: number | null): WeeBrainDelEditor => {
  const { locale } = useIdioma();
  const [fase, setFase] = useState<FaseDelBrainDelEditor>('quieto');
  const [texto, setTexto] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<PropuestaDeWeeBrain | null>(null);
  const [sinPropuesta, setSinPropuesta] = useState(false);
  const [bloque, setBloque] = useState<BrainBlock | null>(null);
  const chat = useRef<string | null>(null);
  /* Cada producción abre una generación nueva: lo que llegue tarde de la anterior no cuenta. */
  const generacion = useRef(0);

  useEffect(() => {
    generacion.current++;
    chat.current = null;
    setFase('quieto');
    setTexto(null);
    setPropuesta(null);
    setSinPropuesta(false);
    setBloque(null);
  }, [productionId]);

  const enviar = useCallback((mensaje: string) => {
    const limpio = mensaje.trim();
    if (!limpio || !productionId || revision === null || fase === 'pensando') return;
    const gen = generacion.current;
    setFase('pensando');
    setPropuesta(null);
    setSinPropuesta(false);
    void (async () => {
      try {
        const r = await brainService.send({
          ...(chat.current ? { chatId: chat.current } : {}),
          message: limpio,
          messageId: newMessageId(),
          locale,
          produccion: { productionId, revision },
        });
        if (gen !== generacion.current) return;
        chat.current = r.chatId || chat.current;
        setTexto(r.text || null);
        setBloque(r.bloque ?? null);
        setPropuesta(r.proposal && r.proposal.productionId === productionId ? r.proposal : null);
        setSinPropuesta(!r.proposal && !!r.proposalIssue);
        setFase('contesto');
      } catch {
        if (gen !== generacion.current) return;
        setFase('error');
      }
    })();
  }, [productionId, revision, fase, locale]);

  const descartar = useCallback(() => {
    setPropuesta(null);
    setSinPropuesta(false);
  }, []);

  return { fase, texto, propuesta, sinPropuesta, bloque, enviar, descartar };
};
