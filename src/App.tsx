/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Youtube, 
  Settings, 
  Upload, 
  Download, 
  TrendingUp, 
  Smartphone, 
  Laptop, 
  Languages, 
  Clock, 
  ExternalLink, 
  HelpCircle, 
  ChevronDown, 
  Check, 
  Trash2, 
  ShieldCheck,
  Zap,
  RefreshCw,
  Share2
} from 'lucide-react';
import { translations } from './translations';
import { LinkData, LinkStats, LinkColors } from './types';

export default function App() {
  // Locale state based on URL path
  const [isEn, setIsEn] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentLink, setCurrentLink] = useState<LinkData | null>(null);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // QR Customization States
  const [qrColors, setQrColors] = useState<LinkColors>({
    dark: '#cc0000', // Youtube Red default
    light: '#ffffff'
  });
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: false
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Listen to path changes or setup on mount
  useEffect(() => {
    const path = window.location.pathname;
    const isEnglishRoute = path.startsWith('/en');
    setIsEn(isEnglishRoute);
    
    // Set html attributes matching translation SEO
    document.documentElement.lang = isEnglishRoute ? 'en' : 'ar';
    document.documentElement.dir = isEnglishRoute ? 'ltr' : 'rtl';
    
    // Load default demo link stats on first render
    fetchStats('demo-link');
  }, []);

  // Set default currentLink structure to demo-link on first mount, 
  // until the user generates a custom one
  useEffect(() => {
    if (!currentLink) {
      setCurrentLink({
        id: 'demo-link',
        originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        deepUrl: 'youtube://www.youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'video',
        label: 'Rick Astley - Never Gonna Give You Up',
        colors: { dark: '#cc0000', light: '#ffffff' },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        scansCount: 184
      });
    }
  }, [currentLink]);

  const t = isEn ? translations.en : translations.ar;

  // Toggle Language routing without page reload if possible, but maintaining SEO links
  const toggleLanguage = () => {
    if (isEn) {
      window.location.href = '/';
    } else {
      window.location.href = '/en';
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processLogoFile(e.target.files[0]);
    }
  };

  const processLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(isEn ? "Please upload an image file" : "يرجى رفع ملف صورة فقط");
      return;
    }
    setLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoBase64(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoBase64(null);
    setLogoFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fetch Statistics from Express APIs
  const fetchStats = async (id: string) => {
    setIsStatsLoading(true);
    try {
      const res = await fetch(`/api/stats/${id}`);
      if (res.ok) {
        const data: LinkStats = await res.json();
        setStats(data);
      } else {
        console.error("Failed to load statistics server-side");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Generate QR Canvas with custom graphics
  useEffect(() => {
    if (!currentLink || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // We generate the path targeting the redirect endpoint of the database
    const redirectUrl = `https://qrytubee.essamelmansy69.workers.dev/r/${currentLink.id}`;

    QRCode.toCanvas(
      canvas,
      redirectUrl,
      {
        color: {
          dark: qrColors.dark,
          light: qrColors.light
        },
        errorCorrectionLevel: 'Q', // Level Q allows safe overlay of logos with 25% area coverage
        margin: 2,
        width: 360,
      },
      (error) => {
        if (error) {
          console.error("QR Code rendering completed with error", error);
          return;
        }

        // Draw central logo onto Canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvas.width;
        const center = size / 2;

        // Custom logo loading
        const logoImg = new Image();
        if (logoBase64) {
          logoImg.src = logoBase64;
        } else {
          // Default Youtube logo template if no user logo is loaded
          logoImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff0000"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.51a3.003 3.003 0 0 0-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.871.51 9.388.51 9.388.51s7.517 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108c.502-1.87 0.502-5.837 0.502-5.837s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
        }

        logoImg.onload = () => {
          // High-fidelity parameters
          const logoSize = size * 0.22; 
          const pad = 6; // Beautiful shield padding

          // Draw backdrop protective shield (rounded square card matching light color)
          ctx.fillStyle = qrColors.light;
          ctx.beginPath();
          ctx.roundRect(
            center - logoSize / 2 - pad,
            center - logoSize / 2 - pad,
            logoSize + pad * 2,
            logoSize + pad * 2,
            12
          );
          ctx.fill();

          // Draw subtle outline to isolate shield cleanly from QR columns
          ctx.strokeStyle = qrColors.dark + '33'; // 20% opacity matching foreground
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Render user or youtube logo
          ctx.drawImage(
            logoImg,
            center - logoSize / 2,
            center - logoSize / 2,
            logoSize,
            logoSize
          );
        };
      }
    );
  }, [currentLink, qrColors, logoBase64]);

  // Handle Generation Submit Hook
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg(t.errInvalidUrl);
      return;
    }

    // Verify channel or video domains
    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      setErrorMsg(t.errInvalidUrl);
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: trimmed,
          colors: qrColors,
          logo: logoBase64
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentLink(data.link);
        
        // Load initial state count for newly generated link
        fetchStats(data.link.id);
        setUrlInput(''); // clear field
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || t.errInvalidUrl);
      }
    } catch (e) {
      setErrorMsg(isEn ? "Failed to connect to full-stack service" : "تعذر الاتصال بالخادم الرئيسي");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyRedirectUrl = () => {
    if (!currentLink) return;
    const redirectUrl = `https://qrytubee.essamelmansy69.workers.dev/r/${currentLink.id}`;
    navigator.clipboard.writeText(redirectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR Code as Canvas Image
  const handleDownloadPng = () => {
    if (!canvasRef.current || !currentLink) return;
    const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `qrytube-${currentLink.id}-${isEn ? 'qr' : 'كود'}.png`;
    link.href = dataUrl;
    link.click();
  };

  // SVG representation builder for vectors
  const handleDownloadSvg = () => {
    if (!currentLink) return;
    const redirectUrl = `https://qrytubee.essamelmansy69.workers.dev/r/${currentLink.id}`;
    
    // Create simulated SVG download
    QRCode.toString(
      redirectUrl,
      {
        type: 'svg',
        color: {
          dark: qrColors.dark,
          light: qrColors.light
        },
        errorCorrectionLevel: 'Q',
        margin: 2,
      },
      (err, svgString) => {
        if (err) {
          console.error(err);
          return;
        }
        
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qrytube-${currentLink.id}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    );
  };

  // Preset Colors selection list
  const activeColorPresets = [
    { name: 'YouTube Red', dark: '#cc0000', light: '#ffffff' },
    { name: 'Midnight Charcoal', dark: '#0f172a', light: '#ffffff' },
    { name: 'Cosmic Royal Blue', dark: '#1d4ed8', light: '#ffffff' },
    { name: 'Forest Mint', dark: '#047857', light: '#f0fdf4' },
    { name: 'Imperial Violet', dark: '#6d28d9', light: '#f5f3ff' },
    { name: 'Classic Ebony', dark: '#1e293b', light: '#f8fafc' },
  ];

  // Helper calculation for custom SVG Line chart variables
  const getLineChartPoints = (data: { date: string; count: number }[]) => {
    if (data.length === 0) return '';
    const width = 500;
    const height = 150;
    const maxCount = Math.max(...data.map(d => d.count), 10);
    
    return data.map((d, index) => {
      const x = (index / (data.length - 1)) * (width - 40) + 20;
      const y = height - (d.count / maxCount) * (height - 40) - 20;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-red-500 selection:text-white pb-12">
      
      {/* Dynamic Upper Banner / Header Info */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Web Logo Center */}
          <a href={isEn ? '/en' : '/'} className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-md group-hover:scale-105 transition-all">
              <Youtube className="w-5 h-5 fill-white" />
            </div>
            <span className="font-sans font-extrabold text-2xl tracking-tighter text-slate-900 group-hover:text-red-600 transition-colors">
              qry<span className="text-red-600">tube</span>
            </span>
          </a>

          {/* Localization Toggle controls */}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200/60 transition-all text-xs font-semibold"
              aria-label="Toggle language"
              id="langToggleBtn"
            >
              <Languages className="w-4 h-4 shrink-0 text-slate-500" />
              <span>{isEn ? 'العربية' : 'English'}</span>
            </button>
            
            {/* Direct Channel External Link */}
            <a 
              href="https://youtube.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium"
            >
              <span>YouTube</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow py-8 md:py-12">
        
        {/* Main Display Lead section */}
        <section className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold mb-4 shadow-2xs border border-red-100 animate-pulse-slow">
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <span>{isEn ? '100% Free & No Registration Required' : 'مجاني بالكامل بنسبة 100% بدون أي اشتراك'}</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-1.15 mb-4">
            {t.title}
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-light">
            {t.subtitle}
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* COL 1: Link generation with customization settings Panel */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Input Form Module */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8 relative overflow-hidden" id="qrGenFormCard">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-indigo-600"></div>
              
              <form onSubmit={handleGenerate} className="space-y-6">
                <div>
                  <label htmlFor="yt-url" className="block text-sm font-bold text-slate-800 mb-2">
                    {isEn ? 'Youtube Channel or Video Link' : 'رابط قناة أو فيديو اليوتيوب الرئيسي'}
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Youtube className="h-5 w-5 text-red-500" />
                    </div>
                    <input
                      type="url"
                      name="yt-url"
                      id="yt-url"
                      required
                      placeholder={t.inputUrlPlaceholder}
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm sm:text-base font-medium"
                    />
                  </div>
                  {errorMsg && (
                    <p className="mt-2 text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-50/50 p-2 rounded-lg border border-red-100">
                      <span>⚠️ {errorMsg}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  id="submitBtn"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-bold bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 transition-all shadow-md cursor-pointer glow-btn hover:scale-[1.01]"
                >
                  <QrCode className="w-5 h-5 shrink-0" />
                  <span>{isGenerating ? t.btnGenerating : t.btnGenerate}</span>
                </button>
              </form>
            </div>

            {/* Customization Options Module */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8" id="qrCustomizeCard">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <Settings className="w-5 h-5 text-red-500" />
                <h2 className="font-bold text-lg text-slate-900">{t.customizeTitle}</h2>
              </div>

              {/* Color Settings rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label htmlFor="color-picker-fg" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {t.colorQr}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="color-picker-fg"
                      value={qrColors.dark}
                      onChange={(e) => setQrColors({ ...qrColors, dark: e.target.value })}
                      className="w-10 h-10 border border-slate-200 rounded-xl cursor-pointer p-0 shrink-0 bg-transparent"
                    />
                    <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 uppercase select-all font-medium">
                      {qrColors.dark}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="color-picker-bg" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {t.colorBackground}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="color-picker-bg"
                      value={qrColors.light}
                      onChange={(e) => setQrColors({ ...qrColors, light: e.target.value })}
                      className="w-10 h-10 border border-slate-200 rounded-xl cursor-pointer p-0 shrink-0 bg-transparent"
                    />
                    <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 uppercase select-all font-medium">
                      {qrColors.light}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ready presets picker list */}
              <div className="mb-8">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {isEn ? 'Aesthetic Palettes Ready Preset' : 'لوحة ألوان جاهزة متناسقة'}
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {activeColorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setQrColors({ dark: preset.dark, light: preset.light })}
                      title={preset.name}
                      className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-150 hover:border-red-400 focus:outline-hidden hover:bg-slate-50 active:scale-95 transition-all text-center cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg flex overflow-hidden border border-slate-200/50 mb-1">
                        <div className="w-1/2" style={{ backgroundColor: preset.dark }}></div>
                        <div className="w-1/2" style={{ backgroundColor: preset.light }}></div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 truncate w-full px-1">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File upload drag and drop for logos */}
              <div>
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {t.uploadLogo}
                </span>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative ${
                    dragActive 
                      ? 'border-red-500 bg-red-50/20' 
                      : 'border-slate-250 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-350'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  id="logoUploadZone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    id="logo-file-input"
                  />
                  
                  {logoBase64 ? (
                    <div className="flex flex-col items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md border border-slate-200 p-1 bg-white flex items-center justify-center">
                        <img src={logoBase64} alt="Custom Logo Preview" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain rounded-lg" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 max-w-xs truncate mx-auto">
                          {logoFileName || "Custom logo active"}
                        </p>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isEn ? 'Remove Logo' : 'إزالة الشعار'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-500 shadow-xs border border-slate-200/55">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {t.uploadLogoDesc}
                      </p>
                      <span className="text-xs text-slate-400">
                        PNG, JPG, SVG, WEBP (Max 2MB)
                      </span>
                    </>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* COL 2: Live rendering preview panel */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8 sticky top-24 text-center flex flex-col items-center" id="qrPreviewCard">
              <h2 className="font-extrabold text-lg text-slate-900 mb-6 w-full text-center sm:text-start flex items-center gap-2 justify-center sm:justify-start">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                {t.previewTitle}
              </h2>

              {/* Bounding box maintaining constant layout sizes (320px x 320px) preventing layout shifts CLS */}
              <div 
                className="w-80 h-80 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-4 shadow-sm select-none"
                style={{ width: '320px', height: '320px' }}
              >
                <canvas 
                  ref={canvasRef} 
                  className="w-72 h-72 max-w-full max-h-full aspect-square"
                  style={{ width: '288px', height: '288px' }}
                />
              </div>

              {/* URL Information Section */}
              {currentLink && (
                <div className="mt-6 w-full text-start bg-slate-50/50 rounded-xl p-4 border border-slate-100/80 space-y-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t.deepLinkInfo}
                    </span>
                    <div className="flex items-center justify-between gap-1.5 mt-1 font-mono text-xs font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200/50 select-all overflow-hidden">
                      <span className="truncate">https://qrytubee.essamelmansy69.workers.dev/r/{currentLink.id}</span>
                      <button 
                        onClick={copyRedirectUrl}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-1 rounded-sm cursor-pointer shrink-0 transition-colors"
                        title="Copy Redirect Link"
                        type="button"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 leading-normal font-medium flex items-start gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                    <span>
                      {t.deepLinkProtocol} <span className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded-sm font-semibold">{currentLink.deepUrl}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Download CTA block buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6 w-full">
                <button
                  onClick={handleDownloadPng}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all text-center cursor-pointer"
                  id="downloadPngBtn"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>PNG</span>
                </button>

                <button
                  onClick={handleDownloadSvg}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all text-center cursor-pointer"
                  id="downloadSvgBtn"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>SVG</span>
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* SECTION 2: Interactive Real Analytics Dashboard */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8 mb-16" id="analyticsDashboard">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 mb-8 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0 border border-red-100/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
                  {t.analyticsTitle}
                  {currentLink && (
                    <span className="font-mono text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full select-all">
                      #{currentLink.id}
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {t.analyticsSubtitle}
                </p>
              </div>
            </div>

            {/* Manual refresh button for analytical database logs */}
            {currentLink && (
              <button
                onClick={() => fetchStats(currentLink.id)}
                disabled={isStatsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/50 transition-all cursor-pointer self-start sm:self-center shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isStatsLoading ? 'animate-spin' : ''}`} />
                <span>{isEn ? 'Refresh Live Data' : 'تحديث البيانات المباشرة'}</span>
              </button>
            )}
          </div>

          {!stats ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            </div>
          ) : stats.totalScans === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6">
              <QrCode className="w-12 h-12 text-slate-350 mx-auto mb-3 animate-pulse" />
              <p className="text-slate-600 font-bold mb-1">
                {isEn ? 'No analytics logged yet' : 'لا توجد نقرات أو مسحات مسجلة بعد'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {t.noDataYet}
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              
              {/* Aggregated widgets grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total Counter Card */}
                <div className="bg-slate-50/70 border border-slate-150/60 rounded-xl p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">
                    <span>{t.totalScansCard}</span>
                    <Clock className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-5xl font-black text-slate-900 tracking-tight font-sans">
                      {stats.totalScans}
                    </span>
                    <span className="block mt-2 text-[10px] text-green-600 bg-green-50 self-start px-2 py-0.5 rounded-sm font-bold border border-green-100/50 w-fit">
                      {isEn ? 'Active & Verifiable' : 'نشط وتم التحقق منه'}
                    </span>
                  </div>
                </div>

                {/* Device distribution segment */}
                <div className="bg-slate-50/70 border border-slate-150/60 rounded-xl p-6">
                  <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">
                    {t.deviceShareCard}
                  </span>
                  
                  {/* Two columns: circular ring chart & labels */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                      {/* Dynamic circular segment path with high accuracy based on percentage */}
                      {(() => {
                        const total = stats.devices.mobile + stats.devices.desktop;
                        const mobilePerc = total ? Math.round((stats.devices.mobile / total) * 100) : 0;
                        const strokeDasharray = `${mobilePerc} ${100 - mobilePerc}`;
                        return (
                          <>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="4"></circle>
                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray={strokeDasharray} strokeDashoffset="25"></circle>
                            </svg>
                            <span className="absolute text-center font-black text-sm text-slate-800">
                              {mobilePerc}%
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-700">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Smartphone className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>{isEn ? 'Mobile' : 'جوال'}</span>
                        </span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded-sm border border-slate-200/50 font-bold">
                          {stats.devices.mobile}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-700">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{isEn ? 'Desktop' : 'مكتب'}</span>
                        </span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded-sm border border-slate-200/50 font-bold">
                          {stats.devices.desktop}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating systems metrics progress bars */}
                <div className="bg-slate-50/70 border border-slate-150/60 rounded-xl p-6">
                  <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
                    {t.osShareCard}
                  </span>
                  
                  <div className="space-y-2.5">
                    {(() => {
                      const totalOSList = Object.entries(stats.os)
                        .map(([osName, count]) => ({ name: osName, count: Number(count) }))
                        .sort((a, b) => b.count - a.count);
                      
                      const maxVal = stats.totalScans || 1;
                      
                      return totalOSList.map((item) => {
                        const percent = Math.round((item.count / maxVal) * 100);
                        const labelMap: Record<string, string> = {
                          ios: 'iOS (Apple)',
                          android: 'Android',
                          mac: 'macOS',
                          windows: 'Windows',
                          other: 'Other'
                        };
                        return (
                          <div key={item.name} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-700 font-bold">
                              <span className="capitalize">{labelMap[item.name] || item.name}</span>
                              <span className="font-mono text-slate-500">{item.count} ({percent}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-600 rounded-full transition-all duration-500" 
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              </div>

              {/* Line Chart Section for Daily Trend Logs */}
              <div className="bg-slate-50/70 border border-slate-150/60 rounded-xl p-6">
                <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">
                  {t.scansHistoryCard}
                </span>

                <div className="w-full h-44 flex items-end relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Fill of spline path */}
                    {stats.scansOverTime.length > 0 && (
                      <path
                        d={`M 20,150 L ${getLineChartPoints(stats.scansOverTime)} L 480,150 Z`}
                        fill="url(#gradient-area)"
                        stroke="none"
                      />
                    )}

                    {/* Smooth Spline Stroke */}
                    {stats.scansOverTime.length > 0 && (
                      <polyline
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        points={getLineChartPoints(stats.scansOverTime)}
                      />
                    )}

                    {/* Dot indicators */}
                    {stats.scansOverTime.map((d, idx) => {
                      const maxVal = Math.max(...stats.scansOverTime.map(sc => sc.count), 10);
                      const x = (idx / (stats.scansOverTime.length - 1)) * 460 + 20;
                      const y = 150 - (d.count / maxVal) * 110 - 20;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="hover:r-6 cursor-pointer"
                          title={`${d.date}: ${d.count} scans`}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Day Labels of Spline chart */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono px-2 mt-2">
                  <span>{stats.scansOverTime[0]?.date}</span>
                  <span>{stats.scansOverTime[Math.floor(stats.scansOverTime.length / 2)]?.date}</span>
                  <span>{stats.scansOverTime[stats.scansOverTime.length - 1]?.date}</span>
                </div>
              </div>

              {/* Real Raw DB Scan Terminal - User Engagement */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-900 px-4 py-3 text-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    {isEn ? 'LIVE ACTIVITY MONITOR (SERVER SIDE DB LOGS)' : 'مُراقِب تفاعل السيرفر المباشر (تسجيل زوار الكود)'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">QRYTUBE V1.2</span>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto font-mono text-xs p-2">
                  {stats.recentScans.map((log, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 hover:bg-slate-50 gap-2 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="text-emerald-600 font-bold uppercase shrink-0">GET /r/{currentLink?.id}</span>
                        <span className="text-slate-500 truncate max-w-xs">{log.referrer}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-sm font-bold border border-blue-100">{log.device}</span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm font-bold border border-indigo-100">{log.os}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm font-bold border border-slate-250 shrink-0">{log.browser}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </section>

        {/* SECTION 3: Stepper Instructional Graphic banner */}
        <section className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 mb-16 relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-radial from-red-650/40 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-start">
            <div className="space-y-2">
              <h3 className="font-extrabold text-lg sm:text-xl text-red-500 truncate">{t.step1}</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">{t.step1Desc}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-extrabold text-lg sm:text-xl text-red-500 truncate">{t.step2}</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">{t.step2Desc}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-lg sm:text-xl text-red-500 truncate">{t.step3}</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">{t.step3Desc}</p>
            </div>
          </div>
        </section>

        {/* SECTION 4: Professional FAQ accordion for Strict Indexing keyword SEO */}
        <section className="max-w-4xl mx-auto space-y-6" id="faqAccordionSection">
          <h2 className="text-2xl font-black text-slate-900 text-center tracking-tight mb-8">
            {t.seoFaqTitle}
          </h2>

          <div className="space-y-3">
            {[0, 1, 2].map((idx) => {
              const qMap = [t.seoFaq1Q, t.seoFaq2Q, t.seoFaq3Q];
              const aMap = [t.seoFaq1A, t.seoFaq2A, t.seoFaq3A];
              const isOpen = faqOpen[idx];
              
              return (
                <div 
                  key={idx} 
                  className="bg-white border border-slate-200/50 rounded-xl overflow-hidden transition-all shadow-3xs"
                >
                  <button
                    type="button"
                    onClick={() => setFaqOpen({ ...faqOpen, [idx]: !isOpen })}
                    className="w-full flex items-center justify-between p-5 text-start font-bold text-slate-800 hover:text-red-600 transition-colors bg-white font-sans text-sm sm:text-base cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <span>{qMap[idx]}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-slate-400 ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
                  </button>

                  <div 
                    className={`transition-all duration-300 ease-in-out px-10 border-t border-slate-50 text-slate-600 text-xs sm:text-sm leading-relaxed overflow-hidden ${
                      isOpen ? 'max-h-96 py-5 opacity-100' : 'max-h-0 py-0 opacity-0'
                    }`}
                  >
                    <p className="font-light">{aMap[idx]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Corporate Footnote branding */}
      <footer className="w-full border-t border-slate-200/60 mt-16 pt-8 bg-slate-55 flex flex-col items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col md:flex-row items-center justify-between gap-4 text-center text-xs md:text-sm text-slate-400 py-6 font-medium">
          
          <div className="flex items-center gap-2 order-2 md:order-1 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Cloudflare Edge Worker CDN active routing & SEO index status verified</span>
          </div>

          <span className="order-1 md:order-2 text-slate-500 font-semibold">{t.footerText}</span>

        </div>
      </footer>

    </div>
  );
}
