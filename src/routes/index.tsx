import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  CheckCircle2,
  Code2,
  Download,
  Loader2,
  LogOut,
  Upload,
  X,
} from "lucide-react";
import bg from "@/assets/mars-bg.jpg";
import capsule from "@/assets/capsule.png";
import gem from "@/assets/gem.png";
import { supabase, supabaseConfigMissing, type Database } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prosperity — Quant Trading Hackathon" },
      {
        name: "description",
        content:
          "Upload your trading algorithm, track submissions and PnL in the Prosperity quant hackathon.",
      },
      { property: "og:title", content: "Prosperity — Quant Trading Hackathon" },
      {
        property: "og:description",
        content: "Upload your trading algorithm and track performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Submission = Database["public"]["Tables"]["submissions"]["Row"];
type Run = Database["public"]["Tables"]["simulation_runs"]["Row"];
type LeaderboardEntry = Database["public"]["Views"]["leaderboard"]["Row"];
type PnlPoint = Pick<
  Database["public"]["Tables"]["simulation_steps"]["Row"],
  "trading_day" | "timestamp" | "pnl"
>;
type Team = Database["public"]["Tables"]["teams"]["Row"];
type Tab = "Challenge" | "Upload & Log" | "Performance";
type MarketSummary = { products: string[]; days: number[]; rowCount: number | null };

const TABS: Tab[] = ["Challenge", "Upload & Log", "Performance"];
const BUCKET = "algorithm-submissions";

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "An unexpected error occurred. Please try again.";
}

function ago(value: string | null) {
  if (!value) return "Unknown";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return "Unknown";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}

