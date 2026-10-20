import './app.css'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  calculatePurchase,
  type PurchaseCalculation,
  type PurchaseCalculationInput,
} from './purchase-calculator'
import { resolveEarlyAccessUrl } from './early-access'
import { trackFunnelEvent } from './funnel-events'

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Family Finance — beranda">
      <span className="brand-mark" aria-hidden="true">
        F
      </span>
      <span>Family Finance</span>
    </a>
  )
}

function LandingPage() {
  const earlyAccessUrl = resolveEarlyAccessUrl(
    import.meta.env.VITE_EARLY_ACCESS_URL,
  )

  useEffect(() => {
    trackFunnelEvent('landing_view', true)
  }, [])

  return (
    <div className="marketing-page">
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <header className="site-header">
        <Brand />
        <a className="header-cta" href="/demo">
          Coba simulator
        </a>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Keputusan belanja tanpa tebak-tebakan</p>
            <h1 id="hero-title">
              Saldo masih ada, tapi apakah aman untuk belanja?
            </h1>
            <p className="hero-description">
              Saldo rekening belum tentu uang bebas pakai. Family Finance
              membantu melihat tagihan, kebutuhan pokok, dan dana cadangan
              sebelum kamu menekan tombol checkout.
            </p>
            <div className="actions">
              <a className="action action-large" href="/demo">
                Coba “Boleh Checkout?”
                <span aria-hidden="true">→</span>
              </a>
              <a className="action action-outline" href="/app">
                Buka aplikasi lokal v0.2
              </a>
              <span className="quiet-note">Gratis · tanpa login · data tidak dikirim</span>
            </div>
          </div>

          <aside className="decision-card" aria-label="Contoh cara kerja">
            <p className="mini-label">Sebelum checkout</p>
            <p className="decision-question">Sisihkan yang wajib dulu.</p>
            <div className="formula-stack">
              <span>Saldo saat ini</span>
              <span>− Tagihan sampai gajian</span>
              <span>− Kebutuhan pokok tersisa</span>
              <span>− Dana cadangan</span>
            </div>
            <div className="decision-result">
              <span>Baru ketahuan</span>
              <strong>uang yang aman dipakai</strong>
            </div>
          </aside>
        </section>

        <section className="problem-section" aria-labelledby="problem-title">
          <div>
            <p className="eyebrow">Masalah yang sering terjadi</p>
            <h2 id="problem-title">Kelihatan cukup. Ternyata sudah ada jatahnya.</h2>
          </div>
          <div className="problem-grid">
            <article>
              <span className="step-number">01</span>
              <h3>Saldo bukan sisa uang</h3>
              <p>
                Tagihan dan kebutuhan sampai gajian sering belum terlihat saat
                membuka saldo rekening.
              </p>
            </article>
            <article>
              <span className="step-number">02</span>
              <h3>Keputusan jadi emosional</h3>
              <p>
                Diskon terasa mendesak, sementara dampaknya ke kebutuhan
                keluarga baru terasa belakangan.
              </p>
            </article>
            <article>
              <span className="step-number">03</span>
              <h3>Jawaban sederhana</h3>
              <p>
                Masukkan kondisi hari ini, lalu lihat apakah pembelian masih
                menyisakan ruang atau membuat defisit.
              </p>
            </article>
          </div>
        </section>

        <section className="privacy-band">
          <div>
            <p className="eyebrow">Privasi sejak awal</p>
            <h2>Angka keluargamu tetap di perangkatmu.</h2>
          </div>
          <p>
            Simulator ini menghitung langsung di browser. Nilai yang kamu
            masukkan tidak disimpan, tidak dikirim ke server, dan tidak
            diteruskan ke analitik.
          </p>
        </section>

        <section className="pricing-section" aria-labelledby="pricing-title">
          <div className="pricing-copy">
            <p className="eyebrow">Rencana early access</p>
            <h2 id="pricing-title">Keuangan keluarga yang terasa lebih tenang.</h2>
            <p>
              Kami sedang menguji minat sebelum membangun produk lengkap.
              Early access belum dijual dan pembayaran belum tersedia.
            </p>
          </div>
          <div className="price-card">
            <span>Rencana harga early access</span>
            <strong>Rp149.000</strong>
            <small>Sekali bayar · belum tersedia untuk dibeli</small>
            {earlyAccessUrl ? (
              <a
                aria-label="Daftar minat early access (membuka tab baru)"
                className="action price-action"
                href={earlyAccessUrl}
                onClick={() => trackFunnelEvent('early_access_click')}
                rel="noreferrer"
                target="_blank"
              >
                Daftar minat early access
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <span className="action action-disabled" aria-disabled="true">
                Segera hadir
              </span>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <Brand />
        <span>Prototype validasi — bukan nasihat keuangan.</span>
      </footer>
    </div>
  )
}

type AmountField = {
  key: keyof PurchaseCalculationInput
  label: string
  hint: string
}

const amountFields: AmountField[] = [
  {
    key: 'balance',
    label: 'Saldo keluarga saat ini',
    hint: 'Uang yang benar-benar tersedia hari ini',
  },
  {
    key: 'unpaidBills',
    label: 'Tagihan belum dibayar sampai gajian',
    hint: 'Listrik, cicilan, internet, dan tagihan lain',
  },
  {
    key: 'remainingEssentials',
    label: 'Kebutuhan pokok rumah tangga tersisa',
    hint: 'Makan, transportasi, obat, dan kebutuhan wajib',
  },
  {
    key: 'protectedReserve',
    label: 'Dana cadangan yang ingin dilindungi',
    hint: 'Batas aman yang tidak ingin dipakai',
  },
  {
    key: 'purchasePrice',
    label: 'Harga barang yang ingin dibeli',
    hint: 'Total harga setelah ongkir dan biaya lain',
  },
]

const emptyAmounts: Record<keyof PurchaseCalculationInput, string> = {
  balance: '',
  unpaidBills: '',
  remainingEssentials: '',
  protectedReserve: '',
  purchasePrice: '',
}

function parseAmount(value: string, label: string) {
  const normalized = value.trim()

  if (!/^\d+$/.test(normalized)) {
    throw new RangeError(`${label} wajib diisi dengan angka bulat nonnegatif.`)
  }

  const amount = Number(normalized)
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`${label} berada di luar rentang angka yang aman.`)
  }

  return amount
}

