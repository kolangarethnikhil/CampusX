import Lottie from "lottie-react";

export default function LottiePlayer({
  animation,
  className = "w-40 h-40",
}: {
  animation: any;
  className?: string;
}) {
  return <Lottie animationData={animation} loop className={className} />;
}