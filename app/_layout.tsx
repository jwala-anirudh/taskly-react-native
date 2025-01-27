import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Shopping List" }} />
      {/* Navigation to screens work even if we have not defined them here, since its using file based routing */}
    </Stack>
  );
}
