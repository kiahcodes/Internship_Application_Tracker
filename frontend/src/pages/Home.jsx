import { Hero } from "../components/Hero.jsx";
import { TrustedBy } from "../components/TrustedBy.jsx";
import { Benefits } from "../components/Benefits.jsx";
import "./Home.css";
import "../components/Hero.css";

export function Home() {
  return (
    <div className="home-page">
      <Hero />
      <TrustedBy />
      <Benefits />
    </div>
  );
}
export default Home;
