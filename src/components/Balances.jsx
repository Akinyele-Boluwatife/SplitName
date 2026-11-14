import { useMemo } from "react";
import styles from "./Balances.module.css";

export default function Balances({
  roommates = [],
  deletedRoommates = [],
  expenses = [],
}) {
  const balances = useMemo(() => {
    const userMap = new Map();

    const resolveFormerRoommate = (userId) => {
      const archived = deletedRoommates.find((r) => r.id === userId);
      const shortId = typeof userId === "string" ? userId.slice(0, 4) : "";
      const displayName = archived?.name
        ? `Former Roommate (${archived.name})`
        : shortId
        ? `Former Roommate #${shortId}`
        : "Former Roommate";
      const initial = (archived?.name || displayName || "?")
        .charAt(0)
        .toUpperCase();

      return {
        id: userId,
        name: displayName,
        initial,
        balance: 0,
        isFormer: true,
      };
    };

    // 1. Initialize active roommates with 0 balance
    roommates.forEach((roommate) => {
      userMap.set(roommate.id, {
        id: roommate.id,
        name: roommate.name,
        initial: (roommate.name || "?").charAt(0).toUpperCase(),
        balance: 0,
        isFormer: false,
      });
    });

    // 2. Process all expenses (integer kobo calculations)
    expenses.forEach((expense) => {
      // Credit payer
      if (!userMap.has(expense.paidBy)) {
        userMap.set(expense.paidBy, resolveFormerRoommate(expense.paidBy));
      }
      const payer = userMap.get(expense.paidBy);
      payer.balance += expense.amount;

      // Debit participants from splits
      if (Array.isArray(expense.splits)) {
        expense.splits.forEach((split) => {
          if (!userMap.has(split.userId)) {
            userMap.set(split.userId, resolveFormerRoommate(split.userId));
          }
          const participant = userMap.get(split.userId);
          participant.balance -= split.amount;
        });
      }
    });

    return Array.from(userMap.values())
      .filter((person) => !(person.isFormer && person.balance === 0))
      .sort((a, b) => {
        const diff = b.balance - a.balance;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [roommates, deletedRoommates, expenses]);

  const hasUsers = balances.length > 0;

  return (
    <>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Balances</h2>
        <span className={styles.badge}>{balances.length}</span>
      </div>

      {!hasUsers ? (
        <p className={styles.emptyState}>No roommates or balances to calculate.</p>
      ) : (
        <ul className={styles.balanceList}>
          {balances.map((person) => {
            const absNaira = (Math.abs(person.balance) / 100).toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            );

            let statusText = "is settled up";
            let statusClass = styles.settled;

            if (person.balance > 0) {
              statusText = `is owed ₦${absNaira}`;
              statusClass = styles.isOwed;
            } else if (person.balance < 0) {
              statusText = `owes ₦${absNaira}`;
              statusClass = styles.owes;
            }

            return (
              <li key={person.id} className={styles.balanceItem}>
                <div className={styles.personInfo}>
                  <div
                    className={`${styles.avatar} ${
                      person.isFormer ? styles.formerAvatar : ""
                    }`}
                  >
                    {person.initial || person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.nameContainer}>
                    <span className={styles.personName}>{person.name}</span>
                    {person.isFormer && (
                      <span className={styles.formerTag}>Former</span>
                    )}
                  </div>
                </div>

                <div className={`${styles.balanceStatus} ${statusClass}`}>
                  {statusText}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
