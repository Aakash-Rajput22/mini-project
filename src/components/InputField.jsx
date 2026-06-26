function InputField({
  type,
  placeholder,
  value,
  onChange,
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="input-field"
      value={value}
      onChange={onChange}
    />
  );
}

export default InputField;