"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  MessageSquare,
  CreditCard,
  Headphones,
  ClipboardList,
  PartyPopper,
  Star,
  Lock,
  Calendar,
  User,
  Settings,
  Search,
  Heart,
  Bell,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AccentColor =
  | "blue"
  | "amber"
  | "emerald"
  | "red"
  | "indigo"
  | "purple"
  | "pink"
  | "zinc";

export type IconName =
  | "send"
  | "message"
  | "card"
  | "headphones"
  | "clipboard"
  | "party"
  | "star"
  | "lock"
  | "calendar"
  | "user"
  | "settings"
  | "search"
  | "heart"
  | "bell"
  | "none";

export type FormField = {
  id: string;
  label: string;
  type:
    | "text"
    | "email"
    | "number"
    | "textarea"
    | "password"
    | "choice"
    | "select"
    | "rating"
    | "date"
    | "time"
    | "datetime"
    | "tel"
    | "url"
    | "toggle"
    | "slider"
    | "checkbox"
    | "checkboxGroup";
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

type ColorConfig = {
  btn: string;
  choiceOn: string;
  choiceOff: string;
  ring: string;
  selectRing: string;
  headerBg: string;
  headerText: string;
  ratingColor: string;
  toggleOn: string;
  sliderAccent: string;
};

const colorConfig: Record<string, ColorConfig> = {
  blue: {
    btn: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30",
    choiceOn:
      "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900/40",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    ring: "focus-visible:ring-blue-500",
    selectRing: "focus:ring-blue-500",
    headerBg: "bg-gradient-to-r from-blue-600 to-blue-700",
    headerText: "text-white",
    ratingColor: "text-yellow-400",
    toggleOn: "bg-blue-600",
    sliderAccent: "accent-blue-600",
  },
  amber: {
    btn: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30",
    choiceOn:
      "bg-amber-100 border-amber-400 shadow-md shadow-amber-200 scale-110 dark:bg-amber-900/40 dark:border-amber-500",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-amber-300 hover:scale-105 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    ring: "focus-visible:ring-amber-500",
    selectRing: "focus:ring-amber-500",
    headerBg:
      "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/10",
    headerText: "text-amber-800 dark:text-amber-200",
    ratingColor: "text-amber-400",
    toggleOn: "bg-amber-500",
    sliderAccent: "accent-amber-500",
  },
  emerald: {
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30",
    choiceOn:
      "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 dark:shadow-emerald-900/40",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-emerald-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    ring: "focus-visible:ring-emerald-500",
    selectRing: "focus:ring-emerald-500",
    headerBg: "bg-gradient-to-r from-emerald-600 to-teal-600",
    headerText: "text-white",
    ratingColor: "text-yellow-400",
    toggleOn: "bg-emerald-600",
    sliderAccent: "accent-emerald-600",
  },
  red: {
    btn: "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 dark:shadow-red-900/30",
    choiceOn:
      "bg-red-600 text-white border-red-600 shadow-md shadow-red-200 dark:shadow-red-900/40",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-red-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    ring: "focus-visible:ring-red-500",
    selectRing: "focus:ring-red-500",
    headerBg:
      "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/10",
    headerText: "text-red-800 dark:text-red-200",
    ratingColor: "text-yellow-400",
    toggleOn: "bg-red-600",
    sliderAccent: "accent-red-600",
  },
  indigo: {
    btn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30",
    choiceOn:
      "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    ring: "focus-visible:ring-indigo-500",
    selectRing: "focus:ring-indigo-500",
    headerBg:
      "bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20",
    headerText: "text-indigo-800 dark:text-indigo-200",
    ratingColor: "text-yellow-400",
    toggleOn: "bg-indigo-600",
    sliderAccent: "accent-indigo-600",
  },
  purple: {
    btn: "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/30",
    choiceOn:
      "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 dark:shadow-purple-900/40",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-purple-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    ring: "focus-visible:ring-purple-500",
    selectRing: "focus:ring-purple-500",
    headerBg: "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500",
    headerText: "text-white",
    ratingColor: "text-yellow-400",
    toggleOn: "bg-purple-600",
    sliderAccent: "accent-purple-600",
  },
  pink: {
    btn: "bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30",
    choiceOn:
      "bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-200 dark:shadow-pink-900/40",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-pink-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    ring: "focus-visible:ring-pink-500",
    selectRing: "focus:ring-pink-500",
    headerBg: "bg-gradient-to-r from-pink-500 to-rose-500",
    headerText: "text-white",
    ratingColor: "text-yellow-400",
    toggleOn: "bg-pink-600",
    sliderAccent: "accent-pink-600",
  },
  zinc: {
    btn: "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 shadow-md",
    choiceOn:
      "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100",
    choiceOff:
      "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    ring: "focus-visible:ring-zinc-500",
    selectRing: "focus:ring-zinc-500",
    headerBg:
      "bg-gradient-to-r from-zinc-800 to-zinc-900 dark:from-zinc-700 dark:to-zinc-800",
    headerText: "text-white",
    ratingColor: "text-yellow-400",
    toggleOn: "bg-zinc-800",
    sliderAccent: "accent-zinc-800",
  },
};

const iconMap: Partial<Record<IconName, LucideIcon>> = {
  send: Send,
  message: MessageSquare,
  card: CreditCard,
  headphones: Headphones,
  clipboard: ClipboardList,
  party: PartyPopper,
  star: Star,
  lock: Lock,
  calendar: Calendar,
  user: User,
  settings: Settings,
  search: Search,
  heart: Heart,
  bell: Bell,
};

function getColor(accentColor?: string): ColorConfig {
  return colorConfig[accentColor ?? "blue"] ?? colorConfig.blue;
}

function ChoiceField({
  options,
  value,
  onChange,
  accentColor,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
}) {
  const c = getColor(accentColor);
  const isCompact = options.every((o) => o.length <= 4);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <motion.button
          key={opt}
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className={`
            ${isCompact ? "px-4 py-3 text-2xl leading-none" : "px-4 py-2 text-sm font-medium"}
            rounded-full border transition-all duration-200 cursor-pointer
            ${value === opt ? c.choiceOn : c.choiceOff}
          `}
          onClick={() => onChange(opt)}
        >
          {opt}
        </motion.button>
      ))}
    </div>
  );
}

