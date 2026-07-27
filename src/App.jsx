import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Bottle3D from './Bottle3D.jsx';
import './App.css';

// Contact form submissions are emailed via Web3Forms (free, no backend).
// The access key is tied to the freshleaf.essentials@gmail.com inbox.
const WEB3FORMS_KEY = '38b54a42-86c4-40f9-b8ee-8b5f61b14862';

const CONTACT = {
  phone: '0329-0985503',
  email: 'freshleaf.essentials@gmail.com',
};

// WhatsApp uses the business number in international format (drop the leading 0).
const WHATSAPP = '923290985503';
const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Bank-transfer payment details shown at checkout.
const BANK = {
  bank: 'Meezan Bank',
  title: 'NIDA ABBASI',
  account: '99190103724123',
  iban: 'PK42MEZN0099190103724123',
  branch: 'Nursery Branch — Karachi',
};

// Product photos and logo are served from the repo (public on GitHub),
// pinned to the commit that contains them.
const IMG = 'https://raw.githubusercontent.com/ajabbar12765-hash/Claude/ad3c4a2f2e296f202b291dd55a756a9b44456691/public';

const PRODUCTS = [
  {
    id: 'citrus-fresh',
    name: 'Citrus Fresh',
    tagline: 'A zesty blend of orange, lemon, bergamot, and peppermint that refreshes your space with a clean, energizing burst.',
    prices: { '250ml': 2800, '100ml': 1240 },
    image: `${IMG}/products/citrus-fresh.webp`,
    bestSeller: true,
  },
  {
    id: 'morning-zest',
    name: 'Morning Zest',
    tagline: 'A crisp, revitalizing mix of peppermint, eucalyptus, and lemon to awaken your senses.',
    prices: { '250ml': 2700, '100ml': 1200 },
    image: `${IMG}/products/morning-zest.webp`,
  },
  {
    id: 'fresh-linen',
    name: 'Fresh Linen',
    tagline: 'A soft, airy blend of lavender, bergamot, eucalyptus, and a hint of orange—like fresh laundry on a breezy day.',
    prices: { '250ml': 3300, '100ml': 1440 },
    image: `${IMG}/products/fresh-linen.webp`,
    bestSeller: true,
  },
  {
    id: 'spiced-orange',
    name: 'Spiced Orange',
    tagline: 'A vibrant blend of orange, clove, cinnamon, and ginger—zesty and warm, with a fresh, festive spark.',
    prices: { '250ml': 3500, '100ml': 1520 },
    image: `${IMG}/products/spiced-orange.webp`,
  },
  {
    id: 'floral-fantasy',
    name: 'Floral Fantasy',
    tagline: 'A lush bouquet of ylang ylang, geranium, rose, and jasmine—soft, romantic, and mood-lifting.',
    prices: { '250ml': 3150, '100ml': 1380 },
    image: `${IMG}/products/floral-fantasy.webp`,
  },
  {
    id: 'pure',
    name: 'Pure',
    tagline: 'A clean, clarifying blend of tea tree, lemon, peppermint, and eucalyptus for a fresh, purifying feel.',
    prices: { '250ml': 2650, '100ml': 1180 },
    image: `${IMG}/products/pure.webp`,
  },
];

const rs = (n) => `Rs. ${n.toLocaleString('en-PK')}`;

const SIZES = ['250ml', '100ml'];
const sizeLabel = (s) => (s === '250ml' ? '250 ml' : '100 ml');

/* ---------- cart ---------- */

const CartContext = createContext(null);
const useCart = () => useContext(CartContext);

// A cart line is { id, size, qty }. Lines are keyed by id + size so the same
// scent in two sizes is two separate lines.
function isValidLine(l) {
  return (
    l &&
    PRODUCTS.some((p) => p.id === l.id) &&
    SIZES.includes(l.size) &&
    Number.isFinite(l.qty) &&
    l.qty > 0
  );
}

