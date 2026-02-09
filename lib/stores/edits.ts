import { create } from 'zustand';
import type { Profile, EnrichedProfileLink } from '@/lib/profile/types';
import { isValidUrl } from '@/lib/profile/validateUrl';

export interface ParsedLink {
  id: number | null;
  url: string;
  username?: string;
  previewUrl?: string;
  valid: boolean;
  reason: string | null;
  is_verified: boolean;
  verification_expires_at?: string | null;
  _uid: string;
  platform?: "X" | "GitHub" | "Instagram" | "Discord" | null;
  otherUrl?: string;
  label?: string;
  icon?: string;
  domain?: string;
  handle?: string;
}

export interface FormState {
  address: string;
  name: string;
  display_name: string;
  bio: string;
  profile_image_url: string;
  links: ParsedLink[];
  nearest_city_id: number | null;
  nearest_city_name: string;
}

export interface PendingEdits {
  profile?: Record<string, any>;
  l?: any[];
  [key: string]: any;
}

interface OriginalState {
  address: string;
  name: string;
  display_name: string;
  bio: string;
  profile_image_url: string;
  links: ParsedLink[];
  nearest_city_id: number | null;
  nearest_city_name: string;
}

interface DeletedFields {
  address: boolean;
  name: boolean;
  display_name: boolean;
  bio: boolean;
  profile_image_url: boolean;
  nearest_city: boolean;
}

interface EditsState {
  // Form state
  form: FormState;
  original: OriginalState;
  deletedFields: DeletedFields;
  linkAuthTokens: string[]; // Tokens like "!123" or "+!https://x.com/handle"
  pendingEdits: PendingEdits; // Auto-computed from form vs original

  // Actions
  setForm: (form: FormState | ((prev: FormState) => FormState)) => void;
  updateField: (field: keyof FormState, value: any) => void;
  setDeletedField: (field: keyof DeletedFields, value: boolean) => void;
  initializeForm: (profile: Profile, links: ParsedLink[]) => void;
  addLinkAuthToken: (token: string) => void;
  removeLinkAuthToken: (token: string) => void;
}

const emptyForm: FormState = {
  address: '',
  name: '',
  display_name: '',
  bio: '',
  profile_image_url: '',
  links: [],
  nearest_city_id: null,
  nearest_city_name: '',
};

const emptyDeletedFields: DeletedFields = {
  address: false,
  name: false,
  display_name: false,
  bio: false,
  profile_image_url: false,
  nearest_city: false,
};

// Helper to compute pendingEdits from current state
function computePendingEdits(
  form: FormState,
  original: OriginalState,
  deletedFields: DeletedFields,
  linkAuthTokens: string[]
): PendingEdits {
  const profileChanges: Record<string, any> = {};
  const deletedTokens: string[] = [];

  // Check each field for changes
  const fieldMapping: Record<string, string> = {
    name: 'n',
    display_name: 'h',
    bio: 'b',
    address: 'a',
    profile_image_url: 'i',
  };

  for (const [field, token] of Object.entries(fieldMapping)) {
    const key = field as keyof FormState;
    if (deletedFields[key as keyof DeletedFields]) {
      deletedTokens.push(token);
    } else if (form[key] !== original[key]) {
      profileChanges[field] = form[key];
    }
  }

  if (deletedTokens.length > 0) {
    profileChanges.d = deletedTokens;
  }

  // Handle city changes
  if (deletedFields.nearest_city && original.nearest_city_id) {
    profileChanges.c = '-';
  } else if (form.nearest_city_id && form.nearest_city_id !== original.nearest_city_id) {
    profileChanges.c = String(form.nearest_city_id);
  }

  // Compute link tokens (complex logic for tracking link changes)
  const effectTokens: string[] = [];
  const originalById = new Map<string, ParsedLink>();
  const originalUrlSet = new Set<string>();

  for (const l of original.links) {
    if (!l) continue;
    const url = (l.url || '').trim();
    if (l.id) originalById.set(String(l.id), { ...l, url });
    if (url) originalUrlSet.add(url);
  }

  const currentUrls = new Set(
    form.links.map((l) => (l.url || '').trim()).filter(Boolean)
  );
  const currentById = new Map(
    form.links
      .filter((l) => l.id)
      .map((l) => [String(l.id), (l.url || '').trim()])
  );

  // Normalize verification tokens - if a +! token's URL no longer exists,
  // replace it with a new URL
  let normalizedVerify = [...linkAuthTokens];
  for (const token of linkAuthTokens) {
    if (!token.startsWith('+!')) continue;
    const oldUrl = token.slice(2);
    const stillExists = form.links.some(
      (l) => (l.url || '').trim() === oldUrl.trim()
    );

    if (!stillExists) {
      normalizedVerify = normalizedVerify.filter((t) => t !== token);
      const newUrl = form.links
        .map((l) => (l.url || '').trim())
        .find((u) => u && !originalUrlSet.has(u));
      if (newUrl) normalizedVerify.push(`+!${newUrl}`);
    }
  }

  // Compute changes for each link
  for (const row of form.links) {
    const id = row.id ?? null;
    const newUrlRaw = (row.url || '').trim();
    const { valid: urlValid } = isValidUrl(newUrlRaw);
    const newUrl = urlValid ? newUrlRaw : '';

    if (id) {
      const original = originalById.get(String(id));
      const originalUrl = original ? original.url : '';
      if (newUrl === originalUrl) continue;
      if (!newUrl) {
        effectTokens.push(`-${id}`);
        continue;
      }
      effectTokens.push(`+${id}:${newUrl}`);
    } else {
      if (!newUrl) continue;
      const isNew = !originalUrlSet.has(newUrl);
      const verifyToken = `+!${newUrl}`;
      const isExplicitVerify = normalizedVerify.includes(verifyToken);
      if (isNew && !isExplicitVerify) {
        effectTokens.push(`+${newUrl}`);
      }
    }
  }

  // Preserve old tokens that are still relevant
  const preservedOld = normalizedVerify.filter((t) => {
    if (/^![0-9]+$/.test(t) || /^\+!/.test(t)) return true;
    if (/^-[0-9]+$/.test(t)) return true;
    if (/^\+[0-9]+:/.test(t)) {
      const id = t.slice(1, t.indexOf(':'));
      const original = originalById.get(id);
      const currentUrl = currentById.get(id) || '';
      const { valid: currentValid } = isValidUrl(currentUrl);
      if (!currentUrl || !currentValid) return false;
      if (original && currentUrl === original.url) return false;
      const hasNewer = effectTokens.some((et) => et.startsWith(`+${id}:`));
      return !hasNewer;
    }
    if (/^\+[^!]/.test(t) && !t.includes(':')) {
      const url = t.slice(1).trim();
      const hasExplicitVerify = normalizedVerify.includes(`+!${url}`);
      return currentUrls.has(url) && !hasExplicitVerify;
    }
    return false;
  });

  // Merge and deduplicate
  const uniqTokens = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of arr) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  };

  const merged = uniqTokens([...effectTokens, ...preservedOld]);

  // Final filtering
  const linkTokens = merged.filter((t) => {
    if (t.startsWith('!')) {
      const id = t.slice(1);
      return !merged.includes(`-${id}`);
    }
    if (t.startsWith('+!')) {
      const url = (t.slice(2) || '').trim();
      if (!url) return false;
      return currentUrls.has(url);
    }
    return true;
  });

  const result: PendingEdits = {};
  if (Object.keys(profileChanges).length > 0) {
    result.profile = profileChanges;
  }
  if (linkTokens.length > 0) {
    result.l = linkTokens;
  }

  return result;
}

