import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ALL_TASKS, SECTIONS } from '@/data/checklist-data';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { currentProject, currentUser, taskStates, projects, setFocusSection, adminMessages } = useApp();

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'admin';
  }, [currentUser]);

  const unreadCount = useMemo(() => adminMessages.filter(m => !m.read).length, [adminMessages]);

  const projectTasks = useMemo(() => {
    if (!currentProject) return [];
    return taskStates.filter(t => t.projectId === currentProject.id);
  }, [currentProject, taskStates]);

  const stats = useMemo(() => {
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const issues = projectTasks.filter(t => t.response === 'no').length;
    const overdue = projectTasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    return { total, completed, issues, overdue, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [projectTasks]);

  const sectionStats = useMemo(() => {
    return SECTIONS.filter(s => s.index <= 7).map(section => {
      const sectionTasks = ALL_TASKS.filter(t => t.sectionIndex === section.index);
      const sectionStates = projectTasks.filter(t => sectionTasks.some(st => st.uid === t.uid));
      const total = sectionStates.length;
      const completed = sectionStates.filter(t => t.status === 'completed').length;
      const issues = sectionStates.filter(t => t.response === 'no').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...section, total, completed, issues, percent };
    });
  }, [projectTasks]);

  const totalEstHours = useMemo(() => {
    const overhaulTasks = ALL_TASKS.filter(t => t.type === 'overhaul');
    return overhaulTasks.reduce((sum, t) => sum + (t.estDuration || 0), 0);
  }, []);

  const totalActHours = useMemo(() => {
    return projectTasks
      .filter(t => {
        const def = ALL_TASKS.find(d => d.uid === t.uid);
        return def?.type === 'overhaul' && t.actDuration;
      })
      .reduce((sum, t) => sum + (parseFloat(t.actDuration) || 0), 0);
  }, [projectTasks]);

  const canAddProject = useMemo(() => {
    if (!currentUser) return false;
    const username = currentUser.username.toLowerCase();
    return currentUser.role === 'admin' || username === 'admin' || username === 'darryl';
  }, [currentUser]);

  if (!currentProject) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="folder-open-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Project Selected</Text>
          <Text style={styles.emptySubtitle}>
            {currentUser?.role === 'admin' 
              ? 'Select an existing project from the settings page to get started'
              : 'Contact your administrator to be assigned to a project'}
          </Text>
          {projects.length > 0 && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/settings'); }}
              style={({ pressed }) => [styles.selectButton, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.selectButtonText}>Go to Settings</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hi, {currentUser?.username}</Text>
            <Text style={styles.projectTitle} numberOfLines={1}>{currentProject.projectName}</Text>
          </View>
          {isAdmin && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/inbox'); }}
              style={({ pressed }) => [styles.inboxButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              {unreadCount > 0 && (
                <View style={styles.inboxBadge}>
                  <Text style={styles.inboxBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.projectCard}>
          <View style={styles.projectCardRow}>
            <View style={styles.projectDetail}>
              <Text style={styles.detailLabel}>Customer</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{currentProject.customer}</Text>
            </View>
            <View style={styles.projectDetail}>
              <Text style={styles.detailLabel}>Commission #</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{currentProject.commissionNumber}</Text>
            </View>
          </View>
          <View style={styles.projectCardRow}>
            <View style={styles.projectDetail}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{currentProject.location}</Text>
            </View>
            <View style={styles.projectDetail}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{currentProject.escalatorType}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.primaryLight }]}>
            <Text style={[styles.statNumber, { color: Colors.primary }]}>{stats.percent}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.dangerLight }]}>
            <Text style={[styles.statNumber, { color: Colors.danger }]}>{stats.issues}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.warningLight }]}>
            <Text style={[styles.statNumber, { color: '#B45309' }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>

        <View style={styles.hoursCard}>
          <Text style={styles.hoursTitle}>Overhaul Hours</Text>
          <View style={styles.hoursRow}>
            <View style={styles.hoursItem}>
              <Text style={styles.hoursNumber}>{totalEstHours}h</Text>
              <Text style={styles.hoursLabel}>Estimated</Text>
            </View>
            <View style={styles.hoursDivider} />
            <View style={styles.hoursItem}>
              <Text style={[styles.hoursNumber, { color: Colors.primary }]}>{totalActHours}h</Text>
              <Text style={styles.hoursLabel}>Actual</Text>
            </View>
            <View style={styles.hoursDivider} />
            <View style={styles.hoursItem}>
              <Text style={[styles.hoursNumber, { color: totalEstHours - totalActHours >= 0 ? Colors.success : Colors.danger }]}>
                {totalEstHours - totalActHours >= 0 ? '+' : ''}{totalEstHours - totalActHours}h
              </Text>
              <Text style={styles.hoursLabel}>Variance</Text>
            </View>
          </View>
        </View>

        {!isAdmin && (
          <View style={styles.messageActions}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/compose-message', params: { type: 'message' } }); }}
              style={({ pressed }) => [styles.messageButton, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.messageIconWrap, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="mail-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.messageButtonTextWrap}>
                <Text style={styles.messageButtonTitle}>Message Admin</Text>
                <Text style={styles.messageButtonSub}>Send a message to the admin team</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/compose-message', params: { type: 'parts_request' } }); }}
              style={({ pressed }) => [styles.messageButton, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.messageIconWrap, { backgroundColor: Colors.warningLight }]}>
                <Ionicons name="construct-outline" size={20} color="#B45309" />
              </View>
              <View style={styles.messageButtonTextWrap}>
                <Text style={styles.messageButtonTitle}>Parts Request</Text>
                <Text style={styles.messageButtonSub}>Request parts with photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>
          </View>
        )}

        <Text style={styles.sectionTitle}>Progress by Section</Text>
        {sectionStats.map((section) => (
          <Pressable
            key={section.index}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFocusSection(section.index); router.push('/(tabs)/checklist'); }}
            style={({ pressed }) => [styles.sectionCard, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionName} numberOfLines={1}>
                {section.index}. {section.name}
              </Text>
              <Text style={[styles.sectionPercent, { color: section.percent === 100 ? Colors.success : section.issues > 0 ? Colors.danger : Colors.text }]}>
                {section.percent}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${section.percent}%`,
                    backgroundColor: section.percent === 100 ? Colors.success : section.issues > 0 ? Colors.danger : Colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.sectionDetail}>
              {section.completed}/{section.total} tasks{section.issues > 0 ? ` \u00B7 ${section.issues} items` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20 },
  emptyContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyContent: { alignItems: 'center', gap: 12 },
  emptyIcon: { width: 88, height: 88, borderRadius: 24, backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.text },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center', maxWidth: 280, marginBottom: 8 },
  addButtonWrapper: { alignItems: 'center', gap: 8, marginTop: 8 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  createButtonText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  buttonDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textTertiary, textAlign: 'center', maxWidth: 240 },
  selectButton: { paddingVertical: 12, paddingHorizontal: 24, marginTop: 4 },
  selectButtonText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, marginBottom: 2 },
  projectTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', color: Colors.text },
  headerAddBtn: { padding: 4 },
  projectCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  projectCardRow: { flexDirection: 'row', gap: 16 },
  projectDetail: { flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statNumber: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, marginTop: 2 },
  hoursCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  hoursTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 12 },
  hoursRow: { flexDirection: 'row', alignItems: 'center' },
  hoursItem: { flex: 1, alignItems: 'center' },
  hoursNumber: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },
  hoursLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, marginTop: 2 },
  hoursDivider: { width: 1, height: 32, backgroundColor: Colors.borderLight },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text, marginBottom: 12 },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, flex: 1, marginRight: 8 },
  sectionPercent: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceSecondary, borderRadius: 3, overflow: 'hidden' as const, marginBottom: 6 },
  progressBarFill: { height: 6, borderRadius: 3 },
  sectionDetail: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  inboxButton: { position: 'relative', padding: 8 },
  inboxBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.primary, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  inboxBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  messageActions: { gap: 8, marginBottom: 24 },
  messageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  messageIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  messageButtonTextWrap: { flex: 1 },
  messageButtonTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  messageButtonSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 1 },
});
