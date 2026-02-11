import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ALL_TASKS, type ResponseValue } from '@/data/checklist-data';

const RESPONSE_OPTIONS: { value: ResponseValue; label: string; color: string; bg: string }[] = [
  { value: 'yes', label: 'Yes', color: Colors.success, bg: Colors.successLight },
  { value: 'no', label: 'No', color: Colors.danger, bg: Colors.dangerLight },
  { value: 'check', label: 'Pass', color: Colors.success, bg: Colors.successLight },
  { value: 'V', label: 'V (Fail SAIS)', color: Colors.danger, bg: Colors.dangerLight },
  { value: 'O', label: 'O (Fail)', color: '#B45309', bg: Colors.warningLight },
  { value: 'na', label: 'N/A', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
];

const TEAM_MEMBERS = ['', 'Darryl', 'TeamMember1', 'TeamMember2', 'TeamMember3'];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getTaskState, getTaskDef, updateTask, completeTask, currentUser, users } = useApp();

  const taskDef = useMemo(() => ALL_TASKS.find(t => t.uid === id), [id]);
  const taskState = getTaskState(id || '');

  const [actDuration, setActDuration] = useState('');
  const [actLabor, setActLabor] = useState('');
  const [comments, setComments] = useState('');
  const [response, setResponse] = useState<ResponseValue>('');
  const [remarks, setRemarks] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showAssignPicker, setShowAssignPicker] = useState(false);

  useEffect(() => {
    if (taskState) {
      setActDuration(taskState.actDuration);
      setActLabor(taskState.actLabor);
      setComments(taskState.comments);
      setResponse(taskState.response);
      setRemarks(taskState.remarks);
      setAssignedTo(taskState.assignedTo);
      setDueDate(taskState.dueDate);
    }
  }, []);

  if (!taskDef || !id) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const isOverhaul = taskDef.type === 'overhaul';
  const isCompleted = taskState?.status === 'completed';

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask(id, { actDuration, actLabor, comments, response, remarks, assignedTo, dueDate });
  };

  const handleComplete = () => {
    handleSave();
    if (isOverhaul && !actDuration) {
      if (Platform.OS === 'web') {
        if (!confirm('No actual duration entered. Mark as complete anyway?')) return;
      } else {
        Alert.alert('Missing Duration', 'No actual duration entered. Mark as complete anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => { completeTask(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); } },
        ]);
        return;
      }
    }
    if (!isOverhaul && !response) {
      if (Platform.OS === 'web') {
        if (!confirm('No response selected. Mark as complete anyway?')) return;
      } else {
        Alert.alert('Missing Response', 'No response selected. Mark as complete anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => { completeTask(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); } },
        ]);
        return;
      }
    }
    completeTask(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleUncomplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateTask(id, { status: 'pending', completedBy: '', completedAt: '' });
  };

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => { handleSave(); router.back(); }} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={Colors.primary} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>Task {id}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }]}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.uidBadge, isCompleted && styles.uidBadgeCompleted]}>
            <Text style={[styles.uidText, isCompleted && { color: '#FFF' }]}>{taskDef.uid}</Text>
          </View>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionText}>{taskDef.section}</Text>
          </View>
          {taskDef.subsection && (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionText}>{taskDef.subsection}</Text>
            </View>
          )}
        </View>

        <Text style={styles.taskName}>{taskDef.name}</Text>
        {!!taskDef.description && <Text style={styles.taskDescription}>{taskDef.description}</Text>}
        {!!taskDef.saisRef && (
          <View style={styles.refRow}>
            <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
            <Text style={styles.refText}>{taskDef.saisRef}</Text>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.completedBannerText}>
              Completed by {taskState?.completedBy} on {taskState?.completedAt ? new Date(taskState.completedAt).toLocaleDateString() : ''}
            </Text>
          </View>
        )}

        {isOverhaul && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Duration & Labor</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Est. Duration</Text>
                <View style={styles.readonlyField}>
                  <Text style={styles.readonlyText}>{taskDef.estDuration}h</Text>
                </View>
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Est. Labor</Text>
                <View style={styles.readonlyField}>
                  <Text style={styles.readonlyText}>{taskDef.estLabor}</Text>
                </View>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Actual Duration (h)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={actDuration}
                  onChangeText={setActDuration}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  editable={!isCompleted}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Actual Labor</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={actLabor}
                  onChangeText={setActLabor}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  editable={!isCompleted}
                />
              </View>
            </View>
          </View>
        )}

        {!isOverhaul && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Response</Text>
            <View style={styles.responseGrid}>
              {RESPONSE_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    if (isCompleted) return;
                    Haptics.selectionAsync();
                    setResponse(response === opt.value ? '' : opt.value);
                  }}
                  style={[
                    styles.responseOption,
                    response === opt.value && { backgroundColor: opt.bg, borderColor: opt.color },
                  ]}
                >
                  {response === opt.value && <Ionicons name="checkmark-circle" size={16} color={opt.color} />}
                  <Text style={[styles.responseOptionText, response === opt.value && { color: opt.color, fontFamily: 'Inter_600SemiBold' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assignment</Text>
          <Text style={styles.fieldLabel}>Assigned To</Text>
          <Pressable
            onPress={() => { if (!isCompleted) setShowAssignPicker(!showAssignPicker); }}
            style={styles.pickerButton}
          >
            <Text style={[styles.pickerText, !assignedTo && { color: Colors.textTertiary }]}>
              {assignedTo || 'Select team member'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
          {showAssignPicker && (
            <View style={styles.pickerDropdown}>
              {TEAM_MEMBERS.map(name => (
                <Pressable
                  key={name || 'none'}
                  onPress={() => { setAssignedTo(name); setShowAssignPicker(false); Haptics.selectionAsync(); }}
                  style={[styles.pickerItem, assignedTo === name && styles.pickerItemActive]}
                >
                  <Text style={[styles.pickerItemText, assignedTo === name && { color: Colors.primary }]}>
                    {name || 'Unassigned'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Due Date</Text>
          <TextInput
            style={styles.fieldInput}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textTertiary}
            editable={!isCompleted}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isOverhaul ? 'Comments' : 'Remarks'}</Text>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={isOverhaul ? comments : remarks}
            onChangeText={isOverhaul ? setComments : setRemarks}
            placeholder={isOverhaul ? 'Add comments...' : 'Add remarks or findings...'}
            placeholderTextColor={Colors.textTertiary}
            multiline
            editable={!isCompleted}
          />
        </View>

        {!isCompleted ? (
          <Pressable
            onPress={handleComplete}
            style={({ pressed }) => [styles.completeButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
            <Text style={styles.completeButtonText}>Mark Complete</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleUncomplete}
            style={({ pressed }) => [styles.reopenButton, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="arrow-undo" size={20} color={Colors.accent} />
            <Text style={styles.reopenButtonText}>Reopen Task</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  navTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: Colors.text, flex: 1, textAlign: 'center' as const, marginHorizontal: 8 },
  content: { padding: 20, gap: 16 },
  errorText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: Colors.danger, textAlign: 'center', marginTop: 40 },
  taskHeader: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8 },
  uidBadge: { backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  uidBadgeCompleted: { backgroundColor: Colors.success },
  uidText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.primary },
  sectionBadge: { backgroundColor: Colors.surfaceSecondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  sectionText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  taskName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text, lineHeight: 26 },
  taskDescription: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 20 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.primary },
  completedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.successLight, borderRadius: 12, padding: 12 },
  completedBannerText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.success, flex: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 4 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1, gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  readonlyField: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 14, height: 44, justifyContent: 'center' as const },
  readonlyText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  fieldInput: { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' as const },
  responseGrid: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8 },
  responseOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  responseOptionText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text },
  pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.borderLight },
  pickerText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text },
  pickerDropdown: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden' as const, marginTop: 4 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  pickerItemActive: { backgroundColor: Colors.primaryLight },
  pickerItemText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.success, borderRadius: 14, height: 52, marginTop: 4 },
  completeButtonText: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  reopenButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.warningLight, borderRadius: 14, height: 48, marginTop: 4 },
  reopenButtonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#B45309' },
});
