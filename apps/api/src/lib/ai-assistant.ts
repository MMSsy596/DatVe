import { getCatalogData } from "./catalog";

type AssistantContext = {
  now?: string;
  favoriteMovieIds?: number[];
  watchlistMovieIds?: number[];
  selectedMovieId?: number | null;
};

type AssistantSuggestion = {
  movieId: number;
  showtimeId: number;
  comboId: number | null;
  ticketCount: number;
  movieTitle: string;
  cinemaName: string;
  startTime: string;
  estimatedTotal: number;
  reason: string;
  comboName?: string | null;
};

const genreKeywords: Array<{ key: string; aliases: string[] }> = [
  { key: "hanh dong", aliases: ["hanh dong", "action"] },
  { key: "kinh di", aliases: ["kinh di", "horror"] },
  { key: "tinh cam", aliases: ["tinh cam", "romance"] },
  { key: "vien tuong", aliases: ["vien tuong", "sci-fi", "khoa hoc"] },
  { key: "hai", aliases: ["hai", "comedy"] },
  { key: "hoat hinh", aliases: ["hoat hinh", "animation"] },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parsePreferredHour(message: string) {
  const normalized = normalizeText(message);
  const hourMatch = normalized.match(/\b(\d{1,2})(?:[:hg\.](\d{1,2}))?\b/);
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
      return hour;
    }
  }
  if (normalized.includes("toi")) return 20;
  if (normalized.includes("chieu")) return 16;
  if (normalized.includes("sang")) return 9;
  return null;
}

function parseBudget(message: string) {
  const normalized = normalizeText(message);
  const kMatch = normalized.match(/(\d{2,4})\s*k\b/);
  if (kMatch) return Number(kMatch[1]) * 1000;
  const millionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(trieu|tr)\b/);
  if (millionMatch) return Math.round(Number(millionMatch[1]) * 1_000_000);
  const plainMatch = normalized.match(/\b(\d{5,8})\b/);
  if (plainMatch) return Number(plainMatch[1]);
  return null;
}

function parsePeopleCount(message: string) {
  const normalized = normalizeText(message);
  const match = normalized.match(/(\d{1,2})\s*(nguoi|ve)\b/);
  if (!match) return 1;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, 8);
}

function parseGenrePreference(message: string) {
  const normalized = normalizeText(message);
  for (const item of genreKeywords) {
    if (item.aliases.some((alias) => normalized.includes(alias))) {
      return item.key;
    }
  }
  return null;
}

function needsCombo(message: string) {
  const normalized = normalizeText(message);
  return ["combo", "bap", "nuoc", "do an", "an uong"].some((keyword) => normalized.includes(keyword));
}

function extractHourFromIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getHours();
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function getGeminiModelFallbacks() {
  const raw = process.env.GEMINI_MODEL_LIST?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ];
}

