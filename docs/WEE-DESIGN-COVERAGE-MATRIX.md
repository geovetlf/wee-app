<!-- GENERADO por scripts/design-cobertura.mjs: no se edita a mano. -->
# Weë Design — matriz de cobertura

> Sale de `constants/designReferencia.ts` y `utils/designReferencia.ts` (ejecutados), `docs/wee-design-capacidades.json` y `docs/wee-design-proveedores.json`. Se regenera con `node scripts/design-cobertura.mjs`; `functions/test/design-referencia.mjs` falla si este documento no coincide.

Una capacidad está **cubierta** cuando tiene todo el recorrido: CAPACIDAD → ORDEN → PUNTO DE ENTRADA → PANEL → OPCIONES → PRECIO → TRABAJO → PROGRESO → RESULTADO → LO QUE SIGUE → MATERIAL / PROYECTO / VERSIÓN. Cada celda es exactamente una de cuatro:

- **YES**: hay una pieza de verdad (código o servidor que funciona hoy).
- **PENDING**: está diseñado y representado en la referencia (apagado con su motivo, o recorrible en simulación marcada), y espera algo: servidor, proveedor autorizado, visor, linaje o una decisión.
- **N/A**: no aplica a esa capacidad, dicho a propósito.
- **NO**: falta y nadie lo ha diseñado.

## 1. Matriz A — cobertura por capacidad

| Capability | Entry | Composer | Panel | Job | Progress | Error | Retry | Cancel Request | Cancelled | Result | Next Action | Asset | Version | Export | Mobile | Provider |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 · `concept` | YES | YES | YES | YES | YES | YES | YES | NO | NO | YES | YES | YES | PENDING | YES | YES | YES |
| C02 · `multiview` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C03 · `model3dFromText` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C06 · `styleReference` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C12 · `anotherVersion` | YES | N/A | YES | YES | YES | YES | YES | NO | NO | YES | YES | YES | PENDING | YES | YES | YES |
| C37 · `batchTo3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C41 · `generateScene` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C08 · `model3dFromImage` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C09 · `model3dFromViews` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C75 · `reconstructObject` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C76 · `generateInParts` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C81 · `regenerate3d` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C82 · `variations3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C88 · `parametricTemplate` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C94 · `cadFromText` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C95 · `cadFromImage` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C106 · `customStyle3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C107 · `searchModelLibrary` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C72 · `gaussianSplat` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C15 · `editModel` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C17 · `optimizeMesh` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C18 · `splitParts` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C19 · `realScale` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C20 · `stylize` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C42 · `mergeParts` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C43 · `repairMesh` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C44 · `transformObject` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A | N/A | PENDING | YES | N/A |
| C80 · `refineModel` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C86 · `parametricAdjust` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C96 · `meshToCad` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C97 · `measureModel` | YES | N/A | YES | N/A | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | N/A | N/A | N/A | YES | N/A |
| C16 · `texture` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C38 · `retouchRegion` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C45 · `unwrapUv` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | N/A | N/A | PENDING |
| C46 · `materialProperties` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A | N/A | PENDING | YES | N/A |
| C90 · `paintTexture` | YES | N/A | YES | N/A | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | PENDING | PENDING | N/A | YES | N/A |
| C92 · `tileableTexture` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C21 · `rig` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C22 · `animate` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C23 · `motionFromText` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C47 · `pose` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C77 · `articulate` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C98 · `motionFromVideo` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C99 · `editMotion` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C100 · `avatarFromPhoto` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C101 · `lipSync` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C93 · `platformAvatar` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C24 · `composeScene` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A | N/A | PENDING | YES | N/A |
| C25 · `cameras` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A | N/A | PENDING | YES | N/A |
| C26 · `lights` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A | N/A | PENDING | YES | N/A |
| C05 · `environment` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C48 · `sceneBackground` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A | N/A | PENDING | YES | N/A |
| C87 · `skybox360` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C102 · `editWorld` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C103 · `interactiveWorldVideo` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C104 · `cameraTrackFromVideo` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C79 · `objectStructure` | YES | N/A | YES | N/A | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | N/A | N/A | N/A | YES | N/A |
| C27 · `viewer` | YES | N/A | YES | N/A | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | N/A | N/A | N/A | YES | N/A |
| C28 · `viewModes` | YES | N/A | YES | N/A | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | N/A | N/A | N/A | YES | N/A |
| C04 · `photoRender` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C49 · `snapshot3d` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | PENDING | PENDING | PENDING | YES | N/A |
| C50 · `turntable` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | PENDING | PENDING | PENDING | YES | N/A |
| C89 · `spriteSheet` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | PENDING | PENDING | PENDING | YES | N/A |
| C10 · `presentationVideo` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C29 · `beforeAfter` | YES | N/A | YES | N/A | N/A | YES | N/A | N/A | N/A | YES | YES | YES | PENDING | YES | YES | YES |
| C32 · `print3d` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C51 · `printability` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C52 · `multicolorPrint` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C91 · `printBase` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C53 · `sendToSlicer` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A |
| C71 · `physicalProduct` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C07 · `restyleSpace` | YES | YES | YES | YES | YES | YES | YES | NO | NO | YES | YES | YES | PENDING | YES | YES | YES |
| C11 · `editImage` | YES | N/A | YES | YES | YES | YES | YES | NO | NO | YES | YES | YES | PENDING | YES | YES | YES |
| C13 · `removeBackground` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C14 · `upscale` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C39 · `inpaintImage` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C40 · `sketchToImage` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C83 · `imageFor3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | NO | NO | PENDING | YES | PENDING | PENDING | PENDING | YES | YES |
| C105 · `depthFromImage` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | N/A | N/A | PENDING |
| C54 · `designAgent` | YES | YES | YES | YES | YES | YES | YES | NO | NO | YES | YES | YES | PENDING | YES | YES | YES |
| C55 · `contextualSuggestions` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C56 · `capabilityDiscovery` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C57 · `costConfirmation` | YES | YES | YES | YES | YES | YES | YES | NO | NO | YES | YES | YES | PENDING | YES | YES | N/A |
| C74 · `providerAgent` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C84 · `chainToObject` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C85 · `externalAgents` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C58 · `assetBrowser` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C36 · `versions` | YES | N/A | YES | N/A | N/A | PENDING | PENDING | N/A | N/A | PENDING | N/A | N/A | PENDING | N/A | YES | N/A |
| C59 · `lineage` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | PENDING | N/A | YES | N/A |
| C60 · `reuseAsset` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | PENDING | PENDING | PENDING | YES | N/A |
| C61 · `favorites` | YES | N/A | YES | N/A | N/A | PENDING | PENDING | N/A | N/A | PENDING | N/A | N/A | N/A | N/A | YES | N/A |
| C62 · `searchAssets` | YES | N/A | YES | N/A | N/A | PENDING | PENDING | N/A | N/A | PENDING | N/A | N/A | N/A | N/A | YES | N/A |
| C63 · `filterAssets` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C35 · `importModel` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | N/A | N/A | PENDING | YES | PENDING | PENDING | PENDING | YES | N/A |
| C34 · `saveToProject` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C73 · `remixPublicModel` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C64 · `createProject` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C65 · `switchProject` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C66 · `projectHistory` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C67 · `projectFolders` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C68 · `projectSnapshot` | YES | N/A | YES | N/A | N/A | PENDING | PENDING | N/A | N/A | PENDING | N/A | N/A | PENDING | N/A | YES | N/A |
| C69 · `projectDelivery` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | N/A |
| C30 · `download` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | YES | YES | N/A |
| C31 · `exportFor` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |
| C33 · `publish` | YES | N/A | YES | N/A | N/A | YES | YES | N/A | N/A | YES | N/A | N/A | N/A | N/A | YES | N/A |
| C70 · `externalTools` | YES | N/A | YES | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | N/A | N/A | N/A | PENDING | YES | N/A |
| C78 · `simulationReady` | YES | N/A | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING | PENDING | PENDING | YES | PENDING |

