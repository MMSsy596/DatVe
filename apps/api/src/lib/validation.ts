type Validator<T> = (input: unknown, fieldName?: string) => T;

export function asObject(input: unknown, message = "Payload khong hop le.") {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(message);
  }
  return input as Record<string, unknown>;
}

export const v = {
  string(input: unknown, fieldName = "Truong", options?: { min?: number; max?: number; trim?: boolean }) {
    if (typeof input !== "string") {
      throw new Error(`${fieldName} phai la chuoi.`);
    }
    const value = options?.trim === false ? input : input.trim();
    if (options?.min && value.length < options.min) {
      throw new Error(`${fieldName} phai co it nhat ${options.min} ky tu.`);
    }
    if (options?.max && value.length > options.max) {
      throw new Error(`${fieldName} khong duoc vuot qua ${options.max} ky tu.`);
    }
    return value;
  },
  optionalString(
    input: unknown,
    fieldName = "Truong",
    options?: { min?: number; max?: number; trim?: boolean; allowEmpty?: boolean }
  ) {
    if (input === undefined || input === null) return null;
    const value = v.string(input, fieldName, options);
    if (!options?.allowEmpty && value.length === 0) return null;
    return value;
  },
  email(input: unknown, fieldName = "Email") {
    const value = v.string(input, fieldName, { min: 5, max: 190 }).toLowerCase();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!ok) throw new Error(`${fieldName} khong hop le.`);
    return value;
  },
  password(input: unknown, fieldName = "Mat khau") {
    const value = v.string(input, fieldName, { min: 8, max: 120, trim: false });
    const strongEnough =
      /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
    if (!strongEnough) {
      throw new Error(`${fieldName} can co chu hoa, chu thuong va so.`);
    }
    return value;
  },
  phone(input: unknown, fieldName = "So dien thoai") {
    const value = v.string(input, fieldName, { min: 8, max: 30 });
    if (!/^[0-9+\-\s().]+$/.test(value)) {
      throw new Error(`${fieldName} khong hop le.`);
    }
    return value;
  },
  number(input: unknown, fieldName = "Gia tri", options?: { min?: number; max?: number; integer?: boolean }) {
    const value = typeof input === "number" ? input : Number(input);
    if (!Number.isFinite(value)) {
      throw new Error(`${fieldName} phai la so.`);
    }
    if (options?.integer && !Number.isInteger(value)) {
      throw new Error(`${fieldName} phai la so nguyen.`);
    }
    if (options?.min !== undefined && value < options.min) {
      throw new Error(`${fieldName} phai lon hon hoac bang ${options.min}.`);
    }
    if (options?.max !== undefined && value > options.max) {
      throw new Error(`${fieldName} phai nho hon hoac bang ${options.max}.`);
    }
    return value;
  },
  boolean(input: unknown, fieldName = "Gia tri") {
    if (typeof input === "boolean") return input;
    if (input === "true") return true;
    if (input === "false") return false;
    throw new Error(`${fieldName} phai la boolean.`);
  },
  oneOf<T extends string>(input: unknown, values: readonly T[], fieldName = "Gia tri") {
    const value = v.string(input, fieldName) as T;
    if (!values.includes(value)) {
      throw new Error(`${fieldName} khong nam trong tap cho phep.`);
    }
    return value;
  },
  url(input: unknown, fieldName = "URL", options?: { protocols?: string[] }) {
    const value = v.string(input, fieldName, { min: 4, max: 2000 });
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${fieldName} khong hop le.`);
    }
    if (options?.protocols && !options.protocols.includes(parsed.protocol)) {
      throw new Error(`${fieldName} phai dung giao thuc hop le.`);
    }
    return parsed.toString();
  },
  dateTime(input: unknown, fieldName = "Thoi gian") {
    const value = v.string(input, fieldName, { min: 10, max: 40 });
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${fieldName} khong hop le.`);
    }
    return value.includes("T") ? value.replace("T", " ").slice(0, 19) : value.slice(0, 19);
  },
  array<T>(input: unknown, fieldName: string, itemValidator: Validator<T>, options?: { min?: number; max?: number }) {
    if (!Array.isArray(input)) {
      throw new Error(`${fieldName} phai la mang.`);
    }
    if (options?.min !== undefined && input.length < options.min) {
      throw new Error(`${fieldName} phai co it nhat ${options.min} phan tu.`);
    }
    if (options?.max !== undefined && input.length > options.max) {
      throw new Error(`${fieldName} khong duoc vuot qua ${options.max} phan tu.`);
    }
    return input.map((item, index) => itemValidator(item, `${fieldName} #${index + 1}`));
  },
};

