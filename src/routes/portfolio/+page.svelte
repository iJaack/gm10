<script>
  import PageHero from '$lib/components/PageHero.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import CardTile from '$lib/components/CardTile.svelte';

  let activeFilter = 'All';
  let sortBy = 'value';
  let viewMode = 'grid';

  // Mock data for portfolio cards
  const cards = [
    {
      name: 'Charizard',
      set: 'Base Set',
      grade: '10',
      grader: 'PSA',
      price: '$12,400',
      performance: '+24%',
      performanceValue: 24,
      image: ''
    },
    {
      name: 'Pikachu',
      set: 'Illustrator',
      grade: '9.5',
      grader: 'BGS',
      price: '$8,200',
      performance: '+31%',
      performanceValue: 31,
      image: ''
    },
    {
      name: 'Umbreon',
      set: 'Gold Star',
      grade: '9',
      grader: 'CGC',
      price: '$6,800',
      performance: '+18%',
      performanceValue: 18,
      image: ''
    },
    {
      name: 'Blastoise',
      set: 'Base Set',
      grade: '9',
      grader: 'PSA',
      price: '$4,200',
      performance: '+15%',
      performanceValue: 15,
      image: ''
    },
    {
      name: 'Venusaur',
      set: '1st Edition',
      grade: '8',
      grader: 'PSA',
      price: '$3,800',
      performance: '+12%',
      performanceValue: 12,
      image: ''
    },
    {
      name: 'Mewtwo',
      set: 'Promo',
      grade: '10',
      grader: 'CGC',
      price: '$3,200',
      performance: '+8%',
      performanceValue: 8,
      image: ''
    }
  ];

  // Recent activity mock data
  const recentActivity = [
    { type: 'acquired', card: 'Blastoise Base Set PSA 9', date: 'Jan 8' },
    { type: 'acquired', card: 'Venusaur 1st Ed PSA 8', date: 'Jan 3' },
    { type: 'sold', card: 'Mewtwo Promo CGC 8.5', date: 'Dec 28' }
  ];
</script>

<svelte:head>
  <title>Portfolio - Ash Strategy</title>
  <meta name="description" content="Ash Strategy portfolio holdings" />
</svelte:head>

