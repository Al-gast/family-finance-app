import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import './local-finance.css'
import { createFinanceBackup, parseFinanceBackup } from './local-finance-backup'
import {
  addBill,
  addTransaction,
  calculateSnapshot,
  createInitialFinanceState,
  deleteBill,
  deleteTransaction,
  editBill,
  editTransaction,
  formatIdr,
  parseIdr,
  payBill,
  reopenBill,
  simulatePurchase,
  updatePlan,
  type InitialFinanceInput,
  type LocalBill,
  type LocalFinanceState,
  type LocalTransaction,
  type MutationContext,
  type TransactionDraft,
} from './local-finance-domain'
import { loadFinanceState, saveFinanceState } from './local-finance-storage'

type StateMutation = (state: LocalFinanceState) => LocalFinanceState
type ApplyMutation = (mutation: StateMutation) => string | null

const categories = [
  'Pemasukan / gaji',
  'Belanja dapur',
  'Makanan',
  'Transportasi',
  'Rumah tangga',
  'Pendidikan',
  'Kesehatan',
  'Hiburan',
  'Lainnya',
]

function mutationContext(): MutationContext {
  return {
    id: () => crypto.randomUUID(),
    now: new Date().toISOString(),
    businessDate: todayInJakarta(),
  }
}

function todayInJakarta(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Operasi tidak dapat diproses.'
}

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname)
  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path: string) {
    const target = new URL(path, window.location.origin)
    window.history.pushState({}, '', path)
    setPathname(target.pathname)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return { pathname, navigate }
}

function AppLink({
  children,
  className,
  href,
  navigate,
}: {
  children: ReactNode
  className?: string
  href: string
  navigate: (path: string) => void
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return
        }
        event.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </a>
  )
}

