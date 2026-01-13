<section class="how-it-works">
  <div class="how-container">
    <h2 class="section-title">Three Steps to Alpha</h2>

    <div class="steps-flow">
      <div class="step">
        <div class="step-number">①</div>
        <div class="step-box">
          <div class="step-title">INVEST</div>
        </div>
        <p class="step-description">
          Purchase $CATCH tokens via fundraising round.
        </p>
      </div>

      <div class="arrow">▶</div>

      <div class="step">
        <div class="step-number">②</div>
        <div class="step-box">
          <div class="step-title">WE BUY</div>
        </div>
        <p class="step-description">
          Fund acquires PSA/BGS graded cards. On-chain + vault custody.
        </p>
      </div>

      <div class="arrow">▶</div>

      <div class="step">
        <div class="step-number">③</div>
        <div class="step-box">
          <div class="step-title">YOU EARN</div>
        </div>
        <p class="step-description">
          Track portfolio growth. Vote on buy/sell. Redeem.
        </p>
      </div>
    </div>
  </div>
</section>

<style>
  .how-it-works {
    background: var(--blue-pale);
    padding: 5rem 2rem;
  }

  .how-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    text-align: center;
    margin: 0 0 4rem 0;
    letter-spacing: -0.02em;
  }

  .steps-flow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 2rem;
  }

  .step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .step-number {
    font-size: 2.5rem;
    color: var(--blue-primary);
    font-weight: 800;
    margin-bottom: 1.5rem;
  }

  .step-box {
    background: var(--white);
    padding: 2rem 2.5rem;
    border-radius: 12px;
    border: 3px solid var(--blue-primary);
    margin-bottom: 1.5rem;
    width: 100%;
    transition: all 0.3s ease;
  }

  .step:hover .step-box {
    transform: scale(1.05);
    box-shadow: 0 12px 40px rgba(29, 53, 87, 0.2);
    border-color: var(--red-primary);
  }

  .step-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    letter-spacing: 0.02em;
  }

  .step-description {
    font-size: 1rem;
    color: var(--blue-primary);
    line-height: 1.6;
    margin: 0;
    max-width: 280px;
  }

  .arrow {
    font-size: 2rem;
    color: var(--blue-light);
    align-self: center;
    margin-top: 5rem;
  }

  @media (max-width: 968px) {
    .how-it-works {
      padding: 4rem 1.5rem;
    }

    .section-title {
      font-size: 2rem;
      margin-bottom: 3rem;
    }

    .steps-flow {
      flex-direction: column;
      align-items: center;
    }

    .arrow {
      transform: rotate(90deg);
      margin-top: 0;
      margin: 1rem 0;
    }

    .step {
      max-width: 400px;
    }
  }

  @media (max-width: 640px) {
    .section-title {
      font-size: 1.75rem;
    }

    .step-number {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .step-box {
      padding: 1.5rem 1.5rem;
    }

    .step-title {
      font-size: 1.25rem;
    }

    .step-description {
      font-size: 0.95rem;
    }
  }
</style>
