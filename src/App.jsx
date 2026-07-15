import { useEffect, useRef, useState } from 'react';
import Bottle3D from './Bottle3D.jsx';
import './App.css';

// Contact form submissions are emailed via Web3Forms (free, no backend).
// The access key is tied to the freshleaf.essentials@gmail.com inbox.
const WEB3FORMS_KEY = '38b54a42-86c4-40f9-b8ee-8b5f61b14862';

const CONTACT = {
  phone: '0329-0985503',
  email: 'freshleaf.essentials@gmail.com',
};

// Set `price` (e.g. 'Rs. 1,200') once prices are decided; until then the
// cards show "price on request" and the order form lists names only.
const PRODUCTS = [
  {
    id: 'citrus-fresh',
    name: 'Citrus Fresh',
    tagline: 'Essential oils of orange, lemon, peppermint & bergamot',
    price: null,
    image: '/products/citrus-fresh.webp',
  },
  {
    id: 'morning-zest',
    name: 'Morning Zest',
    tagline: 'Essential oils of eucalyptus, lemon & peppermint',
    price: null,
    image: '/products/morning-zest.webp',
  },
  {
    id: 'spiced-orange',
    name: 'Spiced Orange',
    tagline: 'Essential oils of clove, ginger, orange & cinnamon',
    price: null,
    image: '/products/spiced-orange.webp',
  },
  {
    id: 'floral-fantasy',
    name: 'Floral Fantasy',
    tagline: 'Essential oils of ylang ylang, rose, jasmine & geranium',
    price: null,
    image: '/products/floral-fantasy.webp',
  },
  {
    id: 'pure',
    name: 'Pure',
    tagline: 'Essential oils of tea tree, eucalyptus, peppermint & lemon',
    price: null,
    image: '/products/pure.webp',
  },
];

/* ---------- animation helpers ---------- */

