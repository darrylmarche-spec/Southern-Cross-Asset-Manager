import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform, Share } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/colors';
import { useApp, SubmittedReport } from '@/contexts/AppContext';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { users, projects, submittedReports, deleteProject, addUser, deleteUser } = useApp();
  const [activeTab, setActiveTab] = useState<'members' | 'projects' | 'reports'>('members');
  const [newUsername, setNewUsername] = useState('');

  const members = useMemo(() => users.filter(u => u.role === 'member'), [users]);

  const handleAddMember = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }
    if (users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      Alert.alert('Error', 'Username already exists');
      return;
    }
    const success = await addUser(newUsername.trim(), 'member');
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Account created', `Account created for ${newUsername}. Default password is: password123`);
      setNewUsername('');
    } else {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    }
  };

  const handleDeleteMember = (username: string) => {
    Alert.alert('Delete Member', `Are you sure you want to delete ${username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteUser(username);
          if (success) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          else {
            Alert.alert('Error', 'Failed to delete member. Please try again.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        },
      },
    ]);
  };

  const handleOpenReport = async (report: SubmittedReport) => {
    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (w) { w.document.write(report.content); w.document.close(); }
    } else {
      try {
        const { uri } = await Print.printToFileAsync({ html: report.content });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'View Report' });
      } catch (error) { console.error(error); }
    }
  };

  const handleShareReport = async (report: SubmittedReport) => {
    try {
      await Share.share({
        message: `Schindler Report: ${report.subject || 'Commissioning'}\n\nNotes: ${report.notes || 'None'}`,
      });
    } catch (error) { console.error(error); }
  };

  const renderMembers = () => (
    <View>
      <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Add team member</Text></View>
      <View style={styles.formBlock}>
        <TextInput
          style={styles.input}
          placeholder="Username (e.g. JohnD)"
          placeholderTextColor={Colors.textTertiary}
          value={newUsername}
          onChangeText={setNewUsername}
          autoCapitalize="none"
        />
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && { backgroundColor: Colors.primaryDark }]}
          onPress={handleAddMember}
        >
          <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
        </Pressable>
      </View>

      <View style={styles.sectionBar}>
        <Text style={styles.sectionBarText}>Current members ({members.length})</Text>
      </View>
      {members.length === 0 ? (
        <Text style={styles.emptyText}>No team members added yet</Text>
      ) : (
        members.map(member => (
          <View key={member.username} style={styles.listItem}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.username[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.listItemText}>{member.username}</Text>
            <Pressable onPress={() => handleDeleteMember(member.username)} hitSlop={12}>
              <Ionicons name="trash-outline" size={19} color={Colors.danger} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );

  const renderProjects = () => (
    <View>
      <View style={styles.sectionBar}>
        <Text style={styles.sectionBarText}>Manage projects ({projects.length})</Text>
      </View>
      {projects.length === 0 ? (
        <Text style={styles.emptyText}>No projects yet</Text>
      ) : (
        projects.map(project => (
          <View key={project.id} style={styles.listItem}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.listItemText} numberOfLines={1}>{project.projectName}</Text>
              <Text style={styles.listItemSubtext} numberOfLines={1}>{project.customer}</Text>
            </View>
            <Pressable
              hitSlop={8}
              style={styles.iconButton}
              onPress={() => router.push({ pathname: '/project-setup', params: { projectId: project.id } })}
            >
              <Ionicons name="create-outline" size={19} color={Colors.textSecondary} />
            </Pressable>
            <Pressable hitSlop={8} style={styles.iconButton} onPress={() => deleteProject(project.id)}>
              <Ionicons name="trash-outline" size={19} color={Colors.danger} />
            </Pressable>
          </View>
        ))
      )}
      <View style={{ padding: 14 }}>
        <Pressable
          onPress={() => router.push('/project-setup')}
          style={({ pressed }) => [styles.primaryButton, pressed && { backgroundColor: Colors.primaryDark }]}
        >
          <Text style={styles.primaryButtonText}>NEW PROJECT</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderReports = () => (
    <View>
      <View style={styles.sectionBar}>
        <Text style={styles.sectionBarText}>Submitted reports ({submittedReports.length})</Text>
      </View>
      {submittedReports.length === 0 ? (
        <Text style={styles.emptyText}>No reports submitted yet</Text>
      ) : (
        submittedReports.map(report => (
          <View key={report.id} style={styles.reportRow}>
            <Text style={styles.reportTitle} numberOfLines={1}>{report.subject || 'Project Report'}</Text>
            <Text style={styles.reportMeta}>
              {report.submittedBy} · {new Date(report.submittedAt).toLocaleDateString()}
            </Text>
            {!!report.notes && <Text style={styles.reportNotes} numberOfLines={2}>{report.notes}</Text>}
            <View style={styles.reportActions}>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && { backgroundColor: Colors.primaryLight }]}
                onPress={() => handleOpenReport(report)}
              >
                <Ionicons name="eye-outline" size={17} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>View</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && { backgroundColor: Colors.primaryLight }]}
                onPress={() => handleShareReport(report)}
              >
                <Ionicons name="share-outline" size={17} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>Share</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const TABS: Array<{ key: 'members' | 'projects' | 'reports'; label: string }> = [
    { key: 'members', label: 'Team' },
    { key: 'projects', label: 'Projects' },
    { key: 'reports', label: 'Reports' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin</Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(t => {
          const on = activeTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => { setActiveTab(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'projects' && renderProjects()}
        {activeTab === 'reports' && renderReports()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    justifyContent: 'center', paddingHorizontal: 16, height: 54, backgroundColor: Colors.primary,
  },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' },

  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.subBar,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: Colors.primary, backgroundColor: Colors.surface },
  tabLabel: {
    fontSize: 12.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.7,
  },
  tabLabelOn: { color: Colors.primary },

  sectionBar: {
    backgroundColor: Colors.sectionBar, paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border,
  },
  sectionBarText: {
    fontSize: 11.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },

  formBlock: { padding: 14, gap: 10 },
  input: {
    backgroundColor: Colors.field, borderRadius: 2, height: 46, paddingHorizontal: 12,
    fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderStrong,
  },
  primaryButton: {
    backgroundColor: Colors.primary, borderRadius: 3, height: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 0.6 },

  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  avatar: {
    width: 30, height: 30, borderRadius: 2, backgroundColor: Colors.chrome,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFF' },
  listItemText: { flex: 1, fontSize: 14.5, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  listItemSubtext: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  iconButton: { padding: 6 },

  emptyText: {
    fontSize: 13.5, fontFamily: 'Inter_600SemiBold', color: Colors.textTertiary,
    textAlign: 'center', paddingVertical: 28,
  },

  reportRow: {
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 5,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  reportTitle: { fontSize: 14.5, fontFamily: 'Inter_700Bold', color: Colors.text },
  reportMeta: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  reportNotes: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 18 },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.field,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 2,
    borderWidth: 1, borderColor: Colors.primary,
  },
  secondaryButtonText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.primary },
});
