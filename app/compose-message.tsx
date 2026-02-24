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
      if (Platform.OS === 'web') {
        alert('Camera permission is required to take photos.');
      } else {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const newAttachment: Attachment = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        uri: asset.uri,
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        type: 'photo',
        mimeType: asset.mimeType || 'image/jpeg',
        addedAt: new Date().toISOString(),
      };
      setAttachments(prev => [...prev, newAttachment]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = () => {
    if (!body.trim() && !subject.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a message.');
      } else {
        Alert.alert('Empty Message', 'Please enter a message before sending.');
      }
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
            <Ionicons name="close" size={28} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={handleSend}
            disabled={sending}
            style={({ pressed }) => [styles.sendButton, pressed && { opacity: 0.7 }, sending && { opacity: 0.5 }]}
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
        >
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

          <View style={styles.divider} />

          <TextInput
            style={styles.subjectInput}
            placeholder="Subject"
            placeholderTextColor={Colors.textTertiary}
            value={subject}
            onChangeText={setSubject}
          />

          <View style={styles.divider} />

          <TextInput
            style={styles.bodyInput}
            placeholder={isPartsRequest
              ? "Describe the parts needed, quantities, part numbers if known..."
              : "Type your message here..."}
            placeholderTextColor={Colors.textTertiary}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />

          {attachments.length > 0 && (
            <View style={styles.attachmentSection}>
              <Text style={styles.attachmentTitle}>Attachments ({attachments.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentScroll}>
                {attachments.map(att => (
                  <View key={att.id} style={styles.attachmentItem}>
                    <Image source={{ uri: att.uri }} style={styles.attachmentThumb} />
                    <Pressable
                      onPress={() => removeAttachment(att.id)}
                      style={styles.removeAttachment}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={22} color={Colors.danger} />
                    </Pressable>
                    <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.attachActions}>
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [styles.attachButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="images-outline" size={22} color={Colors.primary} />
              <Text style={styles.attachButtonText}>Add File</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={takePhoto}
                style={({ pressed }) => [styles.attachButton, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="camera-outline" size={22} color={Colors.primary} />
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  sendButtonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  metaLabel: {
    width: 60,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  subjectInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  bodyInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    minHeight: 150,
  },
  attachmentSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  attachmentTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  attachmentScroll: {
    flexDirection: 'row',
  },
  attachmentItem: {
    marginRight: 12,
    width: 80,
    alignItems: 'center',
  },
  attachmentThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  attachmentName: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  attachActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  attachButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
});
