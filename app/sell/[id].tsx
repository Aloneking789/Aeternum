import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Minus, Plus, TrendingDown, Shield, Check } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/mocks/data';
import Colors from '@/constants/colors';

const SELL_FEE = 0.02;

export default function SellSharesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { investments } = useWallet();

  const investment = investments.find(inv => inv.propertyId === id);
  const [shares, setShares] = useState('1');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!investment) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Investment not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sharesNum = Math.max(0, parseInt(shares) || 0);
  const proceeds = sharesNum * investment.pricePerShare;
  const fee = proceeds * SELL_FEE;
  const netProceeds = proceeds - fee;
  const costBasis = sharesNum * (investment.purchasePrice / investment.sharesOwned);
  const pnl = netProceeds - costBasis;
  const pnlPositive = pnl >= 0;
  const canSell = sharesNum > 0 && sharesNum <= investment.sharesOwned;

  const adjust = (delta: number) => {
    const n = Math.max(1, Math.min(investment.sharesOwned, (parseInt(shares) || 0) + delta));
    setShares(String(n));
  };

  const handleConfirm = async () => {
    if (!canSell) return;
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
          <LinearGradient colors={['#00D68F', '#008F5F']} style={styles.successIconGrad}>
            <Check size={36} color={Colors.background} strokeWidth={3} />
          </LinearGradient>
        </View>
        <Text style={styles.successTitle}>Shares Sold!</Text>
        <Text style={styles.successSub}>
          {sharesNum} shares sold for{'\n'}{formatCurrency(netProceeds)} USDC
        </Text>
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
        <Text style={styles.headerTitle}>Sell Shares</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={styles.propInfo}>
          <Text style={styles.propName}>{investment.propertyName}</Text>
          <Text style={styles.propLocation}>{investment.propertyLocation}</Text>
          <Text style={styles.ownedText}>You own {investment.sharesOwned} shares</Text>
        </View>

        <View style={styles.sharesSection}>
          <Text style={styles.sharesLabel}>Shares to Sell</Text>
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
              style={[styles.adjBtn, sharesNum >= investment.sharesOwned && styles.adjBtnDisabled]}
              onPress={() => adjust(1)}
              disabled={sharesNum >= investment.sharesOwned}
            >
              <Plus size={18} color={sharesNum >= investment.sharesOwned ? Colors.textDisabled : Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.sharesSliderInfo}>
            <Text style={styles.sharesRemaining}>
              Remaining after sale: {investment.sharesOwned - sharesNum} shares
            </Text>
          </View>
        </View>

        <View style={styles.calcCard}>
          <Text style={styles.calcTitle}>Sale Summary</Text>
          {[
            { label: 'Shares to Sell', value: sharesNum.toLocaleString() },
            { label: 'Current Price/Share', value: formatCurrency(investment.pricePerShare) },
            { label: 'Gross Proceeds', value: formatCurrency(proceeds) },
            { label: `Sell Fee (${(SELL_FEE * 100).toFixed(0)}%)`, value: `-${formatCurrency(fee)}` },
          ].map((row) => (
            <View key={row.label} style={styles.calcRow}>
              <Text style={styles.calcLabel}>{row.label}</Text>
              <Text style={styles.calcVal}>{row.value}</Text>
            </View>
          ))}
          <View style={styles.calcDivider} />
          <View style={styles.calcRow}>
            <Text style={styles.calcTotalLabel}>Net Proceeds (USDC)</Text>
            <Text style={styles.calcTotalVal}>{formatCurrency(netProceeds)}</Text>
          </View>
        </View>

        <View style={styles.pnlCard}>
          <View style={styles.pnlHeader}>
            <TrendingDown size={16} color={pnlPositive ? Colors.green : Colors.red} />
            <Text style={styles.pnlTitle}>Profit & Loss</Text>
          </View>
          <View style={styles.pnlGrid}>
            <View style={styles.pnlCell}>
              <Text style={styles.pnlCellVal}>{formatCurrency(costBasis)}</Text>
              <Text style={styles.pnlCellLabel}>Cost Basis</Text>
            </View>
            <View style={styles.pnlCell}>
              <Text style={styles.pnlCellVal}>{formatCurrency(netProceeds)}</Text>
              <Text style={styles.pnlCellLabel}>Net Proceeds</Text>
            </View>
            <View style={styles.pnlCell}>
              <Text style={[styles.pnlCellVal, { color: pnlPositive ? Colors.green : Colors.red }]}>
                {pnlPositive ? '+' : ''}{formatCurrency(pnl)}
              </Text>
              <Text style={styles.pnlCellLabel}>P&L</Text>
            </View>
          </View>
        </View>

        <View style={styles.securityRow}>
          <Shield size={14} color={Colors.green} />
          <Text style={styles.securityText}>
            USDC transferred to wallet instantly upon confirmation
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.sellBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient colors={['transparent', 'rgba(8,9,13,0.98)']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={[styles.confirmBtn, !canSell && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canSell || isConfirming}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canSell ? [Colors.red, '#CC1A35'] : [Colors.border, Colors.border]}
            style={styles.confirmBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isConfirming ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={[styles.confirmBtnText, !canSell && styles.confirmBtnTextDisabled]}>
                {canSell ? `Sell ${sharesNum} Shares · ${formatCurrency(netProceeds)}` : 'Enter shares to sell'}
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
  center: { alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 18, color: Colors.text, marginBottom: 12 },
  backLink: { fontSize: 14, color: Colors.gold },
  successScreen: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { width: 90, height: 90, borderRadius: 45, overflow: 'hidden', marginBottom: 24 },
  successIconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.text, marginBottom: 10 },
  successSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  successRedirect: { fontSize: 13, color: Colors.textDisabled },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  propInfo: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  propName: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  propLocation: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  ownedText: { fontSize: 13, color: Colors.cyan, fontWeight: '600' as const },
  sharesSection: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14, alignItems: 'center',
  },
  sharesLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 14 },
  sharesControl: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  adjBtn: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight,
  },
  adjBtnDisabled: { opacity: 0.4 },
  sharesInput: {
    width: 100, height: 56, backgroundColor: Colors.surface, borderRadius: 14,
    fontSize: 28, fontWeight: '800' as const, color: Colors.text,
    borderWidth: 1, borderColor: Colors.red, textAlign: 'center',
  },
  sharesSliderInfo: { alignItems: 'center' },
  sharesRemaining: { fontSize: 12, color: Colors.textMuted },
  calcCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  calcTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  calcLabel: { fontSize: 13, color: Colors.textMuted },
  calcVal: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  calcDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  calcTotalLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  calcTotalVal: { fontSize: 17, fontWeight: '800' as const, color: Colors.green },
  pnlCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  pnlHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  pnlTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  pnlGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  pnlCell: { alignItems: 'center' },
  pnlCellVal: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  pnlCellLabel: { fontSize: 11, color: Colors.textMuted },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  securityText: { fontSize: 12, color: Colors.textMuted, flex: 1 },
  sellBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20 },
  confirmBtn: { borderRadius: 16, overflow: 'hidden' },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnGrad: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
  confirmBtnTextDisabled: { color: Colors.textMuted },
});
