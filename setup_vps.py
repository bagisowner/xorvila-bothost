#!/usr/bin/env python3
import os
import sys
import platform
import subprocess
import shutil

# ANSI escape codes for styling
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(text):
    print(f"\n{BOLD}{CYAN}=== {text} ==={RESET}\n")

def run_command(cmd, desc="Running action", allow_fail=False):
    print(f" {BLUE}⚡{RESET} {desc}...")
    try:
        # Run command with real-time feedback
        process = subprocess.Popen(
            cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        stdout, stderr = process.communicate()
        if process.returncode != 0 and not allow_fail:
            print(f" {RED}✗{RESET} Failed: {cmd}")
            print(f" {RED}Error details:{RESET}\n{stderr}")
            return False, stderr
        return True, stdout
    except Exception as e:
        print(f" {RED}✗{RESET} Exception occurred: {str(e)}")
        return False, str(e)

def get_linux_distro():
    try:
        with open("/etc/os-release", "r") as f:
            lines = f.readlines()
        dist = {}
        for line in lines:
            if "=" in line:
                key, val = line.strip().split("=", 1)
                dist[key] = val.strip('"')
        return dist.get("ID", "unknown").lower()
    except Exception:
        return "unknown"

def main():
    print(f"\n{BOLD}{CYAN}==================================================================={RESET}")
    print(f"{BOLD}{CYAN}             XORVILA ONE-CLICK VPS PROVISIONING ENGINE              {RESET}")
    print(f"{BOLD}{CYAN}==================================================================={RESET}")

    # Check if user is running on a supported platform
    if platform.system() != "Linux":
        print(f"\n {RED}✗ This provisioning script only supports Linux systems (Ubuntu, Debian, CentOS, etc.){RESET}")
        sys.exit(1)

    # Check if running as root / sudo
    if os.geteuid() != 0:
        print(f"\n {RED}✗ Error: This setup script requires administrative privileges.{RESET}")
        print(f" {YELLOW}👉 Please run this script with sudo: {BOLD}sudo python3 setup_vps.py{RESET}\n")
        sys.exit(1)

    distro = get_linux_distro()
    print(f" {GREEN}✓{RESET} Detected Linux Distribution: {BOLD}{distro.capitalize()}{RESET}")

    # Step 1: Update System Repositories
    print_header("Step 1: Updating System Package Repositories")
    if distro in ["ubuntu", "debian"]:
        run_command("apt-get update -y", "Updating apt cache")
    elif distro in ["centos", "rhel", "almalinux", "rocky"]:
        run_command("yum update -y", "Updating yum repository cache")
    else:
        print(f" {YELLOW}⚠ Unknown package manager. Attempting apt upgrade fallback...{RESET}")
        run_command("apt-get update -y", "Updating apt cache", allow_fail=True)

    # Step 2: Install Python 3 and Pip
    print_header("Step 2: Installing Python 3 & Pip Package Manager")
    if distro in ["ubuntu", "debian"]:
        run_command("apt-get install -y python3 python3-pip python3-dev python3-venv build-essential", "Installing Python and compilation dependencies")
    elif distro in ["centos", "rhel", "almalinux", "rocky"]:
        run_command("yum install -y python3 python3-pip python3-devel gcc", "Installing Python and GCC compilers")
    else:
        run_command("apt-get install -y python3 python3-pip", "Fallback Python installation", allow_fail=True)

    # Step 3: Install Node.js & NPM (LTS v20)
    print_header("Step 3: Installing Node.js (LTS) & NPM")
    if distro in ["ubuntu", "debian"]:
        print(f" {BLUE}⚡{RESET} Adding NodeSource LTS repository...")
        run_command("curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", "Fetching NodeSource setup script")
        run_command("apt-get install -y nodejs", "Installing Node.js and NPM")
    elif distro in ["centos", "rhel", "almalinux", "rocky"]:
        print(f" {BLUE}⚡{RESET} Adding NodeSource LTS repository...")
        run_command("curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -", "Fetching NodeSource setup script")
        run_command("yum install -y nodejs", "Installing Node.js and NPM")
    else:
        print(f" {YELLOW}⚠ Standalone node install fallback...{RESET}")
        run_command("apt-get install -y nodejs npm", "Fallback Node/NPM installation", allow_fail=True)

    # Step 4: Install Docker Engine & Docker Compose
    print_header("Step 4: Installing Docker Engine & Docker Compose")
    docker_installed = shutil.which("docker") is not None
    if docker_installed:
        print(f" {GREEN}✓{RESET} Docker is already installed on this machine!")
    else:
        if distro in ["ubuntu", "debian"]:
            # Setup docker repo keys
            run_command("apt-get install -y ca-certificates curl gnupg lsb-release", "Installing prerequisite utils")
            run_command("mkdir -p /etc/apt/keyrings", "Creating directory keyring")
            run_command("curl -fsSL https://download.docker.com/linux/" + distro + "/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg", "Importing Docker GPG Gpg keys")
            
            repo_line = f"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/{distro} $(lsb_release -cs) stable"
            run_command(f'echo "{repo_line}" | tee /etc/apt/to/sources.list.d/docker.list > /dev/null', "Configuring Docker repository source list")
            
            run_command("apt-get update -y", "Updating repository registry with Docker source")
            run_command("apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin", "Installing Docker Community Edition and Compose Plugin")
        elif distro in ["centos", "rhel", "almalinux", "rocky"]:
            run_command("yum install -y yum-utils", "Installing yum-utils")
            run_command("yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo", "Registering Docker repository source")
            run_command("yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin", "Installing Docker Community Edition and Compose Plugin")
        else:
            print(f" {BLUE}⚡{RESET} Generic curl install fallback for Docker Engine...")
            run_command("curl -fsSL https://get.docker.com | sh", "Downloading and executing docker.sh setup pipeline")

    # Start and Enable Docker Service
    print_header("Step 5: Enforcing Systemd Service States")
    run_command("systemctl start docker", "Starting Docker daemon daemon process", allow_fail=True)
    run_command("systemctl enable docker", "Registering Docker to boot automatically on startup", allow_fail=True)

    # Manage Docker privileges for current user
    sudo_user = os.getenv("SUDO_USER")
    if sudo_user:
        run_command(f"usermod -aG docker {sudo_user}", f"Adding user '{sudo_user}' to docker permissions group")
        print(f" {YELLOW}👉 Note: Please log out and back in for user '{sudo_user}' group changes to take effect!{RESET}")

    # Step 6: Post-Installation Integrity Audits
    print_header("Step 6: Auditing Active Installation Statuses")
    
    # Python check
    py_ok, py_v = run_command("python3 --version", "Validating Python 3")
    # Pip check
    pip_ok, pip_v = run_command("pip3 --version", "Validating Pip")
    # Node check
    node_ok, node_v = run_command("node --version", "Validating Node")
    # NPM check
    npm_ok, npm_v = run_command("npm --version", "Validating NPM")
    # Docker check
    docker_ok, docker_v = run_command("docker --version", "Validating Docker Engine")

    print(f"\n{BOLD}{GREEN}==================================================================={RESET}")
    print(f"{BOLD}{GREEN}             PROVISIONING COMPLETED SUCCESSFULLY!                  {RESET}")
    print(f"{BOLD}{GREEN}==================================================================={RESET}\n")

    print(f" • {BOLD}Python{RESET:<12} : {GREEN if py_ok else RED}{py_v.strip() if py_ok else 'FAILED'}{RESET}")
    print(f" • {BOLD}Pip3{RESET:<12} : {GREEN if pip_ok else RED}{pip_v.strip() if pip_ok else 'FAILED'}{RESET}")
    print(f" • {BOLD}Node.js{RESET:<12} : {GREEN if node_ok else RED}{node_v.strip() if node_ok else 'FAILED'}{RESET}")
    print(f" • {BOLD}NPM{RESET:<12} : {GREEN if npm_ok else RED}{'v' + npm_v.strip() if npm_ok else 'FAILED'}{RESET}")
    print(f" • {BOLD}Docker{RESET:<12} : {GREEN if docker_ok else RED}{docker_v.strip() if docker_ok else 'FAILED'}{RESET}")

    print(f"\n{YELLOW}💡 Running the Dashboard: You are now fully configured to host your bot platform!{RESET}")
    print(f" Run {BOLD}npm install{RESET} and then {BOLD}npm run dev{RESET} to launch your panel natively or inside your containers.\n")

if __name__ == "__main__":
    main()
