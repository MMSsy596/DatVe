import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "logs", "ui-check");
await fs.mkdir(outputDir, { recursive: true });

const issues = [];

function addIssue(scope, message) {
  issues.push({ scope, message });
}

async function scanPage(page, scope) {
  const result = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const findings = [];

    if (scrollWidth > viewportWidth + 2) {
      findings.push(`Trang bị tràn ngang: ${scrollWidth}px > ${viewportWidth}px`);
    }

    const visibleOverflow = [];
    const visibleTinyText = [];
    const fixedItems = [];
    const hasHorizontalScrollParent = (node) => {
      let current = node.parentElement;
      while (current && current !== document.body) {
        const currentStyle = window.getComputedStyle(current);
        const scrollsHorizontally =
          ["auto", "scroll"].includes(currentStyle.overflowX) &&
          current.scrollWidth > current.clientWidth + 2;
        if (scrollsHorizontally) return true;
        current = current.parentElement;
      }
      return false;
    };

    for (const element of Array.from(document.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") {
        continue;
      }

      const intersectsViewport =
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < viewportHeight &&
        rect.left < viewportWidth;

      if (!intersectsViewport) continue;

      const isInsideHorizontalScroller =
        Boolean(element.closest('[data-ui-horizontal-scroll="true"]')) ||
        hasHorizontalScrollParent(element);

      if (!isInsideHorizontalScroller && (rect.left < -4 || rect.right > viewportWidth + 4)) {
        visibleOverflow.push({
          tag: element.tagName.toLowerCase(),
          text: String(element.textContent ?? "").trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }

      const fontSize = Number.parseFloat(style.fontSize);
      if (fontSize > 0 && fontSize < 9 && String(element.textContent ?? "").trim().length > 0) {
        visibleTinyText.push({
          tag: element.tagName.toLowerCase(),
          text: String(element.textContent ?? "").trim().slice(0, 80),
          fontSize,
        });
      }

      if (style.position === "fixed" || style.position === "absolute") {
        const area = rect.width * rect.height;
        const text = String(element.textContent ?? "").trim();
        if (text && area > viewportWidth * viewportHeight * 0.55) {
          fixedItems.push({
            tag: element.tagName.toLowerCase(),
            text: text.slice(0, 80),
            area: Math.round(area),
          });
        }
      }
    }

    if (visibleOverflow.length) {
      findings.push(`Có ${visibleOverflow.length} phần tử đang tràn khỏi viewport: ${JSON.stringify(visibleOverflow.slice(0, 5))}`);
    }
    if (visibleTinyText.length) {
      findings.push(`Có ${visibleTinyText.length} đoạn chữ nhỏ dưới 9px: ${JSON.stringify(visibleTinyText.slice(0, 5))}`);
    }
    if (fixedItems.length) {
      findings.push(`Có overlay/fixed chiếm hơn 55% viewport: ${JSON.stringify(fixedItems.slice(0, 3))}`);
    }

    return findings;
  });

  for (const finding of result) addIssue(scope, finding);
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
}

