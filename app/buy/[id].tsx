import Colors from '@/constants/colors';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/mocks/data';
import { fetchPropertyById } from '@/services/property';
import {
  confirmTransaction,
  fetchPropertyQuote,
  initiateBuyTransaction,
  type PropertyQuote,
} from '@/services/transactions';
import { useWalletStore } from '@/stores/wallet-store';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { clusterApiUrl, Connection, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Minus, Plus, Shield, Wallet, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GAS_FEE = 0.000005;

const APP_IDENTITY = {
  name: 'Aeternum',
  uri: 'https://aeturnum.app',
  icon: 'favicon.ico',
};

async function sendAndConfirmWithFallback(
  serializedTx: Uint8Array,
  isDevnet: boolean,
): Promise<{ signature: string; endpoint: string }> {
  const devnetFallbacks = (process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC_FALLBACKS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const mainnetFallbacks = (process.env.EXPO_PUBLIC_SOLANA_MAINNET_RPC_FALLBACKS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const endpoints = isDevnet
    ? [
      process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC_URL?.trim(),
      ...devnetFallbacks,
      clusterApiUrl('devnet'),
      'https://api.devnet.solana.com',
    ]
    : [
      process.env.EXPO_PUBLIC_SOLANA_MAINNET_RPC_URL?.trim(),
      ...mainnetFallbacks,
      clusterApiUrl('mainnet-beta'),
      'https://api.mainnet-beta.solana.com',
    ];

  const uniqueEndpoints = Array.from(new Set(endpoints.filter((endpoint): endpoint is string => !!endpoint)));
  const failures: string[] = [];

  for (const endpoint of uniqueEndpoints) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const signature = await connection.sendRawTransaction(serializedTx, {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, endpoint };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${endpoint}: ${message}`);
      console.error('[Buy] RPC endpoint failed', { endpoint, error: message });
    }
  }

  throw new Error(`All RPC endpoints failed. ${failures.join(' | ')}`);
}

export default function BuySharesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { publicKeyBase58, isConnected } = useWallet();
  const isDevnet = useWalletStore((s) => s.isDevnet);

  const [property, setProperty] = useState<Awaited<ReturnType<typeof fetchPropertyById>>>(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [propertyLoadError, setPropertyLoadError] = useState('');

  const [shares, setShares] = useState('1');
  const [quote, setQuote] = useState<PropertyQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionError, setTransactionError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadProperty = async () => {
      try {
        setIsLoadingProperty(true);
        setPropertyLoadError('');
        const data = await fetchPropertyById(id);
        if (mounted) {
          setProperty(data);
          if (!data) {
            setPropertyLoadError('Property not found');
          }
        }
      } catch (error) {
        if (mounted) {
          setPropertyLoadError(error instanceof Error ? error.message : 'Unable to load property');
        }
      } finally {
        if (mounted) {
          setIsLoadingProperty(false);
        }
      }
    };

    if (id) {
      loadProperty();
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  const sharesNum = Math.max(0, parseInt(shares) || 0);
  const availableShares = quote?.availableShares ?? property?.availableShares ?? 0;

  useEffect(() => {
    let mounted = true;

    const loadQuote = async () => {
      if (!property || sharesNum <= 0) {
        setQuote(null);
        setQuoteError('');
        return;
      }

      try {
        setIsLoadingQuote(true);
        setQuoteError('');
        console.log('[Buy] quote request', { propertyId: property.id, shares: sharesNum });
        const data = await fetchPropertyQuote(property.id, sharesNum);
        if (mounted) {
          setQuote(data);
          console.log('[Buy] quote response', data);
        }
      } catch (error) {
        console.error('[Buy] quote error', {
          propertyId: property.id,
          shares: sharesNum,
          error: error instanceof Error ? error.message : error,
        });
        if (mounted) {
          setQuoteError(error instanceof Error ? error.message : 'Unable to fetch quote');
          setQuote(null);
        }
      } finally {
        if (mounted) {
          setIsLoadingQuote(false);
        }
      }
    };

    loadQuote();

    return () => {
      mounted = false;
    };
  }, [property, sharesNum]);

  const totalCost = quote?.usdcRequired ?? sharesNum * (property?.pricePerShare ?? 0);
  const platformFee = quote?.platformFee ?? 0;
  const platformFeeRate = quote?.platformFeeRate ?? 0;
  const annualYield = totalCost * ((property?.yieldPercent ?? 0) / 100);
  const ownershipPct = property
    ? ((sharesNum / Math.max(1, property.totalShares)) * 100).toFixed(4)
    : '0.0000';

  const canBuy = useMemo(() => {
    if (!property || !publicKeyBase58 || !isConnected) return false;
    if (!isDevnet) return false;
    if (sharesNum <= 0 || sharesNum > availableShares) return false;
    if (isLoadingQuote || !!quoteError) return false;
    return true;
  }, [property, publicKeyBase58, isConnected, isDevnet, sharesNum, availableShares, isLoadingQuote, quoteError]);

  const adjust = (delta: number) => {
    const n = Math.max(1, Math.min(availableShares, (parseInt(shares) || 0) + delta));
    setShares(String(n));
  };

  const handleConfirm = async () => {
    if (!canBuy || !property || !publicKeyBase58) return;

    let stage = 'init';

    try {
      setIsConfirming(true);
      setTransactionError('');

      console.log('[Buy] initiate request', {
        propertyId: property.id,
        shares: sharesNum,
        walletAddress: publicKeyBase58,
      });

      stage = 'initiate-buy';
      const initiated = await initiateBuyTransaction({
        propertyId: property.id,
        shares: sharesNum,
        walletAddress: publicKeyBase58,
      });

      console.log('[Buy] initiate response', {
        escrowPDA: initiated.escrowPDA,
        usdcAmount: initiated.usdcAmount,
        platformFee: initiated.platformFee,
        unsignedTxLength: initiated.unsignedTx?.length ?? 0,
      });

      stage = 'wallet-sign-and-send';
      const signature = await transact(async (wallet: Web3MobileWallet) => {
        const walletState = useWalletStore.getState();
        const chain = walletState.isDevnet ? 'solana:devnet' : 'solana:mainnet-beta';

        const authResult = await wallet.authorize({
          chain,
          identity: APP_IDENTITY,
          auth_token: walletState.authToken ?? undefined,
        });

        if (walletState.walletType && walletState.publicKeyBase58) {
          walletState.setWalletData({
            walletType: walletState.walletType,
            publicKeyBase58: walletState.publicKeyBase58,
            authToken: authResult.auth_token ?? walletState.authToken ?? '',
          });
        }

        const unsignedTxBytes = Buffer.from(initiated.unsignedTx, 'base64');
        const unsignedTx = VersionedTransaction.deserialize(unsignedTxBytes);

        // Prefer wallet-native submit path to avoid device RPC reachability issues.
        const maybeSignAndSend = (
          wallet as unknown as {
            signAndSendTransactions?: (args: { transactions: VersionedTransaction[] }) => Promise<{ signatures: Array<string | Uint8Array> }>;
          }
        ).signAndSendTransactions;

        if (typeof maybeSignAndSend === 'function') {
          const walletSendResult = await maybeSignAndSend({ transactions: [unsignedTx] });
          const walletSig = Array.isArray(walletSendResult)
            ? walletSendResult[0]
            : walletSendResult?.signatures?.[0];

          if (typeof walletSig === 'string' && walletSig.length > 0) {
            console.log('[Buy] tx sent via wallet-native submit', { txSignature: walletSig });
            return walletSig;
          }

          if (walletSig instanceof Uint8Array && walletSig.length > 0) {
            const derivedSig = bs58.encode(walletSig);
            console.log('[Buy] tx sent via wallet-native submit (Uint8Array signature)', { txSignature: derivedSig });
            return derivedSig;
          }

          // Some wallets submit successfully but don't return signatures in the adapter response.
          const txSignatureBytes = unsignedTx.signatures?.[0];
          if (txSignatureBytes instanceof Uint8Array && txSignatureBytes.some((b) => b !== 0)) {
            const derivedSig = bs58.encode(txSignatureBytes);
            console.log('[Buy] tx sent via wallet-native submit (derived from tx signature bytes)', { txSignature: derivedSig });
            return derivedSig;
          }

          console.log('[Buy] wallet-native submit result missing signature; not falling back to app RPC to avoid duplicate send', {
            signatureType: typeof walletSig,
            rawResult: walletSendResult,
          });

          throw new Error(
            'Wallet submitted transaction but did not return a signature. Check wallet history for the tx signature and confirm manually.',
          );
        }

        const signedTxs = await wallet.signTransactions({ transactions: [unsignedTx] });

        if (!signedTxs?.[0]) {
          throw new Error('Wallet returned no signed transaction');
        }

        const result = await sendAndConfirmWithFallback(
          signedTxs[0].serialize(),
          walletState.isDevnet,
        );

        console.log('[Buy] tx sent+confirmed via app RPC', { txSignature: result.signature, endpoint: result.endpoint });
        return result.signature;
      });

      stage = 'confirm-buy';
      const confirmPayload = {
        txSignature: signature,
        propertyId: property.id,
        shares: sharesNum,
        side: 'buy',
      } as const;

      console.log('[Buy] confirm request', confirmPayload);
      console.log('[Buy] backend confirm payload JSON', JSON.stringify(confirmPayload));

      const confirmResponse = await confirmTransaction(confirmPayload);

      console.log('[Buy] confirm success', { txSignature: signature, response: confirmResponse });
      console.log('[Buy] backend confirm response JSON', JSON.stringify(confirmResponse));

      setIsSuccess(true);
      setTimeout(() => router.replace('/(tabs)/investments' as any), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Buy transaction failed';
      const rpcBlocked = stage === 'wallet-sign-and-send' && message.includes('All RPC endpoints failed');
      const finalMessage = rpcBlocked
        ? `${message}\n\nYour device cannot reach Solana RPC. Set EXPO_PUBLIC_SOLANA_DEVNET_RPC_URL (or EXPO_PUBLIC_SOLANA_DEVNET_RPC_FALLBACKS) to a reachable endpoint, or disable VPN/Private DNS.`
        : message;

      console.error('[Buy] transaction error', {
        stage,
        propertyId: property.id,
        shares: sharesNum,
        walletAddress: publicKeyBase58,
        error: finalMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      const stagedMessage = `[${stage}] ${finalMessage}`;
      setTransactionError(stagedMessage);
      Alert.alert('Transaction failed', stagedMessage);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoadingProperty) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>{propertyLoadError || 'Property not found'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
              <Text style={styles.walletLabel}>Connected Wallet</Text>
              <Text style={styles.walletBalance}>{publicKeyBase58 ? `${publicKeyBase58.slice(0, 4)}...${publicKeyBase58.slice(-4)}` : 'Not connected'}</Text>
            </View>
          </View>
          <View style={[styles.networkBadge, { backgroundColor: Colors.greenGlow }]}>
            <View style={styles.greenDot} />
            <Text style={styles.networkText}>{isDevnet ? 'Devnet' : 'Mainnet'}</Text>
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
              disabled={sharesNum >= availableShares}
            >
              <Plus size={18} color={sharesNum >= availableShares ? Colors.textDisabled : Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sharesAvail}>
            Max available: {availableShares.toLocaleString()} shares
          </Text>
        </View>

        <View style={styles.calcCard}>
          <Text style={styles.calcTitle}>Order Summary</Text>
          {[
            { label: 'Shares', value: sharesNum.toLocaleString() },
            { label: 'Price per Share', value: formatCurrency(quote?.pricePerShare ?? property.pricePerShare) },
            { label: 'Subtotal', value: formatCurrency(totalCost) },
            { label: `Platform Fee (${(platformFeeRate / 100).toFixed(2)}%)`, value: formatCurrency(platformFee) },
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
            <Text style={styles.calcTotalVal}>{formatCurrency(totalCost + platformFee)}</Text>
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

        {(quoteError || transactionError || !isConnected || !isDevnet) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {quoteError || transactionError || (!isConnected
                ? 'Connect wallet first to buy shares.'
                : 'Switch to devnet mode to execute this flow.')}
            </Text>
          </View>
        )}

        {isLoadingQuote && (
          <View style={styles.loadingInline}>
            <ActivityIndicator color={Colors.gold} size="small" />
            <Text style={styles.loadingInlineText}>Refreshing quote...</Text>
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
                {canBuy
                  ? `Confirm · ${formatCurrency(totalCost + platformFee)}`
                  : sharesNum === 0
                    ? 'Enter shares amount'
                    : !isConnected
                      ? 'Connect Wallet'
                      : !isDevnet
                        ? 'Switch to Devnet'
                        : 'Invalid amount'}
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
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  loadingInlineText: { fontSize: 12, color: Colors.textMuted },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  securityText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', flex: 1 },
  buyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20 },
  confirmBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
  confirmBtnDisabled: { shadowOpacity: 0 },
  confirmBtnGrad: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 17, fontWeight: '700' as const, color: Colors.background },
  confirmBtnTextDisabled: { color: Colors.textMuted },
});
