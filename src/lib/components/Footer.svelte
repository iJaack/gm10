<footer class="footer">
  <div class="footer-container">
    <div class="footer-grid">
      <div class="footer-section">
        <h3 class="footer-brand">Ash Strategy</h3>
        <p class="footer-tagline">
          Tokenized Pokemon<br />Card Fund
        </p>
        <div class="footer-social">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
            </svg>
          </a>
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>
        </div>
      </div>

      <div class="footer-section">
        <h4 class="footer-title">Links</h4>
        <ul class="footer-links">
          <li><a href="/portfolio">Portfolio</a></li>
          <li><a href="/governance">Governance</a></li>
          <li><a href="#">Docs</a></li>
          <li><a href="#">FAQ</a></li>
        </ul>
      </div>

      <div class="footer-section">
        <h4 class="footer-title">Legal</h4>
        <ul class="footer-links">
          <li><a href="#">Terms of Service</a></li>
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Risk Disclosure</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <p class="footer-copyright">
        © 2025 Ash Strategy. Not financial advice. DYOR.
      </p>
    </div>
  </div>
</footer>

<style>
  .footer {
    background: var(--bg-card);
    color: var(--text-secondary);
    padding: 4rem 2rem 2rem;
    border-top: 1px solid var(--border);
  }

  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 4rem;
    margin-bottom: 3rem;
  }

  .footer-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .footer-brand {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .footer-tagline {
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
  }

  .footer-social {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .footer-social a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .footer-social a:hover {
    background: var(--accent-yellow);
    color: var(--bg-dark);
    transform: translateY(-2px);
  }

  .footer-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .footer-links {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .footer-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    display: inline-block;
  }

  .footer-links a:hover {
    color: var(--text-primary);
    transform: translateX(4px);
  }

  .footer-bottom {
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
  }

  .footer-copyright {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
  }

  @media (max-width: 968px) {
    .footer {
      padding: 3rem 1.5rem 2rem;
    }

    .footer-grid {
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }

    .footer-section {
      text-align: center;
    }

    .footer-social {
      justify-content: center;
    }

    .footer-links {
      align-items: center;
    }

    .footer-links a:hover {
      transform: none;
    }
  }

  @media (max-width: 640px) {
    .footer {
      padding: 2rem 1rem 1.5rem;
    }

    .footer-brand {
      font-size: 1.25rem;
    }

    .footer-tagline {
      font-size: 0.9rem;
    }

    .footer-title {
      font-size: 1rem;
    }
  }
</style>
