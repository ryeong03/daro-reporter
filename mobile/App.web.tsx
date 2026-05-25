import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import axios from 'axios';

const API = 'https://daro-reporter-production.up.railway.app';

interface UserInfo {
  id: string;
  name: string;
  phone: string;
  device_id: string;
  baseline_bpm: number;
}

interface Guardian {
  name: string;
  phone: string;
  relation: string;
}

function loadUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem('hero_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveUser(user: UserInfo) {
  localStorage.setItem('hero_user', JSON.stringify(user));
}

function clearUserStorage() {
  localStorage.removeItem('hero_user');
}

/* ══════════════════════════════════════════════ */

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(loadUser);
  const [screen, setScreen] = useState<'onboarding' | 'home' | 'settings'>(
    loadUser() ? 'home' : 'onboarding'
  );

  const handleRegister = (u: UserInfo) => {
    saveUser(u);
    setUser(u);
    setScreen('home');
  };

  const handleLogout = () => {
    clearUserStorage();
    setUser(null);
    setScreen('onboarding');
  };

  return (
    <SafeAreaView style={styles.root}>
      {user && screen !== 'onboarding' && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, screen === 'home' && styles.tabActive]}
            onPress={() => setScreen('home')}
          >
            <Text style={[styles.tabText, screen === 'home' && styles.tabTextActive]}>홈</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, screen === 'settings' && styles.tabActive]}
            onPress={() => setScreen('settings')}
          >
            <Text style={[styles.tabText, screen === 'settings' && styles.tabTextActive]}>설정</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.screen}>
        {screen === 'onboarding' && <OnboardingScreen onRegister={handleRegister} />}
        {screen === 'home' && user && <HomeScreen user={user} onGoSettings={() => setScreen('settings')} />}
        {screen === 'settings' && user && <SettingsScreen user={user} onLogout={handleLogout} />}
      </View>
    </SafeAreaView>
  );
}

/* ──────────── 온보딩 화면 (실제 API 연동) ──────────── */

