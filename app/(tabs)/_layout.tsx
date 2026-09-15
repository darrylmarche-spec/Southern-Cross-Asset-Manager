import { Tabs, router } from "expo-router";
import { Platform, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import Colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

// Charcoal tab bar with a red top indicator on the active tab — flat, no blur,
// no liquid glass, so the chrome reads the same on every device in the field.
export default function TabLayout() {
  const { currentUser } = useApp();
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (currentUser === null) router.replace('/');
  }, [currentUser]);

  const icon = (name: keyof typeof Ionicons.glyphMap) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons name={name} size={21} color={color} />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
        tabBarStyle: {
          backgroundColor: Colors.chrome,
          borderTopWidth: 0,
          elevation: 0,
          height: isWeb ? 76 : undefined,
          paddingTop: 4,
        },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: icon("bar-chart") }} />
      <Tabs.Screen name="checklist" options={{ title: "Checklist", tabBarIcon: icon("list") }} />
      <Tabs.Screen name="completed" options={{ title: "Completed", tabBarIcon: icon("checkmark-circle") }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: currentUser?.role === 'admin' ? '/admin' : null,
          tabBarIcon: icon("shield-checkmark"),
        }}
      />
      <Tabs.Screen name="settings" options={{ title: "More", tabBarIcon: icon("ellipsis-horizontal") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 3, borderTopColor: 'transparent', paddingTop: 6,
  },
  iconWrapActive: { borderTopColor: Colors.primary },
});
