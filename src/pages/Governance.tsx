import Page from '../components/Page';

const phases = [
    {
        title: 'Round 1',
        subtitle: 'Manager-led, community-guided',
        body: 'The first live stretch is meant to stay tight. The manager picks targets within the published strategy, the community signals what it wants to see, and the public trail stays visible while the product proves itself.',
    },
    {
        title: 'Rounds 2-3',
        subtitle: 'Hybrid governance',
        body: 'This is where governance starts to matter more directly. Specific mandates, budgets, and guardrails move onchain before cards are chased, while the manager still handles fast execution once the lane is approved.',
    },
    {
        title: 'Later phase',
        subtitle: 'Fuller onchain control',
        body: 'Once the system is mature enough, governance takes over the heavier decisions with timelock discipline, stronger treasury controls, and less dependence on founder discretion.',
    },
] as const;

const powers = [
    'Approve future purchase mandates and sale mandates once the hybrid phase is live.',
    'Set later fundraising rounds and the rules around how supply enters circulation.',
    'Control chain-safe approvals, marketplace approvals, and valuation guardrails.',
    'Revoke the temporary deployer failsafe once it is no longer justified.',
    'Push the system from early operator-led flow into a harder governance posture over time.',
] as const;

export default function Governance() {
    return (
        <Page containerClassName="mx-auto max-w-5xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Governance</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">How governance is meant to unfold</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    The point is not to pretend full DAO governance is already live. GM10 should move through stages: tight operator control first, hybrid approval next, then fuller onchain governance once the card run and the system both have some history behind them.
                </p>
            </div>

            <section className="mt-16 grid grid-cols-1 gap-5">
                {phases.map((phase) => (
                    <div key={phase.title} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
                        <div className="text-xs uppercase tracking-[0.35em] text-white/35">{phase.title}</div>
                        <h2 className="mt-3 text-3xl font-bold text-white">{phase.subtitle}</h2>
                        <p className="mt-4 text-sm leading-7 text-white/60">{phase.body}</p>
                    </div>
                ))}
            </section>

            <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Future powers</div>
                <h2 className="mt-3 text-3xl font-bold text-white">What governance should eventually control</h2>
                <div className="mt-6 space-y-4">
                    {powers.map((item, index) => (
                        <div key={item} className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sm font-semibold text-sky-200">
                                {index + 1}
                            </div>
                            <p className="text-sm leading-7 text-white/60">{item}</p>
                        </div>
                    ))}
                </div>
            </section>
        </Page>
    );
}
