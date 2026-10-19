import './app.css'

type PlaceholderContent = {
  eyebrow: string
  title: string
  description: string
  href: string
  linkLabel: string
}

const homeContent: PlaceholderContent = {
  eyebrow: 'Fondasi aplikasi',
  title: 'Keuangan keluarga, sedang kami siapkan.',
  description:
    'Aplikasi ini akan membantu keluarga memahami uang yang telah dialokasikan sebelum mengambil keputusan belanja.',
  href: '/demo',
  linkLabel: 'Lihat placeholder demo',
}

const demoContent: PlaceholderContent = {
  eyebrow: 'Demo publik',
  title: 'Boleh Checkout? segera hadir.',
  description:
    'Demo interaktif belum diimplementasikan pada tahap infrastruktur ini. Tidak ada data keuangan yang diminta atau disimpan.',
  href: '/',
  linkLabel: 'Kembali ke beranda',
}

function getContent(pathname: string): PlaceholderContent {
  return pathname === '/demo' ? demoContent : homeContent
}

export function App() {
  const content = getContent(window.location.pathname)

  return (
    <main className="shell">
      <section className="placeholder" aria-labelledby="page-title">
        <div className="brand" aria-label="Family Finance">
          <span className="brand-mark" aria-hidden="true">
            F
          </span>
          <span>Family Finance</span>
        </div>

        <div className="copy">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1 id="page-title">{content.title}</h1>
          <p className="description">{content.description}</p>
          <a className="action" href={content.href}>
            {content.linkLabel}
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <footer>
          <span className="status-dot" aria-hidden="true" />
          Infrastruktur awal aktif
        </footer>
      </section>
    </main>
  )
}

