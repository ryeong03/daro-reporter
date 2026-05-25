import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useUser } from '../hooks/useUser';
import { useHealthData } from '../hooks/useHealthData';
import type { DetectionState } from '../api/types';

const STATE_CONFIG: Record<DetectionState, { label: string; color: string; bg: string; desc: string }> = {
  normal: { label: '정상', color: '#2d6a4f', bg: '#e8f5e9', desc: '모든 수치가 정상 범위입니다' },
  stage1_hr_high: { label: '심박 상승', color: '#e8890c', bg: '#fff3e0', desc: '심박수가 높아지고 있습니다' },
  stage2_waiting_inactive: { label: '관찰 중', color: '#e8890c', bg: '#fff3e0', desc: '활동 중단 감지, 관찰 중입니다' },
  observing: { label: '주의', color: '#d62828', bg: '#fde8e8', desc: '이상 징후 관찰 중입니다' },
  alert: { label: '위험', color: '#d62828', bg: '#fde8e8', desc: 'AI 확인 전화가 진행 중입니다' },
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userName } = useUser();
  const { heartRate, steps, detectionState, watchConnected, gpsActive, lastSync } = useHealthData();

  const pulseAnim = useState(new Animated.Value(1))[0];

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    startPulse();
  }, [startPulse]);

  const stateInfo = STATE_CONFIG[detectionState];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{userName || '어르신'}님</Text>
          <Text style={styles.greetingSub}>오늘도 안전한 하루 되세요</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* 심박수 메인 카드 */}
      <View style={styles.heartCard}>
        <Text style={styles.heartLabel}>현재 심박수</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.heartValue}>{heartRate}</Text>
        </Animated.View>
        <Text style={styles.heartUnit}>BPM</Text>
        <View style={styles.heartBar}>
          <View
            style={[
              styles.heartBarFill,
              {
                width: `${Math.min((heartRate / 180) * 100, 100)}%`,
                backgroundColor: heartRate > 120 ? '#d62828' : heartRate > 100 ? '#e8890c' : '#2d6a4f',
              },
            ]}
          />
        </View>
        <Text style={styles.heartRange}>정상 범위: 60~100 BPM</Text>
      </View>

      {/* 상태 카드 */}
      <View style={[styles.statusCard, { backgroundColor: stateInfo.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: stateInfo.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusLabel, { color: stateInfo.color }]}>{stateInfo.label}</Text>
          <Text style={styles.statusDesc}>{stateInfo.desc}</Text>
        </View>
      </View>

      {/* 실시간 정보 그리드 */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridIcon}>👣</Text>
          <Text style={styles.gridValue}>{steps.toLocaleString()}</Text>
          <Text style={styles.gridLabel}>오늘 걸음수</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridIcon}>📡</Text>
          <Text style={styles.gridValue}>{gpsActive ? 'ON' : 'OFF'}</Text>
          <Text style={styles.gridLabel}>GPS 추적</Text>
        </View>
      </View>

      {/* 연결 상태 */}
      <View style={styles.connectionCard}>
        <Text style={styles.connectionTitle}>연결 상태</Text>

        <View style={styles.connectionRow}>
          <Text style={styles.connectionIcon}>⌚</Text>
          <Text style={styles.connectionLabel}>스마트워치</Text>
          <View style={[styles.connectionBadge, watchConnected ? styles.badgeOn : styles.badgeOff]}>
            <Text style={[styles.badgeText, watchConnected ? styles.badgeTextOn : styles.badgeTextOff]}>
              {watchConnected ? '연결됨' : '미연결'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.connectionRow}>
          <Text style={styles.connectionIcon}>🔄</Text>
          <Text style={styles.connectionLabel}>마지막 동기화</Text>
          <Text style={styles.connectionTime}>{lastSync || '-'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.connectionRow}>
          <Text style={styles.connectionIcon}>🌐</Text>
          <Text style={styles.connectionLabel}>서버 통신</Text>
          <View style={[styles.connectionBadge, styles.badgeOn]}>
            <Text style={[styles.badgeText, styles.badgeTextOn]}>정상</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 20, paddingTop: 56 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1a1a2e' },
  greetingSub: { fontSize: 15, color: '#6c757d', marginTop: 2 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  settingsIcon: { fontSize: 22 },

  heartCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heartLabel: { fontSize: 14, color: '#6c757d', fontWeight: '600', marginBottom: 8 },
  heartValue: { fontSize: 72, fontWeight: '800', color: '#2d6a4f', letterSpacing: -2 },
  heartUnit: { fontSize: 18, color: '#6c757d', fontWeight: '600', marginTop: -4, marginBottom: 16 },
  heartBar: { width: '100%', height: 6, backgroundColor: '#e9ecef', borderRadius: 3 },
  heartBarFill: { height: 6, borderRadius: 3 },
  heartRange: { fontSize: 12, color: '#adb5bd', marginTop: 8 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    marginBottom: 16,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 17, fontWeight: '700' },
  statusDesc: { fontSize: 13, color: '#495057', marginTop: 2 },

  grid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
  },
  gridIcon: { fontSize: 28, marginBottom: 8 },
  gridValue: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  gridLabel: { fontSize: 12, color: '#6c757d', marginTop: 4 },

  connectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    marginBottom: 32,
  },
  connectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  connectionIcon: { fontSize: 20, marginRight: 12 },
  connectionLabel: { flex: 1, fontSize: 15, color: '#495057' },
  connectionTime: { fontSize: 14, color: '#6c757d' },
  connectionBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeOn: { backgroundColor: '#e8f5e9' },
  badgeOff: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextOn: { color: '#2d6a4f' },
  badgeTextOff: { color: '#d62828' },
  divider: { height: 1, backgroundColor: '#f1f3f5', marginVertical: 10 },
});
