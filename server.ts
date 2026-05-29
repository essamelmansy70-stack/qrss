import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface LinkColors {
  dark: string;
  light: string;
}

interface LinkData {
  id: string;
  originalUrl: string;
  deepUrl: string;
  type: 'channel' | 'video' | 'search' | 'other';
  label: string;
  colors: LinkColors;
  logo?: string;
  createdAt: string;
  scansCount: number;
}

interface ScanLog {
  timestamp: string;
  device: 'mobile' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'mac' | 'other';
  browser: string;
  referrer: string;
}

interface DBStructure {
  links: Record<string, LinkData>;
  scans: Record<string, ScanLog[]>;
}

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "database.json");

// Helper to initialize or load the database
function loadDatabase(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data) as DBStructure;
    }
  } catch (error) {
    console.error("Failed to load database. Initializing new storage.", error);
  }

  // Create default mock structure
  const devDemoId = "demo-link";
  const now = new Date();
  
  const mockScans: ScanLog[] = [];
  // Gen 120 scans spread over the last 14 days
  const osOptions: ('ios' | 'android' | 'windows' | 'mac' | 'other')[] = ['ios', 'android', 'mac', 'windows'];
  const devOptions: ('mobile' | 'desktop')[] = ['mobile', 'desktop'];
  
  for (let i = 0; i < 184; i++) {
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

  // Sort scans by date ascending
  mockScans.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const initialDB: DBStructure = {
    links: {
      [devDemoId]: {
        id: devDemoId,
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        deepUrl: "youtube://www.youtube.com/watch?v=dQw4w9WgXcQ",
        type: "video",
        label: "Rick Astley - Never Gonna Give You Up",
        colors: { dark: "#ff0000", light: "#ffffff" },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        scansCount: mockScans.length
      }
    },
    scans: {
      [devDemoId]: mockScans
    }
  };

  saveDatabase(initialDB);
  return initialDB;
}

function saveDatabase(db: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file", err);
  }
}

const db = loadDatabase();

// Parser utility for user-agent
function parseUserAgent(uaString: string = ""): {
  device: 'mobile' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'mac' | 'other';
  browser: string;
} {
  const ua = uaString.toLowerCase();
  let os: 'ios' | 'android' | 'windows' | 'mac' | 'other' = 'other';
  let device: 'mobile' | 'desktop' = 'desktop';
  let browser = 'Chrome';

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

  // Basic browser sniffing
  if (/firefox/.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/.test(ua) && !/chrome/.test(ua)) {
    browser = 'Safari';
  } else if (/edge/.test(ua) || /edg/.test(ua)) {
    browser = 'Edge';
  } else if (/instagram/.test(ua)) {
    browser = 'Instagram App';
  } else if (/fb_iab|fbav/.test(ua)) {
    browser = 'Facebook App';
  } else {
    browser = 'Chrome/Other';
  }

  return { device, os, browser };
}

