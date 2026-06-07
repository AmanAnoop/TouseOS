export function personalizeReminderMessage(
  template: string,
  member: { full_name: string },
  payment?: { amount: number; paid_amount: number; due_date?: string | null },
): string {
  const firstName = member.full_name.trim().split(/\s+/)[0] || member.full_name;
  const balance = payment
    ? (Number(payment.amount) - Number(payment.paid_amount)).toFixed(2)
    : "0.00";
  const dueLabel = payment?.due_date
    ? new Date(payment.due_date).toLocaleDateString()
    : "soon";

  return template
    .replace(/\[First Name\]/gi, firstName)
    .replace(/\$\[Amount\]/gi, `$${balance}`)
    .replace(/\[Amount\]/gi, balance)
    .replace(/\[Date\]/gi, dueLabel);
}
