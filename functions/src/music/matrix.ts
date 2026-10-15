/**
 * WEË MUSIC — LA MATRIZ DE CAPACIDADES DEL LADO DEL SERVIDOR: QUÉ DECLARA CADA PROVEEDOR CANDIDATO.
 *
 * DATOS, no código de integración. Cada afirmación lleva su nivel de confirmación:
 *   · `documentada`    lo dice la documentación OFICIAL pública del proveedor (URL en `fuente`, consultada el 2026-10-15);
 *   · `no_confirmada`  hay indicios (una web, un wrapper de terceros, un anuncio) pero NO documentación oficial de API;
 *   · `no_soportada`   la documentación oficial indica que no existe.
 * «Documentada» NO significa «integrada» ni «aprobada»: ningún proveedor está aprobado automáticamente, ninguno tiene
 * clave de producción en Weë para música y ninguno se ha llamado jamás. Los costes y los derechos de uso comercial NO
 * están confirmados para ninguno (ver cada ficha): hasta medirlos, no hay precio en Credits (CLAUDE.md §«Credits»).
 *
 * El Router no cambia: esta matriz es lo que un Router futuro leería para ofrecer SOLO capacidades reales y
 * configuradas (`capacidadesOfrecibles`, hoy siempre vacía). Los ids de capacidad son los mismos que
 * `constants/musicCapabilities.ts` del cliente.
 */

export type IdDeCapacidadMusical =
  | 'generate' | 'instrumental' | 'referenceAudio' | 'humToSong' | 'extend' | 'remix' | 'sectionEdit' | 'instrumentEdit'
  | 'lyrics' | 'voiceStyle' | 'stems' | 'audioProcessing' | 'export' | 'midi';

export type NivelDeConfirmacion = 'documentada' | 'no_confirmada' | 'no_soportada';

export interface FichaDeProveedorMusical {
  readonly id: 'mureka' | 'minimax' | 'yinchao' | 'elevenlabs';
  readonly nombre: string;
  readonly producto: string;
  /** Endpoint EXACTO si la documentación oficial lo da; null si no está confirmado (no se inventa). */
  readonly endpoint: string | null;
  readonly autenticacion: string;
  /** Variable de entorno / secreto donde viviría la clave (nunca en el cliente). Ninguna configurada para música hoy. */
  readonly claveEnEntorno: string;
  readonly fuentes: readonly string[];
  readonly capacidades: Readonly<Record<IdDeCapacidadMusical, NivelDeConfirmacion>>;
  readonly modelos: readonly string[];
  readonly limites: Readonly<Record<string, string>>;
  readonly formatos: readonly string[];
  readonly asincrono: 'tarea con sondeo/webhook' | 'respuesta directa' | 'no confirmado';
  readonly coste: 'no_publicado' | 'no_confirmado';
  readonly derechosComerciales: 'por_confirmar' | 'declarados_por_plan';
  readonly restricciones: readonly string[];
  /** Estado de habilitación en Weë. Siempre false hasta una fase autorizada. */
  readonly habilitado: false;
  readonly queFalta: readonly string[];
}

const todas = (n: NivelDeConfirmacion): Record<IdDeCapacidadMusical, NivelDeConfirmacion> => ({
  generate: n, instrumental: n, referenceAudio: n, humToSong: n, extend: n, remix: n, sectionEdit: n, instrumentEdit: n,
  lyrics: n, voiceStyle: n, stems: n, audioProcessing: n, export: n, midi: n,
});

