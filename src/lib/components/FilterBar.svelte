<script>
  export let activeFilter = 'All';
  export let filters = ['All', 'PSA', 'BGS', 'CGC', 'SGC'];
  export let sortBy = 'value';
  export let sortOptions = [
    { value: 'value', label: 'Value' },
    { value: 'performance', label: 'Performance' },
    { value: 'date', label: 'Date Added' }
  ];
  export let viewMode = 'grid';
  export let onFilterChange = (filter) => {};
  export let onSortChange = (sort) => {};
  export let onViewChange = (view) => {};
</script>

<div class="filter-bar">
  <div class="filter-buttons">
    {#each filters as filter}
      <button
        class="filter-btn"
        class:active={activeFilter === filter}
        on:click={() => onFilterChange(filter)}
      >
        {filter}
      </button>
    {/each}
  </div>

  <div class="filter-controls">
    <div class="sort-control">
      <label for="sort">Sort:</label>
      <select id="sort" bind:value={sortBy} on:change={() => onSortChange(sortBy)}>
        {#each sortOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div class="view-toggle">
      <button
        class="view-btn"
        class:active={viewMode === 'grid'}
        on:click={() => onViewChange('grid')}
        aria-label="Grid view"
      >
        🔲
      </button>
      <button
        class="view-btn"
        class:active={viewMode === 'list'}
        on:click={() => onViewChange('list')}
        aria-label="List view"
      >
        📋
      </button>
    </div>
  </div>
</div>

<style>
  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    padding: 1.5rem 2rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    flex-wrap: wrap;
  }

  .filter-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 0.6rem 1.25rem;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
    border-color: var(--accent-yellow);
  }

  .filter-btn.active {
    background: var(--accent-yellow);
    color: var(--bg-dark);
    border-color: var(--accent-yellow);
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .sort-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sort-control label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .sort-control select {
    padding: 0.6rem 1rem;
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sort-control select:hover {
    border-color: var(--accent-yellow);
  }

  .sort-control select:focus {
    outline: none;
    border-color: var(--accent-yellow);
  }

  .view-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .view-btn {
    width: 40px;
    height: 40px;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .view-btn:hover {
    background: var(--bg-card);
    border-color: var(--accent-yellow);
  }

  .view-btn.active {
    background: var(--accent-yellow);
    border-color: var(--accent-yellow);
  }

  @media (max-width: 768px) {
    .filter-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
      padding: 1rem;
    }

    .filter-buttons {
      justify-content: center;
    }

    .filter-controls {
      justify-content: space-between;
    }
  }

  @media (max-width: 640px) {
    .filter-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }

    .sort-control {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .sort-control select {
      width: 100%;
    }
  }
</style>
