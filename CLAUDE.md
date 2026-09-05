# CLAUDE.md — Weë (World Enhanced Entity)

## Qué es este proyecto

Red social para la generación de la IA: **SOCIAL + AI TOOLS + CREATION + COMMUNITY + DISCOVERY**. No es solo una red social, ni solo herramientas de IA, ni solo avatares, ni solo comunidades. Visión completa en [`docs/VISION.md`](docs/VISION.md); estado real del código en [`README.md`](README.md).

Toda funcionalidad nueva se evalúa con una pregunta:

> ¿Esto ayuda a una persona a crear, compartir, aprender, conectar o trabajar mejor con Inteligencia Artificial?

## Mapa de nombres (visión → código actual)

| Visión | Código hoy |
|---|---|
| Wave (feed) | `HomeScreen`, `postsService` |
| Weels (videos ≤15 s con watermark) | `ReelsScreen`, `videoDownload.ts` |
| Weetalk (chat) | `InboxScreen`, `ConversationScreen`, `messagesService` |
| Communities | `CommunityScreen`, `communityService` |
| Perfil WEE (identidad alterna) | `HidiCreationScreen`, `AiAvatarScreen`, `getHidiProfile` — "Hidi" es el nombre heredado |
| Credits | `CreditStoreScreen`, `WalletScreen`, `creditsService` |
| WEE Creator / AI Apps / Influencer / Descubrimiento de IA | no existen todavía |

Al renombrar cosas heredadas (HideTok, Hidi), hacerlo de forma coordinada y no a medias.

## Firebase: dos entornos — nunca tocar producción sin pedirlo

- `wee-dev-geovet` = **dev** (alias `dev` y `default` en `.firebaserc`).
- `get-wee` = **producción** (alias `prod`): app publicada, usuarios reales.
- `firebase deploy` sin `--project` cae en dev. Producción solo con `--project prod` y confirmación explícita del usuario.
- `.env`, `google-services.json` locales apuntan a dev. El `GoogleService-Info.plist` versionado es de producción.

## Stack y restricciones

- Expo SDK 54 managed, React Native 0.81, React 19, TypeScript, React Navigation 7, React Native Web. Un solo código para iOS, Android y Web; divergencias puntuales con `Platform.OS` o archivos `.web.tsx` / `.native.tsx`.
- **Expo Go no sirve** (módulos nativos). Móvil = development build por EAS, luego Metro por WiFi. Actualizaciones de producción con `eas update`; solo cambios nativos requieren build nuevo.
- Cloud Functions (`functions/src`) usan Gemini para el avatar del perfil WEE.
- UI y textos en español. Comentarios en español o inglés según el archivo circundante.

## Forma de trabajar acordada

1. Web primero (ciclo instantáneo), después Android (dev build), iOS al final.
2. Pendiente: reapuntar `app.json` / `eas.json` (owner, projectId, updates.url, Apple ID) a la cuenta del usuario antes del primer build.
3. Bugs conocidos listados en README → "Problemas conocidos". No corregirlos sin que el usuario lo pida.
4. Commits y push solo cuando el usuario lo pida.
