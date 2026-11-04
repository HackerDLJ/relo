import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";

const green = "#176b46";

export default function Home() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>relo<Text style={{ color: "#a2bd45" }}>.</Text></Text>
      <Text style={styles.eyebrow}>THE COMMUNITY SHARING NETWORK</Text>
      <Text style={styles.title}>Own less.{"\n"}<Text style={{ color: "#39865b" }}>Experience</Text> more.</Text>
      <Text style={styles.body}>Find useful things nearby. Share what you no longer need. Give resources another life.</Text>
      <Pressable style={styles.primary}><Text style={styles.primaryText}>Explore resources ↗</Text></Pressable>
      <View style={styles.impact}>
        <Text style={styles.eyebrow}>COMMUNITY IMPACT</Text>
        <Text style={styles.metric}>2,480</Text>
        <Text style={styles.body}>items given another life</Text>
      </View>
      <Text style={styles.section}>Discover resources</Text>
      {[
        ["🚲", "Mountain Bicycle", "Sports · 0.8 km away", "96% match"],
        ["🛠️", "Cordless Drill", "Tools · 1.4 km away", "91% match"],
        ["📚", "Physics Reference Set", "Books · 2.1 km away", "88% match"],
      ].map(([emoji, name, meta, score]) => (
        <View key={name} style={styles.card}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{name}</Text><Text style={styles.meta}>{meta}</Text><Text style={styles.score}>{score}</Text></View>
          <Text style={styles.arrow}>›</Text>
        </View>
      ))}
      <Text style={styles.footer}>Resources deserve another life.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7f4" },
  content: { padding: 24, paddingTop: 58 },
  logo: { color: green, fontSize: 30, fontWeight: "900", letterSpacing: -1.5, marginBottom: 42 },
  eyebrow: { color: "#39865b", fontSize: 11, fontWeight: "800", letterSpacing: 1.7, marginBottom: 14 },
  title: { color: "#15251d", fontSize: 49, lineHeight: 53, fontWeight: "900", letterSpacing: -2.5 },
  body: { color: "#64736a", fontSize: 15, lineHeight: 24, marginTop: 16 },
  primary: { backgroundColor: green, padding: 16, borderRadius: 28, alignSelf: "flex-start", marginTop: 22 },
  primaryText: { color: "white", fontWeight: "800" },
  impact: { backgroundColor: "#e4eee4", borderRadius: 24, padding: 22, marginTop: 38 },
  metric: { color: green, fontSize: 48, fontWeight: "900" },
  section: { color: "#15251d", fontSize: 25, fontWeight: "800", marginTop: 42, marginBottom: 16 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: "#e2e9e3" },
  emoji: { fontSize: 30, backgroundColor: "#edf3ed", padding: 12, borderRadius: 14, overflow: "hidden" },
  cardTitle: { color: "#20382a", fontWeight: "800", fontSize: 15 },
  meta: { color: "#718078", fontSize: 12, marginTop: 4 },
  score: { color: green, fontWeight: "800", fontSize: 12, marginTop: 7 },
  arrow: { color: green, fontSize: 28 },
  footer: { textAlign: "center", color: "#77857b", marginVertical: 30 },
});