Totales por columna:

- Entry: YES 92 · PENDING 0 · N/A 15 · NO 0
- Composer: YES 21 · PENDING 0 · N/A 86 · NO 0
- Panel: YES 92 · PENDING 0 · N/A 15 · NO 0
- Job: YES 6 · PENDING 57 · N/A 44 · NO 0
- Progress: YES 6 · PENDING 62 · N/A 39 · NO 0
- Error: YES 18 · PENDING 74 · N/A 15 · NO 0
- Retry: YES 17 · PENDING 66 · N/A 24 · NO 0
- Cancel Request: YES 0 · PENDING 42 · N/A 49 · NO 16
- Cancelled: YES 0 · PENDING 42 · N/A 49 · NO 16
- Result: YES 18 · PENDING 76 · N/A 13 · NO 0
- Next Action: YES 75 · PENDING 0 · N/A 32 · NO 0
- Asset: YES 7 · PENDING 60 · N/A 40 · NO 0
- Version: YES 0 · PENDING 70 · N/A 37 · NO 0
- Export: YES 8 · PENDING 65 · N/A 34 · NO 0
- Mobile: YES 92 · PENDING 0 · N/A 15 · NO 0
- Provider: YES 15 · PENDING 44 · N/A 48 · NO 0

## 2. Los diecinueve pasos de cada capacidad

