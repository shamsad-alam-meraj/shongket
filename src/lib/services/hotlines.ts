/**
 * National hotlines in Bangladesh. These are public, government-published short codes —
 * a curated list, not live data. Review it whenever an agency changes its number.
 */
export type Hotline = { number: string; label: string; labelBn: string; note: string; group: "emergency" | "health" | "safety" | "utility" }

export const HOTLINES: Hotline[] = [
  { number: "999", label: "National emergency", labelBn: "জাতীয় জরুরি সেবা", note: "Police, fire service and ambulance — free, 24/7", group: "emergency" },
  { number: "16163", label: "Fire Service & Civil Defence", labelBn: "ফায়ার সার্ভিস ও সিভিল ডিফেন্স", note: "Fire and rescue control room", group: "emergency" },
  { number: "1090", label: "Disaster early warning", labelBn: "দুর্যোগের আগাম বার্তা", note: "Recorded weather and flood warnings (DDM)", group: "emergency" },
  { number: "16263", label: "Shasthya Batayon", labelBn: "স্বাস্থ্য বাতায়ন", note: "Doctor advice by phone (DGHS), 24/7", group: "health" },
  { number: "109", label: "Violence against women & children", labelBn: "নারী ও শিশু নির্যাতন প্রতিরোধ", note: "National helpline, free, 24/7", group: "safety" },
  { number: "1098", label: "Child helpline", labelBn: "শিশু সহায়তা", note: "Children at risk, free, 24/7", group: "safety" },
  { number: "333", label: "Government information", labelBn: "সরকারি তথ্য ও সেবা", note: "National call centre for public services", group: "safety" },
  { number: "16116", label: "DPDC electricity", labelBn: "ডিপিডিসি বিদ্যুৎ", note: "Power faults — Dhaka south", group: "utility" },
  { number: "16120", label: "DESCO electricity", labelBn: "ডেসকো বিদ্যুৎ", note: "Power faults — Dhaka north", group: "utility" },
  { number: "16162", label: "Dhaka WASA", labelBn: "ঢাকা ওয়াসা", note: "Water and sewerage complaints", group: "utility" },
]
