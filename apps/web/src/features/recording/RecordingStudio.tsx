import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../api";
import {
  COACH_MESSAGES,
  PRECHECK,
  precheck,
  type PrecheckCode,
} from "./precheck";
import {
  BrowserMediaRecorder,
  type RecordingResult,
} from "../../integrations/recorder/BrowserMediaRecorder";
import { createCoach } from "../../integrations/realtime/createCoach";
import { Status, Waveform, VolumeMeter, EmptyState } from "../../shared/ui/components";
import { useToast } from "../../shared/ui/Toast";
import type {
  NextAction,
  RecordingItem,
  Session,
} from "../../types/domain";

type PipelineState =
  | "IDLE"
  | "PREPARING_TASK"
  | "COACH_SPEAKING_INSTRUCTION"
  | "WAITING_FOR_USER_SPEECH"
  | "RECORDING"
  | "LOCAL_PRECHECK"
  | "UPLOAD_INIT"
  | "PRESIGNED_PUT"
  | "UPLOAD_COMPLETE"
  | "WAITING_FASTCHECK"
  | "FASTCHECK_RETAKE_NOW"
  | "FASTCHECK_CONTINUE_NEXT"
  | "COACH_SPEAKING_FEEDBACK"
  | "AUTO_ADVANCE_NEXT_ITEM"
  | "WAIT_DEEPCHECK"
  | "WAITING_FOR_RECORDING"
  | "SESSION_SUMMARY"
  | "PAUSED"
  | "PIPELINE_ERROR";

type PipelineEvent =
  | "SESSION_START_REQUEST"
  | "SESSION_START_RESPONSE"
  | "REALTIME_STATUS"
  | "NEXT_ACTION_REQUEST"
  | "NEXT_ACTION_RESPONSE"
  | "ITEM_LOADED"
  | "RECORDING_STARTED"
  | "RECORDING_STOPPED"
  | "PRECHECK_STARTED"
  | "PRECHECK_PASSED"
  | "PRECHECK_FAILED"
  | "UPLOAD_INIT_STARTED"
  | "UPLOAD_INIT_DONE"
  | "PRESIGNED_PUT_STARTED"
  | "PRESIGNED_PUT_DONE"
  | "PRESIGNED_PUT_FAILED"
  | "UPLOAD_COMPLETE_STARTED"
  | "UPLOAD_COMPLETE_DONE"
  | "FASTCHECK_RESULT_RECEIVED"
  | "AUTO_ADVANCE_NEXT_ITEM"
  | "SESSION_COMPLETE_REQUESTED"
  | "SESSION_COMPLETE_CONFIRMED"
  | "PIPELINE_ERROR";

interface Props {
  campaignId: string;
}

function deadline<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

const STATE_LABELS: Partial<Record<PipelineState, string>> = {
  IDLE: "Idle",
  PREPARING_TASK: "Preparing task…",
  COACH_SPEAKING_INSTRUCTION: "Coach speaking",
  WAITING_FOR_USER_SPEECH: "Waiting for speech",
  RECORDING: "Recording",
  LOCAL_PRECHECK: "Checking audio…",
  UPLOAD_INIT: "Initialising upload…",
  PRESIGNED_PUT: "Uploading…",
  UPLOAD_COMPLETE: "Completing upload…",
  WAITING_FASTCHECK: "FastCheck…",
  FASTCHECK_RETAKE_NOW: "Retake needed",
  FASTCHECK_CONTINUE_NEXT: "Passed ✓",
  COACH_SPEAKING_FEEDBACK: "Coach feedback",
  AUTO_ADVANCE_NEXT_ITEM: "Advancing…",
  WAIT_DEEPCHECK: "DeepCheck queued",
  WAITING_FOR_RECORDING: "Session active",
  SESSION_SUMMARY: "Session complete",
  PAUSED: "Paused",
  PIPELINE_ERROR: "Pipeline error",
};

