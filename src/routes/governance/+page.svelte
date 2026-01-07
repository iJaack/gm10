<script>
</script>

<svelte:head>
  <title>Governance - Ash Strategy</title>
  <meta name="description" content="Ash Strategy DAO governance" />
</svelte:head>

<section>
  <h1>DAO Governance</h1>
  <p>Token holders have full control over fund decisions</p>

  <div class="governance-info">
    <div class="info-box">
      <h3>$CATCH Token</h3>
      <p>Governance token for fund decisions</p>
      <p class="highlight">1 $CATCH = 1 Vote</p>
    </div>

    <div class="info-box">
      <h3>Voting Rights</h3>
      <p>Token holders vote on:</p>
      <ul>
        <li>Which cards to buy</li>
        <li>Which cards to sell</li>
        <li>Portfolio strategy</li>
      </ul>
    </div>

    <div class="info-box">
      <h3>Proposals</h3>
      <p>Anyone can submit proposals</p>
      <p>Quorum required for passage</p>
    </div>
  </div>

  <h2>Governance Process</h2>
  <div class="process">
    <div class="step">
      <div class="number">1</div>
      <h4>Proposal</h4>
      <p>Submit a proposal to buy/sell cards</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <div class="number">2</div>
      <h4>Discussion</h4>
      <p>Community discusses merits</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <div class="number">3</div>
      <h4>Vote</h4>
      <p>$CATCH holders vote</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <div class="number">4</div>
      <h4>Execute</h4>
      <p>Approved proposal executed</p>
    </div>
  </div>

  <h2>Fund Treasury</h2>
  <p>Fund manager controls treasury with community oversight</p>
  <ul>
    <li>All transactions visible on-chain</li>
    <li>Regular reporting to token holders</li>
    <li>Audited acquisitions from certified dealers</li>
    <li>Secure custody with insurance</li>
  </ul>

  <div class="cta">
    <a href="/">Back to Home</a>
  </div>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    padding: 2rem 1rem;
  }

  h1 {
    color: #ff3e00;
    font-size: 2.5rem;
    margin: 1rem 0;
    text-align: center;
  }

  h2 {
    font-size: 1.8rem;
    margin: 2rem 0 1rem 0;
    text-align: center;
  }

  p {
    text-align: center;
    margin: 0.5rem 0;
  }

  .governance-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
    width: 100%;
    max-width: 1000px;
  }

  .info-box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    border-radius: 12px;
    color: white;
  }

  .info-box h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }

  .info-box p {
    text-align: center;
    margin: 0.5rem 0;
  }

  .highlight {
    font-weight: bold;
    font-size: 1.1rem;
  }

  .info-box ul {
    text-align: center;
    list-style: none;
    padding: 0;
  }

  .info-box li {
    margin: 0.5rem 0;
  }

  .process {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 2rem 0;
    max-width: 1000px;
  }

  .step {
    background: #f5f5f5;
    border: 2px solid #667eea;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
    flex: 0 1 150px;
  }

  .number {
    width: 40px;
    height: 40px;
    background: #667eea;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.3rem;
    margin: 0 auto 1rem;
  }

  .step h4 {
    margin: 0.5rem 0;
  }

  .arrow {
    font-size: 1.5rem;
    color: #667eea;
    flex: 0 0 auto;
  }

  ul {
    max-width: 600px;
    margin: 1rem auto;
    text-align: left;
  }

  li {
    margin: 0.75rem 0;
  }

  .cta {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
    justify-content: center;
  }

  .cta a {
    padding: 0.75rem 1.5rem;
    background: #ff3e00;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
    transition: background 0.3s ease;
  }

  .cta a:hover {
    background: #e63800;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .governance-info {
      grid-template-columns: 1fr;
    }

    .process {
      flex-direction: column;
    }

    .arrow {
      transform: rotate(90deg);
    }
  }
</style>