| Capability | Dónde se pide | Orden | Panel | Opciones | Comprobación | Precio | Confirmación | Trabajo | Progreso | Cancelación | Error | Reintento | Resultado | Edición | Guardar | Material | Versión | Lo que sigue | Exportar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 · `concept` | YES | YES | YES | YES | YES | YES | YES | YES | YES | PENDING | YES | YES | YES | YES | YES | YES | PENDING | YES | YES |
| C02 · `multiview` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C03 · `model3dFromText` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C06 · `styleReference` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C12 · `anotherVersion` | YES | YES | YES | YES | YES | YES | YES | YES | YES | PENDING | YES | YES | YES | YES | YES | YES | PENDING | YES | YES |
| C37 · `batchTo3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C41 · `generateScene` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C08 · `model3dFromImage` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C09 · `model3dFromViews` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C75 · `reconstructObject` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C76 · `generateInParts` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C81 · `regenerate3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C82 · `variations3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C88 · `parametricTemplate` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C94 · `cadFromText` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C95 · `cadFromImage` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C106 · `customStyle3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C107 · `searchModelLibrary` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C72 · `gaussianSplat` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C15 · `editModel` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C17 · `optimizeMesh` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C18 · `splitParts` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C19 · `realScale` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C20 · `stylize` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C42 · `mergeParts` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C43 · `repairMesh` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C44 · `transformObject` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | YES | PENDING |
| C80 · `refineModel` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C86 · `parametricAdjust` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C96 · `meshToCad` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C97 · `measureModel` | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | N/A | N/A | YES | N/A |
| C16 · `texture` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C38 · `retouchRegion` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C45 · `unwrapUv` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | N/A | PENDING | PENDING | N/A | N/A |
| C46 · `materialProperties` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | YES | PENDING |
| C90 · `paintTexture` | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | PENDING | PENDING | PENDING | YES | N/A |
| C92 · `tileableTexture` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C21 · `rig` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C22 · `animate` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C23 · `motionFromText` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C47 · `pose` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C77 · `articulate` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C98 · `motionFromVideo` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C99 · `editMotion` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C100 · `avatarFromPhoto` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C101 · `lipSync` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C93 · `platformAvatar` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C24 · `composeScene` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | YES | PENDING |
| C25 · `cameras` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | YES | PENDING |
| C26 · `lights` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | YES | PENDING |
| C05 · `environment` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C48 · `sceneBackground` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | YES | PENDING |
| C87 · `skybox360` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C102 · `editWorld` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C103 · `interactiveWorldVideo` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C104 · `cameraTrackFromVideo` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C79 · `objectStructure` | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | N/A | N/A | YES | N/A |
| C27 · `viewer` | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | N/A | N/A | YES | N/A |
| C28 · `viewModes` | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | PENDING | PENDING | N/A | N/A | N/A | N/A | YES | N/A |
| C04 · `photoRender` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C49 · `snapshot3d` | YES | YES | YES | PENDING | PENDING | N/A | N/A | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | N/A | PENDING | PENDING | PENDING | YES | PENDING |
| C50 · `turntable` | YES | YES | YES | PENDING | PENDING | N/A | N/A | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | N/A | PENDING | PENDING | PENDING | YES | PENDING |
| C89 · `spriteSheet` | YES | YES | YES | PENDING | PENDING | N/A | N/A | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | N/A | PENDING | PENDING | PENDING | YES | PENDING |
| C10 · `presentationVideo` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C29 · `beforeAfter` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | N/A | YES | YES | YES | YES | PENDING | YES | YES |
| C32 · `print3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C51 · `printability` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C52 · `multicolorPrint` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C91 · `printBase` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C53 · `sendToSlicer` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING |
| C71 · `physicalProduct` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C07 · `restyleSpace` | YES | YES | YES | YES | YES | YES | YES | YES | YES | PENDING | YES | YES | YES | YES | YES | YES | PENDING | YES | YES |
| C11 · `editImage` | YES | YES | YES | YES | YES | YES | YES | YES | YES | PENDING | YES | YES | YES | YES | YES | YES | PENDING | YES | YES |
| C13 · `removeBackground` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C14 · `upscale` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C39 · `inpaintImage` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C40 · `sketchToImage` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C83 · `imageFor3d` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C105 · `depthFromImage` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | N/A | PENDING | PENDING | N/A | N/A |
| C54 · `designAgent` | YES | YES | YES | YES | YES | YES | YES | YES | YES | PENDING | YES | YES | YES | YES | YES | YES | PENDING | YES | YES |
| C55 · `contextualSuggestions` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | N/A |
| C56 · `capabilityDiscovery` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | N/A |
| C57 · `costConfirmation` | YES | YES | YES | YES | YES | YES | YES | YES | YES | PENDING | YES | YES | YES | YES | YES | YES | PENDING | YES | YES |
| C74 · `providerAgent` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C84 · `chainToObject` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C85 · `externalAgents` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C58 · `assetBrowser` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | N/A |
| C36 · `versions` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | PENDING | PENDING | PENDING | N/A | N/A | N/A | PENDING | N/A | N/A |
| C59 · `lineage` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | PENDING | N/A | N/A |
| C60 · `reuseAsset` | YES | YES | YES | PENDING | PENDING | N/A | N/A | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | N/A | PENDING | PENDING | PENDING | YES | PENDING |
| C61 · `favorites` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | PENDING | PENDING | PENDING | N/A | PENDING | N/A | N/A | N/A | N/A |
| C62 · `searchAssets` | YES | YES | YES | PENDING | YES | N/A | N/A | N/A | N/A | N/A | PENDING | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | N/A |
| C63 · `filterAssets` | YES | YES | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | N/A |
| C35 · `importModel` | YES | YES | YES | PENDING | PENDING | N/A | N/A | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | N/A | PENDING | PENDING | PENDING | YES | PENDING |
| C34 · `saveToProject` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A |
| C73 · `remixPublicModel` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C64 · `createProject` | YES | YES | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A |
| C65 · `switchProject` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | N/A |
| C66 · `projectHistory` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | N/A |
| C67 · `projectFolders` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| C68 · `projectSnapshot` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | PENDING | PENDING | PENDING | N/A | PENDING | N/A | PENDING | N/A | N/A |
| C69 · `projectDelivery` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C30 · `download` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | YES |
| C31 · `exportFor` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |
| C33 · `publish` | YES | YES | YES | N/A | YES | N/A | N/A | N/A | N/A | N/A | YES | YES | YES | N/A | N/A | N/A | N/A | N/A | N/A |
| C70 · `externalTools` | YES | YES | YES | PENDING | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING | N/A | PENDING | N/A | N/A | N/A | N/A | N/A | PENDING |
| C78 · `simulationReady` | YES | YES | YES | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | YES | PENDING |

## 3. Lo que falta (690 celdas NO o PENDING en la Matriz A)

- **Entry**: nada
- **Composer**: nada
- **Panel**: nada
- **Job** (57): `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `chainToObject`, `reuseAsset`, `importModel`, `projectDelivery`, `exportFor`, `simulationReady`
- **Progress** (62): `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `measureModel`, `texture`, `retouchRegion`, `paintTexture`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360`, `objectStructure`, `viewer`, `viewModes`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `chainToObject`, `reuseAsset`, `importModel`, `projectDelivery`, `exportFor`, `simulationReady`
- **Error** (74): `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `transformObject`, `refineModel`, `parametricAdjust`, `meshToCad`, `measureModel`, `texture`, `retouchRegion`, `materialProperties`, `paintTexture`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `composeScene`, `cameras`, `lights`, `environment`, `sceneBackground`, `skybox360`, `objectStructure`, `viewer`, `viewModes`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `sendToSlicer`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `chainToObject`, `versions`, `reuseAsset`, `favorites`, `searchAssets`, `importModel`, `projectSnapshot`, `projectDelivery`, `exportFor`, `externalTools`, `simulationReady`
- **Retry** (66): `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `measureModel`, `texture`, `retouchRegion`, `paintTexture`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360`, `objectStructure`, `viewer`, `viewModes`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `chainToObject`, `versions`, `reuseAsset`, `favorites`, `searchAssets`, `importModel`, `projectSnapshot`, `projectDelivery`, `exportFor`, `simulationReady`
- **Cancel Request** (58): `concept` (NO), `multiview` (NO), `model3dFromText`, `styleReference` (NO), `anotherVersion` (NO), `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `tileableTexture` (NO), `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360` (NO), `photoRender`, `presentationVideo` (NO), `print3d`, `printability`, `multicolorPrint`, `printBase`, `restyleSpace` (NO), `editImage` (NO), `removeBackground` (NO), `upscale` (NO), `inpaintImage` (NO), `sketchToImage` (NO), `imageFor3d` (NO), `designAgent` (NO), `costConfirmation` (NO), `chainToObject`, `projectDelivery`, `exportFor`, `simulationReady`
- **Cancelled** (58): `concept` (NO), `multiview` (NO), `model3dFromText`, `styleReference` (NO), `anotherVersion` (NO), `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `tileableTexture` (NO), `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360` (NO), `photoRender`, `presentationVideo` (NO), `print3d`, `printability`, `multicolorPrint`, `printBase`, `restyleSpace` (NO), `editImage` (NO), `removeBackground` (NO), `upscale` (NO), `inpaintImage` (NO), `sketchToImage` (NO), `imageFor3d` (NO), `designAgent` (NO), `costConfirmation` (NO), `chainToObject`, `projectDelivery`, `exportFor`, `simulationReady`
- **Result** (76): `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `transformObject`, `refineModel`, `parametricAdjust`, `meshToCad`, `measureModel`, `texture`, `retouchRegion`, `unwrapUv`, `materialProperties`, `paintTexture`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `composeScene`, `cameras`, `lights`, `environment`, `sceneBackground`, `skybox360`, `objectStructure`, `viewer`, `viewModes`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `sendToSlicer`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `depthFromImage`, `chainToObject`, `versions`, `reuseAsset`, `favorites`, `searchAssets`, `importModel`, `projectSnapshot`, `projectDelivery`, `exportFor`, `externalTools`, `simulationReady`
- **Next Action**: nada
- **Asset** (60): `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `unwrapUv`, `paintTexture`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `depthFromImage`, `chainToObject`, `reuseAsset`, `importModel`, `projectDelivery`, `exportFor`, `simulationReady`
- **Version** (70): `concept`, `multiview`, `model3dFromText`, `styleReference`, `anotherVersion`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `unwrapUv`, `paintTexture`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `beforeAfter`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `restyleSpace`, `editImage`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `depthFromImage`, `designAgent`, `costConfirmation`, `chainToObject`, `versions`, `lineage`, `reuseAsset`, `importModel`, `projectSnapshot`, `projectDelivery`, `exportFor`, `simulationReady`
- **Export** (65): `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `transformObject`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `materialProperties`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `composeScene`, `cameras`, `lights`, `environment`, `sceneBackground`, `skybox360`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `presentationVideo`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `sendToSlicer`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `chainToObject`, `reuseAsset`, `importModel`, `projectDelivery`, `exportFor`, `externalTools`, `simulationReady`
- **Mobile**: nada
- **Provider** (44): `model3dFromText`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `unwrapUv`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `environment`, `skybox360`, `photoRender`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `depthFromImage`, `chainToObject`, `exportFor`, `simulationReady`

