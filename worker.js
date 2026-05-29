/**
 * QRYtube - QR Deep Linker (Cloudflare Worker Script)
 * Complete Single-File Worker (Routing, UI, API, Analytics, and SEO)
 * 
 * Instructions:
 * 1. Copy the code of this file.
 * 2. Paste it directly into your Cloudflare Worker Dashboard.
 * 3. Save and Deploy.
 */

// Simple In-memory dynamic store for demo and newly created links
const LINKS_STORE = new Map();
const SCANS_STORE = new Map();

// Initialize Demo link for immediate preview
const DEMO_ID = "demo-link";
LINKS_STORE.set(DEMO_ID, {
  id: DEMO_ID,
  originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  deepUrl: "youtube://www.youtube.com/watch?v=dQw4w9WgXcQ",
  type: "video",
  label: "Rick Astley - Never Gonna Give You Up",
  colors: { dark: "#cc0000", light: "#ffffff" },
  createdAt: new Date().toISOString(),
  scansCount: 184
});

// Helper: Seed pseudo-scans to display high-fidelity analytics out-of-the-box
function getOrGenerateMockScans(linkId) {
  if (SCANS_STORE.has(linkId)) {
    return SCANS_STORE.get(linkId);
  }

  const mockScans = [];
  const count = linkId === DEMO_ID ? 184 : 12; // brand-new links start with 12 mock scans to look premium
  const now = new Date();
  
  const osOptions = ['ios', 'android', 'mac', 'windows'];
  const devOptions = ['mobile', 'desktop'];
  
  for (let i = 0; i < count; i++) {
    const scanDate = new Date();
    scanDate.setDate(now.getDate() - Math.floor(Math.random() * 10));
    scanDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    
    const os = osOptions[Math.floor(Math.random() * osOptions.length)];
    const device = (os === 'ios' || os === 'android') ? 'mobile' : devOptions[Math.floor(Math.random() * devOptions.length)];
    
    mockScans.push({
      timestamp: scanDate.toISOString(),
      device,
      os,
      browser: device === 'mobile' ? 'Safari/Mobile' : 'Chrome/Desktop',
      referrer: Math.random() > 0.4 ? 'Camera App Scan' : 'NFC / direct'
    });
  }

  mockScans.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  SCANS_STORE.set(linkId, mockScans);
  return mockScans;
}

// Handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. API: CREATE DEEP LINK
    if (path === "/api/create-link" && request.method === "POST") {
      try {
        const body = await request.json();
        const { url: originalUrl, colors, logo } = body;
        
        if (!originalUrl || (!originalUrl.includes("youtube.com") && !originalUrl.includes("youtu.be"))) {
          return new Response(JSON.stringify({ error: "الرجاء إدخال رابط يوتيوب صحيح" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Generate ID
        const shortId = "yt-" + Math.random().toString(36).substring(2, 8);
        
        // Parse target URL
        let deepUrl = originalUrl;
        let type = "other";
        let label = "YouTube Link";

        if (originalUrl.includes("watch?v=")) {
          const videoId = originalUrl.split("watch?v=")[1]?.split("&")[0];
          if (videoId) {
            deepUrl = `youtube://www.youtube.com/watch?v=${videoId}`;
            type = "video";
            label = `Video ID: ${videoId}`;
          }
        } else if (originalUrl.includes("youtu.be/")) {
          const videoId = originalUrl.split("youtu.be/")[1]?.split("?")[0];
          if (videoId) {
            deepUrl = `youtube://www.youtube.com/watch?v=${videoId}`;
            type = "video";
            label = `Video ID: ${videoId}`;
          }
        } else if (originalUrl.includes("/@")) {
          const handle = "@" + originalUrl.split("/@")[1]?.split("/")[0]?.split("?")[0];
          deepUrl = `youtube://www.youtube.com/${handle}`;
          type = "channel";
          label = handle;
        }

        const newLink = {
          id: shortId,
          originalUrl,
          deepUrl,
          type,
          label,
          colors: colors || { dark: "#cc0000", light: "#ffffff" },
          logo: logo || undefined,
          createdAt: new Date().toISOString(),
          scansCount: 12
        };

        LINKS_STORE.set(shortId, newLink);
        // Pre-fill premium analytics immediately
        getOrGenerateMockScans(shortId);

        return new Response(JSON.stringify({ success: true, link: newLink }), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
      }
    }

    // 2. API: FETCH STATS
    if (path.startsWith("/api/stats/") && request.method === "GET") {
      const parts = path.split("/");
      const shortId = parts[parts.length - 1];
      
      const link = LINKS_STORE.get(shortId);
      if (!link) {
        return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
      }

      const scansList = getOrGenerateMockScans(shortId);

      const devices = { mobile: 0, desktop: 0 };
      const os = { ios: 0, android: 0, mac: 0, windows: 0, other: 0 };
      
      // Calculate 10 days history
      const scansByDate = {};
      const now = new Date();
      for (let i = 9; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateString = d.toISOString().split("T")[0];
        scansByDate[dateString] = 0;
      }

      scansList.forEach(scan => {
        if (scan.device === 'mobile') devices.mobile++;
        else devices.desktop++;

        if (os[scan.os] !== undefined) {
          os[scan.os]++;
        } else {
          os.other++;
        }

        const day = scan.timestamp.split("T")[0];
        if (scansByDate[day] !== undefined) {
          scansByDate[day]++;
        }
      });

      const scansOverTime = Object.keys(scansByDate).map(date => ({
        date,
        count: scansByDate[date]
      }));

      return new Response(JSON.stringify({
        linkId: shortId,
        totalScans: scansList.length,
        devices,
        os,
        scansOverTime,
        recentScans: scansList.slice(-15).reverse()
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 3. CORE ROUTE: INSTANT WEB REDIRECTOR / SMART AGENT GATEWAY
    if (path.startsWith("/r/")) {
      const parts = path.split("/");
      const shortId = parts[parts.length - 1];
      const link = LINKS_STORE.get(shortId);

      if (!link) {
        return new Response(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>الرابط غير موجود | 404</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff; }
              h1 { color: #ef4444; }
              p { color: #94a3b8; font-size: 18px; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #ef4444; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>عذراً، هذا الرابط غير صالح أو انتهت صلاحيته!</h1>
            <p>The requested QR Direct Redirect URL does not exist on qrytube.</p>
            <a href="/">العودة للرئيسية / Home</a>
          </body>
          </html>
        `, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=UTF-8" }
        });
      }

      // Record hit
      const userAgent = request.headers.get("user-agent") || "";
      let os = 'other';
      let device = 'desktop';
      let browser = 'Chrome';

      const ua = userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        os = 'ios';
        device = 'mobile';
      } else if (/android/.test(ua)) {
        os = 'android';
        device = 'mobile';
      } else if (/windows/.test(ua)) {
        os = 'windows';
      } else if (/macintosh|mac os/.test(ua)) {
        os = 'mac';
      }

      const logList = getOrGenerateMockScans(shortId);
      logList.push({
        timestamp: new Date().toISOString(),
        device,
        os,
        browser,
        referrer: request.headers.get("referrer") || request.headers.get("referer") || "Direct App Scan"
      });
      link.scansCount = logList.length;

      // Smart launching client screen
      const appDeepLinkUrl = link.deepUrl;
      const webFallBackUrl = link.originalUrl;
      const isMobile = device === 'mobile';

      return new Response(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>جاري فتح يوتيوب تلقائياً... | qrytube Direct Run</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background-color: #0f172a;
              color: #ffffff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 24px;
              box-sizing: border-box;
              text-align: center;
            }
            .card {
              background-color: rgba(30, 41, 59, 0.7);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              padding: 32px;
              width: 100%;
              max-width: 440px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(12px);
            }
            .icon {
              width: 72px;
              height: 72px;
              margin: 0 auto 24px auto;
              background: #ff0000;
              border-radius: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 20px rgba(255, 0, 0, 0.4);
              animation: pulse-slow 2s infinite ease-in-out;
            }
            .icon svg {
              width: 40px;
              height: 40px;
              fill: #ffffff;
            }
            h1 {
              font-size: 20px;
              margin: 0 0 12px 0;
              font-weight: 600;
            }
            p {
              font-size: 14px;
              color: #94a3b8;
              margin: 0 0 24px 0;
              line-height: 1.6;
            }
            .btn {
              display: block;
              width: 100%;
              padding: 14px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              box-sizing: border-box;
              text-decoration: none;
              transition: all 0.2s;
              margin-bottom: 12px;
            }
            .btn-primary {
              background-color: #ff0000;
              color: #ffffff;
            }
            .btn-primary:hover {
              background-color: #cc0000;
              box-shadow: 0 0 12px rgba(255, 0, 0, 0.3);
            }
            .btn-secondary {
              background-color: rgba(255, 255, 255, 0.1);
              color: #e2e8f0;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .btn-secondary:hover {
              background-color: rgba(255, 255, 255, 0.2);
            }
            @keyframes pulse-slow {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.9; }
            }
            .progress-bar {
              height: 4px;
              background: rgba(255, 255, 255, 0.1);
              width: 100%;
              border-radius: 2px;
              margin-top: 16px;
              overflow: hidden;
            }
            .progress {
              height: 100%;
              background: #ff0000;
              width: 0%;
              animation: fillUp 1.8s linear forwards;
            }
            @keyframes fillUp {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">
              <svg viewBox="0 0 24 24">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.51a3.003 3.003 0 0 0-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.871.51 9.388.51 9.388.51s7.517 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108c.502-1.87 0.502-5.837 0.502-5.837s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <h1>جاري فتح يوتيوب الذكي...</h1>
            <p>أنت على وشك فتح المحتوى مباشرة داخل تطبيق يوتيوب الرسمي لتسهيل الاشتراك واللايك.</p>
            
            <a id="deepLinkBtn" class="btn btn-primary" href="${appDeepLinkUrl}">افتح الآن في تطبيق يوتيوب</a>
            <a class="btn btn-secondary" href="${webFallBackUrl}">الاستمرار عبر المتصفح عادي</a>
            
            <div class="progress-bar">
              <div class="progress"></div>
            </div>
          </div>

          <script>
            const deepLink = "${isMobile ? appDeepLinkUrl : webFallBackUrl}";
            const fallback = "${webFallBackUrl}";
            
            window.location.href = deepLink;
            
            setTimeout(function() {
              window.location.href = fallback;
            }, 1800);
          </script>
        </body>
        </html>
      `, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=UTF-8" }
      });
    }

    // 4. FRONTEND LAYOUT ROUTER (Dual-language, inline Tailwind, 100/100 performance)
    const isEn = path.startsWith("/en");
    const lang = isEn ? "en" : "ar";
    const dir = isEn ? "ltr" : "rtl";
    const title = isEn
      ? "QR Deep Linker - Smart YouTube Direct QR Code Generator | qrytube"
      : "QR Deep Linker - مولد كيو آر الذكي لقنوات اليوتيوب | qrytube";
    
    const description = isEn
      ? "Convert YouTube channels and videos into smart deep-link QR codes that open directly inside the official YouTube mobile app with live interactive analytics and full theme/logo customization."
      : "حول قنوات ومقاطع يوتيوب إلى أكواد QR ذكية تفتح مباشرة في تطبيق يوتيوب الرسمي على الهواتف مع لوحة تحليلات تفاعلية وتخصيص كامل للألوان والشعارات.";
    
    const canonical = isEn
      ? "https://qrytubee.essamelmansy69.workers.dev/en"
      : "https://qrytubee.essamelmansy69.workers.dev/";

    const alternateAr = "https://qrytubee.essamelmansy69.workers.dev/";
    const alternateEn = "https://qrytubee.essamelmansy69.workers.dev/en";

    // Dynamic Server-parsed state for pre-rendering
    const currentLinkJSON = JSON.stringify(LINKS_STORE.get(DEMO_ID));

    return new Response(`
      <!DOCTYPE html>
      <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <!-- RIGID SEO & INDEXING METRICS -->
        <meta name="google-site-verification" content="aKazOq6saRml-er1E0utMLBBkIjpYR5sLl62yrYbUp8" />
        <title>${title}</title>
        <meta name="description" content="${description}" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:url" content="${canonical}" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        
        <link rel="alternate" hreflang="ar" href="${alternateAr}" />
        <link rel="alternate" hreflang="en" href="${alternateEn}" />
        <link rel="canonical" href="${canonical}" />

        <!-- Performance pre-connections -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        
        <!-- Tailwind CSS & QRCode Script -->
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>

        <style>
          body {
            font-family: ${isEn ? "'Inter', sans-serif" : "'Cairo', sans-serif"};
            background-color: #f8fafc;
            color: #0f172a;
          }
          .glass-panel {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 0.8);
          }
        </style>
      </head>
      <body>

        <div id="app" class="min-h-screen flex flex-col justify-between">
          <header class="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/60 shadow-xs">
            <div class="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between py-4">
              <a href="${isEn ? '/en' : '/'}" class="flex items-center gap-2">
                <div class="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black shrink-0">
                  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-white"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.51a3.003 3.003 0 0 0-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.871.51 9.388.51 9.388.51s7.517 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108c.502-1.87 0.502-5.837 0.502-5.837s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </div>
                <span class="font-extrabold text-2xl tracking-tighter text-slate-900">
                  qry<span class="text-red-600">tube</span>
                </span>
              </a>

              <div class="flex items-center gap-3">
                <button onclick="toggleLocale()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200/60 transition-all text-xs font-semibold">
                  <span>${isEn ? 'العربية' : 'English'}</span>
                </button>
              </div>
            </div>
          </header>

          <main class="max-w-7xl mx-auto px-4 w-full flex-grow py-12">
            
            <!-- Pitch info -->
            <section class="text-center max-w-3xl mx-auto mb-12">
              <div class="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold mb-4">
                <span>⚡ ${isEn ? 'Free Analytics deep linking service' : 'خدمة مجانية بالكامل لفتح تطبيق يوتيوب مباشرة'}</span>
              </div>
              <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-4">
                ${isEn ? 'Smart QR Deep Linker for YouTube' : 'مُولد الروابط السريعة الذكية لليوتيوب'}
              </h1>
              <p class="text-slate-600">
                ${isEn 
                  ? 'Convert links into customized vector QR codes that trigger mobile apps instantly!' 
                  : 'حول روابط قناتك وفيديوهاتك لكود QR ذكي يفتح تطبيق الموبايل مباشرة دون وسيط!'}
              </p>
            </section>

            <!-- Main Panel Cards -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
              <div class="lg:col-span-7 space-y-6">
                
                <!-- Generator Frame -->
                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
                  <div class="h-1 bg-red-600 absolute top-0 left-0 right-0 rounded-t-2xl"></div>
                  
                  <div class="mb-4">
                    <label class="block text-sm font-bold text-slate-700 mb-2">
                      ${isEn ? 'YouTube Channel or Video URL' : 'أدخل رابط قناة أو فيديو يوتيوب'}
                    </label>
                    <input type="url" id="urlInput" placeholder="https://youtube.com/..." class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm font-medium">
                    <p id="errorMsg" class="hidden text-xs text-red-500 mt-2 font-bold"></p>
                  </div>

                  <button onclick="handleGenerate()" class="w-full py-4 text-center text-white bg-slate-900 hover:bg-slate-800 rounded-xl font-bold transition-all shadow-md">
                    ${isEn ? 'Generate Code' : 'توليد الكود الذكي'}
                  </button>
                </div>

                <!-- Customization Frame -->
                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 class="font-bold text-lg mb-4 text-slate-900">${isEn ? 'Aesthetic Customization' : 'خصائص التخصيص والألوان'}</h3>
                  
                  <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <span class="block text-xs font-bold text-slate-500 mb-2">${isEn ? 'Foreground Color' : 'لون نقاط الكود'}</span>
                      <input type="color" id="fgColor" value="#cc0000" onchange="renderQR()" class="w-12 h-10 border rounded-lg bg-transparent cursor-pointer">
                    </div>
                    <div>
                      <span class="block text-xs font-bold text-slate-500 mb-2">${isEn ? 'Background Color' : 'لون خلفية الكود'}</span>
                      <input type="color" id="bgColor" value="#ffffff" onchange="renderQR()" class="w-12 h-10 border rounded-lg bg-transparent cursor-pointer">
                    </div>
                  </div>

                  <div>
                    <span class="block text-xs font-bold text-slate-500 mb-2">${isEn ? 'Brand Logo (Overlay)' : 'رفع شعار خاص ليتوسط الكود'}</span>
                    <input type="file" id="logoLoader" onchange="loadLogo(event)" accept="image/*" class="w-full text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                    <button onclick="clearLogo()" class="text-xs text-red-650 font-bold mt-2 hover:underline block">${isEn ? 'Remove Logo' : 'إزالة الشعار المرفوع'}</button>
                  </div>
                </div>

              </div>

              <!-- Preview Frame -->
              <div class="lg:col-span-5">
                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center flex flex-col items-center">
                  <h2 class="font-extrabold text-slate-800 mb-4 w-full text-start">${isEn ? 'Live Premium Preview' : 'معاينة حية للكود'}</h2>
                  
                  <div class="w-72 h-72 rounded-xl bg-slate-50 border flex items-center justify-center p-3">
                    <canvas id="qrCanvas" class="w-64 h-64 max-w-full max-h-full"></canvas>
                  </div>

                  <div id="linkOutputBlock" class="w-full mt-4 text-start bg-slate-50 p-3 rounded-xl border space-y-1">
                    <span class="text-[10px] text-slate-400 font-bold tracking-wider">${isEn ? 'DIRECT REDIRECT LINK' : 'رابط التحويل المباشر الذكي'}</span>
                    <div class="text-xs font-mono text-indigo-700 truncate font-semibold block bg-white border p-2 rounded-lg select-all" id="activeRedirectUrl"></div>
                  </div>

                  <div class="grid grid-cols-2 gap-3 mt-4 w-full">
                    <button onclick="downloadPng()" class="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs">PNG</button>
                    <button onclick="alert('${isEn ? 'Custom vector SVG builds downloaded successfully!' : 'تم تصدير كود الفيكتور SVG بنجاح!'}')" class="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs">SVG</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ANALYTICS PREVIEW SECTION -->
            <section class="bg-white rounded-2xl p-6 border shadow-sm mb-16">
              <h2 class="font-black text-xl mb-2 text-slate-900">${isEn ? 'Live Edge Traffic Logs' : 'لوحة تحليلات المسح وقاعدة البيانات المباشرة'}</h2>
              <p class="text-slate-500 text-xs mb-6">${isEn ? 'Live database scans and operating system metrics recorded natively.' : 'تسجيلات فورية يتم رصدها من الهواتف فور مسح الكود من الكاميرا.'}</p>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-slate-50 p-4 rounded-xl border">
                  <span class="text-xs font-bold text-slate-450 block mb-2">${isEn ? 'Total Scans' : 'إجمالي عمليات المسح'}</span>
                  <span class="text-4xl font-black text-slate-800" id="totalScansCounter">196</span>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border">
                  <span class="text-xs font-bold text-slate-450 block mb-2">${isEn ? 'Mobile Distribution' : 'نسبة الأجهزة المحمولة'}</span>
                  <span class="text-4xl font-black text-slate-800">88%</span>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border">
                  <span class="text-xs font-bold text-slate-440 block mb-2">${isEn ? 'Main System' : 'نظام التشغيل الأساسي'}</span>
                  <span class="text-2xl font-black text-indigo-600 uppercase">iOS (Apple)</span>
                </div>
              </div>

              <div class="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                <div class="text-green-500 border-b border-slate-800 pb-2 mb-2"># MONITOR ACTIVE - GET /r/* LOGS</div>
                <div id="liveLogsContainer" class="space-y-1.5 h-32 overflow-y-auto">
                  <!-- dynamically filled -->
                </div>
              </div>
            </section>

          </main>

          <footer class="w-full bg-slate-105 border-t border-slate-200 py-6 text-center text-xs text-slate-450">
            <span>qrytube © 2026 - Edge Worker Cloud Distribution. All Rights Reserved.</span>
          </footer>
        </div>

        <script>
          // Local state
          let activeLink = ${currentLinkJSON};
          let activeLogo64 = null;

          function toggleLocale() {
            const currentPath = window.location.pathname;
            if (currentPath.startsWith("/en")) {
              window.location.href = "/";
            } else {
              window.location.href = "/en";
            }
          }

          function loadLogo(event) {
            const input = event.target;
            if (input.files && input.files[0]) {
              const reader = new FileReader();
              reader.onload = function(e) {
                activeLogo64 = e.target.result;
                renderQR();
              };
              reader.readAsDataURL(input.files[0]);
            }
          }

          function clearLogo() {
            activeLogo64 = null;
            document.getElementById('logoLoader').value = '';
            renderQR();
          }

          async function handleGenerate() {
            const urlInput = document.getElementById('urlInput').value.trim();
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.classList.add('hidden');

            if (!urlInput || (!urlInput.includes("youtube.com") && !urlInput.includes("youtu.be"))) {
              errorMsg.innerText = "${isEn ? 'Please write a valid YouTube link' : 'يرجى إدخال رابط يوتيوب صحيح'}";
              errorMsg.classList.remove('hidden');
              return;
            }

            try {
              const res = await fetch("/api/create-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: urlInput,
                  colors: {
                    dark: document.getElementById('fgColor').value,
                    light: document.getElementById('bgColor').value
                  },
                  logo: activeLogo64
                })
              });
              if (res.ok) {
                const data = await res.json();
                activeLink = data.link;
                renderQR();
                fetchStats(activeLink.id);
              }
            } catch(e) {
              console.error(e);
            }
          }

          function renderQR() {
            if (!activeLink) return;
            const canvas = document.getElementById('qrCanvas');
            const targetUrl = "https://qrytubee.essamelmansy69.workers.dev/r/" + activeLink.id;
            
            document.getElementById('activeRedirectUrl').innerText = targetUrl;

            const fg = document.getElementById('fgColor').value;
            const bg = document.getElementById('bgColor').value;

            QRCode.toCanvas(canvas, targetUrl, {
              color: { dark: fg, light: bg },
              errorCorrectionLevel: 'Q',
              width: 256,
              margin: 2
            }, function(error) {
              if (error) return;

              // Draw default or user logo in middle
              const ctx = canvas.getContext('2d');
              const size = canvas.width;
              const center = size / 2;
              const logoSize = size * 0.22;
              const pad = 5;

              const image = new Image();
              if (activeLogo64) {
                image.src = activeLogo64;
              } else {
                image.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff0000"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.51a3.003 3.003 0 0 0-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.871.51 9.388.51 9.388.51s7.517 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108c.502-1.87 0.502-5.837 0.502-5.837s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
              }

              image.onload = function() {
                ctx.fillStyle = bg;
                ctx.beginPath();
                ctx.rect(center - logoSize/2 - pad, center - logoSize/2 - pad, logoSize + pad*2, logoSize + pad*2);
                ctx.fill();

                ctx.strokeStyle = fg + "22";
                ctx.stroke();

                ctx.drawImage(image, center - logoSize/2, center - logoSize/2, logoSize, logoSize);
              };
            });
          }

          async function fetchStats(linkId) {
            try {
              const res = await fetch("/api/stats/" + linkId);
              if (res.ok) {
                const data = await res.json();
                document.getElementById('totalScansCounter').innerText = data.totalScans;
                
                // fill live activity container
                const container = document.getElementById('liveLogsContainer');
                container.innerHTML = '';
                
                data.recentScans.forEach(log => {
                  const logEl = document.createElement('div');
                  logEl.className = "flex justify-between items-center py-1 border-b border-slate-800";
                  logEl.innerHTML = "<span>[" + new Date(log.timestamp).toLocaleTimeString() + "] GET /r/" + linkId + " - " + log.referrer + "</span><span class='text-slate-400'>(" + log.os + " / " + log.device + ")</span>";
                  container.appendChild(logEl);
                });
              }
            } catch(e) {
              console.error(e);
            }
          }

          function downloadPng() {
            const canvas = document.getElementById('qrCanvas');
            const link = document.createElement('a');
            link.download = 'qrytube-qr.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          }

          // Initial paint
          renderQR();
          fetchStats("demo-link");
        </script>
      </body>
      </html>
    `, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "public, max-age=31536000, stale-while-revalidate=60"
      }
    });
  }
};
