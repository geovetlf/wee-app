# Weë Admin Console — proyecto Firebase de pruebas y arnés R1–R12

> Guía para la persona dueña, preparada el 2026-11-01. **Nada de esto se ha ejecutado:** ni el proyecto existe ni el arnés real ha corrido nunca. Los pasos de la consola de Firebase pueden haber cambiado de nombre.

## 1. Reglas de esta guía

- **Proyecto:** `wee-admin-pruebas`, nuevo. Nunca `get-wee` ni `wee-dev-geovet`.
- **Facturación:** plan Spark. Si algún paso pide pasar a Blaze o añadir una tarjeta, **párate**.
- **Cuentas:** ninguna real. El arnés crea dos temporales en `@example.com` y las borra.
- **Credenciales:** fuera de cualquier repositorio o worktree. No las pegues en el chat ni en un informe.

> **Cuidado con `.firebaserc`:** el proyecto por defecto de este repositorio es **`get-wee`, producción**. Un comando de `firebase` sin `--project` apunta allí. No ejecutes `firebase use` ni añadas alias.

## 2. Crear el proyecto

En [console.firebase.google.com](https://console.firebase.google.com):

1. **Añadir proyecto** con el nombre `wee-admin-pruebas`.
   - Anota el **ID** que te asigne. Si está ocupado será algo como `wee-admin-pruebas-a1b2`, y el arnés también lo acepta.
   - Si te pide organización, elige «Sin organización» si puedes.
   - Desactiva Google Analytics y las funciones de IA opcionales.
2. **Comprueba el plan:** debe decir **Spark**.
3. **Authentication** → Comenzar → **Correo electrónico/contraseña** → Habilitar. No actives el enlace por correo ni otros proveedores, y no crees usuarios.
4. **Firestore Database** → Crear base de datos:
   - Edición **Standard**, en modo **nativo**.
   - Elige una ubicación. No se puede cambiar después.
   - Inicio en **modo de producción** (todo denegado).
5. **Clave web:** Configuración del proyecto → General → añadir app web `wee-admin-pruebas-web`, **sin Hosting**. Copia solo el valor `apiKey`.

No actives Storage, Functions ni Hosting: Functions y Storage exigen Blaze.

## 3. Cuenta de servicio

Firebase crea una al crear el proyecto (`firebase-adminsdk-…@<id>.iam.gserviceaccount.com`), que solo existe en ese proyecto. Es la que se usa, y **no debe recibir permisos en ningún otro**.

1. Crea una carpeta fuera de los repositorios, por ejemplo `C:\Users\<usuario>\wee-credenciales-pruebas`.
2. Configuración del proyecto → Cuentas de servicio → **Generar nueva clave privada**, y guárdala ahí como `wee-admin-pruebas.json`.
3. Limita el acceso a tu usuario y comprueba el proyecto. Este comando solo imprime el `project_id`:

```powershell
icacls "C:\Users\<usuario>\wee-credenciales-pruebas\wee-admin-pruebas.json" /inheritance:r /grant:r "${env:USERNAME}:F"
```

```powershell
(Get-Content "C:\Users\<usuario>\wee-credenciales-pruebas\wee-admin-pruebas.json" -Raw | ConvertFrom-Json).project_id
```

**Si la consola no deja generar la clave**, será una política de organización (`iam.disableServiceAccountKeyCreation`). No la cambies por esto, porque sería un cambio de IAM de la organización. Avísame: el arnés lee el `project_id` del archivo y sin clave no arranca. La salida limpia es crear el proyecto sin organización, si tu cuenta lo permite.

## 4. Reglas e índices de la rama

**El arnés no los necesita:** usa el Admin SDK, que no pasa por las reglas, y sus consultas solo usan índices automáticos. Sirven para que el proyecto sea igual a la rama y para pruebas de reglas futuras.

**Hay una decisión tuya aquí.** `firebase.json` lleva un cerrojo (`scripts/solo-desde-el-workflow.mjs`) que impide desplegar desde un portátil o un worktree, por tu orden del 2026-10-01. Lo comprobé: sale con error. No se ha tocado ni hay que tocarlo.

| Opción | Cómo | Cubre |
|---|---|---|
| **A. Sin excepción** | Firestore → Reglas → pegar el contenido de `firestore.rules` → Publicar | Solo reglas; 37 índices a mano no son razonables |
| **B. Con tu excepción expresa** | Carpeta temporal fuera del repositorio, con copias de los dos archivos y un `firebase.json` propio, sin `.firebaserc` | Reglas e índices |

**Recomiendo B**, porque pediste los dos y sin `.firebaserc` no hay ningún proyecto por defecto al que caer. Pero despliega desde tu portátil sin pasar por ese cerrojo, así que solo se hace si dices que tu orden no alcanza a este proyecto. Esta configuración no se ha probado contra Firebase real.

```powershell
$dir = "$env:USERPROFILE\wee-admin-pruebas-despliegue"; New-Item -ItemType Directory -Force $dir
```

```powershell
git -C <worktree-de-la-consola> archive --format=tar --output "$dir\reglas.tar" 53396074df2a9e714728b20126ad2464e2f85774 firestore.rules firestore.indexes.json
```

```powershell
tar -xf "$dir\reglas.tar" -C $dir
```

```powershell
Set-Content -Encoding ascii "$dir\firebase.json" '{ "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" } }'
```

```powershell
Set-Location $dir; firebase.cmd deploy --only firestore --project wee-admin-pruebas
```

Si el ID lleva sufijo, usa el tuyo en `--project`. La salida debe nombrar `wee-admin-pruebas` y ningún otro proyecto.

## 5. Variables para el arnés

Solo en esa ventana de PowerShell, nunca con `setx`, y sin variables de emulador abiertas (el arnés se niega si las hay):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\<usuario>\wee-credenciales-pruebas\wee-admin-pruebas.json"
```

```powershell
$env:WEE_PRUEBA_API_KEY = Read-Host "Clave web del proyecto de pruebas"
```

## 6. Qué se puede probar sin Functions desplegadas

El arnés tiene dos modos, y no demuestran lo mismo:

- **Local, sin `--url`.** La callable compilada corre en tu equipo contra **Auth y Firestore reales**. No necesita Blaze. Demuestra el código con servicios reales.
- **Desplegado, con `--url`.** Llama a la Function publicada. **Necesita Blaze, que no está autorizado.** Demuestra además el entorno real: cuenta de servicio, variables, invocador y CORS.

| Prueba | Local | Solo desplegado | Lo que el modo local NO demuestra |
|---|---|---|---|
| R1 token real aceptado | ✔ | | Que la cuenta de servicio desplegada pueda leer Auth |
| R2 tokens forjados → 401 | ✔ | | Que el entorno desplegado no tenga modo de depuración |
| R3 cuenta normal → 403 | ✔ | | |
| R4 cambio de rol | ✔ | | |
| R5 retirada de `admin` | ✔ | | |
| R6 baja de la cuenta | ✔ | | |
| R7 revocación | ✔ | | |
| R8 constancia en `adminAudit` | ✔ | | Permisos de escritura de la cuenta desplegada |
| R9 enumeración | ✔ | | **El estado de `get-wee`** |
| R10 límite de intentos | ✔ | | **El estado de `get-wee`** |
| R11 caducidad (`--esperar-caducidad`, más de 1 h) | ✔ | | |
| R12 CORS | | **✔** | Sin `--url` no se ejecuta |

Once de las doce pueden correr en local. Para cerrar el criterio de producción, **R1 a R8 y R12 tendrían que repetirse con `--url`**, y R1 es la que revelaría un fallo de permisos de la cuenta desplegada.

**Avisos para leer los resultados:**

- **R9 y R10 dependen de la configuración de cada proyecto.** La protección contra enumeración viene activa por defecto solo desde el 15-09-2023. Un resultado bueno aquí no dice nada de `get-wee`, que hay que comprobar aparte.
- **R10 no es un fallo de seguridad por sí solo.** Google no publica el umbral: si no hay bloqueo en 20 intentos, puede ser solo que el tope es corto.
- **El modo real nunca ha corrido.** Solo se ha probado con emuladores (`--autoprueba`, 13/13) y con la firma a nivel de SDK. Puede fallar la primera vez, y eso será un resultado que hay que investigar.

**R1–R12 no cubren, en ningún modo:**

- La consola contra un proyecto real: `resolverEntorno` solo admite `demo-*`.
- Las reglas con un token real.
- Los índices de las consultas de `lecturas.ts`, como `creatorJobs(status, updatedAt)`.
- CSP, App Check y segundo factor.

**Controles del arnés, sin cambios y comprobados sin red:**

| Proyecto | Resultado |
|---|---|
| `wee-admin-pruebas` y `wee-admin-pruebas-a1b2` | Aceptados |
| `get-wee`, `wee-dev-geovet`, `demo-wee-pruebas`, `wee-admin` | Rechazados |
| Credencial de otro proyecto | Rechazada |

## 7. Ejecutar (todavía no)

Requiere tu autorización. Crea cuentas temporales con claims de administración **solo en ese proyecto**, y las entradas de `adminAudit` se quedan allí:

```powershell
node <worktree-de-la-consola>\admin-console\e2e\proyecto-real.mjs --ejecutar --proyecto wee-admin-pruebas --confirmo wee-admin-pruebas
```

## 8. Al terminar

1. Borra la clave en Configuración del proyecto → Cuentas de servicio, o en Google Cloud → IAM → Cuentas de servicio → Claves.
2. Borra el archivo JSON local.
3. Si ya no hace falta, elimina el proyecto.