async function safeGoto(page, url, scope, options = {}) {
  try {
    await page.goto(url, {
      waitUntil: options.waitUntil ?? "networkidle",
      timeout: options.timeout ?? 60000,
    });
    return true;
  } catch (error) {
    addIssue(scope, `Không tải được ${url}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const mockMovies = [
    {
      id: 1,
      slug: "lat-mat-8",
      title: "Lật Mặt 8",
      subtitle: "Trên đường đua doanh thu",
      genre: "Hành động",
      durationMinutes: 118,
      rating: 7.6,
      badge: "Nổi bật",
      status: "NOW_SHOWING",
      posterUrl: null,
      poster_url: null,
      bannerUrl: null,
      banner_url: null,
      highlightColor: "#6d28d9",
      synopsis: "Chuyện gia đình với nhiều tình huống bất ngờ, hài hước và cảm xúc.",
    },
    {
      id: 2,
      slug: "mua-he-cua-chung-ta",
      title: "Mùa Hè Của Chúng Ta",
      subtitle: "Thanh xuân gặp lại",
      genre: "Thanh xuân, Tình cảm",
      durationMinutes: 113,
      rating: 7.8,
      badge: "Theo dõi",
      status: "COMING_SOON",
      posterUrl: null,
      poster_url: null,
      bannerUrl: null,
      banner_url: null,
      highlightColor: "#8a1f3d",
      synopsis: "Nhóm bạn cũ gặp lại sau 10 năm trong chuyến đi cuối hè.",
    },
  ];
  const mockCinemas = [{ id: 1, name: "CGV Landmark 81", city: "TP.HCM", address: "Bình Thạnh" }];
  const mockRooms = [{ id: 1, cinema_id: 1, cinemaId: 1, name: "Phòng 01", format_label: "IMAX", formatLabel: "IMAX" }];
  const mockShowtimes = [
    {
      id: 1,
      movieId: 1,
      movie_id: 1,
      cinemaId: 1,
      cinema_id: 1,
      roomId: 1,
      room_id: 1,
      cinemaName: "CGV Landmark 81",
      cinema_name: "CGV Landmark 81",
      roomName: "Phòng 01",
      room_name: "Phòng 01",
      startTime: "2026-05-01T20:45:00",
      start_time: "2026-05-01T20:45:00",
      formatLabel: "IMAX",
      format_label: "IMAX",
      languageLabel: "Phụ đề",
      language_label: "Phụ đề",
      basePrice: 120000,
      base_price: 120000,
      totalSeats: 64,
      availableSeats: 42,
      seatLayout: [["A1", "A2", "A3", "A4"], ["B1", "B2", "B3", "B4"]],
    },
  ];
  const mockFoods = [{ id: 1, name: "Combo Cặp đôi", description: "2 nước lớn + 1 bắp", price: 159000, unitPrice: 159000 }];
  const mockBanners = [{ id: 1, eyebrow: "Khuyến mại", title: "Tuần lễ điện ảnh", subtitle: "Mua 2 vé tặng 1 combo mini.", accentColor: "#1f2f73", imageUrl: null }];

  await page.route("http://localhost:3001/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const fulfill = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(body),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        },
      });

    if (route.request().method() === "OPTIONS") return fulfill({});
    if (pathname === "/api/health") return fulfill({ status: "ok", database: "mock" });
    if (pathname.endsWith("/auth/login")) return fulfill({ token: "ui-check-token", user: { fullName: "Admin CinePlus", role: "ADMIN" } });
    if (pathname.endsWith("/auth/me")) return fulfill({ user: { id: 1, fullName: "Admin CinePlus", role: "ADMIN", email: "admin@cineplus.local" } });
    if (pathname.endsWith("/dashboard")) {
      return fulfill({ movies: 2, cinemas: 1, showtimes: 1, foods: 1, vouchers: 1, bookings: 8, revenue: 1250000, todayRevenue: 320000, weekRevenue: 980000, pendingReviews: 1, topMovies: [{ title: "Lật Mặt 8", revenue: 650000 }] });
    }
    if (pathname.endsWith("/movies")) return fulfill({ movies: mockMovies });
    if (pathname.endsWith("/cinemas")) return fulfill({ cinemas: mockCinemas });
    if (pathname.endsWith("/rooms")) return fulfill({ rooms: mockRooms });
    if (pathname.endsWith("/showtimes")) return fulfill({ showtimes: mockShowtimes });
    if (pathname.endsWith("/foods")) return fulfill({ foods: mockFoods });
    if (pathname.endsWith("/vouchers")) return fulfill({ vouchers: [{ code: "WELCOME20", title: "Chào mừng", discount_type: "PERCENT", discount_value: 20, is_active: 1 }] });
    if (pathname.endsWith("/operations/payments")) return fulfill({ payments: [] });
    if (pathname.endsWith("/banners")) return fulfill({ banners: mockBanners });
    if (pathname.endsWith("/catalog")) return fulfill({ featuredMovies: mockMovies, showtimes: mockShowtimes, foods: mockFoods, banners: mockBanners, favoriteMovieIds: [], watchlistMovieIds: [], tickets: [], vouchers: [] });
    return fulfill({});
  });

  page.on("console", (message) => {
    const text = message.text();
    const ignoredConsolePatterns = [
      /Listening to push token changes is not yet fully supported on web/,
      /"shadow\*" style props are deprecated/,
      /"textShadow\*" style props are deprecated/,
      /props\.pointerEvents is deprecated/,
      /Animated: `useNativeDriver` is not supported/,
      /Blocked call to navigator\.vibrate/,
      /Failed to load resource/,
    ];
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }
    if (message.type() === "error") {
      addIssue("console", `${message.type()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => addIssue("pageerror", error.message));

  const viewports = [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    if (!(await safeGoto(page, "http://localhost:3000", `admin-login-${viewport.name}`))) continue;
    await capture(page, `admin-login-${viewport.name}`);
    await scanPage(page, `admin-login-${viewport.name}`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await safeGoto(page, "http://localhost:3000", "admin-dashboard-desktop");
  const emailInput = page.getByPlaceholder("Email");
  await emailInput.fill("admin@cineplus.local");
  await page.getByPlaceholder("Mat khau").fill("Admin@123");
  await page.getByRole("button", { name: "Dang nhap" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByText("Dashboard van hanh", { exact: false }).waitFor({ timeout: 15000 }).catch(() => {
    addIssue("admin-dashboard", "Không thấy dashboard sau khi đăng nhập admin.");
  });
  await page.waitForTimeout(1000);
  await capture(page, "admin-dashboard-desktop");
  await scanPage(page, "admin-dashboard-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "admin-dashboard-mobile");
  await scanPage(page, "admin-dashboard-mobile");

  const mobileLoaded = await safeGoto(page, "http://localhost:8081", "mobile-home", { waitUntil: "commit", timeout: 120000 });
  if (mobileLoaded) {
    await page.waitForLoadState("domcontentloaded", { timeout: 120000 }).catch(() => null);
    await page.waitForTimeout(15000);
    await capture(page, "mobile-home");
    await scanPage(page, "mobile-home");
  }

  if (mobileLoaded) {
    for (const label of ["Khám phá", "AI", "Vé", "Tài khoản"]) {
      const target = page.getByText(label, { exact: true }).last();
      if (await target.count()) {
        await target.click({ timeout: 10000 }).catch(() => null);
        await page.waitForTimeout(1500);
        await capture(page, `mobile-tab-${label.replace(/\s+/g, "-").toLowerCase()}`);
        await scanPage(page, `mobile-tab-${label}`);
      } else {
        addIssue("mobile-navigation", `Không tìm thấy tab ${label}`);
      }
    }

    await page.goto("http://localhost:8081", { waitUntil: "commit", timeout: 120000 }).catch(() => null);
    await page.waitForTimeout(3000);
    const detailButton = page.getByText("Xem chi tiết", { exact: true }).first();
    if (await detailButton.count()) {
      await detailButton.click({ timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(1500);
      await capture(page, "mobile-movie-detail");
      await scanPage(page, "mobile-movie-detail");
    }

    const aiFab = page.getByTestId("assistant-floating-button");
    if (await aiFab.count()) {
      await aiFab.click({ timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(1000);
      await capture(page, "mobile-ai-popup");
      await scanPage(page, "mobile-ai-popup");
    } else {
      addIssue("mobile-ai", "Không tìm thấy nút nổi AI");
    }
  }

  await browser.close();

  const report = {
    checkedAt: new Date().toISOString(),
    issueCount: issues.length,
    issues,
  };
  await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2), "utf8");

  if (issues.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

await main();
