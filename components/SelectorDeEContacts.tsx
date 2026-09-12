import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useMisEContacts } from '../hooks/useEContact';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import AvatarDisplay from './avatars/AvatarDisplay';

/**
 * A QUIÉN MENCIONAS EN UNA PUBLICACIÓN.
 *
 * Enseña la agenda del perfil ACTIVO y deja marcar a quien quieras. Nada más:
 * aquí no se pide conexión, no se acepta, no se rechaza y no se elimina a nadie.
 * Todo eso sigue viviendo donde vivía —`econtactService` y sus callables— y esta
 * pieza ni lo importa.
 *
 * ─── De dónde sale la lista ─────────────────────────────────────────────────
 *
 * De `useMisEContacts()`, que es el mismo sitio del que la saca la agenda. Eso
 * trae tres cosas gratis, que son justo las que hacen falta:
 *
 *  · solo salen los ACEPTADOS. Las solicitudes enviadas y las recibidas van en
 *    otras listas del mismo hook y aquí no se tocan: una solicitud pendiente no
 *    es un contacto, y esa diferencia es la que separa esto de unos seguidores;
 *  · la lista es la del perfil activo. Con el Perfil Real salen sus ËContact y
 *    con el Perfil Weë sus ẄContact, sin que este componente decida nada;
 *  · quien no tenga perfil que enseñar ya viene descartado, así que nunca se
 *    puede marcar a alguien que no existe.
 *
 * El Perfil Biz no tiene agenda —sus seguidores son otro sistema—, y eso se dice
 * con palabras en vez de con una lista vacía que no se entiende.
 */

interface SelectorDeEContactsProps {
  /** Las identidades ya marcadas. Manda quien llama: aquí no se guarda estado. */
  elegidos: string[];
  onCambiar: (identidades: string[]) => void;
}

const SelectorDeEContacts: React.FC<SelectorDeEContactsProps> = ({ elegidos, onCambiar }) => {
  const { theme } = useTheme();
  const { contactos, cargando, hayAgenda, motivo, nombreLista, nombrePlural } = useMisEContacts();

  const alternar = (identidad: string) => {
    onCambiar(
      elegidos.includes(identidad) ? elegidos.filter((i) => i !== identidad) : [...elegidos, identidad]
    );
  };

  /* Un aviso tranquilo. Ninguno de estos casos es un error de nadie. */
  const Aviso: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text style={[styles.aviso, { color: theme.colors.textSecondary }]}>{children}</Text>
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!hayAgenda) {
    return (
      <Aviso>
        {motivo === 'sin-sesion'
          ? 'Entra en Weë para mencionar a tus ËContact.'
          : 'El Perfil Biz no tiene agenda de ËContact. Cambia al Perfil Real o al Perfil Weë para mencionar a alguien.'}
      </Aviso>
    );
  }

  if (contactos.length === 0) {
    return (
      <Aviso>
        Todavía no tienes {nombrePlural}. Cuando conectes con alguien desde su perfil, aparecerá aquí para
        que puedas mencionarlo.
      </Aviso>
    );
  }

  return (
    <>
      <Text style={[styles.titulo, { color: theme.colors.textSecondary }]}>
        Menciona a quien quieras de tu {nombreLista}
      </Text>

      {/*
        La agenda puede ser larga y el Composer no: la lista se desplaza dentro de
        su propia caja en vez de empujar hacia abajo el botón de publicar.
      */}
      <ScrollView style={styles.lista} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {contactos.map((persona) => {
          const marcado = elegidos.includes(persona.identidad);
          return (
            <TouchableOpacity
              key={persona.identidad}
              onPress={() => alternar(persona.identidad)}
              activeOpacity={0.7}
              style={[
                styles.fila,
                {
                  borderColor: marcado ? theme.colors.accent : theme.colors.border,
                  backgroundColor: marcado ? theme.colors.accent + '1F' : theme.colors.card,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcado }}
              accessibilityLabel={persona.perfil.displayName}
            >
              <AvatarDisplay
                size={scale(32)}
                avatarType={persona.perfil.avatarType}
                avatarId={persona.perfil.avatarId}
                photoURL={persona.perfil.photoURLThumbnail || persona.perfil.photoURL}
              />
              <View style={styles.datos}>
                <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>
                  {persona.perfil.displayName}
                </Text>
                {/* Con qué cara está en tu agenda. El uid no se enseña nunca. */}
                <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {persona.etiqueta}
                </Text>
              </View>
              <Ionicons
                name={marcado ? 'checkmark-circle' : 'ellipse-outline'}
                size={scale(22)}
                color={marcado ? theme.colors.accent : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  centrado: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  aviso: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  titulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.xs,
  },
  lista: {
    maxHeight: scale(190),
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  datos: {
    flex: 1,
  },
  nombre: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  etiqueta: {
    fontSize: FONT_SIZE.xs,
  },
});

export default SelectorDeEContacts;
