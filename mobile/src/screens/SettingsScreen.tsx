import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useUser } from '../hooks/useUser';
import { isHealthMonitoringSessionActive } from '../services/healthMonitoring';
import {
  HEALTH_POLL_INTERVAL_MS,
  HEALTH_SYNC_INTERVAL_MS,
} from '../services/foregroundTask';

export default function SettingsScreen() {
  const { userName, userId, logout } = useUser();
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    setMonitoringActive(isHealthMonitoringSessionActive());
  }, []);

  const handleLogout = () => {
    Alert.alert('초기화', '등록 정보를 삭제하고 처음부터 다시 등록하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '확인', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* 사용자 정보 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>등록 정보</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>이름</Text>
          <Text style={styles.rowValue}>{userName || '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>사용자 ID</Text>
          <Text style={styles.rowValueSmall}>{userId?.slice(0, 8) || '-'}...</Text>
        </View>
      </View>

      {/* 모니터링 설정 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>모니터링</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>백그라운드 서비스</Text>
          <View style={[styles.badge, monitoringActive ? styles.badgeOn : styles.badgeOff]}>
            <Text style={[styles.badgeText, monitoringActive ? styles.badgeTextOn : styles.badgeTextOff]}>
              {monitoringActive ? '동작 중' : '중지됨'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>상태바 알림</Text>
          <Text style={styles.rowValue}>안전 모니터링 동작 중</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>심박·걸음 수집</Text>
          <Text style={styles.rowValue}>{HEALTH_POLL_INTERVAL_MS / 1000}초</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>서버 전송 (POST /health)</Text>
          <Text style={styles.rowValue}>{HEALTH_SYNC_INTERVAL_MS / 60_000}분</Text>
        </View>
      </View>

      {/* 앱 정보 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>버전</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>서버</Text>
          <Text style={styles.rowValueSmall}>daro-reporter-production.up.railway.app</Text>
        </View>
      </View>

      {/* 초기화 버튼 */}
      <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout}>
        <Text style={styles.dangerBtnText}>등록 초기화</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Hero - 농업인 안전 모니터링 시스템</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 15, color: '#495057' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  rowValueSmall: { fontSize: 13, color: '#6c757d', maxWidth: 180 },
  divider: { height: 1, backgroundColor: '#f1f3f5', marginVertical: 12 },
  dangerBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e63946',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerBtnText: { fontSize: 16, fontWeight: '600', color: '#e63946' },
  footer: { textAlign: 'center', fontSize: 13, color: '#adb5bd', marginTop: 24 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeOn: { backgroundColor: '#e8f5e9' },
  badgeOff: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextOn: { color: '#2d6a4f' },
  badgeTextOff: { color: '#d62828' },
});