function useInView(threshold = 0.15, eager = false) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (eager || !('IntersectionObserver' in window)) {
      // Above-the-fold content (and old browsers) must never wait on an
      // observer callback — a busy main thread can starve those.
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, eager]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '', eager = false }) {
  const [ref, visible] = useInView(0.15, eager);
  return (
    <div
      ref={ref}
      className={`reveal${visible ? ' visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// 3D tilt that follows the cursor; resets on leave, inert on touch devices.
function TiltCard({ children, className = '', pop = false }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${py * -10}deg) translateZ(6px)`;
  }

  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = '';
  }

  return (
    <div
      ref={ref}
      className={`tilt${pop ? ' tilt-pop' : ''} ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}

function Leaf() {
  return (
    <svg className="leaf-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M26 4C14 4 5 12 5 24c0 1.7.3 3.1.7 4C7 21 12 14 21 10c-7 5-11.5 12-13 17.5 1.2.4 2.6.5 4 .5C24 28 28 15 26 4z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---------- sections ---------- */

function Hero() {
  const ref = useRef(null);

  // Mouse parallax: layers read --mx/--my and drift at different depths.
  function onMove(e) {
    const el = ref.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5));
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5));
  }

  return (
    <section className="hero" ref={ref} onMouseMove={onMove}>
      <div className="orb orb-a" aria-hidden="true" />
      <div className="orb orb-b" aria-hidden="true" />
      <div className="orb orb-c" aria-hidden="true" />
      <div className="float-leaf fl-1" aria-hidden="true"><Leaf /></div>
      <div className="float-leaf fl-2" aria-hidden="true"><Leaf /></div>
      <div className="float-leaf fl-3" aria-hidden="true"><Leaf /></div>
      <div className="float-leaf fl-4" aria-hidden="true"><Leaf /></div>

      <div className="hero-grid">
        <div className="hero-content">
          <Reveal eager>
            <p className="eyebrow">Premium Home Fragrance</p>
          </Reveal>
          <Reveal eager delay={120}>
            <h1>
              Spaces that feel fresh,
              <br />
              <em>naturally.</em>
            </h1>
          </Reveal>
          <Reveal eager delay={240}>
            <p className="hero-sub">
              Room sprays and car fresheners crafted with pure essential oils — no harsh
              chemicals, just nature's finest scents.
            </p>
          </Reveal>
          <Reveal eager delay={360}>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#order">Order Now</a>
              <a className="btn btn-outline" href="#about">Our Story</a>
            </div>
          </Reveal>
          <Reveal eager delay={520}>
            <p className="hero-tagline">Naturally crafted. Beautifully scented. Thoughtfully made.</p>
          </Reveal>
        </div>
        <Reveal eager delay={300} className="hero-visual">
          <Bottle3D />
          <p className="drag-hint">Drag the bottle to spin it</p>
        </Reveal>
      </div>
      <div className="hero-scroll" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: 'Pure Essential Oils',
    text: "Nature's finest scents, thoughtfully blended",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c4 5 7 8.6 7 12.5A7 7 0 0 1 5 14.5C5 10.6 8 7 12 2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Handcrafted with Care',
    text: 'Small batches, careful formulation, elegant design',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s-7-4.6-9.3-8.7C1 9.1 2.6 5.7 6 5.3c2-.2 3.6.8 4.6 2.3.5.8 1.4.8 1.9 0 1-1.5 2.6-2.5 4.6-2.3 3.4.4 5 3.8 3.3 7C19 16.4 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Home · Car · Workspace',
    text: 'One fresh feeling for every space you love',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Cash on Delivery',
    text: 'Order today, pay in cash at your door',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 7h13v10H2zM15 10h4l3 3v4h-7zM6.5 19.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zm11 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function Features() {
  return (
    <section className="features" aria-label="Why FreshLeaf">
      <div className="features-inner">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 120}>
            <div className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="section about">
      <div className="about-glow" aria-hidden="true" />
      <Reveal>
        <p className="eyebrow">About Us</p>
        <h2>Introduction</h2>
      </Reveal>
      <Reveal delay={100}>
        <div className="prose card-glass">
          <p>Imagine walking into a space that instantly feels fresh, peaceful, and inviting.</p>
          <p>
            That's the experience FreshLeaf was created to deliver. We craft premium home
            fragrance products using pure essential oils, blending nature's finest scents
            into elegant products that elevate your surroundings. Whether it's your home,
            your car, or your workspace, FreshLeaf transforms ordinary spaces into places
            you'll love to be.
          </p>
          <p className="tagline-line">Naturally crafted. Beautifully scented. Thoughtfully made.</p>
        </div>
      </Reveal>

      <Reveal>
        <h2 className="story-heading">Our Story</h2>
      </Reveal>
      <Reveal delay={100}>
        <div className="prose">
          <p>Every great journey begins with a simple question.</p>
          <p>
            For us, it was: <em>Why should creating a beautifully scented home mean filling
            it with harsh chemicals?</em>
          </p>
          <p>
            We loved the feeling of walking into a fresh, inviting space, but we couldn't
            find home fragrance products that combined elegant scents with ingredients we
            felt good about using every day. Too often, they relied on overpowering
            synthetic fragrances and alcohol, that didn't reflect the natural, calming
            atmosphere we wanted to create.
          </p>
          <p>That question became the inspiration behind FreshLeaf.</p>
          <p>
            FreshLeaf was founded with a simple purpose—to bring nature-inspired fragrances
            into everyday spaces through thoughtfully handcrafted products. Every room
            spray, car freshener, and home fragrance is created with care, using carefully
            selected essential oils and quality ingredients to deliver scents that are
            refreshing, comforting, and memorable.
          </p>
          <p>
            We believe fragrance is more than just a pleasant aroma. It has the power to
            brighten your mood, create a sense of calm, welcome guests, and turn ordinary
            moments into meaningful experiences. Whether you're starting your morning with
            an uplifting citrus blend, unwinding after a long day, or adding a touch of
            freshness to your car or workspace, FreshLeaf is designed to become part of
            those everyday rituals.
          </p>
          <p>
            Our commitment goes beyond creating beautiful fragrances. We are passionate
            about craftsmanship, quality, and creating products that are as elegant as they
            are enjoyable to use. Every bottle reflects our dedication to thoughtful
            design, careful formulation, and attention to detail.
          </p>
          <p>
            As FreshLeaf continues to grow, our mission remains unchanged: to help people
            create spaces that feel fresh, peaceful, and welcoming—naturally.
          </p>
          <p>
            Thank you for being part of our story. We invite you to discover the fragrances
            that make every space feel a little more like home.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function ProductImage({ product }) {
  if (product.image) {
    return <img className="product-img" src={product.image} alt={product.name} />;
  }
  return (
    <div className="product-img placeholder" role="img" aria-label={`${product.name} photo coming soon`}>
      <Leaf />
      <span>Product photo coming soon</span>
    </div>
  );
}

function Products() {
  return (
    <section id="products" className="section-wide products">
      <div className="products-inner">
        <Reveal>
          <p className="eyebrow">Our Sprays</p>
          <h2>See the product before you buy</h2>
          <p className="section-sub">Room &amp; linen sprays, 250&nbsp;ml, made with 100% essential oils.</p>
        </Reveal>
        <div className="product-grid">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.id} delay={i * 120}>
              <TiltCard className="product-card" pop>
                <ProductImage product={p} />
                <h3>{p.name}</h3>
                <p>{p.tagline}</p>
                <div className="product-foot">
                  <span className="price">{p.price ?? '250 ml'}</span>
                  <a className="btn btn-small" href="#order">Order</a>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function OrderForm() {
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [placed, setPlaced] = useState(null); // { name, phone } after success

  async function handleSubmit(e) {
    e.preventDefault();
    const formEl = e.target;
    const data = new FormData(formEl);
    const product = PRODUCTS.find((p) => p.id === data.get('product'));
    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `New FreshLeaf Order — ${data.get('name')}`,
          from_name: 'FreshLeaf Website',
          replyto: data.get('email') || undefined,
          'Order type': 'Cash on Delivery',
          Product: product ? `${product.name}${product.price ? ` (${product.price})` : ''}` : data.get('product'),
          Quantity: data.get('quantity'),
          'Customer name': data.get('name'),
          Phone: data.get('phone'),
          Email: data.get('email') || 'Not provided',
          'Delivery address': data.get('address'),
          Notes: data.get('notes') || 'None',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setPlaced({ name: data.get('name'), phone: data.get('phone') });
        setStatus('idle');
        formEl.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (placed) {
    return (
      <div className="order-thanks">
        <Leaf />
        <h3>Order received — thank you!</h3>
        <p>
          Your order has been sent to us. We'll call you at {placed.phone} to confirm
          your order and delivery, and you'll pay in cash when it arrives.
        </p>
        <button className="btn btn-outline" onClick={() => setPlaced(null)}>
          Place another order
        </button>
      </div>
    );
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Product
          <select name="product" required defaultValue={PRODUCTS[0].id}>
            {PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.price ? ` — ${p.price}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input type="number" name="quantity" min="1" max="50" defaultValue="1" required />
        </label>
      </div>

      <div className="form-row">
        <label>
          Full name
          <input type="text" name="name" placeholder="Your name" required />
        </label>
        <label>
          Phone number
          <input type="tel" name="phone" placeholder="03xx-xxxxxxx" required />
        </label>
      </div>

      <label>
        Email (optional)
        <input type="email" name="email" placeholder="you@example.com" />
      </label>

      <label>
        Delivery address
        <textarea name="address" rows="3" placeholder="House, street, area, city" required />
      </label>

      <label>
        Notes (optional)
        <textarea name="notes" rows="2" placeholder="Preferred scent, delivery instructions…" />
      </label>

      <div className="cod-note">
        <div>
          <strong>Payment: Cash on Delivery</strong>
          <span>
            Pay in cash when your order arrives at your door. Online card payment is
            coming soon.
          </span>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Placing order…' : 'Place Order'}
      </button>
      {status === 'error' && (
        <p className="form-error dark-on-light">
          Something went wrong sending your order. Please try again, or order directly by
          calling {CONTACT.phone}.
        </p>
      )}
      <p className="form-note">
        Your order is sent to us instantly — we'll call you to confirm. You can also
        order directly by calling {CONTACT.phone}.
      </p>
    </form>
  );
}

function OrderSection() {
  return (
    <section id="order" className="section order">
      <Reveal>
        <p className="eyebrow">Place an Order</p>
        <h2>Order your sprays</h2>
        <p className="section-sub">
          Fill in your details below and we'll deliver to your door — pay in cash when
          your order arrives.
        </p>
      </Reveal>
      <Reveal delay={150}>
        <OrderForm />
      </Reveal>
    </section>
  );
}

function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | error

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: 'New message from the FreshLeaf website',
          from_name: 'FreshLeaf Website',
          name: form.name,
          email: form.email,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="contact" className="section-dark contact">
      <div className="contact-orb" aria-hidden="true" />
      <div className="contact-inner">
        <Reveal>
          <div className="contact-head">
            <p className="eyebrow light">Contact Us</p>
            <h2>We'd love to hear from you</h2>
            <p className="contact-sub">
              Questions about our fragrances, your order, or anything else — send us a
              message and we'll get back to you shortly.
            </p>
          </div>
        </Reveal>
        <div className="contact-grid">
          <Reveal delay={100}>
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-dot" />
                <div>
                  <strong>Call or WhatsApp</strong>
                  <a href={`tel:+92${CONTACT.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`}>
                    {CONTACT.phone}
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-dot" />
                <div>
                  <strong>Email</strong>
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-dot" />
                <div>
                  <strong>Orders</strong>
                  <span>Cash on delivery — pay when your order arrives</span>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={220}>
            <form className="contact-form" onSubmit={onSubmit}>
              {sent ? (
                <div className="form-success">
                  <div className="form-check">✓</div>
                  <h3>Message Received</h3>
                  <p>Thank you for reaching out. We'll be in touch shortly.</p>
                </div>
              ) : (
                <>
                  <input
                    name="name"
                    placeholder="Full Name"
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                  <textarea
                    name="message"
                    placeholder="How can we help you?"
                    rows={5}
                    value={form.message}
                    onChange={onChange}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Send Message'}
                  </button>
                  {status === 'error' && (
                    <p className="form-error">
                      Something went wrong. Please try again, or email us directly at {CONTACT.email}.
                    </p>
                  )}
                </>
              )}
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    ['#about', 'About Us'],
    ['#products', 'Our Sprays'],
    ['#order', 'Order'],
    ['#contact', 'Contact'],
  ];

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <a className="brand" href="#top">
          <Leaf />
          <span>freshleaf</span>
        </a>
        <button
          className="menu-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          ☰
        </button>
        <nav className={menuOpen ? 'open' : ''}>
          {navLinks.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <a className="btn btn-small" href="#order" onClick={() => setMenuOpen(false)}>
            Order Now
          </a>
        </nav>
      </header>

      <main id="top">
        <Hero />
        <Features />
        <About />
        <Products />
        <OrderSection />
        <ContactSection />
      </main>

      <footer className="site-footer">
        <img className="footer-logo" src="/logo.jpg" alt="freshleaf" />
        <p>Naturally crafted. Beautifully scented. Thoughtfully made.</p>
        <p className="fine">© {new Date().getFullYear()} FreshLeaf. All rights reserved.</p>
      </footer>
    </>
  );
}
