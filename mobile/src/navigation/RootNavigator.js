import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View, ActivityIndicator } from "react-native";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import LoginScreen from "../screens/LoginScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import MyTasksScreen from "../screens/MyTasksScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tiny emoji "icon" — swap for a proper icon set (e.g. @expo/vector-icons) later.
const icon = (glyph) => ({ color }) => <Text style={{ fontSize: 20, color }}>{glyph}</Text>;

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.gray400,
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Tab.Screen name="In / Out" component={AttendanceScreen} options={{ tabBarIcon: icon("⏱") }} />
      <Tab.Screen name="My Tasks" component={MyTasksScreen} options={{ tabBarIcon: icon("✅") }} />
      <Tab.Screen
        name="Projects"
        options={{ tabBarIcon: icon("📁") }}
        children={() => <PlaceholderScreen title="Projects" note="Build the projects list + detail here." />}
      />
      <Tab.Screen
        name="Leave"
        options={{ tabBarIcon: icon("🌴") }}
        children={() => <PlaceholderScreen title="Leave Application" note="Build the leave form + balance here." />}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon("👤") }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.red} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={Tabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
