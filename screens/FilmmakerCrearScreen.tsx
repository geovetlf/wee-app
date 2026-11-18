import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Platform } from 'react-native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT, useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
import CreatorShell from '../components/creator/CreatorShell';
import CajaDePrompt, { AccionDeLaCaja } from '../components/creator/CajaDePrompt';
import { CajaAnclada } from '../components/creator/CajaQueCrece';
import CreditsPill from '../components/CreditsPill';
import IconoDireccional from '../components/IconoDireccional';
import { IconoWee } from '../components/icons/IconoWee';
import { IsotipoWee } from '../components/weeai/CabeceraDePortada';
import { TarjetaDeTipo } from '../components/filmmaker/TarjetaDeTipo';
import { HeroDePortada } from '../components/weeai/HeroDePortada';
import { HojaDeTrabajo } from '../components/filmmaker/HojaDeTrabajo';
import { HojaDeAdjuntos } from '../components/filmmaker/HojaDeAdjuntos';
import { HojaDeCreaciones } from '../components/filmmaker/HojaDeCreaciones';
import { ReferenciasAdjuntas } from '../components/filmmaker/ReferenciasAdjuntas';
import { useReferenciasDeFilmmaker } from '../hooks/useReferenciasDeFilmmaker';
import { personajes, listas, subiendo } from '../utils/referenciasDeFilmmaker';
import { HojaDeProyecto } from '../components/filmmaker/HojaDeProyecto';
import { ResumenDeEspecificaciones, FocoDeEspecificaciones } from '../components/filmmaker/PanelDeEspecificaciones';
import { preferenciasDeLaIdea, formatoYResolucionParaElServidor, efectivas } from '../utils/especificacionesDeFilmmaker';
import { BarraDeEtapas } from '../components/filmmaker/BarraDeEtapas';
import { UniversoDeFilmmaker } from '../components/filmmaker/UniversoDeFilmmaker';
import { FichaDeElemento } from '../components/filmmaker/FichaDeElemento';
import { SECCIONES_DEL_UNIVERSO, EJEMPLO_DEL_UNIVERSO, EtapaId } from '../constants/filmmakerUniverso';
import { ejemploTraducido } from '../constants/filmmakerTandas';
import { anadirEjemplos as anadirTandasDeEjemplo } from '../utils/tandasDeFilmmaker';
import { UniversoDelTaller, TipoDeElemento, anadir, anadirEjemplos, aprobar, editar, quitar, quitarEjemplos, universoVacio } from '../utils/universoDeFilmmaker';
import { TandasYStoryboard } from '../components/filmmaker/tandas/TandasYStoryboard';
import { ProduccionDeFilmmaker } from '../components/filmmaker/produccion/ProduccionDeFilmmaker';
import { JuntarDeFilmmaker } from '../components/filmmaker/produccion/JuntarDeFilmmaker';
import { TandasDelTaller, tandasVacias } from '../utils/tandasDeFilmmaker';
import { TallerDeIdea, EstadoDelTaller } from '../components/filmmaker/TallerDeIdea';
import { ElegirEstilo } from '../components/filmmaker/ElegirEstilo';
import { ESTILOS } from '../constants/filmmakerEstilos';
import { nuevoIdDeProduccion, useProducciones } from '../hooks/useProducciones';
import { useProduccionDeFilmmaker } from '../hooks/useProduccionDeFilmmaker';
import { useImagenesDeFilmmaker } from '../hooks/useImagenesDeFilmmaker';
import { useDirectorDeFilmmaker } from '../hooks/useDirectorDeFilmmaker';
import { BurbujaDelDirector } from '../components/filmmaker/BurbujaDelDirector';
import type { ProduccionGuardada } from '../services/filmmakerService';
import { peticionDeUniverso } from '../utils/imagenesDelUniverso';
import { fraseDelFallo } from '../utils/mensajesDeFilmmaker';
import { filmmakerService } from '../services/filmmakerService';
import type { FalloDeProducciones } from '../services/filmmakerService';
import { tandasDesdeLaProduccion, tipoDeLaProduccion, universoDesdeLaProduccion } from '../utils/filmmakerOrquestacion';
import { IdeaDelTaller, alRecibir, estaLista, fraseDe, duracionDe, etiquetaAccesible, cambiarDeTipo, esTipoConTaller, ideaVacia, poner, sumarALaFrase } from '../utils/ideaDeFilmmaker';
import type { AspectRatio, ResolutionTarget } from '../services/filmmaker/dominio';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../constants/estiloWeeAi';
import { CHIP_DE_MARCA_EN_COMPOSER, PILDORA_DE_FORMATO_VISIBLE, FORMATO_POR_DEFECTO, TIPOS_DE_PROYECTO, TipoDeProyecto } from '../constants/filmmakerCrear';
import { TipoDeTaller } from '../constants/filmmakerIdea';
import { scale } from '../utils/scale';

const ALTO_DE_CABECERA = 56;
/** Los cinco tipos del diseño aprobado se ven; Serie lleva «Pronto» (y su motivo al tocarlos) hasta que existan. */
const TIPOS_VISIBLES = TIPOS_DE_PROYECTO;
const HOLGURA = 16;
/** Lo mínimo de mundo (tarjetas o saludo) que se deja ver encima de la caja cuando esta crece: el resto del alto es de la caja. */
const MUNDO_MINIMO = 220;

