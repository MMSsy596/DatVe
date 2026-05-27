"use client";

import { useState } from "react";
import { Card, Field, Area, Sel, Btn, Badge, Table, SectionHeader, Divider } from "../components/ui";
import { Item, FoodForm } from "../types";

export function FoodSection({
  foods,
  foodForm,
  setFoodForm,
  onSave,
}: {
  foods: Item[];
  foodForm: FoodForm;
  setFoodForm: React.Dispatch<React.SetStateAction<FoodForm>>;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("");

  const filtered = foods.filter((f) =>
    filterCat ? f.category === filterCat : true
  );

  const catColor = (cat: string) => {
    if (cat === "COMBO") return "purple" as const;
    if (cat === "FOOD") return "yellow" as const;
    if (cat === "DRINK") return "blue" as const;
    return "default" as const;
  };

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="🍿 F&B — Combo & Đồ ăn"
        subtitle={`${foods.length} items trong menu`}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Thêm F&B Item" className="xl:col-span-2">
          <div className="space-y-3">
            <Field
              value={foodForm.name}
              onChange={(e) => setFoodForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Tên sản phẩm (vd: Combo Bắp Nước Lớn)"
            />
            <Area
              value={foodForm.description}
              onChange={(e) => setFoodForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả sản phẩm..."
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Giá (₫)</p>
                <Field
                  type="number"
                  value={foodForm.price}
                  onChange={(e) => setFoodForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="99000"
                />
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Danh mục</p>
                <Sel
                  value={foodForm.category}
                  onChange={(e) => setFoodForm((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="COMBO">🍿 COMBO</option>
                  <option value="FOOD">🍔 FOOD</option>
                  <option value="DRINK">🥤 DRINK</option>
                </Sel>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <input
                type="checkbox"
                id="food-active"
                checked={foodForm.isActive}
                onChange={(e) => setFoodForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="food-active" className="text-sm" style={{ color: "var(--text-primary)" }}>
                Hiển thị trong ứng dụng
              </label>
            </div>

            <Btn
              onClick={async () => {
                setSaving(true);
                await onSave();
                setSaving(false);
              }}
              disabled={saving || !foodForm.name}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? "Đang lưu..." : "🍿 Thêm F&B"}
            </Btn>
          </div>
        </Card>

        <div className="xl:col-span-3">
          <Card
            title={`Menu F&B (${filtered.length} items)`}
            action={
              <Sel
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="">Tất cả</option>
                <option value="COMBO">COMBO</option>
                <option value="FOOD">FOOD</option>
                <option value="DRINK">DRINK</option>
              </Sel>
            }
          >
            <Table
              headers={["Tên", "Danh mục", "Giá", "Trạng thái"]}
              emptyText="Chưa có sản phẩm nào"
              rows={filtered.map((f) => [
                <div key="name">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {String(f.name)}
                  </p>
                  {!!f.description && (
                    <p className="mt-0.5 text-xs line-clamp-1" style={{ color: "var(--text-muted)" }}>
                      {String(f.description)}
                    </p>
                  )}
                </div>,
                <Badge key="cat" color={catColor(String(f.category))}>
                  {String(f.category)}
                </Badge>,
                <span key="price" className="font-semibold" style={{ color: "var(--accent-green)" }}>
                  {Number(f.price).toLocaleString("vi-VN")}₫
                </span>,
                <Badge key="active" color={f.is_active ? "green" : "default"}>
                  {f.is_active ? "Đang bán" : "Ẩn"}
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
