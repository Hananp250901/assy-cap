// ==========================================================
// KODE FINAL DAN LENGKAP - dashboard-assy-cap.js
// ==========================================================

// Variabel Global
let fullLogData = [];
let filteredData = []; // Data yang sudah difilter untuk ditampilkan
let currentPage = 1;
const rowsPerPage = 10;
let showAll = false;
let dailyChart;

// Event Listeners Utama
document.addEventListener('DOMContentLoaded', initializeDashboard);

async function initializeDashboard() {
    // Listener untuk filter tabel
    document.querySelectorAll('.table-filter-input').forEach(input => {
        input.addEventListener('keyup', applyFiltersAndRender);
    });

    // Listener untuk elemen utama
    document.getElementById('monthFilter').addEventListener('change', loadDashboardData);
    document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
    document.getElementById('downloadDailyChartButton').addEventListener('click', downloadChartImage);
    
    // Listener untuk Pagination
    document.getElementById('prevPageButton').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageButton').addEventListener('click', () => changePage(1));
    document.getElementById('togglePaginationButton').addEventListener('click', () => {
        showAll = !showAll;
        document.getElementById('togglePaginationButton').textContent = showAll ? "Tampilkan Halaman" : "Tampilkan Semua";
        currentPage = 1;
        renderTable();
    });

    // Inisialisasi data dan modal
    await populateMonthFilter();
    await loadDashboardData();
    await populateSelectOptionsForModal();
    setupEditModalListeners();
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    monthFilter.innerHTML = '<option value="">Memuat...</option>';
    const { data, error } = await supabase.from('hasil_assy_cap').select('tanggal');

    if (error || !data || data.length === 0) {
        monthFilter.innerHTML = '<option value="">Tidak ada data</option>';
        return;
    }

    const availableMonths = new Set(data.map(item => `${new Date(item.tanggal).getFullYear()}-${new Date(item.tanggal).getMonth() + 1}`));
    monthFilter.innerHTML = '';
    const sortedMonths = Array.from(availableMonths).sort((a, b) => new Date(b.split('-')[0], b.split('-')[1]-1) - new Date(a.split('-')[0], a.split('-')[1]-1));
    
    sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = `${year}-${String(month).padStart(2, '0')}`;
        option.textContent = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(option);
    });
    
    if (sortedMonths.length > 0) {
        const [latestYear, latestMonth] = sortedMonths[0].split('-');
        monthFilter.value = `${latestYear}-${String(latestMonth).padStart(2, '0')}`;
    }
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) {
        fullLogData = [];
        applyFiltersAndRender();
        return;
    };

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase.from('hasil_assy_cap').select('*').gte('tanggal', startDate).lte('tanggal', endDate);
    if (error) { console.error("Gagal memuat data:", error); return; }
    
    fullLogData = data || [];
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const filters = {};
    document.querySelectorAll('.table-filter-input').forEach(input => {
        filters[input.dataset.filter] = input.value.toLowerCase();
    });

    filteredData = fullLogData.filter(item => {
        return Object.keys(filters).every(key => {
            const itemValue = String(item[key] || '').toLowerCase();
            return itemValue.includes(filters[key]);
        });
    });
    
    currentPage = 1;
    renderTable();
    renderChart(filteredData);
}

