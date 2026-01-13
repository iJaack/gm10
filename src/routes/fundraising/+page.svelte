<script>
  import PageHero from '$lib/components/PageHero.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import TierCard from '$lib/components/TierCard.svelte';
  import StepFlow from '$lib/components/StepFlow.svelte';
  import Accordion from '$lib/components/Accordion.svelte';

  const raised = 127450;
  const goal = 500000;
  const investors = 142;

  // Countdown timer (mock - would be calculated from end date in real app)
  const countdown = '14d 06h 32m 18s';

  // Investment tiers
  const tiers = [
    {
      title: 'STARTER',
      price: '$100+',
      benefits: [
        '$CATCH tokens',
        'Discord access',
      ],
      popular: false
    },
    {
      title: 'TRAINER',
      price: '$1,000+',
      benefits: [
        '$CATCH tokens',
        'Discord access',
        'Quarterly calls',
      ],
      popular: true
    },
    {
      title: 'GYM LEADER',
      price: '$10,000+',
      benefits: [
        '$CATCH tokens',
        'Discord access',
        'Quarterly calls',
        'Advisory board',
      ],
      popular: false
    }
  ];

  // Steps for investment process
  const investmentSteps = [
    { number: 1, label: 'Connect', subtitle: 'Wallet' },
    { number: 2, label: 'Choose', subtitle: 'Amount' },
    { number: 3, label: 'Receive', subtitle: '$CATCH' }
  ];

  // FAQ items
  const faqItems = [
    {
      question: 'What is $CATCH?',
      answer: '$CATCH is the governance token for Ash Strategy fund. Each token represents a share in the fund and gives you voting rights on portfolio decisions.'
    },
    {
      question: 'How is the fund value calculated?',
      answer: 'The Net Asset Value (NAV) is calculated based on the current market value of all cards in the portfolio, divided by the total supply of $CATCH tokens.'
    },
    {
      question: 'Can I redeem my tokens?',
      answer: 'Token redemption will be available after the initial lock-up period of 12 months. Redemption value is based on the current NAV per token.'
    },
    {
      question: 'What are the risks?',
      answer: 'Pokemon cards are alternative assets with price volatility. Card values can fluctuate based on market demand, condition, and rarity. Past performance does not guarantee future results.'
    }
  ];
</script>

<svelte:head>
  <title>Fundraising - Ash Strategy</title>
  <meta name="description" content="Join the Ash Strategy fundraising round" />
</svelte:head>

