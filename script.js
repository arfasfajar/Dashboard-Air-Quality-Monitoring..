/* =============================================
   AQM - LIVE DATA INTEGRATION
   script.js — v2 (fix: data kosong + grafik per kota)
   ============================================= */

const WAQI_TOKEN = "8983f3c0bec1caad5787071ab8b9b362a4d14270";

// ─────────────────────────────────────────────
// 🗺️ MAPPING KOTA + DATA FALLBACK PER KOTA
// Fallback dipakai bila WAQI tidak kirim PM10/CO
// ─────────────────────────────────────────────
const KOTA_CONFIG = {
  bandung: {
    label: "Bandung, Jawa Barat",
    waqi:  "bandung",
    lat:   -6.9175, lon: 107.6191,
    fallback: { pm10: 58, co: 0.8 },
    // Data chart historis simulasi (realistis per kota)
    trendAQI:   [85, 92, 78, 110, 95, 72, 68],
    hourlyPM25: [28,25,22,20,19,21,30,42,55,58,52,48,45,50,54,60,58,52,45,40,38,35,32,30],
    donut:      [40,30,20,10],
  },
  jakarta: {
    label: "Jakarta, DKI Jakarta",
    waqi:  "jakarta",
    lat:   -6.2088, lon: 106.8456,
    fallback: { pm10: 92, co: 1.4 },
    trendAQI:   [120,135,142,130,128,145,138],
    hourlyPM25: [55,50,45,42,40,45,62,78,90,95,88,82,78,85,90,98,95,85,75,68,62,58,56,52],
    donut:      [45,28,18,9],
  },
  surabaya: {
    label: "Surabaya, Jawa Timur",
    waqi:  "surabaya",
    lat:   -7.2575, lon: 112.7521,
    fallback: { pm10: 70, co: 1.1 },
    trendAQI:   [88,95,102,98,90,85,92],
    hourlyPM25: [40,36,32,30,28,32,45,58,68,72,65,60,55,62,68,75,70,62,55,50,46,42,40,38],
    donut:      [42,32,17,9],
  },
  yogyakarta: {
    label: "Yogyakarta, DIY",
    waqi:  "yogyakarta",
    lat:   -7.7956, lon: 110.3695,
    fallback: { pm10: 35, co: 0.5 },
    trendAQI:   [42,48,38,50,45,40,35],
    hourlyPM25: [18,15,12,10,9,11,18,25,30,32,28,24,22,26,28,30,28,24,20,18,16,15,14,12],
    donut:      [35,32,22,11],
  },
  medan: {
    label: "Medan, Sumatera Utara",
    waqi:  "medan",
    lat:   3.5952, lon: 98.6722,
    fallback: { pm10: 110, co: 1.8 },
    trendAQI:   [145,162,158,172,165,155,168],
    hourlyPM25: [70,65,60,55,52,58,78,95,112,118,108,100,95,102,110,120,115,102,90,82,76,72,68,65],
    donut:      [48,26,16,10],
  },
};

// ─────────────────────────────────────────────
// REFERENSI CHART (dibuat di index.html, diakses di sini)
// ─────────────────────────────────────────────
// Chart.js menyimpan instance di canvas.__chartInstance
// Kita pakai helper untuk update data
function getChart(id) {
  const canvas = document.getElementById(id);
  return canvas ? Chart.getChart(canvas) : null;
}

