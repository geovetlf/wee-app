/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y `archivo…`: por eso la pieza del campo lleva su
 * artículo y la frase del archivo pone el artículo ella misma («o documento», «o áudio»).
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Falta algo no teu pedido. Revê-o e tenta de novo.',
  unauthorized: 'Inicia sessão para criares com o Weë.',
  providerError: 'Desta vez a IA não conseguiu concluir a tua criação. Não te cobrei nada: tenta de novo daqui a pouco.',
  generationFailed: 'Não consegui terminar a tua criação. Não te cobrei nada: tenta de novo.',
  timeout: 'Estava a demorar demasiado e interrompi. Não te cobrei nada: tenta de novo.',
  rateLimited: 'Fizeste muitas criações seguidas. Não te cobrei nada: espera um pouco e tenta de novo.',
  duplicate: 'Essa criação já está em curso.',
  notAvailable: 'Esta funcionalidade ainda não está disponível.',
  inputRejected: 'A foto ou o vídeo não puderam ser usados: não são aceites rostos reais nem este tipo de conteúdo. Tenta com outra imagem ou outra descrição.',
  faltaCampo: 'Falta {{campo}}.',
  revisaCampo: 'Revê {{campo}}: tem de ter entre 1 e {{max}} caracteres.',
  campoMensaje: 'a tua mensagem',
  campoDescripcionVideo: 'a descrição do vídeo',
  conversacionNoEncontrada: 'Não encontrámos esta conversa.',
  sinPlan: 'Este trabalho ainda não tem plano.',
  sinUnPlan: 'Este trabalho ainda não tem um plano.',
  yaTienePlan: 'Este trabalho já tem um plano.',
  subeFoto: 'Carrega uma foto para o Weë poder trabalhar com ela.',
  trabajoNoEncontrado: 'Não encontrámos este trabalho.',
  trabajoAjeno: 'Este trabalho não é teu.',
  experienciaDesconocida: 'Experiência desconhecida.',
  faltaTrabajo: 'Falta o trabalho.',
  intentoSinTiempo: 'O tempo dessa tentativa acabou e devolvi-te os Credits. Podes tentar de novo.',
  fotoDireccion: 'O endereço da foto não é válido.',
  fotoSubir: 'É preciso carregar a foto no Weë para a poder usar.',
  fotoAjena: 'Essa foto não é tua.',
  archivoSube: 'Carrega o {{archivo}} para o Weë o poder ler.',
  archivoDireccion: 'O endereço do {{archivo}} não é válido.',
  archivoSubir: 'É preciso carregar o {{archivo}} no Weë para o poder usar.',
  archivoAjeno: 'Esse {{archivo}} não é teu.',
  archivoDocumento: 'documento',
  archivoAudio: 'áudio',
  sinTiempoAntes: 'O tempo acabou antes de começar. Não te cobrei nada.',
  sinProveedor: 'De momento não há nenhuma IA disponível para isto. Tenta mais tarde.',
  noDisponibleActualmente: 'Esta funcionalidade não está disponível de momento.',
  noDisponibleAhora: 'Esta funcionalidade não está disponível agora. Tenta de novo daqui a pouco.',
  noDisponibleRegion: 'Esta funcionalidade não está disponível na tua região de momento.',
  noDisponiblePais: 'Para usares esta funcionalidade, indica o teu país no teu Perfil Real.',
  noDisponibleOpciones: 'Esta funcionalidade não está disponível com as opções que escolheste. Experimenta outras.',
  describeVideo: 'Diz-me que vídeo queres criar.',
  creacionTerminada: 'Essa criação já terminou e não volta a ser feita. Procura-a nas tuas criações.',
  tomaInvalida: 'Essa tomada não tem um formato válido.',
  planoInvalido: 'Esse plano não tem um formato válido.',
  produccionNoEncontrada: 'Não encontrámos essa produção.',
  tomaNoGenerable: 'Essa tomada não pode ser gerada assim.',
  creacionNoEncontrada: 'Não encontrámos essa criação.',
  debesIniciarSesion: 'Tens de iniciar sessão',
};
