import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../../styles/sleepCueStyles";

interface Props {
  onStart: () => void;
}

export default function SleepStart({ onStart }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Cue</Text>

      <TouchableOpacity
        style={styles.circleButton}
        onPress={onStart}
      />

      <Text style={styles.buttonText}>
        Tap to start{"\n"}Sleep Monitoring
      </Text>
    </View>
  );
}