// Youtube Link Parser
function parseYoutubeUrl(url: string): {
  type: 'channel' | 'video' | 'search' | 'other';
  id: string;
  deepUrl: string;
  label: string;
} {
  try {
    const trimmed = url.trim();
    // Video Link Parsing
    const videoRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const videoMatch = trimmed.match(videoRegex);
    if (videoMatch) {
      const videoId = videoMatch[1];
      return {
        type: 'video',
        id: videoId,
        deepUrl: `youtube://www.youtube.com/watch?v=${videoId}`,
        label: `Video ID: ${videoId}`
      };
    }

    // Handles or Custom Channels
    const handleRegex = /youtube\.com\/(@[a-zA-Z0-9_\-\.]+)/i;
    const handleMatch = trimmed.match(handleRegex);
    if (handleMatch) {
      const handle = handleMatch[1];
      return {
        type: 'channel',
        id: handle,
        deepUrl: `youtube://www.youtube.com/${handle}`,
        label: `${handle}`
      };
    }

    // Channel ID URL (e.g., youtube.com/channel/UC...)
    const channelIdRegex = /youtube\.com\/channel\/([a-zA-Z0-9_\-]+)/i;
    const channelIdMatch = trimmed.match(channelIdRegex);
    if (channelIdMatch) {
      const cid = channelIdMatch[1];
      return {
        type: 'channel',
        id: cid,
        deepUrl: `youtube://www.youtube.com/channel/${cid}`,
        label: `Channel: ${cid}`
      };
    }

    // User or c (e.g., youtube.com/user/username, youtube.com/c/cname)
    const customChannelRegex = /youtube\.com\/(?:c|user)\/([a-zA-Z0-9_\-\.\u0600-\u06FF]+)/i;
    const customMatch = trimmed.match(customChannelRegex);
    if (customMatch) {
      const customName = customMatch[1];
      return {
        type: 'channel',
        id: customName,
        deepUrl: `youtube://www.youtube.com/c/${customName}`,
        label: `YouTube Channel: ${customName}`
      };
    }

    // fallback target
    return {
      type: 'other',
      id: '',
      deepUrl: trimmed,
      label: 'YouTube Link'
    };
  } catch (e) {
    return {
      type: 'other',
      id: '',
      deepUrl: url,
      label: 'Custom Link'
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API - CREATE NEW LINK
  app.post("/api/create-link", (req, res) => {
    const { url, colors, logo } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const parsed = parseYoutubeUrl(url);
    const shortId = "yt-" + Math.random().toString(36).substr(2, 6);

    const newLink: LinkData = {
      id: shortId,
      originalUrl: url,
      deepUrl: parsed.deepUrl,
      type: parsed.type,
      label: parsed.label,
      colors: colors || { dark: "#ff0000", light: "#ffffff" },
      logo: logo || undefined,
      createdAt: new Date().toISOString(),
      scansCount: 0
    };

    db.links[shortId] = newLink;
    db.scans[shortId] = [];
    saveDatabase(db);

    res.json({
      success: true,
      link: newLink,
      redirectUrl: `https://qrytubee.essamelmansy69.workers.dev/r/${shortId}`
    });
  });

  // API - GET STATS
  app.get("/api/stats/:shortId", (req, res) => {
    const { shortId } = req.params;
    const link = db.links[shortId];
    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    const scansList = db.scans[shortId] || [];

    // Calculate aggregated metrics
    const devices = { mobile: 0, desktop: 0 };
    const os = { ios: 0, android: 0, mac: 0, windows: 0, other: 0 };
    
    // Group scans over last 10 days
    const scansByDate: Record<string, number> = {};
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      scansByDate[dateString] = 0;
    }

    scansList.forEach(scan => {
      // aggregate device
      if (scan.device === 'mobile') devices.mobile++;
      else devices.desktop++;

      // aggregate OS
      if (scan.os in os) {
        os[scan.os]++;
      } else {
        os.other++;
      }

      // over time stats (group by day)
      const day = scan.timestamp.split("T")[0];
      if (day in scansByDate) {
        scansByDate[day]++;
      }
    });

    const scansOverTime = Object.keys(scansByDate).map(date => ({
      date,
      count: scansByDate[date]
    }));

    // Most recent 15 scans
    const recentScans = [...scansList]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    res.json({
      linkId: shortId,
      totalScans: scansList.length,
      devices,
      os,
      scansOverTime,
      recentScans
    });
  });

  // REDIRECT ENDPOINT (The core deep linker router!)
  app.get("/r/:shortId", (req, res) => {
    const { shortId } = req.params;
    const link = db.links[shortId];
    
    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>الرابط غير موجود | 404</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; background: #fafafa; }
            h1 { color: #dc2626; }
            p { color: #4b5563; font-size: 18px; }
            a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>عذراً، هذا الرابط غير صالح أو انتهت صلاحيته!</h1>
          <p>The requested QR direct link does not exist on qrytube.</p>
          <a href="/">العودة للرئيسية / Home</a>
        </body>
        </html>
      `);
    }

    // Parse analytics parameters
    const userAgent = req.headers["user-agent"] || "";
    const parsedUa = parseUserAgent(userAgent);
    const logEntry: ScanLog = {
      timestamp: new Date().toISOString(),
      device: parsedUa.device,
      os: parsedUa.os,
      browser: parsedUa.browser,
      referrer: req.headers["referrer"] as string || req.headers["referer"] as string || "Camera App Scan"
    };

    // Store log in database
    if (!db.scans[shortId]) db.scans[shortId] = [];
    db.scans[shortId].push(logEntry);
    
    // Increment total click counter
    link.scansCount++;
    saveDatabase(db);

    const isMobile = parsedUa.device === "mobile" || parsedUa.os === "ios" || parsedUa.os === "android";
    const appDeepLinkUrl = link.deepUrl;
    const webFallBackUrl = link.originalUrl;

    // Fast-redirect page matching user agent language for iOS and Android
    // This allows immediate launching of the device's YouTube App.
    res.send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>جاري فتح يوتيوب تلقائياً... | Direct Open</title>
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
          
          // Try to redirect immediately on load
          window.location.href = deepLink;
          
          // Fallback redirect after a short timeout in case the application didn't launch automatically
          setTimeout(function() {
            window.location.href = fallback;
          }, 1800);
        </script>
      </body>
      </html>
    `);
  });

  // SEO HTML Injection on Page Request
  const seoHandler = async (req: express.Request, res: express.Response, htmlSource: string) => {
    const isEn = req.path.startsWith("/en");
    
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

    // Build perfect rigid SEO tags block
    const seoTags = `
    <title>${title}</title>
    <meta name="google-site-verification" content="aKazOq6saRml-er1E0utMLBBkIjpYR5sLl62yrYbUp8" />
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://qrytubee.essamelmansy69.workers.dev/assets/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <link rel="alternate" hreflang="ar" href="${alternateAr}" />
    <link rel="alternate" hreflang="en" href="${alternateEn}" />
    <link rel="canonical" href="${canonical}" />
    `;

    // Dynamic replacement of body tags
    let replacedHtml = htmlSource
      .replace(/<html[^>]*>/, `<html lang="${lang}" dir="${dir}">`)
      .replace(/<title>[^<]*<\/title>/, seoTags)
      .replace("</head>", `${seoTags}\n</head>`);

    return replacedHtml;
  };

  // Serve static assets and dynamic React page depending on environments
  if (process.env.NODE_ENV !== "production") {
    // DEV MODE with Vite server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);

    // Dynamic html injection in dev
    app.get("*", async (req, res, next) => {
      // Exclude express api and redirect routing paths
      if (req.path.startsWith("/api/") || req.path.startsWith("/r/")) {
        return next();
      }
      try {
        const rawHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const viteHtml = await vite.transformIndexHtml(req.url, rawHtml);
        const seoHtml = await seoHandler(req, res, viteHtml);
        res.status(200).set({ "Content-Type": "text/html" }).send(seoHtml);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });

  } else {
    // PRODUCTION MODE with static build assets serving
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve other normal assets, exclude index.html to serve it dynamically
    app.use(express.static(distPath, { index: false }));

    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/r/")) {
        return next();
      }
      try {
        const buildHtmlPath = path.join(distPath, "index.html");
        if (fs.existsSync(buildHtmlPath)) {
          const rawHtml = fs.readFileSync(buildHtmlPath, "utf-8");
          const seoHtml = await seoHandler(req, res, rawHtml);
          res.status(200)
            .set({ 
              "Content-Type": "text/html",
              "Cache-Control": "public, max-age=31536000, stale-while-revalidate=60"
            })
            .send(seoHtml);
        } else {
          res.status(500).send("Build index.html not found.");
        }
      } catch (err) {
        next(err);
      }
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error occurred" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`QR Deep Linker Server Active on Port ${PORT}`);
  });
}

startServer();
