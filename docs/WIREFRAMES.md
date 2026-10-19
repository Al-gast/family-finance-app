# LOW-FIDELITY WIREFRAMES — Family Finance App

**Version:** 0.1  
**Status:** Proposed — design review required  
**Date:** 2026-10-19  
**Companion:** `docs/USER_FLOW.md` and `docs/PRD.md`  
**Clickable preview:** `docs/prototypes/wireframes.html` (local file; example data only)

> These wireframes prioritize hierarchy, wording, states, and navigational affordances. They are **not** final UI, brand visuals, production HTML, or validated UX. All example values are fictitious IDR amounts.

## 1. Design principles

1. **Explain the next decision**, not just display charts. Lead with estimated spendable balance.
2. **Never say “guaranteed safe”.** Use “estimasi”, show obligations and last-checked data.
3. **Try before buying.** The visitor can simulate using fictitious values without creating an account.
4. **Short, progressive setup.** Only request inputs needed for the first calculation; detail later.
5. **Shared finances by default.** Clearly mark “uang bersama”; no implicit personal accounts.
6. **No hidden mutations.** Simulation never saves transactions without confirmation.
7. **Prioritize mobile.** One column, generous tap targets, strong contrast, accessible error messages.

### Content labels to keep consistent

- Main hook / feature: **Boleh Checkout?**
- Primary financial metric: **Estimasi aman dibelanjakan**
- Current money: **Saldo uang bersama**
- Planned commitments: **Tagihan belum dibayar**
- Essential allowance: **Sisa kebutuhan pokok**
- Safety buffer: **Dana cadangan**
- Freshness: **Saldo terakhir dicek [date/time]**
- Result success: **Masih dalam batas anggaran**
- Result risk: **Berpotensi kekurangan dana**

Avoid using “saldo aman” without explaining how it was derived.

## 2. Main mobile navigation

```
┌────────────────────────────────┐
│ Family Finance             ⚙   │
├────────────────────────────────┤
│                                │
│         Screen content         │
│                                │
│                                │
├────────────────────────────────┤
│ Beranda  Transaksi  Anggaran  ⚙ │
└────────────────────────────────┘
```

Bottom navigation is present on authenticated primary screens only. Hide it on public landing/demo, authentication, checkout, and focused onboarding steps. Simulation can show a Back control while keeping navigation context accessible.

## 3. Wireframes by screen

### W01 — Landing Page (Public)

**Goal:** Communicate value and lead visitors into the free no-login demo.

```
┌────────────────────────────────┐
│ [Logo] Family Finance   Masuk  │
├────────────────────────────────┤
│ Atur keputusan belanja         │
│ keluarga sebelum gajian.       │
│                                │
│ “Saldo 4 juta” belum berarti   │
│ semuanya bebas dibelanjakan.   │
│                                │
│ [ Coba Simulasi Gratis → ]     │
│ Tanpa login • Tanpa sambung bank│
│                                │
│ ┌────────────────────────────┐ │
│ │ Contoh: Boleh Checkout?    │ │
│ │ Rp750.000                  │ │
│ │ Potensi kurang Rp250.000   │ │
│ └────────────────────────────┘ │
│                                │
│ Cara kerja:                    │
│ 1. Isi saldo & kewajiban       │
│ 2. Masukkan harga barang       │
│ 3. Lihat estimasi dampaknya    │
│                                │
│ Harga uji: Rp149.000/keluarga  │
│ 2 akun dewasa [detail akses]   │
│ Privacy • Terms                │
└────────────────────────────────┘
```

**Actions:** Try demo → W02; Login → W03. Price copy must match finalized actual offer. Do not imply a permanent lifetime entitlement until explicitly approved.

### W02 — Interactive Demo (Public)

**Goal:** Demonstrate the hook in under a minute without personal info.

