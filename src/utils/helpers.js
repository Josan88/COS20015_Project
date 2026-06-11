/** Returns today's date as a YYYY-MM-DD string. */
export const today = () => new Date().toISOString().split("T")[0];

/** Formats a YYYY-MM-DD date string for display, e.g. "1 Jun 2025". */
export const formatDate = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-MY", {
        day:   "numeric",
        month: "short",
        year:  "numeric",
      })
    : "—";

/** Generates the next sequential loan ID based on the existing loans array. */
export const nextLoanId = (loans) =>
  `LN-${String(loans.length + 1).padStart(4, "0")}`;
