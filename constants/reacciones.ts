/**
 * LAS REACCIONES NUEVAS DEL WALL (Fuego y Risa): ACTIVAS POR DEFECTO desde 2026-11-16.
 *
 * Las reglas de Firestore de esta rama admiten los tipos de voto `fire` y `laugh` (y sus contadores `fireCount`/`laughCount`) además de
 * `agree`/`disagree`. Producción NO los admite hasta que el dueño despliegue las reglas (`--project prod`). INTERRUPTOR: mientras eso no haya
 * pasado, construir el cliente con EXPO_PUBLIC_REACCIONES_NUEVAS=0 apaga los dos botones (no se pinta nada). Si se dejan encendidos contra unas
 * reglas que no los admiten, el voto se rechaza y el botón vuelve a su estado anterior en silencio (sin error técnico).
 * El 👎 ya no se muestra, pero sus votos guardados no se tocan ni se borran.
 */
export const REACCIONES_NUEVAS_EN_LA_UI: boolean = process.env.EXPO_PUBLIC_REACCIONES_NUEVAS !== '0';
