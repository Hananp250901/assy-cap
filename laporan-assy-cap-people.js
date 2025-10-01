document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const monthFilter = document.getElementById('monthFilter');
    const totalQtyText = document.getElementById('totalQtyText');
    const chartTitle = document.getElementById('chartTitle');
    const downloadButton = document.getElementById('downloadChartButton');
    const ctx = document.getElementById('byPeopleChart').getContext('2d');
    let byPeopleChart;

    /**
     * Inisialisasi halaman
     */
    const initializePage = () => {
        populateMonthFilter();
        const selectedMonth = monthFilter.value;
        loadReportData(selectedMonth);

        monthFilter.addEventListener('change', () => loadReportData(monthFilter.value));
        downloadButton.addEventListener('click', downloadChart);
    };

    /**
     * Mengisi dropdown filter bulan dengan 12 bulan terakhir.
     */
    const populateMonthFilter = () => {
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthText = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            
            const option = document.createElement('option');
            option.value = monthValue;
            option.textContent = monthText;
            if (i === 0) option.selected = true;
            monthFilter.appendChild(option);
        }
    };

    /**
     * Memuat, mengolah, dan menampilkan data laporan.
     * @param {string} monthYear - Bulan dan tahun (format: YYYY-MM).
     */
    const loadReportData = async (monthYear) => {
        const [year, month] = monthYear.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;
        
        try {
            // PERUBAHAN: Memilih kolom 'people' bukan 'part_name'
            const { data, error } = await supabase
                .from('hasil_assy_cap')
                .select('people, qty') 
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);

            if (error) throw error;

            processAndRenderData(data);

        } catch (error) {
            console.error('Error fetching report data:', error.message);
            alert('Gagal memuat data laporan.');
        }
    };

    /**
     * Mengolah data mentah, menghitung total, dan memanggil fungsi render.
     * @param {Array} rawData - Data dari Supabase.
     */
    const processAndRenderData = (rawData) => {
        if (!rawData || rawData.length === 0) {
            totalQtyText.textContent = 'Total Bulan Ini: 0 Pcs';
            if (byPeopleChart) byPeopleChart.destroy();
            return;
        }

        // 1. Agregasi data: jumlahkan qty per 'people'
        const summary = {};
        let grandTotal = 0;
        rawData.forEach(item => {
            if (summary[item.people]) {
                summary[item.people] += item.qty;
            } else {
                summary[item.people] = item.qty;
            }
            grandTotal += item.qty;
        });

        // 2. Ubah objek summary menjadi array agar bisa diurutkan
        const summaryArray = Object.keys(summary).map(name => ({
            name: name,
            total: summary[name]
        }));

        // 3. Urutkan array dari total terbesar ke terkecil
        summaryArray.sort((a, b) => b.total - a.total);

        // Update Teks Total
        totalQtyText.textContent = `Total Bulan Ini: ${grandTotal.toLocaleString('id-ID')} Pcs`;

        // Render chart dengan data yang sudah diolah
        renderChart(summaryArray);
    };

    /**
     * Merender diagram batang horizontal.
     * @param {Array} chartData - Data yang sudah diolah dan diurutkan.
     */
    // GANTI SELURUH FUNGSI INI DI FILE: laporan-assy-cap-people.js

const renderChart = (chartData) => {
    // Baris ini diubah untuk menggunakan variabel 'monthFilter' yang benar
    const selectedMonthText = monthFilter.options[monthFilter.selectedIndex].text;
    
    // PERBAIKAN: Menggunakan variabel 'chartTitle' yang benar, bukan 'dailyChartTitle'
    chartTitle.textContent = `Peringkat Hasil Assy cap - ${selectedMonthText}`;

    const labels = chartData.map(item => item.name);
    const data = chartData.map(item => item.total);

    if (byPeopleChart) {
        byPeopleChart.destroy();
    }

    byPeopleChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Hasil (Pcs)',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    right: 40 
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => value.toLocaleString('id-ID'),
                    color: '#34495e'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Kuantitas (Pcs)'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
};

    /**
     * Fungsi untuk mengunduh chart sebagai gambar PNG.
     */
    const downloadChart = () => {
        if (!byPeopleChart) return;
        const link = document.createElement('a');
        const selectedMonthText = monthFilter.options[monthFilter.selectedIndex].text.replace(/\s+/g, '_');
        link.download = `laporan_assy_cap_per_people_${selectedMonthText}.png`;
        link.href = byPeopleChart.toBase64Image();
        link.click();
    };

    // --- Jalankan Aplikasi ---
    initializePage();
});