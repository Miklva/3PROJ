import "./Button.scss";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
};

export default function Button({
  children,
  onClick,
}: ButtonProps) {
  return (
    <div className="button-wrapper">
      <button className="custom-button" onClick={onClick}>
        {children}
      </button>
    </div>
  );
}