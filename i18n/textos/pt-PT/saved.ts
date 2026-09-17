/*
 * Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Portugués de PORTUGAL: trato de «tu» y «guardar» —no «salvar»— para lo que se
 * aparta para después, que es como se dice de este lado del Atlántico.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Guardados',
  empty: 'Ainda não guardaste nada',
  exploreHome: 'Explorar o Home',
  loadFailed: 'Não foi possível carregar os teus Guardados',
};
