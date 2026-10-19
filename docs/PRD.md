# Product Requirements Document (PRD)
## Keuangan Keluarga — MVP v0.1

**Status:** Draft untuk development  
**Tanggal:** 19 Oktober 2026  
**Product Owner:** Tim internal  
**Developer:** Full Stack Developer + Codex  
**Marketing:** Digital Marketing Partner  
**Target rilis:** TBD setelah estimasi engineering

---

## 1. Product Overview

### 1.1 Product Vision

Membangun aplikasi keuangan keluarga yang membantu pasangan mengelola pemasukan, kebutuhan rumah tangga, dan rencana pengeluaran agar dapat membuat keputusan finansial dengan lebih terencana.

Aplikasi tidak hanya mencatat uang yang sudah dikeluarkan, tetapi membantu pengguna memperkirakan dampak keputusan belanja terhadap anggaran keluarga sampai tanggal gajian berikutnya.

### 1.2 Problem Statement

Permasalahan yang ingin diselesaikan:

1. Pengguna sering melihat saldo rekening tanpa mengetahui berapa yang sebenarnya sudah dialokasikan untuk kebutuhan keluarga.
2. Tagihan dan kebutuhan bulanan membuat saldo yang terlihat tidak sama dengan uang yang bebas dibelanjakan.
3. Pasangan membutuhkan cara sederhana untuk mengelola anggaran bersama.
4. Pencatatan transaksi manual yang terlalu rumit dapat menurunkan konsistensi penggunaan.
5. Aplikasi keuangan biasa lebih banyak menampilkan riwayat pengeluaran daripada membantu merencanakan keputusan berikutnya.

Permasalahan ini merupakan hipotesis yang perlu divalidasi melalui riset pengguna.

### 1.3 Value Proposition

**“Ketahui berapa uang keluarga yang diperkirakan aman dibelanjakan sebelum memutuskan membeli sesuatu.”**

### 1.4 Target Users

**Primary Persona:**

Pasangan menikah yang memiliki pemasukan rutin dan kebutuhan rumah tangga bersama.

Karakteristik awal:

- Usia sekitar 25–40 tahun.
- Terbiasa menggunakan smartphone.
- Mengelola tagihan dan pengeluaran rumah tangga.
- Membutuhkan budgeting sederhana tanpa keharusan mencatat setiap transaksi secara detail.
- Bersedia mencoba solusi digital yang praktis.

Rentang usia dan willingness-to-pay masih perlu divalidasi.

### 1.5 Business Model

- Model awal: one-time payment.
- Harga pengujian: Rp149.000 per keluarga.
- Maksimal dua akun dewasa dalam satu keluarga.
- Masa akses, kebijakan refund, serta cakupan pembaruan produk ditentukan sebelum penjualan.
- Tidak ada subscription pada MVP.

## 2. Product Goals

### Goals

- Pengguna dapat memahami estimasi posisi keuangan keluarga dengan cepat.
- Pengguna dapat menentukan anggaran kebutuhan bulanan.
- Pengguna dapat melihat dampak rencana pembelian terhadap sisa dana.
- Dua anggota keluarga dapat mengelola anggaran bersama.
- Pengguna dapat menggunakan fungsi utama tanpa integrasi bank.

### Non-Goals MVP

Fitur berikut tidak dikembangkan pada MVP:

- Integrasi otomatis rekening bank atau e-wallet.
- AI financial advisor dan chatbot.
- OCR atau scan struk.
- Investasi dan rekomendasi produk investasi.
- Manajemen aset dan utang kompleks.
- Multi-currency.
- Native Android dan iOS.
- Akses untuk lebih dari dua anggota keluarga.
- Sistem rekomendasi finansial berbasis machine learning.

## 3. Core Features

### F-01 — Authentication & Family Workspace

**Priority:** P0

Pengguna dapat membuat akun dan mengelola satu workspace keluarga.

Requirements:

- Register dan login menggunakan email.
- Membuat satu workspace keluarga.
- Mengundang pasangan melalui tautan undangan dengan masa berlaku.
- Maksimal dua pengguna per keluarga.
- Role `owner` dan `member`.
- Seluruh data keuangan bersama tersinkronisasi.
- Pengguna hanya dapat mengakses data keluarga yang menjadi keanggotaannya.

Acceptance Criteria:

- Pengguna baru dapat membuat workspace.
- Anggota yang diundang dapat bergabung setelah autentikasi.
- Undangan kedaluwarsa atau yang sudah dipakai tidak dapat digunakan ulang.
- Pengguna dari keluarga berbeda tidak dapat membaca atau mengubah data keluarga lain.
- Dua anggota dapat melihat pembaruan data setelah refresh tanpa konflik atau duplikasi.

