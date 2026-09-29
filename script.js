/**
 * CloudScale — VM Auto Scaling Controller
 * Fully self-contained dashboard with simulated metrics, auto-scaling logic,
 * canvas charts, activity logging, and toast notifications.
 */

class VMAutoScaler {
  constructor() {
    // ── VM State ──
    this.vms = [];
    this.vmIdCounter = 1;
    this.regions = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-south-1'];
    this.instanceTypes = ['t3.medium', 'c5.large', 'm5.large', 'r5.xlarge'];

    // ── Metrics History (last 60 data points) ──
    this.maxHistory = 60;
    this.metricsHistory = {
      cpu: Array(this.maxHistory).fill(0),
      memory: Array(this.maxHistory).fill(0),
      network: Array(this.maxHistory).fill(0),
      requests: Array(this.maxHistory).fill(0),
    };

    // ── Scaling Config ──
    this.scalingConfig = {
      enabled: true,
      minInstances: 2,
      maxInstances: 10,
      scaleUpThreshold: 80,
      scaleDownThreshold: 20,
      cooldown: 15000,  // ms
      lastScaleTime: 0,
    };

    // ── Dashboard Stats ──
    this.stats = {
      runningInstances: 0,
      avgCpu: 0,
      avgMemory: 0,
      requestsPerSecond: 0,
      costPerHour: 0,
      uptime: 99.97,
    };
    this.prevStats = { ...this.stats };

    // ── Activity Log ──
    this.activityLog = [];
    this.logFilter = 'all';
    this.notifCount = 0;

    // ── Simulation ──
    this.baseTraffic = 50;
    this.trafficTrend = 0;

    // ── Charts ──
    this.charts = {};

    // ── Init ──
    this.init();
  }

  // ═══════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════

  init() {
    this.generateInitialVMs(6);
    this.bindEvents();
    this.initCharts();
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);

    // Start simulation loop (every 2s)
    this.simulationLoop();
    setInterval(() => this.simulationLoop(), 2000);

    // Uptime counter
    setInterval(() => {
      this.vms.forEach(vm => { if (vm.status === 'running') vm.uptime++; });
    }, 1000);

