"use client";

import { useState } from "react";
import {
  Card,
  Field,
  Area,
  Sel,
  Btn,
  Badge,
  Table,
  SectionHeader,
  Divider,
} from "../components/ui";
import { Item, MovieForm } from "../types";

export function MoviesSection({
  movies,
  movieForm,
  setMovieForm,
  onSave,
  onUpload,
  uploading,
}: {
  movies: Item[];
  movieForm: MovieForm;
  setMovieForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  onSave: () => Promise<void>;
  onUpload: (file: File, folder: "movies" | "banners") => Promise<string>;
  uploading: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = movies.filter((m) =>
    String(m.title).toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => {
    if (s === "NOW_SHOWING") return "green" as const;
    if (s === "COMING_SOON") return "blue" as const;
    if (s === "TRENDING") return "yellow" as const;
    return "default" as const;
  };

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="🎥 Quản lý Phim"
        subtitle={`${movies.length} phim trong hệ thống`}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Form thêm phim */}
        <Card title="Thêm phim mới" className="xl:col-span-2">
          <div className="space-y-3">
            <Field
              value={movieForm.slug}
              onChange={(e) => setMovieForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="slug (vd: avengers-2025)"
            />
            <Field
              value={movieForm.title}
              onChange={(e) => setMovieForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Tên phim"
            />
            <Field
              value={movieForm.genre}
              onChange={(e) => setMovieForm((p) => ({ ...p, genre: e.target.value }))}
              placeholder="Thể loại (vd: Hành động, Hài hước)"
            />

            <div className="grid grid-cols-3 gap-2">
              <Field
                value={movieForm.durationMinutes}
                onChange={(e) => setMovieForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                placeholder="Phút"
                type="number"
              />
              <Sel
                value={movieForm.status}
                onChange={(e) => setMovieForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="NOW_SHOWING">Đang chiếu</option>
                <option value="COMING_SOON">Sắp chiếu</option>
                <option value="TRENDING">Trending</option>
              </Sel>
              <Field
                value={movieForm.rating}
                onChange={(e) => setMovieForm((p) => ({ ...p, rating: e.target.value }))}
                placeholder="Rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
              />
            </div>

            <Divider />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Poster & Banner
            </p>
            <Field
              value={movieForm.posterUrl}
              onChange={(e) => setMovieForm((p) => ({ ...p, posterUrl: e.target.value }))}
              placeholder="Poster URL"
            />
            <Field
              value={movieForm.bannerUrl}
              onChange={(e) => setMovieForm((p) => ({ ...p, bannerUrl: e.target.value }))}
              placeholder="Banner URL"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-muted)" }}>Upload Poster</p>
                <Field
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await onUpload(file, "movies");
                    setMovieForm((p) => ({ ...p, posterUrl: url }));
                  }}
                />
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-muted)" }}>Upload Banner</p>
                <Field
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await onUpload(file, "movies");
                    setMovieForm((p) => ({ ...p, bannerUrl: url }));
                  }}
                />
              </div>
            </div>

            {uploading && (
              <p className="text-xs" style={{ color: "var(--accent-gold)" }}>
                ⏳ Đang upload ảnh...
              </p>
            )}

            <Btn
              onClick={async () => {
                setSaving(true);
                await onSave();
                setSaving(false);
              }}
              disabled={saving || !movieForm.title}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? "Đang lưu..." : "💾 Lưu phim"}
            </Btn>
          </div>
        </Card>

        {/* Danh sách phim */}
        <div className="xl:col-span-3">
          <Card title={`Danh sách (${filtered.length})`} action={
            <Field
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Tìm phim..."
              style={{ width: 200 }}
            />
          }>
            <Table
              headers={["Phim", "Thể loại", "Thời lượng", "Trạng thái", "Rating"]}
              emptyText="Chưa có phim nào"
              rows={filtered.slice(0, 20).map((movie) => [
                <div key="title">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {String(movie.title)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    /{String(movie.slug)}
                  </p>
                </div>,
                <span key="genre" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {String(movie.genre ?? "—")}
                </span>,
                <span key="duration" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {movie.duration_minutes ? `${movie.duration_minutes} phút` : "—"}
                </span>,
                <Badge key="status" color={statusColor(String(movie.status))}>
                  {String(movie.status)}
                </Badge>,
                <span key="rating" className="text-sm font-semibold" style={{ color: "var(--accent-gold)" }}>
                  ⭐ {String(movie.rating ?? "—")}
                </span>,
              ])}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
