<script>
  import Navbar from '$lib/components/Navbar.svelte';
  import PageHero from '$lib/components/PageHero.svelte';
  import Footer from '$lib/components/Footer.svelte';

  // Mock data - replace with real data later
  const metrics = [
    { label: 'AUM', value: '$127,450', sublabel: '' },
    { label: 'NAV', value: '$1.24', sublabel: 'per CATCH' },
    { label: 'YTD Perf', value: '+18.4%', sublabel: '', positive: true },
    { label: '# Cards', value: '23', sublabel: 'Holdings' }
  ];

  const cards = [
    { name: 'Charizard', set: 'Base Set', grade: 'PSA 10', value: '$12,400', change: '+24%', positive: true },
    { name: 'Pikachu', set: 'Illustrator', grade: 'BGS 9.5', value: '$8,200', change: '+31%', positive: true },
    { name: 'Umbreon', set: 'Gold Star', grade: 'CGC 9', value: '$6,800', change: '+18%', positive: true },
    { name: 'Blastoise', set: 'Base Set', grade: 'PSA 9', value: '$5,200', change: '+12%', positive: true },
    { name: 'Venusaur', set: '1st Edition', grade: 'PSA 8', value: '$4,100', change: '+8%', positive: true },
    { name: 'Mewtwo', set: 'Promo', grade: 'CGC 8.5', value: '$3,900', change: '+15%', positive: true }
  ];

  const graders = [
    { name: 'PSA', count: 12 },
    { name: 'BGS', count: 6 },
    { name: 'CGC', count: 4 },
    { name: 'SGC', count: 1 }
  ];

  const activities = [
    { type: 'acquire', card: 'Blastoise Base Set PSA 9', date: 'Jan 8' },
    { type: 'acquire', card: 'Venusaur 1st Ed PSA 8', date: 'Jan 3' },
    { type: 'sell', card: 'Mewtwo Promo CGC 8.5', date: 'Dec 28' }
  ];
</script>

<svelte:head>
  <title>Portfolio - Ash Strategy</title>
  <meta name="description" content="Real-time tracking of our graded card holdings" />
</svelte:head>