// ─────────────────────────────────────────────
// UPDATE SEMUA GRAFIK SESUAI KOTA
// ─────────────────────────────────────────────
function updateCharts(kotaKey) {
  const kota = KOTA_CONFIG[kotaKey];

  // ── Chart 1: Trend AQI 7 Hari ──
  const trendChart = getChart("trendChart");
  if (trendChart) {
    trendChart.data.datasets[0].data = kota.trendAQI;
    trendChart.update();
  }

  // ── Chart 3: PM2.5 Hourly ──
  const hourlyChart = getChart("hourlyChart");
  if (hourlyChart) {
    const hData = kota.hourlyPM25;
    hourlyChart.data.datasets[0].data = hData;
    hourlyChart.data.datasets[0].backgroundColor = hData.map(v =>
      v < 35 ? 'rgba(0,166,136,0.75)' :
      v < 55 ? 'rgba(212,160,23,0.75)' : 'rgba(201,64,64,0.75)'
    );
    hourlyChart.update();
  }

  // ── Chart 2: Donut Polutan ──
  const donutChart = getChart("donutChart");
  if (donutChart) {
    donutChart.data.datasets[0].data = kota.donut;
    donutChart.update();
    // Update legend teks
    const donutLabels = ['PM2.5', 'PM10', 'NO2', 'SO2'];
    const donutColors = ['#00a688', '#2f6fd4', '#d4a017', '#c94040'];
    const legendEl = document.getElementById('donut-legend');
    if (legendEl) {
      legendEl.innerHTML = '';
      donutLabels.forEach((l, i) => {
        legendEl.innerHTML += `<span class="legend-item"><span class="legend-dot" style="background:${donutColors[i]}"></span>${l} ${kota.donut[i]}%</span>`;
      });
    }
  }
}

// ─────────────────────────────────────────────
// STATUS LOADING
// ─────────────────────────────────────────────
function setLoading(isLoading) {
  const badge = document.getElementById("live-status");
  if (!badge) return;
  if (isLoading) {
    badge.textContent = "⏳ Memuat...";
    badge.style.opacity = "0.6";
  } else {
    badge.textContent = "● LIVE";
    badge.style.opacity = "1";
  }
}

