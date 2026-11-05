/**
 * digital-twin.js
 * ---------------
 * First-Principles Thermodynamic Edge Computing & Live Simulator Engine.
 * Tim: Dicoba Aja Dulu
 * Departemen Teknik Instrumentasi, Fakultas Vokasi, ITS Surabaya
 * (Moreno Rizkihakiki, Muhammad Alif Al Ayyubi, Muhammad Abigail Novarianto, Shefi Pildun Yulitalia)
 */

class DigitalTwinEngine {
  constructor() {
    // Physical Constants
    this.AREA = 85.4;              // m^2 (Shell-and-tube HE effective area)
    this.U_CLEAN = 650.0;          // W/m^2*K (Clean baseline coefficient)
    this.RF_CRIT = 0.0005;         // m^2*K/W (Critical alert threshold)
    this.ETA_FURNACE = 0.80;       // 80% furnace thermal efficiency
    this.LHV_FUEL = 38.5e6;        // J/Nm^3 (Fuel gas lower heating value)
    this.CP_CRUDE = 2150.0;        // J/(kg*K) average crude specific heat capacity

    // Current Process State
    this.state = {
      th_in: 220.0,
      th_out: 160.0,
      tc_in: 110.0,
      tc_out: 170.0,
      mass_flow: 105.0, // kg/s
      // Derived metrics
      lmtd: 50.0,
      q_duty_kw: 0,
      u_actual: 482.1,
      rf: 0.00052,
      fuel_penalty: 83.8,
      annual_cost: 140000,
      co2_tons: 1200,
      isAlert: true
    };

    this.initDOM();
    this.computeAll();
  }

  initDOM() {
    // Sliders
    this.sliderThIn = document.getElementById('slider-th-in');
    this.sliderThOut = document.getElementById('slider-th-out');
    this.sliderTcIn = document.getElementById('slider-tc-in');
    this.sliderTcOut = document.getElementById('slider-tc-out');
    this.sliderFlow = document.getElementById('slider-flow');

    // Value Labels
    this.valThIn = document.getElementById('val-th-in');
    this.valThOut = document.getElementById('val-th-out');
    this.valTcIn = document.getElementById('val-tc-in');
    this.valTcOut = document.getElementById('val-tc-out');
    this.valFlow = document.getElementById('val-flow');

    // Metric Displays
    this.dispLmtd = document.getElementById('disp-lmtd');
    this.dispU = document.getElementById('disp-u');
    this.dispRf = document.getElementById('disp-rf');
    this.dispFuel = document.getElementById('disp-fuel');
    this.dispCost = document.getElementById('disp-cost');
    this.dispCo2 = document.getElementById('disp-co2');
    this.dispStatusBadge = document.getElementById('disp-status-badge');

    // Preset buttons
    this.btnPresetClean = document.getElementById('btn-preset-clean');
    this.btnPresetMod = document.getElementById('btn-preset-mod');
    this.btnPresetSev = document.getElementById('btn-preset-sev');
    this.btnPresetPost = document.getElementById('btn-preset-post');

    this.bindEvents();
  }

