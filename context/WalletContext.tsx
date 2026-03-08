import { MOCK_INVESTMENTS, MOCK_LISTINGS, MOCK_USER } from '@/mocks/data';
import { fetchUserProfile } from '@/services/userProfile';
import { useWalletStore, WalletType } from '@/stores/wallet-store';
import type { Investment, Listing, UserProfile } from '@/types';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Buffer } from 'buffer';
import { useEffect, useState } from 'react';

const APP_IDENTITY = {
  name: 'Aeternum',
  uri: 'https://aeturnum.app',
  icon: 'favicon.ico',
};

const STORAGE_KEYS = {
  WALLET: 'aeturnum_wallet',
  PROFILE: 'aeturnum_profile',
};

export const [WalletProvider, useWallet] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [network, setNetwork] = useState<'devnet' | 'mainnet'>('devnet');

  // Zustand persisted store
  const walletType = useWalletStore((s) => s.walletType);
  const publicKeyBase58 = useWalletStore((s) => s.publicKeyBase58);

  const sessionQuery = useQuery({
    queryKey: ['wallet_session'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WALLET);
      if (stored) {
        const data = JSON.parse(stored);
        return data as {
          address: string;
          publicKey?: string;
          walletType?: string;
          setupComplete: boolean;
        };
      }
      return null;
    },
  });

  useEffect(() => {
    if (sessionQuery.data) {
      setIsConnected(true);
      setWalletAddress(sessionQuery.data.address);
      setIsSetupComplete(sessionQuery.data.setupComplete);
      // Also sync into zustand if it was cleared (e.g. after an app reinstall
      // where AsyncStorage persisted but Zustand storage did not)
      const store = useWalletStore.getState();
      if (sessionQuery.data.publicKey && !store.publicKeyBase58) {
        store.setWalletData({
          walletType: (sessionQuery.data.walletType ?? null) as WalletType,
          publicKeyBase58: sessionQuery.data.publicKey,
          authToken: store.authToken ?? '',
        });
      }
      console.log('[WalletContext] Session restored:', sessionQuery.data.address);
    }
  }, [sessionQuery.data]);

  const profileQuery = useQuery({
    queryKey: ['user_profile', walletAddress],
    queryFn: async () => {
      try {
        const profile = await fetchUserProfile();
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
        return profile;
      } catch (error) {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
        if (stored) return JSON.parse(stored) as UserProfile;
        throw error;
      }
    },
    enabled: isConnected,
    retry: 1,
  });

  const connectMutation = useMutation({
    mutationFn: async (selectedWalletType: string) => {
      console.log('[WalletContext] Connecting wallet:', selectedWalletType);
      const { isDevnet } = useWalletStore.getState();
      const cluster = isDevnet ? 'devnet' : 'mainnet-beta';

      const authResult = await transact(async (wallet: Web3MobileWallet) => {
        return wallet.authorize({
          chain: `solana:${cluster}`,
          identity: APP_IDENTITY,
        });
      });

      // Decode the base64 address into a proper base-58 public key
      const pubkey = new PublicKey(
        Buffer.from(authResult.accounts[0].address, 'base64')
      );
      const pubkeyBase58 = pubkey.toBase58();
      const shortAddress = `${pubkeyBase58.slice(0, 4)}...${pubkeyBase58.slice(-4)}`;

      // Persist full wallet data in Zustand (AsyncStorage-backed)
      useWalletStore.getState().setWalletData({
        walletType: selectedWalletType as WalletType,
        publicKeyBase58: pubkeyBase58,
        authToken: authResult.auth_token ?? '',
      });

      // Also keep a lightweight session key for the session query
      await AsyncStorage.setItem(
        STORAGE_KEYS.WALLET,
        JSON.stringify({
          address: shortAddress,
          publicKey: pubkeyBase58,
          walletType: selectedWalletType,
          setupComplete: false,
        }),
      );

      return shortAddress;
    },
    onSuccess: (address) => {
      setIsConnected(true);
      setWalletAddress(address);
      setIsSetupComplete(false);
      queryClient.invalidateQueries({ queryKey: ['wallet_session'] });
      console.log('[WalletContext] Connected:', address);
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      console.log('[WalletContext] Setup profile:', data);
      const profile: UserProfile = {
        ...MOCK_USER,
        ...data,
        walletAddress: walletAddress ?? '',
      };
      const { publicKeyBase58: pk, walletType: wt } = useWalletStore.getState();
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      await AsyncStorage.setItem(
        STORAGE_KEYS.WALLET,
        JSON.stringify({
          address: walletAddress,
          publicKey: pk,
          walletType: wt,
          setupComplete: true,
        }),
      );
      useWalletStore.getState().setSetupComplete(true);
      return profile;
    },
    onSuccess: () => {
      setIsSetupComplete(true);
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
      console.log('[WalletContext] Setup complete');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      console.log('[WalletContext] Disconnecting wallet');
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET);
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE);
      useWalletStore.getState().clearWallet();
    },
    onSuccess: () => {
      setIsConnected(false);
      setWalletAddress(null);
      setIsSetupComplete(false);
      queryClient.invalidateQueries({ queryKey: ['wallet_session'] });
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
    },
  });

  const claimYieldMutation = useMutation({
    mutationFn: async (amount: number) => {
      console.log('[WalletContext] Claiming yield:', amount);
      await new Promise(r => setTimeout(r, 2000));
      return amount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
    },
  });

  const investments: Investment[] = MOCK_INVESTMENTS;
  const listings: Listing[] = MOCK_LISTINGS;
  const profile = profileQuery.data ?? {
    ...MOCK_USER,
    walletAddress: publicKeyBase58 ?? walletAddress ?? MOCK_USER.walletAddress,
  };

  const totalPortfolioValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalInvested = investments.reduce((sum, inv) => sum + inv.purchasePrice, 0);
  const totalYieldEarned = investments.reduce((sum, inv) => sum + inv.yieldEarned, 0);
  const totalClaimable = investments.reduce((sum, inv) => sum + inv.claimableYield, 0);
  const overallROI = totalInvested > 0
    ? ((totalPortfolioValue + totalYieldEarned - totalInvested) / totalInvested) * 100
    : 0;

  return {
    isConnected,
    isLoading: sessionQuery.isLoading,
    walletAddress,
    publicKeyBase58,
    walletType,
    isSetupComplete,
    profile,
    investments,
    listings,
    totalPortfolioValue,
    totalInvested,
    totalYieldEarned,
    totalClaimable,
    overallROI,
    darkMode,
    biometrics,
    notifications,
    network,
    setDarkMode,
    setBiometrics,
    setNotifications,
    setNetwork,
    connect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    setup: setupMutation.mutateAsync,
    isSettingUp: setupMutation.isPending,
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    claimYield: claimYieldMutation.mutateAsync,
    isClaiming: claimYieldMutation.isPending,
  };
});
