<section class="how-it-works">
  <div class="bg-gradient"></div>
  <div class="how-container">
    <div class="section-header">
      <span class="section-badge">How It Works</span>
      <h2 class="section-title">Three Steps to <span class="gradient-text">Alpha</span></h2>
      <p class="section-subtitle">From investment to returns, we've simplified the entire process</p>
    </div>

    <div class="steps-flow">
      <div class="step">
        <div class="step-number-wrapper">
          <span class="step-number">1</span>
        </div>
        <div class="step-connector"></div>
        <div class="step-box">
          <div class="step-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="step-title">INVEST</div>
          <p class="step-description">
            Purchase $CATCH tokens via fundraising round on Avalanche
          </p>
        </div>
      </div>

      <div class="step">
        <div class="step-number-wrapper">
          <span class="step-number">2</span>
        </div>
        <div class="step-connector"></div>
        <div class="step-box">
          <div class="step-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div class="step-title">WE BUY</div>
          <p class="step-description">
            Fund acquires PSA/BGS/CGC graded cards. On-chain + vault custody
          </p>
        </div>
      </div>

      <div class="step">
        <div class="step-number-wrapper">
          <span class="step-number">3</span>
        </div>
        <div class="step-connector last"></div>
        <div class="step-box">
          <div class="step-icon earn-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div class="step-title">YOU EARN</div>
          <p class="step-description">
            Track portfolio growth. Vote on buy/sell decisions. Redeem anytime
          </p>
        </div>
      </div>
    </div>

    <div class="bottom-cta">
      <a href="/fundraising" class="cta-button">
        <span>Start Investing</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>
    </div>
  </div>
</section>

<style>
  .how-it-works {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    padding: 6rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .bg-gradient {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, rgba(230, 57, 70, 0.08) 0%, transparent 60%);
    pointer-events: none;
  }

  .how-container {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(69, 123, 157, 0.15) 0%, rgba(69, 123, 157, 0.05) 100%);
    border: 1px solid rgba(69, 123, 157, 0.2);
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6ba3c7;
    margin-bottom: 1.5rem;
    letter-spacing: 0.05em;
  }

  .section-title {
    font-size: 3rem;
    font-weight: 800;
    color: white;
    margin: 0 0 1rem 0;
    letter-spacing: -0.02em;
  }

  .gradient-text {
    background: linear-gradient(135deg, #ff6b7a 0%, #ffd93d 50%, #6bcf7f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .section-subtitle {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }

  .steps-flow {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-bottom: 4rem;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
  }

  .step-number-wrapper {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #E63946 0%, #ff6b7a 100%);
    border-radius: 50%;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 20px rgba(230, 57, 70, 0.4);
    position: relative;
    z-index: 2;
  }

  .step-number {
    font-size: 1.5rem;
    font-weight: 800;
    color: white;
  }

  .step-connector {
    position: absolute;
    top: 28px;
    left: calc(50% + 28px);
    width: calc(100% - 56px);
    height: 2px;
    background: linear-gradient(90deg, rgba(230, 57, 70, 0.5) 0%, rgba(230, 57, 70, 0.1) 100%);
    z-index: 1;
  }

  .step-connector.last {
    display: none;
  }

  .step-box {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    width: 100%;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(10px);
  }

  .step:hover .step-box {
    transform: translateY(-8px);
    border-color: rgba(230, 57, 70, 0.3);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .step-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.15) 0%, rgba(230, 57, 70, 0.05) 100%);
    border-radius: 16px;
    margin: 0 auto 1.5rem;
    color: #ff6b7a;
  }

  .step-icon.earn-icon {
    background: linear-gradient(135deg, rgba(107, 207, 127, 0.15) 0%, rgba(107, 207, 127, 0.05) 100%);
    color: #6bcf7f;
  }

  .step-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  .step-description {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0;
  }

  .bottom-cta {
    text-align: center;
  }

  .cta-button {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #E63946 0%, #ff6b7a 100%);
    color: white;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.1rem;
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 20px rgba(230, 57, 70, 0.3);
  }

  .cta-button:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 30px rgba(230, 57, 70, 0.5);
  }

  @media (max-width: 968px) {
    .how-it-works {
      padding: 4rem 1.5rem;
    }

    .section-title {
      font-size: 2.25rem;
    }

    .section-header {
      margin-bottom: 3rem;
    }

    .steps-flow {
      grid-template-columns: 1fr;
      gap: 1.5rem;
      max-width: 400px;
      margin: 0 auto 3rem;
    }

    .step-connector {
      display: none;
    }

    .step-box {
      padding: 1.75rem;
    }
  }

  @media (max-width: 640px) {
    .section-title {
      font-size: 1.85rem;
    }

    .section-subtitle {
      font-size: 1rem;
    }

    .step-number-wrapper {
      width: 48px;
      height: 48px;
    }

    .step-number {
      font-size: 1.25rem;
    }

    .step-icon {
      width: 56px;
      height: 56px;
    }

    .step-title {
      font-size: 1.1rem;
    }

    .step-description {
      font-size: 0.9rem;
    }

    .cta-button {
      width: 100%;
      justify-content: center;
    }
  }
</style>
