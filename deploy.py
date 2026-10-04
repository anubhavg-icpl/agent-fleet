#!/usr/bin/env python3
"""
agent-fleet provisioner
=======================
Two tiers:

  STATIC  (free, always deploys):
      chat       — local AI chat in the browser (llama.cpp WASM)
      agent-hub  — fleet dashboard (same page as GitHub Pages)

  DOCKER  (requires HF PRO for Spaces hardware — verified 2026-10-02):
      n8n, local-chat, openmuse, flowise, langflow, anythingllm, lobechat
      Pass --docker to attempt provisioning them. On 402 the script says
      exactly what's missing and keeps going.

Usage:
    python deploy.py                # static fleet + status
    python deploy.py --docker       # static + docker fleet (needs PRO)
    python deploy.py --status       # current status only
"""

import argparse
import base64
import json
import os
import secrets
import string
import sys
import time
from pathlib import Path

from huggingface_hub import HfApi

STATE_DIR = Path("/home/z/my-project/revenue-agent/state")
FLEET_DIR = Path(__file__).resolve().parent
CRED_FILE = STATE_DIR / "agent-fleet-credentials.json"

HF_TOKEN = STATE_DIR.joinpath("hf_token").read_text().strip()


def rand_alnum(n: int) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))


def load_creds() -> dict:
    if CRED_FILE.exists():
        return json.loads(CRED_FILE.read_text())
    return {}


def save_creds(creds: dict) -> None:
    CRED_FILE.write_text(json.dumps(creds, indent=2) + "\n")
    os.chmod(CRED_FILE, 0o600)


def gen(creds: dict, key: str, maker) -> str:
    if key not in creds:
        creds[key] = maker()
    return creds[key]


def build_static_fleet() -> dict:
    return {
        "chat": {
            "sdk": "static",
            "purpose": "Local AI chat — llama.cpp WASM in-browser, 5 open models",
        },
        "agent-hub": {
            "sdk": "static",
            "purpose": "Fleet dashboard — live deployments + staged Docker fleet",
        },
    }


def build_docker_fleet(creds: dict) -> dict:
    return {
        "local-chat": {
            "secrets": {"WEBUI_SECRET_KEY": gen(creds, "webui_secret_key", lambda: secrets.token_hex(32))},
            "variables": {},
        },
        "n8n": {
            "secrets": {"N8N_ENCRYPTION_KEY": gen(creds, "n8n_encryption_key", lambda: secrets.token_hex(32))},
            "variables": {},  # WEBHOOK_URL set after repo exists
        },
        "flowise": {
            "secrets": {
                "FLOWISE_USERNAME": gen(creds, "flowise_username", lambda: "fleet-admin"),
                "FLOWISE_PASSWORD": gen(creds, "flowise_password", lambda: rand_alnum(18)),
            },
            "variables": {},
        },
        "langflow": {
            "secrets": {"LANGFLOW_SUPERUSER_PASSWORD": gen(creds, "langflow_superuser_password", lambda: rand_alnum(18))},
            "variables": {},
        },
        "lobechat": {
            "secrets": {"ACCESS_CODE": gen(creds, "lobechat_access_code", lambda: rand_alnum(16))},
            "variables": {},
        },
        "anythingllm": {"secrets": {}, "variables": {}},
        "openmuse": {
            "secrets": {
                "OPENMUSE_ACCESS_KEY": gen(creds, "openmuse_access_key", lambda: rand_alnum(28)),
                "TOKEN_ENCRYPTION_KEY": gen(
                    creds, "openmuse_token_encryption_key",
                    lambda: base64.b64encode(secrets.token_bytes(32)).decode()),
                "WORKER_TOKEN": gen(creds, "openmuse_worker_token", lambda: rand_alnum(36)),
                # User-supplied at first run — placeholders keep the API bootable.
                "CPK_INTELLIGENCE_API_KEY": "SET_ME",
                "OPENAI_API_KEY": "SET_ME",
            },
            "variables": {},
        },
    }


def space_url(owner: str, name: str, static: bool = False) -> str:
    # Static Spaces serve from <owner>-<name>.static.hf.space (verified 2026-10-02);
    # Docker/Gradio Spaces use <owner>-<name>.hf.space.
    if static:
        return f"https://{owner.lower()}-{name}.static.hf.space"
    return f"https://{owner.lower()}-{name}.hf.space"


