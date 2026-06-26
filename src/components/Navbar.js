import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        Mini Project
      </div>

      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/">Home</Link></li>
      </ul>

      <button className="logout-btn">
        Logout
      </button>

    </nav>
  );
}

export default Navbar;