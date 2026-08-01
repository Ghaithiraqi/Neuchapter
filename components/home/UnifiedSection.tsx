'use client';

import { useState } from 'react';
import { WriteTab } from './WriteTab';
import { VoiceTab } from './VoiceTab';
import { ChatTab } from './ChatTab';

type TabName = 'write' | 'voice' | 'chat';

const TABS: Array<{ id: TabName; label: string; icon: React.ReactNode }> = [
  {
    id: 'write',
    label: 'كتابة',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="16" height="16">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      </svg>
    ),
  },
  {
    id: 'voice',
    label: 'صوت',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="16" height="16">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'محادثة',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="16" height="16">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
];

export function UnifiedSection() {
  const [activeTab, setActiveTab] = useState<TabName>('write');

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: 20,
        marginBottom: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          color: 'var(--text-primary)',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        سجل لحظتك
      </div>

      {/* شريط التبويبات — pill shape */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-button)',
          padding: 4,
          marginBottom: 18,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 8px',
                background: isActive ? 'var(--gold-primary)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-button)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: isActive ? 'var(--bg-deep)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontWeight: isActive ? 700 : 400,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'write' && <WriteTab />}
      {activeTab === 'voice' && <VoiceTab />}
      {activeTab === 'chat' && <ChatTab />}
    </div>
  );
}
