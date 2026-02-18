import { create } from 'zustand';
import type { Profile } from '@/lib/profile/types';
import { generateSessionId } from '@/lib/verification/session';

export interface ParsedLink {
  id: number | null;
  url: string;
  username?: string;
  previewUrl?: string;
  valid: boolean;
  reason: string | null;
  is_verified: boolean;
  verification_expires_at?: string;
  _uid: string;
  platform?: "X" | "GitHub" | "Instagram" | "Discord";
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
  sessionId: string;

  setForm: (form: FormState | ((prev: FormState) => FormState)) => void;
  updateField: (field: keyof FormState, value: any) => void;
  setDeletedField: (field: keyof DeletedFields, value: boolean) => void;
  initializeForm: (profile: Profile, links: ParsedLink[]) => void;
  reset: () => void;
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

export const useEditsStore = create<EditsState>((set) => ({
  form: emptyForm,
  original: emptyForm,
  deletedFields: emptyDeletedFields,
  sessionId: generateSessionId(),

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
      sessionId: generateSessionId(),
    }),

  reset: () =>
    set({
      form: emptyForm,
      original: emptyForm,
      deletedFields: emptyDeletedFields,
      sessionId: generateSessionId(),
    }),
}));
