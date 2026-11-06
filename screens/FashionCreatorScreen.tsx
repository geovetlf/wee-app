import React, { useCallback, useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import CabeceraDeSeccion from '../components/creator/CabeceraDeSeccion';
import FashionComposer from '../components/fashion/FashionComposer';
import StudioPromptComposer from '../components/studio/StudioPromptComposer';
import { EnlaceDeCreaciones, RejillaDeCreator, TituloDeCreator } from '../components/creator/PiezasDeCreator';
import { FASHION_MODOS, FashionModo, modoDeFashion } from '../constants/fashionModes';

/**
 * WEË FASHION DENTRO DE WEË VERSIÓN CREATOR.
 *
 * Es una adaptación propia de Creator, no un cambio de `FashionScreen`, que es de
 * la versión app y está congelada. Lo único distinto es la entrada: en creator no
 * se enseña nada de muestra (docs/WEE-CREATOR.md), así que en vez de la galería de
 * fotos de la demo —que sin el modo demo eran seis cuadros negros a pantalla
 * entera— se ve lo mismo que en las otras secciones de creator: la caja común y
 * las seis experiencias en la rejilla de creator. El composer de cada modo es el
 * mismo de siempre, con los mismos parámetros de la ruta (`modo`, `goal`,
 * `imageUri`), así que las puertas «Beauty» y «Fashion» de Weë Studio abren aquí
 * igual que antes.
 */
const FashionCreatorScreen: React.FC = () => {
  const t = useT();
  const route = useRoute<any>();
  const [modo, setModo] = useState<FashionModo | undefined>(modoDeFashion(route.params?.modo));
  const [texto, setTexto] = useState('');
  /* Lo escrito en la caja viaja al composer: Weë no vuelve a pedir lo que ya tiene delante. */
  const [inicial, setInicial] = useState<{ texto?: string; imageUri?: string }>({
    texto: route.params?.goal,
    imageUri: route.params?.imageUri,
  });

  useEffect(() => {
    if (route.params?.modo) setModo(modoDeFashion(route.params.modo));
  }, [route.params?.modo]);

  const volver = useCallback(() => setModo(undefined), []);
  const abrir = useCallback((m: FashionModo) => setModo(m), []);
  const alCrear = useCallback(() => {
    const escrito = texto.trim();
    if (!escrito) return;
    setInicial({ texto: escrito });
    setModo(modoDeFashion('completeLook') ?? FASHION_MODOS[0]);
  }, [texto]);

  return (
    <CreatorShell activeId="business" title="Weë Fashion" breadcrumb="Weë AI" sinFranjaSuperior>
      <CabeceraDeSeccion nombre="Fashion" lema={t('fashion.tagline')} descripcion={t('fashion.intro')} />
      {modo ? (
        <FashionComposer key={modo.id} modo={modo} onVolver={volver} inicial={inicial} />
      ) : (
        <>
          <StudioPromptComposer
            placeholder={t('studio.placeholder')}
            valor={texto}
            onCambiar={setTexto}
            onCrear={alCrear}
          />
          <TituloDeCreator titulo={t('fashion.chooseTitle')} />
          <RejillaDeCreator
            puertas={FASHION_MODOS.map((m) => ({
              id: m.id,
              icono: m.icono,
              titulo: t(m.claveTitulo),
              pista: t(m.claveDescripcion),
              onPress: () => abrir(m),
            }))}
          />
          <EnlaceDeCreaciones />
        </>
      )}
    </CreatorShell>
  );
};

export default FashionCreatorScreen;
