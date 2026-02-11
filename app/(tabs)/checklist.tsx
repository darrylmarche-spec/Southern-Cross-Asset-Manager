import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ALL_TASKS, SECTIONS, type TaskDefinition } from '@/data/checklist-data';

interface SectionData {
  title: string;
  sectionIndex: number;
  data: TaskDefinition[];
  completedCount: number;
  totalCount: number;
}

function TaskRow({ task, taskState, onPress }: { task: TaskDefinition; taskState: any; onPress: () => void }) {
  const isOverhaul = task.type === 'overhaul';
  const hasIssue = taskState?.response === 'V' || taskState?.response === 'O';
  const isOverdue = taskState?.dueDate && taskState?.status !== 'completed' && new Date(taskState.dueDate) < new Date();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.taskRow, pressed && { backgroundColor: Colors.surfaceSecondary }]}
    >
      <View style={[styles.uidBadge, hasIssue ? styles.uidBadgeIssue : isOverdue ? styles.uidBadgeOverdue : null]}>
        <Text style={[styles.uidText, (hasIssue || isOverdue) && { color: '#FFF' }]}>{task.uid}</Text>
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskName} numberOfLines={2}>{task.name}</Text>
        {isOverhaul && (
          <Text style={styles.taskMeta}>
            Est: {task.estDuration}h / {task.estLabor} labor
            {taskState?.actDuration ? ` \u00B7 Act: ${taskState.actDuration}h` : ''}
          </Text>
        )}
        {!isOverhaul && taskState?.response ? (
          <View style={styles.responseRow}>
            <View style={[styles.responseBadge, {
              backgroundColor: taskState.response === 'yes' || taskState.response === 'check' ? Colors.successLight :
                taskState.response === 'V' ? Colors.dangerLight :
                taskState.response === 'O' ? Colors.warningLight :
                taskState.response === 'na' ? Colors.surfaceSecondary : Colors.surfaceSecondary
            }]}>
              <Text style={[styles.responseText, {
                color: taskState.response === 'yes' || taskState.response === 'check' ? Colors.success :
                  taskState.response === 'V' ? Colors.danger :
                  taskState.response === 'O' ? '#B45309' :
                  Colors.textSecondary
              }]}>
                {taskState.response === 'yes' ? 'Yes' : taskState.response === 'no' ? 'No' : taskState.response === 'check' ? 'Pass' : taskState.response === 'V' ? 'Fail (SAIS)' : taskState.response === 'O' ? 'Fail' : 'N/A'}
              </Text>
            </View>
          </View>
        ) : null}
        {taskState?.assignedTo ? (
          <Text style={styles.assignedText}>{taskState.assignedTo}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const { currentProject, taskStates, getTaskState } = useApp();
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  const projectTasks = useMemo(() => {
    if (!currentProject) return [];
    return taskStates.filter(t => t.projectId === currentProject.id);
  }, [currentProject, taskStates]);

  const sections: SectionData[] = useMemo(() => {
    return SECTIONS.filter(s => s.index <= 7).map(section => {
      const sectionTasks = ALL_TASKS.filter(t => t.sectionIndex === section.index);
      const pendingTasks = sectionTasks.filter(t => {
        const state = projectTasks.find(s => s.uid === t.uid);
        return !state || state.status !== 'completed';
      });
      const completedCount = sectionTasks.length - pendingTasks.length;
      return {
        title: `${section.index}. ${section.name}`,
        sectionIndex: section.index,
        data: collapsedSections.has(section.index) ? [] : pendingTasks,
        completedCount,
        totalCount: sectionTasks.length,
      };
    });
  }, [projectTasks, collapsedSections]);

  const toggleSection = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCollapsedSections(prev => {
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Tasks</Text>
        <Text style={styles.headerSubtitle}>{currentProject.projectName}</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            taskState={getTaskState(item.uid)}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/task/[id]', params: { id: item.uid } });
            }}
          />
        )}
        renderSectionHeader={({ section }) => {
          const s = section as SectionData;
          const isCollapsed = collapsedSections.has(s.sectionIndex);
          const allDone = s.completedCount === s.totalCount && s.totalCount > 0;
          return (
            <Pressable
              onPress={() => toggleSection(s.sectionIndex)}
              style={[styles.sectionHeader, allDone && styles.sectionHeaderDone]}
            >
              <Ionicons
                name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                size={16}
                color={allDone ? Colors.success : Colors.textSecondary}
              />
              <Text style={[styles.sectionTitle, allDone && { color: Colors.success }]}>{s.title}</Text>
              <View style={[styles.countBadge, allDone && { backgroundColor: Colors.successLight }]}>
                <Text style={[styles.countText, allDone && { color: Colors.success }]}>
                  {s.completedCount}/{s.totalCount}
                </Text>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  emptyContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text },
  headerSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  sectionHeaderDone: { backgroundColor: '#F0FFF4' },
  sectionTitle: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  countBadge: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  uidBadge: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 44, alignItems: 'center',
  },
  uidBadgeIssue: { backgroundColor: Colors.danger },
  uidBadgeOverdue: { backgroundColor: Colors.accent },
  uidText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.text },
  taskInfo: { flex: 1, gap: 3 },
  taskName: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text, lineHeight: 19 },
  taskMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  responseRow: { flexDirection: 'row' },
  responseBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  responseText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  assignedText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.primary },
});
