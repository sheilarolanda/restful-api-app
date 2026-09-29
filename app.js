require('dotenv').config(); // baris pertama: muat file .env

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware kustom ----------

// Mencatat method, URL, dan waktu setiap request
function logger(req, res, next) {
  const waktu = new Date().toISOString();
  console.log(`[${waktu}] ${req.method} ${req.url}`);
  next(); // wajib, agar request lanjut ke handler berikutnya
}

// Menjaga route tertentu dengan API key
function cekApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'API key tidak valid' });
  }

  next();
}

// Pembantu: membuat error yang membawa kode status HTTP
function errorHttp(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ---------- Middleware global (urutan penting!) ----------
app.use(logger);
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
// Middleware agar req.body (JSON) dapat dibaca
app.use(express.json());

// Data sementara (disimpan di memori, hilang saat server restart)
let mahasiswa = [
  { id: 1, nama: 'Andi', jurusan: 'Sistem Informasi' },
  { id: 2, nama: 'Budi', jurusan: 'Informatika' },
];
let nextId = 3;

// ---------- Route ----------

// GET / -> memastikan server berjalan
app.get('/', (req, res) => {
  res.send('Server Express.js berjalan!');
});

// GET /mahasiswa -> seluruh data, bisa difilter: /mahasiswa?jurusan=Informatika
app.get('/mahasiswa', (req, res) => {
  const { jurusan } = req.query;

  if (jurusan) {
    const hasil = mahasiswa.filter((m) => m.jurusan === jurusan);
    return res.json(hasil);
  }

  res.json(mahasiswa);
});

// GET /mahasiswa/:id -> satu data berdasarkan id
app.get('/mahasiswa/:id', (req, res, next) => {
  const id = parseInt(req.params.id);
  const data = mahasiswa.find((m) => m.id === id);

  if (!data) return next(errorHttp(404, 'Data tidak ditemukan'));
  res.json(data);
});

// POST /mahasiswa -> tambah data baru (wajib API key)
app.post('/mahasiswa', cekApiKey, (req, res, next) => {
  const { nama, jurusan } = req.body;

  if (!nama || !jurusan) {
    return next(errorHttp(400, 'nama dan jurusan wajib diisi'));
  }

  const baru = { id: nextId++, nama, jurusan };
  mahasiswa.push(baru);
  res.status(201).json(baru);
});

// PUT /mahasiswa/:id -> ubah data (wajib API key)
app.put('/mahasiswa/:id', cekApiKey, (req, res, next) => {
  const id = parseInt(req.params.id);
  const index = mahasiswa.findIndex((m) => m.id === id);

  if (index === -1) return next(errorHttp(404, 'Data tidak ditemukan'));

  mahasiswa[index] = { ...mahasiswa[index], ...req.body, id };
  res.json(mahasiswa[index]);
});

// DELETE /mahasiswa/:id -> hapus data (wajib API key)
app.delete('/mahasiswa/:id', cekApiKey, (req, res, next) => {
  const id = parseInt(req.params.id);
  const index = mahasiswa.findIndex((m) => m.id === id);

  if (index === -1) return next(errorHttp(404, 'Data tidak ditemukan'));

  mahasiswa.splice(index, 1);
  res.status(204).send();
});

// Route untuk mensimulasikan error tak terduga (hapus sebelum dipublikasikan)
app.get('/error-uji', () => {
  throw new Error('Kesalahan tak terduga untuk pengujian');
});

// ---------- Handler 404 dan error handler (paling bawah) ----------

// Rute yang tidak ada
app.use((req, res) => {
  res.status(404).json({ message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan` });
});

// Error handler: WAJIB 4 parameter
app.use((err, req, res, next) => {
  // Body JSON yang rusak (dilempar oleh express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Format JSON tidak valid' });
  }

  const status = err.status || 500;

  if (status === 500) {
    console.error(err.stack); // detail hanya dicatat di server
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }

  res.status(status).json({ message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});