import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ALL_TASKS, SECTIONS } from '@/data/checklist-data';
import { router } from 'expo-router';

export default function CompletedScreen() {
  const insets = useSafeAreaInsets();
  const { currentProject, currentUser, taskStates, submitReport } = useApp();
  const [filterSection, setFilterSection] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const completedTasks = useMemo(() => {
    if (!currentProject) return [];
    const projectStates = taskStates.filter(t => t.projectId === currentProject.id && t.status === 'completed');
    return projectStates
      .map(state => {
        const def = ALL_TASKS.find(d => d.uid === state.uid);
        return def ? { ...state, def } : null;
      })
      .filter(Boolean)
      .filter(t => filterSection === null || t!.def.sectionIndex === filterSection)
      .sort((a, b) => new Date(b!.completedAt).getTime() - new Date(a!.completedAt).getTime()) as Array<any>;
  }, [currentProject, taskStates, filterSection]);

  const generatePdf = async () => {
    if (!currentProject || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    const completedStates = taskStates.filter(t => t.projectId === currentProject.id && t.status === 'completed');
    const totalEstDuration = ALL_TASKS.filter(t => t.type === 'overhaul').reduce((s, t) => s + (t.estDuration || 0), 0);
    const totalActDuration = completedStates.reduce((s, t) => {
      const def = ALL_TASKS.find(d => d.uid === t.uid);
      return def?.type === 'overhaul' ? s + (parseFloat(t.actDuration) || 0) : s;
    }, 0);

    const completedRows = [...completedStates]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .map(state => {
        const def = ALL_TASKS.find(d => d.uid === state.uid);
        if (!def) return '';
        const date = state.completedAt ? new Date(state.completedAt).toLocaleDateString('en-AU') : '-';
        return `<tr>
          <td>${def.uid}</td><td>${def.name}</td><td>${def.section}</td>
          <td>${def.type === 'overhaul' ? `${def.estDuration}h` : '-'}</td>
          <td>${state.actDuration ? `${state.actDuration}h` : '-'}</td>
          <td>${state.response || '-'}</td>
          <td>${state.remarks || state.comments || '-'}</td>
          <td>${state.completedBy || '-'}</td>
          <td><strong>${date}</strong></td>
        </tr>`;
      }).join('');

    // Report styling follows the app: red rules, grey table heads, flat corners.
    const html = `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #111; }
      h1 { font-size: 18px; color: #CC0000; margin-bottom: 2px; }
      h2 { font-size: 14px; margin-top: 20px; border-bottom: 2px solid #CC0000; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #B8B8B8; padding: 5px 6px; text-align: left; }
      th { background: #D8D8D8; font-weight: bold; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin: 10px 0; }
      .info-item { display: flex; gap: 4px; }
      .info-label { font-weight: bold; color: #5A5A5A; }
      .summary { background: #D8D8D8; border-left: 3px solid #CC0000; padding: 10px; margin: 10px 0; }
      .sig-row { display: flex; gap: 40px; margin-top: 40px; }
      .sig-block { flex: 1; border-top: 1px solid #000; padding-top: 4px; }
    </style></head><body>
      <h1>SCS Commissioning Report</h1>
      <p>Document Q 43831124, Rev. 03</p>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Customer:</span> ${currentProject.customer}</div>
        <div class="info-item"><span class="info-label">Project:</span> ${currentProject.projectName}</div>
        <div class="info-item"><span class="info-label">Location:</span> ${currentProject.location}</div>
        <div class="info-item"><span class="info-label">Commission #:</span> ${currentProject.commissionNumber}</div>
        <div class="info-item"><span class="info-label">Type:</span> ${currentProject.escalatorType}</div>
        <div class="info-item"><span class="info-label">Completion Date:</span> ${currentProject.dateOfCompletion}</div>
      </div>
      <div class="summary">
        <strong>Summary:</strong> ${completedStates.length} tasks completed |
        Est. Hours: ${totalEstDuration}h | Act. Hours: ${totalActDuration}h | Variance: ${(totalEstDuration - totalActDuration).toFixed(1)}h
      </div>
      <h2>Completed Tasks</h2>
      <table><tr><th>UID</th><th>Task</th><th>Section</th><th>Est</th><th>Act</th><th>Response</th><th>Remarks</th><th>By</th><th>Completed</th></tr>${completedRows}</table>
      <div class="sig-row">
        <div class="sig-block"><strong>Commissioner:</strong><br>Name: ________________<br>Date: ________________</div>
        <div class="sig-block"><strong>SAIS Inspector:</strong><br>Name: ________________<br>Date: ________________</div>
      </div>
    </body></html>`;

    try {
      await submitReport({
        projectId: currentProject.id,
        submittedBy: currentUser?.username || 'Unknown',
        type: 'generate',
        content: html,
        subject: `${currentProject.projectName} - Commissioning Report`,
      });
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2500);
    } catch (e) {
      setSubmitting(false);
    }
  };

  if (!currentProject) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Ionicons name="checkmark-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No Project Selected</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>Completed</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{currentProject.projectName}</Text>
        </View>
      </View>

      <View style={styles.countStrip}>
        <Text style={styles.countLabel}>Signed off</Text>
        <Text style={styles.countValue}>{completedTasks.length}</Text>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setFilterSection(null); }}
            style={[styles.chip, filterSection === null && styles.chipOn]}
          >
            <Text style={[styles.chipText, filterSection === null && styles.chipTextOn]}>All</Text>
          </Pressable>
          {SECTIONS.filter(s => s.index <= 7).map(s => {
            const on = filterSection === s.index;
            return (
              <Pressable
                key={s.index}
                onPress={() => { Haptics.selectionAsync(); setFilterSection(s.index); }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>{s.index}. {s.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={completedTasks}
        keyExtractor={(item) => item.uid}
        scrollEnabled={completedTasks.length > 0}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Ionicons name="checkmark-done-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyListText}>No completed tasks yet</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerBtns}>
            <Pressable
              onPress={generatePdf}
              disabled={submitting}
              style={({ pressed }) => [styles.primaryBtn, submitted && { backgroundColor: Colors.success }, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? 'Submitting…' : submitted ? 'Report saved' : 'Generate PDF report'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/manual-report')}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: Colors.primaryLight }]}
            >
              <Text style={styles.secondaryBtnText}>Manual report</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/task/[id]', params: { id: item.uid } });
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfacePressed }]}
          >
            <View style={styles.tick}>
              <Ionicons name="checkmark" size={13} color="#FFF" />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.rowName} numberOfLines={2}>{item.uid} {item.def.name}</Text>
              <Text style={styles.rowMeta}>
                {item.def.section}
                {item.completedBy ? ` · ${item.completedBy}` : ''}
                {item.completedAt ? ` · ${new Date(item.completedAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  emptyContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },

  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 16, height: 54,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' },
  headerSubtitle: { fontSize: 11.5, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  countStrip: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  countLabel: {
    fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },
  countValue: { fontSize: 34, fontFamily: 'Inter_700Bold', color: Colors.text, marginTop: 4 },

  filterBar: {
    backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chip: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 2, maxWidth: 190,
    borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.field,
  },
  chipOn: { backgroundColor: Colors.selected, borderColor: Colors.selected },
  chipText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  chipTextOn: { color: '#FFF' },

  row: {
    flexDirection: 'row', gap: 11, alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  tick: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  rowName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, lineHeight: 19 },
  rowMeta: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },

  emptyList: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyListText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },

  footerBtns: { padding: 16, gap: 10 },
  primaryBtn: { height: 48, borderRadius: 3, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 0.3 },
  secondaryBtn: {
    height: 48, borderRadius: 3, backgroundColor: Colors.field,
    borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.primary },
});