## 3b. Detecciones automáticas

Cruces de columnas de la Matriz A (`deteccionesDe`), sin opinión: YES y PENDING cuentan como «hay»; NO y N/A como «no hay». Error, Retry, Cancel Request y Cancelled son columnas propias: **CANCEL REQUEST ≠ CANCELLED** (pedir parar no es haber parado; solo el Job Engine confirma la parada).

| Detección | Capacidades | Cuáles |
| --- | --- | --- |
| UI sin backend (se ve y se pulsa; el trabajo no existe todavía) | 65 | `multiview`, `model3dFromText`, `styleReference`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `measureModel`, `texture`, `retouchRegion`, `paintTexture`, `tileableTexture`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `composeScene`, `lights`, `skybox360`, `photoRender`, `snapshot3d`, `turntable`, `spriteSheet`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `sendToSlicer`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `chainToObject`, `versions`, `reuseAsset`, `favorites`, `searchAssets`, `importModel`, `saveToProject`, `projectSnapshot`, `projectDelivery`, `exportFor`, `externalTools`, `simulationReady` |
| Backend sin UI (hay trabajo y nadie lo abre) | 0 | — |
| Capacidad del motor sin Job | 3 | `unwrapUv`, `beforeAfter`, `depthFromImage` |
| Job sin resultado | 0 | — |
| Resultado sin Asset | 6 | `transformObject`, `materialProperties`, `composeScene`, `cameras`, `lights`, `sceneBackground` |
| Asset sin Version | 0 | — |
| Error sin UI | 0 | — |
| Sin retry | 9 | `transformObject`, `materialProperties`, `composeScene`, `cameras`, `lights`, `sceneBackground`, `beforeAfter`, `sendToSlicer`, `externalTools` |
| Sin cancelación (hay trabajo y no se puede pedir parar) | 16 | `concept`, `multiview`, `styleReference`, `anotherVersion`, `tileableTexture`, `skybox360`, `presentationVideo`, `restyleSpace`, `editImage`, `removeBackground`, `upscale`, `inpaintImage`, `sketchToImage`, `imageFor3d`, `designAgent`, `costConfirmation` |
| Cancelación pedida sin confirmación del Job Engine | 41 | `model3dFromText`, `batchTo3d`, `generateScene`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `editModel`, `optimizeMesh`, `splitParts`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `meshToCad`, `texture`, `retouchRegion`, `rig`, `animate`, `motionFromText`, `pose`, `articulate`, `motionFromVideo`, `editMotion`, `photoRender`, `print3d`, `printability`, `multicolorPrint`, `printBase`, `chainToObject`, `projectDelivery`, `exportFor`, `simulationReady` |
| Operación de versión sin backend | 7 | `multiview`, `anotherVersion`, `model3dFromImage`, `editImage`, `chainToObject`, `versions`, `lineage` |

## 4. Matriz B — elegibilidad de proveedor (dato de la Línea B; no decide nada)

La capacidad es de Weë; esta tabla solo dice quién PODRÍA servirla y cómo: **API** (candidato con API), **solo web** (no integrable: NOT_ALLOWED como integración), **próximamente** y **investigación** (no son candidatos hoy). La columna «Agregada» es la que viaja a la app (sin un solo nombre), y la prueba exige que coincida con esta tabla. Estados de cada candidato: Cadena de Weë (imagen, texto y vídeo del WEË AI ENGINE) → CADENA_DE_WEE · Tripo → REQUIRES_WRITTEN_AUTHORIZATION · Meshy → REQUIRES_ENTERPRISE · Sloyd → REVIEW_REQUIRED · Seed3D 2.0 → PENDING_PROVIDER_ELIGIBILITY · Candidato de mundos del registro (3D World de Weë Studio) → REVIEW_REQUIRED · Kaedim → AVAILABLE_WITH_CONDITIONS · Stability AI (SF3D, SPAR3D) → REQUIRES_WRITTEN_AUTHORIZATION · Alpha3D → AVAILABLE_WITH_CONDITIONS · Runware (pares 3D) → AVAILABLE_WITH_CONDITIONS · 3D AI Studio → REQUIRES_WRITTEN_AUTHORIZATION · Threedium → REQUIRES_WRITTEN_AUTHORIZATION · SpAItial → REQUIRES_WRITTEN_AUTHORIZATION · Zoo (Text-to-CAD) → REQUIRES_WRITTEN_AUTHORIZATION · Adam → REQUIRES_WRITTEN_AUTHORIZATION · ShapeDiver → AVAILABLE_WITH_CONDITIONS · Shapeways → AVAILABLE_WITH_CONDITIONS · Slant 3D → AVAILABLE_WITH_CONDITIONS · Anything World → REQUIRES_WRITTEN_AUTHORIZATION · DeepMotion → REQUIRES_WRITTEN_AUTHORIZATION · Move.ai → REQUIRES_WRITTEN_AUTHORIZATION · Uthana → AVAILABLE_WITH_CONDITIONS · QuickMagic → AVAILABLE_WITH_CONDITIONS · Cartwheel → REQUIRES_WRITTEN_AUTHORIZATION · Avatar SDK → AVAILABLE_WITH_CONDITIONS · World Labs (Marble) → AVAILABLE_WITH_CONDITIONS · Blockade (Skybox AI) → REQUIRES_WRITTEN_AUTHORIZATION · Scenario → AVAILABLE_WITH_CONDITIONS · Adobe Substance 3D API → UNKNOWN_ELIGIBILITY · fal (pares 3D de socios) → UNKNOWN_ELIGIBILITY · Replicate (pares 3D) → UNKNOWN_ELIGIBILITY · BytePlus ModelArk (3D) → REQUIRES_WRITTEN_AUTHORIZATION · WaveSpeedAI → REQUIRES_WRITTEN_AUTHORIZATION · Segmind → REQUIRES_WRITTEN_AUTHORIZATION · NVIDIA (NIM) → REQUIRES_PARTNER.

