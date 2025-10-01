// Variabel Global
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
let peopleChoices = null; // Variabel untuk Choices.js
Chart.register(ChartDataLabels);

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);
document.getElementById('monthFilter').addEventListener('change', loadDashboardData);
document.getElementById('peopleFilter').addEventListener('change', loadDashboardData);
document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);
document.getElementById('prevPageButton').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; displayLogPage(); }
});
document.getElementById('nextPageButton').addEventListener('click', () => {
    const totalPages = Math.ceil(fullLogData.length / rowsPerPage);
    if (currentPage < totalPages) { currentPage++; displayLogPage(); }
});
document.getElementById('togglePaginationButton').addEventListener('click', () => {
    showAll = !showAll;
    const button = document.getElementById('togglePaginationButton');
    button.textContent = showAll ? "Tampilkan Halaman" : "Tampilkan Semua";
    if (!showAll) currentPage = 1;
    displayLogPage();
});

// Fungsi Utama
async function initializeDashboard() {
    populateMonthFilter();
    await populatePeopleFilter();
    await loadDashboardData();
}

function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthText = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        const option = document.createElement('option');
        option.value = monthValue;
        option.textContent = monthText;
        monthFilter.appendChild(option);
    }
}

async function populatePeopleFilter() {
    const peopleFilter = document.getElementById('peopleFilter');
    const { data, error } = await supabase
        .from('master_people')
        .select('nama')
        .order('nama', { ascending: true });

    if (error || !data) {
        console.error("Gagal mengambil daftar people:", error);
        peopleFilter.innerHTML = '<option value="">Gagal memuat</option>';
        return;
    }

    peopleFilter.innerHTML = '';
    data.forEach(person => {
        const option = document.createElement('option');
        option.value = person.nama;
        option.textContent = person.nama;
        peopleFilter.appendChild(option);
    });
    
    if (peopleChoices) peopleChoices.destroy();
    peopleChoices = new Choices(peopleFilter, {
        searchEnabled: true,
        itemSelectText: 'Tekan untuk memilih',
    });
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    const selectedPerson = document.getElementById('peopleFilter').value;
    if (!selectedMonth || !selectedPerson) return;

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('hasil_assy_cap')
        .select('*')
        .eq('people', selectedPerson)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true });

    if (error) {
        console.error("Gagal memuat data:", error);
        return;
    }
    fullLogData = data;
    currentPage = 1;
    displayLogPage();
    renderChart(data);
}

function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    fullLogData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    const dataToDisplay = showAll ? fullLogData : fullLogData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let html = '';
    dataToDisplay.forEach(item => {
        const t = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        html += `<tr>
            <td>${t}</td>
            <td>${item.shift}</td>
            <td>${item.part_name}</td>
            <td>${item.part_number}</td>
            <td>${item.qty.toLocaleString('id-ID')}</td>
        </tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="5">Tidak ada data yang cocok.</td></tr>';
    
    const totalPages = Math.ceil(fullLogData.length / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = showAll ? `${fullLogData.length} Baris` : `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prevPageButton').disabled = !showAll && currentPage === 1;
    document.getElementById('nextPageButton').disabled = !showAll && currentPage >= totalPages;
}

function renderChart(data) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text;
    const personName = document.getElementById('peopleFilter').value;
    
    document.getElementById('chartTitle').textContent = `Analisis Harian ${personName} - ${monthText}`;
    const totalElement = document.getElementById('chartTotal');

    if (window.myDailyChart) window.myDailyChart.destroy();
    
    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Poppins, sans-serif";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk orang ini di bulan terpilih.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        totalElement.textContent = '';
        return;
    }

    const totalQty = data.reduce((sum, item) => sum + item.qty, 0);
    totalElement.textContent = `Total Hasil: ${totalQty.toLocaleString('id-ID')} Pcs`;

    const dailyUsage = new Map();
    data.forEach(item => {
        dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty);
    });

    const labels = [], dailyData = [];
    const sorted = new Map([...dailyUsage.entries()].sort());
    sorted.forEach((total, dateKey) => {
        labels.push(new Date(dateKey).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyData.push(total);
    });

    window.myDailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total (Bar)', data: dailyData, backgroundColor: 'rgba(75, 192, 192, 0.7)', order: 1 },
                { label: 'Total (Garis)', data: dailyData, type: 'line', borderColor: '#FFCE56', tension: 0.3, order: 0, datalabels: { display: false } }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                datalabels: {
                    anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v.toLocaleString('id-ID') : '',
                    color: '#333', font: { weight: 'bold' }
                }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Pcs)' } } }
        },
        plugins: [ChartDataLabels]
    });
}

function exportToCSV() {
    const header = "Tanggal,Shift,People,Part Name,Part Number,Qty (Pcs)\r\n";
    let csv = header;
    fullLogData.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.people}","${item.part_name}","${item.part_number}",${item.qty}\r\n`;
    });
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    const personName = document.getElementById('peopleFilter').value.replace(/ /g, "_");
    link.setAttribute("download", `Laporan_${personName}_${monthText}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
    const canvas = document.getElementById('usageChart');
    if (!canvas) return;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    const personName = document.getElementById('peopleFilter').value.replace(/ /g, "_");
    link.download = `Grafik_${personName}_${monthText}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}