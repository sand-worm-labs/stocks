export const DEMO_MODELS_COOKIE = "sw_models"
// Made-up strategies and activity are for trying the app out, so a person sees only their own unless they ask for them in Settings
export const DEFAULT_DEMO_MODELS = 0
export const MAX_DEMO_MODELS = 1000

export const DEMO_MODEL_CHOICES = [
  { value: 0, label: "None" },
  { value: 1, label: "1" },
  { value: 4, label: "4" },
  { value: 12, label: "12" },
  { value: 40, label: "40" },
  { value: 200, label: "200" },
  { value: MAX_DEMO_MODELS, label: "1,000" },
]
