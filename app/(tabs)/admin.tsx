import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp, UserAccount, SubmittedReport } from '@/contexts/AppContext';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { users, projects, submittedReports, deleteProject, updateReport, addUser, deleteUser } = useApp();
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
      setNewUsername('');
      Alert.alert('Success', `Account created for ${newUsername}. Default password is: password123`);
    } else {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    }
  };

  const handleDeleteMember = (username: string) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to delete ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteUser(username);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const renderMembers = () => (
    <View style={styles.section}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Team Member</Text>
        <TextInput
          style={styles.input}
          placeholder="Username (e.g. JohnD)"
          value={newUsername}
          onChangeText={setNewUsername}
          autoCapitalize="none"
        />
        <Pressable 
          style={styles.primaryButton}
          onPress={handleAddMember}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>
      </View>

      <Text style={styles.subTitle}>Current Members ({members.length})</Text>
      {members.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={Colors.borderLight} />
          <Text style={styles.emptyStateText}>No team members added yet</Text>
        </View>
      ) : (
        members.map(member => (
          <View key={member.username} style={styles.listItem}>
            <View style={styles.listItemInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.username[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.listItemText}>{member.username}</Text>
            </View>
            <Pressable onPress={() => handleDeleteMember(member.username)} hitSlop={12}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );

  const renderProjects = () => (
    <View style={styles.section}>
      <Text style={styles.subTitle}>Manage Projects ({projects.length})</Text>
      {projects.map(project => (
        <View key={project.id} style={styles.listItem}>
          <View style={styles.listItemInfo}>
            <Ionicons name="business-outline" size={20} color={Colors.primary} />
            <View>
              <Text style={styles.listItemText}>{project.projectName}</Text>
              <Text style={styles.listItemSubtext}>{project.customer}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Pressable style={styles.iconButton} onPress={() => Alert.alert('Edit', 'Coming soon')}>
              <Ionicons name="create-outline" size={20} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => deleteProject(project.id)}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );

  const handleShareReport = async (report: SubmittedReport) => {
    try {
      await Share.share({
        message: `Schindler Report: ${report.subject || 'Commissioning'}\n\nNotes: ${report.notes || 'None'}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderReports = () => (
    <View style={styles.section}>
      <Text style={styles.subTitle}>Submitted Reports ({submittedReports.length})</Text>
      {submittedReports.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={Colors.borderLight} />
          <Text style={styles.emptyStateText}>No reports submitted yet</Text>
        </View>
      ) : (
        submittedReports.map(report => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View>
                <Text style={styles.reportTitle}>{report.subject || 'Project Report'}</Text>
                <Text style={styles.reportMeta}>By {report.submittedBy} • {new Date(report.submittedAt).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.badge, report.status === 'reviewed' ? styles.badgeSuccess : styles.badgePending]}>
                <Text style={styles.badgeText}>{report.status.toUpperCase()}</Text>
              </View>
            </View>
            {!!report.notes && (
              <Text style={styles.reportNotes} numberOfLines={2}>{report.notes}</Text>
            )}
            <View style={styles.reportActions}>
              <Pressable 
                style={styles.secondaryButton}
                onPress={() => updateReport(report.id, { status: 'reviewed' })}
              >
                <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>Mark Reviewed</Text>
              </Pressable>
              <Pressable 
                style={styles.secondaryButton}
                onPress={() => handleShareReport(report)}
              >
                <Ionicons name="share-outline" size={18} color={Colors.text} />
                <Text style={styles.secondaryButtonText}>Share</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable 
          onPress={() => { setActiveTab('members'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
        >
          <Ionicons name="people" size={20} color={activeTab === 'members' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabLabel, activeTab === 'members' && styles.activeTabLabel]}>Team</Text>
        </Pressable>
        <Pressable 
          onPress={() => { setActiveTab('projects'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.tab, activeTab === 'projects' && styles.activeTab]}
        >
          <Ionicons name="business" size={20} color={activeTab === 'projects' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabLabel, activeTab === 'projects' && styles.activeTabLabel]}>Projects</Text>
        </Pressable>
        <Pressable 
          onPress={() => { setActiveTab('reports'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
        >
          <Ionicons name="documents" size={20} color={activeTab === 'reports' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabLabel, activeTab === 'reports' && styles.activeTabLabel]}>Reports</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'projects' && renderProjects()}
        {activeTab === 'reports' && renderReports()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  activeTab: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  tabLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  activeTabLabel: { color: Colors.primary },
  content: { paddingHorizontal: 20 },
  section: { gap: 16 },
  subTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginTop: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWeight: 1, borderColor: Colors.borderLight },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  input: { backgroundColor: Colors.background, borderRadius: 12, height: 48, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight },
  primaryButton: { backgroundColor: Colors.primary, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 16, borderRadius: 16, borderWeight: 1, borderColor: Colors.borderLight },
  listItemInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  listItemText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: Colors.text },
  listItemSubtext: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  row: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyStateText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  reportCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWeight: 1, borderColor: Colors.borderLight },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reportTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  reportMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  reportNotes: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 20 },
  reportActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight },
  secondaryButtonText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePending: { backgroundColor: '#FFF9C4' },
  badgeSuccess: { backgroundColor: '#C8E6C9' },
  badgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#1B5E20' },
});