import { useResolvedAvatarUrl } from "../hooks/useResolvedAvatarUrl";
import { buildAvatarGradient, buildUserInitials } from "../lib/avatar";

type Props = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  accessToken?: string | null;
  className?: string;
};

export function UserAvatar({ userId, name, avatarUrl, accessToken, className = "" }: Props) {
  const displayUrl = useResolvedAvatarUrl(avatarUrl, accessToken);
  const avatarClass = `user-avatar${className ? ` ${className}` : ""}`;

  if (displayUrl) {
    return (
      <span className={avatarClass}>
        <img src={displayUrl} alt="" />
      </span>
    );
  }

  return (
    <span className={avatarClass} style={{ backgroundImage: buildAvatarGradient(userId) }}>
      {buildUserInitials(name, "")}
    </span>
  );
}
