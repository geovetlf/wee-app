import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useWallet } from './useWallet';
import { creatorService, CreatorJob, humanizeCreatorError, isClientTimeout, pideCuentaAutenticada } from '../services/creatorService';
import { creditsShortfall } from '../services/creditsService';
import { uploadCreatorImage } from '../services/creatorUploads';
import { projectsService } from '../services/projectsService';
import { postsService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { MURO_GENERAL } from '../utils/sectionFeed';
import {
  EXPERIENCIA_DE, HERRAMIENTA_WEEAI, MAX_WEEL_SEC, EleccionDeCreacion, TipoDeCreacion, esArchivoReal, respuestasElegidas, tipoDeExperiencia,
} from '../utils/publicacionDeWeeAi';

/**
 * WEËAI SENCILLO · EL RECORRIDO DE UNA CREACIÓN PARA PUBLICAR (decisión del dueño, 2026-11-23).
 *
 * Elegir → ver el precio → crear → resultado → publicar. Todo por los caminos que ya existen:
 *   · el precio, con `creatorQuote` (sin abrir trabajo) y, al crear, con el presupuesto de `creatorChat`;
 *   · crear, con `creatorChat` + `creatorRun` (el servidor reserva, cobra solo si sale bien y reembolsa si falla);
 *   · las fotos, al Storage de Weë (`creatorUploads`), y al servidor solo su dirección;
 *   · publicar, con `postsService.create` y la misma forma que el compositor (`isWeel`, `assetIds`, «Cómo lo hice»);
 *   · los borradores, en el proyecto «Borradores» (`projectsService`).
 * La app NUNCA suma, resta ni calcula Credits: solo enseña lo que dice el servidor.
 */
export type FaseDeCreacion = 'eligiendo' | 'creando' | 'resultado' | 'error';

/** Una cara con la que publicar: el Perfil Real o uno de los alter egos. `id` es su identidad; `tipo`, cuál de los dos tipos. */
export interface CaraDePublicar {
  id: string;
  tipo: 'real' | 'wee';
  uid: string;
  nombre: string;
}

export interface EstiloDeAutor {
  postId: string;
  autorId: string;
  nombre: string;
}

export interface ParametrosDeCreacion {
  tipo: TipoDeCreacion;
  idea?: string;
  fotoUri?: string;
  estiloDe?: EstiloDeAutor;
  jobId?: string;
}

export interface EstadoDelPrecio {
  estado: 'nada' | 'calculando' | 'listo' | 'error';
  credits?: number;
  prueba?: boolean;
}

export interface EstadoDeLaFoto {
  uri?: string;
  url?: string;
  subiendo: boolean;
  error?: string;
}

export interface Resultado {
  url: string;
  tipo: 'image' | 'video';
  assetId?: string;
  durationSec?: number;
  demo: boolean;
}

const ESPERA_DEL_PRECIO_MS = 450;

const firmaDe = (e: EleccionDeCreacion, idea: string, foto?: string, estiloDe?: string): string =>
  JSON.stringify([e.tipo, e.formatoImagen, e.formatoVideo, e.estilo, e.duracion, idea.trim(), foto || '', estiloDe || '']);

export const useCrearPublicacion = (params: ParametrosDeCreacion) => {
  const { user } = useAuth();
  const { t, locale } = useIdioma();
  const { realProfile, alterEgos = [], userProfile } = useUserProfile();
  const { balance } = useWallet();

  const [idea, setIdea] = useState(params.idea ?? '');
  const [estiloDe, setEstiloDe] = useState<EstiloDeAutor | undefined>(params.estiloDe);
  const [eleccion, setEleccion] = useState<EleccionDeCreacion>({ tipo: params.tipo, formatoImagen: 'post', formatoVideo: 'weel', estilo: 'auto', duracion: 'auto' });
  const [foto, setFoto] = useState<EstadoDeLaFoto>({ uri: params.fotoUri, subiendo: false });
  const [precio, setPrecio] = useState<EstadoDelPrecio>({ estado: 'nada' });
  const [fase, setFase] = useState<FaseDeCreacion>('eligiendo');
  const [jobId, setJobId] = useState<string | null>(params.jobId ?? null);
  const [job, setJob] = useState<CreatorJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Un aviso corto bajo la acción principal (precio que cambió, borrador guardado, sin cuenta…). */
  const [aviso, setAviso] = useState<string | null>(null);
  const [pideCuenta, setPideCuenta] = useState(false);
  /** Un trabajo ya planificado con esta misma elección: se ejecuta sin abrir otro. */
  const listo = useRef<{ jobId: string; firma: string; credits: number } | null>(null);
  const tipo = eleccion.tipo;
  const experienceId = EXPERIENCIA_DE[tipo];

  /* ── La foto: sube al Storage de Weë en cuanto se elige ─────────────────── */
  const subirFoto = useCallback(async (uri: string) => {
    if (!user) return;
    setFoto({ uri, subiendo: true });
    try {
      const url = await uploadCreatorImage(user.uid, uri);
      setFoto({ uri, url, subiendo: false });
    } catch (e: any) {
      setFoto({ uri, subiendo: false, error: e?.message === 'foto-demasiado-grande' ? t('publicar.fotoDemasiadoGrande') : t('publicar.errorSubirFoto') });
    }
  }, [user, t]);

  useEffect(() => {
    if (params.fotoUri && user && !foto.url && !foto.subiendo && !foto.error) void subirFoto(params.fotoUri);
    // Solo la primera vez: la foto con la que se entró desde el «+» de la portada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const quitarFoto = useCallback(() => setFoto({ subiendo: false }), []);

  /* ── Abrir un trabajo que ya existe (desde Borradores o un proyecto) ─────── */
  useEffect(() => {
    if (!jobId) return;
    return creatorService.subscribeToJob(jobId, setJob);
  }, [jobId]);

  const abiertoDesdeFuera = useRef(!!params.jobId);
  useEffect(() => {
    if (!job || !abiertoDesdeFuera.current) return;
    abiertoDesdeFuera.current = false;
    const deEste = tipoDeExperiencia(job.experienceId);
    const respuesta = (id: string) => job.answers.find((a) => a.questionId === id);
    if (deEste) {
      const fmt = respuesta('publicar')?.optionId;
      const dur = respuesta('duracion');
      setEleccion((e) => ({
        ...e,
        tipo: deEste,
        ...(deEste === 'imagen' && (fmt === 'post' || fmt === 'vertical') ? { formatoImagen: fmt } : {}),
        ...(deEste === 'video' && (fmt === 'weel' || fmt === 'post') ? { formatoVideo: fmt } : {}),
        ...(respuesta('estilo')?.optionId ? { estilo: respuesta('estilo')!.optionId as EleccionDeCreacion['estilo'] } : {}),
        ...(dur ? { duracion: dur.optionId === 'auto' || !dur.text ? 'auto' : Number(dur.text) } : {}),
      }));
    }
    setIdea(job.goal);
    if (job.inputImageUrl) setFoto({ uri: job.inputImageUrl, url: job.inputImageUrl, subiendo: false });
    if (job.status === 'planned') {
      setPrecio({ estado: 'listo', credits: job.creditsEstimated, prueba: job.pricingMode !== 'real' });
      setFase('eligiendo');
    }
  }, [job]);

  /* El trabajo manda: terminado → resultado; fallido → error (el servidor ya devolvió lo reservado). */
  useEffect(() => {
    if (!job) return;
    if (job.status === 'done') setFase('resultado');
    else if (job.status === 'failed' || job.status === 'cancelled') {
      setError(t('publicar.errorTexto'));
      setFase('error');
    } else if (job.status === 'running') setFase('creando');
  }, [job?.status, t]);

  /* ── El precio, antes de crear ───────────────────────────────────────────── */
  const necesitaFoto = tipo === 'editar';
  useEffect(() => {
    if (fase !== 'eligiendo' || !user) return;
    if (necesitaFoto && !foto.url) { setPrecio({ estado: 'nada' }); return; }
    if (foto.subiendo) return;
    let vigente = true;
    setPrecio((p) => ({ ...p, estado: 'calculando' }));
    const espera = setTimeout(async () => {
      try {
        const r = await creatorService.quoteBeforeStart(experienceId, idea.trim(), respuestasElegidas(eleccion), foto.url);
        if (!vigente) return;
        setPrecio(r.pricing ? { estado: 'listo', credits: r.pricing.total, prueba: r.pricingMode !== 'real' } : { estado: 'error' });
      } catch {
        if (vigente) setPrecio({ estado: 'error' });
      }
    }, ESPERA_DEL_PRECIO_MS);
    return () => { vigente = false; clearTimeout(espera); };
    // La idea no cambia el precio: no se vuelve a cotizar en cada letra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, user, experienceId, eleccion.formatoImagen, eleccion.formatoVideo, eleccion.estilo, eleccion.duracion, foto.url, foto.subiendo, necesitaFoto]);

  const sinSaldo = balance != null && precio.estado === 'listo' && precio.credits != null && balance < precio.credits;
  const puedeCrear = !!idea.trim() && (!necesitaFoto || !!foto.url) && !foto.subiendo && precio.estado === 'listo' && !sinSaldo;

  /* ── Crear ───────────────────────────────────────────────────────────────── */
  const ejecutar = useCallback(async (id: string) => {
    setFase('creando');
    setJobId(id);
    try {
      await creatorService.run(id, locale);
    } catch (e) {
      if (isClientTimeout(e)) return; // sigue en el servidor; llega por la suscripción
      if (creditsShortfall(e)) { setFase('eligiendo'); setAviso(t('publicar.teFaltanCredits')); return; }
      if (pideCuentaAutenticada(e)) { setFase('eligiendo'); setPideCuenta(true); return; }
      setError(humanizeCreatorError(e, t, locale));
      setFase('error');
    }
  }, [locale, t]);

  /** Abre (o reutiliza) el trabajo con lo elegido y devuelve su id y su precio. */
  const planificar = useCallback(async (): Promise<{ jobId: string; credits: number } | null> => {
    const firma = firmaDe(eleccion, idea, foto.url, estiloDe?.postId);
    if (listo.current && listo.current.firma === firma) return listo.current;
    const r = await creatorService.start(experienceId, idea.trim(), respuestasElegidas(eleccion), foto.url, locale);
    if (r.status !== 'planned') return null;
    const credits = r.pricing?.total ?? r.creditsEstimated;
    listo.current = { jobId: r.jobId, firma, credits };
    return listo.current;
  }, [eleccion, idea, foto.url, estiloDe?.postId, experienceId, locale]);

  const crear = useCallback(async () => {
    setAviso(null);
    setPideCuenta(false);
    if (!user) { setPideCuenta(true); return; }
    /* Un trabajo planificado que se abrió desde Borradores se ejecuta tal cual: su precio es el que se ve. */
    if (job && job.status === 'planned' && jobId) { await ejecutar(jobId); return; }
    if (!puedeCrear) return;
    try {
      setFase('creando');
      const plan = await planificar();
      if (!plan) { setError(t('publicar.errorTexto')); setFase('error'); return; }
      /* El precio al crear es el que manda: si no es el que se vio, se enseña y se pide otro toque. */
      if (precio.credits != null && plan.credits !== precio.credits) {
        setPrecio((p) => ({ ...p, estado: 'listo', credits: plan.credits }));
        setAviso(t('publicar.precioCambio', { credits: plan.credits }));
        setFase('eligiendo');
        return;
      }
      await ejecutar(plan.jobId);
    } catch (e) {
      if (pideCuentaAutenticada(e)) { setFase('eligiendo'); setPideCuenta(true); return; }
      setError(humanizeCreatorError(e, t, locale));
      setFase('error');
    }
  }, [user, job, jobId, puedeCrear, planificar, precio.credits, ejecutar, t, locale]);

  /** «Otra versión» e «Intentar de nuevo»: lo mismo, otra vez (otro trabajo, otro cobro solo si sale bien). */
  const otraVez = useCallback(() => {
    listo.current = null;
    setJob(null);
    setJobId(null);
    setError(null);
    setFase('eligiendo');
  }, []);

  /* ── El resultado ─────────────────────────────────────────────────────────── */
  const resultado: Resultado | null = useMemo(() => {
    if (!job || job.status !== 'done') return null;
    const visual = job.results.find((r) => (r.kind === 'image' || r.kind === 'video') && (r.url || r.urls?.length));
    if (!visual) return null;
    const url = (visual.urls && visual.urls[0]) || visual.url || '';
    return { url, tipo: visual.kind === 'video' ? 'video' : 'image', assetId: visual.assetIds?.[0], durationSec: visual.durationSec, demo: !!(visual.demo || job.demo) || !esArchivoReal(url) };
  }, [job]);

  /* ── Borradores ───────────────────────────────────────────────────────────── */
  const guardarEnBorradores = useCallback(async (): Promise<boolean> => {
    if (!user) { setPideCuenta(true); return false; }
    try {
      let id = jobId;
      if (!id) {
        const plan = await planificar();
        if (!plan) throw new Error('sin-plan');
        id = plan.jobId;
      }
      const borradores = await projectsService.ensureDrafts(user.uid, t('publicar.borradores'));
      await projectsService.assignJob(id, borradores.id);
      setAviso(t('publicar.guardadoEnBorradores'));
      return true;
    } catch {
      setAviso(t('publicar.errorGuardar'));
      return false;
    }
  }, [user, jobId, planificar, t]);

  /* ── Publicar ─────────────────────────────────────────────────────────────── */
  /* Las caras con las que se puede publicar: el Perfil Real y TODOS los alter egos de la cuenta (2026-11-23). El id es la identidad. */
  const caras = useMemo(() => {
    const lista: CaraDePublicar[] = [];
    if (realProfile?.uid) lista.push({ id: realProfile.uid, tipo: 'real', uid: realProfile.uid, nombre: realProfile.displayName || '' });
    for (const a of alterEgos) if (a.uid) lista.push({ id: a.uid, tipo: 'wee', uid: a.uid, nombre: a.displayName || '' });
    return lista;
  }, [realProfile, alterEgos]);

  /* Empieza con la cara puesta. */
  const [cara, setCara] = useState<string>(() => userProfile?.uid || realProfile?.uid || '');

  /** Un Weël es vertical y dura como mucho 15 s; si el video salió más largo, se publica en el Ẅall. */
  const esWeelPosible = !!resultado && resultado.tipo === 'video' && eleccion.formatoVideo === 'weel' && (resultado.durationSec == null || resultado.durationSec <= MAX_WEEL_SEC + 0.5);

  const publicar = useCallback(async (opciones: { comoWeel: boolean; texto: string; mostrarIdea: boolean; proporcion?: number }): Promise<string | null> => {
    if (!user || !resultado || resultado.demo) return null;
    const quien = caras.find((c) => c.id === cara) ?? caras[0];
    if (!quien) return null;
    const texto = opciones.texto.trim();
    const esVideo = resultado.tipo === 'video';
    const ideaVisible = opciones.mostrarIdea ? idea.trim().slice(0, 500) : '';
    const postData: any = {
      userId: quien.uid,
      content: texto,
      imageUrls: esVideo ? [] : [resultado.url],
      imageUrlsThumbnails: esVideo ? [] : [resultado.url],
      ...(esVideo ? {} : { imageAspectRatios: [opciones.proporcion || (eleccion.formatoImagen === 'vertical' ? 9 / 16 : 1)] }),
      ...(esVideo ? { videoUrl: resultado.url } : {}),
      ...(esVideo && opciones.comoWeel && esWeelPosible ? { isWeel: true } : {}),
      ...(esVideo && resultado.assetId ? { videoAssetId: resultado.assetId } : {}),
      ...(!esVideo && resultado.assetId ? { assetIds: [resultado.assetId] } : {}),
      aiTools: [HERRAMIENTA_WEEAI],
      ...(ideaVisible ? { aiPrompt: ideaVisible } : {}),
      weeAi: { tipo: eleccion.tipo, ...(esVideo && resultado.durationSec ? { segundos: Math.round(resultado.durationSec) } : {}) },
      ...(estiloDe ? { estiloDe: { postId: estiloDe.postId, userId: estiloDe.autorId, nombre: estiloDe.nombre.slice(0, 80) } } : {}),
      destinations: [MURO_GENERAL],
      likes: 0, comments: 0, shares: 0, views: 0,
      isPrivate: false,
      hashtags: texto.match(/#[\wÀ-ɏḀ-ỿ]+/gi) || [],
      agreementCount: 0, disagreementCount: 0,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    };
    const postId = await postsService.create(postData);
    /* «Recrear este estilo»: se le avisa al autor (su aviso, sus campos; las reglas lo validan). */
    if (estiloDe && postId && estiloDe.autorId !== quien.uid) {
      const perfil = quien.tipo === 'wee' ? alterEgos.find((a) => a.uid === quien.uid) : realProfile;
      await notificationService.createRecreateNotification(
        estiloDe.autorId, quien.uid, quien.nombre,
        { type: perfil?.avatarType, id: perfil?.avatarId, url: perfil?.photoURL },
        String(postId), texto, quien.tipo,
      ).catch(() => null);
    }
    return postId ? String(postId) : null;
  }, [user, resultado, caras, cara, idea, eleccion, esWeelPosible, estiloDe, alterEgos, realProfile]);

  return {
    t, idea, setIdea, estiloDe, quitarEstilo: () => setEstiloDe(undefined),
    eleccion, setEleccion, tipo, foto, subirFoto, quitarFoto,
    precio, balance, sinSaldo, puedeCrear, fase, job, error, aviso, setAviso, pideCuenta,
    crear, otraVez, resultado, guardarEnBorradores,
    caras, cara, setCara, esWeelPosible, publicar,
  };
};