<div class="portfolio-page">
  <PageHero
    icon="📊"
    title="Fund Portfolio"
    subtitle="Real-time tracking of our graded card holdings"
  />

  <!-- Metrics Bar -->
  <section class="metrics-section">
    <div class="container">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">AUM</div>
          <div class="metric-value">$127,450</div>
          <div class="metric-sublabel">Assets Under Management</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">NAV</div>
          <div class="metric-value">$1.24</div>
          <div class="metric-sublabel">per CATCH token</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">YTD Performance</div>
          <div class="metric-value positive">+18.4%</div>
          <div class="metric-sublabel">Year to date</div>
        </div>

        <div class="metric-card">
          <div class="metric-label"># Cards</div>
          <div class="metric-value">23</div>
          <div class="metric-sublabel">Total Holdings</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Filter Bar -->
  <section class="filter-section">
    <div class="container">
      <FilterBar
        bind:activeFilter
        bind:sortBy
        bind:viewMode
        onFilterChange={(filter) => { activeFilter = filter; }}
        onSortChange={(sort) => { sortBy = sort; }}
        onViewChange={(view) => { viewMode = view; }}
      />
    </div>
  </section>

  <!-- Card Grid -->
  <section class="cards-section">
    <div class="container">
      <div class="card-grid" class:list-view={viewMode === 'list'}>
        {#each cards as card}
          <CardTile {...card} />
        {/each}
      </div>
    </div>
  </section>

  <!-- Allocation Chart -->
  <section class="allocation-section">
    <div class="container">
      <div class="allocation-card">
        <h2 class="section-title">Portfolio Diversification</h2>
        <div class="allocation-content">
          <div class="chart-placeholder">
            <div class="pie-chart">📊</div>
          </div>
          <div class="allocation-list">
            <h3 class="allocation-subtitle">By Set:</h3>
            <ul class="allocation-items">
              <li><span class="dot" style="background: #fcd34d;"></span> Base Set <strong>45%</strong></li>
              <li><span class="dot" style="background: #22c55e;"></span> 1st Edition <strong>25%</strong></li>
              <li><span class="dot" style="background: #3b82f6;"></span> Gold Star <strong>15%</strong></li>
              <li><span class="dot" style="background: #ef4444;"></span> Promo <strong>15%</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Grading Breakdown -->
  <section class="grading-section">
    <div class="container">
      <div class="grading-grid">
        <div class="grading-card">
          <div class="grading-company psa">PSA</div>
          <div class="grading-count">12</div>
          <div class="grading-label">cards</div>
        </div>

        <div class="grading-card">
          <div class="grading-company bgs">BGS</div>
          <div class="grading-count">6</div>
          <div class="grading-label">cards</div>
        </div>

        <div class="grading-card">
          <div class="grading-company cgc">CGC</div>
          <div class="grading-count">4</div>
          <div class="grading-label">cards</div>
        </div>

        <div class="grading-card">
          <div class="grading-company sgc">SGC</div>
          <div class="grading-count">1</div>
          <div class="grading-label">card</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Recent Activity -->
  <section class="activity-section">
    <div class="container">
      <h2 class="section-title">Recent Activity</h2>
      <div class="activity-feed">
        {#each recentActivity as activity}
          <div class="activity-item">
            <span class="activity-icon">{activity.type === 'acquired' ? '📥' : '📤'}</span>
            <span class="activity-text">
              {activity.type === 'acquired' ? 'Acquired' : 'Sold'}: {activity.card}
            </span>
            <span class="activity-date">{activity.date}</span>
          </div>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  .portfolio-page {
    width: 100%;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  /* Metrics Section */
  .metrics-section {
    padding: 3rem 0;
    background: var(--bg-dark);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.3s ease;
  }

  .metric-card:hover {
    border-color: var(--accent-yellow);
    transform: translateY(-2px);
  }

  .metric-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    font-size: 2.25rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .metric-value.positive {
    color: var(--accent-green);
  }

  .metric-sublabel {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  /* Filter Section */
  .filter-section {
    padding: 2rem 0;
    background: var(--bg-dark);
  }

  /* Cards Section */
  .cards-section {
    padding: 2rem 0;
    background: var(--bg-dark);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
  }

  .card-grid.list-view {
    grid-template-columns: 1fr;
  }

  /* Allocation Section */
  .allocation-section {
    padding: 4rem 0;
    background: var(--bg-dark);
  }

  .allocation-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 3rem;
  }

  .section-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 2rem 0;
    text-align: center;
  }

  .allocation-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    align-items: center;
  }

  .chart-placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .pie-chart {
    font-size: 8rem;
    opacity: 0.3;
  }

  .allocation-subtitle {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1.5rem 0;
  }

  .allocation-items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .allocation-items li {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 1rem;
    color: var(--text-secondary);
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Grading Section */
  .grading-section {
    padding: 2rem 0 4rem;
    background: var(--bg-dark);
  }

  .grading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .grading-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: all 0.3s ease;
  }

  .grading-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent-yellow);
  }

  .grading-company {
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .grading-company.psa {
    color: #c41e3a;
  }

  .grading-company.bgs {
    color: #ffd700;
  }

  .grading-company.cgc {
    color: #1e90ff;
  }

  .grading-company.sgc {
    color: #22c55e;
  }

  .grading-count {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .grading-label {
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  /* Activity Section */
  .activity-section {
    padding: 0 0 4rem;
    background: var(--bg-dark);
  }

  .activity-feed {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-elevated);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .activity-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .activity-text {
    flex: 1;
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .activity-date {
    font-size: 0.9rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* Responsive Design */
  @media (max-width: 968px) {
    .container {
      padding: 0 1.5rem;
    }

    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .allocation-content {
      grid-template-columns: 1fr;
    }

    .pie-chart {
      font-size: 6rem;
    }
  }

  @media (max-width: 640px) {
    .container {
      padding: 0 1rem;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .card-grid {
      grid-template-columns: 1fr;
    }

    .allocation-card {
      padding: 2rem 1.5rem;
    }

    .grading-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .activity-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
