import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, logout, projects, currentProject, selectProject, deleteProject, users } = useApp();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
          },
        },
      ]
    );
  };

  const canAddProject = React.useMemo(() => {
    if (!currentUser) return false;
    const username = currentUser.username.toLowerCase();
    return currentUser.role === 'admin' || username === 'admin' || username === 'darryl';
  }, [currentUser]);

  const handleDeleteProject = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Delete project "${name}"? This cannot be undone.`)) {
        deleteProject(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      Alert.alert('Delete Project', `Delete "${name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteProject(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
      ]);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <Text style={styles.headerTitle}>Settings</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#FFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser?.username}</Text>
            <Text style={styles.userRole}>{currentUser?.role === 'admin' ? 'Administrator' : 'Team Member'}</Text>
          </View>
          <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {canAddProject && (
              <View style={{ alignItems: 'flex-end' }}>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/project-setup'); }}
                  style={({ pressed }) => [styles.addProjectBtn, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.addProjectBtnText}>Add Project</Text>
                </Pressable>
              </View>
            )}
          </View>
          {canAddProject && (
            <Text style={styles.projectBtnDesc}>Set up a new escalator overhaul or commissioning project</Text>
          )}

          {projects.length === 0 ? (
            <View style={styles.emptyProjects}>
              <Text style={styles.emptyText}>No projects yet</Text>
            </View>
          ) : (
            projects.map(project => {
              const isActive = currentProject?.id === project.id;
              return (
                <Pressable
                  key={project.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    selectProject(project.id);
                  }}
                  onLongPress={() => handleDeleteProject(project.id, project.projectName)}
                  style={({ pressed }) => [styles.projectItem, isActive && styles.projectItemActive, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.projectDot, isActive && styles.projectDotActive]} />
                  <View style={styles.projectInfo}>
                    <Text style={[styles.projectName, isActive && { color: Colors.primary }]}>{project.projectName}</Text>
                    <Text style={styles.projectMeta}>{project.customer} \u00B7 {project.location}</Text>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <View style={styles.teamList}>
            {users.map(u => (
              <View key={u.username} style={styles.teamItem}>
                <View style={[styles.teamAvatar, u.username === currentUser?.username && { backgroundColor: Colors.primary }]}>
                  <Text style={styles.teamInitial}>{u.username[0]}</Text>
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{u.username}</Text>
                  {u.role === 'admin' && <Text style={styles.adminBadge}>Admin</Text>}
                </View>
                {u.username === currentUser?.username && <Text style={styles.youBadge}>You</Text>}
              </View>
            ))}
          </View>
        </View>

        <Pressable 
          onPress={handleLogout} 
          style={({ pressed }) => [styles.fullLogoutButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.fullLogoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>SCS Checklist v1.0 \u00B7 Q 43831124, Rev. 03</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  userRole: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  logoutButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  addProjectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addProjectBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  projectBtnDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textTertiary, marginBottom: 12 },
  emptyProjects: { backgroundColor: Colors.surface, borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  projectItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8 },
  projectItemActive: { borderWidth: 1.5, borderColor: Colors.primary },
  projectDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceSecondary },
  projectDotActive: { backgroundColor: Colors.primary },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  projectMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  teamList: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden' as const },
  teamItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  teamAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.textTertiary, justifyContent: 'center', alignItems: 'center' },
  teamInitial: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },
  teamInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  adminBadge: { fontSize: 10, fontFamily: 'Inter_700Bold', color: Colors.primary, backgroundColor: Colors.primary + '10', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  youBadge: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.primary, backgroundColor: Colors.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textTertiary, marginTop: 16, marginBottom: 20 },
  fullLogoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.surface, marginHorizontal: 20, height: 56, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight, marginTop: 8 },
  fullLogoutText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.danger },
});