function renderTable() {
    const tableBody = document.getElementById('logTableBody');
    filteredData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    
    const dataToDisplay = showAll ? filteredData : filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tableBody.innerHTML = dataToDisplay.map(item => `
        <tr>
            <td>${new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td>${item.shift}</td>
            <td>${item.people}</td>
            <td>${item.part_name}</td>
            <td>${item.part_number}</td>
            <td>${item.qty.toLocaleString('id-ID')}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editLog(${item.id})">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteLog(${item.id})">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7">Tidak ada data yang cocok.</td></tr>';
    
    updatePaginationControls();
}

function renderChart(data) {
    const ctx = document.getElementById('dailyUsageChart').getContext('2d');
    const selectedMonthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex]?.text || 'Bulan';
    document.getElementById('dailyChartTitle').textContent = `Monitoring Hasil Assy Cap - ${selectedMonthText}`;
    const totalElement = document.getElementById('dailyChartTotal');
    if (dailyChart) dailyChart.destroy();
    const totalQty = data.reduce((sum, item) => sum + item.qty, 0);
    totalElement.textContent = `Total Hasil Bulan Ini: ${totalQty.toLocaleString('id-ID')} Pcs`;

    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    const usageByDate = new Map();
    data.forEach(item => {
        if (!usageByDate.has(item.tanggal)) usageByDate.set(item.tanggal, { '1': 0, '2': 0, '3': 0 });
        const dailyRecord = usageByDate.get(item.tanggal);
        dailyRecord[item.shift] = (dailyRecord[item.shift] || 0) + item.qty;
    });

    const sortedDates = Array.from(usageByDate.keys()).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(dateKey => new Date(dateKey).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    const shift1Data = sortedDates.map(date => usageByDate.get(date)['1'] || 0);
    const shift2Data = sortedDates.map(date => usageByDate.get(date)['2'] || 0);
    const shift3Data = sortedDates.map(date => usageByDate.get(date)['3'] || 0);
    const totalData = sortedDates.map(date => (usageByDate.get(date)['1'] || 0) + (usageByDate.get(date)['2'] || 0) + (usageByDate.get(date)['3'] || 0));

    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Shift 1', data: shift1Data, backgroundColor: '#36A2EB' },
                { label: 'Shift 2', data: shift2Data, backgroundColor: '#FFCE56' },
                { label: 'Shift 3', data: shift3Data, backgroundColor: '#4BC0C0' },
                { type: 'line', label: 'Total Harian', data: totalData, borderColor: '#e74c3c', tension: 0.1, order: -1 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    display: (context) => context.dataset.data[context.dataIndex] > 0,
                    formatter: (value) => value.toLocaleString('id-ID'),
                    anchor: (context) => context.dataset.type === 'line' ? 'end' : 'center',
                    align: (context) => context.dataset.type === 'line' ? 'top' : 'center',
                    color: (context) => context.dataset.type === 'line' ? '#333' : '#ffffff',
                    offset: -10, font: { weight: 'bold' }
                }
            },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Pcs)' } } }
        },
        plugins: [ChartDataLabels]
    });
}

function updatePaginationControls() {
    const totalFiltered = filteredData.length;
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageButton');
    const nextBtn = document.getElementById('nextPageButton');
    if (showAll) {
        pageInfo.textContent = `${totalFiltered} Baris Ditampilkan`;
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        const totalPages = Math.ceil(totalFiltered / rowsPerPage) || 1;
        pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;
        prevBtn.style.display = 'inline-block';
        nextBtn.style.display = 'inline-block';
    }
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    if (direction === 1 && currentPage < totalPages) currentPage++;
    else if (direction === -1 && currentPage > 1) currentPage--;
    renderTable();
}

function exportToCSV() {
    const data = filteredData;
    let csv = "Tanggal,Shift,People,Part Name,Part Number,Qty (Pcs)\r\n";
    data.forEach(item => {
        csv += `${new Date(item.tanggal).toLocaleDateString('id-ID')},${item.shift},"${item.people}","${item.part_name}","${item.part_number}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    link.download = `Laporan_Assy_Cap_${monthText}.csv`;
    link.click();
}

function downloadChartImage() {
    if (!dailyChart) return;
    const canvas = document.getElementById('dailyUsageChart');
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width; newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF'; newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    link.download = `Grafik_Harian_Assy_Cap_${monthText}.png`;
    link.click();
}

// ==========================================================
// --- FUNGSI UNTUK EDIT DAN DELETE ---
// ==========================================================
async function populateSelectOptionsForModal() {
    const peopleSelect = document.getElementById('editPeople');
    const { data: peopleData } = await supabase.from('master_people').select('nama').order('nama');
    if (peopleData) peopleSelect.innerHTML = peopleData.map(p => `<option value="${p.nama}">${p.nama}</option>`).join('');

    const partNameSelect = document.getElementById('editPartName');
    const { data: partData } = await supabase.from('hasil_assy_cap').select('part_name, part_number').order('part_name');
    if (partData) partNameSelect.innerHTML = partData.map(p => `<option value="${p.part_name}" data-part-number="${p.part_number}">${p.part_name}</option>`).join('');
    
    partNameSelect.addEventListener('change', function() {
        document.getElementById('editPartNumber').value = this.options[this.selectedIndex].dataset.partNumber || '';
    });
}

function setupEditModalListeners() {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editForm');
    modal.querySelector('.close-button').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('cancelButton').addEventListener('click', () => modal.classList.add('hidden'));
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const updatedData = {
            tanggal: document.getElementById('editTanggal').value,
            shift: document.getElementById('editShift').value,
            people: document.getElementById('editPeople').value,
            part_name: document.getElementById('editPartName').value,
            part_number: document.getElementById('editPartNumber').value,
            qty: document.getElementById('editQty').value,
        };
        const { error } = await supabase.from('hasil_assy_cap').update(updatedData).eq('id', id);
        if (error) alert('Gagal memperbarui data: ' + error.message);
        else {
            alert('Data berhasil diperbarui!');
            modal.classList.add('hidden');
            await loadDashboardData();
        }
    });
}

async function editLog(id) {
    const { data, error } = await supabase.from('hasil_assy_cap').select('*').eq('id', id).single();
    if (error) { alert('Gagal mengambil data untuk diedit.'); return; }
    document.getElementById('editId').value = data.id;
    document.getElementById('editTanggal').value = data.tanggal;
    document.getElementById('editShift').value = data.shift;
    document.getElementById('editPeople').value = data.people;
    document.getElementById('editPartName').value = data.part_name;
    document.getElementById('editPartNumber').value = data.part_number;
    document.getElementById('editQty').value = data.qty;
    document.getElementById('editModal').classList.remove('hidden');
}

async function deleteLog(id) {
    if (!confirm('Anda yakin ingin menghapus data ini?')) return;
    const { error } = await supabase.from('hasil_assy_cap').delete().eq('id', id);
    if (error) alert('Gagal menghapus data: ' + error.message);
    else {
        alert('Data berhasil dihapus.');
        await loadDashboardData();
    }
}

// Membuat fungsi bisa diakses dari HTML onclick
window.editLog = editLog;
window.deleteLog = deleteLog;