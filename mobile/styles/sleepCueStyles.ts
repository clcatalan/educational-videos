import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8da5f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 60,
    color: "#222",
  },

  circleButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#37cb37",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#444",
  },

  buttonText: {
    marginTop: 26,
    fontSize: 16,
    textAlign: "center",
    color: "#060000",
  },

  subtitle: {
    marginTop: 25,
    fontSize: 18,
    color: "#232121",
  },

  icon: {
    fontSize: 70,
    marginBottom: 20,
  },

  playIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
});

