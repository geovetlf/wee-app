/*
 * PORTUGUÉS (pt-BR) — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). Son las palabras más cortas que existen en
 * portugués para cada botón, porque estas etiquetas viven en barras estrechas.
 * La flecha → de `seeAll` se copia tal cual. Apóstrofo tipográfico ’ siempre.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Cancelar',
  save: 'Salvar',
  delete: 'Excluir',
  close: 'Fechar',
  back: 'Voltar',
  next: 'Avançar',
  done: 'Pronto',
  accept: 'OK',
  send: 'Enviar',
  share: 'Compartilhar',
  retry: 'Tente de novo',
  loading: 'Carregando…',
  error: 'Erro',
  somethingWentWrong: 'Algo deu errado',
  noResults: 'Sem resultados',
  notAvailable: 'Indisponível',
  comingSoon: 'Em breve',
  new: 'Novo',
  seeAll: 'Ver todos →',
  guest: 'Convidado',
  anonymousUser: 'Usuário Anônimo',
  user: 'Usuário',
  yes: 'Sim',
  no: 'Não',
  loadMore: 'Carregar mais publicações',
  postsCount_one: '{{cantidad}} publicação',
  postsCount_other: '{{cantidad}} publicações',
};
