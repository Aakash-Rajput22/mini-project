import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

function Navbar() {

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged Out Successfully");
      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <nav className="navbar">

      <div className="logo">
        Mini Project
      </div>

      <ul>

        <li>
          <Link to="/dashboard">
            Dashboard
          </Link>
        </li>

        <li>
          <Link to="/profile">
            Profile
          </Link>
        </li>

      </ul>

      <button
        className="logout-btn"
        onClick={handleLogout}
      >
        Logout
      </button>

    </nav>
  );
}

export default Navbar;