function RatingField({
  value,
  onChange,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
}) {
  const rating = parseInt(value) || 0;
  const c = getColor(accentColor);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.button
          key={i}
          type="button"
          whileHover={{ scale: 1.25, rotate: 8 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(String(i))}
          className="p-1 cursor-pointer"
        >
          <Star
            className={`size-8 transition-all duration-200 ${
              i <= rating
                ? `${c.ratingColor} fill-current drop-shadow-sm`
                : "text-zinc-300 dark:text-zinc-600"
            }`}
          />
        </motion.button>
      ))}
    </div>
  );
}

function SelectField({
  options,
  value,
  onChange,
  accentColor,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
  placeholder?: string;
}) {
  const c = getColor(accentColor);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full appearance-none rounded-md border px-3 py-2 pr-10 text-sm
          bg-white dark:bg-zinc-900
          border-zinc-200 dark:border-zinc-700
          text-zinc-900 dark:text-zinc-100
          focus:outline-none focus:ring-2 focus:ring-offset-1
          ${c.selectRing}
        `}
      >
        <option value="">{placeholder ?? "Select..."}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
    </div>
  );
}

function ToggleField({
  value,
  onChange,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
}) {
  const isOn = value === "true";
  const c = getColor(accentColor);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => onChange(isOn ? "false" : "true")}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
        isOn ? c.toggleOn : "bg-zinc-200 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          isOn ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SliderField({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  accentColor: string;
}) {
  const c = getColor(accentColor);
  const numValue = value === "" ? min : Number(value);

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numValue}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${c.sliderAccent}`}
      />
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[2.5rem] text-right tabular-nums">
        {numValue}
      </span>
    </div>
  );
}

