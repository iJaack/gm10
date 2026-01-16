<script>
  export let daysRemaining = 14;
  export let contactEmail = 'team@ashstrategy.xyz';
</script>

<section class="final-cta">
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  <div class="bg-glow glow-3"></div>

  <div class="cta-container">
    <span class="cta-badge">Limited Time</span>
    <h2 class="cta-title">Ready to Catch <span class="gradient-text">Alpha</span>?</h2>
    <p class="cta-urgency">
      Fundraising Round 1 closes in <span class="countdown">{daysRemaining} days</span>
    </p>

    <div class="cta-buttons">
      <a href="/fundraising" class="btn-invest-large">
        <span>Invest Now</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>
      <a href="/portfolio" class="btn-secondary">
        View Portfolio
      </a>
    </div>

    <div class="trust-row">
      <div class="trust-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Secure Custody</span>
      </div>
      <div class="trust-divider"></div>
      <div class="trust-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        <span>On-chain Verified</span>
      </div>
      <div class="trust-divider"></div>
      <div class="trust-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>100% Backed</span>
      </div>
    </div>

    <p class="cta-contact">
      Questions? <a href="mailto:{contactEmail}">{contactEmail}</a>
    </p>
  </div>
</section>

<style>
  .final-cta {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    padding: 8rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
    animation: pulse 8s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
  }

  .glow-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(230, 57, 70, 0.25) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 0s;
  }

  .glow-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255, 217, 61, 0.15) 0%, transparent 70%);
    top: 20%;
    left: 20%;
    animation-delay: -2.5s;
  }

  .glow-3 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(107, 207, 127, 0.12) 0%, transparent 70%);
    bottom: 20%;
    right: 20%;
    animation-delay: -5s;
  }

  .cta-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    position: relative;
    z-index: 1;
  }

  .cta-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.2) 0%, rgba(230, 57, 70, 0.1) 100%);
    border: 1px solid rgba(230, 57, 70, 0.3);
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ff6b7a;
    letter-spacing: 0.05em;
    animation: glow-pulse 2s ease-in-out infinite;
  }

  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(230, 57, 70, 0.2); }
    50% { box-shadow: 0 0 30px rgba(230, 57, 70, 0.4); }
  }

  .cta-title {
    font-size: 4rem;
    font-weight: 800;
    color: white;
    margin: 0;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .gradient-text {
    background: linear-gradient(135deg, #ff6b7a 0%, #ffd93d 50%, #6bcf7f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .cta-urgency {
    font-size: 1.25rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .countdown {
    display: inline-block;
    padding: 0.35rem 1rem;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.2) 0%, rgba(230, 57, 70, 0.1) 100%);
    border-radius: 8px;
    color: #ff6b7a;
    font-weight: 700;
    margin-left: 0.25rem;
  }

  .cta-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }

  .btn-invest-large {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 2.5rem;
    background: linear-gradient(135deg, #E63946 0%, #ff6b7a 100%);
    color: white;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.2rem;
    border-radius: 14px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow:
      0 8px 30px rgba(230, 57, 70, 0.4),
      0 0 60px rgba(230, 57, 70, 0.2);
    position: relative;
    overflow: hidden;
  }

  .btn-invest-large::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  .btn-invest-large:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow:
      0 12px 40px rgba(230, 57, 70, 0.5),
      0 0 80px rgba(230, 57, 70, 0.3);
  }

  .btn-invest-large:hover::before {
    left: 100%;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    padding: 1.25rem 2.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: white;
    text-decoration: none;
    font-weight: 600;
    font-size: 1.1rem;
    border-radius: 14px;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
  }

  .trust-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-top: 2rem;
    padding: 1rem 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .trust-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .trust-item svg {
    color: #6bcf7f;
  }

  .trust-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
  }

  .cta-contact {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 1.5rem 0 0 0;
  }

  .cta-contact a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-weight: 600;
    border-bottom: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .cta-contact a:hover {
    color: #ff6b7a;
    border-bottom-color: #ff6b7a;
  }

  @media (max-width: 968px) {
    .final-cta {
      padding: 5rem 1.5rem;
    }

    .cta-title {
      font-size: 2.75rem;
    }

    .cta-urgency {
      font-size: 1.1rem;
    }

    .btn-invest-large {
      padding: 1rem 2rem;
      font-size: 1.1rem;
    }

    .btn-secondary {
      padding: 1rem 2rem;
      font-size: 1rem;
    }

    .trust-row {
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
    }

    .trust-divider {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .cta-title {
      font-size: 2.25rem;
    }

    .cta-urgency {
      font-size: 1rem;
    }

    .cta-buttons {
      flex-direction: column;
      width: 100%;
    }

    .btn-invest-large,
    .btn-secondary {
      width: 100%;
      justify-content: center;
    }

    .trust-row {
      padding: 0.875rem 1rem;
    }

    .trust-item {
      font-size: 0.8rem;
    }

    .cta-contact {
      font-size: 0.9rem;
    }

    .glow-2, .glow-3 {
      display: none;
    }
  }
</style>
