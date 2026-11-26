import { CopyButton } from "./CopyButton"
import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

export function ConnectorSection({ url }: { url: string }) {
  return (
    <SettingsSection
      title="Use it from your AI app"
      description="Add Sandworm Stocks as a connector in Claude, ChatGPT or any MCP app."
    >
      <SettingRow title="Connector address" description={<span className="font-body-mono break-all">{url}</span>}>
        <CopyButton text={url} />
      </SettingRow>
    </SettingsSection>
  )
}
