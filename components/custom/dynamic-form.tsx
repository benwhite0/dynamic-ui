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
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type FormVariant =
  | "default"
  | "email"
  | "feedback"
  | "payment"
  | "support"
  | "survey"
  | "rsvp";

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
    | "rating";
  options?: string[];
  placeholder?: string;
};

function ChoiceField({
  options,
  value,
  onChange,
  variant,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  variant: FormVariant;
}) {
  const isCompact = options.every((o) => o.length <= 4);

  const accent: Record<string, { on: string; off: string }> = {
    email: {
      on: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900/40",
      off: "bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    },
    feedback: {
      on: "bg-amber-100 border-amber-400 shadow-md shadow-amber-200 scale-110 dark:bg-amber-900/40 dark:border-amber-500",
      off: "bg-white text-zinc-600 border-zinc-200 hover:border-amber-300 hover:scale-105 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    },
    payment: {
      on: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 dark:shadow-emerald-900/40",
      off: "bg-white text-zinc-600 border-zinc-200 hover:border-emerald-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    },
    support: {
      on: "bg-red-600 text-white border-red-600 shadow-md shadow-red-200 dark:shadow-red-900/40",
      off: "bg-white text-zinc-600 border-zinc-200 hover:border-red-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    },
    survey: {
      on: "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40",
      off: "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    },
    rsvp: {
      on: "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 dark:shadow-purple-900/40",
      off: "bg-white text-zinc-600 border-zinc-200 hover:border-purple-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    },
    default: {
      on: "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white",
      off: "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    },
  };

  const s = accent[variant] ?? accent.default;

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
            ${value === opt ? s.on : s.off}
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
  variant,
}: {
  value: string;
  onChange: (v: string) => void;
  variant: FormVariant;
}) {
  const rating = parseInt(value) || 0;
  const color = variant === "feedback" ? "text-amber-400" : "text-yellow-400";

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
                ? `${color} fill-current drop-shadow-sm`
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
  variant,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  variant: FormVariant;
  placeholder?: string;
}) {
  const ringMap: Record<string, string> = {
    email: "focus:ring-blue-500",
    feedback: "focus:ring-amber-500",
    payment: "focus:ring-emerald-500",
    support: "focus:ring-red-500",
    survey: "focus:ring-indigo-500",
    rsvp: "focus:ring-purple-500",
    default: "focus:ring-zinc-500",
  };

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
          ${ringMap[variant] ?? ringMap.default}
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

type VariantStyle = {
  wrapper: string;
  header: { icon: React.ReactNode; title: string; bg: string; text: string } | null;
  label: string;
  input: string;
  textarea: string;
  btn: string;
  btnIcon: React.ReactNode | null;
};

function getStyle(v: FormVariant): VariantStyle {
  switch (v) {
    case "email":
      return {
        wrapper: "rounded-xl shadow-xl border-0 overflow-hidden bg-white dark:bg-zinc-900",
        header: {
          icon: <Send className="size-4" />,
          title: "New Message",
          bg: "bg-gradient-to-r from-blue-600 to-blue-700",
          text: "text-white",
        },
        label: "text-xs font-medium text-zinc-500 uppercase tracking-wider",
        input:
          "border-0 border-b border-zinc-200 dark:border-zinc-700 rounded-none shadow-none focus-visible:ring-0 focus-visible:border-blue-500 bg-transparent px-0",
        textarea:
          "border-0 rounded-none shadow-none focus-visible:ring-0 bg-transparent px-0 min-h-[160px] resize-none",
        btn: "bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 shadow-md shadow-blue-200 dark:shadow-blue-900/30",
        btnIcon: <Send className="size-4 ml-2" />,
      };
    case "feedback":
      return {
        wrapper:
          "rounded-2xl shadow-lg border border-amber-100 dark:border-amber-900/40 overflow-hidden bg-white dark:bg-zinc-900",
        header: {
          icon: <MessageSquare className="size-5" />,
          title: "Share Your Feedback",
          bg: "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/10",
          text: "text-amber-800 dark:text-amber-200",
        },
        label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
        input: "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-amber-500",
        textarea:
          "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-amber-500 min-h-[100px]",
        btn: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full px-6 shadow-md shadow-amber-200 dark:shadow-amber-900/30",
        btnIcon: null,
      };
    case "payment":
      return {
        wrapper: "rounded-xl shadow-xl border-0 overflow-hidden bg-white dark:bg-zinc-900",
        header: {
          icon: <CreditCard className="size-5" />,
          title: "Payment Details",
          bg: "bg-gradient-to-r from-zinc-800 to-zinc-900 dark:from-zinc-700 dark:to-zinc-800",
          text: "text-white",
        },
        label: "text-xs font-semibold text-zinc-500 uppercase tracking-wider",
        input: "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-emerald-500 font-mono",
        textarea:
          "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-emerald-500 min-h-[80px]",
        btn: "bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-6 font-semibold shadow-md shadow-emerald-200 dark:shadow-emerald-900/30",
        btnIcon: <Lock className="size-4 ml-2" />,
      };
    case "support":
      return {
        wrapper:
          "rounded-xl shadow-lg border-l-4 border-l-red-500 border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900",
        header: {
          icon: <Headphones className="size-5" />,
          title: "Support Ticket",
          bg: "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/10",
          text: "text-red-800 dark:text-red-200",
        },
        label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
        input: "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-red-500",
        textarea:
          "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-red-500 min-h-[100px]",
        btn: "bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 shadow-md shadow-red-200 dark:shadow-red-900/30",
        btnIcon: null,
      };
    case "survey":
      return {
        wrapper:
          "rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-900/40 overflow-hidden bg-white dark:bg-zinc-900",
        header: {
          icon: <ClipboardList className="size-5" />,
          title: "Quick Survey",
          bg: "bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20",
          text: "text-indigo-800 dark:text-indigo-200",
        },
        label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
        input: "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-indigo-500",
        textarea:
          "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-indigo-500 min-h-[80px]",
        btn: "bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30",
        btnIcon: null,
      };
    case "rsvp":
      return {
        wrapper: "rounded-2xl shadow-xl border-0 overflow-hidden bg-white dark:bg-zinc-900",
        header: {
          icon: <PartyPopper className="size-5" />,
          title: "You're Invited",
          bg: "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500",
          text: "text-white",
        },
        label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
        input: "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-purple-500",
        textarea:
          "rounded-lg border-zinc-200 dark:border-zinc-700 focus-visible:ring-purple-500 min-h-[80px]",
        btn: "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-full px-6 shadow-md shadow-purple-200 dark:shadow-purple-900/30",
        btnIcon: <PartyPopper className="size-4 ml-2" />,
      };
    default:
      return {
        wrapper:
          "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50",
        header: null,
        label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
        input: "rounded-md",
        textarea: "rounded-md min-h-[120px] resize-y",
        btn: "",
        btnIcon: null,
      };
  }
}

export function DynamicForm({
  fields,
  variant = "default",
  submitLabel = "Submit",
  onSubmit,
}: {
  fields: FormField[];
  variant?: FormVariant;
  submitLabel?: string;
  onSubmit?: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.id, ""]))
  );
  const [submitted, setSubmitted] = useState(false);

  const s = getStyle(variant);

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
            variant={variant}
          />
        );
      case "select":
        return (
          <SelectField
            options={field.options ?? []}
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
            variant={variant}
            placeholder={field.placeholder}
          />
        );
      case "rating":
        return (
          <RatingField
            value={values[field.id] ?? ""}
            onChange={(v) => update(field.id, v)}
            variant={variant}
          />
        );
      case "textarea":
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={values[field.id] ?? ""}
            onChange={(e) => update(field.id, e.target.value)}
            className={s.textarea}
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
            className={s.input}
          />
        );
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-md flex flex-col items-center justify-center gap-3 py-10 ${s.wrapper}`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"
        >
          <svg className="size-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Submitted successfully</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`w-full max-w-md ${s.wrapper}`}
    >
      {s.header && (
        <div
          className={`flex items-center gap-3 px-5 py-3.5 ${s.header.bg} ${s.header.text}`}
        >
          {s.header.icon}
          <span className="font-semibold text-sm tracking-wide">
            {s.header.title}
          </span>
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
            <Label htmlFor={field.id} className={s.label}>
              {field.label}
            </Label>
            {renderField(field)}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: fields.length * 0.06 + 0.1 }}
        >
          <Button type="submit" className={`mt-2 w-full ${s.btn}`}>
            {submitLabel}
            {s.btnIcon}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