function DemoPage() {
  const [amounts, setAmounts] = useState(emptyAmounts)
  const [productName, setProductName] = useState('')
  const [result, setResult] = useState<PurchaseCalculation | null>(null)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const resultRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!result) {
      return
    }

    const resultElement = resultRef.current
    resultElement?.focus({ preventScroll: true })
    resultElement?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    })
  }, [result])

  function updateAmount(field: keyof PurchaseCalculationInput, value: string) {
    trackFunnelEvent('demo_start', true)
    setAmounts((current) => ({ ...current, [field]: value }))
    setResult(null)
    setCalculationError(null)
  }

  function handleCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    trackFunnelEvent('demo_start', true)

    try {
      const input = Object.fromEntries(
        amountFields.map(({ key, label }) => [key, parseAmount(amounts[key], label)]),
      ) as PurchaseCalculationInput

      setResult(calculatePurchase(input))
      setCalculationError(null)
      trackFunnelEvent('demo_complete', true)
    } catch (error) {
      setResult(null)
      setCalculationError(
        error instanceof Error ? error.message : 'Perhitungan tidak dapat dilakukan.',
      )
    }
  }

  const purchaseLabel = productName.trim() || 'Pembelian ini'
  const isDeficit = result ? result.remainingAfterPurchase < 0 : false
  const isExactBoundary = result ? result.remainingAfterPurchase === 0 : false

  return (
    <div className="demo-page">
      <a className="skip-link" href="#demo-main-content">
        Lewati ke kalkulator
      </a>
      <header className="site-header demo-header">
        <Brand />
        <a className="back-link compact-back-link" href="/">
          ← Kembali
        </a>
      </header>

      <main className="demo-main" id="demo-main-content">
        <section className="demo-intro" aria-labelledby="demo-title">
          <p className="eyebrow">Simulator gratis</p>
          <h1 id="demo-title">Boleh Checkout?</h1>
          <p>
            Hitung ruang belanja dari uang yang sudah ada—setelah tagihan,
            kebutuhan pokok, dan dana cadangan diamankan.
          </p>
          <p className="privacy-pill">
            <span aria-hidden="true">●</span>
            Dihitung di perangkatmu. Tidak disimpan atau dikirim.
          </p>
        </section>

        <div className="calculator-layout">
          <form className="calculator-form" onSubmit={handleCalculation}>
            <div className="form-heading">
              <span>1</span>
              <div>
                <h2>Isi kondisi hari ini</h2>
                <p>Gunakan angka rupiah tanpa titik atau koma.</p>
              </div>
            </div>

            <label className="amount-field optional-field">
              <span>Nama barang <small>(opsional)</small></span>
              <input
                autoComplete="off"
                maxLength={80}
                name="productName"
                onChange={(event) => {
                  trackFunnelEvent('demo_start', true)
                  setProductName(event.target.value)
                }}
                placeholder="Contoh: Sepatu sekolah"
                type="text"
                value={productName}
              />
            </label>

            {amountFields.map((field) => (
              <label className="amount-field" key={field.key}>
                <span>{field.label}</span>
                <small id={`${field.key}-hint`}>{field.hint}</small>
                <div className="currency-input">
                  <span aria-hidden="true">Rp</span>
                  <input
                    aria-describedby={`${field.key}-hint`}
                    autoComplete="off"
                    inputMode="numeric"
                    name={field.key}
                    onChange={(event) => updateAmount(field.key, event.target.value)}
                    pattern="[0-9]*"
                    placeholder="0"
                    required
                    type="text"
                    value={amounts[field.key]}
                  />
                </div>
              </label>
            ))}

            {calculationError ? (
              <p className="form-error" role="alert">
                {calculationError}
              </p>
            ) : null}

            <button className="action calculate-action" type="submit">
              Cek apakah aman
              <span aria-hidden="true">→</span>
            </button>

            <p className="estimate-disclaimer">
              Ini adalah estimasi berdasarkan angka yang kamu masukkan, bukan
              nasihat keuangan. Penghasilan masa depan tidak dihitung sebelum
              benar-benar diterima.
            </p>
          </form>

          <section
            className={`result-panel${result ? ' has-result' : ''}`}
            aria-labelledby="result-title"
            ref={resultRef}
            tabIndex={-1}
          >
            <div className="form-heading">
              <span>2</span>
              <div>
                <h2 id="result-title">Lihat hasilnya</h2>
                <p>Ringkasan estimasi keputusan belanjamu.</p>
              </div>
            </div>

            {result ? (
              <>
                <div
                  className={`status-card ${isDeficit ? 'status-deficit' : 'status-safe'}`}
                  role="status"
                >
                  <span>
                    {isDeficit
                      ? 'Belum aman untuk checkout'
                      : isExactBoundary
                        ? 'Pas, tanpa sisa'
                        : 'Masih aman menurut estimasi'}
                  </span>
                  <strong>{idrFormatter.format(result.remainingAfterPurchase)}</strong>
                  <p>
                    {isDeficit
                      ? `${purchaseLabel} membuat alokasi keluarga kurang ${idrFormatter.format(Math.abs(result.remainingAfterPurchase))}. Pertimbangkan menunda atau menurunkan anggaran.`
                      : isExactBoundary
                        ? `${purchaseLabel} menghabiskan seluruh uang yang tersedia setelah alokasi. Tidak ada ruang tersisa untuk perubahan tak terduga.`
                        : `${purchaseLabel} masih menyisakan ruang setelah semua alokasi yang kamu masukkan.`}
                  </p>
                </div>

                <dl className="breakdown">
                  <div>
                    <dt>Saldo saat ini</dt>
                    <dd>{idrFormatter.format(result.balance)}</dd>
                  </div>
                  <div>
                    <dt>Tagihan belum dibayar</dt>
                    <dd>− {idrFormatter.format(result.unpaidBills)}</dd>
                  </div>
                  <div>
                    <dt>Kebutuhan pokok tersisa</dt>
                    <dd>− {idrFormatter.format(result.remainingEssentials)}</dd>
                  </div>
                  <div>
                    <dt>Dana cadangan</dt>
                    <dd>− {idrFormatter.format(result.protectedReserve)}</dd>
                  </div>
                  <div className="breakdown-subtotal">
                    <dt>Aman untuk dibelanjakan</dt>
                    <dd>{idrFormatter.format(result.availableToSpend)}</dd>
                  </div>
                  <div>
                    <dt>Harga pembelian</dt>
                    <dd>− {idrFormatter.format(result.purchasePrice)}</dd>
                  </div>
                  <div className="breakdown-total">
                    <dt>Sisa setelah membeli</dt>
                    <dd>{idrFormatter.format(result.remainingAfterPurchase)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="empty-result">
                <span aria-hidden="true">?</span>
                <p>
                  Isi semua angka, lalu pilih <strong>Cek apakah aman</strong>.
                  Hasil negatif tetap ditampilkan agar risikonya terlihat jelas.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="site-footer demo-footer">
        <span>Semua perhitungan hanya berupa estimasi.</span>
        <a href="/">Tentang Family Finance</a>
      </footer>
    </div>
  )
}

export function PublicApp() {
  const pathname = window.location.pathname

  if (pathname === '/demo') {
    return <DemoPage />
  }

  return <LandingPage />
}

