#!/bin/bash

# ANSI color codes for premium terminal feedback
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${BOLD}${CYAN}===============================================================${NC}"
echo -e "${BOLD}${CYAN}             XORVILA PANEL AUTOMATED DEPLOYMENT                ${NC}"
echo -e "${BOLD}${CYAN}===============================================================${NC}"

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}✗ Error: This installer must be run as root.${NC}"
  echo -e "${YELLOW}👉 Please run: sudo bash $0${NC}"
  exit 1
fi

# Step 1: Install Python 3 if missing to bootstrap the setup script
echo -e "\n${BOLD}${BLUE}[1/4] Bootstrapping Python 3 environment...${NC}"
if ! command -v python3 &> /dev/null; then
  echo -e "${YELLOW}Python 3 is missing. Installing native minimal setup...${NC}"
  if command -v apt-get &> /dev/null; then
    apt-get update -y && apt-get install -y python3
  elif command -v yum &> /dev/null; then
    yum install -y python3
  else
    echo -e "${RED}✗ Unsupported package manager. Please install Python 3 manually.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Python 3 is already active.${NC}"
fi

# Step 2: Run the full provisioning suite
echo -e "\n${BOLD}${BLUE}[2/4] Deploying System-wide VPS dependency suite (Docker, Node, NPM)...${NC}"
python3 setup_vps.py
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ VPS setup failed. Please review errors above.${NC}"
  exit 1
fi

# Step 3: Install Node modules and compile web files
echo -e "\n${BOLD}${BLUE}[3/4] Installing web dependencies & building production code...${NC}"
if [ -f "package.json" ]; then
  echo -e "${CYAN}Running npm install...${NC}"
  npm install
  
  echo -e "${CYAN}Compiling application assets...${NC}"
  npm run build
else
  echo -e "${RED}✗ package.json not found in the current directory!${NC}"
  echo -e "${YELLOW}Make sure you are running this script inside the project folder.${NC}"
  exit 1
fi

# Step 4: Run the Web Dashboard
echo -e "\n${BOLD}${GREEN}[4/4] Starting Xorvila Web Dashboard...${NC}"
echo -e "${CYAN}Launching panel on http://localhost:3000...${NC}"
echo -e "${YELLOW}💡 Tip: To run this permanently in the background, run: npm install -g pm2 && pm2 start dist/server.cjs --name xorvila-panel${NC}"
echo -e "${BOLD}${GREEN}===============================================================${NC}\n"

# Run the web server
npm run start