function OnboardingScreen({ onRegister }: { onRegister: (u: UserInfo) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | undefined>();
  const [birthDate, setBirthDate] = useState('');

  const [guardians, setGuardians] = useState<Guardian[]>([{ name: '', phone: '', relation: '' }]);

  const addGuardian = () => setGuardians([...guardians, { name: '', phone: '', relation: '' }]);
  const updateGuardian = (i: number, field: keyof Guardian, value: string) => {
    const updated = [...guardians];
    updated[i] = { ...updated[i], [field]: value };
    setGuardians(updated);
  };
  const removeGuardian = (i: number) => {
    if (guardians.length <= 1) return;
    setGuardians(guardians.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('이름과 전화번호는 필수입니다.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const deviceId = `hero-web-${Date.now()}`;
      const validGuardians = guardians.filter((g) => g.name.trim() && g.phone.trim());
      const res = await axios.post(`${API}/users/register`, {
        name: name.trim(),
        phone: phone.trim(),
        device_id: deviceId,
        gender,
        birth_date: birthDate || undefined,
        guardians: validGuardians,
      });
      onRegister({
        id: res.data.user.id,
        name: res.data.user.name,
        phone: res.data.user.phone,
        device_id: deviceId,
        baseline_bpm: res.data.user.baseline_bpm,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={ob.container}>
      <ScrollView contentContainerStyle={ob.scroll} showsVerticalScrollIndicator={false}>
        <View style={ob.header}>
          <Text style={ob.logo}>Hero</Text>
          <Text style={ob.subtitle}>농업인 안전 모니터링</Text>
        </View>

        <View style={ob.progressBar}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[ob.progressDot, step >= s && ob.progressDotActive]} />
          ))}
        </View>

        {error ? (
          <View style={ob.errorBox}>
            <Text style={ob.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 1 && (
          <View style={ob.card}>
            <Text style={ob.cardTitle}>기본 정보</Text>
            <Text style={ob.cardDesc}>어르신의 정보를 입력해주세요</Text>

            <Text style={ob.label}>이름 *</Text>
            <TextInput style={ob.input} placeholder="홍길동" value={name} onChangeText={setName} placeholderTextColor="#adb5bd" />

            <Text style={ob.label}>전화번호 *</Text>
            <TextInput style={ob.input} placeholder="01012345678" value={phone} onChangeText={setPhone} placeholderTextColor="#adb5bd" />

            <Text style={ob.label}>성별</Text>
            <View style={ob.genderRow}>
              <TouchableOpacity style={[ob.genderBtn, gender === 'male' && ob.genderBtnActive]} onPress={() => setGender('male')}>
                <Text style={[ob.genderText, gender === 'male' && ob.genderTextActive]}>남성</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ob.genderBtn, gender === 'female' && ob.genderBtnActive]} onPress={() => setGender('female')}>
                <Text style={[ob.genderText, gender === 'female' && ob.genderTextActive]}>여성</Text>
              </TouchableOpacity>
            </View>

            <Text style={ob.label}>생년월일</Text>
            <TextInput style={ob.input} placeholder="1945-03-15" value={birthDate} onChangeText={setBirthDate} placeholderTextColor="#adb5bd" />

            <TouchableOpacity style={ob.primaryBtn} onPress={() => setStep(2)}>
              <Text style={ob.primaryBtnText}>다음</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={ob.card}>
            <Text style={ob.cardTitle}>보호자 등록</Text>
            <Text style={ob.cardDesc}>비상 시 연락받을 보호자를 등록해주세요</Text>

            {guardians.map((g, i) => (
              <View key={i} style={ob.guardianCard}>
                <View style={ob.guardianHeader}>
                  <Text style={ob.guardianLabel}>보호자 {i + 1}</Text>
                  {guardians.length > 1 && (
                    <TouchableOpacity onPress={() => removeGuardian(i)}>
                      <Text style={ob.removeText}>삭제</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput style={ob.input} placeholder="이름" value={g.name} onChangeText={(v) => updateGuardian(i, 'name', v)} placeholderTextColor="#adb5bd" />
                <TextInput style={ob.input} placeholder="전화번호" value={g.phone} onChangeText={(v) => updateGuardian(i, 'phone', v)} placeholderTextColor="#adb5bd" />
                <TextInput style={ob.input} placeholder="관계 (예: 아들, 딸)" value={g.relation} onChangeText={(v) => updateGuardian(i, 'relation', v)} placeholderTextColor="#adb5bd" />
              </View>
            ))}

            <TouchableOpacity style={ob.addBtn} onPress={addGuardian}>
              <Text style={ob.addBtnText}>+ 보호자 추가</Text>
            </TouchableOpacity>

            <View style={ob.btnRow}>
              <TouchableOpacity style={ob.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={ob.secondaryBtnText}>이전</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ob.primaryBtn, { flex: 1 }]} onPress={() => setStep(3)}>
                <Text style={ob.primaryBtnText}>다음</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={ob.card}>
            <Text style={ob.cardTitle}>워치 연결</Text>
            <Text style={ob.cardDesc}>
              Galaxy Fit 또는 스마트워치를 연결해주세요.{'\n'}
              Health Connect 앱이 설치되어 있어야 합니다.
            </Text>

            <View style={ob.watchInfo}>
              <Text style={{ fontSize: 40 }}>⌚</Text>
              <Text style={ob.watchText}>
                웹 버전에서는 워치 연결이 필요 없습니다.{'\n'}
                Android 앱에서 실제 연동됩니다.
              </Text>
            </View>

            <View style={ob.btnRow}>
              <TouchableOpacity style={ob.secondaryBtn} onPress={() => setStep(2)}>
                <Text style={ob.secondaryBtnText}>이전</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ob.primaryBtn, { flex: 1 }, loading && ob.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={ob.primaryBtnText}>시작하기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ──────────── 홈 화면 (서버 데이터 연동) ──────────── */

interface HealthSnapshot {
  heartRate: number;
  steps: number;
  state: string;
  lastUpdated: string | null;
}

function HomeScreen({ user, onGoSettings }: { user: UserInfo; onGoSettings: () => void }) {
  const [health, setHealth] = useState<HealthSnapshot>({
    heartRate: 0,
    steps: 0,
    state: 'normal',
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}/health-latest`);
      if (res.data) {
        setHealth({
          heartRate: res.data.heart_rate_avg || 0,
          steps: res.data.steps || 0,
          state: res.data.detection_state || 'normal',
          lastUpdated: res.data.timestamp ? new Date(res.data.timestamp).toLocaleTimeString('ko-KR') : null,
        });
      }
    } catch {
      // API가 아직 없거나 데이터가 없으면 기본값 유지
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 30000);
    return () => clearInterval(timer);
  }, [fetchHealth]);

  const stateConfig: Record<string, { label: string; color: string; bg: string; desc: string }> = {
    normal: { label: '정상', color: '#2d6a4f', bg: '#e8f5e9', desc: '모든 수치가 정상 범위입니다' },
    stage1_hr_high: { label: '심박 상승', color: '#e8890c', bg: '#fff3e0', desc: '심박수가 높아지고 있습니다' },
    stage2_waiting_inactive: { label: '관찰 중', color: '#e8890c', bg: '#fff3e0', desc: '활동 중단 감지, 관찰 중입니다' },
    observing: { label: '주의', color: '#d62828', bg: '#fde8e8', desc: '이상 징후 관찰 중입니다' },
    alert: { label: '위험', color: '#d62828', bg: '#fde8e8', desc: 'AI 확인 전화가 진행 중입니다' },
  };

  const stateInfo = stateConfig[health.state] || stateConfig.normal;
  const hr = health.heartRate;
  const hrColor = hr > 120 ? '#d62828' : hr > 100 ? '#e8890c' : '#2d6a4f';

  return (
    <ScrollView style={hm.container} contentContainerStyle={hm.scroll}>
      <View style={hm.header}>
        <View>
          <Text style={hm.greeting}>{user.name}님</Text>
          <Text style={hm.greetingSub}>오늘도 안전한 하루 되세요</Text>
        </View>
        <TouchableOpacity style={hm.settingsBtn} onPress={onGoSettings}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={hm.heartCard}>
        <Text style={hm.heartLabel}>현재 심박수</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2d6a4f" style={{ marginVertical: 24 }} />
        ) : (
          <>
            <Text style={[hm.heartValue, { color: hrColor }]}>{hr || '--'}</Text>
            <Text style={hm.heartUnit}>BPM</Text>
            <View style={hm.heartBar}>
              <View style={[hm.heartBarFill, { width: hr ? `${Math.min((hr / 180) * 100, 100)}%` : '0%', backgroundColor: hrColor }]} />
            </View>
          </>
        )}
        <Text style={hm.heartRange}>정상 범위: 60~100 BPM · 기준선: {user.baseline_bpm} BPM</Text>
      </View>

      <View style={[hm.statusCard, { backgroundColor: stateInfo.bg }]}>
        <View style={[hm.statusDot, { backgroundColor: stateInfo.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[hm.statusLabel, { color: stateInfo.color }]}>{stateInfo.label}</Text>
          <Text style={hm.statusDesc}>{stateInfo.desc}</Text>
        </View>
      </View>

      <View style={hm.grid}>
        <View style={hm.gridItem}>
          <Text style={hm.gridIcon}>👣</Text>
          <Text style={hm.gridValue}>{health.steps ? health.steps.toLocaleString() : '--'}</Text>
          <Text style={hm.gridLabel}>걸음수 (10분)</Text>
        </View>
        <View style={hm.gridItem}>
          <Text style={hm.gridIcon}>📱</Text>
          <Text style={hm.gridValue}>웹</Text>
          <Text style={hm.gridLabel}>접속 플랫폼</Text>
        </View>
      </View>

      <View style={hm.connectionCard}>
        <Text style={hm.connectionTitle}>연결 상태</Text>

        <View style={hm.connectionRow}>
          <Text style={hm.connectionIcon}>⌚</Text>
          <Text style={hm.connectionLabel}>스마트워치</Text>
          <View style={[hm.connectionBadge, hm.badgeOff]}>
            <Text style={[hm.badgeText, hm.badgeTextOff]}>웹 모드</Text>
          </View>
        </View>

        <View style={hm.divider} />

        <View style={hm.connectionRow}>
          <Text style={hm.connectionIcon}>🔄</Text>
          <Text style={hm.connectionLabel}>마지막 데이터</Text>
          <Text style={hm.connectionTime}>{health.lastUpdated || '대기 중'}</Text>
        </View>

        <View style={hm.divider} />

        <View style={hm.connectionRow}>
          <Text style={hm.connectionIcon}>🌐</Text>
          <Text style={hm.connectionLabel}>서버 통신</Text>
          <View style={[hm.connectionBadge, hm.badgeOn]}>
            <Text style={[hm.badgeText, hm.badgeTextOn]}>정상</Text>
          </View>
        </View>
      </View>

      <View style={hm.webNotice}>
        <Text style={hm.webNoticeText}>
          웹 버전에서는 실시간 심박/GPS 수집이 불가합니다.{'\n'}
          Android 앱에서 워치를 연결하면 실시간 모니터링이 시작됩니다.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ──────────── 설정 화면 ──────────── */

function SettingsScreen({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  return (
    <ScrollView style={st.container} contentContainerStyle={st.scroll}>
      <View style={st.card}>
        <Text style={st.sectionTitle}>등록 정보</Text>
        <View style={st.row}>
          <Text style={st.rowLabel}>이름</Text>
          <Text style={st.rowValue}>{user.name}</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>전화번호</Text>
          <Text style={st.rowValue}>{user.phone}</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>사용자 ID</Text>
          <Text style={st.rowValueSmall}>{user.id.slice(0, 8)}...</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>기기 ID</Text>
          <Text style={st.rowValueSmall}>{user.device_id}</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>기준 심박</Text>
          <Text style={st.rowValue}>{user.baseline_bpm} BPM</Text>
        </View>
      </View>

      <View style={st.card}>
        <Text style={st.sectionTitle}>모니터링 (Android 앱)</Text>
        <View style={st.row}>
          <Text style={st.rowLabel}>심박 수집 주기</Text>
          <Text style={st.rowValue}>10초</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>GPS 수집 주기</Text>
          <Text style={st.rowValue}>5분 (이상 시 30초)</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>데이터 전송 주기</Text>
          <Text style={st.rowValue}>10분</Text>
        </View>
      </View>

      <View style={st.card}>
        <Text style={st.sectionTitle}>앱 정보</Text>
        <View style={st.row}>
          <Text style={st.rowLabel}>버전</Text>
          <Text style={st.rowValue}>1.0.0</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>서버</Text>
          <Text style={st.rowValueSmall}>daro-reporter-production.up.railway.app</Text>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Text style={st.rowLabel}>플랫폼</Text>
          <Text style={st.rowValue}>웹 미리보기</Text>
        </View>
      </View>

      <TouchableOpacity style={st.dangerBtn} onPress={onLogout}>
        <Text style={st.dangerBtnText}>등록 초기화</Text>
      </TouchableOpacity>

      <Text style={st.footer}>Hero - 농업인 안전 모니터링 시스템</Text>
    </ScrollView>
  );
}

/* ══════════════════ 스타일 ══════════════════ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8f9fa' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 8,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2d6a4f' },
  tabText: { fontSize: 15, color: '#6c757d', fontWeight: '500' },
  tabTextActive: { color: '#2d6a4f', fontWeight: '700' },
  screen: { flex: 1 },
});

const ob = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: '800', color: '#2d6a4f', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#6c757d', marginTop: 4 },
  progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#dee2e6' },
  progressDotActive: { backgroundColor: '#2d6a4f' },
  errorBox: { backgroundColor: '#fde8e8', borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { color: '#d62828', fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#6c757d', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef', marginBottom: 4 },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  genderBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', alignItems: 'center', backgroundColor: '#f8f9fa' },
  genderBtnActive: { borderColor: '#2d6a4f', backgroundColor: '#e8f5e9' },
  genderText: { fontSize: 16, color: '#6c757d' },
  genderTextActive: { color: '#2d6a4f', fontWeight: '600' },
  guardianCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 12 },
  guardianHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  guardianLabel: { fontSize: 14, fontWeight: '600', color: '#495057' },
  removeText: { fontSize: 14, color: '#e63946' },
  addBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2d6a4f', borderStyle: 'dashed', alignItems: 'center', marginBottom: 16 },
  addBtnText: { fontSize: 15, color: '#2d6a4f', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#2d6a4f', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1, borderColor: '#dee2e6', alignItems: 'center', marginTop: 16 },
  secondaryBtnText: { color: '#6c757d', fontSize: 17, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 12 },
  btnDisabled: { opacity: 0.6 },
  watchInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', borderRadius: 16, padding: 20, gap: 16, marginBottom: 8 },
  watchText: { flex: 1, fontSize: 14, color: '#2d6a4f', lineHeight: 22 },
});

const hm = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 20, paddingTop: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1a1a2e' },
  greetingSub: { fontSize: 15, color: '#6c757d', marginTop: 2 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  heartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
  heartLabel: { fontSize: 14, color: '#6c757d', fontWeight: '600', marginBottom: 8 },
  heartValue: { fontSize: 72, fontWeight: '800', letterSpacing: -2 },
  heartUnit: { fontSize: 18, color: '#6c757d', fontWeight: '600', marginTop: -4, marginBottom: 16 },
  heartBar: { width: '100%', height: 6, backgroundColor: '#e9ecef', borderRadius: 3 },
  heartBarFill: { height: 6, borderRadius: 3 },
  heartRange: { fontSize: 12, color: '#adb5bd', marginTop: 8 },
  statusCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, gap: 14, marginBottom: 16 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 17, fontWeight: '700' },
  statusDesc: { fontSize: 13, color: '#495057', marginTop: 2 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridItem: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center' },
  gridIcon: { fontSize: 28, marginBottom: 8 },
  gridValue: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  gridLabel: { fontSize: 12, color: '#6c757d', marginTop: 4 },
  connectionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 },
  connectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  connectionIcon: { fontSize: 20, marginRight: 12 },
  connectionLabel: { flex: 1, fontSize: 15, color: '#495057' },
  connectionTime: { fontSize: 14, color: '#6c757d' },
  connectionBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeOn: { backgroundColor: '#e8f5e9' },
  badgeOff: { backgroundColor: '#f0f0f0' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextOn: { color: '#2d6a4f' },
  badgeTextOff: { color: '#6c757d' },
  divider: { height: 1, backgroundColor: '#f1f3f5', marginVertical: 10 },
  webNotice: { backgroundColor: '#fff8e1', borderRadius: 12, padding: 16, marginBottom: 32 },
  webNoticeText: { fontSize: 13, color: '#795548', lineHeight: 20, textAlign: 'center' },
});

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 15, color: '#495057' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  rowValueSmall: { fontSize: 13, color: '#6c757d', maxWidth: 180 },
  divider: { height: 1, backgroundColor: '#f1f3f5', marginVertical: 12 },
  dangerBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e63946', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  dangerBtnText: { fontSize: 16, fontWeight: '600', color: '#e63946' },
  footer: { textAlign: 'center', fontSize: 13, color: '#adb5bd', marginTop: 24 },
});
