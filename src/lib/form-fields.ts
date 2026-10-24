// Reads and validates FormData fields, collecting one friendly message per field.

export type FormState =
  | { error?: string; fieldErrors?: Record<string, string>; savedAt?: number }
  | undefined;

type Opts = { required?: boolean };

export class Fields {
  errors: Record<string, string> = {};

  constructor(private fd: FormData) {}

  private raw(name: string) {
    const v = this.fd.get(name);
    return typeof v === "string" ? v.trim() : "";
  }

  private fail(name: string, message: string) {
    this.errors[name] ??= message;
    return undefined;
  }

  get ok() {
    return Object.keys(this.errors).length === 0;
  }

  state(): FormState {
    return { error: "Please fix the highlighted fields.", fieldErrors: this.errors };
  }

  str(name: string, label: string, { required, max = 1000 }: Opts & { max?: number } = {}) {
    const v = this.raw(name);
    if (!v) return required ? this.fail(name, `${label} is required`) : undefined;
    if (v.length > max) return this.fail(name, `${label} is too long (max ${max} characters)`);
    return v;
  }

  num(
    name: string,
    label: string,
    { required, min = 0, max = 1_000_000, int, positive }: Opts & { min?: number; max?: number; int?: boolean; positive?: boolean } = {},
  ) {
    const v = this.raw(name);
    if (!v) return required ? this.fail(name, `${label} is required`) : undefined;
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n)) return this.fail(name, `${label} must be a number`);
    if (int && !Number.isInteger(n)) return this.fail(name, `${label} must be a whole number`);
    if (positive && n <= 0) return this.fail(name, `${label} must be more than 0`);
    if (n < min) return this.fail(name, min === 0 ? `${label} can't be negative` : `${label} must be at least ${min}`);
    if (n > max) return this.fail(name, `${label} looks too big`);
    return n;
  }

  oneOf<T extends string>(name: string, label: string, values: readonly T[], { required = true }: Opts = {}) {
    const v = this.raw(name);
    if (!v) return required ? this.fail(name, `Choose a ${label.toLowerCase()}`) : undefined;
    if (!values.includes(v as T)) return this.fail(name, `Choose a valid ${label.toLowerCase()}`);
    return v as T;
  }

  date(name: string, label: string) {
    const v = this.raw(name);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
      return this.fail(name, `${label} is required`);
    return v;
  }

  optDate(name: string, label: string) {
    const v = this.raw(name);
    if (!v) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
      return this.fail(name, `${label} isn't a valid date`);
    return v;
  }

  time(name: string, label: string) {
    const v = this.raw(name);
    if (!/^\d{2}:\d{2}$/.test(v)) return this.fail(name, `${label} is required`);
    return v;
  }

  bool(name: string) {
    return this.fd.get(name) === "on" || this.fd.get(name) === "true";
  }

  list(name: string) {
    return this.fd
      .getAll(name)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  }
}
