# Rúbrica del revisor de CÓDIGO de Weë

Se lee junto a [comun.md](comun.md) (contrato, severidad, estados, salida). Dominio de los ids: `ia-codigo`.

El revisor de código mira si lo que cambió en la fase **hace lo que dice, falla bien y se puede mantener**. No
repite lo que ya vieron los detectores deterministas (están en la clasificación de la baseline): parte de ahí y
mira lo que un detector no puede ver.

## 1. Corrección

- ¿El cambio hace lo que su commit, su comentario o su documento dicen? Lee el llamador y el llamado.
- Bordes: listas vacías, `undefined` que viaja, cero, fechas en otra zona horaria, textos con «ë» o con
  escritura de derecha a izquierda.
- Asincronía: promesas sin `await` que deberían esperarse, carreras entre dos `setState`, efectos que leen un
  valor viejo, respuestas que llegan después de desmontar la pantalla.
- React: `useEffect` con dependencias incompletas o que se reejecuta en bucle; suscripciones, oyentes e
  intervalos sin limpieza; listas sin `key` estable.
- Errores: un `catch` que traga sin dejar rastro; un error de proveedor que llega a la persona en inglés
  técnico en vez de un mensaje de i18n; un reintento sin tope.

## 2. Web primero

Weë se prueba primero en la web. En React Native Web `Alert.alert` no hace nada: un flujo que confía en sus
botones está roto en la web (alta). Los avisos y confirmaciones van por `notify` / `confirmAction`
(`utils/notify.ts`). Las divergencias de plataforma van con `Platform.OS` o con archivos `.web.tsx` /
`.native.tsx`, no con ramas que dejan la web sin camino.

## 3. Simplificación estructural

Ante cada bloque nuevo, pregúntate: **¿se puede reformular para que desaparezcan ramas o capas?** Una tabla en
vez de un `switch` que crece; un ayudante que ya existe en vez de una copia; una función pura en vez de un
efecto. Un hallazgo de simplificación es `baja` o `media` y dice qué desaparece, no solo que «se puede mejorar».

## 4. Reutilización y capa canónica

Antes de aceptar un ayudante nuevo, busca el que ya existe: `useT` y `i18n/formato.ts` (textos, fechas,
números), `utils/notify.ts` (avisos), `CajaDePrompt` y `CajaQueCrece` (cajas de Weë AI), `creditsService` y el
Credit Engine (Credits), `cuentaDeIdentidad` (cuenta de una cara), los lectores del Core en el servidor.
Duplicar uno de esos es un hallazgo (`media`); duplicar lógica de Credits o de IA es `alta`.

## 5. Tipos y fronteras explícitas

- Cada `any` nuevo necesita su porqué; el detector cuenta los `any` por archivo y la baseline solo avisa si la
  cuenta SUBE. Prefiere `unknown` + validación en la frontera.
- Lo que entra por una frontera (callable, webhook, Firestore, parámetros de navegación, JSON de un proveedor)
  se valida en la frontera, no tres llamadas más abajo.

## 6. Tamaño y crecimiento

- **Cruzar las 1000 líneas** en una fase es una decisión, no un accidente: el detector lo marca y aquí se dice
  si el archivo se debe partir y por dónde (por responsabilidad, no por número de líneas).
- **Crecimiento espagueti:** funciones que suman parámetros booleanos, `if` anidados por tipo de caso, estados
  que se pasan de mano en mano. Se describe el síntoma y la forma de cortarlo.

## 7. i18n y marcas en el código que cambió

Textos de interfaz escritos a mano (también en `hooks/`, `services/`, `utils/`, `contexts/`: los detectores
avisan de las frases que llegan a setters, `notify` y `throw`), concatenación de frases, plurales hechos con
`if`, `toLocaleString('es')`, catálogos de `constants/` que guardan frases en vez de claves, «Wee» o «WEE» en
un texto visible nuevo.

## 8. Roturas de devex

Cambios que rompen el trabajo de otra persona aunque la app funcione: una variable de entorno nueva que no está
en `.env.example` ni documentada; un puerto o un host de emulador cambiado; un script de `package.json` que ya
no existe o cambió de nombre; una dependencia de Java, Node o del sistema que nadie anotó; un paso que solo
funciona en macOS o solo en Windows (el portátil del equipo es Windows con Git Bash).

## 9. Las pruebas del cambio

- ¿El cambio trae su prueba? ¿Esa prueba fallaría si el cambio se deshiciera (sabotaje)?
- `check(…, true)` con un `true` literal o `|| true` en la condición no prueban nada.
- Una suite nueva que no está en `scripts.test` de `functions/package.json` no corre nunca.
- Las pruebas usan datos propios (fixtures, `mkdtemp`), no conteos del repositorio que cambian con el código.
