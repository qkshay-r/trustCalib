import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  XCircle,
  Info,
  Users,
  BrainCircuit,
  ChevronRight,
  Terminal,
  Check,
  Send,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
  Plus,
  BarChart3,
  History,
  ArrowLeft,
  Download,
  Database as DbIcon,
  Settings,
  Save,
  Edit2,
  Trash2,
  PlayCircle,
  ChevronDown
} from "lucide-react";
import { Stimulus, STIMULI } from "./stimuli";

type StudyStep = "DASHBOARD" | "IDENTIFY" | "CONSENT" | "INSTRUCTIONS" | "PRACTICE_INTRO" | "TASK" | "FINISHED" | "RESULTS" | "MANAGE_STIMULI" | "PRACTICE_COMPLETE";
type Condition = "BASELINE" | "SOCIAL" | "CONFIDENCE";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "code" | "text";
  stimulusIndex?: number;
}

interface ParticipantRecord {
  id: string;
  condition: string;
  experience: string;
  created_at: string;
}

interface TrialRecord {
  id?: string;
  participant_id: string;
  stimulus_id: string;
  trial_index: number;
  decision: string;
  response_time: number;
  correctness: number;
}

export default function App() {
  const [step, setStep] = useState<StudyStep>("DASHBOARD");
  const [participantId, setParticipantId] = useState("");
  const [condition, setCondition] = useState<Condition>("BASELINE");
  const [experience, setExperience] = useState("");
  const [currentTrial, setCurrentTrial] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);

  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [showDecisionButtons, setShowDecisionButtons] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [allParticipants, setAllParticipants] = useState<ParticipantRecord[]>([]);
  const [allTrials, setAllTrials] = useState<TrialRecord[]>([]);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [editingStimulus, setEditingStimulus] = useState<Stimulus | null>(null);

  useEffect(() => {
    fetchStimuli();
  }, []);

  const fetchStimuli = async () => {
    try {
      const res = await fetch("/api/stimuli");
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      setStimuli(data);
    } catch (error) {
      console.warn("API unavailable, using bundled stimuli");
      setStimuli(STIMULI);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchResults = async () => {
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      setAllParticipants(data.participants);
      setAllTrials(data.trials);
    } catch (error) {
      console.error("Failed to fetch results:", error);
    }
  };

  const initNewSession = () => {
    setParticipantId("");
    // Randomly assign condition
    const conditions: Condition[] = ["BASELINE", "SOCIAL", "CONFIDENCE"];
    setCondition(conditions[Math.floor(Math.random() * conditions.length)]);
    setStep("IDENTIFY");
    setCurrentTrial(0);
    setChatHistory([]);
    setResponses([]);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteParticipant = async (id: string) => {
    try {
      const res = await fetch(`/api/participants/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchResults();
      }
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete participant:", error);
      setDeletingId(null);
    }
  };

  const handleStartStudy = async () => {
    try {
      await fetch("/api/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: participantId, condition, experience }),
      });
      setStep("INSTRUCTIONS");
    } catch (error) {
      console.error("Failed to start session:", error);
      setStep("INSTRUCTIONS");
    }
  };

  const startTasks = () => {
    setStep("PRACTICE_INTRO");
  };

  const renderCue = (stimulusIndex: number) => {
    const stimulus = stimuli[stimulusIndex];
    if (!stimulus) return null;
    if (condition === "SOCIAL") {
      return (
        <div className="mt-2 text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          {stimulus.socialProof}% of developers accepted this response.
        </div>
      );
    } else if (condition === "CONFIDENCE") {
      const isHigh = stimulus.aiConfidence === "High";
      const isLow = stimulus.aiConfidence === "Low";
      return (
        <div className={`mt-2 text-[11px] font-bold flex items-center gap-1.5 ${isHigh ? "text-emerald-400" : isLow ? "text-rose-400" : "text-amber-400"
          }`}>
          {isHigh ? <CheckCircle className="w-3 h-3" /> : isLow ? <XCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {isHigh ? "✅ High Confidence" : isLow ? "❌ Low Confidence" : "⚠️ Medium Confidence"}
        </div>
      );
    }
    return null;
  };

  const loadTrial = (index: number) => {
    const stimulus = stimuli[index];
    if (!stimulus) return;
    setShowDecisionButtons(false);

    const userMsg: Message = {
      role: "user",
      content: `Can you write a ${stimulus.language} snippet that does the following: ${stimulus.explanation}`,
      type: "text"
    };
    setChatHistory([userMsg]);

    // No generation, use pre-defined code immediately
    const aiMsg: Message = {
      role: "assistant",
      content: stimulus.code,
      type: "code",
      stimulusIndex: index
    };

    setChatHistory(prev => [...prev, aiMsg]);
    setShowDecisionButtons(true);
    setStartTime(Date.now());
  };

  const handleDecision = async (decision: "ACCEPT" | "REJECT") => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const stimulus = stimuli[currentTrial];
    if (!stimulus) return;

    const trialData = {
      participant_id: participantId,
      trial_index: currentTrial,
      stimulus_id: stimulus.id,
      decision,
      response_time: responseTime,
      correctness: stimulus.isCorrect ? 1 : 0
    };

    try {
      await fetch("/api/submit-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trialData),
      });
    } catch (error) {
      console.error("Failed to submit trial:", error);
    }

    setResponses([...responses, trialData]);

    if (currentTrial < stimuli.length - 1) {
      const nextIndex = currentTrial + 1;

      // If we just finished practice trials and the next one is NOT practice
      if (stimulus.isPractice && !stimuli[nextIndex].isPractice) {
        setStep("PRACTICE_COMPLETE");
      } else {
        setCurrentTrial(nextIndex);
        loadTrial(nextIndex);
      }
    } else {
      setStep("FINISHED");
    }
  };

  const updateStimulus = async (s: Stimulus) => {
    try {
      await fetch("/api/stimuli/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      fetchStimuli();
      setEditingStimulus(null);
    } catch (error) {
      console.error("Failed to update stimulus:", error);
    }
  };

  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

  const getDecisionType = (decision: string, correctness: number) => {
    if (decision === "ACCEPT") {
      return correctness === 1 ? "True Positive" : "False Positive (Over-reliance)";
    } else {
      return correctness === 0 ? "True Negative" : "False Negative (Under-reliance)";
    }
  };

  const getDecisionIcon = (decision: string, correctness: number) => {
    if (decision === "ACCEPT") {
      return correctness === 1 ? "✓" : "✗";
    } else {
      return correctness === 0 ? "✓" : "✗";
    }
  };

  const getDecisionColor = (decision: string, correctness: number) => {
    if (decision === "ACCEPT") {
      return correctness === 1 ? "text-emerald-500" : "text-rose-500";
    } else {
      return correctness === 0 ? "text-emerald-500" : "text-rose-500";
    }
  };

  const calculateStats = (pTrials: TrialRecord[], pCondition?: string) => {
    if (pTrials.length === 0) return {
      accuracy: 0,
      avgTime: 0,
      acceptanceRate: 0,
      fpr: 0,
      fnr: 0,
      mismatchAccuracy: 0,
      cueFollowingRate: 0
    };

    // Main trials only (exclude practice)
    const mainTrials = pTrials.filter(t => {
      const stim = stimuli.find(s => s.id === t.stimulus_id);
      return stim && !stim.isPractice;
    }).sort((a, b) => a.trial_index - b.trial_index);

    if (mainTrials.length === 0) return {
      accuracy: 0,
      avgTime: 0,
      acceptanceRate: 0,
      fpr: 0,
      fnr: 0,
      mismatchAccuracy: 0,
      cueFollowingRate: 0
    };

    const tp = mainTrials.filter(t => t.decision === "ACCEPT" && t.correctness === 1).length;
    const tn = mainTrials.filter(t => t.decision === "REJECT" && t.correctness === 0).length;
    const fp = mainTrials.filter(t => t.decision === "ACCEPT" && t.correctness === 0).length;
    const fn = mainTrials.filter(t => t.decision === "REJECT" && t.correctness === 1).length;

    const total = mainTrials.length;
    const incorrectAI = fp + tn;
    const correctAI = tp + fn;

    // Mismatch Accuracy (Tasks 8, 9, 10)
    // Mismatch Accuracy (When correctness != trust cue)
    const mismatchTrials = mainTrials.filter(t => {
      const stim = stimuli.find(s => s.id === t.stimulus_id);
      if (!stim) return false;
      // High trust for incorrect code OR Low trust for correct code
      return (stim.aiConfidence === "High" && !stim.isCorrect) || (stim.aiConfidence === "Low" && stim.isCorrect);
    });

    const correctMismatch = mismatchTrials.filter(t =>
      (t.decision === "ACCEPT" && t.correctness === 1) ||
      (t.decision === "REJECT" && t.correctness === 0)
    ).length;

    // Cue Following Rate
    let cueFollowingCount = 0;
    let cueEligibleCount = 0;

    mainTrials.forEach(t => {
      const stim = stimuli.find(s => s.id === t.stimulus_id);
      if (!stim) return;

      if (pCondition === "SOCIAL") {
        cueEligibleCount++;
        if ((stim.socialProof > 50 && t.decision === "ACCEPT") || (stim.socialProof <= 50 && t.decision === "REJECT")) {
          cueFollowingCount++;
        }
      } else if (pCondition === "CONFIDENCE") {
        if (stim.aiConfidence !== "Medium") {
          cueEligibleCount++;
          if ((stim.aiConfidence === "High" && t.decision === "ACCEPT") || (stim.aiConfidence === "Low" && t.decision === "REJECT")) {
            cueFollowingCount++;
          }
        }
      }
    });

    const avgTime = mainTrials.reduce((acc, t) => acc + t.response_time, 0) / total;

    return {
      accuracy: (tp + tn) / total * 100,
      avgTime: Math.round(avgTime),
      acceptanceRate: (tp + fp) / total * 100,
      fpr: incorrectAI > 0 ? (fp / incorrectAI) * 100 : 0,
      fnr: correctAI > 0 ? (fn / correctAI) * 100 : 0,
      mismatchAccuracy: mismatchTrials.length > 0 ? (correctMismatch / mismatchTrials.length) * 100 : 0,
      cueFollowingRate: cueEligibleCount > 0 ? (cueFollowingCount / cueEligibleCount) * 100 : 0
    };
  };

  const getParticipantStats = (pId: string) => {
    const pTrials = allTrials.filter(t => t.participant_id === pId);
    const participant = allParticipants.find(p => p.id === pId);
    return calculateStats(pTrials, participant?.condition);
  };

  return (
    <div className="min-h-screen bg-claude-bg text-claude-text font-sans selection:bg-white selection:text-black">
      <header className="border-b border-claude-border p-4 flex justify-between items-center bg-claude-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="cursor-pointer" onClick={() => setStep("DASHBOARD")} />

        <div className="flex items-center gap-4">
          {step === "TASK" && (
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-mono uppercase tracking-widest border-none focus:ring-1 focus:ring-white/20 cursor-pointer appearance-none text-claude-text"
            >
              <option value="BASELINE">Baseline Mode</option>
              <option value="SOCIAL">Social Mode</option>
              <option value="CONFIDENCE">Confidence Mode</option>
            </select>
          )}
          {participantId && step !== "DASHBOARD" && step !== "RESULTS" && (
            <div className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
              {participantId}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        <AnimatePresence mode="wait">
          {step === "DASHBOARD" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h2 className="text-6xl font-serif italic tracking-tight">Study Dashboard</h2>
                <p className="text-xl opacity-50">Manage and conduct trust calibration experiments.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={initNewSession}
                  className="group p-8 bg-claude-card border border-claude-border text-claude-text rounded-3xl text-left hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col justify-between h-64"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif italic mb-2">New Session</h3>
                    <p className="text-sm opacity-60">Start a new study participant through the evaluation flow.</p>
                  </div>
                </button>

                <button
                  onClick={() => { fetchResults(); setStep("RESULTS"); }}
                  className="group p-8 bg-claude-card border border-claude-border text-claude-text rounded-3xl text-left hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col justify-between h-64 shadow-sm"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif italic mb-2">View Results</h3>
                    <p className="text-sm opacity-50">Analyze collected data from all completed sessions.</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep("MANAGE_STIMULI")}
                  className="group p-8 bg-claude-card border border-claude-border text-claude-text rounded-3xl text-left hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col justify-between h-64 shadow-sm"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif italic mb-2">Manage Stimuli</h3>
                    <p className="text-sm opacity-50">Edit questions, answers, and confidence levels.</p>
                  </div>
                </button>
              </div>

              <div className="p-8 bg-claude-card border border-claude-border rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-40">
                  <DbIcon className="w-3 h-3" /> System Status
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-2xl font-serif italic">Active</div>
                    <div className="text-[10px] font-mono uppercase opacity-40">Database Connection</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-serif italic">Gemini 3</div>
                    <div className="text-[10px] font-mono uppercase opacity-40">AI Engine</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-serif italic">{stimuli.length}</div>
                    <div className="text-[10px] font-mono uppercase opacity-40">Active Stimuli</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === "MANAGE_STIMULI" && (
            <motion.div
              key="manage_stimuli"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <button onClick={() => setStep("DASHBOARD")} className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                    <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                  </button>
                  <h2 className="text-5xl font-serif italic tracking-tight">Manage Stimuli</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {stimuli.map((s) => (
                  <div key={s.id} className="p-6 bg-claude-card border border-claude-border rounded-3xl shadow-sm space-y-4">
                    {editingStimulus?.id === s.id ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Question / Prompt</label>
                          <textarea
                            value={editingStimulus.explanation}
                            onChange={(e) => setEditingStimulus({ ...editingStimulus, explanation: e.target.value })}
                            className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-1 focus:ring-white/20 text-sm min-h-[100px] text-claude-text"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Code Snippet</label>
                          <textarea
                            value={editingStimulus.code}
                            onChange={(e) => setEditingStimulus({ ...editingStimulus, code: e.target.value })}
                            className="w-full p-4 bg-black/40 rounded-xl border border-white/10 focus:ring-1 focus:ring-white/20 text-xs font-mono min-h-[150px] text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Language</label>
                            <input
                              type="text"
                              value={editingStimulus.language}
                              onChange={(e) => setEditingStimulus({ ...editingStimulus, language: e.target.value })}
                              className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-1 focus:ring-white/20 text-sm text-claude-text"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">AI Confidence</label>
                            <select
                              value={editingStimulus.aiConfidence}
                              onChange={(e) => setEditingStimulus({ ...editingStimulus, aiConfidence: e.target.value as any })}
                              className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-1 focus:ring-white/20 text-sm text-claude-text"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Correctness</label>
                            <select
                              value={editingStimulus.isCorrect ? "true" : "false"}
                              onChange={(e) => setEditingStimulus({ ...editingStimulus, isCorrect: e.target.value === "true" })}
                              className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-1 focus:ring-white/20 text-sm text-claude-text"
                            >
                              <option value="true">Correct</option>
                              <option value="false">Incorrect (Buggy)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Trial Type</label>
                            <select
                              value={editingStimulus.isPractice ? "true" : "false"}
                              onChange={(e) => setEditingStimulus({ ...editingStimulus, isPractice: e.target.value === "true" })}
                              className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-1 focus:ring-white/20 text-sm text-claude-text"
                            >
                              <option value="false">Main Study</option>
                              <option value="true">Practice Trial</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => updateStimulus(editingStimulus)}
                            className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl text-sm font-medium hover:bg-emerald-600 hover:text-white transition-all"
                          >
                            <Save className="w-4 h-4" /> Save Changes
                          </button>
                          <button
                            onClick={() => setEditingStimulus(null)}
                            className="px-6 py-3 bg-white/5 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">{s.id} • {s.language}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${s.isCorrect ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {s.isCorrect ? "Correct" : "Buggy"}
                            </span>
                            <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-mono uppercase opacity-60">
                              Confidence: {s.aiConfidence}
                            </span>
                            {s.isPractice && (
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-mono uppercase">
                                Practice
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-80 leading-relaxed">{s.explanation}</p>
                          <pre className="p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono overflow-x-auto">
                            <code>{s.code}</code>
                          </pre>
                        </div>
                        <button
                          onClick={() => setEditingStimulus(s)}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                        >
                          <Edit2 className="w-4 h-4 opacity-40" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === "RESULTS" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <button onClick={() => setStep("DASHBOARD")} className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                    <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                  </button>
                  <h2 className="text-5xl font-serif italic tracking-tight">Study Results</h2>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full text-[10px] font-mono uppercase tracking-widest hover:bg-black/10 transition-colors">
                  <Download className="w-3 h-3" /> Export CSV
                </button>
              </div>

              <div className="bg-claude-card border border-claude-border rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-mono uppercase tracking-widest opacity-40">
                      <th className="p-4 font-medium">Participant ID</th>
                      <th className="p-4 font-medium">Condition</th>
                      <th className="p-4 font-medium">Experience</th>
                      <th className="p-4 font-medium">Accuracy</th>
                      <th className="p-4 font-medium">Avg Latency</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center opacity-30 italic">No sessions recorded yet.</td>
                      </tr>
                    ) : (
                      allParticipants.map(p => {
                        const stats = getParticipantStats(p.id);
                        const pTrials = allTrials.filter(t => t.participant_id === p.id).sort((a, b) => a.trial_index - b.trial_index);
                        const isExpanded = expandedParticipant === p.id;

                        return (
                          <React.Fragment key={p.id}>
                            <tr
                              className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                              onClick={() => setExpandedParticipant(isExpanded ? null : p.id)}
                            >
                              <td className="p-4 font-mono text-xs flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="w-3 h-3 opacity-40" /> : <ChevronRight className="w-3 h-3 opacity-40" />}
                                {p.id}
                              </td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono uppercase tracking-tighter">
                                  {p.condition}
                                </span>
                              </td>
                              <td className="p-4 text-sm opacity-60">{p.experience}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-white" style={{ width: `${stats.accuracy}%` }} />
                                  </div>
                                  <span className="text-xs font-bold">{Math.round(stats.accuracy)}%</span>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-mono opacity-60">{(stats.avgTime / 1000).toFixed(2)}s</td>
                              <td className="p-4 text-[10px] opacity-40">{new Date(p.created_at).toLocaleDateString()}</td>
                              <td className="p-4 text-right">
                                {deletingId === p.id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteParticipant(p.id); }}
                                      className="px-2 py-1 bg-rose-600 text-white text-[10px] uppercase tracking-widest rounded-md hover:bg-rose-700 transition-colors"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                      className="px-2 py-1 bg-white/5 text-[10px] uppercase tracking-widest rounded-md hover:bg-white/10 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }}
                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    title="Delete Session"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0 bg-black/20">
                                  <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-5 gap-4">
                                      <div className="p-4 bg-white/5 rounded-2xl space-y-1">
                                        <div className="text-[10px] font-mono uppercase opacity-40">Acceptance Rate</div>
                                        <div className="text-xl font-serif italic">{Math.round(stats.acceptanceRate)}%</div>
                                      </div>
                                      <div className="p-4 bg-white/5 rounded-2xl space-y-1">
                                        <div className="text-[10px] font-mono uppercase opacity-40">False Positive Rate</div>
                                        <div className="text-xl font-serif italic text-rose-400">{Math.round(stats.fpr)}%</div>
                                      </div>
                                      <div className="p-4 bg-white/5 rounded-2xl space-y-1">
                                        <div className="text-[10px] font-mono uppercase opacity-40">False Negative Rate</div>
                                        <div className="text-xl font-serif italic text-rose-400">{Math.round(stats.fnr)}%</div>
                                      </div>
                                      <div className="p-4 bg-white/5 rounded-2xl space-y-1">
                                        <div className="text-[10px] font-mono uppercase opacity-40">Mismatch Accuracy</div>
                                        <div className="text-xl font-serif italic">{Math.round(stats.mismatchAccuracy)}%</div>
                                      </div>
                                      <div className="p-4 bg-white/5 rounded-2xl space-y-1">
                                        <div className="text-[10px] font-mono uppercase opacity-40">Cue-Following Rate</div>
                                        <div className="text-xl font-serif italic">{Math.round(stats.cueFollowingRate)}%</div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40">Trial Breakdown</h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {pTrials.map((t, idx) => {
                                          const stim = stimuli.find(s => s.id === t.stimulus_id);
                                          return (
                                            <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-xs">
                                              <div className="flex items-center gap-4">
                                                <span className="opacity-30 font-mono">#{idx + 1}</span>
                                                <div className="space-y-1">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">{stim?.language || t.stimulus_id}</span>
                                                    <span className={`font-bold ${getDecisionColor(t.decision, t.correctness)}`}>
                                                      {t.decision} {getDecisionIcon(t.decision, t.correctness)}
                                                    </span>
                                                  </div>
                                                  <div className="opacity-50 text-[10px]">
                                                    {getDecisionType(t.decision, t.correctness)}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right space-y-1">
                                                <div className="font-mono">{t.response_time}ms</div>
                                                <div className="text-[9px] opacity-30 uppercase tracking-wider">Latency</div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {step === "IDENTIFY" && (
            <motion.div
              key="identify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-md mx-auto space-y-12 py-12"
            >
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 opacity-40" />
                </div>
                <h2 className="text-4xl font-serif italic tracking-tight">Participant ID</h2>
                <p className="text-sm opacity-50">Please enter the assigned participant identifier to begin.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Identifier</label>
                  <input
                    type="text"
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    placeholder="e.g. P_101"
                    className="w-full p-5 bg-claude-card border border-claude-border rounded-2xl shadow-sm focus:ring-2 focus:ring-white/5 focus:border-white/20 outline-none transition-all text-lg font-mono text-claude-text"
                    autoFocus
                  />
                </div>
                <button
                  disabled={!participantId.trim()}
                  onClick={() => setStep("CONSENT")}
                  className="w-full group flex items-center justify-center gap-3 bg-white text-black py-5 rounded-2xl text-lg font-medium hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-20 disabled:translate-y-0 disabled:shadow-none"
                >
                  Continue <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "CONSENT" && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="space-y-6">
                <h2 className="text-5xl font-serif italic tracking-tight">Participant Consent</h2>
                <div className="h-px w-24 bg-white/20" />
                <div className="prose prose-invert max-w-none text-lg leading-relaxed opacity-80">
                  <p>You are invited to participate in a research study investigating how developers interact with AI-powered coding assistants.</p>
                  <p>In this session, you will evaluate <strong>{stimuli.length} AI-generated code snippets</strong> for various programming tasks. Your goal is to determine if the AI's code is technically sound or contains errors.</p>
                  <p>The first 2 tasks are practice trials to help you get familiar with the interface.</p>
                </div>
              </div>
              <button
                onClick={handleStartStudy}
                className="group flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full text-lg font-medium hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                Begin Study <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === "INSTRUCTIONS" && (
            <motion.div
              key="instr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <h2 className="text-5xl font-serif italic tracking-tight">Instructions</h2>
              <div className="space-y-8">
                {[
                  "The AI will present a code snippet based on a user request.",
                  "Carefully review the code. The AI is not always correct.",
                  "The first 2 tasks are practice trials to help you get familiar with the interface.",
                  "Decide whether to Accept or Reject the generated code."
                ].map((text, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shrink-0 font-mono text-xs opacity-40">
                      0{i + 1}
                    </div>
                    <p className="text-xl leading-snug opacity-80">{text}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={startTasks}
                className="group flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full text-lg font-medium hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                Start Evaluation <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === "PRACTICE_INTRO" && (
            <motion.div
              key="practice_intro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-12 py-12 text-center"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PlayCircle className="w-10 h-10" />
                </div>
                <h2 className="text-5xl font-serif italic tracking-tight">Practice Session</h2>
                <p className="text-lg opacity-50">You will now begin with 2 practice trials to get familiar with the interface.</p>
              </div>
              <div className="p-8 bg-claude-card border border-claude-border rounded-3xl text-left space-y-4 shadow-xl">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-400" />
                  What to expect
                </h3>
                <p className="text-base leading-relaxed opacity-70">
                  During these practice trials, your responses will not be recorded for the final study.
                  Use this time to understand how the AI responses are presented and how to use the Accept/Reject buttons.
                </p>
              </div>
              <button
                onClick={() => {
                  setStep("TASK");
                  loadTrial(0);
                }}
                className="group flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full text-lg font-medium hover:shadow-2xl hover:-translate-y-1 transition-all mx-auto"
              >
                Start Practice <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === "TASK" && (
            <motion.div
              key="task"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col min-h-[70vh]"
            >
              <div className="fixed top-[72px] left-0 right-0 h-1 bg-white/5 z-40">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentTrial + 1) / stimuli.length) * 100}%` }}
                />
              </div>

              <div className="flex-1 space-y-8 pb-32">
                {stimuli[currentTrial]?.isPractice && (
                  <div className="flex justify-center">
                    <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-mono uppercase tracking-widest border border-blue-500/20">
                      Practice Trial
                    </span>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-white/5" : "bg-white text-black"
                      }`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "text-right" : ""}`}>
                      <div className="text-[9px] font-mono uppercase tracking-widest opacity-30">
                        {msg.role === "user" ? "Participant" : "AI Assistant"}
                      </div>
                      <div className={`p-5 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                        ? "bg-claude-card border border-claude-border shadow-sm"
                        : "bg-claude-card border border-claude-border shadow-md"
                        }`}>
                        {msg.type === "code" ? (
                          <pre className="font-mono text-xs bg-black/40 text-white p-4 rounded-xl overflow-x-auto text-left border border-white/5">
                            <code>{msg.content}</code>
                          </pre>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        {msg.stimulusIndex !== undefined && renderCue(msg.stimulusIndex)}
                      </div>
                    </div>
                  </motion.div>
                ))}

                <div ref={chatEndRef} />
              </div>

              {showDecisionButtons && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  className="fixed bottom-0 left-0 right-0 p-6 bg-claude-bg/80 backdrop-blur-xl border-t border-claude-border z-50"
                >
                  <div className="max-w-3xl mx-auto space-y-4">
                    <p className="text-center text-xs font-medium opacity-40 uppercase tracking-widest">
                      Do you accept or reject this code?
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleDecision("REJECT")}
                        className="flex-1 flex items-center justify-center gap-3 bg-claude-card border-2 border-claude-border py-4 rounded-2xl font-bold hover:bg-rose-500/10 hover:border-rose-600 hover:text-rose-600 transition-all active:scale-95"
                      >
                        <XCircle className="w-5 h-5" /> Reject
                      </button>
                      <button
                        onClick={() => handleDecision("ACCEPT")}
                        className="flex-1 flex items-center justify-center gap-3 bg-claude-card border-2 border-claude-border py-4 rounded-2xl font-bold hover:bg-emerald-500/10 hover:border-emerald-600 hover:text-emerald-600 transition-all active:scale-95"
                      >
                        <CheckCircle className="w-5 h-5" /> Accept
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === "PRACTICE_COMPLETE" && (
            <motion.div
              key="practice_complete"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-12 py-12 text-center"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-5xl font-serif italic tracking-tight">Practice Complete</h2>
                <p className="text-lg opacity-50">You've finished the practice trials. The main study will now begin.</p>
              </div>
              <div className="p-8 bg-claude-card border border-claude-border rounded-3xl text-left space-y-4 shadow-xl">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Important Note
                </h3>
                <p className="text-base leading-relaxed opacity-70">
                  From now on, your responses will be recorded as part of the main data collection.
                  Please continue to evaluate the code snippets as accurately and efficiently as possible.
                </p>
              </div>
              <button
                onClick={() => {
                  const nextIndex = currentTrial + 1;
                  setCurrentTrial(nextIndex);
                  setStep("TASK");
                  loadTrial(nextIndex);
                }}
                className="group flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full text-lg font-medium hover:shadow-2xl hover:-translate-y-1 transition-all mx-auto"
              >
                Start Main Study <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === "FINISHED" && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-12 py-12"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/10 text-emerald-400">
                <Check className="w-10 h-10" />
              </div>
              <div className="space-y-4">
                <h2 className="text-6xl font-serif italic tracking-tight">Study Complete</h2>
                <p className="text-xl opacity-50">Your participation is greatly appreciated.</p>
              </div>

              <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const stats = calculateStats(responses, condition);
                  return (
                    <>
                      <div className="p-6 bg-claude-card border border-claude-border rounded-3xl space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-40">Accuracy</div>
                        <div className="text-3xl font-serif italic">{Math.round(stats.accuracy)}%</div>
                      </div>
                      <div className="p-6 bg-claude-card border border-claude-border rounded-3xl space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-40">Acceptance Rate</div>
                        <div className="text-3xl font-serif italic">{Math.round(stats.acceptanceRate)}%</div>
                      </div>
                      <div className="p-6 bg-claude-card border border-claude-border rounded-3xl space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-40">Avg Latency</div>
                        <div className="text-3xl font-serif italic">{stats.avgTime}ms</div>
                      </div>
                      <div className="p-6 bg-claude-card border border-claude-border rounded-3xl space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-40">Mismatch Acc.</div>
                        <div className="text-3xl font-serif italic">{Math.round(stats.mismatchAccuracy)}%</div>
                      </div>
                      <div className="p-6 bg-claude-card border border-claude-border rounded-3xl space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-40">FP Rate</div>
                        <div className="text-3xl font-serif italic text-rose-400">{Math.round(stats.fpr)}%</div>
                      </div>
                      <div className="p-6 bg-claude-card border border-claude-border rounded-3xl space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-40">FN Rate</div>
                        <div className="text-3xl font-serif italic text-rose-400">{Math.round(stats.fnr)}%</div>
                      </div>
                      <div className="p-6 bg-claude-card border border-claude-border rounded-3xl space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-40">Cue Following</div>
                        <div className="text-3xl font-serif italic">{Math.round(stats.cueFollowingRate)}%</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="max-w-md mx-auto p-8 bg-claude-card rounded-3xl border border-claude-border text-left space-y-6 shadow-xl">
                <div className="flex items-center gap-3 text-claude-text">
                  <Info className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Debriefing</h3>
                </div>
                <p className="text-base leading-relaxed opacity-70">
                  This study investigated how trust cues (like social proof and AI confidence indicators) affect how programmers evaluate AI assistance.
                  We are looking at whether these cues help or hinder your ability to spot errors in AI-generated code.
                </p>
              </div>
              <button
                onClick={() => setStep("DASHBOARD")}
                className="text-[10px] font-mono uppercase tracking-widest border-b border-white/20 pb-1 hover:opacity-50 transition-opacity"
              >
                Return to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-none z-50">
        {step === "TASK" && (
          <div className="bg-claude-card/80 backdrop-blur-md border border-claude-border px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest opacity-40">
            Trial {currentTrial + 1} / {stimuli.length}
          </div>
        )}

      </footer>
    </div>
  );
}
