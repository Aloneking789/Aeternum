import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { MOCK_USER, MOCK_INVESTMENTS, MOCK_LISTINGS, generateWalletAddress } from '@/mocks/data';
import type { UserProfile, Investment, Listing } from '@/types';

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

  const sessionQuery = useQuery({
    queryKey: ['wallet_session'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WALLET);
      if (stored) {
        const data = JSON.parse(stored);
        return data as { address: string; setupComplete: boolean };
      }
      return null;
    },
  });

  useEffect(() => {
    if (sessionQuery.data) {
      setIsConnected(true);
      setWalletAddress(sessionQuery.data.address);
      setIsSetupComplete(sessionQuery.data.setupComplete);
      console.log('[WalletContext] Session restored:', sessionQuery.data.address);
    }
  }, [sessionQuery.data]);

  const profileQuery = useQuery({
    queryKey: ['user_profile', walletAddress],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) return JSON.parse(stored) as UserProfile;
      return { ...MOCK_USER, walletAddress: walletAddress ?? MOCK_USER.walletAddress };
    },
    enabled: isConnected,
  });

  const connectMutation = useMutation({
    mutationFn: async (walletType: string) => {
      console.log('[WalletContext] Connecting wallet:', walletType);
      await new Promise(r => setTimeout(r, 1500));
      const address = generateWalletAddress();
      const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify({
        address: shortAddress,
        setupComplete: false,
      }));
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
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify({
        address: walletAddress,
        setupComplete: true,
      }));
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
  const profile = profileQuery.data ?? MOCK_USER;

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