### F-02 — Financial Onboarding

**Priority:** P0

Pengguna menyelesaikan setup keuangan awal sebelum menggunakan dashboard.

Required fields:

- Nama keluarga.
- Saldo uang bersama saat ini.
- Tanggal siklus gajian utama.
- Perkiraan total kebutuhan pokok yang masih harus dipenuhi sampai gajian.
- Tagihan yang belum dibayar.
- Dana cadangan minimum yang ingin dilindungi.

Optional fields:

- Perkiraan pemasukan rutin.
- Detail kategori kebutuhan.
- Pemasukan tambahan pasangan.

Business Rules:

- Mata uang menggunakan IDR.
- Periode anggaran mengikuti tanggal siklus gaji yang dipilih, bukan selalu tanggal 1.
- Pemasukan yang belum benar-benar diterima tidak otomatis menambah saldo tersedia.
- Pengguna boleh mengubah pengaturan keuangan setelah onboarding.
- Jika data penting tidak lengkap, dashboard menampilkan status “Perlu dilengkapi”.

Acceptance Criteria:

- Pengguna dapat menyelesaikan setup tanpa mengisi riwayat transaksi.
- Dashboard menghitung estimasi setelah setup selesai.
- Angka estimasi diperbarui ketika input berubah.
- Input nominal tidak boleh bernilai negatif kecuali pada operasi koreksi yang memang membutuhkannya.

### F-03 — Family Dashboard

**Priority:** P0

Dashboard utama menampilkan informasi keuangan yang paling relevan untuk pengambilan keputusan.

Components:

1. Saldo keluarga saat ini.
2. Estimasi dana aman dibelanjakan.
3. Total tagihan yang belum dibayar sampai gajian.
4. Anggaran kebutuhan pokok yang tersisa.
5. Dana cadangan yang dilindungi.
6. Tanggal gajian berikutnya.
7. Tombol “Boleh Checkout?”.
8. Status kesegaran data keuangan.

Acceptance Criteria:

- Seluruh komponen menggunakan data workspace aktif.
- Nilai diperbarui setelah transaksi atau perubahan anggaran.
- Nilai negatif tidak disembunyikan; tampilkan status potensi defisit.
- Tanggal pembaruan saldo terakhir terlihat.
- Dashboard memiliki empty state yang jelas saat data belum tersedia.

### F-04 — Boleh Checkout? (Core USP)

**Priority:** P0 — Critical

Fitur untuk mensimulasikan apakah suatu rencana pembelian masih sesuai dengan dana yang diperkirakan tersedia.

**User Flow:**

1. Pengguna membuka fitur “Boleh Checkout?”.
2. Pengguna memasukkan nama barang (opsional).
3. Pengguna memasukkan harga barang.
4. Sistem menghitung dampak pembelian.
5. Sistem menampilkan estimasi sisa dana aman.
6. Pengguna dapat mengubah nominal dan mencoba kembali.

**MVP Calculation Model:**

`Available to Spend = Current Shared Balance - Unpaid Bills - Remaining Essential Needs - Protected Reserve`

`Remaining After Purchase = Available to Spend - Proposed Purchase Amount`

Contoh:

| Komponen | Nominal |
|---|---:|
| Saldo keluarga | Rp4.000.000 |
| Tagihan tersisa | Rp1.700.000 |
| Sisa kebutuhan pokok | Rp1.500.000 |
| Dana cadangan | Rp300.000 |
| Estimasi aman dibelanjakan | Rp500.000 |
| Rencana pembelian | Rp750.000 |
| Hasil simulasi | −Rp250.000 |

Jika hasil negatif, tampilkan:

“Pembelian ini berpotensi mengurangi dana yang sudah dialokasikan untuk kebutuhan keluarga sebesar Rp250.000.”

Jika hasil tidak negatif, tampilkan:

“Pembelian ini masih berada dalam batas anggaran berdasarkan data yang tersedia.”

**Critical Business Rules:**

- Hasil merupakan estimasi, bukan jaminan keamanan finansial.
- Jika data saldo belum diperbarui, tampilkan peringatan.
- Tagihan yang sudah dibayar tidak boleh dikurangi dua kali.
- Pengeluaran kebutuhan pokok yang sudah tercatat harus mengurangi sisa anggaran kebutuhan.
- Perhitungan harus menggunakan nilai nominal numerik secara presisi.
- Simulasi tidak membuat transaksi atau mengubah saldo.
- Estimasi pemasukan masa depan tidak dihitung sebagai uang tersedia sampai dikonfirmasi telah diterima.

