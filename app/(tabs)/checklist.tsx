import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ALL_TASKS, SECTIONS, type TaskDefinition } from '@/data/checklist-data';

type FilterKey = 'all' | 'open' | 'mine' | 'closed';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'mine', label: 'Assigned to Me' },
  { key: 'closed', label: 'Closed' },
];

// Overhaul tasks are numbered 1, 2, 3… in the UI; the SAIS uid stays on commissioning items.
function displayNumber(task: TaskDefinition, indexInSection: number) {
  return task.type === 'overhaul' ? String(indexInSection + 1) : task.uid;
}

function TaskRow({ task, label, taskState, onPress }: { task: TaskDefinition; label: string; taskState: any; onPress: () => void }) {
  const isDone = taskState?.status === 'completed';
  const hasIssue = taskState?.response === 'V' || taskState?.response === 'O';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.taskRow,
        hasIssue && styles.taskRowFlagged,
        pressed && { backgroundColor: Colors.surfacePressed },
      ]}
    >
      <View style={[styles.uidBadge, isDone ? styles.uidBadgeDone : styles.uidBadgeOpen]}>
        <Text style={[styles.uidText, isDone && { color: '#FFF' }]}>{label}</Text>
      </View>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskName, isDone && styles.taskNameDone]} numberOfLines={2}>{task.name}</Text>
        {taskState?.assignedTo ? <Text style={styles.assignedText}>{taskState.assignedTo}</Text> : null}
      </View>
      {hasIssue ? (
        <View style={styles.openPill}><Text style={styles.openPillText}>Open</Text></View>
      ) : isDone ? (
        <Text style={styles.donePill}>Done</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
    </Pressable>
  );
}

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const { currentProject, taskStates, getTaskState, currentUser, focusSection, setFocusSection } = useApp();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (focusSection !== null) {
      setOpenSections(prev => new Set([...prev, focusSection]));
      setFocusSection(null);
    }
  }, [focusSection]);

  const projectTasks = useMemo(() => {
    if (!currentProject) return [];
    return taskStates.filter(t => t.projectId === currentProject.id);
  }, [currentProject, taskStates]);

  const stateFor = useCallback((uid: string) => projectTasks.find(s => s.uid === uid), [projectTasks]);

  const matchesFilter = useCallback((task: TaskDefinition) => {
    const state = stateFor(task.uid);
    const isDone = state?.status === 'completed';
    if (filter === 'open') return !isDone;
    if (filter === 'closed') return isDone;
    if (filter === 'mine') return !!state?.assignedTo && state.assignedTo === currentUser?.username;
    return true;
  }, [filter, stateFor, currentUser]);

  const toggleSection = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  if (!currentProject) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Ionicons name="clipboard-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No Project Selected</Text>
        <Text style={styles.emptySubtitle}>Select or create a project to view the checklist</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      {/* Red command bar */}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Checklist</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{currentProject.projectName}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(currentUser?.username || 'SC').slice(0, 2).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map(f => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {SECTIONS.map(section => {
          const inSection = ALL_TASKS.filter(t => t.sectionIndex === section.index);
          const rows = inSection.filter(matchesFilter);
          if (rows.length === 0) return null;
          const doneCount = inSection.filter(t => stateFor(t.uid)?.status === 'completed').length;
          const isOpen = openSections.has(section.index);

          return (
            <View key={section.index}>
              <Pressable onPress={() => toggleSection(section.index)} style={styles.sectionBar}>
                <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={Colors.text} />
                <Text style={styles.sectionTitle}>{section.index}. {section.name}</Text>
                <Text style={styles.sectionCount}>{doneCount}/{inSection.length}</Text>
              </Pressable>

              {isOpen && rows.map(task => (
                <TaskRow
                  key={task.uid}
                  task={task}
                  label={displayNumber(task, inSection.indexOf(task))}
                  taskState={getTaskState(task.uid)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/task/[id]', params: { id: task.uid } });
                  }}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  emptyContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: 16, height: 54,
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' },
  headerSubtitle: { fontSize: 11.5, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: '#FFF' },

  filterBar: {
    backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chip: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 2,
    borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.field,
  },
  chipOn: { backgroundColor: Colors.selected, borderColor: Colors.selected },
  chipText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  chipTextOn: { color: '#FFF' },

  sectionBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.sectionBar, paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: '#ABABAB', borderBottomWidth: 1, borderBottomColor: '#ABABAB',
  },
  sectionTitle: { flex: 1, fontSize: 14.5, fontFamily: 'Inter_700Bold', color: Colors.text },
  sectionCount: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },

  taskRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 11,
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  taskRowFlagged: { borderLeftWidth: 4, borderLeftColor: Colors.warning },
  uidBadge: { minWidth: 46, alignItems: 'center', borderRadius: 2, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 4 },
  uidBadgeDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  uidBadgeOpen: { backgroundColor: Colors.dangerBadge, borderColor: Colors.dangerBadgeBorder },
  uidText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.text },
  taskInfo: { flex: 1, gap: 3 },
  taskName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, lineHeight: 19 },
  taskNameDone: { color: '#5C5C5C' },
  assignedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  openPill: { backgroundColor: Colors.warning, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  openPillText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFF' },
  donePill: { fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.successDark, marginTop: 4 },
});
