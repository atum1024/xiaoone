import { useRegion } from "@xiaoone/region";

export function useShowCrossBorderPublicCopy(): boolean {
  const { region, ipRegion, loading } = useRegion();

  if (ipRegion)
    return ipRegion === "overseas";

  if (loading)
    return false;

  return region === "overseas";
}
