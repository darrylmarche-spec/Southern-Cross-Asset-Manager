import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function ProjectSetupScreen() {
  const insets = useSafeAreaInsets();
  const { createProject, updateProject, users, projects } = useApp();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();

  const editingProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId) || null;
  }, [projectId, projects]);

  const isEditing = !!editingProject;

  const [customer, setCustomer] = useState(editingProject?.customer || '');
  const [projectName, setProjectName] = useState(editingProject?.projectName || '');
  const [location, setLocation] = useState(editingProject?.location || '');
  const [commissionNumber, setCommissionNumber] = useState(editingProject?.commissionNumber || '');
  const [escalatorType, setEscalatorType] = useState(editingProject?.escalatorType || '');
  const [assignedMembers, setAssignedMembers] = useState<string[]>(editingProject?.assignedMembers || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const members = useMemo(
    () => users.filter(u => u.role === 'member' || u.username.toLowerCase() === 'darryl'),
    [users]
  );

  const toggleMember = (username: string) => {
    Haptics.selectionAsync();
    setAssignedMembers(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!customer.trim()) newErrors.customer = 'Required';
    if (!projectName.trim()) newErrors.projectName = 'Required';
    if (!location.trim()) newErrors.location = 'Required';
    if (!commissionNumber.trim()) newErrors.commissionNumber = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const projectData = {
      customer: customer.trim(),
      projectName: projectName.trim(),
      location: location.trim(),
      commissionNumber: commissionNumber.trim(),
      escalatorType: escalatorType.trim() || 'Escalator',
      dateOfCompletion: '',
      assignedMembers,
    };
    if (isEditing && editingProject) {
      updateProject(editingProject.id, projectData);
    } else {
      createProject(projectData);
    }
    router.back();
  };

  const renderField = (label: string, value: string, setter: (v: string) => void, key: string, placeholder: string) => (
    <View style={styles.fieldGroup} key={key}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, !!errors[key] && styles.fieldInputError]}
        value={value}
        onChangeText={(v) => { setter(v); setErrors(prev => ({ ...prev, [key]: '' })); }}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        autoCorrect={false}
      />
      {!!errors[key] && <Text style={styles.fieldError}>{errors[key]}</Text>}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
          <Text style={styles.navTitle}>{isEditing ? 'Edit Project' : 'New Project'}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24) }]}
        >
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>Project details</Text>
          </View>

          <View style={styles.fields}>
            {renderField('Customer *', customer, setCustomer, 'customer', 'e.g. Westfield Corporation')}
            {renderField('Project Name *', projectName, setProjectName, 'projectName', 'e.g. Escalator Large Overhaul Unit 2')}
            {renderField('Location *', location, setLocation, 'location', 'e.g. Sydney CBD, Level 3')}
            {renderField('Commission Number *', commissionNumber, setCommissionNumber, 'commissionNumber', 'e.g. COM-2026-001')}
            {renderField('Type of Escalator / Moving Walk', escalatorType, setEscalatorType, 'escalatorType', 'e.g. 9300AE Escalator')}
          </View>

          {members.length > 0 && (
            <>
              <View style={styles.sectionBar}>
                <Text style={styles.sectionBarText}>Assign team members</Text>
              </View>
              <View style={styles.memberList}>
                {members.map(member => {
                  const on = assignedMembers.includes(member.username);
                  return (
                    <Pressable
                      key={member.username}
                      onPress={() => toggleMember(member.username)}
                      style={[styles.memberChip, on && styles.memberChipSelected]}
                    >
                      <Ionicons
                        name={on ? 'checkmark-circle' : 'add-circle-outline'}
                        size={17}
                        color={on ? '#FFF' : Colors.textSecondary}
                      />
                      <Text style={[styles.memberChipText, on && styles.memberChipTextSelected]}>
                        {member.username}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.footer}>
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [styles.createButton, pressed && { backgroundColor: Colors.primaryDark }]}
            >
              <Text style={styles.createButtonText}>{isEditing ? 'SAVE CHANGES' : 'CREATE PROJECT'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { paddingBottom: 24 },

  sectionBar: {
    backgroundColor: Colors.sectionBar, paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border,
  },
  sectionBarText: {
    fontSize: 11.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },

  fields: { paddingHorizontal: 14, paddingTop: 14, gap: 14 },
  fieldGroup: { gap: 5 },
  fieldLabel: {
    fontSize: 11.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.6,
  },
  fieldInput: {
    backgroundColor: Colors.field, borderRadius: 2, paddingHorizontal: 12, height: 46,
    fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderStrong,
  },
  fieldInputError: { borderColor: Colors.danger, borderWidth: 2 },
  fieldError: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.danger },

  memberList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.field,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 2,
    borderWidth: 1, borderColor: Colors.borderStrong,
  },
  memberChipSelected: { backgroundColor: Colors.selected, borderColor: Colors.selected },
  memberChipText: { fontSize: 13.5, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  memberChipTextSelected: { color: '#FFF' },

  footer: { padding: 14, paddingTop: 4 },
  createButton: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 3, height: 50,
  },
  createButtonText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 0.6 },
});