```
┌────────────────────────────────┐
│ ← Kembali        DEMO PUBLIK   │
│ Coba “Boleh Checkout?”         │
│ Data contoh, tidak disimpan    │
│                                │
│ Saldo uang bersama             │
│ [ Rp4.000.000               ]  │
│ Tagihan belum dibayar          │
│ [ Rp1.700.000               ]  │
│ Sisa kebutuhan pokok           │
│ [ Rp1.500.000               ]  │
│ Dana cadangan                  │
│ [ Rp300.000                 ]  │
│ Harga barang                   │
│ [ Rp750.000                 ]  │
│                                │
│ [ Hasil dihitung otomatis ]    │
│ ┌────────────────────────────┐ │
│ │ Dana aman   Rp500.000      │ │
│ │ Setelah beli −Rp250.000    │ │
│ │ Berpotensi kurang dana     │ │
│ └────────────────────────────┘ │
│ [ Mulai untuk Keluarga Saya ]  │
│ Catatan: hasil estimasi.       │
└────────────────────────────────┘
```

**States:** Invalid amount / NaN disables result; all zero yields a valid estimate of zero; negative balance yields deficit warning. Demo values live locally; analytics exclude all financial input fields. CTA → W03, not paid checkout directly.

### W03 — Register / Login

```
┌────────────────────────────────┐
│ ← Kembali                      │
│ Buat akun keluarga             │
│                                │
│ Email                          │
│ [                            ] │
│ Password                       │
│ [                            ] │
│ [ Buat Akun ]                   │
│                                │
│ Sudah punya akun? Masuk        │
│                                │
│ Privacy Policy • Terms         │
└────────────────────────────────┘
```

**States:** email existing, invalid email, weak password, email verification (depending auth decision), loading, failed request. Invited registrants show “Bergabung dengan keluarga” and never create an unrelated workspace.

### W04 — Checkout & Payment Verification

```
┌────────────────────────────────┐
│ Pembelian akses keluarga       │
│                                │
│ 1 keluarga • maksimal 2 akun   │
│ Harga                    Rp149k│
│ Masa akses: [TBD; disclose]    │
│                                │
│ [ Lanjut ke Pembayaran ]       │
│                                │
│ Status setelah redirect:       │
│ [ Memverifikasi pembayaran… ]  │
│ [ Cek status ] [ Bantuan ]     │
└────────────────────────────────┘
```

**Important:** Browser redirect is not proof of payment. Pending must not unlock onboarding. Handle paid, pending, failed, cancelled, expired, refunded/revoked.

### W05 — Financial Onboarding (3 steps)

```
┌────────────────────────────────┐
│ Langkah 1 dari 3       33%     │
│ Kenali uang bersama            │
│                                │
│ Saldo bersama saat ini         │
│ [ Rp4.000.000               ]  │
│ Hari gajian utama              │
│ [ 25 ▼                      ]  │
│                                │
│ [ Lanjut → ]                   │
├────────────────────────────────┤
│ Langkah 2 dari 3       66%     │
│ Sisihkan kewajiban             │
│                                │
│ Sisa kebutuhan pokok           │
│ [ Rp1.500.000               ]  │
│ Tagihan bulan ini              │
│ [+ Tambahkan Tagihan]          │
│ [ Lanjut → ]                   │
├────────────────────────────────┤
│ Langkah 3 dari 3      100%     │
│ Dana cadangan                  │
│ [ Rp300.000                 ]  │
│                                │
│ Est. bebas belanja Rp500.000   │
│ [ Mulai Kelola Keuangan → ]    │
└────────────────────────────────┘
```

**Implementation note:** One screen at a time, not the combined illustration above. Draft form can be recovered on refresh. Do not double count itemized bills and a separate aggregate.

### W06 — Dashboard (Main Screen)

```
┌────────────────────────────────┐
│ Halo, Keluarga Kita       👥  │
│ Periode: 25 Okt – 24 Nov      │
│ Saldo dicek: 19 Okt           │
│                                │
│ ┌────────────────────────────┐ │
│ │ Estimasi aman dibelanjakan │ │
│ │        Rp500.000           │ │
│ │ Setelah kewajiban disisihkan│ │
│ └────────────────────────────┘ │
│ [    Boleh Checkout? →     ]   │
│                                │
│ Rincian                        │
│ Saldo bersama       Rp4.000.000│
│ Tagihan tersisa     Rp1.700.000│
│ Kebutuhan pokok     Rp1.500.000│
│ Dana cadangan         Rp300.000│
│                                │
│ [ + Catat Transaksi ]          │
│ [ Perbarui Saldo ]             │
│                                │
│ Beranda Transaksi Anggaran  ⚙  │
└────────────────────────────────┘
```