/**
 * FILMMAKER — LA PRIMERA CAPA Y EL TALLER DE IDEA (2026-11-17). Una sola pantalla con DOS capas y UNA caja:
 *   · ENTRADA: arco + «Crea tu producción» y las cinco tarjetas de tipo (rejilla 2+2+1). Tocar una tarjeta abre el taller; escribir y enviar también
 *     (sin tipo elegido empieza como Cortometraje y lo dice).
 *   · TALLER DE IDEA (etapa 1): las tarjetas se recogen en una etiqueta sobre la caja y arriba aparece el hilo (`TallerDeIdea`).
 * La caja común (`CajaDePrompt` portada) es el ANCLA: vive abajo, sobre la barra de Weë, crece hacia arriba y no cambia de sitio entre capas; lo que
 * cambia es el mundo de encima. Su «+» abre la hoja de adjuntos (Pegar texto abierto; Documento, Imagen y Audio cerrados con su motivo).
 * Todo lo que el contrato no admite hoy va CERRADO con su motivo. Crear = la operación de siempre (`createProduction`, id idempotente) y se abre
 * `Production`; no cobra nada en el cliente. El tipo de proyecto NO viaja al servidor (el contrato de `create` no tiene ese campo): solo `ad`
 * aporta el preset `ads`. El taller no llama a ninguna IA: el copiloto está cerrado hasta D5 (`COPILOTO_DEL_TALLER_ABIERTO`).
 */