<div class="fundraising-page">
  <PageHero
    icon="💰"
    title="Fundraising Round 1"
    subtitle="Your chance to invest in Pokemon card alpha"
  />

  <!-- Countdown Timer -->
  <section class="countdown-section">
    <div class="container">
      <div class="countdown-banner">
        <span class="countdown-label">⏰ Closes in:</span>
        <span class="countdown-time">{countdown}</span>
      </div>
    </div>
  </section>

  <!-- Progress Section -->
  <section class="progress-section">
    <div class="container">
      <div class="progress-card">
        <div class="progress-header">
          <h2 class="progress-title">${raised.toLocaleString()} raised of ${goal.toLocaleString()} goal</h2>
        </div>
        <ProgressBar
          current={raised}
          total={goal}
          label=""
          showPercentage={true}
          color="var(--accent-green)"
        />
        <div class="progress-footer">
          <span class="investor-count">{investors} investors</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Investment Tiers -->
  <section class="tiers-section">
    <div class="container">
      <h2 class="section-title">Investment Tiers</h2>
      <div class="tiers-grid">
        {#each tiers as tier}
          <TierCard {...tier} />
        {/each}
      </div>
    </div>
  </section>

  <!-- Token Economics -->
  <section class="economics-section">
    <div class="container">
      <div class="economics-card">
        <h2 class="section-title">Token Economics</h2>
        <div class="economics-price">
          Round 1 Price: <strong>$1.00 per $CATCH</strong>
        </div>
        <div class="economics-grid">
          <div class="economics-item">
            <div class="economics-label">Total Supply</div>
            <div class="economics-value">100,000</div>
            <div class="economics-sublabel">tokens</div>
          </div>
          <div class="economics-item">
            <div class="economics-label">Round 1</div>
            <div class="economics-value">50,000</div>
            <div class="economics-sublabel">available</div>
          </div>
          <div class="economics-item">
            <div class="economics-label">Future</div>
            <div class="economics-value">50,000</div>
            <div class="economics-sublabel">reserved</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Fund Allocation -->
  <section class="allocation-section">
    <div class="container">
      <div class="allocation-card">
        <h2 class="section-title">How Funds Will Be Used</h2>
        <div class="allocation-bars">
          <div class="allocation-item">
            <div class="allocation-bar">
              <div class="allocation-fill" style="width: 80%;"></div>
            </div>
            <div class="allocation-info">
              <span class="allocation-percentage">80%</span>
              <span class="allocation-label">Cards</span>
            </div>
          </div>
          <div class="allocation-item">
            <div class="allocation-bar">
              <div class="allocation-fill" style="width: 15%;"></div>
            </div>
            <div class="allocation-info">
              <span class="allocation-percentage">15%</span>
              <span class="allocation-label">Operations</span>
            </div>
          </div>
          <div class="allocation-item">
            <div class="allocation-bar">
              <div class="allocation-fill" style="width: 5%;"></div>
            </div>
            <div class="allocation-info">
              <span class="allocation-percentage">5%</span>
              <span class="allocation-label">Legal/Audit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- How to Invest -->
  <section class="steps-section">
    <div class="container">
      <h2 class="section-title">How to Invest</h2>
      <StepFlow steps={investmentSteps} />
    </div>
  </section>

  <!-- Investment CTA -->
  <section class="cta-section">
    <div class="container">
      <div class="cta-card">
        <button class="connect-btn">Connect Wallet</button>
        <p class="cta-sublabel">Accepting: ETH, USDC, USDT on Base/Ethereum</p>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="faq-section">
    <div class="container">
      <h2 class="section-title">Frequently Asked Questions</h2>
      <Accordion items={faqItems} />
    </div>
  </section>
</div>

<style>
  .fundraising-page {
    width: 100%;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  .section-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 2rem 0;
    text-align: center;
  }

  /* Countdown Section */
  .countdown-section {
    padding: 2rem 0;
    background: var(--bg-dark);
  }

  .countdown-banner {
    background: linear-gradient(135deg, var(--bg-elevated), var(--bg-card));
    border: 2px solid var(--accent-yellow);
    border-radius: 12px;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .countdown-label {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .countdown-time {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--accent-yellow);
  }

  /* Progress Section */
  .progress-section {
    padding: 2rem 0 3rem;
    background: var(--bg-dark);
  }

  .progress-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .progress-header {
    text-align: center;
  }

  .progress-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .progress-footer {
    text-align: center;
  }

  .investor-count {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* Tiers Section */
  .tiers-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .tiers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }

  /* Economics Section */
  .economics-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .economics-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .economics-price {
    text-align: center;
    font-size: 1.25rem;
    color: var(--text-secondary);
  }

  .economics-price strong {
    color: var(--accent-yellow);
    font-size: 1.5rem;
  }

  .economics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .economics-item {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .economics-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .economics-value {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .economics-sublabel {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  /* Allocation Section */
  .allocation-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .allocation-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 3rem;
  }

  .allocation-bars {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .allocation-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .allocation-bar {
    width: 100%;
    height: 40px;
    background: var(--bg-elevated);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .allocation-fill {
    height: 100%;
    background: var(--accent-green);
    transition: width 0.3s ease;
  }

  .allocation-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .allocation-percentage {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .allocation-label {
    font-size: 1.1rem;
    color: var(--text-secondary);
  }

  /* Steps Section */
  .steps-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  /* CTA Section */
  .cta-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .cta-card {
    background: var(--bg-card);
    border: 2px solid var(--accent-yellow);
    border-radius: 12px;
    padding: 4rem 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .connect-btn {
    padding: 1.25rem 3rem;
    background: var(--accent-yellow);
    color: var(--bg-dark);
    border: none;
    border-radius: 8px;
    font-size: 1.25rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .connect-btn:hover {
    background: #fde68a;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(252, 211, 77, 0.3);
  }

  .cta-sublabel {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* FAQ Section */
  .faq-section {
    padding: 3rem 0 4rem;
    background: var(--bg-dark);
  }

  /* Responsive Design */
  @media (max-width: 968px) {
    .container {
      padding: 0 1.5rem;
    }

    .economics-grid {
      grid-template-columns: 1fr;
    }

    .tiers-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .container {
      padding: 0 1rem;
    }

    .progress-card {
      padding: 2rem 1.5rem;
    }

    .progress-title {
      font-size: 1.35rem;
    }

    .countdown-banner {
      padding: 1rem;
    }

    .countdown-time {
      font-size: 1.25rem;
    }

    .economics-card,
    .allocation-card,
    .cta-card {
      padding: 2rem 1.5rem;
    }

    .connect-btn {
      padding: 1rem 2rem;
      font-size: 1.1rem;
      width: 100%;
    }
  }
</style>