function useFinanceState() {
  const [state, setState] = useState<LocalFinanceState | null | undefined>()
  const [storageError, setStorageError] = useState<string | null>(null)
  const saveQueue = useRef(Promise.resolve())

  useEffect(() => {
    let active = true
    void loadFinanceState()
      .then((loaded) => {
        if (active) setState(loaded)
      })
      .catch((error: unknown) => {
        if (active) setStorageError(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [])

  function persist(next: LocalFinanceState) {
    setState(next)
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => saveFinanceState(next))
      .catch((error: unknown) => setStorageError(errorMessage(error)))
  }

  const apply: ApplyMutation = (mutation) => {
    if (!state) return 'Data keuangan belum siap.'
    try {
      persist(mutation(state))
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  return { state, storageError, apply, persist }
}

function Brand() {
  return (
    <a className="local-brand" href="/">
      <span aria-hidden="true">F</span>
      <strong>Family Finance</strong>
    </a>
  )
}

function Onboarding({ onComplete }: { onComplete: (state: LocalFinanceState) => void }) {
  const today = todayInJakarta()
  const [step, setStep] = useState(1)
  const [familyName, setFamilyName] = useState('Keluarga Kita')
  const [openingBalanceIdr, setOpeningBalanceIdr] = useState('')
  const [paydayDay, setPaydayDay] = useState('25')
  const [essentialBudgetIdr, setEssentialBudgetIdr] = useState('')
  const [protectedReserveIdr, setProtectedReserveIdr] = useState('')
  const [bills, setBills] = useState<InitialFinanceInput['bills']>([])
  const [billDraft, setBillDraft] = useState({ name: '', amountIdr: '', dueOn: today })
  const [error, setError] = useState<string | null>(null)

  function continueFromBasics(event: FormEvent) {
    event.preventDefault()
    try {
      if (!familyName.trim()) throw new Error('Nama keluarga wajib diisi.')
      parseIdr(openingBalanceIdr, 'Saldo awal', { allowZero: true })
      const day = Number(paydayDay)
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        throw new Error('Hari gajian harus antara 1 dan 31.')
      }
      setError(null)
      setStep(2)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  function addDraftBill() {
    try {
      if (!billDraft.name.trim()) throw new Error('Nama tagihan wajib diisi.')
      parseIdr(billDraft.amountIdr, 'Nominal tagihan')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(billDraft.dueOn)) {
        throw new Error('Tanggal jatuh tempo tidak valid.')
      }
      setBills((current) => [...current, { ...billDraft, name: billDraft.name.trim() }])
      setBillDraft({ name: '', amountIdr: '', dueOn: today })
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  function continueFromPlan(event: FormEvent) {
    event.preventDefault()
    try {
      parseIdr(essentialBudgetIdr, 'Anggaran kebutuhan pokok', { allowZero: true })
      setError(null)
      setStep(3)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  function finish(event: FormEvent) {
    event.preventDefault()
    try {
      const context = mutationContext()
      onComplete(
        createInitialFinanceState(
          {
            familyName,
            openingBalanceIdr,
            paydayDay: Number(paydayDay),
            essentialBudgetIdr,
            protectedReserveIdr,
            bills,
          },
          context,
        ),
      )
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <Brand />
        <a href="/">Keluar dari setup</a>
      </header>
      <main className="onboarding-main">
        <div className="progress-copy">
          <span>Langkah {step} dari 3</span>
          <progress max="3" value={step} aria-label={`Langkah ${step} dari 3`} />
        </div>

        {step === 1 ? (
          <form className="local-card onboarding-card" onSubmit={continueFromBasics}>
            <p className="local-eyebrow">Mulai dari kondisi hari ini</p>
            <h1>Kenali uang bersama.</h1>
            <p>Semua data tersimpan hanya di browser perangkat ini.</p>
            <label>
              Nama keluarga
              <input maxLength={80} onChange={(event) => setFamilyName(event.target.value)} required value={familyName} />
            </label>
            <MoneyField label="Saldo bersama saat ini" onChange={setOpeningBalanceIdr} required value={openingBalanceIdr} />
            <label>
              Tanggal gajian utama
              <input inputMode="numeric" max="31" min="1" onChange={(event) => setPaydayDay(event.target.value)} required type="number" value={paydayDay} />
            </label>
            {error ? <FormError>{error}</FormError> : null}
            <button className="local-primary" type="submit">Lanjut ke alokasi →</button>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="local-card onboarding-card" onSubmit={continueFromPlan}>
            <p className="local-eyebrow">Sisihkan yang wajib</p>
            <h1>Atur kebutuhan dan tagihan.</h1>
            <MoneyField label="Anggaran kebutuhan pokok siklus ini" onChange={setEssentialBudgetIdr} required value={essentialBudgetIdr} />
            <fieldset className="bill-builder">
              <legend>Tagihan belum dibayar <small>(opsional)</small></legend>
              <label>Nama tagihan<input maxLength={80} onChange={(event) => setBillDraft({ ...billDraft, name: event.target.value })} value={billDraft.name} /></label>
              <MoneyField label="Nominal" onChange={(amountIdr) => setBillDraft({ ...billDraft, amountIdr })} value={billDraft.amountIdr} />
              <label>Jatuh tempo<input onChange={(event) => setBillDraft({ ...billDraft, dueOn: event.target.value })} type="date" value={billDraft.dueOn} /></label>
              <button className="local-secondary" onClick={addDraftBill} type="button">+ Tambahkan tagihan</button>
            </fieldset>
            {bills.length ? (
              <ul className="compact-list">
                {bills.map((bill, index) => (
                  <li key={`${bill.name}-${index}`}><span>{bill.name}<small>{formatDate(bill.dueOn)}</small></span><strong>{formatIdr(bill.amountIdr)}</strong><button aria-label={`Hapus ${bill.name}`} onClick={() => setBills((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">×</button></li>
                ))}
              </ul>
            ) : <p className="local-empty-inline">Belum ada tagihan. Kamu bisa menambahkannya nanti.</p>}
            {error ? <FormError>{error}</FormError> : null}
            <div className="form-actions"><button className="local-secondary" onClick={() => setStep(1)} type="button">← Kembali</button><button className="local-primary" type="submit">Lanjut →</button></div>
          </form>
        ) : null}

        {step === 3 ? (
          <form className="local-card onboarding-card" onSubmit={finish}>
            <p className="local-eyebrow">Buat batas aman</p>
            <h1>Lindungi dana cadangan.</h1>
            <MoneyField label="Dana cadangan minimum" onChange={setProtectedReserveIdr} required value={protectedReserveIdr} />
            <div className="setup-summary">
              <span>Saldo awal<strong>{openingBalanceIdr ? formatIdr(openingBalanceIdr) : 'Rp0'}</strong></span>
              <span>Kebutuhan pokok<strong>{essentialBudgetIdr ? formatIdr(essentialBudgetIdr) : 'Rp0'}</strong></span>
              <span>Tagihan dicatat<strong>{bills.length}</strong></span>
            </div>
            {error ? <FormError>{error}</FormError> : null}
            <div className="form-actions"><button className="local-secondary" onClick={() => setStep(2)} type="button">← Kembali</button><button className="local-primary" type="submit">Mulai kelola keuangan</button></div>
          </form>
        ) : null}
      </main>
    </div>
  )
}

function MoneyField({
  label,
  onChange,
  required = false,
  value,
}: {
  label: string
  onChange: (value: string) => void
  required?: boolean
  value: string
}) {
  return (
    <label>
      {label}
      <span className="local-money-input"><span aria-hidden="true">Rp</span><input autoComplete="off" inputMode="numeric" onChange={(event) => onChange(event.target.value)} pattern="[0-9]*" placeholder="0" required={required} type="text" value={value} /></span>
    </label>
  )
}

function FormError({ children }: { children: ReactNode }) {
  return <p className="local-form-error" role="alert">{children}</p>
}

function AppShell({
  children,
  familyName,
  navigate,
  pathname,
}: {
  children: ReactNode
  familyName: string
  navigate: (path: string) => void
  pathname: string
}) {
  const links = [
    { href: '/app', icon: '⌂', label: 'Beranda' },
    { href: '/app/transactions', icon: '↕', label: 'Transaksi' },
    { href: '/app/plan', icon: '▤', label: 'Anggaran' },
    { href: '/app/backup', icon: '⋯', label: 'Lainnya' },
  ]
  return (
    <div className="local-app">
      <a className="skip-link" href="#local-main">Lewati ke konten utama</a>
      <header className="local-topbar"><Brand /><span>{familyName}</span></header>
      <main className="local-main" id="local-main">{children}</main>
      <nav aria-label="Navigasi aplikasi" className="bottom-nav">
        {links.map((link) => {
          const active = link.href === '/app' ? pathname === '/app' : pathname.startsWith(link.href)
          return <AppLink className={active ? 'active' : undefined} href={link.href} key={link.href} navigate={navigate}><span aria-hidden="true">{link.icon}</span>{link.label}</AppLink>
        })}
      </nav>
    </div>
  )
}

function Dashboard({ state, navigate }: { state: LocalFinanceState; navigate: (path: string) => void }) {
  const today = todayInJakarta()
  const snapshot = calculateSnapshot(state, today)
  const deficit = snapshot.availableToSpendIdr < 0n
  const checkedDaysAgo = Math.floor(
    (Date.parse(`${today}T00:00:00.000Z`) -
      Date.parse(`${state.family.balanceCheckedAt.slice(0, 10)}T00:00:00.000Z`)) /
      86_400_000,
  )
  return (
    <>
      <section className="screen-heading"><p className="local-eyebrow">Periode {formatDate(snapshot.cycleStart)} – {formatDate(snapshot.nextPayday)}</p><h1>Halo, {state.family.name}.</h1><p>Saldo terakhir dicek {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(state.family.balanceCheckedAt))}.</p></section>
      {checkedDaysAgo > 7 ? <div className="local-warning" role="status"><strong>Saldo mungkin sudah usang.</strong><span>Backup dan periksa kembali kondisi rekening sebelum mengambil keputusan besar.</span></div> : null}
      <section className={`available-card ${deficit ? 'deficit' : ''}`}><span>Estimasi aman dibelanjakan</span><strong>{formatIdr(snapshot.availableToSpendIdr)}</strong><p>{deficit ? 'Alokasi yang kamu catat melebihi saldo saat ini.' : 'Setelah tagihan, kebutuhan pokok, dan dana cadangan disisihkan.'}</p><AppLink className="local-primary" href="/app/simulate" navigate={navigate}>Boleh Checkout? →</AppLink></section>
      <section className="local-section"><div className="section-title"><div><p className="local-eyebrow">Ringkasan hari ini</p><h2>Ke mana saldo dialokasikan?</h2></div></div><dl className="metric-list"><div><dt>Saldo bersama</dt><dd>{formatIdr(snapshot.balanceIdr)}</dd></div><div><dt>Tagihan sampai gajian</dt><dd>{formatIdr(snapshot.unpaidBillsIdr)}</dd></div><div><dt>Sisa kebutuhan pokok</dt><dd>{formatIdr(snapshot.remainingEssentialsIdr)}</dd></div><div><dt>Dana cadangan</dt><dd>{formatIdr(snapshot.protectedReserveIdr)}</dd></div></dl></section>
      <div className="dashboard-actions"><AppLink className="local-primary" href="/app/transactions?new=1" navigate={navigate}>+ Catat transaksi</AppLink><AppLink className="local-secondary" href="/app/plan" navigate={navigate}>Kelola anggaran</AppLink></div>
      <p className="estimate-note">Estimasi berdasarkan data yang tersimpan di perangkat ini. Penghasilan masa depan tidak dihitung sampai benar-benar dicatat sebagai pemasukan.</p>
    </>
  )
}

function TransactionsScreen({ state, apply }: { state: LocalFinanceState; apply: ApplyMutation }) {
  const initialEditId = new URLSearchParams(window.location.search).get('edit')
  const [showForm, setShowForm] = useState(new URLSearchParams(window.location.search).has('new') || Boolean(initialEditId))
  const [editingId, setEditingId] = useState<string | null>(initialEditId)
  const [error, setError] = useState<string | null>(null)
  const visible = [...state.transactions].filter(({ kind }) => kind !== 'reversal').sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt))
  const editing = state.transactions.find(({ id }) => id === editingId) ?? null

  function closeForm() { setShowForm(false); setEditingId(null); setError(null); window.history.replaceState({}, '', '/app/transactions') }
  function startEdit(transaction: LocalTransaction) { setEditingId(transaction.id); setShowForm(true); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <>
      <section className="screen-heading"><p className="local-eyebrow">Arus kas aktual</p><h1>Transaksi</h1><p>Pemasukan baru menambah saldo setelah dicatat. Pengeluaran selalu mengurangi saldo.</p></section>
      {showForm ? <TransactionForm key={editing?.id ?? 'new'} editing={editing} onCancel={closeForm} onSubmit={(draft) => { const nextError = editing ? apply((current) => editTransaction(current, editing.id, draft, mutationContext())) : apply((current) => addTransaction(current, draft, mutationContext())); setError(nextError); if (!nextError) closeForm() }} /> : <button className="local-primary full-button" onClick={() => setShowForm(true)} type="button">+ Catat transaksi</button>}
      {error ? <FormError>{error}</FormError> : null}
      <section className="local-section transaction-section"><div className="section-title"><h2>Riwayat transaksi</h2><span>{visible.length} catatan</span></div>{visible.length ? <ul className="transaction-list">{visible.map((transaction) => <li className={transaction.reversedAt ? 'reversed' : ''} key={transaction.id}><div className={`transaction-icon ${transaction.deltaIdr.startsWith('-') ? 'expense' : 'income'}`} aria-hidden="true">{transaction.deltaIdr.startsWith('-') ? '−' : '+'}</div><div className="transaction-copy"><strong>{transaction.category}</strong><span>{formatDate(transaction.occurredOn)}{transaction.note ? ` · ${transaction.note}` : ''}</span>{transaction.reversedAt ? <small>Dibatalkan — histori tetap disimpan</small> : null}</div><strong>{formatIdr(BigInt(transaction.deltaIdr))}</strong>{!transaction.reversedAt && !transaction.billId ? <div className="row-actions"><button onClick={() => startEdit(transaction)} type="button">Edit</button><button onClick={() => { if (!window.confirm('Batalkan transaksi ini? Histori koreksi tetap disimpan.')) return; setError(apply((current) => deleteTransaction(current, transaction.id, mutationContext()))) }} type="button">Hapus</button></div> : null}{transaction.billId && !transaction.reversedAt ? <small className="linked-label">Dikelola dari Tagihan</small> : null}</li>)}</ul> : <div className="local-empty"><span aria-hidden="true">↕</span><h3>Belum ada transaksi</h3><p>Catat pemasukan yang sudah diterima atau pengeluaran yang benar-benar terjadi.</p></div>}</section>
    </>
  )
}

function TransactionForm({ editing, onCancel, onSubmit }: { editing: LocalTransaction | null; onCancel: () => void; onSubmit: (draft: TransactionDraft) => void }) {
  const [kind, setKind] = useState<'income' | 'expense'>(editing?.kind === 'expense' ? 'expense' : 'income')
  const [amountIdr, setAmountIdr] = useState(editing ? (BigInt(editing.deltaIdr) < 0n ? -BigInt(editing.deltaIdr) : BigInt(editing.deltaIdr)).toString() : '')
  const [category, setCategory] = useState(editing?.category ?? categories[0])
  const [essential, setEssential] = useState(editing?.expenseType === 'essential')
  const [occurredOn, setOccurredOn] = useState(editing?.occurredOn ?? todayInJakarta())
  const [note, setNote] = useState(editing?.note ?? '')

  function submit(event: FormEvent) { event.preventDefault(); onSubmit({ kind, amountIdr, category, expenseType: kind === 'expense' ? (essential ? 'essential' : 'discretionary') : null, note, occurredOn }) }
  return <form className="local-card transaction-form" onSubmit={submit}><div className="section-title"><h2>{editing ? 'Edit transaksi' : 'Catat transaksi'}</h2><button className="text-button" onClick={onCancel} type="button">Tutup</button></div><fieldset className="segmented"><legend>Jenis transaksi</legend><label className={kind === 'income' ? 'selected' : ''}><input checked={kind === 'income'} name="kind" onChange={() => { setKind('income'); setCategory('Pemasukan / gaji'); setEssential(false) }} type="radio" />Pemasukan</label><label className={kind === 'expense' ? 'selected' : ''}><input checked={kind === 'expense'} name="kind" onChange={() => { setKind('expense'); setCategory('Belanja dapur') }} type="radio" />Pengeluaran</label></fieldset><MoneyField label="Nominal" onChange={setAmountIdr} required value={amountIdr} /><label>Kategori<select onChange={(event) => setCategory(event.target.value)} value={category}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>{kind === 'expense' ? <label className="check-row"><input checked={essential} onChange={(event) => setEssential(event.target.checked)} type="checkbox" /><span><strong>Ini kebutuhan pokok</strong><small>Kurangi sisa anggaran kebutuhan siklus ini.</small></span></label> : null}<label>Tanggal transaksi<input onChange={(event) => setOccurredOn(event.target.value)} required type="date" value={occurredOn} /></label><label>Catatan <small>(opsional)</small><input maxLength={160} onChange={(event) => setNote(event.target.value)} value={note} /></label><button className="local-primary" type="submit">{editing ? 'Simpan koreksi' : 'Simpan transaksi'}</button>{editing ? <p className="estimate-note">Versi lama tidak dihapus; aplikasi menyimpan pembatalan dan transaksi pengganti.</p> : null}</form>
}

function PlanScreen({ state, apply }: { state: LocalFinanceState; apply: ApplyMutation }) {
  const today = todayInJakarta()
  const snapshot = calculateSnapshot(state, today)
  const [budget, setBudget] = useState(state.family.essentialBudgetIdr)
  const [reserve, setReserve] = useState(state.family.protectedReserveIdr)
  const [payday, setPayday] = useState(String(state.family.paydayDay))
  const [billDraft, setBillDraft] = useState({ name: '', amountIdr: '', dueOn: today })
  const [editingBillId, setEditingBillId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function savePlan(event: FormEvent) { event.preventDefault(); setError(apply((current) => updatePlan(current, { essentialBudgetIdr: budget, protectedReserveIdr: reserve, paydayDay: Number(payday) }, mutationContext()))) }
  function submitBill(event: FormEvent) { event.preventDefault(); const nextError = editingBillId ? apply((current) => editBill(current, editingBillId, billDraft, mutationContext())) : apply((current) => addBill(current, billDraft, mutationContext())); setError(nextError); if (!nextError) { setBillDraft({ name: '', amountIdr: '', dueOn: today }); setEditingBillId(null) } }
  function startEdit(bill: LocalBill) { setEditingBillId(bill.id); setBillDraft({ name: bill.name, amountIdr: bill.amountIdr, dueOn: bill.dueOn }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <><section className="screen-heading"><p className="local-eyebrow">Pisahkan saldo dan komitmen</p><h1>Anggaran & tagihan</h1><p>Tagihan dan kebutuhan pokok dicadangkan terpisah, sehingga tidak dihitung dua kali saat benar-benar dibayar.</p></section>{error ? <FormError>{error}</FormError> : null}<section className="local-card plan-card"><div className="section-title"><div><h2>Rencana siklus</h2><span>{formatDate(snapshot.cycleStart)} – {formatDate(snapshot.nextPayday)}</span></div><strong>{formatIdr(snapshot.remainingEssentialsIdr)} tersisa</strong></div><form onSubmit={savePlan}><MoneyField label="Total anggaran kebutuhan pokok" onChange={setBudget} required value={budget} /><MoneyField label="Dana cadangan dilindungi" onChange={setReserve} required value={reserve} /><label>Tanggal gajian utama<input max="31" min="1" onChange={(event) => setPayday(event.target.value)} required type="number" value={payday} /></label><button className="local-primary" type="submit">Simpan rencana</button></form></section><section className="local-section"><div className="section-title"><div><p className="local-eyebrow">Kewajiban</p><h2>Tagihan</h2></div><span>{state.bills.filter(({ paidTransactionId }) => !paidTransactionId).length} belum dibayar</span></div><form className="local-card bill-form" onSubmit={submitBill}><h3>{editingBillId ? 'Edit tagihan' : 'Tambah tagihan'}</h3><label>Nama tagihan<input maxLength={80} onChange={(event) => setBillDraft({ ...billDraft, name: event.target.value })} required value={billDraft.name} /></label><MoneyField label="Nominal" onChange={(amountIdr) => setBillDraft({ ...billDraft, amountIdr })} required value={billDraft.amountIdr} /><label>Jatuh tempo<input onChange={(event) => setBillDraft({ ...billDraft, dueOn: event.target.value })} required type="date" value={billDraft.dueOn} /></label><div className="form-actions">{editingBillId ? <button className="local-secondary" onClick={() => { setEditingBillId(null); setBillDraft({ name: '', amountIdr: '', dueOn: today }) }} type="button">Batal</button> : null}<button className="local-primary" type="submit">{editingBillId ? 'Simpan perubahan' : '+ Tambah tagihan'}</button></div></form>{state.bills.length ? <ul className="bill-list">{[...state.bills].sort((a, b) => a.dueOn.localeCompare(b.dueOn)).map((bill) => { const paid = Boolean(bill.paidTransactionId); const reserved = !paid && bill.dueOn < snapshot.nextPayday; return <li className={paid ? 'paid' : ''} key={bill.id}><div><strong>{bill.name}</strong><span>Jatuh tempo {formatDate(bill.dueOn)} · {paid ? 'Sudah dibayar' : reserved ? 'Dicadangkan sampai gajian' : 'Di luar siklus ini'}</span></div><strong>{formatIdr(bill.amountIdr)}</strong><div className="row-actions">{paid ? <button onClick={() => { if (window.confirm('Batalkan pembayaran dan kembalikan tagihan menjadi belum dibayar?')) setError(apply((current) => reopenBill(current, bill.id, mutationContext()))) }} type="button">Batalkan bayar</button> : <><button onClick={() => startEdit(bill)} type="button">Edit</button><button onClick={() => { if (window.confirm(`Catat pembayaran ${bill.name}? Saldo akan berkurang ${formatIdr(bill.amountIdr)}.`)) setError(apply((current) => payBill(current, bill.id, mutationContext()))) }} type="button">Tandai dibayar</button><button onClick={() => { if (window.confirm('Hapus tagihan yang belum dibayar ini?')) setError(apply((current) => deleteBill(current, bill.id, mutationContext()))) }} type="button">Hapus</button></>}</div></li> })}</ul> : <div className="local-empty"><span aria-hidden="true">✓</span><h3>Belum ada tagihan</h3><p>Tambahkan setiap tagihan secara terpisah agar tidak terhitung ganda.</p></div>}</section></>
}

function SimulationScreen({ state }: { state: LocalFinanceState }) {
  const snapshot = calculateSnapshot(state, todayInJakarta())
  const [productName, setProductName] = useState('')
  const [purchaseIdr, setPurchaseIdr] = useState('')
  const [result, setResult] = useState<ReturnType<typeof simulatePurchase> | null>(null)
  const [error, setError] = useState<string | null>(null)
  function submit(event: FormEvent) { event.preventDefault(); try { setResult(simulatePurchase(snapshot, purchaseIdr)); setError(null) } catch (caught) { setResult(null); setError(errorMessage(caught)) } }
  return <><section className="screen-heading"><p className="local-eyebrow">Berdasarkan data keluargamu</p><h1>Boleh Checkout?</h1><p>Simulasi ini tidak membuat transaksi dan tidak mengubah saldo.</p></section><form className="local-card simulation-form" onSubmit={submit}><label>Nama barang <small>(opsional)</small><input maxLength={80} onChange={(event) => setProductName(event.target.value)} placeholder="Contoh: Sepatu sekolah" value={productName} /></label><MoneyField label="Harga pembelian" onChange={setPurchaseIdr} required value={purchaseIdr} /><button className="local-primary" type="submit">Hitung dampaknya</button>{error ? <FormError>{error}</FormError> : null}</form><section className="local-card simulation-result" aria-live="polite">{result ? <><div className={`result-banner ${result.withinPlan ? 'safe' : 'deficit'}`}><span>{result.withinPlan ? 'Masih dalam batas anggaran' : 'Berpotensi kekurangan dana'}</span><strong>{formatIdr(result.remainingAfterPurchaseIdr)}</strong><p>{result.withinPlan ? `${productName.trim() || 'Pembelian ini'} masih menyisakan ruang berdasarkan data saat ini.` : `${productName.trim() || 'Pembelian ini'} berpotensi mengambil ${formatIdr(result.shortfallIdr)} dari dana yang sudah dialokasikan.`}</p></div><dl className="metric-list"><div><dt>Saldo bersama</dt><dd>{formatIdr(snapshot.balanceIdr)}</dd></div><div><dt>Tagihan belum dibayar</dt><dd>− {formatIdr(snapshot.unpaidBillsIdr)}</dd></div><div><dt>Sisa kebutuhan pokok</dt><dd>− {formatIdr(snapshot.remainingEssentialsIdr)}</dd></div><div><dt>Dana cadangan</dt><dd>− {formatIdr(snapshot.protectedReserveIdr)}</dd></div><div className="total"><dt>Estimasi aman</dt><dd>{formatIdr(snapshot.availableToSpendIdr)}</dd></div><div><dt>Harga pembelian</dt><dd>− {formatIdr(result.purchaseIdr)}</dd></div></dl></> : <div className="local-empty"><span aria-hidden="true">?</span><h3>Masukkan harga barang</h3><p>Hasil akan memakai saldo, tagihan, anggaran, dan dana cadangan yang tersimpan.</p></div>}</section><p className="estimate-note">Hasil adalah estimasi, bukan jaminan finansial. Penghasilan masa depan tidak dihitung sebelum diterima.</p></>
}

function BackupScreen({ state, onImport }: { state: LocalFinanceState; onImport: (state: LocalFinanceState) => void }) {
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  function exportData() { const blob = new Blob([createFinanceBackup(state)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `family-finance-backup-${todayInJakarta()}.json`; anchor.click(); URL.revokeObjectURL(url); setNotice('File cadangan berhasil dibuat.') }
  async function importData(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { const restored = parseFinanceBackup(await file.text()); if (!window.confirm(`Ganti data perangkat ini dengan cadangan untuk ${restored.family.name}?`)) return; onImport(restored); setError(null); setNotice('Cadangan berhasil dipulihkan dan disimpan ke perangkat.') } catch (caught) { setNotice(null); setError(errorMessage(caught)) } }
  return <><section className="screen-heading"><p className="local-eyebrow">Data milikmu</p><h1>Backup & privasi</h1><p>Data v0.2 hanya berada di IndexedDB browser ini. Tidak ada akun atau sinkronisasi cloud.</p></section><section className="local-card backup-card"><h2>Ekspor JSON</h2><p>Simpan salinan setelah perubahan penting. File berisi seluruh data keuangan dan harus disimpan dengan aman.</p><button className="local-primary" onClick={exportData} type="button">Unduh backup JSON</button></section><section className="local-card backup-card"><h2>Impor JSON</h2><p>Impor akan memvalidasi struktur, relasi tagihan, transaksi koreksi, dan saldo sebelum mengganti data perangkat ini.</p><label className="file-button">Pilih file backup<input accept="application/json,.json" onChange={(event) => void importData(event)} type="file" /></label></section>{notice ? <p className="local-success" role="status">{notice}</p> : null}{error ? <FormError>{error}</FormError> : null}<section className="local-section privacy-copy"><h2>Batasan penting</h2><ul><li>Menghapus data browser atau perangkat dapat menghapus semua catatan.</li><li>Data tidak otomatis tersinkron ke perangkat lain.</li><li>Siapa pun yang menguasai perangkat atau file backup dapat membaca data.</li></ul></section></>
}

export function LocalFinanceApp() {
  const { pathname, navigate } = usePathname()
  const { state, storageError, apply, persist } = useFinanceState()

  if (storageError && state === undefined) return <main className="fatal-state"><h1>Penyimpanan lokal tidak tersedia.</h1><p>{storageError}</p><a href="/">Kembali ke beranda</a></main>
  if (state === undefined) return <main className="fatal-state" aria-live="polite"><h1>Memuat data keluarga…</h1></main>
  if (state === null) return <Onboarding onComplete={persist} />

  let screen: ReactNode
  if (pathname === '/app/transactions') screen = <TransactionsScreen apply={apply} state={state} />
  else if (pathname === '/app/plan') screen = <PlanScreen apply={apply} state={state} />
  else if (pathname === '/app/simulate') screen = <SimulationScreen state={state} />
  else if (pathname === '/app/backup') screen = <BackupScreen onImport={persist} state={state} />
  else screen = <Dashboard navigate={navigate} state={state} />

  return <AppShell familyName={state.family.name} navigate={navigate} pathname={pathname}>{storageError ? <div className="local-warning" role="alert"><strong>Perubahan terakhir belum tersimpan.</strong><span>{storageError}</span></div> : null}{screen}</AppShell>
}
