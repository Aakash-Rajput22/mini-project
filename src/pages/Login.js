import "../styles/login.css";
function Login() {
  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login</h2>

        <input type="email" placeholder="Enter Email" />

        <input type="password" placeholder="Enter Password" />

        <button>Login</button>

        <p>
          Don't have an account? <a href="/signup">Signup</a>
        </p>
      </div>
    </div>
  );
}

export default Login;