    this.addLog('System initialized. CloudScale auto-scaler is ready.', 'success');
    this.showToast('Dashboard Online', 'success');
  }

  // ═══════════════════════════════════════════
  //  EVENT BINDING
  // ═══════════════════════════════════════════

  bindEvents() {
    // ── Navigation ──
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.navigateTo(section);
      });
    });

    // ── Auto-scale toggle ──
    const toggle = document.getElementById('toggle-autoscale');
    if (toggle) {
      toggle.checked = this.scalingConfig.enabled;
      toggle.addEventListener('change', (e) => {
        this.scalingConfig.enabled = e.target.checked;
        this.addLog(`Auto-scaling ${this.scalingConfig.enabled ? 'enabled' : 'disabled'}`, 'info');
        this.showToast(`Auto-scaling ${this.scalingConfig.enabled ? 'enabled' : 'disabled'}`, this.scalingConfig.enabled ? 'success' : 'warning');
        this.updatePolicySummary();
      });
    }

    // ── Scale buttons ──
    this.bindClick('btn-scale-up', () => this.scaleUp('Manual'));
    this.bindClick('btn-scale-down', () => this.scaleDown('Manual'));
    this.bindClick('btn-add-instance', () => this.scaleUp('Manual'));

    // ── Policy sliders ──
    this.bindSlider('slider-cpu-up', 'val-cpu-up', (v) => { this.scalingConfig.scaleUpThreshold = v; });
    this.bindSlider('slider-cpu-down', 'val-cpu-down', (v) => { this.scalingConfig.scaleDownThreshold = v; });

    // ── Policy inputs ──
    this.bindInput('input-min-instances', (v) => { this.scalingConfig.minInstances = Math.max(1, v); });
    this.bindInput('input-max-instances', (v) => { this.scalingConfig.maxInstances = Math.max(1, v); });
    this.bindInput('input-cooldown', (v) => { this.scalingConfig.cooldown = Math.max(5, v) * 1000; });

    // ── Save policy ──
    this.bindClick('btn-save-policy', () => {
      this.updatePolicySummary();
      this.showToast('Policy configuration saved', 'success');
      this.addLog('Scaling policy updated', 'info');
    });

    // ── Log filters ──
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.logFilter = btn.dataset.filter;
        this.updateLogUI();
      });
    });
  }

  bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  bindSlider(sliderId, valueId, handler) {
    const slider = document.getElementById(sliderId);
    const valEl = document.getElementById(valueId);
    if (slider) {
      slider.addEventListener('input', (e) => {
        const v = parseInt(e.target.value);
        if (valEl) valEl.textContent = v + '%';
        handler(v);
      });
    }
  }

  bindInput(id, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        handler(parseInt(e.target.value) || 0);
      });
    }
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════

  navigateTo(section) {
    // Update nav highlight
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Show section
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.add('active');

    // Update title
    const titles = {
      dashboard: ['Dashboard', 'Real-time cluster overview'],
      instances: ['Instances', 'Manage virtual machine instances'],
      policies: ['Scaling Policies', 'Configure auto-scaling rules'],
      monitoring: ['Monitoring', 'Cluster health & resource allocation'],
      logs: ['Activity Log', 'System events & scaling history'],
    };
    const [title, subtitle] = titles[section] || ['Dashboard', ''];
    const titleEl = document.getElementById('page-title');
    const subEl = document.getElementById('page-subtitle');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;

    // Re-init charts when sections become visible
    if (section === 'monitoring') {
      setTimeout(() => {
        this.drawHealthRing();
        this.drawAllocationChart();
        this.drawChart('cpuChartLarge', this.metricsHistory.cpu, '#00d4ff', 'area', 100);
      }, 50);
    }
  }

  // ═══════════════════════════════════════════
  //  VM MANAGEMENT
  // ═══════════════════════════════════════════

  generateInitialVMs(count) {
    for (let i = 0; i < count; i++) this.addVM(true);
  }

  addVM(initial = false) {
    const id = `vm-${String(this.vmIdCounter++).padStart(3, '0')}`;
    const vm = {
      id,
      name: `worker-${Math.random().toString(36).substring(2, 8)}`,
      status: initial ? 'running' : 'scaling',
      cpu: 15 + Math.random() * 30,
      memory: 20 + Math.random() * 30,
      network: Math.random() * 100,
      region: this.regions[Math.floor(Math.random() * this.regions.length)],
      instanceType: this.instanceTypes[Math.floor(Math.random() * this.instanceTypes.length)],
      uptime: initial ? Math.floor(Math.random() * 7200) : 0,
      ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
    };
    this.vms.push(vm);

    if (!initial) {
      setTimeout(() => {
        const found = this.vms.find(v => v.id === id);
        if (found && found.status === 'scaling') {
          found.status = 'running';
          this.showToast(`${id} is now running`, 'success');
          this.addLog(`${id} started successfully in ${found.region}`, 'success');
          this.updateVMTable();
        }
      }, 3000 + Math.random() * 2000);
    }

    return vm;
  }

  removeVM() {
    const running = this.vms.filter(v => v.status === 'running');
    if (running.length === 0) return null;

    // Remove least-utilized
    running.sort((a, b) => a.cpu - b.cpu);
    const target = running[0];
    target.status = 'scaling';

    setTimeout(() => {
      this.vms = this.vms.filter(v => v.id !== target.id);
      this.updateVMTable();
    }, 2500);

    return target;
  }

  toggleVM(id) {
    const vm = this.vms.find(v => v.id === id);
    if (!vm) return;

    if (vm.status === 'running') {
      vm.status = 'stopped';
      this.addLog(`${id} stopped manually`, 'warning');
      this.showToast(`${id} stopped`, 'warning');
    } else if (vm.status === 'stopped') {
      vm.status = 'scaling';
      this.addLog(`${id} starting...`, 'info');
      setTimeout(() => {
        const v = this.vms.find(x => x.id === id);
        if (v) {
          v.status = 'running';
          v.uptime = 0;
          this.updateVMTable();
          this.showToast(`${id} is running`, 'success');
        }
      }, 2500);
    }
    this.updateVMTable();
  }

  terminateVM(id) {
    const vm = this.vms.find(v => v.id === id);
    if (!vm) return;
    vm.status = 'scaling';
    this.updateVMTable();
    this.addLog(`Terminating ${id}...`, 'warning');

    setTimeout(() => {
      this.vms = this.vms.filter(v => v.id !== id);
      this.updateVMTable();
      this.addLog(`${id} terminated`, 'error');
      this.showToast(`${id} terminated`, 'error');
    }, 2000);
  }

  // ═══════════════════════════════════════════
  //  SIMULATION
  // ═══════════════════════════════════════════

  simulationLoop() {
    this.simulateMetrics();
    this.checkAutoScaling();
    this.updateDashboard();
    this.updateVMTable();
    this.drawDashboardCharts();
  }

  simulateMetrics() {
    // Natural traffic trend with occasional spikes
    this.trafficTrend += (Math.random() - 0.48) * 4;
    this.trafficTrend = Math.max(-25, Math.min(40, this.trafficTrend));

    // Random spike ~5% chance
    if (Math.random() < 0.05) {
      this.trafficTrend += 30 + Math.random() * 20;
      this.addLog('Traffic spike detected!', 'warning');
    }
    // Random dip ~3% chance
    if (Math.random() < 0.03) {
      this.trafficTrend -= 20;
    }

    const runningVMs = this.vms.filter(v => v.status === 'running');
    const runningCount = runningVMs.length;
    const loadPerInstance = (this.baseTraffic + this.trafficTrend) / Math.max(1, runningCount);

    let totalCpu = 0, totalMem = 0, totalNet = 0;

    runningVMs.forEach(vm => {
      // CPU: smooth toward target
      const targetCpu = loadPerInstance + (Math.random() * 16 - 8);
      vm.cpu = Math.max(2, Math.min(99, vm.cpu * 0.65 + targetCpu * 0.35));

      // Memory: slow drift
      vm.memory = Math.max(8, Math.min(95, vm.memory + (Math.random() * 3 - 1.4)));

      // Network
      vm.network = vm.cpu * (0.5 + Math.random() * 0.8) * 8;

      totalCpu += vm.cpu;
      totalMem += vm.memory;
      totalNet += vm.network;
    });

    // Save previous stats for trends
    this.prevStats = { ...this.stats };

    this.stats.runningInstances = runningCount;
    this.stats.avgCpu = runningCount > 0 ? totalCpu / runningCount : 0;
    this.stats.avgMemory = runningCount > 0 ? totalMem / runningCount : 0;
    this.stats.requestsPerSecond = Math.max(0, (this.baseTraffic + this.trafficTrend) * 12 + Math.random() * 40);
    this.stats.costPerHour = this.vms.filter(v => v.status !== 'stopped').length * 0.048;

    // Push to history
    this.metricsHistory.cpu.push(this.stats.avgCpu);
    if (this.metricsHistory.cpu.length > this.maxHistory) this.metricsHistory.cpu.shift();

    this.metricsHistory.memory.push(this.stats.avgMemory);
    if (this.metricsHistory.memory.length > this.maxHistory) this.metricsHistory.memory.shift();

    this.metricsHistory.network.push(totalNet);
    if (this.metricsHistory.network.length > this.maxHistory) this.metricsHistory.network.shift();

    this.metricsHistory.requests.push(this.stats.requestsPerSecond);
    if (this.metricsHistory.requests.length > this.maxHistory) this.metricsHistory.requests.shift();
  }

  checkAutoScaling() {
    if (!this.scalingConfig.enabled) return;
    const now = Date.now();
    if (now - this.scalingConfig.lastScaleTime < this.scalingConfig.cooldown) return;

    if (this.stats.avgCpu > this.scalingConfig.scaleUpThreshold) {
      this.scaleUp('Auto');
    } else if (this.stats.avgCpu < this.scalingConfig.scaleDownThreshold) {
      this.scaleDown('Auto');
    }
  }

  scaleUp(reason) {
    const total = this.vms.filter(v => v.status !== 'stopped').length;
    if (total >= this.scalingConfig.maxInstances) {
      if (reason === 'Manual') this.showToast('Maximum instances reached', 'error');
      return;
    }

    const vm = this.addVM();
    this.scalingConfig.lastScaleTime = Date.now();
    this.addLog(`${reason} scale-up: Adding ${vm.id} (CPU: ${this.stats.avgCpu.toFixed(1)}%)`, 'scaling');
    this.showToast(`Scaling up: ${vm.id}`, 'warning');
    this.notifCount++;
    this.updateNotifBadge();
  }

  scaleDown(reason) {
    const running = this.vms.filter(v => v.status === 'running');
    if (running.length <= this.scalingConfig.minInstances) {
      if (reason === 'Manual') this.showToast('Minimum instances reached', 'error');
      return;
    }

    const vm = this.removeVM();
    if (vm) {
      this.scalingConfig.lastScaleTime = Date.now();
      this.addLog(`${reason} scale-down: Removing ${vm.id} (CPU: ${this.stats.avgCpu.toFixed(1)}%)`, 'scaling');
      this.showToast(`Scaling down: ${vm.id}`, 'info');
      this.notifCount++;
      this.updateNotifBadge();
    }
  }

  // ═══════════════════════════════════════════
  //  UI UPDATES
  // ═══════════════════════════════════════════

  updateDashboard() {
    // Animate stat values
    this.animateValue('stat-instances', this.stats.runningInstances, '', '', 0);
    this.animateValue('stat-cpu', this.stats.avgCpu, '', '%', 1);
    this.animateValue('stat-mem', this.stats.avgMemory, '', '%', 1);
    this.animateValue('stat-cost', this.stats.costPerHour, '$', '', 2);

    // Trends
    this.updateTrend('trend-instances', this.stats.runningInstances, this.prevStats.runningInstances, '', '');
    this.updateTrend('trend-cpu', this.stats.avgCpu, this.prevStats.avgCpu, '', '%');
    this.updateTrend('trend-mem', this.stats.avgMemory, this.prevStats.avgMemory, '', '%');
    this.updateTrend('trend-cost', this.stats.costPerHour, this.prevStats.costPerHour, '$', '');

    // Update threshold pointer on policies page
    const pointer = document.getElementById('threshold-pointer');
    if (pointer) pointer.style.left = Math.min(100, Math.max(0, this.stats.avgCpu)) + '%';
  }

  animateValue(elementId, newValue, prefix = '', suffix = '', decimals = 0) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const current = parseFloat(el.dataset.val) || 0;
    const target = newValue;
    const diff = target - current;
    if (Math.abs(diff) < 0.01) return;

    const steps = 15;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const val = current + diff * eased;
      el.textContent = `${prefix}${val.toFixed(decimals)}${suffix}`;
      if (step >= steps) {
        clearInterval(interval);
        el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
        el.dataset.val = target;
      }
    }, 60);
  }

  updateTrend(elementId, current, previous, prefix = '', suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;

    const diff = current - previous;
    if (Math.abs(diff) < 0.01) {
      el.textContent = '— stable';
      el.className = 'stat-trend neutral';
    } else if (diff > 0) {
      el.textContent = `↑ ${prefix}${Math.abs(diff).toFixed(1)}${suffix}`;
      el.className = 'stat-trend up';
    } else {
      el.textContent = `↓ ${prefix}${Math.abs(diff).toFixed(1)}${suffix}`;
      el.className = 'stat-trend down';
    }
  }

  updateVMTable() {
    const tbody = document.getElementById('vm-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    this.vms.forEach(vm => {
      const tr = document.createElement('tr');

      const formatUptime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h}h ${m}m ${sec}s`;
      };

      let actionHTML = '';
      if (vm.status === 'scaling') {
        actionHTML = `<button class="btn-small disabled" disabled>⏳ Busy</button>`;
      } else {
        const toggleLabel = vm.status === 'running' ? '⏹ Stop' : '▶ Start';
        actionHTML = `
          <button class="btn-small" onclick="app.toggleVM('${vm.id}')">${toggleLabel}</button>
          <button class="btn-small danger" onclick="app.terminateVM('${vm.id}')">✕</button>
        `;
      }

      tr.innerHTML = `
        <td style="color:var(--text-primary);font-weight:600">${vm.id}</td>
        <td>${vm.name}</td>
        <td><span class="badge ${vm.status}">${vm.status}</span></td>
        <td>
          <div class="progress-bar"><div class="progress ${vm.cpu > 80 ? 'danger' : ''}" style="width:${vm.cpu}%"></div></div>
          ${vm.cpu.toFixed(1)}%
        </td>
        <td>${vm.memory.toFixed(1)}%</td>
        <td>${vm.region}</td>
        <td style="font-variant-numeric:tabular-nums">${formatUptime(vm.uptime)}</td>
        <td>${actionHTML}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  updateDateTime() {
    const el = document.getElementById('datetime-display');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    }) + '  ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = this.notifCount;
      badge.style.display = this.notifCount > 0 ? 'flex' : 'none';
    }
  }

  updatePolicySummary() {
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('summary-up', `CPU > ${this.scalingConfig.scaleUpThreshold}%`);
    set('summary-down', `CPU < ${this.scalingConfig.scaleDownThreshold}%`);
    set('summary-range', `${this.scalingConfig.minInstances} — ${this.scalingConfig.maxInstances}`);
    set('summary-cooldown', `${this.scalingConfig.cooldown / 1000}s`);

    const statusEl = document.getElementById('summary-status');
    if (statusEl) {
      statusEl.textContent = this.scalingConfig.enabled ? 'Enabled' : 'Disabled';
      statusEl.className = 'policy-value ' + (this.scalingConfig.enabled ? 'status-active' : 'status-disabled');
    }

    // Update threshold markers
    const markerUp = document.getElementById('marker-up');
    const markerDown = document.getElementById('marker-down');
    if (markerUp) { markerUp.style.left = this.scalingConfig.scaleUpThreshold + '%'; markerUp.querySelector('span').textContent = this.scalingConfig.scaleUpThreshold + '%'; }
    if (markerDown) { markerDown.style.left = this.scalingConfig.scaleDownThreshold + '%'; markerDown.querySelector('span').textContent = this.scalingConfig.scaleDownThreshold + '%'; }
  }

  // ═══════════════════════════════════════════
  //  CHARTS (Canvas)
  // ═══════════════════════════════════════════

  initCharts() {
    // Dashboard charts will be drawn in the simulation loop
  }

  drawDashboardCharts() {
    this.drawChart('cpuChart', this.metricsHistory.cpu, '#00d4ff', 'line', 100);
    this.drawChart('memChart', this.metricsHistory.memory, '#a855f7', 'area', 100);
    this.drawChart('netChart', this.metricsHistory.network, '#00ff88', 'bar', null);
    this.drawChart('reqChart', this.metricsHistory.requests, '#ff6b35', 'line', null);
  }

  drawChart(canvasId, data, color, type, fixedMax) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.offsetParent) return; // Skip hidden canvases

    // Set canvas resolution to match display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 10, right: 10, bottom: 20, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxVal = fixedMax || (Math.max(...data, 1) * 1.2);
    const step = chartW / (data.length - 1 || 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Labels
      const label = ((4 - i) / 4 * maxVal).toFixed(0);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(label, padding.left - 6, y + 3);
    }

    if (type === 'bar') {
      const barW = Math.max(2, step * 0.6);
      data.forEach((val, i) => {
        const barH = (val / maxVal) * chartH;
        const x = padding.left + i * step - barW / 2;
        const y = padding.top + chartH - barH;

        const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartH);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '20');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
        ctx.fill();
      });
    } else {
      // Line / Area
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = padding.left + i * step;
        const y = padding.top + chartH - (val / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      // Stroke
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (type === 'area') {
        // Fill area
        const lastX = padding.left + (data.length - 1) * step;
        ctx.lineTo(lastX, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '05');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Dot on last point
      const lastVal = data[data.length - 1];
      const dotX = padding.left + (data.length - 1) * step;
      const dotY = padding.top + chartH - (lastVal / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
      ctx.strokeStyle = color + '60';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawHealthRing() {
    const canvas = document.getElementById('healthCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 180;
    const center = size / 2;
    const radius = 70;
    const lineWidth = 10;

    ctx.clearRect(0, 0, size, size);

    // Background ring
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Foreground ring
    const pct = this.stats.uptime / 100;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * pct);

    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(1, '#00d4ff');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  drawAllocationChart() {
    const canvas = document.getElementById('allocationChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = 300, h = 200;
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const running = this.vms.filter(v => v.status === 'running').length;
    const scaling = this.vms.filter(v => v.status === 'scaling').length;
    const stopped = this.vms.filter(v => v.status === 'stopped').length;
    const total = running + scaling + stopped || 1;

    const data = [
      { label: 'Running', value: running, color: '#00ff88' },
      { label: 'Scaling', value: scaling, color: '#ff6b35' },
      { label: 'Stopped', value: stopped, color: '#ff4757' },
    ].filter(d => d.value > 0);

    const centerX = w / 2, centerY = h / 2, radius = 70;
    let currentAngle = -Math.PI / 2;

    data.forEach(segment => {
      const sliceAngle = (segment.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      currentAngle += sliceAngle;
    });

    // Center hole (donut)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 45, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0e27';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, centerX, centerY - 6);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter';
    ctx.fillText('TOTAL', centerX, centerY + 12);

    // Legend
    const legend = document.getElementById('allocation-legend');
    if (legend) {
      legend.innerHTML = data.map(d =>
        `<div class="legend-item"><span class="legend-dot" style="background:${d.color}"></span>${d.label}: ${d.value}</div>`
      ).join('');
    }
  }

  // ═══════════════════════════════════════════
  //  ACTIVITY LOG
  // ═══════════════════════════════════════════

  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    this.activityLog.unshift({ timestamp, message, type });
    if (this.activityLog.length > 100) this.activityLog.pop();
    this.updateLogUI();
  }

  updateLogUI() {
    const container = document.getElementById('activity-log');
    if (!container) return;

    const filtered = this.logFilter === 'all'
      ? this.activityLog
      : this.activityLog.filter(l => l.type === this.logFilter);

    container.innerHTML = '';
    filtered.forEach((log, i) => {
      const el = document.createElement('div');
      el.className = `log-entry ${log.type}`;
      el.style.animationDelay = `${i * 30}ms`;
      el.innerHTML = `<span class="time">${log.timestamp}</span><span class="msg">${log.message}</span>`;
      container.appendChild(el);
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary)">No entries match this filter.</div>';
    }
  }

  // ═══════════════════════════════════════════
  //  TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
    });

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }
}

// ── Global Init ──
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new VMAutoScaler();
});