| Capability | Ejecuta | Agregada | Weë | Tripo | Meshy | Sloyd | Seed3D | Mundo (Weë Studio) | Otros con API (r3–r5) | Autoalojables (r4, no candidatos hoy) | Nota |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 · `concept` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C02 · `multiview` | Motor (el Router elige) | `cadena_de_wee` | API | API | API | — | — | — | — | — |  |
| C03 · `model3dFromText` | Motor (el Router elige) | `en_revision` | — | API | API | API | — | — | Alpha3D, Runware (pares 3D), 3D AI Studio, Threedium, Anything World, fal (pares 3D de socios), WaveSpeedAI, NVIDIA (NIM) | — | Seed3D 2.0: UNKNOWN (contradicción C1 de su informe); no cuenta como candidato. |
| C06 · `styleReference` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C12 · `anotherVersion` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C37 · `batchTo3d` | Motor (el Router elige) | `en_revision` | — | API | API | API | API | — | — | — |  |
| C41 · `generateScene` | Motor (el Router elige) | `en_revision` | — | — | solo web | solo web | investigación | — | SpAItial, World Labs (Marble), Scenario | MIDI-3D |  |
| C08 · `model3dFromImage` | Motor (el Router elige) | `en_revision` | — | API | API | API | API | — | Kaedim, Stability AI (SF3D, SPAR3D), Alpha3D, Runware (pares 3D), 3D AI Studio, Threedium, Anything World, fal (pares 3D de socios), Replicate (pares 3D), BytePlus ModelArk (3D), WaveSpeedAI, Segmind, NVIDIA (NIM) | TRELLIS / TRELLIS.2, Hunyuan3D 2.x (territorial), SF3D / SPAR3D, TripoSG, Step1X-3D, Direct3D-S2, Hi3DGen |  |
| C09 · `model3dFromViews` | Motor (el Router elige) | `en_revision` | — | API | API | API | — | — | Kaedim, Alpha3D, Runware (pares 3D), 3D AI Studio, fal (pares 3D de socios), Replicate (pares 3D), WaveSpeedAI, Segmind | — |  |
| C75 · `reconstructObject` | Motor (el Router elige) | `en_revision` | — | API | API | API | API | — | Runware (pares 3D), fal (pares 3D de socios), WaveSpeedAI, Segmind | SAM 3D Objects |  |
| C76 · `generateInParts` | Motor (el Router elige) | `requiere_acuerdo` | — | — | solo web | — | investigación | — | 3D AI Studio | — |  |
| C81 · `regenerate3d` | Motor (el Router elige) | `en_revision` | — | API | API | API | — | — | — | — |  |
| C82 · `variations3d` | Motor (el Router elige) | `requiere_acuerdo` | — | — | API | — | — | — | — | — |  |
| C88 · `parametricTemplate` | Motor (el Router elige) | `en_revision` | — | — | — | solo web | — | — | ShapeDiver | — |  |
| C94 · `cadFromText` | Motor (el Router elige) | `requiere_acuerdo` | — | — | — | — | — | — | Zoo (Text-to-CAD), Adam | CADAM (GPL-3.0; OpenSCAD → STL/DXF) |  |
| C95 · `cadFromImage` | Motor (el Router elige) | `sin_candidato` | — | — | — | — | — | — | — | — |  |
| C106 · `customStyle3d` | Motor (el Router elige) | `en_revision` | — | — | — | — | — | — | fal (pares 3D de socios), Scenario | — |  |
| C107 · `searchModelLibrary` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C72 · `gaussianSplat` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C15 · `editModel` | Motor (el Router elige) | `requiere_acuerdo` | — | API | API | solo web | — | — | Zoo (Text-to-CAD), Adam | — |  |
| C17 · `optimizeMesh` | Motor (el Router elige) | `en_revision` | — | API | API | — | — | — | Kaedim, Stability AI (SF3D, SPAR3D), Alpha3D, Runware (pares 3D), 3D AI Studio, Threedium, fal (pares 3D de socios), Avatar SDK | cumesh / xatlas, SF3D remesh |  |
| C18 · `splitParts` | Motor (el Router elige) | `en_revision` | — | API | API | API | investigación | — | Alpha3D, Runware (pares 3D), 3D AI Studio, Threedium, fal (pares 3D de socios) | Hunyuan3D-Part, HoloPart, PartCrafter |  |
| C19 · `realScale` | Motor (el Router elige) | `en_revision` | — | API | API | — | — | — | Kaedim, World Labs (Marble) | — |  |
| C20 · `stylize` | Motor (el Router elige) | `requiere_acuerdo` | — | API | API | — | — | — | fal (pares 3D de socios) | — |  |
| C42 · `mergeParts` | Motor (el Router elige) | `sin_candidato` | — | — | — | — | — | — | — | — |  |
| C43 · `repairMesh` | Motor (el Router elige) | `requiere_acuerdo` | — | — | API | — | — | — | 3D AI Studio | — |  |
| C44 · `transformObject` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C80 · `refineModel` | Motor (el Router elige) | `requiere_acuerdo` | — | API | API | — | — | — | — | — |  |
| C86 · `parametricAdjust` | Motor (el Router elige) | `en_revision` | — | — | — | solo web | — | — | ShapeDiver | — |  |
| C96 · `meshToCad` | Motor (el Router elige) | `sin_candidato` | — | — | — | — | — | — | — | — |  |
| C97 · `measureModel` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C16 · `texture` | Motor (el Router elige) | `en_revision` | — | API | API | API | — | — | Kaedim, Alpha3D, Runware (pares 3D), 3D AI Studio, fal (pares 3D de socios) | TRELLIS.2, Hunyuan Paint, MV-Adapter, Step1X-3D |  |
| C38 · `retouchRegion` | Motor (el Router elige) | `requiere_acuerdo` | — | API | API | solo web | — | — | — | — |  |
| C45 · `unwrapUv` | Motor (el Router elige) | `en_revision` | — | — | API | — | — | — | Kaedim, Alpha3D | — |  |
| C46 · `materialProperties` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C90 · `paintTexture` | Weë (sin IA) | `no_aplica` | — | — | solo web | solo web | — | — | — | — |  |
| C92 · `tileableTexture` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C21 · `rig` | Motor (el Router elige) | `en_revision` | — | API | API | próximamente | — | — | Kaedim, Alpha3D, Threedium, Anything World, Uthana, Cartwheel, Avatar SDK, fal (pares 3D de socios) | UniRig, SkinTokens, MagicArticulate |  |
| C22 · `animate` | Motor (el Router elige) | `en_revision` | — | API | API | próximamente | — | — | Anything World, DeepMotion, Uthana, QuickMagic, Cartwheel, fal (pares 3D de socios) | — |  |
| C23 · `motionFromText` | Motor (el Router elige) | `en_revision` | — | — | API | próximamente | — | — | Uthana, Cartwheel, fal (pares 3D de socios) | HY-Motion |  |
| C47 · `pose` | Motor (el Router elige) | `en_revision` | — | — | API | API | — | — | DeepMotion | — | Como ajuste al crear (pose en A o en T), no como operación suelta. |
| C77 · `articulate` | Motor (el Router elige) | `sin_candidato` | — | — | — | — | investigación | — | — | — |  |
| C98 · `motionFromVideo` | Motor (el Router elige) | `en_revision` | — | — | — | — | — | — | DeepMotion, Move.ai, Uthana, QuickMagic, Cartwheel | — |  |
| C99 · `editMotion` | Motor (el Router elige) | `en_revision` | — | — | — | — | — | — | Uthana | — |  |
| C100 · `avatarFromPhoto` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C101 · `lipSync` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C93 · `platformAvatar` | — | `no_aplica` | — | — | — | solo web | — | — | — | — |  |
| C24 · `composeScene` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C25 · `cameras` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C26 · `lights` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C05 · `environment` | Motor (el Router elige) | `en_revision` | — | — | — | — | — | API | SpAItial, World Labs (Marble), Scenario, fal (pares 3D de socios) | HY-World 2.0 (territorial), Lyra 1.0 |  |
| C48 · `sceneBackground` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C87 · `skybox360` | Motor (el Router elige) | `en_revision` | — | — | — | API | — | — | SpAItial, World Labs (Marble), Blockade (Skybox AI), fal (pares 3D de socios) | — | Es una panorámica de 360°, NO un mundo explorable (`world.generate`). |
| C102 · `editWorld` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C103 · `interactiveWorldVideo` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C104 · `cameraTrackFromVideo` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C79 · `objectStructure` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C27 · `viewer` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C28 · `viewModes` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C04 · `photoRender` | Motor (el Router elige) | `requiere_acuerdo` | — | — | — | solo web | — | — | Adobe Substance 3D API, 3D AI Studio | — |  |
| C49 · `snapshot3d` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C50 · `turntable` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C89 · `spriteSheet` | Weë (sin IA) | `no_aplica` | — | — | — | solo web | — | — | — | — |  |
| C10 · `presentationVideo` | Motor (el Router elige) | `cadena_de_wee` | API | — | solo web | — | — | — | — | — |  |
| C29 · `beforeAfter` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C32 · `print3d` | Motor (el Router elige) | `requiere_acuerdo` | — | API | API | solo web | — | — | Zoo (Text-to-CAD), 3D AI Studio | — |  |
| C51 · `printability` | Motor (el Router elige) | `en_revision` | — | — | API | solo web | — | — | Shapeways, Slant 3D | — |  |
| C52 · `multicolorPrint` | Motor (el Router elige) | `requiere_acuerdo` | — | API | API | solo web | — | — | fal (pares 3D de socios) | — |  |
| C91 · `printBase` | Motor (el Router elige) | `requiere_acuerdo` | — | — | API | solo web | — | — | — | — | El candidato lo ofrece como producto imprimible (llavero, figura…) por API; la base suelta solo en su web. |
| C53 · `sendToSlicer` | Otro programa | `no_aplica` | — | solo web | solo web | solo web | — | — | — | PrusaSlicer, CuraEngine, OrcaSlicer (AGPL) |  |
| C71 · `physicalProduct` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C07 · `restyleSpace` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C11 · `editImage` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C13 · `removeBackground` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C14 · `upscale` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C39 · `inpaintImage` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C40 · `sketchToImage` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C83 · `imageFor3d` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | Hunyuan Delight |  |
| C105 · `depthFromImage` | Motor (el Router elige) | `requiere_acuerdo` | — | — | — | — | — | — | Blockade (Skybox AI) | Depth Anything 3 (modelos Apache) |  |
| C54 · `designAgent` | Motor (el Router elige) | `cadena_de_wee` | API | — | — | — | — | — | — | — |  |
| C55 · `contextualSuggestions` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C56 · `capabilityDiscovery` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C57 · `costConfirmation` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C74 · `providerAgent` | — | `no_aplica` | — | — | solo web | — | — | — | — | — |  |
| C84 · `chainToObject` | Motor (el Router elige) | `en_revision` | — | API | API | API | API | — | Alpha3D, 3D AI Studio | — | Sus candidatos son los de su eslabón 3D, que es el que la bloquea; los de imagen son la cadena de Weë. |
| C85 · `externalAgents` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C58 · `assetBrowser` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C36 · `versions` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C59 · `lineage` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C60 · `reuseAsset` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C61 · `favorites` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C62 · `searchAssets` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C63 · `filterAssets` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C35 · `importModel` | Weë (sin IA) | `no_aplica` | — | — | — | próximamente | — | — | — | — |  |
| C34 · `saveToProject` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C73 · `remixPublicModel` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C64 · `createProject` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C65 · `switchProject` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C66 · `projectHistory` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C67 · `projectFolders` | — | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C68 · `projectSnapshot` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C69 · `projectDelivery` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C30 · `download` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C31 · `exportFor` | Motor (el Router elige) | `sin_candidato` | — | — | — | solo web | — | — | — | — | Tripo y Meshy convierten por API, y Seed3D elige el formato al crear; DEC-20 (propuesta) deja la conversión en Weë para que el resultado no dependa de quién hizo el modelo. |
| C33 · `publish` | Weë (sin IA) | `no_aplica` | — | — | — | — | — | — | — | — |  |
| C70 · `externalTools` | Otro programa | `no_aplica` | — | solo web | solo web | solo web | — | — | — | — |  |
| C78 · `simulationReady` | Motor (el Router elige) | `en_revision` | — | — | — | — | investigación | — | SpAItial, World Labs (Marble) | — |  |

