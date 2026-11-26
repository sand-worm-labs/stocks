type AgentSuggestionsProps = { suggestions: string[]; onPick: (message: string) => void }

// What can be asked right now, one tap away. These are only things the agent really does at this point in the strategy.
export function AgentSuggestions({ suggestions, onPick }: AgentSuggestionsProps) {
  if (!suggestions.length) return null

  return (
    <div className="flex flex-wrap gap-2" aria-label="Things to ask">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onPick(suggestion)}
          className="border-border hover:border-primary hover:bg-hover-bg dark:border-border-tertiary dark:hover:bg-sidebar-hover rounded-full border px-3 py-1 text-xs transition-[background-color,border-color] duration-200 ease-out"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
