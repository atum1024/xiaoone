import { Navigate, useParams, useSearchParams } from "react-router";

const VALID_CODES = new Set(["personal", "startup", "business"]);
const VALID_TERMS = new Set(["1", "3", "6", "12"]);

export function CheckoutPage() {
  const { plan } = useParams();
  const [searchParams] = useSearchParams();

  if (!plan || !VALID_CODES.has(plan))
    return <Navigate to="/pricing" replace />;

  const termRaw = searchParams.get("term") || "1";
  const term = VALID_TERMS.has(termRaw) ? termRaw : "1";
  const registerTo = `/register?plan_code=${encodeURIComponent(plan)}&term=${encodeURIComponent(term)}`;

  return <Navigate to={registerTo} replace />;
}
