<script>
  export let id = '';
  export let title = '';
  export let proposer = '';
  export let endsIn = '';
  export let forVotes = 0;
  export let againstVotes = 0;
  export let status = 'active'; // 'active', 'passed', 'failed'
  export let onVoteFor = () => {};
  export let onVoteAgainst = () => {};
  export let onViewDetails = () => {};

  $: totalVotes = forVotes + againstVotes;
  $: forPercentage = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;
  $: againstPercentage = totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0;
</script>

<div class="proposal-card" class:active={status === 'active'} class:passed={status === 'passed'} class:failed={status === 'failed'}>
  <div class="proposal-header">
    <div class="proposal-status">
      {#if status === 'active'}
        🔴 ACTIVE
      {:else if status === 'passed'}
        ✅ PASSED
      {:else if status === 'failed'}
        ❌ FAILED
      {/if}
      <span class="proposal-id">{id}</span>
    </div>
  </div>

  <div class="proposal-divider"></div>

  <h3 class="proposal-title">{title}</h3>

  <div class="proposal-meta">
    <span>Proposed by: {proposer}</span>
    {#if status === 'active' && endsIn}
      <span class="proposal-deadline">Ends in: {endsIn}</span>
    {/if}
  </div>

  <div class="proposal-votes">
    <div class="vote-bar">
      <div class="vote-section for">
        <div class="vote-label">For:</div>
        <div class="vote-progress">
          <div class="vote-fill" style="width: {forPercentage}%;"></div>
        </div>
        <div class="vote-stats">
          <span class="vote-percentage">{forPercentage.toFixed(0)}%</span>
          <span class="vote-count">{forVotes.toLocaleString()} $CATCH</span>
        </div>
      </div>

      <div class="vote-section against">
        <div class="vote-label">Against:</div>
        <div class="vote-progress against">
          <div class="vote-fill" style="width: {againstPercentage}%;"></div>
        </div>
        <div class="vote-stats">
          <span class="vote-percentage">{againstPercentage.toFixed(0)}%</span>
          <span class="vote-count">{againstVotes.toLocaleString()} $CATCH</span>
        </div>
      </div>
    </div>
  </div>

  {#if status === 'active'}
    <div class="proposal-actions">
      <button class="action-btn vote-for" on:click={onVoteFor}>Vote For</button>
      <button class="action-btn vote-against" on:click={onVoteAgainst}>Vote Against</button>
      <button class="action-btn view-details" on:click={onViewDetails}>View Details →</button>
    </div>
  {:else}
    <div class="proposal-actions">
      <button class="action-btn view-details full-width" on:click={onViewDetails}>View Details →</button>
    </div>
  {/if}
</div>

<style>
  .proposal-card {
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    transition: all 0.3s ease;
  }

  .proposal-card.active {
    border-color: var(--accent-red);
  }

  .proposal-card.passed {
    border-color: var(--accent-green);
  }

  .proposal-card.failed {
    border-color: var(--text-muted);
  }

  .proposal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .proposal-status {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .proposal-id {
    color: var(--text-muted);
  }

  .proposal-divider {
    height: 1px;
    background: var(--border);
  }

  .proposal-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.4;
  }

  .proposal-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .proposal-deadline {
    color: var(--accent-yellow);
    font-weight: 600;
  }

  .proposal-votes {
    padding: 1rem 0;
  }

  .vote-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .vote-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .vote-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .vote-progress {
    height: 10px;
    background: var(--bg-elevated);
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .vote-fill {
    height: 100%;
    background: var(--accent-green);
    transition: width 0.3s ease;
  }

  .vote-progress.against .vote-fill {
    background: var(--accent-red);
  }

  .vote-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .vote-percentage {
    font-weight: 700;
    color: var(--text-primary);
  }

  .vote-count {
    color: var(--text-secondary);
  }

  .proposal-actions {
    display: flex;
    gap: 1rem;
    padding-top: 0.5rem;
  }

  .action-btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }

  .vote-for {
    background: var(--accent-green);
    color: var(--bg-dark);
  }

  .vote-for:hover {
    background: #16a34a;
    transform: translateY(-2px);
  }

  .vote-against {
    background: var(--accent-red);
    color: var(--text-primary);
  }

  .vote-against:hover {
    background: #dc2626;
    transform: translateY(-2px);
  }

  .view-details {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--accent-yellow);
  }

  .view-details:hover {
    background: var(--accent-yellow);
    color: var(--bg-dark);
    transform: translateY(-2px);
  }

  .view-details.full-width {
    flex: none;
    width: 100%;
  }

  @media (max-width: 768px) {
    .proposal-card {
      padding: 1.5rem;
    }

    .vote-bar {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .proposal-actions {
      flex-direction: column;
    }

    .action-btn {
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    .proposal-title {
      font-size: 1.15rem;
    }

    .proposal-meta {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
