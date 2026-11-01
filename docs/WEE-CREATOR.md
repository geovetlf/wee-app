# Weë App y Weë Creator

Weë es una sola aplicación, con un solo núcleo y dos presentaciones. Decisión del dueño, 2026-10-31.

| | Weë App | Weë Creator |
|---|---|---|
| Experiencia | Social y creativa | Profesional y creativa |
| Dónde | Web, Android, iOS | Solo web, en `/creator` |
| Lo social | Muro, Weëls, perfiles, comunidades, conexiones, WeeTalk, notificaciones | No se muestra |
| Publicar | Sí | No: la creación se publica desde App |

Las dos usan la misma sesión, identidad, Credits, Weë Brain, motores, proyectos, activos y almacenamiento. Ningún servicio, hook ni función conoce el modo. Cambiar de modo no cambia el perfil activo. Lo vigila `functions/test/version-profesional.test.mjs`.

Dónde está: `navigation/EspacioProfesionalNavigator.tsx`, `components/workspace/MarcoProfesional.tsx`, `screens/ProInicioScreen.tsx`, `constants/espacioProfesional.ts` y las ramas `useEnEspacioProfesional()`.

## Defectos conocidos, sin corregir

Cada uno necesita autorización del dueño.

1. **El perfil activo no se guarda al recargar.** `activeProfileType` vive en memoria (`contexts/UserProfileContext.tsx`), así que recargar la página vuelve al Perfil Real. Ocurre en los dos modos. Cambiar de modo sin recargar sí lo conserva.
2. **Configuración, Billetera y Tienda de Credits salen del marco de Creator.** Son pantallas de la cuenta y funcionan, pero se ven con el diseño de App.
3. **Las recargas de Credits están cerradas, pero el botón aparece.** `WalletScreen` muestra «Recargar».
4. **Ningún motor tiene generación real verificada en esta rama.** La prueba con sesión usa emuladores y el motor en modo demo. «Conectado», en el Inicio de Creator, dice que el flujo llega al motor, no que el proveedor responda hoy.
5. **Weë Design se comporta distinto en cada modo.** En Creator va a `CreatorFlow`, con plan, precio y cobro por el Credit Engine. En App sigue simulando: «Creando…» es un temporizador y no genera nada.
6. **Una pregunta sin opciones no tiene salida en App.** `GuidedQuestion` solo muestra opciones, así que el nombre de un logo deja el flujo parado. En Creator se responde en la caja común.

## Estado de los motores

| Motor | Interfaz | Flujo | Conectado, por código | Generación real |
|---|---|---|---|---|
| Design, solo en Creator | Sí | Sí, probado en demo | Sí | Sin verificar |
| Brain, Studio, Chef, Fashion, Travel | Sí | Sí | Sí | Sin verificar |
| Music | Sí | Prepara la intención | No, pendiente | No |
| Filmmaker, 3D World | Sí | Puerta cerrada | No, cerrados | No |