Acceptance Criteria:

- Kalkulasi menghasilkan nilai yang benar berdasarkan input.
- Pengguna dapat mencoba berbagai nominal tanpa mengubah data aktual.
- Sistem menampilkan potensi defisit dengan jelas.
- Nominal nol dan input tidak valid ditangani.
- Kalkulasi tidak bergantung pada AI atau API pihak ketiga.
- Hasil mencantumkan asumsi dan waktu pembaruan data.

**Scope Boundary:** MVP menghitung estimasi alokasi sampai gajian, belum melakukan daily cash-flow forecasting secara terperinci. Proyeksi berdasarkan tanggal jatuh tempo per hari dapat menjadi pengembangan berikutnya.

### F-05 — Income & Expense Tracking

**Priority:** P0

Pengguna dapat mencatat pemasukan dan pengeluaran secara manual.

Fields:

- Tipe transaksi: income / expense.
- Nominal.
- Kategori.
- Tanggal transaksi.
- Catatan opsional.
- Pengguna pembuat.

Kategori awal:

- Pemasukan/gaji.
- Belanja dapur.
- Makanan.
- Transportasi.
- Rumah tangga.
- Tagihan.
- Pendidikan.
- Kesehatan.
- Hiburan.
- Lainnya.

Business Rules:

- Transaksi memengaruhi saldo bersama sesuai tipenya.
- Pengeluaran kategori kebutuhan pokok mengurangi sisa kebutuhan yang dianggarkan.
- Pengeluaran discretionary tidak mengurangi anggaran kebutuhan pokok.
- Transaksi dapat diedit dan dihapus oleh anggota yang berwenang.
- Perubahan saldo manual dilakukan sebagai rekonsiliasi agar jejak transaksi tetap konsisten.
- Kiriman form yang sama tidak boleh menghasilkan transaksi ganda.

Acceptance Criteria:

- Pengguna dapat menambahkan, mengedit, dan menghapus transaksi.
- Saldo dan hasil simulasi diperbarui.
- Nominal menggunakan integer IDR untuk menghindari floating-point error.
- Data transaksi memiliki audit information dasar.
- Tidak ada double counting ketika transaksi dihubungkan ke pembayaran tagihan.

### F-06 — Bills & Budget Management

**Priority:** P0

Pengguna dapat menentukan kewajiban dan kebutuhan yang harus diprioritaskan.

Requirements:

- Menambahkan tagihan.
- Menentukan nominal dan tanggal jatuh tempo.
- Menentukan tagihan berulang bulanan.
- Menandai tagihan sudah dibayar.
- Menambahkan alokasi anggaran kebutuhan pokok.
- Mengubah dana cadangan.
- Melihat sisa kebutuhan selama siklus aktif.

Acceptance Criteria:

- Tagihan belum dibayar diperhitungkan pada simulasi.
- Tagihan yang dibayar melalui aplikasi menghasilkan pencatatan pengeluaran dan perubahan status yang konsisten.
- Tagihan berulang tidak terduplikasi ketika siklus baru dibuat.
- Perubahan budget memperbarui hasil simulasi.
- Siklus akhir bulan menangani bulan dengan jumlah hari berbeda.

### F-07 — Quick Balance Reconciliation

**Priority:** P0

Fitur untuk pengguna yang tidak rutin mencatat semua transaksi.

Requirements:

- Pengguna dapat memperbarui saldo uang keluarga berdasarkan kondisi aktual.
- Sistem menyimpan selisih sebagai reconciliation adjustment.
- Sistem menyimpan waktu dan pengguna yang melakukan rekonsiliasi.
- Estimasi dana aman diperbarui.

Acceptance Criteria:

- Rekonsiliasi tidak menghapus histori transaksi.
- Penyesuaian tidak dihitung dua kali.
- Pengguna mengetahui bahwa transaksi yang belum dicatat dapat memengaruhi hasil estimasi.

### F-08 — Public Interactive Demo

**Priority:** P0 untuk marketing launch

Calon konsumen dapat mencoba simulasi tanpa membuat akun.

Requirements:

- Input saldo, tagihan, kebutuhan, cadangan, dan harga pembelian.
- Demo menampilkan hasil secara langsung.
- Tidak menyimpan data demo sebagai data keuangan pengguna.
- CTA menuju registrasi atau pembelian.
- Tampilan mobile-first.

