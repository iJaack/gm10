<script>
  import PageHero from '$lib/components/PageHero.svelte';
  import ProposalCard from '$lib/components/ProposalCard.svelte';
  import StepFlow from '$lib/components/StepFlow.svelte';

  // Governance steps
  const governanceSteps = [
    { number: 1, label: 'Submit', subtitle: 'Proposal' },
    { number: 2, label: 'Discuss', subtitle: '3 days' },
    { number: 3, label: 'Vote', subtitle: '7 days' },
    { number: 4, label: 'Execute', subtitle: 'DAO' }
  ];

  // Active proposals
  const activeProposals = [
    {
      id: 'ASH-007',
      title: 'Acquire PSA 10 Charizard VMAX Alt Art',
      proposer: '0x8f3...2a1',
      endsIn: '2d 14h',
      forVotes: 15420,
      againstVotes: 4320,
      status: 'active'
    },
    {
      id: 'ASH-006',
      title: 'Sell CGC 8 Mewtwo Promo (target: $4,500+)',
      proposer: '0x2b1...9c4',
      endsIn: '5d 02h',
      forVotes: 8100,
      againstVotes: 11200,
      status: 'active'
    }
  ];

  // Past proposals
  const pastProposals = [
    { id: 'ASH-005', title: 'Acquire Umbreon Gold Star', status: 'passed' },
    { id: 'ASH-004', title: 'Q4 Strategy Adjustment', status: 'passed' },
    { id: 'ASH-003', title: 'Increase operations budget', status: 'failed' },
    { id: 'ASH-002', title: 'Acquire Pikachu Illustrator', status: 'passed' },
    { id: 'ASH-001', title: 'Initial portfolio strategy', status: 'passed' }
  ];

  // User's voting power (mock data)
  const userVotingPower = {
    balance: 1000,
    delegated: 250,
    total: 1250
  };
</script>

<svelte:head>
  <title>Governance - Ash Strategy</title>
  <meta name="description" content="Ash Strategy DAO governance" />
</svelte:head>

