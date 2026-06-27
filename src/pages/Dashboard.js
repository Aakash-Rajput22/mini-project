import { auth } from "../firebase/firebase";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import "../styles/dashboard.css";

function Dashboard() {

  const user = auth.currentUser;

  return (
    <>
      <Navbar />

      <div className="dashboard">

        <h1>Welcome 👋</h1>

        <div className="card-container">

          <Card
            title="Name"
            value={user?.displayName || "No Name"}
          />

          <Card
            title="Email"
            value={user?.email || "No Email"}
          />

          <Card
            title="Verified"
            value={user?.emailVerified ? "Yes ✅" : "No ❌"}
          />

        </div>

      </div>
    </>
  );
}

export default Dashboard;