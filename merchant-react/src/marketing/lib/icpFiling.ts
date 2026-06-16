import type { LocalizedCopy } from "./sitePreferences";

type IcpFiling = {
  zh: string;
  en: string;
};

const DEFAULT_ICP_FILING: IcpFiling = {
  zh: "粤ICP备2026061441号",
  en: "粤ICP备2026061441号",
};

const NET_ICP_FILING: IcpFiling = {
  zh: "粤ICP备2026061441号",
  en: "粤ICP备2026061441号",
};

function currentHostname(): string {
  if (typeof window === "undefined")
    return "";
  return window.location.hostname.toLowerCase().replace(/\.$/, "");
}

export function getIcpFilingCopy(): LocalizedCopy {
  const hostname = currentHostname();
  if (hostname === "xiaoone.net" || hostname.endsWith(".xiaoone.net"))
    return NET_ICP_FILING;
  return DEFAULT_ICP_FILING;
}
