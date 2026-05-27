"use client";

import { useState } from "react";
import { Card, Field, Area, Btn, Table, SectionHeader } from "../components/ui";
import { Item, BannerForm } from "../types";

export function BannersSection({
  banners,
  bannerForm,
  setBannerForm,
  onSave,
  onUpload,
  uploading,
}: {
  banners: Item[];
  bannerForm: BannerForm;
  setBannerForm: React.Dispatch<React.SetStateAction<BannerForm>>;
  onSave: () => Promise<void>;
  onUpload: (file: File, folder: "movies" | "banners") => Promise<string>;
  uploading: boolean;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="🖼️ Quản lý Banner"
        subtitle={`${banners.length} banner trong hệ thống`}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Form */}
        <Card title="Tạo Banner mới" className="xl:col-span-2">
          <div className="space-y-3">
            <Field
              value={bannerForm.eyebrow}
              onChange={(e) => setBannerForm((p) => ({ ...p, eyebrow: e.target.value }))}
              placeholder='Eyebrow (vd: "Phim hot tuần này")'
            />
            <Field
              value={bannerForm.title}
              onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Tiêu đề chính của banner"
            />
            <Area
              value={bannerForm.subtitle}
              onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))}
              placeholder="Mô tả / subtitle banner..."
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Màu accent</p>
                <div className="flex gap-2">
                  <Field
                    type="color"
                    value={bannerForm.accentColor}
                    onChange={(e) => setBannerForm((p) => ({ ...p, accentColor: e.target.value }))}
                    style={{ width: 48, padding: 2, height: 42 }}
                  />
                  <Field
                    value={bannerForm.accentColor}
                    onChange={(e) => setBannerForm((p) => ({ ...p, accentColor: e.target.value }))}
                    placeholder="#e63946"
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Thứ tự</p>
                <Field
                  type="number"
                  value={bannerForm.sortOrder}
                  onChange={(e) => setBannerForm((p) => ({ ...p, sortOrder: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Image URL</p>
              <Field
                value={bannerForm.imageUrl}
                onChange={(e) => setBannerForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Upload ảnh banner</p>
              <Field
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await onUpload(file, "banners");
                  setBannerForm((p) => ({ ...p, imageUrl: url }));
                }}
              />
            </div>

            {uploading && (
              <p className="text-xs" style={{ color: "var(--accent-gold)" }}>⏳ Đang upload ảnh...</p>
            )}

            {/* Preview */}
            {(bannerForm.title || bannerForm.imageUrl) && (
              <div
                className="relative overflow-hidden rounded-xl p-4"
                style={{
                  background: bannerForm.imageUrl
                    ? `linear-gradient(to right, ${bannerForm.accentColor}CC, ${bannerForm.accentColor}44), url(${bannerForm.imageUrl}) center/cover`
                    : `linear-gradient(135deg, ${bannerForm.accentColor}44, transparent)`,
                  border: "1px solid var(--border-light)",
                  minHeight: 100,
                }}
              >
                {bannerForm.eyebrow && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {bannerForm.eyebrow}
                  </p>
                )}
                {bannerForm.title && (
                  <p className="mt-1 font-bold text-white">{bannerForm.title}</p>
                )}
                {bannerForm.subtitle && (
                  <p className="mt-0.5 text-xs text-white/70">{bannerForm.subtitle}</p>
                )}
              </div>
            )}

            <Btn
              onClick={async () => {
                setSaving(true);
                await onSave();
                setSaving(false);
              }}
              disabled={saving || !bannerForm.title}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? "Đang lưu..." : "🖼️ Lưu Banner"}
            </Btn>
          </div>
        </Card>

        {/* List */}
        <div className="xl:col-span-3">
          <Card title={`Danh sách Banner (${banners.length})`}>
            {banners.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-3">🖼️</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Chưa có banner nào</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-auto">
                {banners.map((banner, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-xl"
                    style={{
                      background: banner.image_url
                        ? `linear-gradient(to right, ${banner.accent_color || "#e63946"}CC, rgba(0,0,0,0.7)), url(${String(banner.image_url)}) center/cover`
                        : `linear-gradient(135deg, rgba(230,57,70,0.2), transparent)`,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {!!banner.eyebrow && (
                            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                              {String(banner.eyebrow)}
                            </p>
                          )}
                          <p className="mt-0.5 font-bold text-white">{String(banner.title ?? "—")}</p>
                          {!!banner.subtitle && (
                            <p className="mt-0.5 text-xs text-white/60 line-clamp-2">
                              {String(banner.subtitle)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                            style={{ background: "rgba(0,0,0,0.4)" }}
                          >
                            #{String(banner.sort_order ?? 0)}
                          </span>
                          {banner.image_url ? (
                            <span className="text-xs text-white/50">✓ Có ảnh</span>
                          ) : (
                            <span className="text-xs text-white/30">Chưa có ảnh</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