## 5. MODEL-AGNOSTIC CHAINING — de la imagen al objeto sin salir de Weë Design

Lo que sale de un eslabón entra en el siguiente como MATERIAL de Weë, por referencia y con su linaje; nunca como un archivo descargado y vuelto a subir. La imagen es la capacidad de imagen que Weë ya tiene (el WEË AI ENGINE elige el modelo); ningún eslabón nombra a nadie. Detalle: `docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md` §11.

| Eslabón | Capacidad | Alternativas | Entra | Sale | Operación (Content Core) | Opcional | Clase hoy | Le falta para encadenarse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Imagen | `concept` | `imageFor3d`, `sketchToImage` | Palabras | Imagen | `crear` | No | **EXISTING** | — |
| Retocar la imagen | `editImage` | `removeBackground`, `upscale`, `inpaintImage` | Imagen | Imagen | `editar` | Sí | **PARTIAL** | recibir un material de Weë como entrada; guardar de dónde sale |
| Vistas del objeto | `multiview` | — | Imagen | Imagen | `derivar` | Sí | **BACKEND_REQUIRED** | la variante en el motor; recibir un material de Weë como entrada; guardar de dónde sale |
| 3D | `model3dFromImage` | `model3dFromViews`, `reconstructObject` | Imagen | 3D | `derivar` | No | **PROVIDER_REQUIRED** | alguien que lo haga; guardar de dónde sale |
| Materiales | `texture` | `retouchRegion` | 3D | 3D | `editar` | Sí | **PROVIDER_REQUIRED** | alguien que lo haga; guardar de dónde sale |
| Entregar | `exportFor` | `download`, `externalTools` | 3D | Archivo | `convertir_formato` | No | **BACKEND_REQUIRED** | un conversor de formatos |

