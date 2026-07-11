import { useState } from 'react';
import './App.css';

const CONTACT = {
  phone: '0329-0985503',
  email: 'freshleaf.essentials@gmail.com',
};

// Product photos: drop your images into /public/products and set the `image`
// field to the file name, e.g. image: '/products/citrus-room-spray.jpg'
const PRODUCTS = [
  {
    id: 'room-spray',
    name: 'Signature Room Spray',
    tagline: 'Pure essential oils for living spaces',
    price: 'Rs. 1,200',
    image: null,
  },
  {
    id: 'car-freshener',
    name: 'Car Freshener Spray',
    tagline: 'A calm, natural drive every day',
    price: 'Rs. 950',
    image: null,
  },
  {
    id: 'workspace-mist',
    name: 'Workspace Mist',
    tagline: 'Focus-friendly botanical blends',
    price: 'Rs. 1,100',
    image: null,
  },
];

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

function OrderForm() {
  const [payment, setPayment] = useState('cod');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    const product = PRODUCTS.find((p) => p.id === data.get('product'));
    const lines = [
      'New FreshLeaf order',
      '',
      `Product: ${product ? product.name : data.get('product')}`,
      `Quantity: ${data.get('quantity')}`,
      `Payment method: ${payment === 'cod' ? 'Cash on Delivery' : 'Credit Card'}`,
      '',
      `Name: ${data.get('name')}`,
      `Phone: ${data.get('phone')}`,
      `Delivery address: ${data.get('address')}`,
      data.get('notes') ? `Notes: ${data.get('notes')}` : '',
    ].filter(Boolean);

    const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      'FreshLeaf Order — ' + data.get('name')
    )}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = mailto;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="order-thanks">
        <Leaf />
        <h3>Thank you for your order!</h3>
        <p>
          Your order details have been prepared in your email app — just press send.
          We'll confirm your order shortly on the phone number you provided.
        </p>
        <button className="btn btn-outline" onClick={() => setSubmitted(false)}>
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
                {p.name} — {p.price}
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
        Delivery address
        <textarea name="address" rows="3" placeholder="House, street, area, city" required />
      </label>

      <label>
        Notes (optional)
        <textarea name="notes" rows="2" placeholder="Preferred scent, delivery instructions…" />
      </label>

      <fieldset className="payment-choice">
        <legend>Payment method</legend>
        <label className={payment === 'cod' ? 'pay-option selected' : 'pay-option'}>
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={payment === 'cod'}
            onChange={() => setPayment('cod')}
          />
          <div>
            <strong>Cash on Delivery</strong>
            <span>Pay in cash when your order arrives at your door.</span>
          </div>
        </label>
        <label className={payment === 'card' ? 'pay-option selected' : 'pay-option'}>
          <input
            type="radio"
            name="payment"
            value="card"
            checked={payment === 'card'}
            onChange={() => setPayment('card')}
          />
          <div>
            <strong>Credit Card</strong>
            <span>We'll send you a secure payment link to complete your purchase.</span>
          </div>
        </label>
      </fieldset>

      <button type="submit" className="btn btn-primary">
        Place Order
      </button>
      <p className="form-note">
        Submitting opens your email app with the order pre-filled — press send and we'll
        take care of the rest. You can also order directly by calling {CONTACT.phone}.
      </p>
    </form>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    ['#about', 'About Us'],
    ['#products', 'Our Sprays'],
    ['#order', 'Order'],
    ['#contact', 'Contact'],
  ];

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top">
          <Leaf />
          <span>FreshLeaf</span>
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
        {/* Hero */}
        <section className="hero">
          <p className="eyebrow">Premium Home Fragrance</p>
          <h1>
            Spaces that feel fresh,
            <br />
            <em>naturally.</em>
          </h1>
          <p className="hero-sub">
            Room sprays and car fresheners crafted with pure essential oils — no harsh
            chemicals, just nature's finest scents.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#order">Order Now</a>
            <a className="btn btn-outline" href="#about">Our Story</a>
          </div>
          <p className="hero-tagline">Naturally crafted. Beautifully scented. Thoughtfully made.</p>
        </section>

        {/* About Us */}
        <section id="about" className="section">
          <p className="eyebrow">About Us</p>
          <h2>Introduction</h2>
          <div className="prose">
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

          <h2 className="story-heading">Our Story</h2>
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
        </section>

        {/* Products */}
        <section id="products" className="section section-alt">
          <p className="eyebrow">Our Sprays</p>
          <h2>See the product before you buy</h2>
          <div className="product-grid">
            {PRODUCTS.map((p) => (
              <article key={p.id} className="product-card">
                <ProductImage product={p} />
                <h3>{p.name}</h3>
                <p>{p.tagline}</p>
                <div className="product-foot">
                  <span className="price">{p.price}</span>
                  <a className="btn btn-small" href="#order">Order</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Order */}
        <section id="order" className="section">
          <p className="eyebrow">Place an Order</p>
          <h2>Order your sprays</h2>
          <p className="section-sub">
            Fill in your details below and choose how you'd like to pay — cash on delivery
            or credit card.
          </p>
          <OrderForm />
        </section>

        {/* Contact */}
        <section id="contact" className="section section-alt">
          <p className="eyebrow">Contact Us</p>
          <h2>We'd love to hear from you</h2>
          <div className="contact-cards">
            <a className="contact-card" href={`tel:+92${CONTACT.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`}>
              <span className="contact-icon" aria-hidden="true">📞</span>
              <strong>Call or WhatsApp</strong>
              <span>{CONTACT.phone}</span>
            </a>
            <a className="contact-card" href={`mailto:${CONTACT.email}`}>
              <span className="contact-icon" aria-hidden="true">✉️</span>
              <strong>Email</strong>
              <span>{CONTACT.email}</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand">
          <Leaf />
          <span>FreshLeaf</span>
        </div>
        <p>Naturally crafted. Beautifully scented. Thoughtfully made.</p>
        <p className="fine">© {new Date().getFullYear()} FreshLeaf. All rights reserved.</p>
      </footer>
    </>
  );
}
