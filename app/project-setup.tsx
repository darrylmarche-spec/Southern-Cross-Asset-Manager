import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function ProjectSetupScreen() {
  const insets = useSafeAreaInsets();
  const { createProject } = useApp();
  const [customer, setCustomer] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [commissionNumber, setCommissionNumber] = useState('');
  const [escalatorType, setEscalatorType] = useState('');
  const [dateOfCompletion, setDateOfCompletion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!customer.trim()) newErrors.customer = 'Required';
    if (!projectName.trim()) newErrors.projectName = 'Required';
    if (!location.trim()) newErrors.location = 'Required';
    if (!commissionNumber.trim()) newErrors.commissionNumber = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createProject({
      customer: customer.trim(),
      projectName: projectName.trim(),
      location: location.trim(),
      commissionNumber: commissionNumber.trim(),
      escalatorType: escalatorType.trim() || 'Escalator',
      dateOfCompletion: dateOfCompletion.trim(),
    });
    router.back();
  };

  const renderField = (label: string, value: string, setter: (v: string) => void, key: string, placeholder: string, multiline?: boolean) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline, errors[key] && styles.fieldInputError]}
        value={value}
        onChangeText={(v) => { setter(v); setErrors(prev => ({ ...prev, [key]: '' })); }}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline={multiline}
        autoCorrect={false}
      />
      {!!errors[key] && <Text style={styles.fieldError}>{errors[key]}</Text>}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>New Project</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }]}
        >
          {renderField('Customer *', customer, setCustomer, 'customer', 'e.g. Westfield Corporation')}
          {renderField('Project Name *', projectName, setProjectName, 'projectName', 'e.g. Escalator Large Overhaul Unit 2')}
          {renderField('Location *', location, setLocation, 'location', 'e.g. Sydney CBD, Level 3')}
          {renderField('Commission Number *', commissionNumber, setCommissionNumber, 'commissionNumber', 'e.g. COM-2026-001')}
          {renderField('Type of Escalator / Moving Walk', escalatorType, setEscalatorType, 'escalatorType', 'e.g. 9300AE Escalator')}
          {renderField('Date of Completion', dateOfCompletion, setDateOfCompletion, 'dateOfCompletion', 'e.g. 2026-03-15')}

          <Pressable
            onPress={handleCreate}
            style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Ionicons name="checkmark" size={22} color="#FFF" />
            <Text style={styles.createButtonText}>Create Project</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  navTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  content: { padding: 20, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  fieldInput: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight },
  fieldInputMultiline: { height: 80, paddingTop: 14, textAlignVertical: 'top' as const },
  fieldInputError: { borderColor: Colors.danger },
  fieldError: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.danger },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, height: 52, marginTop: 8 },
  createButtonText: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});
