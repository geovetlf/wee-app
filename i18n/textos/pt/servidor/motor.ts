/*
 * PORTUGUÉS (pt-BR) — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y `archivo…`: por eso la pieza del campo lleva su
 * artículo y la frase del archivo pone el artículo ella misma («o documento», «o áudio»).
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Falta algo no seu pedido. Revise e tente de novo.',
  unauthorized: 'Entre para criar com o Weë.',
  providerError: 'A IA não conseguiu concluir sua criação desta vez. Não cobrei nada: tente de novo em instantes.',
  generationFailed: 'Não consegui terminar sua criação. Não cobrei nada: tente de novo.',
  timeout: 'Demorou demais e eu interrompi. Não cobrei nada: tente de novo.',
  rateLimited: 'Você fez muitas criações seguidas. Não cobrei nada: espere um pouco e tente de novo.',
  duplicate: 'Essa criação já está em andamento.',
  notAvailable: 'Este recurso ainda não está disponível.',
  inputRejected: 'A foto ou o vídeo não puderam ser usados para gerar: rostos reais e esse tipo de conteúdo não são aceitos. Tente com outra imagem ou descrição.',
  faltaCampo: 'Falta {{campo}}.',
  revisaCampo: 'Revise {{campo}}: precisa ter entre 1 e {{max}} caracteres.',
  campoMensaje: 'sua mensagem',
  campoDescripcionVideo: 'a descrição do vídeo',
  conversacionNoEncontrada: 'Não encontramos esta conversa.',
  sinPlan: 'Este trabalho ainda não tem plano.',
  sinUnPlan: 'Este trabalho ainda não tem um plano.',
  yaTienePlan: 'Este trabalho já tem um plano.',
  subeFoto: 'Envie uma foto para que o Weë possa trabalhar com ela.',
  trabajoNoEncontrado: 'Não encontramos este trabalho.',
  trabajoAjeno: 'Este trabalho não é seu.',
  experienciaDesconocida: 'Experiência desconhecida.',
  faltaTrabajo: 'Falta o trabalho.',
  intentoSinTiempo: 'O tempo dessa tentativa acabou e devolvi seus Credits. Você pode tentar de novo.',
  fotoDireccion: 'O endereço da foto não é válido.',
  fotoSubir: 'A foto precisa ser enviada ao Weë antes de ser usada.',
  fotoAjena: 'Essa foto não é sua.',
  archivoSube: 'Envie o {{archivo}} para que o Weë possa lê-lo.',
  archivoDireccion: 'O endereço do {{archivo}} não é válido.',
  archivoSubir: 'O {{archivo}} precisa ser enviado ao Weë antes de ser usado.',
  archivoAjeno: 'Esse {{archivo}} não é seu.',
  archivoDocumento: 'documento',
  archivoAudio: 'áudio',
  sinTiempoAntes: 'O tempo acabou antes de começar. Não cobrei nada.',
  sinProveedor: 'No momento não há uma IA disponível para isso. Tente mais tarde.',
  noDisponibleActualmente: 'Este recurso não está disponível no momento.',
  noDisponibleAhora: 'Este recurso não está disponível agora. Tente de novo daqui a pouco.',
  noDisponibleRegion: 'Este recurso não está disponível na sua região no momento.',
  noDisponiblePais: 'Para usar este recurso, informe seu país no seu Perfil Real.',
  noDisponibleOpciones: 'Este recurso não está disponível com as opções que você escolheu. Tente outras.',
  describeVideo: 'Me conte que vídeo você quer criar.',
  creacionTerminada: 'Essa criação já terminou e não é feita de novo. Procure nas suas criações.',
  tomaInvalida: 'Essa tomada não tem um formato válido.',
  planoInvalido: 'Esse plano não tem um formato válido.',
  produccionNoEncontrada: 'Não encontramos essa produção.',
  tomaNoGenerable: 'Essa tomada não pode ser gerada assim.',
  creacionNoEncontrada: 'Não encontramos essa criação.',
  debesIniciarSesion: 'Você precisa entrar',
};