Acceptance Criteria:

- Demo dapat digunakan tanpa login.
- Nilai demo tidak dikirim ke Meta Pixel atau analytics.
- Event penggunaan demo dapat dicatat tanpa nominal keuangan.
- Form demo memiliki validasi input yang benar.

### F-09 — Purchase & Access Management

**Priority:** P0 untuk paid launch

Requirements:

- Pengguna dapat membeli akses keluarga.
- Pembayaran diproses oleh payment gateway yang dipilih.
- Akses diaktifkan setelah pembayaran terverifikasi.
- Status transaksi pembayaran dapat dilihat.
- Satu pembelian berlaku untuk satu workspace keluarga.
- Dua anggota workspace menggunakan hak akses dari pembelian yang sama.

Acceptance Criteria:

- Status berhasil tidak ditentukan hanya dari redirect browser.
- Payment callback/webhook diverifikasi.
- Webhook berulang tidak menghasilkan akses atau transaksi ganda.
- Pembayaran gagal tidak membuka akses berbayar.
- Pembayaran berhasil dapat dipulihkan jika pengguna login kembali.

## 4. Main User Journey

### Journey A — Customer Acquisition

Meta Ads → Landing Page → Interactive Demo → Register → Checkout → Payment Confirmation → Onboarding → Dashboard

### Journey B — Financial Setup

Create Family → Set Balance → Set Payday → Add Essential Needs → Add Bills → Set Reserve → View Dashboard

### Journey C — Core USP

Dashboard → Boleh Checkout? → Input Purchase Amount → View Simulation → Adjust Purchase Plan → Optional Save as Transaction

Penyimpanan pembelian sebagai transaksi harus melalui tindakan konfirmasi terpisah, bukan otomatis saat simulasi.

### Journey D — Couple Collaboration

Owner Login → Invite Partner → Partner Register/Login → Join Family → Access Shared Dashboard

## 5. Proposed Application Pages

| Page | Access | Priority |
|---|---|---|
| Landing Page | Public | P0 |
| Interactive Demo | Public | P0 |
| Register/Login | Public | P0 |
| Checkout | Registered | P0 launch |
| Financial Onboarding | Family User | P0 |
| Dashboard | Family User | P0 |
| Boleh Checkout? | Family User | P0 |
| Transactions | Family User | P0 |
| Budget & Bills | Family User | P0 |
| Family Settings | Family User | P0 |
| Account & Purchase Status | Family User | P0 launch |
| Monthly Report | Family User | P1 |
| Savings Goals | Family User | P1 |

## 6. Non-Functional Requirements

### Security & Privacy

- Authentication and server-side authorization wajib diterapkan.
- Akses data dibatasi berdasarkan family/workspace.
- Seluruh komunikasi menggunakan HTTPS.
- Secret tidak disimpan di frontend.
- Data keuangan tidak dikirim sebagai properti Meta Pixel.
- Data produksi dan development dipisahkan.
- Endpoint sensitif menggunakan validasi input dan rate limiting yang sesuai.
- Pengguna dapat meminta penghapusan akun/data.
- Privacy Policy dan Terms of Service tersedia sebelum public launch.

### Data Integrity

- Database menjadi source of truth untuk saldo, transaksi, dan alokasi anggaran.
- Operasi yang memengaruhi lebih dari satu data keuangan dilakukan secara atomic melalui database transaction.
- Perhitungan finansial dilakukan dengan fungsi deterministik yang dapat diuji.
- Pembayaran, rekonsiliasi, dan transaksi harus tahan terhadap duplicate request.

### Performance & UX

- Mobile-first responsive design.
- Tampilan utama dioptimalkan untuk koneksi mobile.
- Nominal ditampilkan dalam format Rupiah.
- Input keuangan mudah digunakan tanpa proses berlapis.
- Loading, empty state, dan error state harus jelas.
- Navigasi utama tidak bergantung pada ukuran layar desktop.

### Reliability

- Tersedia mekanisme backup dan pemulihan database.
- Kegagalan sinkronisasi tidak boleh diam-diam menghasilkan perubahan saldo ganda.
- Error pembayaran dan pencatatan transaksi harus dapat ditelusuri.

## 7. High-Level Data Model

Entitas utama yang direncanakan:

