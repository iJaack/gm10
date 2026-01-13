<script>
  import Navbar from '$lib/components/Navbar.svelte';
  import PageHero from '$lib/components/PageHero.svelte';
  import StepFlow from '$lib/components/StepFlow.svelte';
  import ProposalCard from '$lib/components/ProposalCard.svelte';
  import Footer from '$lib/components/Footer.svelte';

  // Mock data
  const stats = [
    { label: 'Proposals', value: '12', sublabel: 'total' },
    { label: 'Voters', value: '89', sublabel: 'active' },
    { label: 'Quorum', value: '51%', sublabel: 'required' },
    { label: 'Your Vote', value: '1,250', sublabel: '$CATCH' }
  ];

  const activeProposals = [
    {
      status: 'active',
      proposalId: 'ASH-007',
      title: 'Acquire PSA 10 Charizard VMAX Alt Art',
      proposedBy: '0x8f3...2a1',
      endsIn: '2d 14h',
      votesFor: 15420,
      votesAgainst: 4320
    },
    {
      status: 'active',
      proposalId: 'ASH-006',
      title: 'Sell CGC 8 Mewtwo Promo (target: $4,500+)',
      proposedBy: '0x2b1...9c4',
      endsIn: '5d 02h',
      votesFor: 8100,
      votesAgainst: 11200
    }
  ];

  const pastProposals = [
    { id: 'ASH-005', status: 'passed', title: 'Acquire Umbreon Gold Star' },
    { id: 'ASH-004', status: 'passed', title: 'Q4 Strategy Adjustment' },
    { id: 'ASH-003', status: 'failed', title: 'Increase operations budget' },
    { id: 'ASH-002', status: 'passed', title: 'Acquire Pikachu Illustrator' },
    { id: 'ASH-001', status: 'passed', title: 'Initial portfolio strategy' }
  ];

  const governanceSteps = [
    { number: 1, title: 'Submit Proposal', description: 'Create proposal to buy/sell' },
    { number: 2, title: 'Discuss', description: '3 days community discussion' },
    { number: 3, title: 'Vote', description: '7 days voting period' },
    { number: 4, title: 'Execute DAO', description: 'Approved actions executed' }
  ];

  const votingPower = {
    balance: 1000,
    delegated: 250,
    total: 1250
  };
</script>

<svelte:head>
  <title>Governance - Ash Strategy</title>
  <meta name="description" content="Shape the fund's future with your $CATCH vote" />
</svelte:head>

