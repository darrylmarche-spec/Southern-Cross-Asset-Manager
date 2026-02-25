import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
  const { currentProject, currentUser } = useApp();

  const today = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const [reportDate] = useState(today);
  const [projectName] = useState(currentProject?.projectName || '');
  const [preparedBy] = useState(currentUser?.username || '');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachments(prev => [...prev, {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size
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
      if (Platform.OS === 'web') {
        alert('Please enter a report subject.');
      } else {
        Alert.alert('Missing Subject', 'Please enter a report subject before generating.');
      }
      return;
    }

    const attachmentsHtml = attachments.length > 0 
      ? `
        <div class="section-title">Attachments (${attachments.length})</div>
        <div class="attachments-grid">
          ${attachments.map(a => `
            <div class="attachment-item">
              <span class="attachment-icon">📎</span>
              <span class="attachment-name">${a.name}</span>
            </div>
          `).join('')}
        </div>
      `
      : '';

    const html = `<!DOCTYPE html><html><head><style>
      @page { margin: 30px; }
      body { font-family: Arial, Helvetica, sans-serif; padding: 30px; font-size: 12px; color: #222; line-height: 1.5; }
      .report-header { border-bottom: 3px solid #CC0000; padding-bottom: 16px; margin-bottom: 20px; }
      .brand { font-size: 20px; font-weight: bold; color: #CC0000; margin-bottom: 2px; }
      .brand-sub { font-size: 11px; color: #666; margin-bottom: 14px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 30px; }
      .info-row { display: flex; gap: 6px; }
      .info-label { font-weight: bold; color: #555; min-width: 100px; }
      .info-value { color: #222; }
      .section-title { font-size: 14px; font-weight: bold; color: #CC0000; margin-top: 24px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
      .section-content { min-height: 80px; padding: 10px; background: #fafafa; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; margin-bottom: 4px; }
      .empty-content { min-height: 80px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
      .attachments-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .attachment-item { display: flex; align-items: center; gap: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; border: 1px solid #eee; }
      .attachment-icon { font-size: 16px; }
      .attachment-name { color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sig-section { margin-top: 50px; display: flex; gap: 60px; }
      .sig-block { flex: 1; }
      .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 6px; font-size: 11px; color: #555; }
      .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
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
      <div class="${notes ? 'section-content' : 'empty-content'}">${notes || ''}</div>

      ${attachmentsHtml}

      <div class="footer">Schindler Southern Cross Crew - Confidential Report - ${reportDate}</div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Manual Report' });
      }
    } catch (e) {
      console.error('Manual report PDF error:', e);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Manual Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.autoFillCard}>
          <View style={styles.autoFillHeader}>
            <Ionicons name="information-circle" size={18} color={Colors.primary} />
            <Text style={styles.autoFillLabel}>Auto-filled from project</Text>
          </View>
          <View style={styles.autoFillRow}>
            <Text style={styles.autoFillKey}>Date</Text>
            <Text style={styles.autoFillValue}>{reportDate}</Text>
          </View>
          <View style={styles.autoFillRow}>
            <Text style={styles.autoFillKey}>Project</Text>
            <Text style={styles.autoFillValue}>{projectName}</Text>
          </View>
          <View style={styles.autoFillRow}>
            <Text style={styles.autoFillKey}>Prepared By</Text>
            <Text style={styles.autoFillValue}>{preparedBy}</Text>
          </View>
        </View>

        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Subject *</Text>
          <TextInput
            style={styles.fieldInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="Enter report subject"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter report notes..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </View>

        <View style={styles.fieldCard}>
          <View style={styles.attachmentsHeader}>
            <Text style={styles.fieldLabel}>Attachments</Text>
            <Pressable onPress={pickDocument} style={styles.addAttachmentButton}>
              <Ionicons name="attach" size={20} color={Colors.primary} />
              <Text style={styles.addAttachmentText}>Add File</Text>
            </Pressable>
          </View>

          {attachments.length > 0 ? (
            <View style={styles.attachmentList}>
              {attachments.map((file, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Ionicons name="document-attach-outline" size={20} color={Colors.textSecondary} />
                  <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                  <Pressable onPress={() => removeAttachment(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={Colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noAttachmentsText}>No files attached</Text>
          )}
        </View>

        <Pressable
          onPress={generateAndShare}
          style={({ pressed }) => [styles.generateButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        >
          <Ionicons name="share-outline" size={20} color="#FFF" />
          <Text style={styles.generateButtonText}>Generate & Share Report</Text>
        </Pressable>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  navTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  content: { padding: 20, gap: 16 },
  autoFillCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.primaryLight },
  autoFillHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  autoFillLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  autoFillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  autoFillKey: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  autoFillValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  fieldCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  fieldInput: { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight },
  textArea: { height: 120, paddingTop: 12, textAlignVertical: 'top' as const },
  attachmentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addAttachmentButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addAttachmentText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  attachmentList: { gap: 8, marginTop: 4 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.background, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight },
  attachmentName: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text },
  noAttachmentsText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textTertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, height: 52, marginTop: 8 },
  generateButtonText: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});

