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

const NAV = [
  ['About Us', 'about'],
  ['Financial Advisory', 'services'],
  ['Investment Management', 'fund'],
  ['Climate Core Pakistan', 'climate'],
  ['Founder', 'founder'],
  ['Contact', 'contact'],
];

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
        <button className="nav-logo" onClick={() => go('hero')} aria-label="Capital Connect home">
          <img className="nav-logo-img" src="/logo-white.png" alt="Capital Connect" />
        </button>
        <button className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
          <span /><span /><span />
        </button>
        <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
          {NAV.map(([l, id]) => (
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
          Connecting Capital<br />
          <em>With Opportunity</em>
        </h1>
        <p className="hero-sub">
          Capital Connect bridges ambitious businesses and institutions with global capital —
          pairing cross-border M&amp;A and capital-raising advisory with licensed fund-management
          platforms pioneering impact and blended-finance investment across Pakistan and Asia.
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
            <h2 className="section-title">Financial Advisory Meets Institutional Fund Management</h2>
            <p>Founded in 2017, Capital Connect is a boutique investment banking and financial advisory firm with deep roots in Pakistan's capital markets and a strong international network. Today the brand spans two complementary pillars — an advisory practice executing cross-border M&amp;A and capital raising, and a licensed fund-management platform investing in impact and climate-aligned opportunities.</p>
            <p>We specialise in structuring and executing complex cross-border transactions — advising governments, corporates, and funds across mergers &amp; acquisitions, equity and debt instruments, privatisation mandates, and strategic investment planning.</p>
            <p>Our client-first approach, combined with direct relationships with international DFIs, sovereign wealth funds, and institutional investors, makes Capital Connect the partner of choice for transformative financial mandates.</p>
            <p>Through Capital Connect Investment Management (Private) Limited — our SECP-regulated non-banking finance company — we designed and will manage Pakistan's pioneer low-carbon blended-finance private equity fund, Climate Core Pakistan (CCP). We established Climate Core GP Limited as an independent fund-management platform in the Abu Dhabi Global Market (ADGM), extending Capital Connect's reach to global investors and development finance institutions, and channelling international capital into impact and blended-finance strategies across developing markets.</p>
            <div className="about-pills">
              <span>Bulge Bracket Experience</span>
              <span>Licensed Fund Manager</span>
              <span>ESG Certified</span>
              <span>Cross-Border Specialists</span>
              <span>Pakistan-Focused</span>
            </div>
          </div>
          <div className="about-right">
            {[
              { tag: 'M&A', title: 'Mergers & Acquisitions', desc: 'End-to-end advisory on buy-side and sell-side mandates across minority, majority, and strategic stake transactions.' },
              { tag: 'PE',  title: 'Private Equity',          desc: 'Full private equity lifecycle management — from fund formation and deal sourcing to execution and exit.' },
              { tag: 'BF',  title: 'Blended Finance',         desc: 'Mobilising public and private capital through risk-sharing structures to finance climate, infrastructure, and development mandates across developing countries.' },
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

function ClimateFocus() {
  const [ref, visible] = useInView(0.25);
  return (
    <section className="section climate-focus">
      <div className="container">
        <div className={`climate-focus-inner${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag">Climate Focus</div>
          <p>
            Climate and impact anchor Capital Connect's strategy across both pillars — advisory and
            fund management. From advising on clean-energy and sustainable-infrastructure transactions
            to managing dedicated low-carbon funds, we mobilise capital toward the businesses driving
            the transition across Pakistan and the wider region.
          </p>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  { title: 'Mergers & Acquisitions',  desc: 'Strategic M&A advisory for sell-side, buy-side, and joint venture mandates across energy, financial institutions, consumer, and industrials.' },
  { title: 'Private Equity Advisory', desc: 'Comprehensive PE lifecycle support: fund structuring, deal origination, valuation, execution, and exit advisory for sponsors and portfolio companies.' },
  { title: 'Privatization Advisory',  desc: 'Unparalleled experience advising governments on strategic stake sales and investor targeting for state-owned enterprises.' },
  { title: 'Fund Raising',            desc: 'Direct access to international DFIs, sovereign wealth funds, and institutional investors to support capital raising for funds and sponsors.' },
  { title: 'Blended Finance',         desc: 'Design equity and debt blended-finance structures that combine technical assistance, guarantees, and concessional and grant capital to de-risk investment and mobilise private-sector capital.' },
];

function Services() {
  const [ref, visible] = useInView();
  return (
    <section id="services" className="section section-dark services">
      <div className="container">
        <div className={`section-header${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag light">Financial Advisory</div>
          <h2 className="section-title light">Comprehensive Advisory Solutions</h2>
          <p className="section-sub light">From cross-border M&A and capital raising to privatisation and blended-finance advisory, we deliver institutional-grade solutions at every stage of the capital lifecycle.</p>
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
  const items = [
    { to: 450, prefix: '$', suffix: 'M+', label: 'Clean Energy Pipeline Originated' },
    { to: 60,  suffix: '+',               label: 'Clean Energy Transactions Supported' },
    { to: 2,   suffix: '',                label: 'Sustainable Finance Platforms Established' },
  ];
  return (
    <section className="stats" ref={ref}>
      <div className="container">
        <div className={`stats-grid stats-grid-3${visible ? ' visible' : ''}`}>
          {items.map((s, i) => (
            <div className={`stat-item delay-${i}`} key={i}>
              <div className="stat-num">
                {s.text ? s.text : <Counter to={s.to} suffix={s.suffix} prefix={s.prefix || ''} inView={visible} />}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLATFORM_CARDS = [
  { title: 'Impact Funds',        desc: 'Pioneer fund manager focused on impact and climate-aligned investment in Pakistan.' },
  { title: 'Blended Finance',     desc: 'Risk-sharing structures — first-loss guarantees, concessional and junior capital — that de-risk private capital.' },
  { title: 'Governance & ESG',    desc: 'Institutional governance, SECP-regulated compliance, and a dedicated ESMS / ESG framework.' },
  { title: 'Shariah Structuring', desc: 'Capability to develop and structure funds in line with Shariah principles.' },
];

function FundManagement() {
  const [ref, visible] = useInView();
  return (
    <section id="fund" className="section section-light fund">
      <div className="container">
        <div className={`section-header${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag">Investment Management</div>
          <h2 className="section-title">Licensed Platforms for Impact &amp; Blended Finance</h2>
          <p className="section-sub">Capital Connect operates two licensed fund-management platforms dedicated to impact and blended-finance investment — Capital Connect Investment Management (Private) Limited (CCIM) in Pakistan and Climate Core GP Limited in the Abu Dhabi Global Market (ADGM).</p>
        </div>
        <div className={`fund-body${visible ? ' visible' : ''}`}>
          <div className="fund-intro">
            <div className="fund-intro-label">Pakistan Platform</div>
            <p>Capital Connect Investment Management (Private) Limited is a non-banking finance company established to become Pakistan's pioneer fund manager focused on impact funds and related initiatives, operating under the Private Fund Regulations, 2015.</p>
            <p>The platform is designed to launch multiple funds, beginning with anchor fund Climate Core Pakistan and extending to sector-agnostic, industry-specific, and alternative investment funds — including Shariah-compliant structures — each using blended-finance mechanisms to catalyse commercial capital into underserved markets.</p>
          </div>
          <div className="fund-callout">
            <div className="callout-label">International Platform</div>
            <p><strong>Climate Core GP Limited</strong> is a complementary fund-management platform established in the Abu Dhabi Global Market (ADGM), one of the region's leading international financial centres. Operating within ADGM's English common-law framework and internationally recognised regulatory regime, it extends Capital Connect's reach to global investors, development finance institutions, and sovereign capital — anchoring the group's cross-border structuring and enabling offshore vehicles that channel international capital into impact and blended-finance strategies.</p>
          </div>
        </div>
        <div className={`platform-grid${visible ? ' visible' : ''}`}>
          {PLATFORM_CARDS.map((c, i) => (
            <div className={`platform-card delay-${i}`} key={i}>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const CCP_TERMS = [
  ['Fund Size', 'US$50 million (~PKR 15 billion); PKR 8.5 billion first close'],
  ['Structure', 'Closed-ended private equity (impact) fund; Trust structure under Private Fund Regulations, 2015'],
  ['Fund Manager', 'Capital Connect Investment Management (Private) Limited'],
  ['First-Loss Guarantee', 'Up to 40%'],
  ['Fund Term', '10 years (+2 optional)'],
  ['Deal Size', 'PKR 500–1,500 million; 5–10 investments; growth capital'],
];

const CCP_SECTORS = ['Clean Energy', 'Clean Transport & EV', 'Technology & Energy Efficiency', 'Bio-Energy', 'Affordable Housing', 'Responsible Consumer'];

function ClimateCore() {
  const [ref, visible] = useInView();
  return (
    <section id="climate" className="section section-dark climate">
      <div className="container">
        <div className={`section-header${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag light">Climate Core Pakistan</div>
          <h2 className="section-title light">Pakistan's Pioneer De-Risked Low-Carbon Blended Fund</h2>
          <p className="section-sub light">Climate Core Pakistan (CCP) is Capital Connect Investment Management (Private) Limited's anchor fund — a PKR 15 billion low-carbon blended private equity fund catalysing a PKR 8.5 billion first close.</p>
        </div>
        <div className={`climate-body${visible ? ' visible' : ''}`}>
          <div className="climate-text">
            <p>Climate Core Pakistan mobilises private capital into underserved low-carbon markets through a landmark, de-risked financial structure. The fund provides growth and expansion equity to commercially viable clean-energy and climate-aligned businesses — bridging Pakistan's "missing middle" of impact and sustainability funding.</p>
            <p>Climate Core Pakistan is built on the learnings of a US$7 million, four-year USAID-funded technical-assistance programme (PFAN), inheriting an established, investor-ready pipeline of more than US$100 million in commercially viable low-carbon investments — managed by the original architects and originators of that pipeline.</p>
            <p>A tiered blended structure pairs commercial (senior) capital with concessional (junior) capital, while an up-to-40% first-loss guarantee shields capital from initial downside — enhancing risk-adjusted returns for commercial investors.</p>
          </div>
          <div className="climate-terms">
            <div className="terms-label">Key Terms</div>
            {CCP_TERMS.map(([k, v]) => (
              <div className="term-row" key={k}>
                <span className="term-k">{k}</span>
                <span className="term-v">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="climate-sectors">
          <div className="sectors-label">Target Sectors</div>
          <div className="sectors-tags">
            {CCP_SECTORS.map(s => <span key={s}>{s}</span>)}
          </div>
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
              <span>Managing Director, Capital Connect</span>
              <span>Founder &amp; Managing Partner, CCIM &amp; Climate Core GP</span>
            </div>
            <div className="founder-edu">
              <div className="edu-item">
                <b>MBA</b>
                <span>Warwick Business School</span>
                <em>British Chevening Scholar</em>
              </div>
            </div>
          </div>
          <div className="founder-right">
            <h2 className="section-title">Ghazil Jabbar</h2>
            <div className="founder-role">Business Lead with Regional Private Equity &amp; Advisory Experience</div>
            <p>Ghazil Jabbar is an Investment Banker with 25 years of experience in Investment Banking, Private Equity, and Strategic Planning. He established Capital Connect in 2017 as a specialist M&amp;A advisory firm to deliver institutional-grade financial services to regional and international clients. He leads Capital Connect in establishing the fund-management platforms in Pakistan and the United Arab Emirates.</p>
            <p>As a United Nations Industrial Development Organization (UNIDO) consultant, he led, as Deputy Chief of Party, the Pakistan Private Sector Energy (PPSE) project, a USAID-funded initiative, where he originated and developed a US$450 million+ clean-energy project pipeline across Pakistan. He also structured and established the Private Equity and Venture Capital Funds for an asset management company in Pakistan — Pakistan's first Shariah-compliant private equity platform.</p>
            <p>Ghazil served as Pakistan coverage banker for JPMorgan and held senior investment banking roles at Capital Partners Group Pte. (Singapore), NIB Bank (Temasek), and Elixir Securities Pakistan. He has managed cross-border industry teams in M&amp;A, equity and debt capital markets across Pakistan and Asia Pacific — spanning consumer, renewable, oil &amp; gas, power, financial institutions, industrial, and logistics sectors.</p>
            <p>His privatisation transaction experience is unparalleled, having advised several noteworthy privatisation mandates in Pakistan. Certified under JPMorgan's specialised Investment Banking Training Programs in the USA and Hong Kong, he also holds certifications from AMT Training and the Corporate Finance Institute in ESG.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Web3Forms access key — get a free one at https://web3forms.com (tied to the
// inbox that should receive submissions). Replace the placeholder below.
const WEB3FORMS_KEY = '99ab0e66-badb-4e01-85e7-28f01af72a13';

function Contact() {
  const [ref, visible] = useInView();
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: 'New enquiry from the Capital Connect website',
          from_name: 'Capital Connect Website',
          name: form.name,
          email: form.email,
          company: form.company || 'Not provided',
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data.success) { setSent(true); setStatus('idle'); }
      else { setStatus('error'); }
    } catch {
      setStatus('error');
    }
  };
  return (
    <section id="contact" className="section section-dark contact">
      <div className="container">
        <div className={`section-header${visible ? ' visible' : ''}`} ref={ref}>
          <div className="section-tag light">Contact Us</div>
          <h2 className="section-title light">Connect With Us</h2>
          <p className="section-sub light">Whether you're exploring a transaction, seeking capital, structuring a fund, or evaluating a strategic partnership — we want to hear from you.</p>
        </div>
        <div className={`contact-grid${visible ? ' visible' : ''}`}>
          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-dot" />
              <div>
                <strong>Email</strong>
                <a href="mailto:info@capconnect.net">info@capconnect.net</a>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-dot" />
              <div>
                <strong>Advisory Services</strong>
                <span>Capital Connect (Pakistan)</span>
                <span>Capital Connect LLC-FZ (U.A.E.)</span>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-dot" />
              <div>
                <strong>Investment Management</strong>
                <span>Capital Connect Investment Management (Private) Limited (Pakistan)</span>
                <span>Climate Core GP Limited (ADGM, U.A.E.)</span>
              </div>
            </div>
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
                <button type="submit" className="btn-primary" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send Message'}
                </button>
                {status === 'error' && (
                  <p className="form-error">Something went wrong. Please try again, or email us directly at info@capconnect.net.</p>
                )}
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
              <img className="footer-logo-img" src="/logo-white.png" alt="Capital Connect" />
            </div>
            <p>Financial Advisory &amp; Investment Management</p>
            <p className="footer-sub">info@capconnect.net</p>
          </div>
          <div>
            <strong>Navigate</strong>
            <ul>
              {NAV.map(([l, id]) => (
                <li key={id}><button onClick={() => go(id)}>{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Services</strong>
            <ul>
              {['Mergers & Acquisitions','Private Equity','Blended Finance','Privatization Advisory','Fund Raising'].map(s => (
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
      <ClimateFocus />
      <Stats />
      <Services />
      <FundManagement />
      <ClimateCore />
      <Founder />
      <Contact />
      <Footer />
    </>
  );
}
