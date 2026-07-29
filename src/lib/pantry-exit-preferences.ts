const DISPOSAL_CONFIRMATION_KEY = "shelf-control:confirm-disposal";

export const getDisposalConfirmationEnabled = () => {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(DISPOSAL_CONFIRMATION_KEY) !== "never";
};

export const setDisposalConfirmationEnabled = (enabled: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISPOSAL_CONFIRMATION_KEY, enabled ? "always" : "never");
};

export const DISPOSAL_CONFIRMATION_STORAGE_KEY = DISPOSAL_CONFIRMATION_KEY;
