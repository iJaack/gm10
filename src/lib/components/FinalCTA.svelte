<script>
  export let daysRemaining = 14;
  export let contactEmail = 'team@ashstrategy.xyz';
</script>

<section class="final-cta">
  <div class="cta-container">
    <h2 class="cta-title">Ready to Catch Alpha?</h2>
    <p class="cta-urgency">
      Fundraising Round 1 closes in <strong>{daysRemaining} days</strong>
    </p>
    <a href="/fundraising" class="btn-invest-large">Invest Now</a>
    <p class="cta-contact">
      Questions? <a href="mailto:{contactEmail}">{contactEmail}</a>
    </p>
  </div>
</section>

<style>
  .final-cta {
    background: var(--cream);
    padding: 6rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .final-cta::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(230, 57, 70, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .cta-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    position: relative;
    z-index: 1;
  }

  .cta-title {
    font-size: 3.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .cta-urgency {
    font-size: 1.35rem;
    color: var(--blue-primary);
    margin: 0;
    opacity: 0.85;
  }

  .cta-urgency strong {
    color: var(--red-primary);
    font-weight: 800;
  }

  .btn-invest-large {
    display: inline-block;
    padding: 1.5rem 4rem;
    background: var(--red-primary);
    color: var(--white);
    text-decoration: none;
    font-weight: 800;
    font-size: 1.5rem;
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 8px 24px rgba(230, 57, 70, 0.3);
    margin-top: 1rem;
  }

  .btn-invest-large:hover {
    background: var(--red-dark);
    transform: translateY(-4px);
    box-shadow: 0 12px 36px rgba(230, 57, 70, 0.5);
  }

  .btn-invest-large:active {
    transform: translateY(-2px);
  }

  .cta-contact {
    font-size: 1.1rem;
    color: var(--blue-light);
    margin: 1rem 0 0 0;
  }

  .cta-contact a {
    color: var(--blue-primary);
    text-decoration: none;
    font-weight: 600;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .cta-contact a:hover {
    color: var(--red-primary);
    border-bottom-color: var(--red-primary);
  }

  @media (max-width: 968px) {
    .final-cta {
      padding: 4rem 1.5rem;
    }

    .cta-title {
      font-size: 2.5rem;
    }

    .cta-urgency {
      font-size: 1.1rem;
    }

    .btn-invest-large {
      padding: 1.25rem 3rem;
      font-size: 1.25rem;
    }
  }

  @media (max-width: 640px) {
    .cta-title {
      font-size: 2rem;
    }

    .cta-urgency {
      font-size: 1rem;
    }

    .btn-invest-large {
      width: 100%;
      padding: 1.25rem 2rem;
      font-size: 1.2rem;
    }

    .cta-contact {
      font-size: 1rem;
    }
  }
</style>