export const PROVEEDORES_MUSICALES: readonly FichaDeProveedorMusical[] = [
  {
    id: 'minimax',
    nombre: 'MiniMax',
    producto: 'MiniMax Music Generation API (modelos music-3.0, music-2.6, music-cover)',
    endpoint: 'POST https://api.minimax.io/v1/music_generation',
    autenticacion: 'Bearer <API key> (Account Management > API Keys)',
    claveEnEntorno: 'MINIMAX_API_KEY (ya existe para voz; la de música sería la misma cuenta, sin uso hoy)',
    fuentes: ['https://platform.minimax.io/docs/api-reference/music-generation'],
    capacidades: {
      ...todas('no_confirmada'),
      generate: 'documentada', instrumental: 'documentada', referenceAudio: 'documentada', lyrics: 'documentada',
      sectionEdit: 'no_confirmada', stems: 'no_confirmada', midi: 'no_confirmada', audioProcessing: 'no_soportada',
    },
    modelos: ['music-3.0', 'music-2.6', 'music-cover', '(música gratuita -free: se retira el 2026-08-20)'],
    limites: {
      prompt: '≤ 2000 caracteres (obligatorio en instrumental; 10–300 en cover)',
      lyrics: '≤ 3500 caracteres (obligatoria si no es instrumental)',
      referencia: '6 s – 6 min, ≤ 50 MB, mp3/wav/flac; audio_url o audio_base64 (uno)',
      duracionGenerada: 'no declarada en la documentación',
      ritmoDePeticiones: '120 peticiones/min (modelos de pago)',
    },
    formatos: ['mp3', 'wav', 'pcm (salida); hex o URL de 24 h'],
    asincrono: 'respuesta directa',
    coste: 'no_publicado',
    derechosComerciales: 'por_confirmar',
    restricciones: [
      'AVISO: a partir del 2026-08-20 las APIs de música y letras de pago «dejan de estar disponibles para nuevos usuarios»; solo siguen los usuarios de pago existentes. Hay que confirmar con MiniMax si una cuenta nueva de Weë puede acceder.',
      'El uso comercial de lo generado no aparece en la documentación de la API.',
      'La conservación de lo no editado no existe: no hay edición por sección.',
    ],
    habilitado: false,
    queFalta: ['confirmar acceso de cuenta nueva', 'términos de uso comercial', 'precio por canción', 'prueba real autorizada', 'adaptador + línea en ADAPTERS'],
  },
  {
    id: 'elevenlabs',
    nombre: 'ElevenLabs',
    producto: 'Eleven Music (modelos music_v2_5, music_v2, music_v1)',
    endpoint: null,
    autenticacion: 'xi-api-key (la de ElevenLabs que Weë ya usa para voz)',
    claveEnEntorno: 'ELEVENLABS_API_KEY (ya existe para voz; plan de pago exigido para la API de música)',
    fuentes: ['https://elevenlabs.io/docs/overview/capabilities/music', 'https://elevenlabs.io/music-terms'],
    capacidades: {
      ...todas('no_confirmada'),
      generate: 'documentada', instrumental: 'documentada', referenceAudio: 'documentada', lyrics: 'documentada',
      voiceStyle: 'documentada', sectionEdit: 'documentada', export: 'documentada',
    },
    modelos: ['music_v2_5', 'music_v2', 'music_v1'],
    limites: {
      duracion: '3 s – 5 min',
      referencia: '≈ 30 s, solo v2 y v2.5, planes de pago',
      idiomas: 'prompts y letras multilingües',
    },
    formatos: ['mp3 44,1 kHz 128–192 kbps', 'wav'],
    asincrono: 'no confirmado',
    coste: 'no_publicado',
    derechosComerciales: 'declarados_por_plan',
    restricciones: [
      'Ruta HTTP y cuerpo exactos NO confirmados en la página consultada (remite al quickstart del SDK, `music.compose`); no se inventan.',
      'La edición por sección (inpainting) está documentada para la interfaz de ElevenLabs; su disponibilidad en la API no está confirmada.',
      'Stems: la página consultada no los cubre.',
      'Derechos comerciales «varían por plan»: leer https://elevenlabs.io/music-terms antes de aprobar.',
      'Los finetunes exigen pistas propias sin copyright (no se contemplan).',
    ],
    habilitado: false,
    queFalta: ['ruta y cuerpo de la API oficial', 'precio por segundo/canción', 'términos de música del plan de Weë', 'si hay stems e inpainting por API', 'adaptador + línea en ADAPTERS'],
  },
  {
    id: 'mureka',
    nombre: 'Mureka',
    producto: 'Mureka API Platform (modelos V7.5, O1 según su página)',
    endpoint: null,
    autenticacion: 'No confirmada en la página oficial consultada (fuentes de terceros indican Bearer)',
    claveEnEntorno: 'MUREKA_API_KEY (sin configurar)',
    fuentes: ['https://platform.mureka.ai/docs/'],
    capacidades: {
      ...todas('no_confirmada'),
      generate: 'documentada', instrumental: 'documentada', lyrics: 'documentada', extend: 'documentada',
    },
    modelos: ['V7.5', 'O1'],
    limites: { paginaOficial: 'no describe límites, autenticación ni precios' },
    formatos: [],
    asincrono: 'no confirmado',
    coste: 'no_confirmado',
    derechosComerciales: 'por_confirmar',
    restricciones: [
      'La página oficial lista canción, instrumental, letras y extensión, y en su navegación stem y recognize, pero NO explica endpoints.',
      'Los endpoints (p. ej. /v1/song/generate, /v1/song/easy-generate, /v1/instrumental/generate en api.mureka.ai) solo constan en guías de terceros: no se usan hasta verlos en la documentación oficial.',
      'Remix, stems y clonación de voz se mencionan en terceros; Weë no ofrece clonación de voz.',
    ],
    habilitado: false,
    queFalta: ['documentación oficial de endpoints y autenticación', 'precio', 'términos comerciales', 'adaptador + línea en ADAPTERS'],
  },
  {
    id: 'yinchao',
    nombre: 'Yinchao',
    producto: 'Yinchao (音潮) music API — plataforma de desarrolladores',
    endpoint: null,
    autenticacion: 'No confirmada (clave desde platform.yinchaoyongxian.com según un wrapper de terceros)',
    claveEnEntorno: 'YINCHAO_API_KEY (sin configurar)',
    fuentes: ['https://platform.yinchaoyongxian.com (no se pudo leer documentación oficial de API)'],
    capacidades: todas('no_confirmada'),
    modelos: ['v4.0', 'v3.5 (según un wrapper de terceros)'],
    limites: { referencia: '≤ 10 MB (wrapper de terceros)', prompt: '< 1000 caracteres (wrapper de terceros)' },
    formatos: ['mp3 (wrapper de terceros)'],
    asincrono: 'no confirmado',
    coste: 'no_confirmado',
    derechosComerciales: 'por_confirmar',
    restricciones: [
      'No se encontró documentación oficial de API: todo lo conocido viene de un nodo de ComfyUI de terceros.',
      'Posible restricción territorial y de cumplimiento al ser un proveedor de China: pasaría por la elegibilidad por jurisdicción del engine antes de poder ofrecerse.',
      'No confundir con YinsoAI (otro producto).',
    ],
    habilitado: false,
    queFalta: ['documentación oficial', 'endpoints', 'autenticación', 'precio', 'términos comerciales', 'revisión de jurisdicción', 'adaptador + línea en ADAPTERS'],
  },
];

/**
 * Lo que un Router podría OFRECER hoy: capacidades con al menos un proveedor `documentada` Y habilitado Y configurado.
 * Como ningún proveedor está habilitado ni configurado, el resultado es siempre vacío: nada se ofrece como disponible.
 */
export const capacidadesOfrecibles = (
  configurado: (id: FichaDeProveedorMusical['id']) => boolean = () => false,
): Partial<Record<IdDeCapacidadMusical, FichaDeProveedorMusical['id'][]>> => {
  const out: Partial<Record<IdDeCapacidadMusical, FichaDeProveedorMusical['id'][]>> = {};
  for (const p of PROVEEDORES_MUSICALES) {
    if (!p.habilitado || !configurado(p.id)) continue;
    for (const [cap, nivel] of Object.entries(p.capacidades) as [IdDeCapacidadMusical, NivelDeConfirmacion][]) {
      if (nivel === 'documentada') (out[cap] ??= []).push(p.id);
    }
  }
  return out;
};
