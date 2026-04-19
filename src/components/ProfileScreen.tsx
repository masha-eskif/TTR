import { useState } from 'react';
import {
  getActiveProfileId,
  setActiveProfileId,
} from '../persistence/storage';
import {
  createProfile,
  listProfiles,
  removeProfile,
  renameProfile,
} from '../profile/profile';
import type { Profile } from '../persistence/schema';
import { useGameStore } from '../hooks/useGameStore';
import { STRINGS } from '../i18n/ru';
import { Button } from './common/Button';
import { EmojiPicker } from './common/EmojiPicker';

export function ProfileScreen() {
  const goToScreen = useGameStore((s) => s.goToScreen);
  const [tick, setTick] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '🦊' });

  const profiles = listProfiles();
  const activeId = getActiveProfileId();

  const rerender = () => setTick((n) => n + 1);
  void tick;

  function startEdit(p: Profile) {
    setEditingId(p.id);
    setCreating(false);
    setForm({ name: p.name, emoji: p.emoji });
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setForm({ name: '', emoji: '🦊' });
  }

  function saveForm() {
    if (!form.name.trim()) return;
    if (creating) {
      createProfile({ name: form.name, emoji: form.emoji });
    } else if (editingId) {
      renameProfile(editingId, form.name, form.emoji);
    }
    setEditingId(null);
    setCreating(false);
    rerender();
  }

  function del(id: string) {
    if (!confirm(STRINGS.profile.confirmDelete)) return;
    removeProfile(id);
    rerender();
  }

  function makeActive(id: string) {
    setActiveProfileId(id);
    rerender();
  }

  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">{STRINGS.profile.title}</h1>
        <Button variant="ghost" onClick={() => goToScreen('start')}>
          {STRINGS.common.back}
        </Button>
      </header>

      {profiles.length === 0 && !creating && (
        <p className="muted">{STRINGS.profile.noProfiles}</p>
      )}

      {profiles.map((p) => (
        <div
          key={p.id}
          className={`profile-card${activeId === p.id ? ' profile-card--active' : ''}`}
        >
          <span className="profile-card__emoji">{p.emoji}</span>
          <span className="profile-card__name">{p.name}</span>
          {activeId === p.id && (
            <span className="profile-card__badge">{STRINGS.profile.active}</span>
          )}
          <span className="profile-card__actions">
            {activeId !== p.id && (
              <Button size="sm" variant="secondary" onClick={() => makeActive(p.id)}>
                {STRINGS.profile.makeActive}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
              {STRINGS.common.edit}
            </Button>
            <Button size="sm" variant="danger" onClick={() => del(p.id)}>
              {STRINGS.common.delete}
            </Button>
          </span>
        </div>
      ))}

      {(creating || editingId) && (
        <div className="newgame__section mt-md">
          <h3 className="newgame__section-title">
            {creating ? STRINGS.profile.create : STRINGS.common.edit}
          </h3>
          <div className="field">
            <label className="field__label">
              {STRINGS.profile.namePlaceholder}
            </label>
            <input
              className="field__input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={30}
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field__label">
              {STRINGS.profile.emojiPlaceholder}
            </label>
            <EmojiPicker
              value={form.emoji}
              onChange={(emoji) => setForm({ ...form, emoji })}
            />
          </div>
          <div className="row row--end">
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditingId(null);
              }}
            >
              {STRINGS.common.cancel}
            </Button>
            <Button variant="primary" onClick={saveForm} disabled={!form.name.trim()}>
              {STRINGS.common.save}
            </Button>
          </div>
        </div>
      )}

      {!creating && !editingId && (
        <Button variant="primary" className="mt-md" onClick={startCreate}>
          {STRINGS.profile.create}
        </Button>
      )}
    </div>
  );
}
