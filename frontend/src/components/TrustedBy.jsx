import "./TrustedBy.css";

const companies = ["Google", "Microsoft", "Amazon", "Adobe", "Infosys"];

export const TrustedBy = () => {
  return (
    <section className="trusted-by">
      <span className="trusted-by-label">Used by students placed at</span>
      <div className="trusted-by-row">
        {companies.map((company) => (
          <span className="trusted-by-name" key={company}>
            {company}
          </span>
        ))}
      </div>
    </section>
  );
};

export default TrustedBy;
