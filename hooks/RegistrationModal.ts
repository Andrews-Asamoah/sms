import { create } from "zustand";

interface RegistrationModalStore {
  isOpen: boolean;
  onOpen: (initialValues?: any) => void;
  onClose: () => void;
  initiailValues: (initialValues?: any) => void;
}

const RegistrationModal = create<RegistrationModalStore>((set) => ({
  isOpen: false,
  onOpen: (initiailValues) => set({ isOpen: true, initiailValues }),
  onClose: () => set({ isOpen: false }),
  initiailValues: (initiailValues) => set({ initiailValues }),
}));

export default RegistrationModal;
