# Auditoría lingüística: mongol (mn)

Revisión de IA del 2026-10-30, no revisión nativa. Terminada sobre las 24 filas de `correcciones.csv` sin marcar como revisadas (de 3038). Cada una se comparó con español e inglés, con `informe.md` y `glosario.csv` a la vista. El registro `i18n/revision/` y `i18n/huella.json` no se tocaron.

## Resultado
24 filas revisadas, 24 problemas, 24 corregidos. Eran las propuestas por clave del §7.A del informe. Se aplicaron todas porque ninguna pide decisión del dueño, y se contrastaron con es y en. Siguen sin fuente externa verificada, como ya avisaba el informe: el criterio es de un agente.

## Corregidos
| clave | antes | después | motivo |
|---|---|---|---|
| help.a4 | Weë AI-аар хийсэн бүтээл бүр Credits зарцуулдаг. Бүтээхийн өмнө ямар үнэтэйг харна, хэрэв алдаа гарвал буцаан олгоно. Weë AI-г бүтээж байх хугацаанд үнэ нь туршилтынх бөгөөд цэнэглэлт үнэгүй: эцсийн үнэ бодит хиймэл оюунтай хамт ирнэ. | Weë AI-аар хийсэн бүтээл бүр Credits зарцуулдаг. Бүтээхийн өмнө ямар үнэтэйг харна, хэрэв алдаа гарвал буцаан олгоно. Weë AI-г бүтээж байх хугацаанд үнэ нь туршилтынх бөгөөд цэнэглэлт үнэгүй: эцсийн үнэ бодит хиймэл оюунтай хамт тогтоно. | Calco: un precio no «viene» (ирнэ); se fija (тогтоно). |
| weebiz.specialityHintPets | Мал эмнэлэг, Арчилгаа, Үрчлэлт... | Амьтны эмнэлэг, Арчилгаа, Үрчлэлт... | «Мал эмнэлэг» es veterinaria de ganado; la categoría es de mascotas. |
| aiAvatar.accHeadscarf | Алчуур | Толгойн алчуур | «Алчуур» solo se lee también como toalla. |
| engine.resetHealth | Эрүүл мэндийг дахин тохируулах | Төлөвийг дахин тохируулах | Calco: «Эрүүл мэнд» es salud de personas; aquí es el estado de un servicio. |
| engine.healthReset | Эрүүл мэндийг дахин тохируулсан. | Төлөвийг дахин тохируулсан. | Igual que engine.resetHealth. |
| home.communityDescConfessions | Хэнд ч хэлэхгүй зүйлээ хуваалцах аюулгүй орон зай. Шүүмжлэлгүй. | Хэнд ч хэлэхгүй зүйлээ хуваалцах аюулгүй орон зай. Хэн ч таныг шүүмжлэхгүй. | «Шүүмжлэлгүй» suelto no dice que nadie juzga a la persona. |
| wall.useInEditor | Засварлагчид ашиглах | Засварлагч дээр ашиглах | Ambigüedad: «Засварлагчид» es también el plural «editores» (personas). |
| composer.tagPostWithIt | Нийтлэлийг таны бичсэнээр тэмдэглээд буцна | Таны бичсэнийг нийтлэлд тэмдэглээд буцна | Sentido: «Нийтлэлийг … тэмдэглэх» es marcar la publicación; se etiqueta lo escrito en ella. |
| composer.searchPlaceHint | Нийтлэлээ тэмдэглэхийн тулд хот эсвэл улс хайна уу. | Нийтлэлдээ байршил тэмдэглэхийн тулд хот эсвэл улс хайна уу. | Sentido: «Нийтлэлээ тэмдэглэх» es marcar la publicación, no ponerle un lugar. |
| credits.terms | Туршилтын цэнэглэлт: одоогоор ямар ч төлбөр авахгүй. Weë AI бодит хиймэл оюунаа ашиглаж эхлэхэд эцсийн үнэ ирнэ; тэр болтол бүтээл бүр эхлэхийн өмнө туршилтын зардлаа харуулна. | Туршилтын цэнэглэлт: одоогоор ямар ч төлбөр авахгүй. Weë AI бодит хиймэл оюунаа ашиглаж эхлэхэд эцсийн үнэ тогтоно; тэр болтол бүтээл бүр эхлэхийн өмнө туршилтын зардлаа харуулна. | Calco: un precio no «viene» (ирнэ); se fija (тогтоно). |
| econtact.reject | {{nombre}} хэрэглэгчийг татгалзах | {{nombre}} хэрэглэгчийн хүсэлтээс татгалзах | Rección de «татгалзах» (ablativo) en acción sensible; se rechaza la solicitud, no a la persona. |
| econtact.rejectTitle | Хүсэлтийг татгалзах | Хүсэлтээс татгалзах | Rección de «татгалзах» (ablativo). |
| econtact.rejectConfirm | {{nombre}} хэрэглэгчийн хүсэлтийг татгалзах уу? | {{nombre}} хэрэглэгчийн хүсэлтээс татгалзах уу? | Rección de «татгалзах» (ablativo). |
| econtact.rejectRequestLabel | {{lista}} хүсэлтийг татгалзах | {{lista}} хүсэлтээс татгалзах | Rección de «татгалзах» (ablativo). |
| weetalk.beRespectful | Хүндэтгэл болон нууцлалыг хадгалахаа мартуузай 🤝 | Бие биеэ хүндэлж, нууцлалыг сахихаа мартуузай 🤝 | «Хүндэтгэл хадгалах» calca «mantener el respeto». |
| weetalk.themeSunset | Нар жаргах | Нар жаргалт | Nombre de tema: pide sustantivo, no el verbo «Нар жаргах». |
| settings.aboutHint | Weë гэж юу вэ, та ямар хувилбар ашиглаж байгаа | Weë гэж юу болох, таны ашиглаж буй хувилбар | Frase sin cerrar, con un interrogativo colgado. |
| catalogo.homeIdeaChip3 | Сайн ашигласан жижиг гал тогоо | Зайг сайн ашигласан жижиг гал тогоо | Faltaba qué se aprovecha: el espacio. |
| catalogo.travelIdeaPlaceholder | Жишээ: Аравдугаар сарын 12-оос 22-нд Япон, хоол идэх дуртай… | Жишээ: Аравдугаар сарын 12-оос 22-ны хооронд Япон, хоол идэх дуртай… | «del 12 al 22»: el dativo «22-нд» no marca el final del periodo. |
| studio.readyHint | Энэ бол жишээ үзүүлэлт: одоогоор жинхэнэ зүйл үүсгээгүй байна. | Энэ бол жишээ үзүүлбэр: одоогоор жинхэнэ зүйл үүсгээгүй байна. | Falso amigo: «үзүүлэлт» es indicador; demostración = «үзүүлбэр». |
| studio.cmpCentered | Төвлөрсөн | Төвд байрласан | «Төвлөрсөн» es «centralizado»; aquí es composición centrada. |
| design.furnitureHint | Тавилга, эд зүйлсийг бүтээж, өөрийн болгоорой. | Тавилга, эд зүйлсийг бүтээж, өөртөө тохируулаарай. | «өөрийн болгох» es «apropiarse»; aquí es personalizar. |
| design.rendersHint | Санаагаа өндөр бодитоор дүрслээрэй. | Санаагаа маш бодитоор дүрслээрэй. | Calco de «alto realismo» (өндөр бодитоор). |
| filmmaker.timeDawn | Үүр цайх | Үүрийн гэгээ | Momento del día: pide sustantivo, no el verbo «Үүр цайх». |

