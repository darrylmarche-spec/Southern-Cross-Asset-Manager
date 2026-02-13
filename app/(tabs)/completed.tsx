import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Platform, Alert, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ALL_TASKS, SECTIONS } from '@/data/checklist-data';
import { router } from 'expo-router';

export default function CompletedScreen() {
  const insets = useSafeAreaInsets();
  const { currentProject, taskStates, getTaskState } = useApp();
  const [filterSection, setFilterSection] = useState<number | null>(null);

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
    if (!currentProject) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const projectStates = taskStates.filter(t => t.projectId === currentProject.id);
    const completedStates = projectStates.filter(t => t.status === 'completed');
    const pendingStates = projectStates.filter(t => t.status !== 'completed');

    const totalEstDuration = ALL_TASKS.filter(t => t.type === 'overhaul').reduce((s, t) => s + (t.estDuration || 0), 0);
    const totalActDuration = completedStates.reduce((s, t) => {
      const def = ALL_TASKS.find(d => d.uid === t.uid);
      return def?.type === 'overhaul' ? s + (parseFloat(t.actDuration) || 0) : s;
    }, 0);

    const completedRows = completedStates.map(state => {
      const def = ALL_TASKS.find(d => d.uid === state.uid);
      if (!def) return '';
      const date = state.completedAt ? new Date(state.completedAt).toLocaleDateString() : '';
      return `<tr>
        <td>${def.uid}</td>
        <td>${def.name}</td>
        <td>${def.section}</td>
        <td>${def.type === 'overhaul' ? `${def.estDuration}h` : '-'}</td>
        <td>${state.actDuration ? `${state.actDuration}h` : '-'}</td>
        <td>${state.response || '-'}</td>
        <td>${state.remarks || state.comments || '-'}</td>
        <td>${state.completedBy}</td>
        <td>${date}</td>
      </tr>`;
    }).join('');

    const openRows = pendingStates.map(state => {
      const def = ALL_TASKS.find(d => d.uid === state.uid);
      if (!def) return '';
      return `<tr><td>${def.uid}</td><td>${def.name}</td><td>${def.section}</td><td>${state.assignedTo || '-'}</td><td>${state.remarks || '-'}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
      h1 { font-size: 18px; color: #0A84FF; }
      h2 { font-size: 14px; margin-top: 20px; border-bottom: 2px solid #0A84FF; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #ddd; padding: 5px 6px; text-align: left; }
      th { background: #f0f0f0; font-weight: bold; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin: 10px 0; }
      .info-item { display: flex; gap: 4px; }
      .info-label { font-weight: bold; color: #666; }
      .summary { background: #f7f7f7; padding: 10px; border-radius: 4px; margin: 10px 0; }
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
        <strong>Summary:</strong> ${completedStates.length}/${projectStates.length} tasks completed |
        Est. Hours: ${totalEstDuration}h | Act. Hours: ${totalActDuration}h | Variance: ${totalEstDuration - totalActDuration}h
      </div>
      <h2>Completed Tasks</h2>
      <table><tr><th>UID</th><th>Task</th><th>Section</th><th>Est</th><th>Act</th><th>Response</th><th>Remarks</th><th>By</th><th>Date</th></tr>${completedRows}</table>
      <h2>Open Items</h2>
      <table><tr><th>UID</th><th>Task</th><th>Section</th><th>Assigned</th><th>Remarks</th></tr>${openRows}</table>
      <div class="sig-row">
        <div class="sig-block"><strong>Commissioner:</strong><br>Name: ________________<br>Date: ________________</div>
        <div class="sig-block"><strong>SAIS Inspector:</strong><br>Name: ________________<br>Date: ________________</div>
      </div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Report' });
      }
    } catch (e) {
      console.error('PDF error:', e);
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Completed</Text>
          <Text style={styles.headerCount}>{completedTasks.length} tasks</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable onPress={() => router.push('/manual-report')} style={({ pressed }) => [styles.reportButton, pressed && { opacity: 0.7 }]}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.reportButtonText}>Manual Report</Text>
          </Pressable>
          <Pressable onPress={generatePdf} style={({ pressed }) => [styles.reportButton, pressed && { opacity: 0.7 }]}>
            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
            <Text style={styles.reportButtonText}>Generate Report</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setFilterSection(null); }}
          style={[styles.filterChip, filterSection === null && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, filterSection === null && styles.filterChipTextActive]}>All</Text>
        </Pressable>
        {SECTIONS.filter(s => s.index <= 7).map(s => (
          <Pressable
            key={s.index}
            onPress={() => { Haptics.selectionAsync(); setFilterSection(s.index); }}
            style={[styles.filterChip, filterSection === s.index && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filterSection === s.index && styles.filterChipTextActive]} numberOfLines={1}>
              {s.index}. {s.name}
            </Text>
          </Pressable>
        ))}
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
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/task/[id]', params: { id: item.uid } });
            }}
            style={({ pressed }) => [styles.completedRow, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.completedIcon}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            </View>
            <View style={styles.completedInfo}>
              <Text style={styles.completedUid}>{item.uid}</Text>
              <Text style={styles.completedName} numberOfLines={2}>{item.def.name}</Text>
              <Text style={styles.completedMeta}>
                {item.def.section} {item.completedBy ? `\u00B7 ${item.completedBy}` : ''} {item.completedAt ? `\u00B7 ${new Date(item.completedAt).toLocaleDateString()}` : ''}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerLeft: {},
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text },
  headerCount: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  headerButtons: { flexDirection: 'row', gap: 8 },
  reportButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  reportButtonText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 6, flexWrap: 'wrap' as const },
  filterChip: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.borderLight },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  filterChipTextActive: { color: '#FFF' },
  emptyList: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyListText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  completedRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  completedIcon: { marginTop: 2 },
  completedInfo: { flex: 1, gap: 2 },
  completedUid: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.primary },
  completedName: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text, lineHeight: 19 },
  completedMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
});
