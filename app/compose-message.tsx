import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert, ScrollView, Image, KeyboardAvoidingView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useApp, type Attachment } from '@/contexts/AppContext';

export default function ComposeMessageScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: 'message' | 'parts_request' }>();
  const { currentUser, currentProject, sendAdminMessage } = useApp();

  const isPartsRequest = type === 'parts_request';
  const title = isPartsRequest ? 'Parts Request' : 'Message Admin';

  const [subject, setSubject] = useState(isPartsRequest ? 'Parts Request' : '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newAttachments: Attachment[] = result.assets.map((asset, idx) => ({
        id: Date.now().toString() + idx + Math.random().toString(36).substr(2, 5),
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}_${idx}.jpg`,
        type: 'photo' as const,
        mimeType: asset.mimeType || 'image/jpeg',
        addedAt: new Date().toISOString(),
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') alert('Camera permission is required to take photos.');
      else Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setAttachments(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        uri: asset.uri,
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        type: 'photo',
        mimeType: asset.mimeType || 'image/jpeg',
        addedAt: new Date().toISOString(),
      }]);
    }
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const handleSend = () => {
    if (!body.trim() && !subject.trim()) {
      if (Platform.OS === 'web') alert('Please enter a message.');
      else Alert.alert('Empty Message', 'Please enter a message before sending.');
      return;
    }
    if (!currentProject || !currentUser) return;

    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    sendAdminMessage({
      type: isPartsRequest ? 'parts_request' : 'message',
      projectId: currentProject.id,
      projectName: currentProject.projectName,
      senderUsername: currentUser.username,
      subject: subject.trim() || (isPartsRequest ? 'Parts Request' : 'Message'),
      body: body.trim(),
      attachments,
    });

    setTimeout(() => {
      setSending(false);
      if (Platform.OS === 'web') {
        alert('Message sent successfully!');
      } else {
        Alert.alert('Sent', 'Your message has been sent to the admin team.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      router.back();
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={handleSend}
            disabled={sending}
            style={({ pressed }) => [styles.sendButton, (pressed || sending) && { opacity: 0.7 }]}
          >
            <Text style={styles.sendButtonText}>SEND</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Routing</Text></View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>From</Text>
            <Text style={styles.metaValue}>{currentUser?.username}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>To</Text>
            <Text style={styles.metaValue}>Admin Team</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Project</Text>
            <Text style={styles.metaValue} numberOfLines={1}>{currentProject?.projectName || 'N/A'}</Text>
          </View>

          <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Subject</Text></View>
          <View style={styles.fieldWrap}>
            <TextInput
              style={styles.subjectInput}
              placeholder="Subject"
              placeholderTextColor={Colors.textTertiary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Message</Text></View>
          <View style={styles.fieldWrap}>
            <TextInput
              style={styles.bodyInput}
              placeholder={isPartsRequest
                ? 'Describe the parts needed, quantities, part numbers if known…'
                : 'Type your message here…'}
              placeholderTextColor={Colors.textTertiary}
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>Attachments ({attachments.length})</Text>
          </View>

          {attachments.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachStrip}>
              {attachments.map(att => (
                <View key={att.id} style={styles.attachmentItem}>
                  <Image source={{ uri: att.uri }} style={styles.attachmentThumb} />
                  <Pressable onPress={() => removeAttachment(att.id)} style={styles.removeAttachment} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={Colors.danger} />
                  </Pressable>
                  <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.attachActions}>
            <Pressable onPress={pickImage} style={({ pressed }) => [styles.attachButton, pressed && { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="images-outline" size={19} color={Colors.primary} />
              <Text style={styles.attachButtonText}>Add file</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable onPress={takePhoto} style={({ pressed }) => [styles.attachButton, pressed && { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="camera-outline" size={19} color={Colors.primary} />
                <Text style={styles.attachButtonText}>Camera</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 54, backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' },
  sendButton: {
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 2,
  },
  sendButtonText: { color: Colors.primary, fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 0.6 },

  sectionBar: {
    backgroundColor: Colors.sectionBar, paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border,
  },
  sectionBarText: {
    fontSize: 11.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  metaLabel: { width: 80, fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  metaValue: { flex: 1, fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: Colors.text },

  fieldWrap: { padding: 14 },
  subjectInput: {
    backgroundColor: Colors.field, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 2,
    paddingHorizontal: 12, height: 46, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text,
  },
  bodyInput: {
    backgroundColor: Colors.field, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 2,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 150,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text,
  },

  attachStrip: { flexDirection: 'row', padding: 14, gap: 12 },
  attachmentItem: { width: 80, alignItems: 'center' },
  attachmentThumb: {
    width: 72, height: 72, borderRadius: 2,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.borderStrong,
  },
  removeAttachment: { position: 'absolute', top: -6, right: 0, backgroundColor: '#FFF', borderRadius: 10 },
  attachmentName: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },

  attachActions: { flexDirection: 'row', gap: 10, padding: 14 },
  attachButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.field,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 2,
    borderWidth: 1, borderColor: Colors.primary,
  },
  attachButtonText: { fontSize: 13.5, fontFamily: 'Inter_700Bold', color: Colors.primary },
});
