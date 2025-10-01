// --- AMBIL ELEMEN DARI DOM ---
const addDataForm = document.getElementById('addDataForm');
const partNameSelectEl = document.getElementById('partName');
const partNumberInput = document.getElementById('partNumber');
const tanggalInput = document.getElementById('tanggal');
const peopleNameSelectEl = document.getElementById('peopleName'); // Diubah dari Input menjadi SelectEl
const qtyInput = document.getElementById('qty');

// --- EVENT LISTENER SAAT HALAMAN SELESAI DIBUKA ---
document.addEventListener('DOMContentLoaded', () => {
    tanggalInput.value = new Date().toISOString().split('T')[0];
    populatePartNameDropdown();
    populatePeopleDropdown(); // Panggil fungsi baru untuk mengisi dropdown people
});


// --- FUNGSI BARU UNTUK MENGISI DROPDOWN PEOPLE DARI DATABASE ---
async function populatePeopleDropdown() {
    try {
        const { data, error } = await supabase
            .from('master_people') // Mengambil dari tabel master_people
            .select('nama')
            .order('nama');

        if (error) throw error;

        peopleNameSelectEl.innerHTML = '<option value=""></option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nama;
            option.textContent = item.nama;
            peopleNameSelectEl.appendChild(option);
        });

        // Inisialisasi Select2
        $(document).ready(function() {
            $('#peopleName').select2({
                placeholder: "-- People --",
                allowClear: true
            });
        });

    } catch (error) {
        console.error("Error mengambil data master people:", error);
        alert("Gagal memuat data people. Periksa koneksi atau nama tabel di Supabase.");
    }
}


// --- FUNGSI UNTUK MENGISI DROPDOWN PART NAME DARI DATABASE ---
async function populatePartNameDropdown() {
    try {
        const { data, error } = await supabase
            .from('master_assy_cap') 
            .select('nama_part, part_number')
            .order('nama_part');

        if (error) throw error;

        partNameSelectEl.innerHTML = '<option value=""></option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nama_part;
            option.textContent = item.nama_part;
            option.dataset.partNumber = item.part_number;
            partNameSelectEl.appendChild(option);
        });

        $(document).ready(function() {
            $('#partName').select2({
                placeholder: "-- Pilih Part Name --",
                allowClear: true
            });
        });

    } catch (error) {
        console.error("Error mengambil data master part assy cap:", error);
        alert("Gagal memuat data master part. Periksa koneksi atau nama tabel di Supabase.");
    }
}


// --- EVENT LISTENER UNTUK DROPDOWN PART NAME ---
$('#partName').on('change', function(e) {
    const selectedOption = $(this).find(':selected');
    const partNumber = selectedOption.data('part-number') || '';
    partNumberInput.value = partNumber;
});


// --- EVENT LISTENER SAAT TOMBOL SUBMIT DI-KLIK ---
addDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newData = {
        tanggal: tanggalInput.value,
        shift: Number(document.getElementById('shift').value),
        people: peopleNameSelectEl.value,
        part_name: partNameSelectEl.value,
        part_number: partNumberInput.value,
        qty: Number(qtyInput.value)
    };

    if (!newData.people) {
        alert("Silakan pilih Nama People.");
        return;
    }
    if (!newData.part_name) {
        alert("Silakan pilih Part Name.");
        return;
    }
    if (!newData.qty || newData.qty <= 0) {
        alert("Kuantitas (Qty) harus diisi dan lebih dari 0.");
        return;
    }

    try {
        const { error } = await supabase.from('hasil_assy_cap').insert([newData]);
        if (error) throw error;

        const successModal = document.getElementById('successModal');
        successModal.classList.add('show');
        
        // =================================================================
        // PERUBAHAN DI SINI: Hanya mereset field yang diperlukan
        // =================================================================
        
        // 1. Reset dropdown People
        $('#peopleName').val(null).trigger('change');
        
        // 2. Reset dropdown Part Name (ini juga akan mengosongkan Part Number)
        $('#partName').val(null).trigger('change');
        
        // 3. Reset input Qty
        qtyInput.value = '';

        // Baris addDataForm.reset(); sudah dihapus agar tanggal dan shift tidak berubah.
        // =================================================================

        setTimeout(() => successModal.classList.remove('show'), 2000);

    } catch (error) {
        console.error("Error menambahkan data Assy Cap:", error);
        alert(`Gagal menyimpan data: ${error.message}`);
    }
});