<script>
  import { onMount } from 'svelte';
  import { getAccount, writeContract } from '@wagmi/core';
  import { parseEther } from 'viem';
  import { wagmiAdapter } from '$lib/web3';
  import Navbar from '$lib/components/Navbar.svelte';
  import PageHero from '$lib/components/PageHero.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import StepFlow from '$lib/components/StepFlow.svelte';
  import Footer from '$lib/components/Footer.svelte';

  // Mock data
  const raised = 127450;
  const goal = 500000;
  const investors = 142;
  const countdown = { days: 14, hours: 6, minutes: 32, seconds: 18 };

  // Fund Contract details (Replace with deployed address)
  const FUND_ADDRESS = "0xYOUR_CONTRACT_ADDRESS"; 
  const INVEST_ABI = [
    {
      "inputs": [],
      "name": "invest",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ];

  const tiers = [
    {
      name: 'STARTER',
      amount: '$100+', // Display only
      minEth: '0.1', // Example AVAX amount
      popular: false,
      benefits: ['$CATCH tokens', 'Discord access']
    },
    {
      name: 'TRAINER',
      amount: '$1,000+',
      minEth: '1.0',
      popular: true,
      benefits: ['$CATCH tokens', 'Discord access', 'Quarterly calls']
    },
    {
      name: 'GYM LEADER',
      amount: '$10,000+',
      minEth: '10.0',
      popular: false,
      benefits: ['$CATCH tokens', 'Discord access', 'Quarterly calls', 'Advisory board']
    }
  ];

  const investSteps = [
    { number: 1, title: 'Connect Wallet', description: 'Link your Web3 wallet' },
    { number: 2, title: 'Choose Amount', description: 'Select investment tier' },
    { number: 3, title: 'Receive $CATCH', description: 'Get your tokens' }
  ];

  const allocations = [
    { label: 'Card Acquisition', percentage: 80, color: 'var(--blue-primary)' },
    { label: 'Operations', percentage: 15, color: 'var(--blue-light)' },
    { label: 'Legal/Audit', percentage: 5, color: 'var(--blue-pale)' }
  ];

  const faqs = [
    { question: 'What is $CATCH?', answer: '$CATCH is the governance token for the Ash Strategy fund, giving holders voting rights on portfolio decisions.' },
    { question: 'How is the fund value calculated?', answer: 'NAV is calculated based on current market values of all graded cards in the portfolio, updated daily.' },
    { question: 'Can I redeem my tokens?', answer: 'Token redemption will be available after the initial lock-up period, subject to liquidity and DAO approval.' },
    { question: 'What are the risks?', answer: 'Investing involves risk of loss. Pokemon cards are collectibles with volatile valuations. Past performance does not guarantee future results.' }
  ];

  let openFaqIndex = null;
  let isConnected = false;

  function toggleFaq(index) {
    openFaqIndex = openFaqIndex === index ? null : index;
  }

  // Check connection status
  onMount(() => {
    const account = getAccount(wagmiAdapter.wagmiConfig);
    isConnected = account.isConnected;
    
    // Listen for changes could be added here
    // For simplicity, we just check on mount or rely on the modal interactions
  });

  async function handleInvest(tier) {
    const account = getAccount(wagmiAdapter.wagmiConfig);
    if (!account.isConnected) {
      alert("Please connect your wallet first via the Navbar button!");
      return;
    }

    try {
      const result = await writeContract(wagmiAdapter.wagmiConfig, {
        address: FUND_ADDRESS,
        abi: INVEST_ABI,
        functionName: 'invest',
        value: parseEther(tier.minEth)
      });
      console.log("Transaction sent:", result);
      alert("Investment transaction sent! Hash: " + result);
    } catch (error) {
      console.error("Investment failed:", error);
      alert("Investment failed: " + error.message);
    }
  }
</script>

<svelte:head>
  <title>Fundraising - Ash Strategy</title>
  <meta name="description" content="Your chance to invest in Pokemon card alpha" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="page-wrapper">
  <Navbar />

  <main>
    <PageHero
      icon="💰"
      title="Fundraising Round 1"
      subtitle="Your chance to invest in Pokemon card alpha"
    />

    <!-- Countdown & Progress -->
    <section class="progress-section">
      <div class="container">
        <div class="countdown">
          <span class="countdown-label">⏰ Closes in:</span>
          <div class="countdown-numbers">
            <div class="countdown-item">
              <span class="number">{countdown.days}</span>
              <span class="label">days</span>
            </div>
            <span class="separator">:</span>
            <div class="countdown-item">
              <span class="number">{countdown.hours.toString().padStart(2, '0')}</span>
              <span class="label">hours</span>
            </div>
            <span class="separator">:</span>
            <div class="countdown-item">
              <span class="number">{countdown.minutes.toString().padStart(2, '0')}</span>
              <span class="label">min</span>
            </div>
            <span class="separator">:</span>
            <div class="countdown-item">
              <span class="number">{countdown.seconds.toString().padStart(2, '0')}</span>
              <span class="label">sec</span>
            </div>
          </div>
        </div>

        <div class="progress-container">
          <h3 class="progress-title">
            ${raised.toLocaleString()} raised of ${goal.toLocaleString()} goal
          </h3>
          <ProgressBar current={raised} goal={goal} />
          <p class="investors-count">{investors} investors</p>
        </div>
      </div>
    </section>

    <!-- Investment Tiers -->
    <section class="tiers-section">
      <div class="container">
        <h2 class="section-title">Investment Tiers</h2>
        <div class="tiers-grid">
          {#each tiers as tier}
            <div class="tier-card" class:popular={tier.popular}>
              {#if tier.popular}
                <div class="popular-badge">⭐ Popular</div>
              {/if}
              <h3 class="tier-name">{tier.name}</h3>
              <div class="tier-amount">{tier.amount}</div>
              <ul class="tier-benefits">
                {#each tier.benefits as benefit}
                  <li>▪ {benefit}</li>
                {/each}
              </ul>
              <button class="tier-btn" on:click={() => handleInvest(tier)}>
                Invest {tier.minEth} AVAX
              </button>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- Token Economics -->
    <section class="token-section">
      <div class="container">
        <h2 class="section-title">Token Economics</h2>
        <div class="token-box">
          <p class="token-price">Round 1 Price: <strong>$1.00 per $CATCH</strong></p>

          <div class="supply-grid">
            <div class="supply-item">
              <div class="supply-label">Total Supply</div>
              <div class="supply-value">100,000</div>
              <div class="supply-sublabel">tokens</div>
            </div>
            <div class="supply-item">
              <div class="supply-label">Round 1</div>
              <div class="supply-value">50,000</div>
              <div class="supply-sublabel">available</div>
            </div>
            <div class="supply-item">
              <div class="supply-label">Future</div>
              <div class="supply-value">50,000</div>
              <div class="supply-sublabel">reserved</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Fund Allocation -->
    <section class="allocation-section">
      <div class="container">
        <h2 class="section-title">How Funds Will Be Used</h2>
        <div class="allocation-bars">
          {#each allocations as allocation}
            <div class="allocation-row">
              <div class="allocation-label">{allocation.label}</div>
              <div class="allocation-bar-container">
                <div
                  class="allocation-bar-fill"
                  style="width: {allocation.percentage}%; background: {allocation.color}"
                ></div>
              </div>
              <div class="allocation-percentage">{allocation.percentage}%</div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- How to Invest -->
    <section class="steps-section">
      <div class="container">
        <h2 class="section-title">How to Invest</h2>
        <StepFlow steps={investSteps} />
      </div>
    </section>

    <!-- Investment CTA -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-box">
          <h2>Ready to Invest?</h2>
          <!-- AppKit Button -->
           <div class="connect-wrapper">
             <w3m-button />
           </div>
          <p class="cta-note">Accepting: AVAX on Avalanche C-Chain</p>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section">
      <div class="container">
        <h2 class="section-title">Frequently Asked Questions</h2>
        <div class="faq-list">
          {#each faqs as faq, i}
            <div class="faq-item" class:open={openFaqIndex === i}>
              <button class="faq-question" on:click={() => toggleFaq(i)}>
                <span class="faq-icon">{openFaqIndex === i ? '▼' : '▶'}</span>
                <span>{faq.question}</span>
              </button>
              {#if openFaqIndex === i}
                <div class="faq-answer">
                  {faq.answer}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>
  </main>

  <Footer />
</div>

<style>
  .page-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--white);
  }

  main {
    flex: 1;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  .section-title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    text-align: center;
    margin: 0 0 3rem 0;
  }

  /* Progress Section */
  .progress-section {
    padding: 3rem 2rem;
    background: var(--cream);
  }

  .countdown {
    text-align: center;
    margin-bottom: 2rem;
  }

  .countdown-label {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--blue-primary);
    margin-bottom: 1rem;
    display: block;
  }

  .countdown-numbers {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }

  .countdown-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .countdown-item .number {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--red-primary);
    line-height: 1;
  }

  .countdown-item .label {
    font-size: 0.85rem;
    color: var(--blue-light);
    margin-top: 0.25rem;
  }

  .separator {
    font-size: 2rem;
    font-weight: 700;
    color: var(--blue-primary);
  }

  .progress-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--white);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .progress-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--blue-primary);
    text-align: center;
    margin-bottom: 1rem;
  }

  .investors-count {
    text-align: center;
    font-size: 1.1rem;
    color: var(--blue-light);
    font-weight: 600;
    margin-top: 1rem;
  }

  /* Tiers Section */
  .tiers-section {
    padding: 4rem 2rem;
  }

  .tiers-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .tier-card {
    background: var(--white);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
    padding: 2.5rem 2rem;
    text-align: center;
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .tier-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 32px rgba(29, 53, 87, 0.15);
    border-color: var(--blue-light);
  }

  .tier-card.popular {
    border-color: var(--red-primary);
    border-width: 3px;
  }

  .popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--red-primary);
    color: var(--white);
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .tier-name {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin: 0 0 1rem 0;
    letter-spacing: 0.05em;
  }

  .tier-amount {
    font-size: 1.5rem; /* Adjusted size */
    font-weight: 800;
    color: var(--red-primary);
    margin-bottom: 2rem;
  }

  .tier-benefits {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem 0;
    text-align: left;
    flex-grow: 1;
  }

  .tier-benefits li {
    padding: 0.75rem 0;
    color: var(--blue-primary);
    font-size: 1rem;
    border-bottom: 1px solid var(--blue-pale);
  }

  .tier-benefits li:last-child {
    border-bottom: none;
  }

  .tier-btn {
    width: 100%;
    padding: 1rem;
    background: var(--blue-primary);
    color: var(--white);
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tier-btn:hover {
    background: var(--blue-light);
    transform: translateY(-2px);
  }

  .tier-card.popular .tier-btn {
    background: var(--red-primary);
  }

  .tier-card.popular .tier-btn:hover {
    background: var(--red-dark);
  }

  /* Token Section */
  .token-section {
    padding: 4rem 2rem;
    background: var(--cream);
  }

  .token-box {
    max-width: 900px;
    margin: 0 auto;
    background: var(--white);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
    padding: 3rem;
  }

  .token-price {
    text-align: center;
    font-size: 1.5rem;
    color: var(--blue-primary);
    margin-bottom: 3rem;
  }

  .token-price strong {
    color: var(--red-primary);
  }

  .supply-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .supply-item {
    text-align: center;
    padding: 2rem;
    background: var(--cream);
    border-radius: 8px;
    border: 1px solid var(--blue-pale);
  }

  .supply-label {
    font-size: 0.9rem;
    color: var(--blue-light);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .supply-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin-bottom: 0.5rem;
  }

  .supply-sublabel {
    font-size: 0.85rem;
    color: var(--blue-light);
  }

  /* Allocation Section */
  .allocation-section {
    padding: 4rem 2rem;
  }

  .allocation-bars {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .allocation-row {
    display: grid;
    grid-template-columns: 150px 1fr 80px;
    align-items: center;
    gap: 1.5rem;
  }

  .allocation-label {
    font-weight: 600;
    color: var(--blue-primary);
    font-size: 1rem;
    text-align: right;
  }

  .allocation-bar-container {
    height: 40px;
    background: var(--cream);
    border-radius: 20px;
    overflow: hidden;
    border: 2px solid var(--blue-pale);
  }

  .allocation-bar-fill {
    height: 100%;
    transition: width 0.5s ease;
    border-radius: 18px;
  }

  .allocation-percentage {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    text-align: left;
  }

  /* Steps Section */
  .steps-section {
    padding: 4rem 2rem;
    background: var(--cream);
  }

  /* CTA Section */
  .cta-section {
    padding: 5rem 2rem;
  }

  .cta-box {
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
    padding: 4rem 3rem;
    background: var(--cream);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
  }

  .cta-box h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin: 0 0 2rem 0;
  }

  .connect-wrapper {
    display: flex;
    justify-content: center;
  }

  .cta-note {
    margin-top: 1.5rem;
    font-size: 0.95rem;
    color: var(--blue-light);
  }

  /* FAQ Section */
  .faq-section {
    padding: 4rem 2rem;
    background: var(--cream);
  }

  .faq-list {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .faq-item {
    background: var(--white);
    border: 2px solid var(--blue-pale);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .faq-item:hover {
    border-color: var(--blue-light);
  }

  .faq-question {
    width: 100%;
    padding: 1.5rem;
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--blue-primary);
    text-align: left;
    transition: background 0.2s ease;
  }

  .faq-question:hover {
    background: var(--cream);
  }

  .faq-icon {
    font-size: 0.9rem;
    color: var(--red-primary);
  }

  .faq-answer {
    padding: 0 1.5rem 1.5rem 3.5rem;
    color: var(--blue-light);
    line-height: 1.6;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive */
  @media (max-width: 968px) {
    .tiers-grid {
      grid-template-columns: 1fr;
      max-width: 400px;
      margin: 0 auto;
    }

    .supply-grid {
      grid-template-columns: 1fr;
    }

    .allocation-row {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .allocation-label,
    .allocation-percentage {
      text-align: left;
    }
  }

  @media (max-width: 640px) {
    .container {
      padding: 0 1rem;
    }

    .countdown-item .number {
      font-size: 1.75rem;
    }

    .countdown-item .label {
      font-size: 0.75rem;
    }

    .section-title {
      font-size: 1.5rem;
    }

    .cta-box {
      padding: 3rem 2rem;
    }
  }
</style>
