import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, MapPin, Users, TrendingUp, ChevronRight } from 'lucide-react-native';
import { MOCK_PROPERTIES, formatCurrency } from '@/mocks/data';
import type { Property } from '@/types';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const CARD_W = width - 40;

const FILTER_TYPES = ['All', 'Residential', 'Commercial', 'Industrial', 'Mixed-Use'];
const SORT_OPTIONS = [
  { label: 'Yield ↓', value: 'yield' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
];

function PropertyCard({ property, onPress }: { property: Property; onPress: () => void }) {
  const availPct = ((property.availableShares / property.totalShares) * 100).toFixed(0);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: property.image }} style={styles.cardImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(8,9,13,0.85)']}
          style={styles.cardImageOverlay}
        />
        <View style={styles.yieldBadge}>
          <TrendingUp size={11} color={Colors.background} />
          <Text style={styles.yieldBadgeText}>{property.yieldPercent}% APY</Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{property.type}</Text>
        </View>
        {property.status === 'sold_out' && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{property.name}</Text>
        <View style={styles.cardLocation}>
          <MapPin size={12} color={Colors.textMuted} />
          <Text style={styles.cardLocationText}>{property.location}</Text>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Text style={styles.cardStatVal}>{formatCurrency(property.pricePerShare)}</Text>
            <Text style={styles.cardStatLabel}>per share</Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <Text style={styles.cardStatVal}>{formatCurrency(property.totalValuation, true)}</Text>
            <Text style={styles.cardStatLabel}>valuation</Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <View style={styles.investorsRow}>
              <Users size={11} color={Colors.textMuted} />
              <Text style={styles.cardStatVal}>{property.totalInvestors.toLocaleString()}</Text>
            </View>
            <Text style={styles.cardStatLabel}>investors</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Available</Text>
            <Text style={styles.progressPct}>{availPct}%</Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              style={[styles.progressFill, { width: `${availPct}%` as any }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.investBtn} onPress={onPress} activeOpacity={0.85}>
          <LinearGradient
            colors={['#D4AF37', '#A88C28']}
            style={styles.investBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.investBtnText}>View & Invest</Text>
            <ChevronRight size={16} color={Colors.background} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState('yield');

  const filtered = useMemo(() => {
    let list = [...MOCK_PROPERTIES];
    if (search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.city.toLowerCase().includes(search.toLowerCase()) ||
        p.country.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedType !== 'All') {
      list = list.filter(p => p.type === selectedType);
    }
    switch (sortBy) {
      case 'yield': list.sort((a, b) => b.yieldPercent - a.yieldPercent); break;
      case 'price_asc': list.sort((a, b) => a.pricePerShare - b.pricePerShare); break;
      case 'price_desc': list.sort((a, b) => b.pricePerShare - a.pricePerShare); break;
    }
    return list;
  }, [search, selectedType, sortBy]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={styles.title}>Explore Properties</Text>
        <Text style={styles.subtitle}>{MOCK_PROPERTIES.length} tokenized assets worldwide</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, city, country..."
            placeholderTextColor={Colors.textDisabled}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <SlidersHorizontal size={18} color={Colors.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFilterRow}
      >
        {FILTER_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, selectedType === t && styles.typeChipActive]}
            onPress={() => setSelectedType(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeChipText, selectedType === t && styles.typeChipTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.resultCount}>{filtered.length} results</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SORT_OPTIONS.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.sortChip, sortBy === s.value && styles.sortChipActive]}
              onPress={() => setSortBy(s.value)}
            >
              <Text style={[styles.sortChipText, sortBy === s.value && styles.sortChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {filtered.map(p => (
          <PropertyCard
            key={p.id}
            property={p}
            onPress={() => router.push(`/property/${p.id}` as any)}
          />
        ))}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏛️</Text>
            <Text style={styles.emptyTitle}>No properties found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 14, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textMuted },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  typeFilterRow: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: Colors.goldGlow,
    borderColor: Colors.gold,
  },
  typeChipText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' as const },
  typeChipTextActive: { color: Colors.gold, fontWeight: '700' as const },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  resultCount: { fontSize: 12, color: Colors.textMuted, flexShrink: 0 },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.card,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: { backgroundColor: Colors.surface, borderColor: Colors.cyan },
  sortChipText: { fontSize: 12, color: Colors.textMuted },
  sortChipTextActive: { color: Colors.cyan, fontWeight: '600' as const },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: CARD_W - 2, height: 200 },
  cardImageOverlay: { ...StyleSheet.absoluteFillObject },
  yieldBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  yieldBadgeText: { fontSize: 12, fontWeight: '700' as const, color: Colors.background },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  typeBadgeText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 4,
  },
  cardBody: { padding: 16 },
  cardName: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 6 },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  cardLocationText: { fontSize: 13, color: Colors.textMuted },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatVal: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, marginBottom: 2 },
  cardStatLabel: { fontSize: 10, color: Colors.textMuted },
  investorsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardStatDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  progressSection: { marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: Colors.textMuted },
  progressPct: { fontSize: 12, color: Colors.gold, fontWeight: '600' as const },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  investBtn: { borderRadius: 12, overflow: 'hidden' },
  investBtnGrad: {
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  investBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.background },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
