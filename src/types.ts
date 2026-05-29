/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LinkColors {
  dark: string;
  light: string;
}

export interface LinkData {
  id: string;
  originalUrl: string;
  deepUrl: string;
  type: 'channel' | 'video' | 'search' | 'other';
  label: string;
  colors: LinkColors;
  logo?: string; // base64 logo string
  createdAt: string;
  scansCount: number;
}

export interface ScanLog {
  timestamp: string;
  device: 'mobile' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'mac' | 'other';
  browser: string;
  referrer: string;
}

export interface LinkStats {
  linkId: string;
  totalScans: number;
  devices: {
    mobile: number;
    desktop: number;
  };
  os: {
    ios: number;
    android: number;
    mac: number;
    windows: number;
    other: number;
  };
  scansOverTime: {
    date: string; // YYYY-MM-DD
    count: number;
  }[];
  recentScans: ScanLog[];
}

export interface AppTranslations {
  title: string;
  subtitle: string;
  inputUrlPlaceholder: string;
  btnGenerate: string;
  btnGenerating: string;
  errInvalidUrl: string;
  customizeTitle: string;
  colorQr: string;
  colorBackground: string;
  uploadLogo: string;
  uploadLogoDesc: string;
  downloadPng: string;
  downloadSvg: string;
  previewTitle: string;
  deepLinkInfo: string;
  deepLinkProtocol: string;
  analyticsTitle: string;
  analyticsSubtitle: string;
  totalScansCard: string;
  deviceShareCard: string;
  osShareCard: string;
  scansHistoryCard: string;
  noDataYet: string;
  backToTop: string;
  step1: string;
  step1Desc: string;
  step2: string;
  step2Desc: string;
  step3: string;
  step3Desc: string;
  seoFaqTitle: string;
  seoFaq1Q: string;
  seoFaq1A: string;
  seoFaq2Q: string;
  seoFaq2A: string;
  seoFaq3Q: string;
  seoFaq3A: string;
  footerText: string;
}
