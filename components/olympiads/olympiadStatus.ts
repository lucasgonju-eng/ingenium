export type OlympiadStatus = "open" | "closed" | "upcoming";

export type OlympiadStatusUI = {
  ctaLabel: string;
  ctaVariant: "primary" | "secondary" | "disabled";
  badgeLabel: string;
};

export function mapOlympiadStatus(status: string | null): OlympiadStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "open" || normalized === "published") return "open";
  if (normalized === "closed" || normalized === "finished" || normalized === "archived") return "closed";
  return "upcoming";
}

export function getOlympiadStatusUI(status: OlympiadStatus): OlympiadStatusUI {
  if (status === "open") {
    return {
      ctaLabel: "Inscrever-se",
      ctaVariant: "primary",
      badgeLabel: "ABERTA",
    };
  }

  if (status === "closed") {
    return {
      ctaLabel: "Ver ranking",
      ctaVariant: "secondary",
      badgeLabel: "ENCERRADA",
    };
  }

  return {
    ctaLabel: "Em breve",
    ctaVariant: "disabled",
    badgeLabel: "EM BREVE",
  };
}
