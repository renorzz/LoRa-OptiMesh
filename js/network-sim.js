/**
 * network-sim.js
 * --------------
 * Interactive 5-Node Sub-GHz LoRa AODV Mesh & Failover Telemetry Simulator.
 * Light Mode & Clean Engineering Aesthetic.
 * Simulates sub-GHz (433 MHz) RF propagation, dynamic rerouting (< 450 ms),
 * and 8 MB PSRAM ring buffer store-and-forward retention.
 */

class NetworkMeshSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.packets = [];
    this.gateway = null;

    // States
    this.isGatewayDown = false;
    this.isRelayNode2Killed = false;
    this.psramBufferedPackets = 0;
    this.rerouteLatencyMs = 380;
    this.pdr = 99.4;

    // UI elements
    this.btnKillGateway = document.getElementById('btn-kill-gateway');
    this.btnKillNode2 = document.getElementById('btn-kill-node2');
    this.btnRestoreMesh = document.getElementById('btn-restore-mesh');
    this.dispPdr = document.getElementById('disp-mesh-pdr');
    this.dispPsram = document.getElementById('disp-mesh-psram');
    this.dispLatency = document.getElementById('disp-mesh-latency');
    this.dispMeshStatus = document.getElementById('disp-mesh-status');

    this.initNetworkTopology();
    this.bindEvents();
    this.animate();
  }

  initNetworkTopology() {
    const w = this.canvas.width = this.canvas.parentElement.clientWidth;
    const h = this.canvas.height = 360;

    // 5 LoRa-OptiMesh Nodes + 1 Gateway
    this.nodes = [
      { id: 1, name: 'Node 1 (HE-101)', x: w * 0.15, y: h * 0.35, active: true, isRelay: true, rssi: -88 },
      { id: 2, name: 'Node 2 (HE-102)', x: w * 0.38, y: h * 0.22, active: true, isRelay: true, rssi: -94 },
      { id: 3, name: 'Node 3 (HE-103)', x: w * 0.40, y: h * 0.72, active: true, isRelay: true, rssi: -91 },
      { id: 4, name: 'Node 4 (HE-104)', x: w * 0.65, y: h * 0.35, active: true, isRelay: true, rssi: -96 },
      { id: 5, name: 'Node 5 (HE-105)', x: w * 0.68, y: h * 0.75, active: true, isRelay: true, rssi: -98 },
    ];

    this.gateway = {
      name: 'LoRa Base Gateway',
      x: w * 0.88,
      y: h * 0.50,
      active: true
    };
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      if (this.canvas && this.canvas.parentElement) {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = 360;
        this.initNetworkTopology();
      }
    });

    if (this.btnKillGateway) {
      this.btnKillGateway.addEventListener('click', () => {
        this.isGatewayDown = !this.isGatewayDown;
        this.gateway.active = !this.isGatewayDown;
        this.btnKillGateway.classList.toggle('active', this.isGatewayDown);
        this.btnKillGateway.textContent = this.isGatewayDown ? 'Pulihkan Gateway' : 'Simulasi Pemadaman Gateway';
        this.updateMeshUI();
      });
    }

    if (this.btnKillNode2) {
      this.btnKillNode2.addEventListener('click', () => {
        this.isRelayNode2Killed = !this.isRelayNode2Killed;
        this.nodes[1].active = !this.isRelayNode2Killed;
        this.btnKillNode2.classList.toggle('active', this.isRelayNode2Killed);
        this.btnKillNode2.textContent = this.isRelayNode2Killed ? 'Hidupkan Node 2' : 'Matikan Relay Node 2';
        this.updateMeshUI();
      });
    }

    if (this.btnRestoreMesh) {
      this.btnRestoreMesh.addEventListener('click', () => {
        this.isGatewayDown = false;
        this.isRelayNode2Killed = false;
        this.gateway.active = true;
        this.nodes.forEach(n => n.active = true);
        this.psramBufferedPackets = 0;

        if (this.btnKillGateway) {
          this.btnKillGateway.classList.remove('active');
          this.btnKillGateway.textContent = 'Simulasi Pemadaman Gateway';
        }
        if (this.btnKillNode2) {
          this.btnKillNode2.classList.remove('active');
          this.btnKillNode2.textContent = 'Matikan Relay Node 2';
        }
        this.updateMeshUI();
      });
    }
  }

  updateMeshUI() {
    if (this.dispPdr) {
      this.dispPdr.textContent = this.isGatewayDown ? '99.4% (PSRAM)' : '99.4%';
    }
    if (this.dispLatency) {
      this.dispLatency.textContent = this.isRelayNode2Killed ? '380 ms (AODV)' : '< 450 ms';
    }
    if (this.dispMeshStatus) {
      if (this.isGatewayDown) {
        this.dispMeshStatus.textContent = 'Peringatan: Gateway utama tidak terhubung. Seluruh telemetri disimpan aman di dalam ring buffer 8 MB PSRAM pada node (mode store-and-forward tanpa kehilangan data).';
        this.dispMeshStatus.className = 'status-msg-amber';
      } else if (this.isRelayNode2Killed) {
        this.dispMeshStatus.textContent = 'Kegagalan Relay Node 2 terdeteksi. Protokol AODV secara mandiri mengalihkan rute transmisi via Node 3 dalam 380 ms dengan 0% packet drop.';
        this.dispMeshStatus.className = 'status-msg-blue';
      } else {
        this.dispMeshStatus.textContent = 'Jaringan Mesh Sub-GHz Normal. Beroperasi pada frekuensi 433.0 MHz (SF10, CR 4/8, Ra-02). Seluruh hop telemetri seimbang.';
        this.dispMeshStatus.className = 'status-msg-emerald';
      }
    }
  }

  spawnPacket() {
    if (Math.random() < 0.04) {
      this.packets.push({
        sourceId: 1,
        x: this.nodes[0].x,
        y: this.nodes[0].y,
        progress: 0,
        path: this.calculateCurrentPath(1)
      });
    }
  }

  calculateCurrentPath(sourceNodeId) {
    if (this.isGatewayDown) {
      return null;
    }

    if (this.isRelayNode2Killed) {
      return [
        { x: this.nodes[0].x, y: this.nodes[0].y },
        { x: this.nodes[2].x, y: this.nodes[2].y },
        { x: this.nodes[3].x, y: this.nodes[3].y },
        { x: this.gateway.x, y: this.gateway.y }
      ];
    }

    return [
      { x: this.nodes[0].x, y: this.nodes[0].y },
      { x: this.nodes[1].x, y: this.nodes[1].y },
      { x: this.nodes[3].x, y: this.nodes[3].y },
      { x: this.gateway.x, y: this.gateway.y }
    ];
  }

  drawTopology() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle background grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < this.canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    // Draw active RF links
    this.drawRfLink(this.nodes[0], this.nodes[1], !this.isRelayNode2Killed);
    this.drawRfLink(this.nodes[0], this.nodes[2], this.isRelayNode2Killed);
    this.drawRfLink(this.nodes[1], this.nodes[3], !this.isRelayNode2Killed);
    this.drawRfLink(this.nodes[2], this.nodes[4], true);
    this.drawRfLink(this.nodes[2], this.nodes[3], this.isRelayNode2Killed);
    this.drawRfLink(this.nodes[3], this.gateway, !this.isGatewayDown);
    this.drawRfLink(this.nodes[4], this.gateway, !this.isGatewayDown);

    // Draw Nodes
    this.nodes.forEach(node => {
      this.drawNode(node);
    });

    // Draw Gateway
    this.drawGateway();

    // Draw & Update Packets
    this.drawPackets();
  }

  drawRfLink(from, to, active) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (active) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
    } else {
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawNode(node) {
    const ctx = this.ctx;
    const isOnline = node.active;

    // Outer ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = isOnline ? 'rgba(2, 132, 199, 0.12)' : 'rgba(225, 29, 72, 0.12)';
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = isOnline ? '#0284c7' : '#e11d48';
    ctx.fill();

    // Node Name
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = isOnline ? '#0f172a' : '#e11d48';
    ctx.textAlign = 'center';
    ctx.fillText(node.name, node.x, node.y - 18);

    // RSSI info
    ctx.font = '500 10px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${node.rssi} dBm`, node.x, node.y + 24);
  }

  drawGateway() {
    const ctx = this.ctx;
    const isOnline = this.gateway.active;

    // Gateway Base
    ctx.beginPath();
    ctx.arc(this.gateway.x, this.gateway.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = isOnline ? 'rgba(5, 150, 105, 0.15)' : 'rgba(225, 29, 72, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.gateway.x, this.gateway.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = isOnline ? '#059669' : '#e11d48';
    ctx.fill();

    // Label
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = isOnline ? '#059669' : '#e11d48';
    ctx.textAlign = 'center';
    ctx.fillText('BASE GATEWAY', this.gateway.x, this.gateway.y - 24);

    ctx.font = '600 9px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(isOnline ? '433 MHz ONLINE' : 'DISCONNECTED', this.gateway.x, this.gateway.y + 26);
  }

  drawPackets() {
    const ctx = this.ctx;

    if (this.isGatewayDown) {
      this.psramBufferedPackets += 1;
      if (this.dispPsram) {
        this.dispPsram.textContent = `${this.psramBufferedPackets.toLocaleString()} pkts`;
      }
      return;
    }

    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      if (!p.path || p.path.length < 2) {
        this.packets.splice(i, 1);
        continue;
      }

      p.progress += 0.018;
      const totalSegments = p.path.length - 1;
      const segmentProgress = p.progress * totalSegments;
      const segIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
      const subProg = segmentProgress - segIndex;

      const p1 = p.path[segIndex];
      const p2 = p.path[segIndex + 1];

      const curX = p1.x + (p2.x - p1.x) * subProg;
      const curY = p1.y + (p2.y - p1.y) * subProg;

      // Draw packet dot
      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();

      if (p.progress >= 1.0) {
        this.packets.splice(i, 1);
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.spawnPacket();
    this.drawTopology();
  }
}

window.NetworkMeshSimulator = NetworkMeshSimulator;
