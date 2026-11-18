import { useCallback, useMemo, useRef, useState } from 'react';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { filmmakerDirectorService } from '../services/filmmakerDirectorService';
import type { ContextoDelDirector, DirectorService, FalloDelDirector, PropuestaDelDirector } from '../services/filmmakerDirectorService';
import { filmmakerService, nuevoIdDeOperacion } from '../services/filmmakerService';
import type { FalloDeProducciones, ProduccionGuardada } from '../services/filmmakerService';

/**
 * WEË BRAIN COMO DIRECTOR, ATADO A REACT. La caja del composer de Filmmaker es la caja común de Weë Brain (`CajaDePrompt`); este hook es
 * lo que hay detrás de ella y lo único que cambia entre una caja y otra: el contexto.
 *
 *   const d = useDirectorDeFilmmaker({ contexto, demo, alAplicar });
 *   const r = await d.enviar(texto, { borrador, seleccion });   // 'respondida' | 'cerrado' | 'fallo'
 *   d.burbuja            // la respuesta breve de Weë, para pintar sobre la caja (null = nada que decir)
 *   d.propuesta          // cambios propuestos, ya comprobados por el contrato, para APROBAR (nunca se aplican solos)
 *   d.aprobar()          // aplica la propuesta con la revisión en la que se basa; devuelve la producción guardada
 *   d.descartar()        // la quita sin aplicar nada
 *
 * `cerrado` = la puerta del servidor (`aiSettings/filmmakerBrain`) está cerrada: la pantalla sigue como hasta ahora y NO se vuelve a
 * preguntar en esta sesión. En el demo (`__DEV__`) no se llama a ningún servidor: contesta una respuesta de ejemplo marcada como tal.
 * No cobra ni toca Credits: cada respuesta cuenta en el bloque de doce de Weë Brain, como en cualquier otra caja.
 */

export type EstadoDelDirector = 'libre' | 'pensando' | 'aplicando';
export type ResultadoDeEnviar = 'respondida' | 'cerrado' | 'fallo';

export interface BurbujaDelDirector {
  readonly texto: string;
  /** Respuesta de ejemplo (demo): la pantalla la rotula. */
  readonly demo: boolean;
}

export interface OpcionesDelDirector {
  /** El contexto fijo de la pantalla (tipo, estilo, etapa, producción). Con `null` no hay director (aún falta el tipo o el estilo). */
  readonly contexto: ContextoDelDirector | null;
  readonly demo?: boolean;
  /** Se llama con la producción ya guardada, tras aprobar: la pantalla la adopta y se repinta desde ella. */
  readonly alAplicar?: (p: ProduccionGuardada) => void;
  /** Inyectables para probar sin red. */
  readonly servicio?: DirectorService;
  readonly aplicador?: Pick<typeof filmmakerService, 'applyProductionOperations'>;
}

export interface MensajeAlDirector {
  readonly borrador?: ContextoDelDirector['borrador'];
  readonly seleccion?: ContextoDelDirector['seleccion'];
  readonly imageUrl?: string;
  readonly documentUrl?: string;
  /** Etapa y producción de ESTE mensaje, si difieren de las de la pantalla (p. ej. justo tras crearla). */
  readonly etapa?: ContextoDelDirector['etapa'];
  readonly productionId?: string;
}

