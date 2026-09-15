import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, Alert, Image, ActionSheetIOS } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { type Attachment, type CommentAttachment } from '@/contexts/AppContext';
import { ALL_TASKS, type ResponseValue } from '@/data/checklist-data';

// Segmented answer bar — one tap, no card grid.
const RESPONSE_OPTIONS: { value: ResponseValue; label: string }[] = [
  { value: 'na', label: 'N/A' },
  { value: 'check', label: 'Pass' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getTaskState, updateTask, completeTask, currentUser, currentProject } = useApp();

  const taskDef = useMemo(() => ALL_TASKS.find(t => t.uid === id), [id]);
  const taskState = getTaskState(id || '');

  // Prev / next within the same section, so the crew stays inside the checklist.
  const siblings = useMemo(() => {
    if (!taskDef) return [];
    return ALL_TASKS.filter(t => t.sectionIndex === taskDef.sectionIndex);
  }, [taskDef]);
  const siblingIndex = useMemo(() => siblings.findIndex(t => t.uid === id), [siblings, id]);

  const projectMembers = useMemo(() => {
    if (!currentProject) return [''];
    return ['', ...currentProject.assignedMembers];
  }, [currentProject]);

  const [actDuration, setActDuration] = useState('');
  const [actLabor, setActLabor] = useState('');
  const [comments, setComments] = useState('');
  const [response, setResponse] = useState<ResponseValue>('');
  const [remarks, setRemarks] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [commentHistory, setCommentHistory] = useState<CommentAttachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [stagedAttachments, setStagedAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (taskState) {
      setActDuration(taskState.actDuration);
      setActLabor(taskState.actLabor);
      setComments(taskState.comments);
      setResponse(taskState.response);
      setRemarks(taskState.remarks);
      setAssignedTo(taskState.assignedTo);
      setDueDate(taskState.dueDate);
      setAttachments(taskState.attachments || []);
      setCommentHistory(taskState.commentHistory || []);
    }
  }, [id]);

  if (!taskDef || !id) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const isOverhaul = taskDef.type === 'overhaul';
  const isCompleted = taskState?.status === 'completed';
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask(id, { actDuration, actLabor, comments, response, remarks, assignedTo, dueDate, attachments, commentHistory });
  };

  const goSibling = (delta: number) => {
    const next = siblings[siblingIndex + delta];
    if (!next) return;
    handleSave();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace({ pathname: '/task/[id]', params: { id: next.uid } });
  };

  const handleAddComment = () => {
    if (!newComment.trim() && stagedAttachments.length === 0) return;
    const comment: CommentAttachment = {
      id: generateId(),
      text: newComment,
      attachments: stagedAttachments,
      addedBy: currentUser?.username || 'Unknown',
      addedAt: new Date().toISOString(),
    };
    const updatedHistory = [comment, ...commentHistory];
    setCommentHistory(updatedHistory);
    setNewComment('');
    setStagedAttachments([]);
    updateTask(id, { commentHistory: updatedHistory });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveStagedAttachment = (attachId: string) => {
    setStagedAttachments(prev => prev.filter(a => a.id !== attachId));
  };

  const handleAttachmentResult = (newAttachment: Attachment, isForComment: boolean = false) => {
    if (isForComment) {
      setStagedAttachments(prev => [...prev, newAttachment]);
    } else {
      const updated = [...attachments, newAttachment];
      setAttachments(updated);
      updateTask(id, { attachments: updated });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTakePhoto = async (isForComment: boolean = false) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') alert('Camera permission is required.');
      else Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      handleAttachmentResult({
        id: generateId(), uri: asset.uri, name: asset.fileName || `Photo_${Date.now()}.jpg`,
        type: 'photo', mimeType: asset.mimeType || 'image/jpeg', addedAt: new Date().toISOString(),
      }, isForComment);
    }
  };

  const handlePickPhoto = async (isForComment: boolean = false) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') alert('Photo library permission is required.');
      else Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      handleAttachmentResult({
        id: generateId(), uri: asset.uri, name: asset.fileName || `Photo_${Date.now()}.jpg`,
        type: 'photo', mimeType: asset.mimeType || 'image/jpeg', addedAt: new Date().toISOString(),
      }, isForComment);
    }
  };

  const handleUploadFile = async (isForComment: boolean = false) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        handleAttachmentResult({
          id: generateId(), uri: asset.uri, name: asset.name || `File_${Date.now()}`,
          type: 'file', mimeType: asset.mimeType || 'application/octet-stream', addedAt: new Date().toISOString(),
        }, isForComment);
      }
    } catch (e) {
      // user cancelled
    }
  };

  const showAttachOptions = (isForComment: boolean = false) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Photo Library', 'Upload File'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) handleTakePhoto(isForComment);
          else if (index === 2) handlePickPhoto(isForComment);
          else if (index === 3) handleUploadFile(isForComment);
        }
      );
    } else {
      handlePickPhoto(isForComment);
    }
  };

  const renderAttachment = (att: Attachment, onRemove?: (id: string) => void) => (
    <View key={att.id} style={styles.attachItem}>
      {att.type === 'photo' ? (
        <Image source={{ uri: att.uri }} style={styles.attachThumb} />
      ) : (
        <View style={styles.attachFileIcon}>
          <Ionicons name="document-text" size={24} color={Colors.primary} />
        </View>
      )}
      <View style={styles.attachInfo}>
        <Text style={styles.attachName} numberOfLines={1}>{att.name}</Text>
        <Text style={styles.attachDate}>{new Date(att.addedAt).toLocaleDateString()}</Text>
      </View>
      {onRemove && (
        <Pressable onPress={() => onRemove(att.id)} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={Colors.danger} />
        </Pressable>
      )}
    </View>
  );

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

  const progress = siblings.length ? ((siblingIndex + 1) / siblings.length) * 100 : 0;

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top }]}>
      {/* Red command bar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => { handleSave(); router.back(); }} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>{taskDef.uid} · {taskDef.section}</Text>
        <Pressable onPress={handleSave} hitSlop={12} style={styles.navBtn}>
          <Text style={styles.navSave}>Save</Text>
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Grey bars carry the hierarchy */}
        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarText}>{taskDef.section}</Text>
        </View>
        {!!taskDef.subsection && (
          <View style={styles.subBar}>
            <Text style={styles.subBarText}>{taskDef.subsection}</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.taskName}>
            {taskDef.uid} {taskDef.name}
            {!isOverhaul ? <Text style={styles.required}> *</Text> : null}
          </Text>
          {!!taskDef.description && <Text style={styles.taskDescription}>{taskDef.description}</Text>}

          {isCompleted && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.completedBannerText}>
                Completed by {taskState?.completedBy}
                {taskState?.completedAt ? ` · ${new Date(taskState.completedAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
          )}

          {/* Answer — segmented, blue = selected */}
          {!isOverhaul && (
            <View style={styles.segmented}>
              {RESPONSE_OPTIONS.map((opt, i) => {
                const on = response === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      if (isCompleted) return;
                      Haptics.selectionAsync();
                      setResponse(on ? '' : opt.value);
                    }}
                    style={[
                      styles.segment,
                      i < RESPONSE_OPTIONS.length - 1 && styles.segmentDivider,
                      on && styles.segmentOn,
                    ]}
                  >
                    <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {isOverhaul && (
            <>
              <View style={styles.estBox}>
                <Text style={styles.estText}>Est {taskDef.estDuration}h · {taskDef.estLabor} labour</Text>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Actual duration (h)</Text>
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
                  <Text style={styles.fieldLabel}>Actual labour</Text>
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
            </>
          )}

          {!!taskDef.saisRef && (
            <View style={styles.refBox}>
              <Text style={styles.refText}>{taskDef.saisRef}</Text>
            </View>
          )}

          {/* Completed by */}
          <Text style={styles.fieldLabel}>Completed by</Text>
          <Pressable onPress={() => { if (!isCompleted) setShowAssignPicker(!showAssignPicker); }} style={styles.pickerButton}>
            <Text style={[styles.pickerText, !assignedTo && { color: Colors.textTertiary }]}>
              {assignedTo || 'Select team member'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
          </Pressable>
          {showAssignPicker && (
            <View style={styles.pickerDropdown}>
              {projectMembers.map(name => (
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

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Checked by</Text>
          <TextInput
            style={styles.fieldInput}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="Enter name"
            placeholderTextColor={Colors.textTertiary}
            editable={!isCompleted}
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Remarks</Text>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add a note for the SAIS report…"
            placeholderTextColor={Colors.textTertiary}
            multiline
            editable={!isCompleted}
          />

          {/* Attachments */}
          <View style={styles.attachRow}>
            <Pressable onPress={() => showAttachOptions(false)} style={styles.attachBtn} disabled={isCompleted}>
              <Ionicons name="camera-outline" size={18} color={Colors.text} />
              <Text style={styles.attachBtnText}>Photo</Text>
            </Pressable>
            <Pressable onPress={() => handleUploadFile(false)} style={styles.attachBtn} disabled={isCompleted}>
              <Ionicons name="document-outline" size={18} color={Colors.text} />
              <Text style={styles.attachBtnText}>File</Text>
            </Pressable>
          </View>
          {attachments.length > 0 && (
            <View style={styles.attachList}>{attachments.map(att => renderAttachment(att))}</View>
          )}

          {/* Comments */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Add comment</Text>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a new comment…"
            placeholderTextColor={Colors.textTertiary}
            multiline
            editable={!isCompleted}
          />
          {stagedAttachments.length > 0 && (
            <View style={styles.attachList}>
              {stagedAttachments.map(att => renderAttachment(att, handleRemoveStagedAttachment))}
            </View>
          )}
          <View style={styles.attachRow}>
            <Pressable onPress={() => showAttachOptions(true)} style={styles.attachBtn} disabled={isCompleted}>
              <Ionicons name="attach" size={18} color={Colors.text} />
              <Text style={styles.attachBtnText}>Attach</Text>
            </Pressable>
            <Pressable
              onPress={handleAddComment}
              disabled={!newComment.trim() && stagedAttachments.length === 0}
              style={[styles.postBtn, (!newComment.trim() && stagedAttachments.length === 0) && { opacity: 0.5 }]}
            >
              <Text style={styles.postBtnText}>Post</Text>
            </Pressable>
          </View>

          {commentHistory.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <Text style={styles.fieldLabel}>Comment history</Text>
              {commentHistory.map(comment => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{comment.addedBy}</Text>
                    <Text style={styles.commentDate}>{new Date(comment.addedAt).toLocaleString()}</Text>
                  </View>
                  {!!comment.text && <Text style={styles.commentText}>{comment.text}</Text>}
                  {comment.attachments.length > 0 && (
                    <View style={styles.commentAttachments}>
                      {comment.attachments.map(att => renderAttachment(att))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Complete + pager */}
          {!isCompleted ? (
            <Pressable onPress={handleComplete} style={({ pressed }) => [styles.completeButton, pressed && { opacity: 0.85 }]}>
              <Text style={styles.completeButtonText}>Mark complete</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleUncomplete} style={({ pressed }) => [styles.reopenButton, pressed && { opacity: 0.85 }]}>
              <Text style={styles.reopenButtonText}>Reopen task</Text>
            </Pressable>
          )}

          <View style={styles.pagerRow}>
            <Pressable
              onPress={() => goSibling(-1)}
              disabled={siblingIndex <= 0}
              style={({ pressed }) => [styles.pagerBtn, pressed && { backgroundColor: Colors.borderStrong }, siblingIndex <= 0 && { opacity: 0.4 }]}
            >
              <Ionicons name="chevron-back" size={34} color={Colors.text} />
            </Pressable>
            <Pressable
              onPress={() => goSibling(1)}
              disabled={siblingIndex >= siblings.length - 1}
              style={({ pressed }) => [styles.pagerBtn, pressed && { backgroundColor: Colors.borderStrong }, siblingIndex >= siblings.length - 1 && { opacity: 0.4 }]}
            >
              <Ionicons name="chevron-forward" size={34} color={Colors.text} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  errorText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: Colors.danger, textAlign: 'center', marginTop: 40 },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: 14, height: 54,
  },
  navBtn: { minWidth: 46, alignItems: 'center', justifyContent: 'center', height: 44 },
  navTitle: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF', textAlign: 'center' as const },
  navSave: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },
  progressTrack: { height: 6, backgroundColor: Colors.danger },
  progressFill: { height: 6, backgroundColor: Colors.selected },

  sectionBar: { backgroundColor: Colors.sectionBar, paddingHorizontal: 16, paddingVertical: 11 },
  sectionBarText: { fontSize: 14.5, fontFamily: 'Inter_700Bold', color: Colors.text },
  subBar: {
    backgroundColor: Colors.subBar, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  subBarText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },

  body: { padding: 16, gap: 4 },
  taskName: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text, lineHeight: 24 },
  required: { color: Colors.primary },
  taskDescription: { fontSize: 14.5, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 21, marginTop: 6 },

  completedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: Colors.success, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 10,
  },
  completedBannerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFF' },

  segmented: {
    flexDirection: 'row', alignSelf: 'flex-start' as const, marginTop: 16,
    borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 3, overflow: 'hidden' as const,
  },
  segment: { minWidth: 62, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.subBar },
  segmentDivider: { borderRightWidth: 1, borderRightColor: Colors.borderStrong },
  segmentOn: { backgroundColor: Colors.selected },
  segmentText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  segmentTextOn: { color: '#FFF', fontFamily: 'Inter_700Bold' },

  estBox: {
    marginTop: 16, backgroundColor: Colors.field, borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 2, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' as const,
  },
  estText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },

  refBox: {
    marginTop: 18, backgroundColor: Colors.field, borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 2, paddingHorizontal: 12, paddingVertical: 10,
  },
  refText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },

  fieldRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  fieldHalf: { flex: 1, gap: 6 },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.7, marginTop: 18, marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: Colors.field, borderRadius: 3, paddingHorizontal: 13, height: 46,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderStrong,
  },
  textArea: { height: 84, paddingTop: 12, textAlignVertical: 'top' as const },

  pickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.field, borderRadius: 3, paddingHorizontal: 13, height: 46,
    borderWidth: 1, borderColor: Colors.borderStrong,
  },
  pickerText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text },
  pickerDropdown: {
    backgroundColor: Colors.field, borderRadius: 3, borderWidth: 1, borderColor: Colors.borderStrong,
    overflow: 'hidden' as const, marginTop: 4,
  },
  pickerItem: { paddingHorizontal: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  pickerItemActive: { backgroundColor: Colors.primaryLight },
  pickerItemText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },

  attachRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  attachBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, backgroundColor: Colors.field, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 3,
  },
  attachBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  postBtn: { flex: 1, height: 46, backgroundColor: Colors.primary, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  postBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFF' },
  attachList: { gap: 8, marginTop: 12 },
  attachItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.field,
    padding: 8, borderRadius: 3, borderWidth: 1, borderColor: Colors.borderStrong,
  },
  attachThumb: { width: 44, height: 44, borderRadius: 2 },
  attachFileIcon: { width: 44, height: 44, borderRadius: 2, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  attachInfo: { flex: 1 },
  attachName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  attachDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textTertiary },

  commentItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },
  commentDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textTertiary },
  commentText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 8 },
  commentAttachments: { marginTop: 4, gap: 8 },

  completeButton: {
    marginTop: 24, height: 52, borderRadius: 3, backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  completeButtonText: { fontSize: 15.5, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 0.3 },
  reopenButton: {
    marginTop: 24, height: 52, borderRadius: 3, backgroundColor: Colors.field,
    borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  reopenButtonText: { fontSize: 15.5, fontFamily: 'Inter_700Bold', color: Colors.primary },

  pagerRow: { flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 8 },
  pagerBtn: {
    flex: 1, height: 56, backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 3,
    alignItems: 'center', justifyContent: 'center',
  },
});
