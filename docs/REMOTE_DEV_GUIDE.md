# Remote Development with AWS EC2 + tmux

A step-by-step guide to moving your development to a remote server and working efficiently with tmux.

---

## Overview

**What you'll set up:**
1. AWS EC2 instance configured for development
2. SSH with key-based authentication
3. tmux for persistent terminal sessions
4. Your development environment (Node.js, Git, etc.)

**Why this setup?**
- Work from anywhere - your dev environment is always running
- Persistent sessions - disconnect and reconnect without losing state
- Powerful hardware - use beefy cloud instances for builds
- Consistent environment - same setup regardless of local machine

---

## Part 1: AWS EC2 Setup

### Step 1.1: Launch an EC2 Instance

1. **Go to AWS Console:** https://console.aws.amazon.com/ec2

2. **Click "Launch Instance"**

3. **Configure instance:**
   - **Name:** `dev-server` (or whatever you prefer)
   - **AMI:** Ubuntu Server 24.04 LTS (free tier eligible)
   - **Instance type:**
     - `t2.micro` (free tier - 1 vCPU, 1GB RAM) - minimal, good for testing
     - `t3.medium` (2 vCPU, 4GB RAM) - recommended for Node.js development
     - `t3.large` (2 vCPU, 8GB RAM) - comfortable for larger projects
   - **Key pair:** Create new → RSA → .pem format → Download and save securely

4. **Network settings:**
   - Allow SSH traffic from: "My IP" (more secure) or "Anywhere" (if IP changes)

5. **Storage:** 30GB gp3 (free tier allows up to 30GB)

6. **Launch instance**

### Step 1.2: Get Your Instance IP

1. Go to EC2 Dashboard → Instances
2. Click your instance
3. Copy the **Public IPv4 address** (e.g., `54.123.45.67`)

**Tip:** Consider an Elastic IP ($0 when attached) so your IP doesn't change on restart.

---

## Part 2: SSH Configuration

### Step 2.1: Secure Your Key File

```bash
# Move key to SSH directory
mv ~/Downloads/your-key.pem ~/.ssh/

# Set correct permissions (REQUIRED - SSH won't work otherwise)
chmod 400 ~/.ssh/your-key.pem
```

### Step 2.2: Create SSH Config (Recommended)

This lets you connect with just `ssh dev` instead of typing the full command.

```bash
# Open or create SSH config
nano ~/.ssh/config
```

Add this configuration:
```
Host dev
    HostName 18.222.98.123         # Your EC2 public IP
    User ubuntu                     # Default user for Ubuntu AMI
    IdentityFile ~/.ssh/photos-crm-key-pair-rsa.pem
    ServerAliveInterval 60          # Keeps connection alive
    ServerAliveCountMax 3
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

### Step 2.3: Test Connection

```bash
ssh dev
```

You should see the Ubuntu welcome message. Type `exit` to disconnect.

**Troubleshooting:**
- "Permission denied" → Check key permissions: `chmod 400 ~/.ssh/your-key.pem`
- "Connection refused" → Check security group allows SSH (port 22)
- "Connection timed out" → Check instance is running and IP is correct

---

## Part 3: Server Setup

### Step 3.1: Update System

```bash
ssh dev

# Update package lists and upgrade
sudo apt update && sudo apt upgrade -y
```

### Step 3.2: Install Development Tools

```bash
# Essential tools
sudo apt install -y git curl wget build-essential

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
git --version    # Should show git version 2.x.x
```

### Step 3.3: Configure Git

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### Step 3.4: Generate SSH Key for GitHub

```bash
# Generate key
ssh-keygen -t ed25519 -C "your@email.com"

# Press Enter for default location, optionally add passphrase

# Display public key
cat ~/.ssh/id_ed25519.pub
```

**Add to GitHub:**
1. Go to https://github.com/settings/keys
2. Click "New SSH key"
3. Paste the public key
4. Click "Add SSH key"

**Test connection:**
```bash
ssh -T git@github.com
# Should say "Hi username! You've successfully authenticated..."
```

---

## Part 4: tmux Setup

### Step 4.1: Install tmux

```bash
sudo apt install -y tmux
```

### Step 4.2: Understand tmux Basics

**Key Concepts:**
- **Session:** A collection of windows (like a workspace)
- **Window:** A full-screen terminal (like a tab)
- **Pane:** A split within a window

**Prefix Key:** All tmux commands start with `Ctrl+b` (hold Ctrl, press b, release both, then press next key)

### Step 4.3: Essential tmux Commands

```
SESSIONS
--------
tmux new -s dev          # Create session named "dev"
tmux ls                  # List sessions
tmux attach -t dev       # Attach to session "dev"
tmux kill-session -t dev # Kill session "dev"

