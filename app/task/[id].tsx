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

const RESPONSE_OPTIONS: { value: ResponseValue; label: string; color: string; bg: string }[] = [
  { value: 'yes', label: 'Yes', color: Colors.success, bg: Colors.successLight },
  { value: 'no', label: 'No', color: Colors.danger, bg: Colors.dangerLight },
  { value: 'check', label: 'Pass', color: Colors.success, bg: Colors.successLight },
  { value: 'na', label: 'N/A', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getTaskState, getTaskDef, updateTask, completeTask, currentUser, users, currentProject } = useApp();

  const taskDef = useMemo(() => ALL_TASKS.find(t => t.uid === id), [id]);
  const taskState = getTaskState(id || '');
  
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
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

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask(id, { 
      actDuration, 
      actLabor, 
      comments, 
      response, 
      remarks, 
      assignedTo, 
      dueDate, 
      attachments,
      commentHistory 
    });
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
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') alert('Camera permission is required.');
      else Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newAttachment: Attachment = {
        id: generateId(),
        uri: asset.uri,
        name: asset.fileName || `Photo_${Date.now()}.jpg`,
        type: 'photo',
        mimeType: asset.mimeType || 'image/jpeg',
        addedAt: new Date().toISOString(),
      };
      handleAttachmentResult(newAttachment, isForComment);
    }
  };

  const handlePickPhoto = async (isForComment: boolean = false) => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') alert('Photo library permission is required.');
      else Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newAttachment: Attachment = {
        id: generateId(),
        uri: asset.uri,
        name: asset.fileName || `Photo_${Date.now()}.jpg`,
        type: 'photo',
        mimeType: asset.mimeType || 'image/jpeg',
        addedAt: new Date().toISOString(),
      };
      handleAttachmentResult(newAttachment, isForComment);
    }
  };

  const handleUploadFile = async (isForComment: boolean = false) => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const newAttachment: Attachment = {
          id: generateId(),
          uri: asset.uri,
          name: asset.name || `File_${Date.now()}`,
          type: 'file',
          mimeType: asset.mimeType || 'application/octet-stream',
          addedAt: new Date().toISOString(),
        };
        handleAttachmentResult(newAttachment, isForComment);
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
        <Text style={styles.attachDate}>
          {new Date(att.addedAt).toLocaleDateString()}
        </Text>
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
          <Text style={styles.cardTitle}>Completion</Text>
          <Text style={styles.fieldLabel}>Completed By</Text>
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

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Checked By</Text>
          <TextInput
            style={styles.fieldInput}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="Enter name"
            placeholderTextColor={Colors.textTertiary}
            editable={!isCompleted}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Comment & Attachments</Text>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a new comment..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            editable={!isCompleted}
          />

          <View style={styles.attachSection}>
            <View style={styles.attachHeader}>
              <Text style={styles.attachLabel}>Staged Attachments</Text>
              {!isCompleted && (
                <Pressable onPress={() => showAttachOptions(true)} style={styles.attachAddBtn}>
                  <Ionicons name="add-circle" size={22} color={Colors.primary} />
                  <Text style={styles.attachAddText}>Add</Text>
                </Pressable>
              )}
            </View>

            {stagedAttachments.length > 0 && (
              <View style={styles.attachList}>
                {stagedAttachments.map(att => renderAttachment(att, handleRemoveStagedAttachment))}
              </View>
            )}

            <Pressable
              onPress={handleAddComment}
              disabled={!newComment.trim() && stagedAttachments.length === 0}
              style={[
                styles.addCommentBtn,
                (!newComment.trim() && stagedAttachments.length === 0) && { opacity: 0.5 }
              ]}
            >
              <Text style={styles.addCommentBtnText}>Post Comment</Text>
            </Pressable>
          </View>
        </View>

        {commentHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comment History</Text>
            {commentHistory.map((comment) => (
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
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' as const },
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
  completeButtonText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  reopenButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 14, height: 52, borderWidth: 1, borderColor: Colors.accent, marginTop: 4 },
  reopenButtonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.accent },
  attachSection: { gap: 10 },
  attachHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attachLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  attachAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attachAddText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  attachList: { gap: 8 },
  attachItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.background, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight },
  attachThumb: { width: 40, height: 40, borderRadius: 6 },
  attachFileIcon: { width: 40, height: 40, borderRadius: 6, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  attachInfo: { flex: 1 },
  attachName: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text },
  attachDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textTertiary },
  attachEmpty: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textTertiary, fontStyle: 'italic' as const },
  addCommentBtn: { backgroundColor: Colors.primary, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  addCommentBtnText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  commentItem: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },
  commentDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textTertiary },
  commentText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 8 },
  commentAttachments: { marginTop: 4, gap: 8 },
});