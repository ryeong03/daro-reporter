import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { openHealthConnectSettings } from 'react-native-health-connect';
import {
  allPermissionsGranted,
  checkPermissionStatus,
  isHealthConnectAvailable,
  loadPermissionPreview,
  requestAllAppPermissions,
  type PermissionPreview,
  type PermissionStatus,
} from '../services/permissionsService';
import { setPermissionsSetupComplete } from '../storage/permissionsStorage';
import { startHealthMonitoringSession } from '../services/healthMonitoring';

type Props = {
  onComplete: () => void;
};

type RowState = 'pending' | 'granted' | 'denied';

function rowState(granted: boolean, requested: boolean): RowState {
  if (granted) return 'granted';
  if (requested) return 'denied';
  return 'pending';
}

const STATUS_LABEL: Record<RowState, string> = {
  pending: '대기',
  granted: '허용됨',
  denied: '필요',
};

const STATUS_COLOR: Record<RowState, string> = {
  pending: '#6c757d',
  granted: '#2d6a4f',
  denied: '#e63946',
};

export default function PermissionsScreen({ onComplete }: Props) {
  const [status, setStatus] = useState<PermissionStatus>({
    heartRate: false,
    steps: false,
    location: false,
  });
  const [preview, setPreview] = useState<PermissionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestedOnce, setRequestedOnce] = useState(false);
  const autoRequestStarted = useRef(false);

  const refresh = useCallback(async () => {
    const current = await checkPermissionStatus();
    setStatus(current);
    if (allPermissionsGranted(current)) {
      const data = await loadPermissionPreview();
      setPreview(data);
    } else {
      setPreview(null);
    }
    return current;
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const handleRequestAll = useCallback(async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('안내', '이 앱은 Android 기기에서만 동작합니다.');
      return;
    }

    const hcAvailable = await isHealthConnectAvailable();
    if (!hcAvailable) {
      Alert.alert(
        'Health Connect 필요',
        'Galaxy Fit3 심박·걸음 데이터를 읽으려면 Google Play에서 Health Connect 앱을 설치해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: 'Play 스토어',
            onPress: () =>
              Linking.openURL(
                'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'
              ),
          },
        ]
      );
      return;
    }

    setRequesting(true);
    setRequestedOnce(true);

    try {
      const result = await requestAllAppPermissions();
      setStatus(result);

      if (!result.heartRate || !result.steps) {
        Alert.alert(
          '건강 데이터 권한',
          'Galaxy Fit3(삼성 헬스) 데이터가 Health Connect에 공유되어 있어야 합니다.\n\n' +
            '1. Galaxy Wearable에서 Fit3 연결\n' +
            '2. 삼성 헬스 → Health Connect 데이터 공유 ON\n' +
            '3. 아래 "Health Connect 설정"에서 Hero 앱의 심박수·걸음수 읽기 허용',
          [
            { text: '닫기', style: 'cancel' },
            {
              text: 'Health Connect 설정',
              onPress: () => openHealthConnectSettings(),
            },
          ]
        );
      }

      if (!result.location) {
        Alert.alert(
          '위치 권한',
          '어르신의 현재 위치를 확인하려면 위치 권한을 허용해 주세요. 설정에서 "앱 사용 중 허용" 또는 "항상 허용"을 선택할 수 있습니다.'
        );
      }

      const latest = await refresh();
      if (allPermissionsGranted(latest)) {
        await setPermissionsSetupComplete(true);
        startHealthMonitoringSession().catch((err) => {
          console.error('[Permissions] Failed to start foreground service:', err);
        });
      }
    } finally {
      setRequesting(false);
    }
  }, [refresh]);

  /** 앱 최초 실행 시 세 가지 권한을 순차적으로 요청 */
  useEffect(() => {
    if (loading || autoRequestStarted.current || Platform.OS !== 'android') {
      return;
    }

    autoRequestStarted.current = true;
    if (!allPermissionsGranted(status)) {
      handleRequestAll();
    }
  }, [loading, status, handleRequestAll]);

  const handleContinue = async () => {
    const current = await refresh();
    if (!allPermissionsGranted(current)) {
      Alert.alert(
        '권한이 필요합니다',
        '심박수, 걸음수, 위치 권한을 모두 허용해야 안전 모니터링을 시작할 수 있습니다.'
      );
      return;
    }
    await setPermissionsSetupComplete(true);
    await startHealthMonitoringSession();
    onComplete();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6a4f" />
        <Text style={styles.loadingText}>권한 상태 확인 중…</Text>
      </View>
    );
  }

  const allGranted = allPermissionsGranted(status);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.logo}>Hero</Text>
        <Text style={styles.title}>앱 사용 권한 안내</Text>
        <Text style={styles.subtitle}>
          Galaxy Fit3 심박·걸음 데이터와{'\n'}어르신의 현재 위치를 안전하게 읽기 위해{'\n'}
          아래 세 가지 권한이 필요합니다.
        </Text>
      </View>

      <PermissionRow
        icon="❤️"
        title="심박수 (Heart Rate)"
        description="Galaxy Fit3에서 측정한 심박 데이터"
        state={rowState(status.heartRate, requestedOnce)}
      />
      <PermissionRow
        icon="👟"
        title="걸음수 (Steps)"
        description="Galaxy Fit3에서 측정한 걸음 데이터"
        state={rowState(status.steps, requestedOnce)}
      />
      <PermissionRow
        icon="📍"
        title="위치 (GPS)"
        description="어르신의 현재 위치 확인"
        state={rowState(status.location, requestedOnce)}
      />

      {preview && allGranted && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>연결 확인</Text>
          <Text style={styles.previewLine}>
            심박: {preview.heartRateBpm != null ? `${preview.heartRateBpm} bpm` : '데이터 대기 중'}
          </Text>
          <Text style={styles.previewLine}>
            걸음: {preview.steps != null ? `${preview.steps} 걸음` : '데이터 대기 중'}
          </Text>
          <Text style={styles.previewLine}>
            위치:{' '}
            {preview.location
              ? `${preview.location.lat.toFixed(5)}, ${preview.location.lng.toFixed(5)}`
              : '위치 대기 중'}
          </Text>
          <Text style={styles.previewHint}>
            Fit3에서 방금 측정한 값이 없으면 잠시 후 다시 확인됩니다.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, requesting && styles.btnDisabled]}
        onPress={handleRequestAll}
        disabled={requesting}
      >
        {requesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {allGranted ? '권한 다시 확인' : '세 가지 권한 허용하기'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => openHealthConnectSettings()}
      >
        <Text style={styles.linkBtnText}>Health Connect 설정 열기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.continueBtn, !allGranted && styles.continueBtnDisabled]}
        onPress={handleContinue}
        disabled={!allGranted}
      >
        <Text style={[styles.continueBtnText, !allGranted && styles.continueBtnTextDisabled]}>
          다음 단계로
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PermissionRow({
  icon,
  title,
  description,
  state,
}: {
  icon: string;
  title: string;
  description: string;
  state: RowState;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Text style={[styles.rowStatus, { color: STATUS_COLOR[state] }]}>
        {STATUS_LABEL[state]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    gap: 16,
  },
  loadingText: { fontSize: 18, color: '#6c757d' },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 40, backgroundColor: '#f8f9fa' },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 32, fontWeight: '800', color: '#2d6a4f' },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a2e', marginTop: 12, textAlign: 'center' },
  subtitle: {
    fontSize: 17,
    color: '#495057',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 26,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  rowIcon: { fontSize: 36 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  rowDesc: { fontSize: 14, color: '#6c757d', marginTop: 4, lineHeight: 20 },
  rowStatus: { fontSize: 14, fontWeight: '700' },
  previewCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    marginBottom: 8,
  },
  previewTitle: { fontSize: 17, fontWeight: '700', color: '#2d6a4f', marginBottom: 10 },
  previewLine: { fontSize: 16, color: '#1a1a2e', marginBottom: 6 },
  previewHint: { fontSize: 13, color: '#6c757d', marginTop: 8, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: '#2d6a4f',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  btnDisabled: { opacity: 0.65 },
  linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  linkBtnText: { fontSize: 16, color: '#2d6a4f', fontWeight: '600' },
  continueBtn: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  continueBtnDisabled: { backgroundColor: '#dee2e6' },
  continueBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  continueBtnTextDisabled: { color: '#adb5bd' },
});
