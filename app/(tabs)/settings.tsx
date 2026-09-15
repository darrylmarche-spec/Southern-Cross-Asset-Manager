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

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await logout();
      window.location.replace('/');
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); logout(); },
        },
      ]);
    }
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
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>More</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentUser?.username} · {currentUser?.role === 'admin' ? 'Administrator' : 'Team member'}
          </Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(currentUser?.username || 'SC').slice(0, 2).toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarText}>Projects</Text>
          {canAddProject && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/project-setup'); }}
              hitSlop={8}
            >
              <Text style={styles.sectionBarAction}>Add</Text>
            </Pressable>
          )}
        </View>

        {projects.length === 0 ? (
          <View style={styles.emptyRow}><Text style={styles.emptyText}>No projects yet</Text></View>
        ) : (
          projects.map(project => {
            const isActive = currentProject?.id === project.id;
            return (
              <Pressable
                key={project.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); selectProject(project.id); }}
                onLongPress={() => handleDeleteProject(project.id, project.projectName)}
                style={({ pressed }) => [styles.row, isActive && styles.rowActive, pressed && { backgroundColor: Colors.surfacePressed }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.rowLabel, isActive && { color: Colors.primary }]}>{project.projectName}</Text>
                  <Text style={styles.rowMeta}>{project.customer} · {project.location}</Text>
                </View>
                {isActive
                  ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
              </Pressable>
            );
          })
        )}

        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Team</Text></View>
        {users.map(u => (
          <View key={u.username} style={styles.row}>
            <View style={[styles.teamAvatar, u.username === currentUser?.username && { backgroundColor: Colors.primary }]}>
              <Text style={styles.teamInitial}>{u.username[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{u.username}</Text>
              {u.role === 'admin' ? <Text style={styles.rowMeta}>Administrator</Text> : null}
            </View>
            {u.username === currentUser?.username ? <Text style={styles.youBadge}>You</Text> : null}
          </View>
        ))}

        <View style={styles.sectionBar}><Text style={styles.sectionBarText}>Reports</Text></View>
        <Pressable
          onPress={() => router.push('/inbox')}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfacePressed }]}
        >
          <Text style={[styles.rowLabel, { flex: 1 }]}>Inbox</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/manual-report')}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfacePressed }]}
        >
          <Text style={[styles.rowLabel, { flex: 1 }]}>Manual report</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>

        <View style={{ padding: 16 }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && { backgroundColor: Colors.primaryLight }]}
          >
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>SCS Checklist v1.0 · Q 43831124, Rev. 03</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: 16, height: 54,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' },
  headerSubtitle: { fontSize: 11.5, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: '#FFF' },

  sectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.sectionBar, paddingHorizontal: 16, paddingVertical: 9,
  },
  sectionBarText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },
  sectionBarAction: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.primary },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  rowActive: { borderLeftWidth: 4, borderLeftColor: Colors.primary },
  rowLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  rowMeta: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  teamAvatar: {
    width: 34, height: 34, borderRadius: 2, backgroundColor: Colors.chrome,
    alignItems: 'center', justifyContent: 'center',
  },
  teamInitial: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },
  youBadge: {
    fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFF', backgroundColor: Colors.chrome,
    borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3,
  },

  emptyRow: { backgroundColor: Colors.surface, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },

  logoutBtn: {
    height: 48, borderRadius: 3, backgroundColor: Colors.field,
    borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.primary },
  version: {
    textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary, marginTop: 4, marginBottom: 24,
  },
});
