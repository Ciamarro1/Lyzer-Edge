#!/usr/bin/env python3
"""
Lyzer Edge - Fast Agentic Session Primer
Gera um digest compacto de inicialização para o agente Antigravity.
"""
import subprocess
from pathlib import Path

def get_git_info():
    try:
        branch = subprocess.check_output(["git", "branch", "--show-current"], text=True).strip()
        last_commit = subprocess.check_output(["git", "log", "-1", "--oneline"], text=True).strip()
        status = subprocess.check_output(["git", "status", "--porcelain"], text=True).strip()
        is_clean = "Clean" if not status else f"Dirty ({len(status.splitlines())} modified files)"
        return branch, last_commit, is_clean
    except Exception:
        return "unknown", "unknown", "unknown"

def get_last_handoff():
    handoff_path = Path("STATE.md")
    if handoff_path.exists():
        return handoff_path.read_text(encoding="utf-8").strip()
    return "Nenhum STATE.md encontrado. Repositório em estado inicial."

def main():
    branch, commit, status = get_git_info()
    handoff = get_last_handoff()
    
    print("=" * 60)
    print("🚀 [ANTIGRAVITY SESSION PRIMER] — LYZER EDGE")
    print(f"• Git Branch: {branch} | Commit: {commit} | Status: {status}")
    print("=" * 60)
    print("\n--- ÚLTIMO ESTADO VERIFICADO (HANDOFF) ---")
    print(handoff)
    print("\n" + "=" * 60)
    print("DIRETRIZ: Não re-leia a documentação antiga a menos que explicitamente solicitado.")
    print("Sessão inicializada com sucesso. Pronto para a próxima instrução.")
    print("=" * 60)

if __name__ == "__main__":
    main()
