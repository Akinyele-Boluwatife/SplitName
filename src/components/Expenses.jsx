import { useState, useMemo, useEffect } from "react";
import styles from "./Expenses.module.css";

export default function Expenses({ roommates, expenses, setExpenses }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedParticipants, setSelectedParticipants] = useState(() =>
    roommates.map((r) => r.id)
  );

  // Sync selected participants when roommates array changes
  useEffect(() => {
    const currentIds = new Set(roommates.map((r) => r.id));
    const prevIds = Expenses._prevRoommateIds || currentIds;
    Expenses._prevRoommateIds = currentIds;

    const newlyAddedIds = roommates
      .map((r) => r.id)
      .filter((id) => !prevIds.has(id));

    setSelectedParticipants((prev) => {
      const valid = prev.filter((id) => currentIds.has(id));
      return [...valid, ...newlyAddedIds];
    });
  }, [roommates]);

  // Selected payer defaults to first roommate if not explicitly selected or if previous payer was removed
  const selectedPayerId =
    paidBy && roommates.some((r) => r.id === paidBy)
      ? paidBy
      : roommates[0]?.id || "";

  const handleToggleParticipant = (id) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllParticipants = () => {
    if (selectedParticipants.length === roommates.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(roommates.map((r) => r.id));
    }
  };

  const handleAddExpense = (e) => {
    e.preventDefault();

    const trimmedDesc = description.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedDesc || isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (roommates.length === 0 || !selectedPayerId) return;

    // Filter selected participants to active roommates
    const activeParticipantIds = selectedParticipants.filter((id) =>
      roommates.some((r) => r.id === id)
    );
    if (activeParticipantIds.length === 0) return;

    // Convert Naira to Kobo
    const totalKobo = Math.round(parsedAmount * 100);
    if (totalKobo < 1) return;

    const numParticipants = activeParticipantIds.length;
    const baseSplit = Math.floor(totalKobo / numParticipants);
    const remainder = totalKobo % numParticipants;

    // Distribute equally with remainder given to first participant
    const splits = activeParticipantIds.map((userId, index) => ({
      userId,
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

    // Reset inputs and restore participants to all active roommates
    setDescription("");
    setAmount("");
    setSelectedParticipants(roommates.map((r) => r.id));
  };

  const hasRoommates = roommates.length > 0;

  const handleDeleteExpense = (id) => {
    if (window.confirm("Delete this expense?")) {
      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
    }
  };

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });
  }, [expenses]);

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

        {/* Participants Checkbox Selection */}
        {hasRoommates && (
          <div className={styles.participantsSection}>
            <div className={styles.participantsHeader}>
              <span className={styles.participantsLabel}>
                Split with ({selectedParticipants.length} of {roommates.length}):
              </span>
              <button
                type="button"
                onClick={handleSelectAllParticipants}
                className={styles.selectAllButton}
              >
                {selectedParticipants.length === roommates.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div className={styles.checkboxGroup}>
              {roommates.map((roommate) => {
                const isSelected = selectedParticipants.includes(roommate.id);
                return (
                  <label
                    key={roommate.id}
                    className={`${styles.checkboxChip} ${
                      isSelected ? styles.checkboxChipActive : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleParticipant(roommate.id)}
                      className={styles.checkboxInput}
                    />
                    <span className={styles.checkboxLabel}>
                      {roommate.name}
                    </span>
                  </label>
                );
              })}
            </div>

            {selectedParticipants.length === 0 && (
              <span className={styles.validationNotice}>
                Select at least one participant to split with.
              </span>
            )}
          </div>
        )}

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
            disabled={!hasRoommates || selectedParticipants.length === 0}
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
          {sortedExpenses.map((expense) => {
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
                <div className={styles.expenseRight}>
                  <div className={styles.expenseAmount}>₦{formattedNaira}</div>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDeleteExpense(expense.id)}
                    aria-label={`Delete ${expense.description}`}
                    title="Delete expense"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
