import Navbar from "../components/Navbar";
import Card from "../components/Card";
import "../styles/dashboard.css";

function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="dashboard">

        <h1 className="dashboard-title">Dashboard</h1>

        <div className="card-container">

          <Card title="Users" value="120" />

          <Card title="Revenue" value="₹45,000" />

          <Card title="Orders" value="34" />

        </div>

      </div>
    </>
  );
}

export default Dashboard;