**Invariant:** Example payday period must be generated from actual current/selected cycle. Dates shown above are illustrative; UI should never hardcode them. Show a deficit card if available < 0; stale balance callout if last reconciliation exceeds policy threshold.

### W07 — “Boleh Checkout?” (Authenticated)

```
┌────────────────────────────────┐
│ ← Beranda                      │
│ Boleh Checkout?                │
│ Hitung dampak rencana belanja  │
│                                │
│ Nama barang (opsional)         │
│ [ Sepatu sekolah            ]  │
│ Harga                          │
│ [ Rp750.000                 ]  │
│                                │
│ Estimasi aman       Rp500.000  │
│ Sisa jika dibeli   −Rp250.000  │
│                                │
│ ┌────────────────────────────┐ │
│ │ ⚠ Berpotensi kekurangan   │ │
│ │ Rp250.000 dari alokasi    │ │
│ │ kebutuhan keluarga.       │ │
│ └────────────────────────────┘ │
│                                │
│ [ Ubah Nominal ]               │
│ [ Catat sebagai Pengeluaran ]  │
│ *Belum ada transaksi tersimpan │
└────────────────────────────────┘
```

**Actions:** Save actual expense opens W09 prefilled; no auto-save. Display calculation breakdown, freshness, and a visible disclaimer. “Catat” should be hidden/disabled if entitlement is not active.

### W08 / W09 — Transactions List & Add Transaction

```
┌────────────────────────────────┐
│ Transaksi                 [+]  │
│ Periode ▼   [ Semua ▼ ]        │
│                                │
│ 19 Okt  Belanja dapur  −Rp150k │
│ 18 Okt  Gaji           +Rp5jt  │
│                                │
│ [ Empty: Belum ada transaksi ] │
│                                │
│ [ + Tambah Transaksi ]         │
│ Beranda Transaksi Anggaran  ⚙  │
└────────────────────────────────┘

┌────────────────────────────────┐
│ ← Kembali                      │
│ Catat transaksi                │
│ [ Pengeluaran | Pemasukan ]    │
│ Nominal [ Rp150.000 ]          │
│ Kategori [ Belanja dapur ▼ ]   │
│ Tanggal  [ 19 Okt 2026 ▼ ]     │
│ Catatan  [ .............. ]    │
│                                │
│ [ Simpan Transaksi ]           │
└────────────────────────────────┘
```

**States:** Loading, empty, error, optimistic save with duplicate prevention. Bill settlement must use a dedicated flow instead of casually duplicating an expense.

### W10 — Budget & Bills

```
┌────────────────────────────────┐
│ Anggaran & Tagihan             │
│                                │
│ Kebutuhan pokok                │
│ Tersisa    Rp1.500.000         │
│ [ Edit alokasi ]               │
│                                │
│ Tagihan belum dibayar          │
│ [ ] Listrik       Rp300.000    │
│     Jatuh tempo 21 Okt         │
│ [ ] Cicilan     Rp1.400.000    │
│     Jatuh tempo 23 Okt         │
│                                │
│ [ + Tambah Tagihan ]           │
│                                │
│ Dana cadangan Rp300.000        │
│ [ Edit cadangan ]              │
│ Beranda Transaksi Anggaran  ⚙  │
└────────────────────────────────┘
```

**States:** No bills; overdue unpaid; recurring occurrence created; marking paid opens explicit confirmation and creates linked expense atomically.

### W11 — Balance Reconciliation

```
┌────────────────────────────────┐
│ ← Beranda                      │
│ Perbarui saldo bersama         │
│                                │
│ Saldo menurut aplikasi         │
│ Rp4.000.000                    │
│                                │
│ Saldo aktual saat ini          │
│ [ Rp3.900.000               ]  │
│                                │
│ Koreksi saldo     −Rp100.000   │
│ Histori tidak akan dihapus.    │
│                                │
│ [ Konfirmasi Pembaruan ]       │
└────────────────────────────────┘
```

