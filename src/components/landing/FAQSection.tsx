"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import gsap from "gsap";
import styles from "./FAQSection.module.css";

export interface FaqEntry {
  question: string;
  answer: string;
  category: string;
}

export default function FAQSection({ items }: { items: FaqEntry[] }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
    [items],
  );

  const filteredFaqs = useMemo(
    () => items.filter((item) => activeCategory === "All" || item.category === activeCategory),
    [items, activeCategory],
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(`.${styles.header} > *`, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (listRef.current?.children.length) {
      gsap.fromTo(
        listRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", overwrite: true },
      );
    }
  }, [activeCategory]);

  useEffect(() => {
    setOpenIndex(0);
  }, [activeCategory]);

  if (items.length === 0) return null;

  function toggleFAQ(index: number) {
    setOpenIndex(openIndex === index ? -1 : index);
  }

  return (
    <section className={styles.faqSection} ref={sectionRef} aria-label="Frequently asked questions">
      <div className={styles.ambientGlow} />

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.pillBadge}>
            <span className={styles.pillDot} />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>

          <h2 className={styles.title}>
            Everything you need to know about <br />
            <span className={styles.gradientText}>Coverage Calls.</span>
          </h2>

          <p className={styles.subtitle}>
            Have a question? We&apos;ve got answers. If you can&apos;t find what you&apos;re looking
            for, reach out to our team anytime.
          </p>

          {categories.length > 1 && (
            <div className={styles.categoryPills}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`${styles.catBtn} ${activeCategory === cat ? styles.activeCatBtn : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.faqLayout}>
          <div className={styles.faqList} ref={listRef}>
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={`${faq.category}-${idx}`}
                  className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ""}`}
                  onClick={() => toggleFAQ(idx)}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.questionWrapper}>
                      <span className={styles.itemCategory}>{faq.category}</span>
                      <h3 className={styles.questionText}>{faq.question}</h3>
                    </div>
                    <div className={`${styles.toggleIcon} ${isOpen ? styles.toggleIconOpen : ""}`} aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </div>
                  </div>
                  <div className={`${styles.cardBody} ${isOpen ? styles.cardBodyExpanded : ""}`}>
                    <p className={styles.answerText}>{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className={styles.sideHelpCard}>
            <div className={styles.helpGlow} />
            <div className={styles.helpIconBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h4 className={styles.helpTitle}>Have more questions?</h4>
            <p className={styles.helpDesc}>
              Can&apos;t find the answer you&apos;re looking for? Talk directly with our technical inbound engineers.
            </p>
            <div className={styles.helpFeatureList}>
              <div className={styles.helpFeature}>
                <span className={styles.featureDot} />
                <span>Average response: &lt; 5 mins</span>
              </div>
              <div className={styles.helpFeature}>
                <span className={styles.featureDot} />
                <span>Live WebRTC setup assistance</span>
              </div>
            </div>
            <Link href="/contact" className={styles.contactBtn}>
              <span>Talk to an Expert</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
