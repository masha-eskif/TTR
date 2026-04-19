const PRESET_EMOJIS = [
  '🦊', '🐺', '🐯', '🦁', '🐼', '🐻', '🦉', '🦅',
  '🐉', '🦖', '🦎', '🐢', '🦈', '🐙', '🦑', '🐧',
  '🚂', '⚓', '🎩', '👑', '🏰', '🗺️', '🧭', '⭐',
];

interface Props {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: Props) {
  return (
    <div className="emoji-picker">
      {PRESET_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          className={`emoji-picker__cell${e === value ? ' emoji-picker__cell--selected' : ''}`}
          onClick={() => onChange(e)}
          aria-label={`Выбрать ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
