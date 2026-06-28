import { useEffect, useRef, useState } from 'react';
import './App.css';

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Counter({ to, suffix = '', prefix = '', inView }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const steps = 100;
    let s = 0;
    const t = setInterval(() => {
      s++;
      setVal(Math.round((to * s) / steps));
      if (s >= steps) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [inView, to]);
  return <span>{prefix}{val}{suffix}</span>;
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const go = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-inner">
        <button className="nav-logo" onClick={() => go('hero')}>
          <span className="logo-cap">capital</span>
          <span className="logo-con">connect</span>
        </button>
        <button className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
          <span /><span /><span />
        </button>
        <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
          {[['About','about'],['Services','services'],['Founder','founder'],['Partners','partners'],['Contact','contact']].map(([l,id]) => (
            <li key={id}><button onClick={() => go(id)}>{l}</button></li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function Hero() {
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <section id="hero" className="hero">
      <div className="hero-bg">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <div className="hero-glow hero-glow-2" />
      </div>
      <div className="hero-content">
        <div className="hero-eyebrow">Financial Advisory &amp; Investment Management</div>
        <h1 className="hero-title">
          Where Capital<br />
          <em>Meets Opportunity</em>
        </h1>
        <p className="hero-sub">
          Capital Connect bridges ambitious businesses with global capital markets —
          delivering institutional-grade M&amp;A advisory, private equity, and strategic investment solutions across Pakistan and Asia Pacific.
        </p>
        <div className="hero-ctas">
          <button className="btn-primary" onClick={() => go('services')}>Explore Services</button>
          <button className="btn-outline" onClick={() => go('contact')}>Get in Touch</button>
        </div>
      </div>
      <div className="hero-scroll">
        <div className="scroll-line" />
        <span>Scroll</span>
      </div>
    </section>
  );
}

function About() {
  const [ref, visible] = useInView();
  return (
    <section id="about" className="section about">
      <div className="container">
        <div className={`about-grid${visible ? ' visible' : ''}`} ref={ref}>
          <div className="about-left">
            <div className="section-tag">About Us</div>
            <h2 className="section-title">A Premier M&amp;A and Financial Advisory Firm</h2>
            <p>Capital Connect is a boutique investment banking and financial advisory firm with deep roots in Pakistan's capital markets and strong international reach across Asia Pacific.</p>
            <p>We specialize in structuring and executing complex cross-border transactions — advising governments, corporates, and funds across mergers &amp; acquisitions, equity and debt capital markets, privatization mandates, and strategic investment planning.</p>
            <p>Our client-first approach, combined with direct relationships with international DFIs, sovereign wealth funds, and institutional investors, makes Capital Connect the partner of choice for transformative financial mandates.</p>
            <div className="about-pills">
              <span>JPMorgan Trained</span>
              <span>ESG Certified</span>
              <span>Cross-Border Specialists</span>
              <span>Pakistan-Focused</span>
            </div>
          </div>
          <div className="about-right">
            {[
              { tag: 'M&A', title: 'Mergers & Acquisitions', desc: 'End-to-end advisory on buy-side and sell-side mandates across minority, majority, and strategic stake transactions.' },
              { tag: 'PE',  title: 'Private Equity',          desc: 'Full private equity lifecycle management — from fund formation and deal sourcing to execution and exit advisory.' },
              { tag: 'CM',  title: 'Capital Markets',         desc: 'Equity and debt capital market mandates including IPOs, GDR issuances, sukuk offerings, and private placements.' },
            ].map((c, i) => (
              <div className={`about-card delay-${i}`} key={i}>
                <div className="about-icon">{c.tag}</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  { title: 'Mergers & Acquisitions',   desc: 'Strategic M&A advisory for sell-side, buy-side, and joint venture mandates across energy, financial institutions, consumer, and industrials.' },
  { title: 'Private Equity Advisory',  desc: 'Comprehensive PE lifecycle support: fund structuring, deal origination, valuation, execution, and exit advisory for sponsors and portfolio companies.' },
  { title: 'Capital Markets',          desc: 'Equity and debt capital market solutions — IPOs, GDR issuances, sukuk/bond offerings, and structured private placements.' },
  { title: 'Investment Management',    desc: 'Strategic investment structuring with deep experience in clean energy, fintech, technology, and impact investing themes.' },
  { title: 'Privatization Advisory',   desc: 'Unparalleled experience advising governments on strategic stake sales, GDR issuances, and investor targeting for state-owned enterprises.' },
  { title: 'Fund Raising',             desc: 'Direct access to international DFIs, sovereign wealth funds, and institutional investors to support capital raising for funds and sponsors.' },
];

function Services() {
  const [ref, visible] = useInView();
  return (
    <section id="services" className="section section-dark services">
      <div className="container">
        <div className={`section-header${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag light">Our Services</div>
          <h2 className="section-title light">Comprehensive Financial Solutions</h2>
          <p className="section-sub light">From complex cross-border M&A to capital markets and fund raising, we deliver institutional-grade advisory at every stage.</p>
        </div>
        <div className={`services-grid${visible ? ' visible' : ''}`}>
          {SERVICES.map((s, i) => (
            <div className={`service-card delay-${i}`} key={i}>
              <div className="service-num">0{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const [ref, visible] = useInView(0.3);
  return (
    <section className="stats" ref={ref}>
      <div className="container">
        <div className={`stats-grid${visible ? ' visible' : ''}`}>
          {[
            { to: 22, suffix: '+',   label: 'Years of Experience' },
            { to: 85, prefix: '$', suffix: 'M+', label: 'Largest Single Transaction' },
            { to: 42, suffix: '+',   label: 'Clean Energy Projects' },
            { to: 20, suffix: '+',   label: 'Countries & Markets' },
          ].map((s, i) => (
            <div className={`stat-item delay-${i}`} key={i}>
              <div className="stat-num"><Counter to={s.to} suffix={s.suffix} prefix={s.prefix || ''} inView={visible} /></div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Founder() {
  const [ref, visible] = useInView();
  return (
    <section id="founder" className="section founder">
      <div className="container">
        <div className="section-tag">Our Founder</div>
        <div className={`founder-grid${visible ? ' visible' : ''}`} ref={ref}>
          <div className="founder-left">
            <div className="founder-photo"><span>GJ</span></div>
            <div className="founder-id">
              <strong>Ghazil Jabbar</strong>
              <span>Managing Director</span>
              <span>Capital Connect</span>
            </div>
            <div className="founder-edu">
              <div className="edu-item">
                <b>MBA</b>
                <span>Warwick Business School</span>
                <em>British Chevening Scholar</em>
              </div>
              <div className="edu-item">
                <b>MBA / BBA (Hons)</b>
                <span>Institute of Business Administration</span>
              </div>
            </div>
          </div>
          <div className="founder-right">
            <h2 className="section-title">Ghazil Jabbar</h2>
            <div className="founder-role">Business Lead with Regional PE &amp; Advisory Experience</div>
            <p>Ghazil Jabbar is an Investment Banker with over 22 years of experience in Investment Banking, Private Equity, and Strategic Planning. He established Capital Connect as a specialist M&amp;A advisory firm to deliver institutional-grade financial services to regional and international clients.</p>
            <p>He is currently the Deputy Chief of Party of Pakistan Private Sector Energy (PPSE), a USAID-funded project, where he originated and developed 42+ clean energy projects across Pakistan. He also established the Private Equity and Venture Capital Fund at Faysal Funds.</p>
            <p>Ghazil served as Pakistan coverage banker for JPMorgan and held senior investment banking roles at Capital Partners Group Pte. (Singapore), NIB Bank (Temasek), and Elixir Securities Pakistan. He has managed cross-border industry teams in M&amp;A, equity and debt capital markets across Pakistan and Asia Pacific — spanning consumer, renewable, oil &amp; gas, power, financial institutions, industrial, and logistics sectors.</p>
            <p>His privatization transaction experience is unparalleled, having advised on the majority of all significant privatization mandates in Pakistan. Certified under JPMorgan's specialized Investment Banking Training Programs in the USA and Hong Kong, he also holds certifications in AMT Training and ESG.</p>
            <div className="founder-tags">
              <span>JPMorgan</span><span>USAID / PPSE</span><span>Temasek</span>
              <span>Faysal Funds</span><span>Capital Partners Group (SG)</span><span>Elixir Securities</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PARTNERS = [
  { name: 'JPMorgan',               sub: 'Global Investment Bank' },
  { name: 'USAID / PPSE',           sub: 'Development Finance' },
  { name: 'Temasek',                sub: 'Sovereign Wealth Fund' },
  { name: 'Pakistan Stock Exchange',sub: 'Capital Markets' },
  { name: 'Faysal Funds',           sub: 'Asset Management' },
  { name: 'Shanghai Stock Exchange',sub: 'Equity Markets' },
  { name: 'Abraaj Group',           sub: 'Private Equity' },
  { name: 'Maybank',                sub: 'Banking & Finance' },
];

function Partners() {
  const [ref, visible] = useInView();
  return (
    <section id="partners" className="section section-light partners">
      <div className="container">
        <div className={`section-header${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag">Relationships</div>
          <h2 className="section-title">Partners &amp; Institutional Clients</h2>
          <p className="section-sub">Trusted by leading global institutions, sovereign wealth funds, and development finance organizations across Pakistan and Asia Pacific.</p>
        </div>
        <div className={`partners-grid${visible ? ' visible' : ''}`}>
          {PARTNERS.map((p, i) => (
            <div className={`partner-card delay-${i % 4}`} key={i}>
              <div className="partner-name">{p.name}</div>
              <div className="partner-sub">{p.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [ref, visible] = useInView();
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [sent, setSent] = useState(false);
  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = (e) => { e.preventDefault(); setSent(true); };
  return (
    <section id="contact" className="section section-dark contact">
      <div className="container">
        <div className={`section-header${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag light">Contact Us</div>
          <h2 className="section-title light">Let's Start a Conversation</h2>
          <p className="section-sub light">Whether you're exploring a transaction, seeking capital, or evaluating a strategic partnership — we want to hear from you.</p>
        </div>
        <div className={`contact-grid${visible ? ' visible' : ''}`}>
          <div className="contact-info">
            {[
              { label: 'Email',             val: 'ghazil.jabbar@capconnect.net', href: 'mailto:ghazil.jabbar@capconnect.net' },
              { label: 'Phone',             val: '+92 301 822 5534',             href: 'tel:+923018225534' },
              { label: 'Managing Director', val: 'Ghazil Jabbar',               href: null },
            ].map(({ label, val, href }) => (
              <div className="contact-item" key={label}>
                <div className="contact-dot" />
                <div>
                  <strong>{label}</strong>
                  {href ? <a href={href}>{val}</a> : <span>{val}</span>}
                </div>
              </div>
            ))}
          </div>
          <form className="contact-form" onSubmit={onSubmit}>
            {sent ? (
              <div className="form-success">
                <div className="form-check">✓</div>
                <h3>Message Received</h3>
                <p>Thank you for reaching out. We'll be in touch shortly.</p>
              </div>
            ) : (
              <>
                <div className="form-row">
                  <input name="name" placeholder="Full Name" value={form.name} onChange={onChange} required />
                  <input name="email" type="email" placeholder="Email Address" value={form.email} onChange={onChange} required />
                </div>
                <input name="company" placeholder="Company / Organisation" value={form.company} onChange={onChange} />
                <textarea name="message" placeholder="How can we help you?" rows={5} value={form.message} onChange={onChange} required />
                <button type="submit" className="btn-primary">Send Message</button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-cap">capital</span>
              <span className="logo-con">connect</span>
            </div>
            <p>Financial Advisory &amp; Investment Management</p>
            <p className="footer-sub">ghazil.jabbar@capconnect.net &middot; +92 301 822 5534</p>
          </div>
          <div>
            <strong>Navigate</strong>
            <ul>
              {[['About','about'],['Services','services'],['Founder','founder'],['Partners','partners'],['Contact','contact']].map(([l,id]) => (
                <li key={id}><button onClick={() => go(id)}>{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Services</strong>
            <ul>
              {['Mergers & Acquisitions','Private Equity','Capital Markets','Investment Management','Privatization Advisory'].map(s => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">&copy; {new Date().getFullYear()} Capital Connect. All rights reserved.</div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Stats />
      <Founder />
      <Partners />
      <Contact />
      <Footer />
    </>
  );
}