export const useEditsStore = create<EditsState>((set) => ({
  form: emptyForm,
  original: emptyForm,
  deletedFields: emptyDeletedFields,
  linkAuthTokens: [],
  pendingEdits: {},

  setForm: (form) =>
    set((state) => {
      const newForm = typeof form === 'function' ? form(state.form) : form;
      return {
        form: newForm,
        pendingEdits: computePendingEdits(newForm, state.original, state.deletedFields, state.linkAuthTokens),
      };
    }),

  updateField: (field, value) =>
    set((state) => {
      const newForm = { ...state.form, [field]: value };
      return {
        form: newForm,
        pendingEdits: computePendingEdits(newForm, state.original, state.deletedFields, state.linkAuthTokens),
      };
    }),

  setDeletedField: (field, value) =>
    set((state) => {
      const newDeletedFields = { ...state.deletedFields, [field]: value };
      // If deleting, clear the field; if undeleting, restore original
      const newForm = { ...state.form };
      if (field === 'nearest_city') {
        // Special handling for city field
        if (value) {
          newForm.nearest_city_id = null;
          newForm.nearest_city_name = '';
        } else {
          newForm.nearest_city_id = state.original.nearest_city_id;
          newForm.nearest_city_name = state.original.nearest_city_name;
        }
      } else {
        if (value) {
          newForm[field] = '' as any;
        } else {
          newForm[field] = state.original[field] as any;
        }
      }
      return {
        deletedFields: newDeletedFields,
        form: newForm,
        pendingEdits: computePendingEdits(newForm, state.original, newDeletedFields, state.linkAuthTokens),
      };
    }),

  initializeForm: (profile, links) =>
    set({
      form: {
        address: profile.address || '',
        name: profile.name || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        profile_image_url: profile.profile_image_url || '',
        links: links || [],
        nearest_city_id: profile.nearest_city_id || null,
        nearest_city_name: profile.nearest_city_name || '',
      },
      original: {
        address: profile.address || '',
        name: profile.name || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        profile_image_url: profile.profile_image_url || '',
        links: links || [],
        nearest_city_id: profile.nearest_city_id || null,
        nearest_city_name: profile.nearest_city_name || '',
      },
      deletedFields: emptyDeletedFields,
      linkAuthTokens: [],
      pendingEdits: {}, // No changes initially
    }),

  addLinkAuthToken: (token) =>
    set((state) => {
      const newTokens = state.linkAuthTokens.includes(token)
        ? state.linkAuthTokens
        : [...state.linkAuthTokens, token];
      return {
        linkAuthTokens: newTokens,
        pendingEdits: computePendingEdits(state.form, state.original, state.deletedFields, newTokens),
      };
    }),

  removeLinkAuthToken: (token) =>
    set((state) => {
      const newTokens = state.linkAuthTokens.filter((t) => t !== token);
      return {
        linkAuthTokens: newTokens,
        pendingEdits: computePendingEdits(state.form, state.original, state.deletedFields, newTokens),
      };
    }),
}));
