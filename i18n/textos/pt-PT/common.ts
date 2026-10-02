/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA, y no una lista de sustituciones sobre el brasileño. Se tutea
 * con «tu» y el gerundio va como se dice en Portugal: `estar a + infinitivo`,
 * por eso `loading` dice «A carregar…» y no «Carregando…». Las palabras son las
 * de aquí: «Guardar» y no «Salvar», «Eliminar» y no «Excluir», «Partilhar» y no
 * «Compartilhar», «Seguinte» y no «Avançar», «utilizador» y no «usuário»,
 * «anónimo» con ó y no «anônimo». La flecha → de `seeAll` se copia tal cual.
 * Apóstrofo tipográfico ’ siempre.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Cancelar',
  save: 'Guardar',
  delete: 'Eliminar',
  close: 'Fechar',
  back: 'Voltar',
  next: 'Seguinte',
  done: 'Pronto',
  accept: 'OK',
  send: 'Enviar',
  share: 'Partilhar',
  retry: 'Tenta de novo',
  loading: 'A carregar…',
  error: 'Erro',
  somethingWentWrong: 'Algo correu mal',
  noResults: 'Sem resultados',
  notAvailable: 'Indisponível',
  comingSoon: 'Em breve',
  new: 'Novo',
  seeAll: 'Ver todos →',
  guest: 'Convidado',
  anonymousUser: 'Utilizador Anónimo',
  user: 'Utilizador',
  yes: 'Sim',
  no: 'Não',
  loadMore: 'Carregar mais publicações',
  postsCount_one: '{{cantidad}} publicação',
  postsCount_other: '{{cantidad}} publicações',
  someone: 'Alguém',
};