<div class="page-wrapper">
  <Navbar />

  <main>
    <PageHero
      icon="📊"
      title="Fund Portfolio"
      subtitle="Real-time tracking of our graded card holdings"
    />

    <!-- Metrics Bar -->
    <section class="metrics-section">
      <div class="container">
        <div class="metrics-grid">
          {#each metrics as metric}
            <div class="metric-card">
              <div class="metric-label">{metric.label}</div>
              <div class="metric-value" class:positive={metric.positive}>{metric.value}</div>
              {#if metric.sublabel}
                <div class="metric-sublabel">{metric.sublabel}</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- Filter Bar -->
    <section class="filter-section">
      <div class="container">
        <div class="filter-bar">
          <div class="filter-buttons">
            <button class="filter-btn active">All</button>
            <button class="filter-btn">PSA</button>
            <button class="filter-btn">BGS</button>
            <button class="filter-btn">CGC</button>
          </div>
          <div class="filter-sort">
            <label for="sort">Sort:</label>
            <select id="sort">
              <option>Value (High to Low)</option>
              <option>Value (Low to High)</option>
              <option>Performance</option>
              <option>Date Added</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Card Grid -->
    <section class="cards-section">
      <div class="container">
        <div class="cards-grid">
          {#each cards as card}
            <div class="card-item">
              <div class="card-image">
                <div class="card-placeholder"></div>
                <div class="card-grade-badge">{card.grade}</div>
              </div>
              <div class="card-info">
                <h3 class="card-name">{card.name}</h3>
                <p class="card-set">{card.set}</p>
                <div class="card-stats">
                  <div class="card-value">{card.value}</div>
                  <div class="card-change" class:positive={card.positive}>{card.change} ▲</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- Allocation & Grading -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <!-- Allocation Chart -->
          <div class="stat-box">
            <h2>Portfolio Diversification</h2>
            <div class="allocation-chart">
              <div class="chart-placeholder">
                <div class="pie-chart">📊</div>
              </div>
              <div class="allocation-list">
                <div class="allocation-item">
                  <span class="dot" style="background: var(--blue-primary)"></span>
                  <span class="label">Base Set</span>
                  <span class="percentage">45%</span>
                </div>
                <div class="allocation-item">
                  <span class="dot" style="background: var(--blue-light)"></span>
                  <span class="label">1st Edition</span>
                  <span class="percentage">25%</span>
                </div>
                <div class="allocation-item">
                  <span class="dot" style="background: var(--blue-pale)"></span>
                  <span class="label">Gold Star</span>
                  <span class="percentage">15%</span>
                </div>
                <div class="allocation-item">
                  <span class="dot" style="background: var(--cream)"></span>
                  <span class="label">Promo</span>
                  <span class="percentage">15%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Grading Breakdown -->
          <div class="stat-box">
            <h2>Grading Breakdown</h2>
            <div class="graders-grid">
              {#each graders as grader}
                <div class="grader-card">
                  <div class="grader-name">{grader.name}</div>
                  <div class="grader-count">{grader.count}</div>
                  <div class="grader-label">cards</div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Activity -->
    <section class="activity-section">
      <div class="container">
        <h2>Recent Activity</h2>
        <div class="activity-feed">
          {#each activities as activity}
            <div class="activity-item">
              <div class="activity-icon">
                {activity.type === 'acquire' ? '📥' : '📤'}
              </div>
              <div class="activity-text">
                <strong>{activity.type === 'acquire' ? 'Acquired' : 'Sold'}:</strong> {activity.card}
              </div>
              <div class="activity-date">{activity.date}</div>
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

  /* Metrics Section */
  .metrics-section {
    padding: 3rem 2rem;
    background: var(--cream);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }

  .metric-card {
    text-align: center;
    padding: 1.5rem;
    background: var(--white);
    border-radius: 8px;
    border: 1px solid var(--blue-pale);
    transition: all 0.2s ease;
  }

  .metric-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(29, 53, 87, 0.1);
  }

  .metric-label {
    font-size: 0.85rem;
    color: var(--blue-light);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin-bottom: 0.25rem;
  }

  .metric-value.positive {
    color: #10b981;
  }

  .metric-sublabel {
    font-size: 0.75rem;
    color: var(--blue-light);
    opacity: 0.8;
  }

  /* Filter Section */
  .filter-section {
    padding: 2rem;
    background: var(--white);
    border-bottom: 1px solid var(--blue-pale);
  }

  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .filter-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .filter-btn {
    padding: 0.5rem 1.25rem;
    background: var(--cream);
    border: 2px solid var(--blue-pale);
    color: var(--blue-primary);
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    background: var(--blue-pale);
  }

  .filter-btn.active {
    background: var(--blue-primary);
    color: var(--white);
    border-color: var(--blue-primary);
  }

  .filter-sort {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-sort label {
    font-weight: 600;
    color: var(--blue-primary);
  }

  .filter-sort select {
    padding: 0.5rem 1rem;
    border: 2px solid var(--blue-pale);
    border-radius: 6px;
    background: var(--white);
    color: var(--blue-primary);
    font-weight: 500;
    cursor: pointer;
  }

  /* Cards Section */
  .cards-section {
    padding: 3rem 2rem;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
  }

  .card-item {
    background: var(--white);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .card-item:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 32px rgba(29, 53, 87, 0.15);
    border-color: var(--blue-light);
  }

  .card-image {
    position: relative;
    width: 100%;
    padding-top: 140%;
    background: linear-gradient(135deg, var(--blue-light) 0%, var(--blue-pale) 100%);
  }

  .card-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
  }

  .card-grade-badge {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.95);
    color: var(--blue-primary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .card-info {
    padding: 1.5rem;
  }

  .card-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--blue-primary);
    margin: 0 0 0.25rem 0;
  }

  .card-set {
    font-size: 0.9rem;
    color: var(--blue-light);
    margin: 0 0 1rem 0;
  }

  .card-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--blue-primary);
  }

  .card-change {
    font-size: 1rem;
    font-weight: 700;
  }

  .card-change.positive {
    color: #10b981;
  }

  /* Stats Section */
  .stats-section {
    padding: 3rem 2rem;
    background: var(--cream);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .stat-box {
    background: var(--white);
    border: 2px solid var(--blue-pale);
    border-radius: 12px;
    padding: 2rem;
  }

  .stat-box h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--blue-primary);
    margin: 0 0 1.5rem 0;
  }

  .allocation-chart {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: center;
  }

  .chart-placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .pie-chart {
    font-size: 6rem;
  }

  .allocation-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .allocation-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
  }

  .allocation-item .label {
    flex: 1;
    font-weight: 500;
    color: var(--blue-primary);
  }

  .allocation-item .percentage {
    font-weight: 700;
    color: var(--blue-primary);
  }

  .graders-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .grader-card {
    background: var(--cream);
    border: 2px solid var(--blue-pale);
    border-radius: 8px;
    padding: 1.5rem 1rem;
    text-align: center;
    transition: all 0.2s ease;
  }

  .grader-card:hover {
    transform: translateY(-4px);
    border-color: var(--blue-light);
  }

  .grader-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--blue-primary);
    margin-bottom: 0.5rem;
  }

  .grader-count {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
  }

  .grader-label {
    font-size: 0.85rem;
    color: var(--blue-light);
    margin-top: 0.25rem;
  }

  /* Activity Section */
  .activity-section {
    padding: 3rem 2rem;
  }

  .activity-section h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--blue-primary);
    margin: 0 0 1.5rem 0;
    text-align: center;
  }

  .activity-feed {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--cream);
    border: 1px solid var(--blue-pale);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .activity-item:hover {
    background: var(--white);
    border-color: var(--blue-light);
  }

  .activity-icon {
    font-size: 1.5rem;
  }

  .activity-text {
    flex: 1;
    color: var(--blue-primary);
  }

  .activity-date {
    font-size: 0.9rem;
    color: var(--blue-light);
    font-weight: 600;
  }

  /* Responsive */
  @media (max-width: 968px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .allocation-chart {
      grid-template-columns: 1fr;
    }

    .graders-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .container {
      padding: 0 1rem;
    }

    .metrics-section,
    .filter-section,
    .cards-section,
    .stats-section,
    .activity-section {
      padding: 2rem 1rem;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .cards-grid {
      grid-template-columns: 1fr;
    }

    .filter-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-buttons {
      width: 100%;
      justify-content: space-between;
    }

    .filter-sort {
      width: 100%;
      justify-content: space-between;
    }

    .graders-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
