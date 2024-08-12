import { create } from "zustand";

interface useAcademicYearModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useAcademicYearModal = create<useAcademicYearModalStore>(
  (set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
  })
);
