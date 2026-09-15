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
  const { currentProject, currentUser, taskStates, projects, setFocusSection, adminMessages, users } = useApp();

  const isAdmin = currentUser?.role === 'admin';
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

  const overhaul = useMemo(() => {
    const defs = ALL_TASKS.filter(t => t.type === 'overhaul');
    const uids = new Set(defs.map(d => d.uid));
    const states = projectTasks.filter(t => uids.has(t.uid));
    const est = defs.reduce((s, t) => s + (t.estDuration || 0), 0);
    const act = states.reduce((s, t) => s + (parseFloat(t.actDuration) || 0), 0);
    return { total: defs.length, done: states.filter(t => t.status === 'completed').length, est, act };
  }, [projectTasks]);

  const commissioning = useMemo(() => {
    const defs = ALL_TASKS.filter(t => t.type !== 'overhaul');
    const uids = new Set(defs.map(d => d.uid));
    const states = projectTasks.filter(t => uids.has(t.uid));
    const sections = new Set(defs.map(d => d.sectionIndex)).size;
    return { total: defs.length, done: states.filter(t => t.status === 'completed').length, sections };
  }, [projectTasks]);

  const needsAttention = useMemo(() => {
    return projectTasks
      .filter(t => t.status !== 'completed' && (t.response === 'no' || (t.dueDate && new Date(t.dueDate) < new Date())))
      .map(state => {
        const def = ALL_TASKS.find(d => d.uid === state.uid);
        if (!def) return null;
        const reason = state.response === 'no' ? 'Failed — open item raised' : 'Overdue';
        return { uid: def.uid, name: def.name, reason };
      })
      .filter(Boolean)
      .slice(0, 6) as Array<{ uid: string; name: string; reason: string }>;
  }, [projectTasks]);

  if (!currentProject) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Ionicons name="folder-open-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No Project Selected</Text>
        <Text style={styles.emptySubtitle}>
          {isAdmin ? 'Select a project from More to get started' : 'Contact your administrator to be assigned to a project'}
        </Text>
        {projects.length > 0 && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/settings'); }}
            style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.emptyBtnText}>Go to More</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const flaggedPct = stats.total > 0 ? Math.round((needsAttention.length / stats.total) * 100) : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      {/* Red command bar */}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>SCS Checklist</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentProject.projectName} · {currentProject.commissionNumber}
          </Text>
        </View>
        {isAdmin && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/inbox'); }}
            hitSlop={8}
            style={styles.headerIcon}
          >
            <Ionicons name="mail-outline" size={20} color="#FFF" />
            {unreadCount > 0 && <View style={styles.badgeDot}><Text style={styles.badgeDotText}>{unreadCount}</Text></View>}
          </Pressable>
        )}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(currentUser?.username || 'SC').slice(0, 2).toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Overall completion */}
        <View style={styles.overallBlock}>
          <View style={styles.overallRow}>
            <View>
              <Text style={styles.microLabel}>Overall completion</Text>
              <View style={styles.overallFigures}>
                <Text style={styles.bigPercent}>{stats.percent}%</Text>
                <Text style={styles.bigPercentSub}>{stats.completed} of {stats.total} Tasks</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.microLabel}>Handover</Text>
              <Text style={styles.handoverValue}>{currentProject.dateOfCompletion || '—'}</Text>
            </View>
          </View>

          {/* Green = done, orange = open items, red track = not started */}
          <View style={styles.track}>
            <View style={[styles.trackDone, { width: `${stats.percent}%` }]} />
            <View style={[styles.trackFlag, { width: `${flaggedPct}%` }]} />
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>Completed</Text></View>
            <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: Colors.warning }]} /><Text style={styles.legendText}>Open items</Text></View>
            <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: Colors.danger }]} /><Text style={styles.legendText}>Not started</Text></View>
          </View>
        </View>

        {/* Two tiles */}
        <View style={styles.tileRow}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFocusSection(0); router.push('/(tabs)/checklist'); }}
            style={({ pressed }) => [styles.tile, pressed && { backgroundColor: Colors.surfacePressed }]}
          >
            <Text style={styles.microLabel}>Overhaul</Text>
            <Text style={styles.tileValue}>{overhaul.done}/{overhaul.total}</Text>
            <Text style={styles.tileMeta}>{overhaul.act}h of {overhaul.est}h logged</Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFocusSection(1); router.push('/(tabs)/checklist'); }}
            style={({ pressed }) => [styles.tile, pressed && { backgroundColor: Colors.surfacePressed }]}
          >
            <Text style={styles.microLabel}>Commissioning</Text>
            <Text style={styles.tileValue}>{commissioning.done}/{commissioning.total}</Text>
            <Text style={styles.tileMeta}>{commissioning.sections} sections</Text>
          </Pressable>
        </View>

        {/* Needs attention — the only warm colour in the app */}
        {needsAttention.length > 0 && (
          <>
            <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Needs attention</Text></View>
            {needsAttention.map(item => (
              <Pressable
                key={item.uid}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/task/[id]', params: { id: item.uid } }); }}
                style={({ pressed }) => [styles.flagRow, pressed && { backgroundColor: Colors.surfacePressed }]}
              >
                <View style={styles.flagUid}><Text style={styles.flagUidText}>{item.uid}</Text></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.flagName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.flagReason}>{item.reason}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* Section progress */}
        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Section progress</Text></View>
        {sectionStats.map(section => (
          <Pressable
            key={section.index}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFocusSection(section.index); router.push('/(tabs)/checklist'); }}
            style={({ pressed }) => [styles.progressRow, pressed && { backgroundColor: Colors.surfacePressed }]}
          >
            <View style={styles.progressRowTop}>
              <Text style={styles.progressName} numberOfLines={1}>{section.index}. {section.name}</Text>
              <Text style={styles.progressCount}>{section.completed}/{section.total}</Text>
            </View>
            <View style={styles.miniTrack}>
              <View style={[styles.miniFill, { width: `${section.percent}%` }]} />
            </View>
          </Pressable>
        ))}

        {!isAdmin && (
          <View style={{ padding: 16, gap: 10 }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/compose-message', params: { type: 'message' } }); }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: Colors.primaryLight }]}
            >
              <Text style={styles.secondaryBtnText}>Message admin</Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/compose-message', params: { type: 'parts_request' } }); }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: Colors.primaryLight }]}
            >
              <Text style={styles.secondaryBtnText}>Parts request</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  emptyContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 24 },
  emptyTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.text },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center', maxWidth: 280 },
  emptyBtn: { marginTop: 8, height: 48, paddingHorizontal: 28, borderRadius: 3, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 16, height: 54,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' },
  headerSubtitle: { fontSize: 11.5, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  headerIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  badgeDot: {
    position: 'absolute', top: 2, right: 0, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.chrome, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeDotText: { fontSize: 9.5, fontFamily: 'Inter_700Bold', color: '#FFF' },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: '#FFF' },

  microLabel: {
    fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },
  overallBlock: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  overallFigures: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  bigPercent: { fontSize: 44, fontFamily: 'Inter_700Bold', color: Colors.text, letterSpacing: -1 },
  bigPercentSub: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textTertiary },
  handoverValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, marginTop: 5 },

  track: { flexDirection: 'row', height: 10, backgroundColor: Colors.danger, borderRadius: 2, overflow: 'hidden' as const, marginTop: 14 },
  trackDone: { height: 10, backgroundColor: Colors.success },
  trackFlag: { height: 10, backgroundColor: Colors.warning },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' as const },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 9, height: 9 },
  legendText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  tileRow: { flexDirection: 'row', gap: 1, backgroundColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tile: { flex: 1, backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  tileValue: { fontSize: 26, fontFamily: 'Inter_700Bold', color: Colors.text, letterSpacing: -0.5, marginTop: 3 },
  tileMeta: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textTertiary },

  sectionBar: { backgroundColor: Colors.sectionBar, paddingHorizontal: 16, paddingVertical: 9 },
  sectionBarText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },

  flagRow: {
    flexDirection: 'row', gap: 11, alignItems: 'flex-start',
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    borderLeftWidth: 4, borderLeftColor: Colors.warning,
  },
  flagUid: {
    minWidth: 44, alignItems: 'center', backgroundColor: '#EDEDED',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 4,
  },
  flagUidText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.text },
  flagName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, lineHeight: 19 },
  flagReason: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.warningDark },

  progressRow: {
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  progressRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  progressName: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  progressCount: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: Colors.textTertiary },
  miniTrack: { height: 5, backgroundColor: Colors.danger, borderRadius: 2, overflow: 'hidden' as const, marginTop: 7 },
  miniFill: { height: 5, backgroundColor: Colors.success },

  secondaryBtn: {
    height: 48, borderRadius: 3, backgroundColor: Colors.field,
    borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.primary },
});
