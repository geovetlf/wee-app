import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../constants/design';
import { useT } from '../contexts/IdiomaContext';

interface ChatCameraProps {
  visible: boolean;
  onClose: () => void;
  onSend: (uri: string, viewOnce: boolean) => void;
}

const ChatCamera: React.FC<ChatCameraProps> = ({ visible, onClose, onSend }) => {
  const t = useT();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [taking, setTaking] = useState(false);

  const takePicture = async () => {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) setCapturedUri(photo.uri);
    } catch (e) {
      console.error('Error taking picture:', e);
    }
    setTaking(false);
  };

  const handleSend = () => {
    if (!capturedUri) return;
    onSend(capturedUri, viewOnce);
    setCapturedUri(null);
    setViewOnce(false);
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setViewOnce(false);
  };

  const handleClose = () => {
    setCapturedUri(null);
    setViewOnce(false);
    onClose();
  };

  if (!visible) return null;

  // Permission not granted
  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permissionScreen}>
          <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.5)" />
          <Text style={styles.permissionText}>{t('weetalk.cameraNeeded')}</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>{t('weetalk.allow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.permissionCancel}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>

        {capturedUri ? (
          /* ─── Preview: photo frozen, options below ─── */
          <>
            <Image source={{ uri: capturedUri }} style={styles.preview} contentFit="cover" />

            {/* Top: close */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleRetake} style={styles.topBtn}>
                <Ionicons name="arrow-back" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Bottom: view once toggle + send */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.toggle, viewOnce && styles.toggleActive]}
                onPress={() => setViewOnce(!viewOnce)}
              >
                <Ionicons name={viewOnce ? 'eye-off' : 'infinite-outline'} size={20} color="#fff" />
                {/* El mismo interruptor que la vista previa de la galería (ConversationScreen): mismas claves. */}
                <Text style={styles.toggleText}>
                  {viewOnce ? t('weetalk.viewOnceOn') : t('weetalk.keepInChat')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                <Ionicons name="send" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ─── Live camera ─── */
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
            />

            {/* Top: close */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleClose} style={styles.topBtn}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={styles.topBtn}>
                <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Bottom: shutter */}
            <View style={styles.shutterBar}>
              <TouchableOpacity style={styles.shutter} onPress={takePicture} disabled={taking}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  preview: { flex: 1 },

  // Top bar (absolute overlay)
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Shutter bar (live camera)
  shutterBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },

  // Bottom bar (preview mode)
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
  },
  toggleActive: { backgroundColor: 'rgba(34,197,94,0.65)' },
  toggleText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5B731',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Permission screen
  permissionScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 20 },
  permissionText: { color: '#fff', fontSize: FONT_SIZE.md },
  permissionBtn: { backgroundColor: '#F5B731', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  permissionBtnText: { color: '#fff', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  permissionCancel: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.sm, marginTop: 8 },
});

export default ChatCamera;
