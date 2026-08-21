import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#5e76c7",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 60,
    color: "#f7f7f7",
  },

  circleButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#37cb37",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fdf6f6",
  },

  buttonText: {
    marginTop: 26,
    fontSize: 26,
    textAlign: "center",
    color: "#fbf5f5",
  },

  subtitle: {
    marginTop: 25,
    fontSize: 26,
    color: "#fefefe",
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