<div class="page-wrapper">
  <Navbar />

  <main>
    <PageHero
      icon="🏛️"
      title="DAO Governance"
      subtitle="Shape the fund's future with your $CATCH vote"
    />

    <!-- Governance Stats -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          {#each stats as stat}
            <div class="stat-card">
              <div class="stat-label">{stat.label}</div>
              <div class="stat-value">{stat.value}</div>
              {#if stat.sublabel}
                <div class="stat-sublabel">{stat.sublabel}</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- Active Proposals -->
    <section class="proposals-section">
      <div class="container">
        <h2 class="section-title">Active Proposals</h2>
        <div class="proposals-list">
          {#each activeProposals as proposal}
            <ProposalCard {...proposal} />
          {/each}
        </div>
      </div>
    </section>

    <!-- Governance Process -->
    <section class="process-section">
      <div class="container">
        <h2 class="section-title">How Governance Works</h2>
        <StepFlow steps={governanceSteps} />
      </div>
    </section>

    <!-- Voting Power -->
    <section class="voting-power-section">
      <div class="container">
        <div class="voting-power-box">
          <h2>Your Voting Power</h2>

          <div class="power-grid">
            <div class="power-item">
              <div class="power-label">$CATCH Balance</div>
              <div class="power-value">{votingPower.balance.toLocaleString()}</div>
            </div>
            <div class="power-item">
              <div class="power-label">Delegated to You</div>
              <div class="power-value">{votingPower.delegated.toLocaleString()}</div>
            </div>
            <div class="power-item highlighted">
              <div class="power-label">Total Power</div>
              <div class="power-value">{votingPower.total.toLocaleString()}</div>
            </div>
          </div>

          <div class="power-actions">
            <button class="power-btn">Delegate Votes</button>
            <button class="power-btn primary">Create Proposal</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Past Proposals -->
    <section class="past-proposals-section">
      <div class="container">
        <h2 class="section-title">Past Proposals</h2>
        <div class="past-proposals-list">
          {#each pastProposals as proposal}
            <div class="past-proposal-item">
              <div class="past-status" class:passed={proposal.status === 'passed'} class:failed={proposal.status === 'failed'}>
                {proposal.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
              </div>
              <div class="past-id">{proposal.id}</div>
              <div class="past-title">{proposal.title}</div>
            </div>
          {/each}
        </div>
        <div class="view-all">
          <a href="#">View All Proposals →</a>
        </div>
      </div>
    </section>

    <!-- Create Proposal CTA -->
    <section class="create-cta-section">
      <div class="container">
        <div class="create-box">
          <h2>Have an idea for the fund?</h2>
          <button class="create-btn">Create Proposal</button>
          <p class="create-note">Requires 100 $CATCH minimum to submit</p>
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

  /* Stats Section */
  .stats-section {
    padding: 3rem 2rem;
    background: var(--cream);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }

  .stat-card {
    text-align: center;
    padding: 1.5rem;
    background: var(--white);
    border-radius: 8px;
    border: 1px solid var(--blue-pale);
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(29, 53, 87, 0.1);
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--blue-light);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin-bottom: 0.25rem;
  }

  .stat-sublabel {
    font-size: 0.75rem;
    color: var(--blue-light);
    opacity: 0.8;
  }

  /* Proposals Section */
  .proposals-section {
    padding: 4rem 2rem;
  }

  .proposals-list {
    max-width: 900px;
    margin: 0 auto;
  }

  /* Process Section */
  .process-section {
    padding: 4rem 2rem;
    background: var(--cream);
  }

  /* Voting Power Section */
  .voting-power-section {
    padding: 4rem 2rem;
  }

  .voting-power-box {
    max-width: 900px;
    margin: 0 auto;
    background: var(--cream);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
    padding: 3rem;
  }

  .voting-power-box h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    text-align: center;
    margin: 0 0 2.5rem 0;
  }

  .power-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-bottom: 2.5rem;
  }

  .power-item {
    text-align: center;
    padding: 2rem 1.5rem;
    background: var(--white);
    border-radius: 8px;
    border: 2px solid var(--blue-pale);
  }

  .power-item.highlighted {
    border-color: var(--red-primary);
    border-width: 3px;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.05) 0%, rgba(230, 57, 70, 0.1) 100%);
  }

  .power-label {
    font-size: 0.9rem;
    color: var(--blue-light);
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .power-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--blue-primary);
  }

  .power-item.highlighted .power-value {
    color: var(--red-primary);
  }

  .power-actions {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
  }

  .power-btn {
    padding: 1rem 2rem;
    background: var(--white);
    border: 2px solid var(--blue-primary);
    color: var(--blue-primary);
    border-radius: 6px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .power-btn:hover {
    background: var(--blue-primary);
    color: var(--white);
    transform: translateY(-2px);
  }

  .power-btn.primary {
    background: var(--red-primary);
    border-color: var(--red-primary);
    color: var(--white);
  }

  .power-btn.primary:hover {
    background: var(--red-dark);
    border-color: var(--red-dark);
  }

  /* Past Proposals Section */
  .past-proposals-section {
    padding: 4rem 2rem;
    background: var(--cream);
  }

  .past-proposals-list {
    max-width: 900px;
    margin: 0 auto 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .past-proposal-item {
    display: grid;
    grid-template-columns: 120px 100px 1fr;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    background: var(--white);
    border: 2px solid var(--blue-pale);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .past-proposal-item:hover {
    border-color: var(--blue-light);
    transform: translateX(4px);
  }

  .past-status {
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    text-align: center;
  }

  .past-status.passed {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  .past-status.failed {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .past-id {
    font-weight: 700;
    color: var(--blue-light);
    font-size: 0.95rem;
  }

  .past-title {
    color: var(--blue-primary);
    font-weight: 500;
    font-size: 1rem;
  }

  .view-all {
    text-align: center;
    margin-top: 2rem;
  }

  .view-all a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--blue-primary);
    text-decoration: none;
    font-weight: 700;
    font-size: 1.1rem;
    transition: all 0.2s ease;
  }

  .view-all a:hover {
    color: var(--red-primary);
    transform: translateX(4px);
  }

  /* Create CTA Section */
  .create-cta-section {
    padding: 5rem 2rem;
  }

  .create-box {
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
    padding: 4rem 3rem;
    background: var(--cream);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
  }

  .create-box h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin: 0 0 2rem 0;
  }

  .create-btn {
    padding: 1.25rem 3rem;
    background: var(--red-primary);
    color: var(--white);
    border: none;
    border-radius: 8px;
    font-weight: 800;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(230, 57, 70, 0.3);
  }

  .create-btn:hover {
    background: var(--red-dark);
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(230, 57, 70, 0.4);
  }

  .create-note {
    margin-top: 1.5rem;
    font-size: 0.95rem;
    color: var(--blue-light);
  }

  /* Responsive */
  @media (max-width: 968px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .power-grid {
      grid-template-columns: 1fr;
    }

    .power-actions {
      flex-direction: column;
    }

    .power-btn {
      width: 100%;
    }

    .past-proposal-item {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .past-status,
    .past-id {
      text-align: left;
    }
  }

  @media (max-width: 640px) {
    .container {
      padding: 0 1rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .section-title {
      font-size: 1.5rem;
    }

    .create-box {
      padding: 3rem 2rem;
    }

    .create-btn {
      width: 100%;
      padding: 1rem 2rem;
      font-size: 1.1rem;
    }
  }
</style>
