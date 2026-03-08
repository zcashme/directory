import { create } from 'zustand';
import type { Profile } from '@/lib/profile/types';

export interface ParsedLink {
  id: number | null;
  url: string;
  _delete?: boolean;
  username?: string;
  previewUrl?: string;
  valid: boolean;
  reason: string | null;
  is_verified: boolean;
  verification_expires_at?: string;
  _uid: string;
  platform?: "X" | "GitHub" | "Instagram" | "Reddit" | "LinkedIn" | "Discord" | "TikTok" | "Bluesky" | "Mastodon" | "Snapchat" | "Telegram" | "Other";
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
  profile_card_theme: string;
  profile_page_bkgd: string;
  links: ParsedLink[];
  nearest_city_name: string;
}

export interface PendingAvatarUpload {
  fileName: string;
  mimeType: "image/jpeg" | "image/png";
  extension: "jpg" | "png";
  base64Data: string;
  sizeBytes: number;
  width: number;
  height: number;
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
  form: FormState;
  original: FormState;
  deletedFields: DeletedFields;
  pendingAvatarUpload: PendingAvatarUpload | null;
  sessionId: string;

  setForm: (form: FormState | ((prev: FormState) => FormState)) => void;
  updateField: (field: keyof FormState, value: any) => void;
  setDeletedField: (field: keyof DeletedFields, value: boolean) => void;
  setPendingAvatarUpload: (upload: PendingAvatarUpload | null) => void;
  clearPendingAvatarUpload: () => void;
  initializeForm: (profile: Profile, links: ParsedLink[]) => void;
  reset: () => void;
}

const emptyForm: FormState = {
  address: '',
  name: '',
  display_name: '',
  bio: '',
  profile_image_url: '',
  profile_card_theme: '',
  profile_page_bkgd: '',
  links: [],
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

export const useEditsStore = create<EditsState>((set) => ({
  form: emptyForm,
  original: emptyForm,
  deletedFields: emptyDeletedFields,
  pendingAvatarUpload: null,
  sessionId: crypto.randomUUID(),

  setForm: (form) =>
    set((state) => ({
      form: typeof form === 'function' ? form(state.form) : form,
    })),

  updateField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
    })),

  setDeletedField: (field, value) =>
    set((state) => {
      const newDeletedFields = { ...state.deletedFields, [field]: value };
      const newForm = { ...state.form };

      if (field === 'nearest_city') {
        if (value) {
          newForm.nearest_city_name = '';
        } else {
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
      };
    }),

  setPendingAvatarUpload: (upload) =>
    set({
      pendingAvatarUpload: upload,
    }),

  clearPendingAvatarUpload: () =>
    set({
      pendingAvatarUpload: null,
    }),

  initializeForm: (profile, links) =>
    set({
      form: {
        address: profile.address ?? '',
        name: profile.name ?? '',
        display_name: profile.display_name ?? '',
        bio: profile.bio ?? '',
        profile_image_url: profile.profile_image_url ?? '',
        profile_card_theme: profile.profile_card_theme ?? '',
        profile_page_bkgd: profile.profile_page_bkgd ?? '',
        links: links ?? [],
        nearest_city_name: profile.nearest_city_name ?? '',
      },
      original: {
        address: profile.address ?? '',
        name: profile.name ?? '',
        display_name: profile.display_name ?? '',
        bio: profile.bio ?? '',
        profile_image_url: profile.profile_image_url ?? '',
        profile_card_theme: profile.profile_card_theme ?? '',
        profile_page_bkgd: profile.profile_page_bkgd ?? '',
        links: links ?? [],
        nearest_city_name: profile.nearest_city_name ?? '',
      },
      deletedFields: emptyDeletedFields,
      pendingAvatarUpload: null,
      sessionId: crypto.randomUUID(),
    }),

  reset: () =>
    set({
      form: emptyForm,
      original: emptyForm,
      deletedFields: emptyDeletedFields,
      pendingAvatarUpload: null,
      sessionId: crypto.randomUUID(),
    }),
}));
