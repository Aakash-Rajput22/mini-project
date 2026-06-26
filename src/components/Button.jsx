function Button({ text, onClick, type = "button" }) {
  return (
    <button
      type={type}
      className="btn"
      onClick={onClick}
    >
      {text}
    </button>
  );
}

export default Button;