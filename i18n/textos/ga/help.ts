/*
 * IRLANDÉS — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los botones que cita son los de otros módulos, letra por letra: «Níl a fhios agam», «Cóipeáil an
 * prompt», «Conas a rinne mé é», «Sábháil i dtionscadal». «speisialtóir» empieza por «sp», que no
 * admite ni lenición ni eclipsis: por eso las cinco formas de `a3` son iguales.
 */
import { ConPlurales } from './plurales';

export const help: ConPlurales<typeof import('../es/help').help> = {
  title: 'Cabhair',
  intro: 'Seo duit na freagraí ar na ceisteanna is coitianta. Mura bhfuil rud éigin soiléir, inis dúinn: feabhsaíonn Weë leis an bpobal.',
  faqTitle: 'Ceisteanna coitianta',
  contact: 'Teagmháil',
  contactBody: 'Go luath beidh bealach díreach agat anseo chuig foireann Weë. Idir an dá linn, roinn do smaointe agus do chuid fadhbanna i bpostáil: léann an pobal agus an fhoireann iad.',
  askQuestion: 'Cuir ceist',
  legalTitle: 'Téarmaí agus príobháideachas',
  legalBody: 'Is leatsa do shonraí. Ní úsáideann Weë do ríomhphost ná do phróifíl ach chun go n-oibreoidh an aip: logáil isteach, do phostálacha, do Credits agus do chruthuithe a thaispeáint. Ní dhíolaimid d\'eolas.',
  legalPending: 'Foilseofar na téarmaí iomlána agus an polasaí príobháideachais ar wee.zone roimh an seoladh. Tá Weë á thógáil: úsáideann roinnt feidhmeanna sonraí tástála agus deirimid é sin go soiléir san áit a dtarlaíonn sé.',
  footer: 'Weë · World Encode Entity · leagan 1.0.0',
  q1: 'Cad é Weë?',
  a1: 'Is é Weë (World Encode Entity) líonra sóisialta na ndaoine a chruthaíonn le hIntleacht Shaorga: anseo a fhaigheann tú amach, a fhoghlaimíonn tú, a chruthaíonn tú, a roinneann tú agus a nascann tú. Is í an IS an t-inneall; is é an pobal an croí.',
  q2: 'Cén difríocht atá idir an Fhíorphróifíl agus an Phróifíl Weë?',
  a2: 'Is í d\'Fhíorphróifíl d\'fhéiniúlacht mar is gnách agus bíonn an aip bán. Is í do Phróifíl Weë d\'fhéiniúlacht chun cruthú le hIS: abhatár agus ainm dá cuid féin chun do chruthuithe a fhoilsiú, agus léi éiríonn an aip dorcha ionas go mbeidh a fhios agat i gcónaí cén phróifíl lena bhfuil tú ag glacadh páirte. Athraíonn tú ó cheann go ceann ón roghchlár ☰ nó ó chnaipe an cheanntáisc.',
  q3: 'Conas a oibríonn Weë AI?',
  a3_one: 'Inis do Weë cad ba mhaith leat a bhaint amach i d\'fhocail féin. Cuireann Weë cúpla ceist shimplí ort (is féidir leat "Níl a fhios agam" a fhreagairt i gcónaí), ullmhaíonn sé plean agus cruthaíonn sé an toradh. Roghnaíonn tusa an toradh; roghnaíonn Weë an IS. Tá {{contador}} speisialtóir ag Weë AI: {{lista}}.',
  a3_two: 'Inis do Weë cad ba mhaith leat a bhaint amach i d\'fhocail féin. Cuireann Weë cúpla ceist shimplí ort (is féidir leat "Níl a fhios agam" a fhreagairt i gcónaí), ullmhaíonn sé plean agus cruthaíonn sé an toradh. Roghnaíonn tusa an toradh; roghnaíonn Weë an IS. Tá {{contador}} speisialtóir ag Weë AI: {{lista}}.',
  a3_few: 'Inis do Weë cad ba mhaith leat a bhaint amach i d\'fhocail féin. Cuireann Weë cúpla ceist shimplí ort (is féidir leat "Níl a fhios agam" a fhreagairt i gcónaí), ullmhaíonn sé plean agus cruthaíonn sé an toradh. Roghnaíonn tusa an toradh; roghnaíonn Weë an IS. Tá {{contador}} speisialtóir ag Weë AI: {{lista}}.',
  a3_many: 'Inis do Weë cad ba mhaith leat a bhaint amach i d\'fhocail féin. Cuireann Weë cúpla ceist shimplí ort (is féidir leat "Níl a fhios agam" a fhreagairt i gcónaí), ullmhaíonn sé plean agus cruthaíonn sé an toradh. Roghnaíonn tusa an toradh; roghnaíonn Weë an IS. Tá {{contador}} speisialtóir ag Weë AI: {{lista}}.',
  a3_other: 'Inis do Weë cad ba mhaith leat a bhaint amach i d\'fhocail féin. Cuireann Weë cúpla ceist shimplí ort (is féidir leat "Níl a fhios agam" a fhreagairt i gcónaí), ullmhaíonn sé plean agus cruthaíonn sé an toradh. Roghnaíonn tusa an toradh; roghnaíonn Weë an IS. Tá {{contador}} speisialtóir ag Weë AI: {{lista}}.',
  q4: 'Cad iad na Credits?',
  a4: 'Úsáideann gach cruthú le Weë AI Credits. Sula gcruthaíonn tú feiceann tú cé mhéad a chosnóidh sé agus, má theipeann ar rud éigin, tugtar ar ais iad. Fad atá Weë AI á thógáil againn, is praghsanna tástála iad agus ní chosnaíonn na breisithe rud ar bith: tiocfaidh na praghsanna deiridh leis na fíor-IS.',
  q5: 'Cén úsáid a bhaintear as tionscadail?',
  a5: 'Cuireann tionscadal cruthuithe ó speisialtóirí éagsúla le chéile: lógó, grianghraif, fógra, físeán agus ceol "Mo bhialann", mar shampla. Sábháil gach toradh ina cheann féin ó "Sábháil i dtionscadal".',
  q6: 'Cad iad na Weëls?',
  a6: 'Físeáin suas le 15 soicind chun an méid a chruthaíonn tú a thaispeáint. Is féidir iad a roinnt lasmuigh de Weë agus bíonn marc beag Weë orthu. Cruthaíonn tú iad ón gcnaipe + agus "Weël" a roghnú.',
  q7: 'Cad iad na pobail?',
  a7: 'Grúpaí daoine a bhfuil an spéis chéanna acu: Scannánaíocht & Beochan, Ealaín & Cruthaitheacht, Gnó & Fiontraíocht, Teicneolaíocht & IS agus tuilleadh. Téigh isteach sna cinn a bhfuil spéis agat iontu agus postáil iontu.',
  q8: 'Cad é WeeTalk?',
  a8: 'Is é comhrá Weë é: comhráite príobháideacha le daoine eile sa phobal, le téacs, grianghraif agus nótaí gutha.',
  q9: 'Cad é "Conas a rinne mé é"?',
  a9: 'Agus tú ag foilsiú is féidir leat a insint cé na huirlisí a d\'úsáid tú, an prompt agus an próiseas. Mar sin foghlaimíonn daoine eile uaitse, agus tusa uathusan, le tapáil amháin ar "Cóipeáil an prompt".',
  q10: 'Cén aois a chaithfidh tú a bheith chun Weë a úsáid?',
  a10: 'Níl Weë ar fáil ach do dhaoine atá {{edad}} bliana d\'aois nó níos sine. Iarrtar do dháta breithe ort nuair a chláraíonn tú agus, nuair a bheidh sé sábháilte, ní féidir é a athrú.',
  heroTitle: 'Cén chaoi ar féidir linn cabhrú leat?',
  legalVisibility: 'Tá an méid a fhoilsíonn tú le feiceáil ag an bpobal; tá an méid a chruthaíonn tú in Weë AI príobháideach go dtí go gcinneann tú é a fhoilsiú. Is féidir leat do phostálacha agus do thionscadail a scriosadh nuair is mian leat.',
  askPrefill: 'Ceist do Weë: ',
};
