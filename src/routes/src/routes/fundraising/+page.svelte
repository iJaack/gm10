<svelte:head>
	<title>Fundraising - Ash Strategy</title>
	<meta name="description" content="Join the Ash Strategy fundraising campaign" />
</svelte:head>

<section>
	<h1>Fundraising Campaign</h1>
	<p class="subtitle">Support the Tokenization of Pokemon Card Investments</p>

	<div class="fundraising-container">
		<div class="info-card">
			<h2>Campaign Goal</h2>
			<h3 class="amount">$1,000,000 USD</h3>
			<div class="allocation">
				<div class="allocation-item">
					<strong>Card Acquisition (80%)</strong> - $800,000
				</div>
				<div class="allocation-item">
					<strong>Project Startup (20%)</strong> - $200,000
				</div>
			</div>
		</div>

		<div class="info-card">
			<h2>What You Receive</h2>
			<ul class="benefits">
				<li><strong>$CATCH Tokens</strong> - Proportional to your investment</li>
				<li><strong>Portfolio Share</strong> - Ownership stake in graded cards</li>
				<li><strong>Voting Rights</strong> - Decide which cards to buy/sell</li>
				<li><strong>Revenue Share</strong> - Participate in card appreciation gains</li>
			</ul>
		</div>

		<div class="info-card">
			<h2>Investment Tiers</h2>
			<div class="tier-grid">
				<div class="tier">
					<h4>Collector</h4>
					<p class="tier-amount">$1,000+</p>
					<ul>
						<li>$CATCH Token Allocation</li>
						<li>Community Access</li>
						<li>Voting Rights</li>
					</ul>
				</div>
				<div class="tier">
					<h4>Investor</h4>
					<p class="tier-amount">$10,000+</p>
					<ul>
						<li>All Collector benefits</li>
						<li>Early Access</li>
						<li>Portfolio Updates</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="cta-container">
			<h2>Ready to Join?</h2>
			<a href="/" class="back-link">Back to Home</a>
		</div>
	</div>
</section>

<style>
	section {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		font-size: 2.5rem;
		color: #667eea;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		text-align: center;
		font-size: 1.3rem;
		color: #666;
		margin-bottom: 3rem;
	}

	.fundraising-container {
		display: grid;
		gap: 2rem;
	}

	.info-card {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.info-card h2 {
		color: #667eea;
		margin-bottom: 1.5rem;
	}

	.amount {
		font-size: 2.5rem;
		color: #764ba2;
		margin: 1rem 0;
	}

	.benefits {
		list-style: none;
		padding: 0;
	}

	.benefits li {
		padding: 0.75rem 0;
		border-bottom: 1px solid #eee;
	}

	.tier-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.tier {
		background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
		padding: 1.5rem;
		border-radius: 8px;
		border: 2px solid #667eea;
	}

	.tier h4 {
		color: #667eea;
		margin-bottom: 0.5rem;
	}

	.tier-amount {
		font-size: 1.5rem;
		font-weight: 700;
		color: #764ba2;
		margin-bottom: 1rem;
	}

	.tier ul {
		list-style: none;
		padding: 0;
	}

	.tier li {
		padding: 0.5rem 0;
		font-size: 0.9rem;
	}

	.cta-container {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 3rem;
		border-radius: 12px;
		text-align: center;
		color: white;
	}

	.cta-container h2 {
		color: white;
		margin-bottom: 2rem;
	}

	.back-link {
		color: white;
		text-decoration: underline;
		transition: opacity 0.2s;
	}

	.back-link:hover {
		opacity: 0.8;
	}
</style>