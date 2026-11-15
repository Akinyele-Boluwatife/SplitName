import { useState, useMemo, useEffect, useRef } from "react";
import styles from "./Expenses.module.css";

// FIX M3: local-timezone date helper (YYYY-MM-DD), instead of UTC via toISOString()
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Expenses({ roommates, expenses, setExpenses }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [date, setDate] = useState(() => getLocalDateString()); // FIX M3
  const [splitType, setSplitType] = useState("equal"); // "equal" | "amount" | "percent"
  const [customAmounts, setCustomAmounts] = useState({}); // userId -> string
  const [percentages, setPercentages] = useState({}); // userId -> string
  const [selectedParticipants, setSelectedParticipants] = useState(() =>
    roommates.map((r) => r.id)
  );

  // FIX H1: per-instance ref replaces the module-level Expenses._prevRoommateIds
  const prevRoommatesRef = useRef(new Set(roommates.map((r) => r.id)));

  // Sync selected participants when roommates array changes
  useEffect(() => {
    const currentIds = new Set(roommates.map((r) => r.id));
    const prevIds = prevRoommatesRef.current; // FIX H1
    prevRoommatesRef.current = currentIds; // FIX H1

    const newlyAddedIds = roommates
      .map((r) => r.id)
      .filter((id) => !prevIds.has(id));

    setSelectedParticipants((prev) => {
      const valid = prev.filter((id) => currentIds.has(id));
      // FIX H1: never add an id that's already selected (prevents duplicates)
      const toAdd = newlyAddedIds.filter((id) => !valid.includes(id));
      return [...valid, ...toAdd];
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

  const handleCustomAmountChange = (userId, value) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handlePercentageChange = (userId, value) => {
    setPercentages((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const parsedTotalAmount = parseFloat(amount);
  const totalKobo = !isNaN(parsedTotalAmount) && parsedTotalAmount > 0
    ? Math.round(parsedTotalAmount * 100)
    : 0;

  const activeParticipantIds = selectedParticipants.filter((id) =>
    roommates.some((r) => r.id === id)
  );

  // Calculate sum of custom allocations in integer kobo
  const sumOfCustomSplits = activeParticipantIds.reduce((sum, id) => {
    const val = parseFloat(customAmounts[id]);
    const kobo = !isNaN(val) && val > 0 ? Math.round(val * 100) : 0;
    return sum + kobo;
  }, 0);

  const unassignedKobo = totalKobo - sumOfCustomSplits;

  const activePercentageHundredths = activeParticipantIds.map((id) => {
    const value = Number(percentages[id]);
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
  });
  const sumOfActivePercentageHundredths = activePercentageHundredths.reduce(
    (sum, value) => sum + value,
    0
  );
  const hasValidActivePercentages = activeParticipantIds.every((id) => {
    const rawValue = percentages[id];
    const value = Number(rawValue);
    const hundredths = value * 100;
    return (
      rawValue !== undefined &&
      rawValue !== "" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100 &&
      Math.abs(hundredths - Math.round(hundredths)) < 1e-8
    );
  });
  const percentagesTotalMatch =
    hasValidActivePercentages &&
    sumOfActivePercentageHundredths === 10000;

  const hasRoommates = roommates.length > 0;
  const isFormValid =
    hasRoommates &&
    description.trim().length > 0 &&
    totalKobo > 0 &&
    activeParticipantIds.length > 0 &&
    (splitType === "equal" ||
      (splitType === "amount" && unassignedKobo === 0) ||
      (splitType === "percent" && percentagesTotalMatch));

  const handleAddExpense = (e) => {
    e.preventDefault();

    const trimmedDesc = description.trim();
    if (!trimmedDesc || totalKobo <= 0) return;
    if (roommates.length === 0 || !selectedPayerId) return;
    if (activeParticipantIds.length === 0) return;

    let splits;

    if (splitType === "amount") {
      if (unassignedKobo !== 0) return;

      splits = activeParticipantIds
        .map((userId) => {
          const val = parseFloat(customAmounts[userId]);
          const kobo = !isNaN(val) && val > 0 ? Math.round(val * 100) : 0;
          return {
            userId,
            amount: kobo,
          };
        })
        // FIX M1: drop participants whose custom amount is blank or 0
        .filter((split) => split.amount > 0);
    } else if (splitType === "percent") {
      if (!percentagesTotalMatch) return;

      const percentageSplits = activeParticipantIds.map((userId, index) => {
        const percentageHundredths = Math.round(
          Number(percentages[userId]) * 100
        );
        const koboHundredths = totalKobo * percentageHundredths;
        return {
          userId,
          index,
          amount: Math.floor(koboHundredths / 10000),
          remainder: koboHundredths % 10000,
        };
      });

      const allocatedKobo = percentageSplits.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      const leftoverKobo = totalKobo - allocatedKobo;
      const largestRemainders = [...percentageSplits].sort(
        (a, b) => b.remainder - a.remainder || a.index - b.index
      );

      largestRemainders
        .slice(0, leftoverKobo)
        .forEach((split) => {
          percentageSplits[split.index].amount += 1;
        });

      splits = percentageSplits.map(({ userId, amount }) => ({
        userId,
        amount,
      }));
    } else {
      // Equal split
      const numParticipants = activeParticipantIds.length;
      const baseSplit = Math.floor(totalKobo / numParticipants);
      const remainder = totalKobo % numParticipants;

      splits = activeParticipantIds.map((userId, index) => ({
        userId,
        amount: index === 0 ? baseSplit + remainder : baseSplit,
      }));
    }

    const newExpense = {
      id: crypto.randomUUID(),
      description: trimmedDesc,
      amount: totalKobo,
      paidBy: selectedPayerId,
      date: date || getLocalDateString(), // FIX M3
      splitType,
      splits,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Reset inputs
    setDescription("");
    setAmount("");
    setCustomAmounts({});
    setPercentages({});
    setSplitType("equal");
    setSelectedParticipants(roommates.map((r) => r.id));
  };

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

        {/* Split Type Selector & Participants Section */}
        {hasRoommates && (
          <div className={styles.participantsSection}>
            <div className={styles.splitTypeHeader}>
              <span className={styles.participantsLabel}>Split Type:</span>
              <div className={styles.splitToggleGroup}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${
                    splitType === "equal" ? styles.toggleButtonActive : ""
                  }`}
                  onClick={() => setSplitType("equal")}
                >
                  Split Equally
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${
                    splitType === "amount" ? styles.toggleButtonActive : ""
                  }`}
                  onClick={() => setSplitType("amount")}
                >
                  Exact Amounts
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${
                    splitType === "percent" ? styles.toggleButtonActive : ""
                  }`}
                  onClick={() => setSplitType("percent")}
                >
                  Percentage
                </button>
              </div>
            </div>

            <div className={styles.participantsHeader}>
              <span className={styles.participantsSubLabel}>
                Participants ({selectedParticipants.length} of {roommates.length}):
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

            {/* Equal Split Chips Mode */}
            {splitType === "equal" ? (
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
            ) : (
              /* Custom Amount or Percentage Inputs Mode */
              <div className={styles.customAmountsList}>
                {roommates.map((roommate) => {
                  const isSelected = selectedParticipants.includes(roommate.id);
                  return (
                    <div
                      key={roommate.id}
                      className={`${styles.customAmountRow} ${
                        !isSelected ? styles.customAmountRowDisabled : ""
                      }`}
                    >
                      <label className={styles.customAmountLabel}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleParticipant(roommate.id)}
                          className={styles.checkboxInput}
                        />
                        <span className={styles.customAmountName}>
                          {roommate.name}
                        </span>
                      </label>

                      {splitType === "amount" ? (
                        <div className={styles.customInputWrapper}>
                          <span className={styles.currencyPrefix}>₦</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            disabled={!isSelected}
                            value={customAmounts[roommate.id] || ""}
                            onChange={(e) =>
                              handleCustomAmountChange(
                                roommate.id,
                                e.target.value
                              )
                            }
                            className={styles.customInputField}
                            aria-label={`Custom amount for ${roommate.name}`}
                          />
                        </div>
                      ) : (
                        <div className={styles.percentageInputWrapper}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            disabled={!isSelected}
                            value={percentages[roommate.id] || ""}
                            onChange={(e) =>
                              handlePercentageChange(
                                roommate.id,
                                e.target.value
                              )
                            }
                            className={styles.percentageInputField}
                            aria-label={`Percentage for ${roommate.name}`}
                          />
                          <span className={styles.percentageSuffix}>%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Validation & Feedback Banners */}
            {selectedParticipants.length === 0 && (
              <span className={styles.validationNotice}>
                Select at least one participant to split with.
              </span>
            )}
            {splitType === "amount" && totalKobo > 0 ? (
              <div
                className={`${styles.unassignedNotice} ${
                  unassignedKobo === 0
                    ? styles.unassignedNoticeMatch
                    : unassignedKobo > 0
                    ? styles.unassignedNoticePending
                    : styles.unassignedNoticeOver
                }`}
              >
                {unassignedKobo === 0 ? (
                  <span>✓ Exact match: all ₦{(totalKobo / 100).toFixed(2)} allocated</span>
                ) : unassignedKobo > 0 ? (
                  <span>
                    ₦
                    {(unassignedKobo / 100).toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    still unassigned
                  </span>
                ) : (
                  <span>
                    ₦
                    {(Math.abs(unassignedKobo) / 100).toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    over-assigned
                  </span>
                )}
              </div>
            ) : splitType === "percent" ? (
              <div
                className={`${styles.unassignedNotice} ${
                  percentagesTotalMatch
                    ? styles.unassignedNoticeMatch
                    : styles.unassignedNoticeOver
                }`}
                role={percentagesTotalMatch ? "status" : "alert"}
              >
                {percentagesTotalMatch
                  ? "✓ Percentages total 100%"
                  : hasValidActivePercentages
                  ? `Total percentage must equal 100% (currently ${(sumOfActivePercentageHundredths / 100).toLocaleString(
                      "en-NG",
                      { maximumFractionDigits: 2 }
                    )}%).`
                  : `Enter a valid percentage for each selected participant (0–100, up to 2 decimal places). Total: ${(sumOfActivePercentageHundredths / 100).toLocaleString(
                      "en-NG",
                      { maximumFractionDigits: 2 }
                    )}%.`}
              </div>
            ) : null}
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
            disabled={!isFormValid}
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
                    {(expense.splitType === "amount" ||
                      expense.splitType === "percent") && (
                      <span className={styles.splitTypeBadge}>
                        {expense.splitType === "percent"
                          ? "Percentage"
                          : "Custom"}
                      </span>
                    )}
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