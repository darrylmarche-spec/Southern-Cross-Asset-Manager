import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp, type AdminMessage } from '@/contexts/AppContext';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function MessageRow({ message, onPress }: { message: AdminMessage; onPress: () => void }) {
  const isParts = message.type === 'parts_request';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfacePressed }]}
    >
      <View style={[styles.statusBar, { backgroundColor: message.read ? Colors.border : Colors.primary }]} />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={styles.rowTop}>
          <View style={[styles.tag, isParts ? styles.tagParts : styles.tagMessage]}>
            <Text style={styles.tagText}>{isParts ? 'PARTS REQUEST' : 'MESSAGE'}</Text>
          </View>
          {!message.read && <View style={styles.unreadDot} />}
          <Text style={styles.time}>{formatDate(message.sentAt)}</Text>
        </View>

        <Text style={[styles.subject, !message.read && styles.subjectUnread]} numberOfLines={1}>
          {message.subject}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {message.senderUsername} · {message.projectName}
        </Text>

        {!!message.body && <Text style={styles.preview} numberOfLines={2}>{message.body}</Text>}

        {message.attachments.length > 0 && (
          <View style={styles.attachRow}>
            <Ionicons name="attach" size={14} color={Colors.textSecondary} />
            <Text style={styles.attachCount}>
              {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function MessageDetail({ message, onBack }: { message: AdminMessage; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const isParts = message.type === 'parts_request';

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{message.subject}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.detailHead}>
          <View style={[styles.tag, isParts ? styles.tagParts : styles.tagMessage, { alignSelf: 'flex-start' }]}>
            <Text style={styles.tagText}>{isParts ? 'PARTS REQUEST' : 'MESSAGE'}</Text>
          </View>
          <Text style={styles.detailSubject}>{message.subject}</Text>
        </View>

        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Details</Text></View>
        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>From</Text>
          <Text style={styles.detailValue}>{message.senderUsername}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Project</Text>
          <Text style={styles.detailValue}>{message.projectName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Sent</Text>
          <Text style={styles.detailValue}>{new Date(message.sentAt).toLocaleString()}</Text>
        </View>

        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Message</Text></View>
        <Text style={styles.bodyText}>{message.body || '(No message body)'}</Text>

        {message.attachments.length > 0 && (
          <>
            <View style={styles.sectionBar}>
              <Text style={styles.sectionBarText}>Attachments ({message.attachments.length})</Text>
            </View>
            <View style={{ padding: 14, gap: 12 }}>
              {message.attachments.map(att => (
                <View key={att.id}>
                  <Image source={{ uri: att.uri }} style={styles.attachImage} />
                  <Text style={styles.attachName}>{att.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { adminMessages, markMessageRead } = useApp();
  const [selectedMessage, setSelectedMessage] = React.useState<AdminMessage | null>(null);

  const sortedMessages = useMemo(
    () => [...adminMessages].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [adminMessages]
  );
  const unreadCount = useMemo(() => adminMessages.filter(m => !m.read).length, [adminMessages]);

  const handleSelectMessage = (message: AdminMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!message.read) markMessageRead(message.id);
    setSelectedMessage(message);
  };

  if (selectedMessage) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <MessageDetail message={selectedMessage} onBack={() => setSelectedMessage(null)} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Inbox</Text>
        <View style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount} NEW</Text>
          </View>
        )}
      </View>

      {sortedMessages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mail-open-outline" size={44} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No messages</Text>
          <Text style={styles.emptySubtitle}>Messages and parts requests from team members appear here</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {sortedMessages.map(msg => (
            <MessageRow key={msg.id} message={msg} onPress={() => handleSelectMessage(msg)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, height: 54, backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF', flexShrink: 1 },
  headerBadge: { backgroundColor: '#FFF', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  headerBadgeText: { color: Colors.primary, fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text, marginTop: 6 },
  emptySubtitle: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'center' },

  row: {
    flexDirection: 'row', gap: 11, backgroundColor: Colors.surface,
    paddingRight: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  statusBar: { width: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 2, borderWidth: 1 },
  tagMessage: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tagParts: { backgroundColor: Colors.warningLight, borderColor: Colors.warningDark },
  tagText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: Colors.text, letterSpacing: 0.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  time: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginLeft: 'auto' },
  subject: { fontSize: 14.5, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  subjectUnread: { fontFamily: 'Inter_700Bold' },
  meta: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  preview: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 18 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  attachCount: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },

  detailHead: { padding: 14, gap: 8, backgroundColor: Colors.surface },
  detailSubject: { fontSize: 19, fontFamily: 'Inter_700Bold', color: Colors.text, lineHeight: 25 },
  sectionBar: {
    backgroundColor: Colors.sectionBar, paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border,
  },
  sectionBarText: {
    fontSize: 11.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },
  detailRow: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  detailKey: { width: 88, fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  detailValue: { flex: 1, fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  bodyText: { padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, lineHeight: 22 },
  attachImage: { width: '100%', height: 200, borderRadius: 2, backgroundColor: Colors.surfaceSecondary },
  attachName: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginTop: 4 },
});
