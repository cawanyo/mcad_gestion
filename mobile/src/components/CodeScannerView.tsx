import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, ArrowRight, Camera as CameraIcon } from 'lucide-react-native';
import { theme } from '../theme';

interface CodeScannerViewProps {
  // 'once' freezes after the first decode (search-to-open flows); 'continuous'
  // keeps scanning with a cooldown between fires — mirrors the web's
  // AddItemToGroupModal/ReturnCheckModal, which scan several different
  // items in a row.
  mode: 'once' | 'continuous';
  onDecode: (data: string) => void;
  cooldownMs?: number;
  hint?: string;
  showManualEntry?: boolean;
  scanning?: boolean;
}

// Native camera scanner (QR + the equipment CODE128 barcode) shared by the
// repertory's "Scanner un code" search, and the group Add item / Vérifier le
// retour flows — same role as the web's useCodeScanner hook + webcam <video>,
// but using the phone's real camera via expo-camera instead of a browser
// getUserMedia stream.
export const CodeScannerView: React.FC<CodeScannerViewProps> = ({
  mode,
  onDecode,
  cooldownMs = 1200,
  hint,
  showManualEntry = true,
  scanning = true
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [paused, setPaused] = React.useState(false);
  const [manualCode, setManualCode] = React.useState('');
  const busyRef = React.useRef(false);

  React.useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  const handleScanned = (result: { data: string }) => {
    if (busyRef.current || paused || !scanning) return;
    busyRef.current = true;
    onDecode(result.data);
    if (mode === 'once') {
      setPaused(true);
    } else {
      setTimeout(() => {
        busyRef.current = false;
      }, cooldownMs);
    }
  };

  const submitManual = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    onDecode(trimmed);
    setManualCode('');
  };

  return (
    <View>
      {!permission ? (
        <View style={[styles.camera, styles.center]}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : !permission.granted ? (
        <View style={[styles.camera, styles.center, { gap: 10 }]}>
          <CameraIcon size={26} color={theme.colors.textMuted} />
          <Text style={styles.permText}>Autorisez l'accès à l'appareil photo pour scanner un code.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.camera}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
            onBarcodeScanned={paused ? undefined : handleScanned}
          />
          <View pointerEvents="none" style={styles.frameWrap}>
            <View style={styles.frame} />
          </View>
          {!scanning && (
            <View style={styles.busyOverlay}>
              <ScanLine size={30} color="#fff" />
            </View>
          )}
        </View>
      )}

      {hint && <Text style={styles.hintText}>{hint}</Text>}

      {showManualEntry && (
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Ou saisir le code du matériel..."
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            onSubmitEditing={submitManual}
          />
          <TouchableOpacity style={styles.manualBtn} disabled={!manualCode.trim()} onPress={submitManual}>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  camera: { width: '100%', aspectRatio: 16 / 10, borderRadius: theme.borderRadius.lg, overflow: 'hidden', backgroundColor: '#0f172a' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '55%', aspectRatio: 1, borderWidth: 2, borderColor: 'rgba(255,255,255,0.75)', borderRadius: theme.borderRadius.lg },
  busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center' },
  permText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  permBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: theme.borderRadius.round },
  permBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  hintText: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8 },
  manualRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  manualInput: { flex: 1, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: theme.colors.text },
  manualBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }
});
