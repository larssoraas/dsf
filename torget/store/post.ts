import { create } from 'zustand';
import type { ListingCategory, ListingCondition, ListingType } from '../lib/types';

export interface PostDraftState {
  images: string[];
  title: string;
  description: string;
  price: string;
  category: ListingCategory;
  condition: ListingCondition;
  listingType: ListingType;
}

interface PostDraftActions {
  setImages: (images: string[]) => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setPrice: (price: string) => void;
  setCategory: (category: ListingCategory) => void;
  setCondition: (condition: ListingCondition) => void;
  setListingType: (listingType: ListingType) => void;
  reset: () => void;
}

const initialState: PostDraftState = {
  images: [],
  title: '',
  description: '',
  price: '',
  category: 'other',
  condition: 'good',
  listingType: 'sale',
};

export const usePostDraftStore = create<PostDraftState & PostDraftActions>((set) => ({
  ...initialState,

  setImages: (images) => set({ images }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setPrice: (price) => set({ price }),
  setCategory: (category) => set({ category }),
  setCondition: (condition) => set({ condition }),
  setListingType: (listingType) => set({ listingType }),
  reset: () => set(initialState),
}));
