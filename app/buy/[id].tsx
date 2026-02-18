import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Minus, Plus, Wallet, Zap, Shield, Check } from 'lucide-react-native';
import { MOCK_PROPERTIES, formatCurrency } from '@/mocks/data';
import Colors from '@/constants/colors';

const PLATFORM_FEE = 0.015;
const GAS_FEE = 0.000005;
const MOCK_USDC_BALANCE = 25000;

export default function BuySharesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shares, setShares] = useState('1');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const property = MOCK_PROPERTIES.find(p => p.id === id);
  if (!property) return null;

  const sharesNum = Math.max(0, parseInt(shares) || 0);
  const totalCost = sharesNum * property.pricePerShare;
  const platformFee = totalCost * PLATFORM_FEE;
  const annualYield = totalCost * (property.yieldPercent / 100);
  const ownershipPct = (sharesNum / property.totalShares * 100).toFixed(4);
  const totalWithFee = totalCost + platformFee;
  const canAfford = MOCK_USDC_BALANCE >= totalWithFee;
  const canBuy = sharesNum > 0 && sharesNum <= property.availableShares && canAfford;

  const adjust = (delta: number) => {
    const n = Math.max(1, Math.min(property.availableShares, (parseInt(shares) || 0) + delta));
    setShares(String(n));
  };

  const handleConfirm = async () => {
    if (!canBuy) return;
    setIsConfirming(true);
    await new Promise(r => setTimeout(r, 2500));
    setIsConfirming(false);
    setIsSuccess(true);
    setTimeout(() => router.replace('/(tabs)/investments' as any), 2000);
  };

  if (isSuccess) {
    return (
      <View style={[styles.successScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />
        <View style={styles.successIcon}>
          <LinearGradient colors={['#D4AF37', '#A88C28']} style={styles.successIconGrad}>
            <Check size={36} color={Colors.background} strokeWidth={3} />
          </LinearGradient>
        </View>
        <Text style={styles.successTitle}>Purchase Complete!</Text>
        <Text style={styles.successSub}>
          You now own {sharesNum} shares of{'\n'}{property.name}
        </Text>
        <View style={styles.successStats}>
          <View style={styles.successStat}>
            <Text style={styles.successStatVal}>{formatCurrency(totalCost)}</Text>
            <Text style={styles.successStatLabel}>Invested</Text>
          </View>
          <View style={styles.successStat}>
            <Text style={[styles.successStatVal, { color: Colors.green }]}>
              ~{formatCurrency(annualYield / 12)}/mo
            </Text>
            <Text style={styles.successStatLabel}>Est. Monthly Yield</Text>
          </View>
        </View>
        <Text style={styles.successRedirect}>Redirecting to portfolio...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Shares</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={styles.propInfo}>
          <Text style={styles.propName}>{property.name}</Text>
          <Text style={styles.propLocation}>{property.location}</Text>
          <View style={styles.yieldChip}>
            <Zap size={12} color={Colors.green} />
            <Text style={styles.yieldChipText}>{property.yieldPercent}% APY</Text>
          </View>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletLeft}>
            <View style={styles.walletIcon}>
              <Wallet size={18} color={Colors.gold} />
            </View>
            <View>
              <Text style={styles.walletLabel}>USDC Balance</Text>
              <Text style={styles.walletBalance}>{formatCurrency(MOCK_USDC_BALANCE)}</Text>
            </View>
          </View>
          <View style={[styles.networkBadge, { backgroundColor: Colors.greenGlow }]}>
            <View style={styles.greenDot} />
            <Text style={styles.networkText}>Devnet</Text>
          </View>
        </View>

        <View style={styles.sharesSection}>
          <Text style={styles.sharesLabel}>Number of Shares</Text>
          <View style={styles.sharesControl}>
            <TouchableOpacity
              style={[styles.adjBtn, sharesNum <= 1 && styles.adjBtnDisabled]}
              onPress={() => adjust(-1)}
              disabled={sharesNum <= 1}
            >
              <Minus size={18} color={sharesNum <= 1 ? Colors.textDisabled : Colors.text} />
            </TouchableOpacity>
            <TextInput
              style={styles.sharesInput}
              value={shares}
              onChangeText={(v) => setShares(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.adjBtn, sharesNum >= property.availableShares && styles.adjBtnDisabled]}
              onPress={() => adjust(1)}
              disabled={sharesNum >= property.availableShares}
            >
              <Plus size={18} color={sharesNum >= property.availableShares ? Colors.textDisabled : Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sharesAvail}>
            Max available: {property.availableShares.toLocaleString()} shares
          </Text>
        </View>

        <View style={styles.calcCard}>
          <Text style={styles.calcTitle}>Order Summary</Text>
          {[
            { label: 'Shares', value: sharesNum.toLocaleString() },
            { label: 'Price per Share', value: formatCurrency(property.pricePerShare) },
            { label: 'Subtotal', value: formatCurrency(totalCost) },
            { label: `Platform Fee (${(PLATFORM_FEE * 100).toFixed(1)}%)`, value: formatCurrency(platformFee) },
            { label: 'Gas Fee (SOL)', value: `~${GAS_FEE} SOL` },
          ].map((row) => (
            <View key={row.label} style={styles.calcRow}>
              <Text style={styles.calcLabel}>{row.label}</Text>
              <Text style={styles.calcVal}>{row.value}</Text>
            </View>
          ))}
          <View style={styles.calcDivider} />
          <View style={styles.calcRow}>
            <Text style={styles.calcTotalLabel}>Total Cost</Text>
            <Text style={styles.calcTotalVal}>{formatCurrency(totalWithFee)}</Text>
          </View>
        </View>

        <View style={styles.projCard}>
          <Text style={styles.projTitle}>Investment Projections</Text>
          <View style={styles.projGrid}>
            {[
              { label: 'Annual Yield', value: formatCurrency(annualYield), color: Colors.green },
              { label: 'Monthly Yield', value: formatCurrency(annualYield / 12), color: Colors.green },
              { label: 'Ownership', value: `${ownershipPct}%`, color: Colors.gold },
              { label: 'Shares', value: sharesNum.toLocaleString(), color: Colors.cyan },
            ].map((p) => (
              <View key={p.label} style={styles.projCell}>
                <Text style={[styles.projVal, { color: p.color }]}>{p.value}</Text>
                <Text style={styles.projLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!canAfford && sharesNum > 0 && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              Insufficient USDC balance. Need {formatCurrency(totalWithFee - MOCK_USDC_BALANCE)} more.
            </Text>
          </View>
        )}

        <View style={styles.securityRow}>
          <Shield size={14} color={Colors.green} />
          <Text style={styles.securityText}>
            Transaction signed locally · Non-custodial · Instant settlement
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.buyBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient colors={['transparent', 'rgba(8,9,13,0.98)']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={[styles.confirmBtn, !canBuy && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canBuy || isConfirming}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canBuy ? ['#D4AF37', '#A88C28'] : [Colors.border, Colors.border]}
            style={styles.confirmBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isConfirming ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Text style={[styles.confirmBtnText, !canBuy && styles.confirmBtnTextDisabled]}>
                {canBuy ? `Confirm · ${formatCurrency(totalWithFee)}` : sharesNum === 0 ? 'Enter shares amount' : !canAfford ? 'Insufficient Balance' : 'Invalid amount'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  successScreen: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { width: 90, height: 90, borderRadius: 45, overflow: 'hidden', marginBottom: 24, shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20 },
  successIconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.text, marginBottom: 10 },
  successSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successStats: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  successStat: { alignItems: 'center' },
  successStatVal: { fontSize: 20, fontWeight: '700' as const, color: Colors.gold, marginBottom: 4 },
  successStatLabel: { fontSize: 12, color: Colors.textMuted },
  successRedirect: { fontSize: 13, color: Colors.textDisabled },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  propInfo: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  propName: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  propLocation: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  yieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.greenGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.green,
  },
  yieldChipText: { fontSize: 12, color: Colors.green, fontWeight: '600' as const },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.goldGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  walletBalance: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.green,
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  networkText: { fontSize: 12, color: Colors.green, fontWeight: '600' as const },
  sharesSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    alignItems: 'center',
  },
  sharesLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 14 },
  sharesControl: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
  adjBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  adjBtnDisabled: { opacity: 0.4 },
  sharesInput: {
    width: 100,
    height: 56,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.gold,
    textAlign: 'center',
  },
  sharesAvail: { fontSize: 12, color: Colors.textMuted },
  calcCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  calcTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  calcLabel: { fontSize: 13, color: Colors.textMuted },
  calcVal: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  calcDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  calcTotalLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  calcTotalVal: { fontSize: 17, fontWeight: '800' as const, color: Colors.gold },
  projCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  projTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
  projGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  projCell: { width: '50%', alignItems: 'flex-start', paddingBottom: 12 },
  projVal: { fontSize: 16, fontWeight: '700' as const, marginBottom: 3 },
  projLabel: { fontSize: 11, color: Colors.textMuted },
  errorBanner: {
    backgroundColor: Colors.redGlow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.red,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: Colors.red, textAlign: 'center' },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  securityText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', flex: 1 },
  buyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20 },
  confirmBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
  confirmBtnDisabled: { shadowOpacity: 0 },
  confirmBtnGrad: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 17, fontWeight: '700' as const, color: Colors.background },
  confirmBtnTextDisabled: { color: Colors.textMuted },
});
