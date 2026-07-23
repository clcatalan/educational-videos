import { View, Text } from "react-native";

export default function Home() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0F172A",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 30,
          fontWeight: "700",
        }}
      >
        Sleep Cue
      </Text>
    </View>
  );
}