**States:** unchanged amount, invalid numeric input, concurrent balance update, network retry. Adjustment must have a durable idempotency key.

### W12 — Family & Account Settings

```
┌────────────────────────────────┐
│ Pengaturan                     │
│                                │
│ Keluarga Kita                  │
│ Owner     Anda                 │
│ Partner   Belum bergabung     │
│ [ + Undang Pasangan ]          │
│                                │
│ Siklus gaji           Tgl 25  │
│ Akses keluarga        Aktif   │
│ [ Lihat Pembelian ]            │
│                                │
│ Privasi & Hapus Data           │
│ [ Keluar ]                     │
│ Beranda Transaksi Anggaran  ⚙  │
└────────────────────────────────┘
```

**States:** Invite link copied/expired/used, two seats filled, member without billing controls, revoked entitlement.

## 4. Screen transitions and CTA contract

| Source | Tap / submit | Destination | Notes |
|---|---|---|---|
| W01 Landing | Coba Simulasi Gratis | W02 | No auth |
| W02 Demo | Mulai untuk Keluarga Saya | W03 | Demo inputs discarded |
| W03 Auth (owner) | Register success | W04 | Create family shell |
| W04 Checkout | Payment backend verified | W05 | Pending state otherwise |
| W05 Onboarding | Submit step 3 | W06 | Persist finance baseline |
| W06 Dashboard | Boleh Checkout? | W07 | Main CTA |
| W07 Simulation | Catat sebagai Pengeluaran | W09 | Prefill; separate confirmation |
| W06 Dashboard | Perbarui Saldo | W11 | Save adjustment |
| W06 Bottom nav | Transaksi | W08 | View activity |
| W06 Bottom nav | Anggaran | W10 | Manage commitments |
| W06 Bottom nav | Pengaturan | W12 | Family/billing |
| W12 Family | Invite partner | Invite accept path | Max 2 users |

## 5. Responsive and accessibility requirements

- Mobile-first minimum practical width: 320 CSS px; avoid horizontal scrolling for financial figures.
- Desktop can display 2-column details but retains identical routes and terminology.
- Use input `type="text"`/`inputmode="numeric"` for formatted IDR, parse to safe integer. Avoid relying on browser floating point for storage.
- Ensure contrast and text labels rather than color-only success/warning states.
- All tappable controls should target at least ~44×44 CSS px.
- Focus states, explicit labels, inline errors, and descriptive screen titles.
- Never render monetary amount with automatic truncation or an ambiguous decimal separator.
- Show skeleton/loading and error recovery where backend calls occur.
- Protect private screens from accidentally caching sensitive data in shared browsers.

## 6. Detailed behavior and failure-state checklist

- [ ] A new visitor can try a valid sample demo without registering.
- [ ] Public demo values are not passed to analytics/Meta Pixel and not stored on server.
- [ ] The product price, entitlement duration, and family-seat limit are visible prepayment.
- [ ] Login and sign-up route guards handle existing invited members without second purchase.
- [ ] Failed and pending payments never unlock paid functionality.
- [ ] Onboarding may be resumed if a user closes the tab.
- [ ] Budget and bill records are never counted twice.
- [ ] A paid bill changes balance and unpaid obligations atomically.
- [ ] An essential expense changes balance and the remaining budget once.
- [ ] Reconciliation records the adjustment rather than replacing history.
- [ ] A simulation never writes data or guarantees safety.
- [ ] Historical transactions don't silently corrupt the current period.
- [ ] Spouse invitations expire and seats cannot exceed two.
- [ ] Empty, invalid, offline, and stale-data states are clear.

## 7. Scope for first Codex design slice

Recommended first slice: W01 + W02 + W07 using **mock data and one isolated calculation function**; write unit tests for the invariant cases from `USER_FLOW.md`. No auth, database, or gateway needed until the interaction model is validated. A later slice adds W05 → W06, then persistence, shared workspace, and payment.

**Do not treat the HTML preview as production implementation.** It is intentionally self-contained, uses fictional amounts, has no backend, and demonstrates only a subset of interactive behavior.
