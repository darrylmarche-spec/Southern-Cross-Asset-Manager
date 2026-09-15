import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export interface Attachment {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export default function ManualReportScreen() {
  const insets = useSafeAreaInsets();
  const { currentProject, currentUser, submitReport } = useApp();

  const today = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const [reportDate] = useState(today);
  const [projectName] = useState(currentProject?.projectName || '');
  const [preparedBy] = useState(currentUser?.username || '');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachments(prev => [...prev, {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size,
        }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const generateAndShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!subject.trim()) {
      if (Platform.OS === 'web') alert('Please enter a report subject.');
      else Alert.alert('Missing Subject', 'Please enter a report subject before generating.');
      return;
    }
    if (!currentProject || !currentUser) return;

    const attachmentsHtml = attachments.length > 0
      ? `<div class="section-title">Attachments (${attachments.length})</div>
         <div class="attachments-grid">
           ${attachments.map(a => `<div class="attachment-item"><span class="attachment-name">${a.name}</span></div>`).join('')}
         </div>`
      : '';

    // Report styling follows the app: red rules, grey heads, flat corners.
    const html = `<!DOCTYPE html><html><head><style>
      @page { margin: 30px; }
      body { font-family: Arial, Helvetica, sans-serif; padding: 30px; font-size: 12px; color: #111; line-height: 1.5; }
      .report-header { border-bottom: 3px solid #CC0000; padding-bottom: 16px; margin-bottom: 20px; }
      .brand { font-size: 20px; font-weight: bold; color: #CC0000; margin-bottom: 2px; }
      .brand-sub { font-size: 11px; color: #5A5A5A; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.8px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 30px; }
      .info-row { display: flex; gap: 6px; }
      .info-label { font-weight: bold; color: #5A5A5A; min-width: 100px; }
      .info-value { color: #111; }
      .section-title { font-size: 12px; font-weight: bold; color: #3A3A3A; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 24px; margin-bottom: 8px; background: #D8D8D8; border: 1px solid #B8B8B8; padding: 5px 8px; }
      .section-content { min-height: 80px; padding: 10px; background: #FFF; border: 1px solid #B8B8B8; white-space: pre-wrap; }
      .attachments-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .attachment-item { padding: 8px; background: #FFF; border: 1px solid #B8B8B8; }
      .attachment-name { color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sig-section { margin-top: 50px; display: flex; gap: 60px; }
      .sig-block { flex: 1; }
      .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 6px; font-size: 11px; color: #5A5A5A; }
      .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #B8B8B8; font-size: 10px; color: #5A5A5A; text-align: center; }
    </style></head><body>
      <div class="report-header">
        <div class="brand">Schindler Southern Cross Crew</div>
        <div class="brand-sub">Manual Commissioning Report</div>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">Date:</span> <span class="info-value">${reportDate}</span></div>
          <div class="info-row"><span class="info-label">Project:</span> <span class="info-value">${projectName}</span></div>
          <div class="info-row"><span class="info-label">Prepared By:</span> <span class="info-value">${preparedBy}</span></div>
          <div class="info-row"><span class="info-label">Customer:</span> <span class="info-value">${currentProject?.customer || ''}</span></div>
          <div class="info-row"><span class="info-label">Location:</span> <span class="info-value">${currentProject?.location || ''}</span></div>
          <div class="info-row"><span class="info-label">Commission #:</span> <span class="info-value">${currentProject?.commissionNumber || ''}</span></div>
        </div>
      </div>
      <div class="section-title">Subject</div>
      <div class="section-content">${subject || ''}</div>
      <div class="section-title">Notes</div>
      <div class="section-content">${notes || ''}</div>
      ${attachmentsHtml}
      <div class="sig-section">
        <div class="sig-block"><div class="sig-line">Commissioner — name / date</div></div>
        <div class="sig-block"><div class="sig-line">SAIS Inspector — name / date</div></div>
      </div>
      <div class="footer">Schindler Southern Cross Crew — Confidential Report — ${reportDate}</div>
    </body></html>`;

    try {
      submitReport({
        projectId: currentProject.id,
        submittedBy: currentUser.username,
        type: 'manual',
        content: html,
        subject,
        notes,
      });
      Alert.alert('Report Submitted', 'The report has been saved to the admin reports section.');
      router.back();
    } catch (e) {
      console.error('Manual report submission error:', e);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color="#FFF" />
        </Pressable>
        <Text style={styles.navTitle}>Manual Report</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Auto-filled from project</Text></View>
        <View style={styles.autoRow}>
          <Text style={styles.autoKey}>Date</Text>
          <Text style={styles.autoValue}>{reportDate}</Text>
        </View>
        <View style={styles.autoRow}>
          <Text style={styles.autoKey}>Project</Text>
          <Text style={styles.autoValue} numberOfLines={1}>{projectName}</Text>
        </View>
        <View style={styles.autoRow}>
          <Text style={styles.autoKey}>Prepared by</Text>
          <Text style={styles.autoValue}>{preparedBy}</Text>
        </View>

        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Subject *</Text></View>
        <View style={styles.fieldWrap}>
          <TextInput
            style={styles.fieldInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="Enter report subject"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Notes</Text></View>
        <View style={styles.fieldWrap}>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter report notes…"
            placeholderTextColor={Colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarText}>Attachments ({attachments.length})</Text>
        </View>

        {attachments.length > 0 ? (
          <View>
            {attachments.map((file, index) => (
              <View key={index} style={styles.attachmentItem}>
                <Ionicons name="document-attach-outline" size={19} color={Colors.textSecondary} />
                <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                <Pressable onPress={() => removeAttachment(index)} hitSlop={10}>
                  <Ionicons name="close-circle" size={20} color={Colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noAttachmentsText}>No files attached</Text>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={pickDocument}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: Colors.primaryLight }]}
          >
            <Ionicons name="attach" size={19} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Add file</Text>
          </Pressable>

          <Pressable
            onPress={generateAndShare}
            style={({ pressed }) => [styles.primaryBtn, pressed && { backgroundColor: Colors.primaryDark }]}
          >
            <Text style={styles.primaryBtnText}>SUBMIT REPORT</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 54, backgroundColor: Colors.primary,
  },
  navTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' },

  sectionBar: {
    backgroundColor: Colors.sectionBar, paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border,
  },
  sectionBarText: {
    fontSize: 11.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },

  autoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  autoKey: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  autoValue: { flex: 1, textAlign: 'right', fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: Colors.text },

  fieldWrap: { padding: 14 },
  fieldInput: {
    backgroundColor: Colors.field, borderRadius: 2, paddingHorizontal: 12, height: 46,
    fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderStrong,
  },
  textArea: { height: 130, paddingTop: 10, fontFamily: 'Inter_400Regular' },

  attachmentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  attachmentName: { flex: 1, fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  noAttachmentsText: {
    fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: Colors.textTertiary,
    textAlign: 'center', paddingVertical: 16,
  },

  actions: { padding: 14, gap: 10 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 48, borderRadius: 3, backgroundColor: Colors.field,
    borderWidth: 1, borderColor: Colors.primary,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.primary },
  primaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: 3, backgroundColor: Colors.primary,
  },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 0.6 },
});
