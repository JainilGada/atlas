import { useState, useRef, useEffect } from "react";
import {
  CheckSquare,
  UtensilsCrossed,
  Settings as GearIcon,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  Flame,
  Droplets,
  LogOut,
  X,
  Activity,
  Dumbbell,
  User,
  Award,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type AppView = "auth" | "otp" | "onboarding" | "app";
type AppTab = "checkin" | "nutrition";
type GoalType = "lose" | "maintain" | "gain";
type DietType = "none" | "vegetarian" | "vegan" | "eggetarian" | "jain" | "keto";

interface SubTask {
  id: string;
  label: string;
  done: boolean;
}
interface Task {
  id: string;
  label: string;
  done: boolean;
  subtasks?: SubTask[];
}
interface Challenge {
  id: string;
  name: string;
  totalDays: number;
  currentDay: number;
  tasks: Task[];
  startDate: string;
  status: "active" | "paused" | "archived";
}
interface FoodItem {
  id: string;
  name: string;
  qty: string;
  kcal: number;
}
interface MealSlot {
  id: string;
  label: string;
  items: FoodItem[];
  expanded: boolean;
}
interface Profile {
  goal: GoalType;
  age: string;
  weight: string;
  weightUnit: "kg" | "lbs";
  height: string;
  heightUnit: "cm" | "ft";
  dietPref: DietType;
  allergies: string[];
  dislikedFoods: string;
  complete: boolean;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const INITIAL_CHALLENGES: Challenge[] = [
  {
    id: "c1",
    name: "75 Hard",
    totalDays: 75,
    currentDay: 4,
    startDate: "2026-07-04",
    status: "active",
    tasks: [
      {
        id: "t1",
        label: "Outdoor Workout",
        done: false,
        subtasks: [
          { id: "s1", label: "Warm-up 10 min", done: false },
          { id: "s2", label: "Main workout 45 min", done: false },
        ],
      },
      { id: "t2", label: "Clean Eating", done: false },
      { id: "t3", label: "Drink 4L Water", done: false },
      { id: "t4", label: "Read 10 Pages", done: false },
      { id: "t5", label: "Progress Photo", done: false },
    ],
  },
];

const INITIAL_MEALS: MealSlot[] = [
  {
    id: "breakfast",
    label: "Breakfast",
    expanded: true,
    items: [
      { id: "f1", name: "Dal Rice", qty: "1 bowl", kcal: 280 },
      { id: "f2", name: "Banana", qty: "1 medium", kcal: 140 },
    ],
  },
  { id: "morning-snack", label: "Morning Snack", expanded: false, items: [] },
  {
    id: "lunch",
    label: "Lunch",
    expanded: false,
    items: [
      { id: "f3", name: "Chicken Salad", qty: "1 plate", kcal: 380 },
      { id: "f4", name: "Whole Wheat Roti", qty: "2 rotis", kcal: 160 },
    ],
  },
  { id: "dinner", label: "Dinner", expanded: false, items: [] },
  { id: "evening-snack", label: "Evening Snack", expanded: false, items: [] },
];

const INITIAL_PROFILE: Profile = {
  goal: "lose",
  age: "27",
  weight: "72",
  weightUnit: "kg",
  height: "175",
  heightUnit: "cm",
  dietPref: "none",
  allergies: [],
  dislikedFoods: "",
  complete: true,
};

const CALORIE_GOAL = 1800;
const CALORIES_BURNED = 320;

const MOTIVATIONAL_LINES = [
  "Small steps every day.",
  "Show up again.",
  "You've got this.",
  "Progress over perfection.",
  "One day at a time.",
];

const today = new Date();
const DATE_HEADER = today.toLocaleDateString("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// ─── Micro-components ─────────────────────────────────────────────────────────

function ProgressBar({
  value,
  color = "#6C63FF",
  track = "#EDE9FF",
}: {
  value: number;
  color?: string;
  track?: string;
}) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: track }}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  size = 20,
}: {
  checked: boolean;
  onChange: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={onChange}
      className="flex-shrink-0 rounded flex items-center justify-center transition-all duration-200 active:scale-90"
      style={{
        width: size,
        height: size,
        border: `2px solid ${checked ? "#6C63FF" : "#E5E7EB"}`,
        backgroundColor: checked ? "#6C63FF" : "transparent",
      }}
      aria-label={checked ? "Mark incomplete" : "Mark complete"}
    >
      {checked && <Check size={size * 0.6} color="white" strokeWidth={3} />}
    </button>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outlined" | "text" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] min-h-[44px] select-none cursor-pointer disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-[#6C63FF] text-white hover:bg-[#5B52EE] disabled:opacity-40",
    outlined:
      "border-2 border-[#6C63FF] text-[#6C63FF] hover:bg-[#EDE9FF] bg-transparent disabled:opacity-40",
    text: "text-[#6C63FF] hover:bg-[#EDE9FF] disabled:opacity-40 px-2",
    danger: "text-[#EF4444] hover:bg-red-50 disabled:opacity-40 px-2",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  autoFocus = false,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-[#6B7280]">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#111827] placeholder-[#D1D5DB] outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all duration-150 min-h-[44px]"
      />
    </div>
  );
}

