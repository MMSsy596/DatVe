type Validator<T> = (input: unknown, fieldName?: string) => T;

export function asObject(input: unknown, message = "Dữ liệu gửi lên không hợp lệ.") {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(message);
  }
  return input as Record<string, unknown>;
}

export const v = {
  string(input: unknown, fieldName = "Trường", options?: { min?: number; max?: number; trim?: boolean }) {
    if (typeof input !== "string") {
      throw new Error(`${fieldName} phải là chuỗi.`);
    }
    const value = options?.trim === false ? input : input.trim();
    if (options?.min && value.length < options.min) {
      throw new Error(`${fieldName} phải có ít nhất ${options.min} ký tự.`);
    }
    if (options?.max && value.length > options.max) {
      throw new Error(`${fieldName} không được vượt quá ${options.max} ký tự.`);
    }
    return value;
  },
  optionalString(
    input: unknown,
    fieldName = "Trường",
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
    if (!ok) throw new Error(`${fieldName} không hợp lệ.`);
    return value;
  },
  password(input: unknown, fieldName = "Mật khẩu") {
    const value = v.string(input, fieldName, { min: 8, max: 120, trim: false });
    const strongEnough =
      /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
    if (!strongEnough) {
      throw new Error(`${fieldName} cần có chữ hoa, chữ thường và số.`);
    }
    return value;
  },
  phone(input: unknown, fieldName = "Số điện thoại") {
    const value = v.string(input, fieldName, { min: 8, max: 30 });
    if (!/^[0-9+\-\s().]+$/.test(value)) {
      throw new Error(`${fieldName} không hợp lệ.`);
    }
    return value;
  },
  number(input: unknown, fieldName = "Giá trị", options?: { min?: number; max?: number; integer?: boolean }) {
    const value = typeof input === "number" ? input : Number(input);
    if (!Number.isFinite(value)) {
      throw new Error(`${fieldName} phải là số.`);
    }
    if (options?.integer && !Number.isInteger(value)) {
      throw new Error(`${fieldName} phải là số nguyên.`);
    }
    if (options?.min !== undefined && value < options.min) {
      throw new Error(`${fieldName} phải lớn hơn hoặc bằng ${options.min}.`);
    }
    if (options?.max !== undefined && value > options.max) {
      throw new Error(`${fieldName} phải nhỏ hơn hoặc bằng ${options.max}.`);
    }
    return value;
  },
  boolean(input: unknown, fieldName = "Giá trị") {
    if (typeof input === "boolean") return input;
    if (input === "true") return true;
    if (input === "false") return false;
    throw new Error(`${fieldName} phải là boolean.`);
  },
  oneOf<T extends string>(input: unknown, values: readonly T[], fieldName = "Giá trị") {
    const value = v.string(input, fieldName) as T;
    if (!values.includes(value)) {
      throw new Error(`${fieldName} không nằm trong tập cho phép.`);
    }
    return value;
  },
  url(input: unknown, fieldName = "URL", options?: { protocols?: string[] }) {
    const value = v.string(input, fieldName, { min: 4, max: 2000 });
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${fieldName} không hợp lệ.`);
    }
    if (options?.protocols && !options.protocols.includes(parsed.protocol)) {
      throw new Error(`${fieldName} phải dùng giao thức hợp lệ.`);
    }
    return parsed.toString();
  },
  dateTime(input: unknown, fieldName = "Thời gian") {
    const value = v.string(input, fieldName, { min: 10, max: 40 });
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${fieldName} không hợp lệ.`);
    }
    return value.includes("T") ? value.replace("T", " ").slice(0, 19) : value.slice(0, 19);
  },
  array<T>(input: unknown, fieldName: string, itemValidator: Validator<T>, options?: { min?: number; max?: number }) {
    if (!Array.isArray(input)) {
      throw new Error(`${fieldName} phải là mảng.`);
    }
    if (options?.min !== undefined && input.length < options.min) {
      throw new Error(`${fieldName} phải có ít nhất ${options.min} phần tử.`);
    }
    if (options?.max !== undefined && input.length > options.max) {
      throw new Error(`${fieldName} không được vượt quá ${options.max} phần tử.`);
    }
    return input.map((item, index) => itemValidator(item, `${fieldName} #${index + 1}`));
  },
};