def provision_static(api: HfApi, owner: str, fleet: dict) -> None:
    for name, spec in fleet.items():
        repo_id = f"{owner}/{name}"
        print(f":: {repo_id} (static)")
        api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="static",
                        private=False, exist_ok=True)
        folder = FLEET_DIR / "spaces" / name
        if name == "agent-hub":
            # hub source of truth lives in docs/ (also served by GitHub Pages)
            hub_dir = FLEET_DIR / "spaces" / "agent-hub"
            hub_dir.mkdir(parents=True, exist_ok=True)
            target = hub_dir / "index.html"
            target.write_bytes((FLEET_DIR / "docs" / "index.html").read_bytes())
        api.upload_folder(repo_id=repo_id, folder_path=str(folder),
                          repo_type="space", commit_message=f"agent-fleet: deploy {name}")
        print(f"   deployed -> {space_url(owner, name, static=True)}")


def provision_docker(api: HfApi, owner: str, fleet: dict) -> None:
    blocked = False
    for name, spec in fleet.items():
        repo_id = f"{owner}/{name}"
        print(f":: {repo_id} (docker)")
        try:
            api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker",
                            private=False, exist_ok=True)
        except Exception as e:
            if "402" in str(e):
                print(f"   BLOCKED: HF PRO subscription required for Docker Spaces — skipping {name}")
                blocked = True
                continue
            raise
        folder = FLEET_DIR / "spaces" / name
        api.upload_folder(repo_id=repo_id, folder_path=str(folder),
                          repo_type="space", commit_message=f"agent-fleet: deploy {name}")
        for key, value in spec["secrets"].items():
            api.add_space_secret(repo_id=repo_id, key=key, value=value)
        if name == "n8n":
            spec["variables"]["WEBHOOK_URL"] = f"{space_url(owner, name)}/"
        for key, value in spec["variables"].items():
            api.add_space_variable(repo_id=repo_id, key=key, value=value)
        print(f"   deployed -> {space_url(owner, name)}")
    if blocked:
        print("\n>>> Docker Spaces need HF PRO ($9/mo): https://huggingface.co/pro")
        print(">>> Everything is staged in this repo — re-run with --docker after subscribing.")


def http_status(url: str, timeout: int = 15):
    import urllib.request
    import urllib.error
    try:
        req = urllib.request.Request(url, method="GET",
                                     headers={"User-Agent": "agent-fleet/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None


def poll_static(api: HfApi, owner: str, fleet: dict, minutes: int = 5) -> dict:
    deadline = time.time() + minutes * 60
    results = {n: None for n in fleet}
    pending = set(fleet)
    while pending and time.time() < deadline:
        for name in list(pending):
            code = http_status(space_url(owner, name, static=True))
            if code is not None and code < 500:
                results[name] = code
                pending.discard(name)
        if pending:
            time.sleep(5)
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--docker", action="store_true", help="also provision the Docker fleet (needs HF PRO)")
    ap.add_argument("--status", action="store_true", help="print status only")
    args = ap.parse_args()

    api = HfApi(token=HF_TOKEN)
    owner = api.whoami()["name"]
    print(f"owner: {owner}\n")

    static_fleet = build_static_fleet()
    creds = load_creds()
    docker_fleet = build_docker_fleet(creds)

    if not args.status:
        provision_static(api, owner, static_fleet)
        save_creds(creds)
        if args.docker:
            provision_docker(api, owner, docker_fleet)
            save_creds(creds)
        print("\ncredentials (never committed):", CRED_FILE)

    print("\npolling static fleet...")
    results = poll_static(api, owner, static_fleet)

    print("\n=== FLEET STATUS ===")
    for name, code in results.items():
        url = space_url(owner, name, static=True)
        ok = code is not None and code < 500
        print(f"{'LIVE   ' if ok else 'PENDING'} {name:12s} {url}  (http={code})")
    if not args.docker:
        print(f"STAGED  docker fleet (7 services) — run with --docker after attaching HF PRO")
    return 0


if __name__ == "__main__":
    sys.exit(main())
