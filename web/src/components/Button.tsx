import "./Button.scss";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export default function Button({
  children,
  onClick,
  type = "button",
  disabled = false
}: ButtonProps) {
  return (
    <div className="button-wrapper">
      <button className="custom-button" onClick={onClick} type={type} disabled={disabled}>
        {children}
      </button>
    </div>
  );
}