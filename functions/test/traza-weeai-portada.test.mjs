/**
 * TRAZABILIDAD DE WEË AI · LA PORTADA (`WeeCreatorScreen`) (R9 · E2).
 *
 * La ficha de una experiencia (la que se abre con `WeeCreator { category }`) decía SIEMPRE «Hoy en modo demo: ves cómo
 * funciona sin gastar Credits» y ofrecía «Avísame cuando esté de verdad», también en las diez secciones que ya crean con IA
 * real y cobran Credits. Ahora lo dice el servidor: `disponibilidadDeCapacidades` (DEC-06, solo lee y decide) por la
 * capacidad que define a la experiencia (`utils/capacidadDeExperiencia.ts`). Además, esta suite comprueba que esa tabla
 * no se inventa nada: cada capacidad existe en el vocabulario del Core y en la plantilla del servidor.
 */
import { montarConEfectos, cargarBase } from './_traza-weeai.mjs';
import { leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const titulo = (x) => console.log(`\n─── ${x} ───`);

const { CAPACIDAD_PRINCIPAL, capacidadPrincipalDe } = cargarBase('utils/capacidadDeExperiencia.ts');
const { WEE_EXPERIENCES } = cargarBase('constants/weeExperiences.ts');

/* ═══ A · LA TABLA NO SE INVENTA NADA ═════════════════════════════════════════════════════════════════════════════ */
titulo('A · la capacidad de cada experiencia existe de verdad');
{
  const core = leer('functions/src/core/capability.ts');
  const plantillas = leer('functions/src/creator/templates.ts') + leer('functions/src/creator/brain.ts');
  const ids = WEE_EXPERIENCES.map((e) => e.id);
  check('A1) todas las experiencias visibles tienen su capacidad', ids.every((id) => typeof CAPACIDAD_PRINCIPAL[id] === 'string'), ids.filter((id) => !CAPACIDAD_PRINCIPAL[id]).join());
  const fuera = Object.values(CAPACIDAD_PRINCIPAL).filter((c) => !core.includes(`'${c}'`));
  check('A2) cada capacidad es del vocabulario del Core (core/capability.ts)', fuera.length === 0, fuera.join());
  const sinPlantilla = Object.values(CAPACIDAD_PRINCIPAL).filter((c) => !plantillas.includes(`'${c}'`));
  check('A3) y la usa alguna plantilla del servidor (no es una capacidad de adorno)', sinPlantilla.length === 0, sinPlantilla.join());
  check('A4) Weë Studio pregunta por vídeo y Weë Music por música (sin conectar: dirá que no)', CAPACIDAD_PRINCIPAL.studio === 'video.generate' && CAPACIDAD_PRINCIPAL.music === 'music.generate');
  check('CONTROL · A5) una experiencia desconocida no afirma nada', capacidadPrincipalDe('inventada') === null && capacidadPrincipalDe(undefined) === null && capacidadPrincipalDe('__proto__') === null);
}

/* ═══ B · LA FICHA DICE LO QUE DICE EL SERVIDOR ═══════════════════════════════════════════════════════════════════ */
titulo('B · la ficha de la experiencia ya no afirma «modo demo» por su cuenta');
const pantalla = async ({ categoria = 'chef', respuesta = 'si', usuario = { uid: 'u1' } } = {}) => {
  const consultas = [];
  const p = await montarConEfectos({
    pantalla: 'screens/WeeCreatorScreen.tsx',
    usuario,
    params: { category: categoria },
    dobles: ({ capturar, h }) => ({
      '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: null, hasWeeProfile: false }) },
      '../hooks/useWallet': { useWallet: () => ({ balance: 0 }) },
      '../services/creatorInterestService': { creatorInterestService: { getMyCategoryIds: async () => [], register: async () => {}, remove: async () => {} } },
      '../components/creator/CreatorShell': { __esModule: true, default: capturar('CreatorShell', (pp) => h('main', null, pp.children)) },
      '../services/creatorService': { creatorService: { getMyJobs: async () => [] }, claveDelEstado: {} },
      '../services/disponibilidadService': {
        disponibilidadService: {
          consultar: async (caps) => {
            consultas.push([...caps]);
            if (respuesta === 'falla') throw new Error('sin red');
            return Object.fromEntries(caps.map((c) => [c, respuesta === 'si']));
          },
        },
      },
    }),
  });
  return Object.assign(p, { consultas });
};
{
  const p = await pantalla({ categoria: 'chef', respuesta: 'si' });
  check('B1) se pregunta al servidor por la capacidad de la experiencia elegida, una vez', JSON.stringify(p.consultas) === JSON.stringify([['text.generate']]), JSON.stringify(p.consultas));
  check('B2) disponible: ya no dice «modo demo, sin gastar Credits»', !p.texto().includes(p.t('weeai.demoToday')));
  check('B3) dice cómo se cobra de verdad (al terminar; si falla, se devuelve)', p.texto().includes(p.t('weeai.creditsNote')));
  check('B4) y no ofrece «Avísame cuando esté de verdad»: ya lo está', !p.hayBoton(p.t('weeai.notifyMe')) && !p.texto().includes(p.t('weeai.notifyMeReal')));
  check('B5) «Empezar» sigue ahí', p.hayBoton(p.t('weeai.startWith', { nombre: 'Weë Chef' })));
}
{
  const p = await pantalla({ categoria: 'music', respuesta: 'no' });
  check('B6) no disponible (Weë Music, sin proveedor): lo dice con la frase de siempre', p.texto().includes(p.t('weeai.errNotAvailable')) && JSON.stringify(p.consultas) === JSON.stringify([['music.generate']]));
  check('B7) y ofrece «Avísame», que sí guarda el interés', p.hayBoton(p.t('weeai.notifyMe')));
  check('B8) sin afirmar que sea una demostración gratis', !p.texto().includes(p.t('weeai.demoToday')));
}
{
  const p = await pantalla({ categoria: 'studio', respuesta: 'falla' });
  check('B9) si el servidor no contesta, cierra: no disponible (la regla de DEC-06), sin romper la pantalla', p.texto().includes(p.t('weeai.errNotAvailable')));
}
{
  const p = await pantalla({ usuario: null });
  check('B10) sin sesión no se pregunta nada y no se afirma nada', p.consultas.length === 0 && !p.texto().includes(p.t('weeai.creditsNote')) && !p.texto().includes(p.t('weeai.errNotAvailable')));
}
{
  const fuente = sinComentarios(leer('screens/WeeCreatorScreen.tsx'));
  check('CONTROL · B11) la pantalla ya no pinta «demoToday» en ningún sitio', !/weeai\.demoToday/.test(fuente));
  check('CONTROL · B12) y sigue sin nombrar proveedor ni modelo', !/\b(gemini|seedance|seedream|elevenlabs|flux|deepseek|modelId)\b/i.test(fuente));
}

console.log(failures === 0 ? '\n✔ traza-weeai-portada: todo en orden' : `\n✘ traza-weeai-portada: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
