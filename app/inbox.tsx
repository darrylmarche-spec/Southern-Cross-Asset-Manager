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
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function MessageCard({ message, onPress }: { message: AdminMessage; onPress: () => void }) {
  const isPartsRequest = message.type === 'parts_request';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.messageCard,
        !message.read && styles.unreadCard,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.messageHeader}>
        <View style={[styles.typeBadge, isPartsRequest ? styles.partsBadge : styles.messageBadge]}>
          <Ionicons
            name={isPartsRequest ? 'construct' : 'mail'}
            size={12}
            color={isPartsRequest ? '#B45309' : Colors.primary}
          />
          <Text style={[styles.typeBadgeText, isPartsRequest ? styles.partsBadgeText : styles.messageBadgeText]}>
            {isPartsRequest ? 'Parts Request' : 'Message'}
          </Text>
        </View>
        {!message.read && <View style={styles.unreadDot} />}
        <Text style={styles.messageTime}>{formatDate(message.sentAt)}</Text>
      </View>

      <Text style={[styles.messageSubject, !message.read && styles.unreadText]} numberOfLines={1}>
        {message.subject}
      </Text>

      <View style={styles.messageMeta}>
        <Ionicons name="person-outline" size={13} color={Colors.textSecondary} />
        <Text style={styles.messageMetaText}>{message.senderUsername}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Ionicons name="folder-outline" size={13} color={Colors.textSecondary} />
        <Text style={styles.messageMetaText} numberOfLines={1}>{message.projectName}</Text>
      </View>

      {message.body ? (
        <Text style={styles.messagePreview} numberOfLines={2}>{message.body}</Text>
      ) : null}

      {message.attachments.length > 0 && (
        <View style={styles.attachIndicator}>
          <Ionicons name="attach" size={14} color={Colors.textSecondary} />
          <Text style={styles.attachCount}>{message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}</Text>
        </View>
      )}
    </Pressable>
  );
}

function MessageDetail({ message, onBack }: { message: AdminMessage; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const isPartsRequest = message.type === 'parts_request';

  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.detailHeaderTitle} numberOfLines={1}>{message.subject}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.detailBody}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.typeBadge, isPartsRequest ? styles.partsBadge : styles.messageBadge, { alignSelf: 'flex-start', marginBottom: 12 }]}>
          <Ionicons
            name={isPartsRequest ? 'construct' : 'mail'}
            size={12}
            color={isPartsRequest ? '#B45309' : Colors.primary}
          />
          <Text style={[styles.typeBadgeText, isPartsRequest ? styles.partsBadgeText : styles.messageBadgeText]}>
            {isPartsRequest ? 'Parts Request' : 'Message'}
          </Text>
        </View>

        <Text style={styles.detailSubject}>{message.subject}</Text>

        <View style={styles.detailMetaRow}>
          <Text style={styles.detailMetaLabel}>From:</Text>
          <Text style={styles.detailMetaValue}>{message.senderUsername}</Text>
        </View>
        <View style={styles.detailMetaRow}>
          <Text style={styles.detailMetaLabel}>Project:</Text>
          <Text style={styles.detailMetaValue}>{message.projectName}</Text>
        </View>
        <View style={styles.detailMetaRow}>
          <Text style={styles.detailMetaLabel}>Sent:</Text>
          <Text style={styles.detailMetaValue}>{new Date(message.sentAt).toLocaleString()}</Text>
        </View>

        <View style={styles.detailDivider} />

        <Text style={styles.detailBodyText}>{message.body || '(No message body)'}</Text>

        {message.attachments.length > 0 && (
          <View style={styles.detailAttachments}>
            <Text style={styles.detailAttachTitle}>Attachments ({message.attachments.length})</Text>
            {message.attachments.map(att => (
              <View key={att.id} style={styles.detailAttachItem}>
                <Image source={{ uri: att.uri }} style={styles.detailAttachImage} />
                <Text style={styles.detailAttachName}>{att.name}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { adminMessages, markMessageRead } = useApp();
  const [selectedMessage, setSelectedMessage] = React.useState<AdminMessage | null>(null);

  const sortedMessages = useMemo(() => {
    return [...adminMessages].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [adminMessages]);

  const unreadCount = useMemo(() => adminMessages.filter(m => !m.read).length, [adminMessages]);

  const handleSelectMessage = (message: AdminMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!message.read) {
      markMessageRead(message.id);
    }
    setSelectedMessage(message);
  };

  if (selectedMessage) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <MessageDetail
          message={selectedMessage}
          onBack={() => setSelectedMessage(null)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Inbox</Text>
        {unreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
      </View>

      {sortedMessages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mail-open-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Messages</Text>
          <Text style={styles.emptySubtitle}>Messages and parts requests from team members will appear here</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {sortedMessages.map(msg => (
            <MessageCard
              key={msg.id}
              message={msg}
              onPress={() => handleSelectMessage(msg)}
            />
          ))}
        </ScrollView>
      )}
    </View>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  headerBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  messageBadge: {
    backgroundColor: Colors.primaryLight,
  },
  partsBadge: {
    backgroundColor: Colors.warningLight,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  messageBadgeText: {
    color: Colors.primary,
  },
  partsBadgeText: {
    color: '#B45309',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },
  messageSubject: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
    marginBottom: 4,
  },
  unreadText: {
    fontFamily: 'Inter_700Bold',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  messageMetaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  metaDot: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginHorizontal: 2,
  },
  messagePreview: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  attachIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  attachCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  detailBody: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailSubject: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  detailMetaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailMetaLabel: {
    width: 60,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  detailMetaValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
  detailBodyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    lineHeight: 22,
  },
  detailAttachments: {
    marginTop: 20,
  },
  detailAttachTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 10,
  },
  detailAttachItem: {
    marginBottom: 12,
  },
  detailAttachImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  detailAttachName: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
