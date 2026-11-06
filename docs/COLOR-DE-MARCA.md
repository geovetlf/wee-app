# Color de marca de Weë — degradado amarillo dorado → naranja

Decisión del dueño (2026-11-05): el amarillo plano `#F5B731` evoluciona a un degradado de
amarillo dorado a naranja cálido. Se aplica con tokens centralizados; ninguna pantalla define
su propio color de marca.

## Fuente única

| Pieza | Qué es |
|---|---|
| `constants/marca.ts` | `PALETA_DE_MARCA` y `MARCA` (sólidos, velo, degradado). Se puede importar fuera de React. |
| `contexts/ThemeContext.tsx` | Copia `MARCA` en `theme.colors` (temas claro y oscuro). Es lo que leen las pantallas. |
| `components/GradienteDeMarca.tsx` | `GradienteDeMarca` (vista que es el degradado) y `RellenoDeMarca` (lámina de fondo para un botón que ya existe). Sobre `expo-linear-gradient`. |

## Tokens

| Token (`MARCA`) | `theme.colors` | Valor | Uso |
|---|---|---|---|
| `degradado` | `primaryGradientStart` / `primaryGradientEnd` (extremos) | `#FFD12A 0%` → `#FFB51B 45%` → `#FF850D 100%`, 110° (de (0, 0.32) a (1, 0.68)) | Botones de acción principal, saldo de Credits, comprar Credits, segmento/perfil activo, ficha elegida |
| `primario` | `primary`, `accent` | `#FFA51F` (ámbar) | Acento sólido: indicadores pequeños, rellenos de progreso, bordes de elegido, spinners, respaldo debajo del degradado |
| `primarioClaro` | `accentLight`, `primaryLight` | `#FFC928` | Punta clara |
| `primarioOscuro` | `accentDark`, `primaryDark` | `#F47700` | Enlaces y texto de acento sobre blanco |
| `primarioTexto` | — | `#9A4A00` | Icono/estado de acento que debe leerse sobre blanco o un velo claro (≥ 4,5:1) |
| `activo` | `activeColor` | `#FF910F` | Iconos y etiquetas de la navegación activa (barra inferior, barra lateral, pestaña de perfil) |
| `sobrePrimario` | `onPrimary` | `#1F2937` | Texto encima del acento o del degradado (siempre oscuro) |
| `velo(alfa)` | `glow` (= velo 0.15 claro / 0.25 oscuro) | `rgba(255, 165, 31, alfa)` | Fondos suaves de chips y tarjetas elegidas |

Equivalencias con lo anterior: `#F5B731` → `primario`; `#E5A020` → `primarioOscuro`; `#FFC94D` →
`primarioClaro`; `rgba(245,183,49,x)` → `velo(x)`; `DORADO` de sectores, Boost, Wäll y estudio de
Music → `MARCA.primario` (el nombre `DORADO` se conserva por compatibilidad); `DORADO_OSCURO`
(`#8A6408`) → `primarioTexto`.

## Reglas

1. **Acción principal = degradado.** Se añade `<RellenoDeMarca radio={…} />` como primer hijo del
   botón, con el mismo `borderRadius`. El botón conserva su `backgroundColor: theme.colors.accent`
   como respaldo; no cambian tamaño, espaciado, tipografía ni comportamiento.
2. **Indicadores pequeños = sólido** (`accent`/`primario` o `activeColor`): puntos de no leído,
   contadores, barras de progreso, bordes de seleccionado.
3. **Secundarios neutros.** Botones secundarios, fondos blancos y grises no cambian.
4. **Texto oscuro encima** (`onPrimary`). Sobre blanco, el acento como texto usa `primarioOscuro`.
5. **Sin brillos.** No se añaden sombras ni halos nuevos; las sombras que ya había solo cambian de color.
6. **No es marca y no se toca:** `success` (verde), `error`, `warning`, el verde eléctrico
   `#39FF14` de los iconos del Perfil Weë y el morado `#7200FF` de los iconos del Perfil Real en el
   cajón, el dorado de lo que escribe la persona en Weë Brain (`#FBD45A`), paletas de categorías y
   comunidades, de especialistas (`constants/specialists.ts`), de temas de chat, de avatares, de
   pistas de música, las tintas de las ilustraciones de los sectores y los colores de marcas ajenas.
7. **Web y nativo:** `expo-linear-gradient` es un `background-image: linear-gradient(...)` en el
   navegador y una vista nativa en iOS/Android. La lámina no recibe toques (`pointerEvents="none"`).
8. **Estados que cambian de pintura** (píldora elegida, enviar que se habilita): la lámina se monta
   siempre y se apaga con `apagada={!elegida}`; así el botón no pone ni quita elementos.

## Todo Weë con el mismo degradado (2026-11-06)

Decisión del dueño: «Sí, todo Weë con el mismo degradado en todas las secciones». Se pasaron al
degradado las acciones principales que seguían en amarillo/naranja liso en Home, comentarios, Buscar,
compositor, WeeTalk (cámara), Perfil y avatar con IA, Onboarding, Comunidades, ËContact, WeëPages,
Weë AI (caja común, ajustes, fechas, plan, proyectos, resultados, 3D, Mis creaciones, Proyectos,
Writer, flujo guiado, barra lateral de Credits), Weë Studio y Producción, Weë Music, Weë Business,
Weë Travel (CTA «Plan with AI», «Preguntar a Weë Brain» y el `Boton` variante `dorado`), la versión
profesional (Entrar, Crear con IA), el Wäll inmersivo y Ajustes → Weë AI Engine. El texto encima pasa
a `sobrePrimario` donde estaba en blanco.

Lo vigila `functions/test/degradado-de-marca.test.mjs`: lee `components/`, `screens/` y
`navigation/`, encuentra cada `backgroundColor:` con el acento de marca sin velo y exige la lámina
dentro del mismo botón, o una entrada en su lista de excepciones con motivo (indicadores pequeños,
progreso, avatares, trazos y la pantalla de error, que no depende de nada más que react-native).
Los tonos por módulo de Travel, el morado `#7200FF`, el verde del Perfil Weë, los temas de chat de
WeeTalk y el negro propio de Weë Fashion no son marca y no se tocan.

## Pendiente

- `app.json` (`themeColor`, color de la notificación de Android) sigue en `#F5B731`: cambia la
  configuración nativa y requiere recompilar; se deja para el siguiente build.
- Weë Creator heredará los mismos tokens (`theme.colors.*`, `MARCA`, `RellenoDeMarca`) cuando se
  porte; esta ronda no lo toca.