  bindEvents() {
    const inputs = [
      this.sliderThIn, this.sliderThOut,
      this.sliderTcIn, this.sliderTcOut,
      this.sliderFlow
    ];

    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.readInputs();
          this.computeAll();
        });
      }
    });

    if (this.btnPresetClean) {
      this.btnPresetClean.addEventListener('click', () => this.applyPreset(220, 160, 110, 170, 115, 648.7));
    }
    if (this.btnPresetMod) {
      this.btnPresetMod.addEventListener('click', () => this.applyPreset(220, 165, 110, 165, 105, 482.1));
    }
    if (this.btnPresetSev) {
      this.btnPresetSev.addEventListener('click', () => this.applyPreset(220, 175, 110, 155, 95, 317.3));
    }
    if (this.btnPresetPost) {
      this.btnPresetPost.addEventListener('click', () => this.applyPreset(220, 161, 110, 169, 112, 640.5));
    }
  }

  readInputs() {
    if (this.sliderThIn) this.state.th_in = parseFloat(this.sliderThIn.value);
    if (this.sliderThOut) this.state.th_out = parseFloat(this.sliderThOut.value);
    if (this.sliderTcIn) this.state.tc_in = parseFloat(this.sliderTcIn.value);
    if (this.sliderTcOut) this.state.tc_out = parseFloat(this.sliderTcOut.value);
    if (this.sliderFlow) this.state.mass_flow = parseFloat(this.sliderFlow.value);

    // Update labels
    if (this.valThIn) this.valThIn.textContent = `${this.state.th_in.toFixed(1)} °C`;
    if (this.valThOut) this.valThOut.textContent = `${this.state.th_out.toFixed(1)} °C`;
    if (this.valTcIn) this.valTcIn.textContent = `${this.state.tc_in.toFixed(1)} °C`;
    if (this.valTcOut) this.valTcOut.textContent = `${this.state.tc_out.toFixed(1)} °C`;
    if (this.valFlow) this.valFlow.textContent = `${this.state.mass_flow.toFixed(1)} kg/s`;
  }

  applyPreset(th_in, th_out, tc_in, tc_out, flow, forcedU = null) {
    if (this.sliderThIn) this.sliderThIn.value = th_in;
    if (this.sliderThOut) this.sliderThOut.value = th_out;
    if (this.sliderTcIn) this.sliderTcIn.value = tc_in;
    if (this.sliderTcOut) this.sliderTcOut.value = tc_out;
    if (this.sliderFlow) this.sliderFlow.value = flow;

    this.readInputs();
    this.computeAll(forcedU);
  }

  calculateLMTD(th_in, th_out, tc_in, tc_out) {
    const dt1 = th_in - tc_out;
    const dt2 = th_out - tc_in;

    if (dt1 <= 0 || dt2 <= 0) {
      return 50.0;
    }

    if (Math.abs(dt1 - dt2) < 1e-4) {
      return (dt1 + dt2) / 2.0;
    }

    return (dt1 - dt2) / Math.log(dt1 / dt2);
  }

  computeAll(forcedU = null) {
    // 1. LMTD
    const lmtd = this.calculateLMTD(
      this.state.th_in, this.state.th_out,
      this.state.tc_in, this.state.tc_out
    );
    this.state.lmtd = lmtd;

    // 2. Heat Duty Q = m * cp * (Th_in - Th_out)
    const dtHot = Math.max(0.1, this.state.th_in - this.state.th_out);
    const qWatts = this.state.mass_flow * this.CP_CRUDE * dtHot;
    this.state.q_duty_kw = qWatts / 1000.0;

    // 3. Instantaneous U(t)
    let uActual;
    if (forcedU !== null) {
      uActual = forcedU;
    } else {
      uActual = qWatts / (this.AREA * lmtd);
      uActual = Math.max(100.0, Math.min(800.0, uActual));
    }
    this.state.u_actual = uActual;

    // 4. Fouling Resistance Rf(t) = 1/U(t) - 1/U_clean
    let rf = (1.0 / uActual) - (1.0 / this.U_CLEAN);
    if (rf < 0) rf = 0.0;
    this.state.rf = rf;

    // 5. Alert Trigger Check
    this.state.isAlert = rf >= this.RF_CRIT;

    // 6. Thermal Duty Deficit (Delta Q_loss in Watts)
    const deltaQLoss = Math.max(0.0, (this.U_CLEAN - uActual) * this.AREA * lmtd);

    // 7. Actionable Fuel Gas Penalty (Nm^3/h)
    const deltaVFuel = (deltaQLoss * 3600.0) / (this.ETA_FURNACE * this.LHV_FUEL);
    this.state.fuel_penalty = deltaVFuel;

    // 8. Cost & CO2 impact (Based on 50,000 BPD refinery benchmark)
    const annualFuelNm3 = deltaVFuel * 8000.0;
    this.state.annual_cost = Math.round(annualFuelNm3 * 0.35);
    this.state.co2_tons = Math.round((annualFuelNm3 * 2.05) / 1000.0);

    // Update UI elements
    this.updateUI();
  }

  updateUI() {
    if (this.dispLmtd) this.dispLmtd.textContent = this.state.lmtd.toFixed(1);
    if (this.dispU) this.dispU.textContent = this.state.u_actual.toFixed(1);
    if (this.dispRf) this.dispRf.textContent = this.state.rf.toFixed(5);
    if (this.dispFuel) this.dispFuel.textContent = `+${this.state.fuel_penalty.toFixed(1)}`;
    if (this.dispCost) this.dispCost.textContent = `$${this.state.annual_cost.toLocaleString()}`;
    if (this.dispCo2) this.dispCo2.textContent = `${this.state.co2_tons.toLocaleString()} t`;

    if (this.dispStatusBadge) {
      if (this.state.isAlert) {
        this.dispStatusBadge.className = 'status-pill status-pill-rose';
        this.dispStatusBadge.innerHTML = '<span class="status-dot dot-rose"></span> FOULING KRITIS';
      } else {
        this.dispStatusBadge.className = 'status-pill status-pill-emerald';
        this.dispStatusBadge.innerHTML = '<span class="status-dot dot-emerald"></span> KINERJA TERMAL NORMAL';
      }
    }
  }
}

window.DigitalTwinEngine = DigitalTwinEngine;
