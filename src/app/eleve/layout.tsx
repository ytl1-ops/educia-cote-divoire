import { NavigationEleve } from "@/components/NavigationEleve";

export default function LayoutEleve({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <NavigationEleve />
      <div className="conteneur-page py-6">{children}</div>
    </div>
  );
}
