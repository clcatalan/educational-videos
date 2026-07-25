import { useState } from "react";
import SleepStart from "../components/SleepStart";
import { View, Text } from "react-native";

export default function Home() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <SleepStart onStart={() => setStarted(true)} />;
  }

return (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#8DA5F6",
    }}
  >
    <Text
      style={{
        fontSize: 28,
        fontWeight: "700",
        color: "black",
      }}
    >
      Monitoring Sleep...
    </Text>
  </View>
);
}

