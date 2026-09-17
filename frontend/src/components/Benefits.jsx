import "./Benefits.css";

const benefits = [
  {
    title: "Curated, not scraped",
    body: "Roles matched to your course and location — not a firehose of listings you'll never apply to.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: "Track every application",
    body: "One glance tells you what you've applied to, and what still needs your attention.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  {
    title: "Built for busy semesters",
    body: "Five-minute setup, no clutter. Open it between classes, not instead of them.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

export const Benefits = () => {
  return (
    <section className="benefits">
      <div className="benefits-grid">
        {benefits.map((benefit) => (
          <div className="benefit-card" key={benefit.title}>
            <div className="benefit-icon">{benefit.icon}</div>
            <h3 className="benefit-title">{benefit.title}</h3>
            <p className="benefit-body">{benefit.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Benefits;
