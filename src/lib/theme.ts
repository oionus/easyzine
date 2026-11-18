export interface StudioPalette {
  isDark: boolean;
  deskSurface: string;
  deskSecondary: string;
  cardSurface: string;
  cardElevated: string;
  traySurface: string;
  inkPrimary: string;
  inkSecondary: string;
  inkMuted: string;
  hairline: string;
  accent: string;
  accentInkPill: string;
  accentInkPillForeground: string;
}

export function getStudioPalette(isDark: boolean): StudioPalette {
  if (isDark) {
    return {
      isDark: true,
      deskSurface: "#191816",
      deskSecondary: "#22201D",
      cardSurface: "#252320",
      cardElevated: "#2F2C28",
      traySurface: "#1F1D1A",
      inkPrimary: "#F3EFE7",
      inkSecondary: "#A0988C",
      inkMuted: "#6E685F",
      hairline: "rgba(255, 255, 255, 0.085)",
      accent: "#D25836",
      accentInkPill: "#F2EDE4",
      accentInkPillForeground: "#1E1C19",
    };
  }
  return {
    isDark: false,
    deskSurface: "#F1EEE7",
    deskSecondary: "#E6E1D7",
    cardSurface: "#FAF9F5",
    cardElevated: "#FFFFFF",
    traySurface: "#F7F5EF",
    inkPrimary: "#221F1C",
    inkSecondary: "#736C63",
    inkMuted: "#A39C91",
    hairline: "rgba(44, 38, 30, 0.09)",
    accent: "#D25836",
    accentInkPill: "#24211E",
    accentInkPillForeground: "#FAF8F4",
  };
}