// ─────────────────────────────────────────────
// FETCH WAQI
// ─────────────────────────────────────────────
async function fetchWAQI(kotaKey) {
  const kota = KOTA_CONFIG[kotaKey];
  const url  = `https://api.waqi.info/feed/${kota.waqi}/?token=${WAQI_TOKEN}`;
  try {
    const res  = await fetch(url);
    const json = await res.json();
    if (json.status !== "ok") {
      console.warn(`WAQI: Data tidak tersedia untuk ${kotaKey}`, json);
      return null;
    }
    const d = json.data;
    return {
      aqi:  d.aqi                   ?? null,
      pm25: d.iaqi?.pm25?.v         ?? null,
      // Fallback ke data simulasi jika kosong
      pm10: d.iaqi?.pm10?.v         ?? kota.fallback.pm10,
      co:   d.iaqi?.co?.v != null
              ? parseFloat((d.iaqi.co.v).toFixed(2))
              : kota.fallback.co,
    };
  } catch (err) {
    console.error("Gagal fetch WAQI:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// FETCH OPEN-METEO
// ─────────────────────────────────────────────
async function fetchCuaca(kotaKey) {
  const kota = KOTA_CONFIG[kotaKey];
  const url  = `https://api.open-meteo.com/v1/forecast`
             + `?latitude=${kota.lat}&longitude=${kota.lon}`
             + `&current=temperature_2m,relative_humidity_2m`
             + `&timezone=Asia%2FJakarta`;
  try {
    const res  = await fetch(url);
    const json = await res.json();
    return {
      temp:  json.current?.temperature_2m       ?? null,
      humid: json.current?.relative_humidity_2m ?? null,
    };
  } catch (err) {
    console.error("Gagal fetch Open-Meteo:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// HELPER AQI INFO
// ─────────────────────────────────────────────
function getAQIInfo(aqi) {
  if (aqi === null) return { status: "N/A", badgeClass: "badge-moderate", rec: "Data tidak tersedia.", cardClass: "" };
  if (aqi <= 50)   return { status: "Baik",         badgeClass: "badge-good",      rec: "Kualitas udara baik. Nikmati aktivitas luar ruangan dengan aman.",                                                         cardClass: "aqi-good"      };
  if (aqi <= 100)  return { status: "Sedang",        badgeClass: "badge-moderate",  rec: "Kualitas udara sedang. Kelompok sensitif sebaiknya membatasi aktivitas berat di luar.",                                    cardClass: "aqi-moderate"  };
  if (aqi <= 150)  return { status: "Tidak Sehat*",  badgeClass: "badge-usg",       rec: "Tidak sehat untuk kelompok sensitif. Anak-anak dan lansia disarankan tetap di dalam ruangan.",                            cardClass: "aqi-usg"       };
  if (aqi <= 200)  return { status: "Tidak Sehat",   badgeClass: "badge-unhealthy", rec: "Tidak sehat. Semua orang sebaiknya menghindari aktivitas luar ruangan berkepanjangan. Gunakan masker.",                   cardClass: "aqi-unhealthy" };
  return             { status: "Berbahaya",       badgeClass: "badge-hazardous", rec: "Berbahaya! Hindari semua aktivitas luar ruangan. Tutup ventilasi dan gunakan air purifier.",                             cardClass: "aqi-hazardous" };
}

// ─────────────────────────────────────────────
// UPDATE UI (kartu stat)
// ─────────────────────────────────────────────
function updateUI(kotaKey, aqiData, cuacaData) {
  const kota  = KOTA_CONFIG[kotaKey];

  // Jika WAQI total gagal, pakai fallback penuh
  const aqi   = aqiData?.aqi   ?? "--";
  const pm25  = aqiData?.pm25  ?? "--";
  const pm10  = aqiData?.pm10  ?? kota.fallback.pm10;
  const co    = aqiData?.co    ?? kota.fallback.co;
  const temp  = cuacaData?.temp  ?? "--";
  const humid = cuacaData?.humid ?? "--";

  const info = getAQIInfo(typeof aqi === "number" ? aqi : null);

  document.getElementById("kota-label").textContent = kota.label;
  document.getElementById("aqi-val").textContent    = aqi;
  document.getElementById("pm25-val").textContent   = pm25;
  document.getElementById("pm10-val").textContent   = pm10;
  document.getElementById("co-val").textContent     = co;
  document.getElementById("humid-val").textContent  = humid;
  document.getElementById("temp-val").textContent   = temp;

  const statusEl = document.getElementById("aqi-status");
  statusEl.textContent = info.status;
  statusEl.className   = "badge " + info.badgeClass;

  const aqiCard = document.querySelector(".aqi-card");
  aqiCard.className = "stat-card aqi-card " + (info.cardClass ?? "");

  if (typeof pm25  === "number") document.getElementById("pm25-bar").style.width  = Math.min(pm25  / 150 * 100, 100) + "%";
  if (typeof pm10  === "number") document.getElementById("pm10-bar").style.width  = Math.min(pm10  / 150 * 100, 100) + "%";
  if (typeof co    === "number") document.getElementById("co-bar").style.width    = Math.min(co    / 5   * 100, 100) + "%";
  if (typeof humid === "number") document.getElementById("humid-bar").style.width = Math.min(humid, 100) + "%";
  if (typeof temp  === "number") document.getElementById("temp-bar").style.width  = Math.min(temp  / 50  * 100, 100) + "%";

  document.getElementById("health-rec").textContent = info.rec;
}

// ─────────────────────────────────────────────
// MAIN: GANTI KOTA
// ─────────────────────────────────────────────
async function gantiKota(kotaKey) {
  setLoading(true);
  try {
    const [aqiData, cuacaData] = await Promise.all([
      fetchWAQI(kotaKey),
      fetchCuaca(kotaKey),
    ]);
    updateUI(kotaKey, aqiData, cuacaData);
    updateCharts(kotaKey);   // ← UPDATE GRAFIK
    console.log(`✅ Data live untuk ${kotaKey}:`, { aqiData, cuacaData });
  } catch (err) {
    console.error("Error saat memuat data:", err);
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────────────────────
// AUTO REFRESH + INIT
// ─────────────────────────────────────────────
let kotaAktif = "bandung";

const selectEl = document.getElementById("kota");
if (selectEl) {
  selectEl.addEventListener("change", (e) => { kotaAktif = e.target.value; });
}

setInterval(() => {
  console.log("🔄 Auto-refresh data...");
  gantiKota(kotaAktif);
}, 10 * 60 * 1000);

document.addEventListener("DOMContentLoaded", () => {
  gantiKota("bandung");
});