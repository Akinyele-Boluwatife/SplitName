import { useState, useEffect, useRef } from "react";
import styles from "./Roommates.module.css";

export default function Roommates({
  roommates,
  setRoommates,
  setDeletedRoommates,
  expenses = [],
}) {
  const [nameInput, setNameInput] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);
  const triggerButtonRef = useRef(null);

  useEffect(() => {
    if (!activeMenuId) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveMenuId(null);
        triggerButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenuId]);

  const handleAddRoommate = (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameInput("");
      return;
    }

    const newRoommate = {
      id: crypto.randomUUID(),
      name: trimmed,
    };

    setRoommates((prev) => [...prev, newRoommate]);
    setNameInput("");
  };

  const handleRemoveRoommate = (id) => {
    const targetRoommate = roommates.find((r) => r.id === id);
    const roommateName = targetRoommate ? targetRoommate.name : "this roommate";

    // Block deletion if roommate is part of any existing expense (payer or split participant)
    const isTiedToExpense = expenses.some(
      (expense) =>
        expense.paidBy === id ||
        (Array.isArray(expense.splits) &&
          expense.splits.some((split) => split.userId === id))
    );

    if (isTiedToExpense) {
      alert(
        `Cannot remove ${roommateName} because they are part of an existing expense.`
      );
      setActiveMenuId(null);
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this roommate?"
    );
    if (!confirmed) {
      setActiveMenuId(null);
      return;
    }

    if (targetRoommate && setDeletedRoommates) {
      setDeletedRoommates((prev) => {
        if (prev.some((r) => r.id === id)) return prev;
        return [...prev, targetRoommate];
      });
    }

    setRoommates((prev) => prev.filter((r) => r.id !== id));
    setActiveMenuId(null);
  };

  return (
    <>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Roommates</h2>
        <span className={styles.badge}>{roommates.length}</span>
      </div>

      {/* Add Roommate Form */}
      <form onSubmit={handleAddRoommate} className={styles.addForm}>
        <input
          type="text"
          placeholder="Add roommate name..."
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className={styles.inputField}
          aria-label="Add a new roommate"
        />
        <button type="submit" className={styles.addButton}>
          Add
        </button>
      </form>

      {/* Roommate List */}
      {roommates.length === 0 ? (
        <p className={styles.emptyState}>No roommates added yet.</p>
      ) : (
        <ul className={styles.roommateList}>
          {roommates.map((roommate) => {
            const isTiedToExpense = expenses.some(
              (expense) =>
                expense.paidBy === roommate.id ||
                (Array.isArray(expense.splits) &&
                  expense.splits.some((split) => split.userId === roommate.id))
            );

            return (
              <li key={roommate.id} className={styles.roommateItem}>
                <div className={styles.roommateInfo}>
                  <div className={styles.avatar}>
                    {roommate.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={styles.roommateName}>{roommate.name}</span>
                </div>

                <div
                  className={styles.optionsWrapper}
                  ref={activeMenuId === roommate.id ? menuRef : null}
                >
                  <button
                    type="button"
                    ref={activeMenuId === roommate.id ? triggerButtonRef : null}
                    className={styles.moreOptionsButton}
                    aria-label={`Options for ${roommate.name}`}
                    aria-haspopup="true"
                    aria-expanded={activeMenuId === roommate.id}
                    onClick={(e) => {
                      triggerButtonRef.current = e.currentTarget;
                      setActiveMenuId((prev) =>
                        prev === roommate.id ? null : roommate.id
                      );
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                      <circle cx="5" cy="12" r="2" />
                    </svg>
                  </button>

                  {activeMenuId === roommate.id && (
                    <div className={styles.dropdownMenu} role="menu">
                      <button
                        type="button"
                        className={styles.removeButton}
                        role="menuitem"
                        disabled={isTiedToExpense}
                        title={
                          isTiedToExpense
                            ? "Cannot remove: tied to existing expenses."
                            : undefined
                        }
                        onClick={() => handleRemoveRoommate(roommate.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
