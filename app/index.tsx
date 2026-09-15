import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

const logoSource = require('@/assets/images/logo-large.jpeg');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, currentUser, isLoading } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

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

  const handleLogin = async () => {
    if (!username.trim()) { setError('Please enter your username'); return; }
    if (!password.trim()) { setError('Please enter your password'); return; }
    setLoggingIn(true);
    try {
      const success = await login(username.trim(), password);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError('Invalid username or password');
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.container, {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 32),
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20),
        }]}>
          <View style={styles.header}>
            <Image source={logoSource} style={styles.logo} contentFit="contain" />
            <View style={styles.rule} />
            <Text style={styles.subtitle}>Escalator Commissioning Checklist</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={19} color={Colors.textTertiary} style={styles.inputIcon} />
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={19} color={Colors.textTertiary} style={styles.inputIcon} />
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
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={Colors.textTertiary} />
                </Pressable>
              </View>
            </View>

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={loggingIn}
              style={({ pressed }) => [styles.loginButton, (pressed || loggingIn) && { backgroundColor: Colors.primaryDark }]}
            >
              <Text style={styles.loginButtonText}>{loggingIn ? 'SIGNING IN…' : 'SIGN IN'}</Text>
            </Pressable>

            <Text style={styles.hint}>Default accounts: Darryl, TeamMember1-3</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.chrome },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.chrome },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },

  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: '100%', height: 300 },
  rule: { height: 3, width: '100%', backgroundColor: Colors.primary, marginTop: 4 },
  subtitle: {
    fontSize: 12, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', marginTop: 12, textTransform: 'uppercase' as const, letterSpacing: 1,
  },

  form: { gap: 14 },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.field, borderRadius: 2, paddingHorizontal: 12, height: 50,
    borderWidth: 1, borderColor: Colors.borderStrong,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.text },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  errorText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FF6B6B' },

  loginButton: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 3, height: 52, marginTop: 6,
  },
  loginButtonText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1 },
  hint: {
    fontSize: 11.5, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', marginTop: 6,
  },
});
