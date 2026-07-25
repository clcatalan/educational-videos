import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import SleepStart from "../components/SleepStart";

export default function Home() {
  const [screen, setScreen] = useState<"start" | "monitor" | "playing">(
    "start"
  );

  // Simulate sleep detection after 10 seconds
  useEffect(() => {
    if (screen === "monitor") {
      const timer = setTimeout(() => {
        setScreen("playing");
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Start Screen
  if (screen === "start") {
    return <SleepStart onStart={() => setScreen("monitor")} />;
  }

  // Playing Audio Screen
  if (screen === "playing") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#8DA5F6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 50 }}>🎵</Text>

        <Text
          style={{
            color: "white",
            fontSize: 30,
            fontWeight: "700",
            marginTop: 20,
          }}
        >
          Playing Audio
        </Text>

        <Text
          style={{
            color: "white",
            fontSize: 18,
            marginTop: 10,
          }}
        >
          Calm Rain
        </Text>
      </View>
    );
  }

  // Monitoring Screen
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#8DA5F6",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 26 }}>⭐ ⭐</Text>

      <Text
        style={{
          fontSize: 90,
          marginTop: 20,
        }}
      >
        🌙
      </Text>

      <Text
        style={{
          fontSize: 24,
          color: "white",
          marginTop: 20,
        }}
      >
        z  z  z
      </Text>

      <Text
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: "700",
          marginTop: 40,
        }}
      >
        Monitoring Sleep...
      </Text>

      <Text
        style={{
          color: "white",
          fontSize: 30,
          marginTop: 20,
        }}
      >
        ● ● ●
      </Text>
    </View>
  );
}

