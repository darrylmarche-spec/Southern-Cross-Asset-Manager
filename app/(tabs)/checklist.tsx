import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ALL_TASKS, SECTIONS, type TaskDefinition } from '@/data/checklist-data';

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
                Colors.surfaceSecondary
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
  const { currentProject, taskStates, getTaskState, focusSection, setFocusSection } = useApp();
  const [overhaulOpen, setOverhaulOpen] = useState(false);
  const [commissioningOpen, setCommissioningOpen] = useState(false);
  const [openSubSections, setOpenSubSections] = useState<Set<number>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (focusSection !== null) {
      if (focusSection === 0) {
        setOverhaulOpen(true);
      } else {
        setCommissioningOpen(true);
        setOpenSubSections(prev => new Set([...prev, focusSection]));
      }
      setFocusSection(null);
    }
  }, [focusSection]);

  const projectTasks = useMemo(() => {
    if (!currentProject) return [];
    return taskStates.filter(t => t.projectId === currentProject.id);
  }, [currentProject, taskStates]);

  const getStats = useCallback((sectionIndices: number[]) => {
    let total = 0;
    let completed = 0;
    sectionIndices.forEach(idx => {
      const tasks = ALL_TASKS.filter(t => t.sectionIndex === idx);
      total += tasks.length;
      completed += tasks.filter(t => {
        const state = projectTasks.find(s => s.uid === t.uid);
        return state?.status === 'completed';
      }).length;
    });
    return { total, completed };
  }, [projectTasks]);

  const getPendingTasks = useCallback((sectionIndex: number): TaskDefinition[] => {
    return ALL_TASKS.filter(t => {
      if (t.sectionIndex !== sectionIndex) return false;
      const state = projectTasks.find(s => s.uid === t.uid);
      return !state || state.status !== 'completed';
    });
  }, [projectTasks]);

  const toggleSubSection = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenSubSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const commissioningSections = SECTIONS.filter(s => s.index >= 1 && s.index <= 7);
  const overhaulStats = getStats([0]);
  const commissioningStats = getStats(commissioningSections.map(s => s.index));

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

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Overhaul Workflow */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOverhaulOpen(v => !v);
          }}
          style={[
            styles.topHeader,
            overhaulStats.completed === overhaulStats.total && overhaulStats.total > 0 && styles.topHeaderDone,
          ]}
        >
          <Ionicons
            name={overhaulOpen ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={overhaulStats.completed === overhaulStats.total && overhaulStats.total > 0 ? Colors.success : Colors.textSecondary}
          />
          <Text style={[
            styles.topHeaderTitle,
            overhaulStats.completed === overhaulStats.total && overhaulStats.total > 0 && { color: Colors.success },
          ]}>
            Overhaul Workflow
          </Text>
          <View style={[
            styles.countBadge,
            overhaulStats.completed === overhaulStats.total && overhaulStats.total > 0 && { backgroundColor: Colors.successLight },
          ]}>
            <Text style={[
              styles.countText,
              overhaulStats.completed === overhaulStats.total && overhaulStats.total > 0 && { color: Colors.success },
            ]}>
              {overhaulStats.completed}/{overhaulStats.total}
            </Text>
          </View>
        </Pressable>

        {overhaulOpen && (
          <View>
            {getPendingTasks(0).length === 0 ? (
              <View style={styles.allDoneRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.allDoneText}>All tasks complete</Text>
              </View>
            ) : (
              getPendingTasks(0).map(task => (
                <TaskRow
                  key={task.uid}
                  task={task}
                  taskState={getTaskState(task.uid)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/task/[id]', params: { id: task.uid } });
                  }}
                />
              ))
            )}
          </View>
        )}

        {/* Commissioning */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCommissioningOpen(v => !v);
          }}
          style={[
            styles.topHeader,
            { marginTop: 6 },
            commissioningStats.completed === commissioningStats.total && commissioningStats.total > 0 && styles.topHeaderDone,
          ]}
        >
          <Ionicons
            name={commissioningOpen ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={commissioningStats.completed === commissioningStats.total && commissioningStats.total > 0 ? Colors.success : Colors.textSecondary}
          />
          <Text style={[
            styles.topHeaderTitle,
            commissioningStats.completed === commissioningStats.total && commissioningStats.total > 0 && { color: Colors.success },
          ]}>
            Commissioning
          </Text>
          <View style={[
            styles.countBadge,
            commissioningStats.completed === commissioningStats.total && commissioningStats.total > 0 && { backgroundColor: Colors.successLight },
          ]}>
            <Text style={[
              styles.countText,
              commissioningStats.completed === commissioningStats.total && commissioningStats.total > 0 && { color: Colors.success },
            ]}>
              {commissioningStats.completed}/{commissioningStats.total}
            </Text>
          </View>
        </Pressable>

        {commissioningOpen && commissioningSections.map(section => {
          const stats = getStats([section.index]);
          const allDone = stats.completed === stats.total && stats.total > 0;
          const isOpen = openSubSections.has(section.index);
          const pendingTasks = getPendingTasks(section.index);
          return (
            <View key={section.index}>
              <Pressable
                onPress={() => toggleSubSection(section.index)}
                style={[styles.subHeader, allDone && styles.subHeaderDone]}
              >
                <Ionicons
                  name={isOpen ? 'chevron-down' : 'chevron-forward'}
                  size={15}
                  color={allDone ? Colors.success : Colors.textSecondary}
                />
                <Text style={[styles.subHeaderTitle, allDone && { color: Colors.success }]}>
                  {section.index}. {section.name}
                </Text>
                <View style={[styles.countBadge, allDone && { backgroundColor: Colors.successLight }]}>
                  <Text style={[styles.countText, allDone && { color: Colors.success }]}>
                    {stats.completed}/{stats.total}
                  </Text>
                </View>
              </Pressable>

              {isOpen && (
                <View>
                  {pendingTasks.length === 0 ? (
                    <View style={styles.allDoneRow}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={styles.allDoneText}>All tasks complete</Text>
                    </View>
                  ) : (
                    pendingTasks.map(task => (
                      <TaskRow
                        key={task.uid}
                        task={task}
                        taskState={getTaskState(task.uid)}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({ pathname: '/task/[id]', params: { id: task.uid } });
                        }}
                      />
                    ))
                  )}
                </View>
              )}
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text },
  headerSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  topHeaderDone: { backgroundColor: '#F0FFF4' },
  topHeaderTitle: { flex: 1, fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text },
  subHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  subHeaderDone: { backgroundColor: '#F0FFF4' },
  subHeaderTitle: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  countBadge: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  allDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  allDoneText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.success },
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
