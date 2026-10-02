<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Status-Active-00ff88?style=for-the-badge" />
</p>

# ☁️ CloudScale — VM Auto Scaling Controller

> A real-time, interactive web dashboard that simulates **Virtual Machine Auto Scaling** in cloud environments. Built with pure HTML, CSS, and JavaScript — no frameworks, no libraries, no backend required.

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [What is Auto Scaling?](#-what-is-auto-scaling)
- [How This Project Works](#-how-this-project-works)
- [System Architecture](#-system-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Auto Scaling Algorithm](#-auto-scaling-algorithm)
- [Screenshots](#-screenshots)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 📖 About the Project

In modern cloud computing, applications face **unpredictable traffic patterns** — sudden spikes during peak hours or events, and low usage during off-hours. Manually managing server resources for these fluctuations is impractical and expensive.

**CloudScale** is a simulation-based web dashboard that demonstrates how cloud platforms like **AWS, Azure, and Google Cloud** automatically manage virtual machine instances using **auto-scaling policies**. The dashboard provides a visual, interactive experience to understand auto-scaling concepts without needing any cloud infrastructure.

### 🎯 Project Objectives

1. **Demonstrate** the concept of VM auto-scaling in cloud computing
2. **Simulate** realistic server metrics (CPU, memory, network, traffic)
3. **Visualize** real-time scaling decisions through an interactive dashboard
4. **Allow** manual intervention and policy configuration
5. **Log** all scaling events for auditing and analysis

---

## 🔍 What is Auto Scaling?

Auto scaling is a cloud computing technique that **automatically adjusts the number of running virtual machines** based on current demand.

### The Problem It Solves

| Scenario | Without Auto Scaling | With Auto Scaling |
|----------|---------------------|-------------------|
| **Traffic Spike** | Server overloads, crashes, users see errors | New VMs are launched automatically to handle load |
| **Low Traffic** | Servers sit idle, wasting money | Excess VMs are terminated to save costs |
| **Gradual Growth** | Manual intervention needed | System adapts automatically |

### How Auto Scaling Works (Real-World)

```
                    ┌──────────────────────────────┐
                    │      Load Balancer           │
                    └──────────┬───────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
         │  VM-01  │     │  VM-02  │     │  VM-03  │
         │ (Active)│     │ (Active)│     │ (Active)│
         └─────────┘     └─────────┘     └─────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │    Auto Scaling Controller    │
                    │                              │
                    │  IF avg_cpu > 80% → Add VM   │
                    │  IF avg_cpu < 20% → Remove VM│
                    │  Respect min/max limits       │
                    │  Wait for cooldown period     │
                    └──────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Scale Up** | Adding more VM instances when demand is high (e.g., CPU > 80%) |
| **Scale Down** | Removing VM instances when demand is low (e.g., CPU < 20%) |
| **Scale-Up Threshold** | The CPU percentage that triggers adding a new VM |
| **Scale-Down Threshold** | The CPU percentage that triggers removing a VM |
| **Cooldown Period** | Minimum wait time between two scaling actions to avoid rapid oscillation |
| **Min Instances** | The minimum number of VMs that must always be running |
| **Max Instances** | The maximum number of VMs allowed (budget/resource cap) |

---

## ⚙️ How This Project Works

This project **simulates** the entire auto-scaling workflow in the browser using JavaScript. Here's a step-by-step breakdown:

### 1. Simulation Engine (Every 2 Seconds)

```
┌─────────────────────────────────────────────────────┐
│                  SIMULATION LOOP                     │
│                 (runs every 2 sec)                   │
│                                                     │
│  Step 1: Generate Traffic Pattern                   │
│    └─ Random walk + occasional spikes/dips          │
│                                                     │
│  Step 2: Distribute Load Across Running VMs         │
│    └─ Total load ÷ number of running instances      │
│                                                     │
│  Step 3: Update Per-VM Metrics                      │
│    ├─ CPU:  Smooth interpolation toward target      │
│    ├─ Memory: Slow random drift                     │
│    └─ Network: Correlated with CPU usage            │
│                                                     │
│  Step 4: Calculate Aggregate Stats                  │
│    ├─ Average CPU across all running VMs            │
│    ├─ Average Memory usage                          │
│    ├─ Total requests/sec                            │
│    └─ Cost per hour ($0.048 per active VM)          │
│                                                     │
│  Step 5: Check Auto-Scaling Rules                   │
│    ├─ Is auto-scaling enabled?                      │
│    ├─ Has cooldown period elapsed?                  │
│    ├─ Is avg CPU > scale-up threshold? → Add VM    │
│    └─ Is avg CPU < scale-down threshold? → Remove  │
│                                                     │
│  Step 6: Update Dashboard UI                        │
│    ├─ Animate stat counters                         │
│    ├─ Redraw canvas charts                          │
│    ├─ Update VM table                               │
│    └─ Show toast notifications                      │
└─────────────────────────────────────────────────────┘
```

### 2. Traffic Simulation

The traffic pattern uses a **random walk algorithm** that creates realistic-looking load:

```javascript
// Base traffic + random trend creates organic patterns
trafficTrend += (Math.random() - 0.48) * 4;

// 5% chance of a traffic spike (simulates viral event, flash sale, etc.)
if (Math.random() < 0.05) trafficTrend += 30 + Math.random() * 20;

// 3% chance of a traffic dip
if (Math.random() < 0.03) trafficTrend -= 20;
```

This produces natural-looking CPU patterns that will **trigger auto-scaling events** during spikes and dips.

### 3. Per-VM CPU Calculation

Each VM's CPU is calculated using **exponential smoothing** for realism:

```javascript
// 65% of the old value + 35% of the new target → smooth transitions
vm.cpu = vm.cpu * 0.65 + targetCpu * 0.35;
```

This means CPU values don't jump suddenly — they ramp up and down gradually, just like real servers.

### 4. Auto-Scaling Decision Logic

```
                    ┌─────────────────┐
                    │ Is auto-scaling │
                    │    enabled?     │
                    └────────┬────────┘
                             │
                        YES  │  NO → Do nothing
                             ▼
                    ┌─────────────────┐
                    │  Has cooldown   │
                    │ period passed?  │
                    └────────┬────────┘
                             │
                        YES  │  NO → Wait
                             ▼
                    ┌─────────────────┐
              ┌─────│  Check avg CPU  │─────┐
              │     └─────────────────┘     │
              ▼                             ▼
      ┌───────────────┐            ┌───────────────┐
      │ CPU > 80%?    │            │ CPU < 20%?    │
      │ (Scale-Up)    │            │ (Scale-Down)  │
      └───────┬───────┘            └───────┬───────┘
              │ YES                        │ YES
              ▼                            ▼
      ┌───────────────┐            ┌───────────────┐
      │ Count < Max?  │            │ Count > Min?  │
      └───────┬───────┘            └───────┬───────┘
              │ YES                        │ YES
              ▼                            ▼
      ┌───────────────┐            ┌───────────────┐
      │  ADD new VM   │            │ REMOVE least  │
      │  (status:     │            │ utilized VM   │
      │   "scaling")  │            └───────────────┘
      └───────────────┘
```

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     BROWSER (Client-Side)                   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   index.html                          │  │
│  │  ┌─────────┐  ┌──────────────────────────────────┐   │  │
│  │  │ Sidebar │  │          Main Content             │   │  │
│  │  │  Nav    │  │  ┌────────────────────────────┐   │   │  │
│  │  │         │  │  │     Dashboard Section      │   │   │  │
│  │  │ • Dash  │  │  │  [Stats] [Charts] [Actions]│   │   │  │
│  │  │ • VMs   │  │  ├────────────────────────────┤   │   │  │
│  │  │ • Rules │  │  │    Instances Section        │   │   │  │
│  │  │ • Mon.  │  │  │  [VM Table with Controls]   │   │   │  │
│  │  │ • Logs  │  │  ├────────────────────────────┤   │   │  │
│  │  │         │  │  │     Policies Section        │   │   │  │
│  │  │ [Toggle]│  │  │  [Config] [Summary] [Visual]│   │   │  │
│  │  └─────────┘  │  ├────────────────────────────┤   │   │  │
│  │               │  │    Monitoring Section        │   │   │  │
│  │               │  │  [Health Ring] [Donut Chart] │   │   │  │
│  │               │  ├────────────────────────────┤   │   │  │
│  │               │  │    Activity Log Section      │   │   │  │
│  │               │  │  [Filter Tabs] [Log Entries] │   │   │  │
│  │               │  └────────────────────────────┘   │   │  │
│  │               └──────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │   style.css   │  │   script.js   │  │ Canvas Charts │  │
│  │  Theme +      │  │ VMAutoScaler  │  │  CPU, Memory, │  │
│  │  Animations   │  │    Class      │  │  Network, Req │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### File Roles

| File | Lines | Role |
|------|-------|------|
| `index.html` | ~280 | Page structure, all 5 sections, semantic HTML5, inline SVG icons |
| `style.css` | ~700 | Dark glassmorphism theme, CSS Grid layout, animations, responsive |
| `script.js` | ~500 | `VMAutoScaler` class — simulation, charts, auto-scaling, UI updates |

---

## ✨ Features

### 📊 Dashboard
- **4 Stat Cards** — Running Instances, Avg CPU, Avg Memory, Cost/Hour
- **Animated Counters** — Values smoothly animate using eased interpolation
- **Trend Indicators** — Shows whether each metric is rising (↑ green) or falling (↓ red)
- **4 Real-time Charts** — CPU (line), Memory (area), Network I/O (bar), Requests/sec (line)
- **Manual Scale Buttons** — One-click scale up or scale down

### 🖥️ Instances
- **VM Table** — Shows all VMs with ID, name, status, CPU bar, memory, region, uptime
- **Status Badges** — Color-coded: 🟢 Running, 🟠 Scaling, 🔴 Stopped
- **Action Buttons** — Start, Stop, or Terminate individual VMs
- **Add Instance** — Manually launch a new VM

### ⚙️ Scaling Policies
- **Configurable Thresholds** — Adjust scale-up and scale-down CPU thresholds with sliders
- **Instance Limits** — Set minimum and maximum instance counts
- **Cooldown Period** — Configure wait time between scaling events
- **Policy Summary** — Clear display of active configuration
- **Visual Threshold Bar** — Shows current CPU position relative to thresholds

### 📈 Monitoring
- **Health Ring** — Animated donut chart showing system uptime percentage
- **Resource Allocation** — Donut chart showing VM distribution (Running/Scaling/Stopped)
- **Extended CPU Chart** — Larger view of CPU history

### 📜 Activity Log
- **Timestamped Events** — All system events with precise timestamps
- **Color-Coded Types** — Info (🔵), Success (🟢), Warning (🟠), Scaling (🟣), Error (🔴)
- **Filterable** — Filter by All, Scaling, Info, Warnings, or Errors
- **Up to 100 entries** — Oldest entries are auto-removed

### 🔔 Notifications
- **Toast Notifications** — Slide-in alerts for all scaling events
- **Notification Badge** — Counter on the bell icon shows unread alerts

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **HTML5** | Semantic page structure, SEO meta tags |
| **CSS3** | Glassmorphism design, CSS Grid, Flexbox, animations, responsive layout |
| **JavaScript (ES6+)** | OOP class-based architecture, Canvas API for charts, DOM manipulation |
| **Google Fonts** | Inter font family for modern typography |
| **SVG Icons** | Inline SVGs for crisp, scalable iconography |
| **Canvas API** | Custom chart rendering (line, area, bar, donut, ring) |

> **No external libraries or frameworks** — everything is built from scratch.

---

## 🚀 Getting Started

### Prerequisites

- Any modern web browser (Chrome, Firefox, Edge, Safari)
- No server, no Node.js, no installation required

### Run the Project

**Option 1: Direct Open**
```bash
# Simply open the file in your browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

**Option 2: Using VS Code Live Server**
1. Open the project folder in VS Code
2. Install the "Live Server" extension
3. Right-click `index.html` → **Open with Live Server**

**Option 3: Python HTTP Server**
```bash
cd vm-autoscaler
python -m http.server 8000
# Visit http://localhost:8000
```

---

## 📁 Project Structure

```
vm-autoscaler/
├── index.html        # Main HTML document
├── style.css         # Complete stylesheet
├── script.js         # Application logic
└── README.md         # Project documentation (this file)
```

---

## 🧮 Auto Scaling Algorithm

### Pseudocode

```
EVERY 2 seconds:
    1. UPDATE traffic pattern using random walk
    2. FOR EACH running VM:
         a. Calculate target CPU = total_load / running_count + noise
         b. Smooth CPU: new_cpu = old_cpu × 0.65 + target × 0.35
         c. Drift memory randomly within bounds
         d. Calculate network from CPU correlation
    3. COMPUTE average CPU across all running VMs
    4. IF auto_scaling is ENABLED:
         a. IF enough time has passed since last scaling (cooldown):
              i.  IF avg_cpu > scale_up_threshold AND count < max_instances:
                     CREATE new VM (status = "scaling")
                     AFTER 3-5 sec: set status = "running"
              ii. IF avg_cpu < scale_down_threshold AND count > min_instances:
                     SELECT VM with lowest CPU
                     SET status = "scaling"
                     AFTER 2.5 sec: REMOVE VM
    5. UPDATE all UI elements
    6. REDRAW all charts
    7. LOG any scaling events
```

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Metric simulation | O(n) | Iterates through all VMs |
| Auto-scale check | O(1) | Simple threshold comparison |
| Scale down (find min CPU) | O(n) | Sorts running VMs by CPU |
| Chart rendering | O(k) | k = number of history points (60) |
| UI update | O(n) | Rebuilds VM table rows |

Where `n` = number of VMs (typically 2–10).

---

## 📸 Screenshots

After opening the project, you'll see:

1. **Dashboard** — Main view with stats, live charts, and quick actions
2. **Instances** — Click "Instances" in sidebar to see the VM table
3. **Policies** — Click "Policies" to adjust scaling rules
4. **Monitoring** — Click "Monitoring" for health ring and allocation chart
5. **Activity Log** — Click "Activity Log" to view all events

> 💡 **Tip for Examiner:** Wait 15–30 seconds on the Dashboard to see auto-scaling events happen automatically. Watch the toast notifications in the bottom-right and the Activity Log for details.

---

## 🔮 Future Enhancements

If this project were to be extended further:

- [ ] **Backend Integration** — Connect to real cloud APIs (AWS EC2, Azure VMs)
- [ ] **WebSocket Support** — Real-time data streaming from actual servers
- [ ] **Load Balancer Simulation** — Round-robin or weighted distribution
- [ ] **Cost Forecasting** — ML-based prediction of future scaling needs
- [ ] **Multi-Region Dashboard** — View and manage VMs across data centers
- [ ] **User Authentication** — Login system with role-based access
- [ ] **Data Persistence** — Store scaling history in a database
- [ ] **Alert Rules** — Email/SMS notifications for critical events
- [ ] **Container Orchestration** — Extend to Kubernetes pod auto-scaling

---

## 👨‍💻 Author
-PRIYANSHU TANWAR
- College Project — Cloud Computing / Web Technologies
- Year: 2026

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <b>⭐ If you find this project useful, please give it a star on GitHub! ⭐</b>
</p>
