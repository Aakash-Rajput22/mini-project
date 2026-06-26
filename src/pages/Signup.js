import { Link } from "react-router-dom";
import InputField from "../components/InputField";
import Button from "../components/Button";
import "../styles/signup.css";

function Signup() {
  return (
    <div className="signup-container">
      <div className="signup-box">

        <h2>Create Account</h2>

        <InputField
          type="text"
          placeholder="Full Name"
        />

        <InputField
          type="email"
          placeholder="Email"
        />

        <InputField
          type="password"
          placeholder="Password"
        />

        <InputField
          type="password"
          placeholder="Confirm Password"
        />

        <Button text="Signup" />

        <p>
          Already have an account?
          <Link to="/login"> Login</Link>
        </p>

      </div>
    </div>
  );
}

export default Signup;