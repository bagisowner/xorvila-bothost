#!/usr/bin/env python3
import os
import sys
import subprocess
import shutil
import json
from pathlib import Path

# ANSI colors for premium terminal output formatting
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(title):
    print(f"\n{BOLD}{MAGENTA}=== {title} ==={RESET}\n")

def print_status(name, passed, detail="", warning=False):
    if passed:
        color = GREEN
        symbol = "✓"
        status_text = "PASS"
    elif warning:
        color = YELLOW
        symbol = "⚠"
        status_text = "WARN"
    else:
        color = RED
        symbol = "✗"
        status_text = "FAIL"
    
    print(f" {color}{symbol}{RESET} {BOLD}{name:<35}{RESET} : [{color}{status_text}{RESET}] {detail}")

def run_cmd(args):
    try:
        res = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        return res.returncode == 0, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def main():
    print(f"\n{BOLD}{CYAN}==================================================================={RESET}")
    print(f"{BOLD}{CYAN}              XORVILA CORE SYSTEM DIAGNOSTIC HARNESS               {RESET}")
    print(f"{BOLD}{CYAN}==================================================================={RESET}")
    
    overall_status = True

    # 1. RUNTIME & INTERPRETER HEALTH AUDITS
    print_header("1. RUNTIME & SYSTEM INTERPRETERS")
    
    # Python 3 check
    py_ok, py_ver, _ = run_cmd(["python3", "--version"])
    if py_ok:
        print_status("Python 3 Runtime", True, f"Detected {py_ver}")
    else:
        print_status("Python 3 Runtime", False, "Python 3 is not available in PATH")
        overall_status = False
        
    # Pip check
    pip_ok, pip_ver, _ = run_cmd(["pip", "--version"])
    if pip_ok:
        print_status("Pip Package Manager", True, f"Detected {pip_ver.split(' from ')[0]}")
    else:
        pip_ok_py, pip_ver_py, _ = run_cmd(["python3", "-m", "pip", "--version"])
        if pip_ok_py:
            print_status("Pip Package Manager", True, f"Detected {pip_ver_py.split(' from ')[0]} via python3 -m")
        else:
            print_status("Pip Package Manager", False, "Pip installer is missing", warning=True)

    # Node.js check
    node_ok, node_ver, _ = run_cmd(["node", "--version"])
    if node_ok:
        print_status("Node.js Runtime", True, f"Detected {node_ver}")
    else:
        print_status("Node.js Runtime", False, "Node.js is not installed or not in PATH")
        overall_status = False

    # NPM check
    npm_ok, npm_ver, _ = run_cmd(["npm", "--version"])
    if npm_ok:
        print_status("NPM Package Manager", True, f"Detected v{npm_ver}")
    else:
        print_status("NPM Package Manager", False, "NPM is missing")
        overall_status = False

    # 2. DOCKER & CONTAINER ENVIRONMENT AUDITS
    print_header("2. DOCKER & INFRASTRUCTURE INTEGRATIONS")
    
    # Docker daemon / CLI check
    docker_cli_ok, docker_ver, _ = run_cmd(["docker", "--version"])
    if docker_cli_ok:
        print_status("Docker Engine CLI", True, f"Available: {docker_ver}")
        
        # Docker Daemon run check
        daemon_ok, _, _ = run_cmd(["docker", "info"])
        if daemon_ok:
            print_status("Docker Daemon Connection", True, "Online and communicating on unix socket")
        else:
            print_status("Docker Daemon Connection", False, "Daemon is not running or socket permission denied", warning=True)
    else:
        print_status("Docker Engine CLI", False, "Docker is not installed on this host (Fallback direct execution will be active)", warning=True)

    # Docker Compose File check
    compose_path = Path("./docker-compose.yml")
    if compose_path.exists():
        # Read compose version
        try:
            with open(compose_path, 'r') as f:
                content = f.read()
            services = []
            if "services:" in content:
                services = [line.strip().replace(":", "") for line in content.split("\n") if line.startswith("  ") and line.endswith(":")]
            print_status("docker-compose.yml Structure", True, f"Found compose config with services: {', '.join(services)}")
        except Exception as e:
            print_status("docker-compose.yml Structure", False, f"Failed to parse compose file: {str(e)}")
    else:
        print_status("docker-compose.yml Structure", False, "docker-compose.yml is missing from workspace root")
        overall_status = False

    # Python & Node Dockerfile check
    py_dockerfile = Path("./docker/python/Dockerfile")
    node_dockerfile = Path("./docker/node/Dockerfile")
    
    if py_dockerfile.exists():
        print_status("Python Dockerfile", True, f"Located at {py_dockerfile}")
    else:
        print_status("Python Dockerfile", False, "Missing py Dockerfile config", warning=True)

    if node_dockerfile.exists():
        print_status("Node.js Dockerfile", True, f"Located at {node_dockerfile}")
    else:
        print_status("Node.js Dockerfile", False, "Missing node Dockerfile config", warning=True)

    # 3. DIRECTORY PERMISSIONS & STORAGE AUDITS
    print_header("3. STORAGE WORKSPACE & PERMISSIONS")
    
    # Check server databases
    db_path = Path("./data/database.db")
    if db_path.exists():
        print_status("Primary SQLite Database", True, f"Online (Size: {db_path.stat().st_size / 1024:.2f} KB)")
    else:
        fallback_db = Path("./data/fallback_db.json")
        if fallback_db.exists():
            print_status("Fallback JSON Database", True, f"Active (Size: {fallback_db.stat().st_size / 1024:.2f} KB)")
        else:
            print_status("Database Storage", False, "Neither SQLite database nor fallbacks were detected")
            overall_status = False

    # Writable workspace test
    server_workspace = Path("./data/servers")
    server_workspace.mkdir(parents=True, exist_ok=True)
    try:
        test_file = server_workspace / ".diag_write_test"
        with open(test_file, 'w') as f:
            f.write("test")
        test_file.unlink()
        print_status("Servers Workspace Write Access", True, "Successfully verified read/write access to ./data/servers")
    except Exception as e:
        print_status("Servers Workspace Write Access", False, f"Permission Denied: {str(e)}")
        overall_status = False

    # 4. FINAL INTEGRATION SUMMARY
    print_header("4. DIAGNOSTIC RESULTS")
    if overall_status:
        print(f" {GREEN}{BOLD}🎉 SYSTEM IS FULLY OPTIMIZED AND HEALTHY!{RESET}")
        print(f" Your host runtimes (Python/Node) are perfectly configured for Direct Native Process Spawning.")
    else:
        print(f" {RED}{BOLD}⚠ SOME MINOR WARNINGS OR CONFIGURATION GAPS DETECTED.{RESET}")
        print(f" Check the [{RED}FAIL{RESET}] and [{YELLOW}WARN{RESET}] entries above to ensure perfect daemon compatibility.")
    
    print(f"\n{BOLD}{CYAN}==================================================================={RESET}\n")

if __name__ == "__main__":
    main()
