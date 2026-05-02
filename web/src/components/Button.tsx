import "./Button.scss";

export type ButtonVariant =
  | "primary"
  | "ghost"
  | "danger"
  | "back"
  | "social"
  | "chip"
  | "tab"
  | "icon"
  | "nav";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: ButtonVariant;
  active?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
};

export default function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
  active = false,
  leftIcon,
  className = "",
}: ButtonProps) {
  const classes = ["btn", `btn--${variant}`, active ? "btn--active" : "", className]
    .filter(Boolean)
    .join(" ");

  const btn = (
    <button className={classes} onClick={onClick} type={type} disabled={disabled}>
      {leftIcon && <span className="btn__icon">{leftIcon}</span>}
      {children}
    </button>
  );

  if (variant === "primary" || type === "submit") {
    return <div className="btn-wrapper">{btn}</div>;
  }

  return btn;
}