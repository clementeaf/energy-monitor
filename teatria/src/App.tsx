import { useState, type FormEvent } from 'react';
import './App.css';

function App() {
  const [formStatus, setFormStatus] = useState<{ text: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    setFormStatus(null);

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form) as never).toString(),
      });
      if (res.ok) {
        setFormStatus({ text: '— Mensaje recibido. Te responderé pronto.', type: 'success' });
        form.reset();
      } else {
        throw new Error();
      }
    } catch {
      setFormStatus({ text: '— Algo salió mal. Inténtalo de nuevo.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const titleLetters = [
    { char: 'T', red: false },
    { char: 'E', red: false },
    { char: 'A', red: false },
    { char: 'T', red: false },
    { char: 'R', red: false },
    { char: 'I', red: true },
    { char: 'A', red: true },
  ];

  return (
    <>
      <nav className="nav">
        <a className="nav-logo" href="#">
          TEATR<span className="logo-ia">IA</span>
        </a>
        <span className="nav-date">CL · MMXXVI</span>
      </nav>

      <section id="hero">
        <div className="hero-body">
          <h1 className="hero-title">
            {titleLetters.map((l, i) => (
              <span
                key={i}
                className={`letter${l.red ? ' red' : ''}`}
                style={{ animationDelay: `${0.05 + i * 0.08}s` }}
              >
                {l.char}
              </span>
            ))}
          </h1>
          <p className="hero-slogan">
            El <strong>conflicto</strong> es la materia prima del teatro.
          </p>
        </div>
        <div className="hero-meta">
          <div className="meta-item">
            <span className="meta-label">Origen</span>
            <span className="meta-value">Santiago, Chile</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Formato</span>
            <span className="meta-value">Drama Digital</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Estado</span>
            <span className="meta-value">
              <span className="meta-dot pulse-dot">●</span> Próximamente
            </span>
          </div>
        </div>
      </section>

      <section id="contacto">
        <div className="contact-inner">
          <div>
            <span className="section-label">Contacto / 01</span>
            <h2 className="contact-heading">
              Escribe. <span className="line-red">Te responderé.</span>
            </h2>
          </div>
          <form id="contactForm" onSubmit={handleSubmit}>
            <div className="form-group honeypot">
              <label>No completar:</label>
              <input type="text" name="bot-field" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" name="name" required />
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input type="email" name="email" required />
            </div>
            <div className="form-group">
              <label>Mensaje</label>
              <textarea name="message" required></textarea>
            </div>
            <button type="submit" className="submit-btn" disabled={submitting}>
              <span>{submitting ? 'Enviando...' : 'Enviar →'}</span>
            </button>
            {formStatus && (
              <div className={`form-status ${formStatus.type}`}>{formStatus.text}</div>
            )}
          </form>
        </div>
      </section>

      <section id="proximamente">
        <div className="marquee-bg" aria-hidden="true">
          PRÓXIMAMENTE · PRÓXIMAMENTE · PRÓXIMAMENTE · PRÓXIMAMENTE · PRÓXIMAMENTE · PRÓXIMAMENTE ·&nbsp;
        </div>
        <span className="prox-label">
          ● En desarrollo <span className="pulse-dot">●</span>
        </span>
        <h2 className="prox-title">
          Próximamente<span className="title-dot">.</span>
        </h2>
        <p className="prox-sub">Vuelve pronto — o no. El conflicto te encontrará igual.</p>
      </section>

      <footer>
        <div>● TEATRIA · MMXXVI</div>
        <div className="footer-center">TEATRIA.CL</div>
        <div className="footer-right">HECHO EN CHILE</div>
      </footer>
    </>
  );
}

export default App;