export function RecordingStudio({ campaignId }: Props) {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [item, setItem] = useState<RecordingItem | null>(null);
  const [machine, setMachine] = useState<PipelineState>("IDLE");
  const [message, setMessage] = useState("Choose an active campaign and start the studio.");
  const [level, setLevel] = useState(-100);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [retakes, setRetakes] = useState(0);
  const [lastCheck, setLastCheck] = useState<Record<string, unknown> | null>(null);
  const [micState, setMicState] = useState("not connected");
  const [coachProvider, setCoachProvider] = useState("Coach unavailable");
  const [coachError, setCoachError] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ at: string; event: PipelineEvent; detail?: string }>>([]);

  const recorder = useRef(new BrowserMediaRecorder());
  const coach = useMemo(createCoach, []);
  const captureActive = useRef(false);
  const noSpeechTimer = useRef<number | undefined>(undefined);
  const silenceTimer = useRef<number | undefined>(undefined);
  const clock = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const paused = useRef(false);

  useEffect(
    () => {
      const unsubscribe = coach.onConnectionStateChange((state) => {
        log("REALTIME_STATUS", state);
        if (state.startsWith("AGENT_WAITING")) setCoachProvider("Waiting for Agora Agent Studio…");
        if (state.startsWith("AGENT_CONNECTED")) { setCoachProvider("Agora Agent Studio connected"); setCoachError(null); }
        if (state.startsWith("AGENT_AUDIO_SUBSCRIBED")) { setCoachProvider("Agora Agent Studio audio subscribed"); setCoachError(null); }
        if (state.startsWith("AGENT_NOT_DETECTED")) { setCoachProvider("Agora Agent Studio failed"); setCoachError("Agent not detected in RTC channel"); }
        if (state.startsWith("AGENT_LEFT_FAILED")) { setCoachProvider("Agora Agent Studio failed"); setCoachError("Agent left the RTC channel"); }
        if (state.startsWith("AGENT_LEFT_FALLBACK")) setCoachProvider("Browser TTS fallback (explicitly allowed)");
      });
      return () => {
        unsubscribe();
        clearTimers();
        coach.leaveSession().catch(() => {});
      };
    },
    [coach],
  );

  function log(event: PipelineEvent, detail?: string) {
    const entry = { at: new Date().toLocaleTimeString(), event, detail };
    console.info("[VoiceTurk pipeline]", entry);
    setEvents((v) => [entry, ...v].slice(0, 30));
  }

  function clearTimers() {
    if (noSpeechTimer.current) clearTimeout(noSpeechTimer.current);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (clock.current) clearInterval(clock.current);
  }

  async function startSession() {
    if (!campaignId) {
      toast("Select an active campaign first.", "warning");
      return;
    }
    try {
      log("SESSION_START_REQUEST", campaignId);
      const value = await api.startSession(campaignId);
      log("SESSION_START_RESPONSE", `${value.session_id} · ${value.items.length} items`);
      setSession(value);
      setCoachError(null);
      if (value.realtime.coach_provider === "agora_agent") {
        setCoachProvider("Waiting for Agora Agent Studio…");
      } else if (value.realtime.coach_provider === "agora_agent_failed") {
        setCoachProvider("Agora Agent Studio failed");
        setCoachError(`${value.realtime.agent_join_error_code ?? "AGENT_JOIN_FAILED"}: ${value.realtime.agent_join_message ?? "Unknown error"}`);
      }
      setMicState(value.realtime.provider === "agora" ? "Agora connecting" : "browser microphone");
      const joined = await deadline(coach.joinSession({ session_id: value.session_id, realtime: value.realtime }), 20000, "REALTIME_JOIN");
      setMicState(joined.rtcJoined && joined.micPublished ? "Agora RTC · mic published" : "browser microphone");
      const providerLabel = joined.voiceProvider === "agora_agent" && joined.agentAudioSubscribed ? "Agora Agent Studio audio subscribed" :
        joined.voiceProvider === "agora_agent" ? "Agora Agent Studio connected" :
        joined.voiceProvider === "agora_agent_failed" ? "Agora Agent Studio failed" :
        joined.voiceProvider === "browser_tts_fallback" ? "Browser TTS fallback (explicitly allowed)" :
        joined.voiceProvider === "browser_tts" ? "Browser TTS" : "Coach unavailable · text only";
      setCoachProvider(providerLabel);
      if (joined.voiceProvider === "agora_agent_failed") setCoachError(joined.warning ?? value.realtime.agent_join_message ?? "Agora Agent Studio failed");
      log("REALTIME_STATUS", `${joined.transport} · joined=${joined.rtcJoined} · mic=${joined.micPublished} · ${joined.voiceProvider}`);
      await loadNext(value.session_id);
    } catch (error) {
      await pipelineError(error);
    }
  }

  async function loadNext(sessionId = session?.session_id) {
    if (!sessionId) return;
    try {
      setMachine("PREPARING_TASK");
      log("NEXT_ACTION_REQUEST", sessionId);
      const action: NextAction = await api.nextAction(sessionId);
      log("NEXT_ACTION_RESPONSE", `${action.action} · ${action.debug?.reason ?? ""}`);
      setProgress(action.progress);
      setRetakes(action.retake_count);
      setMessage(action.coach_message_vi);

      if (action.action === "START_ITEM") {
        setItem(action.item);
        log("ITEM_LOADED", action.item?.item_id);
        await prepareTask(action.item!);
      } else if (action.action === "RETAKE_ITEM") {
        setItem(action.item);
        log("ITEM_LOADED", action.item?.item_id);
        await deadline(coach.speakFeedback(action.coach_message_vi, action.feedback_context), 10000, "COACH_RETAKE_CONTEXT");
        await prepareTask(action.item!);
      } else if (action.action === "WAIT_DEEPCHECK") {
        setMachine("WAIT_DEEPCHECK");
        setTimeout(() => loadNext(sessionId), 1000);
      } else if (action.action === "WAITING_FOR_RECORDING") {
        setItem(null);
        setMachine("WAITING_FOR_RECORDING");
        await deadline(coach.speak(action.coach_message_vi), 10000, "COACH_WAITING");
      } else if (action.action === "SESSION_COMPLETE") {
        log("SESSION_COMPLETE_REQUESTED", "backend_session_complete");
        await api.completeSession(sessionId);
        log("SESSION_COMPLETE_CONFIRMED");
        setItem(null);
        setMachine("SESSION_SUMMARY");
        await deadline(coach.speak(action.coach_message_vi), 10000, "COACH_FEEDBACK");
      } else {
        throw new Error(`Backend error: ${action.debug?.reason ?? action.coach_message_vi}`);
      }
    } catch (error) {
      await pipelineError(error);
    }
  }

  async function prepareTask(next: RecordingItem) {
    setItem(next);
    coach.setCurrentTaskContext(next);
    setMachine("COACH_SPEAKING_INSTRUCTION");
    const instruction = `Hãy đọc câu sau với cảm xúc ${next.target_emotion}: ${next.transcript}`;
    setMessage(instruction);
    try {
      await deadline(coach.speak(instruction), 10000, "COACH_INSTRUCTION");
      if (!paused.current) await startCapture();
    } catch (error) {
      await pipelineError(error);
    }
  }

  async function startCapture() {
    try {
      setMachine("WAITING_FOR_USER_SPEECH");
      setElapsed(0);
      startedAt.current = performance.now();
      captureActive.current = true;
      await recorder.current.start({
        onLevel: setLevel,
        onMuted: () => failImmediate("MIC_MUTED"),
        onSpeechStart: () => {
          setMachine("RECORDING");
          if (noSpeechTimer.current) clearTimeout(noSpeechTimer.current);
          if (silenceTimer.current) clearTimeout(silenceTimer.current);
        },
        onSpeechEnd: () => {
          if (silenceTimer.current) clearTimeout(silenceTimer.current);
          silenceTimer.current = window.setTimeout(() => stopCapture(), PRECHECK.silenceStopMs);
        },
      });
      log("RECORDING_STARTED", item?.item_id);
      clock.current = window.setInterval(
        () => setElapsed(Math.round(performance.now() - startedAt.current)),
        100,
      );
      noSpeechTimer.current = window.setTimeout(() => failImmediate("NO_SPEECH_DETECTED"), PRECHECK.noSpeechTimeoutMs);
    } catch (error) {
      captureActive.current = false;
      const code = ((error as Error & { code?: PrecheckCode }).code ?? "MIC_TRACK_FAILED") as PrecheckCode;
      await feedbackAndHold(code);
    }
  }

  async function failImmediate(code: PrecheckCode) {
    if (!captureActive.current) return;
    const result = await finishRecorder();
    setLastCheck(result.metrics);
    await feedbackAndRetry(code);
  }

  async function stopCapture() {
    if (!captureActive.current) return;
    setMachine("LOCAL_PRECHECK");
    log("PRECHECK_STARTED");
    const result = await finishRecorder();
    const reason = precheck(result.blob, result.metrics);
    setLastCheck(result.metrics);
    if (reason) {
      console.info("[VoiceTurk precheck]", { reason_code: reason, ...result.metrics });
      log("PRECHECK_FAILED", reason);
      return feedbackAndRetry(reason);
    }
    log("PRECHECK_PASSED");
    await upload(result);
  }

  async function finishRecorder() {
    captureActive.current = false;
    clearTimers();
    const result = await recorder.current.stop();
    log("RECORDING_STOPPED", `${result.metrics.duration_ms}ms · ${Math.round(result.blob.size / 1024)}KB`);
    return result;
  }

  async function feedbackAndHold(code: PrecheckCode) {
    const text = COACH_MESSAGES[code];
    setMachine("FASTCHECK_RETAKE_NOW");
    setMessage(text);
    await deadline(coach.speak(text), 10000, "COACH_FEEDBACK").catch(() => {});
  }

  async function feedbackAndRetry(code: PrecheckCode) {
    await feedbackAndHold(code);
    if (!paused.current) setTimeout(() => startCapture(), 500);
  }

  async function upload(result: RecordingResult) {
    if (!session || !item) return;
    const postPrecheckStarted = performance.now();
    try {
      setMachine("UPLOAD_INIT");
      log("UPLOAD_INIT_STARTED", `${result.blob.size} bytes`);
      const slot = await api.initUpload({
        session_id: session.session_id,
        item_id: item.item_id,
        filename: "recording.wav",
        content_type: result.blob.type || "audio/wav",
        size_bytes: result.blob.size,
      });
      log("UPLOAD_INIT_DONE", slot.object_key);
      setMachine("PRESIGNED_PUT");
      log("PRESIGNED_PUT_STARTED", new URL(slot.upload_url, window.location.origin).host);
      try {
        await api.putUpload(slot.upload_url, result.blob);
      } catch (error) {
        log("PRESIGNED_PUT_FAILED", (error as Error).message);
        throw error;
      }
      log("PRESIGNED_PUT_DONE");
      setMachine("UPLOAD_COMPLETE");
      log("UPLOAD_COMPLETE_STARTED");
      const check = await api.completeUpload({
        ...slot,
        session_id: session.session_id,
        item_id: item.item_id,
        client_metrics: result.metrics,
      });
      log("UPLOAD_COMPLETE_DONE", `FastCheck: ${check.action}`);
      setMachine("WAITING_FASTCHECK");
      log("FASTCHECK_RESULT_RECEIVED", `${check.action}:${check.reason_code} · ${Math.round(performance.now() - postPrecheckStarted)}ms`);
      setLastCheck(check);
      setMessage(check.message_vi);

      if (check.action === "RETAKE_NOW") {
        setMachine("FASTCHECK_RETAKE_NOW");
        await deadline(coach.speak(check.message_vi), 10000, "COACH_RETAKE").catch(() => {});
        setTimeout(() => startCapture(), 500);
        return;
      }
      setMachine("FASTCHECK_CONTINUE_NEXT");
      setMachine("COACH_SPEAKING_FEEDBACK");
      await deadline(coach.speak(check.message_vi), 10000, "COACH_FEEDBACK");
      setMachine("AUTO_ADVANCE_NEXT_ITEM");
      log("AUTO_ADVANCE_NEXT_ITEM");
      await loadNext(session.session_id);
    } catch (error) {
      await pipelineError(error);
    }
  }

  async function pipelineError(error: unknown) {
    const detail = (error as Error).message || "Unknown pipeline error";
    log("PIPELINE_ERROR", detail);
    setMachine("PIPELINE_ERROR");
    setMessage(`${COACH_MESSAGES.UPLOAD_FAILED} (${detail})`);
    await deadline(coach.speak(COACH_MESSAGES.UPLOAD_FAILED), 10000, "COACH_ERROR").catch(() => {});
  }

  async function pause() {
    paused.current = true;
    if (captureActive.current) {
      captureActive.current = false;
      clearTimers();
      await recorder.current.stop();
    }
    setMachine("PAUSED");
    setMessage("Studio paused. Press Resume when ready.");
  }

  async function retry() {
    paused.current = false;
    coach.stopSpeaking();
    if (captureActive.current) {
      captureActive.current = false;
      clearTimers();
      await recorder.current.stop();
    }
    if (item) await prepareTask(item);
    else if (session) await loadNext(session.session_id);
  }

  async function skip() {
    if (!item || !session) return;
    paused.current = true;
    if (captureActive.current) {
      captureActive.current = false;
      clearTimers();
      await recorder.current.stop();
    }
    try {
      await api.skipItem(item.item_id);
      toast("Item skipped — will be available again later.", "info");
    } catch (err) {
      toast((err as Error).message, "error");
    }
    paused.current = false;
    await loadNext(session.session_id);
  }

  async function endSession() {
    if (!session) return;
    paused.current = true;
    if (captureActive.current) {
      captureActive.current = false;
      clearTimers();
      await recorder.current.stop();
    }
    log("SESSION_COMPLETE_REQUESTED", "user_clicked_end_session");
    try {
      await api.completeSession(session.session_id);
      log("SESSION_COMPLETE_CONFIRMED");
      await coach.leaveSession();
      setMachine("SESSION_SUMMARY");
      setMessage("Session ended. Your submitted items are saved and in the review queue.");
      toast("Session completed successfully.", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  const isRecording = machine === "RECORDING";
  const isActive = captureActive.current;
  const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  /* Pre-session screen */
  if (!session) {
    return (
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">STEP 2 · GUIDED RECORDING</p>
            <h2>Coach-led recording studio</h2>
            <p className="section-copy muted">
              The AI coach instructs, listens, pre-checks, uploads, and advances automatically. No manual Next button required.
            </p>
          </div>
        </div>

        {!campaignId ? (
          <EmptyState
            icon="🎙"
            title="No campaign selected"
            description="Select an active campaign in the Campaign tab first, then start your recording session here."
          />
        ) : (
          <div className="card" style={{ maxWidth: 580, display: "flex", alignItems: "flex-end", gap: 24 }}>
            <div style={{ flex: 1 }}>
              <h3>Ready to record</h3>
              <p className="muted" style={{ marginTop: 8, lineHeight: 1.6, fontSize: "0.9rem" }}>
                The coach will speak each prompt, listen for your voice, check audio quality instantly (FastCheck), then advance automatically. DeepCheck runs in the background without blocking you.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                {["Coach-guided", "Auto-advance", "Instant quality check", "DeepCheck async"].map((f) => (
                  <span key={f} className="tag">{f}</span>
                ))}
              </div>
            </div>
            <button
              disabled={!campaignId}
              onClick={startSession}
              style={{ flexShrink: 0, padding: "13px 24px", fontSize: "0.95rem" }}
            >
              Start session
            </button>
          </div>
        )}
      </section>
    );
  }

  /* Session summary screen */
  if (machine === "SESSION_SUMMARY") {
    return (
      <section className="section">
        <p className="eyebrow">STEP 2 · GUIDED RECORDING</p>
        <h2>Session complete</h2>
        <div className="card" style={{ maxWidth: 540, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
          <h3>{message}</h3>
          <p className="muted" style={{ marginTop: 12, lineHeight: 1.65 }}>
            {progress.completed} of {progress.total} items submitted. Head to <strong>Review & Retake</strong> to process DeepCheck results and accept your samples.
          </p>
          <button onClick={() => { setSession(null); setMachine("IDLE"); }} style={{ marginTop: 24 }}>
            Start new session
          </button>
        </div>
      </section>
    );
  }

  /* Active session */
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">STEP 2 · GUIDED RECORDING</p>
          <h2>Coach-led recording studio</h2>
        </div>
        <Status value={machine} />
      </div>

      <div className="studio-layout">
        {/* Main column */}
        <div className="studio-main">
          {/* Progress */}
          <div className="progress-track">
            <span className="progress-label tabular">{progress.completed}/{progress.total}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            {retakes > 0 && (
              <span className="tag" style={{ background: "var(--warning-dim)", color: "var(--warning)" }}>
                {retakes} retake{retakes !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Task prompt */}
          {item ? (
            <div className="task-prompt">
              <p className="eyebrow">
                {item.intent} · <span style={{ color: "var(--warning)" }}>{item.target_emotion}</span>
              </p>
              <p className="task-transcript">{item.transcript}</p>
              {item.context_brief && (
                <p className="task-context">{item.context_brief}</p>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "32px" }}>
              <h3 style={{ color: "var(--muted)" }}>
                {machine === "WAIT_DEEPCHECK"
                  ? "Waiting for DeepCheck…"
                  : machine === "WAITING_FOR_RECORDING"
                  ? "Waiting for next item"
                  : "Processing…"}
              </h3>
              <p className="muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>{message}</p>
            </div>
          )}

          {/* Coach message */}
          <div className="coach-message" aria-live="polite" aria-atomic="true">
            <div className="coach-icon">🤖</div>
            <div className="coach-text">
              <strong>AI Voice Coach</strong>
              {message}
            </div>
          </div>

          {/* Recorder */}
          <div className="recorder-card">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className={`mic-ring ${isRecording ? "live" : isActive ? "ready" : "idle"}`}>
                🎙
              </div>
              <div style={{ flex: 1 }}>
                <Waveform active={isRecording} />
                <div style={{ marginTop: 8 }}>
                  <VolumeMeter level={level} />
                </div>
                <div className="recording-stats" style={{ marginTop: 6 }}>
                  <span className="tabular">{(elapsed / 1000).toFixed(1)}s</span>
                  <span>{micState}</span>
                  <span className="tabular">{level.toFixed(1)} dBFS</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                paddingTop: 16,
                borderTop: "1px solid var(--line)",
              }}
            >
              {machine !== "PAUSED" ? (
                <button className="secondary" onClick={pause} style={{ flex: 1 }}>
                  ⏸ Pause
                </button>
              ) : (
                <button onClick={retry} style={{ flex: 1 }}>
                  ▶ Resume
                </button>
              )}
              <button className="secondary" onClick={retry} style={{ flex: 1 }}>
                ↩ Retry item
              </button>
              <button className="secondary" onClick={skip} style={{ flex: 1 }}>
                ⏭ Skip
              </button>
              <button
                className="danger"
                onClick={endSession}
                style={{ flex: 1 }}
              >
                ■ End session
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry sidebar */}
        <aside className="telemetry-panel">
          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Live pipeline</p>
            <dl className="metrics-dl">
              <dt>State</dt>
              <dd>
                <Status value={machine} />
              </dd>
              <dt>Microphone</dt>
              <dd style={{ fontSize: "0.78rem" }}>{micState}</dd>
              <dt>Voice coach</dt>
              <dd style={{ fontSize: "0.78rem" }}>
                {coachProvider}
                {session.realtime.expected_agent_uid && coachProvider.startsWith("Waiting") && (
                  <span style={{ display: "block", marginTop: 4 }}>Expected agent uid: {session.realtime.expected_agent_uid}</span>
                )}
                {coachError && <span style={{ display: "block", marginTop: 4, color: "var(--danger)" }}>Reason: {coachError}</span>}
              </dd>
              <dt>Retake queue</dt>
              <dd>{retakes}</dd>
              <dt>Session</dt>
              <dd style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>
                {session.session_id.slice(-8)}
              </dd>
            </dl>
          </div>

          {lastCheck && (
            <div>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Last quality result</p>
              {typeof lastCheck === "object" && "action" in lastCheck ? (
                <div style={{ fontSize: "0.8rem" }}>
                  <div style={{ marginBottom: 8 }}>
                    <Status value={String(lastCheck.action ?? "")} />
                  </div>
                  {"metrics" in lastCheck && (
                    <div className="quality-grid">
                      {Object.entries(lastCheck.metrics as Record<string, unknown>)
                        .slice(0, 6)
                        .map(([k, v]) => (
                          <div key={k} className="quality-cell">
                            {k.replace(/_/g, " ")} <b>{typeof v === "number" ? v.toFixed(2) : String(v)}</b>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="quality-grid">
                  {Object.entries(lastCheck).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="quality-cell">
                      {k.replace(/_/g, " ")} <b>{typeof v === "number" ? v.toFixed(2) : String(v)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Pipeline timeline</p>
            <ol className="pipeline-log">
              {events.map((entry, i) => (
                <li key={`${entry.at}-${i}`} className="log-entry">
                  <time>{entry.at}</time>
                  <b>{entry.event.replace(/_/g, " ")}</b>
                  {entry.detail && <small>{entry.detail}</small>}
                </li>
              ))}
              {events.length === 0 && (
                <li style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                  Events will appear here during recording…
                </li>
              )}
            </ol>
          </div>
        </aside>
      </div>
    </section>
  );
}
