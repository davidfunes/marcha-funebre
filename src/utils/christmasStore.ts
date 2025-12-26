"use client";

const CHRISTMAS_DISABLED_KEY = "marcha-funebre-christmas-disabled";

export const christmasStore = {
    isDisabled: (): boolean => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(CHRISTMAS_DISABLED_KEY) === "true";
    },
    setDisabled: (disabled: boolean) => {
        if (typeof window === "undefined") return;
        localStorage.setItem(CHRISTMAS_DISABLED_KEY, disabled.toString());
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event("christmas-preference-changed"));
    }
};
