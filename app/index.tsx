import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, currentUser, isLoading } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/(tabs)');
    }
  }, [isLoading, currentUser]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (currentUser) return null;

  const handleLogin = () => {
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    const success = login(username.trim(), password);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Invalid username or password');
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0F2847', '#0A1628']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 40), paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }]}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="construct" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>SCS Checklist</Text>
            <Text style={styles.subtitle}>Schindler Escalator Commissioning</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={Colors.textTertiary}
                  value={username}
                  onChangeText={(t) => { setUsername(t); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textTertiary}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textTertiary} />
                </Pressable>
              </View>
            </View>

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
              style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </Pressable>

            <Text style={styles.hint}>Default accounts: Darryl, TeamMember1-3</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1628' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(10,132,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(10,132,255,0.4)',
  },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  form: { gap: 16 },
  inputGroup: { gap: 12 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 16, height: 52,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontFamily: 'Inter_400Regular', color: '#FFFFFF' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  errorText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.danger },
  loginButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 52, marginTop: 8,
  },
  loginButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  loginButtonText: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8 },
});
