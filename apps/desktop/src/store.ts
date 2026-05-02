import { create } from "zustand";

interface UiState {
  selectedAccountId: string | null;
  selectedChatId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  setSelectedChatId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedAccountId: null,
  selectedChatId: null,
  setSelectedAccountId: (id) =>
    set((state) => ({
      selectedAccountId: id,
      selectedChatId: state.selectedAccountId === id ? state.selectedChatId : null
    })),
  setSelectedChatId: (id) => set({ selectedChatId: id })
}));