function SegCtrl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex bg-[#F3F4F6] rounded-lg p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-2 rounded-md text-xs font-semibold transition-all duration-200 min-h-[36px] ${
            value === opt.value
              ? "bg-white text-[#111827] shadow-sm"
              : "text-[#6B7280] hover:text-[#374151]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toast({
  message,
  visible,
  onDismiss,
}: {
  message: string;
  visible: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onDismiss, 3500);
      return () => clearTimeout(t);
    }
  }, [visible, onDismiss]);

  return (
    <div
      className={`absolute bottom-[72px] left-4 right-4 z-50 transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-[#111827] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl">
        {message}
      </div>
    </div>
  );
}

function Confetti({ active }: { active: boolean }) {
  const COLORS = ["#6C63FF", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6"];
  const particles = useRef(
    Array.from({ length: 64 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      left: 20 + Math.random() * 60,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 0.8,
      width: 7 + Math.random() * 7,
      height: 4 + Math.random() * 5,
      rotate: Math.random() * 360,
    }))
  );

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      <style>{`
        @keyframes cfFall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(700px) rotate(540deg); opacity: 0; }
        }
      `}</style>
      {particles.current.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: 0,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `cfFall ${p.duration}s ${p.delay}s ease-in both`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

function TopBar({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 z-10">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#6C63FF] flex items-center justify-center">
          <span className="text-white font-bold text-xs tracking-tight">A</span>
        </div>
        <span className="font-semibold text-[#111827]" style={{ fontSize: 16 }}>
          Atlas
        </span>
      </div>
      <button
        onClick={onSettingsClick}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
        aria-label="Settings"
      >
        <GearIcon size={20} color="#6B7280" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function BottomTabBar({ active, onChange }: { active: AppTab; onChange: (t: AppTab) => void }) {
  const tabs: { id: AppTab; Icon: typeof CheckSquare; label: string }[] = [
    { id: "checkin", Icon: CheckSquare, label: "Check-in" },
    { id: "nutrition", Icon: UtensilsCrossed, label: "Nutrition" },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E5E7EB] flex z-10">
      {tabs.map(({ id, Icon, label }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <Icon
              size={24}
              strokeWidth={1.5}
              color={isActive ? "#6C63FF" : "#9CA3AF"}
            />
            <span
              className="text-[11px] font-semibold"
              style={{ color: isActive ? "#6C63FF" : "#9CA3AF" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthEmailScreen({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const valid = email.includes("@") && email.includes(".");
  return (
    <div className="flex flex-col h-full px-6 pt-14">
      <div className="mb-10">
        <div className="w-14 h-14 rounded-2xl bg-[#6C63FF] flex items-center justify-center mb-7 shadow-lg">
          <span className="text-white font-bold text-2xl">A</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#111827] mb-2 leading-tight">
          Welcome to Atlas
        </h1>
        <p className="text-[#6B7280] text-sm leading-relaxed">
          Sign in with your Gmail to start building better habits.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <FieldInput
          label="Email address"
          value={email}
          onChange={setEmail}
          placeholder="you@gmail.com"
          type="email"
          autoFocus
        />
        <Btn onClick={() => valid && onNext(email)} disabled={!valid} className="w-full mt-1">
          Send OTP <ArrowRight size={15} />
        </Btn>
      </div>
      <p className="mt-5 text-xs text-[#9CA3AF] text-center leading-relaxed">
        We'll send a 6-digit code to your inbox. No password needed.
      </p>
    </div>
  );
}

function AuthOTPScreen({ email, onVerify }: { email: string; onVerify: () => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) setTimeout(onVerify, 400);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="flex flex-col h-full px-6 pt-14">
      <div className="mb-10">
        <div className="w-14 h-14 rounded-2xl bg-[#6C63FF] flex items-center justify-center mb-7 shadow-lg">
          <span className="text-white font-bold text-2xl">A</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#111827] mb-2 leading-tight">Check your inbox</h1>
        <p className="text-[#6B7280] text-sm">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-[#374151]">{email}</span>
        </p>
      </div>
      <div className="flex gap-2 mb-6">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            autoFocus={i === 0}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`flex-1 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-150 ${
              d
                ? "border-[#6C63FF] bg-[#EDE9FF] text-[#6C63FF]"
                : "border-[#E5E7EB] bg-white text-[#111827]"
            } focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20`}
          />
        ))}
      </div>
      <Btn onClick={onVerify} className="w-full">
        Verify
      </Btn>
      <button className="mt-4 text-sm text-[#6C63FF] font-semibold text-center py-2">
        Resend code
      </button>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function ProgressDots({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="flex gap-2 justify-center mb-5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === step ? 20 : 8,
            height: 8,
            backgroundColor: i === step ? "#6C63FF" : "#E5E7EB",
          }}
        />
      ))}
    </div>
  );
}

function OnboardingScreen({
  step,
  onNext,
  onBack,
  onSkip,
}: {
  step: number;
  onNext: (data?: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [goal, setGoal] = useState<GoalType>("lose");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [dietPref, setDietPref] = useState<DietType>("none");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [disliked, setDisliked] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [challengeDays, setChallengeDays] = useState("75");
  const [customDays, setCustomDays] = useState("");

  const DIET_OPTIONS: { label: string; value: DietType }[] = [
    { label: "None", value: "none" },
    { label: "Vegetarian", value: "vegetarian" },
    { label: "Vegan", value: "vegan" },
    { label: "Eggetarian", value: "eggetarian" },
    { label: "Jain", value: "jain" },
    { label: "Keto", value: "keto" },
  ];
  const ALLERGY_OPTIONS = ["Gluten", "Dairy", "Nuts", "Soy", "Eggs", "Shellfish", "None"];
  const CHALLENGE_CHIPS = ["75 Hard", "No Sugar", "Daily Workout", "Read 20 Min", "Cold Shower"];

  const toggleAllergy = (a: string) => {
    if (a === "None") { setAllergies(["None"]); return; }
    setAllergies((prev) => {
      const without = prev.filter((x) => x !== "None");
      return without.includes(a) ? without.filter((x) => x !== a) : [...without, a];
    });
  };

  const navButtons = (onPrimary: () => void, primaryLabel: string, primaryDisabled = false) => (
    <div className="px-5 pb-7 pt-4 border-t border-[#F3F4F6]">
      <ProgressDots step={step} />
      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-semibold text-[#6B7280] min-h-[44px] px-2 hover:text-[#374151] transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <Btn onClick={onPrimary} disabled={primaryDisabled} className="flex-1">
          {primaryLabel}
        </Btn>
      </div>
    </div>
  );

  if (step === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          <div className="w-52 h-52 bg-[#EDE9FF] rounded-full flex items-center justify-center mb-8 relative">
            <span className="text-7xl">🏃</span>
            <span className="absolute bottom-10 right-10 text-4xl">🥗</span>
          </div>
          <h1 className="text-[26px] font-bold text-[#111827] mb-3 text-center leading-tight">
            Welcome to Atlas
          </h1>
          <p className="text-[#6B7280] text-sm text-center mb-7 leading-relaxed">
            Your personal coach for habits and nutrition.
          </p>
          <div className="flex flex-col gap-3 w-full mb-2">
            {[
              "Set challenges and show up every day",
              "Track what you eat, understand your calories",
              "Get AI feedback tailored to your goals",
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#EDE9FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} color="#6C63FF" strokeWidth={3} />
                </div>
                <span className="text-sm text-[#374151]">{line}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 pb-7">
          <ProgressDots step={step} />
          <Btn onClick={() => onNext()} className="w-full mb-3">
            Get Started <ArrowRight size={15} />
          </Btn>
          <button
            onClick={onSkip}
            className="w-full text-sm text-[#9CA3AF] py-2 text-center hover:text-[#6B7280] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-5 pt-8 pb-4">
          <h1 className="text-xl font-bold text-[#111827] mb-1">Tell us about yourself</h1>
          <p className="text-[#6B7280] text-sm mb-7">
            We use this to calculate your daily calorie goal.
          </p>
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-2">Goal</label>
              <SegCtrl
                options={[
                  { label: "Lose Weight", value: "lose" },
                  { label: "Maintain", value: "maintain" },
                  { label: "Gain Muscle", value: "gain" },
                ]}
                value={goal}
                onChange={(v) => setGoal(v as GoalType)}
              />
            </div>
            <FieldInput
              label="Age"
              value={age}
              onChange={setAge}
              placeholder="e.g. 25"
              type="number"
            />
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-2">Weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="72"
                  className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all duration-150 min-h-[44px]"
                />
                <SegCtrl
                  options={[{ label: "kg", value: "kg" }, { label: "lbs", value: "lbs" }]}
                  value={weightUnit}
                  onChange={(v) => setWeightUnit(v as "kg" | "lbs")}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-2">Height</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all duration-150 min-h-[44px]"
                />
                <SegCtrl
                  options={[{ label: "cm", value: "cm" }, { label: "ft", value: "ft" }]}
                  value={heightUnit}
                  onChange={(v) => setHeightUnit(v as "cm" | "ft")}
                />
              </div>
            </div>
          </div>
        </div>
        {navButtons(() => onNext({ goal, age, weight, weightUnit, height, heightUnit }), "Next →")}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-5 pt-8 pb-4">
          <h1 className="text-xl font-bold text-[#111827] mb-1">Your food preferences</h1>
          <p className="text-[#6B7280] text-sm mb-7">
            So your AI suggestions always match your lifestyle.
          </p>
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-2">
                Dietary preference
              </label>
              <div className="flex flex-wrap gap-2">
                {DIET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDietPref(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                      dietPref === opt.value
                        ? "bg-[#6C63FF] text-white border-[#6C63FF]"
                        : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#6C63FF] hover:text-[#6C63FF]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-2">
                Allergies{" "}
                <span className="font-normal text-[#9CA3AF]">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAllergy(a)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                      allergies.includes(a)
                        ? "bg-[#EDE9FF] text-[#6C63FF] border-[#6C63FF]"
                        : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#6C63FF]"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <FieldInput
              label="Disliked foods (optional)"
              value={disliked}
              onChange={setDisliked}
              placeholder="e.g. mushrooms, olives"
            />
          </div>
        </div>
        {navButtons(() => onNext({ dietPref, allergies, dislikedFoods: disliked }), "Next →")}
      </div>
    );
  }

  // step === 3
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-4">
        <h1 className="text-xl font-bold text-[#111827] mb-1">Set your first challenge</h1>
        <p className="text-[#6B7280] text-sm mb-7">
          A challenge is something you commit to doing every day.
        </p>
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-[#6B7280] block mb-2">Quick suggestions</label>
            <div className="flex flex-wrap gap-2">
              {CHALLENGE_CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() => setChallengeName(s)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                    challengeName === s
                      ? "bg-[#EDE9FF] text-[#6C63FF] border-[#6C63FF]"
                      : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#6C63FF] hover:text-[#6C63FF]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <FieldInput
            label="Challenge name"
            value={challengeName}
            onChange={setChallengeName}
            placeholder="e.g. No sugar for 30 days"
          />
          <div>
            <label className="text-xs font-medium text-[#6B7280] block mb-2">Duration</label>
            <SegCtrl
              options={[
                { label: "30 days", value: "30" },
                { label: "60 days", value: "60" },
                { label: "75 days", value: "75" },
                { label: "Custom", value: "custom" },
              ]}
              value={challengeDays}
              onChange={(v) => setChallengeDays(v)}
            />
            {challengeDays === "custom" && (
              <FieldInput
                value={customDays}
                onChange={setCustomDays}
                placeholder="Number of days"
                type="number"
                className="mt-3"
              />
            )}
          </div>
        </div>
      </div>
      {navButtons(
        () =>
          onNext({
            challengeName,
            challengeDays: challengeDays === "custom" ? customDays : challengeDays,
          }),
        "Start my journey 🚀",
        !challengeName
      )}
    </div>
  );
}

// ─── Check-in Tab ─────────────────────────────────────────────────────────────

function CheckInTab({
  challenges,
  setChallenges,
  onAddChallenge,
}: {
  challenges: Challenge[];
  setChallenges: (c: Challenge[]) => void;
  onAddChallenge: () => void;
}) {
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const motiveLine = MOTIVATIONAL_LINES[today.getDate() % MOTIVATIONAL_LINES.length];

  const toggleTask = (challengeId: string, taskId: string, subId?: string) => {
    const updated = challenges.map((c) => {
      if (c.id !== challengeId) return c;
      const updatedTasks = c.tasks.map((t) => {
        if (subId) {
          if (t.id !== taskId) return t;
          const updatedSubs = t.subtasks?.map((s) =>
            s.id === subId ? { ...s, done: !s.done } : s
          );
          const allSubsDone = updatedSubs?.every((s) => s.done) ?? false;
          return { ...t, subtasks: updatedSubs, done: allSubsDone };
        }
        if (t.id !== taskId) return t;
        const newDone = !t.done;
        return {
          ...t,
          done: newDone,
          subtasks: t.subtasks?.map((s) => ({ ...s, done: newDone })),
        };
      });
      return { ...c, tasks: updatedTasks };
    });
    setChallenges(updated);

    const ch = updated.find((c) => c.id === challengeId);
    if (ch && ch.tasks.every((t) => t.done)) triggerCelebration(ch);
  };

  const markAllDone = (challengeId: string) => {
    const updated = challenges.map((c) => {
      if (c.id !== challengeId) return c;
      return {
        ...c,
        tasks: c.tasks.map((t) => ({
          ...t,
          done: true,
          subtasks: t.subtasks?.map((s) => ({ ...s, done: true })),
        })),
      };
    });
    setChallenges(updated);
    const ch = updated.find((c) => c.id === challengeId);
    if (ch) triggerCelebration(ch);
  };

  const triggerCelebration = (ch: Challenge) => {
    setCelebratingId(ch.id);
    setToastMsg(`🎉 ${ch.name} — Day ${ch.currentDay} done! Keep going!`);
    setToastVisible(true);
    setTimeout(() => setCelebratingId(null), 2800);
  };

  const active = challenges.filter((c) => c.status === "active");

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center py-16">
        <div className="text-6xl mb-5">📋</div>
        <h2 className="text-lg font-bold text-[#111827] mb-2">No challenges yet</h2>
        <p className="text-sm text-[#6B7280] mb-7 leading-relaxed">
          Set a challenge to start your streak.
        </p>
        <Btn onClick={onAddChallenge}>
          <Plus size={15} /> Add your first challenge
        </Btn>
      </div>
    );
  }

  return (
    <div className="relative pb-4">
      <Confetti active={celebratingId !== null} />
      <Toast
        message={toastMsg}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      <div className="px-4 pt-5 pb-4">
        <p className="text-xs font-medium text-[#9CA3AF] mb-0.5">Today, {DATE_HEADER}</p>
        <p className="text-sm text-[#374151] font-medium">{motiveLine}</p>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {active.map((challenge) => {
          const doneCount = challenge.tasks.filter((t) => t.done).length;
          const total = challenge.tasks.length;
          const taskPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
          const challengePct = Math.round((challenge.currentDay / challenge.totalDays) * 100);
          const isComplete = doneCount === total && total > 0;

          return (
            <div
              key={challenge.id}
              className="bg-white rounded-xl p-4 transition-all duration-400"
              style={{
                border: `${isComplete ? 2 : 1}px solid ${isComplete ? "#22C55E" : "#E5E7EB"}`,
                boxShadow: isComplete
                  ? "0 4px 12px rgba(34,197,94,0.15)"
                  : "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-[#111827] text-[15px]">{challenge.name}</h3>
                <span className="text-xs font-semibold text-[#6C63FF] bg-[#EDE9FF] px-2.5 py-1 rounded-full whitespace-nowrap ml-2">
                  Day {challenge.currentDay}/{challenge.totalDays}
                </span>
              </div>

              <div className="mb-4">
                <ProgressBar
                  value={challengePct}
                  color={isComplete ? "#22C55E" : "#6C63FF"}
                  track={isComplete ? "#DCFCE7" : "#EDE9FF"}
                />
                <p className="text-[11px] text-[#9CA3AF] mt-1">{challengePct}% through challenge</p>
              </div>

              <div className="flex flex-col gap-2.5 mb-4">
                {challenge.tasks.map((task) => (
                  <div key={task.id}>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={task.done}
                        onChange={() => toggleTask(challenge.id, task.id)}
                      />
                      <span
                        className={`text-sm flex-1 leading-snug ${
                          task.done
                            ? "text-[#9CA3AF] line-through"
                            : "text-[#111827]"
                        }`}
                      >
                        {task.label}
                      </span>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <ChevronRight size={13} color="#D1D5DB" />
                      )}
                    </div>
                    {task.subtasks?.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 ml-8 mt-2"
                      >
                        <Checkbox
                          checked={sub.done}
                          onChange={() =>
                            toggleTask(challenge.id, task.id, sub.id)
                          }
                          size={16}
                        />
                        <span
                          className={`text-xs flex-1 ${
                            sub.done
                              ? "text-[#9CA3AF] line-through"
                              : "text-[#6B7280]"
                          }`}
                        >
                          {sub.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
                <button
                  onClick={() => markAllDone(challenge.id)}
                  disabled={isComplete}
                  className="text-xs font-bold text-white bg-[#6C63FF] px-3.5 py-2 rounded-lg disabled:opacity-40 hover:bg-[#5B52EE] transition-colors active:scale-95"
                >
                  {isComplete ? "✓ All done!" : "Mark all done"}
                </button>
                <span className="text-xs text-[#9CA3AF]">
                  {doneCount} of {total} complete
                </span>
              </div>
            </div>
          );
        })}

        <button
          onClick={onAddChallenge}
          className="flex items-center gap-2 text-sm font-semibold text-[#6C63FF] py-2 hover:opacity-80 transition-opacity"
        >
          <Plus size={15} /> Add challenge
        </button>
      </div>
    </div>
  );
}

// ─── Nutrition Tab ────────────────────────────────────────────────────────────

function NutritionTab({
  meals,
  setMeals,
  profile,
  onAddFood,
}: {
  meals: MealSlot[];
  setMeals: (m: MealSlot[]) => void;
  profile: Profile;
  onAddFood: (mealId: string) => void;
}) {
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [steps, setSteps] = useState("");
  const [water, setWater] = useState("");
  const [strengthMin, setStrengthMin] = useState("");
  const [strengthLevel, setStrengthLevel] = useState<"Light" | "Moderate" | "Heavy">("Moderate");
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiLoading, setAILoading] = useState(false);

  const totalConsumed = meals.reduce(
    (sum, m) => sum + m.items.reduce((s, i) => s + i.kcal, 0),
    0
  );
  const net = totalConsumed - CALORIES_BURNED;
  const balance = net - CALORIE_GOAL;
  const pct = Math.min(100, Math.round((totalConsumed / CALORIE_GOAL) * 100));

  const balanceColor =
    Math.abs(balance) <= 100 ? "#22C55E" : balance < 0 ? "#3B82F6" : "#EF4444";
  const progressColor = balanceColor;

  const toggleMeal = (id: string) =>
    setMeals(meals.map((m) => (m.id === id ? { ...m, expanded: !m.expanded } : m)));

  const deleteItem = (mealId: string, itemId: string) =>
    setMeals(
      meals.map((m) =>
        m.id === mealId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m
      )
    );

  const handleAIFeedback = () => {
    setAILoading(true);
    setShowAIFeedback(true);
    setTimeout(() => setAILoading(false), 2000);
  };

  const hasAnyMeal = meals.some((m) => m.items.length > 0);

  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      {!profile.complete && (
        <div className="bg-[#FEF3C7] border border-[#F59E0B]/40 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-base">⚠️</span>
          <p className="text-sm text-[#92400E] leading-snug">
            Add your weight, age & goal to see your calorie target →{" "}
            <button className="font-semibold underline text-[#D97706]">Set up</button>
          </p>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
          Today's Calories
        </p>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-[26px] font-bold text-[#111827] leading-none">
            {totalConsumed.toLocaleString()}
          </span>
          <span className="text-sm text-[#6B7280]">/ {CALORIE_GOAL.toLocaleString()} kcal</span>
        </div>
        <ProgressBar value={pct} color={progressColor} track="#F3F4F6" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
          {[
            { label: "Burned", value: `${CALORIES_BURNED} kcal`, color: "#374151" },
            { label: "Net", value: `${net.toLocaleString()} kcal`, color: "#374151" },
            { label: "Goal", value: `${CALORIE_GOAL.toLocaleString()} kcal`, color: "#374151" },
            {
              label: "Balance",
              value: `${balance > 0 ? "+" : ""}${balance.toLocaleString()} kcal`,
              color: balanceColor,
            },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-xs text-[#9CA3AF]">{row.label}</span>
              <span className="text-xs font-bold" style={{ color: row.color }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Meal slots */}
      {meals.map((meal) => {
        const mealKcal = meal.items.reduce((s, i) => s + i.kcal, 0);
        return (
          <div
            key={meal.id}
            className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
          >
            <button
              onClick={() => toggleMeal(meal.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {meal.expanded ? (
                  <ChevronDown size={15} color="#6B7280" />
                ) : (
                  <ChevronRight size={15} color="#6B7280" />
                )}
                <span className="font-semibold text-sm text-[#111827]">{meal.label}</span>
              </div>
              <span className="text-xs font-medium text-[#9CA3AF]">{mealKcal} kcal</span>
            </button>
            {meal.expanded && (
              <div className="border-t border-[#F3F4F6]">
                {meal.items.length === 0 && (
                  <p className="px-4 py-3 text-xs text-[#9CA3AF] italic">Nothing logged yet.</p>
                )}
                {meal.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-[#F9FAFB] last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{item.name}</p>
                      <p className="text-xs text-[#9CA3AF]">{item.qty}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#374151]">{item.kcal} kcal</span>
                      <button
                        onClick={() => deleteItem(meal.id, item.id)}
                        className="w-7 h-7 flex items-center justify-center text-[#D1D5DB] hover:text-[#EF4444] transition-colors"
                        aria-label="Delete food item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onAddFood(meal.id)}
                  className="w-full flex items-center gap-2 px-4 py-3.5 text-sm font-semibold text-[#6C63FF] hover:bg-[#EDE9FF] transition-colors"
                >
                  <Plus size={14} /> Add food
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Activity */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <button
          onClick={() => setActivityExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {activityExpanded ? (
              <ChevronDown size={15} color="#6B7280" />
            ) : (
              <ChevronRight size={15} color="#6B7280" />
            )}
            <span className="font-semibold text-sm text-[#111827]">Activity</span>
          </div>
        </button>
        {activityExpanded && (
          <div className="border-t border-[#F3F4F6] px-4 py-4 flex flex-col gap-4">
            {[
              {
                icon: <Activity size={15} color="#6B7280" />,
                label: "Steps",
                value: steps,
                onChange: setSteps,
                unit: "steps",
              },
              {
                icon: <Droplets size={15} color="#3B82F6" />,
                label: "Water",
                value: water,
                onChange: setWater,
                unit: "litres",
              },
              {
                icon: <Dumbbell size={15} color="#6B7280" />,
                label: "Strength",
                value: strengthMin,
                onChange: setStrengthMin,
                unit: "min",
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-5 flex justify-center">{row.icon}</div>
                <span className="text-sm text-[#374151] w-16 flex-shrink-0">{row.label}</span>
                <input
                  type="number"
                  value={row.value}
                  onChange={(e) => row.onChange(e.target.value)}
                  placeholder="0"
                  className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6C63FF] min-h-[40px] transition-colors duration-150"
                />
                <span className="text-xs text-[#9CA3AF] w-8">{row.unit}</span>
              </div>
            ))}
            <div className="flex gap-2 ml-8">
              {(["Light", "Moderate", "Heavy"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setStrengthLevel(level)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                    strengthLevel === level
                      ? "bg-[#EDE9FF] text-[#6C63FF] border-[#6C63FF]"
                      : "bg-white text-[#9CA3AF] border-[#E5E7EB] hover:border-[#6C63FF]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Feedback */}
      {hasAnyMeal && !showAIFeedback && (
        <Btn onClick={handleAIFeedback} variant="outlined" className="w-full">
          ✨ Get today's AI feedback
        </Btn>
      )}
      {showAIFeedback && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center gap-2">
            <span className="text-sm font-bold text-[#111827]">✨ AI Feedback</span>
          </div>
          {aiLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[75, 55, 90, 40].map((w, i) => (
                <div
                  key={i}
                  className="h-3 bg-[#F3F4F6] rounded-full animate-pulse"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 border-l-4 border-[#6C63FF]">
              <p className="text-sm text-[#374151] leading-relaxed">
                <strong>Great pacing today!</strong> You're at 69% of your goal — well-timed for
                midday. Your breakfast had good complex carbs and natural sugars from the banana.
                The chicken salad at lunch adds solid lean protein. Consider a light evening snack
                to hit your goal without overshooting. You're in a{" "}
                <span style={{ color: "#3B82F6" }}>healthy deficit</span> — keep it up! 💪
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Challenge Sheet ───────────────────────────────────────────────────────

function AddChallengeSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (c: Challenge) => void;
}) {
  const [name, setName] = useState("");
  const [days, setDays] = useState("30");
  const [customDays, setCustomDays] = useState("");
  const CHIPS = ["75 Hard", "No Sugar", "Daily Workout", "Read 20 Min", "Cold Shower"];

  const handleAdd = () => {
    if (!name) return;
    const totalDays = days === "custom" ? parseInt(customDays) || 30 : parseInt(days);
    onAdd({
      id: `c${Date.now()}`,
      name,
      totalDays,
      currentDay: 1,
      startDate: new Date().toISOString().split("T")[0],
      status: "active",
      tasks: [{ id: "t_main", label: name, done: false }],
    });
    setName("");
    setDays("30");
    setCustomDays("");
    onClose();
  };

  return (
    <>
      {visible && (
        <div
          className="absolute inset-0 bg-black/30 z-20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-30 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" }}
      >
        <div className="w-10 h-1 bg-[#E5E7EB] rounded-full mx-auto mt-3 mb-1" />
        <div className="px-5 pb-8 pt-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-[#111827]">Add Challenge</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
            >
              <X size={16} color="#6B7280" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {CHIPS.map((s) => (
              <button
                key={s}
                onClick={() => setName(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  name === s
                    ? "bg-[#EDE9FF] text-[#6C63FF] border-[#6C63FF]"
                    : "bg-[#F9FAFB] text-[#374151] border-[#E5E7EB] hover:border-[#6C63FF]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <FieldInput
              label="Challenge name"
              value={name}
              onChange={setName}
              placeholder="e.g. No sugar for 30 days"
            />
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-2">Duration</label>
              <SegCtrl
                options={[
                  { label: "30d", value: "30" },
                  { label: "60d", value: "60" },
                  { label: "75d", value: "75" },
                  { label: "Custom", value: "custom" },
                ]}
                value={days}
                onChange={(v) => setDays(v)}
              />
              {days === "custom" && (
                <FieldInput
                  value={customDays}
                  onChange={setCustomDays}
                  placeholder="Number of days"
                  type="number"
                  className="mt-3"
                />
              )}
            </div>
            <Btn onClick={handleAdd} disabled={!name} className="w-full mt-1">
              Add Challenge
            </Btn>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Food Sheet ───────────────────────────────────────────────────────────

function AddFoodSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: FoodItem) => void;
}) {
  const [foodName, setFoodName] = useState("");
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [kcal, setKcal] = useState<number | null>(null);

  const handleEstimate = () => {
    if (!foodName) return;
    setLoading(true);
    setTimeout(() => {
      setKcal(Math.floor(80 + Math.random() * 400));
      setLoading(false);
    }, 1500);
  };

  const handleSave = () => {
    if (!foodName || kcal === null) return;
    onAdd({ id: `f${Date.now()}`, name: foodName, qty, kcal });
    setFoodName("");
    setQty("");
    setKcal(null);
    onClose();
  };

  return (
    <>
      {visible && (
        <div
          className="absolute inset-0 bg-black/30 z-20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-30 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" }}
      >
        <div className="w-10 h-1 bg-[#E5E7EB] rounded-full mx-auto mt-3 mb-1" />
        <div className="px-5 pb-8 pt-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-[#111827]">Add Food</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
            >
              <X size={16} color="#6B7280" />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <FieldInput
              label="Food name"
              value={foodName}
              onChange={setFoodName}
              placeholder="e.g. Dal Rice"
              autoFocus
            />
            <FieldInput
              label="Quantity (optional)"
              value={qty}
              onChange={setQty}
              placeholder="e.g. 1 bowl, 200g"
            />
            {kcal !== null && (
              <div className="bg-[#EDE9FF] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[#374151]">Estimated calories</span>
                <span className="text-base font-bold text-[#6C63FF]">{kcal} kcal</span>
              </div>
            )}
            {loading && (
              <div className="bg-[#F3F4F6] rounded-xl px-4 py-4 animate-pulse flex gap-3">
                <div className="h-3 bg-[#E5E7EB] rounded-full flex-1" />
                <div className="h-3 bg-[#E5E7EB] rounded-full w-16" />
              </div>
            )}
            {!loading && kcal === null && (
              <Btn onClick={handleEstimate} disabled={!foodName} className="w-full">
                ✨ Estimate Calories
              </Btn>
            )}
            {!loading && kcal !== null && (
              <Btn onClick={handleSave} className="w-full">
                Add to meal
              </Btn>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

type SettingsSection = "main" | "profile" | "challenges" | "account";

function SettingsView({
  profile,
  setProfile,
  challenges,
  onClose,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  challenges: Challenge[];
  onClose: () => void;
}) {
  const [section, setSection] = useState<SettingsSection>("main");
  const [local, setLocal] = useState<Profile>({ ...profile });

  const DIET_OPTIONS: { label: string; value: DietType }[] = [
    { label: "None", value: "none" },
    { label: "Vegetarian", value: "vegetarian" },
    { label: "Vegan", value: "vegan" },
    { label: "Eggetarian", value: "eggetarian" },
    { label: "Jain", value: "jain" },
    { label: "Keto", value: "keto" },
  ];

  const backButton = (target: SettingsSection = "main") => (
    <button
      onClick={() => setSection(target)}
      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
    >
      <ChevronLeft size={20} color="#6B7280" />
    </button>
  );

  if (section === "profile") {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E5E7EB]">
          {backButton()}
          <h2 className="font-bold text-[#111827] text-base">Profile</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
              Body
            </p>
            <div className="flex flex-col gap-3">
              <FieldInput
                label="Age"
                value={local.age}
                onChange={(v) => setLocal((p) => ({ ...p, age: v }))}
                placeholder="25"
                type="number"
              />
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-2">Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={local.weight}
                    onChange={(e) => setLocal((p) => ({ ...p, weight: e.target.value }))}
                    className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#6C63FF] min-h-[44px]"
                  />
                  <SegCtrl
                    options={[{ label: "kg", value: "kg" }, { label: "lbs", value: "lbs" }]}
                    value={local.weightUnit}
                    onChange={(v) => setLocal((p) => ({ ...p, weightUnit: v as "kg" | "lbs" }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-2">Height</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={local.height}
                    onChange={(e) => setLocal((p) => ({ ...p, height: e.target.value }))}
                    className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#6C63FF] min-h-[44px]"
                  />
                  <SegCtrl
                    options={[{ label: "cm", value: "cm" }, { label: "ft", value: "ft" }]}
                    value={local.heightUnit}
                    onChange={(v) => setLocal((p) => ({ ...p, heightUnit: v as "cm" | "ft" }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
              Goal
            </p>
            <SegCtrl
              options={[
                { label: "Lose Weight", value: "lose" },
                { label: "Maintain", value: "maintain" },
                { label: "Gain Muscle", value: "gain" },
              ]}
              value={local.goal}
              onChange={(v) => setLocal((p) => ({ ...p, goal: v as GoalType }))}
            />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
              Diet
            </p>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLocal((p) => ({ ...p, dietPref: opt.value }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                    local.dietPref === opt.value
                      ? "bg-[#6C63FF] text-white border-[#6C63FF]"
                      : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#6C63FF]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 pb-6 pt-3 border-t border-[#F3F4F6]">
          <Btn
            onClick={() => {
              setProfile({ ...local, complete: true });
              setSection("main");
            }}
            className="w-full"
          >
            Save changes
          </Btn>
        </div>
      </div>
    );
  }

  if (section === "challenges") {
    const active = challenges.filter((c) => c.status !== "archived");
    const archived = challenges.filter((c) => c.status === "archived");
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E5E7EB]">
          {backButton()}
          <h2 className="font-bold text-[#111827] text-base">Challenges</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {active.length === 0 && archived.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-sm text-[#6B7280] mb-4">No challenges created yet.</p>
              <Btn variant="outlined">
                <Plus size={14} /> Add your first challenge
              </Btn>
            </div>
          ) : (
            <>
              {active.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 flex items-start justify-between"
                >
                  <div>
                    <p className="font-bold text-sm text-[#111827]">{c.name}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Day {c.currentDay} / {c.totalDays} · Started {c.startDate}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      c.status === "active"
                        ? "bg-[#DCFCE7] text-[#166534]"
                        : "bg-[#FEF3C7] text-[#92400E]"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
              {archived.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
                    Past Challenges
                  </p>
                  {archived.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 mb-2 opacity-60"
                    >
                      <p className="font-medium text-sm text-[#6B7280]">{c.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (section === "account") {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E5E7EB]">
          {backButton()}
          <h2 className="font-bold text-[#111827] text-base">Account</h2>
        </div>
        <div className="flex-1 px-4 py-6 flex flex-col gap-4">
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
              Email
            </p>
            <p className="text-sm font-medium text-[#374151]">user@gmail.com</p>
          </div>
          <button className="flex items-center gap-2.5 text-sm font-semibold text-[#EF4444] py-2 hover:opacity-80 transition-opacity">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E5E7EB]">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
        >
          <X size={20} color="#6B7280" />
        </button>
        <h2 className="font-bold text-[#111827] text-base">Settings</h2>
      </div>
      <div className="flex-1 px-4 py-5 flex flex-col gap-3">
        {(
          [
            {
              icon: User,
              label: "Profile",
              desc: "Body stats, goal & diet preferences",
              s: "profile" as SettingsSection,
            },
            {
              icon: Award,
              label: "Challenges",
              desc: "Manage active & past challenges",
              s: "challenges" as SettingsSection,
            },
            {
              icon: LogOut,
              label: "Account",
              desc: "Email & sign out",
              s: "account" as SettingsSection,
            },
          ] as const
        ).map(({ icon: Icon, label, desc, s }) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className="flex items-center gap-4 bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors text-left w-full"
          >
            <div className="w-10 h-10 rounded-full bg-[#EDE9FF] flex items-center justify-center flex-shrink-0">
              <Icon size={18} color="#6C63FF" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#111827]">{label}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{desc}</p>
            </div>
            <ChevronRight size={16} color="#D1D5DB" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App Shell ───────────────────────────────────────────────────────────

function MainApp() {
  const [activeTab, setActiveTab] = useState<AppTab>("checkin");
  const [challenges, setChallenges] = useState<Challenge[]>(INITIAL_CHALLENGES);
  const [meals, setMeals] = useState<MealSlot[]>(INITIAL_MEALS);
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddChallenge, setShowAddChallenge] = useState(false);
  const [addFoodMealId, setAddFoodMealId] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F7F7FB]">
      <TopBar onSettingsClick={() => setShowSettings(true)} />

      <div className="absolute top-14 bottom-16 left-0 right-0 overflow-y-auto">
        <div className={activeTab === "checkin" ? "block" : "hidden"}>
          <CheckInTab
            challenges={challenges}
            setChallenges={(c) => setChallenges(c)}
            onAddChallenge={() => setShowAddChallenge(true)}
          />
        </div>
        <div className={activeTab === "nutrition" ? "block" : "hidden"}>
          <NutritionTab
            meals={meals}
            setMeals={(m) => setMeals(m)}
            profile={profile}
            onAddFood={(mealId) => setAddFoodMealId(mealId)}
          />
        </div>
      </div>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />

      {/* Settings slide-in */}
      <div
        className={`absolute inset-0 z-40 transition-transform duration-300 ease-out ${
          showSettings ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <SettingsView
          profile={profile}
          setProfile={setProfile}
          challenges={challenges}
          onClose={() => setShowSettings(false)}
        />
      </div>

      <AddChallengeSheet
        visible={showAddChallenge}
        onClose={() => setShowAddChallenge(false)}
        onAdd={(c) => setChallenges((prev) => [...prev, c])}
      />

      <AddFoodSheet
        visible={addFoodMealId !== null}
        onClose={() => setAddFoodMealId(null)}
        onAdd={(item) => {
          if (!addFoodMealId) return;
          setMeals((prev) =>
            prev.map((m) =>
              m.id === addFoodMealId
                ? { ...m, items: [...m.items, item], expanded: true }
                : m
            )
          );
          setAddFoodMealId(null);
        }}
      />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>("auth");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(0);

  return (
    <div
      className="size-full flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #EDE9FF 0%, #F7F7FB 50%, #E0F2FE 100%)" }}
    >
      {/* Phone frame */}
      <div
        className="relative bg-white overflow-hidden flex-shrink-0"
        style={{
          width: "min(390px, 100vw)",
          height: "min(844px, 100vh)",
          borderRadius: "clamp(0px, 5vw, 40px)",
          boxShadow:
            "0 0 0 clamp(0px, 2vw, 10px) #1a1a2e, 0 32px 80px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-7 z-50 pointer-events-none">
          <span className="text-[11px] font-bold text-[#111827]">9:41</span>
          <div className="flex items-center gap-1">
            <Flame size={12} color="#6C63FF" />
          </div>
        </div>

        {/* Content area */}
        <div className="absolute top-10 bottom-0 left-0 right-0">
          {view === "auth" && (
            <AuthEmailScreen
              onNext={(e) => {
                setEmail(e);
                setView("otp");
              }}
            />
          )}
          {view === "otp" && (
            <AuthOTPScreen
              email={email}
              onVerify={() => {
                setStep(0);
                setView("onboarding");
              }}
            />
          )}
          {view === "onboarding" && (
            <OnboardingScreen
              step={step}
              onNext={() => {
                if (step < 3) setStep((s) => s + 1);
                else setView("app");
              }}
              onBack={() => setStep((s) => Math.max(0, s - 1))}
              onSkip={() => setView("app")}
            />
          )}
          {view === "app" && <MainApp />}
        </div>
      </div>
    </div>
  );
}
