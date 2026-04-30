'use client';

import { create } from 'zustand';

interface SupportChatDrawerState {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useSupportChatDrawerStore = create<SupportChatDrawerState>((set) => ({
  isOpen: false,
  setOpen: (isOpen: boolean) => set({ isOpen }),
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
}));
