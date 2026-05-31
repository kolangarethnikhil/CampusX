import booksIcon from "../assets/icons/books.svg";
import briefcaseIcon from "../assets/icons/briefcase.svg";
import footballIcon from "../assets/icons/football-free-kick.svg";
import homeLocationIcon from "../assets/icons/home-location.svg";
import homeRentIcon from "../assets/icons/home-rent.svg";
import laptopIcon from "../assets/icons/laptop.svg";
import moneyBagIcon from "../assets/icons/money-bag.svg";
import networkingIcon from "../assets/icons/networking.svg";
import sofaIcon from "../assets/icons/sofa.svg";
import technologistIcon from "../assets/icons/technologist.svg";
import verifiedBadgeIcon from "../assets/icons/verified-badge.svg";
import warningIcon from "../assets/icons/warning.svg";

export type AppIconName =
  | "books"
  | "briefcase"
  | "football"
  | "homeLocation"
  | "homeRent"
  | "laptop"
  | "moneyBag"
  | "networking"
  | "sofa"
  | "technologist"
  | "verifiedBadge"
  | "warning";

const icons: Record<AppIconName, string> = {
  books: booksIcon,
  briefcase: briefcaseIcon,
  football: footballIcon,
  homeLocation: homeLocationIcon,
  homeRent: homeRentIcon,
  laptop: laptopIcon,
  moneyBag: moneyBagIcon,
  networking: networkingIcon,
  sofa: sofaIcon,
  technologist: technologistIcon,
  verifiedBadge: verifiedBadgeIcon,
  warning: warningIcon,
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
  className?: string;
  alt?: string;
}

export default function AppIcon({ name, size = 24, className = "", alt = "" }: AppIconProps) {
  return (
    <img
      src={icons[name]}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
