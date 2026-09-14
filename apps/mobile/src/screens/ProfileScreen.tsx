import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export type ProfileScreenProps = {
  avatarUrl?: string;
  displayName: string;
  username: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  level: number;
  isVerified: boolean;
  onFollowPress?: () => void;
  onMessagePress?: () => void;
  onSharePress?: () => void;
  onBlockPress?: () => void;
  onReportPress?: () => void;
};

const levelBadge = (level: number): string => `Lv.${level}`;

export const ProfileScreen = ({
  avatarUrl,
  displayName,
  username,
  bio,
  followersCount,
  followingCount,
  level,
  isVerified,
  onFollowPress,
  onMessagePress,
  onSharePress,
  onBlockPress,
  onReportPress
}: ProfileScreenProps): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <Image
        accessibilityLabel="Profile avatar"
        source={{ uri: avatarUrl || "https://placehold.co/120x120" }}
        style={styles.avatar}
      />
      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.username}>@{username}</Text>
      {isVerified ? <Text style={styles.verified}>Verified Creator</Text> : null}
      <Text style={styles.bio}>{bio || "No bio yet."}</Text>

      <View style={styles.countsRow}>
        <Text style={styles.countText}>{followersCount} Followers</Text>
        <Text style={styles.countText}>{followingCount} Following</Text>
        <Text style={styles.countText}>{levelBadge(level)}</Text>
      </View>

      <View style={styles.actionsRow}>
        <ActionButton label="Follow" onPress={onFollowPress} />
        <ActionButton label="Message" onPress={onMessagePress} />
        <ActionButton label="Share" onPress={onSharePress} />
      </View>

      <View style={styles.actionsRow}>
        <ActionButton label="Block" onPress={onBlockPress} />
        <ActionButton label="Report" onPress={onReportPress} />
      </View>
    </View>
  );
};

type ActionButtonProps = {
  label: string;
  onPress?: () => void;
};

const ActionButton = ({ label, onPress }: ActionButtonProps): React.JSX.Element => (
  <Pressable onPress={onPress} style={styles.actionButton}>
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10141F",
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 8
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1F2A3D"
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  username: {
    color: "#9AA7BD"
  },
  verified: {
    color: "#7ED9A6"
  },
  bio: {
    textAlign: "center",
    color: "#D8E2F0"
  },
  countsRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 8
  },
  countText: {
    color: "#E6ECF7",
    fontWeight: "600"
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8
  },
  actionButton: {
    backgroundColor: "#364E80",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "600"
  }
});