La cadena, simulada de punta a punta (`recorrerCadena`): cada resultado entra en el siguiente y queda en su linaje.

| Paso | Material | Trabajo | Viene de | Relación | Linaje |
| --- | --- | --- | --- | --- | --- |
| 1 | `sim-concept-1` | `sim-job-concept-1` | — | nuevo | concept |
| 2 | `sim-editImage-2` | `sim-job-editImage-2` | `sim-concept-1` | version | concept › editImage |
| 3 | `sim-multiview-3` | `sim-job-multiview-3` | `sim-editImage-2` | derivado | concept › editImage › multiview |
| 4 | `sim-model3dFromImage-4` | `sim-job-model3dFromImage-4` | `sim-multiview-3` | derivado | concept › editImage › multiview › model3dFromImage |
| 5 | `sim-texture-5` | `sim-job-texture-5` | `sim-model3dFromImage-4` | version | concept › editImage › multiview › model3dFromImage › texture |
| 6 | `sim-exportFor-6` | `sim-job-exportFor-6` | `sim-texture-5` | variante | concept › editImage › multiview › model3dFromImage › texture › exportFor |

## 5b. Capacidades 3D — una sola fuente

Las del catálogo del Core de categoría `3d` (filtradas de `CAPABILITY_CATALOG`, no copiadas) más las propuestas del registro de Design. La clase se DERIVA del estado del catálogo y de las filas que la usan (`clasificar3D`). La lista tipada del Core (`CapabilityId`) solo nombra `world.generate`: las `3d.*` no se añaden porque las haría enrutables sin adaptador (cambiaría producción).

| Capacidad | En el catálogo | Clase | Filas de Design |
| --- | --- | --- | --- |
| `3d.generate` | DECLARED | **PENDING_PROVIDER** | `model3dFromText`, `batchTo3d`, `model3dFromImage`, `model3dFromViews`, `reconstructObject`, `generateInParts`, `regenerate3d`, `variations3d`, `parametricTemplate`, `cadFromText`, `cadFromImage`, `customStyle3d`, `pose`, `chainToObject` |
| `3d.edit` | DECLARED | **PENDING_PROVIDER** | `editModel`, `realScale`, `stylize`, `mergeParts`, `repairMesh`, `refineModel`, `parametricAdjust`, `unwrapUv`, `print3d`, `printBase` |
| `3d.analyze` | DECLARED | **PENDING_PROVIDER** | `print3d`, `printability` |
| `3d.texture` | DECLARED | **PENDING_PROVIDER** | `texture`, `retouchRegion` |
| `3d.retopology` | DECLARED | **PENDING_PROVIDER** | `optimizeMesh` |
| `3d.rig` | DECLARED | **PENDING_PROVIDER** | `rig`, `articulate` |
| `3d.convert` | DECLARED | **PENDING_BACKEND** | `meshToCad`, `print3d`, `exportFor` |
| `3d.export` | DECLARED | **PENDING_BACKEND** | `multicolorPrint`, `exportFor`, `simulationReady` |
| `world.generate` | ROUTABLE | **PARCIAL** | `environment` |
| `3d.segment` | no (propuesta) | **CANDIDATA** | `splitParts`, `print3d` |
| `3d.animate` | no (propuesta) | **CANDIDATA** | `animate`, `motionFromText`, `motionFromVideo`, `editMotion` |

Capacidades distintas, no alias (`SEMANTICA_3D`): `3d.convert` = representacion · `3d.export` = salida_externa · `3d.generate` = recurso_nuevo · `3d.segment` = dividir_existente. No son capacidades (atributo de la fila): `cad`, `parts`. Composiciones (cadena, no alias): `exportFor` = 3d.convert → 3d.export.

| Capacidad | Catalogada | Implementada | Enrutable |
| --- | --- | --- | --- |
| `3d.generate` | Sí | No | No |
| `3d.edit` | Sí | No | No |
| `3d.analyze` | Sí | No | No |
| `3d.texture` | Sí | No | No |
| `3d.retopology` | Sí | No | No |
| `3d.rig` | Sí | No | No |
| `3d.convert` | Sí | No | No |
| `3d.export` | Sí | No | No |
| `world.generate` | Sí | Sí (apagada) | Sí |
| `3d.segment` | No | No | No |
| `3d.animate` | No | No | No |

## 5c. Contrato 3D de Design

Design Capability → parámetros → capacidad del Core → Job → resultado → Asset → Version. Sin APIs externas; nada marcado como implementado. Exportación GLB/USDZ: **PENDING_BACKEND** (sin exportador en el Core; se reutiliza `download`).

| Contrato | Fila | Capacidad del Core | Parámetros | Job | Resultado | Asset | Version | Clase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| imagenA3D | `model3dFromImage` | `3d.generate` | text, image, requestId | Trabajo asíncrono (motor) | 3D | Derivado | material_derivado | **PENDING_PROVIDER** |
| textoA3D | `model3dFromText` | `3d.generate` | text, image, requestId | Trabajo asíncrono (motor) | 3D | Nuevo | nuevo | **PENDING_PROVIDER** |
| variasImagenesA3D | `model3dFromViews` | `3d.generate` | text, image, requestId | Trabajo asíncrono (motor) | 3D | Derivado | material_derivado | **PENDING_PROVIDER** |
| textura | `texture` | `3d.texture` | image, text, requestId | Trabajo asíncrono (motor) | 3D | Versión | nueva_version | **PENDING_PROVIDER** |
| material | `materialProperties` | — (Weë, sin IA) | requestId | Núcleo de escena (Weë) | Escena | Ninguno | ninguno | **WEE_SIN_IA** |
| remallado | `optimizeMesh` | `3d.retopology` | image, requestId | Trabajo asíncrono (motor) | 3D | Versión | nueva_version | **PENDING_PROVIDER** |
| escena | `environment` | `world.generate` | image, text, requestId | Trabajo asíncrono (motor) | Mundo 3D | Nuevo | nuevo | **PARCIAL** |
| visualizacion | `photoRender` | `render.product` | image, text, requestId | Trabajo asíncrono (motor) | Imagen | Derivado | material_derivado | **PENDING_PROVIDER** |
| exportacion | `exportFor` | `3d.convert` | image, requestId | Trabajo asíncrono (motor) | Archivo | Variante | variante | **PENDING_BACKEND** |

