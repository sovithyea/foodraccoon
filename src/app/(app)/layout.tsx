import { Nav } from "@/components/shell/Nav";
import { InstallBanner } from "@/components/shell/InstallBanner";
import { OnboardingFlow } from "@/components/shell/OnboardingFlow";
import { SplashScreen } from "@/components/shell/SplashScreen";
import { AuthModal } from "@/components/auth/AuthModal";
import { OrientationLock } from "@/components/shell/OrientationLock";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Landscape guard — only shows on narrow landscape viewports */}
      <div className="landscape-block fixed inset-0 z-[500] flex-col items-center justify-center gap-4 bg-[#F5F0E8]">
        <img src="/icon-512x512.png" alt="FoodRaccoon" width={64} height={64} className="size-16 rounded-[18px] shadow-md" />
        <p className="text-base font-semibold text-[#2C2420]">FoodRaccoon works best in portrait mode</p>
      </div>
      <Nav />
      <InstallBanner />
      <OnboardingFlow />
      <SplashScreen />
      <AuthModal />
      <OrientationLock />
      <main className="relative h-full flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
