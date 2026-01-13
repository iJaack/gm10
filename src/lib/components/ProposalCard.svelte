<script>
  export let status = 'active'; // 'active', 'passed', 'failed'
  export let proposalId = '';
  export let title = '';
  export let proposedBy = '';
  export let endsIn = '';
  export let votesFor = 0;
  export let votesAgainst = 0;
  export let showActions = true;

  $: totalVotes = votesFor + votesAgainst;
  $: forPercentage = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
  $: againstPercentage = totalVotes > 0 ? (votesAgainst / totalVotes) * 100 : 0;

  $: statusColor = {
    active: '#E63946',
    passed: '#10b981',
    failed: '#ef4444'
  }[status];

  $: statusIcon = {
    active: '🔴',
    passed: '✅',
    failed: '❌'
  }[status];
</script>

<div class="proposal-card">
  <div class="proposal-header">
    <div class="status-badge" style="background: {statusColor}">
      <span class="status-icon">{statusIcon}</span>
      <span class="status-text">{status.toUpperCase()}</span>
    </div>
    <div class="proposal-id">{proposalId}</div>
  </div>

  <h3 class="proposal-title">{title}</h3>

  <div class="proposal-meta">
    <span>Proposed by: <strong>{proposedBy}</strong></span>
    {#if endsIn}
      <span class="divider">|</span>
      <span>Ends in: <strong>{endsIn}</strong></span>
    {/if}
  </div>

  {#if totalVotes > 0}
    <div class="votes-section">
      <div class="vote-bar">
        <div class="vote-for" style="width: {forPercentage}%"></div>
      </div>

      <div class="vote-stats">
        <div class="vote-stat">
          <span class="vote-label">For:</span>
          <span class="vote-percentage for">{forPercentage.toFixed(0)}%</span>
          <span class="vote-amount">{votesFor.toLocaleString()} $CATCH</span>
        </div>
        <div class="vote-stat">
          <span class="vote-label">Against:</span>
          <span class="vote-percentage against">{againstPercentage.toFixed(0)}%</span>
          <span class="vote-amount">{votesAgainst.toLocaleString()} $CATCH</span>
        </div>
      </div>
    </div>
  {/if}

  {#if showActions && status === 'active'}
    <div class="proposal-actions">
      <button class="vote-btn vote-for-btn">Vote For</button>
      <button class="vote-btn vote-against-btn">Vote Against</button>
      <a href="#" class="view-details">View Details →</a>
    </div>
  {/if}
</div>

<style>
  .proposal-card {
    background: var(--white);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    transition: all 0.3s ease;
  }

  .proposal-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(29, 53, 87, 0.15);
    border-color: var(--blue-light);
  }

  .proposal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    color: var(--white);
    font-weight: 700;
    font-size: 0.85rem;
  }

  .status-icon {
    font-size: 1rem;
  }

  .proposal-id {
    font-weight: 700;
    color: var(--blue-light);
    font-size: 0.9rem;
  }

  .proposal-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--blue-primary);
    margin: 1rem 0;
    line-height: 1.4;
  }

  .proposal-meta {
    font-size: 0.9rem;
    color: var(--blue-light);
    margin-bottom: 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .divider {
    opacity: 0.5;
  }

  .votes-section {
    margin: 1.5rem 0;
  }

  .vote-bar {
    height: 30px;
    background: var(--cream);
    border-radius: 15px;
    overflow: hidden;
    margin-bottom: 1rem;
    border: 2px solid var(--blue-pale);
  }

  .vote-for {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    transition: width 0.5s ease;
  }

  .vote-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .vote-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .vote-label {
    font-size: 0.85rem;
    color: var(--blue-light);
    font-weight: 600;
  }

  .vote-percentage {
    font-size: 1.5rem;
    font-weight: 800;
  }

  .vote-percentage.for {
    color: #10b981;
  }

  .vote-percentage.against {
    color: #ef4444;
  }

  .vote-amount {
    font-size: 0.9rem;
    color: var(--blue-light);
  }

  .proposal-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  .vote-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .vote-for-btn {
    background: #10b981;
    color: var(--white);
  }

  .vote-for-btn:hover {
    background: #059669;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .vote-against-btn {
    background: var(--cream);
    color: var(--blue-primary);
    border: 2px solid var(--blue-pale);
  }

  .vote-against-btn:hover {
    background: var(--blue-pale);
    transform: translateY(-2px);
  }

  .view-details {
    padding: 0.75rem 1.5rem;
    color: var(--blue-primary);
    text-decoration: none;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    transition: all 0.2s ease;
  }

  .view-details:hover {
    color: var(--blue-light);
    transform: translateX(4px);
  }

  @media (max-width: 640px) {
    .proposal-card {
      padding: 1.5rem;
    }

    .proposal-title {
      font-size: 1.2rem;
    }

    .vote-stats {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .proposal-actions {
      flex-direction: column;
    }

    .vote-btn, .view-details {
      width: 100%;
      text-align: center;
      justify-content: center;
    }
  }
</style>
