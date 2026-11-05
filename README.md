# LoRa-OptiMesh: Hardware Prototype & Digital Twin Showcase

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Hardware-ESP32--S3%20%7C%20SX1278%20LoRa-success.svg)](https://github.com/renorzz/LoRa-OptiMesh)
[![Frequency](https://img.shields.io/badge/RF-433%20MHz%20ISM-informational.svg)](https://github.com/renorzz/LoRa-OptiMesh)
[![Institution](https://img.shields.io/badge/ITS%20Surabaya-Teknik%20Instrumentasi-blue.svg)](https://www.its.ac.id)

> **LoRa-Based Edge Computing Optimization and Fouling Monitoring for Petrochemical Heat Exchanger Networks Under Network Failover Conditions**

Proyek inovasi instrumentasi proses cerdas nirkabel sub-GHz non-invasif untuk deteksi degradasi termal dan pemantauan kerak (*fouling*) pada *Heat Exchanger Networks* (HEN) di kilang petrokimia. Mengintegrasikan komputasi termodinamika *first-principles* langsung pada mikrokontroler ESP32-S3 serta ketahanan failover *self-healing AODV multi-hop mesh*.

---

## 👥 Tim Peneliti & Pengembang

**Tim: Dicoba Aja Dulu**  
**Departemen Teknik Instrumentasi, Fakultas Vokasi**  
**Institut Teknologi Sepuluh Nopember (ITS), Surabaya, Indonesia**

### Anggota Tim:
1. **Moreno Rizkihakiki**
2. **Muhammad Alif Al Ayyubi**
3. **Muhammad Abigail Novarianto**
4. **Shefi Pildun Yulitalia**

---

## ⚡ Nilai Keunggulan & Metrik Kunci

- **&lt; $30 USD Biaya Fabrikasi Node**: Menggantikan biaya penarikan kabel *explosion-proof conduit* konvensional yang mencapai lebih dari $20.000 per titik sensor.
- **&gt; 520 m Jangkauan Sub-GHz 433 MHz**: Menggunakan modulasi Chirp Spread Spectrum (CSS) SF10 dengan daya tembus tinggi menembus rintangan rangka baja pipa kilang.
- **&lt; 450 ms Latensi Reroute Failover**: Teruji secara empiris 380 ms mengalihkan rute saat relay node terputus dengan *Packet Delivery Ratio* (PDR) 99.4%.
- **&lt; 0.85% Deviasi Aspen HYSYS**: Perhitungan LMTD, $U(t)$, resistansi kerak $R_f$, dan penalti bahan bakar dapur pembakar gas ($\text{Nm}^3/\text{jam}$) secara deterministik *on-device*.
- **96 Jam Operasi Otonom**: Baterai $\text{LiFePO}_4$ 3.2V 3200 mAh dengan regulator LDO arus diam rendah ($I_q < 25\ \mu\text{A}$) dan retensi 8 MB PSRAM *circular ring buffer* (> 300.000 paket).

---

## 🛠️ Arsitektur Perangkat Keras Fisik

Perangkat keras LoRa-OptiMesh terdiri dari dua unit utama yang saling berkomunikasi secara nirkabel pada pita frekuensi 433 MHz:

### 1. Transmitter Node (Terminal Sensor Edge)
- **SoC Mikrokontroler**: ESP32-S3-DevKitC-1-N16R8V (Dual-Core Xtensa LX7 240 MHz, 16 MB Flash, 8 MB PSRAM)
- **Modul Nirkabel**: Ai-Thinker Ra-02 (Semtech SX1278 LoRa 433 MHz)
- **Sensor Temperatur**: 4&times; Dallas DS18B20 Stainless Steel SS316 1-Wire (GPIO6)
- **Simulasi Dinamis**: Potensiometer RV1 10k pada ADC1 (GPIO1) untuk pengujian ambang batas *fouling*
- **Pemasangan**: Dudukan magnet neodymium non-invasif pada *flange* pipa tanpa henti operasi (*zero downtime*)

### 2. Gateway Node (Base Station Receiver & Alarm Central)
- **SoC Pengendali**: ESP32-S3-DevKitC-1-N16R8V
- **Modul Receiver**: Ai-Thinker Ra-02 (Semtech SX1278 LoRa 433 MHz)
- **Alarm Akustik**: Active Piezo Buzzer 85 dB pada GPIO7
- **Indikator Visual**: Dual-LED (LED Hijau GPIO16 link aktif & LED Merah GPIO15 alarm kritis)
- **Antarmuka Host**: UART / Modbus TCP ke sistem SCADA / HMI

---

## 📁 Struktur Direktori Repository

```
10_Prototype/
├── assets/
│   ├── both_device.PNG             # Foto perangkat keras lengkap (Transmitter & Gateway)
│   ├── transmitter_device.PNG      # Foto close-up Transmitter Node
│   ├── gateway_device.PNG          # Foto close-up Gateway Receiver Node
│   ├── transmitter_schematic.png   # Skematik rangkaian Transmitter (KiCad E.D.A.)
│   ├── gateway_schematic.png       # Skematik rangkaian Gateway (KiCad E.D.A.)
│   ├── TRANSMITTER SCHEMATIC.pdf   # Berkas PDF asli skematik Transmitter
│   └── GATEWAY SCHEMATIC.pdf       # Berkas PDF asli skematik Gateway
├── css/
│   └── style.css                   # Stylesheet Minimalist Studio Light Theme
├── js/
│   ├── digital-twin.js             # Engine simulasi termodinamika Aspen HYSYS
│   ├── network-sim.js              # Simulator topologi sub-GHz mesh failover (AODV)
│   └── main.js                     # Pengatur interaksi antarmuka & lightbox
├── index.html                      # Halaman utama aplikasi web showcase
└── README.md                       # Dokumentasi repository
```

---

## 🚀 Cara Menjalankan Prototype

Buka langsung file `index.html` pada browser Anda atau jalankan server lokal:

```bash
# Menggunakan Python built-in server
python3 -m http.server 8082

# Buka pada browser
open http://localhost:8082
```

---

## 📜 Lisensi & Atribusi

Dikembangkan oleh **Tim Dicoba Aja Dulu**, Departemen Teknik Instrumentasi, Fakultas Vokasi, Institut Teknologi Sepuluh Nopember (ITS), Surabaya.  
Hak Cipta &copy; 2026 Tim Dicoba Aja Dulu &bull; ITS Surabaya.
