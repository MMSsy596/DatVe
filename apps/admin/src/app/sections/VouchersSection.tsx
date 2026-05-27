"use client";

import { useState } from "react";
import { Card, Field, Area, Sel, Btn, Badge, Table, SectionHeader, Divider } from "../components/ui";
import { Item, VoucherForm } from "../types";

function formatDate(str: string) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("vi-VN");
}

export function VouchersSection({
  vouchers,
  voucherForm,
  setVoucherForm,
  onSave,
}: {
  vouchers: Item[];
  voucherForm: VoucherForm;
  setVoucherForm: React.Dispatch<React.SetStateAction<VoucherForm>>;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = vouchers.filter(
    (v) =>
      String(v.code).toLowerCase().includes(search.toLowerCase()) ||
      String(v.title).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="🎟️ Quản lý Voucher"
        subtitle={`${vouchers.length} voucher trong hệ thống`}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Tạo Voucher mới" className="xl:col-span-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Mã voucher</p>
                <Field
                  value={voucherForm.code}
                  onChange={(e) =>
                    setVoucherForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="SALE20"
                />
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Tiêu đề</p>
                <Field
                  value={voucherForm.title}
                  onChange={(e) => setVoucherForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Tên voucher"
                />
              </div>
            </div>

            <Area
              value={voucherForm.description}
              onChange={(e) => setVoucherForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả điều kiện sử dụng..."
            />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Loại giảm</p>
                <Sel
                  value={voucherForm.discountType}
                  onChange={(e) => setVoucherForm((p) => ({ ...p, discountType: e.target.value }))}
                >
                  <option value="PERCENT">% Phần trăm</option>
                  <option value="FIXED">₫ Cố định</option>
                </Sel>
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Giá trị ({voucherForm.discountType === "PERCENT" ? "%" : "₫"})
                </p>
                <Field
                  type="number"
                  value={voucherForm.discountValue}
                  onChange={(e) => setVoucherForm((p) => ({ ...p, discountValue: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Đơn tối thiểu</p>
                <Field
                  type="number"
                  value={voucherForm.minOrderValue}
                  onChange={(e) => setVoucherForm((p) => ({ ...p, minOrderValue: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {voucherForm.discountType === "PERCENT" && (
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Giảm tối đa (₫, để 0 = không giới hạn)</p>
                <Field
                  type="number"
                  value={voucherForm.maxDiscountValue}
                  onChange={(e) =>
                    setVoucherForm((p) => ({ ...p, maxDiscountValue: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Ngày hết hạn</p>
                <Field
                  type="datetime-local"
                  value={voucherForm.expiresAt}
                  onChange={(e) => setVoucherForm((p) => ({ ...p, expiresAt: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>User ID (để trống = public)</p>
                <Field
                  value={voucherForm.assignedUserId}
                  onChange={(e) =>
                    setVoucherForm((p) => ({ ...p, assignedUserId: e.target.value }))
                  }
                  placeholder="Gán cho user"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <input
                type="checkbox"
                id="voucher-active"
                checked={voucherForm.isActive}
                onChange={(e) => setVoucherForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="voucher-active" className="text-sm" style={{ color: "var(--text-primary)" }}>
                Kích hoạt ngay
              </label>
            </div>

            <Btn
              onClick={async () => {
                setSaving(true);
                await onSave();
                setSaving(false);
              }}
              disabled={saving || !voucherForm.code || !voucherForm.title}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? "Đang tạo..." : "🎟️ Tạo Voucher"}
            </Btn>
          </div>
        </Card>

        <div className="xl:col-span-3">
          <Card
            title={`Danh sách Voucher (${filtered.length})`}
            action={
              <Field
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Tìm voucher..."
                style={{ width: 200 }}
              />
            }
          >
            <Table
              headers={["Mã", "Tiêu đề", "Giảm giá", "Điều kiện", "Hết hạn", "Trạng thái"]}
              emptyText="Chưa có voucher nào"
              rows={filtered.slice(0, 20).map((v) => [
                <span key="code" className="font-mono font-bold text-sm" style={{ color: "var(--accent-gold)" }}>
                  {String(v.code)}
                </span>,
                <span key="title" className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {String(v.title)}
                </span>,
                <span key="discount" className="font-semibold" style={{ color: "var(--accent-green)" }}>
                  {v.discount_type === "PERCENT"
                    ? `${v.discount_value}%`
                    : `${Number(v.discount_value).toLocaleString("vi-VN")}₫`}
                </span>,
                <span key="min" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {v.min_order_value
                    ? `Từ ${Number(v.min_order_value).toLocaleString("vi-VN")}₫`
                    : "Không giới hạn"}
                </span>,
                <span key="expires" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(String(v.expires_at ?? ""))}
                </span>,
                <Badge key="active" color={v.is_active ? "green" : "default"}>
                  {v.is_active ? "Active" : "Tắt"}
                </Badge>,
              ])}
            />
          </Card>
        </div>
      </div>
      <Divider />
    </div>
  );
}
