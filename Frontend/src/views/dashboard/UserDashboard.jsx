import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import { getUserDashboardStats } from "@/api/api";
import {
  Trophy, Code2, CheckCircle2, XCircle, Clock, Cpu,
  ChevronRight, BarChart3, User, Zap, BookOpen,
  MessageSquare, Target, TrendingUp, Calendar, Star
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────
const VERDICT_META = {
  ACCEPTED:             { label: "Accepted",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
  WRONG_ANSWER:         { label: "Wrong Answer",color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",    dot: "bg-rose-400" },
  TIME_LIMIT_EXCEEDED:  { label: "TLE",         color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   dot: "bg-amber-400" },
  MEMORY_LIMIT_EXCEEDED:{ label: "MLE",         color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20", dot: "bg-purple-400" },
  RUNTIME_ERROR:        { label: "Runtime Err", color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20", dot: "bg-orange-400" },
  COMPILE_ERROR:        { label: "Compile Err", color: "text-slate-400",   bg: "bg-slate-500/10 border-slate-500/20",  dot: "bg-slate-400" },
  PENDING:              { label: "Pending",     color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20",      dot: "bg-sky-400" },
  RUNNING:              { label: "Running",     color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20",      dot: "bg-sky-400" },
  FAILED:               { label: "Failed",      color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",    dot: "bg-rose-400" },
};

const DIFF_META = {
  EASY:   { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  MEDIUM: { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30" },
  HARD:   { color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/30" },
};

const LANG_LABELS = { CPP: "C++", JAVA: "Java", PYTHON: "Python", JAVASCRIPT: "JS", C: "C", CSHARP: "C#" };

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Animated counter ─────────────────────────────────────────
function Counter({ target, duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

// ── Donut chart ───────────────────────────────────────────────
function DonutChart({ easy, medium, hard, total }) {
  const R = 52, C = 2 * Math.PI * R;
  const eP = total ? (easy / total) * C : 0;
  const mP = total ? (medium / total) * C : 0;
  const hP = total ? (hard / total) * C : 0;
  const gap = 2;

  const Segment = ({ offset, len, color, label }) =>
    len > gap ? (
      <circle
        cx="64" cy="64" r={R}
        fill="none" strokeWidth="10"
        stroke={color}
        strokeDasharray={`${len - gap} ${C - (len - gap)}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    ) : null;

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 128 128" className="w-36 h-36 -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.05)" />
        <Segment offset={0}       len={eP}           color="#10b981" label="Easy" />
        <Segment offset={eP}      len={mP}           color="#f59e0b" label="Med" />
        <Segment offset={eP + mP} len={hP}           color="#f43f5e" label="Hard" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black text-white">{total}</span>
        <span className="text-xs text-slate-400 font-medium">Solved</span>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, loading }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/8 bg-slate-800/60 backdrop-blur p-5 flex flex-col gap-3 group hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${accent}`} />
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${accent}/20 border border-white/5`}>
          <Icon size={18} className="text-white/80" />
        </div>
        <span className="text-xs text-slate-500 font-medium">{sub}</span>
      </div>
      <div>
        <div className="text-2xl font-black text-white tabular-nums">
          {loading ? <div className="h-7 w-14 rounded bg-slate-700 animate-pulse" /> : <Counter target={value} />}
        </div>
        <div className="text-xs text-slate-400 mt-0.5 font-medium">{label}</div>
      </div>
    </div>
  );
}

// ── Submission row ────────────────────────────────────────────
function SubRow({ sub }) {
  const v = VERDICT_META[sub.status] || VERDICT_META.PENDING;
  const d = DIFF_META[sub.problem?.difficulty] || {};
  return (
    <Link
      to={`/problems/${sub.problem?.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/8 transition-all duration-200 group"
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${v.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
          {sub.problem?.title || "Unknown Problem"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${d.bg || ""} ${d.color || "text-slate-400"}`}>
            {sub.problem?.difficulty || "—"}
          </span>
          <span className="text-[10px] text-slate-500">{LANG_LABELS[sub.language] || sub.language}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={`text-xs font-semibold ${v.color}`}>{v.label}</span>
        <span className="text-[10px] text-slate-500">{timeAgo(sub.createdAt)}</span>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-slate-700/60 ${className}`} />;
}

// ── Main ──────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserDashboardStats();
        setStats(res.data.data);
      } catch {
        setStats({ totalSubmissions: 0, totalSolved: 0, solvedByDifficulty: { easy: 0, medium: 0, hard: 0 }, recentSubmissions: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const solved = stats?.solvedByDifficulty ?? { easy: 0, medium: 0, hard: 0 };
  const totalSolved = stats?.totalSolved ?? 0;
  const acceptRate = stats?.totalSubmissions
    ? Math.round((totalSolved / stats.totalSubmissions) * 100)
    : 0;

  const avatar = user?.username?.charAt(0)?.toUpperCase() || "U";
  const initials = user?.username?.slice(0, 2)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top gradient line */}
      <div className="h-px w-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 opacity-80 blur-sm" />
              <div className="relative h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 to-purple-700 flex items-center justify-center text-xl font-black shadow-xl">
                {initials}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">
                Hey, {user?.username || "Coder"} 👋
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              {user?.role || "USER"}
            </span>
            <Link
              to="/problems"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition-colors hover:-translate-y-0.5 duration-200"
            >
              <Zap size={14} /> Solve Now
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={CheckCircle2} label="Problems Solved"   value={totalSolved}               sub="all time"  accent="bg-emerald-500" loading={loading} />
          <StatCard icon={Code2}        label="Total Submissions" value={stats?.totalSubmissions??0} sub="submit mode" accent="bg-blue-500"    loading={loading} />
          <StatCard icon={TrendingUp}   label="Accept Rate"       value={acceptRate}                 sub="%"          accent="bg-purple-500"  loading={loading} />
          <StatCard icon={Star}         label="Hard Solved"        value={solved.hard}                sub="problems"   accent="bg-rose-500"    loading={loading} />
        </div>

        {/* ── Main Grid ── */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Left — Progress + Recent submissions */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Solved by difficulty */}
            <div className="rounded-2xl border border-white/8 bg-slate-800/60 backdrop-blur p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={16} className="text-slate-400" />
                <h2 className="text-sm font-bold text-white">Solved by Difficulty</h2>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {loading ? (
                  <Skeleton className="w-36 h-36 rounded-full" />
                ) : (
                  <DonutChart easy={solved.easy} medium={solved.medium} hard={solved.hard} total={totalSolved} />
                )}
                <div className="flex-1 w-full space-y-3">
                  {[
                    { label: "Easy",   count: solved.easy,   color: "bg-emerald-500", text: "text-emerald-400", total: 100 },
                    { label: "Medium", count: solved.medium, color: "bg-amber-500",   text: "text-amber-400",   total: 100 },
                    { label: "Hard",   count: solved.hard,   color: "bg-rose-500",    text: "text-rose-400",    total: 100 },
                  ].map(({ label, count, color, text, total }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={`font-semibold ${text}`}>{label}</span>
                        <span className="text-slate-400 tabular-nums">
                          {loading ? "—" : count} <span className="text-slate-600">/ {total}</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-1000`}
                          style={{ width: loading ? "0%" : `${Math.min((count / total) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="rounded-2xl border border-white/8 bg-slate-800/60 backdrop-blur p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <h2 className="text-sm font-bold text-white">Recent Submissions</h2>
                </div>
                <Link to="/problems" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                  All Problems →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : stats?.recentSubmissions?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {stats.recentSubmissions.slice(0, 10).map((sub) => (
                    <SubRow key={sub.id} sub={sub} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Code2 size={28} className="text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">No submissions yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Start solving problems to track your progress</p>
                  <Link
                    to="/problems"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-colors"
                  >
                    Browse Problems <ChevronRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">

            {/* Profile card */}
            <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur p-6">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-slate-400" />
                <h2 className="text-sm font-bold text-white">Profile</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Username</span>
                  <span className="font-semibold text-white">@{user?.username || "—"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Role</span>
                  <span className="font-semibold text-blue-400 capitalize">{user?.role || "USER"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Accept Rate</span>
                  <span className="font-semibold text-emerald-400">{loading ? "—" : `${acceptRate}%`}</span>
                </div>
              </div>
              <div className="mt-5 h-px bg-white/5" />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Easy",   value: solved.easy,   color: "text-emerald-400" },
                  { label: "Medium", value: solved.medium, color: "text-amber-400" },
                  { label: "Hard",   value: solved.hard,   color: "text-rose-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl bg-white/5 py-2.5 px-1">
                    <div className={`text-lg font-black tabular-nums ${color}`}>
                      {loading ? "—" : value}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-white/8 bg-slate-800/60 backdrop-blur p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-slate-400" />
                <h2 className="text-sm font-bold text-white">Quick Actions</h2>
              </div>
              <div className="space-y-2">
                {[
                  { to: "/problems", icon: Code2,        label: "Browse Problems",  sub: "Solve & improve" },
                  { to: "/interview",icon: BookOpen,      label: "Interview Prep",   sub: "AI mock interviews" },
                  { to: "/contests", icon: Trophy,        label: "Contests",         sub: "Compete & rank" },
                  { to: "/discuss",  icon: MessageSquare, label: "Discussions",      sub: "Learn with others" },
                ].map(({ to, icon: Icon, label, sub }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/8 transition-all duration-200 group"
                  >
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                      <Icon size={14} className="text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{label}</p>
                      <p className="text-[10px] text-slate-500">{sub}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-all group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Verdict legend */}
            {stats?.recentSubmissions?.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-slate-800/60 backdrop-blur p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={14} className="text-slate-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Verdict Key</h2>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(VERDICT_META).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${v.dot}`} />
                      <span className="text-slate-400">{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
