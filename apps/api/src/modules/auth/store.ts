import { randomUUID } from "node:crypto";
import { normalizeUsername, validateUsername } from "../profiles/username.js";

export type AccountStatus = "active" | "pending_verification" | "suspended" | "banned" | "deleted";

export type UserRecord = {
  id: string;
  authProviderId: string;
  email?: string;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type ProfileRecord = {
  id: string;
  authProviderId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  publicId: string;
  level: number;
  xp: number;
  followersCount: number;
  followingCount: number;
  likesReceived: number;
  isCreator: boolean;
  isVerified: boolean;
  accountStatus: AccountStatus;
};

type RegisterInput = {
  authProviderId: string;
  email?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
};

type MutationResult = {
  changed: boolean;
};

const nowIso = (): string => new Date().toISOString();
const socialKey = (sourceUserId: string, targetUserId: string): string => `${sourceUserId}:${targetUserId}`;

export class AuthProfileSocialStore {
  private readonly usersById = new Map<string, UserRecord>();
  private readonly userIdsByAuthProviderId = new Map<string, string>();
  private readonly profilesByUserId = new Map<string, ProfileRecord>();
  private readonly profilesByPublicId = new Map<string, ProfileRecord>();
  private readonly profilesByUsername = new Map<string, ProfileRecord>();
  private readonly follows = new Set<string>();
  private readonly blocks = new Set<string>();
  private readonly mutes = new Set<string>();
  private readonly userSettings = new Map<string, Record<string, unknown>>();
  private readonly userRoles = new Map<string, Set<string>>();
  private readonly roles = new Set<string>(["user"]);

  register(input: RegisterInput): { user: UserRecord; profile: ProfileRecord } {
    const existingUser = this.getUserByAuthProviderId(input.authProviderId);
    if (existingUser) {
      const profile = this.getProfileByUserId(existingUser.id);
      if (!profile) {
        throw new Error("Profile missing for existing user");
      }
      return { user: existingUser, profile };
    }

    const validation = validateUsername(input.username);
    if (!validation.valid) {
      throw new Error(validation.reason ?? "Invalid username");
    }

    if (this.profilesByUsername.has(validation.normalized)) {
      throw new Error("Username already taken");
    }

    const createdAt = nowIso();
    const userId = randomUUID();
    const user: UserRecord = {
      id: userId,
      authProviderId: input.authProviderId,
      email: input.email,
      accountStatus: "pending_verification",
      emailVerified: false,
      createdAt,
      updatedAt: createdAt
    };

    const publicId = `u_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const profile: ProfileRecord = {
      id: randomUUID(),
      authProviderId: user.authProviderId,
      username: validation.normalized,
      displayName: input.displayName?.trim() || validation.normalized,
      avatarUrl: input.avatarUrl,
      bio: input.bio,
      publicId,
      level: 1,
      xp: 0,
      followersCount: 0,
      followingCount: 0,
      likesReceived: 0,
      isCreator: false,
      isVerified: false,
      accountStatus: user.accountStatus
    };

    this.usersById.set(user.id, user);
    this.userIdsByAuthProviderId.set(user.authProviderId, user.id);
    this.profilesByUserId.set(user.id, profile);
    this.profilesByPublicId.set(profile.publicId, profile);
    this.profilesByUsername.set(profile.username, profile);
    this.userSettings.set(user.id, {});
    this.userRoles.set(user.id, new Set(["user"]));

    return { user, profile };
  }

  login(authProviderId: string): UserRecord {
    const user = this.requireUserByAuthProviderId(authProviderId);
    if (user.accountStatus === "banned" || user.accountStatus === "suspended" || user.accountStatus === "deleted") {
      throw new Error(`Account is ${user.accountStatus}`);
    }

    const updated: UserRecord = {
      ...user,
      lastLoginAt: nowIso(),
      updatedAt: nowIso()
    };

    this.usersById.set(user.id, updated);
    return updated;
  }

  logout(authProviderId: string): UserRecord {
    return this.requireUserByAuthProviderId(authProviderId);
  }

  verify(authProviderId: string): { user: UserRecord; profile: ProfileRecord } {
    const user = this.requireUserByAuthProviderId(authProviderId);
    const profile = this.requireProfileByUserId(user.id);

    const nextUser: UserRecord = {
      ...user,
      emailVerified: true,
      accountStatus: user.accountStatus === "pending_verification" ? "active" : user.accountStatus,
      updatedAt: nowIso()
    };

    const nextProfile: ProfileRecord = {
      ...profile,
      isVerified: true,
      accountStatus: nextUser.accountStatus
    };

    this.usersById.set(nextUser.id, nextUser);
    this.profilesByUserId.set(nextUser.id, nextProfile);
    this.profilesByPublicId.set(nextProfile.publicId, nextProfile);
    this.profilesByUsername.set(nextProfile.username, nextProfile);

    return { user: nextUser, profile: nextProfile };
  }

  recover(authProviderId: string): { user: UserRecord } {
    return { user: this.requireUserByAuthProviderId(authProviderId) };
  }

  deleteAccount(authProviderId: string): MutationResult {
    const user = this.requireUserByAuthProviderId(authProviderId);
    const profile = this.requireProfileByUserId(user.id);

    this.userIdsByAuthProviderId.delete(authProviderId);
    this.usersById.delete(user.id);
    this.profilesByUserId.delete(user.id);
    this.profilesByPublicId.delete(profile.publicId);
    this.profilesByUsername.delete(profile.username);
    this.userSettings.delete(user.id);
    this.userRoles.delete(user.id);

    for (const relationSet of [this.follows, this.blocks, this.mutes]) {
      for (const key of Array.from(relationSet)) {
        if (key.startsWith(`${user.id}:`) || key.endsWith(`:${user.id}`)) {
          relationSet.delete(key);
        }
      }
    }

    return { changed: true };
  }

  setAccountStatus(authProviderId: string, accountStatus: AccountStatus): { user: UserRecord; profile: ProfileRecord } {
    const user = this.requireUserByAuthProviderId(authProviderId);
    const profile = this.requireProfileByUserId(user.id);

    const nextUser: UserRecord = {
      ...user,
      accountStatus,
      updatedAt: nowIso()
    };

    const nextProfile: ProfileRecord = {
      ...profile,
      accountStatus
    };

    this.usersById.set(nextUser.id, nextUser);
    this.profilesByUserId.set(nextUser.id, nextProfile);
    this.profilesByPublicId.set(nextProfile.publicId, nextProfile);
    this.profilesByUsername.set(nextProfile.username, nextProfile);

    return { user: nextUser, profile: nextProfile };
  }

  getProfileByPublicId(publicId: string): ProfileRecord | undefined {
    return this.profilesByPublicId.get(publicId);
  }

  getProfileByAuthProviderId(authProviderId: string): ProfileRecord | undefined {
    const user = this.getUserByAuthProviderId(authProviderId);
    return user ? this.profilesByUserId.get(user.id) : undefined;
  }

  follow(actorAuthProviderId: string, targetPublicId: string): { profile: ProfileRecord; following: boolean } {
    const actorUser = this.requireActiveUser(actorAuthProviderId);
    const targetProfile = this.requireProfileByPublicId(targetPublicId);
    const targetUser = this.requireUserByAuthProviderId(targetProfile.authProviderId);

    this.assertInteractionAllowed(actorUser.id, targetUser.id);

    const key = socialKey(actorUser.id, targetUser.id);
    if (this.follows.has(key)) {
      return { profile: targetProfile, following: true };
    }

    this.follows.add(key);
    this.adjustFollowCounters(actorUser.id, targetUser.id, 1);
    return { profile: this.requireProfileByPublicId(targetPublicId), following: true };
  }

  unfollow(actorAuthProviderId: string, targetPublicId: string): { profile: ProfileRecord; following: boolean } {
    const actorUser = this.requireActiveUser(actorAuthProviderId);
    const targetProfile = this.requireProfileByPublicId(targetPublicId);
    const targetUser = this.requireUserByAuthProviderId(targetProfile.authProviderId);

    const key = socialKey(actorUser.id, targetUser.id);
    if (this.follows.delete(key)) {
      this.adjustFollowCounters(actorUser.id, targetUser.id, -1);
    }

    return { profile: this.requireProfileByPublicId(targetPublicId), following: false };
  }

  block(actorAuthProviderId: string, targetPublicId: string): { profile: ProfileRecord; blocked: boolean } {
    const actorUser = this.requireActiveUser(actorAuthProviderId);
    const targetProfile = this.requireProfileByPublicId(targetPublicId);
    const targetUser = this.requireUserByAuthProviderId(targetProfile.authProviderId);

    if (actorUser.id === targetUser.id) {
      throw new Error("You cannot block yourself");
    }

    const blockKey = socialKey(actorUser.id, targetUser.id);
    this.blocks.add(blockKey);

    this.removeFollow(actorUser.id, targetUser.id);
    this.removeFollow(targetUser.id, actorUser.id);

    return { profile: this.requireProfileByPublicId(targetPublicId), blocked: true };
  }

  unblock(actorAuthProviderId: string, targetPublicId: string): { profile: ProfileRecord; blocked: boolean } {
    const actorUser = this.requireActiveUser(actorAuthProviderId);
    const targetProfile = this.requireProfileByPublicId(targetPublicId);
    const targetUser = this.requireUserByAuthProviderId(targetProfile.authProviderId);

    this.blocks.delete(socialKey(actorUser.id, targetUser.id));
    return { profile: this.requireProfileByPublicId(targetPublicId), blocked: false };
  }

  mute(actorAuthProviderId: string, targetPublicId: string): { profile: ProfileRecord; muted: boolean } {
    const actorUser = this.requireActiveUser(actorAuthProviderId);
    const targetProfile = this.requireProfileByPublicId(targetPublicId);
    const targetUser = this.requireUserByAuthProviderId(targetProfile.authProviderId);

    if (actorUser.id === targetUser.id) {
      throw new Error("You cannot mute yourself");
    }

    this.mutes.add(socialKey(actorUser.id, targetUser.id));
    return { profile: this.requireProfileByPublicId(targetPublicId), muted: true };
  }

  unmute(actorAuthProviderId: string, targetPublicId: string): { profile: ProfileRecord; muted: boolean } {
    const actorUser = this.requireActiveUser(actorAuthProviderId);
    const targetProfile = this.requireProfileByPublicId(targetPublicId);
    const targetUser = this.requireUserByAuthProviderId(targetProfile.authProviderId);

    this.mutes.delete(socialKey(actorUser.id, targetUser.id));
    return { profile: this.requireProfileByPublicId(targetPublicId), muted: false };
  }

  getRelationship(actorAuthProviderId: string, targetPublicId: string): {
    following: boolean;
    followedBy: boolean;
    blocked: boolean;
    muted: boolean;
    canFollow: boolean;
    canMessage: boolean;
  } {
    const actorUser = this.requireActiveUser(actorAuthProviderId);
    const targetProfile = this.requireProfileByPublicId(targetPublicId);
    const targetUser = this.requireUserByAuthProviderId(targetProfile.authProviderId);

    const following = this.follows.has(socialKey(actorUser.id, targetUser.id));
    const followedBy = this.follows.has(socialKey(targetUser.id, actorUser.id));
    const blockedByActor = this.blocks.has(socialKey(actorUser.id, targetUser.id));
    const blockedByTarget = this.blocks.has(socialKey(targetUser.id, actorUser.id));
    const muted = this.mutes.has(socialKey(actorUser.id, targetUser.id));
    const interactionBlocked = blockedByActor || blockedByTarget;

    return {
      following,
      followedBy,
      blocked: blockedByActor,
      muted,
      canFollow: !interactionBlocked && actorUser.id !== targetUser.id,
      canMessage: !interactionBlocked && actorUser.id !== targetUser.id
    };
  }

  private adjustFollowCounters(followerUserId: string, followingUserId: string, delta: number): void {
    const followerProfile = this.requireProfileByUserId(followerUserId);
    const followingProfile = this.requireProfileByUserId(followingUserId);

    const nextFollowerProfile: ProfileRecord = {
      ...followerProfile,
      followingCount: Math.max(0, followerProfile.followingCount + delta)
    };

    const nextFollowingProfile: ProfileRecord = {
      ...followingProfile,
      followersCount: Math.max(0, followingProfile.followersCount + delta)
    };

    this.saveProfile(followerUserId, nextFollowerProfile);
    this.saveProfile(followingUserId, nextFollowingProfile);
  }

  private removeFollow(followerUserId: string, followingUserId: string): void {
    if (this.follows.delete(socialKey(followerUserId, followingUserId))) {
      this.adjustFollowCounters(followerUserId, followingUserId, -1);
    }
  }

  private saveProfile(userId: string, profile: ProfileRecord): void {
    this.profilesByUserId.set(userId, profile);
    this.profilesByPublicId.set(profile.publicId, profile);
    this.profilesByUsername.set(normalizeUsername(profile.username), profile);
  }

  private getUserByAuthProviderId(authProviderId: string): UserRecord | undefined {
    const userId = this.userIdsByAuthProviderId.get(authProviderId);
    return userId ? this.usersById.get(userId) : undefined;
  }

  private requireUserByAuthProviderId(authProviderId: string): UserRecord {
    const user = this.getUserByAuthProviderId(authProviderId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  private requireActiveUser(authProviderId: string): UserRecord {
    const user = this.requireUserByAuthProviderId(authProviderId);
    if (user.accountStatus === "banned" || user.accountStatus === "suspended" || user.accountStatus === "deleted") {
      throw new Error(`Account is ${user.accountStatus}`);
    }
    return user;
  }

  private getProfileByUserId(userId: string): ProfileRecord | undefined {
    return this.profilesByUserId.get(userId);
  }

  private requireProfileByUserId(userId: string): ProfileRecord {
    const profile = this.getProfileByUserId(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    return profile;
  }

  private requireProfileByPublicId(publicId: string): ProfileRecord {
    const profile = this.getProfileByPublicId(publicId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    return profile;
  }

  private assertInteractionAllowed(actorUserId: string, targetUserId: string): void {
    if (actorUserId === targetUserId) {
      throw new Error("You cannot follow yourself");
    }

    if (
      this.blocks.has(socialKey(actorUserId, targetUserId)) ||
      this.blocks.has(socialKey(targetUserId, actorUserId))
    ) {
      throw new Error("Blocked users cannot follow or message each other");
    }
  }
}

export const authProfileSocialStore = new AuthProfileSocialStore();