## Decisión del dueño
- **«хиймэл оюун» (guía) frente a «хиймэл оюун ухаан / ХОУ» (Gemini).**
- **common.cancel:** «Болих» frente a «Цуцлах» (AOSP, MediaWiki). La guía lo atribuye a Google y Facebook sin que se pudiera confirmar.
- **Correcciones a `docs/I18N-MONGOL.md`:** las del §7.C del informe. La guía no se editó.

## Dudas para un revisor humano
- **Comprobar lo aplicado:** la rección «-аас татгалзах», «Нар жаргалт» y «Үүрийн гэгээ». `studio.cmpCentered` crece y hay que verlo en su chip.
- **Términos dobles sin decidir (§7.B del informe; ninguno está en estas 24 filas):** «Нээх» para Explorar, галерей / зургийн сан, нийгэмлэг / хамт олон, Инфлүүнсер, Презентаци / танилцуулга, хоёр дахь / хоёрдогч дүр, лавлагаа / жишиг зураг, харилцагч / үйлчлүүлэгч, moderation.send, ухамсарт байдал, «Сошиал», сценари / зохиол, тагт / террас, яриа / харилцан яриа.
- **Armonía vocálica** de sufijos sobre marcas: «Weë-ээс», «AI-аар», «AI-ийн».
