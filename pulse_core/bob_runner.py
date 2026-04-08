import sys, os, re, subprocess, json
from pathlib import Path

BOB_PATH = os.environ.get("BOB_PATH", "bob")
PULSE_DIR = Path(__file__).parent.parent


def run_bob(prompt: str, label: str = "BOB") -> str:
    print(f"\n{'='*60}\n[{label}] Invoking BOB\n{'='*60}")
    print(f"PROMPT (first 300 chars): {prompt[:300]}...\n")
    sys.stdout.flush()

    try:
        proc = subprocess.Popen(
            [BOB_PATH, prompt],
            cwd=str(PULSE_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True, bufsize=1
        )
        full_output = []
        for line in proc.stdout:
            print(f"[BOB] {line}", end="")
            sys.stdout.flush()
            full_output.append(line)
        proc.wait()
        result = "".join(full_output)
    except FileNotFoundError:
        msg = f"[{label}] ERROR: BOB binary not found at '{BOB_PATH}'. Make sure bob is installed and in PATH."
        print(msg, flush=True)
        raise RuntimeError(msg)

    print(f"\n{'='*60}\n[{label}] Done\n{'='*60}\n")
    sys.stdout.flush()
    return result


def append_replica_step_after_scale(incident_id: str, service: str) -> None:
    """
    After a scale fix, query mock_services for current pod names and append
    a step listing them so the engineer sees replicas without asking in chat.
    """
    import requests
    import yaml
    from pulse_core.db import get_conn

    try:
        with open(str(PULSE_DIR / "config.yaml")) as f:
            config = yaml.safe_load(f)

        port = config.get("services", {}).get(service, {}).get("port")
        if not port:
            return

        resp = requests.get(f"http://localhost:{port}/pods", timeout=5)
        pods = resp.json().get("pods", [])
        running = [p["name"] for p in pods if p.get("status") == "Running"]

        if not running:
            return

        step_text = f"{len(running)} replicas running -- {', '.join(running)}"

        conn = get_conn()
        row = conn.execute("SELECT steps FROM incidents WHERE id = ?", (incident_id,)).fetchone()
        from datetime import datetime
        steps = json.loads(row[0] or "[]") if row else []
        steps.append({"text": step_text, "ts": datetime.utcnow().isoformat()})
        conn.execute("UPDATE incidents SET steps = ? WHERE id = ?", (json.dumps(steps), incident_id))
        conn.commit()
        conn.close()
        print(f"[Pulse] Auto-appended replica step: {step_text}", flush=True)

    except Exception as e:
        print(f"[Pulse] append_replica_step failed: {e}", flush=True)


def answer_question_with_bob(question: str, incident_context: str = "", chat_history: str = "") -> str:
    ctx_section = f"\nCURRENT INCIDENT CONTEXT:\n{incident_context}\n" if incident_context else ""
    history_section = f"\nRECENT CHAT HISTORY:\n{chat_history}\n" if chat_history else ""

    live_keywords = ["current", "now", "right now", "latest", "live", "show me", "what are",
                     "logs", "metrics", "pods", "status", "errors", "latency", "cpu", "memory"]
    wants_live = any(w in question.lower() for w in live_keywords)
    live_instruction = ""
    if wants_live:
        live_instruction = """
- If asked for current metrics: call get_metrics and report exact numbers.
- If asked for logs or failure logs: call get_logs and quote actual log lines verbatim in a code block.
- If asked about pods: call get_pods and list them.
- Do NOT answer from memory for current-state questions -- always fetch live data.
"""
    print(f"[CHAT] question received: {question[:200]}", flush=True)
    voice_instruction = ""
    if any(w in question.lower() for w in ["voice", "speak", "tell me", "read it out", "out loud","summarise"]):
        voice_instruction = "\nVOICE REQUIRED: Before calling attempt_completion, you MUST call elevenlabs_speak with your complete answer text. Do not skip this.\n"

    prompt = f"""You are Pulse, an AI on-call assistant.{ctx_section}{history_section}
QUESTION: {question}
{voice_instruction}
RESPONSE RULES:
- Answer directly in 1-3 sentences. No preamble, no narration.
- Do NOT restate the question. Just answer.
- If the answer is in the incident context or chat history, answer from it directly.
- If asked about all services, use get_metrics on all 3: checkout-svc, inventory-svc, db-primary.
- If asked how many pods, use get_pods -- count only Pulse service pods in default namespace.{live_instruction}
- Do NOT assume information. If unsure, say so.
- Never explain your reasoning. Just give the answer.
"""
    return run_bob(prompt, label="CHAT")


def execute_approved_fix(incident_id: str, action_description: str, service: str) -> str:
    """Called by API when user approves a recommended action. Invokes BOB to execute."""
    prompt = f"""You are Pulse. The engineer approved a fix. Execute it now.

INCIDENT ID: {incident_id}
Service: {service}
Approved action: {action_description}

Steps:
1. write_incident_step(incident_id, "user approved -- executing fix")
2. Execute the fix using run_fix with the correct action and replica count from the approved action
3. Verify by checking get_metrics and get_pods after execution
4. write_incident_step with the result
5. write_incident_rca updating status to "resolved" with action_taken set to the command you ran

Be concise. Log exactly what command you ran.
"""
    return run_bob(prompt, label=f"FIX:{incident_id[:8]}")