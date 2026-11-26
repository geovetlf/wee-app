# Registro de auditoría de idiomas

2026-10-30. Worktree `wt-i18n-40`, rama `i18n/40-idiomas`, base `644d147e`. Sin commit.

## Defectos corregidos

| Defecto | Dónde | Corrección |
|---|---|---|
| Fechas «M09 10» en jemer e irlandés | `i18n/formato.ts` | Chrome no tiene esos nombres de mes: pasa a mes en cifras. Visto en captura de jemer |
| Pregunta de encuesta con el signo descolocado en RTL | `components/Poll.tsx` | Es texto de persona: usa `TEXTO_DE_PERSONA`. **No se ha vuelto a mirar en captura** |
| 36 idiomas caían al inglés en textos del servidor | `i18n/textos/<código>/servidor/` | Sección completa: 745 claves |
| El serbio latino no generaba subcarpetas | `scripts/i18n-sr-latn.mjs` | Generador recursivo; `publica.codigo` propio |
| `tl-PH` no llegaba al filipino en el servidor | `functions/src/shared/idiomaDelServidor.ts` | Alias |
| Filipino sobre una base antigua | `i18n/textos/fil/` | 44 claves añadidas, 33 retiradas |
| Auditorías incompletas | `ro`, `km`, `ga`, `nb`, `mn`, `de-CH` | Filas revisadas; registros en `auditoria/` |

## Cambios de expectativas en pruebas

Se tocaron porque la realidad cambió. Ninguna se debilitó para ocultar un fallo.

- **22 suites de idioma:** decían «sin sección de servidor». Ahora la exigen.
- **Cuentas de diccionarios:** de 16 a 40.
- **`i18n-danes` 5b:** un noruego ya recibe noruego, no inglés.
- **`i18n-permisos-ios` D3:** bs, hr, cnr y sr-Latn pueden coincidir en una frase porque son normas de una lengua común.
- **`i18n-marcas` 11 y `i18n-servidor-fuentes` 20:** coincidir con el español no es un error si el idioma declara esa palabra («Foto única» en portugués, «Robot» en francés). Lo copiado por descuido lo vigila la suite nueva.
- **`i18n-auditoria` 17:** el idioma sin sección pasa a ser uno que no existe en Weë.
- **`i18n-filipino`:** las comprobaciones de otra línea, adaptadas. Hay que restaurarlas al integrarla.

## Pruebas

`i18n-servidor-idiomas.test.mjs` es nueva y cubre los 39 idiomas con sección. El resultado de la cadena completa está en `_auditoria-2026-10-30/i18n40-cadena.txt`.

## Limitaciones

- **Peso:** el paquete web pasa de 3,3 MB a 5,1 MB comprimido, 20,2 MB sin comprimir. Hay que hacer carga diferida antes de publicar los 40.
- **Marcador de día en CJK:** `diaPalabra` y `presupuestoPalabra` usan `\b` y `\s+\d+`, que no casan con chino, japonés ni coreano. El itinerario no se pliega si el modelo no copia la marca. Es del código y sigue sin corregir.
- **Fashion Composer:** sus 92 claves no están aquí porque esa rama no se ha integrado.
- **Propuestas del informe global** que piden decisión del dueño: siguen sin aplicar.
