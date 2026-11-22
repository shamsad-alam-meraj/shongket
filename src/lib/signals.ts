export type SignalStatus = "normal" | "minor" | "significant" | "critical" | "unknown"

export const STATUS_META: Record<SignalStatus, { label: string; labelBn: string; color: string; meaning: string }> = {
  normal: { label: "Normal", labelBn: "স্বাভাবিক", color: "var(--color-status-normal)", meaning: "No significant reported disruption" },
  minor: { label: "Minor", labelBn: "সামান্য", color: "var(--color-status-minor)", meaning: "Small or localised issue" },
  significant: { label: "Significant", labelBn: "উল্লেখযোগ্য", color: "var(--color-status-significant)", meaning: "Material disruption" },
  critical: { label: "Critical", labelBn: "গুরুতর", color: "var(--color-status-critical)", meaning: "Serious verified incident" },
  unknown: { label: "Unknown", labelBn: "অজানা", color: "var(--color-status-unknown)", meaning: "Insufficient or outdated information" },
}

export const VERIFICATION_META = {
  confirmed: { label: "Confirmed", labelBn: "নিশ্চিত" },
  unverified: { label: "Unverified", labelBn: "অযাচাইকৃত" },
  disputed: { label: "Disputed", labelBn: "বিতর্কিত" },
  expired: { label: "Expired", labelBn: "মেয়াদোত্তীর্ণ" },
} as const