async function maybeRewriteByGemini(input: {
  message: string;
  baseAnswer: string;
  suggestions: AssistantSuggestion[];
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const modelFallbacks = getGeminiModelFallbacks();
  if (modelFallbacks.length === 0) return null;

  const suggestionText =
    input.suggestions.length > 0
      ? input.suggestions
          .map(
            (item, index) =>
              `${index + 1}. ${item.movieTitle} - ${item.cinemaName} lúc ${new Date(item.startTime).toLocaleString("vi-VN")} - tạm tính ${formatCurrency(item.estimatedTotal)}${item.comboName ? ` - combo ${item.comboName}` : ""}.`
          )
          .join("\n")
      : "Chưa có gợi ý khả thi.";

  const prompt = [
    "Bạn là trợ lý đặt vé phim cho ứng dụng Đặt Vé.",
    "Viết lại câu trả lời ngắn gọn, tự nhiên, tiếng Việt có dấu.",
    "Không được bịa dữ liệu ngoài danh sách gợi ý.",
    `Câu hỏi người dùng: ${input.message}`,
    `Câu trả lời nền: ${input.baseAnswer}`,
    `Danh sách gợi ý: ${suggestionText}`,
  ].join("\n");

  for (const model of modelFallbacks) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 320,
            },
          }),
        }
      );

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      const text = String(
        json?.candidates?.[0]?.content?.parts
          ?.map((part: any) => String(part?.text ?? ""))
          .join(" ") ?? ""
      ).trim();

      if (text) {
        return { text, model };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function buildRuleAnswer(suggestions: AssistantSuggestion[], peopleCount: number, budget: number | null, genre: string | null) {
  if (suggestions.length === 0) {
    return "Mình chưa thấy suất chiếu phù hợp ngay lúc này. Bạn thử nới khung giờ hoặc tăng ngân sách để mình gợi ý lại chính xác hơn nhé.";
  }

  const top = suggestions[0];
  const lines = [
    `Mình đã lọc theo dữ liệu hiện tại và thấy phương án tốt nhất là ${top.movieTitle} lúc ${new Date(top.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} tại ${top.cinemaName}.`,
    `Tạm tính cho ${peopleCount} vé là khoảng ${formatCurrency(top.estimatedTotal)}${top.comboName ? ` (đã gồm ${top.comboName})` : ""}.`,
  ];
  if (budget) {
    lines.push(`Mức ngân sách bạn đưa ra: ${formatCurrency(budget)}.`);
  }
  if (genre) {
    lines.push(`Mình ưu tiên theo gu thể loại: ${genre}.`);
  }
  lines.push("Bạn có thể bấm trực tiếp vào từng gợi ý bên dưới để đi tới màn chọn ghế.");
  return lines.join(" ");
}

export async function generateAssistantReply(input: { message: string; context?: AssistantContext | null }) {
  const catalog = await getCatalogData();
  const message = String(input.message ?? "").trim();
  const context = input.context ?? {};
  const now = context.now ? new Date(context.now) : new Date();
  const normalizedNow = Number.isNaN(now.getTime()) ? new Date() : now;

  const preferredHour = parsePreferredHour(message);
  const budget = parseBudget(message);
  const peopleCount = parsePeopleCount(message);
  const genrePreference = parseGenrePreference(message);
  const wantsCombo = needsCombo(message);
  const favoriteSet = new Set((context.favoriteMovieIds ?? []).map((item) => Number(item)));
  const watchlistSet = new Set((context.watchlistMovieIds ?? []).map((item) => Number(item)));

  const moviesById = new Map(catalog.featuredMovies.map((movie) => [movie.id, movie]));
  const combos = [...catalog.foods].sort((left, right) => Number(left.price) - Number(right.price));
  const candidateShowtimes = catalog.showtimes
    .filter((showtime) => {
      const startTime = new Date(showtime.startTime).getTime();
      return Number.isFinite(startTime) && startTime >= normalizedNow.getTime() - 60 * 60 * 1000;
    })
    .map((showtime) => {
      const movie = moviesById.get(showtime.movieId);
      if (!movie) return null;

      const seatScore = Number(showtime.availableSeats ?? 0) / Math.max(Number(showtime.totalSeats ?? 1), 1);
      const hour = extractHourFromIso(String(showtime.startTime));
      const hourDelta = preferredHour === null || hour === null ? 0 : Math.abs(hour - preferredHour);
      const genreText = normalizeText(String(movie.genre));
      const matchedGenre = genrePreference ? genreText.includes(genrePreference) : false;
      const ticketCost = Math.max(Number(showtime.basePrice), 0) * peopleCount;
      const budgetPenalty = budget && ticketCost > budget ? -38 : 0;
      const budgetBonus = budget && ticketCost <= budget ? 20 : 0;
      const favBonus = favoriteSet.has(movie.id) ? 16 : 0;
      const watchBonus = watchlistSet.has(movie.id) ? 8 : 0;
      const selectedMovieBonus = context.selectedMovieId === movie.id ? 6 : 0;
      const statusBonus = movie.status === "now_showing" ? 10 : 2;
      const ratingScore = Number(movie.rating ?? 0) * 6;
      const availabilityScore = seatScore * 28;
      const hourScore = preferredHour === null ? 0 : Math.max(0, 22 - hourDelta * 3);
      const genreScore = matchedGenre ? 30 : 0;
      const baseScore = ratingScore + availabilityScore + hourScore + genreScore + budgetBonus + budgetPenalty + favBonus + watchBonus + selectedMovieBonus + statusBonus;

      let selectedCombo: (typeof combos)[number] | null = null;
      if (wantsCombo || budget) {
        const comboBudgetLeft = budget ? budget - ticketCost : Number.MAX_SAFE_INTEGER;
        selectedCombo = combos.find((combo) => Number(combo.price) <= comboBudgetLeft) ?? null;
      }
      const comboPrice = selectedCombo ? Number(selectedCombo.price) : 0;
      const estimatedTotal = ticketCost + comboPrice;
      const reasonParts = [
        matchedGenre ? "đúng gu bạn thích" : "suất chiếu đang khả dụng",
        preferredHour !== null ? "khá sát giờ bạn rảnh" : "khung giờ đẹp",
        seatScore > 0.45 ? "còn nhiều ghế tốt" : "ghế đang giữ nhanh nên nên chốt sớm",
      ];

      return {
        score: baseScore,
        suggestion: {
          movieId: movie.id,
          showtimeId: showtime.id,
          comboId: selectedCombo?.id ?? null,
          ticketCount: peopleCount,
          movieTitle: movie.title,
          cinemaName: showtime.cinemaName,
          startTime: String(showtime.startTime),
          estimatedTotal,
          reason: reasonParts.join(", "),
          comboName: selectedCombo?.name ?? null,
        } satisfies AssistantSuggestion,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => right.score - left.score);

  const suggestions: AssistantSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of candidateShowtimes) {
    const key = `${item.suggestion.movieId}:${item.suggestion.showtimeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(item.suggestion);
    if (suggestions.length >= 3) break;
  }

  const baseAnswer = buildRuleAnswer(suggestions, peopleCount, budget, genrePreference);
  const llmResult = await maybeRewriteByGemini({ message, baseAnswer, suggestions }).catch(() => null);

  return {
    answer: llmResult?.text ?? baseAnswer,
    suggestions,
    source: llmResult ? ("llm" as const) : ("rule-based" as const),
    meta: {
      preferredHour,
      peopleCount,
      budget,
      genrePreference,
      wantsCombo,
      llmProvider: llmResult ? "gemini" : null,
      llmModel: llmResult?.model ?? null,
    },
  };
}
