import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { predefinedAvatars } from './AvatarSVGs';
import { cloudinaryAvatar } from '../../services/cloudinaryService';

interface AvatarDisplayProps {
  size?: number;
  avatarType?: 'predefined' | 'custom';
  avatarId?: string;
  photoURL?: string;
  photoURLThumbnail?: string;
  backgroundColor?: string;
  borderColor?: string;
  showBorder?: boolean;
}

const isValidImageUrl = (url: unknown): url is string =>
  typeof url === 'string' && url.length > 0 && (url.startsWith('http://') || url.startsWith('https://'));

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  size = 80,
  avatarType = 'predefined',
  avatarId = 'male',
  photoURL,
  photoURLThumbnail,
  backgroundColor = '#E5E7EB',
  borderColor = 'transparent',
  showBorder = false,
}) => {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? 2 : 0,
    borderColor,
    overflow: 'hidden' as const,
  };

  /* Una foto que no carga deja el avatar por defecto, no un círculo vacío. */
  const [fotoRota, setFotoRota] = React.useState<string | null>(null);
  const hasValidPhotoURL = isValidImageUrl(photoURL) && fotoRota !== photoURL;

  if (avatarType === 'custom' && hasValidPhotoURL) {
    const imageUrl = cloudinaryAvatar(photoURL!, size * 2);
    const thumbUrl = isValidImageUrl(photoURLThumbnail) ? photoURLThumbnail : undefined;

    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUrl }}
          placeholder={thumbUrl ? { uri: thumbUrl } : undefined}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setFotoRota(photoURL!)}
        />
      </View>
    );
  }

  if (avatarType === 'predefined' && avatarId) {
    const selectedAvatar = predefinedAvatars.find(avatar => avatar.id === avatarId);
    if (selectedAvatar) {
      const AvatarComponent = selectedAvatar.component;
      return (
        <View style={containerStyle}>
          <AvatarComponent size={size} backgroundColor={selectedAvatar.color} />
        </View>
      );
    }
  }

  return (
    <View style={[containerStyle, styles.defaultContainer, { backgroundColor }]}>
      <Ionicons name="person" size={size * 0.5} color="#9CA3AF" />
    </View>
  );
};

const styles = StyleSheet.create({
  defaultContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvatarDisplay;
