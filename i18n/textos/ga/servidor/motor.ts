/*
 * IRLANDÉS — Los errores controlados del servidor de Weë AI y Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se rellenan con las piezas `campo…` y `archivo…`. Las de archivo son masculinas y van en
 * nominativo detrás de «an», así que no mutan; donde el genitivo sería obligatorio, el hueco va detrás de dos puntos.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Tá rud éigin in easnamh ar d\'iarratas. Seiceáil é agus bain triail eile as.',
  unauthorized: 'Logáil isteach chun cruthú le Weë.',
  providerError: 'Níorbh fhéidir leis an IS do chruthú a chríochnú an uair seo. Níor ghearr mé tada ort: bain triail eile as i gceann tamaill.',
  generationFailed: 'Níor éirigh liom do chruthú a chríochnú. Níor ghearr mé tada ort: bain triail eile as.',
  timeout: 'Thóg sé rófhada agus stop mé é. Níor ghearr mé tada ort: bain triail eile as.',
  rateLimited: 'Rinne tú a lán cruthuithe i ndiaidh a chéile. Níor ghearr mé tada ort: fan nóiméad agus bain triail eile as.',
  duplicate: 'Tá an cruthú sin ar siúl cheana.',
  notAvailable: 'Níl an ghné seo ar fáil fós.',
  inputRejected: 'Níorbh fhéidir an grianghraf nó an físeán a úsáid chun giniúint: ní ghlactar le fíoraghaidheanna ná leis an ábhar sin. Bain triail as íomhá nó cur síos eile.',
  faltaCampo: 'Tá {{campo}} in easnamh.',
  revisaCampo: 'Seiceáil {{campo}}: idir 1 agus {{max}} carachtar.',
  campoMensaje: 'do theachtaireacht',
  campoDescripcionVideo: 'cur síos an fhíseáin',
  conversacionNoEncontrada: 'Níor aimsíomar an comhrá seo.',
  sinPlan: 'Níl plean ag an tasc seo fós.',
  sinUnPlan: 'Níl plean déanta don tasc seo fós.',
  yaTienePlan: 'Tá plean ag an tasc seo cheana.',
  subeFoto: 'Uaslódáil grianghraf ionas gur féidir le Weë oibriú leis.',
  trabajoNoEncontrado: 'Níor aimsíomar an tasc seo.',
  trabajoAjeno: 'Ní leatsa an tasc seo.',
  experienciaDesconocida: 'Eispéireas anaithnid.',
  faltaTrabajo: 'Tá an tasc in easnamh.',
  intentoSinTiempo: 'Rith an t-am amach ar an iarracht sin agus thug mé do Credits ar ais duit. Is féidir leat triail eile a bhaint as.',
  fotoDireccion: 'Níl seoladh an ghrianghraif bailí.',
  fotoSubir: 'Ní mór an grianghraf a uaslódáil go Weë sula n-úsáidtear é.',
  fotoAjena: 'Ní leatsa an grianghraf sin.',
  archivoSube: 'Uaslódáil an {{archivo}} ionas gur féidir le Weë é a léamh.',
  archivoDireccion: 'Níl an seoladh bailí: {{archivo}}.',
  archivoSubir: 'Ní mór an {{archivo}} a uaslódáil go Weë sula n-úsáidtear é.',
  archivoAjeno: 'Ní leatsa an {{archivo}} sin.',
  archivoDocumento: 'doiciméad',
  archivoAudio: 'comhad fuaime',
  sinTiempoAntes: 'Rith an t-am amach air seo sular thosaigh sé. Níor ghearr mé tada ort.',
  sinProveedor: 'Níl IS ar fáil dó seo faoi láthair. Bain triail eile as ar ball.',
  noDisponibleActualmente: 'Níl an ghné seo ar fáil faoi láthair.',
  noDisponibleAhora: 'Níl an ghné seo ar fáil an nóiméad seo. Bain triail eile as i gceann tamaill.',
  noDisponibleRegion: 'Níl an ghné seo ar fáil i do réigiún faoi láthair.',
  noDisponiblePais: 'Chun an ghné seo a úsáid, cuir do thír isteach i d\'Fhíorphróifíl.',
  noDisponibleOpciones: 'Níl an ghné seo ar fáil leis na roghanna a rinne tú. Bain triail as roghanna eile.',
  describeVideo: 'Inis dom cén físeán ba mhaith leat a chruthú.',
  creacionTerminada: 'Tá an cruthú sin críochnaithe agus ní dhéanfar arís é. Lorg i measc do chruthuithe é.',
  tomaInvalida: 'Níl foirm bhailí ar an nglacadh sin.',
  planoInvalido: 'Níl foirm bhailí ar an seat sin.',
  produccionNoEncontrada: 'Níor aimsíomar an léiriú sin.',
  tomaNoGenerable: 'Ní féidir an glacadh sin a ghiniúint mar sin.',
  creacionNoEncontrada: 'Níor aimsíomar an cruthú sin.',
  debesIniciarSesion: 'Ní mór duit logáil isteach',
};