function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('freshleaf-cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isValidLine) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('freshleaf-cart', JSON.stringify(items));
    } catch {
      /* storage unavailable — cart just won't persist */
    }
  }, [items]);

  function addItem(id, size, qty = 1) {
    setItems((cur) => {
      const i = cur.findIndex((it) => it.id === id && it.size === size);
      if (i >= 0) {
        const next = [...cur];
        next[i] = { ...next[i], qty: Math.min(50, next[i].qty + qty) };
        return next;
      }
      return [...cur, { id, size, qty: Math.min(50, qty) }];
    });
  }

  function setQty(id, size, qty) {
    setItems((cur) =>
      cur
        .map((it) => (it.id === id && it.size === size ? { ...it, qty } : it))
        .filter((it) => it.qty > 0)
    );
  }

  function removeItem(id, size) {
    setItems((cur) => cur.filter((it) => !(it.id === id && it.size === size)));
  }

  function clear() {
    setItems([]);
  }

  const count = items.reduce((n, it) => n + it.qty, 0);
  const total = items.reduce((sum, it) => {
    const p = PRODUCTS.find((x) => x.id === it.id);
    return sum + (p ? p.prices[it.size] * it.qty : 0);
  }, 0);

  return (
    <CartContext.Provider value={{ items, addItem, setQty, removeItem, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

/* ---------- tiny router ---------- */

const NavContext = createContext(() => {});

function Link({ to, className = '', children, onClick }) {
  const navigate = useContext(NavContext);
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/* ---------- animation helpers ---------- */

function useInView(threshold = 0.15, eager = false) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (eager || !('IntersectionObserver' in window)) {
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

/* ---------- shared pieces ---------- */

function ProductCard({ p, delay = 0 }) {
  const { addItem } = useCart();
  const [size, setSize] = useState('250ml');
  const [added, setAdded] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function add() {
    addItem(p.id, size);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Reveal delay={delay}>
      <TiltCard className="product-card" pop>
        {p.bestSeller && <span className="card-badge">★ Best Seller</span>}
        <img className="product-img" src={p.image} alt={p.name} loading="lazy" />
        <h3>{p.name}</h3>
        <p>{p.tagline}</p>
        <div className="size-toggle" role="group" aria-label={`Choose size for ${p.name}`}>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={size === s ? 'active' : ''}
              aria-pressed={size === s}
              onClick={() => setSize(s)}
            >
              <span>{sizeLabel(s)}</span>
              <strong>{rs(p.prices[s])}</strong>
            </button>
          ))}
        </div>
        <div className="product-foot">
          <button className={`btn btn-small${added ? ' added' : ''}`} onClick={add}>
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>
      </TiltCard>
    </Reveal>
  );
}

/* ---------- pages ---------- */

function HomePage() {
  const heroRef = useRef(null);

  function onMove(e) {
    const el = heroRef.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5));
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5));
  }

  const features = [
    {
      title: 'Pure Essential Oils',
      text: '100% essential oils, no chemicals',
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

  return (
    <>
      <section className="hero" ref={heroRef} onMouseMove={onMove}>
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
                Room and linen sprays crafted with 100% essential oils — no harsh
                chemicals, just nature's finest scents.
              </p>
            </Reveal>
            <Reveal eager delay={360}>
              <div className="hero-actions">
                <Link className="btn btn-primary" to="/order">Order Now</Link>
                <Link className="btn btn-outline" to="/about">Our Story</Link>
              </div>
            </Reveal>
            <Reveal eager delay={520}>
              <p className="hero-tagline">Naturally crafted. Beautifully scented. Thoughtfully made.</p>
            </Reveal>
          </div>
          <Reveal eager delay={300} className="hero-visual">
            <div className="bottle-wrap">
              <span className="bestseller-badge">★ Best Seller</span>
              <Bottle3D />
            </div>
            <p className="bottle-caption">Citrus&nbsp;Fresh — our best-selling spray</p>
            <p className="drag-hint">Drag the bottle to spin it</p>
          </Reveal>
        </div>
        <div className="hero-scroll" aria-hidden="true">
          <span />
        </div>
      </section>

      <section className="features" aria-label="Why FreshLeaf">
        <div className="features-inner">
          {features.map((f, i) => (
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

    </>
  );
}

function AboutPage() {
  return (
    <section className="section about page-top">
      <div className="about-glow" aria-hidden="true" />
      <Reveal eager>
        <p className="eyebrow">About Us</p>
        <h2>Introduction</h2>
      </Reveal>
      <Reveal eager delay={120}>
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

function CheckoutForm({ onBrowse }) {
  const { items, setQty, removeItem, clear, total } = useCart();
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [placed, setPlaced] = useState(null); // { phone, method, total } after success
  const methodRef = useRef('cod'); // set by whichever payment button is clicked

  // Resolve cart lines against the product list (names, prices).
  const lines = items
    .map((it) => {
      const p = PRODUCTS.find((x) => x.id === it.id);
      if (!p) return null;
      return { ...it, name: p.name, unit: p.prices[it.size], lineTotal: p.prices[it.size] * it.qty };
    })
    .filter(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    if (lines.length === 0) return;
    const method = methodRef.current;
    const paymentLabel = method === 'bank' ? 'Bank Transfer' : 'Cash on Delivery';
    const data = new FormData(e.target);
    setStatus('sending');
    const summary = lines
      .map((l) => `${l.qty} × ${l.name} (${sizeLabel(l.size)}) — ${rs(l.lineTotal)}`)
      .join('\n');
    const itemCount = lines.reduce((n, l) => n + l.qty, 0);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `New FreshLeaf Order (${paymentLabel}) — ${data.get('name')} (${rs(total)})`,
          from_name: 'FreshLeaf Website',
          replyto: data.get('email') || undefined,
          'Payment method': paymentLabel,
          Order: summary,
          Items: String(itemCount),
          Total: rs(total),
          'Customer name': data.get('name'),
          Phone: data.get('phone'),
          Email: data.get('email') || 'Not provided',
          'Delivery address': data.get('address'),
          Notes: data.get('notes') || 'None',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setPlaced({ phone: data.get('phone'), method, total });
        clear();
        setStatus('idle');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (placed) {
    if (placed.method === 'bank') {
      return (
        <div className="order-thanks">
          <Leaf />
          <h3>Order received — please complete your bank transfer</h3>
          <p>
            Thank you! To finish your order, transfer <strong>{rs(placed.total)}</strong> to
            the account below, then send us your payment screenshot on WhatsApp or email.
            We'll confirm and dispatch once payment is received.
          </p>
          <div className="bank-box">
            <div><span>Bank</span><strong>{BANK.bank}</strong></div>
            <div><span>Account title</span><strong>{BANK.title}</strong></div>
            <div><span>Account number</span><strong>{BANK.account}</strong></div>
            <div><span>IBAN</span><strong>{BANK.iban}</strong></div>
            <div><span>Branch</span><strong>{BANK.branch}</strong></div>
          </div>
          <div className="thanks-actions">
            <a
              className="footer-btn wa"
              href={waLink(`Hi FreshLeaf! I've placed an order for ${rs(placed.total)} and I'm sending my bank transfer receipt.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send receipt on WhatsApp
            </a>
            <button className="btn btn-outline" onClick={() => setPlaced(null)}>
              Place another order
            </button>
          </div>
        </div>
      );
    }
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

  if (lines.length === 0) {
    return (
      <div className="order-thanks cart-empty">
        <Leaf />
        <h3>Your cart is empty</h3>
        <p>Pick the sprays and sizes you'd like above, then come back here to check out.</p>
        <button className="btn btn-outline" onClick={onBrowse}>Browse the sprays</button>
      </div>
    );
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="cart-lines">
        {lines.map((l) => (
          <div className="cart-line" key={`${l.id}-${l.size}`}>
            <div className="cart-line-main">
              <strong>{l.name}</strong>
              <span>{sizeLabel(l.size)} · {rs(l.unit)} each</span>
            </div>
            <div className="qty-stepper" aria-label={`Quantity of ${l.name}`}>
              <button
                type="button"
                onClick={() => setQty(l.id, l.size, Math.max(1, l.qty - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span>{l.qty}</span>
              <button
                type="button"
                onClick={() => setQty(l.id, l.size, Math.min(50, l.qty + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <div className="cart-line-total">{rs(l.lineTotal)}</div>
            <button
              type="button"
              className="cart-remove"
              onClick={() => removeItem(l.id, l.size)}
              aria-label={`Remove ${l.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="cart-subtotal">
        <span>Subtotal ({lines.reduce((n, l) => n + l.qty, 0)} item{lines.reduce((n, l) => n + l.qty, 0) === 1 ? '' : 's'})</span>
        <strong>{rs(total)}</strong>
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
        <textarea name="notes" rows="2" placeholder="Delivery instructions…" />
      </label>

      <div className="pay-section">
        <h3 className="pay-title">Payment</h3>
        <p className="pay-sub">Choose how you'd like to pay — your total is {rs(total)}.</p>
        <div className="pay-methods">
          <button
            type="submit"
            className="pay-btn"
            onClick={() => { methodRef.current = 'cod'; }}
            disabled={status === 'sending'}
          >
            <span className="pay-btn-title">Cash on Delivery</span>
            <span className="pay-btn-sub">Pay in cash when your order arrives</span>
          </button>
          <button
            type="submit"
            className="pay-btn"
            onClick={() => { methodRef.current = 'bank'; }}
            disabled={status === 'sending'}
          >
            <span className="pay-btn-title">Bank Transfer</span>
            <span className="pay-btn-sub">Pay now by bank transfer (Meezan)</span>
          </button>
        </div>
        {status === 'sending' && <p className="form-note">Placing your order…</p>}
        {status === 'error' && (
          <p className="form-error dark-on-light">
            Something went wrong sending your order. Please try again, or order directly by
            calling {CONTACT.phone}.
          </p>
        )}
        <p className="form-note">
          Your order is sent to us instantly — we'll confirm by phone. You can also order
          directly by calling {CONTACT.phone}.
        </p>
      </div>
    </form>
  );
}

function SpraysPage() {
  const topRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    // Deep links to /order (e.g. the header cart button) jump to checkout.
    if (window.location.pathname === '/order' && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <section className="section-wide page-top" ref={topRef}>
        <div className="products-inner">
          <Reveal eager>
            <p className="eyebrow">Our Sprays</p>
            <h2>Add your favourites to the cart</h2>
            <p className="section-sub">Room &amp; linen sprays in 250&nbsp;ml and 100&nbsp;ml, made with 100% essential oils and no chemicals. Pick a size, add as many scents as you like, then check out below.</p>
          </Reveal>
          <div className="product-grid">
            {PRODUCTS.map((p, i) => (
              <ProductCard key={p.id} p={p} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" ref={formRef}>
        <Reveal eager>
          <p className="eyebrow">Your Cart</p>
          <h2>Review &amp; check out</h2>
          <p className="section-sub">
            Adjust quantities, then enter your details — we'll deliver to your door and
            you pay in cash when your order arrives.
          </p>
        </Reveal>
        <Reveal eager delay={150}>
          <CheckoutForm onBrowse={scrollToTop} />
        </Reveal>
      </section>
    </>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState('idle');

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
    <section className="section-dark contact page-top page-fill">
      <div className="contact-orb" aria-hidden="true" />
      <div className="contact-inner">
        <Reveal eager>
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
          <Reveal eager delay={100}>
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
          <Reveal eager delay={220}>
            <form className="contact-form" onSubmit={onSubmit}>
              {sent ? (
                <div className="form-success">
                  <div className="form-check">✓</div>
                  <h3>Message Received</h3>
                  <p>Thank you for reaching out. We'll be in touch shortly.</p>
                </div>
              ) : (
                <>
                  <input name="name" placeholder="Full Name" value={form.name} onChange={onChange} required />
                  <input name="email" type="email" placeholder="Email Address" value={form.email} onChange={onChange} required />
                  <textarea name="message" placeholder="How can we help you?" rows={5} value={form.message} onChange={onChange} required />
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

/* ---------- app shell ---------- */

const NAV = [
  ['/', 'Home'],
  ['/about', 'About Us'],
  ['/products', 'Our Sprays'],
  ['/contact', 'Contact'],
];

const PAGES = {
  '/': HomePage,
  '/about': AboutPage,
  '/products': SpraysPage,
  '/order': SpraysPage,
  '/contact': ContactPage,
};

function CartButton({ onClick }) {
  const { count } = useCart();
  return (
    <Link to="/order" className="cart-btn" onClick={onClick} aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 5h2l1.6 10.2a1.5 1.5 0 0 0 1.5 1.3h7.6a1.5 1.5 0 0 0 1.5-1.2L20.5 8H7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20" r="1.4" fill="currentColor" />
        <circle cx="17" cy="20" r="1.4" fill="currentColor" />
      </svg>
      {count > 0 && <span className="cart-badge">{count}</span>}
    </Link>
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function navigate(to) {
    window.history.pushState({}, '', to);
    setPath(to.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const Page = PAGES[path] || HomePage;

  return (
    <NavContext.Provider value={navigate}>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <img src={`${IMG}/logo-transparent.webp`} alt="freshleaf" className="brand-logo" />
        </Link>
        <div className="header-tools">
          <CartButton onClick={() => setMenuOpen(false)} />
          <button
            className="menu-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ☰
          </button>
        </div>
        <nav className={menuOpen ? 'open' : ''}>
          {NAV.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className={path === to ? 'nav-active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link className="btn btn-small" to="/order" onClick={() => setMenuOpen(false)}>
            Order Now
          </Link>
        </nav>
      </header>

      <main className="page" key={path}>
        <Page />
      </main>

      <footer className="site-footer">
        <img className="footer-logo" src={`${IMG}/logo-transparent.webp`} alt="freshleaf" />
        <p>Naturally crafted. Beautifully scented. Thoughtfully made.</p>
        <div className="footer-contact">
          <a
            className="footer-btn wa"
            href={waLink("Hi FreshLeaf! I'd like to ask about your sprays.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.05-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3 .78.8-2.92-.2-.31A8.2 8.2 0 1 1 12 20.2z" />
              <path fill="currentColor" d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.08 2.9 1.23 3.1.15.2 2.12 3.24 5.13 4.54.72.31 1.28.5 1.71.64.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
            </svg>
            WhatsApp
          </a>
          <a className="footer-btn em" href={`mailto:${CONTACT.email}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" d="M3 6.5h18v11H3z" />
              <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" d="M3.5 7l8.5 6 8.5-6" />
            </svg>
            Email Us
          </a>
        </div>
        <nav className="footer-nav">
          {NAV.map(([to, label]) => (
            <Link key={to} to={to}>{label}</Link>
          ))}
        </nav>
        <p className="fine">© {new Date().getFullYear()} FreshLeaf. All rights reserved.</p>
      </footer>
    </NavContext.Provider>
  );
}

export default function Root() {
  return (
    <CartProvider>
      <App />
    </CartProvider>
  );
}
