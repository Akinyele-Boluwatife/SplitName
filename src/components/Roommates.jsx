import { useState } from "react";
import styles from "./Roommates.module.css";

export default function Roommates({ roommates, setRoommates }) {
  const [nameInput, setNameInput] = useState("");

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
          {roommates.map((roommate) => (
            <li key={roommate.id} className={styles.roommateItem}>
              <div className={styles.roommateInfo}>
                <div className={styles.avatar}>
                  {roommate.name.charAt(0).toUpperCase()}
                </div>
                <span className={styles.roommateName}>{roommate.name}</span>
              </div>
              <button
                type="button"
                className={styles.moreOptionsButton}
                aria-label={`Options for ${roommate.name}`}
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
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