function Index() {
  const [tab, setTab] = useState<Tab>("Upload & Log");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamReady, setTeamReady] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [pnlPoints, setPnlPoints] = useState<PnlPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [teamActionOpen, setTeamActionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !supabase) {
      setTeam(null);
      setTeams([]);
      setTeamReady(true);
      setSubmissions([]);
      setRuns([]);
      setPnlPoints([]);
      return;
    }

    let active = true;
    setTeamReady(false);
    setTeam(null);
    setTeams([]);
    void (async () => {
      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);
      if (!active) return;
      if (membershipError) {
        setError(membershipError.message);
        setTeamReady(true);
        return;
      }
      if (!membership?.length) {
        setTeam(null);
        setTeamReady(true);
        return;
      }

      const { data: joinedTeams, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .in(
          "id",
          membership.map((entry) => entry.team_id),
        );
      if (!active) return;
      if (teamError) setError(teamError.message);
      setTeams(joinedTeams ?? []);
      setTeam(joinedTeams?.[0] ?? null);
      setTeamReady(true);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const refreshSubmissions = useCallback(async () => {
    if (!supabase || !team) return;
    const { data: rows, error: submissionsError } = await supabase
      .from("submissions")
      .select("*")
      .eq("team_id", team.id)
      .order("submitted_at", { ascending: false });
    if (submissionsError) {
      setError(submissionsError.message);
      return;
    }
    const submissionRows = rows ?? [];
    setSubmissions(submissionRows);
    if (submissionRows.length === 0) {
      setRuns([]);
      setPnlPoints([]);
      return;
    }

    const { data: runRows, error: runsError } = await supabase
      .from("simulation_runs")
      .select("*")
      .in(
        "submission_id",
        submissionRows.map((submission) => submission.id),
      )
      .eq("status", "completed")
      .order("score", { ascending: false, nullsFirst: false });
    if (runsError) {
      setError(runsError.message);
      return;
    }
    const completedRuns = runRows ?? [];
    setRuns(completedRuns);
    if (completedRuns.length === 0) {
      setPnlPoints([]);
      return;
    }
    const bestCompletedRun = completedRuns[0];
    if (!bestCompletedRun) {
      setPnlPoints([]);
      return;
    }

    const { data: points, error: stepsError } = await supabase
      .from("simulation_steps")
      .select("trading_day,timestamp,pnl")
      .eq("run_id", bestCompletedRun.id)
      .not("pnl", "is", null)
      .order("trading_day", { ascending: true })
      .order("timestamp", { ascending: true });
    if (stepsError) {
      setError(stepsError.message);
      return;
    }
    setPnlPoints(points ?? []);
  }, [team]);

  useEffect(() => {
    void refreshSubmissions();
  }, [refreshSubmissions]);

  const refreshLeaderboard = useCallback(async () => {
    if (!supabase) return;
    const { data, error: leaderboardError } = await supabase
      .from("leaderboard")
      .select("*")
      .order("rank", { ascending: true })
      .limit(100);
    if (leaderboardError) {
      setError(leaderboardError.message);
      return;
    }
    const entries = data ?? [];
    if (team?.id && !entries.some((entry) => entry.team_id === team.id)) {
      const { data: ownEntry, error: ownEntryError } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("team_id", team.id)
        .maybeSingle();
      if (ownEntryError) {
        setError(ownEntryError.message);
        return;
      }
      if (ownEntry) entries.push(ownEntry);
    }
    setLeaderboard(entries);
  }, [team?.id]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (!supabase || !user) {
      setMarketSummary(null);
      return;
    }

    let active = true;
    void (async () => {
      const {
        data,
        count,
        error: marketError,
      } = await supabase
        .from("market_data")
        .select("product,trading_day", { count: "exact" })
        .limit(1000);
      if (!active) return;
      if (marketError) {
        setError(marketError.message);
        return;
      }
      setMarketSummary({
        products: [...new Set((data ?? []).map((row) => row.product))].sort(),
        days: [...new Set((data ?? []).map((row) => row.trading_day))].sort((a, b) => a - b),
        rowCount: count,
      });
    })();

    return () => {
      active = false;
    };
  }, [user]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
        } else {
          setMessage("Account created.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (authError) {
      setError(errorText(authError));
    } finally {
      setBusy(false);
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !teamName.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data: teamId, error: createError } = await supabase.rpc("create_team", {
        p_name: teamName.trim(),
      });
      if (createError) throw createError;
      const { data: createdTeam, error: loadError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();
      if (loadError) throw loadError;
      setTeams((existing) => [...existing, createdTeam]);
      setTeam(createdTeam);
      setTeamActionOpen(false);
      setMessage("Team created.");
    } catch (createError) {
      setError(errorText(createError));
    } finally {
      setBusy(false);
    }
  }

  async function joinTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || !teamName.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data: matchingTeam, error: findError } = await supabase
        .from("teams")
        .select("*")
        .eq("name", teamName.trim())
        .maybeSingle();
      if (findError) throw findError;
      if (!matchingTeam) {
        setError("No team found with that exact name.");
        return;
      }
      const { error: joinError } = await supabase
        .from("team_members")
        .insert({ team_id: matchingTeam.id, user_id: user.id });
      if (joinError) throw joinError;
      setTeams((existing) => [...existing, matchingTeam]);
      setTeam(matchingTeam);
      setTeamActionOpen(false);
      setMessage(`Joined ${matchingTeam.name}.`);
    } catch (joinError) {
      setError(errorText(joinError));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAlgorithm(file?: File) {
    if (!supabase || !team || !file) return;
    if (!file.name.toLowerCase().endsWith(".py")) {
      setError("Choose a Python algorithm file ending in .py.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    const submissionNumber =
      Math.max(0, ...submissions.map((submission) => submission.submission_number)) + 1;
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const filePath = `${team.id}/${submissionNumber}-${crypto.randomUUID()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { contentType: "text/x-python", upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("submissions").insert({
        team_id: team.id,
        file_name: file.name,
        file_path: filePath,
        submission_number: submissionNumber,
      });
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([filePath]);
        throw new Error(
          cleanupError
            ? `${insertError.message} Storage cleanup also failed: ${cleanupError.message}`
            : insertError.message,
        );
      }

      setMessage(`${file.name} uploaded and queued for grading.`);
      await refreshSubmissions();
    } catch (uploadError) {
      setError(errorText(uploadError));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function downloadAlgorithm(submission: Submission) {
    if (!supabase) return;
    setError("");
    try {
      const { data, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(submission.file_path);
      if (downloadError) throw downloadError;
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = submission.file_name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(errorText(downloadError));
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else setMessage("");
  }

  const bestRun = runs[0];
  const teamLeaderboard = leaderboard.find((entry) => entry.team_id === team?.id);

  function focusAccountPanel() {
    setTab("Upload & Log");
    window.setTimeout(() => {
      const emailInput = document.querySelector("input[type='email']") as HTMLInputElement | null;
      const teamInput = document.querySelector("input[name='teamName']") as HTMLInputElement | null;
      const target = emailInput ?? teamInput ?? null;
      target?.focus();
    }, 100);
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden text-foreground"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header className="sticky top-0 z-20 px-6 pt-5">
        <div className="mx-auto grid max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="justify-self-start font-mono text-lg tracking-[0.6em] text-primary-foreground">
            PROSPERITY<span className="text-neon-soft">04</span>
          </div>
          <nav className="glass flex items-center gap-8 rounded-b-3xl px-8 py-3 font-display text-xs tracking-[0.3em] uppercase">
            {TABS.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`relative pb-1 ${tab === item ? "text-neon" : "text-primary-foreground/90"}`}
              >
                {item}
                {tab === item && (
                  <span className="absolute inset-x-4 -bottom-1 h-0.5 rounded bg-primary-foreground" />
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center justify-self-end gap-4">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={focusAccountPanel}
                  className="glass rounded-xl px-4 py-3 text-sm font-medium text-primary-foreground"
                >
                  Profile
                </button>
                {team && (
                  <button
                    onClick={() => setTeamActionOpen((open) => !open)}
                    className="glass rounded-xl px-4 py-3 text-sm text-primary-foreground"
                  >
                    {teamActionOpen ? "Close team form" : "Add team"}
                  </button>
                )}
                <button
                  onClick={signOut}
                  title="Sign out"
                  className="glass rounded-xl p-3 text-primary-foreground"
                >
                  <LogOut className="size-5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={focusAccountPanel}
                className="glass rounded-xl px-4 py-3 text-sm font-medium text-primary-foreground"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto mt-10 max-w-5xl px-4 pb-16">
        <div className="glass overflow-hidden rounded-[3rem] text-primary-foreground">
          <div className="flex items-center justify-between bg-panel-head px-10 py-6">
            <div className="flex items-center gap-4">
              <span className="grid size-10 place-items-center rounded-full bg-emerald">
                <Code2 className="size-5" />
              </span>
              <div>
                <h1 className="font-display text-3xl font-bold uppercase">Algorithmic Challenge</h1>
                {team && (
                  <p className="mt-1 text-sm text-primary-foreground/70">Team: {team.name}</p>
                )}
              </div>
            </div>
            {teams.length > 1 && (
              <label className="text-sm text-primary-foreground/70">
                Active team
                <select
                  aria-label="Active team"
                  value={team?.id ?? ""}
                  onChange={(event) =>
                    setTeam(teams.find((candidate) => candidate.id === event.target.value) ?? null)
                  }
                  className="ml-2 rounded-lg border border-glass-line bg-panel-head px-3 py-2 text-primary-foreground"
                >
                  {teams.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="rounded-full bg-foreground/40 p-2">
              <X className="size-5" />
            </span>
          </div>

          {error && <Notice tone="error" text={error} />}
          {message && <Notice tone="success" text={message} />}
          {teamActionOpen && user && team && (
            <div className="mx-8 mt-6">
              <TeamPanel
                teamName={teamName}
                busy={busy}
                onTeamName={setTeamName}
                onCreate={createTeam}
                onJoin={joinTeam}
              />
            </div>
          )}

          {tab === "Upload & Log" && (
            <div className="p-10">
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div>
                  <h2 className="text-gradient-neon font-display text-6xl font-bold uppercase leading-none">
                    Upload &amp;
                    <br />
                    Changelog
                  </h2>
                  <p className="mt-6 text-lg leading-relaxed">
                    Upload your Python trading algorithm. Submissions are stored privately and
                    queued for backtesting.
                  </p>
                  {team && (
                    <p className="mt-4 text-sm text-primary-foreground/70">
                      Signed in as {user?.email}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <img
                    src={capsule}
                    alt=""
                    width={1024}
                    height={1024}
                    className="float-slow pointer-events-none absolute -left-24 -top-6 z-10 w-52 drop-shadow-2xl"
                  />
                  {supabaseConfigMissing ? (
                    <div className="flex min-h-72 flex-col justify-center rounded-2xl border border-glass-line bg-panel-inner p-8 pl-24">
                      <h3 className="font-display text-2xl font-bold uppercase">
                        Supabase not configured
                      </h3>
                      <p className="mt-3 text-sm text-primary-foreground/70">
                        Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local environment,
                        then restart the app.
                      </p>
                    </div>
                  ) : !authReady || (user && !teamReady) ? (
                    <LoadingPanel />
                  ) : !user ? (
                    <AuthPanel
                      email={email}
                      password={password}
                      isSignUp={isSignUp}
                      busy={busy}
                      onEmail={setEmail}
                      onPassword={setPassword}
                      onMode={() => {
                        setIsSignUp((value) => !value);
                        setError("");
                        setMessage("");
                      }}
                      onSubmit={submitAuth}
                    />
                  ) : !team ? (
                    <TeamPanel
                      teamName={teamName}
                      busy={busy}
                      onTeamName={setTeamName}
                      onCreate={createTeam}
                      onJoin={joinTeam}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          void uploadAlgorithm(event.dataTransfer.files[0]);
                        }}
                        disabled={busy}
                        className="flex min-h-72 w-full flex-col items-center justify-center rounded-2xl border border-glass-line bg-panel-inner p-8 pl-24 text-center disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="size-10 animate-spin text-neon" />
                        ) : (
                          <Upload className="size-10 text-neon" />
                        )}
                        <h3 className="mt-4 font-display text-3xl font-bold uppercase">
                          {busy ? "Uploading" : "Drop algorithm"}
                        </h3>
                        <p className="mt-2 max-w-xs text-sm text-primary-foreground/70">
                          Drag a .py file here or click to browse.
                        </p>
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".py"
                        hidden
                        onChange={(event) => {
                          void uploadAlgorithm(event.target.files?.[0]);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="my-10 h-px bg-glass-line" />
              {team ? (
                submissions.length ? (
                  <div className="space-y-4">
                    {submissions.map((submission) => {
                      const run = runs.find(
                        (candidate) => candidate.submission_id === submission.id,
                      );
                      return (
                        <div
                          key={submission.id}
                          className="flex flex-wrap items-center gap-6 rounded-3xl border border-glass-line bg-panel-head/40 p-4"
                        >
                          <div className="grid h-20 w-32 place-items-center rounded-xl bg-primary-foreground/20">
                            <img
                              src={gem}
                              alt=""
                              loading="lazy"
                              width={816}
                              height={816}
                              className="h-16"
                            />
                          </div>
                          <div className="min-w-40 flex-1">
                            <div className="text-primary-foreground/70">{submission.file_name}</div>
                            <div className="mt-1 font-medium capitalize">{submission.status}</div>
                            {submission.error_message && (
                              <div className="mt-1 text-sm text-loss">
                                {submission.error_message}
                              </div>
                            )}
                          </div>
                          <Field label="When" value={ago(submission.submitted_at)} />
                          <Field label="Submission" value={`#${submission.submission_number}`} />
                          <Field
                            label="PnL"
                            value={run?.final_pnl == null ? "—" : formatNumber(run.final_pnl)}
                            tone={
                              run?.final_pnl == null
                                ? ""
                                : run.final_pnl >= 0
                                  ? "text-profit"
                                  : "text-loss"
                            }
                          />
                          <button
                            onClick={() => void downloadAlgorithm(submission)}
                            aria-label={`Download ${submission.file_name}`}
                            className="grid size-12 place-items-center rounded-full bg-neon/30"
                          >
                            <Download className="size-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-primary-foreground/70">
                    No submissions yet. Upload your first algorithm above.
                  </p>
                )
              ) : (
                <p className="text-center text-primary-foreground/70">
                  Sign in and join or create a team to view and submit algorithms.
                </p>
              )}
            </div>
          )}

          {tab === "Challenge" && (
            <div className="space-y-4 p-10 text-lg">
              <h2 className="text-gradient-neon font-display text-5xl font-bold uppercase">
                Round 1 — Market Making
              </h2>
              <p>
                Trade three products on the colony exchange: <b>RESIN</b>, <b>KELP</b> and{" "}
                <b>SQUID INK</b>. Your{" "}
                <code className="font-mono text-neon-soft">Trader.run()</code> receives an order
                book snapshot each tick and returns orders.
              </p>
              <ul className="list-disc space-y-1 pl-6 text-primary-foreground/80">
                <li>Position limit: 50 per product</li>
                <li>1,000 ticks per simulated day, 3 days</li>
                <li>Score = total marked-to-market PnL in SeaShells</li>
              </ul>
              <div className="rounded-2xl border border-glass-line bg-panel-inner p-6 text-base">
                <h3 className="font-display text-xl font-bold uppercase">Market data</h3>
                {!user ? (
                  <p className="mt-2 text-sm text-primary-foreground/70">
                    Sign in to load participant market data.
                  </p>
                ) : marketSummary ? (
                  <div className="mt-3 space-y-2 text-sm text-primary-foreground/80">
                    <p>{marketSummary.rowCount?.toLocaleString() ?? "—"} market rows loaded</p>
                    <p>
                      Trading days:{" "}
                      {marketSummary.days.length ? marketSummary.days.join(", ") : "—"}
                    </p>
                    <p>
                      Products:{" "}
                      {marketSummary.products.length ? marketSummary.products.join(", ") : "—"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-primary-foreground/70">Loading market data…</p>
                )}
              </div>
            </div>
          )}

          {tab === "Performance" && (
            <Performance
              team={team}
              bestRun={bestRun}
              teamLeaderboard={teamLeaderboard}
              leaderboard={leaderboard}
              pnlPoints={pnlPoints}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function AuthPanel({
  email,
  password,
  isSignUp,
  busy,
  onEmail,
  onPassword,
  onMode,
  onSubmit,
}: {
  email: string;
  password: string;
  isSignUp: boolean;
  busy: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onMode: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-glass-line bg-panel-inner p-6 pl-24"
    >
      <h3 className="font-display text-2xl font-bold uppercase">
        {isSignUp ? "Create account" : "Sign in"}
      </h3>
      <label className="mt-4 block text-sm text-primary-foreground/70">
        Email
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-glass-line bg-panel-head px-3 py-2 text-primary-foreground"
        />
      </label>
      <label className="mt-3 block text-sm text-primary-foreground/70">
        Password
        <input
          required
          type="password"
          minLength={6}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-glass-line bg-panel-head px-3 py-2 text-primary-foreground"
        />
      </label>
      <button
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-neon px-4 py-2 font-semibold text-background disabled:opacity-60"
      >
        {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={onMode}
        className="mt-3 w-full text-sm text-primary-foreground/70 underline"
      >
        {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  );
}

function TeamPanel({
  teamName,
  busy,
  onTeamName,
  onCreate,
  onJoin,
}: {
  teamName: string;
  busy: boolean;
  onTeamName: (value: string) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-glass-line bg-panel-inner p-6 pl-24">
      <h3 className="font-display text-2xl font-bold uppercase">Choose your team</h3>
      <label className="mt-4 block text-sm text-primary-foreground/70">
        Team name
        <input
          required
          value={teamName}
          onChange={(event) => onTeamName(event.target.value)}
          className="mt-1 w-full rounded-lg border border-glass-line bg-panel-head px-3 py-2 text-primary-foreground"
        />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <form onSubmit={onJoin}>
          <button
            disabled={busy}
            className="w-full rounded-lg border border-glass-line px-3 py-2 disabled:opacity-60"
          >
            Join team
          </button>
        </form>
        <form onSubmit={onCreate}>
          <button
            disabled={busy}
            className="w-full rounded-lg bg-neon px-3 py-2 font-semibold text-background disabled:opacity-60"
          >
            Create team
          </button>
        </form>
      </div>
      <p className="mt-3 text-xs text-primary-foreground/60">
        Joining requires the exact team name.
      </p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-2xl border border-glass-line bg-panel-inner pl-24">
      <Loader2 className="size-10 animate-spin text-neon" />
    </div>
  );
}

function Notice({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mx-8 mt-6 rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-loss/50 bg-loss/10 text-loss" : "border-profit/50 bg-profit/10 text-profit"}`}
    >
      {text}
    </div>
  );
}

function Field({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-28 border-l border-neon pl-6">
      <div className="text-primary-foreground/70">{label}</div>
      <div className={`mt-1 font-medium ${tone}`}>{value}</div>
    </div>
  );
}

function formatNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

function Performance({
  team,
  bestRun,
  teamLeaderboard,
  leaderboard,
  pnlPoints,
}: {
  team: Team | null;
  bestRun: Run | undefined;
  teamLeaderboard: LeaderboardEntry | undefined;
  leaderboard: LeaderboardEntry[];
  pnlPoints: PnlPoint[];
}) {
  const values = pnlPoints.flatMap((point) => (point.pnl == null ? [] : [point.pnl]));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const chart = values
    .map((value, index) => {
      const x = values.length < 2 ? 50 : (index / (values.length - 1)) * 100;
      const y = 55 - ((value - min) / span) * 50;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="p-10">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Best score"
          value={bestRun?.score == null ? "—" : formatNumber(bestRun.score)}
        />
        <Metric
          label="Final PnL"
          value={bestRun?.final_pnl == null ? "—" : formatNumber(bestRun.final_pnl)}
        />
        <Metric
          label="Leaderboard rank"
          value={teamLeaderboard?.rank == null ? "—" : `#${teamLeaderboard.rank}`}
        />
      </div>
      <div className="mt-6 rounded-2xl border border-glass-line bg-panel-inner p-6">
        <div className="mb-2 text-sm text-primary-foreground/70">Simulation PnL by step</div>
        {chart ? (
          <svg
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            aria-label="Simulation PnL chart"
            role="img"
            className="h-56 w-full"
          >
            <polyline points={chart} fill="none" stroke="var(--profit)" strokeWidth="0.8" />
          </svg>
        ) : (
          <p className="py-16 text-center text-sm text-primary-foreground/70">
            {team
              ? "No completed simulation step data is available yet."
              : "Sign in and join a team to view your simulation history."}
          </p>
        )}
      </div>
      <div className="mt-6 rounded-2xl border border-glass-line bg-panel-inner p-6">
        <h3 className="font-display text-xl font-bold uppercase">Leaderboard</h3>
        {leaderboard.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-primary-foreground/60">
                <tr>
                  <th className="pb-3">Rank</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Final PnL</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.team_id}
                    className={entry.team_id === team?.id ? "text-neon-soft" : ""}
                  >
                    <td className="border-t border-glass-line py-3">
                      {entry.rank == null ? "—" : `#${entry.rank}`}
                    </td>
                    <td className="border-t border-glass-line py-3">
                      {entry.team_name ?? "Unknown team"}
                    </td>
                    <td className="border-t border-glass-line py-3">
                      {entry.score == null ? "—" : entry.score.toLocaleString()}
                    </td>
                    <td className="border-t border-glass-line py-3">
                      {entry.final_pnl == null ? "—" : formatNumber(entry.final_pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-primary-foreground/70">
            No completed graded submissions yet.
          </p>
        )}
      </div>
      {!team && <CheckCircle2 className="sr-only" aria-hidden="true" />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-glass-line bg-panel-inner p-6">
      <div className="text-sm text-primary-foreground/70">{label}</div>
      <div className="mt-2 font-display text-4xl font-bold text-neon-soft">{value}</div>
    </div>
  );
}
