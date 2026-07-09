import { initials } from "./utils";

export default function Avatar({ user, size = 36 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (user?.photo) {
    return <img className="avatar" src={user.photo} alt={user.name} style={style} />;
  }
  return (
    <span className="avatar avatar-fallback" style={style}>
      {initials(user?.name)}
    </span>
  );
}
