import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Layers, DollarSign, Percent, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';

const DIST_OPTIONS = ['Monthly', 'Quarterly'];

export default function ListStep2Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tokenizationAmount, setTokenizationAmount] = useState('');
  const [totalShares, setTotalShares] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [minInvestment, setMinInvestment] = useState('');
  const [projectedYield, setProjectedYield] = useState('');
  const [distribution, setDistribution] = useState('Monthly');
  const [lockupPeriod, setLockupPeriod] = useState('');
  const [governanceEnabled, setGovernanceEnabled] = useState(false);

  useEffect(() => {
    const amount = parseFloat(tokenizationAmount) || 0;
    const shares = parseInt(totalShares) || 0;
    if (amount > 0 && shares > 0) {
      setPricePerShare((amount / shares).toFixed(2));
    }
  }, [tokenizationAmount, totalShares]);

  const canContinue = tokenizationAmount !== '' && totalShares !== ''
    && pricePerShare !== '' && projectedYield !== '' && minInvestment !== '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map(s => (
            <View key={s} style={[styles.stepDot, s === 2 && styles.stepDotActive, s < 2 && styles.stepDotDone]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>2 / 4</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tokenization</Text>
        <Text style={styles.subtitle}>Define the token structure for your property</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TOKEN STRUCTURE</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}><DollarSign size={16} color={Colors.gold} /></View>
            <View style={styles.inputFlex}>
              <Text style={styles.inputLabel}>Tokenization Amount (USD) *</Text>
              <TextInput
                style={styles.input}
                value={tokenizationAmount}
                onChangeText={setTokenizationAmount}
                placeholder="Amount to tokenize"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { marginTop: 10 }]}>
            <View style={styles.inputIcon}><Layers size={16} color={Colors.cyan} /></View>
            <View style={styles.inputFlex}>
              <Text style={styles.inputLabel}>Total Number of Shares *</Text>
              <TextInput
                style={styles.input}
                value={totalShares}
                onChangeText={setTotalShares}
                placeholder="e.g. 100000"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { marginTop: 10 }]}>
            <View style={styles.inputIcon}><DollarSign size={16} color={Colors.green} /></View>
            <View style={styles.inputFlex}>
              <Text style={styles.inputLabel}>Price per Share (USD) *</Text>
              <TextInput
                style={styles.input}
                value={pricePerShare}
                onChangeText={setPricePerShare}
                placeholder="Auto-calculated"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { marginTop: 10 }]}>
            <View style={styles.inputIcon}><DollarSign size={16} color={Colors.purple} /></View>
            <View style={styles.inputFlex}>
              <Text style={styles.inputLabel}>Minimum Investment (USD) *</Text>
              <TextInput
                style={styles.input}
                value={minInvestment}
                onChangeText={setMinInvestment}
                placeholder="e.g. 100"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YIELD DETAILS</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}><Percent size={16} color={Colors.gold} /></View>
            <View style={styles.inputFlex}>
              <Text style={styles.inputLabel}>Projected Annual Yield (%) *</Text>
              <TextInput
                style={styles.input}
                value={projectedYield}
                onChangeText={setProjectedYield}
                placeholder="e.g. 9.5"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.distSection}>
            <Text style={styles.distLabel}>Distribution Frequency</Text>
            <View style={styles.distOptions}>
              {DIST_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.distOption, distribution === opt && styles.distOptionActive]}
                  onPress={() => setDistribution(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.distOptionText, distribution === opt && styles.distOptionTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OPTIONAL</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}><Clock size={16} color={Colors.cyan} /></View>
            <View style={styles.inputFlex}>
              <Text style={styles.inputLabel}>Lockup Period (months)</Text>
              <TextInput
                style={styles.input}
                value={lockupPeriod}
                onChangeText={setLockupPeriod}
                placeholder="0 = no lockup"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setGovernanceEnabled(!governanceEnabled)}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.toggleTitle}>Enable Governance Voting</Text>
              <Text style={styles.toggleSub}>Allow shareholders to vote on property decisions</Text>
            </View>
            <View style={[styles.toggleSwitch, governanceEnabled && styles.toggleSwitchOn]}>
              <View style={[styles.toggleThumb, governanceEnabled && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {tokenizationAmount !== '' && totalShares !== '' && pricePerShare !== '' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Token Summary</Text>
            <View style={styles.summaryGrid}>
              {[
                { label: 'Raise Amount', value: `$${parseFloat(tokenizationAmount || '0').toLocaleString()}` },
                { label: 'Total Shares', value: parseInt(totalShares || '0').toLocaleString() },
                { label: 'Price/Share', value: `$${parseFloat(pricePerShare || '0').toFixed(2)}` },
                { label: 'Min Investment', value: `$${minInvestment || '—'}` },
                { label: 'Est. APY', value: projectedYield ? `${projectedYield}%` : '—' },
                { label: 'Distribution', value: distribution },
              ].map(s => (
                <View key={s.label} style={styles.summaryCell}>
                  <Text style={styles.summaryCellVal}>{s.value}</Text>
                  <Text style={styles.summaryCellLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient colors={['transparent', 'rgba(8,9,13,0.98)']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={[styles.nextBtn, !canContinue && styles.nextBtnDisabled]}
          onPress={() => router.push('/list/step3' as any)}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canContinue ? ['#D4AF37', '#A88C28'] : [Colors.border, Colors.border]}
            style={styles.nextBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.nextBtnText, !canContinue && styles.nextBtnTextDisabled]}>
              Continue to Rental Model
            </Text>
            <ArrowRight size={18} color={canContinue ? Colors.background : Colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.gold, width: 24 },
  stepDotDone: { backgroundColor: Colors.green },
  stepLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' as const },
  title: { fontSize: 26, fontWeight: '700' as const, color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 24 },
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  inputIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  inputFlex: { flex: 1 },
  inputLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2, fontWeight: '500' as const },
  input: { fontSize: 15, color: Colors.text, padding: 0 },
  distSection: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginTop: 10,
  },
  distLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 10, fontWeight: '500' as const },
  distOptions: { flexDirection: 'row', gap: 10 },
  distOption: {
    flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  distOptionActive: { backgroundColor: Colors.goldGlow, borderColor: Colors.gold },
  distOptionText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' as const },
  distOptionTextActive: { color: Colors.gold, fontWeight: '700' as const },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginTop: 10,
  },
  toggleTitle: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 3 },
  toggleSub: { fontSize: 12, color: Colors.textMuted },
  toggleSwitch: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: Colors.border,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleSwitchOn: { backgroundColor: Colors.gold },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.textMuted },
  toggleThumbOn: { backgroundColor: Colors.background, transform: [{ translateX: 18 }] },
  summaryCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.goldDark, marginBottom: 20,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryCell: { width: '50%', paddingBottom: 12 },
  summaryCellVal: { fontSize: 15, fontWeight: '700' as const, color: Colors.gold, marginBottom: 2 },
  summaryCellLabel: { fontSize: 11, color: Colors.textMuted },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20 },
  nextBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  nextBtnDisabled: { shadowOpacity: 0 },
  nextBtnGrad: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nextBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.background },
  nextBtnTextDisabled: { color: Colors.textMuted },
});