const FilmmakerCrearScreen: React.FC = () => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const abrirId: string | undefined = (useRoute<any>().params as { productionId?: string } | undefined)?.productionId;
  /* MODO DE EJEMPLO (solo desarrollo): `?demo=universo|capitulos|produccion|juntar` en la web pinta esa etapa con datos de muestra y SIN servidor, para poder mirarla. `__DEV__` es falso en una compilación de producción, así que ahí no existe. */
  const demoUrl = __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('demo') : null;
  /* En el teléfono (y en la web) el demo también se activa desde «Probar con demo» bajo la caja. Solo con `__DEV__`: en producción ni el botón ni el modo existen. */
  const [demoLocal, setDemoLocal] = useState<string | null>(null);
  const demo = __DEV__ ? (demoLocal ?? demoUrl) : null;
  const enDemo = !!demo;
  const { user } = useAuth();
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  const [altoMundo, setAltoMundo] = useState(0);
  const [hoja, setHoja] = useState(false);
  const [adjuntos, setAdjuntos] = useState(false);
  const [creaciones, setCreaciones] = useState(false);
  const refs = useReferenciasDeFilmmaker();
  const [texto, setTexto] = useState('');
  const [capa, setCapa] = useState<'entrada' | 'estilo' | 'taller' | 'universo' | 'tandas' | 'produccion' | 'juntar'>('entrada');
  const [universo, setUniverso] = useState<UniversoDelTaller>(() => universoVacio());
  const [seccion, setSeccion] = useState<TipoDeElemento>('character');
  const [tandas, setTandas] = useState<TandasDelTaller>(() => tandasVacias());
  const [proyecto, setProyecto] = useState(false);
  const [foco, setFoco] = useState<FocoDeEspecificaciones | null>(null);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [produccionId, setProduccionId] = useState<string | null>(null);
  const [tipoId, setTipoId] = useState<TipoDeTaller | null>(null);
  const [idea, setIdea] = useState<IdeaDelTaller>(() => ideaVacia('short'));
  /* El estilo se ELIGE (sin estilo no se pasa a la siguiente capa) y la idea mínima es obligatoria: Weë decide lo técnico, no lo creativo. */
  const [estilo, setEstilo] = useState<string | null>(null);
  const [preguntado, setPreguntado] = useState(false);
  /* La idea tal como quedó tras hablar con Weë Brain, lista para «Crear la producción» (sin producción guardada aún). */
  /* Sube cuando Weë aplicó un cambio: la ficha del cuadro abierta se relee de lo guardado. */
  const [versionDelDirector, setVersionDelDirector] = useState(0);
  /* Con un capítulo abierto a pantalla completa, la cabecera del capítulo es la única: la fila de etapas se oculta. */
  const [enCapitulo, setEnCapitulo] = useState(false);
  const [borradorListo, setBorradorListo] = useState<IdeaDelTaller | null>(null);
  const [creando, setCreando] = useState(false);
  /* La causa del fallo al crear, ya en palabras de persona (sin conexión, sin sesión…): sale en línea bajo la caja. */
  const [fallo, setFallo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /* Un solo id por intento: repetir con el mismo no crea dos producciones. */
  const idDeProduccion = useRef(nuevoIdDeProduccion());
  /* La producción del servidor: la crea la idea y la mantienen al día los capítulos (hooks/useProduccionDeFilmmaker). */
  const pf = useProduccionDeFilmmaker();
  /* Las imágenes del universo: cotizar → confirmar → generar. Con la capacidad cerrada no hace nada y la fila sale como «Pronto». */
  const imagenes = useImagenesDeFilmmaker();
  const idProduccionGuardada = pf.guardada?.productionId ?? null;
  const vocesLocales = (pf.omitido?.vozSinDestino.length ?? 0) > 0;
  const avisoDeVoces = useRef(false);

  /* Solo si ya hay producciones activas: «Continuar tu producción» con la más reciente. Sin datos (o con error) no se muestra nada. */
  const { carga, producciones } = useProducciones('active', !!user);
  const reciente = carga === 'lista' ? producciones[0] ?? null : null;
  const etiquetaContinuar = reciente ? `${t('filmmaker.hubContinue')}. ${reciente.title}` : '';
  const etiquetaCarpeta = `${t('filmmaker.myProductions')} · ${t('weeai.myCreations')}`;
  const ancho = medida.ancho || 390;
  const alto = medida.alto || 700;
  const tipo = TIPOS_DE_PROYECTO.find((x) => x.id === tipoId) ?? null;
  const pildora = tipo ? { formato: tipo.formato, segundos: tipo.segundos } : FORMATO_POR_DEFECTO;
  /* Por debajo de 760 dp útiles todo se compacta. */
  const compacto = alto < 760;
  const enEstilo = capa === 'estilo';
  const enIdea = capa === 'taller';
  const enUniverso = capa === 'universo';
  const enTandas = capa === 'tandas';
  const enProduccion = capa === 'produccion';
  const enJuntar = capa === 'juntar';
  const enEtapas = enUniverso || enTandas || enProduccion || enJuntar;

  /*
   * WEË BRAIN COMO DIRECTOR (regla 10: la caja es la común y lo único que cambia es el contexto). Con la puerta del servidor cerrada, sin
   * conexión o sin tipo y estilo, esto no hace nada y la pantalla sigue como siempre; en el demo contesta con un ejemplo marcado.
   * Brain propone y la persona aprueba: lo aprobado se aplica por `productions` y la pantalla se repinta desde lo guardado.
   */
  const director = useDirectorDeFilmmaker({
    contexto: tipoId && estilo ? { tipo: tipoId as 'short' | 'film' | 'ad', estilo, etapa: enUniverso ? 'universo' : enTandas ? 'capitulos' : 'idea', ...(idProduccionGuardada && !enDemo ? { productionId: idProduccionGuardada } : {}) } : null,
    demo: enDemo,
    alAplicar: (p: ProduccionGuardada) => {
      pf.adoptar(p);
      setVersionDelDirector((v) => v + 1);
      /* Lo que la persona ya había afinado en pantalla (voz, ficha) se conserva en lo que sigue existiendo; lo quitado se va y lo nuevo entra. */
      setUniverso((u) => {
        const nuevo = universoDesdeLaProduccion(p.production);
        const previos = new Map(u.elementos.map((e) => [e.id, e]));
        return { ...nuevo, aprobado: u.aprobado, elementos: nuevo.elementos.map((e) => { const antes = previos.get(e.id); return antes ? { ...antes, nombre: e.nombre, linea: e.linea } : e; }) };
      });
      setTandas((x) => (p.production.scenes.length || x.tandas.length === 0 ? tandasDesdeLaProduccion(p.production) : x));
    },
  });

  /* Los capítulos y cuadros que la persona escribe se guardan en su producción (escenas y planos) un momento después de cada cambio; sin cambios reales no se llama al servidor. */
  useEffect(() => {
    if (!idProduccionGuardada || !tipoId || !estilo) return;
    const espera = setTimeout(() => {
      void pf.asegurar({ idea: fraseDe(idea), tipo: tipoId, estilo, preferencias: preferenciasDeLaIdea(idea), ...(formatoYResolucionParaElServidor(idea) as { aspectRatio: AspectRatio; resolution: ResolutionTarget }), duracionSegundos: duracionDe(idea), universo, tandas });
    }, 1200);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tandas, universo, idProduccionGuardada, idea.valores.model, idea.valores.variants, idea.valores.seed, idea.valores.quality]);
  /* Lo que no se pudo guardar se dice en una línea; la voz elegida, que hoy solo vive en esta pantalla, también (una vez). */
  useEffect(() => {
    if (!enTandas) return;
    if (pf.fallo) setAviso(t('filmmakerProd.syncFailed'));
    else if (vocesLocales && !avisoDeVoces.current) { avisoDeVoces.current = true; setAviso(t('filmmakerProd.voiceLocal')); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enTandas, pf.fallo, vocesLocales]);

  /* Reabrir una producción: lo guardado en el servidor (capítulos, cuadros con cámara, aprobado, almacén, universo, idea y estilo) vuelve a la pantalla. */
  const reabierta = useRef<string | null>(null);
  useEffect(() => {
    if (!abrirId || !user || reabierta.current === abrirId) return;
    reabierta.current = abrirId;
    void filmmakerService.getProduction(abrirId).then((r) => {
      if (!r.ok) { setAviso(fraseDelFallo(r.fallo, t)); return; }
      const p = r.valor;
      const tipoLeido = tipoDeLaProduccion(p.production);
      pf.adoptar(p);
      setProduccionId(p.productionId);
      setTipoId(tipoLeido as TipoDeTaller);
      setEstilo(p.production.intent?.style ?? p.production.creativeDirection?.visualStyle ?? null);
      setIdea((i) => poner(cambiarDeTipo(i, tipoLeido as TipoDeTaller), 'idea', p.production.intent?.freeText ?? ''));
      setUniverso(universoDesdeLaProduccion(p.production));
      setTandas(tandasDesdeLaProduccion(p.production));
      setCapa(p.production.scenes.length ? 'tandas' : 'universo');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirId, user]);

  const cargarDemo = (etapa: string) => {
    if (!__DEV__) return;
    setDemoLocal(etapa); setFallo(null); setAviso(null); setCreando(false);
    /* El demo CONSERVA lo que la persona ya puso (tipo, estilo, idea e imágenes); solo rellena lo que falta. */
    const tipoDemo = (tipoId ?? 'short') as TipoDeTaller;
    setTipoId(tipoDemo); setEstilo(estilo ?? 'anime'); setProduccionId('demo');
    const ideaPrevia = fraseDe(idea) || texto.trim();
    setIdea((i) => poner(cambiarDeTipo(i, tipoDemo), 'idea', ideaPrevia || 'Una historia de ejemplo para ver la pantalla'));
    setTexto('');
    /* Un personaje «tuyo» de muestra para que «Continuar» quede habilitado y se pueda recorrer el flujo; el resto son los ejemplos rotulados. */
    const deLaPersona = personajes(refs.referencias).length;
    const conEjemplos = anadirEjemplos(universoVacio(), EJEMPLO_DEL_UNIVERSO.map((x) => ({ tipo: x.tipo, nombre: x.nombre, linea: t(x.claveLinea), grupo: x.grupo, voz: x.voz })));
    const conPersonajes = deLaPersona > 0
      ? personajes(refs.referencias).reduce((acc, _p, i) => anadir(acc, 'character', t('filmmaker.refCharacterName', { n: formato.numero(i + 1) })), conEjemplos)
      : anadir(conEjemplos, 'character', t('filmmakerProd.demoCharacter'));
    setUniverso(listas(refs.referencias).filter((x) => x.rol === 'world').reduce((acc) => anadir(acc, 'place', t('filmmaker.refWorldName')), conPersonajes));
    const base = anadirTandasDeEjemplo(tandasVacias(), ejemploTraducido(t));
    /* Para Producción y Juntar los capítulos de muestra cuentan como aprobados y reales (siguen rotulados «Demo»). */
    const avanzada = etapa === 'produccion' || etapa === 'juntar';
    setTandas({ ...base, tandas: base.tandas.map((x) => ({ ...x, titulo: x.titulo, ejemplo: false, aprobada: avanzada, almacen: avanzada, cuadros: x.cuadros.map((c) => ({ ...c, ejemplo: false })) })) });
    setCapa(etapa === 'juntar' ? 'juntar' : etapa === 'produccion' ? 'produccion' : etapa === 'capitulos' ? 'tandas' : 'universo');
  };
  const salirDelDemo = () => { setDemoLocal(null); setProduccionId(null); setUniverso(universoVacio()); setTandas(tandasVacias()); setCapa('entrada'); setPreguntado(false); setAviso(null); if (Platform.OS === 'web' && typeof window !== 'undefined' && demoUrl) window.history.replaceState(null, '', window.location.pathname); };
  useEffect(() => {
    if (demoUrl && !demoLocal) cargarDemo(demoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoUrl]);

  const atras = () => {
    setAviso(null);
    if (enJuntar) setCapa('produccion');
    else if (enProduccion) setCapa('tandas');
    else if (enTandas) setCapa('universo');
    else if (enUniverso) setCapa('taller');
    else if (enIdea) setCapa('estilo');
    else if (enEstilo) { setCapa('entrada'); setPreguntado(false); }
    else navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main');
  };
  const aspectoDeLaIdea = (base: IdeaDelTaller): AspectRatio => (base.valores.format as AspectRatio | undefined) ?? (TIPOS_DE_PROYECTO.find((x) => x.id === base.tipo)?.formato as AspectRatio | undefined) ?? '16:9';
  const cerrado = (clave: string) => () => setAviso(t(clave));

  /** Tocar una tarjeta de tipo: conserva lo ya escrito y abre la segunda capa, la del estilo. */
  const elegirTipo = (id: TipoDeProyecto['id']) => {
    if (!esTipoConTaller(id)) return;
    setTipoId(id);
    setIdea((i) => cambiarDeTipo(i, id));
    setCapa('estilo');
    setAviso(null);
  };
  const elegirEstilo = (id: string) => { setEstilo(id); setAviso(null); if (!produccionId && estaLista(idea)) void continuar(idea); else setCapa('taller'); };

  /** Crea la producción (la operación de siempre, id idempotente) y abre el Universo: la persona sigue sin botón aparte. */
  const continuar = async (base: IdeaDelTaller) => {
    if (creando) return;
    /* En el demo no se crea nada en el servidor: se carga la producción de muestra, local. */
    if (enDemo) { cargarDemo('universo'); return; }
    if (!user) { navigation.navigate('Login'); return; }
    setCapa('taller'); setCreando(true); setFallo(null); setAviso(null);
    /* Lo que la persona aportó llega al Universo: cada personaje (imagen) cuenta como un personaje suyo —el requisito de al menos uno— y cada mundo, como un lugar. */
    const conPersonajes = personajes(refs.referencias).reduce((acc, _p, i) => anadir(acc, 'character', t('filmmaker.refCharacterName', { n: formato.numero(i + 1) })), universoVacio());
    const universoInicial = listas(refs.referencias).filter((x) => x.rol === 'world').reduce((acc) => anadir(acc, 'place', t('filmmaker.refWorldName')), conPersonajes);
    /* Formato y resolución del nivel Avanzado mandan; sin ellos, el anuncio nace con su preset y el resto con lo de siempre. */
    const tipoDeProyecto = TIPOS_DE_PROYECTO.find((x) => x.id === base.tipo);
    const idUsado = idDeProduccion.current;
    /* La producción nace en el servidor con la idea, el tipo, el estilo, el universo que ya hay y las imágenes de la persona (con su papel). Mismo id en cada intento: no se duplica. */
    const ok = await pf.asegurar({
      productionId: idUsado, idea: fraseDe(base), tipo: base.tipo, estilo: estilo ?? '', preferencias: preferenciasDeLaIdea(base), ...(formatoYResolucionParaElServidor(base) as { aspectRatio: AspectRatio; resolution: ResolutionTarget }), duracionSegundos: duracionDe(base),
      ...(tipoDeProyecto?.preset ? { preset: tipoDeProyecto.preset } : {}), universo: universoInicial,
      references: listas(refs.referencias).map((x) => ({ role: x.rol, url: x.url as string })),
    });
    setCreando(false);
    if (!ok) { setFallo(fraseDelFallo(pf.falloReciente() as FalloDeProducciones, t)); setTexto(fraseDe(base)); return; }
    idDeProduccion.current = nuevoIdDeProduccion();
    setProduccionId(idUsado);
    setUniverso(universoInicial);
    setPreguntado(false);
    setCapa('universo');
    /* Weë Brain, como director, lee la idea que la persona acaba de contar y contesta con UNA frase breve (o propone el mundo). Cerrado o sin conexión: nada cambia. */
    void director.enviar(fraseDe(base), { etapa: 'universo', productionId: idUsado, borrador: { idea: fraseDe(base) } });
  };

  /** Lo que llega a Weë (texto de la caja o texto pegado): si la idea alcanza, sigue sola; si no, lo dice y la caja sigue abierta (idea mínima obligatoria). */
  const recibir = (base: IdeaDelTaller) => {
    setIdea(base);
    if (alRecibir(base) === 'seguir') { void continuar(base); return; }
    setPreguntado(true);
    setCapa('taller');
  };

  /** Antes de avanzar hacen falta el tipo y el estilo, y los pone la persona: sin tipo no se envía; sin estilo se abre la capa de estilo con la idea ya guardada. */
  const aceptar = (base: IdeaDelTaller): boolean => {
    if (!tipoId) { setAviso(t('filmmaker.pickTypeFirst')); return false; }
    if (subiendo(refs.referencias)) { setAviso(t('filmmaker.refWaitUpload')); return false; }
    setIdea(base);
    if (!estilo) { setCapa('estilo'); return false; }
    return true;
  };

  /** Lo que se escribe en la caja: en el Universo añade un elemento; en la Idea (o la entrada) se lo cuenta a Weë. */
  const enviar = () => {
    const dicho = texto.trim();
    if (!dicho) return;
    if (enUniverso) {
      const anadirAMano = () => setUniverso((u) => anadir(u, seccion, dicho));
      setTexto('');
      /* Con el director disponible la caja le habla a Weë Brain («quita el volcán», «un personaje más»): propone y la persona aprueba. En el demo contesta un ejemplo marcado y no añade nada. */
      if (director.disponible) {
        void director.enviar(dicho, {
          etapa: 'universo', borrador: { universo: universo.elementos.map((e) => `${e.nombre}${e.linea ? `: ${e.linea}` : ''}`).join('\n') },
        }).then((r) => { if (r === 'cerrado' && !enDemo) anadirAMano(); else if (r === 'fallo') setTexto(dicho); });
        return;
      }
      anadirAMano();
      return;
    }
    const ideaPrevia = idea;
    const base = sumarALaFrase(idea, dicho);
    if (!aceptar(base)) { if (tipoId) setTexto(''); return; }
    setTexto('');
    /*
     * ANTES DE CREAR, la caja habla con Weë Brain (el corazón del composer): lee el borrador —idea, tipo, estilo y la imagen de referencia que
     * se adjuntó— y contesta en una burbuja breve, una pregunta a la vez. La persona sigue la conversación o toca «Crear la producción» en la
     * propia burbuja. Con la puerta cerrada o sin conexión, enviar crea como siempre.
     */
    if (enIdea && director.disponible) {
      setPreguntado(false);
      const primeraImagen = listas(refs.referencias).find((x) => !!x.url)?.url as string | undefined;
      void director.enviar(dicho, { etapa: 'idea', borrador: { idea: fraseDe(base) }, ...(primeraImagen ? { imageUrl: primeraImagen } : {}) }).then((r) => {
        if (r === 'cerrado') recibir(base);
        else if (r === 'fallo') { setIdea(ideaPrevia); setTexto(dicho); setBorradorListo(null); } /* la idea de la persona nunca se pierde: vuelve a la caja y se puede reintentar */
        else setBorradorListo(base);
      });
      return;
    }
    recibir(base);
  };

  /** «Pegar texto»: el guion pegado se guarda en su campo (hasta 12 000 caracteres) y Weë sigue con él. */
  const usarTextoPegado = (pegado: string) => {
    const base = poner(idea, 'script', pegado);
    if (aceptar(base)) recibir(base);
  };

  const irA = (id: EtapaId) => {
    setAviso(null);
    if (id === 'idea') setCapa('taller');
    else if (id === 'batches' && produccionId) setCapa('tandas');
    else if (id === 'universe' && produccionId) setCapa('universo');
    else if (id === 'production' && produccionId) setCapa('produccion');
    else if (id === 'join' && produccionId) setCapa('juntar');
  };

  /* El «+» abre la hoja de adjuntos; el resto de lo que antes eran iconos cerrados vive ahora dentro de ella, con su motivo. */
  const acciones: AccionDeLaCaja[] = [{ icono: 'add', iconoWee: 'mas', etiqueta: t('filmmaker.attachTitle'), alPulsar: () => setAdjuntos(true) }];

  /*
   * EL REPARTO DE LA ALTURA EN LA ENTRADA. La sección de tipos es SIEMPRE una rejilla (2+1 con los tres tipos que existen) (nunca un carrusel). Del alto del
   * mundo (lo de encima de la caja) se resta lo fijo —título de la sección, huecos— y el resto son las tres filas: apaisadas 2:1 (la ancha, 4:1)
   * y, si no cabe, más bajas hasta 64 dp. Si ni con 64 dp caben, el mundo se desplaza en vertical: es el ÚLTIMO recurso. Con altura de sobra, el
   * hero (el arco y «Crea tu producción») ocupa lo que queda.
   */
  const anchoDeFila = Math.min(ancho, 760) - SPACING.md * 2;
  const anchoMedia = Math.floor((anchoDeFila - 10) / 2);
  const tituloDeSeccion = compacto ? 44 : 62;
  const heroMinimo = 150;
  const FILAS = Math.ceil(TIPOS_VISIBLES.length / 2);
  const cabeHero = altoMundo - (tituloDeSeccion + FILAS * 76 + 10 * (FILAS - 1) + HOLGURA) >= heroMinimo;
  const conScroll = altoMundo > 0 && altoMundo < tituloDeSeccion + FILAS * 64 + 10 * (FILAS - 1) + HOLGURA;
  const presupuesto = altoMundo - tituloDeSeccion - 10 * (FILAS - 1) - HOLGURA - (cabeHero ? heroMinimo : 0);
  const altoDeFila = conScroll ? 76 : Math.max(64, Math.min(Math.floor(anchoMedia / 1.5), Math.floor(presupuesto / FILAS)));
  const topeDeLaCaja = Math.max(120, alto - ALTO_DE_CABECERA - MUNDO_MINIMO);
  const verHero = cabeHero && !conScroll;
  const TARJETAS = TIPOS_VISIBLES.map((x) => {
    const elegido = tipoId === x.id;
    const abierta = x.estado !== 'cerrada';
    return { x, elegido, onPress: abierta ? () => elegirTipo(x.id) : cerrado(x.claveMotivo as string) };
  });

  const verContinuar = !!reciente && altoMundo >= 520;
  const entrada = (
    <View style={[styles.entrada, conScroll && { flex: undefined, flexGrow: 1 }]}>
      {verHero ? <HeroDePortada ancho={ancho} etiqueta={t('weeai.portadaEtiqueta')} titulo={t('filmmaker.hubTitle')} sub={altoMundo >= 560 ? t('filmmaker.hubSub') : ' '} /> : <View style={styles.separador} />}
      {verContinuar && reciente ? (
        <View style={styles.bloque}>
          <TouchableOpacity onPress={() => navigation.navigate('Filmmaker', { productionId: reciente.productionId })} accessibilityRole="button" accessibilityLabel={etiquetaContinuar} style={[styles.continuar, dir.contenedor]} activeOpacity={0.8}>
            <IconoWee name="claqueta" size={16} color={P.tintaSecundaria} />
            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{t('filmmaker.hubContinue')}</Text>
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]} numberOfLines={1}>· {reciente.title}</Text>
            <IconoDireccional name="chevron-forward" size={14} color={P.tintaSecundaria} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={[styles.bloque, { marginTop: compacto ? 4 : 10, paddingBottom: HOLGURA }]}>
        <Text style={[textoPortada(compacto ? 17 : 21, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header" numberOfLines={1}>{t('filmmaker.hubTypeSection')}</Text>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, marginTop: 2, marginBottom: 10 }]} numberOfLines={1}>{t('filmmaker.hubTypeSectionHint')}</Text>
        <View style={styles.rejilla}>
          {TARJETAS.map(({ x, elegido, onPress }, i) => <TarjetaDeTipo key={x.id} tipo={x} ancho={i === TARJETAS.length - 1 && TARJETAS.length % 2 === 1 ? anchoDeFila : anchoMedia} alto={altoDeFila} elegido={elegido} onPress={onPress} orden={i} />)}
        </View>
      </View>
    </View>
  );

  const etiquetaDelTipo = tipo ? t(tipo.clave) : '';
  const definicionDeSeccion = SECCIONES_DEL_UNIVERSO.find((s) => s.id === seccion) ?? SECCIONES_DEL_UNIVERSO[0];
  const placeholder = enUniverso ? t(definicionDeSeccion.clavePlaceholder) : refs.referencias.length > 0 || enIdea ? t('filmmakerSpecs.storyPlaceholder') : t('filmmaker.hubPlaceholder');
  const etiquetaDelEstilo = estilo ? t((ESTILOS.find((e) => e.id === estilo) ?? ESTILOS[0]).clave) : null;
  const textoDePildora = etiquetaDelEstilo ? `${etiquetaDelTipo} · ${etiquetaDelEstilo}` : etiquetaDelTipo;
  const estadoDelTaller: EstadoDelTaller = creando ? 'creando' : preguntado ? 'pregunta' : 'saludo';

  return (
    <CreatorShell activeId="creator" title={t('weeai.portadaFilmmaker')} breadcrumb={t('nav.weeAi')} fondo={P.fondo} sinFranjaSuperior fija contentStyle={styles.contenido}>
      <View style={styles.raiz} onLayout={(e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setMedida((a) => (Math.abs(a.ancho - width) > 1 || Math.abs(a.alto - height) > 1 ? { ancho: Math.round(width), alto: Math.round(height) } : a)); }}>
        <View style={[styles.cabecera, dir.contenedor]}>
          {/* Dentro de un capítulo la flecha atrás es la del propio capítulo (una sola por nivel). */}
          {enTandas && enCapitulo ? <View style={styles.boton} /> : (
            <TouchableOpacity onPress={atras} style={styles.boton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
              <IconoDireccional name="arrow-back" size={scale(24)} color={P.tinta} />
            </TouchableOpacity>
          )}
          <View style={[styles.marcaDeCabecera, dir.contenedor]}>
            {/* Dentro de Capítulos el título lo pone la propia pantalla («Capítulos», «Capítulo 1»): una sola cabecera. */}
            {enTandas ? null : <IsotipoWee alto={28} />}
            {enTandas ? null : <Text style={[textoPortada(scale(22), '600'), { color: P.tinta }]} numberOfLines={1} accessibilityRole="header">{t('weeai.portadaFilmmaker')}</Text>}
          </View>
          {/* «Probar con demo» (solo desarrollo): un sitio propio en la cabecera, de 44 dp, sin amontonarse con la ayuda ni la píldora. */}
          {__DEV__ && !enDemo && (capa === 'entrada' || capa === 'estilo' || capa === 'taller') && !fallo ? (
            <TouchableOpacity onPress={() => cargarDemo('universo')} style={styles.boton} accessibilityRole="button" accessibilityLabel={t('filmmakerProd.demoTry')} testID="probar-demo"><Ionicons name="flask-outline" size={scale(22)} color={P.tinta} /></TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => setHoja(true)} style={styles.boton} accessibilityRole="button" accessibilityLabel={etiquetaCarpeta}>
            <IconoWee name="carpeta" size={scale(22)} color={P.tinta} />
          </TouchableOpacity>
          <CreditsPill compact sobria />
        </View>

        {enDemo ? (
          <View style={[styles.demoBanda, dir.contenedor]} accessibilityRole="alert" testID="banda-demo">
            <Text style={[textoPortada(12, '600'), dir.texto, { color: P.tinta, flex: 1 }]}>{t(alto < 600 ? 'filmmakerProd.demoBadgeShort' : 'filmmakerProd.demoBadge')}</Text>
            <TouchableOpacity onPress={salirDelDemo} accessibilityRole="button" accessibilityLabel={t('filmmakerProd.demoExit')} style={styles.demoSalir}><Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmakerProd.demoExit')}</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* Las etapas solo aparecen cuando sirven (después de la Idea) y solo las que existen: nunca bloqueadas. */}
        {enEtapas && !(enTandas && enCapitulo) && !(enUniverso && alto < 600) ? <BarraDeEtapas activa={enJuntar ? 'join' : enProduccion ? 'production' : enTandas ? 'batches' : 'universe'} onIr={irA} onProyecto={() => { setFoco(null); setProyecto(true); }} /> : null}

        {/* EL MUNDO de encima de la caja: las tarjetas de tipo, o el hilo del taller de Idea. */}
        <View style={styles.mundo} onLayout={(e: LayoutChangeEvent) => { const h = Math.round(e.nativeEvent.layout.height); setAltoMundo((a) => (Math.abs(a - h) > 1 ? h : a)); }}>
          {enEstilo ? (
            <ElegirEstilo ancho={ancho} elegido={estilo} onElegir={elegirEstilo} />
          ) : enJuntar ? (
            <JuntarDeFilmmaker tandas={tandas} demo={enDemo} guardada={pf.guardada} />
          ) : enProduccion ? (
            <ProduccionDeFilmmaker tandas={tandas} guardada={pf.guardada} guardando={pf.carga !== 'libre'} demo={enDemo} calidadDelProyecto={preferenciasDeLaIdea(idea).quality as 'standard' | 'high' | 'max' | undefined} ajustes={(() => { const e = efectivas(idea); return { modelo: e.modelo.nombre, formato: e.formato, resolucion: e.resolucion }; })()} onJuntar={() => { setAviso(null); setCapa('juntar'); }} onIrACapitulos={() => setCapa('tandas')} />
          ) : enTandas ? (
            <TandasYStoryboard onCapitulo={setEnCapitulo} ancho={Math.min(ancho, 1040)} compacto={compacto} personajes={universo.elementos.filter((e) => e.tipo === 'character').map((e) => ({ id: e.id, nombre: e.nombre, voz: e.voz }))} duracionTotalSeg={duracionDe(idea)} valor={tandas} onCambio={setTandas} onAviso={setAviso} onProducir={() => { setAviso(null); setCapa('produccion'); }} pedirCambio={director.disponible && (!!idProduccionGuardada || enDemo) ? { version: versionDelDirector, enviar: (texto, seleccion) => { void director.enviar(texto, { etapa: seleccion.shotId ? 'cuadro' : 'capitulos', seleccion, productionId: idProduccionGuardada ?? undefined }); }, contenido: <BurbujaDelDirector burbuja={director.burbuja} propuesta={director.propuesta} aviso={director.aviso} estado={director.estado} aplicada={director.aplicada} onAprobar={() => { void director.aprobar(); }} onDescartar={director.descartar} obsoleta={director.obsoleta} onRehacer={() => { void director.rehacer(); }} /> } : undefined} />
          ) : enUniverso ? (
            <UniversoDeFilmmaker universo={universo} ancho={Math.min(ancho, 1040)} compacto={compacto} bajo={alto < 600} seccion={seccion} onSeccion={setSeccion} onAbrir={(e) => setFichaId(e.id)} onAprobar={() => setUniverso(aprobar)} onEjemplo={() => setUniverso((u) => anadirEjemplos(u, EJEMPLO_DEL_UNIVERSO.map((x) => ({ tipo: x.tipo, nombre: x.nombre, linea: t(x.claveLinea), grupo: x.grupo, voz: x.voz }))))} onQuitarEjemplo={() => setUniverso(quitarEjemplos)} onContinuar={() => { setAviso(null); setCapa('tandas'); }} onAviso={(clave) => setAviso(t(clave))} imagenes={imagenes} peticionDeImagenes={peticionDeUniverso(universo, { estilo, tipo: tipoId ?? undefined, referencia: (personajes(refs.referencias)[0] ?? listas(refs.referencias)[0])?.url ?? null, aspecto: aspectoDeLaIdea(idea) })} />
          ) : enIdea ? (
            <TallerDeIdea tipo={idea.tipo} estado={estadoDelTaller} compacto={alto < 600} especificaciones={<ResumenDeEspecificaciones idea={idea} compacto={altoMundo > 0 && altoMundo < 340} onAbrir={(f) => { setFoco(f ?? null); setProyecto(true); }} />} />
          ) : conScroll ? <ScrollView style={styles.lista} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{entrada}</ScrollView> : entrada}
        </View>

        {/* LA CAJA, ANCLADA ABAJO: no cambia de sitio entre capas. Encima, una línea de estado y la etiqueta del tipo. */}
        <View style={[styles.abajo, { maxWidth: 760 }]}>
          <View style={[styles.estado, compacto && { minHeight: 0, paddingTop: 2 }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {aviso || refs.aviso ? (
              <Text style={[textoPortada(12), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={3}>{aviso ?? t(refs.aviso as string)}</Text>
            ) : !user && !enIdea && !enUniverso ? (
              <Text style={[textoPortada(12), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{t('filmmaker.hubNeedSession')}</Text>
            ) : enIdea && !creando && !preguntado && !fallo ? (
              <Text style={[textoPortada(12), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{t('filmmakerSpecs.continueHint', { flecha: dir.flecha.adelante })}</Text>
            ) : null}
          </View>
          {/* La píldora de formato · duración · modelo (informativa; apagada por `PILDORA_DE_FORMATO_VISIBLE`) y, solo en la variante A, el chip de marca. */}
          {PILDORA_DE_FORMATO_VISIBLE && alto >= 700 ? <View style={[styles.fila, dir.contenedor, { marginBottom: 10 }]}>
            <View style={[styles.pildora, dir.contenedor]} accessible accessibilityLabel={t('filmmaker.hubFormatLabel')}>
              <Text style={[textoPortada(12, '500'), { color: P.tinta }]}>{'⁦'}{pildora.formato}{'⁩'} · {t('filmmaker.hubSeconds', { n: formato.numero(pildora.segundos) })} · {t('filmmaker.hubAuto')}</Text>
            </View>
            {CHIP_DE_MARCA_EN_COMPOSER ? <View style={styles.pildora}><Text style={[textoPortada(12, '500'), { color: P.tintaSecundaria }]}>{t('filmmaker.hubBrain')}</Text></View> : null}
          </View> : null}
          {enIdea && tipo ? (
            <TouchableOpacity onPress={() => setCapa('estilo')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(textoDePildora, t('filmmaker.pillChange'))} hitSlop={{ top: 4, bottom: 4 }} style={[styles.etiqueta, dir.contenedor]}>
              <IconoWee name="claqueta" size={14} color={P.tinta} />
              <Text style={[textoPortada(13, '600'), { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{textoDePildora}</Text>
              <Ionicons name="chevron-down" size={12} color={P.tintaSecundaria} />
            </TouchableOpacity>
          ) : null}
          {!enEtapas && !enEstilo ? <ReferenciasAdjuntas referencias={refs.referencias} onQuitar={refs.quitar} onReintentar={refs.reintentar} onCambiarRol={refs.cambiarRol} /> : null}
          {(enIdea || enUniverso) ? <BurbujaDelDirector burbuja={director.burbuja} propuesta={director.propuesta} aviso={director.aviso} estado={director.estado} aplicada={director.aplicada} onAprobar={() => { void director.aprobar(); }} onDescartar={director.descartar} compacta={alto < 600 && !enIdea} onCrear={enIdea && borradorListo ? () => recibir(borradorListo) : undefined} obsoleta={director.obsoleta} onRehacer={() => { if (director.obsoleta) void director.rehacer(); else enviar(); }} /> : null}
          {!enEstilo && !enProduccion && !enJuntar && !enTandas ? <CajaAnclada alto={topeDeLaCaja}>
            <CajaDePrompt portada enviarDiscreto={enUniverso} valor={texto} onCambiar={setTexto} onEnviar={enviar} etiquetaEnviar={t('studio.sendLabel')} placeholder={placeholder} acciones={acciones} />
          </CajaAnclada> : null}
          {/* El fallo al crear sale EN LÍNEA, bajo la caja, con la idea conservada en ella: enviar de nuevo reintenta (mismo id, no duplica). */}
          {fallo && enIdea ? (
            <View style={[styles.falloEnLinea, dir.contenedor]} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={[textoPortada(13), dir.texto, { color: P.tinta, flexBasis: '100%' }]}>{t('filmmaker.hubCreateError')} {fallo} {t('filmmaker.ideaKept')}</Text>
              <TouchableOpacity onPress={() => { void continuar(idea); }} disabled={creando} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.hubRetry')} style={styles.reintentar}>
                <Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t('filmmaker.hubRetry')}</Text>
              </TouchableOpacity>
              {__DEV__ ? (
                <TouchableOpacity onPress={() => cargarDemo('universo')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmakerProd.demoTry')} testID="probar-demo-error" style={styles.reintentar}>
                  <Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t('filmmakerProd.demoTry')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        <HojaDeTrabajo visible={hoja} onClose={() => setHoja(false)} onAbrirProduccion={(id) => navigation.navigate('Production', { productionId: id })} onAbrirCreaciones={() => navigation.navigate('MisCreaciones')} />
        <HojaDeProyecto visible={proyecto} onClose={() => setProyecto(false)} idea={idea} onIdea={setIdea} foco={foco} />
        <FichaDeElemento elemento={universo.elementos.find((e) => e.id === fichaId) ?? null} onClose={() => setFichaId(null)} onGuardar={(id, c) => setUniverso((u) => editar(u, id, c))} onQuitar={(id) => setUniverso((u) => quitar(u, id))} />
        <HojaDeAdjuntos visible={adjuntos} onClose={() => setAdjuntos(false)} onUsarTexto={usarTextoPegado} onImagen={() => { void refs.elegirDelDispositivo(); }} onDesdeCreaciones={() => setCreaciones(true)} />
        <HojaDeCreaciones visible={creaciones} onClose={() => setCreaciones(false)} onElegir={refs.usarCreacion} />
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  contenido: { padding: 0, gap: 0, paddingBottom: 0 },
  raiz: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: ALTO_DE_CABECERA, paddingHorizontal: SPACING.sm },
  boton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  marcaDeCabecera: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  continuar: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, marginBottom: 4 },
  mundo: { flex: 1, minHeight: 0 },
  entrada: { flex: 1 },
  lista: { flex: 1 },
  separador: { flex: 1, minHeight: 4 },
  bloque: { paddingHorizontal: SPACING.md },
  abajo: { width: '100%', alignSelf: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  etiqueta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie, marginBottom: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pildora: { minHeight: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: P.superficie, borderColor: P.bordeCapsula, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  estado: { minHeight: 10, justifyContent: 'center', paddingTop: 4, paddingBottom: 4 },
  falloEnLinea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 8 },
  reintentar: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  demoBanda: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingStart: 12, paddingEnd: 4, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie },
  demoSalir: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center' },
  demoEntrada: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
});

/* Filmmaker vive en el marco oscuro de WeëAI, con las dos caras. */
export default enTemaOscuro(FilmmakerCrearScreen);
