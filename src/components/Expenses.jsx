import { useState } from "react";
import styles from "./Expenses.module.css";

export default function Expenses({ roommates, expenses, setExpenses }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Selected payer defaults to first roommate if not explicitly selected or if previous payer was removed
  const selectedPayerId =
    paidBy && roommates.some((r) => r.id === paidBy)
      ? paidBy
      : roommates[0]?.id || "";

  const handleAddExpense = (e) => {
    e.preventDefault();

    const trimmedDesc = description.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedDesc || isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (roommates.length === 0 || !selectedPayerId) return;

    // Convert Naira to Kobo
    const totalKobo = Math.round(parsedAmount * 100);
    if (totalKobo < 1) return;
    const numRoommates = roommates.length;
    const baseSplit = Math.floor(totalKobo / numRoommates);
    const remainder = totalKobo % numRoommates;

    // Distribute equally with remainder given to first participant
    const splits = roommates.map((roommate, index) => ({
      userId: roommate.id,
      amount: index === 0 ? baseSplit + remainder : baseSplit,
    }));

    const newExpense = {
      id: crypto.randomUUID(),
      description: trimmedDesc,
      amount: totalKobo,
      paidBy: selectedPayerId,
      date: date || new Date().toISOString().split("T")[0],
      splitType: "equal",
      splits,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Reset inputs
    setDescription("");
    setAmount("");
  };

  const hasRoommates = roommates.length > 0;

  return (
    <>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Recent Expenses</h2>
        <span className={styles.badge}>{expenses.length}</span>
      </div>

      {!hasRoommates && (
        <div className={styles.notice}>
          Add at least one roommate to start recording expenses.
        </div>
      )}

      {/* Add Expense Form */}
      <form onSubmit={handleAddExpense} className={styles.addForm}>
        <div className={styles.formRow}>
          <input
            type="text"
            placeholder="Expense description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.inputField}
            aria-label="Expense description"
            disabled={!hasRoommates}
            required
          />
        </div>

        <div className={styles.formRow}>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount (₦)..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={styles.inputField}
            aria-label="Amount in Naira"
            disabled={!hasRoommates}
            required
          />

          <select
            value={selectedPayerId}
            onChange={(e) => setPaidBy(e.target.value)}
            className={styles.selectField}
            aria-label="Payer"
            disabled={!hasRoommates}
          >
            {roommates.map((roommate) => (
              <option key={roommate.id} value={roommate.id}>
                {roommate.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formRow}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.inputField}
            aria-label="Expense date"
            disabled={!hasRoommates}
            required
          />

          <button
            type="submit"
            className={styles.addButton}
            disabled={!hasRoommates}
          >
            Add Expense
          </button>
        </div>
      </form>

      {/* Expense List */}
      {expenses.length === 0 ? (
        <p className={styles.emptyState}>No expenses added yet.</p>
      ) : (
        <ul className={styles.expenseList}>
          {expenses.map((expense) => {
            const payer = roommates.find((r) => r.id === expense.paidBy);
            const payerName = payer ? payer.name : "Former Roommate";
            const formattedNaira = (expense.amount / 100).toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            );

            return (
              <li key={expense.id} className={styles.expenseItem}>
                <div className={styles.expenseInfo}>
                  <span className={styles.expenseDescription}>
                    {expense.description}
                  </span>
                  <span className={styles.expenseMeta}>
                    Paid by{" "}
                    <span className={styles.payerHighlight}>{payerName}</span> •{" "}
                    {expense.date}
                  </span>
                </div>
                <div className={styles.expenseAmount}>₦{formattedNaira}</div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
