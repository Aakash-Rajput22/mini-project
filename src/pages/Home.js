import { Link } from "react-router-dom";
import "../styles/home.css";

function Home() {
return (
<div className="home-container">
<div className="home-box">
<h1>React Firebase Authentication</h1>
<p>
 Welcome to the Mini Project built using React.js and Firebase.
</p>
<div className="home-buttons">
<Link to="/login">
<button className="home-btn">Login</button>
</Link>
<Link to="/signup">
<button className="home-btn signup-btn">
Create Account
</button>
</Link>
</div>
</div>
</div>
);
}

export default Home;