export const useDirectorDeFilmmaker = (o: OpcionesDelDirector) => {
  const t = useT();
  const { locale } = useIdioma();
  const servicio = o.servicio ?? filmmakerDirectorService;
  const aplicador = o.aplicador ?? filmmakerService;
  const [estado, setEstado] = useState<EstadoDelDirector>('libre');
  const [burbuja, setBurbuja] = useState<BurbujaDelDirector | null>(null);
  const [propuesta, setPropuesta] = useState<PropuestaDelDirector | null>(null);
  /** Un aviso en palabras de persona (ya traducido): fallo, propuesta no aplicable… */
  const [aviso, setAviso] = useState<string | null>(null);
  const [fallo, setFallo] = useState<FalloDelDirector | null>(null);
  const [falloAlAplicar, setFalloAlAplicar] = useState<FalloDeProducciones | null>(null);
  const [aplicada, setAplicada] = useState(false);
  /* La conversación sigue entre mensajes (Weë recuerda lo que ya se dijo); la puerta cerrada se recuerda en la sesión. */
  const chatId = useRef<string | undefined>(undefined);
  const cerrada = useRef(false);
  const enCurso = useRef(false);
  /* Lo último que se le pidió, para «Rehacer» cuando la propuesta quedó obsoleta (la producción cambió entre medias). */
  const ultimo = useRef<{ texto: string; extra: MensajeAlDirector } | null>(null);
  /* Una respuesta que llega tarde (la persona ya descartó o mandó otro mensaje) no pisa lo que ve ahora. */
  const ronda = useRef(0);
  const contexto = o.contexto;

  const descartar = useCallback(() => { ronda.current++; setPropuesta(null); setBurbuja(null); setAviso(null); setAplicada(false); setFalloAlAplicar(null); }, []);

  const enviar = useCallback(async (texto: string, extra: MensajeAlDirector = {}): Promise<ResultadoDeEnviar> => {
    const mensaje = texto.trim();
    if (!mensaje || !contexto || cerrada.current || enCurso.current) return cerrada.current ? 'cerrado' : 'fallo';
    setAviso(null); setPropuesta(null); setAplicada(false); setFalloAlAplicar(null); setFallo(null);
    const mia = ++ronda.current;
    ultimo.current = { texto: mensaje, extra };
    if (o.demo) {
      /* Demo: ninguna llamada. Una respuesta de ejemplo, marcada. */
      setBurbuja({ texto: t('filmmakerDirector.demoReply'), demo: true });
      return 'respondida';
    }
    enCurso.current = true; setEstado('pensando'); setBurbuja(null);
    const r = await servicio.conversar({
      mensaje, locale, chatId: chatId.current, imageUrl: extra.imageUrl, documentUrl: extra.documentUrl,
      contexto: {
        ...contexto,
        ...(extra.etapa ? { etapa: extra.etapa } : {}),
        ...(extra.productionId ? { productionId: extra.productionId } : {}),
        ...(extra.seleccion ? { seleccion: extra.seleccion } : {}),
        ...(extra.borrador ? { borrador: extra.borrador } : {}),
      },
    });
    enCurso.current = false; setEstado('libre');
    if (mia !== ronda.current) return 'respondida';
    if (!r.ok) {
      setFallo(r.fallo);
      if (r.fallo === 'cerrado') { cerrada.current = true; return 'cerrado'; }
      setAviso(r.fallo === 'sin_credits' ? t('filmmakerDirector.noCredits') : t('filmmakerDirector.error'));
      return 'fallo';
    }
    chatId.current = r.valor.chatId;
    const v = r.valor;
    setBurbuja(v.texto ? { texto: v.texto, demo: v.demo } : null);
    setPropuesta(v.propuesta);
    if (!v.propuesta && v.motivoSinPropuesta) setAviso(t(v.motivoSinPropuesta === 'unreadable' ? 'filmmakerDirector.cut' : 'filmmakerDirector.notApplicable'));
    return 'respondida';
  }, [contexto, o.demo, servicio, t, locale]);

  /** Aplica la propuesta con la revisión en la que se basa. Si la producción cambió entre medias, el servidor lo dice y NO se aplica. */
  const aprobar = useCallback(async (): Promise<ProduccionGuardada | null> => {
    if (!propuesta || estado !== 'libre') return null;
    setEstado('aplicando'); setAviso(null); setFalloAlAplicar(null);
    const r = await aplicador.applyProductionOperations({
      productionId: propuesta.productionId, expectedRevision: propuesta.baseRevision, operations: propuesta.operations as never, operationId: nuevoIdDeOperacion(),
    });
    setEstado('libre');
    if (!r.ok) {
      setFalloAlAplicar(r.fallo);
      setAviso(t(r.fallo.tipo === 'conflicto' ? 'filmmakerDirector.stale' : 'filmmakerDirector.applyFailed'));
      return null;
    }
    setPropuesta(null); setAplicada(true);
    o.alAplicar?.(r.valor.produccion);
    return r.valor.produccion;
  }, [propuesta, estado, aplicador, t, o]);

  /** La propuesta ya no vale (la producción cambió mientras tanto): se vuelve a pedir lo mismo sobre la producción de ahora. */
  const obsoleta = falloAlAplicar?.tipo === 'conflicto';
  const rehacer = useCallback(async (): Promise<ResultadoDeEnviar> => (ultimo.current ? enviar(ultimo.current.texto, ultimo.current.extra) : 'fallo'), [enviar]);

  return useMemo(() => ({
    estado, burbuja, propuesta, aviso, fallo, falloAlAplicar, aplicada, obsoleta, rehacer,
    /** ¿Tiene sentido hablar con el director aquí? Falta el tipo o el estilo, o la puerta está cerrada: no. */
    disponible: !!contexto && !cerrada.current,
    enviar, aprobar, descartar,
  }), [estado, burbuja, propuesta, aviso, fallo, falloAlAplicar, aplicada, obsoleta, rehacer, contexto, enviar, aprobar, descartar]);
};
