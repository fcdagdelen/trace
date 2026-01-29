// User profile and tier store
import { writable, derived } from 'svelte/store';

export type UserTier = 'free' | 'paid' | 'pro';

export interface UserProfile {
  id: string;
  user_id: string;
  tier: UserTier;
  created_at: string;
  updated_at: string;
}

// User profile store
export const userProfile = writable<UserProfile | null>(null);

// Derived tier store (defaults to 'free' if no profile)
export const userTier = derived(userProfile, ($profile) =>
  $profile?.tier ?? 'free'
);

// Derived boolean for paid status
export const isPaidUser = derived(userTier, ($tier) =>
  $tier === 'paid' || $tier === 'pro'
);

// Derived boolean for pro status
export const isProUser = derived(userTier, ($tier) =>
  $tier === 'pro'
);

// Helper to update user profile
export function setUserProfile(profile: UserProfile | null) {
  userProfile.set(profile);
}

// Helper to clear profile (logout)
export function clearUserProfile() {
  userProfile.set(null);
}