function CheckboxField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={value === "true"}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        className="rounded border-zinc-300 dark:border-zinc-600 size-4 cursor-pointer"
      />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </label>
  );
}

function CheckboxGroupField({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = value ? value.split(",").filter(Boolean) : [];

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(next.join(","));
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="rounded border-zinc-300 dark:border-zinc-600 size-4 cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
        </label>
      ))}
    </div>
  );
}

export function DynamicForm({
  fields,
  title,
  icon = "none",
  accentColor = "blue",
  submitLabel = "Submit",
  onSubmit,
}: {
  fields: FormField[];
  title?: string;
  icon?: IconName;
  accentColor?: AccentColor;
  submitLabel?: string;
  onSubmit?: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.id, ""]))
  );
  const [submitted, setSubmitted] = useState(false);

  const c = getColor(accentColor);
  const IconComponent = icon !== "none" ? iconMap[icon] : undefined;

  const update = (id: string, v: string) =>
    setValues((prev) => ({ ...prev, [id]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit?.(values);
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "choice":
        return (
          <ChoiceField
            options={field.options ?? []}
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
            accentColor={accentColor}
          />
        );
      case "select":
        return (
          <SelectField
            options={field.options ?? []}
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
            accentColor={accentColor}
            placeholder={field.placeholder}
          />
        );
      case "rating":
        return (
          <RatingField
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
            accentColor={accentColor}
          />
        );
      case "textarea":
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={values[field.id] ?? ""}
            onChange={(e) => update(field.id, e.target.value)}
            className={`rounded-lg border-zinc-200 dark:border-zinc-700 min-h-[100px] resize-none ${c.ring}`}
          />
        );
      case "toggle":
        return (
          <ToggleField
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
            accentColor={accentColor}
          />
        );
      case "slider":
        return (
          <SliderField
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
            min={field.min}
            max={field.max}
            step={field.step}
            accentColor={accentColor}
          />
        );
      case "checkbox":
        return (
          <CheckboxField
            id={field.id}
            label={field.label}
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
          />
        );
      case "checkboxGroup":
        return (
          <CheckboxGroupField
            options={field.options ?? []}
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
          />
        );
      case "datetime":
        return (
          <Input
            id={field.id}
            type="datetime-local"
            value={values[field.id] ?? ""}
            onChange={(e) => update(field.id, e.target.value)}
            className={`rounded-lg border-zinc-200 dark:border-zinc-700 ${c.ring}`}
          />
        );
      default:
        return (
          <Input
            id={field.id}
            type={field.type}
            placeholder={field.placeholder}
            value={values[field.id] ?? ""}
            onChange={(e) => update(field.id, e.target.value)}
            min={field.min}
            max={field.max}
            step={field.step}
            className={`rounded-lg border-zinc-200 dark:border-zinc-700 ${c.ring}`}
          />
        );
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md flex flex-col items-center justify-center gap-3 py-10 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"
        >
          <svg
            className="size-6 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Submitted successfully
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-md rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900"
    >
      {title && (
        <div className={`flex items-center gap-3 px-5 py-3.5 ${c.headerBg} ${c.headerText}`}>
          {IconComponent && <IconComponent className="size-4" />}
          <span className="font-semibold text-sm tracking-wide">{title}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        {fields.map((field, idx) => (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="flex flex-col gap-1.5"
          >
            {field.type !== "checkbox" && (
              <Label
                htmlFor={field.id}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {field.label}
              </Label>
            )}
            {renderField(field)}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: fields.length * 0.06 + 0.1 }}
        >
          <Button type="submit" className={`mt-2 w-full ${c.btn}`}>
            {submitLabel}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