| Entity | Purpose |
|---|---|
| users | Informasi akun |
| families | Workspace keluarga |
| family_members | Membership dan role |
| family_invitations | Undangan pasangan |
| financial_cycles | Periode anggaran keluarga |
| family_accounts | Saldo uang bersama |
| transactions | Pemasukan, pengeluaran, dan adjustment |
| categories | Kategori transaksi |
| budgets | Alokasi kebutuhan |
| recurring_bills | Definisi tagihan berulang |
| bill_occurrences | Tagihan aktual per periode |
| payments | Status pembayaran pembelian aplikasi |
| entitlements | Hak akses aplikasi berbayar |

Relasi dan struktur tabel final akan ditentukan pada tahap Technical Design Document (TDD).

## 8. Success Metrics

### Product Metrics

- Onboarding completion rate.
- First simulation completion rate.
- Percentage of users returning within 7 days.
- Weekly active families.
- Percentage of active families updating their financial data.
- Financial simulation usage per active family.

### Business Metrics

Dikelola bersama digital marketing partner:

- Landing page conversion rate.
- Demo-to-registration conversion.
- Purchase conversion rate.
- Customer Acquisition Cost (CAC).
- Revenue per purchase.
- Refund rate.
- Contribution margin per acquired customer.

Target numerik ditentukan setelah ada baseline validasi.

## 9. Responsibilities

### Development

- Menyiapkan technical architecture.
- Mengimplementasikan frontend dan backend.
- Membangun database schema.
- Membuat calculation engine.
- Menerapkan authentication, authorization, dan data protection.
- Mengintegrasikan payment gateway.
- Menyediakan analytics events tanpa mengekspos data keuangan.
- Melakukan testing, deployment, dan maintenance.

### Digital Marketing

- Meneliti audience dan positioning.
- Memvalidasi USP dan pricing.
- Membuat copywriting dan creative Meta Ads.
- Melakukan eksperimen landing page.
- Mengelola campaign budget.
- Menganalisis CAC, conversion, dan customer feedback.
- Mengumpulkan insight konsumen untuk iterasi produk.

### Shared Decisions

- Product positioning.
- Pricing dan penawaran.
- Scope MVP.
- Launch readiness.
- Prioritas fitur berdasarkan evidence.

## 10. Release Strategy

### Milestone 1 — Functional Prototype

- Financial onboarding sederhana.
- Calculation engine.
- Dashboard dasar.
- Simulasi “Boleh Checkout?”.
- Public interactive demo.

**Exit criteria:** Kalkulasi utama tervalidasi menggunakan test cases, dan prototype siap diuji kepada calon pengguna.

### Milestone 2 — Family MVP

- Authentication.
- Workspace keluarga.
- Income/expense tracking.
- Budget dan tagihan.
- Rekonsiliasi saldo.
- Shared access pasangan.

**Exit criteria:** Dua pengguna dapat mengelola data keluarga yang sama secara aman dan konsisten.

### Milestone 3 — Commercial Launch

- Landing page final.
- Payment gateway.
- Entitlement management.
- Privacy/terms.
- Analytics events.
- Deployment, monitoring, backup, dan QA.

**Exit criteria:** Alur demo sampai pembayaran serta penggunaan aplikasi lulus end-to-end testing dan siap menerima konsumen nyata.

### Milestone 4 — Post-Launch

Prioritas berdasarkan feedback, bukan berdasarkan asumsi:

- Monthly report.
- Savings goals.
- Advanced cash-flow forecasting.
- Reminder tagihan.
- Penyempurnaan shared finance dan personal privacy.

## 11. Definition of Done

Sebuah fitur dinyatakan selesai jika:

- Acceptance criteria terpenuhi.
- Validasi input berjalan.
- Authorization diterapkan pada seluruh akses data private.
- Loading, empty, dan error states tersedia.
- Business logic penting memiliki automated tests.
- UI telah diuji pada mobile viewport.
- Perubahan database memiliki migration.
- Tidak ada bug critical yang diketahui.
- Dokumentasi terkait diperbarui.

## 12. Open Decisions

Keputusan berikut perlu diselesaikan sebelum commercial launch:

1. Nama dan identitas brand.
2. Detail masa akses untuk model one-time payment.
3. Payment gateway dan biaya transaksi.
4. Tech stack final dan hosting.
5. Kebijakan refund dan support.
6. Analytics tooling, consent, dan pembagian akses data marketing.
7. Target tanggal rilis berdasarkan kapasitas development.
8. Hasil validasi awal terhadap hook utama dan harga.

---

**Document Status: PRD v0.1 — Ready for Prototype Planning**

Dokumen ini dapat menjadi dasar awal implementasi, tetapi scope, model kalkulasi, dan acceptance criteria harus difinalisasi sebelum setiap fitur dikerjakan menggunakan Codex.