import pyautogui
import time
import os
import re
from m2j import generate_json
from simple_term_menu import TerminalMenu
import fetch_model_name
import ollama_server

"""
################################################
#                   MODEL LIST                 #
################################################

1. gpt-4o
2. claude3.5-sonnet
3. granite3.1-xx
4. granite3.2-xx

PLEASE ENSURE SAME MODEL NAME ACROSS ALL PLACES
################################################
"""

# ──────────────────────────────────────────────────────────────────────────────
#                       CONFIGURATION & GLOBALS
# ──────────────────────────────────────────────────────────────────────────────

MODEL_NAME = "claude3.5-sonnet"
MODEL_TYPE = "NOT ASSIGNED"
sleep_time = 20
first_time = True
LOG_TIMEOUT = 60  # seconds
TIMINGS = []

# ──────────────────────────────────────────────────────────────────────────────
def wait_for_log_update(server, keyword="total time", timeout=LOG_TIMEOUT):
    """
    Poll the Ollama server logs until `keyword` is found or timeout.
    Returns the matching log line, or raises TimeoutError.
    """
    start = time.time()
    while True:
        logs = server.get_latest_logs(50)
        for line in logs:
            if keyword.lower() in line.lower():
                return line
        if time.time() - start > timeout:
            raise TimeoutError(f"Keyword '{keyword}' not found within {timeout}s")
        time.sleep(1)

# ──────────────────────────────────────────────────────────────────────────────
def automate_continue_dev(input_text, server=None):
    """
    Sends `input_text` into Continue.dev via pyautogui.
    If `MODEL_TYPE=='granite'`, attempts to parse the Ollama log;
    on timeout, falls back to local timing.
    """
    global MODEL_NAME, TIMINGS

    # measure locally in case log lookup fails
    local_start = time.time()

    # 1) send the prompt
    time.sleep(3)
    pyautogui.write(input_text, interval=0.1)
    pyautogui.press('enter')
    pyautogui.press('enter')

    if MODEL_TYPE == 'granite' and server:
        try:
            # 2) wait for server log
            raw_log = wait_for_log_update(server, keyword="total time")
            m = re.search(r'(\d+(?:\.\d+)?)\s*ms', raw_log)
            if m:
                TIMINGS.append(float(m.group(1)))
                print(f"🕒 Parsed timing from log: {m.group(1)} ms")
            else:
                raise ValueError("Log found but no number parsed")
        except Exception as e:
            # fallback timing
            elapsed_ms = (time.time() - local_start) * 1000
            TIMINGS.append(elapsed_ms)
            print(f"⚠️ Log lookup failed ({e}); using fallback: {elapsed_ms:.2f} ms")
        finally:
            # on the very first granite prompt, detect model name
            if len(TIMINGS) == 1:
                try:
                    MODEL_NAME = fetch_model_name.get_model_name()
                    print("🔖 Detected model:", MODEL_NAME)
                except Exception as e:
                    print(f"⚠️ Failed to detect model name automatically: {e}")
                    MODEL_NAME = "granite3.1-dense:8b"  # fallback model name
    else:
        # non-granite: just wait a bit
        time.sleep(SLEEP_TIME)

# ──────────────────────────────────────────────────────────────────────────────
def process_input_file(path, server=None):
    if not os.path.exists(path):
        print(f"❌ Input file not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            prompt = line.strip()
            if not prompt:
                continue
            print(f"\n▶ Sending prompt: {prompt}")
            print("   [Focus the Continue.dev chat box now]")
            automate_continue_dev(prompt, server=server)

# ──────────────────────────────────────────────────────────────────────────────
def choose(title, options):
    print(f"\n== {title} ==")
    menu = TerminalMenu(options)
    return options[menu.show()]

# ──────────────────────────────────────────────────────────────────────────────
def main():
    global MODEL_TYPE

    # 1) pick input file
    choice = choose("Select prompt file", ["Simple Chat Prompts", "Context Providers", "Exit"])
    if choice == "Exit":
        return
    input_file = "prompts_list.txt" if choice=="Simple Chat Prompts" else "context_providers.txt"

    # 2) pick model type
    choice = choose("Select model type", ["Granite", "Other Models", "Exit"])
    if choice == "Exit":
        return
    MODEL_TYPE = "granite" if choice=="Granite" else "others"

    server = None
    if MODEL_TYPE == "granite":
        print("\n⚙️  Starting Ollama server...")
        try:
            server = ollama_server.OllamaServer()
            server.start_server()
        except Exception as e:
            print("❌ Failed to start server:", e)
            return

    # 3) process prompts
    print(f"\n🚀 Executing prompts from '{input_file}' on '{MODEL_TYPE}'")
    process_input_file(input_file, server=server)

    # 4) share + JSON output
    pyautogui.write("/share", interval=0.08)
    pyautogui.press('enter')
    pyautogui.press('enter')

    if TIMINGS:
        print(f"\n✅ Recorded {len(TIMINGS)} timing(s), generating JSON...")
        generate_json(MODEL_NAME, TIMINGS)
    else:
        print("\n⚠️  No timings recorded at all.")

    print("\n🎉  All done!")

    # 5) run build command
    print("\n🛠️  Running `npm run build` in code-assist-web...")
    os.chdir("code-assist-webUI/code-assist-web")
    os.system("npm run build")

if __name__ == "__main__":
    main()

