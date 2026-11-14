import { useState, useEffect, useRef } from "react";
import styles from "./App.module.css";
import logo from "./assets/logo.png";
import Roommates from "./components/Roommates";
import Expenses from "./components/Expenses";
import Balances from "./components/Balances";

const STORAGE_KEY = "splitmate_v1";

export default function App() {
  const isFirstRender = useRef(true);

  const [roommates, setRoommates] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed?.roommates) ? parsed.roommates : [];
    } catch (error) {
      console.error("Failed to parse splitmate_v1 from localStorage:", error);
      return [];
    }
  });

  const [deletedRoommates, setDeletedRoommates] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed?.deletedRoommates)
        ? parsed.deletedRoommates
        : [];
    } catch (error) {
      console.error(
        "Failed to parse deletedRoommates from localStorage:",
        error
      );
      return [];
    }
  });

  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed?.expenses) ? parsed.expenses : [];
    } catch (error) {
      console.error("Failed to parse expenses from localStorage:", error);
      return [];
    }
  });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const existingData = saved ? JSON.parse(saved) : {};
      const dataToStore = {
        ...existingData,
        roommates,
        deletedRoommates,
        expenses,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Failed to save splitmate_v1 to localStorage:", error);
    }
  }, [roommates, deletedRoommates, expenses]);

  return (
    <div className={styles.appLayout}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          {/* Logo */}
          <div className={styles.logoContainer}>
            <img
              src={logo}
              alt="SplitMate Logo"
              className={styles.sidebarLogo}
            />
            <span className={styles.logoText}>SplitMate</span>
          </div>

          {/* Navigation Links */}
          <nav className={styles.nav}>
            <a href="#dashboard" className={styles.navItemActive}>
              <span className={styles.navIcon}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span>Dashboard</span>
            </a>
            <a href="#expenses" className={styles.navItem}>
              <span className={styles.navIcon}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <span>Expenses</span>
            </a>
          </nav>
        </div>

        {/* User profile at bottom */}
        <div
          className={styles.userProfile}
          role="button"
          tabIndex={0}
        >
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <span>AE</span>
            </div>
            <span className={styles.userName}>Akinyele Enoch</span>
          </div>
          <span className={styles.chevronIcon}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Top Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.greeting}>
              Good morning, Enoch! <span className={styles.waveEmoji}>👋</span>
            </h1>
            <p className={styles.subGreeting}>
              Here&apos;s what&apos;s happening with your household
            </p>
          </div>

          <div className={styles.headerRight}>
            {/* Household selector */}
            <div
              className={styles.houseSelector}
              role="button"
              tabIndex={0}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>GreenView House</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Notification bell button */}
            <button
              className={styles.iconButton}
              aria-label="Notifications"
              type="button"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className={styles.notificationBadge} />
            </button>

            {/* User avatar initials */}
            <div
              className={styles.avatarBadge}
              role="button"
              tabIndex={0}
            >
              AE
            </div>
          </div>
        </header>

        {/* 3-Column CSS Grid */}
        <section className={styles.gridContainer}>
          {/* Column 1: Roommates */}
          <section className={styles.card} aria-label="Roommates">
            <Roommates
              roommates={roommates}
              setRoommates={setRoommates}
              setDeletedRoommates={setDeletedRoommates}
              expenses={expenses}
            />
          </section>

          {/* Column 2: Recent Expenses */}
          <section className={styles.card} aria-label="Recent Expenses">
            <Expenses
              roommates={roommates}
              expenses={expenses}
              setExpenses={setExpenses}
            />
          </section>

          {/* Column 3: Balances */}
          <section className={styles.card} aria-label="Balances">
            <Balances
              roommates={roommates}
              deletedRoommates={deletedRoommates}
              expenses={expenses}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