## 6. Seed3D 2.0 — inventario funcional → capacidades de Weë

Fuente: `scratchpad/linea-b/seed3d.md` §2 (Línea B). Estado del candidato: PENDING PROVIDER ELIGIBILITY (Línea B: restrictiva). Ciclo: Asíncrono con SOLO sondeo (sin webhook); cancelar SOLO en cola; de varios a más de diez minutos; el ZIP caduca a las 24 h; RPM 300 y 5 a la vez (las demás esperan en cola); sin clave de idempotencia; estados queued/running/succeeded/failed/cancelled (+ expired en DELETE).

| # | Capacidad (fuente) | Clase | Capacidades de Weë |
| --- | --- | --- | --- |
| A | Imagen → 3D (1 imagen) | **CONFIRMED** | `model3dFromImage`, `batchTo3d`, `chainToObject` |
| B | Texto → 3D | **UNKNOWN** | `model3dFromText` |
| C | Varias imágenes → 3D | **NOT_AVAILABLE** | `model3dFromViews` |
| D | Reconstrucción de un objeto (foto → 3D) | **PARTIALLY_CONFIRMED** | `reconstructObject` |
| E | Geometría | **CONFIRMED** | `model3dFromImage` |
| F | Materiales | **CONFIRMED** | `model3dFromImage` |
| G | PBR | **CONFIRMED** | `model3dFromImage` |
| H | Textura (al generar) | **CONFIRMED** | `model3dFromImage` |
| I | Texturizar una malla existente | **NOT_AVAILABLE** | `texture` |
| J | Descomposición en partes | **PARTIALLY_CONFIRMED** | `splitParts`, `generateInParts` |
| K | Completar partes | **PARTIALLY_CONFIRMED** | `generateInParts` |
| L | Articulación (URDF) | **PARTIALLY_CONFIRMED** | `articulate` |
| M | Juntas (datos de articulación) | **PARTIALLY_CONFIRMED** | `articulate` |
| M′ | Rig de personaje | **UNKNOWN** | `rig` |
| N | Salida para simulación (URDF, masa, fricción) | **PARTIALLY_CONFIRMED** | `simulationReady` |
| O | Estructura y composición de escena | **PARTIALLY_CONFIRMED** | `generateScene` |
| P | Formatos al crear (glb, obj, usd, usdz en ZIP) | **CONFIRMED** | `exportFor`, `download` |
| P′ | Convertir un activo existente | **NOT_AVAILABLE** | `exportFor` |
| Q | Refinar un activo existente | **NOT_AVAILABLE** | `refineModel` |
| R | Regenerar | **UNKNOWN** | `regenerate3d` |
| S | Variaciones | **NOT_AVAILABLE** | `variations3d` |
| T1 | Densidad de malla (100k / 500k / 1M caras) | **CONFIRMED** | `model3dFromImage` |
| T2 | Entrega en ZIP | **CONFIRMED** | `model3dFromImage` |
| T3 | Escena → objetos articulados | **PARTIALLY_CONFIRMED** | `generateScene`, `articulate` |
| T4 | Malla sin textura | **NOT_AVAILABLE** | `model3dFromImage` |

## 7. Sloyd — inventario funcional → capacidades de Weë

Fuente: `scratchpad/linea-b/sloyd.md` §3 y §10 (Línea B). Estado del candidato: REVIEW_REQUIRED (Línea B). Ciclo: Asíncrono con SOLO sondeo (sin webhook); SIN cancelación, listado ni idempotencia; cobra al empezar y reembolsa si falla; 5 a la vez por clave; el GLB queda en una URL pública y predecible.

| # | Capacidad (fuente) | API | Capacidades de Weë |
| --- | --- | --- | --- |
| SL1 | Texto → 3D | Sí | `model3dFromText` |
| SL2 | Imagen → 3D | Sí | `model3dFromImage`, `reconstructObject`, `batchTo3d`, `chainToObject` |
| SL3 | Varias imágenes → 3D | Sí | `model3dFromViews` |
| SL4 | Subir una imagen para reutilizarla | Sí | — |
| SL5 | Re-texturizar | Sí | `texture` |
| SL6 | Separar en partes | Sí | `splitParts` |
| SL7 | Estilos y pose en T | Sí | `pose` |
| SL8 | Texto → imagen | Sí | — |
| SL9 | Editar imagen | Sí | — |
| SL10 | Fondo de 360° desde texto | Sí | `skybox360` |
| SL11 | Fondo de 360° desde imagen | Sí | `skybox360` |
| SL12 | Editar el fondo de 360° | Sí | `skybox360` |
| SL14 | Boceto → imagen | UNKNOWN | `sketchToImage` |
| SL15 | Auto-rig | Próximamente | `rig` |
| SL16 | Animar desde texto | Próximamente | `motionFromText`, `animate` |
| SL20 | Subir un modelo 3D (con campos paramétricos) | Próximamente | `importModel` |
| SL22 | Hoja de sprites | Próximamente | `spriteSheet` |
| SL23 | Editor de plantillas paramétricas (438) | No (solo web) | `parametricTemplate`, `parametricAdjust` |
| SL25 | Escena con agente y render | No (solo web) | `generateScene`, `photoRender` |
| SL26 | Pintar la textura | No (solo web) | `paintTexture`, `retouchRegion` |
| SL27 | Impresión 3D (multicolor, bases, imprimibilidad, laminadores) | No (solo web) | `multicolorPrint`, `printBase`, `printability`, `sendToSlicer` |
| SL28 | Avatar para una plataforma de juegos | No (solo web) | `platformAvatar` |
| SL30 | Exportación multiformato por destino | No (la API solo da GLB) | `exportFor` |
| SL33 | Plugins para programas 3D | No (solo web) | `externalTools` |
| SL34 | SDK de ejecución | UNKNOWN (lista de espera) | `externalAgents` |