<div class="governance-page">
  <PageHero
    icon="🏛️"
    title="DAO Governance"
    subtitle="Shape the fund's future with your $CATCH vote"
  />

  <!-- Governance Stats -->
  <section class="stats-section">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Proposals</div>
          <div class="stat-value">12</div>
          <div class="stat-sublabel">total</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Voters</div>
          <div class="stat-value">89</div>
          <div class="stat-sublabel">active</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Quorum</div>
          <div class="stat-value">51%</div>
          <div class="stat-sublabel">required</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Your Vote</div>
          <div class="stat-value">{userVotingPower.total.toLocaleString()}</div>
          <div class="stat-sublabel">$CATCH</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Active Proposals -->
  <section class="active-proposals-section">
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
      <div class="process-card">
        <h2 class="section-title">How Governance Works</h2>
        <StepFlow steps={governanceSteps} />
      </div>
    </div>
  </section>

  <!-- Voting Power -->
  <section class="voting-power-section">
    <div class="container">
      <div class="voting-card">
        <h2 class="section-title">Your Voting Power</h2>
        <div class="power-grid">
          <div class="power-item">
            <div class="power-label">$CATCH Balance</div>
            <div class="power-value">{userVotingPower.balance.toLocaleString()}</div>
          </div>
          <div class="power-item">
            <div class="power-label">Delegated to You</div>
            <div class="power-value">{userVotingPower.delegated.toLocaleString()}</div>
          </div>
          <div class="power-item highlight">
            <div class="power-label">Total Power</div>
            <div class="power-value">{userVotingPower.total.toLocaleString()}</div>
          </div>
        </div>
        <div class="power-actions">
          <button class="action-btn secondary">Delegate Votes</button>
          <button class="action-btn primary">Create Proposal</button>
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
          <div class="past-proposal">
            <span class="proposal-status" class:passed={proposal.status === 'passed'} class:failed={proposal.status === 'failed'}>
              {proposal.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
            </span>
            <span class="proposal-id">{proposal.id}</span>
            <span class="proposal-title">{proposal.title}</span>
          </div>
        {/each}
      </div>
      <div class="view-all">
        <button class="view-all-btn">View All Proposals →</button>
      </div>
    </div>
  </section>

  <!-- Create Proposal CTA -->
  <section class="create-section">
    <div class="container">
      <div class="create-card">
        <h3 class="create-title">Have an idea for the fund?</h3>
        <button class="create-btn">Create Proposal</button>
        <p class="create-sublabel">Requires 100 $CATCH minimum to submit</p>
      </div>
    </div>
  </section>
</div>

<style>
  .governance-page {
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

  /* Stats Section */
  .stats-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    border-color: var(--accent-yellow);
    transform: translateY(-2px);
  }

  .stat-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: 2.25rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .stat-sublabel {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  /* Active Proposals Section */
  .active-proposals-section {
    padding: 2rem 0 3rem;
    background: var(--bg-dark);
  }

  .proposals-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Process Section */
  .process-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .process-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 3rem 2rem;
  }

  /* Voting Power Section */
  .voting-power-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .voting-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .power-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .power-item {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .power-item.highlight {
    border-color: var(--accent-yellow);
    background: linear-gradient(to bottom, var(--bg-elevated), var(--bg-card));
  }

  .power-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .power-value {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .power-item.highlight .power-value {
    color: var(--accent-yellow);
  }

  .power-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    padding-top: 1rem;
  }

  .action-btn {
    padding: 0.85rem 2rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .action-btn.primary {
    background: var(--accent-yellow);
    color: var(--bg-dark);
  }

  .action-btn.primary:hover {
    background: #fde68a;
    transform: translateY(-2px);
  }

  .action-btn.secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border);
  }

  .action-btn.secondary:hover {
    border-color: var(--accent-yellow);
    transform: translateY(-2px);
  }

  /* Past Proposals Section */
  .past-proposals-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .past-proposals-list {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .past-proposal {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.25rem;
    background: var(--bg-elevated);
    border-radius: 8px;
    border: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .proposal-status {
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    white-space: nowrap;
  }

  .proposal-status.passed {
    background: rgba(34, 197, 94, 0.2);
    color: var(--accent-green);
    border: 1px solid var(--accent-green);
  }

  .proposal-status.failed {
    background: rgba(239, 68, 68, 0.2);
    color: var(--accent-red);
    border: 1px solid var(--accent-red);
  }

  .proposal-id {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .proposal-title {
    flex: 1;
    font-size: 1rem;
    color: var(--text-secondary);
  }

  .view-all {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }

  .view-all-btn {
    padding: 0.85rem 2rem;
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 2px solid var(--accent-yellow);
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-all-btn:hover {
    background: var(--accent-yellow);
    color: var(--bg-dark);
    transform: translateY(-2px);
  }

  /* Create Section */
  .create-section {
    padding: 3rem 0 4rem;
    background: var(--bg-dark);
  }

  .create-card {
    background: var(--bg-card);
    border: 2px solid var(--accent-yellow);
    border-radius: 12px;
    padding: 4rem 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .create-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    text-align: center;
  }

  .create-btn {
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

  .create-btn:hover {
    background: #fde68a;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(252, 211, 77, 0.3);
  }

  .create-sublabel {
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Responsive Design */
  @media (max-width: 968px) {
    .container {
      padding: 0 1.5rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .power-grid {
      grid-template-columns: 1fr;
    }

    .power-actions {
      flex-direction: column;
    }

    .action-btn {
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    .container {
      padding: 0 1rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .past-proposal {
      flex-direction: column;
      align-items: flex-start;
    }

    .voting-card,
    .process-card,
    .create-card {
      padding: 2rem 1.5rem;
    }

    .create-btn {
      padding: 1rem 2rem;
      font-size: 1.1rem;
      width: 100%;
    }
  }
</style>
