import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { registerUser } from '../api/client';
import { useUser } from '../hooks/useUser';
import type { Guardian } from '../api/types';

export default function OnboardingScreen() {
  const { setUserInfo } = useUser();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | undefined>();
  const [birthDate, setBirthDate] = useState('');

  const [guardians, setGuardians] = useState<Guardian[]>([
    { name: '', phone: '', relation: '' },
  ]);

  const addGuardian = () => {
    setGuardians([...guardians, { name: '', phone: '', relation: '' }]);
  };

  const updateGuardian = (index: number, field: keyof Guardian, value: string) => {
    const updated = [...guardians];
    updated[index] = { ...updated[index], [field]: value };
    setGuardians(updated);
  };

  const removeGuardian = (index: number) => {
    if (guardians.length <= 1) return;
    setGuardians(guardians.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('입력 오류', '이름과 전화번호는 필수입니다.');
      return;
    }

    const validGuardians = guardians.filter((g) => g.name.trim() && g.phone.trim());

    setLoading(true);
    try {
      const deviceId = `hero-${Date.now()}`;
      const res = await registerUser({
        name: name.trim(),
        phone: phone.trim(),
        device_id: deviceId,
        gender,
        birth_date: birthDate || undefined,
        guardians: validGuardians,
      });

      await setUserInfo({
        id: res.user.id,
        name: res.user.name,
        device_id: deviceId,
        phone: res.user.phone,
        baseline_bpm: res.user.baseline_bpm,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || '등록에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.logo}>Hero</Text>
          <Text style={styles.subtitle}>농업인 안전 모니터링</Text>
        </View>

        {/* 진행 바 */}
        <View style={styles.progressBar}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.progressDot, step >= s && styles.progressDotActive]}
            />
          ))}
        </View>

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>기본 정보</Text>
            <Text style={styles.cardDesc}>어르신의 정보를 입력해주세요</Text>

            <Text style={styles.label}>이름 *</Text>
            <TextInput
              style={styles.input}
              placeholder="홍길동"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#adb5bd"
            />

            <Text style={styles.label}>전화번호 *</Text>
            <TextInput
              style={styles.input}
              placeholder="01012345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#adb5bd"
            />

            <Text style={styles.label}>성별</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                onPress={() => setGender('male')}
              >
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                  남성
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                onPress={() => setGender('female')}
              >
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                  여성
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>생년월일</Text>
            <TextInput
              style={styles.input}
              placeholder="1945-03-15"
              value={birthDate}
              onChangeText={setBirthDate}
              placeholderTextColor="#adb5bd"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.primaryBtnText}>다음</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>보호자 등록</Text>
            <Text style={styles.cardDesc}>비상 시 연락받을 보호자를 등록해주세요</Text>

            {guardians.map((g, i) => (
              <View key={i} style={styles.guardianCard}>
                <View style={styles.guardianHeader}>
                  <Text style={styles.guardianLabel}>보호자 {i + 1}</Text>
                  {guardians.length > 1 && (
                    <TouchableOpacity onPress={() => removeGuardian(i)}>
                      <Text style={styles.removeText}>삭제</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="이름"
                  value={g.name}
                  onChangeText={(v) => updateGuardian(i, 'name', v)}
                  placeholderTextColor="#adb5bd"
                />
                <TextInput
                  style={styles.input}
                  placeholder="전화번호"
                  value={g.phone}
                  onChangeText={(v) => updateGuardian(i, 'phone', v)}
                  keyboardType="phone-pad"
                  placeholderTextColor="#adb5bd"
                />
                <TextInput
                  style={styles.input}
                  placeholder="관계 (예: 아들, 딸)"
                  value={g.relation}
                  onChangeText={(v) => updateGuardian(i, 'relation', v)}
                  placeholderTextColor="#adb5bd"
                />
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={addGuardian}>
              <Text style={styles.addBtnText}>+ 보호자 추가</Text>
            </TouchableOpacity>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnText}>이전</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => setStep(3)}>
                <Text style={styles.primaryBtnText}>다음</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>워치 연결</Text>
            <Text style={styles.cardDesc}>
              Galaxy Fit 또는 스마트워치를 연결해주세요.{'\n'}
              Health Connect 앱이 설치되어 있어야 합니다.
            </Text>

            <View style={styles.watchInfo}>
              <Text style={styles.watchIcon}>⌚</Text>
              <Text style={styles.watchText}>
                설정 {'>'} Health Connect에서{'\n'}Hero 앱의 심박수/걸음수 권한을 허용해주세요
              </Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                <Text style={styles.secondaryBtnText}>이전</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>시작하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: '800', color: '#2d6a4f', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#6c757d', marginTop: 4 },
  progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#dee2e6' },
  progressDotActive: { backgroundColor: '#2d6a4f' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#6c757d', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 4,
  },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  genderBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  genderBtnActive: { borderColor: '#2d6a4f', backgroundColor: '#e8f5e9' },
  genderText: { fontSize: 16, color: '#6c757d' },
  genderTextActive: { color: '#2d6a4f', fontWeight: '600' },
  guardianCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  guardianHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  guardianLabel: { fontSize: 14, fontWeight: '600', color: '#495057' },
  removeText: { fontSize: 14, color: '#e63946' },
  addBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d6a4f',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: { fontSize: 15, color: '#2d6a4f', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#2d6a4f',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryBtnText: { color: '#6c757d', fontSize: 17, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 12 },
  btnDisabled: { opacity: 0.6 },
  watchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 8,
  },
  watchIcon: { fontSize: 40 },
  watchText: { flex: 1, fontSize: 14, color: '#2d6a4f', lineHeight: 22 },
});