INSIDE TMUX (prefix = Ctrl+b)
-----------------------------
Ctrl+b d                 # Detach (leave session running)
Ctrl+b c                 # Create new window
Ctrl+b n                 # Next window
Ctrl+b p                 # Previous window
Ctrl+b 0-9               # Go to window number
Ctrl+b ,                 # Rename current window
Ctrl+b %                 # Split pane vertically (left/right)
Ctrl+b "                 # Split pane horizontally (top/bottom)
Ctrl+b arrow             # Move between panes
Ctrl+b x                 # Kill current pane
Ctrl+b [                 # Enter scroll mode (q to exit)
Ctrl+b ?                 # Show all keybindings
```

### Step 4.4: Configure tmux (Optional but Recommended)

Create a config file:
```bash
nano ~/.tmux.conf
```

Add this beginner-friendly configuration:
```tmux
# Enable mouse support (click to select panes, scroll, resize)
set -g mouse on

# Start window numbering at 1 (easier to reach)
set -g base-index 1
setw -g pane-base-index 1

# Increase scrollback buffer
set -g history-limit 10000

# Easier split keys
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# Reload config with prefix + r
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# Better colors
set -g default-terminal "screen-256color"

# Status bar
set -g status-style bg=colour235,fg=colour136
set -g status-left '#[fg=colour148]#S '
set -g status-right '#[fg=colour136]%Y-%m-%d %H:%M'
```

Reload config:
```bash
tmux source-file ~/.tmux.conf
```

---

## Part 5: Daily Workflow

### Starting Your Day

```bash
# From your local machine
ssh dev

# Attach to existing session OR create new one
tmux attach -t dev || tmux new -s dev
```

### Recommended Window Layout

```
Window 1: Editor (vim/neovim for code)
Window 2: Dev server (npm run dev)
Window 3: Git operations
Window 4: Database/misc commands
```

Create this layout:
```bash
# In tmux session
tmux rename-window editor         # Rename current window
tmux new-window -n server         # Create "server" window
tmux new-window -n git            # Create "git" window
tmux new-window -n misc           # Create "misc" window
```

### Ending Your Day

```bash
# Just detach - everything keeps running!
Ctrl+b d
```

Or from outside tmux:
```bash
tmux detach
```

### The Magic: Persistent Sessions

When you:
1. Close your laptop
2. Lose internet connection
3. Switch networks

Your tmux session **keeps running** on the server. Just SSH back in and `tmux attach`.

---

## Part 6: Transfer Your Project

### Option A: Clone from GitHub

```bash
ssh dev
cd ~
git clone git@github.com:yuvalkesten/photo-business-platform.git
cd photo-business-platform
npm install
```

### Option B: Copy Files with rsync

```bash
# From your LOCAL machine
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ~/code/photo-business-platform/ \
  dev:~/photo-business-platform/
```

### Set Up Environment Variables

```bash
ssh dev
cd ~/photo-business-platform

# Create .env.local
nano .env.local
# Paste your environment variables
```

### Run Development Server

```bash
npm run dev
```

**Access from browser:** You'll need to either:
1. Set up port forwarding (see below)
2. Open port 3000 in AWS security group

---

## Part 7: Port Forwarding (Access localhost remotely)

### Local Port Forwarding

Forward remote port 3000 to your local machine:

```bash
ssh -L 3000:localhost:3000 dev
```

Now visit `http://localhost:3000` in your browser!

**Or add to SSH config:**
```
Host dev
    HostName 54.123.45.67
    User ubuntu
    IdentityFile ~/.ssh/your-key.pem
    LocalForward 3000 localhost:3000
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    DAILY COMMANDS                           │
├─────────────────────────────────────────────────────────────┤
│ ssh dev                    Connect to server                │
│ tmux attach -t dev         Attach to session                │
│ Ctrl+b d                   Detach from session              │
├─────────────────────────────────────────────────────────────┤
│                    TMUX NAVIGATION                          │
├─────────────────────────────────────────────────────────────┤
│ Ctrl+b c                   New window                       │
│ Ctrl+b n/p                 Next/previous window             │
│ Ctrl+b 1-9                 Go to window #                   │
│ Ctrl+b %                   Split vertical                   │
│ Ctrl+b "                   Split horizontal                 │
│ Ctrl+b arrows              Move between panes               │
│ Ctrl+b [                   Scroll mode (q to exit)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Helpful Links

- **AWS EC2 Guide:** https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/
- **tmux Cheat Sheet:** https://tmuxcheatsheet.com/
- **tmux Crash Course (Video):** https://www.youtube.com/watch?v=DzNmUNvnB04
- **SSH Config Guide:** https://linuxize.com/post/using-the-ssh-config-file/

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SSH connection drops | Add `ServerAliveInterval 60` to SSH config |
| tmux session lost | Sessions survive SSH disconnect, but not server reboot |
| Can't access localhost:3000 | Set up port forwarding with `ssh -L 3000:localhost:3000 dev` |
| Slow connection | Consider region closer to you, or use mosh instead of SSH |
| Out of disk space | Check with `df -h`, clean npm cache: `npm cache clean --force` |

---

## Next Steps (Optional Enhancements)

1. **VS Code Remote SSH** - Edit files with full VS Code (if you want GUI later)
2. **mosh** - Mobile shell, handles network switching better than SSH
3. **tmux plugins** - tmux-resurrect to save/restore sessions across reboots
4. **dotfiles repo** - Version control your configs for easy setup on new servers

---

**Created:** January 10, 2026
